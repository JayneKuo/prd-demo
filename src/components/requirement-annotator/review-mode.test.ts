import { describe, expect, it } from 'vitest';
import { createEmptyProjectDocument, createNode, addTreeNode } from './tree-document';
import { getReviewAnnotationsForRoute, getReviewCard, getStatusLabel } from './review-mode';

describe('review mode helpers', () => {
  it('returns annotations for the current route without requiring the editor panel selection', () => {
    const document = createEmptyProjectDocument('/dashboard/inbound', '2026-06-29T00:00:00.000Z');
    const annotation = createNode({
      type: 'field',
      title: '仓库字段',
      route: '/dashboard/inbound',
      pageId: 'dashboard-inbound',
      target: { elementType: 'field', label: '仓库', selector: 'input[name="warehouse"]' },
      content: { description: '选择入库仓库。' }
    });
    const page = createNode({ type: 'page', title: '入库单', route: '/dashboard/inbound', pageId: 'dashboard-inbound', children: [annotation] });
    const moduleNode = createNode({ type: 'module', title: '仓储', children: [page] });
    const withTree = addTreeNode(document, 'root', moduleNode);

    expect(getReviewAnnotationsForRoute(withTree, '/dashboard/inbound').map((item) => item.id)).toEqual([annotation.id]);
  });

  it('builds a full review card from an annotation', () => {
    const annotation = createNode({
      type: 'action',
      title: '提交入库单',
      route: '/dashboard/inbound/new',
      pageId: 'dashboard-inbound-new',
      target: { elementType: 'button', label: '提交' },
      content: {
        description: '提交后创建入库单。',
        businessRule: '| 条件 | 规则 |\n| - | - |\n| 库存 | 必须充足 |',
        interactionRule: '点击后显示 loading。',
        dataSource: '商品库存服务。',
        validationRule: 'SKU 必填。',
        permissionRule: '仓库管理员可提交。',
        rules: [{ id: 'rule-submit', subject: '提交按钮', description: '点击后创建入库单。', condition: '表单校验通过。', behavior: '显示 loading 并提交。', notes: '失败时保留填写内容。' }],
        acceptanceCriteria: ['提交成功后返回列表。'],
        openQuestions: ['是否需要审批？'],
        status: 'confirmed'
      }
    });

    expect(getReviewCard(annotation)).toEqual({
      id: annotation.id,
      title: '提交入库单',
      status: 'confirmed',
      statusLabel: '已确认',
      sections: [
        { label: '说明', value: '提交后创建入库单。' },
        { label: '业务规则', value: '| 条件 | 规则 |\n| - | - |\n| 库存 | 必须充足 |' },
        { label: '交互规则', value: '点击后显示 loading。' },
        { label: '数据来源', value: '商品库存服务。' },
        { label: '校验规则', value: 'SKU 必填。' },
        { label: '权限规则', value: '仓库管理员可提交。' },
        { label: '规则表', value: '| 对象/字段 | 规则说明 | 触发条件 | 系统表现 | 备注 |\n| --- | --- | --- | --- | --- |\n| 提交按钮 | 点击后创建入库单。 | 表单校验通过。 | 显示 loading 并提交。 | 失败时保留填写内容。 |' },
        { label: '验收标准', value: '提交成功后返回列表。' },
        { label: '待确认问题', value: '是否需要审批？' }
      ]
    });
  });

  it('localizes requirement statuses', () => {
    expect(getStatusLabel('draft')).toBe('草稿');
    expect(getStatusLabel('confirmed')).toBe('已确认');
    expect(getStatusLabel('todo')).toBe('待实现');
    expect(getStatusLabel('implemented')).toBe('已实现');
  });
});
