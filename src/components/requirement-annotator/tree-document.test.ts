import { describe, expect, it } from 'vitest';
import {
  addTreeNode,
  attachTargetToNode,
  createEmptyProjectDocument,
  createNode,
  deleteTreeNode,
  detectStructureSuggestions,
  ensureDocumentRoute,
  ensureMenuRoutePage,
  clearProjectStructure,
  clearPageAnnotations,
  getPageRouteOptions,
  getProjectStructureNodes,
  getSelectedAnnotationPage,
  getStructureChildParentId,
  getStructureSelectionId,
  mergeMenuTree,
  normalizeProjectDocument,
  isAnnotationGroupNode,
  isProjectDocument,
  resolveAnnotationParentPage,
  migrateToProjectDocument,
  moveTreeNodeBefore,
  moveTreeNodeInto,
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
    expect(document.projectName).toBe('项目 PRD');
    expect(document.rootNodes).toEqual([]);
  });

  it('migrates flat annotations and flows into route tree nodes', () => {
    const document = migrateToProjectDocument(flatDocument);

    expect(isProjectDocument(document)).toBe(true);
    expect(document.rootNodes[0]?.title).toBe('Outbound');
    expect(document.rootNodes[0]?.children[0]?.children.map((node) => node.title)).toEqual(['Name', 'Submit outbound task']);
  });

  it('migrates legacy rule fields into editable rule rows', () => {
    const document = migrateToProjectDocument({
      ...flatDocument,
      annotations: [
        {
          ...flatDocument.annotations[0]!,
          content: {
            ...flatDocument.annotations[0]!.content,
            businessRule: 'Only confirmed orders can be exported.',
            validationRule: 'Name cannot exceed 50 characters.'
          }
        }
      ]
    });

    const annotation = document.rootNodes[0]?.children[0]?.children[0];

    expect(annotation?.content.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'business', description: 'Only confirmed orders can be exported.' }),
        expect.objectContaining({ type: 'validation', description: 'Name cannot exceed 50 characters.' })
      ])
    );
  });

  it('adds, renames, reorders, and deletes tree nodes immutably', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const page = createNode({ type: 'page', title: 'Outbound', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const withPage = addTreeNode(document, 'root', page);
    const child = createNode({ type: 'field', title: 'Status', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const added = addTreeNode(withPage, page.id, child);
    const renamed = renameTreeNode(added, child.id, 'Task Status');
    const reordered = reorderTreeNode(renamed, child.id, 'up');
    const deleted = deleteTreeNode(reordered, child.id);

    expect(added.rootNodes[0]!.children.at(-1)?.title).toBe('Status');
    expect(renamed.rootNodes[0]!.children.at(-1)?.title).toBe('Task Status');
    expect(deleted.rootNodes[0]!.children.some((node) => node.id === child.id)).toBe(false);
  });

  it('moves a node into another node as a child', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const page = createNode({ type: 'page', title: 'Outbound', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const withPage = addTreeNode(document, 'root', page);
    const section = createNode({ type: 'section', title: 'Filter Area', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const field = createNode({ type: 'field', title: 'Status', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const withNodes = addTreeNode(addTreeNode(withPage, page.id, section), page.id, field);

    const moved = moveTreeNodeInto(withNodes, field.id, section.id);

    expect(moved.rootNodes[0]!.children.find((node) => node.id === field.id)).toBeUndefined();
    expect(moved.rootNodes[0]!.children.find((node) => node.id === section.id)?.children[0]?.title).toBe('Status');
  });

  it('moves root nodes before other root nodes', () => {
    const document = createEmptyProjectDocument('/dashboard/orders', '2026-06-29T00:00:00.000Z');
    const sales = createNode({ type: 'module', title: 'Sales', route: '/dashboard/orders', pageId: 'dashboard-orders' });
    const warehouse = createNode({ type: 'module', title: 'Warehouse', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const withNodes = addTreeNode(addTreeNode(document, 'root', sales), 'root', warehouse);

    const moved = moveTreeNodeBefore(withNodes, warehouse.id, sales.id);

    expect(moved.rootNodes.map((node) => node.title)).toEqual(['Warehouse', 'Sales']);
  });

  it('ensures the current route exists under its menu module', () => {
    const document = createEmptyProjectDocument('/dashboard/orders', '2026-06-29T00:00:00.000Z');

    const result = ensureMenuRoutePage(document, '/dashboard/orders', [
      { label: '销售', kind: 'group' },
      { label: '订单', kind: 'module', route: '/dashboard/orders', parentLabel: '销售' }
    ]);

    expect(result.document.rootNodes[0]?.title).toBe('销售');
    expect(result.page.title).toBe('订单');
    expect(result.page.route).toBe('/dashboard/orders');
    expect(result.document.rootNodes[0]?.children[0]?.id).toBe(result.page.id);
  });

  it('moves an existing route page under its menu module', () => {
    const document = createEmptyProjectDocument('/dashboard/orders', '2026-06-29T00:00:00.000Z');
    const page = createNode({ type: 'page', title: 'orders', route: '/dashboard/orders', pageId: 'dashboard-orders' });
    const withLoosePage = addTreeNode(document, 'root', page);

    const result = ensureMenuRoutePage(withLoosePage, '/dashboard/orders', [
      { label: '销售', kind: 'group' },
      { label: '订单', kind: 'module', route: '/dashboard/orders', parentLabel: '销售' }
    ]);

    expect(result.document.rootNodes.map((node) => node.title)).toEqual(['销售']);
    expect(result.document.rootNodes[0]?.children[0]?.id).toBe(page.id);
    expect(result.page.id).toBe(page.id);
  });

  it('places overview under the home module instead of fallback ungrouped', () => {
    const document = createEmptyProjectDocument('/dashboard/overview', '2026-06-29T00:00:00.000Z');
    const overview = createNode({ type: 'page', title: 'Overview', route: '/dashboard/overview', pageId: 'dashboard-overview' });
    const ungrouped = createNode({ type: 'module', title: '未分组', children: [overview] });
    const withUngrouped = addTreeNode(document, 'root', ungrouped);

    const result = ensureMenuRoutePage(withUngrouped, '/dashboard/overview', [
      { label: '首页', kind: 'group' },
      { label: '概览', kind: 'module', route: '/dashboard/overview', parentLabel: '首页' }
    ]);

    expect(result.document.rootNodes.map((node) => node.title)).toEqual(['首页']);
    expect(result.document.rootNodes[0]?.children[0]?.title).toBe('Overview');
    expect(result.page.id).toBe(overview.id);
  });

  it('attaches a picked target to the selected node', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const pageNode = createNode({ type: 'page', title: 'Outbound', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const withPage = addTreeNode(document, 'root', pageNode);
    const target: RequirementTargetDraft = {
      route: '/dashboard/outbound',
      pageId: 'dashboard-outbound',
      elementType: 'button',
      label: 'Create',
      selector: 'button'
    };

    const updated = attachTargetToNode(withPage, pageNode.id, target);

    expect(updated.rootNodes[0]!.target?.label).toBe('Create');
    expect(updated.rootNodes[0]!.type).toBe('action');
  });

  it('detects structure suggestions without mutating the document', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound', '2026-06-29T00:00:00.000Z');
    const suggestions = detectStructureSuggestions(document, [
      { type: 'page', title: 'Outbound List', route: '/dashboard/outbound' },
      { type: 'action', title: 'Create', route: '/dashboard/outbound' }
    ]);

    expect(suggestions.map((node) => node.title)).toEqual(['Outbound List', 'Create']);
    expect(document.rootNodes).toEqual([]);
  });

  it('clears structure and all associated annotations together', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const annotation = createNode({ type: 'field', title: '仓库', route: '/dashboard/inbound', pageId: 'dashboard-inbound', target: { elementType: 'field', label: '仓库' } });
    const page = createNode({ type: 'page', title: '入库单', route: '/dashboard/inbound', pageId: 'dashboard-inbound', children: [annotation] });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [page] });
    const withStructure = addTreeNode(document, 'root', moduleNode);

    expect(clearProjectStructure(withStructure).rootNodes).toEqual([]);
  });

  it('clears annotations only for the selected page instead of the current route page', () => {
    const document = createEmptyProjectDocument('/dashboard/orders', '2026-06-29T00:00:00.000Z');
    const ordersAnnotation = createNode({ type: 'field', title: '订单状态', route: '/dashboard/orders', pageId: 'dashboard-orders', target: { elementType: 'field', label: '订单状态' } });
    const outboundAnnotation = createNode({ type: 'field', title: '出库单号', route: '/dashboard/outbound', pageId: 'dashboard-outbound', target: { elementType: 'field', label: '出库单号' } });
    const ordersPage = createNode({ type: 'page', title: '订单', route: '/dashboard/orders', pageId: 'dashboard-orders', children: [ordersAnnotation] });
    const outboundPage = createNode({ type: 'page', title: '出库单', route: '/dashboard/outbound', pageId: 'dashboard-outbound', children: [outboundAnnotation] });
    const sales = createNode({ type: 'module', title: '销售', children: [ordersPage] });
    const warehouse = createNode({ type: 'module', title: '仓储', children: [outboundPage] });
    const withPages = addTreeNode(addTreeNode(document, 'root', sales), 'root', warehouse);

    const cleared = clearPageAnnotations(withPages, { route: '/dashboard/outbound', pageId: 'dashboard-outbound' });

    expect(cleared.rootNodes[0]?.children[0]?.children).toHaveLength(1);
    expect(cleared.rootNodes[0]?.children[0]?.children[0]?.title).toBe('订单状态');
    expect(cleared.rootNodes[1]?.children[0]?.children).toEqual([]);
  });

  it('resolves annotation nodes to their parent page without treating modules as pages', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const annotation = createNode({ type: 'field', title: 'Warehouse', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const page = createNode({ type: 'page', title: 'Inbound', route: '/dashboard/inbound', pageId: 'dashboard-inbound', children: [annotation] });
    const moduleNode = createNode({ type: 'module', title: '未分组', children: [page] });
    const withModule = addTreeNode(document, 'root', moduleNode);

    expect(getSelectedAnnotationPage(withModule.rootNodes, moduleNode.id)).toBeUndefined();
    expect(getSelectedAnnotationPage(withModule.rootNodes, page.id)?.id).toBe(page.id);
    expect(getSelectedAnnotationPage(withModule.rootNodes, annotation.id)?.id).toBe(page.id);
  });

  it('keeps annotation nodes out of the visible project structure tree', () => {
    const annotation = createNode({ type: 'field', title: 'Warehouse', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const page = createNode({ type: 'page', title: 'Inbound', route: '/dashboard/inbound', pageId: 'dashboard-inbound', children: [annotation] });
    const moduleNode = createNode({ type: 'module', title: '未分组', children: [page] });

    expect(getProjectStructureNodes([moduleNode])[0]?.children[0]?.children).toEqual([]);
  });

  it('treats unbound sections as annotation groups', () => {
    const group = createNode({ type: 'section', title: '筛选区', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const boundSection = createNode({
      type: 'section',
      title: '列表区',
      route: '/dashboard/inbound',
      pageId: 'dashboard-inbound',
      target: { elementType: 'section', label: '列表区' }
    });

    expect(isAnnotationGroupNode(group)).toBe(true);
    expect(isAnnotationGroupNode(boundSection)).toBe(false);
  });

  it('uses the selected manual page as the annotation parent', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const routePage = createNode({ type: 'page', title: 'Inbound', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const manualPage = createNode({ type: 'page', title: '新的page' });
    const moduleNode = createNode({ type: 'module', title: '新的module', children: [manualPage] });
    const withPages = addTreeNode(addTreeNode(document, 'root', routePage), 'root', moduleNode);

    const result = resolveAnnotationParentPage(withPages, manualPage.id, '/dashboard/inbound');

    expect(result.page.id).toBe(manualPage.id);
    expect(result.document.rootNodes).toHaveLength(2);
  });

  it('prefers the current route page when the selected page belongs to another route', () => {
    const document = createEmptyProjectDocument('/dashboard/outbound/new', '2026-06-29T00:00:00.000Z');
    const inboundPage = createNode({ type: 'page', title: '入库单新建', route: '/dashboard/inbound/new', pageId: 'dashboard-inbound-new' });
    const inboundModule = createNode({ type: 'module', title: '仓储', children: [inboundPage] });
    const withInboundPage = addTreeNode(document, 'root', inboundModule);

    const result = resolveAnnotationParentPage(withInboundPage, inboundPage.id, '/dashboard/outbound/new');

    expect(result.page.route).toBe('/dashboard/outbound/new');
    expect(result.page.pageId).toBe('dashboard-outbound-new');
    expect(result.page.id).not.toBe(inboundPage.id);
  });

  it('updates document route metadata to match the active route before saving', () => {
    const document = {
      ...createEmptyProjectDocument('/dashboard/inbound/new', '2026-06-29T00:00:00.000Z'),
      pageId: 'dashboard-inbound-new',
      route: '/dashboard/inbound/new'
    };

    const normalized = ensureDocumentRoute(document, '/dashboard/outbound/new');

    expect(normalized.route).toBe('/dashboard/outbound/new');
    expect(normalized.pageId).toBe('dashboard-outbound-new');
  });

  it('maps a selected annotation to its page for structure actions', () => {
    const annotation = createNode({ type: 'field', title: '返回入库单列表', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const page = createNode({ type: 'page', title: '新的page', children: [annotation] });
    const moduleNode = createNode({ type: 'module', title: '新的module', children: [page] });

    expect(getStructureSelectionId([moduleNode], annotation.id)).toBe(page.id);
    expect(getStructureSelectionId([moduleNode], moduleNode.id)).toBe(moduleNode.id);
  });

  it('keeps structure selection on the current route page when nothing is selected', () => {
    const document = createEmptyProjectDocument('/dashboard/overview', '2026-06-29T00:00:00.000Z');
    const outboundPage = createNode({ type: 'page', title: '出库单', route: '/dashboard/outbound', pageId: 'dashboard-outbound' });
    const overviewPage = createNode({ type: 'page', title: '概览', route: '/dashboard/overview', pageId: 'dashboard-overview' });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [outboundPage, overviewPage] });
    const withPages = addTreeNode(document, 'root', moduleNode);

    expect(getStructureSelectionId(withPages.rootNodes, undefined, '/dashboard/overview')).toBe(overviewPage.id);
  });

  it('allows one nested page level but no deeper', () => {
    const detailPage = createNode({ type: 'page', title: '统计页面' });
    const page = createNode({ type: 'page', title: '入库单', children: [detailPage] });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [page] });

    expect(getStructureChildParentId([moduleNode], moduleNode.id, 'page')).toBe(moduleNode.id);
    expect(getStructureChildParentId([moduleNode], page.id, 'page')).toBe(page.id);
    expect(getStructureChildParentId([moduleNode], detailPage.id, 'page')).toBe(page.id);
    expect(getStructureChildParentId([moduleNode], undefined, 'page')).toBe('root');
  });

  it('builds selectable page route options with bound status', () => {
    const inboundPage = createNode({ type: 'page', title: '入库单', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const currentPage = createNode({ type: 'page', title: '新的page' });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [inboundPage, currentPage] });

    const options = getPageRouteOptions([moduleNode], currentPage.id, [
      { label: '入库单', kind: 'module', route: '/dashboard/inbound', parentLabel: '仓储' },
      { label: '出库单', kind: 'module', route: '/dashboard/outbound', parentLabel: '仓储' }
    ]);

    expect(options).toEqual([
      { label: '入库单', route: '/dashboard/inbound', bound: true },
      { label: '出库单', route: '/dashboard/outbound', bound: false }
    ]);
  });

  it('merges detected menu trees by module title and page route', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const existingPage = createNode({ type: 'page', title: '入库单', route: '/dashboard/inbound', pageId: 'dashboard-inbound' });
    const existingModule = createNode({ type: 'module', title: '仓储', children: [existingPage] });
    const withExisting = addTreeNode(document, 'root', existingModule);
    const detected = createNode({
      type: 'module',
      title: '仓储',
      children: [
        createNode({ type: 'page', title: '入库单', route: '/dashboard/inbound', pageId: 'dashboard-inbound' }),
        createNode({ type: 'page', title: '出库单', route: '/dashboard/outbound', pageId: 'dashboard-outbound' })
      ]
    });

    const merged = mergeMenuTree(withExisting, [detected]);

    expect(merged.rootNodes).toHaveLength(1);
    expect(merged.rootNodes[0]?.children.map((node) => node.title)).toEqual(['入库单', '出库单']);
  });

  it('normalizes old schema v2 nodes with missing rule arrays', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const legacyNode = createNode({ type: 'field', title: 'Legacy Field' });
    const withLegacyNode = addTreeNode(document, 'root', {
      ...legacyNode,
      content: { ...legacyNode.content, rules: undefined as never }
    });

    const normalized = normalizeProjectDocument(withLegacyNode);

    expect(normalized.rootNodes[0]?.content.rules).toEqual([]);
  });

  it('normalizes illegal page depth before saving', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const thirdLevelPage = createNode({ type: 'page', title: '第三层', route: '/dashboard/inbound/deep' });
    const secondLevelPage = createNode({ type: 'page', title: '第二层', route: '/dashboard/inbound/new', children: [thirdLevelPage] });
    const firstLevelPage = createNode({ type: 'page', title: '第一层', route: '/dashboard/inbound', children: [secondLevelPage] });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [firstLevelPage] });
    const withIllegalDepth = addTreeNode(document, 'root', moduleNode);

    const normalized = normalizeProjectDocument(withIllegalDepth);

    expect(normalized.rootNodes[0]?.children[0]?.children.map((node) => node.title)).toEqual(['第二层', '第三层']);
    expect(normalized.rootNodes[0]?.children[0]?.children[0]?.children).toEqual([]);
  });
});
