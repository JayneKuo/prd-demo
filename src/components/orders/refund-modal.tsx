'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderDetail, RefundRecord, RefundType } from '@/lib/mock-data/order-details';

interface Props {
  detail: OrderDetail;
  onConfirm: (refund: RefundRecord, newFinancialStatus: string) => void;
  onClose: () => void;
}

const REFUND_REASONS = [
  '商品质量问题',
  '收到商品与描述不符',
  '客户主动取消',
  '未收到商品',
  '商品损坏',
  '重复下单',
  '地址错误无法送达',
  '其他',
];

const REFUND_METHODS = [
  '原路返回（原支付方式）',
  '账户余额',
  '手动退款',
];

function parseMoney(s: string): number {
  return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
}

function fmt(n: number, currency = 'USD'): string {
  const sym = currency === 'GBP' ? '£' : currency === 'SGD' ? 'S$' : '$';
  return `${sym}${Math.abs(n).toFixed(2)}`;
}

export function RefundModal({ detail, onConfirm, onClose }: Props) {
  const currency = detail.currency;
  const orderTotal = parseMoney(detail.totalPrice);
  const shippingTotal = parseMoney(detail.totalShipping);

  // 已退款金额
  const alreadyRefunded = detail.refunds.reduce((s, r) => s + parseMoney(r.amount), 0);
  const maxRefundable = orderTotal - alreadyRefunded;

  // 行级选择状态
  type LineSelection = { selected: boolean; quantity: number };
  const [lineSelections, setLineSelections] = useState<Record<string, LineSelection>>(() => {
    const init: Record<string, LineSelection> = {};
    for (const item of detail.lineItems) {
      const alreadyRefundedQty = detail.refunds
        .flatMap((r) => r.lineItems)
        .filter((ri) => ri.lineItemId === item.id)
        .reduce((s, ri) => s + ri.quantity, 0);
      const remaining = item.quantity - alreadyRefundedQty;
      init[item.id] = { selected: false, quantity: remaining > 0 ? remaining : 0 };
    }
    return init;
  });
  const [refundShipping, setRefundShipping] = useState(false);
  const [refundType, setRefundType] = useState<RefundType>('refund_only');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState(REFUND_METHODS[0]);
  const [note, setNote] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  // 计算退款金额
  const lineRefundAmount = useMemo(() => {
    return detail.lineItems.reduce((s, item) => {
      const sel = lineSelections[item.id];
      if (!sel?.selected || sel.quantity === 0) return s;
      const unitPrice = parseMoney(item.unitPrice);
      const itemDiscount = parseMoney(item.discount);
      const perUnitNet = (unitPrice - itemDiscount / item.quantity);
      return s + perUnitNet * sel.quantity;
    }, 0);
  }, [lineSelections, detail.lineItems]);

  const shippingRefundAmount = refundShipping ? shippingTotal : 0;
  const autoAmount = lineRefundAmount + shippingRefundAmount;
  const finalAmount = useCustomAmount
    ? Math.min(parseFloat(customAmount) || 0, maxRefundable)
    : Math.min(autoAmount, maxRefundable);

  const selectedLineItems = detail.lineItems
    .filter((item) => lineSelections[item.id]?.selected && lineSelections[item.id].quantity > 0)
    .map((item) => ({ lineItemId: item.id, quantity: lineSelections[item.id].quantity }));

  const canConfirm = finalAmount > 0 && reason && (selectedLineItems.length > 0 || refundShipping || useCustomAmount);

  const handleConfirm = () => {
    const refundId = `REF-${Date.now().toString().slice(-8)}`;
    const newAlreadyRefunded = alreadyRefunded + finalAmount;
    const newFinancialStatus = newAlreadyRefunded >= orderTotal ? '已退款' : '部分退款';

    const refund: RefundRecord = {
      id: refundId,
      refundNo: refundId,
      reason,
      amount: fmt(finalAmount, currency),
      lineItems: selectedLineItems,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      method,
      processedBy: '当前用户',
      note: note || undefined,
      refundType,
    };

    onConfirm(refund, newFinancialStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[580px] max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">发起退款</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              订单总额 {detail.totalPrice}
              {alreadyRefunded > 0 && <span className="ml-2 text-[var(--danger)]">已退款 {fmt(alreadyRefunded, currency)}</span>}
            </p>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 商品选择 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--foreground)]">选择退款商品</span>
              <button
                onClick={() => {
                  const allSelected = detail.lineItems.every((i) => lineSelections[i.id]?.selected);
                  setLineSelections((prev) => {
                    const next = { ...prev };
                    for (const item of detail.lineItems) {
                      next[item.id] = { ...next[item.id], selected: !allSelected };
                    }
                    return next;
                  });
                }}
                className="text-[11px] text-[var(--primary)] hover:underline"
              >
                {detail.lineItems.every((i) => lineSelections[i.id]?.selected) ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border-subtle)]">
              {detail.lineItems.map((item) => {
                const sel = lineSelections[item.id];
                const alreadyRefundedQty = detail.refunds
                  .flatMap((r) => r.lineItems)
                  .filter((ri) => ri.lineItemId === item.id)
                  .reduce((s, ri) => s + ri.quantity, 0);
                const maxQty = item.quantity - alreadyRefundedQty;
                const unitNet = parseMoney(item.unitPrice) - parseMoney(item.discount) / item.quantity;

                return (
                  <div key={item.id} className={cn('flex items-center gap-3 px-4 py-3', !sel?.selected && 'opacity-50')}>
                    <input
                      type="checkbox"
                      checked={sel?.selected ?? false}
                      disabled={maxQty <= 0}
                      onChange={(e) => setLineSelections((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], selected: e.target.checked },
                      }))}
                      className="size-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--foreground)] truncate">{item.title}</div>
                      <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.sku}</div>
                      {alreadyRefundedQty > 0 && (
                        <div className="text-[10px] text-[var(--danger)]">已退 {alreadyRefundedQty} 件</div>
                      )}
                    </div>
                    {/* 数量选择 */}
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={!sel?.selected || sel.quantity <= 1}
                        onClick={() => setLineSelections((prev) => ({ ...prev, [item.id]: { ...prev[item.id], quantity: prev[item.id].quantity - 1 } }))}
                        className="flex size-6 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:opacity-30"
                      >−</button>
                      <span className="w-8 text-center text-[12px] font-medium">{sel?.quantity ?? 0}</span>
                      <button
                        disabled={!sel?.selected || (sel?.quantity ?? 0) >= maxQty}
                        onClick={() => setLineSelections((prev) => ({ ...prev, [item.id]: { ...prev[item.id], quantity: Math.min(prev[item.id].quantity + 1, maxQty) } }))}
                        className="flex size-6 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:opacity-30"
                      >+</button>
                      <span className="text-[11px] text-[var(--muted)]">/ {maxQty}</span>
                    </div>
                    {/* 小计 */}
                    <div className="w-20 text-right text-[13px] font-medium text-[var(--foreground)]">
                      {fmt(unitNet * (sel?.quantity ?? 0), currency)}
                    </div>
                  </div>
                );
              })}

              {/* 运费退款 */}
              {shippingTotal > 0 && (
                <div className={cn('flex items-center gap-3 px-4 py-3', !refundShipping && 'opacity-50')}>
                  <input
                    type="checkbox"
                    checked={refundShipping}
                    onChange={(e) => setRefundShipping(e.target.checked)}
                    className="size-4 rounded border-[var(--border)] accent-[var(--primary)]"
                  />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[var(--foreground)]">运费</div>
                    <div className="text-[11px] text-[var(--muted)]">原始运费</div>
                  </div>
                  <div className="w-20 text-right text-[13px] font-medium text-[var(--foreground)]">
                    {fmt(shippingTotal, currency)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 退款金额 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--foreground)]">退款金额</span>
              <button
                onClick={() => setUseCustomAmount((v) => !v)}
                className="text-[11px] text-[var(--primary)] hover:underline"
              >
                {useCustomAmount ? '使用自动计算' : '手动输入金额'}
              </button>
            </div>
            {useCustomAmount ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2">
                <span className="text-[var(--muted)]">{currency === 'GBP' ? '£' : currency === 'SGD' ? 'S$' : '$'}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundable}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`最多 ${fmt(maxRefundable, currency)}`}
                  className="flex-1 bg-transparent text-[13px] text-[var(--foreground)] outline-none"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border-subtle)] text-[12px]">
                {lineRefundAmount > 0 && (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-[var(--muted)]">商品退款</span>
                    <span>{fmt(lineRefundAmount, currency)}</span>
                  </div>
                )}
                {refundShipping && (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-[var(--muted)]">运费退款</span>
                    <span>{fmt(shippingRefundAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between bg-[var(--surface-subtle)] px-3 py-2.5 font-semibold">
                  <span className="text-[var(--foreground)]">退款合计</span>
                  <span className="text-[15px] text-[var(--danger)]">{fmt(finalAmount, currency)}</span>
                </div>
              </div>
            )}
            {finalAmount > 0 && (
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                退款后剩余可退：{fmt(maxRefundable - finalAmount, currency)}
              </p>
            )}
          </div>

          {/* 退款类型 — 直接影响成本计算 */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">
              退款类型 <span className="text-[var(--danger)]">*</span>
              <span className="ml-1.5 text-[11px] font-normal text-[var(--muted)]">· 影响利润成本核算</span>
            </label>
            <div className="space-y-2">
              {([
                {
                  value: 'refund_only' as RefundType,
                  label: '仅退款，不退货',
                  sub: '客户保留商品，商品成本不变，毛利损失最大',
                  icon: '💸',
                  costEffect: '成本不变',
                  costColor: 'text-[var(--danger)]',
                },
                {
                  value: 'return_refund' as RefundType,
                  label: '退货退款（商品完好）',
                  sub: '商品退回可二次销售，COGS 冲销，成本回收',
                  icon: '📦',
                  costEffect: '成本冲销',
                  costColor: 'text-[var(--success)]',
                },
                {
                  value: 'return_refund_damaged' as RefundType,
                  label: '退货退款（商品损坏）',
                  sub: '商品退回但已损坏报废，成本无法回收',
                  icon: '🔴',
                  costEffect: '成本不变',
                  costColor: 'text-[var(--danger)]',
                },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                    refundType === opt.value
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-subtle)]'
                  )}
                >
                  <input
                    type="radio"
                    name="refundType"
                    value={opt.value}
                    checked={refundType === opt.value}
                    onChange={() => setRefundType(opt.value)}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <span className="mt-0.5 text-[16px] shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--foreground)]">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">{opt.sub}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ring-[var(--border)]', opt.costColor)}>
                    {opt.costEffect}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 退款原因 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[var(--foreground)]">退款原因 <span className="text-[var(--danger)]">*</span></label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">选择退款原因</option>
              {REFUND_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* 退款方式 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[var(--foreground)]">退款方式</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            >
              {REFUND_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {detail.transactions.length > 0 && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                支付渠道：{detail.transactions[0].gateway} · {detail.transactions[0].method}
              </p>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[var(--foreground)]">备注（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="给客户或内部的退款备注..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4 shrink-0">
          <div className="text-[12px] text-[var(--muted)]">
            可退上限 {fmt(maxRefundable, currency)}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="h-9 rounded-xl border border-[var(--border)] px-5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
              取消
            </button>
            <button
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="h-9 rounded-xl bg-[var(--danger)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认退款 {finalAmount > 0 ? fmt(finalAmount, currency) : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
