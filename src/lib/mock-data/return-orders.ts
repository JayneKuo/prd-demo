// 退货单（Return Order / RMA）数据模型

// ─── 核心类型 ─────────────────────────────────────────────────────────────────

export type ReturnReason =
  | 'quality_issue'       // 商品质量问题
  | 'not_as_described'    // 与描述不符
  | 'wrong_item'          // 发错商品
  | 'damaged_in_transit'  // 运输损坏
  | 'changed_mind'        // 客户反悔
  | 'duplicate_order'     // 重复下单
  | 'size_fit_issue'      // 尺寸/规格不合适
  | 'other';              // 其他

export const returnReasonLabels: Record<ReturnReason, string> = {
  quality_issue: '商品质量问题',
  not_as_described: '与描述不符',
  wrong_item: '发错商品',
  damaged_in_transit: '运输损坏',
  changed_mind: '客户反悔不想要',
  duplicate_order: '重复下单',
  size_fit_issue: '尺寸/规格不符',
  other: '其他',
};

export type ReturnType =
  | 'refund_only'       // 仅退款（无需退货）
  | 'return_refund'     // 退货并退款（需寄回）
  | 'exchange'          // 换货
  | 'recall';           // 在途召回

export const returnTypeLabels: Record<ReturnType, string> = {
  refund_only: '仅退款',
  return_refund: '退货退款',
  exchange: '换货',
  recall: '在途召回',
};

export type ReturnStatus =
  | 'pending'           // 待审核
  | 'authorized'        // 已授权（生成退货单）
  | 'rejected'          // 已拒绝
  | 'label_generated'   // 退货面单已生成
  | 'in_transit'        // 退货在途（客户已寄出）
  | 'received'          // 仓库已收货
  | 'inspecting'        // 质检中
  | 'inspection_passed' // 质检通过
  | 'inspection_failed' // 质检不通过（商品有问题）
  | 'refund_processing' // 退款处理中
  | 'completed'         // 已完成（退款到账）
  | 'cancelled';        // 已取消

export type RecallStatus =
  | 'not_requested'     // 未发起
  | 'requested'         // 已发起召回请求
  | 'in_progress'       // 召回处理中
  | 'success'           // 召回成功（包裹截停）
  | 'failed'            // 召回失败（已投递）
  | 'returned_to_warehouse'; // 已退回仓库

export type InspectionResult =
  | 'resaleable'        // 可重新销售（恢复库存）
  | 'damaged'           // 损坏（报废）
  | 'wrong_item'        // 收到的商品与申请不符
  | 'partial_ok';       // 部分可售

/** 退货商品行 */
export type ReturnLineItem = {
  id: string;
  lineItemId: string;   // 原订单 lineItemId
  sku: string;
  title: string;
  variantTitle: string;
  quantity: number;
  /** 退款金额（该行） */
  refundAmount: number;
  currency: string;
  reason: ReturnReason;
  /** 质检结果 */
  inspectionResult?: InspectionResult;
  inspectionNote?: string;
};

/** 退货时间线事件 */
export type ReturnEvent = {
  id: string;
  time: string;
  actor: string;
  actorRole?: string;
  title: string;
  description?: string;
  type: 'system' | 'customer' | 'warehouse' | 'logistics' | 'finance' | 'ops';
};

/** 退货单主体 */
export type ReturnOrder = {
  id: string;
  /** 退货单号 */
  returnNo: string;
  /** 原订单 ID */
  orderId: string;
  /** 原订单号 */
  orderNo: string;
  /** 渠道 */
  channel: string;
  /** 店铺 */
  merchant: string;
  /** 退货类型 */
  returnType: ReturnType;
  /** 退货状态 */
  status: ReturnStatus;
  /** 召回状态（仅 recall 类型有效） */
  recallStatus?: RecallStatus;
  /** 客户 */
  customerName: string;
  customerEmail: string;
  /** 申请时间 */
  createdAt: string;
  /** 最后更新 */
  updatedAt: string;
  /** 退货商品行 */
  lineItems: ReturnLineItem[];
  /** 退货总金额 */
  totalRefundAmount: number;
  currency: string;
  /** 是否含运费退款 */
  refundShipping: boolean;
  shippingRefundAmount: number;
  /** 退款方式 */
  refundMethod: string;
  /** 收货仓库（退货寄回哪里） */
  returnWarehouse?: string;
  returnWarehouseCode?: string;
  /** 逆向物流：退货运单号 */
  returnTrackingNumber?: string;
  returnCarrier?: string;
  returnTrackingUrl?: string;
  returnLabelUrl?: string; // 退货面单
  /** 退货收货信息 */
  receivedAt?: string;
  receivedBy?: string;
  /** 质检信息 */
  inspectedAt?: string;
  inspectedBy?: string;
  inspectionNote?: string;
  /** 退款完成信息 */
  refundedAt?: string;
  refundTransactionId?: string;
  /** 拒绝原因 */
  rejectReason?: string;
  /** 内部备注 */
  note?: string;
  /** 关联的原履约单号 */
  fulfillmentOrderNos: string[];
  /** 时间线 */
  events: ReturnEvent[];
  /** 上游渠道退货单号（如 Shopify return ID） */
  channelReturnId?: string;
};

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

export const returnStatusConfig: Record<ReturnStatus, { label: string; cls: string; dot: string }> = {
  pending:           { label: '待审核',     cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400' },
  authorized:        { label: '已授权',     cls: 'bg-blue-50 text-blue-700 ring-blue-200',           dot: 'bg-blue-500' },
  rejected:          { label: '已拒绝',     cls: 'bg-red-50 text-[var(--danger)] ring-red-200',     dot: 'bg-red-500' },
  label_generated:   { label: '面单已生成', cls: 'bg-purple-50 text-purple-700 ring-purple-200',    dot: 'bg-purple-500' },
  in_transit:        { label: '退货在途',   cls: 'bg-sky-50 text-sky-700 ring-sky-200',             dot: 'bg-sky-500' },
  received:          { label: '仓库已收货', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',    dot: 'bg-indigo-500' },
  inspecting:        { label: '质检中',     cls: 'bg-violet-50 text-violet-700 ring-violet-200',    dot: 'bg-violet-500' },
  inspection_passed: { label: '质检通过',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  inspection_failed: { label: '质检不通过', cls: 'bg-red-50 text-[var(--danger)] ring-red-200',     dot: 'bg-red-500' },
  refund_processing: { label: '退款处理中', cls: 'bg-orange-50 text-orange-700 ring-orange-200',    dot: 'bg-orange-400' },
  completed:         { label: '已完成',     cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
  cancelled:         { label: '已取消',     cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
};

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

export const returnOrders: ReturnOrder[] = [

  // ─── RET-001：退货退款，质检通过，已完成（so_007 的 Headlamp 退货） ───
  {
    id: 'ret_001',
    returnNo: 'RET-20260604-0001',
    orderId: 'so_007',
    orderNo: 'SO-20260603-0007',
    channel: 'Shopify',
    merchant: 'US Store',
    returnType: 'return_refund',
    status: 'completed',
    customerName: 'Robert Taylor',
    customerEmail: 'robert.t@example.com',
    createdAt: '2026-06-04 10:00:00',
    updatedAt: '2026-06-07 15:30:00',
    lineItems: [
      {
        id: 'rli_001',
        lineItemId: 'li_073',
        sku: 'HL-LED-400',
        title: 'Headlamp',
        variantTitle: '400 Lumen / USB-C',
        quantity: 2,
        refundAmount: 64.32,
        currency: 'USD',
        reason: 'quality_issue',
        inspectionResult: 'damaged',
        inspectionNote: '2 件均有外壳破裂，无法重新销售，建议报废',
      },
    ],
    totalRefundAmount: 64.32,
    currency: 'USD',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回 (Mastercard ****8899)',
    returnWarehouse: 'US-West-SEA',
    returnWarehouseCode: 'US-West-SEA',
    returnTrackingNumber: 'FDX-RTN-7489203999',
    returnCarrier: 'FedEx',
    returnTrackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=FDX-RTN-7489203999',
    returnLabelUrl: '#',
    receivedAt: '2026-06-06 11:00:00',
    receivedBy: 'Wang Lei',
    inspectedAt: '2026-06-06 14:30:00',
    inspectedBy: 'Zhang Wei',
    inspectionNote: '收到 2 件 Headlamp，均有外壳破裂，疑似运输损坏，建议报废并全额退款',
    refundedAt: '2026-06-07 15:30:00',
    refundTransactionId: 're_RTN_7F2K9P3X',
    fulfillmentOrderNos: ['FO-20260603-0072'],
    channelReturnId: 'shopify_ret_8827301',
    events: [
      { id: 're_001_8', time: '2026-06-07 15:30:00', actor: 'Stripe', actorRole: 'payment_gateway', title: '退款已到账', description: '$64.32 已退至 Mastercard ****8899，预计 3-5 工作日到账', type: 'finance' },
      { id: 're_001_7', time: '2026-06-07 10:00:00', actor: '财务系统', actorRole: 'automation', title: '退款处理中', description: '触发 Stripe Refund API，退款金额 $64.32', type: 'finance' },
      { id: 're_001_6', time: '2026-06-06 14:30:00', actor: 'Zhang Wei', actorRole: 'warehouse_qc', title: '质检完成 — 损坏报废', description: '2 件 Headlamp 均有外壳破裂，不可重新销售，标记报废。已通知采购补货', type: 'warehouse' },
      { id: 're_001_5', time: '2026-06-06 11:00:00', actor: 'Wang Lei', actorRole: 'warehouse_staff', title: '退货收货完成', description: '收到 2 件 HL-LED-400，外包装完整，内部商品待质检', type: 'warehouse' },
      { id: 're_001_4', time: '2026-06-05 09:00:00', actor: 'FedEx', actorRole: 'carrier', title: '退货包裹运输中', description: '包裹 FDX-RTN-7489203999 已揽收，发往仓库 US-West-SEA', type: 'logistics' },
      { id: 're_001_3', time: '2026-06-04 14:00:00', actor: '系统', actorRole: 'automation', title: '退货面单已生成', description: 'FedEx 退货面单已发送至 robert.t@example.com，客户可打印后寄回', type: 'system' },
      { id: 're_001_2', time: '2026-06-04 11:00:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '退货申请已授权', description: '审核通过：Headlamp × 2 件，质量问题，允许退货退款 $64.32', type: 'ops' },
      { id: 're_001_1', time: '2026-06-04 10:00:00', actor: 'Robert Taylor', actorRole: 'customer', title: '退货申请提交', description: '客户通过 Shopify 提交退货申请，原因：商品质量问题，Headlamp × 2 件', type: 'customer' },
    ],
  },

  // ─── RET-002：在途召回，召回成功（假设某个在途订单） ───
  {
    id: 'ret_002',
    returnNo: 'RET-20260604-0002',
    orderId: 'so_008',
    orderNo: 'SO-20260602-0008',
    channel: 'Shopify',
    merchant: 'US Store',
    returnType: 'recall',
    status: 'completed',
    recallStatus: 'success',
    customerName: 'David Lee',
    customerEmail: 'david.lee@example.com',
    createdAt: '2026-06-03 16:00:00',
    updatedAt: '2026-06-05 10:00:00',
    lineItems: [
      {
        id: 'rli_002',
        lineItemId: 'li_087',
        sku: 'FR-MEM-BLK',
        title: 'Foot Rest',
        variantTitle: 'Memory Foam / Adjustable',
        quantity: 1,
        refundAmount: 46.44,
        currency: 'USD',
        reason: 'duplicate_order',
        inspectionResult: 'resaleable',
        inspectionNote: '未拆封，可重新销售',
      },
    ],
    totalRefundAmount: 46.44,
    currency: 'USD',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回 (Amex ****1001)',
    returnWarehouse: 'US-East-BOS',
    returnWarehouseCode: 'US-East-EWR',
    receivedAt: '2026-06-04 14:00:00',
    receivedBy: 'Li Ming',
    inspectedAt: '2026-06-04 16:00:00',
    inspectedBy: 'Chen Gang',
    inspectionNote: '商品未拆封，状态完好，已恢复库存',
    refundedAt: '2026-06-05 10:00:00',
    refundTransactionId: 're_RECALL_5B3M2N1K',
    fulfillmentOrderNos: ['FO-20260602-0082'],
    events: [
      { id: 're_002_6', time: '2026-06-05 10:00:00', actor: 'Stripe', actorRole: 'payment_gateway', title: '退款已到账', description: '$46.44 已退至 Amex ****1001', type: 'finance' },
      { id: 're_002_5', time: '2026-06-04 16:00:00', actor: 'Chen Gang', actorRole: 'warehouse_qc', title: '质检完成 — 可重新销售', description: '商品未拆封，状态完好，库存已恢复', type: 'warehouse' },
      { id: 're_002_4', time: '2026-06-04 14:00:00', actor: 'Li Ming', actorRole: 'warehouse_staff', title: '召回包裹已入库', description: '包裹截停后已退回仓库 US-East-EWR，共 1 件商品', type: 'warehouse' },
      { id: 're_002_3', time: '2026-06-03 20:00:00', actor: 'UPS', actorRole: 'carrier', title: '包裹召回成功', description: 'UPS 已截停包裹 1Z999AA10456789012，正在退回仓库', type: 'logistics' },
      { id: 're_002_2', time: '2026-06-03 17:00:00', actor: '系统', actorRole: 'automation', title: '召回指令已发出', description: '已通过 UPS API 发起包裹截停请求，运单号 1Z999AA10456789012', type: 'system' },
      { id: 're_002_1', time: '2026-06-03 16:00:00', actor: 'David Lee', actorRole: 'customer', title: '客户申请取消（在途）', description: '客户表示重复下单，要求取消 Foot Rest × 1 件，包裹已在途', type: 'customer' },
    ],
  },

  // ─── RET-003：退货退款，待审核（新提交） ───
  {
    id: 'ret_003',
    returnNo: 'RET-20260621-0003',
    orderId: 'so_010',
    orderNo: 'SO-20260601-0010',
    channel: 'Shopify',
    merchant: 'SG Store',
    returnType: 'return_refund',
    status: 'pending',
    customerName: 'Kevin Park',
    customerEmail: 'kevin.p@example.sg',
    createdAt: '2026-09-20 09:00:00',
    updatedAt: '2026-09-20 09:00:00',
    lineItems: [
      {
        id: 'rli_003',
        lineItemId: 'li_101',
        sku: 'KK-SET-PRO',
        title: 'Kitchen Knife Set',
        variantTitle: 'Professional / 8-piece / German Steel',
        quantity: 1,
        refundAmount: 306.00,
        currency: 'SGD',
        reason: 'not_as_described',
      },
    ],
    totalRefundAmount: 306.00,
    currency: 'SGD',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回 (PayNow)',
    returnWarehouse: 'SG-Central',
    returnWarehouseCode: 'SG-Central',
    fulfillmentOrderNos: ['FO-20260601-0101'],
    channelReturnId: 'shopify_ret_9931024',
    events: [
      { id: 're_003_1', time: '2026-09-20 09:00:00', actor: 'Kevin Park', actorRole: 'customer', title: '退货申请提交', description: '客户通过 Shopify 提交退货申请，原因：与描述不符，Kitchen Knife Set × 1 套', type: 'customer' },
    ],
  },

  // ─── RET-004：退货退款，已授权，面单已生成 ───
  {
    id: 'ret_004',
    returnNo: 'RET-20260618-0004',
    orderId: 'so_012',
    orderNo: 'SO-20260531-0012',
    channel: 'TikTok Shop',
    merchant: 'UK TikTok Shop',
    returnType: 'return_refund',
    status: 'label_generated',
    customerName: 'Sophie Turner',
    customerEmail: 'sophie.t@example.co.uk',
    createdAt: '2026-09-15 14:00:00',
    updatedAt: '2026-09-16 10:00:00',
    lineItems: [
      {
        id: 'rli_004',
        lineItemId: 'li_121',
        sku: 'HD-CMP-PNK',
        title: 'Hair Dryer Compact',
        variantTitle: 'Pink / Ionic / 1600W',
        quantity: 1,
        refundAmount: 79.00,
        currency: 'GBP',
        reason: 'quality_issue',
      },
    ],
    totalRefundAmount: 79.00,
    currency: 'GBP',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回 (Debit Card ****2233)',
    returnWarehouse: 'UK-London',
    returnWarehouseCode: 'UK-London',
    returnLabelUrl: '#',
    fulfillmentOrderNos: ['FO-20260531-0121'],
    events: [
      { id: 're_004_3', time: '2026-09-16 10:00:00', actor: '系统', actorRole: 'automation', title: '退货面单已生成', description: 'Royal Mail 退货面单已发送至 sophie.t@example.co.uk', type: 'system' },
      { id: 're_004_2', time: '2026-09-16 09:00:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '退货申请已授权', description: '审核通过：Hair Dryer × 1 件，质量问题，允许退货退款 £79.00', type: 'ops' },
      { id: 're_004_1', time: '2026-09-15 14:00:00', actor: 'Sophie Turner', actorRole: 'customer', title: '退货申请提交', description: '客户通过 TikTok Shop 提交退货申请，Hair Dryer × 1 件，吹风机有异响', type: 'customer' },
    ],
  },

  // ─── RET-005：仅退款（无需退货），已完成 ───
  {
    id: 'ret_005',
    returnNo: 'RET-20260610-0005',
    orderId: 'so_018',
    orderNo: 'SO-20260530-0018',
    channel: 'Shopify',
    merchant: 'US Store',
    returnType: 'refund_only',
    status: 'completed',
    customerName: 'Emily Davis',
    customerEmail: 'emily.d@example.com',
    createdAt: '2026-06-10 11:00:00',
    updatedAt: '2026-06-10 15:00:00',
    lineItems: [
      {
        id: 'rli_005',
        lineItemId: 'li_181',
        sku: 'PROD-018-1',
        title: 'Product (瑕疵补偿)',
        variantTitle: '—',
        quantity: 1,
        refundAmount: 25.00,
        currency: 'USD',
        reason: 'quality_issue',
      },
    ],
    totalRefundAmount: 25.00,
    currency: 'USD',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回',
    fulfillmentOrderNos: [],
    refundedAt: '2026-06-10 15:00:00',
    refundTransactionId: 're_COMP_3A1B2C4D',
    note: '商品有轻微瑕疵，与客户协商后给予 $25 补偿，无需退货',
    events: [
      { id: 're_005_3', time: '2026-06-10 15:00:00', actor: 'Stripe', actorRole: 'payment_gateway', title: '补偿退款已到账', description: '$25.00 已退至原支付方式', type: 'finance' },
      { id: 're_005_2', time: '2026-06-10 12:00:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '仅退款已授权', description: '商品有轻微划痕（不影响使用），与客户协商退款 $25 补偿，无需退货', type: 'ops' },
      { id: 're_005_1', time: '2026-06-10 11:00:00', actor: 'Emily Davis', actorRole: 'customer', title: '退款申请提交', description: '客户反馈商品有轻微划痕，申请部分退款', type: 'customer' },
    ],
  },

  // ─── RET-006：退货在途（已发出，等待收货） ───
  {
    id: 'ret_006',
    returnNo: 'RET-20260919-0006',
    orderId: 'so_011',
    orderNo: 'SO-20260601-0011',
    channel: 'Amazon',
    merchant: 'US Amazon',
    returnType: 'return_refund',
    status: 'in_transit',
    customerName: 'Tom Harris',
    customerEmail: 'tom.h@example.com',
    createdAt: '2026-09-18 09:00:00',
    updatedAt: '2026-09-20 08:00:00',
    lineItems: [
      {
        id: 'rli_006',
        lineItemId: 'li_111',
        sku: 'GM-PRO-BLK',
        title: 'Gaming Mouse',
        variantTitle: 'Black / 25600 DPI / Wireless',
        quantity: 1,
        refundAmount: 149.00,
        currency: 'USD',
        reason: 'changed_mind',
      },
    ],
    totalRefundAmount: 149.00,
    currency: 'USD',
    refundShipping: false,
    shippingRefundAmount: 0,
    refundMethod: '原路返回 (Amazon Pay)',
    returnWarehouse: 'US-Central-DFW',
    returnWarehouseCode: 'US-Central-DFW',
    returnTrackingNumber: 'UPS-RTN-1Z999BB20123456',
    returnCarrier: 'UPS',
    returnTrackingUrl: 'https://www.ups.com/track?tracknum=UPS-RTN-1Z999BB20123456',
    returnLabelUrl: '#',
    fulfillmentOrderNos: ['FO-20260601-0111'],
    channelReturnId: 'amz_ret_ARN-114-3941689',
    events: [
      { id: 're_006_4', time: '2026-09-20 08:00:00', actor: 'UPS', actorRole: 'carrier', title: '退货包裹已揽收', description: 'UPS 已从客户处取件，退货运单 UPS-RTN-1Z999BB20123456，发往 US-Central-DFW', type: 'logistics' },
      { id: 're_006_3', time: '2026-09-19 10:00:00', actor: '系统', actorRole: 'automation', title: '退货面单已生成', description: 'UPS 退货面单已发送至 tom.h@example.com', type: 'system' },
      { id: 're_006_2', time: '2026-09-18 14:00:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '退货申请已授权', description: '审核通过：Gaming Mouse × 1，七天无理由，退款 $149.00', type: 'ops' },
      { id: 're_006_1', time: '2026-09-18 09:00:00', actor: 'Tom Harris', actorRole: 'customer', title: '退货申请提交', description: '客户通过 Amazon 提交退货申请，七天无理由，Gaming Mouse × 1', type: 'customer' },
    ],
  },
];

/** 按订单 ID 获取退货单 */
export function getReturnsByOrderId(orderId: string): ReturnOrder[] {
  return returnOrders.filter((r) => r.orderId === orderId);
}

/** 按 ID 获取退货单 */
export function getReturnById(id: string): ReturnOrder | undefined {
  return returnOrders.find((r) => r.id === id);
}
