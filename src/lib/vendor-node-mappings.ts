export type VendorAddress = { name: string; addressLine1: string; city: string; stateOrRegion: string; postalCode: string; countryCode: string };
export type VendorParty = { partyId: string; address?: VendorAddress };
export type VendorNodeScope = { companyId: string; merchantScope: string; connectionId: string };
export type VendorNodeMapping = VendorNodeScope & { warehouseId: string; shipFromParty: VendorParty };
export type VendorNodeStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const vendorNodeStorageKey = (scope: VendorNodeScope) => `vendor-nodes-v1:${encodeURIComponent(scope.companyId)}:${encodeURIComponent(scope.merchantScope)}:${encodeURIComponent(scope.connectionId)}`;
export function vendorNodeMappingErrors(mapping: VendorNodeMapping): string[] {
  const errors: string[] = [];
  if ([mapping.companyId, mapping.merchantScope, mapping.connectionId, mapping.warehouseId].some(value => typeof value !== 'string' || !value.trim())) errors.push('节点映射作用域及 OMS 仓库不能为空');
  if (!mapping.shipFromParty?.partyId?.trim()) errors.push('请填写 Amazon shipFromParty.partyId（外部发货节点）');
  const address = mapping.shipFromParty?.address;
  if (!address || ['name', 'addressLine1', 'city', 'stateOrRegion', 'postalCode', 'countryCode'].some(key => typeof address[key as keyof VendorAddress] !== 'string' || !address[key as keyof VendorAddress].trim()) || !/^[A-Z]{2}$/.test(address.countryCode)) errors.push('节点地址须包含名称、街道、城市、州省、邮编及两位国家代码');
  return errors;
}
// Canonical local demo nodes, not Amazon-assigned/verified production identifiers.
export function seedVendorNodeMappings(scope: VendorNodeScope): VendorNodeMapping[] {
  return [
    { ...scope, warehouseId: 'wh_lax', shipFromParty: { partyId: 'DEMO-LAX-01', address: { name: 'Los Angeles Fulfillment Center', addressLine1: '3250 E 26th St', city: 'Vernon', stateOrRegion: 'CA', postalCode: '90058', countryCode: 'US' } } },
    { ...scope, warehouseId: 'wh_ewr', shipFromParty: { partyId: 'DEMO-EWR-01', address: { name: 'New Jersey East Coast Hub', addressLine1: '100 Haynes Ave', city: 'Newark', stateOrRegion: 'NJ', postalCode: '07114', countryCode: 'US' } } },
  ];
}
export function readVendorNodeMappings(storage: VendorNodeStorage, scope: VendorNodeScope): VendorNodeMapping[] {
  const raw = storage.getItem(vendorNodeStorageKey(scope));
  if (raw === null) return seedVendorNodeMappings(scope);
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('节点映射存储格式无效，请修复而非覆盖原数据');
  const rows = parsed as VendorNodeMapping[];
  if (rows.some(row => !row || row.companyId !== scope.companyId || row.merchantScope !== scope.merchantScope || row.connectionId !== scope.connectionId || vendorNodeMappingErrors(row).length) || new Set(rows.map(row => row.warehouseId)).size !== rows.length) throw new Error('节点映射无效或作用域不匹配');
  return rows;
}
export function writeVendorNodeMapping(storage: VendorNodeStorage, mapping: VendorNodeMapping): VendorNodeMapping[] {
  const errors = vendorNodeMappingErrors(mapping);
  if (errors.length) throw new Error(errors.join('；'));
  const rows = readVendorNodeMappings(storage, mapping).filter(row => row.warehouseId !== mapping.warehouseId);
  rows.push(mapping);
  storage.setItem(vendorNodeStorageKey(mapping), JSON.stringify(rows));
  return rows;
}
export function findVendorNodeMapping(rows: VendorNodeMapping[], scope: VendorNodeScope, warehouseId: string): VendorNodeMapping | undefined {
  return rows.find(row => row.companyId === scope.companyId && row.merchantScope === scope.merchantScope && row.connectionId === scope.connectionId && row.warehouseId === warehouseId);
}
