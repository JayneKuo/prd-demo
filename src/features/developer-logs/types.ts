export type EventDirection = 'Inbound' | 'Internal' | 'Outbound';
export type ExecutionStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
export type ExecutionResult = 'Success' | 'Failed' | 'Partial Success' | 'Skipped' | '—';
export type RecoveryAction = 'View Details' | 'Re-consume' | 'Re-push' | 'View Attempts';

export type EventLogPayload = {
  raw: string;
  formatted: string;
  format: 'json' | 'text';
};

export type EventLogAttempt = {
  attempt: number;
  triggerType: string;
  triggeredBy: string;
  result: ExecutionResult;
  httpStatus?: string;
  time: string;
  duration: string;
  requestData: EventLogPayload;
  responseData: EventLogPayload;
  errorMessage?: string;
};

export type EventLogRow = {
  id: string;
  businessDomain: string;
  businessObject: string;
  eventType: string;
  operation: string;
  direction: EventDirection;
  executionStatus: ExecutionStatus;
  executionResult: ExecutionResult;
  sourceSystem: string;
  targetSystem: string;
  eventTime: string;
  primaryBusinessNo: string;
  relatedBusinessNo: string;
  traceId: string;
  triggerType: string;
  currentAttempt: number;
  errorCode?: string;
  errorMessage?: string;
  suggestedAction: string;
  availableActions: RecoveryAction[];
  startedTime: string;
  completedTime?: string;
  duration?: string;
  channelSalesOrderNo?: string;
  omsSalesOrderNo?: string;
  purchaseOrderNo?: string;
  poNo?: string;
  transferOrderNo?: string;
  referenceNo?: string;
  relatedBusinessNumbers: Record<string, string>;
  inboundRawData: EventLogPayload;
  normalizedOmsData: EventLogPayload;
  outboundRawData: EventLogPayload;
  responseData: EventLogPayload;
  failedStep?: string;
  errorType?: string;
  attempts: EventLogAttempt[];
};
