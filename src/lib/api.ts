import { useCallback, useEffect, useState } from 'react'
import type { ApiState, ErrorKind } from '../types'

type ApiEnvelope<T> = {
  errno?: string
  msg?: string
  data?: T
}

export type ApiReadResult<T> = {
  data: T
  mode: 'real' | 'mock'
  isFallback: boolean
  error: string | null
  errorKind?: ErrorKind
  statusCode?: number
}

export type ApiWriteResult<T> = {
  ok: true
  data: T
  statusCode?: number
}

export class ApiError extends Error {
  kind: ErrorKind
  statusCode?: number

  constructor(message: string, kind: ErrorKind = 'unknown', statusCode?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.statusCode = statusCode
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000)

function buildUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function buildHeaders() {
  const token = import.meta.env.VITE_DEV_AUTH_TOKEN
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查后端服务或网络连接', 'timeout')
    }
    throw new ApiError(error instanceof Error ? error.message : '网络请求失败', 'network')
  } finally {
    window.clearTimeout(timer)
  }
}

function unwrapResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'errno' in payload) {
    const envelope = payload as ApiEnvelope<T>
    if (envelope.errno !== '200') {
      throw new ApiError(envelope.msg || `业务错误 ${envelope.errno}`, 'business')
    }
    return envelope.data as T
  }
  return payload as T
}

function toReadFallback<T>(error: unknown, fallback: T): ApiReadResult<T> {
  const apiError = error instanceof ApiError ? error : new ApiError(error instanceof Error ? error.message : '未知错误')
  return {
    data: fallback,
    mode: 'mock',
    isFallback: true,
    error: apiError.message,
    errorKind: apiError.kind,
    statusCode: apiError.statusCode,
  }
}

export async function apiGet<T>(path: string, fallback: T): Promise<ApiReadResult<T>> {
  try {
    const response = await fetchWithTimeout(buildUrl(path), {
      headers: buildHeaders(),
    })
    if (!response.ok) {
      throw new ApiError(`${response.status} ${response.statusText}`, 'http', response.status)
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ApiError('接口返回不是合法 JSON', 'parse', response.status)
    }
    return { data: unwrapResponse<T>(payload), mode: 'real', isFallback: false, error: null, statusCode: response.status }
  } catch (error) {
    return toReadFallback(error, fallback)
  }
}

export async function apiPost<TBody extends Record<string, unknown>, TResponse>(
  path: string,
  body: TBody,
): Promise<ApiWriteResult<TResponse>> {
  const response = await fetchWithTimeout(buildUrl(path), {
    method: 'POST',
    headers: {
      ...buildHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(`${response.status} ${response.statusText}`, 'http', response.status)
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('接口返回不是合法 JSON', 'parse', response.status)
  }
  return { ok: true, data: unwrapResponse<TResponse>(payload), statusCode: response.status }
}

export function useApiResource<T>(path: string, fallback: T): ApiState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<ApiState<T>>({
    data: fallback,
    mode: 'mock',
    isFallback: true,
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }))
    const result = await apiGet<T>(path, fallback)
    setState({ ...result, loading: false })
  }, [path, fallback])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  return { ...state, refresh }
}
