import type { Role } from '../types'

export const roleLabels: Record<Role, string> = {
  Admin: '管理员',
  CS: '客服',
  Ops: '运营',
  Risk: '风控',
  SRE: 'SRE',
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
    open: '开放',
    paused: '暂停',
    finalized: '已终局',
    disputed: '争议中',
    proposed: '待确认',
    candidate: '候选',
    rejected: '已拒绝',
    active: '启用',
    degraded: '降级',
    enabled: '已开启',
    disabled: '已关闭',
  }
  return value ? map[value] ?? value : '-'
}

export function getOperator(role: Role) {
  return `${roleLabels[role]}演示账号`
}
