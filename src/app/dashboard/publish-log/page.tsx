'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { mockPublishLogs, type PublishLogEntry } from '@/lib/mock-data/products';
import { cn } from '@/lib/utils';

const channelColors: Record<string, string> = {
  Shopify: 'bg-green-50 text-green-700 ring-green-200',
  SHEIN: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const actionColors: Record<string, string> = {
  发布: 'bg-blue-50 text-blue-700 ring-blue-200',
  更新: 'bg-purple-50 text-purple-700 ring-purple-200',
  下架: 'bg-gray-50 text-[var(--muted)] ring-gray-200',
  同步: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

const tabs = [
  { key: 'all', label: '全部' },
  { key: '成功', label: '成功' },
  { key: '失败', label: '失败' },
  { key: '处理中', label: '处理中' },
];

export default function PublishLogPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filtered = useMemo(() => {
    return mockPublishLogs.filter((log) => {
      if (activeTab !== 'all' && log.status !== activeTab) return false;
      if (channelFilter && log.channel !== channelFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!log.productTitle.toLowerCase().includes(q) && !log.productId.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, search, channelFilter, actionFilter]);

  const counts = useMemo(() => ({
    all: mockPublishLogs.length,
    '成功': mockPublishLogs.filter((l) => l.status === '成功').length,
    '失败': mockPublishLogs.filter((l) => l.status === '失败').length,
    '处理中': mockPublishLogs.filter((l) => l.status === '处理中').length,
  }), []);

  const clearFilters = () => {
    setSearch('');
    setChannelFilter('');
    setActionFilter('');
  };

  const hasFilters = search || channelFilter || actionFilter;

  return (
    <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">发布记录</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">查看商品发布到 Shopify、SHEIN 等渠道的历史操作记录</p>
        </div>
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
          <RefreshCw className="size-3.5" />
          刷新
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '全部记录', value: counts.all, color: 'text-[var(--foreground)]' },
          { label: '发布成功', value: counts['成功'], color: 'text-green-600' },
          { label: '发布失败', value: counts['失败'], color: 'text-[var(--danger)]' },
          { label: '处理中', value: counts['处理中'], color: 'text-[var(--primary)]' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[12px] text-[var(--muted)]">{stat.label}</p>
            <p className={cn('mt-1 text-[22px] font-semibold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Sticky header */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-5">
            {tabs.map((tab) => {
              const count = counts[tab.key as keyof typeof counts] ?? 0;
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn('relative mr-5 pb-3 pt-4 text-[13px] font-medium transition-colors', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}
                >
                  {tab.label}
                  {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-2">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商品名称..."
                className="w-[160px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                  <X className="size-3 text-[var(--muted)]" />
                </button>
              )}
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none', channelFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
            >
              <option value="">渠道</option>
              <option value="Shopify">Shopify</option>
              <option value="SHEIN">SHEIN</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none', actionFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
            >
              <option value="">操作类型</option>
              <option value="发布">发布</option>
              <option value="更新">更新</option>
              <option value="同步">同步</option>
              <option value="下架">下架</option>
            </select>

            {hasFilters && (
              <button onClick={clearFilters} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                清除筛选
              </button>
            )}
            <span className="ml-auto text-[12px] text-[var(--muted)]">共 {filtered.length} 条</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">商品</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道</th>
                <th className="whitespace-nowrap px-3 py-2.5">操作</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">操作人</th>
                <th className="whitespace-nowrap px-3 py-2.5">变体数</th>
                <th className="whitespace-nowrap px-3 py-2.5">开始时间</th>
                <th className="whitespace-nowrap px-3 py-2.5">耗时</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-[13px] text-[var(--muted)]">没有符合条件的发布记录</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <PublishLogRow
                    key={log.id}
                    log={log}
                    onClickProduct={() => router.push(`/dashboard/products/${log.productId}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 条记录</span>
        </div>
      </div>
    </div>
  );
}

function PublishLogRow({ log, onClickProduct }: { log: PublishLogEntry; onClickProduct: () => void }) {
  return (
    <tr className="group transition-colors hover:bg-[var(--surface-subtle)]">
      {/* Product */}
      <td className="px-4 py-3">
        <button
          onClick={onClickProduct}
          className="text-[13px] font-medium text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] hover:text-[var(--primary)] hover:underline underline-offset-2"
        >
          {log.productTitle}
        </button>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">{log.productId}</p>
      </td>

      {/* Channel */}
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[log.channel] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200')}>
          {log.channel}
        </span>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{log.merchantName}</p>
      </td>

      {/* Action */}
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', actionColors[log.action] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200')}>
          {log.action}
        </span>
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="flex items-center gap-1.5">
          {log.status === '成功' && <CheckCircle2 className="size-4 text-green-500" />}
          {log.status === '失败' && <AlertCircle className="size-4 text-[var(--danger)]" />}
          {log.status === '处理中' && <Loader2 className="size-4 animate-spin text-[var(--primary)]" />}
          <span className={cn('text-[13px] font-medium', log.status === '成功' ? 'text-green-600' : log.status === '失败' ? 'text-[var(--danger)]' : 'text-[var(--primary)]')}>
            {log.status}
          </span>
        </div>
        {log.status === '失败' && log.errorMessage && (
          <p className="mt-1 max-w-[280px] text-[11px] text-[var(--danger)] line-clamp-2" title={log.errorMessage}>
            {log.errorMessage}
          </p>
        )}
      </td>

      {/* Operator */}
      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{log.operator}</td>

      {/* Variant count */}
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[var(--foreground)]">{log.variantCount}</td>

      {/* Started at */}
      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{log.startedAt}</td>

      {/* Duration */}
      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
        {log.status === '处理中' ? (
          <span className="text-[var(--primary)]">进行中...</span>
        ) : (
          log.duration ?? '—'
        )}
      </td>
    </tr>
  );
}
