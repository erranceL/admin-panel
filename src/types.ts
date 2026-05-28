export type Role = 'Admin' | 'CS' | 'Ops' | 'Risk' | 'SRE'

export type ApiMode = 'real' | 'mock'

export interface ApiState<T> {
  data: T
  mode: ApiMode
  loading: boolean
  error: string | null
}

export interface StatsOverview {
  live_events: number
  total_markets: number
  volume_24h_usd: string
}

export interface Balance {
  account_id: number
  coin: string
  available?: string
  frozen?: string
  total?: string
  balance?: string
}

export interface OracleFact {
  fact_id: string
  market_id: string
  winner: string
  sources: string[]
  disputes?: string[]
  single_source: boolean
  reason?: string
  status: string
  proposed_at?: string
  committed_at?: string
  dispute_deadline?: string
  finalized_at?: string
}

export interface RfqMatch {
  id: number
  status: string
  kickoff_at: string
  home: string
  away: string
  home_goals: number
  away_goals: number
  elapsed?: number
  league_name?: string
  volume_24h_usd?: string
}

export interface RfqMarket {
  market_id: string
  market_title: string
  subject_label: string
  status: string
  provider_id: string
  close_at?: string
}

export interface PolymarketQueueItem {
  id: number
  layer: string
  status: string
  title: string
  league_code?: string
  created_at?: string
}

export interface PolymarketHealth {
  status?: string
  fallback_enabled?: boolean
  last_sync_at?: string
  queue_depth?: number
  unmapped_teams?: number
}

export interface DistributorConfig {
  id: string
  name: string
  status: 'active' | 'paused'
  markup_bps: number
  settlement_mode: string
  today_volume: string
  risk_note: string
}

export interface AuditLogItem {
  id: string
  actor: Role | string
  action: string
  target: string
  result: string
  created_at: string
}
