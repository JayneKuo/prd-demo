/**
 * 订单详情完整数据模型
 * 覆盖 Shopify / Amazon / Walmart 订单字段的超集
 */
import { orderDetailsExtra } from './order-details-extra';
/* ─── Line Item (商品行) ─── */
export type OrderLineItem = {
  id: string;
  /** 系统 SKU */
  sku: string;
  /** 渠道 SKU (平台侧的商品编码) */
  channelSku?: string;
  /** 仓库 SKU (WMS 侧的货品编码) */
  warehouseSku?: string;
  title: string;
  variantTitle: string;
  image?: string;
  quantity: number;
  /** 单位 (件/箱/套/卷/台 etc.) */
  unit?: string;
  unitPrice: string;
  /** 商品行级折扣（平台促销、阶梯价等） */
  discount: string;
  /** 订单级折扣分摊到本行（优惠券、满减等） */
  orderDiscountAlloc?: string;
  /** 税费 */
  tax: string;
  /** 商品原价小计（unitPrice × quantity，未扣折扣） */
  grossSubtotal?: string;
  /** 实付小计（扣除所有折扣后） */
  subtotal: string;
  /** 下单时的 SKU 成本快照（来自 Inventory Cost Ledger） */
  costSnapshot?: number;
  /** 成本来源 */
  costSource?: 'wms_receipt' | 'manual';
  /** 履约状态 */
  fulfillmentStatus: string;
  /** 履约状态说明 (如: 库存不足、无需发货、等待补货 等) */
  fulfillmentNote?: string;
  /** 批次号 */
  batchNo?: string;
  /** 批号 (食品/医疗/化妆品) */
  lotNo?: string;
  /** 有效期 */
  expiryDate?: string;
  /** 序列号 SN (可多个, 如卖2台设备就有2个SN) */
  serialNumbers?: string[];
  /** 重量 (g) */
  weight: number;
  /** 是否需要发货 */
  requiresShipping: boolean;
  /** 平台 line item id */
  platformLineItemId?: string;
  /**
   * 商品履约类型（来自商品中心，随 SKU 带入，只读）
   * 驱动该行的履约路径和附加字段
   * - physical:  实物出库
   * - service:   生成工单，无需发货
   * - presale:   预售期后出库
   * - rental:    出库 + 到期归还
   * - gift_card: 生成卡号，无实体出库
   * - digital:   生成授权码，无 COGS
   */
  itemType?: FulfillmentType;
  /** 服务商品：预约日期 */
  serviceScheduledDate?: string;
  /** 服务商品：时间窗口 */
  serviceTimeWindow?: string;
  /** 预售商品：预售截止日期 */
  presaleEndDate?: string;
  /** 租赁商品：租赁开始日期 */
  rentalStartDate?: string;
  /** 租赁商品：租赁结束日期 */
  rentalEndDate?: string;
  /** 礼品卡：收件人邮箱 */
  giftCardRecipientEmail?: string;
  /** 礼品卡：有效期 */
  giftCardExpiry?: string;
};

/* ─── 支付交易 ─── */
export type PaymentTransaction = {
  id: string;
  /** sale / authorization / capture / refund / void */
  kind: string;
  gateway: string;
  /** 支付方式描述 e.g. "Visa ****4242" */
  method: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  /** 网关事务号 */
  gatewayReference?: string;
  /** 风控结果 */
  riskLevel?: string;
  /** AVS / CVV 结果 */
  avsResult?: string;
  cvvResult?: string;
};

/* ─── 收货地址 ─── */
export type Address = {
  name: string;
  company?: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  /** 格式化后的完整地址 */
  formatted: string;
};

/* ─── 包装单元 (托盘/纸箱/木箱) ─── */
export type PackageUnit = {
  id: string;
  /** 包装类型: pallet(托盘) / carton(纸箱) / crate(木箱) / bag(袋) / drum(桶) */
  type: 'pallet' | 'carton' | 'crate' | 'bag' | 'drum';
  /** 包装编号 */
  no: string;
  /** 重量 */
  weight?: string;
  /** 尺寸 */
  dimensions?: string;
  /** 该包装单元包含的商品 line item ids */
  lineItemIds: string[];
  /** 备注 */
  note?: string;
};

/* ─── 物流 / 履约包裹 ─── */
export type FulfillmentPackage = {
  id: string;
  /** fulfilled / in_transit / delivered / cancelled */
  status: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  /** 主运单号 (多包裹合并运输时的母单号) */
  masterTrackingNo?: string;
  /** 提单号 BOL (Bill of Lading, LTL/海运) */
  bolNumber?: string;
  /** PRO 号 (LTL 货运标识) */
  proNumber?: string;
  /** ─── 海运字段 ─── */
  /** 装货港 (Port of Loading) */
  portOfLoading?: string;
  /** 卸货港 (Port of Discharge) */
  portOfDischarge?: string;
  /** 船名 / 航次 (Vessel / Voyage) */
  vesselVoyage?: string;
  /** 集装箱号 */
  containerNo?: string;
  /** 封条号 (Seal Number) */
  sealNo?: string;
  /** 柜型 (20GP / 40HC / 45HQ etc.) */
  containerType?: string;
  /** ─── 空运字段 ─── */
  /** 起飞机场 (IATA code) */
  departureAirport?: string;
  /** 降落机场 (IATA code) */
  arrivalAirport?: string;
  /** 航班号 */
  flightNo?: string;
  /** 主运单号 MAWB (Master Air Waybill) */
  mawb?: string;
  /** 分运单号 HAWB (House Air Waybill) */
  hawb?: string;
  /** ─── 铁运字段 ─── */
  /** 始发站 */
  departureStation?: string;
  /** 到达站 */
  arrivalStation?: string;
  /** 班列号 */
  trainNo?: string;
  /** 车皮号 */
  wagonNo?: string;
  /** 运输方式: parcel / ltl / ftl / express / freight / air / sea_fcl / sea_lcl / rail */
  shippingMode?: string;
  /** 运输服务: e.g. "UPS Ground", "FedEx Home Delivery", "XPO White Glove", "Royal Mail Tracked 24" */
  serviceLevel?: string;
  /** 履约单号 — 决策层 (选仓、命中规则) */
  fulfillmentOrderNo?: string;
  /** 出库单号 — 仓库执行层 (拣货、验货、打包、出库) */
  outboundOrderNo?: string;
  /** 出库单状态: 待拣货 / 拣货中 / 验货中 / 打包中 / 已交接 / 已出库 */
  outboundStatus?: string;
  /** 包裹编号 */
  packageNo?: string;
  /** 包裹数量 */
  packageCount?: number;
  /** 托盘号 (大件 LTL) */
  palletNo?: string;
  /** 托盘数量 */
  palletCount?: number;
  /** 总重量 (kg) */
  totalWeight?: string;
  /** 包裹尺寸 (cm) */
  dimensions?: string;
  /** 包装明细 (当一票货有多个托盘/包裹时使用) */
  packages?: PackageUnit[];
  /** 包裹包含的 line item ids */
  lineItemIds: string[];
  shippedAt?: string;
  deliveredAt?: string;
  estimatedDelivery?: string;
  /** 发货仓库 */
  warehouse?: string;
  /** 命中的履约规则 */
  matchedRule?: string;
  /** 仓库选择原因 */
  warehouseReason?: string;
};

/* ─── 退款记录 ─── */
export type RefundType =
  | 'refund_only'          // 仅退款，商品不退回（客户保留商品，成本不变）
  | 'return_refund'        // 退货退款，商品退回且状况良好可二次销售（成本冲销）
  | 'return_refund_damaged'; // 退货退款，但商品损坏/报废（成本不可回收，与仅退款同）

export type RefundRecord = {
  id: string;
  /** 退款单号（对外展示） */
  refundNo?: string;
  reason: string;
  amount: string;
  lineItems: { lineItemId: string; quantity: number }[];
  createdAt: string;
  note?: string;
  /** 退款方式（原路返回 / 余额 / 手动） */
  method?: string;
  /** 处理人 */
  processedBy?: string;
  /**
   * 退款类型（影响成本计算）
   * - refund_only:           仅退款，成本不变
   * - return_refund:         退货退款，商品可二次销售，COGS 冲销
   * - return_refund_damaged: 退货但商品损坏，COGS 不可回收
   */
  refundType?: RefundType;
};

/* ─── 时间线事件 ─── */
export type OrderEvent = {
  id: string;
  time: string;
  /** 操作人 (系统 / 人名 / 网关名) */
  actor: string;
  /** 操作人角色 */
  actorRole?: string;
  title: string;
  description?: string;
  /** event type for icon/color */
  type: 'system' | 'payment' | 'fulfillment' | 'customer' | 'edit' | 'risk' | 'note' | 'logistics' | 'refund' | 'upstreamChange';
  /** 关联的履约单号 */
  fulfillmentOrderNo?: string;
  /** 命中的规则名称 */
  ruleName?: string;
  /** 物流跟踪节点 */
  trackingNode?: string;
  /** 上游变更类型（type=upstreamChange 时使用）*/
  upstreamChangeType?: string;
  /** 上游变更摘要：自然语言描述变更内容，含商品名/SKU/数量（type=upstreamChange 时使用）*/
  upstreamChangeSummary?: string;
};

/* ─── 客户信息 ─── */
export type OrderCustomer = {
  name: string;
  email: string;
  phone?: string;
  /** 历史订单数 */
  ordersCount: number;
  /** 历史消费金额 */
  totalSpent: string;
  /** 客户标签 */
  tags: string[];
  /** 是否接受营销 */
  acceptsMarketing: boolean;
};

/* ─── 订单详情完整模型 ─── */
/* ─── 附加费用（商家手动录入，影响利润计算）─── */
export type AdditionalFeeType =
  | 'handling'     // 包材/操作费
  | 'insurance'    // 保险费
  | 'customs'      // 关税/清关费
  | 'return'       // 退货处理费
  | 'platform'     // 平台专项费用
  | 'marketing'    // 营销/广告费
  | 'other';       // 其他

export type AdditionalFee = {
  id: string;
  type: AdditionalFeeType;
  label: string;       // 费用名称（可自定义）
  amount: number;      // 金额（正数=成本，负数=补贴/扣减）
  currency: string;
  note?: string;
  createdAt: string;
};

/* ─── 上游渠道变更事件（系统自动感知）─── */
export type UpstreamChangeType =
  | 'order_cancelled'       // 订单被取消
  | 'buyer_cancel_request'  // 买家申请取消
  | 'item_cancelled'        // 商品被取消
  | 'quantity_changed'      // 商品数量变更
  | 'address_changed'       // 收货地址变更
  | 'item_added'            // 商品新增
  | 'price_changed';        // 价格变更

export type UpstreamChangeStatus =
  | 'pending'      // 待处置（新产生，未处理）
  | 'handled'      // 已处置
  | 'ignored';     // 已忽略

/** 订单履约阶段（影响处置策略） */
export type FulfillmentStage =
  | 'pending_review'    // 待审核发货
  | 'pending_outbound'  // 待仓库出库（已下单至仓库，未出库）
  | 'outbounded';       // 仓库已出库（已发货）

export type UpstreamChange = {
  id: string;
  /** 变更类型 */
  type: UpstreamChangeType;
  /** 变更状态 */
  status: UpstreamChangeStatus;
  /** 发生时间（上游推送时间） */
  detectedAt: string;
  /** 处置时间 */
  handledAt?: string;
  /** 处置人 */
  handledBy?: string;
  /** 处置动作 */
  handledAction?: string;
  /** 订单当时所处的履约阶段 */
  stage: FulfillmentStage;
  /** 变更前数据（用于对比展示） */
  before?: Record<string, unknown>;
  /** 变更后数据 */
  after?: Record<string, unknown>;
  /** 渠道原始变更说明 */
  channelNote?: string;
  /** 系统建议的处置方式 */
  suggestions: UpstreamChangeSuggestion[];
};

export type UpstreamChangeSuggestion = {
  action: string;           // 操作标识
  label: string;            // 显示文字
  variant: 'primary' | 'danger' | 'default';
  description?: string;     // 操作说明
};

/* ─── 外部成本补充（WMS/TMS 回传，不在订单数据里的部分）─── */
export type OrderCostSupplement = {  /** 仓储操作费（WMS 回传：拣货+打包+操作） */
  warehouseCost?: number;
  /** 企业承担运输成本（TMS/Carrier 回传） */
  freightCost?: number;
  /** 成本是否完整 */
  costComplete: boolean;
  /** 成本不完整说明 */
  costPendingNote?: string;
  currency: string;
};

/* ─── 订单利润分析（轻量：只存无法从订单自身推算的外部数据）─── */
export type OrderProfitability = OrderCostSupplement;

/* ─── 履约类型系统 ─── */

/**
 * 订单履约类型 — 驱动进度条步骤、必填字段、成本模型
 * physical:    实物商品（默认，走仓库出库流程）
 * presale:     预售商品（延迟履约，预售期结束后才能出库）
 * service:     服务商品（关联工单，无需发货）
 * rental:      租赁商品（出库 + 到期归还，成本按折旧计）
 * gift_card:   礼品卡 / 储值卡（生成卡号/PIN，无实体出库，记负债）
 * digital:     数字商品（License / 下载链接，无 COGS）
 */
export type FulfillmentType =
  | 'physical'
  | 'presale'
  | 'service'
  | 'rental'
  | 'gift_card'
  | 'digital';

/** 预售商品配置 */
export type PresaleConfig = {
  /** 预售截止日期 (ISO date string) */
  presaleEndDate: string;
  /** 最低起售数量（达到才发货，可选）*/
  minQtyThreshold?: number;
  /** 当前已预售数量 */
  currentPresaleQty?: number;
  /** 预售状态 */
  presaleStatus: 'active' | 'ended' | 'cancelled';
  /** 预计发货日期（预售期结束后的出库目标日期）*/
  estimatedShipDate?: string;
};

/** 服务商品配置 */
export type ServiceConfig = {
  /** 服务类型 (installation / maintenance / consulting / delivery_with_install 等) */
  serviceType: string;
  /** 预约服务日期 */
  scheduledDate?: string;
  /** 预约时间窗口 (e.g. "14:00–18:00") */
  scheduledTimeWindow?: string;
  /** 服务地址（可能与收货地址不同）*/
  serviceAddress?: string;
  /** 关联工单号 */
  workOrderNo?: string;
  /** 服务状态 */
  serviceStatus: 'pending_schedule' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  /** 服务技术人员 */
  technician?: string;
  /** 完成时间 */
  completedAt?: string;
};

/** 租赁商品配置 */
export type RentalConfig = {
  /** 租赁开始日期 */
  rentalStartDate: string;
  /** 租赁结束日期 */
  rentalEndDate: string;
  /** 押金金额 */
  depositAmount?: string;
  /** 押金状态 */
  depositStatus?: 'held' | 'released' | 'forfeited';
  /** 租赁状态 */
  rentalStatus: 'active' | 'overdue' | 'returned' | 'cancelled';
  /** 实际归还时间 */
  returnedAt?: string;
  /** 归还状况 */
  returnCondition?: 'good' | 'damaged' | 'missing';
};

/** 礼品卡 / 储值卡配置 */
export type GiftCardConfig = {
  /** 卡面值（与订单金额一致）*/
  faceValue: string;
  /** 卡号（生成后填充）*/
  cardNumber?: string;
  /** PIN 码 */
  pin?: string;
  /** 有效期 */
  expiryDate?: string;
  /** 卡状态 */
  cardStatus: 'pending_issue' | 'issued' | 'activated' | 'redeemed' | 'expired' | 'cancelled';
  /** 核销金额（已使用金额）*/
  redeemedAmount?: string;
  /** 核销时间 */
  redeemedAt?: string;
  /** 受赠人邮件（发送礼品卡时用）*/
  recipientEmail?: string;
};

/** 数字商品配置 */
export type DigitalConfig = {
  /** License Key / 授权码 */
  licenseKey?: string;
  /** 下载链接 */
  downloadUrl?: string;
  /** 有效期 */
  expiryDate?: string;
  /** 激活状态 */
  activationStatus: 'pending' | 'activated' | 'expired' | 'revoked';
};

export type OrderDetail = {
  /* 基本标识 */
  id: string;
  orderNo: string;
  platformOrderNo: string;
  confirmationNumber?: string;
  referenceNo?: string;
  channel: string;
  merchant: string;
  /** 订单来源 (web / pos / draft / api) */
  sourceType: string;

  /* 状态 */
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  riskLevel?: string;
  exception?: string;

  /* 时间 */
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  closedAt?: string;

  /* 金额 */
  currency: string;
  subtotal: string;
  totalDiscount: string;
  totalShipping: string;
  totalTax: string;
  totalPrice: string;
  /** 含税 or 不含税 */
  taxesIncluded: boolean;
  /** 支付网关 */
  paymentGateway: string;

  /* 折扣码 */
  discountCodes: { code: string; type: string; amount: string }[];

  /* 商品行 */
  lineItems: OrderLineItem[];

  /* 客户 */
  customer: OrderCustomer;

  /* 地址 */
  shippingAddress: Address;
  billingAddress: Address;

  /* 物流 */
  shippingMethod: string;
  fulfillments: FulfillmentPackage[];

  /* 支付 */
  transactions: PaymentTransaction[];

  /* 退款 */
  refunds: RefundRecord[];

  /* 时间线 */
  events: OrderEvent[];

  /* 备注 */
  note?: string;
  noteAttributes?: { name: string; value: string }[];
  tags: string[];

  /* 利润分析 */
  profitability?: OrderProfitability;

  /* 附加费用（商家手动录入） */
  additionalFees?: AdditionalFee[];

  /* 上游渠道变更事件（系统自动感知，用于异常处置） */
  upstreamChanges?: UpstreamChange[];

  /* 平台扩展字段 */
  platformMeta?: Record<string, string>;

  /* 履约类型及对应配置 */
  fulfillmentType?: FulfillmentType;
  presaleConfig?: PresaleConfig;
  serviceConfig?: ServiceConfig;
  rentalConfig?: RentalConfig;
  giftCardConfig?: GiftCardConfig;
  digitalConfig?: DigitalConfig;
};

/* ─── Demo 数据 ─── */
export const orderDetails: Record<string, OrderDetail> = {
  so_001: {
    id: 'so_001',
    orderNo: 'SO-20260604-0001',
    platformOrderNo: '#SH-7291034',
    confirmationNumber: 'UQVCRCX01',
    referenceNo: 'PO-2024-8821',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '待处理',
    financialStatus: '已支付',
    fulfillmentStatus: '未开始',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-04 16:29:18',
    updatedAt: '2026-06-04 16:31:02',
    currency: 'USD',
    subtotal: '$137.00',
    totalDiscount: '$0.00',
    totalShipping: '$12.00',
    totalTax: '$10.96',
    totalPrice: '$159.96',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      {
        id: 'li_001',
        sku: 'WE-PRO-BLK',
        channelSku: 'SH-WE-PRO-BLK-001',
        warehouseSku: 'WMS-WE-PRO-BLK',
        title: 'Wireless Earbuds Pro',
        variantTitle: 'Black / ANC',
        quantity: 1,
        unit: '件',
        unitPrice: '$89.00',
        grossSubtotal: '$89.00',
        discount: '$0.00',
        orderDiscountAlloc: '$0.00',
        tax: '$7.12',
        subtotal: '$96.12',
        costSnapshot: 32.00,
        costSource: 'wms_receipt',
        fulfillmentStatus: '待履约',
        fulfillmentNote: '等待生成履约单',
        weight: 85,
        requiresShipping: true,
        platformLineItemId: 'li_sh_92810'
      },
      {
        id: 'li_002',
        sku: 'PC-CLR-IP15',
        channelSku: 'SH-PC-CLR-IP15-001',
        warehouseSku: 'WMS-PC-CLR-IP15',
        title: 'Phone Case Clear',
        variantTitle: 'iPhone 15 / Transparent',
        quantity: 1,
        unit: '件',
        unitPrice: '$29.00',
        grossSubtotal: '$29.00',
        discount: '$0.00',
        orderDiscountAlloc: '$0.00',
        tax: '$2.32',
        subtotal: '$31.32',
        costSnapshot: 12.00,
        costSource: 'wms_receipt',
        fulfillmentStatus: '待履约',
        fulfillmentNote: '等待生成履约单',
        weight: 42,
        requiresShipping: true,
        platformLineItemId: 'li_sh_92811'
      },
      {
        id: 'li_003',
        sku: 'UC-2M-WHT',
        channelSku: 'SH-UC-2M-WHT-001',
        warehouseSku: 'WMS-UC-2M-WHT',
        title: 'USB-C Cable 2m',
        variantTitle: 'White / 2 meters',
        quantity: 1,
        unit: '件',
        unitPrice: '$19.00',
        grossSubtotal: '$19.00',
        discount: '$0.00',
        orderDiscountAlloc: '$0.00',
        tax: '$1.52',
        subtotal: '$20.52',
        costSnapshot: 5.50,
        costSource: 'manual',
        fulfillmentStatus: '待履约',
        fulfillmentNote: '等待生成履约单',
        weight: 65,
        requiresShipping: true,
        platformLineItemId: 'li_sh_92812'
      }
    ],
    customer: {
      name: 'Emily Johnson',
      email: 'emily.j@example.com',
      phone: '+1 (212) 555-0147',
      ordersCount: 5,
      totalSpent: '$892.40',
      tags: ['VIP', 'Repeat buyer'],
      acceptsMarketing: true
    },
    shippingAddress: {
      name: 'Emily Johnson',
      phone: '+1 (212) 555-0147',
      address1: '350 Fifth Avenue, Suite 4800',
      city: 'New York',
      province: 'NY',
      country: 'US',
      zip: '10118',
      formatted: '350 Fifth Avenue, Suite 4800, New York, NY 10118, US'
    },
    billingAddress: {
      name: 'Emily Johnson',
      phone: '+1 (212) 555-0147',
      address1: '350 Fifth Avenue, Suite 4800',
      city: 'New York',
      province: 'NY',
      country: 'US',
      zip: '10118',
      formatted: '350 Fifth Avenue, Suite 4800, New York, NY 10118, US'
    },
    shippingMethod: 'USPS Priority Mail (2-3 business days)',
    fulfillments: [],
    transactions: [
      {
        id: 'txn_001',
        kind: 'sale',
        gateway: 'Stripe',
        method: 'Visa ****4242',
        amount: '$159.96',
        currency: 'USD',
        status: 'success',
        createdAt: '2026-06-04 16:29:42',
        gatewayReference: 'ch_3Nq8K2EJ...',
        riskLevel: 'normal',
        avsResult: 'Y',
        cvvResult: 'M'
      }
    ],
    refunds: [],
    events: [
      { id: 'evt_upstream_001_1', time: '2026-06-04 16:45:00', actor: '系统', actorRole: 'automation', title: '上游变更感知：收货地址已变更', type: 'upstreamChange' as const, upstreamChangeType: 'address_changed', upstreamChangeSummary: '收货地址：11 Broadway，New York → 350 5th Ave，New York · 买家通过 Shopify 订单编辑提交' },
      { id: 'evt_001', time: '2026-06-04 16:31:02', actor: '系统', actorRole: 'automation', title: '订单自动确认', description: '风控通过，进入待处理队列', type: 'system' },
      { id: 'evt_002', time: '2026-06-04 16:29:42', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****4242 收款 $159.96，网关参考号 ch_3Nq8K2EJ...', type: 'payment' },
      { id: 'evt_003', time: '2026-06-04 16:29:38', actor: '系统', actorRole: 'automation', title: '风控检查通过', description: 'Risk level: Low · AVS: Y · CVV: M', type: 'risk' },
      { id: 'evt_004', time: '2026-06-04 16:29:18', actor: 'Emily Johnson', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' }
    ],
    note: '请尽量在周三前发出，谢谢！',
    tags: ['priority', 'new-customer-campaign'],
    profitability: {
      // 只存来自外部系统的成本，订单自身的数据从 lineItems/transactions 计算
      warehouseCost: 3.20,
      freightCost: 0,       // TMS 尚未回传
      costComplete: false,
      costPendingNote: '运输成本待 TMS 回传后更新',
      currency: 'USD',
    },
    additionalFees: [],
    // 上游变更：地址变更（待审核阶段，系统已自动更新）
    upstreamChanges: [
      {
        id: 'uc_001_1',
        type: 'address_changed',
        status: 'pending',
        detectedAt: '2026-06-04 16:45:00',
        stage: 'pending_review',
        before: { address1: '11 Broadway', city: 'New York', zip: '10004' },
        after: { address1: '350 5th Ave', city: 'New York', zip: '10118' },
        channelNote: 'Shopify: Buyer updated shipping address via order edit',
        suggestions: [
          { action: 'accept_address', label: '接受新地址', variant: 'primary', description: '系统已自动更新收货地址，点击确认接受' },
          { action: 'ignore', label: '忽略', variant: 'default', description: '忽略此变更，使用原地址发货' },
        ],
      },
    ],
    platformMeta: {
      'shopify_order_id': '5820173271233',
      'checkout_token': 'abc123def456',
      'landing_site': '/collections/electronics',
      'referring_site': 'https://google.com',
      'browser_ip': '203.0.113.42'
    },
    fulfillmentType: 'physical',
  },
  so_007: {
    id: 'so_007',
    orderNo: 'SO-20260603-0007',
    platformOrderNo: '#SH-7290801',
    confirmationNumber: 'RTPLM0007',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '挂起',
    financialStatus: '已支付',
    fulfillmentStatus: '部分履约',
    riskLevel: 'medium',
    exception: '库存不足',
    createdAt: '2026-06-03 11:20:05',
    updatedAt: '2026-06-04 09:15:00',
    currency: 'USD',
    subtotal: '$523.30',
    totalDiscount: '$20.00',
    totalShipping: '$24.00',
    totalTax: '$40.00',
    totalPrice: '$567.30',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [{ code: 'CAMP10', type: 'percentage', amount: '$20.00' }],
    lineItems: [
      { id: 'li_071', sku: 'TENT-4P-GRN', channelSku: 'SH-TENT-4P-GRN', warehouseSku: 'WMS-TENT-4P-GRN', title: 'Camping Tent 4P', variantTitle: 'Green / 4-person', quantity: 1, unit: '顶', unitPrice: '$229.00', grossSubtotal: '$229.00', discount: '$10.00', orderDiscountAlloc: '$8.78', tax: '$17.52', subtotal: '$210.22', costSnapshot: 85.00, costSource: 'wms_receipt', fulfillmentStatus: '已发货', fulfillmentNote: '已从 US-West-SEA 发出', weight: 4500, requiresShipping: true },
      { id: 'li_072', sku: 'SB-WARM-BLU', channelSku: 'SH-SB-WARM-BLU', warehouseSku: 'WMS-SB-WARM-BLU', title: 'Sleeping Bag', variantTitle: 'Blue / -10°C', quantity: 2, unit: '件', unitPrice: '$79.00', grossSubtotal: '$158.00', discount: '$5.00', orderDiscountAlloc: '$6.06', tax: '$12.24', subtotal: '$146.94', costSnapshot: 30.00, costSource: 'wms_receipt', fulfillmentStatus: '已发货', fulfillmentNote: '已从 US-West-SEA 发出', weight: 1800, requiresShipping: true },
      { id: 'li_073', sku: 'HL-LED-400', channelSku: 'SH-HL-LED-400', warehouseSku: 'WMS-HL-LED-400', title: 'Headlamp', variantTitle: '400 Lumen / USB-C', quantity: 2, unit: '件', unitPrice: '$35.00', grossSubtotal: '$70.00', discount: '$3.00', orderDiscountAlloc: '$2.68', tax: '$5.36', subtotal: '$64.32', costSnapshot: 8.00, costSource: 'manual', fulfillmentStatus: '库存不足', fulfillmentNote: '全网缺货，补货 ETA 06-08', weight: 120, requiresShipping: true },
      { id: 'li_074', sku: 'FAK-DLX-01', channelSku: 'SH-FAK-DLX-01', warehouseSku: 'WMS-FAK-DLX-01', title: 'First Aid Kit', variantTitle: 'Deluxe / 120-piece', quantity: 1, unit: '套', unitPrice: '$45.30', grossSubtotal: '$45.30', discount: '$2.00', orderDiscountAlloc: '$1.74', tax: '$4.88', subtotal: '$41.56', costSnapshot: 27.00, costSource: 'wms_receipt', fulfillmentStatus: '库存不足', fulfillmentNote: '等待 Headlamp 到货后合并发出', weight: 680, requiresShipping: true }
    ],
    customer: {
      name: 'Robert Taylor',
      email: 'robert.t@example.com',
      phone: '+1 (206) 555-0198',
      ordersCount: 12,
      totalSpent: '$3,420.00',
      tags: ['wholesale', 'outdoor-enthusiast'],
      acceptsMarketing: false
    },
    shippingAddress: {
      name: 'Robert Taylor',
      phone: '+1 (206) 555-0198',
      address1: '1420 5th Avenue, Apt 3202',
      city: 'Seattle',
      province: 'WA',
      country: 'US',
      zip: '98101',
      formatted: '1420 5th Avenue, Apt 3202, Seattle, WA 98101, US'
    },
    billingAddress: {
      name: 'Robert Taylor',
      phone: '+1 (206) 555-0198',
      address1: '1420 5th Avenue, Apt 3202',
      city: 'Seattle',
      province: 'WA',
      country: 'US',
      zip: '98101',
      formatted: '1420 5th Avenue, Apt 3202, Seattle, WA 98101, US'
    },
    shippingMethod: 'FedEx Ground (5-7 business days)',
    fulfillments: [
      {
        id: 'ful_071',
        status: 'delivered',
        carrier: 'FedEx',
        trackingNumber: '7489203847102',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=7489203847102',
        fulfillmentOrderNo: 'FO-20260603-0071',
        outboundOrderNo: 'OB-20260603-0071',
        outboundStatus: '已出库',
        packageNo: 'PKG-071-A',
        lineItemIds: ['li_071', 'li_072'],
        shippedAt: '2026-06-03 18:00',
        deliveredAt: '2026-06-05 14:22',
        warehouse: 'US-West-SEA',
        matchedRule: '西海岸就近分仓',
        warehouseReason: '距 Seattle WA 最近，大件商品库存充足'
      }
    ],
    transactions: [
      { id: 'txn_071', kind: 'sale', gateway: 'Stripe', method: 'Mastercard ****8899', amount: '$567.30', currency: 'USD', status: 'success', createdAt: '2026-06-03 11:20:32', gatewayReference: 'ch_7Xm2P1QZ...' }
    ],
    refunds: [
      {
        id: 'ref_071',
        refundNo: 'REF-20260604-0001',
        reason: '库存不足 - Headlamp 全网缺货，客户申请部分退款',
        amount: '$64.32',
        lineItems: [
          { lineItemId: 'li_073', quantity: 2 }
        ],
        createdAt: '2026-06-04 10:30:00',
        note: '已通知客户，退款原路返回 Mastercard ****8899',
        method: '原路返回 (Mastercard ****8899)',
        processedBy: 'Lisa Chen',
        refundType: 'refund_only',  // 仅退款：Headlamp 全网缺货，商品从未发出，但因无货无法退回实物，成本按0计（未出库）
      }
    ],
    events: [
      /* ─── 上游变更感知（最新，系统自动） ─── */
      { id: 'evt_upstream_007_1', time: '2026-06-04 11:00:00', actor: '系统', actorRole: 'automation', title: '上游变更感知：买家申请取消订单', type: 'upstreamChange' as const, upstreamChangeType: 'buyer_cancel_request', upstreamChangeSummary: '买家通过 Shopify 提交取消申请，FO-20260603-0071 已出库在途，请决定是否拦截' },
      { id: 'evt_upstream_007_2', time: '2026-06-04 09:10:00', actor: '系统', actorRole: 'automation', title: '上游变更感知：商品行被渠道取消', type: 'upstreamChange' as const, upstreamChangeType: 'item_cancelled', upstreamChangeSummary: 'Headlamp（HL-LED-400）× 2 件 被渠道标记取消，原因：全网库存不足' },
      /* ─── 运营挂起 (最新) ─── */
      { id: 'evt_07_20', time: '2026-06-04 09:15:00', actor: 'Lisa Chen', actorRole: 'ops_manager', title: '订单挂起', description: '第二批履约单库存不足无法执行，等待补货 ETA 06-08，已通知客户', type: 'edit' },
      /* ─── 退款事件 ─── */
      { id: 'evt_07_ref1', time: '2026-06-04 10:30:00', actor: 'Lisa Chen', actorRole: 'ops_manager', title: '部分退款 - $64.32', description: '退款单 REF-20260604-0001 · Headlamp × 2 件 · 原路返回 Mastercard ****8899 · 原因：全网库存不足，无法履约', type: 'refund' },
      /* ─── 第二个履约单 (HL-LED-400 + FAK-DLX-01) - 挂起 ─── */
      { id: 'evt_07_19', time: '2026-06-03 14:50:00', actor: '履约引擎', actorRole: 'automation', title: '履约挂起 - 等待补货', description: 'FO-20260603-0072: Headlamp (HL-LED-400) 全网库存不足 · US-West-SEA: 0 / US-East-EWR: 0 / US-Central-DFW: 0 · 补货 ETA 06-08 · 履约单挂起', type: 'fulfillment', ruleName: '库存不足挂起规则', fulfillmentOrderNo: 'FO-20260603-0072' },
      { id: 'evt_07_18', time: '2026-06-03 14:48:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 - 失败', description: 'FO-20260603-0072: 候选仓遍历 US-West-SEA(HL-LED-400=0) / US-East-EWR(HL-LED-400=0) / US-Central-DFW(HL-LED-400=0) · 找不到有效仓库 · 所有仓库 Headlamp 缺货', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260603-0072' },
      /* ─── 第一个履约单 (Tent + Sleeping Bags) - 已发货已签收 ─── */
      { id: 'evt_07_17', time: '2026-06-05 14:22:00', actor: 'FedEx', actorRole: 'carrier', title: '包裹已签收', description: '签收人: R. Taylor · 跟踪号 7489203847102 · 1420 5th Avenue, Seattle WA', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_16', time: '2026-06-03 18:00:00', actor: 'US-West-SEA', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260603-0071 交接 FedEx，快递员已取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_15', time: '2026-06-03 17:30:00', actor: 'US-West-SEA', actorRole: 'warehouse_staff', title: '打包完成', description: '3 件商品打包完成 · 包裹重量 8.1kg · 大件包装 · 等待 FedEx 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_14', time: '2026-06-03 16:30:00', actor: 'US-West-SEA', actorRole: 'warehouse_staff', title: '拣货验货完成', description: '出库单 OB-20260603-0071 拣货 3 件 (Tent×1 + Sleeping Bag×2)，验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_13', time: '2026-06-03 15:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260603-0071 下发至仓库 US-West-SEA', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0071' },
      /* ─── 选仓决策 (第一个FO) ─── */
      { id: 'evt_07_12', time: '2026-06-03 14:55:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: 'FO-20260603-0071: 候选仓 US-West-SEA(3km) / US-West-LAX(1800km) · 距 Seattle WA 98101 距离评分 SEA=99分 · 库存校验: Tent×1✓ Sleeping Bag×2✓ · 选定 US-West-SEA', type: 'fulfillment', ruleName: '西海岸就近分仓', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_11', time: '2026-06-03 14:52:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策', description: 'FO-20260603-0071: 总重量 8.1kg (>5kg大件) · 命中规则「大件FedEx Ground」· 时效 5-7 天 · 预选 FedEx Ground', type: 'fulfillment', ruleName: '大件承运商规则', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_10', time: '2026-06-03 14:50:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: '标准时效 5-7 个工作日 · 大件物流优先选 Ground · 无加急', type: 'fulfillment', ruleName: '标准时效规则' },
      /* ─── 拆单决策 ─── */
      { id: 'evt_07_09', time: '2026-06-03 14:45:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '6 件商品尝试合单 → 库存预校验: Tent✓ Sleeping Bag×2✓ Headlamp×2✗(全网缺货) First Aid✓ · 拆分为 2 个履约单: FO-0071(Tent+Sleeping Bags, 可发) + FO-0072(Headlamp+First Aid, 待补货)', type: 'fulfillment', ruleName: '库存驱动拆单策略' },
      { id: 'evt_07_08', time: '2026-06-03 14:42:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '拆分生成 2 个履约单: FO-20260603-0071 (3件, 可执行) + FO-20260603-0072 (3件, 待库存)', type: 'fulfillment' },
      /* ─── 准入 ─── */
      { id: 'evt_07_07', time: '2026-06-03 14:40:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '6 件商品全部 requiresShipping=true · 支付已确认 (Stripe $567.30) · 风控 Low · 准入通过，进入拆合单决策', type: 'fulfillment', ruleName: '履约准入规则' },
      /* ─── 支付 + 创建 ─── */
      { id: 'evt_07_02', time: '2026-06-03 11:20:32', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Mastercard ****8899 收款 $567.30 · 网关参考号 ch_7Xm2P1QZ...', type: 'payment' },
      { id: 'evt_07_01', time: '2026-06-03 11:20:05', actor: 'Robert Taylor', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交，来源: Instagram 广告', type: 'customer' },
      /* ─── 物流跟踪 (第一个包裹, FedEx, chronological) ─── */
      { id: 'evt_07_l1', time: '2026-06-03 18:30:00', actor: 'FedEx', actorRole: 'carrier', title: '揽收成功', description: '包裹已取件 · 发货仓 US-West-SEA · 跟踪号 7489203847102', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_l2', time: '2026-06-03 23:00:00', actor: 'FedEx', actorRole: 'carrier', title: '到达转运中心', description: '到达 Seattle WA Sort Facility，进行分拣', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_l3', time: '2026-06-04 08:00:00', actor: 'FedEx', actorRole: 'carrier', title: '运输中', description: '离开 Seattle Sort Facility · 目的地: Seattle WA 98101', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_l4', time: '2026-06-05 07:00:00', actor: 'FedEx', actorRole: 'carrier', title: '到达配送站', description: '到达 Seattle Downtown 配送站 · 预计今日送达', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260603-0071' },
      { id: 'evt_07_l5', time: '2026-06-05 14:22:00', actor: 'FedEx', actorRole: 'carrier', title: '签收成功', description: '本人签收 · 1420 5th Avenue, Apt 3202, Seattle WA 98101', type: 'logistics', trackingNode: 'delivered', fulfillmentOrderNo: 'FO-20260603-0071' }
    ],
    note: '',
    tags: ['partial-fulfillment', 'backorder'],
    profitability: {
      warehouseCost: 8.50,
      freightCost: 42.00,
      costComplete: true,
      currency: 'USD',
    },
    additionalFees: [
      { id: 'fee_001', type: 'insurance', label: '运输保险', amount: 12.00, currency: 'USD', note: 'FedEx 声明价值保险', createdAt: '2026-06-03 18:30:00' },
      { id: 'fee_002', type: 'handling', label: '大件操作费', amount: 5.00, currency: 'USD', note: '帐篷超重件附加操作费', createdAt: '2026-06-03 16:00:00' },
    ],
    // 上游变更：买家申请取消（已出库阶段——最危险的场景）
    upstreamChanges: [
      {
        id: 'uc_007_1',
        type: 'buyer_cancel_request',
        status: 'pending',
        detectedAt: '2026-06-04 11:00:00',
        stage: 'outbounded',
        before: { status: 'active' },
        after: { status: 'cancellation_requested', reason: '库存不足商品无法按时到货，买家不愿等待' },
        channelNote: 'Shopify: Buyer submitted cancellation request — Order partially fulfilled, FO-20260603-0071 already shipped',
        suggestions: [
          { action: 'agree_cancel_partial', label: '同意取消（已发部分不影响）', variant: 'primary', description: '同意取消未发货部分，已发货包裹继续投递，并对已发商品进行退款' },
          { action: 'initiate_recall', label: '召回已发包裹', variant: 'danger', description: '通知承运商尝试拦截已发货包裹（成功率取决于当前位置）' },
          { action: 'reject_cancel', label: '拒绝取消申请', variant: 'default', description: '拒绝买家取消请求，继续履约' },
          { action: 'ignore', label: '忽略', variant: 'default' },
        ],
      },
      {
        id: 'uc_007_2',
        type: 'item_cancelled',
        status: 'pending',
        detectedAt: '2026-06-04 09:10:00',
        stage: 'pending_outbound',
        before: { lineItemId: 'li_073', quantity: 2 },
        after: { lineItemId: 'li_073', quantity: 0, reason: 'out_of_stock' },
        channelNote: 'Shopify: Line item HL-LED-400 cancelled due to inventory unavailability',
        suggestions: [
          { action: 'remove_item', label: '从发货单移除', variant: 'primary', description: '将 Headlamp × 2 从履约单移除，仅发货其他商品' },
          { action: 'partial_refund', label: '对该商品发起退款', variant: 'default', description: '对取消商品 $64.32 直接退款，无需退货' },
        ],
      },
    ],
    platformMeta: {
      'shopify_order_id': '5820173100801',
      'landing_site': '/collections/outdoor',
      'referring_site': 'https://instagram.com'
    },
    fulfillmentType: 'physical',
  }
};

/** 合并所有订单详情 */
const allOrderDetails: Record<string, OrderDetail> = { ...orderDetails, ...orderDetailsExtra };

/** 根据 order id 获取详情，没有详细数据的订单返回 undefined */
export function getOrderDetail(id: string): OrderDetail | undefined {
  return allOrderDetails[id];
}
