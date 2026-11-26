import type { OmsSnapshot } from './types';
import type { ReplenishmentPlan } from './replenishment';

/** Demo-only scenario catalog used to exercise every replenishment list tab. */
export function ensureReplenishmentStatusScenarios(snapshot: OmsSnapshot): OmsSnapshot {
  // v3 fixture 已覆盖所有状态，不再追加空壳 scenario 计划
  if (snapshot.merchantId !== 'merchant_us_amazon'
    || snapshot.migratedSources.includes('replenishment-status-scenarios-v1')
    || snapshot.migratedSources.includes('replenishment-demo-v3')) return snapshot;
  const state = structuredClone(snapshot);
  const e = { tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, revision: 1 };
  const line = (id: string, sku: string, quantity: number) => ({ id, sku, omsVariantId: id, channelSku: sku, sourceSku: sku, quantity });
  const make = (id: string, number: string, sourceType: ReplenishmentPlan['sourceType'], destinationType: ReplenishmentPlan['destinationType'], status: ReplenishmentPlan['status'], quantity = 20): ReplenishmentPlan => ({ ...e, id, number, sourceType, destinationType, reason: 'manual', shippingWarehouseId: sourceType === 'purchase' ? undefined : 'wh_lax', receivingWarehouseId: destinationType === 'oms_warehouse' ? 'wh_sea' : undefined, supplierId: sourceType === 'purchase' ? 'supplier-techparts' : undefined, lines: [line(`${id}:line`, 'NW-TP-BLK', quantity)], status, plannedShipDate: '2026-11-20', plannedArrivalDate: '2026-11-25', createdAt: '2026-11-16T09:00:00Z', planNote: `演示场景：${status}` });
  const scenarios = [
    make('scenario:draft', 'RP-SC-001', 'transfer', 'oms_warehouse', 'draft'),
    make('scenario:pending', 'RP-SC-002', 'transfer', 'amazon_fba', 'pending_approval'),
    make('scenario:approved', 'RP-SC-003', 'purchase', 'amazon_fba', 'approved'),
    make('scenario:planning', 'RP-SC-004', 'transfer', 'amazon_fba', 'inbound_planning'),
    make('scenario:executing', 'RP-SC-005', 'transfer', 'amazon_fba', 'executing'),
    make('scenario:partial', 'RP-SC-006', 'purchase', 'tiktok_fulfillment', 'partially_completed'),
    make('scenario:done', 'RP-SC-007', 'transfer', 'oms_warehouse', 'completed'),
    make('scenario:exception', 'RP-SC-008', 'third_party_fulfillment', 'walmart_fc', 'exception'),
    make('scenario:cancelled', 'RP-SC-009', 'transfer', 'oms_warehouse', 'cancelled'),
  ];
  state.replenishmentPlans = [...(state.replenishmentPlans ?? []), ...scenarios];
  state.migratedSources.push('replenishment-status-scenarios-v1');
  return state;
}
