'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Columns3, Copy, Download, Plus, RefreshCw, Search, X, Printer } from 'lucide-react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { outboundOrders, type OutboundRow } from '@/lib/mock-data/outbound';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, getCompanyById, getMerchantByScope, getMerchantsByCompany, getMerchantNamesForScope } from '@/lib/tenant-context';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  applyOutboundFilters,
  buildOutboundFilterChips,
  normalizeBatchInput,
  type OutboundFilterChip,
  type OutboundSearchType
} from '@/features/outbound/filtering';

// Tabs based on outbound workflow stages
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待出库', filter: (o: OutboundRow) => o.status === '待出库' },
  { key: 'processing', label: '出库中', filter: (o: OutboundRow) => o.status === '出库中' },
  { key: 'shipped', label: '已出库', filter: (o: OutboundRow) => o.status === '已出库' },
  { key: 'exception', label: '异常', filter: (o: OutboundRow) => o.exception !== '' },
  { key: 'cancelled', label: '已取消', filter: (o: OutboundRow) => o.status === '已取消' }
];

const warehouseColors: Record<string, string> = {
  'US-West-LAX': 'bg-blue-50 text-blue-700 ring-blue-200',
  'US-West-SEA': 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  'US-East-EWR': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'US-Central-DFW': 'bg-violet-50 text-violet-700 ring-violet-200',
  'SG-Central': 'bg-green-50 text-green-700 ring-green-200',
  'UK-London': 'bg-orange-50 text-orange-700 ring-orange-200'
};

export default function OutboundPage() {
  const router = useRouter();
  const { companyId, merchantScope } = useShellState();
  const canWriteInventory = hasCapability(currentSession.role, 'inventory:write');
  const company = getCompanyById(companyId);
  const selectedMerchant = getMerchantByScope(merchantScope);
  const scopeName = selectedMerchant?.name ?? `${company.name} 全部仓库`;

  const [activeTab, setActiveTab] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState(ALL_MERCHANTS_SCOPE);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchType, setSearchType] = useState<OutboundSearchType>('outboundNo');
  const [batchInput, setBatchInput] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [outboundStatusFilter, setOutboundStatusFilter] = useState('');
  const [outboundTypeFilter, setOutboundTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  const companyMerchants = getMerchantsByCompany(companyId);
  const availableMerchantNames = companyMerchants
    .filter((merchant) => merchantScope === ALL_MERCHANTS_SCOPE || merchant.id === merchantScope)
    .map((merchant) => merchant.name);
  const scopedMerchantNames = getMerchantNamesForScope(companyId, merchantScope);
  const scopedOrders = outboundOrders.filter((order) => scopedMerchantNames.includes(order.merchant));
  const batchValues = useMemo(() => normalizeBatchInput(batchInput), [batchInput]);

  const warehouseOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((o) => o.warehouse))),
    [scopedOrders]
  );
  const carrierOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((o) => o.carrier))),
    [scopedOrders]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((o) => o.status))),
    [scopedOrders]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(scopedOrders.map((o) => o.outboundType))),
    [scopedOrders]
  );

  useEffect(() => {
    if (merchantFilter !== ALL_MERCHANTS_SCOPE && !availableMerchantNames.includes(merchantFilter)) {
      setMerchantFilter(ALL_MERCHANTS_SCOPE);
    }
  }, [availableMerchantNames, merchantFilter]);

  const merchantFilteredOrders = merchantFilter === ALL_MERCHANTS_SCOPE
    ? scopedOrders
    : scopedOrders.filter((order) => order.merchant === merchantFilter);

  const activeFilter = tabs.find((t) => t.key === activeTab);
  const tabFilteredOrders = activeFilter?.filter
    ? merchantFilteredOrders.filter(activeFilter.filter)
    : merchantFilteredOrders;

  const filteredOrders = useMemo(
    () =>
      applyOutboundFilters(tabFilteredOrders, {
        searchType,
        batchValues,
        warehouse: warehouseFilter,
        carrier: carrierFilter,
        outboundStatus: outboundStatusFilter,
        outboundType: outboundTypeFilter,
        startDate,
        endDate
      }),
    [batchValues, carrierFilter, endDate, outboundStatusFilter, outboundTypeFilter, searchType, startDate, tabFilteredOrders, warehouseFilter]
  );

  const activeChips = useMemo(
    () =>
      buildOutboundFilterChips({
        searchType,
        batchValues,
        warehouse: warehouseFilter,
        carrier: carrierFilter,
        outboundStatus: outboundStatusFilter,
        outboundType: outboundTypeFilter,
        startDate,
        endDate
      }),
    [batchValues, carrierFilter, endDate, outboundStatusFilter, outboundTypeFilter, searchType, startDate, warehouseFilter]
  );

  const counts = {
    all: merchantFilteredOrders.length,
    pending: merchantFilteredOrders.filter((o) => o.status === '待出库').length,
    processing: merchantFilteredOrders.filter((o) => o.status === '出库中').length,
    shipped: merchantFilteredOrders.filter((o) => o.status === '已出库').length,
    exception: merchantFilteredOrders.filter((o) => o.exception !== '').length,
    cancelled: merchantFilteredOrders.filter((o) => o.status === '已取消').length
  };

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    setSearchType('outboundNo');
    setBatchInput('');
    setWarehouseFilter('');
    setCarrierFilter('');
    setMerchantFilter(ALL_MERCHANTS_SCOPE);
    setOutboundStatusFilter('');
    setOutboundTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSelectedRows(new Set());
  };

  const removeFilterChip = (key: OutboundFilterChip['key']) => {
    if (key === 'batch') setBatchInput('');
    if (key === 'warehouse') setWarehouseFilter('');
    if (key === 'carrier') setCarrierFilter('');
    if (key === 'outboundStatus') setOutboundStatusFilter('');
    if (key === 'outboundType') setOutboundTypeFilter('');
    if (key === 'dateRange') { setStartDate(''); setEndDate(''); }
  };

  return (
    <div className="mx-auto max-w-[1600px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">出库单</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            仓库出库执行管理 · {scopeName}
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
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
            <Printer className="size-3.5" />
            批量打印
          </button>
          <Link
            href="/dashboard/outbound/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            新建
          </Link>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedRows.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedRows.size} 项</span>
          <div className="flex items-center gap-2">
            <button className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white">
              <Printer className="size-3" />
              打印拣货单
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]">
              分配波次
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]">
              批量确认出库
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]">
              取消出库
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
          {/* Tabs */}
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
                  onChange={(e) => setSearchType(e.target.value as OutboundSearchType)}
                  className="h-full bg-transparent text-[12px] text-[var(--foreground)] outline-none"
                >
                  <option value="outboundNo">出库单号</option>
                  <option value="sourceNo">来源单号</option>
                  <option value="wmsOutboundNo">WMS单号</option>
                  <option value="channelOrderNo">渠道单号</option>
                  <option value="referenceNo">采购单号</option>
                  <option value="trackingNo">运单号</option>
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
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', warehouseFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">仓库</option>
                {warehouseOptions.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>

              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', carrierFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">承运商</option>
                {carrierOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={outboundTypeFilter}
                onChange={(e) => setOutboundTypeFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', outboundTypeFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">出库类型</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
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
            <div className="flex items-center gap-2" />
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
                <th className="whitespace-nowrap px-3 py-2.5">出库单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">出库类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">来源单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">采购单号</th>
                <th className="whitespace-nowrap px-3 py-2.5">仓库</th>
                <th className="whitespace-nowrap px-3 py-2.5">作业状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">承运商</th>
                <th className="whitespace-nowrap px-3 py-2.5">商品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">件数</th>
                <th className="whitespace-nowrap px-3 py-2.5">异常</th>
                <th className="whitespace-nowrap px-3 py-2.5">时间</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedOrders.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/dashboard/outbound/${row.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-[var(--border)]"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.outboundNo}`}
                    />
                  </td>

                  {/* Outbound No */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/outbound/${row.id}`} className="text-[13px] font-semibold text-[color-mix(in_srgb,var(--primary)_72%,var(--foreground))] underline-offset-2 transition-colors hover:text-[var(--primary)] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {row.outboundNo}
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.outboundNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-3" /></button>
                    </div>
                  </td>

                  {/* 状态 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>

                  {/* 出库类型 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                      row.outboundType === '销售出库' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                      row.outboundType === '调拨出库' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                      'bg-gray-50 text-[var(--muted)] ring-gray-200'
                    )}>
                      {row.outboundType}
                    </span>
                  </td>

                  {/* 来源单号 + 履约单号 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {row.sourceNo ? (
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/orders/${row.sourceNo}`} className="text-[12px] text-[var(--primary)] underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>{row.sourceNo}</Link>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.sourceNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    ) : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                    {row.fulfillmentNo && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[11px] text-[var(--muted)]">{row.fulfillmentNo}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.fulfillmentNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    )}
                  </td>

                  {/* 渠道单号 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {row.channelOrderNo ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-[var(--foreground)]">{row.channelOrderNo}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.channelOrderNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    ) : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                  </td>

                  {/* 采购单号 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {row.referenceNo ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-[var(--foreground)]">{row.referenceNo}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.referenceNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    ) : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                  </td>

                  {/* 仓库 (仓库名 + 仓库单号) */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', warehouseColors[row.warehouse] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200')}>
                      {row.warehouse}
                    </span>
                    {row.wmsOutboundNo && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[11px] text-[var(--muted)]">{row.wmsOutboundNo}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.wmsOutboundNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    )}
                  </td>

                  {/* 作业状态 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <StatusBadge status={row.wmsStatus} />
                  </td>

                  {/* 承运商 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="text-[12px] text-[var(--foreground)]">{row.carrier}</div>
                    {row.trackingNo && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[11px] text-[var(--muted)]">{row.trackingNo}</span>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.trackingNo); }} className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100" title="复制"><Copy className="size-2.5" /></button>
                      </div>
                    )}
                  </td>

                  {/* 商品 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="group/items relative">
                      <span className="cursor-default text-[12px] text-[var(--muted)] underline decoration-dotted underline-offset-2">
                        {row.itemsSummary}
                      </span>
                      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-max max-w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-panel)] group-hover/items:block">
                        <div className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1">商品明细</div>
                        {row.itemsDetail.map((item, i) => (
                          <div key={i} className="text-[12px] text-[var(--foreground)] py-0.5">{item}</div>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* 件数 */}
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] font-medium text-[var(--foreground)]">
                    {row.totalQty}
                  </td>

                  {/* 异常 */}
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {row.exception ? (
                      <div className="group/exc relative">
                        <span className="inline-flex max-w-[80px] truncate rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                          {row.exception}
                        </span>
                        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 hidden w-max max-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--foreground)] shadow-[var(--shadow-panel)] group-hover/exc:block">
                          {row.exception}
                        </div>
                      </div>
                    ) : <span className="text-[11px] text-[var(--muted-foreground)]">—</span>}
                  </td>

                  {/* Time */}
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                    {row.shippedAt || row.createdAt}
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

        {/* Footer */}
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
