'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock3, Package, Truck } from 'lucide-react';
import { useOms } from './provider';
import { cn } from '@/lib/utils';
import { warehouses } from '@/lib/mock-data/warehouses';
import type {
  InboundOrder, InboundPlan, OutboundOrder, OutboundPlan,
  PlatformAllocation, PurchaseOrder, ReplenishmentPlan, TransferOrder,
} from './replenishment';
import { inboundReasonLabels, itemTotal, destinationNeedsPlatform } from './replenishment';
import type { OmsSnapshot } from './types';
import {
  ActionButton, CancelDialog, ConfirmAction, ConfirmDialog,
  DispatchDialog, LabelPreviewDialog, RecordDirectDispatchDialog, ReceiveDialog,
  Toaster, useToast,
} from './inbound-modals';
import { pluginStatusLabels } from './replenishment';
import { BoxingWorkstation, PackingGroupBoxingWorkstation } from './boxing-workstation';
import { PackingOptionsWorkstation } from './packing-options-workstation';
import { PlacementWorkstation } from './placement-workstation';
import { TransportWorkstation } from './transport-workstation';

// ─── Labels ───────────────────────────────────────────────────────────────────

const sourceLabels: Record<ReplenishmentPlan['sourceType'], string> = {
  transfer: '调拨来源', purchase: '采购来源', third_party_fulfillment: '第三方仓代发',
  own_warehouse: '自有仓发货', third_party_warehouse: '三方仓代发',
  supplier: '供应商直发', retailer: 'Retailer 直发',
};
const destinationLabels: Record<ReplenishmentPlan['destinationType'], string> = {
  oms_warehouse: 'OMS 仓库', third_party_warehouse: '第三方仓',
  amazon_fba: 'Amazon FBA', tiktok_fulfillment: 'TikTok 仓', walmart_fc: 'Walmart FC',
};
const reasonLabels: Record<ReplenishmentPlan['reason'], string> = {
  manual: '手工补货', safety_stock: '安全库存', forecast: '销售预测',
  promotion: '促销备货', stockout: '缺货补货', seasonal: '季节性备货',
};
const inboundStatusLabels: Record<InboundPlan['status'], string> = {
  draft: '草稿', pending_approval: '待审批', approved: '已审批', preparing: '准备中',
  awaiting_platform: '待申请平台入仓', packing_options: '待确认包装方案',
  packing: '待提交装箱信息', placement_options: '待确认分仓方案',
  platform_confirmed: '平台已确认', transport_preparing: '待确认运输',
  ready_for_execution: '待发货', executing: '收货中', receiving: '收货中',
  partially_received: '部分收货', completed: '已完成', cancelled: '已取消', exception: '异常',
};
const execStatusLabels: Record<InboundOrder['status'], string> = {
  draft: '草稿', planned: '已计划', released: '已下发', in_progress: '执行中',
  shipped: '已发运', receiving: '收货中', completed: '已完成', cancelled: '已取消', exception: '异常',
};
const planStatusCfg: Record<ReplenishmentPlan['status'], { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
  pending_approval: { label: '待审批', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  approved: { label: '已审批', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  inbound_planning: { label: '入库计划中', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  executing: { label: '执行中', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  partially_completed: { label: '部分完成', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
  exception: { label: '异常', cls: 'bg-red-50 text-red-700 ring-red-200' },
};
const inboundStatusCls: Record<InboundPlan['status'], string> = {
  draft: 'bg-gray-50 text-gray-600 ring-gray-200', pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-blue-50 text-blue-700 ring-blue-200', preparing: 'bg-gray-50 text-gray-600 ring-gray-200',
  awaiting_platform: 'bg-amber-50 text-amber-700 ring-amber-200', packing_options: 'bg-amber-50 text-amber-700 ring-amber-200',
  packing: 'bg-amber-50 text-amber-700 ring-amber-200', placement_options: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  platform_confirmed: 'bg-blue-50 text-blue-700 ring-blue-200', transport_preparing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ready_for_execution: 'bg-indigo-50 text-indigo-700 ring-indigo-200', executing: 'bg-sky-50 text-sky-700 ring-sky-200',
  receiving: 'bg-orange-50 text-orange-700 ring-orange-200', partially_received: 'bg-orange-50 text-orange-700 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cancelled: 'bg-slate-50 text-slate-500 ring-slate-200',
  exception: 'bg-red-50 text-red-700 ring-red-200',
};
const execStatusCls: Record<InboundOrder['status'], string> = {
  draft: 'bg-gray-50 text-gray-500 ring-gray-200', planned: 'bg-gray-50 text-gray-600 ring-gray-200',
  released: 'bg-blue-50 text-blue-700 ring-blue-200', in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200', receiving: 'bg-orange-50 text-orange-700 ring-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cancelled: 'bg-slate-50 text-slate-500 ring-slate-200',
  exception: 'bg-red-50 text-red-700 ring-red-200',
};

// ─── 路由 ─────────────────────────────────────────────────────────────────────

export function ReplenishmentDetail({ type, id }: { type: 'plan' | 'inbound' | 'inbound-order'; id: string }) {
  const { snapshots, ready, error, executeReplenishment } = useOms();
  const decodedId = decodeURIComponent(id);
  const match = snapshots.map(snapshot => ({
    snapshot,
    plan: snapshot.replenishmentPlans?.find(p => p.id === id || p.id === decodedId),
    inbound: snapshot.inboundPlansV2?.find(p => p.id === id || p.id === decodedId),
    order: snapshot.inboundOrders?.find(p => p.id === id || p.id === decodedId),
  })).find(row => type === 'plan' ? !!row.plan : type === 'inbound' ? !!row.inbound : !!row.order);

  if (!ready) return <p className="p-6 text-sm text-[var(--muted)]">正在加载单据…</p>;
  if (error) return <p role="alert" className="p-6 text-sm text-[var(--danger)]">{error}</p>;
  if (!match) return (
    <div className="mx-auto max-w-[1440px] py-20 text-center">
      <h1 className="text-[20px] font-semibold">单据未找到</h1>
      <p className="mt-2 text-[14px] text-[var(--muted)]">ID: {id}</p>
      <Link href={type === 'inbound' ? '/dashboard/inbound-plans' : type === 'inbound-order' ? '/dashboard/inbound-orders' : '/dashboard/replenishment'} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--primary)] hover:underline">
        <ArrowLeft className="size-3.5" />返回
      </Link>
    </div>
  );
  if (type === 'plan' && match.plan) return <PlanDetail plan={match.plan} snapshot={match.snapshot} />;
  if (type === 'inbound' && match.inbound) return <InboundDetail plan={match.inbound} snapshot={match.snapshot} execute={executeReplenishment} />;
  if (type === 'inbound-order' && match.order) return <InboundOrderDetail order={match.order} snapshot={match.snapshot} />;
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function warehouseLabel(id: string | undefined) {
  if (!id) return '—';
  if (id.startsWith('platform-')) {
    if (id.includes('amazon')) return 'Amazon FBA US · 平台仓';
    if (id.includes('tiktok')) return 'TikTok Fulfillment US · 平台仓';
    if (id.includes('walmart')) return 'Walmart WFS US · 平台仓';
  }
  const wh = warehouses.find(w => w.id === id);
  return wh ? `${wh.code} · ${wh.name}` : id;
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', cls)}>{children}</span>;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ─── 进度步骤 ─────────────────────────────────────────────────────────────────

type ProgressStep = { key: string; label: string; detail?: string };

function getPlanSteps(plan: ReplenishmentPlan, inboundPlan?: InboundPlan): ProgressStep[] {
  const inboundDetail = inboundPlan ? inboundStatusLabels[inboundPlan.status] : undefined;
  return [
    { key: 'draft',            label: '草稿',    detail: plan.createdAt.replace('T', ' ').slice(0, 16) },
    { key: 'pending_approval', label: '待审批',  detail: plan.status === 'pending_approval' ? '等待审批' : (plan.approvedAt ? '已提交' : '') },
    { key: 'inbound_planning', label: '入库计划', detail: inboundDetail },
    { key: 'executing',        label: '执行中',   detail: plan.plannedShipDate ? `计划 ${plan.plannedShipDate}` : undefined },
    { key: 'completed',        label: '已完成',   detail: plan.completedAt ? plan.completedAt.replace('T', ' ').slice(0, 10) : undefined },
  ];
}
const stepIndexMap: Partial<Record<ReplenishmentPlan['status'], number>> = {
  draft: 0, pending_approval: 1, approved: 2, inbound_planning: 2, executing: 3, partially_completed: 3, completed: 4,
};

type StepDef = { key: string; label: string };

function getFbaSteps(plan: InboundPlan): StepDef[] {
  const isBoxFirst = plan.shipmentMode !== 'placement_first';
  if (isBoxFirst) {
    return [
      { key: 'create',    label: '创建计划' }, { key: 'apply', label: '申请入仓' },
      { key: 'boxing',    label: '商品装箱' }, { key: 'placement', label: '确认分仓' },
      { key: 'transport', label: '配送服务' }, { key: 'labels', label: '获取标签' },
      { key: 'dispatch',  label: '出库发运' },
    ];
  }
  return [
    { key: 'create',    label: '创建计划' }, { key: 'apply', label: '申请入仓' },
    { key: 'placement', label: '确认分仓' }, { key: 'boxing', label: '商品装箱' },
    { key: 'transport', label: '配送服务' }, { key: 'labels', label: '获取标签' },
    { key: 'dispatch',  label: '出库发运' },
  ];
}

function getFbaCurrentStep(plan: InboundPlan): number {
  const isBoxFirst = plan.shipmentMode !== 'placement_first';
  if (['draft', 'pending_approval', 'approved'].includes(plan.status)) return 0;
  if (plan.status === 'awaiting_platform') return 1;
  if (isBoxFirst) {
    if (['packing_options', 'packing'].includes(plan.status)) return 2;
    if (plan.status === 'placement_options') return 3;
    if (plan.status === 'transport_preparing') return 4;
    if (plan.status === 'ready_for_execution') return plan.labelsReady ? 6 : 5;
    if (['executing', 'receiving', 'partially_received'].includes(plan.status)) return 6;
    if (plan.status === 'completed') return 7;
  } else {
    if (plan.status === 'placement_options') return 2;
    if (plan.status === 'packing') return 3;
    if (plan.status === 'transport_preparing') return 4;
    if (plan.status === 'ready_for_execution') return plan.labelsReady ? 6 : 5;
    if (['executing', 'receiving', 'partially_received'].includes(plan.status)) return 6;
    if (plan.status === 'completed') return 7;
  }
  return 0;
}

function getOmsSteps(): StepDef[] {
  return [
    { key: 'create', label: '创建计划' }, { key: 'ready', label: '准备发货' },
    { key: 'shipping', label: '发货中' }, { key: 'receiving', label: '收货完成' },
  ];
}

function getOmsCurrentStep(plan: InboundPlan): number {
  if (['draft', 'pending_approval', 'approved', 'preparing'].includes(plan.status)) return 0;
  if (plan.status === 'ready_for_execution') return 1;
  if (['executing', 'receiving', 'partially_received'].includes(plan.status)) return 2;
  if (plan.status === 'completed') return 3;
  return 0;
}

function StepProgress({ plan }: { plan: InboundPlan }) {
  const isFba = destinationNeedsPlatform(plan.destinationType);
  const steps = isFba ? getFbaSteps(plan) : getOmsSteps();
  const currentStep = isFba ? getFbaCurrentStep(plan) : getOmsCurrentStep(plan);
  const isDone = plan.status === 'completed';
  const isCancelled = plan.status === 'cancelled';
  if (isCancelled) {
    return <div className="rounded-lg bg-slate-50 px-4 py-3 text-[12px] text-slate-500 text-center">入库计划已取消</div>;
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex items-start justify-between min-w-max w-full px-2">
        {steps.map((step, idx) => {
          const done = isDone || idx < currentStep;
          const active = idx === currentStep;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={cn(
                  'flex size-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                  done ? 'bg-emerald-500 text-white' :
                  active ? 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20' :
                  'bg-[var(--border)] text-[var(--muted)]'
                )}>
                  {done ? '✓' : idx + 1}
                </div>
                <span className={cn('text-[11px] font-medium whitespace-nowrap',
                  done ? 'text-emerald-600' : active ? 'text-[var(--primary)]' : 'text-[var(--muted)]'
                )}>{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={cn('flex-1 h-0.5 rounded-full mx-2 mb-5', done ? 'bg-emerald-400' : 'bg-[var(--border)]')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── 商品明细区块 ─────────────────────────────────────────────────────────────

function ProductDetailsSection({ plan, snapshot }: { plan: InboundPlan; snapshot: OmsSnapshot }) {
  const allocs = (snapshot.platformAllocations ?? []).filter(a => plan.allocationIds.includes(a.id));
  const inboundOrds = (snapshot.inboundOrders ?? []).filter(o => plan.inboundOrderIds.includes(o.id));
  const isFba = plan.destinationType === 'amazon_fba';

  const receivedByLine: Record<string, number> = {};
  const damagedByLine: Record<string, number> = {};
  inboundOrds.forEach(order => {
    order.lines.forEach(ql => {
      const pct = order.expectedQuantity > 0 ? order.receivedQuantity / order.expectedQuantity : 0;
      receivedByLine[ql.lineId] = (receivedByLine[ql.lineId] ?? 0) + Math.round(ql.quantity * pct);
      const dPct = order.expectedQuantity > 0 ? order.damagedQuantity / order.expectedQuantity : 0;
      damagedByLine[ql.lineId] = (damagedByLine[ql.lineId] ?? 0) + Math.round(ql.quantity * dPct);
    });
  });

  return (
    <Section title={plan.lines.length + ' 个 SKU · ' + itemTotal(plan.lines) + ' 件 — 商品明细'}>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-left text-[12px]" style={{ minWidth: 900 }}>
          <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-2.5">OMS SKU</th>
              <th className="px-4 py-2.5">{isFba ? 'MSKU / FNSKU' : '平台SKU'}</th>
              <th className="px-4 py-2.5">发货仓库SKU</th>
              <th className="px-4 py-2.5 text-right">计划数量</th>
              <th className="px-4 py-2.5 text-right">箱数</th>
              {allocs.length > 0 && <th className="px-4 py-2.5 text-right">分配件数</th>}
              {inboundOrds.length > 0 && <th className="px-4 py-2.5 text-right">已收</th>}
              {inboundOrds.length > 0 && <th className="px-4 py-2.5 text-right">损坏</th>}
              {isFba && <th className="px-4 py-2.5">预处理/贴标</th>}
              <th className="px-4 py-2.5">批次 / 有效期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {plan.lines.map(line => {
              const allocQty = allocs.reduce((s, a) => s + (a.lines.find(l => l.lineId === line.id)?.quantity ?? 0), 0);
              return (
                <tr key={line.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{line.sku}</div>
                    {line.asin && <div className="text-[10px] text-[var(--muted)]">ASIN: {line.asin}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div>{line.msku || line.channelSku || line.destinationSku || '—'}</div>
                    {line.fnsku && <div className="text-[10px] text-[var(--muted)]">FNSKU: {line.fnsku}</div>}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{line.sourceSku || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold">{line.quantity}</span>
                    <span className="ml-1 text-[var(--muted)]">{line.unit ?? '件'}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{line.cartonQuantity ? line.cartonQuantity : '—'}</td>
                  {allocs.length > 0 && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {allocQty > 0
                        ? <span className={cn(allocQty === line.quantity ? 'text-emerald-600 font-semibold' : 'text-amber-600')}>{allocQty}</span>
                        : <span className="text-[var(--muted)]">—</span>}
                    </td>
                  )}
                  {inboundOrds.length > 0 && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {receivedByLine[line.id] != null ? <span className="text-emerald-600 font-semibold">{receivedByLine[line.id]}</span> : <span className="text-[var(--muted)]">—</span>}
                    </td>
                  )}
                  {inboundOrds.length > 0 && (
                    <td className="px-4 py-3 text-right tabular-nums">
                      {damagedByLine[line.id] ? <span className="text-red-500">{damagedByLine[line.id]}</span> : <span className="text-[var(--muted)]">—</span>}
                    </td>
                  )}
                  {isFba && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {line.prepRequirements?.map(r => <span key={r} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">{r}</span>)}
                        {line.labelOwnership && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">贴标:{line.labelOwnership}</span>}
                        {line.prepOwnership && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">预处理:{line.prepOwnership}</span>}
                        {!line.prepRequirements?.length && !line.labelOwnership && !line.prepOwnership && <span className="text-[var(--muted)]">—</span>}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.lotNo && <div>{line.lotNo}</div>}
                    {line.expiryDate && <div>{line.expiryDate}</div>}
                    {!line.lotNo && !line.expiryDate && '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── PlanDetail ───────────────────────────────────────────────────────────────

function PlanDetail({ plan, snapshot }: { plan: ReplenishmentPlan; snapshot: OmsSnapshot }) {
  const { executeReplenishment } = useOms();
  const { toasts, toast, dismiss } = useToast();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (cmd: Parameters<typeof executeReplenishment>[1], msg: string) => {
    setBusy(true);
    try { await executeReplenishment(snapshot.merchantId, cmd); toast(msg, 'success'); }
    catch (err) { toast(err instanceof Error ? err.message : '操作失败', 'error'); }
    finally { setBusy(false); }
  };

  const inboundPlan = snapshot.inboundPlansV2?.find(p => p.id === plan.inboundPlanId);
  const steps = getPlanSteps(plan, inboundPlan);
  const stepIdx = stepIndexMap[plan.status] ?? 0;
  const cfg = planStatusCfg[plan.status];

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pt-5 lg:pt-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} planNumber={plan.number}
        onConfirm={async (reason) => { await run({ type: 'replenishment_cancel', planId: plan.id, reason }, '补货计划已取消'); setCancelOpen(false); }} />
      <Link href="/dashboard/replenishment" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回补货计划
      </Link>
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">{plan.number}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge cls={cfg.cls}>{cfg.label}</Badge>
              <span className="text-[12px] text-[var(--muted)]">{sourceLabels[plan.sourceType]} → {destinationLabels[plan.destinationType]}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.status === 'draft' && <ActionButton variant="primary" loading={busy}
              onClick={() => setConfirmAction({ title: '提交审批', description: `将补货计划 ${plan.number} 提交审批，提交后不可修改。`, confirmLabel: '确认提交', onConfirm: () => run({ type: 'replenishment_submit', planId: plan.id }, '已提交审批') })} >提交审批</ActionButton>}
            {plan.status === 'pending_approval' && <ActionButton variant="primary" loading={busy}
              onClick={() => setConfirmAction({ title: '审批补货计划', description: `确认批准补货计划 ${plan.number}？`, confirmLabel: '批准', onConfirm: () => run({ type: 'replenishment_approve', planId: plan.id }, '已批准') })} >审批通过</ActionButton>}
            {['draft', 'pending_approval', 'approved', 'inbound_planning'].includes(plan.status) &&
              <ActionButton variant="danger" loading={busy} onClick={() => setCancelOpen(true)} >取消</ActionButton>}
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-max items-start">
            {steps.map((step, idx) => {
              const done = idx < stepIdx;
              const active = idx === stepIdx;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-semibold',
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20' : 'bg-[var(--border)] text-[var(--muted)]')}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={cn('text-[11px] font-medium whitespace-nowrap', done ? 'text-emerald-600' : active ? 'text-[var(--primary)]' : 'text-[var(--muted)]')}>{step.label}</span>
                    {step.detail && <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{step.detail}</span>}
                  </div>
                  {idx < steps.length - 1 && <div className={cn('flex-1 h-0.5 rounded-full mx-2 mb-5', done ? 'bg-emerald-400' : 'bg-[var(--border)]')} />}
                </div>
              );
            })}
          </div>
        </div>
      </header>
      <Section title="计划信息">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3 lg:grid-cols-4">
          {([
            ['补货方式', sourceLabels[plan.sourceType]], ['目标渠道', destinationLabels[plan.destinationType]],
            ['补货原因', reasonLabels[plan.reason]], ['优先级', plan.priority ?? '—'],
            ['发货仓库', warehouseLabel(plan.shippingWarehouseId ?? plan.sourceWarehouseId)],
            ['收货仓库', warehouseLabel(plan.receivingWarehouseId ?? plan.destinationWarehouseId)],
            ['计划发货', plan.plannedShipDate ?? '—'], ['计划到货', plan.plannedArrivalDate ?? '—'],
            ['创建时间', plan.createdAt.slice(0, 16).replace('T', ' ')],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}><dt className="text-[var(--muted)]">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>
          ))}
        </dl>
        {plan.note && <p className="mt-4 text-[13px] text-[var(--muted)]">备注：{plan.note}</p>}
      </Section>
      <Section title={`商品明细（${plan.lines.length} 种）`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>{['SKU', '目标 SKU', '数量', '备注'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {plan.lines.map(line => (
                <tr key={line.id}>
                  <td className="px-3 py-2.5 font-medium">{line.sku}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{line.destinationSku ?? line.channelSku ?? '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums">{line.quantity} {line.unit ?? '件'}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{line.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {inboundPlan && (
        <Section title="入库计划">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-[13px]">{inboundPlan.number}</span>
              <Badge cls={cn('ml-2', inboundStatusCls[inboundPlan.status])}>{inboundStatusLabels[inboundPlan.status]}</Badge>
            </div>
            <Link href={`/dashboard/inbound-plans/${encodeURIComponent(inboundPlan.id)}`} className="text-[13px] font-medium text-[var(--primary)] hover:underline">查看详情 →</Link>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── FBA / 平台侧卡片（申请入仓后所有交互均在此）────────────────────────────

function FbaPlatformCard({ plan, snapshot, run, busy }: {
  plan: InboundPlan;
  snapshot: OmsSnapshot;
  run: (cmd: Parameters<ReturnType<typeof useOms>['executeReplenishment']>[1], msg: string) => Promise<void>;
  busy: boolean;
}) {
  // 本地状态：在 placement_options 阶段是否展示"返回装箱编辑"
  const [localBoxingEdit, setLocalBoxingEdit] = useState(false);
  // 标签预览 & 出库单发运弹窗（必须在所有 early return 之前声明）
  const [previewCtx, setPreviewCtx] = useState<{ label: { kind: string; fileName: string; downloadUrl?: string }; number: string } | null>(null);
  const [dispatchDialogOoId, setDispatchDialogOoId] = useState<string | null>(null);

  const platformStatuses: InboundPlan['status'][] = [
    'awaiting_platform', 'packing_options', 'packing', 'placement_options',
    'platform_confirmed', 'transport_preparing', 'ready_for_execution',
    'executing', 'receiving', 'partially_received', 'completed',
  ];
  if (!destinationNeedsPlatform(plan.destinationType)) return null;
  if (!platformStatuses.includes(plan.status)) return null;

  const isFba = plan.destinationType === 'amazon_fba';
  const isTikTok = plan.destinationType === 'tiktok_fulfillment';
  const isWalmart = plan.destinationType === 'walmart_fc';

  const platformName = isFba ? 'Amazon FBA' : isTikTok ? 'TikTok FBT' : 'Walmart WFS';
  const headerCls = isFba
    ? 'bg-[#FFF8EE] border-[#F0A030]/30'
    : isTikTok
    ? 'bg-pink-50 border-pink-200'
    : 'bg-blue-50 border-blue-200';
  const badgeCls = isFba
    ? 'bg-[#FF9900] text-black'
    : isTikTok
    ? 'bg-black text-white'
    : 'bg-[#0071CE] text-white';

  const allocations = (snapshot.platformAllocations ?? []).filter(a => plan.allocationIds.includes(a.id));
  const inboundOrdsForPlan = (snapshot.inboundOrders ?? []).filter(o => plan.inboundOrderIds.includes(o.id));
  const outboundPlansForPlan = (snapshot.outboundPlans ?? []).filter(op => op.inboundPlanId === plan.id);
  const outboundOrdsForPlan = (snapshot.outboundOrdersV2 ?? []).filter(o => outboundPlansForPlan.some(op => op.outboundOrderIds.includes(o.id)));

  // Platform-step label（根据分仓方式动态区分）
  const isPlacementFirst = plan.shipmentMode === 'placement_first';
  const stageDesc: Partial<Record<InboundPlan['status'], string>> = {
    awaiting_platform: '正在向平台申请入仓，请等待或手动查询结果',
    packing_options:   '亚马逊已返回包装方案，请在下方选择一个确认',
    packing: isPlacementFirst
      ? '分仓已确认，请在下方为每票货件填写装箱信息（按货件装箱）。装箱信息在配送服务确认后、货件处于 working 状态时可修改，单品数量变化不超过 5% 或 6 件'
      : '包装方案已确认，请在下方按组填写装箱信息。提交装箱前可自由修改；提交后将获取分仓方案，确认分仓后不可撤销',
    placement_options: isPlacementFirst
      ? '亚马逊已返回分仓方案（先分仓再装箱），请选择并确认后进入装箱步骤。⚠ 确认后不可撤销，如需变更须取消整个计划'
      : '装箱信息已提交，亚马逊已返回分仓方案，请选择并确认。⚠ 确认后不可撤销，如需变更须取消整个计划',
    platform_confirmed: '分仓已确认，正在生成标签，可获取箱子标签后安排发货',
    transport_preparing: '请为每票货件配置配送服务信息。配送服务在送达时段开始前可修改，超时不可更改',
    ready_for_execution: !plan.labelsReady
      ? '配送服务已确认，下一步请获取标签（箱标 + 运输标签 + 装箱单）。标签就绪后即可生成入库单 & 出库单'
      : plan.inboundOrderIds.length > 0
        ? '执行单据已生成，请在出库单上核对标签并标记发运'
        : '标签已就绪，请生成入库单 & 出库单以安排发货',
    executing: '货物运输中，请在出库单中确认发运状态',
    receiving:           '仓库收货中',
    partially_received:  '已部分收货，等待剩余商品到仓',
    completed:           '入库完成',
  };

  return (
    <>
      {previewCtx && (
        <LabelPreviewDialog open onClose={() => setPreviewCtx(null)} label={previewCtx.label} orderNumber={previewCtx.number} />
      )}
      <DispatchDialog
        open={!!dispatchDialogOoId}
        onClose={() => setDispatchDialogOoId(null)}
        orderNumber={outboundOrdsForPlan.find(o => o.id === dispatchDialogOoId)?.number ?? ''}
        onConfirm={async (carrier, trackingNumber) => {
          if (!dispatchDialogOoId) return;
          await run({ type: 'outbound_mark_dispatched', outboundOrderId: dispatchDialogOoId, carrier, trackingNumber }, '出库单已标记发运');
          setDispatchDialogOoId(null);
        }}
      />
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      {/* ── 平台品牌头部 ── */}
      <div className={cn('flex items-center justify-between border-b px-5 py-4', headerCls)}>
        <div className="flex items-center gap-3">
          <span className={cn('rounded px-2.5 py-1 text-[11px] font-bold leading-none', badgeCls)}>
            {isFba ? 'Amazon' : isTikTok ? 'TikTok' : 'Walmart'}
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-tight">{platformName} · {plan.site ?? 'US'} 站</p>
            {plan.connectionId && (
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">账号：{plan.connectionId}</p>
            )}
          </div>
          {/* 分仓方式标签 */}
          {isFba && plan.shipmentMode && (
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
              isPlacementFirst
                ? 'bg-blue-50 text-blue-700 ring-blue-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200',
            )}>
              {isPlacementFirst ? '先分仓再装箱' : '先装箱再分仓'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {plan.platform?.externalPlanId && (
            <span className="font-mono text-[11px] text-[var(--muted)]">
              平台ID：{plan.platform.externalPlanId}
            </span>
          )}
          {plan.pluginStatus && (
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
              pluginStatusCls[plan.pluginStatus] ?? pluginStatusCls.unknown)}>
              {pluginStatusLabels[plan.pluginStatus]}
            </span>
          )}
        </div>
      </div>

      {/* ── 当前阶段说明（顶部已有完整步骤条，这里只显示说明文字）── */}
      {stageDesc[plan.status] && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-[12px] text-[var(--muted)]">
          {stageDesc[plan.status]}
        </div>
      )}

      {/* ── 已完成步骤的回显摘要（表格形式，完整信息）── */}

      {/* 装箱摘要 */}
      {['placement_options', 'platform_confirmed', 'transport_preparing', 'ready_for_execution',
        'executing', 'receiving', 'partially_received', 'completed'].includes(plan.status) &&
        plan.packingGroupBoxes && Object.keys(plan.packingGroupBoxes).length > 0 && (() => {
          const selectedOpt = plan.packingOptions?.find(o => o.id === plan.selectedPackingOptionId) ?? plan.packingOptions?.[0];
          const groups = selectedOpt?.packingGroups ?? [];
          const allBoxes = Object.values(plan.packingGroupBoxes).flat();
          const totalBoxes = allBoxes.length;
          const totalQty = allBoxes.reduce((s, b) => s + b.lines.reduce((s2, l) => s2 + l.quantity, 0), 0);
          const totalWeight = allBoxes.reduce((s, b) => s + (b.weight ?? 0), 0);
          return (
            <details open className="border-b border-[var(--border-subtle)]">
              <summary className="flex cursor-pointer list-none items-center gap-2 bg-emerald-50/60 px-5 py-2.5 text-[12px]">
                <span className="text-emerald-600">✓</span>
                <span className="font-semibold text-emerald-700">商品装箱已完成</span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--muted)]">
                  {groups.length > 0 ? `${groups.length} 个包装组 · ` : ''}共 <strong>{totalBoxes}</strong> 箱 · <strong>{totalQty}</strong> 件{totalWeight > 0 ? ` · ${totalWeight.toFixed(1)} kg` : ''}
                </span>
                <span className="ml-auto text-[11px] text-[var(--muted)]">点击展开 ▾</span>
              </summary>
              <div className="bg-[var(--surface-subtle)] px-5 py-3 space-y-4">
                {groups.length > 0 ? groups.map((g, gIdx) => {
                  const gBoxes = plan.packingGroupBoxes?.[g.id] ?? [];
                  const gTotalBoxes = gBoxes.length;
                  const gTotalQty = gBoxes.reduce((s, b) => s + b.lines.reduce((s2, l) => s2 + l.quantity, 0), 0);
                  const gTotalWeight = gBoxes.reduce((s, b) => s + (b.weight ?? 0), 0);
                  return (
                    <div key={g.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      {/* 包装组头 */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
                        <span className="font-semibold">包装第 {gIdx + 1} 组</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">ID: {g.externalGroupId}</span>
                        <span className="text-[var(--muted)]">· {g.supportedTransportModes.join(' / ')}</span>
                        <span className="ml-auto text-[var(--muted)] tabular-nums">{gTotalBoxes} 箱 · {gTotalQty} 件{gTotalWeight > 0 ? ` · ${gTotalWeight.toFixed(1)} kg` : ''}</span>
                      </div>
                      {/* SKU 明细 */}
                      <table className="w-full text-[12px]">
                        <thead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] bg-[var(--surface-subtle)]/50">
                          <tr>
                            <th className="px-4 py-2 text-left">OMS SKU</th>
                            <th className="px-4 py-2 text-left">MSKU / FNSKU</th>
                            <th className="px-4 py-2 text-right">申报件数</th>
                            <th className="px-4 py-2 text-right">已装箱</th>
                            <th className="px-4 py-2 text-right">箱数</th>
                            <th className="px-4 py-2 text-left">箱规尺寸</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {g.lines.map(ql => {
                            const line = plan.lines.find(l => l.id === ql.lineId);
                            const myBoxes = gBoxes.filter(b => b.lines.some(bl => bl.lineId === ql.lineId));
                            const packedQty = myBoxes.reduce((s, b) => s + (b.lines.find(bl => bl.lineId === ql.lineId)?.quantity ?? 0), 0);
                            const isOk = packedQty > 0 && packedQty === ql.quantity;
                            const firstBox = myBoxes[0];
                            return (
                              <tr key={ql.lineId} className="hover:bg-[var(--surface-subtle)]">
                                <td className="px-4 py-2.5">
                                  <div className="font-medium">{line?.sku ?? ql.lineId}</div>
                                  {line?.asin && <div className="text-[11px] text-[var(--muted)]">ASIN: {line.asin}</div>}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--muted)]">
                                  <div>{line?.msku || line?.channelSku || '—'}</div>
                                  {line?.fnsku && <div className="text-[11px]">FNSKU: {line.fnsku}</div>}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{ql.quantity}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">
                                  <span className={cn(isOk ? 'text-emerald-600 font-semibold' : 'text-amber-600')}>
                                    {packedQty > 0 ? packedQty : '—'}{isOk ? ' ✓' : ''}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{myBoxes.length}</td>
                                <td className="px-4 py-2.5 text-[var(--muted)]">
                                  {firstBox?.dimensions
                                    ? `${firstBox.dimensions.length}×${firstBox.dimensions.width}×${firstBox.dimensions.height} cm`
                                    : '—'}
                                  {firstBox?.weight ? ` · ${firstBox.weight} kg/箱` : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }) : (
                  <p className="text-[12px] text-[var(--muted)]">共 {totalBoxes} 箱 · {totalQty} 件</p>
                )}
                <p className="text-[11px] text-amber-600">
                  {isPlacementFirst
                    ? '装箱信息在配送服务确认后、货件处于 working/ready to ship/shipped 状态时可修改，单品数量变化不超过 5% 或 6 件（以较大值为准）'
                    : '先装箱再分仓模式：在提交装箱获取分仓方案前可自由修改；确认分仓后如需修改须满足上述条件'}
                </p>
              </div>
            </details>
          );
        })()}

      {/* 分仓摘要 */}
      {['platform_confirmed', 'transport_preparing', 'ready_for_execution',
        'executing', 'receiving', 'partially_received', 'completed'].includes(plan.status) &&
        plan.selectedPlacementOptionId && (() => {
          const opt = plan.placementOptions?.find(o => o.id === plan.selectedPlacementOptionId);
          if (!opt) return null;
          const totalFees = opt.fees?.reduce((s, f) => s + f.amount, 0) ?? 0;
          const totalDiscount = opt.discount?.reduce((s, d) => s + d.amount, 0) ?? 0;
          return (
            <details open className="border-b border-[var(--border-subtle)]">
              <summary className="flex cursor-pointer list-none items-center gap-2 bg-emerald-50/60 px-5 py-2.5 text-[12px]">
                <span className="text-emerald-600">✓</span>
                <span className="font-semibold text-emerald-700">分仓方案已确认</span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--muted)]">{opt.shipments.length} 票货件</span>
                {totalFees > 0 && <span className="text-amber-600 ml-1">+${(totalFees - totalDiscount).toFixed(2)}</span>}
                <span className="ml-auto text-[11px] text-[var(--muted)]">点击展开 ▾</span>
              </summary>
              <div className="bg-[var(--surface-subtle)] px-5 py-3 space-y-4">
                {opt.shipments.map((shipment, sIdx) => {
                  const shipFee = opt.fees?.reduce((acc, f) => acc + f.amount, 0) ?? 0;
                  const perShipFee = opt.shipments.length > 0 ? shipFee / opt.shipments.length : 0;
                  return (
                    <div key={shipment.externalShipmentId} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      {/* 货件头 */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
                        <span className="font-semibold">货件 {sIdx + 1}</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">{shipment.externalShipmentId}</span>
                        <span className="text-[var(--muted)]">·</span>
                        <span className="font-medium">{shipment.destinationCode}</span>
                        {shipment.destinationName && (
                          <span className="text-[var(--muted)]">{shipment.destinationName}</span>
                        )}
                        <span className="ml-auto tabular-nums text-[var(--muted)]">
                          {shipment.lines.reduce((s, l) => s + l.quantity, 0)} 件
                          {perShipFee > 0 && <span className="ml-2 text-amber-600">+${perShipFee.toFixed(2)}</span>}
                        </span>
                      </div>
                      {/* SKU 明细 */}
                      {shipment.lines.length > 0 && (
                        <table className="w-full text-[12px]">
                          <thead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] bg-[var(--surface-subtle)]/50">
                            <tr>
                              <th className="px-4 py-2 text-left">OMS SKU</th>
                              <th className="px-4 py-2 text-left">MSKU</th>
                              <th className="px-4 py-2 text-left">ASIN</th>
                              <th className="px-4 py-2 text-right">分配件数</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {shipment.lines.map(ql => {
                              const line = plan.lines.find(l => l.id === ql.lineId);
                              return (
                                <tr key={ql.lineId} className="hover:bg-[var(--surface-subtle)]">
                                  <td className="px-4 py-2 font-medium">{line?.sku ?? ql.lineId}</td>
                                  <td className="px-4 py-2 text-[var(--muted)]">{line?.msku || line?.channelSku || '—'}</td>
                                  <td className="px-4 py-2 text-[var(--muted)] font-mono text-[11px]">{line?.asin || '—'}</td>
                                  <td className="px-4 py-2 text-right tabular-nums font-semibold">{ql.quantity}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
                {totalFees > 0 && (
                  <p className="text-[12px] text-amber-700">
                    入库配置费合计：+${totalFees.toFixed(2)}{totalDiscount > 0 ? `（折扣后 $${(totalFees - totalDiscount).toFixed(2)}）` : ''}
                  </p>
                )}
                <p className="text-[11px] text-red-600 font-medium">
                  ⚠ 分仓方案确认后不可撤销。如需变更，须取消整个入库计划并重新创建。
                </p>
              </div>
            </details>
          );
        })()}

      {/* 配送服务摘要 */}
      {['ready_for_execution', 'executing', 'receiving', 'partially_received', 'completed'].includes(plan.status) &&
        allocations.some(a => (plan.selectedTransportOptions ?? {})[a.id]) && (() => {
          const confirmedAllocs = allocations.filter(a => (plan.selectedTransportOptions ?? {})[a.id]);
          return (
            <details open className="border-b border-[var(--border-subtle)]">
              <summary className="flex cursor-pointer list-none items-center gap-2 bg-emerald-50/60 px-5 py-2.5 text-[12px]">
                <span className="text-emerald-600">✓</span>
                <span className="font-semibold text-emerald-700">配送服务已确认</span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--muted)]">{confirmedAllocs.length} / {allocations.length} 票</span>
                <span className="ml-auto text-[11px] text-[var(--muted)]">点击展开 ▾</span>
              </summary>
              <div className="bg-[var(--surface-subtle)] px-5 py-3 space-y-4">
                {confirmedAllocs.map((a, idx) => {
                  const t = a.transport;
                  const totalQty = a.lines.reduce((s, l) => s + l.quantity, 0);
                  return (
                    <div key={a.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      {/* 货件头 */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
                        <span className="font-semibold">货件 {idx + 1}</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">{a.externalShipmentId ?? a.destinationCode}</span>
                        <span className="text-[var(--muted)]">·</span>
                        <span>{a.destinationName ?? a.destinationCode}</span>
                        <span className="ml-auto text-[var(--muted)] tabular-nums">{totalQty} 件</span>
                      </div>
                      {/* 配送详情 */}
                      <table className="w-full text-[12px]">
                        <tbody>
                          {([
                            ['货件类型', t?.mode ? (t.mode === 'SPD' ? '小包裹快递 (SPD)' : '汽运零担 (LTL)') : '—'],
                            ['承运商', t?.carrier ?? '—'],
                            ['发货日期', t?.actualShipDate ?? t?.scheduledPickup?.slice(0, 10) ?? '—'],
                            ['送达日期', t?.deliveryWindow?.start?.slice(0, 10) ?? '—'],
                            ['送达时间段', t?.deliveryWindow
                              ? `${t.deliveryWindow.start.slice(11, 16)} — ${t.deliveryWindow.end.slice(11, 16)}`
                              : '—'],
                            ...(t?.bolNumber ? [['提单号 (BOL)', t.bolNumber] as [string, string]] : []),
                            ...(t?.trackingNumber ? [['跟踪编号', t.trackingNumber] as [string, string]] : []),
                          ] as [string, string][]).map(([k, v]) => (
                            <tr key={k} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-subtle)]">
                              <td className="px-4 py-2 font-medium text-[var(--muted)] whitespace-nowrap w-28">{k}</td>
                              <td className="px-4 py-2">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                <p className="text-[11px] text-[var(--muted)]">
                  配送方案在送达时段开始时间之前可修改，超过该时间后不可更改。
                </p>
              </div>
            </details>
          );
        })()}

      {/* ── 标签摘要（标签就绪后永久展示，可折叠）── */}
      {plan.labelsReady && (() => {
        const lMeta: Record<string, { icon: string; name: string }> = {
          platform_box: { icon: '🚚', name: '箱标 + 运输标签 (Shipping)' },
          packing_list: { icon: '📋', name: '装箱单 (Packing List)' },
          platform_item:{ icon: '🏷️', name: '商品标签 (FNSKU)' },
          box_label:    { icon: '📦', name: '箱标 (Box Label)' },
          shipping_doc: { icon: '📄', name: '运输文件' },
        };
        return (
          <details className="border-b border-[var(--border-subtle)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 bg-emerald-50/60 px-5 py-2.5 text-[12px]">
              <span className="text-emerald-600">✓</span>
              <span className="font-semibold text-emerald-700">标签已就绪</span>
              <span className="text-[var(--muted)]">· {allocations.length} 票货件 · 箱标 · 运输标签 · 装箱单</span>
              <span className="ml-auto text-[11px] text-[var(--muted)]">点击展开 ▾</span>
            </summary>
            <div className="bg-[var(--surface-subtle)] px-5 py-3 space-y-4">
              {allocations.map((alloc, aIdx) => {
                const t = alloc.transport;
                const shipLabels = alloc.labels ?? [];
                return (
                  <div key={alloc.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
                      <span className="font-semibold">货件 {aIdx + 1}</span>
                      <span className="font-mono text-[11px] text-[var(--muted)]">{alloc.externalShipmentId ?? alloc.destinationCode}</span>
                      <span className="text-[var(--muted)]">→ {alloc.destinationName ?? alloc.destinationCode}</span>
                      {t?.carrier && <span className="text-[var(--muted)]">· {t.carrier}</span>}
                      {t?.trackingNumber && (
                        <span className="ml-auto font-mono text-[11px] text-emerald-700">追踪号：{t.trackingNumber}</span>
                      )}
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {shipLabels.length > 0 ? shipLabels.map(l => {
                        const meta = lMeta[l.kind] ?? { icon: '📄', name: l.kind };
                        return (
                          <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="flex items-center gap-2 text-[12px]">
                              <span className="text-base">{meta.icon}</span>
                              <span className="font-medium">{meta.name}</span>
                              <span className="font-mono text-[11px] text-[var(--muted)]">{l.fileName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setPreviewCtx({ label: l, number: alloc.externalShipmentId ?? alloc.destinationCode ?? '' })} className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]">预览</button>
                              {l.downloadUrl && (
                                <a href={l.downloadUrl} className="text-[12px] text-[var(--primary)] hover:underline font-medium">↓ 下载</a>
                              )}
                            </div>
                          </div>
                        );
                      }) : (
                        [
                          { kind: '箱标 + 运输标签', icon: '🚚' },
                          { kind: '装箱单', icon: '📋' },
                        ].map(({ kind, icon }) => (
                          <div key={kind} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="flex items-center gap-2 text-[12px]"><span className="text-base">{icon}</span><span>{kind}</span></div>
                            <span className="text-[11px] text-emerald-600">✓ 已就绪</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              {allocations.some(a => a.transport?.trackingNumber) && (
                <p className="text-[11px] text-blue-700">合作承运商 (SEND) 追踪号已自动回填，将显示在出库单中。</p>
              )}
            </div>
          </details>
        );
      })()}

      {/* ── 执行单据（生成后展示出库单 & 入库单 & 关联总览）── */}
      {plan.inboundOrderIds.length > 0 && (() => {
        const shippedCount = outboundOrdsForPlan.filter(o => ['shipped', 'completed'].includes(o.status)).length;
        const needsDispatch = outboundOrdsForPlan.some(o => !['shipped', 'completed', 'cancelled'].includes(o.status));
        const labelMeta: Record<string, { icon: string; name: string }> = {
          platform_box:  { icon: '🚚', name: '箱标 + 运输标签' },
          packing_list:  { icon: '📋', name: '装箱单' },
          platform_item: { icon: '🏷️', name: '商品标签(FNSKU)' },
          oms_carton:    { icon: '📦', name: 'OMS 箱唛' },
        };
        return (
          <details open={needsDispatch} className="border-b border-[var(--border-subtle)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 bg-emerald-50/60 px-5 py-2.5 text-[12px]">
              <span className={shippedCount === outboundOrdsForPlan.length && outboundOrdsForPlan.length > 0 ? 'text-emerald-600' : 'text-amber-500'}>
                {shippedCount === outboundOrdsForPlan.length && outboundOrdsForPlan.length > 0 ? '✓' : '●'}
              </span>
              <span className="font-semibold text-emerald-700">执行单据</span>
              <span className="text-[var(--muted)]">· {outboundOrdsForPlan.length} 份出库单 · {inboundOrdsForPlan.length} 份入库单</span>
              <span className={cn('text-[11px]', shippedCount === outboundOrdsForPlan.length ? 'text-emerald-600' : 'text-amber-600')}>
                · {shippedCount}/{outboundOrdsForPlan.length} 已发运
              </span>
              <span className="ml-auto text-[11px] text-[var(--muted)]">点击展开 ▾</span>
            </summary>
            <div className="divide-y divide-[var(--border-subtle)]">

              {/* ─── 出库单 ─────────────────────────────────────────────────────── */}
              <div className="px-5 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">出库单（发货仓 → Amazon FC）</p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-[12px]" style={{ minWidth: 760 }}>
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-4 py-2.5 text-left">单号</th>
                        <th className="px-4 py-2.5 text-left">状态</th>
                        <th className="px-4 py-2.5 text-left">目标仓</th>
                        <th className="px-4 py-2.5 text-left">承运商</th>
                        <th className="px-4 py-2.5 text-left">追踪号</th>
                        <th className="px-4 py-2.5 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {allocations.flatMap(alloc => {
                        const relOO = outboundOrdsForPlan.filter(o => alloc.sourceExecutionIds?.includes(o.id));
                        const transport = alloc.transport;
                        return relOO.map(oo => {
                          const isShipped = ['shipped', 'completed'].includes(oo.status);
                          const readyLabels = (oo.labels ?? []).filter(l => l.status === 'ready');
                          return (
                            <tr key={oo.id} className={cn('transition-colors hover:bg-[var(--surface-subtle)]', isShipped && 'bg-emerald-50/20')}>
                              <td className="px-4 py-2.5 font-mono font-semibold text-[var(--primary)]">{oo.number}</td>
                              <td className="px-4 py-2.5">
                                <Badge cls={isShipped ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-gray-50 text-gray-600 ring-gray-200'}>
                                  {isShipped ? '已发运' : '已计划'}
                                </Badge>
                                {isShipped && oo.dispatchedAt && <div className="text-[10px] text-[var(--muted)] mt-0.5">{oo.dispatchedAt.slice(0, 10)}</div>}
                              </td>
                              <td className="px-4 py-2.5">{alloc.destinationName ?? alloc.destinationCode}</td>
                              <td className="px-4 py-2.5">{oo.carrier ?? transport?.carrier ?? '—'}</td>
                              <td className="px-4 py-2.5 font-mono text-[11px]">{oo.trackingNumber ?? transport?.trackingNumber ?? '—'}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  {readyLabels.map(l => {
                                    const meta = labelMeta[l.kind] ?? { icon: '📄', name: l.kind };
                                    return (
                                      <span key={l.id} className="inline-flex items-center gap-0.5 text-[11px] text-[var(--muted)]">
                                        <span className="text-base">{meta.icon}</span>
                                        <button onClick={() => setPreviewCtx({ label: l, number: oo.number })} className="hover:text-[var(--foreground)]">预览</button>
                                        <span>/</span>
                                        <a href={l.downloadUrl ?? '#'} className="text-[var(--primary)] font-medium hover:underline">↓&nbsp;下载</a>
                                      </span>
                                    );
                                  })}
                                  {!isShipped && (
                                    <button onClick={() => setDispatchDialogOoId(oo.id)}
                                      className="h-6 rounded-md bg-[var(--primary)] px-2.5 text-[11px] font-semibold text-white hover:opacity-90">
                                      标记发运
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── 入库单 ─────────────────────────────────────────────────────── */}
              <div className="px-5 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">入库单（Amazon FC 收货）</p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-4 py-2 text-left">单号</th>
                        <th className="px-4 py-2 text-left">目标 FC</th>
                        <th className="px-4 py-2 text-left">状态</th>
                        <th className="px-4 py-2 text-right">预计件数</th>
                        <th className="px-4 py-2 text-right">已收件数</th>
                        <th className="px-4 py-2 text-right">损坏件数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {inboundOrdsForPlan.map(io => {
                        const iAlloc = allocations.find(a => a.id === io.allocationId);
                        return (
                          <tr key={io.id} className="hover:bg-[var(--surface-subtle)]">
                            <td className="px-4 py-2.5 font-mono font-semibold text-[var(--primary)]">{io.number}</td>
                            <td className="px-4 py-2.5">{iAlloc?.destinationName ?? iAlloc?.destinationCode ?? io.destinationCode ?? '—'}</td>
                            <td className="px-4 py-2.5"><Badge cls={execStatusCls[io.status]}>{execStatusLabels[io.status]}</Badge></td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{io.expectedQuantity}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-semibold">{io.receivedQuantity}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-red-500">{io.damagedQuantity || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── 关联信息总览 ────────────────────────────────────────────────── */}
              <div className="px-5 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">关联信息总览</p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-[12px]" style={{ minWidth: 820 }}>
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-4 py-2 text-left">Amazon 货件</th>
                        <th className="px-4 py-2 text-left">目标 FC</th>
                        <th className="px-4 py-2 text-left">配送方式</th>
                        <th className="px-4 py-2 text-left">承运商</th>
                        <th className="px-4 py-2 text-left">追踪号</th>
                        <th className="px-4 py-2 text-left">出库单</th>
                        <th className="px-4 py-2 text-left">入库单</th>
                        <th className="px-4 py-2 text-left">发运状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {allocations.map(alloc => {
                        const oOrders = outboundOrdsForPlan.filter(o => alloc.sourceExecutionIds?.includes(o.id));
                        const iOrder = inboundOrdsForPlan.find(o => o.allocationId === alloc.id);
                        const t = alloc.transport;
                        return (
                          <tr key={alloc.id} className="hover:bg-[var(--surface-subtle)]">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--muted)]">{alloc.externalShipmentId ?? '—'}</td>
                            <td className="px-4 py-2.5">{alloc.destinationName ?? alloc.destinationCode}</td>
                            <td className="px-4 py-2.5">{t?.mode === 'SPD' ? '小包裹 SPD' : t?.mode === 'LTL' ? '零担 LTL' : '—'}</td>
                            <td className="px-4 py-2.5">{t?.carrier ?? '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px]">{t?.trackingNumber ?? '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--primary)]">{oOrders.map(o => o.number).join(', ') || '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--primary)]">{iOrder?.number ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              {oOrders.every(o => ['shipped', 'completed'].includes(o.status)) && oOrders.length > 0
                                ? <span className="text-emerald-600 font-medium">✓ 已发运</span>
                                : <span className="text-amber-600">待发运</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>
        );
      })()}

      {/* ── 错误提示 ── */}
      {plan.pluginError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3">
          <p className="text-[13px] font-medium text-red-700">申请出错：{plan.pluginError.message}</p>
          {plan.pluginError.retryable && (
            <button
              onClick={() => run({ type: 'inbound_request_platform', inboundPlanId: plan.id }, '已重新发起申请')}
              className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-[12px] font-medium hover:bg-red-100"
            >
              重新申请
            </button>
          )}
        </div>
      )}

      {/* ── 阶段内容 ── */}

      {/* awaiting_platform：操作按钮 */}
      {plan.status === 'awaiting_platform' && (
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          {(!plan.platformStage || plan.platformStage === 'not_started') && (
            <button
              disabled={busy}
              onClick={() => run({ type: 'inbound_request_platform', inboundPlanId: plan.id }, '入仓申请已发送')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              申请 FBA 入仓
            </button>
          )}
          {plan.platformStage === 'request_submitted' && (
            <button
              disabled={busy}
              onClick={() => run({ type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'request_result' }, '已同步申请结果')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-subtle)] disabled:opacity-40"
            >
              查询申请结果
            </button>
          )}
          {plan.platformStage === 'request_confirmed' && (
            <button
              disabled={busy}
              onClick={() => run(
                { type: 'inbound_advance_platform', inboundPlanId: plan.id,
                  stage: isPlacementFirst ? 'placement_options' : 'packing_options' },
                isPlacementFirst ? '已获取分仓方案' : '已获取包装方案',
              )}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-subtle)] disabled:opacity-40"
            >
              {isPlacementFirst ? '获取分仓方案' : '获取包装方案'}
            </button>
          )}
        </div>
      )}

      {/* packing_options：确认包装方案工作台 */}
      {plan.status === 'packing_options' && (
        <PackingOptionsWorkstation inboundPlan={plan} snapshot={snapshot} onClose={() => {}} inline />
      )}

      {/* packing（先装箱模式）：表格装箱工作台 */}
      {plan.status === 'packing' && plan.shipmentMode !== 'placement_first' && (
        <PackingGroupBoxingWorkstation inboundPlan={plan} snapshot={snapshot} onClose={() => {}} inline />
      )}

      {/* packing（先分仓模式）：按货件装箱 */}
      {plan.status === 'packing' && plan.shipmentMode === 'placement_first' && allocations.map(alloc => (
        <BoxingWorkstation key={alloc.id} inboundPlan={plan} alloc={alloc} snapshot={snapshot} onClose={() => {}} inline />
      ))}

      {/* placement_options：确认分仓方案工作台 */}
      {plan.status === 'placement_options' && (
        <PlacementWorkstation inboundPlan={plan} snapshot={snapshot} onClose={() => {}} inline />
      )}

      {/* transport_preparing：运输信息工作台（先确保已获取运输方案）*/}
      {plan.status === 'transport_preparing' && (() => {
        const allocs = allocations;
        const hasOpts = allocs.length > 0 && allocs.every(a => (plan.transportOptions?.[a.id]?.length ?? 0) > 0);
        if (!hasOpts) {
          return (
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-amber-50 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-amber-800">需要先从亚马逊获取各货件的可用运输方案</p>
                <p className="mt-0.5 text-[11px] text-amber-700">获取后将返回 SPD / LTL 运输选项及合作承运商报价，供您为每票货件分别选择</p>
              </div>
              <button
                disabled={busy}
                onClick={() => run({ type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'transport_options' }, '已获取运输方案')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 shrink-0"
              >
                获取运输方案
              </button>
            </div>
          );
        }
        return <TransportWorkstation inboundPlan={plan} snapshot={snapshot} onClose={() => {}} inline />;
      })()}

      {/* platform_confirmed：获取标签（demo 推进） */}
      {plan.status === 'platform_confirmed' && (
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            disabled={busy}
            onClick={() => run({ type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'labels' }, '标签已就绪')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-subtle)] disabled:opacity-40"
          >
            获取箱子标签
          </button>
        </div>
      )}

      {/* ready_for_execution 步骤5：获取标签 OR 步骤6：生成单据 */}
      {plan.status === 'ready_for_execution' && (
        !plan.labelsReady ? (
          /* 步骤5：获取标签 */
          <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border-subtle)] bg-amber-50/40 px-5 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-amber-900">配送服务已确认 · 下一步：获取标签</p>
              <p className="mt-0.5 text-[12px] text-amber-700">
                标签包括：📦 箱标 &nbsp; 🚚 运输标签 &nbsp; 📋 装箱单。合作承运商(SEND)的追踪号将随标签自动返回。
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => run({ type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'labels' }, '标签已就绪')}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              获取标签
            </button>
          </div>
        ) : !plan.inboundOrderIds.length ? (
          /* 步骤6：标签就绪，生成执行单据 */
          <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border-subtle)] bg-emerald-50/40 px-5 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">标签已就绪 · 下一步：生成入库单 &amp; 出库单</p>
              <p className="mt-0.5 text-[12px] text-emerald-700">
                系统将为每票货件创建出库单（发货仓 → Amazon FC）和对应入库单。出库单上可查看并下载标签，确认无误后标记发运。
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => run({ type: 'inbound_generate_execution', inboundPlanId: plan.id }, '入库单已生成')}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              生成入库单 &amp; 出库单
            </button>
          </div>
        ) : null
      )}

    </section>
    </>
  );
}

// ─── InboundDetail ────────────────────────────────────────────────────────────

// Platform stage → 中文标签
const platformStageLabels: Record<string, string> = {
  not_started: '未开始', request_submitted: '申请已提交', request_confirmed: '申请已确认',
  packing_options_ready: '包装方案待选', packing_confirmed: '包装已确认', packing_submitted: '装箱信息已提交',
  placement_options_ready: '分仓方案待选', placement_confirmed: '分仓已确认',
  transport_options_ready: '运输方案待选', transport_confirmed: '运输已确认',
  labels_ready: '标签已就绪', failed: '申请失败',
};
const pluginStatusCls: Record<string, string> = {
  not_submitted: 'bg-gray-50 text-gray-500 ring-gray-200',
  queued: 'bg-amber-50 text-amber-700 ring-amber-200',
  submitting: 'bg-blue-50 text-blue-600 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  pending_check: 'bg-orange-50 text-orange-700 ring-orange-200',
  unknown: 'bg-slate-50 text-slate-500 ring-slate-200',
};

function InboundDetail({ plan, snapshot, execute }: {
  plan: InboundPlan;
  snapshot: OmsSnapshot;
  execute: ReturnType<typeof useOms>['executeReplenishment'];
}) {
  const { toasts, toast, dismiss } = useToast();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (cmd: Parameters<typeof execute>[1], msg: string) => {
    setBusy(true);
    try { await execute(snapshot.merchantId, cmd); toast(msg, 'success'); }
    catch (err) { toast(err instanceof Error ? err.message : '操作失败', 'error'); }
    finally { setBusy(false); }
  };

  const isFba = destinationNeedsPlatform(plan.destinationType);
  const inboundOrders = (snapshot.inboundOrders ?? []).filter(o => plan.inboundOrderIds.includes(o.id));
  const repPlan = snapshot.replenishmentPlans?.find(p => p.id === plan.replenishmentPlanId);
  const allocations = (snapshot.platformAllocations ?? []).filter(a => plan.allocationIds.includes(a.id));
  const destLabel = ({ oms_warehouse: 'OMS 仓库', third_party_warehouse: '三方仓', amazon_fba: 'Amazon FBA', tiktok_fulfillment: 'TikTok FBT', walmart_fc: 'Walmart WFS' } as Record<string, string>)[plan.destinationType] ?? plan.destinationType;

  // ── 操作按钮可见性 ─────────────────────────────────────────────────────────
  const canSubmit = plan.status === 'draft';
  const canApprove = plan.status === 'pending_approval';
  // approved + preparing 合并为「申请入库计划」
  const canApply = plan.status === 'approved' || plan.status === 'preparing';
  const canRequestPlatform = plan.status === 'awaiting_platform'
    && plan.platformStage !== 'request_submitted' && plan.platformStage !== 'request_confirmed';
  const canQueryPlatform = plan.status === 'awaiting_platform' && plan.platformStage === 'request_submitted';
  const canGenerate = plan.status === 'ready_for_execution'
    && (!isFba || plan.labelsReady === true)
    && !plan.inboundOrderIds.length;
  const canCancel = ['draft', 'pending_approval', 'approved', 'preparing', 'awaiting_platform',
    'packing_options', 'packing', 'placement_options', 'transport_preparing',
    'platform_confirmed', 'ready_for_execution'].includes(plan.status);

  const handleApply = () => {
    if (plan.status === 'approved') {
      void run({ type: 'inbound_start_processing', inboundPlanId: plan.id }, '已提交申请，正在办理…');
    } else if (plan.status === 'preparing') {
      void run({ type: 'inbound_confirm_destination', inboundPlanId: plan.id }, '已确认目标仓，正在推进…');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pt-5 lg:pt-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} planNumber={plan.number}
        onConfirm={async (reason) => { await run({ type: 'inbound_cancel', inboundPlanId: plan.id, reason }, '入库计划已取消'); setCancelOpen(false); }} />

      <Link href="/dashboard/inbound-plans" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回入库计划
      </Link>

      {/* ── 顶部标题 + 操作 ── */}
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">{plan.number}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge cls={inboundStatusCls[plan.status]}>{inboundStatusLabels[plan.status]}</Badge>
              <span className="text-[12px] text-[var(--muted)]">{plan.sourceLabel ?? sourceLabels[plan.sourceType]} → {destLabel}{plan.site ? ` · ${plan.site}` : ''}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSubmit && <ActionButton variant="primary" loading={busy}
              onClick={() => setConfirmAction({ title: '提交审批', description: `将入库计划 ${plan.number} 提交审批。`, confirmLabel: '提交', onConfirm: () => run({ type: 'inbound_submit', inboundPlanId: plan.id }, '已提交审批') })}>提交审批</ActionButton>}
            {canApprove && <ActionButton variant="primary" loading={busy}
              onClick={() => setConfirmAction({ title: '审批通过', description: `批准入库计划 ${plan.number}？`, confirmLabel: '批准', onConfirm: () => run({ type: 'inbound_approve', inboundPlanId: plan.id }, '已审批通过') })}>审批通过</ActionButton>}
            {canApply && <ActionButton variant="primary" loading={busy} onClick={handleApply}>申请入库计划</ActionButton>}
            {canRequestPlatform && <ActionButton variant="primary" loading={busy}
              onClick={() => run({ type: 'inbound_request_platform', inboundPlanId: plan.id }, '入仓申请已发送')}>{isFba ? '申请 FBA 入仓' : '请求平台入仓'}</ActionButton>}
            {canQueryPlatform && <ActionButton loading={busy}
              onClick={() => run({ type: 'inbound_advance_platform', inboundPlanId: plan.id, stage: 'request_result' }, '已同步申请结果')}>查询申请结果</ActionButton>}
            {canGenerate && <ActionButton variant="primary" loading={busy}
              onClick={() => run({ type: 'inbound_generate_execution', inboundPlanId: plan.id }, '入库单已生成')}>生成入库单</ActionButton>}
            {canCancel && <ActionButton variant="danger" loading={busy} onClick={() => setCancelOpen(true)}>取消</ActionButton>}
          </div>
        </div>
        <div className="mt-5"><StepProgress plan={plan} /></div>
      </header>

      {/* ── 计划信息 ── */}
      <Section title="计划信息">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3 lg:grid-cols-4">
          {([
            ['入库原因', plan.inboundReason ? inboundReasonLabels[plan.inboundReason] : '—'],
            ['发货来源', plan.sourceLabel ?? sourceLabels[plan.sourceType]],
            ['收货目标', `${destLabel}${plan.site ? ' · ' + plan.site : ''}`],
            ['发货仓库', warehouseLabel(plan.sourceWarehouseId)],
            ['收货仓库', warehouseLabel(plan.destinationWarehouseId)],
            ['计划发货', plan.plannedShipDate ?? '—'],
            ['商品件数', String(itemTotal(plan.lines))],
            ['行数', String(plan.lines.length)],
            ['创建时间', plan.createdAt.slice(0, 16).replace('T', ' ')],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}><dt className="text-[var(--muted)]">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>
          ))}
        </dl>
        {repPlan && (
          <div className="mt-4 flex items-center gap-2 text-[13px]">
            <span className="text-[var(--muted)]">来源补货计划：</span>
            <Link href={`/dashboard/replenishment/${encodeURIComponent(repPlan.id)}`} className="font-medium text-[var(--primary)] hover:underline">{repPlan.number}</Link>
          </div>
        )}
      </Section>

      {/* ── 商品明细 ── */}
      <ProductDetailsSection plan={plan} snapshot={snapshot} />

      {/* ══ 平台侧卡片（申请入仓后所有平台交互均在此卡片内）══ */}
      <FbaPlatformCard plan={plan} snapshot={snapshot} run={run} busy={busy} />

      {/* ── 入库单列表（FBA 已在平台卡片内展示，仅非 FBA 显示）── */}
      {!isFba && inboundOrders.length > 0 && (
        <Section title={`入库单（${inboundOrders.length}）`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>{['单号', '状态', '目标仓', '预计件数', '已收件数'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {inboundOrders.map(order => (
                  <tr key={order.id}>
                    <td className="px-3 py-2.5 font-medium text-[var(--primary)]">
                      <Link href={`/dashboard/inbound-orders/${encodeURIComponent(order.id)}`} className="hover:underline">{order.number}</Link>
                    </td>
                    <td className="px-3 py-2.5"><Badge cls={execStatusCls[order.status]}>{execStatusLabels[order.status]}</Badge></td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{order.destinationCode ?? '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{order.expectedQuantity}</td>
                    <td className="px-3 py-2.5 tabular-nums text-emerald-600">{order.receivedQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── 发货发运（非平台类入库计划）── */}
      {!isFba && <DispatchSection plan={plan} snapshot={snapshot} run={run} busy={busy} />}

      {/* ── 操作记录 ── */}
      <EventLog plan={plan} snapshot={snapshot} />
    </div>
  );
}

// ─── 发货发运区块 ────────────────────────────────────────────────────────────

function DispatchSection({ plan, snapshot, run, busy }: {
  plan: InboundPlan;
  snapshot: OmsSnapshot;
  run: (cmd: Parameters<ReturnType<typeof useOms>['executeReplenishment']>[1], msg: string) => Promise<void>;
  busy: boolean;
}) {
  const [directOpen, setDirectOpen] = useState(false);
  const isDirect = ['supplier', 'retailer'].includes(plan.sourceType);
  const outboundPlans = (snapshot.outboundPlans ?? []).filter(op => op.inboundPlanId === plan.id);
  const outboundOrders = (snapshot.outboundOrdersV2 ?? []).filter(o =>
    outboundPlans.some(op => op.outboundOrderIds.includes(o.id))
  );

  if (!['executing', 'receiving', 'partially_received', 'ready_for_execution'].includes(plan.status)
    && !outboundOrders.length && !isDirect) return null;
  if (!isDirect && !outboundOrders.length) return null;

  const execOutboundLabels: Record<string, string> = {
    planned: '已计划', released: '已下发', in_progress: '执行中',
    shipped: '已发运', receiving: '收货中', completed: '已完成',
    cancelled: '已取消', exception: '异常', draft: '草稿',
  };
  const execOutboundCls: Record<string, string> = {
    planned: 'bg-gray-50 text-gray-600 ring-gray-200',
    released: 'bg-blue-50 text-blue-700 ring-blue-200',
    in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
    shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    receiving: 'bg-orange-50 text-orange-700 ring-orange-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-50 text-slate-500 ring-slate-200',
    exception: 'bg-red-50 text-red-700 ring-red-200',
    draft: 'bg-gray-50 text-gray-500 ring-gray-200',
  };

  return (
    <>
      <RecordDirectDispatchDialog
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        planNumber={plan.number}
        onConfirm={async (reference, carrier, trackingNumber) => {
          await run({ type: 'inbound_record_direct_dispatch', inboundPlanId: plan.id, reference, carrier, trackingNumber }, '直发信息已登记');
          setDirectOpen(false);
        }}
      />
      <Section title="发货发运"
        action={isDirect ? (
          <div className="flex gap-2">
            {plan.sourceDispatchStatus !== 'released' && plan.sourceDispatchStatus !== 'shipped' && (
              <ActionButton loading={busy} onClick={() => run({ type: 'inbound_release_source', inboundPlanId: plan.id }, '发货指令已下发')}>下发发货指令</ActionButton>
            )}
            {plan.sourceDispatchStatus === 'released' && (
              <ActionButton variant="primary" loading={busy} onClick={() => setDirectOpen(true)}>登记发货</ActionButton>
            )}
          </div>
        ) : undefined}
      >
        {isDirect && plan.sourceDispatchStatus && (
          <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
            {([
              ['发货状态', { not_ready: '未就绪', ready: '已就绪', released: '已下发', shipped: '已发运', exception: '异常' }[plan.sourceDispatchStatus] ?? plan.sourceDispatchStatus],
              ['发货凭证', plan.sourceDispatchReference ?? '—'],
              ['承运商', plan.sourceDispatchCarrier ?? '—'],
              ['运单号', plan.sourceDispatchTracking ?? '—'],
              ['发货时间', plan.sourceDispatchedAt ? plan.sourceDispatchedAt.slice(0, 16).replace('T', ' ') : '—'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}><dt className="text-[var(--muted)]">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>
            ))}
          </dl>
        )}
        {outboundOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>{['出库单号', '状态', '来源仓', '目标仓'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {outboundOrders.map(order => (
                  <tr key={order.id}>
                    <td className="px-3 py-2.5 font-medium font-mono text-[12px]">{order.number}</td>
                    <td className="px-3 py-2.5">
                      <Badge cls={execOutboundCls[order.status] ?? execOutboundCls.draft}>{execOutboundLabels[order.status] ?? order.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{warehouseLabel(order.sourceWarehouseId)}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{order.destinationCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isDirect && !outboundOrders.length && (
          <p className="text-[13px] text-[var(--muted)]">暂无出库单</p>
        )}
      </Section>
    </>
  );
}

// ─── 操作记录 ────────────────────────────────────────────────────────────────

const inboundEventLabels: Record<string, string> = {
  inbound_create: '创建入库计划',
  inbound_submit: '提交审批',
  inbound_approve: '审批通过',
  inbound_start_processing: '申请入库计划',
  inbound_confirm_destination: '确认目标仓',
  inbound_cancel: '取消入库计划',
  inbound_advance_platform: '推进平台流程',
  inbound_update_boxes: '更新装箱信息',
  inbound_confirm_packing: '确认装箱',
  inbound_select_packing_option: '选择包装方案',
  inbound_select_placement_option: '选择分仓方案',
  inbound_select_transport_option: '确认运输方案',
  inbound_update_shipment_tracking: '更新运单信息',
  inbound_save_packing_boxes: '保存装箱信息',
  inbound_packing_boxes_submit: '提交装箱信息',
  inbound_confirm_all_transport: '确认所有运输方案',
  inbound_request_platform: '申请平台入仓',
  inbound_generate_execution: '生成入库单',
  inbound_release_source: '下发发货指令',
  inbound_record_direct_dispatch: '登记直发发货',
  inbound_receive: '录入收货',
};

function EventLog({ plan, snapshot }: { plan: InboundPlan; snapshot: OmsSnapshot }) {
  const relatedIds = new Set([plan.id, ...plan.inboundOrderIds]);
  const events = snapshot.events
    .filter(e => relatedIds.has(e.entityId))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));

  if (!events.length) return null;

  return (
    <Section title="操作记录">
      <ol className="space-y-0 text-[13px]">
        {events.map((event, idx) => (
          <li key={event.id} className="flex gap-3">
            {/* 时间轴竖线 */}
            <div className="flex flex-col items-center">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-[var(--primary)]" />
              {idx < events.length - 1 && <div className="w-px flex-1 bg-[var(--border-subtle)]" />}
            </div>
            <div className="pb-4">
              <p className="font-medium leading-tight">
                {inboundEventLabels[event.type] ?? event.type}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                {event.at.slice(0, 16).replace('T', ' ')}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ─── InboundOrderDetail ───────────────────────────────────────────────────────

function InboundOrderDetail({ order, snapshot }: { order: InboundOrder; snapshot: OmsSnapshot }) {
  const { executeReplenishment } = useOms();
  const { toasts, toast, dismiss } = useToast();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const inboundPlan = snapshot.inboundPlansV2?.find(p => p.inboundOrderIds.includes(order.id));
  const canReceive = ['released', 'in_progress', 'shipped', 'receiving'].includes(order.status);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pt-5 lg:pt-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <ReceiveDialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        orderNumber={order.number}
        expectedQuantity={order.expectedQuantity}
        receivedSoFar={order.receivedQuantity}
        onConfirm={async (received, damaged, reference) => {
          setBusy(true);
          try {
            await executeReplenishment(snapshot.merchantId, { type: 'inbound_receive', inboundOrderId: order.id, received, damaged, reference });
            toast('收货记录已保存', 'success');
            setReceiveOpen(false);
          } catch (err) { toast(err instanceof Error ? err.message : '操作失败', 'error'); }
          finally { setBusy(false); }
        }}
      />
      <Link href="/dashboard/inbound-orders" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回入库单
      </Link>
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">{order.number}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge cls={execStatusCls[order.status]}>{execStatusLabels[order.status]}</Badge>
              {order.destinationCode && <span className="text-[12px] text-[var(--muted)]">目标仓：{order.destinationCode}</span>}
            </div>
          </div>
          {canReceive && <ActionButton variant="primary" loading={busy} onClick={() => setReceiveOpen(true)} >记录收货</ActionButton>}
        </div>
      </header>
      <Section title="收货统计">
        <dl className="grid grid-cols-3 gap-6 text-[13px]">
          <div><dt className="text-[var(--muted)]">预计件数</dt><dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{order.expectedQuantity}</dd></div>
          <div><dt className="text-[var(--muted)]">已收件数</dt><dd className={cn('mt-0.5 text-[18px] font-semibold tabular-nums', order.receivedQuantity > 0 ? 'text-emerald-600' : '')}>{order.receivedQuantity}</dd></div>
          <div><dt className="text-[var(--muted)]">损坏件数</dt><dd className={cn('mt-0.5 text-[18px] font-semibold tabular-nums', order.damagedQuantity > 0 ? 'text-red-500' : '')}>{order.damagedQuantity}</dd></div>
        </dl>
      </Section>
      {inboundPlan && (
        <Section title="所属入库计划">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-[13px]">{inboundPlan.number}</span>
              <Badge cls={cn('ml-2', inboundStatusCls[inboundPlan.status])}>{inboundStatusLabels[inboundPlan.status]}</Badge>
            </div>
            <Link href={`/dashboard/inbound-plans/${encodeURIComponent(inboundPlan.id)}`} className="text-[13px] font-medium text-[var(--primary)] hover:underline">查看详情 →</Link>
          </div>
        </Section>
      )}
      <Section title={`商品行（${order.lines.length}）`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>{['商品行 ID', '预计数量', '已收数量'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {order.lines.map(line => (
                <tr key={line.lineId}>
                  <td className="px-3 py-2.5 font-mono text-[12px]">{line.lineId}</td>
                  <td className="px-3 py-2.5 tabular-nums">{line.quantity}</td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-600">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
