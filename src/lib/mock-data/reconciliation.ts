// 对账模块 mock 数据

export type ReconcileType = 'payment' | 'inventory' | 'accounting' | 'fee';
export type ReconcileStatus = '已匹配' | '差异' | '仅OMS' | '仅对方' | '已核销';

export type ReconcileItem = {
  id: string;
  /** 对账类型 */
  type: ReconcileType;
  /** 对账周期 */
  period: string;
  /** OMS 侧单号 */
  omsRef: string;
  /** 对方系统单号（渠道/网关/ERP） */
  counterRef: string;
  /** 对方系统名称 */
  counterSystem: string;
  /** OMS 金额 / 数量 */
  omsValue: number;
  /** 对方金额 / 数量 */
  counterValue: number;
  /** 差异值（omsValue - counterValue） */
  diffValue: number;
  /** 单位（USD / 件） */
  unit: string;
  /** 状态 */
  status: ReconcileStatus;
  /** 差异说明 */
  diffNote?: string;
  /** 核销操作人 */
  resolvedBy?: string;
  /** 核销时间 */
  resolvedAt?: string;
  /** 创建时间 */
  createdAt: string;
};

// ─── 费用对账专用类型 ──────────────────────────────────────────────────────────
// OMS 根据订单/运单计算出预计费用，与平台/3PL/承运商实际账单进行比对

export type FeeCategory = 'platform' | 'warehouse' | 'carrier' | 'payment' | 'other';

export type FeeReconcileItem = {
  id: string;
  /** 费用大类 */
  category: FeeCategory;
  /** 费用描述 */
  description: string;
  /** 对账周期 */
  period: string;
  /** 供应商 / 渠道 */
  vendor: string;
  /** 来源系统（渠道报告、3PL 账单、承运商发票…） */
  sourceSystem: string;
  /** OMS 预计费用 */
  omsAmount: number;
  /** 实际账单金额 */
  actualAmount: number;
  /** 差异 = actualAmount - omsAmount（正数表示实际比预计高） */
  diffAmount: number;
  /** 差异率 */
  diffRate: number;
  /** 币种 */
  currency: string;
  /** 状态 */
  status: ReconcileStatus;
  /** 差异原因 */
  diffNote?: string;
  /** 关联 AP 账单号 */
  apBillNo?: string;
  /** 核销操作人 */
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
};

export type FeeReconcileKpi = {
  /** 费用对账条目总数 */
  totalItems: number;
  /** 已匹配条目数 */
  matched: number;
  /** 有差异条目数 */
  diffCount: number;
  /** 差异总金额 */
  diffAmount: number;
  /** 差异占总账单比例 */
  diffRate: number;
  currency: string;
};

export type ReconcileKpi = {
  totalItems: number;
  matched: number;
  diffCount: number;
  diffAmount: number;
  pendingCount: number;
  currency: string;
};

export const reconcileKpi: ReconcileKpi = {
  totalItems: 18,
  matched: 12,
  diffCount: 4,
  diffAmount: 284.50,
  pendingCount: 2,
  currency: 'USD',
};

export const reconcileItems: ReconcileItem[] = [
  // ── 支付对账 ──
  {
    id: 'rec_001',
    type: 'payment',
    period: '2026-09-14',
    omsRef: 'STL-SHP-20260914',
    counterRef: 'STRIPE-PAYOUT-SEP14',
    counterSystem: 'Stripe',
    omsValue: 38820.00,
    counterValue: 38777.50,
    diffValue: 42.50,
    unit: 'USD',
    status: '差异',
    diffNote: 'OMS 与 Stripe 对账差异 $42.50，疑似 1 笔退款时序不同步',
    createdAt: '2026-09-15 09:00',
  },
  {
    id: 'rec_002',
    type: 'payment',
    period: '2026-09-14',
    omsRef: 'STL-AMZ-20260914',
    counterRef: 'AMZ-SETTLEMENT-SEP14',
    counterSystem: 'Amazon Seller Central',
    omsValue: 52400.00,
    counterValue: 52400.00,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-15 09:01',
  },
  {
    id: 'rec_003',
    type: 'payment',
    period: '2026-09-14',
    omsRef: 'STL-TTK-20260914',
    counterRef: 'TTK-SETTLE-20260914',
    counterSystem: 'TikTok Shop',
    omsValue: 23139.60,
    counterValue: 23139.60,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-15 09:02',
  },
  {
    id: 'rec_004',
    type: 'payment',
    period: '2026-09-07',
    omsRef: 'STL-SHP-20260907',
    counterRef: 'STRIPE-PAYOUT-SEP07',
    counterSystem: 'Stripe',
    omsValue: 36500.60,
    counterValue: 36500.60,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-08 09:00',
  },
  {
    id: 'rec_005',
    type: 'payment',
    period: '2026-09-02',
    omsRef: 'STL-AMZ-20260831',
    counterRef: 'AMZ-SETTLEMENT-AUG31',
    counterSystem: 'Amazon Seller Central',
    omsValue: 54840.00,
    counterValue: 54598.20,
    diffValue: 241.80,
    unit: 'USD',
    status: '已核销',
    diffNote: 'Amazon FBA 仓储费调整导致差异，已确认核销',
    resolvedBy: 'Finance Admin',
    resolvedAt: '2026-09-05 14:30',
    createdAt: '2026-09-03 09:00',
  },

  // ── 库存对账 ──
  {
    id: 'rec_006',
    type: 'inventory',
    period: '2026-09-14',
    omsRef: 'INV-LAX-20260914',
    counterRef: 'WMS-LAX-SNAPSHOT-0914',
    counterSystem: 'ShipBob WMS (LAX)',
    omsValue: 1204,
    counterValue: 1204,
    diffValue: 0,
    unit: '件',
    status: '已匹配',
    createdAt: '2026-09-14 18:00',
  },
  {
    id: 'rec_007',
    type: 'inventory',
    period: '2026-09-14',
    omsRef: 'INV-EWR-20260914',
    counterRef: 'WMS-EWR-SNAPSHOT-0914',
    counterSystem: 'XPO WMS (EWR)',
    omsValue: 827,
    counterValue: 819,
    diffValue: 8,
    unit: '件',
    status: '差异',
    diffNote: 'OMS 库存比 WMS 多 8 件，可能存在盘点延迟或损耗未同步',
    createdAt: '2026-09-14 18:01',
  },
  {
    id: 'rec_008',
    type: 'inventory',
    period: '2026-09-14',
    omsRef: 'INV-LON-20260914',
    counterRef: 'WMS-LON-SNAPSHOT-0914',
    counterSystem: 'ShipBob WMS (London)',
    omsValue: 312,
    counterValue: 312,
    diffValue: 0,
    unit: '件',
    status: '已匹配',
    createdAt: '2026-09-14 18:02',
  },
  {
    id: 'rec_009',
    type: 'inventory',
    period: '2026-09-07',
    omsRef: 'INV-LAX-20260907',
    counterRef: 'WMS-LAX-SNAPSHOT-0907',
    counterSystem: 'ShipBob WMS (LAX)',
    omsValue: 1156,
    counterValue: 1156,
    diffValue: 0,
    unit: '件',
    status: '已匹配',
    createdAt: '2026-09-07 18:00',
  },

  // ── 财务对账（OMS Journal vs ERP GL） ──
  {
    id: 'rec_010',
    type: 'accounting',
    period: '2026-08',
    omsRef: 'OMS-GL-AUG-REVENUE',
    counterRef: 'NS-GL-AUG-4000',
    counterSystem: 'NetSuite GL',
    omsValue: 214680,
    counterValue: 214680,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-02 10:00',
  },
  {
    id: 'rec_011',
    type: 'accounting',
    period: '2026-08',
    omsRef: 'OMS-GL-AUG-COGS',
    counterRef: 'NS-GL-AUG-5000',
    counterSystem: 'NetSuite GL',
    omsValue: 140800,
    counterValue: 140800,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-02 10:01',
  },
  {
    id: 'rec_012',
    type: 'accounting',
    period: '2026-08',
    omsRef: 'OMS-GL-AUG-FREIGHT',
    counterRef: 'NS-GL-AUG-6100',
    counterSystem: 'NetSuite GL',
    omsValue: 18620,
    counterValue: 18482,
    diffValue: 138,
    unit: 'USD',
    status: '差异',
    diffNote: '运费科目差异 $138，疑似 2 笔 FedEx 账单分类偏差，待财务核实',
    createdAt: '2026-09-02 10:02',
  },
  {
    id: 'rec_013',
    type: 'accounting',
    period: '2026-08',
    omsRef: 'OMS-GL-AUG-WAREHOUSE',
    counterRef: 'NS-GL-AUG-6200',
    counterSystem: 'NetSuite GL',
    omsValue: 12840,
    counterValue: 12840,
    diffValue: 0,
    unit: 'USD',
    status: '已匹配',
    createdAt: '2026-09-02 10:03',
  },
  // 仅 OMS 有，ERP 未同步
  {
    id: 'rec_014',
    type: 'accounting',
    period: '2026-09',
    omsRef: 'OMS-GL-SEP-REVENUE',
    counterRef: '—',
    counterSystem: 'NetSuite GL',
    omsValue: 228400,
    counterValue: 0,
    diffValue: 228400,
    unit: 'USD',
    status: '仅OMS',
    diffNote: '9 月会计分录尚未同步至 NetSuite，月结完成后自动推送',
    createdAt: '2026-09-15 09:00',
  },
  {
    id: 'rec_015',
    type: 'accounting',
    period: '2026-09',
    omsRef: 'OMS-GL-SEP-COGS',
    counterRef: '—',
    counterSystem: 'NetSuite GL',
    omsValue: 148600,
    counterValue: 0,
    diffValue: 148600,
    unit: 'USD',
    status: '仅OMS',
    diffNote: '9 月 COGS 尚未同步至 NetSuite',
    createdAt: '2026-09-15 09:01',
  },
];

// ─── 费用对账 Mock 数据 ───────────────────────────────────────────────────────

export const feeReconcileKpi: FeeReconcileKpi = {
  totalItems: 10,
  matched: 4,
  diffCount: 6,
  diffAmount: 964.80,
  diffRate: 1.8,   // 总账单约 $53,600，差异占 1.8%
  currency: 'USD',
};

export const feeCategoryConfig: Record<FeeCategory, { label: string; cls: string }> = {
  platform:  { label: '平台佣金',   cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  warehouse: { label: '仓储费',     cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  carrier:   { label: '物流费',     cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  payment:   { label: '支付手续费', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  other:     { label: '其他费用',   cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
};

export const feeReconcileItems: FeeReconcileItem[] = [
  // ── 平台佣金 ──────────────────────────────────────────────────────
  {
    id: 'fee_001',
    category: 'platform',
    description: 'Amazon 平台佣金 + FBA 费',
    period: '2026-09-01 ~ 09-14',
    vendor: 'Amazon',
    sourceSystem: 'Amazon Settlement Report',
    omsAmount: 10200.00,   // OMS 按约定费率计算
    actualAmount: 10396.80,
    diffAmount: 196.80,
    diffRate: 1.93,
    currency: 'USD',
    status: '差异',
    diffNote: 'Amazon 实际扣除佣金比 OMS 预计高 $196.80，疑似部分 SKU 适用更高费率，需对照 Amazon Fee Preview 逐 SKU 核查',
    apBillNo: 'AMZ-ACCT-2026-09',
    createdAt: '2026-09-15 09:00',
  },
  {
    id: 'fee_002',
    category: 'platform',
    description: 'TikTok Shop 佣金',
    period: '2026-09-08 ~ 09-14',
    vendor: 'TikTok Shop',
    sourceSystem: 'TikTok Shop Seller Center',
    omsAmount: 1200.00,
    actualAmount: 1266.00,
    diffAmount: 66.00,
    diffRate: 5.50,
    currency: 'USD',
    status: '差异',
    diffNote: 'TikTok 实际费率 5.5%，OMS 配置费率 5.0%，差异 $66。请更新 OMS 渠道费率配置',
    apBillNo: 'TTS-FEE-SEP2026',
    createdAt: '2026-09-15 09:01',
  },
  {
    id: 'fee_003',
    category: 'platform',
    description: 'Shopify / Stripe 交易手续费',
    period: '2026-09-08 ~ 09-14',
    vendor: 'Shopify / Stripe',
    sourceSystem: 'Stripe Dashboard',
    omsAmount: 1178.00,
    actualAmount: 1194.80,
    diffAmount: 16.80,
    diffRate: 1.43,
    currency: 'USD',
    status: '已核销',
    diffNote: '差异 $16.80 来自 1 笔国际卡手续费（3.5% 费率），已确认核销',
    resolvedBy: 'Finance Admin',
    resolvedAt: '2026-09-17 11:20',
    createdAt: '2026-09-16 09:00',
  },
  {
    id: 'fee_004',
    category: 'platform',
    description: 'Walmart 平台佣金',
    period: '2026-09-01 ~ 09-14',
    vendor: 'Walmart',
    sourceSystem: 'Walmart Seller Center',
    omsAmount: 1488.00,
    actualAmount: 1488.00,
    diffAmount: 0,
    diffRate: 0,
    currency: 'USD',
    status: '已匹配',
    createdAt: '2026-09-15 10:00',
  },

  // ── 仓储费（3PL）─────────────────────────────────────────────────
  {
    id: 'fee_005',
    category: 'warehouse',
    description: 'ShipBob US（LAX）9月仓储 + 操作费',
    period: '2026-09',
    vendor: 'ShipBob US',
    sourceSystem: 'ShipBob Invoice',
    omsAmount: 5418.00,    // OMS 按 1,204件 × 单位存储费率估算
    actualAmount: 5480.00,
    diffAmount: 62.00,
    diffRate: 1.14,
    currency: 'USD',
    status: '差异',
    diffNote: '差异 $62 疑似 8 件库存差异（对账 rec_007）引发额外操作费，建议与 ShipBob 客服确认',
    apBillNo: 'SB-INV-2026090001',
    createdAt: '2026-09-03 09:00',
  },
  {
    id: 'fee_006',
    category: 'warehouse',
    description: 'XPO WMS（EWR）9月仓储费',
    period: '2026-09',
    vendor: 'XPO Logistics',
    sourceSystem: 'XPO Invoice',
    omsAmount: 4200.00,
    actualAmount: 4280.00,
    diffAmount: 80.00,
    diffRate: 1.90,
    currency: 'USD',
    status: '差异',
    diffNote: '超额存储附加费 $80，OMS 未配置该 SKU 的超额存储规则',
    apBillNo: 'XPO-2026-09-EWR-0012',
    createdAt: '2026-09-03 09:01',
  },
  {
    id: 'fee_007',
    category: 'warehouse',
    description: 'ShipBob UK（London）9月仓储费',
    period: '2026-09',
    vendor: 'ShipBob UK',
    sourceSystem: 'ShipBob UK Invoice',
    omsAmount: 2950.00,    // 按 GBP 1.24 换算
    actualAmount: 3080.00,
    diffAmount: 130.00,
    diffRate: 4.41,
    currency: 'USD',
    status: '差异',
    diffNote: '汇率波动（GBP 1.24 → 1.27），差异 $130；待 Finance Admin 审批确认汇率调整',
    apBillNo: 'SB-UK-INV-2026090003',
    createdAt: '2026-09-03 09:02',
  },

  // ── 物流 / 承运商费用 ─────────────────────────────────────────────
  {
    id: 'fee_008',
    category: 'carrier',
    description: 'FedEx 9月运费',
    period: '2026-09-01 ~ 09-14',
    vendor: 'FedEx',
    sourceSystem: 'FedEx Invoice',
    omsAmount: 8200.00,
    actualAmount: 8420.00,
    diffAmount: 220.00,
    diffRate: 2.68,
    currency: 'USD',
    status: '已核销',
    diffNote: '燃油附加费 $140 + 住宅附加费 $80，OMS 路由规则未含该类附加费，已确认核销并更新费率配置',
    apBillNo: 'FDX-2026-09-0482',
    resolvedBy: 'Ops Manager',
    resolvedAt: '2026-09-18 14:00',
    createdAt: '2026-09-15 08:00',
  },
  {
    id: 'fee_009',
    category: 'carrier',
    description: 'UPS 9月运费',
    period: '2026-09-01 ~ 09-14',
    vendor: 'UPS',
    sourceSystem: 'UPS Billing Center',
    omsAmount: 6600.00,
    actualAmount: 6840.00,
    diffAmount: 240.00,
    diffRate: 3.64,
    currency: 'USD',
    status: '差异',
    diffNote: '住宅地址附加费 $160 + 超尺寸附加费 $80，需核查涉及的 23 个运单明细',
    apBillNo: 'UPS-ACC-SEP14-2026',
    createdAt: '2026-09-15 08:01',
  },
  {
    id: 'fee_010',
    category: 'carrier',
    description: 'Royal Mail 9月运费（UK）',
    period: '2026-09-01 ~ 09-14',
    vendor: 'Royal Mail',
    sourceSystem: 'Royal Mail Invoice',
    omsAmount: 3360.00,
    actualAmount: 3360.00,
    diffAmount: 0,
    diffRate: 0,
    currency: 'USD',
    status: '已匹配',
    apBillNo: 'RM-INV-SEP-UK-001',
    createdAt: '2026-09-15 08:02',
  },
];
