'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, RefreshCw, AlertCircle, Pencil, Check, X, Info } from 'lucide-react';
import { mockProducts, getProductTotalStock, type Product, type ProductVariant, type CostSource } from '@/lib/mock-data/products';
import { StatusBadge } from '@/components/admin/status-badge';
import { cn } from '@/lib/utils';
import { PublishDialog } from '@/components/products/publish-dialog';

const channelColors: Record<string, string> = {
  Shopify: 'bg-green-50 text-green-700 ring-green-200',
  SHEIN: 'bg-pink-50 text-pink-700 ring-pink-200',
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const product = mockProducts.find((p) => p.id === id);

  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'channels' | 'images'>('overview');
  const [showPublish, setShowPublish] = useState(false);
  // 本地维护变体成本（前端 mock 编辑，不持久化）
  const [variantCosts, setVariantCosts] = useState<Record<string, { cost: number; source: CostSource }>>(() => {
    if (!product) return {};
    return Object.fromEntries(
      product.variants.map((v) => [v.id, { cost: v.costPrice ?? 0, source: v.costSource ?? 'manual' }])
    );
  });

  if (!product) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[var(--muted)]">
        <div className="text-center">
          <p className="text-[16px] font-medium">找不到商品</p>
          <p className="mt-1 text-[13px]">ID: {id}</p>
          <button onClick={() => router.push('/dashboard/products')} className="mt-4 text-[13px] text-[var(--primary)] underline">
            返回商品列表
          </button>
        </div>
      </div>
    );
  }

  const totalStock = getProductTotalStock(product);

  return (
    <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6">
      {/* Breadcrumb + actions */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-3.5" />
            商品中心
          </button>
          <span className="text-[var(--muted-foreground)]">/</span>
          <span className="text-[13px] text-[var(--foreground)]">{product.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPublish(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            发布到渠道
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            编辑
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: main content */}
        <div className="space-y-4">
          {/* Hero card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0].url} alt={product.title} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-[28px]">📦</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-semibold text-[var(--foreground)]">{product.title}</h1>
                  <StatusBadge status={product.status} />
                </div>
                {product.vendor && (
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">品牌: {product.vendor}</p>
                )}
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{product.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex border-b border-[var(--border)] px-5">
              {([
                { key: 'overview', label: '概览' },
                { key: 'variants', label: `变体 (${product.variants.length})` },
                { key: 'channels', label: '渠道发布' },
                { key: 'images', label: `图片 (${product.images.length})` },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative mr-5 pb-3 pt-4 text-[13px] font-medium transition-colors',
                    activeTab === tab.key ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.key && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'overview' && <OverviewTab product={product} variantCosts={variantCosts} />}
              {activeTab === 'variants' && <VariantsTab product={product} variantCosts={variantCosts} onCostChange={(id, cost, source) => setVariantCosts((prev) => ({ ...prev, [id]: { cost, source } }))} />}
              {activeTab === 'channels' && <ChannelsTab product={product} onPublish={() => setShowPublish(true)} />}
              {activeTab === 'images' && <ImagesTab product={product} />}
            </div>
          </div>
        </div>

        {/* Right: metadata */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">库存概览</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--muted)]">总库存</span>
                <span className={cn('text-[14px] font-semibold', totalStock === 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
                  {totalStock.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--muted)]">变体数</span>
                <span className="text-[14px] font-semibold text-[var(--foreground)]">{product.variants.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--muted)]">有库存变体</span>
                <span className="text-[14px] font-semibold text-[var(--foreground)]">
                  {product.variants.filter((v) => v.stock > 0).length} / {product.variants.length}
                </span>
              </div>
            </div>
          </div>

          {/* Cost overview card */}
          <CostOverviewCard product={product} variantCosts={variantCosts} />

          {/* Channel publish status */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">渠道状态</h3>
            {product.channelPublishes.length === 0 ? (
              <p className="text-[12px] text-[var(--muted)]">尚未发布到任何渠道</p>
            ) : (
              <div className="space-y-2">
                {product.channelPublishes.map((cp) => (
                  <div key={cp.channel} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', channelColors[cp.channel] ?? 'bg-gray-50 text-[var(--muted)] ring-gray-200')}>
                        {cp.channel}
                      </span>
                      <StatusBadge status={cp.status} />
                    </div>
                    {cp.channelUrl && (
                      <a href={cp.channelUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--primary)]" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPublish(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
            >
              <Plus className="size-3.5" />
              发布到新渠道
            </button>
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">商品信息</h3>
            <dl className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">商品 ID</dt>
                <dd className="font-mono text-[var(--foreground)]">{product.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">分类</dt>
                <dd className="text-[var(--foreground)]">{product.category}</dd>
              </div>
              {product.vendor && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">品牌</dt>
                  <dd className="text-[var(--foreground)]">{product.vendor}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">创建时间</dt>
                <dd className="text-[var(--foreground)]">{product.createdAt.slice(0, 10)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">更新时间</dt>
                <dd className="text-[var(--foreground)]">{product.updatedAt.slice(0, 10)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {showPublish && <PublishDialog product={product} onClose={() => setShowPublish(false)} />}
    </div>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

function OverviewTab({ product, variantCosts }: { product: Product; variantCosts: Record<string, { cost: number; source: CostSource }> }) {
  const avgCost = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + (variantCosts[v.id]?.cost ?? v.costPrice ?? 0), 0) / product.variants.length
    : 0;
  const avgPrice = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.price, 0) / product.variants.length
    : 0;
  return (
    <div className="space-y-4">
      {/* Option dimensions */}
      {product.optionDefs.length > 0 && (
        <div>
          <h4 className="mb-2 text-[12px] font-semibold text-[var(--muted-foreground)]">变体属性维度</h4>
          <div className="flex flex-wrap gap-3">
            {product.optionDefs.map((opt) => (
              <div key={opt.name} className="rounded-lg border border-[var(--border)] px-3 py-2">
                <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{opt.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {opt.values.map((v) => (
                    <span key={v} className="rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-[12px] text-[var(--foreground)]">{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price & cost range */}
      <div>
        <h4 className="mb-2 text-[12px] font-semibold text-[var(--muted-foreground)]">价格与成本区间</h4>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-[var(--border)] px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--muted)]">最低售价</p>
            <p className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
              ${Math.min(...product.variants.map((v) => v.price)).toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--muted)]">最高售价</p>
            <p className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
              ${Math.max(...product.variants.map((v) => v.price)).toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--muted)]">平均成本</p>
            <p className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
              ${avgCost.toFixed(2)}
            </p>
          </div>
          {avgPrice > 0 && avgCost > 0 && (
            <div className="rounded-lg border border-[var(--border)] px-4 py-3 text-center">
              <p className="text-[11px] text-[var(--muted)]">参考毛利率</p>
              <p className={cn('mt-1 text-[16px] font-semibold', ((avgPrice - avgCost) / avgPrice) >= 0.3 ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                {(((avgPrice - avgCost) / avgPrice) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantsTab({
  product,
  variantCosts,
  onCostChange,
}: {
  product: Product;
  variantCosts: Record<string, { cost: number; source: CostSource }>;
  onCostChange: (variantId: string, cost: number, source: CostSource) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-medium text-[var(--foreground)]">{product.variants.length} 个变体</h4>
          <div className="flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] px-2 py-0.5">
            <Info className="size-3 text-[var(--muted)]" />
            <span className="text-[11px] text-[var(--muted)]">点击成本格可编辑；WMS 回传成本优先级高于手动录入</span>
          </div>
        </div>
        <button className="flex h-7 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
          <Plus className="size-3.5" />
          添加变体
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="min-w-full text-[12px]">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-[var(--muted-foreground)]">SKU</th>
              {product.optionDefs.map((opt) => (
                <th key={opt.name} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[var(--muted-foreground)]">{opt.name}</th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">售价</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">
                <div className="flex items-center justify-end gap-1">
                  成本
                  <Info className="size-3 text-[var(--muted)]" />
                </div>
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-[var(--muted-foreground)]">成本来源</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">毛利率</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">库存</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {product.variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                optionDefs={product.optionDefs}
                costData={variantCosts[variant.id]}
                onCostChange={(cost, source) => onCostChange(variant.id, cost, source)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  optionDefs,
  costData,
  onCostChange,
}: {
  variant: ProductVariant;
  optionDefs: Product['optionDefs'];
  costData?: { cost: number; source: CostSource };
  onCostChange: (cost: number, source: CostSource) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const currentCost = costData?.cost ?? variant.costPrice ?? 0;
  const currentSource = costData?.source ?? variant.costSource ?? 'manual';
  const margin = variant.price > 0 && currentCost > 0
    ? ((variant.price - currentCost) / variant.price) * 100
    : null;

  const startEdit = () => {
    if (currentSource === 'wms_receipt') return; // WMS 成本不允许手动改
    setDraft(currentCost > 0 ? currentCost.toFixed(2) : '');
    setEditing(true);
  };

  const commitEdit = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) {
      onCostChange(val, 'manual');
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <tr className="group hover:bg-[var(--surface-subtle)]">
      <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--foreground)]">{variant.sku}</td>
      {optionDefs.map((opt) => {
        const val = variant.options.find((o) => o.name === opt.name)?.value ?? '—';
        return <td key={opt.name} className="whitespace-nowrap px-3 py-2.5 text-[var(--foreground)]">{val}</td>;
      })}
      {/* 售价 */}
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-[var(--foreground)]">${variant.price.toFixed(2)}</td>
      {/* 成本（可编辑） */}
      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-[var(--muted)]">$</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-20 rounded border border-[var(--primary)] bg-[var(--surface)] px-1.5 py-0.5 text-right text-[12px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button onClick={commitEdit} className="rounded p-0.5 text-[var(--success)] hover:bg-[var(--surface-hover)]"><Check className="size-3.5" /></button>
            <button onClick={cancelEdit} className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-hover)]"><X className="size-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            title={currentSource === 'wms_receipt' ? 'WMS 入库回传成本，不可手动修改' : '点击编辑成本'}
            className={cn(
              'group/cost flex items-center justify-end gap-1 rounded px-1 py-0.5 transition-colors',
              currentSource === 'wms_receipt'
                ? 'cursor-default text-[var(--foreground)]'
                : 'cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]'
            )}
          >
            <span>{currentCost > 0 ? `$${currentCost.toFixed(2)}` : <span className="text-[var(--danger)]">未设置</span>}</span>
            {currentSource === 'manual' && (
              <Pencil className="size-3 text-[var(--muted)] opacity-0 transition-opacity group-hover/cost:opacity-100" />
            )}
          </button>
        )}
      </td>
      {/* 成本来源标注 */}
      <td className="whitespace-nowrap px-3 py-2.5 text-center">
        {currentSource === 'wms_receipt' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            WMS 回传
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)]">
            <span className="size-1.5 rounded-full bg-[var(--muted)]" />
            手动录入
          </span>
        )}
      </td>
      {/* 毛利率 */}
      <td className="whitespace-nowrap px-3 py-2.5 text-right">
        {margin !== null ? (
          <span className={cn('text-[12px] font-medium', margin >= 40 ? 'text-[var(--success)]' : margin >= 20 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
            {margin.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
        )}
      </td>
      {/* 库存 */}
      <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-medium', variant.stock === 0 ? 'text-[var(--danger)]' : variant.stock < 20 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]')}>
        {variant.stock.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button className="rounded p-1 text-[var(--muted)] opacity-0 transition hover:bg-[var(--surface-hover)] hover:text-[var(--danger)] group-hover:opacity-100">
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── 右侧成本概览卡片 ─────────────────────────────────────────────────────────

function CostOverviewCard({
  product,
  variantCosts,
}: {
  product: Product;
  variantCosts: Record<string, { cost: number; source: CostSource }>;
}) {
  const withCost = product.variants.filter((v) => (variantCosts[v.id]?.cost ?? v.costPrice ?? 0) > 0);
  const missingCost = product.variants.length - withCost.length;
  const wmsCount = product.variants.filter((v) => (variantCosts[v.id]?.source ?? v.costSource) === 'wms_receipt').length;
  const manualCount = product.variants.filter((v) => (variantCosts[v.id]?.source ?? v.costSource) === 'manual').length;

  const avgCost = withCost.length > 0
    ? withCost.reduce((s, v) => s + (variantCosts[v.id]?.cost ?? v.costPrice ?? 0), 0) / withCost.length
    : 0;
  const avgPrice = withCost.length > 0
    ? withCost.reduce((s, v) => s + v.price, 0) / withCost.length
    : 0;
  const avgMargin = avgPrice > 0 && avgCost > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">成本概览</h3>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--muted)]">平均成本</span>
          <span className="text-[14px] font-semibold text-[var(--foreground)]">
            {avgCost > 0 ? `$${avgCost.toFixed(2)}` : '—'}
          </span>
        </div>
        {avgMargin !== null && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--muted)]">参考毛利率</span>
            <span className={cn('text-[14px] font-semibold', avgMargin >= 40 ? 'text-[var(--success)]' : avgMargin >= 20 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
              {avgMargin.toFixed(1)}%
            </span>
          </div>
        )}
        <div className="mt-1 border-t border-[var(--border-subtle)] pt-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--muted)]">WMS 回传</span>
            <span className="font-medium text-emerald-600">{wmsCount} 个</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[12px]">
            <span className="text-[var(--muted)]">手动录入</span>
            <span className="font-medium text-[var(--muted-foreground)]">{manualCount} 个</span>
          </div>
          {missingCost > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
              <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
              <span className="text-[11px] text-amber-700">{missingCost} 个变体尚未设置成本，利润计算将不准确</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelsTab({ product, onPublish }: { product: Product; onPublish: () => void }) {
  return (
    <div className="space-y-3">
      {(['Shopify', 'SHEIN'] as const).map((channel) => {
        const cp = product.channelPublishes.find((c) => c.channel === channel);
        return (
          <div key={channel} className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[22px]">{channel === 'Shopify' ? '🛍' : '👗'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[var(--foreground)]">{channel}</span>
                    {cp ? <StatusBadge status={cp.status} /> : <StatusBadge status="未发布" />}
                  </div>
                  {cp?.merchantName && <p className="mt-0.5 text-[11px] text-[var(--muted)]">店铺: {cp.merchantName}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cp?.channelUrl && (
                  <a href={cp.channelUrl} target="_blank" rel="noopener noreferrer" className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                    <ExternalLink className="size-3" />
                    查看
                  </a>
                )}
                {cp?.status === '已发布' && (
                  <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                    <RefreshCw className="size-3" />
                    同步
                  </button>
                )}
                {(!cp || cp.status !== '已发布') && (
                  <button
                    onClick={onPublish}
                    className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white hover:opacity-90"
                  >
                    <Plus className="size-3" />
                    发布
                  </button>
                )}
              </div>
            </div>

            {cp && (
              <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-subtle)] p-3 text-[12px]">
                {cp.channelProductId && (
                  <>
                    <dt className="text-[var(--muted)]">渠道商品 ID</dt>
                    <dd className="font-mono text-[var(--foreground)]">{cp.channelProductId}</dd>
                  </>
                )}
                {cp.publishedAt && (
                  <>
                    <dt className="text-[var(--muted)]">发布时间</dt>
                    <dd className="text-[var(--foreground)]">{cp.publishedAt}</dd>
                  </>
                )}
                {cp.lastSyncAt && (
                  <>
                    <dt className="text-[var(--muted)]">最后同步</dt>
                    <dd className="text-[var(--foreground)]">{cp.lastSyncAt}</dd>
                  </>
                )}
              </dl>
            )}

            {cp?.status === '发布失败' && cp.failReason && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
                <p className="text-[12px] text-[var(--danger)]">{cp.failReason}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ImagesTab({ product }: { product: Product }) {
  return (
    <div>
      {product.images.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)]">
          <div className="text-center">
            <p className="text-[14px]">暂无图片</p>
            <button className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--primary)]">
              <Plus className="size-3.5" />
              上传图片
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {product.images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="size-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-[var(--foreground)]">删除</button>
              </div>
            </div>
          ))}
          <button className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
            <Plus className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}
