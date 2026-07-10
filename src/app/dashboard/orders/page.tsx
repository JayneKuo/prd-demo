'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Columns3, Copy, Download, GitBranch, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { orders, type OrderRow } from '@/lib/mock-data/orders';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, getCompanyById, getMerchantByScope, getMerchantsByCompany, getMerchantNamesForScope } from '@/lib/tenant-context';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  applyOrderFilters,
  buildOrderFilterChips,
  normalizeBatchInput,
  type OrderFilterChip,
  type OrderSearchType
} from '@/features/orders/filtering';

// Tabs based on operational scenarios (what does the user need to DO?)
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理', filter: (o: OrderRow) => o.status === '待处理' },
  { key: 'hold', label: '挂起', filter: (o: OrderRow) => o.status === '挂起' || o.status === '保留' },
  { key: 'exception', label: '异常', filter: (o: OrderRow) => o.exception !== '' },
  { key: 'processing', label: '处理中', filter: (o: OrderRow) => o.status === '处理中' },
  { key: 'shipped', label: '已发货', filter: (o: OrderRow) => o.status === '已发货' },
  { key: 'completed', label: '已完成', filter: (o: OrderRow) => o.status === '已完成' },
  { key: 'cancelled', label: '已取消', filter: (o: OrderRow) => o.status === '已取消' }
];

const channelColors: Record<string, string> = {
  'Shopify': 'bg-green-50 text-green-700 ring-green-200',
  'Amazon': 'bg-orange-50 text-orange-700 ring-orange-200',
  'TikTok Shop': 'bg-pink-50 text-pink-700 ring-pink-200',
  'Walmart': 'bg-blue-50 text-blue-700 ring-blue-200'
};

export default function OrdersPage() {
  const router = useRouter();
  const { companyId, merchantScope } = useShellState();
  const canWriteOrders = hasCapability(currentSession.role, 'orders:write');
  const company = getCompanyById(companyId);
  const selectedMerchant = getMerchantByScope(merchantScope);
  const companyMerchants = getMerchantsByCompany(companyId);
  const scopeName = selectedMerchant?.name ?? `${company.name} 全部 merchant`;

  const [activeTab, setActiveTab] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState(ALL_MERCHANTS_SCOPE);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchType, setSearchType] = useState<OrderSearchType>('orderNo');
  const [batchInput, setBatchInput] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  const availableMerchantNames = companyMerchants
    .filter((merchant) => merchantScope === ALL_MERCHANTS_SCOPE || merchant.id === merchantScope)
    .map((merchant) => merchant.name);
  const scopedMerchantNames = getMerchantNamesForScope(companyId, merchantScope);
  const scopedOrders = orders.filter((order) => scopedMerchantNames.includes(order.merchant));
  const batchValues = useMemo(() => normalizeBatchInput(batchInput), [batchInput]);
  const channelOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((order) => order.channel))),
    [scopedOrders]
  );
  const orderStatusOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((order) => order.status))),
    [scopedOrders]
  );
  const paymentStatusOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((order) => order.payment))),
    [scopedOrders]
  );
  const fulfillmentStatusOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((order) => order.fulfillment))),
    [scopedOrders]
  );

  useEffect(() => {
    if (merchantFilter !== ALL_MERCHANTS_SCOPE && !availableMerchantNames.includes(merchantFilter)) {
      setMerchantFilter(ALL_MERCHANTS_SCOPE);
    }
  }, [availableMerchantNames, merchantFilter]);
  const merchantFilteredOrders = merchantFilter === ALL_MERCHANTS_SCOPE ? scopedOrders : scopedOrders.filter((order) => order.merchant === merchantFilter);
  const activeFilter = tabs.find((t) => t.key === activeTab);
  const tabFilteredOrders = activeFilter?.filter
    ? merchantFilteredOrders.filter(activeFilter.filter)
    : merchantFilteredOrders;
  const filteredOrders = useMemo(
    () =>
      applyOrderFilters(tabFilteredOrders, {
        searchType,
        batchValues,
        channel: channelFilter,
        store: '',
        orderStatus: orderStatusFilter,
        paymentStatus: paymentStatusFilter,
        fulfillmentStatus: fulfillmentStatusFilter,
        startDate,
        endDate
      }),
    [
      batchValues,
      channelFilter,
      endDate,
      fulfillmentStatusFilter,
      orderStatusFilter,
      paymentStatusFilter,
      searchType,
      startDate,
      tabFilteredOrders
    ]
  );
  const activeChips = useMemo(
    () =>
      buildOrderFilterChips({
        searchType,
        batchValues,
        channel: channelFilter,
        store: merchantFilter === ALL_MERCHANTS_SCOPE ? '' : merchantFilter,
        orderStatus: orderStatusFilter,
        paymentStatus: paymentStatusFilter,
        fulfillmentStatus: fulfillmentStatusFilter,
        startDate,
        endDate
      }),
    [
      batchValues,
      channelFilter,
      endDate,
      fulfillmentStatusFilter,
      merchantFilter,
      orderStatusFilter,
      paymentStatusFilter,
      searchType,
      startDate
    ]
  );

  const counts = {
    all: merchantFilteredOrders.length,
    pending: merchantFilteredOrders.filter((o) => o.status === '待处理').length,
    hold: merchantFilteredOrders.filter((o) => o.status === '挂起' || o.status === '保留').length,
    exception: merchantFilteredOrders.filter((o) => o.exception !== '').length,
    processing: merchantFilteredOrders.filter((o) => o.status === '处理中').length,
    shipped: merchantFilteredOrders.filter((o) => o.status === '已发货').length,
    completed: merchantFilteredOrders.filter((o) => o.status === '已完成').length,
    cancelled: merchantFilteredOrders.filter((o) => o.status === '已取消').length
  };

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); setJumpPage('1'); }, [filteredOrders.length]);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredOrders.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const clearAllFilters = () => {
    setSearchType('orderNo');
    setBatchInput('');
    setChannelFilter('');
    setMerchantFilter(ALL_MERCHANTS_SCOPE);
    setOrderStatusFilter('');
    setPaymentStatusFilter('');
    setFulfillmentStatusFilter('');
    setStartDate('');
    setEndDate('');
    setSelectedRows(new Set());
  };

  const removeFilterChip = (key: OrderFilterChip['key']) => {
    if (key === 'batch') setBatchInput('');
    if (key === 'channel') setChannelFilter('');
    if (key === 'store') setMerchantFilter(ALL_MERCHANTS_SCOPE);
    if (key === 'orderStatus') setOrderStatusFilter('');
    if (key === 'paymentStatus') setPaymentStatusFilter('');
    if (key === 'fulfillmentStatus') setFulfillmentStatusFilter('');
    if (key === 'dateRange') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">销售订单</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            来自各渠道的订单聚合视图 · {scopeName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3.5" />
            同步
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />
            导出
          </button>
          <Link
            href="/dashboard/orders/new"
            className={cn("flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90", !canWriteOrders && "pointer-events-none opacity-50")}
          >
            <Plus className="size-3.5" />
            新建
          </Link>
        </div>
      </div>

      {/* Batch action bar (shown when rows selected) */}
      {selectedRows.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedRows.size} 项</span>
          <div className="flex items-center gap-2">
            <button className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white">
              <GitBranch className="size-3" />
              生成履约单
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]">
              标记异常
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]">
              取消订单
            </button>
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + filters — sticky */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl pt-5 lg:pt-6 bg-[var(--surface)]">
          {/* Tabs — text link style with underline */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => {
                const count = counts[tab.key as keyof typeof counts] ?? 0;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'relative pb-3 pt-2.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab.label}
                    {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
              <Columns3 className="size-3.5" />
              列设置
            </button>
          </div>

          {/* Filter pills row */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
                <Search className="size-3.5 text-[var(--muted)]" />
                <select
                  value={searchType}
                  onChange={(event) => setSearchType(event.target.value as OrderSearchType)}
                  className="h-full bg-transparent text-[12px] text-[var(--foreground)] outline-none"
                >
                  <option value="orderNo">订单号</option>
                  <option value="platformNo">平台单号</option>
                  <option value="refNo">参考号</option>
                  <option value="customer">客户</option>
                </select>
                <input
                  type="text"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="搜索..."
                  className="w-[140px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                {batchInput && (
                  <button onClick={() => setBatchInput('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                    <X className="size-3 text-[var(--muted)]" />
                  </button>
                )}
              </div>

              {/* Pill filters */}
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', channelFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">渠道</option>
                {channelOptions.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>

              <select
                value={merchantFilter}
                onChange={(e) => { setMerchantFilter(e.target.value); setSelectedRows(new Set()); }}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', merchantFilter !== ALL_MERCHANTS_SCOPE ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value={ALL_MERCHANTS_SCOPE}>店铺</option>
                {availableMerchantNames.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', paymentStatusFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">支付状态</option>
                {paymentStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={fulfillmentStatusFilter}
                onChange={(e) => setFulfillmentStatusFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', fulfillmentStatusFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">履约状态</option>
                {fulfillmentStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <div className="flex h-8 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)]">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[100px] bg-transparent text-[12px] outline-none" />
                <span className="text-[var(--muted)]">—</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[100px] bg-transparent text-[12px] outline-none" />
              </div>

              {activeChips.length > 0 && (
                <button onClick={clearAllFilters} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                  清除筛选
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-[var(--border)]"
                    checked={selectedRows.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="whitespace-nowrap px-3 py-2.5">订单</th>
                <th className="whitespace-nowrap px-3 py-2.5">Ref</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道 / 店铺</th>
                <th className="whitespace-nowrap px-3 py-2.5">客户 / 地区</th>
                <th className="whitespace-nowrap px-3 py-2.5">商品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">金额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">支付</th>
                <th className="whitespace-nowrap px-3 py-2.5">履约</th>
                <th className="whitespace-nowrap px-3 py-2.5">异常</th>
                <th className="whitespace-nowrap px-3 py-2.5">时间</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedOrders.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/dashboard/orders/${row.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-[var(--border)]"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.orderNo}`}
                    />
                  </td>

                  {/* Order No (double line + copy) */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/orders/${row.id}`} className="text-[13px] font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] underline-offset-2 transition-colors hover:text-[var(--primary)] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {row.orderNo}
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.orderNo); }}
                        className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100"
                        title="复制订单号"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-[11px] text-[var(--muted)]">{row.platformNo}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.platformNo); }}
                        className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100"
                        title="复制平台单号"
                      >
                        <Copy className="size-2.5" />
                      </button>
                    </div>
                  </td>

                  {/* Ref No */}
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.refNo ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-[var(--muted)]">{row.refNo}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.refNo); }}
                          className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100"
                          title="复制参考单号"
                        >
                          <Copy className="size-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>

                  {/* Channel + Merchant */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[row.channel] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200')}>
                      {row.channel}
                    </span>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">{row.merchant}</div>
                  </td>

                  {/* Customer + Region */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="text-[13px] text-[var(--foreground)]">{row.customer}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">{row.region}</div>
                  </td>

                  {/* Items with hover tooltip */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="group/items relative">
                      <span className="cursor-default text-[13px] text-[var(--muted)] underline decoration-dotted underline-offset-2">
                        {row.itemsSummary}
                      </span>
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-max max-w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-panel)] group-hover/items:block">
                        <div className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1">商品明细</div>
                        {row.itemsDetail.map((item, i) => (
                          <div key={i} className="text-[12px] text-[var(--foreground)] py-0.5">{item}</div>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">
                    {row.amount}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>

                  {/* Payment */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={row.payment} />
                  </td>

                  {/* Fulfillment */}
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={row.fulfillment} />
                  </td>

                  {/* Exception */}
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.exception ? (
                      <span className="inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                        {row.exception}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                    {row.orderTime}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100">
                      <MoreHorizontal className="size-4 text-[var(--muted)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer — sticky bottom */}
        <div className="sticky -bottom-5 lg:-bottom-6 z-20 flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pb-[calc(0.625rem+20px)] lg:pb-[calc(0.625rem+24px)] text-[13px] text-[var(--muted)]">
          <span>共 {filteredOrders.length} 条</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-[var(--foreground)]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[12px]">条</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="px-1 text-[12px] text-[var(--foreground)]">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <div className="ml-2 flex items-center gap-1">
                <span className="text-[12px]">跳至</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = Math.max(1, Math.min(totalPages, Number(jumpPage)));
                      setCurrentPage(p);
                      setJumpPage(String(p));
                    }
                  }}
                  className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-center text-[12px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
                <span className="text-[12px]">页</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
