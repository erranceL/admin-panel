import { useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { apiGet, apiPost, useApiResource } from './lib/api'
import {
  mockAuditLogs,
  mockDistributors,
  mockFacts,
  mockMarkets,
  mockMatches,
  mockPolymarketHealth,
  mockPolymarketQueue,
  mockStats,
} from './lib/mockData'
import type {
  AuditLogItem,
  Balance,
  DistributorConfig,
  OracleFact,
  PolymarketHealth,
  PolymarketQueueItem,
  RfqMatch,
  Role,
  StatsOverview,
} from './types'

const roles: Role[] = ['Admin', 'CS', 'Ops', 'Risk', 'SRE']

type NavItem = {
  to: string
  label: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: '总览', roles: ['Admin', 'Ops', 'Risk', 'SRE'] },
  { to: '/rfq', label: 'RFQ运营', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/oracle', label: 'Oracle仲裁', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/polymarket', label: 'Polymarket', roles: ['Admin', 'Ops', 'SRE'] },
  { to: '/accounts', label: '用户账户', roles: ['Admin', 'CS', 'Risk'] },
  { to: '/distributors', label: '分销商加价', roles: ['Admin', 'Risk'] },
  { to: '/ops', label: '运维监控', roles: ['Admin', 'SRE', 'Ops'] },
  { to: '/rebate', label: '返佣', roles: ['Admin', 'Ops', 'CS'] },
  { to: '/kpi', label: 'KPI报表', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/audit', label: '权限审计', roles: ['Admin', 'Risk', 'SRE'] },
]

function App() {
  const [role, setRole] = useState<Role>('Admin')

  return (
    <div className="min-h-dvh bg-[var(--bg-base)] text-[var(--text-primary)]">
      <AdminShell role={role} onRoleChange={setRole}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage role={role} />} />
          <Route path="/rfq" element={<RfqPage role={role} />} />
          <Route path="/oracle" element={<OraclePage role={role} />} />
          <Route path="/polymarket" element={<PolymarketPage role={role} />} />
          <Route path="/accounts" element={<AccountsPage role={role} />} />
          <Route path="/distributors" element={<DistributorsPage role={role} />} />
          <Route path="/ops" element={<OpsPage role={role} />} />
          <Route path="/rebate" element={<RebatePage role={role} />} />
          <Route path="/kpi" element={<KpiPage role={role} />} />
          <Route path="/audit" element={<AuditPage role={role} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminShell>
    </div>
  )
}

function AdminShell({
  role,
  onRoleChange,
  children,
}: {
  role: Role
  onRoleChange: (role: Role) => void
  children: React.ReactNode
}) {
  const location = useLocation()
  const availableNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <div className="min-h-dvh flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-base)]">
        <Brand />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {availableNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-control)] hover:text-[var(--text-primary)]',
                ].join(' ')
              }
            >
              <span>{item.label}</span>
              {item.roles.length <= 3 && <span className="text-[10px] opacity-60">RBAC</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-[var(--text-secondary)]">
          <p className="mb-2">API Base</p>
          <code className="block truncate rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2">
            {import.meta.env.VITE_API_BASE_URL || 'Vite proxy /api'}
          </code>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold">足球盘口管理后台</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Half-true prototype · real API first · mock fallback
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={role}
                onChange={(event) => onRoleChange(event.target.value as Role)}
                className="tf-control h-9 px-3 text-sm outline-none"
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <Badge tone="accent">{role}</Badge>
            </div>
          </div>
          <nav className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {availableNavItems.map((item) => {
              const active = location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]' : 'bg-[var(--bg-control)] text-[var(--text-secondary)]'
                  }`}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-5'}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF] text-xs font-bold text-[#0B0B0F]">
        TF
      </div>
      {!compact && (
        <div>
          <p className="font-semibold">TurboFlow Admin</p>
          <p className="text-xs text-[var(--text-secondary)]">Soccer RFQ Ops</p>
        </div>
      )}
    </div>
  )
}

function PageHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{desc}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warning' | 'success' }) {
  const toneClass = {
    neutral: 'border-[var(--border)] bg-[var(--bg-control)] text-[var(--text-secondary)]',
    accent: 'border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#2DD4BF]',
    danger: 'border-[#E85A7E]/30 bg-[#E85A7E]/10 text-[#E85A7E]',
    warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
    success: 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]',
  }[tone]
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const className = {
    primary: 'bg-[#2DD4BF] text-[#0B0B0F] hover:opacity-90',
    secondary: 'border border-[var(--border)] bg-[var(--bg-control)] text-[var(--text-primary)] hover:bg-[var(--border)]',
    danger: 'bg-[#E85A7E] text-white hover:opacity-90',
  }[variant]
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${className} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`tf-control h-10 w-full px-3 text-sm outline-none ${props.className ?? ''}`} />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`tf-control h-10 w-full px-3 text-sm outline-none ${props.className ?? ''}`} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`tf-control min-h-24 w-full px-3 py-2 text-sm outline-none ${props.className ?? ''}`} />
}

function ApiSource({ mode, error }: { mode: 'real' | 'mock'; error: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Badge tone={mode === 'real' ? 'success' : 'warning'}>{mode === 'real' ? 'Real API' : 'Mock fallback'}</Badge>
      {error && <span className="hidden truncate text-xs text-[var(--text-secondary)] md:inline">{error}</span>}
    </div>
  )
}

function Guard({ role, allow, children }: { role: Role; allow: Role[]; children: React.ReactNode }) {
  if (!allow.includes(role)) {
    return (
      <SectionCard title="权限不足">
        <p className="text-sm text-[var(--text-secondary)]">
          当前角色 {role} 只能查看已授权模块。请切换到 {allow.join(' / ')} 继续操作。
        </p>
      </SectionCard>
    )
  }
  return children
}

function DashboardPage({ role }: { role: Role }) {
  const stats = useApiResource<StatsOverview>('/api/v1/soccer/stats/overview', mockStats)
  const health = useApiResource<PolymarketHealth>('/api/v1/admin/polymarket/health', mockPolymarketHealth)
  const facts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?status=proposed&limit=5', mockFacts)

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk', 'SRE']}>
      <PageHeader title="运营总览" desc="聚合 RFQ 市场、Oracle 仲裁、Polymarket 参考源和人工待办状态。" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="进行中赛事" value={stats.data.live_events} source={stats.mode} />
        <MetricCard label="可见市场" value={stats.data.total_markets} source={stats.mode} />
        <MetricCard label="24h成交额" value={`${stats.data.volume_24h_usd} USDT`} source={stats.mode} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Oracle待处理" action={<ApiSource mode={facts.mode} error={facts.error} />}>
          <FactList facts={facts.data.slice(0, 5)} />
        </SectionCard>
        <SectionCard title="Polymarket参考源" action={<ApiSource mode={health.mode} error={health.error} />}>
          <div className="grid gap-3 text-sm">
            <InfoRow label="状态" value={health.data.status ?? 'unknown'} />
            <InfoRow label="Fallback" value={health.data.fallback_enabled ? 'enabled' : 'disabled'} />
            <InfoRow label="队列深度" value={health.data.queue_depth ?? '-'} />
            <InfoRow label="未映射球队" value={health.data.unmapped_teams ?? '-'} />
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function MetricCard({ label, value, source }: { label: string; value: string | number; source: 'real' | 'mock' }) {
  return (
    <div className="tf-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <Badge tone={source === 'real' ? 'success' : 'warning'}>{source}</Badge>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function RfqPage({ role }: { role: Role }) {
  const matches = useApiResource<RfqMatch[]>('/api/v1/soccer/rfq/matches', mockMatches)
  const [marketId, setMarketId] = useState(mockMarkets[0].market_id)
  const [winningOutcome, setWinningOutcome] = useState('')
  const [reason, setReason] = useState('manual ops review')
  const [result, setResult] = useState('尚未执行操作')

  async function runAction(action: 'pause' | 'resume' | 'settle') {
    const path = `/api/v1/admin/rfq/${action}`
    const body =
      action === 'pause'
        ? { market_id: marketId, reason }
        : action === 'settle'
          ? { market_id: marketId, winning_outcome: winningOutcome }
          : { market_id: marketId }
    const response = await apiPost(path, body, { market_id: marketId, status: action })
    setResult(`${action} -> ${response.mode}${response.error ? ` (${response.error})` : ''}`)
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="RFQ运营" desc="对接已有赛事/市场查询接口，并提供暂停、恢复、手动结算兜底入口。" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="赛事监控" action={<ApiSource mode={matches.mode} error={matches.error} />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th className="pb-3">赛事</th>
                  <th className="pb-3">状态</th>
                  <th className="pb-3">比分</th>
                  <th className="pb-3">联赛</th>
                  <th className="pb-3">成交额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {matches.data.map((match) => (
                  <tr key={match.id}>
                    <td className="py-3 font-medium">{match.home} vs {match.away}</td>
                    <td className="py-3"><Badge tone={match.status === 'Live' ? 'accent' : 'neutral'}>{match.status}</Badge></td>
                    <td className="py-3">{match.home_goals}:{match.away_goals} {match.elapsed ? `${match.elapsed}'` : ''}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{match.league_name ?? '-'}</td>
                    <td className="py-3">{match.volume_24h_usd ?? '0'} USDT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="市场操作台">
          <div className="space-y-3">
            <Select value={marketId} onChange={(event) => setMarketId(event.target.value)}>
              {mockMarkets.map((market) => (
                <option key={market.market_id} value={market.market_id}>
                  {market.market_title} · {market.status}
                </option>
              ))}
            </Select>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="暂停原因" />
            <Input value={winningOutcome} onChange={(event) => setWinningOutcome(event.target.value)} placeholder="结算结果，留空表示 void" />
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => void runAction('pause')}>暂停</Button>
              <Button variant="secondary" onClick={() => void runAction('resume')}>恢复</Button>
              <Button onClick={() => void runAction('settle')}>结算</Button>
            </div>
            <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] p-3 text-xs text-[var(--text-secondary)]">{result}</p>
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function OraclePage({ role }: { role: Role }) {
  const facts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?limit=50', mockFacts)
  const [factId, setFactId] = useState(mockFacts[0].fact_id)
  const [marketId, setMarketId] = useState(mockFacts[0].market_id)
  const [winner, setWinner] = useState('')
  const [reason, setReason] = useState('manual evidence review')
  const [message, setMessage] = useState('等待操作')

  async function post(path: string, body: Record<string, unknown>) {
    const response = await apiPost(path, body, { ok: true })
    setMessage(`${path} -> ${response.mode}${response.error ? ` (${response.error})` : ''}`)
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="Oracle仲裁" desc="覆盖 resolve、candidate、dispute、finalize、cancel、phase 等现有后台接口。" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <SectionCard title="Fact队列" action={<ApiSource mode={facts.mode} error={facts.error} />}>
          <FactList facts={facts.data} />
        </SectionCard>
        <SectionCard title="仲裁操作">
          <div className="space-y-3">
            <Input value={marketId} onChange={(event) => setMarketId(event.target.value)} placeholder="market_id" />
            <Input value={factId} onChange={(event) => setFactId(event.target.value)} placeholder="fact_id" />
            <Input value={winner} onChange={(event) => setWinner(event.target.value)} placeholder="winner，留空表示 void" />
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="原因或证据说明" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void post('/api/v1/admin/oracle/resolve', { market_id: marketId })}>Resolve</Button>
              <Button variant="secondary" onClick={() => void post('/api/v1/admin/oracle/candidate', { source: 'manual_ops', market_id: marketId, winner, confidence: 0.98, evidence_url: reason })}>Candidate</Button>
              <Button variant="secondary" onClick={() => void post('/api/v1/admin/oracle/dispute', { fact_id: factId, reason, by: role })}>Dispute</Button>
              <Button onClick={() => void post('/api/v1/admin/oracle/finalize', { fact_id: factId, winner, payout_ratios: {}, by: role, reason })}>Finalize</Button>
              <Button variant="danger" onClick={() => void post('/api/v1/admin/oracle/cancel', { fact_id: factId, by: role, reason })}>Cancel</Button>
              <Button variant="secondary" onClick={() => void post('/api/v1/admin/oracle/phase', { subject_id: marketId, phase: 'fulltime', market_ids: [marketId], by: role, reason })}>Phase</Button>
            </div>
            <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] p-3 text-xs text-[var(--text-secondary)]">{message}</p>
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function FactList({ facts }: { facts: OracleFact[] }) {
  return (
    <div className="space-y-3">
      {facts.map((fact) => (
        <div key={fact.fact_id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fact.fact_id}</p>
            <Badge tone={fact.status === 'finalized' ? 'success' : fact.status === 'disputed' ? 'danger' : 'warning'}>{fact.status}</Badge>
            {fact.single_source && <Badge tone="warning">single source</Badge>}
          </div>
          <p className="mt-2 text-sm">{fact.market_id}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">winner: {fact.winner || 'void/pending'} · sources: {fact.sources.join(', ')}</p>
        </div>
      ))}
    </div>
  )
}

function PolymarketPage({ role }: { role: Role }) {
  const queue = useApiResource<PolymarketQueueItem[]>('/api/v1/admin/polymarket/queue?status=candidate', mockPolymarketQueue)
  const health = useApiResource<PolymarketHealth>('/api/v1/admin/polymarket/health', mockPolymarketHealth)
  const [layer, setLayer] = useState('market')
  const [id, setId] = useState('701')
  const [reason, setReason] = useState('mapping mismatch')
  const [message, setMessage] = useState('等待操作')

  async function post(path: string, body: Record<string, unknown>) {
    const response = await apiPost(path, body, { ok: true })
    setMessage(`${path} -> ${response.mode}${response.error ? ` (${response.error})` : ''}`)
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'SRE']}>
      <PageHeader title="Polymarket治理" desc="候选队列确认/拒绝、球队绑定、健康检查与 fallback 开关。" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="候选队列" action={<ApiSource mode={queue.mode} error={queue.error} />}>
          <div className="space-y-3">
            {queue.data.map((item) => (
              <div key={`${item.layer}-${item.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.title}</p>
                  <Badge tone={item.status === 'candidate' ? 'accent' : 'neutral'}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">#{item.id} · {item.layer} · {item.league_code ?? '-'}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="健康状态" action={<ApiSource mode={health.mode} error={health.error} />}>
            <div className="space-y-2 text-sm">
              <InfoRow label="状态" value={health.data.status ?? 'unknown'} />
              <InfoRow label="Fallback" value={health.data.fallback_enabled ? 'enabled' : 'disabled'} />
              <InfoRow label="Last sync" value={health.data.last_sync_at ?? '-'} />
            </div>
          </SectionCard>
          <SectionCard title="队列操作">
            <div className="space-y-3">
              <Select value={layer} onChange={(event) => setLayer(event.target.value)}>
                <option value="market">market</option>
                <option value="event">event</option>
                <option value="team">team</option>
              </Select>
              <Input value={id} onChange={(event) => setId(event.target.value)} placeholder="candidate id" />
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="拒绝原因" />
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => void post('/api/v1/admin/polymarket/confirm', { layer, id: Number(id), operator: role })}>确认</Button>
                <Button variant="danger" onClick={() => void post('/api/v1/admin/polymarket/reject', { layer, id: Number(id), reason, operator: role })}>拒绝</Button>
                <Button variant="secondary" onClick={() => void post('/api/v1/admin/polymarket/fallback/enable', { operator: role })}>Fallback on</Button>
                <Button variant="secondary" onClick={() => void post('/api/v1/admin/polymarket/fallback/disable', { operator: role })}>Fallback off</Button>
              </div>
              <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] p-3 text-xs text-[var(--text-secondary)]">{message}</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </Guard>
  )
}

function AccountsPage({ role }: { role: Role }) {
  const [accountId, setAccountId] = useState('10001')
  const [coin, setCoin] = useState('USDT')
  const [amount, setAmount] = useState('10000')
  const [balance, setBalance] = useState<Balance>({ account_id: 10001, coin: 'USDT', available: '8200', frozen: '1800', total: '10000' })
  const [mode, setMode] = useState<'real' | 'mock'>('mock')
  const [error, setError] = useState<string | null>(null)

  async function queryBalance() {
    const response = await apiGet<Balance>(`/api/v1/admin/balance?account_id=${accountId}&coin=${coin}`, balance)
    setBalance(response.data)
    setMode(response.mode)
    setError(response.error)
  }

  async function recharge() {
    const response = await apiPost('/api/v1/admin/mock_recharge', { account_id: Number(accountId), coin, amount }, balance)
    setBalance(response.data)
    setMode(response.mode)
    setError(response.error)
  }

  return (
    <Guard role={role} allow={['Admin', 'CS', 'Risk']}>
      <PageHeader title="用户账户" desc="MVP阶段对接余额查询与 mock 充值，便于客服和测试处理资金状态。" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <SectionCard title="账户查询" action={<ApiSource mode={mode} error={error} />}>
          <div className="space-y-3">
            <Input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="account_id" />
            <Input value={coin} onChange={(event) => setCoin(event.target.value)} placeholder="coin" />
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="mock recharge amount" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void queryBalance()}>查余额</Button>
              <Button onClick={() => void recharge()}>Mock充值</Button>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="资金快照">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Available" value={balance.available ?? balance.balance ?? '-'} source={mode} />
            <MetricCard label="Frozen" value={balance.frozen ?? '-'} source={mode} />
            <MetricCard label="Total" value={balance.total ?? '-'} source={mode} />
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function DistributorsPage({ role }: { role: Role }) {
  const [configs, setConfigs] = useState<DistributorConfig[]>(mockDistributors)
  const [selectedId, setSelectedId] = useState(mockDistributors[0].id)
  const selected = configs.find((item) => item.id === selectedId) ?? configs[0]
  const [markup, setMarkup] = useState(String(selected.markup_bps))

  function saveMarkup() {
    setConfigs((current) =>
      current.map((item) => (item.id === selectedId ? { ...item, markup_bps: Number(markup) } : item)),
    )
  }

  return (
    <Guard role={role} allow={['Admin', 'Risk']}>
      <PageHeader title="分销商加价" desc="仅做管理后台控制位：配置前置加价 bps、状态、风控备注，不展开 B2B API 平台。" />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <SectionCard title="分销商列表" action={<Badge tone="warning">mock gap</Badge>}>
          <div className="grid gap-3 md:grid-cols-3">
            {configs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id)
                  setMarkup(String(item.markup_bps))
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selectedId === item.id ? 'border-[#2DD4BF] bg-[#2DD4BF]/10' : 'border-[var(--border)] bg-[var(--bg-control)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.name}</p>
                  <Badge tone={item.status === 'active' ? 'success' : 'warning'}>{item.status}</Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold">{item.markup_bps} bps</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.today_volume}</p>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="加价控制">
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">当前配置：{selected.name}</p>
            <Input value={markup} onChange={(event) => setMarkup(event.target.value)} placeholder="markup bps" />
            <InfoRow label="结算方式" value={selected.settlement_mode} />
            <InfoRow label="风控备注" value={selected.risk_note} />
            <Button onClick={saveMarkup}>保存本地配置</Button>
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function OpsPage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'SRE', 'Ops']}>
      <PageHeader title="运维监控" desc="聚合进程健康、数据源、链上回扫和告警状态；当前后端缺少统一运维 API，先用 mock 展示。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="API health" value="OK" source="mock" />
        <MetricCard label="SIG/API Football delay" value="30s" source="mock" />
        <MetricCard label="ChainScanner lag" value="2 blocks" source="mock" />
        <MetricCard label="Open alerts" value="3" source="mock" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="告警队列">
          <SimpleList items={['Polymarket fallback enabled > 30m', 'Oracle single-source fact needs review', 'Distributor trial API key expires in 2d']} />
        </SectionCard>
        <SectionCard title="SRE操作建议">
          <SimpleList items={['确认 /health 与 API 网关转发状态', '检查 vendor feed token 与 IPAllowList', '检查事件回放是否重复发布 TopicMatchFactUpdated']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function RebatePage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'CS']}>
      <PageHeader title="返佣管理" desc="PRD覆盖的返佣配置和客服查询页；当前源码侧无完整后台 API，先保留 mock 工作台。" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="今日返佣" value="8,231 USDT" source="mock" />
        <MetricCard label="待审核" value="17" source="mock" />
        <MetricCard label="异常单" value="2" source="mock" />
      </div>
      <div className="mt-4">
        <SectionCard title="返佣策略">
          <SimpleList items={['Copy trading rebate: 12% platform fee share', 'Distributor rebate: configurable by partner tier', 'Manual override requires Admin + Risk review']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function KpiPage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="KPI报表" desc="面向运营、风控和管理层的成交、风控、仲裁、体验指标看板。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="RFQ转化率" value="41.2%" source="mock" />
        <MetricCard label="Quote过期率" value="6.8%" source="mock" />
        <MetricCard label="仲裁争议率" value="1.4%" source="mock" />
        <MetricCard label="人工介入占比" value="18%" source="mock" />
      </div>
      <div className="mt-4">
        <SectionCard title="关键观察">
          <SimpleList items={['进球后不自动暂停是当前有意设计，待 SIG 规则明确后再决策', 'API Football/mock 数据仍需在后台显式标识来源置信度', '分销商加价上线前需要补齐审计日志与双人复核']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function AuditPage({ role }: { role: Role }) {
  const logs = useMemo<AuditLogItem[]>(() => mockAuditLogs, [])
  return (
    <Guard role={role} allow={['Admin', 'Risk', 'SRE']}>
      <PageHeader title="权限与审计" desc="5角色 RBAC 的可见性验证与关键操作日志；后续接入真实审计流。" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <SectionCard title="角色矩阵">
          <div className="space-y-3">
            {roles.map((item) => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
                <p className="font-semibold">{item}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{navItems.filter((nav) => nav.roles.includes(item)).map((nav) => nav.label).join(' / ')}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="审计日志" action={<Badge tone="warning">mock gap</Badge>}>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{log.actor}</Badge>
                  <p className="font-semibold">{log.action}</p>
                  <Badge tone={log.result === 'success' ? 'success' : 'warning'}>{log.result}</Badge>
                </div>
                <p className="mt-2 text-sm">{log.target}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{log.created_at}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  )
}

function SimpleList({ items }: { items: string[] }) {
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

export default App
