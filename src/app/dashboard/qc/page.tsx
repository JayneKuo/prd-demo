'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Copy, Download, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  qcOrders, returnOrders,
  qcStatusConfig, qcTypeLabels, qcTypeColors, qcPriorityConfig,
} from '@/lib/mock-data/return-orders';

// ─── 质检结论配置 ─────────────────────────────────────────────────────────────

const conclusionConfig = {
  pass:         { label: '全部通过',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  partial_pass: { label: '部分通过',   cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  fail:         { label: '全部不通过', cls: 'bg-red-50 text-[var(--danger)] ring-red-200' },
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { key: 'all',           label: '全部' },
  { key: 'draft',         label: '草稿' },
  { key: 'in_progress',   label: '质检中' },
  { key: 'pending_review',label: '待复核' },
  { key: 'completed',     label: '已完成' },
  { key: 'disputed',      label: '有争议' },
  { key: 'cancelled',     label: '已取消' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

// ─── 页面 ─────────────────────────────────────────────────────────────────────

export default function QCListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return qcOrders.filter((q) => {
      if (activeTab !== 'all' && q.status !== activeTab) return false;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const r = returnOrders.find((r) => r.id === q.returnOrderId);
        if (
          !q.qcNo.toLowerCase().includes(sq) &&
          !(r?.returnNo ?? '').toLowerCase().includes(sq) &&
          !(q.inspector ?? '').toLowerCase().includes(sq) &&
          !(q.task?.assignedTo ?? '').toLowerCase().includes(sq) &&
          !(q.warehouseInfo?.warehouseCode ?? '').toLowerCase().includes(sq)
        ) return false;
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  const counts = {
    all:            qcOrders.length,
    draft:          qcOrders.filter((q) => q.status === 'draft').length,
    in_progress:    qcOrders.filter((q) => q.status === 'in_progress').length,
    pending_review: qcOrders.filter((q) => q.status === 'pending_review').length,
    completed:      qcOrders.filter((q) => q.status === 'completed').length,
    disputed:       qcOrders.filter((q) => q.status === 'disputed').length,
    cancelled:      qcOrders.filter((q) => q.status === 'cancelled').length,
  };

  const totalGood      = qcOrders.filter((q) => q.status === 'completed').reduce((s, q) => s + (q.lineItems?.reduce((n, l) => n + l.goodQty, 0) ?? 0), 0);
  const totalDefective = qcOrders.filter((q) => q.status === 'completed').reduce((s, q) => s + (q.lineItems?.reduce((n, l) => n + l.defectiveQty, 0) ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">质检单</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">退货 / 采购入库 / 日常抽检等质检任务 — per-SKU 检验记录</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <Link href="/dashboard/qc/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">
            <Plus className="size-3.5" />新建质检单
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">质检单总数</div>
          <div className="mt-1 text-[22px] font-bold">{qcOrders.length}</div>
        </div>
        <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]', counts.in_progress > 0 ? 'border-violet-200 bg-violet-50' : 'border-[var(--border)] bg-[var(--surface)]')}>
          <div className="text-[12px] text-[var(--muted)]">进行中</div>
          <div className={cn('mt-1 text-[22px] font-bold', counts.in_progress > 0 ? 'text-violet-700' : 'text-[var(--foreground)]')}>{counts.in_progress}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">已完成 / 累计良品</div>
          <div className="mt-1 text-[22px] font-bold">{counts.completed}</div>
          <div className="text-[11px] text-[var(--success)]">{totalGood} 件良品</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] text-[var(--muted)]">累计次品</div>
          <div className={cn('mt-1 text-[22px] font-bold', totalDefective > 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>{totalDefective}</div>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">

        {/* Sticky header */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)] pt-5 lg:pt-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
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
                        tab.key === 'in_progress' ? 'text-violet-600' : tab.key === 'disputed' ? 'text-amber-600' : 'text-[var(--muted-foreground)]')}>
                        {count}
                      </span>
                    )}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="质检单号 / 来源单据 / 质检员 / 仓库"
                className="w-[220px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
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
                <th className="px-5 py-2.5">质检单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">来源单据</th>
                <th className="whitespace-nowrap px-3 py-2.5">仓库 / 质检区</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">质检结论</th>
                <th className="whitespace-nowrap px-3 py-2.5">优先级</th>
                <th className="whitespace-nowrap px-3 py-2.5">质检员</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">应收</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--success)]">良品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--danger)]">次品</th>
                <th className="whitespace-nowrap px-3 py-2.5">完成时间</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((qc) => {
                const sc          = qcStatusConfig[qc.status];
                const returnOrder = returnOrders.find((r) => r.id === qc.returnOrderId);
                const totalExpected  = qc.lineItems?.reduce((s, l) => s + l.expectedQty, 0) ?? 0;
                const totalGoodQty   = qc.lineItems?.reduce((s, l) => s + l.goodQty, 0) ?? 0;
                const totalDefectQty = qc.lineItems?.reduce((s, l) => s + l.defectiveQty, 0) ?? 0;
                const skuCount       = qc.lineItems?.length ?? 0;

                return (
                  <tr key={qc.id}
                    onClick={() => router.push(`/dashboard/returns/${qc.returnOrderId}/qc?from=qc-list`)}
                    className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]">

                    {/* 质检单号 */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/returns/${qc.returnOrderId}/qc?from=qc-list`} onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[12px] font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] hover:text-[var(--primary)] hover:underline">
                          {qc.qcNo}
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(qc.qcNo); }}
                          className="rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100">
                          <Copy className="size-3" />
                        </button>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{skuCount} 个 SKU</div>
                    </td>

                    {/* 类型 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {qc.qcType
                        ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcTypeColors[qc.qcType])}>{qcTypeLabels[qc.qcType]}</span>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>}
                    </td>

                    {/* 来源单据 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {qc.sourceDoc
                        ? <Link href={qc.sourceDoc.linkPath ?? '#'} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-[var(--primary)] hover:underline">{qc.sourceDoc.docNo}</Link>
                        : returnOrder
                          ? <Link href={`/dashboard/returns/${qc.returnOrderId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-[var(--primary)] hover:underline">{returnOrder.returnNo}</Link>
                          : <span className="text-[11px] text-[var(--muted)]">—</span>}
                      {returnOrder && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{returnOrder.customerName}</div>}
                    </td>

                    {/* 仓库 & 质检区 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {qc.warehouseInfo
                        ? <><div className="text-[12px] font-medium text-[var(--foreground)]">{qc.warehouseInfo.warehouseCode}</div>
                           {qc.warehouseInfo.qcZone && <div className="text-[10px] text-[var(--muted)]">{qc.warehouseInfo.qcZone}</div>}</>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>}
                    </td>

                    {/* 状态 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                        <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
                      </span>
                    </td>

                    {/* 质检结论 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {qc.conclusion
                        ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', conclusionConfig[qc.conclusion].cls)}>{conclusionConfig[qc.conclusion].label}</span>
                        : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                    </td>

                    {/* 优先级 */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {qc.task?.priority
                        ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcPriorityConfig[qc.task.priority].cls)}>{qcPriorityConfig[qc.task.priority].label}</span>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>}
                    </td>

                    {/* 质检员 */}
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--foreground)]">
                      {qc.inspector ?? qc.task?.assignedTo ?? <span className="text-[var(--muted)]">待分配</span>}
                    </td>

                    {/* 应收 */}
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[13px] text-[var(--muted)]">{totalExpected}</td>

                    {/* 良品 */}
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <span className={cn('text-[13px] font-semibold', totalGoodQty > 0 ? 'text-[var(--success)]' : 'text-[var(--muted)]')}>{totalGoodQty}</span>
                    </td>

                    {/* 次品 */}
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <span className={cn('text-[13px] font-semibold', totalDefectQty > 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>{totalDefectQty}</span>
                    </td>

                    {/* 完成时间 */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                      {qc.completedAt?.slice(0, 10) ?? '—'}
                    </td>

                    {/* 操作 */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link href={`/dashboard/returns/${qc.returnOrderId}/qc?from=qc-list`} onClick={(e) => e.stopPropagation()}
                          className="text-[12px] font-medium text-[var(--primary)] hover:underline">
                          查看
                        </Link>
                        {['draft', 'in_progress'].includes(qc.status) && (
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('确认取消此质检单？')) { /* mock delete */ alert('已取消（模拟）'); } }}
                            className="text-left text-[12px] font-medium text-[var(--danger)] hover:underline">
                            取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-14 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
                      <svg className="size-5 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-[var(--foreground)]">暂无质检单</p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">售后申请签收后，在详情页创建质检单</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条记录</span>
          <div className="flex items-center gap-4">
            {counts.in_progress > 0 && <span>质检中 <strong className="text-violet-600">{counts.in_progress}</strong></span>}
            {counts.pending_review > 0 && <span>待复核 <strong className="text-blue-600">{counts.pending_review}</strong></span>}
            <span>已完成 <strong className="text-[var(--foreground)]">{counts.completed}</strong></span>
            {counts.disputed > 0 && <span>有争议 <strong className="text-amber-600">{counts.disputed}</strong></span>}
          </div>
        </div>
      </div>
    </div>
  );
}
