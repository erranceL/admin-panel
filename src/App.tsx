import { useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Badge from './components/ui/Badge'
import Button from './components/ui/Button'
import { Input, Select, Textarea } from './components/ui/Field'
import ConfirmModal from './components/ui/Modal'
import { EmptyState, ResourceState, SkeletonBlock } from './components/ui/State'
import ToastContainer from './components/ui/Toast'
import { InfoRow, MetricCard, PageHeader, SectionCard, SimpleList } from './components/layout/LayoutPrimitives'
import { ApiError, apiGet, apiPost, useApiResource } from './lib/api'
import { formatNumber, getOperator, localStatus, roleLabels } from './lib/format'
import {
  mockAuditLogs,
  mockDistributors,
  mockFacts,
  mockMarkets,
  mockMatches,
  mockPolymarketHealth,
  mockPolymarketQueue,
  mockStats,
  mockTeamPool,
  mockUnmappedTeams,
} from './lib/mockData'
import { useToasts } from './hooks/useToasts'
import type {
  AuditLogItem,
  Balance,
  DistributorConfig,
  OracleFact,
  PolymarketHealth,
  PolymarketQueueItem,
  PolymarketTeam,
  RfqMarket,
  RfqMatch,
  Role,
  StatsOverview,
} from './types'

type NavItem = {
  to: string
  label: string
  roles: Role[]
  defaultFor?: Role[]
}

type PendingAction = {
  key: string
  title: string
  description: string
  danger?: boolean
  details: Array<[string, React.ReactNode]>
  run: () => Promise<void>
}

const roles: Role[] = ['Admin', 'CS', 'Ops', 'Risk', 'SRE']

const navItems: NavItem[] = [
  { to: '/dashboard', label: '总览', roles: ['Admin', 'Ops', 'Risk', 'SRE'], defaultFor: ['Admin', 'Ops', 'Risk'] },
  { to: '/rfq', label: 'RFQ 运营', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/oracle', label: 'Oracle 仲裁', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/polymarket', label: 'Polymarket', roles: ['Admin', 'Ops', 'SRE'] },
  { to: '/accounts', label: '用户账户', roles: ['Admin', 'CS', 'Risk'], defaultFor: ['CS'] },
  { to: '/distributors', label: '分销商加价', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/ops', label: '运维监控', roles: ['Admin', 'SRE', 'Ops'], defaultFor: ['SRE'] },
  { to: '/rebate', label: '返佣', roles: ['Admin', 'Ops', 'CS'] },
  { to: '/kpi', label: 'KPI 报表', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/audit', label: '权限审计', roles: ['Admin', 'Risk', 'SRE'] },
]

function defaultRouteFor(role: Role) {
  return navItems.find((item) => item.defaultFor?.includes(role))?.to ?? '/dashboard'
}

function App() {
  const [role, setRole] = useState<Role>('Admin')
  const { toasts, push, dismiss } = useToasts()

  return (
    <div className="min-h-dvh bg-[var(--bg-base)] text-[var(--text-primary)]">
      <AdminShell role={role} onRoleChange={setRole}>
        <Routes>
          <Route path="/" element={<RoleRedirect role={role} />} />
          <Route path="/dashboard" element={<DashboardPage role={role} />} />
          <Route path="/rfq" element={<RfqPage role={role} pushToast={push} />} />
          <Route path="/oracle" element={<OraclePage role={role} pushToast={push} />} />
          <Route path="/polymarket" element={<PolymarketPage role={role} pushToast={push} />} />
          <Route path="/accounts" element={<AccountsPage role={role} pushToast={push} />} />
          <Route path="/distributors" element={<DistributorsPage role={role} pushToast={push} />} />
          <Route path="/ops" element={<OpsPage role={role} />} />
          <Route path="/rebate" element={<RebatePage role={role} />} />
          <Route path="/kpi" element={<KpiPage role={role} />} />
          <Route path="/audit" element={<AuditPage role={role} />} />
          <Route path="*" element={<RoleRedirect role={role} />} />
        </Routes>
      </AdminShell>
      <ToastContainer items={toasts} onDismiss={dismiss} />
    </div>
  )
}

function RoleRedirect({ role }: { role: Role }) {
  return <Navigate to={defaultRouteFor(role)} replace />
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
  const navigate = useNavigate()
  const currentItem = navItems.find((item) => location.pathname.startsWith(item.to))
  const availableNavItems = navItems.filter((item) => item.roles.includes(role))
  const apiBase = import.meta.env.VITE_API_BASE_URL
  const isPublicDemo = !apiBase

  function changeRole(nextRole: Role) {
    onRoleChange(nextRole)
    const stillAllowed = navItems.find((item) => location.pathname.startsWith(item.to))?.roles.includes(nextRole)
    if (!stillAllowed) {
      navigate(defaultRouteFor(nextRole), { replace: true })
    }
  }

  return (
    <div className="min-h-dvh flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-base)]">
        <Brand />
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="主菜单">
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
              <span className="text-[10px] opacity-60">演示权限</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-[var(--text-secondary)]">
          <p className="mb-2">数据源</p>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2">
            <p className={isPublicDemo ? 'text-[#F59E0B]' : 'text-[#10B981]'}>
              {isPublicDemo ? '公开演示站：仅保证读接口可降级展示' : '本地/内网真实 API'}
            </p>
            <p className="mt-1 truncate">{apiBase || '未注入 VITE_API_BASE_URL'}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur">
          <div className="flex min-h-14 items-center gap-3 px-4 py-2 lg:px-6">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div>
              <p className="text-sm font-semibold">{currentItem?.label ?? '足球盘口管理后台'}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                半真实原型 · 写操作失败不降级 · {isPublicDemo ? '公开演示数据' : '真实接口优先'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="sr-only" htmlFor="role-select">
                演示角色
              </label>
              <select id="role-select" value={role} onChange={(event) => changeRole(event.target.value as Role)} className="tf-control h-9 px-3 text-sm outline-none">
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
              <Badge tone="accent">{roleLabels[role]}</Badge>
            </div>
          </div>
          <nav className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" aria-label="移动端主菜单">
            {availableNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                    isActive ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]' : 'bg-[var(--bg-control)] text-[var(--text-secondary)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
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
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF] text-xs font-bold text-[#0B0B0F]">TF</div>
      {!compact && (
        <div>
          <p className="font-semibold">TurboFlow Admin</p>
          <p className="text-xs text-[var(--text-secondary)]">Soccer RFQ Ops</p>
        </div>
      )}
    </div>
  )
}

function Guard({ role, allow, children }: { role: Role; allow: Role[]; children: React.ReactNode }) {
  if (!allow.includes(role)) {
    return (
      <SectionCard title="权限不足">
        <p className="text-sm text-[var(--text-secondary)]">
          当前演示角色为 {roleLabels[role]}，只能查看已授权模块。真实上线时必须由后端鉴权和审计日志兜底。
        </p>
      </SectionCard>
    )
  }
  return children
}

function DemoNotice({ scope = '当前模块' }: { scope?: string }) {
  return (
    <div className="mb-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-sm text-[#FEF3C7]">
      {scope} 含演示数据或后端缺口占位。读接口失败会明确标注“演示数据”；写接口失败不会伪造成成功。
    </div>
  )
}

function useConfirmAction(pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [runningKey, setRunningKey] = useState<string | null>(null)

  async function confirm() {
    if (!pendingAction) {
      return
    }
    setRunningKey(pendingAction.key)
    try {
      await pendingAction.run()
      pushToast({ type: 'success', title: '操作已提交并由真实接口确认', message: pendingAction.title })
      setPendingAction(null)
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : '未知错误'
      pushToast({ type: 'error', title: '操作失败，未降级为演示成功', message })
    } finally {
      setRunningKey(null)
    }
  }

  const modal = (
    <ConfirmModal
      open={Boolean(pendingAction)}
      title={pendingAction?.title ?? ''}
      description={pendingAction?.description ?? ''}
      danger={pendingAction?.danger}
      loading={Boolean(runningKey)}
      onClose={() => setPendingAction(null)}
      onConfirm={() => void confirm()}
    >
      <div className="space-y-2">
        {pendingAction?.details.map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
      </div>
    </ConfirmModal>
  )

  return { requestConfirm: setPendingAction, modal, runningKey }
}

function DashboardPage({ role }: { role: Role }) {
  const stats = useApiResource<StatsOverview>('/api/v1/soccer/stats/overview', mockStats)
  const health = useApiResource<PolymarketHealth>('/api/v1/admin/polymarket/health', mockPolymarketHealth)
  const facts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?status=proposed&limit=5', mockFacts)
  const disputed = facts.data.filter((fact) => fact.status === 'disputed').length

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk', 'SRE']}>
      <PageHeader title="运营总览" desc="聚合 RFQ 市场、Oracle 仲裁、Polymarket 参考源和人工待办状态。" />
      <DemoNotice scope="首页" />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="进行中赛事" value={stats.loading ? '...' : stats.data.live_events} source={stats.mode} />
        <MetricCard label="可见市场" value={stats.loading ? '...' : stats.data.total_markets} source={stats.mode} />
        <MetricCard label="24h 成交额" value={`${formatNumber(stats.data.volume_24h_usd)} USDT`} source={stats.mode} />
        <MetricCard label="待处理争议" value={disputed} source={facts.mode} desc="disputed facts" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Oracle 待处理" action={<ResourceState {...facts} onRefresh={() => void facts.refresh()} />}>
          {facts.loading ? <SkeletonBlock rows={3} /> : <FactList facts={facts.data.slice(0, 5)} />}
        </SectionCard>
        <SectionCard title="Polymarket 参考源" action={<ResourceState {...health} onRefresh={() => void health.refresh()} />}>
          <div className="grid gap-3 text-sm">
            <InfoRow label="状态" value={localStatus(health.data.status)} />
            <InfoRow label="降级参考源" value={health.data.fallback_enabled ? '已开启' : '已关闭'} />
            <InfoRow label="队列深度" value={health.data.queue_depth ?? '-'} />
            <InfoRow label="未映射球队" value={health.data.unmapped_teams ?? '-'} />
          </div>
        </SectionCard>
      </div>
    </Guard>
  )
}

function RfqPage({ role, pushToast }: { role: Role; pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void }) {
  const matches = useApiResource<RfqMatch[]>('/api/v1/soccer/rfq/matches', mockMatches)
  const [selectedMatchId, setSelectedMatchId] = useState(String(mockMatches[0].id))
  const markets = useApiResource<RfqMarket[]>(`/api/v1/soccer/rfq/matches/${selectedMatchId}/markets`, mockMarkets)
  const [marketId, setMarketId] = useState(mockMarkets[0].market_id)
  const [winningOutcome, setWinningOutcome] = useState('')
  const [reason, setReason] = useState('')
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const selectedMarket = markets.data.find((market) => market.market_id === marketId) ?? markets.data[0]
  const canOperate = role === 'Admin' || role === 'Ops'
  const canSettle = role === 'Admin'

  function submitRfq(action: 'pause' | 'resume' | 'settle') {
    if (!marketId || !reason.trim()) {
      pushToast({ type: 'warning', title: '请先补全市场 ID 和操作原因' })
      return
    }
    if (action === 'settle' && role !== 'Admin') {
      pushToast({ type: 'warning', title: '当前角色只能发起复核建议，不能直接结算' })
      return
    }
    const path = `/api/v1/admin/rfq/${action}`
    const body =
      action === 'pause'
        ? { market_id: marketId, reason, operator: getOperator(role) }
        : action === 'settle'
          ? { market_id: marketId, winning_outcome: winningOutcome, reason, operator: getOperator(role) }
          : { market_id: marketId, reason, operator: getOperator(role) }
    requestConfirm({
      key: `rfq-${action}`,
      title: action === 'settle' ? '确认手动结算 RFQ 市场' : action === 'pause' ? '确认暂停 RFQ 市场' : '确认恢复 RFQ 市场',
      description: '该操作会调用真实后台写接口。失败时不会降级为演示成功。',
      danger: action === 'settle',
      details: [
        ['市场', marketId],
        ['结果', action === 'settle' ? winningOutcome || 'void/退本' : localStatus(action)],
        ['原因', reason],
        ['影响范围', '原型仅展示占位，真实上线需后端返回持仓数与预计派彩'],
      ],
      run: async () => {
        await apiPost<typeof body, unknown>(path, body)
        await markets.refresh()
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="RFQ 运营" desc="赛事、市场、暂停恢复和手动结算兜底。Risk 仅可查看或发起复核建议。" />
      <DemoNotice scope="RFQ 页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <SectionCard title="赛事监控" action={<ResourceState {...matches} onRefresh={() => void matches.refresh()} />}>
          {matches.loading ? (
            <SkeletonBlock rows={4} />
          ) : matches.data.length === 0 ? (
            <EmptyState title="暂无赛事" desc="接口返回空列表或筛选条件无结果。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th scope="col" className="pb-3">赛事</th>
                    <th scope="col" className="pb-3">状态</th>
                    <th scope="col" className="pb-3">比分</th>
                    <th scope="col" className="pb-3">联赛</th>
                    <th scope="col" className="pb-3">成交额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {matches.data.map((match) => (
                    <tr
                      key={match.id}
                      className={`cursor-pointer hover:bg-[var(--bg-control)] ${selectedMatchId === String(match.id) ? 'bg-[#2DD4BF]/5' : ''}`}
                      onClick={() => setSelectedMatchId(String(match.id))}
                    >
                      <td className="py-3 font-medium">{match.home} vs {match.away}</td>
                      <td className="py-3"><Badge tone={match.status === 'Live' ? 'accent' : 'neutral'}>{localStatus(match.status)}</Badge></td>
                      <td className="py-3">{match.home_goals}:{match.away_goals} {match.elapsed ? `${match.elapsed}'` : ''}</td>
                      <td className="py-3 text-[var(--text-secondary)]">{match.league_name ?? '-'}</td>
                      <td className="py-3">{formatNumber(match.volume_24h_usd)} USDT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="市场操作台" action={<ResourceState {...markets} onRefresh={() => void markets.refresh()} />}>
            <div className="space-y-3">
              <Select label="市场" value={marketId} onChange={(event) => setMarketId(event.target.value)}>
                {markets.data.map((market) => (
                  <option key={market.market_id} value={market.market_id}>
                    {market.market_title} · {localStatus(market.status)}
                  </option>
                ))}
              </Select>
              <Input label="操作原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：数据源异常、人工复核通过" />
              <Input label="结算结果" value={winningOutcome} onChange={(event) => setWinningOutcome(event.target.value)} placeholder="留空表示 void/退本" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" disabled={!canOperate} loading={runningKey === 'rfq-pause'} onClick={() => submitRfq('pause')}>暂停市场</Button>
                <Button variant="secondary" disabled={!canOperate} loading={runningKey === 'rfq-resume'} onClick={() => submitRfq('resume')}>恢复市场</Button>
                <Button className="sm:col-span-2" disabled={!canSettle} loading={runningKey === 'rfq-settle'} onClick={() => submitRfq('settle')}>管理员结算</Button>
              </div>
              {!canSettle && <p className="text-xs text-[var(--text-secondary)]">当前角色不能直接结算，只能查看并提交线下复核建议。</p>}
            </div>
          </SectionCard>

          <SectionCard title="市场详情">
            {selectedMarket ? (
              <div className="space-y-2">
                <InfoRow label="市场 ID" value={selectedMarket.market_id} />
                <InfoRow label="标题" value={selectedMarket.market_title} />
                <InfoRow label="状态" value={localStatus(selectedMarket.status)} />
                <InfoRow label="Provider" value={selectedMarket.provider_id} />
                <InfoRow label="规则" value={selectedMarket.resolution_rule ?? '待后端返回'} />
                <div className="mt-3 grid gap-2">
                  {(selectedMarket.outcomes ?? []).map((outcome) => (
                    <div key={outcome.outcome_id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] p-3 text-sm">
                      {outcome.label} · 欧赔 {outcome.display_decimal_odds ?? '-'} · {localStatus(outcome.status)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="未选择市场" desc="请选择赛事和市场。" />
            )}
          </SectionCard>
        </div>
      </div>
      {modal}
    </Guard>
  )
}

function OraclePage({ role, pushToast }: { role: Role; pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void }) {
  const [status, setStatus] = useState('proposed')
  const facts = useApiResource<OracleFact[]>(`/api/v1/admin/oracle/facts?status=${status}&limit=50`, mockFacts.filter((fact) => status === '' || fact.status === status))
  const [factId, setFactId] = useState(mockFacts[0].fact_id)
  const [marketId, setMarketId] = useState(mockFacts[0].market_id)
  const [winner, setWinner] = useState('')
  const [reason, setReason] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [payoutRatios, setPayoutRatios] = useState('{}')
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const canWrite = role === 'Admin' || role === 'Ops'
  const canFinalize = role === 'Admin'

  function selectFact(fact: OracleFact) {
    setFactId(fact.fact_id)
    setMarketId(fact.market_id)
    setWinner(fact.winner)
  }

  function parseRatios() {
    try {
      const parsed = JSON.parse(payoutRatios)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // handled below
    }
    throw new Error('payout_ratios 必须是 JSON 对象，例如 {"home":"1","away":"0"}')
  }

  function submitOracle(action: 'resolve' | 'candidate' | 'dispute' | 'finalize' | 'cancel' | 'phase') {
    if (!marketId.trim() || !reason.trim()) {
      pushToast({ type: 'warning', title: '请填写 market_id 和原因' })
      return
    }
    if ((action === 'finalize' || action === 'cancel') && !canFinalize) {
      pushToast({ type: 'warning', title: '当前角色不能直接执行终局操作' })
      return
    }
    if (!canWrite && action !== 'resolve') {
      pushToast({ type: 'warning', title: '当前角色仅可查看或复核，不能提交写操作' })
      return
    }

    const endpoint = {
      resolve: '/api/v1/admin/oracle/resolve',
      candidate: '/api/v1/admin/oracle/candidate',
      dispute: '/api/v1/admin/oracle/dispute',
      finalize: '/api/v1/admin/oracle/finalize',
      cancel: '/api/v1/admin/oracle/cancel',
      phase: '/api/v1/admin/oracle/phase',
    }[action]

    requestConfirm({
      key: `oracle-${action}`,
      title: `确认${localOracleAction(action)}`,
      description: 'Oracle 写操作会影响结算与用户资金，必须确认字段无误。',
      danger: action === 'finalize' || action === 'cancel',
      details: [
        ['Fact ID', factId || '待生成'],
        ['Market ID', marketId],
        ['Winner', winner || 'void/待定'],
        ['原因', reason],
      ],
      run: async () => {
        const body =
          action === 'resolve'
            ? { market_id: marketId }
            : action === 'candidate'
              ? { source: 'manual_ops', market_id: marketId, winner, confidence: 0.98, evidence_url: evidenceUrl }
              : action === 'dispute'
                ? { fact_id: factId, reason, by: getOperator(role) }
                : action === 'finalize'
                  ? { fact_id: factId, winner, payout_ratios: parseRatios(), by: getOperator(role), reason }
                  : action === 'cancel'
                    ? { fact_id: factId, by: getOperator(role), reason }
                    : { subject_id: selectedSubjectId(marketId), phase: 'fulltime', market_ids: [marketId], by: getOperator(role), reason }
        await apiPost<typeof body, unknown>(endpoint, body)
        await facts.refresh()
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="Oracle 仲裁" desc="Fact 队列、争议处理、候选提交和管理员强制终局。" />
      <DemoNotice scope="Oracle 页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Fact 队列"
          action={
            <div className="flex items-center gap-3">
              <Select label="状态筛选" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9">
                <option value="">全部</option>
                <option value="proposed">待确认</option>
                <option value="disputed">争议中</option>
                <option value="finalized">已终局</option>
              </Select>
              <ResourceState {...facts} onRefresh={() => void facts.refresh()} />
            </div>
          }
        >
          {facts.loading ? <SkeletonBlock rows={4} /> : <FactList facts={facts.data} onSelect={selectFact} />}
        </SectionCard>
        <SectionCard title="仲裁操作">
          <div className="space-y-3">
            <Input label="Market ID" value={marketId} onChange={(event) => setMarketId(event.target.value)} />
            <Input label="Fact ID" value={factId} onChange={(event) => setFactId(event.target.value)} />
            <Input label="Winner" value={winner} onChange={(event) => setWinner(event.target.value)} placeholder="留空表示 void" />
            <Input label="证据链接" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
            <Textarea label="Payout ratios JSON" value={payoutRatios} onChange={(event) => setPayoutRatios(event.target.value)} />
            <Textarea label="操作原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" loading={runningKey === 'oracle-resolve'} onClick={() => submitOracle('resolve')}>触发仲裁</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-candidate'} onClick={() => submitOracle('candidate')}>提交候选</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-dispute'} onClick={() => submitOracle('dispute')}>发起争议</Button>
              <Button disabled={!canFinalize} loading={runningKey === 'oracle-finalize'} onClick={() => submitOracle('finalize')}>管理员终局</Button>
              <Button variant="danger" disabled={!canFinalize} loading={runningKey === 'oracle-cancel'} onClick={() => submitOracle('cancel')}>管理员取消</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-phase'} onClick={() => submitOracle('phase')}>阶段切换</Button>
            </div>
            {!canFinalize && <p className="text-xs text-[var(--text-secondary)]">终局和取消仅管理员可执行；运营可提交候选/争议，风控只读复核。</p>}
          </div>
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function localOracleAction(action: string) {
  return {
    resolve: '触发仲裁',
    candidate: '提交候选',
    dispute: '发起争议',
    finalize: '强制终局',
    cancel: '取消 Fact',
    phase: '阶段切换',
  }[action] ?? action
}

function selectedSubjectId(marketId: string) {
  const parts = marketId.split(':')
  return parts.length >= 3 ? parts.slice(0, 3).join(':') : marketId
}

function FactList({ facts, onSelect }: { facts: OracleFact[]; onSelect?: (fact: OracleFact) => void }) {
  if (facts.length === 0) {
    return <EmptyState title="暂无 Fact" desc="当前筛选条件没有待处理记录。" />
  }
  return (
    <div className="space-y-3">
      {facts.map((fact) => (
        <button
          key={fact.fact_id}
          type="button"
          onClick={() => onSelect?.(fact)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3 text-left transition-colors hover:border-[#2DD4BF]/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fact.fact_id}</p>
            <Badge tone={fact.status === 'finalized' ? 'success' : fact.status === 'disputed' ? 'danger' : 'warning'}>{localStatus(fact.status)}</Badge>
            {fact.single_source && <Badge tone="warning">单一来源</Badge>}
          </div>
          <p className="mt-2 text-sm">{fact.market_id}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">结果：{fact.winner || 'void/待定'} · 来源：{fact.sources.join(', ')}</p>
        </button>
      ))}
    </div>
  )
}

function PolymarketPage({ role, pushToast }: { role: Role; pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void }) {
  const queue = useApiResource<PolymarketQueueItem[]>('/api/v1/admin/polymarket/queue?status=candidate', mockPolymarketQueue)
  const health = useApiResource<PolymarketHealth>('/api/v1/admin/polymarket/health', mockPolymarketHealth)
  const unmapped = useApiResource<PolymarketTeam[]>('/api/v1/admin/polymarket/teams/unmapped', mockUnmappedTeams)
  const pool = useApiResource<PolymarketTeam[]>('/api/v1/admin/polymarket/teams/pool', mockTeamPool)
  const [layer, setLayer] = useState('market')
  const [id, setId] = useState('701')
  const [reason, setReason] = useState('')
  const [selectedInternal, setSelectedInternal] = useState(mockUnmappedTeams[0].id)
  const [selectedPoly, setSelectedPoly] = useState(mockTeamPool[0].id)
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const canQueueWrite = role === 'Admin' || role === 'Ops'
  const canFallback = role === 'Admin' || role === 'SRE'

  function submitQueue(action: 'confirm' | 'reject') {
    if (!canQueueWrite) {
      pushToast({ type: 'warning', title: '当前角色不能审核候选队列' })
      return
    }
    if (!Number.isFinite(Number(id))) {
      pushToast({ type: 'warning', title: '候选 ID 必须是数字' })
      return
    }
    if (action === 'reject' && !reason.trim()) {
      pushToast({ type: 'warning', title: '拒绝时必须填写原因' })
      return
    }
    requestConfirm({
      key: `pm-${action}`,
      title: action === 'confirm' ? '确认通过候选项' : '确认拒绝候选项',
      description: '该操作会影响 Polymarket 参考源映射。',
      danger: action === 'reject',
      details: [
        ['层级', layer],
        ['候选 ID', id],
        ['原因', action === 'reject' ? reason : '审核通过'],
      ],
      run: async () => {
        const path = action === 'confirm' ? '/api/v1/admin/polymarket/confirm' : '/api/v1/admin/polymarket/reject'
        const body = action === 'confirm' ? { layer, id: Number(id), operator: getOperator(role) } : { layer, id: Number(id), reason, operator: getOperator(role) }
        await apiPost<typeof body, unknown>(path, body)
        await queue.refresh()
      },
    })
  }

  function submitFallback(enabled: boolean) {
    if (!canFallback) {
      pushToast({ type: 'warning', title: '只有管理员或 SRE 可操作 fallback' })
      return
    }
    requestConfirm({
      key: `pm-fallback-${enabled}`,
      title: enabled ? '确认开启降级参考源' : '确认关闭降级参考源',
      description: 'Fallback 会改变 Polymarket 参考价的取数策略，请确认当前健康状态。',
      danger: enabled,
      details: [
        ['当前状态', localStatus(health.data.status)],
        ['队列深度', health.data.queue_depth ?? '-'],
        ['未映射球队', health.data.unmapped_teams ?? '-'],
      ],
      run: async () => {
        await apiPost<{ operator: string }, unknown>(`/api/v1/admin/polymarket/fallback/${enabled ? 'enable' : 'disable'}`, { operator: getOperator(role) })
        await health.refresh()
      },
    })
  }

  function bindTeam() {
    if (!canQueueWrite) {
      pushToast({ type: 'warning', title: '当前角色不能绑定球队' })
      return
    }
    requestConfirm({
      key: 'pm-bind-team',
      title: '确认绑定球队映射',
      description: '球队映射会影响后续参考市场匹配。',
      details: [
        ['内部球队 ID', selectedInternal],
        ['Polymarket 球队 ID', selectedPoly],
        ['联赛', unmapped.data.find((team) => team.id === selectedInternal)?.league_code ?? '-'],
      ],
      run: async () => {
        await apiPost('/api/v1/admin/polymarket/teams/bind', {
          internal_team_id: selectedInternal,
          polymarket_team_id: selectedPoly,
          league_code: unmapped.data.find((team) => team.id === selectedInternal)?.league_code ?? '',
          operator: getOperator(role),
        })
        await Promise.all([unmapped.refresh(), pool.refresh()])
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'SRE']}>
      <PageHeader title="Polymarket 治理" desc="候选审核、球队映射、健康检查与降级参考源开关。" />
      <DemoNotice scope="Polymarket 页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <SectionCard title="候选队列" action={<ResourceState {...queue} onRefresh={() => void queue.refresh()} />}>
          {queue.loading ? <SkeletonBlock rows={4} /> : (
            <div className="space-y-3">
              {queue.data.map((item) => (
                <button
                  key={`${item.layer}-${item.id}`}
                  type="button"
                  onClick={() => {
                    setLayer(item.layer)
                    setId(String(item.id))
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3 text-left hover:border-[#2DD4BF]/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.title}</p>
                    <Badge tone={item.status === 'candidate' ? 'accent' : 'neutral'}>{localStatus(item.status)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">#{item.id} · {item.layer} · {item.league_code ?? '-'}</p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="健康状态" action={<ResourceState {...health} onRefresh={() => void health.refresh()} />}>
            <div className="space-y-2 text-sm">
              <InfoRow label="状态" value={localStatus(health.data.status)} />
              <InfoRow label="降级参考源" value={health.data.fallback_enabled ? '已开启' : '已关闭'} />
              <InfoRow label="最近同步" value={health.data.last_sync_at ?? '-'} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="secondary" disabled={!canFallback} loading={runningKey === 'pm-fallback-true'} onClick={() => submitFallback(true)}>开启降级</Button>
                <Button variant="secondary" disabled={!canFallback} loading={runningKey === 'pm-fallback-false'} onClick={() => submitFallback(false)}>关闭降级</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="队列操作">
            <div className="space-y-3">
              <Select label="层级" value={layer} onChange={(event) => setLayer(event.target.value)}>
                <option value="market">market</option>
                <option value="event">event</option>
                <option value="team">team</option>
              </Select>
              <Input label="候选 ID" value={id} onChange={(event) => setId(event.target.value)} />
              <Input label="拒绝原因" value={reason} onChange={(event) => setReason(event.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={!canQueueWrite} loading={runningKey === 'pm-confirm'} onClick={() => submitQueue('confirm')}>确认通过</Button>
                <Button variant="danger" disabled={!canQueueWrite} loading={runningKey === 'pm-reject'} onClick={() => submitQueue('reject')}>拒绝候选</Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="未映射球队" action={<ResourceState {...unmapped} onRefresh={() => void unmapped.refresh()} />}>
          <TeamSelectList teams={unmapped.data} selected={selectedInternal} onSelect={setSelectedInternal} />
        </SectionCard>
        <SectionCard title="Polymarket 候选池" action={<ResourceState {...pool} onRefresh={() => void pool.refresh()} />}>
          <TeamSelectList teams={pool.data} selected={selectedPoly} onSelect={setSelectedPoly} />
          <div className="mt-4">
            <Button disabled={!canQueueWrite} loading={runningKey === 'pm-bind-team'} onClick={bindTeam}>绑定所选球队</Button>
          </div>
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function TeamSelectList({ teams, selected, onSelect }: { teams: PolymarketTeam[]; selected: number; onSelect: (id: number) => void }) {
  if (teams.length === 0) {
    return <EmptyState title="暂无球队" desc="当前接口无待处理球队。" />
  }
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <button
          key={team.id}
          type="button"
          onClick={() => onSelect(team.id)}
          className={`w-full rounded-xl border p-3 text-left text-sm ${selected === team.id ? 'border-[#2DD4BF] bg-[#2DD4BF]/10' : 'border-[var(--border)] bg-[var(--bg-control)]'}`}
        >
          <p className="font-semibold">{team.name}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">#{team.id} · {team.league_code ?? '-'} · {team.external_name ?? '候选池'}</p>
        </button>
      ))}
    </div>
  )
}

function AccountsPage({ role, pushToast }: { role: Role; pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void }) {
  const [accountId, setAccountId] = useState('10001')
  const [coin, setCoin] = useState('USDT')
  const [amount, setAmount] = useState('10000')
  const [activeTab, setActiveTab] = useState<'balance' | 'positions' | 'trades' | 'settlements'>('balance')
  const [balance, setBalance] = useState<Balance>({ account_id: 10001, coin: 'USDT', available: '8200', frozen: '1800', total: '10000' })
  const [balanceMode, setBalanceMode] = useState<'real' | 'mock'>('mock')
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const canRecharge = role === 'Admin' && !import.meta.env.VITE_API_BASE_URL

  async function queryBalance() {
    if (!Number.isFinite(Number(accountId))) {
      pushToast({ type: 'warning', title: '账户 ID 必须是数字' })
      return
    }
    setLoading(true)
    const response = await apiGet<Balance>(`/api/v1/admin/balance?account_id=${accountId}&coin=${coin}`, balance)
    setBalance(response.data)
    setBalanceMode(response.mode)
    setBalanceError(response.error)
    setLoading(false)
  }

  function recharge() {
    if (!canRecharge) {
      pushToast({ type: 'warning', title: 'Mock 充值仅管理员在公开演示/非生产模式可见' })
      return
    }
    requestConfirm({
      key: 'account-recharge',
      title: '确认 Mock 充值',
      description: '该接口仅用于 SIT/UAT 或本地开发，不应在生产环境开放。',
      danger: true,
      details: [
        ['账户', accountId],
        ['币种', coin],
        ['金额', amount],
      ],
      run: async () => {
        const response = await apiPost<{ account_id: number; coin: string; amount: string }, Balance>('/api/v1/admin/mock_recharge', {
          account_id: Number(accountId),
          coin,
          amount,
        })
        setBalance(response.data)
        setBalanceMode('real')
        setBalanceError(null)
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'CS', 'Risk']}>
      <PageHeader title="用户账户" desc="客服查询资金、持仓、交易、结算；Mock 充值仅管理员演示可见。" />
      <DemoNotice scope="账户页面" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <SectionCard title="账户查询" action={<span className="text-xs text-[var(--text-secondary)]">{balanceMode === 'real' ? '真实接口' : '演示数据'}</span>}>
          <div className="space-y-3">
            <Input label="账户 ID" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
            <Input label="币种" value={coin} onChange={(event) => setCoin(event.target.value)} />
            {canRecharge && <Input label="Mock 充值金额" value={amount} onChange={(event) => setAmount(event.target.value)} />}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" loading={loading} onClick={() => void queryBalance()}>查询余额</Button>
              {canRecharge ? <Button loading={runningKey === 'account-recharge'} onClick={recharge}>Mock 充值</Button> : <Button variant="ghost" disabled>无充值权限</Button>}
            </div>
            {balanceError && <p className="text-xs text-[#F59E0B]" role="status">接口不可达，当前展示演示/旧数据：{balanceError}</p>}
          </div>
        </SectionCard>
        <SectionCard title="账户详情">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['balance', 'positions', 'trades', 'settlements'] as const).map((tab) => (
              <Button key={tab} variant={activeTab === tab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)}>
                {tabLabel(tab)}
              </Button>
            ))}
          </div>
          {activeTab === 'balance' ? (
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="可用" value={balance.available ?? balance.balance ?? '-'} source={balanceMode} />
              <MetricCard label="冻结" value={balance.frozen ?? '-'} source={balanceMode} />
              <MetricCard label="总额" value={balance.total ?? '-'} source={balanceMode} />
            </div>
          ) : (
            <EmptyState title={`${tabLabel(activeTab)}接口待确认`} desc="当前后端已有用户维度查询能力线索，但 account_id 参数和管理后台过滤口径仍需研发确认；前端已预留 Tab。" />
          )}
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function tabLabel(tab: 'balance' | 'positions' | 'trades' | 'settlements') {
  return {
    balance: '资金快照',
    positions: '持仓',
    trades: '交易',
    settlements: '结算',
  }[tab]
}

function DistributorsPage({ role, pushToast }: { role: Role; pushToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void }) {
  const [configs, setConfigs] = useState<DistributorConfig[]>(mockDistributors)
  const [logs, setLogs] = useState<AuditLogItem[]>(mockAuditLogs)
  const [selectedId, setSelectedId] = useState(mockDistributors[0].id)
  const selected = configs.find((item) => item.id === selectedId) ?? configs[0]
  const [markup, setMarkup] = useState(String(selected.markup_bps))
  const [reason, setReason] = useState('')
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const canEdit = role === 'Admin' || role === 'Ops'

  function saveMarkup() {
    const nextMarkup = Number(markup)
    if (!Number.isFinite(nextMarkup) || nextMarkup < 0 || nextMarkup > 500) {
      pushToast({ type: 'warning', title: '加价必须是 0-500 bps 的数字' })
      return
    }
    if (!reason.trim()) {
      pushToast({ type: 'warning', title: '请填写修改原因' })
      return
    }
    requestConfirm({
      key: 'dist-markup',
      title: '确认修改分销商加价',
      description: '当前为后端缺口原型，仅写入本地状态和演示审计日志。',
      details: [
        ['分销商', selected.name],
        ['旧值', `${selected.markup_bps} bps`],
        ['新值', `${nextMarkup} bps`],
        ['原因', reason],
      ],
      run: async () => {
        setConfigs((current) => current.map((item) => (item.id === selectedId ? { ...item, markup_bps: nextMarkup } : item)))
        setLogs((current) => [
          {
            id: `audit_${Date.now()}`,
            actor: role,
            action: 'update_distributor_markup_local_demo',
            target: selectedId,
            result: 'local demo only',
            before_value: `${selected.markup_bps}`,
            after_value: `${nextMarkup}`,
            reason,
            created_at: new Date().toISOString(),
          },
          ...current,
        ])
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="分销商加价" desc="管理 markup 控制位。当前后端未接入，页面明确作为缺口原型。" />
      <DemoNotice scope="分销商页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="分销商列表" action={<Badge tone="warning">后端缺口原型</Badge>}>
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
                  <Badge tone={item.status === 'active' ? 'success' : 'warning'}>{localStatus(item.status)}</Badge>
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
            <Input label="默认加价（bps）" value={markup} onChange={(event) => setMarkup(event.target.value)} />
            <Textarea label="修改原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            <InfoRow label="结算方式" value={selected.settlement_mode} />
            <InfoRow label="风控备注" value={selected.risk_note} />
            <Button disabled={!canEdit} loading={runningKey === 'dist-markup'} onClick={saveMarkup}>保存本地原型配置</Button>
          </div>
        </SectionCard>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="盘口类型覆盖预留">
          <SimpleList items={['胜平负：继承默认 markup', '让球：待后端支持盘口类型覆盖', '大小球：待后端支持盘口类型覆盖', '比分：建议上线前单独限额']} />
        </SectionCard>
        <SectionCard title="本地演示审计">
          <AuditList logs={logs.slice(0, 5)} />
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function OpsPage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'SRE', 'Ops']}>
      <PageHeader title="运维监控" desc="统一展示后端能力缺口和可接入观测项，避免静态指标误导。" />
      <DemoNotice scope="运维页面" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="API health" value="待接 /health" source="mock" desc="当前 Pages 不连接真实 API" />
        <MetricCard label="数据源延迟" value="约 30s" source="mock" desc="待 SIG/API Football 接入后校准" />
        <MetricCard label="ChainScanner lag" value="缺口" source="mock" desc="需后端暴露 last_slot" />
        <MetricCard label="Open alerts" value="缺口" source="mock" desc="需接告警系统" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="能力缺口">
          <SimpleList items={['系统健康 API/DB/Redis/WS 聚合', 'Reconciler 四组等式异常看板', 'Oracle finalize 任务状态', 'API-Football quota 和最近错误', 'WS 连接数和频道数']} />
        </SectionCard>
        <SectionCard title="SRE 操作建议">
          <SimpleList items={['真实后台必须部署在 VPN/SSO 后', '检查 vendor feed token 与 IPAllowList', '检查链扫重复事件与回放状态']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function RebatePage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'CS']}>
      <PageHeader title="返佣管理" desc="当前为能力缺口面板，避免把静态数字误认为真实返佣流水。" />
      <DemoNotice scope="返佣页面" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="今日返佣" value="演示" source="mock" desc="待 rebate records 查询 API" />
        <MetricCard label="待审核" value="演示" source="mock" desc="待异常队列 API" />
        <MetricCard label="异常单" value="演示" source="mock" desc="待链上对账 API" />
      </div>
      <div className="mt-4">
        <SectionCard title="待接能力">
          <SimpleList items={['返佣规则启停和比例配置', '返佣记录按 trade/account 查询', 'void/refund 后反向补偿记录', '返佣流水与链上 tx 对齐']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function KpiPage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="KPI 报表" desc="展示指标口径和 mock 来源；真实报表需后端聚合 API。" />
      <DemoNotice scope="KPI 页面" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="RFQ 转化率" value="41.2%" source="mock" desc="成交数 / quote 数" />
        <MetricCard label="Quote 过期率" value="6.8%" source="mock" desc="expired quotes / quotes" />
        <MetricCard label="仲裁争议率" value="1.4%" source="mock" desc="disputed facts / resolved facts" />
        <MetricCard label="人工介入占比" value="18%" source="mock" desc="manual actions / total ops" />
      </div>
      <div className="mt-4">
        <SectionCard title="关键观察">
          <SimpleList items={['进球后不自动暂停是当前有意设计，待 SIG 规则明确后再决策', 'API Football/mock 数据需在后台显式标识来源置信度', '分销商加价上线前需要补齐审计日志与双人复核']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function AuditPage({ role }: { role: Role }) {
  const logs = useMemo<AuditLogItem[]>(() => mockAuditLogs, [])
  return (
    <Guard role={role} allow={['Admin', 'Risk', 'SRE']}>
      <PageHeader title="权限与审计" desc="当前展示前端演示权限矩阵；真实上线必须依赖后端鉴权和审计落库。" />
      <DemoNotice scope="审计页面" />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <SectionCard title="演示角色矩阵">
          <div className="space-y-3">
            {roles.map((item) => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
                <p className="font-semibold">{roleLabels[item]}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{navItems.filter((nav) => nav.roles.includes(item)).map((nav) => nav.label).join(' / ')}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="审计日志占位" action={<Badge tone="warning">待后端落库</Badge>}>
          <AuditList logs={logs} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function AuditList({ logs }: { logs: AuditLogItem[] }) {
  if (logs.length === 0) {
    return <EmptyState title="暂无审计日志" desc="真实上线后应记录 operator、IP、前后值、复核人和时间。" />
  }
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{typeof log.actor === 'string' && log.actor in roleLabels ? roleLabels[log.actor as Role] : log.actor}</Badge>
            <p className="font-semibold">{log.action}</p>
            <Badge tone={log.result === 'success' ? 'success' : 'warning'}>{log.result}</Badge>
          </div>
          <p className="mt-2 text-sm">{log.target}</p>
          {log.reason && <p className="mt-1 text-xs text-[var(--text-secondary)]">原因：{log.reason}</p>}
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{log.created_at}</p>
        </div>
      ))}
    </div>
  )
}

export default App
