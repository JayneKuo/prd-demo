'use client';

import { useState, useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apKpi, apRows, apStatusConfig, type ApRow, type ApStatus } from '@/lib/mock-data/ar-ap';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

const tabs = [
  { key: 'all',       label: '全部' },
  { key: '待审批',    label: '待审批' },
  { key: '待付款',    label: '待付款' },
  { key: '有争议',    label: '有争议' },
  { key: '已付款',    label: '已付款' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

export default function PayablesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const filtered = useMemo(() => apRows.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  }), [activeTab]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:    apRows.length,
    '待审批': apRows.filter((r) => r.status === '待审批').length,
    '待付款': apRows.filter((r) => r.status === '待付款' || r.status === '已审批').length,
    '有争议': apRows.filter((r) => r.status === '有争议').length,
    '已付款': apRows.filter((r) => r.status === '已付款').length,
  }), []);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* 页头 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">应付账款</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">管理供应商账单与付款状态 · 审批流程</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            <Plus className="size-3.5" />录入账单
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="应付总额"      value={fmt(apKpi.totalPayable)}       sub="未付余额合计" />
        <KpiCard label="逾期应付"      value={fmt(apKpi.overdueAmount)}      sub="需立即处理" warn />
        <KpiCard label="本周到期"      value={fmt(apKpi.dueThisWeek)}        sub="即将到期" caution />
        <KpiCard label="本月已付款"    value={fmt(apKpi.paidThisMonth)}      sub="当月支出" success />
      </div>

      {/* 主表格 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
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
                  {count > 0 && (
                    <span className={cn('ml-1.5 text-[11px]',
                      tab.key === '有争议' ? 'text-[var(--danger)]' :
                      tab.key === '待审批' ? 'text-amber-600' : 'text-[var(--muted-foreground)]')}>
                      {count}
                    </span>
                  )}
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
                <th className="whitespace-nowrap px-4 py-2.5">账单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">供应商</th>
                <th className="whitespace-nowrap px-3 py-2.5">费用类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">账单日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">到期日</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">账单金额</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">已付</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">未付余额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((row) => <ApTableRow key={row.id} row={row} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">暂无记录</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条记录</span>
          <span>
            未付合计：
            <span className="ml-1 font-semibold text-[var(--foreground)]">
              {fmt(filtered.filter((r) => r.balanceDue > 0).reduce((s, r) => s + r.balanceDue, 0))}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ApTableRow({ row }: { row: ApRow }) {
  const sc = apStatusConfig[row.status];
  const categoryColors: Record<string, string> = {
    '仓储费': 'bg-blue-50 text-blue-700 ring-blue-200',
    '运输费': 'bg-purple-50 text-purple-700 ring-purple-200',
    '平台费': 'bg-orange-50 text-orange-700 ring-orange-200',
    '清关费': 'bg-gray-50 text-gray-600 ring-gray-200',
  };

  const actionMap: Record<ApStatus, { label: string; cls: string } | null> = {
    '待审批': { label: '审批', cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    '已审批': { label: '付款', cls: 'bg-[var(--primary)] text-white hover:opacity-90' },
    '待付款': { label: '付款', cls: 'bg-[var(--primary)] text-white hover:opacity-90' },
    '有争议': { label: '处理', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '逾期':   { label: '立即付款', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '已付款': null,
  };
  const action = actionMap[row.status];

  return (
    <tr className="hover:bg-[var(--surface-subtle)]">
      <td className="px-4 py-3">
        <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{row.billNo}</div>
        {row.note && <div className="mt-0.5 max-w-[200px] truncate text-[10px] text-amber-600">{row.note}</div>}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium text-[var(--foreground)]">{row.vendor}</td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', categoryColors[row.category] ?? 'bg-gray-50 text-gray-600 ring-gray-200')}>
          {row.category}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.billDate}</td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('text-[12px]', row.overdueDays > 0 ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]')}>
          {row.dueDate}
        </span>
        {row.overdueDays > 0 && <div className="text-[10px] text-[var(--danger)]">逾期 {row.overdueDays} 天</div>}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">{fmt(row.billAmount)}</td>
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
          {row.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        {action && (
          <button className={cn('h-6 rounded-md px-2 text-[11px] font-medium transition', action.cls)}>
            {action.label}
          </button>
        )}
      </td>
    </tr>
  );
}

function KpiCard({ label, value, sub, warn, caution, success }: {
  label: string; value: string; sub: string; warn?: boolean; caution?: boolean; success?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      warn    ? 'border-red-200 bg-red-50' :
      caution ? 'border-amber-200 bg-amber-50' :
      success ? 'border-emerald-200 bg-emerald-50' :
      'border-[var(--border)] bg-[var(--surface)]')}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold',
        warn    ? 'text-red-700' :
        caution ? 'text-amber-700' :
        success ? 'text-emerald-700' :
        'text-[var(--foreground)]')}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}
