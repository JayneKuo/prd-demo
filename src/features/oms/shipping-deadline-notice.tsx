'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, CheckCircle2 } from 'lucide-react';
import { useOms } from './provider';
import { shippingDeadline } from './shipping-deadline';

function durationLabel(milliseconds: number) {
  const minutes = Math.ceil(Math.abs(milliseconds) / 60000);
  if (minutes < 1) return '不足 1 分钟';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return [days ? `${days}天` : '', hours ? `${hours}小时` : '', !days && minutes % 60 ? `${minutes % 60}分` : ''].filter(Boolean).join('') || '不足 1 分钟';
}

export function ShippingDeadlineNotice({ orderId, compact = false }: { orderId: string; compact?: boolean }) {
  const { snapshots } = useOms();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const snapshot = snapshots.find(state => state.orders.some(order => order.id === orderId));
  const order = snapshot?.orders.find(item => item.id === orderId);
  if (!snapshot || !order || order.source !== 'Amazon' || order.channelType !== 'MFN' || now === null) return null;
  const result = shippingDeadline(snapshot, order, now);
  const late = ['overdue', 'shipped_late'].includes(result.status);
  const soon = result.status === 'due_soon';
  const done = result.status === 'shipped_on_time';
  const tone = late ? 'text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))]' : soon ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10' : done ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10' : 'text-[var(--muted)] bg-[var(--surface-hover)]';
  const Icon = late ? AlertTriangle : done ? CheckCircle2 : Clock3;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const absolute = result.deadline ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(result.deadline)) : '';
  const relative = result.remainingMs !== undefined ? `${result.remainingMs > 0 ? '剩余' : '超时'} ${durationLabel(result.remainingMs)}` : '';
  const tooltip = [result.label, absolute && `最晚发货：${absolute} · ${zone}`, result.detail, order.shipDeadlineSource === 'demo' && '演示时效，非 Amazon 实际承诺'].filter(Boolean).join('\n');
  if (compact) return <div className="mt-1.5 flex max-w-[260px] flex-wrap items-center gap-1.5 text-[11px]" title={tooltip}>
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${tone}`}><Icon aria-hidden="true" className="size-3 shrink-0" />{result.label}</span>
    {relative && <span className={late ? 'font-medium text-[var(--danger)]' : 'text-[var(--muted)]'}>{relative}</span>}
    {absolute && <span className="basis-full text-[var(--muted)]">截止 {absolute.slice(5)}{order.shipDeadlineSource === 'demo' ? ' · 演示' : ''}</span>}
  </div>;
  return <section aria-label="Amazon 发货时效" className={`flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs ${late ? 'text-[var(--danger)]' : soon ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--muted)]'}`} title={tooltip}>
    <span className="inline-flex items-center gap-1.5 font-semibold"><Icon aria-hidden="true" className="size-3.5 shrink-0" />{result.label}</span>
    {relative && <span className="font-semibold tabular-nums">{relative}</span>}
    {absolute ? <span className="border-l border-current/20 pl-3 opacity-90">最晚发货 <time dateTime={result.deadline} className="tabular-nums">{absolute}</time><span className="ml-1.5 opacity-70">{zone === 'Asia/Shanghai' ? 'UTC+8' : zone}</span></span> : <span className="opacity-80">请同步渠道截止时间</span>}
    {order.shipDeadlineSource === 'demo' && <span className="text-[10px] opacity-60">（演示时效）</span>}
  </section>;
}
