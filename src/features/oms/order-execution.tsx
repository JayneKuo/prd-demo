'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { connectionStorageKey, parseConnections, type Connection } from '@/lib/amazon-connections';
import { queryMcfProposal, type McfProposal } from './mcf-proposal';
import { fbaLogicalWarehouses, formatMcfFee, mcfInputLines, prefillMcfQuantities, prepareMcfAllocation } from './order-execution-ui';
import { X } from 'lucide-react';
import { getWarehouseById } from '@/lib/mock-data/warehouses';
import { mockProducts } from '@/lib/mock-data/products';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { useOms } from './provider';
import { availableToAllocate, type OmsCommand } from './commands';
import type { OmsSnapshot, SalesOrder, Stock } from './types';

const inputClass = 'rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px]';
const buttonClass = 'rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50';

export function OrderExecutionActions({ snapshot, order }: { snapshot: OmsSnapshot; order: SalesOrder }) {
  const { executeMany } = useOms();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState(order.note);
  const [reason, setReason] = useState('');
  const [dispatchForms, setDispatchForms] = useState<Record<string, { carrier: string; tracking: string }>>({});
  const [mappingChoices, setMappingChoices] = useState<Record<string, string>>({});
  const [allocation, setAllocation] = useState<Record<string, { stockId: string; quantity: number }>>({});
  const [deliveryMode, setDeliveryMode] = useState<'warehouse' | 'amazon'>('warehouse');
  const [sellerConnections, setSellerConnections] = useState<Connection[]>([]);
  const [sellerId, setSellerId] = useState(order.connectionId ?? '');
  const [service, setService] = useState<'Standard' | 'Expedited'>('Standard');
  const [amazonQuantities, setAmazonQuantities] = useState<Record<string, number>>({});
  const [proposal, setProposal] = useState<McfProposal | null>(null);
  const [switchTask, setSwitchTask] = useState<string | null>(null);
  const operationLock = useRef(false);
  const switchLock = useRef<string | null>(null);
  const prefilledTask = useRef<string | null>(null);
  const canUseFba = order.channelType !== 'AFN' && !['vendor_retail', 'vendor_df', 'internal_transfer'].includes(order.source);
  const [mcfOpen, setMcfOpen] = useState(false);
  const logicalWarehouses = fbaLogicalWarehouses(snapshot, order, sellerConnections);
  const selectedFbaWarehouse = logicalWarehouses.find(warehouse => warehouse.connectionId === sellerId);
  const sourceTask = snapshot.fulfillments.find(task => task.id === switchTask && task.orderId === order.id);
  const switchWaiting = !!switchTask && sourceTask?.status !== 'cancelled';
  const currentSeller = sellerConnections.find(connection => connection.id === sellerId);
  const clearProposal = () => { setProposal(null); setError(''); setMessage(''); };
  const loadSeller = () => parseConnections(localStorage.getItem(connectionStorageKey(snapshot.companyId, order.merchantId))).find(connection => connection.identity === 'seller' && connection.id === sellerId);

  useEffect(() => {
    setDeliveryMode('warehouse'); setSellerId(order.connectionId ?? ''); setService('Standard');
    setAmazonQuantities({}); setAllocation({}); setProposal(null); setSwitchTask(null); setMcfOpen(false);
    switchLock.current = null; prefilledTask.current = null; setError(''); setMessage('');
  }, [snapshot.tenantId, snapshot.companyId, order.merchantId, order.id, order.connectionId]);

  useEffect(() => {
    if (!switchTask || prefilledTask.current === switchTask || sourceTask?.status !== 'cancelled') return;
    try {
      const quantities = prefillMcfQuantities(snapshot, order.id, sourceTask);
      prefilledTask.current = switchTask;
      setAmazonQuantities(quantities); setDeliveryMode('amazon'); setProposal(null);
      setMessage('原自有仓任务已确认撤回；已按最新剩余数量预填，请查询并确认 FBA 配送 方案。');
      if (!Object.values(quantities).some(quantity => quantity > 0)) setError('原任务已撤回，但商品已无剩余可分配数量，不能创建 FBA 配送。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '无法预填转换数量，请检查订单'); }
  }, [snapshot, order.id, switchTask, sourceTask]);

  useEffect(() => {
    if (!proposal) return;
    const validate = () => {
      try { prepareMcfAllocation(snapshot, order.id, currentSeller, amazonQuantities, service, proposal, Date.now()); }
      catch (cause) { setProposal(null); setError(`FBA 配送方案已失效：${cause instanceof Error ? cause.message : '订单或库存已变化，请重新查询'}`); }
    };
    validate();
  }, [snapshot, order.id, currentSeller, amazonQuantities, service, proposal]);
  useEffect(() => {
    const load = () => { try { setSellerConnections(parseConnections(localStorage.getItem(connectionStorageKey(snapshot.companyId, order.merchantId))).filter(connection => connection.identity === 'seller')); } catch { setSellerConnections([]); setProposal(null); setError('无法读取 Seller 连接，请检查账号配置。'); } };
    load(); window.addEventListener('amazon-connections-changed', load); window.addEventListener('storage', load);
    return () => { window.removeEventListener('amazon-connections-changed', load); window.removeEventListener('storage', load); };
  }, [snapshot.companyId, order.merchantId]);
  const canWrite = hasCapability(currentSession.role, 'orders:write');
  const readonly = !canWrite || !!order.migrationBlocked || order.channelType === 'AFN';
  const tasks = snapshot.fulfillments.filter(task => task.orderId === order.id);
  const packages = snapshot.packages.filter(pack => pack.orderId === order.id);
  const issues = snapshot.migrationIssues.filter(issue => !issue.resolved && issue.entityId === order.id);
  const run = async (commands: OmsCommand[], success: string) => {
    if (readonly || operationLock.current) return false;
    operationLock.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      await executeMany(order.merchantId, commands);
      setMessage(success);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，原记录已保留'); return false; }
    finally { operationLock.current = false; setBusy(false); }
  };
  const openMcf = () => {
    if (!canUseFba || readonly || busy || operationLock.current || order.archived) return;
    if (!switchTask) {
      setAmazonQuantities(Object.fromEntries(order.lines.map(line => [line.id, Math.max(0, availableToAllocate(snapshot, order.id, line.id))])));
      setSellerId(order.source === 'Amazon' ? order.connectionId ?? '' : logicalWarehouses.find(warehouse => warehouse.enabled)?.connectionId ?? ''); setService('Standard'); clearProposal();
    }
    setDeliveryMode('amazon'); setMcfOpen(true);
  };
  const queryProposal = () => {
    if (readonly || busy || order.archived || switchWaiting) return;
    clearProposal();
    try {
      const connection = loadSeller();
      if (!connection) throw new Error('请选择订单原始 Seller 账号，并检查连接配置');
      setProposal(queryMcfProposal(snapshot, order.id, connection, mcfInputLines(order, amazonQuantities), service, Date.now()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : '无法查询 FBA 配送 本地方案'); }
  };
  const confirmMcf = async () => {
    if (readonly || busy || order.archived || switchWaiting || !proposal) return;
    try {
      const command = prepareMcfAllocation(snapshot, order.id, loadSeller(), amazonQuantities, service, proposal, Date.now());
      if (!selectedFbaWarehouse?.enabled) throw new Error('请先在仓库设置中创建并绑定可用的 Amazon FBA 配送平台仓');
      command.warehouseId = selectedFbaWarehouse.id;
      if (await run([command], '已生成 OMS 出库单并预占库存；请打开关联出库单，确认后提交 Amazon APP')) {
        setProposal(null); setError(''); setAmazonQuantities({}); setSwitchTask(null); switchLock.current = null; prefilledTask.current = null;
      } else setProposal(null);
    } catch (cause) { setProposal(null); setError(`无法提交 FBA 配送：${cause instanceof Error ? cause.message : '请重新查询方案'}`); }
  };
  const startSwitch = async (taskId: string) => {
    if (readonly || order.archived || !canUseFba || operationLock.current || switchLock.current) return;
    const task = snapshot.fulfillments.find(item => item.id === taskId && item.orderId === order.id);
    if (!task || task.executor !== 'warehouse' || !['allocated', 'submitted', 'picking', 'packed'].includes(task.status)) { setError('原任务当前不可转换；取消、发货或结果未知的任务不能转 FBA 配送。'); return; }
    switchLock.current = taskId;
    setSwitchTask(taskId); setMcfOpen(true); prefilledTask.current = null; setDeliveryMode('amazon'); setAmazonQuantities({}); setAllocation({}); setProposal(null);
    // Deliberately send withdrawal alone. No allocation until its cancelled receipt is observed.
    await run([{ type: 'withdraw', fulfillmentId: taskId }], '已申请原自有仓任务撤回；等待确认后再查询 FBA 配送，不会提前创建或重复预占');
  };
  const eligibleStocks = (sku: string) => snapshot.stocks.filter(stock => stock.pool === 'warehouse' && !snapshot.warehouseRecords?.some(warehouse => warehouse.id === stock.warehouseId && (!warehouse.active || warehouse.kind !== 'local')) && stock.sku === sku && stock.onHand - stock.reserved - stock.unfulfillable > 0);
  const stockLabel = (stock: Stock) => stock.pool === 'fba' ? `Amazon MCF · ${stock.connectionId} / ${stock.site}` : `自有仓 · ${snapshot.warehouseRecords?.find(item => item.id === stock.warehouseId)?.name ?? getWarehouseById(stock.warehouseId)?.name ?? stock.warehouseId}`;
  const generate = async () => {
    if (readonly || busy || order.archived || switchWaiting || deliveryMode !== 'warehouse') return;
    const groups = new Map<string, Extract<OmsCommand, { type: 'allocate' }>>();
    for (const line of order.lines) {
      const selection = allocation[line.id];
      if (!selection || selection.quantity === 0) continue;
      if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 0 || selection.quantity > availableToAllocate(snapshot, order.id, line.id)) { setError(`${line.sku} 分配数量必须为剩余范围内的正整数`); return; }
      const stock = snapshot.stocks.find(item => item.pool === 'warehouse' && item.id === selection.stockId && item.sku === line.sku);
      if (!stock) { setError(`请选择 ${line.sku} 的执行方与库存仓库`); return; }
      const key = JSON.stringify([stock.pool, stock.warehouseId, stock.connectionId, stock.site]);
      const group = groups.get(key) ?? { type: 'allocate', orderId: order.id, executor: 'warehouse', warehouseId: stock.warehouseId, lines: [] };
      group.lines.push({ lineId: line.id, quantity: selection.quantity }); groups.set(key, group);
    }
    if (!groups.size) { setError('请至少选择一行商品及数量'); return; }
    if (await run([...groups.values()], `已生成 ${groups.size} 组履约任务；库存已预占`)) setAllocation({});
  };
  return <>
    <div className="flex flex-wrap items-center gap-2">
      {canUseFba && <button type="button" disabled={readonly || busy || !!order.archived} onClick={openMcf} className={`${buttonClass} border-[var(--primary)] text-[var(--primary)]`}>使用 Amazon FBA 配送</button>}
      <button type="button" disabled={busy} onClick={() => { setNote(order.note); setOpen(true); }} className={buttonClass}>{readonly ? '查看执行记录' : '履约与订单操作'}</button>
    </div>
    {open && !mcfOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="oms-execution-title" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl" onClick={event => event.stopPropagation()}>
        <header className="mb-5 flex items-center justify-between"><div><h2 id="oms-execution-title" className="text-lg font-semibold">订单执行 · {order.number}</h2><p className="mt-1 text-xs text-[var(--muted)]">按商品数量生成履约任务，业务状态与库存以 OMS 记录为准。</p></div><button aria-label="关闭执行窗口" disabled={busy} onClick={() => setOpen(false)} className={buttonClass}><X className="size-4" /></button></header>
        {order.migrationBlocked && <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">历史活跃履约需要修复，当前订单只读。{order.migrationBlocked}。请核实原任务、包裹与库存后修复迁移记录，不可直接清除异常。{issues.map(issue => <p key={issue.id}>{issue.message}</p>)}</div>}
        {order.channelType === 'AFN' && <p className="mb-4 text-sm text-[var(--muted)]">原生 AFN 由 Amazon 平台事件驱动；不创建自有仓或 MCF 任务，不在此手动发货。</p>}
        {!canWrite && <p className="mb-4 text-sm text-[var(--muted)]">当前角色仅可查看订单执行记录。</p>}
        {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
        {message && <p role="status" className="mb-4 text-sm text-[var(--primary)]">{message}</p>}
        {!order.migrationBlocked && order.lines.some(line => !line.mappingSnapshot || !line.omsVariantId) && <section className="mb-5 space-y-3 rounded-xl border border-[var(--border)] p-4"><h3 className="text-sm font-semibold">完善订单商品对应关系</h3><p className="text-xs text-[var(--muted)]">为未识别的渠道商品选择 OMS SKU，保存后即可选择库存与仓库，不需要离开订单。</p>{order.lines.filter(line => !line.mappingSnapshot || !line.omsVariantId).map(line => <div key={line.id} className="flex flex-wrap items-center gap-2"><span className="text-xs">{line.channelSku || line.sku}</span><select aria-label={`${line.id} 关联 OMS SKU`} className={inputClass} value={mappingChoices[line.id] ?? ''} onChange={event => setMappingChoices(current => ({ ...current, [line.id]: event.target.value }))}><option value="">选择 OMS 商品</option>{mockProducts.flatMap(product => product.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.sku} · {product.title}</option>))}</select><button className={buttonClass} disabled={!canWrite || busy || !mappingChoices[line.id]} onClick={() => void run([{ type: 'map_order_line', orderId: order.id, lineId: line.id, variantId: mappingChoices[line.id] }], '商品对应关系已保存，可继续分配库存')}>保存商品对应关系</button></div>)}</section>}
        {switchTask && <section role="status" className="mb-4 rounded-lg border border-amber-300 p-3 text-sm">
          <p>转 FBA 配送来源：{sourceTask?.number ?? switchTask} · 原任务状态：{sourceTask?.status ?? '记录暂不可用，请刷新核实'}</p>
          <p className="mt-1 text-xs">{switchWaiting ? '正在等待原任务确认撤回（cancelled）；此时不查询方案、不创建新履约、不重复占用。撤回失败可在原任务重试申请撤回；未知或已发货状态须先核实。' : '原任务已确认撤回，已按最新剩余数量预填；查询方案并再次确认后才会创建 FBA 配送。'}</p>
          {sourceTask && ['unknown', 'shipped', 'delivered'].includes(sourceTask.status) && <p role="alert" className="mt-2 text-xs text-[var(--danger)]">原任务结果未知或已经发货，不能转换为 FBA 配送；请核实原配送记录，避免重复发货。</p>}
          {!switchWaiting && <button type="button" disabled={busy} className={`${buttonClass} mt-2`} onClick={() => { setSwitchTask(null); switchLock.current = null; prefilledTask.current = null; clearProposal(); }}>结束本次转换</button>}
        </section>}
        <fieldset disabled={readonly || busy || order.archived || switchWaiting} className="mb-6 rounded-xl border border-[var(--border)] p-4 disabled:opacity-60">
          <legend className="px-2 text-sm font-semibold">生成履约单</legend>
          {canUseFba && <div className="mb-4 flex flex-wrap gap-3"><label className="text-sm">履约模式 <select aria-label="履约模式" value={deliveryMode} onChange={event => { if (event.target.value === 'amazon') openMcf(); else { setDeliveryMode('warehouse'); clearProposal(); } }} className={inputClass}><option value="warehouse">自有仓</option><option value="amazon">Amazon FBA 配送</option></select></label></div>}
          {deliveryMode === 'amazon' && canUseFba ? <div className="space-y-3"><p className="text-sm text-[var(--muted)]">Amazon FBA 配送在独立窗口中配置，原订单保留原销售渠道身份。</p><button type="button" className={buttonClass} onClick={openMcf}>打开 Amazon FBA 配送窗口</button></div> : <>
          <p className="mb-3 text-xs text-[var(--muted)]">选择自有仓库存与本次数量；本次各仓库在同一事务提交，任一组失败均不生成或占用。</p>
          <div className="space-y-3">{order.lines.map(line => {
            const remaining = availableToAllocate(snapshot, order.id, line.id);
            const selected = allocation[line.id] ?? { stockId: '', quantity: 0 };
            const stock = snapshot.stocks.find(item => item.id === selected.stockId);
            return <div key={line.id} className="grid items-center gap-2 sm:grid-cols-[1fr_2fr_100px]">
              <label htmlFor={`qty-${line.id}`} className="text-sm">{line.sku}<span className="block text-xs text-[var(--muted)]">剩余可分配 {remaining} / 订购 {line.quantity}</span></label>
              <select aria-label={`${line.sku} 执行方与仓库`} value={selected.stockId} disabled={remaining <= 0 || !line.mappingSnapshot} onChange={event => setAllocation(previous => ({ ...previous, [line.id]: { ...selected, stockId: event.target.value } }))} className={inputClass}><option value="">{line.mappingSnapshot ? '选择执行方 / 仓库' : '商品尚未识别，需先修复映射'}</option>{eligibleStocks(line.sku).map(item => <option key={item.id} value={item.id}>{stockLabel(item)} · 可用 {item.onHand - item.reserved - item.unfulfillable}</option>)}</select>
              <input id={`qty-${line.id}`} type="number" min={0} max={Math.max(0, Math.min(remaining, stock ? stock.onHand - stock.reserved - stock.unfulfillable : remaining))} step={1} value={selected.quantity} disabled={remaining <= 0 || !line.mappingSnapshot} onChange={event => setAllocation(previous => ({ ...previous, [line.id]: { ...selected, quantity: Number(event.target.value) } }))} className={inputClass} />
            </div>;
          })}</div>
          <button type="button" onClick={() => void generate()} className={`${buttonClass} mt-4`}>确认生成并预占库存</button>
          </>}
        </fieldset>
        <section className="mb-6 space-y-3"><h3 className="text-sm font-semibold">履约任务与出库</h3>{tasks.length === 0 && <p className="text-sm text-[var(--muted)]">尚无履约任务</p>}{tasks.map(task => {
          const form = dispatchForms[task.id] ?? { carrier: '', tracking: '' };
          const mcf = task.mcf;
          const canWithdraw = ['allocated', 'submitted', 'picking', 'packed'].includes(task.status);
          return <fieldset key={task.id} disabled={readonly || busy} className="rounded-xl border border-[var(--border)] p-4"><legend className="px-2 text-sm">{task.number} · {task.executor === 'amazon' ? (order.channelType === 'AFN' ? 'Amazon FBA（AFN）' : canUseFba ? 'Amazon FBA 配送' : 'Amazon FBA 配送') : '自有仓'} · {task.status}</legend>
            <p className="mb-2 text-xs text-[var(--muted)]">{task.lines.map(line => `${order.lines.find(item => item.id === line.lineId)?.sku ?? line.lineId} × ${line.quantity}`).join('、')}</p>
            {task.outboundId && <Link href={`/dashboard/outbound/${encodeURIComponent(task.outboundId)}`} className="mr-3 text-sm text-[var(--primary)] hover:underline">查看关联出库单</Link>}
            {task.executor === 'amazon' && mcf && <div className="mb-2 space-y-1 text-xs text-[var(--muted)]"><p>{mcf.proposal.service === 'Standard' ? '标准配送' : '加急配送'} · 估算费用 {formatMcfFee(mcf.proposal)}（本地模拟）</p><p className="break-all">方案引用：{mcf.proposal.id}</p><p className="break-all">配送请求引用：{mcf.request.sellerFulfillmentOrderId}</p></div>}
            {canWithdraw && <button type="button" onClick={() => void run([{ type: 'withdraw', fulfillmentId: task.id }], '已申请撤回；确认完成前保留预占库存')} className={buttonClass}>申请撤回</button>}
            {canUseFba && task.executor === 'warehouse' && canWithdraw && <button type="button" disabled={!!switchTask || !!order.archived} onClick={() => void startSwitch(task.id)} className={`${buttonClass} ml-2`}>撤回并转 FBA 配送</button>}
            {task.id === switchTask && <p className="mt-2 text-xs text-[var(--primary)]">本次转换来源 · {task.status === 'cancelled' ? '已确认撤回，请查询并确认 FBA 配送' : '待撤回确认，尚未创建 FBA 配送'}</p>}
            {task.status === 'withdraw_pending' && <p className="mt-2 text-xs text-[var(--muted)]">撤回处理中，确认完成前不能重新分配或发货。</p>}
            {task.status === 'unknown' && <p role="alert" className="mt-2 text-xs text-[var(--danger)]">外部结果未知，请核实原任务，不能重复生成配送。</p>}
            {task.executor === 'warehouse' && task.status === 'packed' && <div className="mt-3 flex flex-wrap gap-2"><input aria-label={`${task.number} 承运商`} placeholder="承运商" value={form.carrier} onChange={event => setDispatchForms(previous => ({ ...previous, [task.id]: { ...form, carrier: event.target.value } }))} className={inputClass} /><input aria-label={`${task.number} 运单号`} placeholder="运单号" value={form.tracking} onChange={event => setDispatchForms(previous => ({ ...previous, [task.id]: { ...form, tracking: event.target.value } }))} className={inputClass} /><button type="button" onClick={() => void run([{ type: 'dispatch', fulfillmentId: task.id, ...form }], '已出库发货，原预占已转为库存消耗')} className={buttonClass}>确认发货</button></div>}
          </fieldset>;
        })}</section>
        {packages.length > 0 && <section className="mb-6 space-y-2"><h3 className="text-sm font-semibold">原包裹发货回传</h3>{packages.map(pack => <fieldset disabled={readonly || busy} key={pack.id} className="rounded-lg border border-[var(--border)] p-3 text-sm"><span>{pack.number} · {pack.carrier} / {pack.tracking} · {pack.confirmation}</span>{pack.confirmation === 'failed' && <button type="button" className={`${buttonClass} ml-3`} onClick={() => void run([{ type: 'writeback', packageId: pack.id }], '已重试原包裹回传，不创建新的配送')}>重试发货回传</button>}{pack.confirmationError && <p className="mt-1 text-xs text-[var(--danger)]">{pack.confirmationError}</p>}</fieldset>)}</section>}
        <fieldset disabled={readonly || busy} className="mb-5 rounded-xl border border-[var(--border)] p-4"><legend className="px-2 text-sm font-semibold">内部备注</legend><textarea aria-label="内部备注" value={note} onChange={event => setNote(event.target.value)} className={`${inputClass} w-full`} /><button type="button" className={`${buttonClass} mt-2`} onClick={() => void run([{ type: 'note', orderId: order.id, note }], '内部备注已保存')}>保存备注</button></fieldset>
        <fieldset disabled={readonly || busy || order.archived || tasks.some(task => task.status !== 'cancelled')} className="rounded-xl border border-[var(--border)] p-4"><legend className="px-2 text-sm font-semibold">取消订单</legend><p className="mb-2 text-xs text-[var(--muted)]">有效任务须先确认撤回；已发货商品请走售后。</p><input aria-label="取消原因" placeholder="取消原因（必填）" value={reason} onChange={event => setReason(event.target.value)} className={inputClass} /><button type="button" className={`${buttonClass} ml-2 text-[var(--danger)]`} disabled={!reason.trim()} onClick={() => void run([{ type: 'cancel_order', orderId: order.id, reason }], '订单已取消')}>确认取消订单</button></fieldset>
      </section>
    </div>}
    {mcfOpen && canUseFba && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={() => { if (!busy) setMcfOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="oms-mcf-title" aria-busy={busy} className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-7">
          <div><h2 id="oms-mcf-title" className="text-lg font-semibold">使用 Amazon FBA 配送</h2><p className="mt-1 text-xs text-[var(--muted)]">使用所选 FBA 仓库存配送，保留原销售渠道和订单身份。底层执行能力为 MCF。</p></div>
          <button type="button" aria-label="关闭 FBA 配送窗口" disabled={busy} onClick={() => setMcfOpen(false)} className={buttonClass}><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">查询当前为本地估算，不调用 Amazon、不锁库存；确认后创建 OMS 履约与出库单并预占库存。请从出库单提交 APP；真实 Amazon 接口尚未接入。原订单保留原渠道身份，不转为原生 AFN，也不进入 FBA 入库流程。不选择或伪造 Amazon FC。</div>
          {readonly && <p role="alert" className="text-sm text-[var(--danger)]">{!canWrite ? '当前角色仅可查看订单，不能提交 FBA 配送。' : '历史活跃履约需要修复，当前订单只读。'}</p>}
          {order.archived && <p role="alert" className="text-sm text-[var(--danger)]">订单已关闭，不能创建 FBA 配送 配送。</p>}
          {switchTask && <section role="status" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">转换来源：{sourceTask?.number ?? switchTask} · 原任务状态：{sourceTask?.status ?? '记录暂不可用，请刷新核实'}</p>
            <p className="text-xs leading-5">{switchWaiting ? '正在等待原自有仓任务确认撤回（cancelled）；此时不能查询方案、创建新履约或重复预占库存。撤回失败可关闭此窗口后在原任务重试；未知或已发货状态须先核实。' : '原任务已确认撤回，已按该任务商品及最新订单剩余数量预填；查询方案并再次确认后才会创建 FBA 配送。'}</p>
            {sourceTask && ['unknown', 'shipped', 'delivered'].includes(sourceTask.status) && <p role="alert" className="text-xs">原任务结果未知或已经发货，不能转换为 FBA 配送，请核实原配送记录，避免重复发货。</p>}
            {!switchWaiting && <button type="button" disabled={busy} className={buttonClass} onClick={() => { setSwitchTask(null); switchLock.current = null; prefilledTask.current = null; clearProposal(); }}>结束本次转换</button>}
          </section>}
          <section aria-label="原订单摘要" className="rounded-xl border border-[var(--border)] p-4">
            <h3 className="mb-3 text-sm font-semibold">原订单摘要</h3>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-[var(--muted)]">平台订单号</dt><dd className="mt-1 break-all font-medium">{order.sourceId || '—'}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">OMS 订单号</dt><dd className="mt-1 break-all font-medium">{order.number}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">实付金额</dt><dd className="mt-1 font-medium">{order.paidMinor === null ? '未提供' : `${order.currency} ${(order.paidMinor / 100).toFixed(2)}`}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">创建时间</dt><dd className="mt-1">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</dd></div>
            </dl>
          </section>
          <details open className="rounded-xl border border-[var(--border)] p-4">
            <summary className="cursor-pointer text-sm font-semibold">收件地址</summary>
            {order.address ? <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-xs text-[var(--muted)]">收件人</dt><dd className="mt-1">{order.address.name || '缺失'}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">联系电话</dt><dd className="mt-1">{order.address.phone || '缺失'}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">国家 / 地区</dt><dd className="mt-1">{order.address.country || '缺失'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-[var(--muted)]">详细地址</dt><dd className="mt-1 break-words">{[order.address.address1, order.address.city, order.address.province].filter(Boolean).join(', ') || '缺失'}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">邮政编码</dt><dd className="mt-1">{order.address.zip || '缺失'}</dd></div>
            </dl> : <p role="alert" className="mt-3 text-sm text-[var(--danger)]">收件地址缺失，请先补全原订单收件地址；不能查询或提交 FBA 配送。</p>}
          </details>
          <fieldset disabled={readonly || busy || !!order.archived || switchWaiting} className="rounded-xl border border-[var(--border)] p-4 disabled:opacity-60">
            <legend className="px-2 text-sm font-semibold">基础信息</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm"><span className="block">FBA 逻辑仓</span><select aria-label="FBA 逻辑仓" value={selectedFbaWarehouse?.id ?? ''} onChange={event => { const warehouse = logicalWarehouses.find(item => item.id === event.target.value); setSellerId(warehouse?.connectionId ?? ''); clearProposal(); }} className={`${inputClass} w-full`}><option value="">选择原 Seller 同站点 FBA 逻辑仓</option>{logicalWarehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id} disabled={!warehouse.enabled}>{warehouse.name}{!warehouse.enabled ? '（未授权或 MCF 未启用）' : ''}</option>)}</select></label>
              <label className="space-y-2 text-sm"><span className="block">配送服务</span><select aria-label="FBA 配送服务" value={service} onChange={event => { setService(event.target.value as 'Standard' | 'Expedited'); clearProposal(); }} className={`${inputClass} w-full`}><option value="Standard">标准配送 · Standard</option><option value="Expedited">加急配送 · Expedited</option></select></label>
            </div>
            <p className="mt-3 break-all text-xs text-[var(--muted)]">配送 Seller：{currentSeller?.name ?? '未选择'}；配送站点：{selectedFbaWarehouse?.site || '未选择'}。仓库来自 OMS 仓库设置中保存的 APP / MCF / 授权连接 / 市场绑定，不是 Amazon 实体 FC。</p>
            {(!selectedFbaWarehouse || !selectedFbaWarehouse.enabled) && <p role="alert" className="mt-2 text-xs text-[var(--danger)]">尚无可用的仓库履约绑定。请先在“仓库 / 库位”创建外部履约仓，选择已授权的 Amazon MCF 连接及市场。<Link href="/dashboard/warehouses" className="ml-2 underline">配置仓库绑定</Link></p>}
          </fieldset>
          <fieldset disabled={readonly || busy || !!order.archived || switchWaiting} className="min-w-0 rounded-xl border border-[var(--border)] disabled:opacity-60">
            <legend className="ml-4 px-2 text-sm font-semibold">配送商品</legend>
            <p className="px-4 pb-3 pt-2 text-xs text-[var(--muted)]">仅包含原订单商品，默认预填剩余数量。库存为所选逻辑仓可配送库存；同 SKU 多行共用库存，查询和提交时统一校验。</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--muted)]"><tr><th scope="col" className="px-4 py-3 font-medium">商品 / OMS SKU</th><th scope="col" className="px-4 py-3 font-medium">Amazon 发货 SKU</th><th scope="col" className="px-4 py-3 text-right font-medium">FBA 可用库存</th><th scope="col" className="px-4 py-3 text-right font-medium">订单剩余</th><th scope="col" className="px-4 py-3 font-medium">本次数量</th></tr></thead>
              <tbody>{order.lines.map(line => {
                const remaining = availableToAllocate(snapshot, order.id, line.id);
                const stock = selectedFbaWarehouse?.stocks.find(item => item.sku === line.sku);
                const available = stock ? Math.max(0, stock.onHand - stock.reserved - stock.unfulfillable) : 0;
                return <tr key={line.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="max-w-72 px-4 py-4"><p className="break-words font-medium">{line.title || '未提供商品标题'}</p><p className="mt-1 break-all text-xs text-[var(--muted)]">{line.sku || '未识别 OMS SKU'}</p>{(!line.mappingSnapshot || !line.omsVariantId) && <p className="mt-1 text-xs text-[var(--danger)]">请先在订单操作中完善商品对应关系</p>}</td>
                  <td className="max-w-56 break-all px-4 py-4">{(order.source === 'Amazon' ? line.channelSku : currentSeller?.businesses.mcf?.productMappings?.find(mapping => mapping.omsVariantId === line.omsVariantId)?.externalSku) || <span className="text-[var(--danger)]">缺失</span>}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{selectedFbaWarehouse ? available : '—'}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{remaining}<span className="mt-1 block text-xs text-[var(--muted)]">订购 {line.quantity}</span></td>
                  <td className="px-4 py-4"><input aria-label={`${line.sku} FBA 配送数量`} type="number" min={0} max={Math.max(0, Math.min(remaining, available))} step={1} value={amazonQuantities[line.id] ?? 0} disabled={remaining <= 0 || !line.mappingSnapshot || !line.omsVariantId} onChange={event => { setAmazonQuantities(previous => ({ ...previous, [line.id]: Number(event.target.value) })); clearProposal(); }} className={`${inputClass} w-24`} /></td>
                </tr>;
              })}</tbody>
            </table></div>
          </fieldset>
          <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">配送方案预览</h3><button type="button" disabled={readonly || busy || !!order.archived || switchWaiting || !selectedFbaWarehouse?.enabled} onClick={queryProposal} className={buttonClass}>查询 FBA 本地配送方案</button></div>
            {proposal ? <div role="region" aria-label="FBA 配送方案" className="space-y-2 border-t border-[var(--border)] pt-3 text-sm">
              <p>{proposal.service === 'Standard' ? '标准配送 · Standard' : '加急配送 · Expedited'} · 估算费用 <strong>{formatMcfFee(proposal)}</strong></p>
              <p>预计送达：{new Date(proposal.arrivalFrom).toLocaleDateString()} — {new Date(proposal.arrivalTo).toLocaleDateString()}</p>
              <p className="text-xs text-[var(--muted)]">本地估算不设倒计时过期；订单资料或配送内容变化后请重新查询。已创建的待提交出库单不会因等待时间被阻断。</p>
              <p>{proposal.lines.map(line => `${line.externalSku} × ${line.quantity}`).join('、')}</p>
              <p className="break-all text-xs text-[var(--muted)]">本地模拟方案引用：{proposal.id}；非 Amazon 实时报价或送达承诺。</p>
            </div> : <p className="text-xs leading-5 text-[var(--muted)]">请核对收件地址、逻辑仓与配送数量，再查询方案。查询不会预占库存，必须确认提交才创建配送。</p>}
          </section>
        </div>
        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-7">
          {error && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{error}</p>}
          {message && <p role="status" className="mb-3 text-sm text-[var(--primary)]">{message}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--muted)]">{busy ? '正在提交，请勿重复操作或关闭窗口。' : '提交成功后可关闭窗口，在履约与订单操作中查看任务记录。'}</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setMcfOpen(false)} className={buttonClass}>关闭</button><button type="button" disabled={readonly || busy || !!order.archived || switchWaiting || !proposal || !selectedFbaWarehouse?.enabled} onClick={() => void confirmMcf()} className={`${buttonClass} border-[var(--primary)] bg-[var(--primary)] text-white hover:opacity-90`}>{busy ? '提交中…' : '确认方案并生成出库单'}</button></div></div>
        </footer>
      </section>
    </div>}
  </>;
}
