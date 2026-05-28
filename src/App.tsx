import { useEffect, useMemo, useState } from 'react'
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
  successTitle?: string
  details: Array<[string, React.ReactNode]>
  run: () => Promise<void>
}

const roles: Role[] = ['Admin', 'CS', 'Ops', 'Risk', 'SRE']
const writesEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN_WRITES === 'true'
const mockRechargeEnabled = import.meta.env.DEV || import.meta.env.VITE_ALLOW_MOCK_RECHARGE === 'true'

const navItems: NavItem[] = [
  { to: '/dashboard', label: '总览', roles: ['Admin', 'Ops', 'Risk', 'SRE'], defaultFor: ['Admin', 'Ops', 'Risk'] },
  { to: '/rfq', label: '盘口运营', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/oracle', label: '赛果仲裁', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/polymarket', label: '外部参考价', roles: ['Admin', 'Ops', 'SRE'] },
  { to: '/accounts', label: '用户账户', roles: ['Admin', 'CS', 'Risk'], defaultFor: ['CS'] },
  { to: '/distributors', label: '分销商加价', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/ops', label: '运维监控', roles: ['Admin', 'SRE', 'Ops'], defaultFor: ['SRE'] },
  { to: '/rebate', label: '返佣', roles: ['Admin', 'Ops', 'CS'] },
  { to: '/kpi', label: '经营报表', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/audit', label: '权限与审计', roles: ['Admin', 'Risk', 'SRE'] },
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
              <span className="text-[10px] opacity-60">演示角色</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-[var(--text-secondary)]">
          <p className="mb-2">数据源</p>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] px-3 py-2">
            <p className={isPublicDemo ? 'text-[#F59E0B]' : 'text-[#10B981]'}>
              {isPublicDemo ? '演示模式：仅支持查看示例数据' : '测试环境数据服务'}
            </p>
            <p className="mt-1 truncate">{apiBase ? '已配置数据服务地址' : '数据服务地址未配置，请联系管理员'}</p>
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
                测试环境 · 修改失败会如实报错 · {isPublicDemo ? '示例数据' : '优先连接测试接口'}
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
          <p className="font-semibold">TurboFlow 管理后台</p>
          <p className="text-xs text-[var(--text-secondary)]">足球盘口管理后台</p>
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
          当前演示角色为 {roleLabels[role]}，只能查看已授权模块。正式上线后须由系统权限与操作日志保障安全。
        </p>
      </SectionCard>
    )
  }
  return children
}

function DemoNotice({ scope = '当前模块' }: { scope?: string }) {
  return (
    <div className="mb-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-sm text-[#FEF3C7]">
      {scope}可能含示例数据或尚未上线的功能。查询失败会标注“示例数据”；提交失败不会假装成功。
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
      pushToast({ type: 'success', title: pendingAction.successTitle ?? '操作已成功提交', message: pendingAction.title })
      setPendingAction(null)
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : '未知错误'
      pushToast({ type: 'error', title: '操作失败', message })
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
  const disputedFactsFallback = useMemo(() => mockFacts.filter((fact) => fact.status === 'disputed'), [])
  const stats = useApiResource<StatsOverview>('/api/v1/soccer/stats/overview', mockStats)
  const health = useApiResource<PolymarketHealth>('/api/v1/admin/polymarket/health', mockPolymarketHealth)
  const facts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?status=proposed&limit=5', mockFacts)
  const disputedFacts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?status=disputed&limit=5', disputedFactsFallback)

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk', 'SRE']}>
      <PageHeader title="运营总览" desc="汇总盘口、赛果争议、外部参考价同步与待人工处理事项。" />
      <DemoNotice scope="首页" />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="进行中赛事" value={stats.loading ? '...' : stats.data.live_events} source={stats.mode} />
        <MetricCard label="可见盘口" value={stats.loading ? '...' : stats.data.total_markets} source={stats.mode} />
        <MetricCard label="24h 成交额" value={stats.loading ? '...' : `${formatNumber(stats.data.volume_24h_usd)} USDT`} source={stats.mode} />
        <MetricCard label="待处理争议" value={disputedFacts.loading ? '...' : disputedFacts.data.length} source={disputedFacts.mode} desc="待处理赛果争议" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="待处理赛果" action={<ResourceState {...facts} onRefresh={() => void facts.refresh()} />}>
          {facts.loading ? <SkeletonBlock rows={3} /> : <FactList facts={facts.data.slice(0, 5)} />}
        </SectionCard>
        <SectionCard title="外部参考价（Polymarket）" action={<ResourceState {...health} onRefresh={() => void health.refresh()} />}>
          <div className="grid gap-3 text-sm">
            <InfoRow label="状态" value={localStatus(health.data.status)} />
            <InfoRow label="备用参考价" value={health.data.fallback_enabled ? '已启用' : '已停用'} />
            <InfoRow label="待审核条目数" value={health.data.queue_depth ?? '-'} />
            <InfoRow label="待匹配球队" value={health.data.unmapped_teams ?? '-'} />
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
  const canOperate = writesEnabled && (role === 'Admin' || role === 'Ops')
  const canSettle = writesEnabled && role === 'Admin'

  useEffect(() => {
    const firstMarket = markets.data[0]?.market_id ?? ''
    if (firstMarket && !markets.data.some((market) => market.market_id === marketId)) {
      const timer = window.setTimeout(() => setMarketId(firstMarket), 0)
      return () => window.clearTimeout(timer)
    }
  }, [marketId, markets.data])

  function submitRfq(action: 'pause' | 'resume' | 'settle') {
    if (!marketId || !reason.trim()) {
      pushToast({ type: 'warning', title: '请选择盘口并填写操作原因' })
      return
    }
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改', message: '请联系管理员或运维开通测试环境修改权限。' })
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
      title: action === 'settle' ? '确认手动结算盘口' : action === 'pause' ? '确认暂停盘口' : '确认恢复盘口',
      description: '该操作将提交至后台执行。失败时会如实提示，不会显示虚假成功。',
      danger: action === 'settle',
      details: [
        ['盘口', marketId],
        ['结果', action === 'settle' ? winningOutcome || '作废/退回本金' : localStatus(action)],
        ['原因', reason],
        ['影响范围', '上线后由系统自动计算受影响持仓与预计派彩'],
      ],
      run: async () => {
        await apiPost<typeof body, unknown>(path, body)
        await markets.refresh()
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="盘口运营" desc="管理赛事与盘口暂停、恢复及人工结算。风控仅可查看或提交复核意见。" />
      <DemoNotice scope="盘口运营页面" />
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
          <SectionCard title="盘口操作台" action={<ResourceState {...markets} onRefresh={() => void markets.refresh()} />}>
            <div className="space-y-3">
              <Select label="盘口" value={marketId} onChange={(event) => setMarketId(event.target.value)}>
                {markets.data.map((market) => (
                  <option key={market.market_id} value={market.market_id}>
                    {market.market_title} · {localStatus(market.status)}
                  </option>
                ))}
              </Select>
              <Input label="操作原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：数据源异常、人工复核通过" />
              <Input label="结算结果" value={winningOutcome} onChange={(event) => setWinningOutcome(event.target.value)} placeholder="留空表示作废并退回本金" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" disabled={!canOperate} loading={runningKey === 'rfq-pause'} onClick={() => submitRfq('pause')}>暂停盘口</Button>
                <Button variant="secondary" disabled={!canOperate} loading={runningKey === 'rfq-resume'} onClick={() => submitRfq('resume')}>恢复盘口</Button>
                <Button className="sm:col-span-2" disabled={!canSettle} loading={runningKey === 'rfq-settle'} onClick={() => submitRfq('settle')}>管理员结算</Button>
              </div>
              {!canSettle && <p className="text-xs text-[var(--text-secondary)]">当前角色不能直接结算，只能查看并提交线下复核建议。</p>}
            </div>
          </SectionCard>

          <SectionCard title="盘口详情">
            {selectedMarket ? (
              <div className="space-y-2">
                <InfoRow label="盘口编号" value={selectedMarket.market_id} />
                <InfoRow label="标题" value={selectedMarket.market_title} />
                <InfoRow label="状态" value={localStatus(selectedMarket.status)} />
                <InfoRow label="数据来源" value={localDataSource(selectedMarket.provider_id)} />
                <InfoRow label="规则" value={selectedMarket.resolution_rule ?? '暂无（等待系统返回）'} />
                <div className="mt-3 grid gap-2">
                  {(selectedMarket.outcomes ?? []).map((outcome) => (
                    <div key={outcome.outcome_id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-control)] p-3 text-sm">
                      {outcome.label} · 欧赔 {outcome.display_decimal_odds ?? '-'} · {localStatus(outcome.status)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="未选择盘口" desc="请选择赛事和盘口。" />
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
  const factsFallback = useMemo(() => mockFacts.filter((fact) => status === '' || fact.status === status), [status])
  const facts = useApiResource<OracleFact[]>(`/api/v1/admin/oracle/facts?status=${status}&limit=50`, factsFallback)
  const [factId, setFactId] = useState(mockFacts[0].fact_id)
  const [marketId, setMarketId] = useState(mockFacts[0].market_id)
  const [winner, setWinner] = useState('')
  const [reason, setReason] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [payoutRatios, setPayoutRatios] = useState('{}')
  const { requestConfirm, modal, runningKey } = useConfirmAction(pushToast)
  const canWrite = writesEnabled && (role === 'Admin' || role === 'Ops')
  const canFinalize = writesEnabled && role === 'Admin'

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
    throw new Error('派彩比例格式不正确，请按选项填写比例，或保留默认规则')
  }

  function submitOracle(action: 'resolve' | 'candidate' | 'dispute' | 'finalize' | 'cancel' | 'phase') {
    if (!marketId.trim() || !reason.trim()) {
      pushToast({ type: 'warning', title: '请填写盘口编号和操作原因' })
      return
    }
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改', message: '请联系管理员或运维开通测试环境修改权限。' })
      return
    }
    if ((action === 'finalize' || action === 'cancel') && !canFinalize) {
      pushToast({ type: 'warning', title: '当前角色不能直接执行最终确认或作废' })
      return
    }
    if (!canWrite) {
      pushToast({ type: 'warning', title: '当前角色仅可查看或复核，不能提交修改' })
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
      description: '此操作将影响赛果结算与用户资金，请仔细核对。',
      danger: action === 'finalize' || action === 'cancel',
      details: [
        ['赛果记录编号', factId || '待生成'],
        ['盘口编号', marketId],
        ['胜出选项', localOutcomeValue(winner) || '作废/待定'],
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
      <PageHeader title="赛果仲裁" desc="处理待确认赛果、争议、复核结果提交与管理员最终裁定。" />
      <DemoNotice scope="赛果仲裁页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="待处理赛果"
          action={
            <div className="flex items-center gap-3">
              <Select label="状态筛选" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9">
                <option value="">全部</option>
                <option value="proposed">待确认</option>
                <option value="disputed">争议中</option>
                <option value="finalized">已最终确认</option>
              </Select>
              <ResourceState {...facts} onRefresh={() => void facts.refresh()} />
            </div>
          }
        >
          {facts.loading ? <SkeletonBlock rows={4} /> : <FactList facts={facts.data} onSelect={selectFact} />}
        </SectionCard>
        <SectionCard title="赛果处理">
          <div className="space-y-3">
            <Input label="盘口编号" value={marketId} onChange={(event) => setMarketId(event.target.value)} />
            <Input label="赛果记录编号" value={factId} onChange={(event) => setFactId(event.target.value)} />
            <Input label="胜出选项" value={winner} onChange={(event) => setWinner(event.target.value)} placeholder="留空表示作废/待定" />
            <Input label="证据链接" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
            <Textarea label="派彩比例（高级）" value={payoutRatios} onChange={(event) => setPayoutRatios(event.target.value)} />
            <Textarea label="操作原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-resolve'} onClick={() => submitOracle('resolve')}>发起赛果确认</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-candidate'} onClick={() => submitOracle('candidate')}>提交复核结果</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-dispute'} onClick={() => submitOracle('dispute')}>发起争议</Button>
              <Button disabled={!canFinalize} loading={runningKey === 'oracle-finalize'} onClick={() => submitOracle('finalize')}>管理员最终确认</Button>
              <Button variant="danger" disabled={!canFinalize} loading={runningKey === 'oracle-cancel'} onClick={() => submitOracle('cancel')}>作废本条赛果</Button>
              <Button variant="secondary" disabled={!canWrite} loading={runningKey === 'oracle-phase'} onClick={() => submitOracle('phase')}>切换比赛阶段</Button>
            </div>
            {!canFinalize && <p className="text-xs text-[var(--text-secondary)]">最终确认和作废仅管理员可执行；运营可提交复核结果或争议，风控只读复核。</p>}
          </div>
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function localOracleAction(action: string) {
  return {
    resolve: '发起赛果确认',
    candidate: '提交复核结果',
    dispute: '发起争议',
    finalize: '最终确认',
    cancel: '作废赛果记录',
    phase: '切换比赛阶段',
  }[action] ?? action
}

function selectedSubjectId(marketId: string) {
  const parts = marketId.split(':')
  return parts.length >= 3 ? parts.slice(0, 3).join(':') : marketId
}

function localDataSource(value: string | undefined) {
  const map: Record<string, string> = {
    'sig-mock': '模拟数据源',
    'api-football': 'API-Football',
    'polymarket-ref': 'Polymarket 参考价',
    match_fact: '赛事实时数据',
    api_football: 'API-Football',
    manual_ops: '人工录入',
  }
  return value ? map[value] ?? value : '-'
}

function localOutcomeValue(value: string | undefined) {
  const map: Record<string, string> = {
    home: '主胜',
    draw: '平局',
    away: '客胜',
    over: '大球',
    under: '小球',
    void: '作废',
  }
  return value ? map[value] ?? value : ''
}

function localAuditAction(value: string) {
  const map: Record<string, string> = {
    pause_market: '暂停盘口',
    update_distributor_markup: '修改分销商加价',
    update_distributor_markup_local_demo: '修改分销商加价（演示）',
    enable_polymarket_fallback: '启用备用参考价',
  }
  return map[value] ?? value
}

function FactList({ facts, onSelect }: { facts: OracleFact[]; onSelect?: (fact: OracleFact) => void }) {
  if (facts.length === 0) {
    return <EmptyState title="暂无待处理赛果" desc="当前筛选条件没有待处理记录。" />
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
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            结果：{localOutcomeValue(fact.winner) || '作废/待定'} · 来源：{fact.sources.map(localDataSource).join(', ')}
          </p>
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
  const canQueueWrite = writesEnabled && (role === 'Admin' || role === 'Ops')
  const canFallback = writesEnabled && (role === 'Admin' || role === 'SRE')

  function submitQueue(action: 'confirm' | 'reject') {
    if (!canQueueWrite) {
      pushToast({ type: 'warning', title: '当前角色不能审核匹配建议' })
      return
    }
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改' })
      return
    }
    if (!Number.isFinite(Number(id))) {
      pushToast({ type: 'warning', title: '建议编号必须是数字' })
      return
    }
    if (action === 'reject' && !reason.trim()) {
      pushToast({ type: 'warning', title: '拒绝时必须填写原因' })
      return
    }
    requestConfirm({
      key: `pm-${action}`,
      title: action === 'confirm' ? '确认通过匹配建议' : '确认拒绝匹配建议',
      description: '该操作会影响外部参考价的赛事或球队对应关系。',
      danger: action === 'reject',
      details: [
        ['类型', localStatus(layer)],
        ['建议编号', id],
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
      pushToast({ type: 'warning', title: '仅管理员或基础设施运维可切换备用参考价' })
      return
    }
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改' })
      return
    }
    requestConfirm({
      key: `pm-fallback-${enabled}`,
      title: enabled ? '确认启用备用参考价' : '确认停用备用参考价',
      description: '开启后将改用备用数据源获取参考价，请确认当前同步状态。',
      danger: enabled,
      details: [
        ['当前状态', localStatus(health.data.status)],
        ['待审核条目数', health.data.queue_depth ?? '-'],
        ['待匹配球队', health.data.unmapped_teams ?? '-'],
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
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改' })
      return
    }
    requestConfirm({
      key: 'pm-bind-team',
      title: '确认绑定球队映射',
      description: '球队对应关系会影响后续外部参考价匹配。',
      details: [
        ['本平台球队', selectedInternal],
        ['参考源球队', selectedPoly],
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
      <PageHeader title="外部参考价管理" desc="审核匹配建议、维护球队对应关系、查看同步状态与备用参考价开关。" />
      <DemoNotice scope="外部参考价页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <SectionCard title="匹配建议" action={<ResourceState {...queue} onRefresh={() => void queue.refresh()} />}>
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
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">#{item.id} · {localStatus(item.layer)} · {item.league_code ?? '-'}</p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="健康状态" action={<ResourceState {...health} onRefresh={() => void health.refresh()} />}>
            <div className="space-y-2 text-sm">
              <InfoRow label="状态" value={localStatus(health.data.status)} />
              <InfoRow label="备用参考价" value={health.data.fallback_enabled ? '已启用' : '已停用'} />
              <InfoRow label="最近同步" value={health.data.last_sync_at ?? '-'} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="secondary" disabled={!canFallback} loading={runningKey === 'pm-fallback-true'} onClick={() => submitFallback(true)}>启用备用参考价</Button>
                <Button variant="secondary" disabled={!canFallback} loading={runningKey === 'pm-fallback-false'} onClick={() => submitFallback(false)}>停用备用参考价</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="建议处理">
            <div className="space-y-3">
              <Select label="类型" value={layer} onChange={(event) => setLayer(event.target.value)}>
                <option value="market">盘口</option>
                <option value="event">赛事</option>
                <option value="team">球队</option>
              </Select>
              <Input label="建议编号" value={id} onChange={(event) => setId(event.target.value)} />
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
        <SectionCard title="待匹配球队" action={<ResourceState {...unmapped} onRefresh={() => void unmapped.refresh()} />}>
          <TeamSelectList teams={unmapped.data} selected={selectedInternal} onSelect={setSelectedInternal} />
        </SectionCard>
        <SectionCard title="参考源球队候选池" action={<ResourceState {...pool} onRefresh={() => void pool.refresh()} />}>
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
  const canRecharge = role === 'Admin' && mockRechargeEnabled

  async function queryBalance() {
    if (!Number.isFinite(Number(accountId))) {
      pushToast({ type: 'warning', title: '用户账户编号必须是数字' })
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
      pushToast({ type: 'warning', title: '测试充值仅管理员在测试环境可用' })
      return
    }
    requestConfirm({
      key: 'account-recharge',
      title: '确认测试充值',
      description: '仅用于测试环境，生产环境不会提供此功能。',
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
      <PageHeader title="用户账户" desc="查询用户资金、持仓、交易与结算记录。测试充值仅供管理员在测试环境使用。" />
      <DemoNotice scope="账户页面" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <SectionCard title="账户查询" action={<span className="text-xs text-[var(--text-secondary)]">{balanceMode === 'real' ? '正式数据' : '示例数据'}</span>}>
          <div className="space-y-3">
            <Input label="用户账户编号" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
            <Input label="币种" value={coin} onChange={(event) => setCoin(event.target.value)} />
            {canRecharge && <Input label="测试充值金额" value={amount} onChange={(event) => setAmount(event.target.value)} />}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" loading={loading} onClick={() => void queryBalance()}>查询余额</Button>
              {canRecharge ? <Button loading={runningKey === 'account-recharge'} onClick={recharge}>测试充值</Button> : <Button variant="ghost" disabled>无充值权限</Button>}
            </div>
            {balanceError && <p className="text-xs text-[#F59E0B]" role="status">查询失败，当前展示示例/旧数据：{balanceError}</p>}
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
            <EmptyState title={`${tabLabel(activeTab)}功能开发中`} desc="该功能尚未上线，暂无法查询。如需查历史持仓或交易，请联系技术支持。" />
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
      pushToast({ type: 'warning', title: '加价必须是 0-500 基点的数字' })
      return
    }
    if (!reason.trim()) {
      pushToast({ type: 'warning', title: '请填写修改原因' })
      return
    }
    requestConfirm({
      key: 'dist-markup',
      title: '确认修改分销商加价',
      description: '当前为演示配置，仅更新页面内状态和演示操作记录。',
      successTitle: '演示配置已保存',
      details: [
        ['分销商', selected.name],
        ['旧值', `${selected.markup_bps} 基点`],
        ['新值', `${nextMarkup} 基点`],
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
      <PageHeader title="分销商加价" desc="管理分销商赔率加价。当前功能尚未连接正式系统，页面明确标识为演示配置。" />
      <DemoNotice scope="分销商页面" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="分销商列表" action={<Badge tone="warning">功能开发中</Badge>}>
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
                <p className="mt-4 text-2xl font-semibold">{item.markup_bps} 基点</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.today_volume}</p>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="加价控制">
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">当前配置：{selected.name}</p>
            <Input label="默认加价（基点，1 基点 = 0.01%）" value={markup} onChange={(event) => setMarkup(event.target.value)} />
            <Textarea label="修改原因" value={reason} onChange={(event) => setReason(event.target.value)} />
            <InfoRow label="结算方式" value={selected.settlement_mode} />
            <InfoRow label="风控备注" value={selected.risk_note} />
            <Button disabled={!canEdit} loading={runningKey === 'dist-markup'} onClick={saveMarkup}>保存演示配置</Button>
          </div>
        </SectionCard>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="盘口类型覆盖预留">
          <SimpleList items={['胜平负：继承默认加价', '让球：待系统支持盘口类型覆盖', '大小球：待系统支持盘口类型覆盖', '比分：建议上线前单独限额']} />
        </SectionCard>
        <SectionCard title="操作记录（演示）">
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
      <PageHeader title="运维监控" desc="展示系统健康与待接入的监控项，避免静态假数据误导。" />
      <DemoNotice scope="运维页面" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="接口健康状态" value="待接入" source="mock" desc="待接入健康检查" />
        <MetricCard label="数据源延迟" value="约 30s" source="mock" desc="待赛事数据供应商接入后校准" />
        <MetricCard label="链上扫描延迟" value="开发中" source="mock" desc="需系统提供最新同步区块/槽位" />
        <MetricCard label="未处理告警" value="开发中" source="mock" desc="需接入告警系统" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="待接入能力">
          <SimpleList items={['系统健康（接口/数据库/缓存/实时连接）汇总', '账务对账异常看板', '赛果最终确认任务状态', 'API-Football 配额与最近错误', '实时连接数与订阅频道数']} />
        </SectionCard>
        <SectionCard title="运维操作建议">
          <SimpleList items={['正式后台必须部署在内网/VPN 与单点登录之后', '检查数据供应商令牌与 IP 白名单', '检查链上扫描重复事件与重放状态']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function RebatePage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'CS']}>
      <PageHeader title="返佣管理" desc="当前为待接入功能面板，避免把静态数字误认为真实返佣流水。" />
      <DemoNotice scope="返佣页面" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="今日返佣" value="演示" source="mock" desc="待返佣记录查询功能" />
        <MetricCard label="待审核" value="演示" source="mock" desc="待异常队列功能" />
        <MetricCard label="异常单" value="演示" source="mock" desc="待链上资金对账功能" />
      </div>
      <div className="mt-4">
        <SectionCard title="待接入能力">
          <SimpleList items={['返佣规则启停和比例配置', '按交易/账户查询返佣记录', '作废/退款后的返佣追回记录', '返佣流水与链上交易对齐']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function KpiPage({ role }: { role: Role }) {
  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="经营报表" desc="展示指标定义与示例数据来源；正式报表需接入系统聚合数据。" />
      <DemoNotice scope="经营报表页面" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="盘口成交转化率" value="41.2%" source="mock" desc="成交数 / 报价数" />
        <MetricCard label="报价过期率" value="6.8%" source="mock" desc="过期报价数 / 总报价数" />
        <MetricCard label="赛果争议率" value="1.4%" source="mock" desc="争议赛果数 / 已处理赛果数" />
        <MetricCard label="人工介入占比" value="18%" source="mock" desc="人工操作数 / 总操作数" />
      </div>
      <div className="mt-4">
        <SectionCard title="关键观察">
          <SimpleList items={['进球后不自动暂停是当前有意设计，待赛事数据规则明确后再决策', '第三方与示例数据须在后台标明来源与可信度', '分销商加价上线前需要补齐操作日志与双人复核']} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function AuditPage({ role }: { role: Role }) {
  const logs = useMemo<AuditLogItem[]>(() => mockAuditLogs, [])
  return (
    <Guard role={role} allow={['Admin', 'Risk', 'SRE']}>
      <PageHeader title="权限与审计" desc="当前展示演示角色权限说明；正式上线必须依赖系统权限和操作日志。" />
      <DemoNotice scope="审计页面" />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <SectionCard title="角色权限说明（演示）">
          <div className="space-y-3">
            {roles.map((item) => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
                <p className="font-semibold">{roleLabels[item]}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{navItems.filter((nav) => nav.roles.includes(item)).map((nav) => nav.label).join(' / ')}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="操作日志（开发中）" action={<Badge tone="warning">开发中</Badge>}>
          <AuditList logs={logs} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function AuditList({ logs }: { logs: AuditLogItem[] }) {
  if (logs.length === 0) {
    return <EmptyState title="暂无操作日志" desc="正式上线后应记录操作人、IP、修改前后值、复核人与时间。" />
  }
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-control)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{typeof log.actor === 'string' && log.actor in roleLabels ? roleLabels[log.actor as Role] : log.actor}</Badge>
            <p className="font-semibold">{localAuditAction(log.action)}</p>
            <Badge tone={log.result === 'success' ? 'success' : 'warning'}>{localStatus(log.result)}</Badge>
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
