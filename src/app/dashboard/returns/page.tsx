'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Download, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { returnOrders, returnStatusConfig, returnTypeLabels, type ReturnStatus, type ReturnType } from '@/lib/mock-data/return-orders';

const tabs = [
  { key: 'all',               label: '全部' },
  { key: 'pending',           label: '待审核' },
  { key: 'in_progress',       label: '处理中' },
  { key: 'completed',         label: '已完成' },
  { key: 'rejected',          label: '已拒绝' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const channelColors: Record<string, string> = {
  Shopify: 'bg-green-50 text-green-700 ring-green-200',
  Amazon: 'bg-orange-50 text-orange-700 ring-orange-200',
  'TikTok Shop': 'bg-pink-50 text-pink-700 ring-pink-200',
  Walmart: 'bg-blue-50 text-blue-700 ring-blue-200',
};

const returnTypeColors: Record<ReturnType, string> = {
  refund_only: 'bg-blue-50 text-blue-700 ring-blue-200',
  return_refund: 'bg-purple-50 text-purple-700 ring-purple-200',
  exchange: 'bg-amber-50 text-amber-700 ring-amber-200',
  recall: 'bg-red-50 text-[var(--danger)] ring-red-200',
};

const inProgressStatuses: ReturnStatus[] = ['authorized', 'label_generated', 'in_transit', 'received', 'inspecting', 'inspection_passed', 'inspection_failed', 'refund_processing'];

function fmt(n: number, currency = 'USD') {
  const sym = currency === 'GBP' ? '£' : currency === 'SGD' ? 'S$' : '$';
  return `${sym}${n.toFixed(2)}`;
}

export default function ReturnsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [typeFilter, setTypeFilter] = useState<'' | ReturnType>('');
  const [channelFilter, setChannelFilter] = useState('');

  const filtered = useMemo(() => {
    return returnOrders.filter((r) => {
      if (activeTab === 'pending' && r.status !== 'pending') return false;
      if (activeTab === 'in_progress' && !inProgressStatuses.includes(r.status)) return false;
      if (activeTab === 'completed' && r.status !== 'completed') return false;
      if (activeTab === 'rejected' && r.status !== 'rejected' && r.status !== 'cancelled') return false;
      if (typeFilter && r.returnType !== typeFilter) return false;
      if (channelFilter && r.channel !== channelFilter) return false;
      return true;
    });
  }, [activeTab, typeFilter, channelFilter]);

  const counts = {
    all: returnOrders.length,
    pending: returnOrders.filter((r) => r.status === 'pending').length,
    in_progress: returnOrders.filter((r) => inProgressStatuses.includes(r.status)).length,
    completed: returnOrders.filter((r) => r.status === 'completed').length,
    rejected: returnOrders.filter((r) => r.status === 'rejected' || r.status === 'cancelled').length,
  };

  const totalPendingAmount = returnOrders.filter((r) => r.status === 'pending').reduce((s, r) => s + r.totalRefundAmount, 0);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* 页头 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">退货 / 售后</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            管理 RMA 退货退款、在途召回及仅退款申请
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />同步
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">退货单总数</div>
          <div className="mt-1 text-[22px] font-bold text-[var(--foreground)]">{returnOrders.length}</div>
        </div>
        <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]', counts.pending > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]')}>
          <div className="text-[12px] text-[var(--muted)]">待审核</div>
          <div className={cn('mt-1 text-[22px] font-bold', counts.pending > 0 ? 'text-amber-700' : 'text-[var(--foreground)]')}>{counts.pending}</div>
          {counts.pending > 0 && <div className="text-[11px] text-amber-600">涉及金额 ${totalPendingAmount.toFixed(2)}</div>}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">处理中</div>
          <div className="mt-1 text-[22px] font-bold text-[var(--foreground)]">{counts.in_progress}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">本月已完成</div>
          <div className="mt-1 text-[22px] font-bold text-[var(--foreground)]">{counts.completed}</div>
        </div>
      </div>

      {/* 主表格 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + 过滤 */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5">
            <div className="flex items-center gap-5">
              {tabs.map((tab) => {
                const count = counts[tab.key];
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn('relative pb-3 pt-2.5 text-[13px] font-medium transition-colors', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}
                  >
                    {tab.label}
                    {count > 0 && <span className={cn('ml-1.5 text-[11px]', tab.key === 'pending' ? 'text-amber-600' : 'text-[var(--muted-foreground)]')}>{count}</span>}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '' | ReturnType)}
                className={cn('h-7 rounded-full border px-3 text-[12px] font-medium outline-none', typeFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')}>
                <option value="">全部类型</option>
                {(Object.entries(returnTypeLabels) as [ReturnType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
                className={cn('h-7 rounded-full border px-3 text-[12px] font-medium outline-none', channelFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')}>
                <option value="">全部渠道</option>
                {['Shopify', 'Amazon', 'TikTok Shop', 'Walmart'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">退货单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">原订单</th>
                <th className="whitespace-nowrap px-3 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道</th>
                <th className="whitespace-nowrap px-3 py-2.5">客户</th>
                <th className="whitespace-nowrap px-3 py-2.5">退货商品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">退款金额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">申请时间</th>
                <th className="w-16 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((ret) => {
                const sc = returnStatusConfig[ret.status];
                const totalQty = ret.lineItems.reduce((s, l) => s + l.quantity, 0);
                return (
                  <tr key={ret.id} onClick={() => router.push(`/dashboard/returns/${ret.id}`)} className="cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{ret.returnNo}</div>
                      {ret.channelReturnId && <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{ret.channelReturnId}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Link href={`/dashboard/orders/${ret.orderId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-[var(--primary)] hover:underline">
                        {ret.orderNo}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', returnTypeColors[ret.returnType])}>
                        {returnTypeLabels[ret.returnType]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[ret.channel] ?? 'bg-gray-50 text-gray-700 ring-gray-200')}>
                        {ret.channel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--foreground)]">{ret.customerName}</td>
                    <td className="px-3 py-3">
                      <div className="max-w-[200px]">
                        {ret.lineItems.slice(0, 2).map((li) => (
                          <div key={li.id} className="truncate text-[12px] text-[var(--muted)]">{li.title} × {li.quantity}</div>
                        ))}
                        {ret.lineItems.length > 2 && <div className="text-[11px] text-[var(--muted-foreground)]">+{ret.lineItems.length - 2} 更多</div>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">
                      {fmt(ret.totalRefundAmount + ret.shippingRefundAmount, ret.currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                        <span className={cn('size-1.5 rounded-full', sc.dot)} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{ret.createdAt.slice(0, 10)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/returns/${ret.id}`} onClick={(e) => e.stopPropagation()} className="text-[12px] font-medium text-[var(--primary)] hover:underline">
                        查看
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center">
                  <Package className="mx-auto size-10 text-[var(--border)]" />
                  <p className="mt-2 text-[13px] text-[var(--muted)]">暂无退货记录</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条退货记录</span>
        </div>
      </div>
    </div>
  );
}
