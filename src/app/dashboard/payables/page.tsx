'use client';

import { useState, useMemo } from 'react';
import React from 'react';
import { Download, Plus, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  apKpi, apRows, apStatusConfig,
  type ApRow, type ApStatus, type ApCategory,
} from '@/lib/mock-data/ar-ap';

// ─── utils ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n);
}

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const categoryConfig: Record<ApCategory, { label: string; desc: string; cls: string; barCls: string }> = {
  '仓储费':   { label: '仓储费（3PL）',       desc: 'ShipBob / XPO 等 3PL 月度账单',           cls: 'bg-blue-50 text-blue-700 ring-blue-200',       barCls: 'bg-blue-400' },
  '运输费':   { label: '承运商运费',           desc: 'FedEx / UPS / Royal Mail 运费账单',         cls: 'bg-purple-50 text-purple-700 ring-purple-200', barCls: 'bg-purple-400' },
  '平台费':   { label: '平台订阅费',           desc: '订阅费/月租（非结算扣减）— Amazon Pro $39.99、Shopify 月费等', cls: 'bg-orange-50 text-orange-700 ring-orange-200', barCls: 'bg-orange-400' },
  '支付手续费': { label: '支付手续费',         desc: 'Stripe / PayPal 账单；结算已扣的不在此处',  cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200', barCls: 'bg-indigo-400' },
  '清关费':   { label: '清关 / 关税',          desc: '报关代理及关税费用',                        cls: 'bg-slate-50 text-slate-600 ring-slate-200',   barCls: 'bg-slate-400' },
  '其他':     { label: '其他',                 desc: '广告费账单、SaaS 订阅、杂项支出',           cls: 'bg-gray-50 text-gray-600 ring-gray-200',       barCls: 'bg-gray-400' },
};

const tabs = [
  { key: 'all',    label: '全部' },
  { key: '仓储费', label: '仓储费' },
  { key: '运输费', label: '运输费' },
  { key: '平台费', label: '平台费' },
  { key: '支付手续费', label: '支付手续费' },
  { key: '有差异', label: '有差异' },
  { key: '有争议', label: '有争议' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function PayablesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showBillEntry, setShowBillEntry] = useState(false);

  const filtered = useMemo(() => apRows.filter(r => {
    if (activeTab === 'all')     return true;
    if (activeTab === '有差异') return (r.variance ?? 0) !== 0;
    if (activeTab === '有争议') return r.status === '有争议';
    return r.category === activeTab;
  }), [activeTab]);

  const counts: Record<TabKey, number> = useMemo(() => ({
    all:      apRows.length,
    '仓储费': apRows.filter(r => r.category === '仓储费').length,
    '运输费': apRows.filter(r => r.category === '运输费').length,
    '平台费': apRows.filter(r => r.category === '平台费').length,
    '支付手续费': apRows.filter(r => r.category === '支付手续费').length,
    '有差异': apRows.filter(r => (r.variance ?? 0) !== 0).length,
    '有争议': apRows.filter(r => r.status === '有争议').length,
  }), []);

  // 差异汇总
  const totalVariance = apRows.reduce((s, r) => s + (r.variance ?? 0), 0);
  const varianceCount = apRows.filter(r => (r.variance ?? 0) !== 0).length;

  // 费用类型分布
  const totalBill = apRows.reduce((s, r) => s + r.billAmount, 0);
  const categoryTotals = useMemo(() => {
    const map: Partial<Record<ApCategory, number>> = {};
    apRows.forEach(r => { map[r.category] = (map[r.category] ?? 0) + r.billAmount; });
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── 页头 ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">应付账款</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            3PL仓储 · 承运商运费 · 平台服务费 · 广告费 — OMS预估 vs 实际账单对比
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <button
            onClick={() => setShowBillEntry(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            <Plus className="size-3.5" />录入账单
          </button>
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="总应付"  value={fmt(apKpi.totalPayable)}  sub="未付余额合计" />
        <KpiCard label="逾期应付" value={fmt(apKpi.overdueAmount)} sub="需立即处理" warn />
        <KpiCard label="本周到期" value={fmt(apKpi.dueThisWeek)}  sub="即将到期" caution />
        <KpiCard label="本月已付" value={fmt(apKpi.paidThisMonth)} sub="当月支出" success />
        <KpiCard
          label="待审批"
          value={`${apRows.filter(r => r.status === '待审批').length} 笔`}
          sub="待 Finance 审批"
          caution={apRows.filter(r => r.status === '待审批').length > 0}
        />
        <KpiCard
          label="费用差异"
          value={`${varianceCount} 笔`}
          sub={`超预估 ${fmt(totalVariance)}`}
          warn={varianceCount > 0}
        />
      </div>

      {/* ── 费用类型分布条 ── */}
      <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted-foreground)]">
          <Info className="size-3.5" />费用类型分布
          <span className="ml-1 text-[var(--muted)]">（按账单金额）</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {(Object.entries(categoryTotals) as [ApCategory, number][]).map(([cat, amt]) => (
            <div key={cat} className={cn('h-full', categoryConfig[cat]?.barCls ?? 'bg-gray-400')}
              style={{ width: totalBill > 0 ? `${(amt / totalBill) * 100}%` : '0' }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          {(Object.entries(categoryTotals) as [ApCategory, number][]).map(([cat, amt]) => (
            <div key={cat} className="flex items-center gap-2 text-[12px]">
              <span className={cn('size-2.5 rounded-sm', categoryConfig[cat]?.barCls ?? 'bg-gray-400')} />
              <span className="text-[var(--muted)]">{categoryConfig[cat]?.label ?? cat}</span>
              <span className="font-semibold text-[var(--foreground)]">{fmt(amt)}</span>
              <span className="text-[var(--muted)]">{((amt / totalBill) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {/* 平台费说明：避免与结算扣减双重计费 */}
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          ⚠️ <span className="font-semibold text-amber-600">平台订阅费</span>仅含独立账单（Amazon Pro 月费、Shopify 月费等）；
          佣金/FBA 配送费等已在应收结算扣除，不应重复录入此处。
        </p>
      </div>

      {/* ── 主表格 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">
          <div className="flex items-center gap-0 border-b border-[var(--border)] px-5 overflow-x-auto">
            {tabs.map(tab => {
              const count = counts[tab.key];
              const isActive = tab.key === activeTab;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative mr-4 shrink-0 pb-3 pt-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
                  )}>
                  {tab.label}
                  {count > 0 && (
                    <span className={cn('ml-1.5 text-[11px]',
                      tab.key === '有差异' || tab.key === '有争议' ? 'text-[var(--danger)]' :
                      'text-[var(--muted-foreground)]',
                    )}>
                      {count}
                    </span>
                  )}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5">账单号 / 供应商</th>
                <th className="whitespace-nowrap px-3 py-2.5">费用类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">账单日期</th>
                <th className="whitespace-nowrap px-3 py-2.5">到期日</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">OMS预估</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">实际账单</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">差异 Δ</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">已付</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">未付余额</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(row => (
                <ApTableRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-[13px] text-[var(--muted)]">
                    暂无记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部汇总 */}
        <div className="grid grid-cols-3 gap-px border-t border-[var(--border)] bg-[var(--border-subtle)] text-[12px]">
          {[
            { label: 'OMS预估合计', value: fmt(filtered.reduce((s, r) => s + (r.omsEstimate ?? r.billAmount), 0)), cls: 'text-[var(--foreground)]' },
            { label: '实际账单合计', value: fmt(filtered.reduce((s, r) => s + r.billAmount, 0)), cls: 'font-semibold text-[var(--foreground)]' },
            {
              label: '差异合计',
              value: (() => {
                const v = filtered.reduce((s, r) => s + (r.variance ?? 0), 0);
                return v === 0 ? '— 无差异' : fmt(v);
              })(),
              cls: filtered.reduce((s, r) => s + (r.variance ?? 0), 0) > 0 ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]',
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-[var(--surface-subtle)] px-5 py-3">
              <span className="text-[var(--muted)]">{label}</span>
              <span className={cn('ml-3', cls)}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 录入账单抽屉 */}
      <BillEntryDrawer open={showBillEntry} onClose={() => setShowBillEntry(false)} />
    </div>
  );
}

function ApTableRow({ row, expanded, onToggle }: {
  row: ApRow; expanded: boolean; onToggle: () => void;
}) {
  const sc    = apStatusConfig[row.status];
  const catCfg = categoryConfig[row.category] ?? categoryConfig['其他'];
  const hasVariance = (row.variance ?? 0) !== 0;
  const variancePositive = (row.variance ?? 0) > 0; // 超出预估（差异为正=贵了）
  const isOverdue = row.overdueDays > 0;

  const actionMap: Record<ApStatus, { label: string; cls: string } | null> = {
    '待审批': { label: '审批', cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    '已审批': { label: '付款', cls: 'bg-[var(--primary)] text-white hover:opacity-90' },
    '待付款': { label: '付款', cls: 'bg-[var(--primary)] text-white hover:opacity-90' },
    '有争议': { label: '处理', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '逾期':   { label: '立即付款', cls: 'bg-red-50 text-[var(--danger)] hover:bg-red-100' },
    '已付款': null,
  };
  const action = actionMap[row.status];

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer transition-colors hover:bg-[var(--surface-subtle)]',
          expanded && 'bg-[var(--surface-subtle)]',
          row.status === '有争议' && 'bg-red-50/30',
        )}
        onClick={onToggle}
      >
        {/* 账单号 / 供应商 */}
        <td className="px-4 py-3">
          <div className="font-mono text-[12px] font-medium text-[var(--foreground)]">{row.billNo}</div>
          <div className="mt-0.5 text-[12px] text-[var(--muted)]">{row.vendor}</div>
          {row.paymentTerms && (
            <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{row.paymentTerms}</div>
          )}
        </td>
        {/* 费用类型 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', catCfg.cls)}>
            {row.category}
          </span>
        </td>
        {/* 账单日期 */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{row.billDate}</td>
        {/* 到期日 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('text-[12px]', isOverdue ? 'font-semibold text-[var(--danger)]' : 'text-[var(--muted)]')}>
            {row.dueDate}
          </span>
          {isOverdue && <div className="text-[10px] text-[var(--danger)]">逾期 {row.overdueDays} 天</div>}
        </td>
        {/* OMS预估 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.omsEstimate !== undefined ? (
            <span className="text-[12px] text-[var(--muted)]">{fmt(row.omsEstimate)}</span>
          ) : (
            <span className="text-[11px] text-[var(--muted-foreground)]">未配置</span>
          )}
        </td>
        {/* 实际账单 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">
          {fmt(row.billAmount)}
        </td>
        {/* 差异 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.omsEstimate !== undefined && hasVariance ? (
            <div>
              <span className={cn('text-[13px] font-bold', variancePositive ? 'text-[var(--danger)]' : 'text-emerald-600')}>
                {variancePositive ? '+' : ''}{fmt(row.variance!)}
              </span>
              <div className={cn('text-[10px]', variancePositive ? 'text-[var(--danger)]' : 'text-emerald-600')}>
                {variancePositive ? '▲ 超预估' : '▼ 低预估'}
              </div>
            </div>
          ) : row.omsEstimate !== undefined ? (
            <span className="text-[12px] text-[var(--success)]">✓ 匹配</span>
          ) : (
            <span className="text-[11px] text-[var(--muted)]">—</span>
          )}
        </td>
        {/* 已付 */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--success)]">
          {row.paidAmount > 0 ? fmt(row.paidAmount) : '—'}
        </td>
        {/* 未付余额 */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          {row.balanceDue > 0 ? (
            <span className={cn('text-[13px] font-semibold', isOverdue ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
              {fmt(row.balanceDue)}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--success)]">已结清</span>
          )}
        </td>
        {/* 状态 */}
        <td className="whitespace-nowrap px-3 py-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', sc.cls)}>
            <span className={cn('size-1.5 rounded-full', sc.dot)} />
            {row.status}
          </span>
          {action && (
            <div className="mt-1.5">
              <button className={cn('h-6 rounded-md px-2 text-[11px] font-medium transition', action.cls)}
                onClick={e => e.stopPropagation()}>
                {action.label}
              </button>
            </div>
          )}
        </td>
        {/* 展开 */}
        <td className="px-3 py-3">
          <span className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)]">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </td>
      </tr>

      {/* 展开详情 */}
      {expanded && (
        <tr>
          <td colSpan={11} className="px-0 py-0">
            <ApRowDetail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 展开详情 ─────────────────────────────────────────────────────────────────

function ApRowDetail({ row }: { row: ApRow }) {
  const hasVariance = (row.variance ?? 0) !== 0;
  const variancePositive = (row.variance ?? 0) > 0;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
      {/* 差异提示 */}
      {hasVariance && (
        <div className={cn(
          'mb-4 flex items-start gap-2 rounded-xl px-3.5 py-3 ring-1 ring-inset',
          variancePositive ? 'bg-red-50 ring-red-200' : 'bg-emerald-50 ring-emerald-200',
        )}>
          <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', variancePositive ? 'text-red-500' : 'text-emerald-600')} />
          <p className={cn('text-[12px]', variancePositive ? 'text-red-700' : 'text-emerald-700')}>
            {row.note ?? (variancePositive
              ? `账单金额比 OMS 预估高 ${fmt(row.variance!)}，差异率 ${row.omsEstimate ? ((row.variance! / row.omsEstimate) * 100).toFixed(1) : '—'}%`
              : `账单金额比 OMS 预估低 ${fmt(Math.abs(row.variance!))}`)
            }
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 金额拆分 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">金额核对</h4>
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px]">
            {row.omsEstimate !== undefined && (
              <InfoLine label="OMS 预估" value={fmt(row.omsEstimate)} />
            )}
            <InfoLine label="实际账单" value={fmt(row.billAmount)} cls="font-semibold" />
            {row.omsEstimate !== undefined && (
              <InfoLine
                label="差异"
                value={hasVariance ? (variancePositive ? `+${fmt(row.variance!)}` : fmt(row.variance!)) : '✓ 无差异'}
                cls={hasVariance ? (variancePositive ? 'font-bold text-[var(--danger)]' : 'font-bold text-emerald-600') : 'text-[var(--success)]'}
              />
            )}
            <InfoLine label="已付款" value={row.paidAmount > 0 ? fmt(row.paidAmount) : '—'} cls="text-[var(--success)]" />
            <div className="flex items-center justify-between bg-[var(--surface-subtle)] px-3 py-2.5 font-semibold">
              <span className="text-[var(--foreground)]">未付余额</span>
              <span className={cn('text-[14px]', row.balanceDue > 0 ? 'text-[var(--foreground)]' : 'text-[var(--success)]')}>
                {row.balanceDue > 0 ? fmt(row.balanceDue) : '已结清'}
              </span>
            </div>
          </div>
        </div>

        {/* 账单信息 */}
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">账单信息</h4>
          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px]">
            <InfoLine label="账单号"   value={row.billNo} mono />
            <InfoLine label="供应商"   value={row.vendor} />
            <InfoLine label="费用类型" value={row.category} />
            <InfoLine label="账单日期" value={row.billDate} />
            <InfoLine label="到期日期" value={row.dueDate} />
            {row.paymentTerms && <InfoLine label="付款条款" value={row.paymentTerms} />}
            <InfoLine label="币种"     value={row.currency} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.status === '待审批' && (
              <button className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                审批通过
              </button>
            )}
            {(row.status === '已审批' || row.status === '待付款') && (
              <button className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90">
                确认付款
              </button>
            )}
            {row.status === '有争议' && (
              <button className="flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[12px] font-medium text-[var(--danger)] hover:bg-red-100">
                处理争议
              </button>
            )}
            {hasVariance && row.status !== '有争议' && (
              <button className="flex h-7 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[12px] font-medium text-amber-700 hover:bg-amber-100">
                发起费用对账
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 供应商库（预注册，选择时自动带入默认值）────────────────────────────────

type VendorRecord = {
  id: string;
  name: string;
  alias?: string;              // 简称
  defaultCategory: ApCategory;
  defaultPaymentTerms: string;
  region: string;
  notes?: string;
};

const VENDOR_LIST: VendorRecord[] = [
  // 3PL 仓储
  { id: 'shipbob-lax', name: 'ShipBob US (LAX)',       alias: 'ShipBob',    defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'shipbob-uk',  name: 'ShipBob UK (London)',    alias: 'ShipBob UK', defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'UK' },
  { id: 'xpo-ewr',     name: 'XPO Logistics (EWR)',    alias: 'XPO',        defaultCategory: '仓储费',   defaultPaymentTerms: 'Net 30', region: 'US' },
  // 承运商
  { id: 'fedex',       name: 'FedEx',                                       defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  { id: 'ups',         name: 'UPS',                                         defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  { id: 'dhl',         name: 'DHL Express',             alias: 'DHL',       defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'Global' },
  { id: 'royal-mail',  name: 'Royal Mail',                                  defaultCategory: '运输费',   defaultPaymentTerms: 'Net 14', region: 'UK' },
  // 平台订阅
  { id: 'amazon-sub',  name: 'Amazon（订阅费）',        alias: 'Amazon',    defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US', notes: '仅 Professional Seller 月费，佣金已从结算扣除' },
  { id: 'shopify-sub', name: 'Shopify（月费）',         alias: 'Shopify',   defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US', notes: '月度订阅费，交易手续费从打款扣除' },
  { id: 'tiktok-sub',  name: 'TikTok Shop（订阅）',    alias: 'TikTok',    defaultCategory: '平台费',   defaultPaymentTerms: 'Net 15', region: 'US' },
  // 支付
  { id: 'stripe',      name: 'Stripe',                                      defaultCategory: '支付手续费', defaultPaymentTerms: 'Net 15', region: 'US' },
  { id: 'paypal',      name: 'PayPal',                                      defaultCategory: '支付手续费', defaultPaymentTerms: 'Net 15', region: 'US' },
  // 清关
  { id: 'customs',     name: '海关（关税）',                                 defaultCategory: '清关费',   defaultPaymentTerms: '即期',   region: 'CN' },
  { id: 'broker',      name: '清关代理（通用）',                              defaultCategory: '清关费',   defaultPaymentTerms: 'Net 14', region: 'US' },
  // 广告 / SaaS
  { id: 'google-ads',  name: 'Google Ads',                                  defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'meta-ads',    name: 'Meta Ads（Facebook）',   alias: 'Meta',       defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
  { id: 'klaviyo',     name: 'Klaviyo（Email Marketing）',                  defaultCategory: '其他',     defaultPaymentTerms: 'Net 30', region: 'US' },
];
// 供应商账单由财务录入，必须关联系统内的业务单据（运单/采购单/服务期间）
// 录入后状态"待审批"，Finance Manager 审批后才能安排付款

type BillFormData = {
  vendorId: string;            // 从供应商库选择
  vendorBillNo: string;        // 供应商发给我们的账单编号（外部参考号）
  category: ApCategory | '';
  // 关联业务单据（根据费用类型变化）
  linkedDocType: string;
  linkedDocNo: string;
  linkedPeriod: string;
  billDate: string;
  dueDate: string;
  paymentTerms: string;
  omsEstimate: string;
  billAmount: string;
  currency: string;
  note: string;
};

const EMPTY_FORM: BillFormData = {
  vendorId: '', vendorBillNo: '', category: '',
  linkedDocType: '', linkedDocNo: '', linkedPeriod: '',
  billDate: '', dueDate: '', paymentTerms: 'Net 30',
  omsEstimate: '', billAmount: '', currency: 'USD', note: '',
};

// 每种费用类型对应的业务单据说明
const LINKED_DOC_CONFIG: Record<ApCategory, {
  docLabel: string;       // 关联单据名称
  docPlaceholder: string; // 单据号输入框 placeholder
  periodLabel?: string;   // 如果需要时间段
  hint: string;           // 说明
}> = {
  '仓储费': {
    docLabel: '服务仓库',
    docPlaceholder: '如 ShipBob-LAX / XPO-EWR',
    periodLabel: '服务月份',
    hint: '关联到具体仓库的月度服务期间，可从入库单/出库单追溯',
  },
  '运输费': {
    docLabel: '运单号（系统内）',
    docPlaceholder: '如 SHP-2026-08821、TRK-0029',
    hint: '关联到具体运单，可在出库 / TMS 模块查找对应单号',
  },
  '平台费': {
    docLabel: '平台账户',
    docPlaceholder: '如 Amazon Professional / Shopify Basic',
    periodLabel: '账期月份',
    hint: '仅含独立订阅账单；佣金/FBA 费已从结算扣除，不应录入',
  },
  '支付手续费': {
    docLabel: '支付服务商',
    docPlaceholder: '如 Stripe / PayPal',
    periodLabel: '账期月份',
    hint: '月度手续费账单；每笔交易的手续费已在结算扣除，此处为月度账单',
  },
  '清关费': {
    docLabel: '入库单号',
    docPlaceholder: '如 INB-2026-0421',
    hint: '关联到对应的入库单，追溯具体批次的关税和清关代理费',
  },
  '其他': {
    docLabel: '关联单号（可选）',
    docPlaceholder: '输入关联的业务单据编号',
    periodLabel: '费用期间',
    hint: '广告费可填广告账户；SaaS 订阅费填软件名称和账期',
  },
};

function BillEntryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<BillFormData>(EMPTY_FORM);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDrop, setShowVendorDrop] = useState(false);

  if (!open) return null;

  const selectedVendor = VENDOR_LIST.find(v => v.id === form.vendorId);

  // 供应商搜索过滤
  const filteredVendors = vendorSearch.trim()
    ? VENDOR_LIST.filter(v =>
        v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.alias ?? '').toLowerCase().includes(vendorSearch.toLowerCase()))
    : VENDOR_LIST;

  // 按费用类型分组
  const vendorGroups = [
    { label: '仓储 / 3PL',      vendors: filteredVendors.filter(v => v.defaultCategory === '仓储费') },
    { label: '承运商',           vendors: filteredVendors.filter(v => v.defaultCategory === '运输费') },
    { label: '平台订阅',         vendors: filteredVendors.filter(v => v.defaultCategory === '平台费') },
    { label: '支付 & 清关',      vendors: filteredVendors.filter(v => ['支付手续费','清关费'].includes(v.defaultCategory)) },
    { label: '广告 / SaaS',      vendors: filteredVendors.filter(v => v.defaultCategory === '其他') },
  ].filter(g => g.vendors.length > 0);

  function selectVendor(vendor: VendorRecord) {
    setForm(prev => ({
      ...prev,
      vendorId: vendor.id,
      category: vendor.defaultCategory,
      paymentTerms: vendor.defaultPaymentTerms,
      linkedDocNo: '',
      linkedPeriod: '',
    }));
    setVendorSearch('');
    setShowVendorDrop(false);
  }

  function set(field: keyof BillFormData, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'category') {
        next.linkedDocNo = '';
        next.linkedPeriod = '';
      }
      return next;
    });
  }

  const isValid = form.vendorId && form.vendorBillNo && form.category && form.billDate && form.dueDate && form.billAmount;
  const docCfg  = form.category ? LINKED_DOC_CONFIG[form.category as ApCategory] : null;
  const variance = form.omsEstimate && form.billAmount
    ? (parseFloat(form.billAmount) - parseFloat(form.omsEstimate)).toFixed(2)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[540px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">

        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">录入供应商账单</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              收到供应商账单后，录入并关联系统内业务单据 → 提交审批 → 付款
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        {/* 表单 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① 供应商信息 */}
          <section>
            <SectionLabel>① 供应商 & 账单</SectionLabel>
            <div className="space-y-3">

              {/* 供应商选择器（可搜索下拉）*/}
              <FieldRow label="供应商 *">
                <div className="relative">
                  {/* 已选中：展示已选供应商 + 清除按钮 */}
                  {selectedVendor ? (
                    <div className="flex items-center justify-between rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1.5">
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-[var(--primary)]">{selectedVendor.name}</span>
                        <span className="ml-2 text-[11px] text-[var(--muted)]">{selectedVendor.region}</span>
                        {selectedVendor.notes && (
                          <p className="mt-0.5 text-[10px] text-amber-600">{selectedVendor.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setForm(prev => ({ ...prev, vendorId: '', category: '', paymentTerms: 'Net 30' })); }}
                        className="ml-2 shrink-0 text-[var(--muted)] hover:text-[var(--danger)]">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* 未选中：搜索输入框 */
                    <div
                      onClick={() => setShowVendorDrop(true)}
                      className={cn(inputCls, 'cursor-pointer flex items-center gap-2')}>
                      <input
                        value={vendorSearch}
                        onChange={e => { setVendorSearch(e.target.value); setShowVendorDrop(true); }}
                        placeholder="搜索或选择供应商…"
                        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground)]"
                        onFocus={() => setShowVendorDrop(true)}
                      />
                      <ChevronDown className="size-3.5 shrink-0 text-[var(--muted)]" />
                    </div>
                  )}

                  {/* 下拉列表 */}
                  {showVendorDrop && !selectedVendor && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowVendorDrop(false)} />
                      <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                        <div className="max-h-[280px] overflow-y-auto">
                          {vendorGroups.length === 0 ? (
                            <p className="py-6 text-center text-[12px] text-[var(--muted)]">无匹配供应商</p>
                          ) : (
                            vendorGroups.map(group => (
                              <div key={group.label}>
                                <div className="sticky top-0 bg-[var(--surface-subtle)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                                  {group.label}
                                </div>
                                {group.vendors.map(v => (
                                  <button
                                    key={v.id}
                                    onClick={() => selectVendor(v)}
                                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-subtle)]">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[13px] font-medium text-[var(--foreground)]">{v.name}</div>
                                      <div className="text-[11px] text-[var(--muted)]">
                                        {v.region} · {v.defaultPaymentTerms} · {categoryConfig[v.defaultCategory]?.label ?? v.defaultCategory}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                        {/* 新增供应商入口 */}
                        <div className="border-t border-[var(--border)] px-3 py-2">
                          <button className="flex w-full items-center gap-2 text-[12px] text-[var(--primary)] hover:underline underline-offset-2">
                            <Plus className="size-3.5" />
                            新增供应商到供应商库
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </FieldRow>

              <FieldRow label="供应商账单号 *">
                <input value={form.vendorBillNo} onChange={e => set('vendorBillNo', e.target.value)}
                  placeholder="对方账单上的编号，如 SB-INV-2026090001"
                  className={cn(inputCls, 'font-mono')} />
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  供应商发给我们的账单编号，用于与对方沟通对账，不是我们系统的单号
                </p>
              </FieldRow>

              {/* 费用类型：供应商已选时自动填充，也可手动修改 */}
              <FieldRow label="费用类型 *">
                <select value={form.category} onChange={e => set('category', e.target.value as ApCategory | '')}
                  className={inputCls}>
                  <option value="">选择费用类型…</option>
                  {(Object.keys(LINKED_DOC_CONFIG) as ApCategory[]).map(k => (
                    <option key={k} value={k}>{categoryConfig[k]?.label ?? k}</option>
                  ))}
                </select>
                {form.category === '平台费' && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    ⚠️ 仅含独立订阅账单（Amazon Pro、Shopify 月费等），佣金/FBA 费已从结算扣除，勿重复录入
                  </p>
                )}
                {selectedVendor && form.category && form.category !== selectedVendor.defaultCategory && (
                  <p className="mt-1 text-[11px] text-blue-600">
                    已修改为与供应商默认类型不同，请确认
                  </p>
                )}
              </FieldRow>
            </div>
          </section>

          {/* ② 关联业务单据（核心：每笔费用必须能追溯到业务操作）*/}
          {docCfg && (
            <section>
              <SectionLabel>② 关联业务单据</SectionLabel>
              <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700">
                {docCfg.hint}
              </div>
              <div className="space-y-3">
                <FieldRow label={`${docCfg.docLabel} *`}>
                  <input value={form.linkedDocNo} onChange={e => set('linkedDocNo', e.target.value)}
                    placeholder={docCfg.docPlaceholder}
                    className={cn(inputCls, form.category === '运输费' ? 'font-mono' : '')} />
                  {form.category === '运输费' && (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      可在&quot;出库单&quot;或&quot;运输&quot;模块中查找运单号
                    </p>
                  )}
                  {form.category === '仓储费' && (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      可在&quot;仓库/库位&quot;模块查看对应仓库的服务合同
                    </p>
                  )}
                </FieldRow>
                {docCfg.periodLabel && (
                  <FieldRow label={docCfg.periodLabel}>
                    <input value={form.linkedPeriod} onChange={e => set('linkedPeriod', e.target.value)}
                      placeholder="如 2026-09（YYYY-MM）"
                      className={inputCls} />
                  </FieldRow>
                )}
              </div>
            </section>
          )}

          {/* ③ 日期与付款条款 */}
          <section>
            <SectionLabel>③ 日期 & 付款条款</SectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="账单日期 *">
                  <input type="date" value={form.billDate} onChange={e => set('billDate', e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="到期日 *">
                  <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
                </FieldRow>
              </div>
              <FieldRow label="付款条款">
                <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className={inputCls}>
                  <option value="即期">即期（到期即付）</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </FieldRow>
            </div>
          </section>

          {/* ④ 金额核对 */}
          <section>
            <SectionLabel>④ 金额核对</SectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="OMS 预估金额">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                    <input type="number" value={form.omsEstimate} onChange={e => set('omsEstimate', e.target.value)}
                      placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">OMS 基于业务操作估算的成本</p>
                </FieldRow>
                <FieldRow label="账单实际金额 *">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)]">$</span>
                    <input type="number" value={form.billAmount} onChange={e => set('billAmount', e.target.value)}
                      placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">供应商账单上的实际金额</p>
                </FieldRow>
              </div>
              {variance !== null && parseFloat(variance) !== 0 && (
                <div className={cn('rounded-lg px-3 py-2 text-[12px]',
                  parseFloat(variance) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                  {parseFloat(variance) > 0
                    ? `账单比 OMS 预估高 $${variance}，需在审批备注中说明原因`
                    : `账单比 OMS 预估低 $${Math.abs(parseFloat(variance)).toFixed(2)}`}
                </div>
              )}
              <FieldRow label="币种">
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="CNY">CNY</option>
                </select>
              </FieldRow>
            </div>
          </section>

          {/* ⑤ 附件 & 备注 */}
          <section>
            <SectionLabel>⑤ 账单原件 & 备注</SectionLabel>
            <div className="space-y-3">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                <Upload className="size-4 shrink-0" />
                <div>
                  <div className="text-[12px] font-medium">上传账单原件</div>
                  <div className="text-[11px]">PDF / JPG / PNG，最大 10MB</div>
                </div>
              </div>
              <FieldRow label="备注（差异说明等）">
                <textarea value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="如有差异，请说明原因；附加费、汇率差等…"
                  rows={3} className={cn(inputCls, 'resize-none')} />
              </FieldRow>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">
            取消
          </button>
          <div className="flex items-center gap-2">
            <button
              disabled={!isValid}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]',
                !isValid && 'opacity-40 cursor-not-allowed')}>
              保存草稿
            </button>
            <button
              disabled={!isValid}
              onClick={onClose}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90',
                !isValid && 'opacity-40 cursor-not-allowed')}>
              提交审批
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 表单辅助组件
const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] transition-colors placeholder:text-[var(--muted-foreground)]';

function SectionLabel({ children }: { children: string }) {
  return <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{children}</h3>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">{label}</label>
      {children}
    </div>
  );
}

// ─── 小组件 ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, warn, caution, success, danger }: {
  label: string; value: string; sub: string;
  warn?: boolean; caution?: boolean; success?: boolean; danger?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 shadow-[var(--shadow-soft)]',
      danger  ? 'border-red-200 bg-red-50' :
      warn    ? 'border-amber-200 bg-amber-50' :
      caution ? 'border-yellow-200 bg-yellow-50' :
      success ? 'border-emerald-200 bg-emerald-50' :
      'border-[var(--border)] bg-[var(--surface)]',
    )}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={cn('mt-1 text-[20px] font-bold tracking-tight',
        danger  ? 'text-red-700' :
        warn    ? 'text-amber-700' :
        caution ? 'text-yellow-700' :
        success ? 'text-emerald-700' :
        'text-[var(--foreground)]',
      )}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>
    </div>
  );
}

function InfoLine({ label, value, cls, mono }: {
  label: string; value: string; cls?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn(mono && 'font-mono text-[11px]', cls ?? 'font-medium text-[var(--foreground)]')}>
        {value}
      </span>
    </div>
  );
}
