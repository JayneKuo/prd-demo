export type OrderLineItem = {
  id: string;
  sku: string;
  name: string;
  variant: string;
  quantity: number;
  unitPrice: string;
  total: string;
  image?: string;
};

export type OrderTimeline = {
  id: string;
  time: string;
  action: string;
  actor: string;
  detail?: string;
};

export type OrderDetail = {
  id: string;
  orderNo: string;
  platformNo: string;
  refNo: string;
  channel: string;
  merchant: string;
  status: string;
  payment: string;
  fulfillment: string;
  exception: string;
  orderTime: string;
  updatedTime: string;
  // Customer
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  // Shipping
  shipping: {
    name: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
    method: string;
    trackingNo: string;
    carrier: string;
  };
  // Financial
  subtotal: string;
  shippingFee: string;
  tax: string;
  discount: string;
  total: string;
  currency: string;
  // Items
  items: OrderLineItem[];
  // Timeline
  timeline: OrderTimeline[];
  // Notes
  internalNotes: string;
  customerNote: string;
};

export const orderDetailMap: Record<string, OrderDetail> = {
  so_001: {
    id: 'so_001',
    orderNo: 'SO-20260604-0001',
    platformNo: '#SH-7291034',
    refNo: 'PO-2024-8821',
    channel: 'Shopify',
    merchant: 'US Store',
    status: '待处理',
    payment: '已支付',
    fulfillment: '未开始',
    exception: '',
    orderTime: '2026-06-04 16:29:00',
    updatedTime: '2026-06-04 16:29:00',
    customer: {
      name: 'Emily Johnson',
      email: 'emily.j@example.com',
      phone: '+1 (212) 555-0147'
    },
    shipping: {
      name: 'Emily Johnson',
      address: '350 Fifth Avenue, Suite 4500',
      city: 'New York, NY',
      country: 'United States',
      postalCode: '10118',
      method: 'Standard Shipping',
      trackingNo: '',
      carrier: ''
    },
    subtotal: '$179.00',
    shippingFee: '$10.00',
    tax: '$0.00',
    discount: '-$0.00',
    total: '$189.00',
    currency: 'USD',
    items: [
      { id: 'li_001', sku: 'WEP-001', name: 'Wireless Earbuds Pro', variant: 'Black', quantity: 1, unitPrice: '$99.00', total: '$99.00' },
      { id: 'li_002', sku: 'PHC-012', name: 'Phone Case Clear', variant: 'iPhone 15 Pro', quantity: 1, unitPrice: '$29.00', total: '$29.00' },
      { id: 'li_003', sku: 'USC-2M', name: 'USB-C Cable 2m', variant: 'White', quantity: 1, unitPrice: '$51.00', total: '$51.00' }
    ],
    timeline: [
      { id: 'tl_1', time: '06-04 16:29', action: '订单创建', actor: '系统', detail: '来自 Shopify 渠道同步' },
      { id: 'tl_2', time: '06-04 16:29', action: '支付确认', actor: '系统', detail: 'Stripe 支付成功，金额 $189.00' },
      { id: 'tl_3', time: '06-04 16:30', action: '自动分配仓库', actor: '系统', detail: '规则匹配 → US East Warehouse' }
    ],
    internalNotes: '高价值客户，优先处理',
    customerNote: 'Please gift wrap if possible.'
  },
  so_002: {
    id: 'so_002',
    orderNo: 'SO-20260604-0002',
    platformNo: '#SH-7291078',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    status: '处理中',
    payment: '已支付',
    fulfillment: '已生成',
    exception: '',
    orderTime: '2026-06-04 15:07:00',
    updatedTime: '2026-06-04 16:00:00',
    customer: {
      name: 'Michael Brown',
      email: 'michael.b@example.com',
      phone: '+1 (310) 555-0198'
    },
    shipping: {
      name: 'Michael Brown',
      address: '8500 Wilshire Blvd',
      city: 'Los Angeles, CA',
      country: 'United States',
      postalCode: '90211',
      method: 'Express Shipping',
      trackingNo: 'UPS1Z9999999999',
      carrier: 'UPS'
    },
    subtotal: '$412.50',
    shippingFee: '$20.00',
    tax: '$0.00',
    discount: '-$0.00',
    total: '$432.50',
    currency: 'USD',
    items: [
      { id: 'li_004', sku: 'SWB-001', name: 'Smart Watch Band', variant: 'Navy Blue', quantity: 2, unitPrice: '$89.00', total: '$178.00' },
      { id: 'li_005', sku: 'SPR-003', name: 'Screen Protector', variant: 'Galaxy S24', quantity: 2, unitPrice: '$19.00', total: '$38.00' },
      { id: 'li_006', sku: 'CHD-001', name: 'Charging Dock', variant: '3-in-1 White', quantity: 1, unitPrice: '$196.50', total: '$196.50' }
    ],
    timeline: [
      { id: 'tl_4', time: '06-04 15:07', action: '订单创建', actor: '系统', detail: '来自 Shopify 渠道同步' },
      { id: 'tl_5', time: '06-04 15:07', action: '支付确认', actor: '系统', detail: 'Stripe 支付成功，金额 $432.50' },
      { id: 'tl_6', time: '06-04 15:10', action: '履约单生成', actor: '系统', detail: 'FO-20260604-0002 已生成' },
      { id: 'tl_7', time: '06-04 16:00', action: '拣货完成', actor: 'Warehouse Operator', detail: '5 件商品已拣货' }
    ],
    internalNotes: '',
    customerNote: ''
  }
};

export function getOrderDetail(id: string): OrderDetail | null {
  return orderDetailMap[id] ?? null;
}
