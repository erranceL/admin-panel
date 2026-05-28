import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  loading?: boolean
}) {
  const variantClass = {
    primary: 'bg-[#2DD4BF] text-[#0B0B0F] hover:opacity-90',
    secondary: 'border border-[var(--border)] bg-[var(--bg-control)] text-[var(--text-primary)] hover:bg-[var(--border)]',
    danger: 'bg-[#E85A7E] text-white hover:opacity-90',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]',
  }[variant]

  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variantClass} ${className}`}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" opacity="0.85" />
        </svg>
      )}
      {children}
    </button>
  )
}
