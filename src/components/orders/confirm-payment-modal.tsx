'use client';

import { AlertTriangle, CreditCard, X } from 'lucide-react';
import type { OrderDetail } from '@/lib/mock-data/order-details';

interface Props {
  detail: OrderDetail;
  orderState: { financialStatus: string };
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmPaymentModal({ detail, orderState, onConfirm, onClose }: Props) {
  const txn = detail.transactions.find((t) => t.kind === 'authorization' || t.kind === 'sale');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-[var(--primary)]" />
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">确认支付</h2>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* 支付信息 */}
          <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border-subtle)] text-[13px]">
            <div className="flex justify-between px-4 py-3">
              <span className="text-[var(--muted)]">支付网关</span>
              <span className="font-medium text-[var(--foreground)]">{detail.paymentGateway}</span>
            </div>
            {txn && (
              <>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-[var(--muted)]">支付方式</span>
                  <span className="font-medium text-[var(--foreground)]">{txn.method}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-[var(--muted)]">授权状态</span>
                  <span className={txn.status === 'success' ? 'font-medium text-[var(--success)]' : 'font-medium text-amber-600'}>
                    {txn.status === 'success' ? '授权成功' : txn.status === 'pending' ? '授权待确认' : txn.status}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-[var(--muted)]">授权时间</span>
                  <span className="text-[var(--foreground)]">{txn.createdAt}</span>
                </div>
                {txn.gatewayReference && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-[var(--muted)]">网关流水号</span>
                    <span className="font-mono text-[12px] text-[var(--foreground)]">{txn.gatewayReference}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between bg-[var(--surface-subtle)] px-4 py-3">
              <span className="font-semibold text-[var(--foreground)]">订单总额</span>
              <span className="text-[15px] font-bold text-[var(--foreground)]">{detail.totalPrice}</span>
            </div>
          </div>

          {/* 确认说明 */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="text-[12px] text-amber-700 space-y-1">
              <p className="font-semibold">确认后将执行：</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>将支付状态标记为&quot;已支付&quot;</li>
                <li>订单进入待处理队列，可生成履约单</li>
                <li>如支付网关已授权，将自动触发扣款</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-xl border border-[var(--border)] px-5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            取消
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90"
          >
            确认支付 {detail.totalPrice}
          </button>
        </div>
      </div>
    </div>
  );
}
