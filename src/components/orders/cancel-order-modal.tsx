'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { OrderDetail } from '@/lib/mock-data/order-details';

interface Props {
  detail: OrderDetail;
  orderState: { status: string; financialStatus: string; fulfillmentStatus: string };
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const CANCEL_REASONS = [
  '客户主动取消',
  '重复下单',
  '商品缺货',
  '地址无法送达',
  '商品价格错误',
  '客户支付未完成',
  '客户要求修改订单',
  '系统异常',
  '其他',
];

export function CancelOrderModal({ detail, orderState, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);

  const hasFulfillment = detail.fulfillments.length > 0;
  const isPaymentCaptured = ['已支付', '部分退款'].includes(orderState.financialStatus);

  const impacts = [
    { label: '订单状态', before: orderState.status, after: '已取消', always: true },
    hasFulfillment && { label: '履约单', before: `${detail.fulfillments.length} 个`, after: '同步取消', always: false },
    isPaymentCaptured && { label: '支付款项', before: '已支付', after: '需手动发起退款', always: false },
  ].filter(Boolean) as { label: string; before: string; after: string; always: boolean }[];

  const canConfirm = reason && confirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-red-50/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--danger)]" />
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">取消订单</h2>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* 影响范围 */}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">取消将产生以下影响：</p>
            <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border-subtle)] text-[13px]">
              {impacts.map((impact) => (
                <div key={impact.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[var(--muted)]">{impact.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">{impact.before}</span>
                    <span className="text-[var(--muted)]">→</span>
                    <span className={impact.always ? 'font-medium text-[var(--danger)]' : 'font-medium text-amber-600'}>
                      {impact.after}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {isPaymentCaptured && (
              <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                ⚠ 订单已支付 {detail.totalPrice}，取消后请手动发起退款操作。
              </p>
            )}
          </div>

          {/* 取消原因 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[var(--foreground)]">取消原因 <span className="text-[var(--danger)]">*</span></label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--danger)]"
            >
              <option value="">选择取消原因</option>
              {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* 确认复选框 */}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-subtle)]">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 size-4 rounded accent-[var(--danger)]"
            />
            <span className="text-[13px] text-[var(--foreground)]">
              我确认已了解以上影响，确定要取消订单 <strong>{detail.orderNo}</strong>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-xl border border-[var(--border)] px-5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            返回
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => { onConfirm(reason); onClose(); }}
            className="h-9 rounded-xl bg-[var(--danger)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认取消订单
          </button>
        </div>
      </div>
    </div>
  );
}
