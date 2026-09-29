'use client';

import { useState, useMemo } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arKpi, arRows, agingStatusConfig, type ArRow, type ArStatus } from '@/lib/mock-data/ar-ap';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

const tabs = [
  { key: 'all',        label: '全部' },
  { key: 'outstanding',label: '未收款' },
  { key: 'overdue',    label: '逾期' },
  { key: 'collected',  label: '已收款' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

export default function ReceivablesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const filtered = useMemo(() => arRows.filter((r) => {
    if (activeTab === 'outstanding') return r.balanceDue > 0 && !r.agingStatus.startsWith('逾期') && r.agingStatus !== '已收款';
    if (activeTab === 'overdue')     return r.agingStatus.startsWith('逾期');
    if (activeTab === 'collected')   return r.agingStatus === '已收款' || r.agingStatus === '已核销';
    return true;
  }), [activeTab]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:         arRows.length,
    outstanding: arRows.filter((r) => r.balanceDue > 0 && !r.agingStatus.startsWith('逾期') && r.agingStatus !== '已收款').length,
    overdue:     arRows.filter((r) => r.agingStatus.startsWith('逾期')).length,
    collected:   arRows.filter((r) => r.agingStatus === '已收款' || r.agingStatus === '已核销').length,
  }), []);

  const totalOutstanding = arRows.filter((r) => r.balanceDue > 0).reduce((s, r) => s + r.balanceDue, 0);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* 页头 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">应收账款</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">管理客户发票与回款状态 · 监控账龄</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="应收总额"      value={fmt(arKpi.totalReceivable)}       sub="待回款合计" />
        <KpiCard label="逾期应收"      value={fmt(arKpi.overdueAmount)}         sub="需重点催款" warn />
        <KpiCard label="未到期应收"    value={fmt(arKpi.currentAmount)}         sub="正常周期内" />
        <KpiCard label="本月已收款"    value={fmt(arKpi.collectedThisMonth)}    sub="当月到账" success />
      </div>

      {/* 账龄分布条 */}
      <AgingBar items={arKpi.aging} total={arKpi.totalReceivable} />

      {/* 主表格 */}
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          <div className="flex items-center border-b border-[var(--border)] px-5">
            {tabs.map((tab) => {
              const count = counts[tab.key];
              const isActive = tab.key === activeTab;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('relative mr-5 pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                  {tab.label}
                  {count > 0 && <span className={cn('ml-1.5 text-[11px]', tab.key === 'overdue' ? 'text-[var(--danger)]' : 'text-[var(--muted-foreground)]')}>{count}</span>}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">发票号</th>
                <th className="whitespace-nowrap px-3 py-2.5">客户</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道</th>
                <th className="whitespace-nowrap px-3 py-2.5">发票日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">到期日</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">发票金额</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">已收</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">未收余额</th>
                <th className="whitespace-nowrap px-3 py-2.5">账龄</th>
                <th className="whitespace-nowrap px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => <ArTableRow key={row.id} row={row} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">暂无记录</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条记录</span>
          <span>
            未收合计：
            <span className="ml-1 font-semibold text-[var(--foreground)]">
              {fmt(filtered.filter((r) => r.balanceDue > 0).reduce((s, r) => s + r.balanceDue, 0))}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ArTableRow({ row }: { row: ArRow }) {
  const sc = agingStatusConfig[row.agingStatus] ?? agingStatusConfig['未到期'];
  const channelColors: Record<string, string> = {
    Shopify: 'bg-green-50 text-green-700 ring-green-200',
    Amazon:  'bg-orange-50 text-orange-700 ring-orange-200',
    Direct:  'bg-blue-50 text-blue-700 ring-blue-200',
    EDI:     'bg-purple-50 text-purple-700 ring-purple-200',
  };

  return (
    <tr className="hover:bg-[var(--surface-subtle)]">
      <td className="px-4 py-3">
        <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{row.invoiceNo}</div>
        {row.note && <div className="mt-0.5 max-w-[200px] truncate text-[10px] text-amber-600">{row.note}</div>}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium text-[var(--foreground)]">{row.customer}</td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', channelColors[row.channel] ?? 'bg-gray-50 text-gray-600 ring-gray-200')}>
          {row.channel}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.invoiceDate}</td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('text-[12px]', row.overdueDays > 0 ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]')}>
          {row.dueDate}
        </span>
        {row.overdueDays > 0 && <div className="text-[10px] text-[var(--danger)]">逾期 {row.overdueDays} 天</div>}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">{fmt(row.invoiceAmount)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--success)]">
        {row.paidAmount > 0 ? fmt(row.paidAmount) : '—'}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right">
        {row.balanceDue > 0 ? (
          <span className={cn('text-[13px] font-semibold', row.overdueDays > 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
            {fmt(row.balanceDue)}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--success)]">已结清</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
          <span className={cn('size-1.5 rounded-full', sc.dot)} />
          {row.agingStatus}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        {row.balanceDue > 0 && (
          <button className={cn(
            'h-6 rounded-md px-2 text-[11px] font-medium transition',
            row.overdueDays > 0
              ? 'bg-red-50 text-[var(--danger)] hover:bg-red-100'
              : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
          )}>
            {row.overdueDays > 0 ? '催款' : '记录收款'}
          </button>
        )}
      </td>
    </tr>
  );
}

function AgingBar({ items, total }: { items: { label: string; amount: number; cls: string }[]; total: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
      <div className="mb-2 text-[12px] font-semibold text-[var(--muted-foreground)]">账龄分布</div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {items.map((item) => (
          <div key={item.label} className={cn('h-full', item.cls)}
            style={{ width: total > 0 ? `${(item.amount / total) * 100}%` : '0%' }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[12px]">
            <span className={cn('size-2.5 rounded-full', item.cls)} />
            <span className="text-[var(--muted)]">{item.label}</span>
            <span className="font-semibold text-[var(--foreground)]">{fmt(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, warn, success }: { label: string; value: string; sub: string; warn?: boolean; success?: boolean }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      warn ? 'border-amber-200 bg-amber-50' : success ? 'border-emerald-200 bg-emerald-50' : 'border-[var(--border)] bg-[var(--surface)]')}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold', warn ? 'text-amber-700' : success ? 'text-emerald-700' : 'text-[var(--foreground)]')}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}
