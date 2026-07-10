import { describe, expect, it } from 'vitest';
import { buildProjectTree } from './project-tree';
import type { RequirementAnnotation } from './types';

function annotation(id: string, group: RequirementAnnotation['group'], scope: RequirementAnnotation['scope'], title: string, route = '/dashboard/outbound'):
  RequirementAnnotation {
  return {
    id,
    pageId: 'dashboard-outbound',
    route,
    group,
    scope,
    target: { elementType: 'other', label: title },
    content: {
      title,
      description: '',
      acceptanceCriteria: [],
      openQuestions: []
    },
    source: 'manual',
    status: 'draft'
  };
}

describe('buildProjectTree', () => {
  it('groups annotations into project > menu group > module > page hierarchy', () => {
    const tree = buildProjectTree({
      menuItems: [
        { label: '仓储', kind: 'group' },
        { label: '出库单', kind: 'module', route: '/dashboard/outbound', parentLabel: '仓储' },
        { label: '库存', kind: 'module', route: '/dashboard/inventory', parentLabel: '仓储' }
      ],
      annotations: [
        annotation('module-desc', '模块说明', 'module', '出库单模块说明'),
        annotation('page-desc', '页面说明', 'page', '出库单页面说明'),
        annotation('filter', '筛选区', 'field', '状态'),
        annotation('action', '页面操作', 'action', '导出')
      ],
      currentRoute: '/dashboard/outbound'
    });

    expect(tree.groups.map((group) => group.label)).toEqual(['仓储']);
    expect(tree.groups[0].modules.map((module) => module.label)).toEqual(['出库单', '库存']);
    expect(tree.currentModule?.label).toBe('出库单');
    expect(tree.currentModule?.pages[0].sections.map((section) => section.label)).toEqual(['页面说明', '筛选区', '页面操作']);
  });

  it('creates a route-backed page node even when annotations exist before menu metadata', () => {
    const tree = buildProjectTree({
      menuItems: [],
      annotations: [annotation('page-desc', '页面说明', 'page', '出库单页面说明')],
      currentRoute: '/dashboard/outbound'
    });

    expect(tree.groups[0].modules[0].pages[0].route).toBe('/dashboard/outbound');
  });

  it('adds child routes as pages under the matched module', () => {
    const tree = buildProjectTree({
      menuItems: [
        { label: '仓储', kind: 'group' },
        { label: '出库单', kind: 'module', route: '/dashboard/outbound', parentLabel: '仓储' }
      ],
      annotations: [annotation('new-page-desc', '页面说明', 'page', '新建出库单页面说明', '/dashboard/outbound/new')],
      currentRoute: '/dashboard/outbound/new'
    });

    expect(tree.currentModule?.label).toBe('出库单');
    expect(tree.currentModule?.pages.map((page) => page.route)).toEqual(['/dashboard/outbound', '/dashboard/outbound/new']);
    expect(tree.currentModule?.pages[1].sections[0].annotations[0].content.title).toBe('新建出库单页面说明');
  });
});
