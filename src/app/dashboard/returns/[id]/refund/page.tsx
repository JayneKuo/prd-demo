'use client';

import React, { use, useReducer, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Check, ChevronRight, Copy, Download,
  ExternalLink, Package, Plus, RotateCcw, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentSession } from '@/lib/session-context';
import {
  refundDocuments, returnOrders, qcOrders,
  refundStatusConfig, qcStatusConfig, qcStaffList,
  getQCByReturnId,
  type RefundDocument, type PaymentTransaction,
} from '@/lib/mock-data/return-orders';

// ─── State Machine ────────────────────────────────────────────────────────────

type RefundAction =
  | { type: 'APPROVE'; approver: string; note?: string }
  | { type: 'ADD_TRANSACTION'; tx: Omit<PaymentTransaction, 'id' | 'txNo' | 'initiatedAt'> }
  | { type: 'MARK_SUCCESS'; txId: string; gatewayTxId: string; completedAt?: string }
  | { type: 'MARK_FAILED'; txId: string; reason: string }
  | { type: 'RETRY_PAYMENT'; txId: string }
  | { type: 'CANCEL_TRANSACTION'; txId: string }
  | { type: 'VOID'; reason: string };

function recalcStatus(state: RefundDocument): RefundDocument['status'] {
  if (state.status === 'void' || state.status === 'draft') return state.status;
  if (state.status === 'pending_approval' || state.status === 'approved') return state.status;
  const paidAmt = state.transactions.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
  if (paidAmt >= state.netRefundAmount) return 'paid';
  if (paidAmt > 0) return 'partial_paid';
  if (state.transactions.some((t) => t.status === 'processing')) return 'processing';
  return 'approved';
}

function reducer(state: RefundDocument, action: RefundAction): RefundDocument {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  switch (action.type) {
    case 'APPROVE':
      return { ...state, status: 'approved', approvedAmount: state.requestedAmount,
        approvedAt: now, approvedBy: action.approver, updatedAt: now };

    case 'ADD_TRANSACTION': {
      const txNo = `TX-${now.replace(/[- :]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const newTx: PaymentTransaction = { ...action.tx, id: `tx_${Date.now()}`, txNo, initiatedAt: now };
      const next = { ...state, transactions: [...state.transactions, newTx], updatedAt: now };
      const paid = next.transactions.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
      return { ...next, paidAmount: paid, status: recalcStatus({ ...next, paidAmount: paid }) };
    }

    case 'MARK_SUCCESS': {
      const txs = state.transactions.map((tx) =>
        tx.id === action.txId
          ? { ...tx, status: 'success' as const, gatewayTxId: action.gatewayTxId, completedAt: action.completedAt ?? now }
          : tx);
      const paid = txs.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
      return { ...state, transactions: txs, paidAmount: paid, status: recalcStatus({ ...state, transactions: txs, paidAmount: paid }), updatedAt: now };
    }

    case 'MARK_FAILED': {
      const txs = state.transactions.map((tx) =>
        tx.id === action.txId ? { ...tx, status: 'failed' as const, failureReason: action.reason } : tx);
      const paid = txs.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
      return { ...state, transactions: txs, paidAmount: paid, status: recalcStatus({ ...state, transactions: txs, paidAmount: paid }), updatedAt: now };
    }

    case 'RETRY_PAYMENT': {
      const txs = state.transactions.map((tx) =>
        tx.id === action.txId ? { ...tx, status: 'processing' as const, failureReason: undefined } : tx);
      return { ...state, transactions: txs, status: 'processing', updatedAt: now };
    }

    case 'CANCEL_TRANSACTION': {
      const txs = state.transactions.map((tx) =>
        tx.id === action.txId ? { ...tx, status: 'cancelled' as const } : tx);
      const paid = txs.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
      return { ...state, transactions: txs, paidAmount: paid, status: recalcStatus({ ...state, transactions: txs, paidAmount: paid }), updatedAt: now };
    }

    case 'VOID':
      return { ...state, status: 'void', updatedAt: now };

    default: return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return `${{ GBP: '£', SGD: 'S$', USD: '$' }[currency] ?? '$'}${Math.abs(n).toFixed(2)}`;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="ml-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
      {ok ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
    </button>
  );
}

function InfoRow({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 text-[12px]">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className={cn('text-right font-medium text-[var(--foreground)]', cls)}>{value}</span>
    </div>
  );
}

const methodLabels: Record<PaymentTransaction['method'], string> = {
  original_payment: '原路返回',
  bank_transfer:    '银行转账',
  store_credit:     '商店积分',
  credit_memo:      '信用票据',
  check:            '支票',
};

const txStatusConfig: Record<PaymentTransaction['status'], { label: string; cls: string; dot: string }> = {
  pending:    { label: '待处理', cls: 'bg-amber-50 text-amber-700 ring-amber-200',   dot: 'bg-amber-400' },
  processing: { label: '处理中', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  success:    { label: '已到账', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  failed:     { label: '失败',   cls: 'bg-red-50 text-[var(--danger)] ring-red-200',  dot: 'bg-red-500' },
  cancelled:  { label: '已取消', cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const inputCls = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-none';
const btnPrimary   = 'h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40';
const btnSecondary = 'h-9 rounded-xl border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]';
const btnSuccess   = 'h-9 rounded-xl bg-[var(--success)] px-5 text-[13px] font-semibold text-white hover:opacity-90';
const btnDanger    = 'h-9 rounded-xl border border-[var(--danger)] px-4 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50';

// ─── Inner Page ───────────────────────────────────────────────────────────────

function RefundPageInner({ returnId }: { returnId: string }) {
  const searchParams = useSearchParams();
  const fromList = searchParams.get('from') === 'refunds-list';
  const backHref  = fromList ? '/dashboard/refunds' : `/dashboard/returns/${returnId}`;
  const backLabel = fromList ? '退款管理' : '退货单详情';

  const original    = refundDocuments.find((r) => r.returnOrderId === returnId);
  const returnOrder = returnOrders.find((r) => r.id === returnId);
  const qcOrder     = getQCByReturnId(returnId);
  const [state, dispatch] = useReducer(reducer, original ?? ({} as RefundDocument));

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toast$ = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); };

  // Modal states
  const [approver, setApprover]       = useState(currentSession.name);
  const [approveNote, setApproveNote] = useState('');
  const [showApprove, setShowApprove] = useState(false);

  const [txMethod, setTxMethod]       = useState<PaymentTransaction['method']>('original_payment');
  const [txAmount, setTxAmount]       = useState('');
  const [txBank, setTxBank]           = useState('');
  const [txAccount, setTxAccount]     = useState('');
  const [txNote, setTxNote]           = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const [failTxId, setFailTxId]       = useState('');
  const [failReason, setFailReason]   = useState('');
  const [showFail, setShowFail]       = useState(false);

  const [voidReason, setVoidReason]   = useState('');
  const [showVoid, setShowVoid]       = useState(false);

  if (!original) return (
    <div className="mx-auto max-w-[1440px] pt-5">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />{backLabel}
      </Link>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <Package className="mx-auto size-10 text-[var(--border)]" />
        <p className="mt-3 text-[14px] font-medium">退款单尚未生成</p>
        <p className="mt-2 max-w-xs mx-auto text-[12px] text-[var(--muted)]">质检完成并入库后，根据质检结论生成退款单，确定退款金额和扣减项，再发起打款。</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`/dashboard/returns/${returnId}/qc`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
            查看质检单
          </Link>
          <Link href={backHref} className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-hover)]">返回</Link>
        </div>
      </div>
    </div>
  );

  const s = state.status;
  const sc = refundStatusConfig[s] ?? refundStatusConfig.draft;
  const remaining = Math.max(0, state.netRefundAmount - state.paidAmount);
  const canApprove = s === 'pending_approval';
  const canPay     = ['approved', 'partial_paid'].includes(s);
  const canVoid    = !['paid', 'void'].includes(s);

  const hasFailedTx  = state.transactions.some((t) => t.status === 'failed');
  const hasProcessing = state.transactions.some((t) => t.status === 'processing');

  const steps = [
    { label: '创建',   done: true,     active: s === 'draft' },
    { label: '待审批', done: ['pending_approval', 'approved', 'processing', 'partial_paid', 'paid'].includes(s), active: s === 'pending_approval' },
    { label: '已审批', done: ['approved', 'processing', 'partial_paid', 'paid'].includes(s), active: s === 'approved' },
    { label: '打款中', done: ['processing', 'partial_paid', 'paid'].includes(s), active: s === 'processing' || s === 'partial_paid' },
    { label: '已完成', done: s === 'paid', active: s === 'paid' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {toast && (
        <div className={cn('fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-5 py-3 text-[13px] font-medium text-white shadow-2xl', toast.ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')}>
          {toast.msg}
        </div>
      )}

      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />{backLabel}
      </Link>

      {/* ══ Header ══ */}
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-semibold">退款单 {state.refundNo}</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.cls)}>
                <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
              </span>
              {hasFailedTx && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)] ring-1 ring-inset ring-red-200">
                  ⚠ 有打款失败
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
              <span>退货单：<Link href={`/dashboard/returns/${returnId}`} className="text-[var(--primary)] hover:underline">{returnOrder?.returnNo ?? returnId}</Link></span>
              {qcOrder && <><span>·</span><span>质检单：<Link href={`/dashboard/returns/${returnId}/qc`} className="text-[var(--primary)] hover:underline">{qcOrder.qcNo}</Link></span></>}
              {state.approvedBy && <><span>·</span><span>审批人：{state.approvedBy}</span></>}
              {state.approvedAt && <><span>·</span><span>审批时间：{state.approvedAt.slice(0, 10)}</span></>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canApprove && (
              <button onClick={() => { setApprover(currentSession.name); setApproveNote(''); setShowApprove(true); }}
                className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                审批通过
              </button>
            )}
            {canPay && (
              <button onClick={() => { setTxMethod('original_payment'); setTxAmount(remaining.toFixed(2)); setTxBank(''); setTxAccount(''); setTxNote(''); setShowPayment(true); }}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                <Plus className="size-3.5" />发起打款
              </button>
            )}
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)]">
              <Download className="size-3.5" />导出
            </button>
            {canVoid && (
              <button onClick={() => { setVoidReason(''); setShowVoid(true); }}
                className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50">
                作废
              </button>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-1.5">
                  <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px]',
                    step.done
                      ? step.active ? 'bg-[var(--primary)] text-white ring-2 ring-[var(--primary)] ring-offset-1' : 'bg-[var(--primary)] text-white'
                      : 'border border-[var(--border)] text-[var(--muted-foreground)]')}>
                    {step.done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn('text-[12px] font-medium', step.done ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step.label}</span>
                </div>
                {i < steps.length - 1 && <span className="text-[10px] text-[var(--muted)]">›</span>}
              </React.Fragment>
            ))}
          </div>
          {/* 状态提示 */}
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            {s === 'draft'          && '草稿状态，请提交审批。'}
            {s === 'pending_approval' && '等待审批人确认退款金额和依据，审批通过后可发起打款。'}
            {s === 'approved'       && `已审批，待打款 ${fmt(remaining, state.currency)}。点击「发起打款」。`}
            {s === 'processing'     && `${state.transactions.filter((t) => t.status === 'processing').length} 笔打款处理中，等待支付网关确认到账。`}
            {s === 'partial_paid'   && `已部分打款 ${fmt(state.paidAmount, state.currency)}，剩余 ${fmt(remaining, state.currency)} 待处理。`}
            {s === 'paid'           && '退款已全部完成，可返回退货单执行关单操作。'}
            {s === 'void'           && '退款单已作废。'}
            {hasFailedTx && s !== 'paid' && s !== 'void' && ' ⚠ 存在失败的打款，请检查并重试。'}
          </p>
        </div>

        {/* 退款完成后显示可关单提示 */}
        {s === 'paid' && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-3.5" /></span>
              <div>
                <div className="text-[13px] font-semibold text-emerald-800">退款已完成 — {fmt(state.paidAmount, state.currency)}</div>
                <div className="text-[11px] text-emerald-600">所有单据已完结，可返回退货单执行关单</div>
              </div>
            </div>
            <Link href={`/dashboard/returns/${returnId}`}
              className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:underline">
              返回退货单 <ChevronRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ══ 两栏 ══ */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

        {/* 左：金额明细 + 退款依据 + Credit Memo + 打款记录 */}
        <div className="space-y-5">

          {/* 金额明细 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <h2 className="text-[14px] font-semibold">金额明细</h2>
            </div>
            <div className="p-5">
              {/* 核心金额表 */}
              <table className="w-full text-[13px] mb-4">
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr>
                    <td className="py-2.5 text-[var(--muted)]">原单实付</td>
                    <td className="py-2.5 text-right font-medium">{state.originalPaidAmount === undefined ? '—' : fmt(state.originalPaidAmount, state.currency)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--muted)]">客户申请退款</td>
                    <td className="py-2.5 text-right font-medium">{fmt(state.requestedAmount, state.currency)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[var(--foreground)]">核准退款金额</td>
                    <td className="py-2.5 text-right text-[16px] font-bold text-[var(--primary)]">
                      {state.approvedAmount > 0 ? fmt(state.approvedAmount, state.currency) : <span className="text-[13px] font-normal text-[var(--muted)]">待审批</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 扣减项 */}
              {(state.restockingFee > 0 || state.shippingDeduction > 0 || state.otherDeductions > 0) && (
                <div className="mb-4 rounded-xl bg-[var(--surface-subtle)] p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">扣减项</p>
                  <table className="w-full text-[12px]">
                    <tbody>
                      {state.restockingFee > 0 && (
                        <tr><td className="py-1 text-[var(--muted)]">补货 / 处理费</td><td className="py-1 text-right font-medium text-[var(--danger)]">- {fmt(state.restockingFee, state.currency)}</td></tr>
                      )}
                      {state.shippingDeduction > 0 && (
                        <tr><td className="py-1 text-[var(--muted)]">运费扣除</td><td className="py-1 text-right font-medium text-[var(--danger)]">- {fmt(state.shippingDeduction, state.currency)}</td></tr>
                      )}
                      {state.otherDeductions > 0 && (
                        <tr><td className="py-1 text-[var(--muted)]">其他扣减</td><td className="py-1 text-right font-medium text-[var(--danger)]">- {fmt(state.otherDeductions, state.currency)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 实际应退 */}
              <div className="rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">实际应退金额</div>
                    <div className="text-[11px] text-[var(--muted)]">核准 − 扣减项</div>
                  </div>
                  <div className="text-[28px] font-bold text-[var(--primary)]">{fmt(state.netRefundAmount, state.currency)}</div>
                </div>
              </div>

              {/* 已打款 / 待打款 */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--surface-subtle)] p-3 text-center">
                  <div className="text-[11px] text-[var(--muted)]">已打款</div>
                  <div className={cn('mt-1 text-[18px] font-bold', state.paidAmount > 0 ? 'text-[var(--success)]' : 'text-[var(--muted)]')}>
                    {fmt(state.paidAmount, state.currency)}
                  </div>
                  {state.paidAmount > 0 && state.paidAmount < state.netRefundAmount && (
                    <div className="text-[10px] text-amber-600">部分打款</div>
                  )}
                </div>
                <div className={cn('rounded-xl p-3 text-center', remaining > 0 ? 'bg-amber-50' : 'bg-[var(--surface-subtle)]')}>
                  <div className="text-[11px] text-[var(--muted)]">待打款</div>
                  <div className={cn('mt-1 text-[18px] font-bold', remaining > 0 ? 'text-amber-700' : 'text-[var(--muted)]')}>
                    {fmt(remaining, state.currency)}
                  </div>
                  {remaining > 0 && canPay && (
                    <button onClick={() => { setTxAmount(remaining.toFixed(2)); setShowPayment(true); }}
                      className="mt-1 text-[10px] font-semibold text-[var(--primary)] hover:underline">
                      立即打款
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 退款依据 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-3 text-[14px] font-semibold">退款依据</h2>
            <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{state.refundBasis}</p>
            {state.qcConclusion && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-subtle)] px-3 py-1.5 text-[12px]">
                质检结论：<span className="font-semibold">{state.qcConclusion}</span>
              </div>
            )}
            {qcOrder && (
              <Link href={`/dashboard/returns/${returnId}/qc`} className="mt-2 flex items-center gap-1 text-[12px] text-[var(--primary)] hover:underline">
                查看质检单 {qcOrder.qcNo} <ExternalLink className="size-3" />
              </Link>
            )}
          </section>

          {/* B2B Credit Memo */}
          {state.creditMemoNo && (
            <section className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="mb-3 text-[14px] font-semibold text-blue-800">信用票据（Credit Memo）</h2>
              <div className="divide-y divide-blue-100">
                <InfoRow label="Credit Memo 编号" value={<><span className="font-mono text-[11px]">{state.creditMemoNo}</span><CopyBtn text={state.creditMemoNo} /></>} />
                {state.creditMemoIssuedAt && <InfoRow label="开具时间" value={state.creditMemoIssuedAt} />}
                {state.creditMemoAppliedAt && <InfoRow label="抵扣时间" value={state.creditMemoAppliedAt} />}
                {!state.creditMemoIssuedAt && (
                  <div className="flex items-center justify-between py-1.5 text-[12px]">
                    <span className="text-[var(--muted)]">状态</span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">待开具</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 打款记录 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <div>
                <h2 className="text-[14px] font-semibold">打款记录</h2>
                {state.transactions.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {state.transactions.filter((t) => t.status === 'success').length} 笔成功 ·
                    {state.transactions.filter((t) => t.status === 'processing').length} 笔处理中
                    {state.transactions.filter((t) => t.status === 'failed').length > 0 && (
                      <span className="text-[var(--danger)]"> · {state.transactions.filter((t) => t.status === 'failed').length} 笔失败</span>
                    )}
                  </p>
                )}
              </div>
              {canPay && (
                <button onClick={() => { setTxMethod('original_payment'); setTxAmount(remaining.toFixed(2)); setTxBank(''); setTxAccount(''); setTxNote(''); setShowPayment(true); }}
                  className="flex h-7 items-center gap-1 rounded-lg bg-[var(--success)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
                  <Plus className="size-3" />发起打款
                </button>
              )}
            </div>

            {state.transactions.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
                  <Package className="size-5 text-[var(--muted)]" />
                </div>
                <p className="mt-2 text-[13px] text-[var(--muted)]">暂无打款记录</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">
                  {canPay ? '点击「发起打款」创建第一笔' : s === 'pending_approval' ? '审批通过后可发起打款' : ''}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-[13px]">
                  <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-2.5 text-left">流水号</th>
                      <th className="whitespace-nowrap px-3 py-2.5">方式</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right">金额</th>
                      <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                      <th className="whitespace-nowrap px-3 py-2.5">网关 / 银行</th>
                      <th className="whitespace-nowrap px-3 py-2.5">网关流水号</th>
                      <th className="whitespace-nowrap px-3 py-2.5">发起时间</th>
                      <th className="whitespace-nowrap px-3 py-2.5">完成时间</th>
                      <th className="whitespace-nowrap px-3 py-2.5">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {state.transactions.map((tx) => {
                      const tsc = txStatusConfig[tx.status];
                      return (
                        <tr key={tx.id} className={cn('hover:bg-[var(--surface-subtle)]', tx.status === 'failed' && 'bg-red-50/30')}>
                          <td className="px-5 py-3">
                            <div className="font-mono text-[11px]">{tx.txNo}<CopyBtn text={tx.txNo} /></div>
                            {tx.note && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{tx.note}</div>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12px]">{methodLabels[tx.method]}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold">{fmt(tx.amount, tx.currency)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', tsc.cls)}>
                                <span className={cn('size-1.5 rounded-full', tsc.dot)} />{tsc.label}
                              </span>
                              {tx.failureReason && <span className="text-[10px] text-[var(--danger)]">{tx.failureReason}</span>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                            {tx.gatewayName ?? tx.bankName ?? '—'}
                            {tx.bankAccount && <span className="ml-1 font-mono text-[11px]">****{tx.bankAccount}</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {tx.gatewayTxId
                              ? <span className="font-mono text-[11px]">{tx.gatewayTxId}<CopyBtn text={tx.gatewayTxId} /></span>
                              : <span className="text-[11px] text-[var(--muted)]">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{tx.initiatedAt.slice(0, 16)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{tx.completedAt?.slice(0, 16) ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="flex flex-col gap-1">
                              {/* 处理中：标记到账 / 标记失败 */}
                              {tx.status === 'processing' && (
                                <>
                                  <button onClick={() => { const id = prompt('输入网关流水号（如 re_xxx）'); if (id) { dispatch({ type: 'MARK_SUCCESS', txId: tx.id, gatewayTxId: id }); toast$('已标记打款成功'); } }}
                                    className="text-left text-[11px] font-medium text-[var(--success)] hover:underline">
                                    标记到账
                                  </button>
                                  <button onClick={() => { setFailTxId(tx.id); setFailReason(''); setShowFail(true); }}
                                    className="text-left text-[11px] font-medium text-[var(--danger)] hover:underline">
                                    标记失败
                                  </button>
                                </>
                              )}
                              {/* 失败：重试 */}
                              {tx.status === 'failed' && (
                                <button onClick={() => { dispatch({ type: 'RETRY_PAYMENT', txId: tx.id }); toast$('已重新发起打款'); }}
                                  className="flex items-center gap-0.5 text-[11px] font-medium text-amber-600 hover:underline">
                                  <RotateCcw className="size-3" />重试
                                </button>
                              )}
                              {/* 处理中：取消 */}
                              {tx.status === 'processing' && (
                                <button onClick={() => { if (confirm('确定取消此笔打款？')) { dispatch({ type: 'CANCEL_TRANSACTION', txId: tx.id }); toast$('已取消', false); } }}
                                  className="text-left text-[11px] text-[var(--muted)] hover:text-[var(--danger)] hover:underline">
                                  取消
                                </button>
                              )}
                              {/* 成功：下载收据 */}
                              {tx.status === 'success' && (
                                <button onClick={() => toast$('收据下载功能开发中')}
                                  className="flex items-center gap-0.5 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] hover:underline">
                                  <Download className="size-3" />收据
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* 合计行 */}
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
                      <td colSpan={2} className="px-5 py-2.5 text-[12px] font-semibold text-[var(--muted-foreground)]">合计</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-bold">
                        {fmt(state.transactions.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0), state.currency)}
                        <div className="text-[10px] font-normal text-[var(--muted)]">已到账</div>
                      </td>
                      <td colSpan={6} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* 右：侧边栏 */}
        <div className="space-y-4">

          {/* 完成状态横幅 */}
          {s === 'paid' && (
            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="size-4 text-white" />
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-emerald-800">退款已完成</div>
                  <div className="text-[11px] text-emerald-600">{fmt(state.paidAmount, state.currency)} 已到账</div>
                </div>
              </div>
              <Link href={`/dashboard/returns/${returnId}`}
                className="flex h-8 items-center justify-between rounded-lg border border-emerald-300 bg-white px-3 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">
                <span>返回退货单执行关单</span><ChevronRight className="size-3.5" />
              </Link>
            </section>
          )}

          {/* 退款单信息 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">退款单信息</h3>
            <div className="divide-y divide-[var(--border-subtle)]">
              <InfoRow label="退款单号" value={<><span className="font-mono text-[11px]">{state.refundNo}</span><CopyBtn text={state.refundNo} /></>} />
              <InfoRow label="币种" value={state.currency} />
              <InfoRow label="创建时间" value={state.createdAt.slice(0, 10)} />
              {state.approvedAt && <InfoRow label="审批时间" value={state.approvedAt.slice(0, 10)} />}
              {state.approvedBy && <InfoRow label="审批人" value={state.approvedBy} />}
              <InfoRow label="最后更新" value={state.updatedAt.slice(0, 10)} />
            </div>
          </section>

          {/* 来源单据 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">来源单据</h3>
            <div className="space-y-2 text-[12px]">
              <Link href={`/dashboard/returns/${returnId}`} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-subtle)]">
                <span className="text-[var(--muted)]">退货单</span>
                <span className="font-medium text-[var(--primary)]">{returnOrder?.returnNo ?? returnId}</span>
              </Link>
              {qcOrder && (
                <Link href={`/dashboard/returns/${returnId}/qc`} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-subtle)]">
                  <span className="text-[var(--muted)]">质检单</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[var(--primary)]">{qcOrder.qcNo}</span>
                    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcStatusConfig[qcOrder.status].cls)}>
                      {qcStatusConfig[qcOrder.status].label}
                    </span>
                  </div>
                </Link>
              )}
              <Link href={`/dashboard/returns/${returnId}/receipt`} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-subtle)]">
                <span className="text-[var(--muted)]">入库单</span>
                <span className="text-[var(--primary)] text-[11px]">查看 →</span>
              </Link>
            </div>
          </section>

          {/* 客户信息 */}
          {returnOrder && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户</h3>
              <div className="text-[13px] font-medium">{returnOrder.customerName}</div>
              {returnOrder.customerCompany && <div className="text-[12px] text-[var(--muted)]">{returnOrder.customerCompany}</div>}
              <div className="text-[12px] text-[var(--muted)]">{returnOrder.customerEmail}</div>
              {returnOrder.originalShippingAddress && (
                <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2 text-[11px] text-[var(--muted)] space-y-0.5">
                  <div>{returnOrder.originalShippingAddress.addressLine1}</div>
                  <div>{returnOrder.originalShippingAddress.city}{returnOrder.originalShippingAddress.state ? `, ${returnOrder.originalShippingAddress.state}` : ''} {returnOrder.originalShippingAddress.postalCode}</div>
                  <div>{returnOrder.originalShippingAddress.country}</div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ══ Modals ══ */}

      {/* 审批通过 */}
      {showApprove && (
        <Modal title="审批退款单" onClose={() => setShowApprove(false)}>
          <div className="mb-4 rounded-xl bg-[var(--surface-subtle)] p-3 text-[12px]">
            <div className="flex justify-between mb-1"><span className="text-[var(--muted)]">核准退款金额</span><span className="font-bold text-[var(--primary)]">{fmt(state.requestedAmount, state.currency)}</span></div>
            {(state.restockingFee > 0 || state.shippingDeduction > 0) && (
              <div className="flex justify-between text-[11px]"><span className="text-[var(--muted)]">扣减项合计</span><span className="text-[var(--danger)]">- {fmt(state.restockingFee + state.shippingDeduction + state.otherDeductions, state.currency)}</span></div>
            )}
            <div className="flex justify-between font-semibold mt-1"><span>实际应退</span><span>{fmt(state.netRefundAmount, state.currency)}</span></div>
            {state.refundBasis && <p className="mt-1 text-[11px] text-[var(--muted)] border-t border-[var(--border-subtle)] pt-1">{state.refundBasis}</p>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">审批人 <span className="text-[var(--danger)]">*</span></label>
              <input list="approvers-list" value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="选择或输入审批人" className={inputCls} />
              <datalist id="approvers-list">
                {qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">审批备注（选填）</label>
              <textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={2} placeholder="审批意见…" className={cn(inputCls, 'resize-none')} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowApprove(false)} className={btnSecondary}>取消</button>
            <button disabled={!approver.trim()} onClick={() => { dispatch({ type: 'APPROVE', approver, note: approveNote }); setShowApprove(false); toast$('退款已审批通过，可发起打款'); }} className={btnPrimary}>确认审批</button>
          </div>
        </Modal>
      )}

      {/* 发起打款 */}
      {showPayment && (
        <Modal title="发起打款" onClose={() => setShowPayment(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">打款方式 <span className="text-[var(--danger)]">*</span></label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {(Object.entries(methodLabels) as [PaymentTransaction['method'], string][]).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setTxMethod(k)}
                    className={cn('rounded-lg border py-2 text-[12px] font-medium transition-colors',
                      txMethod === k ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">打款金额（{state.currency}）<span className="text-[var(--danger)]">*</span></label>
              <input type="number" min={0.01} step={0.01} value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder={`最多 ${remaining.toFixed(2)}`} className={inputCls} />
              <p className="mt-1 text-[11px] text-[var(--muted)]">待打款：{fmt(remaining, state.currency)}</p>
            </div>
            {txMethod === 'bank_transfer' && (
              <>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">收款银行</label>
                  <input value={txBank} onChange={(e) => setTxBank(e.target.value)} placeholder="如 Chase Bank" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">收款账号后 4 位</label>
                  <input value={txAccount} onChange={(e) => setTxAccount(e.target.value)} placeholder="如 8899" maxLength={4} className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-[12px] font-medium">备注（选填）</label>
              <textarea value={txNote} onChange={(e) => setTxNote(e.target.value)} rows={2} placeholder="打款说明…" className={cn(inputCls, 'resize-none')} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowPayment(false)} className={btnSecondary}>取消</button>
            <button disabled={!txAmount || Number(txAmount) <= 0 || Number(txAmount) > remaining + 0.01}
              onClick={() => {
                const amt = Number(txAmount);
                dispatch({ type: 'ADD_TRANSACTION', tx: { method: txMethod, amount: amt, currency: state.currency, status: 'processing', bankName: txBank || undefined, bankAccount: txAccount || undefined, note: txNote || undefined } });
                setShowPayment(false);
                toast$('打款记录已创建，处理中');
              }} className={btnSuccess}>确认发起</button>
          </div>
        </Modal>
      )}

      {/* 标记失败 */}
      {showFail && (
        <Modal title="标记打款失败" onClose={() => setShowFail(false)}>
          <p className="mb-3 text-[12px] text-[var(--muted)]">标记为失败后，可在打款记录中点击「重试」重新发起。</p>
          <label className="mb-1 block text-[12px] font-medium">失败原因 <span className="text-[var(--danger)]">*</span></label>
          <select value={failReason} onChange={(e) => setFailReason(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--danger)]">
            <option value="">选择原因</option>
            {['账号信息有误', '余额不足', '支付网关超时', '账号被冻结', '卡片已失效', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowFail(false)} className={btnSecondary}>取消</button>
            <button disabled={!failReason} onClick={() => { dispatch({ type: 'MARK_FAILED', txId: failTxId, reason: failReason }); setShowFail(false); toast$('已标记失败，可重试', false); }} className="h-9 rounded-xl bg-[var(--danger)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">确认失败</button>
          </div>
        </Modal>
      )}

      {/* 作废 */}
      {showVoid && (
        <Modal title="作废退款单" onClose={() => setShowVoid(false)}>
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">作废后不可恢复。若有已打款记录，请先联系财务确认处理方式。</div>
          <label className="mb-1 block text-[12px] font-medium">作废原因</label>
          <select value={voidReason} onChange={(e) => setVoidReason(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none">
            <option value="">选择原因</option>
            {['退货单已取消', '重复创建', '金额有误需重建', '客户撤销退款申请', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowVoid(false)} className={btnSecondary}>保留</button>
            <button onClick={() => { dispatch({ type: 'VOID', reason: voidReason }); setShowVoid(false); toast$('退款单已作废', false); }} className="h-9 rounded-xl bg-[var(--danger)] px-5 text-[13px] font-semibold text-white hover:opacity-90">确认作废</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 外层导出（Suspense 包裹） ─────────────────────────────────────────────────

export default function RefundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  let returnId = rawId; try { returnId = decodeURIComponent(rawId); } catch { /* ignore */ }
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1440px] pt-8 text-center text-[var(--muted)]">加载中…</div>}>
      <RefundPageInner returnId={returnId} />
    </Suspense>
  );
}
