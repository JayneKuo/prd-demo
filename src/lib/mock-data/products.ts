// 商品中心 mock 数据

export type ProductStatus = '草稿' | '已发布' | '下架' | '审核中';

export type ChannelPublishStatus = '未发布' | '已发布' | '发布中' | '发布失败' | '已下架';

export type ChannelPublish = {
  channel: 'Shopify' | 'SHEIN';
  merchantId: string;
  merchantName: string;
  status: ChannelPublishStatus;
  channelProductId?: string;
  channelUrl?: string;
  publishedAt?: string;
  lastSyncAt?: string;
  failReason?: string;
};

export type VariantOption = {
  name: string;   // 属性名，如 "颜色"、"尺码"
  value: string;  // 属性值，如 "黑色"、"M"
};

export type CostSource = 'manual' | 'wms_receipt';

export type ProductVariant = {
  id: string;
  /** Seller SKU：卖家自定义的变体 SKU，用于在各渠道标识该变体 */
  sku: string;
  /** 渠道特定的 SKU（可选），key 为渠道名，value 为该渠道的 Seller SKU */
  channelSkus?: Record<string, string>;
  options: VariantOption[];
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  /**
   * 成本来源：
   * - manual: 商家手动录入（兜底）
   * - wms_receipt: WMS 采购入库回传（优先，最准确）
   */
  costSource?: CostSource;
  weight?: number;  // 克
  stock: number;
  barcode?: string;
  imageIndex?: number; // 对应 images 数组的下标
};

export type ProductImage = {
  id: string;
  url: string;
  alt?: string;
};

export type Product = {
  id: string;
  /** Parent SKU：商品父级 SKU，对应多个子变体 */
  parentSku: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  status: ProductStatus;
  vendor?: string;
  /** 变体选项维度定义，如 [{ name: '颜色', values: ['黑色','白色'] }, { name: '尺码', values: ['S','M','L'] }] */
  optionDefs: Array<{ name: string; values: string[] }>;
  variants: ProductVariant[];
  images: ProductImage[];
  channelPublishes: ChannelPublish[];
  createdAt: string;
  updatedAt: string;
  merchant: string;
};

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

export function getProductChannelSummary(product: Product): string {
  if (product.channelPublishes.length === 0) return '未发布';
  const published = product.channelPublishes.filter((c) => c.status === '已发布');
  if (published.length === 0) return '未发布';
  return published.map((c) => c.channel).join(' · ');
}

export function getProductVariantCount(product: Product): number {
  return product.variants.length;
}

export function getProductPriceRange(product: Product): string {
  if (product.variants.length === 0) return '—';
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `$${min.toFixed(2)}`;
  return `$${min.toFixed(2)} – $${max.toFixed(2)}`;
}

export function getProductTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

export const mockProducts: Product[] = [
  {
    id: 'prod_001',
    parentSku: 'WEP-001',
    title: 'Wireless Earbuds Pro',
    description: '高品质无线蓝牙耳机，主动降噪，续航 30 小时，IPX5 防水。',
    category: '电子产品',
    tags: ['耳机', '无线', '蓝牙', '降噪'],
    status: '已发布',
    vendor: 'TechAudio Co.',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['午夜黑', '珍珠白', '星空蓝'] }
    ],
    variants: [
      { id: 'var_001_1', sku: 'WEP-BLK-001', channelSkus: { Shopify: 'SP-WEP-BLK', SHEIN: 'SH-WEP-BLK-US' }, options: [{ name: '颜色', value: '午夜黑' }], price: 89.99, compareAtPrice: 129.99, costPrice: 32.00, costSource: 'wms_receipt', weight: 210, stock: 450, barcode: '8901234567890' },
      { id: 'var_001_2', sku: 'WEP-WHT-001', channelSkus: { Shopify: 'SP-WEP-WHT', SHEIN: 'SH-WEP-WHT-US' }, options: [{ name: '颜色', value: '珍珠白' }], price: 89.99, compareAtPrice: 129.99, costPrice: 32.00, costSource: 'wms_receipt', weight: 210, stock: 320, barcode: '8901234567891' },
      { id: 'var_001_3', sku: 'WEP-BLU-001', channelSkus: { Shopify: 'SP-WEP-BLU', SHEIN: 'SH-WEP-BLU-US' }, options: [{ name: '颜色', value: '星空蓝' }], price: 94.99, compareAtPrice: 129.99, costPrice: 34.00, costSource: 'wms_receipt', weight: 210, stock: 180, barcode: '8901234567892' }
    ],
    images: [
      { id: 'img_001_1', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', alt: 'Wireless Earbuds Pro 午夜黑' },
      { id: 'img_001_2', url: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=400', alt: 'Wireless Earbuds Pro 珍珠白' }
    ],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '已发布', channelProductId: 'shopify_8823910', channelUrl: 'https://usstore.myshopify.com/products/wireless-earbuds-pro', publishedAt: '2026-05-12 10:00', lastSyncAt: '2026-08-24 08:15' },
      { channel: 'SHEIN', merchantId: 'merchant_us_shein', merchantName: 'US SHEIN Store', status: '已发布', channelProductId: 'shein_US2890341', channelUrl: 'https://shein.com/goods/US2890341', publishedAt: '2026-06-01 14:30', lastSyncAt: '2026-08-23 20:00' }
    ],
    createdAt: '2026-05-10 09:00',
    updatedAt: '2026-08-24 08:15'
  },
  {
    id: 'prod_002',
    parentSku: 'TP-002',
    title: 'Transit Pack',
    description: '城市通勤背包，35L 大容量，防水面料，内置 USB 充电口。',
    category: '背包',
    tags: ['背包', '通勤', '防水', '大容量'],
    status: '已发布',
    vendor: 'UrbanCarry',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['黑色', '深灰', '橄榄绿'] },
      { name: '尺寸', values: ['标准版', '迷你版'] }
    ],
    variants: [
      { id: 'var_002_1', sku: 'TP-BLK-STD', channelSkus: { Shopify: 'SP-TP-BLK-S' }, options: [{ name: '颜色', value: '黑色' }, { name: '尺寸', value: '标准版' }], price: 79.00, costPrice: 28.00, costSource: 'manual', weight: 850, stock: 820, barcode: '7891234500001' },
      { id: 'var_002_2', sku: 'TP-BLK-MINI', channelSkus: { Shopify: 'SP-TP-BLK-M' }, options: [{ name: '颜色', value: '黑色' }, { name: '尺寸', value: '迷你版' }], price: 59.00, costPrice: 22.00, costSource: 'manual', weight: 560, stock: 440, barcode: '7891234500002' },
      { id: 'var_002_3', sku: 'TP-GRY-STD', channelSkus: { Shopify: 'SP-TP-GRY-S' }, options: [{ name: '颜色', value: '深灰' }, { name: '尺寸', value: '标准版' }], price: 79.00, costPrice: 28.00, costSource: 'manual', weight: 850, stock: 380, barcode: '7891234500003' },
      { id: 'var_002_4', sku: 'TP-GRY-MINI', channelSkus: { Shopify: 'SP-TP-GRY-M' }, options: [{ name: '颜色', value: '深灰' }, { name: '尺寸', value: '迷你版' }], price: 59.00, costPrice: 22.00, costSource: 'manual', weight: 560, stock: 210, barcode: '7891234500004' },
      { id: 'var_002_5', sku: 'TP-OLV-STD', channelSkus: { Shopify: 'SP-TP-OLV-S' }, options: [{ name: '颜色', value: '橄榄绿' }, { name: '尺寸', value: '标准版' }], price: 82.00, costPrice: 29.00, costSource: 'manual', weight: 850, stock: 155, barcode: '7891234500005' },
      { id: 'var_002_6', sku: 'TP-OLV-MINI', channelSkus: { Shopify: 'SP-TP-OLV-M' }, options: [{ name: '颜色', value: '橄榄绿' }, { name: '尺寸', value: '迷你版' }], price: 62.00, costPrice: 23.00, costSource: 'manual', weight: 560, stock: 90, barcode: '7891234500006' }
    ],
    images: [
      { id: 'img_002_1', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', alt: 'Transit Pack 黑色标准版' }
    ],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '已发布', channelProductId: 'shopify_7741023', channelUrl: 'https://usstore.myshopify.com/products/transit-pack', publishedAt: '2026-04-22 11:00', lastSyncAt: '2026-08-20 06:00' },
      { channel: 'SHEIN', merchantId: 'merchant_us_shein', merchantName: 'US SHEIN Store', status: '发布失败', failReason: '商品标题不符合 SHEIN 规范，包含违禁词', lastSyncAt: '2026-08-18 10:30' }
    ],
    createdAt: '2026-04-20 14:00',
    updatedAt: '2026-08-20 06:00'
  },
  {
    id: 'prod_003',
    parentSku: 'DC16-003',
    title: 'Dock Case for iPhone 16',
    description: '专为 iPhone 16 设计的磁吸保护壳，支持 MagSafe，军规跌落防护。',
    category: '手机配件',
    tags: ['手机壳', 'iPhone', 'MagSafe', '防摔'],
    status: '已发布',
    vendor: 'ShieldTech',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['石墨黑', '月白', '沙漠橙', '深海蓝'] }
    ],
    variants: [
      { id: 'var_003_1', sku: 'DC16-BLK', channelSkus: { Shopify: 'SP-DC16-BLK' }, options: [{ name: '颜色', value: '石墨黑' }], price: 39.99, compareAtPrice: 49.99, costPrice: 12.00, costSource: 'wms_receipt', weight: 45, stock: 1240, barcode: '6971234560001' },
      { id: 'var_003_2', sku: 'DC16-WHT', channelSkus: { Shopify: 'SP-DC16-WHT' }, options: [{ name: '颜色', value: '月白' }], price: 39.99, compareAtPrice: 49.99, costPrice: 12.00, costSource: 'wms_receipt', weight: 45, stock: 980, barcode: '6971234560002' },
      { id: 'var_003_3', sku: 'DC16-ONG', channelSkus: { Shopify: 'SP-DC16-ONG' }, options: [{ name: '颜色', value: '沙漠橙' }], price: 44.99, compareAtPrice: 49.99, costPrice: 13.00, costSource: 'wms_receipt', weight: 45, stock: 420, barcode: '6971234560003' },
      { id: 'var_003_4', sku: 'DC16-BLU', channelSkus: { Shopify: 'SP-DC16-BLU' }, options: [{ name: '颜色', value: '深海蓝' }], price: 44.99, compareAtPrice: 49.99, costPrice: 13.00, costSource: 'wms_receipt', weight: 45, stock: 560, barcode: '6971234560004' }
    ],
    images: [
      { id: 'img_003_1', url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400', alt: 'Dock Case 石墨黑' }
    ],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '已发布', channelProductId: 'shopify_9120044', channelUrl: 'https://usstore.myshopify.com/products/dock-case-iphone16', publishedAt: '2026-07-01 09:30', lastSyncAt: '2026-08-22 14:00' },
      { channel: 'SHEIN', merchantId: 'merchant_us_shein', merchantName: 'US SHEIN Store', status: '未发布' }
    ],
    createdAt: '2026-06-28 16:00',
    updatedAt: '2026-08-22 14:00'
  },
  {
    id: 'prod_004',
    parentSku: 'FK-004',
    title: 'Field Kit Organizer',
    description: '多功能收纳套装，适合户外旅行，内含 12 个独立隔层，防水拉链。',
    category: '旅行配件',
    tags: ['收纳', '旅行', '户外', '防水'],
    status: '草稿',
    vendor: 'FieldGear',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['沙色', '黑色'] },
      { name: '套装规格', values: ['基础版', '专业版'] }
    ],
    variants: [
      { id: 'var_004_1', sku: 'FK-SND-BASE', options: [{ name: '颜色', value: '沙色' }, { name: '套装规格', value: '基础版' }], price: 34.99, costPrice: 11.00, weight: 320, stock: 0 },
      { id: 'var_004_2', sku: 'FK-SND-PRO', options: [{ name: '颜色', value: '沙色' }, { name: '套装规格', value: '专业版' }], price: 54.99, costPrice: 18.00, weight: 520, stock: 0 },
      { id: 'var_004_3', sku: 'FK-BLK-BASE', options: [{ name: '颜色', value: '黑色' }, { name: '套装规格', value: '基础版' }], price: 34.99, costPrice: 11.00, weight: 320, stock: 0 },
      { id: 'var_004_4', sku: 'FK-BLK-PRO', options: [{ name: '颜色', value: '黑色' }, { name: '套装规格', value: '专业版' }], price: 54.99, costPrice: 18.00, weight: 520, stock: 0 }
    ],
    images: [],
    channelPublishes: [],
    createdAt: '2026-08-10 11:00',
    updatedAt: '2026-08-10 11:00'
  },
  {
    id: 'prod_005',
    parentSku: 'CMS-005',
    title: 'Control Module Stand',
    description: '铝合金显示器支架，可调节高度 10–40cm，支持 VESA，适配 17"–32" 显示器。',
    category: '电脑周边',
    tags: ['显示器支架', '铝合金', 'VESA', '桌面'],
    status: '已发布',
    vendor: 'DeskPro',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['太空灰', '银色'] }
    ],
    variants: [
      { id: 'var_005_1', sku: 'CMS-GRY-001', channelSkus: { Shopify: 'SP-CMS-GRY', SHEIN: 'SH-CMS-GRY-US' }, options: [{ name: '颜色', value: '太空灰' }], price: 129.00, compareAtPrice: 159.00, costPrice: 48.00, weight: 2800, stock: 88, barcode: '5431234560001' },
      { id: 'var_005_2', sku: 'CMS-SLV-001', channelSkus: { Shopify: 'SP-CMS-SLV', SHEIN: 'SH-CMS-SLV-US' }, options: [{ name: '颜色', value: '银色' }], price: 129.00, compareAtPrice: 159.00, costPrice: 48.00, weight: 2800, stock: 52, barcode: '5431234560002' }
    ],
    images: [
      { id: 'img_005_1', url: 'https://images.unsplash.com/photo-1527443224154-c4a573d5679d?w=400', alt: 'Control Module Stand 太空灰' }
    ],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '已发布', channelProductId: 'shopify_5520911', channelUrl: 'https://usstore.myshopify.com/products/control-module-stand', publishedAt: '2026-03-15 08:00', lastSyncAt: '2026-08-19 06:30' },
      { channel: 'SHEIN', merchantId: 'merchant_us_shein', merchantName: 'US SHEIN Store', status: '发布中' }
    ],
    createdAt: '2026-03-10 10:00',
    updatedAt: '2026-08-19 06:30'
  },
  {
    id: 'prod_006',
    parentSku: 'UCC-006',
    title: 'USB-C Charging Cable 2m',
    description: '240W 超快充 USB-C 编织线，2 米，支持 Thunderbolt 4，兼容所有 USB-C 设备。',
    category: '数码配件',
    tags: ['充电线', 'USB-C', '快充', '编织'],
    status: '审核中',
    vendor: 'CableLab',
    merchant: 'US Store',
    optionDefs: [
      { name: '颜色', values: ['黑色', '白色', '橙色'] }
    ],
    variants: [
      { id: 'var_006_1', sku: 'UCC-BLK-2M', options: [{ name: '颜色', value: '黑色' }], price: 19.99, costPrice: 5.50, weight: 85, stock: 3200, barcode: '4561234560001' },
      { id: 'var_006_2', sku: 'UCC-WHT-2M', options: [{ name: '颜色', value: '白色' }], price: 19.99, costPrice: 5.50, weight: 85, stock: 2100, barcode: '4561234560002' },
      { id: 'var_006_3', sku: 'UCC-ONG-2M', options: [{ name: '颜色', value: '橙色' }], price: 21.99, costPrice: 5.80, weight: 85, stock: 890, barcode: '4561234560003' }
    ],
    images: [],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '未发布' },
      { channel: 'SHEIN', merchantId: 'merchant_us_shein', merchantName: 'US SHEIN Store', status: '未发布' }
    ],
    createdAt: '2026-08-20 15:00',
    updatedAt: '2026-08-20 15:00'
  },
  {
    id: 'prod_007',
    parentSku: 'MPX-007',
    title: 'Mouse Pad XL Gaming',
    description: '超大游戏鼠标垫，900×400mm，3mm 厚防滑橡胶底，防泼溅表面。',
    category: '电脑周边',
    tags: ['鼠标垫', '游戏', '超大', '防滑'],
    status: '下架',
    vendor: 'GameDesk',
    merchant: 'US Store',
    optionDefs: [
      { name: '图案', values: ['星云黑', '像素迷彩', '简约白'] }
    ],
    variants: [
      { id: 'var_007_1', sku: 'MPX-NEB-001', options: [{ name: '图案', value: '星云黑' }], price: 24.99, costPrice: 8.00, weight: 680, stock: 0, barcode: '3211234560001' },
      { id: 'var_007_2', sku: 'MPX-PIX-001', options: [{ name: '图案', value: '像素迷彩' }], price: 24.99, costPrice: 8.00, weight: 680, stock: 0, barcode: '3211234560002' },
      { id: 'var_007_3', sku: 'MPX-WHT-001', options: [{ name: '图案', value: '简约白' }], price: 27.99, costPrice: 9.00, weight: 680, stock: 0, barcode: '3211234560003' }
    ],
    images: [],
    channelPublishes: [
      { channel: 'Shopify', merchantId: 'merchant_us_shopify', merchantName: 'US Store', status: '已下架' }
    ],
    createdAt: '2026-01-05 09:00',
    updatedAt: '2026-07-30 10:00'
  }
];

// ─── 发布记录 mock 数据 ──────────────────────────────────────────────────────

export type PublishLogEntry = {
  id: string;
  productId: string;
  productTitle: string;
  channel: 'Shopify' | 'SHEIN';
  merchantName: string;
  action: '发布' | '更新' | '下架' | '同步';
  status: '成功' | '失败' | '处理中';
  operator: string;
  startedAt: string;
  completedAt?: string;
  duration?: string;
  errorMessage?: string;
  variantCount: number;
};

export const mockPublishLogs: PublishLogEntry[] = [
  { id: 'log_001', productId: 'prod_001', productTitle: 'Wireless Earbuds Pro', channel: 'Shopify', merchantName: 'US Store', action: '同步', status: '成功', operator: 'Mina Chen', startedAt: '2026-08-24 08:14', completedAt: '2026-08-24 08:15', duration: '1m 2s', variantCount: 3 },
  { id: 'log_002', productId: 'prod_001', productTitle: 'Wireless Earbuds Pro', channel: 'SHEIN', merchantName: 'US SHEIN Store', action: '同步', status: '成功', operator: 'Mina Chen', startedAt: '2026-08-23 19:59', completedAt: '2026-08-23 20:00', duration: '48s', variantCount: 3 },
  { id: 'log_003', productId: 'prod_002', productTitle: 'Transit Pack', channel: 'SHEIN', merchantName: 'US SHEIN Store', action: '发布', status: '失败', operator: 'Mina Chen', startedAt: '2026-08-18 10:28', completedAt: '2026-08-18 10:30', duration: '2m 10s', errorMessage: '商品标题不符合 SHEIN 规范，包含违禁词', variantCount: 6 },
  { id: 'log_004', productId: 'prod_005', productTitle: 'Control Module Stand', channel: 'SHEIN', merchantName: 'US SHEIN Store', action: '发布', status: '处理中', operator: 'System', startedAt: '2026-08-25 11:00', variantCount: 2 },
  { id: 'log_005', productId: 'prod_003', productTitle: 'Dock Case for iPhone 16', channel: 'Shopify', merchantName: 'US Store', action: '发布', status: '成功', operator: 'Mina Chen', startedAt: '2026-07-01 09:28', completedAt: '2026-07-01 09:30', duration: '1m 44s', variantCount: 4 },
  { id: 'log_006', productId: 'prod_005', productTitle: 'Control Module Stand', channel: 'Shopify', merchantName: 'US Store', action: '更新', status: '成功', operator: 'System', startedAt: '2026-08-19 06:29', completedAt: '2026-08-19 06:30', duration: '38s', variantCount: 2 },
  { id: 'log_007', productId: 'prod_007', productTitle: 'Mouse Pad XL Gaming', channel: 'Shopify', merchantName: 'US Store', action: '下架', status: '成功', operator: 'Mina Chen', startedAt: '2026-07-30 09:59', completedAt: '2026-07-30 10:00', duration: '12s', variantCount: 3 },
  { id: 'log_008', productId: 'prod_002', productTitle: 'Transit Pack', channel: 'Shopify', merchantName: 'US Store', action: '同步', status: '成功', operator: 'System', startedAt: '2026-08-20 05:59', completedAt: '2026-08-20 06:00', duration: '55s', variantCount: 6 }
];
