'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Plus, RefreshCw, Save, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { allocationKey, allocatedTotal, allocationTotals, allocationValue, formatRatio, isValidRatio, otherAllocation, parseSkuCodes, matchSkuSearch, matchSkuStatus, introducedConflicts, updateWarehouses, type SkuStatusFilter, type WarehouseUpdateMode } from './allocation-utils';

type RetailerType = 'EDI' | '平台授权' | '文件传输' | '自定义';
type Sku = { skuCode: string; skuName: string };
type SkuEntry = Sku & { ratio: string; excluded: boolean };
type RetailerAlloc = {
  retailer: { id: string; name: string; type: RetailerType };
  enabled: boolean;
  defaultRatio: string;
  ownerId: string;
  warehouseIds: string[];
  syncMode: 'realtime' | 'daily' | 'scheduled';
  dailyTimes: string[];
  syncTimes: string[];
  skus: SkuEntry[];
};

const OWNERS = [
  { id: 'OWN-001', name: '货主 A（品牌方）' },
  { id: 'OWN-002', name: '货主 B（代工厂）' },
  { id: 'OWN-003', name: '货主 C（分销商）' },
  { id: 'OWN-004', name: '华南品牌代理' },
  { id: 'OWN-005', name: '北美直营仓' },
  { id: 'OWN-006', name: '欧盟认证货主' },
  { id: 'OWN-007', name: '跨境直发供应商' },
];

const WAREHOUSES = [
  { id: 'wh-lax', name: 'US 西部仓（洛杉矶）' },
  { id: 'wh-ewr', name: 'US 东部仓（纽约）' },
  { id: 'wh-dfw', name: 'US 中部仓（达拉斯）' },
  { id: 'wh-sg', name: '新加坡仓' },
  { id: 'wh-3pla', name: '谷仓（三方仓）' },
  { id: 'wh-3plb', name: '万邑通（三方仓）' },
  { id: 'wh-fba', name: 'Amazon FBA' },
  { id: 'wh-drop', name: '供应商直发' },
];

const SKU_POOL: Sku[] = [
  { skuCode: 'SKU-A001', skuName: '红色圆领T恤 S码' },
  { skuCode: 'SKU-A002', skuName: '红色圆领T恤 M码' },
  { skuCode: 'SKU-A003', skuName: '红色圆领T恤 L码' },
  { skuCode: 'SKU-B001', skuName: '蓝色条纹衬衫 S码' },
  { skuCode: 'SKU-B002', skuName: '蓝色条纹衬衫 M码' },
  { skuCode: 'SKU-C001', skuName: '黑色运动裤 S码' },
  { skuCode: 'SKU-C002', skuName: '黑色运动裤 M码' },
  { skuCode: 'SKU-D001', skuName: '白色帆布鞋 38' },
  { skuCode: 'SKU-E001', skuName: '保温水杯 350ml 黑' },
  { skuCode: 'SKU-F001', skuName: '无线蓝牙耳机 Pro' },
];

function makeEntry(id: string, name: string, type: RetailerType, ratios: Record<string, string>, defaultRatio = '', enabled = true): RetailerAlloc {
  return { retailer: { id, name, type }, enabled, defaultRatio, ownerId: 'OWN-001', warehouseIds: ['wh-lax'], syncMode: 'scheduled', dailyTimes: [], syncTimes: [],
    skus: SKU_POOL.map(sku => ({ ...sku, ratio: ratios[sku.skuCode] ?? '', excluded: false })) };
}

const INITIAL: RetailerAlloc[] = [
  makeEntry('walmart', 'Walmart', 'EDI', { 'SKU-A001': '40', 'SKU-A002': '40', 'SKU-A003': '50', 'SKU-B001': '35', 'SKU-B002': '50', 'SKU-D001': '60', 'SKU-F001': '60' }, '40'),
  makeEntry('target', 'Target', 'EDI', { 'SKU-A001': '30', 'SKU-A002': '30', 'SKU-A003': '40', 'SKU-B001': '50', 'SKU-B002': '40', 'SKU-D001': '40' }, '30'),
  makeEntry('costco', 'Costco', 'EDI', { 'SKU-A001': '20', 'SKU-B002': '30' }, '', false),
  makeEntry('shopify', 'Shopify US', '平台授权', { 'SKU-A001': '30', 'SKU-A002': '30', 'SKU-D001': '100', 'SKU-F001': '40' }, '30'),
  makeEntry('amazon', 'Amazon', '平台授权', { 'SKU-A003': '20', 'SKU-F001': '100' }),
  makeEntry('tiktok', 'TikTok Shop', '平台授权', { 'SKU-A001': '30', 'SKU-B001': '10' }),
];

const RETAILER_OPTIONS: { name: string; type: RetailerType }[] = [
  ...INITIAL.map(entry => ({ name: entry.retailer.name, type: entry.retailer.type })),
  { name: 'Kroger', type: 'EDI' },
  { name: 'Wayfair', type: 'EDI' },
  { name: 'Home Depot', type: 'EDI' },
  { name: 'eBay', type: '平台授权' },
];

const inputClass = 'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-50';
const buttonClass = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40';
const primaryClass = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';

function RatioInput({ value, onChange, label, disabled = false, invalid = false }: {
  value: string; onChange: (value: string) => void; label: string; disabled?: boolean; invalid?: boolean;
}) {
  return <div className="relative w-28 shrink-0">
    <input aria-label={label} aria-invalid={invalid} type="number" min="0" max="100" step="0.01" value={value} disabled={disabled}
      onChange={event => onChange(event.target.value)} placeholder="待配置"
      className={cn(inputClass, 'w-full pr-7 text-right tabular-nums', invalid && 'border-red-400 bg-red-50 text-red-700')} />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">%</span>
  </div>;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={onChange}
    className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]', checked ? 'bg-[var(--primary)]' : 'bg-slate-300')}>
    <span className={cn('size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
  </button>;
}

function SkuSearch({ label, keyword, onKeywordChange, codes, onCodesChange, skus }: {
  label: string; keyword: string; onKeywordChange: (value: string) => void;
  codes: string[]; onCodesChange: (value: string[]) => void; skus: Sku[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const knownCodes = new Set(skus.map(sku => sku.skuCode.toUpperCase()));
  const missing = codes.filter(code => !knownCodes.has(code));
  return <div className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label={label} value={keyword} onChange={event => { onKeywordChange(event.target.value); onCodesChange([]); }} placeholder="搜索 SKU / 商品" className={cn(inputClass, 'h-8 w-48')} />
      <button className={cn(buttonClass, 'h-8')} aria-expanded={open} onClick={() => { setText(codes.join('\n')); setOpen(value => !value); }}>批量搜索</button>
      {codes.length > 0 && <button className="text-xs text-[var(--muted)]" onClick={() => { onCodesChange([]); onKeywordChange(''); setText(''); setOpen(false); }}>清除筛选（{codes.length}）</button>}
    </div>
    {open && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <textarea autoFocus aria-label={`${label}：批量编码`} value={text} onChange={event => setText(event.target.value)} rows={4} placeholder={'粘贴 SKU 编码，用换行、逗号或空格分隔\nSKU-A001\nSKU-B001'} className={cn(inputClass, 'h-auto w-full resize-y py-2 font-mono text-xs')} />
      <div className="mt-2 flex justify-end gap-2"><button className={cn(buttonClass, 'h-8')} onClick={() => setOpen(false)}>取消</button><button className={cn(primaryClass, 'h-8')} disabled={!parseSkuCodes(text).length} onClick={() => { onCodesChange(parseSkuCodes(text)); onKeywordChange(''); setOpen(false); }}>查询</button></div>
    </div>}
    {codes.length > 0 && <div role="status" className="text-xs text-[var(--muted)]">匹配 {codes.length - missing.length} / {codes.length} 个 SKU{missing.length > 0 && <span className="ml-2 text-amber-700">未找到：{missing.join('、')}</span>}</div>}
  </div>;
}

export default function InventoryAllocationPage() {
  const [data, setData] = useState(INITIAL);
  const [enforceCap, setEnforceCap] = useState(true);
  const [saved, setSaved] = useState({ data: INITIAL, enforceCap: true });
  const [catalog, setCatalog] = useState(SKU_POOL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retailerSearch, setRetailerSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const drawerDialog = useRef<HTMLDialogElement>(null);
  const [drawerDraft, setDrawerDraft] = useState<RetailerAlloc | null>(null);
  const [drawerRatio, setDrawerRatio] = useState('');
  const [drawerError, setDrawerError] = useState('');
  useEffect(() => {
    if (expandedId) drawerDialog.current?.showModal();
    else drawerDialog.current?.close();
    setDrawerRatio(''); setDrawerError('');
  }, [expandedId]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuStatusFilters, setSkuStatusFilters] = useState<Record<string, SkuStatusFilter>>({});
  const [skuCodes, setSkuCodes] = useState<string[]>([]);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<Set<string>>(new Set());
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [batchSearch, setBatchSearch] = useState('');
  const [batchRatios, setBatchRatios] = useState<Record<string, string>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const batchDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = batchDialog.current;
    if (batchOpen) dialog?.showModal();
    else dialog?.close();
  }, [batchOpen]);
  const [notice, setNotice] = useState('');
  const [showOverview, setShowOverview] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [retailerDropdownOpen, setRetailerDropdownOpen] = useState(false);
  const [newType, setNewType] = useState<RetailerType>('EDI');
  const [rowSkuSelection, setRowSkuSelection] = useState<Record<string, string[]>>({});
  const [bulkSourceOpen, setBulkSourceOpen] = useState(false);
  const [bulkOwnerId, setBulkOwnerId] = useState('');
  const [bulkWarehouseIds, setBulkWarehouseIds] = useState<string[]>([]);
  const [bulkWarehouseMode, setBulkWarehouseMode] = useState<WarehouseUpdateMode>('add');
  const [bulkSourceError, setBulkSourceError] = useState('');
  const bulkSourceDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (bulkSourceOpen) bulkSourceDialog.current?.showModal();
    else bulkSourceDialog.current?.close();
  }, [bulkSourceOpen]);

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceOwnerId, setSourceOwnerId] = useState('');
  const [sourceWarehouseIds, setSourceWarehouseIds] = useState<string[]>([]);
  const [sourceError, setSourceError] = useState('');
  const sourceDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (sourceId) sourceDialog.current?.showModal();
    else sourceDialog.current?.close();
  }, [sourceId]);

  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [bulkScheduleMode, setBulkScheduleMode] = useState<RetailerAlloc['syncMode']>('realtime');
  const [bulkDailyTimes, setBulkDailyTimes] = useState<string[]>([]);
  const [bulkSyncTimes, setBulkSyncTimes] = useState<string[]>([]);
  const [bulkScheduleError, setBulkScheduleError] = useState('');
  const bulkScheduleDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (bulkScheduleOpen) bulkScheduleDialog.current?.showModal();
    else bulkScheduleDialog.current?.close();
  }, [bulkScheduleOpen]);

  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<RetailerAlloc['syncMode']>('scheduled');
  const [dailyDraft, setDailyDraft] = useState<string[]>([]);
  const [scheduleError, setScheduleError] = useState('');
  const scheduleDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (scheduleId) scheduleDialog.current?.showModal();
    else scheduleDialog.current?.close();
  }, [scheduleId]);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncDialog = useRef<HTMLDialogElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncOpen) syncDialog.current?.showModal();
    else syncDialog.current?.close();
  }, [syncOpen]);

  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
  }, []);

  const totals = useMemo(() => allocationTotals(data), [data]);
  const conflicts = Object.keys(totals).filter(code => totals[code] > 100);
  const active = data.filter(entry => entry.enabled);
  const defaultTotals = active.reduce((totals, entry) => {
    for (const warehouseId of entry.warehouseIds) {
      const key = allocationKey(entry.ownerId, warehouseId, 'DEFAULT');
      totals[key] = formatRatio((totals[key] ?? 0) + (isValidRatio(entry.defaultRatio) ? Number(entry.defaultRatio) : 0));
    }
    return totals;
  }, {} as Record<string, number>);
  const overDefaultPools = Object.entries(defaultTotals).filter(([, total]) => total > 100);
  const maxDefaultTotal = Math.max(0, ...Object.values(defaultTotals));
  const defaultPoolCount = Object.keys(defaultTotals).length;
  const invalidDefaults = data.some(entry => entry.defaultRatio !== '' && !isValidRatio(entry.defaultRatio));
  const invalidRatios = data.some(entry => entry.skus.some(sku => !sku.excluded && sku.ratio !== '' && !isValidRatio(sku.ratio)));
  const scheduleErrors = data.flatMap(entry => {
    const original = saved.data.find(item => item.retailer.id === entry.retailer.id)?.syncTimes ?? [];
    const errors: string[] = [];
    if (entry.syncMode === 'realtime') return errors;
    if (entry.syncMode === 'daily') {
      if (!entry.dailyTimes.length || entry.dailyTimes.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) errors.push(`${entry.retailer.name}：请设置有效的每日同步时间`);
      if (new Set(entry.dailyTimes).size !== entry.dailyTimes.length) errors.push(`${entry.retailer.name}：每日同步时间重复`);
      return errors;
    }
    if (new Set(entry.syncTimes).size !== entry.syncTimes.length) errors.push(`${entry.retailer.name}：同步时间重复`);
    if (entry.syncTimes.some(time => !time || !Number.isFinite(new Date(time).getTime()))) errors.push(`${entry.retailer.name}：请填写有效的同步时间`);
    if (entry.syncTimes.some(time => !original.includes(time) && new Date(time).getTime() <= Date.now())) errors.push(`${entry.retailer.name}：新增同步时间必须晚于当前时间`);
    return errors;
  });
  const invalidSources = data.some(entry => !entry.ownerId || !entry.warehouseIds.length);
  const blocked = invalidSources || invalidDefaults || invalidRatios || scheduleErrors.length > 0 || (enforceCap && (conflicts.length > 0 || overDefaultPools.length > 0));
  const dirty = JSON.stringify({ data, enforceCap }) !== JSON.stringify(saved);
  const visibleRetailers = data.filter(entry => entry.retailer.name.toLowerCase().includes(retailerSearch.trim().toLowerCase())
    && (filter === 'all' || (filter === 'enabled' && entry.enabled) || (filter === 'disabled' && !entry.enabled)
      || (filter === 'conflict' && entry.enabled && entry.skus.some(sku => !sku.excluded && allocationValue(sku) > 0 && allocatedTotal(totals, entry, sku.skuCode) > 100))));
  const selectableRetailers = visibleRetailers.filter(entry => entry.enabled);
  const batchSkus = catalog.filter(sku => matchSkuSearch(sku, batchSearch, batchCodes));
  const selectedActive = active.filter(entry => selectedRetailers.has(entry.retailer.id));
  const selectedCount = selectedActive.length;

  function toggleSelection(set: Set<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  function toggleRetailer(id: string) {
    setData(previous => previous.map(entry => entry.retailer.id === id ? { ...entry, enabled: !entry.enabled } : entry));
    setSelectedRetailers(previous => { const next = new Set(previous); next.delete(id); return next; });
  }

  const drawerData = data.map(entry => entry.retailer.id === drawerDraft?.retailer.id ? drawerDraft : entry);
  const drawerTotals = allocationTotals(drawerData);
  const drawerChanged = drawerDraft !== null && JSON.stringify(drawerDraft) !== JSON.stringify(data.find(entry => entry.retailer.id === expandedId));
  const drawerInvalidCount = drawerDraft?.skus.filter(sku => !sku.excluded && sku.ratio !== '' && !isValidRatio(sku.ratio)).length ?? 0;
  const drawerOverCount = drawerDraft?.enabled ? drawerDraft.skus.filter(sku => allocationValue(sku) > 0 && allocatedTotal(drawerTotals, drawerDraft, sku.skuCode) > 100).length : 0;
  const drawerBlocked = drawerInvalidCount > 0 || (enforceCap && drawerOverCount > 0);

  function openDrawer(entry: RetailerAlloc) {
    setDrawerDraft(structuredClone(entry));
    setExpandedId(entry.retailer.id);
    setSkuSearch(''); setSkuCodes([]);
  }

  function closeDrawer(confirmDiscard = true) {
    if (confirmDiscard && drawerChanged && !window.confirm('放弃本次 SKU 修改？')) return;
    setExpandedId(null); setDrawerDraft(null);
  }

  function confirmDrawer() {
    if (!drawerDraft || drawerBlocked) return;
    // 确认时重新使用完整账本校验，不能只累加当前渠道。
    const totals = allocationTotals(data.map(entry => entry.retailer.id === drawerDraft.retailer.id ? drawerDraft : entry));
    if (drawerDraft.skus.some(sku => !sku.excluded && sku.ratio !== '' && !isValidRatio(sku.ratio))
      || (enforceCap && drawerDraft.enabled && drawerDraft.skus.some(sku => allocationValue(sku) > 0 && allocatedTotal(totals, drawerDraft, sku.skuCode) > 100))) return;
    setData(previous => previous.map(entry => entry.retailer.id === drawerDraft.retailer.id ? drawerDraft : entry));
    closeDrawer(false);
    setNotice('SKU 修改已应用，请保存全部更改。');
  }

  function updateSku(id: string, code: string, update: Partial<SkuEntry>) {
    setDrawerDraft(previous => !previous || previous.retailer.id !== id ? previous : {
      ...previous, skus: previous.skus.map(sku => sku.skuCode === code ? { ...sku, ...update } : sku),
    });
    setDrawerError('');
  }

  const batchPreview = (() => {
    if (selectedActive.some(entry => !isValidRatio(batchRatios[entry.retailer.id] ?? '')) || selectedCount === 0 || selectedSkus.size === 0) return null;
    const next = data.map(entry => !entry.enabled || !selectedRetailers.has(entry.retailer.id) ? entry : {
      ...entry, skus: entry.skus.map(sku => selectedSkus.has(sku.skuCode) ? { ...sku, ratio: batchRatios[entry.retailer.id], excluded: false } : sku),
    });
    const nextTotals = allocationTotals(next);
    const over = [...selectedSkus].filter(code => next.some(entry => selectedRetailers.has(entry.retailer.id) && allocatedTotal(nextTotals, entry, code) > 100));
    return { next, totals: nextTotals, over };
  })();

  function applyDrawerBatch(id: string) {
    const selected = new Set(rowSkuSelection[id] ?? []);
    if (!selected.size || !isValidRatio(drawerRatio)) return;
    const next = drawerData.map(entry => entry.retailer.id !== id || !entry.enabled ? entry : {
      ...entry, skus: entry.skus.map(sku => selected.has(sku.skuCode) ? { ...sku, ratio: drawerRatio, excluded: false } : sku),
    });
    const nextTotals = allocationTotals(next);
    const target = next.find(entry => entry.retailer.id === id)!;
    const over = [...selected].filter(code => allocatedTotal(nextTotals, target, code) > 100);
    if (enforceCap && over.length) {
      setDrawerError('应用后超配：' + over.map(code => code + '（' + allocatedTotal(nextTotals, target, code) + '%）').join('、'));
      return;
    }
    setDrawerDraft(next.find(entry => entry.retailer.id === id) ?? null); setDrawerError('');
    setRowSkuSelection(previous => ({ ...previous, [id]: [] })); setDrawerRatio('');
  }

  function applyBatch() {
    if (!batchPreview || (enforceCap && batchPreview.over.length > 0)) return;
    setData(batchPreview.next);
    setNotice(`已更新 ${selectedCount} 个 Retailer × ${selectedSkus.size} 个 SKU，请保存更改。`);
    setBatchOpen(false);
    setSelectedSkus(new Set());
    setBatchRatios({});
  }

  const syncTargets = saved.data.filter(entry => entry.enabled && selectedRetailers.has(entry.retailer.id));
  const syncConfigured = syncTargets.reduce((sum, entry) => sum + entry.skus.filter(sku => !sku.excluded && isValidRatio(sku.ratio)).length, 0);
  const syncSkipped = syncTargets.reduce((sum, entry) => sum + entry.skus.filter(sku => sku.excluded || sku.ratio === '').length, 0);

  function syncImmediately() {
    if (syncing || syncTargets.length === 0) return;
    // 执行时再次校验已保存的完整账本，不能只检查选中渠道。
    const savedTotals = allocationTotals(saved.data);
    const invalid = saved.data.some(entry => entry.enabled && entry.skus.some(sku => !sku.excluded && sku.ratio !== '' && !isValidRatio(sku.ratio)));
    if (dirty || invalid || saved.data.some(entry => entry.enabled && (!entry.ownerId || !entry.warehouseIds.length)) || (saved.enforceCap && Object.values(savedTotals).some(total => total > 100))) {
      setSyncOpen(false);
      setNotice('无法立即同步：请先处理比例校验问题并保存全部更改。');
      return;
    }
    if (!syncConfigured) return;
    setSyncOpen(false);
    setSyncing(true);
    syncTimer.current = setTimeout(() => {
      setSyncing(false);
      setNotice(`模拟同步完成：${syncTargets.length} 个 Retailer，${syncConfigured} 项配置，跳过 ${syncSkipped} 项。`);
      syncTimer.current = null;
    }, 1200);
  }

  const bulkSourcePreview = (() => {
    const selected = data.filter(entry => entry.enabled && selectedRetailers.has(entry.retailer.id));
    if (!selected.length || (!bulkWarehouseIds.length && !bulkOwnerId)) return null;
    const next = data.map(entry => !entry.enabled || !selectedRetailers.has(entry.retailer.id) ? entry : {
      ...entry,
      ownerId: bulkOwnerId || entry.ownerId,
      warehouseIds: updateWarehouses(entry.warehouseIds, bulkWarehouseIds, bulkWarehouseMode),
    });
    const invalid = next.filter(entry => selectedRetailers.has(entry.retailer.id) && (!entry.ownerId || !entry.warehouseIds.length));
    const nextTotals = allocationTotals(next);
    const skuConflicts = introducedConflicts(totals, nextTotals);
    const nextDefaultTotals: Record<string, number> = {};
    next.forEach(entry => {
      if (!entry.enabled || !isValidRatio(entry.defaultRatio)) return;
      entry.warehouseIds.forEach(warehouseId => {
        const key = allocationKey(entry.ownerId, warehouseId, 'DEFAULT');
        nextDefaultTotals[key] = formatRatio((nextDefaultTotals[key] ?? 0) + Number(entry.defaultRatio));
      });
    });
    const defaultConflicts = introducedConflicts(defaultTotals, nextDefaultTotals);
    return { selected, next, invalid, skuConflicts, defaultConflicts };
  })();

  function applyBulkSource() {
    const preview = bulkSourcePreview;
    if (!preview || preview.invalid.length) {
      setBulkSourceError('请选择货主和至少一个来源仓库；移除后每个渠道仍须保留至少一个仓库。');
      return;
    }
    setData(preview.next);
    setBulkSourceOpen(false);
    setBulkSourceError('');
    setNotice(`已更新 ${preview.selected.length} 个 Retailer 的库存来源。${enforceCap && (preview.skuConflicts.length || preview.defaultConflicts.length) ? '请在保存前处理 SKU 或默认比例超配。' : '请保存更改。'}`);
  }

  function applySource() {
    if (!sourceOwnerId || !sourceWarehouseIds.length) {
      setSourceError('请选择货主和至少一个 WMS 来源仓库。');
      return;
    }
    setData(previous => previous.map(entry => entry.retailer.id === sourceId ? {
      ...entry, ownerId: sourceOwnerId, warehouseIds: sourceWarehouseIds,
    } : entry));
    setSourceId(null);
    setNotice('库存来源已更新，请保存更改。');
  }

  function applyBulkSchedule() {
    if (!selectedCount) return;
    if (bulkScheduleMode === 'daily' && (!bulkDailyTimes.length || bulkDailyTimes.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || new Set(bulkDailyTimes).size !== bulkDailyTimes.length)) {
      setBulkScheduleError('请填写至少一个有效的每日时间点，且不能重复。');
      return;
    }
    if (bulkScheduleMode === 'scheduled' && (!bulkSyncTimes.length || bulkSyncTimes.some(time => !time || !Number.isFinite(new Date(time).getTime()) || new Date(time).getTime() <= Date.now()) || new Set(bulkSyncTimes).size !== bulkSyncTimes.length)) {
      setBulkScheduleError('请填写至少一个未过期的指定日期时间，且不能重复。');
      return;
    }
    setData(previous => previous.map(entry => !entry.enabled || !selectedRetailers.has(entry.retailer.id) ? entry : {
      ...entry, syncMode: bulkScheduleMode,
      dailyTimes: bulkScheduleMode === 'daily' ? [...bulkDailyTimes].sort() : entry.dailyTimes,
      syncTimes: bulkScheduleMode === 'scheduled' ? [...bulkSyncTimes].sort() : entry.syncTimes,
    }));
    setBulkScheduleOpen(false);
    setBulkScheduleError('');
    setNotice(`已更新 ${selectedCount} 个 Retailer 的同步时间，请保存更改。`);
  }

  function applySchedule() {
    const original = saved.data.find(entry => entry.retailer.id === scheduleId)?.syncTimes ?? [];
    if (scheduleMode === 'daily' && (!dailyDraft.length || dailyDraft.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || new Set(dailyDraft).size !== dailyDraft.length)) {
      setScheduleError('每天定时需至少一个有效时分，且时间不能重复。'); return;
    }
    if (scheduleMode === 'scheduled' && scheduleDraft.some(time => !time || !Number.isFinite(new Date(time).getTime()))) {
      setScheduleError('请填写完整、有效的年月日时分。'); return;
    }
    if (scheduleMode === 'scheduled' && new Set(scheduleDraft).size !== scheduleDraft.length) {
      setScheduleError('同步时间不能重复。'); return;
    }
    if (scheduleMode === 'scheduled' && scheduleDraft.some(time => !original.includes(time) && new Date(time).getTime() <= Date.now())) {
      setScheduleError('新增同步时间必须晚于当前时间。'); return;
    }
    setData(previous => previous.map(entry => entry.retailer.id === scheduleId ? { ...entry, syncMode: scheduleMode, dailyTimes: [...dailyDraft].sort(), syncTimes: [...scheduleDraft].sort() } : entry));
    setScheduleId(null);
    setNotice('同步时间已更新，请保存更改。');
  }

  function saveAll() {
    if (blocked || data.some(entry => entry.syncMode === 'scheduled' && entry.syncTimes.some(time => {
      const original = saved.data.find(item => item.retailer.id === entry.retailer.id)?.syncTimes ?? [];
      return !original.includes(time) && new Date(time).getTime() <= Date.now();
    }))) {
      setNotice('保存失败：请检查比例、重复时间及已过期的新增同步时间。');
      return;
    }
    setSaved({ data, enforceCap });
    setNotice('配置已保存。');
  }

  const retailerOptions = RETAILER_OPTIONS.filter(option => option.name.toLowerCase().includes(newName.trim().toLowerCase()));

  function addRetailer(selectedName = newName, selectedType = newType) {
    const name = selectedName.trim();
    if (!name) return;
    if (data.some(entry => entry.retailer.name.toLowerCase() === name.toLowerCase())) {
      setNotice('Retailer 名称已存在，请使用其他名称。'); return;
    }
    setData(previous => [...previous, {
      retailer: { id: `custom-${Date.now()}`, name, type: selectedType }, enabled: true, defaultRatio: '', ownerId: '', warehouseIds: [], syncMode: 'scheduled', dailyTimes: [], syncTimes: [],
      skus: catalog.map(sku => ({ ...sku, ratio: '', excluded: false })),
    }]);
    setNewName(''); setRetailerDropdownOpen(false); setNewType('EDI'); setShowAdd(false);
    setNotice('Retailer 已添加。');
  }

  return <div className="mx-auto max-w-[1440px] space-y-5 pb-24 pt-5 lg:pt-6">
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--foreground)]">库存分配账本</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">演示模式 · 配置仅在当前页面生效，不执行真实同步。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={buttonClass} onClick={() => setShowOverview(value => !value)}><Settings2 className="size-4" />SKU 总览</button>
        <button className={buttonClass} onClick={() => setShowAdd(value => !value)}><Plus className="size-4" />新增 Retailer</button>
      </div>
    </header>

    <dialog ref={bulkScheduleDialog} aria-labelledby="bulk-schedule-title" onCancel={() => setBulkScheduleOpen(false)} onClose={() => setBulkScheduleOpen(false)} className="fixed inset-0 m-auto max-h-[85vh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      <h2 id="bulk-schedule-title" className="text-lg font-semibold">设置同步时间</h2>
      <p className="mt-2 text-xs text-[var(--muted)]">应用到已选 {selectedCount} 个 Retailer；会覆盖这些渠道的当前同步模式及该模式时间点，未选渠道不变。</p>
      <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="批量同步模式">{([['realtime', '实时同步'], ['daily', '每天定时'], ['scheduled', '指定日期时间']] as const).map(([mode, label]) => <button key={mode} aria-pressed={bulkScheduleMode === mode} className={bulkScheduleMode === mode ? primaryClass : buttonClass} onClick={() => { setBulkScheduleMode(mode); setBulkScheduleError(''); }}>{label}</button>)}</div>
      {bulkScheduleMode === 'daily' && <div className="space-y-2"><p className="text-xs text-[var(--muted)]">每天时间点（按本地时区，至少一个）</p>{bulkDailyTimes.map((time, index) => <div key={index} className="flex gap-2"><input className={cn(inputClass, 'min-w-0 flex-1')} type="time" step="60" aria-label={`批量每日第 ${index + 1} 个时间`} value={time} onChange={event => setBulkDailyTimes(previous => previous.map((value, i) => i === index ? event.target.value : value))} /><button className={buttonClass} aria-label={`删除批量每日第 ${index + 1} 个时间`} onClick={() => setBulkDailyTimes(previous => previous.filter((_, i) => i !== index))}><X className="size-4" /></button></div>)}<button className={buttonClass} onClick={() => setBulkDailyTimes(previous => [...previous, ''])}><Plus className="size-4" />添加时间点</button></div>}
      {bulkScheduleMode === 'scheduled' && <div className="space-y-2"><p className="text-xs text-[var(--muted)]">指定日期时间（至少一个未来时间）</p>{bulkSyncTimes.map((time, index) => <div key={index} className="flex gap-2"><input className={cn(inputClass, 'min-w-0 flex-1')} type="datetime-local" step="60" aria-label={`批量第 ${index + 1} 个预约时间`} value={time} onChange={event => setBulkSyncTimes(previous => previous.map((value, i) => i === index ? event.target.value : value))} /><button className={buttonClass} aria-label={`删除批量第 ${index + 1} 个预约时间`} onClick={() => setBulkSyncTimes(previous => previous.filter((_, i) => i !== index))}><X className="size-4" /></button></div>)}<button className={buttonClass} onClick={() => setBulkSyncTimes(previous => [...previous, ''])}><Plus className="size-4" />添加预约时间</button></div>}
      {bulkScheduleError && <p role="alert" className="mt-3 text-xs text-red-700">{bulkScheduleError}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button className={buttonClass} onClick={() => setBulkScheduleOpen(false)}>取消</button><button className={primaryClass} onClick={applyBulkSchedule}>应用到页面</button></div>
    </dialog>

    <dialog ref={bulkSourceDialog} aria-labelledby="bulk-source-title" onCancel={() => setBulkSourceOpen(false)} onClose={() => setBulkSourceOpen(false)} className="fixed inset-0 m-auto max-h-[85vh] w-[min(780px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      <h2 id="bulk-source-title" className="text-lg font-semibold">批量设置库存来源</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">仅修改所选已启用 Retailer。货主不选则保留原值；仓库按所选操作更新。</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-medium">货主<select className={inputClass} value={bulkOwnerId} onChange={event => { setBulkOwnerId(event.target.value); setBulkSourceError(''); }}><option value="">不修改货主</option>{OWNERS.map(owner => <option key={owner.id} value={owner.id}>{owner.name} · {owner.id}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-xs font-medium">仓库操作<select className={inputClass} value={bulkWarehouseMode} onChange={event => { setBulkWarehouseMode(event.target.value as WarehouseUpdateMode); setBulkSourceError(''); }}><option value="add">追加所选仓库</option><option value="replace">替换为所选仓库</option><option value="remove">移除所选仓库</option></select></label>
      </div>
      <div className="mt-5"><div className="text-xs font-medium">选择 WMS 来源仓库</div><div className="mt-2 grid gap-1 sm:grid-cols-2">{WAREHOUSES.map(warehouse => <label key={warehouse.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs hover:bg-[var(--surface-subtle)]"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={bulkWarehouseIds.includes(warehouse.id)} onChange={event => { setBulkWarehouseIds(previous => event.target.checked ? [...previous, warehouse.id] : previous.filter(id => id !== warehouse.id)); setBulkSourceError(''); }} />{warehouse.name}</label>)}</div></div>
      <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3"><h3 className="text-xs font-semibold">变更预览</h3>
        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs">{bulkSourcePreview?.selected.map(entry => {
          const changed = bulkSourcePreview.next.find(item => item.retailer.id === entry.retailer.id)!;
          return <div key={entry.retailer.id} className="flex flex-wrap gap-x-2"><span className="font-medium">{entry.retailer.name}</span><span>{OWNERS.find(owner => owner.id === entry.ownerId)?.name ?? '未设置'} → {OWNERS.find(owner => owner.id === changed.ownerId)?.name ?? '未设置'}</span><span>仓库 {entry.warehouseIds.length} → {changed.warehouseIds.length}：{changed.warehouseIds.map(id => WAREHOUSES.find(warehouse => warehouse.id === id)?.name ?? id).join('、') || '无'}</span></div>;
        })}</div>
      </div>
      {bulkSourcePreview && (bulkSourcePreview.invalid.length > 0 || bulkSourcePreview.skuConflicts.length > 0 || bulkSourcePreview.defaultConflicts.length > 0) && <p role="status" className="mt-3 text-xs text-amber-700">缺少货主／仓库 {bulkSourcePreview.invalid.length} 个 · SKU 超配库存池 {bulkSourcePreview.skuConflicts.length} 个 · 新 SKU 默认比例超配库存池 {bulkSourcePreview.defaultConflicts.length} 个，可先应用库存来源，再调整 SKU 比例后保存。</p>}
      {bulkSourceError && <p role="alert" className="mt-2 text-xs text-red-700">{bulkSourceError}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button className={buttonClass} onClick={() => setBulkSourceOpen(false)}>取消</button><button className={primaryClass} disabled={!bulkSourcePreview || !!bulkSourcePreview.invalid.length} onClick={applyBulkSource}>应用到页面</button></div>
    </dialog>

    <dialog ref={sourceDialog} aria-labelledby="source-title" onCancel={() => setSourceId(null)} onClose={() => setSourceId(null)} className="fixed inset-0 m-auto max-h-[85vh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      <h2 id="source-title" className="text-lg font-semibold">{data.find(entry => entry.retailer.id === sourceId)?.retailer.name} · 库存来源</h2>
      <p className="mt-2 text-xs text-[var(--muted)]">选择货主及 WMS 来源仓库。同步时先汇总所选仓库该货主的 SKU 可用库存，再乘以分配比例。</p>
      <label className="mt-5 flex flex-col gap-2 text-xs font-medium">货主<select className={inputClass} value={sourceOwnerId} onChange={event => { setSourceOwnerId(event.target.value); setSourceError(''); }}><option value="">选择货主</option>{OWNERS.map(owner => <option key={owner.id} value={owner.id}>{owner.name} · {owner.id}</option>)}</select></label>
      <div className="mt-5"><div className="text-xs font-medium">WMS 来源仓库（多选）</div><div className="mt-2 grid gap-1 sm:grid-cols-2">{WAREHOUSES.map(warehouse => <label key={warehouse.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs hover:bg-[var(--surface-subtle)]"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={sourceWarehouseIds.includes(warehouse.id)} onChange={event => { setSourceWarehouseIds(previous => event.target.checked ? [...previous, warehouse.id] : previous.filter(value => value !== warehouse.id)); setSourceError(''); }} />{warehouse.name}</label>)}</div></div>
      {sourceError && <p role="alert" className="mt-3 text-xs text-red-700">{sourceError}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button className={buttonClass} onClick={() => setSourceId(null)}>取消</button><button className={primaryClass} onClick={applySource}>确认</button></div>
    </dialog>

    <dialog ref={scheduleDialog} aria-labelledby="schedule-title" onCancel={() => setScheduleId(null)} onClose={() => setScheduleId(null)} className="fixed inset-0 m-auto max-h-[85vh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3"><h2 id="schedule-title" className="text-lg font-semibold">{data.find(entry => entry.retailer.id === scheduleId)?.retailer.name} · 同步时间</h2><button aria-label="关闭同步时间设置" onClick={() => setScheduleId(null)}><X className="size-4" /></button></div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">时间使用浏览器本地时区，停用渠道不执行。</p>
      <div role="group" aria-label="同步模式" className="my-4 flex flex-wrap gap-2">{([
        ['realtime', '实时同步'], ['daily', '每天定时'], ['scheduled', '指定日期时间'],
      ] as const).map(([mode, label]) => <button key={mode} aria-pressed={scheduleMode === mode} className={scheduleMode === mode ? primaryClass : buttonClass} onClick={() => { setScheduleMode(mode); setScheduleError(''); }}>{label}</button>)}</div>
      {scheduleMode === 'realtime' && <p className="my-4 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--muted)]">WMS 库存变化时，按已保存的分配比例同步。</p>}
      {scheduleMode === 'daily' && <div className="my-4 space-y-3"><p className="text-xs text-[var(--muted)]">每天在以下时间执行，可设置多个时间点。</p>{dailyDraft.map((time, index) => <div key={index} className="flex items-center gap-2"><input type="time" step="60" aria-label={`每日第 ${index + 1} 个同步时间`} className={cn(inputClass, 'flex-1')} value={time} onChange={event => { setDailyDraft(previous => previous.map((value, timeIndex) => timeIndex === index ? event.target.value : value)); setScheduleError(''); }} /><button className={buttonClass} aria-label={`删除每日第 ${index + 1} 个时间`} onClick={() => { setDailyDraft(previous => previous.filter((_, timeIndex) => timeIndex !== index)); setScheduleError(''); }}><X className="size-4" /></button></div>)}<button className={buttonClass} onClick={() => { setDailyDraft(previous => [...previous, '']); setScheduleError(''); }}><Plus className="size-4" />添加每日时间点</button></div>}
      {scheduleMode === 'scheduled' && <><div className="my-4 space-y-3">{scheduleDraft.map((time, index) => <div key={index} className="flex items-center gap-2">
        <input type="datetime-local" step="60" aria-label={`第 ${index + 1} 个同步时间`} value={time} onChange={event => { setScheduleDraft(previous => previous.map((value, timeIndex) => timeIndex === index ? event.target.value : value)); setScheduleError(''); }} className={cn(inputClass, 'min-w-0 flex-1')} />
        <button className={buttonClass} aria-label={`删除第 ${index + 1} 个同步时间`} onClick={() => { setScheduleDraft(previous => previous.filter((_, timeIndex) => timeIndex !== index)); setScheduleError(''); }}><X className="size-4" /></button>
      </div>)}{!scheduleDraft.length && <p className="rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">暂无预约时间</p>}</div>
      <button className={buttonClass} onClick={() => { setScheduleDraft(previous => [...previous, '']); setScheduleError(''); }}><Plus className="size-4" />添加同步时间</button></>}
      {scheduleError && <p role="alert" className="mt-3 text-sm text-red-700">{scheduleError}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button className={buttonClass} onClick={() => setScheduleId(null)}>取消</button><button className={primaryClass} onClick={applySchedule}>确认</button></div>
    </dialog>

    <dialog ref={syncDialog} aria-labelledby="sync-title" onCancel={() => setSyncOpen(false)} onClose={() => setSyncOpen(false)} className="fixed inset-0 m-auto w-[min(500px,calc(100vw-32px))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      <h2 id="sync-title" className="text-lg font-semibold">立即同步库存</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">按已保存配置同步以下渠道，不影响定时设置。</p>
      <div className="my-4 space-y-2 rounded-lg bg-[var(--surface-subtle)] p-4 text-sm"><p>同步范围：{syncTargets.map(entry => entry.retailer.name).join('、') || '未选择可同步渠道'}</p><p>已配置：{syncConfigured} 项 · 待配置或排除：{syncSkipped} 项（跳过）</p></div>
      {dirty && <p className="mb-4 text-sm text-amber-700">存在未保存的更改，请先保存后再同步。</p>}
      {!syncConfigured && <p className="mb-4 text-sm text-amber-700">暂无可同步配置，请先为已启用渠道设置 SKU 比例并保存。</p>}
      <div className="flex justify-end gap-2"><button className={buttonClass} onClick={() => setSyncOpen(false)}>取消</button><button className={primaryClass} disabled={dirty || !syncConfigured || syncing} onClick={syncImmediately}>确认模拟同步</button></div>
    </dialog>

    {scheduleErrors.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{scheduleErrors.map((error, index) => <p key={index}>{error}</p>)}</div>}

    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--foreground)]">
      <Info className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" /><span className="flex-1">{notice}</span>
      <button aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-4" /></button>
    </div>}

    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><ShieldCheck className="size-5" /></div>
          <div><h2 className="text-sm font-semibold text-[var(--foreground)]">跨 Retailer 分配总量约束</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">同货主、同来源仓库的 SKU 分配比例合计不超过 100%；多仓库先汇总库存，再按比例同步。</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-2"><span className="text-xs text-[var(--muted)]">{enforceCap ? '已开启' : '已关闭'}</span><Switch checked={enforceCap} onChange={() => setEnforceCap(value => !value)} label="限制同一 SKU 跨 Retailer 合计不超过 100%" /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--muted)]">
        <span>{defaultPoolCount} 个货主／仓库库存池 · 新 SKU 默认比例最高 <strong className="ml-1 text-[var(--foreground)]">{maxDefaultTotal}%</strong> · {enforceCap ? `最高占用池剩余 ${formatRatio(Math.max(0, 100 - maxDefaultTotal))}%` : '不限制跨渠道合计'}</span>
        <span>默认比例仅用于后续新 SKU，不覆盖已有配置。</span>
      </div>
      {!enforceCap && <p className="mt-3 flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="size-4 shrink-0" />约束关闭，允许跨渠道超配。</p>}
    </section>

    {(invalidSources || invalidDefaults || overDefaultPools.length > 0) && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /><div className="space-y-1">
        {invalidSources && <p>请为每个 Retailer 选择货主和至少一个 WMS 来源仓库。</p>}
        {overDefaultPools.length > 0 && <p>{overDefaultPools.length} 个货主／仓库库存池的新 SKU 默认比例超过 100%，{enforceCap ? '请调低默认比例。' : '请注意超配风险。'}</p>}
        {invalidDefaults && <p>新 SKU 默认比例须为 0–100%，最多两位小数。</p>}
      </div>
    </div>}

    {showAdd && <form onSubmit={event => event.preventDefault()} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="relative min-w-48 flex-1" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setRetailerDropdownOpen(false); }}>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">Retailer
          <input autoFocus className={inputClass} value={newName} maxLength={80} placeholder="搜索或输入 Retailer 名称" aria-expanded={retailerDropdownOpen} aria-controls="retailer-options" onFocus={() => setRetailerDropdownOpen(true)} onChange={event => { setNewName(event.target.value); setRetailerDropdownOpen(true); }} onKeyDown={event => {
            if (event.key === 'Escape') setRetailerDropdownOpen(false);
            if (event.key === 'Enter') {
              event.preventDefault();
              const exact = RETAILER_OPTIONS.find(option => option.name.toLowerCase() === newName.trim().toLowerCase());
              if (exact) addRetailer(exact.name, exact.type);
              else if (!retailerOptions.length && newName.trim()) addRetailer();
            }
          }} />
        </label>
        {retailerDropdownOpen && <div id="retailer-options" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          {retailerOptions.map(option => {
            const exists = data.some(entry => entry.retailer.name.toLowerCase() === option.name.toLowerCase());
            return <button key={option.name} type="button" disabled={exists} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => addRetailer(option.name, option.type)}><span>{option.name}</span><span className="text-xs text-[var(--muted)]">{exists ? '已添加' : option.type}</span></button>;
          })}
          {!retailerOptions.length && newName.trim() && <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-[var(--primary)] hover:bg-[var(--surface-subtle)]" onClick={() => addRetailer()}><Plus className="size-4" />新增「{newName.trim()}」</button>}
        </div>}
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">连接类型<select className={inputClass} value={newType} onChange={event => setNewType(event.target.value as RetailerType)}>{['EDI', '平台授权', '文件传输', '自定义'].map(type => <option key={type}>{type}</option>)}</select></label>
      <button type="button" className={buttonClass} onClick={() => { setShowAdd(false); setRetailerDropdownOpen(false); setNewName(''); }}>取消</button>
    </form>}

    {showOverview && <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-semibold text-[var(--foreground)]">SKU 跨渠道分配总览</h2><button aria-label="关闭 SKU 总览" onClick={() => setShowOverview(false)}><X className="size-4" /></button></div>
      <div className="max-h-80 overflow-auto"><table className="w-full min-w-[760px] text-left text-xs">
        <thead className="sticky top-0 bg-[var(--surface-subtle)] text-[var(--muted)]"><tr><th className="px-4 py-2.5">库存池（货主 / 来源仓库）</th><th className="px-4 py-2.5">SKU</th><th className="px-4 py-2.5">各渠道分配</th><th className="px-4 py-2.5 text-right">合计</th><th className="px-4 py-2.5 text-right">状态</th></tr></thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">{Object.entries(totals).map(([key, total]) => {
          const [ownerId, warehouseId, skuCode] = JSON.parse(key) as [string, string, string];
          const allocations = active.filter(entry => entry.ownerId === ownerId && entry.warehouseIds.includes(warehouseId)).flatMap(entry => {
            const sku = entry.skus.find(item => item.skuCode === skuCode);
            return sku && !sku.excluded && isValidRatio(sku.ratio) ? [entry.retailer.name + ' ' + sku.ratio + '%'] : [];
          });
          return <tr key={key}><td className="px-4 py-3">{OWNERS.find(owner => owner.id === ownerId)?.name ?? ownerId} / {WAREHOUSES.find(warehouse => warehouse.id === warehouseId)?.name ?? warehouseId}</td>
            <td className="px-4 py-3 font-mono">{skuCode}</td><td className="px-4 py-3">{allocations.join("、") || "未分配"}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{total}%</td>
            <td className="px-4 py-3 text-right">{total > 100 ? <span className="text-red-700">超出 {formatRatio(total - 100)}%</span> : total === 100 ? "已满配" : `剩余 ${formatRatio(100 - total)}%`}</td></tr>;
        })}</tbody>
      </table></div>
    </section>}

    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Retailer 分配配置</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--muted)]" /><input aria-label="搜索 Retailer" value={retailerSearch} onChange={event => setRetailerSearch(event.target.value)} placeholder="搜索 Retailer" className={cn(inputClass, 'w-44 pl-9')} /></div>
          <select aria-label="筛选渠道状态" className={inputClass} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">全部状态</option><option value="enabled">已启用</option><option value="disabled">已停用</option><option value="conflict">存在超配</option></select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--primary)]" disabled={!selectableRetailers.length}
          checked={selectableRetailers.length > 0 && selectableRetailers.every(entry => selectedRetailers.has(entry.retailer.id))}
          onChange={event => setSelectedRetailers(previous => { const next = new Set(previous); selectableRetailers.forEach(entry => event.target.checked ? next.add(entry.retailer.id) : next.delete(entry.retailer.id)); return next; })} />全选当前已启用渠道</label>
        <span className="text-[var(--muted)]">已选 {selectedCount} 个 Retailer</span>
        <button className={cn(buttonClass, 'ml-auto')} title={!selectedCount ? '请先勾选 Retailer' : '仅同步选中的 Retailer'} disabled={!selectedCount || syncing} onClick={() => setSyncOpen(true)}><RefreshCw className={cn('size-4', syncing && 'animate-spin')} />{syncing ? '模拟同步中…' : `立即同步${selectedCount ? `（${selectedCount}）` : ''}`}</button>
        <button className={buttonClass} disabled={!selectedCount} onClick={() => { setBulkScheduleMode('realtime'); setBulkDailyTimes([]); setBulkSyncTimes([]); setBulkScheduleError(''); setBulkScheduleOpen(true); }}>设置同步时间</button>
        <button className={buttonClass} disabled={!selectedCount} onClick={() => { setBulkOwnerId(''); setBulkWarehouseIds([]); setBulkWarehouseMode('add'); setBulkSourceError(''); setBulkSourceOpen(true); }}>设置库存来源</button>
        <button className={primaryClass} disabled={!selectedCount} onClick={() => { setBatchOpen(true); setBatchSearch(''); setBatchCodes([]); setBatchRatios(Object.fromEntries(selectedActive.map(entry => [entry.retailer.id, '']))); }}>设置 SKU 比例<ChevronDown className="size-3.5" /></button>
        {selectedCount > 0 && <button className="text-[var(--muted)]" onClick={() => { setSelectedRetailers(new Set()); setBatchOpen(false); }}>清空选择</button>}
      </div>

      <dialog ref={batchDialog} aria-labelledby="batch-title" onCancel={() => setBatchOpen(false)} onClose={() => setBatchOpen(false)} className="fixed inset-0 m-auto max-h-[85vh] w-[min(1040px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
        <div className="mb-3 flex items-start justify-between gap-3"><div><h3 id="batch-title" className="text-lg font-semibold">设置 SKU 比例</h3><p className="mt-1 text-xs text-[var(--muted)]">{selectedActive.map(entry => entry.retailer.name).join('、') || '请先选择已启用的 Retailer'}。每个 Retailer 可填写不同的比例，该比例应用于左侧所有选中 SKU。</p></div><button aria-label="关闭批量设置" onClick={() => setBatchOpen(false)}><X className="size-4" /></button></div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-3 py-2">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="size-4 accent-[var(--primary)]" disabled={!batchSkus.length} checked={batchSkus.length > 0 && batchSkus.every(sku => selectedSkus.has(sku.skuCode))}
                onChange={event => setSelectedSkus(previous => { const next = new Set(previous); batchSkus.forEach(sku => event.target.checked ? next.add(sku.skuCode) : next.delete(sku.skuCode)); return next; })} />全选搜索结果</label>
              <SkuSearch label="搜索批量 SKU" keyword={batchSearch} onKeywordChange={setBatchSearch} codes={batchCodes} onCodesChange={setBatchCodes} skus={catalog} />
            </div>
            <div className="max-h-56 divide-y divide-[var(--border-subtle)] overflow-y-auto">{batchSkus.map(sku => <label key={sku.skuCode} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-subtle)]">
              <input type="checkbox" checked={selectedSkus.has(sku.skuCode)} onChange={() => setSelectedSkus(previous => toggleSelection(previous, sku.skuCode))} className="size-4 accent-[var(--primary)]" />
              <span className="font-mono text-xs">{sku.skuCode}</span><span className="text-xs text-[var(--muted)]">{sku.skuName}</span>
            </label>)}{!batchSkus.length && <p className="p-5 text-center text-xs text-[var(--muted)]">没有匹配的 SKU</p>}</div>
          </div>
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between text-xs"><span>已选 {selectedSkus.size} 个 SKU</span><button className="text-[var(--muted)] underline" onClick={() => setSelectedSkus(new Set())}>清空 SKU</button></div>
            <div className="border-b border-[var(--border-subtle)] pb-2 text-sm font-semibold">分别设置 Retailer 比例</div>
            <div className="max-h-64 space-y-3 overflow-y-auto">{selectedActive.map(entry => <div key={entry.retailer.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-xs">{entry.retailer.name}</span>
              <RatioInput value={batchRatios[entry.retailer.id] ?? ''} onChange={value => setBatchRatios(previous => ({ ...previous, [entry.retailer.id]: value }))} label={`${entry.retailer.name} 批量分配比例`} invalid={!!batchRatios[entry.retailer.id] && !isValidRatio(batchRatios[entry.retailer.id])} />
            </div>)}</div>
            <p className="text-xs text-[var(--muted)]">比例范围 0–100%，最多两位小数。</p>
            <p className="text-xs leading-5 text-[var(--muted)]">将覆盖 {selectedCount * selectedSkus.size} 项配置，并取消所选项的排除状态。</p>
            {batchPreview && batchPreview.over.length > 0 && <p className="text-xs leading-5">{batchPreview.over.length ? `${batchPreview.over.length} 个 SKU 应用后将超配${enforceCap ? '，禁止应用。' : '，约束关闭，允许应用。'}` : '已通过跨渠道总量校验。'}</p>}
            {batchPreview && batchPreview.over.length > 0 && <div className="max-h-24 overflow-auto text-xs text-red-700">{batchPreview.over.map(code => <p key={code}>{code}：{Math.max(...batchPreview.next.filter(entry => selectedRetailers.has(entry.retailer.id)).map(entry => allocatedTotal(batchPreview.totals, entry, code)))}%</p>)}</div>}
            <button className={cn(primaryClass, 'w-full')} disabled={!batchPreview || (enforceCap && batchPreview.over.length > 0)} onClick={applyBatch}>应用</button>
            <button className={cn(buttonClass, 'w-full')} onClick={() => setBatchOpen(false)}>取消</button>
          </div>
        </div>
      </dialog>

      <div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-left text-[13px]">
        <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr><th className="w-12 px-4 py-3" aria-label="选择" /><th className="px-3 py-3">Retailer</th><th className="px-3 py-3">货主</th><th className="px-3 py-3">WMS 来源仓库</th><th className="px-3 py-3">同步状态</th><th className="px-3 py-3 text-right">总 SKU</th><th className="px-3 py-3 text-right">已配置 / 待配置</th><th className="px-3 py-3 text-right">超配 SKU</th><th className="px-5 py-3">新 SKU 默认比例</th><th className="px-3 py-3">同步时间</th><th className="px-3 py-3">操作</th></tr></thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">{visibleRetailers.map(entry => {
          const id = entry.retailer.id;
          const configured = entry.skus.filter(sku => !sku.excluded && isValidRatio(sku.ratio)).length;
          const pending = entry.skus.filter(sku => !sku.excluded && !sku.ratio).length;
          const over = entry.enabled ? entry.skus.filter(sku => allocationValue(sku) > 0 && allocatedTotal(totals, entry, sku.skuCode) > 100).length : 0;
          return <tr key={id} className={cn('transition hover:bg-[var(--surface-subtle)]', selectedRetailers.has(id) && 'bg-[var(--primary-soft)]')}>
              <td className="px-4 py-4"><input aria-label={`选择 ${entry.retailer.name}`} type="checkbox" disabled={!entry.enabled} checked={selectedRetailers.has(id)} onChange={() => setSelectedRetailers(previous => toggleSelection(previous, id))} className="size-4 accent-[var(--primary)]" /></td>
              <td className="px-3 py-4"><button className="text-left" aria-haspopup="dialog" onClick={() => { openDrawer(entry); }}><div className="font-semibold">{entry.retailer.name}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{entry.retailer.type}</div></button></td>
              <td className="px-3 py-4"><button className="text-left text-xs text-[var(--primary)] hover:underline" onClick={() => { setSourceOwnerId(entry.ownerId); setSourceWarehouseIds([...entry.warehouseIds]); setSourceError(''); setSourceId(id); }}>{OWNERS.find(owner => owner.id === entry.ownerId)?.name ?? '选择货主'}</button></td>
              <td className="px-3 py-4"><button className="max-w-52 text-left text-xs text-[var(--primary)] hover:underline" onClick={() => { setSourceOwnerId(entry.ownerId); setSourceWarehouseIds([...entry.warehouseIds]); setSourceError(''); setSourceId(id); }}><span className="block truncate">{entry.warehouseIds.length ? entry.warehouseIds.map(value => WAREHOUSES.find(warehouse => warehouse.id === value)?.name ?? value).join('、') : '选择仓库'}</span></button></td>
              <td className="px-3 py-4"><div className="flex items-center gap-2"><Switch checked={entry.enabled} onChange={() => toggleRetailer(id)} label={`${entry.retailer.name} 同步状态`} /><span className="text-xs text-[var(--muted)]">{entry.enabled ? '已启用' : '已停用'}</span></div></td>
              <td className="px-3 py-4 text-right tabular-nums">{entry.skus.length}</td><td className="px-3 py-4 text-right tabular-nums">{configured} <span className="text-[var(--muted)]">/ {pending}</span></td>
              <td className="px-3 py-4 text-right tabular-nums">{over > 0 ? <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="size-3" />{over}</span> : '—'}</td>
              <td className="px-5 py-4"><RatioInput label={`${entry.retailer.name} 新 SKU 默认比例`} value={entry.defaultRatio} invalid={entry.defaultRatio !== '' && !isValidRatio(entry.defaultRatio)} onChange={value => setData(previous => previous.map(item => item.retailer.id === id ? { ...item, defaultRatio: value } : item))} /></td>
              <td className="px-3 py-4"><button className="whitespace-nowrap text-left text-xs text-[var(--primary)] hover:underline" aria-label={`设置 ${entry.retailer.name} 同步时间`} onClick={() => { setScheduleDraft([...entry.syncTimes]); setDailyDraft([...entry.dailyTimes]); setScheduleMode(entry.syncMode); setScheduleError(''); setScheduleId(id); }}>
                {entry.syncMode === 'realtime' ? '实时同步 · 编辑' : entry.syncMode === 'daily' ? <><span className="block">每天定时</span><span className="mt-1 block text-[var(--muted)]">{entry.dailyTimes.join('、')} · 编辑</span></> : entry.syncTimes.length ? <><span className="block tabular-nums">{entry.syncTimes[0].replace('T', ' ')}</span><span className="mt-1 block text-[var(--muted)]">共 {entry.syncTimes.length} 个时间 · 编辑</span></> : '设置同步时间'}
              </button></td>
              <td className="px-3 py-4"><button className="whitespace-nowrap text-xs font-medium text-[var(--primary)] hover:underline" aria-haspopup="dialog" onClick={() => { openDrawer(entry); }}>配置 SKU</button></td>
            </tr>;
        })}{!visibleRetailers.length && <tr><td colSpan={11} className="py-12 text-center text-[var(--muted)]">没有匹配的 Retailer，请调整筛选条件。</td></tr>}</tbody>
      </table></div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]"><span>显示 {visibleRetailers.length} / {data.length} 个 Retailer · {catalog.length} 个 SKU</span></footer>
    </section>


    <dialog ref={drawerDialog} aria-labelledby="sku-drawer-title" onCancel={event => { event.preventDefault(); closeDrawer(); }} onClose={() => { setExpandedId(null); setDrawerDraft(null); }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(1080px,100vw)] max-w-none border-0 border-l border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/40">
      {(drawerDraft ? [drawerDraft] : []).map(entry => {
        const totals = drawerTotals;
        const id = entry.retailer.id;
          const statusFilter = skuStatusFilters[id] ?? 'all';
          const searchedSkus = entry.skus.filter(sku => matchSkuSearch(sku, skuSearch, skuCodes));
          const skuTabs = ([['all', '全部'], ['pending', '未配置'], ['over', '超配'], ['excluded', '已排除']] as const).map(([value, label]) => ({
            value, label, count: searchedSkus.filter(sku => matchSkuStatus(sku, value, entry.enabled, allocatedTotal(totals, entry, sku.skuCode))).length,
          }));
          const filteredSkus = searchedSkus.filter(sku => matchSkuStatus(sku, statusFilter, entry.enabled, allocatedTotal(totals, entry, sku.skuCode)));

        return <div key={id} className="flex h-full flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
            <div><h2 id="sku-drawer-title" className="text-lg font-semibold">{entry.retailer.name} · SKU 分配</h2><p className="mt-1 text-xs text-[var(--muted)]">{entry.enabled ? '已启用' : '已停用'} · 留空跳过同步，0% 为零分配，排除项不同步。</p></div>
            <button className={buttonClass} aria-label="关闭 SKU 配置" onClick={() => closeDrawer()}><X className="size-4" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mb-3"><SkuSearch key={id} label="搜索渠道 SKU" keyword={skuSearch} onKeywordChange={setSkuSearch} codes={skuCodes} onCodesChange={setSkuCodes} skus={entry.skus} /></div>
              <div role="group" aria-label={`${entry.retailer.name} SKU 状态筛选`} className="mb-3 flex flex-wrap gap-1 border-b border-[var(--border)]">
                {skuTabs.map(tab => <button key={tab.value} aria-pressed={statusFilter === tab.value} onClick={() => setSkuStatusFilters(previous => ({ ...previous, [id]: tab.value }))}
                  className={cn('border-b-2 px-3 py-2 text-xs font-medium transition-colors', statusFilter === tab.value ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]')}>
                  {tab.label}<span className="ml-1.5 text-[11px] tabular-nums">{tab.count}</span>
                </button>)}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--primary)]" disabled={!entry.enabled || !filteredSkus.length}
                  checked={filteredSkus.length > 0 && filteredSkus.every(sku => (rowSkuSelection[id] ?? []).includes(sku.skuCode))}
                  onChange={event => setRowSkuSelection(previous => { const next = new Set(previous[id] ?? []); filteredSkus.forEach(sku => event.target.checked ? next.add(sku.skuCode) : next.delete(sku.skuCode)); return { ...previous, [id]: [...next] }; })} />全选搜索结果</label>
                <span className="text-[var(--muted)]">已选 {(rowSkuSelection[id] ?? []).length} 个 SKU</span>
                <RatioInput value={drawerRatio} onChange={value => { setDrawerRatio(value); setDrawerError(''); }} label="所选 SKU 批量比例" disabled={!entry.enabled || !(rowSkuSelection[id] ?? []).length} invalid={drawerRatio !== '' && !isValidRatio(drawerRatio)} />
                <button className={buttonClass} disabled={!entry.enabled || !(rowSkuSelection[id] ?? []).length || !isValidRatio(drawerRatio)} onClick={() => applyDrawerBatch(id)}>应用比例</button>
                {!!(rowSkuSelection[id] ?? []).length && <button className="text-[var(--muted)]" onClick={() => setRowSkuSelection(previous => ({ ...previous, [id]: [] }))}>清空 SKU 选择</button>}
              </div>
              {drawerError && <p role="alert" className="mb-3 text-xs text-red-700">{drawerError}</p>}
              {!entry.enabled && <p className="mb-3 text-xs text-[var(--muted)]">渠道已停用</p>}
              <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]"><table className="w-full min-w-[800px] text-xs">
                <thead className="sticky top-0 bg-[var(--surface-subtle)] text-[var(--muted)]"><tr><th className="w-10 px-4 py-2.5" aria-label="选择 SKU" /><th className="px-4 py-2.5">SKU / 商品名称</th><th className="px-3 py-2.5">本渠道比例</th><th className="px-3 py-2.5 text-right">其他渠道占用</th><th className="px-3 py-2.5 text-right">本渠道可分配上限</th><th className="px-3 py-2.5 text-center">状态</th><th className="px-4 py-2.5 text-right">操作</th></tr></thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">{filteredSkus.map(sku => {
                  const other = otherAllocation(allocatedTotal(totals, entry, sku.skuCode), entry.enabled, sku);
                  const invalid = !sku.excluded && sku.ratio !== '' && !isValidRatio(sku.ratio);
                  const isOver = entry.enabled && !sku.excluded && isValidRatio(sku.ratio) && Number(sku.ratio) > 0 && allocatedTotal(totals, entry, sku.skuCode) > 100;
                  return <tr key={sku.skuCode} className={cn(invalid || (enforceCap && isOver) ? 'bg-red-50/50' : '')}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`选择 ${entry.retailer.name} ${sku.skuCode}`} disabled={!entry.enabled} className="size-4 accent-[var(--primary)]" checked={(rowSkuSelection[id] ?? []).includes(sku.skuCode)} onChange={() => setRowSkuSelection(previous => ({ ...previous, [id]: [...toggleSelection(new Set(previous[id] ?? []), sku.skuCode)] }))} /></td>
                    <td className="px-4 py-3"><div className="font-mono font-medium">{sku.skuCode}</div><div className="mt-1 text-[var(--muted)]">{sku.skuName}</div></td>
                    <td className="px-3 py-3"><RatioInput label={`${entry.retailer.name} ${sku.skuCode} 分配比例`} value={sku.ratio} disabled={!entry.enabled || sku.excluded} invalid={invalid || (enforceCap && isOver)} onChange={value => updateSku(id, sku.skuCode, { ratio: value })} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{other}%</td><td className="px-3 py-3 text-right tabular-nums">{enforceCap ? `${formatRatio(Math.max(0, 100 - other))}%` : '不限制合计'}</td>
                    <td className="px-3 py-3 text-center">{sku.excluded ? '已排除' : invalid ? <span className="text-red-700">比例无效</span> : isOver ? <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="size-3" />超配</span> : sku.ratio === '' ? <span className="text-[var(--muted)]">待配置</span> : <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3 text-green-700" />已配置</span>}</td>
                    <td className="px-4 py-3 text-right"><button disabled={!entry.enabled} className="text-[var(--muted)] underline underline-offset-4 disabled:opacity-40" onClick={() => updateSku(id, sku.skuCode, { excluded: !sku.excluded })}>{sku.excluded ? '恢复' : '排除'}</button></td>
                  </tr>;
                })}{!filteredSkus.length && <tr><td colSpan={7} className="py-8 text-center text-[var(--muted)]">没有匹配的 SKU</td></tr>}</tbody>
              </table></div>

          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
            <span className="text-xs text-[var(--muted)]">{drawerInvalidCount > 0 ? drawerInvalidCount + ' 个 SKU 比例无效' : drawerOverCount > 0 ? drawerOverCount + (enforceCap ? ' 个 SKU 超配，请调整后确认' : ' 个 SKU 超配，约束关闭可确认') : drawerChanged ? '确认后应用到页面，仍需保存全部更改' : '暂无修改'}</span>
            <div className="flex items-center gap-2"><button className={buttonClass} onClick={() => closeDrawer(false)}>取消</button><button className={primaryClass} disabled={!drawerChanged || drawerBlocked} onClick={confirmDrawer}>确认修改</button></div>
          </footer>
        </div>;
      })}
    </dialog>

    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-[13px]"><span className={cn('size-2 rounded-full', dirty ? 'bg-amber-500' : 'bg-slate-300')} />{dirty ? '有未保存的更改' : '所有更改已保存'}{blocked && <span className="text-xs text-amber-700">· 请先处理校验问题</span>}</div>
      <div className="flex items-center gap-2"><button className={buttonClass} disabled={!dirty} onClick={() => {
        if (!window.confirm('确定放弃全部未保存的更改吗？')) return;
        setData(saved.data); setEnforceCap(saved.enforceCap);
        setCatalog(saved.data[0]?.skus.map(({ skuCode, skuName }) => ({ skuCode, skuName })) ?? SKU_POOL);
        setSelectedRetailers(new Set()); setSelectedSkus(new Set()); setRowSkuSelection({}); setBatchOpen(false); setNotice('已恢复到上次保存的配置。');
      }}>放弃更改</button><button className={primaryClass} disabled={!dirty || blocked} onClick={saveAll}><Save className="size-4" />保存全部更改</button></div>
    </div>
  </div>;
}
