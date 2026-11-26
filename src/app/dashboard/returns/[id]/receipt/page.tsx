'use client';

import React, { use, useReducer, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentSession } from '@/lib/session-context';
import {
  returnOrders, returnReceiptOrders, qcOrders,
  receiptStatusConfig, qcStatusConfig, refundStatusConfig,
  getQCByReturnId, getRefundByReturnId,
  type ReturnReceiptOrder, type ReceiptLineItem,
} from '@/lib/mock-data/return-orders';

// ─── Types ───────────────────────────────────────────────────────────────────

type InboundLine = {
  lineItemId: string;
  sku: string;
  title: string;
  variantTitle: string;
  goodQty: number;        // 来自质检
  defectiveQty: number;   // 来自质检
  restockQty: number;     // 确认入库数量（通常 = goodQty）
  scrapQty: number;       // 报废数量
  restockLocation: string;
  dispositionNote: string;
};

type ReceiptAction =
  | { type: 'UPDATE_LINE'; lineItemId: string; patch: Partial<InboundLine> }
  | { type: 'CONFIRM_STOCK_IN'; operator: string; note?: string }
  | { type: 'CLOSE' };

type LocalState = {
  status: 'pending' | 'stocked_in' | 'closed';
  lines: InboundLine[];
  operator?: string;
  stockedInAt?: string;
  note?: string;
};

function reducer(state: LocalState, action: ReceiptAction): LocalState {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  switch (action.type) {
    case 'UPDATE_LINE':
      return { ...state, lines: state.lines.map((l) => l.lineItemId === action.lineItemId ? { ...l, ...action.patch } : l) };
    case 'CONFIRM_STOCK_IN':
      return { ...state, status: 'stocked_in', operator: action.operator, stockedInAt: now, note: action.note };
    case 'CLOSE':
      return { ...state, status: 'closed' };
    default: return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig = {
  pending:    { label: '待入库', cls: 'bg-amber-50 text-amber-700 ring-amber-200',         dot: 'bg-amber-400' },
  stocked_in: { label: '已入库', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   dot: 'bg-emerald-500' },
  closed:     { label: '已关闭', cls: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]', dot: 'bg-[var(--muted)]' },
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
const btnPrimary = 'h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40';
const btnSecondary = 'h-9 rounded-xl border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  let returnId = rawId; try { returnId = decodeURIComponent(rawId); } catch { /* ignore */ }

  const returnOrder = returnOrders.find((r) => r.id === returnId);
  const qcOrder     = getQCByReturnId(returnId);
  const refundDoc   = getRefundByReturnId(returnId);
  // 已有入库单 mock 数据
  const existingReceipt = returnReceiptOrders.find((r) => r.returnOrderId === returnId);

  // 优先用 mock QC，其次读 sessionStorage（QC 页完成后写入）
  const sessionQC = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`qc_draft_${returnId}`);
      return raw ? JSON.parse(raw) as import('@/lib/mock-data/return-orders').QCOrder : null;
    } catch { return null; }
  })();
  const effectiveQC = qcOrder ?? sessionQC;

  // 从质检单构建入库行（入库单的来源是质检结论）
  const initialLines: InboundLine[] = (() => {
    if (effectiveQC?.lineItems?.length) {
      return effectiveQC.lineItems.map((l) => ({
        lineItemId: l.lineItemId,
        sku: l.sku,
        title: l.title,
        variantTitle: l.variantTitle,
        goodQty: l.goodQty,
        defectiveQty: l.defectiveQty,
        restockQty: l.restockQty,
        scrapQty: l.scrapQty,
        restockLocation: l.restockLocation ?? '',
        dispositionNote: l.dispositionNote ?? '',
      }));
    }
    if (existingReceipt?.lineItems?.length) {
      return existingReceipt.lineItems.map((l) => ({
        lineItemId: l.lineItemId,
        sku: l.sku,
        title: l.title,
        variantTitle: l.variantTitle,
        goodQty: l.qcGood ?? 0,
        defectiveQty: l.qcDamaged ?? 0,
        restockQty: l.qcGood ?? 0,
        scrapQty: l.qcDamaged ?? 0,
        restockLocation: l.restockLocation ?? '',
        dispositionNote: l.dispositionNote ?? '',
      }));
    }
    return [];
  })();

  const initStatus = existingReceipt?.status === 'stocked_in' || existingReceipt?.status === 'closed' ? 'stocked_in' : 'pending';

  const [state, dispatch] = useReducer(reducer, {
    status: initStatus,
    lines: initialLines,
    operator: existingReceipt?.receivedBy,
    stockedInAt: existingReceipt?.stockedInAt,
  });

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toast$ = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2600); };
  // 入库操作默认带入当前用户
  const [operator, setOperator] = useState(currentSession.name); const [opNote, setOpNote] = useState(''); const [showConfirm, setShowConfirm] = useState(false);

  // 没有质检单的情况
  if (!effectiveQC && !existingReceipt) return (
    <div className="mx-auto max-w-[1440px] pt-5">
      <Link href={`/dashboard/returns/${returnId}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />退货单详情
      </Link>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <Package className="mx-auto size-10 text-[var(--border)]" />
        <p className="mt-3 text-[14px] font-medium">入库单尚未可创建</p>
        <p className="mt-2 max-w-xs mx-auto text-[12px] text-[var(--muted)]">入库单依赖质检结论。请先完成仓库签收，再创建质检单，质检通过后才可正式入库。</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href={`/dashboard/returns/${returnId}/qc`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">前往质检单</Link>
          <Link href={`/dashboard/returns/${returnId}`} className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-hover)]">返回退货单</Link>
        </div>
      </div>
    </div>
  );

  const sc = statusConfig[state.status];
  const totalGood    = state.lines.reduce((s, l) => s + l.goodQty, 0);
  const totalDefect  = state.lines.reduce((s, l) => s + l.defectiveQty, 0);
  const totalRestock = state.lines.reduce((s, l) => s + l.restockQty, 0);
  const totalScrap   = state.lines.reduce((s, l) => s + l.scrapQty, 0);
  const canEdit      = state.status === 'pending';
  const canStockIn   = state.status === 'pending';

  const receiptNo = existingReceipt?.receiptNo ?? `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${returnId.slice(-3).toUpperCase()}`;

  const steps = [
    { label: '质检完成',   done: true },
    { label: '待入库确认', done: ['pending', 'stocked_in', 'closed'].includes(state.status) },
    { label: '已入库',     done: ['stocked_in', 'closed'].includes(state.status) },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {toast && (
        <div className={cn('fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-5 py-3 text-[13px] font-medium text-white shadow-2xl', toast.ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')}>
          {toast.msg}
        </div>
      )}

      <Link href={`/dashboard/returns/${returnId}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />退货单详情
      </Link>

      {/* Header */}
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-semibold">退货入库单 {receiptNo}</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.cls)}>
                <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
              <span>退货单：<Link href={`/dashboard/returns/${returnId}`} className="text-[var(--primary)] hover:underline">{returnOrder?.returnNo ?? returnId}</Link></span>
              {effectiveQC && <><span>·</span><span>来源质检单：<Link href={`/dashboard/returns/${returnId}/qc`} className="text-[var(--primary)] hover:underline">{effectiveQC.qcNo}</Link></span></>}
              {state.operator && <><span>·</span><span>操作人：{state.operator}</span></>}
              {state.stockedInAt && <><span>·</span><span>入库时间：{state.stockedInAt.slice(0, 10)}</span></>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canStockIn && (
              <button onClick={() => { setOperator(currentSession.name); setOpNote(''); setShowConfirm(true); }}
                className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                确认入库
              </button>
            )}
            {state.status === 'stocked_in' && !refundDoc && (
              <Link href={`/dashboard/returns/${returnId}/refund`}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                创建退款单 →
              </Link>
            )}
            {state.status === 'stocked_in' && refundDoc && (
              <Link href={`/dashboard/returns/${returnId}/refund`}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)]">
                查看退款单
              </Link>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
          <p className="mb-2 text-[11px] text-[var(--muted)]">入库单依赖质检结论，仅对良品执行入库操作，次品同步进入隔离/报废库存。</p>
          <div className="flex flex-wrap items-center gap-1.5">
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

      {/* 关联导航 */}
      <div className="mb-5 flex flex-wrap gap-2 text-[12px]">
        {qcOrder && (
          <Link href={`/dashboard/returns/${returnId}/qc`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium hover:bg-[var(--surface-subtle)]">
            质检单 {qcOrder.qcNo}
            <span className={cn('ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcStatusConfig[qcOrder.status].cls)}>{qcStatusConfig[qcOrder.status].label}</span>
          </Link>
        )}
        {refundDoc && (
          <Link href={`/dashboard/returns/${returnId}/refund`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-medium hover:bg-[var(--surface-subtle)]">
            退款单 {refundDoc.refundNo}
            <span className={cn('ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', refundStatusConfig[refundDoc.status].cls)}>{refundStatusConfig[refundDoc.status].label}</span>
          </Link>
        )}
      </div>

      {/* 入库明细（来源：质检单良品结论） */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">入库明细（依据质检结论）</h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">良品上架至可售库存；次品 / 错发进入隔离库存。确认入库后不可修改。</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-2.5 text-left">商品 / SKU</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--success)]">质检良品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--danger)]">质检次品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">入库数量</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">报废数量</th>
                <th className="whitespace-nowrap px-3 py-2.5">上架库位</th>
                <th className="whitespace-nowrap px-3 py-2.5">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {state.lines.map((line) => (
                <tr key={line.lineItemId} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-5 py-3">
                    <div className="font-medium text-[var(--foreground)]">{line.title}</div>
                    <div className="text-[11px] text-[var(--muted)]">{line.variantTitle} · <span className="font-mono">{line.sku}</span></div>
                  </td>

                  {/* 质检良品（只读，来自质检单） */}
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <span className={cn('text-[13px] font-semibold', line.goodQty > 0 ? 'text-[var(--success)]' : 'text-[var(--muted)]')}>{line.goodQty}</span>
                  </td>
                  {/* 质检次品（只读） */}
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <span className={cn('text-[13px] font-semibold', line.defectiveQty > 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>{line.defectiveQty}</span>
                  </td>

                  {/* 入库数量（可调整，默认 = 良品数） */}
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    {canEdit
                      ? <input type="number" min={0} max={line.goodQty} value={line.restockQty}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { restockQty: Math.min(Number(e.target.value), line.goodQty) } })}
                          className="w-16 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-[13px] text-emerald-800 focus:border-emerald-400 focus:outline-none" />
                      : <span className="text-[13px] font-semibold text-[var(--success)]">{line.restockQty}</span>}
                  </td>

                  {/* 报废 */}
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    {canEdit
                      ? <input type="number" min={0} max={line.defectiveQty} value={line.scrapQty}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { scrapQty: Math.min(Number(e.target.value), line.defectiveQty) } })}
                          className="w-16 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-center text-[13px] text-red-700 focus:border-red-400 focus:outline-none" />
                      : <span className={cn('text-[13px] font-semibold', line.scrapQty > 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>{line.scrapQty}</span>}
                  </td>

                  {/* 库位 */}
                  <td className="whitespace-nowrap px-3 py-3">
                    {canEdit
                      ? <input value={line.restockLocation} onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { restockLocation: e.target.value } })}
                          placeholder="如 A-05"
                          className="w-[80px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                      : <span className="font-mono text-[11px] text-[var(--foreground)]">{line.restockLocation || '—'}</span>}
                  </td>

                  {/* 备注 */}
                  <td className="px-3 py-3">
                    {canEdit
                      ? <input value={line.dispositionNote} onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { dispositionNote: e.target.value } })}
                          placeholder="选填"
                          className="w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                      : <span className="text-[12px] text-[var(--muted)]">{line.dispositionNote || '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
                <td className="px-5 py-3 text-[12px] font-semibold text-[var(--muted-foreground)]">合计</td>
                <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--success)]">{totalGood}</td>
                <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--danger)]">{totalDefect}</td>
                <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--success)]">{totalRestock} 件入可售库存</td>
                <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--danger)]">{totalScrap} 件报废/隔离</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 入库完成后的库存影响摘要 */}
      {state.status === 'stocked_in' && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-[var(--shadow-soft)]">
          <h3 className="mb-3 text-[14px] font-semibold text-emerald-800">库存影响（入库已完成）</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">恢复可售库存</div>
              <div className="mt-2 text-[28px] font-bold text-emerald-700">+{totalRestock}</div>
              <div className="text-[11px] text-emerald-600">件良品已入库</div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-red-600">报废 / 隔离库存</div>
              <div className="mt-2 text-[28px] font-bold text-[var(--danger)]">{totalScrap}</div>
              <div className="text-[11px] text-red-500">件次品已处置</div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">入库操作人</div>
              <div className="mt-2 text-[16px] font-semibold text-[var(--foreground)]">{state.operator ?? '—'}</div>
              <div className="text-[11px] text-[var(--muted)]">{state.stockedInAt?.slice(0, 16)}</div>
            </div>
          </div>
          {!refundDoc && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-[12px] text-emerald-800">
              ✓ 入库已完成 — 下一步：<Link href={`/dashboard/returns/${returnId}/refund`} className="font-semibold underline">创建退款单</Link>，根据质检结论确定退款金额后打款，完成关单。
            </div>
          )}
        </section>
      )}

      {/* Modal：确认入库 */}
      {showConfirm && (
        <Modal title="确认入库" onClose={() => setShowConfirm(false)}>
          <div className="mb-3 rounded-xl bg-[var(--surface-subtle)] p-3 text-[12px]">
            <div className="flex justify-between"><span className="text-[var(--muted)]">入库良品</span><span className="font-bold text-[var(--success)]">{totalRestock} 件</span></div>
            <div className="flex justify-between mt-1"><span className="text-[var(--muted)]">报废处置</span><span className="font-bold text-[var(--danger)]">{totalScrap} 件</span></div>
            <p className="mt-2 text-[11px] text-amber-700">入库确认后不可撤销，库存将立即更新。</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">操作人 <span className="text-[var(--danger)]">*</span></label>
              <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="仓库操作员姓名" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">备注（选填）</label>
              <textarea value={opNote} onChange={(e) => setOpNote(e.target.value)} rows={2} placeholder="补充说明…" className={cn(inputCls, 'resize-none')} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowConfirm(false)} className={btnSecondary}>取消</button>
            <button disabled={!operator} onClick={() => { dispatch({ type: 'CONFIRM_STOCK_IN', operator, note: opNote }); setShowConfirm(false); toast$(`入库完成：${totalRestock} 件良品已入可售库存`); }} className={btnPrimary}>确认入库</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
