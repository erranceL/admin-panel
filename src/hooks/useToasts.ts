import { useCallback, useState } from 'react'
import type { ToastItem } from '../types'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((current) => [...current, { ...toast, id }])
    window.setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  return { toasts, push, dismiss }
}
