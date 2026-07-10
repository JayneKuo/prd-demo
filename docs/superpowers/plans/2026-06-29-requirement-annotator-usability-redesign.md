# Requirement Annotator Usability Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the requirement annotator into a structure-first PRD workspace with editable project structure, on-demand preview, and stable tree-shaped saved data.

**Architecture:** Add a schema v2 tree document model while preserving migration from existing flat page documents. Replace the current annotation drawer workflow with an editable structure tree plus selected-node editor, and keep page picking as an attachment helper for the active node. Generate PRD Markdown from tree order and open preview only when requested.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, existing file-backed API routes, existing Vitest-style component utility tests.

---

## File Structure

- Modify `src/components/requirement-annotator/types.ts`: add tree node/document types and keep v1 types for migration compatibility.
- Create `src/components/requirement-annotator/tree-document.ts`: pure helpers for creating, traversing, mutating, detecting, and migrating tree documents.
- Create `src/components/requirement-annotator/tree-document.test.ts`: unit coverage for migration, add/delete/rename/reorder, target attachment, and detection merge.
- Modify `src/components/requirement-annotator/prd-generator.ts`: generate Markdown from schema v2 tree documents and keep v1 support through migration.
- Modify `src/components/requirement-annotator/prd-generator.test.ts`: assert tree order and migrated v1 output.
- Modify `src/components/requirement-annotator/storage.ts`: use project document types and API payloads.
- Modify `src/app/api/prd-annotations/route.ts`: load old or new data, return schema v2 documents, and save schema v2 files.
- Modify `src/app/api/prd-annotations/export/route.ts`: export schema v2 documents.
- Create `src/components/requirement-annotator/project-structure-tree.tsx`: editable left tree.
- Create `src/components/requirement-annotator/node-editor.tsx`: selected-node editor.
- Modify `src/components/requirement-annotator/prd-preview-panel.tsx`: accept schema v2 document and remain conditional.
- Modify `src/components/requirement-annotator/requirement-annotator.tsx`: replace old drawer workflow with organize/annotate/preview workspace.
- Keep `src/components/requirement-annotator/annotation-drawer.tsx` and `project-tree-nav.tsx` in place unless no imports remain after implementation.

---

### Task 1: Tree Document Model And Helpers

**Files:**
- Modify: `src/components/requirement-annotator/types.ts`
- Create: `src/components/requirement-annotator/tree-document.ts`
- Test: `src/components/requirement-annotator/tree-document.test.ts`

- [ ] **Step 1: Add schema v2 types**

Add these exports to `types.ts` after the existing v1 exports:

```ts
export type RequirementTreeNodeType = 'module' | 'page' | 'section' | 'field' | 'action' | 'flow' | 'other';

export type RequirementNodeContent = {
  description: string;
  goal?: string;
  actors: string[];
  businessRule?: string;
  interactionRule?: string;
  dataSource?: string;
  validationRule?: string;
  permissionRule?: string;
  acceptanceCriteria: string[];
  openQuestions: string[];
  status: RequirementStatus;
  flow?: {
    actor?: string;
    trigger: string;
    preconditions: string[];
    steps: RequirementFlowStep[];
    endState: string;
  };
};

export type RequirementTreeNode = {
  id: string;
  type: RequirementTreeNodeType;
  title: string;
  route?: string;
  pageId?: string;
  target?: RequirementTarget;
  source?: RequirementSource;
  order: number;
  content: RequirementNodeContent;
  children: RequirementTreeNode[];
};

export type RequirementProjectDocument = {
  schemaVersion: 2;
  projectName: string;
  pageId: string;
  route: string;
  rootNodes: RequirementTreeNode[];
  updatedAt: string;
};

export type RequirementDocument = RequirementPageDocument | RequirementProjectDocument;
```

- [ ] **Step 2: Write failing tree helper tests**

Create `tree-document.test.ts` with tests for creating an empty document, migrating a flat document, adding a child, deleting a node, renaming a node, reordering siblings, attaching a target, and creating detection suggestions.

```ts
import { describe, expect, it } from 'vitest';
import {
  addTreeNode,
  attachTargetToNode,
  createEmptyProjectDocument,
  createNode,
  deleteTreeNode,
  detectStructureSuggestions,
  isProjectDocument,
  migrateToProjectDocument,
  renameTreeNode,
  reorderTreeNode
} from './tree-document';
import type { RequirementPageDocument, RequirementTargetDraft } from './types';

const flatDocument: RequirementPageDocument = {
  pageId: 'dashboard-outbound',
  route: '/dashboard/outbound',
  title: 'Outbound',
  goal: 'Manage outbound tasks.',
  actors: ['Planner'],
  updatedAt: '2026-06-29T00:00:00.000Z',
  flows: [
    {
      id: 'flow-submit',
      pageId: 'dashboard-outbound',
      title: 'Submit outbound task',
      actor: 'Planner',
      trigger: 'Planner clicks submit.',
      preconditions: ['Draft exists'],
      steps: [{ order: 0, action: 'Click submit', expectedResult: 'Task is submitted' }],
      endState: 'Submitted task exists.',
      openQuestions: ['Who approves?']
    }
  ],
  annotations: [
    {
      id: 'annotation-name',
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      group: '筛选区',
      target: { elementType: 'field', label: 'Name' },
      content: {
        title: 'Name',
        description: 'Filter by name.',
        acceptanceCriteria: ['Name filters results.'],
        openQuestions: []
      },
      source: 'manual',
      status: 'draft'
    }
  ]
};

describe('tree document helpers', () => {
  it('creates an empty schema v2 project document', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');

    expect(document.schemaVersion).toBe(2);
    expect(document.pageId).toBe('dashboard-outbound');
    expect(document.rootNodes[0]?.type).toBe('module');
    expect(document.rootNodes[0]?.children[0]?.type).toBe('page');
  });

  it('migrates flat annotations and flows into route tree nodes', () => {
    const document = migrateToProjectDocument(flatDocument);

    expect(isProjectDocument(document)).toBe(true);
    expect(document.rootNodes[0]?.title).toBe('Outbound');
    expect(document.rootNodes[0]?.children[0]?.children.map((node) => node.title)).toEqual(['Name', 'Submit outbound task']);
  });

  it('adds, renames, reorders, and deletes tree nodes immutably', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const pageId = document.rootNodes[0]!.children[0]!.id;
    const child = createNode({ type: 'field', title: 'Status', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const added = addTreeNode(document, pageId, child);
    const renamed = renameTreeNode(added, child.id, 'Task Status');
    const reordered = reorderTreeNode(renamed, child.id, 'up');
    const deleted = deleteTreeNode(reordered, child.id);

    expect(added.rootNodes[0]!.children[0]!.children.at(-1)?.title).toBe('Status');
    expect(renamed.rootNodes[0]!.children[0]!.children.at(-1)?.title).toBe('Task Status');
    expect(deleted.rootNodes[0]!.children[0]!.children.some((node) => node.id === child.id)).toBe(false);
  });

  it('attaches a picked target to the selected node', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const pageNode = document.rootNodes[0]!.children[0]!;
    const target: RequirementTargetDraft = {
      route: '/dashboard/outbound',
      pageId: 'dashboard-outbound',
      elementType: 'button',
      label: 'Create',
      selector: 'button'
    };

    const updated = attachTargetToNode(document, pageNode.id, target);

    expect(updated.rootNodes[0]!.children[0]!.target?.label).toBe('Create');
    expect(updated.rootNodes[0]!.children[0]!.type).toBe('action');
  });

  it('detects structure suggestions without mutating the document', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const suggestions = detectStructureSuggestions(document, [
      { type: 'page', title: 'Outbound List', route: '/dashboard/outbound' },
      { type: 'action', title: 'Create', route: '/dashboard/outbound' }
    ]);

    expect(suggestions.map((node) => node.title)).toEqual(['Outbound List', 'Create']);
    expect(document.rootNodes[0]!.children[0]!.title).not.toBe('Outbound List');
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm vitest src/components/requirement-annotator/tree-document.test.ts --run`

Expected: FAIL because `tree-document.ts` does not exist or exports are missing.

- [ ] **Step 4: Implement tree helpers**

Create `tree-document.ts` with pure helper implementations:

```ts
import { getPageIdFromRoute } from './page-id';
import type {
  ProjectMenuItem,
  RequirementAnnotation,
  RequirementDocument,
  RequirementElementType,
  RequirementFlow,
  RequirementNodeContent,
  RequirementPageDocument,
  RequirementProjectDocument,
  RequirementTargetDraft,
  RequirementTreeNode,
  RequirementTreeNodeType
} from './types';

const elementTypeToNodeType: Record<RequirementElementType, RequirementTreeNodeType> = {
  navigation: 'module',
  section: 'section',
  card: 'section',
  field: 'field',
  filter: 'field',
  'table-column': 'field',
  button: 'action',
  other: 'other'
};

function titleFromRoute(route: string) {
  const pageId = getPageIdFromRoute(route);
  return pageId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slug(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'node';
}

export function createNode({
  type,
  title,
  route,
  pageId,
  target,
  content,
  source,
  children = []
}: {
  type: RequirementTreeNodeType;
  title: string;
  route?: string;
  pageId?: string;
  target?: RequirementTreeNode['target'];
  content?: Partial<RequirementNodeContent>;
  source?: RequirementTreeNode['source'];
  children?: RequirementTreeNode[];
}): RequirementTreeNode {
  return {
    id: `${type}-${slug(route || pageId || title)}-${slug(title)}-${Date.now().toString(36)}`,
    type,
    title,
    route,
    pageId,
    target,
    source,
    order: 0,
    content: {
      description: '',
      actors: [],
      acceptanceCriteria: [],
      openQuestions: [],
      status: 'draft',
      ...content
    },
    children: children.map((child, index) => ({ ...child, order: index }))
  };
}

export function isProjectDocument(document: RequirementDocument): document is RequirementProjectDocument {
  return 'schemaVersion' in document && document.schemaVersion === 2;
}

export function createEmptyProjectDocument(route: string, updatedAt: string): RequirementProjectDocument {
  const pageId = getPageIdFromRoute(route);
  const title = titleFromRoute(route);
  const page = createNode({ type: 'page', title, route, pageId });
  const module = createNode({ type: 'module', title, route, pageId, children: [page] });

  return {
    schemaVersion: 2,
    projectName: title,
    pageId,
    route,
    rootNodes: [module],
    updatedAt
  };
}

function contentFromAnnotation(annotation: RequirementAnnotation): RequirementNodeContent {
  return {
    description: annotation.content.description,
    actors: [],
    businessRule: annotation.content.businessRule,
    interactionRule: annotation.content.interactionRule,
    dataSource: annotation.content.dataSource,
    validationRule: annotation.content.validationRule,
    permissionRule: annotation.content.permissionRule,
    acceptanceCriteria: annotation.content.acceptanceCriteria,
    openQuestions: annotation.content.openQuestions,
    status: annotation.status
  };
}

function nodeFromAnnotation(annotation: RequirementAnnotation, index: number): RequirementTreeNode {
  return {
    ...createNode({
      type: elementTypeToNodeType[annotation.target.elementType] || 'other',
      title: annotation.content.title,
      route: annotation.route,
      pageId: annotation.pageId,
      target: annotation.target,
      content: contentFromAnnotation(annotation),
      source: annotation.source
    }),
    id: annotation.id,
    order: annotation.order ?? index
  };
}

function nodeFromFlow(flow: RequirementFlow, index: number, route: string): RequirementTreeNode {
  return {
    ...createNode({
      type: 'flow',
      title: flow.title,
      route,
      pageId: flow.pageId,
      content: {
        description: '',
        actors: flow.actor ? [flow.actor] : [],
        openQuestions: flow.openQuestions,
        status: 'draft',
        flow: {
          actor: flow.actor,
          trigger: flow.trigger,
          preconditions: flow.preconditions,
          steps: flow.steps,
          endState: flow.endState
        }
      }
    }),
    id: flow.id,
    order: index
  };
}

export function migrateToProjectDocument(document: RequirementDocument): RequirementProjectDocument {
  if (isProjectDocument(document)) return document;

  const page = createNode({
    type: 'page',
    title: document.title,
    route: document.route,
    pageId: document.pageId,
    content: { goal: document.goal, actors: document.actors }
  });
  page.children = [
    ...document.annotations.map(nodeFromAnnotation),
    ...document.flows.map((flow, index) => nodeFromFlow(flow, document.annotations.length + index, document.route))
  ].map((node, index) => ({ ...node, order: index }));

  const module = createNode({ type: 'module', title: document.title, route: document.route, pageId: document.pageId, children: [page] });

  return {
    schemaVersion: 2,
    projectName: document.title,
    pageId: document.pageId,
    route: document.route,
    rootNodes: [module],
    updatedAt: document.updatedAt
  };
}

function mapNodes(nodes: RequirementTreeNode[], mapper: (node: RequirementTreeNode) => RequirementTreeNode): RequirementTreeNode[] {
  return nodes.map((node) => mapper({ ...node, children: mapNodes(node.children, mapper) }));
}

function updateChildren(document: RequirementProjectDocument, parentId: string, updater: (children: RequirementTreeNode[]) => RequirementTreeNode[]) {
  if (parentId === 'root') {
    return { ...document, rootNodes: updater(document.rootNodes).map((node, index) => ({ ...node, order: index })) };
  }

  return {
    ...document,
    rootNodes: mapNodes(document.rootNodes, (node) =>
      node.id === parentId ? { ...node, children: updater(node.children).map((child, index) => ({ ...child, order: index })) } : node
    )
  };
}

export function addTreeNode(document: RequirementProjectDocument, parentId: string, child: RequirementTreeNode): RequirementProjectDocument {
  return updateChildren(document, parentId, (children) => [...children, { ...child, order: children.length }]);
}

export function deleteTreeNode(document: RequirementProjectDocument, nodeId: string): RequirementProjectDocument {
  const remove = (nodes: RequirementTreeNode[]): RequirementTreeNode[] =>
    nodes.filter((node) => node.id !== nodeId).map((node) => ({ ...node, children: remove(node.children) })).map((node, index) => ({ ...node, order: index }));

  return { ...document, rootNodes: remove(document.rootNodes) };
}

export function renameTreeNode(document: RequirementProjectDocument, nodeId: string, title: string): RequirementProjectDocument {
  return { ...document, rootNodes: mapNodes(document.rootNodes, (node) => (node.id === nodeId ? { ...node, title } : node)) };
}

export function reorderTreeNode(document: RequirementProjectDocument, nodeId: string, direction: 'up' | 'down'): RequirementProjectDocument {
  return {
    ...document,
    rootNodes: mapNodes(document.rootNodes, (node) => {
      const index = node.children.findIndex((child) => child.id === nodeId);
      if (index === -1) return node;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= node.children.length) return node;
      const children = [...node.children];
      const [child] = children.splice(index, 1);
      children.splice(nextIndex, 0, child!);
      return { ...node, children: children.map((childNode, childIndex) => ({ ...childNode, order: childIndex })) };
    })
  };
}

export function attachTargetToNode(document: RequirementProjectDocument, nodeId: string, target: RequirementTargetDraft): RequirementProjectDocument {
  return {
    ...document,
    rootNodes: mapNodes(document.rootNodes, (node) =>
      node.id === nodeId
        ? {
            ...node,
            type: elementTypeToNodeType[target.elementType] || node.type,
            title: node.title || target.label || 'Selected element',
            route: target.route,
            pageId: target.pageId,
            target: {
              selector: target.selector,
              prdId: target.prdId,
              label: target.label,
              elementType: target.elementType
            }
          }
        : node
    )
  };
}

export type StructureSuggestionInput = {
  type: RequirementTreeNodeType;
  title: string;
  route?: string;
  pageId?: string;
  target?: RequirementTreeNode['target'];
};

export function detectStructureSuggestions(document: RequirementProjectDocument, inputs: StructureSuggestionInput[]): RequirementTreeNode[] {
  const existing = new Set<string>();
  const visit = (node: RequirementTreeNode) => {
    existing.add(`${node.type}:${node.route || ''}:${node.title}`.toLowerCase());
    node.children.forEach(visit);
  };
  document.rootNodes.forEach(visit);

  return inputs.flatMap((input) => {
    const key = `${input.type}:${input.route || ''}:${input.title}`.toLowerCase();
    if (existing.has(key)) return [];
    return [createNode({ ...input, pageId: input.pageId || (input.route ? getPageIdFromRoute(input.route) : document.pageId) })];
  });
}

export function getMenuStructureInputs(menuItems: ProjectMenuItem[], route: string): StructureSuggestionInput[] {
  return menuItems.map((item) => ({ type: item.kind === 'group' ? 'module' : 'page', title: item.label, route: item.route || route }));
}
```

- [ ] **Step 5: Run tree helper tests**

Run: `pnpm vitest src/components/requirement-annotator/tree-document.test.ts --run`

Expected: PASS.

---

### Task 2: PRD Generation From Tree Documents

**Files:**
- Modify: `src/components/requirement-annotator/prd-generator.ts`
- Modify: `src/components/requirement-annotator/prd-generator.test.ts`

- [ ] **Step 1: Add failing generator tests**

Update `prd-generator.test.ts` to assert tree order and v1 migration support:

```ts
import { describe, expect, it } from 'vitest';
import { createNode } from './tree-document';
import { generatePrdMarkdown } from './prd-generator';
import type { RequirementPageDocument, RequirementProjectDocument } from './types';

describe('generatePrdMarkdown', () => {
  it('renders schema v2 tree documents in tree order', () => {
    const field = createNode({
      type: 'field',
      title: 'Customer Name',
      content: {
        description: 'Customer name filter.',
        acceptanceCriteria: ['Filtering by customer name narrows results.'],
        openQuestions: []
      }
    });
    const action = createNode({
      type: 'action',
      title: 'Create Order',
      content: {
        description: 'Create a new outbound order.',
        acceptanceCriteria: ['Clicking create opens the order form.'],
        openQuestions: ['Who can create orders?']
      }
    });
    const page = createNode({ type: 'page', title: 'Outbound List', route: '/dashboard/outbound', children: [field, action] });
    const module = createNode({ type: 'module', title: 'Outbound', children: [page] });
    const document: RequirementProjectDocument = {
      schemaVersion: 2,
      projectName: 'Outbound',
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      rootNodes: [module],
      updatedAt: '2026-06-29T00:00:00.000Z'
    };

    const markdown = generatePrdMarkdown(document);

    expect(markdown).toContain('# PRD：Outbound');
    expect(markdown.indexOf('### Customer Name')).toBeLessThan(markdown.indexOf('### Create Order'));
    expect(markdown).toContain('- Filtering by customer name narrows results.');
    expect(markdown).toContain('- Who can create orders?');
  });

  it('migrates flat page documents before generating Markdown', () => {
    const document: RequirementPageDocument = {
      pageId: 'dashboard-outbound',
      route: '/dashboard/outbound',
      title: 'Outbound',
      actors: ['Planner'],
      annotations: [],
      flows: [],
      updatedAt: '2026-06-29T00:00:00.000Z'
    };

    expect(generatePrdMarkdown(document)).toContain('# PRD：Outbound');
  });
});
```

- [ ] **Step 2: Run generator tests to verify failure**

Run: `pnpm vitest src/components/requirement-annotator/prd-generator.test.ts --run`

Expected: FAIL because generator still expects flat page documents.

- [ ] **Step 3: Implement tree-based Markdown generation**

Replace `generatePrdMarkdown` internals so it accepts `RequirementDocument`, migrates through `migrateToProjectDocument`, recursively renders tree nodes, collects acceptance criteria and open questions from nodes, and renders flow nodes from `content.flow`.

- [ ] **Step 4: Run generator tests**

Run: `pnpm vitest src/components/requirement-annotator/prd-generator.test.ts src/components/requirement-annotator/tree-document.test.ts --run`

Expected: PASS.

---

### Task 3: Storage And API Schema V2 Migration

**Files:**
- Modify: `src/components/requirement-annotator/storage.ts`
- Modify: `src/app/api/prd-annotations/route.ts`
- Modify: `src/app/api/prd-annotations/export/route.ts`

- [ ] **Step 1: Update client storage types**

Change `loadRequirementDocument`, `saveRequirementDocument`, and `exportRequirementPrd` to use `RequirementProjectDocument` for returns and request payloads.

- [ ] **Step 2: Update GET route migration**

In `route.ts`, parse file content as `RequirementDocument`, return `migrateToProjectDocument(parsed)`, and use `createEmptyProjectDocument(route, new Date().toISOString())` when no file exists.

- [ ] **Step 3: Update POST route save behavior**

In `route.ts`, parse request as `RequirementDocument`, migrate to schema v2, sanitize `pageId`, update `updatedAt`, and write the schema v2 payload.

- [ ] **Step 4: Update export route**

In `export/route.ts`, parse request as `RequirementDocument`, migrate before `generatePrdMarkdown`, and derive `pageId` from migrated document.

- [ ] **Step 5: Run type/lint check for changed API code**

Run: `pnpm lint`

Expected: PASS or only pre-existing warnings unrelated to these files.

---

### Task 4: Editable Structure Tree UI

**Files:**
- Create: `src/components/requirement-annotator/project-structure-tree.tsx`
- Modify: `src/components/requirement-annotator/requirement-annotator.tsx`

- [ ] **Step 1: Create `ProjectStructureTree` component**

Build a client component that renders `RequirementTreeNode[]` recursively. Props:

```ts
{
  nodes: RequirementTreeNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, type: RequirementTreeNodeType) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}
```

UI requirements:

- Inline text input for the selected node title.
- Buttons for child types: Page, Section, Field, Action, Flow.
- Delete button with confirmation.
- Up/down buttons for ordering.
- Clear selected styling.

- [ ] **Step 2: Wire tree actions in `RequirementAnnotator`**

Use `addTreeNode`, `createNode`, `deleteTreeNode`, `renameTreeNode`, and `reorderTreeNode` to update document state. Default selected node should be the current page node if available, otherwise the first root node.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: PASS or only unrelated existing warnings.

---

### Task 5: Selected Node Editor

**Files:**
- Create: `src/components/requirement-annotator/node-editor.tsx`
- Modify: `src/components/requirement-annotator/tree-document.ts`
- Modify: `src/components/requirement-annotator/requirement-annotator.tsx`

- [ ] **Step 1: Add `updateTreeNode` helper**

Add a pure helper to `tree-document.ts`:

```ts
export function updateTreeNode(
  document: RequirementProjectDocument,
  nodeId: string,
  updater: (node: RequirementTreeNode) => RequirementTreeNode
): RequirementProjectDocument {
  return { ...document, rootNodes: mapNodes(document.rootNodes, (node) => (node.id === nodeId ? updater(node) : node)) };
}
```

- [ ] **Step 2: Create `NodeEditor` component**

Props:

```ts
{
  node?: RequirementTreeNode;
  onChange: (node: RequirementTreeNode) => void;
}
```

Render:

- Empty state when no node is selected.
- Title, description, status, open questions, and acceptance criteria for all editable nodes.
- Goal and actors for module/page nodes.
- Business, interaction, data source, validation, and permission fields for section/field/action/other nodes.
- Flow fields for flow nodes.

Use newline textareas for list fields and convert with local `linesToList`/`listToLines` helpers.

- [ ] **Step 3: Wire editor in `RequirementAnnotator`**

Find selected node from the document tree. Pass updates through `updateTreeNode`.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS or only unrelated existing warnings.

---

### Task 6: Annotate Mode Attachment And Detection Suggestions

**Files:**
- Modify: `src/components/requirement-annotator/requirement-annotator.tsx`
- Modify: `src/components/requirement-annotator/tree-document.ts`

- [ ] **Step 1: Add DOM detection helper**

Add an exported helper or local function that collects visible elements from `main button, main input, main textarea, main select, main th, main section, aside nav`, converts them to `StructureSuggestionInput`, and filters `data-prd-tool` elements.

- [ ] **Step 2: Implement `Detect structure` action**

In Organize mode, add a button that creates suggestions using menu items plus DOM elements, merges them under the selected node if one exists, otherwise under the first page node. Show a message with the number of merged suggestions.

- [ ] **Step 3: Change element picking behavior**

In `handlePick`, if a selected node exists, call `attachTargetToNode`. If no node exists, create an action/field child under the current page node. Set a message explaining where the target was attached.

- [ ] **Step 4: Run relevant tests and lint**

Run: `pnpm vitest src/components/requirement-annotator/tree-document.test.ts --run && pnpm lint`

Expected: tests PASS and lint PASS or only unrelated existing warnings.

---

### Task 7: On-Demand Preview Workspace

**Files:**
- Modify: `src/components/requirement-annotator/prd-preview-panel.tsx`
- Modify: `src/components/requirement-annotator/requirement-annotator.tsx`

- [ ] **Step 1: Update preview props**

Change `PrdPreviewPanel` to accept `RequirementProjectDocument` and optional `onClose`.

- [ ] **Step 2: Hide preview by default**

In `RequirementAnnotator`, render preview only when workspace mode is `preview`. Use a two-column layout for organize/annotate modes and a right panel or overlay for preview mode.

- [ ] **Step 3: Simplify mode controls**

Expose only `Organize`, `Annotate`, and `Preview PRD` controls in the workspace header. Keep the floating entry and close button.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS or only unrelated existing warnings.

---

### Task 8: Browser Verification

**Files:**
- No code files expected unless verification finds issues.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

Expected: Next.js starts on localhost and reports ready.

- [ ] **Step 2: Open the app in a browser**

Navigate to the local app. Use the requirement annotator floating entry.

- [ ] **Step 3: Verify organize flow**

Expected behavior:

- Workspace opens without PRD preview visible.
- Structure tree is visible and editable.
- Adding, renaming, deleting, and moving a node updates the tree.
- Detect structure adds useful nodes and does not duplicate obvious existing nodes.

- [ ] **Step 4: Verify annotate flow**

Expected behavior:

- Annotate mode highlights page elements.
- Clicking an element attaches it to the active node.
- The selected node editor shows target metadata or title update.

- [ ] **Step 5: Verify persistence and PRD flow**

Expected behavior:

- Save writes a readable schema v2 JSON file under `prd-annotations/`.
- Reopening the workspace loads the same tree.
- Preview opens only after clicking `Preview PRD`.
- Copy and export produce Markdown in tree order.

---

## Self-Review

- Spec coverage: tree-first workspace, manual editing, automatic detection, attach-to-active-node picking, on-demand preview, schema v2 save, migration, and PRD generation are covered by Tasks 1-8.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain; steps either include exact code snippets, exact expected behavior, or exact commands.
- Type consistency: plan uses `RequirementProjectDocument`, `RequirementTreeNode`, `RequirementTreeNodeType`, `RequirementDocument`, and `RequirementNodeContent` consistently across model, storage, UI, and generator tasks.
