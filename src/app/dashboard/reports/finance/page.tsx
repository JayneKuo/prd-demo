'use client';

import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  reportKpi,
  monthlyTrend,
  weeklyTrend,
  dailyTrend,
  channelProfits,
  skuProfits,
  customerProfits,
  type TrendPoint,
  type ReportPeriod,
} from '@/lib/mock-data/finance-report';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function fmt(n: number, compact = false) {
  if (compact && n >= 1000) {
    return n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${(n / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${n.toFixed(1)}%`; }

// ─── SVG 折线图 ───────────────────────────────────────────────────────────────

function LineChart({
  data,
  series,
  height = 200,
}: {
  data: TrendPoint[];
  series: { key: keyof TrendPoint; color: string; label: string }[];
  height?: number;
}) {
  const W = 700;
  const PAD = { top: 12, right: 12, bottom: 28, left: 52 };
  const cw = W - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  const allVals = series.flatMap((s) => data.map((d) => d[s.key] as number));
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const gx = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * cw;
  const gy = (v: number) => PAD.top + ch - ((v - minVal) / range) * ch;

  const buildPath = (key: keyof TrendPoint) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${gx(i).toFixed(1)},${gy(d[key] as number).toFixed(1)}`).join(' ');

  const buildArea = (key: keyof TrendPoint, color: string) =>
    buildPath(key)
    + ` L${gx(data.length - 1).toFixed(1)},${(PAD.top + ch).toFixed(1)}`
    + ` L${PAD.left.toFixed(1)},${(PAD.top + ch).toFixed(1)} Z`;

  // Y ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range / yTicks) * i);

  // X ticks (最多显示 8 个)
  const step = Math.ceil(data.length / 8);
  const xTickIdxs = data.map((_, i) => i).filter((i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yTickVals.map((v, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={gy(v)} y2={gy(v)}
          stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="3,3" />
      ))}
      {/* Y labels */}
      {yTickVals.map((v, i) => (
        <text key={i} x={PAD.left - 5} y={gy(v) + 3.5} textAnchor="end" fontSize={9} fill="var(--muted)">
          {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
        </text>
      ))}
      {/* Series */}
      {series.map((s) => (
        <g key={String(s.key)}>
          <path d={buildArea(s.key, s.color)} fill={s.color} opacity={0.06} />
          <path d={buildPath(s.key)} fill="none" stroke={s.color} strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {/* X labels */}
      {xTickIdxs.map((i) => (
        <text key={i} x={gx(i)} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">
          {data[i].label}
        </text>
      ))}
    </svg>
  );
}

// ─── SVG 条形图 ───────────────────────────────────────────────────────────────

function BarChart({
  labels,
  values,
  color = '#3b82f6',
  height = 160,
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
}) {
  const W = 700;
  const PAD = { top: 10, right: 12, bottom: 22, left: 48 };
  const cw = W - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const maxVal = Math.max(...values, 1);
  const barW = (cw / labels.length) * 0.6;
  const gap = cw / labels.length;

  const step = Math.ceil(labels.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line key={i}
          x1={PAD.left} x2={W - PAD.right}
          y1={PAD.top + ch * (1 - pct)} y2={PAD.top + ch * (1 - pct)}
          stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="3,3" />
      ))}
      {values.map((v, i) => {
        const bh = (v / maxVal) * ch;
        const x = PAD.left + i * gap + (gap - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={PAD.top + ch - bh} width={barW} height={bh} fill={color} rx={2} opacity={0.82} />
            {(i % step === 0 || i === labels.length - 1) && (
              <text x={x + barW / 2} y={height - 4} textAnchor="middle" fontSize={8} fill="var(--muted)">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'monthly', label: '月度' },
  { value: 'weekly',  label: '周度' },
  { value: 'daily',   label: '日度' },
];

const reportTabs = ['收入与利润', '渠道分析', 'SKU 利润', '客户分析'] as const;
type ReportTab = (typeof reportTabs)[number];

export default function FinanceReportPage() {
  const [period, setPeriod]       = useState<ReportPeriod>('monthly');
  const [activeTab, setActiveTab] = useState<ReportTab>('收入与利润');

  const trendData = useMemo(() => {
    if (period === 'daily')   return dailyTrend;
    if (period === 'weekly')  return weeklyTrend;
    return monthlyTrend;
  }, [period]);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">财务报表</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            收入 · 利润 · 渠道 · SKU · 客户多维度经营分析
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 周期切换 */}
          <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {periodOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => setPeriod(o.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  period === o.value
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出报表
          </button>
        </div>
      </div>

      {/* ── KPI 卡片 ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <ReportKpiCard
          label="总收入"
          value={fmt(reportKpi.totalRevenue)}
          sub={`环比 +${reportKpi.revenueDelta}%`}
          trend="up"
        />
        <ReportKpiCard
          label="毛利润"
          value={fmt(reportKpi.grossProfit)}
          sub={`毛利率 ${pct(reportKpi.grossMargin)}`}
          trend="up"
        />
        <ReportKpiCard
          label="贡献毛利"
          value={fmt(reportKpi.contributionMargin)}
          sub={`贡献毛利率 ${pct(reportKpi.contributionMarginRate)}`}
          trend="up"
        />
        <ReportKpiCard
          label="订单量"
          value={reportKpi.totalOrders.toLocaleString()}
          sub={`客单价 ${fmt(reportKpi.avgOrderValue)}`}
          trend="neutral"
        />
      </div>

      {/* ── Tab 导航 ── */}
      <div className="mb-4 border-b border-[var(--border)]">
        <div className="flex gap-6">
          {reportTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative pb-3 pt-1 text-[13px] font-medium transition-colors',
                activeTab === tab
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 内容 ── */}
      {activeTab === '收入与利润' && (
        <RevenueProfitTab trendData={trendData} period={period} />
      )}
      {activeTab === '渠道分析' && (
        <ChannelTab />
      )}
      {activeTab === 'SKU 利润' && (
        <SkuTab />
      )}
      {activeTab === '客户分析' && (
        <CustomerTab />
      )}
    </div>
  );
}

// ─── Tab: 收入与利润 ──────────────────────────────────────────────────────────

function RevenueProfitTab({ trendData, period }: { trendData: TrendPoint[]; period: ReportPeriod }) {
  const periodLabel = period === 'daily' ? '日' : period === 'weekly' ? '周' : '月';

  return (
    <div className="space-y-5">
      {/* 收入趋势 */}
      <ChartCard
        title={`收入趋势（${periodLabel}度）`}
        legend={[
          { color: '#3b82f6', label: '总收入' },
          { color: '#10b981', label: '商品收入' },
          { color: '#f59e0b', label: '运费收入' },
        ]}
      >
        <LineChart
          data={trendData}
          series={[
            { key: 'revenue',        color: '#3b82f6', label: '总收入' },
            { key: 'productRevenue', color: '#10b981', label: '商品收入' },
            { key: 'shippingRevenue',color: '#f59e0b', label: '运费收入' },
          ]}
          height={220}
        />
      </ChartCard>

      {/* 利润趋势 */}
      <ChartCard
        title={`利润趋势（${periodLabel}度）`}
        legend={[
          { color: '#3b82f6', label: '毛利润' },
          { color: '#8b5cf6', label: '贡献毛利' },
        ]}
      >
        <LineChart
          data={trendData}
          series={[
            { key: 'grossProfit',  color: '#3b82f6', label: '毛利润' },
            { key: 'contribution', color: '#8b5cf6', label: '贡献毛利' },
          ]}
          height={200}
        />
      </ChartCard>

      {/* 订单量趋势 */}
      <ChartCard title={`订单量趋势（${periodLabel}度）`} legend={[{ color: '#06b6d4', label: '订单量' }]}>
        <BarChart
          labels={trendData.map((d) => d.label)}
          values={trendData.map((d) => d.orderCount)}
          color="#06b6d4"
          height={160}
        />
      </ChartCard>

      {/* 数据汇总表 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">明细数据</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left">周期</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">总收入</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">商品收入</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">毛利润</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">毛利率</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">贡献毛利</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">贡献毛利率</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">订单量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {[...trendData].reverse().map((d) => {
                const gm = d.revenue > 0 ? (d.grossProfit / d.revenue) * 100 : 0;
                const cm = d.revenue > 0 ? (d.contribution / d.revenue) * 100 : 0;
                return (
                  <tr key={d.label} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--foreground)]">{d.label}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-[var(--foreground)]">{fmt(d.revenue, true)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{fmt(d.productRevenue, true)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-[var(--foreground)]">{fmt(d.grossProfit, true)}</td>
                    <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-semibold', gm >= 35 ? 'text-[var(--success)]' : gm >= 25 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
                      {pct(gm)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--foreground)]">{fmt(d.contribution, true)}</td>
                    <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-semibold', cm >= 25 ? 'text-[var(--success)]' : cm >= 15 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
                      {pct(cm)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{d.orderCount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: 渠道分析 ────────────────────────────────────────────────────────────

function ChannelTab() {
  return (
    <div className="space-y-5">
      {/* 渠道利润条形对比 */}
      <ChartCard
        title="渠道净利润对比"
        legend={[{ color: '#3b82f6', label: '净利润' }]}
      >
        <BarChart
          labels={channelProfits.map((c) => c.channel)}
          values={channelProfits.map((c) => c.profit)}
          color="#3b82f6"
          height={160}
        />
      </ChartCard>

      {/* 渠道明细表 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">渠道利润明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left">渠道</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">收入</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">成本</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">利润</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">利润率</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">订单量</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">环比</th>
                <th className="whitespace-nowrap px-3 py-2.5">利润占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {channelProfits.map((ch) => {
                const totalProfit = channelProfits.reduce((s, c) => s + c.profit, 0);
                const sharePct = totalProfit > 0 ? (ch.profit / totalProfit) * 100 : 0;
                const TrendIcon = ch.trend === 'up' ? TrendingUp : ch.trend === 'down' ? TrendingDown : Minus;
                const trendCls = ch.trend === 'up' ? 'text-[var(--success)]' : ch.trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--muted)]';
                return (
                  <tr key={ch.channel} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{ch.channel}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{fmt(ch.revenue, true)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{fmt(ch.cost, true)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[var(--foreground)]">{fmt(ch.profit, true)}</td>
                    <td className={cn('whitespace-nowrap px-3 py-3 text-right font-semibold', ch.margin >= 35 ? 'text-[var(--success)]' : ch.margin >= 25 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
                      {pct(ch.margin)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{ch.orderCount.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <span className={cn('inline-flex items-center gap-0.5 text-[12px]', trendCls)}>
                        <TrendIcon className="size-3" />
                        {Math.abs(ch.trendPct)}%
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${sharePct}%` }} />
                        </div>
                        <span className="text-[11px] text-[var(--muted)]">{pct(sharePct)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: SKU 利润 ────────────────────────────────────────────────────────────

function SkuTab() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">SKU 利润排行 Top 10</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[12px]">
          <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">排名</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left">SKU / 商品</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">收入</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">成本</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">利润</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">利润率</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">销量</th>
              <th className="whitespace-nowrap px-3 py-2.5">利润率可视化</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {skuProfits.map((sku) => (
              <tr key={sku.sku} className="hover:bg-[var(--surface-subtle)]">
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                    sku.rank <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)]'
                  )}>
                    {sku.rank}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-mono text-[11px] text-[var(--muted)]">{sku.sku}</div>
                  <div className="mt-0.5 text-[12px] font-medium text-[var(--foreground)]">{sku.name}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">{fmt(sku.revenue, true)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{fmt(sku.cost, true)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[var(--foreground)]">{fmt(sku.profit, true)}</td>
                <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-bold', sku.margin >= 40 ? 'text-[var(--success)]' : sku.margin >= 30 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
                  {pct(sku.margin)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{sku.soldQty}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                      <div
                        className={cn('h-full rounded-full', sku.margin >= 40 ? 'bg-[var(--success)]' : sku.margin >= 30 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]')}
                        style={{ width: `${Math.min(sku.margin, 60) / 60 * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: 客户分析 ────────────────────────────────────────────────────────────

function CustomerTab() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">客户利润贡献 Top 10</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[12px]">
          <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">排名</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left">客户</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">收入</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">利润</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">利润率</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">订单数</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">客单利润</th>
              <th className="whitespace-nowrap px-3 py-2.5">利润贡献</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {customerProfits.map((c) => {
              const totalProfit = customerProfits.reduce((s, x) => s + x.profit, 0);
              const share = totalProfit > 0 ? (c.profit / totalProfit) * 100 : 0;
              const perOrder = c.orderCount > 0 ? c.profit / c.orderCount : 0;
              return (
                <tr key={c.name} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                      c.rank <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)]'
                    )}>
                      {c.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{c.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">{fmt(c.revenue, true)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[var(--foreground)]">{fmt(c.profit, true)}</td>
                  <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-semibold', c.margin >= 35 ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                    {pct(c.margin)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{c.orderCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--foreground)]">{fmt(perOrder, true)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">{pct(share)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 小组件 ──────────────────────────────────────────────────────────────────

function ReportKpiCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendCls = trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--muted)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[var(--muted)]">{label}</span>
        <TrendIcon className={cn('size-4', trendCls)} />
      </div>
      <div className="mt-1.5 text-[20px] font-bold tracking-tight text-[var(--foreground)]">{value}</div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend: { color: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{title}</h3>
        <div className="flex items-center gap-4">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <span className="size-2.5 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
