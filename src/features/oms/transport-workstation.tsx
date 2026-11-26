'use client';
/**
 * FBA 配送服务 & 货件追踪工作台
 *
 * 配送服务流程（步骤③）：
 *   ① 从亚马逊获取的真实运输方案中选择（OMS 通过 inbound_advance_platform stage:'transport_options' 生成）
 *   ② 发货日期（当前时间之后）
 *   ③ 送达日期（从平台可选日期中选择）
 *   ④ 送达时间段（上午/下午/傍晚等）
 *   ⑤ LTL 托盘信息（LTL 必填）
 *
 * 货件追踪（步骤⑤）：
 *   - SPD：按箱维度提供跟踪编号
 *   - LTL：提单号(BOL) + 整体跟踪编号；送达时段开始前可修改
 */

import { useState } from 'react';
import { X, Truck, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboundPlan, PlatformAllocation, FbaTransportOption } from './replenishment';
import type { OmsSnapshot } from './types';
import { useOms } from './provider';

// ─── 样式常量 ─────────────────────────────────────────────────────────────────

const input =
  'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] ' +
  'outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';
const lbl = 'block text-[12px] font-medium text-[var(--muted)] mb-1';

// ─── 送达时间段 ───────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  { id: 'morning',   label: '上午 08:00 – 12:00', start: '08:00', end: '12:00' },
  { id: 'afternoon', label: '下午 13:00 – 17:00', start: '13:00', end: '17:00' },
  { id: 'evening',   label: '傍晚 17:00 – 20:00', start: '17:00', end: '20:00' },
  { id: 'full',      label: '全天 08:00 – 18:00', start: '08:00', end: '18:00' },
] as const;

// ─── 生成可选送达日期 ─────────────────────────────────────────────────────────

function genDeliveryDates(shipDate: string, mode: string): string[] {
  if (!shipDate) return [];
  const days = mode === 'LTL' ? [7, 10, 12, 14] : [5, 6, 7, 8];
  const base = new Date(shipDate);
  return days.map(d => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + d);
    return dt.toISOString().slice(0, 10);
  });
}

// ─── 托盘类型 ─────────────────────────────────────────────────────────────────

type PalletInfo = { count: number; length: number; width: number; height: number; weight: number; stackable: boolean };
const defaultPallet = (): PalletInfo => ({ count: 1, length: 48, width: 40, height: 60, weight: 0, stackable: false });

// ─── 承运商数据 ───────────────────────────────────────────────────────────────

const PARTNERED_CARRIERS = [
  { id: 'ups-send',    name: 'UPS (SEND 合作)',         services: ['UPS Ground', 'UPS 2nd Day Air'] },
  { id: 'fedex-send',  name: 'FedEx (SEND 合作)',       services: ['FedEx Ground', 'FedEx Express Saver'] },
  { id: 'amz-freight', name: 'Amazon Freight (合作)',   services: ['Amazon Freight LTL'] },
] as const;

const NON_PARTNERED_CARRIERS = [
  { id: 'ups',   name: 'UPS',       services: ['UPS Ground', 'UPS Next Day Air', 'UPS 2nd Day Air'] },
  { id: 'fedex', name: 'FedEx',     services: ['FedEx Ground', 'FedEx Express', 'FedEx Freight Priority'] },
  { id: 'dhl',   name: 'DHL',       services: ['DHL Express', 'DHL eCommerce'] },
  { id: 'usps',  name: 'USPS',      services: ['Priority Mail', 'Priority Mail Express'] },
  { id: 'other', name: '其他承运商', services: ['其他'] },
] as const;

// ─── 状态类型（每票货件独立）────────────────────────────────────────────────

type AllocState = {
  // 用户填写参数（发给 Amazon 的承运信息）
  mode: 'SPD' | 'LTL' | '';
  carrierType: 'partnered' | 'non-partnered' | '';
  carrierId: string;
  serviceType: string;
  shipDate: string;
  // 从 OMS 真实选项中选择
  selectedOptId: string;
  // 送达时段（分开存储）
  deliveryDate: string;
  deliveryTimeSlotId: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  // LTL 托盘
  pallets: PalletInfo[];
  // 货件追踪
  boxTrackings: Record<string, string>;
  bolNumber: string;
  ltlTrackingNumber: string;
};

function defaultAllocState(existing?: PlatformAllocation['transport']): AllocState {
  return {
    mode: (existing?.mode ?? '') as AllocState['mode'],
    carrierType: existing?.carrier
      ? (PARTNERED_CARRIERS.some(c => c.name === existing.carrier) ? 'partnered' : 'non-partnered')
      : '',
    carrierId: (() => {
      if (!existing?.carrier) return '';
      return [...PARTNERED_CARRIERS, ...NON_PARTNERED_CARRIERS].find(c => c.name === existing.carrier)?.id ?? 'other';
    })(),
    serviceType: '',
    shipDate: existing?.actualShipDate ?? existing?.scheduledPickup?.slice(0, 10) ?? '',
    selectedOptId: '',
    deliveryDate: existing?.deliveryWindow?.start?.slice(0, 10) ?? '',
    deliveryTimeSlotId: '',
    deliveryWindowStart: existing?.deliveryWindow?.start ?? '',
    deliveryWindowEnd:   existing?.deliveryWindow?.end   ?? '',
    pallets: [defaultPallet()],
    boxTrackings: {},
    bolNumber:           existing?.bolNumber        ?? '',
    ltlTrackingNumber:   existing?.trackingNumber   ?? '',
  };
}

// ─── 单货件配送表单 ───────────────────────────────────────────────────────────

function ShipmentTransportForm({
  allocId,
  platformOpts,
  existingSelectionId,
  state,
  onChange,
  onConfirm,
  confirming,
  error,
  onStartEdit,
  deliveryLocked,
}: {
  allocId: string;
  platformOpts: FbaTransportOption[];
  existingSelectionId?: string;
  state: AllocState;
  onChange: (p: Partial<AllocState>) => void;
  onConfirm: () => void;
  confirming: boolean;
  error: string;
  onStartEdit?: () => void;
  deliveryLocked?: boolean;
}) {
  const carriers = state.carrierType === 'partnered' ? [...PARTNERED_CARRIERS] : [...NON_PARTNERED_CARRIERS];
  const selectedCarrier = carriers.find(c => c.id === state.carrierId);
  const isLtl = state.mode === 'LTL';

  // 过滤 OMS 真实选项：按 mode 过滤（让用户的货件类型选择影响展示的选项）
  const filteredOpts = state.mode
    ? platformOpts.filter(o => o.mode === state.mode)
    : platformOpts;
  const selectedOpt = filteredOpts.find(o => o.id === state.selectedOptId);
  const deliveryDates = genDeliveryDates(state.shipDate, state.mode);

  // ── 已确认只读摘要 ──
  if (existingSelectionId) {
    const confirmedOpt = platformOpts.find(o => o.id === existingSelectionId);
    const slot = TIME_SLOTS.find(s => s.id === state.deliveryTimeSlotId);
    const rows: [string, string][] = [
      ['货件类型', state.mode === 'SPD' ? '小包裹快递 (SPD)' : state.mode === 'LTL' ? '汽运零担 (LTL)' : confirmedOpt?.mode ?? '—'],
      ['承运类型', state.carrierType === 'partnered' ? '合作承运商 (SEND)' : state.carrierType === 'non-partnered' ? '其他承运商' : '—'],
      ['承运商', selectedCarrier?.name ?? confirmedOpt?.carrier ?? '—'],
      ['运输服务', state.serviceType || confirmedOpt?.serviceType || '—'],
      ['发货日期', state.shipDate || '—'],
      ['送达日期', state.deliveryDate || state.deliveryWindowStart?.slice(0, 10) || '—'],
      ['送达时间段', slot ? slot.label : (state.deliveryWindowStart ? `${state.deliveryWindowStart.slice(11)} — ${state.deliveryWindowEnd.slice(11)}` : '—')],
      ...(confirmedOpt?.quote ? [['预估运费', `$${confirmedOpt.quote.amount.toFixed(2)} ${confirmedOpt.quote.currency}`] as [string, string]] : []),
      ...(isLtl ? [['托盘信息', state.pallets.map(p => `${p.count}托 ${p.length}×${p.width}×${p.height}in${p.weight > 0 ? ` ${p.weight}lbs` : ''}${p.stackable ? ' 可堆叠' : ''}`).join(' / ')] as [string, string]] : []),
    ];
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span className="text-[13px] font-semibold text-emerald-700">配送方案已确认</span>
          </div>
          {onStartEdit && (
            <button onClick={onStartEdit} className="text-[12px] text-[var(--primary)] hover:underline shrink-0">
              在送达时段开始前可修改 →
            </button>
          )}
          {!onStartEdit && deliveryLocked && (
            <span className="text-[11px] text-red-500 shrink-0">⏰ 送达时段已开始，不可更改</span>
          )}
        </div>
        <table className="w-full text-[12px]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-emerald-100 last:border-0">
                <td className="px-4 py-2 font-medium text-[var(--muted)] whitespace-nowrap w-28">{k}</td>
                <td className="px-4 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 快速填写（演示）*/}
      {platformOpts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
          <span className="text-[12px] text-[var(--muted)]">逐步填写，或快速自动填写并一键确认</span>
          <button type="button"
            onClick={() => {
              const opt = platformOpts.find(o => o.mode === 'SPD') ?? platformOpts[0];
              if (!opt) return;
              const today = new Date().toISOString().slice(0, 10);
              const days = opt.mode === 'LTL' ? 10 : 6;
              const delivDateObj = new Date(); delivDateObj.setDate(delivDateObj.getDate() + days);
              const delivDate = delivDateObj.toISOString().slice(0, 10);
              const slot = TIME_SLOTS[0];
              const pCarrier = opt.isPartnered
                ? (PARTNERED_CARRIERS.find(c => c.name.startsWith((opt.carrier ?? '').split(' ')[0])) ?? PARTNERED_CARRIERS[0])
                : undefined;
              const npCarrier = !opt.isPartnered
                ? (NON_PARTNERED_CARRIERS.find(c => c.name === opt.carrier) ?? NON_PARTNERED_CARRIERS[0])
                : undefined;
              onChange({
                mode: opt.mode as 'SPD' | 'LTL',
                carrierType: opt.isPartnered ? 'partnered' : 'non-partnered',
                carrierId: pCarrier?.id ?? npCarrier?.id ?? 'ups',
                serviceType: opt.serviceType ?? '',
                shipDate: today,
                selectedOptId: opt.id,
                deliveryDate: delivDate,
                deliveryTimeSlotId: slot.id,
                deliveryWindowStart: `${delivDate} ${slot.start}`,
                deliveryWindowEnd: `${delivDate} ${slot.end}`,
                pallets: opt.mode === 'LTL' ? [defaultPallet()] : [],
              });
            }}
            className="text-[12px] font-medium text-[var(--primary)] hover:underline"
          >
            自动填写（演示）
          </button>
        </div>
      )}
      {/* ① 货件类型 */}
      <div>
        <p className={lbl}>① 货件类型 *</p>
        <div className="grid grid-cols-2 gap-3">
          {(['SPD', 'LTL'] as const).map(m => (
            <label key={m} className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
              state.mode === m ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40',
            )}>
              <input type="radio" name={`mode-${allocId}`} className="mt-0.5"
                checked={state.mode === m}
                onChange={() => onChange({ mode: m, selectedOptId: '', deliveryDate: '', deliveryTimeSlotId: '', deliveryWindowStart: '', deliveryWindowEnd: '' })} />
              <div>
                <div className="text-[13px] font-semibold">{m === 'SPD' ? '小包裹快递 (SPD)' : '汽运零担 (LTL)'}</div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {m === 'SPD' ? '按箱提交运单号；适合小批量快递' : '需填写托盘信息、提单号(BOL)；适合大批量货运'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {state.mode && (
        <>
          {/* ② 承运商类型 */}
          <div>
            <p className={lbl}>② 承运商类型 *</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'partnered'     as const, label: '合作承运商 (SEND)', desc: '亚马逊合作，可查看预估运费和优惠运价' },
                { key: 'non-partnered' as const, label: '其他承运商',         desc: '自行安排承运，提交运单号即可' },
              ]).map(opt => (
                <label key={opt.key} className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
                  state.carrierType === opt.key ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40',
                )}>
                  <input type="radio" name={`ctype-${allocId}`} className="mt-0.5"
                    checked={state.carrierType === opt.key}
                    onChange={() => onChange({ carrierType: opt.key, carrierId: '', serviceType: '', selectedOptId: '' })} />
                  <div>
                    <div className="text-[13px] font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ③ 承运商 & 运输服务 */}
          {state.carrierType && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>③ 承运商 *</label>
                <select className={input} value={state.carrierId}
                  onChange={e => onChange({ carrierId: e.target.value, serviceType: '', selectedOptId: '' })}>
                  <option value="">请选择承运商</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {selectedCarrier && (
                <div>
                  <label className={lbl}>运输服务</label>
                  <select className={input} value={state.serviceType}
                    onChange={e => onChange({ serviceType: e.target.value })}>
                    <option value="">请选择服务类型</option>
                    {selectedCarrier.services.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ④ 发货日期 */}
          {state.carrierId && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>④ 发货日期 *</label>
                <input type="date" className={input}
                  min={new Date().toISOString().slice(0, 10)}
                  value={state.shipDate}
                  onChange={e => onChange({ shipDate: e.target.value, selectedOptId: '', deliveryDate: '', deliveryTimeSlotId: '', deliveryWindowStart: '', deliveryWindowEnd: '' })} />
                <p className="mt-1 text-[11px] text-[var(--muted)]">只能选当前时间之后的日期</p>
              </div>
            </div>
          )}

          {/* ⑤ 选择承运方式（OMS 真实返回的选项，按货件类型过滤）*/}
          {state.carrierId && state.shipDate && (
            <div>
              <p className={lbl}>⑤ 选择承运方式 *</p>
              {filteredOpts.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-[12px] text-amber-700">
                  当前货件类型（{state.mode}）暂无可用运输方案，请返回上方重新选择货件类型。
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOpts.map(opt => {
                    const isSelected = state.selectedOptId === opt.id;
                    const expired = opt.quote ? new Date(opt.quote.expiresAt) < new Date() : false;
                    return (
                      <label key={opt.id} className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all',
                        isSelected ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40',
                        expired && 'opacity-50 cursor-not-allowed',
                      )}>
                        <input type="radio" name={`opt-${allocId}`} disabled={expired}
                          checked={isSelected}
                          onChange={() => onChange({ selectedOptId: opt.id })}
                          className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold">
                              {opt.mode === 'SPD' ? '小包裹快递 (SPD)' : '汽运零担 (LTL)'}
                            </span>
                            {opt.isPartnered && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">合作承运 SEND</span>
                            )}
                            <span className="text-[12px] text-[var(--muted)]">{opt.carrier}{opt.serviceType ? ` · ${opt.serviceType}` : ''}</span>
                          </div>
                          {opt.estimatedArrival && (
                            <p className="mt-0.5 text-[11px] text-[var(--muted)]">预计 {opt.estimatedArrival} 到仓</p>
                          )}
                        </div>
                        {opt.quote && (
                          <div className="text-right shrink-0">
                            <span className={cn('text-[13px] font-semibold', expired ? 'text-red-500' : 'text-amber-600')}>
                              ${opt.quote.amount.toFixed(2)} {opt.quote.currency}
                            </span>
                            {expired && <p className="text-[11px] text-red-500">报价已过期</p>}
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ⑥ 送达日期 + 时间段 */}
          {state.selectedOptId && state.shipDate && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>⑥ 送达日期 *</label>
                <select className={input} value={state.deliveryDate}
                  onChange={e => onChange({ deliveryDate: e.target.value, deliveryTimeSlotId: '', deliveryWindowStart: '', deliveryWindowEnd: '' })}>
                  <option value="">请选择送达日期</option>
                  {deliveryDates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-[var(--muted)]">系统从平台获取可选日期</p>
              </div>
              {state.deliveryDate && (
                <div>
                  <label className={lbl}>送达时间段 *</label>
                  <select className={input} value={state.deliveryTimeSlotId}
                    onChange={e => {
                      const slot = TIME_SLOTS.find(s => s.id === e.target.value);
                      if (!slot) return onChange({ deliveryTimeSlotId: '' });
                      onChange({
                        deliveryTimeSlotId: slot.id,
                        deliveryWindowStart: `${state.deliveryDate} ${slot.start}`,
                        deliveryWindowEnd:   `${state.deliveryDate} ${slot.end}`,
                      });
                    }}>
                    <option value="">请选择时间段</option>
                    {TIME_SLOTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  {state.deliveryTimeSlotId && (
                    <p className="mt-1 text-[11px] text-[var(--muted)]">确认后在此时间前可修改，超时不可更改</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ⑦ 托盘信息（LTL）*/}
          {isLtl && state.selectedOptId && (
            <div>
              <p className={lbl}>⑦ 托盘信息（LTL 必填）</p>
              <div className="space-y-3">
                {state.pallets.map((pallet, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-semibold">托盘规格 {idx + 1}</span>
                      {state.pallets.length > 1 && (
                        <button type="button"
                          onClick={() => onChange({ pallets: state.pallets.filter((_, i) => i !== idx) })}
                          className="rounded p-1 text-[var(--muted)] hover:text-red-600">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {[
                        { key: 'count',  label: '数量 *',      placeholder: '1',   step: 1   },
                        { key: 'length', label: '长 (in)',     placeholder: '48',  step: 0.1 },
                        { key: 'width',  label: '宽 (in)',     placeholder: '40',  step: 0.1 },
                        { key: 'height', label: '高 (in)',     placeholder: '60',  step: 0.1 },
                        { key: 'weight', label: '重量 (lbs)', placeholder: '400', step: 0.1 },
                      ].map(({ key, label, placeholder, step }) => (
                        <div key={key}>
                          <label className="text-[11px] text-[var(--muted)]">{label}</label>
                          <input type="number" min={0} step={step}
                            className="mt-0.5 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--primary)] text-right tabular-nums"
                            value={(pallet as Record<string, unknown>)[key] as number || ''}
                            placeholder={placeholder}
                            onChange={e => {
                              const p = [...state.pallets];
                              p[idx] = { ...p[idx], [key]: Number(e.target.value) };
                              onChange({ pallets: p });
                            }} />
                        </div>
                      ))}
                      <div className="flex items-end pb-0.5">
                        <label className="flex cursor-pointer items-center gap-1.5 text-[12px]">
                          <input type="checkbox" checked={pallet.stackable}
                            onChange={e => {
                              const p = [...state.pallets];
                              p[idx] = { ...p[idx], stackable: e.target.checked };
                              onChange({ pallets: p });
                            }} />
                          可堆叠
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => onChange({ pallets: [...state.pallets, defaultPallet()] })}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--primary)] hover:underline">
                  <Plus className="size-3.5" />添加托盘规格
                </button>
              </div>
            </div>
          )}

          {/* 错误 */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
          )}

          <div className="flex justify-end">
            <button onClick={onConfirm}
              disabled={
                !state.mode || !state.carrierId || !state.shipDate ||
                !state.selectedOptId ||
                !state.deliveryDate || !state.deliveryTimeSlotId ||
                confirming ||
                (isLtl && state.pallets.some(p => !p.count))
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {confirming && <Loader2 className="size-3.5 animate-spin" />}
              确认此货件配送方案
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 单货件追踪表单 ───────────────────────────────────────────────────────────

function ShipmentTrackingForm({
  alloc,
  state,
  onChange,
  onSave,
  saving,
  error,
  relatedOutboundOrders,
}: {
  alloc: PlatformAllocation;
  state: AllocState;
  onChange: (p: Partial<AllocState>) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  relatedOutboundOrders?: import('./replenishment').OutboundOrder[];
}) {
  const isLtl = !!(alloc.transport?.mode === 'LTL' || state.mode === 'LTL' || state.pallets.length > 0);
  const slot = TIME_SLOTS.find(s => s.id === state.deliveryTimeSlotId);
  const boxes = alloc.boxes ?? [];

  // 配送摘要（优先来自 alloc.transport 回填，其次来自 form state）
  const displayShipDate = state.shipDate || alloc.transport?.scheduledPickup?.slice(0, 10) || '';
  const displayDelivDate = state.deliveryDate || alloc.transport?.deliveryWindow?.start?.slice(0, 10) || '';
  const displayDelivSlot = slot?.label || (alloc.transport?.deliveryWindow
    ? `${alloc.transport.deliveryWindow.start.slice(11, 16)} — ${alloc.transport.deliveryWindow.end.slice(11, 16)}`
    : (state.deliveryWindowStart ? `${state.deliveryWindowStart.slice(11)} — ${state.deliveryWindowEnd.slice(11)}` : ''));

  return (
    <div className="space-y-5">
      {/* 关联出库单 */}
      {relatedOutboundOrders && relatedOutboundOrders.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden">
          <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">关联出库单 · 追踪号将自动同步回写</p>
          {relatedOutboundOrders.map(oo => (
            <div key={oo.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{oo.number}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                  oo.status === 'shipped' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' :
                  oo.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                  'bg-gray-50 text-gray-600 ring-gray-200'
                )}>{
                  oo.status === 'shipped' ? '已发运' : oo.status === 'completed' ? '已完成' :
                  oo.status === 'planned' ? '已计划' : oo.status === 'released' ? '已下发' : oo.status
                }</span>
              </div>
              {oo.trackingNumber ? (
                <span className="text-[var(--muted)] font-mono text-[11px]">{oo.carrier} · {oo.trackingNumber}</span>
              ) : (
                <button type="button"
                  onClick={() => {
                    if (isLtl) onChange({ ltlTrackingNumber: oo.number });
                    else onChange({ boxTrackings: Object.fromEntries(boxes.map(b => [b.boxNumber, state.boxTrackings[b.boxNumber] || oo.number])) });
                  }}
                  className="text-[11px] text-[var(--primary)] hover:underline"
                >
                  使用出库单号填充追踪
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 合作承运商 (SEND) 追踪号自动回填提示 */}
      {!isLtl && state.carrierType === 'partnered' && Object.values(state.boxTrackings).some(t => !!t) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] text-blue-800">
          ✓ 合作承运商 (SEND) 已自动返回各箱追踪编号，请核对后提交。提交后自动同步至关联出库单并标记已发运。
        </div>
      )}

      {/* 配送摘要 */}
      {(displayDelivDate || displayShipDate || alloc.transport?.carrier) && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] overflow-hidden">
          <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">配送信息</p>
          <table className="w-full text-[12px]">
            <tbody>
              {([
                ['承运商', alloc.transport?.carrier || state.shipDate && (state.carrierType === 'partnered' ? '合作承运商(SEND)' : '自选承运商') || '—'],
                ['货件类型', alloc.transport?.mode === 'SPD' ? '小包裹快递 (SPD)' : alloc.transport?.mode === 'LTL' ? '汽运零担 (LTL)' : state.mode || '—'],
                ['发货日期', displayShipDate || '—'],
                ['送达日期', displayDelivDate || '—'],
                ['送达时间段', displayDelivSlot || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-4 py-2 font-medium text-[var(--muted)] whitespace-nowrap w-28">{k}</td>
                  <td className="px-4 py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLtl ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>提单号 (BOL) *</label>
              <input className={input} value={state.bolNumber}
                onChange={e => onChange({ bolNumber: e.target.value })}
                placeholder="BOL-XXXXXXXXX" />
            </div>
            <div>
              <label className={lbl}>货件跟踪编号</label>
              <input className={input} value={state.ltlTrackingNumber}
                onChange={e => onChange({ ltlTrackingNumber: e.target.value })}
                placeholder="PRO Number 或运单号" />
            </div>
          </div>
          {state.pallets.length > 0 && (
            <div>
              <p className={lbl}>托盘信息</p>
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-2 text-left">托盘</th>
                      <th className="px-4 py-2 text-right">数量</th>
                      <th className="px-4 py-2 text-right">尺寸 (in)</th>
                      <th className="px-4 py-2 text-right">重量 (lbs)</th>
                      <th className="px-4 py-2 text-center">可堆叠</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {state.pallets.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">托盘 {i + 1}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.count}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.length}×{p.width}×{p.height}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.weight || '—'}</td>
                        <td className="px-4 py-2 text-center">{p.stackable ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className={lbl}>按箱维度填写跟踪编号 (SPD) *</p>
          {boxes.length === 0 ? (
            <p className="text-[12px] text-[var(--muted)]">暂无箱子信息，请先确认装箱步骤</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">箱号</th>
                    <th className="px-4 py-2.5 text-left">跟踪编号 *</th>
                    <th className="px-4 py-2.5 text-right">件数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {boxes.map(box => (
                    <tr key={box.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-4 py-2.5 font-medium">{box.boxNumber}</td>
                      <td className="px-4 py-2.5">
                        <input
                          className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--primary)]"
                          value={state.boxTrackings[box.boxNumber] ?? ''}
                          onChange={e => onChange({ boxTrackings: { ...state.boxTrackings, [box.boxNumber]: e.target.value } })}
                          placeholder="如 1Z999AA10123456784"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">
                        {box.lines.reduce((s, l) => s + l.quantity, 0)} 件
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
      )}

      <div className="flex justify-end">
        <button onClick={onSave}
          disabled={saving || (isLtl && !state.bolNumber)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          提交追踪信息
        </button>
      </div>
    </div>
  );
}

// ─── 主工作台 ────────���────────────────────────────────────────────────────────

interface TransportWorkstationProps {
  inboundPlan: InboundPlan;
  snapshot: OmsSnapshot;
  onClose: () => void;
  inline?: boolean;
  showTracking?: boolean;
}

export function TransportWorkstation({
  inboundPlan, snapshot, onClose, inline, showTracking = false,
}: TransportWorkstationProps) {
  const { executeReplenishment } = useOms();
  const allocs = (snapshot.platformAllocations ?? []).filter(a => inboundPlan.allocationIds.includes(a.id));
  const transportOpts = inboundPlan.transportOptions ?? {};
  const existingSelections = inboundPlan.selectedTransportOptions ?? {};

  const [states, setStates] = useState<Record<string, AllocState>>(() =>
    Object.fromEntries(allocs.map(a => {
      const base = defaultAllocState(a.transport);
      // 追踪模式下：合作承运商(SEND) + SPD → 自动回填各箱追踪号
      if (showTracking && a.boxes?.length) {
        const optionId = existingSelections[a.id];
        const opt = (transportOpts[a.id] ?? []).find(o => o.id === optionId);
        if (opt?.isPartnered && (opt.mode === 'SPD' || a.transport?.mode === 'SPD')) {
          const seed = (a.externalShipmentId ?? 'FBASHIP').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8).padStart(8, '0');
          const autoTracks: Record<string, string> = {};
          (a.boxes ?? []).forEach((box, idx) => {
            autoTracks[box.boxNumber] = base.boxTrackings[box.boxNumber] ||
              `1Z${seed}${String(idx + 1).padStart(6, '0')}`;
          });
          const pCarrier = PARTNERED_CARRIERS.find(c => c.name.startsWith((opt.carrier ?? '').split(' ')[0]));
          return [a.id, {
            ...base,
            mode: 'SPD' as AllocState['mode'],
            carrierType: 'partnered' as AllocState['carrierType'],
            carrierId: pCarrier?.id ?? 'ups-send',
            boxTrackings: autoTracks,
          }];
        }
        if (a.transport?.mode === 'LTL' || opt?.mode === 'LTL') {
          return [a.id, { ...base, mode: 'LTL' as AllocState['mode'] }];
        }
      }
      return [a.id, base];
    }))
  );
  const [confirmingId,     setConfirmingId]     = useState<string | null>(null);
  const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null);
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [editingIds,       setEditingIds]       = useState<Set<string>>(new Set());

  const updateState = (id: string, patch: Partial<AllocState>) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setErrors(prev => ({ ...prev, [id]: '' }));
  };

  const handleConfirmTransport = async (allocId: string) => {
    const st = states[allocId];
    if (!st.selectedOptId)      { setErrors(e => ({ ...e, [allocId]: '请选择运输方案' })); return; }
    if (!st.shipDate)            { setErrors(e => ({ ...e, [allocId]: '请填写发货日期' })); return; }
    if (!st.deliveryDate)        { setErrors(e => ({ ...e, [allocId]: '请选择送达日期' })); return; }
    if (!st.deliveryTimeSlotId)  { setErrors(e => ({ ...e, [allocId]: '请选择送达时间段' })); return; }
    const opt = (transportOpts[allocId] ?? []).find(o => o.id === st.selectedOptId);
    if (opt?.mode === 'LTL' && st.pallets.some(p => !p.count)) {
      setErrors(e => ({ ...e, [allocId]: 'LTL 模式每个托盘必须填写数量' }));
      return;
    }

    setConfirmingId(allocId);
    setErrors(e => ({ ...e, [allocId]: '' }));
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_select_transport_option',
        inboundPlanId: inboundPlan.id,
        allocationId: allocId,
        optionId: st.selectedOptId,
      });
      setEditingIds(prev => { const n = new Set(prev); n.delete(allocId); return n; });
    } catch (e) {
      setErrors(prev => ({ ...prev, [allocId]: e instanceof Error ? e.message : '操作失败' }));
    } finally { setConfirmingId(null); }
  };

  const handleSaveTracking = async (allocId: string) => {
    const st = states[allocId];
    setSavingTrackingId(allocId);
    setErrors(e => ({ ...e, [allocId]: '' }));
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_update_shipment_tracking',
        inboundPlanId: inboundPlan.id,
        allocationId: allocId,
        carrier: (transportOpts[allocId] ?? []).find(o => o.id === st.selectedOptId)?.carrier ?? 'Unknown',
        trackingNumber: st.ltlTrackingNumber || st.bolNumber || Object.values(st.boxTrackings)[0] || '',
      });
    } catch (e) {
      setErrors(prev => ({ ...prev, [allocId]: e instanceof Error ? e.message : '保存失败' }));
    } finally { setSavingTrackingId(null); }
  };

  const allConfirmed = allocs.every(a => existingSelections[a.id]);

  // 一键确认全部货件（演示用：自动选择第一个可用运输方案）
  const [quickConfirming, setQuickConfirming] = useState(false);
  const handleQuickConfirmAll = async () => {
    const selections = allocs
      .filter(a => !existingSelections[a.id])
      .flatMap(a => {
        const opts = (transportOpts[a.id] ?? []) as FbaTransportOption[];
        const opt = opts.find(o => o.mode === 'SPD') ?? opts[0];
        return opt ? [{ allocationId: a.id, optionId: opt.id }] : [];
      });
    if (!selections.length) return;
    setQuickConfirming(true);
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'inbound_confirm_all_transport',
        inboundPlanId: inboundPlan.id,
        selections,
      });
    } catch (e) {
      setErrors(prev => ({ ...prev, _global: e instanceof Error ? e.message : '操作失败' }));
    } finally { setQuickConfirming(false); }
  };

  const inner = (
    <>
      <div className="border-b border-[var(--border-subtle)] bg-amber-50 px-5 py-3 text-[12px] text-amber-800">
        {showTracking
          ? 'SPD：按箱维度填写跟踪编号；LTL：填写提单号(BOL)和整体跟踪编号。在送达时段开始前可修改，超时不可更改。'
          : '为每票货件分别选择运输方案、发货日期和送达时段，全部确认后状态自动推进。配送方案在送达时段开始前可修改。'}
        {!showTracking && !allConfirmed && allocs.some(a => (transportOpts[a.id]?.length ?? 0) > 0) && (
          <button
            disabled={quickConfirming}
            onClick={() => void handleQuickConfirmAll()}
            className="ml-3 inline-flex items-center gap-1 rounded-md bg-amber-700/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-700/20 disabled:opacity-40"
          >
            {quickConfirming ? '确认中…' : '一键确认全部货件（演示）'}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {allocs.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Truck className="size-10 text-[var(--border)]" />
            <p className="mt-3 text-[13px] text-[var(--muted)]">暂无货件，请先确认分仓方案</p>
          </div>
        )}
        {allocs.map((alloc, idx) => {
          const totalQty = alloc.lines.reduce((s, l) => s + l.quantity, 0);
          const st = states[alloc.id] ?? defaultAllocState();
          const pOpts = (transportOpts[alloc.id] ?? []) as FbaTransportOption[];
          const isEditing = editingIds.has(alloc.id);
          const isConfirmed = !!existingSelections[alloc.id];
          // 送达时段开始后锁定配送方案（不可再编辑）
          const deliveryLocked = st.deliveryWindowStart
            ? new Date(st.deliveryWindowStart) <= new Date()
            : false;
          // 关联出库单（用于追踪回写）
          const relatedOutboundOrders = (snapshot.outboundOrdersV2 ?? [])
            .filter(o => alloc.sourceExecutionIds?.includes(o.id));

          return (
            <div key={alloc.id} className={cn('p-6', isConfirmed && !showTracking && !isEditing && 'bg-emerald-50/20')}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-bold text-white">{idx + 1}</div>
                  <span className="text-[14px] font-semibold">{alloc.externalShipmentId ?? alloc.destinationCode}</span>
                  {isConfirmed && !showTracking && !isEditing && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">已确认</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
                  <span>{alloc.destinationName ?? alloc.destinationCode}</span>
                  <span>·</span>
                  <span>{totalQty} 件</span>
                </div>
              </div>

              {showTracking ? (
                <ShipmentTrackingForm
                  alloc={alloc}
                  state={st}
                  onChange={patch => updateState(alloc.id, patch)}
                  onSave={() => void handleSaveTracking(alloc.id)}
                  saving={savingTrackingId === alloc.id}
                  error={errors[alloc.id] ?? ''}
                  relatedOutboundOrders={relatedOutboundOrders}
                />
              ) : (
                <ShipmentTransportForm
                  allocId={alloc.id}
                  platformOpts={pOpts}
                  existingSelectionId={!isEditing ? existingSelections[alloc.id] : undefined}
                  state={st}
                  onChange={patch => updateState(alloc.id, patch)}
                  onConfirm={() => void handleConfirmTransport(alloc.id)}
                  confirming={confirmingId === alloc.id}
                  error={errors[alloc.id] ?? ''}
                  deliveryLocked={deliveryLocked}
                  onStartEdit={isConfirmed && !isEditing && !deliveryLocked
                    ? () => setEditingIds(prev => new Set([...prev, alloc.id]))
                    : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-[var(--border)] px-5 py-4">
        {errors._global && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{errors._global}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-[var(--muted)]">
            {showTracking
              ? `${allocs.length} 票货件 · 请分别填写追踪信息`
              : `已确认 ${allocs.filter(a => existingSelections[a.id]).length} / ${allocs.length} 票`}
          </div>
          <div className="flex gap-2">
            {!inline && (
              <button onClick={onClose}
                className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] hover:bg-[var(--surface-subtle)]">
                稍后处理
              </button>
            )}
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
            <h2 className="text-[13px] font-semibold">{showTracking ? '货件追踪' : '配送服务'}</h2>
            <p className="text-[12px] text-[var(--muted)]">
              {allocs.length} 票货件 ·{' '}
              {showTracking ? 'SPD 填写跟踪编号；LTL 填写提单号和追踪号' : '请为每票分别选择运输方案'}
            </p>
          </div>
        </div>
        {inner}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div className="flex w-full max-w-[840px] flex-col bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold">{showTracking ? '货件追踪' : '配送服务'}</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{inboundPlan.number} · {allocs.length} 票货件</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
            <X className="size-5" />
          </button>
        </div>
        {inner}
      </div>
    </div>
  );
}
