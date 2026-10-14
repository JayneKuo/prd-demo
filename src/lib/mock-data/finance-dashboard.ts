// 财务概览 Dashboard — mock 数据
// 以 OMS 视角统一呈现多渠道收支状况（US GAAP / Accrual Basis）

// ─── KPI ─────────────────────────────────────────────────────────────────────

export type FinanceDashboardKpi = {
  netRevenue: number;
  netRevenueDelta: number;
  grossMargin: number;
  grossMarginDelta: number;
  contributionMargin: number;
  pendingSettlement: number;
  pendingChannels: number;
  totalPayable: number;
  overduePayable: number;
  netPosition: number;
  currency: string;
};

export const financeDashboardKpi: FinanceDashboardKpi = {
  netRevenue: 281220,
  netRevenueDelta: 8.4,
  grossMargin: 60.2,
  grossMarginDelta: -0.6,
  contributionMargin: 43.0,
  pendingSettlement: 39831.60,
  pendingChannels: 2,
  totalPayable: 54280,
  overduePayable: 2840,
  netPosition: 21211.60,
  currency: 'USD',
};

// ─── 现金流瀑布 / P&L Bridge ──────────────────────────────────────────────────

export type WaterfallBar = {
  id: string;
  label: string;
  labelEn: string;
  amount: number;
  runningTotal: number;
  type: 'start' | 'negative' | 'subtotal' | 'total';
  accountRef: string;
  pctOfGross: number;
};

const GROSS = 289680;

export const cashWaterfall: WaterfallBar[] = [
  {
    id: 'gross',
    label: '渠道销售总额',        labelEn: 'Gross Channel Sales',
    amount: GROSS,               runningTotal: 289680,
    type: 'start',               accountRef: '4000 · Revenue',
    pctOfGross: 100,
  },
  {
    id: 'returns',
    label: '退款 / 折扣',          labelEn: 'Returns & Discounts',
    amount: -8460,               runningTotal: 281220,
    type: 'negative',            accountRef: '4100 · Sales Returns & Allowances',
    pctOfGross: -2.9,
  },
  {
    id: 'net-rev',
    label: '净收入',               labelEn: 'Net Revenue',
    amount: 281220,              runningTotal: 281220,
    type: 'subtotal',            accountRef: 'Net Revenue',
    pctOfGross: 97.1,
  },
  {
    id: 'cogs',
    label: '商品成本 (COGS)',       labelEn: 'Cost of Goods Sold',
    amount: -112000,             runningTotal: 169220,
    type: 'negative',            accountRef: '5000 · COGS',
    pctOfGross: -38.7,
  },
  {
    id: 'gross-profit',
    label: '毛利润',               labelEn: 'Gross Profit',
    amount: 169220,              runningTotal: 169220,
    type: 'subtotal',            accountRef: 'Gross Profit  60.2%',
    pctOfGross: 58.4,
  },
  {
    id: 'warehouse',
    label: '仓储履约成本',           labelEn: 'Fulfillment / 3PL Cost',
    amount: -12840,              runningTotal: 156380,
    type: 'negative',            accountRef: '6100 · Warehouse & Fulfillment',
    pctOfGross: -4.4,
  },
  {
    id: 'freight',
    label: '运输成本',              labelEn: 'Freight & Carrier Cost',
    amount: -18620,              runningTotal: 137760,
    type: 'negative',            accountRef: '6200 · Freight Expense',
    pctOfGross: -6.4,
  },
  {
    id: 'platform',
    label: '平台佣金 & 服务费',       labelEn: 'Marketplace & Platform Fees',
    amount: -14348,              runningTotal: 123412,
    type: 'negative',            accountRef: '6300 · Selling Fees',
    pctOfGross: -5.0,
  },
  {
    id: 'payment',
    label: '支付处理费',             labelEn: 'Payment Processing Fees',
    amount: -2390,               runningTotal: 121022,
    type: 'negative',            accountRef: '6400 · Payment Processing',
    pctOfGross: -0.8,
  },
  {
    id: 'contribution',
    label: '贡献毛利',              labelEn: 'Contribution Margin',
    amount: 121022,              runningTotal: 121022,
    type: 'total',               accountRef: 'Contribution Margin  43.0%',
    pctOfGross: 41.8,
  },
];

// ─── 渠道概览 ──────────────────────────────────────────────────────────────────

export type ChannelArStatus = '已到账' | '处理中' | '待确认' | '差异';

export type ChannelFinanceCard = {
  channel: string;
  colorCls: string;
  grossSales: number;
  totalDeduction: number;
  feeRate: number;
  netSettlement: number;
  status: ChannelArStatus;
  statusCls: string;
  dotCls: string;
  settledAt?: string;
  nextCycleEnd?: string;
  erpSynced: boolean;
};

export const channelFinanceCards: ChannelFinanceCard[] = [
  {
    channel: 'Amazon',
    colorCls: 'bg-orange-50 text-orange-700 ring-orange-200',
    grossSales: 68400,
    totalDeduction: 16000,
    feeRate: 23.4,
    netSettlement: 52400,
    status: '已到账',
    statusCls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dotCls: 'bg-emerald-500',
    settledAt: '2026-09-16',
    erpSynced: true,
  },
  {
    channel: 'Shopify',
    colorCls: 'bg-green-50 text-green-700 ring-green-200',
    grossSales: 41200,
    totalDeduction: 2380,
    feeRate: 5.8,
    netSettlement: 38820,
    status: '差异',
    statusCls: 'bg-red-50 text-red-700 ring-red-200',
    dotCls: 'bg-red-500',
    settledAt: '2026-09-16',
    erpSynced: true,
  },
  {
    channel: 'TikTok Shop',
    colorCls: 'bg-pink-50 text-pink-700 ring-pink-200',
    grossSales: 25320,
    totalDeduction: 2180,
    feeRate: 8.6,
    netSettlement: 23139.60,
    status: '处理中',
    statusCls: 'bg-blue-50 text-blue-700 ring-blue-200',
    dotCls: 'bg-blue-500',
    nextCycleEnd: '2026-09-19',
    erpSynced: false,
  },
  {
    channel: 'Walmart',
    colorCls: 'bg-blue-50 text-blue-700 ring-blue-200',
    grossSales: 18600,
    totalDeduction: 1908,
    feeRate: 10.3,
    netSettlement: 16692,
    status: '待确认',
    statusCls: 'bg-amber-50 text-amber-700 ring-amber-200',
    dotCls: 'bg-amber-400',
    nextCycleEnd: '2026-09-21',
    erpSynced: false,
  },
];

// ─── AR / AP 快照 ─────────────────────────────────────────────────────────────

export type ArApSnapshot = {
  ar: {
    channelPending: number;
    customerInvoice: number;
    overdueAr: number;
    dueThisWeek: number;
  };
  ap: {
    warehouse3pl: number;
    carrierFreight: number;
    platformFees: number;
    overdueAp: number;
    dueThisWeek: number;
  };
};

export const arApSnapshot: ArApSnapshot = {
  ar: {
    channelPending: 39831.60,
    customerInvoice: 52720,
    overdueAr: 12840,
    dueThisWeek: 23139.60,
  },
  ap: {
    warehouse3pl: 12840,
    carrierFreight: 15260,
    platformFees: 2480.80,
    overdueAp: 2840,
    dueThisWeek: 18620,
  },
};

// ─── 待处理预警 ────────────────────────────────────────────────────────────────

export type FinanceAlert = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'reconciliation' | 'payment' | 'fee' | 'erp';
  title: string;
  description: string;
  amount?: number;
  href: string;
  actionLabel: string;
};

export const financeAlerts: FinanceAlert[] = [
  {
    id: 'alert-1',
    severity: 'high',
    category: 'reconciliation',
    title: 'Shopify 结算差异 $42.50 未核销',
    description: 'Sep 8–14 结算：OMS 预计 $38,820 vs 实际到账 $38,777.50',
    amount: 42.50,
    href: '/dashboard/reconciliation',
    actionLabel: '查看对账',
  },
  {
    id: 'alert-2',
    severity: 'high',
    category: 'fee',
    title: 'TikTok 佣金费率偏差 0.5%',
    description: 'OMS 配置 5.0%，平台实收 5.5%，本期差异 $66，需更新费率配置',
    amount: 66,
    href: '/dashboard/reconciliation',
    actionLabel: '查看费用对账',
  },
  {
    id: 'alert-3',
    severity: 'medium',
    category: 'fee',
    title: 'UPS 运费账单差异 $240',
    description: '住宅附加费 + 超尺寸附加费未在 OMS 路由规则中配置',
    amount: 240,
    href: '/dashboard/payables',
    actionLabel: '查看账单',
  },
  {
    id: 'alert-4',
    severity: 'medium',
    category: 'payment',
    title: '3 笔应付账款本周到期',
    description: 'FedEx $8,420 · UPS $6,840 · Royal Mail $3,360 — 到期日 2026-09-28',
    amount: 18620,
    href: '/dashboard/payables',
    actionLabel: '安排付款',
  },
  {
    id: 'alert-5',
    severity: 'low',
    category: 'erp',
    title: 'TikTok / Walmart 结算尚未同步 NetSuite',
    description: '结算到账后将自动推送，预计 2026-09-22 完成同步',
    href: '/dashboard/reconciliation',
    actionLabel: '查看 ERP 状态',
  },
];

// ─── 财务业务流程（O2C / P2P / R2R）──────────────────────────────────────────

export type FlowActorType = 'customer' | 'channel' | 'oms' | 'wms' | 'tms' | 'payment' | 'finance' | 'erp' | 'vendor';

// 每步骤的资金明细行
export type FinancialLineType = 'inflow' | 'outflow' | 'neutral' | 'subtotal' | 'total' | 'note';

export type FinancialLine = {
  label: string;       // 中文标签
  labelEn?: string;    // 英文参考（可选）
  amount: string;      // 金额字符串，如 "+$80.00" / "-$5.00" / "$75.00" / "34.1%"
  type: FinancialLineType;
  note?: string;       // 补充说明（斜体小字）
};

export type FeeItem = {
  name: string;
  nameEn: string;
  description: string;
  typical: string;
  payer: '商家' | '平台代扣' | '客户' | '—';
};

export type FlowStep = {
  id: string;
  seq: number;
  title: string;
  titleCn: string;
  actor: string;
  actorType: FlowActorType;
  summary: string;
  whatHappens: string;
  fees?: FeeItem[];
  accountingNote?: string;
  accountingNoteCn?: string;
  standard?: string;
  standardCn?: string;
  commonIssues?: string[];
  moduleLink?: string;
  isKeyEvent?: boolean;
};

export type FlowLane = {
  id: 'o2c' | 'p2p' | 'r2r' | 'b2b';
  title: string;
  subtitle: string;
  colorScheme: 'blue' | 'violet' | 'emerald' | 'amber';
  steps: FlowStep[];
};

export const actorMeta: Record<FlowActorType, { label: string; bg: string; text: string }> = {
  customer: { label: 'Customer / 客户',    bg: 'bg-sky-100',     text: 'text-sky-700' },
  channel:  { label: 'Sales Channel / 渠道', bg: 'bg-orange-100', text: 'text-orange-700' },
  oms:      { label: 'OMS 系统',           bg: 'bg-blue-100',    text: 'text-blue-700' },
  wms:      { label: 'WMS / 3PL 仓库',     bg: 'bg-teal-100',    text: 'text-teal-700' },
  tms:      { label: 'Carrier / 承运商',   bg: 'bg-purple-100',  text: 'text-purple-700' },
  payment:  { label: 'Payment Gateway',    bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  finance:  { label: 'Finance / 财务',     bg: 'bg-amber-100',   text: 'text-amber-700' },
  erp:      { label: 'ERP (NetSuite/QB)',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
  vendor:   { label: 'Vendor / 供应商',    bg: 'bg-pink-100',    text: 'text-pink-700' },
};

export const financeFlowLanes: FlowLane[] = [

  // ═══ O2C — 从客户下单到资金入账 ════════════════════════════════════════════
  {
    id: 'o2c',
    title: 'Order-to-Cash (O2C)',
    subtitle: '从客户下单到资金入账 · 收入确认遵循 ASC 606 五步模型',
    colorScheme: 'blue',
    steps: [
      {
        id: 'o2c-1', seq: 1,
        title: 'Customer Order',
        titleCn: '客户下单',
        actor: 'Sales Channel / 渠道', actorType: 'channel',
        summary: '客户在 Amazon / Shopify / TikTok 等渠道下单，订单同步到 OMS，库存预锁',
        whatHappens:
          '客户点击购买后，平台验证库存并预授权支付方式（此时尚未实际扣款）。订单信息（SKU、数量、收货地址、支付方式）实时推送到 OMS，系统创建订单记录并锁定对应库存，防止重复销售。\n\n' +
          'Amazon Pending 订单是特例：客户支付尚未最终确认，状态保持"待确认"，不应提前安排备货。',
        fees: [],
        commonIssues: [
          '地址不完整或校验失败 → 订单卡住，需人工核对后补全',
          '高并发时库存同步延迟（通常 5~15 分钟）→ 存在超卖风险',
          'Amazon Pending 订单不可提前发货，否则可能无法确认结款',
        ],
        moduleLink: '/dashboard/orders',
      },
      {
        id: 'o2c-2', seq: 2,
        title: 'Payment Capture',
        titleCn: '支付完成',
        actor: 'Payment Gateway', actorType: 'payment',
        summary: '客户付款成功，支付手续费被扣除，但商家还拿不到这笔钱，需等结算周期',
        whatHappens:
          '支付处理商（Stripe、PayPal、Amazon Pay）正式从客户账户扣款，扣除手续费后，余额锁定在平台账户中。\n\n' +
          '注意：商家此时看不到这笔钱。它要经过仓库履约 → 签收确认 → 平台结算周期，才会以"净结算金额"打入商家银行账户。支付手续费是商家的运营成本，在此时产生。',
        fees: [
          { name: 'Stripe 支付处理费', nameEn: 'Stripe Processing Fee',
            description: 'Shopify 商家通过 Stripe 收款时产生的交易手续费',
            typical: '2.9% + $0.30 / 笔（国内卡）；3.9% + $0.30（国际卡）', payer: '商家' },
          { name: 'PayPal 手续费', nameEn: 'PayPal Transaction Fee',
            description: '买家选择 PayPal 结账时产生',
            typical: '3.49% + $0.49 / 笔（标准商业账户）', payer: '商家' },
          { name: 'Shopify Payments 费率', nameEn: 'Shopify Payments',
            description: '使用 Shopify 官方支付时，费率低于第三方 Stripe',
            typical: '2.4%（Advanced）/ 2.6%（Shopify）/ 2.9%（Basic），无每笔固定费', payer: '商家' },
          { name: 'Amazon 支付费（含在佣金内）', nameEn: 'Amazon Payment Processing',
            description: 'Amazon 不单独收取支付手续费，已包含在 Referral Fee 中',
            typical: '含在平台佣金内，无独立费项', payer: '商家' },
        ],
        accountingNote:
          'Dr: Platform Receivable  ← 平台代收款\n' +
          'Cr: Deferred Revenue (Contract Liability)  ← 尚未履约，不能确认收入',
        accountingNoteCn:
          '借：平台应收款  → 平台代我们收了这笔钱，相当于"欠我们"\n' +
          '贷：递延收入   → 货还没送到客户手里，这笔钱从法律上还不算我们的"收入"\n\n' +
          '关键概念：付款 ≠ 收入。收入要等到"履约义务完成"（=交货）才能确认。',
        standard: 'ASC 606 – Revenue recognized only when performance obligation is satisfied, not when payment is received.',
        standardCn: 'ASC 606 收入确认准则：收到客户付款，只能记"递延收入（合同负债）"，不能直接记"营业收入"。必须等商品成功交付（履约义务完成）后，才能将递延收入转为已确认收入。',
        commonIssues: [
          '支付失败订单需设置超时自动取消机制（通常 15~30 分钟）',
          '退款处理时间 T+3~5 个工作日，客户往往期望立即到账',
          '多货币支付：记账时应按"交易日"汇率，而非"收款日"汇率',
        ],
        moduleLink: '/dashboard/reconciliation',
        isKeyEvent: true,
      },
      {
        id: 'o2c-3', seq: 3,
        title: 'OMS Order Processing',
        titleCn: 'OMS 订单处理与分仓',
        actor: 'OMS 系统', actorType: 'oms',
        summary: 'OMS 自动计算最优发货方案，将订单分配到成本最低、时效最快的仓库',
        whatHappens:
          'OMS 根据预设规则自动决定从哪个仓库发货，生成"履约单（Fulfillment Order）"推送给 WMS。\n\n' +
          '决策逻辑：优先考虑距买家最近的仓库（降低运费）→ 库存充足 → 3PL 产能未满。\n' +
          '库存不足时系统会自动"拆单"——从多个仓库分别发货，买家收到多个包裹。此步骤通常全自动完成。',
        fees: [],
        commonIssues: [
          '分仓规则配置错误 → 从高运费仓库发货，每单多花 $3~8',
          '高峰期 3PL 产能满载 → 需提前与 ShipBob/XPO 沟通处理上限',
          '拆单未提前告知买家 → 两个包裹分别签收，容易触发纠纷',
        ],
        moduleLink: '/dashboard/orders',
      },
      {
        id: 'o2c-4', seq: 4,
        title: 'WMS Fulfillment',
        titleCn: '仓库履约（拣货 · 包装 · 贴标）',
        actor: 'WMS / 3PL 仓库', actorType: 'wms',
        summary: '仓库工人取货、打包、贴运单，等待快递员取件——同时产生仓储操作费',
        whatHappens:
          '仓库按履约单执行四道工序：\n\n' +
          '① 拣货（Pick）：按货架位置导航取出商品\n' +
          '② 包装（Pack）：选合适纸箱装货、填充缓冲材料、封箱\n' +
          '③ 称重测量（Weigh & Dim）：记录实际重量和体积，影响运费结算\n' +
          '④ 贴标发货（Label & Stage）：打印快递面单，放入待取件区\n\n' +
          '3PL 每月汇总出具账单，商家需将 OMS 预计费用与实际账单核对。',
        fees: [
          { name: '拣货费', nameEn: 'Pick Fee',
            description: '从货架取出每件商品的人工操作费，按件计费',
            typical: '$0.20–$0.50 / 件（ShipBob US 约 $0.25）', payer: '商家' },
          { name: '包装 / 操作费', nameEn: 'Pack & Handling Fee',
            description: '装箱、填充缓冲材料、封箱的操作费，按单计费',
            typical: '$0.50–$2.00 / 单', payer: '商家' },
          { name: '包材费', nameEn: 'Packaging Materials',
            description: '纸箱、气泡袋、胶带等耗材按实际用量计费',
            typical: '$0.30–$1.50 / 单', payer: '商家' },
          { name: '月度仓储费', nameEn: 'Storage Fee',
            description: '商品每月占用货架空间的租金，按立方英尺计费',
            typical: '$0.65–$2.40 / 立方英尺 / 月；旺季（10-12 月）约翻 2~4 倍', payer: '商家' },
          { name: '入库收货费', nameEn: 'Receiving / Inbound Fee',
            description: '仓库接收补货入库时的操作费',
            typical: '$0.15–$0.35 / 件，或 $35–$60 / 人工小时', payer: '商家' },
        ],
        accountingNote:
          'Dr: COGS – Product Cost  ← 商品成本结转\n' +
          'Cr: Inventory Asset  ← 库存减少\n\n' +
          'Dr: Fulfillment Expense (Accrued)\n' +
          'Cr: Accounts Payable – 3PL',
        accountingNoteCn:
          '发货时同时产生两笔记录：\n' +
          '① 库存成本结转：商品从"库存资产"转为"已售商品成本（COGS）"，按 FIFO 先进先出法计价\n' +
          '② 仓储费计提：本月拣货/包装/仓储操作费确认为费用，对应"3PL 应付账款"（等账单核对后付款）',
        standard: 'ASC 330 – Inventory valued at lower of cost or net realizable value. FIFO or Weighted-Average cost flow assumption.',
        standardCn: '库存遵循 ASC 330，通常采用先进先出法（FIFO）：最早入库的货物先出库，成本按该批次采购价计算。发货时将库存成本从资产表的"存货"科目结转至损益表的"销货成本（COGS）"。',
        commonIssues: [
          '实测尺寸与申报不符 → 仓储费超预算，尤其影响大件商品',
          '拣货错误率（Mispick）超标 → 与 3PL 核查 SLA，可要求赔偿',
          'Q4 旺季 Amazon FBA 仓储费翻倍（10-12 月），需提前做库存规划',
        ],
        moduleLink: '/dashboard/outbound',
      },
      {
        id: 'o2c-5', seq: 5,
        title: 'Carrier Shipment',
        titleCn: '承运商发货与追踪',
        actor: 'Carrier / 承运商', actorType: 'tms',
        summary: '快递员取件，包裹进入运输网络，生成追踪号——运费在此时最终确定',
        whatHappens:
          '承运商（FedEx、UPS、DHL 等）到仓库扫描取件，生成运单号（Tracking Number）。OMS 通过 TMS 接收追踪更新，自动推送给买家，并监控 SLA 时效。\n\n' +
          '实际运费以包裹实际重量和体积重（Dimensional Weight = L×W×H÷139）中的较大值为准，可能与事先估算有差异。',
        fees: [
          { name: '基础运费', nameEn: 'Base Transportation Rate',
            description: '按重量、尺寸和运输区域（Zone）计算的基本费用',
            typical: 'FedEx Ground: $8–$20 / 件；UPS Ground: $8–$18 / 件', payer: '商家' },
          { name: '燃油附加费', nameEn: 'Fuel Surcharge',
            description: '根据当月油价指数浮动，FedEx/UPS 每周公布一次',
            typical: '基础运费的 14%–22%（浮动）', payer: '商家' },
          { name: '住宅派送附加费', nameEn: 'Residential Delivery Surcharge',
            description: '送往私人住宅时加收，电商 80%+ 订单触发',
            typical: 'FedEx: $4.90 / 件；UPS: $4.95 / 件', payer: '商家' },
          { name: '超大件附加费', nameEn: 'Oversize / Large Package',
            description: '包裹超过承运商标准尺寸或重量时加收',
            typical: '$31.45–$110+ / 件', payer: '商家' },
          { name: '偏远地区附加费', nameEn: 'Extended Area Surcharge',
            description: '配送到偏远地区时加收',
            typical: '$3.65–$17.00 / 件', payer: '商家' },
          { name: '国际快递费', nameEn: 'International Shipping',
            description: '跨境运输含报关清关服务，按重量和目的地计费',
            typical: 'DHL Express: $25–$80+ / 件', payer: '商家' },
        ],
        commonIssues: [
          '体积重超出预期：包装过大会显著增加运费（L×W×H÷139 vs 实重，取大值）',
          '燃油附加费月度变化未同步 OMS 成本模型 → 实际运费比预算高',
          '住宅附加费经常漏计入成本模型，导致每单利润虚高',
        ],
        moduleLink: '/dashboard/shipments',
        accountingNote:
          'When shipped (accrual):\nDr: Freight Expense (Accrued)  6200\nCr: Accrued Liabilities – Carrier\n\n' +
          'When actual carrier invoice received:\nDr: Accrued Liabilities\nDr/Cr: Freight Expense (variance)\nCr: Accounts Payable',
        accountingNoteCn:
          '发货时做计提（账单还没到）：\n借：运费费用（计提）6200  → 当期费用确认\n贷：应计负债 — 承运商  → 暂记负债\n\n' +
          '实际运单账单到达后调整：\n借：应计负债  → 清零之前的计提\n借/贷：运费差异  → 实际比预估多/少的部分\n贷：应付账款  → 确认真实债务\n\n' +
          '注意：运费成本在出货时确认（配比原则），不是账单到达时确认。',
      },
      {
        id: 'o2c-6', seq: 6,
        title: 'Delivery Confirmation',
        titleCn: '签收确认',
        actor: 'Carrier / 客户', actorType: 'customer',
        summary: '买家签收，收入确认触发，退货窗口开始计时',
        whatHappens:
          '快递员送达并完成签收扫描（POD — Proof of Delivery）。这一事件触发 OMS 三个连锁动作：\n\n' +
          '① 发送收入确认事件 → 财务模块将"递延收入"转为"已确认收入"\n' +
          '② 退货窗口计时开始（如 Amazon 30 天退货期）\n' +
          '③ 平台付款保护期开始（如 Amazon A-to-Z Guarantee 评估窗口开启）',
        fees: [
          { name: '二次配送费', nameEn: 'Redelivery Fee',
            description: '首次配送失败重新安排时产生',
            typical: '$3.50–$10.00 / 次', payer: '商家' },
        ],
        accountingNote:
          'Signed Delivery (POD) triggers Revenue Recognition\n' +
          'No separate journal entry at this step.\n' +
          'See next step: o2c-7 Revenue Recognition.',
        accountingNoteCn:
          '签收事件触发收入确认（参见下一步"收入确认"）。\n' +
          '本步骤本身不产生独立的会计分录——签收只是触发信号。\n\n' +
          '例外：若发生退货，需在此时记录退货成本：\n' +
          '借：退货损失 / 应计费用\n贷：应付账款（承运商退货运费）',
        commonIssues: [
          '"显示已送达"但买家称未收 → 需提供 GPS 送达截图作为 POD 证据',
          '物业代收包裹 → 签收时间与买家实际取件时间不同，影响退货窗口',
        ],
      },
      {
        id: 'o2c-7', seq: 7,
        title: 'Revenue Recognition',
        titleCn: '收入确认（最关键的财务事件）',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '货物签收 = 履约完成 = 收入确认；递延收入正式计入当月损益表',
        whatHappens:
          '签收事件触发 OMS 财务引擎：将此前记为"递延收入"的金额，正式确认为当期收入，写入损益表。\n\n' +
          '收入拆分为两个科目：\n' +
          '• 商品收入（Product Revenue）：商品售价扣除折扣后的净额\n' +
          '• 运费收入（Shipping Revenue）：向买家收取的运费（如有）\n\n' +
          '注意：税款（Sales Tax）不属于收入！它是代政府收取的税款，归入"应付税款"负债。',
        fees: [],
        accountingNote:
          'Dr: Deferred Revenue (Contract Liability)\n' +
          'Cr: Product Revenue\n' +
          'Cr: Shipping Revenue\n\n' +
          'Dr: Sales Tax Collected  ← 税款不是收入\n' +
          'Cr: Sales Tax Payable',
        accountingNoteCn:
          '借：递延收入  → 之前记的"预收款"现在可以结清了\n' +
          '贷：商品销售收入  → 确认为当期收入，计入 P&L\n' +
          '贷：运费收入  → 向买家收的运费也算收入\n\n' +
          '税款单独处理：\n' +
          '借：已收销售税  → 我们帮政府代收的钱\n' +
          '贷：应付销售税  → 要上缴给州/市政府，不是我们的收入',
        standard: 'ASC 606 — 5-Step Model. Step 5: Recognize revenue when performance obligation is satisfied.',
        standardCn:
          'ASC 606 五步模型：① 识别合同 ② 识别履约义务（通常为"交付商品"）③ 确定交易价格 ④ 分配价格 ⑤ 履约义务完成时确认收入。\n\n' +
          '重要区分：收到货款的时间 ≠ 确认收入的时间！',
        commonIssues: [
          '退货冲回：收入确认后客户发起退货 → 需冲回收入（Revenue Reversal）',
          '月末截止（Cutoff）：月底最后几天发出的货必须在签收后才能算当月收入',
          '订阅类产品：按服务期均摊确认，而非一次性全额确认',
        ],
        moduleLink: '/dashboard/finance',
        isKeyEvent: true,
      },
      {
        id: 'o2c-8', seq: 8,
        title: 'Platform Settlement',
        titleCn: '渠道结算（平台扣费后回款）',
        actor: 'Sales Channel / 渠道', actorType: 'channel',
        summary: '平台按周期汇总：销售额 − 佣金 − FBA费 − 退款 − 广告 = 实际打给商家的钱',
        whatHappens:
          '平台按固定周期生成"结算报告（Settlement Report）"，告知商家实际净回款。\n\n' +
          '各平台结算周期：\n' +
          '• Amazon：每 14 天，资金 3 个工作日内到账（T+14+3）\n' +
          '• Shopify / Stripe：T+2~3 个工作日\n' +
          '• TikTok Shop：T+8 个工作日\n' +
          '• Walmart：T+14，资金 3~5 个工作日到账\n\n' +
          'OMS 将预计净回款与平台结算报告逐项核对——差异超过 $1 都需查明原因。',
        fees: [
          { name: 'Amazon 引荐费', nameEn: 'Amazon Referral Fee',
            description: '按商品类目收取的平台佣金',
            typical: '8%（消费电子）～ 17%（服装），大多数类目 15%', payer: '商家' },
          { name: 'Amazon FBA 配送费', nameEn: 'FBA Fulfillment Fee',
            description: '亚马逊代为仓储和配送的费用',
            typical: '$3.22（小件轻量）～ $13.58（标准大件）/ 件', payer: '商家' },
          { name: 'Amazon FBA 仓储费', nameEn: 'FBA Monthly Storage',
            description: '商品存放在亚马逊仓库的月度租金',
            typical: '$0.78 / 立方英尺（1-9月）；$2.40（10-12月旺季）', payer: '商家' },
          { name: 'TikTok Shop 佣金', nameEn: 'TikTok Commission',
            description: 'TikTok Shop 按交易额收取的平台服务费',
            typical: '5%（消费电子）～ 9%（美妆服装）', payer: '商家' },
          { name: 'Shopify 交易手续费', nameEn: 'Shopify Transaction Fee',
            description: '使用第三方支付时额外加收',
            typical: '0.5%（Advanced）/ 1.0%（Shopify）/ 2.0%（Basic）', payer: '商家' },
          { name: 'Walmart 引荐费', nameEn: 'Walmart Referral Fee',
            description: 'Walmart Marketplace 的平台佣金',
            typical: '6%（消费电子）～ 15%（个护类目）', payer: '商家' },
          { name: '退款扣减', nameEn: 'Refund Deduction',
            description: '结算周期内的退款金额直接从应付款中扣除',
            typical: '按实际退款金额 100% 扣减（含退货运费）', payer: '—' },
          { name: '广告费扣减', nameEn: 'Ad Spend Deduction',
            description: '平台广告费用从结算款中扣除',
            typical: '按实际广告消耗金额，无上限', payer: '商家' },
        ],
        commonIssues: [
          'OMS 预计回款与平台结算不符（最常见财务问题，务必每期对账）',
          'Amazon Inventory Placement Fee：新政策费用，常被漏计入成本模型',
          '退款时序差异：退款在 A 周期发生，但平台扣款在 B 周期结算',
        ],
        moduleLink: '/dashboard/settlement',
        accountingNote:
          'When settlement report received:\nDr: Platform Settlement Receivable\nCr: Platform Receivable (Deferred)\n\n' +
          'Platform fees recognized:\nDr: Platform Fees 6300\nCr: Platform Settlement Receivable',
        accountingNoteCn:
          '收到结算报告时：\n借：平台结算应收款  → 确认即将到账的金额\n贷：平台代收款（前期预收）  → 清除之前的平台代收\n\n' +
          '平台费用同时确认：\n借：平台佣金费用 6300  → 佣金/FBA费/广告费入费用科目\n贷：平台结算应收款  → 从应收款中扣除\n\n' +
          '结果：净结算金额 = 应收款余额，等待资金到账。',
        isKeyEvent: true,
      },
      {
        id: 'o2c-9', seq: 9,
        title: 'Cash Receipt & Reconciliation',
        titleCn: '资金到账与银行对账',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '平台打款入账后，立即核对 OMS 预期金额与实际到账，差异需 48h 内处理',
        whatHappens:
          '平台将净结算金额通过 ACH 或电汇打入商家银行账户。到账后执行对账：\n\n' +
          '① OMS 结算记录 vs. 银行到账金额逐笔匹配\n' +
          '② 差异 > $1 自动标记"待核查"\n' +
          '③ 核查通过 → 将渠道应收状态更新为"已到账"\n' +
          '④ 记录实际到账日期（影响现金流量表中"经营活动现金流入"的归期）',
        fees: [
          { name: 'ACH 银行转账费', nameEn: 'ACH Transfer Fee',
            description: '美国国内银行间电子转账手续费',
            typical: '免费 ～ $1.50 / 笔', payer: '商家' },
          { name: '国际电汇费', nameEn: 'International Wire Fee',
            description: '从海外平台汇款到美国银行',
            typical: '$15–$50 / 笔（收款行可能额外收 $15–$25）', payer: '商家' },
          { name: '汇率转换损益', nameEn: 'FX Conversion Gain / Loss',
            description: '多货币商家汇率浮动产生的收益或损失',
            typical: '取决于汇率波动，通常 ±0.5%–2%', payer: '—' },
        ],
        commonIssues: [
          'Shopify 结算与 Stripe 实际打款差几十美元：常因退款时序错位',
          '汇率差异（多货币）：银行到账时按当日汇率，与 OMS 记账汇率不一致',
          '到账延迟 1~2 个工作日：不影响财务记账日期，但影响实际资金调度',
        ],
        moduleLink: '/dashboard/reconciliation',
        accountingNote:
          'Dr: Cash / Bank\nCr: Platform Settlement Receivable\n\nIf variance:\nDr/Cr: Foreign Exchange Gain/Loss (or Variance Account)',
        accountingNoteCn:
          '资金实际到账时：\n借：银行存款  → 现金增加，真实入账\n贷：平台结算应收款  → 之前登记的"等待到账"清零\n\n' +
          '如有差异（如 $42.50 不符）：\n借/贷：汇兑损益（或对账差异科目）  → 记录差异，后续追查原因\n\n' +
          '到账后，现金流量表"经营活动现金流入"科目更新。',
      },
      {
        id: 'o2c-10', seq: 10,
        title: 'GL Journal Entry & ERP Sync',
        titleCn: 'ERP 总账记账与月结',
        actor: 'OMS → ERP (NetSuite/QB)', actorType: 'erp',
        summary: 'OMS 汇总本期全部收支，通过 API 推送至 NetSuite，完成正式记账，锁定月份',
        whatHappens:
          '月末，OMS 将本期所有收入、COGS、费用整理成标准"会计分录"格式，通过 API 推送至 ERP 的总分类账（GL）。\n\n' +
          'ERP 接收后更新各科目余额，触发财务报表生成：\n' +
          '• 损益表（P&L / Income Statement）\n' +
          '• 资产负债表（Balance Sheet）\n' +
          '• 现金流量表（Cash Flow Statement）\n\n' +
          '推送成功后，OMS 和 ERP 同时"锁定"该期间（Period Lock），防止历史数据被修改——符合 SOX 内控要求。',
        fees: [
          { name: 'NetSuite 月度订阅费', nameEn: 'NetSuite Monthly License',
            description: 'Oracle NetSuite ERP 云端系统月度授权费',
            typical: '$999–$2,500+ / 月', payer: '商家' },
          { name: 'QuickBooks 订阅费', nameEn: 'QuickBooks Online',
            description: '适合中小企业的云端会计系统',
            typical: '$90–$200 / 月（Advanced 版）', payer: '商家' },
          { name: 'ERP API 集成费', nameEn: 'ERP Integration Cost',
            description: 'OMS 与 ERP 系统的 API 对接开发和维护费用',
            typical: '一次性实施 $5,000–$20,000', payer: '商家' },
        ],
        accountingNote:
          'Dr: Cash / Platform Receivable\nCr: Revenue (Acct 4000)\n\n' +
          'Dr: COGS (Acct 5000)\nCr: Inventory (Acct 1300)\n\n' +
          'Dr: Fulfillment Expense (6100)\nDr: Freight Expense (6200)\nDr: Platform Fees (6300)\nCr: Accounts Payable / Cash',
        accountingNoteCn:
          '推送至 ERP 的汇总分录包含：\n' +
          '• 收入分录：确认当期所有已交付订单的收入\n' +
          '• COGS 分录：库存资产结转为销货成本\n' +
          '• 费用分录：仓储费、运费、平台佣金计入当期费用\n' +
          '• 应付清账：已付款的 AP 账户清零，Cash 减少',
        standard: 'US GAAP Accrual Basis. SOX Sec. 302/404 – Period Lock required for internal controls over financial reporting.',
        standardCn:
          '权责发生制：收入和费用在经济事项发生的当期记录，而非现金实际收付时记录。\n\nSOX 合规：企业必须对财务报告内控进行评估，Period Lock 是关键控制措施。',
        commonIssues: [
          'API 同步失败 → 需手动导出 OMS 分录并导入 ERP',
          '科目映射错误 → OMS 费用类别与 NetSuite 科目编号不对应，造成串项',
          '汇率不一致 → OMS 和 ERP 使用不同来源的汇率，双系统余额出现轻微差异',
        ],
        moduleLink: '/dashboard/reconciliation',
        isKeyEvent: true,
      },
    ],
  },

  // ═══ P2P — 从供应商账单到付款完成 ═══════════════════════════════════════════
  {
    id: 'p2p',
    title: 'Procure-to-Pay (P2P)',
    subtitle: '从 3PL / 承运商 / 平台账单到付款完成 · 三方核验防止多付',
    colorScheme: 'violet',
    steps: [
      {
        id: 'p2p-0', seq: 1,
        title: 'Vendor Master Setup',
        titleCn: '供应商档案配置（Vendor Master）',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '在 OMS 中建立供应商档案——付款条款、费率合同、银行账号——P2P 全流程的数据基础',
        whatHappens:
          '所有 P2P 操作（收账单、核验、审批、付款）的参数都来自供应商档案。档案不完整，后续每一步都会出错。\n\n' +
          '─── 供应商档案必填字段 ──────────────────────────────────\n' +
          '基础信息：\n' +
          '• 供应商名称 / 法人主体名\n' +
          '• Tax ID / EIN（用于税务报告，如 1099-NEC）\n' +
          '• 注册地址 / 账单地址\n\n' +
          '付款配置（P2P 核心）：\n' +
          '• 默认付款条款：Net 30 / Net 45 / Net 60 / 2-10 Net 30\n' +
          '• 付款方式：ACH / Wire / 虚拟信用卡\n' +
          '• 银行账号 + ACH Routing Number（Wire 付款必须）\n' +
          '• 付款币种：USD / GBP / EUR\n\n' +
          '费率合同（Rate Card）：\n' +
          '• 各服务项目单价（拣货费 / 包装费 / 仓储费 / 运费区间等）\n' +
          '• 合同有效期（到期提醒，防止按过期费率核验）\n' +
          '• 附加费配置（燃油附加费 / 住宅附加费等，三方核验用）\n\n' +
          '联系人：\n' +
          '• 账单联系人邮箱（Invoice Submission）\n' +
          '• 账单接收格式：PDF 邮件 / EDI 810 / 在线门户\n\n' +
          '─── 档案变更管理 ────────────────────────────────────────\n' +
          '费率变动 → 更新 Rate Card 并注明生效日期（影响三方核验的比价基准）\n' +
          '账号变动 → 需双渠道验证（电话 + 书面），防止"银行账号欺诈"攻击\n' +
          '条款变动 → 需合同附件支撑，财务审批后生效',
        fees: [],
        accountingNote:
          'No journal entry — vendor master setup is a configuration step.\nAll payment terms and rate cards configured here drive downstream AP calculations.',
        accountingNoteCn:
          '供应商档案配置不产生会计分录，它是系统参数设置。\n\n' +
          '但它直接决定：\n' +
          '• 到期日计算（付款条款 → 逾期判定）\n' +
          '• 三方核验基准（Rate Card → OMS 预估金额）\n' +
          '• 付款指令（银行账号 → 转账路由）\n\n' +
          '档案配置错误会导致：错误的到期日、核验比对失败、打款到错误账户。',
        commonIssues: [
          '费率合同过期未更新 → 三方核验基准错误，每期都会产生"假差异"',
          '银行账号变更未双渠道验证 → 供应商欺诈高发场景，务必电话确认',
          '付款条款未在档案中维护 → OMS 无法自动算到期日，需人工录入',
        ],
        moduleLink: '/dashboard/payables',
      },
      {
        id: 'p2p-1', seq: 2,
        title: 'Vendor Invoice Received',
        titleCn: '收到供应商账单',
        actor: 'Vendor / 供应商', actorType: 'vendor',
        summary: '3PL 仓库、承运商、平台按合同约定发来本月账单，录入 OMS 应付账款模块',
        whatHappens:
          '供应商（ShipBob、XPO、FedEx、UPS 等）按月或按结算周期发来服务账单。账单形式多样：PDF 邮件、在线 Portal 下载、EDI 电子账单。\n\n' +
          '财务人员将账单录入 OMS 的应付账款（AP）模块，系统自动识别供应商、费用类型和到期日，创建待处理应付记录。\n\n' +
          '关键信息：账单金额、账单日期、付款到期日（Net 30/45/60）、费用明细。\n\n' +
          '─── 到期日计算规则 ───────────────────────────────────\n' +
          '到期日 = 账单日 + 付款条款天数\n\n' +
          '• 即期（Due on Receipt）→ 账单日当天\n' +
          '• Net 14 → 账单日 + 14 天（ShipBob 小额账单常见）\n' +
          '• Net 30 → 账单日 + 30 天（最常见，FedEx / UPS / 3PL）\n' +
          '• Net 45 / 60 → 账单日 + 45 / 60 天（大额长期合同）\n' +
          '• 2/10 Net 30 → 10 天内付款享 2% 折扣；否则 30 天内全额付\n\n' +
          '注意：部分供应商从"收到账单日"起算，部分从"账单日期"起算，需以合同为准。\n' +
          'OMS 在到期前 7 天自动发出预警提醒，到期前 3 天升级通知。',
        fees: [],
        commonIssues: [
          '账单格式各异（PDF / CSV / EDI）→ 手动录入耗时，建议接入 EDI 自动解析',
          '账单到达比实际服务期滞后 15~45 天 → 需在月末"计提"估算应付；注意此时到期日尚未明确，先用估算到期日',
          'ShipBob 账单项目繁多 → 需逐项核对（存储/拣货/入库/退货处理）',
          '到期日争议：供应商从"账单日"算，商家从"收到日"算 → 合同应明确以哪一方日期为准',
        ],
        moduleLink: '/dashboard/payables',
        accountingNote:
          'Invoice received — pending verification, no entry yet.\n\nOnce 3-Way Match approved:\nDr: Expense Account (6100/6200/6300)\nCr: Accounts Payable',
        accountingNoteCn:
          '账单录入阶段：暂不做正式记账，只记录"待核验"状态。\n\n' +
          '三方核验通过后才做正式分录：\n借：费用科目（仓储费 6100 / 运费 6200 / 平台费 6300）\n贷：应付账款\n\n' +
          '如果月末账单还没到但服务已发生，需先"计提"（Accrual）：\n借：费用科目\n贷：应计负债\n账单到达且核验后再将应计负债转为应付账款。',
      },
      {
        id: 'p2p-2', seq: 3,
        title: '3-Way Match',
        titleCn: '三方核验（防多付的关键控制）',
        actor: 'OMS Finance', actorType: 'oms',
        summary: '把账单、合同价格、OMS 实际数量三方比对——三者吻合才放行付款',
        whatHappens:
          '三方核验（3-Way Match）是应付账款的核心内控环节，防止多付和错付：\n\n' +
          '① 合同 / 报价单（PO / Rate Card）：约定的单价和费率\n' +
          '② 实际服务量（OMS 记录）：实际发出多少单、多少件、多少立方英尺\n' +
          '③ 供应商账单（Invoice）：供应商要求支付的金额\n\n' +
          '三者完全一致 → 自动审批通过\n' +
          '有差异 → 进入"费用对账"流程，联系供应商确认或争议',
        fees: [],
        accountingNote:
          'Matched Invoice Entry:\nDr: Expense Account (6100/6200/6300)\nCr: Accounts Payable\n\nMismatch → Hold invoice pending investigation',
        accountingNoteCn:
          '三方核验通过后记入：\n借：费用科目（仓储费 6100 / 运费 6200 / 平台费 6300）\n贷：应付账款\n\n' +
          '有差异的账单暂不入账，挂起等待确认，防止错误金额流入财务记录',
        commonIssues: [
          '承运商附加费（燃油/住宅/超尺寸）在合同中未明确 → 常见差异来源',
          '汇率差异（英镑/欧元账单）→ 需确认双方约定的结算汇率基准',
          '服务量差异（OMS 数量 vs. 供应商计量）→ 可能存在计费单位不一致',
        ],
        moduleLink: '/dashboard/reconciliation',
        isKeyEvent: true,
      },
      {
        id: 'p2p-3', seq: 4,
        title: 'Cost Allocation',
        titleCn: '成本分摊到订单',
        actor: 'OMS Finance', actorType: 'finance',
        summary: '将仓储费 / 运费等分摊到每个订单，才能算清楚每单真正的利润',
        whatHappens:
          '一笔 3PL 月度账单（如 ShipBob 9 月账单 $5,715）覆盖了本月所有订单。需要将这笔总费用"分"到每个订单，才能准确计算订单级利润。\n\n' +
          '─── 四种分摊公式（按费用类型选择）─────────────────────────\n\n' +
          '① 平均分摊法（最简单，适合操作固定费）\n' +
          '  单订单分摊 = 月度账单总额 ÷ 当月出库订单总数\n' +
          '  示例：$5,715 ÷ 1,600 单 = $3.57 / 单\n\n' +
          '② 重量比例法（适合运费，最贴近实际成本驱动）\n' +
          '  单订单分摊 = 月度账单总额 × (该订单实际重量 ÷ 当月所有出库订单总重量)\n' +
          '  示例：FedEx $18,620 × (0.9 kg ÷ 1,440 kg) = $11.64 / 单\n\n' +
          '③ 体积 × 库龄法（适合仓储费，最精准但最复杂）\n' +
          '  SKU 仓储分摊 = 月度仓储费 × (SKU 体积 × 在库天数 ÷ Σ 所有 SKU 体积 × 在库天数)\n' +
          '  再按订单中该 SKU 的件数占比分摊到订单\n' +
          '  示例：WE-PRO-BLK 体积 0.5CF × 30 天 ÷ 全仓 1,538 CF·天 × $2,600 = $25.36 → 再分到含该 SKU 的各订单\n\n' +
          '④ 行数比例法（适合拣货费，每行耗时相近）\n' +
          '  单订单分摊 = 月度拣货费 × (该订单商品行数 ÷ 当月所有订单商品行数之和)\n' +
          '  示例：$425 拣货费 × (3 行 ÷ 4,280 行) = $0.30 / 单\n\n' +
          '─── 组合分摊（推荐）─────────────────────────────────────────\n' +
          '  拣货费     → 行数比例法\n' +
          '  包装 / 操作费 → 平均分摊法（每单操作量近似）\n' +
          '  运费       → 重量比例法\n' +
          '  仓储费     → 体积 × 库龄法（或简化为体积比例法）\n\n' +
          '分摊完成后，OMS 订单利润数据更新，支持渠道 / SKU / 客户维度的盈利分析。',
        fees: [],
        accountingNote:
          'Dr: Order-level COGS / Fulfillment Cost\nCr: Expense Accrual Clearing Account',
        accountingNoteCn:
          '分摊后每个订单的成本结构变得完整：\n' +
          '商品成本 + 仓储费分摊 + 运费 + 平台佣金 = 订单总成本\n' +
          '订单利润 = 销售收入 − 订单总成本\n\n' +
          '这是"订单级利润"数据的来源，是运营决策的重要依据。',
        commonIssues: [
          '分摊方法选择不当 → 高价值小件商品承担过多成本',
          '月末账单未到 → 需按历史均值先"预估分摊"，账单到后调整',
          '退货订单的成本分摊需特殊处理，不能按正常订单逻辑',
        ],
        moduleLink: '/dashboard/expenses',
      },
      {
        id: 'p2p-4', seq: 5,
        title: 'Approval Workflow',
        titleCn: '付款审批流程',
        actor: 'Finance / 管理层', actorType: 'finance',
        summary: '按账单金额走分级审批，大额账单需财务总监签批才能付款',
        whatHappens:
          '账单通过三方核验后，进入分级审批流程：\n\n' +
          '• < $1,000：OMS 系统自动审批通过\n' +
          '• $1,000 – $10,000：财务经理（Finance Manager）审批\n' +
          '• > $10,000：财务总监（Controller / CFO）审批\n\n' +
          '有争议的账单（差异未解决）进入"争议（Dispute）"流程，暂停付款，联系供应商确认后再重启审批。审批记录在 OMS 中留存完整日志，满足内控和审计要求。\n\n' +
          '─── 逾期判定逻辑 ────────────────────────────────────\n' +
          '逾期触发条件：当前日期 > 到期日（Due Date） 且 余额未清（balanceDue > 0）\n\n' +
          '  逾期天数 = max(0, 今日 − 到期日)\n' +
          '  逾期金额 = 账单余额（balanceDue）\n\n' +
          '逾期分级与处置：\n' +
          '• 1–7 天：⚠️ 预警黄色 — 正常审批流程，附带提醒注释\n' +
          '• 8–30 天：🟠 紧急橙色 — 自动升级财务经理，安排最近付款批次\n' +
          '• 31 天以上：🔴 严重红色 — 升级 CFO，触发供应商关系评估；可能计收滞纳金\n\n' +
          '滞纳金（Late Payment Penalty）：\n' +
          '• 合同通常约定：账单余额 × 1.5% / 月（= 年化 18%）\n' +
          '• 从到期日次日起计，按日折算：余额 × (1.5% ÷ 30) × 逾期天数\n' +
          '• 示例：$8,420 逾期 15 天 → 滞纳金 = $8,420 × 1.5% ÷ 30 × 15 = $63.15\n\n' +
          '早付款折扣（如 2/10 Net 30）：\n' +
          '• 折扣窗口 = 账单日 + 10 天；超过窗口则折扣失效，按全额付\n' +
          '• 年化收益率 ≈ 2% ÷ 20 天 × 365 天 ≈ 36.5%，通常值得优先付款',
        fees: [],
        commonIssues: [
          '审批人出差或假期 → 建议设置代理审批人（Backup Approver）机制',
          '争议账单长期挂起 → 影响供应商关系，应设置最长 10 个工作日的处理 SLA',
          '逾期未支付导致供应商暂停服务（3PL 可能拒绝新入库单）→ 需在系统中设置逾期前 7 天强制预警',
          '早付款折扣窗口（如 2/10）过期后无法补救 → OMS 应在折扣截止前 2 天推送提醒',
        ],
        moduleLink: '/dashboard/payables',
        accountingNote:
          'No journal entry at this step.\nApproval is a workflow control, not an accounting event.',
        accountingNoteCn:
          '审批流程本身不产生会计分录——它是内控流程，不是资金事件。\n\n' +
          '只有在审批通过后，应付账款才正式入账（参见上一步三方核验的分录）。\n\n' +
          '审批拒绝 → 账单进入"争议"状态，暂不入账，联系供应商处理后重新发起。',
      },
      {
        id: 'p2p-5', seq: 6,
        title: 'Payment Execution',
        titleCn: '执行付款',
        actor: 'Finance / Treasury', actorType: 'finance',
        summary: '审批通过后按合同付款条款打款，优化付款时机以保护现金流',
        whatHappens:
          '付款方式和时机选择很重要：\n\n' +
          '付款条款解读：\n' +
          '• Net 30：收到账单后 30 天内付款\n' +
          '• 2/10 Net 30：10 天内付款享受 2% 折扣，否则 30 天内全额付款\n' +
          '• Net 45 / Net 60：账期更长，有利于保护商家现金流\n\n' +
          '常用付款方式：\n' +
          '• ACH（美国国内，免费或极低费用，T+1 到账）\n' +
          '• 国际电汇（Wire Transfer，适合跨境付款）\n' +
          '• 虚拟信用卡（部分公司用于控制付款，可获返现）',
        fees: [
          { name: 'ACH 银行转账费', nameEn: 'ACH Transfer Fee',
            description: '美国国内银行间电子转账',
            typical: '免费 ～ $1.50 / 笔', payer: '商家' },
          { name: '国际电汇费', nameEn: 'International Wire Transfer',
            description: '向海外供应商付款的跨境转账',
            typical: '$15–$50 / 笔（发款行）+ $15–$25（收款行可能收取）', payer: '商家' },
          { name: '虚拟信用卡费', nameEn: 'Virtual Card Program',
            description: '部分商家使用虚拟信用卡付款可获消费返现',
            typical: '无额外手续费；返现 1%–2%', payer: '商家' },
        ],
        accountingNote:
          'Dr: Accounts Payable  ← AP 账户清零\n' +
          'Cr: Cash / Bank  ← 现金减少',
        accountingNoteCn:
          '付款完成时：\n借：应付账款  → 之前欠供应商的账款结清\n贷：银行存款  → 现金实际流出\n\n' +
          '权责发生制：费用早在服务发生时就已确认，付款只是"清账"动作，不影响损益表。',
        standard: 'GAAP Accrual Basis — Expenses recognized when incurred, not when payment is made.',
        standardCn: '权责发生制：费用在享受到服务时就应该记录，而不是等到付款时才记录。所以 3PL 9 月的仓储费，不管 10 月或 11 月才付款，都应该计入 9 月的费用。',
        commonIssues: [
          '早付款折扣（2/10 Net 30）需财务主动判断是否合算（2% 折扣 ≈ 年化 36% 收益率）',
          '国际付款汇率 → 应在付款当天锁定汇率，避免汇率波动风险',
          '重复付款风险 → 同一账单收到两份（邮件 + 邮寄），需系统去重控制',
        ],
        moduleLink: '/dashboard/payables',
        isKeyEvent: true,
      },
      {
        id: 'p2p-6', seq: 7,
        title: 'GL Journal Entry & ERP Sync',
        titleCn: 'ERP 总账记账（应付清零）',
        actor: 'OMS → ERP (NetSuite/QB)', actorType: 'erp',
        summary: 'AP 账款清零，费用科目入账，ERP 总账更新——月结时一并同步',
        whatHappens:
          '付款完成后，OMS 将应付账款清零操作同步至 ERP：\n\n' +
          '① 应付账款（AP）科目：从"待付"状态清零\n' +
          '② 各费用科目（仓储 6100、运费 6200、平台费 6300）：更新为实际金额\n' +
          '③ 银行/现金科目：减少实际付款金额\n\n' +
          'ERP 收到数据后，AP Aging Report 自动更新，财务报表中的"现金"和"应付账款"余额同步刷新。',
        fees: [],
        accountingNote:
          'Dr: Accounts Payable  ← AP cleared\n' +
          'Cr: Cash / Bank  ← Cash outflow\n\n' +
          'If accrual ≠ actual:\nDr/Cr: Expense Account (adjustment)\nCr/Dr: Accrual Clearing',
        accountingNoteCn:
          '付款后的 ERP 分录：\n' +
          '借：应付账款  → 清零之前欠款\n' +
          '贷：银行存款  → 现金减少\n\n' +
          '若实际账单金额与月初计提不符，还需做一笔调整分录，把差异计入当期损益。',
        commonIssues: [
          '计提金额与实际账单差异 > 5% → 需检查成本模型准确性',
          'ERP 科目映射错误 → 费用被计入错误科目，影响管理报表分类',
        ],
        moduleLink: '/dashboard/reconciliation',
      },
    ],
  },

  // ═══ R2R — 月度关账与财务报告 ══════════════════════════════════════════════
  {
    id: 'r2r',
    title: 'Record-to-Report (R2R)',
    subtitle: '月度关账 · 三方对账 · ERP 同步 · 财务报告生成 — US GAAP 合规',
    colorScheme: 'emerald',
    steps: [
      {
        id: 'r2r-1', seq: 1,
        title: 'Transaction Completeness',
        titleCn: '交易完整性检查',
        actor: 'OMS / Finance', actorType: 'oms',
        summary: '月末关账前，确认本月所有收入、成本、费用都已记录，没有漏账',
        whatHappens:
          '月末关账（Month-End Close）的第一步是"确认没有漏账"：\n\n' +
          '• 所有已签收订单都有对应的收入确认记录\n' +
          '• 所有已使用的仓储/运输服务都有对应的费用记录（已收账单或计提）\n' +
          '• 所有已付款项都已在 OMS 中标记\n' +
          '• 对照各渠道结算报告，确认无遗漏订单\n\n' +
          '通常使用"完整性检查清单（Close Checklist）"逐项核对，约需 1~3 个工作日。',
        fees: [],
        commonIssues: [
          '月末最后几天的订单（Cutoff）：已发货未签收的订单不能确认为当月收入',
          '3PL 账单延迟到达：服务已发生但账单未到，需按估算金额计提',
          '跨时区订单：不同时区的"月末最后一天"可能导致归期争议',
        ],
        moduleLink: '/dashboard/reconciliation',
        accountingNote:
          'No journal entry — this is a completeness check procedure.\n' +
          'Identify missing entries: unrecognized revenue, unaccrued expenses, unmatched settlements.',
        accountingNoteCn:
          '完整性检查本身不产生会计分录，它是关账流程的"质检环节"。\n\n' +
          '检查目标：\n• 有没有已签收但未确认收入的订单？\n• 有没有服务已使用但未计提的费用？\n• 有没有已到账但未核销的结算款？\n\n' +
          '发现漏项 → 立即补做对应分录，确保报表完整准确。',
      },
      {
        id: 'r2r-2', seq: 2,
        title: 'Settlement Reconciliation',
        titleCn: '渠道结算对账',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '把 OMS 预计到账金额与各平台结算报告逐条比对，发现并处理差异',
        whatHappens:
          '财务团队（或 OMS 自动对账功能）将以下两份数据进行比对：\n\n' +
          '① OMS 计算的预计净结算金额（订单收入 − 预计平台费 − 退款 = 预计应收）\n' +
          '② 平台实际结算报告（Amazon Settlement Report / Shopify Payout / TikTok Seller Center）\n\n' +
          '对账维度：按每个结算周期、每个渠道、每个店铺独立核对。\n' +
          '差异判断：金额差异 > $1 需标记并查明原因。',
        fees: [],
        commonIssues: [
          'Amazon FBA 库存调整（损毁/丢失赔偿）金额不定期出现，需专项核查',
          '广告费归期：广告消耗与扣款日期可能跨结算周期',
          '退款时序：客户在 A 周期退货，平台在 B 周期才扣回退款',
        ],
        moduleLink: '/dashboard/reconciliation',
        accountingNote:
          'No new journal entry — reconciliation is a verification step.\n\nOn variance found:\nDr/Cr: Variance Account (temp)\nCr/Dr: Settlement Receivable\n→ Investigate and resolve within SLA.',
        accountingNoteCn:
          '对账本身不产生新的会计分录，是核查已有分录的准确性。\n\n' +
          '发现差异时的处理：\n借/贷：差异暂挂科目  → 临时记录差异金额\n贷/借：渠道结算应收款  → 调整至实际金额\n\n' +
          '差异原因查明后：消除暂挂科目，做正确的调整分录。\n常见：退款时序错位、广告费跨期、平台库存损耗赔偿等。',
        isKeyEvent: true,
      },
      {
        id: 'r2r-3', seq: 3,
        title: 'Fee Reconciliation',
        titleCn: '费用差异核查',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '核查 3PL / 承运商 / 平台实际账单是否与 OMS 预估相符，差异需查明原因',
        whatHappens:
          '将 OMS 成本模型计算的"预计费用"与供应商实际账单逐项比对：\n\n' +
          '• 3PL 费用：OMS 按拣货件数 × 单价预估 vs. 实际账单\n' +
          '• 运费：OMS 按运单重量 × 费率预估 vs. FedEx/UPS 实际账单\n' +
          '• 平台费：OMS 按订单金额 × 佣金率预估 vs. 平台结算扣减明细\n\n' +
          '常见差异原因：附加费未配置（燃油/住宅/超尺寸）、费率变动未同步。',
        fees: [],
        commonIssues: [
          '承运商燃油附加费每周浮动，OMS 费率配置通常每月更新，存在滞后',
          '平台费率调整（如 TikTok 调整佣金率）未及时在 OMS 中同步',
          '汇率差异：英镑/欧元账单换算为美元时，OMS 和供应商使用不同汇率',
        ],
        moduleLink: '/dashboard/reconciliation',
        accountingNote:
          'No journal entry — this is a variance investigation step.\n\nWhen variance is confirmed and resolved:\nDr/Cr: Expense Account (6100/6200/6300)\nCr/Dr: Accrued Liabilities (adjust accrual to actual)',
        accountingNoteCn:
          '差异核查本身不产生分录，是确认"预估 vs 实际"差距的分析步骤。\n\n' +
          '差异确认并解决后，做调整分录：\n借/贷：费用科目（仓储 6100 / 运费 6200 / 平台费 6300）\n贷/借：应计负债  → 将月初计提调整到实际金额\n\n' +
          '核心目的：确保当期费用精确反映实际发生额，而非估算值。',
      },
      {
        id: 'r2r-4', seq: 4,
        title: 'Accruals & Adjustments',
        titleCn: '费用计提与调整',
        actor: 'Finance Controller', actorType: 'finance',
        summary: '服务已发生但账单未到的费用，先估一个数字记账（计提），账单到后调整',
        whatHappens:
          '"计提（Accrual）"：虽然还没有收到账单，但服务已经发生，所以这个月的费用里应该包含它。\n\n' +
          '常见计提场景：\n' +
          '• 3PL 9 月仓储费账单 10 月 15 日才到 → 9 月月结时先按估算金额（参考上月）计提\n' +
          '• 承运商 9 月运费账单延迟 → 先按运单数量 × 平均运费估算\n' +
          '• 年度服务合同（如软件订阅）→ 按月均摊\n\n' +
          '月末同时处理：摊销预付费用、调整库存准备金。',
        fees: [],
        accountingNote:
          'Accrual Entry:\nDr: Expense Account (6xxx)\nCr: Accrued Liabilities\n\nWhen actual invoice arrives:\nDr: Accrued Liabilities\nDr/Cr: Expense (difference)\nCr: Accounts Payable',
        accountingNoteCn:
          '计提分录：\n借：费用科目（如仓储费 6100）→ 当期费用增加\n贷：应计负债（Accrued Liabilities）→ 暂记负债\n\n' +
          '账单到达后调整：\n借：应计负债  → 清零之前的计提\n借/贷：费用差额  → 实际 vs. 预估的差异\n贷：应付账款  → 真实负债确认',
        standard: 'GAAP Matching Principle — Expenses must be recognized in the same period as the related revenues they help generate.',
        standardCn:
          '配比原则（Matching Principle）：费用要和产生该费用的收入匹配到同一个会计期间。\n\n' +
          '例如：9 月完成了 5,000 个订单，产生了仓储费、运费，这些费用必须计入 9 月，而不是等账单到了才计入。这样才能反映 9 月的真实利润。',
        commonIssues: [
          '计提金额偏差 > 10% → 需检查成本模型参数，通常是附加费漏算',
          '每月调整幅度大 → 建议在 OMS 中配置更精准的自动计提规则',
        ],
        isKeyEvent: true,
      },
      {
        id: 'r2r-5', seq: 5,
        title: 'ERP GL Sync & Period Lock',
        titleCn: 'ERP 总账同步与期间锁定',
        actor: 'OMS → ERP (NetSuite/QB)', actorType: 'erp',
        summary: '所有数据推送至 NetSuite，双方锁定本月，防止历史数据被修改',
        whatHappens:
          'OMS 将本月最终确认的所有会计分录（含计提调整）通过 API 推送至 ERP 总账（General Ledger）。ERP 完成入账后，财务人员核查试算平衡表（Trial Balance），确认借贷双方平衡无误。\n\n' +
          '确认无误后执行"期间锁定（Period Lock）"：\n' +
          '• OMS 侧：该月份状态变为"已关账"，不允许新增或修改交易\n' +
          '• ERP 侧：该会计期间锁定，防止未经授权的修改\n\n' +
          '如需修改已锁定期间的数据，必须经过审批，通过"调整分录（Adjusting Entry）"处理，留下完整审计轨迹。',
        fees: [],
        commonIssues: [
          'API 批量同步超时 → 大月份（高订单量）同步时间可能超过 30 分钟',
          '试算不平衡（Unbalanced Trial Balance）→ 必须查明原因才能锁期',
          '锁定后发现数据错误 → 需走审批才能解锁或补做调整分录',
        ],
        moduleLink: '/dashboard/reconciliation',
        accountingNote:
          'No new journal entry — Period Lock is an internal control procedure.\n\nAll entries from O2C + P2P are pushed to ERP GL.\nTrial Balance verified: Total Debits = Total Credits.',
        accountingNoteCn:
          '期间锁定不产生新的会计分录，它是对所有已做分录的"封存"操作。\n\n' +
          '锁定前确认：试算平衡表借贷双方相等（Total Dr = Total Cr）。\n\n' +
          '锁定后：该月所有科目余额固定，任何修改都需审批并留审计轨迹。\n' +
          '这是 SOX 404 内控合规的强制要求——防止历史数据被篡改。',
        isKeyEvent: true,
      },
      {
        id: 'r2r-6', seq: 6,
        title: 'Financial Reporting',
        titleCn: '财务报表输出',
        actor: 'ERP / Finance', actorType: 'erp',
        summary: 'ERP 生成三大财务报表；OMS 提供渠道利润、SKU 利润等运营层分析',
        whatHappens:
          '一切就绪后，ERP 自动生成三张核心财务报表：\n\n' +
          '① 损益表（P&L / Income Statement）：本月/本季度/本年度收入、成本、费用、净利润\n' +
          '② 资产负债表（Balance Sheet）：资产（库存、应收款、现金）、负债（应付款、递延收入）、净资产的快照\n' +
          '③ 现金流量表（Cash Flow Statement）：经营/投资/融资活动的实际现金流入流出\n\n' +
          'OMS 同时提供运营层报告（不在 ERP 中）：\n' +
          '• 渠道利润率（Amazon vs. Shopify vs. TikTok）\n' +
          '• SKU 级边际贡献\n' +
          '• 客户生命周期价值（LTV）',
        fees: [],
        standard: 'US GAAP Financial Statements: Income Statement (ASC 225), Balance Sheet (ASC 210), Statement of Cash Flows (ASC 230).',
        standardCn: '美国 GAAP 要求的三大财务报表：损益表（ASC 225）、资产负债表（ASC 210）、现金流量表（ASC 230）。上市公司须按季度（10-Q）和年度（10-K）向 SEC 申报。',
        commonIssues: [
          '管理报告时间紧迫：通常 ERP 关账后 3~5 个工作日内完成财务报告',
          'P&L 与 OMS 利润数字不一致：常因科目分类差异，需做差异说明',
        ],
        moduleLink: '/dashboard/reports/finance',
        accountingNote:
          'No journal entry — financial reports are outputs, not inputs.\n\nReports generated from accumulated GL balances:\nP&L, Balance Sheet, Cash Flow Statement.',
        accountingNoteCn:
          '财务报表输出不产生新的会计分录——报表是对所有已入账数据的"汇总展示"。\n\n' +
          '三大报表来源：\n• 损益表（P&L）：收入 − 成本 − 费用 = 净利润\n• 资产负债表：资产 = 负债 + 所有者权益（某时点快照）\n• 现金流量表：经营/投资/融资活动的实际现金流\n\n' +
          '特别注意：损益表的"利润"和现金流量表的"现金流"可以差异很大（权责发生制原因）。',
        isKeyEvent: true,
      },
    ],
  },

  // ═══ B2B O2C — 企业客户应收全流程 ═══════════════════════════════════════
  {
    id: 'b2b',
    title: 'B2B Order-to-Cash (B2B O2C)',
    subtitle: '企业客户先发货后开票 · PO 驱动 · AR 账龄追踪 · 收款核销',
    colorScheme: 'amber',
    steps: [
      {
        id: 'b2b-0', seq: 1,
        title: 'Customer Master Setup',
        titleCn: 'B2B 客户档案配置（Customer Master）',
        actor: 'Finance / Sales', actorType: 'finance',
        summary: '建立 B2B 客户档案——授信额度、账期、开票信息——信用审核和开票流程的数据基础',
        whatHappens:
          '每个 B2B 客户在 OMS 中必须有完整档案，信用审核和开票才能自动化运转。\n\n' +
          '─── 客户档案必填字段 ──────────────────────────────────────\n' +
          '基础信息：\n' +
          '• 公司法人名称（与发票抬头完全一致）\n' +
          '• Tax ID / EIN（发票必须印上，否则客户 AP 无法过税务审核）\n' +
          '• 开票地址（Bill-to Address）\n' +
          '• 收货地址（Ship-to Address，可多个）\n\n' +
          '授信与账期配置（信用审核的数据来源）：\n' +
          '• 授信额度（Credit Limit）：单位 USD，超出则触发人工审批\n' +
          '• 付款条款：Net 30 / Net 45 / Net 60 / Net 90\n' +
          '• 信用评级：A（优质）/ B（一般）/ C（需关注）/ 预付款\n' +
          '• 历史 DSO 参考值（辅助评级判断）\n\n' +
          '开票配置（开票流程的数据来源）：\n' +
          '• 开票方式：邮件 PDF / EDI 810 / 供应商门户上传\n' +
          '• AR 联系人邮箱（AP 部门专用，不能是采购联系人）\n' +
          '• Tax Exempt 状态 + 免税证书（Resale Certificate）有效期\n' +
          '• 发票账期起算规则：收到日 / 认可日（大客户常见）\n\n' +
          '付款配置：\n' +
          '• 付款方式：Wire / ACH / 支票\n' +
          '• 银行收款账户（我方收款账号，打印在发票上）\n\n' +
          '─── 档案变更管理 ─────────────────────────────────────────\n' +
          '授信额度调整 → 需财务经理审批并注明调整原因和有效期\n' +
          '免税证书过期 → 系统预警，续签前开票须按默认税率处理\n' +
          'AR 联系人变更 → 立即更新，否则发票会打进"黑洞"',
        fees: [],
        accountingNote:
          'No journal entry — customer master setup is a configuration step.\nCredit limit and payment terms configured here control AR exposure and invoice terms.',
        accountingNoteCn:
          '客户档案配置不产生会计分录，但它直接决定：\n\n' +
          '• 信用审核能否自动通过（授信额度）\n' +
          '• 发票的到期日（账期天数）\n' +
          '• AR 逾期判定（到期日 + 今日对比）\n' +
          '• 发票税务处理（免税 or 含税）\n\n' +
          '档案配置错误的后果：\n' +
          '账期设错 → 提前催款影响客户关系；免税状态过期 → 漏收税款产生税务风险。',
        commonIssues: [
          '开票抬头与客户实际公司名不一致 → 客户 AP 拒付，需开 Credit Memo 重新开票',
          '免税证书过期未续签 → 开出发票无税，但法律上应收税，产生税务敞口',
          'AR 联系人邮箱未更新 → 发票发到错误邮箱，账期白白流失',
          '授信额度长期不复审 → 老客户经营状况恶化但额度未降，坏账风险累积',
        ],
        moduleLink: '/dashboard/receivables',
      },
      {
        id: 'b2b-1', seq: 2,
        title: 'B2B PO Received',
        titleCn: 'B2B 下单（接收采购订单）',
        actor: 'Sales Channel / 渠道', actorType: 'channel',
        summary: '企业客户发来采购订单（PO），OMS 创建 B2B 订单，库存预锁，等待信用审核',
        whatHappens:
          'B2B 订单通常通过以下方式进入 OMS：\n\n' +
          '• EDI 850（电子采购订单，大型零售商如 Walmart、Target 必用）\n' +
          '• 邮件 / 传真 PO → 人工录入\n' +
          '• 商家自建 B2B 门户（客户登录后直接下单）\n' +
          '• API 对接（ERP 到 ERP）\n\n' +
          'B2B 订单与 B2C 的关键区别：\n' +
          '• 无需立即支付——先发货，后根据账期收款\n' +
          '• 必须携带客户 PO 号（客户 AP 核销时必须对应 PO）\n' +
          '• 通常数量大、SKU 种类多，需要行项目明细\n' +
          '• 订单金额较大 → 必须先做信用审核，再安排发货',
        fees: [],
        commonIssues: [
          'EDI 850 字段映射错误 → PO 号、数量、单位不一致，需人工核对',
          '客户 PO 号未录入 OMS → 开票后客户 AP 无法核销，导致付款延迟',
          'B2B 订单误按 B2C 流程处理 → 触发预付款要求，客户体验差',
        ],
        moduleLink: '/dashboard/orders',
      },
      {
        id: 'b2b-2', seq: 3,
        title: 'Credit Check & Terms',
        titleCn: '信用审核（授信 & 账期设定）',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '查信用额度、设定账期（Net 30/45/60）——决定能不能先发货、发多少',
        whatHappens:
          '信用审核是 B2B O2C 的"门卫"，防止坏账风险：\n\n' +
          '① 信用额度检查（Credit Limit Check）\n' +
          '   本次 PO 金额 + 当前未付应收 ≤ 客户授信额度 → 通过\n' +
          '   超出额度 → 需财务审批或要求预付款\n\n' +
          '② 账期设定（Payment Terms Assignment）\n' +
          '   新客户：通常 Net 30，或要求首单预付\n' +
          '   老客户（信用良好）：Net 45 / Net 60\n' +
          '   优质客户（如 Walmart）：Net 60 / Net 90\n\n' +
          '③ 信用评分参考维度\n' +
          '   • 历史付款记录（DSO 是否稳定）\n' +
          '   • 当前逾期金额\n' +
          '   • 年度采购量\n' +
          '   • 是否有担保 / 信用保险\n\n' +
          '审核通过 → OMS 自动设定该订单账期，进入发货流程\n' +
          '审核拒绝 → 订单挂起，联系客户协商付款方式',
        fees: [],
        accountingNote:
          'No journal entry at credit check.\nOrder placed on hold pending credit approval.',
        accountingNoteCn:
          '信用审核本身不产生会计分录，它是业务控制节点。\n\n' +
          '通过审核后，在 OMS 中记录：\n' +
          '• 客户授信额度（Credit Limit）\n' +
          '• 本订单账期（Payment Terms）\n' +
          '• 预计应收到期日 = 发票日 + 账期天数\n\n' +
          '这些参数在后续开票和 AR 追踪中自动使用。',
        commonIssues: [
          '信用额度不更新 → 老客户采购量增加但额度未同步调高，频繁触发人工审批',
          '新客户首单 → 建议设置"首单预付 50%，余款 Net 30"的过渡策略',
          '季节性大单（Q4）→ 临时提额需 CFO 审批并记录有效期',
        ],
        isKeyEvent: true,
      },
      {
        id: 'b2b-3', seq: 4,
        title: 'Ship + Invoice Generation',
        titleCn: '发货 + 开具销售发票（AR Invoice）',
        actor: 'WMS + Finance / OMS', actorType: 'finance',
        summary: '货物出库的同时生成正式销售发票，这是应收账款正式成立的时刻',
        whatHappens:
          'B2B 发货与开票是同步触发的：货物出库 → 系统自动生成 AR Invoice。\n\n' +
          '─── 开票维度选择 ───────────────────────────────────────\n' +
          '• 一单一票（Order-level）：每张 PO 对应一张发票，适合大单、首次合作\n' +
          '• 客户周期合并（Customer-level）：本月所有订单合并一张，减少对方 AP 处理量\n' +
          '• 分批发货分批开票（Partial）：按实际发货量开票，未发部分不计应收\n\n' +
          '─── 发票必含字段 ───────────────────────────────────────\n' +
          '• 发票抬头：客户公司名、地址、Tax ID / EIN\n' +
          '• 行项目明细：每个 SKU 的描述、数量、单价、小计（B2B 必须，客户 AP 需逐行核对 PO）\n' +
          '• 付款条款：Net 30（印在发票上）\n' +
          '• 到期日：Invoice Date + 30 天（明确标注）\n' +
          '• 关联 PO 号：客户的采购订单号（核销必须）\n' +
          '• 付款说明：银行账号、ACH Routing Number、支票抬头\n' +
          '• 税务处理：B2B 通常 Tax Exempt（凭客户免税证书），或含税（需分开列示）',
        fees: [],
        accountingNote:
          'Dr: Accounts Receivable (AR)  1200\nCr: Revenue (recognized)  4000\nCr: Sales Tax Payable (if applicable)  2200\n\n' +
          'Simultaneously:\nDr: COGS  5000\nCr: Inventory  1300',
        accountingNoteCn:
          '发货+开票时同时发生两笔分录：\n\n' +
          '① 确认应收和收入：\n借：应收账款（AR）1200  → 客户欠我们的钱\n贷：销售收入 4000  → 收入正式确认（货已交付）\n\n' +
          '② 结转库存成本：\n借：销货成本（COGS）5000\n贷：库存资产 1300  → 库存减少\n\n' +
          '注意：B2B 收入在发货/交付时确认（ASC 606），不等收到现金。',
        standard: 'ASC 606 — Revenue recognized at point of control transfer (delivery). AR recorded at invoice amount.',
        standardCn:
          'B2B 收入确认：控制权（Control）转移给客户时确认收入。通常为"货物交付给承运商"或"客户签收"时点，以合同约定为准（FOB Shipping Point vs. FOB Destination）。\n\n' +
          'FOB Shipping Point：货物交给承运商即确认收入（出库即开票）\n' +
          'FOB Destination：货物到达客户仓库才确认收入（签收后开票）',
        commonIssues: [
          '发票抬头与客户注册信息不符 → 客户 AP 拒付，需重新开票（Credit Memo + 新发票）',
          '分批发货漏开发票 → 已发货但未入账应收，导致 AR 余额偏低',
          '行项目明细与客户 PO 数量不一致 → 触发客户三方核验失败，付款延迟',
        ],
        moduleLink: '/dashboard/orders',
        isKeyEvent: true,
      },
      {
        id: 'b2b-4', seq: 5,
        title: 'Invoice Delivery',
        titleCn: '发票交付',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '把发票发给客户财务——方式要对，否则客户收不到就不会付款',
        whatHappens:
          '发票生成后必须及时送达客户 AP 部门，常用方式：\n\n' +
          '• 邮件 PDF（最常见）：发至客户 AP 专用邮箱（ap@company.com）\n' +
          '• EDI 810（电子发票）：大型零售商强制要求，格式标准化，自动进入客户 ERP\n' +
          '• 客户门户上传：部分企业客户要求在其 Supplier Portal 上传\n' +
          '• 邮寄纸质发票（极少，仅部分传统行业）\n\n' +
          '─── 关键注意点 ─────────────────────────────────────────\n' +
          '• 确认客户 AP 联系人邮箱（不能发给采购，采购不处理付款）\n' +
          '• 发票编号唯一（Invoice #）：方便客户系统录入和核销\n' +
          '• 保留发送记录（时间戳）：逾期追款时可证明"发票已送达"\n' +
          '• 大客户通常要求在 ERP 中"认可"发票后才开始计账期——需确认客户从哪天开始算 Net 30',
        fees: [],
        accountingNote:
          'No new journal entry — invoice delivery is an operational step.\nAR was already recorded when invoice was generated.',
        accountingNoteCn:
          '发票交付不产生新的会计分录——应收账款在开票时已入账。\n\n' +
          '此步骤的财务意义：\n• 启动客户账期计时（账期从发票送达或认可日开始）\n• 留存发送凭据（用于后续催款和纠纷处理）\n• 触发 OMS 的 AR 账龄追踪模块开始计时',
        commonIssues: [
          '发票发送至错误邮箱（采购而非 AP）→ 客户 AP 没有收到，到期后才发现',
          '大客户"发票认可日"比收到日晚 7~10 天 → 实际账期从认可日计，需在 OMS 中记录',
          'EDI 810 格式错误 → 客户 ERP 拒收，发票未入对方系统，账期未启动',
        ],
      },
      {
        id: 'b2b-5', seq: 6,
        title: 'AR Aging & Collections',
        titleCn: 'AR 账龄管理（逾期追踪）',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '追踪每张发票到期状态，分级催款——DSO 是 B2B 应收健康度的核心指标',
        whatHappens:
          'AR 账龄管理是 B2B 应收的日常工作核心：\n\n' +
          '─── 逾期判定公式 ───────────────────────────────────────\n' +
          '  应收到期日 = 发票日 + 账期天数（如 +30）\n' +
          '  逾期天数   = max(0, 今日 − 应收到期日)\n' +
          '  逾期金额   = 未收余额（Outstanding Balance）\n\n' +
          '─── 账龄分级与催款动作 ─────────────────────────────────\n' +
          '  到期前 7 天    → 系统自动发付款提醒邮件\n' +
          '  逾期 1–15 天   → 系统自动发逾期通知（附发票 PDF）\n' +
          '  逾期 16–30 天  → 销售 / 客户经理电话跟进\n' +
          '  逾期 31–60 天  → 财务介入，暂停新订单，可收取滞纳金（1.5%/月）\n' +
          '  逾期 60 天以上 → 法务 / 催收，计提坏账准备\n\n' +
          '─── DSO（Days Sales Outstanding）────────────────────────\n' +
          '  DSO = (期末应收账款余额 ÷ 当期收入) × 统计天数\n' +
          '  示例：应收余额 $120,000 ÷ 月收入 $280,000 × 30 天 = 12.9 天\n' +
          '  DSO ≤ 账期天数 → 健康；DSO > 账期天数 → 存在系统性逾期',
        fees: [],
        accountingNote:
          'If overdue > 60 days, consider Bad Debt Allowance:\nDr: Bad Debt Expense\nCr: Allowance for Doubtful Accounts (contra-AR)\n\nDo NOT write off AR until confirmed uncollectible.',
        accountingNoteCn:
          '逾期超 60 天时，按谨慎性原则计提坏账准备：\n借：坏账费用\n贷：坏账准备（AR 备抵科目）\n\n' +
          '注意：计提坏账准备 ≠ 核销 AR。只有确认完全无法收回时，才做核销：\n借：坏账准备\n贷：应收账款\n\n' +
          '坏账准备计提方法：\n• 账龄分析法（最常见）：逾期 0–30 天计提 2%，31–60 天 10%，60 天以上 50%\n• 余额百分比法：期末 AR 余额 × 历史坏账率',
        standard: 'ASC 310 — Receivables measured at net realizable value. Allowance method required for expected credit losses.',
        standardCn: 'ASC 310 + ASC 326（CECL）：应收账款按净可变现价值列报。美国 GAAP 要求采用"预期信用损失（CECL）"模型，在账款逾期前就需要估计并计提潜在坏账，而非等到实际发生后才确认。',
        commonIssues: [
          'DSO 持续高于账期 → 需检查是否存在系统性延迟付款客户，考虑调整账期或要求预付',
          '催款邮件发给采购而非 AP → 客户 AP 不知情，继续延迟',
          '未及时暂停逾期客户的新订单 → 坏账风险叠加增加',
        ],
        moduleLink: '/dashboard/receivables',
        isKeyEvent: true,
      },
      {
        id: 'b2b-6', seq: 7,
        title: 'Payment Receipt & Application',
        titleCn: '收款核销（Payment Application）',
        actor: 'Finance / OMS', actorType: 'finance',
        summary: '客户付款到账后，把这笔钱"对应"到具体发票——AR 余额清零',
        whatHappens:
          '客户付款到账（Wire / ACH / 支票）后，财务需做"收款核销（Payment Application）"：\n\n' +
          '① 识别来款：银行流水中找到客户付款，确认金额和付款方\n' +
          '② 核销匹配：将付款金额对应到具体发票号（Invoice #）\n' +
          '   • 全额匹配：付款 = 发票金额 → 直接核销，AR 清零\n' +
          '   • 部分付款：付款 < 发票金额 → AR 余额保留差额，继续追收\n' +
          '   • 超额付款：付款 > 发票金额 → 差额计入预收款（客户信用）\n' +
          '   • 扣款付款：客户自行扣除折扣 / 索赔 → 需确认是否批准\n\n' +
          '─── 客户扣款（Deduction）处理 ──────────────────────────\n' +
          '  大型零售商（Walmart、Amazon Vendor）经常自行扣除：\n' +
          '  • 早付款折扣（如 2/10 已过期但客户仍扣）\n' +
          '  • 物流索赔（货物损坏、短装）\n' +
          '  • 合规罚款（标签错误、迟发货等）\n' +
          '  处理：批准扣款则做收入调整；不批准则发 Debit Note 追收差额',
        fees: [],
        accountingNote:
          'Dr: Cash / Bank  1000\nCr: Accounts Receivable  1200\n\nFor early payment discount taken:\nDr: Cash (net amount received)\nDr: Sales Discount  4100\nCr: Accounts Receivable (full invoice amount)',
        accountingNoteCn:
          '收款核销分录：\n借：银行存款  → 现金实际收到\n贷：应收账款  → AR 余额减少，对应发票核销\n\n' +
          '如客户享有早付款折扣（2/10 Net 30，在 10 天内付款）：\n借：银行存款（实收金额，如 $9,800）\n借：销售折扣 4100（折扣金额，如 $200）\n贷：应收账款（发票全额，如 $10,000）\n\n' +
          '销售折扣计入收入抵减科目，不影响 COGS。',
        commonIssues: [
          '客户付款没有注明发票号 → 来款识别困难，需人工对账（常见于支票付款）',
          '一笔付款跨多张发票 → 需按金额逐一核销，系统需支持多对多匹配',
          '客户未经批准自行扣款 → 需发 Deduction Dispute Letter，记录并追收',
        ],
        moduleLink: '/dashboard/receivables',
      },
      {
        id: 'b2b-7', seq: 8,
        title: 'GL Journal & AR Close',
        titleCn: 'ERP 总账记账（AR 清零）',
        actor: 'OMS → ERP (NetSuite/QB)', actorType: 'erp',
        summary: '应收账款核销同步 ERP，AR Aging Report 更新，月结完成',
        whatHappens:
          'B2B O2C 最后一步：将应收账款核销结果同步至 ERP 总账，完成关账。\n\n' +
          '① AR 科目更新：应收账款余额减少（已全额收款的发票清零）\n' +
          '② 现金科目增加：银行存款增加实收金额\n' +
          '③ AR Aging Report 刷新：该客户该发票从账龄报告中消失\n' +
          '④ DSO 重新计算：收款完成后整体 DSO 改善\n\n' +
          '如有坏账核销：\n' +
          '• 应收账款余额减少\n' +
          '• 坏账准备（备抵科目）同步减少\n' +
          '• 不影响当期损益（坏账费用已在计提时确认）\n\n' +
          '月末，OMS 将本期 B2B AR 汇总分录推送至 ERP 总账，完成月结。\n' +
          '资产负债表 AR 科目 = 期末未收款发票总额 − 坏账准备 = 净可变现价值',
        fees: [],
        accountingNote:
          'Monthly AR Summary to ERP:\nDr: Cash (collections)\nCr: AR (invoices collected)\n\nBad Debt Write-off (confirmed uncollectible):\nDr: Allowance for Doubtful Accounts\nCr: Accounts Receivable',
        accountingNoteCn:
          '月末 AR 汇总推送 ERP：\n• 期末应收账款余额（含所有未收发票）\n• 本期新增 AR（本月开具发票）\n• 本期核销 AR（本月收到付款）\n• 坏账准备余额变动\n\n' +
          '资产负债表 AR 科目 = 期末未收款发票总额 − 坏账准备\n（净可变现价值，Net Realizable Value）',
        standard: 'ASC 310 — Receivables. Net realizable value presentation on Balance Sheet.',
        standardCn: 'ASC 310 应收账款准则：资产负债表上的应收账款应以"净可变现价值"列示 = 应收账款总额 − 坏账准备。坏账准备反映管理层对无法收回款项的最佳估计。',
        commonIssues: [
          'AR 余额与银行对账单不符 → 通常是核销操作未同步至 ERP',
          '坏账准备计提不足 → 损益表利润虚高，监管要求充分披露信用风险',
          '跨期收款：上月开票本月收款 → 收入在开票月确认，收款只影响现金流量表',
        ],
        moduleLink: '/dashboard/receivables',
        isKeyEvent: true,
      },
    ],
  },
];

// ─── 每步骤资金明细 ────────────────────────────────────────────────────────────
// 贯穿全流程的示例订单（来源：V30 真实业务案例）：
//   商品标价 $80 → 优惠券 -$5 → 净商品价 $75 + 运费 $10 + 税 $8 = 客户实付 $93
//   COGS $40 · 仓储 $3 · 运费成本 $10 · 支付费 $3 → 利润 $29（34.1%）

export const STEP_FINANCIALS: Record<string, FinancialLine[]> = {

  // ── O2C Step 1: 客户下单 ──────────────────────────────────────────────────
  'o2c-1': [
    { label: '商品标价',        labelEn: 'Product List Price',     amount: '+$80.00', type: 'inflow' },
    { label: '商品折扣',        labelEn: 'Product Discount',       amount: '-$0.00',  type: 'neutral',  note: '本订单无阶梯折扣' },
    { label: '优惠券（SAVE5）', labelEn: 'Coupon Code',            amount: '-$5.00',  type: 'outflow',  note: '平台或商家自发优惠券' },
    { label: '商品净价',        labelEn: 'Net Product Price',      amount: '$75.00',  type: 'subtotal' },
    { label: '买家运费',        labelEn: 'Shipping Charged',       amount: '+$10.00', type: 'inflow',   note: '向买家收取，非成本' },
    { label: '销售税 Tax',      labelEn: 'Sales Tax (9.33%)',      amount: '+$8.00',  type: 'neutral',  note: '代政府收取，不计入收入' },
    { label: '客户实付金额',    labelEn: 'Customer Total Paid',    amount: '$93.00',  type: 'total' },
  ],

  // ── O2C Step 2: 支付完成 ──────────────────────────────────────────────────
  'o2c-2': [
    { label: '客户支付',            labelEn: 'Customer Payment',       amount: '$93.00',  type: 'inflow' },
    { label: 'Stripe 支付处理费',   labelEn: 'Stripe Fee (3.2%+$0.30)',amount: '-$3.26',  type: 'outflow', note: '即时从总额中扣除' },
    { label: '税款（代政府）',       labelEn: 'Tax Collected',          amount: '-$8.00',  type: 'neutral', note: '转入应付税款，非商家收入' },
    { label: '平台代扣净额',        labelEn: 'Net Held by Gateway',    amount: '$81.74',  type: 'subtotal',note: '资金由 Stripe 托管，等结算周期打款' },
    { label: '商家可取时间',        labelEn: 'Payout Schedule',        amount: 'T+2~3 天', type: 'note',   note: 'Amazon FBA: T+14天；TikTok: T+8天' },
  ],

  // ── O2C Step 3: OMS 订单处理（完整费用字段总览）──────────────────────────
  'o2c-3': [
    // ─ 已确认：从订单数据中读取的收入字段 ────────────────────────────────
    { label: '── 已确认：收入字段（订单数据）──', amount: '', type: 'note' },
    { label: '商品标价',             labelEn: 'Product List Price',       amount: '$80.00',  type: 'inflow',  note: '渠道订单 price 字段' },
    { label: '商品折扣',             labelEn: 'Product Discount',         amount: '$0.00',   type: 'neutral', note: '本单无阶梯折扣' },
    { label: '优惠券折扣 (SAVE5)',   labelEn: 'Coupon Discount',          amount: '-$5.00',  type: 'outflow', note: '平台 / 商家自营券' },
    { label: '促销折扣',             labelEn: 'Promotion Discount',       amount: '$0.00',   type: 'neutral', note: '本单无促销' },
    { label: '商品净价',             labelEn: 'Net Product Price',        amount: '$75.00',  type: 'subtotal' },
    { label: '向买家收取运费',       labelEn: 'Shipping Fee Charged',     amount: '+$10.00', type: 'inflow',  note: '订单 shipping 字段' },
    { label: '销售税 Tax',           labelEn: 'Sales Tax',                amount: '+$8.00',  type: 'neutral', note: '代政府收取，非收入' },
    { label: '客户实付',             labelEn: 'Customer Total Paid',      amount: '$93.00',  type: 'subtotal' },
    { label: '预计净收入',           labelEn: 'Expected Net Revenue',     amount: '$85.00',  type: 'subtotal', note: '实付 $93 − 税 $8' },

    // ─ 估算：OMS 根据配置实时计算的成本字段 ─────────────────────────────
    { label: '── 估算：成本字段（OMS 配置）──', amount: '', type: 'note' },
    { label: 'COGS 商品成本',          labelEn: 'COGS',                   amount: '-$40.00', type: 'outflow', note: '⚡ 库存系统实时成本 (FIFO)' },
    { label: '平台佣金 (15%)',         labelEn: 'Platform Referral Fee',  amount: '-$12.75', type: 'outflow', note: '⚡ 渠道费率配置' },
    { label: '支付处理费 (3.3%)',      labelEn: 'Payment Processing Fee', amount: '-$3.00',  type: 'outflow', note: '⚡ 支付网关配置' },
    { label: '3PL 拣货费 × 1件',      labelEn: '3PL Pick Fee',           amount: '-$0.25',  type: 'outflow', note: '⚡ 3PL费率配置' },
    { label: '3PL 包装费',            labelEn: '3PL Pack Fee',            amount: '-$1.50',  type: 'outflow', note: '⚡ 3PL费率配置' },
    { label: '3PL 包材耗材',          labelEn: 'Packaging Materials',    amount: '-$0.80',  type: 'outflow', note: '⚡ 3PL费率配置' },
    { label: '仓储费分摊',            labelEn: 'Storage (prorated)',      amount: '-$0.45',  type: 'outflow', note: '⚡ 月度账单按订单量分摊' },
    { label: '预估运费 (Zone+重量)',   labelEn: 'Est. Freight',           amount: '-$10.00', type: 'outflow', note: '⚡ 路由算法 × 承运商费率表' },
    { label: '预估总成本',            labelEn: 'Est. Total Cost',         amount: '$68.75',  type: 'subtotal' },
    { label: '预估利润（下单时）',    labelEn: 'Est. Profit at Order',    amount: '$16.25',  type: 'total',  note: '= $85 − $68.75（19.1%）' },

    // ─ 待回传：等待实际数据后才能最终核算 ─────────────────────────────────
    { label: '── 待回传：等待实际数据 ──', amount: '', type: 'note' },
    { label: '承运商实际运费',        labelEn: 'Actual Freight Invoice',  amount: '⏳ T+1天', type: 'note', note: 'TMS 发货后回传；可能含燃油/住宅附加费' },
    { label: '平台实际扣减明细',      labelEn: 'Platform Deductions',    amount: '⏳ T+14天', type: 'note', note: '结算报告到达：广告费 / 退款 / 库存调整' },
    { label: '3PL 月度实际账单',      labelEn: 'Actual 3PL Invoice',     amount: '⏳ 月末', type: 'note', note: '账单到达后：实际操作量 vs. 估算量核对' },
    { label: '最终实际利润（结算后）', labelEn: 'Final Profit (actual)',  amount: '$29.00',  type: 'total', note: 'V30 实例：34.1%（平台实际扣减后）' },
  ],

  // ── O2C Step 4: 仓库履约 ──────────────────────────────────────────────────
  'o2c-4': [
    { label: 'COGS 商品成本（出库）', labelEn: 'Cost of Goods Sold',     amount: '-$40.00', type: 'outflow', note: '从库存资产结转，FIFO 先进先出法' },
    { label: '拣货费',               labelEn: 'Pick Fee',                 amount: '-$0.25',  type: 'outflow', note: '$0.25 / 件' },
    { label: '包装操作费',           labelEn: 'Pack & Handling',          amount: '-$1.50',  type: 'outflow', note: '$1.50 / 单' },
    { label: '包材耗材',             labelEn: 'Packaging Materials',      amount: '-$0.80',  type: 'outflow', note: '纸箱 + 缓冲材料' },
    { label: '仓储费分摊',           labelEn: 'Storage (prorated)',       amount: '-$0.45',  type: 'outflow', note: '月度账单按订单量分摊' },
    { label: '履约操作费小计',       labelEn: 'Fulfillment Cost Sub',     amount: '$3.00',   type: 'subtotal' },
    { label: '本步骤总成本',         labelEn: 'Total Step Cost',          amount: '-$43.00', type: 'total',  note: 'COGS $40 + 履约操作 $3' },
  ],

  // ── O2C Step 5: 承运商发货 ────────────────────────────────────────────────
  'o2c-5': [
    { label: '买家支付的运费',        labelEn: 'Shipping Revenue',         amount: '+$10.00', type: 'inflow',  note: '已在下单时向买家收取' },
    { label: '承运商基础运费',        labelEn: 'Base Rate (Zone 5)',        amount: '-$7.90',  type: 'outflow' },
    { label: '燃油附加费 (17%)',      labelEn: 'Fuel Surcharge',           amount: '-$1.34',  type: 'outflow', note: '每周浮动，此为 2026-09 均值' },
    { label: '住宅派送附加费',        labelEn: 'Residential Surcharge',    amount: '-$4.90',  type: 'outflow', note: '电商 80%+ 订单触发，**常被漏计！**' },
    { label: '实际运费成本',          labelEn: 'Total Freight Cost',       amount: '$14.14',  type: 'subtotal' },
    { label: '运费缺口 ⚠️',          labelEn: 'Freight Gap',              amount: '-$4.14',  type: 'total',   note: '收 $10 但花 $14.14，每单倒贴 $4.14；V30简化示例运费成本=$10' },
  ],

  // ── O2C Step 6: 签收确认 ──────────────────────────────────────────────────
  'o2c-6': [
    { label: '本步骤无新增成本（正常）', labelEn: 'No Additional Cost (Normal)', amount: '$0.00',    type: 'note' },
    { label: '二次配送（配送失败时）',  labelEn: 'Redelivery (if failed)',       amount: '-$5~10',  type: 'note',  note: '首次配送失败重新安排' },
    { label: '潜在退货运费',           labelEn: 'Return Freight (if returned)', amount: '-$8~15',  type: 'note',  note: '客户发起退货时商家承担' },
    { label: '本单无异常，成本为零',    labelEn: 'No Issues',                    amount: '✓',       type: 'note' },
  ],

  // ── O2C Step 7: 收入确认 ──────────────────────────────────────────────────
  'o2c-7': [
    { label: '客户付款总额',          labelEn: 'Customer Payment',        amount: '$93.00',  type: 'inflow' },
    { label: '税款（转应付税款）',     labelEn: 'Sales Tax → Tax Payable', amount: '-$8.00',  type: 'outflow', note: '不是收入！转入负债科目' },
    { label: '确认商品收入',          labelEn: 'Product Revenue',         amount: '$75.00',  type: 'subtotal', note: '标价 $80 − 优惠券 $5' },
    { label: '确认运费收入',          labelEn: 'Shipping Revenue',        amount: '$10.00',  type: 'subtotal', note: '向买家收取的运费属于收入' },
    { label: '本期确认总收入',        labelEn: 'Total Revenue Recognized', amount: '$85.00', type: 'total' },
    { label: '毛利率（扣 COGS 后）',  labelEn: 'Gross Margin',            amount: '52.9%',  type: 'note',  note: '($85 − $40) / $85 = 52.9%' },
  ],

  // ── O2C Step 8: 渠道结算 ──────────────────────────────────────────────────
  'o2c-8': [
    { label: '── Shopify + Stripe 示例 ──', labelEn: 'Shopify / Stripe Settlement', amount: '',       type: 'note' },
    { label: '订单销售总额',           labelEn: 'Gross Sales',              amount: '$85.00',  type: 'inflow' },
    { label: 'Stripe 支付处理费',      labelEn: 'Stripe Fee (3.3%)',        amount: '-$3.00',  type: 'outflow', note: '在结算时从总额中扣除' },
    { label: '退款扣减',               labelEn: 'Refund Deduction',         amount: '$0.00',   type: 'neutral' },
    { label: 'Shopify 净结算',         labelEn: 'Net Settlement (Shopify)', amount: '$82.00',  type: 'subtotal', note: '结算时间 T+2~3 天' },
    { label: '── Amazon FBA 对比 ──',  labelEn: 'Amazon Comparison',        amount: '',        type: 'note' },
    { label: 'Amazon 引荐费（15%）',   labelEn: 'Referral Fee 15%',         amount: '-$12.75', type: 'outflow' },
    { label: 'Amazon FBA 配送费',      labelEn: 'FBA Fulfillment Fee',      amount: '-$5.40',  type: 'outflow', note: '含仓储+最后一公里，无需另付运费' },
    { label: 'Amazon 广告费扣减',      labelEn: 'Ad Spend Deduction',       amount: '-$2.50',  type: 'outflow' },
    { label: 'Amazon 净结算',          labelEn: 'Net Settlement (Amazon)',  amount: '$64.35',  type: 'total',  note: '结算时间 T+14 天；综合扣减率 24.3%' },
  ],

  // ── O2C Step 9: 资金到账 ──────────────────────────────────────────────────
  'o2c-9': [
    { label: 'OMS 预计到账（Shopify）', labelEn: 'OMS Expected',             amount: '$82.00',  type: 'inflow' },
    { label: '银行实际到账',           labelEn: 'Actual Bank Receipt',       amount: '$82.00',  type: 'inflow' },
    { label: '差异',                   labelEn: 'Variance',                  amount: '$0.00',   type: 'total',  note: '✓ 完全匹配，无需追查' },
    { label: '── 差异示例 ──',         labelEn: 'Variance Example',          amount: '',        type: 'note' },
    { label: 'Shopify 另一笔结算',     labelEn: 'Shopify Sep 8–14',          amount: '$38,820', type: 'inflow', note: 'OMS 预计值' },
    { label: '实际到账',               labelEn: 'Actual',                    amount: '$38,777', type: 'inflow', note: '实际银行到账' },
    { label: '差异（待核查 ⚠️）',      labelEn: 'Variance to Investigate',  amount: '-$42.50', type: 'outflow', note: '退款时序不同步导致，需发起对账调查' },
  ],

  // ── O2C Step 10: ERP 总账 / 最终利润 ──────────────────────────────────────
  'o2c-10': [
    { label: '确认总收入',             labelEn: 'Total Revenue',            amount: '$85.00',  type: 'inflow' },
    { label: 'COGS 商品成本',          labelEn: 'Cost of Goods Sold',       amount: '-$40.00', type: 'outflow' },
    { label: '毛利润 (52.9%)',         labelEn: 'Gross Profit',             amount: '$45.00',  type: 'subtotal' },
    { label: '仓储履约成本',           labelEn: 'Fulfillment Cost',         amount: '-$3.00',  type: 'outflow' },
    { label: '运费成本（净额）',        labelEn: 'Freight Cost (net)',       amount: '-$10.00', type: 'outflow', note: 'V30 示例值；含附加费实际约 $14' },
    { label: '支付处理费',             labelEn: 'Payment Processing',       amount: '-$3.00',  type: 'outflow' },
    { label: '贡献毛利',              labelEn: 'Contribution Margin',       amount: '$29.00',  type: 'total',  note: '34.1% — 与 V30 示例一致 ✓' },
    { label: '注：广告/税后净利润',    labelEn: 'Note: After Tax & Ads',    amount: '更低',    type: 'note',   note: '广告费、运营人工等未含在内' },
  ],

  // ── P2P Step 1: 收到供应商账单 ────────────────────────────────────────────
  'p2p-1': [
    { label: '── ShipBob US 9月账单示例 ──', labelEn: 'ShipBob Invoice Example',  amount: '',       type: 'note' },
    { label: '仓储费（1,000件×$0.65/CF）', labelEn: 'Storage Fee',               amount: '$2,600', type: 'outflow' },
    { label: '拣货费（1,700件×$0.25）',   labelEn: 'Pick Fee',                   amount: '$425',   type: 'outflow' },
    { label: '包装费（1,600单×$1.50）',   labelEn: 'Pack Fee',                   amount: '$2,400', type: 'outflow' },
    { label: '入库费（500件×$0.30）',     labelEn: 'Receiving Fee',              amount: '$150',   type: 'outflow' },
    { label: '退货处理（40单×$3.50）',    labelEn: 'Returns Handling',           amount: '$140',   type: 'outflow' },
    { label: '账单合计',                  labelEn: 'Invoice Total',              amount: '$5,715', type: 'subtotal' },
    { label: 'OMS 预估金额',              labelEn: 'OMS Estimate',               amount: '$5,418', type: 'inflow',  note: '系统按历史费率预估' },
    { label: '差异（需三方核验）',         labelEn: 'Variance → 3-Way Match',     amount: '+$297',  type: 'total',  note: '超预算 5.5%；进入费用对账流程' },
    { label: '── 到期日计算 ──',          labelEn: 'Due Date Calculation',       amount: '',       type: 'note' },
    { label: '账单日',                    labelEn: 'Invoice Date',               amount: 'Sep 01', type: 'neutral' },
    { label: '付款条款',                  labelEn: 'Payment Terms',              amount: 'Net 30', type: 'neutral' },
    { label: '到期日',                    labelEn: 'Due Date',                   amount: 'Oct 01', type: 'neutral', note: '= 账单日 Sep 01 + 30 天' },
    { label: '今日距到期',                labelEn: 'Days Until Due',             amount: '3 天',   type: 'total',   note: '到期前 7 天触发预警；3 天内升级提醒' },
  ],

  // ── P2P Step 2: 三方核验 ──────────────────────────────────────────────────
  'p2p-2': [
    { label: '── 本月 FedEx 账单核验 ──',  labelEn: 'FedEx Invoice Verification', amount: '',       type: 'note' },
    { label: 'FedEx 账单金额',             labelEn: 'FedEx Invoice',              amount: '$8,420', type: 'inflow' },
    { label: 'OMS 预估（按合同费率）',      labelEn: 'OMS Estimate',               amount: '$8,200', type: 'neutral', note: '按 Rate Card 计算' },
    { label: '差异',                       labelEn: 'Variance',                   amount: '+$220',  type: 'outflow', note: '燃油 $140 + 住宅附加 $80' },
    { label: '差异原因',                   labelEn: 'Root Cause',                 amount: '附加费', type: 'note',   note: 'OMS 费率未含附加费 → 更新 Rate Card' },
    { label: '核验结论',                   labelEn: 'Decision',                   amount: '通过',   type: 'total',  note: '附加费合理，批准付款' },
  ],

  // ── P2P Step 5: 执行付款 ──────────────────────────────────────────────────
  'p2p-5': [
    { label: '── 本批次付款明细 ──',  labelEn: 'This Payment Batch',     amount: '',        type: 'note' },
    { label: 'ShipBob US（Net30到期）', labelEn: 'ShipBob US',           amount: '$5,480',  type: 'outflow' },
    { label: 'FedEx（Net30到期）',    labelEn: 'FedEx',                  amount: '$8,420',  type: 'outflow' },
    { label: 'UPS（Net30到期）',      labelEn: 'UPS',                    amount: '$6,840',  type: 'outflow' },
    { label: '本批次合计',            labelEn: 'Batch Total',            amount: '$20,740', type: 'subtotal' },
    { label: 'ACH 手续费',            labelEn: 'ACH Fee',                amount: '$0',      type: 'neutral',  note: '美国国内 ACH 免费' },
    { label: '付款后 AP 余额',        labelEn: 'Remaining AP',           amount: '$33,540', type: 'total',   note: '总应付 $54,280 − 本次 $20,740' },
    { label: '付款方式',              labelEn: 'Payment Method',         amount: 'ACH',     type: 'note',   note: '预计 T+1 个工作日到账供应商账户' },
  ],

  // ── P2P Step 6: ERP 总账 ──────────────────────────────────────────────────
  'p2p-6': [
    { label: 'AP 清零（本批次）',     labelEn: 'AP Cleared',             amount: '$20,740', type: 'outflow' },
    { label: '银行存款减少',          labelEn: 'Cash Outflow',           amount: '-$20,740',type: 'total' },
    { label: '计提调整',              labelEn: 'Accrual Adjustment',     amount: '+$297',   type: 'note',   note: 'ShipBob 账单比预估高 $297，差异计入当期费用' },
    { label: '费用科目最终入账',      labelEn: 'Expense Booked',         amount: '$54,280', type: 'note',   note: '仓储 $12,840 + 运费 $15,260 + 其他 $26,180' },
  ],

  // ── R2R Step 4: 计提与调整 ────────────────────────────────────────────────
  'r2r-4': [
    { label: '── 9月月末计提示例 ──', labelEn: 'September Accruals',     amount: '',        type: 'note' },
    { label: 'ShipBob 账单未到（预计）', labelEn: 'ShipBob Accrual',     amount: '$5,418',  type: 'outflow', note: '账单预计10月15日到达，先按历史均值计提' },
    { label: 'FedEx 9/15~30 未账单',  labelEn: 'FedEx Accrual',         amount: '$3,240',  type: 'outflow', note: '后半月运单，账单延迟 30 天' },
    { label: '本月计提合计',          labelEn: 'Total Accruals',         amount: '$8,658',  type: 'subtotal' },
    { label: '9月实际费用（含计提）',  labelEn: 'Sep Actual Expenses',    amount: '$54,280', type: 'total',  note: '已入账 + 计提，反映9月真实成本' },
  ],

  // ── R2R Step 6: 财务报表 ──────────────────────────────────────────────────
  'r2r-6': [
    { label: '── 9月损益表摘要 ──',  labelEn: 'September P&L Summary', amount: '',         type: 'note' },
    { label: '总收入',               labelEn: 'Total Revenue',          amount: '$281,220', type: 'inflow' },
    { label: 'COGS',                 labelEn: 'Cost of Goods Sold',     amount: '-$112,000',type: 'outflow' },
    { label: '毛利润 (60.2%)',       labelEn: 'Gross Profit',           amount: '$169,220', type: 'subtotal' },
    { label: '仓储 + 运费 + 平台费', labelEn: 'Operating Costs',        amount: '-$47,808', type: 'outflow', note: '仓储 $12,840 + 运费 $18,620 + 平台 $14,348 + 支付 $2,000' },
    { label: '贡献毛利 (43.0%)',     labelEn: 'Contribution Margin',    amount: '$121,022', type: 'total' },
    { label: '本月渠道利润最优',      labelEn: 'Best Channel',           amount: 'Amazon',  type: 'note',   note: 'Amazon $52,400 净结算 · 最高利润率渠道' },
  ],

  // ── P2P Step 3: 成本分摊到订单 ────────────────────────────────────────────
  'p2p-3': [
    { label: '── 9月账单分摊基础数据 ──',  labelEn: 'Sep Allocation Base',      amount: '',        type: 'note' },
    { label: '当月出库订单数',             labelEn: 'Orders Shipped',            amount: '1,600 单', type: 'neutral' },
    { label: '当月出库总重量',             labelEn: 'Total Weight',              amount: '1,440 kg', type: 'neutral' },
    { label: '当月订单总行数',             labelEn: 'Total Line Items',          amount: '4,280 行', type: 'neutral' },
    { label: '── ① 拣货费（行数比例法）──', labelEn: 'Pick Fee – Line-Item Method', amount: '',     type: 'note' },
    { label: '月度拣货费账单',             labelEn: 'Pick Fee Invoice',          amount: '$425',    type: 'outflow' },
    { label: '本订单行数',                 labelEn: 'This Order Lines',          amount: '3 行',     type: 'neutral' },
    { label: '公式',                       labelEn: 'Formula',                   amount: '$425 × (3÷4,280)', type: 'neutral' },
    { label: '本订单拣货费分摊',           labelEn: 'Allocated Pick Fee',        amount: '$0.30',   type: 'subtotal' },
    { label: '── ② 包装费（平均分摊法）──', labelEn: 'Pack Fee – Flat Method',   amount: '',        type: 'note' },
    { label: '月度包装费账单',             labelEn: 'Pack Fee Invoice',          amount: '$2,400',  type: 'outflow' },
    { label: '公式',                       labelEn: 'Formula',                   amount: '$2,400 ÷ 1,600', type: 'neutral' },
    { label: '本订单包装费分摊',           labelEn: 'Allocated Pack Fee',        amount: '$1.50',   type: 'subtotal' },
    { label: '── ③ 运费（重量比例法）──',  labelEn: 'Freight – Weight Method',   amount: '',        type: 'note' },
    { label: '月度运费账单',               labelEn: 'Freight Invoice',           amount: '$18,620', type: 'outflow' },
    { label: '本订单包裹重量',             labelEn: 'Order Weight',              amount: '0.9 kg',  type: 'neutral' },
    { label: '公式',                       labelEn: 'Formula',                   amount: '$18,620 × (0.9÷1,440)', type: 'neutral' },
    { label: '本订单运费分摊',             labelEn: 'Allocated Freight',         amount: '$11.64',  type: 'subtotal' },
    { label: '── ④ 仓储费（体积×库龄法）──', labelEn: 'Storage – Vol×Age Method', amount: '',      type: 'note' },
    { label: '月度仓储费账单',             labelEn: 'Storage Invoice',           amount: '$2,600',  type: 'outflow' },
    { label: '全仓 SKU 体积×库龄合计',     labelEn: 'Total Vol·Days',            amount: '1,538 CF·天', type: 'neutral' },
    { label: 'WE-PRO-BLK：0.5CF × 30天',  labelEn: 'SKU Vol·Days',             amount: '15 CF·天', type: 'neutral' },
    { label: '公式',                       labelEn: 'Formula',                   amount: '$2,600 × (15÷1,538)', type: 'neutral' },
    { label: '本订单仓储费分摊',           labelEn: 'Allocated Storage',         amount: '$25.36',  type: 'subtotal', note: '再按订单中该 SKU 件数分摊' },
    { label: '── 本订单总分摊成本 ──',     labelEn: 'Total Allocated Cost',      amount: '',        type: 'note' },
    { label: 'COGS 商品成本',              labelEn: 'COGS',                      amount: '$40.00',  type: 'outflow' },
    { label: '拣货 + 包装 + 运费 + 仓储', labelEn: 'Fulfillment Allocated',     amount: '$38.80',  type: 'outflow', note: '$0.30 + $1.50 + $11.64 + $25.36' },
    { label: '总成本',                     labelEn: 'Total Cost',                amount: '$78.80',  type: 'subtotal' },
    { label: '订单收入',                   labelEn: 'Revenue',                   amount: '$85.00',  type: 'inflow' },
    { label: '分摊后订单利润',             labelEn: 'Order Profit (Actual)',      amount: '$6.20',   type: 'total',   note: '7.3%；V30 简化示例利润更高，因运费成本按实计' },
  ],

  // ── P2P Step 4: 付款审批流程 ──────────────────────────────────────────────
  'p2p-4': [
    { label: '── 本次待审批账单 ──',   labelEn: 'Pending Approval',       amount: '',        type: 'note' },
    { label: 'ShipBob US（$5,715）',   labelEn: 'ShipBob Invoice',        amount: '$5,715',  type: 'outflow', note: '账单日 Sep 01 · Net 30 → 到期日 Oct 01 · 剩余 3 天' },
    { label: 'FedEx（$8,420）',        labelEn: 'FedEx Invoice',          amount: '$8,420',  type: 'outflow', note: '账单日 Sep 01 · Net 30 → 到期日 Oct 01 · 剩余 3 天' },
    { label: 'UPS（$6,840）',          labelEn: 'UPS Invoice',            amount: '$6,840',  type: 'outflow', note: '账单日 Sep 01 · Net 30 → 到期日 Oct 01 · 剩余 3 天' },
    { label: 'Royal Mail（$3,360）',   labelEn: 'Royal Mail Invoice',     amount: '$3,360',  type: 'outflow', note: '账单日 Sep 15 · Net 30 → 到期日 Oct 15 · 剩余 17 天' },
    { label: '本次审批总额',           labelEn: 'Batch Total',            amount: '$24,335', type: 'subtotal' },
    { label: '── 逾期判定公式 ──',     labelEn: 'Overdue Logic',          amount: '',        type: 'note' },
    { label: '到期日',                 labelEn: 'Due Date',               amount: '账单日 + 付款天数', type: 'neutral', note: 'Net 30 = 账单日 + 30 天' },
    { label: '逾期天数',              labelEn: 'Overdue Days',            amount: 'max(0, 今日 − 到期日)', type: 'neutral' },
    { label: '逾期状态',              labelEn: 'Status',                  amount: 'balanceDue > 0 且 逾期天数 > 0', type: 'neutral' },
    { label: '── 滞纳金示例 ──',       labelEn: 'Late Fee Example',       amount: '',        type: 'note' },
    { label: 'FedEx 逾期 15 天',       labelEn: 'FedEx Overdue 15d',      amount: '$63.15',  type: 'outflow', note: '$8,420 × 1.5% ÷ 30 × 15 天' },
    { label: '早付款折扣（2/10）',     labelEn: 'Early Pay Discount',     amount: '-$168.40',type: 'inflow',  note: '若在 10 天内付款：$8,420 × 2% = $168.40 折扣' },
    { label: '审批时限 SLA',          labelEn: 'Approval SLA',            amount: '2 个工作日', type: 'total', note: '超时自动升级通知；逾期账单优先排队' },
  ],

  // ── R2R Step 1: 交易完整性检查 ────────────────────────────────────────────
  'r2r-1': [
    { label: '── 9月月末关账检查清单 ──', labelEn: 'Month-End Close Checklist', amount: '', type: 'note' },
    { label: '已签收订单收入确认',   labelEn: 'Revenue Recognized',      amount: '3,847 单 ✓', type: 'inflow',  note: '全部已确认，无漏项' },
    { label: '未签收订单（在途）',   labelEn: 'In-transit Orders',        amount: '142 单',    type: 'neutral', note: '收入暂不确认，待签收后触发' },
    { label: '已确认 3PL 服务费用', labelEn: '3PL Expenses Recorded',    amount: '$12,840 ✓', type: 'outflow', note: '含计提估算' },
    { label: '运费成本',            labelEn: 'Freight Cost',              amount: '$18,620 ✓', type: 'outflow', note: '含账单已到和计提部分' },
    { label: '平台费（各渠道）',    labelEn: 'Platform Fees',             amount: '$14,348 ✓', type: 'outflow', note: '来自结算报告扣减明细' },
    { label: '待核查差异',          labelEn: 'Open Variances',            amount: '$284.50',   type: 'total',   note: '4 笔差异未解决，需在锁期前处理' },
  ],

  // ── R2R Step 2: 渠道结算对账 ──────────────────────────────────────────────
  'r2r-2': [
    { label: '── 9月渠道结算对账汇总 ──', labelEn: 'Sep Settlement Reconciliation', amount: '', type: 'note' },
    { label: 'Amazon US（已对账）',   labelEn: 'Amazon US',               amount: '$52,400',  type: 'inflow',  note: 'OMS $52,400 = 实际 $52,400 ✓' },
    { label: 'Amazon US（上期）',     labelEn: 'Amazon US (Aug)',          amount: '$54,840',  type: 'inflow',  note: '已核销差异 $241.80 ✓' },
    { label: 'Shopify（差异待查）',   labelEn: 'Shopify US',               amount: '$38,777',  type: 'inflow',  note: 'OMS $38,820 vs 实际 $38,777 · 差异 -$42.50 ⚠️' },
    { label: 'Shopify（上期）',       labelEn: 'Shopify (prev)',           amount: '$36,501',  type: 'inflow',  note: '差异已核销 ✓' },
    { label: 'TikTok UK（处理中）',   labelEn: 'TikTok UK',                amount: '⏳ $23,140', type: 'neutral', note: '预计 Sep 19 到账，尚未对账' },
    { label: 'Walmart（处理中）',     labelEn: 'Walmart US',               amount: '⏳ $16,691', type: 'neutral', note: '预计 Sep 21 到账' },
    { label: '未解差异合计',          labelEn: 'Total Open Variance',      amount: '-$42.50',  type: 'total',   note: 'Shopify 差异待核查，其余已匹配' },
  ],

  // ── R2R Step 3: 费用差异核查 ──────────────────────────────────────────────
  'r2r-3': [
    { label: '── 9月费用对账差异汇总 ──', labelEn: 'Sep Fee Reconciliation', amount: '', type: 'note' },
    { label: 'ShipBob 仓储费（差异）', labelEn: 'ShipBob 3PL',             amount: '+$297',  type: 'outflow', note: 'OMS 预估 $5,418 vs 实际 $5,715；超预算 5.5%' },
    { label: 'FedEx 运费（差异）',    labelEn: 'FedEx Freight',             amount: '+$220',  type: 'outflow', note: '燃油 $140 + 住宅附加 $80；更新费率表' },
    { label: 'Amazon 平台费（匹配）', labelEn: 'Amazon Fees',               amount: '$0',     type: 'neutral', note: 'OMS $16,000 = 实际 $16,000 ✓' },
    { label: 'UPS 运费（匹配）',      labelEn: 'UPS Freight',               amount: '$0',     type: 'neutral', note: '✓ 无差异' },
    { label: 'Shopify 费率（差异）',  labelEn: 'TikTok Fee Rate',           amount: '+$66',   type: 'outflow', note: 'OMS 配置 5.0% vs 实际 5.5%；本期差异 $66' },
    { label: '费用差异合计',          labelEn: 'Total Fee Variance',        amount: '+$583',  type: 'total',   note: '需更新 OMS 费率配置，防止下期继续偏差' },
  ],

  // ── R2R Step 5: ERP 期间锁定 ──────────────────────────────────────────────
  'r2r-5': [
    { label: '── 9月期末推送至 NetSuite ──', labelEn: 'Sep GL Push to NetSuite', amount: '', type: 'note' },
    { label: '总收入分录',           labelEn: 'Revenue Entries',          amount: '$281,220', type: 'inflow',  note: '收入科目 4000 · 3,847 笔订单汇总' },
    { label: 'COGS 分录',           labelEn: 'COGS Entries',              amount: '$112,000', type: 'outflow', note: 'COGS 科目 5000 · 库存结转' },
    { label: '运营费用分录',         labelEn: 'Operating Expense Entries', amount: '$47,808',  type: 'outflow', note: '仓储/运费/平台费/支付费合计' },
    { label: '试算平衡确认',         labelEn: 'Trial Balance Check',       amount: '✓ 借贷平衡', type: 'subtotal', note: 'Total Dr = Total Cr = $440,028' },
    { label: '期间状态',             labelEn: 'Period Status',             amount: '🔒 已锁定', type: 'total',   note: '2026-09 期间锁定，禁止修改' },
  ],

  // ── P2P Step 0: 供应商档案配置 ────────────────────────────────────────────
  'p2p-0': [
    { label: '── 供应商档案字段清单 ──',    labelEn: 'Vendor Master Fields',    amount: '',         type: 'note' },
    { label: '付款条款',                   labelEn: 'Payment Terms',           amount: 'Net 30',   type: 'neutral', note: '决定账单到期日：账单日 + 30 天' },
    { label: '费率合同（拣货）',           labelEn: 'Pick Rate',               amount: '$0.25/件', type: 'neutral', note: '三方核验比价基准' },
    { label: '费率合同（包装）',           labelEn: 'Pack Rate',               amount: '$1.50/单', type: 'neutral' },
    { label: '费率合同（仓储）',           labelEn: 'Storage Rate',            amount: '$0.65/CF/月', type: 'neutral' },
    { label: '燃油附加费（FedEx）',        labelEn: 'Fuel Surcharge',          amount: '17%（浮动）', type: 'neutral', note: '未配置 → 三方核验常见差异来源' },
    { label: '住宅附加费（FedEx/UPS）',    labelEn: 'Residential Surcharge',   amount: '$4.90/件', type: 'neutral' },
    { label: 'ACH Routing Number',        labelEn: 'Bank Routing',             amount: '已验证 ✓', type: 'neutral', note: '变更须双渠道验证，防欺诈' },
    { label: '账单接收格式',              labelEn: 'Invoice Format',           amount: 'EDI 810',  type: 'neutral' },
    { label: '费率合同有效期',            labelEn: 'Rate Card Expiry',         amount: 'Dec 31',   type: 'total',   note: '到期前 30 天触发续签提醒' },
  ],

  // ── B2B Step 0: B2B 客户档案配置 ──────────────────────────────────────────
  'b2b-0': [
    { label: '── B2B 客户档案字段清单 ──',  labelEn: 'Customer Master Fields',  amount: '',         type: 'note' },
    { label: '授信额度',                   labelEn: 'Credit Limit',            amount: '$50,000',  type: 'inflow',  note: '信用审核的核心参数' },
    { label: '付款条款',                   labelEn: 'Payment Terms',           amount: 'Net 45',   type: 'neutral', note: '发票到期日 = 发票日 + 45 天' },
    { label: '信用评级',                   labelEn: 'Credit Rating',           amount: 'A 级',     type: 'neutral', note: '历史 DSO 稳定 42 天' },
    { label: 'Tax ID / EIN',              labelEn: 'Tax ID',                   amount: '已验证 ✓', type: 'neutral', note: '发票抬头必须与法人名称完全一致' },
    { label: 'Tax Exempt 状态',           labelEn: 'Tax Exempt',               amount: '是（含证书）', type: 'neutral', note: '免税证书有效期 Dec 2026' },
    { label: 'AR 联系人邮箱',             labelEn: 'AR Contact (AP Dept)',     amount: 'ap@acme.com', type: 'neutral', note: '发票必须发至 AP 专用邮箱' },
    { label: '开票方式',                  labelEn: 'Invoice Delivery',         amount: 'EDI 810',  type: 'neutral' },
    { label: '账期起算规则',              labelEn: 'Terms Start',              amount: '发票认可日', type: 'neutral', note: '该客户从 ERP 认可日起算，通常晚 7–10 天' },
    { label: '免税证书到期预警',          labelEn: 'Cert Expiry',              amount: 'Dec 2026', type: 'total',   note: '到期前 60 天触发续签提醒；逾期则恢复含税开票' },
  ],

  // ── B2B Step 2: 信用审核 ──────────────────────────────────────────────────
  'b2b-2': [
    { label: '── 本次信用审核（Acme Corp）──', labelEn: 'Credit Check – Acme Corp', amount: '',        type: 'note' },
    { label: '本次 PO 金额',          labelEn: 'PO Amount',               amount: '$28,400', type: 'outflow' },
    { label: '当前未付应收余额',      labelEn: 'Current Outstanding AR',  amount: '$12,600', type: 'outflow' },
    { label: '合计敞口',              labelEn: 'Total Exposure',          amount: '$41,000', type: 'subtotal' },
    { label: '客户授信额度',          labelEn: 'Credit Limit',            amount: '$50,000', type: 'inflow',  note: '上季度综合评级 A，额度 $50k' },
    { label: '剩余可用额度',          labelEn: 'Available Credit',        amount: '$9,000',  type: 'total',   note: '≥ 0 → 信用审核通过 ✓' },
    { label: '── 账期设定 ──',        labelEn: 'Terms Assigned',          amount: '',        type: 'note' },
    { label: '付款条款',              labelEn: 'Payment Terms',           amount: 'Net 45',  type: 'neutral', note: '老客户，历史 DSO 稳定 42 天' },
    { label: '预计发票日',            labelEn: 'Est. Invoice Date',       amount: 'Sep 10',  type: 'neutral' },
    { label: '应收到期日',            labelEn: 'AR Due Date',             amount: 'Oct 25',  type: 'total',   note: '= Sep 10 + 45 天' },
  ],

  // ── B2B Step 3: 发货 + 开票 ────────────────────────────────────────────────
  'b2b-3': [
    { label: '── AR Invoice #INV-2026-0892 ──', labelEn: 'Invoice Details',  amount: '',        type: 'note' },
    { label: 'WE-PRO-BLK × 50件',     labelEn: 'Wireless Earbuds × 50', amount: '$4,450',  type: 'inflow',  note: '单价 $89 × 50' },
    { label: 'PC-CLR-IP15 × 100件',   labelEn: 'Phone Case × 100',      amount: '$2,900',  type: 'inflow',  note: '单价 $29 × 100' },
    { label: 'UC-2M-WHT × 200件',     labelEn: 'USB-C Cable × 200',     amount: '$3,800',  type: 'inflow',  note: '单价 $19 × 200' },
    { label: '发票小计',              labelEn: 'Invoice Subtotal',       amount: '$11,150', type: 'subtotal' },
    { label: '销售税（B2B Tax Exempt）', labelEn: 'Sales Tax',          amount: '$0',      type: 'neutral', note: '客户提供 Resale Certificate，免税' },
    { label: '发票总金额',            labelEn: 'Invoice Total',          amount: '$11,150', type: 'subtotal' },
    { label: 'COGS 商品成本',          labelEn: 'COGS (to be recognized)', amount: '-$5,175', type: 'outflow', note: '出库时同步结转库存成本' },
    { label: '── 账期 & 到期 ──',     labelEn: 'Terms & Due Date',       amount: '',        type: 'note' },
    { label: '付款条款',              labelEn: 'Payment Terms',          amount: 'Net 45',  type: 'neutral' },
    { label: '发票日',                labelEn: 'Invoice Date',           amount: 'Sep 10',  type: 'neutral' },
    { label: '到期日',                labelEn: 'Due Date',               amount: 'Oct 25',  type: 'total',   note: '超出此日期且未付款 = 逾期' },
  ],

  // ── B2B Step 5: AR 账龄管理 ────────────────────────────────────────────────
  'b2b-5': [
    { label: '── 9月末 AR Aging 快照 ──', labelEn: 'AR Aging Snapshot', amount: '',          type: 'note' },
    { label: '未逾期（Current）',      labelEn: 'Current',               amount: '$68,400',  type: 'inflow',  note: '在账期内，未到期' },
    { label: '逾期 1–30 天',           labelEn: 'Past Due 1–30d',        amount: '$28,600',  type: 'outflow', note: '已发送第一次催款邮件' },
    { label: '逾期 31–60 天',          labelEn: 'Past Due 31–60d',       amount: '$14,200',  type: 'outflow', note: '财务介入；暂停新订单' },
    { label: '逾期 60 天以上',         labelEn: 'Past Due 60d+',         amount: '$9,000',   type: 'outflow', note: '法务介入；计提坏账准备' },
    { label: 'AR 余额合计',            labelEn: 'Total AR Balance',       amount: '$120,200', type: 'subtotal' },
    { label: '坏账准备（已计提）',     labelEn: 'Allowance for Doubtful', amount: '-$4,500',  type: 'outflow', note: '60d+ $9,000 × 50% 计提' },
    { label: 'AR 净值（B/S 列报）',    labelEn: 'AR Net (Balance Sheet)', amount: '$115,700', type: 'subtotal' },
    { label: '── DSO 计算 ──',         labelEn: 'DSO Calculation',        amount: '',         type: 'note' },
    { label: '9月收入',               labelEn: 'Sep Revenue',            amount: '$281,220', type: 'neutral' },
    { label: 'DSO',                   labelEn: 'Days Sales Outstanding',  amount: '12.8 天',  type: 'total',   note: '$120,200 ÷ $281,220 × 30 = 12.8 天；账期 45 天，DSO 健康 ✓' },
  ],

  // ── B2B Step 6: 收款核销 ──────────────────────────────────────────────────
  'b2b-6': [
    { label: '── Acme Corp 收款核销 ──', labelEn: 'Payment Application – Acme', amount: '',        type: 'note' },
    { label: 'ACH 到账金额',           labelEn: 'ACH Receipt',            amount: '$10,933', type: 'inflow',  note: 'Sep 30 银行到账' },
    { label: '发票 #INV-2026-0892',    labelEn: 'Invoice #0892',          amount: '$11,150', type: 'outflow', note: 'Net 45 · 到期日 Oct 25' },
    { label: '── 客户扣款明细 ──',     labelEn: 'Deduction Breakdown',    amount: '',        type: 'note' },
    { label: '早付款折扣（2/10）',     labelEn: 'Early Pay Discount 2%', amount: '-$223',   type: 'outflow', note: '发票日 Sep 10 + 10 天 = Sep 20 截止；今日 Sep 30 ⚠️ 折扣窗口已过' },
    { label: '扣款决策',               labelEn: 'Dispute or Accept',      amount: '待确认',  type: 'neutral', note: '客户仍扣了折扣，需确认是否接受' },
    { label: '若接受扣款，核销分录',   labelEn: 'Accept: Sales Discount', amount: '$223',    type: 'outflow', note: '计入销售折扣科目 4100' },
    { label: 'AR 核销后余额',          labelEn: 'AR After Application',   amount: '$0',      type: 'total',   note: '发票 #0892 已全额核销（含折扣）✓' },
  ],

  // ── B2B Step 7: ERP 总账 ──────────────────────────────────────────────────
  'b2b-7': [
    { label: '── 9月 B2B AR 汇总 ──',  labelEn: 'Sep B2B AR Summary',     amount: '',         type: 'note' },
    { label: '期初 AR 余额',           labelEn: 'Opening AR Balance',      amount: '$98,400',  type: 'inflow' },
    { label: '本期新增 AR（开票）',    labelEn: 'New AR Invoiced',         amount: '+$142,600',type: 'inflow' },
    { label: '本期核销 AR（收款）',    labelEn: 'AR Collected',            amount: '-$120,800',type: 'outflow' },
    { label: '期末 AR 余额',           labelEn: 'Closing AR Balance',      amount: '$120,200', type: 'subtotal' },
    { label: '坏账准备',               labelEn: 'Allowance',               amount: '-$4,500',  type: 'outflow', note: '60d+ 余额 $9,000 × 50%' },
    { label: 'B/S 列报净值',           labelEn: 'Net AR on Balance Sheet', amount: '$115,700', type: 'total',   note: 'Net Realizable Value' },
  ],
};

// ─── 步骤间箭头配置 ────────────────────────────────────────────────────────────
// arrows[i] = 第 i 步与第 i+1 步之间的关键动作标注
// rowBreakIndex = 第几步之后换行（该 arrows[rowBreakIndex] 显示为换行提示）
// rowSize = 每行显示的步骤数

export type LaneArrowConfig = {
  arrows: string[];
  rowBreakIndex: number;
  rowSize: number;
};

export const LANE_ARROW_CONFIG: Record<'o2c' | 'p2p' | 'r2r' | 'b2b', LaneArrowConfig> = {
  o2c: {
    rowSize: 5,
    rowBreakIndex: 4,
    arrows: [
      '支付授权',      // ①→②
      '已付款订单',    // ②→③
      '履约单下发',    // ③→④
      '交承运商',      // ④→⑤
      '在途追踪 ↓',   // ⑤→⑥ 换行
      '签收触发',      // ⑥→⑦
      '收入入账',      // ⑦→⑧
      '结算报告',      // ⑧→⑨
      '银行到账',      // ⑨→⑩
    ],
  },
  p2p: {
    rowSize: 4,
    rowBreakIndex: 3,
    arrows: [
      '档案就绪',     // ①→②
      '账单录入',     // ②→③
      '核验通过',     // ③→④
      '分摊完成 ↓',  // ④→⑤ 换行
      '审批通过',     // ⑤→⑥
      '付款执行',     // ⑥→⑦
    ],
  },
  r2r: {
    rowSize: 3,
    rowBreakIndex: 2,
    arrows: [
      '完整性确认',  // ①→②
      '结算对账',    // ②→③
      '费用核查 ↓',  // ③→④ 换行
      '计提完成',    // ④→⑤
      '期间锁定',    // ⑤→⑥
    ],
  },
  b2b: {
    rowSize: 4,
    rowBreakIndex: 3,
    arrows: [
      '档案就绪',     // ①→②
      '提交信审',     // ②→③
      '授信通过',     // ③→④
      '发票交付 ↓',  // ④→⑤ 换行
      '到期提醒',     // ⑤→⑥
      '收款触发',     // ⑥→⑦
      '核销完成',     // ⑦→⑧
    ],
  },
};
