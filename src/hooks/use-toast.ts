import { useState, useCallback, type Dispatch, type SetStateAction } from 'react'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

let globalSetToasts: Dispatch<SetStateAction<Toast[]>> | null = null

export function registerToastSetter(setter: Dispatch<SetStateAction<Toast[]>>) {
  globalSetToasts = setter
}

export function toast(opts: Omit<Toast, 'id'>) {
  if (!globalSetToasts) return
  const id = Math.random().toString(36).slice(2)
  globalSetToasts(prev => [...prev, { ...opts, id }])
  setTimeout(() => {
    globalSetToasts?.(prev => prev.filter(t => t.id !== id))
  }, 4000)
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const register = useCallback(() => { registerToastSetter(setToasts) }, [])
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  return { toasts, register, dismiss }
}
