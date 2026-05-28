import type {
  AuditLogItem,
  DistributorConfig,
  OracleFact,
  PolymarketHealth,
  PolymarketQueueItem,
  RfqMatch,
  RfqMarket,
  StatsOverview,
} from '../types'

export const mockStats: StatsOverview = {
  live_events: 12,
  total_markets: 428,
  volume_24h_usd: '1284632.42',
}

export const mockMatches: RfqMatch[] = [
  {
    id: 1001101,
    status: 'Live',
    kickoff_at: '2026-05-28T12:00:00Z',
    home: 'Manchester City',
    away: 'Arsenal',
    home_goals: 1,
    away_goals: 1,
    elapsed: 67,
    league_name: 'Premier League',
    volume_24h_usd: '284321.10',
  },
  {
    id: 1001102,
    status: 'Scheduled',
    kickoff_at: '2026-05-28T19:00:00Z',
    home: 'Real Madrid',
    away: 'Barcelona',
    home_goals: 0,
    away_goals: 0,
    league_name: 'La Liga',
    volume_24h_usd: '391008.56',
  },
  {
    id: 1001103,
    status: 'Halftime',
    kickoff_at: '2026-05-28T11:30:00Z',
    home: 'Bayern Munich',
    away: 'Dortmund',
    home_goals: 2,
    away_goals: 0,
    elapsed: 45,
    league_name: 'Bundesliga',
    volume_24h_usd: '156700.88',
  },
]

export const mockMarkets: RfqMarket[] = [
  {
    market_id: 'rfq:match:1001101:1x2',
    market_title: 'Full Time Result',
    subject_label: 'Manchester City vs Arsenal',
    status: 'open',
    provider_id: 'sig-mock',
  },
  {
    market_id: 'rfq:match:1001101:total25',
    market_title: 'Total Goals Over/Under 2.5',
    subject_label: 'Manchester City vs Arsenal',
    status: 'paused',
    provider_id: 'api-football',
  },
  {
    market_id: 'rfq:futures:epl:champion',
    market_title: 'Premier League Champion',
    subject_label: 'Premier League 2026',
    status: 'open',
    provider_id: 'polymarket-ref',
  },
]

export const mockFacts: OracleFact[] = [
  {
    fact_id: 'fact_9b01',
    market_id: 'rfq:match:1001101:1x2',
    winner: '',
    sources: ['match_fact', 'api_football'],
    disputes: [],
    single_source: false,
    reason: 'Waiting for full-time confirmation',
    status: 'proposed',
    proposed_at: '2026-05-28T12:58:00Z',
    dispute_deadline: '2026-05-28T13:08:00Z',
  },
  {
    fact_id: 'fact_9b02',
    market_id: 'rfq:match:1001103:total25',
    winner: 'over',
    sources: ['match_fact'],
    disputes: ['scoreboard mismatch'],
    single_source: true,
    reason: 'Single source requires ops review',
    status: 'disputed',
    proposed_at: '2026-05-28T12:18:00Z',
  },
  {
    fact_id: 'fact_9b03',
    market_id: 'rfq:futures:epl:champion',
    winner: 'void',
    sources: ['manual_ops'],
    single_source: true,
    reason: 'Competition state changed',
    status: 'finalized',
    finalized_at: '2026-05-28T09:12:00Z',
  },
]

export const mockPolymarketHealth: PolymarketHealth = {
  status: 'degraded',
  fallback_enabled: true,
  last_sync_at: '2026-05-28T12:55:18Z',
  queue_depth: 18,
  unmapped_teams: 6,
}

export const mockPolymarketQueue: PolymarketQueueItem[] = [
  {
    id: 701,
    layer: 'market',
    status: 'candidate',
    title: 'Manchester City vs Arsenal reference market',
    league_code: 'EPL',
    created_at: '2026-05-28T12:49:00Z',
  },
  {
    id: 702,
    layer: 'team',
    status: 'candidate',
    title: 'FC Internazionale mapping candidate',
    league_code: 'UCL',
    created_at: '2026-05-28T11:42:00Z',
  },
  {
    id: 703,
    layer: 'event',
    status: 'rejected',
    title: 'Duplicate fixture candidate',
    league_code: 'MLS',
    created_at: '2026-05-28T10:30:00Z',
  },
]

export const mockDistributors: DistributorConfig[] = [
  {
    id: 'dist_asia_01',
    name: 'Asia Partner A',
    status: 'active',
    markup_bps: 120,
    settlement_mode: 'prepaid balance',
    today_volume: '82,441 USDT',
    risk_note: 'Max user markup 2.5%, require weekly review',
  },
  {
    id: 'dist_latam_02',
    name: 'LatAm Partner B',
    status: 'active',
    markup_bps: 80,
    settlement_mode: 'daily netting',
    today_volume: '31,904 USDT',
    risk_note: 'Low risk, no open dispute',
  },
  {
    id: 'dist_trial_03',
    name: 'Trial Distributor',
    status: 'paused',
    markup_bps: 150,
    settlement_mode: 'manual settlement',
    today_volume: '0 USDT',
    risk_note: 'Paused until API key rotation',
  },
]

export const mockAuditLogs: AuditLogItem[] = [
  {
    id: 'audit_001',
    actor: 'Ops',
    action: 'pause_market',
    target: 'rfq:match:1001101:total25',
    result: 'success',
    created_at: '2026-05-28T12:58:21Z',
  },
  {
    id: 'audit_002',
    actor: 'Risk',
    action: 'update_distributor_markup',
    target: 'dist_asia_01',
    result: 'pending second review',
    created_at: '2026-05-28T12:44:10Z',
  },
  {
    id: 'audit_003',
    actor: 'SRE',
    action: 'enable_polymarket_fallback',
    target: 'polymarket-ref',
    result: 'success',
    created_at: '2026-05-28T12:15:07Z',
  },
]
