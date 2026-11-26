'use client';
/**
 * Unis YMS 预约工作台
 *
 * 预约信息分三个可独立编辑的区块：
 *   ① 预约时间（可修改，检入后锁定）
 *   ② 车辆信息（随时可填写/修改）
 *   ③ 司机信息（随时可填写/修改）
 *
 * 状态由 YMS 推进，OMS 负责填写信息后提交，Checked In 及之后由 YMS 自动完成并查询同步。
 */

import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Edit2, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboundOrder, InboundPlan, UnisAppointment, UnisDeliveryType } from './replenishment';
import type { OmsSnapshot } from './types';
import { useOms } from './provider';

// ─── 样式 ─────────────────────────────────────────────────────────────────────

const input = 'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';
const lbl = 'block text-[12px] font-medium text-[var(--muted)] mb-1';

// ─── 状态配置 ─────────────────────────────────────────────────────────────────

const statusCfg: Record<UnisAppointment['status'], { label: string; cls: string; dot: string }> = {
  new:                   { label: 'New',                   cls: 'bg-blue-50 text-blue-700 ring-blue-200',       dot: 'bg-blue-500' },
  not_confirmed:         { label: 'Not Confirmed',         cls: 'bg-gray-50 text-gray-600 ring-gray-200',      dot: 'bg-gray-400' },
  pending_dispatch:      { label: 'Pending Dispatch',      cls: 'bg-amber-50 text-amber-700 ring-amber-200',    dot: 'bg-amber-500' },
  waiting_for_driver:    { label: 'Waiting for Driver',    cls: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  pre_check_in_complete: { label: 'Pre Check-in Complete', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
  checked_in:            { label: 'Checked In',            cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  in_progress:           { label: 'In Progress',           cls: 'bg-sky-50 text-sky-700 ring-sky-200',          dot: 'bg-sky-500' },
  completed:             { label: 'Completed',             cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-600' },
  cancelled:             { label: 'Cancelled',             cls: 'bg-slate-50 text-slate-500 ring-slate-200',    dot: 'bg-slate-400' },
};

const PROGRESS_STEPS: { key: UnisAppointment['status']; label: string; yms?: true }[] = [
  { key: 'new',                   label: 'New' },
  { key: 'not_confirmed',         label: 'Link Sent' },
  { key: 'waiting_for_driver',    label: 'Vehicle Info' },
  { key: 'pre_check_in_complete', label: 'Pre Check-in' },
  { key: 'checked_in',            label: 'Checked In',  yms: true },
  { key: 'in_progress',           label: 'In Progress', yms: true },
];
const STEP_ORDER: UnisAppointment['status'][] = [
  'new','not_confirmed','pending_dispatch','waiting_for_driver','pre_check_in_complete','checked_in','in_progress','completed',
];

const UNIS_CARRIERS = [
  'ACE CRANE SERVICE INC', 'UPS', 'FedEx', 'XPO Logistics',
  'Werner Enterprises', 'Schneider National', 'J.B. Hunt', 'Old Dominion',
  'Estes Express Lines', 'Other',
];
const VEHICLE_TYPES = ['Tractor', 'Straight Truck', 'Van', 'Flatbed', 'Other'];

// 操作记录标签
const UNIS_EVENT_LABELS: Record<string, string> = {
  unis_create_appointment:       '创建预约',
  unis_send_driver_link:         '发送司机链接',
  unis_submit_vehicle_info:      '提交车辆信息',
  unis_submit_driver_info:       '提交司机信息',
  unis_update_appointment_time:  '修改预约时间',
  unis_sync_yms_status:          '查询 YMS 状态同步',
};

// ─── 迷你月历 ─────────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onChange }: { selected: string; onChange: (d: string) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const todayStr = today.toISOString().slice(0, 10);
  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 select-none" style={{ minWidth: 270 }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="rounded-md p-1 hover:bg-[var(--surface-subtle)]"><ChevronLeft className="size-4" /></button>
        <span className="text-[13px] font-semibold">{monthNames[month]} {year}</span>
        <button onClick={nextMonth} className="rounded-md p-1 hover:bg-[var(--surface-subtle)]"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-[var(--muted)] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isPast = dateStr < todayStr;
          const isSelected = dateStr === selected;
          const isToday = dateStr === todayStr;
          return (
            <button key={d} disabled={isPast} onClick={() => onChange(dateStr)}
              className={cn('flex size-8 mx-auto items-center justify-center rounded-full text-[12px] transition-colors',
                isSelected ? 'bg-[var(--primary)] text-white font-semibold' :
                isToday ? 'ring-2 ring-[var(--primary)] font-semibold' :
                isPast ? 'text-[var(--border)] cursor-not-allowed' : 'hover:bg-[var(--surface-subtle)]')}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ selected, onChange }: { selected: string; onChange: (t: string) => void }) {
  const [period, setPeriod] = useState<'AM'|'PM'>('AM');
  const [hour, setHour] = useState<number|null>(null);
  const hours = period === 'AM' ? [0,1,2,3,4,5,6,7,8,9,10,11] : [12,13,14,15,16,17,18,19,20,21,22,23];
  const disp = (h: number) => `${String(h%12===0?12:h%12).padStart(2,'0')}:00`;
  const slots = hour !== null ? Array.from({length:4},(_,i) => ({
    time: `${String(hour).padStart(2,'0')}:${String(i*15).padStart(2,'0')}`,
    avail: Math.floor(Math.random()*500)+500,
  })) : [];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ minWidth: 280 }}>
      <div className="flex gap-2 mb-4">
        {(['AM','PM'] as const).map(p => (
          <button key={p} onClick={() => { setPeriod(p); setHour(null); }}
            className={cn('flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors',
              period===p ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-subtle)] hover:bg-[var(--border)]')}>
            {p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {hours.map(h => (
          <button key={h} onClick={() => setHour(h)}
            className={cn('rounded-lg py-2 text-[13px] font-semibold transition-colors',
              hour===h ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-subtle)] hover:bg-[var(--border)]')}>
            {disp(h)}
          </button>
        ))}
      </div>
      {hour !== null && (
        <>
          <p className="text-[11px] text-[var(--muted)] text-center mb-2">Choose a time</p>
          <div className="grid grid-cols-2 gap-1.5">
            {slots.map(s => (
              <button key={s.time} onClick={() => onChange(s.time)}
                className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-[12px] transition-colors',
                  selected===s.time ? 'bg-[var(--primary)] text-white font-semibold' : 'bg-[var(--surface-subtle)] hover:bg-[var(--border)]')}>
                <span className="font-semibold">{s.time}</span>
                <span className="text-[10px] opacity-70">{s.avail}<br/>Available</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 预约创建表单 ─────────────────────────────────────────────────────────────

function AppointmentCreateForm({ inboundOrder, inboundPlan, snapshot, onClose }: {
  inboundOrder: InboundOrder; inboundPlan: InboundPlan; snapshot: OmsSnapshot; onClose: () => void;
}) {
  const { executeReplenishment } = useOms();
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [deliveryType, setDeliveryType] = useState<UnisDeliveryType>('live_delivery');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const effectiveCarrier = carrier === 'Other' ? customCarrier.trim() : carrier;
  const canSubmit = !!effectiveCarrier && !!date && !!time;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      await executeReplenishment(snapshot.merchantId, {
        type: 'unis_create_appointment', inboundOrderId: inboundOrder.id, inboundPlanId: inboundPlan.id,
        warehouseId: inboundPlan.destinationWarehouseId ?? '', carrier: effectiveCarrier,
        deliveryType, appointmentDate: date, appointmentTime: time,
      });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '创建失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
        <h3 className="text-[13px] font-semibold">创建 Unis 预约</h3>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">入库单：{inboundOrder.number} · 预计 {inboundOrder.expectedQuantity} 件</p>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Carrier *</label>
            <select className={input} value={carrier} onChange={e => setCarrier(e.target.value)}>
              <option value="">请选择承运商</option>
              {UNIS_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {carrier === 'Other' && (
            <div>
              <label className={lbl}>自定义承运商 *</label>
              <input className={input} value={customCarrier} onChange={e => setCustomCarrier(e.target.value)} placeholder="如：SF Express" />
            </div>
          )}
          <div className={carrier === 'Other' ? 'col-span-2' : ''}>
            <label className={lbl}>Delivery Type *</label>
            <div className="flex gap-2">
              {(['live_delivery','drop_off_delivery'] as const).map(t => (
                <label key={t} className={cn('flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-[12px] transition-all',
                  deliveryType===t ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40')}>
                  <input type="radio" checked={deliveryType===t} onChange={() => setDeliveryType(t)} />
                  <span className="font-medium">{t==='live_delivery' ? 'Live Delivery' : 'Drop-off Delivery'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className={lbl}>预约日期 &amp; 时段 *</label>
          <div className="flex flex-wrap gap-4">
            <MiniCalendar selected={date} onChange={d => { setDate(d); setTime(''); }} />
            <div className="flex-1 min-w-[280px]">
              {date ? <TimePicker selected={time} onChange={setTime} />
                : <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[12px] text-[var(--muted)]">请先选择日期</div>}
            </div>
          </div>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] hover:bg-[var(--surface-subtle)]">取消</button>
          <button disabled={!canSubmit||loading} onClick={() => void submit()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-40 hover:opacity-90">
            {loading && <Loader2 className="size-3.5 animate-spin" />}提交预约
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 预约状态卡片（三区块可独立编辑）────────────────────────────────────────────

function AppointmentCard({ appt, inboundOrder, snapshot }: {
  appt: UnisAppointment; inboundOrder: InboundOrder; snapshot: OmsSnapshot;
}) {
  const { executeReplenishment } = useOms();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 展开状态
  const [editTime, setEditTime] = useState(false);
  const [editVehicle, setEditVehicle] = useState(false);
  const [editDriver, setEditDriver] = useState(false);

  // 时间编辑 state
  const [newDate, setNewDate] = useState(appt.appointmentDate);
  const [newTime, setNewTime] = useState(appt.appointmentTime);

  // 车辆信息 form state（初始化为已有值）
  const [vt, setVt] = useState(appt.vehicleInfo?.vehicleType ?? 'Tractor');
  const [plate, setPlate] = useState(appt.vehicleInfo?.licensePlate ?? '');
  const [tractorCarrier, setTractorCarrier] = useState(appt.vehicleInfo?.tractorCarrier ?? appt.carrier);
  const [usdot, setUsdot] = useState(appt.vehicleInfo?.usdot ?? '');
  const [mc, setMc] = useState(appt.vehicleInfo?.mcNumber ?? '');

  // 司机信息 form state（初始化为已有值）
  const [dPhone, setDPhone] = useState(appt.driverInfo?.phoneNumber ?? '');
  const [dLicense, setDLicense] = useState(appt.driverInfo?.licenseNumber ?? '');
  const [dFirst, setDFirst] = useState(appt.driverInfo?.firstName ?? '');
  const [dMid, setDMid] = useState(appt.driverInfo?.middleName ?? '');
  const [dLast, setDLast] = useState(appt.driverInfo?.lastName ?? '');

  const run = async (cmd: Parameters<typeof executeReplenishment>[1]) => {
    setLoading(true); setError('');
    try { await executeReplenishment(snapshot.merchantId, cmd); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setLoading(false); }
  };

  const cfg = statusCfg[appt.status];
  const curIdx = STEP_ORDER.indexOf(appt.status);
  const isLocked = ['checked_in','in_progress','completed','cancelled'].includes(appt.status);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* 预约头 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
        <span className="font-mono text-[13px] font-semibold">{appt.number}</span>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', cfg.cls)}>
          <span className={cn('size-1.5 rounded-full', cfg.dot)} />{cfg.label}
        </span>
        <span className="text-[12px] text-[var(--muted)]">· {appt.carrier} · {appt.deliveryType === 'live_delivery' ? 'Live Delivery' : 'Drop-off'}</span>
        <span className="ml-auto font-mono text-[11px] text-[var(--muted)]">RN: {appt.referenceNo}</span>
      </div>

      {/* 进度条 */}
      <div className="overflow-x-auto px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40">
        <div className="flex min-w-max items-start">
          {PROGRESS_STEPS.map((step, idx) => {
            const stepIdx = STEP_ORDER.indexOf(step.key);
            const done = curIdx > stepIdx;
            const active = curIdx === stepIdx || (step.key === 'waiting_for_driver' && curIdx === STEP_ORDER.indexOf('pending_dispatch'));
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-semibold',
                    step.yms ? (done||active ? 'bg-sky-400 text-white' : 'bg-[var(--border)] text-[var(--muted)]') :
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20' : 'bg-[var(--border)] text-[var(--muted)]')}>
                    {done ? '✓' : idx+1}
                  </div>
                  <span className={cn('text-[10px] font-medium whitespace-nowrap',
                    step.yms&&(done||active) ? 'text-sky-600' :
                    done ? 'text-emerald-600' : active ? 'text-[var(--primary)]' : 'text-[var(--muted)]')}>
                    {step.label}{step.yms ? ' ☁' : ''}
                  </span>
                </div>
                {idx < PROGRESS_STEPS.length-1 && (
                  <div className={cn('w-10 h-0.5 rounded-full mb-4 mx-1', done ? 'bg-emerald-400' : 'bg-[var(--border)]')} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-1">☁ 由 YMS 自动完成，OMS 通过 RN（{appt.referenceNo}）查询同步</p>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">

        {/* ── ① 预约时间 ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">预约时间</p>
              <p className="text-[13px] font-medium mt-0.5">{appt.appointmentDate} {appt.appointmentTime}</p>
            </div>
            {!isLocked && (
              <button onClick={() => setEditTime(v => !v)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-[12px] hover:bg-[var(--surface-subtle)]">
                <Edit2 className="size-3" />{editTime ? '收起' : '修改时间'}
              </button>
            )}
          </div>
          {editTime && (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 px-4 pb-4 pt-3">
              <div className="flex flex-wrap gap-4">
                <MiniCalendar selected={newDate} onChange={d => { setNewDate(d); setNewTime(''); }} />
                <div className="flex-1 min-w-[280px]">
                  {newDate ? <TimePicker selected={newTime} onChange={setNewTime} />
                    : <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[12px] text-[var(--muted)]">请先选择日期</div>}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditTime(false)} className="h-7 rounded-lg border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)]">取消</button>
                <button disabled={!newDate||!newTime||loading}
                  onClick={() => void run({ type: 'unis_update_appointment_time', appointmentId: appt.id, appointmentDate: newDate, appointmentTime: newTime }).then(() => setEditTime(false))}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white disabled:opacity-40">
                  {loading && <Loader2 className="size-3 animate-spin" />}保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ② 车辆信息 ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">车辆信息</p>
              {appt.vehicleInfo ? (
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3 text-[12px]">
                  {([
                    ['Vehicle Type', appt.vehicleInfo.vehicleType],
                    ['License Plate', appt.vehicleInfo.licensePlate],
                    ['Tractor Carrier', appt.vehicleInfo.tractorCarrier || '—'],
                    ['USDOT', appt.vehicleInfo.usdot || '—'],
                    ['MC Number', appt.vehicleInfo.mcNumber || '—'],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k}><span className="text-[var(--muted)]">{k}: </span><span className="font-medium">{v}</span></div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-amber-600 mt-0.5">尚未填写</p>
              )}
            </div>
            {!isLocked && (
              <button onClick={() => setEditVehicle(v => !v)}
                className={cn('inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[12px] transition-colors',
                  editVehicle ? 'border-[var(--border)] hover:bg-[var(--surface-subtle)]' :
                  appt.vehicleInfo ? 'border-[var(--border)] hover:bg-[var(--surface-subtle)]' : 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] hover:opacity-80')}>
                <Edit2 className="size-3" />{editVehicle ? '收起' : appt.vehicleInfo ? '修改' : '填写车辆信息'}
              </button>
            )}
          </div>
          {editVehicle && (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 px-4 pb-4 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Vehicle Type *</label>
                  <select className={input} value={vt} onChange={e => setVt(e.target.value)}>
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>License Plate Number *</label>
                  <input className={input} value={plate} onChange={e => setPlate(e.target.value)} placeholder="如：TRK-1234" />
                </div>
                <div>
                  <label className={lbl}>Tractor Carrier</label>
                  <input className={input} value={tractorCarrier} onChange={e => setTractorCarrier(e.target.value)} placeholder={appt.carrier} />
                </div>
                <div>
                  <label className={lbl}>USDOT</label>
                  <input className={input} value={usdot} onChange={e => setUsdot(e.target.value)} placeholder="如：3864527" />
                </div>
                <div>
                  <label className={lbl}>MC Number</label>
                  <input className={input} value={mc} onChange={e => setMc(e.target.value)} placeholder="可选" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditVehicle(false)} className="h-7 rounded-lg border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)]">取消</button>
                <button disabled={!vt||!plate||loading}
                  onClick={() => void run({ type: 'unis_submit_vehicle_info', appointmentId: appt.id, vehicleInfo: { vehicleType: vt, licensePlate: plate, tractorCarrier: tractorCarrier||undefined, usdot: usdot||undefined, mcNumber: mc||undefined } }).then(() => setEditVehicle(false))}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white disabled:opacity-40">
                  {loading && <Loader2 className="size-3 animate-spin" />}Save and Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ③ 司机信息 ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">司机信息</p>
              {appt.driverInfo ? (
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3 text-[12px]">
                  {([
                    ['Name', `${appt.driverInfo.firstName}${appt.driverInfo.middleName ? ' ' + appt.driverInfo.middleName : ''} ${appt.driverInfo.lastName}`],
                    ['Phone', appt.driverInfo.phoneNumber || '—'],
                    ['License', appt.driverInfo.licenseNumber],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k}><span className="text-[var(--muted)]">{k}: </span><span className="font-medium">{v}</span></div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-amber-600 mt-0.5">尚未填写</p>
              )}
            </div>
            {!isLocked && (
              <button onClick={() => setEditDriver(v => !v)}
                className={cn('inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[12px] transition-colors',
                  editDriver ? 'border-[var(--border)] hover:bg-[var(--surface-subtle)]' :
                  appt.driverInfo ? 'border-[var(--border)] hover:bg-[var(--surface-subtle)]' : 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] hover:opacity-80')}>
                <Edit2 className="size-3" />{editDriver ? '收起' : appt.driverInfo ? '修改' : '填写司机信息'}
              </button>
            )}
          </div>
          {editDriver && (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 px-4 pb-4 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Driver Phone Number</label>
                  <input className={input} value={dPhone} onChange={e => setDPhone(e.target.value)} placeholder="+1-310-555-0192" />
                </div>
                <div>
                  <label className={lbl}>Driver License Number *</label>
                  <input className={input} value={dLicense} onChange={e => setDLicense(e.target.value)} placeholder="如：CA-DL-123456" />
                </div>
                <div>
                  <label className={lbl}>First Name *</label>
                  <input className={input} value={dFirst} onChange={e => setDFirst(e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label className={lbl}>Middle Name</label>
                  <input className={input} value={dMid} onChange={e => setDMid(e.target.value)} placeholder="可选" />
                </div>
                <div>
                  <label className={lbl}>Last Name *</label>
                  <input className={input} value={dLast} onChange={e => setDLast(e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditDriver(false)} className="h-7 rounded-lg border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)]">取消</button>
                <button disabled={!dLicense||!dFirst||!dLast||loading}
                  onClick={() => void run({ type: 'unis_submit_driver_info', appointmentId: appt.id, driverInfo: { phoneNumber: dPhone||'', licenseNumber: dLicense, firstName: dFirst, lastName: dLast, middleName: dMid||undefined } }).then(() => setEditDriver(false))}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white disabled:opacity-40">
                  {loading && <Loader2 className="size-3 animate-spin" />}Save and Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 底部操作栏 ───────────────────────────────────────────── */}
        <div className="px-4 py-3 space-y-2">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {/* 发送司机链接（可选，任何时候都能发）*/}
            {!isLocked && (
              <button disabled={loading}
                onClick={() => void run({ type: 'unis_send_driver_link', appointmentId: appt.id })}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)] disabled:opacity-40">
                {loading && <Loader2 className="size-3 animate-spin" />}
                发送司机链接{appt.driverLinkSentAt ? '（已发送）' : ''}
              </button>
            )}

            {/* 查询 YMS 状态 */}
            {['pre_check_in_complete','checked_in'].includes(appt.status) && (
              <button disabled={loading} onClick={() => void run({ type: 'unis_sync_yms_status', appointmentId: appt.id })}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 text-[12px] font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-40">
                {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                查询 YMS 状态
              </button>
            )}

            {/* YMS 已同步（in_progress 简洁提示）*/}
            {appt.status === 'in_progress' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
                ☁ YMS 已同步 · In Progress
              </span>
            )}

            {/* 状态提示 */}
            {appt.status === 'pre_check_in_complete' && !loading && (
              <span className="text-[11px] text-[var(--muted)]">点击"查询 YMS 状态"同步司机入场状态</span>
            )}
          </div>

          {/* ET 单据（in_progress：Window Check-in 已同步）*/}
          {appt.status === 'in_progress' && (
            <div className="mt-2 rounded-xl border border-sky-200 bg-[var(--surface)] overflow-hidden">
              {/* ET 头部 */}
              <div className="flex flex-wrap items-center gap-3 border-b border-sky-200 bg-sky-50/60 px-4 py-2.5">
                <span className="font-mono text-[14px] font-bold text-sky-800">{appt.entryId}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  ● Window Checked In
                </span>
                <span className="text-[12px] font-medium text-sky-700">Dock: <span className="font-mono">{appt.dockAssigned}</span></span>
                {appt.receiptTaskId && (
                  <span className="ml-auto text-[11px] text-sky-600 font-mono">Task: {appt.receiptTaskId}</span>
                )}
              </div>

              {/* 四栏信息 */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-sky-100 sm:grid-cols-4 sm:divide-y-0 text-[12px]">
                {/* Driver */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 mb-2">Driver</p>
                  {[
                    ['Driver Name', `${appt.driverInfo?.firstName ?? '—'} ${appt.driverInfo?.middleName ? appt.driverInfo.middleName + ' ' : ''}${appt.driverInfo?.lastName ?? ''}`],
                    ['Driver Phone', appt.driverInfo?.phoneNumber ?? '—'],
                    ['Driver License', appt.driverInfo?.licenseNumber ?? '—'],
                    ['Tractor Carrier', appt.vehicleInfo?.tractorCarrier ?? appt.carrier],
                    ['MC Number', appt.vehicleInfo?.mcNumber ?? '—'],
                    ['USDOT', appt.vehicleInfo?.usdot ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-[var(--muted)]">{k}</span>
                      <span className="font-medium truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Equipment */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 mb-2">Equipment</p>
                  {[
                    ['Type', appt.vehicleInfo?.vehicleType ?? '—'],
                    ['Tractor', appt.vehicleInfo?.licensePlate ?? '—'],
                    ['Freight Carrier', appt.carrier],
                    ['Container', '—'],
                    ['Trailer', '—'],
                    ['Outbound Seal', '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-[var(--muted)]">{k}</span>
                      <span className="font-medium truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {/* In Outbound */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 mb-2">
                    In Outbound
                    <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700 uppercase">
                      {appt.deliveryType === 'live_delivery' ? 'Live Load' : 'Drop-off'}
                    </span>
                  </p>
                  {[
                    ['Inbound', inboundOrder.number],
                    ['Outbound', '—'],
                    ['Load Task', appt.receiptTaskId ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-[var(--muted)]">{k}</span>
                      <span className={cn('font-medium font-mono truncate', k !== 'Outbound' && v !== '—' ? 'text-sky-600' : '')}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Check In/Out */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 mb-2">Check In/Out</p>
                  {[
                    ['Gate Check-in', appt.checkedInAt ? appt.checkedInAt.slice(0, 16).replace('T', ' ') : '—'],
                    ['Gate Check-out', appt.completedAt ? appt.completedAt.slice(0, 16).replace('T', ' ') : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] text-[var(--muted)]">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Photo Strip */}
                <div className="col-span-2 sm:col-span-4 border-t border-sky-100 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 mb-2">Gate Photos</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                      { label: 'Driver',      src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=90&fit=crop&q=60' },
                      { label: 'Driver',      src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=90&fit=crop&q=60' },
                      { label: 'Vehicle',     src: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=120&h=90&fit=crop&q=60' },
                      { label: 'Vehicle',     src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=90&fit=crop&q=60' },
                      { label: 'Equipment',   src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&h=90&fit=crop&q=60' },
                      { label: 'Camera Out',  src: null },
                      { label: 'Camera Out',  src: null },
                      { label: 'Camera Out',  src: null },
                    ].map((photo, idx) => (
                      <div key={idx} className="shrink-0 flex flex-col items-center gap-1">
                        {photo.src ? (
                          <img src={photo.src} alt={photo.label}
                            className="w-[88px] h-[66px] rounded-lg object-cover border border-sky-200" />
                        ) : (
                          <div className="w-[88px] h-[66px] rounded-lg border border-dashed border-sky-200 bg-sky-50/60 flex flex-col items-center justify-center gap-0.5 text-[var(--muted)]">
                            <Camera className="size-4 opacity-40" />
                            <span className="text-[9px] opacity-40">No Image</span>
                          </div>
                        )}
                        <span className="text-[10px] text-[var(--muted)] font-medium">{photo.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 操作记录 */}
      {(() => {
        const events = snapshot.events
          .filter(ev => ev.entityId === appt.id && ev.type in UNIS_EVENT_LABELS)
          .slice()
          .sort((a, b) => b.at.localeCompare(a.at));
        if (!events.length) return null;
        return (
          <details className="border-t border-[var(--border-subtle)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[12px] hover:bg-[var(--surface-subtle)]">
              <span className="font-semibold">操作记录</span>
              <span className="text-[var(--muted)]">· {events.length} 条</span>
              <span className="ml-auto text-[11px] text-[var(--muted)]">展开 ▾</span>
            </summary>
            <ol className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 px-4 py-3 text-[12px]">
              {events.map((ev, idx) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    {idx < events.length - 1 && <div className="w-px flex-1 bg-[var(--border-subtle)]" />}
                  </div>
                  <div className="pb-3">
                    <p className="font-medium leading-tight">{UNIS_EVENT_LABELS[ev.type] ?? ev.type}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">{ev.at.slice(0, 16).replace('T', ' ')}</p>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        );
      })()}
    </div>
  );
}

// ─── 主工作台 ─────────────────────────────────────────────────────────────────

export function UnisAppointmentSection({ inboundPlan, snapshot }: {
  inboundPlan: InboundPlan; snapshot: OmsSnapshot;
}) {
  const inboundOrders = (snapshot.inboundOrders ?? []).filter(o => inboundPlan.inboundOrderIds.includes(o.id));
  const unisAppointments = snapshot.unisAppointments ?? [];
  const [creatingForOrderId, setCreatingForOrderId] = useState<string|null>(null);

  if (!inboundOrders.length) return null;
  if (inboundPlan.destinationType !== 'oms_warehouse') return null;

  const destWh = (snapshot.warehouseRecords ?? []).find(w => w.id === inboundPlan.destinationWarehouseId);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-[13px] font-semibold">Unis YMS 预约</h2>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">
          {destWh ? `${destWh.code} · ${destWh.name}` : '自营仓'} · 司机入场前需完成预约，Checked In 及以后由 YMS 自动推进
        </p>
      </div>
      <div className="p-5 space-y-4">
        {inboundOrders.map(order => {
          const appt = unisAppointments.find(a => a.inboundOrderId === order.id && a.status !== 'cancelled');
          if (creatingForOrderId === order.id && !appt) {
            return <AppointmentCreateForm key={order.id} inboundOrder={order} inboundPlan={inboundPlan} snapshot={snapshot} onClose={() => setCreatingForOrderId(null)} />;
          }
          if (appt) {
            return <AppointmentCard key={order.id} appt={appt} inboundOrder={order} snapshot={snapshot} />;
          }
          return (
            <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-3">
              <div className="text-[12px]">
                <span className="font-mono font-medium">{order.number}</span>
                <span className="ml-2 text-[var(--muted)]">· 预计 {order.expectedQuantity} 件</span>
                <span className="ml-2 text-amber-600">· 尚未创建预约</span>
              </div>
              <button onClick={() => setCreatingForOrderId(order.id)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
                创建预约
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
