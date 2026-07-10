'use client';

import Link from 'next/link';
import React, { useState, useCallback } from 'react';
import { ArrowLeft, Copy, Check, Package, Truck, AlertTriangle, Clock3, MapPin, FileText, CheckCircle2, Circle, Tag, Globe, Battery, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { outboundOrders } from '@/lib/mock-data/outbound';
import { cn } from '@/lib/utils';

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
const lifecycleLabels = ['创建', '已推送', '作业中', '已出库'] as const;

type LifecycleStep = {
  label: (typeof lifecycleLabels)[number];
  status: 'complete' | 'current' | 'upcoming';
  detail: string;
};

function getLifecycleSteps(row: typeof outboundOrders[0]): LifecycleStep[] {
  const idx: Record<string, number> = { '待出库': 0, '出库中': 2, '已出库': 3, '已取消': -1 };
  const cur = row.wmsStatus === '待作业' && row.status !== '待出库' ? 1 : idx[row.status] ?? 0;

  const details: string[] = [
    row.createdAt ? row.createdAt.slice(5, 16) : '',
    cur >= 1 ? (row.wmsOutboundNo ? `WMS: ${row.wmsOutboundNo.slice(-8)}` : '待推送') : '',
    cur >= 2 ? (row.picker ? `${row.wmsStatus} · ${row.picker}` : row.checker ? `${row.wmsStatus} · ${row.checker}` : row.wmsStatus) : '',
    cur >= 3 ? (row.shippedAt ?? '已完成') : '',
  ];

  return lifecycleLabels.map((label, i) => ({
    label,
    status: (cur < 0 ? 'upcoming' : i < cur ? 'complete' : i === cur ? 'current' : 'upcoming') as 'complete' | 'current' | 'upcoming',
    detail: details[i] || '',
  }));
}

/* ─── Mock DC (Delivery Confirmation from WMS) ─── */
function getMockDC(row: typeof outboundOrders[0]) {
  if (row.status !== '已出库' && row.wmsStatus !== '已完成' && row.wmsStatus !== '已交接') return null;
  return {
    dcNo: `DC-${row.wmsOutboundNo.slice(-8)}`,
    receivedAt: row.shippedAt ? `2026-${row.shippedAt}` : '',
    actualItems: row.itemsDetail.map((item, i) => {
      const parts = item.split(' × ');
      return {
        name: parts[0],
        plannedQty: parseInt(parts[1]),
        shippedQty: parseInt(parts[1]),
        lotNo: `LOT-2026${String(i + 1).padStart(3, '0')}`,
        serialNumbers: parseInt(parts[1]) <= 2 ? [`SN-${row.outboundNo.slice(-4)}-${i + 1}A`] : [],
      };
    }),
    packages: [
      {
        packageNo: `PKG-${row.outboundNo.slice(-4)}-A`,
        type: parseFloat(row.totalWeight) > 10 ? 'pallet' as const : 'carton' as const,
        weight: row.totalWeight,
        dimensions: parseFloat(row.totalWeight) > 10 ? '120×100×150 cm' : '40×30×20 cm',
        trackingNo: row.trackingNo,
        items: row.itemsDetail.map(item => item.split(' × ')[0]),
      }
    ],
    carrier: row.carrier,
    trackingNo: row.trackingNo,
    totalWeight: row.totalWeight,
    shippedAt: row.shippedAt ? `2026-${row.shippedAt}` : '',
  };
}

/* ─── Timeline ─── */
type Evt = { id: string; time: string; actor: string; title: string; desc?: string; type: 'system' | 'warehouse' | 'logistics' | 'exception' };
const evtIcon: Record<string, string> = { system: '⚙️', warehouse: '📦', logistics: '🚚', exception: '⚠️' };

function buildEvents(row: typeof outboundOrders[0]): Evt[] {
  const e: Evt[] = [];
  e.push({ id: '1', time: row.createdAt, actor: '系统', title: '出库单创建', desc: `来源: ${row.source}${row.sourceNo ? ` (${row.sourceNo})` : ''}`, type: 'system' });
  if (row.wmsOutboundNo) e.push({ id: '2', time: row.createdAt, actor: '系统', title: '推送至WMS', desc: `仓库单号 ${row.wmsOutboundNo} → ${row.warehouse}`, type: 'system' });
  if (row.waveNo) e.push({ id: '3', time: row.createdAt, actor: row.warehouse, title: 'WMS分配波次', desc: row.waveNo, type: 'warehouse' });
  if (row.picker) e.push({ id: '4', time: row.createdAt, actor: row.picker, title: 'WMS开始拣货', type: 'warehouse' });
  if (row.checker) e.push({ id: '5', time: row.createdAt, actor: row.checker, title: 'WMS验货复核', type: 'warehouse' });
  if (row.shippedAt) {
    e.push({ id: '6', time: row.shippedAt, actor: row.warehouse, title: 'WMS回传DC', desc: '发货确认，实际发货数据已同步', type: 'warehouse' });
    e.push({ id: '7', time: row.shippedAt, actor: row.carrier, title: '承运商揽收', desc: `运单号 ${row.trackingNo}`, type: 'logistics' });
  }
  if (row.exception) e.push({ id: '8', time: row.createdAt, actor: '系统', title: `异常: ${row.exception}`, type: 'exception' });
  return e.reverse();
}

/* ─── Tabs (only 商品清单 and 发货信息, 操作记录 is a standalone section below) ─── */
const mainTabs = ['商品清单', '发货信息'] as const;
type MainTab = (typeof mainTabs)[number];

/* ─── Page ─── */
export default function OutboundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const row = outboundOrders.find((o) => o.id === id);
  const [activeTab, setActiveTab] = useState<MainTab>('商品清单');
  const [packageModal, setPackageModal] = useState(false);

  if (!row) {
    return (
      <div className="mx-auto max-w-[1280px] py-20 text-center">
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">出库单未找到</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">ID: {id} 不存在</p>
        <Link href="/dashboard/outbound" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--primary)] hover:underline"><ArrowLeft className="size-3.5" />返回出库单列表</Link>
      </div>
    );
  }

  const steps = getLifecycleSteps(row);
  const events = buildEvents(row);
  const dc = getMockDC(row);
  const isHeavy = parseFloat(row.totalWeight) > 10;
  const isInternational = ['UK-London', 'SG-Central'].includes(row.warehouse);
  const hasBattery = row.itemsDetail.some(i => /charger|battery/i.test(i));
  const shippingMode = isHeavy ? 'ltl' : 'parcel';
  const shippingModeLabel: Record<string, { label: string; icon: string }> = {
    parcel: { label: '小包裹', icon: '📦' },
    ltl: { label: '零担(陆运)', icon: '🚛' },
  };
  const modeInfo = shippingModeLabel[shippingMode];

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      <Link href="/dashboard/outbound" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回出库单列表
      </Link>

      {/* ═══ Header Card ═══ */}
      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="inline-flex items-center text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{row.outboundNo}<CopyButton text={row.outboundNo} /></h1>
                <StatusBadge status={row.status} />
                <StatusBadge status={row.wmsStatus} />
                {row.exception && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                    <AlertTriangle className="size-3" />{row.exception}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
                <span>{row.outboundType}</span><span>·</span>
                <span>{row.source}{row.sourceNo ? ` / ${row.sourceNo}` : ''}</span><span>·</span>
                <span>{row.warehouse}</span><span>·</span>
                <span>{row.merchant}</span><span>·</span>
                <span>{row.createdAt}</span>
              </div>
              {(isInternational || hasBattery || isHeavy) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {isInternational && <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200"><Globe className="size-3" />国际</span>}
                  {hasBattery && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200"><Battery className="size-3" />含电池</span>}
                  {isHeavy && <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200"><Package className="size-3" />大件</span>}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {(() => {
                type OutboundAction = { label: string; variant: 'primary' | 'danger' | 'default'; };
                const actions: OutboundAction[] = [];

                // Push-related actions
                if (row.pushStatus === 'timeout' || row.pushStatus === 'failed') {
                  actions.push({ label: '重新推送', variant: 'primary' });
                }
                if (row.exception === 'WMS未消费') {
                  actions.push({ label: '检查WMS状态', variant: 'primary' });
                }

                // Normal state actions
                if (row.status === '待出库' && !row.exception) {
                  actions.push({ label: '推送WMS', variant: 'primary' });
                  actions.push({ label: '编辑', variant: 'default' });
                }
                if (row.status === '待出库' && row.pushStatus === 'pending') {
                  // 已有WMS单号但还没推送成功（无自动任务或自动任务未触发）
                  if (!actions.find(a => a.label === '推送WMS')) {
                    actions.push({ label: '手动推送', variant: 'primary' });
                  }
                }
                if (row.status === '出库中' && !row.exception && !dc) {
                  actions.push({ label: '手动确认出库', variant: 'primary' });
                }

                // Exception resolution actions (warehouse)
                if (row.exceptionType === 'warehouse') {
                  if (row.exception === '库位缺货') actions.push({ label: '重新分配库位', variant: 'primary' });
                  if (row.exception === '商品破损') actions.push({ label: '换货补发', variant: 'primary' });
                  if (row.exception === 'SN不匹配') actions.push({ label: '重新验证SN', variant: 'primary' });
                  actions.push({ label: '手动放行', variant: 'default' });
                }

                // Exception resolution actions (logistics)
                if (row.exceptionType === 'logistics') {
                  if (row.exception === '地址无效') actions.push({ label: '修改地址', variant: 'primary' });
                  if (row.exception === '海关扣留') actions.push({ label: '提交清关文件', variant: 'primary' });
                  if (row.exception === '重量超限') actions.push({ label: '拆单发货', variant: 'primary' });
                  actions.push({ label: '手动放行', variant: 'default' });
                }

                // Exception resolution actions (system)
                if (row.exceptionType === 'system' && row.pushStatus === 'failed') {
                  actions.push({ label: '同步商品主数据', variant: 'default' });
                }

                // Cancel-related
                if (row.cancelStatus === 'rejected') {
                  actions.push({ label: '联系仓库', variant: 'default' });
                  if (row.trackingNo) actions.push({ label: '拦截包裹', variant: 'primary' });
                }

                if (row.status === '已出库') {
                  actions.push({ label: '查看签收', variant: 'default' });
                }

                // Cancel button — conditional on state
                if (!['已出库', '已取消'].includes(row.status) && row.cancelStatus !== 'rejected') {
                  if (row.status === '取消中') {
                    actions.push({ label: '强制取消', variant: 'danger' });
                  } else if (row.wmsStatus === '已交接') {
                    // 已交接禁止取消，不展示
                  } else {
                    actions.push({ label: '取消出库', variant: 'danger' });
                  }
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Outbound lifecycle</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{row.status} · {row.wmsStatus}</div>
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
          row.exceptionType === 'system' ? 'border-orange-200 bg-orange-50/50' : row.exceptionType === 'cancel' ? 'border-purple-200 bg-purple-50/50' : 'border-red-200 bg-red-50/50'
        )}>
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle className={cn('mt-0.5 size-5 shrink-0', row.exceptionType === 'system' ? 'text-orange-600' : row.exceptionType === 'cancel' ? 'text-purple-600' : 'text-[var(--danger)]')} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={cn('text-[14px] font-semibold', row.exceptionType === 'system' ? 'text-orange-700' : row.exceptionType === 'cancel' ? 'text-purple-700' : 'text-[var(--danger)]')}>{row.exception}</h3>
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                  row.exceptionType === 'warehouse' && 'bg-red-50 text-[var(--danger)] ring-red-200',
                  row.exceptionType === 'system' && 'bg-orange-50 text-orange-700 ring-orange-200',
                  row.exceptionType === 'logistics' && 'bg-amber-50 text-amber-700 ring-amber-200',
                  row.exceptionType === 'cancel' && 'bg-purple-50 text-purple-700 ring-purple-200',
                )}>{row.exceptionType === 'warehouse' ? '仓库作业' : row.exceptionType === 'system' ? '系统交互' : row.exceptionType === 'logistics' ? '物流' : '取消'}</span>
                {row.pushStatus === 'timeout' && <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200">超时 · 已重试{row.pushRetryCount}次</span>}
                {row.pushStatus === 'failed' && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">推送失败 · 已重试{row.pushRetryCount}次</span>}
                {row.cancelStatus === 'rejected' && <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">取消被拒</span>}
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-[var(--foreground)]">{row.exceptionDetail}</p>
              {row.cancelRejectReason && (
                <div className="mt-2 rounded-lg bg-purple-100/50 px-3 py-2 text-[12px] text-purple-800">
                  <span className="font-medium">拒绝原因:</span> {row.cancelRejectReason}
                </div>
              )}
              {/* Retry mechanism panel — for system exceptions */}
              {row.exceptionType === 'system' && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px]">
                      <span className="font-medium text-[var(--foreground)]">重试机制</span>
                      <span className="ml-2 text-[var(--muted)]">
                        {row.pushRetryCount < 3 ? '自动重试中' : row.pushRetryCount < 5 ? '自动重试已停止 (超过最大次数)' : '自动重试已耗尽'}
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
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">指数退避 (30s→1m→2m→5m→10m)</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">下次自动重试</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">{row.pushRetryCount >= 5 ? '已停止' : row.pushRetryCount >= 3 ? '已暂停 — 需手动触发' : `约 ${Math.pow(2, row.pushRetryCount)} 分钟后`}</div>
                    </div>
                    <div>
                      <div className="text-[var(--muted-foreground)]">最后尝试</div>
                      <div className="mt-0.5 font-medium text-[var(--foreground)]">{row.lastPushAt || '—'}</div>
                    </div>
                  </div>
                  {row.pushRetryCount >= 5 && (
                    <div className="mt-2 rounded bg-orange-50 px-2.5 py-1.5 text-[11px] text-orange-700">
                      ⚠️ 自动重试已耗尽 (5/5)。建议: 检查下游 WMS 服务状态后手动重试，或联系技术支持。
                    </div>
                  )}
                  {row.pushRetryCount >= 3 && row.pushRetryCount < 5 && (
                    <div className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                      ⏸️ 自动重试已暂停 (连续失败 {row.pushRetryCount} 次)。系统将不再自动重试，请确认问题后手动触发。
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--muted)]">
                <span>发生时间: {row.createdAt}</span>
                <span>操作员: {row.picker || '系统'}</span>
                <span>仓库: {row.warehouse}</span>
                {row.lastPushAt && <span>最后推送: {row.lastPushAt}</span>}
                {row.pushRetryCount > 0 && <span>重试: {row.pushRetryCount}/5</span>}
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
                    {tab === '发货信息' && dc && <span className="ml-1.5 inline-flex size-1.5 rounded-full bg-[var(--success)]" />}
                    {tab === '发货信息' && !dc && <span className="ml-1.5 text-[10px] text-[var(--muted)]">待回传</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab: 商品清单 ── */}
            {activeTab === '商品清单' && (
              <div className="border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between bg-[var(--surface)] px-4 py-3">
                  <span className="text-[12px] text-[var(--muted)]">计划发货商品 — 推送给WMS的指令内容</span>
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
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">实发</th>
                        <th className="whitespace-nowrap px-3 py-2.5">批次</th>
                        <th className="whitespace-nowrap px-3 py-2.5">序列号</th>
                        <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {row.itemsDetail.map((item, i) => {
                        const parts = item.split(' × ');
                        const qty = parseInt(parts[1]);
                        const lotNo = `LOT-2026${String(i + 1).padStart(3, '0')}`;
                        const serialNumbers = qty <= 2 ? [`SN-${row.outboundNo.slice(-4)}-${i + 1}A`] : [];
                        const shippedQty = dc ? qty : 0;
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
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="space-y-0.5">
                                <div className="font-mono text-[11px] text-[var(--foreground)]">SKU-{String(i + 1).padStart(4, '0')}</div>
                                <div className="font-mono text-[10px] text-[var(--muted)]">仓库: WH-{String(i + 1).padStart(4, '0')}</div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">{qty}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">件</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-[var(--foreground)]">{dc ? shippedQty : '—'}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[var(--muted)]">{dc ? lotNo : '—'}</td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {dc && serialNumbers.length > 0 ? (
                                <div className="space-y-0.5">
                                  {serialNumbers.map((sn) => (
                                    <div key={sn} className="inline-flex items-center rounded bg-amber-50/50 px-1.5 py-0.5 font-mono text-[10px] text-amber-800 ring-1 ring-inset ring-amber-200">
                                      {sn}<CopyButton text={sn} />
                                    </div>
                                  ))}
                                </div>
                              ) : <span className="text-[11px] text-[var(--muted)]">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <StatusBadge status={dc ? '已出库' : row.wmsStatus} />
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
                    <div className="flex justify-between"><span className="text-[var(--muted)]">实发总件数</span><span>{dc ? row.totalQty : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--muted)]">计划总重量</span><span>{row.totalWeight}</span></div>
                    <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-semibold"><span>承运商</span><span>{row.carrier}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: 发货信息 (styled like orders logistics tab) ── */}
            {activeTab === '发货信息' && (
              <div>
                <div className="flex flex-col gap-2 bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] text-[var(--muted)]">收货: End Customer · 350 Fifth Avenue, New York, NY 10118</div>
                  <span className="text-[12px] text-[var(--muted)]">{dc ? '1 个发运单' : '待发货'}</span>
                </div>
                {!dc ? (
                  <div className="px-4 py-12 text-center">
                    <Package className="mx-auto size-10 text-[var(--border)]" />
                    <p className="mt-3 text-[14px] font-medium text-[var(--foreground)]">等待仓库回传</p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">出库单已推送至 {row.warehouse}，WMS完成作业后将自动回传发货确认</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
                      <span>仓库单号:</span>
                      <span className="font-mono font-medium text-[var(--foreground)]">{row.wmsOutboundNo}</span>
                      <CopyButton text={row.wmsOutboundNo} />
                      <span>·</span>
                      <StatusBadge status={row.wmsStatus} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 px-4 py-4">
                    {/* Shipment card — modeled after orders logistics info */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      {/* Header bar */}
                      <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                        <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#1</span>
                        <StatusBadge status="已出库" />
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                          shippingMode === 'ltl' ? 'bg-purple-50 text-purple-600 ring-purple-200' : 'bg-blue-50 text-[var(--primary)] ring-blue-200'
                        )}>
                          <span>{modeInfo.icon}</span>
                          <span>{modeInfo.label}</span>
                        </span>
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{dc.carrier}</span>
                        {dc.trackingNo && (
                          <span className="inline-flex items-center font-mono text-[12px] text-[var(--muted)]">{dc.trackingNo}<CopyButton text={dc.trackingNo} /></span>
                        )}
                        {row.trackingNo && (
                          <a href="#" className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]">
                            追踪 <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      {/* Items in this shipment — with batch & SN details */}
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {dc.actualItems.map((item, i) => (
                          <div key={i} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                              <div>
                                <div className="text-[13px] font-medium text-[var(--foreground)]">{item.name}</div>
                                <div className="text-[11px] text-[var(--muted)]">{item.shippedQty} 件 · {(parseFloat(row.totalWeight) / row.totalQty * item.shippedQty).toFixed(1)} kg</div>
                                <div className="mt-0.5 space-x-2 font-mono text-[10px] text-[var(--muted)]">
                                  <span>SKU-{String(i + 1).padStart(4, '0')}</span>
                                  <span>· 仓库: WH-{String(i + 1).padStart(4, '0')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-[12px] text-[var(--foreground)] sm:text-center sm:px-3">× {item.shippedQty}<span className="ml-0.5 text-[10px] text-[var(--muted)]">件</span></div>
                            <div className="sm:px-3">
                              <div className="flex flex-wrap gap-1">
                                <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border-subtle)]">{item.lotNo}</span>
                                {item.serialNumbers.map((sn) => (
                                  <span key={sn} className="inline-flex items-center rounded bg-amber-50/50 px-1.5 py-0.5 font-mono text-[10px] text-amber-800 ring-1 ring-inset ring-amber-200">{sn}<CopyButton text={sn} /></span>
                                ))}
                              </div>
                            </div>
                            <div className="sm:text-right sm:min-w-[70px]">
                              <StatusBadge status="已出库" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Shipping details — two column label-value layout */}
                      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                        <div className="grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">运单号</span>
                            <span className="inline-flex items-center font-mono text-[var(--foreground)]">{dc.trackingNo || '—'}{dc.trackingNo && <CopyButton text={dc.trackingNo} />}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货仓</span>
                            <span className="font-medium text-[var(--foreground)]">{row.warehouse}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">DC单号</span>
                            <span className="inline-flex items-center font-mono text-[var(--foreground)]">{dc.dcNo}<CopyButton text={dc.dcNo} /></span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">WMS单号</span>
                            <span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.wmsOutboundNo}<CopyButton text={row.wmsOutboundNo} /></span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">重量</span>
                            <span className="text-[var(--foreground)]">{dc.totalWeight}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货时间</span>
                            <span className="text-[var(--foreground)]">{dc.shippedAt || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">DC回传</span>
                            <span className="text-[var(--foreground)]">{dc.receivedAt || '—'}</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">包装</span>
                            <span className="text-[var(--foreground)]">{dc.packages.length} 个包装单元</span>
                          </div>
                        </div>
                      </div>

                      {/* Package summary with modal trigger */}
                      <div className="border-t border-[var(--border-subtle)] px-4 py-3">
                        <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-medium text-[var(--foreground)]">{dc.packages.length} 个包装单元</span>
                            <span className="text-[var(--muted)]">({dc.packages.filter(p => p.type === 'pallet').length > 0 ? `${dc.packages.filter(p => p.type === 'pallet').length}托盘` : `${dc.packages.length}包裹`})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPackageModal(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]"
                          >
                            查看明细
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ⑥ 操作时间线 — standalone section below tabs (like orders page) */}
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
              <div className="flex justify-between"><span className="text-[var(--muted)]">出库类型</span><span className="font-medium text-[var(--foreground)]">{row.outboundType}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">来源</span><span className="text-[var(--foreground)]">{row.source}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">店铺</span><span className="text-[var(--foreground)]">{row.merchant}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">零售商</span><span className="text-[var(--foreground)]">{row.merchant === 'US Store' ? 'Acme Retail US' : row.merchant === 'SG Store' ? 'Acme Retail SG' : 'Acme Retail UK'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">仓库</span><span className="font-medium text-[var(--foreground)]">{row.warehouse}</span></div>
              <div className="h-px bg-[var(--border-subtle)]" />
              {row.sourceNo && <div className="flex justify-between"><span className="text-[var(--muted)]">来源单号</span><span className="inline-flex items-center font-mono text-[var(--primary)]"><Link href={`/dashboard/orders/${row.sourceNo}`} className="hover:underline">{row.sourceNo}</Link><CopyButton text={row.sourceNo} /></span></div>}
              {row.referenceNo && <div className="flex justify-between"><span className="text-[var(--muted)]">采购单号</span><span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.referenceNo}<CopyButton text={row.referenceNo} /></span></div>}
              {row.fulfillmentNo && <div className="flex justify-between"><span className="text-[var(--muted)]">履约单号</span><span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.fulfillmentNo}<CopyButton text={row.fulfillmentNo} /></span></div>}
              {row.channelOrderNo && <div className="flex justify-between"><span className="text-[var(--muted)]">渠道单号</span><span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.channelOrderNo}<CopyButton text={row.channelOrderNo} /></span></div>}
              {row.wmsOutboundNo && <div className="flex justify-between"><span className="text-[var(--muted)]">WMS单号</span><span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.wmsOutboundNo}<CopyButton text={row.wmsOutboundNo} /></span></div>}
              <div className="h-px bg-[var(--border-subtle)]" />
              <div className="flex justify-between"><span className="text-[var(--muted)]">创建时间</span><span className="text-[var(--foreground)]">{row.createdAt}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">最晚发货</span><span className="text-[var(--foreground)]">+2 工作日</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">MABD</span><span className="text-[var(--foreground)]">+5 工作日</span></div>
              {isHeavy && <div className="flex justify-between"><span className="text-[var(--muted)]">预约时间</span><span className="text-[var(--muted)]">待预约</span></div>}
            </div>
          </section>

          {/* 物流与时效 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Truck className="size-4 text-[var(--muted)]" />物流与时效</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[var(--muted)]">承运商</span><span className="font-medium text-[var(--foreground)]">{row.carrier}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">发运方式</span><span className="text-[var(--foreground)]">{modeInfo.icon} {modeInfo.label}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">配送服务</span><span className="text-[var(--foreground)]">{isHeavy ? 'Ground LTL' : 'Standard'}</span></div>
              {row.trackingNo && <div className="flex justify-between"><span className="text-[var(--muted)]">运单号</span><span className="inline-flex items-center font-mono text-[var(--foreground)]">{row.trackingNo}<CopyButton text={row.trackingNo} /></span></div>}
              <div className="flex justify-between"><span className="text-[var(--muted)]">运费条款</span><span className="text-[var(--foreground)]">{isInternational ? 'THIRD_PARTY' : 'PREPAID'}</span></div>
              {isInternational && <div className="flex justify-between"><span className="text-[var(--muted)]">贸易术语</span><span className="text-[var(--foreground)]">DDP</span></div>}
              {row.shippedAt ? <div className="flex justify-between"><span className="text-[var(--muted)]">发货时间</span><span className="text-[var(--success)]">{row.shippedAt}</span></div> : <div className="flex justify-between"><span className="text-[var(--muted)]">发货时间</span><span className="text-[var(--muted)]">待发货</span></div>}
            </div>
          </section>

          {/* 地址 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><MapPin className="size-3.5 text-[var(--muted)]" />地址</h2>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <div className="px-4 py-3 text-[12px]">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">收货地址 (Ship To)</div>
                <div className="font-medium text-[var(--foreground)]">End Customer</div>
                <div className="text-[var(--muted)]">+1 (212) 736-3100</div>
                <div className="leading-5 text-[var(--foreground)]">350 Fifth Avenue, Suite 4800, New York, NY 10118</div>
                <div className="text-[var(--muted)]">{row.warehouse.startsWith('US') ? 'United States' : row.warehouse.startsWith('SG') ? 'Singapore' : 'United Kingdom'}</div>
                <div className="mt-1.5 rounded-lg bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]">
                  {modeInfo.icon} {modeInfo.label} · {isHeavy ? '需预约卸货' : '无需签名'}
                </div>
              </div>
              <div className="px-4 py-3 text-[12px]">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">发货地址 (Ship From)</div>
                <div className="font-medium text-[var(--foreground)]">{row.warehouse}</div>
                <div className="leading-5 text-[var(--foreground)]">1200 Warehouse Blvd</div>
                <div className="text-[var(--muted)]">{row.warehouse.includes('LAX') ? 'Los Angeles, CA 90015' : row.warehouse.includes('EWR') ? 'Newark, NJ 07114' : row.warehouse.includes('SEA') ? 'Seattle, WA 98101' : row.warehouse.includes('DFW') ? 'Dallas, TX 75001' : row.warehouse.includes('SG') ? 'Singapore 048583' : 'London, EC2A 1NT'}</div>
                <div className="text-[var(--muted)]">{row.warehouse.startsWith('US') ? 'United States' : row.warehouse.startsWith('SG') ? 'Singapore' : 'United Kingdom'}</div>
              </div>
            </div>
          </section>

          {/* 标签与备注 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Tag className="size-3.5 text-[var(--muted)]" />标签与备注</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {isInternational && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">国际</span>}
                {hasBattery && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">含电池</span>}
                {isHeavy && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">大件</span>}
                {!isInternational && !hasBattery && !isHeavy && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-[var(--success)] ring-1 ring-inset ring-green-200">标准</span>}
              </div>
              <div className="space-y-1.5">
                {row.exception && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-[var(--danger)]">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">异常</div>
                    {row.exception}
                  </div>
                )}
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">拣货备注</div>
                  <span className="text-[var(--muted)]">{isHeavy ? '大件商品，需叉车协助' : '—'}</span>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">打包备注</div>
                  <span className="text-[var(--muted)]">{hasBattery ? '含电池，需粘贴DG标签' : '—'}</span>
                </div>
                {isHeavy && (
                  <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">装车备注</div>
                    <span className="text-[var(--muted)]">LTL装车，需BOL</span>
                  </div>
                )}
                {isInternational && (
                  <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">配送指示</div>
                    <span className="text-[var(--muted)]">国际件，需出口报关</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 自定义字段 (dynamicFields) */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><FileText className="size-3.5 text-[var(--muted)]" />自定义字段</h2>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {[
                ['priority', row.totalQty > 10 ? 'HIGH' : 'NORMAL'],
                ['sub_order_type', row.outboundType === '调拨出库' ? 'TRANSFER' : 'B2C'],
                ['customer_id', `CUS-${row.merchant.slice(0, 2).toUpperCase()}-001`],
                ...(isInternational ? [['incoterm', 'DDP'], ['customs_value', `$${(row.totalQty * 12.5).toFixed(2)}`]] : []),
                ...(isHeavy ? [['freight_class', '70'], ['liftgate_required', 'true']] : []),
              ].map(([key, value]) => (
                <div key={key} className="flex items-center justify-between px-4 py-1.5">
                  <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{key}</span>
                  <span className="max-w-[160px] truncate text-[11px] text-[var(--foreground)]">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ─── 包装明细弹窗 ─── */}
      {packageModal && dc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPackageModal(false)}>
          <div className="mx-4 w-full max-w-[600px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--foreground)]">包装明细</h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">{dc.packages.length} 个包装单元 · {dc.carrier}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { navigator.clipboard.writeText(dc.packages.map(p => p.packageNo).join('\n')); }} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"><Copy className="size-3" />复制全部编号</button>
                <button type="button" onClick={() => setPackageModal(false)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                  <svg className="size-4" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(80vh - 100px)' }}>
              {dc.packages.map((pkg, pkgIdx) => (
                <div key={pkgIdx} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', pkg.type === 'pallet' ? 'bg-purple-50 text-purple-600 ring-purple-200' : 'bg-blue-50 text-[var(--primary)] ring-blue-200')}>{pkg.type === 'pallet' ? '托盘' : '纸箱'} #{pkgIdx + 1}</span>
                      <span className="inline-flex items-center font-mono text-[12px] font-medium text-[var(--foreground)]">{pkg.packageNo}<CopyButton text={pkg.packageNo} /></span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                      <span>{pkg.weight}</span>
                      <span>{pkg.dimensions}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 space-y-2">
                    {pkg.items.map((itemName, idx) => {
                      const dcItem = dc.actualItems.find(a => a.name === itemName);
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium text-[var(--foreground)]">{itemName}</span>
                            <span className="text-[var(--muted)]">× {dcItem?.shippedQty ?? '—'}</span>
                          </div>
                          {dcItem && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border-subtle)]">批次: {dcItem.lotNo}</span>
                              {dcItem.serialNumbers.map((sn) => (
                                <span key={sn} className="inline-flex items-center rounded-md bg-amber-50/50 px-2 py-0.5 font-mono text-[10px] text-amber-800 ring-1 ring-inset ring-amber-200">SN: {sn}<CopyButton text={sn} /></span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
