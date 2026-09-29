'use client';

import React, { useState, useCallback, useReducer, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, ExternalLink, Package, Printer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  returnOrders, returnStatusConfig, returnTypeLabels, returnReasonLabels,
  type ReturnOrder, type ReturnStatus, type ReturnEvent, type InspectionResult,
} from '@/lib/mock-data/return-orders';

// ─── State / Reducer ─────────────────────────────────────────────────────────

type ReturnAction =
  | { type: 'AUTHORIZE'; note?: string }
  | { type: 'REJECT'; reason: string }
  | { type: 'GENERATE_LABEL'; carrier: string }
  | { type: 'UPDATE_TRACKING'; carrier: string; trackingNumber: string; trackingUrl?: string }
  | { type: 'MARK_RECEIVED'; receivedBy: string; note?: string }
  | { type: 'SUBMIT_INSPECTION'; results: { lineItemId: string; result: InspectionResult; note: string }[]; inspector: string }
  | { type: 'PROCESS_REFUND' }
  | { type: 'COMPLETE' }
  | { type: 'CANCEL'; reason: string }
  | { type: 'ADD_NOTE'; content: string };

function makeEvt(title: string, desc: string, type: ReturnEvent['type']): ReturnEvent {
  return {
    id: `re_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    actor: '当前用户',
    actorRole: 'ops_manager',
    title,
    description: desc,
    type,
  };
}

function reducer(state: ReturnOrder, action: ReturnAction): ReturnOrder {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  switch (action.type) {
    case 'AUTHORIZE':
      return { ...state, status: 'authorized', updatedAt: now, events: [makeEvt('退货申请已授权', action.note ?? '审核通过，允许退货退款', 'ops'), ...state.events] };
    case 'REJECT':
      return { ...state, status: 'rejected', rejectReason: action.reason, updatedAt: now, events: [makeEvt('退货申请已拒绝', `原因：${action.reason}`, 'ops'), ...state.events] };
    case 'GENERATE_LABEL':
      return { ...state, status: 'label_generated', returnCarrier: action.carrier, returnLabelUrl: '#', updatedAt: now, events: [makeEvt('退货面单已生成', `${action.carrier} 退货面单已生成并发送至客户邮箱`, 'system'), ...state.events] };
    case 'UPDATE_TRACKING': {
      const url = action.trackingUrl || `https://t.17track.net/zh-cn#nums=${action.trackingNumber}`;
      return { ...state, status: 'in_transit', returnCarrier: action.carrier, returnTrackingNumber: action.trackingNumber, returnTrackingUrl: url, updatedAt: now, events: [makeEvt('退货运单号已录入', `${action.carrier} · ${action.trackingNumber}`, 'logistics'), ...state.events] };
    }
    case 'MARK_RECEIVED':
      return { ...state, status: 'received', receivedAt: now, receivedBy: action.receivedBy, updatedAt: now, events: [makeEvt('仓库已收货', `收货人：${action.receivedBy}${action.note ? ' · ' + action.note : ''}`, 'warehouse'), ...state.events] };
    case 'SUBMIT_INSPECTION': {
      const allPass = action.results.every((r) => r.result === 'resaleable' || r.result === 'partial_ok');
      const newStatus: ReturnStatus = allPass ? 'inspection_passed' : 'inspection_failed';
      return {
        ...state, status: newStatus, inspectedAt: now, inspectedBy: action.inspector, updatedAt: now,
        lineItems: state.lineItems.map((li) => { const r = action.results.find((x) => x.lineItemId === li.lineItemId); return r ? { ...li, inspectionResult: r.result, inspectionNote: r.note } : li; }),
        events: [makeEvt(`质检完成 — ${allPass ? '通过' : '不通过'}`, action.results.map((r) => `${r.result}`).join(' / '), 'warehouse'), ...state.events],
      };
    }
    case 'PROCESS_REFUND': {
      const amt = (state.totalRefundAmount + state.shippingRefundAmount).toFixed(2);
      return { ...state, status: 'refund_processing', updatedAt: now, events: [makeEvt('退款处理中', `退款 ${state.currency === 'GBP' ? '£' : state.currency === 'SGD' ? 'S$' : '$'}${amt} 已提交支付网关`, 'finance'), ...state.events] };
    }
    case 'COMPLETE': {
      const txId = `re_${Date.now().toString(36).toUpperCase()}`;
      return { ...state, status: 'completed', refundedAt: now, refundTransactionId: txId, updatedAt: now, events: [makeEvt('退款已到账', `退款 ID: ${txId}，已退至 ${state.refundMethod}`, 'finance'), ...state.events] };
    }
    case 'CANCEL':
      return { ...state, status: 'cancelled', updatedAt: now, events: [makeEvt('退货单已取消', `原因：${action.reason}`, 'ops'), ...state.events] };
    case 'ADD_NOTE':
      return { ...state, note: action.content, updatedAt: now, events: [makeEvt('内部备注', action.content, 'ops'), ...state.events] };
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
      {copied ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
    </button>
  );
}

function fmt(n: number, currency = 'USD') {
  return `${currency === 'GBP' ? '£' : currency === 'SGD' ? 'S$' : '$'}${Math.abs(n).toFixed(2)}`;
}

function Row({ label, value, mono, cls }: { label: string; value: string; mono?: boolean; cls?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[12px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('font-medium', mono && 'font-mono text-[11px]', cls ?? 'text-[var(--foreground)]')}>{value}</span>
    </div>
  );
}

const inspectionLabels: Record<InspectionResult, { label: string; cls: string }> = {
  resaleable:  { label: '可重新销售', cls: 'text-[var(--success)]' },
  damaged:     { label: '损坏 / 报废', cls: 'text-[var(--danger)]' },
  wrong_item:  { label: '非申请商品', cls: 'text-[var(--danger)]' },
  partial_ok:  { label: '部分可售',   cls: 'text-amber-600' },
};

const evtIcons: Record<string, string> = { system: '⚙️', customer: '👤', warehouse: '📦', logistics: '🚚', finance: '💳', ops: '👩‍💼' };

function getSteps(ret: ReturnOrder) {
  if (ret.returnType === 'refund_only') return [
    { label: '申请提交', done: true },
    { label: '审核授权', done: !['pending', 'rejected'].includes(ret.status) },
    { label: '退款处理', done: ['refund_processing', 'completed'].includes(ret.status) },
    { label: '已完成',   done: ret.status === 'completed' },
  ];
  if (ret.returnType === 'recall') return [
    { label: '召回发起', done: true },
    { label: '承运商召回', done: !!ret.recallStatus && ret.recallStatus !== 'not_requested' && ret.recallStatus !== 'requested' },
    { label: '退回仓库',  done: ['received', 'inspecting', 'inspection_passed', 'inspection_failed', 'refund_processing', 'completed'].includes(ret.status) },
    { label: '质检',      done: ['inspection_passed', 'inspection_failed', 'refund_processing', 'completed'].includes(ret.status) },
    { label: '已完成',    done: ret.status === 'completed' },
  ];
  return [
    { label: '申请提交', done: true },
    { label: '审核授权', done: !['pending', 'rejected'].includes(ret.status) },
    { label: '面单 / 寄回', done: ['label_generated', 'in_transit', 'received', 'inspecting', 'inspection_passed', 'inspection_failed', 'refund_processing', 'completed'].includes(ret.status) },
    { label: '仓库收货', done: ['received', 'inspecting', 'inspection_passed', 'inspection_failed', 'refund_processing', 'completed'].includes(ret.status) },
    { label: '质检',     done: ['inspection_passed', 'inspection_failed', 'refund_processing', 'completed'].includes(ret.status) },
    { label: '退款到账', done: ret.status === 'completed' },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const original = returnOrders.find((r) => r.id === id);
  const [state, dispatch] = useReducer(reducer, original ?? ({} as ReturnOrder));

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toast$ = useCallback((msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2600); }, []);

  // modals
  const [authNote, setAuthNote] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [labelCarrier, setLabelCarrier] = useState('');
  const [showLabel, setShowLabel] = useState(false);
  const [trkCarrier, setTrkCarrier] = useState('');
  const [trkNumber, setTrkNumber] = useState('');
  const [showTrk, setShowTrk] = useState(false);
  const [recvBy, setRecvBy] = useState('');
  const [recvNote, setRecvNote] = useState('');
  const [showRecv, setShowRecv] = useState(false);
  const [inspResults, setInspResults] = useState<Record<string, InspectionResult>>({});
  const [inspNotes, setInspNotes] = useState<Record<string, string>>({});
  const [showInsp, setShowInsp] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);

  if (!original) return <div className="py-20 text-center"><p className="text-[var(--muted)]">退货单未找到</p><Link href="/dashboard/returns" className="mt-3 block text-[var(--primary)]">← 返回</Link></div>;

  const s = state.status;
  const canAuth    = s === 'pending';
  const canReject  = s === 'pending';
  const canLabel   = s === 'authorized' && !['refund_only', 'recall'].includes(state.returnType);
  const canTrk     = ['authorized', 'label_generated'].includes(s) && !['refund_only', 'recall'].includes(state.returnType);
  const canRecv    = s === 'in_transit' || (state.returnType === 'recall' && state.recallStatus === 'success');
  const canInsp    = s === 'received' || s === 'inspecting';
  const canRefund  = s === 'inspection_passed' || (s === 'authorized' && state.returnType === 'refund_only');
  const canDone    = s === 'refund_processing';
  const canCancel  = !['completed', 'cancelled', 'rejected'].includes(s);

  const sc = returnStatusConfig[s] ?? returnStatusConfig.pending;
  const steps = getSteps(state);
  const totalAmt = state.totalRefundAmount + state.shippingRefundAmount;

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* Toast */}
      {toast && (
        <div className={cn('fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-4 py-3 text-[13px] font-medium text-white shadow-xl', toast.ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')}>
          {toast.msg}
        </div>
      )}

      <Link href="/dashboard/returns" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />退货列表
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[20px] font-semibold text-[var(--foreground)]">{state.returnNo}<CopyBtn text={state.returnNo} /></h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.cls)}>
                <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
              </span>
              <span className="rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)]">
                {returnTypeLabels[state.returnType]}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
              <span>原订单：<Link href={`/dashboard/orders/${state.orderId}`} className="text-[var(--primary)] hover:underline">{state.orderNo}</Link></span>
              <span>·</span><span>{state.channel} / {state.merchant}</span>
              <span>·</span><span>{state.customerName}</span>
              <span>·</span><span>{state.createdAt.slice(0, 10)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canAuth   && <button onClick={() => setShowAuth(true)}   className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">审核通过</button>}
            {canReject && <button onClick={() => setShowReject(true)} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50">拒绝申请</button>}
            {canLabel  && <button onClick={() => { setLabelCarrier(''); setShowLabel(true); }} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">生成退货面单</button>}
            {canTrk    && <button onClick={() => { setTrkCarrier(state.returnCarrier ?? ''); setTrkNumber(state.returnTrackingNumber ?? ''); setShowTrk(true); }} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">{state.returnTrackingNumber ? '更新退货运单' : '录入退货运单'}</button>}
            {canRecv   && <button onClick={() => { setRecvBy(''); setRecvNote(''); setShowRecv(true); }} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">标记已收货</button>}
            {canInsp   && <button onClick={() => { const init: Record<string, InspectionResult> = {}; state.lineItems.forEach((l) => { init[l.lineItemId] = 'resaleable'; }); setInspResults(init); setInspNotes({}); setShowInsp(true); }} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">录入质检结果</button>}
            {canRefund && <button onClick={() => setShowRefund(true)} className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">发起退款</button>}
            {canDone   && <button onClick={() => { dispatch({ type: 'COMPLETE' }); toast$('退款已完成'); }} className="h-8 rounded-lg bg-[var(--success)] px-3 text-[13px] font-semibold text-white hover:opacity-90">确认退款到账</button>}
            {state.returnLabelUrl && <button onClick={() => toast$('面单打印任务已发送', true)} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"><Printer className="size-3.5" />打印面单</button>}
            <button onClick={() => { setNoteText(state.note ?? ''); setShowNote(true); }} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">备注</button>
            {canCancel && <button onClick={() => { const r = prompt('取消原因'); if (r) { dispatch({ type: 'CANCEL', reason: r }); toast$('退货单已取消'); } }} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50">取消</button>}
          </div>
        </div>

        {/* 步骤条 */}
        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-1.5">
                  <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px]', step.done ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]')}>
                    {step.done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn('text-[12px] font-medium', step.done ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step.label}</span>
                </div>
                {i < steps.length - 1 && <span className="text-[10px] text-[var(--muted)]">›</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* 两栏 */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* 左：商品 + 物流 + 质检 + 时间线 */}
        <div className="space-y-5">

          {/* 退货商品 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">退货商品明细</h2>
            </div>
            <table className="min-w-full text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-2.5 text-left">商品</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">数量</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">退款金额</th>
                  <th className="whitespace-nowrap px-3 py-2.5">原因</th>
                  <th className="whitespace-nowrap px-3 py-2.5">质检</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {state.lineItems.map((li) => (
                  <tr key={li.id} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[var(--foreground)]">{li.title}</div>
                      <div className="text-[11px] text-[var(--muted)]">{li.variantTitle} · <span className="font-mono">{li.sku}</span></div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{li.quantity} 件</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{fmt(li.refundAmount, li.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{returnReasonLabels[li.reason]}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {li.inspectionResult ? (
                        <div>
                          <span className={cn('text-[12px] font-medium', inspectionLabels[li.inspectionResult].cls)}>{inspectionLabels[li.inspectionResult].label}</span>
                          {li.inspectionNote && <div className="text-[10px] text-[var(--muted)]">{li.inspectionNote}</div>}
                        </div>
                      ) : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] bg-[var(--surface-subtle)]">
                  <td colSpan={2} className="px-5 py-3 text-right text-[12px] font-semibold text-[var(--muted-foreground)]">退款合计</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[15px] font-bold text-[var(--foreground)]">{fmt(totalAmt, state.currency)}</td>
                  <td colSpan={2} className="px-3 py-3 text-[11px] text-[var(--muted)]">{state.refundMethod}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* 逆向物流 */}
          {state.returnType !== 'refund_only' && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
                <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                  {state.returnType === 'recall' ? '召回物流' : '退货物流'}
                </h2>
              </div>
              <div className="px-5 py-4 text-[13px]">
                {state.returnTrackingNumber ? (
                  <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    <Row label="承运商" value={state.returnCarrier ?? '—'} />
                    <Row label="退货运单号" value={state.returnTrackingNumber} mono />
                    <Row label="收货仓库" value={state.returnWarehouseCode ?? '—'} />
                    {state.receivedAt && <Row label="收货时间" value={state.receivedAt} />}
                    {state.receivedBy && <Row label="收货人" value={state.receivedBy} />}
                    {state.returnTrackingUrl && (
                      <div className="sm:col-span-2 pt-1">
                        <a href={state.returnTrackingUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--primary)] hover:underline">
                          查看退货物流追踪 <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Package className="size-8 text-[var(--border)]" />
                    <p className="mt-2 text-[13px] text-[var(--muted)]">
                      {s === 'authorized' ? '已授权，等待生成退货面单' :
                       s === 'label_generated' ? '面单已生成，等待客户寄回' : '等待退货信息'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 时间线 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">处理时间线</h2>
            </div>
            <div className="px-5 py-4">
              <ol className="relative border-l-2 border-[var(--border-subtle)] pl-6 space-y-4">
                {state.events.map((evt) => (
                  <li key={evt.id} className="relative">
                    <span className="absolute -left-[29px] flex size-4 items-center justify-center text-[11px]">{evtIcons[evt.type] ?? '📋'}</span>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-[var(--foreground)]">{evt.title}</span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">{evt.time.slice(5, 16)}</span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">{evt.actor}</span>
                      {evt.actorRole && <span className="ml-1.5 rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[10px] text-[var(--muted-foreground)]">{evt.actorRole}</span>}
                    </div>
                    {evt.description && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{evt.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        {/* 右：基本信息 sidebar */}
        <div className="space-y-4">
          {/* 退款信息 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">退款信息</h3>
            <div className="divide-y divide-[var(--border-subtle)]">
              <Row label="退款金额" value={fmt(state.totalRefundAmount, state.currency)} />
              {state.shippingRefundAmount > 0 && <Row label="运费退款" value={fmt(state.shippingRefundAmount, state.currency)} />}
              <Row label="退款方式" value={state.refundMethod} />
              {state.refundedAt && <Row label="退款时间" value={state.refundedAt} />}
              {state.refundTransactionId && <Row label="退款 ID" value={state.refundTransactionId} mono />}
            </div>
          </section>

          {/* 客户信息 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户</h3>
            <div className="text-[13px] font-medium text-[var(--foreground)]">{state.customerName}</div>
            <div className="mt-0.5 text-[12px] text-[var(--muted)]">{state.customerEmail}</div>
          </section>

          {/* 仓库信息 */}
          {state.returnWarehouseCode && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">收货仓库</h3>
              <div className="text-[13px] font-medium text-[var(--foreground)]">{state.returnWarehouseCode}</div>
              {state.receivedAt && <div className="mt-1 text-[12px] text-[var(--success)]">已于 {state.receivedAt.slice(0, 10)} 收货</div>}
            </section>
          )}

          {/* 内部备注 */}
          {state.note && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">内部备注</h3>
              <p className="text-[12px] text-[var(--foreground)]">{state.note}</p>
            </section>
          )}

          {/* 拒绝原因 */}
          {state.rejectReason && (
            <section className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--danger)]">拒绝原因</h3>
              <p className="text-[12px] text-[var(--danger)]">{state.rejectReason}</p>
            </section>
          )}
        </div>
      </div>

      {/* ═══ 所有 Modal ═══ */}

      {/* 审核通过 */}
      {showAuth && (
        <Modal title="审核退货申请" onClose={() => setShowAuth(false)}>
          <div className="mb-3 rounded-xl bg-[var(--surface-subtle)] p-3 text-[12px] text-[var(--muted)]">
            退款金额：<strong className="text-[var(--foreground)]">{fmt(totalAmt, state.currency)}</strong> · 商品：{state.lineItems.map((l) => `${l.title} ×${l.quantity}`).join(', ')}
          </div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">审核备注（选填）</label>
          <textarea value={authNote} onChange={(e) => setAuthNote(e.target.value)} rows={3} placeholder="填写审核意见..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[12px] outline-none focus:border-[var(--primary)] resize-none" />
          <ModalFooter>
            <button onClick={() => setShowAuth(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button onClick={() => { dispatch({ type: 'AUTHORIZE', note: authNote }); setShowAuth(false); toast$('退货申请已授权'); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90">确认通过</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 拒绝 */}
      {showReject && (
        <Modal title="拒绝退货申请" onClose={() => setShowReject(false)}>
          <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">拒绝原因 <span className="text-[var(--danger)]">*</span></label>
          <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--danger)]">
            <option value="">选择原因</option>
            {['超出退货期限', '商品已使用/损坏（非质量问题）', '不符合退货政策', '凭证不足', '欺诈嫌疑', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ModalFooter>
            <button onClick={() => setShowReject(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button disabled={!rejectReason} onClick={() => { dispatch({ type: 'REJECT', reason: rejectReason }); setShowReject(false); toast$('申请已拒绝'); }} className="h-8 rounded-lg bg-[var(--danger)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">确认拒绝</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 生成面单 */}
      {showLabel && (
        <Modal title="生成退货面单" onClose={() => setShowLabel(false)}>
          <p className="mb-3 text-[12px] text-[var(--muted)]">选择退货承运商，系统将生成退货面单并发送至客户邮箱</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['UPS', 'FedEx', 'USPS', 'Royal Mail', 'DPD', 'Ninja Van'].map((c) => (
              <button key={c} onClick={() => setLabelCarrier(c)} className={cn('rounded-lg border px-3 py-1.5 text-[12px] font-medium', labelCarrier === c ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>{c}</button>
            ))}
          </div>
          <input type="text" value={labelCarrier} onChange={(e) => setLabelCarrier(e.target.value)} placeholder="或手动输入承运商" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
          <ModalFooter>
            <button onClick={() => setShowLabel(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button disabled={!labelCarrier} onClick={() => { dispatch({ type: 'GENERATE_LABEL', carrier: labelCarrier }); setShowLabel(false); toast$('退货面单已生成'); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">生成面单</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 录入运单 */}
      {showTrk && (
        <Modal title="录入退货运单号" onClose={() => setShowTrk(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">承运商 <span className="text-[var(--danger)]">*</span></label>
              <input value={trkCarrier} onChange={(e) => setTrkCarrier(e.target.value)} placeholder="UPS / FedEx / ..." className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">运单号 <span className="text-[var(--danger)]">*</span></label>
              <input value={trkNumber} onChange={(e) => setTrkNumber(e.target.value)} placeholder="退货包裹运单号" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-mono outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <ModalFooter>
            <button onClick={() => setShowTrk(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button disabled={!trkCarrier || !trkNumber} onClick={() => { dispatch({ type: 'UPDATE_TRACKING', carrier: trkCarrier, trackingNumber: trkNumber }); setShowTrk(false); toast$('退货运单已录入'); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">保存</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 标记收货 */}
      {showRecv && (
        <Modal title="标记仓库收货" onClose={() => setShowRecv(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">收货人 <span className="text-[var(--danger)]">*</span></label>
              <input value={recvBy} onChange={(e) => setRecvBy(e.target.value)} placeholder="操作员姓名" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">收货备注（选填）</label>
              <textarea value={recvNote} onChange={(e) => setRecvNote(e.target.value)} rows={2} placeholder="外包装状态、件数等" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[12px] outline-none focus:border-[var(--primary)] resize-none" />
            </div>
          </div>
          <ModalFooter>
            <button onClick={() => setShowRecv(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button disabled={!recvBy} onClick={() => { dispatch({ type: 'MARK_RECEIVED', receivedBy: recvBy, note: recvNote }); setShowRecv(false); toast$('已标记收货，等待质检'); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">确认收货</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 质检 */}
      {showInsp && (
        <Modal title="录入质检结果" onClose={() => setShowInsp(false)}>
          <div className="mb-3 space-y-4">
            {state.lineItems.map((li) => (
              <div key={li.lineItemId} className="rounded-xl border border-[var(--border)] p-3">
                <div className="mb-2 font-medium text-[13px] text-[var(--foreground)]">{li.title} × {li.quantity} 件</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(Object.entries(inspectionLabels) as [InspectionResult, { label: string; cls: string }][]).map(([k, v]) => (
                    <button key={k} onClick={() => setInspResults((p) => ({ ...p, [li.lineItemId]: k }))} className={cn('rounded-lg border px-3 py-1.5 text-[11px] font-medium text-left', inspResults[li.lineItemId] === k ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>{v.label}</button>
                  ))}
                </div>
                <textarea value={inspNotes[li.lineItemId] ?? ''} onChange={(e) => setInspNotes((p) => ({ ...p, [li.lineItemId]: e.target.value }))} rows={2} placeholder="质检备注（损坏描述、库存处理建议等）" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[11px] outline-none focus:border-[var(--primary)] resize-none" />
              </div>
            ))}
          </div>
          <ModalFooter>
            <button onClick={() => setShowInsp(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button
              disabled={state.lineItems.some((li) => !inspResults[li.lineItemId])}
              onClick={() => {
                dispatch({ type: 'SUBMIT_INSPECTION', inspector: '当前用户', results: state.lineItems.map((li) => ({ lineItemId: li.lineItemId, result: inspResults[li.lineItemId] ?? 'resaleable', note: inspNotes[li.lineItemId] ?? '' })) });
                setShowInsp(false);
                toast$('质检结果已录入');
              }}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
              提交质检结果
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* 发起退款确认 */}
      {showRefund && (
        <Modal title="确认发起退款" onClose={() => setShowRefund(false)}>
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4 text-[13px] space-y-2">
            <div className="flex justify-between"><span className="text-[var(--muted)]">退款金额</span><span className="font-bold text-[16px]">{fmt(totalAmt, state.currency)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">退款方式</span><span>{state.refundMethod}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">退款至</span><span>{state.customerEmail}</span></div>
          </div>
          <p className="mt-3 text-[12px] text-[var(--muted)]">确认后将向支付网关提交退款请求，请确认金额无误。</p>
          <ModalFooter>
            <button onClick={() => setShowRefund(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button onClick={() => { dispatch({ type: 'PROCESS_REFUND' }); setShowRefund(false); toast$('退款已提交支付网关'); }} className="h-8 rounded-lg bg-[var(--danger)] px-4 text-[12px] font-semibold text-white hover:opacity-90">确认退款 {fmt(totalAmt, state.currency)}</button>
          </ModalFooter>
        </Modal>
      )}

      {/* 备注 */}
      {showNote && (
        <Modal title="添加内部备注" onClose={() => setShowNote(false)}>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} autoFocus placeholder="内部备注内容..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-none" />
          <ModalFooter>
            <button onClick={() => setShowNote(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button disabled={!noteText.trim()} onClick={() => { dispatch({ type: 'ADD_NOTE', content: noteText }); setShowNote(false); toast$('备注已保存'); }} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40">保存</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

// ─── Modal 骨架组件 ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)]"><X className="size-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}
