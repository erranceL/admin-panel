import type {
  AuditLogItem,
  DistributorConfig,
  OracleFact,
  PolymarketHealth,
  PolymarketQueueItem,
  PolymarketTeam,
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
    home: '曼城',
    away: '阿森纳',
    home_goals: 1,
    away_goals: 1,
    elapsed: 67,
    league_name: '英超',
    volume_24h_usd: '284321.10',
  },
  {
    id: 1001102,
    status: 'Scheduled',
    kickoff_at: '2026-05-28T19:00:00Z',
    home: '皇家马德里',
    away: '巴塞罗那',
    home_goals: 0,
    away_goals: 0,
    league_name: '西甲',
    volume_24h_usd: '391008.56',
  },
  {
    id: 1001103,
    status: 'Halftime',
    kickoff_at: '2026-05-28T11:30:00Z',
    home: '拜仁慕尼黑',
    away: '多特蒙德',
    home_goals: 2,
    away_goals: 0,
    elapsed: 45,
    league_name: '德甲',
    volume_24h_usd: '156700.88',
  },
]

export const mockMarkets: RfqMarket[] = [
  {
    market_id: 'rfq:match:1001101:1x2',
    market_title: '全场胜平负',
    subject_label: '曼城 vs 阿森纳',
    status: 'open',
    provider_id: 'sig-mock',
    provider_match_id: '1001101',
    market_type: '1x2',
    resolution_rule: '全场常规时间胜平负',
    outcomes: [
      { outcome_id: 'home', label: '主胜', display_decimal_odds: '2.12', implied_probability: '0.4717', status: 'open' },
      { outcome_id: 'draw', label: '平局', display_decimal_odds: '3.34', implied_probability: '0.2994', status: 'open' },
      { outcome_id: 'away', label: '客胜', display_decimal_odds: '3.05', implied_probability: '0.3278', status: 'open' },
    ],
  },
  {
    market_id: 'rfq:match:1001101:total25',
    market_title: '全场大小球 2.5',
    subject_label: '曼城 vs 阿森纳',
    status: 'paused',
    provider_id: 'api-football',
    provider_match_id: '1001101',
    market_type: 'total_goals',
    resolution_rule: '全场总进球大/小 2.5',
    outcomes: [
      { outcome_id: 'over', label: '大于 2.5', display_decimal_odds: '1.88', implied_probability: '0.5319', status: 'open' },
      { outcome_id: 'under', label: '小于 2.5', display_decimal_odds: '1.96', implied_probability: '0.5102', status: 'open' },
    ],
  },
  {
    market_id: 'rfq:futures:epl:champion',
    market_title: '英超冠军',
    subject_label: '英超 2026',
    status: 'open',
    provider_id: 'polymarket-ref',
    provider_match_id: 'epl-2026',
    market_type: 'futures',
    resolution_rule: '官方联赛冠军归属',
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
    reason: '等待全场结束确认',
    status: 'proposed',
    proposed_at: '2026-05-28T12:58:00Z',
    dispute_deadline: '2026-05-28T13:08:00Z',
  },
  {
    fact_id: 'fact_9b02',
    market_id: 'rfq:match:1001103:total25',
    winner: 'over',
    sources: ['match_fact'],
    disputes: ['比分牌不一致'],
    single_source: true,
    reason: '仅单一数据源，需运营复核',
    status: 'disputed',
    proposed_at: '2026-05-28T12:18:00Z',
  },
  {
    fact_id: 'fact_9b03',
    market_id: 'rfq:futures:epl:champion',
    winner: 'void',
    sources: ['manual_ops'],
    single_source: true,
    reason: '赛事状态发生变化',
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
    title: '曼城 vs 阿森纳 · 参考盘口',
    league_code: 'EPL',
    created_at: '2026-05-28T12:49:00Z',
  },
  {
    id: 702,
    layer: 'team',
    status: 'candidate',
    title: '国际米兰 · 球队匹配建议',
    league_code: 'UCL',
    created_at: '2026-05-28T11:42:00Z',
  },
  {
    id: 703,
    layer: 'event',
    status: 'rejected',
    title: '重复的赛事匹配建议',
    league_code: 'MLS',
    created_at: '2026-05-28T10:30:00Z',
  },
]

export const mockUnmappedTeams: PolymarketTeam[] = [
  { id: 9001, name: '国际米兰', league_code: '欧冠', external_name: 'FC Internazionale' },
  { id: 9002, name: '曼联', league_code: '英超', external_name: 'Man United' },
  { id: 9003, name: '拜仁慕尼黑', league_code: '欧冠', external_name: 'FC Bayern' },
]

export const mockTeamPool: PolymarketTeam[] = [
  { id: 3001, name: 'Inter Milan', league_code: '欧冠', mapped: false },
  { id: 3002, name: 'Manchester United FC', league_code: '英超', mapped: false },
  { id: 3003, name: 'FC Bayern Munich', league_code: '欧冠', mapped: false },
]

export const mockDistributors: DistributorConfig[] = [
  {
    id: 'dist_asia_01',
    name: '亚洲合作方 A',
    status: 'active',
    markup_bps: 120,
    settlement_mode: '预付费余额',
    today_volume: '82,441 USDT',
    risk_note: '用户端最高加价 2.5%，需每周复核',
  },
  {
    id: 'dist_latam_02',
    name: '拉美合作方 B',
    status: 'active',
    markup_bps: 80,
    settlement_mode: '日结轧差',
    today_volume: '31,904 USDT',
    risk_note: '低风险，当前无未处理争议',
  },
  {
    id: 'dist_trial_03',
    name: '试运行分销商',
    status: 'paused',
    markup_bps: 150,
    settlement_mode: '人工结算',
    today_volume: '0 USDT',
    risk_note: '已暂停，等待更换接口密钥',
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
