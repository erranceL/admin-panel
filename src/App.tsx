import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Badge from './components/ui/Badge'
import Button from './components/ui/Button'
import { Input, Select, Textarea } from './components/ui/Field'
import ConfirmModal from './components/ui/Modal'
import { EmptyState, ResourceState, SkeletonBlock } from './components/ui/State'
import ToastContainer from './components/ui/Toast'
import { InfoRow, MetricCard, PageHeader, SectionCard, SimpleList } from './components/layout/LayoutPrimitives'
import { ApiError, apiPost, useApiResource } from './lib/api'
import { formatNumber, formatPercent, getOperator, localStatus, roleLabels } from './lib/format'
import {
  mockAuditLogs,
  mockDistributors,
  mockEventStats,
  mockFacts,
  mockMarkets,
  mockMatches,
  mockPolymarketHealth,
  mockPolymarketQueue,
  mockRebateRecords,
  mockRolePermissions,
  mockStats,
  mockTeamPool,
  mockUnmappedTeams,
} from './lib/mockData'
import { useToasts } from './hooks/useToasts'
import type {
  AuditLogItem,
  DistributorConfig,
  EventStats,
  MatchStats,
  OracleFact,
  PolymarketHealth,
  PolymarketQueueItem,
  PolymarketTeam,
  RebateRecord,
  RfqMarket,
  RfqMatch,
  Role,
  RolePermission,
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

const navItems: NavItem[] = [
  { to: '/dashboard', label: '总览', roles: ['Admin', 'Ops', 'Risk', 'SRE'], defaultFor: ['Admin', 'Ops', 'Risk'] },
  { to: '/rfq', label: '盘口与结算', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/polymarket', label: '外部参考价', roles: ['Admin', 'Ops', 'SRE'] },
  { to: '/distributors', label: '分销商加价', roles: ['Admin', 'Ops', 'Risk'] },
  { to: '/ops', label: '运维监控', roles: ['Admin', 'SRE', 'Ops'], defaultFor: ['SRE'] },
  { to: '/rebate', label: '返佣浏览', roles: ['Admin', 'Ops', 'CS'], defaultFor: ['CS'] },
  { to: '/stats', label: '运营数据', roles: ['Admin', 'Ops', 'Risk'] },
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
          <Route path="/polymarket" element={<PolymarketPage role={role} pushToast={push} />} />
          <Route path="/distributors" element={<DistributorsPage role={role} pushToast={push} />} />
          <Route path="/ops" element={<OpsPage role={role} />} />
          <Route path="/rebate" element={<RebatePage role={role} />} />
          <Route path="/stats" element={<OperationalStatsPage role={role} />} />
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

  const pendingFactsFallback = useMemo(() => mockFacts.filter((fact) => fact.status !== 'finalized'), [])
  const facts = useApiResource<OracleFact[]>('/api/v1/admin/oracle/facts?status=proposed&limit=50', pendingFactsFallback)
  const [factId, setFactId] = useState(mockFacts[0].fact_id)
  const [settleMarketId, setSettleMarketId] = useState(mockFacts[0].market_id)
  const [settleWinner, setSettleWinner] = useState('')
  const [settleReason, setSettleReason] = useState('')
  const [payoutRatios, setPayoutRatios] = useState('{}')
  const canResolve = writesEnabled && (role === 'Admin' || role === 'Ops')
  const canFinalize = writesEnabled && role === 'Admin'

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

  function selectFact(fact: OracleFact) {
    setFactId(fact.fact_id)
    setSettleMarketId(fact.market_id)
    setSettleWinner(fact.winner)
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

  function submitOracle(action: 'resolve' | 'finalize' | 'cancel' | 'phase') {
    if (!settleMarketId.trim() || !settleReason.trim()) {
      pushToast({ type: 'warning', title: '请填写盘口编号和操作原因' })
      return
    }
    if (!writesEnabled) {
      pushToast({ type: 'warning', title: '当前环境不允许提交修改', message: '请联系管理员或运维开通测试环境修改权限。' })
      return
    }
    if ((action === 'finalize' || action === 'cancel') && !canFinalize) {
      pushToast({ type: 'warning', title: '最终确认与作废仅管理员可执行' })
      return
    }
    if (!canResolve) {
      pushToast({ type: 'warning', title: '当前角色仅可查看或复核，不能提交结算操作' })
      return
    }
    const endpoint = {
      resolve: '/api/v1/admin/oracle/resolve',
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
        ['盘口编号', settleMarketId],
        ['胜出选项', localOutcomeValue(settleWinner) || '作废/待定'],
        ['原因', settleReason],
      ],
      run: async () => {
        const body =
          action === 'resolve'
            ? { market_id: settleMarketId }
            : action === 'finalize'
              ? { fact_id: factId, winner: settleWinner, payout_ratios: parseRatios(), by: getOperator(role), reason: settleReason }
              : action === 'cancel'
                ? { fact_id: factId, by: getOperator(role), reason: settleReason }
                : { subject_id: selectedSubjectId(settleMarketId), phase: 'fulltime', market_ids: [settleMarketId], by: getOperator(role), reason: settleReason }
        await apiPost<typeof body, unknown>(endpoint, body)
        await facts.refresh()
      },
    })
  }

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="盘口与结算" desc="管理赛事与盘口的暂停、恢复，以及赛果异常时的人工结算兜底。常规比赛由系统自动结算，人工仅处理异常。" />
      <DemoNotice scope="盘口与结算页面" />
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="待人工处理赛果"
          action={<ResourceState {...facts} onRefresh={() => void facts.refresh()} />}
        >
          <p className="mb-3 text-xs text-[var(--text-secondary)]">常规比赛由系统自动结算；下方仅列出需要人工兜底的赛果（让球派彩、系列赛定案、单一数据源待复核等）。</p>
          {facts.loading ? <SkeletonBlock rows={4} /> : <FactList facts={facts.data} onSelect={selectFact} />}
        </SectionCard>
        <SectionCard title="赛果结算处理">
          <div className="space-y-3">
            <Input label="盘口编号" value={settleMarketId} onChange={(event) => setSettleMarketId(event.target.value)} />
            <Input label="赛果记录编号" value={factId} onChange={(event) => setFactId(event.target.value)} />
            <Input label="胜出选项" value={settleWinner} onChange={(event) => setSettleWinner(event.target.value)} placeholder="留空表示作废/待定" />
            <Textarea label="派彩比例（让球/半赢，按选项填写比例，默认留空走系统规则）" value={payoutRatios} onChange={(event) => setPayoutRatios(event.target.value)} />
            <Textarea label="操作原因" value={settleReason} onChange={(event) => setSettleReason(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={!canResolve} loading={runningKey === 'oracle-resolve'} onClick={() => submitOracle('resolve')}>触发赛果判定</Button>
              <Button variant="secondary" disabled={!canResolve} loading={runningKey === 'oracle-phase'} onClick={() => submitOracle('phase')}>切换比赛阶段</Button>
              <Button disabled={!canFinalize} loading={runningKey === 'oracle-finalize'} onClick={() => submitOracle('finalize')}>管理员最终确认</Button>
              <Button variant="danger" disabled={!canFinalize} loading={runningKey === 'oracle-cancel'} onClick={() => submitOracle('cancel')}>作废本条赛果</Button>
            </div>
            {!canFinalize && <p className="text-xs text-[var(--text-secondary)]">最终确认和作废仅管理员可执行；运营可触发判定或切换阶段，风控只读复核。</p>}
          </div>
        </SectionCard>
      </div>
      {modal}
    </Guard>
  )
}

function localOracleAction(action: string) {
  return {
    resolve: '触发赛果判定',
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
  const records = useApiResource<RebateRecord[]>('/api/v1/admin/rebate/records?limit=200', mockRebateRecords)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(
    () =>
      records.data.filter(
        (record) =>
          (accountFilter.trim() === '' || String(record.account_id).includes(accountFilter.trim())) &&
          (statusFilter === '' || record.status === statusFilter),
      ),
    [records.data, accountFilter, statusFilter],
  )

  const totalRebate = useMemo(
    () => filtered.reduce((sum, record) => (record.status === 'reversed' ? sum : sum + Number(record.rebate_amount || 0)), 0),
    [filtered],
  )
  const uniqueUsers = useMemo(() => new Set(filtered.map((record) => record.account_id)).size, [filtered])

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'CS']}>
      <PageHeader title="返佣浏览" desc="按用户粒度查看返佣明细。本模块仅供浏览查询，不做规则配置或资金操作。" />
      <DemoNotice scope="返佣浏览页面" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="返佣总额（不含已追回）" value={`${formatNumber(totalRebate)} USDT`} source={records.mode} desc="当前筛选结果合计" />
        <MetricCard label="涉及用户数" value={uniqueUsers} source={records.mode} desc="当前筛选结果去重用户" />
        <MetricCard label="记录条数" value={filtered.length} source={records.mode} desc="当前筛选结果" />
      </div>
      <div className="mt-4">
        <SectionCard
          title="返佣明细"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Input label="按用户账户筛选" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} placeholder="输入账户编号" />
              <Select label="状态" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9">
                <option value="">全部</option>
                <option value="settled">已发放</option>
                <option value="pending">待发放</option>
                <option value="reversed">已追回</option>
              </Select>
              <ResourceState {...records} onRefresh={() => void records.refresh()} />
            </div>
          }
        >
          {records.loading ? (
            <SkeletonBlock rows={5} />
          ) : filtered.length === 0 ? (
            <EmptyState title="暂无返佣记录" desc="当前筛选条件没有匹配的返佣明细。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th scope="col" className="pb-3">用户</th>
                    <th scope="col" className="pb-3">盘口</th>
                    <th scope="col" className="pb-3">成交额</th>
                    <th scope="col" className="pb-3">返佣额</th>
                    <th scope="col" className="pb-3">比例</th>
                    <th scope="col" className="pb-3">状态</th>
                    <th scope="col" className="pb-3">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((record) => (
                    <tr key={record.id}>
                      <td className="py-3 font-medium">{record.username ?? record.account_id}<span className="ml-1 text-xs text-[var(--text-secondary)]">#{record.account_id}</span></td>
                      <td className="py-3 text-[var(--text-secondary)]">{record.market_title}</td>
                      <td className="py-3">{formatNumber(record.trade_volume)} {record.coin}</td>
                      <td className="py-3 font-semibold">{formatNumber(record.rebate_amount)} {record.coin}</td>
                      <td className="py-3">{(record.rate_bps / 100).toFixed(2)}%</td>
                      <td className="py-3"><Badge tone={record.status === 'settled' ? 'success' : record.status === 'reversed' ? 'danger' : 'warning'}>{localStatus(record.status)}</Badge></td>
                      <td className="py-3 text-[var(--text-secondary)]">{record.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--text-secondary)]">说明：返佣发放由系统在成交时触发，本表为只读浏览。用户粒度返佣查询接口尚未在本服务开放，当前可能为示例数据。</p>
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
  const [permissions, setPermissions] = useState<RolePermission[]>(mockRolePermissions)
  const canManagePermission = role === 'Admin'

  function toggleModule(targetRole: Role, moduleKey: string) {
    if (!canManagePermission) {
      return
    }
    setPermissions((current) =>
      current.map((item) =>
        item.role === targetRole
          ? {
              ...item,
              modules: item.modules.includes(moduleKey)
                ? item.modules.filter((key) => key !== moduleKey)
                : [...item.modules, moduleKey],
            }
          : item,
      ),
    )
  }

  return (
    <Guard role={role} allow={['Admin', 'Risk', 'SRE']}>
      <PageHeader title="权限与审计" desc="管理角色对各模块的访问权限，并查看不可篡改的操作日志。日志为只读，任何人都不能删除或修改。" />
      <DemoNotice scope="权限与审计页面" />
      <SectionCard
        title="角色权限管理"
        action={<Badge tone={canManagePermission ? 'accent' : 'neutral'}>{canManagePermission ? '可编辑（演示）' : '只读'}</Badge>}
      >
        <p className="mb-3 text-xs text-[var(--text-secondary)]">勾选表示该角色可访问对应模块。仅管理员可调整；当前为演示，修改仅保存在本页面。正式上线由服务端权限系统强制执行。</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-[var(--text-secondary)]">
              <tr>
                <th scope="col" className="pb-3 pr-4">角色</th>
                {navItems.map((nav) => (
                  <th key={nav.to} scope="col" className="pb-3 px-2 text-center font-medium">{nav.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {permissions.map((permission) => (
                <tr key={permission.role}>
                  <td className="py-3 pr-4 font-medium">{roleLabels[permission.role]}</td>
                  {navItems.map((nav) => {
                    const checked = permission.modules.includes(nav.to)
                    return (
                      <td key={nav.to} className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${roleLabels[permission.role]} 访问 ${nav.label}`}
                          checked={checked}
                          disabled={!canManagePermission}
                          onChange={() => toggleModule(permission.role, nav.to)}
                          className="h-4 w-4 accent-[#2DD4BF] disabled:opacity-40"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canManagePermission && <p className="mt-3 text-xs text-[var(--text-secondary)]">当前角色为只读，仅管理员可调整权限分配。</p>}
      </SectionCard>
      <div className="mt-4">
        <SectionCard title="操作日志" action={<Badge tone="neutral">只读 · 不可删改</Badge>}>
          <p className="mb-3 text-xs text-[var(--text-secondary)]">日志仅供审计查看，系统不提供删除或编辑入口。正式上线应记录操作人、IP、修改前后值、复核人与时间。</p>
          <AuditList logs={logs} />
        </SectionCard>
      </div>
    </Guard>
  )
}

function OperationalStatsPage({ role }: { role: Role }) {
  const events = useApiResource<EventStats[]>('/api/v1/admin/stats/events', mockEventStats)
  const [eventId, setEventId] = useState(mockEventStats[0].event_id)
  const [matchId, setMatchId] = useState<number | null>(null)

  const selectedEvent = events.data.find((event) => event.event_id === eventId) ?? events.data[0]
  const selectedMatch: MatchStats | null =
    selectedEvent?.match_stats.find((match) => match.match_id === matchId) ?? null

  return (
    <Guard role={role} allow={['Admin', 'Ops', 'Risk']}>
      <PageHeader title="运营数据" desc="按赛事 → 比赛 → 盘口逐级下钻查看成交额、成交量、成交率与拒单率等运营指标。" />
      <DemoNotice scope="运营数据页面" />

      <SectionCard title="赛事列表" action={<ResourceState {...events} onRefresh={() => void events.refresh()} />}>
        {events.loading ? (
          <SkeletonBlock rows={3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th scope="col" className="pb-3">赛事</th>
                  <th scope="col" className="pb-3">联赛</th>
                  <th scope="col" className="pb-3">比赛数</th>
                  <th scope="col" className="pb-3">盘口数</th>
                  <th scope="col" className="pb-3">成交额</th>
                  <th scope="col" className="pb-3">成交笔数</th>
                  <th scope="col" className="pb-3">成交率</th>
                  <th scope="col" className="pb-3">拒单率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {events.data.map((event) => (
                  <tr
                    key={event.event_id}
                    className={`cursor-pointer hover:bg-[var(--bg-control)] ${eventId === event.event_id ? 'bg-[#2DD4BF]/5' : ''}`}
                    onClick={() => {
                      setEventId(event.event_id)
                      setMatchId(null)
                    }}
                  >
                    <td className="py-3 font-medium">{event.event_name}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{event.league}</td>
                    <td className="py-3">{event.matches}</td>
                    <td className="py-3">{event.markets}</td>
                    <td className="py-3">{formatNumber(event.gmv_usd)} USDT</td>
                    <td className="py-3">{formatNumber(event.trades)}</td>
                    <td className="py-3">{formatPercent(event.fill_rate)}</td>
                    <td className="py-3">{formatPercent(event.reject_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedEvent && (
        <div className="mt-4">
          <SectionCard title={`比赛列表 · ${selectedEvent.event_name}`}>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <MetricCard label="赛事成交额" value={`${formatNumber(selectedEvent.gmv_usd)} USDT`} source={events.mode} />
              <MetricCard label="比赛数" value={selectedEvent.matches} source={events.mode} />
              <MetricCard label="成交率" value={formatPercent(selectedEvent.fill_rate)} source={events.mode} />
              <MetricCard label="拒单率" value={formatPercent(selectedEvent.reject_rate)} source={events.mode} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th scope="col" className="pb-3">比赛</th>
                    <th scope="col" className="pb-3">状态</th>
                    <th scope="col" className="pb-3">盘口数</th>
                    <th scope="col" className="pb-3">成交额</th>
                    <th scope="col" className="pb-3">成交笔数</th>
                    <th scope="col" className="pb-3">成交率</th>
                    <th scope="col" className="pb-3">拒单率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {selectedEvent.match_stats.map((match) => (
                    <tr
                      key={match.match_id}
                      className={`cursor-pointer hover:bg-[var(--bg-control)] ${matchId === match.match_id ? 'bg-[#2DD4BF]/5' : ''}`}
                      onClick={() => setMatchId(match.match_id)}
                    >
                      <td className="py-3 font-medium">{match.home} vs {match.away}</td>
                      <td className="py-3"><Badge tone={match.status === 'Live' ? 'accent' : 'neutral'}>{localStatus(match.status)}</Badge></td>
                      <td className="py-3">{match.markets}</td>
                      <td className="py-3">{formatNumber(match.gmv_usd)} USDT</td>
                      <td className="py-3">{formatNumber(match.trades)}</td>
                      <td className="py-3">{formatPercent(match.fill_rate)}</td>
                      <td className="py-3">{formatPercent(match.reject_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {selectedMatch && (
        <div className="mt-4">
          <SectionCard title={`盘口明细 · ${selectedMatch.home} vs ${selectedMatch.away}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th scope="col" className="pb-3">盘口</th>
                    <th scope="col" className="pb-3">状态</th>
                    <th scope="col" className="pb-3">成交额</th>
                    <th scope="col" className="pb-3">24h 成交量</th>
                    <th scope="col" className="pb-3">报价数</th>
                    <th scope="col" className="pb-3">成交笔数</th>
                    <th scope="col" className="pb-3">成交率</th>
                    <th scope="col" className="pb-3">拒单率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {selectedMatch.market_stats.map((market) => (
                    <tr key={market.market_id}>
                      <td className="py-3 font-medium">{market.market_title}</td>
                      <td className="py-3"><Badge tone={market.status === 'open' ? 'success' : 'warning'}>{localStatus(market.status)}</Badge></td>
                      <td className="py-3">{formatNumber(market.gmv_usd)} USDT</td>
                      <td className="py-3">{formatNumber(market.volume_24h_usd)} USDT</td>
                      <td className="py-3">{formatNumber(market.quotes)}</td>
                      <td className="py-3">{formatNumber(market.trades)}</td>
                      <td className="py-3">{formatPercent(market.fill_rate)}</td>
                      <td className="py-3">{formatPercent(market.reject_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">说明：按赛事/比赛/盘口聚合的运营统计接口尚未在本服务开放，当前可能为示例数据。</p>
          </SectionCard>
        </div>
      )}
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
