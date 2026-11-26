import { connectionStorageKey, parseConnections, type Connection } from './amazon-connections';
import { getMerchantsByCompany } from './tenant-context';

export const appCatalog = [
  { id: 'amazon', name: 'Amazon', category: '销售渠道', description: '连接卖家与供应商账号，集中管理亚马逊业务。', capabilities: ['Seller / Vendor', '订单与履约', 'FBA 补货'], requirements: ['拥有 Seller Central 或 Vendor Central 账号', '使用具备相应业务权限的账号授权', '连接后分别启用所需业务'], mode: 'full' },
  { id: 'shopify', name: 'Shopify', category: '销售渠道', description: '管理独立站账号的连接与授权信息。', capabilities: ['账号连接管理'], requirements: ['店铺管理员权限', '可识别的店铺名称'], mode: 'connection' },
  { id: 'netsuite', name: 'NetSuite', category: '财务系统', description: '维护财务系统连接，关联外部账套。', capabilities: ['账号连接管理'], requirements: ['有权限访问目标账套', '明确连接所属商家'], mode: 'connection' },
  { id: 'warehouse-webhooks', name: 'Warehouse Webhooks', category: '仓储服务', description: '维护仓储事件服务的连接信息。', capabilities: ['连接管理'], requirements: ['明确目标仓储服务', '明确连接所属商家'], mode: 'connection' }
] as const;
export type AppId = typeof appCatalog[number]['id'];
export type GenericConnection = { id: string; appId: string; name: string; status: 'connected' | 'paused' };
export const genericStorageKey = (companyId: string, merchantId: string) => `oms-appstore-demo-v1:${companyId}:${merchantId}`;
export function parseGenericConnections(raw: string | null): GenericConnection[] {
  const value: unknown = JSON.parse(raw ?? '[]');
  if (!Array.isArray(value) || value.some((item) => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || !appCatalog.some((app) => app.id === item.appId && app.id !== 'amazon') || !['connected', 'paused'].includes(item.status))) throw new Error('应用连接数据格式无效');
  return value;
}
export function assertMerchant(companyId: string, merchantId: string) {
  if (!getMerchantsByCompany(companyId).some((merchant) => merchant.id === merchantId)) throw new Error('请选择当前公司下的具体商家');
}
export function appendAmazonConnection(companyId: string, merchantId: string, connection: Connection) {
  assertMerchant(companyId, merchantId);
  const key = connectionStorageKey(companyId, merchantId);
  const existing = parseConnections(localStorage.getItem(key));
  if (existing.some((item) => item.id === connection.id)) return;
  localStorage.setItem(key, JSON.stringify({ connections: [...existing, connection] }));
  window.dispatchEvent(new Event('amazon-connections-changed'));
}
export type ConnectionRow = { id: string; appId: AppId; name: string; merchantId: string; merchantName: string; identity: string; authorization: string; business: string; configured: boolean; active: boolean };
export function filterAppConnections(rows: ConnectionRow[], query: string, category: string) {
  const search = query.trim().toLowerCase();
  return rows.filter((row) => {
    const app = appCatalog.find((item) => item.id === row.appId)!;
    return (!category || category === app.category) && `${row.name} ${row.merchantName} ${app.name} ${row.identity} ${row.authorization} ${row.business}`.toLowerCase().includes(search);
  });
}
