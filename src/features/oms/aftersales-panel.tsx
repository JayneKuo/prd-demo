'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOms } from './provider';
import { moneyDisplay, moneyInputMinor, moneyStep } from './finance';
import { transactOms } from './repository';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { executeAfterSales, eligibleReturnMinor, type AfterSalesCommand, type AfterSalesSnapshot } from './aftersales';

const field = 'rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm';
const button = 'rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-40';
const labels = { requested: '待审核', authorized: '待质检', rejected: '已拒绝', inspected: '已质检入库' };
export function AftersalesPanel({ returnId }: { returnId?: string }) {
  const { snapshots, ready, reload } = useOms();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState(''); const [quantity, setQuantity] = useState(1); const [reason, setReason] = useState('');
  const options = snapshots.flatMap(state => state.packages.filter(pack => !['internal_transfer', 'vendor_retail', 'vendor_df'].includes(state.orders.find(order => order.id === pack.orderId)?.source ?? '')).flatMap(pack => pack.lines.map(line => ({ state: state as AfterSalesSnapshot, pack, line, remaining: line.quantity - ((state as AfterSalesSnapshot).returns ?? []).filter(item => item.packageId === pack.id && item.status !== 'rejected').flatMap(item => item.lines).filter(item => item.lineId === line.lineId).reduce((sum, item) => sum + item.quantity, 0), key: JSON.stringify([state.merchantId, pack.id, line.lineId]) }))));
  const selected = options.find(option => option.key === selection);
  async function run(state: AfterSalesSnapshot, input: AfterSalesCommand | (() => AfterSalesCommand)) {
    setBusy(true); setError('');
    try { const command = typeof input === 'function' ? input() : input; const id = crypto.randomUUID(); await transactOms(state, current => executeAfterSales(current, command, { id, now: Date.now(), expectedRevision: state.revision, actor: currentSession.id, canWrite: hasCapability(currentSession.role, command.type === 'request_refund' ? 'finance:write' : 'orders:write') })); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败'); } finally { setBusy(false); }
  }
  const cases = snapshots.flatMap(state => ((state as AfterSalesSnapshot).returns ?? []).filter(item => !returnId || item.id === returnId).map(item => ({ state: state as AfterSalesSnapshot, item })));
  return <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="订单售后">
    <h2 className="font-semibold">订单售后{ returnId ? '详情' : '' }</h2>
    <p className="my-2 text-sm text-[var(--muted)]">按已发货商品申请退货，质检后良品回原库存，损坏及待确认商品隔离处理。</p>
    {!ready && <p>加载售后记录…</p>}
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    {!returnId && <form className="my-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); if (selected) void run(selected.state, { type: 'request_return', orderId: selected.pack.orderId, packageId: selected.pack.id, lines: [{ lineId: selected.line.lineId, quantity }], reason }); }}>
      <select aria-label="原包裹商品" className={field} value={selection} onChange={event => setSelection(event.target.value)}><option value="">选择已发货包裹 / 商品</option>{options.map(option => <option key={option.key} value={option.key} disabled={option.remaining <= 0}>{option.state.orders.find(order => order.id === option.pack.orderId)?.number} / {option.pack.number} / {option.state.orders.find(order => order.id === option.pack.orderId)?.lines.find(line => line.id === option.line.lineId)?.sku ?? option.line.lineId} (可退 {option.remaining} / 已发 {option.line.quantity})</option>)}</select>
      <input aria-label="退货数量" className={field} type="number" min={1} max={selected?.remaining} step={1} value={quantity} onChange={event => setQuantity(Number(event.target.value))} />
      <input aria-label="售后原因" className={field} required placeholder="售后原因" value={reason} onChange={event => setReason(event.target.value)} />
      <button className={button} disabled={!selected || selected.remaining <= 0 || busy || !hasCapability(currentSession.role, 'orders:write')}>申请售后</button>
    </form>}
    {ready && !cases.length && <p className="py-3 text-sm text-[var(--muted)]">{returnId ? '当前商家范围未找到该售后单。' : '暂无售后记录；请从已发货包裹发起。'}</p>}
    {cases.map(({ state, item }) => <div key={`${state.merchantId}:${item.id}`} className="my-3 rounded border border-[var(--border)] p-3">
      <div className="flex flex-wrap justify-between gap-2"><Link className="text-[var(--primary)]" href={`/dashboard/returns/${encodeURIComponent(item.id)}`}>{item.id}</Link><span>{labels[item.status]}</span><Link className="text-[var(--primary)]" href={`/dashboard/orders/${encodeURIComponent(item.orderId)}`}>来源订单 {state.orders.find(order => order.id === item.orderId)?.number}</Link></div>
      <p className="my-2 text-sm">原因：{item.reason} · 商家 {state.merchantId}</p>
      {item.lines.map(line => <p key={line.lineId} className="text-sm">{state.orders.find(order => order.id === item.orderId)?.lines.find(source => source.id === line.lineId)?.sku ?? line.lineId} × {line.quantity} · 良品 {line.good} / 损坏 {line.damaged} / 未知 {line.unknown}</p>)}
      {item.status === 'requested' && <div className="mt-2 flex gap-2"><button className={button} disabled={busy || !hasCapability(currentSession.role, 'orders:write')} onClick={() => void run(state, { type: 'authorize_return', returnId: item.id })}>批准退货</button><button className={button} disabled={busy || !hasCapability(currentSession.role, 'orders:write')} onClick={() => { const value = window.prompt('拒绝原因'); if (value?.trim()) void run(state, { type: 'reject_return', returnId: item.id, reason: value }); }}>拒绝</button></div>}
      {item.status === 'authorized' && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(state, { type: 'inspect_return', returnId: item.id, lines: item.lines.map(line => ({ ...line, good: Number(form.get(`${line.lineId}:good`)), damaged: Number(form.get(`${line.lineId}:damaged`)), unknown: Number(form.get(`${line.lineId}:unknown`)) })) }); }}>{item.lines.map(line => <div key={line.lineId}>{(['good', 'damaged', 'unknown'] as const).map((kind, index) => <label key={kind} className="mr-2 inline-flex flex-col text-xs">{['良品', '损坏', '未知'][index]}<input required className={`${field} w-20`} aria-label={`${line.lineId} ${kind}`} name={`${line.lineId}:${kind}`} type="number" min={0} max={line.quantity} step={1} defaultValue={kind === 'unknown' ? line.quantity : 0} /></label>)}</div>)}<button className={button} disabled={busy || !hasCapability(currentSession.role, 'orders:write')}>提交质检并入原库存（一次）</button></form>}
      {item.status === 'inspected' && <RefundForm state={state} item={item} disabled={busy || !hasCapability(currentSession.role, 'finance:write')} onSubmit={amount => void run(state, () => ({ type: 'request_refund', returnId: item.id, amountMinor: moneyInputMinor(amount, state.orders.find(order => order.id === item.orderId)!.currency) }))} />}
      {(state.refunds ?? []).filter(refund => refund.returnId === item.id).map(refund => <p key={refund.id} className="mt-2 text-sm">{moneyDisplay(refund.amountMinor, refund.currency)} · {refund.status === 'pending' ? '退款处理中' : `退款成功`}</p>)}
      {returnId && <ul className="mt-3 text-xs text-[var(--muted)]">{state.events.filter(event => event.entityId === item.id || (state.refunds ?? []).some(refund => refund.returnId === item.id && refund.id === event.entityId)).map(event => <li key={event.id}>{event.at.replace('T', ' ').slice(0, 19)} · {({ request_return: '提交售后申请', authorize_return: '批准退货', reject_return: '拒绝退货', inspect_return: '完成质检入库', request_refund: '发起退款', refund_success: '退款处理完成' } as Record<string, string>)[event.type] ?? '售后记录更新'}</li>)}</ul>}
    </div>)}
  </section>;
}
function RefundForm({ state, item, disabled, onSubmit }: { state: AfterSalesSnapshot; item: NonNullable<AfterSalesSnapshot['returns']>[number]; disabled: boolean; onSubmit: (amount: string) => void }) {
  const currency = state.orders.find(order => order.id === item.orderId)!.currency;
  let remaining: number;
  try { remaining = eligibleReturnMinor(state, item) - (state.refunds ?? []).filter(refund => refund.returnId === item.id).reduce((sum, refund) => sum + refund.amountMinor, 0); }
  catch { return <p className="mt-3 text-sm">实付分摊依据不足，暂不可退款</p>; }
  return <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); onSubmit(String(new FormData(event.currentTarget).get('amount'))); }}>
    <label className="text-sm">退款金额 ({currency}) <input className={field + ' w-28'} name="amount" type="number" min={moneyStep(currency)} max={remaining * moneyStep(currency)} step={moneyStep(currency)} required disabled={disabled || remaining <= 0} /></label>
    <button className={button} disabled={disabled || remaining <= 0}>发起退款</button><span className="text-sm text-[var(--muted)]">剩余上限 {moneyDisplay(remaining, currency)}</span>
  </form>;
}
