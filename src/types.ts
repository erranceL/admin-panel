export type Role = 'Admin' | 'CS' | 'Ops' | 'Risk' | 'SRE'

export type ApiMode = 'real' | 'mock'
export type ErrorKind = 'network' | 'http' | 'business' | 'timeout' | 'parse' | 'unknown'

export interface ApiState<T> {
  data: T
  mode: ApiMode
  isFallback: boolean
  loading: boolean
  error: string | null
  errorKind?: ErrorKind
  statusCode?: number
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
  provider_match_id?: string
  provider_market_id?: string
  scope?: string
  market_type?: string
  question_title?: string
  resolution_rule?: string
  outcomes?: RfqOutcome[]
}

export interface RfqOutcome {
  outcome_id: string
  label: string
  implied_probability?: string
  share_price?: string
  display_decimal_odds?: string
  volume_24h?: string
  price_change_24h?: string
  status?: string
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

export interface PolymarketTeam {
  id: number
  name: string
  league_code?: string
  external_name?: string
  mapped?: boolean
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
  before_value?: string
  after_value?: string
  reason?: string
}

export interface RebateRecord {
  id: string
  account_id: number
  username?: string
  coin: string
  trade_id: string
  market_title: string
  trade_volume: string
  rebate_amount: string
  rate_bps: number
  status: 'settled' | 'pending' | 'reversed'
  created_at: string
}

export interface MarketStats {
  market_id: string
  market_title: string
  status: string
  gmv_usd: string
  volume_24h_usd: string
  quotes: number
  trades: number
  fill_rate: number
  reject_rate: number
}

export interface MatchStats {
  match_id: number
  home: string
  away: string
  status: string
  gmv_usd: string
  markets: number
  trades: number
  fill_rate: number
  reject_rate: number
  market_stats: MarketStats[]
}

export interface EventStats {
  event_id: string
  event_name: string
  league: string
  matches: number
  markets: number
  gmv_usd: string
  trades: number
  fill_rate: number
  reject_rate: number
  match_stats: MatchStats[]
}

export interface RolePermission {
  role: Role
  modules: string[]
}

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}
