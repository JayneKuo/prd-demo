'use client';

import { useState } from 'react';
import { X, Check, ChevronRight, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, ChannelPublish } from '@/lib/mock-data/products';

type Channel = 'Shopify' | 'SHEIN';
type Step = 'select' | 'configure' | 'publishing' | 'done';

const channelMeta: Record<Channel, { color: string; bg: string; ring: string; icon: string; desc: string }> = {
  Shopify: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    ring: 'ring-green-200',
    icon: '🛍',
    desc: '通过 Shopify Connector 发布，支持多变体、图片、SEO 设置',
  },
  SHEIN: {
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    ring: 'ring-pink-200',
    icon: '👗',
    desc: '通过 SHEIN Open Platform 发布，需符合 SHEIN 商品规范',
  },
};

// SHEIN 特有的类目映射
const sheinCategories: Record<string, string> = {
  '电子产品': 'Electronics & Accessories',
  '手机配件': 'Phone Accessories',
  '背包': 'Bags & Luggage',
  '旅行配件': 'Travel Accessories',
  '电脑周边': 'Computer Peripherals',
  '数码配件': 'Digital Accessories',
};

export function PublishDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [step, setStep] = useState<Step>('select');
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [publishMode, setPublishMode] = useState<'publish' | 'update'>('publish');

  // Per-channel config
  const [shopifyStorefront, setShopifyStorefront] = useState(true);
  const [shopifyGiftCard, setShopifyGiftCard] = useState(false);
  const [sheinCategory, setSheinCategory] = useState(sheinCategories[product.category] ?? 'Others');
  const [sheinPriceFactor, setSheinPriceFactor] = useState('1.0');
  const [sheinAgeGroup, setSheinAgeGroup] = useState('adults');

  // Publishing simulation
  const [publishProgress, setPublishProgress] = useState<Record<Channel, 'idle' | 'running' | 'done' | 'error'>>({ Shopify: 'idle', SHEIN: 'idle' });
  const [publishLog, setPublishLog] = useState<string[]>([]);

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  };

  const getExistingPublish = (ch: Channel): ChannelPublish | undefined =>
    product.channelPublishes.find((c) => c.channel === ch);

  const startPublish = async () => {
    setStep('publishing');
    const channels = Array.from(selectedChannels);
    const logs: string[] = [];

    for (const ch of channels) {
      setPublishProgress((p) => ({ ...p, [ch]: 'running' }));
      logs.push(`[${new Date().toLocaleTimeString()}] 开始向 ${ch} 提交商品数据...`);
      setPublishLog([...logs]);

      await new Promise((r) => setTimeout(r, 1200));
      logs.push(`[${new Date().toLocaleTimeString()}] 正在处理 ${product.variants.length} 个变体...`);
      setPublishLog([...logs]);

      await new Promise((r) => setTimeout(r, 1000));

      // Simulate success/failure (SHEIN fails if product was already failed)
      const existing = getExistingPublish(ch);
      const willFail = ch === 'SHEIN' && existing?.status === '发布失败' && publishMode === 'publish';

      if (willFail) {
        logs.push(`[${new Date().toLocaleTimeString()}] ❌ ${ch} 发布失败：${existing?.failReason ?? '未知错误'}`);
        setPublishProgress((p) => ({ ...p, [ch]: 'error' }));
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] ✅ ${ch} 发布成功，商品 ID: ${ch === 'Shopify' ? 'shopify_' + Math.floor(Math.random() * 9000000 + 1000000) : 'shein_' + Math.floor(Math.random() * 9000000 + 1000000)}`);
        setPublishProgress((p) => ({ ...p, [ch]: 'done' }));
      }
      setPublishLog([...logs]);
    }

    await new Promise((r) => setTimeout(r, 500));
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-[560px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">发布到渠道</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)] line-clamp-1">{product.title}</p>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]">
            <X className="size-4 text-[var(--muted)]" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-6 py-3">
          {(['select', 'configure', 'publishing', 'done'] as Step[]).map((s, i) => {
            const labels = ['选择渠道', '配置参数', '发布中', '完成'];
            const isDone = ['select', 'configure', 'publishing', 'done'].indexOf(step) > i;
            const isCurrent = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="size-3 text-[var(--muted-foreground)]" />}
                <div className="flex items-center gap-1.5">
                  <div className={cn('flex size-5 items-center justify-center rounded-full text-[10px] font-bold', isCurrent ? 'bg-[var(--primary)] text-white' : isDone ? 'bg-green-500 text-white' : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)]')}>
                    {isDone ? <Check className="size-3" /> : i + 1}
                  </div>
                  <span className={cn('text-[12px]', isCurrent ? 'font-medium text-[var(--foreground)]' : 'text-[var(--muted)]')}>
                    {labels[i]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Step 1: Select channels */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--muted)]">选择要发布的目标渠道（可多选）</p>
              {(['Shopify', 'SHEIN'] as Channel[]).map((ch) => {
                const meta = channelMeta[ch];
                const existing = getExistingPublish(ch);
                const isSelected = selectedChannels.has(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 text-left transition-all',
                      isSelected ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-subtle)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[22px]">{meta.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--foreground)]">{ch}</span>
                            {existing && (
                              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', meta.bg, meta.color, meta.ring)}>
                                {existing.status}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{meta.desc}</p>
                        </div>
                      </div>
                      <div className={cn('flex size-5 items-center justify-center rounded-full border-2 transition-all', isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]')}>
                        {isSelected && <Check className="size-3 text-white" />}
                      </div>
                    </div>
                    {existing?.status === '发布失败' && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5">
                        <AlertCircle className="size-3 shrink-0 text-[var(--danger)]" />
                        <span className="text-[11px] text-[var(--danger)]">{existing.failReason}</span>
                      </div>
                    )}
                    {existing?.channelUrl && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <ExternalLink className="size-3" />
                        <span className="truncate">{existing.channelUrl}</span>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Publish mode */}
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <span className="text-[12px] font-medium text-[var(--foreground)]">操作模式</span>
                <div className="flex gap-2">
                  {(['publish', 'update'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPublishMode(mode)}
                      className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors', publishMode === mode ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
                    >
                      {mode === 'publish' ? '新发布' : '更新已有'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <div className="space-y-5">
              {selectedChannels.has('Shopify') && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[16px]">🛍</span>
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">Shopify 配置</span>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-[13px] text-[var(--foreground)]">在在线商店展示</span>
                      <button
                        onClick={() => setShopifyStorefront((v) => !v)}
                        className={cn('relative h-5 w-9 rounded-full transition-colors', shopifyStorefront ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}
                      >
                        <div className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform', shopifyStorefront ? 'translate-x-4' : 'translate-x-0.5')} />
                      </button>
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-[13px] text-[var(--foreground)]">作为礼品卡销售</span>
                      <button
                        onClick={() => setShopifyGiftCard((v) => !v)}
                        className={cn('relative h-5 w-9 rounded-full transition-colors', shopifyGiftCard ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}
                      >
                        <div className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform', shopifyGiftCard ? 'translate-x-4' : 'translate-x-0.5')} />
                      </button>
                    </label>
                    <div>
                      <span className="text-[12px] text-[var(--muted)]">变体数量: {product.variants.length} 个（将全部同步）</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedChannels.has('SHEIN') && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[16px]">👗</span>
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">SHEIN 配置</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">SHEIN 商品类目</label>
                      <select
                        value={sheinCategory}
                        onChange={(e) => setSheinCategory(e.target.value)}
                        className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none"
                      >
                        {Object.values(sheinCategories).map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">SHEIN 定价倍率</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3"
                          value={sheinPriceFactor}
                          onChange={(e) => setSheinPriceFactor(e.target.value)}
                          className="h-8 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-center text-[var(--foreground)] outline-none"
                        />
                        <span className="text-[12px] text-[var(--muted)]">× 基础售价（如 1.2 = 提价 20%）</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">适用人群</label>
                      <select
                        value={sheinAgeGroup}
                        onChange={(e) => setSheinAgeGroup(e.target.value)}
                        className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none"
                      >
                        <option value="adults">成人</option>
                        <option value="kids">儿童</option>
                        <option value="plus_size">大码</option>
                      </select>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2">
                      <p className="text-[11px] text-amber-700">SHEIN 发布需 1–3 个工作日审核，审核通过后自动上架。请确保商品标题不含违禁词。</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Publishing */}
          {step === 'publishing' && (
            <div className="space-y-4">
              {Array.from(selectedChannels).map((ch) => {
                const prog = publishProgress[ch];
                const meta = channelMeta[ch];
                return (
                  <div key={ch} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4">
                    <span className="text-[20px]">{meta.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{ch}</span>
                        {prog === 'running' && <Loader2 className="size-4 animate-spin text-[var(--primary)]" />}
                        {prog === 'done' && <Check className="size-4 text-green-600" />}
                        {prog === 'error' && <AlertCircle className="size-4 text-[var(--danger)]" />}
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', prog === 'done' ? 'w-full bg-green-500' : prog === 'error' ? 'w-full bg-[var(--danger)]' : prog === 'running' ? 'w-2/3 bg-[var(--primary)]' : 'w-0')}
                        />
                      </div>
                      <p className={cn('mt-1 text-[11px]', prog === 'done' ? 'text-green-600' : prog === 'error' ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>
                        {prog === 'idle' && '等待中...'}
                        {prog === 'running' && '发布中，请稍候...'}
                        {prog === 'done' && '发布成功'}
                        {prog === 'error' && '发布失败'}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Log */}
              <div className="max-h-[120px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                {publishLog.map((line, i) => (
                  <p key={i} className="font-mono text-[11px] leading-5 text-[var(--muted)]">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-3">
              {Array.from(selectedChannels).map((ch) => {
                const prog = publishProgress[ch];
                const meta = channelMeta[ch];
                return (
                  <div key={ch} className={cn('flex items-center gap-3 rounded-xl border p-4', prog === 'done' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50')}>
                    <span className="text-[20px]">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{ch}</span>
                        {prog === 'done' ? (
                          <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-200">发布成功</span>
                        ) : (
                          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">发布失败</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {prog === 'done' ? `商品已成功发布，变体数: ${product.variants.length}` : '请检查商品信息后重试'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-[12px] text-[var(--muted)]">
                发布记录已保存至 <a href="/dashboard/publish-log" className="text-[var(--primary)] underline underline-offset-2">发布记录</a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
            {step === 'done' ? '关闭' : '取消'}
          </button>
          <div className="flex items-center gap-2">
            {step === 'configure' && (
              <button onClick={() => setStep('select')} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                上一步
              </button>
            )}
            {step === 'select' && (
              <button
                disabled={selectedChannels.size === 0}
                onClick={() => setStep('configure')}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            )}
            {step === 'configure' && (
              <button
                onClick={startPublish}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
              >
                开始发布
              </button>
            )}
            {step === 'done' && (
              <a
                href="/dashboard/publish-log"
                className="flex h-8 items-center rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
              >
                查看发布记录
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
