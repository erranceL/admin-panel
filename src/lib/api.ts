import { useCallback, useEffect, useRef, useState } from 'react'
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
const READ_RETRY_COOLDOWN_MS = 5000

type ReadCacheEntry<T> = {
  result: ApiReadResult<T>
  createdAt: number
}

const inFlightReads = new Map<string, Promise<ApiReadResult<unknown>>>()
const recentReadFallbacks = new Map<string, ReadCacheEntry<unknown>>()

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

function readableApiError(message: string | undefined, fallback: string) {
  if (!message) {
    return fallback
  }
  if (message.toLowerCase().includes('can not found path')) {
    return '该功能暂未接入或当前环境不可用'
  }
  return message
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查系统服务或网络连接', 'timeout')
    }
    throw new ApiError(error instanceof Error ? error.message : '网络连接失败，请稍后重试或联系技术支持', 'network')
  } finally {
    window.clearTimeout(timer)
  }
}

function unwrapResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'errno' in payload) {
    const envelope = payload as ApiEnvelope<T>
    if (envelope.errno !== '200') {
      throw new ApiError(readableApiError(envelope.msg, `请求失败，错误码：${envelope.errno}`), 'business')
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

export async function apiGet<T>(path: string, fallback: T, options: { force?: boolean } = {}): Promise<ApiReadResult<T>> {
  const url = buildUrl(path)
  const recentFallback = recentReadFallbacks.get(url) as ReadCacheEntry<T> | undefined
  if (!options.force && recentFallback && Date.now() - recentFallback.createdAt < READ_RETRY_COOLDOWN_MS) {
    return recentFallback.result
  }

  const inFlight = inFlightReads.get(url) as Promise<ApiReadResult<T>> | undefined
  if (!options.force && inFlight) {
    return inFlight
  }

  const request = (async (): Promise<ApiReadResult<T>> => {
  try {
    const response = await fetchWithTimeout(url, {
      headers: buildHeaders(),
    })
    if (!response.ok) {
      throw new ApiError(`请求失败，错误码：${response.status}`, 'http', response.status)
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ApiError('系统返回格式异常，请截图联系技术支持', 'parse', response.status)
    }
    return { data: unwrapResponse<T>(payload), mode: 'real', isFallback: false, error: null, statusCode: response.status }
  } catch (error) {
    const result = toReadFallback(error, fallback)
    recentReadFallbacks.set(url, { result, createdAt: Date.now() })
    return result
  } finally {
    inFlightReads.delete(url)
  }
  })()

  inFlightReads.set(url, request as Promise<ApiReadResult<unknown>>)
  return request
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
    throw new ApiError(`请求失败，错误码：${response.status}`, 'http', response.status)
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('系统返回格式异常，请截图联系技术支持', 'parse', response.status)
  }
  return { ok: true, data: unwrapResponse<TResponse>(payload), statusCode: response.status }
}

export function useApiResource<T>(path: string, fallback: T): ApiState<T> & { refresh: () => Promise<void> } {
  const fallbackRef = useRef(fallback)
  const requestSeqRef = useRef(0)
  const mountedRef = useRef(false)

  const [state, setState] = useState<ApiState<T>>({
    data: fallback,
    mode: 'mock',
    isFallback: true,
    loading: true,
    error: null,
  })

  useEffect(() => {
    fallbackRef.current = fallback
  }, [fallback])

  const refresh = useCallback(async () => {
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    setState((current) => ({ ...current, loading: true }))
    const result = await apiGet<T>(path, fallbackRef.current, { force: true })
    if (mountedRef.current && requestSeq === requestSeqRef.current) {
      setState({ ...result, loading: false })
    }
  }, [path])

  useEffect(() => {
    mountedRef.current = true
    const timer = window.setTimeout(() => {
      const requestSeq = requestSeqRef.current + 1
      requestSeqRef.current = requestSeq
      setState((current) => ({ ...current, loading: true }))
      void apiGet<T>(path, fallbackRef.current).then((result) => {
        if (mountedRef.current && requestSeq === requestSeqRef.current) {
          setState({ ...result, loading: false })
        }
      })
    }, 0)
    return () => {
      mountedRef.current = false
      window.clearTimeout(timer)
    }
  }, [path])

  return { ...state, refresh }
}
