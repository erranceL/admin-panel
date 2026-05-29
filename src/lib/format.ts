import type { Role } from '../types'

export const roleLabels: Record<Role, string> = {
  Admin: '管理员',
  CS: '客服',
  Ops: '运营',
  Risk: '风控',
  SRE: '基础设施运维',
}

export function formatNumber(value: string | number | undefined) {
  if (value === undefined || value === '') {
    return '-'
  }
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return String(value)
  }
  return parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function localStatus(value: string | undefined) {
  const map: Record<string, string> = {
    Live: '进行中',
    Scheduled: '未开始',
    Halftime: '中场',
    Ended: '已结束',
    open: '开盘中',
    paused: '已暂停',
    finalized: '已最终确认',
    disputed: '争议中',
    proposed: '待确认',
    candidate: '待审核',
    rejected: '已拒绝',
    active: '启用',
    degraded: '部分异常',
    enabled: '已开启',
    disabled: '已关闭',
    pause: '暂停',
    resume: '恢复',
    settle: '结算',
    market: '盘口',
    event: '赛事',
    team: '球队',
    success: '成功',
    'pending second review': '待二次复核',
    'local demo only': '仅本地演示',
    settled: '已发放',
    pending: '待发放',
    reversed: '已追回',
  }
  return value ? map[value] ?? value : '-'
}

export function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return '-'
  }
  return `${(value * 100).toFixed(1)}%`
}

export function getOperator(role: Role) {
  return `${roleLabels[role]}演示账号`
}
