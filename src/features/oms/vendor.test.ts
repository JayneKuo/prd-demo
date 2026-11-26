import { describe, expect, it } from 'vitest';
import { seedVendorNodeMappings } from '@/lib/vendor-node-mappings';
import { advanceOmsJobs, availableToAllocate } from './commands';
import { emptySnapshot, type CommandContext } from './types';
import { advanceVendorJobs, assertVendorInvariants, ensureVendorFixtures, executeVendorCommand, type VendorCommand, type VendorOrder, type VendorSnapshot } from './vendor';

const scope = { tenantId: 'tenant_demo', companyId: 'company_northwind', merchantId: 'merchant_us_amazon' };
const context = (id: string, now = Date.parse('2026-11-04T10:00:00Z')): CommandContext => ({ id, now, actor: 'admin', canWrite: true });
function fixture() {
  const s = ensureVendorFixtures(emptySnapshot(scope)) as VendorSnapshot;
  for (const po of s.vendorOrders!) for (const line of po.lines) for (const warehouseId of ['wh_lax', 'wh_ewr']) {
    const id = `stock:${warehouseId}:${line.sku}`;
    if (!s.stocks.some(stock => stock.id === id)) s.stocks.push({ ...scope, id, revision: 1, warehouseId, sku: line.sku, pool: 'warehouse', onHand: 100, reserved: 0, unfulfillable: 2 });
  }
  return s;
}
const exec = (s: VendorSnapshot, cmd: VendorCommand, id: string, now?: number) => executeVendorCommand(s, cmd, context(id, now)) as VendorSnapshot;
const node = (po: VendorOrder, warehouseId = 'wh_lax') => seedVendorNodeMappings({ companyId: scope.companyId, merchantScope: scope.merchantId, connectionId: po.connectionId }).find(row => row.warehouseId === warehouseId)!;
function accept(s: VendorSnapshot, index = 0) {
  const po = s.vendorOrders![index];
  const pending = exec(s, { type: 'vendor_ack', purchaseOrderId: po.id, lines: po.lines.map(line => ({ ...line, accepted: line.ordered })), reason: '' }, `ack-${index}`);
  return advanceVendorJobs(pending, context('x').now + 1200) as VendorSnapshot;
}
function retailBatch(s: VendorSnapshot, index = 0, id = 'batch') {
  const po = s.vendorOrders![index];
  return exec(s, { type: 'vendor_batch', purchaseOrderId: po.id, node: node(po), batch: { id: 'untrusted-ui-id', status: 'shipped', warehouseId: 'wh_lax', route: po.route || 'Collect', lines: po.lines.map(line => ({ sku: line.sku, qty: line.accepted })), readyDate: '2026-11-04', cartons: 2, pallets: 0, weightKg: 5, volumeM3: .2, routingRef: '', destination: '', carrier: '', tracking: '', asn: '', submittedAt: '', transactionId: '' } }, id);
}
describe('canonical Vendor source and acknowledgement', () => {
  it('imports multi-line Retail and DF once, preserves archives, and exposes no unconfirmed demand', () => {
    const s = fixture(); s.archives.oldVendor = '{"untouched":true}';
    expect(ensureVendorFixtures(s)).toBe(s);
    expect(s.vendorOrders!.map(po => po.type)).toEqual(['retail', 'retail', 'df']);
    expect(s.vendorOrders!.every(po => po.lines.length === 2)).toBe(true);
    for (const po of s.vendorOrders!) for (const line of po.lines) expect(availableToAllocate(s, po.salesOrderId, line.id)).toBe(0);
    assertVendorInvariants(s);
    expect(s.archives.oldVendor).toBe('{"untouched":true}');
  });
  it('pending acknowledgement gates allocation, and deferred quantities require later acknowledgement', () => {
    let s = fixture(); const po = s.vendorOrders![0];
    const lines = po.lines.map(line => ({ ...line, accepted: 2, backorder: line.ordered - 2, scheduledShipDate: '2026-11-10' }));
    s = exec(s, { type: 'vendor_ack', purchaseOrderId: po.id, lines, reason: '' }, 'partial');
    expect(availableToAllocate(s, po.salesOrderId, po.lines[0].id)).toBe(0);
    expect(() => retailBatch(s)).toThrow('确认回执');
    s = advanceVendorJobs(s, context('x').now + 1200) as VendorSnapshot;
    expect(availableToAllocate(s, po.salesOrderId, po.lines[0].id)).toBe(2);
    const confirmed = s.vendorOrders![0];
    expect(() => exec(s, { type: 'vendor_ack', purchaseOrderId: po.id, lines: confirmed.lines.map(line => ({ ...line, accepted: 1, backorder: line.ordered - 1 })), reason: '' }, 'reduce')).toThrow('既有承诺');
    s = exec(s, { type: 'vendor_ack', purchaseOrderId: po.id, lines: confirmed.lines.map(line => ({ ...line, accepted: line.ordered, backorder: 0 })), reason: '' }, 'deferred');
    s = advanceVendorJobs(s, context('x').now + 1200) as VendorSnapshot;
    expect(availableToAllocate(s, po.salesOrderId, po.lines[0].id)).toBe(po.lines[0].ordered);
  });
  it('enforces idempotency, concrete scope, permissions, revisions, immutable source and quantity partition', () => {
    const s = fixture(); const po = s.vendorOrders![0];
    const command: VendorCommand = { type: 'vendor_ack', purchaseOrderId: po.id, lines: po.lines.map(line => ({ ...line, accepted: line.ordered })), reason: '' };
    const pending = exec(s, command, 'same'); expect(exec(pending, command, 'same')).toBe(pending);
    expect(() => executeVendorCommand(s, command, { ...context('p'), canWrite: false })).toThrow('权限');
    expect(() => executeVendorCommand(s, command, { ...context('p'), expectedRevision: 44 })).toThrow('已变化');
    expect(() => exec({ ...s, merchantId: 'all' }, command, 'all')).toThrow('具体商家');
    expect(() => exec(s, { ...command, lines: command.lines.map(line => ({ ...line, ordered: 100 })) }, 'tamper')).toThrow();
    expect(() => exec(s, { ...command, lines: command.lines.map(line => ({ ...line, accepted: line.ordered + 1 })) }, 'over')).toThrow('之和');
  });
});
describe('Retail core execution, ASN and receipts', () => {
  it('allocates accepted lines only through core reservations and rejects duplicate or unavailable quantities atomically', () => {
    const s = accept(fixture()); const allocated = retailBatch(s);
    expect(allocated.fulfillments).toHaveLength(1); expect(allocated.outbounds).toHaveLength(1); expect(allocated.reservations).toHaveLength(2);
    expect(allocated.vendorBatches![0].status).toBe('routing_pending');
    const routed = advanceVendorJobs(allocated, context('x').now + 1200) as VendorSnapshot;
    expect(routed.vendorBatches![0].status).toBe('routed');
    expect(routed.vendorBatches![0].routingRef).toContain('LOCAL-ROUTE');
    expect(routed.vendorBatches![0].shipToParty?.partyId).toBe('ONT8');
    expect(allocated.vendorBatches![0].id).not.toBe('untrusted-ui-id');
    expect(() => retailBatch(allocated, 0, 'again')).toThrow();
    const insufficient = structuredClone(s); insufficient.stocks.forEach(stock => stock.onHand = 2);
    expect(() => retailBatch(insufficient)).toThrow('库存不足'); expect(insufficient.fulfillments).toHaveLength(0);
    const foreign = node(s.vendorOrders![0]); foreign.merchantScope = 'other';
    expect(() => exec(s, { type: 'vendor_df_fulfill', purchaseOrderId: s.vendorOrders![2].id, node: foreign }, 'foreign')).toThrow();
  });
  it('Prepaid never submits Collect routing; ASN requires packed and exact explicit containers; goods receipts value only good units once', () => {
    let s = retailBatch(accept(fixture(), 1), 1);
    const po = s.vendorOrders![1]; let batch = s.vendorBatches![0];
    expect(batch.status).toBe('transport_ready'); expect(s.vendorJobs!.filter(job => job.kind === 'routing')).toHaveLength(0);
    const transport = { carrier: 'UPS', tracking: 'TRACK-1', carrierScac: 'UPSN', shipType: 'SmallParcel' as const, shippedDate: '2026-11-04', estimatedDeliveryDate: '2026-11-07', containers: batch.lines.map((line, n) => ({ type: 'carton' as const, identifierType: 'AMZNCC' as const, identifier: `CARTON-${n}`, sku: line.sku, qty: line.qty, tracking: `TRACK-${n}` })) };
    expect(() => exec(s, { type: 'vendor_asn', batchId: batch.id, transport }, 'early')).toThrow('打包');
    s = advanceOmsJobs(s, context('x').now + 1500) as VendorSnapshot;
    s = advanceOmsJobs(s, context('x').now + 3000) as VendorSnapshot;
    expect(() => exec(s, { type: 'vendor_asn', batchId: batch.id, transport: { ...transport, containers: [] } }, 'missing')).toThrow('容器');
    s = exec(s, { type: 'vendor_asn', batchId: batch.id, transport }, 'asn');
    expect(() => exec(s, { type: 'vendor_ship', batchId: batch.id, carrier: 'UPS', tracking: 'TRACK-1' }, 'earlyship')).toThrow('回执');
    s = advanceVendorJobs(s, context('x').now + 1200) as VendorSnapshot;
    s = exec(s, { type: 'vendor_ship', batchId: batch.id, carrier: 'UPS', tracking: 'TRACK-1' }, 'ship');
    batch = s.vendorBatches![0]; expect(s.packages).toHaveLength(1); expect(s.stocks.filter(stock => stock.warehouseId === 'wh_lax').every(stock => stock.reserved === 0)).toBe(true);
    const lines = batch.lines.map(line => ({ lineId: po.lines.find(row => row.sku === line.sku)!.id, received: line.qty - 2, short: 1, damaged: 1 }));
    expect(() => exec(s, { type: 'vendor_receive', batchId: batch.id, lines: [] }, 'badreceipt')).toThrow();
    s = exec(s, { type: 'vendor_receive', batchId: batch.id, lines }, 'receipt');
    expect(s.vendorFinanceReceipts![0].eligibleMinor).toBe(lines.reduce((n, line) => n + line.received * po.lines.find(row => row.id === line.lineId)!.unitPriceMinor, 0));
    expect(() => exec(s, { type: 'vendor_receive', batchId: batch.id, lines }, 'receipt2')).toThrow('重复');
  });
});
describe('DF fixed node inventory and shared package delivery', () => {
  it('publishes only real node per SKU stock, requires artifacts and delivers one receipt after confirmation', () => {
    let s = accept(fixture(), 2); const po = s.vendorOrders![2];
    s.stocks.filter(stock => stock.warehouseId === 'wh_ewr').forEach(stock => stock.onHand = 900);
    s = exec(s, { type: 'vendor_publish_inventory', purchaseOrderId: po.id, node: node(po) }, 'publish');
    expect(s.vendorOrders![2].inventoryPublication!.quantities.map(line => line.available)).toEqual([98, 98]);
    expect(() => exec(s, { type: 'vendor_df_fulfill', purchaseOrderId: po.id, node: node(po, 'wh_ewr') }, 'wrong')).toThrow();
    s = exec(s, { type: 'vendor_df_fulfill', purchaseOrderId: po.id, node: node(po) }, 'fulfill'); const batch = s.vendorBatches![0];
    s = advanceOmsJobs(s, context('x').now + 1500) as VendorSnapshot; s = advanceOmsJobs(s, context('x').now + 3000) as VendorSnapshot;
    expect(() => exec(s, { type: 'vendor_ship', batchId: batch.id, carrier: 'UPS', tracking: 'DFTRACK' }, 'no-artifacts')).toThrow('标签');
    s = exec(s, { type: 'vendor_df_artifacts', batchId: batch.id }, 'artifacts');
    s = exec(s, { type: 'vendor_ship', batchId: batch.id, carrier: 'UPS', tracking: 'DFTRACK' }, 'ship');
    expect(s.vendorFinanceReceipts).toHaveLength(0);
    s = advanceOmsJobs(s, context('x').now + 16000) as VendorSnapshot;
    s = advanceVendorJobs(s, context('x').now + 16000) as VendorSnapshot;
    expect(s.packages[0].confirmation).toBe('confirmed'); expect(s.packages[0].deliveredAt).toBeTruthy();
    expect(s.vendorFinanceReceipts).toHaveLength(1); expect(advanceVendorJobs(s, context('x').now + 20000)).toBe(s);
    assertVendorInvariants(s);
  });
});
