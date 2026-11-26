import { mockProducts } from '@/lib/mock-data/products';
import { defaultBusinessConfig } from '@/lib/amazon-connections';
import { queryMcfProposal } from './mcf-proposal';
import { advanceOmsJobs, executeOmsCommand } from './commands';
import type { OmsSnapshot, SalesOrder } from './types';

export const amazonSalesScenarios = [
  { id: 'amz-scene-ready', label: 'MFN · 待分配', description: '选择商家仓或 Amazon 配送，验证建单商品无需重复映射。' },
  { id: 'amz-scene-picking', label: 'MFN · 自有仓待撤回', description: '原仓任务已打包未出库，撤回确认后再分配 Amazon 库存。' },
  { id: 'amz-scene-partial', label: 'MFN · 部分发货', description: '一部分已发货，其余数量仍可继续分配。' },
  { id: 'amz-scene-mapping', label: 'MFN · 待关联商品', description: '在商品明细关联 OMS SKU，保存后选择库存和仓库。' },
  { id: 'amz-scene-stock', label: 'MFN · 数量缺口', description: '订购数量超过现有可用库存，可拆量分配，不允许超卖。' },
  { id: 'amz-scene-writeback', label: 'MCF · 回传失败', description: '包裹已发货，仅重试发货回传，不再次创建配送。' },
  { id: 'amz-scene-address', label: 'MFN · 地址待补', description: '收件地址不完整时不允许创建 Amazon 配送。' }
] as const;
export function ensureAmazonSalesScenarios(current: OmsSnapshot): OmsSnapshot {
  if (current.companyId !== 'company_northwind' || current.merchantId !== 'merchant_us_amazon' || current.migratedSources.includes('amazon-sales-scenarios-v1')) return current;
  let state = structuredClone(current);
  const product = mockProducts[0]; const variant = product.variants[0];
  const stamp = Date.parse('2026-11-04T08:30:00Z');
  // Ensure warehouse stock exists for scenario allocations (SKU may differ from skuInventory entries).
  const envelope = { tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, revision: 1 };
  const warehouseStockId = `stock:wh_lax:${variant.sku}`;
  if (!state.stocks.some(s => s.id === warehouseStockId)) {
    state.stocks.push({ ...envelope, id: warehouseStockId, warehouseId: 'wh_lax', sku: variant.sku, pool: 'warehouse', onHand: 500, reserved: 0, unfulfillable: 0 });
  }
  for (const [index, scene] of amazonSalesScenarios.entries()) {
    if (state.orders.some(order => order.id === scene.id)) continue;
    const source: SalesOrder = { tenantId: state.tenantId, companyId: state.companyId, merchantId: state.merchantId, id: scene.id, revision: 1, number: `SO-AMZ-20261104-${String(index + 1).padStart(3, '0')}`, sourceId: `114-6110401-900000${index + 1}`, source: 'Amazon', connectionId: 'amz-northwind-seller-na', site: 'US', channelType: 'MFN', createdAt: new Date(stamp + index * 60000).toISOString(), currency: 'USD', paidMinor: Math.round(variant.price * 100) * (scene.id === 'amz-scene-stock' ? 1000 : 4), paymentStatus: '已支付', customer: `Amazon Customer ${index + 1}`, address: scene.id === 'amz-scene-address' ? null : { name: `Amazon Customer ${index + 1}`, phone: '+1 206 555 0172', address1: '1201 3rd Avenue', city: 'Seattle', province: 'WA', country: 'US', zip: '98101' }, note: scene.description, tags: ['amazon-scenario', scene.label], lines: [{ id: `${scene.id}:line:1`, channelLineId: `${index + 1}`, channelSku: 'NW-WEP-BLK-US', omsVariantId: scene.id === 'amz-scene-mapping' ? '' : variant.id, sku: variant.sku, title: product.title, quantity: scene.id === 'amz-scene-stock' ? 1000 : 4, cancelled: 0, unit: '件', unitPriceMinor: Math.round(variant.price * 100), ...(scene.id === 'amz-scene-mapping' ? {} : { mappingSnapshot: { channelSku: 'NW-WEP-BLK-US', omsVariantId: variant.id } }) }] };
    state.orders.push(source);
    if (['amz-scene-picking', 'amz-scene-partial', 'amz-scene-writeback'].includes(scene.id)) {
      // Construct only the new scene's effects; never advance other orders or reset stocks.
      const id = `scene:${scene.id}`;
      const lines = [{ lineId: source.lines[0].id, quantity: scene.id === 'amz-scene-partial' ? 2 : 4 }];
      const proposal = scene.id === 'amz-scene-writeback' ? queryMcfProposal(state, source.id, { id: source.connectionId!, name: 'Local scenario Seller', accountId: 'local-scenario', region: 'NA', identity: 'seller', authorized: true, businesses: { mcf: { ...defaultBusinessConfig(), status: 'enabled', site: 'US' } } }, lines, 'Standard', stamp) : undefined;
      state = executeOmsCommand(state, { type: 'allocate', orderId: source.id, executor: scene.id === 'amz-scene-writeback' ? 'amazon' : 'warehouse', warehouseId: scene.id === 'amz-scene-writeback' ? '' : 'wh_lax', connectionId: source.connectionId, site: 'US', lines, proposal }, { id, now: stamp, actor: 'fixture-import', canWrite: true });
      const task = state.fulfillments.find(task => task.id === `ful:${id}`)!;
      const jobs = state.jobs.filter(job => job.targetId === task.id); state.jobs = state.jobs.filter(job => job.targetId !== task.id);
      let isolated = { ...state, jobs };
      isolated = advanceOmsJobs(isolated, stamp + 10000);
      state = { ...isolated, jobs: [...state.jobs, ...isolated.jobs] };
      if (scene.id === 'amz-scene-partial') state = executeOmsCommand(state, { type: 'dispatch', fulfillmentId: task.id, carrier: 'UPS', tracking: `1Z-SCENE-${index}` }, { id: `${id}:ship`, now: stamp + 11000, actor: 'fixture-import', canWrite: true });
      if (scene.id === 'amz-scene-writeback') {
        const pack = state.packages.find(pack => pack.fulfillmentId === task.id)!;
        pack.confirmation = 'failed'; pack.confirmationError = '发货确认服务暂不可用，请重试原包裹回传。';
      }
      // Scenarios start at documented stable states; no latent provider job changes the scene before inspection.
      const packageIds = state.packages.filter(pack => pack.orderId === source.id).map(pack => pack.id);
      state.jobs = state.jobs.filter(job => job.targetId !== task.id && !packageIds.includes(job.targetId));
    }
  }
  state.migratedSources.push('amazon-sales-scenarios-v1');
  return state;
}
