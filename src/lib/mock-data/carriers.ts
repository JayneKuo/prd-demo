import type { TableColumn } from '@/components/admin/data-table-shell';

// ═══════════════════════════════════════════════
// 第一层：承运商分类
// ═══════════════════════════════════════════════

export type CarrierCategory = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
};

// ═══════════════════════════════════════════════
// 第二层：承运商
// ═══════════════════════════════════════════════

export type SystemCarrier = {
  id: string;
  code: string;
  name: string;
  /** 分类ID */
  categoryId: string;
  /** 快递 / 快运 / 专线 / 海运 / 空运 */
  type: string;
  region: string;
  status: '启用' | '停用';
  contact: string;
  phone: string;
  /** 官网 */
  website?: string;
  /** Logo URL */
  logoUrl?: string;
  createdAt: string;
};

// ═══════════════════════════════════════════════
// 第三层：承运商授权配置
// ═══════════════════════════════════════════════

export type CarrierAuthType = 'api_key' | 'oauth2' | 'account_password' | 'token' | 'none';

export type CarrierAuth = {
  id: string;
  carrierId: string;
  carrierName: string;
  authType: CarrierAuthType;
  /** 授权状态 */
  status: '已授权' | '未授权' | '已过期';
  /** API 地址 */
  apiAddress?: string;
  /** 用户名 / Client ID */
  username?: string;
  /** Access Key */
  accessKey?: string;
  /** Account Number */
  accountNumber?: string;
  /** 授权到期时间 */
  expiresAt?: string;
  /** 授权时间 */
  authorizedAt?: string;
  /** 备注 */
  remark?: string;
};

// ═══════════════════════════════════════════════
// 第四层：服务产品（运输服务方式）
// ═══════════════════════════════════════════════

export type ServiceProduct = {
  id: string;
  carrierId: string;
  carrierName: string;
  /** 服务产品编码 */
  code: string;
  /** 服务产品名称 */
  name: string;
  /** 服务方式代码（数字代码，如 UPS: 71、72 等） */
  serviceCode?: string;
  /** 运输方式: Parcel / Express / LTL / FTL / Ocean / Air */
  shipMethod: string;
  /** 时效承诺 */
  deliveryPromise: string;
  /** 最后更新时间 */
  updatedAt?: string;
  status: '启用' | '停用';
};

// ═══════════════════════════════════════════════
// 第五层：已接入的外部系统
// ═══════════════════════════════════════════════

export type ConnectedSystem = {
  id: string;
  name: string;
  direction: 'upstream' | 'downstream';
  type: 'channel' | 'erp' | 'wms' | 'tms' | 'fulfillment';
  status: '已连接' | '已断开';
};

export type ExternalOption = {
  id: string;
  systemId: string;
  code: string;
  displayName: string;
  mapped: boolean;
};

// ═══════════════════════════════════════════════
// 第六层：承运商映射（渠道承运商 → 系统承运商代码）
// ═══════════════════════════════════════════════

export type CarrierMapping = {
  id: string;
  externalName: string;
  externalCode: string;
  source: 'upstream' | 'downstream';
  sourceSystemId: string;
  sourceSystem: string;
  systemCarrierId: string;
  systemCarrierName: string;
  systemServiceId: string;
  systemServiceName: string;
  /** 映射到的系统承运商代码 */
  mappedCode?: string;
  mappingStatus: '已映射' | '未映射' | '已失效';
  isDefault: boolean;
  lastSyncAt: string;
  createdAt: string;
  remark: string;
};

// ═══════════════════════════════════════════════
// 第七层：仓库绑定
// ═══════════════════════════════════════════════

export type CarrierWarehouseBinding = {
  id: string;
  carrierId: string;
  carrierName: string;
  serviceId: string;
  serviceName: string;
  /** 仓库ID */
  warehouseId: string;
  /** 仓库名称 */
  warehouseName: string;
  /** 平台仓库代码 (外部系统的仓库标识) */
  platformWarehouseCode?: string;
  status: '启用' | '停用';
  createdAt: string;
};

// ═══════════════════════════════════════════════
// 第八层：平台运输方式关联
// ═══════════════════════════════════════════════

export type PlatformShippingBind = {
  id: string;
  /** 服务商（承运商） */
  carrierId: string;
  carrierName: string;
  /** 服务方式 */
  serviceId: string;
  serviceName: string;
  /** 平台 (Amazon / TikTok / Shopify / Walmart / Temu) */
  platform: string;
  /** 平台基础配置 */
  platformShipMethod?: string;
  /** 平台发货渠道方式 */
  platformDeliveryService?: string;
  /** 面单规格标号 */
  labelSpec?: string;
  /** 是否覆盖跟踪 */
  overrideTracking: boolean;
  /** 覆盖跟踪链接 */
  trackingUrl?: string;
  status: '启用' | '停用';
};

// ═══════════════════════════════════════════════
// 第九层：合单配置
// ═══════════════════════════════════════════════

export type ConsolidationConfig = {
  id: string;
  /** 本系统的服务方式 */
  serviceId: string;
  serviceName: string;
  /** 本次发货的服务方式（可能和上面相同，也可能是合并后变更） */
  consolidatedServiceId: string;
  consolidatedServiceName: string;
  /** 绑定的仓库 */
  warehouseId: string;
  warehouseName: string;
  status: '启用' | '停用';
};

// ═══════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════

export const carrierCategories: CarrierCategory[] = [
  { id: 'CAT-01', name: '万邦', description: '万邦物流旗下', sortOrder: 1 },
  { id: 'CAT-02', name: '国际快递', description: '国际快递服务商', sortOrder: 2 },
  { id: 'CAT-03', name: '国际专线', description: '跨境专线物流', sortOrder: 3 },
  { id: 'CAT-04', name: '本地配送', description: '本地配送服务', sortOrder: 4 },
  { id: 'CAT-05', name: '海运', description: '海运/整柜/拼箱', sortOrder: 5 },
  { id: 'CAT-06', name: '虚拟发货', description: '虚拟发货/自提', sortOrder: 6 },
];

export const systemCarriers: SystemCarrier[] = [
  { id: 'SC-001', code: 'USPS', name: 'USPS Endicia', categoryId: 'CAT-02', type: '快递', region: '北美', status: '启用', contact: 'John Doe', phone: '+1-800-275', website: 'https://www.usps.com', createdAt: '2024-01-15' },
  { id: 'SC-002', code: 'UPS', name: 'UPS', categoryId: 'CAT-02', type: '快递', region: '国际', status: '启用', contact: 'Sarah Chen', phone: '+1-800-742', website: 'https://www.ups.com', createdAt: '2024-01-15' },
  { id: 'SC-003', code: 'FEDEX', name: 'FedEx', categoryId: 'CAT-02', type: '快递', region: '国际', status: '启用', contact: 'Tom Wilson', phone: '+1-800-463', website: 'https://www.fedex.com', createdAt: '2024-01-15' },
  { id: 'SC-004', code: 'DHL', name: 'DHL Express', categoryId: 'CAT-02', type: '快递', region: '国际', status: '启用', contact: 'Mike Zhang', phone: '+49-228-0', website: 'https://www.dhl.com', createdAt: '2024-01-20' },
  { id: 'SC-005', code: '4PX', name: '4PX全球集运平台', categoryId: 'CAT-03', type: '专线', region: '国际', status: '启用', contact: '张明', phone: '0755-3660', website: 'https://www.4px.com', createdAt: '2024-02-01' },
  { id: 'SC-006', code: 'FLASH', name: 'FLASH国际小包', categoryId: 'CAT-03', type: '专线', region: '东南亚', status: '启用', contact: '王芳', phone: '0755-8888', createdAt: '2024-02-10' },
  { id: 'SC-007', code: 'YMS', name: '一票通平台', categoryId: 'CAT-01', type: '专线', region: '国际', status: '启用', contact: '赵强', phone: '0755-6666', createdAt: '2024-02-10' },
  { id: 'SC-008', code: 'FRDEX', name: 'FRDEx', categoryId: 'CAT-04', type: '快递', region: '北美', status: '启用', contact: 'Jack', phone: '+1-888-000', createdAt: '2024-03-01' },
  { id: 'SC-009', code: 'HERMES', name: 'Evri(My Hermes)物流', categoryId: 'CAT-04', type: '快递', region: '英国', status: '启用', contact: 'James', phone: '+44-330', createdAt: '2024-03-05' },
  { id: 'SC-010', code: 'STAMPS', name: 'USPS Stamps', categoryId: 'CAT-02', type: '快递', region: '北美', status: '启用', contact: 'Amy', phone: '+1-888-123', createdAt: '2024-03-10' },
  { id: 'SC-011', code: 'WINIT', name: '万邦物流平台', categoryId: 'CAT-01', type: '专线', region: '国际', status: '启用', contact: '李华', phone: '0755-7777', createdAt: '2024-03-15' },
  { id: 'SC-012', code: 'CAINIAO', name: '菜鸟物流', categoryId: 'CAT-03', type: '专线', region: '国际', status: '启用', contact: '周明', phone: '0571-2688', createdAt: '2024-04-01' },
  { id: 'SC-013', code: 'CDISCOUNT', name: 'CdiscountFBC', categoryId: 'CAT-06', type: '平台', region: '欧洲', status: '启用', contact: 'Pierre', phone: '+33-800', createdAt: '2024-04-10' },
  { id: 'SC-014', code: 'DPEX', name: '出口易国际物流(旧版)', categoryId: 'CAT-03', type: '专线', region: '国际', status: '停用', contact: '陈辉', phone: '0755-3333', createdAt: '2024-04-15' },
  { id: 'SC-015', code: 'YC', name: '易仓国际平台', categoryId: 'CAT-01', type: '平台', region: '国际', status: '启用', contact: '刘洋', phone: '0755-5555', createdAt: '2024-05-01' },
  { id: 'SC-016', code: 'COSCO', name: '中远海运', categoryId: 'CAT-05', type: '海运', region: '国际', status: '启用', contact: '黄海', phone: '021-6596', createdAt: '2024-05-10' },
];

export const carrierAuths: CarrierAuth[] = [
  { id: 'AUTH-001', carrierId: 'SC-002', carrierName: 'UPS', authType: 'api_key', status: '已授权', apiAddress: 'https://onlinetools.ups.com/webservices/Ship', username: 'UPS_User_Name', accessKey: 'UPS_Access_Key', accountNumber: 'UPS_Account_Number', authorizedAt: '2024-02-15', expiresAt: '2025-02-15' },
  { id: 'AUTH-002', carrierId: 'SC-003', carrierName: 'FedEx', authType: 'oauth2', status: '已授权', apiAddress: 'https://apis.fedex.com', username: 'FedEx_Client_ID', accessKey: 'FedEx_Client_Secret', accountNumber: 'FEDEX-ACC-001', authorizedAt: '2024-03-01', expiresAt: '2025-03-01' },
  { id: 'AUTH-003', carrierId: 'SC-004', carrierName: 'DHL Express', authType: 'api_key', status: '已授权', apiAddress: 'https://express.api.dhl.com', username: 'DHL_API_Key', accessKey: '***', authorizedAt: '2024-03-10' },
  { id: 'AUTH-004', carrierId: 'SC-001', carrierName: 'USPS Endicia', authType: 'account_password', status: '已授权', apiAddress: 'https://elsweb.endicia.com', username: 'USPS_Account', authorizedAt: '2024-01-20' },
  { id: 'AUTH-005', carrierId: 'SC-005', carrierName: '4PX全球集运平台', authType: 'token', status: '已授权', apiAddress: 'https://open.4px.com', accessKey: '4PX_TOKEN_***', authorizedAt: '2024-04-01' },
  { id: 'AUTH-006', carrierId: 'SC-011', carrierName: '万邦物流平台', authType: 'token', status: '已过期', apiAddress: 'https://api.winit.com.cn', accessKey: 'WINIT_TOKEN_***', authorizedAt: '2023-06-01', expiresAt: '2024-06-01', remark: '需续期' },
];

export const serviceProducts: ServiceProduct[] = [
  // UPS 服务方式（含数字代码）
  { id: 'SVC-001', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_71', name: 'UPS Worldwide Express Freight Midday', serviceCode: '71', shipMethod: 'Express', deliveryPromise: '1-3工作日', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-002', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_72', name: 'UPS Worldwide Economy DDP', serviceCode: '72', shipMethod: 'Parcel', deliveryPromise: '5-8工作日', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-003', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_82', name: 'UPS Today Standard', serviceCode: '82', shipMethod: 'Express', deliveryPromise: '当日达', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-004', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_83', name: 'UPS Today Dedicated Courier', serviceCode: '83', shipMethod: 'Express', deliveryPromise: '当日专送', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-005', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_84', name: 'UPS Today Intercity', serviceCode: '84', shipMethod: 'Express', deliveryPromise: '城际当日', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-006', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_85', name: 'UPS Today Express', serviceCode: '85', shipMethod: 'Express', deliveryPromise: '今日快递', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-007', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_86', name: 'UPS Today Express Saver', serviceCode: '86', shipMethod: 'Express', deliveryPromise: '今日经济', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-008', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_87', name: 'UPS SurePost(R) Less than 1 lb', serviceCode: '87', shipMethod: 'Parcel', deliveryPromise: '3-5工作日', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-009', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_70', name: 'UPS Access Point Economy', serviceCode: '70', shipMethod: 'Parcel', deliveryPromise: '5-7工作日', updatedAt: '2025-01-15', status: '启用' },
  { id: 'SVC-010', carrierId: 'SC-002', carrierName: 'UPS', code: 'UPS_24', name: 'UPS SurePost(R) BPM', serviceCode: '24', shipMethod: 'Parcel', deliveryPromise: '3-7工作日', updatedAt: '2025-01-15', status: '启用' },

  // FedEx 服务方式
  { id: 'SVC-020', carrierId: 'SC-003', carrierName: 'FedEx', code: 'FEDEX_GND', name: 'FedEx Ground', shipMethod: 'Parcel', deliveryPromise: '3-5工作日', updatedAt: '2025-01-10', status: '启用' },
  { id: 'SVC-021', carrierId: 'SC-003', carrierName: 'FedEx', code: 'FEDEX_2DAY', name: 'FedEx 2Day', shipMethod: 'Express', deliveryPromise: '2工作日', updatedAt: '2025-01-10', status: '启用' },
  { id: 'SVC-022', carrierId: 'SC-003', carrierName: 'FedEx', code: 'FEDEX_OVERNIGHT', name: 'FedEx Priority Overnight', shipMethod: 'Express', deliveryPromise: '次工作日', updatedAt: '2025-01-10', status: '启用' },
  { id: 'SVC-023', carrierId: 'SC-003', carrierName: 'FedEx', code: 'FEDEX_SAVER', name: 'FedEx Express Saver', shipMethod: 'Express', deliveryPromise: '3工作日', updatedAt: '2025-01-10', status: '启用' },
  { id: 'SVC-024', carrierId: 'SC-003', carrierName: 'FedEx', code: 'FEDEX_HOME', name: 'FedEx Home Delivery', shipMethod: 'Parcel', deliveryPromise: '2-5工作日', updatedAt: '2025-01-10', status: '启用' },
  // USPS 服务方式
  { id: 'SVC-030', carrierId: 'SC-001', carrierName: 'USPS Endicia', code: 'USPS_PRIORITY', name: 'USPS Priority Mail', shipMethod: 'Parcel', deliveryPromise: '1-3工作日', updatedAt: '2025-01-05', status: '启用' },
  { id: 'SVC-031', carrierId: 'SC-001', carrierName: 'USPS Endicia', code: 'USPS_FIRST', name: 'USPS First Class', shipMethod: 'Parcel', deliveryPromise: '2-5工作日', updatedAt: '2025-01-05', status: '启用' },
  { id: 'SVC-032', carrierId: 'SC-001', carrierName: 'USPS Endicia', code: 'USPS_EXPRESS', name: 'USPS Priority Mail Express', shipMethod: 'Express', deliveryPromise: '1-2工作日', updatedAt: '2025-01-05', status: '启用' },
  // DHL 服务方式
  { id: 'SVC-040', carrierId: 'SC-004', carrierName: 'DHL Express', code: 'DHL_EXP', name: 'DHL Express Worldwide', shipMethod: 'Express', deliveryPromise: '1-3工作日', updatedAt: '2025-01-08', status: '启用' },
  { id: 'SVC-041', carrierId: 'SC-004', carrierName: 'DHL Express', code: 'DHL_ECOM', name: 'DHL eCommerce', shipMethod: 'Parcel', deliveryPromise: '7-15工作日', updatedAt: '2025-01-08', status: '启用' },
  // 4PX 服务方式
  { id: 'SVC-050', carrierId: 'SC-005', carrierName: '4PX全球集运平台', code: '4PX_STD', name: '4PX经济小包', shipMethod: 'Parcel', deliveryPromise: '7-15工作日', updatedAt: '2025-02-01', status: '启用' },
  { id: 'SVC-051', carrierId: 'SC-005', carrierName: '4PX全球集运平台', code: '4PX_EXP', name: '4PX标准快递', shipMethod: 'Express', deliveryPromise: '5-8工作日', updatedAt: '2025-02-01', status: '启用' },
  // 万邦
  { id: 'SVC-060', carrierId: 'SC-011', carrierName: '万邦物流平台', code: 'WINIT_STD', name: '万邦标准', shipMethod: 'Parcel', deliveryPromise: '7-12工作日', updatedAt: '2025-01-20', status: '启用' },
  { id: 'SVC-061', carrierId: 'SC-011', carrierName: '万邦物流平台', code: 'WINIT_EXP', name: '万邦快速', shipMethod: 'Express', deliveryPromise: '3-5工作日', updatedAt: '2025-01-20', status: '启用' },
];

export const connectedSystems: ConnectedSystem[] = [
  { id: 'SYS-001', name: 'Shopify', direction: 'upstream', type: 'channel', status: '已连接' },
  { id: 'SYS-002', name: 'Amazon', direction: 'upstream', type: 'channel', status: '已连接' },
  { id: 'SYS-003', name: 'TikTok', direction: 'upstream', type: 'channel', status: '已连接' },
  { id: 'SYS-004', name: 'Walmart', direction: 'upstream', type: 'channel', status: '已连接' },
  { id: 'SYS-005', name: 'Temu', direction: 'upstream', type: 'channel', status: '已连接' },
  { id: 'SYS-006', name: 'B2B客户ERP', direction: 'upstream', type: 'erp', status: '已连接' },
  { id: 'SYS-007', name: 'WMS-华东', direction: 'downstream', type: 'wms', status: '已连接' },
  { id: 'SYS-008', name: 'WMS-华南', direction: 'downstream', type: 'wms', status: '已连接' },
  { id: 'SYS-009', name: 'WMS-北美', direction: 'downstream', type: 'wms', status: '已连接' },
  { id: 'SYS-010', name: '菜鸟', direction: 'downstream', type: 'tms', status: '已连接' },
  { id: 'SYS-011', name: '4PX递四方', direction: 'downstream', type: 'fulfillment', status: '已连接' },
];

export const externalOptions: ExternalOption[] = [
  // Shopify
  { id: 'EO-001', systemId: 'SYS-001', code: 'fedex_ground', displayName: 'FedEx Ground', mapped: true },
  { id: 'EO-002', systemId: 'SYS-001', code: 'fedex_2day', displayName: 'FedEx 2Day', mapped: true },
  { id: 'EO-003', systemId: 'SYS-001', code: 'ups_ground', displayName: 'UPS Ground', mapped: true },
  { id: 'EO-004', systemId: 'SYS-001', code: 'usps_priority', displayName: 'USPS Priority Mail', mapped: false },
  // Amazon
  { id: 'EO-010', systemId: 'SYS-002', code: 'UPS_GND', displayName: 'UPS Ground Shipping', mapped: true },
  { id: 'EO-011', systemId: 'SYS-002', code: 'UPS_2DA', displayName: 'UPS 2nd Day', mapped: true },
  { id: 'EO-012', systemId: 'SYS-002', code: 'FEDEX_GND', displayName: 'FedEx Ground', mapped: false },
  { id: 'EO-013', systemId: 'SYS-002', code: 'AMZL_US_STD', displayName: 'Amazon Logistics Standard', mapped: false },
  // WMS-北美
  { id: 'EO-030', systemId: 'SYS-009', code: 'FEDEX_GROUND', displayName: 'FedEx Ground', mapped: true },
  { id: 'EO-031', systemId: 'SYS-009', code: 'UPS_GROUND', displayName: 'UPS Ground', mapped: true },
  { id: 'EO-032', systemId: 'SYS-009', code: 'UPS_2DAY', displayName: 'UPS 2nd Day Air', mapped: false },
];

export const carrierMappings: CarrierMapping[] = [
  // 渠道承运商映射（对标截图中的 "渠道承运商" → "系统承运商代码"）
  { id: 'CM-001', externalName: 'UPS', externalCode: 'UPS', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-002', systemCarrierName: 'UPS', systemServiceId: 'SVC-001', systemServiceName: 'UPS Worldwide Express Freight Midday', mappedCode: 'UPS', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-15', createdAt: '2024-06-01', remark: '国际主计费' },
  { id: 'CM-002', externalName: 'USPS Endicia', externalCode: 'USPS', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-001', systemCarrierName: 'USPS Endicia', systemServiceId: 'SVC-030', systemServiceName: 'USPS Priority Mail', mappedCode: 'USPS', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-15', createdAt: '2024-06-01', remark: '国际主计费' },
  { id: 'CM-003', externalName: '4PX小包', externalCode: '4PX', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-005', systemCarrierName: '4PX全球集运平台', systemServiceId: 'SVC-050', systemServiceName: '4PX经济小包', mappedCode: 'WINIT', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-10', createdAt: '2024-06-05', remark: '走云仓物流' },
  { id: 'CM-004', externalName: '万邦指派方式', externalCode: 'WINIT', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-011', systemCarrierName: '万邦物流平台', systemServiceId: 'SVC-060', systemServiceName: '万邦标准', mappedCode: 'WINIT', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-10', createdAt: '2024-06-05', remark: '' },
  { id: 'CM-005', externalName: 'E邮宝/E特快', externalCode: 'EPACKET', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'EPOSYSTEM', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-08', createdAt: '2024-07-01', remark: '第三方e邮宝' },
  { id: 'CM-006', externalName: '全速物件', externalCode: 'LEE', source: 'upstream', sourceSystemId: 'SYS-001', sourceSystem: 'Shopify', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'LEE', mappingStatus: '未映射', isDefault: false, lastSyncAt: '2025-01-05', createdAt: '2024-07-10', remark: '完整解析中' },
  { id: 'CM-007', externalName: '百草园', externalCode: 'BLY', source: 'upstream', sourceSystemId: 'SYS-003', sourceSystem: 'TikTok', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'BLY', mappingStatus: '未映射', isDefault: false, lastSyncAt: '2025-01-03', createdAt: '2024-08-01', remark: '' },
  { id: 'CM-008', externalName: '皇家国际', externalCode: 'APAC', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'APAC', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2025-01-01', createdAt: '2024-08-10', remark: '皇家国际专线' },
  { id: 'CM-009', externalName: 'DDP4', externalCode: 'DDP4', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-004', systemCarrierName: 'DHL Express', systemServiceId: 'SVC-040', systemServiceName: 'DHL Express Worldwide', mappedCode: 'DDH', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-12-20', createdAt: '2024-08-15', remark: '' },
  { id: 'CM-010', externalName: 'YANT通', externalCode: 'YANT', source: 'upstream', sourceSystemId: 'SYS-004', sourceSystem: 'Walmart', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'WISH', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-12-15', createdAt: '2024-09-01', remark: '' },
  { id: 'CM-011', externalName: '速卖通(上线)', externalCode: 'ALIEXPRESS', source: 'upstream', sourceSystemId: 'SYS-005', sourceSystem: 'Temu', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'ALIEXPRESSONLINE', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-12-10', createdAt: '2024-09-10', remark: '半托管模式' },
  { id: 'CM-012', externalName: 'USPS Stamps', externalCode: 'STAMPS', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-010', systemCarrierName: 'USPS Stamps', systemServiceId: '', systemServiceName: '', mappedCode: 'STAMPS', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-12-05', createdAt: '2024-09-15', remark: '国际主计费' },
  { id: 'CM-013', externalName: '万邮通系列', externalCode: 'WINYMP', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: 'SC-011', systemCarrierName: '万邦物流平台', systemServiceId: 'SVC-061', systemServiceName: '万邦快速', mappedCode: 'WINYMP', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-11-30', createdAt: '2024-10-01', remark: '万邦快速通道' },
  { id: 'CM-014', externalName: '纬达路服务通运(新版)', externalCode: 'CXEPRESS', source: 'upstream', sourceSystemId: 'SYS-001', sourceSystem: 'Shopify', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'CXEPRESS', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-11-25', createdAt: '2024-10-10', remark: '万邑通服务通道' },
  { id: 'CM-015', externalName: 'Evri(My Hermes)物流', externalCode: 'HERMES', source: 'upstream', sourceSystemId: 'SYS-001', sourceSystem: 'Shopify', systemCarrierId: 'SC-009', systemCarrierName: 'Evri(My Hermes)物流', systemServiceId: '', systemServiceName: '', mappedCode: 'HERMES', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-11-20', createdAt: '2024-10-15', remark: '覆盖主计费英' },
  { id: 'CM-016', externalName: '认证DPC', externalCode: 'DPC', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'DPDUK', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-11-15', createdAt: '2024-10-20', remark: '' },
  { id: 'CM-017', externalName: '华翰物联服务单', externalCode: 'HUALED', source: 'upstream', sourceSystemId: 'SYS-002', sourceSystem: 'Amazon', systemCarrierId: '', systemCarrierName: '', systemServiceId: '', systemServiceName: '', mappedCode: 'HUALED', mappingStatus: '已映射', isDefault: false, lastSyncAt: '2024-11-10', createdAt: '2024-10-25', remark: '' },
];

export const carrierWarehouseBindings: CarrierWarehouseBinding[] = [
  { id: 'WB-001', carrierId: 'SC-002', carrierName: 'UPS', serviceId: 'SVC-001', serviceName: 'UPS Worldwide Express Freight Midday', warehouseId: 'WH-001', warehouseName: 'YC二仓', platformWarehouseCode: 'YZ', status: '启用', createdAt: '2024-06-01' },
  { id: 'WB-002', carrierId: 'SC-002', carrierName: 'UPS', serviceId: 'SVC-002', serviceName: 'UPS Worldwide Economy DDP', warehouseId: 'WH-001', warehouseName: 'YC二仓', platformWarehouseCode: 'YZ', status: '启用', createdAt: '2024-06-01' },
  { id: 'WB-003', carrierId: 'SC-003', carrierName: 'FedEx', serviceId: 'SVC-020', serviceName: 'FedEx Ground', warehouseId: 'WH-002', warehouseName: '美西仓', platformWarehouseCode: 'US-WEST', status: '启用', createdAt: '2024-06-05' },
  { id: 'WB-004', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', warehouseId: 'WH-002', warehouseName: '美西仓', platformWarehouseCode: 'US-WEST', status: '启用', createdAt: '2024-06-10' },
  { id: 'WB-005', carrierId: 'SC-005', carrierName: '4PX全球集运平台', serviceId: 'SVC-050', serviceName: '4PX经济小包', warehouseId: 'WH-003', warehouseName: '深圳仓', platformWarehouseCode: 'SZ-01', status: '启用', createdAt: '2024-07-01' },
  { id: 'WB-006', carrierId: 'SC-002', carrierName: 'UPS', serviceId: 'SVC-003', serviceName: 'UPS Today Standard', warehouseId: 'WH-004', warehouseName: '美东仓', platformWarehouseCode: 'US-EAST', status: '启用', createdAt: '2024-07-15' },
];

export const platformShippingBinds: PlatformShippingBind[] = [
  // USPS 3PL US → 各平台绑定
  { id: 'PSB-001', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', platform: 'Amazon', platformShipMethod: '平台物', platformDeliveryService: '国际/美国标准...', labelSpec: '', overrideTracking: false, status: '启用' },
  { id: 'PSB-002', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', platform: 'TikTok', platformShipMethod: '平台', platformDeliveryService: '', labelSpec: '', overrideTracking: false, status: '启用' },
  { id: 'PSB-003', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', platform: 'Shopify', platformShipMethod: '平台', platformDeliveryService: '', labelSpec: '', overrideTracking: false, status: '启用' },
  { id: 'PSB-004', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', platform: 'Walmart', platformShipMethod: '自定义', platformDeliveryService: '', labelSpec: '', overrideTracking: false, status: '启用' },
  { id: 'PSB-005', carrierId: 'SC-001', carrierName: 'USPS Endicia', serviceId: 'SVC-030', serviceName: 'USPS Priority Mail', platform: 'Temu', platformShipMethod: '半托管', platformDeliveryService: '', labelSpec: '', overrideTracking: false, status: '启用' },
  // UPS → 各平台绑定
  { id: 'PSB-010', carrierId: 'SC-002', carrierName: 'UPS', serviceId: 'SVC-001', serviceName: 'UPS Worldwide Express Freight Midday', platform: 'Amazon', platformShipMethod: '自营物流', platformDeliveryService: 'UPS_GND', labelSpec: '', overrideTracking: false, status: '启用' },
  { id: 'PSB-011', carrierId: 'SC-002', carrierName: 'UPS', serviceId: 'SVC-001', serviceName: 'UPS Worldwide Express Freight Midday', platform: 'Shopify', platformShipMethod: '平台', platformDeliveryService: '', labelSpec: '', overrideTracking: false, status: '启用' },
];

export const consolidationConfigs: ConsolidationConfig[] = [
  { id: 'CON-001', serviceId: 'SVC-001', serviceName: 'UPS Worldwide Express Freight Midday', consolidatedServiceId: 'SVC-001', consolidatedServiceName: 'UPS Worldwide Express Freight Midday', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-002', serviceId: 'SVC-002', serviceName: 'UPS Worldwide Economy DDP', consolidatedServiceId: 'SVC-002', consolidatedServiceName: 'UPS Worldwide Economy DDP', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-003', serviceId: 'SVC-003', serviceName: 'UPS Today Standard', consolidatedServiceId: 'SVC-003', consolidatedServiceName: 'UPS Today Standard', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-004', serviceId: 'SVC-004', serviceName: 'UPS Today Dedicated Courier', consolidatedServiceId: 'SVC-004', consolidatedServiceName: 'UPS Today Dedicated Courier', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-005', serviceId: 'SVC-005', serviceName: 'UPS Today Intercity', consolidatedServiceId: 'SVC-005', consolidatedServiceName: 'UPS Today Intercity', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-006', serviceId: 'SVC-006', serviceName: 'UPS Today Express', consolidatedServiceId: 'SVC-006', consolidatedServiceName: 'UPS Today Express', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-007', serviceId: 'SVC-007', serviceName: 'UPS Today Express Saver', consolidatedServiceId: 'SVC-007', consolidatedServiceName: 'UPS Today Express Saver', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-008', serviceId: 'SVC-008', serviceName: 'UPS SurePost(R) Less than 1 lb', consolidatedServiceId: 'SVC-008', consolidatedServiceName: 'UPS SurePost(R) Less than 1 lb', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-009', serviceId: 'SVC-009', serviceName: 'UPS Access Point Economy', consolidatedServiceId: 'SVC-009', consolidatedServiceName: 'UPS Access Point Economy', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
  { id: 'CON-010', serviceId: 'SVC-010', serviceName: 'UPS SurePost(R) BPM', consolidatedServiceId: 'SVC-010', consolidatedServiceName: 'UPS SurePost(R) BPM', warehouseId: 'WH-001', warehouseName: 'YC二仓(YZ)', status: '启用' },
];

/** 表格列定义 */
export const carrierColumns: TableColumn<SystemCarrier>[] = [
  { key: 'code', label: '编码' },
  { key: 'name', label: '名称' },
  { key: 'type', label: '类型' },
  { key: 'region', label: '区域' },
  { key: 'status', label: '状态', isStatus: true },
  { key: 'contact', label: '联系人' },
  { key: 'createdAt', label: '创建时间' },
];

export const carrierMappingColumns: TableColumn<CarrierMapping>[] = [
  { key: 'externalName', label: '渠道承运商名称' },
  { key: 'mappedCode', label: '系统承运商代码' },
  { key: 'source', label: '方向' },
  { key: 'sourceSystem', label: '来源平台' },
  { key: 'mappingStatus', label: '状态', isStatus: true },
  { key: 'lastSyncAt', label: '最后同步' },
];
