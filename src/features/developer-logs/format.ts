import type { EventLogPayload, EventLogRow } from '@/features/developer-logs/types';

export function formatPayload(raw: string): EventLogPayload {
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      raw,
      formatted: '',
      format: 'text'
    };
  }

  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (!looksLikeJson) {
    return {
      raw,
      formatted: raw,
      format: 'text'
    };
  }

  try {
    return {
      raw,
      formatted: JSON.stringify(JSON.parse(trimmed), null, 2),
      format: 'json'
    };
  } catch {
    return {
      raw,
      formatted: raw,
      format: 'text'
    };
  }
}

export function buildStageCopyText(row: EventLogRow) {
  return [
    `Event Type: ${row.eventType}`,
    `Execution Status: ${row.executionStatus}`,
    `Execution Result: ${row.executionResult}`,
    '',
    `Inbound Raw Data:\n${row.inboundRawData.raw}`,
    '',
    `Normalized OMS Data:\n${row.normalizedOmsData.raw}`,
    '',
    `Outbound Raw Data:\n${row.outboundRawData.raw}`,
    '',
    `Response Data:\n${row.responseData.raw}`
  ].join('\n');
}
