import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'accent' | 'danger' | 'warning' | 'success'

export default function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const toneClass = {
    neutral: 'border-[var(--border)] bg-[var(--bg-control)] text-[var(--text-secondary)]',
    accent: 'border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#2DD4BF]',
    danger: 'border-[#E85A7E]/30 bg-[#E85A7E]/10 text-[#E85A7E]',
    warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
    success: 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]',
  }[tone]

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}
