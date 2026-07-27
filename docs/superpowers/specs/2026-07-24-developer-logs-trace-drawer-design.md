# Developer Logs Trace Drawer Design

## Goal

Upgrade the developer logs page into a trace-oriented inspection view so users can quickly find one integration chain and inspect all four stages of message exchange in a readable, copy-friendly format.

The target workflow is:

1. Search or scan a trace from the logs list.
2. Open the trace in a drawer.
3. Review the four stages in order: received, responded, sent, partner responded.
4. Copy formatted headers or bodies from any stage.

## Scope

This design applies to the developer logs page at `src/app/dashboard/developers/logs/page.tsx`.

The first version is a frontend implementation backed by mock data that reflects the intended production structure. It does not include backend persistence, live polling, or server-side log retrieval.

## User Experience

### List View

The page remains a searchable list page, but each row represents one full trace instead of a flat event.

Each trace row shows:

- Event name
- Resource
- Destination system
- Aggregate status
- Stage progress
- Trace ID
- Latest timestamp

The search box should match at least:

- Event name
- Resource
- Destination system
- Trace ID
- Request ID

Aggregate status reflects the worst or latest meaningful state across the four stages:

- `Completed` when all four stages complete successfully
- `Processing` when the trace is still in progress
- `Failed` when any stage has failed and the chain is not recovered

Stage progress is displayed as a compact value such as `4/4`, `3/4`, or `2/4` so users can immediately see whether the chain is complete.

### Drawer Detail View

Clicking a row opens a detail drawer. The drawer is the primary inspection surface.

The drawer header shows whole-trace summary information:

- Event name
- Resource
- Destination system
- Aggregate status
- Trace ID
- Primary request ID
- Latest timestamp

The drawer body presents the four stages as a vertical timeline of cards in this fixed order:

1. Received
2. Responded
3. Sent
4. Partner responded

This ordering is important because users want to inspect one complete request chain from inbound to outbound completion without switching tabs.

## Stage Card Design

Each stage card contains three sections.

### 1. Meta Information

Each stage shows:

- Stage name
- Status
- Timestamp
- URL or interface name
- Response code
- Duration
- Trace ID
- Request ID
- Retry count
- Error message

Rules:

- `Response code` may be empty for stages where it does not apply.
- `Duration` should be displayed in a compact readable form such as `128 ms` or `1.2 s`.
- `Error message` only appears when present and should be visually emphasized.
- Repeated trace-level values such as trace ID can still appear inside the stage card because users often copy from the exact stage they are reading.

### 2. Headers

Headers appear in their own formatted code block.

Behavior:

- If the value is an object, render pretty-printed JSON.
- If the value is plain text, preserve line breaks.
- The area should use a monospace font and internal scrolling for long content.
- A `Copy Headers` action copies the raw stage headers payload.

### 3. Body

Body appears in its own formatted code block under headers.

Behavior:

- Default to pretty-printed JSON when parseable.
- Fall back to raw text when the payload is not valid JSON.
- Preserve whitespace and line breaks.
- Use a monospace font and internal scrolling.
- A `Copy Body` action copies the raw stage body payload.
- A `Copy Stage` action copies a composed text block containing the stage meta, headers, and body together.

## Visual and Interaction Direction

The page should feel like an observability surface rather than a generic CRUD table.

Guidelines:

- Keep the list view calm and scannable.
- Put the visual emphasis inside the drawer.
- Use strong stage labels and a timeline rhythm so the four-step chain reads as one flow.
- Make failed stages immediately visible through status treatment and error emphasis.
- Keep long payloads readable with spacing, separators, and code styling instead of dense text walls.

The drawer should support both desktop and smaller laptop widths without making payloads unreadable. If vertical space becomes tight, payload blocks should scroll internally rather than expand the whole drawer excessively.

## Data Model

Replace the current flat `LogRow` shape with a trace-oriented structure.

```ts
type LogStageStatus = 'Completed' | 'Processing' | 'Failed';

type LogStageKey = 'received' | 'responded' | 'sent' | 'partnerResponded';

type LogPayload = {
  raw: string;
  formatted: string;
  format: 'json' | 'text';
};

type LogStage = {
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

type TraceLogRow = {
  id: string;
  event: string;
  resource: string;
  destination: string;
  status: LogStageStatus;
  progress: string;
  latestTimestamp: string;
  traceId: string;
  requestId: string;
  stages: LogStage[];
};
```

Notes:

- `raw` exists for exact copying.
- `formatted` exists so the UI does not need to reformat on every render.
- `format` allows the renderer to choose the proper presentation treatment.
- The four stages should always be rendered in the fixed semantic order above, even if some are still processing.

## Formatting Rules

Formatting should be deterministic.

- Attempt JSON parsing only when the payload looks like JSON.
- When parsing succeeds, use two-space indentation.
- When parsing fails, keep the original text unchanged.
- Empty payloads should render a muted empty state such as `No payload`.

Copy behavior should preserve the original payload, not the placeholder empty-state text.

## Failure Handling

The UI should clearly distinguish between incomplete and failed traces.

- `Processing` means the stage is waiting, running, or not yet reached.
- `Failed` means the stage ended with an error and should expose the error message.
- A failed stage does not hide later mock stages, but later stages should usually be absent or marked as not reached in the mock scenarios.

The first version does not need retry controls, refresh controls, or live stream updates.

## Accessibility

- All copy buttons need accessible names that include the target section.
- The drawer should be keyboard dismissible.
- Code blocks must maintain sufficient contrast.
- Status indicators should not rely on color alone; text labels remain visible.

## Testing

### Test-First Expectations

Before implementation, add tests that define the intended behavior of the page-level trace experience.

Minimum coverage:

- Renders trace rows with aggregate status and progress
- Opens the drawer when a row is selected
- Shows all four stages in the correct order
- Renders formatted JSON payloads for JSON content
- Falls back to plain text rendering for non-JSON payloads
- Copies headers for a stage
- Copies body for a stage
- Copies the composed stage payload
- Shows error information for failed stages

### Manual Verification

After implementation:

- Open `/dashboard/developers/logs`
- Confirm the list is trace-oriented rather than flat-event oriented
- Open a completed trace and verify all four stages render
- Open a failed trace and verify error emphasis is clear
- Copy headers and body from at least one stage
- Confirm long payload blocks remain readable and scroll correctly

## Implementation Notes

The current page uses `ListPageTemplate` with a simple table data shape. The upgraded experience will likely require one of these approaches:

1. Keep `ListPageTemplate` for the top-level shell, but provide richer row actions and manage the drawer locally in the page.
2. If the template is too limited for row interaction and custom cells, create a page-specific composition that reuses lower-level table primitives instead of forcing the existing archetype.

The recommended implementation approach is option 1 first. It preserves the current page structure and only breaks out if the shared template blocks the required interaction quality.

## Out of Scope

The first version does not include:

- Real backend log APIs
- Server filtering or pagination
- Auto-refresh
- Downloading raw trace files
- Diff view between stages
- Collapsing or reordering stages

## Success Criteria

The design is successful when a user can:

- Identify a trace from the list quickly
- Open one drawer and understand the full four-step chain
- Read formatted message content without visual clutter
- Copy payloads from any stage without manual cleanup
- Spot failures and trace identifiers immediately
