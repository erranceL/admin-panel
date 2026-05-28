import Button from './Button'

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-control)] p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="加载中">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-[var(--bg-control)]" />
      ))}
    </div>
  )
}

export function ResourceState({
  loading,
  isFallback,
  error,
  onRefresh,
}: {
  loading: boolean
  isFallback: boolean
  error: string | null
  onRefresh?: () => void
}) {
  if (loading) {
    return <span className="text-xs text-[var(--text-secondary)]">加载中</span>
  }

  if (isFallback) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#F59E0B]">
        <span>演示数据</span>
        {error && <span className="max-w-sm truncate text-[var(--text-secondary)]">{error}</span>}
        {onRefresh && (
          <Button variant="ghost" className="min-h-7 px-2 py-1 text-xs" onClick={onRefresh}>
            刷新
          </Button>
        )}
      </div>
    )
  }

  return <span className="text-xs text-[#10B981]">真实接口</span>
}
