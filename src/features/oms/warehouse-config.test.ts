import { describe, expect, it } from 'vitest';
import { emptySnapshot, type WarehouseRecord } from './types';
import { executeOmsCommand } from './commands';
import { warehouseRecords, warehouseSuppliers } from './warehouse-config';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
const initial = () => emptySnapshot({ tenantId: 't', companyId: 'c', merchantId: 'm' });
const ctx = (id: string) => ({ id, now: 0, actor: 'ops', canWrite: true });
const local: WarehouseRecord = { id: 'local', name: '本地仓', code: 'LOCAL', kind: 'local', country: 'CN', city: '深圳', address: '测试地址', active: true };
const platform: WarehouseRecord = { ...local, id: 'platform', name: '平台仓', code: 'PLATFORM', kind: 'platform', binding: { appId: 'amazon', capability: 'mcf', connectionId: 'seller', site: 'US', externalWarehouseId: 'fba:seller:US' } };
describe('generic warehouse center', () => {
  it('creates local and virtual warehouses independently of APP connections and persists with no stock fabrication', () => {
    let state = executeOmsCommand(initial(), { type: 'save_warehouse', warehouse: local }, ctx('local'));
    state = executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...local, id: 'virtual', code: 'VIRTUAL', kind: 'virtual', address: '', city: '', country: '' } }, ctx('virtual'));
    expect(warehouseRecords(JSON.parse(JSON.stringify(state))).map(item => item.kind)).toEqual(['local', 'virtual']);
    expect(state.stocks).toEqual([]); expect(state.fulfillmentWarehouses).toEqual([]);
    expect(() => executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...local, id: 'duplicate', code: 'local' } }, ctx('dup'))).toThrow(/编码/);
    expect(() => executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...local, id: 'incomplete', code: 'INCOMPLETE', address: '' } }, ctx('bad'))).toThrow(/地址/);
  });
  it('binds the actual supplier warehouse resource and keeps MCF compatibility on the same ID', () => {
    let state = executeOmsCommand(initial(), { type: 'save_warehouse', warehouse: platform }, ctx('platform'));
    expect(state.fulfillmentWarehouses?.[0]).toMatchObject({ id: platform.id, connectionId: 'seller', site: 'US' });
    expect(warehouseRecords(state)).toHaveLength(1);
    state = executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...platform, name: '新名称', active: false } }, ctx('edit'));
    expect(state.fulfillmentWarehouses?.[0]).toMatchObject({ name: '新名称', active: false });
    expect(() => executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...platform, id: 'bad', code: 'BAD', binding: { ...platform.binding!, externalWarehouseId: 'invented-fc' } } }, ctx('bad'))).toThrow(/实际提供/);
  });
  it('reads legacy MCF bindings without duplicating or losing historical identities', () => {
    const state = initial(); state.fulfillmentWarehouses = [{ id: 'legacy', name: '旧仓', code: 'OLD', app: 'amazon', capability: 'mcf', connectionId: 'seller', site: 'US', active: true }];
    const record = warehouseRecords(state)[0]; expect(record.id).toBe('legacy'); expect(record.kind).toBe('platform');
    const saved = executeOmsCommand(state, { type: 'save_warehouse', warehouse: { ...record, name: '更新' } }, ctx('update'));
    expect(warehouseRecords(saved)).toHaveLength(1); expect(saved.fulfillmentWarehouses?.[0].id).toBe('legacy');
  });
  it('only advertises eligible warehouse suppliers and does not invent resources for connection-only APPs', () => {
    const seller: Connection = { id: 'seller', name: 'Seller', accountId: 'a', authorized: true, identity: 'seller', region: 'NA', businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } };
    const suppliers = warehouseSuppliers([seller, { ...seller, id: 'revoked', authorized: false }], [{ id: 'webhook', name: 'Provider', appId: 'warehouse-webhooks', status: 'connected' }, { id: 'shop', name: 'Shop', appId: 'shopify', status: 'connected' }]);
    expect(suppliers).toHaveLength(2); expect(suppliers[0].externalWarehouses[0].id).toBe('fba:seller:US');
    expect(suppliers[1]).toMatchObject({ canExecute: false, externalWarehouses: [] });
  });
});
