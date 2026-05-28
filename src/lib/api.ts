import { useCallback, useEffect, useState } from 'react'
import type { ApiState } from '../types'

type ApiEnvelope<T> = {
  errno?: string
  msg?: string
  data?: T
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function buildUrl(path: string) {
  if (path.startsWith('http')) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function unwrapResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'errno' in payload) {
    const envelope = payload as ApiEnvelope<T>
    if (envelope.errno !== '200') {
      throw new Error(envelope.msg || `API errno ${envelope.errno}`)
    }
    return envelope.data as T
  }
  return payload as T
}

export async function apiGet<T>(path: string, fallback: T): Promise<{ data: T; mode: 'real' | 'mock'; error: string | null }> {
  try {
    const response = await fetch(buildUrl(path), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    const payload: unknown = await response.json()
    return { data: unwrapResponse<T>(payload), mode: 'real', error: null }
  } catch (error) {
    return {
      data: fallback,
      mode: 'mock',
      error: error instanceof Error ? error.message : 'Unknown API error',
    }
  }
}

export async function apiPost<TBody extends Record<string, unknown>, TResponse>(
  path: string,
  body: TBody,
  fallback: TResponse,
): Promise<{ data: TResponse; mode: 'real' | 'mock'; error: string | null }> {
  try {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    const payload: unknown = await response.json()
    return { data: unwrapResponse<TResponse>(payload), mode: 'real', error: null }
  } catch (error) {
    return {
      data: fallback,
      mode: 'mock',
      error: error instanceof Error ? error.message : 'Unknown API error',
    }
  }
}

export function useApiResource<T>(path: string, fallback: T): ApiState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<ApiState<T>>({
    data: fallback,
    mode: 'mock',
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
