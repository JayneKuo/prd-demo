import { formatPayload } from '@/features/developer-logs/format';
import type { EventLogAttempt, EventLogRow } from '@/features/developer-logs/types';

function createAttempt(overrides: Partial<EventLogAttempt>): EventLogAttempt {
  return {
    attempt: 1,
    triggerType: 'System',
    triggeredBy: 'OMS',
    result: 'Failed',
    httpStatus: '500',
    time: '2026-07-24 10:05:21',
    duration: '1.2s',
    requestData: formatPayload('{"sample":true}'),
    responseData: formatPayload('{"error":"temporary failure"}'),
    errorMessage: 'temporary failure',
    ...overrides
  };
}

function createRow(overrides: Partial<EventLogRow>): EventLogRow {
  return {
    id: 'evt_default',
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
    traceId: 'trace_default',
    triggerType: 'System',
    currentAttempt: 1,
    errorCode: 'SYNC_401',
    errorMessage: 'signature mismatch',
    suggestedAction: 'Verify the target system or connection, then re-push the affected message.',
    availableActions: ['View Details', 'Re-push'],
    startedTime: '2026-07-24 10:00:01',
    completedTime: '2026-07-24 10:00:02',
    duration: '128 ms',
    channelSalesOrderNo: 'AMZ-77881',
    omsSalesOrderNo: 'SO-10024',
    purchaseOrderNo: '',
    poNo: '',
    transferOrderNo: '',
    referenceNo: 'REF-SHP-10024',
    relatedBusinessNumbers: {
      'OMS Order No.': 'SO-10024',
      'Shipment No.': 'SHP-10024'
    },
    inboundRawData: formatPayload('{"shipmentNo":"SHP-10024"}'),
    normalizedOmsData: formatPayload('{"shipmentNo":"SHP-10024","status":"packed"}'),
    outboundRawData: formatPayload('{"externalShipmentNo":"SHP-10024"}'),
    responseData: formatPayload('{"message":"signature mismatch"}'),
    failedStep: 'Shipment Synchronization',
    errorType: 'AuthError',
    attempts: [],
    ...overrides
  };
}

export const salesOrderLogRows: EventLogRow[] = [
  createRow({
    id: 'sales_evt_001',
    traceId: 'trace_so_001',
    currentAttempt: 3,
    availableActions: ['View Details', 'Re-push', 'View Attempts'],
    attempts: [
      createAttempt({ attempt: 1, triggerType: 'System', triggeredBy: 'OMS', result: 'Failed', httpStatus: '500', time: '2026-07-24 10:05:21', duration: '1.2s' }),
      createAttempt({ attempt: 2, triggerType: 'Scheduled Retry', triggeredBy: 'OMS', result: 'Failed', httpStatus: '503', time: '2026-07-24 10:10:00', duration: '3.0s' }),
      createAttempt({ attempt: 3, triggerType: 'Manual Re-push', triggeredBy: 'Amy', result: 'Success', httpStatus: '200', time: '2026-07-24 10:20:42', duration: '0.8s', responseData: formatPayload('{"accepted":true}'), errorMessage: '' })
    ]
  })
];

export const purchaseInboundLogRows: EventLogRow[] = [
  createRow({
    id: 'po_evt_001',
    businessDomain: 'PO / Inbound',
    businessObject: 'Receipt Confirmation',
    eventType: 'Receipt Confirmation Processing',
    operation: 'Process',
    direction: 'Internal',
    sourceSystem: 'WMS',
    targetSystem: 'OMS',
    primaryBusinessNo: 'IB-22019',
    relatedBusinessNo: 'PO-33081 / DC-9021',
    traceId: 'trace_po_001',
    errorCode: 'CFG_404',
    errorMessage: 'putaway location mapping missing',
    suggestedAction: 'Complete or correct the required configuration, then re-consume the affected message.',
    availableActions: ['View Details', 'Re-consume'],
    channelSalesOrderNo: '',
    omsSalesOrderNo: '',
    purchaseOrderNo: 'PUR-33081',
    poNo: 'PO-33081',
    transferOrderNo: '',
    referenceNo: 'REF-IB-22019',
    relatedBusinessNumbers: {
      'PO No.': 'PO-33081',
      'Inbound Order No.': 'IB-22019',
      'DC No.': 'DC-9021'
    },
    inboundRawData: formatPayload('{"dcNo":"DC-9021"}'),
    normalizedOmsData: formatPayload('{"inboundNo":"IB-22019","warehouse":"US-LAX"}'),
    outboundRawData: formatPayload(''),
    responseData: formatPayload('{"error":"putaway location mapping missing"}'),
    failedStep: 'Receipt Confirmation Processing',
    errorType: 'ConfigurationError',
    attempts: [createAttempt({ requestData: formatPayload('{"dcNo":"DC-9021"}'), responseData: formatPayload('{"error":"putaway location mapping missing"}') })]
  })
];

export const transferLogRows: EventLogRow[] = [
  createRow({
    id: 'trf_evt_001',
    businessDomain: 'Transfer',
    businessObject: 'Transfer Order',
    eventType: 'Transfer Completion',
    operation: 'Complete',
    direction: 'Internal',
    executionStatus: 'Processing',
    executionResult: '—',
    sourceSystem: 'OMS',
    targetSystem: 'OMS',
    primaryBusinessNo: 'TRF-12001',
    relatedBusinessNo: 'TRF-12001 / TRO-12001 / TRI-12001',
    traceId: 'trace_trf_001',
    triggerType: 'System',
    currentAttempt: 1,
    errorCode: undefined,
    errorMessage: undefined,
    suggestedAction: 'Transfer completion is still processing.',
    availableActions: ['View Details'],
    channelSalesOrderNo: '',
    omsSalesOrderNo: '',
    purchaseOrderNo: '',
    poNo: '',
    transferOrderNo: 'TRF-12001',
    referenceNo: 'REF-TRF-12001',
    relatedBusinessNumbers: {
      'Transfer Order No.': 'TRF-12001',
      'Transfer Out No.': 'TRO-12001',
      'Transfer In No.': 'TRI-12001'
    },
    inboundRawData: formatPayload('{"transferOrderNo":"TRF-12001"}'),
    normalizedOmsData: formatPayload('{"transferOrderNo":"TRF-12001","status":"in_progress"}'),
    outboundRawData: formatPayload('{"transferOutNo":"TRO-12001","transferInNo":"TRI-12001"}'),
    responseData: formatPayload(''),
    failedStep: undefined,
    errorType: undefined,
    attempts: []
  }),
  createRow({
    id: 'trf_evt_002',
    businessDomain: 'Transfer',
    businessObject: 'Transfer Order',
    eventType: 'Transfer Order Update',
    operation: 'Update',
    direction: 'Internal',
    executionStatus: 'Completed',
    executionResult: 'Success',
    sourceSystem: 'OMS',
    targetSystem: 'OMS',
    primaryBusinessNo: 'TRF-11998',
    relatedBusinessNo: 'TRF-11998',
    traceId: 'trace_trf_002',
    currentAttempt: 1,
    errorMessage: '',
    suggestedAction: 'No action required.',
    availableActions: ['View Details'],
    channelSalesOrderNo: '',
    omsSalesOrderNo: '',
    purchaseOrderNo: '',
    poNo: '',
    transferOrderNo: 'TRF-11998',
    referenceNo: 'REF-TRF-11998',
    relatedBusinessNumbers: {
      'Transfer Order No.': 'TRF-11998'
    },
    inboundRawData: formatPayload('{"transferOrderNo":"TRF-11998"}'),
    normalizedOmsData: formatPayload('{"transferOrderNo":"TRF-11998","status":"updated"}'),
    outboundRawData: formatPayload(''),
    responseData: formatPayload('{"result":"ok"}'),
    attempts: []
  })
];

export const inventoryLogRows: EventLogRow[] = [
  createRow({
    id: 'inv_evt_001',
    businessDomain: 'Inventory',
    businessObject: 'Inventory',
    eventType: 'Inventory Synchronization',
    operation: 'Sync',
    direction: 'Outbound',
    sourceSystem: 'OMS',
    targetSystem: 'Marketplace',
    primaryBusinessNo: 'SKU-2048',
    relatedBusinessNo: 'SKU-2048 / WH-US-01',
    traceId: 'trace_inv_001',
    currentAttempt: 3,
    errorCode: 'API_503',
    errorMessage: 'marketplace inventory API timeout',
    suggestedAction: 'Verify the target system or connection, then re-push the affected message.',
    availableActions: ['View Details', 'Re-push', 'View Attempts'],
    channelSalesOrderNo: '',
    omsSalesOrderNo: '',
    purchaseOrderNo: '',
    poNo: '',
    transferOrderNo: '',
    referenceNo: 'REF-INV-2048',
    relatedBusinessNumbers: {
      SKU: 'SKU-2048'
    },
    inboundRawData: formatPayload('{"sku":"SKU-2048","qty":180}'),
    normalizedOmsData: formatPayload('{"sku":"SKU-2048","availableQty":180}'),
    outboundRawData: formatPayload('{"sku":"SKU-2048","quantity":180}'),
    responseData: formatPayload('{"message":"timeout"}'),
    failedStep: 'Inventory Synchronization',
    errorType: 'TimeoutError',
    attempts: [
      createAttempt({ attempt: 1, triggerType: 'System', triggeredBy: 'OMS', result: 'Failed', httpStatus: '500', time: '2026-07-24 11:05:21', duration: '1.2s', responseData: formatPayload('{"message":"timeout"}') }),
      createAttempt({ attempt: 2, triggerType: 'Scheduled Retry', triggeredBy: 'OMS', result: 'Failed', httpStatus: '503', time: '2026-07-24 11:10:00', duration: '3.0s', responseData: formatPayload('{"message":"service unavailable"}') }),
      createAttempt({ attempt: 3, triggerType: 'Manual Re-push', triggeredBy: 'Amy', result: 'Success', httpStatus: '200', time: '2026-07-24 11:20:42', duration: '0.8s', responseData: formatPayload('{"accepted":true}'), errorMessage: '' })
    ]
  })
];
