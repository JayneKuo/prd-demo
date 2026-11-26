'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { warehouses } from '@/lib/mock-data/warehouses';
import { merchants } from '@/lib/tenant-context';
import { mockProducts } from '@/lib/mock-data/products';
import { suppliers } from '@/lib/mock-data/suppliers';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { connectionStorageKey, parseConnections, type Connection, type ProductMapping } from '@/lib/amazon-connections';
import {
  readChannelSkuMappings,
  saveChannelSkuMappings,
  platformProducts,
} from '@/lib/channel-sku-mappings';
import type { FbaPlanLine, FbaSnapshot } from '@/features/oms/fba';
import { fbaConnectionIssue, fbaInput, useFbaDomain } from '@/features/oms/fba-workspace';

// ─── 样式 ──────────────────────────────────────────────────────────────────────

const compactCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]';

const inputCls = [
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'px-3 py-2 text-[13px] text-[var(--foreground)]',
  'placeholder:text-[var(--muted)] transition',
  'focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]',
].join(' ');

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── 商品搜索弹窗（与销售订单新建页统一样式）──────────────────────────────────

type CatalogItem = { sku: string; sellerSku: string; fnsku: string; omsVariantId: string; title: string; available: number | null };

/** 从亚马逊 Listing 中选择映射，不手填 */
function InlineMappingForm({
  item, companyId, merchantId, connection, site, existingMappings,
  onSaved, onCancel,
}: {
  item: CatalogItem;
  companyId: string; merchantId: string; connection: Connection; site: string;
  existingMappings: ProductMapping[];
  onSaved: (updated: ProductMapping[]) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 60); }, []);
  const filtered = useMemo(() => {
    if (!query.trim()) return platformProducts;
    const q = query.toLowerCase();
    return platformProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.externalSku.toLowerCase().includes(q) ||
      p.asin.toLowerCase().includes(q) ||
      (p.fnsku && p.fnsku.toLowerCase().includes(q))
    );
  }, [query]);
  const selected = platformProducts.find(p => p.externalSku === selectedId);
  const save = () => {
    if (!selected) { setError('请选择要关联的亚马逊商品'); return; }
    const conflict = existingMappings.find(m => m.externalSku === selected.externalSku && m.omsVariantId !== item.omsVariantId);
    if (conflict) { setError('该亚马逊商品已被其他 OMS 商品使用'); return; }
    const updated = [...existingMappings.filter(m => m.omsVariantId !== item.omsVariantId), { externalSku: selected.externalSku, omsVariantId: item.omsVariantId, asin: selected.asin, fnsku: selected.fnsku }];
    try { saveChannelSkuMappings(companyId, merchantId, connection, site, updated); onSaved(updated); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试'); }
  };
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-[var(--surface)]/90 backdrop-blur-[2px] pt-8">
      <div className="mx-6 w-full max-w-[480px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h4 className="text-[14px] font-semibold">关联亚马逊商品</h4>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">从 Seller 账号商品目录中选择对应的 Amazon Listing</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-1.5">
              <Package className="size-3.5 shrink-0 text-[var(--muted)]" />
              <span className="text-[12px] font-medium">{item.title}</span>
              <span className="font-mono text-[11px] text-[var(--muted)]">· {item.sku}</span>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--muted)]" />
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索商品名、Seller SKU、ASIN…" className={cn(inputCls, 'pl-9 py-1.5 text-[12px]')} />
          </div>
        </div>
        <div className="max-h-[280px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filtered.length === 0
            ? <p className="py-8 text-center text-[12px] text-[var(--muted)]">暂无匹配的 Amazon 商品</p>
            : filtered.map(p => {
              const isSel = selectedId === p.externalSku;
              return (
                <label key={p.externalSku} className={cn('flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-subtle)] select-none', isSel && 'bg-[var(--primary-soft)]')}>
                  <input type="radio" name="amazon-product" checked={isSel} onChange={() => { setSelectedId(p.externalSku); setError(''); }} className="mt-0.5 size-3.5 accent-[var(--primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{p.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--muted)]">
                      <span>Seller SKU: <span className="font-mono font-medium text-[var(--foreground)]">{p.externalSku}</span></span>
                      <span>FNSKU: <span className="font-mono font-medium text-[var(--foreground)]">{p.fnsku}</span></span>
                      <span>ASIN: <span className="font-mono">{p.asin}</span></span>
                    </div>
                  </div>
                  {isSel && <Check className="size-4 shrink-0 text-[var(--primary)]" />}
                </label>
              );
            })
          }
        </div>
        {selected && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--primary-soft)]/40 px-4 py-3 text-[12px]">
            <p className="font-medium text-[var(--primary)]">将建立映射：</p>
            <p className="mt-1 text-[var(--muted)]"><span className="font-mono">{item.sku}</span> → Seller SKU <span className="font-mono font-medium text-[var(--foreground)]">{selected.externalSku}</span>，FNSKU <span className="font-mono font-medium text-[var(--foreground)]">{selected.fnsku}</span></p>
          </div>
        )}
        {error && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-[12px] text-[var(--danger)]">{error}</p>}
        <div className="flex gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
          <button type="button" onClick={onCancel} className="h-8 flex-1 rounded-lg border border-[var(--border)] text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</button>
          <button type="button" onClick={save} disabled={!selected} className="h-8 flex-[2] rounded-lg bg-[var(--primary)] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 transition">{selected ? '确认关联' : '请选择商品'}</button>
        </div>
      </div>
    </div>
  );
}

function ProductPickerModal({
  open, onClose, items, existingSkus, onConfirm,
  companyId, merchantId, connection, site, currentMappings, onMappingAdded,
}: {
  open: boolean;
  onClose: () => void;
  items: CatalogItem[];
  existingSkus: Set<string>;
  onConfirm: (selected: CatalogItem[]) => void;
  companyId: string;
  merchantId: string;
  connection: Connection | undefined;
  site: string;
  currentMappings: ProductMapping[];
  onMappingAdded: (updated: ProductMapping[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mappingTarget, setMappingTarget] = useState<CatalogItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelected(new Set()); setMappingTarget(null); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item => item.sku.toLowerCase().includes(q) || item.sellerSku.toLowerCase().includes(q) || item.title.toLowerCase().includes(q));
  }, [items, query]);

  const alreadyAdded = (sku: string) => existingSkus.has(sku);
  const toggle = (sku: string) => {
    const item = items.find(i => i.sku === sku);
    if (alreadyAdded(sku) || !item?.sellerSku) return;
    setSelected(prev => { const n = new Set(prev); n.has(sku) ? n.delete(sku) : n.add(sku); return n; });
  };
  const available = filtered.filter(item => !alreadyAdded(item.sku) && !!item.sellerSku);
  const allChecked = available.length > 0 && available.every(item => selected.has(item.sku));
  const toggleAll = () => allChecked
    ? setSelected(prev => { const n = new Set(prev); available.forEach(item => n.delete(item.sku)); return n; })
    : setSelected(prev => { const n = new Set(prev); available.forEach(item => n.add(item.sku)); return n; });

  const handleConfirm = () => {
    onConfirm(items.filter(item => selected.has(item.sku)));
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="relative mx-4 flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: 'min(82vh, 680px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 嵌套映射表单（浮层） */}
        {mappingTarget && connection && (
          <InlineMappingForm
            item={mappingTarget}
            companyId={companyId} merchantId={merchantId}
            connection={connection} site={site}
            existingMappings={currentMappings}
            onSaved={updated => { onMappingAdded(updated); setMappingTarget(null); }}
            onCancel={() => setMappingTarget(null)}
          />
        )}

        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">选择 OMS 商品</h3>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition">
            <X className="size-4" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索 OMS SKU / Seller SKU / 商品名..."
              className={cn(inputCls, 'pl-9')}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 列表表头 */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-3.5 accent-[var(--primary)]" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">OMS 商品</span>
          <span className="w-32 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Seller SKU（MSKU）</span>
          <span className="w-28 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">FNSKU</span>
          <span className="w-16 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">可用</span>
        </div>

        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Package className="size-8 text-[var(--border)]" />
              <p className="text-[13px] text-[var(--muted)]">未找到匹配商品</p>
              <p className="text-[12px] text-[var(--muted-foreground)]">OMS 商品库中暂无该商品，请先在商品中心添加</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(item => {
                const added = alreadyAdded(item.sku);
                const checked = selected.has(item.sku);
                const hasMapping = !!item.sellerSku;
                return (
                  <div
                    key={item.sku}
                    className={cn(
                      'flex items-center gap-3 px-5 py-2.5 transition-colors',
                      (added || !hasMapping) ? 'opacity-60' : 'hover:bg-[var(--surface-subtle)]',
                      checked && !added && hasMapping && 'bg-[var(--primary-soft)]',
                    )}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(item.sku)} disabled={added || !hasMapping} className="size-3.5 shrink-0 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed" />
                    <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)] flex items-center justify-center">
                      <Package className="size-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer select-none" onClick={() => toggle(item.sku)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</span>
                        {added && <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>}
                        {!hasMapping && !added && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">未配置映射</span>}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{item.sku}</p>
                    </div>
                    <div className="w-32 text-right">
                      {hasMapping
                        ? <span className="font-mono text-[12px] text-[var(--foreground)]">{item.sellerSku}</span>
                        : (
                          <button
                            type="button"
                            disabled={!connection}
                            onClick={e => { e.stopPropagation(); setMappingTarget(item); }}
                            className="inline-flex h-6 items-center gap-1 rounded-md bg-amber-50 px-2 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            配置映射
                          </button>
                        )
                      }
                    </div>
                    <div className="w-28 text-right">
                      {item.fnsku
                        ? <span className="font-mono text-[12px] text-[var(--foreground)]">{item.fnsku}</span>
                        : <span className="text-[11px] text-[var(--muted)]">—</span>
                      }
                    </div>
                    <div className="w-16 text-right">
                      {item.available !== null
                        ? <span className="text-[13px] font-medium text-[var(--foreground)]">{item.available}</span>
                        : <span className="text-[12px] text-[var(--muted)]">—</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 未映射提示条 */}
        {filtered.some(item => !item.sellerSku && !existingSkus.has(item.sku)) && (
          <div className="border-t border-amber-200 bg-amber-50/80 px-5 py-2.5 text-[12px] text-amber-800">
            ⚠️ 点击橙色"配置映射"按钮可直接在此处配置 Seller SKU / FNSKU，无需离开页面
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[12px] text-[var(--muted)]">
            {selected.size > 0 ? `已选 ${selected.size} 个商品` : `共 ${filtered.length} 个商品`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">取消</button>
            <button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 transition">
              添加{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

const warehouseName = (id: string) => warehouses.find(w => w.id === id)?.name ?? id;
const merchantName = (id: string) => merchants.find(m => m.id === id)?.name ?? id;
const variants = mockProducts.flatMap(p => p.variants.map(v => ({ ...v, title: p.title })));

export default function NewDeliveryPlanPage() {
  const router = useRouter();
  const domain = useFbaDomain();

  const [merchantId, setMerchant] = useState(domain.snapshots.length === 1 ? domain.snapshots[0].merchantId : '');
  const [connectionId, setConnection] = useState('');
  const [sourceType, setSourceType] = useState<'warehouse' | 'supplier'>('warehouse');
  const [warehouseId, setWarehouse] = useState('');
  // 供应商：先选已有，可选"自定义"再手动输入
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const supplierName = selectedSupplierId === '__custom'
    ? customSupplierName
    : (suppliers.find(s => s.id === selectedSupplierId)?.name ?? '');
  const [plannedShipDate, setPlannedShipDate] = useState('');
  const [note, setNote] = useState('');
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [mappingError, setMappingError] = useState('');

  // 已选商品行（SKU → quantity）
  const [lines, setLines] = useState<{ sku: string; sellerSku: string; fnsku: string; omsVariantId: string; qty: number }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const snapshot = domain.snapshots.find(s => s.merchantId === merchantId);
  const connections = domain.configs[merchantId] ?? [];
  const connection = connections.find(c => c.id === connectionId);
  const site = connection?.businesses.fba?.site ?? '';
  const issue = fbaConnectionIssue(connection);

  useEffect(() => {
    try { setMappings(snapshot && connection ? readChannelSkuMappings(snapshot.companyId, snapshot.merchantId, connection, site) : []); setMappingError(''); }
    catch { setMappings([]); setMappingError('商品映射无法读取，请检查映射配置。'); }
    setLines([]); // clear lines when connection/source changes
  }, [snapshot?.companyId, snapshot?.merchantId, connection, site]);

  // 弹窗候选商品
  const catalogItems = useMemo((): CatalogItem[] => {
    if (sourceType === 'warehouse') {
      const stocks = snapshot?.stocks.filter(s => s.pool === 'warehouse' && (!warehouseId || s.warehouseId === warehouseId)) ?? [];
      return stocks.map(stock => {
        const variant = variants.find(v => v.sku === stock.sku);
        const mapping = mappings.find(m => m.omsVariantId === variant?.id);
        return {
          sku: stock.sku,
          sellerSku: mapping?.externalSku ?? '',
          fnsku: mapping?.fnsku ?? '',
          omsVariantId: variant?.id ?? '',
          title: variant?.title ?? stock.sku,
          available: stock.onHand - stock.reserved - stock.unfulfillable,
        };
      });
    } else {
      // 供应商直发：展示全部 OMS 商品，有映射的可选，无映射的显示入口
      return variants.map(v => {
        const mapping = mappings.find(m => m.omsVariantId === v.id);
        return { sku: v.sku, sellerSku: mapping?.externalSku ?? '', fnsku: mapping?.fnsku ?? '', omsVariantId: v.id, title: v.title, available: null };
      });
    }
  }, [snapshot, warehouseId, sourceType, mappings]);

  const existingSkus = useMemo(() => new Set(lines.map(l => l.sku)), [lines]);

  const handleAddProducts = (selected: CatalogItem[]) => {
    setLines(prev => [...prev, ...selected.map(item => ({ sku: item.sku, sellerSku: item.sellerSku, fnsku: item.fnsku, omsVariantId: item.omsVariantId, qty: 0 }))]);
  };

  const updateQty = (sku: string, qty: number) => setLines(prev => prev.map(l => l.sku === sku ? { ...l, qty } : l));
  const removeLine = (sku: string) => setLines(prev => prev.filter(l => l.sku !== sku));

  const readyLines = lines.filter(l => l.qty > 0);
  const canSubmit = !domain.busy && domain.writable && !issue && readyLines.length > 0 && (sourceType === 'warehouse' ? !!warehouseId : !!supplierName.trim());

  const handleSubmit = async () => {
    if (!snapshot || !connection) return;
    const planLines: FbaPlanLine[] = readyLines.map(l => ({ id: `line:${l.sku}`, sku: l.sku, omsVariantId: l.omsVariantId, sellerSku: l.sellerSku, fnsku: l.fnsku || undefined, quantity: l.qty }));
    const command = sourceType === 'supplier'
      ? { type: 'fba_create_delivery_plan' as const, connectionId, site, supplierName, lines: planLines, plannedShipDate: plannedShipDate || undefined, note: note || undefined }
      : { type: 'fba_create_delivery_plan' as const, connectionId, site, warehouseId, lines: planLines, plannedShipDate: plannedShipDate || undefined, note: note || undefined };

    const ok = await domain.execute(snapshot, command, connectionId);
    if (ok) {
      const updated = domain.snapshots.find(s => s.merchantId === merchantId) as FbaSnapshot;
      const newPlan = updated?.deliveryPlans?.at(-1);
      router.push(newPlan ? `/dashboard/fba/delivery-plans/${encodeURIComponent(newPlan.id)}` : '/dashboard/fba/delivery-plans');
    }
  };

  if (!hasCapability(currentSession.role, 'inventory:write')) {
    return <p role="alert" className="p-6">当前角色没有创建权限。</p>;
  }

  return (
    <div className="mx-auto max-w-[1280px] pb-20 pt-5 lg:pt-6">
      <Link href="/dashboard/fba/delivery-plans" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />返回发货计划列表
      </Link>
      <h1 className="mb-5 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">新建发货计划</h1>

      {/* 基本设置 */}
      <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-[14px] font-semibold">基本设置</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Field label="商家" required>
            <select className={compactCls} value={merchantId} onChange={e => { setMerchant(e.target.value); setConnection(''); setWarehouse(''); setLines([]); }}>
              <option value="">选择商家</option>
              {domain.snapshots.map(s => <option key={s.merchantId} value={s.merchantId}>{merchantName(s.merchantId)}</option>)}
            </select>
          </Field>
          <Field label="Amazon Seller / 站点" required>
            <select className={compactCls} value={connectionId} onChange={e => { setConnection(e.target.value); setLines([]); }}>
              <option value="">选择 Seller 账号</option>
              {connections.filter(c => c.identity === 'seller').map(c => <option key={c.id} value={c.id}>{c.name} / {c.businesses.fba?.site || '—'}</option>)}
            </select>
          </Field>
          <Field label="发货来源" required>
            <select className={compactCls} value={sourceType} onChange={e => { setSourceType(e.target.value as 'warehouse' | 'supplier'); setWarehouse(''); setSelectedSupplierId(''); setCustomSupplierName(''); setLines([]); }}>
              <option value="warehouse">自有仓发货</option>
              <option value="supplier">供应商直发 Amazon FC</option>
            </select>
          </Field>
          {sourceType === 'warehouse' ? (
            <Field label="来源仓库" required>
              <select className={compactCls} value={warehouseId} onChange={e => { setWarehouse(e.target.value); setLines([]); }}>
                <option value="">选择仓库</option>
                {Array.from(new Set(snapshot?.stocks.filter(s => s.pool === 'warehouse').map(s => s.warehouseId))).map(id => <option key={id} value={id}>{warehouseName(id)}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="供应商" required>
              <select className={compactCls} value={selectedSupplierId} onChange={e => { setSelectedSupplierId(e.target.value); setCustomSupplierName(''); }}>
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}（{s.country}）</option>)}
                <option value="__custom">+ 新供应商（手动输入）</option>
              </select>
              {selectedSupplierId === '__custom' && (
                <input className={`${compactCls} mt-1`} placeholder="输入供应商名称" value={customSupplierName} onChange={e => setCustomSupplierName(e.target.value)} autoFocus />
              )}
              {selectedSupplierId && selectedSupplierId !== '__custom' && (() => {
                const sup = suppliers.find(s => s.id === selectedSupplierId);
                return sup ? <p className="mt-1 text-[11px] text-[var(--muted)]">联系人：{sup.contact} · {sup.email}</p> : null;
              })()}
            </Field>
          )}
          <Field label="预计发货时间">
            <input className={compactCls} type="date" value={plannedShipDate} onChange={e => setPlannedShipDate(e.target.value)} />
          </Field>
          <Field label="备注">
            <input className={compactCls} placeholder="内部备注（选填）" value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </div>
        {(issue || mappingError) && (
          <p role="alert" className="mt-3 text-[13px] text-[var(--muted)]">⚠️ {issue || mappingError}</p>
        )}
      </section>

      {/* 发货商品 */}
      <section className="mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold">发货商品</h2>
            <span className="text-[12px] text-[var(--muted)]">
              {lines.length > 0 ? `${lines.filter(l => l.qty > 0).length} 种 · ${lines.reduce((n, l) => n + (l.qty > 0 ? l.qty : 0), 0)} 件` : '尚未添加商品'}
            </span>
          </div>
          <button
            type="button"
            disabled={!connectionId || (sourceType === 'warehouse' && !warehouseId) || (sourceType === 'supplier' && !supplierName.trim()) || !!issue}
            onClick={() => setPickerOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3.5" />添加 OMS 商品
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[13px] text-[var(--muted)]">
              {!connectionId ? '请先选择 Seller / 站点' : sourceType === 'warehouse' && !warehouseId ? '请先选择来源仓库' : sourceType === 'supplier' && !supplierName.trim() ? '请先选择供应商' : '点击右上角"添加 OMS 商品"选择要补货的商品'}
            </p>
            {connectionId && (sourceType !== 'warehouse' || warehouseId) && (sourceType !== 'supplier' || supplierName.trim()) && !issue && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)]"
              >
                <Plus className="size-3.5" />添加 OMS 商品
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-2.5">OMS SKU / 商品</th>
                  <th className="px-5 py-2.5">Seller SKU（MSKU）</th>
                  <th className="px-5 py-2.5">FNSKU</th>
                  <th className="px-5 py-2.5">计划发货数量</th>
                  <th className="w-10 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {lines.map(line => {
                  const variant = variants.find(v => v.sku === line.sku);
                  return (
                    <tr key={line.sku} className={cn('transition-colors hover:bg-[var(--surface-subtle)]', line.qty > 0 && 'bg-[var(--primary-soft)]/15')}>
                      <td className="px-5 py-3">
                        <div className="font-medium">{line.sku}</div>
                        {variant?.title && <div className="text-[11px] text-[var(--muted)]">{variant.title}</div>}
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-[var(--muted)]">
                        {line.sellerSku || <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">待映射</span>}
                      </td>
                      <td className="px-5 py-3">
                        {line.fnsku ? <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[12px] ring-1 ring-inset ring-[var(--border-subtle)]">{line.fnsku}</span> : <span className="text-[12px] text-[var(--muted)]">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`${line.sku} 发货数量`}
                          type="number" min="1"
                          value={line.qty || ''}
                          placeholder="填写数量"
                          onChange={e => updateQty(line.sku, Number(e.target.value))}
                          className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => removeLine(line.sku)} className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 商品选择弹窗 */}
      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={catalogItems}
        existingSkus={existingSkus}
        onConfirm={handleAddProducts}
        companyId={snapshot?.companyId ?? ''}
        merchantId={snapshot?.merchantId ?? ''}
        connection={connection}
        site={site}
        currentMappings={mappings}
        onMappingAdded={updated => setMappings(updated)}
      />

      {/* 底部操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3 shadow-[0_-1px_12px_rgb(0,0,0,0.06)]">
        <div className="text-[13px] text-[var(--muted)]">
          {readyLines.length > 0
            ? <span>已选 <strong>{readyLines.length}</strong> 种商品 · 共 <strong>{readyLines.reduce((n, l) => n + l.qty, 0)}</strong> 件</span>
            : '请添加发货商品并填写数量'}
        </div>
        <div className="flex items-center gap-3">
          {domain.error && <p className="text-[13px] text-[var(--danger)]">{domain.error}</p>}
          <Link href="/dashboard/fba/delivery-plans" className="flex h-9 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</Link>
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {domain.busy ? '保存中…' : '保存草稿'}
          </button>
        </div>
      </div>
    </div>
  );
}
