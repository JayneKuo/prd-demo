'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderEvent } from '@/lib/mock-data/order-details';

/* ─── 常量 ─── */
const PAGE_SIZE = 10;

/* ─── 事件图标 ─── */
const eventIcon: Record<string, string> = {
  system: '⚙️',
  payment: '💳',
  fulfillment: '📦',
  customer: '👤',
  edit: '✏️',
  risk: '🛡️',
  note: '📝',
  logistics: '🚚',
};

/* ─── 日期格式化 ─── */
function formatDateLabel(dateStr: string): string {
  // dateStr 形如 "2026-06-04 16:31:02"
  const date = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateStr.slice(0, 10);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return '今天';
  if (isSameDay(date, yesterday)) return '昨天';

  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/* ─── 从时间字符串提取日期键（yyyy-mm-dd）─── */
function toDateKey(timeStr: string): string {
  return timeStr.slice(0, 10);
}

/* ─── 单条事件 ─── */
function TimelineEventItem({ event }: { event: OrderEvent }) {
  return (
    <li className="relative">
      {/* 图标圆点 */}
      <span className="absolute -left-[29px] flex size-4 items-center justify-center text-[11px]">
        {eventIcon[event.type] ?? '⚙️'}
      </span>

      {/* 标题 + 时间 */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-medium text-[var(--foreground)]">{event.title}</span>
        <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
          {event.time.slice(11, 16)}
        </span>
      </div>

      {/* 操作人 + 角色 */}
      <div className="mt-0.5 text-[12px] text-[var(--muted)]">
        <span className="font-medium text-[var(--foreground)]">{event.actor}</span>
        {event.actorRole && (
          <span className="ml-1.5 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
            {event.actorRole}
          </span>
        )}
      </div>

      {/* 描述 */}
      {event.description && (
        <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">{event.description}</p>
      )}

      {/* 命中规则标签 */}
      {event.ruleName && (
        <div className="mt-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] ring-1 ring-inset ring-blue-200">
            ⚡ {event.ruleName}
          </span>
        </div>
      )}

      {/* 物流节点标识 */}
      {event.trackingNode && (
        <div className="mt-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
              event.trackingNode === 'delivered' &&
                'bg-green-50 text-[var(--success)] ring-green-200',
              event.trackingNode === 'out_for_delivery' &&
                'bg-amber-50 text-[var(--warning)] ring-amber-200',
              event.trackingNode === 'in_transit' &&
                'bg-blue-50 text-[var(--primary)] ring-blue-200',
              event.trackingNode === 'picked_up' &&
                'bg-[var(--surface-subtle)] text-[var(--foreground)] ring-[var(--border)]'
            )}
          >
            {event.trackingNode === 'delivered' && '✓ 已签收'}
            {event.trackingNode === 'out_for_delivery' && '🛵 派送中'}
            {event.trackingNode === 'in_transit' && '🔄 运输中'}
            {event.trackingNode === 'picked_up' && '📥 已揽收'}
          </span>
        </div>
      )}
    </li>
  );
}

/* ─── 日期分组（带折叠）─── */
interface DateGroupProps {
  dateKey: string;
  events: OrderEvent[];
  defaultOpen: boolean;
}

function DateGroup({ dateKey, events, defaultOpen }: DateGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const label = formatDateLabel(dateKey);

  return (
    <div>
      {/* 分组标题行 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2 py-1.5 text-left"
        aria-expanded={open}
      >
        {/* 日期标签 */}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </span>
        {/* 分隔线 */}
        <span className="h-px flex-1 bg-[var(--border-subtle)]" aria-hidden="true" />
        {/* 事件计数 */}
        <span className="text-[10px] text-[var(--muted)]">{events.length} 条</span>
        {/* 折叠箭头 */}
        <span className="flex size-4 items-center justify-center rounded text-[var(--muted)] transition-colors group-hover:bg-[var(--surface-subtle)] group-hover:text-[var(--foreground)]">
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </span>
      </button>

      {/* 事件列表 */}
      {open && (
        <ol
          className="relative mt-1 mb-4 space-y-4 border-l-2 border-[var(--border-subtle)] pl-6"
          aria-label={`${label} 的操作记录`}
        >
          {events.map((event) => (
            <TimelineEventItem key={event.id} event={event} />
          ))}
        </ol>
      )}

      {/* 折叠占位：折叠时显示收起摘要条 */}
      {!open && (
        <div className="mb-3 ml-1 flex items-center gap-2">
          <div className="h-px flex-1 border-t border-dashed border-[var(--border-subtle)]" />
          <span className="text-[10px] text-[var(--muted)]">已折叠 {events.length} 条</span>
        </div>
      )}
    </div>
  );
}

/* ─── 主组件 Props ─── */
export interface OrderTimelineProps {
  events: OrderEvent[];
  /** 当前 Tab，决定过滤条件 */
  activeTab: '商品明细' | '履约信息' | '物流信息';
}

/* ─── 主组件 ─── */
export function OrderTimeline({ events, activeTab }: OrderTimelineProps) {
  const [page, setPage] = useState(1);

  // Tab 切换时重置到第 1 页
  const prevTabRef = React.useRef(activeTab);
  if (prevTabRef.current !== activeTab) {
    prevTabRef.current = activeTab;
    // 用 ref 做同步重置，避免多余 render
    setPage(1);
  }

  /* 过滤 + 排序（最新在上） */
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (activeTab === '履约信息') return event.type === 'fulfillment';
        if (activeTab === '物流信息') return event.type === 'logistics';
        return true;
      })
      .sort((a, b) => new Date(b.time.replace(' ', 'T')).getTime() - new Date(a.time.replace(' ', 'T')).getTime());
  }, [events, activeTab]);

  const totalCount = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  /* 当前页的事件切片 */
  const pageEvents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, safePage]);

  /* 按日期分组 */
  const dateGroups = useMemo(() => {
    const map = new Map<string, OrderEvent[]>();
    for (const ev of pageEvents) {
      const key = toDateKey(ev.time);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // 返回有序数组（Map 插入顺序即倒序）
    return Array.from(map.entries()) as [string, OrderEvent[]][];
  }, [pageEvents]);

  /* 空状态 */
  if (totalCount === 0) {
    return (
      <div className="py-8 text-center">
        <Package className="mx-auto size-8 text-[var(--border)]" />
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          {activeTab === '物流信息'
            ? '暂无物流跟踪记录 · 发货后将自动生成'
            : '暂无履约决策记录'}
        </p>
      </div>
    );
  }

  const firstDateKey = dateGroups[0]?.[0] ?? '';

  return (
    <div>
      {/* 分组列表 */}
      <div className="space-y-1">
        {dateGroups.map(([dateKey, groupEvents]) => (
          <DateGroup
            key={dateKey}
            dateKey={dateKey}
            events={groupEvents}
            /* 只默认展开第一组（最新日期） */
            defaultOpen={dateKey === firstDateKey}
          />
        ))}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
          {/* 左：条数信息 */}
          <span className="text-[11px] text-[var(--muted)]">
            第 {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)} 条，共 {totalCount} 条
          </span>

          {/* 右：翻页按钮 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex size-6 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="上一页"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            {/* 页码列表 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === safePage;
              // 始终显示首页、末页、当前页及其前后一页；其余用省略号
              const show =
                p === 1 ||
                p === totalPages ||
                Math.abs(p - safePage) <= 1;

              if (!show) {
                // 只在需要时插入一个省略号
                const prevShow =
                  (p - 1) === 1 ||
                  p - 1 === totalPages ||
                  Math.abs(p - 1 - safePage) <= 1;
                if (!prevShow) return null; // 连续省略，不重复
                return (
                  <span key={`ellipsis-${p}`} className="flex size-6 items-center justify-center text-[11px] text-[var(--muted)]">
                    …
                  </span>
                );
              }

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex size-6 items-center justify-center rounded text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--primary)] text-white'
                      : 'border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]'
                  )}
                  aria-label={`第 ${p} 页`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex size-6 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="下一页"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
