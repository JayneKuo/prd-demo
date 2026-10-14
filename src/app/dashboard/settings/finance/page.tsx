'use client';

import { useState, useMemo } from 'react';
import React from 'react';
import { Plus, Pencil, Trash2, X, Search, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

type AccountType = '收入' | '成本' | '运营费用' | '资产' | '负债';
type AccountStatus = '启用' | '停用';

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: AccountType;
  description: string;
  apCategory?: string;
  isSystem: boolean;
  status: AccountStatus;
};

type FormData = {
  code: string;
  name: string;
  nameEn: string;
  type: AccountType;
  description: string;
  apCategory: string;
  status: AccountStatus;
};

const EMPTY_FORM: FormData = {
  code: '', name: '', nameEn: '', type: '运营费用',
  description: '', apCategory: '', status: '启用',
};

// ─── 默认科目表 ───────────────────────────────────────────────────────────────

const DEFAULT_ACCOUNTS: ChartAccount[] = [
  { id: 'acc_4000', code: '4000', name: '渠道销售收入',        nameEn: 'Revenue',                        type: '收入',    description: '各渠道（Amazon/Shopify/TikTok 等）销售商品取得的收入',           isSystem: true,  status: '启用' },
  { id: 'acc_4100', code: '4100', name: '退款与折扣',          nameEn: 'Sales Returns & Allowances',     type: '收入',    description: '客户退款、促销折扣、礼品卡核销等收入抵减项',                      isSystem: true,  status: '启用' },
  { id: 'acc_5000', code: '5000', name: '商品成本 (COGS)',     nameEn: 'Cost of Goods Sold',             type: '成本',    description: '已售出商品的采购成本，按 FIFO/加权平均法计算',                    isSystem: true,  status: '启用' },
  { id: 'acc_6100', code: '6100', name: '仓储履约成本',        nameEn: 'Warehouse & Fulfillment',        type: '运营费用', description: '3PL 仓储月账单（ShipBob/XPO 等），包含存储、拣货、打包费用',    apCategory: '仓储费',    isSystem: true,  status: '启用' },
  { id: 'acc_6200', code: '6200', name: '运输成本',            nameEn: 'Freight & Carrier Cost',         type: '运营费用', description: '承运商运费账单（FedEx/UPS/DHL/Royal Mail 等）',               apCategory: '运输费',    isSystem: true,  status: '启用' },
  { id: 'acc_6300', code: '6300', name: '平台佣金 & 服务费',   nameEn: 'Marketplace & Platform Fees',    type: '运营费用', description: '平台订阅费（Amazon Pro/Shopify 月费等），结算扣减的佣金归 6310', apCategory: '平台费',    isSystem: true,  status: '启用' },
  { id: 'acc_6310', code: '6310', name: '平台引荐费/佣金',     nameEn: 'Platform Commission (Settled)',  type: '运营费用', description: '从渠道结算报告中扣减的佣金（Amazon Referral/TikTok Commission）', isSystem: true,  status: '启用' },
  { id: 'acc_6400', code: '6400', name: '支付处理费',          nameEn: 'Payment Processing',             type: '运营费用', description: 'Stripe/PayPal 独立月账单；结算内扣减的手续费归 6410',          apCategory: '支付手续费', isSystem: true, status: '启用' },
  { id: 'acc_6410', code: '6410', name: '支付手续费（结算扣）', nameEn: 'Transaction Fee (Settled)',     type: '运营费用', description: '从渠道结算报告中扣减的支付手续费（Stripe/PayPal）',             isSystem: true,  status: '启用' },
  { id: 'acc_6500', code: '6500', name: '广告及推广费用',      nameEn: 'Advertising & Promotions',      type: '运营费用', description: 'Google Ads、Meta Ads、Amazon Sponsored Ads 等广告账单',         apCategory: '其他',      isSystem: true,  status: '启用' },
  { id: 'acc_6600', code: '6600', name: '清关 / 关税',         nameEn: 'Customs & Duties',               type: '运营费用', description: '进口关税及清关代理费',                                           apCategory: '清关费',    isSystem: true,  status: '启用' },
  { id: 'acc_6700', code: '6700', name: '其他运营费用',        nameEn: 'Other Operating Expenses',      type: '运营费用', description: 'SaaS 订阅（Klaviyo/Shopify Apps）、杂项费用等',               apCategory: '其他',      isSystem: false, status: '启用' },
  { id: 'acc_1000', code: '1000', name: '现金及等价物',        nameEn: 'Cash & Cash Equivalents',        type: '资产',    description: '银行账户余额、线上支付平台余额（Stripe/PayPal 清算中余额）',      isSystem: true,  status: '启用' },
  { id: 'acc_1100', code: '1100', name: '应收账款',            nameEn: 'Accounts Receivable',            type: '资产',    description: '渠道待回款 + B2B 客户应收发票',                                  isSystem: true,  status: '启用' },
  { id: 'acc_1200', code: '1200', name: '库存资产',            nameEn: 'Inventory',                      type: '资产',    description: '在库商品的账面价值（按成本计量）',                               isSystem: true,  status: '启用' },
  { id: 'acc_2000', code: '2000', name: '应付账款',            nameEn: 'Accounts Payable',               type: '负债',    description: '待付供应商账单（3PL/承运商/平台订阅等）',                        isSystem: true,  status: '启用' },
  { id: 'acc_2100', code: '2100', name: '应付关税',            nameEn: 'Accrued Duties',                 type: '负债',    description: '已计提但尚未缴纳的关税',                                         isSystem: false, status: '启用' },
];

const ALL_TYPES: AccountType[] = ['收入', '成本', '运营费用', '资产', '负债'];
const AP_CATEGORIES = ['仓储费', '运输费', '平台费', '支付手续费', '清关费', '其他', ''];

const typeConfig: Record<AccountType, { cls: string; dot: string }> = {
  '收入':    { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  '成本':    { cls: 'bg-red-50 text-red-700 ring-red-200',             dot: 'bg-red-500' },
  '运营费用': { cls: 'bg-orange-50 text-orange-700 ring-orange-200',   dot: 'bg-orange-400' },
  '资产':    { cls: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500' },
  '负债':    { cls: 'bg-purple-50 text-purple-700 ring-purple-200',    dot: 'bg-purple-500' },
};

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function FinanceSettingsPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>(DEFAULT_ACCOUNTS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChartAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChartAccount | null>(null);

  const filtered = useMemo(() => accounts.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (q && !a.code.includes(q) && !a.name.toLowerCase().includes(q) && !a.nameEn.toLowerCase().includes(q)) return false;
    return true;
  }), [accounts, search, typeFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<AccountType, ChartAccount[]>();
    ALL_TYPES.forEach(t => map.set(t, []));
    filtered.forEach(a => map.get(a.type)?.push(a));
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total:  accounts.length,
    active: accounts.filter(a => a.status === '启用').length,
    custom: accounts.filter(a => !a.isSystem).length,
  }), [accounts]);

  function handleSave(form: FormData, id?: string) {
    if (id) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...form } : a));
    } else {
      const newAcc: ChartAccount = { id: `acc_custom_${Date.now()}`, ...form, isSystem: false };
      setAccounts(prev => [...prev, newAcc].sort((a, b) => a.code.localeCompare(b.code)));
    }
    setDrawerOpen(false);
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setDeleteTarget(null);
  }

  function handleToggleStatus(id: string) {
    setAccounts(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === '启用' ? '停用' : '启用' } : a,
    ));
  }

  return (
    <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6">

      {/* 面包屑 */}
      <nav className="mb-4 flex items-center gap-2 text-[12px] text-[var(--muted)]">
        <Link href="/dashboard/finance" className="hover:text-[var(--primary)] hover:underline">财务概览</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">费用科目管理</span>
      </nav>

      {/* 页头 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">费用科目管理</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            Chart of Accounts — 定义费用分类与 GL 科目编号，用于应付账款录入和财务报表
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
          <Plus className="size-3.5" />新增科目
        </button>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] text-[var(--muted)]">科目总数</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-[var(--foreground)]">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] text-[var(--muted)]">已启用</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-emerald-700">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] text-[var(--muted)]">自定义科目</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-[var(--foreground)]">{stats.custom}</div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 max-w-xs items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 shadow-sm">
          <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="科目编号 / 名称…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground)]" />
          {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AccountType | 'all')}
          className={cn('h-8 rounded-lg border px-2.5 text-[12px] outline-none',
            typeFilter !== 'all' ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')}>
          <option value="all">全部类型</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AccountStatus | 'all')}
          className={cn('h-8 rounded-lg border px-2.5 text-[12px] outline-none',
            statusFilter !== 'all' ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')}>
          <option value="all">全部状态</option>
          <option value="启用">启用</option>
          <option value="停用">停用</option>
        </select>
        <span className="ml-auto text-[12px] text-[var(--muted)]">{filtered.length} 个科目</span>
      </div>

      {/* 科目表 */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="whitespace-nowrap px-5 py-2.5">科目编号</th>
                <th className="whitespace-nowrap px-3 py-2.5">科目名称</th>
                <th className="whitespace-nowrap px-3 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">AP 费用类型映射</th>
                <th className="whitespace-nowrap px-3 py-2.5">描述</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {ALL_TYPES.map(type => {
                const typeRows = grouped.get(type) ?? [];
                if (typeRows.length === 0) return null;
                return (
                  <React.Fragment key={type}>
                    <tr className="bg-[var(--surface-subtle)]">
                      <td colSpan={7} className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', typeConfig[type].cls)}>
                            <span className={cn('size-1.5 rounded-full', typeConfig[type].dot)} />{type}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">{typeRows.length} 个科目</span>
                        </div>
                      </td>
                    </tr>
                    {typeRows.map(acc => (
                      <AccountRow key={acc.id} account={acc}
                        onEdit={() => { setEditTarget(acc); setDrawerOpen(true); }}
                        onToggle={() => handleToggleStatus(acc.id)}
                        onDelete={() => setDeleteTarget(acc)}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[var(--muted)]">暂无科目记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明 */}
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-[12px] text-blue-700">
        <p className="font-semibold mb-1">💡 科目与应付账款的关联</p>
        <p>在"应付账款"录入账单时，费用类型（仓储费/运输费/平台费等）会自动映射到对应的 GL 科目编号，用于财务报表的费用归集和 ERP 同步。</p>
        <p className="mt-1">系统内置科目（🔒 标记）仅可编辑描述，不可删除。</p>
      </div>

      {/* 新增/编辑抽屉 */}
      <AccountDrawer open={drawerOpen} target={editTarget}
        onClose={() => { setDrawerOpen(false); setEditTarget(null); }}
        onSave={handleSave}
      />

      {/* 删除确认 */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="px-6 py-5">
              <h2 className="text-[15px] font-bold text-[var(--foreground)]">确认删除科目</h2>
              <p className="mt-2 text-[13px] text-[var(--muted)]">
                删除科目 <span className="font-semibold text-[var(--foreground)]">{deleteTarget.code} · {deleteTarget.name}</span> 后无法恢复。
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button onClick={() => setDeleteTarget(null)} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
              <button onClick={() => handleDelete(deleteTarget.id)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[13px] font-semibold text-white hover:opacity-90">
                确认删除
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 科目表格行 ───────────────────────────────────────────────────────────────

function AccountRow({ account, onEdit, onToggle, onDelete }: {
  account: ChartAccount; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const tc = typeConfig[account.type];
  return (
    <tr className={cn('transition-colors hover:bg-[var(--surface-subtle)]', account.status === '停用' && 'opacity-50')}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[13px] font-bold text-[var(--foreground)]">{account.code}</span>
          {account.isSystem && <span className="text-[10px] text-[var(--muted)]" title="系统内置">🔒</span>}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-[13px] font-semibold text-[var(--foreground)]">{account.name}</div>
        <div className="text-[11px] text-[var(--muted)]">{account.nameEn}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', tc.cls)}>
          <span className={cn('size-1.5 rounded-full', tc.dot)} />{account.type}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        {account.apCategory
          ? <span className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-[var(--border)]">{account.apCategory}</span>
          : <span className="text-[11px] text-[var(--muted)]">—</span>}
      </td>
      <td className="max-w-[280px] px-3 py-3">
        <p className="truncate text-[12px] text-[var(--muted)]" title={account.description}>{account.description}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
          account.status === '启用' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-[var(--surface-subtle)] text-[var(--muted)] ring-[var(--border)]')}>
          <span className={cn('size-1.5 rounded-full', account.status === '启用' ? 'bg-emerald-500' : 'bg-[var(--muted)]')} />
          {account.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onToggle} className="flex h-6 items-center rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-subtle)]">
            {account.status === '启用' ? '停用' : '启用'}
          </button>
          <button onClick={onEdit} className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)]">
            <Pencil className="size-3" />
          </button>
          {!account.isSystem && (
            <button onClick={onDelete} className="flex h-6 w-6 items-center justify-center rounded-md border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── 新增/编辑科目抽屉 ────────────────────────────────────────────────────────

function AccountDrawer({ open, target, onClose, onSave }: {
  open: boolean; target: ChartAccount | null;
  onClose: () => void; onSave: (form: FormData, id?: string) => void;
}) {
  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] transition-colors placeholder:text-[var(--muted-foreground)]';
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  React.useEffect(() => {
    if (target) {
      setForm({ code: target.code, name: target.name, nameEn: target.nameEn, type: target.type, description: target.description, apCategory: target.apCategory ?? '', status: target.status });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [target]);

  function set(k: keyof FormData, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const isValid = form.code.trim() && form.name.trim();
  const isEditing = !!target;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[480px] max-w-full flex-col overflow-hidden bg-[var(--surface)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--foreground)]">{isEditing ? '编辑科目' : '新增科目'}</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{isEditing ? `${target.code} · ${target.name}` : '在科目表中添加新的 GL 科目'}</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {target?.isSystem && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-[12px] text-amber-700 ring-1 ring-inset ring-amber-200">
              🔒 系统内置科目：科目编号和类型不可修改，可编辑名称和描述。
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">科目编号 *</label>
              <input value={form.code} onChange={e => set('code', e.target.value)}
                disabled={target?.isSystem} placeholder="如 6800"
                className={cn(inputCls, 'font-mono', target?.isSystem && 'cursor-not-allowed opacity-60')} />
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">建议 4 位数字，按类型区间</p>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">科目类型 *</label>
              <select value={form.type} onChange={e => set('type', e.target.value as AccountType)}
                disabled={target?.isSystem}
                className={cn(inputCls, target?.isSystem && 'cursor-not-allowed opacity-60')}>
                {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">科目名称（中文）*</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 研发费用" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">科目名称（英文）</label>
            <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)} placeholder="如 R&D Expenses" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">描述</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="说明该科目的适用场景、计入规则等"
              rows={3} className={cn(inputCls, 'resize-none')} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">关联应付账款费用类型</label>
            <select value={form.apCategory} onChange={e => set('apCategory', e.target.value)} className={inputCls}>
              <option value="">— 不关联 —</option>
              {AP_CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">录入应付账单时，选择此费用类型将自动对应到本科目</p>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">状态</label>
            <div className="flex gap-3">
              {(['启用', '停用'] as const).map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={form.status === s} onChange={() => set('status', s)} className="accent-[var(--primary)]" />
                  <span className="text-[13px]">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose} className="flex h-8 items-center rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
          <button disabled={!isValid} onClick={() => isValid && onSave(form, target?.id)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
            <CheckCircle2 className="size-3.5" />
            {isEditing ? '保存修改' : '创建科目'}
          </button>
        </div>
      </div>
    </>
  );
}
