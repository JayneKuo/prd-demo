# Developer Logs Trace Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trace-oriented developer logs page with a row-driven drawer that shows the four message stages, formatted payloads, and copy actions.

**Architecture:** Keep the existing dashboard page entry at `src/app/dashboard/developers/logs/page.tsx`, but replace the flat table data with a page-local trace model and drawer state. Extract payload formatting and copyable stage rendering into focused helpers/components so the list, drawer, and formatting logic stay testable without forcing the shared list archetype to own the interaction.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Vitest

---

## File Structure

- Modify: `src/app/dashboard/developers/logs/page.tsx`
  - Replace the flat rows with trace-oriented mock data and page-local drawer state.
  - Keep the page shell title, description, tabs, and search behavior aligned with the dashboard pattern.
- Create: `src/features/developer-logs/types.ts`
  - Define the trace, stage, and payload types used by the page and tests.
- Create: `src/features/developer-logs/mock-data.ts`
  - Hold deterministic mock traces for completed, processing, and failed flows.
- Create: `src/features/developer-logs/format.ts`
  - Format payloads as JSON or text and build the combined copy string for one stage.
- Create: `src/features/developer-logs/log-trace-drawer.tsx`
  - Render the drawer, stage timeline cards, code blocks, and copy actions.
- Create: `src/features/developer-logs/logs-page-client.tsx`
  - Own list filtering, row selection, and drawer open state while keeping `page.tsx` lightweight.
- Create: `src/features/developer-logs/logs-page-client.test.tsx`
  - Define the page-level behavior before implementation and validate the drawer flow.
- Create: `src/features/developer-logs/format.test.ts`
  - Define and verify formatting and composed-copy behavior.

## Task 1: Define payload formatting behavior first

**Files:**
- Create: `src/features/developer-logs/format.ts`
- Test: `src/features/developer-logs/format.test.ts`

- [ ] **Step 1: Write the failing format tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildStageCopyText, formatPayload } from '@/features/developer-logs/format';
import type { LogStage } from '@/features/developer-logs/types';

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
  it('builds one copy block with meta, headers, and body', () => {
    const stage = {
      key: 'responded',
      label: '响应',
      status: 'Completed',
      timestamp: '2026-07-24 10:00:02',
      endpoint: '/app-api/orders',
      responseCode: '200',
      duration: '128 ms',
      traceId: 'trace_001',
      requestId: 'req_002',
      retryCount: 0,
      errorMessage: undefined,
      headers: {
        raw: '{"content-type":"application/json"}',
        formatted: '{\n  "content-type": "application/json"\n}',
        format: 'json'
      },
      body: {
        raw: '{"success":true}',
        formatted: '{\n  "success": true\n}',
        format: 'json'
      }
    } satisfies LogStage;

    expect(buildStageCopyText(stage)).toContain('Stage: 响应');
    expect(buildStageCopyText(stage)).toContain('Status: Completed');
    expect(buildStageCopyText(stage)).toContain('Headers:\n{"content-type":"application/json"}');
    expect(buildStageCopyText(stage)).toContain('Body:\n{"success":true}');
  });
});
```

- [ ] **Step 2: Run the format tests to verify they fail**

Run: `pnpm test src/features/developer-logs/format.test.ts`
Expected: FAIL with module-not-found errors for `@/features/developer-logs/format` or missing exports.

- [ ] **Step 3: Write the minimal types and formatter implementation**

```ts
export type LogStageStatus = 'Completed' | 'Processing' | 'Failed';
export type LogStageKey = 'received' | 'responded' | 'sent' | 'partnerResponded';

export type LogPayload = {
  raw: string;
  formatted: string;
  format: 'json' | 'text';
};

export type LogStage = {
  key: LogStageKey;
  label: string;
  status: LogStageStatus;
  timestamp: string;
  endpoint: string;
  responseCode?: string;
  duration?: string;
  traceId: string;
  requestId: string;
  retryCount?: number;
  errorMessage?: string;
  headers: LogPayload;
  body: LogPayload;
};

export function formatPayload(raw: string): LogPayload {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { raw, formatted: '', format: 'text' };
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return {
        raw,
        formatted: JSON.stringify(JSON.parse(trimmed), null, 2),
        format: 'json'
      };
    } catch {
      return { raw, formatted: raw, format: 'text' };
    }
  }

  return { raw, formatted: raw, format: 'text' };
}

export function buildStageCopyText(stage: LogStage) {
  return [
    `Stage: ${stage.label}`,
    `Status: ${stage.status}`,
    `Timestamp: ${stage.timestamp}`,
    `Endpoint: ${stage.endpoint}`,
    `Response Code: ${stage.responseCode ?? ''}`,
    `Duration: ${stage.duration ?? ''}`,
    `Trace ID: ${stage.traceId}`,
    `Request ID: ${stage.requestId}`,
    `Retry Count: ${stage.retryCount ?? 0}`,
    `Error: ${stage.errorMessage ?? ''}`,
    '',
    `Headers:\n${stage.headers.raw}`,
    '',
    `Body:\n${stage.body.raw}`
  ].join('\n');
}
```

- [ ] **Step 4: Run the format tests to verify they pass**

Run: `pnpm test src/features/developer-logs/format.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the formatter foundation**

```bash
git add src/features/developer-logs/types.ts src/features/developer-logs/format.ts src/features/developer-logs/format.test.ts
git commit -m "feat: add developer log payload formatting"
```

## Task 2: Define the page interaction tests before building UI

**Files:**
- Create: `src/features/developer-logs/logs-page-client.test.tsx`
- Create: `src/features/developer-logs/mock-data.ts`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Write the failing page interaction tests**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { completedTrace, failedTrace } from '@/features/developer-logs/mock-data';
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';

vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn()
  }
});

describe('LogsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders aggregate status and stage progress in the list', () => {
    const html = renderToStaticMarkup(createElement(LogsPageClient, { initialRows: [completedTrace, failedTrace] }));

    expect(html).toContain('Completed');
    expect(html).toContain('Failed');
    expect(html).toContain('4/4');
    expect(html).toContain('3/4');
  });

  it('renders the drawer content for the selected trace', () => {
    const html = renderToStaticMarkup(createElement(LogsPageClient, { initialRows: [completedTrace], initialSelectedId: completedTrace.id }));

    expect(html).toContain('接到');
    expect(html).toContain('响应');
    expect(html).toContain('发出');
    expect(html).toContain('对方响应');
    expect(html).toContain(completedTrace.traceId);
  });

  it('shows failed stage error information', () => {
    const html = renderToStaticMarkup(createElement(LogsPageClient, { initialRows: [failedTrace], initialSelectedId: failedTrace.id }));

    expect(html).toContain('signature mismatch');
  });
});
```

- [ ] **Step 2: Run the page tests to verify they fail**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL with module-not-found errors for the page client or mock data modules.

- [ ] **Step 3: Write the minimal trace mock data and client skeleton**

```ts
import { formatPayload } from '@/features/developer-logs/format';
import type { TraceLogRow } from '@/features/developer-logs/types';

export const completedTrace: TraceLogRow = {
  id: 'trace-row-001',
  event: 'order.created',
  resource: 'Order #10024',
  destination: 'Shopify',
  status: 'Completed',
  progress: '4/4',
  latestTimestamp: '2026-07-24 10:00:04',
  traceId: 'trace_001',
  requestId: 'req_001',
  stages: [
    {
      key: 'received',
      label: '接到',
      status: 'Completed',
      timestamp: '2026-07-24 10:00:01',
      endpoint: '/open-api/orders/webhook',
      responseCode: '200',
      duration: '15 ms',
      traceId: 'trace_001',
      requestId: 'req_001',
      retryCount: 0,
      headers: formatPayload('{"x-trace-id":"trace_001"}'),
      body: formatPayload('{"orderNo":"10024"}')
    },
    {
      key: 'responded',
      label: '响应',
      status: 'Completed',
      timestamp: '2026-07-24 10:00:02',
      endpoint: '/open-api/orders/webhook',
      responseCode: '200',
      duration: '128 ms',
      traceId: 'trace_001',
      requestId: 'req_002',
      retryCount: 0,
      headers: formatPayload('{"content-type":"application/json"}'),
      body: formatPayload('{"success":true}')
    },
    {
      key: 'sent',
      label: '发出',
      status: 'Completed',
      timestamp: '2026-07-24 10:00:03',
      endpoint: 'POST https://partner.example.com/orders',
      responseCode: '202',
      duration: '220 ms',
      traceId: 'trace_001',
      requestId: 'req_003',
      retryCount: 1,
      headers: formatPayload('{"authorization":"Bearer ***"}'),
      body: formatPayload('{"externalOrderNo":"SO-10024"}')
    },
    {
      key: 'partnerResponded',
      label: '对方响应',
      status: 'Completed',
      timestamp: '2026-07-24 10:00:04',
      endpoint: 'POST https://partner.example.com/orders',
      responseCode: '200',
      duration: '410 ms',
      traceId: 'trace_001',
      requestId: 'req_004',
      retryCount: 0,
      headers: formatPayload('{"content-type":"application/json"}'),
      body: formatPayload('{"accepted":true}')
    }
  ]
};
```

```tsx
import type { TraceLogRow } from '@/features/developer-logs/types';

export function LogsPageClient({ initialRows, initialSelectedId }: { initialRows: TraceLogRow[]; initialSelectedId?: string }) {
  const selected = initialRows.find((row) => row.id === initialSelectedId);

  return (
    <div>
      {initialRows.map((row) => (
        <article key={row.id}>
          <span>{row.event}</span>
          <span>{row.status}</span>
          <span>{row.progress}</span>
        </article>
      ))}
      {selected ? (
        <section>
          <h2>{selected.traceId}</h2>
          {selected.stages.map((stage) => (
            <article key={stage.key}>
              <h3>{stage.label}</h3>
              <p>{stage.errorMessage}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the page tests to verify they pass with the minimal skeleton**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the tested page contract**

```bash
git add src/features/developer-logs/mock-data.ts src/features/developer-logs/logs-page-client.tsx src/features/developer-logs/logs-page-client.test.tsx
git commit -m "test: define developer logs drawer page behavior"
```

## Task 3: Build the drawer component around the tested shape

**Files:**
- Create: `src/features/developer-logs/log-trace-drawer.tsx`
- Modify: `src/features/developer-logs/logs-page-client.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Extend the failing page test to expect formatted payload sections**

```tsx
it('renders headers and body blocks for each stage in the drawer', () => {
  const html = renderToStaticMarkup(createElement(LogsPageClient, { initialRows: [completedTrace], initialSelectedId: completedTrace.id }));

  expect(html).toContain('Headers');
  expect(html).toContain('Body');
  expect(html).toContain('{\n  &quot;x-trace-id&quot;: &quot;trace_001&quot;\n}');
});
```

- [ ] **Step 2: Run the page test to verify it fails for missing drawer markup**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the current skeleton does not render headers, body sections, or formatted payload blocks.

- [ ] **Step 3: Write the drawer component and connect it to the page client**

```tsx
function PayloadBlock({ title, payload }: { title: string; payload: LogPayload }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{title}</h4>
      </div>
      <pre className="max-h-56 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-[12px] leading-6 text-[var(--foreground)] whitespace-pre-wrap break-all">
        {payload.formatted || 'No payload'}
      </pre>
    </section>
  );
}

export function LogTraceDrawer({ row }: { row: TraceLogRow }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-3xl border-l border-[var(--border)] bg-[var(--surface)] shadow-[-24px_0_64px_rgba(15,23,42,0.18)]">
      <div className="flex h-full flex-col">
        <header className="border-b border-[var(--border)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Trace Detail</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{row.event}</h2>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-2">
            <span>Resource: {row.resource}</span>
            <span>Destination: {row.destination}</span>
            <span>Trace ID: {row.traceId}</span>
            <span>Request ID: {row.requestId}</span>
          </div>
        </header>
        <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
          {row.stages.map((stage, index) => (
            <article key={stage.key} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Step {index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{stage.label}</h3>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">{stage.status}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
                <div><dt className="font-medium text-[var(--foreground)]">Time</dt><dd>{stage.timestamp}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Endpoint</dt><dd>{stage.endpoint}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Response Code</dt><dd>{stage.responseCode ?? '-'}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Duration</dt><dd>{stage.duration ?? '-'}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Trace ID</dt><dd>{stage.traceId}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Request ID</dt><dd>{stage.requestId}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Retry Count</dt><dd>{stage.retryCount ?? 0}</dd></div>
                <div><dt className="font-medium text-[var(--foreground)]">Error</dt><dd>{stage.errorMessage ?? '-'}</dd></div>
              </dl>
              <div className="mt-5 space-y-4">
                <PayloadBlock title="Headers" payload={stage.headers} />
                <PayloadBlock title="Body" payload={stage.body} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run the page test to verify the drawer payload rendering passes**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the drawer rendering**

```bash
git add src/features/developer-logs/log-trace-drawer.tsx src/features/developer-logs/logs-page-client.tsx src/features/developer-logs/logs-page-client.test.tsx
git commit -m "feat: add developer log trace drawer"
```

## Task 4: Add copy actions with a failing test first

**Files:**
- Modify: `src/features/developer-logs/log-trace-drawer.tsx`
- Modify: `src/features/developer-logs/logs-page-client.test.tsx`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Rewrite the page interaction test to use a DOM environment and assert copy actions**

```tsx
// Add to vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { completedTrace, failedTrace } from '@/features/developer-logs/mock-data';
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';

const writeText = vi.fn();

beforeEach(() => {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  writeText.mockReset();
});

it('copies stage headers, body, and full stage payload', async () => {
  const user = userEvent.setup();
  render(<LogsPageClient initialRows={[completedTrace, failedTrace]} />);

  await user.click(screen.getByRole('button', { name: /order.created/i }));
  await user.click(screen.getByRole('button', { name: /copy headers 接到/i }));
  expect(writeText).toHaveBeenNthCalledWith(1, completedTrace.stages[0].headers.raw);

  await user.click(screen.getByRole('button', { name: /copy body 接到/i }));
  expect(writeText).toHaveBeenNthCalledWith(2, completedTrace.stages[0].body.raw);

  await user.click(screen.getByRole('button', { name: /copy stage 接到/i }));
  expect(writeText).toHaveBeenNthCalledWith(3, expect.stringContaining('Stage: 接到'));
});
```

- [ ] **Step 2: Run the page test to verify it fails because copy buttons do not exist yet**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because `Copy Headers`, `Copy Body`, and `Copy Stage` actions are missing.

- [ ] **Step 3: Implement the minimal copy actions**

```tsx
function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

<button
  type="button"
  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
  onClick={() => copyText(stage.headers.raw)}
  aria-label={`Copy Headers ${stage.label}`}
>
  Copy Headers
</button>

<button
  type="button"
  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
  onClick={() => copyText(stage.body.raw)}
  aria-label={`Copy Body ${stage.label}`}
>
  Copy Body
</button>

<button
  type="button"
  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
  onClick={() => copyText(buildStageCopyText(stage))}
  aria-label={`Copy Stage ${stage.label}`}
>
  Copy Stage
</button>
```

- [ ] **Step 4: Run the page test to verify copy behavior passes**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the copy actions**

```bash
git add vitest.config.ts src/features/developer-logs/log-trace-drawer.tsx src/features/developer-logs/logs-page-client.test.tsx
git commit -m "feat: add copy actions for developer log stages"
```

## Task 5: Wire the tested client into the dashboard page and final polish

**Files:**
- Modify: `src/app/dashboard/developers/logs/page.tsx`
- Modify: `src/features/developer-logs/logs-page-client.tsx`
- Modify: `src/features/developer-logs/mock-data.ts`
- Test: `src/features/developer-logs/format.test.ts`
- Test: `src/features/developer-logs/logs-page-client.test.tsx`

- [ ] **Step 1: Extend the page test to cover search and drawer close behavior**

```tsx
it('filters traces by trace id and closes the drawer', async () => {
  const user = userEvent.setup();
  render(<LogsPageClient initialRows={[completedTrace, failedTrace]} />);

  await user.type(screen.getByPlaceholderText(/trace id/i), 'trace_001');
  expect(screen.getByRole('button', { name: /order.created/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /invoice.sync_failed/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /order.created/i }));
  await user.click(screen.getByRole('button', { name: /close trace detail/i }));
  expect(screen.queryByText('Trace Detail')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the page test to verify it fails for missing filter and close behavior**

Run: `pnpm test src/features/developer-logs/logs-page-client.test.tsx`
Expected: FAIL because the page does not yet expose a working search input or a close action.

- [ ] **Step 3: Implement the page composition with the real shell**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import type { TableColumn } from '@/components/admin/data-table-shell';
import { mockTraceRows } from '@/features/developer-logs/mock-data';
import { LogTraceDrawer } from '@/features/developer-logs/log-trace-drawer';
import type { TraceLogRow } from '@/features/developer-logs/types';

const columns: TableColumn<TraceLogRow>[] = [
  { key: 'event', label: '事件' },
  { key: 'status', label: '状态', isStatus: true },
  { key: 'resource', label: '资源' },
  { key: 'destination', label: '目标系统' },
  { key: 'progress', label: '阶段进度' },
  { key: 'traceId', label: 'Trace ID' },
  { key: 'latestTimestamp', label: '时间' }
];

export function LogsPageClient({ initialRows = mockTraceRows, initialSelectedId }: { initialRows?: TraceLogRow[]; initialSelectedId?: string }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialSelectedId);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialRows;

    return initialRows.filter((row) =>
      [row.event, row.resource, row.destination, row.traceId, row.requestId].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [initialRows, query]);

  const selected = filteredRows.find((row) => row.id === selectedId) ?? initialRows.find((row) => row.id === selectedId);

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1280px] pt-5 lg:pt-6">
        <ListPageTemplate
          title="日志"
          description="检索事件、同步记录、API 调用和集成诊断信息。"
          actions={[{ label: '导出日志', variant: 'secondary' }]}
          tabs={['全部', '事件', 'API 调用', '同步', '失败']}
          activeTab="全部"
          searchPlaceholder="搜索事件、资源、目标系统、Trace ID 或 Request ID..."
          columns={columns}
          rows={filteredRows}
        />
      </div>
      {selected ? <LogTraceDrawer row={selected} onClose={() => setSelectedId(undefined)} /> : null}
    </div>
  );
}
```

```tsx
import { LogsPageClient } from '@/features/developer-logs/logs-page-client';

export default function LogsPage() {
  return <LogsPageClient />;
}
```

- [ ] **Step 4: Run the focused tests, then the full project checks**

Run: `pnpm test src/features/developer-logs/format.test.ts src/features/developer-logs/logs-page-client.test.tsx`
Expected: PASS

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Start the app and verify the page in the browser**

Run: `pnpm dev`
Expected: Next.js dev server starts successfully.

Then open `/dashboard/developers/logs` and verify:
- list rows show aggregate status, stage progress, and trace ID
- clicking a row opens the drawer
- the drawer shows all four stages in order
- failed stage error text is visually obvious
- copy buttons work for headers, body, and whole stage

- [ ] **Step 6: Commit the integrated page**

```bash
git add src/app/dashboard/developers/logs/page.tsx src/features/developer-logs/mock-data.ts src/features/developer-logs/logs-page-client.tsx src/features/developer-logs/log-trace-drawer.tsx src/features/developer-logs/types.ts src/features/developer-logs/format.ts src/features/developer-logs/format.test.ts src/features/developer-logs/logs-page-client.test.tsx vitest.config.ts
git commit -m "feat: redesign developer logs around trace drawers"
```

## Self-Review

- Spec coverage: the plan covers trace list fields, drawer layout, four stages, formatted headers and body, copy actions, failed-state emphasis, filtering, and manual verification in the real browser.
- Placeholder scan: no `TBD`, `TODO`, or deferred “write tests later” steps remain.
- Type consistency: `TraceLogRow`, `LogStage`, `LogPayload`, `formatPayload`, and `buildStageCopyText` are named consistently across tasks.

## Execution Handoff

The user explicitly asked to start immediately, so use inline execution for this session.
