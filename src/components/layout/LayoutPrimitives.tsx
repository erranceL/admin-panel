import type { ReactNode } from 'react'
import Badge from '../ui/Badge'

export function PageHeader({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{desc}</p>
      </div>
      {action}
    </div>
  )
}

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="tf-card tf-glow p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  source,
  desc,
}: {
  label: string
  value: string | number
  source?: 'real' | 'mock'
  desc?: string
}) {
  return (
    <div className="tf-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        {source && <Badge tone={source === 'real' ? 'success' : 'warning'}>{source === 'real' ? '正式' : '示例'}</Badge>}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      {desc && <p className="mt-2 text-xs text-[var(--text-secondary)]">{desc}</p>}
    </div>
  )
}

export function SimpleList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2 text-sm">
          {item}
        </div>
      ))}
    </div>
  )
}
