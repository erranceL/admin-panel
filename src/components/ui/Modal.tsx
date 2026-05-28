import type { ReactNode } from 'react'
import Button from './Button'

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = '确认执行',
  danger = false,
  loading = false,
  children,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmText?: string
  danger?: boolean
  loading?: boolean
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="tf-card w-full max-w-lg p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
        {children && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3 text-sm">{children}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
