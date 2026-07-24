import { describe, expect, it } from 'vitest';
import { buildStageCopyText, formatPayload } from '@/features/developer-logs/format';
import type { EventLogRow } from '@/features/developer-logs/types';

describe('formatPayload', () => {
  it('formats json payloads with two-space indentation', () => {
    expect(formatPayload('{"ok":true,"count":2}')).toEqual({
      raw: '{"ok":true,"count":2}',
      formatted: '{\n  "ok": true,\n  "count": 2\n}',
      format: 'json'
    });
  });

  it('falls back to text when payload is not valid json', () => {
    expect(formatPayload('x-request-id: req_123\ncontent-type: application/json')).toEqual({
      raw: 'x-request-id: req_123\ncontent-type: application/json',
      formatted: 'x-request-id: req_123\ncontent-type: application/json',
      format: 'text'
    });
  });

  it('returns an empty text payload for blank input', () => {
    expect(formatPayload('')).toEqual({
      raw: '',
      formatted: '',
      format: 'text'
    });
  });
});

describe('buildStageCopyText', () => {
  it('builds one copy block with event-log data sections', () => {
    const row: EventLogRow = {
      id: 'evt_001',
      businessDomain: 'Sales Order',
      businessObject: 'Shipment',
      eventType: 'Shipment Synchronization',
      operation: 'Create',
      direction: 'Outbound',
      executionStatus: 'Completed',
      executionResult: 'Failed',
      sourceSystem: 'OMS',
      targetSystem: 'Shopify',
      eventTime: '2026-07-24 10:00:02',
      primaryBusinessNo: 'SHP-10024',
      relatedBusinessNo: 'SO-10024 / DN-4421',
      traceId: 'trace_001',
      triggerType: 'System',
      currentAttempt: 2,
      errorCode: 'SYNC_401',
      errorMessage: 'signature mismatch',
      suggestedAction: 'Verify the target system or connection, then re-push the affected message.',
      availableActions: ['View Details', 'Re-push', 'View Attempts'],
      startedTime: '2026-07-24 10:00:01',
      completedTime: '2026-07-24 10:00:02',
      duration: '128 ms',
      relatedBusinessNumbers: {
        'OMS Order No.': 'SO-10024',
        'Shipment No.': 'SHP-10024'
      },
      inboundRawData: {
        raw: '{"shipmentNo":"SHP-10024"}',
        formatted: '{\n  "shipmentNo": "SHP-10024"\n}',
        format: 'json'
      },
      normalizedOmsData: {
        raw: '{"shipmentNo":"SHP-10024","status":"packed"}',
        formatted: '{\n  "shipmentNo": "SHP-10024",\n  "status": "packed"\n}',
        format: 'json'
      },
      outboundRawData: {
        raw: '{"externalShipmentNo":"SHP-10024"}',
        formatted: '{\n  "externalShipmentNo": "SHP-10024"\n}',
        format: 'json'
      },
      responseData: {
        raw: '{"message":"signature mismatch"}',
        formatted: '{\n  "message": "signature mismatch"\n}',
        format: 'json'
      },
      failedStep: 'Shipment Synchronization',
      errorType: 'AuthError',
      attempts: []
    };

    const copyText = buildStageCopyText(row);

    expect(copyText).toContain('Event Type: Shipment Synchronization');
    expect(copyText).toContain('Execution Status: Completed');
    expect(copyText).toContain('Execution Result: Failed');
    expect(copyText).toContain('Inbound Raw Data:\n{"shipmentNo":"SHP-10024"}');
    expect(copyText).toContain('Normalized OMS Data:\n{"shipmentNo":"SHP-10024","status":"packed"}');
    expect(copyText).toContain('Outbound Raw Data:\n{"externalShipmentNo":"SHP-10024"}');
    expect(copyText).toContain('Response Data:\n{"message":"signature mismatch"}');
  });
});
