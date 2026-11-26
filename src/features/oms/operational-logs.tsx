'use client';

import { useOms } from './provider';
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import type { EventLogRow, EventLogPayload } from '@/features/developer-logs/types';
const payload = (value: unknown): EventLogPayload => { const text = JSON.stringify(value ?? {}, null, 2); return { raw: text, formatted: text, format: 'json' }; };
export function OperationalLogs() {
  const { snapshots, ready, error } = useOms();
  const rows: EventLogRow[] = snapshots.flatMap(state => state.events.map((event): EventLogRow => {
    const source = state.orders.find(order => order.id === event.entityId);
    const request = payload(event.payload);
    return { id: event.id, businessDomain: 'OMS', businessObject: event.entityId, eventType: event.type, operation: event.description, direction: 'Internal', executionStatus: 'Completed', executionResult: 'Success', sourceSystem: 'OMS', targetSystem: 'OMS', eventTime: event.at, primaryBusinessNo: source?.number ?? event.entityId, relatedBusinessNo: '', traceId: event.commandId, triggerType: '业务命令 / 回执', currentAttempt: 1, suggestedAction: '查看业务对象和事件资料', availableActions: ['View Details'], startedTime: event.at, completedTime: event.at, relatedBusinessNumbers: { tenant: state.tenantId, company: state.companyId, merchant: state.merchantId }, inboundRawData: request, normalizedOmsData: payload({ entityId: event.entityId, scope: state.merchantId }), outboundRawData: payload({}), responseData: payload({ persisted: true, revision: state.revision }), attempts: [{ attempt: 1, triggerType: '业务命令 / 回执', triggeredBy: 'OMS', result: 'Success', time: event.at, duration: '—', requestData: request, responseData: payload({ persisted: true }) }] };
  })).reverse();
  return <>{error && <p role="alert" className="p-4 text-sm text-[var(--danger)]">{error}</p>}{!ready && <p className="p-4 text-sm">正在读取业务事件…</p>}<LogsPageClient title="销售订单 / 出库日志" description="展示已持久化的订单、履约、库存与业务处理事件，关联原单据与命令。" rows={rows} /></>;
}
