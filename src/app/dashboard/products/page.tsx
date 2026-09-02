'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Download, Upload, MoreHorizontal, X, ChevronRight, Copy, SlidersHorizontal } from 'lucide-react';
import { mockProducts, getProductPriceRange, getProductTotalStock, type Product, type ProductVariant } from '@/lib/mock-data/products';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import { PublishDialog } from '@/components/products/publish-dialog';

// ─── Tab 定义（按商品状态，不含"审核中"单独 tab，用"待上线"合并草稿+审核） ──
const tabs = [
  { key: 'all',   label: '全部',   filter: (_p: Product) => true },
  { key: 'live',  label: '销售中', filter: (p: Product) => p.status === '已发布' },
  { key: 'draft', label: '草稿',   filter: (p: Product) => p.status === '草稿' || p.status === '审核中' },
  { key: 'off',   label: '已下架', filter: (p: Product) => p.status === '下架' },
];

const channelColors: Record<string, string> = {
  Shopify: 'bg-green-50 text-green-700 ring-green-200',
  SHEIN:   'bg-pink-50  text-pink-700  ring-pink-200',
};

const CHANNELS = ['Shopify', 'SHEIN'] as const;

export default function ProductsPage() {
  const router = useRouter();

  const [activeTab,     setActiveTab]     = useState('all');
  const [search,        setSearch]        = useState('');
  const [categoryFilter,setCategoryFilter]= useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [vendorFilter,  setVendorFilter]  = useState('');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set());
  const [publishTarget, setPublishTarget] = useState<Product | null>(null);
  const [showFilters,   setShowFilters]   = useState(false);

  const categories = useMemo(() => Array.from(new Set(mockProducts.map((p) => p.category))).sort(), []);
  const vendors    = useMemo(() => Array.from(new Set(mockProducts.map((p) => p.vendor).filter(Boolean))).sort() as string[], []);

  const tabFilter = tabs.find((t) => t.key === activeTab)?.filter ?? (() => true);

  const filtered = useMemo(() => {
    return mockProducts.filter((p) => {
      if (!tabFilter(p)) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (vendorFilter   && p.vendor   !== vendorFilter)   return false;
      if (channelFilter) {
        const ok = p.channelPublishes.some((c) => c.channel === channelFilter && c.status === '已发布');
        if (!ok) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matchTop     = p.title.toLowerCase().includes(q)
                          || p.parentSku.toLowerCase().includes(q)
                          || p.id.toLowerCase().includes(q);
        const matchVariant = p.variants.some(
          (v) => v.sku.toLowerCase().includes(q) || v.id.toLowerCase().includes(q)
        );
        if (!matchTop && !matchVariant) return false;
      }
      return true;
    });
  }, [activeTab, categoryFilter, vendorFilter, channelFilter, search, tabFilter]);

  const counts = useMemo(() => ({
    all:   mockProducts.length,
    live:  mockProducts.filter((p) => p.status === '已发布').length,
    draft: mockProducts.filter((p) => p.status === '草稿' || p.status === '审核中').length,
    off:   mockProducts.filter((p) => p.status === '下架').length,
  }), []);

  const toggleRow    = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggleExpand = (id: string) => setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const activeFilterCount = [categoryFilter, channelFilter, vendorFilter].filter(Boolean).length;

  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setChannelFilter(''); setVendorFilter(''); };

  const COL_COUNT = 10;

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">商品中心</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">管理商品信息、多变体配置，并发布到 Shopify、SHEIN 等渠道</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Upload className="size-3.5" />导入
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            <Download className="size-3.5" />导出
          </button>
          <Link
            href="/dashboard/products/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90"
          >
            <Plus className="size-3.5" />新建商品
          </Link>
        </div>
      </div>

      {/* ── Batch bar ────────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedIds.size} 件商品</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { const f = mockProducts.find((p) => selectedIds.has(p.id)); if (f) setPublishTarget(f); }}
              className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white">
              发布到渠道
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]">下架</button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]">删除</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">

        {/* Sticky: tabs + toolbar */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl bg-[var(--surface)]">

          {/* Tabs */}
          <div className="flex items-center border-b border-[var(--border)] px-5">
            {tabs.map((tab) => {
              const count    = counts[tab.key as keyof typeof counts] ?? 0;
              const isActive = tab.key === activeTab;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('relative mr-6 pb-3 pt-4 text-[13px] font-medium transition-colors',
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                  {tab.label}
                  {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                  {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2">

            {/* Search */}
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-2">
              <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="商品名 / Product ID / Parent SKU / Seller SKU..."
                className="w-[260px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                  <X className="size-3 text-[var(--muted)]" />
                </button>
              )}
            </div>

            {/* Channel pill toggles */}
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(channelFilter === ch ? '' : ch)}
                  className={cn(
                    'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors',
                    channelFilter === ch
                      ? ch === 'Shopify' ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* More filters toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors',
                (showFilters || activeFilterCount > 0)
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              筛选
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {(search || activeFilterCount > 0) && (
              <button onClick={clearFilters} className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                清除
              </button>
            )}

            <span className="ml-auto text-[12px] text-[var(--muted)]">
              {filtered.length} 件 · {filtered.reduce((s, p) => s + p.variants.length, 0)} 变体
            </span>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">

              {/* Category */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">分类</span>
                <div className="flex flex-wrap gap-1">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                      className={cn(
                        'h-6 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                        categoryFilter === c
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendor */}
              {vendors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">品牌</span>
                  <div className="flex flex-wrap gap-1">
                    {vendors.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVendorFilter(vendorFilter === v ? '' : v)}
                        className={cn(
                          'h-6 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                          vendorFilter === v
                            ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-8 px-2 py-2.5" />
                <th className="w-8 px-2 py-2.5">
                  <input type="checkbox" className="size-3.5 rounded border-[var(--border)]"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} aria-label="全选" />
                </th>
                <th className="px-3 py-2.5">商品</th>
                <th className="whitespace-nowrap px-3 py-2.5">分类</th>
                <th className="whitespace-nowrap px-3 py-2.5">变体数</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">价格区间</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">总库存</th>
                <th className="whitespace-nowrap px-3 py-2.5">渠道发布</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5">更新时间</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT + 1} className="px-4 py-16 text-center text-[13px] text-[var(--muted)]">
                    没有找到符合条件的商品
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <ProductRowGroup
                    key={product.id}
                    product={product}
                    selected={selectedIds.has(product.id)}
                    expanded={expandedIds.has(product.id)}
                    onToggleSelect={() => toggleRow(product.id)}
                    onToggleExpand={() => toggleExpand(product.id)}
                    onPublish={() => setPublishTarget(product)}
                    onClickProduct={() => router.push(`/dashboard/products/${product.id}`)}
                    colCount={COL_COUNT}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[12px] text-[var(--muted)]">
          <span>共 {filtered.length} 件商品，{filtered.reduce((s, p) => s + p.variants.length, 0)} 个变体</span>
          <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] hover:bg-[var(--surface-hover)]">
            <RefreshCw className="size-3" />刷新
          </button>
        </div>
      </div>

      {publishTarget && <PublishDialog product={publishTarget} onClose={() => setPublishTarget(null)} />}
    </div>
  );
}

// ─── Product row group ───────────────────────────────────────────────────────

function ProductRowGroup({
  product, selected, expanded,
  onToggleSelect, onToggleExpand, onPublish, onClickProduct, colCount,
}: {
  product: Product;
  selected: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onPublish: () => void;
  onClickProduct: () => void;
  colCount: number;
}) {
  const priceRange = getProductPriceRange(product);
  const totalStock = getProductTotalStock(product);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Parent row */}
      <tr className={cn('group border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-subtle)]', expanded && 'bg-[var(--surface-subtle)]')}>

        {/* Expand toggle */}
        <td className="px-2 py-3" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
          <button className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            aria-label={expanded ? '折叠变体' : '展开变体'}>
            <ChevronRight className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-90')} />
          </button>
        </td>

        {/* Checkbox */}
        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="size-3.5 rounded border-[var(--border)]"
            checked={selected} onChange={onToggleSelect} aria-label={`选择 ${product.title}`} />
        </td>

        {/* Product info: title + Product ID + Parent SKU */}
        <td className="cursor-pointer px-3 py-3" onClick={onClickProduct}>
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]">
              {product.images[0]
                ? <img src={product.images[0].url} alt={product.images[0].alt ?? product.title} className="size-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                : <div className="flex size-full items-center justify-center text-[18px]">📦</div>
              }
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--foreground)]">{product.title}</div>
              {/* Product ID */}
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">ID</span>
                <span className="font-mono text-[11px] text-[var(--muted)]">{product.id}</span>
                <CopyBtn value={product.id} label="Product ID" />
              </div>
              {/* Parent SKU */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Parent SKU</span>
                <span className="font-mono text-[11px] text-[var(--muted)]">{product.parentSku}</span>
                <CopyBtn value={product.parentSku} label="Parent SKU" />
              </div>
            </div>
          </div>
        </td>

        {/* Category */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{product.category}</td>

        {/* Variant count */}
        <td className="whitespace-nowrap px-3 py-3" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
          <button className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-[var(--surface-hover)]">
            <span className="text-[13px] font-medium text-[var(--foreground)]">{product.variants.length}</span>
            <span className="text-[11px] text-[var(--muted)]">个变体</span>
            <ChevronRight className={cn('size-3 text-[var(--muted-foreground)] transition-transform duration-150', expanded && 'rotate-90')} />
          </button>
        </td>

        {/* Price range */}
        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">{priceRange}</td>

        {/* Total stock */}
        <td className="whitespace-nowrap px-3 py-3 text-right">
          <span className={cn('text-[13px] font-medium', totalStock === 0 ? 'text-[var(--danger)]' : totalStock < 50 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]')}>
            {totalStock.toLocaleString()}
          </span>
        </td>

        {/* Channel publishes */}
        <td className="whitespace-nowrap px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {product.channelPublishes.length === 0
              ? <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
              : product.channelPublishes.map((cp) => (
                <span key={cp.channel} className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                  cp.status === '已发布' ? channelColors[cp.channel] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200' : 'bg-gray-50 text-[var(--muted-foreground)] ring-gray-200'
                )}>
                  {cp.channel}
                  {cp.status !== '已发布' && <span className="opacity-60"> · {cp.status}</span>}
                </span>
              ))
            }
          </div>
        </td>

        {/* Status */}
        <td className="whitespace-nowrap px-3 py-3"><StatusBadge status={product.status} /></td>

        {/* Updated */}
        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{product.updatedAt.slice(0, 10)}</td>

        {/* Actions */}
        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="relative inline-block">
            <button onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100">
              <MoreHorizontal className="size-4 text-[var(--muted)]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-panel)]"
                onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { setMenuOpen(false); onPublish(); }}
                  className="flex w-full items-center px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">发布到渠道</button>
                <button className="flex w-full items-center px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">复制商品</button>
                <div className="my-1 border-t border-[var(--border-subtle)]" />
                <button className="flex w-full items-center px-3 py-1.5 text-[12px] text-[var(--danger)] hover:bg-[var(--surface-subtle)]">删除</button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded variant rows */}
      {expanded && (
        <>
          <tr className="bg-[var(--surface-subtle)]">
            <td colSpan={2} />
            <td colSpan={colCount - 1} className="px-0 py-0">
              <div className="border-t border-[var(--border-subtle)]">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <th className="pl-4 pr-3 py-1.5 w-[220px]">Seller SKU / Variant ID</th>
                      <th className="px-3 py-1.5">属性</th>
                      <th className="px-3 py-1.5 text-right">售价</th>
                      <th className="px-3 py-1.5 text-right">成本</th>
                      <th className="px-3 py-1.5 text-right">库存</th>
                      <th className="px-3 py-1.5 text-right">条码</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {product.variants.map((variant) => (
                      <VariantSubRow key={variant.id} variant={variant} />
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          <tr className="bg-[var(--surface-subtle)]">
            <td colSpan={colCount + 1} className="h-2 border-b border-[var(--border-subtle)]" />
          </tr>
        </>
      )}
    </>
  );
}

// ─── Variant sub-row ─────────────────────────────────────────────────────────

function VariantSubRow({ variant }: { variant: ProductVariant }) {
  const optionLabel = variant.options.map((o) => o.value).join(' / ');

  return (
    <tr className="group bg-[var(--surface-subtle)] hover:bg-[color-mix(in_srgb,var(--surface-subtle)_60%,var(--surface-hover)_40%)]">

      {/* Seller SKU + Variant ID */}
      <td className="pl-4 pr-3 py-2">
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] font-medium text-[var(--foreground)]">{variant.sku}</span>
          <CopyBtn value={variant.sku} label="Seller SKU" />
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">ID</span>
          <span className="font-mono text-[10px] text-[var(--muted)]">{variant.id}</span>
          <CopyBtn value={variant.id} label="Variant ID" />
        </div>
      </td>

      {/* Options */}
      <td className="px-3 py-2">
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--foreground)]">
          {optionLabel || '—'}
        </span>
      </td>

      {/* Price */}
      <td className="px-3 py-2 text-right">
        <div className="text-[12px] font-medium text-[var(--foreground)]">${variant.price.toFixed(2)}</div>
        {variant.compareAtPrice && (
          <div className="text-[10px] text-[var(--muted)] line-through">${variant.compareAtPrice.toFixed(2)}</div>
        )}
      </td>

      {/* Cost */}
      <td className="px-3 py-2 text-right text-[11px] text-[var(--muted)]">
        {variant.costPrice ? `$${variant.costPrice.toFixed(2)}` : '—'}
      </td>

      {/* Stock */}
      <td className="px-3 py-2 text-right">
        <span className={cn('text-[12px] font-medium',
          variant.stock === 0 ? 'text-[var(--danger)]' : variant.stock < 20 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]')}>
          {variant.stock.toLocaleString()}
        </span>
      </td>

      {/* Barcode */}
      <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--muted-foreground)]">
        {variant.barcode ?? '—'}
      </td>
    </tr>
  );
}

// ─── Shared copy button ───────────────────────────────────────────────────────

function CopyBtn({ value, label }: { value: string; label: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); }}
      className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:opacity-100"
      title={`复制 ${label}`}
    >
      <Copy className="size-2.5" />
    </button>
  );
}
