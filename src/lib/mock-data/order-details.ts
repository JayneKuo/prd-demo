/**
 * 订单详情完整数据模型
 * 覆盖 Shopify / Amazon / Walmart 订单字段的超集
 */

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
  /** 折扣分摊 */
  discount: string;
  /** 税费 */
  tax: string;
  /** 小计 (quantity × unitPrice - discount + tax) */
  subtotal: string;
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
export type RefundRecord = {
  id: string;
  reason: string;
  amount: string;
  lineItems: { lineItemId: string; quantity: number }[];
  createdAt: string;
  note?: string;
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
  type: 'system' | 'payment' | 'fulfillment' | 'customer' | 'edit' | 'risk' | 'note' | 'logistics';
  /** 关联的履约单号 */
  fulfillmentOrderNo?: string;
  /** 命中的规则名称 */
  ruleName?: string;
  /** 物流跟踪节点 */
  trackingNode?: string;
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

  /* 平台扩展字段 */
  platformMeta?: Record<string, string>;
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
        discount: '$0.00',
        tax: '$7.12',
        subtotal: '$96.12',
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
        discount: '$0.00',
        tax: '$2.32',
        subtotal: '$31.32',
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
        discount: '$0.00',
        tax: '$1.52',
        subtotal: '$20.52',
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
      { id: 'evt_001', time: '2026-06-04 16:31:02', actor: '系统', actorRole: 'automation', title: '订单自动确认', description: '风控通过，进入待处理队列', type: 'system' },
      { id: 'evt_002', time: '2026-06-04 16:29:42', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****4242 收款 $159.96，网关参考号 ch_3Nq8K2EJ...', type: 'payment' },
      { id: 'evt_003', time: '2026-06-04 16:29:38', actor: '系统', actorRole: 'automation', title: '风控检查通过', description: 'Risk level: Low · AVS: Y · CVV: M', type: 'risk' },
      { id: 'evt_004', time: '2026-06-04 16:29:18', actor: 'Emily Johnson', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' }
    ],
    note: '请尽量在周三前发出，谢谢！',
    tags: ['priority', 'new-customer-campaign'],
    platformMeta: {
      'shopify_order_id': '5820173271233',
      'checkout_token': 'abc123def456',
      'landing_site': '/collections/electronics',
      'referring_site': 'https://google.com',
      'browser_ip': '203.0.113.42'
    }
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
      { id: 'li_071', sku: 'TENT-4P-GRN', channelSku: 'SH-TENT-4P-GRN', warehouseSku: 'WMS-TENT-4P-GRN', title: 'Camping Tent 4P', variantTitle: 'Green / 4-person', quantity: 1, unit: '顶', unitPrice: '$229.00', discount: '$10.00', tax: '$17.52', subtotal: '$236.52', fulfillmentStatus: '已发货', fulfillmentNote: '已从 US-West-SEA 发出', weight: 4500, requiresShipping: true },
      { id: 'li_072', sku: 'SB-WARM-BLU', channelSku: 'SH-SB-WARM-BLU', warehouseSku: 'WMS-SB-WARM-BLU', title: 'Sleeping Bag', variantTitle: 'Blue / -10°C', quantity: 2, unit: '件', unitPrice: '$79.00', discount: '$5.00', tax: '$12.24', subtotal: '$165.24', fulfillmentStatus: '已发货', fulfillmentNote: '已从 US-West-SEA 发出', weight: 1800, requiresShipping: true },
      { id: 'li_073', sku: 'HL-LED-400', channelSku: 'SH-HL-LED-400', warehouseSku: 'WMS-HL-LED-400', title: 'Headlamp', variantTitle: '400 Lumen / USB-C', quantity: 2, unit: '件', unitPrice: '$35.00', discount: '$3.00', tax: '$5.36', subtotal: '$72.36', fulfillmentStatus: '库存不足', fulfillmentNote: '全网缺货，补货 ETA 06-08', weight: 120, requiresShipping: true },
      { id: 'li_074', sku: 'FAK-DLX-01', channelSku: 'SH-FAK-DLX-01', warehouseSku: 'WMS-FAK-DLX-01', title: 'First Aid Kit', variantTitle: 'Deluxe / 120-piece', quantity: 1, unit: '套', unitPrice: '$45.30', discount: '$2.00', tax: '$4.88', subtotal: '$48.18', fulfillmentStatus: '库存不足', fulfillmentNote: '等待 Headlamp 到货后合并发出', weight: 680, requiresShipping: true }
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
    refunds: [],
    events: [
      /* ─── 运营挂起 (最新) ─── */
      { id: 'evt_07_20', time: '2026-06-04 09:15:00', actor: 'Lisa Chen', actorRole: 'ops_manager', title: '订单挂起', description: '第二批履约单库存不足无法执行，等待补货 ETA 06-08，已通知客户', type: 'edit' },
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
    platformMeta: {
      'shopify_order_id': '5820173100801',
      'landing_site': '/collections/outdoor',
      'referring_site': 'https://instagram.com'
    }
  }
};

import { orderDetailsExtra } from './order-details-extra';

/** 合并所有订单详情 */
const allOrderDetails: Record<string, OrderDetail> = { ...orderDetails, ...orderDetailsExtra };

/** 根据 order id 获取详情，没有详细数据的订单返回 undefined */
export function getOrderDetail(id: string): OrderDetail | undefined {
  return allOrderDetails[id];
}
