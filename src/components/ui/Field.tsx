import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

function FieldShell({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-[#E85A7E]" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

const controlClass =
  'tf-control w-full text-sm outline-none transition-colors focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/60'

export function Input({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <input {...props} className={`${controlClass} h-10 px-3 ${className}`} />
    </FieldShell>
  )
}

export function Select({
  label,
  error,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <select {...props} className={`${controlClass} h-10 px-3 ${className}`}>
        {children}
      </select>
    </FieldShell>
  )
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <textarea {...props} className={`${controlClass} min-h-24 px-3 py-2 ${className}`} />
    </FieldShell>
  )
}
