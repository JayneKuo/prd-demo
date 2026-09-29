// 结算模块 mock 数据

export type SettlementStatus = '已结算' | '处理中' | '待确认' | '异常';

export type SettlementChannel = 'Shopify' | 'Amazon' | 'TikTok Shop' | 'Walmart' | 'Stripe' | 'PayPal';

/** 结算单行 */
export type SettlementRow = {
  id: string;
  /** 结算单号 */
  settlementNo: string;
  /** 渠道 / 支付方 */
  channel: SettlementChannel;
  /** 店铺 / Merchant */
  merchant: string;
  /** 结算周期开始 */
  periodStart: string;
  /** 结算周期结束 */
  periodEnd: string;
  /** 结算日期（实际到账） */
  settledAt?: string;
  /** 原始销售金额 */
  grossAmount: number;
  /** 渠道/平台手续费 */
  feeAmount: number;
  /** 退款扣减 */
  refundAmount: number;
  /** 广告费扣减 */
  adAmount: number;
  /** 其他扣减 */
  otherDeduction: number;
  /** 净结算金额（实际到账） */
  netAmount: number;
  /** 币种 */
  currency: string;
  /** 状态 */
  status: SettlementStatus;
  /** 对账状态: matched=已匹配 / unmatched=差异 / pending=待核 */
  reconcileStatus: 'matched' | 'unmatched' | 'pending';
  /** 对账差异金额（如有） */
  reconcileDiff?: number;
  /** 关联订单数 */
  orderCount: number;
  /** 异常说明（如有） */
  exceptionNote?: string;
};

/** KPI 汇总 */
export type SettlementKpi = {
  pendingAmount: number;
  confirmedAmount: number;
  feeDeduction: number;
  netSettled: number;
  currency: string;
  /** 各渠道拆分 */
  byChannel: {
    channel: SettlementChannel;
    netAmount: number;
    feeRate: number;
    status: SettlementStatus;
  }[];
};

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

export const settlementKpi: SettlementKpi = {
  pendingAmount: 48320.50,
  confirmedAmount: 126840.20,
  feeDeduction: 12480.60,
  netSettled: 114359.60,
  currency: 'USD',
  byChannel: [
    { channel: 'Amazon',     netAmount: 52400.00, feeRate: 15.2, status: '已结算' },
    { channel: 'Shopify',    netAmount: 38820.00, feeRate: 2.9,  status: '已结算' },
    { channel: 'TikTok Shop',netAmount: 23139.60, feeRate: 5.0,  status: '处理中' },
    { channel: 'Walmart',    netAmount: 0,        feeRate: 8.0,  status: '待确认' },
  ],
};

export const settlementRows: SettlementRow[] = [
  {
    id: 'stl_001',
    settlementNo: 'STL-AMZ-20260914',
    channel: 'Amazon',
    merchant: 'US Amazon',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    settledAt: '2026-09-16',
    grossAmount: 68400.00,
    feeAmount: 10396.80,  // Amazon 15.2% 费率
    refundAmount: 3200.00,
    adAmount: 2240.00,
    otherDeduction: 163.20,
    netAmount: 52400.00,
    currency: 'USD',
    status: '已结算',
    reconcileStatus: 'matched',
    orderCount: 842,
  },
  {
    id: 'stl_002',
    settlementNo: 'STL-SHP-20260914',
    channel: 'Shopify',
    merchant: 'US Store',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    settledAt: '2026-09-16',
    grossAmount: 41200.00,
    feeAmount: 1194.80,   // Stripe 2.9%
    refundAmount: 1185.20,
    adAmount: 0,
    otherDeduction: 0,
    netAmount: 38820.00,
    currency: 'USD',
    status: '已结算',
    reconcileStatus: 'unmatched',
    reconcileDiff: 42.50,
    orderCount: 386,
    exceptionNote: '与银行到账存在 $42.50 差异，待核查',
  },
  {
    id: 'stl_003',
    settlementNo: 'STL-TTK-20260914',
    channel: 'TikTok Shop',
    merchant: 'UK TikTok Shop',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    settledAt: undefined,
    grossAmount: 25320.00,
    feeAmount: 1266.00,  // TikTok 5%
    refundAmount: 680.00,
    adAmount: 234.40,
    otherDeduction: 0,
    netAmount: 23139.60,
    currency: 'USD',
    status: '处理中',
    reconcileStatus: 'pending',
    orderCount: 298,
  },
  {
    id: 'stl_004',
    settlementNo: 'STL-WMT-20260914',
    channel: 'Walmart',
    merchant: 'US Amazon',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    settledAt: undefined,
    grossAmount: 18600.00,
    feeAmount: 1488.00,  // Walmart 8%
    refundAmount: 420.00,
    adAmount: 0,
    otherDeduction: 0,
    netAmount: 16692.00,
    currency: 'USD',
    status: '待确认',
    reconcileStatus: 'pending',
    orderCount: 156,
    exceptionNote: '等待 Walmart Seller Center 结算确认',
  },
  {
    id: 'stl_005',
    settlementNo: 'STL-AMZ-20260831',
    channel: 'Amazon',
    merchant: 'US Amazon',
    periodStart: '2026-08-16',
    periodEnd: '2026-08-31',
    settledAt: '2026-09-02',
    grossAmount: 72180.00,
    feeAmount: 10971.36,
    refundAmount: 2640.00,
    adAmount: 3480.00,
    otherDeduction: 248.64,
    netAmount: 54840.00,
    currency: 'USD',
    status: '已结算',
    reconcileStatus: 'matched',
    orderCount: 924,
  },
  {
    id: 'stl_006',
    settlementNo: 'STL-SHP-20260907',
    channel: 'Shopify',
    merchant: 'US Store',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    settledAt: '2026-09-09',
    grossAmount: 38600.00,
    feeAmount: 1119.40,
    refundAmount: 980.00,
    adAmount: 0,
    otherDeduction: 0,
    netAmount: 36500.60,
    currency: 'USD',
    status: '已结算',
    reconcileStatus: 'matched',
    orderCount: 342,
  },
];
