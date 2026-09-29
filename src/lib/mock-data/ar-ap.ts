// 应收账款（AR）/ 应付账款（AP）mock 数据

// ─── 渠道应收（Channel AR）────────────────────────────────────────────────────
// 平台代收货款后、到结算周期再回款给商家，这笔待回款即"渠道应收"

export type ChannelArStatus = '处理中' | '待到账' | '已到账' | '差异' | '已核销';
export type ChannelSource = 'Amazon' | 'Shopify' | 'TikTok Shop' | 'Walmart' | '手工订单' | 'EDI';
export type ErpSyncStatus = 'synced' | 'pending' | 'error' | 'na';

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
  /** 发票号 */
  invoiceNo: string;
  /** 客户名称 */
  customer: string;
  /** 渠道 */
  channel: string;
  /** 发票日期 */
  invoiceDate: string;
  /** 到期日 */
  dueDate: string;
  /** 发票金额 */
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

export type ApRow = {
  id: string;
  /** 账单号 */
  billNo: string;
  /** 供应商 */
  vendor: string;
  /** 费用类型 */
  category: string;
  /** 账单日期 */
  billDate: string;
  /** 到期日 */
  dueDate: string;
  /** 账单金额 */
  billAmount: number;
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
  {
    id: 'ap_001',
    billNo: 'SB-INV-2026090001',
    vendor: 'ShipBob US',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 5480.00,
    paidAmount: 0,
    balanceDue: 5480.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
  },
  {
    id: 'ap_002',
    billNo: 'XPO-2026-09-EWR-0012',
    vendor: 'XPO Logistics',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 4280.00,
    paidAmount: 0,
    balanceDue: 4280.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
  },
  {
    id: 'ap_003',
    billNo: 'SB-UK-INV-2026090003',
    vendor: 'ShipBob UK',
    category: '仓储费',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    billAmount: 3080.00,
    paidAmount: 0,
    balanceDue: 3080.00,
    currency: 'USD',
    status: '待审批',
    overdueDays: 0,
    note: '汇率按 2026-09-01 英镑兑美元 1.27 换算，待 Finance Admin 确认',
  },
  {
    id: 'ap_004',
    billNo: 'FDX-2026-09-0482',
    vendor: 'FedEx',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 8420.00,
    paidAmount: 0,
    balanceDue: 8420.00,
    currency: 'USD',
    status: '已审批',
    overdueDays: 0,
  },
  {
    id: 'ap_005',
    billNo: 'UPS-ACC-SEP14-2026',
    vendor: 'UPS',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 6840.00,
    paidAmount: 0,
    balanceDue: 6840.00,
    currency: 'USD',
    status: '待审批',
    overdueDays: 0,
  },
  {
    id: 'ap_006',
    billNo: 'RM-INV-SEP-UK-001',
    vendor: 'Royal Mail',
    category: '运输费',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    billAmount: 3360.00,
    paidAmount: 0,
    balanceDue: 3360.00,
    currency: 'USD',
    status: '待付款',
    overdueDays: 0,
  },
  {
    id: 'ap_007',
    billNo: 'AMZ-ACCT-2026-09',
    vendor: 'Amazon',
    category: '平台费',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    billAmount: 2480.80,
    paidAmount: 2480.80,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
  },
  {
    id: 'ap_008',
    billNo: 'TTS-FEE-SEP2026',
    vendor: 'TikTok Shop',
    category: '平台费',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    billAmount: 1800.00,
    paidAmount: 1800.00,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
  },
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
    note: '实际税率高于预期差额 $240 待核实',
  },
  {
    id: 'ap_010',
    billNo: 'SB-INV-2026080001',
    vendor: 'ShipBob US',
    category: '仓储费',
    billDate: '2026-08-01',
    dueDate: '2026-08-31',
    billAmount: 5200.00,
    paidAmount: 5200.00,
    balanceDue: 0,
    currency: 'USD',
    status: '已付款',
    overdueDays: 0,
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
