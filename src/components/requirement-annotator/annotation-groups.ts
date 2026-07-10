import type { RequirementAnnotation, RequirementGroup, RequirementScope } from './types';

export const GROUP_ORDER: RequirementGroup[] = ['模块说明', '页面说明', '筛选区', '表格字段', '页面操作', '业务流程', '其他'];

type AnnotationGroupMeta = {
  scope: RequirementScope;
  group: RequirementGroup;
};

export type AnnotationTreeGroup = {
  label: RequirementGroup;
  items: RequirementAnnotation[];
};

export function getAnnotationGroup(annotation: RequirementAnnotation): AnnotationGroupMeta {
  if (annotation.scope && annotation.group) {
    return { scope: annotation.scope, group: annotation.group };
  }

  switch (annotation.target.elementType) {
    case 'navigation':
      return { scope: 'module', group: '模块说明' };
    case 'filter':
    case 'field':
      return { scope: 'field', group: '筛选区' };
    case 'table-column':
      return { scope: 'field', group: '表格字段' };
    case 'button':
      return { scope: 'action', group: '页面操作' };
    case 'section':
    case 'card':
      return { scope: 'section', group: '页面说明' };
    default:
      return { scope: 'other', group: '其他' };
  }
}

export function normalizeAnnotationHierarchy(annotation: RequirementAnnotation): RequirementAnnotation {
  const meta = getAnnotationGroup(annotation);

  return {
    ...annotation,
    scope: annotation.scope || meta.scope,
    group: annotation.group || meta.group
  };
}

export function groupAnnotations(annotations: RequirementAnnotation[]): AnnotationTreeGroup[] {
  const normalized = annotations.map(normalizeAnnotationHierarchy);

  return GROUP_ORDER.map((label) => ({
    label,
    items: normalized
      .filter((annotation) => annotation.group === label)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.content.title.localeCompare(b.content.title))
  })).filter((group) => group.items.length > 0);
}
