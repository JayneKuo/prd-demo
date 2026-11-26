import type { OmsSnapshot } from './types';
import type {
  InboundPlan, InboundOrder, OutboundOrder, OutboundPlan,
  PackingBox, PlatformAllocation, PurchaseOrder, ReplenishmentLine,
  ReplenishmentPlan, ReplenishmentPluginTask, ShipmentLabel, ShipmentTransport, ShipmentReceiving, TransferOrder,
} from './replenishment';

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

function mkLine(
  id: string, sku: string, omsVariantId: string, quantity: number,
  channelSku?: string, asin?: string, fnsku?: string, sourceSku?: string,
): ReplenishmentLine {
  return { id, sku, omsVariantId, quantity, ...(channelSku ? { channelSku } : {}), ...(asin ? { asin } : {}), ...(fnsku ? { fnsku } : {}), ...(sourceSku ? { sourceSku } : {}) };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

export function ensureReplenishmentDemo(snapshot: OmsSnapshot): OmsSnapshot {
  if (snapshot.merchantId !== 'merchant_us_amazon' || snapshot.migratedSources.includes('replenishment-demo-v6')) return snapshot;
  const s = structuredClone(snapshot);
  const e = { tenantId: s.tenantId, companyId: s.companyId, merchantId: s.merchantId, revision: 1 };
  const now = '2026-11-17T00:00:00Z';

  const plans: ReplenishmentPlan[] = [];
  const transferOrders: TransferOrder[] = [];
  const purchaseOrders: PurchaseOrder[] = [];
  const inboundPlans: InboundPlan[] = [];
  const allocations: PlatformAllocation[] = [];
  const inboundOrders: InboundOrder[] = [];
  const outboundPlans: OutboundPlan[] = [];
  const outboundOrds: OutboundOrder[] = [];
  const pluginTasks: ReplenishmentPluginTask[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // A: 草稿 — Amazon FBA 调拨
  // ══════════════════════════════════════════════════════════════════════════
  const A = 'rp:demo:A';
  const Alines = [
    mkLine(`${A}:L1`, 'WEP-BLK-001', 'var_001_1', 150, 'NW-WEP-BLK-US', 'B0C8NW4P21', 'X004NWEP01', 'WEP-BLK-001'),
    mkLine(`${A}:L2`, 'TP-BLK-STD',  'var_002_1',  80, 'NW-TP-BLK-STD',  'B0C8NW4P23', 'X004NWTP01', 'TP-BLK-STD'),
  ];
  plans.push({ ...e, id: A, number: 'RP-20261115-001', sourceType: 'transfer', destinationType: 'amazon_fba', reason: 'safety_stock', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Alines, status: 'draft', plannedShipDate: '2026-11-20', createdAt: '2026-11-15T09:00:00Z', note: '安全库存补货，双 11 后 FBA 备货。' });

  // ══════════════════════════════════════════════════════════════════════════
  // B: 待审批 — Amazon FBA 采购
  // ══════════════════════════════════════════════════════════════════════════
  const B = 'rp:demo:B';
  const Blines = [
    mkLine(`${B}:L1`, 'WEP-WHT-001', 'var_001_2', 200, 'NW-WEP-WHT-US', 'B0C8NW4P22', 'X004NWEP02'),
    mkLine(`${B}:L2`, 'WEP-BLU-001', 'var_001_3', 100, 'NW-WEP-BLU-US', 'B0C8NW4P24', 'X004NWEP03'),
  ];
  const po_B: PurchaseOrder = { ...e, id: 'po:demo:B', number: 'PO-20261115-002', replenishmentPlanId: B, supplierId: 'supplier-techparts', destinationWarehouseId: 'platform-amazon-fba-us', lines: Blines, status: 'planned' };
  purchaseOrders.push(po_B);
  plans.push({ ...e, id: B, number: 'RP-20261115-002', sourceType: 'purchase', destinationType: 'amazon_fba', reason: 'forecast', supplierId: 'supplier-techparts', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Blines, status: 'pending_approval', purchaseOrderId: po_B.id, plannedShipDate: '2026-11-25', createdAt: '2026-11-15T10:00:00Z', note: '销售预测补货，供应商 TechParts 采购。' });

  // ══════════════════════════════════════════════════════════════════════════
  // C: 入库计划中 · 等待平台确认 — Amazon FBA 调拨
  // ══════════════════════════════════════════════════════════════════════════
  const C = 'rp:demo:C';
  const Clines = [
    mkLine(`${C}:L1`, 'WEP-BLK-001', 'var_001_1', 300, 'NW-WEP-BLK-US', 'B0C8NW4P21', 'X004NWEP01', 'WEP-BLK-001'),
    mkLine(`${C}:L2`, 'WEP-WHT-001', 'var_001_2', 150, 'NW-WEP-WHT-US', 'B0C8NW4P22', 'X004NWEP02', 'WEP-WHT-001'),
  ];
  const to_C: TransferOrder = { ...e, id: 'to:demo:C', number: 'TR-20261115-003', replenishmentPlanId: C, sourceWarehouseId: 'wh_lax', destinationWarehouseId: 'platform-amazon-fba-us', lines: Clines, status: 'released', reservedAt: '2026-11-15T12:00:00Z' };
  const ip_C: InboundPlan = { ...e, id: 'ip:demo:C', number: 'IP-20261115-003', replenishmentPlanId: C, sourceType: 'transfer', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Clines, status: 'awaiting_platform', platformStage: 'request_submitted', sourceLabel: 'LAX Fulfillment Center', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-15T12:05:00Z' };
  const pt_C: ReplenishmentPluginTask = { ...e, id: 'pt:demo:C', operation: 'create_platform_inbound', inboundPlanId: ip_C.id, provider: 'amazon_fba', status: 'queued', idempotencyKey: `${ip_C.id}:create_platform_inbound`, requestedAt: '2026-11-15T12:10:00Z', request: { lines: Clines } };
  transferOrders.push(to_C); inboundPlans.push(ip_C); pluginTasks.push(pt_C);
  plans.push({ ...e, id: C, number: 'RP-20261115-003', sourceType: 'transfer', destinationType: 'amazon_fba', reason: 'promotion', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Clines, status: 'inbound_planning', transferOrderId: to_C.id, inboundPlanId: ip_C.id, plannedShipDate: '2026-11-18', createdAt: '2026-11-15T11:00:00Z', approvedAt: '2026-11-15T12:00:00Z', note: '促销备货，等待 Amazon 平台确认分仓方案。' });

  // ══════════════════════════════════════════════════════════════════════════
  // D: 入库计划中 · 平台已确认分仓 — Amazon FBA 调拨
  // ══════════════════════════════════════════════════════════════════════════
  const D = 'rp:demo:D';
  const Dlines = [
    mkLine(`${D}:L1`, 'TP-BLK-STD',  'var_002_1', 200, 'NW-TP-BLK-STD',  'B0C8NW4P23', 'X004NWTP01', 'TP-BLK-STD'),
    mkLine(`${D}:L2`, 'TP-BLK-MINI', 'var_002_2', 100, 'NW-TP-BLK-MINI', 'B0C8NW4P25', 'X004NWTP02', 'TP-BLK-MINI'),
  ];
  const to_D: TransferOrder = { ...e, id: 'to:demo:D', number: 'TR-20261115-004', replenishmentPlanId: D, sourceWarehouseId: 'wh_ewr', destinationWarehouseId: 'platform-amazon-fba-us', lines: Dlines, status: 'in_progress', reservedAt: '2026-11-14T09:00:00Z' };
  const alloc_D1: PlatformAllocation = { ...e, id: 'alloc:demo:D:1', inboundPlanId: 'ip:demo:D', externalShipmentId: 'FBA-SHIP-D-PHX-001', destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: [{ lineId: `${D}:L1`, quantity: 120 }, { lineId: `${D}:L2`, quantity: 60 }], status: 'confirmed', sourceExecutionIds: [] };
  const alloc_D2: PlatformAllocation = { ...e, id: 'alloc:demo:D:2', inboundPlanId: 'ip:demo:D', externalShipmentId: 'FBA-SHIP-D-ORD-001', destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: [{ lineId: `${D}:L1`, quantity: 80 }, { lineId: `${D}:L2`, quantity: 40 }], status: 'confirmed', sourceExecutionIds: [] };
  const ip_D: InboundPlan = { ...e, id: 'ip:demo:D', number: 'IP-20261115-004', replenishmentPlanId: D, sourceType: 'transfer', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Dlines, status: 'platform_confirmed', platformStage: 'placement_confirmed', sourceLabel: 'EWR Distribution Hub', sourceAddress: { name: 'EWR Distribution Hub', address1: '500 Logistics Way', city: 'Newark', country: 'US' }, platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-D-001', externalStatus: 'confirmed', syncedAt: '2026-11-15T16:00:00Z' }, allocationIds: [alloc_D1.id, alloc_D2.id], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-14T09:10:00Z', confirmedAt: '2026-11-15T16:00:00Z' };
  transferOrders.push(to_D); allocations.push(alloc_D1, alloc_D2); inboundPlans.push(ip_D);
  plans.push({ ...e, id: D, number: 'RP-20261115-004', sourceType: 'transfer', destinationType: 'amazon_fba', reason: 'seasonal', shippingWarehouseId: 'wh_ewr', sourceWarehouseId: 'wh_ewr', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Dlines, status: 'inbound_planning', transferOrderId: to_D.id, inboundPlanId: ip_D.id, plannedShipDate: '2026-11-16', createdAt: '2026-11-14T08:00:00Z', approvedAt: '2026-11-14T09:00:00Z', note: '季节性备货，平台已分仓，待生成出入库执行单。' });

  // ══════════════════════════════════════════════════════════════════════════
  // E: 执行中 — Amazon FBA 调拨，2 分仓，部分已发运
  // ══════════════════════════════════════════════════════════════════════════
  const E = 'rp:demo:E';
  const Elines = [
    mkLine(`${E}:L1`, 'WEP-BLK-001', 'var_001_1', 200, 'NW-WEP-BLK-US', 'B0C8NW4P21', 'X004NWEP01', 'WEP-BLK-001'),
    mkLine(`${E}:L2`, 'WEP-WHT-001', 'var_001_2', 100, 'NW-WEP-WHT-US', 'B0C8NW4P22', 'X004NWEP02', 'WEP-WHT-001'),
  ];
  const to_E: TransferOrder = { ...e, id: 'to:demo:E', number: 'TR-20261112-005', replenishmentPlanId: E, sourceWarehouseId: 'wh_lax', destinationWarehouseId: 'platform-amazon-fba-us', lines: Elines, status: 'shipped', reservedAt: '2026-11-12T09:00:00Z' };
  const alloc_E1: PlatformAllocation = { ...e, id: 'alloc:demo:E:1', inboundPlanId: 'ip:demo:E', externalShipmentId: 'FBA-SHIP-E-LAX-001', destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: [{ lineId: `${E}:L1`, quantity: 100 }, { lineId: `${E}:L2`, quantity: 60 }], status: 'confirmed', sourceExecutionIds: ['out:demo:E:1'] };
  const alloc_E2: PlatformAllocation = { ...e, id: 'alloc:demo:E:2', inboundPlanId: 'ip:demo:E', externalShipmentId: 'FBA-SHIP-E-EWR-001', destinationCode: 'AMAZON-FC-EWR', destinationName: 'Amazon FC Newark (EWR4)', lines: [{ lineId: `${E}:L1`, quantity: 100 }, { lineId: `${E}:L2`, quantity: 40 }], status: 'confirmed', sourceExecutionIds: ['out:demo:E:2'] };
  const op_E1: OutboundPlan = { ...e, id: 'op:demo:E:1', number: 'OP-20261112-005-1', inboundPlanId: 'ip:demo:E', sourceType: 'transfer', sourceWarehouseId: 'wh_lax', lines: alloc_E1.lines, status: 'shipped', outboundOrderIds: ['out:demo:E:1'] };
  const op_E2: OutboundPlan = { ...e, id: 'op:demo:E:2', number: 'OP-20261112-005-2', inboundPlanId: 'ip:demo:E', sourceType: 'transfer', sourceWarehouseId: 'wh_lax', lines: alloc_E2.lines, status: 'in_progress', outboundOrderIds: ['out:demo:E:2'] };
  const oo_E1: OutboundOrder = { ...e, id: 'out:demo:E:1', number: 'OUT-20261112-005-1', outboundPlanId: op_E1.id, inboundOrderId: 'in:demo:E:1', sourceWarehouseId: 'wh_lax', destinationCode: 'AMAZON-FC-LAX', lines: alloc_E1.lines, status: 'shipped', packageIds: [], carrier: 'UPS', trackingNumber: '1Z999AA10123456784', dispatchedAt: '2026-11-13T10:00:00Z', labels: [{ id: 'lbl:E1:pl', kind: 'packing_list', provider: 'amazon_fba', fileName: 'OUT-20261112-005-1-packing_list.pdf', status: 'ready', readyAt: '2026-11-13T08:00:00Z', downloadUrl: '/demo-labels/OUT-20261112-005-1-packing_list.pdf' }, { id: 'lbl:E1:pb', kind: 'platform_box', provider: 'amazon_fba', fileName: 'OUT-20261112-005-1-platform_box.pdf', status: 'ready', readyAt: '2026-11-13T08:05:00Z', downloadUrl: '/demo-labels/OUT-20261112-005-1-platform_box.pdf' }] };
  const oo_E2: OutboundOrder = { ...e, id: 'out:demo:E:2', number: 'OUT-20261112-005-2', outboundPlanId: op_E2.id, inboundOrderId: 'in:demo:E:2', sourceWarehouseId: 'wh_lax', destinationCode: 'AMAZON-FC-EWR', lines: alloc_E2.lines, status: 'in_progress', packageIds: [] };
  const io_E1: InboundOrder = { ...e, id: 'in:demo:E:1', number: 'IN-20261112-005-1', inboundPlanId: 'ip:demo:E', allocationId: alloc_E1.id, destinationCode: 'AMAZON-FC-LAX', lines: alloc_E1.lines, status: 'receiving', expectedQuantity: 160, receivedQuantity: 60, damagedQuantity: 0, shortQuantity: 100 };
  const io_E2: InboundOrder = { ...e, id: 'in:demo:E:2', number: 'IN-20261112-005-2', inboundPlanId: 'ip:demo:E', allocationId: alloc_E2.id, destinationCode: 'AMAZON-FC-EWR', lines: alloc_E2.lines, status: 'shipped', expectedQuantity: 140, receivedQuantity: 0, damagedQuantity: 0, shortQuantity: 0 };
  const ip_E: InboundPlan = { ...e, id: 'ip:demo:E', number: 'IP-20261112-005', replenishmentPlanId: E, sourceType: 'transfer', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Elines, status: 'executing', platformStage: 'labels_ready', sourceLabel: 'LAX Fulfillment Center', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-E-001', externalStatus: 'confirmed', syncedAt: '2026-11-12T14:00:00Z' }, allocationIds: [alloc_E1.id, alloc_E2.id], inboundOrderIds: [io_E1.id, io_E2.id], outboundPlanIds: [op_E1.id, op_E2.id], createdAt: '2026-11-12T09:10:00Z', confirmedAt: '2026-11-12T14:00:00Z' };
  transferOrders.push(to_E); allocations.push(alloc_E1, alloc_E2); inboundPlans.push(ip_E);
  outboundPlans.push(op_E1, op_E2); outboundOrds.push(oo_E1, oo_E2); inboundOrders.push(io_E1, io_E2);
  plans.push({ ...e, id: E, number: 'RP-20261112-005', sourceType: 'transfer', destinationType: 'amazon_fba', reason: 'safety_stock', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Elines, status: 'executing', transferOrderId: to_E.id, inboundPlanId: ip_E.id, plannedShipDate: '2026-11-13', plannedArrivalDate: '2026-11-20', createdAt: '2026-11-12T08:00:00Z', approvedAt: '2026-11-12T09:00:00Z', note: '执行中：LAX 分仓已发运收货，EWR 分仓发运中。' });

  // ══════════════════════════════════════════════════════════════════════════
  // F: 入库计划中 · 待生成执行单 — OMS 仓库调拨
  // ══════════════════════════════════════════════════════════════════════════
  const F = 'rp:demo:F';
  const Flines = [
    mkLine(`${F}:L1`, 'WEP-BLK-001', 'var_001_1', 100, undefined, undefined, undefined, 'WEP-BLK-001'),
    mkLine(`${F}:L2`, 'TP-BLK-STD',  'var_002_1',  50, undefined, undefined, undefined, 'TP-BLK-STD'),
  ];
  const to_F: TransferOrder = { ...e, id: 'to:demo:F', number: 'TR-20261116-006', replenishmentPlanId: F, sourceWarehouseId: 'wh_lax', destinationWarehouseId: 'wh_sea', lines: Flines, status: 'released', reservedAt: '2026-11-16T10:00:00Z' };
  const ip_F: InboundPlan = { ...e, id: 'ip:demo:F', number: 'IP-20261116-006', replenishmentPlanId: F, sourceType: 'transfer', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_sea', lines: Flines, status: 'ready_for_execution', platformStage: 'not_started', sourceLabel: 'LAX Fulfillment Center', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-16T10:05:00Z' };
  transferOrders.push(to_F); inboundPlans.push(ip_F);
  plans.push({ ...e, id: F, number: 'RP-20261116-006', sourceType: 'transfer', destinationType: 'oms_warehouse', reason: 'manual', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'wh_sea', destinationWarehouseId: 'wh_sea', lines: Flines, status: 'inbound_planning', transferOrderId: to_F.id, inboundPlanId: ip_F.id, plannedShipDate: '2026-11-18', createdAt: '2026-11-16T09:30:00Z', approvedAt: '2026-11-16T10:00:00Z', note: 'LAX → SEA 仓内调拨，请生成出库单和入库单。' });

  // ══════════════════════════════════════════════════════════════════════════
  // G: 部分完成 — OMS 仓库调拨，收货差异
  // ══════════════════════════════════════════════════════════════════════════
  const G = 'rp:demo:G';
  const Glines = [
    mkLine(`${G}:L1`, 'WEP-BLK-001', 'var_001_1', 100, undefined, undefined, undefined, 'WEP-BLK-001'),
  ];
  const to_G: TransferOrder = { ...e, id: 'to:demo:G', number: 'TR-20261110-007', replenishmentPlanId: G, sourceWarehouseId: 'wh_ewr', destinationWarehouseId: 'wh_dfw', lines: Glines, status: 'shipped', reservedAt: '2026-11-10T08:00:00Z' };
  const op_G1: OutboundPlan = { ...e, id: 'op:demo:G:1', number: 'OP-20261110-007-1', inboundPlanId: 'ip:demo:G', sourceType: 'transfer', sourceWarehouseId: 'wh_ewr', lines: [{ lineId: `${G}:L1`, quantity: 100 }], status: 'shipped', outboundOrderIds: ['out:demo:G:1'] };
  const oo_G1: OutboundOrder = { ...e, id: 'out:demo:G:1', number: 'OUT-20261110-007-1', outboundPlanId: op_G1.id, inboundOrderId: 'in:demo:G:1', sourceWarehouseId: 'wh_ewr', destinationCode: 'wh_dfw', lines: [{ lineId: `${G}:L1`, quantity: 100 }], status: 'shipped', packageIds: [], carrier: 'FedEx', trackingNumber: '794676794328', dispatchedAt: '2026-11-11T09:00:00Z', labels: [{ id: 'lbl:G1:pl', kind: 'packing_list', fileName: 'OUT-20261110-007-1-packing_list.pdf', status: 'ready', readyAt: '2026-11-11T08:00:00Z', downloadUrl: '/demo-labels/OUT-20261110-007-1-packing_list.pdf' }] };
  const io_G1: InboundOrder = { ...e, id: 'in:demo:G:1', number: 'IN-20261110-007-1', inboundPlanId: 'ip:demo:G', destinationCode: 'wh_dfw', lines: [{ lineId: `${G}:L1`, quantity: 100 }], status: 'receiving', expectedQuantity: 100, receivedQuantity: 60, damagedQuantity: 2, shortQuantity: 38 };
  const ip_G: InboundPlan = { ...e, id: 'ip:demo:G', number: 'IP-20261110-007', replenishmentPlanId: G, sourceType: 'transfer', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_dfw', lines: Glines, status: 'partially_received', platformStage: 'not_started', sourceLabel: 'EWR Distribution Hub', sourceAddress: { name: 'EWR Distribution Hub', address1: '500 Logistics Way', city: 'Newark', country: 'US' }, allocationIds: [], inboundOrderIds: [io_G1.id], outboundPlanIds: [op_G1.id], createdAt: '2026-11-10T08:10:00Z' };
  transferOrders.push(to_G); inboundPlans.push(ip_G);
  outboundPlans.push(op_G1); outboundOrds.push(oo_G1); inboundOrders.push(io_G1);
  plans.push({ ...e, id: G, number: 'RP-20261110-007', sourceType: 'transfer', destinationType: 'oms_warehouse', reason: 'stockout', shippingWarehouseId: 'wh_ewr', sourceWarehouseId: 'wh_ewr', receivingWarehouseId: 'wh_dfw', destinationWarehouseId: 'wh_dfw', lines: Glines, status: 'partially_completed', transferOrderId: to_G.id, inboundPlanId: ip_G.id, plannedShipDate: '2026-11-11', plannedArrivalDate: '2026-11-14', createdAt: '2026-11-10T07:00:00Z', approvedAt: '2026-11-10T08:00:00Z', note: 'DFW 缺货应急调拨，实收 60 件，差异 38 件（短收），损坏 2 件，待核查。' });

  // ══════════════════════════════════════════════════════════════════════════
  // H: 已完成 — OMS 仓库调拨
  // ══════════════════════════════════════════════════════════════════════════
  const H = 'rp:demo:H';
  const Hlines = [
    mkLine(`${H}:L1`, 'TP-BLK-STD', 'var_002_1', 50, undefined, undefined, undefined, 'TP-BLK-STD'),
    mkLine(`${H}:L2`, 'TP-GRY-STD', 'var_002_3', 30, undefined, undefined, undefined, 'TP-GRY-STD'),
  ];
  const to_H: TransferOrder = { ...e, id: 'to:demo:H', number: 'TR-20261101-008', replenishmentPlanId: H, sourceWarehouseId: 'wh_lax', destinationWarehouseId: 'wh_sea', lines: Hlines, status: 'completed', reservedAt: '2026-11-01T08:00:00Z' };
  const op_H1: OutboundPlan = { ...e, id: 'op:demo:H:1', number: 'OP-20261101-008-1', inboundPlanId: 'ip:demo:H', sourceType: 'transfer', sourceWarehouseId: 'wh_lax', lines: Hlines.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'completed', outboundOrderIds: ['out:demo:H:1'] };
  const oo_H1: OutboundOrder = { ...e, id: 'out:demo:H:1', number: 'OUT-20261101-008-1', outboundPlanId: op_H1.id, inboundOrderId: 'in:demo:H:1', sourceWarehouseId: 'wh_lax', destinationCode: 'wh_sea', lines: Hlines.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'shipped', packageIds: [], carrier: 'UPS', trackingNumber: '1Z999AA10987654321', dispatchedAt: '2026-11-02T10:00:00Z', labels: [{ id: 'lbl:H1:pl', kind: 'packing_list', fileName: 'OUT-20261101-008-1-packing_list.pdf', status: 'ready', readyAt: '2026-11-02T09:00:00Z', downloadUrl: '/demo-labels/OUT-20261101-008-1-packing_list.pdf' }] };
  const io_H1: InboundOrder = { ...e, id: 'in:demo:H:1', number: 'IN-20261101-008-1', inboundPlanId: 'ip:demo:H', destinationCode: 'wh_sea', lines: Hlines.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'completed', expectedQuantity: 80, receivedQuantity: 80, damagedQuantity: 0, shortQuantity: 0 };
  const ip_H: InboundPlan = { ...e, id: 'ip:demo:H', number: 'IP-20261101-008', replenishmentPlanId: H, sourceType: 'transfer', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_sea', lines: Hlines, status: 'completed', platformStage: 'not_started', sourceLabel: 'LAX Fulfillment Center', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, allocationIds: [], inboundOrderIds: [io_H1.id], outboundPlanIds: [op_H1.id], createdAt: '2026-11-01T08:10:00Z' };
  transferOrders.push(to_H); inboundPlans.push(ip_H);
  outboundPlans.push(op_H1); outboundOrds.push(oo_H1); inboundOrders.push(io_H1);
  plans.push({ ...e, id: H, number: 'RP-20261101-008', sourceType: 'transfer', destinationType: 'oms_warehouse', reason: 'manual', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'wh_sea', destinationWarehouseId: 'wh_sea', lines: Hlines, status: 'completed', transferOrderId: to_H.id, inboundPlanId: ip_H.id, plannedShipDate: '2026-11-02', plannedArrivalDate: '2026-11-05', completedAt: '2026-11-05T14:00:00Z', createdAt: '2026-11-01T07:00:00Z', approvedAt: '2026-11-01T08:00:00Z', note: 'LAX → SEA 调拨已完成，全部 80 件正常入库。' });

  // ══════════════════════════════════════════════════════════════════════════
  // I: 已取消 — Amazon FBA 调拨（审批后取消）
  // ══════════════════════════════════════════════════════════════════════════
  const I = 'rp:demo:I';
  const Ilines = [
    mkLine(`${I}:L1`, 'WEP-BLK-001', 'var_001_1', 50, 'NW-WEP-BLK-US', 'B0C8NW4P21', 'X004NWEP01'),
  ];
  plans.push({ ...e, id: I, number: 'RP-20261108-009', sourceType: 'transfer', destinationType: 'amazon_fba', reason: 'manual', shippingWarehouseId: 'wh_sea', sourceWarehouseId: 'wh_sea', receivingWarehouseId: 'platform-amazon-fba-us', destinationWarehouseId: 'platform-amazon-fba-us', connectionId: 'amz-northwind-seller-na', site: 'US', lines: Ilines, status: 'cancelled', createdAt: '2026-11-08T09:00:00Z', note: '已取消：供应链调整，本次计划停止执行。' });

  // ══════════════════════════════════════════════════════════════════════════
  // 以下为独立入库计划（不关联补货计划），覆盖全部操作状态，供体验测试
  // ══════════════════════════════════════════════════════════════════════════

  // K: 草稿 — Amazon FBA US（可提交）
  const K = 'ip:standalone:K';
  const Ksl = [mkLine(`${K}:L1`,'WEP-BLK-001','var_001_1',300,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'), mkLine(`${K}:L2`,'DC16-BLK','var_003_1',200,'NW-DC16-BLK-US','B0C9DC1600','X004DC1601','DC16-BLK')];
  inboundPlans.push({ ...e, id: K, number: 'IP-20261117-011', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'EWR Distribution Hub', sourceWarehouseId: 'wh_ewr', sourceAddress: { name: 'EWR Distribution Hub', address1: '100 Haynes Ave', city: 'Newark', country: 'US' }, inboundReason: 'platform_stocking', lines: Ksl, status: 'draft', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T08:00:00Z' });

  // L: 待审批 — OMS仓库 供应商采购（可审批，与 M 组成批量审批测试）
  const L = 'ip:standalone:L';
  const Lsl = [mkLine(`${L}:L1`,'TP-BLK-STD','var_002_1',120), mkLine(`${L}:L2`,'TP-GRY-STD','var_002_3',60)];
  inboundPlans.push({ ...e, id: L, number: 'IP-20261117-012', sourceType: 'supplier', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_lax', sourceLabel: 'TechParts Supplier', sourceAddress: { name: 'TechParts Supplier', address1: '88 Baoan Industrial Road', city: 'Shenzhen', country: 'CN' }, inboundReason: 'purchase_receipt', lines: Lsl, status: 'pending_approval', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T09:00:00Z' });

  // M: 待审批 — Amazon FBA，与 L 组成批量审批测试
  const M = 'ip:standalone:M';
  const Msl = [mkLine(`${M}:L1`,'WEP-BLU-001','var_001_3',180,'NW-WEP-BLU-US','B0C8NW4P24','X004NWEP03','WEP-BLU-001'), mkLine(`${M}:L2`,'TP-OLV-STD','var_002_5',90,'NW-TP-OLV-STD','B0C8NW4P28','X004NWTP05','TP-OLV-STD')];
  inboundPlans.push({ ...e, id: M, number: 'IP-20261117-013', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'platform_stocking', lines: Msl, status: 'pending_approval', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T10:00:00Z' });

  // N: 已审批 — OMS仓库，与 O 组成批量开始办理测试
  const N = 'ip:standalone:N';
  const Nsl = [mkLine(`${N}:L1`,'DC16-WHT','var_003_2',400)];
  inboundPlans.push({ ...e, id: N, number: 'IP-20261117-014', sourceType: 'own_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_sea', sourceLabel: 'DFW Central Warehouse', sourceWarehouseId: 'wh_dfw', sourceAddress: { name: 'DFW Central Warehouse', address1: '2300 W Interstate 20', city: 'Grand Prairie', country: 'US' }, inboundReason: 'transfer', lines: Nsl, status: 'approved', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T11:00:00Z', confirmedAt: '2026-11-17T11:30:00Z' });

  // O: 已审批 — Amazon FBA，与 N 组成批量开始办理测试
  const O = 'ip:standalone:O';
  const Osl = [mkLine(`${O}:L1`,'WEP-BLK-001','var_001_1',250,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'), mkLine(`${O}:L2`,'TP-BLK-MINI','var_002_2',100,'NW-TP-BLK-MINI','B0C8NW4P25','X004NWTP02','TP-BLK-MINI')];
  inboundPlans.push({ ...e, id: O, number: 'IP-20261117-015', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'SEA Distribution Center', sourceWarehouseId: 'wh_sea', sourceAddress: { name: 'Seattle Distribution Center', address1: '1900 1st Ave S', city: 'Seattle', country: 'US' }, inboundReason: 'platform_stocking', lines: Osl, status: 'approved', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T12:00:00Z', confirmedAt: '2026-11-17T12:30:00Z' });

  // P: 准备中 — OMS仓库（可确认收货目标）
  const P = 'ip:standalone:P';
  const Psl = [mkLine(`${P}:L1`,'DC16-ONG','var_003_3',150)];
  inboundPlans.push({ ...e, id: P, number: 'IP-20261117-016', sourceType: 'own_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_ewr', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'transfer', lines: Psl, status: 'preparing', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T13:00:00Z', confirmedAt: '2026-11-17T13:30:00Z' });

  // Q: 待确认包装方案 — Amazon FBA（packing_options_ready，可确认包装）
  const Q = 'ip:standalone:Q';
  const Qsl = [mkLine(`${Q}:L1`,'WEP-WHT-001','var_001_2',200,'NW-WEP-WHT-US','B0C8NW4P22','X004NWEP02','WEP-WHT-001'), mkLine(`${Q}:L2`,'DC16-BLU','var_003_4',180,'NW-DC16-BLU-US','B0C9DC1603','X004DC1604','DC16-BLU')];
  const ip_Q: InboundPlan = { ...e, id: Q, number: 'IP-20261117-017', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'EWR Distribution Hub', sourceWarehouseId: 'wh_ewr', sourceAddress: { name: 'EWR Distribution Hub', address1: '100 Haynes Ave', city: 'Newark', country: 'US' }, inboundReason: 'platform_stocking', platformOperationId: 'op-IP-20261117-017-packing_options', lines: Qsl, status: 'packing_options', platformStage: 'packing_options_ready', platform: { provider: 'amazon_fba', externalStatus: 'packing_options_ready', syncedAt: '2026-11-17T14:00:00Z' },
    packingOptions: [
      { id: `po:${Q}:1`, externalOptionId: 'FBA-PKG-OPT-001', label: '标准分组（推荐）', packingGroups: [{ id: `pg:${Q}:1a`, externalGroupId: 'PG-001', lines: Qsl.map(l => ({ lineId: l.id, quantity: l.quantity })), supportedTransportModes: ['SPD', 'LTL'] }], fees: [{ currency: 'USD', amount: 0, type: '无额外费用' }], expiresAt: '2026-11-18T14:00:00Z' },
      { id: `po:${Q}:2`, externalOptionId: 'FBA-PKG-OPT-002', label: '按商品类型分组', packingGroups: [{ id: `pg:${Q}:2a`, externalGroupId: 'PG-002A', lines: [{ lineId: Qsl[0].id, quantity: Qsl[0].quantity }], supportedTransportModes: ['SPD'] }, { id: `pg:${Q}:2b`, externalGroupId: 'PG-002B', lines: [{ lineId: Qsl[1].id, quantity: Qsl[1].quantity }], supportedTransportModes: ['SPD', 'LTL'] }], fees: [{ currency: 'USD', amount: 15.00, type: '分组处理费' }], expiresAt: '2026-11-18T14:00:00Z' },
    ],
    allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T13:30:00Z', confirmedAt: '2026-11-17T14:00:00Z' };
  // 注意：packing_options 阶段已改为直接自动确认包装组并跳到 packing 状态，Q 场景同步更新
  inboundPlans.push({ ...ip_Q, status: 'packing', platformStage: 'packing_confirmed', selectedPackingOptionId: `po:${Q}:1`,
    platform: { provider: 'amazon_fba', externalStatus: 'packing_confirmed', syncedAt: '2026-11-17T14:00:00Z' } });
  const R = 'ip:standalone:R';
  const Rsl = [mkLine(`${R}:L1`,'TP-BLK-STD','var_002_1',160,'NW-TP-BLK-STD','B0C8NW4P23','X004NWTP01','TP-BLK-STD')];
  inboundPlans.push({ ...e, id: R, number: 'IP-20261117-018', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'platform_stocking', platformOperationId: 'op-IP-20261117-018-packing_confirm', lines: Rsl, status: 'packing', platformStage: 'packing_confirmed', platform: { provider: 'amazon_fba', externalStatus: 'packing_confirmed', syncedAt: '2026-11-17T14:30:00Z' }, allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T14:00:00Z', confirmedAt: '2026-11-17T14:30:00Z' });

  // S: 待确认分仓方案 — Amazon FBA（placement_options_ready，含候选分仓）
  const S = 'ip:standalone:S';
  const Ssl = [mkLine(`${S}:L1`,'WEP-BLK-001','var_001_1',240,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'), mkLine(`${S}:L2`,'WEP-BLU-001','var_001_3',120,'NW-WEP-BLU-US','B0C8NW4P24','X004NWEP03','WEP-BLU-001')];
  const alloc_S1: PlatformAllocation = { ...e, id: 'alloc:standalone:S:1', inboundPlanId: S, externalShipmentId: 'FBA-SHIP-S-PHX-001', destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: [{ lineId: `${S}:L1`, quantity: 150 }, { lineId: `${S}:L2`, quantity: 80 }], status: 'confirmed', sourceExecutionIds: [] };
  const alloc_S2: PlatformAllocation = { ...e, id: 'alloc:standalone:S:2', inboundPlanId: S, externalShipmentId: 'FBA-SHIP-S-ORD-001', destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: [{ lineId: `${S}:L1`, quantity: 90 }, { lineId: `${S}:L2`, quantity: 40 }], status: 'confirmed', sourceExecutionIds: [] };
  allocations.push(alloc_S1, alloc_S2);
  inboundPlans.push({ ...e, id: S, number: 'IP-20261117-019', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'DFW Central Warehouse', sourceWarehouseId: 'wh_dfw', sourceAddress: { name: 'DFW Central Warehouse', address1: '2300 W Interstate 20', city: 'Grand Prairie', country: 'US' }, inboundReason: 'platform_stocking', platformOperationId: 'op-IP-20261117-019-placement_options', lines: Ssl, status: 'placement_options', platformStage: 'placement_options_ready', platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-S-001', externalStatus: 'placement_options_ready', syncedAt: '2026-11-17T15:00:00Z' },
    placementOptions: [
      { id: `place:${S}:1`, externalOptionId: 'FBA-PLACE-OPT-001', shipments: [{ externalShipmentId: 'FBA-SHIP-S-PHX-001', destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: [{ lineId: `${S}:L1`, quantity: 150 }, { lineId: `${S}:L2`, quantity: 80 }] }, { externalShipmentId: 'FBA-SHIP-S-ORD-001', destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', lines: [{ lineId: `${S}:L1`, quantity: 90 }, { lineId: `${S}:L2`, quantity: 40 }] }], fees: [], expiresAt: '2026-11-18T15:00:00Z' },
      { id: `place:${S}:2`, externalOptionId: 'FBA-PLACE-OPT-002', shipments: [{ externalShipmentId: 'FBA-SHIP-S-LAX-001', destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: [{ lineId: `${S}:L1`, quantity: 240 }, { lineId: `${S}:L2`, quantity: 120 }] }], fees: [{ currency: 'USD', amount: 28.50, type: '单仓运费折扣' }], discount: [{ currency: 'USD', amount: 28.50 }], expiresAt: '2026-11-18T15:00:00Z' },
    ],
    allocationIds: [alloc_S1.id, alloc_S2.id], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T14:30:00Z', confirmedAt: '2026-11-17T15:00:00Z' });

  // T: 待确认运输 — Amazon FBA（transport_options_ready，含分仓）
  const T = 'ip:standalone:T';
  const Tsl = [mkLine(`${T}:L1`,'DC16-BLK','var_003_1',350,'NW-DC16-BLK-US','B0C9DC1600','X004DC1601','DC16-BLK'), mkLine(`${T}:L2`,'DC16-ONG','var_003_3',180,'NW-DC16-ONG-US','B0C9DC1602','X004DC1603','DC16-ONG')];
  const alloc_T1: PlatformAllocation = { ...e, id: 'alloc:standalone:T:1', inboundPlanId: T, externalShipmentId: 'FBA-SHIP-T-LAX-001', destinationCode: 'AMAZON-FC-LAX', destinationName: 'Amazon FC Los Angeles (LAX9)', lines: [{ lineId: `${T}:L1`, quantity: 200 }, { lineId: `${T}:L2`, quantity: 100 }], status: 'confirmed', sourceExecutionIds: [] };
  const alloc_T2: PlatformAllocation = { ...e, id: 'alloc:standalone:T:2', inboundPlanId: T, externalShipmentId: 'FBA-SHIP-T-EWR-001', destinationCode: 'AMAZON-FC-EWR', destinationName: 'Amazon FC Newark (EWR4)', lines: [{ lineId: `${T}:L1`, quantity: 150 }, { lineId: `${T}:L2`, quantity: 80 }], status: 'confirmed', sourceExecutionIds: [] };
  allocations.push(alloc_T1, alloc_T2);
  inboundPlans.push({ ...e, id: T, number: 'IP-20261117-020', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'SEA Distribution Center', sourceWarehouseId: 'wh_sea', sourceAddress: { name: 'Seattle Distribution Center', address1: '1900 1st Ave S', city: 'Seattle', country: 'US' }, inboundReason: 'platform_stocking', platformOperationId: 'op-IP-20261117-020-transport_options', lines: Tsl, status: 'transport_preparing', platformStage: 'transport_options_ready', platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-T-001', externalStatus: 'placement_confirmed', syncedAt: '2026-11-17T16:00:00Z' },
    transportOptions: {
      [alloc_T1.id]: [
        { id: `tr:${T}:1:spd`, externalOptionId: 'FBA-TR-T1-SPD', mode: 'SPD', carrier: 'UPS', serviceType: 'Ground', isPartnered: true, quote: { currency: 'USD', amount: 42.80, expiresAt: '2026-11-18T16:00:00Z' }, estimatedArrival: '2026-11-21' },
        { id: `tr:${T}:1:ltl`, externalOptionId: 'FBA-TR-T1-LTL', mode: 'LTL', carrier: 'XPO Logistics', serviceType: 'LTL Standard', isPartnered: false, estimatedArrival: '2026-11-22' },
      ],
      [alloc_T2.id]: [
        { id: `tr:${T}:2:spd`, externalOptionId: 'FBA-TR-T2-SPD', mode: 'SPD', carrier: 'FedEx', serviceType: 'Ground', isPartnered: true, quote: { currency: 'USD', amount: 36.50, expiresAt: '2026-11-18T16:00:00Z' }, estimatedArrival: '2026-11-21' },
      ],
    },
    allocationIds: [alloc_T1.id, alloc_T2.id], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T15:30:00Z', confirmedAt: '2026-11-17T16:00:00Z' });

  // U: 待发运（标签已就绪）— Amazon FBA，可生成执行单
  const U = 'ip:standalone:U';
  const Usl = [mkLine(`${U}:L1`,'WEP-BLK-001','var_001_1',400,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'), mkLine(`${U}:L2`,'TP-BLK-STD','var_002_1',200,'NW-TP-BLK-STD','B0C8NW4P23','X004NWTP01','TP-BLK-STD')];
  const alloc_U1: PlatformAllocation = { ...e, id: 'alloc:standalone:U:1', inboundPlanId: U, externalShipmentId: 'FBA-SHIP-U-PHX-001', destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', lines: [{ lineId: `${U}:L1`, quantity: 250 }, { lineId: `${U}:L2`, quantity: 130 }], status: 'confirmed', sourceExecutionIds: [] };
  const alloc_U2: PlatformAllocation = { ...e, id: 'alloc:standalone:U:2', inboundPlanId: U, externalShipmentId: 'FBA-SHIP-U-SEA-001', destinationCode: 'AMAZON-FC-SEA', destinationName: 'Amazon FC Seattle (SEA6)', lines: [{ lineId: `${U}:L1`, quantity: 150 }, { lineId: `${U}:L2`, quantity: 70 }], status: 'confirmed', sourceExecutionIds: [] };
  allocations.push(alloc_U1, alloc_U2);
  inboundPlans.push({ ...e, id: U, number: 'IP-20261117-021', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'DFW Central Warehouse', sourceWarehouseId: 'wh_dfw', sourceAddress: { name: 'DFW Central Warehouse', address1: '2300 W Interstate 20', city: 'Grand Prairie', country: 'US' }, inboundReason: 'platform_stocking', lines: Usl, status: 'ready_for_execution', platformStage: 'labels_ready', labelsReady: true, platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-U-001', externalStatus: 'transport_confirmed', syncedAt: '2026-11-17T17:00:00Z' }, allocationIds: [alloc_U1.id, alloc_U2.id], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T16:30:00Z', confirmedAt: '2026-11-17T17:00:00Z' });

  // V: 待发运 — OMS仓库，可直接生成执行单（无需平台流程）
  const V = 'ip:standalone:V';
  const Vsl = [mkLine(`${V}:L1`,'DC16-WHT','var_003_2',200), mkLine(`${V}:L2`,'DC16-BLU','var_003_4',100)];
  inboundPlans.push({ ...e, id: V, number: 'IP-20261117-022', sourceType: 'own_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_dfw', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'transfer', lines: Vsl, status: 'ready_for_execution', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T17:00:00Z', confirmedAt: '2026-11-17T17:30:00Z' });

  // W: 收货中 — OMS仓库，含入库单（可录入收货）
  const W = 'ip:standalone:W';
  const Wsl = [mkLine(`${W}:L1`,'WEP-BLK-001','var_001_1',160), mkLine(`${W}:L2`,'TP-BLK-STD','var_002_1',80)];
  const op_W1: OutboundPlan = { ...e, id: `op:${W}:1`, number: 'OP-20261117-023-1', inboundPlanId: W, sourceType: 'own_warehouse', sourceWarehouseId: 'wh_ewr', lines: Wsl.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'shipped', outboundOrderIds: [`out:${W}:1`] };
  const oo_W1: OutboundOrder = { ...e, id: `out:${W}:1`, number: 'OUT-20261117-023-1', outboundPlanId: op_W1.id, inboundOrderId: `in:${W}:1`, sourceWarehouseId: 'wh_ewr', destinationCode: 'wh_lax', lines: Wsl.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'shipped', packageIds: [], carrier: 'UPS', trackingNumber: '1Z999AA10111222333', dispatchedAt: '2026-11-17T18:00:00Z', labels: [{ id: `lbl:${W}:pl`, kind: 'packing_list', fileName: 'OUT-20261117-023-1-packing_list.pdf', status: 'ready', readyAt: '2026-11-17T17:30:00Z', downloadUrl: '/demo-labels/OUT-20261117-023-1-packing_list.pdf' }] };
  const io_W1: InboundOrder = { ...e, id: `in:${W}:1`, number: 'IN-20261117-023-1', inboundPlanId: W, destinationCode: 'wh_lax', lines: Wsl.map(l => ({ lineId: l.id, quantity: l.quantity })), status: 'receiving', expectedQuantity: 240, receivedQuantity: 80, damagedQuantity: 0, shortQuantity: 160 };
  outboundPlans.push(op_W1); outboundOrds.push(oo_W1); inboundOrders.push(io_W1);
  inboundPlans.push({ ...e, id: W, number: 'IP-20261117-023', sourceType: 'own_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_lax', sourceLabel: 'EWR Distribution Hub', sourceWarehouseId: 'wh_ewr', sourceAddress: { name: 'EWR Distribution Hub', address1: '100 Haynes Ave', city: 'Newark', country: 'US' }, inboundReason: 'transfer', lines: Wsl, status: 'receiving', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [`in:${W}:1`], outboundPlanIds: [op_W1.id], createdAt: '2026-11-17T17:00:00Z', confirmedAt: '2026-11-17T17:30:00Z' });

  // X: 已取消（独立）
  const X = 'ip:standalone:X';
  const Xsl = [mkLine(`${X}:L1`,'WEP-BLK-001','var_001_1',100,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001')];
  inboundPlans.push({ ...e, id: X, number: 'IP-20261116-024', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'EWR Distribution Hub', sourceWarehouseId: 'wh_ewr', sourceAddress: { name: 'EWR Distribution Hub', address1: '100 Haynes Ave', city: 'Newark', country: 'US' }, inboundReason: 'platform_stocking', lines: Xsl, status: 'cancelled', platformStage: 'not_started', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-16T10:00:00Z' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 1: 自有仓草稿（可编辑提交）+ 三方仓待回填关联单号
  // ══════════════════════════════════════════════════════════════════════════
  const V1a = 'ip:v1:own-draft';
  const V1asl = [mkLine(`${V1a}:L1`,'TP-BLK-STD','var_002_1',200), mkLine(`${V1a}:L2`,'TP-GRY-STD','var_002_3',100)];
  inboundPlans.push({ ...e, id: V1a, number: 'IP-20261118-025', sourceType: 'own_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_sea', sourceLabel: 'DFW Central Warehouse', sourceWarehouseId: 'wh_dfw', sourceAddress: { name: 'DFW Central Warehouse', address1: '2300 W Interstate 20', city: 'Grand Prairie', country: 'US' }, inboundReason: 'transfer', lines: V1asl, status: 'draft', platformStage: 'not_started', pluginStatus: 'not_submitted', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-18T08:00:00Z', sourceDoc: { type: 'transfer_order', number: 'TR-20261118-001' } });

  const V1b = 'ip:v1:3pl-pending';
  const V1bsl = [mkLine(`${V1b}:L1`,'WEP-BLK-001','var_001_1',150), mkLine(`${V1b}:L2`,'DC16-BLK','var_003_1',80,'NW-DC16-BLK-US','B0C9DC1600','X004DC1601','DC16-BLK')];
  const io_V1b: InboundOrder = { ...e, id: `in:${V1b}:1`, number: 'IN-20261118-025-1', inboundPlanId: V1b, destinationCode: 'wh_lax', lines: V1bsl.map(l=>({lineId:l.id,quantity:l.quantity})), status: 'completed', expectedQuantity: 230, receivedQuantity: 230, damagedQuantity: 0, shortQuantity: 0 };
  inboundOrders.push(io_V1b);
  inboundPlans.push({ ...e, id: V1b, number: 'IP-20261118-026', sourceType: 'third_party_warehouse', destinationType: 'oms_warehouse', destinationWarehouseId: 'wh_lax', sourceLabel: '上海三宝仓储', sourceAddress: { name: '上海三宝仓储', address1: '上海市嘉定区工业园路 88 号', city: '上海', country: 'CN' }, inboundReason: 'purchase_receipt', lines: V1bsl, status: 'completed', platformStage: 'not_started', pluginStatus: 'not_submitted', allocationIds: [], inboundOrderIds: [`in:${V1b}:1`], outboundPlanIds: [], createdAt: '2026-11-16T10:00:00Z', sourceDoc: { type: 'purchase_order', number: 'PO-20261116-003' } });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 2: FBA 新品缺预处理/贴标配置（提交时需补录）
  // ══════════════════════════════════════════════════════════════════════════
  const V2 = 'ip:v2:fba-missing-prep';
  const V2sl = [
    mkLine(`${V2}:L1`,'WEP-BLK-001','var_001_1',300,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'),
    // 新品：无 FNSKU、缺预处理配置
    { ...mkLine(`${V2}:L2`,'HL-LED-400','hl_001',120,'HL-LED-US-NEW','','','HL-LED-400'), asin: 'B0NEW12345' },
  ];
  inboundPlans.push({ ...e, id: V2, number: 'IP-20261118-027', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'platform_stocking', lines: V2sl, status: 'draft', platformStage: 'not_started', pluginStatus: 'not_submitted',
    prepInstructions: [
      { lineId: `${V2}:L1`, prepType: 'labeling', prepOwnership: 'seller', labelOwnership: 'seller', confirmed: true },
      { lineId: `${V2}:L2`, confirmed: false }, // 新品未确认预处理
    ],
    allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-18T09:00:00Z' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 3a: FBA 创建提交中（pluginStatus: submitting）
  // ══════════════════════════════════════════════════════════════════════════
  const V3a = 'ip:v3a:fba-submitting';
  const V3asl = [mkLine(`${V3a}:L1`,'DC16-WHT','var_003_2',200,'NW-DC16-WHT-US','B0C9DC1601','X004DC1602','DC16-WHT')];
  inboundPlans.push({ ...e, id: V3a, number: 'IP-20261118-028', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'SEA Distribution Center', sourceWarehouseId: 'wh_sea', sourceAddress: { name: 'Seattle Distribution Center', address1: '1900 1st Ave S', city: 'Seattle', country: 'US' }, inboundReason: 'platform_stocking', lines: V3asl, status: 'awaiting_platform', platformStage: 'request_submitted', pluginStatus: 'submitting', pluginOperationId: 'op-async-12345', pluginSubmittedAt: '2026-11-18T10:00:00Z', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-18T10:00:00Z', platform: { provider: 'amazon_fba', externalStatus: 'processing', syncedAt: '2026-11-18T10:00:00Z' } });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 3b: FBA 创建失败（pluginStatus: failed）
  // ══════════════════════════════════════════════════════════════════════════
  const V3b = 'ip:v3b:fba-failed';
  const V3bsl = [mkLine(`${V3b}:L1`,'WEP-WHT-001','var_001_2',150,'NW-WEP-WHT-US','B0C8NW4P22','X004NWEP02','WEP-WHT-001')];
  inboundPlans.push({ ...e, id: V3b, number: 'IP-20261118-029', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'EWR Distribution Hub', sourceWarehouseId: 'wh_ewr', sourceAddress: { name: 'EWR Distribution Hub', address1: '100 Haynes Ave', city: 'Newark', country: 'US' }, inboundReason: 'platform_stocking', lines: V3bsl, status: 'exception', platformStage: 'failed', pluginStatus: 'failed', pluginError: { code: 'INVALID_MSKU', message: 'Item WEP-WHT-001 does not have a valid Amazon listing in the US marketplace. Please verify the MSKU mapping.', retryable: true }, pluginSubmittedAt: '2026-11-18T11:00:00Z', allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-18T11:00:00Z' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 4: FBA 一张计划分两票货件（含完整装箱/标签/运输/收货数据）
  // ══════════════════════════════════════════════════════════════════════════
  const V4 = 'ip:v4:fba-2shipments';
  const V4sl = [
    mkLine(`${V4}:L1`,'WEP-BLK-001','var_001_1',300,'NW-WEP-BLK-US','B0C8NW4P21','X004NWEP01','WEP-BLK-001'),
    mkLine(`${V4}:L2`,'TP-BLK-STD','var_002_1',200,'NW-TP-BLK-STD','B0C8NW4P23','X004NWTP01','TP-BLK-STD'),
  ];
  const V4boxes1: PackingBox[] = [
    { id: `box:${V4}:s1:1`, boxNumber: 'BOX-V4-S1-001', lines: [{ lineId: `${V4}:L1`, quantity: 12 }], weight: 8.4, weightUnit: 'kg', dimensions: { length: 40, width: 30, height: 25, unit: 'cm' } },
    { id: `box:${V4}:s1:2`, boxNumber: 'BOX-V4-S1-002', lines: [{ lineId: `${V4}:L1`, quantity: 12 }], weight: 8.4, weightUnit: 'kg', dimensions: { length: 40, width: 30, height: 25, unit: 'cm' } },
    { id: `box:${V4}:s1:3`, boxNumber: 'BOX-V4-S1-003', lines: [{ lineId: `${V4}:L2`, quantity: 10 }], weight: 12.0, weightUnit: 'kg', dimensions: { length: 50, width: 40, height: 30, unit: 'cm' } },
  ];
  const V4labels1: ShipmentLabel[] = [
    { id: `lbl:${V4}:s1:box`, kind: 'platform_box', fileName: 'FBA-V4-S1-box-labels.pdf', status: 'ready', readyAt: '2026-11-16T14:00:00Z', downloadUrl: '/demo-labels/FBA-V4-S1-box-labels.pdf' },
    { id: `lbl:${V4}:s1:item`, kind: 'platform_item', fileName: 'FBA-V4-S1-item-labels.pdf', status: 'ready', readyAt: '2026-11-16T14:05:00Z', downloadUrl: '/demo-labels/FBA-V4-S1-item-labels.pdf' },
  ];
  const V4transport1: ShipmentTransport = { mode: 'SPD', carrier: 'UPS', trackingNumber: '1Z999AA10111222333', actualShipDate: '2026-11-16T16:00:00Z', estimatedArrival: '2026-11-20', actualArrival: '2026-11-19T14:00:00Z' };
  const V4receiving1: ShipmentReceiving = { expectedQuantity: 34, receivedQuantity: 34, damagedQuantity: 0, shortQuantity: 0, firstReceivedAt: '2026-11-19T15:00:00Z', completedAt: '2026-11-19T16:00:00Z' };
  const alloc_V4_1: PlatformAllocation = { ...e, id: 'alloc:v4:1', inboundPlanId: V4, externalShipmentId: 'FBA-SHIP-V4-PHX-001', destinationCode: 'AMAZON-FC-PHX', destinationName: 'Amazon FC Phoenix (PHX7)', actualDestAddress: { name: 'Amazon Phoenix 7', address1: '800 N. 75th Ave', city: 'Phoenix', state: 'AZ', country: 'US', zip: '85043' }, lines: [{ lineId: `${V4}:L1`, quantity: 180 }, { lineId: `${V4}:L2`, quantity: 120 }], status: 'confirmed', sourceExecutionIds: [`out:${V4}:1`], boxes: V4boxes1, labels: V4labels1, transport: V4transport1, receiving: V4receiving1 };

  const V4boxes2: PackingBox[] = [
    { id: `box:${V4}:s2:1`, boxNumber: 'BOX-V4-S2-001', lines: [{ lineId: `${V4}:L1`, quantity: 10 }], weight: 7.0, weightUnit: 'kg' },
    { id: `box:${V4}:s2:2`, boxNumber: 'BOX-V4-S2-002', lines: [{ lineId: `${V4}:L2`, quantity: 8 }], weight: 9.6, weightUnit: 'kg' },
  ];
  const V4labels2: ShipmentLabel[] = [
    { id: `lbl:${V4}:s2:box`, kind: 'platform_box', fileName: 'FBA-V4-S2-box-labels.pdf', status: 'ready', readyAt: '2026-11-16T14:10:00Z', downloadUrl: '/demo-labels/FBA-V4-S2-box-labels.pdf' },
    { id: `lbl:${V4}:s2:item`, kind: 'platform_item', fileName: 'FBA-V4-S2-item-labels.pdf', status: 'ready', readyAt: '2026-11-16T14:12:00Z', downloadUrl: '/demo-labels/FBA-V4-S2-item-labels.pdf' },
  ];
  const V4transport2: ShipmentTransport = { mode: 'SPD', carrier: 'FedEx', trackingNumber: '794676794328XX', actualShipDate: '2026-11-16T17:00:00Z', estimatedArrival: '2026-11-21', appointmentRequired: false };
  const V4receiving2: ShipmentReceiving = { expectedQuantity: 18, receivedQuantity: 15, damagedQuantity: 1, shortQuantity: 2, firstReceivedAt: '2026-11-21T10:00:00Z', discrepancyReason: '1件外箱破损，2件入库未登记' };
  const alloc_V4_2: PlatformAllocation = { ...e, id: 'alloc:v4:2', inboundPlanId: V4, externalShipmentId: 'FBA-SHIP-V4-ORD-001', destinationCode: 'AMAZON-FC-ORD', destinationName: 'Amazon FC Chicago (ORD4)', actualDestAddress: { name: 'Amazon Chicago 4', address1: '250 Emerald Dr', city: 'Joliet', state: 'IL', country: 'US', zip: '60433' }, lines: [{ lineId: `${V4}:L1`, quantity: 120 }, { lineId: `${V4}:L2`, quantity: 80 }], status: 'confirmed', sourceExecutionIds: [`out:${V4}:2`], boxes: V4boxes2, labels: V4labels2, transport: V4transport2, receiving: V4receiving2 };
  allocations.push(alloc_V4_1, alloc_V4_2);

  const op_V4_1: OutboundPlan = { ...e, id:`op:${V4}:1`, number:`OP-20261116-V4-1`, inboundPlanId:V4, sourceType:'own_warehouse', sourceWarehouseId:'wh_lax', lines:[{lineId:`${V4}:L1`,quantity:180},{lineId:`${V4}:L2`,quantity:120}], status:'shipped', outboundOrderIds:[`out:${V4}:1`] };
  const op_V4_2: OutboundPlan = { ...e, id:`op:${V4}:2`, number:`OP-20261116-V4-2`, inboundPlanId:V4, sourceType:'own_warehouse', sourceWarehouseId:'wh_lax', lines:[{lineId:`${V4}:L1`,quantity:120},{lineId:`${V4}:L2`,quantity:80}], status:'shipped', outboundOrderIds:[`out:${V4}:2`] };
  const oo_V4_1: OutboundOrder = { ...e, id:`out:${V4}:1`, number:`OUT-20261116-V4-1`, outboundPlanId:op_V4_1.id, inboundOrderId:`in:${V4}:1`, sourceWarehouseId:'wh_lax', destinationCode:'AMAZON-FC-PHX', lines:op_V4_1.lines, status:'shipped', packageIds:[], carrier:'UPS', trackingNumber:'1Z999AA10111222333', dispatchedAt:'2026-11-16T16:00:00Z' };
  const oo_V4_2: OutboundOrder = { ...e, id:`out:${V4}:2`, number:`OUT-20261116-V4-2`, outboundPlanId:op_V4_2.id, inboundOrderId:`in:${V4}:2`, sourceWarehouseId:'wh_lax', destinationCode:'AMAZON-FC-ORD', lines:op_V4_2.lines, status:'shipped', packageIds:[], carrier:'FedEx', trackingNumber:'794676794328XX', dispatchedAt:'2026-11-16T17:00:00Z' };
  const io_V4_1: InboundOrder = { ...e, id:`in:${V4}:1`, number:`IN-20261116-V4-1`, inboundPlanId:V4, allocationId:alloc_V4_1.id, destinationCode:'AMAZON-FC-PHX', lines:[{lineId:`${V4}:L1`,quantity:180},{lineId:`${V4}:L2`,quantity:120}], status:'completed', expectedQuantity:300, receivedQuantity:300, damagedQuantity:0, shortQuantity:0 };
  const io_V4_2: InboundOrder = { ...e, id:`in:${V4}:2`, number:`IN-20261116-V4-2`, inboundPlanId:V4, allocationId:alloc_V4_2.id, destinationCode:'AMAZON-FC-ORD', lines:[{lineId:`${V4}:L1`,quantity:120},{lineId:`${V4}:L2`,quantity:80}], status:'receiving', expectedQuantity:200, receivedQuantity:180, damagedQuantity:8, shortQuantity:12 };
  outboundPlans.push(op_V4_1, op_V4_2); outboundOrds.push(oo_V4_1, oo_V4_2); inboundOrders.push(io_V4_1, io_V4_2);
  inboundPlans.push({ ...e, id: V4, number: 'IP-20261116-030', sourceType: 'own_warehouse', destinationType: 'amazon_fba', connectionId: 'amz-northwind-seller-na', site: 'US', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'platform_stocking', lines: V4sl, status: 'receiving', platformStage: 'labels_ready', labelsReady: true, pluginStatus: 'success', pluginSubmittedAt: '2026-11-14T10:00:00Z', platform: { provider: 'amazon_fba', externalPlanId: 'FBA-PLAN-V4-001', externalStatus: 'SHIPPED', syncedAt: '2026-11-16T18:00:00Z' }, allocationIds: [alloc_V4_1.id, alloc_V4_2.id], inboundOrderIds: [`in:${V4}:1`,`in:${V4}:2`], outboundPlanIds: [op_V4_1.id, op_V4_2.id], createdAt: '2026-11-14T09:00:00Z', confirmedAt: '2026-11-14T12:00:00Z', plannedShipDate: '2026-11-16', plannedArrivalDate: '2026-11-21' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 5: WFS — 缺 GTIN/退货地址/预计到仓日期（校验提示）
  // ══════════════════════════════════════════════════════════════════════════
  const V5 = 'ip:v5:wfs-missing-fields';
  const V5sl = [
    { ...mkLine(`${V5}:L1`,'WEP-BLK-001','var_001_1',100,'WMT-WEP-BLK','','','WEP-BLK-001'), asin:'B0C8NW4P21' },
    // 缺 GTIN（channelSku/asin 为空），WFS 建单时会报错
    { ...mkLine(`${V5}:L2`,'HL-LED-400','hl_001',50), channelSku:'', asin:'' },
  ];
  inboundPlans.push({ ...e, id: V5, number: 'IP-20261118-031', sourceType: 'own_warehouse', destinationType: 'walmart_fc', connectionId: 'wmt-northwind-us', site: 'US', sourceLabel: 'DFW Central Warehouse', sourceWarehouseId: 'wh_dfw', sourceAddress: { name: 'DFW Central Warehouse', address1: '2300 W Interstate 20', city: 'Grand Prairie', country: 'US' }, inboundReason: 'platform_stocking', lines: V5sl, status: 'draft', platformStage: 'not_started', pluginStatus: 'not_submitted',
    // 缺退货地址：returnAddress 未设置
    plannedArrivalDate: '', // 预计到仓日期未填
    allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-18T10:00:00Z' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 6: FBT — 人工建单后回填单号，待确认时间窗
  // ══════════════════════════════════════════════════════════════════════════
  const V6 = 'ip:v6:fbt-manual';
  const V6sl = [
    mkLine(`${V6}:L1`,'WEP-BLK-001','var_001_1',80,'TT-WEP-BLK-US','TT-PROD-001','','WEP-BLK-001'),
    mkLine(`${V6}:L2`,'TP-BLK-STD','var_002_1',60,'TT-TP-BLK-STD','TT-PROD-002','','TP-BLK-STD'),
  ];
  const alloc_V6_1: PlatformAllocation = { ...e, id: 'alloc:v6:1', inboundPlanId: V6, externalShipmentId: 'FBT-INBOUND-V6-001', destinationCode: 'TIKTOK-FC-LAX', destinationName: 'TikTok FBT Los Angeles', lines: [{ lineId:`${V6}:L1`,quantity:80 },{ lineId:`${V6}:L2`,quantity:60 }], status: 'confirmed', sourceExecutionIds: [],
    transport: { mode: 'SPD', appointmentRequired: true, appointmentStatus: 'not_scheduled', deliveryWindow: { start: '2026-11-21T08:00:00', end: '2026-11-21T17:00:00', timezone: 'America/Los_Angeles' } },
    receiving: { expectedQuantity: 140, receivedQuantity: 0, damagedQuantity: 0, shortQuantity: 0 } };
  allocations.push(alloc_V6_1);
  inboundPlans.push({ ...e, id: V6, number: 'IP-20261118-032', sourceType: 'own_warehouse', destinationType: 'tiktok_fulfillment', connectionId: 'tiktok-seller-us', site: 'US', sourceLabel: 'LAX Fulfillment Center', sourceWarehouseId: 'wh_lax', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, inboundReason: 'platform_stocking', lines: V6sl, status: 'executing', platformStage: 'labels_ready', labelsReady: true, pluginStatus: 'success', pluginSubmittedAt: '2026-11-17T10:00:00Z', platform: { provider: 'tiktok_fulfillment', externalPlanId: 'FBT-PLAN-V6-001', externalStatus: 'PENDING_SHIP', syncedAt: '2026-11-18T09:00:00Z' }, allocationIds: [alloc_V6_1.id], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-17T09:00:00Z', confirmedAt: '2026-11-17T10:30:00Z', plannedShipDate: '2026-11-20', plannedArrivalDate: '2026-11-21' });

  // ══════════════════════════════════════════════════════════════════════════
  // 验收场景 7: 部分收货+拒收+破损（OMS 仓库），数量差异核对
  // ══════════════════════════════════════════════════════════════════════════
  const V7 = 'ip:v7:partial-receive';
  const V7sl = [
    mkLine(`${V7}:L1`,'WEP-BLK-001','var_001_1',200),
    mkLine(`${V7}:L2`,'TP-BLK-STD','var_002_1',100),
    mkLine(`${V7}:L3`,'DC16-BLK','var_003_1',150),
  ];
  const alloc_V7_1: PlatformAllocation = { ...e, id:'alloc:v7:1', inboundPlanId:V7, destinationCode:'wh_ewr', destinationName:'EWR Distribution Hub', actualDestAddress:{name:'EWR Distribution Hub',address1:'100 Haynes Ave',city:'Newark',state:'NJ',country:'US',zip:'07114'}, lines:V7sl.map(l=>({lineId:l.id,quantity:l.quantity})), status:'confirmed', sourceExecutionIds:[`out:${V7}:1`],
    transport:{ mode:'LTL', carrier:'XPO Logistics', trackingNumber:'XPO-PRO-V7-001', actualShipDate:'2026-11-15T08:00:00Z', estimatedArrival:'2026-11-18', appointmentRequired:true, appointmentStatus:'completed', appointmentNumber:'APT-V7-001', actualArrival:'2026-11-18T10:30:00Z' },
    receiving:{ expectedQuantity:450, receivedQuantity:380, damagedQuantity:12, shortQuantity:28, rejectedQuantity:30, firstReceivedAt:'2026-11-18T11:00:00Z', discrepancyReason:'30件外箱明显破损被拒收，12件商品轻微损坏接受入库，28件货物短少未到' } };
  allocations.push(alloc_V7_1);
  const op_V7_1: OutboundPlan = { ...e, id:`op:${V7}:1`, number:`OP-20261115-V7-1`, inboundPlanId:V7, sourceType:'own_warehouse', sourceWarehouseId:'wh_sea', lines:V7sl.map(l=>({lineId:l.id,quantity:l.quantity})), status:'shipped', outboundOrderIds:[`out:${V7}:1`] };
  const oo_V7_1: OutboundOrder = { ...e, id:`out:${V7}:1`, number:`OUT-20261115-V7-1`, outboundPlanId:op_V7_1.id, inboundOrderId:`in:${V7}:1`, sourceWarehouseId:'wh_sea', destinationCode:'wh_ewr', lines:op_V7_1.lines, status:'shipped', packageIds:[], carrier:'XPO Logistics', trackingNumber:'XPO-PRO-V7-001', dispatchedAt:'2026-11-15T08:00:00Z' };
  const io_V7_1: InboundOrder = { ...e, id:`in:${V7}:1`, number:`IN-20261115-V7-1`, inboundPlanId:V7, allocationId:alloc_V7_1.id, destinationCode:'wh_ewr', lines:V7sl.map(l=>({lineId:l.id,quantity:l.quantity})), status:'receiving', expectedQuantity:450, receivedQuantity:380, damagedQuantity:12, shortQuantity:58 };
  outboundPlans.push(op_V7_1); outboundOrds.push(oo_V7_1); inboundOrders.push(io_V7_1);
  inboundPlans.push({ ...e, id:V7, number:'IP-20261115-033', sourceType:'own_warehouse', destinationType:'oms_warehouse', destinationWarehouseId:'wh_ewr', sourceLabel:'SEA Distribution Center', sourceWarehouseId:'wh_sea', sourceAddress:{name:'Seattle Distribution Center',address1:'1900 1st Ave S',city:'Seattle',country:'US'}, inboundReason:'transfer', lines:V7sl, status:'partially_received', platformStage:'not_started', pluginStatus:'not_submitted', allocationIds:[alloc_V7_1.id], inboundOrderIds:[`in:${V7}:1`], outboundPlanIds:[op_V7_1.id], createdAt:'2026-11-14T10:00:00Z', confirmedAt:'2026-11-14T11:00:00Z', plannedShipDate:'2026-11-15', plannedArrivalDate:'2026-11-18' });

  // ══════════════════════════════════════════════════════════════════════════
  // J: TikTok Fulfillment 调拨，等待平台确认
  // ══════════════════════════════════════════════════════════════════════════
  const J = 'rp:demo:J';
  const Jlines = [
    mkLine(`${J}:L1`, 'WEP-BLK-001', 'var_001_1', 80, 'TT-WEP-BLK-US', 'TT-PLAT-001', 'TT-BAR-001', 'WEP-BLK-001'),
    mkLine(`${J}:L2`, 'TP-BLK-STD',  'var_002_1', 60, 'TT-TP-BLK-STD', 'TT-PLAT-002', 'TT-BAR-002', 'TP-BLK-STD'),
  ];
  const to_J: TransferOrder = { ...e, id: 'to:demo:J', number: 'TR-20261116-010', replenishmentPlanId: J, sourceWarehouseId: 'wh_lax', destinationWarehouseId: 'platform-tiktok-us', lines: Jlines, status: 'released', reservedAt: '2026-11-16T14:00:00Z' };
  const ip_J: InboundPlan = { ...e, id: 'ip:demo:J', number: 'IP-20261116-010', replenishmentPlanId: J, sourceType: 'transfer', destinationType: 'tiktok_fulfillment', connectionId: 'tiktok-seller-us', site: 'US', lines: Jlines, status: 'awaiting_platform', platformStage: 'not_started', sourceLabel: 'LAX Fulfillment Center', sourceAddress: { name: 'LAX Fulfillment Center', address1: '1200 Warehouse Blvd', city: 'Los Angeles', country: 'US' }, allocationIds: [], inboundOrderIds: [], outboundPlanIds: [], createdAt: '2026-11-16T14:05:00Z' };
  transferOrders.push(to_J); inboundPlans.push(ip_J);
  plans.push({ ...e, id: J, number: 'RP-20261116-010', sourceType: 'transfer', destinationType: 'tiktok_fulfillment', reason: 'forecast', shippingWarehouseId: 'wh_lax', sourceWarehouseId: 'wh_lax', receivingWarehouseId: 'platform-tiktok-us', destinationWarehouseId: 'platform-tiktok-us', connectionId: 'tiktok-seller-us', site: 'US', lines: Jlines, status: 'inbound_planning', transferOrderId: to_J.id, inboundPlanId: ip_J.id, plannedShipDate: '2026-11-19', createdAt: '2026-11-16T13:00:00Z', approvedAt: '2026-11-16T14:00:00Z', note: 'TikTok Shop US 补货，等待平台入仓确认。' });

  s.replenishmentPlans = plans;
  s.transferOrders = transferOrders;
  s.purchaseOrders = purchaseOrders;
  s.inboundPlansV2 = inboundPlans;
  s.platformAllocations = allocations;
  s.outboundPlans = outboundPlans;
  s.inboundOrders = inboundOrders;
  s.outboundOrdersV2 = outboundOrds;
  s.replenishmentPluginTasks = pluginTasks;
  s.migratedSources = [...s.migratedSources.filter(x => !['replenishment-demo-v2','replenishment-demo-v3','replenishment-demo-v4','replenishment-demo-v5'].includes(x)), 'replenishment-demo-v6'];
  return s;
}
