import type { TableColumn } from '@/components/admin/data-table-shell';

export type OrderRow = {
  id: string;
  /** 内部订单号 */
  orderNo: string;
  /** 平台订单号 */
  platformNo: string;
  /** 参考单号(客户PO / 备注单号) */
  refNo: string;
  /** 渠道 */
  channel: string;
  /** Merchant / 店铺 */
  merchant: string;
  /** 客户名称 */
  customer: string;
  /** 收货地区（国家/城市） */
  region: string;
  /** 商品摘要（简短） */
  itemsSummary: string;
  /** 商品明细（hover 展示） */
  itemsDetail: string[];
  /** 金额（含币种） */
  amount: string;
  /** 订单状态 */
  status: string;
  /** 支付状态 */
  payment: string;
  /** 履约进度 */
  fulfillment: string;
  /** 异常标记 (空表示正常) */
  exception: string;
  /** 下单时间 */
  orderTime: string;
};

export const orderColumns: TableColumn<OrderRow>[] = [
  { key: 'orderNo', label: '订单号' },
  { key: 'channel', label: '渠道' },
  { key: 'customer', label: '客户' },
  { key: 'itemsSummary', label: '商品' },
  { key: 'amount', label: '金额' },
  { key: 'status', label: '状态', isStatus: true },
  { key: 'payment', label: '支付', isStatus: true },
  { key: 'fulfillment', label: '履约', isStatus: true },
  { key: 'exception', label: '异常', isStatus: true },
  { key: 'orderTime', label: '下单时间' }
];

export const orders: OrderRow[] = [
  /* ═══ 阶段1: 支付待确认 — 订单已创建但支付未完成 ═══ */
  {
    id: 'so_004',
    orderNo: 'SO-20260603-0004',
    platformNo: '#AMZ-30482837',
    refNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    customer: 'James Wilson',
    region: 'US / Chicago',
    itemsSummary: '1 件商品',
    itemsDetail: ['Bluetooth Speaker Mini × 1'],
    amount: '$89.99',
    status: '待处理',
    payment: '待确认',
    fulfillment: '未开始',
    exception: '支付待确认',
    orderTime: '06-03 22:15'
  },
  /* ═══ 阶段2: 待处理 — 支付已确认，等待进入履约流 ═══ */
  {
    id: 'so_001',
    orderNo: 'SO-20260604-0001',
    platformNo: '#SH-7291034',
    refNo: 'PO-2024-8821',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Emily Johnson',
    region: 'US / New York',
    itemsSummary: '3 件商品',
    itemsDetail: ['Wireless Earbuds Pro × 1', 'Phone Case Clear × 1', 'USB-C Cable 2m × 1'],
    amount: '$189.00',
    status: '待处理',
    payment: '已支付',
    fulfillment: '未开始',
    exception: '',
    orderTime: '06-04 16:29'
  },
  {
    id: 'so_006',
    orderNo: 'SO-20260603-0006',
    platformNo: '#SH-7290856',
    refNo: 'SGPO-0091',
    channel: 'Shopify',
    merchant: 'SG Store',
    customer: 'Lisa Chen',
    region: 'SG / Singapore',
    itemsSummary: '4 件商品',
    itemsDetail: ['Desk Organizer × 1', 'Monitor Stand × 1', 'Cable Clips × 1', 'Mouse Pad XL × 1'],
    amount: 'S$298.00',
    status: '待处理',
    payment: '已支付',
    fulfillment: '未开始',
    exception: '',
    orderTime: '06-03 18:33'
  },
  /* ═══ 阶段3: 处理中/已生成 — 履约决策完成，等待出库 ═══ */
  {
    id: 'so_002',
    orderNo: 'SO-20260604-0002',
    platformNo: '#SH-7291078',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Michael Brown',
    region: 'US / Los Angeles',
    itemsSummary: '5 件商品',
    itemsDetail: ['Smart Watch Band × 2', 'Screen Protector × 2', 'Charging Dock × 1'],
    amount: '$432.50',
    status: '处理中',
    payment: '已支付',
    fulfillment: '已生成',
    exception: '',
    orderTime: '06-04 15:07'
  },
  {
    id: 'so_005',
    orderNo: 'SO-20260603-0005',
    platformNo: '#TK-8827163',
    refNo: '',
    channel: 'TikTok Shop',
    merchant: 'US Store',
    customer: 'Maria Garcia',
    region: 'US / Miami',
    itemsSummary: '3 件商品',
    itemsDetail: ['LED Ring Light × 1', 'Phone Tripod × 1', 'Selfie Stick × 1'],
    amount: '$156.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '已生成',
    exception: '',
    orderTime: '06-03 20:15'
  },
  /* ═══ 阶段4: 处理中/拣货中 — 出库单已下发，仓库执行中 ═══ */
  {
    id: 'so_013',
    orderNo: 'SO-20260604-0013',
    platformNo: '#SH-7291150',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Jason Kim',
    region: 'US / San Francisco',
    itemsSummary: '4 件商品',
    itemsDetail: ['Mechanical Keyboard × 1', 'Wrist Rest × 1', 'Webcam 4K × 1', 'Ring Light Mini × 1'],
    amount: '$379.48',
    status: '处理中',
    payment: '已支付',
    fulfillment: '拣货中',
    exception: '',
    orderTime: '06-04 09:30'
  },
  /* ═══ 异常A: 地址验证失败 — 履约流被暂停 ═══ */
  {
    id: 'so_003',
    orderNo: 'SO-20260604-0003',
    platformNo: '#SH-7291092',
    refNo: 'REF-UK-445',
    channel: 'Shopify',
    merchant: 'UK Store',
    customer: 'Sarah Williams',
    region: 'UK / London',
    itemsSummary: '2 件商品',
    itemsDetail: ['Yoga Mat Premium × 1', 'Resistance Bands Set × 1'],
    amount: '£76.80',
    status: '保留',
    payment: '已支付',
    fulfillment: '已暂停',
    exception: '地址无效',
    orderTime: '06-04 14:42'
  },
  /* ═══ 异常B: 库存不足/找不到有效仓库 — 部分履约挂起 ═══ */
  {
    id: 'so_007',
    orderNo: 'SO-20260603-0007',
    platformNo: '#SH-7290801',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Robert Taylor',
    region: 'US / Seattle',
    itemsSummary: '6 件商品',
    itemsDetail: ['Camping Tent 4P × 1', 'Sleeping Bag × 2', 'Headlamp × 2', 'First Aid Kit × 1'],
    amount: '$567.30',
    status: '保留',
    payment: '已支付',
    fulfillment: '部分履约',
    exception: '库存不足',
    orderTime: '06-03 11:20'
  },
  /* ═══ 阶段5: 已发货 — 出库完成，物流运输中 ═══ */
  {
    id: 'so_008',
    orderNo: 'SO-20260602-0008',
    platformNo: '#SH-7290712',
    refNo: 'WHL-2024-112',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'David Lee',
    region: 'US / Boston',
    itemsSummary: '8 件商品',
    itemsDetail: ['Office Chair Ergonomic × 1', 'Standing Desk Frame × 1', 'Monitor Arm × 2', 'Desk Mat × 1', 'Keyboard Tray × 1', 'Cable Tray × 1', 'Foot Rest × 1'],
    amount: '$1,240.00',
    status: '已发货',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '',
    orderTime: '06-02 09:15'
  },
  {
    id: 'so_011',
    orderNo: 'SO-20260601-0011',
    platformNo: '#AMZ-30481922',
    refNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    customer: 'Tom Harris',
    region: 'US / Dallas',
    itemsSummary: '2 件商品',
    itemsDetail: ['Gaming Mouse × 1', 'Mouse Pad RGB × 1'],
    amount: '$234.00',
    status: '已发货',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '',
    orderTime: '06-01 07:10'
  },
  /* ═══ 异常C: 客户取消 — 履约中途被中断 ═══ */
  {
    id: 'so_009',
    orderNo: 'SO-20260602-0009',
    platformNo: '#SH-7290698',
    refNo: '',
    channel: 'Shopify',
    merchant: 'UK Store',
    customer: 'Anna Schmidt',
    region: 'UK / Manchester',
    itemsSummary: '1 件商品',
    itemsDetail: ['Scented Candle Set × 1'],
    amount: '£45.00',
    status: '已取消',
    payment: '已退款',
    fulfillment: '已取消',
    exception: '客户取消',
    orderTime: '06-02 08:45'
  },
  /* ═══ 阶段6: 已完成 — 签收确认，订单关闭 ═══ */
  {
    id: 'so_010',
    orderNo: 'SO-20260601-0010',
    platformNo: '#SH-7290589',
    refNo: '',
    channel: 'Shopify',
    merchant: 'SG Store',
    customer: 'Kevin Park',
    region: 'SG / Singapore',
    itemsSummary: '10 件商品',
    itemsDetail: ['Kitchen Knife Set × 1', 'Cutting Board × 2', 'Spice Rack × 1', 'Measuring Cups × 1', 'Mixing Bowls × 1', 'Spatula Set × 1', 'Apron × 1', 'Oven Mitts × 1', 'Timer × 1'],
    amount: 'S$720.00',
    status: '已完成',
    payment: '已支付',
    fulfillment: '已签收',
    exception: '',
    orderTime: '06-01 08:30'
  },
  {
    id: 'so_012',
    orderNo: 'SO-20260531-0012',
    platformNo: '#TK-8826991',
    refNo: 'TIKTOK-PROMO-06',
    channel: 'TikTok Shop',
    merchant: 'UK TikTok Shop',
    customer: 'Sophie Turner',
    region: 'UK / Birmingham',
    itemsSummary: '2 件商品',
    itemsDetail: ['Hair Dryer Compact × 1', 'Hair Clips Set × 1'],
    amount: '£112.00',
    status: '已完成',
    payment: '已支付',
    fulfillment: '已签收',
    exception: '',
    orderTime: '05-31 19:44'
  },
  /* ═══ 异常D: 找不到仓库 — 全网库存为0或商品未铺货 ═══ */
  {
    id: 'so_014',
    orderNo: 'SO-20260604-0014',
    platformNo: '#SH-7291200',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Daniel Cooper',
    region: 'US / Denver',
    itemsSummary: '2 件商品',
    itemsDetail: ['Smart Thermostat × 1', 'Temperature Sensor × 3'],
    amount: '$278.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '已暂停',
    exception: '找不到仓库',
    orderTime: '06-04 11:20'
  },
  /* ═══ 阶段3b: 多仓拆单(3个履约单) — 复杂拆单场景 ═══ */
  {
    id: 'so_015',
    orderNo: 'SO-20260604-0015',
    platformNo: '#SH-7291210',
    refNo: 'B2B-CORP-089',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Rachel Green',
    region: 'US / Phoenix',
    itemsSummary: '7 件商品',
    itemsDetail: ['Projector 4K × 1', 'Projector Screen × 1', 'HDMI Cable 5m × 2', 'Surge Protector × 1', 'Cable Sleeve × 2'],
    amount: '$1,890.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '部分履约',
    exception: '',
    orderTime: '06-04 08:15'
  },
  /* ═══ 异常E: 部分 On Hold — 一部分已发，一部分因合规暂停 ═══ */
  {
    id: 'so_016',
    orderNo: 'SO-20260603-0016',
    platformNo: '#AMZ-30483001',
    refNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    customer: 'Chris Martinez',
    region: 'US / Houston',
    itemsSummary: '4 件商品',
    itemsDetail: ['Wireless Router × 1', 'Network Switch × 1', 'Ethernet Cable 10m × 2'],
    amount: '$456.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '部分履约',
    exception: '合规审查',
    orderTime: '06-03 15:40'
  },
  /* ═══ 异常F: 物流异常 — 客户拒收/投递失败 ═══ */
  {
    id: 'so_017',
    orderNo: 'SO-20260601-0017',
    platformNo: '#SH-7290500',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Amanda Foster',
    region: 'US / Portland',
    itemsSummary: '3 件商品',
    itemsDetail: ['Air Purifier × 1', 'Replacement Filter × 2'],
    amount: '$329.00',
    status: '已发货',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '投递失败',
    orderTime: '06-01 10:30'
  },
  /* ═══ 阶段6b: 已完成但部分退款 ═══ */
  {
    id: 'so_018',
    orderNo: 'SO-20260530-0018',
    platformNo: '#SH-7290400',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Mark Thompson',
    region: 'US / Atlanta',
    itemsSummary: '4 件商品',
    itemsDetail: ['Standing Desk Top × 1', 'Monitor Light Bar × 1', 'Desk Shelf × 1', 'USB Hub × 1'],
    amount: '$680.00',
    status: '已完成',
    payment: '部分退款',
    fulfillment: '已签收',
    exception: '',
    orderTime: '05-30 14:20'
  },
  /* ═══ 跨境海运 — 整柜出口 ═══ */
  {
    id: 'so_019',
    orderNo: 'SO-20260528-0019',
    platformNo: '#WMT-90281773',
    refNo: 'PO-WMT-2026-0528',
    channel: 'Walmart',
    merchant: 'US Store',
    customer: 'Walmart DC #6042',
    region: 'US / Bentonville',
    itemsSummary: '500 件商品',
    itemsDetail: ['LED Desk Lamp × 200', 'USB Charger 3-port × 300'],
    amount: '$18,500.00',
    status: '已发货',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '',
    orderTime: '05-28 09:00'
  },
  /* ═══ 跨境空运 — DHL国际快递 ═══ */
  {
    id: 'so_020',
    orderNo: 'SO-20260602-0020',
    platformNo: '#SH-7290300',
    refNo: 'URGENT-UK-2026',
    channel: 'Shopify',
    merchant: 'UK Store',
    customer: 'Tech Solutions Ltd',
    region: 'UK / London',
    itemsSummary: '20 件商品',
    itemsDetail: ['Wireless Charger × 10', 'USB Hub Pro × 10'],
    amount: '£4,200.00',
    status: '已发货',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '',
    orderTime: '06-02 14:00'
  }
];
