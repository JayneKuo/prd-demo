'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentSession } from '@/lib/session-context';
import {
  returnOrders, qcOrders, qcStaffList,
  type RefundDocument, type PaymentTransaction,
} from '@/lib/mock-data/return-orders';

const inputCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');
const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]';

function fmt(n: number, currency = 'USD') {
  return `${{ GBP: '£', SGD: 'S$', USD: '$' }[currency] ?? '$'}${Math.abs(n).toFixed(2)}`;
}

export default function NewRefundPage() {
  const router = useRouter();

  // 来源单据
  const [sourceReturnNo, setSourceReturnNo] = useState('');
  const [qcOrderId, setQcOrderId]           = useState('');

  // 金额
  const [originalPaid, setOriginalPaid]     = useState('');
  const [requestedAmt, setRequestedAmt]     = useState('');
  const [restockingFee, setRestockingFee]   = useState('0');
  const [shippingDeduction, setShipDeduct]  = useState('0');
  const [otherDeductions, setOtherDeduct]   = useState('0');

  // 退款方式
  const [refundMethod, setRefundMethod]     = useState<PaymentTransaction['method']>('original_payment');
  const [currency, setCurrency]             = useState('USD');

  // 依据
  const [refundBasis, setRefundBasis]       = useState('');
  const [approver, setApprover]             = useState(currentSession.name);

  // B2B Credit Memo
  const [creditMemoNo, setCreditMemoNo]     = useState('');

  const [submitting, setSubmitting]         = useState(false);

  // 匹配来源退货单
  const sourceReturn = useMemo(() =>
    returnOrders.find((r) => r.returnNo.toLowerCase() === sourceReturnNo.toLowerCase() || r.id.toLowerCase() === sourceReturnNo.toLowerCase()),
    [sourceReturnNo]
  );

  // 计算净退款额
  const netRefundAmount = Math.max(0,
    Number(requestedAmt) - Number(restockingFee) - Number(shippingDeduction) - Number(otherDeductions)
  );

  const isValid = !!sourceReturnNo.trim() && !!requestedAmt && Number(requestedAmt) > 0 && !!refundBasis.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.push('/dashboard/refunds');
    }, 900);
  };

  const methodLabels: Record<PaymentTransaction['method'], string> = {
    original_payment: '原路返回',
    bank_transfer:    '银行转账',
    store_credit:     '商店积分',
    credit_memo:      '信用票据',
    check:            '支票',
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[960px] pt-5 lg:pt-6">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/refunds" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />退款管理
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-[13px] font-semibold">新建退款单</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/refunds" className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</Link>
          <button type="submit" disabled={!isValid || submitting}
            className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50">
            {submitting ? '创建中…' : '创建退款单（草稿）'}
          </button>
        </div>
      </div>

      {/* ── 来源单据 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">来源单据</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              关联售后申请 <span className="text-[var(--danger)]">*</span>
            </label>
            <input list="return-orders-list" value={sourceReturnNo} onChange={(e) => setSourceReturnNo(e.target.value)}
              placeholder="输入退货单号，如 RET-20260604-0001" className={inputCls} required />
            <datalist id="return-orders-list">
              {returnOrders.map((r) => (
                <option key={r.id} value={r.returnNo}>{r.returnNo} · {r.customerName} · {r.channel}</option>
              ))}
            </datalist>
            {sourceReturn && (
              <div className="mt-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[11px] text-[var(--muted)]">
                客户：<strong className="text-[var(--foreground)]">{sourceReturn.customerName}</strong>
                {sourceReturn.customerCompany && ` · ${sourceReturn.customerCompany}`}
                &nbsp;· 渠道：{sourceReturn.channel} · 状态：{sourceReturn.status}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">关联质检单（选填）</label>
            <input list="qc-orders-list" value={qcOrderId} onChange={(e) => setQcOrderId(e.target.value)}
              placeholder="选择关联质检单" className={inputCls} />
            <datalist id="qc-orders-list">
              {qcOrders.map((q) => <option key={q.id} value={q.qcNo}>{q.qcNo} · {q.qcType}</option>)}
            </datalist>
          </div>
        </div>
      </section>

      {/* ── 金额明细 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">金额明细</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">币种</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
              {['USD', 'GBP', 'SGD', 'EUR', 'CNY'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              原单实付金额
            </label>
            <input type="number" min={0} step={0.01} value={originalPaid} onChange={(e) => setOriginalPaid(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              申请退款金额 <span className="text-[var(--danger)]">*</span>
            </label>
            <input type="number" min={0.01} step={0.01} value={requestedAmt} onChange={(e) => setRequestedAmt(e.target.value)}
              placeholder="0.00" required className={inputCls} />
          </div>

          {/* 扣减项 */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">补货 / 处理费扣减</label>
            <input type="number" min={0} step={0.01} value={restockingFee} onChange={(e) => setRestockingFee(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">运费扣减</label>
            <input type="number" min={0} step={0.01} value={shippingDeduction} onChange={(e) => setShipDeduct(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">其他扣减</label>
            <input type="number" min={0} step={0.01} value={otherDeductions} onChange={(e) => setOtherDeduct(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
        </div>

        {/* 实际应退计算 */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-[var(--foreground)]">实际应退金额 = 申请退款 − 所有扣减</div>
              <div className="text-[11px] text-[var(--muted)]">
                {fmt(Number(requestedAmt) || 0, currency)}
                {(Number(restockingFee) + Number(shippingDeduction) + Number(otherDeductions)) > 0 &&
                  ` − ${fmt(Number(restockingFee) + Number(shippingDeduction) + Number(otherDeductions), currency)}`}
              </div>
            </div>
            <div className={cn('text-[24px] font-bold', netRefundAmount > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted)]')}>
              {fmt(netRefundAmount, currency)}
            </div>
          </div>
        </div>
      </section>

      {/* ── 退款依据 & 审批 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">退款依据 & 审批</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              退款依据 <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea value={refundBasis} onChange={(e) => setRefundBasis(e.target.value)} rows={3}
              placeholder="说明退款原因、质检结论、依据政策等…" required className={cn(inputCls, 'resize-none')} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              退款方式
            </label>
            <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as PaymentTransaction['method'])} className={inputCls}>
              {(Object.entries(methodLabels) as [PaymentTransaction['method'], string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              审批人
            </label>
            <input list="refund-approvers" value={approver} onChange={(e) => setApprover(e.target.value)}
              placeholder="选择或输入审批人" className={inputCls} />
            <datalist id="refund-approvers">
              {qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
            <p className="mt-1 text-[10px] text-[var(--muted)]">默认当前用户，提交后进入待审批状态</p>
          </div>
          {refundMethod === 'credit_memo' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">Credit Memo 编号（选填）</label>
              <input value={creditMemoNo} onChange={(e) => setCreditMemoNo(e.target.value)}
                placeholder="如 CM-20261001-0001" className={inputCls} />
            </div>
          )}
        </div>
      </section>

      {/* 底部提交 */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
        <div className="text-[12px] text-[var(--muted)]">
          {!isValid
            ? (!sourceReturnNo.trim() ? '请选择来源售后申请' : !requestedAmt ? '请填写申请退款金额' : '请填写退款依据')
            : <span className="text-[var(--success)]">✓ 信息完整，创建后进入「待审批」状态</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/refunds" className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-5 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</Link>
          <button type="submit" disabled={!isValid || submitting}
            className="h-9 rounded-lg bg-[var(--primary)] px-6 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50">
            {submitting ? '创建中…' : '创建退款单'}
          </button>
        </div>
      </div>
    </form>
  );
}
