import type { OrderDetail } from './order-details';

/**
 * 补充订单详情数据 — 覆盖所有状态场景
 * so_002: 处理中 / 已支付 / 已生成 (Shopify)
 * so_003: 保留 / 已支付 / 已暂停 / 地址无效 (Shopify UK)
 * so_004: 待处理 / 待确认 / 待履约 / 支付待确认 (Amazon)
 * so_005: 处理中 / 已支付 / 已生成 (TikTok Shop)
 * so_006: 待处理 / 已支付 / 待履约 (Shopify SG)
 * so_008: 已发货 / 已支付 / 已发货 (Shopify, 1单→2履约单, 1履约单→2出库单)
 * so_009: 已取消 / 已退款 / 已取消 (cancelled + full refund)
 * so_010: 已完成 / 已支付 / 已签收 (completed)
 * so_011: 已发货 / 已支付 / 已发货 (Amazon)
 * so_012: 已完成 / 已支付 / 已签收 (TikTok Shop UK)
 * so_013: 处理中 / 已支付 / 拣货中 (Shopify US, 多仓拆单)
 * so_014: 保留 / 已支付 / 已暂停 / 找不到仓库 (Shopify US, 新品未铺货)
 * so_015: 处理中 / 已支付 / 部分履约 (Shopify US, 3仓拆单)
 * so_016: 保留 / 已支付 / 部分履约 / 合规审查 (Amazon US, 部分发货+合规暂停)
 * so_017: 已发货 / 已支付 / 已发货 / 投递失败 (Shopify US, 物流异常)
 * so_018: 已完成 / 部分退款 / 已签收 (Shopify US, 商品瑕疵退款)
 */

export const orderDetailsExtra: Record<string, OrderDetail> = {
  /* ═══ so_002: 处理中 — 履约单已生成等待拣货 ═══ */
  so_002: {
    id: 'so_002',
    orderNo: 'SO-20260604-0002',
    platformOrderNo: '#SH-7291078',
    confirmationNumber: 'UQVCRCX02',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '处理中',
    financialStatus: '已支付',
    fulfillmentStatus: '已生成',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-04 15:07:22',
    updatedAt: '2026-06-04 15:45:00',
    currency: 'USD',
    subtotal: '$398.50',
    totalDiscount: '$0.00',
    totalShipping: '$18.00',
    totalTax: '$16.00',
    totalPrice: '$432.50',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_021', sku: 'SWB-SIL-M', title: 'Smart Watch Band', variantTitle: 'Silver / Medium', quantity: 2, unitPrice: '$49.00', discount: '$0.00', tax: '$7.84', subtotal: '$105.84', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 35, requiresShipping: true, channelSku: 'SH-SWB-SIL-M', warehouseSku: 'WMS-SWB-SIL-M', unit: '件' },
      { id: 'li_022', sku: 'SP-TG-IP15', title: 'Screen Protector', variantTitle: 'iPhone 15 / Tempered Glass', quantity: 2, unitPrice: '$15.00', discount: '$0.00', tax: '$2.40', subtotal: '$32.40', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 20, requiresShipping: true, channelSku: 'SH-SP-TG-IP15', warehouseSku: 'WMS-SP-TG-IP15', unit: '件' },
      { id: 'li_023', sku: 'CD-MG-WHT', title: 'Charging Dock', variantTitle: 'White / MagSafe', quantity: 1, unitPrice: '$89.50', discount: '$0.00', tax: '$5.76', subtotal: '$95.26', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 280, requiresShipping: true, channelSku: 'SH-CD-MG-WHT', warehouseSku: 'WMS-CD-MG-WHT', unit: '台' }
    ],
    customer: { name: 'Michael Brown', email: 'michael.b@example.com', phone: '+1 (310) 555-0234', ordersCount: 3, totalSpent: '$820.00', tags: ['electronics'], acceptsMarketing: true },
    shippingAddress: { name: 'Michael Brown', phone: '+1 (310) 555-0234', address1: '8500 Beverly Blvd', city: 'Los Angeles', province: 'CA', country: 'US', zip: '90048', formatted: '8500 Beverly Blvd, Los Angeles, CA 90048, US' },
    billingAddress: { name: 'Michael Brown', phone: '+1 (310) 555-0234', address1: '8500 Beverly Blvd', city: 'Los Angeles', province: 'CA', country: 'US', zip: '90048', formatted: '8500 Beverly Blvd, Los Angeles, CA 90048, US' },
    shippingMethod: 'UPS Ground (3-5 business days)',
    fulfillments: [
      {
        id: 'ful_021',
        status: 'in_progress',
        carrier: 'UPS',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260604-0021',
        outboundOrderNo: 'OB-20260604-0021',
        outboundStatus: '待拣货',
        lineItemIds: ['li_021', 'li_022', 'li_023'],
        warehouse: 'US-West-LAX',
        matchedRule: '就近发货策略',
        warehouseReason: '距 Los Angeles CA 90048 仅 8km，5 件商品库存充足'
      }
    ],
    transactions: [
      { id: 'txn_021', kind: 'sale', gateway: 'Stripe', method: 'Apple Pay (Visa ****1234)', amount: '$432.50', currency: 'USD', status: 'success', createdAt: '2026-06-04 15:07:45', gatewayReference: 'ch_4Rt9L3FK...', avsResult: 'Y', cvvResult: 'M' }
    ],
    refunds: [],
    events: [
      { id: 'evt_023f', time: '2026-06-04 15:48:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260604-0021 下发至仓库 US-West-LAX，进入拣货队列', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0021' },
      { id: 'evt_023e', time: '2026-06-04 15:45:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: '候选仓: US-West-LAX / US-West-SFO · 距 90048 距离评分 LAX=8km 最优 · 库存校验 5 件全部通过 · 选定 US-West-LAX', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260604-0021' },
      { id: 'evt_023d', time: '2026-06-04 15:42:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策', description: '总重量 335g · 命中规则「≤2kg标准快递」· 预选 UPS Ground (3-5 days)', type: 'fulfillment', ruleName: '承运商匹配规则' },
      { id: 'evt_023c', time: '2026-06-04 15:40:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: '标准时效 · 无加急需求 · 预计 3-5 个工作日送达', type: 'fulfillment', ruleName: '标准时效规则' },
      { id: 'evt_023b', time: '2026-06-04 15:38:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '5 件商品均为标品 · 同一区域仓有库存 · 合并为 1 个履约单', type: 'fulfillment', ruleName: '合单策略', fulfillmentOrderNo: 'FO-20260604-0021' },
      { id: 'evt_023a', time: '2026-06-04 15:36:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '5 件商品全部 requiresShipping=true · 支付已确认 · 风控 Low · 进入履约流', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_023', time: '2026-06-04 15:36:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260604-0021，包含 5 件商品', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0021' },
      { id: 'evt_022', time: '2026-06-04 15:07:45', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Apple Pay (Visa ****1234) 收款 $432.50', type: 'payment' },
      { id: 'evt_021', time: '2026-06-04 15:07:22', actor: 'Michael Brown', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (iOS) 提交', type: 'customer' }
    ],
    note: '',
    tags: [],
    platformMeta: { 'shopify_order_id': '5820173271078', 'landing_site': '/products/charging-dock', 'referring_site': 'https://youtube.com' }
  },

  /* ═══ so_003: 保留/挂起 — 地址无效，已暂停履约 ═══ */
  so_003: {
    id: 'so_003',
    orderNo: 'SO-20260604-0003',
    platformOrderNo: '#SH-7291092',
    confirmationNumber: 'UQVCRCX03',
    referenceNo: 'REF-UK-445',
    channel: 'Shopify',
    merchant: 'UK Store',
    sourceType: 'web',
    status: '保留',
    financialStatus: '已支付',
    fulfillmentStatus: '已暂停',
    riskLevel: 'medium',
    exception: '地址无效',
    createdAt: '2026-06-04 14:42:10',
    updatedAt: '2026-06-04 16:00:00',
    currency: 'GBP',
    subtotal: '£68.00',
    totalDiscount: '£0.00',
    totalShipping: '£5.80',
    totalTax: '£3.00',
    totalPrice: '£76.80',
    taxesIncluded: true,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_031', sku: 'YM-PRE-PUR', title: 'Yoga Mat Premium', variantTitle: 'Purple / 6mm', quantity: 1, unitPrice: '£45.00', discount: '£0.00', tax: '£2.00', subtotal: '£45.00', fulfillmentStatus: '已暂停', fulfillmentNote: '地址验证失败，等待客户确认', weight: 1200, requiresShipping: true, channelSku: 'SH-YM-PRE-PUR', warehouseSku: 'WMS-YM-PRE-PUR', unit: '张' },
      { id: 'li_032', sku: 'RB-SET-3PK', title: 'Resistance Bands Set', variantTitle: '3-Pack / Light-Medium-Heavy', quantity: 1, unitPrice: '£23.00', discount: '£0.00', tax: '£1.00', subtotal: '£23.00', fulfillmentStatus: '已暂停', fulfillmentNote: '地址验证失败，等待客户确认', weight: 350, requiresShipping: true, channelSku: 'SH-RB-SET-3PK', warehouseSku: 'WMS-RB-SET-3PK', unit: '套' }
    ],
    customer: { name: 'Sarah Williams', email: 'sarah.w@example.co.uk', phone: '+44 20 7946 0958', ordersCount: 1, totalSpent: '£76.80', tags: ['new-customer'], acceptsMarketing: false },
    shippingAddress: { name: 'Sarah Williams', phone: '+44 20 7946 0958', address1: '221B Baker St', city: 'London', province: '', country: 'GB', zip: 'NW1 6XE', formatted: '221B Baker St, London, NW1 6XE, GB' },
    billingAddress: { name: 'Sarah Williams', phone: '+44 20 7946 0958', address1: '221B Baker St', city: 'London', province: '', country: 'GB', zip: 'NW1 6XE', formatted: '221B Baker St, London, NW1 6XE, GB' },
    shippingMethod: 'Royal Mail Tracked 48',
    fulfillments: [],
    transactions: [
      { id: 'txn_031', kind: 'sale', gateway: 'Stripe', method: 'Visa ****7890', amount: '£76.80', currency: 'GBP', status: 'success', createdAt: '2026-06-04 14:42:35', gatewayReference: 'ch_9Uk3M2HL...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_037', time: '2026-06-04 16:00:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '订单保留 - 等待客户确认', description: '已发送地址确认邮件至 sarah.w@example.co.uk，等待客户48h内回复', type: 'edit' },
      { id: 'evt_036', time: '2026-06-04 15:55:00', actor: '履约引擎', actorRole: 'automation', title: '履约暂停', description: '地址验证异常，履约流程挂起，等待人工介入', type: 'fulfillment', ruleName: '地址异常暂停规则' },
      { id: 'evt_035', time: '2026-06-04 15:52:00', actor: '履约引擎', actorRole: 'automation', title: '地址验证失败', description: 'Royal Mail Address API 校验: postcode NW1 6XE 与 Baker St 不匹配 (期望 NW1 6XA) · 置信度 32% < 阈值 80%', type: 'fulfillment', ruleName: '地址校验规则' },
      { id: 'evt_034', time: '2026-06-04 15:50:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '2 件商品全部 requiresShipping=true · 支付已确认 · 风控 Medium (新客户) · 准入通过，进入地址校验', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_033', time: '2026-06-04 15:48:00', actor: '系统', actorRole: 'automation', title: '风控检查通过', description: 'Risk level: Medium (新客户首单) · 地址校验标记待验证', type: 'risk' },
      { id: 'evt_032', time: '2026-06-04 14:42:35', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****7890 收款 £76.80', type: 'payment' },
      { id: 'evt_031', time: '2026-06-04 14:42:10', actor: 'Sarah Williams', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' }
    ],
    note: '地址可能填错了，客服已发邮件确认',
    tags: ['address-issue', 'hold'],
    platformMeta: { 'shopify_order_id': '5820173271092', 'browser_ip': '82.132.215.100' }
  },

  /* ═══ so_004: Amazon 支付待确认 ═══ */
  so_004: {
    id: 'so_004',
    orderNo: 'SO-20260603-0004',
    platformOrderNo: '#AMZ-30482837',
    confirmationNumber: '',
    referenceNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    sourceType: 'marketplace',
    status: '待处理',
    financialStatus: '待确认',
    fulfillmentStatus: '待履约',
    riskLevel: 'high',
    exception: '支付待确认',
    createdAt: '2026-06-03 22:15:44',
    updatedAt: '2026-06-04 08:00:00',
    currency: 'USD',
    subtotal: '$79.99',
    totalDiscount: '$0.00',
    totalShipping: '$5.00',
    totalTax: '$5.00',
    totalPrice: '$89.99',
    taxesIncluded: false,
    paymentGateway: 'Amazon Pay',
    discountCodes: [],
    lineItems: [
      { id: 'li_041', sku: 'BT-SPK-MINI', title: 'Bluetooth Speaker Mini', variantTitle: 'Black / IPX7', quantity: 1, unitPrice: '$79.99', discount: '$0.00', tax: '$5.00', subtotal: '$84.99', fulfillmentStatus: '待履约', fulfillmentNote: '等待生成履约单', weight: 320, requiresShipping: true, platformLineItemId: 'amz_li_30482837_1', channelSku: 'AMZ-BT-SPK-MINI', warehouseSku: 'WMS-BT-SPK-MINI', unit: '台' }
    ],
    customer: { name: 'James Wilson', email: 'j.wilson@example.com', phone: '', ordersCount: 1, totalSpent: '$89.99', tags: [], acceptsMarketing: false },
    shippingAddress: { name: 'James Wilson', phone: '+1 (312) 555-0177', address1: '233 S Wacker Dr, Suite 1200', city: 'Chicago', province: 'IL', country: 'US', zip: '60606', formatted: '233 S Wacker Dr, Suite 1200, Chicago, IL 60606, US' },
    billingAddress: { name: 'James Wilson', phone: '+1 (312) 555-0177', address1: '233 S Wacker Dr, Suite 1200', city: 'Chicago', province: 'IL', country: 'US', zip: '60606', formatted: '233 S Wacker Dr, Suite 1200, Chicago, IL 60606, US' },
    shippingMethod: 'Amazon Standard Shipping (MFN)',
    fulfillments: [],
    transactions: [
      { id: 'txn_041', kind: 'authorization', gateway: 'Amazon Pay', method: 'Amazon Pay', amount: '$89.99', currency: 'USD', status: 'pending', createdAt: '2026-06-03 22:15:50' }
    ],
    refunds: [],
    events: [
      { id: 'evt_042', time: '2026-06-04 08:00:00', actor: '系统', actorRole: 'automation', title: '支付确认超时告警', description: 'Amazon Pay 授权超过 12h 未完成 capture，需人工检查', type: 'risk' },
      { id: 'evt_041', time: '2026-06-03 22:15:44', actor: 'James Wilson', actorRole: 'customer', title: '订单创建', description: '通过 Amazon Marketplace 下单 (MFN)', type: 'customer' }
    ],
    note: '',
    tags: ['payment-pending', 'amazon-mfn'],
    platformMeta: { 'amazon_order_id': '114-3941689-8772232', 'fulfillment_channel': 'MFN', 'ship_service_level': 'Standard' }
  },

  /* ═══ so_005: TikTok Shop 处理中 ═══ */
  so_005: {
    id: 'so_005',
    orderNo: 'SO-20260603-0005',
    platformOrderNo: '#TK-8827163',
    confirmationNumber: '',
    referenceNo: '',
    channel: 'TikTok Shop',
    merchant: 'US Store',
    sourceType: 'social_commerce',
    status: '处理中',
    financialStatus: '已支付',
    fulfillmentStatus: '已生成',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-03 20:15:08',
    updatedAt: '2026-06-04 10:30:00',
    currency: 'USD',
    subtotal: '$139.00',
    totalDiscount: '$0.00',
    totalShipping: '$9.00',
    totalTax: '$8.00',
    totalPrice: '$156.00',
    taxesIncluded: false,
    paymentGateway: 'TikTok Payment',
    discountCodes: [],
    lineItems: [
      { id: 'li_051', sku: 'LRL-10IN', title: 'LED Ring Light', variantTitle: '10 inch / Dimmable', quantity: 1, unitPrice: '$69.00', discount: '$0.00', tax: '$4.00', subtotal: '$73.00', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 680, requiresShipping: true, channelSku: 'TK-LRL-10IN', warehouseSku: 'WMS-LRL-10IN', unit: '件' },
      { id: 'li_052', sku: 'PT-FLEX-55', title: 'Phone Tripod', variantTitle: 'Flexible / 55cm', quantity: 1, unitPrice: '$35.00', discount: '$0.00', tax: '$2.00', subtotal: '$37.00', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 420, requiresShipping: true, channelSku: 'TK-PT-FLEX-55', warehouseSku: 'WMS-PT-FLEX-55', unit: '件' },
      { id: 'li_053', sku: 'SS-BT-BLK', title: 'Selfie Stick', variantTitle: 'Black / Bluetooth', quantity: 1, unitPrice: '$35.00', discount: '$0.00', tax: '$2.00', subtotal: '$37.00', fulfillmentStatus: '已生成', fulfillmentNote: '履约单已生成，等待拣货', weight: 195, requiresShipping: true, channelSku: 'TK-SS-BT-BLK', warehouseSku: 'WMS-SS-BT-BLK', unit: '件' }
    ],
    customer: { name: 'Maria Garcia', email: 'maria.g@example.com', phone: '+1 (305) 555-0289', ordersCount: 2, totalSpent: '$312.00', tags: ['tiktok-buyer', 'content-creator'], acceptsMarketing: true },
    shippingAddress: { name: 'Maria Garcia', phone: '+1 (305) 555-0289', address1: '1100 Biscayne Blvd, Apt 2204', city: 'Miami', province: 'FL', country: 'US', zip: '33132', formatted: '1100 Biscayne Blvd, Apt 2204, Miami, FL 33132, US' },
    billingAddress: { name: 'Maria Garcia', phone: '+1 (305) 555-0289', address1: '1100 Biscayne Blvd, Apt 2204', city: 'Miami', province: 'FL', country: 'US', zip: '33132', formatted: '1100 Biscayne Blvd, Apt 2204, Miami, FL 33132, US' },
    shippingMethod: 'TikTok Standard Shipping (3-5 days)',
    fulfillments: [
      { id: 'ful_051', status: 'in_progress', carrier: 'USPS', trackingNumber: '', fulfillmentOrderNo: 'FO-20260603-0051', outboundOrderNo: 'OB-20260603-0051', outboundStatus: '待拣货', lineItemIds: ['li_051', 'li_052', 'li_053'], warehouse: 'US-East-MIA', matchedRule: '就近发货策略', warehouseReason: '距 Miami FL 12km 最近，3 件商品库存充足' }
    ],
    transactions: [
      { id: 'txn_051', kind: 'sale', gateway: 'TikTok Payment', method: 'Credit Card ****5566', amount: '$156.00', currency: 'USD', status: 'success', createdAt: '2026-06-03 20:15:30' }
    ],
    refunds: [],
    events: [
      { id: 'evt_059', time: '2026-06-04 10:35:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260603-0051 下发至仓库 US-East-MIA，等待拣货', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_058', time: '2026-06-04 10:33:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260603-0051，包含 3 件商品', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_057', time: '2026-06-04 10:30:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: '候选仓: US-East-MIA(12km) / US-East-ATL(960km) · 距 Miami FL 33132 距离评分 MIA=98分 最优 · 库存校验: Ring Light×1✓ Tripod×1✓ Selfie Stick×1✓ · 选定 US-East-MIA', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_056', time: '2026-06-04 10:28:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策', description: '总重量 1,295g (≤2kg) · TikTok Shop 渠道标准快递规则 · 时效 3-5 天匹配 USPS Priority Mail · 运费 $9.00 合理区间', type: 'fulfillment', ruleName: '承运商匹配规则', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_055', time: '2026-06-04 10:26:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: 'TikTok Shop 标准时效 3-5 个工作日 · 客户无加急需求 · 平台 SLA 5 天内发出 · 常规优先级处理', type: 'fulfillment', ruleName: 'TikTok标准时效规则', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_054', time: '2026-06-04 10:24:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '3 件商品 (LRL-10IN, PT-FLEX-55, SS-BT-BLK) 同属小件轻量品类 · US-East-MIA 库存充足 · 总重未超包裹限制 · 合并为 1 个履约单', type: 'fulfillment', ruleName: '合单策略', fulfillmentOrderNo: 'FO-20260603-0051' },
      { id: 'evt_053', time: '2026-06-04 10:22:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '3 件商品全部 requiresShipping=true · 支付已确认 (TikTok Payment $156.00) · 风控 Low · 地址校验通过 · 准入通过，进入决策流', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_052', time: '2026-06-03 20:15:30', actor: 'TikTok Payment', actorRole: 'payment_gateway', title: '支付成功', description: 'Credit Card ****5566 收款 $156.00', type: 'payment' },
      { id: 'evt_051', time: '2026-06-03 20:15:08', actor: 'Maria Garcia', actorRole: 'customer', title: '订单创建', description: '通过 TikTok Shop 直播间下单，来源: @mariag_live 直播间', type: 'customer' }
    ],
    note: '',
    tags: ['tiktok', 'livestream-order'],
    platformMeta: { 'tiktok_order_id': 'TK-8827163', 'tiktok_shop_id': 'us_shop_001', 'source': 'live_stream' }
  },

  /* ═══ so_006: 新加坡 Shopify 待处理 ═══ */
  so_006: {
    id: 'so_006',
    orderNo: 'SO-20260603-0006',
    platformOrderNo: '#SH-7290856',
    confirmationNumber: 'SGORD0006',
    referenceNo: 'SGPO-0091',
    channel: 'Shopify',
    merchant: 'SG Store',
    sourceType: 'web',
    status: '待处理',
    financialStatus: '已支付',
    fulfillmentStatus: '待履约',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-03 18:33:55',
    updatedAt: '2026-06-03 18:35:00',
    currency: 'SGD',
    subtotal: 'S$268.00',
    totalDiscount: 'S$0.00',
    totalShipping: 'S$12.00',
    totalTax: 'S$18.00',
    totalPrice: 'S$298.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_061', sku: 'DO-BM-NAT', title: 'Desk Organizer', variantTitle: 'Bamboo / Natural', quantity: 1, unitPrice: 'S$89.00', discount: 'S$0.00', tax: 'S$5.00', subtotal: 'S$94.00', fulfillmentStatus: '待履约', fulfillmentNote: '等待生成履约单', weight: 1500, requiresShipping: true, channelSku: 'SH-DO-BM-NAT', warehouseSku: 'WMS-DO-BM-NAT', unit: '件' },
      { id: 'li_062', sku: 'MS-ALM-SLV', title: 'Monitor Stand', variantTitle: 'Aluminum / Silver', quantity: 1, unitPrice: 'S$129.00', discount: 'S$0.00', tax: 'S$9.00', subtotal: 'S$138.00', fulfillmentStatus: '待履约', fulfillmentNote: '等待生成履约单', weight: 2200, requiresShipping: true, channelSku: 'SH-MS-ALM-SLV', warehouseSku: 'WMS-MS-ALM-SLV', unit: '台' },
      { id: 'li_063', sku: 'CC-6PK-BLK', title: 'Cable Clips', variantTitle: 'Black / 6-Pack', quantity: 1, unitPrice: 'S$15.00', discount: 'S$0.00', tax: 'S$1.00', subtotal: 'S$16.00', fulfillmentStatus: '待履约', fulfillmentNote: '等待生成履约单', weight: 45, requiresShipping: true, channelSku: 'SH-CC-6PK-BLK', warehouseSku: 'WMS-CC-6PK-BLK', unit: '件' },
      { id: 'li_064', sku: 'MP-XL-GRY', title: 'Mouse Pad XL', variantTitle: 'Grey / 90×40cm', quantity: 1, unitPrice: 'S$35.00', discount: 'S$0.00', tax: 'S$3.00', subtotal: 'S$38.00', fulfillmentStatus: '待履约', fulfillmentNote: '等待生成履约单', weight: 320, requiresShipping: true, channelSku: 'SH-MP-XL-GRY', warehouseSku: 'WMS-MP-XL-GRY', unit: '张' }
    ],
    customer: { name: 'Lisa Chen', email: 'lisa.chen@example.sg', phone: '+65 9123 4567', ordersCount: 8, totalSpent: 'S$2,140.00', tags: ['loyal', 'office-gear'], acceptsMarketing: true },
    shippingAddress: { name: 'Lisa Chen', company: 'TechPulse Pte Ltd', phone: '+65 9123 4567', address1: '1 Raffles Place, #28-01', city: 'Singapore', province: '', country: 'SG', zip: '048616', formatted: '1 Raffles Place, #28-01, Singapore 048616, SG' },
    billingAddress: { name: 'Lisa Chen', company: 'TechPulse Pte Ltd', phone: '+65 9123 4567', address1: '1 Raffles Place, #28-01', city: 'Singapore', province: '', country: 'SG', zip: '048616', formatted: '1 Raffles Place, #28-01, Singapore 048616, SG' },
    shippingMethod: 'Ninja Van Standard (1-3 business days)',
    fulfillments: [],
    transactions: [
      { id: 'txn_061', kind: 'sale', gateway: 'Stripe', method: 'Visa ****3344', amount: 'S$298.00', currency: 'SGD', status: 'success', createdAt: '2026-06-03 18:34:10', gatewayReference: 'ch_6Sg8N2PQ...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_062', time: '2026-06-03 18:35:00', actor: '系统', actorRole: 'automation', title: '订单确认', description: '风控通过，进入待处理队列', type: 'system' },
      { id: 'evt_061', time: '2026-06-03 18:33:55', actor: 'Lisa Chen', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' }
    ],
    note: '请放在前台，谢谢',
    tags: ['b2b', 'singapore'],
    platformMeta: { 'shopify_order_id': '5820173270856', 'landing_site': '/collections/desk-setup' }
  },

  /* ═══ so_008: 已发货 — 1单→2履约单, 1履约单→2出库单 (多层拆单示例) ═══ */
  so_008: {
    id: 'so_008',
    orderNo: 'SO-20260602-0008',
    platformOrderNo: '#SH-7290712',
    confirmationNumber: 'WHLORD0008',
    referenceNo: 'WHL-2024-112',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '已发货',
    financialStatus: '已支付',
    fulfillmentStatus: '已发货',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-02 09:15:30',
    updatedAt: '2026-06-03 14:00:00',
    currency: 'USD',
    subtotal: '$1,142.00',
    totalDiscount: '$50.00',
    totalShipping: '$48.00',
    totalTax: '$100.00',
    totalPrice: '$1,240.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [{ code: 'OFFICE20', type: 'fixed_amount', amount: '$50.00' }],
    lineItems: [
      { id: 'li_081', sku: 'OC-ERG-BLK', title: 'Office Chair Ergonomic', variantTitle: 'Black / Mesh / Lumbar Support', quantity: 1, unitPrice: '$399.00', discount: '$20.00', tax: '$30.32', subtotal: '$409.32', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-03-OC', serialNumbers: ['SN-OC-ERG-20260301-0042'], weight: 18000, requiresShipping: true, channelSku: 'SH-OC-ERG-BLK', warehouseSku: 'WMS-OC-ERG-BLK', unit: '把' },
      { id: 'li_082', sku: 'SD-FRM-WHT', title: 'Standing Desk Frame', variantTitle: 'White / Electric / 120cm', quantity: 1, unitPrice: '$349.00', discount: '$15.00', tax: '$26.72', subtotal: '$360.72', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-02-SD', serialNumbers: ['SN-SD-FRM-20260215-0189'], weight: 32000, requiresShipping: true, channelSku: 'SH-SD-FRM-WHT', warehouseSku: 'WMS-SD-FRM-WHT', unit: '台' },
      { id: 'li_083', sku: 'MA-DL-BLK', title: 'Monitor Arm', variantTitle: 'Dual / Black / Gas Spring', quantity: 2, unitPrice: '$89.00', discount: '$5.00', tax: '$13.84', subtotal: '$185.84', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-04-MA', serialNumbers: ['SN-MA-DL-20260410-0331', 'SN-MA-DL-20260410-0332'], weight: 4200, requiresShipping: true, channelSku: 'SH-MA-DL-BLK', warehouseSku: 'WMS-MA-DL-BLK', unit: '件' },
      { id: 'li_084', sku: 'DM-FL-GRY', title: 'Desk Mat', variantTitle: 'Grey / 80×40 / Felt', quantity: 1, unitPrice: '$35.00', discount: '$0.00', tax: '$2.80', subtotal: '$37.80', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 450, requiresShipping: true, channelSku: 'SH-DM-FL-GRY', warehouseSku: 'WMS-DM-FL-GRY', unit: '张' },
      { id: 'li_085', sku: 'KT-SLD-OAK', title: 'Keyboard Tray', variantTitle: 'Oak / Slide-out', quantity: 1, unitPrice: '$65.00', discount: '$5.00', tax: '$4.80', subtotal: '$64.80', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 1800, requiresShipping: true, channelSku: 'SH-KT-SLD-OAK', warehouseSku: 'WMS-KT-SLD-OAK', unit: '件' },
      { id: 'li_086', sku: 'CT-UND-BLK', title: 'Cable Tray', variantTitle: 'Under-desk / Black / 60cm', quantity: 1, unitPrice: '$29.00', discount: '$3.00', tax: '$2.08', subtotal: '$28.08', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 600, requiresShipping: true, channelSku: 'SH-CT-UND-BLK', warehouseSku: 'WMS-CT-UND-BLK', unit: '件' },
      { id: 'li_087', sku: 'FR-MEM-BLK', title: 'Foot Rest', variantTitle: 'Memory Foam / Adjustable', quantity: 1, unitPrice: '$45.00', discount: '$2.00', tax: '$3.44', subtotal: '$46.44', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 900, requiresShipping: true, channelSku: 'SH-FR-MEM-BLK', warehouseSku: 'WMS-FR-MEM-BLK', unit: '件' }
    ],
    customer: { name: 'David Lee', email: 'david.lee@example.com', phone: '+1 (617) 555-0321', ordersCount: 2, totalSpent: '$1,680.00', tags: ['wholesale', 'office-setup'], acceptsMarketing: true },
    shippingAddress: { name: 'David Lee', company: 'Lee Consulting LLC', phone: '+1 (617) 555-0321', address1: '100 Summer St, Floor 12', city: 'Boston', province: 'MA', country: 'US', zip: '02110', formatted: '100 Summer St, Floor 12, Boston, MA 02110, US' },
    billingAddress: { name: 'David Lee', company: 'Lee Consulting LLC', phone: '+1 (617) 555-0321', address1: '100 Summer St, Floor 12', city: 'Boston', province: 'MA', country: 'US', zip: '02110', formatted: '100 Summer St, Floor 12, Boston, MA 02110, US' },
    shippingMethod: 'Freight LTL + UPS Ground (Mixed)',
    fulfillments: [
      {
        id: 'ful_081a',
        status: 'in_transit',
        carrier: 'XPO Logistics',
        trackingNumber: 'XPO-392847102',
        trackingUrl: 'https://track.xpo.com/XPO-392847102',
        masterTrackingNo: 'XPO-MASTER-BOS-0602',
        bolNumber: 'BOL-XPO-20260603-001',
        proNumber: 'PRO-8847291',
        shippingMode: 'ltl',
        serviceLevel: 'XPO White Glove Delivery',
        fulfillmentOrderNo: 'FO-20260602-0081',
        outboundOrderNo: 'OB-20260602-0081A',
        outboundStatus: '已出库',
        packageNo: 'PKG-081-A1',
        packageCount: 1,
        totalWeight: '18.0 kg',
        dimensions: '110×75×65 cm',
        lineItemIds: ['li_081'],
        shippedAt: '2026-06-03 14:00',
        estimatedDelivery: '2026-06-06',
        warehouse: 'US-East-BOS',
        matchedRule: '超大件单独发货 + LTL',
        warehouseReason: 'Office Chair 18kg 超大件，需独立包装单独发运'
      },
      {
        id: 'ful_081b',
        status: 'in_transit',
        carrier: 'XPO Logistics',
        trackingNumber: 'XPO-392847103',
        trackingUrl: 'https://track.xpo.com/XPO-392847103',
        masterTrackingNo: 'XPO-MASTER-BOS-0602',
        bolNumber: 'BOL-XPO-20260603-001',
        proNumber: 'PRO-8847292',
        shippingMode: 'ltl',
        serviceLevel: 'XPO LTL Pallet (White Glove)',
        fulfillmentOrderNo: 'FO-20260602-0081',
        outboundOrderNo: 'OB-20260602-0081B',
        outboundStatus: '已出库',
        packageNo: 'PKG-081-A2',
        packageCount: 2,
        palletNo: 'PLT-2026-0602',
        palletCount: 1,
        totalWeight: '40.4 kg',
        dimensions: '托盘 120×100×85 cm',
        lineItemIds: ['li_082', 'li_083'],
        shippedAt: '2026-06-03 15:00',
        estimatedDelivery: '2026-06-06',
        warehouse: 'US-East-BOS',
        matchedRule: '大件托盘发货 + LTL',
        warehouseReason: 'Standing Desk Frame 32kg + Monitor Arm ×2 8.4kg 上托盘合并发运'
      },
      {
        id: 'ful_082',
        status: 'in_transit',
        carrier: 'UPS',
        trackingNumber: '1Z999AA10456789012',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10456789012',
        shippingMode: 'parcel',
        serviceLevel: 'UPS Ground (2-3 business days)',
        fulfillmentOrderNo: 'FO-20260602-0082',
        outboundOrderNo: 'OB-20260602-0082',
        outboundStatus: '已出库',
        packageNo: 'PKG-082-A',
        packageCount: 1,
        totalWeight: '3.75 kg',
        dimensions: '45×35×30 cm',
        lineItemIds: ['li_084', 'li_085', 'li_086', 'li_087'],
        shippedAt: '2026-06-03 12:00',
        estimatedDelivery: '2026-06-05',
        warehouse: 'US-East-BOS',
        matchedRule: '标准件合包 + UPS Ground',
        warehouseReason: '4 件标品总重 3.75kg，标准包裹 UPS Ground 发运'
      }
    ],
    transactions: [
      { id: 'txn_081', kind: 'sale', gateway: 'Stripe', method: 'Amex ****1001', amount: '$1,240.00', currency: 'USD', status: 'success', createdAt: '2026-06-02 09:16:02', gatewayReference: 'ch_8Bx5Q3RT...' }
    ],
    refunds: [],
    events: [
      /* ─── FO-0082 出库执行 (标准件) ─── */
      { id: 'evt_08_30', time: '2026-06-03 12:00:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260602-0082 交接 UPS · 4 件标品(Desk Mat+Keyboard Tray+Cable Tray+Foot Rest)', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_29', time: '2026-06-03 11:00:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '打包完成 (FO-0082)', description: '4 件标品打包完成 · 包裹重量 3.75kg · 标准纸箱 · 等待 UPS 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_28', time: '2026-06-03 10:00:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '拣货验货完成 (FO-0082)', description: '出库单 OB-20260602-0082 拣货 4 件 (Desk Mat+Keyboard Tray+Cable Tray+Foot Rest)，验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0082' },
      /* ─── FO-0081 出库执行 (大件 → 拆为 2 个出库单) ─── */
      { id: 'evt_08_27', time: '2026-06-03 15:00:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '出库交接完成 (OB-0081B)', description: '出库单 OB-20260602-0081B 交接 XPO · Standing Desk Frame + Monitor Arm ×2 上托盘 PLT-2026-0602', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_26', time: '2026-06-03 14:00:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '出库交接完成 (OB-0081A)', description: '出库单 OB-20260602-0081A 交接 XPO · Office Chair 超大件独立包装', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_25', time: '2026-06-03 11:30:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '打包完成 (FO-0081)', description: 'OB-0081A: Chair 独立包装 18kg · OB-0081B: Desk Frame + Arms 上托盘 40.4kg · 等待 XPO 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_24', time: '2026-06-03 09:30:00', actor: 'US-East-BOS', actorRole: 'warehouse_staff', title: '拣货验货完成 (FO-0081)', description: '出库单 OB-0081A + OB-0081B 合计拣货 4 件 (Chair×1 + Desk Frame×1 + Monitor Arm×2)，验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0081' },
      /* ─── 出库单生成 ─── */
      { id: 'evt_08_23', time: '2026-06-03 08:30:00', actor: '系统', actorRole: 'automation', title: '出库单已生成 (FO-0082)', description: '出库单 OB-20260602-0082 下发至仓库 US-East-BOS · 4 件标品', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_22', time: '2026-06-03 08:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成 (FO-0081 → 拆2单)', description: '出库单 OB-20260602-0081A (Chair单独) + OB-20260602-0081B (Desk Frame + Arms托盘) 下发至 US-East-BOS', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0081' },
      /* ─── 出库拆单决策 (FO-0081 内部拆为 2 个出库单) ─── */
      { id: 'evt_08_21', time: '2026-06-02 13:20:00', actor: '履约引擎', actorRole: 'automation', title: '出库拆单决策 (FO-0081)', description: 'FO-0081 含 4 件大件: Chair(18kg 超大件) + Desk Frame(32kg) + Monitor Arm×2(8.4kg) · Chair 超大件尺寸 110×75×65cm 需独立包装 · Desk Frame + Arms 可合并上托盘 · 拆为 OB-0081A(Chair单独) + OB-0081B(Desk+Arms托盘)', type: 'fulfillment', ruleName: '超大件独立出库规则', fulfillmentOrderNo: 'FO-20260602-0081' },
      /* ─── FO-0082 决策链 (标准件) ─── */
      { id: 'evt_08_20', time: '2026-06-02 13:00:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-0082)', description: 'FO-20260602-0082: 候选仓 US-East-BOS(3.2km) · 4 件标品库存: Desk Mat✓ Keyboard Tray✓ Cable Tray✓ Foot Rest✓ · 选定 US-East-BOS', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_19', time: '2026-06-02 12:55:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策 (FO-0082)', description: 'FO-0082: 总重量 3.75kg (≤5kg标品) · 命中规则「标品UPS Ground」· 时效 2-3 天', type: 'fulfillment', ruleName: '标品承运商规则', fulfillmentOrderNo: 'FO-20260602-0082' },
      /* ─── FO-0081 决策链 (大件/重件) ─── */
      { id: 'evt_08_18', time: '2026-06-02 12:50:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-0081)', description: 'FO-20260602-0081: 候选仓 US-East-BOS(3.2km) / US-East-EWR(350km) · 距离评分 BOS=99分 · 库存: Chair×1✓ Desk Frame×1✓ Monitor Arm×2✓ · 选定 US-East-BOS', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_17', time: '2026-06-02 12:45:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策 (FO-0081)', description: 'FO-0081: 总重量 62.4kg (Chair 18kg + Desk Frame 32kg + Arms 8.4kg) 命中规则「超30kg走LTL」· 匹配 XPO Logistics White Glove', type: 'fulfillment', ruleName: '承运商匹配规则', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_16', time: '2026-06-02 12:40:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: '客户备注要求白手套送货 · 大件 LTL 预计 3 工作日 · 标品 UPS Ground 2-3 天 · 均在合理时效内', type: 'fulfillment', ruleName: '大件配送时效' },
      /* ─── 拆合单决策 (SO → 2 个 FO) ─── */
      { id: 'evt_08_15', time: '2026-06-02 12:30:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '8 件商品(含 Monitor Arm×2) 按尺寸/重量分类: 大件重件(Chair 18kg + Desk Frame 32kg + Monitor Arm×2 8.4kg = 58.4kg) vs 标品轻件(Desk Mat + Keyboard Tray + Cable Tray + Foot Rest = 3.75kg) · 命中规则「大件/标品分流」· 拆为 2 个履约单: FO-0081(大件freight) + FO-0082(标品parcel)', type: 'fulfillment', ruleName: '大件/标品分流策略' },
      { id: 'evt_08_14', time: '2026-06-02 12:28:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '拆分生成 2 个履约单: FO-20260602-0081 (大件freight, 4件) + FO-20260602-0082 (标品parcel, 4件)', type: 'fulfillment' },
      /* ─── 履约准入 ─── */
      { id: 'evt_08_13', time: '2026-06-02 12:25:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '8 件商品(含 Monitor Arm×2) 全部 requiresShipping=true · 总重 62.15kg · 风控 Low · 支付已确认 ($1,240.00) · 进入拆合单决策', type: 'fulfillment', ruleName: '履约准入规则' },
      /* ─── 支付 + 创建 ─── */
      { id: 'evt_08_02', time: '2026-06-02 09:16:02', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Amex ****1001 收款 $1,240.00', type: 'payment' },
      { id: 'evt_08_01', time: '2026-06-02 09:15:30', actor: 'David Lee', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交 (B2B)', type: 'customer' },
      /* ─── 物流跟踪: OB-0081A (XPO, Chair) ─── */
      { id: 'evt_08_l1a1', time: '2026-06-03 14:10:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '揽收成功 (Chair)', description: '司机已取件 · OB-0081A Office Chair · 发货仓 US-East-BOS · 跟踪号 XPO-392847102', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_l1a2', time: '2026-06-03 23:00:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '到达转运中心 (Chair)', description: '到达 Hartford CT 转运中心，超大件分拣区', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_l1a3', time: '2026-06-05 07:00:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '到达配送站 (Chair)', description: '到达 Boston MA 配送站 · 预约白手套送货', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260602-0081' },
      /* ─── 物流跟踪: OB-0081B (XPO, Desk+Arms) ─── */
      { id: 'evt_08_l1b1', time: '2026-06-03 15:10:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '揽收成功 (Desk+Arms)', description: '司机已取件 · OB-0081B 托盘 PLT-2026-0602 · Standing Desk Frame + Monitor Arm ×2 · 跟踪号 XPO-392847103', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_l1b2', time: '2026-06-04 02:00:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '到达转运中心 (Desk+Arms)', description: '托盘到达 Hartford CT 转运中心，LTL 货物区', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0081' },
      { id: 'evt_08_l1b3', time: '2026-06-05 08:00:00', actor: 'XPO Logistics', actorRole: 'carrier', title: '到达配送站 (Desk+Arms)', description: '托盘到达 Boston MA 配送站 · 预约白手套送货 · 预计与 Chair 同日配送', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260602-0081' },
      /* ─── 物流跟踪: OB-0082 (UPS, 标品) ─── */
      { id: 'evt_08_l2a1', time: '2026-06-03 12:15:00', actor: 'UPS', actorRole: 'carrier', title: '揽收成功 (标品)', description: '包裹已取件 · OB-0082 标品 4 件 · 发货仓 US-East-BOS · 跟踪号 1Z999AA10456789012', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_l2a2', time: '2026-06-03 19:00:00', actor: 'UPS', actorRole: 'carrier', title: '到达转运中心 (标品)', description: '到达 Boston MA UPS Hub，进行分拣', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_l2a3', time: '2026-06-04 06:00:00', actor: 'UPS', actorRole: 'carrier', title: '运输中 (标品)', description: '离开 Boston Hub，发往目的地配送站', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0082' },
      { id: 'evt_08_l2a4', time: '2026-06-04 14:00:00', actor: 'UPS', actorRole: 'carrier', title: '到达配送站 (标品)', description: '到达 Boston Downtown 配送站 · 预计明日配送 100 Summer St', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260602-0082' }
    ],
    note: '需要白手套送货上门服务，送到 12 楼前台',
    tags: ['b2b', 'freight', 'white-glove', 'multi-fulfillment'],
    platformMeta: { 'shopify_order_id': '5820173270712', 'landing_site': '/pages/office-bundle', 'referring_site': 'https://linkedin.com' }
  },

  /* ═══ so_009: 已取消 + 全额退款 ═══ */
  so_009: {
    id: 'so_009',
    orderNo: 'SO-20260602-0009',
    platformOrderNo: '#SH-7290698',
    confirmationNumber: 'UKORD0009',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'UK Store',
    sourceType: 'web',
    status: '已取消',
    financialStatus: '已退款',
    fulfillmentStatus: '已取消',
    riskLevel: 'low',
    exception: '客户取消',
    createdAt: '2026-06-02 08:45:12',
    updatedAt: '2026-06-02 12:30:00',
    cancelledAt: '2026-06-02 10:15:00',
    currency: 'GBP',
    subtotal: '£38.00',
    totalDiscount: '£0.00',
    totalShipping: '£4.00',
    totalTax: '£3.00',
    totalPrice: '£45.00',
    taxesIncluded: true,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_091', sku: 'SC-SET-LAV', title: 'Scented Candle Set', variantTitle: 'Lavender & Vanilla / 3-Pack', quantity: 1, unitPrice: '£38.00', discount: '£0.00', tax: '£3.00', subtotal: '£38.00', fulfillmentStatus: '已取消', fulfillmentNote: '客户取消，已退款', weight: 850, requiresShipping: true, channelSku: 'SH-SC-SET-LAV', warehouseSku: 'WMS-SC-SET-LAV', unit: '套' }
    ],
    customer: { name: 'Anna Schmidt', email: 'anna.s@example.co.uk', phone: '+44 161 555 0432', ordersCount: 4, totalSpent: '£320.00', tags: ['returning'], acceptsMarketing: true },
    shippingAddress: { name: 'Anna Schmidt', phone: '+44 161 555 0432', address1: '15 Deansgate', city: 'Manchester', province: '', country: 'GB', zip: 'M3 4EN', formatted: '15 Deansgate, Manchester, M3 4EN, GB' },
    billingAddress: { name: 'Anna Schmidt', phone: '+44 161 555 0432', address1: '15 Deansgate', city: 'Manchester', province: '', country: 'GB', zip: 'M3 4EN', formatted: '15 Deansgate, Manchester, M3 4EN, GB' },
    shippingMethod: 'Royal Mail 1st Class',
    fulfillments: [],
    transactions: [
      { id: 'txn_091', kind: 'sale', gateway: 'Stripe', method: 'Visa ****6677', amount: '£45.00', currency: 'GBP', status: 'success', createdAt: '2026-06-02 08:45:30' },
      { id: 'txn_092', kind: 'refund', gateway: 'Stripe', method: 'Visa ****6677', amount: '£45.00', currency: 'GBP', status: 'success', createdAt: '2026-06-02 12:30:00', gatewayReference: 're_2Kp4X1YZ...' }
    ],
    refunds: [
      { id: 'ref_091', reason: '客户主动取消', amount: '£45.00', lineItems: [{ lineItemId: 'li_091', quantity: 1 }], createdAt: '2026-06-02 12:30:00', note: '客户来电表示重复下单，全额退款' }
    ],
    events: [
      { id: 'evt_098', time: '2026-06-02 12:30:00', actor: '系统', actorRole: 'automation', title: '退款完成', description: '全额退款 £45.00 至 Visa ****6677，预计 3-5 工作日到账', type: 'payment' },
      { id: 'evt_097', time: '2026-06-02 10:20:00', actor: '履约引擎', actorRole: 'automation', title: '履约流中止', description: '收到取消指令，履约流程终止，未生成出库单，无需拦截', type: 'fulfillment', ruleName: '取消中止规则' },
      { id: 'evt_096', time: '2026-06-02 10:15:00', actor: 'Amy Support', actorRole: 'cs_agent', title: '订单取消', description: '客户来电要求取消（重复下单），已确认取消并触发退款流程', type: 'edit' },
      { id: 'evt_095', time: '2026-06-02 09:30:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '1 件商品 requiresShipping=true · 支付已确认 (Stripe £45.00) · 风控 Low · 准入通过，进入决策队列', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_094', time: '2026-06-02 09:28:00', actor: '系统', actorRole: 'automation', title: '风控检查通过', description: 'Risk level: Low · 老客户第4单 · 无异常标记', type: 'risk' },
      { id: 'evt_092', time: '2026-06-02 08:45:30', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****6677 收款 £45.00', type: 'payment' },
      { id: 'evt_091', time: '2026-06-02 08:45:12', actor: 'Anna Schmidt', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' }
    ],
    note: '客户来电取消，原因：重复下单',
    tags: ['cancelled', 'refunded'],
    platformMeta: { 'shopify_order_id': '5820173270698', 'cancel_reason': 'customer' }
  },

  /* ═══ so_010: 已完成 — 签收 ═══ */
  so_010: {
    id: 'so_010',
    orderNo: 'SO-20260601-0010',
    platformOrderNo: '#SH-7290589',
    confirmationNumber: 'SGORD0010',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'SG Store',
    sourceType: 'web',
    status: '已完成',
    financialStatus: '已支付',
    fulfillmentStatus: '已签收',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-01 08:30:00',
    updatedAt: '2026-06-03 11:00:00',
    closedAt: '2026-06-03 11:00:00',
    currency: 'SGD',
    subtotal: 'S$650.00',
    totalDiscount: 'S$30.00',
    totalShipping: 'S$20.00',
    totalTax: 'S$80.00',
    totalPrice: 'S$720.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [{ code: 'KITCHEN15', type: 'percentage', amount: 'S$30.00' }],
    lineItems: [
      { id: 'li_101', sku: 'KK-SET-PRO', title: 'Kitchen Knife Set', variantTitle: 'Professional / 8-piece / German Steel', quantity: 1, unitPrice: 'S$289.00', discount: 'S$15.00', tax: 'S$32.00', subtotal: 'S$306.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 3200, requiresShipping: true, channelSku: 'SH-KK-SET-PRO', warehouseSku: 'WMS-KK-SET-PRO', unit: '套' },
      { id: 'li_102', sku: 'CB-BM-LG', title: 'Cutting Board', variantTitle: 'Bamboo / Large', quantity: 2, unitPrice: 'S$45.00', discount: 'S$5.00', tax: 'S$10.00', subtotal: 'S$95.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 1400, requiresShipping: true, channelSku: 'SH-CB-BM-LG', warehouseSku: 'WMS-CB-BM-LG', unit: '件' },
      { id: 'li_103', sku: 'SR-ROT-18', title: 'Spice Rack', variantTitle: 'Rotating / 18-jar', quantity: 1, unitPrice: 'S$69.00', discount: 'S$5.00', tax: 'S$8.00', subtotal: 'S$72.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 2800, requiresShipping: true, channelSku: 'SH-SR-ROT-18', warehouseSku: 'WMS-SR-ROT-18', unit: '件' },
      { id: 'li_104', sku: 'MC-SS-5PK', title: 'Measuring Cups', variantTitle: 'Stainless Steel / 5-piece', quantity: 1, unitPrice: 'S$25.00', discount: 'S$0.00', tax: 'S$3.00', subtotal: 'S$28.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 380, requiresShipping: true, channelSku: 'SH-MC-SS-5PK', warehouseSku: 'WMS-MC-SS-5PK', unit: '套' },
      { id: 'li_105', sku: 'MB-CER-3PK', title: 'Mixing Bowls', variantTitle: 'Ceramic / 3-Pack', quantity: 1, unitPrice: 'S$55.00', discount: 'S$3.00', tax: 'S$6.00', subtotal: 'S$58.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 2100, requiresShipping: true, channelSku: 'SH-MB-CER-3PK', warehouseSku: 'WMS-MB-CER-3PK', unit: '套' },
      { id: 'li_106', sku: 'SP-SIL-3PK', title: 'Spatula Set', variantTitle: 'Silicone / Heat-resistant / 3-piece', quantity: 1, unitPrice: 'S$29.00', discount: 'S$0.00', tax: 'S$4.00', subtotal: 'S$33.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 220, requiresShipping: true, channelSku: 'SH-SP-SIL-3PK', warehouseSku: 'WMS-SP-SIL-3PK', unit: '套' },
      { id: 'li_107', sku: 'AP-CTN-NVY', title: 'Apron', variantTitle: 'Cotton / Navy', quantity: 1, unitPrice: 'S$35.00', discount: 'S$2.00', tax: 'S$4.00', subtotal: 'S$37.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 280, requiresShipping: true, channelSku: 'SH-AP-CTN-NVY', warehouseSku: 'WMS-AP-CTN-NVY', unit: '件' },
      { id: 'li_108', sku: 'OM-SIL-RED', title: 'Oven Mitts', variantTitle: 'Silicone / Red / Pair', quantity: 1, unitPrice: 'S$22.00', discount: 'S$0.00', tax: 'S$3.00', subtotal: 'S$25.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 180, requiresShipping: true, channelSku: 'SH-OM-SIL-RED', warehouseSku: 'WMS-OM-SIL-RED', unit: '对' },
      { id: 'li_109', sku: 'TM-DIG-MAG', title: 'Timer', variantTitle: 'Digital / Magnetic', quantity: 1, unitPrice: 'S$15.00', discount: 'S$0.00', tax: 'S$2.00', subtotal: 'S$17.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 65, requiresShipping: true, channelSku: 'SH-TM-DIG-MAG', warehouseSku: 'WMS-TM-DIG-MAG', unit: '个' }
    ],
    customer: { name: 'Kevin Park', email: 'kevin.p@example.sg', phone: '+65 8765 4321', ordersCount: 15, totalSpent: 'S$5,680.00', tags: ['VIP', 'kitchen-enthusiast', 'loyal'], acceptsMarketing: true },
    shippingAddress: { name: 'Kevin Park', phone: '+65 8765 4321', address1: '6 Raffles Quay, #15-08', city: 'Singapore', province: '', country: 'SG', zip: '048580', formatted: '6 Raffles Quay, #15-08, Singapore 048580, SG' },
    billingAddress: { name: 'Kevin Park', phone: '+65 8765 4321', address1: '6 Raffles Quay, #15-08', city: 'Singapore', province: '', country: 'SG', zip: '048580', formatted: '6 Raffles Quay, #15-08, Singapore 048580, SG' },
    shippingMethod: 'Ninja Van Express (Next day)',
    fulfillments: [
      { id: 'ful_101', status: 'delivered', carrier: 'Ninja Van', trackingNumber: 'NV-SG-20260601-001', trackingUrl: 'https://www.ninjavan.co/tracking?id=NV-SG-20260601-001', shippingMode: 'express', serviceLevel: 'Ninja Van Express (Next Day)', fulfillmentOrderNo: 'FO-20260601-0101', outboundOrderNo: 'OB-20260601-0101', outboundStatus: '已出库', packageNo: 'PKG-101-A', packageCount: 2, totalWeight: '10.6 kg', dimensions: '50×40×35 cm + 45×35×30 cm', lineItemIds: ['li_101', 'li_102', 'li_103', 'li_104', 'li_105', 'li_106', 'li_107', 'li_108', 'li_109'], shippedAt: '2026-06-01 16:00', deliveredAt: '2026-06-02 10:30', warehouse: 'SG-Central', matchedRule: 'SG本地单仓直发 + VIP优先时效', warehouseReason: '唯一新加坡仓库，库存充足；VIP客户升级次日达' }
    ],
    transactions: [
      { id: 'txn_101', kind: 'sale', gateway: 'Stripe', method: 'PayNow (DBS)', amount: 'S$720.00', currency: 'SGD', status: 'success', createdAt: '2026-06-01 08:30:22' }
    ],
    refunds: [],
    events: [
      { id: 'evt_105', time: '2026-06-03 11:00:00', actor: '系统', actorRole: 'automation', title: '订单完成', description: '签收确认后 24h 自动关闭订单', type: 'system' },
      { id: 'evt_104', time: '2026-06-02 10:30:00', actor: 'Ninja Van', actorRole: 'carrier', title: '已签收', description: '签收人: Kevin Park · 跟踪号 NV-SG-20260601-001', type: 'fulfillment' },
      { id: 'evt_103g', time: '2026-06-01 16:00:00', actor: 'SG-Central', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260601-0101 交接 Ninja Van，快递员已取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103f', time: '2026-06-01 15:30:00', actor: 'SG-Central', actorRole: 'warehouse_staff', title: '打包完成', description: '9 件商品打包完成，等待快递员取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103e', time: '2026-06-01 14:30:00', actor: 'SG-Central', actorRole: 'warehouse_staff', title: '拣货验货完成', description: '出库单 OB-20260601-0101 拣货 9 件，验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103d2', time: '2026-06-01 14:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260601-0101 下发至仓库 SG-Central', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103d1', time: '2026-06-01 13:50:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: '新加坡区域仅 SG-Central 一个仓 · 库存校验 9 件全部通过 · 选定 SG-Central', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103d', time: '2026-06-01 13:48:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策', description: 'VIP 客户 · 命中规则「VIP优先时效」· 升级至 Ninja Van Express 次日达', type: 'fulfillment', ruleName: 'VIP优先时效' },
      { id: 'evt_103c', time: '2026-06-01 13:45:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: 'VIP 客户优先级 · 标准时效为 1-3 天 · 升级为次日达', type: 'fulfillment', ruleName: 'VIP优先时效' },
      { id: 'evt_103b', time: '2026-06-01 13:40:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '9 件商品 SG-Central 库存充足 · 无需拆单 · 合并为 1 个履约单', type: 'fulfillment', ruleName: '合单策略', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_103a', time: '2026-06-01 13:35:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '9 件商品全部需发货 · 支付已确认 · VIP 客户加速通道 · 进入履约流', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_103', time: '2026-06-01 13:35:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260601-0101', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0101' },
      { id: 'evt_102', time: '2026-06-01 08:30:22', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'PayNow (DBS) 收款 S$720.00', type: 'payment' },
      { id: 'evt_101', time: '2026-06-01 08:30:00', actor: 'Kevin Park', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout 提交', type: 'customer' },
      { id: 'evt_104_l1', time: '2026-06-01 16:15:00', actor: 'Ninja Van', actorRole: 'carrier', title: '揽收成功', description: '快递员已取件，发货仓 SG-Central', type: 'logistics', trackingNode: 'picked_up' },
      { id: 'evt_104_l2', time: '2026-06-01 20:30:00', actor: 'Ninja Van', actorRole: 'carrier', title: '到达分拣中心', description: '到达 Changi Sort Centre，正在分拣', type: 'logistics', trackingNode: 'in_transit' },
      { id: 'evt_104_l3', time: '2026-06-02 07:00:00', actor: 'Ninja Van', actorRole: 'carrier', title: '出发配送', description: '快递员出发，预计 09:00-12:00 送达', type: 'logistics', trackingNode: 'out_for_delivery' },
      { id: 'evt_104_l4', time: '2026-06-02 10:30:00', actor: 'Ninja Van', actorRole: 'carrier', title: '签收成功', description: '本人签收 · Raffles Quay #15-08 前台', type: 'logistics', trackingNode: 'delivered' }
    ],
    note: '',
    tags: ['completed', 'vip-order'],
    platformMeta: { 'shopify_order_id': '5820173270589' }
  },

  /* ═══ so_011: Amazon 已发货 ═══ */
  so_011: {
    id: 'so_011',
    orderNo: 'SO-20260601-0011',
    platformOrderNo: '#AMZ-30481922',
    confirmationNumber: '',
    referenceNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    sourceType: 'marketplace',
    status: '已发货',
    financialStatus: '已支付',
    fulfillmentStatus: '已发货',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-01 07:10:18',
    updatedAt: '2026-06-02 09:00:00',
    currency: 'USD',
    subtotal: '$209.00',
    totalDiscount: '$0.00',
    totalShipping: '$12.00',
    totalTax: '$13.00',
    totalPrice: '$234.00',
    taxesIncluded: false,
    paymentGateway: 'Amazon Pay',
    discountCodes: [],
    lineItems: [
      { id: 'li_111', sku: 'GM-PRO-BLK', title: 'Gaming Mouse', variantTitle: 'Black / 25600 DPI / Wireless', quantity: 1, unitPrice: '$149.00', discount: '$0.00', tax: '$9.00', subtotal: '$158.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 140, requiresShipping: true, platformLineItemId: 'amz_li_30481922_1', channelSku: 'AMZ-GM-PRO-BLK', warehouseSku: 'WMS-GM-PRO-BLK', unit: '个' },
      { id: 'li_112', sku: 'MP-RGB-XL', title: 'Mouse Pad RGB', variantTitle: 'XL / 14 lighting modes', quantity: 1, unitPrice: '$60.00', discount: '$0.00', tax: '$4.00', subtotal: '$64.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', weight: 580, requiresShipping: true, platformLineItemId: 'amz_li_30481922_2', channelSku: 'AMZ-MP-RGB-XL', warehouseSku: 'WMS-MP-RGB-XL', unit: '张' }
    ],
    customer: { name: 'Tom Harris', email: 'tom.h@example.com', phone: '', ordersCount: 7, totalSpent: '$1,450.00', tags: ['gamer', 'amazon-buyer'], acceptsMarketing: false },
    shippingAddress: { name: 'Tom Harris', phone: '+1 (214) 555-0876', address1: '2001 Ross Ave, Suite 700', city: 'Dallas', province: 'TX', country: 'US', zip: '75201', formatted: '2001 Ross Ave, Suite 700, Dallas, TX 75201, US' },
    billingAddress: { name: 'Tom Harris', phone: '+1 (214) 555-0876', address1: '2001 Ross Ave, Suite 700', city: 'Dallas', province: 'TX', country: 'US', zip: '75201', formatted: '2001 Ross Ave, Suite 700, Dallas, TX 75201, US' },
    shippingMethod: 'Amazon Buy Shipping (UPS Ground)',
    fulfillments: [
      { id: 'ful_111', status: 'in_transit', carrier: 'UPS', trackingNumber: '1Z999AA10123456784', trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784', shippingMode: 'parcel', serviceLevel: 'UPS Ground (3-5 business days)', fulfillmentOrderNo: 'FO-20260601-0111', outboundOrderNo: 'OB-20260601-0111', outboundStatus: '已出库', packageNo: 'PKG-111-A', packageCount: 1, totalWeight: '0.72 kg', dimensions: '30×25×15 cm', lineItemIds: ['li_111', 'li_112'], shippedAt: '2026-06-02 09:00', estimatedDelivery: '2026-06-04', warehouse: 'US-Central-DFW', matchedRule: '中部地区就近分仓 + Amazon Buy Shipping优先', warehouseReason: '距 Dallas TX 5km，Amazon MFN渠道使用Buy Shipping' }
    ],
    transactions: [
      { id: 'txn_111', kind: 'sale', gateway: 'Amazon Pay', method: 'Amazon Pay', amount: '$234.00', currency: 'USD', status: 'success', createdAt: '2026-06-01 07:10:30' }
    ],
    refunds: [],
    events: [
      { id: 'evt_114', time: '2026-06-02 09:00:00', actor: 'DFW Warehouse', actorRole: 'warehouse_staff', title: '全部发货', description: '2 件商品从 US-Central-DFW 发出 · UPS Ground · 预计 06-04 到达', type: 'fulfillment' },
      { id: 'evt_113c', time: '2026-06-01 11:00:00', actor: '系统', actorRole: 'automation', title: '仓库匹配完成', description: '规则「中部地区就近分仓」命中 US-Central-DFW（距 Dallas TX 5km），库存充足', type: 'fulfillment', ruleName: '中部地区就近分仓', fulfillmentOrderNo: 'FO-20260601-0111' },
      { id: 'evt_113b', time: '2026-06-01 10:30:00', actor: '系统', actorRole: 'automation', title: '承运商匹配', description: 'Amazon MFN 渠道命中规则「Amazon Buy Shipping优先」，使用 UPS Ground', type: 'fulfillment', ruleName: 'Amazon Buy Shipping优先' },
      { id: 'evt_113', time: '2026-06-01 10:00:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260601-0111，分配至 US-Central-DFW 仓库', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0111' },
      { id: 'evt_112', time: '2026-06-01 07:10:30', actor: 'Amazon Pay', actorRole: 'payment_gateway', title: '支付成功', description: 'Amazon Pay 收款 $234.00', type: 'payment' },
      { id: 'evt_111', time: '2026-06-01 07:10:18', actor: 'Tom Harris', actorRole: 'customer', title: '订单创建', description: '通过 Amazon Marketplace 下单 (MFN)', type: 'customer' },
      { id: 'evt_114_l1', time: '2026-06-02 09:15:00', actor: 'UPS', actorRole: 'carrier', title: '揽收成功', description: '包裹已取件，发货仓 US-Central-DFW', type: 'logistics', trackingNode: 'picked_up' },
      { id: 'evt_114_l2', time: '2026-06-02 18:00:00', actor: 'UPS', actorRole: 'carrier', title: '到达转运中心', description: '到达 Dallas TX Hub，进行分拣', type: 'logistics', trackingNode: 'in_transit' },
      { id: 'evt_114_l3', time: '2026-06-03 06:00:00', actor: 'UPS', actorRole: 'carrier', title: '运输中', description: '离开 Dallas TX Hub，发往 Dallas TX 配送站', type: 'logistics', trackingNode: 'in_transit' },
      { id: 'evt_114_l4', time: '2026-06-03 14:00:00', actor: 'UPS', actorRole: 'carrier', title: '到达配送站', description: '到达 Ross Ave 配送站，预计明日配送', type: 'logistics', trackingNode: 'out_for_delivery' }
    ],
    note: '',
    tags: ['amazon-mfn'],
    platformMeta: { 'amazon_order_id': '114-7782910-3381028', 'fulfillment_channel': 'MFN', 'ship_service_level': 'Standard', 'buy_shipping_label': 'UPS Ground' }
  },

  /* ═══ so_012: TikTok Shop UK 已完成 ═══ */
  so_012: {
    id: 'so_012',
    orderNo: 'SO-20260531-0012',
    platformOrderNo: '#TK-8826991',
    confirmationNumber: '',
    referenceNo: 'TIKTOK-PROMO-06',
    channel: 'TikTok Shop',
    merchant: 'UK TikTok Shop',
    sourceType: 'social_commerce',
    status: '已完成',
    financialStatus: '已支付',
    fulfillmentStatus: '已签收',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-05-31 19:44:33',
    updatedAt: '2026-06-03 09:00:00',
    closedAt: '2026-06-03 09:00:00',
    currency: 'GBP',
    subtotal: '£98.00',
    totalDiscount: '£0.00',
    totalShipping: '£6.00',
    totalTax: '£8.00',
    totalPrice: '£112.00',
    taxesIncluded: true,
    paymentGateway: 'TikTok Payment',
    discountCodes: [],
    lineItems: [
      { id: 'li_121', sku: 'HD-CMP-PNK', title: 'Hair Dryer Compact', variantTitle: 'Pink / Ionic / 1600W', quantity: 1, unitPrice: '£79.00', discount: '£0.00', tax: '£6.00', subtotal: '£79.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 520, requiresShipping: true, channelSku: 'TK-HD-CMP-PNK', warehouseSku: 'WMS-HD-CMP-PNK', unit: '台' },
      { id: 'li_122', sku: 'HC-SET-12P', title: 'Hair Clips Set', variantTitle: 'Assorted / 12-piece', quantity: 1, unitPrice: '£19.00', discount: '£0.00', tax: '£2.00', subtotal: '£19.00', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 85, requiresShipping: true, channelSku: 'TK-HC-SET-12P', warehouseSku: 'WMS-HC-SET-12P', unit: '套' }
    ],
    customer: { name: 'Sophie Turner', email: 'sophie.t@example.co.uk', phone: '+44 121 555 0199', ordersCount: 3, totalSpent: '£289.00', tags: ['tiktok-buyer', 'beauty'], acceptsMarketing: true },
    shippingAddress: { name: 'Sophie Turner', phone: '+44 121 555 0199', address1: '45 Broad St', city: 'Birmingham', province: '', country: 'GB', zip: 'B1 2HP', formatted: '45 Broad St, Birmingham, B1 2HP, GB' },
    billingAddress: { name: 'Sophie Turner', phone: '+44 121 555 0199', address1: '45 Broad St', city: 'Birmingham', province: '', country: 'GB', zip: 'B1 2HP', formatted: '45 Broad St, Birmingham, B1 2HP, GB' },
    shippingMethod: 'Royal Mail Tracked 24',
    fulfillments: [
      { id: 'ful_121', status: 'delivered', carrier: 'Royal Mail', trackingNumber: 'RM-TK-20260531-012', trackingUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/RM-TK-20260531-012', shippingMode: 'parcel', serviceLevel: 'Royal Mail Tracked 24 (Next Day)', fulfillmentOrderNo: 'FO-20260531-0121', outboundOrderNo: 'OB-20260531-0121', outboundStatus: '已出库', packageNo: 'PKG-121-A', packageCount: 1, totalWeight: '0.61 kg', dimensions: '35×25×15 cm', lineItemIds: ['li_121', 'li_122'], shippedAt: '2026-06-01 10:00', deliveredAt: '2026-06-02 09:15', warehouse: 'UK-Central-BHX', matchedRule: 'UK本地就近分仓', warehouseReason: '距 Birmingham 最近，库存充足' }
    ],
    transactions: [
      { id: 'txn_121', kind: 'sale', gateway: 'TikTok Payment', method: 'Debit Card ****2233', amount: '£112.00', currency: 'GBP', status: 'success', createdAt: '2026-05-31 19:44:50' }
    ],
    refunds: [],
    events: [
      /* ─── 系统事件 (倒序) ─── */
      { id: 'evt_12_20', time: '2026-06-03 09:00:00', actor: '系统', actorRole: 'automation', title: '订单完成', description: '签收确认后自动关闭订单', type: 'system' },
      /* ─── 履约决策 + 执行事件 (倒序) ─── */
      { id: 'evt_12_19', time: '2026-06-02 09:15:00', actor: 'Royal Mail', actorRole: 'carrier', title: '已签收', description: '投递至信箱 · 跟踪号 RM-TK-20260531-012 · 签收地: B1 2HP', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_18', time: '2026-06-01 16:30:00', actor: 'UK-Central-BHX', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260531-0121 交接 Royal Mail，快递员已取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_17', time: '2026-06-01 15:45:00', actor: 'UK-Central-BHX', actorRole: 'warehouse_staff', title: '打包完成', description: '2 件商品打包完成 · 包裹重量 605g · 尺寸 35×25×15cm · 等待Royal Mail取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_16', time: '2026-06-01 14:30:00', actor: 'UK-Central-BHX', actorRole: 'warehouse_staff', title: '拣货验货完成', description: '出库单 OB-20260531-0121 拣货 2 件 (Hair Dryer + Clips Set)，验货通过，无破损', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_15', time: '2026-06-01 12:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260531-0121 下发至仓库 UK-Central-BHX，进入拣货队列', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_14', time: '2026-06-01 11:55:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260531-0121，包含 2 件商品', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_13', time: '2026-06-01 11:50:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: '候选仓: UK-Central-BHX(15km) / UK-South-LHR(180km) · 距 Birmingham B1 距离评分 BHX=96分 最优 · 库存校验: Hair Dryer×1✓ Clips×1✓ · 选定 UK-Central-BHX', type: 'fulfillment', ruleName: 'UK本地就近分仓', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_12', time: '2026-06-01 11:48:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策', description: '总重量 605g (≤2kg) · UK 本地配送 · 客户选择 Tracked 24 · 匹配 Royal Mail Tracked 24 (次日达)', type: 'fulfillment', ruleName: 'UK本地承运商规则', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_11', time: '2026-06-01 11:45:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略', description: 'Royal Mail Tracked 24 时效 · 承诺次日送达 · 优先级: 标准', type: 'fulfillment', ruleName: 'UK标准时效规则', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_10', time: '2026-06-01 11:42:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '2 件商品 (HD-CMP-PNK, HC-SET-12P) · 总重 605g 未超单包裹限制 · UK-Central-BHX 库存充足 · 合并为 1 个履约单', type: 'fulfillment', ruleName: '合单策略', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_09', time: '2026-06-01 11:40:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '2 件商品全部 requiresShipping=true · 支付已确认 (TikTok Payment £112.00) · 风控 Low · 地址校验通过 (Royal Mail API 100%) · 准入通过', type: 'fulfillment', ruleName: '履约准入规则' },
      /* ─── 支付 + 创建事件 ─── */
      { id: 'evt_12_02', time: '2026-05-31 19:44:50', actor: 'TikTok Payment', actorRole: 'payment_gateway', title: '支付成功', description: 'Debit Card ****2233 收款 £112.00', type: 'payment' },
      { id: 'evt_12_01', time: '2026-05-31 19:44:33', actor: 'Sophie Turner', actorRole: 'customer', title: '订单创建', description: '通过 TikTok Shop 商品页下单', type: 'customer' },
      /* ─── 物流跟踪事件 (chronological) ─── */
      { id: 'evt_12_l1', time: '2026-06-01 17:00:00', actor: 'Royal Mail', actorRole: 'carrier', title: '揽收成功', description: '快递员已从 UK-Central-BHX 取件 · 跟踪号 RM-TK-20260531-012', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_l2', time: '2026-06-01 21:30:00', actor: 'Royal Mail', actorRole: 'carrier', title: '到达分拣中心', description: '到达 Birmingham Mail Centre，正在分拣处理', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_l3', time: '2026-06-02 06:00:00', actor: 'Royal Mail', actorRole: 'carrier', title: '出发配送', description: '包裹已分配至 B1 区域投递员，预计上午送达', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260531-0121' },
      { id: 'evt_12_l4', time: '2026-06-02 09:15:00', actor: 'Royal Mail', actorRole: 'carrier', title: '签收成功', description: '投递至信箱 · 45 Broad St, Birmingham, B1 2HP', type: 'logistics', trackingNode: 'delivered', fulfillmentOrderNo: 'FO-20260531-0121' }
    ],
    note: '',
    tags: ['completed', 'tiktok-promo'],
    platformMeta: { 'tiktok_order_id': 'TK-8826991', 'tiktok_shop_id': 'uk_shop_001', 'source': 'product_page', 'promo_code': 'TIKTOK-PROMO-06' }
  },

  /* ═══ so_013: 处理中 — 多仓拆单场景 (Shopify US) ═══ */
  so_013: {
    id: 'so_013',
    orderNo: 'SO-20260604-0013',
    platformOrderNo: '#SH-7291150',
    confirmationNumber: 'UQVCRCX13',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '处理中',
    financialStatus: '已支付',
    fulfillmentStatus: '拣货中',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-04 09:30:00',
    updatedAt: '2026-06-04 14:00:00',
    currency: 'USD',
    subtotal: '$346.00',
    totalDiscount: '$15.00',
    totalShipping: '$22.00',
    totalTax: '$26.48',
    totalPrice: '$379.48',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [{ code: 'SAVE15', type: 'fixed_amount', amount: '$15.00' }],
    lineItems: [
      { id: 'li_131', sku: 'KB-MEC-RGB', title: 'Mechanical Keyboard', variantTitle: 'RGB / Cherry MX Blue', quantity: 1, unitPrice: '$129.00', discount: '$5.00', tax: '$9.92', subtotal: '$133.92', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 980, requiresShipping: true, channelSku: 'SH-KB-MEC-RGB', warehouseSku: 'WMS-KB-MEC-RGB', unit: '台' },
      { id: 'li_132', sku: 'WR-GEL-BLK', title: 'Wrist Rest', variantTitle: 'Gel / Black / Full-size', quantity: 1, unitPrice: '$29.00', discount: '$0.00', tax: '$2.32', subtotal: '$31.32', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 320, requiresShipping: true, channelSku: 'SH-WR-GEL-BLK', warehouseSku: 'WMS-WR-GEL-BLK', unit: '件' },
      { id: 'li_133', sku: 'WC-4K-HDR', title: 'Webcam 4K', variantTitle: '4K HDR / Auto-focus', quantity: 1, unitPrice: '$149.00', discount: '$8.00', tax: '$11.28', subtotal: '$152.28', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 210, requiresShipping: true, channelSku: 'SH-WC-4K-HDR', warehouseSku: 'WMS-WC-4K-HDR', unit: '个' },
      { id: 'li_134', sku: 'RL-LED-DIM', title: 'Ring Light Mini', variantTitle: '6 inch / Clip-on / Dimmable', quantity: 1, unitPrice: '$39.00', discount: '$2.00', tax: '$2.96', subtotal: '$39.96', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 150, requiresShipping: true, channelSku: 'SH-RL-LED-DIM', warehouseSku: 'WMS-RL-LED-DIM', unit: '件' }
    ],
    customer: { name: 'Jason Kim', email: 'jason.k@example.com', phone: '+1 (415) 555-0312', ordersCount: 8, totalSpent: '$2,150.00', tags: ['tech-enthusiast', 'returning'], acceptsMarketing: true },
    shippingAddress: { name: 'Jason Kim', phone: '+1 (415) 555-0312', address1: '580 Market St, Suite 400', city: 'San Francisco', province: 'CA', country: 'US', zip: '94104', formatted: '580 Market St, Suite 400, San Francisco, CA 94104, US' },
    billingAddress: { name: 'Jason Kim', phone: '+1 (415) 555-0312', address1: '580 Market St, Suite 400', city: 'San Francisco', province: 'CA', country: 'US', zip: '94104', formatted: '580 Market St, Suite 400, San Francisco, CA 94104, US' },
    shippingMethod: 'Standard Shipping (3-7 business days)',
    fulfillments: [
      {
        id: 'ful_131',
        status: 'in_progress',
        carrier: 'UPS',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260604-0131',
        outboundOrderNo: 'OB-20260604-0131',
        outboundStatus: '拣货中',
        lineItemIds: ['li_131', 'li_132'],
        warehouse: 'US-West-LAX',
        matchedRule: '库存驱动拆单 + 西海岸就近',
        warehouseReason: 'Keyboard 和 Wrist Rest 仅 US-West-LAX 有库存，距 SF 600km 可接受'
      },
      {
        id: 'ful_132',
        status: 'in_progress',
        carrier: 'FedEx',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260604-0132',
        outboundOrderNo: 'OB-20260604-0132',
        outboundStatus: '拣货中',
        lineItemIds: ['li_133', 'li_134'],
        warehouse: 'US-East-EWR',
        matchedRule: '库存驱动拆单 + 独占库存仓',
        warehouseReason: 'Webcam 4K 和 Ring Light Mini 仅 US-East-EWR 有库存，跨区域发货'
      }
    ],
    transactions: [
      { id: 'txn_131', kind: 'sale', gateway: 'Stripe', method: 'Google Pay (Mastercard ****3344)', amount: '$379.48', currency: 'USD', status: 'success', createdAt: '2026-06-04 09:30:25', gatewayReference: 'ch_8Wn5Q2RT...' }
    ],
    refunds: [],
    events: [
      /* ─── 第二个履约单 FO-0132 决策链 (US-East-EWR) ─── */
      { id: 'evt_13_20', time: '2026-06-04 14:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260604-0132 下发至仓库 US-East-EWR，进入拣货队列', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0132' },
      { id: 'evt_13_19', time: '2026-06-04 13:58:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260604-0132 (Webcam + Ring Light)，分配至 US-East-EWR', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0132' },
      { id: 'evt_13_18', time: '2026-06-04 13:55:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-2)', description: 'FO-20260604-0132: 库存查询 WC-4K-HDR → US-West-LAX:0 / US-East-EWR:15 · RL-LED-DIM → US-West-LAX:0 / US-East-EWR:8 · 仅 US-East-EWR 有库存 · 选定 US-East-EWR (距SF 4100km, 跨区域)', type: 'fulfillment', ruleName: '独占库存仓选择', fulfillmentOrderNo: 'FO-20260604-0132' },
      { id: 'evt_13_17', time: '2026-06-04 13:53:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策 (FO-2)', description: 'FO-20260604-0132: 总重量 360g · 跨区域长距离 · 命中规则「跨区FedEx Home」· 时效 4-6 天 · 预选 FedEx Home Delivery', type: 'fulfillment', ruleName: '跨区域承运商规则', fulfillmentOrderNo: 'FO-20260604-0132' },
      { id: 'evt_13_16', time: '2026-06-04 13:51:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略 (FO-2)', description: 'FO-20260604-0132: 跨区域发货 · 预计 4-6 个工作日 · 客户标准时效范围内', type: 'fulfillment', ruleName: '跨区域时效规则', fulfillmentOrderNo: 'FO-20260604-0132' },
      /* ─── 第一个履约单 FO-0131 决策链 (US-West-LAX) ─── */
      { id: 'evt_13_15', time: '2026-06-04 13:48:00', actor: '系统', actorRole: 'automation', title: '出库单已生成', description: '出库单 OB-20260604-0131 下发至仓库 US-West-LAX，进入拣货队列', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0131' },
      { id: 'evt_13_14', time: '2026-06-04 13:46:00', actor: '系统', actorRole: 'automation', title: '履约单已生成', description: '履约单号 FO-20260604-0131 (Keyboard + Wrist Rest)，分配至 US-West-LAX', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0131' },
      { id: 'evt_13_13', time: '2026-06-04 13:44:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-1)', description: 'FO-20260604-0131: 库存查询 KB-MEC-RGB → US-West-LAX:22 / US-East-EWR:0 · WR-GEL-BLK → US-West-LAX:45 / US-East-EWR:0 · 仅 US-West-LAX 有库存 · 选定 US-West-LAX (距SF 600km)', type: 'fulfillment', ruleName: '独占库存仓选择', fulfillmentOrderNo: 'FO-20260604-0131' },
      { id: 'evt_13_12', time: '2026-06-04 13:42:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策 (FO-1)', description: 'FO-20260604-0131: 总重量 1,300g (≤2kg) · 同区域西海岸 · 命中规则「同区UPS Ground」· 时效 3-5 天 · 预选 UPS Ground', type: 'fulfillment', ruleName: '同区域承运商规则', fulfillmentOrderNo: 'FO-20260604-0131' },
      { id: 'evt_13_11', time: '2026-06-04 13:40:00', actor: '履约引擎', actorRole: 'automation', title: '时效策略 (FO-1)', description: 'FO-20260604-0131: 同区域发货 · 预计 3-5 个工作日 · 标准优先级', type: 'fulfillment', ruleName: '标准时效规则', fulfillmentOrderNo: 'FO-20260604-0131' },
      /* ─── 拆单决策 ─── */
      { id: 'evt_13_10', time: '2026-06-04 13:35:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '4 件商品库存分布: KB-MEC-RGB 仅LAX有货 / WR-GEL-BLK 仅LAX有货 / WC-4K-HDR 仅EWR有货 / RL-LED-DIM 仅EWR有货 · 无单一仓库可满足全部 · 按库存归属拆分为 2 个履约单', type: 'fulfillment', ruleName: '库存驱动拆单策略' },
      /* ─── 准入 ─── */
      { id: 'evt_13_09', time: '2026-06-04 13:30:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '4 件商品全部 requiresShipping=true · 支付已确认 (Stripe $379.48) · 风控 Low · 地址校验通过 · 老客户第8单 · 准入通过', type: 'fulfillment', ruleName: '履约准入规则' },
      /* ─── 支付 + 创建 ─── */
      { id: 'evt_13_02', time: '2026-06-04 09:30:25', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Google Pay (Mastercard ****3344) 收款 $379.48', type: 'payment' },
      { id: 'evt_13_01', time: '2026-06-04 09:30:00', actor: 'Jason Kim', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (Chrome) 提交', type: 'customer' }
    ],
    note: '',
    tags: ['split-fulfillment', 'multi-warehouse'],
    platformMeta: { 'shopify_order_id': '5820173271150', 'landing_site': '/collections/tech-accessories', 'referring_site': 'https://reddit.com' }
  },

  /* ═══ so_014: 找不到仓库 — 商品未铺货到任何仓库 ═══ */
  so_014: {
    id: 'so_014',
    orderNo: 'SO-20260604-0014',
    platformOrderNo: '#SH-7291200',
    confirmationNumber: 'USORD0014',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '保留',
    financialStatus: '已支付',
    fulfillmentStatus: '已暂停',
    riskLevel: 'low',
    exception: '找不到仓库',
    createdAt: '2026-06-04 11:20:00',
    updatedAt: '2026-06-04 14:30:00',
    currency: 'USD',
    subtotal: '$278.00',
    totalDiscount: '$0.00',
    totalShipping: '$15.00',
    totalTax: '$18.00',
    totalPrice: '$311.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],

    lineItems: [
      { id: 'li_141', sku: 'ST-WIFI-V3', title: 'Smart Thermostat', variantTitle: 'WiFi / V3 / White', quantity: 1, unitPrice: '$199.00', discount: '$0.00', tax: '$12.74', subtotal: '$211.74', fulfillmentStatus: '找不到仓库', fulfillmentNote: '新品未铺货，等待入库', weight: 850, requiresShipping: true, channelSku: 'SH-ST-WIFI-V3', warehouseSku: 'WMS-ST-WIFI-V3', unit: '台' },
      { id: 'li_142', sku: 'TS-BLE-3PK', title: 'Temperature Sensor 3-Pack', variantTitle: 'Bluetooth / White / 3-Pack', quantity: 1, unitPrice: '$79.00', discount: '$0.00', tax: '$5.26', subtotal: '$84.26', fulfillmentStatus: '找不到仓库', fulfillmentNote: '新品未铺货，等待入库', weight: 120, requiresShipping: true, channelSku: 'SH-TS-BLE-3PK', warehouseSku: 'WMS-TS-BLE-3PK', unit: '套' }
    ],
    customer: { name: 'Daniel Cooper', email: 'daniel.cooper@example.com', phone: '+1 (720) 555-0189', ordersCount: 1, totalSpent: '$311.00', tags: ['new-customer', 'smart-home'], acceptsMarketing: true },
    shippingAddress: { name: 'Daniel Cooper', phone: '+1 (720) 555-0189', address1: '1600 Champa St, Apt 402', city: 'Denver', province: 'CO', country: 'US', zip: '80202', formatted: '1600 Champa St, Apt 402, Denver, CO 80202, US' },
    billingAddress: { name: 'Daniel Cooper', phone: '+1 (720) 555-0189', address1: '1600 Champa St, Apt 402', city: 'Denver', province: 'CO', country: 'US', zip: '80202', formatted: '1600 Champa St, Apt 402, Denver, CO 80202, US' },
    shippingMethod: 'UPS Ground (3-5 business days)',
    fulfillments: [],
    transactions: [
      { id: 'txn_141', kind: 'sale', gateway: 'Stripe', method: 'Visa ****8877', amount: '$311.00', currency: 'USD', status: 'success', createdAt: '2026-06-04 11:20:30', gatewayReference: 'ch_9Dn3F4TK...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_14_08', time: '2026-06-04 14:30:00', actor: 'Kevin Zhang', actorRole: 'ops_manager', title: '订单保留', description: '手动将订单标记为保留状态，等待商品部门铺货完成后重新触发履约', type: 'edit' },
      { id: 'evt_14_07', time: '2026-06-04 14:00:00', actor: '系统', actorRole: 'automation', title: '履约暂停', description: '无可用仓库，履约流程暂停，等待商品团队分配库存', type: 'fulfillment', ruleName: '无仓暂停规则' },
      { id: 'evt_14_06', time: '2026-06-04 13:55:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 - 失败', description: 'Smart Thermostat (ST-WIFI-V3) 未铺货到任何仓库 · 库存查询: US-West-LAX:0, US-East-EWR:0, US-Central-DFW:0, US-East-BOS:0 · 商品是新品尚未入库', type: 'fulfillment', ruleName: '选仓决策' },
      { id: 'evt_14_05', time: '2026-06-04 13:53:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 - 失败', description: 'Temperature Sensor 3-Pack (TS-BLE-3PK) 未铺货到任何仓库 · 库存查询: US-West-LAX:0, US-East-EWR:0, US-Central-DFW:0, US-East-BOS:0 · 商品是新品尚未入库', type: 'fulfillment', ruleName: '选仓决策' },
      { id: 'evt_14_04', time: '2026-06-04 13:50:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '2 件商品(含3个传感器) · 尝试合并为 1 个履约单 · 进入选仓环节', type: 'fulfillment', ruleName: '合单策略' },
      { id: 'evt_14_03', time: '2026-06-04 13:45:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '2 件商品全部 requiresShipping=true · 支付已确认 (Stripe $311.00) · 风控 Low · 进入拆合单决策', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_14_02', time: '2026-06-04 11:20:30', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****8877 收款 $311.00', type: 'payment' },
      { id: 'evt_14_01', time: '2026-06-04 11:20:00', actor: 'Daniel Cooper', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (Chrome) 提交', type: 'customer' }
    ],
    note: '',
    tags: ['no-warehouse', 'new-product', 'smart-home'],
    platformMeta: { 'shopify_order_id': '5820173271200', 'landing_site': '/collections/smart-home', 'referring_site': 'https://google.com' }
  },

  /* ═══ so_015: 复杂拆单(3个履约单) — 不同仓不同承运商 ═══ */
  so_015: {
    id: 'so_015',
    orderNo: 'SO-20260604-0015',
    platformOrderNo: '#SH-7291210',
    confirmationNumber: 'USORD0015',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '处理中',
    financialStatus: '已支付',
    fulfillmentStatus: '部分履约',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-04 08:00:00',
    updatedAt: '2026-06-04 16:30:00',
    currency: 'USD',
    subtotal: '$1,488.00',
    totalDiscount: '$0.00',
    totalShipping: '$85.00',
    totalTax: '$117.00',
    totalPrice: '$1,690.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_151', sku: 'PJ-4K-HDR', title: 'Projector 4K', variantTitle: 'HDR / 3000 Lumens / White', quantity: 1, unitPrice: '$899.00', discount: '$0.00', tax: '$57.54', subtotal: '$956.54', fulfillmentStatus: '已发货', fulfillmentNote: '已从US-Central-DFW发出', weight: 5200, requiresShipping: true, channelSku: 'SH-PJ-4K-HDR', warehouseSku: 'WMS-PJ-4K-HDR', unit: '台' },
      { id: 'li_152', sku: 'PS-100-WHT', title: 'Projector Screen 100"', variantTitle: 'White / Motorized / 16:9', quantity: 1, unitPrice: '$450.00', discount: '$0.00', tax: '$28.80', subtotal: '$478.80', fulfillmentStatus: '已发货', fulfillmentNote: '已从US-Central-DFW发出', weight: 8500, requiresShipping: true, channelSku: 'SH-PS-100-WHT', warehouseSku: 'WMS-PS-100-WHT', unit: '件' },
      { id: 'li_153', sku: 'HC-5M-8K', title: 'HDMI Cable 5m', variantTitle: '8K / Braided / Gold-plated', quantity: 2, unitPrice: '$35.00', discount: '$0.00', tax: '$4.48', subtotal: '$74.48', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 180, requiresShipping: true, channelSku: 'SH-HC-5M-8K', warehouseSku: 'WMS-HC-5M-8K', unit: '条' },
      { id: 'li_154', sku: 'SP-8OUT-USB', title: 'Surge Protector', variantTitle: '8-Outlet / USB-C / Black', quantity: 1, unitPrice: '$45.00', discount: '$0.00', tax: '$2.88', subtotal: '$47.88', fulfillmentStatus: '拣货中', fulfillmentNote: '仓库拣货执行中', weight: 420, requiresShipping: true, channelSku: 'SH-SP-8OUT-USB', warehouseSku: 'WMS-SP-8OUT-USB', unit: '件' },
      { id: 'li_155', sku: 'CS-NYL-2M', title: 'Cable Sleeve 2m', variantTitle: 'Nylon / Black / 2-meter', quantity: 2, unitPrice: '$12.00', discount: '$0.00', tax: '$1.54', subtotal: '$25.54', fulfillmentStatus: '待发货', fulfillmentNote: '等待打包', weight: 85, requiresShipping: true, channelSku: 'SH-CS-NYL-2M', warehouseSku: 'WMS-CS-NYL-2M', unit: '卷' }
    ],
    customer: { name: 'Rachel Green', email: 'rachel.green@example.com', phone: '+1 (480) 555-0276', ordersCount: 5, totalSpent: '$3,200.00', tags: ['electronics', 'home-theater'], acceptsMarketing: true },
    shippingAddress: { name: 'Rachel Green', phone: '+1 (480) 555-0276', address1: '4200 N Scottsdale Rd, Unit 12', city: 'Phoenix', province: 'AZ', country: 'US', zip: '85251', formatted: '4200 N Scottsdale Rd, Unit 12, Phoenix, AZ 85251, US' },
    billingAddress: { name: 'Rachel Green', phone: '+1 (480) 555-0276', address1: '4200 N Scottsdale Rd, Unit 12', city: 'Phoenix', province: 'AZ', country: 'US', zip: '85251', formatted: '4200 N Scottsdale Rd, Unit 12, Phoenix, AZ 85251, US' },
    shippingMethod: 'Mixed (FedEx Freight + UPS + USPS)',
    fulfillments: [
      {
        id: 'ful_151',
        status: 'in_transit',
        carrier: 'FedEx Freight',
        trackingNumber: 'FX-PHX-20260604-001',
        trackingUrl: 'https://www.fedex.com/track?trknbr=FX-PHX-20260604-001',
        fulfillmentOrderNo: 'FO-20260604-0151',
        outboundOrderNo: 'OB-20260604-0151',
        outboundStatus: '已出库',
        packageNo: 'PKG-151-A',
        lineItemIds: ['li_151', 'li_152'],
        shippedAt: '2026-06-04 14:00',
        estimatedDelivery: '2026-06-07',
        warehouse: 'US-Central-DFW',
        matchedRule: '重件freight + 就近有货仓',
        warehouseReason: 'Projector(5.2kg) + Screen(8.5kg) 总重 13.7kg · US-Central-DFW 有货且距 Phoenix 最近 (1,050km)'
      },
      {
        id: 'ful_152',
        status: 'in_progress',
        carrier: 'UPS',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260604-0152',
        outboundOrderNo: 'OB-20260604-0152',
        outboundStatus: '拣货中',
        lineItemIds: ['li_153', 'li_154'],
        warehouse: 'US-West-LAX',
        matchedRule: '独占库存仓 + UPS标品',
        warehouseReason: 'HDMI 8K cables 仅 US-West-LAX 有库存，Surge Protector 合并同仓发运'
      },
      {
        id: 'ful_153',
        status: 'in_progress',
        carrier: 'USPS',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260604-0153',
        outboundOrderNo: 'OB-20260604-0153',
        outboundStatus: '打包中',
        lineItemIds: ['li_155'],
        warehouse: 'US-East-EWR',
        matchedRule: '独占库存仓 + USPS轻件',
        warehouseReason: 'Cable Sleeve 仅 US-East-EWR 有库存，轻件(170g)走 USPS First Class'
      }
    ],
    transactions: [
      { id: 'txn_151', kind: 'sale', gateway: 'Stripe', method: 'Apple Pay (Visa ****4455)', amount: '$1,690.00', currency: 'USD', status: 'success', createdAt: '2026-06-04 08:00:30', gatewayReference: 'ch_7Rp2K5WL...' }
    ],
    refunds: [],
    events: [
      /* ─── FO-0153 执行 (Cable Sleeves, US-East-EWR) ─── */
      { id: 'evt_15_20', time: '2026-06-04 16:30:00', actor: 'US-East-EWR', actorRole: 'warehouse_staff', title: '打包中 (FO-0153)', description: '出库单 OB-20260604-0153 打包中 · Cable Sleeve ×2 轻量包裹 · 等待 USPS 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0153' },
      { id: 'evt_15_19', time: '2026-06-04 16:00:00', actor: 'US-East-EWR', actorRole: 'warehouse_staff', title: '拣货完成 (FO-0153)', description: '出库单 OB-20260604-0153 拣货完成 · Cable Sleeve ×2 验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0153' },
      /* ─── FO-0152 执行 (HDMI + Surge, US-West-LAX) ─── */
      { id: 'evt_15_18', time: '2026-06-04 15:30:00', actor: 'US-West-LAX', actorRole: 'warehouse_staff', title: '拣货中 (FO-0152)', description: '出库单 OB-20260604-0152 拣货执行中 · HDMI Cable ×2 + Surge Protector ×1', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0152' },
      /* ─── FO-0151 发货 (Projector + Screen, US-Central-DFW) ─── */
      { id: 'evt_15_17', time: '2026-06-04 14:00:00', actor: 'US-Central-DFW', actorRole: 'warehouse_staff', title: '出库交接完成 (FO-0151)', description: '出库单 OB-20260604-0151 交接 FedEx Freight · Projector + Screen 重件包裹 13.7kg', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0151' },
      { id: 'evt_15_16', time: '2026-06-04 13:00:00', actor: 'US-Central-DFW', actorRole: 'warehouse_staff', title: '打包完成 (FO-0151)', description: 'Projector + Screen 打包完成 · 双层缓冲包装 · 总重 13.7kg · 等待 FedEx 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0151' },
      { id: 'evt_15_15', time: '2026-06-04 12:00:00', actor: 'US-Central-DFW', actorRole: 'warehouse_staff', title: '拣货验货完成 (FO-0151)', description: '出库单 OB-20260604-0151 拣货 2 件 (Projector + Screen)，验货通过', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260604-0151' },
      /* ─── 出库单生成 ─── */
      { id: 'evt_15_14', time: '2026-06-04 11:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成 (×3)', description: 'OB-20260604-0151(DFW) + OB-20260604-0152(LAX) + OB-20260604-0153(EWR) 分别下发', type: 'fulfillment' },
      /* ─── 选仓+承运商决策 ─── */
      { id: 'evt_15_13', time: '2026-06-04 10:50:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-3)', description: 'FO-20260604-0153: Cable Sleeve CS-NYL-2M 库存查询 → US-West-LAX:0 / US-East-EWR:30 / US-Central-DFW:0 · 仅 EWR 有货 · 选定 US-East-EWR · 轻件 170g USPS First Class', type: 'fulfillment', ruleName: '独占库存仓选择', fulfillmentOrderNo: 'FO-20260604-0153' },
      { id: 'evt_15_12', time: '2026-06-04 10:48:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-2)', description: 'FO-20260604-0152: HC-5M-8K 库存 → LAX:25 / EWR:0 / DFW:0 · SP-8OUT-USB 库存 → LAX:18 / EWR:5 / DFW:3 · HDMI仅LAX有货，Surge合并同仓 · 选定 US-West-LAX', type: 'fulfillment', ruleName: '独占库存仓选择', fulfillmentOrderNo: 'FO-20260604-0152' },
      { id: 'evt_15_11', time: '2026-06-04 10:45:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策 (FO-1)', description: 'FO-20260604-0151: PJ-4K-HDR 库存 → DFW:8 / LAX:2 / EWR:0 · PS-100-WHT 库存 → DFW:5 / LAX:0 / EWR:0 · Screen仅DFW有货 · 选定 US-Central-DFW (距Phoenix 1050km)', type: 'fulfillment', ruleName: '库存驱动选仓', fulfillmentOrderNo: 'FO-20260604-0151' },
      { id: 'evt_15_10', time: '2026-06-04 10:42:00', actor: '履约引擎', actorRole: 'automation', title: '承运商决策 (×3)', description: 'FO-0151: 13.7kg重件→FedEx Freight · FO-0152: 780g标品→UPS Ground · FO-0153: 170g轻件→USPS First Class', type: 'fulfillment', ruleName: '重量分级承运商规则' },
      /* ─── 拆单决策 ─── */
      { id: 'evt_15_09', time: '2026-06-04 10:35:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '7 件商品(含 HDMI×2, Sleeve×2) 库存分布无单一仓可满足 · PJ+PS仅DFW有 · HC仅LAX有 · CS仅EWR有 · 按库存归属拆分为 3 个履约单: FO-0151(DFW) + FO-0152(LAX) + FO-0153(EWR)', type: 'fulfillment', ruleName: '库存驱动拆单策略' },
      { id: 'evt_15_08', time: '2026-06-04 10:33:00', actor: '系统', actorRole: 'automation', title: '履约单已生成 (×3)', description: '拆分生成 3 个履约单: FO-20260604-0151(Projector+Screen) + FO-20260604-0152(HDMI+Surge) + FO-20260604-0153(Cable Sleeve)', type: 'fulfillment' },
      /* ─── 准入 ─── */
      { id: 'evt_15_07', time: '2026-06-04 10:30:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '7 件商品全部 requiresShipping=true · 支付已确认 (Stripe $1,690.00) · 风控 Low · 老客户第5单 · 进入拆合单决策', type: 'fulfillment', ruleName: '履约准入规则' },
      /* ─── 支付 + 创建 ─── */
      { id: 'evt_15_02', time: '2026-06-04 08:00:30', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Apple Pay (Visa ****4455) 收款 $1,690.00', type: 'payment' },
      { id: 'evt_15_01', time: '2026-06-04 08:00:00', actor: 'Rachel Green', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (Safari/iOS) 提交', type: 'customer' },
      /* ─── 物流跟踪: FO-0151 (FedEx Freight, Projector+Screen) ─── */
      { id: 'evt_15_l1a', time: '2026-06-04 14:15:00', actor: 'FedEx Freight', actorRole: 'carrier', title: '揽收成功 (Projector+Screen)', description: '司机已取件 · OB-0151 重件包裹 13.7kg · 发货仓 US-Central-DFW · 跟踪号 FX-PHX-20260604-001', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260604-0151' },
      { id: 'evt_15_l1b', time: '2026-06-05 03:00:00', actor: 'FedEx Freight', actorRole: 'carrier', title: '到达转运中心 (Projector+Screen)', description: '到达 Albuquerque NM 转运中心 · LTL 货物分拣', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260604-0151' },
      { id: 'evt_15_l1c', time: '2026-06-06 08:00:00', actor: 'FedEx Freight', actorRole: 'carrier', title: '运输中 (Projector+Screen)', description: '离开 Albuquerque · 发往 Phoenix AZ 配送站', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260604-0151' }
    ],
    note: '',
    tags: ['split-3-way', 'multi-warehouse', 'home-theater'],
    platformMeta: { 'shopify_order_id': '5820173271210', 'landing_site': '/collections/home-theater', 'referring_site': 'https://youtube.com' }
  },

  /* ═══ so_016: 部分 On Hold — 一部分已发，一部分因合规暂停 ═══ */
  so_016: {
    id: 'so_016',
    orderNo: 'SO-20260603-0016',
    platformOrderNo: '#AMZ-30483001',
    confirmationNumber: 'AMZORD0016',
    referenceNo: 'AMZ-FBA-30483001',
    channel: 'Amazon',
    merchant: 'US Store',
    sourceType: 'api',
    status: '保留',
    financialStatus: '已支付',
    fulfillmentStatus: '部分履约',
    riskLevel: 'low',
    exception: '合规审查',
    createdAt: '2026-06-03 09:15:00',
    updatedAt: '2026-06-03 18:00:00',
    currency: 'USD',
    subtotal: '$402.00',
    totalDiscount: '$0.00',
    totalShipping: '$22.00',
    totalTax: '$32.00',
    totalPrice: '$456.00',
    taxesIncluded: false,
    paymentGateway: 'Amazon Pay',
    discountCodes: [],
    lineItems: [
      { id: 'li_161', sku: 'WR-AX6000', title: 'Wireless Router', variantTitle: 'AX6000 / Tri-band / Black', quantity: 1, unitPrice: '$189.00', discount: '$0.00', tax: '$12.10', subtotal: '$201.10', fulfillmentStatus: '已发货', fulfillmentNote: '已从US-Central-DFW发出', weight: 680, requiresShipping: true, channelSku: 'AMZ-WR-AX6000', warehouseSku: 'WMS-WR-AX6000', unit: '台' },
      { id: 'li_162', sku: 'NS-24P-POE', title: 'Network Switch 24-port', variantTitle: 'PoE+ / Managed / Rack-mount', quantity: 1, unitPrice: '$159.00', discount: '$0.00', tax: '$10.18', subtotal: '$169.18', fulfillmentStatus: '合规审查', fulfillmentNote: 'FCC认证待确认，暂停发货', weight: 2400, requiresShipping: true, channelSku: 'AMZ-NS-24P-POE', warehouseSku: 'WMS-NS-24P-POE', unit: '台' },
      { id: 'li_163', sku: 'EC-CAT6-10M', title: 'Ethernet Cable Cat6 10m', variantTitle: 'Cat6 / Blue / 10-meter', quantity: 2, unitPrice: '$18.00', discount: '$0.00', tax: '$2.30', subtotal: '$38.30', fulfillmentStatus: '合规审查', fulfillmentNote: '关联商品暂停', weight: 320, requiresShipping: true, channelSku: 'AMZ-EC-CAT6-10M', warehouseSku: 'WMS-EC-CAT6-10M', unit: '条' }
    ],
    customer: { name: 'Chris Martinez', email: 'chris.martinez@example.com', phone: '+1 (713) 555-0344', ordersCount: 12, totalSpent: '$2,890.00', tags: ['networking', 'b2b'], acceptsMarketing: false },
    shippingAddress: { name: 'Chris Martinez', company: 'Martinez IT Solutions', phone: '+1 (713) 555-0344', address1: '2300 Westheimer Rd, Suite 500', city: 'Houston', province: 'TX', country: 'US', zip: '77098', formatted: '2300 Westheimer Rd, Suite 500, Houston, TX 77098, US' },
    billingAddress: { name: 'Chris Martinez', company: 'Martinez IT Solutions', phone: '+1 (713) 555-0344', address1: '2300 Westheimer Rd, Suite 500', city: 'Houston', province: 'TX', country: 'US', zip: '77098', formatted: '2300 Westheimer Rd, Suite 500, Houston, TX 77098, US' },
    shippingMethod: 'UPS Ground (3-5 business days)',
    fulfillments: [
      {
        id: 'ful_161',
        status: 'in_transit',
        carrier: 'UPS',
        trackingNumber: '1Z999AA10567890123',
        trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10567890123',
        fulfillmentOrderNo: 'FO-20260603-0161',
        outboundOrderNo: 'OB-20260603-0161',
        outboundStatus: '已出库',
        packageNo: 'PKG-161-A',
        lineItemIds: ['li_161'],
        shippedAt: '2026-06-03 14:30',
        estimatedDelivery: '2026-06-06',
        warehouse: 'US-Central-DFW',
        matchedRule: '就近发货 + 库存充足',
        warehouseReason: 'Router 库存 DFW:35 · 距 Houston 380km · 合规通过即可发货'
      },
      {
        id: 'ful_162',
        status: 'cancelled',
        carrier: 'UPS',
        trackingNumber: '',
        fulfillmentOrderNo: 'FO-20260603-0162',
        outboundOrderNo: 'OB-20260603-0162',
        outboundStatus: '已暂停',
        lineItemIds: ['li_162', 'li_163'],
        warehouse: 'US-Central-DFW',
        matchedRule: '合规拦截 + 暂停发货',
        warehouseReason: 'Network Switch NS-24P-POE FCC认证异常，暂停出库 · 关联 Ethernet Cable 同步暂停'
      }
    ],
    transactions: [
      { id: 'txn_161', kind: 'sale', gateway: 'Amazon Pay', method: 'Amazon Pay (Visa ****2211)', amount: '$456.00', currency: 'USD', status: 'success', createdAt: '2026-06-03 09:15:30', gatewayReference: 'amz_pay_8K2n...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_16_10', time: '2026-06-03 18:00:00', actor: 'Kevin Zhang', actorRole: 'ops_manager', title: '订单部分保留', description: 'FO-0162 合规问题未解决，订单标记为保留 · FO-0161 (Router) 已正常发货不受影响', type: 'edit' },
      { id: 'evt_16_09', time: '2026-06-03 16:30:00', actor: '合规系统', actorRole: 'automation', title: '合规拦截 (FO-0162)', description: 'Network Switch NS-24P-POE FCC认证文件过期(2026-05-31) · 供应商尚未提供更新证书 · 暂停出库', type: 'fulfillment', ruleName: '合规校验规则', fulfillmentOrderNo: 'FO-20260603-0162' },
      { id: 'evt_16_08', time: '2026-06-03 16:28:00', actor: '系统', actorRole: 'automation', title: '出库暂停 (FO-0162)', description: '出库单 OB-20260603-0162 暂停执行，等待合规审查结果', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0162' },
      /* ─── FO-0161 正常发货 (Router) ─── */
      { id: 'evt_16_07', time: '2026-06-03 14:30:00', actor: 'US-Central-DFW', actorRole: 'warehouse_staff', title: '出库交接完成 (FO-0161)', description: '出库单 OB-20260603-0161 交接 UPS · Router 1 件 680g', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0161' },
      { id: 'evt_16_06', time: '2026-06-03 13:30:00', actor: 'US-Central-DFW', actorRole: 'warehouse_staff', title: '拣货打包完成 (FO-0161)', description: 'Router AX6000 拣货验货打包完成 · 标准包裹 680g · 等待 UPS 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260603-0161' },
      /* ─── 决策链 ─── */
      { id: 'evt_16_05', time: '2026-06-03 12:00:00', actor: '系统', actorRole: 'automation', title: '出库单已生成 (×2)', description: 'OB-20260603-0161 (Router) + OB-20260603-0162 (Switch+Cables) 下发至 US-Central-DFW', type: 'fulfillment' },
      { id: 'evt_16_04', time: '2026-06-03 11:50:00', actor: '履约引擎', actorRole: 'automation', title: '选仓决策', description: '4 件商品(含Cable×2) 库存查询 US-Central-DFW: Router✓ Switch✓ Cable✓ · 距 Houston 380km 最近有货仓 · 选定 DFW', type: 'fulfillment', ruleName: '就近发货策略' },
      { id: 'evt_16_03', time: '2026-06-03 11:45:00', actor: '履约引擎', actorRole: 'automation', title: '拆合单决策', description: '4 件商品按合规状态拆分: Router(合规通过)→FO-0161 · Switch+Cables(待合规审查)→FO-0162', type: 'fulfillment', ruleName: '合规拆单策略' },
      { id: 'evt_16_02', time: '2026-06-03 11:40:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '4 件商品全部 requiresShipping=true · Amazon Pay 已确认 ($456.00) · 风控 Low · B2B客户第12单 · 进入决策', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_16_01', time: '2026-06-03 09:15:00', actor: 'Amazon', actorRole: 'platform', title: '订单同步', description: 'Amazon 订单 #AMZ-30483001 同步至系统 · 自动确认支付', type: 'system' },
      /* ─── 物流跟踪: FO-0161 (UPS, Router) ─── */
      { id: 'evt_16_l1a', time: '2026-06-03 14:45:00', actor: 'UPS', actorRole: 'carrier', title: '揽收成功 (Router)', description: '包裹已取件 · OB-0161 Router · 发货仓 US-Central-DFW · 跟踪号 1Z999AA10567890123', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260603-0161' },
      { id: 'evt_16_l1b', time: '2026-06-04 02:00:00', actor: 'UPS', actorRole: 'carrier', title: '到达转运中心 (Router)', description: '到达 Houston TX UPS Hub · 进行本地分拣', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260603-0161' },
      { id: 'evt_16_l1c', time: '2026-06-04 09:00:00', actor: 'UPS', actorRole: 'carrier', title: '派送中 (Router)', description: '出发配送 · 目的地 2300 Westheimer Rd, Houston TX', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260603-0161' }
    ],
    note: 'B2B客户，Network Switch需FCC合规确认',
    tags: ['partial-hold', 'compliance', 'networking', 'amazon'],
    platformMeta: { 'amazon_order_id': 'AMZ-30483001', 'fulfillment_channel': 'MFN', 'ship_service_level': 'Std US D2D Dom' }
  },

  /* ═══ so_017: 物流异常 — 投递失败/客户不在家 ═══ */
  so_017: {
    id: 'so_017',
    orderNo: 'SO-20260601-0017',
    platformOrderNo: '#SH-7290500',
    confirmationNumber: 'USORD0017',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '已发货',
    financialStatus: '已支付',
    fulfillmentStatus: '已发货',
    riskLevel: 'low',
    exception: '投递失败',
    createdAt: '2026-06-01 10:30:00',
    updatedAt: '2026-06-03 16:00:00',
    currency: 'USD',
    subtotal: '$329.00',
    totalDiscount: '$0.00',
    totalShipping: '$25.00',
    totalTax: '$26.32',
    totalPrice: '$380.32',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_171', sku: 'AP-HEPA-L', title: 'Air Purifier', variantTitle: 'HEPA / Large Room / White', quantity: 1, unitPrice: '$249.00', discount: '$0.00', tax: '$19.92', subtotal: '$268.92', fulfillmentStatus: '已发货', fulfillmentNote: '投递失败，等待重新派送', weight: 6800, requiresShipping: true, channelSku: 'SH-AP-HEPA-L', warehouseSku: 'WMS-AP-HEPA-L', unit: '台' },
      { id: 'li_172', sku: 'RF-HEPA-2PK', title: 'Replacement Filter 2-Pack', variantTitle: 'HEPA / Compatible AP-L / 2-Pack', quantity: 2, unitPrice: '$40.00', discount: '$0.00', tax: '$6.40', subtotal: '$86.40', fulfillmentStatus: '已发货', fulfillmentNote: '投递失败，等待重新派送', weight: 450, requiresShipping: true, channelSku: 'SH-RF-HEPA-2PK', warehouseSku: 'WMS-RF-HEPA-2PK', unit: '件' }
    ],
    customer: { name: 'Amanda Foster', email: 'amanda.foster@example.com', phone: '+1 (503) 555-0198', ordersCount: 3, totalSpent: '$680.00', tags: ['home-appliance'], acceptsMarketing: true },
    shippingAddress: { name: 'Amanda Foster', phone: '+1 (503) 555-0198', address1: '735 NW Hoyt St, Apt 8B', city: 'Portland', province: 'OR', country: 'US', zip: '97209', formatted: '735 NW Hoyt St, Apt 8B, Portland, OR 97209, US' },
    billingAddress: { name: 'Amanda Foster', phone: '+1 (503) 555-0198', address1: '735 NW Hoyt St, Apt 8B', city: 'Portland', province: 'OR', country: 'US', zip: '97209', formatted: '735 NW Hoyt St, Apt 8B, Portland, OR 97209, US' },
    shippingMethod: 'FedEx Home Delivery (2-5 business days)',
    fulfillments: [
      {
        id: 'ful_171',
        status: 'in_transit',
        carrier: 'FedEx',
        trackingNumber: 'FX-PDX-20260601-017',
        trackingUrl: 'https://www.fedex.com/track?trknbr=FX-PDX-20260601-017',
        fulfillmentOrderNo: 'FO-20260601-0171',
        outboundOrderNo: 'OB-20260601-0171',
        outboundStatus: '已出库',
        packageNo: 'PKG-171-A',
        lineItemIds: ['li_171', 'li_172'],
        shippedAt: '2026-06-01 16:00',
        estimatedDelivery: '2026-06-03',
        warehouse: 'US-West-SEA',
        matchedRule: '就近发货 + 库存充足',
        warehouseReason: 'Air Purifier + Filters 库存 SEA:12 · 距 Portland 280km · FedEx Home 2-3天'
      }
    ],
    transactions: [
      { id: 'txn_171', kind: 'sale', gateway: 'Stripe', method: 'Mastercard ****6699', amount: '$380.32', currency: 'USD', status: 'success', createdAt: '2026-06-01 10:30:25', gatewayReference: 'ch_3Lm7P9XR...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_17_10', time: '2026-06-03 16:00:00', actor: 'FedEx', actorRole: 'carrier', title: '重新派送已安排', description: '客户通过 FedEx Delivery Manager 重新预约 · 新配送日期: 2026-06-04 · 时段: 14:00-18:00', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_09', time: '2026-06-03 15:30:00', actor: '系统', actorRole: 'automation', title: '物流异常标记', description: '检测到投递失败事件 · 订单标记异常: 投递失败 · 等待重新派送或客户操作', type: 'system' },
      { id: 'evt_17_08', time: '2026-06-03 14:20:00', actor: 'FedEx', actorRole: 'carrier', title: '投递失败', description: '配送员到达 735 NW Hoyt St Apt 8B · 无人应答 · 已留下投递通知 · 将尝试次日重新配送', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_07', time: '2026-06-03 08:30:00', actor: 'FedEx', actorRole: 'carrier', title: '派送中', description: '离开 Portland OR 配送站 · 预计今日 12:00-18:00 送达', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_06', time: '2026-06-02 22:00:00', actor: 'FedEx', actorRole: 'carrier', title: '到达配送站', description: '到达 Portland OR 配送站 · 预计明日配送', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_05', time: '2026-06-02 06:00:00', actor: 'FedEx', actorRole: 'carrier', title: '运输中', description: '离开 Seattle WA Hub · 发往 Portland OR', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_04', time: '2026-06-01 16:15:00', actor: 'FedEx', actorRole: 'carrier', title: '揽收成功', description: '司机已取件 · OB-0171 Air Purifier + Filters · 发货仓 US-West-SEA · 跟踪号 FX-PDX-20260601-017', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260601-0171' },
      /* ─── 仓库执行 ─── */
      { id: 'evt_17_03', time: '2026-06-01 16:00:00', actor: 'US-West-SEA', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260601-0171 交接 FedEx · Air Purifier(6.8kg) + Filter 2-Pack×2(0.9kg) 总重 7.7kg', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_02b', time: '2026-06-01 14:00:00', actor: 'US-West-SEA', actorRole: 'warehouse_staff', title: '拣货打包完成', description: '3 件商品拣货验货完成 · 双层泡沫包装(大件家电) · 等待 FedEx 取件', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260601-0171' },
      /* ─── 决策链 ─── */
      { id: 'evt_17_02a', time: '2026-06-01 12:00:00', actor: '履约引擎', actorRole: 'automation', title: '选仓+承运商决策', description: 'US-West-SEA: 库存充足 AP-HEPA-L:12 / RF-HEPA-2PK:40 · 距Portland 280km · 总重7.7kg · FedEx Home Delivery 2-3天', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260601-0171' },
      { id: 'evt_17_02', time: '2026-06-01 11:50:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '3 件商品(含Filter×2) requiresShipping=true · 支付已确认 (Stripe $380.32) · 风控 Low · 准入通过', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_17_01b', time: '2026-06-01 10:30:25', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Mastercard ****6699 收款 $380.32', type: 'payment' },
      { id: 'evt_17_01', time: '2026-06-01 10:30:00', actor: 'Amanda Foster', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (Chrome) 提交', type: 'customer' }
    ],
    note: '',
    tags: ['delivery-failed', 'reschedule', 'home-appliance'],
    platformMeta: { 'shopify_order_id': '5820173270500', 'landing_site': '/products/air-purifier-hepa', 'referring_site': 'https://google.com' }
  },

  /* ═══ so_018: 已完成 + 部分退款 — 商品瑕疵退款 ═══ */
  so_018: {
    id: 'so_018',
    orderNo: 'SO-20260530-0018',
    platformOrderNo: '#SH-7290400',
    confirmationNumber: 'USORD0018',
    referenceNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    sourceType: 'web',
    status: '已完成',
    financialStatus: '部分退款',
    fulfillmentStatus: '已签收',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-05-30 14:00:00',
    updatedAt: '2026-06-05 10:00:00',
    closedAt: '2026-06-05 10:00:00',
    currency: 'USD',
    subtotal: '$613.00',
    totalDiscount: '$0.00',
    totalShipping: '$30.00',
    totalTax: '$49.04',
    totalPrice: '$692.04',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_181', sku: 'SDT-OAK-140', title: 'Standing Desk Top', variantTitle: 'Oak / 140×70cm / Natural', quantity: 1, unitPrice: '$320.00', discount: '$0.00', tax: '$25.60', subtotal: '$345.60', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 18000, requiresShipping: true, channelSku: 'SH-SDT-OAK-140', warehouseSku: 'WMS-SDT-OAK-140', unit: '件' },
      { id: 'li_182', sku: 'MLB-LED-PRO', title: 'Monitor Light Bar', variantTitle: 'LED Pro / Black / USB-C', quantity: 1, unitPrice: '$89.00', discount: '$0.00', tax: '$7.12', subtotal: '$96.12', fulfillmentStatus: '已退款', fulfillmentNote: '商品瑕疵，已退款', weight: 420, requiresShipping: true, channelSku: 'SH-MLB-LED-PRO', warehouseSku: 'WMS-MLB-LED-PRO', unit: '件' },
      { id: 'li_183', sku: 'DS-BM-60', title: 'Desk Shelf', variantTitle: 'Bamboo / 60cm / Monitor Riser', quantity: 1, unitPrice: '$159.00', discount: '$0.00', tax: '$12.72', subtotal: '$171.72', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 2800, requiresShipping: true, channelSku: 'SH-DS-BM-60', warehouseSku: 'WMS-DS-BM-60', unit: '件' },
      { id: 'li_184', sku: 'UH-7P-USB3', title: 'USB Hub 7-port', variantTitle: 'USB 3.0 / Aluminum / Silver', quantity: 1, unitPrice: '$45.00', discount: '$0.00', tax: '$3.60', subtotal: '$48.60', fulfillmentStatus: '已签收', fulfillmentNote: '客户已签收', weight: 180, requiresShipping: true, channelSku: 'SH-UH-7P-USB3', warehouseSku: 'WMS-UH-7P-USB3', unit: '件' }
    ],
    customer: { name: 'Mark Thompson', email: 'mark.thompson@example.com', phone: '+1 (404) 555-0422', ordersCount: 6, totalSpent: '$1,850.00', tags: ['desk-setup', 'returning'], acceptsMarketing: true },
    shippingAddress: { name: 'Mark Thompson', phone: '+1 (404) 555-0422', address1: '250 Peachtree St NE, Apt 1501', city: 'Atlanta', province: 'GA', country: 'US', zip: '30303', formatted: '250 Peachtree St NE, Apt 1501, Atlanta, GA 30303, US' },
    billingAddress: { name: 'Mark Thompson', phone: '+1 (404) 555-0422', address1: '250 Peachtree St NE, Apt 1501', city: 'Atlanta', province: 'GA', country: 'US', zip: '30303', formatted: '250 Peachtree St NE, Apt 1501, Atlanta, GA 30303, US' },
    shippingMethod: 'FedEx Ground (3-5 business days)',
    fulfillments: [
      {
        id: 'ful_181',
        status: 'delivered',
        carrier: 'FedEx',
        trackingNumber: 'FX-ATL-20260530-018',
        trackingUrl: 'https://www.fedex.com/track?trknbr=FX-ATL-20260530-018',
        fulfillmentOrderNo: 'FO-20260530-0181',
        outboundOrderNo: 'OB-20260530-0181',
        outboundStatus: '已出库',
        packageNo: 'PKG-181-A',
        lineItemIds: ['li_181', 'li_182', 'li_183', 'li_184'],
        shippedAt: '2026-05-31 10:00',
        deliveredAt: '2026-06-02 14:30',
        estimatedDelivery: '2026-06-03',
        warehouse: 'US-East-EWR',
        matchedRule: '就近发货 + 库存充足',
        warehouseReason: '4 件商品 EWR 库存充足 · 距 Atlanta 1,300km · FedEx Ground 3-5天'
      }
    ],
    transactions: [
      { id: 'txn_181', kind: 'sale', gateway: 'Stripe', method: 'Visa ****3388', amount: '$692.04', currency: 'USD', status: 'success', createdAt: '2026-05-30 14:00:30', gatewayReference: 'ch_5Kn8R2YT...' },
      { id: 'txn_182', kind: 'refund', gateway: 'Stripe', method: 'Visa ****3388', amount: '$96.12', currency: 'USD', status: 'success', createdAt: '2026-06-05 09:30:00', gatewayReference: 're_4Xp2M7NQ...' }
    ],
    refunds: [
      { id: 'ref_181', reason: '商品瑕疵', amount: '$96.12', lineItems: [{ lineItemId: 'li_182', quantity: 1 }], createdAt: '2026-06-05 09:30:00', note: 'Monitor Light Bar LED灯珠有明显色差，客户拍照确认，同意退款无需退货' }
    ],
    events: [
      { id: 'evt_18_12', time: '2026-06-05 10:00:00', actor: '系统', actorRole: 'automation', title: '订单完成', description: '所有商品已签收 · 退款已处理 · 订单关闭', type: 'system' },
      { id: 'evt_18_11', time: '2026-06-05 09:30:00', actor: '系统', actorRole: 'automation', title: '退款完成', description: 'Monitor Light Bar 退款 $96.12 至 Visa ****3388 · 预计 3-5 工作日到账 · 无需退货', type: 'payment' },
      { id: 'evt_18_10', time: '2026-06-05 09:15:00', actor: 'Lisa Support', actorRole: 'cs_agent', title: '退款审批通过', description: '客服审核客户提供的瑕疵照片 · LED色差明显 · 同意仅退款不退货 · 金额 $96.12 (含税)', type: 'edit' },
      { id: 'evt_18_09', time: '2026-06-04 20:00:00', actor: 'Mark Thompson', actorRole: 'customer', title: '退款申请', description: '客户通过售后系统提交退款申请 · 原因: Monitor Light Bar LED灯珠色差 · 附带照片证据', type: 'customer' },
      { id: 'evt_18_08', time: '2026-06-02 14:30:00', actor: 'FedEx', actorRole: 'carrier', title: '签收成功', description: '包裹已签收 · 签收人: M. Thompson · 地址: 250 Peachtree St NE Apt 1501', type: 'logistics', trackingNode: 'delivered', fulfillmentOrderNo: 'FO-20260530-0181' },
      { id: 'evt_18_07', time: '2026-06-02 08:00:00', actor: 'FedEx', actorRole: 'carrier', title: '派送中', description: '离开 Atlanta GA 配送站 · 预计今日 12:00-18:00 送达', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260530-0181' },
      { id: 'evt_18_06', time: '2026-06-01 18:00:00', actor: 'FedEx', actorRole: 'carrier', title: '到达配送站', description: '到达 Atlanta GA 配送站 · 预计明日配送', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260530-0181' },
      { id: 'evt_18_05', time: '2026-05-31 22:00:00', actor: 'FedEx', actorRole: 'carrier', title: '运输中', description: '到达 Charlotte NC 转运中心 · 重件分拣区', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260530-0181' },
      { id: 'evt_18_04', time: '2026-05-31 10:15:00', actor: 'FedEx', actorRole: 'carrier', title: '揽收成功', description: '司机已取件 · OB-0181 4件商品 · 发货仓 US-East-EWR · 跟踪号 FX-ATL-20260530-018', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260530-0181' },
      /* ─── 仓库执行 ─── */
      { id: 'evt_18_03', time: '2026-05-31 10:00:00', actor: 'US-East-EWR', actorRole: 'warehouse_staff', title: '出库交接完成', description: '出库单 OB-20260530-0181 交接 FedEx · 4件商品总重 21.4kg · 大件加固包装', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260530-0181' },
      /* ─── 决策链 ─── */
      { id: 'evt_18_02', time: '2026-05-30 16:00:00', actor: '履约引擎', actorRole: 'automation', title: '选仓+承运商决策', description: 'US-East-EWR: 4件库存均充足 · 总重 21.4kg · 距Atlanta 1300km · FedEx Ground 3-5天 · 大件加固包装', type: 'fulfillment', ruleName: '就近发货策略', fulfillmentOrderNo: 'FO-20260530-0181' },
      { id: 'evt_18_01b', time: '2026-05-30 14:00:30', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa ****3388 收款 $692.04', type: 'payment' },
      { id: 'evt_18_01', time: '2026-05-30 14:00:00', actor: 'Mark Thompson', actorRole: 'customer', title: '订单创建', description: '通过 Shopify Web Checkout (Chrome) 提交', type: 'customer' }
    ],
    note: '',
    tags: ['completed', 'partial-refund', 'desk-setup', 'defect'],
    platformMeta: { 'shopify_order_id': '5820173270400', 'landing_site': '/collections/desk-setup', 'referring_site': 'https://pinterest.com' }
  },

  /* ═══ so_019: 跨境海运整柜 (FCL) — Walmart B2B 大批量 ═══ */
  so_019: {
    id: 'so_019',
    orderNo: 'SO-20260528-0019',
    platformOrderNo: '#WMT-90281773',
    confirmationNumber: '',
    referenceNo: 'PO-WMT-2026-0528',
    channel: 'Walmart',
    merchant: 'US Store',
    sourceType: 'b2b',
    status: '已发货',
    financialStatus: '已支付',
    fulfillmentStatus: '已发货',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-05-28 09:00:00',
    updatedAt: '2026-06-10 08:00:00',
    currency: 'USD',
    subtotal: '$16,500.00',
    totalDiscount: '$0.00',
    totalShipping: '$1,200.00',
    totalTax: '$800.00',
    totalPrice: '$18,500.00',
    taxesIncluded: false,
    paymentGateway: 'Wire Transfer',
    discountCodes: [],
    lineItems: [
      { id: 'li_191', sku: 'LDL-WHT-PRO', title: 'LED Desk Lamp', variantTitle: 'White / Pro', quantity: 200, unitPrice: '$45.00', discount: '$0.00', tax: '$400.00', subtotal: '$9,400.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-05-LDL-001', serialNumbers: ['SN-LDL-20260520-0001', 'SN-LDL-20260520-0002', 'SN-LDL-20260520-0003', 'SN-LDL-20260520-0004', 'SN-LDL-20260520-0005', 'SN-LDL-20260520-0006', 'SN-LDL-20260520-0007', 'SN-LDL-20260520-0008', 'SN-LDL-20260520-0009', 'SN-LDL-20260520-0010', 'SN-LDL-20260520-0011', 'SN-LDL-20260520-0012'], weight: 850, requiresShipping: true, channelSku: 'WMT-LDL-WHT-PRO', warehouseSku: 'WMS-LDL-WHT-PRO', unit: '件' },
      { id: 'li_192', sku: 'UC-3P-BLK', title: 'USB Charger 3-port', variantTitle: 'Black / 30W', quantity: 300, unitPrice: '$22.00', discount: '$0.00', tax: '$400.00', subtotal: '$7,000.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-05-UC3P-002', serialNumbers: ['SN-UC3P-20260518-0001', 'SN-UC3P-20260518-0002', 'SN-UC3P-20260518-0003', 'SN-UC3P-20260518-0004', 'SN-UC3P-20260518-0005', 'SN-UC3P-20260518-0006', 'SN-UC3P-20260518-0007', 'SN-UC3P-20260518-0008'], weight: 120, requiresShipping: true, channelSku: 'WMT-UC-3P-BLK', warehouseSku: 'WMS-UC-3P-BLK', unit: '件' }
    ],
    customer: { name: 'Walmart DC #6042', email: 'receiving@walmart-dc6042.com', phone: '+1 (479) 555-0100', ordersCount: 45, totalSpent: '$890,000.00', tags: ['B2B', 'walmart', 'bulk'], acceptsMarketing: false },
    shippingAddress: { name: 'Walmart Distribution Center #6042', phone: '+1 (479) 555-0100', address1: '1301 SE 10th St', city: 'Bentonville', province: 'AR', country: 'US', zip: '72712', formatted: '1301 SE 10th St, Bentonville, AR 72712, US' },
    billingAddress: { name: 'Walmart Inc. Accounts Payable', phone: '+1 (479) 555-0100', address1: '702 SW 8th St', city: 'Bentonville', province: 'AR', country: 'US', zip: '72716', formatted: '702 SW 8th St, Bentonville, AR 72716, US' },
    shippingMethod: 'Ocean Freight FCL (Shanghai → Long Beach)',
    fulfillments: [
      {
        id: 'ful_191',
        status: 'in_transit',
        carrier: 'COSCO Shipping',
        trackingNumber: 'COSU-6284719',
        shippingMode: 'sea_fcl',
        serviceLevel: 'FCL 40HC (Shanghai → Long Beach)',
        masterTrackingNo: 'MBL-COSU-2026052801',
        bolNumber: 'BOL-COSU-SH-LB-20260530',
        vesselVoyage: 'COSCO PRIDE V.2608E',
        containerNo: 'CSLU2185437',
        sealNo: 'SH20260530-001',
        containerType: '40HC',
        portOfLoading: 'Shanghai (CNSHA)',
        portOfDischarge: 'Long Beach (USLGB)',
        fulfillmentOrderNo: 'FO-20260528-0191',
        outboundOrderNo: 'OB-20260528-0191',
        outboundStatus: '已出库',
        packageNo: 'PLT-SH-20260530',
        packageCount: 25,
        palletCount: 4,
        totalWeight: '2,850 kg',
        dimensions: '40HC 集装箱 12.0×2.3×2.7m',
        lineItemIds: ['li_191', 'li_192'],
        shippedAt: '2026-05-30 16:00',
        estimatedDelivery: '2026-06-18',
        warehouse: 'CN-Shanghai-PVG',
        matchedRule: 'B2B海运整柜策略',
        warehouseReason: '上海仓出口至美国，40HC整柜装满率92%',
        packages: [
          { id: 'pkg_191_p1', type: 'pallet', no: 'PLT-SH-20260530-001', weight: '720 kg', dimensions: '120×100×160 cm', lineItemIds: ['li_191'], note: 'LED Desk Lamp ×50 · 批次 B2026-05-LDL-001 · SN: 0001~0050' },
          { id: 'pkg_191_p2', type: 'pallet', no: 'PLT-SH-20260530-002', weight: '720 kg', dimensions: '120×100×160 cm', lineItemIds: ['li_191'], note: 'LED Desk Lamp ×50 · 批次 B2026-05-LDL-001 · SN: 0051~0100' },
          { id: 'pkg_191_p3', type: 'pallet', no: 'PLT-SH-20260530-003', weight: '720 kg', dimensions: '120×100×160 cm', lineItemIds: ['li_191', 'li_192'], note: 'LED Desk Lamp ×50 (SN: 0101~0150) + Charger ×100 (SN: 0001~0100)' },
          { id: 'pkg_191_p4', type: 'pallet', no: 'PLT-SH-20260530-004', weight: '690 kg', dimensions: '120×100×150 cm', lineItemIds: ['li_191', 'li_192'], note: 'LED Desk Lamp ×50 (SN: 0151~0200) + Charger ×200 (SN: 0101~0300)' }
        ]
      }
    ],
    transactions: [
      { id: 'txn_191', kind: 'sale', gateway: 'Wire Transfer', method: 'Bank Wire (T/T)', amount: '$18,500.00', currency: 'USD', status: 'success', createdAt: '2026-05-28 10:00:00', gatewayReference: 'WT-WMT-20260528-001' }
    ],
    refunds: [],
    events: [
      { id: 'evt_19_10', time: '2026-06-10 08:00:00', actor: 'COSCO Shipping', actorRole: 'carrier', title: '到达目的港', description: '集装箱 CSLU2185437 到达 Long Beach 港 · 等待清关和卸货', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_09', time: '2026-06-05 12:00:00', actor: 'COSCO Shipping', actorRole: 'carrier', title: '海上运输中', description: 'COSCO PRIDE V.2608E 太平洋航段 · 预计 6月10日抵达 Long Beach', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_08', time: '2026-05-31 06:00:00', actor: 'COSCO Shipping', actorRole: 'carrier', title: '船舶离港', description: 'COSCO PRIDE V.2608E 离开上海港 · 目的港 Long Beach · 预计航程 12天', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_07', time: '2026-05-30 16:00:00', actor: 'CN-Shanghai-PVG', actorRole: 'warehouse_staff', title: '集装箱装载完成', description: '集装箱 CSLU2185437 装载完毕 · 封条 SH20260530-001 · 4托盘 25箱 · 总重 2,850kg · 装满率 92%', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_06', time: '2026-05-30 10:00:00', actor: 'CN-Shanghai-PVG', actorRole: 'warehouse_staff', title: '出库打包完成', description: '出库单 OB-20260528-0191 · 200件LED Desk Lamp + 300件USB Charger · 打托4板完成 · 待装柜', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_05', time: '2026-05-29 14:00:00', actor: 'CN-Shanghai-PVG', actorRole: 'warehouse_staff', title: '仓库拣货完成', description: '出库单 OB-20260528-0191 拣货完成 · 500件商品 · 质检通过 · 进入打包区', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_04', time: '2026-05-28 16:00:00', actor: '履约引擎', actorRole: 'automation', title: '选仓+运输决策', description: 'B2B大批量500件 · 总重超2吨 · 匹配海运整柜策略 · 上海仓FCL 40HC出口 · 预计航程 12-15天', type: 'fulfillment', ruleName: 'B2B海运整柜策略', fulfillmentOrderNo: 'FO-20260528-0191' },
      { id: 'evt_19_03', time: '2026-05-28 15:00:00', actor: '履约引擎', actorRole: 'automation', title: '履约资格判定', description: '500件商品 · B2B订单 · 支付已确认 (Wire Transfer) · 风控 Low · 准入通过', type: 'fulfillment', ruleName: '履约准入规则' },
      { id: 'evt_19_02', time: '2026-05-28 10:00:00', actor: 'Wire Transfer', actorRole: 'payment_gateway', title: '支付确认', description: 'T/T电汇 $18,500.00 到账确认', type: 'payment' },
      { id: 'evt_19_01', time: '2026-05-28 09:00:00', actor: 'Walmart DC #6042', actorRole: 'customer', title: '订单创建', description: '通过 Walmart Supplier Portal 提交 B2B 采购订单 PO-WMT-2026-0528', type: 'customer' }
    ],
    note: 'Walmart DC #6042 月度补货订单',
    tags: ['B2B', 'walmart', 'ocean-freight', 'fcl', 'cross-border'],
    platformMeta: { 'walmart_po': 'PO-WMT-2026-0528', 'supplier_id': 'SUP-CN-20230401', 'dc_number': '6042' }
  },

  /* ═══ so_020: 跨境空运 DHL International — 加急跨境 ═══ */
  so_020: {
    id: 'so_020',
    orderNo: 'SO-20260602-0020',
    platformOrderNo: '#SH-7290300',
    confirmationNumber: 'UKURG0020',
    referenceNo: 'URGENT-UK-2026',
    channel: 'Shopify',
    merchant: 'UK Store',
    sourceType: 'b2b',
    status: '已发货',
    financialStatus: '已支付',
    fulfillmentStatus: '已发货',
    riskLevel: 'low',
    exception: '',
    createdAt: '2026-06-02 14:00:00',
    updatedAt: '2026-06-03 10:00:00',
    currency: 'GBP',
    subtotal: '£3,800.00',
    totalDiscount: '£0.00',
    totalShipping: '£280.00',
    totalTax: '£122.00',
    totalPrice: '£4,200.00',
    taxesIncluded: false,
    paymentGateway: 'Stripe',
    discountCodes: [],
    lineItems: [
      { id: 'li_201', sku: 'WC-QI-15W', title: 'Wireless Charger', variantTitle: 'Qi / 15W', quantity: 10, unitPrice: '£180.00', discount: '£0.00', tax: '£61.00', subtotal: '£1,861.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-05-WC', weight: 220, requiresShipping: true, channelSku: 'SH-WC-QI-15W', warehouseSku: 'WMS-WC-QI-15W', unit: '台' },
      { id: 'li_202', sku: 'UH-7P-TB4', title: 'USB Hub Pro', variantTitle: '7-Port / Thunderbolt 4', quantity: 10, unitPrice: '£200.00', discount: '£0.00', tax: '£61.00', subtotal: '£2,061.00', fulfillmentStatus: '已发货', fulfillmentNote: '包裹运输中', batchNo: 'B2026-05-UH', serialNumbers: ['SN-UH7P-0601', 'SN-UH7P-0602', 'SN-UH7P-0603', 'SN-UH7P-0604', 'SN-UH7P-0605', 'SN-UH7P-0606', 'SN-UH7P-0607', 'SN-UH7P-0608', 'SN-UH7P-0609', 'SN-UH7P-0610'], weight: 380, requiresShipping: true, channelSku: 'SH-UH-7P-TB4', warehouseSku: 'WMS-UH-7P-TB4', unit: '台' }
    ],
    customer: { name: 'Tech Solutions Ltd', email: 'procurement@techsolutions.co.uk', phone: '+44 20 7946 1234', ordersCount: 12, totalSpent: '£58,000.00', tags: ['B2B', 'uk-business', 'priority'], acceptsMarketing: true },
    shippingAddress: { name: 'Tech Solutions Ltd', company: 'Tech Solutions Ltd', phone: '+44 20 7946 1234', address1: '50 Eastcastle St', city: 'London', province: '', country: 'GB', zip: 'W1W 8EA', formatted: '50 Eastcastle St, London W1W 8EA, GB' },
    billingAddress: { name: 'Tech Solutions Ltd', company: 'Tech Solutions Ltd', phone: '+44 20 7946 1234', address1: '50 Eastcastle St', city: 'London', province: '', country: 'GB', zip: 'W1W 8EA', formatted: '50 Eastcastle St, London W1W 8EA, GB' },
    shippingMethod: 'DHL Express International (Air)',
    fulfillments: [
      {
        id: 'ful_201',
        status: 'in_transit',
        carrier: 'DHL Express',
        trackingNumber: 'DHL-2026060200142',
        trackingUrl: 'https://www.dhl.com/track?id=DHL-2026060200142',
        shippingMode: 'air',
        serviceLevel: 'DHL Express Worldwide (1-3 days)',
        mawb: '176-28491057',
        hawb: 'HWB-SH-LON-20260603',
        flightNo: 'BA0168',
        departureAirport: 'PVG (Shanghai Pudong)',
        arrivalAirport: 'LHR (London Heathrow)',
        fulfillmentOrderNo: 'FO-20260602-0201',
        outboundOrderNo: 'OB-20260602-0201',
        outboundStatus: '已出库',
        packageNo: 'PKG-201-A',
        packageCount: 2,
        totalWeight: '6.0 kg',
        dimensions: '2箱 45×35×30 cm',
        lineItemIds: ['li_201', 'li_202'],
        shippedAt: '2026-06-03 08:00',
        estimatedDelivery: '2026-06-05',
        warehouse: 'CN-Shanghai-PVG',
        matchedRule: '加急国际空运策略',
        warehouseReason: 'UK客户加急订单，匹配DHL Express 1-3天达',
        packages: [
          { id: 'pkg_201_1', type: 'carton', no: 'CTN-DHL-20260603-A', weight: '2.4 kg', dimensions: '45×35×30 cm', lineItemIds: ['li_201'], note: 'Wireless Charger ×10, 防震泡棉包装' },
          { id: 'pkg_201_2', type: 'carton', no: 'CTN-DHL-20260603-B', weight: '3.6 kg', dimensions: '45×35×30 cm', lineItemIds: ['li_202'], note: 'USB Hub Pro ×10, 独立SN贴标' }
        ]
      }
    ],
    transactions: [
      { id: 'txn_201', kind: 'sale', gateway: 'Stripe', method: 'Visa Business ****8800', amount: '£4,200.00', currency: 'GBP', status: 'success', createdAt: '2026-06-02 14:02:00', gatewayReference: 'ch_7Uk9P3QR...' }
    ],
    refunds: [],
    events: [
      { id: 'evt_20_10', time: '2026-06-04 16:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '派送中', description: 'DHL快递员派送中 · 目的地 50 Eastcastle St, London W1W 8EA · 预计今日18:00前送达', type: 'logistics', trackingNode: 'out_for_delivery', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_09', time: '2026-06-04 10:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '进口清关完成', description: '英国海关清关完成 · HMRC申报通过 · 关税已预付 (DDP) · 放行至 DHL Heathrow Hub', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_08', time: '2026-06-04 06:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '到达目的地机场', description: '航班 BA0168 降落 London Heathrow · 货物进入海关监管区', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_07', time: '2026-06-03 14:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '空运中', description: '航班 BA0168 PVG→LHR · 预计飞行 12小时 · 2箱 6.0kg', type: 'logistics', trackingNode: 'in_transit', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_06', time: '2026-06-03 10:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '出口清关完成', description: '中国海关出口清关完成 · 报关单号 CD-20260603-DHL-001 · 货物放行', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_05', time: '2026-06-03 08:00:00', actor: 'DHL Express', actorRole: 'carrier', title: '揽收成功', description: 'DHL快递员已取件 · 上海浦东仓 · 2箱 总重6.0kg · 运单号 DHL-2026060200142', type: 'logistics', trackingNode: 'picked_up', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_04', time: '2026-06-03 06:00:00', actor: 'CN-Shanghai-PVG', actorRole: 'warehouse_staff', title: '出库完成', description: '出库单 OB-20260602-0201 · 2箱已打包 · Charger×10 + Hub×10 · SN贴标完成 · 等待DHL揽收', type: 'fulfillment', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_03', time: '2026-06-02 18:00:00', actor: '履约引擎', actorRole: 'automation', title: '选仓+运输决策', description: '加急国际订单 · UK客户 · 匹配DHL Express Worldwide 1-3天 · 上海仓直发 · MAWB: 176-28491057', type: 'fulfillment', ruleName: '加急国际空运策略', fulfillmentOrderNo: 'FO-20260602-0201' },
      { id: 'evt_20_02', time: '2026-06-02 14:02:00', actor: 'Stripe', actorRole: 'payment_gateway', title: '支付成功', description: 'Visa Business ****8800 收款 £4,200.00', type: 'payment' },
      { id: 'evt_20_01', time: '2026-06-02 14:00:00', actor: 'Tech Solutions Ltd', actorRole: 'customer', title: '订单创建', description: '通过 Shopify B2B 加急渠道提交 · 备注: URGENT delivery needed', type: 'customer' }
    ],
    note: 'URGENT - client demo next week, need delivery by June 5',
    tags: ['B2B', 'urgent', 'air-freight', 'cross-border', 'uk'],
    platformMeta: { 'shopify_order_id': '5820173270300', 'landing_site': '/b2b/bulk-order', 'note_attributes': 'priority=urgent' }
  }
};
