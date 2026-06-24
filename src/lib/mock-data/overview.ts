export type OverviewRoleView = 'management' | 'operations' | 'supply-chain' | 'finance';
export type OverviewTimeRange = 'today' | '7d' | '30d';
export type OverviewChannel = 'all' | 'amazon' | 'shopify' | 'tiktok' | 'walmart';

export type OverviewOption<T extends string> = {
  value: T;
  label: string;
};

export type OverviewKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  comparisonLabel: string;
  sparkline: number[];
  channels: OverviewChannel[];
  roles: OverviewRoleView[];
};

export type OverviewTrendPoint = {
  label: string;
  gmv: number;
  orders: number;
};

export type OverviewChannelMetric = {
  channel: Exclude<OverviewChannel, 'all'>;
  label: string;
  gmv: string;
  gmvValue: number;
  orders: string;
  ordersValue: number;
  refundRate: string;
  stockCoverageDays: string;
  settlementDays: string;
  riskLabel: string;
  focus: string;
};

export type OverviewInventoryHealth = {
  coverageDays: string;
  coverageProgress: number;
  coverageTargetLabel: string;
  replenishmentPressure: number;
  replenishmentLabel: string;
  slowMovingPressure: number;
  slowMovingLabel: string;
  healthySkuRatio: number;
  healthySkuLabel: string;
};

export type OverviewPriorityItem = {
  id: string;
  title: string;
  status: string;
  meta: string;
  channels: OverviewChannel[];
  roles: OverviewRoleView[];
};

export type OverviewFulfillmentMetric = {
  channel: OverviewChannel;
  slaRate: number;
  delayedOrders: number;
  avgShipHours: number;
  backlog: number[];
  stageBreakdown: {
    picking: number;
    packing: number;
    shipping: number;
  };
};

export type OverviewRefundMetric = {
  channel: OverviewChannel;
  refundRate: number;
  refundAmount: string;
  refundAmountValue: number;
  ticketCount: number;
  trend: number[];
  reasons: {
    label: string;
    value: number;
    tone: 'primary' | 'success' | 'warning' | 'danger';
  }[];
};

export type OverviewFinanceMetric = {
  channel: OverviewChannel;
  pendingSettlement: string;
  pendingSettlementValue: number;
  confirmedSettlement: string;
  confirmedSettlementValue: number;
  feeDeduction: string;
  feeDeductionValue: number;
  payoutRisk: number;
  cashInTrend: number[];
  settlementStatus: {
    confirmed: number;
    pending: number;
    exception: number;
  };
};

export type OverviewRoleConfig = {
  highlightedKpis: string[];
};

export const overviewFilterOptions: {
  timeRanges: OverviewOption<OverviewTimeRange>[];
  channels: OverviewOption<OverviewChannel>[];
  roleViews: OverviewOption<OverviewRoleView>[];
} = {
  timeRanges: [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' }
  ],
  channels: [
    { value: 'all', label: 'All channels' },
    { value: 'amazon', label: 'Amazon' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'walmart', label: 'Walmart' }
  ],
  roleViews: [
    { value: 'management', label: '管理层' },
    { value: 'operations', label: '运营' },
    { value: 'supply-chain', label: '供应链' },
    { value: 'finance', label: '财务' }
  ]
};

export const overviewKpis: OverviewKpi[] = [
  {
    id: 'gmv',
    label: 'GMV',
    value: '$842.6k',
    delta: '+12.4%',
    trend: 'up',
    comparisonLabel: 'vs 上周期均值',
    sparkline: [42, 45, 44, 48, 52, 50, 57],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'operations', 'finance']
  },
  {
    id: 'orders',
    label: '订单量',
    value: '18,420',
    delta: '+8.9%',
    trend: 'up',
    comparisonLabel: 'Shopify 占比最高',
    sparkline: [38, 40, 41, 39, 45, 47, 49],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'operations']
  },
  {
    id: 'stock-risk',
    label: '缺货风险 SKU',
    value: '37',
    delta: '+9',
    trend: 'down',
    comparisonLabel: '12 个 SKU 低于安全库存',
    sparkline: [14, 16, 18, 20, 24, 30, 37],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'operations', 'supply-chain']
  },
  {
    id: 'refund-risk',
    label: '退款/取消金额',
    value: '$46.3k',
    delta: '+3.2%',
    trend: 'down',
    comparisonLabel: 'TikTok 个护类拉高风险',
    sparkline: [18, 19, 21, 20, 24, 27, 29],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'operations', 'finance']
  },
  {
    id: 'settlement',
    label: '待确认回款',
    value: '$128.4k',
    delta: '+1.8%',
    trend: 'neutral',
    comparisonLabel: 'Walmart 账期需复核',
    sparkline: [26, 25, 26, 28, 27, 29, 29],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'finance']
  },
  {
    id: 'replenishment',
    label: '建议补货 SKU',
    value: '24',
    delta: '+5',
    trend: 'neutral',
    comparisonLabel: 'Amazon 与 TikTok 优先级最高',
    sparkline: [9, 10, 11, 13, 16, 20, 24],
    channels: ['all', 'amazon', 'shopify', 'tiktok', 'walmart'],
    roles: ['management', 'supply-chain']
  }
];

export const overviewSalesTrend: Record<OverviewTimeRange, OverviewTrendPoint[]> = {
  today: [
    { label: '00', gmv: 18, orders: 64 },
    { label: '04', gmv: 12, orders: 42 },
    { label: '08', gmv: 34, orders: 118 },
    { label: '12', gmv: 56, orders: 184 },
    { label: '16', gmv: 72, orders: 236 },
    { label: '20', gmv: 61, orders: 201 },
    { label: '24', gmv: 47, orders: 159 }
  ],
  '7d': [
    { label: 'Mon', gmv: 84, orders: 268 },
    { label: 'Tue', gmv: 79, orders: 251 },
    { label: 'Wed', gmv: 92, orders: 287 },
    { label: 'Thu', gmv: 88, orders: 274 },
    { label: 'Fri', gmv: 106, orders: 315 },
    { label: 'Sat', gmv: 118, orders: 341 },
    { label: 'Sun', gmv: 112, orders: 326 }
  ],
  '30d': [
    { label: 'W1', gmv: 362, orders: 1080 },
    { label: 'W2', gmv: 388, orders: 1144 },
    { label: 'W3', gmv: 402, orders: 1208 },
    { label: 'W4', gmv: 436, orders: 1276 },
    { label: 'W5', gmv: 452, orders: 1338 },
    { label: 'W6', gmv: 468, orders: 1382 },
    { label: 'W7', gmv: 494, orders: 1440 }
  ]
};

export const overviewChannelPerformance: OverviewChannelMetric[] = [
  {
    channel: 'amazon',
    label: 'Amazon',
    gmv: '$268.4k',
    gmvValue: 268.4,
    orders: '4,820',
    ordersValue: 4820,
    refundRate: '2.1%',
    stockCoverageDays: '9 天',
    settlementDays: '11 天',
    riskLabel: '补货压力高',
    focus: '销量强，但头部 SKU 需要提前补货'
  },
  {
    channel: 'shopify',
    label: 'Shopify',
    gmv: '$236.7k',
    gmvValue: 236.7,
    orders: '5,940',
    ordersValue: 5940,
    refundRate: '1.4%',
    stockCoverageDays: '18 天',
    settlementDays: '3 天',
    riskLabel: '滞销压力高',
    focus: '订单稳定，适合做促销清库存'
  },
  {
    channel: 'tiktok',
    label: 'TikTok',
    gmv: '$182.9k',
    gmvValue: 182.9,
    orders: '4,160',
    ordersValue: 4160,
    refundRate: '3.6%',
    stockCoverageDays: '7 天',
    settlementDays: '8 天',
    riskLabel: '退款风险高',
    focus: '增长最快，但履约和退款压力上升'
  },
  {
    channel: 'walmart',
    label: 'Walmart',
    gmv: '$154.6k',
    gmvValue: 154.6,
    orders: '3,500',
    ordersValue: 3500,
    refundRate: '1.9%',
    stockCoverageDays: '14 天',
    settlementDays: '14 天',
    riskLabel: '回款需关注',
    focus: '库存健康，但账期节奏要盯紧'
  }
];

export const overviewInventoryHealth: OverviewInventoryHealth = {
  coverageDays: '12.6 天',
  coverageProgress: 68,
  coverageTargetLabel: '目标 14 天',
  replenishmentPressure: 74,
  replenishmentLabel: '24 个 SKU 需要补货',
  slowMovingPressure: 41,
  slowMovingLabel: '19 个 SKU 滞销偏高',
  healthySkuRatio: 72,
  healthySkuLabel: '72% SKU 处于健康区间'
};

export const overviewFulfillmentEfficiency: OverviewFulfillmentMetric[] = [
  {
    channel: 'all',
    slaRate: 92,
    delayedOrders: 286,
    avgShipHours: 17.4,
    backlog: [42, 47, 39, 58, 61, 54, 49],
    stageBreakdown: {
      picking: 78,
      packing: 64,
      shipping: 57
    }
  },
  {
    channel: 'amazon',
    slaRate: 89,
    delayedOrders: 118,
    avgShipHours: 19.6,
    backlog: [18, 22, 19, 24, 27, 23, 21],
    stageBreakdown: {
      picking: 74,
      packing: 61,
      shipping: 52
    }
  },
  {
    channel: 'shopify',
    slaRate: 95,
    delayedOrders: 42,
    avgShipHours: 12.8,
    backlog: [9, 8, 10, 11, 12, 10, 9],
    stageBreakdown: {
      picking: 84,
      packing: 72,
      shipping: 69
    }
  },
  {
    channel: 'tiktok',
    slaRate: 87,
    delayedOrders: 96,
    avgShipHours: 21.2,
    backlog: [12, 15, 14, 18, 20, 19, 17],
    stageBreakdown: {
      picking: 68,
      packing: 58,
      shipping: 49
    }
  },
  {
    channel: 'walmart',
    slaRate: 94,
    delayedOrders: 30,
    avgShipHours: 13.7,
    backlog: [6, 7, 5, 7, 8, 7, 6],
    stageBreakdown: {
      picking: 82,
      packing: 70,
      shipping: 66
    }
  }
];

export const overviewRefundAfterSales: OverviewRefundMetric[] = [
  {
    channel: 'all',
    refundRate: 2.4,
    refundAmount: '$46.3k',
    refundAmountValue: 46.3,
    ticketCount: 182,
    trend: [12, 14, 15, 13, 17, 19, 18],
    reasons: [
      { label: '质量', value: 34, tone: 'danger' },
      { label: '物流', value: 26, tone: 'warning' },
      { label: '描述不符', value: 22, tone: 'primary' },
      { label: '其他', value: 18, tone: 'success' }
    ]
  },
  {
    channel: 'amazon',
    refundRate: 2.1,
    refundAmount: '$12.4k',
    refundAmountValue: 12.4,
    ticketCount: 46,
    trend: [3, 4, 4, 5, 6, 5, 6],
    reasons: [
      { label: '质量', value: 31, tone: 'danger' },
      { label: '物流', value: 28, tone: 'warning' },
      { label: '描述不符', value: 21, tone: 'primary' },
      { label: '其他', value: 20, tone: 'success' }
    ]
  },
  {
    channel: 'shopify',
    refundRate: 1.4,
    refundAmount: '$8.2k',
    refundAmountValue: 8.2,
    ticketCount: 28,
    trend: [2, 2, 3, 2, 3, 3, 2],
    reasons: [
      { label: '质量', value: 25, tone: 'danger' },
      { label: '物流', value: 18, tone: 'warning' },
      { label: '描述不符', value: 20, tone: 'primary' },
      { label: '其他', value: 37, tone: 'success' }
    ]
  },
  {
    channel: 'tiktok',
    refundRate: 3.6,
    refundAmount: '$17.1k',
    refundAmountValue: 17.1,
    ticketCount: 74,
    trend: [4, 5, 6, 6, 7, 9, 8],
    reasons: [
      { label: '质量', value: 38, tone: 'danger' },
      { label: '物流', value: 19, tone: 'warning' },
      { label: '描述不符', value: 29, tone: 'primary' },
      { label: '其他', value: 14, tone: 'success' }
    ]
  },
  {
    channel: 'walmart',
    refundRate: 1.9,
    refundAmount: '$8.6k',
    refundAmountValue: 8.6,
    ticketCount: 34,
    trend: [2, 3, 2, 3, 4, 3, 4],
    reasons: [
      { label: '质量', value: 27, tone: 'danger' },
      { label: '物流', value: 22, tone: 'warning' },
      { label: '描述不符', value: 18, tone: 'primary' },
      { label: '其他', value: 33, tone: 'success' }
    ]
  }
];

export const overviewFinanceSettlement: OverviewFinanceMetric[] = [
  {
    channel: 'all',
    pendingSettlement: '$128.4k',
    pendingSettlementValue: 128.4,
    confirmedSettlement: '$684.2k',
    confirmedSettlementValue: 684.2,
    feeDeduction: '$32.6k',
    feeDeductionValue: 32.6,
    payoutRisk: 36,
    cashInTrend: [42, 44, 43, 46, 48, 49, 51],
    settlementStatus: {
      confirmed: 74,
      pending: 21,
      exception: 5
    }
  },
  {
    channel: 'amazon',
    pendingSettlement: '$38.1k',
    pendingSettlementValue: 38.1,
    confirmedSettlement: '$214.6k',
    confirmedSettlementValue: 214.6,
    feeDeduction: '$11.4k',
    feeDeductionValue: 11.4,
    payoutRisk: 42,
    cashInTrend: [11, 12, 11, 13, 14, 14, 15],
    settlementStatus: {
      confirmed: 68,
      pending: 25,
      exception: 7
    }
  },
  {
    channel: 'shopify',
    pendingSettlement: '$12.8k',
    pendingSettlementValue: 12.8,
    confirmedSettlement: '$198.4k',
    confirmedSettlementValue: 198.4,
    feeDeduction: '$6.2k',
    feeDeductionValue: 6.2,
    payoutRisk: 18,
    cashInTrend: [10, 11, 12, 12, 13, 13, 14],
    settlementStatus: {
      confirmed: 82,
      pending: 14,
      exception: 4
    }
  },
  {
    channel: 'tiktok',
    pendingSettlement: '$29.7k',
    pendingSettlementValue: 29.7,
    confirmedSettlement: '$146.3k',
    confirmedSettlementValue: 146.3,
    feeDeduction: '$8.9k',
    feeDeductionValue: 8.9,
    payoutRisk: 39,
    cashInTrend: [8, 9, 8, 10, 11, 12, 11],
    settlementStatus: {
      confirmed: 71,
      pending: 22,
      exception: 7
    }
  },
  {
    channel: 'walmart',
    pendingSettlement: '$47.8k',
    pendingSettlementValue: 47.8,
    confirmedSettlement: '$124.9k',
    confirmedSettlementValue: 124.9,
    feeDeduction: '$6.1k',
    feeDeductionValue: 6.1,
    payoutRisk: 45,
    cashInTrend: [7, 7, 8, 8, 9, 10, 11],
    settlementStatus: {
      confirmed: 63,
      pending: 30,
      exception: 7
    }
  }
];

export const overviewTodayFocus: OverviewPriorityItem[] = [
  {
    id: 'focus-1',
    title: '286 单接近发货 SLA 红线',
    status: 'Delayed',
    meta: 'Amazon / TikTok · 运营优先级 P1',
    channels: ['all', 'amazon', 'tiktok'],
    roles: ['management', 'operations']
  },
  {
    id: 'focus-2',
    title: '库存同步异常影响 8 个 SKU',
    status: 'Blocked',
    meta: 'Shopify / Walmart · 存在超卖风险',
    channels: ['all', 'shopify', 'walmart'],
    roles: ['operations', 'supply-chain']
  },
  {
    id: 'focus-3',
    title: 'Walmart 待确认回款需要复核',
    status: 'Pending',
    meta: '财务 · 今日 17:00 前',
    channels: ['all', 'walmart'],
    roles: ['finance', 'management']
  },
  {
    id: 'focus-4',
    title: 'TikTok 个护类退款率连续上升',
    status: 'Exception',
    meta: '退款率 3.6% · 高于目标 1.4pp',
    channels: ['all', 'tiktok'],
    roles: ['management', 'operations', 'finance']
  }
];

export const overviewRecommendedActions: OverviewPriorityItem[] = [
  {
    id: 'action-1',
    title: '提高 Amazon 爆款补货优先级',
    status: 'Review',
    meta: '预计减少 11% 缺货损失',
    channels: ['all', 'amazon'],
    roles: ['management', 'supply-chain']
  },
  {
    id: 'action-2',
    title: 'Shopify 家居 SKU 发起 bundle 活动',
    status: 'Scheduled',
    meta: '预计释放库存资金 $24k',
    channels: ['all', 'shopify'],
    roles: ['management', 'finance', 'operations']
  },
  {
    id: 'action-3',
    title: '复查 TikTok 高退款商品的内容承诺',
    status: 'Exception',
    meta: '预计降低退款率 0.8pp',
    channels: ['all', 'tiktok'],
    roles: ['operations', 'finance']
  },
  {
    id: 'action-4',
    title: '确认 3 个补货批次 ETA 并同步运营',
    status: 'Pending',
    meta: '供应链 · 今日 14:00 前',
    channels: ['all', 'amazon'],
    roles: ['operations', 'supply-chain']
  }
];

export const overviewRoleConfig: Record<OverviewRoleView, OverviewRoleConfig> = {
  management: {
    highlightedKpis: ['gmv', 'orders', 'stock-risk', 'settlement']
  },
  operations: {
    highlightedKpis: ['orders', 'stock-risk', 'refund-risk', 'gmv']
  },
  'supply-chain': {
    highlightedKpis: ['stock-risk', 'replenishment', 'orders', 'gmv']
  },
  finance: {
    highlightedKpis: ['gmv', 'refund-risk', 'settlement', 'stock-risk']
  }
};
