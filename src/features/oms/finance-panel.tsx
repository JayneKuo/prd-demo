'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOms } from './provider';
import { transactOms } from './repository';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { executeFinance, financeSources, moneyDisplay, moneyInputMinor, moneyStep, type FinanceCommand, type FinanceSnapshot, type FinanceSource } from './finance';

const button = 'rounded border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-40';
const field = 'rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm';
export function FinancePanel({ reconciliation = false }: { reconciliation?: boolean }) {
  const { snapshots, ready, reload } = useOms();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const canWrite = hasCapability(currentSession.role, 'finance:write');
  async function run(state: FinanceSnapshot, build: () => FinanceCommand) {
    setBusy(true); setError('');
    try { const command = build(); const id = crypto.randomUUID(); await transactOms(state, current => executeFinance(current, command, { id, now: Date.now(), expectedRevision: state.revision, actor: currentSession.id, canWrite })); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败'); } finally { setBusy(false); }
  }
  return <section aria-label="订单财务" className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
    <h2 className="font-semibold">订单{reconciliation ? '结算 / 银行核销' : '应收 / 退款 / 费用'}</h2>
    <p className="my-2 text-sm text-[var(--muted)]">按订单实付、成功退款及费用建立结算；选择同币种来源，与报表净额核对后分配银行收款。</p>
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    {!ready && <p>加载财务记录…</p>}
    {snapshots.map(raw => {
      const state = raw as FinanceSnapshot; const sources = financeSources(state); const used = new Set((state.settlements ?? []).flatMap(item => item.sourceIds));
      const evidence = state.events.filter(event => event.type === 'bank_evidence').map(event => event.payload as { evidenceId: string; currency: string; amountMinor: number; reference: string });
      return <div key={state.merchantId} className="mt-4 border-t border-[var(--border)] pt-3"><h3 className="font-medium">商家 {state.merchantId}</h3>
        {!sources.length && <p className="my-2 text-sm text-[var(--muted)]">暂无已确认实付的订单。</p>}
        <div className="my-2 max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">来源单据</th><th>类型</th><th>金额</th><th>状态</th></tr></thead><tbody>{sources.map(source => <tr key={source.id} className="border-t border-[var(--border)]"><td className="py-2"><Link className="text-[var(--primary)]" href={`/dashboard/${source.kind === 'vendor_invoice' ? 'vendor-orders' : 'orders'}/${encodeURIComponent(source.orderId)}`}>{source.id}</Link></td><td>{{ payment: '订单实付', refund: '成功退款', fee: '费用', vendor_invoice: 'Vendor 发票 / ERS' }[source.kind]}</td><td>{moneyDisplay(source.amountMinor, source.currency)}</td><td>{used.has(source.id) ? '已入结算' : '待结算'}</td></tr>)}</tbody></table></div>
        {!reconciliation && <form className="my-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(state, () => ({ type: 'record_fee', orderId: String(form.get('order')), amountMinor: moneyInputMinor(String(form.get('amount')), state.orders.find(order => order.id === form.get('order'))!.currency), externalId: String(form.get('external')), reason: String(form.get('reason')) })); }}>
          <select name="order" aria-label="费用来源订单" required className={field}><option value="">费用来源订单 / 币种</option>{state.orders.filter(order => !['internal_transfer', 'vendor_retail', 'vendor_df'].includes(order.source)).map(order => <option key={order.id} value={order.id}>{order.number} · {order.currency}</option>)}</select><input className={field} name="external" required placeholder="费用唯一来源编号" aria-label="费用来源编号" /><input className={`${field} w-32`} name="amount" required min="0.001" step="any" type="number" placeholder="金额（订单币种）" aria-label="费用金额" /><input className={field} name="reason" required placeholder="费用原因" aria-label="费用原因" /><button className={button} disabled={busy || !canWrite}>记录费用</button>
        </form>}
        <SettlementForm sources={sources.filter(source => !used.has(source.id))} busy={busy || !canWrite} onSubmit={(sourceIds, currency, reported) => void run(state, () => ({ type: 'create_settlement', sourceIds, currency, reportedMinor: moneyInputMinor(reported, currency) }))} />
        {reconciliation && <form className="my-3 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const currency = String(form.get('currency')).trim().toUpperCase(); void run(state, () => ({ type: 'record_bank_evidence', evidenceId: String(form.get('id')), currency, amountMinor: moneyInputMinor(String(form.get('amount')), currency), reference: String(form.get('reference')) })); }}><input className={field} name="id" required placeholder="银行证据唯一编号" aria-label="银行证据编号" /><input className={`${field} w-24`} name="currency" required placeholder="USD" aria-label="银行证据币种" /><input className={field} name="amount" required type="number" min="0.001" step="any" placeholder="金额（所填币种）" aria-label="银行证据金额" /><input className={field} name="reference" required placeholder="证据参考 / 流水号" aria-label="银行证据参考" /><button className={button} disabled={busy || !canWrite}>登记银行证据</button></form>}
        {(state.settlements ?? []).map(item => <div key={item.id} className="my-3 rounded border border-[var(--border)] p-3 text-sm" data-settlement-id={item.id}><p>{item.id} · 来源净额 {moneyDisplay(item.expectedMinor, item.currency)} · 报表净额 {moneyDisplay(item.reportedMinor, item.currency)} · 已分配银行 {moneyDisplay(item.bankAllocations.reduce((sum, entry) => sum + entry.amountMinor, 0), item.currency)} · {{ difference: '待处理差异', matched: '金额匹配待银行', partially_received: '部分核销', received: '已核销' }[item.status]}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">结算来源：{item.sourceIds.join('、')}</p>
          {item.status === 'difference' && <button className={`${button} mt-2`} disabled={busy || !canWrite} onClick={() => { const reason = window.prompt('差异调整原因（须由另一人员审批）'); if (reason?.trim()) void run(state, () => ({ type: 'request_adjustment', settlementId: item.id, amountMinor: item.reportedMinor - item.expectedMinor - (state.claims ?? []).filter(claim => claim.settlementId === item.id && claim.status === 'approved').reduce((sum, claim) => sum + claim.amountMinor, 0), reason })); }}>提出差异调整</button>}
          {reconciliation && item.status !== 'difference' && item.status !== 'received' && <form className="mt-2 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(state, () => ({ type: 'allocate_bank', settlementId: item.id, evidenceId: String(form.get('evidence')), amountMinor: moneyInputMinor(String(form.get('amount')), item.currency) })); }}><select className={field} name="evidence" required aria-label="选择银行证据"><option value="">选择同币种银行证据</option>{evidence.filter(entry => entry.currency === item.currency).map(entry => { const remaining = entry.amountMinor - (state.settlements ?? []).flatMap(settlement => settlement.bankAllocations).filter(allocation => allocation.evidenceId === entry.evidenceId).reduce((sum, allocation) => sum + allocation.amountMinor, 0); return <option disabled={remaining <= 0} key={entry.evidenceId} value={entry.evidenceId}>{entry.evidenceId} · 可用 {moneyDisplay(remaining, entry.currency)} · {entry.reference}</option>; })}</select><input className={field} name="amount" required type="number" min={moneyStep(item.currency)} step={moneyStep(item.currency)} aria-label="部分核销金额" placeholder={`本次分配金额（${item.currency}）`} /><button className={button} disabled={busy || !canWrite}>分配银行证据（可部分）</button></form>}
          {(state.claims ?? []).filter(claim => claim.settlementId === item.id).map(claim => <p key={claim.id} className="mt-2">调整 {moneyDisplay(claim.amountMinor, claim.currency)} · {claim.reason} · {claim.status === 'approved' ? `已批准 ${claim.approvedBy}` : `待另一人员审批（发起 ${claim.requestedBy}）`} {claim.status === 'pending' && <button className={button} disabled={busy || !canWrite || claim.requestedBy === currentSession.id} onClick={() => void run(state, () => ({ type: 'approve_adjustment', claimId: claim.id }))}>批准调整</button>}</p>)}
        </div>)}
        <p className="my-2 text-xs text-[var(--muted)]">Vendor 发票 / ERS：按 PO 已验收收货创建单据，同一收货不可重复开具；当前 {(state.vendorFinanceReceipts ?? []).length} 笔可溯源收货。</p>
        {(state.vendorFinanceReceipts ?? []).map(receipt => { const invoice = state.invoices?.find(invoice => invoice.receiptId === receipt.id); return <div key={receipt.id} className="my-2 text-sm"><Link className="text-[var(--primary)]" href={`/dashboard/vendor-orders/${encodeURIComponent(receipt.purchaseOrderId)}`}>{receipt.purchaseOrderId}</Link> · 收货 {receipt.id} · {moneyDisplay(receipt.eligibleMinor, receipt.currency)} {invoice ? `· ${invoice.documentKind.toUpperCase()} ${invoice.documentNumber}` : <form className="mt-2 inline-flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(state, () => ({ type: 'create_vendor_document', receiptId: receipt.id, documentKind: String(form.get('kind')) as 'invoice' | 'ers', documentNumber: String(form.get('number')), amountMinor: receipt.eligibleMinor, currency: receipt.currency })); }}><select className={field} name="kind" aria-label="Vendor 单据类型"><option value="invoice">Invoice</option><option value="ers">ERS</option></select><input className={field} name="number" required aria-label="Vendor 单据编号" placeholder="单据编号" /><button className={button} disabled={busy || !canWrite}>创建单据</button></form>}</div>; })}
      </div>;
    })}
  </section>;
}

function SettlementForm({ sources, busy, onSubmit }: { sources: FinanceSource[]; busy: boolean; onSubmit: (ids: string[], currency: string, reported: string) => void }) {
  const [currency, setCurrency] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  const currencies = [...new Set(sources.map(source => source.currency))];
  const choices = sources.filter(source => source.currency === currency);
  const ids = selected.filter(id => choices.some(source => source.id === id));
  const net = choices.filter(source => ids.includes(source.id)).reduce((sum, source) => sum + source.amountMinor, 0);
  return <form className="my-3 space-y-2 rounded border border-[var(--border)] p-3" onSubmit={event => { event.preventDefault(); onSubmit(ids, currency, String(new FormData(event.currentTarget).get('reported'))); }}>
    <div className="flex flex-wrap gap-2"><select className={field} value={currency} onChange={event => { setCurrency(event.target.value); setSelected([]); }} aria-label="结算币种" required><option value="">选择待结算币种</option>{currencies.map(value => <option key={value}>{value}</option>)}</select><input className={field} name="reported" type="number" step={currency ? moneyStep(currency) : 'any'} required placeholder="净额（所选币种）" aria-label="平台报表净额" /><button className={button} disabled={busy || !ids.length}>按所选来源建立结算</button></div>
    {currency && <fieldset className="max-h-40 space-y-1 overflow-auto"><legend className="mb-1 text-sm">选择结算来源 · 已选 {ids.length} 笔 · 净额 {moneyDisplay(net, currency)}</legend>{choices.map(source => <label key={source.id} className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={`结算来源 ${source.id}`} checked={ids.includes(source.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, source.id] : previous.filter(id => id !== source.id))} />{source.id} · {moneyDisplay(source.amountMinor, source.currency)}</label>)}</fieldset>}
  </form>;
}
