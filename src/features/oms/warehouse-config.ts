import type { Connection } from '@/lib/amazon-connections';
import type { GenericConnection } from '@/lib/app-store';
import { warehouses as sharedWarehouses } from '@/lib/mock-data/warehouses';
import type { OmsSnapshot, WarehouseRecord } from './types';

export type WarehouseSupplier = { id: string; appId: string; connectionId: string; name: string; capability: 'mcf' | 'warehouse'; site: string; externalWarehouses: { id: string; name: string }[]; canExecute: boolean };
export const amazonInventoryPoolId = (connectionId: string, site: string) => `fba:${connectionId}:${site}`;

/** Legacy bindings remain the same warehouse identities; no silent creation or re-keying. */
export function warehouseRecords(snapshot: OmsSnapshot): WarehouseRecord[] {
  const records = snapshot.warehouseRecords ?? [];
  return [...records, ...(snapshot.fulfillmentWarehouses ?? []).filter(legacy => !records.some(record => record.id === legacy.id)).map(legacy => ({
    id: legacy.id, code: legacy.code, name: legacy.name, kind: 'platform' as const, country: '', city: '', address: '', active: legacy.active,
    binding: { appId: legacy.app, connectionId: legacy.connectionId, capability: legacy.capability, externalWarehouseId: amazonInventoryPoolId(legacy.connectionId, legacy.site), site: legacy.site },
  }))];
}

/** Connected APPs advertise warehouse resources; a connection alone is not an executable warehouse. */
export function warehouseSuppliers(amazon: Connection[], generic: GenericConnection[]): WarehouseSupplier[] {
  const sellers: WarehouseSupplier[] = amazon.filter(connection => connection.authorized && connection.identity === 'seller' && connection.businesses.mcf?.status === 'enabled' && !!connection.businesses.mcf.site).map(connection => {
    const site = connection.businesses.mcf!.site;
    return { id: `amazon:${connection.id}:${site}`, appId: 'amazon', connectionId: connection.id, name: `Amazon · ${connection.name}`, capability: 'mcf', site, canExecute: true,
      externalWarehouses: [{ id: amazonInventoryPoolId(connection.id, site), name: `${connection.name} · ${site} FBA 库存池（逻辑仓）` }] };
  });
  return [...sellers, ...generic.filter(connection => connection.appId === 'warehouse-webhooks' && connection.status === 'connected').map(connection => ({
    id: `${connection.appId}:${connection.id}`, appId: connection.appId, connectionId: connection.id, name: `Warehouse Webhooks · ${connection.name}`, capability: 'warehouse' as const, site: '', externalWarehouses: [], canExecute: false,
  }))];
}

export function saveWarehouseRecord(state: OmsSnapshot, input: WarehouseRecord) {
  const record = structuredClone(input);
  record.code = record.code.trim(); record.name = record.name.trim();
  if (!record.id || !record.code || !record.name || record.code.length > 64 || record.name.length > 100 || !['local', 'virtual', 'platform'].includes(record.kind) || typeof record.active !== 'boolean' || [record.country, record.city, record.address].some(value => typeof value !== 'string')) throw new Error('请填写有效的仓库编码、名称和类型');
  if (sharedWarehouses.some(item => item.id === record.id || item.code.toLowerCase() === record.code.toLowerCase())) throw new Error('共享仓库样本不可覆盖，请使用新的仓库编码');
  const existing = warehouseRecords(state);
  if (existing.some(item => item.id !== record.id && item.code.toLowerCase() === record.code.toLowerCase())) throw new Error('仓库编码已存在');
  if (record.kind === 'local' && (!record.country.trim() || !record.city.trim() || !record.address.trim())) throw new Error('本地仓库须填写国家、城市和地址');
  if (record.kind !== 'platform' && record.binding) throw new Error('本地仓和虚拟仓不能绑定 APP 执行接口');
  if (record.kind === 'platform') {
    const binding = record.binding;
    if (!binding || binding.appId !== 'amazon' || binding.capability !== 'mcf' || !binding.connectionId || !binding.site || binding.externalWarehouseId !== amazonInventoryPoolId(binding.connectionId, binding.site)) throw new Error('请选择 APP 实际提供的仓库资源；当前仅 Amazon MCF 提供可关联库存池');
    if (existing.some(item => item.id !== record.id && item.binding?.appId === binding.appId && item.binding.connectionId === binding.connectionId && item.binding.externalWarehouseId === binding.externalWarehouseId)) throw new Error('该供应商仓库已关联，不能重复建立库存池');
  }
  const previous = existing.find(item => item.id === record.id);
  if (previous && (previous.kind !== record.kind || JSON.stringify(previous.binding) !== JSON.stringify(record.binding)) && (state.fulfillments.some(task => task.warehouseId === record.id) || state.stocks.some(stock => stock.warehouseId === record.id))) throw new Error('仓库已有库存或履约记录，不可更换类型或执行绑定，请新建仓库');
  const records = state.warehouseRecords ??= [];
  const index = records.findIndex(item => item.id === record.id);
  if (index < 0) records.push(record); else records[index] = record;
  // Compatibility projection for existing MCF execution code, not a second editable authority.
  state.fulfillmentWarehouses = (state.fulfillmentWarehouses ?? []).filter(item => item.id !== record.id);
  if (record.binding?.appId === 'amazon' && record.binding.capability === 'mcf') state.fulfillmentWarehouses.push({ id: record.id, code: record.code, name: record.name, app: 'amazon', capability: 'mcf', connectionId: record.binding.connectionId, site: record.binding.site, active: record.active });
  return record;
}
