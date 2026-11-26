import { connectionStorageKey, parseConnections } from '@/lib/amazon-connections';
import type { OmsCommand } from './commands';
import { assertCanDispatchFbaSource } from './fba';
import { queryMcfProposal, validateMcfProposal } from './mcf-proposal';
import type { OmsSnapshot } from './types';

export function checkConnectionCommand(state: OmsSnapshot, command: OmsCommand) {
  if (command.type === 'save_warehouse') {
    if (command.warehouse.kind !== 'platform') return;
    const binding = command.warehouse.binding;
    if (!binding) throw new Error('平台仓须关联 APP 供应商及其仓库');
    const connection = parseConnections(localStorage.getItem(connectionStorageKey(state.companyId, state.merchantId))).find(item => item.id === binding.connectionId);
    if (binding.appId !== 'amazon' || binding.capability !== 'mcf' || !connection?.authorized || connection.identity !== 'seller' || connection.businesses.mcf?.status !== 'enabled' || connection.businesses.mcf.site !== binding.site) throw new Error('APP 供应商连接无效或尚未提供可用的仓库履约能力');
    return;
  }
  if (command.type === 'bind_mcf_warehouse' || command.type === 'submit_mcf_outbound') {
    const outbound = command.type === 'submit_mcf_outbound' ? state.outbounds.find(item => item.id === command.outboundId) : undefined;
    const binding = command.type === 'bind_mcf_warehouse' ? command.warehouse : state.fulfillmentWarehouses?.find(item => item.id === outbound?.warehouseId);
    if (!binding) throw new Error('出库仓尚未绑定 Amazon MCF 履约服务');
    const connection = parseConnections(localStorage.getItem(connectionStorageKey(state.companyId, state.merchantId))).find(item => item.id === binding.connectionId);
    if (!connection?.authorized || connection.identity !== 'seller' || connection.businesses.mcf?.status !== 'enabled' || connection.businesses.mcf.site !== binding.site) throw new Error('请选择已授权且已启用对应市场 MCF 的 Seller 连接');
    if (command.type === 'submit_mcf_outbound' && connection.businesses.mcf.syncSettings && !connection.businesses.mcf.syncSettings.orderSources.includes(state.orders.find(order => order.id === outbound?.orderId)?.source === 'Amazon' ? 'amazon' : 'other')) throw new Error('FBA 配送未开放此订单来源');
    return;
  }
  if (command.type === 'shipment_upsert') return;
  if (command.type === 'dispatch') {
    const task = state.fulfillments.find(item => item.id === command.fulfillmentId);
    if (state.orders.find(order => order.id === task?.orderId)?.source === 'internal_transfer') assertCanDispatchFbaSource(state, command.fulfillmentId);
    return;
  }
  if (command.type !== 'allocate' && command.type !== 'writeback') return;
  const source = command.type === 'allocate' ? state.orders.find(order => order.id === command.orderId) : state.orders.find(order => order.id === state.packages.find(pack => pack.id === command.packageId)?.orderId);
  if (!source) throw new Error('来源订单不存在');
  const id = command.type === 'allocate' && command.executor === 'amazon' ? command.connectionId : source.connectionId;
  if (!id) {
    if (command.type === 'allocate' && command.executor === 'amazon') throw new Error('请选择可用 Seller 配送账号');
    return;
  }
  const connection = parseConnections(localStorage.getItem(connectionStorageKey(state.companyId, state.merchantId))).find(item => item.id === id);
  if (!connection?.authorized) throw new Error('账号授权失效，请先恢复连接');
  if (command.type === 'writeback') { if (connection.businesses.sales?.syncSettings?.shipmentWriteback === false) throw new Error('发货回传已关闭，请先恢复配置'); return; }
  const business = command.executor === 'amazon' ? connection.businesses.mcf : connection.businesses.sales;
  if (business?.status !== 'enabled') throw new Error('所需业务未启用或已暂停');
  if (command.executor === 'amazon') {
    if (connection.identity !== 'seller') throw new Error('MCF 配送需要 Seller 账号');
    const sites: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };
    if (!command.site || !sites[connection.region]?.includes(command.site)) throw new Error('MCF 配送站点与账号区域不匹配');
    if (!command.proposal) throw new Error('请先查询并确认 Amazon 配送方案');
    if (command.proposal.orderId !== command.orderId || command.proposal.connectionId !== command.connectionId || command.proposal.site !== command.site || JSON.stringify(command.proposal.lines.map(line => ({ lineId: line.lineId, quantity: line.quantity }))) !== JSON.stringify(command.lines)) throw new Error('配送方案与本次商品数量不一致，请重新查询');
    validateMcfProposal(state, command.proposal, Date.now());
    if (source.source !== 'Amazon') {
      const current = queryMcfProposal(state, source.id, connection, command.lines, command.proposal.service, Date.now());
      if (JSON.stringify(current.lines) !== JSON.stringify(command.proposal.lines)) throw new Error('Amazon 发货商品映射已变化，请重新查询方案');
    }
    if (!source.address || !source.address.address1 || !source.address.zip || !source.address.country) throw new Error('配送需要完整收件地址');
    if (source.source === 'Amazon' && (source.connectionId !== connection.id || source.site !== command.site)) throw new Error('Amazon 订单须使用同一账号和站点的配送能力');
    if (connection.businesses.mcf?.site !== command.site) throw new Error('MCF 站点不匹配');
    if (connection.businesses.mcf?.syncSettings?.orderSources && !connection.businesses.mcf.syncSettings.orderSources.includes(source.source === 'Amazon' ? 'amazon' : 'other')) throw new Error('MCF 未开放此订单来源');
  }
}
