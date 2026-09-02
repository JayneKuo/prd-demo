'use client';

import Link from 'next/link';
import React, { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock3, CreditCard, ExternalLink, FileText, MapPin, Package, Tag, User, AlertTriangle, Copy, Check } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { orders } from '@/lib/mock-data/orders';
import { getOrderDetail, type OrderDetail, type FulfillmentPackage, type PackageUnit } from '@/lib/mock-data/order-details';
import { cn } from '@/lib/utils';
import { OrderTimeline } from '@/components/dashboard/order-timeline';

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
      title="复制"
    >
      {copied ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
    </button>
  );
}

/* ─── Fulfillment status mapping (英文 → 中文友好描述) ─── */
function mapFulfillmentStatus(ful: FulfillmentPackage): string {
  if (ful.status === 'delivered') return '已签收';
  if (ful.status === 'in_transit') return '运输中';
  if (ful.status === 'fulfilled') return '已完成';
  if (ful.status === 'cancelled') return '已取消';
  // in_progress — 根据出库单状态细化
  if (ful.outboundStatus) return ful.outboundStatus;
  return '处理中';
}

const lifecycleLabels = ['下单', '支付', '确认', '履约', '签收'] as const;

type LifecycleStep = {
  label: (typeof lifecycleLabels)[number];
  status: 'complete' | 'current' | 'upcoming';
  /** 有意义的时间/状态描述 */
  detail: string;
};

function getLifecycleStepIndex(detail: OrderDetail) {
  if (detail.fulfillmentStatus === '已签收' || detail.fulfillments.some((fulfillment) => fulfillment.status === 'delivered')) {
    return 4;
  }

  if (detail.fulfillments.length > 0 || ['已发货', '部分履约', '已生成'].includes(detail.fulfillmentStatus)) {
    return 3;
  }

  if (['待处理', '处理中', '挂起', '保留', '已完成'].includes(detail.status) || detail.updatedAt !== detail.createdAt) {
    return 2;
  }

  if (['已支付', '部分退款', '已退款', '待确认'].includes(detail.financialStatus) || detail.transactions.length > 0) {
    return 1;
  }

  return 0;
}

function getLifecycleSteps(detail: OrderDetail): LifecycleStep[] {
  const currentIndex = getLifecycleStepIndex(detail);

  // Build meaningful detail text for each step
  const stepDetails: string[] = [
    // 下单
    detail.createdAt ? detail.createdAt.slice(5, 16) : '',
    // 支付
    detail.financialStatus === '已支付' ? (detail.transactions.find(t => t.kind === 'sale' && t.status === 'success')?.createdAt?.slice(5, 16) ?? '已确认') :
    detail.financialStatus === '待确认' ? '等待确认' :
    detail.financialStatus === '已退款' ? '已退款' : '',
    // 确认
    currentIndex >= 2 ? (detail.status === '保留' ? '已保留' : detail.status === '挂起' ? '已挂起' : detail.status === '已取消' ? '已取消' : '风控通过') : '',
    // 履约
    currentIndex >= 3 ? (detail.fulfillmentStatus === '已签收' ? '全部签收' : detail.fulfillmentStatus === '已发货' ? '全部发货' : detail.fulfillmentStatus === '部分履约' ? '部分完成' : detail.fulfillmentStatus === '已暂停' ? '已暂停' : `${detail.fulfillments.length} 个包裹`) : '',
    // 签收
    currentIndex >= 4 ? (detail.closedAt ? detail.closedAt.slice(5, 16) : '已完成') : ''
  ];

  return lifecycleLabels.map((label, index) => ({
    label,
    status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
    detail: stepDetails[index] || ''
  }));
}

function isSameAddress(detail: OrderDetail) {
  return detail.shippingAddress.formatted === detail.billingAddress.formatted;
}

const detailTabs = ['商品明细', '履约信息', '物流信息'] as const;

type DetailTab = (typeof detailTabs)[number];

/* ─── Page ─── */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const detail = getOrderDetail(id);
  const basicOrder = orders.find((o) => o.id === id);
  const [activeTab, setActiveTab] = useState<DetailTab>('商品明细');
  const [decisionModal, setDecisionModal] = useState<string | null>(null); // fulfillmentOrderNo to show
  const [packageModal, setPackageModal] = useState<string | null>(null); // fulfillment id to show package details
  const fulfillmentItems = useMemo(() => detail?.lineItems.filter((item) => item.requiresShipping) ?? [], [detail]);

  if (!detail && !basicOrder) {
    return (
      <div className="mx-auto max-w-[1280px] py-20 text-center">
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">订单未找到</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">ID: {id} 不存在</p>
        <Link href="/dashboard/orders" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--primary)] hover:underline">
          <ArrowLeft className="size-3.5" />返回订单列表
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-[1280px] pt-5 lg:pt-6">
        <Link href="/dashboard/orders" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
          <ArrowLeft className="size-3.5" />返回订单列表
        </Link>
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">{basicOrder!.orderNo}</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">该订单暂无详细数据。</p>
      </div>
    );
  }

  const lifecycleSteps = getLifecycleSteps(detail);
  const sameAddress = isSameAddress(detail);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      <Link href="/dashboard/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回订单列表
      </Link>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="inline-flex items-center text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{detail.orderNo}<CopyButton text={detail.orderNo} /></h1>
                <StatusBadge status={detail.status} />
                {detail.exception && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                    <AlertTriangle className="size-3" />{detail.exception}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
                <span>{detail.channel} / {detail.merchant}</span>
                <span>·</span>
                <span className="inline-flex items-center">{detail.platformOrderNo}<CopyButton text={detail.platformOrderNo} /></span>
                {detail.referenceNo && <><span>·</span><span className="inline-flex items-center">Ref: {detail.referenceNo}<CopyButton text={detail.referenceNo} /></span></>}
                <span>·</span>
                <span>{detail.createdAt}</span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {/* 根据订单状态动态展示操作按钮 */}
              {(() => {
                type OrderAction = {
                  label: string;
                  variant: 'primary' | 'danger' | 'default';
                  show: (d: OrderDetail) => boolean;
                };

                const orderActions: OrderAction[] = [
                  { label: '确认支付', variant: 'primary', show: (d) => d.financialStatus === '待确认' },
                  { label: '生成履约单', variant: 'primary', show: (d) => d.status === '待处理' && d.fulfillmentStatus === '未开始' && d.financialStatus === '已支付' },
                  { label: '释放保留', variant: 'primary', show: (d) => d.status === '保留' || d.status === '挂起' },
                  { label: '重新验证地址', variant: 'default', show: (d) => d.exception === '地址无效' },
                  { label: '手动分仓', variant: 'default', show: (d) => d.exception === '库存不足' },
                  { label: '催促补货', variant: 'default', show: (d) => d.exception === '库存不足' },
                  { label: '确认发货', variant: 'primary', show: (d) => d.status === '处理中' && d.fulfillments.length > 0 },
                  { label: '打印面单', variant: 'default', show: (d) => ['处理中', '已发货'].includes(d.status) && d.fulfillments.length > 0 },
                  { label: '确认签收', variant: 'primary', show: (d) => d.status === '已发货' },
                  { label: '发起退款', variant: 'danger', show: (d) => d.financialStatus === '已支付' && !['已取消', '已完成'].includes(d.status) },
                  { label: '编辑', variant: 'default', show: (d) => !['已取消', '已完成', '已关闭'].includes(d.status) },
                  { label: '取消订单', variant: 'danger', show: (d) => !['已取消', '已完成', '已关闭', '已发货'].includes(d.status) },
                  { label: '添加备注', variant: 'default', show: (d) => !['已取消', '已关闭'].includes(d.status) },
                  { label: '重新打开', variant: 'default', show: (d) => d.status === '已完成' || d.status === '已关闭' },
                ];

                return orderActions
                  .filter((action) => action.show(detail))
                  .map((action) => (
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

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Order lifecycle</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{detail.financialStatus} · {detail.fulfillmentStatus}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {detail.status === '挂起' || detail.status === '保留' ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-[var(--warning)] ring-1 ring-inset ring-amber-200">On hold</span>
                ) : null}
                {detail.cancelledAt ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">Cancelled</span>
                ) : null}
                {detail.financialStatus === '已退款' ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]">Refunded</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
                {lifecycleSteps.map((step, index) => {
                  const isComplete = step.status === 'complete';
                  const isCurrent = step.status === 'current';
                  return (
                    <div key={step.label} className="relative">
                      {index < lifecycleSteps.length - 1 ? (
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
              <div className="inline-flex rounded-full bg-[var(--surface-subtle)] p-1 text-[13px] font-medium ring-1 ring-inset ring-[var(--border-subtle)]">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'rounded-full px-4 py-1.5 transition-colors',
                      activeTab === tab
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === '商品明细' && (
              <div className="border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-end bg-[var(--surface)] px-4 py-3">
                  <span className="text-[12px] text-[var(--muted)]">{detail.lineItems.length} 行 · {detail.lineItems.reduce((s, i) => s + i.quantity, 0)} 件</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-[13px]">
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2.5">商品</th>
                        <th className="whitespace-nowrap px-3 py-2.5">SKU</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">单价</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">数量</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">折扣</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">税费</th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-right">小计</th>
                        <th className="whitespace-nowrap px-3 py-2.5">履约</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {detail.lineItems.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-[var(--surface-subtle)]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                              <div>
                                <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.weight}g</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="space-y-0.5">
                              <div className="font-mono text-[11px] text-[var(--foreground)]">{item.sku}</div>
                              {item.channelSku && <div className="font-mono text-[10px] text-[var(--muted)]">渠道: {item.channelSku}</div>}
                              {item.warehouseSku && <div className="font-mono text-[10px] text-[var(--muted)]">仓库: {item.warehouseSku}</div>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">{item.unitPrice}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">{item.quantity}{item.unit ? <span className="ml-0.5 text-[11px] text-[var(--muted)]">{item.unit}</span> : null}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--success)]">{item.discount !== '$0.00' && item.discount !== '£0.00' && item.discount !== 'S$0.00' ? `-${item.discount}` : '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{item.tax}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-[var(--foreground)]">{item.subtotal}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div>
                              <StatusBadge status={item.fulfillmentStatus} />
                              {item.fulfillmentNote && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
                  <div className="ml-auto w-[260px] space-y-1 text-[13px]">
                    <div className="flex justify-between"><span className="text-[var(--muted)]">商品小计</span><span>{detail.subtotal}</span></div>
                    {detail.discountCodes.length > 0 && <div className="flex justify-between"><span className="text-[var(--muted)]">折扣 ({detail.discountCodes[0].code})</span><span className="text-[var(--success)]">-{detail.totalDiscount}</span></div>}
                    <div className="flex justify-between"><span className="text-[var(--muted)]">运费</span><span>{detail.totalShipping}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--muted)]">税费{detail.taxesIncluded ? ' (含税价)' : ''}</span><span>{detail.totalTax}</span></div>
                    <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-semibold"><span>订单总额</span><span className="text-[15px]">{detail.totalPrice}</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === '履约信息' && (
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4">
                {/* Stats row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">履约单数</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{detail.fulfillments.length || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">已履约商品</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{fulfillmentItems.filter((item) => item.fulfillmentStatus !== '未开始').reduce((sum, item) => sum + item.quantity, 0)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">待处理商品</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{fulfillmentItems.filter((item) => item.fulfillmentStatus === '未开始').reduce((sum, item) => sum + item.quantity, 0)}</div>
                  </div>
                </div>

                {/* Per-fulfillment-order cards */}
                <div className="mt-4 space-y-4">
                  {detail.fulfillments.map((ful, fulIndex) => {
                    const packageItems = ful.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                    return (
                      <div key={ful.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        {/* Fulfillment order header */}
                        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#{fulIndex + 1}</span>
                          <span className="inline-flex items-center font-mono text-[13px] font-semibold text-[var(--foreground)]">{ful.fulfillmentOrderNo ?? ful.id}<CopyButton text={ful.fulfillmentOrderNo ?? ful.id} /></span>
                          <StatusBadge status={mapFulfillmentStatus(ful)} />
                          <span className="text-[12px] text-[var(--muted)]">{ful.warehouse}</span>
                          <button
                            type="button"
                            onClick={() => setDecisionModal(ful.fulfillmentOrderNo ?? ful.id)}
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]"
                          >
                            <svg className="size-3" viewBox="0 0 16 16" fill="none"><path d="M8 1v6m0 0l3-3m-3 3L5 4M2 9v4a2 2 0 002 2h8a2 2 0 002-2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            查看决策
                          </button>
                        </div>

                        {/* Items in this fulfillment order */}
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {packageItems.map((item) => item && (
                            <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                  <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.weight}g</div>
                                  <div className="mt-0.5 space-x-2 font-mono text-[10px] text-[var(--muted)]">
                                    <span>{item.sku}</span>
                                    {item.channelSku && <span>· 渠道: {item.channelSku}</span>}
                                    {item.warehouseSku && <span>· 仓库: {item.warehouseSku}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-center sm:px-3">× {item.quantity}{item.unit ? <span className="ml-0.5 text-[11px] text-[var(--muted)]">{item.unit}</span> : null}</div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-right sm:px-3">{item.unitPrice}</div>
                              <div className="sm:text-right sm:min-w-[90px]">
                                <StatusBadge status={item.fulfillmentStatus} />
                                {item.fulfillmentNote && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 关联信息 */}
                        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <div className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">出库单</span>
                              <div className="mt-0.5 inline-flex items-center font-mono font-medium text-[var(--foreground)]">{ful.outboundOrderNo ?? '—'}{ful.outboundOrderNo && <CopyButton text={ful.outboundOrderNo} />}</div>
                              {ful.outboundStatus && <div className="mt-0.5"><StatusBadge status={ful.outboundStatus} /></div>}
                            </div>
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">承运商 / 运单</span>
                              <div className="mt-0.5 font-medium text-[var(--foreground)]">{ful.carrier}</div>
                              {ful.trackingNumber ? (
                                <div className="mt-0.5 inline-flex items-center font-mono text-[11px] text-[var(--muted)]">{ful.trackingNumber}<CopyButton text={ful.trackingNumber} /></div>
                              ) : (
                                <div className="mt-0.5 text-[11px] text-[var(--muted)]">待生成</div>
                              )}
                            </div>
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">发货仓</span>
                              <div className="mt-0.5 font-medium text-[var(--foreground)]">{ful.warehouse ?? '—'}</div>
                              <div className="mt-0.5 text-[11px] text-[var(--muted)]">{ful.shippedAt ? `发货 ${ful.shippedAt}` : '待发货'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unfulfilled items — 待生成履约单 */}
                  {(() => {
                    const fulfilledIds = new Set(detail.fulfillments.flatMap((ful) => ful.lineItemIds));
                    const unfulfilledItems = fulfillmentItems.filter((item) => !fulfilledIds.has(item.id));
                    if (unfulfilledItems.length === 0) return null;
                    return (
                      <div className="overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
                        <div className="flex items-center gap-3 border-b border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <span className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-[11px] font-bold text-[var(--warning)]">?</span>
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">待生成履约单</span>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-[var(--warning)] ring-1 ring-inset ring-amber-200">{unfulfilledItems.reduce((sum, item) => sum + item.quantity, 0)} 件待处理</span>
                        </div>
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {unfulfilledItems.map((item) => (
                            <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_80px_100px] sm:items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                  <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.sku}</div>
                                </div>
                              </div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-center">× {item.quantity}</div>
                              <div className="sm:text-right"><StatusBadge status={item.fulfillmentStatus} /></div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-dashed border-[var(--border-subtle)] bg-amber-50/30 px-4 py-2.5 text-[11px] text-[var(--muted)]">
                          等待库存补货或人工确认后生成履约单
                        </div>
                      </div>
                    );
                  })()}

                  {/* Empty state */}
                  {detail.fulfillments.length === 0 && fulfillmentItems.filter((item) => item.fulfillmentStatus === '未开始').length === 0 && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-8 text-center">
                      <Package className="mx-auto size-8 text-[var(--border)]" />
                      <p className="mt-2 text-[13px] text-[var(--muted)]">暂无履约单 · 商品确认后将自动生成</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === '物流信息' && (
              <div>
                <div className="flex flex-col gap-2 bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] text-[var(--muted)]">收货: {detail.shippingAddress.name} · {detail.shippingAddress.formatted}</div>
                  <span className="text-[12px] text-[var(--muted)]">{detail.fulfillments.length > 0 ? `${detail.fulfillments.length} 个发运单` : '待发货'}</span>
                </div>
                {detail.fulfillments.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Package className="mx-auto size-8 text-[var(--border)]" />
                    <p className="mt-2 text-[13px] text-[var(--muted)]">暂无物流记录 · 等待发货后生成包裹与追踪信息</p>
                  </div>
                ) : (
                  <div className="space-y-4 px-4 py-4">
                    {detail.fulfillments.map((ful, fulIndex) => {
                      const packageItems = ful.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                      const hasPallet = !!ful.palletNo;
                      const shippingModeLabel: Record<string, { label: string; icon: string }> = {
                        parcel: { label: '小包裹', icon: '📦' },
                        express: { label: '快递', icon: '⚡' },
                        ltl: { label: '零担(陆运)', icon: '🚛' },
                        ftl: { label: '整车(陆运)', icon: '🚚' },
                        freight: { label: '货运', icon: '🚛' },
                        air: { label: '空运', icon: '✈️' },
                        sea_fcl: { label: '海运整柜', icon: '🚢' },
                        sea_lcl: { label: '海运拼柜', icon: '🚢' },
                        rail: { label: '铁运', icon: '🚄' },
                      };
                      const modeInfo = ful.shippingMode ? shippingModeLabel[ful.shippingMode] ?? { label: ful.shippingMode, icon: '📦' } : null;
                      return (
                        <div key={ful.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          {/* Header bar */}
                          <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                            <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#{fulIndex + 1}</span>
                            <StatusBadge status={mapFulfillmentStatus(ful)} />
                            {modeInfo && (
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                                (ful.shippingMode === 'ltl' || ful.shippingMode === 'ftl' || ful.shippingMode === 'freight') && 'bg-purple-50 text-purple-600 ring-purple-200',
                                ful.shippingMode === 'parcel' && 'bg-blue-50 text-[var(--primary)] ring-blue-200',
                                ful.shippingMode === 'express' && 'bg-green-50 text-[var(--success)] ring-green-200',
                                (ful.shippingMode === 'air') && 'bg-sky-50 text-sky-600 ring-sky-200',
                                (ful.shippingMode === 'sea_fcl' || ful.shippingMode === 'sea_lcl') && 'bg-cyan-50 text-cyan-600 ring-cyan-200',
                                ful.shippingMode === 'rail' && 'bg-amber-50 text-amber-600 ring-amber-200',
                              )}>
                                <span>{modeInfo.icon}</span>
                                <span>{modeInfo.label}</span>
                              </span>
                            )}
                            <span className="text-[13px] font-medium text-[var(--foreground)]">{ful.carrier}</span>
                            {ful.serviceLevel && <span className="text-[11px] text-[var(--muted)]">· {ful.serviceLevel}</span>}
                            {ful.trackingUrl && (
                              <a href={ful.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]">
                                追踪 <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>

                          {/* Items — horizontal layout matching fulfillment tab */}
                          <div className="divide-y divide-[var(--border-subtle)]">
                            {packageItems.map((item) => item && (
                              <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                  <div>
                                    <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                    <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.weight}g</div>
                                    <div className="mt-0.5 space-x-2 font-mono text-[10px] text-[var(--muted)]">
                                      <span>{item.sku}</span>
                                      {item.channelSku && <span>· 渠道: {item.channelSku}</span>}
                                      {item.warehouseSku && <span>· 仓库: {item.warehouseSku}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[12px] text-[var(--foreground)] sm:text-center sm:px-3">× {item.quantity}{item.unit && <span className="ml-0.5 text-[10px] text-[var(--muted)]">{item.unit}</span>}</div>
                                <div className="text-[12px] text-[var(--foreground)] sm:text-right sm:px-3">{item.unitPrice}</div>
                                <div className="sm:text-right sm:min-w-[90px]">
                                  <StatusBadge status={item.fulfillmentStatus} />
                                  {item.fulfillmentNote && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Shipping details — two column label-value layout */}
                          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                            <div className="grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
                              {/* 通用字段 */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">运单号</span>
                                <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.trackingNumber || '待生成'}{ful.trackingNumber && <CopyButton text={ful.trackingNumber} />}</span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货仓</span>
                                <span className="font-medium text-[var(--foreground)]">{ful.warehouse ?? '—'}</span>
                              </div>
                              {ful.masterTrackingNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">主单号</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.masterTrackingNo}<CopyButton text={ful.masterTrackingNo} /></span>
                                </div>
                              )}

                              {/* 陆运 LTL/FTL 特有 */}
                              {ful.bolNumber && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">BOL</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.bolNumber}<CopyButton text={ful.bolNumber} /></span>
                                </div>
                              )}
                              {ful.proNumber && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">PRO</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.proNumber}</span>
                                </div>
                              )}

                              {/* 海运特有 */}
                              {ful.vesselVoyage && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">船名航次</span>
                                  <span className="text-[var(--foreground)]">{ful.vesselVoyage}</span>
                                </div>
                              )}
                              {ful.containerNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">集装箱号</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.containerNo}<CopyButton text={ful.containerNo} />{ful.containerType && <span className="ml-1.5 rounded bg-cyan-50 px-1 text-[10px] font-medium text-cyan-700">{ful.containerType}</span>}</span>
                                </div>
                              )}
                              {ful.sealNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">封条号</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.sealNo}</span>
                                </div>
                              )}
                              {ful.portOfLoading && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">装货港</span>
                                  <span className="text-[var(--foreground)]">{ful.portOfLoading}</span>
                                </div>
                              )}
                              {ful.portOfDischarge && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">卸货港</span>
                                  <span className="text-[var(--foreground)]">{ful.portOfDischarge}</span>
                                </div>
                              )}

                              {/* 空运特有 */}
                              {ful.flightNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">航班号</span>
                                  <span className="font-medium text-[var(--foreground)]">{ful.flightNo}</span>
                                </div>
                              )}
                              {ful.mawb && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">MAWB</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.mawb}<CopyButton text={ful.mawb} /></span>
                                </div>
                              )}
                              {ful.hawb && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">HAWB</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.hawb}<CopyButton text={ful.hawb} /></span>
                                </div>
                              )}
                              {ful.departureAirport && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">起飞</span>
                                  <span className="text-[var(--foreground)]">{ful.departureAirport}</span>
                                </div>
                              )}
                              {ful.arrivalAirport && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">降落</span>
                                  <span className="text-[var(--foreground)]">{ful.arrivalAirport}</span>
                                </div>
                              )}

                              {/* 铁运特有 */}
                              {ful.trainNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">班列号</span>
                                  <span className="font-medium text-[var(--foreground)]">{ful.trainNo}</span>
                                </div>
                              )}
                              {ful.wagonNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">车皮号</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.wagonNo}</span>
                                </div>
                              )}
                              {ful.departureStation && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">始发站</span>
                                  <span className="text-[var(--foreground)]">{ful.departureStation}</span>
                                </div>
                              )}
                              {ful.arrivalStation && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">到达站</span>
                                  <span className="text-[var(--foreground)]">{ful.arrivalStation}</span>
                                </div>
                              )}

                              {/* 包装信息（通用） */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">包装</span>
                                <span className="text-[var(--foreground)]">
                                  {ful.packages && ful.packages.length > 0 ? (
                                    <>{ful.packages.length} 个包装单元</>
                                  ) : hasPallet ? (
                                    <>{ful.palletNo}{ful.palletCount && ful.palletCount > 1 ? ` (${ful.palletCount}板)` : ''}{ful.packageCount ? ` · 含${ful.packageCount}包裹` : ''}</>
                                  ) : ful.packageNo ? (
                                    <>{ful.packageNo}{ful.packageCount && ful.packageCount > 1 ? ` (${ful.packageCount}件)` : ''}</>
                                  ) : '—'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">重量</span>
                                <span className="text-[var(--foreground)]">{ful.totalWeight ?? '—'}{ful.dimensions ? ` · ${ful.dimensions}` : ''}</span>
                              </div>

                              {/* 时间信息（通用） */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货</span>
                                <span className="text-[var(--foreground)]">{ful.shippedAt ?? '—'}</span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">预计到达</span>
                                <span className="text-[var(--foreground)]">{ful.estimatedDelivery ?? '—'}</span>
                              </div>
                              {ful.deliveredAt && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">签收</span>
                                  <span className="text-[var(--success)]">{ful.deliveredAt}</span>
                                </div>
                              )}
                            </div>

                            {/* 包装明细 — 多托盘/多包裹展开 */}
                            {ful.packages && ful.packages.length > 0 && (
                              <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-medium text-[var(--foreground)]">{ful.packages.length} 个包装单元</span>
                                  <span className="text-[var(--muted)]">
                                    ({ful.packages.filter(p => p.type === 'pallet').length > 0 && `${ful.packages.filter(p => p.type === 'pallet').length}托盘`}
                                    {ful.packages.filter(p => p.type === 'pallet').length > 0 && ful.packages.filter(p => p.type !== 'pallet').length > 0 && ' + '}
                                    {ful.packages.filter(p => p.type !== 'pallet').length > 0 && `${ful.packages.filter(p => p.type !== 'pallet').length}包裹`})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPackageModal(ful.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]"
                                >
                                  查看明细
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ⑥ 操作时间线 — 根据当前 Tab 过滤，支持折叠分组与分页 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]">
                <Clock3 className="size-4 text-[var(--muted)]" />操作时间线
              </h2>
              <span className="text-[12px] text-[var(--muted)]">
                {activeTab === '商品明细' && '全部事件'}
                {activeTab === '履约信息' && '履约决策'}
                {activeTab === '物流信息' && '物流跟踪'}
                {' · '}
                {detail.events.filter((event) => {
                  if (activeTab === '履约信息') return event.type === 'fulfillment';
                  if (activeTab === '物流信息') return event.type === 'logistics';
                  return true;
                }).length} 条记录
              </span>
            </div>
            <div className="px-4 py-4">
              <OrderTimeline events={detail.events} activeTab={activeTab} />
            </div>
          </section>

        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><User className="size-4 text-[var(--muted)]" />客户</h2>
            </div>
            <div className="px-4 py-3">
              <div className="text-[14px] font-medium text-[var(--foreground)]">{detail.customer.name}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">{detail.customer.email}</div>
              {detail.customer.phone && <div className="text-[12px] text-[var(--muted)]">{detail.customer.phone}</div>}
              <div className="mt-2.5 flex items-center gap-4 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                <div className="text-center"><div className="font-semibold text-[var(--foreground)]">{detail.customer.ordersCount}</div><div className="text-[var(--muted)]">订单</div></div>
                <div className="h-6 w-px bg-[var(--border-subtle)]" />
                <div className="text-center"><div className="font-semibold text-[var(--foreground)]">{detail.customer.totalSpent}</div><div className="text-[var(--muted)]">累计消费</div></div>
              </div>
              {detail.customer.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {detail.customer.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)]">{tag}</span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-[11px] text-[var(--muted-foreground)]">{detail.customer.acceptsMarketing ? '✓ 接受营销' : '✗ 不接受营销'}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><MapPin className="size-3.5 text-[var(--muted)]" />收货地址</h2>
            </div>
            <div className="space-y-1.5 px-4 py-3 text-[12px]">
              <div className="font-medium text-[var(--foreground)]">{detail.shippingAddress.name}</div>
              <div className="text-[var(--muted)]">{detail.shippingAddress.phone}</div>
              <div className="leading-5 text-[var(--foreground)]">{detail.shippingAddress.formatted}</div>
              <div className="rounded-lg bg-[var(--surface-subtle)] px-2.5 py-2 text-[11px] text-[var(--muted)]">{detail.shippingMethod}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><CreditCard className="size-3.5 text-[var(--muted)]" />账单地址</h2>
            </div>
            <div className="space-y-1.5 px-4 py-3 text-[12px]">
              {sameAddress ? (
                <div className="inline-flex w-fit rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)]">Same as shipping</div>
              ) : null}
              <div className="font-medium text-[var(--foreground)]">{detail.billingAddress.name}</div>
              <div className="text-[var(--muted)]">{detail.billingAddress.phone}</div>
              <div className="leading-5 text-[var(--foreground)]">{detail.billingAddress.formatted}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><CreditCard className="size-3.5 text-[var(--muted)]" />支付</h2>
            </div>
            <div className="px-4 py-3 space-y-3">
              {detail.transactions.map((txn) => (
                <div key={txn.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', txn.kind === 'refund' ? 'bg-amber-50 text-[var(--warning)] ring-amber-200' : 'bg-green-50 text-[var(--success)] ring-green-200')}>{txn.kind === 'refund' ? '退款' : txn.kind === 'authorization' ? '授权' : '收款'}</span>
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">{txn.amount}</span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-[11px] text-[var(--muted)]">
                    <div>{txn.method}</div>
                    <div>{txn.gateway} · {txn.createdAt}</div>
                    <div className="rounded-md bg-[var(--surface)] px-2 py-1 ring-1 ring-inset ring-[var(--border-subtle)]">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Transaction ID</div>
                      <div className="mt-0.5 inline-flex items-center font-mono text-[10px] text-[var(--foreground)]">{txn.id}<CopyButton text={txn.id} /></div>
                    </div>
                    {txn.gatewayReference && (
                      <div className="rounded-md bg-[var(--surface)] px-2 py-1 ring-1 ring-inset ring-[var(--border-subtle)]">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Gateway Ref</div>
                        <div className="mt-0.5 inline-flex items-center font-mono text-[10px] text-[var(--foreground)]">{txn.gatewayReference}<CopyButton text={txn.gatewayReference} /></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {detail.refunds.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5">
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--warning)]">退款</div>
                  {detail.refunds.map((ref) => (
                    <div key={ref.id} className="text-[11px]">
                      <div className="flex justify-between"><span className="font-medium text-[var(--foreground)]">{ref.amount}</span><span className="text-[var(--muted)]">{ref.createdAt}</span></div>
                      <div className="text-[var(--muted)]">{ref.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Tag className="size-3.5 text-[var(--muted)]" />标签与备注</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {detail.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)]">{tag}</span>
                  ))}
                </div>
              ) : <div className="text-[12px] text-[var(--muted)]">无标签</div>}
              {detail.note ? (
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--foreground)]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户备注</div>
                  {detail.note}
                </div>
              ) : <div className="text-[12px] text-[var(--muted)]">无备注</div>}
            </div>
          </section>

          {detail.platformMeta && Object.keys(detail.platformMeta).length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><FileText className="size-3.5 text-[var(--muted)]" />平台元数据</h2>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {Object.entries(detail.platformMeta).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{key}</span>
                    <span className="max-w-[160px] truncate text-[11px] text-[var(--foreground)]">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ─── 包装明细弹窗 ─── */}
      {packageModal && (() => {
        const modalFul = detail.fulfillments.find((f) => f.id === packageModal);
        if (!modalFul || !modalFul.packages) return null;
        const typeLabel: Record<string, string> = { pallet: '托盘', carton: '纸箱', crate: '木箱', bag: '袋', drum: '桶' };
        // Collect all copyable values
        const allNos = modalFul.packages.map((p) => p.no);
        const allSNs = detail.lineItems.filter((li) => modalFul.lineItemIds.includes(li.id)).flatMap((li) => li.serialNumbers ?? []);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPackageModal(null)}>
            <div className="mx-4 w-full max-w-[600px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">包装明细</h3>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">{modalFul.packages.length} 个包装单元 · {modalFul.carrier}</p>
                </div>
                <div className="flex items-center gap-2">
                  {allNos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(allNos.join('\n'))}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"
                    >
                      <Copy className="size-3" />
                      复制全部编号
                    </button>
                  )}
                  {allSNs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(allSNs.join('\n'))}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"
                    >
                      <Copy className="size-3" />
                      复制全部SN
                    </button>
                  )}
                  <button type="button" onClick={() => setPackageModal(null)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                    <svg className="size-4" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(80vh - 100px)' }}>
                {modalFul.packages.map((pkg, pkgIdx) => {
                  const pkgItems = pkg.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                  const pkgSNs = pkgItems.flatMap((item) => item?.serialNumbers ?? []);
                  return (
                    <div key={pkg.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                            pkg.type === 'pallet' ? 'bg-purple-50 text-purple-600 ring-purple-200' : 'bg-blue-50 text-[var(--primary)] ring-blue-200'
                          )}>{typeLabel[pkg.type] ?? pkg.type} #{pkgIdx + 1}</span>
                          <span className="inline-flex items-center font-mono text-[12px] font-medium text-[var(--foreground)]">{pkg.no}<CopyButton text={pkg.no} /></span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                          {pkg.weight && <span>{pkg.weight}</span>}
                          {pkg.dimensions && <span>{pkg.dimensions}</span>}
                        </div>
                      </div>
                      <div className="px-4 py-2.5 space-y-2">
                        {pkgItems.map((item) => item && (
                          <div key={item.id}>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-medium text-[var(--foreground)]">{item.title}</span>
                              <span className="text-[var(--muted)]">× {item.quantity}{item.unit ?? ''}</span>
                            </div>
                            {item.batchNo && <div className="mt-0.5 text-[10px] text-[var(--muted)]">批次: {item.batchNo}</div>}
                            {item.serialNumbers && item.serialNumbers.length > 0 && (
                              <div className="mt-1 rounded-md bg-amber-50/50 px-2.5 py-1.5 ring-1 ring-inset ring-amber-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-amber-700">SN ({item.serialNumbers.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(item.serialNumbers!.join('\n'))}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 hover:text-amber-900"
                                  >
                                    <Copy className="size-2.5" />复制
                                  </button>
                                </div>
                                <div className="mt-1 space-y-0.5 font-mono text-[10px] text-amber-800">
                                  {item.serialNumbers.map((sn) => (
                                    <div key={sn}>{sn}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {pkg.note && <div className="text-[10px] text-[var(--muted)] italic">{pkg.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 决策详情弹窗 ─── */}
      {decisionModal && (() => {
        // 获取当前履约单关联的所有决策事件
        const relatedEvents = detail.events
          .filter((e) => e.type === 'fulfillment' && (e.fulfillmentOrderNo === decisionModal || !e.fulfillmentOrderNo))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // 找到对应的 fulfillment 包裹信息
        const relatedFuls = detail.fulfillments.filter((f) => f.fulfillmentOrderNo === decisionModal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDecisionModal(null)}>
            <div className="mx-4 w-full max-w-[640px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">履约决策详情</h3>
                  <p className="mt-0.5 inline-flex items-center font-mono text-[12px] text-[var(--muted)]">{decisionModal}<CopyButton text={decisionModal} /></p>
                </div>
                <button type="button" onClick={() => setDecisionModal(null)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                  <svg className="size-4" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(80vh - 130px)' }}>
                {/* 履约单概况 */}
                {relatedFuls.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">履约单概况</div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3 text-[12px]">
                      <div>
                        <div className="text-[var(--muted)]">命中规则</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].matchedRule ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">选仓结果</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].warehouse ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">选仓原因</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].warehouseReason ?? '—'}</div>
                      </div>
                    </div>
                    {relatedFuls.length > 1 && (
                      <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                        <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">出库单拆分 ({relatedFuls.length} 个包裹)</div>
                        {relatedFuls.map((f, i) => (
                          <div key={f.id} className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 ring-1 ring-inset ring-[var(--border-subtle)]">
                            <span className="flex size-5 items-center justify-center rounded bg-[var(--primary-soft)] text-[10px] font-bold text-[var(--primary)]">{i + 1}</span>
                            <span className="font-mono text-[11px] text-[var(--foreground)]">{f.outboundOrderNo}</span>
                            <span className="text-[11px] text-[var(--muted)]">{f.carrier} · {f.lineItemIds.length} 件</span>
                            {f.warehouseReason && <span className="ml-auto text-[10px] text-[var(--muted)]">{f.warehouseReason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 决策时间线 (正序展示) */}
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-3">决策流程 ({relatedEvents.length} 步)</div>
                {relatedEvents.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-[var(--muted)]">暂无决策记录</div>
                ) : (
                  <ol className="relative border-l-2 border-[var(--border-subtle)] pl-5 space-y-4">
                    {relatedEvents.map((event, idx) => (
                      <li key={event.id} className="relative">
                        <span className={cn(
                          'absolute -left-[21px] flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[var(--surface)]',
                          idx === relatedEvents.length - 1 ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border-subtle)]'
                        )}>{idx + 1}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-[var(--foreground)]">{event.title}</span>
                          <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">{event.time}</span>
                        </div>
                        {event.description && (
                          <p className="mt-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] leading-5 text-[var(--muted)]">{event.description}</p>
                        )}
                        {event.ruleName && (
                          <div className="mt-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] ring-1 ring-inset ring-blue-200">
                              ⚡ {event.ruleName}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-right">
                <button type="button" onClick={() => setDecisionModal(null)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
                  关闭
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
