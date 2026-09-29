// 财务报表 mock 数据

// ─── 时间维度 ─────────────────────────────────────────────────────────────────

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

/** 收入 / 利润趋势数据点 */
export type TrendPoint = {
  label: string;        // X轴标签：日期/周/月
  revenue: number;      // 总收入
  productRevenue: number;
  shippingRevenue: number;
  totalCost: number;    // 总成本
  grossProfit: number;  // 毛利润 (Revenue - COGS)
  contribution: number; // 贡献毛利 (含所有变动成本)
  orderCount: number;
};

/** 渠道利润数据 */
export type ChannelProfit = {
  channel: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;      // 利润率 %
  orderCount: number;
  trend: 'up' | 'down' | 'neutral';
  trendPct: number;
};

/** SKU 利润排行 */
export type SkuProfit = {
  rank: number;
  sku: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  soldQty: number;
};

/** 客户利润排行 */
export type CustomerProfit = {
  rank: number;
  name: string;
  revenue: number;
  profit: number;
  margin: number;
  orderCount: number;
};

/** 报表汇总 KPI */
export type ReportKpi = {
  totalRevenue: number;
  grossProfit: number;
  grossMargin: number;       // %
  contributionMargin: number;
  contributionMarginRate: number; // %
  totalOrders: number;
  avgOrderValue: number;
  totalCost: number;
  currency: string;
  // 环比
  revenueDelta: number;
  profitDelta: number;
};

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

/** 月度趋势（最近 6 个月） */
export const monthlyTrend: TrendPoint[] = [
  { label: '4月', revenue: 168420, productRevenue: 148200, shippingRevenue: 20220, totalCost: 112600, grossProfit: 55820, contribution: 42300, orderCount: 1820 },
  { label: '5月', revenue: 182600, productRevenue: 162400, shippingRevenue: 20200, totalCost: 121400, grossProfit: 61200, contribution: 48600, orderCount: 1980 },
  { label: '6月', revenue: 196840, productRevenue: 174800, shippingRevenue: 22040, totalCost: 130200, grossProfit: 66640, contribution: 52180, orderCount: 2140 },
  { label: '7月', revenue: 178320, productRevenue: 157200, shippingRevenue: 21120, totalCost: 119600, grossProfit: 58720, contribution: 45400, orderCount: 1920 },
  { label: '8月', revenue: 214680, productRevenue: 192400, shippingRevenue: 22280, totalCost: 140800, grossProfit: 73880, contribution: 58620, orderCount: 2380 },
  { label: '9月', revenue: 228400, productRevenue: 204200, shippingRevenue: 24200, totalCost: 148600, grossProfit: 79800, contribution: 63240, orderCount: 2520 },
];

/** 周度趋势（最近 8 周） */
export const weeklyTrend: TrendPoint[] = [
  { label: 'W32', revenue: 48200, productRevenue: 43200, shippingRevenue: 5000, totalCost: 32400, grossProfit: 15800, contribution: 12600, orderCount: 524 },
  { label: 'W33', revenue: 52600, productRevenue: 47200, shippingRevenue: 5400, totalCost: 34800, grossProfit: 17800, contribution: 14200, orderCount: 580 },
  { label: 'W34', revenue: 46800, productRevenue: 42000, shippingRevenue: 4800, totalCost: 31200, grossProfit: 15600, contribution: 12400, orderCount: 508 },
  { label: 'W35', revenue: 55400, productRevenue: 49600, shippingRevenue: 5800, totalCost: 36600, grossProfit: 18800, contribution: 15000, orderCount: 612 },
  { label: 'W36', revenue: 58200, productRevenue: 52400, shippingRevenue: 5800, totalCost: 38400, grossProfit: 19800, contribution: 15800, orderCount: 644 },
  { label: 'W37', revenue: 54600, productRevenue: 48800, shippingRevenue: 5800, totalCost: 36200, grossProfit: 18400, contribution: 14600, orderCount: 606 },
  { label: 'W38', revenue: 62800, productRevenue: 56400, shippingRevenue: 6400, totalCost: 41200, grossProfit: 21600, contribution: 17200, orderCount: 698 },
  { label: 'W39', revenue: 68400, productRevenue: 61400, shippingRevenue: 7000, totalCost: 44800, grossProfit: 23600, contribution: 18800, orderCount: 760 },
];

/** 月内日度趋势（9月，仅前 21 天） */
export const dailyTrend: TrendPoint[] = Array.from({ length: 21 }, (_, i) => {
  const base = 7200 + Math.sin(i * 0.8) * 1200 + i * 80;
  const rev = Math.round(base);
  const cost = Math.round(rev * 0.648);
  return {
    label: `9/${i + 1}`,
    revenue: rev,
    productRevenue: Math.round(rev * 0.89),
    shippingRevenue: Math.round(rev * 0.11),
    totalCost: cost,
    grossProfit: rev - cost,
    contribution: Math.round((rev - cost) * 0.82),
    orderCount: Math.round(80 + i * 3 + Math.sin(i) * 15),
  };
});

/** 渠道利润 */
export const channelProfits: ChannelProfit[] = [
  { channel: 'Amazon',      revenue: 98400, cost: 68200, profit: 30200, margin: 30.7, orderCount: 1084, trend: 'up',      trendPct: 8.2 },
  { channel: 'Shopify',     revenue: 72600, cost: 46800, profit: 25800, margin: 35.5, orderCount: 786,  trend: 'up',      trendPct: 12.4 },
  { channel: 'TikTok Shop', revenue: 41200, cost: 28600, profit: 12600, margin: 30.6, orderCount: 458,  trend: 'down',    trendPct: -3.1 },
  { channel: 'Walmart',     revenue: 16200, cost: 12400, profit: 3800,  margin: 23.5, orderCount: 192,  trend: 'neutral', trendPct: 1.2 },
];

/** SKU 利润排行（Top 10） */
export const skuProfits: SkuProfit[] = [
  { rank: 1,  sku: 'WEP-BLK-001', name: 'Wireless Earbuds Pro - 午夜黑',  revenue: 12420, cost: 6840,  profit: 5580, margin: 44.9, soldQty: 138 },
  { rank: 2,  sku: 'CMS-GRY-001', name: 'Control Module Stand - 太空灰',  revenue: 10320, cost: 6000,  profit: 4320, margin: 41.9, soldQty: 80 },
  { rank: 3,  sku: 'TP-BLK-STD',  name: 'Transit Pack - 黑色标准版',      revenue: 9480,  cost: 5600,  profit: 3880, margin: 40.9, soldQty: 120 },
  { rank: 4,  sku: 'DC16-BLK',    name: 'Dock Case iPhone 16 - 石墨黑',   revenue: 8640,  cost: 5400,  profit: 3240, margin: 37.5, soldQty: 216 },
  { rank: 5,  sku: 'WEP-WHT-001', name: 'Wireless Earbuds Pro - 珍珠白',  revenue: 7560,  cost: 4800,  profit: 2760, margin: 36.5, soldQty: 84 },
  { rank: 6,  sku: 'TP-GRY-STD',  name: 'Transit Pack - 深灰标准版',      revenue: 6480,  cost: 4200,  profit: 2280, margin: 35.2, soldQty: 82 },
  { rank: 7,  sku: 'DC16-WHT',    name: 'Dock Case iPhone 16 - 月白',     revenue: 6240,  cost: 4080,  profit: 2160, margin: 34.6, soldQty: 156 },
  { rank: 8,  sku: 'UCC-BLK-2M',  name: 'USB-C Cable 2m - 黑色',          revenue: 4800,  cost: 3240,  profit: 1560, margin: 32.5, soldQty: 240 },
  { rank: 9,  sku: 'TP-OLV-STD',  name: 'Transit Pack - 橄榄绿标准版',    revenue: 4264,  cost: 2958,  profit: 1306, margin: 30.6, soldQty: 52 },
  { rank: 10, sku: 'WEP-BLU-001', name: 'Wireless Earbuds Pro - 星空蓝',  revenue: 3990,  cost: 2856,  profit: 1134, margin: 28.4, soldQty: 42 },
];

/** 客户利润排行（Top 10） */
export const customerProfits: CustomerProfit[] = [
  { rank: 1,  name: 'Robert Taylor',   revenue: 4284,  profit: 1624, margin: 37.9, orderCount: 8 },
  { rank: 2,  name: 'Emily Johnson',   revenue: 3196,  profit: 1184, margin: 37.0, orderCount: 6 },
  { rank: 3,  name: 'Sarah Williams',  revenue: 2840,  profit: 1012, margin: 35.6, orderCount: 5 },
  { rank: 4,  name: 'James Wilson',    revenue: 2680,  profit: 920,  margin: 34.3, orderCount: 7 },
  { rank: 5,  name: 'Lisa Anderson',   revenue: 2420,  profit: 842,  margin: 34.8, orderCount: 4 },
  { rank: 6,  name: 'Michael Brown',   revenue: 2180,  profit: 726,  margin: 33.3, orderCount: 3 },
  { rank: 7,  name: 'Jennifer Davis',  revenue: 1960,  profit: 640,  margin: 32.7, orderCount: 4 },
  { rank: 8,  name: 'David Martinez',  revenue: 1840,  profit: 588,  margin: 31.9, orderCount: 3 },
  { rank: 9,  name: 'Jessica Garcia',  revenue: 1720,  profit: 534,  margin: 31.0, orderCount: 2 },
  { rank: 10, name: 'Chris Thompson',  revenue: 1640,  profit: 492,  margin: 30.0, orderCount: 3 },
];

/** 报表 KPI（当月） */
export const reportKpi: ReportKpi = {
  totalRevenue: 228400,
  grossProfit: 79800,
  grossMargin: 34.9,
  contributionMargin: 63240,
  contributionMarginRate: 27.7,
  totalOrders: 2520,
  avgOrderValue: 90.6,
  totalCost: 148600,
  currency: 'USD',
  revenueDelta: 6.4,
  profitDelta: 7.9,
};
