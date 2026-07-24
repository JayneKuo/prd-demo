'use client';

import { createElement, useMemo, useState } from 'react';
import { LogTraceDrawer, copyEventDetails, copyInboundRawData, copyOutboundRawData } from '@/features/developer-logs/log-trace-drawer';
import { salesOrderLogRows } from '@/features/developer-logs/mock-data';
import type { EventLogRow, ExecutionResult } from '@/features/developer-logs/types';
import { cn } from '@/lib/utils';

function renderTab(tab: string) {
  return createElement('button', { key: tab, type: 'button', className: cn('border-b-2 px-0 pb-2.5 text-[13px] font-medium', tab === '全部' ? 'border-[var(--foreground)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]') }, tab);
}

function renderHeaderCell(label: string) {
  return createElement('th', { key: label, className: 'px-5 py-3' }, label);
}

function renderResult(result: ExecutionResult) {
  const resultClass = result === 'Success' ? 'bg-green-50 text-[var(--success)] ring-green-200' : result === 'Failed' ? 'bg-red-50 text-[var(--danger)] ring-red-200' : result === 'Partial Success' ? 'bg-amber-50 text-[var(--warning)] ring-amber-200' : 'bg-blue-50 text-[var(--info)] ring-blue-200';
  return createElement('span', { className: cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', resultClass) }, result);
}

function renderActionCell(row: EventLogRow) {
  return createElement('div', { className: 'flex flex-wrap gap-2' }, ...row.availableActions.map((action) => createElement('span', { key: action, className: 'rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]' }, action)));
}

function renderRow(row: EventLogRow, onSelect: (id: string) => void) {
  return createElement(
    'tr',
    { key: row.id, className: 'cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-subtle)]', onClick: () => onSelect(row.id) },
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.eventTime),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--foreground)] font-semibold' }, row.businessDomain),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--foreground)] font-semibold' }, row.eventType),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.direction),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.sourceSystem),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.targetSystem),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.channelSalesOrderNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.omsSalesOrderNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.purchaseOrderNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.poNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.transferOrderNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.referenceNo || '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.relatedBusinessNo),
    createElement('td', { className: 'px-5 py-3.5' }, renderResult(row.executionResult)),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, String(row.currentAttempt)),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.errorMessage ?? '-'),
    createElement('td', { className: 'px-5 py-3.5 text-[var(--muted)]' }, row.suggestedAction),
    createElement('td', { className: 'px-5 py-3.5' }, renderActionCell(row))
  );
}

export function LogsPageClient({ title = '销售订单 / 出库日志', description = '查看订单、履约、Shipment 与同步事件日志。', rows = salesOrderLogRows, initialSelectedId, initialQuery = '' }: { title?: string; description?: string; rows?: EventLogRow[]; initialSelectedId?: string; initialQuery?: string; }) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(initialSelectedId);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => [row.primaryBusinessNo, row.relatedBusinessNo, row.eventType, row.errorMessage ?? '', row.sourceSystem, row.targetSystem, row.traceId].some((value) => value.toLowerCase().includes(keyword)));
  }, [rows, query]);

  const selected = filteredRows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId);

  return createElement(
    'div',
    { className: 'relative mx-auto max-w-[1440px] pt-5 lg:pt-6' },
    createElement('div', { className: 'mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between' },
      createElement('div', undefined,
        createElement('h1', { className: 'text-[24px] font-semibold tracking-tight text-[var(--foreground)]' }, title),
        createElement('p', { className: 'mt-1 max-w-3xl text-[14px] text-[var(--muted)]' }, description)
      ),
      createElement('div', { className: 'flex shrink-0 items-center gap-2' },
        createElement('button', { type: 'button', className: 'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.98]' }, '导出日志')
      )
    ),
    createElement('div', { className: 'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]' },
      createElement('div', { className: 'flex gap-4 border-b border-[var(--border)] px-4 pt-3' }, ...['全部', '失败', '成功', '处理中'].map(renderTab)),
      createElement('div', { className: 'border-b border-[var(--border-subtle)] px-4 py-3' },
        createElement('input', { value: query, onChange: (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), placeholder: '搜索单号、事件类型、错误信息、系统、Trace ID...', className: 'h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]' })
      ),
      createElement('div', { className: 'overflow-x-auto' },
        createElement('table', { className: 'min-w-full border-collapse text-left text-[13px]' },
          createElement('thead', { className: 'bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]' },
            createElement('tr', undefined, ...['Event Time', 'Business Domain', 'Event Type', 'Direction', 'Source System', 'Target System', 'Channel Sales Order No.', 'OMS SO No.', 'Purchase Order No.', 'PO No.', 'Transfer Order No.', 'Reference No.', 'Related Business No.', 'Execution Result', 'Current Attempt', 'Error Message', 'Suggested Action', 'Action'].map(renderHeaderCell))
          ),
          createElement('tbody', { className: 'divide-y divide-[var(--border-subtle)]' }, ...filteredRows.map((row) => renderRow(row, setSelectedId)))
        )
      )
    ),
    selected ? createElement(LogTraceDrawer, { row: selected, onClose: () => setSelectedId(undefined) }) : null
  );
}

LogsPageClient.copyInboundRawData = copyInboundRawData;
LogsPageClient.copyOutboundRawData = copyOutboundRawData;
LogsPageClient.copyEventDetails = copyEventDetails;
