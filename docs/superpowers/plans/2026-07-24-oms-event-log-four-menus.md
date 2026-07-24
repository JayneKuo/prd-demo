# OMS Event Log Four Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four OMS event-log menus and build four business-domain event log pages with shared list, drawer, and recovery-action UI.

**Architecture:** Keep one shared feature package for OMS event-log modeling, filtering, detail rendering, and action rules, then expose four page entries and four menu links with domain-specific mock data. Preserve the current mock-driven approach, but replace the old developer trace page contract with business-oriented event log structures.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest

---

## File Structure

- Modify: `src/lib/merchant-navigation.ts`
  - Replace the single developer log menu with four dedicated OMS event-log entries.
- Modify: `src/app/dashboard/developers/logs/page.tsx`
  - Convert the old generic log page into the sales-order/outbound log page entry.
- Create: `src/app/dashboard/developers/logs/purchase-inbound/page.tsx`
  - Entry page for PO / inbound log.
- Create: `src/app/dashboard/developers/logs/transfers/page.tsx`
  - Entry page for transfer log.
- Create: `src/app/dashboard/developers/logs/inventory/page.tsx`
  - Entry page for inventory log.
- Modify: `src/features/developer-logs/types.ts`
  - Replace the old trace-only model with OMS event-log domain types.
- Modify: `src/features/developer-logs/format.ts`
  - Keep payload formatting and stage copy support, but align helper naming to event-log data sections.
- Modify: `src/features/developer-logs/mock-data.ts`
  - Replace old generic traces with four domain datasets and richer fields for business numbers, attempts, data sections, and suggested actions.
- Modify: `src/features/developer-logs/log-trace-drawer.tsx`
  - Convert the drawer from four-step trace cards into OMS event-log detail sections.
- Modify: `src/features/developer-logs/logs-page-client.tsx`
  - Support domain title/description, shared event-log list rendering, keyword filtering, and domain-specific action labels.
- Modify: `src/features/developer-logs/format.test.ts`
  - Keep formatter tests valid with updated naming.
- Modify: `src/features/developer-logs/logs-page-client.test.tsx`
  - Rework tests around the new OMS event-log contract.

## Task 1: Redefine the shared OMS event-log types with tests preserved

**Files:**
- Modify: `src/features/developer-logs/types.ts`
- Modify: `src/features/developer-logs/format.test.ts`
- Test: `src/features/developer-logs/format.test.ts`

- [ ] **Step 1: Update the failing formatter test to use the new event-log section names where needed**

```ts
expect(buildStageCopyText(stage)).toContain('Inbound Raw Data');
expect(buildStageCopyText(stage)).toContain('Normalized OMS Data');
```

- [ ] **Step 2: Run the formatter test to verify it fails**

Run: `pnpm test src/features/developer-logs/format.test.ts`
Expected: FAIL because the existing copy text still uses the old generic labels.

- [ ] **Step 3: Replace the trace-only types with OMS event-log types**

```ts
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
  relatedBusinessNumbers: Record<string, string>;
  inboundRawData: EventLogPayload;
  normalizedOmsData: EventLogPayload;
  outboundRawData: EventLogPayload;
  responseData: EventLogPayload;
  failedStep?: string;
  errorType?: string;
  attempts: EventLogAttempt[];
};
```

- [ ] **Step 4: Update the formatter helper text to the new section labels**

```ts
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
```

- [ ] **Step 5: Run the formatter test to verify it passes**

Run: `pnpm test src/features/developer-logs/format.test.ts`
Expected: PASS

## Task 2: Rebuild mock data around four business domains

**Files:**
- Modify: `src/features/developer-logs/mock-data.ts`
- Modify: `src/features/developer-logs/logs-page-client.test.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Rewrite the failing page tests to expect OMS event-log fields**

```tsx
expect(html).toContain('Execution Result');
expect(html).toContain('Shipment Synchronization');
expect(html).toContain('Re-push');
expect(html).toContain('Re-consume');
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the current page still renders the old trace fields.

- [ ] **Step 3: Replace old traces with domain-specific mock datasets**

```ts
export const salesOrderLogRows: EventLogRow[] = [/* Shipment Synchronization failed, Re-push */];
export const purchaseInboundLogRows: EventLogRow[] = [/* Receipt Confirmation Processing failed, Re-consume */];
export const transferLogRows: EventLogRow[] = [/* Transfer Completion processing */];
export const inventoryLogRows: EventLogRow[] = [/* Inventory Synchronization failed, Re-push */];
```

Each row must include:
- event type
- execution status and result
- suggested action
- available actions
- related business numbers
- attempts
- all four data sections

- [ ] **Step 4: Run the page test to verify it passes against new mock data**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

## Task 3: Convert the drawer into OMS event-log detail sections

**Files:**
- Modify: `src/features/developer-logs/log-trace-drawer.tsx`
- Modify: `src/features/developer-logs/logs-page-client.test.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Extend the page test to require detail sections**

```tsx
expect(html).toContain('Overview');
expect(html).toContain('Related Business Numbers');
expect(html).toContain('Inbound Raw Data');
expect(html).toContain('Normalized OMS Data');
expect(html).toContain('Outbound Raw Data');
expect(html).toContain('Response Data');
expect(html).toContain('Error Details');
expect(html).toContain('Attempts');
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the drawer still renders the old four-step trace structure.

- [ ] **Step 3: Replace the drawer layout with OMS event-log sections**

The drawer should render:
- Overview summary
- Related Business Numbers list
- Data section blocks for inbound, normalized, outbound, response, error
- Attempts table or attempts cards
- Recovery buttons based on `availableActions`

- [ ] **Step 4: Run the page test to verify it passes**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

## Task 4: Rebuild the shared list page contract around event logs

**Files:**
- Modify: `src/features/developer-logs/logs-page-client.tsx`
- Modify: `src/features/developer-logs/logs-page-client.test.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Extend the test to require list fields and keyword filtering**

```tsx
expect(html).toContain('Primary Business No.');
expect(html).toContain('Execution Result');
expect(html).toContain('Suggested Action');
expect(html).toContain('Shipment No.');
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the list header and row schema still follow the old trace-table contract.

- [ ] **Step 3: Rebuild the shared list page UI**

The client should accept:

```ts
{
  title: string;
  description: string;
  rows: EventLogRow[];
}
```

It should render:
- Event Time
- Business Domain
- Event Type
- Direction
- Source System
- Target System
- Channel Sales Order No.
- OMS SO No.
- Purchase Order No.
- PO No.
- Transfer Order No.
- Reference No.
- Related Business No.
- Execution Result
- Current Attempt
- Error Message
- Suggested Action
- Action

- [ ] **Step 4: Run the page test to verify it passes**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

## Task 5: Add four route entries and four developer menus

**Files:**
- Modify: `src/lib/merchant-navigation.ts`
- Modify: `src/app/dashboard/developers/logs/page.tsx`
- Create: `src/app/dashboard/developers/logs/purchase-inbound/page.tsx`
- Create: `src/app/dashboard/developers/logs/transfers/page.tsx`
- Create: `src/app/dashboard/developers/logs/inventory/page.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Add a failing test expectation for domain titles**

```tsx
expect(renderToStaticMarkup(createElement(LogsPageClient, {
  title: '销售订单 / 出库日志',
  description: '...'
}))).toContain('销售订单 / 出库日志');
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the component still hardcodes the old generic title.

- [ ] **Step 3: Make the page client accept title/description props and wire four route files**

Create page entries like:

```tsx
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';
import { salesOrderLogRows } from '@/features/developer-logs/mock-data';

export default function SalesOrderLogsPage() {
  return <LogsPageClient title="销售订单 / 出库日志" description="查看订单、履约、Shipment 与同步事件日志。" rows={salesOrderLogRows} />;
}
```

Also add four menu entries in `merchantNavigationGroups` under `开发者`.

- [ ] **Step 4: Run the page test to verify it passes**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

## Task 6: Final verification and browser validation

**Files:**
- Modify as needed based on verification
- Test: `src/features/developer-logs/format.test.ts`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Run focused tests**

Run: `pnpm test src/features/developer-logs/format.test.ts src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the full project test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: existing repository warnings may remain, but no new errors from the OMS event-log files.

- [ ] **Step 4: Start the app and verify all four pages in the browser**

Run: `pnpm dev`
Expected: dev server starts successfully.

Then verify:
- all four menu items appear under `开发者`
- each menu routes to the correct page
- each page shows domain-specific title and data
- failed inbound/internal rows show `Re-consume`
- failed outbound rows show `Re-push`
- attempt history is visible
- detail drawer shows Overview, Related Business Numbers, Data, Error Details, and Attempts

## Self-Review

- Spec coverage: this plan covers four menus, four routes, shared event-log data model, list fields, detail sections, suggested actions, attempt history, and recovery action UI.
- Placeholder scan: no deferred TODO steps remain.
- Type consistency: the plan consistently uses `EventLogRow`, `EventLogAttempt`, `ExecutionStatus`, `ExecutionResult`, and `RecoveryAction`.
