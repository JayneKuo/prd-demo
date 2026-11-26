'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useEffect, useState } from 'react';
import { ArrowLeft, Check, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentSession } from '@/lib/session-context';
import {
  qcTypeLabels, qcPriorityConfig, checklistTemplates, qcStaffList,
  checklistCategoryLabels, returnOrders,
  type QCType, type QCPriority, type ChecklistItem, type ChecklistCategory,
} from '@/lib/mock-data/return-orders';

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
  'transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');
const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]';

// ─── 仓库选项 ─────────────────────────────────────────────────────────────────

const warehouseOptions = [
  { code: 'US-West-SEA', name: 'US West Seattle', zones: ['退货质检区-A', '退货质检区-B（大件）', '采购入库质检区', '日常抽检区'] },
  { code: 'US-East-EWR', name: 'US East Newark',  zones: ['退货质检区-A', '采购入库质检区'] },
  { code: 'US-Central-DFW', name: 'US Central Dallas', zones: ['退货质检区-A'] },
  { code: 'UK-London',   name: 'UK London',        zones: ['退货质检区-A', '采购入库质检区'] },
  { code: 'SG-Central',  name: 'SG Singapore',     zones: ['退货质检区-A'] },
  { code: 'DE-Frankfurt', name: 'DE Frankfurt',    zones: ['退货质检区-A'] },
];

const tempStorageSuggestions = ['TMP-A-01', 'TMP-A-02', 'TMP-A-03', 'TMP-B-01', 'TMP-B-05', 'HOLD-01', 'HOLD-02'];

// ─── 商品选择弹窗 ─────────────────────────────────────────────────────────────

type PickableItem = {
  lineItemId: string;
  sku: string;
  title: string;
  variantTitle: string;
  orderedQty: number;
};

function ItemPickerModal({
  open, items, existingSkus, onClose, onConfirm,
}: {
  open: boolean;
  items: PickableItem[];
  existingSkus: string[];
  onClose: () => void;
  onConfirm: (selected: PickableItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(new Set()); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.sku.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
  }, [query, items]);

  const isAdded = (sku: string) => existingSkus.includes(sku);
  const toggle = (id: string, sku: string) => {
    if (isAdded(sku)) return;
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const available = filtered.filter((i) => !isAdded(i.sku));
  const allChecked = available.length > 0 && available.every((i) => selected.has(i.lineItemId));
  const toggleAll = () => allChecked
    ? setSelected((prev) => { const n = new Set(prev); available.forEach((i) => n.delete(i.lineItemId)); return n; })
    : setSelected((prev) => { const n = new Set(prev); available.forEach((i) => n.add(i.lineItemId)); return n; });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="mx-4 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: 'min(80vh, 600px)' }} onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold">选择待检商品</h3>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>

        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 SKU 或商品名称…" className={cn(inputCls, 'pl-9')} />
            {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><X className="size-3.5" /></button>}
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-3.5 accent-[var(--primary)]" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">商品</span>
          <span className="w-20 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">数量</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0
            ? <div className="flex flex-col items-center justify-center gap-2 py-14"><Package className="size-8 text-[var(--border)]" /><p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p></div>
            : <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((item) => {
                  const added   = isAdded(item.sku);
                  const checked = selected.has(item.lineItemId);
                  return (
                    <label key={item.lineItemId}
                      className={cn('flex cursor-pointer items-center gap-3 px-5 py-3 select-none transition-colors',
                        added ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--surface-subtle)]',
                        checked && !added && 'bg-[var(--primary-soft)]')}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(item.lineItemId, item.sku)}
                        disabled={added} className="size-3.5 accent-[var(--primary)]" />
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]">
                        <Package className="size-4 text-[var(--muted-foreground)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</span>
                          {item.variantTitle && <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">{item.variantTitle}</span>}
                          {added && <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{item.sku}</p>
                      </div>
                      <span className="w-20 text-right text-[13px] font-medium text-[var(--foreground)]">× {item.orderedQty}</span>
                    </label>
                  );
                })}
              </div>}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">{selected.size > 0 ? `已选 ${selected.size} 件` : `共 ${filtered.length} 件`}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            <button onClick={() => { onConfirm(items.filter((i) => selected.has(i.lineItemId))); onClose(); }} disabled={selected.size === 0}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
              添加{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 类型 ────────────────────────────────────────────────────────────────────

type QCItem = {
  _key: string;
  lineItemId: string;
  sku: string;
  title: string;
  variantTitle: string;
  expectedQty: number;
};

type EditableChecklistItem = Omit<ChecklistItem, 'result' | 'note'>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewQCPage() {
  const router = useRouter();

  // ── 基本信息 ──
  const [qcType, setQcType]     = useState<QCType>('rma');
  const [sourceType, setSourceType] = useState<'rma' | 'purchase_order' | 'inbound_order' | 'ticket'>('rma');
  const [sourceNo, setSourceNo] = useState('');

  // ── 仓库 ──
  const [warehouseCode, setWarehouseCode] = useState('US-West-SEA');
  const [qcZone, setQcZone]     = useState('退货质检区-A');
  const [tempStorage, setTempStorage] = useState('');

  // ── 任务 ──
  const [assignedTo, setAssignedTo]     = useState(currentSession.name);
  const [reviewer, setReviewer]         = useState('');
  const [priority, setPriority]         = useState<QCPriority>('normal');
  const [deadline, setDeadline]         = useState('');
  const [instructions, setInstructions] = useState('');

  // ── 检验标准 ──
  const [selectedTemplateId, setSelectedTemplateId] = useState('rma_standard');
  const [checklistItems, setChecklistItems]           = useState<EditableChecklistItem[]>(() => {
    const tmpl = checklistTemplates.find((t) => t.id === 'rma_standard')!;
    return tmpl.items.map((item, i) => ({ ...item, id: `cl_new_${i}` }));
  });
  const [showAddCustomCheck, setShowAddCustomCheck] = useState(false);
  const [newCheckCat, setNewCheckCat]   = useState<ChecklistCategory>('visual');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newCheckReq, setNewCheckReq]   = useState('');

  // ── 商品行 ──
  const [items, setItems]           = useState<QCItem[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // 从来源单据获取可选商品行
  const sourceRMAOrder = useMemo(() => {
    if (sourceType !== 'rma' || !sourceNo.trim()) return null;
    // 尝试按单号匹配
    return returnOrders.find((r) =>
      r.returnNo.toLowerCase() === sourceNo.toLowerCase() ||
      r.id.toLowerCase() === sourceNo.toLowerCase()
    ) ?? null;
  }, [sourceType, sourceNo]);

  const pickableItems: PickableItem[] = sourceRMAOrder
    ? sourceRMAOrder.lineItems.map((li) => ({
        lineItemId: li.lineItemId, sku: li.sku, title: li.title,
        variantTitle: li.variantTitle, orderedQty: li.quantity,
      }))
    : [];

  const selectedWarehouse = warehouseOptions.find((w) => w.code === warehouseCode);
  const allInspectors     = qcStaffList.map((s) => s.name);
  const allReviewers      = qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => s.name);

  // 切换模板时更新检查清单
  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = checklistTemplates.find((t) => t.id === templateId);
    if (tmpl) setChecklistItems(tmpl.items.map((item, i) => ({ ...item, id: `cl_new_${i}` })));
  };

  const handlePickerConfirm = (selected: PickableItem[]) => {
    const existing = new Set(items.map((i) => i.sku));
    const toAdd: QCItem[] = selected
      .filter((s) => !existing.has(s.sku))
      .map((s) => ({ _key: `${s.lineItemId}_${Date.now()}`, lineItemId: s.lineItemId, sku: s.sku, title: s.title, variantTitle: s.variantTitle, expectedQty: s.orderedQty }));
    setItems((prev) => [...prev, ...toAdd]);
  };

  const isValid = !!sourceNo.trim() && items.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); router.push('/dashboard/qc'); }, 1000);
  };

  const sourceTypeLabels: Record<typeof sourceType, string> = {
    rma: '售后申请 (RMA)', purchase_order: '采购单', inbound_order: '入库单', ticket: '客诉工单',
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[960px] pt-5 lg:pt-6">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/qc" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />质检单列表
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-[13px] font-semibold">新建质检单</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/qc" className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</Link>
          <button type="submit" disabled={!isValid || submitting}
            className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50">
            {submitting ? '创建中…' : '创建质检单'}
          </button>
        </div>
      </div>

      {/* ── 基本信息 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">基本信息</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              质检类型 <span className="text-[var(--danger)]">*</span>
            </label>
            <select value={qcType} onChange={(e) => setQcType(e.target.value as QCType)} className={inputCls}>
              {(Object.entries(qcTypeLabels) as [QCType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">来源单据类型</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value as typeof sourceType)} className={inputCls}>
              {(Object.entries(sourceTypeLabels) as [typeof sourceType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              来源单据号 <span className="text-[var(--danger)]">*</span>
            </label>
            {/* datalist: 可从已有售后单选，也可手填 */}
            <input
              list="source-docs-list"
              value={sourceNo} onChange={(e) => setSourceNo(e.target.value)}
              placeholder={`输入${sourceTypeLabels[sourceType]}单号，如 RET-20260604-0001`}
              className={inputCls} required
            />
            <datalist id="source-docs-list">
              {sourceType === 'rma' && returnOrders.map((r) => (
                <option key={r.id} value={r.returnNo}>{r.returnNo} · {r.customerName} · {r.channel}</option>
              ))}
            </datalist>
            {sourceRMAOrder && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--muted)]">
                <span>客户：<strong className="text-[var(--foreground)]">{sourceRMAOrder.customerName}</strong></span>
                <span>渠道：<strong className="text-[var(--foreground)]">{sourceRMAOrder.channel}</strong></span>
                <span>状态：<strong className="text-[var(--foreground)]">{sourceRMAOrder.status}</strong></span>
                <span>商品：<strong className="text-[var(--foreground)]">{sourceRMAOrder.lineItems.length} 种</strong></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 仓库信息 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">仓库 & 存放信息</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">仓库</label>
            <select value={warehouseCode} onChange={(e) => { setWarehouseCode(e.target.value); setQcZone(warehouseOptions.find((w) => w.code === e.target.value)?.zones[0] ?? ''); }} className={inputCls}>
              {warehouseOptions.map((w) => <option key={w.code} value={w.code}>{w.name} ({w.code})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">质检区域</label>
            {/* datalist: 可选预设，也可自填 */}
            <input list="qc-zones-list" value={qcZone} onChange={(e) => setQcZone(e.target.value)}
              placeholder="选择或输入质检区域" className={inputCls} />
            <datalist id="qc-zones-list">
              {selectedWarehouse?.zones.map((z) => <option key={z} value={z} />)}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">临时存放库位</label>
            <input list="temp-storage-list" value={tempStorage} onChange={(e) => setTempStorage(e.target.value)}
              placeholder="如 TMP-A-05" className={inputCls} />
            <datalist id="temp-storage-list">
              {tempStorageSuggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>
      </section>

      {/* ── 任务分配 ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">任务分配</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              质检员 <span className="text-[var(--danger)]">*</span>
            </label>
            {/* datalist: 可从实际人员中选，也可手填 */}
            <input list="inspectors-list" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="选择或输入质检员" className={inputCls} required />
            <datalist id="inspectors-list">
              {qcStaffList.map((s) => (
                <option key={s.id} value={s.name}>{s.name} — {s.role === 'inspector' ? '质检员' : s.role === 'supervisor' ? '主管' : '经理'}{s.warehouseCodes ? ` (${s.warehouseCodes.join('/')})` : ''}</option>
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-[var(--muted)]">默认当前用户</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">复核人（选填）</label>
            <input list="reviewers-list" value={reviewer} onChange={(e) => setReviewer(e.target.value)}
              placeholder="选择或输入复核人" className={inputCls} />
            <datalist id="reviewers-list">
              {allReviewers.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">优先级</label>
            <div className="flex gap-2">
              {(['urgent', 'normal', 'low'] as QCPriority[]).map((p) => {
                const cfg = qcPriorityConfig[p];
                return (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={cn('flex-1 h-9 rounded-lg border text-[12px] font-medium transition-colors ring-1 ring-inset',
                      priority === p ? cfg.cls : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] ring-transparent hover:bg-[var(--surface-subtle)]')}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">截止时间（选填）</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">质检注意事项（选填）</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
              placeholder="特殊检验要求、注意事项…" className={cn(inputCls, 'resize-none')} />
          </div>
        </div>
      </section>

      {/* ── 检验标准（模板选择 + 可编辑明细） ── */}
      <section className={cn(cardCls, 'mb-4')}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">检验标准</h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">选择标准模板后可增删自定义检查项</p>
        </div>
        <div className="p-5">
          {/* 模板选择 */}
          <div className="mb-5">
            <label className="mb-2 block text-[12px] font-semibold text-[var(--foreground)]">检验模板</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {checklistTemplates.map((tmpl) => (
                <button key={tmpl.id} type="button" onClick={() => applyTemplate(tmpl.id)}
                  className={cn('rounded-xl border p-3 text-left transition-colors',
                    selectedTemplateId === tmpl.id
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]')}>
                  <div className={cn('text-[13px] font-semibold', selectedTemplateId === tmpl.id ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                    {tmpl.name}
                  </div>
                  {tmpl.description && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{tmpl.description}</div>}
                  <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">{tmpl.items.length} 个检查项</div>
                  {selectedTemplateId === tmpl.id && <Check className="mt-1 size-3.5 text-[var(--primary)]" />}
                </button>
              ))}
            </div>
          </div>

          {/* 检查项明细（可编辑） */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--foreground)]">检查项（{checklistItems.length} 项）</span>
              <button type="button" onClick={() => setShowAddCustomCheck(true)}
                className="flex h-6 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                <Plus className="size-3" />自定义
              </button>
            </div>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              {checklistItems.map((item, idx) => (
                <div key={item.id} className={cn('flex items-start gap-3 px-4 py-2.5', idx < checklistItems.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                  <span className={cn('mt-0.5 inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                    item.category === 'visual' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                    item.category === 'functional' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                    item.category === 'label' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                    item.category === 'accessory' ? 'bg-green-50 text-green-700 ring-green-200' :
                    item.category === 'dimension' ? 'bg-cyan-50 text-cyan-700 ring-cyan-200' :
                    'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]')}>
                    {checklistCategoryLabels[item.category]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--foreground)]">{item.item}</div>
                    {item.requirement && <div className="text-[11px] text-[var(--muted)]">标准：{item.requirement}</div>}
                  </div>
                  {item.category === 'custom' && (
                    <button type="button" onClick={() => setChecklistItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="shrink-0 text-[var(--muted)] hover:text-[var(--danger)]">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 自定义检查项弹窗 */}
          {showAddCustomCheck && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddCustomCheck(false)}>
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-[16px] font-semibold">添加自定义检查项</h3>
                  <button onClick={() => setShowAddCustomCheck(false)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium">分类</label>
                    <select value={newCheckCat} onChange={(e) => setNewCheckCat(e.target.value as ChecklistCategory)} className={cn(inputCls, 'h-9 py-0')}>
                      {(Object.entries(checklistCategoryLabels) as [ChecklistCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium">检查项 <span className="text-[var(--danger)]">*</span></label>
                    <input value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)} placeholder="如：防水测试" className={inputCls} autoFocus />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium">检验标准（选填）</label>
                    <input value={newCheckReq} onChange={(e) => setNewCheckReq(e.target.value)} placeholder="如：IPX7 防水，1m 水下 30 分钟无进水" className={inputCls} />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddCustomCheck(false)}
                    className="h-9 rounded-xl border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
                  <button type="button" disabled={!newCheckItem.trim()}
                    onClick={() => {
                      setChecklistItems((prev) => [...prev, { id: `cl_custom_${Date.now()}`, category: 'custom', item: newCheckItem.trim(), requirement: newCheckReq || undefined }]);
                      setShowAddCustomCheck(false); setNewCheckItem(''); setNewCheckReq('');
                    }}
                    className="h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 待检商品 ── */}
      <section className={cn(cardCls, 'mb-6')}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold">待检商品</h2>
            {items.length > 0 && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{items.length} 种商品</p>}
          </div>
          <button type="button"
            onClick={() => {
              if (sourceType === 'rma' && !sourceRMAOrder) { alert('请先填写并匹配来源售后单号，才可从中选取商品'); return; }
              setShowItemPicker(true);
            }}
            className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors',
              (sourceType !== 'rma' || sourceRMAOrder)
                ? 'bg-[var(--primary)] text-white hover:opacity-90'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed')}>
            <Plus className="size-3.5" />添加商品
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
              <Package className="size-5 text-[var(--muted)]" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-[var(--foreground)]">尚未添加待检商品</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {sourceType === 'rma' && !sourceRMAOrder ? '请先填写来源售后单号' : '点击「添加商品」从来源单据中选取'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-2.5 text-left">商品 / SKU</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">应收数量</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {items.map((item) => (
                  <tr key={item._key} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {item.variantTitle && <span>{item.variantTitle} · </span>}
                        <span className="font-mono">{item.sku}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setItems((prev) => prev.map((i) => i._key === item._key ? { ...i, expectedQty: Math.max(1, i.expectedQty - 1) } : i))}
                          className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">−</button>
                        <input type="number" min={1} value={item.expectedQty}
                          onChange={(e) => setItems((prev) => prev.map((i) => i._key === item._key ? { ...i, expectedQty: Math.max(1, Number(e.target.value)) } : i))}
                          className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-center text-[13px] focus:border-[var(--primary)] focus:outline-none" />
                        <button type="button" onClick={() => setItems((prev) => prev.map((i) => i._key === item._key ? { ...i, expectedQty: i.expectedQty + 1 } : i))}
                          className="flex size-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">+</button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => setItems((prev) => prev.filter((i) => i._key !== item._key))}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 底部操作 */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)]">
        <div className="text-[12px] text-[var(--muted)]">
          {!isValid
            ? (!sourceNo.trim() ? '请填写来源单据号' : '请至少添加一件待检商品')
            : <span className="text-[var(--success)]">✓ 信息已完整，可创建质检单</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/qc" className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-5 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</Link>
          <button type="submit" disabled={!isValid || submitting}
            className="h-9 rounded-lg bg-[var(--primary)] px-6 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50">
            {submitting ? '创建中…' : '创建质检单'}
          </button>
        </div>
      </div>

      {/* 商品选择弹窗 */}
      <ItemPickerModal
        open={showItemPicker}
        items={pickableItems}
        existingSkus={items.map((i) => i.sku)}
        onClose={() => setShowItemPicker(false)}
        onConfirm={handlePickerConfirm}
      />
    </form>
  );
}
