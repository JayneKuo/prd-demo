import { flattenTreeNodes } from './tree-document';
import type { RequirementAnnotation, RequirementProjectDocument, RequirementRule, RequirementStatus, RequirementTreeNode } from './types';

function elementTypeFromNode(node: RequirementTreeNode): RequirementAnnotation['target']['elementType'] {
  if (node.type === 'action') return 'button';
  if (node.type === 'section') return 'section';
  if (node.type === 'field') return 'field';
  return 'other';
}

export function getReviewNodesForPage(document: RequirementProjectDocument, page: { route?: string; pageId?: string }): RequirementTreeNode[] {
  return flattenTreeNodes(document.rootNodes)
    .filter((node) => node.target && ((page.route && node.route === page.route) || (page.pageId && node.pageId === page.pageId)))
    .map((node, index) => ({ ...node, order: node.order ?? index }));
}

export function getReviewNodesForRoute(document: RequirementProjectDocument, route: string): RequirementTreeNode[] {
  return getReviewNodesForPage(document, { route });
}

export function getReviewAnnotationsForRoute(document: RequirementProjectDocument, route: string): RequirementAnnotation[] {
  return getReviewNodesForRoute(document, route)
    .map((node, index) => ({
      id: node.id,
      pageId: node.pageId || document.pageId,
      route: node.route || document.route,
      target: node.target || { elementType: elementTypeFromNode(node), label: node.title },
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

const statusLabels: Record<RequirementStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  todo: '待实现',
  implemented: '已实现'
};

function joinList(value: string[]) {
  return value.filter(Boolean).join('\n');
}

function tableCell(value?: string) {
  return value?.trim() || '-';
}

function renderRulesTable(rules: RequirementRule[] = []) {
  if (rules.length === 0) return '';
  return [
    '| 对象/字段 | 规则说明 | 触发条件 | 系统表现 | 备注 |',
    '| --- | --- | --- | --- | --- |',
    ...rules.map((rule) => `| ${tableCell(rule.subject || rule.type)} | ${tableCell(rule.description)} | ${tableCell(rule.condition)} | ${tableCell(rule.behavior)} | ${tableCell(rule.notes)} |`)
  ].join('\n');
}

export function getStatusLabel(status: RequirementStatus) {
  return statusLabels[status];
}

export function getReviewCard(node: RequirementTreeNode) {
  const sections = [
    { label: '说明', value: node.content.description },
    { label: '业务规则', value: node.content.businessRule || '' },
    { label: '交互规则', value: node.content.interactionRule || '' },
    { label: '数据来源', value: node.content.dataSource || '' },
    { label: '校验规则', value: node.content.validationRule || '' },
    { label: '权限规则', value: node.content.permissionRule || '' },
    { label: '规则表', value: renderRulesTable(node.content.rules) },
    { label: '验收标准', value: joinList(node.content.acceptanceCriteria) },
    { label: '待确认问题', value: joinList(node.content.openQuestions) }
  ].filter((section) => section.value.trim());

  return {
    id: node.id,
    title: node.title,
    status: node.content.status,
    statusLabel: getStatusLabel(node.content.status),
    sections
  };
}
