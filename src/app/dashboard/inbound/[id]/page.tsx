'use client';

import Link from 'next/link';
import React, { useState, useCallback } from 'react';
import { ArrowLeft, Copy, Check, Package, Truck, AlertTriangle, Clock3, MapPin, FileText, CheckCircle2, Circle, Tag, ClipboardCheck } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { inboundOrders } from '@/lib/mock-data/inbound';
import { cn } from '@/lib/utils';
import { INTERNAL_LINK_LABELS, INTERNAL_LINK_ROUTES } from '@/lib/types/references';

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button type="button" onClick={handleCopy}
      className="ml-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]" title="复制">
      {copied ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
    </button>
  );
}

/* ─── Lifecycle ─── */
const lifecycleLabels = ['创建', '收货', '质检', '上架'] as const;

type LifecycleStep = {
  label: (typeof lifecycleLabels)[number];
  status: 'complete' | 'current' | 'upcoming';
  detail: string;
};

function getLifecycleSteps(row: typeof inboundOrders[0]): LifecycleStep[] {
  let cur = 0;
  if (row.status === '已取消') { cur = -1; }
  else if (row.wmsStatus === '已上架' || row.status === '已入库') { cur = 3; }
  else if (row.wmsStatus === '上架中') { cur = 3; }
  else if (row.qcStatus === '质检中' || row.qcStatus === '质检通过' || row.qcStatus === '质检不通过' || row.wmsStatus === '质检中') { cur = 2; }
  else if (row.wmsStatus === '收货中' || row.arrivedAt) { cur = 1; }
  else if (row.wmsStatus === '待收货' || row.pushStatus === 'success') { cur = 0; }

  const details: string[] = [
    row.createdAt ? row.createdAt.slice(0, 11) : '',
    cur >= 1 ? (row.arrivedAt ? `到货 ${row.arrivedAt}` : row.receiver ? `收货员: ${row.receiver}` : '收货中') : '',
    cur >= 2 ? (row.qcStatus === '质检通过' ? '✓ 通过' : row.qcStatus === '质检不通过' ? '✗ 不通过' : row.qcOperator ? `${row.qcStatus} · ${row.qcOperator}` : row.qcStatus) : '',
    cur >= 3 ? (row.completedAt ? row.completedAt.slice(0, 11) : row.putawayOperator ? `${row.putawayOperator}` : '上架中') : '',
  ];

  return lifecycleLabels.map((label, i) => ({
    label,
    status: (cur < 0 ? 'upcoming' : i < cur ? 'complete' : i === cur ? 'current' : 'upcoming') as 'complete' | 'current' | 'upcoming',
    detail: details[i] || '',
  }));
}

/* ─── Timeline Events ─── */
type Evt = { id: string; time: string; actor: string; title: string; desc?: string; type: 'system' | 'warehouse' | 'quality' | 'exception' };
const evtIcon: Record<string, string> = { system: '⚙️', warehouse: '📦', quality: '🔍', exception: '⚠️' };

function buildEvents(row: typeof inboundOrders[0]): Evt[] {
  const e: Evt[] = [];
  const wmsRef = row.externalRefs.find(r => r.type === 'wms_inbound');
  e.push({ id: '1', time: row.createdAt, actor: '系统', title: '入库单创建', desc: `来源: ${row.source}${row.internalLinks.length > 0 ? ` (${row.internalLinks[0].no})` : ''}`, type: 'system' });
  if (wmsRef) e.push({ id: '2', time: row.createdAt, actor: '系统', title: '推送至WMS', desc: `仓库单号 ${wmsRef.no} → ${row.warehouse}`, type: 'system' });
  if (row.arrivedAt) e.push({ id: '3', time: row.arrivedAt, actor: row.receiver || row.warehouse, title: '到货签收', desc: `实际到货 ${row.arrivedAt}`, type: 'warehouse' });
  if (row.receiver) e.push({ id: '4', time: row.arrivedAt || row.createdAt, actor: row.receiver, title: '开始收货', type: 'warehouse' });
  if (row.qcOperator) e.push({ id: '5', time: row.createdAt, actor: row.qcOperator, title: `质检: ${row.qcStatus}`, type: 'quality' });
  if (row.putawayOperator) e.push({ id: '6', time: row.completedAt || row.createdAt, actor: row.putawayOperator, title: '上架完成', type: 'warehouse' });
  if (row.completedAt) e.push({ id: '7', time: row.completedAt, actor: '系统', title: '入库完成', desc: '所有商品已上架入库', type: 'system' });
  if (row.exception) e.push({ id: '8', time: row.createdAt, actor: '系统', title: `异常: ${row.exception}`, type: 'exception' });
  return e.reverse();
}

/* ─── Tabs ─── */
const mainTabs = ['商品清单', '收货信息'] as const;
type MainTab = (typeof mainTabs)[number];

/* ─── Page ─── */
export default function InboundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const row = inboundOrders.find((o) => o.id === id);
  const [activeTab, setActiveTab] = useState<MainTab>('商品清单');

  if (!row) {
    return (
      <div className="mx-auto max-w-[1280px] py-20 text-center">
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">入库单未找到</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">ID: {id} 不存在</p>
        <Link href="/dashboard/inbound" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--primary)] hover:underline"><ArrowLeft className="size-3.5" />返回入库单列表</Link>
      </div>
    );
  }

  const steps = getLifecycleSteps(row);
  const events = buildEvents(row);
  const isCompleted = row.status === '已入库';
  const hasQcIssue = row.qcStatus === '质检不通过';

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      <Link href="/dashboard/inbound" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回入库单列表
      </Link>

      {/* ═══ Header Card ═══ */}
      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="inline-flex items-center text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{row.inboundNo}<CopyButton text={row.inboundNo} /></h1>
                <StatusBadge status={row.status} />
                {row.wmsStatus && <StatusBadge status={row.wmsStatus} />}
                {row.exception && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                    <AlertTriangle className="size-3" />{row.exception}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
                <span>{row.inboundType}</span><span>·</span>
                <span>{row.source}{row.internalLinks.length > 0 ? ` / ${row.internalLinks[0].no}` : ''}</span><span>·</span>
                <span>{row.warehouse}</span><span>·</span>
                <span>{row.merchant}</span><span>·</span>
                <span>{row.createdAt}</span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {(() => {
                type InboundAction = { label: string; variant: 'primary' | 'danger' | 'default'; };
                const actions: InboundAction[] = [];

                if (row.pushStatus === 'timeout' || row.pushStatus === 'failed') {
                  actions.push({ label: '重新推送', variant: 'primary' });
                }
                if (row.exception === 'WMS未消费') {
                  actions.push({ label: '检查WMS状态', variant: 'primary' });
                }
                if (row.status === '待入库' && !row.exception) {
                  actions.push({ label: '推送WMS', variant: 'primary' });
                  actions.push({ label: '编辑', variant: 'default' });
                }
                if (row.status === '入库中' && row.wmsStatus === '待收货') {
                  actions.push({ label: '确认到货', variant: 'primary' });
                }
                if (row.status === '入库中' && (row.wmsStatus === '收货中' || row.wmsStatus === '质检中')) {
                  actions.push({ label: '手动完成收货', variant: 'primary' });
                }
                if (row.qcStatus === '质检不通过') {
                  actions.push({ label: '联系供应商', variant: 'primary' });
                  actions.push({ label: '退货处理', variant: 'danger' });
                }
                if (row.exception === '数量不符') {
                  actions.push({ label: '确认差异', variant: 'primary' });
                }
                if (!['已入库', '已取消'].includes(row.status)) {
                  actions.push({ label: '取消入库', variant: 'danger' });
                }
                if (row.status === '已取消') {
                  actions.push({ label: '重新创建', variant: 'default' });
                }
                actions.push({ label: '打印', variant: 'default' });

                return actions.map((action) => (
                  <button
                    key={action.label}
                    className={cn(
                      'h-8 rounded-lg px-3 text-[13px] font-medium transition',
                      action.variant === 'primary' && 'bg-[var(--primary)] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90',
                      action.variant === 'danger' && 'border border-[var(--border)] text-[var(--danger)] hover:bg-red-50',
                      action.variant === 'default' && 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                    )}
                  >
                    {action.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* ─── Lifecycle Stepper ─── */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Inbound lifecycle</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{row.status} · {row.wmsStatus || '待推送'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {row.status === '已取消' && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">Cancelled</span>
                )}
                {row.exception && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-[var(--warning)] ring-1 ring-inset ring-amber-200">Exception</span>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {steps.map((step, index) => {
                const isComplete = step.status === 'complete';
                const isCurrent = step.status === 'current';
                return (
                  <div key={step.label} className="relative">
                    {index < steps.length - 1 ? (
                      <div className="absolute left-[calc(50%+18px)] top-4 hidden h-px w-[calc(100%-36px)] bg-[var(--border)] md:block" aria-hidden="true">
                        <div className={cn('h-full bg-[var(--primary)]', isComplete ? 'w-full' : 'w-0')} />
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
                      <span className={cn(
                        'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-[var(--surface)]',
                        isComplete && 'border-[var(--primary)] bg-[var(--primary)] text-white',
                        isCurrent && 'border-[var(--primary)] text-[var(--primary)]',
                        step.status === 'upcoming' && 'border-[var(--border)] text-[var(--muted-foreground)]'
                      )}>
                        {isComplete ? <CheckCircle2 className="size-4" aria-hidden="true" /> : isCurrent ? <Clock3 className="size-4" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                      </span>
                      <div>
                        <div className={cn('text-[12px] font-semibold', isCurrent || isComplete ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step.label}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--muted)]">{step.detail || (isComplete ? '✓' : isCurrent ? '进行中' : '—')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Exception Detail Banner ═══ */}
      {row.exception && (
        <div className={cn(
          'mb-6 overflow-hidden rounded-2xl border',
          row.exceptionType === 'system' ? 'border-orange-200 bg-orange-50/50' : row.exceptionType === 'quality' ? 'border-red-200 bg-red-50/50' : 'border-red-200 bg-red-50/50'
        )}>
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle className={cn('mt-0.5 size-5 shrink-0', row.exceptionType === 'system' ? 'text-orange-600' : 'text-[var(--danger)]')} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={cn('text-[14px] font-semibold', row.exceptionType === 'system' ? 'text-orange-700' : 'text-[var(--danger)]')}>{row.exception}</h3>
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                  row.exceptionType === 'quality' && 'bg-red-50 text-[var(--danger)] ring-red-200',
                  row.exceptionType === 'system' && 'bg-orange-50 text-orange-700 ring-orange-200',
                  row.exceptionType === 'warehouse' && 'bg-amber-50 text-amber-700 ring-amber-200',
                )}>{row.exceptionType === 'quality' ? '质检异常' : row.exceptionType === 'system' ? '系统交互' : '仓库作业'}</span>
                {row.pushStatus === 'timeout' && <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200">超时 · 已重试{row.pushRetryCount}次</span>}
                {row.pushStatus === 'failed' && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">推送失败 · 已重试{row.pushRetryCount}次</span>}
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-[var(--foreground)]">{row.exceptionDetail}</p>
              {/* Retry mechanism panel — for system exceptions */}
              {row.exceptionType === 'system' && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px]">
                      <span className="font-medium text-[var(--foreground)]">重试机制</span>
                      <span className="ml-2 text-[var(--muted)]">
                        {row.pushRetryCount < 3 ? '自动重试中' : row.pushRetryCount < 5 ? '自动重试已停止' : '自动重试已耗尽'}
                      </span>
                    </div>
                    <button className="h-7 rounded-md bg-orange-600 px-2.5 text-[12px] font-medium text-white transition hover:bg-orange-700">
                      手动重试
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
                    <div>
                      <div className="text-[var(--muted-foreground)]">自动重试</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">{row.pushRetryCount} / 5 次</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">重试间隔</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">指数退避</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">下次自动重试</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">{row.pushRetryCount >= 5 ? '已停止' : `约 ${Math.pow(2, row.pushRetryCount)} 分钟后`}</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">最后尝试</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">{row.lastPushAt || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--muted)]">
                <span>发生时间: {row.createdAt}</span>
                <span>操作员: {row.qcOperator || row.receiver || '系统'}</span>
                <span>仓库: {row.warehouse}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Two-column layout ═══ */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ─── Left: Main content ─── */}
        <div className="space-y-5">
          {/* Tab card */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
              <div className="inline-flex rounded-full bg-[var(--surface-subtle)] p-1 text-[13px] font-medium ring-1 ring-inset ring-[var(--border-subtle)]">
                {mainTabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
                    'rounded-full px-4 py-1.5 transition-colors',
                    activeTab === tab
                      ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}>
                    {tab}
                    {tab === '收货信息' && isCompleted && <span className="ml-1.5 inline-flex size-1.5 rounded-full bg-[var(--success)]" />}
                    {tab === '收货信息' && !isCompleted && <span className="ml-1.5 text-[10px] text-[var(--muted)]">待完成</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab: 商品清单 ── */}
            {activeTab === '商品清单' && (
              <div className="border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between bg-[var(--surface)] px-4 py-3">
                  <span className="text-[12px] text-[var(--muted)]">计划入库商品 — 推送给WMS的收货指令</span>
                  <span className="text-[12px] text-[var(--muted)]">{row.itemsDetail.length} 行 · {row.totalQty} 件</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-[13px]">
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2.5">商品</th>
                        <th className="whitespace-nowrap px-3 py-2.5">SKU</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">计划</th>
                        <th className="whitespace-nowrap px-3 py-2.5">单位</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">实收</th>
                        <th className="whitespace-nowrap px-3 py-2.5">批次</th>
                        <th className="whitespace-nowrap px-3 py-2.5">质检</th>
                        <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {row.itemsDetail.map((item, i) => {
                        const parts = item.split(' × ');
                        const qty = parseInt(parts[1]);
                        const lotNo = `LOT-2026${String(i + 1).padStart(3, '0')}`;
                        const receivedQty = isCompleted ? qty : (row.arrivedAt ? qty : 0);
                        return (
                          <tr key={i} className="transition-colors hover:bg-[var(--surface-subtle)]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[var(--foreground)]">{parts[0]}</div>
                                  <div className="text-[11px] text-[var(--muted)]">{qty} 件 · {(parseFloat(row.totalWeight) / row.totalQty * qty).toFixed(1)} kg</div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[var(--foreground)]">SKU-{String(i + 1).padStart(4, '0')}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">{qty}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">件</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-[var(--foreground)]">{receivedQty > 0 ? receivedQty : '—'}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[var(--muted)]">{isCompleted ? lotNo : '—'}</td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <StatusBadge status={row.qcStatus} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <StatusBadge status={isCompleted ? '已入库' : row.wmsStatus || row.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
                  <div className="ml-auto w-[260px] space-y-1 text-[13px]">
                    <div className="flex justify-between"><span className="text-[var(--muted)]">商品行数</span><span>{row.itemsDetail.length}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--muted)]">计划总件数</span><span>{row.totalQty}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--muted)]">实收总件数</span><span>{isCompleted ? row.totalQty : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--muted)]">总重量</span><span>{row.totalWeight}</span></div>
                    <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-semibold"><span>供应商</span><span>{row.supplier || '—'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: 收货信息 ── */}
            {activeTab === '收货信息' && (
              <div>
                <div className="flex flex-col gap-2 bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] text-[var(--muted)]">收货仓库: {row.warehouse} · 预期到货: {row.expectedAt || '—'}</div>
                  <span className="text-[12px] text-[var(--muted)]">{isCompleted ? '已完成入库' : '收货进行中'}</span>
                </div>
                {!row.arrivedAt && !isCompleted ? (
                  <div className="px-4 py-12 text-center">
                    <Package className="mx-auto size-10 text-[var(--border)]" />
                    <p className="mt-3 text-[14px] font-medium text-[var(--foreground)]">等待到货</p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">入库单已推送至 {row.warehouse}，等待货物到达仓库</p>
                    {(() => {
                      const wmsRef = row.externalRefs.find(r => r.type === 'wms_inbound');
                      return (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
                          <span>仓库单号:</span>
                          <span className="font-mono font-medium text-[var(--foreground)]">{wmsRef?.no || '待生成'}</span>
                          {wmsRef && <CopyButton text={wmsRef.no} />}
                          {row.wmsStatus && <><span>·</span><StatusBadge status={row.wmsStatus} /></>}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4 px-4 py-4">
                    {/* Receipt card */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                        <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#1</span>
                        <StatusBadge status={isCompleted ? '已入库' : '收货中'} />
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{row.warehouse}</span>
                        {(() => {
                          const wmsRef = row.externalRefs.find(r => r.type === 'wms_inbound');
                          return wmsRef ? (
                            <span className="inline-flex items-center font-mono text-[12px] text-[var(--muted)]">{wmsRef.no}<CopyButton text={wmsRef.no} /></span>
                          ) : null;
                        })()}
                      </div>
                      {/* Shipping details */}
                      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                        <div className="grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">WMS单号</span>
                            {(() => {
                              const wmsRef = row.externalRefs.find(r => r.type === 'wms_inbound');
                              return <span className="inline-flex items-center font-mono text-[var(--foreground)]">{wmsRef?.no || '—'}{wmsRef && <CopyButton text={wmsRef.no} />}</span>;
                            })()}
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">收货仓</span>
                            <span className="font-medium text-[var(--foreground)]">{row.warehouse}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">到货时间</span>
                            <span className="text-[var(--foreground)]">{row.arrivedAt || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">完成时间</span>
                            <span className="text-[var(--foreground)]">{row.completedAt || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">收货员</span>
                            <span className="text-[var(--foreground)]">{row.receiver || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">上架员</span>
                            <span className="text-[var(--foreground)]">{row.putawayOperator || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">总重量</span>
                            <span className="text-[var(--foreground)]">{row.totalWeight}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">总件数</span>
                            <span className="text-[var(--foreground)]">{row.totalQty} 件</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ⑥ 操作时间线 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]"><Clock3 className="size-4 text-[var(--muted)]" />操作时间线</h2>
              <span className="text-[12px] text-[var(--muted)]">{events.length} 条记录</span>
            </div>
            <div className="px-4 py-4">
              {events.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto size-8 text-[var(--border)]" />
                  <p className="mt-2 text-[13px] text-[var(--muted)]">暂无操作记录</p>
                </div>
              ) : (
                <ol className="relative border-l-2 border-[var(--border-subtle)] pl-6 space-y-4">
                  {events.map((evt) => (
                    <li key={evt.id} className="relative">
                      <span className="absolute -left-[29px] flex size-4 items-center justify-center text-[11px]">{evtIcon[evt.type]}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{evt.title}</span>
                        <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">{evt.time}</span>
                      </div>
                      <div className="mt-0.5 text-[12px]">
                        <span className="font-medium text-[var(--foreground)]">{evt.actor}</span>
                      </div>
                      {evt.desc && <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">{evt.desc}</p>}
                      {evt.type === 'exception' && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                            <AlertTriangle className="size-2.5" />需要处理
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="space-y-5">
          {/* 基本信息 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><FileText className="size-4 text-[var(--muted)]" />基本信息</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[var(--muted)]">入库类型</span><span className="font-medium text-[var(--foreground)]">{row.inboundType}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">来源</span><span className="text-[var(--foreground)]">{row.source}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">店铺</span><span className="text-[var(--foreground)]">{row.merchant}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">仓库</span><span className="font-medium text-[var(--foreground)]">{row.warehouse}</span></div>
              {/* 内部链路（本平台） — 优先展示 */}
              {row.internalLinks.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border-subtle)]" />
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">本平台单号</div>
                  {row.internalLinks.map((link, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-[var(--muted)]">{INTERNAL_LINK_LABELS[link.type]}</span>
                      <span className="inline-flex items-center font-mono text-[var(--primary)]">
                        <Link href={`${INTERNAL_LINK_ROUTES[link.type]}/${link.id ?? ''}`} className="hover:underline">{link.no}</Link>
                        <CopyButton text={link.no} />
                      </span>
                    </div>
                  ))}
                </>
              )}
              {/* 外部引用 — 按上游/下游分组 */}
              {row.externalRefs.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border-subtle)]" />
                  {row.externalRefs.filter(r => r.source === 'upstream').length > 0 && (
                    <>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户单号</div>
                      {row.externalRefs.filter(r => r.source === 'upstream').map((ref, i) => (
                        <div key={`up-${i}`} className="flex justify-between">
                          <span className="text-[var(--muted)]">{ref.label}</span>
                          <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ref.no}<CopyButton text={ref.no} /></span>
                        </div>
                      ))}
                    </>
                  )}
                  {row.externalRefs.filter(r => r.source === 'downstream').length > 0 && (
                    <>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">仓库单号</div>
                      {row.externalRefs.filter(r => r.source === 'downstream').map((ref, i) => (
                        <div key={`dn-${i}`} className="flex justify-between">
                          <span className="text-[var(--muted)]">{ref.label}</span>
                          <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ref.no}<CopyButton text={ref.no} /></span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
              <div className="h-px bg-[var(--border-subtle)]" />
              <div className="flex justify-between"><span className="text-[var(--muted)]">创建时间</span><span className="text-[var(--foreground)]">{row.createdAt}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">预期到货</span><span className="text-[var(--foreground)]">{row.expectedAt || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">实际到货</span><span className={row.arrivedAt ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>{row.arrivedAt || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">完成时间</span><span className={row.completedAt ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>{row.completedAt || '—'}</span></div>
            </div>
          </section>

          {/* 供应商信息 */}
          {row.supplier && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Truck className="size-4 text-[var(--muted)]" />供应商</h2>
              </div>
              <div className="px-4 py-3 space-y-2.5 text-[12px]">
                <div className="flex justify-between"><span className="text-[var(--muted)]">供应商名称</span><span className="font-medium text-[var(--foreground)]">{row.supplier}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">联系人</span><span className="text-[var(--foreground)]">—</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">联系电话</span><span className="text-[var(--foreground)]">—</span></div>
              </div>
            </section>
          )}

          {/* 质检信息 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><ClipboardCheck className="size-4 text-[var(--muted)]" />质检信息</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[var(--muted)]">质检状态</span><StatusBadge status={row.qcStatus} /></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">质检员</span><span className="text-[var(--foreground)]">{row.qcOperator || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">收货员</span><span className="text-[var(--foreground)]">{row.receiver || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">上架员</span><span className="text-[var(--foreground)]">{row.putawayOperator || '—'}</span></div>
            </div>
          </section>

          {/* 标签与备注 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Tag className="size-3.5 text-[var(--muted)]" />标签与备注</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                  row.inboundType === '采购入库' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                  row.inboundType === '退货入库' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                  'bg-purple-50 text-purple-700 ring-purple-200'
                )}>{row.inboundType}</span>
                {parseFloat(row.totalWeight) > 10 && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">大件</span>}
                {hasQcIssue && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">质检异常</span>}
              </div>
              <div className="space-y-1.5">
                {row.exception && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-[var(--danger)]">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">异常</div>
                    {row.exception}
                  </div>
                )}
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">收货备注</div>
                  <span className="text-[var(--muted)]">{parseFloat(row.totalWeight) > 10 ? '大件商品，需叉车卸货' : '—'}</span>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">质检要求</div>
                  <span className="text-[var(--muted)]">{row.inboundType === '退货入库' ? '退货需全检外观及功能' : '抽检比例 10%'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
