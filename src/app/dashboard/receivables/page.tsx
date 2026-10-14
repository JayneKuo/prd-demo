'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp,
  ChevronDown, ChevronRight, Search, Filter, X, Download,
  RefreshCw, ExternalLink, ArrowRight, Bell, Zap, Plus,
} from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import {
  channelArRows, channelArKpi, channelArStatusConfig, erpSyncConfig,
  arRows, arKpi, agingStatusConfig,
  stores, platformSettlementBatches, amountTypeConfig,
  shopifyPayoutBatches, tiktokSettlementBatches,
  type ChannelArRow, type ArRow,
  type ChannelSource, type ChannelArStatus,
  type StoreInfo, type ChannelType,
  type PlatformSettlementLine,
  type ShopifyPayoutLine, type ShopifyTxnType,
  type TikTokSettlementLine,
} from '@/lib/mock-data/ar-ap';

// ─── utils ────────────────────────────────────────────────────────────────────

const fmt  = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

// ─── 渠道颜色 ─────────────────────────────────────────────────────────────────

const CH: Record<string, { badge: string; ring: string; dot: string }> = {
  'Amazon':       { badge: 'bg-orange-50 text-orange-700 ring-orange-200', ring: 'ring-orange-300', dot: 'bg-orange-400' },
  'Shopify':      { badge: 'bg-green-50 text-green-700 ring-green-200',   ring: 'ring-green-300',  dot: 'bg-green-500' },
  'TikTok Shop':  { badge: 'bg-pink-50 text-pink-700 ring-pink-200',      ring: 'ring-pink-300',   dot: 'bg-pink-500' },
  'Walmart':      { badge: 'bg-blue-50 text-blue-700 ring-blue-200',      ring: 'ring-blue-300',   dot: 'bg-blue-500' },
  '手工订单':     { badge: 'bg-slate-50 text-slate-600 ring-slate-200',   ring: 'ring-slate-200',  dot: 'bg-slate-400' },
};

const OMS_CH_COLORS: Record<string, string> = {
  Amazon: 'bg-orange-50 text-orange-700 ring-orange-200',
  Shopify: 'bg-green-50 text-green-700 ring-green-200',
  'TikTok Shop': 'bg-pink-50 text-pink-700 ring-pink-200',
  Walmart: 'bg-blue-50 text-blue-700 ring-blue-200',
  '手工订单': 'bg-slate-50 text-slate-600 ring-slate-200',
};

// Shopify 交易类型配置
const SHOPIFY_TXN: Record<ShopifyTxnType, { label: string; cls: string; dot: string; amtCls: string }> = {
  charge:     { label: '销售收款',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', amtCls: 'text-emerald-600' },
  refund:     { label: '客户退款',  cls: 'bg-red-50 text-red-700 ring-red-200',             dot: 'bg-red-500',     amtCls: 'text-red-600' },
  fee:        { label: '支付手续费',cls: 'bg-orange-50 text-orange-700 ring-orange-200',   dot: 'bg-orange-500',  amtCls: 'text-orange-600' },
  adjustment: { label: '账务调整',  cls: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500',    amtCls: 'text-blue-600' },
  payout:     { label: '银行打款',  cls: 'bg-slate-50 text-slate-600 ring-slate-200',       dot: 'bg-slate-400',   amtCls: 'text-[var(--foreground)]' },
};

const TIKTOK_STATUS: Record<TikTokSettlementLine['status'], { cls: string; dot: string }> = {
  '已结算': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  '结算中': { cls: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500' },
  '待核实': { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400' },
};

const PROTO_TODAY = new Date().toISOString().slice(0, 10);

// ─── 订单 / SKU 类型 ──────────────────────────────────────────────────────────

type OrderViewRow = {
  key: string; channel: ChannelSource; storeCode: string;
  orderId: string; productName?: string; msku?: string;
  quantity: number; income: number; platformFee: number;
  refund: number; net: number; date: string; batchPeriod: string; isRefund: boolean;
  rawLines?: PlatformSettlementLine[];
  amazonBreakdown?: { principal: number; promotion: number; tax: number; fbaFee: number; commission: number; advertisingFee: number };
  tiktokData?: TikTokSettlementLine;
  shopifyData?: ShopifyPayoutLine;
};

type SkuViewRow = {
  key: string; channel: ChannelSource; storeCode: string;
  msku: string; productName: string; orderCount: number;
  totalQuantity: number; totalIncome: number; totalPlatformFee: number;
  totalRefund: number; totalNet: number;
};

// ─── 数据聚合 ─────────────────────────────────────────────────────────────────

function buildOrderViewRows(): OrderViewRow[] {
  const rows: OrderViewRow[] = [];
  platformSettlementBatches.filter(b => b.channel === 'Amazon' && b.lines.length > 0).forEach(batch => {
    const { orders } = aggregateAmazonLines(batch.lines);
    orders.forEach(o => {
      rows.push({
        key: `${batch.settlementId}-${o.orderId}`, channel: 'Amazon', storeCode: 'US-AMZ',
        orderId: o.orderId, productName: o.productName, msku: o.msku, quantity: o.quantity,
        income: o.isRefund ? 0 : Math.max(o.principal + o.promotion, 0),
        platformFee: o.fbaFee + o.commission, refund: o.isRefund ? o.net : 0,
        net: o.net, date: o.date, batchPeriod: `${batch.periodStart}~${batch.periodEnd}`, isRefund: o.isRefund,
        rawLines: o.rawLines,
        amazonBreakdown: { principal: o.principal, promotion: o.promotion, tax: o.tax, fbaFee: o.fbaFee, commission: o.commission, advertisingFee: o.advertisingFee },
      });
    });
  });
  tiktokSettlementBatches.forEach(batch => {
    batch.lines.forEach(l => {
      rows.push({
        key: `${batch.settlementId}-${l.orderId}`, channel: 'TikTok Shop', storeCode: l.storeCode,
        orderId: l.orderId, productName: l.productName, msku: l.msku ?? l.sku, quantity: l.quantity,
        income: l.deliveryIncome > 0 ? l.deliveryIncome + l.creditAmount + l.shippingOpsAmount : 0,
        platformFee: l.commission < 0 ? l.commission : 0, refund: l.deliveryIncome < 0 ? l.deliveryIncome : 0,
        net: l.totalSettlement, date: l.settlementDate, batchPeriod: `${batch.periodStart}~${batch.periodEnd}`, isRefund: l.deliveryIncome < 0,
        tiktokData: l,
      });
    });
  });
  shopifyPayoutBatches.forEach(batch => {
    batch.lines.filter(l => (l.type === 'charge' || l.type === 'refund') && l.orderId).forEach(l => {
      rows.push({
        key: `${batch.payoutId}-${l.orderId}-${l.type}`, channel: 'Shopify', storeCode: 'US-SHP',
        orderId: l.orderId!, productName: undefined, msku: undefined, quantity: 1,
        income: l.type === 'charge' ? l.grossSales : 0, platformFee: l.feeAmount,
        refund: l.type === 'refund' ? l.returnAmount : 0, net: l.netAmount,
        date: l.date, batchPeriod: `${batch.periodStart}~${batch.periodEnd}`, isRefund: l.type === 'refund',
        shopifyData: l,
      });
    });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function buildSkuViewRows(): SkuViewRow[] {
  const map = new Map<string, SkuViewRow>();
  function upsert(key: string, ch: ChannelSource, sc: string, msku: string, name: string): SkuViewRow {
    if (!map.has(key)) map.set(key, { key, channel: ch, storeCode: sc, msku, productName: name, orderCount: 0, totalQuantity: 0, totalIncome: 0, totalPlatformFee: 0, totalRefund: 0, totalNet: 0 });
    return map.get(key)!;
  }
  platformSettlementBatches.filter(b => b.channel === 'Amazon' && b.lines.length > 0).forEach(batch => {
    const { orders } = aggregateAmazonLines(batch.lines);
    orders.filter(o => o.msku).forEach(o => {
      const r = upsert(`amazon-${o.msku}`, 'Amazon', 'US-AMZ', o.msku!, o.productName ?? o.msku!);
      if (o.isRefund) { r.totalRefund += o.net; }
      else { r.orderCount++; r.totalQuantity += o.quantity; r.totalIncome += Math.max(o.principal + o.promotion, 0); r.totalPlatformFee += o.fbaFee + o.commission; }
      r.totalNet += o.net;
    });
  });
  tiktokSettlementBatches.forEach(batch => {
    batch.lines.forEach(l => {
      const msku = l.msku ?? l.sku;
      const r = upsert(`tiktok-${msku}`, 'TikTok Shop', l.storeCode, msku, l.productName);
      if (l.deliveryIncome < 0) { r.totalRefund += l.deliveryIncome; }
      else { r.orderCount++; r.totalQuantity += l.quantity; r.totalIncome += l.deliveryIncome + l.creditAmount + l.shippingOpsAmount; r.totalPlatformFee += l.commission < 0 ? l.commission : 0; }
      r.totalNet += l.totalSettlement;
    });
  });
  return Array.from(map.values()).sort((a, b) => b.totalNet - a.totalNet);
}

function FeeCell({ v, cls }: { v?: number; cls?: string }) {
  if (!v) return <td className="whitespace-nowrap px-3 py-3 text-right text-[11px] text-[var(--muted-foreground)]">—</td>;
  return <td className="whitespace-nowrap px-3 py-3 text-right"><span className={cn('text-[12px] font-medium', cls)}>-{fmtD(v)}</span></td>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主页面
// ═══════════════════════════════════════════════════════════════════════════════

type MainTab = 'reconciliation' | 'aging';

export default function ReceivablesPage() {
  const [tab, setTab] = useState<MainTab>('reconciliation');

  // 派生指标
  const b2bPending  = arRows.filter(r => r.balanceDue > 0).reduce((s, r) => s + r.balanceDue, 0);
  const b2bOverdue  = arRows.filter(r => r.overdueDays > 0 && r.balanceDue > 0).reduce((s, r) => s + r.balanceDue, 0);
  const varTotal    = Math.abs(channelArRows.reduce((s, r) => s + (r.variance ?? 0), 0));
  const totalAR     = channelArKpi.channelPending + channelArKpi.channelReceived + b2bPending;

  // DSO 估算（基于本月已发货金额和已回款，简化版）
  // DSO = 待回款 / 日均销售额；用 30 天周期估算
  const monthlyGross = channelArRows.reduce((s, r) => s + r.grossAmount, 0);
  const totalPending = channelArRows.filter(r => r.actualNet === null).reduce((s, r) => s + r.expectedNet, 0) + b2bPending;
  const dso = monthlyGross > 0 ? Math.round((totalPending / monthlyGross) * 30) : 0;

  // 本周预计到账
  const dueThisWeek = channelArRows.filter(r =>
    r.actualNet === null && r.expectedReceiptDate && r.expectedReceiptDate <= '2026-10-06'
  ).reduce((s, r) => s + r.expectedNet, 0);

  // 已到账率
  const receivedRatio = totalAR > 0
    ? Math.round((channelArKpi.channelReceived / (channelArKpi.channelPending + channelArKpi.channelReceived)) * 100)
    : 0;

  // Action items
  const actions = buildActionItems();
  const urgentCount = actions.filter(a => a.urgency === 'high').length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pt-5 lg:pt-6">

      {/* ── 页头 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">应收账款</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            结算对账 · 账龄管理 · 催款跟踪
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:bg-[var(--surface-subtle)]">
            <RefreshCw className="size-3.5" />同步数据
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:bg-[var(--surface-subtle)]">
            <Download className="size-3.5" />导出
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* DSO - 最重要的 AR 指标 */}
        <div className={cn('rounded-xl border p-4 shadow-[var(--shadow-soft)]',
          dso > 45 ? 'border-red-200 bg-red-50' : dso > 30 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-[var(--surface)]')}>
          <div className="text-[11px] text-[var(--muted)]">DSO 回款天数</div>
          <div className={cn('mt-1 text-[22px] font-bold tracking-tight',
            dso > 45 ? 'text-red-700' : dso > 30 ? 'text-amber-700' : 'text-[var(--foreground)]')}>
            {dso} 天
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
            {dso <= 30 ? <TrendingDown className="size-3 text-emerald-500" /> : <TrendingUp className="size-3 text-red-500" />}
            <span>{dso <= 30 ? '健康' : dso <= 45 ? '偏高' : '需关注'} · 行业基准 30d</span>
          </div>
        </div>
        <KpiCard label="渠道待回款"   value={fmt(channelArKpi.channelPending)} sub="TikTok · Walmart" warn />
        <KpiCard label="本月已到账"   value={fmt(channelArKpi.channelReceived)} sub={`到账率 ${receivedRatio}%`} success />
        <KpiCard label="本周预计到账" value={fmt(dueThisWeek)} sub="基于结算周期预测" />
        <KpiCard label="结算差异"     value={`${channelArKpi.varianceCount} 笔`} sub={`合计 ${fmtD(varTotal)}`} danger={varTotal > 0} />
      </div>

      {/* ── 待处理操作队列（Action Queue）── */}
      {actions.length > 0 && <ActionQueue items={actions} />}

      {/* ── Tab 导航 ── */}
      <div className="flex items-end border-b border-[var(--border)]">
        <TabBtn
          active={tab === 'reconciliation'}
          onClick={() => setTab('reconciliation')}
          label="结算对账"
          sub={`${channelArRows.length} 个批次 · ${stores.length} 家店铺`}
          badge={varTotal > 0 ? `${channelArKpi.varianceCount} 笔差异` : undefined}
        />
        <TabBtn
          active={tab === 'aging'}
          onClick={() => setTab('aging')}
          label="账龄管理"
          sub={`${arRows.filter(r => r.balanceDue > 0).length} 张未结发票 · DSO ${dso}d`}
          badge={b2bOverdue > 0 ? `逾期 ${fmt(b2bOverdue)}` : undefined}
          badgeDanger
        />
      </div>

      {/* ── 内容区 ── */}
      {tab === 'reconciliation' && <ReconciliationView />}
      {tab === 'aging'          && <AgingView dso={dso} />}
    </div>
  );
}

function TabBtn({ active, onClick, label, sub, badge, badgeDanger }: {
  active: boolean; onClick: () => void; label: string; sub: string;
  badge?: string; badgeDanger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'relative flex flex-col items-start px-5 py-3 text-left transition-colors',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:transition-colors',
        active ? 'after:bg-[var(--primary)] text-[var(--primary)]' : 'after:bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]',
      )}>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        {badge && (
          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            badgeDanger ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
            {badge}
          </span>
        )}
      </div>
      <span className="mt-0.5 text-[11px] opacity-70">{sub}</span>
    </button>
  );
}

// ─── Action Queue 数据构建 ─────────────────────────────────────────────────────

type ActionItem = {
  id: string;
  urgency: 'high' | 'medium' | 'low';
  category: 'discrepancy' | 'overdue' | 'erp' | 'fee';
  title: string;
  detail: string;
  amount?: number;
  cta: string;
  ctaHref: string;
};

function buildActionItems(): ActionItem[] {
  const items: ActionItem[] = [];

  // 结算差异
  channelArRows.filter(r => r.variance !== null && r.variance !== 0).forEach(r => {
    items.push({
      id: `diff-${r.id}`,
      urgency: 'high',
      category: 'discrepancy',
      title: `${r.channel} 结算差异`,
      detail: `${r.settlementNo} 期：OMS 预计 ${fmtD(r.expectedNet)}，实到 ${r.actualNet !== null ? fmtD(r.actualNet) : '—'}`,
      amount: r.variance ?? undefined,
      cta: '查看对账',
      ctaHref: '/dashboard/reconciliation',
    });
  });

  // B2B 逾期发票
  arRows.filter(r => r.overdueDays > 30 && r.balanceDue > 0).forEach(r => {
    items.push({
      id: `overdue-${r.id}`,
      urgency: r.overdueDays > 60 ? 'high' : 'medium',
      category: 'overdue',
      title: `${r.customer} 发票逾期 ${r.overdueDays} 天`,
      detail: `发票 ${r.invoiceNo}，未收余额 ${fmtD(r.balanceDue)}，到期日 ${r.dueDate}`,
      amount: r.balanceDue,
      cta: '发送催款',
      ctaHref: '/dashboard/receivables',
    });
  });

  // ERP 未同步
  const erpPending = channelArRows.filter(r => r.erpSync === 'pending' && r.actualNet !== null);
  if (erpPending.length > 0) {
    const total = erpPending.reduce((s, r) => s + (r.actualNet ?? 0), 0);
    items.push({
      id: 'erp-sync',
      urgency: 'medium',
      category: 'erp',
      title: `${erpPending.length} 笔结算待同步 ERP`,
      detail: `TikTok / Walmart 到账后需推送至 NetSuite，合计 ${fmt(total)}`,
      cta: '触发同步',
      ctaHref: '/dashboard/reconciliation',
    });
  }

  return items.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

// ─── Action Queue 组件 ────────────────────────────────────────────────────────

function ActionQueue({ items }: { items: ActionItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = items.filter(i => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const highCount = visible.filter(i => i.urgency === 'high').length;

  const urgencyStyle: Record<ActionItem['urgency'], { bar: string; bg: string; iconCls: string }> = {
    high:   { bar: 'bg-red-500',   bg: 'bg-red-50',   iconCls: 'text-red-500' },
    medium: { bar: 'bg-amber-400', bg: 'bg-amber-50', iconCls: 'text-amber-500' },
    low:    { bar: 'bg-slate-300', bg: '',             iconCls: 'text-slate-400' },
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      {/* 标题 */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
        <Zap className="size-4 text-amber-500" />
        <span className="text-[14px] font-semibold text-[var(--foreground)]">待处理操作</span>
        {highCount > 0 && (
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
            {highCount} 项紧急
          </span>
        )}
        <span className="ml-auto text-[12px] text-[var(--muted)]">{visible.length} 项</span>
      </div>

      {/* 操作列表 */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {visible.map(item => {
          const s = urgencyStyle[item.urgency];
          return (
            <div key={item.id}
              className={cn('flex items-start gap-4 px-5 py-3.5', s.bg)}>
              {/* 优先级竖条 */}
              <div className={cn('mt-1 h-10 w-1 shrink-0 rounded-full', s.bar)} />

              {/* 内容 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[13px] font-semibold text-[var(--foreground)]">{item.title}</span>
                  {item.amount !== undefined && (
                    <span className={cn('shrink-0 text-[12px] font-bold tabular-nums',
                      item.urgency === 'high' ? 'text-red-600' : 'text-amber-600')}>
                      {item.amount < 0 ? fmtD(item.amount) : `Δ ${fmtD(Math.abs(item.amount))}`}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">{item.detail}</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href={item.ctaHref}
                  className={cn('flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition',
                    item.urgency === 'high'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                  {item.cta}
                  <ArrowRight className="size-3" />
                </Link>
                <button onClick={() => setDismissed(prev => new Set([...prev, item.id]))}
                  className="flex size-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 1：结算对账视图
// 每个渠道作为一个"清算账户"：销售→扣减→OMS预期→银行到账→差异
// 清算账户余额趋近于零 = 健康；非零 = 需要调查
// ═══════════════════════════════════════════════════════════════════════════════

const CHANNEL_ORDER = ['Amazon', 'Shopify', 'TikTok Shop', 'Walmart'] as const;

function ReconciliationView() {
  const [batchRows, setBatchRows] = useState<ChannelArRow[]>(channelArRows);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [dimension, setDimension] = useState<'batch' | 'order' | 'sku'>('batch');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChannelArStatus | 'all'>('all');
  const [dateRange,     setDateRange]   = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null);
  const [showManualSettlement, setShowManualSettlement] = useState(false);
  const [confirmReceived, setConfirmReceived] = useState<ChannelArRow | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState('');

  function handleConfirmReceived(id: string, actualNet: number) {
    setBatchRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const variance = +(actualNet - r.expectedNet).toFixed(2);
      return {
        ...r,
        actualNet,
        variance,
        status: Math.abs(variance) < 0.01 ? '已到账' as ChannelArStatus : '差异' as ChannelArStatus,
        settledAt: new Date().toISOString().slice(0, 10),
        erpSync: 'pending' as const,
      };
    }));
    setConfirmReceived(null);
    setConfirmedAmount('');
  }

  function handleAddManualSettlement(row: ChannelArRow) {
    setBatchRows(prev => [row, ...prev]);
    setShowManualSettlement(false);
  }

  // 日期范围预设（基于 mock 数据的实际时间范围）
  const DATE_PRESETS: { value: string; label: string; from: string; to: string }[] = [
    { value: 'all',        label: '全部时间',    from: '',           to: '' },
    { value: 'this-month', label: '本月',        from: '2026-09-01', to: '2026-09-30' },
    { value: 'last-month', label: '上月',        from: '2026-08-01', to: '2026-08-31' },
    { value: '90d',        label: '近 3 个月',   from: '2026-07-01', to: '2026-09-30' },
  ];

  const selectedPreset = DATE_PRESETS.find(p => p.value === dateRange)!;

  const allOrderRows = useMemo(() => buildOrderViewRows(), []);
  const allSkuRows   = useMemo(() => buildSkuViewRows(), []);

  // 渠道清算账户余额
  function getClearingBalance(channel: string): number {
    return batchRows
      .filter(r => r.channel === channel && r.actualNet === null)
      .reduce((s, r) => s + r.expectedNet, 0);
  }

  const filteredBatch = useMemo(() => batchRows.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.settlementNo.toLowerCase().includes(q) && !r.merchant.toLowerCase().includes(q)) return false;
    if (activeChannel && r.channel !== activeChannel) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (selectedPreset.from && r.periodStart < selectedPreset.from) return false;
    if (selectedPreset.to   && r.periodEnd   > selectedPreset.to)   return false;
    return true;
  }), [search, activeChannel, statusFilter, selectedPreset, batchRows]);

  const filteredOrder = useMemo(() => allOrderRows.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.orderId.toLowerCase().includes(q) && !(r.msku ?? '').toLowerCase().includes(q)) return false;
    if (activeChannel && r.channel !== activeChannel) return false;
    if (selectedPreset.from && r.date < selectedPreset.from) return false;
    if (selectedPreset.to   && r.date > selectedPreset.to)   return false;
    return true;
  }), [allOrderRows, search, activeChannel, selectedPreset]);

  const filteredSku = useMemo(() => allSkuRows.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.msku.toLowerCase().includes(q) && !r.productName.toLowerCase().includes(q)) return false;
    if (activeChannel && r.channel !== activeChannel) return false;
    return true;
  }), [allSkuRows, search, activeChannel]);

  return (
    <div className="space-y-4">

      {/* ── 渠道清算账户健康仪表 ── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)]">渠道清算账户</h2>
          <span className="text-[11px] text-[var(--muted)]">— 余额趋近于零代表结算健康；点击卡片筛选下方明细</span>
          <button
            onClick={() => setShowManualSettlement(true)}
            className="ml-auto flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-[11px] font-semibold text-white hover:opacity-90 shrink-0">
            <Plus className="size-3" />手动录入结算
          </button>
          {activeChannel && (
            <button onClick={() => setActiveChannel(null)}
              className="flex items-center gap-1 text-[11px] text-[var(--primary)] underline underline-offset-2">
              <X className="size-3" />清除筛选
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CHANNEL_ORDER.map(channel => {
            const rows    = batchRows.filter(r => r.channel === channel);
            if (rows.length === 0) return null;

            const clearing  = getClearingBalance(channel);
            const hasIssue  = rows.some(r => r.variance !== null && r.variance !== 0);
            const isHealthy = clearing === 0 && !hasIssue;
            const isActive  = activeChannel === channel;
            const ch        = CH[channel] ?? CH['手工订单'];
            const latestSettled = rows.find(r => r.actualNet !== null);
            const totalSettled  = rows.filter(r => r.actualNet !== null).reduce((s, r) => s + (r.actualNet ?? 0), 0);

            return (
              <button
                key={channel}
                onClick={() => setActiveChannel(prev => prev === channel ? null : channel)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all shadow-[var(--shadow-soft)]',
                  isActive ? `ring-2 ${ch.ring}` : '',
                  hasIssue ? 'border-amber-200 bg-amber-50/40' :
                  clearing > 0 ? 'border-[var(--border)] bg-[var(--surface-subtle)]' :
                  'border-emerald-200 bg-emerald-50/30',
                )}>
                {/* 渠道 + 健康状态 */}
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', ch.badge)}>
                    {channel}
                  </span>
                  {isHealthy ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : hasIssue ? (
                    <AlertTriangle className="size-4 text-amber-500" />
                  ) : (
                    <Clock className="size-4 text-blue-400" />
                  )}
                </div>

                {/* 清算余额 */}
                <div className="mb-1">
                  <div className="text-[10px] text-[var(--muted)]">清算余额</div>
                  <div className={cn('text-[18px] font-bold tracking-tight',
                    clearing === 0 && !hasIssue ? 'text-emerald-700' :
                    hasIssue ? 'text-amber-700' : 'text-[var(--foreground)]')}>
                    {clearing === 0 && !hasIssue ? '$ 0 ✓' : fmt(clearing)}
                  </div>
                </div>

                {/* 状态说明 */}
                <div className="text-[11px] text-[var(--muted)]">
                  {isHealthy && '全部结算完成'}
                  {!isHealthy && clearing > 0 && !hasIssue && '结算中，等待到账'}
                  {hasIssue && <span className="font-semibold text-amber-600">有差异待核查</span>}
                </div>

                {/* 已到账汇总 */}
                {totalSettled > 0 && (
                  <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[10px] text-[var(--muted)]">
                    本期已到账 {fmt(totalSettled)}
                    {latestSettled?.settledAt && ` · ${latestSettled.settledAt}`}
                  </div>
                )}

                {/* 待确认到账的结算 */}
                {rows.filter(r => r.actualNet === null && (r.status === '待到账' || r.status === '处理中')).length > 0 && (
                  <div className="mt-2 text-[10px] font-medium text-blue-600 opacity-70">
                    ↓ 在下方结算批次表格中点"确认到账"
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 结算明细表 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* 区段标题 */}
        <div className="border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">结算明细</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {activeChannel ? `已筛选：${activeChannel}` : '全渠道'}
                {' · '}每笔结算完整核算路径：销售 → 扣减 → 预期净额 → 银行到账 → 差异
              </p>
            </div>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex items-center rounded-lg bg-[var(--surface-subtle)] p-0.5">
            {(['batch', 'order', 'sku'] as const).map(d => (
              <button key={d} onClick={() => setDimension(d)}
                className={cn('rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  dimension === d ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                {{ batch: '结算批次', order: '订单', sku: 'SKU' }[d]}
              </button>
            ))}
          </div>
          <div className="h-5 w-px shrink-0 bg-[var(--border)]" />
          <div className="flex flex-1 max-w-xs items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={dimension === 'order' ? '订单号 / MSKU' : dimension === 'sku' ? 'SKU / 商品' : '结算单号 / 店铺'}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[var(--muted-foreground)]" />
            {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
          </div>
          {dimension === 'batch' && (
            <>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ChannelArStatus | 'all')}
                className={cn('h-8 shrink-0 rounded-lg border px-2.5 text-[12px] outline-none transition-colors',
                  statusFilter !== 'all' ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted-foreground)]')}>
                <option value="all">全部状态</option>
                <option value="处理中">处理中</option>
                <option value="待到账">待到账</option>
                <option value="已到账">已到账</option>
                <option value="差异">差异 ⚠</option>
              </select>
            </>
          )}

          {/* 日期范围（所有维度生效） */}
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className={cn('h-8 shrink-0 rounded-lg border px-2.5 text-[12px] outline-none transition-colors',
              dateRange !== 'all' ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted-foreground)]')}>
            {DATE_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="text-[12px] text-[var(--muted)]">
              {dimension === 'batch' ? filteredBatch.length : dimension === 'order' ? filteredOrder.length : filteredSku.length} 条
            </span>
            <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-subtle)]">
              <Download className="size-3" />导出
            </button>
          </div>
        </div>

        {dimension === 'batch' && <BatchDimensionTable rows={filteredBatch} onRowClick={setSelectedId} onConfirmReceived={row => { setConfirmReceived(row); setConfirmedAmount(row.expectedNet.toFixed(2)); }} />}
        {dimension === 'order' && <OrderDimensionTable rows={filteredOrder} onRowClick={setSelectedOrderKey} />}
        {dimension === 'sku'   && <SkuDimensionTable rows={filteredSku} />}

        <SettlementDetailDrawer row={batchRows.find(r => r.id === selectedId) ?? null} onClose={() => setSelectedId(null)} />
        <OrderDetailDrawer row={allOrderRows.find(r => r.key === selectedOrderKey) ?? null} onClose={() => setSelectedOrderKey(null)} />
      </div>

      {/* 手动录入结算抽屉 */}
      <ManualSettlementDrawer open={showManualSettlement} onClose={() => setShowManualSettlement(false)} onAdd={handleAddManualSettlement} />

      {/* 确认到账弹窗 */}
      {confirmReceived && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setConfirmReceived(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-[15px] font-bold text-[var(--foreground)]">确认回款到账</h2>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{confirmReceived.channel} · {confirmReceived.settlementNo}</p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2.5 text-[12px]">
                <div className="flex justify-between"><span className="text-[var(--muted)]">OMS 预期到账</span><span className="font-semibold">{fmtD(confirmReceived.expectedNet)}</span></div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">实际到账金额 *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                  <input
                    type="number" value={confirmedAmount}
                    onChange={e => setConfirmedAmount(e.target.value)}
                    placeholder={confirmReceived.expectedNet.toFixed(2)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] py-1.5 pl-6 pr-2.5 text-[13px] font-semibold outline-none focus:border-[var(--primary)]"
                  />
                </div>
                {confirmedAmount && Math.abs(parseFloat(confirmedAmount) - confirmReceived.expectedNet) > 0.01 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    与预期差异：{fmtD(parseFloat(confirmedAmount) - confirmReceived.expectedNet)}，将标记为"差异"状态
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button onClick={() => setConfirmReceived(null)} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
              <button
                disabled={!confirmedAmount || isNaN(parseFloat(confirmedAmount))}
                onClick={() => handleConfirmReceived(confirmReceived.id, parseFloat(confirmedAmount))}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
                确认到账
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 2：账龄管理视图
// 以客户为中心，每个客户一行，展示各账龄桶的余额
// 对应 QuickBooks / Xero / NetSuite 的 AR Aging Report 标准格式
// ═══════════════════════════════════════════════════════════════════════════════

function AgingView({ dso }: { dso: number }) {
  const [invoices, setInvoices] = useState<typeof arRows[0][]>(arRows);
  const [search, setSearch]           = useState('');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<typeof arRows[0] | null>(null);
  const [payAmount, setPayAmount] = useState('');
  // 分页
  const AGING_PAGE_SIZE = 8;
  const [agingPage, setAgingPage] = useState(1);
  // 发票预览
  const [invoicePreviewTarget, setInvoicePreviewTarget] = useState<typeof arRows[0] | null>(null);

  function handleRecordPayment(id: string, amount: number) {
    setInvoices(prev => prev.map(r => {
      if (r.id !== id) return r;
      const paid = r.paidAmount + amount;
      const balance = Math.max(0, r.invoiceAmount - paid);
      return {
        ...r,
        paidAmount: paid,
        balanceDue: balance,
        agingStatus: balance <= 0.005 ? '已收款' as typeof r.agingStatus : r.agingStatus,
      };
    }));
    setPaymentTarget(null);
    setPayAmount('');
  }

  function handleAddInvoice(inv: typeof arRows[0]) {
    setInvoices(prev => [inv, ...prev]);
    setShowNewInvoice(false);
  }

  // 按客户聚合（标准 AR Aging Report 按客户分组）
  const customerMap = useMemo(() => {
    const map = new Map<string, {
      customer: string;
      current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number;
      total: number; oldest: number;
      invoices: typeof arRows;
    }>();
    invoices.forEach(row => {
      if (!map.has(row.customer)) {
        map.set(row.customer, { customer: row.customer, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0, oldest: 0, invoices: [] });
      }
      const c = map.get(row.customer)!;
      c.invoices.push(row);
      c.total += row.balanceDue;
      if (row.overdueDays === 0) c.current += row.balanceDue;
      else if (row.overdueDays <= 30) c.d1_30 += row.balanceDue;
      else if (row.overdueDays <= 60) c.d31_60 += row.balanceDue;
      else if (row.overdueDays <= 90) c.d61_90 += row.balanceDue;
      else c.d90plus += row.balanceDue;
      if (row.overdueDays > c.oldest) c.oldest = row.overdueDays;
    });
    return Array.from(map.values()).filter(c => c.total > 0).sort((a, b) => b.oldest - a.oldest);
  }, [invoices]);

  const filtered = useMemo(() => customerMap.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.customer.toLowerCase().includes(q)) return false;
    if (agingFilter === 'current' && c.d1_30 + c.d31_60 + c.d61_90 + c.d90plus > 0) return false;
    if (agingFilter === 'overdue' && c.d1_30 + c.d31_60 + c.d61_90 + c.d90plus === 0) return false;
    if (agingFilter === 'critical' && c.d61_90 + c.d90plus === 0) return false;
    return true;
  }), [customerMap, search, agingFilter]);

  const totals = useMemo(() => ({
    current: customerMap.reduce((s, c) => s + c.current, 0),
    d1_30:   customerMap.reduce((s, c) => s + c.d1_30, 0),
    d31_60:  customerMap.reduce((s, c) => s + c.d31_60, 0),
    d61_90:  customerMap.reduce((s, c) => s + c.d61_90, 0),
    d90plus: customerMap.reduce((s, c) => s + c.d90plus, 0),
    total:   customerMap.reduce((s, c) => s + c.total, 0),
  }), [customerMap]);

  const agingBuckets = [
    { key: 'current', label: '未到期',    amount: totals.current, cls: 'bg-emerald-500' },
    { key: 'd1_30',   label: '1–30天',   amount: totals.d1_30,   cls: 'bg-amber-400' },
    { key: 'd31_60',  label: '31–60天',  amount: totals.d31_60,  cls: 'bg-orange-400' },
    { key: 'd61_90',  label: '61–90天',  amount: totals.d61_90,  cls: 'bg-red-400' },
    { key: 'd90plus', label: '90天+',    amount: totals.d90plus, cls: 'bg-red-700' },
  ];

  // 分页切片
  const pagedFiltered = useMemo(
    () => filtered.slice((agingPage - 1) * AGING_PAGE_SIZE, agingPage * AGING_PAGE_SIZE),
    [filtered, agingPage],
  );

  return (
    <div className="space-y-4">

      {/* ── 账龄分布 + DSO ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* 账龄分布图 */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]">应收账款账龄分布</h2>
            <span className="text-[12px] text-[var(--muted)]">
              总计 <span className="font-semibold text-[var(--foreground)]">{fmtD(totals.total)}</span>
            </span>
          </div>
          {/* 堆叠条 */}
          <div className="flex h-3 overflow-hidden rounded-full">
            {agingBuckets.map(b => (
              <div key={b.key} className={cn('h-full transition-all', b.cls)}
                style={{ width: totals.total > 0 ? `${(b.amount / totals.total) * 100}%` : '0' }} />
            ))}
          </div>
          {/* 图例 */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {agingBuckets.map(b => (
              <div key={b.key} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 shrink-0 rounded-full', b.cls)} />
                <span className="text-[12px] text-[var(--muted)]">{b.label}</span>
                <span className="text-[12px] font-semibold tabular-nums">{fmtD(b.amount)}</span>
                {totals.total > 0 && (
                  <span className="text-[11px] text-[var(--muted)]">
                    ({Math.round(b.amount / totals.total * 100)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DSO 指标卡 */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
          <div className="text-[13px] font-semibold text-[var(--foreground)]">DSO 回款效率</div>
          <div className={cn('mt-2 text-[36px] font-bold tracking-tight',
            dso <= 30 ? 'text-emerald-700' : dso <= 45 ? 'text-amber-700' : 'text-red-700')}>
            {dso}<span className="text-[16px] font-normal text-[var(--muted)] ml-1">天</span>
          </div>
          <div className="mt-2 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">行业基准</span>
              <span className="font-semibold">30 天</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">状态</span>
              <span className={cn('font-semibold',
                dso <= 30 ? 'text-emerald-600' : dso <= 45 ? 'text-amber-600' : 'text-red-600')}>
                {dso <= 30 ? '良好' : dso <= 45 ? '偏高，需改善' : '危险，立即行动'}
              </span>
            </div>
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[10px] text-[var(--muted)]">
              DSO = 待回款 ÷ 日均销售额 × 30天
            </div>
          </div>
        </div>
      </div>

      {/* ── 客户账龄表（AR Aging Report 标准格式）── */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* 工具栏 */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--foreground)]">B2B 应收 · 客户账期管理</h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              账期订单发货后自动生成应收记录；无系统订单可手动新建发票
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowNewInvoice(true)}
              className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[11px] font-semibold text-white hover:opacity-90 shrink-0">
              <Plus className="size-3" />新建发票
            </button>
            <div className="flex w-44 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="客户名称"
                className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[var(--muted-foreground)]" />
              {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
            </div>
            <select value={agingFilter} onChange={e => setAgingFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-[12px] outline-none text-[var(--muted-foreground)]">
              <option value="all">全部客户</option>
              <option value="current">仅未到期</option>
              <option value="overdue">有逾期</option>
              <option value="critical">61天+ 高风险</option>
            </select>
            <span className="text-[12px] text-[var(--muted)]">{filtered.length} 家客户</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[12px]">
            <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-5 py-2.5">客户</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">未到期</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">1–30天</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">31–60天</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">61–90天</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">90天+</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">合计</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">催款状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-[13px] text-[var(--muted)]">无匹配客户</td></tr>
              )}
              {pagedFiltered.map(c => {
                const isRisk    = c.d61_90 + c.d90plus > 0;
                const hasOverdue = c.d1_30 + c.d31_60 + c.d61_90 + c.d90plus > 0;
                const isExpanded = expandedCustomer === c.customer;
                return (
                  <React.Fragment key={c.customer}>
                    <tr
                      onClick={() => setExpandedCustomer(prev => prev === c.customer ? null : c.customer)}
                      className={cn(
                        'cursor-pointer hover:bg-[var(--surface-subtle)]',
                        isRisk && 'bg-red-50/30',
                        isExpanded && 'bg-[var(--surface-subtle)]',
                      )}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--muted)] transition-transform', isExpanded && 'rotate-180')} />
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--foreground)]">{c.customer}</div>
                            <div className="text-[10px] text-[var(--muted)]">{c.invoices.length} 张发票</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {c.current > 0 ? <span className="text-emerald-600">{fmtD(c.current)}</span> : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {c.d1_30 > 0 ? <span className="font-medium text-amber-600">{fmtD(c.d1_30)}</span> : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {c.d31_60 > 0 ? <span className="font-medium text-orange-600">{fmtD(c.d31_60)}</span> : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {c.d61_90 > 0 ? <span className="font-bold text-red-600">{fmtD(c.d61_90)}</span> : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {c.d90plus > 0 ? <span className="font-bold text-red-800">{fmtD(c.d90plus)}</span> : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <span className={cn('text-[13px] font-bold',
                          isRisk ? 'text-red-700' : hasOverdue ? 'text-amber-700' : 'text-[var(--foreground)]')}>
                          {fmtD(c.total)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {!hasOverdue ? (
                          <span className="text-[11px] text-emerald-600">正常</span>
                        ) : isRisk ? (
                          <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600">
                            <Bell className="size-3" />高风险
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600">逾期跟进中</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3" onClick={e => e.stopPropagation()}>
                        {hasOverdue && (
                          <button
                            className={cn('flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition',
                              isRisk ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-[var(--border)] hover:bg-[var(--surface-subtle)]')}>
                            催款
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* ── 展开：完整发票明细（点任意行展开，非仅逾期）── */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            全部发票 · {c.customer}
                          </div>
                          <table className="w-full border-collapse text-[12px]">
                            <thead>
                              <tr className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                                <th className="pb-1.5 text-left">应收单号</th>
                                <th className="pb-1.5 text-left">来源订单</th>
                                <th className="pb-1.5 text-left">账期</th>
                                <th className="pb-1.5 text-left">渠道</th>
                                <th className="pb-1.5 text-left">开单日</th>
                                <th className="pb-1.5 text-left">到期日</th>
                                <th className="pb-1.5 text-right">应收金额</th>
                                <th className="pb-1.5 text-right">已收</th>
                                <th className="pb-1.5 text-right">未收余额</th>
                                <th className="pb-1.5 text-center">状态</th>
                                <th className="pb-1.5" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                              {c.invoices.map(inv => {
                                const sc = agingStatusConfig[inv.agingStatus] ?? agingStatusConfig['未到期'];
                                const CC: Record<string, string> = {
                                  Shopify: 'bg-green-50 text-green-700 ring-green-200',
                                  Amazon:  'bg-orange-50 text-orange-700 ring-orange-200',
                                  Direct:  'bg-blue-50 text-blue-700 ring-blue-200',
                                  EDI:     'bg-purple-50 text-purple-700 ring-purple-200',
                                };
                                return (
                                  <tr key={inv.id} className="hover:bg-[var(--surface-hover)]">
                                    {/* 应收单号 */}
                                    <td className="py-2 pr-4">
                                      <div className="font-mono text-[11px] font-semibold text-[var(--foreground)]">{inv.invoiceNo}</div>
                                      {inv.note && (
                                        <div className="mt-0.5 max-w-[180px] truncate text-[10px] text-amber-600">{inv.note}</div>
                                      )}
                                    </td>
                                    {/* 来源订单号 */}
                                    <td className="py-2 pr-4">
                                      {inv.sourceOrderId ? (
                                        <div className="font-mono text-[11px] text-[var(--primary)]">{inv.sourceOrderId}</div>
                                      ) : (
                                        <span className="text-[11px] text-[var(--muted)]">—</span>
                                      )}
                                    </td>
                                    {/* 付款条款 */}
                                    <td className="py-2 pr-4">
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                        {inv.paymentTerms ?? '—'}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', CC[inv.channel] ?? 'bg-gray-50 ring-gray-200')}>
                                        {inv.channel}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-4 text-[var(--muted)]">{inv.invoiceDate}</td>
                                    <td className="py-2 pr-4">
                                      <span className={cn('', inv.overdueDays > 0 ? 'font-semibold text-red-600' : 'text-[var(--muted)]')}>
                                        {inv.dueDate}
                                      </span>
                                      {inv.overdueDays > 0 && (
                                        <div className="text-[10px] text-red-500">逾期 {inv.overdueDays} 天</div>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4 text-right font-medium tabular-nums">{fmtD(inv.invoiceAmount)}</td>
                                    <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">
                                      {inv.paidAmount > 0 ? fmtD(inv.paidAmount) : '—'}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums">
                                      {inv.balanceDue > 0 ? (
                                        <span className={cn('font-semibold', inv.overdueDays > 0 ? 'text-red-600' : '')}>
                                          {fmtD(inv.balanceDue)}
                                        </span>
                                      ) : (
                                        <span className="text-emerald-600">已结清</span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4 text-center">
                                      <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                                        <span className={cn('size-1.5 rounded-full', sc.dot)} />{inv.agingStatus}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-1.5">
                                        {inv.balanceDue > 0 && (
                                          <button
                                            onClick={() => { setPaymentTarget(inv); setPayAmount(inv.balanceDue.toFixed(2)); }}
                                            className="flex h-6 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-medium text-white hover:opacity-90 transition">
                                            录入收款
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setInvoicePreviewTarget(inv)}
                                          className="flex h-6 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-subtle)] transition">
                                          生成发票
                                        </button>
                                        {inv.balanceDue > 0 && inv.overdueDays > 0 && (
                                          <button className={cn(
                                            'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition',
                                            isRisk ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-[var(--border)] hover:bg-[var(--surface-subtle)]'
                                          )}>
                                            <Bell className="size-3" />催款
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {/* 汇总行 */}
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
                <td className="px-5 py-3 text-[12px] font-bold text-[var(--foreground)]">合计</td>
                <td className="px-3 py-3 text-right text-[12px] font-semibold tabular-nums text-emerald-700">{fmtD(totals.current)}</td>
                <td className="px-3 py-3 text-right text-[12px] font-semibold tabular-nums text-amber-600">{fmtD(totals.d1_30)}</td>
                <td className="px-3 py-3 text-right text-[12px] font-semibold tabular-nums text-orange-600">{fmtD(totals.d31_60)}</td>
                <td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums text-red-600">{fmtD(totals.d61_90)}</td>
                <td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums text-red-800">{fmtD(totals.d90plus)}</td>
                <td className="px-3 py-3 text-right text-[13px] font-bold tabular-nums text-[var(--foreground)]">{fmtD(totals.total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          <ArPagination total={filtered.length} page={agingPage} pageSize={AGING_PAGE_SIZE} onChange={setAgingPage} />
        </div>
      </div>

      {/* 录入收款弹窗 */}
      {paymentTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPaymentTarget(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-[15px] font-bold text-[var(--foreground)]">录入收款</h2>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{paymentTarget.invoiceNo} · {paymentTarget.customer}</p>
            </div>
            <ArPaymentForm
              balanceDue={paymentTarget.balanceDue}
              payAmount={payAmount}
              onAmountChange={setPayAmount}
              onConfirm={(amount) => handleRecordPayment(paymentTarget.id, amount)}
              onClose={() => setPaymentTarget(null)}
            />
          </div>
        </>
      )}

      {/* 新建发票抽屉 */}
      <NewInvoiceDrawer open={showNewInvoice} onClose={() => setShowNewInvoice(false)} onAdd={handleAddInvoice} />

      {/* 发票预览弹窗 */}
      {invoicePreviewTarget && (
        <ArInvoicePreviewModal
          invoice={invoicePreviewTarget}
          onClose={() => setInvoicePreviewTarget(null)}
          onMarkSent={() => setInvoicePreviewTarget(null)}
        />
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, warn, success, danger }: {
  label: string; value: string; sub: string; warn?: boolean; success?: boolean; danger?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      danger ? 'border-red-200 bg-red-50' :
      warn   ? 'border-amber-200 bg-amber-50' :
      success ? 'border-emerald-200 bg-emerald-50' :
               'border-[var(--border)] bg-[var(--surface)]')}>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold tracking-tight',
        danger ? 'text-red-700' : warn ? 'text-amber-700' : success ? 'text-emerald-700' : 'text-[var(--foreground)]')}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

// ─── 结算批次表 ───────────────────────────────────────────────────────────────

function BatchDimensionTable({ rows, onRowClick, onConfirmReceived }: {
  rows: ChannelArRow[];
  onRowClick: (id: string) => void;
  onConfirmReceived: (row: ChannelArRow) => void;
}) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = {
    gross: rows.reduce((s, r) => s + r.grossAmount, 0),
    exp:   rows.reduce((s, r) => s + r.expectedNet, 0),
    act:   rows.filter(r => r.actualNet !== null).reduce((s, r) => s + (r.actualNet ?? 0), 0),
    varr:  rows.reduce((s, r) => s + (r.variance ?? 0), 0),
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px]">
          <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5">结算单号 / 渠道</th>
              <th className="whitespace-nowrap px-3 py-2.5">店铺</th>
              <th className="whitespace-nowrap px-3 py-2.5">结算周期</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">订单数</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">销售总额</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">平台扣减</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">OMS预期净额</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">银行到账</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">差异 Δ</th>
              <th className="whitespace-nowrap px-3 py-2.5">状态</th>
              <th className="whitespace-nowrap px-3 py-2.5">ERP</th>
              <th className="whitespace-nowrap px-3 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.length === 0 && (
              <tr><td colSpan={12} className="py-12 text-center text-[13px] text-[var(--muted)]">无匹配结算批次</td></tr>
            )}
            {paged.map(row => {
              const sc  = channelArStatusConfig[row.status];
              const erc = erpSyncConfig[row.erpSync];
              const deductRate = row.grossAmount > 0 ? (row.totalDeduction / row.grossAmount * 100).toFixed(1) : '0';
              const isOverdue  = !!row.expectedReceiptDate && row.actualNet === null && row.expectedReceiptDate < PROTO_TODAY;
              return (
                <tr key={row.id} onClick={() => onRowClick(row.id)}
                  className={cn('cursor-pointer hover:bg-[var(--surface-subtle)]',
                    row.status === '差异' && 'bg-amber-50/30')}>
                  <td className="px-4 py-3">
                    <div className="font-mono text-[11px] font-medium">{row.settlementNo}</div>
                    <span className={cn('mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                      OMS_CH_COLORS[row.channel] ?? OMS_CH_COLORS['手工订单'])}>
                      {row.channel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px]">{row.merchant}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[11px] text-[var(--muted)]">
                    {row.periodStart}<br /><span className="text-[10px]">~ {row.periodEnd}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{row.orderCount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium">{fmtD(row.grossAmount)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <span className="text-[13px] text-[var(--muted)]">-{fmtD(row.totalDeduction)}</span>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{deductRate}%</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold">{fmtD(row.expectedNet)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {row.actualNet !== null
                      ? <span className={cn('text-[13px] font-semibold',
                          row.variance === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                          {fmtD(row.actualNet)}
                        </span>
                      : <div>
                          <span className="text-[11px] text-[var(--muted)]">—</span>
                          {row.expectedReceiptDate && (
                            <div className={cn('text-[10px]', isOverdue ? 'font-semibold text-red-500' : 'text-[var(--muted)]')}>
                              {isOverdue ? '已逾期 ' : '预计 '}{row.expectedReceiptDate}
                            </div>
                          )}
                        </div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {row.variance !== null && row.variance !== 0
                      ? <span className="text-[13px] font-bold text-amber-600">Δ {fmtD(row.variance)}</span>
                      : row.variance === 0
                        ? <span className="text-[12px] text-emerald-600">✓</span>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
                      <span className={cn('size-1.5 rounded-full', sc.dot)} />{row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('text-[11px] font-medium', erc.cls)}>{erc.label}</span>
                    {row.erpSystem && <div className="text-[10px] text-[var(--muted)]">{row.erpSystem}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onRowClick(row.id)}
                        className="h-6 rounded border border-[var(--border)] px-2 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
                        查看
                      </button>
                      {row.actualNet === null && (
                        <button onClick={() => onConfirmReceived(row)}
                          className="h-6 rounded border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                          确认到账
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] text-[12px]">
        {[
          { l: '销售总额', v: fmt(total.gross), c: '' },
          { l: 'OMS预期', v: fmt(total.exp), c: '' },
          { l: '实际到账', v: fmt(total.act), c: 'text-emerald-600' },
          { l: '差异合计', v: total.varr === 0 ? '✓ 无差异' : `Δ ${fmtD(total.varr)}`,
            c: total.varr !== 0 ? 'font-semibold text-amber-600' : 'text-emerald-600' },
        ].map(({ l, v, c }) => (
          <div key={l} className="border-r border-[var(--border-subtle)] px-5 py-3 last:border-r-0">
            <span className="text-[var(--muted)]">{l}</span>
            <span className={cn('ml-2 font-semibold', c || 'text-[var(--foreground)]')}>{v}</span>
          </div>
        ))}
      </div>
      <ArPagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

// ─── 订单维度表 ───────────────────────────────────────────────────────────────

function OrderDimensionTable({ rows, onRowClick }: { rows: OrderViewRow[]; onRowClick: (key: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-[12px]">
        <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5">渠道 / 店铺</th>
            <th className="whitespace-nowrap px-3 py-2.5">订单号</th>
            <th className="whitespace-nowrap px-3 py-2.5">商品 / MSKU</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right">数量</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right">商品收入</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right">平台费</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right">退款</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right">净额</th>
            <th className="whitespace-nowrap px-3 py-2.5">渠道特有字段</th>
            <th className="whitespace-nowrap px-3 py-2.5">日期</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {rows.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[13px] text-[var(--muted)]">无匹配订单</td></tr>}
          {rows.map(row => (
            <tr key={row.key} onClick={() => onRowClick(row.key)}
              className={cn('cursor-pointer hover:bg-[var(--surface-subtle)]', row.isRefund && 'bg-red-50/40')}>
              <td className="px-4 py-2.5">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', OMS_CH_COLORS[row.channel] ?? OMS_CH_COLORS['手工订单'])}>{row.channel}</span>
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">{row.storeCode}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <div className="font-mono text-[11px] font-medium">{row.orderId}</div>
                {row.isRefund && <div className="text-[10px] text-red-600">↩ 退款单</div>}
              </td>
              <td className="px-3 py-2.5">
                {row.productName && <div className="text-[11px] font-medium">{row.productName}</div>}
                {row.msku && <div className="font-mono text-[10px] text-[var(--muted)]">{row.msku}</div>}
                {!row.productName && !row.msku && <span className="text-[11px] text-[var(--muted)]">—</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{row.quantity || '—'}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                {row.income > 0 ? <span className="text-[12px] font-medium text-emerald-700">{fmtD(row.income)}</span> : <span className="text-[11px] text-[var(--muted)]">—</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                {row.platformFee !== 0 ? <span className="text-[12px] font-medium text-orange-700">{fmtD(row.platformFee)}</span> : <span className="text-[11px] text-[var(--muted)]">—</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                {row.refund !== 0 ? <span className="text-[12px] font-medium text-red-600">{fmtD(row.refund)}</span> : <span className="text-[11px] text-[var(--muted)]">—</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <span className={cn('text-[13px] font-bold', row.net >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>{fmtD(row.net)}</span>
              </td>
              <td className="px-3 py-2.5">
                {row.channel === 'Amazon' && row.amazonBreakdown && (
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {row.amazonBreakdown.fbaFee !== 0 && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700 ring-1 ring-orange-200">FBA {fmtD(Math.abs(row.amazonBreakdown.fbaFee))}</span>}
                    {row.amazonBreakdown.commission !== 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-200">佣金 {fmtD(Math.abs(row.amazonBreakdown.commission))}</span>}
                  </div>
                )}
                {row.channel === 'TikTok Shop' && row.tiktokData && (
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded bg-pink-50 px-1.5 py-0.5 text-pink-700 ring-1 ring-pink-200">交货 {fmtD(row.tiktokData.deliveryIncome)}</span>
                    {row.tiktokData.profit !== undefined && (
                      <span className={cn('rounded px-1.5 py-0.5 ring-1', row.tiktokData.profit >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>
                        利润 {fmtD(row.tiktokData.profit)}
                      </span>
                    )}
                  </div>
                )}
                {row.channel === 'Shopify' && row.shopifyData && (
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {row.shopifyData.discountAmount < 0 && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 ring-1 ring-blue-200">折扣 {fmtD(row.shopifyData.discountAmount)}</span>}
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700 ring-1 ring-orange-200">Stripe {fmtD(row.shopifyData.feeAmount)}</span>
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-[var(--muted)]">{row.date}</td>
            </tr>
          ))}
        </tbody>
        {/* 汇总行 */}
        {rows.length > 0 && (() => {
          const total = {
            income: rows.filter(r => !r.isRefund).reduce((s, r) => s + r.income, 0),
            fee:    rows.reduce((s, r) => s + r.platformFee, 0),
            refund: rows.reduce((s, r) => s + r.refund, 0),
            net:    rows.reduce((s, r) => s + r.net, 0),
          };
          return (
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)] text-[12px]">
                <td colSpan={4} className="px-4 py-2.5 font-semibold text-[var(--foreground)]">
                  合计 {rows.length} 笔订单
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700">{fmtD(total.income)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-orange-700">{total.fee !== 0 ? fmtD(total.fee) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-red-600">{total.refund !== 0 ? fmtD(total.refund) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-[var(--foreground)]">{fmtD(total.net)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
}

function SkuDimensionTable({ rows }: { rows: SkuViewRow[] }) {
  const total = { income: rows.reduce((s, r) => s + r.totalIncome, 0), fee: rows.reduce((s, r) => s + r.totalPlatformFee, 0), net: rows.reduce((s, r) => s + r.totalNet, 0) };
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px]">
          <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5">渠道 / 店铺</th>
              <th className="whitespace-nowrap px-3 py-2.5">MSKU / 商品名</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">订单数</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">销量</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">销售收入</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">平台费</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">费率</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">净收入</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[13px] text-[var(--muted)]">无匹配 SKU</td></tr>}
            {rows.map(row => {
              const feeRate = row.totalIncome > 0 ? Math.abs(row.totalPlatformFee / row.totalIncome * 100) : 0;
              return (
                <tr key={row.key} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-2.5">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', OMS_CH_COLORS[row.channel] ?? OMS_CH_COLORS['手工订单'])}>{row.channel}</span>
                    <div className="mt-0.5 text-[10px] text-[var(--muted)]">{row.storeCode}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-[11px] font-medium">{row.msku}</div>
                    <div className="text-[11px] text-[var(--muted)]">{row.productName}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{row.orderCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{row.totalQuantity}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right"><span className="text-[13px] font-medium text-emerald-700">{fmtD(row.totalIncome)}</span></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">{row.totalPlatformFee !== 0 ? <span className="text-[12px] font-medium text-orange-700">{fmtD(row.totalPlatformFee)}</span> : <span className="text-[11px] text-[var(--muted)]">—</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {feeRate > 0 ? <span className={cn('text-[12px]', feeRate > 20 ? 'font-bold text-red-600' : feeRate > 10 ? 'font-semibold text-amber-600' : 'text-[var(--muted)]')}>{feeRate.toFixed(1)}%</span> : <span className="text-[11px] text-[var(--muted)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right"><span className={cn('text-[13px] font-bold', row.totalNet >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>{fmtD(row.totalNet)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="grid grid-cols-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] text-[12px]">
          {[{ l: '总销售收入', v: fmt(total.income), c: 'text-emerald-700' }, { l: '总平台费', v: fmt(Math.abs(total.fee)), c: 'text-orange-700' }, { l: '总净收入', v: fmt(total.net), c: total.net >= 0 ? 'text-[var(--foreground)]' : 'text-red-600' }].map(({ l, v, c }, i) => (
            <div key={l} className={cn('px-5 py-3', i < 2 && 'border-r border-[var(--border-subtle)]')}>
              <span className="text-[var(--muted)]">{l}</span><span className={cn('ml-2 font-semibold', c)}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 结算详情抽屉 ─────────────────────────────────────────────────────────────

function SettlementDetailDrawer({ row, onClose }: { row: ChannelArRow | null; onClose: () => void }) {
  if (!row) return null;
  const bd  = row.deductionBreakdown;
  const sc  = channelArStatusConfig[row.status];
  const erc = erpSyncConfig[row.erpSync];
  const isOverdue = !!row.expectedReceiptDate && row.actualNet === null && row.expectedReceiptDate < PROTO_TODAY;

  const deductionItems = [
    ...(bd?.commission     ? [{ label: '佣金 / 引荐费', value: bd.commission }] : []),
    ...(bd?.fulfillmentFee ? [{ label: 'FBA / 配送费', value: bd.fulfillmentFee }] : []),
    ...(bd?.advertisingFee ? [{ label: '广告费扣减', value: bd.advertisingFee }] : []),
    ...(bd?.transactionFee ? [{ label: '支付手续费', value: bd.transactionFee }] : []),
    ...(bd?.refunds        ? [{ label: '退款扣减', value: bd.refunds }] : []),
    ...(bd?.other          ? [{ label: '其他调整', value: bd.other }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[480px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <div className="font-mono text-[15px] font-bold text-[var(--foreground)]">{row.settlementNo}</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', OMS_CH_COLORS[row.channel] ?? OMS_CH_COLORS['手工订单'])}>{row.channel}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.cls)}>
                <span className={cn('size-1.5 rounded-full', sc.dot)} />{row.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
          <section>
            <DrawerTitle>基本信息</DrawerTitle>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2.5">
              <DrawerField label="店铺" value={row.merchant} />
              <DrawerField label="结算周期" value={`${row.periodStart} ~ ${row.periodEnd}`} />
              <DrawerField label="订单数" value={`${row.orderCount.toLocaleString()} 笔`} />
              <DrawerField label="币种" value={row.currency} />
            </div>
          </section>

          {/* 核算瀑布 - 体现"销售→扣减→预期→实到→差异"的完整核算路径 */}
          <section>
            <DrawerTitle>金额核算路径</DrawerTitle>
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="font-semibold">销售总额</span><span className="font-bold text-emerald-700 tabular-nums">{fmtD(row.grossAmount)}</span></div>
              {deductionItems.map(item => (
                <div key={item.label} className="flex justify-between pl-4 text-[12px]">
                  <span className="text-[var(--muted)]">— {item.label}</span>
                  <span className="text-[var(--muted)] tabular-nums">-{fmtD(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-medium"><span>OMS 预期净额</span><span className="tabular-nums">{fmtD(row.expectedNet)}</span></div>
              {row.actualNet !== null && (
                <div className={cn('flex justify-between font-semibold', row.variance === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                  <span>银行实际到账</span><span className="tabular-nums">{fmtD(row.actualNet)}</span>
                </div>
              )}
              {row.variance !== null && row.variance !== 0 && (
                <div className="rounded-lg bg-amber-100 px-3 py-1.5 flex justify-between font-bold text-amber-700">
                  <span>差异（需核查）</span><span className="tabular-nums">Δ {fmtD(row.variance)}</span>
                </div>
              )}
              {row.variance === 0 && <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 flex justify-between"><span>差异</span><span>✓ 无差异</span></div>}
            </div>
            {row.note && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>{row.note}</span>
              </div>
            )}
          </section>

          <section>
            <DrawerTitle>ERP 同步</DrawerTitle>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
              <div className="flex-1">
                <div className="text-[13px] font-medium">{row.erpSystem ?? '未配置 ERP'}</div>
                <div className={cn('mt-0.5 text-[11px]', erc.cls)}>{erc.label}</div>
              </div>
              {row.erpSync !== 'na' && (
                <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2.5 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
                  <ExternalLink className="size-3" />在 ERP 中查看
                </button>
              )}
            </div>
          </section>

          {/* ── 结算时间线（审计轨迹）── */}
          <section>
            <DrawerTitle>结算时间线</DrawerTitle>
            <SettlementTimeline row={row} />
          </section>

          {/* ── 平台原始流水（可折叠，对账核查用）── */}
          <SettlementRawLines row={row} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]"><Download className="size-3.5" />导出明细</button>
          {row.variance !== null && row.variance !== 0 && (
            <Link href="/dashboard/reconciliation" className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[13px] font-medium text-white hover:bg-amber-700">
              <AlertTriangle className="size-3.5" />处理差异
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerTitle({ children }: { children: string }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{children}</h3>;
}

function DrawerField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}

// ─── 结算时间线 ───────────────────────────────────────────────────────────────

function SettlementTimeline({ row }: { row: ChannelArRow }) {
  const isOverdue = !!row.expectedReceiptDate && row.actualNet === null && row.expectedReceiptDate < PROTO_TODAY;

  const steps: { label: string; date?: string; status: 'done' | 'warn' | 'pending' | 'active'; note?: string }[] = [
    { label: '结算期开始', date: row.periodStart, status: 'done' },
    { label: '结算期结束', date: row.periodEnd,   status: 'done' },
    {
      label: row.settledAt ? '资金到账' : (isOverdue ? '资金到账（已逾期）' : '预计到账'),
      date: row.settledAt ?? row.expectedReceiptDate,
      status: row.settledAt
        ? (row.variance !== null && row.variance !== 0 ? 'warn' : 'done')
        : isOverdue ? 'warn' : 'active',
      note: row.variance !== null && row.variance !== 0 ? `差异 ${fmtD(row.variance)}` : undefined,
    },
    {
      label: 'ERP 同步',
      date: undefined,
      status: row.erpSync === 'synced' ? 'done' : row.erpSync === 'error' ? 'warn' : 'pending',
      note: row.erpSystem,
    },
  ];

  return (
    <div className="relative mt-3 pl-6">
      {/* 竖线 */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[var(--border)]" />

      {steps.map((step, i) => (
        <div key={i} className="relative mb-4 flex items-start gap-3 last:mb-0">
          {/* 节点 */}
          <span className={cn(
            'relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
            step.status === 'done'    ? 'bg-emerald-500 text-white' :
            step.status === 'warn'    ? 'bg-amber-500 text-white'   :
            step.status === 'active'  ? 'bg-blue-500 text-white ring-4 ring-blue-100' :
            'border-2 border-[var(--border)] bg-[var(--surface)]',
          )}>
            {step.status === 'done' && '✓'}
            {step.status === 'warn' && '!'}
          </span>

          <div>
            <div className={cn('text-[12px] font-medium',
              step.status === 'warn' ? 'text-amber-700' :
              step.status === 'done' ? 'text-[var(--foreground)]' :
              step.status === 'active' ? 'text-blue-700' : 'text-[var(--muted)]')}>
              {step.label}
            </div>
            {step.date && <div className="text-[11px] text-[var(--muted)]">{step.date}</div>}
            {step.note && <div className="text-[11px] font-semibold text-amber-600">{step.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 平台原始流水（结算抽屉底部，可折叠）─────────────────────────────────────

function SettlementRawLines({ row }: { row: ChannelArRow }) {
  const [open, setOpen] = useState(false);

  // 匹配原始批次（按渠道 + 周期日期）
  const amazonBatch  = row.channel === 'Amazon'
    ? platformSettlementBatches.find(b => b.channel === 'Amazon' && b.periodStart === row.periodStart && b.periodEnd === row.periodEnd)
    : null;
  const shopifyBatch = row.channel === 'Shopify'
    ? shopifyPayoutBatches.find(b => b.periodStart === row.periodStart && b.periodEnd === row.periodEnd)
    : null;
  const tiktokBatch  = row.channel === 'TikTok Shop'
    ? tiktokSettlementBatches.find(b => b.periodStart === row.periodStart && b.periodEnd === row.periodEnd)
    : null;

  const hasLines = (amazonBatch?.lines.length ?? 0) > 0 ||
                   (shopifyBatch?.lines.length ?? 0) > 0 ||
                   (tiktokBatch?.lines.length ?? 0) > 0;
  if (!hasLines) return null;

  const lineCount = amazonBatch?.lines.length ?? shopifyBatch?.lines.length ?? tiktokBatch?.lines.length ?? 0;

  return (
    <section>
      <button onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 text-left">
        <DrawerTitle>平台原始流水</DrawerTitle>
        <ChevronDown className={cn('size-3.5 text-[var(--muted)] transition-transform', open && 'rotate-180')} />
        <span className="ml-1 text-[10px] text-[var(--muted)]">({lineCount} 行，点击展开)</span>
      </button>

      {open && (
        <div className="mt-2">
          {/* Amazon 原始行 */}
          {amazonBatch && amazonBatch.lines.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[#0f172a]">
              <div className="border-b border-slate-700 px-3 py-1.5 text-[10px] font-semibold text-slate-400">
                Amazon Settlement Report · {amazonBatch.lineCount} 行
              </div>
              {amazonBatch.lines.map(l => {
                const cfg = amountTypeConfig[l.amountType];
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-3 py-1.5 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset', cfg?.cls ?? 'bg-gray-50 ring-gray-200')}>
                        {cfg?.label ?? l.amountType}
                      </span>
                      {l.orderId && <span className="truncate font-mono text-[9px] text-slate-400">{l.orderId}</span>}
                      {l.productName && <span className="truncate text-[9px] text-slate-300">{l.productName}</span>}
                    </div>
                    <span className={cn('shrink-0 font-mono text-[11px] font-semibold tabular-nums',
                      l.amount > 0 ? 'text-emerald-400' : l.amount < 0 ? 'text-red-400' : 'text-slate-400')}>
                      {l.amount > 0 ? '+' : ''}{fmtD(l.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shopify Payout 行 */}
          {shopifyBatch && shopifyBatch.lines.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]">
                Shopify Payout · {shopifyBatch.payoutId} · {shopifyBatch.lineCount} 行
              </div>
              {shopifyBatch.lines.map(l => {
                const tc = SHOPIFY_TXN[l.type];
                return (
                  <div key={l.id} className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-1.5 last:border-0 hover:bg-[var(--surface-subtle)]">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset shrink-0', tc.cls)}>
                      <span className={cn('size-1.5 rounded-full', tc.dot)} />{tc.label}
                    </span>
                    {l.orderId && <span className="font-mono text-[10px] text-[var(--muted)]">{l.orderId}</span>}
                    <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold tabular-nums">
                      <span className={cn(l.netAmount > 0 ? 'text-emerald-600' : l.netAmount < 0 ? 'text-red-600' : 'text-[var(--muted)]')}>
                        {l.netAmount > 0 ? '+' : ''}{fmtD(l.netAmount)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TikTok Settlement 行 */}
          {tiktokBatch && tiktokBatch.lines.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)]">
                TikTok Shop Settlement · {tiktokBatch.settlementId} · {tiktokBatch.lineCount} 行
              </div>
              {tiktokBatch.lines.map(l => {
                const sc = TIKTOK_STATUS[l.status];
                return (
                  <div key={l.id} className="grid grid-cols-[1fr_80px_80px] gap-2 border-b border-[var(--border-subtle)] px-3 py-1.5 last:border-0 text-[11px] hover:bg-[var(--surface-subtle)]">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{l.productName}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)]">{l.orderId}</div>
                    </div>
                    <span className={cn('text-right tabular-nums', l.deliveryIncome >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {fmtD(l.deliveryIncome)}
                    </span>
                    <span className={cn('text-right font-semibold tabular-nums', l.totalSettlement >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>
                      {fmtD(l.totalSettlement)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── 订单详情抽屉 ─────────────────────────────────────────────────────────────

function OrderDetailDrawer({ row, onClose }: { row: OrderViewRow | null; onClose: () => void }) {
  if (!row) return null;
  const chColor = OMS_CH_COLORS[row.channel] ?? OMS_CH_COLORS['手工订单'];

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[520px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <div className="font-mono text-[15px] font-bold text-[var(--foreground)]">{row.orderId}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', chColor)}>{row.channel}</span>
              <span className="text-[11px] text-[var(--muted)]">{row.storeCode}</span>
              {row.isRefund && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">↩ 退款单</span>}
              <span className="text-[11px] text-[var(--muted)]">{row.date}</span>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
          <section>
            <DrawerTitle>基本信息</DrawerTitle>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2.5">
              <DrawerField label="渠道" value={row.channel} />
              <DrawerField label="店铺" value={row.storeCode} />
              {row.productName && <DrawerField label="商品" value={row.productName} />}
              {row.msku && <DrawerField label="MSKU" value={row.msku} />}
              <DrawerField label="数量" value={String(row.quantity)} />
              <DrawerField label="结算周期" value={row.batchPeriod} />
            </div>
          </section>

          {row.channel === 'Amazon' && row.amazonBreakdown && (
            <section>
              <DrawerTitle>🟠 Amazon 费用明细</DrawerTitle>
              <div className="mt-2 mb-2.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                {row.msku && <DrawerField label="Seller SKU / ASIN" value={row.msku} />}
                <DrawerField label="配送方式" value={row.amazonBreakdown.fbaFee !== 0 ? 'FBA（亚马逊仓配）' : 'FBM（商家自发货）'} />
                <DrawerField label="Marketplace" value="amazon.com (US)" />
                <DrawerField label="税款类型" value="Marketplace Facilitator Tax" />
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  <OdRow label="商品售价 Principal" en="Principal" amount={row.amazonBreakdown.principal} dir="income" />
                  {row.amazonBreakdown.promotion !== 0 && <OdRow label="促销补贴" en="Promotion" amount={row.amazonBreakdown.promotion} dir="income" note="平台活动补贴" />}
                  {row.amazonBreakdown.tax !== 0 && <OdRow label="代收销售税" en="Marketplace Facilitator Tax" amount={row.amazonBreakdown.tax} dir="neutral" note="代收，不入收入" />}
                  <div className="h-px bg-[var(--border)]" />
                  {row.amazonBreakdown.fbaFee !== 0 && <OdRow label="FBA 配送费" en="FBA Per-Unit Fulfillment Fee" amount={row.amazonBreakdown.fbaFee} dir="cost" />}
                  {row.amazonBreakdown.commission !== 0 && <OdRow label="引荐费（佣金）" en="Referral Fee" amount={row.amazonBreakdown.commission} dir="cost" />}
                  {row.amazonBreakdown.advertisingFee !== 0 && <OdRow label="广告费扣减" en="Advertising Fee (SP/SB/SD)" amount={row.amazonBreakdown.advertisingFee} dir="cost" note="账户级费用分摊" />}
                  <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-4 py-2.5">
                    <span className="text-[13px] font-bold">净额</span>
                    <span className={cn('text-[16px] font-bold tabular-nums', row.net >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>{fmtD(row.net)}</span>
                  </div>
                </div>
              </div>
              {row.rawLines && row.rawLines.length > 0 && <AmazonRawLines lines={row.rawLines} />}
            </section>
          )}

          {row.channel === 'Shopify' && row.shopifyData && (
            <section>
              <DrawerTitle>🟢 Shopify / Stripe 费用明细</DrawerTitle>
              <div className="mt-2 mb-2.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                <DrawerField label="Payout ID" value={row.shopifyData.payoutId} />
                <DrawerField label="Stripe Transaction ID" value={row.shopifyData.transactionId} />
                <DrawerField label="交易类型" value={SHOPIFY_TXN[row.shopifyData.type]?.label ?? row.shopifyData.type} />
                <DrawerField label="打款状态" value={row.shopifyData.status === 'paid' ? '✓ 已打款' : row.shopifyData.status === 'in_transit' ? '转账中' : '待打款'} />
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  <OdRow label="商品销售额" en="Gross Sales" amount={row.shopifyData.grossSales} dir="income" />
                  {row.shopifyData.discountAmount !== 0 && <OdRow label="折扣 / 优惠码" en="Discount" amount={row.shopifyData.discountAmount} dir="cost" />}
                  {row.shopifyData.returnAmount !== 0 && <OdRow label="退款" en="Return Amount" amount={row.shopifyData.returnAmount} dir="cost" />}
                  {row.shopifyData.shippingAmount !== 0 && <OdRow label="运费收入" en="Shipping" amount={row.shopifyData.shippingAmount} dir="income" />}
                  {row.shopifyData.taxAmount !== 0 && <OdRow label="代收税款" en="Tax (collected)" amount={row.shopifyData.taxAmount} dir="neutral" note="代收，不入收入" />}
                  <OdRow label="小计" en="Total" amount={row.shopifyData.totalAmount} dir="subtotal" />
                  <div className="h-px bg-[var(--border)]" />
                  <OdRow label="Stripe 交易手续费" en="Transaction Fee (2.9% + $0.30)" amount={row.shopifyData.feeAmount} dir="cost" />
                  <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-4 py-2.5">
                    <span className="text-[13px] font-bold">净额</span>
                    <span className={cn('text-[16px] font-bold tabular-nums', row.net >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>{fmtD(row.shopifyData.netAmount)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {row.channel === 'TikTok Shop' && row.tiktokData && (
            <section>
              <DrawerTitle>🩷 TikTok Shop 结算明细</DrawerTitle>
              <div className="mt-2 mb-2.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                <DrawerField label="Product ID" value={row.tiktokData.productId} />
                <DrawerField label="平台 SKU" value={row.tiktokData.sku} />
                <DrawerField label="店铺编码" value={row.tiktokData.storeCode} />
                <DrawerField label="结算状态" value={row.tiktokData.status} />
                <DrawerField label="下单日期" value={row.tiktokData.orderDate} />
                <DrawerField label="结算日期" value={row.tiktokData.settlementDate} />
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  <OdRow label="交货收入" en="Delivery Income" amount={row.tiktokData.deliveryIncome} dir={row.tiktokData.deliveryIncome >= 0 ? 'income' : 'cost'} />
                  {row.tiktokData.shippingOpsAmount !== 0 && <OdRow label="货运运营金额" en="Shipping Ops" amount={row.tiktokData.shippingOpsAmount} dir="income" note="物流补贴" />}
                  {row.tiktokData.creditAmount !== 0 && <OdRow label="信用金额" en="Credit" amount={row.tiktokData.creditAmount} dir="income" note="促销补贴" />}
                  <div className="h-px bg-[var(--border)]" />
                  <OdRow label="平台佣金" en="Commission" amount={row.tiktokData.commission} dir={row.tiktokData.commission < 0 ? 'cost' : 'income'} />
                  <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-4 py-2.5">
                    <span className="text-[13px] font-bold">总结算额</span>
                    <span className={cn('text-[16px] font-bold tabular-nums', row.tiktokData.totalSettlement >= 0 ? 'text-[var(--foreground)]' : 'text-red-600')}>{fmtD(row.tiktokData.totalSettlement)}</span>
                  </div>
                  {row.tiktokData.profit !== undefined && (
                    <div className="flex items-center justify-between px-4 py-2 bg-emerald-50/60">
                      <span className="text-[12px] text-emerald-700">预估利润（OMS 分摊后）</span>
                      <span className={cn('text-[13px] font-bold', row.tiktokData.profit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                        {row.tiktokData.profit >= 0 ? '+' : ''}{fmtD(row.tiktokData.profit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]"><Download className="size-3.5" />导出明细</button>
          <button onClick={onClose} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-medium text-white hover:opacity-90">关闭</button>
        </div>
      </div>
    </>
  );
}

function OdRow({ label, en, amount, dir, note }: {
  label: string; en: string; amount: number;
  dir: 'income' | 'cost' | 'neutral' | 'subtotal';
  note?: string;
}) {
  const amtCls = dir === 'income' ? 'text-emerald-600 font-semibold' : dir === 'cost' ? 'text-red-600 font-semibold' : dir === 'subtotal' ? 'text-[var(--foreground)] font-semibold' : 'text-[var(--muted)]';
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2">
      <div className="min-w-0">
        <div className={cn('text-[12px]', dir === 'neutral' ? 'text-[var(--muted)]' : 'text-[var(--foreground)]')}>{label}</div>
        <div className="text-[10px] text-[var(--muted)]">{en}{note ? ` · ${note}` : ''}</div>
      </div>
      <span className={cn('shrink-0 tabular-nums text-[12px]', amtCls)}>{fmtD(amount)}</span>
    </div>
  );
}

function AmazonRawLines({ lines }: { lines: PlatformSettlementLine[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        原始 amount_type 行（{lines.length} 条）
      </button>
      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[#0f172a]">
          {lines.map(l => {
            const cfg = amountTypeConfig[l.amountType];
            return (
              <div key={l.id} className="flex items-center justify-between gap-3 border-b border-slate-700/50 px-3 py-1.5 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset', cfg?.cls ?? 'bg-gray-50 ring-gray-200')}>{cfg?.label ?? l.amountType}</span>
                  <span className="font-mono text-[9px] text-slate-400">{l.amountType}</span>
                </div>
                <span className={cn('shrink-0 font-mono text-[11px] font-semibold tabular-nums', l.amount > 0 ? 'text-emerald-400' : l.amount < 0 ? 'text-red-400' : 'text-slate-400')}>
                  {l.amount > 0 ? '+' : ''}{fmtD(l.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Amazon 聚合函数 ──────────────────────────────────────────────────────────

type AmazonOrderRow = {
  orderId: string; productName?: string; msku?: string;
  quantity: number; principal: number; tax: number;
  fbaFee: number; commission: number; promotion: number;
  advertisingFee: number;            // ← 独立跟踪广告费
  net: number;
  date: string; isRefund: boolean; rawLines: PlatformSettlementLine[];
};

function aggregateAmazonLines(lines: PlatformSettlementLine[]) {
  const orderMap = new Map<string, AmazonOrderRow>();
  const accountLines: PlatformSettlementLine[] = [];
  lines.forEach(line => {
    if (!line.orderId || line.orderId.startsWith('(')) { accountLines.push(line); return; }
    if (!orderMap.has(line.orderId)) {
      orderMap.set(line.orderId, { orderId: line.orderId, productName: line.productName, msku: line.msku ?? line.sku, quantity: line.quantity ?? 0, principal: 0, tax: 0, fbaFee: 0, commission: 0, promotion: 0, advertisingFee: 0, net: 0, date: line.transactionDate, isRefund: false, rawLines: [] });
    }
    const row = orderMap.get(line.orderId)!;
    row.rawLines.push(line);
    if (line.quantity && line.quantity > row.quantity) row.quantity = line.quantity;
    switch (line.amountType) {
      case 'Principal': row.principal += line.amount; break;
      case 'Tax': case 'MarketplaceFacilitatorTax': row.tax += line.amount; break;
      case 'FBAPerUnitFulfillmentFee': case 'FBAWeightBasedFee': row.fbaFee += line.amount; break;
      case 'Commission': row.commission += line.amount; break;
      case 'AdvertisingFee': row.advertisingFee += line.amount; break;  // ← 独立累计
      case 'Refund': case 'ReturnShipping': row.isRefund = true; row.principal += line.amount; break;
      default: row.promotion += line.amount;
    }
    row.net = row.principal + row.fbaFee + row.commission + row.promotion + row.advertisingFee;
  });
  return { orders: Array.from(orderMap.values()), accountLines };
}

function AmtCell({ v, cls, positiveGreen, showSign }: { v: number; cls?: string; positiveGreen?: boolean; showSign?: boolean }) {
  return (
    <td className="whitespace-nowrap px-3 py-2.5 text-right">
      {v === 0
        ? <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
        : <span className={cn('text-[12px] font-semibold tabular-nums',
            positiveGreen ? (v >= 0 ? 'text-emerald-600' : 'text-red-600') : (cls ?? 'text-[var(--foreground)]'))}>
            {(showSign && v > 0) ? '+' : ''}{fmtD(v)}
          </span>}
    </td>
  );
}

function Num({ v, cls, bold }: { v: number; cls?: string; bold?: boolean }) {
  return (
    <td className="whitespace-nowrap px-3 py-2.5 text-right">
      {v === 0
        ? <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
        : <span className={cn('text-[12px] tabular-nums', bold && 'font-semibold', cls ?? 'text-[var(--foreground)]')}>
            {v > 0 ? '+' : ''}{fmtD(v)}
          </span>}
    </td>
  );
}

// ─── SKU 维度表 ───────────────────────────────────────────────────────────────

// ─── 手动录入结算 Drawer ──────────────────────────────────────────────────────

const STANDARD_CHANNELS: ChannelSource[] = ['Amazon', 'Shopify', 'TikTok Shop', 'Walmart', '手工订单', 'EDI'];
const CUSTOM_KEY = '__custom__';

// 每个渠道的费用扣减字段配置
type FeeField = {
  key: string;
  label: string;
  hint: string;
  typical?: string; // 典型费率说明
};

const CHANNEL_FEE_CONFIG: Record<ChannelSource, FeeField[]> = {
  Amazon: [
    { key: 'commission',     label: '引荐费（Referral Fee）',          hint: '按品类计费，服装 17%、3C 8%、日用 15% 等',    typical: '约 8–17%' },
    { key: 'fulfillmentFee', label: 'FBA 配送费（Fulfillment Fee）',    hint: 'FBA Per-Unit + Weight-Based Fee，按件收取',   typical: '$3–15/件' },
    { key: 'advertisingFee', label: '广告费扣减（Sponsored Ads）',      hint: '从结算周期内的广告消耗中扣除',                 typical: '视投放' },
    { key: 'refunds',        label: '退款扣减（Refunds）',              hint: '已退款订单，含退货运费',                        typical: '' },
    { key: 'otherDeduction', label: '其他杂项（FBA Storage / Adj.）',   hint: '长期仓储费、库存调整、账务调整等',              typical: '' },
  ],
  Shopify: [
    { key: 'transactionFee', label: '支付手续费（Stripe Transaction）', hint: 'Stripe 费率约 2.9% + $0.30/笔，从打款中扣除', typical: '~2.9%' },
    { key: 'refunds',        label: '退款扣减（Refunds）',              hint: '已退款的订单金额，含退货运费（如适用）',         typical: '' },
    { key: 'otherDeduction', label: '其他（平台手续费等）',              hint: 'Shopify Payments 月费分摊、货币转换费等',       typical: '' },
  ],
  'TikTok Shop': [
    { key: 'commission',     label: '平台佣金（Commission）',           hint: 'TikTok Shop 基础佣金，通常 5–8%',             typical: '5–8%' },
    { key: 'advertisingFee', label: '联盟营销费（Affiliate Fee）',      hint: '达人带货佣金，从 GMV 中扣除',                  typical: '视合作' },
    { key: 'otherDeduction', label: '运费补贴 / 优惠补贴（负数）',       hint: '平台补贴为负数（减少扣减），促销补贴正数',       typical: '' },
    { key: 'refunds',        label: '退款扣减（Returns）',              hint: '退货退款',                                     typical: '' },
  ],
  Walmart: [
    { key: 'commission',     label: '引荐费（Referral Fee）',           hint: 'Walmart Marketplace 佣金，约 6–20%',          typical: '6–20%' },
    { key: 'fulfillmentFee', label: 'WFS 配送费（如使用）',             hint: 'Walmart Fulfillment Services，不使用则填 0', typical: '' },
    { key: 'refunds',        label: '退款扣减',                         hint: '退款订单',                                     typical: '' },
    { key: 'otherDeduction', label: '其他杂项',                         hint: '账务调整等',                                   typical: '' },
  ],
  '手工订单': [
    { key: 'otherDeduction', label: '其他扣减（如有）',                  hint: '手工订单一般无平台扣减；如有银行手续费可填此处', typical: '' },
    { key: 'refunds',        label: '退款（如有）',                     hint: '线下退款金额',                                  typical: '' },
  ],
  EDI: [
    { key: 'commission',     label: '渠道服务费（如有）',               hint: 'EDI 合作方扣减的渠道服务费',                   typical: '' },
    { key: 'refunds',        label: '退款扣减（如有）',                 hint: '退货退款',                                      typical: '' },
    { key: 'otherDeduction', label: '其他杂项',                         hint: '对账差异、账务调整等',                          typical: '' },
  ],
};

// 自定义渠道使用所有费用字段
const CUSTOM_CHANNEL_FEES: FeeField[] = [
  { key: 'commission',     label: '平台佣金 / 引荐费',  hint: '渠道扣减的佣金或引荐费，填从结算报告中的数字', typical: '' },
  { key: 'fulfillmentFee', label: '配送费（如有）',       hint: '平台代履约配送费，不涉及则留空',               typical: '' },
  { key: 'advertisingFee', label: '广告费扣减（如有）',   hint: '广告费从结算中直接扣除的部分',                 typical: '' },
  { key: 'transactionFee', label: '支付 / 交易手续费',    hint: '支付网关或平台交易手续费',                    typical: '' },
  { key: 'refunds',        label: '退款扣减（如有）',     hint: '退货退款从本期结算中扣除',                     typical: '' },
  { key: 'otherDeduction', label: '其他杂项扣减',         hint: '账务调整、长期仓储费、其他平台收费等',          typical: '' },
];

// 渠道说明
const CHANNEL_DESC: Record<ChannelSource, string> = {
  Amazon:        '亚马逊卖家平台，T+7 或 T+14 结算，通过 Seller Central 导出 Settlement Report',
  Shopify:       'Shopify Payments / Stripe 打款，T+1 到 T+3，通过 Shopify Admin 导出 Payout 报告',
  'TikTok Shop': 'TikTok 电商，T+15 结算，通过 TikTok Seller Center 导出结算明细',
  Walmart:       'Walmart Marketplace，T+14 结算，通过 Seller Center 导出报告',
  '手工订单':    '线下/直接付款订单，客户银行电汇后手动录入到账',
  EDI:           'EDI 合作零售商，按合同账期回款（Net 30/60 等）',
};

function ManualSettlementDrawer({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (row: ChannelArRow) => void;
}) {
  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] transition-colors placeholder:text-[var(--muted-foreground)]';

  const [channelPreset, setChannelPreset] = useState<ChannelSource | typeof CUSTOM_KEY>('Amazon');
  const [channelCustom, setChannelCustom] = useState('');
  const effectiveChannel = channelPreset === CUSTOM_KEY
    ? (channelCustom.trim() || '自定义渠道')
    : channelPreset;

  const [form, setForm] = useState({
    merchant: '',
    periodStart: '',
    periodEnd: '',
    orderCount: '',
    grossAmount: '',
    // 各扣减字段（按渠道有不同含义）
    commission: '',
    fulfillmentFee: '',
    advertisingFee: '',
    transactionFee: '',
    refunds: '',
    otherDeduction: '',
    actualNet: '',
    currency: 'USD',
    note: '',
  });

  // 切换渠道时清空费用字段
  function handleChannelChange(val: ChannelSource | typeof CUSTOM_KEY) {
    setChannelPreset(val);
    setChannelCustom('');
    setForm(p => ({
      ...p,
      commission: '', fulfillmentFee: '', advertisingFee: '',
      transactionFee: '', refunds: '', otherDeduction: '',
      actualNet: '',
    }));
  }

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const feeFields = channelPreset === CUSTOM_KEY
    ? CUSTOM_CHANNEL_FEES
    : (CHANNEL_FEE_CONFIG[channelPreset as ChannelSource] ?? []);

  const grossAmt = parseFloat(form.grossAmount) || 0;
  const totalDeduction = feeFields.reduce((s, f) => s + (parseFloat(form[f.key as keyof typeof form] as string) || 0), 0);
  const expectedNet = grossAmt - totalDeduction;
  const actualNetVal = form.actualNet ? parseFloat(form.actualNet) : null;
  const variance = actualNetVal !== null ? +(actualNetVal - expectedNet).toFixed(2) : null;

  const isValid = effectiveChannel && form.periodStart && form.periodEnd && grossAmt > 0
    && (channelPreset !== CUSTOM_KEY || channelCustom.trim().length > 0);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[540px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">手动录入渠道结算</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">适用于平台未对接 API、需手动输入结算报告数据的情况</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① 渠道选择 */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">① 渠道 & 结算周期</h3>
            <div className="space-y-3">

              {/* 渠道选择 — 下拉支持自定义 */}
              <div>
                <label className="mb-1 block text-[12px] font-medium">销售渠道 *</label>
                <select
                  value={channelPreset}
                  onChange={e => handleChannelChange(e.target.value as ChannelSource | typeof CUSTOM_KEY)}
                  className={inputCls}>
                  <optgroup label="主流电商平台">
                    {STANDARD_CHANNELS.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </optgroup>
                  <optgroup label="其他">
                    <option value={CUSTOM_KEY}>自定义渠道（手动输入）</option>
                  </optgroup>
                </select>

                {/* 自定义渠道输入框 */}
                {channelPreset === CUSTOM_KEY && (
                  <div className="mt-2">
                    <input
                      value={channelCustom}
                      onChange={e => setChannelCustom(e.target.value)}
                      placeholder="输入渠道名称，如：Lazada、Temu、独立站…"
                      className={cn(inputCls, !channelCustom.trim() && 'border-amber-300 focus:border-amber-500')}
                      autoFocus
                    />
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">自定义渠道将显示所有费用字段，请按实际账单填写</p>
                  </div>
                )}

                {/* 渠道说明 */}
                {channelPreset !== CUSTOM_KEY && (
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                    {CHANNEL_DESC[channelPreset as ChannelSource]}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium">店铺名称</label>
                <input value={form.merchant} onChange={e => set('merchant', e.target.value)} placeholder={`如 ${effectiveChannel} US Store`} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium">结算开始日 *</label>
                  <input type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">结算结束日 *</label>
                  <input type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium">订单数量</label>
                  <input type="number" value={form.orderCount} onChange={e => set('orderCount', e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">结算币种</label>
                  <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                    <option>USD</option><option>GBP</option><option>EUR</option><option>CNY</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ② 销售金额 & 渠道专属扣减 */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">② 销售额 & 费用扣减</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium">渠道销售总额（GMV）*</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                  <input type="number" value={form.grossAmount} onChange={e => set('grossAmount', e.target.value)} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">结算报告中的 Total Sales / Gross Revenue</p>
              </div>

              {/* 渠道专属扣减字段 */}
              {feeFields.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">{effectiveChannel} 费用扣减明细</span>
                    <span className="text-[11px] text-[var(--muted)]">（从结算报告逐项填入）</span>
                  </div>
                  <div className="space-y-2.5">
                    {feeFields.map(field => (
                      <div key={field.key}>
                        <div className="mb-0.5 flex items-baseline gap-2">
                          <label className="text-[12px] font-medium">{field.label}</label>
                          {field.typical && (
                            <span className="text-[10px] text-amber-600">{field.typical}</span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                          <input
                            type="number"
                            value={form[field.key as keyof typeof form] as string}
                            onChange={e => set(field.key as keyof typeof form, e.target.value)}
                            placeholder="0.00"
                            className={cn(inputCls, 'pl-6')}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{field.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 手工订单 / EDI 无扣减时的提示 */}
              {(channelPreset === '手工订单' || channelPreset === 'EDI') && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  💡 {channelPreset}通常无平台中间抽佣。扣减字段仅在有退款或特殊扣减时填写。
                </div>
              )}

              {/* 实时计算结果 */}
              {grossAmt > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[12px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">销售总额</span>
                    <span className="font-medium">${grossAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">扣减合计</span>
                    <span className="font-semibold text-red-600">-${totalDeduction.toFixed(2)}</span>
                  </div>
                  {totalDeduction > 0 && grossAmt > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--muted)]">综合扣减率</span>
                      <span className="text-[var(--muted)]">{(totalDeduction / grossAmt * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5">
                    <span className="font-semibold">OMS 预期净额</span>
                    <span className="text-[14px] font-bold text-[var(--foreground)]">${expectedNet.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ③ 实际到账 */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">③ 实际到账（可选）</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium">银行实际到账金额</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                  <input type="number" value={form.actualNet} onChange={e => set('actualNet', e.target.value)} placeholder="如已到账，填入实际金额" className={cn(inputCls, 'pl-6')} />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">如尚未到账，留空即可；到账后再通过"确认到账"功能更新</p>
                {variance !== null && Math.abs(variance) > 0.01 && (
                  <div className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
                    与预期差异：{variance > 0 ? '+' : ''}${variance.toFixed(2)} — 将标记为"差异"状态，需在对账中处理
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium">备注</label>
                <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="如差异原因、汇率说明、特殊扣减等" className={cn(inputCls, 'resize-none')} />
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
          <button
            disabled={!isValid}
            onClick={() => {
              const deductionBreakdown: ChannelArRow['deductionBreakdown'] = {
                commission:    parseFloat(form.commission) || undefined,
                fulfillmentFee: parseFloat(form.fulfillmentFee) || undefined,
                advertisingFee: parseFloat(form.advertisingFee) || undefined,
                transactionFee: parseFloat(form.transactionFee) || undefined,
                refunds:        parseFloat(form.refunds) || undefined,
                other:          parseFloat(form.otherDeduction) || undefined,
              };
              const newRow: ChannelArRow = {
                id: `car_manual_${Date.now()}`,
                settlementNo: `MANUAL-${effectiveChannel.toUpperCase().replace(/\s/g, '').slice(0, 10)}-${form.periodEnd.replace(/-/g, '')}`,
                channel: effectiveChannel as ChannelSource,
                merchant: form.merchant || effectiveChannel,
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                orderCount: parseInt(form.orderCount) || 0,
                grossAmount: grossAmt,
                totalDeduction,
                expectedNet,
                actualNet: actualNetVal,
                variance,
                currency: form.currency,
                status: actualNetVal !== null
                  ? (variance !== null && Math.abs(variance) < 0.01 ? '已到账' : '差异')
                  : '待到账',
                settledAt: actualNetVal !== null ? new Date().toISOString().slice(0, 10) : undefined,
                erpSync: 'pending',
                note: form.note || undefined,
                deductionBreakdown,
                expectedReceiptDate: form.periodEnd,
              };
              onAdd(newRow);
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
            保存结算记录
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 新建 B2B 发票 Drawer ─────────────────────────────────────────────────────

function NewInvoiceDrawer({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (inv: typeof arRows[0]) => void;
}) {
  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] transition-colors placeholder:text-[var(--muted-foreground)]';

  const [form, setForm] = useState({
    customer: '',
    channel: 'Direct',
    invoiceDate: new Date().toISOString().slice(0, 10),
    paymentTerms: 'Net 30',
    invoiceAmount: '',
    currency: 'USD',
    sourceOrderId: '',
    note: '',
  });

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const amount = parseFloat(form.invoiceAmount) || 0;
  const daysMap: Record<string, number> = { 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, 'Net 90': 90 };
  const days = daysMap[form.paymentTerms] ?? 30;
  const dueDate = new Date(new Date(form.invoiceDate).getTime() + days * 86400000).toISOString().slice(0, 10);

  const isValid = form.customer && amount > 0 && form.invoiceDate;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[440px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">新建应收发票</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">手动创建 B2B 应收账单，不依赖系统订单</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium">客户名称 *</label>
            <input value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="如 TechCorp Inc." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">销售渠道</label>
              <select value={form.channel} onChange={e => set('channel', e.target.value)} className={inputCls}>
                <option>Direct</option><option>EDI</option><option>Shopify</option><option>Amazon</option><option>其他</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">付款条款</label>
              <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className={inputCls}>
                <option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Net 90</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">开单日期 *</label>
              <input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">到期日（自动计算）</label>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--muted)]">{dueDate}</div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">应收金额 *</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
              <input type="number" value={form.invoiceAmount} onChange={e => set('invoiceAmount', e.target.value)} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">关联订单号（可选）</label>
            <input value={form.sourceOrderId} onChange={e => set('sourceOrderId', e.target.value)} placeholder="如 SO-2026-0001" className={cn(inputCls, 'font-mono')} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">备注</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
          <button
            disabled={!isValid}
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              const newInv = {
                id: `ar_manual_${Date.now()}`,
                invoiceNo: `INV-MAN-${today.replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
                sourceOrderId: form.sourceOrderId || undefined,
                paymentTerms: form.paymentTerms,
                customer: form.customer,
                channel: form.channel,
                invoiceDate: form.invoiceDate,
                dueDate,
                invoiceAmount: amount,
                paidAmount: 0,
                balanceDue: amount,
                currency: form.currency,
                agingStatus: '未到期' as const,
                overdueDays: 0,
                note: form.note || undefined,
              };
              onAdd(newInv);
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
            创建发票
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 通用分页组件（AR 模块）─────────────────────────────────────────────────

function ArPagination({ total, page, pageSize, onChange }: {
  total: number; page: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnCls = 'flex h-7 min-w-[28px] items-center justify-center rounded-md border text-[12px] transition-colors';

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[12px]">
      <span className="text-[var(--muted)]">共 {total} 条 · 第 {page}/{totalPages} 页</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className={cn(btnCls, 'border-[var(--border)] px-2.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40')}>
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e-${i}`} className="px-1 text-[var(--muted)]">…</span>
            : <button key={p} onClick={() => onChange(p as number)}
                className={cn(btnCls, p === page
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                {p}
              </button>
        )}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className={cn(btnCls, 'border-[var(--border)] px-2.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40')}>
          ›
        </button>
      </div>
    </div>
  );
}

// ─── AR 收款表单（独立组件，含凭证上传）────────────────────────────────────

function ArPaymentForm({ balanceDue, payAmount, onAmountChange, onConfirm, onClose }: {
  balanceDue: number;
  payAmount: string;
  onAmountChange: (v: string) => void;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('银行转账');
  const [ref, setRef] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const parsed = parseFloat(payAmount);
  const attachmentRequired = parsed > 5000;
  const isValid = !isNaN(parsed) && parsed > 0
    && (!attachmentRequired || attachmentName !== null);

  return (
    <>
      <div className="space-y-3 px-6 py-5">
        <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
          <div className="flex justify-between"><span className="text-[var(--muted)]">未收余额</span><span className="font-semibold">{fmtD(balanceDue)}</span></div>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium">本次收款金额 *</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
            <input type="number" value={payAmount} onChange={e => onAmountChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] py-1.5 pl-6 pr-2.5 text-[13px] font-semibold outline-none focus:border-[var(--primary)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium">到账日期</label>
            <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">收款方式</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--primary)]">
              <option>银行转账</option><option>支票</option><option>信用卡</option><option>PayPal</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium">银行流水号（可选）</label>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="参考号/流水号"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-[var(--primary)]" />
        </div>

        {/* 收款凭证上传 */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium">
            收款凭证
            {attachmentRequired
              ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">必填（金额 &gt;$5,000）</span>
              : <span className="rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">建议上传</span>
            }
          </label>
          {attachmentName ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] text-emerald-700">
                <span className="font-medium">{attachmentName}</span>
              </div>
              <button onClick={() => setAttachmentName(null)} className="text-[var(--muted)] hover:text-[var(--danger)]">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2.5 transition-colors',
              attachmentRequired ? 'border-red-300 bg-red-50 hover:border-red-400' : 'border-[var(--border)] hover:border-[var(--primary)]',
            )}>
              <div className="size-4 shrink-0 text-[var(--muted)]">↑</div>
              <div>
                <div className={cn('text-[12px] font-medium', attachmentRequired ? 'text-red-600' : 'text-[var(--foreground)]')}>
                  {attachmentRequired ? '请上传银行到账凭证（必填）' : '上传到账凭证（推荐）'}
                </div>
                <div className="text-[10px] text-[var(--muted)]">支持 PDF、PNG、JPG，最大 10MB</div>
              </div>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setAttachmentName(e.target.files[0].name); }} />
            </label>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
        <button onClick={onClose} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
        <button
          disabled={!isValid}
          onClick={() => isValid && onConfirm(parsed)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
          确认收款
        </button>
      </div>
    </>
  );
}

// ─── AR 发票预览弹窗 ──────────────────────────────────────────────────────────

function ArInvoicePreviewModal({ invoice, onClose, onMarkSent }: {
  invoice: typeof arRows[0];
  onClose: () => void;
  onMarkSent: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[620px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl flex flex-col">

        {/* 操作栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <span className="text-[14px] font-semibold text-[var(--foreground)]">发票预览</span>
            <span className="ml-2 text-[12px] text-[var(--muted)]">{invoice.invoiceNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-[12px] hover:bg-[var(--surface-subtle)]">
              下载 PDF（模拟）
            </button>
            <button
              onClick={onMarkSent}
              className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90">
              ✓ 标记已发送
            </button>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 发票内容 */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="mx-auto max-w-[520px] bg-white shadow-lg" style={{ fontFamily: 'system-ui, sans-serif' }}>

            {/* 标题栏 */}
            <div style={{ backgroundColor: '#1d4ed8', color: '#fff', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Your Company Inc.</div>
              <div style={{ fontSize: '26px', fontWeight: 800, opacity: 0.9 }}>INVOICE</div>
            </div>

            {/* 发送方/收件方 + 元信息 */}
            <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderBottom: '2px solid #bfdbfe' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 1, marginBottom: 6 }}>FROM</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>Your Company Inc.</div>
                <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.7, marginTop: 2 }}>
                  123 Commerce Street<br />New York, NY 10001<br />finance@yourcompany.com
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 1, marginBottom: 6 }}>BILL TO</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{invoice.customer}</div>
                <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.7, marginTop: 2 }}>
                  [Customer Address]<br />[City, Country]
                </div>
                <div style={{ marginTop: 12 }}>
                  {[
                    { l: 'Invoice No.', v: invoice.invoiceNo },
                    { l: 'Issue Date',  v: invoice.invoiceDate },
                    { l: 'Due Date',    v: invoice.dueDate },
                    { l: 'Terms',       v: invoice.paymentTerms ?? 'Net 30' },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: 3 }}>
                      <span style={{ color: '#888' }}>{r.l}</span>
                      <span style={{ fontWeight: 600 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 明细 */}
            <div style={{ padding: '20px 28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1d4ed8', color: '#fff' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #bfdbfe' }}>
                    <td style={{ padding: '9px 10px', color: '#333' }}>
                      Goods / Services per Order {invoice.sourceOrderId ?? '—'}<br />
                      <span style={{ fontSize: '10px', color: '#888' }}>Per agreement dated {invoice.invoiceDate}</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#555' }}>1</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#555' }}>
                      {invoice.invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {invoice.invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #bfdbfe', color: '#555' }}>
                    <span>Subtotal</span>
                    <span>{invoice.invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #bfdbfe', color: '#555' }}>
                    <span>Tax</span><span>—</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 10px', backgroundColor: '#1d4ed8', color: '#fff', borderRadius: 4, marginTop: 3, fontSize: '13px', fontWeight: 700 }}>
                    <span>TOTAL DUE</span>
                    <span>{invoice.invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: 4, marginTop: 3, fontSize: '12px', fontWeight: 600 }}>
                      <span>Payments Received</span>
                      <span>-{invoice.paidAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                  )}
                  {invoice.balanceDue > 0 && invoice.paidAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 4, marginTop: 3, fontSize: '12px', fontWeight: 700 }}>
                      <span>Balance Due</span>
                      <span>{invoice.balanceDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 付款说明 */}
            <div style={{ padding: '16px 28px', backgroundColor: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 1, marginBottom: 6 }}>Payment Instructions</div>
              <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.7 }}>
                请在到期日前通过银行转账完成付款。<br />
                Bank: [Your Bank Name] · Account: [Account No.] · Routing: [Routing No.]
              </div>
              <div style={{ marginTop: 6, fontSize: '10px', color: '#888' }}>逾期30天未付款，将按未付金额的 1.5%/月 收取滞纳金。</div>
            </div>

            {/* 底部 */}
            <div style={{ padding: '12px 28px', borderTop: '1px solid #bfdbfe', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
              感谢您的合作。如有疑问，请联系 finance@yourcompany.com
            </div>
          </div>
        </div>

        {/* 提示 */}
        <div className="shrink-0 border-t border-[var(--border)] bg-amber-50 px-5 py-2.5 text-[11px] text-amber-700">
          💡 请在"财务设置 → 发票模版"中完善公司信息、银行账户等，生成的发票将自动使用这些信息
        </div>
      </div>
    </>
  );
}
