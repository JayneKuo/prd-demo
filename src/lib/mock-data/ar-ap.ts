// 应收账款（AR）/ 应付账款（AP）mock 数据

// ─── 渠道应收（Channel AR）────────────────────────────────────────────────────
// 平台代收货款后、到结算周期再回款给商家，这笔待回款即"渠道应收"

export type ChannelArStatus = '处理中' | '待到账' | '已到账' | '差异' | '已核销';
export type ChannelSource = 'Amazon' | 'Shopify' | 'TikTok Shop' | 'Walmart' | '手工订单' | 'EDI';
export type ErpSyncStatus = 'synced' | 'pending' | 'error' | 'na';

/** 扣减明细：各平台费用逐项拆分，辅助核账 */
export type DeductionBreakdown = {
  /** 平台引荐费/佣金（Amazon referral fee、TikTok commission、Walmart commission） */
  commission?: number;
  /** FBA/平台配送费（Amazon FBA fulfillment & weight-based fee） */
  fulfillmentFee?: number;
  /** 广告费扣减 */
  advertisingFee?: number;
  /** 支付手续费（Shopify/Stripe transaction fee） */
  transactionFee?: number;
  /** 退款扣减（含退货运费） */
  refunds?: number;
  /** 其他杂项 */
  other?: number;
};

export type ChannelArRow = {
  id: string;
  settlementNo: string;
  /** 销售渠道 / 支付平台 */
  channel: ChannelSource;
  /** 店铺名称 */
  merchant: string;
  /** 结算周期 */
  periodStart: string;
  periodEnd: string;
  /** 订单数 */
  orderCount: number;
  /** OMS 侧原始销售额 */
  grossAmount: number;
  /** 平台佣金 + FBA 费 + 广告等扣减合计 */
  totalDeduction: number;
  /** OMS 预计到账净额 */
  expectedNet: number;
  /** 实际到账金额（未到账为 null） */
  actualNet: number | null;
  /** 差异 = actualNet - expectedNet */
  variance: number | null;
  /** 币种 */
  currency: string;
  /** 结算状态 */
  status: ChannelArStatus;
  /** 实际到账日 */
  settledAt?: string;
  /** ERP 同步状态（是否已推送至 NetSuite / QB） */
  erpSync: ErpSyncStatus;
  /** ERP 系统名称 */
  erpSystem?: string;
  /** 备注 */
  note?: string;
  /** 扣减明细（各费用项逐一拆分，方便财务核账） */
  deductionBreakdown?: DeductionBreakdown;
  /** 预计到账日（依平台 T+N 结算周期推算） */
  expectedReceiptDate?: string;
};

export type ChannelArKpi = {
  /** 渠道待回款总额 */
  channelPending: number;
  /** 本月已到账 */
  channelReceived: number;
  /** 发现差异笔数 */
  varianceCount: number;
  /** 差异金额合计 */
  varianceAmount: number;
  currency: string;
};

export const channelArKpi: ChannelArKpi = {
  channelPending: 39831.60,   // TikTok + Walmart 待回款
  channelReceived: 182560.60, // Amazon(52400+54840) + Shopify(38820+36500.60)
  varianceCount: 2,
  varianceAmount: 42.50,
  currency: 'USD',
};

export const channelArRows: ChannelArRow[] = [
  {
    id: 'car_001',
    settlementNo: 'STL-AMZ-20260914',
    channel: 'Amazon',
    merchant: 'US Amazon',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    orderCount: 842,
    grossAmount: 68400.00,
    totalDeduction: 16000.00,   // 佣金 $10,396.80 + 退款 $3,200 + 广告 $2,240 + 其他 $163.20
    expectedNet: 52400.00,
    actualNet: 52400.00,
    variance: 0,
    currency: 'USD',
    status: '已到账',
    settledAt: '2026-09-16',
    erpSync: 'synced',
    erpSystem: 'NetSuite',
    deductionBreakdown: { commission: 10396.80, advertisingFee: 2240.00, refunds: 3200.00, other: 163.20 },
    expectedReceiptDate: '2026-09-16',
  },
  {
    id: 'car_002',
    settlementNo: 'STL-SHP-20260914',
    channel: 'Shopify',
    merchant: 'US Store',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    orderCount: 386,
    grossAmount: 41200.00,
    totalDeduction: 2380.00,    // Stripe 交易费 $1,194.80 + 退款 $1,185.20
    expectedNet: 38820.00,
    actualNet: 38777.50,
    variance: -42.50,
    currency: 'USD',
    status: '差异',
    settledAt: '2026-09-16',
    erpSync: 'synced',
    erpSystem: 'NetSuite',
    note: '实际到账 $38,777.50，与OMS预计差 $42.50，疑似1笔退款时序不同步，已提交核查',
    deductionBreakdown: { transactionFee: 1194.80, refunds: 1185.20 },
    expectedReceiptDate: '2026-09-16',
  },
  {
    id: 'car_003',
    settlementNo: 'STL-TTK-20260914',
    channel: 'TikTok Shop',
    merchant: 'UK TikTok Shop',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    orderCount: 298,
    grossAmount: 25320.00,
    totalDeduction: 2180.40,    // 佣金 $1,266 + 退款 $680 + 广告 $234.40
    expectedNet: 23139.60,
    actualNet: null,
    variance: null,
    currency: 'USD',
    status: '处理中',
    erpSync: 'pending',
    erpSystem: 'NetSuite',
    note: 'TikTok Shop 结算处理中，预计 2026-09-19 到账',
    deductionBreakdown: { commission: 1266.00, advertisingFee: 234.40, refunds: 680.00 },
    expectedReceiptDate: '2026-09-19',
  },
  {
    id: 'car_004',
    settlementNo: 'STL-WMT-20260914',
    channel: 'Walmart',
    merchant: 'US Walmart',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    orderCount: 156,
    grossAmount: 18600.00,
    totalDeduction: 1908.00,    // Walmart 佣金 $1,488 + 退款 $420
    expectedNet: 16692.00,
    actualNet: null,
    variance: null,
    currency: 'USD',
    status: '待到账',
    erpSync: 'pending',
    erpSystem: 'NetSuite',
    note: '等待 Walmart Seller Center 结算确认',
    deductionBreakdown: { commission: 1488.00, refunds: 420.00 },
    expectedReceiptDate: '2026-09-28',
  },
  {
    id: 'car_005',
    settlementNo: 'STL-AMZ-20260831',
    channel: 'Amazon',
    merchant: 'US Amazon',
    periodStart: '2026-08-16',
    periodEnd: '2026-08-31',
    orderCount: 924,
    grossAmount: 72180.00,
    totalDeduction: 17340.00,   // 佣金 $10,971.36 + 退款 $2,640 + 广告 $3,480 + 其他 $248.64
    expectedNet: 54840.00,
    actualNet: 54840.00,
    variance: 0,
    currency: 'USD',
    status: '已到账',
    settledAt: '2026-09-02',
    erpSync: 'synced',
    erpSystem: 'NetSuite',
    deductionBreakdown: { commission: 10971.36, advertisingFee: 3480.00, refunds: 2640.00, other: 248.64 },
    expectedReceiptDate: '2026-09-02',
  },
  {
    id: 'car_006',
    settlementNo: 'STL-SHP-20260907',
    channel: 'Shopify',
    merchant: 'US Store',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    orderCount: 342,
    grossAmount: 38600.00,
    totalDeduction: 2099.40,    // Stripe 交易费 $1,119.40 + 退款 $980
    expectedNet: 36500.60,
    actualNet: 36500.60,
    variance: 0,
    currency: 'USD',
    status: '已到账',
    settledAt: '2026-09-09',
    erpSync: 'synced',
    erpSystem: 'NetSuite',
    deductionBreakdown: { transactionFee: 1119.40, refunds: 980.00 },
    expectedReceiptDate: '2026-09-09',
  },
  {
    id: 'car_007',
    settlementNo: 'MANUAL-SEP-001',
    channel: '手工订单',
    merchant: '-',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    orderCount: 12,
    grossAmount: 8620.00,
    totalDeduction: 0,
    expectedNet: 8620.00,
    actualNet: null,
    variance: null,
    currency: 'USD',
    status: '待到账',
    erpSync: 'na',
    note: '线下收款，已开具发票，待客户电汇',
    expectedReceiptDate: '2026-09-30',
  },
];

export const channelArStatusConfig: Record<ChannelArStatus, { cls: string; dot: string }> = {
  '处理中': { cls: 'bg-blue-50 text-blue-700 ring-blue-200',         dot: 'bg-blue-500' },
  '待到账': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',      dot: 'bg-amber-400' },
  '已到账': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',dot: 'bg-emerald-500' },
  '差异':   { cls: 'bg-red-50 text-red-700 ring-red-200',            dot: 'bg-red-500' },
  '已核销': { cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
};

export const erpSyncConfig: Record<ErpSyncStatus, { label: string; cls: string }> = {
  synced:  { label: '已同步',   cls: 'text-[var(--success)]' },
  pending: { label: '待同步',   cls: 'text-amber-600' },
  error:   { label: '同步失败', cls: 'text-[var(--danger)]' },
  na:      { label: '—',        cls: 'text-[var(--muted)]' },
};

// ─── 应收账款（AR）────────────────────────────────────────────────────────────

export type ArStatus = '未到期' | '逾期1-30天' | '逾期31-60天' | '逾期61-90天' | '逾期90天+' | '已收款' | '已核销';

export type ArRow = {
  id: string;
  /** 应收单号（由 OMS 从 B2B 订单自动生成） */
  invoiceNo: string;
  /** 来源订单号（账期订单发货后自动创建应收记录） */
  sourceOrderId?: string;
  /** 付款条款（Net 30 / Net 60 等，来自订单协议） */
  paymentTerms?: string;
  /** 客户名称 */
  customer: string;
  /** 销售渠道 */
  channel: string;
  /** 开单日期（发货确认日） */
  invoiceDate: string;
  /** 到期日 */
  dueDate: string;
  /** 应收金额 */
  invoiceAmount: number;
  /** 已收金额 */
  paidAmount: number;
  /** 未收余额 */
  balanceDue: number;
  /** 币种 */
  currency: string;
  /** 账龄状态 */
  agingStatus: ArStatus;
  /** 逾期天数 */
  overdueDays: number;
  /** 备注 */
  note?: string;
};

export type ArKpi = {
  totalReceivable: number;
  overdueAmount: number;
  currentAmount: number;
  collectedThisMonth: number;
  currency: string;
  aging: { label: string; amount: number; cls: string }[];
};

// ─── 应付账款（AP）────────────────────────────────────────────────────────────

export type ApStatus = '待审批' | '已审批' | '待付款' | '已付款' | '逾期' | '有争议';

export type ApCategory = '仓储费' | '运输费' | '平台费' | '支付手续费' | '清关费' | '其他';

export type ApRow = {
  id: string;
  /** 账单号 */
  billNo: string;
  /** 供应商 */
  vendor: string;
  /** 费用类型 */
  category: ApCategory;
  /** 账单日期 */
  billDate: string;
  /** 到期日 */
  dueDate: string;
  /** 账单金额（供应商实际账单） */
  billAmount: number;
  /** OMS 预估金额（按费率配置估算） */
  omsEstimate?: number;
  /** 差异 = billAmount - omsEstimate（正=超出预期） */
  variance?: number;
  /** 已付金额 */
  paidAmount: number;
  /** 未付余额 */
  balanceDue: number;
  /** 币种 */
  currency: string;
  /** 状态 */
  status: ApStatus;
  /** 逾期天数 */
  overdueDays: number;
  /** 付款条款（Net 30 等） */
  paymentTerms?: string;
  /** 备注 */
  note?: string;
};

export type ApKpi = {
  totalPayable: number;
  overdueAmount: number;
  dueThisWeek: number;
  paidThisMonth: number;
  currency: string;
};

// ─── AR Mock 数据 ─────────────────────────────────────────────────────────────

export const arKpi: ArKpi = {
  totalReceivable: 86420.00,
  overdueAmount: 12840.00,
  currentAmount: 73580.00,
  collectedThisMonth: 114360.00,
  currency: 'USD',
  aging: [
    { label: '未到期',       amount: 73580.00, cls: 'bg-emerald-500' },
    { label: '1-30天',      amount: 6840.00,  cls: 'bg-amber-400' },
    { label: '31-60天',     amount: 3200.00,  cls: 'bg-orange-400' },
    { label: '61-90天',     amount: 2800.00,  cls: 'bg-red-400' },
    { label: '90天+',       amount: 0,        cls: 'bg-red-600' },
  ],
};

export const arRows: ArRow[] = [
  {
    id: 'ar_001',
    invoiceNo: 'INV-20260901-0001',
    sourceOrderId: 'SO-2026-0842',
    paymentTerms: 'Net 30',
    customer: 'TechCorp Inc.',
    channel: 'Direct',
    invoiceDate: '2026-09-01',
    dueDate: '2026-10-01',
    invoiceAmount: 24800.00,
    paidAmount: 0,
    balanceDue: 24800.00,
    currency: 'USD',
    agingStatus: '未到期',
    overdueDays: 0,
  },
  {
    id: 'ar_002',
    invoiceNo: 'INV-20260908-0012',
    sourceOrderId: 'SO-2026-0901',
    paymentTerms: 'Net 30',
    customer: 'Global Retail Ltd.',
    channel: 'EDI',
    invoiceDate: '2026-09-08',
    dueDate: '2026-10-08',
    invoiceAmount: 18600.00,
    paidAmount: 9300.00,
    balanceDue: 9300.00,
    currency: 'USD',
    agingStatus: '未到期',
    overdueDays: 0,
    note: '客户已付50%，剩余按合同到期支付',
  },
  {
    id: 'ar_003',
    invoiceNo: 'INV-20260812-0008',
    sourceOrderId: 'SO-2026-0812',
    paymentTerms: 'Net 30',
    customer: 'Pacific Traders',
    channel: 'Shopify',
    invoiceDate: '2026-08-12',
    dueDate: '2026-09-11',
    invoiceAmount: 8420.00,
    paidAmount: 0,
    balanceDue: 8420.00,
    currency: 'USD',
    agingStatus: '逾期1-30天',
    overdueDays: 10,
  },
  {
    id: 'ar_004',
    invoiceNo: 'INV-20260801-0003',
    sourceOrderId: 'SO-2026-0761',
    paymentTerms: 'Net 30',
    customer: 'MidWest Distributors',
    channel: 'EDI',
    invoiceDate: '2026-08-01',
    dueDate: '2026-08-31',
    invoiceAmount: 12600.00,
    paidAmount: 10200.00,
    balanceDue: 2400.00,
    currency: 'USD',
    agingStatus: '逾期1-30天',
    overdueDays: 21,
    note: '客户称资金周转问题，承诺10月1日前结清',
  },
  {
    id: 'ar_005',
    invoiceNo: 'INV-20260718-0021',
    sourceOrderId: 'SO-2026-0698',
    paymentTerms: 'Net 30',
    customer: 'Euro Commerce GmbH',
    channel: 'Direct',
    invoiceDate: '2026-07-18',
    dueDate: '2026-08-17',
    invoiceAmount: 6800.00,
    paidAmount: 3600.00,
    balanceDue: 3200.00,
    currency: 'USD',
    agingStatus: '逾期31-60天',
    overdueDays: 35,
  },
  {
    id: 'ar_006',
    invoiceNo: 'INV-20260625-0014',
    sourceOrderId: 'SO-2026-0621',
    paymentTerms: 'Net 60',
    customer: 'Pacific Traders',
    channel: 'Direct',
    invoiceDate: '2026-06-25',
    dueDate: '2026-07-25',
    invoiceAmount: 4200.00,
    paidAmount: 1400.00,
    balanceDue: 2800.00,
    currency: 'USD',
    agingStatus: '逾期61-90天',
    overdueDays: 58,
    note: '已多次催款，考虑转法务处理',
  },
  {
    id: 'ar_007',
    invoiceNo: 'INV-20260815-0019',
    sourceOrderId: 'SO-2026-0820',
    paymentTerms: 'Net 30',
    customer: 'TechCorp Inc.',
    channel: 'Direct',
    invoiceDate: '2026-08-15',
    dueDate: '2026-09-14',
    invoiceAmount: 15200.00,
    paidAmount: 15200.00,
    balanceDue: 0,
    currency: 'USD',
    agingStatus: '已收款',
    overdueDays: 0,
  },
  {
    id: 'ar_008',
    invoiceNo: 'INV-20260901-0002',
    customer: 'SG Electronics Pte.',
    channel: 'Shopify',
    invoiceDate: '2026-09-01',
    dueDate: '2026-09-30',
    invoiceAmount: 6020.00,
    paidAmount: 0,
    balanceDue: 6020.00,
    currency: 'USD',
    agingStatus: '未到期',
    overdueDays: 0,
  },
];

// ─── AP Mock 数据 ─────────────────────────────────────────────────────────────

export const apKpi: ApKpi = {
  totalPayable: 54280.00,
  overdueAmount: 2840.00,
  dueThisWeek: 18620.00,
  paidThisMonth: 38420.80,
  currency: 'USD',
};

export const apRows: ApRow[] = [
  // ── 仓储费（3PL）──────────────────────────────────────────────
  {
    id: 'ap_001',
    billNo: 'SB-INV-2026090001',
    vendor: 'ShipBob US (LAX)',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 5480.00,
    omsEstimate: 5418.00,
    variance: 62.00,
    paidAmount: 0,
    balanceDue: 5480.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
    paymentTerms: 'Net 30',
    note: '差异 $62：OMS 按 1,204件估算，实际存储量 1,218件，超出 $62',
  },
  {
    id: 'ap_002',
    billNo: 'XPO-2026-09-EWR-0012',
    vendor: 'XPO Logistics (EWR)',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 4280.00,
    omsEstimate: 4200.00,
    variance: 80.00,
    paidAmount: 0,
    balanceDue: 4280.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
    paymentTerms: 'Net 30',
    note: '差异 $80：超额存储附加费，OMS 未配置该 SKU 的超额规则',
  },
  {
    id: 'ap_003',
    billNo: 'SB-UK-INV-2026090003',
    vendor: 'ShipBob UK (London)',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 3080.00,
    omsEstimate: 2950.00,
    variance: 130.00,
    paidAmount: 0,
    balanceDue: 3080.00,
    currency: 'USD',
    status: '待审批',
    overdueDays: 0,
    paymentTerms: 'Net 30',
    note: '差异 $130：GBP 汇率 1.24→1.27 波动，待 Finance Admin 确认换算汇率',
  },
  // ── 运输费（承运商）────────────────────────────────────────────
  {
    id: 'ap_004',
    billNo: 'FDX-2026-09-0482',
    vendor: 'FedEx',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 8420.00,
    omsEstimate: 8200.00,
    variance: 220.00,
    paidAmount: 0,
    balanceDue: 8420.00,
    currency: 'USD',
    status: '已审批',
    overdueDays: 0,
    paymentTerms: 'Net 14',
    note: '差异 $220：燃油附加费 $140 + 住宅附加费 $80，OMS 路由规则未含',
  },
  {
    id: 'ap_005',
    billNo: 'UPS-ACC-SEP14-2026',
    vendor: 'UPS',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 6840.00,
    omsEstimate: 6600.00,
    variance: 240.00,
    paidAmount: 0,
    balanceDue: 6840.00,
    currency: 'USD',
    status: '待审批',
    overdueDays: 0,
    paymentTerms: 'Net 14',
    note: '差异 $240：住宅附加费 $160 + 超尺寸附加费 $80，需核查 23 个运单',
  },
  {
    id: 'ap_006',
    billNo: 'RM-INV-SEP-UK-001',
    vendor: 'Royal Mail',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 3360.00,
    omsEstimate: 3360.00,
    variance: 0,
    paidAmount: 0,
    balanceDue: 3360.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
    paymentTerms: 'Net 14',
  },
  // ── 平台费（渠道服务费）────────────────────────────────────────
  {
    id: 'ap_007',
    billNo: 'AMZ-ACCT-2026-09',
    vendor: 'Amazon',
    category: '平台费',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    billAmount: 2480.80,
    omsEstimate: 2284.00,
    variance: 196.80,
    paidAmount: 2480.80,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
    paymentTerms: 'Net 15',
    note: '差异 $196.80：部分 SKU 适用更高佣金费率，需对照 Amazon Fee Preview',
  },
  {
    id: 'ap_008',
    billNo: 'TTS-FEE-SEP2026',
    vendor: 'TikTok Shop',
    category: '平台费',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    billAmount: 1266.00,
    omsEstimate: 1200.00,
    variance: 66.00,
    paidAmount: 1266.00,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
    paymentTerms: 'Net 15',
    note: '差异 $66：TikTok 实际费率 5.5%，OMS 配置为 5.0%，需更新费率',
  },
  {
    id: 'ap_009_stripe',
    billNo: 'STRIPE-SEP-2026',
    vendor: 'Stripe',
    category: '支付手续费',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    billAmount: 1194.80,
    omsEstimate: 1178.00,
    variance: 16.80,
    paidAmount: 1194.80,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
    paymentTerms: 'Net 15',
    note: '差异 $16.80：1笔国际卡手续费率 3.5%，高于标准 2.9%',
  },
  // ── 清关费 & 其他 ──────────────────────────────────────────────
  {
    id: 'ap_009',
    billNo: 'EXP-OTH-20260901',
    vendor: '海关',
    category: '清关费',
    billDate: '2026-09-01',
    dueDate: '2026-09-20',
    billAmount: 1280.00,
    paidAmount: 1040.00,
    balanceDue: 240.00,
    currency: 'USD',
    status: '有争议',
    overdueDays: 1,
    paymentTerms: 'Net 20',
    note: '实际税率高于预期，差额 $240 待核实',
  },
  {
    id: 'ap_010',
    billNo: 'SB-INV-2026080001',
    vendor: 'ShipBob US (LAX)',
    category: '仓储费',
    billDate: '2026-08-01',
    dueDate: '2026-08-31',
    billAmount: 5200.00,
    omsEstimate: 5200.00,
    variance: 0,
    paidAmount: 5200.00,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
    paymentTerms: 'Net 30',
  },
];

export const agingStatusConfig: Record<string, { cls: string; dot: string }> = {
  '未到期':       { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  '逾期1-30天':   { cls: 'bg-amber-50 text-amber-700 ring-amber-200',        dot: 'bg-amber-400' },
  '逾期31-60天':  { cls: 'bg-orange-50 text-orange-700 ring-orange-200',     dot: 'bg-orange-400' },
  '逾期61-90天':  { cls: 'bg-red-50 text-red-700 ring-red-200',              dot: 'bg-red-500' },
  '逾期90天+':    { cls: 'bg-red-100 text-red-800 ring-red-300',             dot: 'bg-red-700' },
  '已收款':       { cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
  '已核销':       { cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
};

export const apStatusConfig: Record<ApStatus, { cls: string; dot: string }> = {
  '待审批': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400' },
  '已审批': { cls: 'bg-blue-50 text-blue-700 ring-blue-200',           dot: 'bg-blue-500' },
  '待付款': { cls: 'bg-violet-50 text-violet-700 ring-violet-200',    dot: 'bg-violet-500' },
  '已付款': { cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
  '逾期':   { cls: 'bg-red-50 text-red-700 ring-red-200',              dot: 'bg-red-500' },
  '有争议': { cls: 'bg-red-50 text-[var(--danger)] ring-red-200',     dot: 'bg-red-500' },
};

// ─── 平台结算明细（Platform Settlement Details）────────────────────────────────
// 平台原始结算报告，每行对应一笔交易：商品收入/FBA费/佣金/广告/退款/税款/调整
// 与 OMS汇总账期（channelArRows）形成两层数据：
//   OMS视角 → 预估聚合  ↔  平台明细 → 原始逐行记录

export type AmountCategory = 'income' | 'fee' | 'refund' | 'tax' | 'adjustment';

export type AmountType =
  // 收入类
  | 'Principal' | 'Shipping' | 'Promotion' | 'Sale' | 'ShippingIncentive' | 'PaymentCapture'
  // 费用类
  | 'FBAPerUnitFulfillmentFee' | 'FBAWeightBasedFee' | 'Commission' | 'FBAStorageFee'
  | 'AdvertisingFee' | 'TransactionFee' | 'PlatformCommission' | 'PromotionContribution'
  // 退款类
  | 'Refund' | 'ReturnShipping'
  // 税款类
  | 'Tax' | 'MarketplaceFacilitatorTax'
  // 调整类
  | 'Adjustment' | 'LongTermStorageFee' | 'DisposalFee';

export type PlatformSettlementLine = {
  id: string;
  /** 平台结算批次号 */
  settlementId: string;
  /** 渠道 */
  channel: string;
  /** 平台订单号 */
  orderId?: string;
  /** 运输单号 */
  shipmentId?: string;
  /** 平台 SKU / ASIN */
  sku?: string;
  /** 卖家 SKU (MSKU) */
  msku?: string;
  /** 商品名称（简写） */
  productName?: string;
  /** 平台定义的金额类型（原始字段） */
  amountType: AmountType;
  /** 金额（正=收入/补贴，负=费用/扣减） */
  amount: number;
  /** 币种 */
  currency: string;
  /** 数量（商品行才有） */
  quantity?: number;
  /** 交易日期 */
  transactionDate: string;
};

export type PlatformSettlementBatch = {
  settlementId: string;
  /** 结算批次标题（展示用） */
  title: string;
  channel: string;
  periodStart: string;
  periodEnd: string;
  /** 实际到账日 */
  depositDate?: string;
  /** 实际到账金额 */
  totalDeposit: number;
  currency: string;
  /** 结算行数 */
  lineCount: number;
  lines: PlatformSettlementLine[];
};

// 金额类型配置：中文标签 + 颜色 + 分类
export const amountTypeConfig: Record<AmountType, {
  label: string;
  cls: string;
  category: AmountCategory;
}> = {
  // 收入类 - 绿色
  Principal:                { label: '商品售价',      category: 'income',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Shipping:                 { label: '运费收入',      category: 'income',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Promotion:                { label: '平台促销补贴',  category: 'income',     cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  Sale:                     { label: '商品销售',      category: 'income',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ShippingIncentive:        { label: '物流补贴',      category: 'income',     cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  PaymentCapture:           { label: '支付到账',      category: 'income',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  // 费用类 - 橙色
  FBAPerUnitFulfillmentFee: { label: 'FBA 配送费',    category: 'fee',        cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  FBAWeightBasedFee:        { label: 'FBA 重量费',    category: 'fee',        cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  Commission:               { label: '引荐费（佣金）', category: 'fee',       cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  FBAStorageFee:            { label: 'FBA 月度仓储费', category: 'fee',       cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  AdvertisingFee:           { label: '广告费扣减',    category: 'fee',        cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  TransactionFee:           { label: '支付交易费',    category: 'fee',        cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  PlatformCommission:       { label: '平台佣金',      category: 'fee',        cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PromotionContribution:    { label: '平台促销分担',  category: 'fee',        cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  // 退款类 - 红色
  Refund:                   { label: '退款扣减',      category: 'refund',     cls: 'bg-red-50 text-red-700 ring-red-200' },
  ReturnShipping:           { label: '退货运费',      category: 'refund',     cls: 'bg-red-50 text-red-700 ring-red-200' },
  // 税款类 - 灰色（代收不计入收入）
  Tax:                      { label: '代收销售税',    category: 'tax',        cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
  MarketplaceFacilitatorTax: { label: '平台代扣税',   category: 'tax',        cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
  // 调整类 - 蓝色
  Adjustment:               { label: '账务调整',      category: 'adjustment', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  LongTermStorageFee:       { label: '长期仓储费',    category: 'fee',        cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  DisposalFee:              { label: '处置费',        category: 'fee',        cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

// ─── Amazon 结算明细 ──────────────────────────────────────────────────────────

const amazonLines_0914: PlatformSettlementLine[] = [
  // ── 订单 #114-7820934-001 (蓝牙音箱 $85) ────────────────────────────────
  { id: 'al_001', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-001', shipmentId: 'SHIP-AMZ-001', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'Principal', amount: 80.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-02' },
  { id: 'al_002', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-001', shipmentId: 'SHIP-AMZ-001', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'Promotion', amount: 5.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-02' },
  { id: 'al_003', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-001', shipmentId: 'SHIP-AMZ-001', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'Tax', amount: 6.80, currency: 'USD', quantity: 1, transactionDate: '2026-09-02' },
  { id: 'al_004', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-001', shipmentId: 'SHIP-AMZ-001', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'FBAPerUnitFulfillmentFee', amount: -5.40, currency: 'USD', quantity: 1, transactionDate: '2026-09-02' },
  { id: 'al_005', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-001', shipmentId: 'SHIP-AMZ-001', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'Commission', amount: -12.75, currency: 'USD', quantity: 1, transactionDate: '2026-09-02' },
  // ── 订单 #114-9834521-002 (USB-C Hub $48) ───────────────────────────────
  { id: 'al_006', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-9834521-002', shipmentId: 'SHIP-AMZ-002', sku: 'USB-HUB-7', msku: 'SKU-USB-001', productName: 'USB-C Hub 7-in-1', amountType: 'Principal', amount: 48.00, currency: 'USD', quantity: 2, transactionDate: '2026-09-04' },
  { id: 'al_007', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-9834521-002', shipmentId: 'SHIP-AMZ-002', sku: 'USB-HUB-7', msku: 'SKU-USB-001', productName: 'USB-C Hub 7-in-1', amountType: 'Tax', amount: 7.68, currency: 'USD', quantity: 2, transactionDate: '2026-09-04' },
  { id: 'al_008', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-9834521-002', shipmentId: 'SHIP-AMZ-002', sku: 'USB-HUB-7', msku: 'SKU-USB-001', productName: 'USB-C Hub 7-in-1', amountType: 'FBAPerUnitFulfillmentFee', amount: -7.80, currency: 'USD', quantity: 2, transactionDate: '2026-09-04' },
  { id: 'al_009', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-9834521-002', shipmentId: 'SHIP-AMZ-002', sku: 'USB-HUB-7', msku: 'SKU-USB-001', productName: 'USB-C Hub 7-in-1', amountType: 'Commission', amount: -7.20, currency: 'USD', quantity: 2, transactionDate: '2026-09-04' },
  // ── 退款 - Order #114-7820934-003 ───────────────────────────────────────
  { id: 'al_010', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-003', shipmentId: 'RSHIP-003', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'Refund', amount: -85.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-07' },
  { id: 'al_011', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', orderId: '114-7820934-003', shipmentId: 'RSHIP-003', sku: 'BT-SPK-PRO', msku: 'SKU-BT-001', productName: 'Bluetooth Speaker Pro', amountType: 'ReturnShipping', amount: -8.50, currency: 'USD', quantity: 1, transactionDate: '2026-09-07' },
  // ── 月度 FBA 仓储费（非订单级，全月汇总）───────────────────────────────
  { id: 'al_012', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', amountType: 'FBAStorageFee', amount: -640.00, currency: 'USD', transactionDate: '2026-09-14' },
  // ── 广告费扣减（汇总，非订单级）────────────────────────────────────────
  { id: 'al_013', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', amountType: 'AdvertisingFee', amount: -2240.00, currency: 'USD', transactionDate: '2026-09-14' },
  // ── 库存调整（账务调整项）──────────────────────────────────────────────
  { id: 'al_014', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', amountType: 'Adjustment', amount: 36.80, currency: 'USD', transactionDate: '2026-09-12' },
  // ── 平台代扣税（不计入收入）────────────────────────────────────────────
  { id: 'al_015', settlementId: 'STLID-AMZ-0914', channel: 'Amazon', amountType: 'MarketplaceFacilitatorTax', amount: -14.48, currency: 'USD', transactionDate: '2026-09-14' },
];

// ─── Shopify / Stripe 结算明细 ────────────────────────────────────────────────

const shopifyLines_0914: PlatformSettlementLine[] = [
  // ── 正常订单支付 ─────────────────────────────────────────────────────────
  { id: 'sl_001', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8842-0001', sku: 'YOGA-MAT-PRO', msku: 'SKU-YM-001', productName: 'Yoga Mat Pro', amountType: 'PaymentCapture', amount: 65.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-08' },
  { id: 'sl_002', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8842-0001', sku: 'YOGA-MAT-PRO', msku: 'SKU-YM-001', productName: 'Yoga Mat Pro', amountType: 'Shipping', amount: 8.99, currency: 'USD', quantity: 1, transactionDate: '2026-09-08' },
  { id: 'sl_003', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8842-0001', sku: 'YOGA-MAT-PRO', msku: 'SKU-YM-001', productName: 'Yoga Mat Pro', amountType: 'Tax', amount: 6.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-08' },
  { id: 'sl_004', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8842-0001', sku: 'YOGA-MAT-PRO', msku: 'SKU-YM-001', productName: 'Yoga Mat Pro', amountType: 'TransactionFee', amount: -2.22, currency: 'USD', quantity: 1, transactionDate: '2026-09-08' },
  // ── 批量订单汇总（本期多笔） ─────────────────────────────────────────────
  { id: 'sl_005', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: '(386 笔订单汇总)', amountType: 'PaymentCapture', amount: 41200.00, currency: 'USD', transactionDate: '2026-09-14' },
  { id: 'sl_006', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: '(386 笔订单汇总)', amountType: 'TransactionFee', amount: -1194.80, currency: 'USD', transactionDate: '2026-09-14' },
  // ── 退款 ────────────────────────────────────────────────────────────────
  { id: 'sl_007', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8765-0098', sku: 'BT-SPK-PRO', productName: 'Bluetooth Speaker Pro', amountType: 'Refund', amount: -85.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-11' },
  { id: 'sl_008', settlementId: 'STLID-SHP-0914', channel: 'Shopify', orderId: 'SHP-8765-0099', sku: 'YOGA-MAT-PRO', productName: 'Yoga Mat Pro', amountType: 'Refund', amount: -65.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-13' },
  // ── 差异调整（Stripe 手工调整）────────────────────────────────────────── 
  { id: 'sl_009', settlementId: 'STLID-SHP-0914', channel: 'Shopify', amountType: 'Adjustment', amount: -42.50, currency: 'USD', transactionDate: '2026-09-16' },
];

// ─── TikTok Shop 结算明细 ─────────────────────────────────────────────────────

const tiktokLines_0914: PlatformSettlementLine[] = [
  // ── 批量销售汇总 ──────────────────────────────────────────────────────────
  { id: 'tl_001', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: '(298 笔订单汇总)', amountType: 'Sale', amount: 25320.00, currency: 'USD', transactionDate: '2026-09-14' },
  { id: 'tl_002', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: '(298 笔订单汇总)', amountType: 'PlatformCommission', amount: -1266.00, currency: 'USD', transactionDate: '2026-09-14' },
  // ── 代表性单笔订单 ───────────────────────────────────────────────────────
  { id: 'tl_003', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: 'TTK-UK-88421', sku: 'BEAUTY-KIT-02', msku: 'SKU-BK-002', productName: 'Beauty Blender Set', amountType: 'Sale', amount: 32.00, currency: 'USD', quantity: 2, transactionDate: '2026-09-09' },
  { id: 'tl_004', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: 'TTK-UK-88421', sku: 'BEAUTY-KIT-02', msku: 'SKU-BK-002', productName: 'Beauty Blender Set', amountType: 'PlatformCommission', amount: -2.88, currency: 'USD', quantity: 2, transactionDate: '2026-09-09' },
  { id: 'tl_005', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: 'TTK-UK-88421', sku: 'BEAUTY-KIT-02', msku: 'SKU-BK-002', productName: 'Beauty Blender Set', amountType: 'ShippingIncentive', amount: 3.20, currency: 'USD', quantity: 2, transactionDate: '2026-09-09' },
  // ── 广告费扣减 ───────────────────────────────────────────────────────────
  { id: 'tl_006', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', amountType: 'AdvertisingFee', amount: -234.40, currency: 'USD', transactionDate: '2026-09-14' },
  // ── 退款 ────────────────────────────────────────────────────────────────
  { id: 'tl_007', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: 'TTK-UK-76542', sku: 'NAIL-ART-KIT', productName: 'Nail Art Kit', amountType: 'Refund', amount: -28.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-12' },
  { id: 'tl_008', settlementId: 'STLID-TTK-0914', channel: 'TikTok Shop', orderId: 'TTK-UK-76543', sku: 'NAIL-ART-KIT', productName: 'Nail Art Kit', amountType: 'Refund', amount: -28.00, currency: 'USD', quantity: 1, transactionDate: '2026-09-13' },
];

// ─── 结算批次汇总 ─────────────────────────────────────────────────────────────

export const platformSettlementBatches: PlatformSettlementBatch[] = [
  {
    settlementId: 'STLID-AMZ-0914',
    title: 'Amazon Sep 1–14',
    channel: 'Amazon',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    depositDate: '2026-09-16',
    totalDeposit: 52400.00,
    currency: 'USD',
    lineCount: amazonLines_0914.length,
    lines: amazonLines_0914,
  },
  {
    settlementId: 'STLID-AMZ-0831',
    title: 'Amazon Aug 16–31',
    channel: 'Amazon',
    periodStart: '2026-08-16',
    periodEnd: '2026-08-31',
    depositDate: '2026-09-02',
    totalDeposit: 54840.00,
    currency: 'USD',
    lineCount: 18,
    lines: [], // 历史批次，不展示明细
  },
  {
    settlementId: 'STLID-SHP-0914',
    title: 'Shopify Sep 8–14',
    channel: 'Shopify',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    depositDate: '2026-09-16',
    totalDeposit: 38777.50,    // 有 $42.50 差异
    currency: 'USD',
    lineCount: shopifyLines_0914.length,
    lines: shopifyLines_0914,
  },
  {
    settlementId: 'STLID-SHP-0907',
    title: 'Shopify Sep 1–7',
    channel: 'Shopify',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    depositDate: '2026-09-09',
    totalDeposit: 36500.60,
    currency: 'USD',
    lineCount: 12,
    lines: [],
  },
  {
    settlementId: 'STLID-TTK-0914',
    title: 'TikTok Sep 8–14',
    channel: 'TikTok Shop',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-14',
    depositDate: undefined,    // 处理中，未到账
    totalDeposit: 23139.60,
    currency: 'USD',
    lineCount: tiktokLines_0914.length,
    lines: tiktokLines_0914,
  },
];

// ─── 多渠道多店铺（Store Registry）────────────────────────────────────────────

export type ChannelType = 'amazon' | 'shopify' | 'tiktok' | 'walmart' | 'manual';

export type StoreInfo = {
  storeId: string;
  storeName: string;
  storeCode: string;           // 简码，如 US-AMZ
  channel: string;
  channelType: ChannelType;
  currency: string;
  region: string;
  status: 'active' | 'pending' | 'error';
  lastSync: string;
  pendingAmount: number;       // 该店铺当前待到账金额
};

export const stores: StoreInfo[] = [
  { storeId: 'amz-us-01', storeName: 'US Amazon',        storeCode: 'US-AMZ', channel: 'Amazon',      channelType: 'amazon',  currency: 'USD', region: 'US', status: 'active',  lastSync: '2026-09-21 14:30', pendingAmount: 0 },
  { storeId: 'shp-us-01', storeName: 'US Shopify Store', storeCode: 'US-SHP', channel: 'Shopify',     channelType: 'shopify', currency: 'USD', region: 'US', status: 'active',  lastSync: '2026-09-21 14:25', pendingAmount: 0 },
  { storeId: 'ttk-uk-01', storeName: 'UK TikTok Shop',   storeCode: 'UK-TTK', channel: 'TikTok Shop', channelType: 'tiktok',  currency: 'USD', region: 'UK', status: 'active',  lastSync: '2026-09-21 14:20', pendingAmount: 23139.60 },
  { storeId: 'wmt-us-01', storeName: 'US Walmart',       storeCode: 'US-WMT', channel: 'Walmart',     channelType: 'walmart', currency: 'USD', region: 'US', status: 'pending', lastSync: '2026-09-21 14:00', pendingAmount: 16692.00 },
];

// ─── Shopify Payout Lines ─────────────────────────────────────────────────────
// 对应 Shopify 的 Payout Report / Stripe Balance Transaction 格式
// 参考字段：Date | Order/Payout ID | Type | Gross | Discount | Refund | Shipping | Tax | Total | Fee | Net

export type ShopifyTxnType = 'charge' | 'refund' | 'adjustment' | 'payout' | 'fee';

export type ShopifyPayoutLine = {
  id: string;
  payoutId: string;             // Stripe Payout ID
  date: string;
  orderId?: string;             // 关联 Shopify 订单号
  transactionId: string;        // Stripe Transaction ID
  type: ShopifyTxnType;
  typeLabel: string;            // 中文类型
  currency: string;
  /** 商品销售额（含折扣前） */
  grossSales: number;
  /** 折扣 */
  discountAmount: number;
  /** 退款 */
  returnAmount: number;
  /** 运费收入 */
  shippingAmount: number;
  /** 税费 */
  taxAmount: number;
  /** 总计 = grossSales + discount + return + shipping + tax */
  totalAmount: number;
  /** Stripe/Shopify 支付手续费 */
  feeAmount: number;
  /** 净额 = total - fee */
  netAmount: number;
  status: 'paid' | 'pending' | 'in_transit';
};

export const shopifyPayoutLines: ShopifyPayoutLine[] = [
  // ── 正常销售订单 ─────────────────────────────────────────────────────────
  { id: 'shp_l_001', payoutId: 'po_2026091401', date: '2026-09-08', orderId: 'SHP-8842-0001', transactionId: 'txn_ch_001', type: 'charge',     typeLabel: '销售收款', currency: 'USD', grossSales: 65.00, discountAmount: -5.00, returnAmount: 0, shippingAmount: 8.99, taxAmount: 5.84, totalAmount: 74.83, feeAmount: -2.17, netAmount: 72.66, status: 'paid' },
  { id: 'shp_l_002', payoutId: 'po_2026091401', date: '2026-09-08', orderId: 'SHP-8843-0002', transactionId: 'txn_ch_002', type: 'charge',     typeLabel: '销售收款', currency: 'USD', grossSales: 128.00, discountAmount: 0, returnAmount: 0, shippingAmount: 12.99, taxAmount: 11.25, totalAmount: 152.24, feeAmount: -4.41, netAmount: 147.83, status: 'paid' },
  { id: 'shp_l_003', payoutId: 'po_2026091401', date: '2026-09-09', orderId: 'SHP-8844-0003', transactionId: 'txn_ch_003', type: 'charge',     typeLabel: '销售收款', currency: 'USD', grossSales: 45.99, discountAmount: -3.00, returnAmount: 0, shippingAmount: 0, taxAmount: 3.83, totalAmount: 46.82, feeAmount: -1.36, netAmount: 45.46, status: 'paid' },
  { id: 'shp_l_004', payoutId: 'po_2026091401', date: '2026-09-10', orderId: 'SHP-8845-0004', transactionId: 'txn_ch_004', type: 'charge',     typeLabel: '销售收款', currency: 'USD', grossSales: 89.00, discountAmount: -10.00, returnAmount: 0, shippingAmount: 8.99, taxAmount: 7.20, totalAmount: 95.19, feeAmount: -2.76, netAmount: 92.43, status: 'paid' },
  // ── 退款 ─────────────────────────────────────────────────────────────────
  { id: 'shp_l_005', payoutId: 'po_2026091401', date: '2026-09-11', orderId: 'SHP-8765-0098', transactionId: 'txn_rf_001', type: 'refund',     typeLabel: '客户退款', currency: 'USD', grossSales: 0, discountAmount: 0, returnAmount: -85.00, shippingAmount: 0, taxAmount: -7.23, totalAmount: -92.23, feeAmount: 2.44, netAmount: -89.79, status: 'paid' },
  { id: 'shp_l_006', payoutId: 'po_2026091401', date: '2026-09-13', orderId: 'SHP-8766-0099', transactionId: 'txn_rf_002', type: 'refund',     typeLabel: '客户退款', currency: 'USD', grossSales: 0, discountAmount: 0, returnAmount: -65.00, shippingAmount: 0, taxAmount: -5.53, totalAmount: -70.53, feeAmount: 1.88, netAmount: -68.65, status: 'paid' },
  // ── Stripe 手续费单独行 ───────────────────────────────────────────────────
  { id: 'shp_l_007', payoutId: 'po_2026091401', date: '2026-09-14', transactionId: 'txn_fee_001',                          type: 'fee',        typeLabel: 'Stripe手续费', currency: 'USD', grossSales: 0, discountAmount: 0, returnAmount: 0, shippingAmount: 0, taxAmount: 0, totalAmount: -1194.80, feeAmount: -1194.80, netAmount: -1194.80, status: 'paid' },
  // ── 差异调整 ─────────────────────────────────────────────────────────────
  { id: 'shp_l_008', payoutId: 'po_2026091401', date: '2026-09-16', transactionId: 'txn_adj_001',                          type: 'adjustment', typeLabel: '账务调整', currency: 'USD', grossSales: 0, discountAmount: 0, returnAmount: 0, shippingAmount: 0, taxAmount: 0, totalAmount: -42.50, feeAmount: 0, netAmount: -42.50, status: 'paid' },
  // ── 打款记录 ─────────────────────────────────────────────────────────────
  { id: 'shp_l_009', payoutId: 'po_2026091401', date: '2026-09-16', transactionId: 'po_2026091401',                        type: 'payout',     typeLabel: '银行打款', currency: 'USD', grossSales: 0, discountAmount: 0, returnAmount: 0, shippingAmount: 0, taxAmount: 0, totalAmount: 38777.50, feeAmount: 0, netAmount: 38777.50, status: 'paid' },
];

// Shopify 批次汇总（单个 Payout 周期）
export type ShopifyPayoutBatch = {
  payoutId: string;
  storeId: string;
  periodStart: string;
  periodEnd: string;
  payoutDate?: string;
  grossSales: number;
  totalFees: number;
  totalRefunds: number;
  netPayout: number;
  currency: string;
  lineCount: number;
  status: 'paid' | 'in_transit' | 'pending';
  lines: ShopifyPayoutLine[];
};

export const shopifyPayoutBatches: ShopifyPayoutBatch[] = [
  {
    payoutId: 'po_2026091401', storeId: 'shp-us-01',
    periodStart: '2026-09-08', periodEnd: '2026-09-14',
    payoutDate: '2026-09-16',
    grossSales: 41200.00, totalFees: -1194.80, totalRefunds: -1185.20, netPayout: 38777.50,
    currency: 'USD', lineCount: shopifyPayoutLines.length, status: 'paid',
    lines: shopifyPayoutLines,
  },
  {
    payoutId: 'po_2026090701', storeId: 'shp-us-01',
    periodStart: '2026-09-01', periodEnd: '2026-09-07',
    payoutDate: '2026-09-09',
    grossSales: 38600.00, totalFees: -1119.40, totalRefunds: -980.00, netPayout: 36500.60,
    currency: 'USD', lineCount: 24, status: 'paid',
    lines: [],
  },
];

// ─── TikTok Settlement Lines ──────────────────────────────────────────────────
// 对应 TikTok Shop Seller Center 的 Settlement Report 格式
// 参考字段：店铺编号 | 订单号 | SKU | 数量 | 交货收入 | 货运金额 | 信用金额 | 总金额 | 利润 | 状态

export type TikTokSettlementLine = {
  id: string;
  settlementId: string;
  storeId: string;
  storeCode: string;
  orderId: string;
  subOrderId?: string;
  productId: string;
  sku: string;
  msku?: string;
  productName: string;
  quantity: number;
  /** 交货收入（买家实付商品金额） */
  deliveryIncome: number;
  /** 货运运营金额（平台配送补贴/扣减） */
  shippingOpsAmount: number;
  /** 信用金额（平台促销补贴） */
  creditAmount: number;
  /** 平台佣金 */
  commission: number;
  /** 总结算金额 = deliveryIncome + shippingOps + credit - commission */
  totalSettlement: number;
  /** OMS 分摊成本后利润 */
  profit?: number;
  currency: string;
  orderDate: string;
  settlementDate: string;
  status: '已结算' | '结算中' | '待核实';
};

export const tiktokSettlementLines: TikTokSettlementLine[] = [
  { id: 'ttk_l_001', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-88421', productId: 'PROD-BK-002', sku: 'BEAUTY-KIT-02', msku: 'SKU-BK-002', productName: 'Beauty Blender Set', quantity: 2, deliveryIncome: 32.00, shippingOpsAmount: 3.20, creditAmount: 0, commission: -2.88, totalSettlement: 32.32, profit: 8.40, currency: 'USD', orderDate: '2026-09-09', settlementDate: '2026-09-19', status: '结算中' },
  { id: 'ttk_l_002', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-88502', productId: 'PROD-NA-003', sku: 'NAIL-ART-KIT', msku: 'SKU-NA-003', productName: 'Nail Art Kit', quantity: 1, deliveryIncome: 28.00, shippingOpsAmount: 2.80, creditAmount: 1.50, commission: -2.52, totalSettlement: 29.78, profit: 7.20, currency: 'USD', orderDate: '2026-09-10', settlementDate: '2026-09-19', status: '结算中' },
  { id: 'ttk_l_003', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-88603', productId: 'PROD-BK-002', sku: 'BEAUTY-KIT-02', msku: 'SKU-BK-002', productName: 'Beauty Blender Set', quantity: 1, deliveryIncome: 16.00, shippingOpsAmount: 1.60, creditAmount: 0, commission: -1.44, totalSettlement: 16.16, profit: 4.20, currency: 'USD', orderDate: '2026-09-10', settlementDate: '2026-09-19', status: '结算中' },
  { id: 'ttk_l_004', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-88741', productId: 'PROD-MF-004', sku: 'MINI-FAN-PORT', msku: 'SKU-MF-004', productName: 'Mini Fan Portable', quantity: 3, deliveryIncome: 45.00, shippingOpsAmount: 4.50, creditAmount: 2.25, commission: -4.05, totalSettlement: 47.70, profit: 12.80, currency: 'USD', orderDate: '2026-09-11', settlementDate: '2026-09-19', status: '结算中' },
  // ── 退款订单 ─────────────────────────────────────────────────────────────
  { id: 'ttk_l_005', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-76542', productId: 'PROD-NA-003', sku: 'NAIL-ART-KIT', msku: 'SKU-NA-003', productName: 'Nail Art Kit', quantity: 1, deliveryIncome: -28.00, shippingOpsAmount: 0, creditAmount: 0, commission: 2.52, totalSettlement: -25.48, profit: -18.00, currency: 'USD', orderDate: '2026-09-06', settlementDate: '2026-09-19', status: '已结算' },
  { id: 'ttk_l_006', settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01', storeCode: 'UK-TTK', orderId: 'TTK-UK-76543', productId: 'PROD-NA-003', sku: 'NAIL-ART-KIT', msku: 'SKU-NA-003', productName: 'Nail Art Kit', quantity: 1, deliveryIncome: -28.00, shippingOpsAmount: 0, creditAmount: 0, commission: 2.52, totalSettlement: -25.48, profit: -18.00, currency: 'USD', orderDate: '2026-09-07', settlementDate: '2026-09-19', status: '已结算' },
];

export type TikTokSettlementBatch = {
  settlementId: string;
  storeId: string;
  periodStart: string;
  periodEnd: string;
  depositDate?: string;
  totalSettlement: number;
  currency: string;
  lineCount: number;
  status: '结算中' | '已到账' | '待确认';
  lines: TikTokSettlementLine[];
};

export const tiktokSettlementBatches: TikTokSettlementBatch[] = [
  {
    settlementId: 'STLID-TTK-0914', storeId: 'ttk-uk-01',
    periodStart: '2026-09-08', periodEnd: '2026-09-14',
    depositDate: undefined,
    totalSettlement: 23139.60, currency: 'USD',
    lineCount: tiktokSettlementLines.length, status: '结算中',
    lines: tiktokSettlementLines,
  },
];
