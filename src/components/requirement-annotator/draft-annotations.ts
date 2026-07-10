import { normalizeAnnotationHierarchy } from './annotation-groups';
import type { RequirementAnnotation, RequirementElementType } from './types';

function getElementType(element: HTMLElement): RequirementElementType {
  const role = element.getAttribute('role');
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'button' || role === 'button') {
    return 'button';
  }

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return 'field';
  }

  if (tagName === 'th') {
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

function getLabel(element: HTMLElement) {
  return (
    element.dataset.prdLabel ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ||
    element.tagName.toLowerCase()
  );
}

function getSelector(element: HTMLElement, index: number) {
  if (element.dataset.prdId) {
    return `[data-prd-id="${element.dataset.prdId}"]`;
  }

  if (element.id) {
    return `#${element.id}`;
  }

  element.dataset.prdAutoId = element.dataset.prdAutoId || `auto-${index}`;
  return `[data-prd-auto-id="${element.dataset.prdAutoId}"]`;
}

export function generateDraftAnnotations({
  pageId,
  route,
  existingIds
}: {
  pageId: string;
  route: string;
  existingIds: Set<string>;
}): RequirementAnnotation[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('main button, main input, main textarea, main select, main th, main section, aside nav'))
    .filter((element) => !element.closest('[data-prd-tool="true"]'))
    .slice(0, 40);

  return candidates.flatMap((element, index) => {
    const selector = getSelector(element, index);
    const id = `draft-${pageId}-${selector.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;

    if (existingIds.has(id)) {
      return [];
    }

    const label = getLabel(element);

    const annotation = normalizeAnnotationHierarchy({
      id,
      pageId,
      route,
      order: index,
      target: {
        selector,
        prdId: element.dataset.prdId,
        label,
        elementType: getElementType(element)
      },
      content: {
        title: label,
        description: `AI 草稿：请补充「${label}」在当前页面中的业务含义。`,
        interactionRule: element.tagName.toLowerCase() === 'button' ? `点击「${label}」后应触发对应业务操作。` : undefined,
        acceptanceCriteria: [`确认「${label}」的展示、交互和异常状态符合业务预期。`],
        openQuestions: [`「${label}」的数据来源、权限或边界规则是否需要补充？`]
      },
      source: 'ai',
      status: 'draft'
    });

    return [annotation];
  });
}
