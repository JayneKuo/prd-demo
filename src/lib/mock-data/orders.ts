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
  /** 上游变更待处置数量（>0 时显示告警角标） */
  upstreamChangeCount?: number;
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
    upstreamChangeCount: 1,
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
    upstreamChangeCount: 1,
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
    upstreamChangeCount: 1,
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
    upstreamChangeCount: 2,
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
    upstreamChangeCount: 1,
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
  },
  /* ═══ 异常G: SKU 未在商品中心创建 — 履约前置校验失败 ═══ */
  {
    id: 'so_021',
    orderNo: 'SO-20260605-0021',
    platformNo: '#SH-7291350',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Brandon Yu',
    region: 'US / Austin',
    itemsSummary: '2 件商品',
    itemsDetail: ['Foldable Keyboard × 1', 'Wireless Trackpad × 1'],
    amount: '$178.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '未开始',
    exception: 'SKU 未识别',
    orderTime: '06-05 10:12'
  },
  /* ═══ 异常H: SKU 已建档但未关联仓库 SKU — WMS 下单失败 ═══ */
  {
    id: 'so_022',
    orderNo: 'SO-20260605-0022',
    platformNo: '#SH-7291401',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Chloe Bennett',
    region: 'US / Nashville',
    itemsSummary: '1 件商品',
    itemsDetail: ['Smart Desk Lamp × 2'],
    amount: '$119.98',
    status: '保留',
    payment: '已支付',
    fulfillment: '已暂停',
    exception: '仓库 SKU 未映射',
    orderTime: '06-05 11:45'
  },
  /* ═══ 异常I: 仓库 SKU 有映射但 WMS 查不到货品 — WMS 回调异常 ═══ */
  {
    id: 'so_023',
    orderNo: 'SO-20260605-0023',
    platformNo: '#SH-7291488',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Tyler Brooks',
    region: 'US / Minneapolis',
    itemsSummary: '3 件商品',
    itemsDetail: ['Portable Monitor × 1', 'Monitor Stand Mini × 1', 'HDMI Adapter × 1'],
    amount: '$346.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '已暂停',
    exception: 'WMS 货品不存在',
    orderTime: '06-05 13:20'
  },
  /* ═══ 异常J: 高风控拦截 — 支付成功但欺诈评分超阈值，进入人工审核 ═══ */
  {
    id: 'so_024',
    orderNo: 'SO-20260605-0024',
    platformNo: '#SH-7291530',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Alex Morgan',
    region: 'US / Las Vegas',
    itemsSummary: '3 件商品',
    itemsDetail: ['GPU RTX 4080 × 2', 'CPU i9-14900K × 1'],
    amount: '$2,890.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '未开始',
    exception: '风控拦截',
    orderTime: '06-05 09:03'
  },
  /* ═══ 异常K: channelSku 映射缺失 — 渠道商品未做 SKU 映射 ═══ */
  {
    id: 'so_025',
    orderNo: 'SO-20260606-0025',
    platformNo: '#AMZ-30483510',
    refNo: '',
    channel: 'Amazon',
    merchant: 'US Amazon',
    customer: 'Diana Prince',
    region: 'US / Seattle',
    itemsSummary: '2 件商品',
    itemsDetail: ['Bamboo Diffuser × 1', 'Essential Oil Set × 1'],
    amount: '$68.00',
    status: '保留',
    payment: '已支付',
    fulfillment: '未开始',
    exception: '渠道 SKU 未映射',
    orderTime: '06-06 08:30'
  },
  /* ═══ 异常L: 重量超承运商限制 — 自动切换为 LTL 卡车运输 ═══ */
  {
    id: 'so_026',
    orderNo: 'SO-20260606-0026',
    platformNo: '#SH-7291680',
    refNo: 'B2B-FURN-201',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Nathan Wright',
    region: 'US / Chicago',
    itemsSummary: '3 件商品',
    itemsDetail: ['Industrial Workbench × 1', 'Steel Shelving Unit × 2'],
    amount: '$1,650.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '已生成',
    exception: '',
    orderTime: '06-06 09:15'
  },
  /* ═══ COD: 货到付款 — 支付状态待收款直到签收 ═══ */
  {
    id: 'so_027',
    orderNo: 'SO-20260606-0027',
    platformNo: '#LZ-8801234',
    refNo: '',
    channel: 'Lazada',
    merchant: 'SG Store',
    customer: 'Priya Sharma',
    region: 'SG / Singapore',
    itemsSummary: '2 件商品',
    itemsDetail: ['Air Fryer 5L × 1', 'Baking Tray Set × 1'],
    amount: 'S$189.00',
    status: '处理中',
    payment: '待收款',
    fulfillment: '已发货',
    exception: '',
    orderTime: '06-06 10:00'
  },
  /* ═══ B2B: 分批发货 — 同一 PO 分三批次出库 ═══ */
  {
    id: 'so_028',
    orderNo: 'SO-20260604-0028',
    platformNo: '#WMT-90282200',
    refNo: 'PO-WMT-2026-0601',
    channel: 'Walmart',
    merchant: 'US Store',
    customer: 'Walmart DC #4091',
    region: 'US / Bentonville',
    itemsSummary: '1200 件商品',
    itemsDetail: ['Bluetooth Speaker Compact × 600', 'Smart Plug × 600'],
    amount: '$54,000.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '部分履约',
    exception: '',
    orderTime: '06-04 08:00'
  },
  /* ═══ 退货: 逆向物流 — 客户发起退货，生成入库单 ═══ */
  {
    id: 'so_029',
    orderNo: 'SO-20260528-0029',
    platformNo: '#SH-7290120',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Jessica Lane',
    region: 'US / Phoenix',
    itemsSummary: '2 件商品',
    itemsDetail: ['Robot Vacuum × 1', 'Mop Attachment × 1'],
    amount: '$459.00',
    status: '已完成',
    payment: '已退款',
    fulfillment: '已退货',
    exception: '退货处理中',
    orderTime: '05-28 16:45'
  },
  /* ═══ 礼品卡订单 ═══ */
  {
    id: 'so_gc_001',
    orderNo: 'SO-20260605-GC01',
    platformNo: '#SH-7291600',
    refNo: '',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Olivia Chen',
    region: 'US / San Francisco',
    itemsSummary: '1 张礼品卡',
    itemsDetail: ['Gift Card $100 × 1'],
    amount: '$100.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '卡号生成中',
    exception: '',
    orderTime: '06-05 10:30'
  },
  /* ═══ 租赁订单 ═══ */
  {
    id: 'so_rental_001',
    orderNo: 'SO-20260601-RN01',
    platformNo: '#SH-7291700',
    refNo: 'RENTAL-ENT-2026-001',
    channel: 'Shopify',
    merchant: 'US Store',
    customer: 'Marcus Webb',
    region: 'US / Los Angeles',
    itemsSummary: '1 套设备（租赁）',
    itemsDetail: ['Professional Camera Kit × 1 (30天租赁)'],
    amount: '$486.00',
    status: '处理中',
    payment: '已支付',
    fulfillment: '已发货',
    exception: '',
    orderTime: '06-01 09:00'
  }
];
