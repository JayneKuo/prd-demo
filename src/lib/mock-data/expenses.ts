// 费用管理 mock 数据

export type ExpenseType =
  | 'warehouse'    // 仓储费（3PL 月账单）
  | 'freight'      // 运输费（Carrier 账单）
  | 'platform'     // 平台费（Amazon FBA、Shopify App 等）
  | 'payment'      // 支付手续费
  | 'return'       // 退货处理费
  | 'other';       // 其他

export type ExpenseStatus =
  | '待审批'
  | '已审批'
  | '待付款'
  | '已付款'
  | '有争议';

export type CostAllocationMethod =
  | 'order'      // 直接归属某订单
  | 'weight'     // 按重量分摊
  | 'volume'     // 按体积分摊
  | 'quantity'   // 按数量分摊
  | 'equal'      // 平均分摊
  | 'manual';    // 手动分配

/** 费用行 */
export type ExpenseRow = {
  id: string;
  /** 费用单号 */
  expenseNo: string;
  /** 费用类型 */
  type: ExpenseType;
  /** 来源（供应商/承运商/平台名称） */
  vendor: string;
  /** 原始账单号 */
  vendorBillNo?: string;
  /** 费用描述 */
  description: string;
  /** 关联仓库 */
  warehouse?: string;
  /** 关联渠道 */
  channel?: string;
  /** 费用金额 */
  amount: number;
  /** 币种 */
  currency: string;
  /** 账单日期 */
  billDate: string;
  /** 到期付款日 */
  dueDate: string;
  /** 实际付款日 */
  paidAt?: string;
  /** 状态 */
  status: ExpenseStatus;
  /** 成本分摊方式 */
  allocationMethod: CostAllocationMethod;
  /** 是否已分摊到订单 */
  allocated: boolean;
  /** 关联订单数（分摊后） */
  allocatedOrderCount?: number;
  /** 期间（月份标识，如 2026-09） */
  period: string;
  /** 备注 */
  note?: string;
};

/** KPI 汇总 */
export type ExpenseKpi = {
  totalThisMonth: number;
  warehouseTotal: number;
  freightTotal: number;
  platformTotal: number;
  pendingApproval: number;
  pendingPayment: number;
  currency: string;
};

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

export const expenseKpi: ExpenseKpi = {
  totalThisMonth: 38420.80,
  warehouseTotal: 12840.00,
  freightTotal:   18620.00,
  platformTotal:   4280.80,
  pendingApproval: 2,
  pendingPayment:  3,
  currency: 'USD',
};

export const expenseRows: ExpenseRow[] = [
  // ─ 仓储账单 ─
  {
    id: 'exp_001',
    expenseNo: 'EXP-WH-20260901',
    type: 'warehouse',
    vendor: 'ShipBob US',
    vendorBillNo: 'SB-INV-2026090001',
    description: '9月仓储月账单 - US-West-LAX 仓 - 存储+拣货+打包',
    warehouse: 'US-West-LAX',
    amount: 5480.00,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    status: '已付款',
    allocationMethod: 'quantity',
    allocated: true,
    allocatedOrderCount: 486,
    period: '2026-09',
  },
  {
    id: 'exp_002',
    expenseNo: 'EXP-WH-20260902',
    type: 'warehouse',
    vendor: 'XPO Logistics',
    vendorBillNo: 'XPO-2026-09-EWR-0012',
    description: '9月仓储账单 - US-East-EWR 仓 - 存储+入库操作',
    warehouse: 'US-East-EWR',
    amount: 4280.00,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    status: '待付款',
    allocationMethod: 'quantity',
    allocated: true,
    allocatedOrderCount: 312,
    period: '2026-09',
  },
  {
    id: 'exp_003',
    expenseNo: 'EXP-WH-20260903',
    type: 'warehouse',
    vendor: 'ShipBob UK',
    vendorBillNo: 'SB-UK-INV-2026090003',
    description: '9月仓储月账单 - UK-London 仓',
    warehouse: 'UK-London',
    amount: 3080.00,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-30',
    status: '待审批',
    allocationMethod: 'quantity',
    allocated: false,
    period: '2026-09',
    note: '汇率按 2026-09-01 英镑兑美元 1.27 换算',
  },

  // ─ 运输账单 ─
  {
    id: 'exp_004',
    expenseNo: 'EXP-FRT-20260914',
    type: 'freight',
    vendor: 'FedEx',
    vendorBillNo: 'FDX-2026-09-0482',
    description: 'FedEx Ground 9月1-14日运输账单 - 美国本土小包裹',
    amount: 8420.00,
    currency: 'USD',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    status: '已审批',
    allocationMethod: 'weight',
    allocated: true,
    allocatedOrderCount: 724,
    period: '2026-09',
  },
  {
    id: 'exp_005',
    expenseNo: 'EXP-FRT-20260915',
    type: 'freight',
    vendor: 'UPS',
    vendorBillNo: 'UPS-ACC-SEP14-2026',
    description: 'UPS Ground 9月1-14日运输账单 - 含燃油附加费',
    amount: 6840.00,
    currency: 'USD',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    status: '待审批',
    allocationMethod: 'weight',
    allocated: false,
    period: '2026-09',
  },
  {
    id: 'exp_006',
    expenseNo: 'EXP-FRT-20260916',
    type: 'freight',
    vendor: 'Royal Mail',
    vendorBillNo: 'RM-INV-SEP-UK-001',
    description: 'Royal Mail Tracked 24/48 英国本地配送账单',
    amount: 3360.00,
    currency: 'USD',
    billDate: '2026-09-14',
    dueDate: '2026-09-28',
    status: '待付款',
    allocationMethod: 'weight',
    allocated: true,
    allocatedOrderCount: 198,
    period: '2026-09',
  },

  // ─ 平台费 ─
  {
    id: 'exp_007',
    expenseNo: 'EXP-PLT-20260901',
    type: 'platform',
    vendor: 'Amazon',
    vendorBillNo: 'AMZ-ACCT-2026-09',
    description: 'Amazon FBA 月度仓储费 + 长期仓储费',
    channel: 'Amazon',
    amount: 2480.80,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    status: '已付款',
    allocationMethod: 'equal',
    allocated: true,
    allocatedOrderCount: 842,
    period: '2026-09',
  },
  {
    id: 'exp_008',
    expenseNo: 'EXP-PLT-20260902',
    type: 'platform',
    vendor: 'TikTok Shop',
    vendorBillNo: 'TTS-FEE-SEP2026',
    description: 'TikTok Shop 服务费 + 履约服务费（9月）',
    channel: 'TikTok Shop',
    amount: 1800.00,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-15',
    status: '已付款',
    allocationMethod: 'equal',
    allocated: true,
    allocatedOrderCount: 298,
    period: '2026-09',
  },

  // ─ 退货处理费 ─
  {
    id: 'exp_009',
    expenseNo: 'EXP-RTN-20260914',
    type: 'return',
    vendor: 'ShipBob US',
    description: '退货处理费 - 9月1-14日退货入库、质检、重新上架',
    warehouse: 'US-West-LAX',
    amount: 680.00,
    currency: 'USD',
    billDate: '2026-09-14',
    dueDate: '2026-09-30',
    status: '待付款',
    allocationMethod: 'order',
    allocated: false,
    period: '2026-09',
  },

  // ─ 其他 ─
  {
    id: 'exp_010',
    expenseNo: 'EXP-OTH-20260901',
    type: 'other',
    vendor: '海关',
    description: '美国进口清关服务费 - 9月批次',
    amount: 1280.00,
    currency: 'USD',
    billDate: '2026-09-01',
    dueDate: '2026-09-20',
    paidAt: '2026-09-18',
    status: '有争议',
    allocationMethod: 'manual',
    allocated: false,
    period: '2026-09',
    note: '实际税率高于预期，正在与清关行核实差额 $240',
  },
];

export const expenseTypeConfig: Record<ExpenseType, { label: string; cls: string }> = {
  warehouse: { label: '仓储费',   cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  freight:   { label: '运输费',   cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  platform:  { label: '平台费',   cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  payment:   { label: '支付手续费', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  return:    { label: '退货处理', cls: 'bg-pink-50 text-pink-700 ring-pink-200' },
  other:     { label: '其他',     cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
};

export const expenseStatusConfig: Record<ExpenseStatus, { cls: string; dot: string }> = {
  '待审批': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',     dot: 'bg-amber-400' },
  '已审批': { cls: 'bg-blue-50 text-blue-700 ring-blue-200',        dot: 'bg-blue-500' },
  '待付款': { cls: 'bg-violet-50 text-violet-700 ring-violet-200',  dot: 'bg-violet-500' },
  '已付款': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  '有争议': { cls: 'bg-red-50 text-red-700 ring-red-200',           dot: 'bg-red-500' },
};

export const allocationMethodLabel: Record<CostAllocationMethod, string> = {
  order:    '订单归属',
  weight:   '按重量分摊',
  volume:   '按体积分摊',
  quantity: '按数量分摊',
  equal:    '平均分摊',
  manual:   '手动分配',
};
