'use client';
/**
 * FBA 分仓方案工作台（确认 Placement Option）
 * 平台返回分仓方案 → 展示每票货件目的仓 + 分配数量 + 费用 → 用户确认
 */

import { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboundPlan, FbaPlacementOption } from './replenishment';
import type { OmsSnapshot } from './types';
import { useOms } from './provider';

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', cls)}>{children}</span>;
}

interface PlacementWorkstationProps {
  inboundPlan: InboundPlan;
  snapshot: OmsSnapshot;
  onClose: () => void;
  inline?: boolean;
}

export function PlacementWorkstation({ inboundPlan, snapshot, onClose, inline }: PlacementWorkstationProps) {
  const { executeReplenishment } = useOms();
  const [selectedId, setSelectedId] = useState<string | null>(inboundPlan.selectedPlacementOptionId ?? null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const options = inboundPlan.placementOptions ?? [];

  const handleConfirm = async () => {
    if (!selectedId) return;
    setConfirming(true);
    setError('');
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_select_placement_option',
        inboundPlanId: inboundPlan.id,
        optionId: selectedId,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
      setConfirming(false);
    }
  };

  const lineLabel = (lineId: string) => {
    const l = inboundPlan.lines.find(x => x.id === lineId);
    return l?.sku ?? lineId;
  };

  const selectedOpt = options.find(o => o.id === selectedId);
  const totalFees = selectedOpt?.fees?.reduce((s, f) => s + f.amount, 0) ?? 0;
  const totalDiscount = selectedOpt?.discount?.reduce((s, d) => s + d.amount, 0) ?? 0;
  const netCost = totalFees - totalDiscount;

  const sharedContent = (
    <>
      <div className="flex items-start gap-2 border-b border-[var(--border-subtle)] bg-amber-50 px-6 py-3 text-[12px] text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>确认后不可撤销。如需修改分仓方案须取消本次入库计划并重新提交。有额外费用时请先确认预算。</span>
      </div>
      <div className={inline ? 'p-6 space-y-4' : 'flex-1 overflow-y-auto p-6 space-y-4'}>
        {options.map(opt => {
          const isSelected = opt.id === selectedId;
          const fees = opt.fees?.reduce((s, f) => s + f.amount, 0) ?? 0;
          const disc = opt.discount?.reduce((s, d) => s + d.amount, 0) ?? 0;
          const net = fees - disc;
          return (
            <div key={opt.id} onClick={() => setSelectedId(opt.id)}
              className={cn('cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
                isSelected ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40')}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]')}>
                    {isSelected && <CheckCircle2 className="size-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-[14px] font-semibold">{opt.shipments.length} 票货件</span>
                    <span className="ml-2 text-[12px] text-[var(--muted)]">{new Set(opt.shipments.map(s => s.destinationCode)).size} 个目的仓</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[13px]">
                  {fees > 0 && <span className="text-amber-600">费用 ${fees.toFixed(2)}</span>}
                  {disc > 0 && <span className="text-emerald-600">折扣 -${disc.toFixed(2)}</span>}
                  {net !== 0 && <Badge cls={net > 0 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>净费用 {net > 0 ? '+' : ''}${net.toFixed(2)} USD</Badge>}
                  {net === 0 && fees === 0 && <Badge cls="bg-emerald-50 text-emerald-700 ring-emerald-200">无额外费用</Badge>}
                  {opt.expiresAt && <span className="text-[11px] text-[var(--muted)]">有效至 {opt.expiresAt.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-2">货件号</th><th className="px-4 py-2">目的仓</th>
                      {inboundPlan.lines.map(l => <th key={l.id} className="px-4 py-2 text-right">{l.sku}</th>)}
                      <th className="px-4 py-2 text-right">合计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opt.shipments.map(ship => {
                      const total = ship.lines.reduce((s, l) => s + l.quantity, 0);
                      return (
                        <tr key={ship.externalShipmentId} className="border-t border-[var(--border-subtle)]">
                          <td className="px-4 py-2.5 font-mono text-[11px]">{ship.externalShipmentId}</td>
                          <td className="px-4 py-2.5"><div className="font-medium">{ship.destinationName ?? ship.destinationCode}</div><div className="text-[10px] text-[var(--muted)]">{ship.destinationCode}</div></td>
                          {inboundPlan.lines.map(l => { const ql = ship.lines.find(x => x.lineId === l.id); return <td key={l.id} className="px-4 py-2.5 text-right tabular-nums">{ql?.quantity ?? '—'}</td>; })}
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-[var(--border)] px-6 py-4">
        {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
        {selectedOpt && netCost > 0 && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">所选方案将产生 ${netCost.toFixed(2)} USD 的分仓费用。</div>}
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-[var(--muted)]">{selectedOpt ? `${selectedOpt.shipments.length} 票货件 · ${new Set(selectedOpt.shipments.map(s => s.destinationCode)).size} 个目的仓` : '请选择分仓方案'}</div>
          <div className="flex gap-2">
            {!inline && <button onClick={onClose} disabled={confirming} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] hover:bg-[var(--surface-subtle)] disabled:opacity-40">取消</button>}
            <button onClick={() => void handleConfirm()} disabled={!selectedId || confirming}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {confirming && <Loader2 className="size-3.5 animate-spin" />}
              确认分仓方案
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
            <h2 className="text-[13px] font-semibold">确认分仓方案</h2>
            <p className="text-[12px] text-[var(--muted)]">{options.length} 个可选方案</p>
          </div>
        </div>
        {sharedContent}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div className="flex w-full max-w-[800px] flex-col bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold">确认分仓方案</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{inboundPlan.number} · Amazon FBA US · 共 {options.reduce((s, o) => Math.max(s, o.shipments.length), 0)} 种方案</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-5" /></button>
        </div>
        {sharedContent}
      </div>
    </div>
  );
}
