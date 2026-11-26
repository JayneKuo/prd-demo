import type { Connection } from '@/lib/amazon-connections';
import { seedVendorNodeMappings } from '@/lib/vendor-node-mappings';
import { advanceOmsJobs, assertOmsInvariants } from './commands';
import { assertFbaAddons, executeFba, fbaFees, type FbaCommand } from './fba';
import { emptySnapshot, type OmsSnapshot } from './types';
import { advanceVendorJobs, assertVendorInvariants, ensureVendorFixtures, executeVendorCommand, type VendorCommand } from './vendor';

const PREFIX = 'amz-scenario-v1';
const SELLER = 'amz-northwind-seller-na';
const VENDOR = 'amz-northwind-vendor-na';
const WAREHOUSE = 'wh_lax';
const scenario = (key: string, label: string, description: string, route: string) => ({ id: `${PREFIX}:${key}`, label, description, route });

/** IDs are also source-order tags, so lists can display labels without changing business numbers. */
export const scenarioCatalog = [
  scenario('vendor-partial', '批发·部分确认', '待确认的 Collect PO，可逐行接受部分数量并延期余量。', '/dashboard/vendor-orders'),
  scenario('vendor-deferred', '批发·延期再确认', '已接受部分数量；延期数量须再次确认后才可分配。', '/dashboard/vendor-orders'),
  scenario('vendor-collect', '批发·Collect 待 ASN', 'Collect 路由已就绪，来源仓已打包且保持真实库存预占，待提交 ASN。', '/dashboard/vendor-orders'),
  scenario('vendor-prepaid', '批发·Prepaid 待确认', 'Prepaid PO 待数量确认，随后自行安排运输。', '/dashboard/vendor-orders'),
  scenario('df-pending', '直发·待接单', 'DF 待接受或拒绝，只能从指定节点履约，不支持延期。', '/dashboard/vendor-orders?type=df'),
  scenario('df-label', '直发·待面单', '指定节点已打包，尚未生成标签及 Packing Slip。', '/dashboard/vendor-orders?type=df'),
  scenario('fba-draft', '补货·多 SKU 草稿', '两种 SKU 的补货草稿，尚未装箱或预占库存。', '/dashboard/fba/plans'),
  scenario('fba-packed', '补货·待选分仓', '装箱完成，已生成分仓方案但尚未选择，不产生预占。', '/dashboard/fba/plans'),
  scenario('fba-placement-selected', '补货·已选方案', '单目的地方案已选，待确认费用并生成出库单。', '/dashboard/fba/plans'),
  scenario('fba-split', '补货·两仓待发运', '已确认两仓 SPD 补货，两个来源出库均已打包，待实际发运。', '/dashboard/fba/plans'),
  scenario('fba-supplier-draft', '直发·补货草稿', '供应商直发 FBA：计划草稿，待装箱信息和分仓确认，无仓库预占。', '/dashboard/fba/plans'),
  scenario('fba-supplier-confirmed', '直发·待发货指令', '供应商直发 FBA：已确认方案，发货指令待发送给供应商执行。', '/dashboard/fba/plans'),
  scenario('fba-delivery-plan-draft', '发货计划·草稿', '新建的自有仓补货发货计划，待提交审批。', '/dashboard/fba/delivery-plans'),
  scenario('fba-delivery-plan-pending', '发货计划·待审批', '已提交审批的发货计划，等待管理员确认发货数量。', '/dashboard/fba/delivery-plans'),
  scenario('fba-delivery-plan-linked', '发货计划·已关联货件', '已审批并关联了入仓货件的完整端到端发货计划演示。', '/dashboard/fba/delivery-plans'),
];

const sellerConnection: Connection = {
  id: SELLER, name: 'Northwind Seller NA', identity: 'seller', region: 'NA', accountId: 'northwind-seller-na', authorized: true,
  businesses: { fba: { status: 'enabled', site: 'US', warehouse: WAREHOUSE, rule: 'manual', syncFrom: '2026-11-04', mappingConfirmed: true, reference: '' } },
};

// Only these collections are produced by the commands below. Existing addon collections and archives stay untouched.
const collections = ['orders', 'fulfillments', 'outbounds', 'reservations', 'movements', 'packages', 'jobs', 'events', 'vendorOrders', 'vendorBatches', 'vendorJobs', 'vendorFinanceReceipts', 'inboundPlans', 'inboundShipments', 'fbaObservations', 'removalTasks'] as const;

/**
 * Append independent records, never reset fixtures or advance another order's queued work.
 * Commands run in a scoped construction aggregate against copies of actual warehouse stock;
 * only their reservation deltas and newly generated documents are committed to the aggregate.
 */
export function ensureAmazonDomainScenarios(current: OmsSnapshot): OmsSnapshot {
  if (current.companyId !== 'company_northwind' || current.merchantId !== 'merchant_us_amazon' || current.migratedSources.includes(PREFIX)) return current;
  let state = structuredClone(current);
  const now = Date.now();
  const scope = { tenantId: current.tenantId, companyId: current.companyId, merchantId: current.merchantId };
  const templates = ensureVendorFixtures(emptySnapshot(scope));
  for (const entry of scenarioCatalog) {
    // One surviving record is enough to protect a previously imported/edited scenario.
    const existingIds = new Set([
      ...collections.flatMap(key => (state[key] ?? []).map(row => row.id)),
      ...state.commandIds,
    ]);
    if ([...existingIds].some(id => id === entry.id || id.startsWith(`${entry.id}:`) || id.includes(`:${entry.id}:`))) continue;
    let work = emptySnapshot(scope);
    work.stocks = structuredClone(state.stocks);
    const template = templates.vendorOrders![entry.id.includes(':df-') ? 2 : 0];
    const products = template.lines;
    // A foreign record occupying an opening-stock ID must not be reused or replaced.
    if (products.some(line => !work.stocks.some(stock => stock.pool === 'warehouse' && stock.warehouseId === WAREHOUSE && stock.sku === line.sku) && work.stocks.some(stock => stock.id === `${PREFIX}:opening-stock:${line.sku}`))) continue;
    for (const line of products) {
      if (!work.stocks.some(stock => stock.pool === 'warehouse' && stock.warehouseId === WAREHOUSE && stock.sku === line.sku)) {
        work.stocks.push({ tenantId: current.tenantId, companyId: current.companyId, merchantId: current.merchantId, revision: 1, id: `${PREFIX}:opening-stock:${line.sku}`, warehouseId: WAREHOUSE, sku: line.sku, pool: 'warehouse', onHand: 100, reserved: 0, unfulfillable: 0 });
      }
    }
    // Never refill edited stock to force a scenario into existence. Insufficient-stock
    // execution scenarios are skipped; pending/draft scenarios still remain available.
    const required = entry.id.endsWith('collect') || entry.id.endsWith('label') ? products.map(line => line.ordered) : entry.id.endsWith('split') ? [6, 4] : [];
    if (required.some((quantity, index) => {
      const stock = work.stocks.find(row => row.pool === 'warehouse' && row.warehouseId === WAREHOUSE && row.sku === products[index].sku)!;
      return stock.onHand - stock.reserved - stock.unfulfillable < quantity;
    })) continue;
    const ctx = (step: string) => ({ id: `${entry.id}:${step}`, now, actor: 'amazon-scenario-bootstrap', canWrite: true });
    const vendor = (command: VendorCommand, step: string) => { work = executeVendorCommand(work, command, ctx(step)); };
    const fba = (command: FbaCommand, step: string) => { work = executeFba(work, command, { ...ctx(step), connection: sellerConnection }); };
    if (!entry.id.includes(':fba-')) {
      const po = structuredClone(template);
      const df = entry.id.includes(':df-');
      po.id = entry.id; po.salesOrderId = `${entry.id}:demand`;
      const sequence = scenarioCatalog.indexOf(entry) + 101;
      po.reference = `${df ? 'DF' : 'PO'}-20261104-${sequence}`;
      po.route = df || entry.id.endsWith('prepaid') ? 'Prepaid' : 'Collect';
      po.createdAt = new Date(now).toISOString(); po.history = [];
      po.lines.forEach((line, index) => { line.id = `${entry.id}:line:${index + 1}`; });
      const demand = structuredClone(templates.orders.find(order => order.id === template.salesOrderId)!);
      demand.id = po.salesOrderId; demand.number = po.reference; demand.sourceId = po.reference;
      demand.createdAt = po.createdAt; demand.tags.push(entry.id);
      demand.note = entry.description;
      demand.lines.forEach((line, index) => { line.id = po.lines[index].id; });
      work.vendorOrders = [po]; work.vendorBatches = []; work.vendorJobs = []; work.vendorFinanceReceipts = [];
      work.orders.push(demand);
      const deferred = entry.id.endsWith('deferred');
      const packed = entry.id.endsWith('collect') || entry.id.endsWith('label');
      if (deferred || packed) {
        vendor({ type: 'vendor_ack', purchaseOrderId: po.id, reason: '', lines: po.lines.map(line => ({ ...line, accepted: deferred ? 2 : line.ordered, backorder: deferred ? line.ordered - 2 : 0, scheduledShipDate: deferred ? new Date(now + 7 * 86400000).toISOString().slice(0, 10) : undefined })) }, 'ack');
        work = advanceVendorJobs(work, now + 1200);
      }
      if (packed) {
        const node = seedVendorNodeMappings({ companyId: current.companyId, merchantScope: current.merchantId, connectionId: VENDOR }).find(row => row.warehouseId === WAREHOUSE)!;
        const accepted = work.vendorOrders![0];
        if (df) vendor({ type: 'vendor_df_fulfill', purchaseOrderId: po.id, node }, 'batch');
        else vendor({ type: 'vendor_batch', purchaseOrderId: po.id, node, batch: { id: '', status: 'routing_pending', warehouseId: WAREHOUSE, route: 'Collect', lines: accepted.lines.map(line => ({ sku: line.sku, qty: line.accepted })), readyDate: new Date(now).toISOString().slice(0, 10), cartons: 2, pallets: 0, weightKg: 5, volumeM3: .2, routingRef: '', destination: '', carrier: '', tracking: '', asn: '', submittedAt: '', transactionId: '' } }, 'batch');
        work = advanceVendorJobs(work, now + 1200);
        work = advanceOmsJobs(work, now + 3000);
      }
    } else if (entry.id.includes(':fba-supplier-')) {
      // 供应商直发场景：无仓库库存要求，SKU 和 Seller SKU 映射
      const supplierLines = products.map((line, index) => ({ id: `${entry.id}:line:${index + 1}`, sku: line.sku, omsVariantId: line.omsVariantId, sellerSku: index === 0 ? 'NW-WEP-BLK-US' : 'NW-TP-BLK-STD', fnsku: index === 0 ? 'X004NWEP01' : 'X004NWTP01', quantity: index === 0 ? 8 : 6 }));
      fba({ type: 'fba_create_supplier_plan', connectionId: SELLER, site: 'US', supplierName: 'Shenzhen TechParts Co.', purchaseOrderRef: `PO-20261104-S${scenarioCatalog.indexOf(entry) + 101}`, lines: supplierLines }, 'create');
      let plan = work.inboundPlans![0];
      plan.number = `FBA-S-20261104-${scenarioCatalog.indexOf(entry) + 101}`;
      if (entry.id.endsWith('confirmed')) {
        // 供应商直发·待发货指令：已确认，发货指令待发送
        fba({ type: 'fba_pack', planId: plan.id, containers: [{ id: `${entry.id}:carton:1`, weightKg: 4, contents: plan.lines.map(line => ({ lineId: line.id, quantity: line.quantity })) }] }, 'pack');
        fba({ type: 'fba_generate_placements', planId: plan.id }, 'placements');
        plan = work.inboundPlans![0];
        // 选择单目的地，方案更简单
        fba({ type: 'fba_select_placement', planId: plan.id, placementId: plan.placements.find(option => option.destinations.length === 1)!.id }, 'select');
        plan = work.inboundPlans![0];
        fba({ type: 'fba_confirm', planId: plan.id, transport: 'SPD', expectedFeesMinor: fbaFees(plan, 'SPD') }, 'confirm');
        work.orders[0]?.tags.push(entry.id); if (work.orders[0]) work.orders[0].note = entry.description;
      }
    } else if (entry.id.includes(':fba-delivery-plan-')) {
      // 发货计划演示场景
      const dpLines = products.map((line, index) => ({ id: `${entry.id}:line:${index + 1}`, sku: line.sku, omsVariantId: line.omsVariantId, sellerSku: index === 0 ? 'NW-WEP-BLK-US' : 'NW-TP-BLK-STD', fnsku: index === 0 ? 'X004NWEP01' : 'X004NWTP01', quantity: index === 0 ? 10 : 8 }));
      fba({ type: 'fba_create_delivery_plan', connectionId: SELLER, site: 'US', warehouseId: WAREHOUSE, lines: dpLines, plannedShipDate: new Date(now + 7 * 86400000).toISOString().slice(0, 10), note: entry.description }, 'dp-create');
      const fbaWork = work as import('./fba').FbaSnapshot;
      fbaWork.deliveryPlans![0].number = `RP-20261104-${scenarioCatalog.indexOf(entry) + 101}`;
      if (!entry.id.endsWith('draft')) {
        fba({ type: 'fba_submit_delivery_plan', deliveryPlanId: fbaWork.deliveryPlans![0].id }, 'dp-submit');
      }
      if (entry.id.endsWith('linked')) {
        const dp = fbaWork.deliveryPlans![0];
        fba({ type: 'fba_approve_delivery_plan', deliveryPlanId: dp.id }, 'dp-approve');
        fba({ type: 'fba_create_plan', warehouseId: WAREHOUSE, connectionId: SELLER, site: 'US', lines: dpLines }, 'plan-create');
        const fbaWork2 = work as import('./fba').FbaSnapshot;
        fbaWork2.inboundPlans![0].number = `FBA-20261104-${scenarioCatalog.indexOf(entry) + 101}`;
        const planId = fbaWork2.inboundPlans![0].id;
        fba({ type: 'fba_pack', planId, containers: [{ id: `${entry.id}:box:1`, weightKg: 6, contents: dpLines.map(l => ({ lineId: l.id, quantity: l.quantity })) }] }, 'plan-pack');
        fba({ type: 'fba_generate_placements', planId }, 'plan-placements');
        const planSnap = (work as import('./fba').FbaSnapshot).inboundPlans!.find(p => p.id === planId)!;
        const singlePlacement = planSnap.placements.find(p => p.destinations.length === 1)!;
        fba({ type: 'fba_select_placement', planId, placementId: singlePlacement.id }, 'plan-select');
        const planAfterSelect = (work as import('./fba').FbaSnapshot).inboundPlans!.find(p => p.id === planId)!;
        fba({ type: 'fba_confirm', planId, transport: 'SPD', expectedFeesMinor: fbaFees(planAfterSelect, 'SPD') }, 'plan-confirm');
        work = advanceOmsJobs(work, now + 3000);
        const linkedDp = (work as import('./fba').FbaSnapshot).deliveryPlans!.find(d => d.id === dp.id)!;
        fba({ type: 'fba_link_delivery_plan', deliveryPlanId: linkedDp.id, inboundPlanId: planId }, 'dp-link');
      }
    } else {
      fba({ type: 'fba_create_plan', warehouseId: WAREHOUSE, connectionId: SELLER, site: 'US', lines: products.map((line, index) => ({ id: `${entry.id}:line:${index + 1}`, sku: line.sku, omsVariantId: line.omsVariantId, sellerSku: index === 0 ? 'NW-WEP-BLK-US' : 'NW-TP-BLK-STD', fnsku: index === 0 ? 'X004NWEP01' : 'X004NWTP01', quantity: index === 0 ? 6 : 4 })) }, 'create');
      let plan = work.inboundPlans![0];
      plan.number = `FBA-20261104-${scenarioCatalog.indexOf(entry) + 101}`;
      if (!entry.id.endsWith('draft')) {
        fba({ type: 'fba_pack', planId: plan.id, containers: [{ id: `${entry.id}:carton:1`, weightKg: 5, contents: plan.lines.map(line => ({ lineId: line.id, quantity: line.quantity })) }] }, 'pack');
        fba({ type: 'fba_generate_placements', planId: plan.id }, 'placements');
      }
      if (entry.id.endsWith('placement-selected')) {
        plan = work.inboundPlans![0];
        fba({ type: 'fba_select_placement', planId: plan.id, placementId: plan.placements.find(option => option.destinations.length === 1)!.id }, 'select');
        work.orders[0]?.tags.push(entry.id);
      }
      if (entry.id.endsWith('split')) {
        plan = work.inboundPlans![0];
        fba({ type: 'fba_select_placement', planId: plan.id, placementId: plan.placements.find(option => option.destinations.length === 2)!.id }, 'select');
        plan = work.inboundPlans![0];
        fba({ type: 'fba_confirm', planId: plan.id, transport: 'SPD', expectedFeesMinor: fbaFees(plan, 'SPD') }, 'confirm');
        work.orders[0]?.tags.push(entry.id); if (work.orders[0]) work.orders[0].note = entry.description;
        work = advanceOmsJobs(work, now + 3000);
      }
    }
    // Protect even a colliding derived ID; do not splice a partial graph into existing records.
    const generatedIds = collections.flatMap(key => (work[key] ?? []).map(row => row.id));
    if ([...generatedIds, ...work.commandIds].some(id => existingIds.has(id))) continue;
    for (const key of collections) {
      const additions = work[key];
      if (additions?.length) {
        // Collections are heterogeneous, but each source/target pair always uses the same key.
        (state[key] as { id: string }[] | undefined) ??= [];
        (state[key] as { id: string }[]).push(...additions);
      }
    }
    for (const stock of work.stocks) {
      const original = state.stocks.find(row => row.id === stock.id);
      if (!original) state.stocks.push(stock);
      else if (stock.reserved !== original.reserved) { original.reserved = stock.reserved; original.revision = stock.revision; }
    }
    state.commandIds.push(...work.commandIds);
  }
  state.migratedSources.push(PREFIX);
  assertOmsInvariants(state); assertVendorInvariants(state); assertFbaAddons(state);
  return state;
}
