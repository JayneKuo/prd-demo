import { DEFAULT_MENU_ITEMS } from './menu-items';
import { getPageIdFromRoute } from './page-id';
import type { ProjectMenuItem } from './project-tree';
import type {
  RequirementAnnotation,
  RequirementDocument,
  RequirementElementType,
  RequirementFlow,
  RequirementNodeContent,
  RequirementRule,
  RequirementRuleType,
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

const nodeTypeLabels: Record<RequirementTreeNodeType, string> = {
  module: '模块',
  page: '页面',
  section: '区域',
  field: '字段',
  action: '操作',
  flow: '流程',
  other: '其他'
};

function slug(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'node';
}

let nodeIdSequence = 0;

function createId(type: RequirementTreeNodeType, title: string, route?: string, pageId?: string) {
  nodeIdSequence += 1;
  return `${type}-${slug(route || pageId || title)}-${slug(title)}-${Date.now().toString(36)}-${nodeIdSequence}`;
}

function createRuleId(type: RequirementRuleType, description: string) {
  nodeIdSequence += 1;
  return `rule-${type}-${slug(description)}-${Date.now().toString(36)}-${nodeIdSequence}`;
}

function legacyRule(type: RequirementRuleType, description?: string): RequirementRule[] {
  const value = description?.trim();
  return value ? [{ id: createRuleId(type, value), subject: type, type, description: value }] : [];
}

function migrateLegacyRules(content: Partial<RequirementNodeContent>): RequirementRule[] {
  if (content.rules?.length) return content.rules;
  return [
    ...legacyRule('business', content.businessRule),
    ...legacyRule('interaction', content.interactionRule),
    ...legacyRule('data', content.dataSource),
    ...legacyRule('validation', content.validationRule),
    ...legacyRule('permission', content.permissionRule),
    ...(content.acceptanceCriteria || []).map((description) => ({ id: createRuleId('acceptance', description), subject: 'acceptance', type: 'acceptance' as const, description }))
  ];
}

function defaultContent(content: Partial<RequirementNodeContent> = {}): RequirementNodeContent {
  return {
    description: '',
    actors: [],
    acceptanceCriteria: [],
    openQuestions: [],
    status: 'draft',
    ...content,
    rules: migrateLegacyRules(content)
  };
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
    id: createId(type, title, route, pageId),
    type,
    title,
    route,
    pageId,
    target,
    source,
    order: 0,
    content: defaultContent(content),
    children: children.map((child, index) => ({ ...child, order: index }))
  };
}

export function isProjectDocument(document: RequirementDocument): document is RequirementProjectDocument {
  return 'schemaVersion' in document && document.schemaVersion === 2;
}

export function createEmptyProjectDocument(route: string, updatedAt: string): RequirementProjectDocument {
  const pageId = getPageIdFromRoute(route);

  return {
    schemaVersion: 2,
    projectName: '项目 PRD',
    pageId,
    route,
    rootNodes: [],
    updatedAt
  };
}

function contentFromAnnotation(annotation: RequirementAnnotation): RequirementNodeContent {
  return defaultContent({
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
  });
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

  const moduleNode = createNode({ type: 'module', title: document.title, route: document.route, pageId: document.pageId, children: [page] });

  return {
    schemaVersion: 2,
    projectName: document.title,
    pageId: document.pageId,
    route: document.route,
    rootNodes: [moduleNode],
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
    nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({ ...node, children: remove(node.children) }))
      .map((node, index) => ({ ...node, order: index }));

  return { ...document, rootNodes: remove(document.rootNodes) };
}

export function clearProjectStructure(document: RequirementProjectDocument): RequirementProjectDocument {
  return { ...document, rootNodes: [] };
}

export function clearPageAnnotations(document: RequirementProjectDocument, page: { route?: string; pageId?: string }): RequirementProjectDocument {
  const removeForPage = (nodes: RequirementTreeNode[]): RequirementTreeNode[] =>
    nodes.map((node) => ({
      ...node,
      children: removeForPage(
        node.children.filter((child) => {
          if (child.type === 'module' || child.type === 'page') return true;
          if (!child.target) return true;
          if (page.route && child.route === page.route) return false;
          if (page.pageId && child.pageId === page.pageId) return false;
          return true;
        })
      )
    }));

  return normalizeProjectDocument({ ...document, rootNodes: removeForPage(document.rootNodes) });
}

export function renameTreeNode(document: RequirementProjectDocument, nodeId: string, title: string): RequirementProjectDocument {
  return { ...document, rootNodes: mapNodes(document.rootNodes, (node) => (node.id === nodeId ? { ...node, title } : node)) };
}

export function updateTreeNode(
  document: RequirementProjectDocument,
  nodeId: string,
  updater: (node: RequirementTreeNode) => RequirementTreeNode
): RequirementProjectDocument {
  return { ...document, rootNodes: mapNodes(document.rootNodes, (node) => (node.id === nodeId ? updater(node) : node)) };
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

export function moveTreeNodeBefore(document: RequirementProjectDocument, sourceId: string, targetId: string): RequirementProjectDocument {
  const reorder = (nodes: RequirementTreeNode[]): RequirementTreeNode[] => {
    const sourceIndex = nodes.findIndex((node) => node.id === sourceId);
    const targetIndex = nodes.findIndex((node) => node.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const next = [...nodes];
      const [source] = next.splice(sourceIndex, 1);
      const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(insertIndex, 0, source!);
      return next.map((node, index) => ({ ...node, order: index }));
    }

    return nodes.map((node) => ({ ...node, children: reorder(node.children) }));
  };

  const reorderedRoots = reorder(document.rootNodes);
  return reorderedRoots === document.rootNodes ? document : { ...document, rootNodes: reorderedRoots };
}

function containsNode(node: RequirementTreeNode, nodeId: string): boolean {
  return node.children.some((child) => child.id === nodeId || containsNode(child, nodeId));
}

export function moveTreeNodeInto(document: RequirementProjectDocument, sourceId: string, targetParentId: string): RequirementProjectDocument {
  let movedNode: RequirementTreeNode | undefined;

  const remove = (nodes: RequirementTreeNode[]): RequirementTreeNode[] =>
    nodes
      .flatMap((node) => {
        if (node.id === sourceId) {
          movedNode = node;
          return [];
        }
        return [{ ...node, children: remove(node.children) }];
      })
      .map((node, index) => ({ ...node, order: index }));

  const withoutSource = remove(document.rootNodes);
  if (!movedNode || sourceId === targetParentId || containsNode(movedNode, targetParentId)) {
    return document;
  }

  const nodeToMove = movedNode;

  if (targetParentId === 'root') {
    return { ...document, rootNodes: [...withoutSource, { ...nodeToMove, order: withoutSource.length }] };
  }

  const insert = (nodes: RequirementTreeNode[]): RequirementTreeNode[] =>
    nodes.map((node) => {
      if (node.id === targetParentId) {
        return {
          ...node,
          children: [...node.children, { ...nodeToMove, order: node.children.length }]
        };
      }
      return { ...node, children: insert(node.children) };
    });

  return { ...document, rootNodes: insert(withoutSource) };
}

export function attachTargetToNode(document: RequirementProjectDocument, nodeId: string, target: RequirementTargetDraft): RequirementProjectDocument {
  const title = target.label?.trim() || '已绑定元素';

  return updateTreeNode(document, nodeId, (node) => ({
    ...node,
    type: elementTypeToNodeType[target.elementType] || node.type,
    title: node.title.startsWith('新的') || node.title === '已绑定元素' ? title : node.title,
    route: target.route,
    pageId: target.pageId,
    target: {
      selector: target.selector,
      prdId: target.prdId,
      label: title,
      elementType: target.elementType
    },
    content: {
      ...node.content,
      description: node.content.description || `页面元素「${title}」的需求说明。`
    }
  }));
}

export function findTreeNode(nodes: RequirementTreeNode[], nodeId?: string): RequirementTreeNode | undefined {
  if (!nodeId) return undefined;

  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findTreeNode(node.children, nodeId);
    if (child) return child;
  }

  return undefined;
}

export function findFirstPageNode(nodes: RequirementTreeNode[]): RequirementTreeNode | undefined {
  for (const node of nodes) {
    if (node.type === 'page') return node;
    const child = findFirstPageNode(node.children);
    if (child) return child;
  }

  return nodes[0];
}

export function getSelectedAnnotationPage(nodes: RequirementTreeNode[], selectedId?: string): RequirementTreeNode | undefined {
  if (!selectedId) return undefined;

  function visit(node: RequirementTreeNode, page: RequirementTreeNode | undefined): RequirementTreeNode | undefined {
    const currentPage = node.type === 'page' ? node : page;
    if (node.id === selectedId) return node.type === 'module' ? undefined : currentPage;

    for (const child of node.children) {
      const found = visit(child, currentPage);
      if (found) return found;
    }

    return undefined;
  }

  for (const node of nodes) {
    const found = visit(node, undefined);
    if (found) return found;
  }

  return undefined;
}

export function getProjectStructureNodes(nodes: RequirementTreeNode[]): RequirementTreeNode[] {
  return nodes
    .filter((node) => node.type === 'module' || node.type === 'page')
    .map((node) => ({ ...node, children: getProjectStructureNodes(node.children) }));
}

export function isAnnotationGroupNode(node: RequirementTreeNode) {
  return node.type === 'section' && !node.target;
}

export function resolveAnnotationParentPage(document: RequirementProjectDocument, selectedId: string | undefined, currentRoute: string, menuItems: ProjectMenuItem[] = DEFAULT_MENU_ITEMS) {
  const selectedPage = getSelectedAnnotationPage(document.rootNodes, selectedId);
  if (selectedPage && (selectedPage.route === currentRoute || !selectedPage.route)) {
    return { document, page: selectedPage };
  }
  return ensureMenuRoutePage(document, currentRoute, menuItems);
}

export function getStructureSelectionId(nodes: RequirementTreeNode[], selectedId?: string, currentRoute?: string) {
  const selected = findTreeNode(nodes, selectedId);
  if (selected?.type === 'module' || selected?.type === 'page') return selected.id;
  const selectedPageId = getSelectedAnnotationPage(nodes, selectedId)?.id;
  if (selectedPageId) return selectedPageId;
  return currentRoute ? flattenTreeNodes(nodes).find((node) => node.type === 'page' && node.route === currentRoute)?.id : selectedId;
}

function findNodeContext(nodes: RequirementTreeNode[], nodeId?: string, parent?: RequirementTreeNode, grandparent?: RequirementTreeNode): { node: RequirementTreeNode; parent?: RequirementTreeNode; grandparent?: RequirementTreeNode } | undefined {
  if (!nodeId) return undefined;

  for (const node of nodes) {
    if (node.id === nodeId) return { node, parent, grandparent };
    const found = findNodeContext(node.children, nodeId, node, parent);
    if (found) return found;
  }

  return undefined;
}

export function getStructureChildParentId(nodes: RequirementTreeNode[], selectedId: string | undefined, childType: RequirementTreeNodeType) {
  const context = findNodeContext(nodes, selectedId);
  if (!context) return 'root';
  if (childType !== 'page') return context.node.id;
  if (context.node.type === 'module') return context.node.id;
  if (context.node.type !== 'page') return context.parent?.id || 'root';
  if (context.parent?.type === 'page') return context.parent.id;
  return context.node.id;
}

export function getPageRouteOptions(nodes: RequirementTreeNode[], currentPageId: string | undefined, menuItems: ProjectMenuItem[] = DEFAULT_MENU_ITEMS) {
  const currentPage = findTreeNode(nodes, currentPageId);
  const boundRoutes = new Set(
    flattenTreeNodes(nodes)
      .filter((node) => node.type === 'page' && node.id !== currentPage?.id && node.route)
      .map((node) => node.route!)
  );
  const seenRoutes = new Set<string>();

  return menuItems.flatMap((item) => {
    if (item.kind !== 'module' || !item.route || seenRoutes.has(item.route)) return [];
    seenRoutes.add(item.route);
    return [{ label: item.label, route: item.route, bound: boundRoutes.has(item.route) }];
  });
}

function nodeKey(node: RequirementTreeNode) {
  return `${node.type}:${node.route || node.title}`;
}

function mergeChildren(existing: RequirementTreeNode[], incoming: RequirementTreeNode[]) {
  const merged = [...existing];
  for (const node of incoming) {
    const index = merged.findIndex((item) => nodeKey(item) === nodeKey(node));
    if (index === -1) {
      merged.push({ ...node, order: merged.length });
      continue;
    }
    const current = merged[index]!;
    merged[index] = { ...current, children: mergeChildren(current.children, node.children) };
  }
  return merged.map((node, index) => ({ ...node, order: index }));
}

export function mergeMenuTree(document: RequirementProjectDocument, nodes: RequirementTreeNode[]): RequirementProjectDocument {
  return { ...document, rootNodes: mergeChildren(document.rootNodes, nodes) };
}

function normalizeNodeContent(node: RequirementTreeNode): RequirementTreeNode {
  return { ...node, content: defaultContent(node.content) };
}

function normalizeNodes(nodes: RequirementTreeNode[], pageDepth = 0): RequirementTreeNode[] {
  const normalized: RequirementTreeNode[] = [];

  for (const rawNode of nodes) {
    const node = normalizeNodeContent(rawNode);
    const nextDepth = node.type === 'page' ? pageDepth + 1 : pageDepth;
    const children = normalizeNodes(node.children, nextDepth);
    if (node.type === 'page' && nextDepth > 2) {
      normalized.push({ ...node, children: [], order: normalized.length }, ...children.map((child) => ({ ...child, order: normalized.length + 1 })));
    } else if (node.type === 'page' && nextDepth === 2) {
      const pageChildren = children.filter((child) => child.type === 'page');
      const otherChildren = children.filter((child) => child.type !== 'page');
      normalized.push({ ...node, children: otherChildren.map((child, index) => ({ ...child, order: index })), order: normalized.length }, ...pageChildren.map((child) => ({ ...child, order: normalized.length + 1 })));
    } else {
      normalized.push({ ...node, children, order: normalized.length });
    }
  }

  return normalized.map((node, index) => ({ ...node, order: index }));
}

export function normalizeProjectDocument(document: RequirementProjectDocument): RequirementProjectDocument {
  return { ...document, rootNodes: normalizeNodes(document.rootNodes) };
}

export function flattenTreeNodes(nodes: RequirementTreeNode[]): RequirementTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTreeNodes(node.children)]);
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

  for (const node of flattenTreeNodes(document.rootNodes)) {
    existing.add(`${node.type}:${node.route || ''}:${node.title}`.toLowerCase());
  }

  return inputs.flatMap((input) => {
    const key = `${input.type}:${input.route || ''}:${input.title}`.toLowerCase();
    if (existing.has(key)) return [];
    existing.add(key);
    return [createNode({ ...input, pageId: input.pageId || (input.route ? getPageIdFromRoute(input.route) : document.pageId) })];
  });
}

function routeMatchesMenuItem(route: string, item: ProjectMenuItem) {
  if (!item.route) return false;
  return route === item.route || route.startsWith(`${item.route}/`);
}

function titleFromRoute(route: string) {
  const title = route.split('/').filter(Boolean).at(-1) || '当前页面';
  return title.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ensureDocumentRoute(document: RequirementProjectDocument, route: string): RequirementProjectDocument {
  return {
    ...document,
    route,
    pageId: getPageIdFromRoute(route)
  };
}

export function ensureMenuRoutePage(document: RequirementProjectDocument, route: string, menuItems: ProjectMenuItem[] = DEFAULT_MENU_ITEMS) {
  const pageId = getPageIdFromRoute(route);
  const menuItem = menuItems.filter((item) => item.kind === 'module' && item.route).sort((a, b) => (b.route?.length || 0) - (a.route?.length || 0)).find((item) => routeMatchesMenuItem(route, item));
  const moduleTitle = menuItem?.parentLabel || menuItem?.label || '未分组';
  const pageTitle = menuItem?.route === route ? menuItem.label : titleFromRoute(route);
  const existingPage = flattenTreeNodes(document.rootNodes).find((node) => node.type === 'page' && (node.route === route || node.pageId === pageId));
  const existingModule = document.rootNodes.find((node) => node.type === 'module' && node.title === moduleTitle);
  const page = existingPage || createNode({ type: 'page', title: pageTitle, route, pageId });

  if (existingModule?.children.some((child) => child.id === page.id)) {
    return { document, page };
  }

  const withoutLoosePage = existingPage ? deleteTreeNode(document, existingPage.id) : document;
  const withoutEmptyModules = {
    ...withoutLoosePage,
    rootNodes: withoutLoosePage.rootNodes.filter((node) => node.type !== 'module' || node.children.length > 0 || node.title === moduleTitle)
  };
  const moduleAfterDelete = withoutEmptyModules.rootNodes.find((node) => node.type === 'module' && node.title === moduleTitle);

  if (moduleAfterDelete) {
    return { document: addTreeNode(withoutEmptyModules, moduleAfterDelete.id, page), page };
  }

  const moduleNode = createNode({ type: 'module', title: moduleTitle, route: menuItem?.route, pageId: menuItem?.route ? getPageIdFromRoute(menuItem.route) : pageId, children: [page] });
  return { document: addTreeNode(withoutEmptyModules, 'root', moduleNode), page: moduleNode.children[0]! };
}

export function getMenuStructureInputs(menuItems: ProjectMenuItem[] = DEFAULT_MENU_ITEMS, route: string): StructureSuggestionInput[] {
  return menuItems.map((item) => ({ type: item.kind === 'group' ? 'module' : 'page', title: item.label, route: item.route || route }));
}

export function getNodeTypeLabel(type: RequirementTreeNodeType) {
  return nodeTypeLabels[type];
}
