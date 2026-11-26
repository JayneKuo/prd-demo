import type { Connection } from '@/lib/amazon-connections';
import { availableToAllocate, type OmsCommand } from './commands';
import { queryMcfProposal, validateMcfProposal, type McfProposal, type McfService } from './mcf-proposal';
import type { Fulfillment, OmsSnapshot, SalesOrder } from './types';

export function fbaLogicalWarehouses(snapshot: OmsSnapshot, order: SalesOrder, connections: Connection[]) {
  return (snapshot.fulfillmentWarehouses ?? []).filter(binding => binding.app === 'amazon' && binding.capability === 'mcf' && (order.source === 'Amazon' ? binding.connectionId === order.connectionId && binding.site === order.site : (binding.site === 'UK' ? 'GB' : binding.site) === order.address?.country)).map(binding => {
    const connection = connections.find(connection => connection.identity === 'seller' && connection.id === binding.connectionId);
    const stocks = snapshot.stocks.filter(stock => stock.pool === 'fba' && stock.connectionId === binding.connectionId && stock.site === binding.site && stock.tenantId === snapshot.tenantId && stock.companyId === snapshot.companyId && stock.merchantId === snapshot.merchantId);
    return { id: binding.id, connectionId: binding.connectionId, site: binding.site, name: binding.name, enabled: binding.active && !!connection?.authorized && connection.businesses.mcf?.status === 'enabled' && connection.businesses.mcf.site === binding.site, stocks };
  });
}

export function mcfInputLines(order: SalesOrder, quantities: Record<string, number>) {
  return order.lines.map(line => ({ lineId: line.id, quantity: quantities[line.id] ?? 0 })).filter(line => line.quantity !== 0);
}

/** Rechecks both the saved estimate and today's authorization/inputs without reserving anything. */
export function prepareMcfAllocation(snapshot: OmsSnapshot, orderId: string, connection: Connection | undefined, quantities: Record<string, number>, service: McfService, proposal: McfProposal, now: number): Extract<OmsCommand, { type: 'allocate' }> {
  if (!connection) throw new Error('原 Seller 账号不存在或无法读取，请检查连接配置后重新查询');
  if (proposal.orderId !== orderId) throw new Error('订单已改变，请重新查询 MCF 配送方案');
  validateMcfProposal(snapshot, proposal, now);
  const order = snapshot.orders.find(item => item.id === orderId);
  if (!order) throw new Error('订单不存在，请刷新后重新查询');
  const current = queryMcfProposal(snapshot, orderId, connection, mcfInputLines(order, quantities), service, now);
  if (current.connectionId !== proposal.connectionId || current.site !== proposal.site || current.service !== proposal.service || JSON.stringify(current.lines) !== JSON.stringify(proposal.lines)) {
    throw new Error('配送数量、服务或账号已改变，请重新查询 MCF 配送方案');
  }
  return { type: 'allocate', orderId, executor: 'amazon', warehouseId: '', connectionId: proposal.connectionId, site: proposal.site,
    proposal, lines: proposal.lines.map(({ lineId, quantity }) => ({ lineId, quantity })) };
}

/** Only a confirmed withdrawal can supply quantities; never includes the still-reserved task. */
export function prefillMcfQuantities(snapshot: OmsSnapshot, orderId: string, task: Fulfillment): Record<string, number> {
  if (task.orderId !== orderId || task.executor !== 'warehouse' || task.status !== 'cancelled') throw new Error('原自有仓任务尚未确认撤回，不能转 MCF');
  const order = snapshot.orders.find(item => item.id === orderId);
  if (!order || order.archived || order.migrationBlocked) throw new Error('订单已关闭或待修复，不能转 MCF');
  return Object.fromEntries(order.lines.map(line => [line.id, Math.max(0, Math.min(
    task.lines.filter(item => item.lineId === line.id).reduce((sum, item) => sum + item.quantity, 0),
    availableToAllocate(snapshot, orderId, line.id),
  ))]));
}

export function formatMcfFee(proposal: Pick<McfProposal, 'currency' | 'feeMinor'>) {
  // Canonical proposal amounts are minor units even for zero-decimal currencies (e.g. JPY).
  return `${proposal.currency} ${(proposal.feeMinor / 100).toFixed(2)}`;
}
