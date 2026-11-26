import { describe, expect, it } from 'vitest';
import { advanceOmsJobs, assertOmsInvariants, executeOmsCommand } from './commands';
import { emptySnapshot } from './types';
import { MemoryOmsRepository } from './repository';
import { advanceFbaJobs, assertFbaAddons, assertCanDispatchFbaSource, canDispatchFbaSource, canReceiveFbaShipment, executeFba, fbaFees, type FbaCommand, type FbaSnapshot } from './fba';
import { defaultBusinessConfig, type Connection } from '@/lib/amazon-connections';
import { queryMcfProposal } from './mcf-proposal';

const connection: Connection = { id: 'seller', name: 'Seller', identity: 'seller', region: 'NA', accountId: 'seller', authorized: true, businesses: { fba: { status: 'enabled', site: 'US', warehouse: '', rule: 'manual', syncFrom: '2026-01-01', mappingConfirmed: true, reference: '', syncSettings: { receiveOrders: false, includeOpenOrders: false, readInventory: true, publishInventory: false, shipmentWriteback: false, receiveChanges: false, receiveExistingPlans: false, orderSources: [], notifyOnError: true } } } };
function initial(): FbaSnapshot {
  const s = emptySnapshot({ tenantId: 't', companyId: 'c', merchantId: 'm' });
  s.stocks.push(...['A', 'B'].map(sku => ({ tenantId: 't', companyId: 'c', merchantId: 'm', id: `stock-${sku}`, revision: 1, pool: 'warehouse' as const, warehouseId: 'wh', sku, onHand: 100, reserved: 0, unfulfillable: 0 })));
  return s;
}
let sequence = 0;
const ctx = (id = `cmd-${++sequence}`, now = 10000) => ({ id, now, actor: 'test', canWrite: true, connection });
function run(s: FbaSnapshot, command: FbaCommand, id?: string) { return executeFba(s, command, ctx(id)); }
function planned(): FbaSnapshot {
  let s = run(initial(), { type: 'fba_create_plan', warehouseId: 'wh', connectionId: 'seller', site: 'US', lines: [{ id: 'a', sku: 'A', omsVariantId: 'va', sellerSku: 'extA', quantity: 6 }, { id: 'b', sku: 'B', omsVariantId: 'vb', sellerSku: 'extB', quantity: 4 }] });
  const id = s.inboundPlans![0].id;
  s = run(s, { type: 'fba_pack', planId: id, containers: [{ id: 'box1', weightKg: 4, contents: [{ lineId: 'a', quantity: 4 }, { lineId: 'b', quantity: 2 }] }, { id: 'box2', weightKg: 3, contents: [{ lineId: 'a', quantity: 2 }, { lineId: 'b', quantity: 2 }] }] });
  s = run(s, { type: 'fba_generate_placements', planId: id });
  return run(s, { type: 'fba_select_placement', planId: id, placementId: s.inboundPlans![0].placements[1].id });
}
function confirmed() { const s = planned(); return run(s, { type: 'fba_confirm', planId: s.inboundPlans![0].id, transport: 'SPD', expectedFeesMinor: fbaFees(s.inboundPlans![0], 'SPD') }); }
function dispatched() {
  let s = confirmed();
  s = advanceOmsJobs(s, 12000) as FbaSnapshot; s = advanceOmsJobs(s, 14000) as FbaSnapshot;
  for (const task of s.fulfillments) s = executeOmsCommand(s, { type: 'dispatch', fulfillmentId: task.id, carrier: 'UPS', tracking: task.id }, ctx()) as FbaSnapshot;
  return advanceFbaJobs(s, 15000);
}
describe('canonical FBA domain', () => {
  it('cancels an unconfirmed plan without creating stock reservations or source execution', () => {
    const draft = run(initial(), { type: 'fba_create_plan', warehouseId: 'wh', connectionId: 'seller', site: 'US', lines: [{ id: 'a', sku: 'A', omsVariantId: 'va', sellerSku: 'extA', quantity: 6 }] });
    for (const before of [draft, planned()]) {
      const cancelled = run(before, { type: 'fba_cancel_plan', planId: before.inboundPlans![0].id, reason: '需求取消' });
      expect(cancelled.inboundPlans![0].status).toBe('cancelled');
      expect(cancelled.stocks).toEqual(before.stocks); expect(cancelled.reservations).toHaveLength(0); expect(cancelled.outbounds).toHaveLength(0);
      expect(() => run(cancelled, { type: 'fba_generate_placements', planId: cancelled.inboundPlans![0].id })).toThrow('不可修改');
      assertFbaAddons(cancelled);
    }
  });
  it('atomically withdraws every original outbound and releases only its exact reservations after confirmation', () => {
    const before = confirmed(); const original = structuredClone(before);
    let s = run(before, { type: 'fba_cancel_plan', planId: before.inboundPlans![0].id, reason: '需求取消' }, 'cancel-plan');
    expect(before).toEqual(original);
    expect(s.inboundPlans![0].status).toBe('cancelling');
    expect(s.fulfillments.every(t => t.status === 'withdraw_pending')).toBe(true);
    expect(s.outbounds.map(o => o.id)).toEqual(before.outbounds.map(o => o.id));
    expect(s.outbounds.every(o => o.status === 'withdraw_pending')).toBe(true);
    expect(s.stocks.map(s => s.reserved)).toEqual([6, 4]);
    expect(s.reservations.every(r => r.status === 'active')).toBe(true);
    expect(run(s, { type: 'fba_cancel_plan', planId: s.inboundPlans![0].id, reason: 'retry' }, 'cancel-plan')).toBe(s);
    s = advanceFbaJobs(advanceOmsJobs(s, 12000) as FbaSnapshot, 12000);
    expect(s.inboundPlans![0].status).toBe('cancelled');
    expect(s.inboundShipments!.every(t => t.status === 'cancelled')).toBe(true);
    expect(s.outbounds.every(o => o.status === 'cancelled')).toBe(true);
    expect(s.reservations.map(r => r.id)).toEqual(before.reservations.map(r => r.id));
    expect(s.reservations.every(r => r.status === 'released')).toBe(true);
    expect(s.stocks.map(s => [s.onHand, s.reserved])).toEqual([[100, 0], [100, 0]]);
    expect(s.movements.filter(m => m.kind === 'release').map(m => [m.stockId, m.quantity])).toEqual(before.reservations.map(r => [r.stockId, r.quantity]));
    expect(s.orders[0]).toMatchObject({ archived: true });
    assertOmsInvariants(s); assertFbaAddons(s);
    expect(advanceFbaJobs(advanceOmsJobs(s, 13000) as FbaSnapshot, 13000)).toEqual(s);
  });
  it('waits for every withdrawal and preserves another plan reservations on the same stock', () => {
    let s = confirmed(); const firstId = s.inboundPlans![0].id;
    s = run(s, { type: 'fba_create_plan', warehouseId: 'wh', connectionId: 'seller', site: 'US', lines: [{ id: 'other-a', sku: 'A', omsVariantId: 'va', sellerSku: 'extA', quantity: 7 }] });
    const otherId = s.inboundPlans![1].id;
    s = run(s, { type: 'fba_pack', planId: otherId, containers: [{ id: 'other-box', weightKg: 1, contents: [{ lineId: 'other-a', quantity: 7 }] }] });
    s = run(s, { type: 'fba_generate_placements', planId: otherId });
    s = run(s, { type: 'fba_select_placement', planId: otherId, placementId: s.inboundPlans![1].placements[0].id });
    s = run(s, { type: 'fba_confirm', planId: otherId, transport: 'SPD', expectedFeesMinor: fbaFees(s.inboundPlans![1], 'SPD') });
    const otherFulfillment = s.inboundShipments!.find(sh => sh.planId === otherId)!.fulfillmentId;
    const otherReservations = structuredClone(s.reservations.filter(r => r.fulfillmentId === otherFulfillment));
    s = run(s, { type: 'fba_cancel_plan', planId: firstId, reason: 'cancel first only' });
    s.jobs.filter(j => j.kind === 'withdraw')[1].dueAt = 13000;
    s = advanceFbaJobs(advanceOmsJobs(s, 12000) as FbaSnapshot, 12000);
    expect(s.inboundPlans![0].status).toBe('cancelling'); expect(s.stocks.map(st => st.reserved)).toEqual([10, 2]);
    s = advanceFbaJobs(advanceOmsJobs(s, 13000) as FbaSnapshot, 13000);
    expect(s.inboundPlans![0].status).toBe('cancelled'); expect(s.inboundPlans![1].status).toBe('confirmed');
    expect(s.stocks.map(st => [st.onHand, st.reserved])).toEqual([[100, 7], [100, 0]]);
    expect(s.reservations.filter(r => r.fulfillmentId === otherFulfillment)).toEqual(otherReservations);
    assertFbaAddons(s);
  });
  it('rolls back all withdrawal requests if any active task cannot be withdrawn', () => {
    const s = confirmed(); s.fulfillments[1].status = 'unknown'; const before = structuredClone(s);
    expect(() => run(s, { type: 'fba_cancel_plan', planId: s.inboundPlans![0].id, reason: 'cancel' })).toThrow('不可撤回');
    expect(s).toEqual(before);
  });
  it('rejects full-plan cancellation when any shipment has shipped without changing remaining tasks', () => {
    let s = confirmed(); s = advanceOmsJobs(s, 12000) as FbaSnapshot; s = advanceOmsJobs(s, 14000) as FbaSnapshot;
    s = executeOmsCommand(s, { type: 'dispatch', fulfillmentId: s.fulfillments[0].id, carrier: 'UPS', tracking: 'one-shipped' }, ctx()) as FbaSnapshot;
    const before = structuredClone(s);
    expect(() => run(s, { type: 'fba_cancel_plan', planId: s.inboundPlans![0].id, reason: 'cancel' })).toThrow('实际发货');
    expect(s).toEqual(before); expect(s.fulfillments[1].status).toBe('packed');
  });
  it('gates each truck shipment by its own window and confirmed appointment; rescheduling clears booking', () => {
    for (const transport of ['LTL', 'FTL'] as const) {
      const p = planned();
      let s = run(p, { type: 'fba_confirm', planId: p.inboundPlans![0].id, transport, expectedFeesMinor: fbaFees(p.inboundPlans![0], transport) });
      const [first, second] = s.inboundShipments!;
      const deliveryWindow = { start: '2026-11-05T08:00:00Z', end: '2026-11-05T12:00:00Z' };
      expect(canDispatchFbaSource(s, first.fulfillmentId)).toBe(false);
      expect(() => assertCanDispatchFbaSource(s, first.fulfillmentId)).toThrow('预约');
      expect(() => run(s, { type: 'fba_confirm_appointment', shipmentId: first.id, appointment: { id: 'apt', time: '2026-11-05T09:00:00Z', carrierConfirmation: 'carrier-ref' } })).toThrow('时间窗');
      expect(() => run(s, { type: 'fba_set_window', shipmentId: first.id, deliveryWindow: { ...deliveryWindow, end: deliveryWindow.start } })).toThrow('时间窗');
      s = run(s, { type: 'fba_set_window', shipmentId: first.id, deliveryWindow });
      expect(canDispatchFbaSource(s, first.fulfillmentId)).toBe(false);
      expect(() => run(s, { type: 'fba_confirm_appointment', shipmentId: first.id, appointment: { id: 'apt', time: '2026-11-05T13:00:00Z', carrierConfirmation: 'carrier-ref' } })).toThrow('时间窗');
      expect(() => run(s, { type: 'fba_confirm_appointment', shipmentId: first.id, appointment: { id: 'apt', time: '2026-11-05T09:00:00Z', carrierConfirmation: '' } })).toThrow('凭证');
      const appointment = { id: 'apt', time: '2026-11-05T09:00:00Z', carrierConfirmation: 'carrier-ref' };
      s = run(s, { type: 'fba_confirm_appointment', shipmentId: first.id, appointment });
      expect(canDispatchFbaSource(s, first.fulfillmentId)).toBe(true); expect(canDispatchFbaSource(s, second.fulfillmentId)).toBe(false);
      s = run(s, { type: 'fba_reschedule', shipmentId: first.id, deliveryWindow });
      expect(s.inboundShipments![0].appointment).toBeUndefined(); expect(canDispatchFbaSource(s, first.fulfillmentId)).toBe(false);
      s = run(s, { type: 'fba_confirm_appointment', shipmentId: first.id, appointment });
      s = advanceOmsJobs(s, 12000) as FbaSnapshot; s = advanceOmsJobs(s, 14000) as FbaSnapshot;
      s = executeOmsCommand(s, { type: 'dispatch', fulfillmentId: first.fulfillmentId, carrier: 'Truck', tracking: 'bol' }, ctx()) as FbaSnapshot;
      expect(canReceiveFbaShipment(s, first.id)).toBe(true);
      const unbooked = structuredClone(s); delete unbooked.inboundShipments![0].appointment;
      expect(canReceiveFbaShipment(unbooked, first.id)).toBe(false); expect(() => assertFbaAddons(unbooked)).toThrow('预约');
      expect(() => run(s, { type: 'fba_reschedule', shipmentId: first.id, deliveryWindow })).toThrow('不可修改');
      s = advanceFbaJobs(s, 15000); assertFbaAddons(s);
    }
    const spd = confirmed(); expect(canDispatchFbaSource(spd, spd.fulfillments[0].id)).toBe(true);
    expect(() => run(spd, { type: 'fba_set_window', shipmentId: spd.inboundShipments![0].id, deliveryWindow: { start: '2026-11-05T08:00:00Z', end: '2026-11-05T12:00:00Z' } })).toThrow('不需要');
  });
  it('creates multi-line, multi-box split shipments with atomic canonical reservations', () => {
    const before = planned(); const s = confirmed(); const p = s.inboundPlans![0];
    expect(before.orders).toHaveLength(0); expect(s.orders).toHaveLength(1);
    expect(s.orders[0]).toMatchObject({ source: 'internal_transfer', sourceId: p.id, archived: false });
    expect(p.shipmentIds).toHaveLength(2); expect(s.outbounds).toHaveLength(2); expect(s.fulfillments).toHaveLength(2);
    expect(s.stocks.map(s => s.reserved)).toEqual([6, 4]);
    expect(s.inboundShipments!.map(s => s.lines.map(l => l.quantity))).toEqual([[3, 2], [3, 2]]);
    assertOmsInvariants(s); assertFbaAddons(s);
  });
  it('rolls back all allocations if any line has insufficient stock', () => {
    const s = planned(); s.stocks[1].onHand = 3; const before = structuredClone(s);
    expect(() => run(s, { type: 'fba_confirm', planId: s.inboundPlans![0].id, transport: 'LTL', expectedFeesMinor: fbaFees(s.inboundPlans![0], 'LTL') })).toThrow('库存不足');
    expect(s).toEqual(before);
  });
  it('validates packing exact sums and regenerated selection; supports all transport fee confirmations', () => {
    const s = planned(); const p = s.inboundPlans![0];
    expect(() => run(s, { type: 'fba_pack', planId: p.id, containers: [{ id: 'bad', weightKg: 2, contents: [{ lineId: 'a', quantity: 5 }, { lineId: 'b', quantity: 4 }] }] })).toThrow('完全一致');
    for (const transport of ['SPD', 'LTL', 'FTL'] as const) {
      expect(() => run(s, { type: 'fba_confirm', planId: p.id, transport, expectedFeesMinor: 0 })).toThrow('费用');
      expect(run(s, { type: 'fba_confirm', planId: p.id, transport, expectedFeesMinor: fbaFees(p, transport) }).inboundPlans![0].transport).toBe(transport);
    }
    const next = run(s, { type: 'fba_generate_placements', planId: p.id }); expect(next.inboundPlans![0].placementId).toBeUndefined();
  });
  it('rejects receipt before source dispatch and overreceipt; receipt never fabricates sellable stock', () => {
    const s = confirmed(); const shipment = s.inboundShipments![0];
    expect(() => run(s, { type: 'fba_receive', shipmentId: shipment.id, lines: [{ lineId: 'a', received: 3, damaged: 0 }], reference: 'r' })).toThrow('尚未实际发货');
    let shipped = dispatched(); const id = shipped.inboundShipments![0].id;
    expect(() => run(shipped, { type: 'fba_receive', shipmentId: id, lines: [{ lineId: 'a', received: 4, damaged: 0 }], reference: 'r' })).toThrow('超过');
    shipped = run(shipped, { type: 'fba_receive', shipmentId: id, lines: [{ lineId: 'a', received: 2, damaged: 1 }, { lineId: 'b', received: 1, damaged: 0 }], reference: 'receipt1' });
    expect(shipped.stocks.filter(s => s.pool === 'fba')).toHaveLength(0); expect(shipped.stocks.map(s => s.onHand)).toEqual([94, 96]);
    shipped = run(shipped, { type: 'fba_short_close', shipmentId: id, reason: 'Carrier discrepancy' });
    shipped = run(shipped, { type: 'fba_claim', shipmentId: id, lineId: 'b', quantity: 1, reason: 'Short received' });
    expect(() => run(shipped, { type: 'fba_claim', shipmentId: id, lineId: 'b', quantity: 1, reason: 'Again' })).toThrow('不能超过');
    expect(shipped.inboundShipments![0].status).toBe('closed');
    const other = shipped.inboundShipments![1];
    shipped = run(shipped, { type: 'fba_receive', shipmentId: other.id, lines: other.lines.map(l => ({ lineId: l.lineId, received: l.quantity, damaged: 0 })), reference: 'receipt2' });
    expect(shipped.inboundPlans![0].status).toBe('closed');
  });
  it('reconciles only explicit observations, preserves MCF reservations and rejects stale observations', () => {
    let s = initial();
    const observation = { type: 'fba_observe_stock' as const, connectionId: 'seller', site: 'US', sku: 'A', onHand: 40, reserved: 3, unfulfillable: 2, observedAt: new Date(9000).toISOString(), reference: 'inventory-report' };
    s = run(s, observation);
    const stock = s.stocks.find(s => s.pool === 'fba')!; expect(stock.onHand - stock.reserved - stock.unfulfillable).toBe(35);
    expect(() => run(s, observation)).toThrow('晚于');
    expect(() => executeFba(s, { ...observation, observedAt: new Date(9500).toISOString() }, { ...ctx(), connection: { ...connection, authorized: false } })).toThrow('授权');
  });
  it('bounds manual removal, debits once, and receives damaged returns as unavailable warehouse stock', () => {
    let s = run(initial(), { type: 'fba_observe_stock', connectionId: 'seller', site: 'US', sku: 'A', onHand: 40, reserved: 3, unfulfillable: 5, observedAt: new Date(9000).toISOString(), reference: 'report' });
    const stockId = s.stocks.find(s => s.pool === 'fba')!.id;
    s = run(s, { type: 'fba_create_removal', stockId, quantity: 4, bucket: 'unfulfillable', action: 'return', reference: 'removal-report', warehouseId: 'wh' });
    const taskId = s.removalTasks![0].id;
    expect(() => run(s, { type: 'fba_create_removal', stockId, quantity: 2, bucket: 'unfulfillable', action: 'dispose', reference: 'r' })).toThrow('超过');
    s = run(s, { type: 'fba_complete_removal', taskId }, 'remove-once');
    expect(run(s, { type: 'fba_complete_removal', taskId }, 'remove-once')).toBe(s);
    expect(() => run(s, { type: 'fba_complete_removal', taskId })).toThrow('已完成');
    expect(s.stocks.find(s => s.id === stockId)).toMatchObject({ onHand: 36, unfulfillable: 1 });
    s = run(s, { type: 'fba_receive_return', taskId, quantity: 3 });
    expect(s.stocks.find(s => s.id === 'stock-A')).toMatchObject({ onHand: 103, unfulfillable: 3 });
    expect(() => run(s, { type: 'fba_receive_return', taskId, quantity: 2 })).toThrow('不可超过');
    s = run(s, { type: 'fba_create_removal', stockId, quantity: 2, bucket: 'sellable', action: 'dispose', reference: 'dispose' });
    s = run(s, { type: 'fba_complete_removal', taskId: s.removalTasks![1].id });
    expect(() => run(s, { type: 'fba_receive_return', taskId: s.removalTasks![1].id, quantity: 1 })).toThrow('不可超过');
  });
  it('uses command idempotency across serialized reload and supports one-destination placement', () => {
    let s = planned(); const p = s.inboundPlans![0];
    s = run(s, { type: 'fba_select_placement', planId: p.id, placementId: p.placements[0].id });
    const command = { type: 'fba_confirm' as const, planId: p.id, transport: 'SPD' as const, expectedFeesMinor: fbaFees(s.inboundPlans![0], 'SPD') };
    s = run(s, command, 'confirm-stable');
    const reload = JSON.parse(JSON.stringify(s)) as FbaSnapshot;
    expect(run(reload, command, 'confirm-stable')).toBe(reload);
    expect(reload.inboundShipments).toHaveLength(1);
    expect(reload.inboundShipments![0].lines.map(l => l.quantity)).toEqual([6, 4]);
    expect(() => run(reload, command)).toThrow('不可修改');
  });
  it('preserves canonical active MCF reservations during platform stock observation', () => {
    let s = run(initial(), { type: 'fba_observe_stock', connectionId: 'seller', site: 'US', sku: 'A', onHand: 40, reserved: 3, unfulfillable: 2, observedAt: new Date(8000).toISOString(), reference: 'opening' });
    s = executeOmsCommand(s, { type: 'create_order', order: { tenantId: 't', companyId: 'c', merchantId: 'm', id: 'sale', number: 'SO', sourceId: 'SO', source: 'Amazon', channelType: 'MFN', connectionId: 'seller', site: 'US', createdAt: new Date(0).toISOString(), currency: 'USD', paidMinor: null, paymentStatus: '', customer: 'Customer', address: { name: 'Customer', phone: '+1 2065550123', address1: '1201 3rd Ave', city: 'Seattle', province: 'WA', zip: '98101', country: 'US' }, note: '', tags: [], lines: [{ id: 'sale-line', channelLineId: 'sale-line', channelSku: 'extA', omsVariantId: 'va', sku: 'A', title: 'A', quantity: 5, cancelled: 0, unit: 'each', unitPriceMinor: null, mappingSnapshot: { channelSku: 'extA', omsVariantId: 'va' } }] } }, ctx()) as FbaSnapshot;
    const proposal = queryMcfProposal(s, 'sale', { ...connection, businesses: { ...connection.businesses, mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } }, [{ lineId: 'sale-line', quantity: 5 }], 'Standard', 10000);
    s = executeOmsCommand(s, { type: 'allocate', orderId: 'sale', executor: 'amazon', warehouseId: '', connectionId: 'seller', site: 'US', lines: [{ lineId: 'sale-line', quantity: 5 }], proposal }, ctx()) as FbaSnapshot;
    s = run(s, { type: 'fba_observe_stock', connectionId: 'seller', site: 'US', sku: 'A', onHand: 38, reserved: 4, unfulfillable: 2, observedAt: new Date(9000).toISOString(), reference: 'next-report' });
    expect(s.stocks.find(s => s.pool === 'fba')).toMatchObject({ onHand: 38, reserved: 9, unfulfillable: 2 });
    expect(s.reservations[0]).toMatchObject({ quantity: 5, status: 'active' });
    expect(() => run(s, { type: 'fba_observe_stock', connectionId: 'seller', site: 'US', sku: 'A', onHand: 10, reserved: 4, unfulfillable: 2, observedAt: new Date(9500).toISOString(), reference: 'insufficient-report' })).toThrow('覆盖');
  });
  it('persists addons through the shared repository and rejects stale-tab confirmation atomically', async () => {
    const baseline = planned();
    const scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_shopify' };
    Object.assign(baseline, scope);
    for (const list of [baseline.orders, baseline.fulfillments, baseline.outbounds, baseline.stocks, baseline.reservations, baseline.movements, baseline.packages, baseline.inboundPlans ?? []]) for (const item of list) Object.assign(item, scope);
    const repository = new MemoryOmsRepository(() => structuredClone(baseline));
    const firstTab = await repository.read(scope); const secondTab = await repository.read(scope);
    const command = { type: 'fba_confirm' as const, planId: baseline.inboundPlans![0].id, transport: 'SPD' as const, expectedFeesMinor: fbaFees(baseline.inboundPlans![0], 'SPD') };
    const committed = await repository.transact(scope, s => executeFba(s, command, { ...ctx('tab-one'), expectedRevision: firstTab.revision }));
    await expect(repository.transact(scope, s => executeFba(s, command, { ...ctx('tab-two'), expectedRevision: secondTab.revision }))).rejects.toThrow('变化');
    expect(await repository.read(scope)).toEqual(committed);
    const reloaded = await repository.read(scope) as FbaSnapshot;
    expect(reloaded.inboundShipments).toHaveLength(2); expect(reloaded.orders).toHaveLength(1);
    expect(reloaded.stocks.map(s => s.reserved)).toEqual([6, 4]);
  });
  it('enforces read-only, revision, concrete scope and addon corruption checks', () => {
    const s = planned(); const command = { type: 'fba_generate_placements' as const, planId: s.inboundPlans![0].id };
    expect(() => executeFba(s, command, { ...ctx(), canWrite: false })).toThrow('权限');
    expect(() => executeFba(s, command, { ...ctx(), expectedRevision: 999 })).toThrow('变化');
    expect(() => executeFba({ ...s, merchantId: 'all' }, command, ctx())).toThrow('具体商家');
    const broken = confirmed(); broken.inboundShipments![0].outboundId = 'wrong'; expect(() => assertFbaAddons(broken)).toThrow('引用');
    const brokenPack = planned(); brokenPack.inboundPlans![0].containers[0].contents[0].quantity++; expect(() => assertFbaAddons(brokenPack)).toThrow('完全一致');
    const legacy = initial(); legacy.archives.old = 'unchanged legacy workspace'; expect(advanceFbaJobs(legacy, 0)).toBe(legacy); expect(run(legacy, { type: 'fba_create_plan', warehouseId: 'wh', connectionId: 'seller', site: 'US', lines: [{ id: 'a', sku: 'A', omsVariantId: 'v', sellerSku: 'external', quantity: 1 }] }).archives.old).toBe(legacy.archives.old);
  });
});
