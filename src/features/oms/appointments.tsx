'use client';

import Link from 'next/link';
import { useOms } from './provider';
import { buttonClass } from '@/components/amazon/amazon-ui';
export function OmsAppointments({ detailId }: { detailId?: string }) {
  const { snapshots, ready, error } = useOms();
  let selectedId = detailId; try { if (selectedId) selectedId = decodeURIComponent(selectedId); } catch { /* Unavailable task */ }
  const rows = snapshots.flatMap(snapshot => (snapshot.inboundShipments ?? []).filter(shipment => snapshot.inboundPlans?.find(plan => plan.id === shipment.planId)?.transport !== 'SPD').map(shipment => ({ snapshot, shipment })));
  const filtered = selectedId ? rows.filter(row => row.shipment.id === selectedId) : rows;
  return <div className="mx-auto max-w-[1440px] space-y-5 pt-5 lg:pt-6"><header><h1 className="text-2xl font-semibold">预约任务</h1><p className="mt-1 text-sm text-[var(--muted)]">按关联货件维护送仓窗口与承运商预约。Collect 提货不创建商家到仓预约。</p></header>{error && <p role="alert">{error}</p>}{!ready && <p>正在读取预约…</p>}<div className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]"><table className="w-full text-left text-sm"><thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]"><tr>{['来源货件', '目的地', '送仓窗口', '预约', '状态', '操作'].map(title => <th key={title} className="p-3 font-medium">{title}</th>)}</tr></thead><tbody>{filtered.map(({shipment}) => <tr className="border-t border-[var(--border-subtle)]" key={shipment.id}><td className="p-3">{shipment.id.split(':').slice(-2).join('-')}</td><td className="p-3">{shipment.destination}</td><td className="p-3">{shipment.deliveryWindow ? `${shipment.deliveryWindow.start} — ${shipment.deliveryWindow.end}` : '待确认'}</td><td className="p-3">{shipment.appointment ? `${shipment.appointment.id} / ${shipment.appointment.time}` : '待承运商预约'}</td><td className="p-3">{shipment.appointment ? '已预约' : '待处理'}</td><td className="p-3"><Link className={buttonClass} href={`/dashboard/fba/shipments/${encodeURIComponent(shipment.id)}`}>处理来源货件</Link></td></tr>)}</tbody></table>{ready && !filtered.length && <p className="p-8 text-center text-sm text-[var(--muted)]">当前范围没有卡派预约任务。</p>}</div></div>;
}
