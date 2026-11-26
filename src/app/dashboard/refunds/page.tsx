'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Copy, Download, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  refundDocuments, returnOrders,
  refundStatusConfig,
} from '@/lib/mock-data/return-orders';

// ─── 常量 ────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'all',             label: '全部' },
  { key: 'draft',           label: '草稿' },
  { key: 'pending_approval',label: '待审批' },
  { key: 'approved',        label: '已审批' },
  { key: 'processing',      label: '打款中' },
  { key: 'partial_paid',    label: '部分打款' },
  { key: 'paid',            label: '已完成' },
  { key: 'void',            label: '已作废' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

const methodLabels: Record<string, string> = {
  original_payment: '原路返回',
  bank_transfer:    '银行转账',
  store_credit:     '商店积分',
  credit_memo:      '信用票据',
  check:            '支票',
};

function fmt(n: number, currency = 'USD') {
  const sym: Record<string, string> = { GBP: '£', SGD: 'S$', USD: '$' };
  return `${sym[currency] ?? '$'}${Math.abs(n).toFixed(2)}`;
}

// ─── 页面 ─────────────────────────────────────────────────────────────────────

export default function RefundsListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return refundDocuments.filter((rf) => {
      if (activeTab !== 'all' && rf.status !== activeTab) return false;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const r = returnOrders.find((r) => r.id === rf.returnOrderId);
        if (
          !rf.refundNo.toLowerCase().includes(sq) &&
          !(r?.returnNo ?? '').toLowerCase().includes(sq) &&
          !(r?.customerName ?? '').toLowerCase().includes(sq) &&
          !(r?.customerCompany ?? '').toLowerCase().includes(sq)
        ) return false;
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  const counts = {
    all:              refundDocuments.length,
    draft:            refundDocuments.filter((r) => r.status === 'draft').length,
    pending_approval: refundDocuments.filter((r) => r.status === 'pending_approval').length,
    approved:         refundDocuments.filter((r) => r.status === 'approved').length,
    processing:       refundDocuments.filter((r) => r.status === 'processing').length,
    partial_paid:     refundDocuments.filter((r) => r.status === 'partial_paid').length,
    paid:             refundDocuments.filter((r) => r.status === 'paid').length,
    void:             refundDocuments.filter((r) => r.status === 'void').length,
  };

  const totalPendingAmt = refundDocuments
    .filter((r) => ['pending_approval', 'approved'].includes(r.status))
    .reduce((s, r) => s + r.netRefundAmount, 0);
  const totalPaidAmt = refundDocuments
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + r.paidAmount, 0);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">退款管理</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">基于质检结论的退款审批与打款流水跟踪</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <Link href="/dashboard/refunds/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            <Plus className="size-3.5" />新建退款单
          </Link>
        </div>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">退款单总数</div>
          <div className="mt-1 text-[22px] font-bold">{refundDocuments.length}</div>
        </div>
        <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]', counts.pending_approval > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]')}>
          <div className="text-[12px] text-[var(--muted)]">待审批</div>
          <div className={cn('mt-1 text-[22px] font-bold', counts.pending_approval > 0 ? 'text-amber-700' : 'text-[var(--foreground)]')}>
            {counts.pending_approval}
          </div>
          {counts.pending_approval > 0 && (
            <div className="text-[11px] text-amber-600">待审批金额 ${totalPendingAmt.toFixed(2)}</div>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">处理中</div>
          <div className="mt-1 text-[22px] font-bold">{counts.approved + counts.processing}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">已打款金额</div>
          <div className="mt-1 text-[22px] font-bold text-[var(--success)]">${totalPaidAmt.toFixed(2)}</div>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">

        {/* Sticky header */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)] pt-5 lg:pt-6">

          {/* Tabs */}
          <div className="flex items-center border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => {
                const count = counts[tab.key];
                const isActive = tab.key === activeTab;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={cn('relative pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                    {tab.label}
                    {count > 0 && (
                      <span className={cn('ml-1.5 text-[11px]',
                        tab.key === 'pending_approval' ? 'text-amber-600' : 'text-[var(--muted-foreground)]')}>
                        {count}
                      </span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="退款单号 / 退货单号 / 客户"
                className="w-[200px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                  <X className="size-3 text-[var(--muted)]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-2.5">退款单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">关联退货单</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">申请退款</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">核准退款</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">扣减项</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">实际应退</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">已打款</th>
                <th className="whitespace-nowrap px-3 py-2.5">审批人</th>
                <th className="whitespace-nowrap px-3 py-2.5">创建时间</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((rf) => {
                const sc = refundStatusConfig[rf.status];
                const returnOrder = returnOrders.find((r) => r.id === rf.returnOrderId);
                const totalDeductions = rf.restockingFee + rf.shippingDeduction + rf.otherDeductions;
                const remaining = rf.netRefundAmount - rf.paidAmount;

                return (
                  <tr key={rf.id}
                    onClick={() => router.push(`/dashboard/returns/${rf.returnOrderId}/refund?from=refunds-list`)}
                    className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]">

                    {/* 退款单号 */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/returns/${rf.returnOrderId}/refund`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[12px] font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] hover:text-[var(--primary)] hover:underline">
                          {rf.refundNo}
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(rf.refundNo); }}
                          className="rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] group-hover:opacity-100">
                          <Copy className="size-3" />
                        </button>
                      </div>
                      {rf.creditMemoNo && (
                        <div className="mt-0.5 font-mono text-[10px] text-blue-600">CM: {rf.creditMemoNo}</div>
                      )}
                    </td>

                    {/* 关联退货单 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {returnOrder
                        ? <Link href={`/dashboard/returns/${rf.returnOrderId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[12px] text-[var(--primary)] hover:underline">
                            {returnOrder.returnNo}
                          </Link>
                        : <span className="font-mono text-[12px] text-[var(--muted)]">{rf.returnOrderId}</span>}
                      {returnOrder && (
                        <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                          {returnOrder.customerName}
                          {returnOrder.customerCompany && ` · ${returnOrder.customerCompany}`}
                        </div>
                      )}
                    </td>

                    {/* 状态 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                        <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
                      </span>
                      {remaining > 0 && rf.status !== 'pending_approval' && rf.status !== 'approved' && (
                        <div className="mt-0.5 text-[10px] text-amber-600">待打 ${remaining.toFixed(2)}</div>
                      )}
                    </td>

                    {/* 申请 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] text-[var(--muted)]">
                      {fmt(rf.requestedAmount, rf.currency)}
                    </td>
                    {/* 核准 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px]">
                      {rf.approvedAmount > 0
                        ? <span className="font-semibold text-[var(--primary)]">{fmt(rf.approvedAmount, rf.currency)}</span>
                        : <span className="text-[var(--muted)]">待审批</span>}
                    </td>
                    {/* 扣减 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px]">
                      {totalDeductions > 0
                        ? <span className="text-[var(--danger)]">-{fmt(totalDeductions, rf.currency)}</span>
                        : <span className="text-[var(--muted)]">—</span>}
                    </td>
                    {/* 实际应退 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[14px] font-bold text-[var(--foreground)]">
                      {fmt(rf.netRefundAmount, rf.currency)}
                    </td>
                    {/* 已打款 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px]">
                      <span className={cn('font-semibold', rf.paidAmount >= rf.netRefundAmount && rf.paidAmount > 0 ? 'text-[var(--success)]' : rf.paidAmount > 0 ? 'text-amber-600' : 'text-[var(--muted)]')}>
                        {fmt(rf.paidAmount, rf.currency)}
                      </span>
                    </td>
                    {/* 审批人 */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                      {rf.approvedBy ?? '—'}
                    </td>
                    {/* 时间 */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                      {rf.createdAt.slice(0, 10)}
                    </td>
                    {/* 操作 */}
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/returns/${rf.returnOrderId}/refund?from=refunds-list`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] font-medium text-[var(--primary)] opacity-0 transition-opacity hover:underline group-hover:opacity-100">
                        查看
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
                      <svg className="size-5 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-[var(--foreground)]">暂无退款单</p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">质检完成并入库后，可在退货单中创建退款单</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条记录</span>
          <div className="flex items-center gap-4">
            {counts.pending_approval > 0 && <span>待审批 <strong className="text-amber-600">{counts.pending_approval}</strong></span>}
            <span>已打款 <strong className="text-[var(--success)]">${totalPaidAmt.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
