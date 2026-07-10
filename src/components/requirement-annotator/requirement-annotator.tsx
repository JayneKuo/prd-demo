'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Eye, EyeOff, MousePointer2, PanelRightOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getPageIdFromRoute } from './page-id';
import { DEFAULT_MENU_ITEMS } from './menu-items';
import { buildMenuTreeFromRecords, detectMenuItemsFromRecords, getBindingRecordFromElement, getMenuRecordsFromElement, getPageBindingFromRecord } from './dom-menu-detector';
import { AnnotationMarkers } from './annotation-markers';
import { ElementPicker } from './element-picker';
import { NodeEditor } from './node-editor';
import { PageAnnotationList } from './page-annotation-list';
import { PrdPreviewPanel } from './prd-preview-panel';
import { ProjectStructureTree } from './project-structure-tree';
import { ReviewCardPopover } from './review-card-popover';
import { getReviewAnnotationsForRoute, getReviewNodesForPage } from './review-mode';
import { loadRequirementDocument, saveRequirementDocument } from './storage';
import { getSemanticAnnotationTitle } from './title-extractor';
import {
  addTreeNode,
  attachTargetToNode,
  clearPageAnnotations as clearAnnotationsForPage,
  clearProjectStructure,
  createNode,
  deleteTreeNode,
  detectStructureSuggestions,
  ensureDocumentRoute,
  ensureMenuRoutePage,
  findFirstPageNode,
  findTreeNode,
  flattenTreeNodes,
  getMenuStructureInputs,
  getProjectStructureNodes,
  getSelectedAnnotationPage,
  getStructureChildParentId,
  getStructureSelectionId,
  mergeMenuTree,
  moveTreeNodeBefore,
  moveTreeNodeInto,
  normalizeProjectDocument,
  resolveAnnotationParentPage,
  updateTreeNode,
  type StructureSuggestionInput
} from './tree-document';
import type { RequirementProjectDocument, RequirementTarget, RequirementTargetDraft, RequirementTreeNode, RequirementTreeNodeType } from './types';

type WorkspaceMode = 'organize' | 'annotate' | 'preview';
type PickerMode = 'annotation' | 'bind-page' | 'detect-menu';

const workspaceOpenStorageKey = 'requirement-annotator:workspace-open';

function getInitialWorkspaceOpen() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(workspaceOpenStorageKey) === 'true';
}

function getElementType(element: HTMLElement): StructureSuggestionInput['type'] {
  const role = element.getAttribute('role');
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'button' || role === 'button') return 'action';
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'th') return 'field';
  if (tagName === 'section') return 'section';
  return 'other';
}

function getElementLabel(element: HTMLElement) {
  const tagName = element.tagName.toLowerCase();
  const structureType = getElementType(element);
  const elementType = tagName === 'button' ? 'button' : structureType === 'field' ? 'field' : structureType === 'section' ? 'section' : 'other';
  return getSemanticAnnotationTitle({
    elementType,
    tagName,
    text: element.textContent || '',
    ariaLabel: element.dataset.prdLabel || element.getAttribute('aria-label'),
    placeholder: element.getAttribute('placeholder'),
    title: element.getAttribute('title'),
    role: element.getAttribute('role'),
    insideTable: Boolean(element.closest('table'))
  });
}

function getStableSelector(element: HTMLElement) {
  if (element.dataset.prdId) return `[data-prd-id="${element.dataset.prdId}"]`;
  if (element.id) return `#${element.id}`;

  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== 'body' && parts.length < 5) {
    const tagName = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === current?.tagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(siblings.length > 1 ? `${tagName}:nth-of-type(${index})` : tagName);
    current = parent.closest('[data-prd-tool="true"]') ? null : parent;
  }

  return parts.join(' > ') || element.tagName.toLowerCase();
}

function getDomStructureInputs(route: string, pageId: string): StructureSuggestionInput[] {
  return Array.from(document.querySelectorAll<HTMLElement>('main button, main input, main textarea, main select, main th, main section'))
    .filter((element) => !element.closest('[data-prd-tool="true"]'))
    .map((element) => ({ element, label: getElementLabel(element) }))
    .filter(({ label }) => label && label.length > 1 && label.length < 60)
    .slice(0, 40)
    .map(({ element, label }) => ({
      type: getElementType(element),
      title: label,
      route,
      pageId,
      target: {
        selector: getStableSelector(element),
        prdId: element.dataset.prdId,
        label,
        elementType: element.tagName.toLowerCase() === 'button' ? 'button' : getElementType(element) === 'field' ? 'field' : getElementType(element) === 'section' ? 'section' : 'other'
      }
    }));
}

function targetMatchesAnnotation(annotation: { pageId: string; target: RequirementTarget }, target: RequirementTargetDraft) {
  if (annotation.pageId !== target.pageId) return false;
  if (annotation.target.prdId && target.prdId && annotation.target.prdId === target.prdId) return true;
  if (annotation.target.selector && target.selector && annotation.target.selector === target.selector) return true;
  return false;
}

function findTargetElement(target?: RequirementTarget) {
  if (!target) return null;
  if (target.prdId) return document.querySelector<HTMLElement>(`[data-prd-id="${target.prdId}"]`);
  if (target.selector) return document.querySelector<HTMLElement>(target.selector);
  return null;
}

function normalizePageAnnotations(document: RequirementProjectDocument): RequirementProjectDocument {
  const pages = flattenTreeNodes(document.rootNodes).filter((node) => node.type === 'page');
  if (pages.length === 0) return document;

  const annotationsByPageKey = new Map<string, RequirementTreeNode[]>();
  for (const node of flattenTreeNodes(document.rootNodes)) {
    if (node.type === 'module' || node.type === 'page' || !node.target) continue;
    const key = node.route || node.pageId || document.route;
    annotationsByPageKey.set(key, [...(annotationsByPageKey.get(key) || []), { ...node, children: [] }]);
  }

  const usedKeys = new Set<string>();
  const prune = (nodes: RequirementTreeNode[]): RequirementTreeNode[] =>
    nodes
      .filter((node) => node.type === 'module' || node.type === 'page')
      .map((node) => {
        if (node.type !== 'page') return { ...node, children: prune(node.children) };
        const key = node.route || node.pageId || document.route;
        const annotations = usedKeys.has(key) ? [] : annotationsByPageKey.get(key) || [];
        usedKeys.add(key);
        return { ...node, children: annotations.map((annotation, index) => ({ ...annotation, order: index })) };
      })
      .map((node, index) => ({ ...node, order: index }));

  return { ...document, rootNodes: prune(document.rootNodes) };
}

function getPageAnnotations(document: RequirementProjectDocument, pageId: string) {
  return flattenTreeNodes(document.rootNodes)
    .filter((node) => node.pageId === pageId && node.type !== 'module' && node.type !== 'page' && node.target)
    .map((node, index) => ({
      id: node.id,
      pageId: node.pageId || pageId,
      route: node.route || document.route,
      target: node.target || {
        label: node.title,
        elementType: node.type === 'action' ? 'button' : node.type === 'section' ? 'section' : node.type === 'field' ? 'field' : 'other'
      },
      content: {
        title: node.title,
        description: node.content.description,
        businessRule: node.content.businessRule,
        interactionRule: node.content.interactionRule,
        dataSource: node.content.dataSource,
        validationRule: node.content.validationRule,
        permissionRule: node.content.permissionRule,
        rules: node.content.rules,
        acceptanceCriteria: node.content.acceptanceCriteria,
        openQuestions: node.content.openQuestions
      },
      source: node.source || 'manual',
      status: node.content.status,
      order: node.order ?? index,
      markerOffset: node.markerOffset
    }));
}

export function RequirementAnnotator() {
  const pathname = usePathname();
  const route = pathname || '/';
  const currentPageId = getPageIdFromRoute(route);
  const [open, setOpen] = useState(getInitialWorkspaceOpen);
  const [mode, setMode] = useState<WorkspaceMode>('organize');
  const [pickerMode, setPickerMode] = useState<PickerMode | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [document, setDocument] = useState<RequirementProjectDocument | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof detectStructureSuggestions>>([]);
  const [detectedMenuTree, setDetectedMenuTree] = useState<RequirementTreeNode[]>([]);
  const [showMarkers, setShowMarkers] = useState(true);
  const [reviewAnnotationId, setReviewAnnotationId] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [toolPosition, setToolPosition] = useState({ x: 20, y: 20 });
  const [toolDimmed, setToolDimmed] = useState(false);
  const [draggingTool, setDraggingTool] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0.68);
  const [highlightedTarget, setHighlightedTarget] = useState<DOMRect | null>(null);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const scrollFadeTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(false);
  const pendingBindIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    window.sessionStorage.setItem(workspaceOpenStorageKey, String(open));
  }, [open]);

  useEffect(() => {
    let active = true;

    loadRequirementDocument(route)
      .then((loaded) => {
        if (!active) return;
        const normalized = normalizePageAnnotations(loaded);
        hasLoadedRef.current = true;
        skipNextSaveRef.current = JSON.stringify(normalized.rootNodes) === JSON.stringify(loaded.rootNodes);
        setDocument(normalized);
        setSelectedId(getStructureSelectionId(normalized.rootNodes, undefined, route) || findFirstPageNode(normalized.rootNodes)?.id || normalized.rootNodes[0]?.id);
      })
      .catch(() => {
        if (active) setMessage('需求结构加载失败。');
      });

    return () => {
      active = false;
    };
  }, [route]);

  const selectedNode = useMemo(() => findTreeNode(document?.rootNodes || [], selectedId), [document, selectedId]);
  const structureSelectedId = useMemo(() => getStructureSelectionId(document?.rootNodes || [], selectedId, route), [document, selectedId, route]);
  const structureSelectedNode = useMemo(() => findTreeNode(document?.rootNodes || [], structureSelectedId), [document, structureSelectedId]);
  const selectedAnnotationPage = useMemo(() => (document ? getSelectedAnnotationPage(document.rootNodes, structureSelectedId) || getSelectedAnnotationPage(document.rootNodes, selectedId) : undefined), [document, structureSelectedId, selectedId]);
  const pageAnnotationNodes = useMemo(() => {
    if (!document) return [];
    return getReviewNodesForPage(document, { route, pageId: currentPageId });
  }, [currentPageId, document, route]);
  const pageAnnotations = useMemo(() => {
    if (!document) return [];
    return getReviewAnnotationsForRoute(document, route);
  }, [document, route]);
  const reviewAnnotation = useMemo(() => pageAnnotations.find((annotation) => annotation.id === reviewAnnotationId), [pageAnnotations, reviewAnnotationId]);

  const focusTarget = useCallback((node?: RequirementTreeNode) => {
    const element = findTargetElement(node?.target);
    if (!element) return;
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    window.setTimeout(() => setHighlightedTarget(element.getBoundingClientRect()), 250);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedTarget(null), 2200);
  }, []);

  const selectNode = useCallback(
    (id: string, shouldFocus = true) => {
      setSelectedId(id);
      if (!shouldFocus || !document) return;
      const node = findTreeNode(document.rootNodes, id);
      if (node) focusTarget(node);
    },
    [document, focusTarget]
  );

  const handlePick = useCallback(
    (target: RequirementTargetDraft, sourceElement: HTMLElement) => {
      setDocument((current) => {
        if (!current) return current;
        if (pickerMode === 'bind-page') {
          const selectedPage = findTreeNode(current.rootNodes, selectedId);
          if (!selectedPage || selectedPage.type !== 'page') return current;
          const binding = getPageBindingFromRecord(getBindingRecordFromElement(sourceElement), route);
          setPickerMode(undefined);
          setMode('organize');
          setOpen(true);
          setMessage(`已绑定页面「${binding.title}」。`);
          return updateTreeNode(current, selectedPage.id, (node) => ({
            ...node,
            title: ['新的page', 'New', ''].includes(node.title.trim()) ? binding.title : node.title,
            route: binding.route,
            pageId: getPageIdFromRoute(binding.route)
          }));
        }
        if (pickerMode === 'detect-menu') {
          const records = getMenuRecordsFromElement(sourceElement);
          const detectedTree = buildMenuTreeFromRecords(records);
          const menuItems = detectMenuItemsFromRecords(records);
          const detected = detectedTree.length > 0 ? [] : detectStructureSuggestions(current, getMenuStructureInputs(menuItems, route)).slice(0, 80);
          setPickerMode(undefined);
          setMode('organize');
          setOpen(true);
          setDetectedMenuTree(detectedTree);
          setSuggestions(detected);
          setMessage(detectedTree.length > 0 ? `识别到 ${detectedTree.length} 个菜单模块，请确认后加入。` : detected.length > 0 ? `识别到 ${detected.length} 个菜单目录，请确认后加入。` : '没有发现新的菜单目录。');
          return current;
        }
        const pendingId = pendingBindIdRef.current;
        const existing = getPageAnnotations(current, target.pageId).find((annotation) => targetMatchesAnnotation(annotation, target));
        if (existing && existing.id !== pendingId) {
          const next = pendingId ? deleteTreeNode(current, pendingId) : current;
          selectNode(existing.id);
          pendingBindIdRef.current = undefined;
          setPickerMode(undefined);
          setMode('organize');
          setOpen(true);
          setMessage(`「${target.label || '所选元素'}」已有标注，已打开现有标注。`);
          return next;
        }

        const routePage = ensureMenuRoutePage(current, target.route, DEFAULT_MENU_ITEMS);
        const activeNode = pendingId ? findTreeNode(routePage.document.rootNodes, pendingId) : findTreeNode(routePage.document.rootNodes, selectedId) || routePage.page;
        if (!activeNode) return routePage.document;

        if (!pendingId && (activeNode.type === 'module' || activeNode.type === 'page' || (activeNode.type === 'section' && activeNode.target))) {
          const child = createNode({
            type: target.elementType === 'button' ? 'action' : target.elementType === 'section' ? 'section' : 'field',
            title: target.label || '新的页面标注',
            route: target.route,
            pageId: target.pageId
          });
          setSelectedId(child.id);
          pendingBindIdRef.current = undefined;
          setPickerMode(undefined);
          setMode('organize');
          setOpen(true);
          setMessage(`已在「${routePage.page.title}」下创建并绑定「${target.label || '所选元素'}」。`);
          return attachTargetToNode(addTreeNode(routePage.document, routePage.page.id, child), child.id, target);
        }

        selectNode(activeNode.id, false);
        pendingBindIdRef.current = undefined;
        setPickerMode(undefined);
        setMode('organize');
        setOpen(true);
        setMessage(`已把「${target.label || '所选元素'}」绑定到「${activeNode.title}」。`);
        return attachTargetToNode(current, activeNode.id, target);
      });
    },
    [pickerMode, route, selectNode, selectedId]
  );

  function addChild(parentId: string, type: RequirementTreeNodeType) {
    if (!document) return;
    const resolvedParentId = getStructureChildParentId(document.rootNodes, parentId, type);
    const child = createNode({ type, title: `新的${type}` });
    setDocument(addTreeNode(document, resolvedParentId, child));
    setSelectedId(child.id);
  }

  function detectMenuStructure() {
    if (!document) return;
    setPickerMode('detect-menu');
    setMode('annotate');
    setOpen(false);
    setMessage('请选择系统左侧菜单区域，我会识别里面的菜单层级。');
  }

  function detectPageFunctions() {
    if (!document) return;
    const routePage = ensureMenuRoutePage(document, route, DEFAULT_MENU_ITEMS);
    const detected = detectStructureSuggestions(routePage.document, getDomStructureInputs(route, currentPageId)).slice(0, 30);
    setDocument(routePage.document);
    setSelectedId(routePage.page.id);
    setSuggestions(detected);
    setMessage(detected.length > 0 ? `识别到 ${detected.length} 个页面功能点，请确认后加入「${routePage.page.title}」。` : '没有发现新的页面功能点。');
  }

  function getSuggestionParent(currentDocument: RequirementProjectDocument, suggestion?: RequirementTreeNode) {
    if (suggestion?.type === 'module') {
      return undefined;
    }
    if (suggestion?.type === 'page') {
      return selectedNode?.type === 'module' ? selectedNode : undefined;
    }
    if (suggestion?.route === route || suggestion?.pageId === currentPageId) {
      return ensureMenuRoutePage(currentDocument, route, DEFAULT_MENU_ITEMS).page;
    }
    return findFirstPageNode(currentDocument.rootNodes);
  }

  function acceptSuggestion(id: string) {
    if (!document) return;
    const suggestion = suggestions.find((item) => item.id === id);
    if (!suggestion) return;
    const routePage = ensureMenuRoutePage(document, route, DEFAULT_MENU_ITEMS);
    const parent = getSuggestionParent(routePage.document, suggestion);
    setDocument(addTreeNode(routePage.document, parent?.id || 'root', suggestion));
    setSelectedId(suggestion.id);
    setSuggestions((current) => current.filter((item) => item.id !== id));
    setMessage(`已加入「${suggestion.title}」。`);
  }

  function acceptAllSuggestions() {
    if (!document || (suggestions.length === 0 && detectedMenuTree.length === 0)) return;
    if (detectedMenuTree.length > 0) {
      const next = mergeMenuTree(document, detectedMenuTree);
      setDocument(next);
      setDetectedMenuTree([]);
      setMessage(`已合并 ${detectedMenuTree.length} 个菜单模块。`);
      return;
    }
    const routePage = ensureMenuRoutePage(document, route, DEFAULT_MENU_ITEMS);
    let next = routePage.document;
    for (const suggestion of suggestions) {
      const parent = getSuggestionParent(next, suggestion);
      next = addTreeNode(next, parent?.id || 'root', suggestion);
    }
    setDocument(next);
    setSuggestions([]);
    setMessage(`已加入 ${suggestions.length} 个识别结果。`);
  }

  function rejectSuggestion(id: string) {
    setSuggestions((current) => current.filter((item) => item.id !== id));
    setMessage('已忽略该识别结果。');
  }

  function rejectAllSuggestions() {
    setSuggestions([]);
    setDetectedMenuTree([]);
    setMessage('已忽略全部识别结果。');
  }

  function addPageAnnotation({ closeDrawer = false }: { closeDrawer?: boolean } = {}) {
    if (!document) return;
    const parentPage = resolveAnnotationParentPage(document, selectedId, route, DEFAULT_MENU_ITEMS);
    const currentSelectedNode = selectedId ? findTreeNode(parentPage.document.rootNodes, selectedId) : undefined;
    const parent = currentSelectedNode?.type === 'section' && !currentSelectedNode.target && currentSelectedNode.pageId === parentPage.page.pageId ? currentSelectedNode : parentPage.page;
    const annotation = createNode({ type: 'field', title: '新的页面标注', route: parentPage.page.route || route, pageId: parentPage.page.pageId || currentPageId });
    pendingBindIdRef.current = annotation.id;
    setDocument(addTreeNode(parentPage.document, parent.id, annotation));
    setSelectedId(undefined);
    window.setTimeout(() => setSelectedId(annotation.id), 0);
    setMode('annotate');
    setPickerMode('annotation');
    if (closeDrawer) setOpen(false);
    else setOpen(true);
    setMessage(`已在「${parentPage.page.title}」下创建新的页面标注。请点击页面上的字段、按钮或区域完成绑定；点“退出选点”可取消。`);
  }

  function addAnnotationGroup() {
    if (!document) return;
    const parentPage = resolveAnnotationParentPage(document, selectedId, route, DEFAULT_MENU_ITEMS);
    const group = createNode({ type: 'section', title: '新的标注分组', route: parentPage.page.route || route, pageId: parentPage.page.pageId || currentPageId });
    setDocument(addTreeNode(parentPage.document, parentPage.page.id, group));
    setSelectedId(group.id);
  }

  function deleteSelected() {
    if (!document || !selectedId) return;
    const selected = findTreeNode(document.rootNodes, selectedId);
    if (!selected || !window.confirm(`删除「${selected.title}」？`)) return;
    const next = deleteTreeNode(document, selectedId);
    setDocument(next);
    setSelectedId(findFirstPageNode(next.rootNodes)?.id || next.rootNodes[0]?.id);
  }

  function clearStructure() {
    if (!document || !window.confirm('删除目录栏全部目录及其关联标注？')) return;
    const next = clearProjectStructure(document);
    setDocument(next);
    setSuggestions([]);
    setDetectedMenuTree([]);
    setSelectedId(undefined);
    setMessage('已删除目录栏全部目录及其关联标注。');
  }

  function clearPageAnnotations() {
    if (!document || !window.confirm('删除当前页面标记栏全部标注？目录会保留。')) return;
    const targetPage = selectedAnnotationPage || { route, pageId: currentPageId };
    const normalized = ensureDocumentRoute(clearAnnotationsForPage(document, { route: targetPage.route, pageId: targetPage.pageId }), route);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    skipNextSaveRef.current = true;
    setDocument(normalized);
    setSelectedId(findTreeNode(normalized.rootNodes, getStructureSelectionId(normalized.rootNodes, undefined, route))?.id || findFirstPageNode(normalized.rootNodes)?.id || normalized.rootNodes[0]?.id);
    setMessage('已删除当前页面标记栏全部标注。');
    saveRequirementDocument(normalized)
      .then((saved) => {
        skipNextSaveRef.current = true;
        setDocument(saved);
      })
      .catch(() => setMessage('删除后保存失败，请稍后重试。'));
  }

  function startPanelResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = panelHeight;
    const viewportHeight = window.innerHeight;

    function handlePointerMove(moveEvent: PointerEvent) {
      const delta = startY - moveEvent.clientY;
      const nextHeight = startHeight + delta / viewportHeight;
      setPanelHeight(Math.min(0.9, Math.max(0.38, nextHeight)));
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  useEffect(() => {
    if (!document || !hasLoadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      const documentToSave = ensureDocumentRoute(normalizeProjectDocument(document), route);
      saveRequirementDocument(documentToSave)
        .then((saved) => {
          setDocument((current) => {
            if (current?.updatedAt !== document.updatedAt) return current;
            skipNextSaveRef.current = true;
            return saved;
          });
          setMessage('已自动保存。');
        })
        .catch(() => setMessage('自动保存失败，请稍后重试。'));
    }, 600);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [document, route]);

  useEffect(() => {
    if (reviewAnnotationId && !pageAnnotations.some((annotation) => annotation.id === reviewAnnotationId)) {
      setReviewAnnotationId(undefined);
    }
  }, [pageAnnotations, reviewAnnotationId]);

  useEffect(() => {
    const previousPaddingBottom = window.document.body.style.paddingBottom;
    if (open) {
      window.document.body.style.paddingBottom = `${Math.ceil(window.innerHeight * panelHeight) + 32}px`;
    } else {
      window.document.body.style.paddingBottom = previousPaddingBottom;
    }

    return () => {
      window.document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, [open, panelHeight]);

  useEffect(() => {
    function handlePageMouseDown(event: MouseEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || target.closest('[data-prd-tool="true"]')) return;
      if (mode === 'annotate') return;
      setReviewAnnotationId(undefined);
    }

    window.document.addEventListener('mousedown', handlePageMouseDown);
    return () => window.document.removeEventListener('mousedown', handlePageMouseDown);
  }, [mode]);

  useEffect(() => {
    function dimOnScroll() {
      setToolDimmed(true);
      if (scrollFadeTimerRef.current) window.clearTimeout(scrollFadeTimerRef.current);
      scrollFadeTimerRef.current = window.setTimeout(() => setToolDimmed(false), 700);
    }

    window.addEventListener('scroll', dimOnScroll, true);
    return () => {
      window.removeEventListener('scroll', dimOnScroll, true);
      if (scrollFadeTimerRef.current) window.clearTimeout(scrollFadeTimerRef.current);
    };
  }, []);

  if (!document) return null;

  return (
    <>
      <ElementPicker active={Boolean(pickerMode)} pageId={currentPageId} route={route} onPick={handlePick} />
      <AnnotationMarkers
        annotations={pageAnnotations}
        selectedId={selectedId}
        visible={showMarkers}
        onSelect={(id) => {
          selectNode(id, false);
          setReviewAnnotationId(id);
          setPickerMode(undefined);
          setMode('organize');
        }}
        onMove={(id, markerOffset) => {
          if (!document) return;
          setDocument(updateTreeNode(document, id, (node) => ({ ...node, markerOffset })));
        }}
      />

      <ReviewCardPopover annotation={reviewAnnotation} onClose={() => setReviewAnnotationId(undefined)} />

      {highlightedTarget ? (
        <div
          className="pointer-events-none fixed z-[9998] rounded-xl border-2 border-sky-500 bg-sky-400/10 shadow-[0_0_0_6px_rgba(14,165,233,0.18),0_18px_40px_rgba(14,165,233,0.22)] transition-all"
          data-prd-tool="true"
          style={{ left: highlightedTarget.left, top: highlightedTarget.top, width: highlightedTarget.width, height: highlightedTarget.height }}
        />
      ) : null}

      <div
        className={`fixed z-[9999] flex cursor-grab items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 p-1.5 shadow-2xl shadow-slate-950/15 backdrop-blur-xl transition-opacity active:cursor-grabbing ${toolDimmed && !draggingTool ? 'opacity-35' : 'opacity-100'}`}
        data-prd-tool="true"
        style={{ right: toolPosition.x, bottom: toolPosition.y }}
        onPointerDown={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest('button')) return;
          setDraggingTool(true);
          const startX = event.clientX;
          const startY = event.clientY;
          const baseX = toolPosition.x;
          const baseY = toolPosition.y;

          function handlePointerMove(moveEvent: PointerEvent) {
            setToolPosition({
              x: Math.max(8, baseX - (moveEvent.clientX - startX)),
              y: Math.max(8, baseY - (moveEvent.clientY - startY))
            });
          }

          function handlePointerUp() {
            setDraggingTool(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
          }

          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp);
        }}
      >
        <button className="grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/25 transition hover:scale-105" title="快速标注" type="button" onClick={() => addPageAnnotation({ closeDrawer: true })}>
          <MousePointer2 className="h-5 w-5" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200 transition hover:scale-105 hover:bg-slate-50" title={showMarkers ? '隐藏标注' : '显示标注'} type="button" onClick={() => setShowMarkers((value) => !value)}>
          {showMarkers ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition hover:scale-105" title={open ? '关闭编辑工作台' : '打开编辑工作台'} type="button" onClick={() => setOpen((value) => !value)}>
          <PanelRightOpen className="h-5 w-5" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-x-3 bottom-3 z-[9999] flex min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-[#fbfaf7] shadow-2xl shadow-slate-950/25" data-prd-tool="true" style={{ height: `min(${Math.round(panelHeight * 100)}vh, calc(100vh - 24px))` }}>
          <button className="absolute inset-x-0 top-0 z-10 flex h-4 cursor-ns-resize items-center justify-center bg-transparent" type="button" aria-label="调整工作台高度" onPointerDown={startPanelResize}>
            <span className="h-1 w-16 rounded-full bg-slate-300" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col pt-3">
            <header className="border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">需求标注工作台</p>
                  <h1 className="mt-1 text-base font-semibold text-slate-950">{document.projectName}</h1>
                  <p className="text-xs text-slate-500">底部面板保留页面上下文，规则表有更宽空间可填写。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${mode === 'annotate' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                    type="button"
                    onClick={() => {
                      if (mode === 'annotate') {
                        pendingBindIdRef.current = undefined;
                        setPickerMode(undefined);
                        setMode('organize');
                      } else {
                        pendingBindIdRef.current = undefined;
                        setPickerMode('annotation');
                        setMode('annotate');
                        setOpen(false);
                        setMessage('请选择页面上的字段、按钮或区域；已有标注的位置会打开现有标注，不会直接关联。');
                      }
                    }}
                  >
                    {mode === 'annotate' ? '退出选点' : '标注页面'}
                  </button>
                  <button className={`rounded-full px-4 py-2 text-xs font-semibold ${mode === 'preview' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`} type="button" onClick={() => setMode('preview')}>
                    生成 PRD
                  </button>
                  <button className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700" type="button" onClick={() => setOpen(false)}>
                    关闭
                  </button>
                </div>
              </div>
            </header>

            {message ? <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs text-emerald-700">{message}</div> : null}

            <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
              {mode === 'preview' ? (
                <PrdPreviewPanel document={document} onClose={() => setMode('organize')} />
              ) : (
                <div className="flex h-full min-h-0">
                  <ProjectStructureTree
                    projectName={document.projectName}
                    nodes={getProjectStructureNodes(document.rootNodes)}
                    selectedId={structureSelectedId}
                    selectedNode={structureSelectedNode}
                    suggestions={detectedMenuTree.length > 0 ? detectedMenuTree : suggestions}
                    onSelect={(id) => selectNode(id)}
                    onAddChild={addChild}
                    onRenameProject={(projectName) => setDocument({ ...document, projectName })}
                    onDelete={(id) => {
                      const next = deleteTreeNode(document, id);
                      setDocument(next);
                      setSelectedId(findFirstPageNode(next.rootNodes)?.id);
                    }}
                    onMoveBefore={(sourceId, targetId) => setDocument(moveTreeNodeBefore(document, sourceId, targetId))}
                    onMoveInto={(sourceId, targetParentId) => setDocument(moveTreeNodeInto(document, sourceId, targetParentId))}
                    onDetectMenu={detectMenuStructure}
                    onAcceptSuggestion={acceptSuggestion}
                    onAcceptAllSuggestions={acceptAllSuggestions}
                    onRejectSuggestion={rejectSuggestion}
                    onRejectAllSuggestions={rejectAllSuggestions}
                    onClearStructure={clearStructure}
                  />
                  <PageAnnotationList nodes={pageAnnotationNodes} selectedId={selectedId} onSelect={(id) => selectNode(id)} onAddAnnotation={addPageAnnotation} onAddGroup={addAnnotationGroup} onDeleteSelected={deleteSelected} onDeleteAll={clearPageAnnotations} onDetectPage={detectPageFunctions} onMoveBefore={(sourceId, targetId) => setDocument(moveTreeNodeBefore(document, sourceId, targetId))} onMoveInto={(sourceId, targetParentId) => setDocument(moveTreeNodeInto(document, sourceId, targetParentId))} />
                  <NodeEditor
                    node={selectedNode}
                    onBindPage={(nodeId) => {
                      setSelectedId(nodeId);
                      setPickerMode('bind-page');
                      setMode('annotate');
                      setOpen(false);
                      setMessage('请点击左侧菜单中的对应页面，或点击当前页面主体区域完成绑定。');
                    }}
                    onBindTarget={(nodeId) => {
                      pendingBindIdRef.current = nodeId;
                      setSelectedId(nodeId);
                      setPickerMode('annotation');
                      setMode('annotate');
                      setOpen(false);
                      setMessage('请重新点击页面上的字段、按钮或区域来更新这条标注的绑定。');
                    }}
                    onChange={(node) => setDocument(updateTreeNode(document, node.id, () => node))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
