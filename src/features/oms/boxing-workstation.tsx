'use client';
/**
 * 装箱工作台（Packing Workstation）
 *
 * 两种使用场景：
 *  A. 先装箱再分仓（box_first）：按「包装组」装箱
 *     - 包装组由亚马逊返回，约束哪些 SKU 可以装在一起
 *     - 在 `packing` 状态下使用，此时尚无 Allocation
 *     - 完成所有组装箱后，提交给亚马逊获取分仓方案
 *
 *  B. 先分仓再装箱（placement_first） 或 WMS/3PL 场景：按「货件/Allocation」装箱
 *     - 每票货件独立装箱
 *     - 在已有 Allocation 时使用
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Package, Box } from 'lucide-react';
// Note: Plus, Trash2, ChevronDown, ChevronUp, Box retained for BoxEditor (allocation-based boxing)
import { cn } from '@/lib/utils';
import type {
  InboundPlan, PlatformAllocation, PackingBox, ReplenishmentLine,
  FbaPackingGroup,
} from './replenishment';
import type { OmsSnapshot } from './types';
import { useOms } from './provider';

const input = 'h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]';

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

function totalQtyInBoxes(boxes: PackingBox[]): Record<string, number> {
  const totals: Record<string, number> = {};
  boxes.forEach(b => b.lines.forEach(bl => { totals[bl.lineId] = (totals[bl.lineId] ?? 0) + bl.quantity; }));
  return totals;
}
function newBoxId(): string { return `box:new:${Date.now()}-${Math.floor(Math.random() * 1000)}`; }

// ─── 通用箱子编辑器 ───────────────────────────────────────────────────────────

interface BoxEditorProps {
  targetLines: { lineId: string; quantity: number }[];
  planLines: ReplenishmentLine[];
  boxes: PackingBox[];
  setBoxes: React.Dispatch<React.SetStateAction<PackingBox[]>>;
  targetLabel: string;
}

function BoxEditor({ targetLines, planLines, boxes, setBoxes, targetLabel }: BoxEditorProps) {
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const packedTotals = useMemo(() => totalQtyInBoxes(boxes), [boxes]);
  const totalRequired = targetLines.reduce((s, l) => s + l.quantity, 0);
  const totalPacked = Object.values(packedTotals).reduce((s, v) => s + v, 0);
  const allPacked = totalPacked === totalRequired && targetLines.every(ql => (packedTotals[ql.lineId] ?? 0) === ql.quantity);

  const addBox = () => {
    const id = newBoxId();
    setBoxes(prev => [...prev, { id, boxNumber: `BOX-${String(prev.length + 1).padStart(3, '0')}`, lines: [] }]);
    setSelectedBoxId(id);
  };

  const copyBox = (box: PackingBox) => {
    const id = newBoxId();
    setBoxes(prev => [...prev, { ...structuredClone(box), id, boxNumber: `BOX-${String(prev.length + 1).padStart(3, '0')}` }]);
    setSelectedBoxId(id);
  };

  const removeBox = (boxId: string) => {
    setBoxes(prev => prev.filter(b => b.id !== boxId));
    if (selectedBoxId === boxId) setSelectedBoxId(null);
  };

  const updateBox = (boxId: string, patch: Partial<PackingBox>) =>
    setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, ...patch } : b));

  const setBoxLineQty = (boxId: string, lineId: string, qty: number) => {
    setBoxes(prev => prev.map(b => {
      if (b.id !== boxId) return b;
      if (qty <= 0) return { ...b, lines: b.lines.filter(bl => bl.lineId !== lineId) };
      const existing = b.lines.find(bl => bl.lineId === lineId);
      if (existing) return { ...b, lines: b.lines.map(bl => bl.lineId === lineId ? { ...bl, quantity: qty } : bl) };
      return { ...b, lines: [...b.lines, { lineId, quantity: qty }] };
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden border-t border-[var(--border-subtle)]">
      {/* 左侧：商品余量 */}
      <div className="flex w-52 shrink-0 flex-col border-r border-[var(--border)]">
        <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">
          {targetLabel}
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {targetLines.map(ql => {
            const line = planLines.find(l => l.id === ql.lineId);
            const packed = packedTotals[ql.lineId] ?? 0;
            const isOk = packed === ql.quantity;
            const isOver = packed > ql.quantity;
            return (
              <div key={ql.lineId} className={cn('rounded-lg p-2.5 text-[11px]',
                isOver ? 'border border-red-200 bg-red-50' : isOk ? 'border border-emerald-200 bg-emerald-50' : 'border border-[var(--border-subtle)] bg-[var(--surface-subtle)]'
              )}>
                <div className="font-medium truncate">{line?.sku ?? ql.lineId}</div>
                <div className="mt-0.5 text-[10px] text-[var(--muted)] truncate">{line?.channelSku || line?.msku || '—'}</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className={cn('font-semibold tabular-nums', isOver ? 'text-red-600' : isOk ? 'text-emerald-600' : 'text-[var(--muted)]')}>
                    {packed} / {ql.quantity}
                  </span>
                  {isOk && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                  {isOver && <AlertTriangle className="size-3.5 text-red-500" />}
                </div>
              </div>
            );
          })}
        </div>
        {/* 合计 */}
        <div className={cn('border-t border-[var(--border-subtle)] px-3 py-2.5 text-[11px]', allPacked ? 'bg-emerald-50' : 'bg-[var(--surface-subtle)]')}>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">总计</span>
            <span className={cn('font-semibold tabular-nums', allPacked ? 'text-emerald-600' : '')}>{totalPacked} / {totalRequired}</span>
          </div>
          {allPacked && <p className="mt-1 text-[10px] text-emerald-600">✓ 装箱完成</p>}
        </div>
      </div>

      {/* 右侧：箱子列表 */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">箱明细（{boxes.length} 箱）</span>
          <button onClick={addBox} className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[11px] font-semibold text-white hover:opacity-90">
            <Plus className="size-3.5" />添加箱子
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {boxes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="size-8 text-[var(--border)]" />
              <p className="mt-2 text-[12px] text-[var(--muted)]">点击「添加箱子」开始装箱</p>
            </div>
          )}
          {boxes.map((box, idx) => {
            const isSelected = selectedBoxId === box.id;
            const boxTotal = box.lines.reduce((s, bl) => s + bl.quantity, 0);
            return (
              <div key={box.id} className={cn('overflow-hidden rounded-xl border-2 transition-colors', isSelected ? 'border-[var(--primary)]' : 'border-[var(--border)]')} onClick={() => setSelectedBoxId(isSelected ? null : box.id)}>
                {/* 箱头 */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <span className="text-[11px] text-[var(--muted)]">#{idx + 1}</span>
                  <input value={box.boxNumber} onChange={e => { e.stopPropagation(); updateBox(box.id, { boxNumber: e.target.value }); }} onClick={e => e.stopPropagation()} className="h-7 w-32 rounded-md border border-[var(--border)] px-2 text-[12px] font-medium" />
                  <span className="text-[11px] text-[var(--muted)]">{boxTotal} 件 · {box.lines.length} 种 SKU</span>
                  <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => copyBox(box)}>复制</button>
                    <button className="text-[11px] text-red-500" onClick={() => removeBox(box.id)}><Trash2 className="size-3.5" /></button>
                    {isSelected ? <ChevronUp className="size-4 text-[var(--muted)]" /> : <ChevronDown className="size-4 text-[var(--muted)]" />}
                  </div>
                </div>

                {/* 展开：尺寸 + 商品行 */}
                {isSelected && (
                  <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-4 gap-2">
                      {[{ key: 'length', label: '长(cm)' }, { key: 'width', label: '宽(cm)' }, { key: 'height', label: '高(cm)' }, { key: 'weight', label: '重量(kg)' }].map(({ key, label }) => (
                        <label key={key}>
                          <span className="text-[11px] text-[var(--muted)]">{label}</span>
                          <input type="number" min={0} step="0.1" className={`${input} mt-0.5 w-full`}
                            value={key === 'weight' ? (box.weight ?? '') : (box.dimensions?.[key as 'length' | 'width' | 'height'] ?? '')}
                            onChange={e => {
                              const v = Number(e.target.value);
                              if (key === 'weight') updateBox(box.id, { weight: v || undefined });
                              else { const dim = { ...(box.dimensions ?? { length: 0, width: 0, height: 0, unit: 'cm' as const }) }; (dim as Record<string, unknown>)[key] = v; updateBox(box.id, { dimensions: dim }); }
                            }} placeholder="0" />
                        </label>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-[var(--muted)]">箱内商品</p>
                      {targetLines.map(ql => {
                        const line = planLines.find(l => l.id === ql.lineId);
                        const qtyInBox = box.lines.find(bl => bl.lineId === ql.lineId)?.quantity ?? 0;
                        const otherBoxPacked = (packedTotals[ql.lineId] ?? 0) - qtyInBox;
                        const maxQty = ql.quantity - otherBoxPacked;
                        return (
                          <div key={ql.lineId} className="flex items-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{line?.sku ?? ql.lineId}</div>
                              <div className="text-[10px] text-[var(--muted)]">可装 {maxQty} 件</div>
                            </div>
                            <input type="number" min={0} max={maxQty} value={qtyInBox || ''} onChange={e => setBoxLineQty(box.id, ql.lineId, Math.min(Number(e.target.value), maxQty))}
                              placeholder="0" className={cn(input, 'w-16 text-right', qtyInBox > maxQty && 'border-red-400')} />
                            <span className="text-[11px] text-[var(--muted)]">件</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 表格装箱类型（先装箱再分仓模式）────────────────────────────────────────

/** 每个 SKU 的装箱规格行（一行 = 一种箱型配置）*/
type SkuBoxEntry = {
  id: string;
  lineId: string;
  boxName: string;
  qtyPerBox: number;
  boxCount: number;
  length: number;
  width: number;
  height: number;
  weight: number;
};

/** 包装组（统一模型，兼容亚马逊返回 & 手动添加）*/
type WorkingGroup = {
  id: string;
  label: string;
  isAmazon: boolean;
  lines: { lineId: string; quantity: number }[];
  supportedTransportModes?: ('SPD' | 'LTL' | 'FTL')[];
  restrictions?: string[];
};

// ─── 预设箱规 ─────────────────────────────────────────────────────────────────

const BOX_TEMPLATES = [
  { name: '小号箱',  length: 20, width: 15, height: 12, weight: 1.0 },
  { name: '标准箱',  length: 30, width: 20, height: 15, weight: 2.0 },
  { name: '中号箱',  length: 40, width: 30, height: 20, weight: 5.0 },
  { name: '大号箱',  length: 50, width: 40, height: 30, weight: 10.0 },
  { name: '特大箱',  length: 60, width: 50, height: 40, weight: 15.0 },
] as const;

// ─── 箱规名称 ComboCell（预设 + 自定义输入）──────────────────────────────────

function BoxTemplateCell({
  value,
  onChange,
  onApplyTemplate,
}: {
  value: string;
  onChange: (name: string) => void;
  onApplyTemplate: (tpl: (typeof BOX_TEMPLATES)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex">
      <input
        className="h-8 min-w-0 flex-1 rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="如 BOX-A"
      />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="h-8 rounded-r-md border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)]"
      >
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-52 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <p className="border-b border-[var(--border-subtle)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            选择预设箱规
          </p>
          {BOX_TEMPLATES.map(tpl => (
            <button
              key={tpl.name}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onApplyTemplate(tpl); onChange(tpl.name); setOpen(false); }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)]"
            >
              <div className="text-[12px] font-medium">{tpl.name}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {tpl.length}×{tpl.width}×{tpl.height} cm · {tpl.weight} kg
              </div>
            </button>
          ))}
          <p className="border-t border-[var(--border-subtle)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
            或在输入框中直接填写自定义名称
          </p>
        </div>
      )}
    </div>
  );
}

/** PackingBox[] → SkuBoxEntry[]（回显：从已保存装箱数据初始化表格）*/
function boxesToEntries(group: WorkingGroup, boxes: PackingBox[]): SkuBoxEntry[] {
  return group.lines.map(ql => {
    const myBoxes = boxes.filter(b => b.lines.some(bl => bl.lineId === ql.lineId));
    if (myBoxes.length === 0) {
      return { id: `entry:${group.id}:${ql.lineId}`, lineId: ql.lineId, boxName: '', qtyPerBox: 0, boxCount: 0, length: 0, width: 0, height: 0, weight: 0 };
    }
    const first = myBoxes[0];
    const qtyPerBox = first.lines.find(bl => bl.lineId === ql.lineId)?.quantity ?? 0;
    // 去掉 -001 / -002 后缀得到基础箱规名称
    const baseName = first.boxNumber.replace(/-\d{3,}$/, '');
    return {
      id: `entry:${group.id}:${ql.lineId}`,
      lineId: ql.lineId,
      boxName: baseName,
      qtyPerBox,
      boxCount: myBoxes.length,
      length: first.dimensions?.length ?? 0,
      width:  first.dimensions?.width  ?? 0,
      height: first.dimensions?.height ?? 0,
      weight: first.weight ?? 0,
    };
  });
}

/** 把 SkuBoxEntry[] 转成 PackingBox[]（提交前调用）*/
function entriesToBoxes(group: { lines: { lineId: string; quantity: number }[] }, entries: SkuBoxEntry[]): PackingBox[] {
  const boxes: PackingBox[] = [];
  entries.forEach(entry => {
    const ql = group.lines.find(l => l.lineId === entry.lineId);
    if (!ql || entry.boxCount <= 0 || entry.qtyPerBox <= 0) return;
    for (let i = 0; i < entry.boxCount; i++) {
      const isLast = i === entry.boxCount - 1;
      const qtyForBox = isLast
        ? Math.max(1, ql.quantity - entry.qtyPerBox * (entry.boxCount - 1))
        : entry.qtyPerBox;
      boxes.push({
        id: `box:${entry.lineId}:${i}:${Date.now()}`,
        boxNumber: entry.boxName
          ? `${entry.boxName}-${String(i + 1).padStart(3, '0')}`
          : `BOX-${String(boxes.length + 1).padStart(3, '0')}`,
        lines: [{ lineId: entry.lineId, quantity: qtyForBox }],
        weight: entry.weight || undefined,
        dimensions: (entry.length || entry.width || entry.height)
          ? { length: entry.length, width: entry.width, height: entry.height, unit: 'cm' as const }
          : undefined,
      });
    }
  });
  return boxes;
}

// ─── 表格式装箱编辑器（带批量设置 & 箱规选择）──────────────────────────────

function TableBoxEditor({
  group,
  planLines,
  entries,
  onUpdateEntry,
  onBatchUpdate,
  onDeleteEntry,
}: {
  group: WorkingGroup;
  planLines: ReplenishmentLine[];
  entries: SkuBoxEntry[];
  onUpdateEntry: (lineId: string, patch: Partial<SkuBoxEntry>) => void;
  onBatchUpdate: (lineIds: string[], patch: Partial<SkuBoxEntry>) => void;
  onDeleteEntry?: (lineId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBoxName, setBatchBoxName] = useState('');
  const [batchQtyPerBox, setBatchQtyPerBox] = useState('');
  const [batchBoxCount, setBatchBoxCount] = useState('');
  const [batchLength, setBatchLength] = useState('');
  const [batchWidth, setBatchWidth] = useState('');
  const [batchHeight, setBatchHeight] = useState('');
  const [batchWeight, setBatchWeight] = useState('');

  const allLineIds = group.lines.map(ql => ql.lineId);
  const toggleAll = () =>
    setSelected(prev => prev.size === allLineIds.length ? new Set() : new Set(allLineIds));
  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const applyBatch = (patch: Partial<SkuBoxEntry>) => {
    if (selected.size > 0) onBatchUpdate([...selected], patch);
  };
  const applyBatchTemplate = (tpl: (typeof BOX_TEMPLATES)[number]) => {
    setBatchBoxName(tpl.name);
    setBatchLength(String(tpl.length));
    setBatchWidth(String(tpl.width));
    setBatchHeight(String(tpl.height));
    setBatchWeight(String(tpl.weight));
    if (selected.size > 0)
      onBatchUpdate([...selected], { boxName: tpl.name, length: tpl.length, width: tpl.width, height: tpl.height, weight: tpl.weight });
  };

  const tdNum =
    'h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] ' +
    'outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)] text-right tabular-nums';

  return (
    <div>
      {/* ── 批量设置栏（选中行时显示）── */}
      {selected.size > 0 && (
        <div className="border-b border-[var(--primary)]/20 bg-[var(--primary-soft)] px-6 py-3">
          <div className="mb-2.5 flex items-center">
            <span className="text-[12px] font-semibold text-[var(--primary)]">
              已选 {selected.size} 行 — 批量设置
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              清除选择
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {/* 箱规预设 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">箱规</div>
              <BoxTemplateCell
                value={batchBoxName}
                onChange={v => { setBatchBoxName(v); }}
                onApplyTemplate={applyBatchTemplate}
              />
            </div>
            {/* 每箱件数 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">每箱件数</div>
              <div className="flex gap-1">
                <input type="number" min={1} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchQtyPerBox} onChange={e => setBatchQtyPerBox(e.target.value)} placeholder="如 10" />
                <button disabled={!batchQtyPerBox}
                  onClick={() => { if (batchQtyPerBox) applyBatch({ qtyPerBox: Number(batchQtyPerBox) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 箱数 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">箱数</div>
              <div className="flex gap-1">
                <input type="number" min={1} className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchBoxCount} onChange={e => setBatchBoxCount(e.target.value)} placeholder="如 5" />
                <button disabled={!batchBoxCount}
                  onClick={() => { if (batchBoxCount) applyBatch({ boxCount: Number(batchBoxCount) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 长 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">长(cm)</div>
              <div className="flex gap-1">
                <input type="number" min={0} step="0.1" className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchLength} onChange={e => setBatchLength(e.target.value)} placeholder="30" />
                <button disabled={!batchLength}
                  onClick={() => { if (batchLength) applyBatch({ length: Number(batchLength) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 宽 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">宽(cm)</div>
              <div className="flex gap-1">
                <input type="number" min={0} step="0.1" className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchWidth} onChange={e => setBatchWidth(e.target.value)} placeholder="20" />
                <button disabled={!batchWidth}
                  onClick={() => { if (batchWidth) applyBatch({ width: Number(batchWidth) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 高 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">高(cm)</div>
              <div className="flex gap-1">
                <input type="number" min={0} step="0.1" className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchHeight} onChange={e => setBatchHeight(e.target.value)} placeholder="15" />
                <button disabled={!batchHeight}
                  onClick={() => { if (batchHeight) applyBatch({ height: Number(batchHeight) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 重量 */}
            <div>
              <div className="mb-1 text-[11px] text-[var(--muted)]">重量(kg)</div>
              <div className="flex gap-1">
                <input type="number" min={0} step="0.01" className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                  value={batchWeight} onChange={e => setBatchWeight(e.target.value)} placeholder="2.5" />
                <button disabled={!batchWeight}
                  onClick={() => { if (batchWeight) applyBatch({ weight: Number(batchWeight) }); }}
                  className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] hover:bg-[var(--surface-hover)] disabled:opacity-40">应用</button>
              </div>
            </div>
            {/* 全部应用 */}
            {(batchBoxName || batchQtyPerBox || batchBoxCount || batchLength || batchWidth || batchHeight || batchWeight) && (
              <button
                onClick={() => {
                  const patch: Partial<SkuBoxEntry> = {};
                  if (batchBoxName)    patch.boxName  = batchBoxName;
                  if (batchQtyPerBox) patch.qtyPerBox = Number(batchQtyPerBox);
                  if (batchBoxCount)  patch.boxCount  = Number(batchBoxCount);
                  if (batchLength)    patch.length    = Number(batchLength);
                  if (batchWidth)     patch.width     = Number(batchWidth);
                  if (batchHeight)    patch.height    = Number(batchHeight);
                  if (batchWeight)    patch.weight    = Number(batchWeight);
                  applyBatch(patch);
                }}
                className="h-7 rounded-md bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90"
              >
                全部应用
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 表格 ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]" style={{ minWidth: 1120 }}>
          <thead className="sticky top-0 bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" aria-label="全选"
                  checked={allLineIds.length > 0 && selected.size === allLineIds.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-2.5 w-52">商品 / MSKU</th>
              <th className="px-4 py-2.5">ASIN / FNSKU</th>
              <th className="px-4 py-2.5 text-right w-24">申报数量</th>
              <th className="px-4 py-2.5 text-right w-24">已装箱</th>
              <th className="px-4 py-2.5 w-44">箱规名称</th>
              <th className="px-4 py-2.5 text-right w-24">每箱件数 *</th>
              <th className="px-4 py-2.5 text-right w-20">箱数 *</th>
              <th className="px-4 py-2.5 text-right w-22">长(cm) *</th>
              <th className="px-4 py-2.5 text-right w-22">宽(cm) *</th>
              <th className="px-4 py-2.5 text-right w-22">高(cm) *</th>
              <th className="px-4 py-2.5 text-right w-26">重量(kg) *</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {group.lines.map(ql => {
              const line = planLines.find(l => l.id === ql.lineId);
              const entry = entries.find(e => e.lineId === ql.lineId);
              if (!entry) return null;
              const boxedQty = (entry.qtyPerBox || 0) * (entry.boxCount || 0);
              const isOk = boxedQty > 0 && boxedQty === ql.quantity;
              const isOver = boxedQty > ql.quantity;
              const isUnder = boxedQty > 0 && boxedQty < ql.quantity;
              const isSelected = selected.has(ql.lineId);

              return (
                <tr key={ql.lineId} className={cn(
                  'hover:bg-[var(--surface-subtle)] transition-colors',
                  isSelected && 'bg-[var(--primary-soft)]',
                  isOk && !isSelected && 'bg-emerald-50/40',
                )}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={line?.sku ?? ql.lineId}
                      checked={isSelected} onChange={() => toggle(ql.lineId)} />
                  </td>
                  {/* SKU */}
                  <td className="px-4 py-3">
                    <div className="font-medium leading-tight">{line?.sku ?? ql.lineId}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {line?.msku || line?.channelSku || <span className="text-amber-600">MSKU 未维护</span>}
                    </div>
                  </td>
                  {/* ASIN / FNSKU */}
                  <td className="px-4 py-3">
                    <div className="text-[var(--muted)]">{line?.asin || '—'}</div>
                    {line?.fnsku && <div className="text-[11px] text-[var(--muted)]">FNSKU: {line.fnsku}</div>}
                  </td>
                  {/* 申报数量 */}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{ql.quantity}</td>
                  {/* 已装箱 */}
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'tabular-nums font-semibold',
                      isOk ? 'text-emerald-600' : isOver ? 'text-red-600' : isUnder ? 'text-amber-600' : 'text-[var(--muted)]',
                    )}>
                      {boxedQty > 0 ? boxedQty : '—'}
                      {isOk && <span className="ml-1 text-[11px]">✓</span>}
                      {isOver && <span className="ml-1 text-[10px]">超出</span>}
                      {isUnder && <span className="ml-1 text-[10px]">不足</span>}
                    </span>
                  </td>
                  {/* 箱规名称 */}
                  <td className="px-4 py-3">
                    <BoxTemplateCell
                      value={entry.boxName}
                      onChange={v => onUpdateEntry(entry.lineId, { boxName: v })}
                      onApplyTemplate={tpl => onUpdateEntry(entry.lineId, {
                        boxName: tpl.name, length: tpl.length, width: tpl.width,
                        height: tpl.height, weight: tpl.weight,
                      })}
                    />
                  </td>
                  {/* 每箱件数 */}
                  <td className="px-4 py-3">
                    <input type="number" min={1} className={cn(tdNum, !entry.qtyPerBox && 'border-amber-300')}
                      value={entry.qtyPerBox || ''} placeholder="如 10"
                      onChange={e => onUpdateEntry(entry.lineId, { qtyPerBox: Math.max(0, Number(e.target.value)) })} />
                  </td>
                  {/* 箱数 */}
                  <td className="px-4 py-3">
                    <input type="number" min={1} className={cn(tdNum, !entry.boxCount && 'border-amber-300')}
                      value={entry.boxCount || ''} placeholder="1"
                      onChange={e => onUpdateEntry(entry.lineId, { boxCount: Math.max(0, Number(e.target.value)) })} />
                  </td>
                  {/* 长 */}
                  <td className="px-4 py-3">
                    <input type="number" min={0} step="0.1" className={cn(tdNum, !entry.length && 'border-amber-300')}
                      value={entry.length || ''} placeholder="30"
                      onChange={e => onUpdateEntry(entry.lineId, { length: Number(e.target.value) })} />
                  </td>
                  {/* 宽 */}
                  <td className="px-4 py-3">
                    <input type="number" min={0} step="0.1" className={cn(tdNum, !entry.width && 'border-amber-300')}
                      value={entry.width || ''} placeholder="20"
                      onChange={e => onUpdateEntry(entry.lineId, { width: Number(e.target.value) })} />
                  </td>
                  {/* 高 */}
                  <td className="px-4 py-3">
                    <input type="number" min={0} step="0.1" className={cn(tdNum, !entry.height && 'border-amber-300')}
                      value={entry.height || ''} placeholder="15"
                      onChange={e => onUpdateEntry(entry.lineId, { height: Number(e.target.value) })} />
                  </td>
                  {/* 重量 */}
                  <td className="px-4 py-3">
                    <input type="number" min={0} step="0.01" className={cn(tdNum, !entry.weight && 'border-amber-300')}
                      value={entry.weight || ''} placeholder="2.50"
                      onChange={e => onUpdateEntry(entry.lineId, { weight: Number(e.target.value) })} />
                  </td>
                  {/* 删除行 */}
                  <td className="px-2 py-3 text-center">
                    {onDeleteEntry && (
                      <button type="button" onClick={() => onDeleteEntry(ql.lineId)}
                        title="从包装组移除此 SKU"
                        className="rounded p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* 合计行 */}
          <tfoot className="bg-[var(--surface-subtle)] text-[12px] font-semibold">
            <tr>
              <td />
              <td colSpan={2} className="px-4 py-2.5 text-[var(--muted)]">合计</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {group.lines.reduce((s, ql) => s + ql.quantity, 0)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {entries.reduce((s, e) => s + (e.qtyPerBox || 0) * (e.boxCount || 0), 0)}
              </td>
              <td className="px-4 py-2.5 text-[var(--muted)]">—</td>
              <td className="px-4 py-2.5 text-[var(--muted)]">—</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {entries.reduce((s, e) => s + (e.boxCount || 0), 0)} 箱
              </td>
              <td colSpan={3} className="px-4 py-2.5 text-[var(--muted)]">—</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {entries.reduce((s, e) => s + (e.weight || 0) * (e.boxCount || 0), 0).toFixed(2)} kg
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── 添加包装组弹窗 ──────────────────────────────────────────────────────────

function AddGroupDialog({
  planLines,
  existingCount,
  onClose,
  onConfirm,
}: {
  planLines: ReplenishmentLine[];
  existingCount: number;
  onClose: () => void;
  onConfirm: (name: string, assignments: { lineId: string; quantity: number }[]) => void;
}) {
  const [name, setName] = useState(`包装第${existingCount + 1}组`);
  const [rows, setRows] = useState(
    planLines.map(l => ({ lineId: l.id, quantity: l.quantity, selected: false }))
  );

  const selected = rows.filter(r => r.selected);

  const toggle = (idx: number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));

  const setQty = (idx: number, qty: number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, quantity: Math.max(1, qty) } : r));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* 标题 */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-[15px] font-semibold">添加包装组</h2>
          <button onClick={onClose}><X className="size-4 text-[var(--muted)]" /></button>
        </div>
        {/* 内容 */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
          {/* 组名 */}
          <div>
            <label className="block text-[12px] font-medium text-[var(--muted)]">包装组名称</label>
            <input
              className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)]"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          {/* SKU 选择 */}
          <div>
            <label className="block text-[12px] font-medium text-[var(--muted)]">选择商品 & 分配数量</label>
            <div className="mt-2 space-y-2">
              {rows.map((row, idx) => {
                const line = planLines.find(l => l.id === row.lineId);
                return (
                  <div key={row.lineId} className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    row.selected ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)]',
                  )}>
                    <input type="checkbox" checked={row.selected} onChange={() => toggle(idx)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{line?.sku ?? row.lineId}</div>
                      <div className="text-[11px] text-[var(--muted)] truncate">
                        {line?.msku || line?.channelSku || '—'}
                        {line?.asin && ` · ASIN: ${line.asin}`}
                      </div>
                    </div>
                    {row.selected && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[12px] text-[var(--muted)]">数量</span>
                        <input
                          type="number" min={1} max={line?.quantity ?? 9999}
                          value={row.quantity}
                          onChange={e => setQty(idx, Number(e.target.value))}
                          className="h-7 w-20 rounded-md border border-[var(--border)] px-2 text-[12px] text-right"
                        />
                        <span className="text-[11px] text-[var(--muted)]">/ {line?.quantity ?? '—'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* 底部 */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">已选 {selected.length} 个 SKU</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)]">
              取消
            </button>
            <button
              disabled={!name.trim() || selected.length === 0}
              onClick={() => onConfirm(name.trim(), selected.map(r => ({ lineId: r.lineId, quantity: r.quantity })))}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              添加包装组
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 包装组装箱（先装箱再分仓模式，表格样式）────────────────────────────────

interface PackingGroupBoxingProps {
  inboundPlan: InboundPlan;
  snapshot: OmsSnapshot;
  onClose: () => void;
  onComplete?: () => void;
  inline?: boolean;
}

export function PackingGroupBoxingWorkstation({ inboundPlan, snapshot, onClose, onComplete, inline }: PackingGroupBoxingProps) {
  const { executeReplenishment } = useOms();

  const selectedOpt = inboundPlan.packingOptions?.find(o => o.id === inboundPlan.selectedPackingOptionId)
    ?? inboundPlan.packingOptions?.[0];
  const amazonGroups: FbaPackingGroup[] = selectedOpt?.packingGroups ?? [];

  // 初始组数据（用于 useState 初始化，避免闭包陈旧问题）
  const initialGroups: WorkingGroup[] = amazonGroups.map((g, idx) => ({
    id: g.id,
    label: `包装第${idx + 1}组`,
    isAmazon: true,
    lines: g.lines,
    supportedTransportModes: g.supportedTransportModes,
    restrictions: g.restrictions,
  }));

  // 统一模型（亚马逊包装组 + 手动添加）
  const [workingGroups, setWorkingGroups] = useState<WorkingGroup[]>(initialGroups);

  // Per-group SKU 级装箱规格（从已保存的 packingGroupBoxes 初始化，实现回显）
  const [groupEntries, setGroupEntries] = useState<Record<string, SkuBoxEntry[]>>(() => {
    return Object.fromEntries(initialGroups.map(g => [
      g.id,
      boxesToEntries(g, inboundPlan.packingGroupBoxes?.[g.id] ?? []),
    ]));
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string>(workingGroups[0]?.id ?? '');
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  // 单行更新
  const updateEntry = (groupId: string, lineId: string, patch: Partial<SkuBoxEntry>) => {
    setGroupEntries(prev => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map(e => e.lineId === lineId ? { ...e, ...patch } : e),
    }));
  };

  // 批量更新
  const batchUpdateEntries = (groupId: string, lineIds: string[], patch: Partial<SkuBoxEntry>) => {
    setGroupEntries(prev => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map(e =>
        lineIds.includes(e.lineId) ? { ...e, ...patch } : e
      ),
    }));
  };

  // 添加手动包装组
  const addGroup = (name: string, assignments: { lineId: string; quantity: number }[]) => {
    const id = `manual:${Date.now()}`;
    setWorkingGroups(prev => [...prev, {
      id, label: name, isAmazon: false, lines: assignments,
    }]);
    setGroupEntries(prev => ({
      ...prev,
      [id]: assignments.map(a => ({
        id: `entry:${id}:${a.lineId}`,
        lineId: a.lineId,
        boxName: '',
        qtyPerBox: 0,
        boxCount: 0,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
      })),
    }));
    setActiveGroupId(id);
    setAddGroupOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    const remaining = workingGroups.filter(g => g.id !== groupId);
    setWorkingGroups(remaining);
    setGroupEntries(prev => { const next = { ...prev }; delete next[groupId]; return next; });
    if (activeGroupId === groupId) setActiveGroupId(remaining[0]?.id ?? '');
  };

  const handleDeleteEntryFromGroup = (groupId: string, lineId: string) => {
    setGroupEntries(prev => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).filter(e => e.lineId !== lineId),
    }));
    setWorkingGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, lines: g.lines.filter(l => l.lineId !== lineId) } : g
    ));
  };

  const isGroupDone = (gid: string): boolean => {
    const entries = groupEntries[gid] ?? [];
    const group = workingGroups.find(g => g.id === gid);
    if (!group) return false;
    return group.lines.every(ql => {
      const e = entries.find(x => x.lineId === ql.lineId);
      return e && e.qtyPerBox > 0 && e.boxCount > 0 &&
        e.qtyPerBox * e.boxCount === ql.quantity;
    });
  };

  const allGroupsDone = workingGroups.every(g => isGroupDone(g.id));

  const totalBoxes = Object.values(groupEntries).reduce(
    (s, entries) => s + entries.reduce((s2, e) => s2 + (e.boxCount || 0), 0), 0
  );

  const handleSubmit = async () => {
    if (!allGroupsDone) { setError('请确保所有包装组均已完成装箱（已装箱 = 申报数量）'); return; }
    setSubmitting(true);
    setError('');
    try {
      const packingGroupBoxes: Record<string, PackingBox[]> = {};
      workingGroups.forEach(g => {
        packingGroupBoxes[g.id] = entriesToBoxes(g, groupEntries[g.id] ?? []);
      });
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_packing_boxes_submit',
        inboundPlanId: inboundPlan.id,
        packingGroupBoxes,
      });
      onClose();
      onComplete?.();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setSubmitting(false); }
  };

  if (workingGroups.length === 0) {
    return (
      <div className={cn(
        inline
          ? 'flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10'
          : 'fixed inset-0 z-[70] flex items-center justify-center bg-black/40'
      )} onClick={inline ? undefined : onClose}>
        <Package className="size-10 text-[var(--border)]" />
        <p className="mt-3 text-[13px] text-[var(--muted)]">暂无包装组，可手动添加</p>
        <button
          onClick={() => setAddGroupOpen(true)}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white"
        >
          <Plus className="size-3.5" />添加包装组
        </button>
        {addGroupOpen && (
          <AddGroupDialog
            planLines={inboundPlan.lines}
            existingCount={workingGroups.length}
            onClose={() => setAddGroupOpen(false)}
            onConfirm={addGroup}
          />
        )}
      </div>
    );
  }

  const activeGroup = workingGroups.find(g => g.id === activeGroupId) ?? workingGroups[0];

  return (
    <div className={cn(
      inline
        ? 'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]'
        : 'fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40'
    )} onClick={inline ? undefined : onClose}>
      <div
        className={inline ? 'flex flex-col' : 'flex w-full max-w-[1180px] flex-col bg-[var(--surface)] shadow-2xl'}
        onClick={inline ? undefined : e => e.stopPropagation()}
      >
        {/* ── 标题 ── */}
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className={cn(inline ? 'text-[13px] font-semibold' : 'text-[16px] font-semibold')}>商品装箱</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {inboundPlan.number} · {workingGroups.length} 个包装组
            </p>
          </div>
          {!inline && (
            <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* ── 说明 ── */}
        <div className="border-b border-[var(--border-subtle)] bg-blue-50 px-6 py-3 text-[12px] text-blue-800">
          在下方表格中填写每个 SKU 的箱规信息。勾选多行后可批量设置箱规、件数及尺寸重量，或从预设箱规快速填写。
        </div>

        {/* ── 包装组选项卡 + 添加按钮 ── */}
        <div className="flex items-center border-b border-[var(--border)]">
          <div className="flex flex-1 overflow-x-auto">
            {workingGroups.map((g, idx) => {
              const done = isGroupDone(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={cn(
                    'group flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] transition-colors',
                    activeGroupId === g.id
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {done
                    ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    : <span className="size-4 rounded-full border-2 border-current flex-shrink-0" />}
                  <span>{g.label}</span>
                  {!g.isAmazon && (
                    <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">手动</span>
                  )}
                  <span className="text-[11px] text-[var(--muted)]">
                    ({g.lines.reduce((s, l) => s + l.quantity, 0)} 件)
                  </span>
                  {/* 删除包装组 */}
                  <span
                    role="button"
                    title="删除此包装组"
                    onClick={e => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                    className="ml-0.5 rounded p-0.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                  >
                    <X className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
          {/* 添加包装组 */}
          <button
            onClick={() => setAddGroupOpen(true)}
            className="ml-auto mr-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--surface-subtle)]"
          >
            <Plus className="size-3.5" />添加包装组
          </button>
        </div>

        {/* ── 当前包装组信息条 ── */}
        {activeGroup && (
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-6 py-2.5 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold">{activeGroup.label}</span>
              {activeGroup.isAmazon && (
                <span className="text-[var(--muted)]">
                  ID: {amazonGroups.find(g => g.id === activeGroup.id)?.externalGroupId ?? '—'}
                </span>
              )}
              {activeGroup.supportedTransportModes && (
                <span className="text-[var(--muted)]">
                  支持运输：{activeGroup.supportedTransportModes.join(' / ')}
                </span>
              )}
              {activeGroup.restrictions?.map(r => (
                <span key={r} className="rounded bg-orange-100 px-2 py-0.5 text-[10px] text-orange-700">{r}</span>
              ))}
              <span className="ml-auto text-[var(--muted)]">
                {activeGroup.lines.reduce((s, l) => s + l.quantity, 0)} 件待装箱
              </span>
            </div>
          </div>
        )}

        {/* ── 表格装箱编辑器 ── */}
        <div className="flex-1 overflow-auto">
          {activeGroup && (
            <TableBoxEditor
              group={activeGroup}
              planLines={inboundPlan.lines}
              entries={groupEntries[activeGroup.id] ?? []}
              onUpdateEntry={(lineId, patch) => updateEntry(activeGroup.id, lineId, patch)}
              onBatchUpdate={(lineIds, patch) => batchUpdateEntries(activeGroup.id, lineIds, patch)}
              onDeleteEntry={lineId => handleDeleteEntryFromGroup(activeGroup.id, lineId)}
            />
          )}
        </div>

        {/* ── 底部操作栏 ── */}
        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </p>
          )}
          <div className="mb-3 flex flex-wrap gap-5 rounded-lg bg-[var(--surface-subtle)] px-4 py-2.5 text-[12px]">
            <span className="text-[var(--muted)]">
              总箱数 <strong className="text-[var(--foreground)] tabular-nums">{totalBoxes}</strong> 箱
            </span>
            <span className="text-[var(--muted)]">
              已完成{' '}
              <strong className={cn('tabular-nums', allGroupsDone ? 'text-emerald-600' : 'text-amber-600')}>
                {workingGroups.filter(g => isGroupDone(g.id)).length}
              </strong>{' '}
              / {workingGroups.length} 组
            </span>
            {allGroupsDone && <span className="ml-auto font-semibold text-emerald-600">✓ 所有包装组均已完成</span>}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[var(--muted)]">完成后提交，亚马逊将返回分仓方案。</p>
            <div className="flex gap-2">
              {!inline && (
                <button onClick={onClose} disabled={submitting}
                  className="h-9 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)] disabled:opacity-40">
                  取消
                </button>
              )}
              <button
                onClick={() => void handleSubmit()}
                disabled={!allGroupsDone || submitting}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {submitting && <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                查看分仓方案 →
              </button>
            </div>
          </div>
        </div>

        {/* 添加包装组弹窗 */}
        {addGroupOpen && (
          <AddGroupDialog
            planLines={inboundPlan.lines}
            existingCount={workingGroups.length}
            onClose={() => setAddGroupOpen(false)}
            onConfirm={addGroup}
          />
        )}
      </div>
    </div>
  );
}

// ─── 货件级装箱（先分仓再装箱 / WMS 场景）────────────────────────────────────

interface AllocationBoxingProps {
  inboundPlan: InboundPlan;
  alloc: PlatformAllocation;
  snapshot: OmsSnapshot;
  onClose: () => void;
  inline?: boolean;
}

export function BoxingWorkstation({ inboundPlan, alloc, snapshot, onClose, inline }: AllocationBoxingProps) {
  const { executeReplenishment } = useOms();

  const [boxes, setBoxes] = useState<PackingBox[]>(() =>
    alloc.boxes?.length ? structuredClone(alloc.boxes) : []
  );
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const packedTotals = useMemo(() => totalQtyInBoxes(boxes), [boxes]);
  const totalRequired = alloc.lines.reduce((s, l) => s + l.quantity, 0);
  const totalPacked = Object.values(packedTotals).reduce((s, v) => s + v, 0);
  const allPacked = totalPacked === totalRequired && alloc.lines.every(ql => (packedTotals[ql.lineId] ?? 0) === ql.quantity);

  const handleSave = async () => {
    setSaving(true);
    try { await executeReplenishment(snapshot.merchantId, { type: 'inbound_update_boxes', inboundPlanId: inboundPlan.id, allocationId: alloc.id, boxes }); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
    finally { setSaving(false); }
  };

  const handleConfirm = async () => {
    if (!allPacked) { setError('请先确保所有商品均已装箱且件数一致'); return; }
    setConfirming(true);
    try {
      await executeReplenishment(snapshot.merchantId, { type: 'inbound_update_boxes', inboundPlanId: inboundPlan.id, allocationId: alloc.id, boxes });
      await executeReplenishment(snapshot.merchantId, { type: 'inbound_confirm_packing', inboundPlanId: inboundPlan.id, allocationId: alloc.id });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '确认装箱失败'); }
    finally { setConfirming(false); }
  };

  return (
    <div className={inline
      ? 'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]'
      : 'fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40'}
      onClick={inline ? undefined : onClose}>
      <div className={inline ? 'flex flex-col' : 'flex w-full max-w-[960px] flex-col bg-[var(--surface)] shadow-2xl'}
        onClick={inline ? undefined : (e => e.stopPropagation())}>
        {/* 标题 */}
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className={inline ? 'text-[13px] font-semibold' : 'text-[16px] font-semibold'}>装箱工作台</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {inboundPlan.number} · 货件 {alloc.externalShipmentId ?? alloc.destinationCode}
              {alloc.destinationName && ` · ${alloc.destinationName}`}
            </p>
          </div>
          {!inline && <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-5" /></button>}
        </div>

        {/* 主体 */}
        <div className="min-h-0 flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <BoxEditor
            targetLines={alloc.lines}
            planLines={inboundPlan.lines}
            boxes={boxes}
            setBoxes={setBoxes}
            targetLabel="货件内商品"
          />
        </div>

        {/* 底部 */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-[var(--muted)]">
              {boxes.length} 箱 · 已装 {totalPacked} / {totalRequired} 件
              {allPacked && <span className="ml-2 font-semibold text-emerald-600">✓ 装箱完成</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={confirming} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] disabled:opacity-40">取消</button>
              <button onClick={() => void handleSave()} disabled={saving} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)] disabled:opacity-40">
                {saving ? '保存中…' : '保存草稿'}
              </button>
              <button onClick={() => void handleConfirm()} disabled={!allPacked || confirming}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
                {confirming && <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                确认装箱
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
