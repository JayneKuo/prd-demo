import { describe, expect, it } from 'vitest';
import { getAnnotationGroup, groupAnnotations } from './annotation-groups';
import type { RequirementAnnotation } from './types';

function annotation(id: string, elementType: RequirementAnnotation['target']['elementType'], label: string): RequirementAnnotation {
  return {
    id,
    pageId: 'dashboard-outbound',
    route: '/dashboard/outbound',
    target: { elementType, label },
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

describe('annotation grouping', () => {
  it('infers groups from element type when legacy annotations have no group', () => {
    expect(getAnnotationGroup(annotation('nav', 'navigation', '出库单'))).toMatchObject({ scope: 'module', group: '模块说明' });
    expect(getAnnotationGroup(annotation('button', 'button', '导出'))).toMatchObject({ scope: 'action', group: '页面操作' });
    expect(getAnnotationGroup(annotation('field', 'field', '状态'))).toMatchObject({ scope: 'field', group: '筛选区' });
    expect(getAnnotationGroup(annotation('column', 'table-column', '出库单号'))).toMatchObject({ scope: 'field', group: '表格字段' });
  });

  it('returns collapsible tree groups in product order', () => {
    const groups = groupAnnotations([
      annotation('button', 'button', '导出'),
      annotation('nav', 'navigation', '出库单'),
      annotation('column', 'table-column', '出库单号')
    ]);

    expect(groups.map((group) => group.label)).toEqual(['模块说明', '表格字段', '页面操作']);
    expect(groups[0].items[0].content.title).toBe('出库单');
  });
});
