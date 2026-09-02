'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { mockProducts, getProductTotalStock, type Product, type ProductVariant } from '@/lib/mock-data/products';
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
              {activeTab === 'overview' && <OverviewTab product={product} />}
              {activeTab === 'variants' && <VariantsTab product={product} />}
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

function OverviewTab({ product }: { product: Product }) {
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

      {/* Price range */}
      <div>
        <h4 className="mb-2 text-[12px] font-semibold text-[var(--muted-foreground)]">价格区间</h4>
        <div className="flex gap-4">
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
              ${(product.variants.reduce((s, v) => s + (v.costPrice ?? 0), 0) / product.variants.length).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantsTab({ product }: { product: Product }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-[var(--foreground)]">{product.variants.length} 个变体</h4>
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
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">成本</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">库存</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[var(--muted-foreground)]">重量(g)</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {product.variants.map((variant) => (
              <VariantRow key={variant.id} variant={variant} optionDefs={product.optionDefs} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VariantRow({ variant, optionDefs }: { variant: ProductVariant; optionDefs: Product['optionDefs'] }) {
  return (
    <tr className="hover:bg-[var(--surface-subtle)]">
      <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--foreground)]">{variant.sku}</td>
      {optionDefs.map((opt) => {
        const val = variant.options.find((o) => o.name === opt.name)?.value ?? '—';
        return <td key={opt.name} className="whitespace-nowrap px-3 py-2.5 text-[var(--foreground)]">{val}</td>;
      })}
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-[var(--foreground)]">${variant.price.toFixed(2)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">
        {variant.costPrice ? `$${variant.costPrice.toFixed(2)}` : '—'}
      </td>
      <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-medium', variant.stock === 0 ? 'text-[var(--danger)]' : variant.stock < 20 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]')}>
        {variant.stock.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--muted)]">{variant.weight ?? '—'}</td>
      <td className="px-3 py-2.5 text-right">
        <button className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
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
