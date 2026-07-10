# Requirement Annotator SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable React/Next requirement annotation layer that lets users annotate UI elements and flows, save structured page requirements, preview/copy/export a PRD, and mount the tool globally.

**Architecture:** Create a self-contained `src/components/requirement-annotator/` SDK-style module plus file-backed Next API routes under `src/app/api/prd-annotations/`. Keep schema and PRD generation pure and tested so the UI, storage, and generator can later be extracted into a package.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, browser Clipboard API, Node `fs/promises` inside API routes.

---

## File Structure

- Create: `src/components/requirement-annotator/types.ts` — shared annotation, flow, page document, and storage types.
- Create: `src/components/requirement-annotator/page-id.ts` — route-to-page-id normalization and safe file-name sanitization.
- Create: `src/components/requirement-annotator/prd-generator.ts` — pure Markdown generator for PRD preview and export.
- Create: `src/components/requirement-annotator/prd-generator.test.ts` — Vitest coverage for generated PRD sections, annotations, flows, acceptance criteria, and open questions.
- Create: `src/components/requirement-annotator/page-id.test.ts` — Vitest coverage for route normalization and path traversal prevention.
- Create: `src/app/api/prd-annotations/route.ts` — load and save structured annotation JSON files.
- Create: `src/app/api/prd-annotations/export/route.ts` — export generated Markdown PRD files.
- Create: `src/components/requirement-annotator/storage.ts` — browser client for the API routes.
- Create: `src/components/requirement-annotator/element-picker.tsx` — hover/click target picker and overlay.
- Create: `src/components/requirement-annotator/annotation-drawer.tsx` — annotation list and editor.
- Create: `src/components/requirement-annotator/flow-builder.tsx` — form-based business flow editor.
- Create: `src/components/requirement-annotator/prd-preview-panel.tsx` — Markdown source/preview, copy, and export UI.
- Create: `src/components/requirement-annotator/requirement-annotator.tsx` — global runtime shell that wires picker, editor, flows, PRD preview, and storage.
- Create: `src/components/requirement-annotator/index.ts` — public exports.
- Modify: `src/app/layout.tsx` — mount the global annotator inside `<body>`.

## Task 1: Schema, Page Id Utilities, And Generator Tests

**Files:**
- Create: `src/components/requirement-annotator/types.ts`
- Create: `src/components/requirement-annotator/page-id.ts`
- Create: `src/components/requirement-annotator/prd-generator.ts`
- Create: `src/components/requirement-annotator/prd-generator.test.ts`
- Create: `src/components/requirement-annotator/page-id.test.ts`

- [ ] **Step 1: Create the shared types**

Create `src/components/requirement-annotator/types.ts`:

```ts
export type RequirementElementType =
  | 'field'
  | 'button'
  | 'table-column'
  | 'filter'
  | 'section'
  | 'card'
  | 'navigation'
  | 'other';

export type RequirementSource = 'ai' | 'manual' | 'edited-ai';

export type RequirementStatus = 'draft' | 'confirmed' | 'todo' | 'implemented';

export type RequirementTarget = {
  selector?: string;
  prdId?: string;
  label?: string;
  elementType: RequirementElementType;
};

export type RequirementAnnotation = {
  id: string;
  pageId: string;
  route: string;
  target: RequirementTarget;
  content: {
    title: string;
    description: string;
    businessRule?: string;
    interactionRule?: string;
    dataSource?: string;
    validationRule?: string;
    permissionRule?: string;
    acceptanceCriteria: string[];
    openQuestions: string[];
  };
  source: RequirementSource;
  status: RequirementStatus;
};

export type RequirementFlowStep = {
  order: number;
  action: string;
  targetAnnotationId?: string;
  expectedResult: string;
  exception?: string;
};

export type RequirementFlow = {
  id: string;
  pageId: string;
  title: string;
  actor?: string;
  trigger: string;
  preconditions: string[];
  steps: RequirementFlowStep[];
  endState: string;
  openQuestions: string[];
};

export type RequirementPageDocument = {
  pageId: string;
  route: string;
  title: string;
  goal?: string;
  actors: string[];
  annotations: RequirementAnnotation[];
  flows: RequirementFlow[];
  updatedAt: string;
};

export type RequirementTargetDraft = RequirementTarget & {
  route: string;
  pageId: string;
};
```

- [ ] **Step 2: Create failing generator tests**

Create `src/components/requirement-annotator/prd-generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generatePrdMarkdown } from './prd-generator';
import type { RequirementPageDocument } from './types';

const document: RequirementPageDocument = {
  pageId: 'dashboard-outbound',
  route: '/dashboard/outbound',
  title: 'Outbound Management',
  goal: 'Help operators review and ship outbound orders.',
  actors: ['Operations Manager', 'Warehouse Operator'],
  updatedAt: '2026-06-25T00:00:00.000Z',
  annotations: [
    {
      id: 'status-field',
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      target: {
        prdId: 'outbound-status',
        label: 'Status',
        elementType: 'field'
      },
      content: {
        title: 'Status Field',
        description: 'Displays the current outbound order status.',
        businessRule: 'Status must match the latest warehouse state.',
        interactionRule: 'Users can filter the list by status.',
        dataSource: 'Outbound order API status field.',
        validationRule: 'Unknown statuses render as Other.',
        permissionRule: 'All signed-in operators can view status.',
        acceptanceCriteria: ['Given an order is shipped, then status shows Shipped.'],
        openQuestions: ['Should cancelled orders be hidden by default?']
      },
      source: 'manual',
      status: 'confirmed'
    }
  ],
  flows: [
    {
      id: 'ship-flow',
      pageId: 'dashboard-outbound',
      title: 'Ship outbound order',
      actor: 'Warehouse Operator',
      trigger: 'User clicks Ship on a ready outbound order.',
      preconditions: ['Order is ready to ship.'],
      steps: [
        {
          order: 1,
          action: 'Review the order status.',
          targetAnnotationId: 'status-field',
          expectedResult: 'The status confirms the order can be shipped.',
          exception: 'If status is blocked, show the reason.'
        }
      ],
      endState: 'The order is marked as shipped.',
      openQuestions: ['Should shipping require manager approval?']
    }
  ]
};

describe('generatePrdMarkdown', () => {
  it('renders the standard PRD sections', () => {
    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('# Page PRD: Outbound Management');
    expect(markdown).toContain('## 1. Page Goal');
    expect(markdown).toContain('## 5. Business Flows');
    expect(markdown).toContain('## 9. Open Questions');
  });

  it('renders annotation details and linked flow steps', () => {
    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('### Status Field');
    expect(markdown).toContain('- **Target:** Status (`field`)');
    expect(markdown).toContain('- **Business Rule:** Status must match the latest warehouse state.');
    expect(markdown).toContain('### Ship outbound order');
    expect(markdown).toContain('1. Review the order status.');
    expect(markdown).toContain('Linked UI: Status Field');
  });

  it('collects acceptance criteria and open questions', () => {
    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('- Given an order is shipped, then status shows Shipped.');
    expect(markdown).toContain('- Should cancelled orders be hidden by default?');
    expect(markdown).toContain('- Should shipping require manager approval?');
  });
});
```

- [ ] **Step 3: Create failing page id tests**

Create `src/components/requirement-annotator/page-id.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyRequirementDocument, getPageIdFromRoute, sanitizePageId } from './page-id';

describe('getPageIdFromRoute', () => {
  it('turns a route into a stable page id', () => {
    expect(getPageIdFromRoute('/dashboard/outbound')).toBe('dashboard-outbound');
    expect(getPageIdFromRoute('/')).toBe('home');
    expect(getPageIdFromRoute('/dashboard/orders?page=2')).toBe('dashboard-orders');
  });
});

describe('sanitizePageId', () => {
  it('removes path traversal and unsafe characters', () => {
    expect(sanitizePageId('../admin/orders')).toBe('admin-orders');
    expect(sanitizePageId('dashboard outbound!')).toBe('dashboard-outbound');
  });
});

describe('createEmptyRequirementDocument', () => {
  it('creates an empty page document for a route', () => {
    const doc = createEmptyRequirementDocument('/dashboard/outbound', '2026-06-25T00:00:00.000Z');

    expect(doc.pageId).toBe('dashboard-outbound');
    expect(doc.title).toBe('Dashboard Outbound');
    expect(doc.annotations).toEqual([]);
    expect(doc.flows).toEqual([]);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: FAIL because `prd-generator.ts` and `page-id.ts` do not exist yet.

- [ ] **Step 5: Implement page id utilities**

Create `src/components/requirement-annotator/page-id.ts`:

```ts
import type { RequirementPageDocument } from './types';

export function sanitizePageId(value: string) {
  const sanitized = value
    .replace(/[\\/]+/g, '-')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return sanitized || 'home';
}

export function getPageIdFromRoute(route: string) {
  const path = route.split('?')[0] || '/';
  if (path === '/') {
    return 'home';
  }

  return sanitizePageId(path.replace(/^\/+/, ''));
}

export function titleFromPageId(pageId: string) {
  return pageId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function createEmptyRequirementDocument(route: string, updatedAt: string): RequirementPageDocument {
  const pageId = getPageIdFromRoute(route);

  return {
    pageId,
    route,
    title: titleFromPageId(pageId),
    actors: [],
    annotations: [],
    flows: [],
    updatedAt
  };
}
```

- [ ] **Step 6: Implement the PRD generator**

Create `src/components/requirement-annotator/prd-generator.ts`:

```ts
import type { RequirementAnnotation, RequirementFlow, RequirementPageDocument } from './types';

function optionalLine(label: string, value?: string) {
  return value?.trim() ? `- **${label}:** ${value.trim()}` : '';
}

function listOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

function targetLabel(annotation: RequirementAnnotation) {
  return annotation.target.label || annotation.target.prdId || annotation.target.selector || annotation.id;
}

function renderAnnotation(annotation: RequirementAnnotation) {
  const lines = [
    `### ${annotation.content.title}`,
    '',
    `- **Target:** ${targetLabel(annotation)} (\`${annotation.target.elementType}\`)`,
    `- **Status:** ${annotation.status}`,
    optionalLine('Description', annotation.content.description),
    optionalLine('Business Rule', annotation.content.businessRule),
    optionalLine('Interaction Rule', annotation.content.interactionRule),
    optionalLine('Data Source', annotation.content.dataSource),
    optionalLine('Validation Rule', annotation.content.validationRule),
    optionalLine('Permission Rule', annotation.content.permissionRule)
  ].filter(Boolean);

  return lines.join('\n');
}

function renderFlow(flow: RequirementFlow, annotations: RequirementAnnotation[]) {
  const annotationById = new Map(annotations.map((annotation) => [annotation.id, annotation]));
  const steps = [...flow.steps]
    .sort((a, b) => a.order - b.order)
    .map((step, index) => {
      const linked = step.targetAnnotationId ? annotationById.get(step.targetAnnotationId) : undefined;
      const suffix = linked ? ` Linked UI: ${linked.content.title}.` : '';
      const exception = step.exception ? ` Exception: ${step.exception}` : '';
      return `${index + 1}. ${step.action} Expected result: ${step.expectedResult}.${suffix}${exception}`;
    })
    .join('\n');

  return [
    `### ${flow.title}`,
    '',
    optionalLine('Actor', flow.actor),
    optionalLine('Trigger', flow.trigger),
    '**Preconditions:**',
    listOrFallback(flow.preconditions, 'No preconditions specified.'),
    '',
    '**Steps:**',
    steps || '1. No steps specified.',
    '',
    optionalLine('End State', flow.endState)
  ]
    .filter(Boolean)
    .join('\n');
}

export function generatePrdMarkdown(document: RequirementPageDocument) {
  const acceptanceCriteria = document.annotations.flatMap((annotation) => annotation.content.acceptanceCriteria);
  const openQuestions = [
    ...document.annotations.flatMap((annotation) => annotation.content.openQuestions),
    ...document.flows.flatMap((flow) => flow.openQuestions)
  ];

  return [
    `# Page PRD: ${document.title}`,
    '',
    '## 1. Page Goal',
    document.goal || 'No page goal specified.',
    '',
    '## 2. User Roles',
    listOrFallback(document.actors, 'No user roles specified.'),
    '',
    '## 3. Page Structure',
    listOrFallback(
      [...new Set(document.annotations.map((annotation) => annotation.target.elementType))].map((type) => `${type}: ${document.annotations.filter((annotation) => annotation.target.elementType === type).length} annotated item(s)`),
      'No page structure annotations specified.'
    ),
    '',
    '## 4. Fields And Rules',
    document.annotations.length > 0 ? document.annotations.map(renderAnnotation).join('\n\n') : 'No fields or rules specified.',
    '',
    '## 5. Business Flows',
    document.flows.length > 0 ? document.flows.map((flow) => renderFlow(flow, document.annotations)).join('\n\n') : 'No business flows specified.',
    '',
    '## 6. Interactions',
    listOrFallback(document.annotations.map((annotation) => annotation.content.interactionRule).filter((value): value is string => Boolean(value)), 'No interactions specified.'),
    '',
    '## 7. Permissions And States',
    listOrFallback(document.annotations.map((annotation) => annotation.content.permissionRule).filter((value): value is string => Boolean(value)), 'No permissions or states specified.'),
    '',
    '## 8. Acceptance Criteria',
    listOrFallback(acceptanceCriteria, 'No acceptance criteria specified.'),
    '',
    '## 9. Open Questions',
    listOrFallback(openQuestions, 'No open questions specified.'),
    ''
  ].join('\n');
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: PASS for both test files.

- [ ] **Step 8: Commit Task 1**

Run:

```bash
git add src/components/requirement-annotator/types.ts src/components/requirement-annotator/page-id.ts src/components/requirement-annotator/prd-generator.ts src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts
git commit -m "feat: add requirement annotation schema and PRD generator"
```

## Task 2: File Storage API Routes And Client Adapter

**Files:**
- Create: `src/app/api/prd-annotations/route.ts`
- Create: `src/app/api/prd-annotations/export/route.ts`
- Create: `src/components/requirement-annotator/storage.ts`
- Modify: `src/components/requirement-annotator/page-id.ts`

- [ ] **Step 1: Add file path helpers to page id utilities**

Modify `src/components/requirement-annotator/page-id.ts` to include:

```ts
export const PRD_ANNOTATIONS_DIR = 'prd-annotations';

export function getAnnotationJsonFileName(pageId: string) {
  return `${sanitizePageId(pageId)}.json`;
}

export function getPrdMarkdownFileName(pageId: string) {
  return `${sanitizePageId(pageId)}.prd.md`;
}
```

- [ ] **Step 2: Create the load/save API route**

Create `src/app/api/prd-annotations/route.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  createEmptyRequirementDocument,
  getAnnotationJsonFileName,
  getPageIdFromRoute,
  PRD_ANNOTATIONS_DIR,
  sanitizePageId
} from '@/components/requirement-annotator/page-id';
import type { RequirementPageDocument } from '@/components/requirement-annotator/types';

function getAnnotationPath(pageId: string) {
  const root = path.join(process.cwd(), PRD_ANNOTATIONS_DIR);
  return {
    root,
    filePath: path.join(root, getAnnotationJsonFileName(pageId))
  };
}

export async function GET(request: NextRequest) {
  const route = request.nextUrl.searchParams.get('route') || '/';
  const pageId = getPageIdFromRoute(route);
  const { filePath } = getAnnotationPath(pageId);

  try {
    const content = await readFile(filePath, 'utf8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json(createEmptyRequirementDocument(route, new Date().toISOString()));
  }
}

export async function POST(request: NextRequest) {
  const document = (await request.json()) as RequirementPageDocument;
  const pageId = sanitizePageId(document.pageId || getPageIdFromRoute(document.route || '/'));
  const { root, filePath } = getAnnotationPath(pageId);
  const payload: RequirementPageDocument = {
    ...document,
    pageId,
    updatedAt: new Date().toISOString()
  };

  await mkdir(root, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return NextResponse.json(payload);
}
```

- [ ] **Step 3: Create the PRD export API route**

Create `src/app/api/prd-annotations/export/route.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPrdMarkdownFileName,
  PRD_ANNOTATIONS_DIR,
  sanitizePageId
} from '@/components/requirement-annotator/page-id';
import { generatePrdMarkdown } from '@/components/requirement-annotator/prd-generator';
import type { RequirementPageDocument } from '@/components/requirement-annotator/types';

export async function POST(request: NextRequest) {
  const document = (await request.json()) as RequirementPageDocument;
  const pageId = sanitizePageId(document.pageId);
  const root = path.join(process.cwd(), PRD_ANNOTATIONS_DIR);
  const filePath = path.join(root, getPrdMarkdownFileName(pageId));
  const markdown = generatePrdMarkdown({ ...document, pageId });

  await mkdir(root, { recursive: true });
  await writeFile(filePath, markdown, 'utf8');

  return NextResponse.json({ pageId, markdown, fileName: getPrdMarkdownFileName(pageId) });
}
```

- [ ] **Step 4: Create the browser storage client**

Create `src/components/requirement-annotator/storage.ts`:

```ts
import type { RequirementPageDocument } from './types';

export async function loadRequirementDocument(route: string): Promise<RequirementPageDocument> {
  const response = await fetch(`/api/prd-annotations?route=${encodeURIComponent(route)}`);

  if (!response.ok) {
    throw new Error('Failed to load requirement annotations.');
  }

  return response.json();
}

export async function saveRequirementDocument(document: RequirementPageDocument): Promise<RequirementPageDocument> {
  const response = await fetch('/api/prd-annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error('Failed to save requirement annotations.');
  }

  return response.json();
}

export async function exportRequirementPrd(document: RequirementPageDocument): Promise<{ markdown: string; fileName: string }> {
  const response = await fetch('/api/prd-annotations/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error('Failed to export requirement PRD.');
  }

  return response.json();
}
```

- [ ] **Step 5: Run tests and lint relevant files**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS or existing unrelated warnings only. Do not ignore new errors from these files.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add src/app/api/prd-annotations/route.ts src/app/api/prd-annotations/export/route.ts src/components/requirement-annotator/page-id.ts src/components/requirement-annotator/storage.ts
git commit -m "feat: add file-backed requirement annotation storage"
```

## Task 3: Element Picker And Annotation Drawer

**Files:**
- Create: `src/components/requirement-annotator/element-picker.tsx`
- Create: `src/components/requirement-annotator/annotation-drawer.tsx`

- [ ] **Step 1: Implement the element picker**

Create `src/components/requirement-annotator/element-picker.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { RequirementElementType, RequirementTargetDraft } from './types';

function getElementType(element: HTMLElement): RequirementElementType {
  const role = element.getAttribute('role');
  const tagName = element.tagName.toLowerCase();

  if (element.dataset.prdType) {
    return element.dataset.prdType as RequirementElementType;
  }

  if (tagName === 'button' || role === 'button') {
    return 'button';
  }

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return 'field';
  }

  if (tagName === 'th' || tagName === 'td') {
    return 'table-column';
  }

  if (tagName === 'nav') {
    return 'navigation';
  }

  if (tagName === 'section') {
    return 'section';
  }

  return 'other';
}

function getSelector(element: HTMLElement) {
  if (element.dataset.prdId) {
    return `[data-prd-id="${element.dataset.prdId}"]`;
  }

  if (element.id) {
    return `#${element.id}`;
  }

  return element.tagName.toLowerCase();
}

function getLabel(element: HTMLElement) {
  return (
    element.dataset.prdLabel ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent?.trim().slice(0, 80) ||
    element.tagName.toLowerCase()
  );
}

export function ElementPicker({
  active,
  route,
  pageId,
  onPick
}: {
  active: boolean;
  route: string;
  pageId: string;
  onPick: (target: RequirementTargetDraft) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (!element || element.closest('[data-prd-tool="true"]')) {
        setRect(null);
        return;
      }

      setRect(element.getBoundingClientRect());
    }

    function handleClick(event: MouseEvent) {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (!element || element.closest('[data-prd-tool="true"]')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      onPick({
        route,
        pageId,
        selector: getSelector(element),
        prdId: element.dataset.prdId,
        label: getLabel(element),
        elementType: getElementType(element)
      });
    }

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [active, onPick, pageId, route]);

  if (!active || !rect) {
    return null;
  }

  return (
    <div
      data-prd-tool="true"
      className="pointer-events-none fixed z-[9998] rounded-md border-2 border-amber-400 bg-amber-300/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }}
    />
  );
}
```

- [ ] **Step 2: Implement the annotation drawer**

Create `src/components/requirement-annotator/annotation-drawer.tsx`:

```tsx
'use client';

import type { RequirementAnnotation } from './types';

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[]) {
  return value.join('\n');
}

export function AnnotationDrawer({
  annotations,
  selectedId,
  onSelect,
  onChange,
  onDelete
}: {
  annotations: RequirementAnnotation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onChange: (annotation: RequirementAnnotation) => void;
  onDelete: (id: string) => void;
}) {
  const selected = annotations.find((annotation) => annotation.id === selectedId) || annotations[0];

  return (
    <aside className="flex h-full min-h-0 w-[420px] flex-col border-l border-slate-200 bg-white" data-prd-tool="true">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-950">Requirement Annotations</h2>
        <p className="mt-1 text-xs text-slate-500">Select a page element to create or edit its requirement.</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr]">
        <div className="overflow-auto border-r border-slate-200 p-2">
          {annotations.map((annotation) => (
            <button
              key={annotation.id}
              className={`mb-2 w-full rounded-md px-3 py-2 text-left text-xs ${annotation.id === selected?.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}
              type="button"
              onClick={() => onSelect(annotation.id)}
            >
              <span className="block font-medium">{annotation.content.title}</span>
              <span className="block opacity-70">{annotation.target.elementType}</span>
            </button>
          ))}
        </div>

        <div className="overflow-auto p-4">
          {selected ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Title
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={selected.content.title}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, title: event.target.value } })}
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Description
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={selected.content.description}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, description: event.target.value } })}
                />
              </label>

              {(['businessRule', 'interactionRule', 'dataSource', 'validationRule', 'permissionRule'] as const).map((field) => (
                <label className="block text-xs font-medium text-slate-700" key={field}>
                  {field}
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={selected.content[field] || ''}
                    onChange={(event) => onChange({ ...selected, content: { ...selected.content, [field]: event.target.value } })}
                  />
                </label>
              ))}

              <label className="block text-xs font-medium text-slate-700">
                Acceptance Criteria
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={listToLines(selected.content.acceptanceCriteria)}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, acceptanceCriteria: linesToList(event.target.value) } })}
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Open Questions
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={listToLines(selected.content.openQuestions)}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, openQuestions: linesToList(event.target.value) } })}
                />
              </label>

              <button className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" type="button" onClick={() => onDelete(selected.id)}>
                Delete annotation
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No annotations yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: PASS or existing unrelated warnings only. Fix any new errors in these files.

- [ ] **Step 4: Commit Task 3**

Run:

```bash
git add src/components/requirement-annotator/element-picker.tsx src/components/requirement-annotator/annotation-drawer.tsx
git commit -m "feat: add requirement element picker and annotation editor"
```

## Task 4: Flow Builder And PRD Preview Panel

**Files:**
- Create: `src/components/requirement-annotator/flow-builder.tsx`
- Create: `src/components/requirement-annotator/prd-preview-panel.tsx`

- [ ] **Step 1: Implement the flow builder**

Create `src/components/requirement-annotator/flow-builder.tsx`:

```tsx
'use client';

import type { RequirementAnnotation, RequirementFlow } from './types';

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[]) {
  return value.join('\n');
}

function createFlow(pageId: string): RequirementFlow {
  return {
    id: `flow-${Date.now()}`,
    pageId,
    title: 'New business flow',
    actor: '',
    trigger: '',
    preconditions: [],
    steps: [
      {
        order: 1,
        action: '',
        expectedResult: ''
      }
    ],
    endState: '',
    openQuestions: []
  };
}

export function FlowBuilder({
  pageId,
  flows,
  annotations,
  onChange
}: {
  pageId: string;
  flows: RequirementFlow[];
  annotations: RequirementAnnotation[];
  onChange: (flows: RequirementFlow[]) => void;
}) {
  return (
    <section className="border-t border-slate-200 p-4" data-prd-tool="true">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Business Flows</h2>
          <p className="text-xs text-slate-500">Use structured steps for process-level requirements.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={() => onChange([...flows, createFlow(pageId)])}>
          Add Flow
        </button>
      </div>

      <div className="space-y-4">
        {flows.map((flow) => (
          <div className="rounded-lg border border-slate-200 p-3" key={flow.id}>
            <input
              className="mb-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium"
              value={flow.title}
              onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, title: event.target.value } : item)))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Actor"
                value={flow.actor || ''}
                onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, actor: event.target.value } : item)))}
              />
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Trigger"
                value={flow.trigger}
                onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, trigger: event.target.value } : item)))}
              />
            </div>
            <textarea
              className="mt-2 min-h-16 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Preconditions, one per line"
              value={listToLines(flow.preconditions)}
              onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, preconditions: linesToList(event.target.value) } : item)))}
            />
            <div className="mt-2 space-y-2">
              {flow.steps.map((step, index) => (
                <div className="rounded-md bg-slate-50 p-2" key={`${flow.id}-${step.order}`}>
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Action"
                      value={step.action}
                      onChange={(event) =>
                        onChange(
                          flows.map((item) =>
                            item.id === flow.id
                              ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, action: event.target.value } : flowStep)) }
                              : item
                          )
                        )
                      }
                    />
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Expected result"
                      value={step.expectedResult}
                      onChange={(event) =>
                        onChange(
                          flows.map((item) =>
                            item.id === flow.id
                              ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, expectedResult: event.target.value } : flowStep)) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <select
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={step.targetAnnotationId || ''}
                    onChange={(event) =>
                      onChange(
                        flows.map((item) =>
                          item.id === flow.id
                            ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, targetAnnotationId: event.target.value || undefined } : flowStep)) }
                            : item
                        )
                      )
                    }
                  >
                    <option value="">No linked UI annotation</option>
                    {annotations.map((annotation) => (
                      <option key={annotation.id} value={annotation.id}>
                        {annotation.content.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                type="button"
                onClick={() =>
                  onChange(
                    flows.map((item) =>
                      item.id === flow.id
                        ? { ...item, steps: [...item.steps, { order: item.steps.length + 1, action: '', expectedResult: '' }] }
                        : item
                    )
                  )
                }
              >
                Add Step
              </button>
              <button className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" type="button" onClick={() => onChange(flows.filter((item) => item.id !== flow.id))}>
                Delete Flow
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement the PRD preview panel**

Create `src/components/requirement-annotator/prd-preview-panel.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { exportRequirementPrd } from './storage';
import { generatePrdMarkdown } from './prd-generator';
import type { RequirementPageDocument } from './types';

export function PrdPreviewPanel({ document }: { document: RequirementPageDocument }) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [message, setMessage] = useState('');
  const markdown = useMemo(() => generatePrdMarkdown(document), [document]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setMessage('PRD copied.');
  }

  async function exportMarkdown() {
    const result = await exportRequirementPrd(document);
    setMessage(`Exported ${result.fileName}.`);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l border-slate-200 bg-slate-50" data-prd-tool="true">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">PRD Preview</h2>
          <p className="text-xs text-slate-500">Preview, copy, or export the generated Markdown.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={() => setMode(mode === 'preview' ? 'source' : 'preview')}>
            {mode === 'preview' ? 'Source' : 'Preview'}
          </button>
          <button className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={copyMarkdown}>
            Copy
          </button>
          <button className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={exportMarkdown}>
            Export
          </button>
        </div>
      </div>

      {message ? <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">{message}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {mode === 'source' ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 text-xs leading-6 text-slate-800">{markdown}</pre>
        ) : (
          <article className="prose prose-slate max-w-none rounded-lg bg-white p-4 text-sm text-slate-800">
            {markdown.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index}>{line.replace('# ', '')}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={index}>{line.replace('## ', '')}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={index}>{line.replace('### ', '')}</h3>;
              }
              if (line.startsWith('- ')) {
                return <p key={index}>• {line.replace('- ', '')}</p>;
              }
              return line ? <p key={index}>{line}</p> : <br key={index} />;
            })}
          </article>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run tests and lint**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS or existing unrelated warnings only. Fix any new errors in these files.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add src/components/requirement-annotator/flow-builder.tsx src/components/requirement-annotator/prd-preview-panel.tsx
git commit -m "feat: add requirement flow builder and PRD preview"
```

## Task 5: Global Runtime And Layout Integration

**Files:**
- Create: `src/components/requirement-annotator/requirement-annotator.tsx`
- Create: `src/components/requirement-annotator/index.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Implement the runtime component**

Create `src/components/requirement-annotator/requirement-annotator.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnnotationDrawer } from './annotation-drawer';
import { ElementPicker } from './element-picker';
import { FlowBuilder } from './flow-builder';
import { getPageIdFromRoute } from './page-id';
import { PrdPreviewPanel } from './prd-preview-panel';
import { loadRequirementDocument, saveRequirementDocument } from './storage';
import type { RequirementAnnotation, RequirementPageDocument, RequirementTargetDraft } from './types';

function createAnnotation(target: RequirementTargetDraft): RequirementAnnotation {
  const label = target.label || target.prdId || 'Selected element';

  return {
    id: `annotation-${Date.now()}`,
    pageId: target.pageId,
    route: target.route,
    target: {
      selector: target.selector,
      prdId: target.prdId,
      label: target.label,
      elementType: target.elementType
    },
    content: {
      title: label,
      description: '',
      acceptanceCriteria: [],
      openQuestions: []
    },
    source: 'manual',
    status: 'draft'
  };
}

export function RequirementAnnotator() {
  const pathname = usePathname();
  const route = pathname || '/';
  const pageId = useMemo(() => getPageIdFromRoute(route), [route]);
  const [open, setOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [document, setDocument] = useState<RequirementPageDocument | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    loadRequirementDocument(route)
      .then((loaded) => {
        if (active) {
          setDocument(loaded);
          setSelectedId(loaded.annotations[0]?.id);
        }
      })
      .catch(() => {
        if (active) {
          setMessage('Failed to load PRD annotations.');
        }
      });

    return () => {
      active = false;
    };
  }, [route]);

  const handlePick = useCallback((target: RequirementTargetDraft) => {
    setDocument((current) => {
      if (!current) {
        return current;
      }

      const existing = current.annotations.find((annotation) => annotation.target.prdId && annotation.target.prdId === target.prdId);
      if (existing) {
        setSelectedId(existing.id);
        setOpen(true);
        return current;
      }

      const annotation = createAnnotation(target);
      setSelectedId(annotation.id);
      setOpen(true);
      return { ...current, annotations: [...current.annotations, annotation] };
    });
  }, []);

  async function save() {
    if (!document) {
      return;
    }

    const saved = await saveRequirementDocument(document);
    setDocument(saved);
    setMessage('Saved PRD annotations.');
  }

  if (!document) {
    return null;
  }

  return (
    <>
      <ElementPicker active={pickMode} pageId={pageId} route={route} onPick={handlePick} />

      <div className="fixed bottom-5 right-5 z-[9999] flex gap-2" data-prd-tool="true">
        <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl" type="button" onClick={() => setOpen((value) => !value)}>
          Annotate / PRD
        </button>
      </div>

      {open ? (
        <div className="fixed inset-y-0 right-0 z-[9999] flex w-[min(1180px,calc(100vw-32px))] overflow-hidden rounded-l-2xl border-l border-slate-200 bg-white shadow-2xl" data-prd-tool="true">
          <div className="flex w-[760px] min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h1 className="text-sm font-semibold text-slate-950">{document.title}</h1>
                <p className="text-xs text-slate-500">{route}</p>
              </div>
              <div className="flex gap-2">
                <button className={`rounded-md px-3 py-2 text-xs font-medium ${pickMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`} type="button" onClick={() => setPickMode((value) => !value)}>
                  {pickMode ? 'Picking On' : 'Pick Element'}
                </button>
                <button className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={save}>
                  Save
                </button>
                <button className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            {message ? <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">{message}</div> : null}
            <div className="min-h-0 flex-1 overflow-hidden">
              <AnnotationDrawer
                annotations={document.annotations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={(annotation) => setDocument({ ...document, annotations: document.annotations.map((item) => (item.id === annotation.id ? annotation : item)) })}
                onDelete={(id) => setDocument({ ...document, annotations: document.annotations.filter((annotation) => annotation.id !== id) })}
              />
            </div>
            <FlowBuilder pageId={pageId} flows={document.flows} annotations={document.annotations} onChange={(flows) => setDocument({ ...document, flows })} />
          </div>
          <PrdPreviewPanel document={document} />
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Export the runtime component**

Create `src/components/requirement-annotator/index.ts`:

```ts
export { RequirementAnnotator } from './requirement-annotator';
export { generatePrdMarkdown } from './prd-generator';
export type { RequirementAnnotation, RequirementFlow, RequirementPageDocument } from './types';
```

- [ ] **Step 3: Mount the annotator in the root layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { RequirementAnnotator } from '@/components/requirement-annotator';
import { ShellStateProvider } from '@/components/providers/shell-state-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP Console',
  description: 'Stripe-style ERP admin framework'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ShellStateProvider>{children}</ShellStateProvider>
        <RequirementAnnotator />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run tests and build checks**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS or existing unrelated warnings only. Fix any new errors.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add src/components/requirement-annotator/requirement-annotator.tsx src/components/requirement-annotator/index.ts src/app/layout.tsx
git commit -m "feat: mount requirement annotator globally"
```

## Task 6: Manual Browser Verification And Polish

**Files:**
- Modify only files under `src/components/requirement-annotator/` and `src/app/api/prd-annotations/` if issues are found.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

Expected: Next.js dev server starts on the default local port.

- [ ] **Step 2: Verify annotation mode in the browser**

Open `/dashboard/outbound`.

Expected:
- `Annotate / PRD` appears at the bottom right.
- Opening it shows annotation editor, flow builder, and PRD preview.
- Clicking `Pick Element` lets the user hover and click page elements.
- A clicked page element creates a draft annotation.

- [ ] **Step 3: Verify editing and save**

Edit one annotation with:

```txt
Title: Status Field
Description: Shows the outbound order status.
Acceptance Criteria: Given a shipped order, then the status shows Shipped.
Open Questions: Should cancelled orders be hidden by default?
```

Click `Save`.

Expected:
- The UI shows a saved message.
- `prd-annotations/dashboard-outbound.json` exists.
- The JSON contains the annotation.

- [ ] **Step 4: Verify flow editing**

Add one flow:

```txt
Title: Ship outbound order
Actor: Warehouse Operator
Trigger: User ships a ready order
Precondition: Order is ready to ship
Step Action: Review the order status
Expected Result: User confirms the order can ship
```

Expected:
- The flow appears in the PRD preview under Business Flows.
- Linking the step to the annotation shows the annotation title in generated Markdown.

- [ ] **Step 5: Verify copy and export**

Click `Copy`.

Expected: Clipboard contains Markdown starting with `# Page PRD:`.

Click `Export`.

Expected:
- The UI reports the exported file name.
- `prd-annotations/dashboard-outbound.prd.md` exists.
- The Markdown contains Page Goal, Fields And Rules, Business Flows, Acceptance Criteria, and Open Questions sections.

- [ ] **Step 6: Run final checks**

Run: `pnpm test src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/page-id.test.ts`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 7: Commit Task 6 if polish changes were needed**

If browser verification required fixes, run:

```bash
git add src/components/requirement-annotator src/app/api/prd-annotations src/app/layout.tsx
git commit -m "fix: polish requirement annotator browser workflow"
```

If no changes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers global mounting, element picking, annotation editing, flow editing, PRD preview/source, copy/export, file storage, stable `data-prd-id` binding, tests, and manual browser verification.
- Placeholder scan: No task uses TBD, TODO, unnamed validation, or unspecified tests.
- Type consistency: `RequirementPageDocument`, `RequirementAnnotation`, `RequirementFlow`, `RequirementTargetDraft`, `generatePrdMarkdown`, `getPageIdFromRoute`, and storage function names are consistent across tasks.
