export type BusinessId = 'sales' | 'mcf' | 'fba' | 'wholesale' | 'df';
export type ProductMapping = { externalSku: string; omsVariantId: string; asin?: string; fnsku?: string };
export type BusinessConfig = {
  productMappings?: ProductMapping[];
  status: 'draft' | 'enabled' | 'paused';
  site: string;
  warehouse: string;
  rule: string;
  syncFrom: string;
  mappingConfirmed: boolean;
  reference: string;
  initializedAt?: string;
  syncSettings?: {
    receiveOrders: boolean;
    includeOpenOrders: boolean;
    readInventory: boolean;
    publishInventory: boolean;
    shipmentWriteback: boolean;
    receiveChanges: boolean;
    receiveExistingPlans: boolean;
    orderSources: ('amazon' | 'other')[];
    notifyOnError: boolean;
  };
  syncTask?: { status: 'queued' | 'running' | 'completed' | 'failed'; startedAt: string; completedAt?: string; error?: string };
  options?: {
    orderChannels?: 'all' | 'mfn' | 'afn';
    inventoryBuffer?: number;
    inventoryMode?: 'incremental' | 'full';
    mcfService?: 'Standard' | 'Expedited' | 'Priority';
    allowMcfFallback?: boolean;
    prepOwner?: 'SELLER' | 'AMAZON';
    labelOwner?: 'SELLER' | 'AMAZON';
    vendorPayment?: 'invoice' | 'ers';
    acknowledgement?: 'manual' | 'auto';
    dfLabelFormat?: 'PDF' | 'ZPL';
  };
};
export type Connection = {
  id: string;
  name: string;
  identity: 'seller' | 'vendor';
  region: string;
  accountId: string;
  authorized: boolean;
  businesses: Partial<Record<BusinessId, BusinessConfig>>;
};
export const businessDefinitions: { id: BusinessId; name: string; identity: Connection['identity']; description: string; href: string }[] = [
  { id: 'sales', name: '销售订单', identity: 'seller', description: '同步 3P 订单，处理自配送与原生 FBA 履约跟踪。', href: '/dashboard/orders' },
  { id: 'mcf', name: 'MCF 配送', identity: 'seller', description: '使用亚马逊库存履约，为符合条件的订单创建配送任务。', href: '/dashboard/orders' },
  { id: 'fba', name: 'FBA 补货', identity: 'seller', description: '创建入仓计划，跟踪分仓、运输、收货与可售状态。', href: '/dashboard/fba/plans' },
  { id: 'wholesale', name: '批发供货', identity: 'vendor', description: '接收 PO，处理供货确认、Routing、ASN 与收货差异。', href: '/dashboard/vendor-orders' },
  { id: 'df', name: 'Direct Fulfillment · 直发', identity: 'vendor', description: '处理 DF 接单、仓库履约、面单与发货确认。', href: '/dashboard/vendor-orders?type=df' }
];
export const connectionStorageKey = (companyId: string, merchantScope: string) => `amazon-oms-v1:${companyId}:${merchantScope}`;
export function defaultBusinessConfig(): BusinessConfig {
  return { status: 'draft', site: '', warehouse: '', rule: '', syncFrom: '', mappingConfirmed: false, reference: '' };
}
export function validateBusinessConfig(config: BusinessConfig, connection: Connection, businessId?: BusinessId): string[] {
  const errors: string[] = [];
  if (!connection.authorized) errors.push('请先完成账号授权');
  if (!config.site.trim()) errors.push('请选择适用站点');
  if (businessId === 'df' && !config.warehouse.trim()) errors.push('请关联 DF 外部仓库对应的 OMS 履约节点');
  if (businessId && !businessDefinitions.some((b) => b.id === businessId && b.identity === connection.identity)) errors.push('业务与账号身份不匹配');
  if (!config.rule.trim()) errors.push('请选择处理方式');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.syncFrom) || Number.isNaN(Date.parse(config.syncFrom))) errors.push('请选择有效的同步起始日期');
  if (businessId === 'df' && !config.mappingConfirmed) errors.push('请完成 DF 外部仓库映射');
  if (connection.identity === 'vendor' && !config.reference.trim()) errors.push('请填写 Vendor Code / DF 仓库标识');
  const allowedSites: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };
  if (config.site && !allowedSites[connection.region]?.includes(config.site)) errors.push('站点不属于当前连接区域');
  return errors;
}
export function parseConnections(raw: string | null): Connection[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('connections' in data) || !Array.isArray(data.connections)) throw new Error('连接数据格式无效');
  return data.connections.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('连接记录无效');
    const c = item as Connection;
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !['seller', 'vendor'].includes(c.identity) || !['NA', 'EU', 'FE'].includes(c.region) || typeof c.authorized !== 'boolean' || !c.businesses || typeof c.businesses !== 'object') throw new Error('连接记录不完整');
    for (const [id, config] of Object.entries(c.businesses)) {
      if (!businessDefinitions.some((b) => b.id === id && b.identity === c.identity) || !config || !['draft', 'enabled', 'paused'].includes(config.status) || ['site', 'warehouse', 'rule', 'syncFrom', 'reference'].some((key) => typeof config[key as keyof BusinessConfig] !== 'string') || typeof config.mappingConfirmed !== 'boolean') throw new Error('业务配置数据无效');
    }
    return c;
  });
}
