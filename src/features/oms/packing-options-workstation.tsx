'use client';
/**
 * FBA 包装方案工作台（确认 Packing Option）
 * 平台返回多个方案 → 用户选一个 → 确认 → 进入装箱状态
 */

import { useState } from 'react';
import { X, CheckCircle2, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboundPlan, FbaPackingOption } from './replenishment';
import type { OmsSnapshot } from './types';
import { useOms } from './provider';

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', cls)}>{children}</span>;
}

interface PackingOptionsWorkstationProps {
  inboundPlan: InboundPlan;
  snapshot: OmsSnapshot;
  onClose: () => void;
  inline?: boolean;
}

export function PackingOptionsWorkstation({ inboundPlan, snapshot, onClose, inline }: PackingOptionsWorkstationProps) {
  const { executeReplenishment } = useOms();
  const [selectedId, setSelectedId] = useState<string | null>(inboundPlan.selectedPackingOptionId ?? null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const options = inboundPlan.packingOptions ?? [];

  const handleConfirm = async () => {
    if (!selectedId) return;
    setConfirming(true);
    setError('');
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_select_packing_option',
        inboundPlanId: inboundPlan.id,
        optionId: selectedId,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
      setConfirming(false);
    }
  };

  const selectedOpt = options.find(o => o.id === selectedId);

  // 商品名辅助
  const lineLabel = (lineId: string) => {
    const l = inboundPlan.lines.find(x => x.id === lineId);
    return l ? `${l.sku} · ${l.channelSku ?? '—'}` : lineId;
  };

  const content = (
    <>
      {/* 说明 */}
      <div className="border-b border-[var(--border-subtle)] bg-amber-50 px-6 py-3 text-[12px] text-amber-800">
        请选择 Amazon 返回的包装方案。确认后将保存包装组约束，接下来需要按包装组填写装箱信息。确认后不可撤销。
      </div>

      {/* 方案列表 */}
      <div className={inline ? 'p-6 space-y-4' : 'flex-1 overflow-y-auto p-6 space-y-4'}>
        {options.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Package className="size-10 text-[var(--border)]" />
            <p className="mt-3 text-[13px] text-[var(--muted)]">暂无可选包装方案</p>
          </div>
        )}
        {options.map(opt => {
          const isSelected = opt.id === selectedId;
          const totalFees = opt.fees?.reduce((s, f) => s + f.amount, 0) ?? 0;
          return (
            <div
              key={opt.id}
              onClick={() => setSelectedId(opt.id)}
              className={cn(
                'cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
                isSelected ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40',
              )}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn('flex size-5 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
                  )}>
                    {isSelected && <CheckCircle2 className="size-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-[14px] font-semibold">{opt.label ?? `方案 ${options.indexOf(opt) + 1}`}</span>
                    <span className="ml-2 text-[12px] text-[var(--muted)]">{opt.packingGroups.length} 个包装组</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {totalFees > 0 ? (
                    <span className="text-[13px] font-semibold text-amber-600">+${totalFees.toFixed(2)}</span>
                  ) : (
                    <Badge cls="bg-emerald-50 text-emerald-700 ring-emerald-200">无额外费用</Badge>
                  )}
                  {opt.expiresAt && <span className="text-[11px] text-[var(--muted)]">有效至 {opt.expiresAt.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 space-y-2">
                {opt.packingGroups.map(pg => (
                  <div key={pg.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[12px] font-semibold">包装组 {pg.externalGroupId}</span>
                      <span className="text-[11px] text-[var(--muted)]">支持：{pg.supportedTransportModes.join(' / ')}</span>
                    </div>
                    <div className="space-y-1">
                      {pg.lines.map(ql => (
                        <div key={ql.lineId} className="flex items-center justify-between text-[12px]">
                          <span className="text-[var(--muted)]">{lineLabel(ql.lineId)}</span>
                          <span className="font-semibold tabular-nums">{ql.quantity} 件</span>
                        </div>
                      ))}
                    </div>
                    {pg.restrictions?.length ? <p className="mt-2 text-[11px] text-orange-600">限制：{pg.restrictions.join('；')}</p> : null}
                  </div>
                ))}
                {opt.fees?.map(f => f.amount > 0 && <p key={f.type} className="text-[11px] text-amber-600">{f.type}：${f.amount.toFixed(2)} {f.currency}</p>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="border-t border-[var(--border)] px-6 py-4">
        {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-[var(--muted)]">
            {selectedOpt ? `已选：${selectedOpt.label ?? '方案 ' + (options.indexOf(selectedOpt) + 1)}` : '请选择一个方案'}
          </div>
          <div className="flex gap-2">
            {!inline && <button onClick={onClose} disabled={confirming} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)] disabled:opacity-40">取消</button>}
            <button onClick={() => void handleConfirm()} disabled={!selectedId || confirming}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {confirming && <Loader2 className="size-3.5 animate-spin" />}
              确认包装方案
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (inline) {
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <h2 className="text-[13px] font-semibold">确认包装方案</h2>
            <p className="text-[12px] text-[var(--muted)]">{inboundPlan.number} · {inboundPlan.lines.reduce((s, l) => s + l.quantity, 0)} 件</p>
          </div>
        </div>
        {content}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div className="flex w-full max-w-[720px] flex-col bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold">确认包装方案</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{inboundPlan.number} · Amazon FBA US · {inboundPlan.lines.reduce((s, l) => s + l.quantity, 0)} 件</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-5" /></button>
        </div>
        {content}
      </div>
    </div>
  );
}
