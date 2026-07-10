import { getNodeTypeLabel, migrateToProjectDocument } from './tree-document';
import type { RequirementDocument, RequirementNodeContent, RequirementTreeNode } from './types';

function optionalLine(label: string, value?: string) {
  return value?.trim() ? `- **${label}：** ${value.trim()}` : '';
}

function listOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

function ordered(nodes: RequirementTreeNode[]) {
  return [...nodes].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function tableCell(value?: string) {
  return (value?.trim() || '-').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function renderRules(content: RequirementNodeContent) {
  if (content.rules.length === 0) return '';
  return [
    '| Subject | Rule | Condition | System Behavior / Hint | Notes |',
    '| --- | --- | --- | --- | --- |',
    ...content.rules.map((rule) => `| ${tableCell(rule.subject || rule.type)} | ${tableCell(rule.description)} | ${tableCell(rule.condition)} | ${tableCell(rule.behavior)} | ${tableCell(rule.notes)} |`)
  ].join('\n');
}

function collect(nodes: RequirementTreeNode[], selector: (content: RequirementNodeContent) => string[]): string[] {
  return nodes.flatMap((node) => [...selector(node.content), ...collect(node.children, selector)]);
}

function renderFlow(node: RequirementTreeNode) {
  const flow = node.content.flow;
  if (!flow) return '';

  const steps = [...flow.steps]
    .sort((a, b) => a.order - b.order)
    .map((step, index) => {
      const exception = step.exception ? ` 异常情况：${step.exception}` : '';
      return `${index + 1}. ${step.action} 预期结果：${step.expectedResult}。${exception}`;
    })
    .join('\n');

  return [
    optionalLine('角色', flow.actor),
    optionalLine('触发条件', flow.trigger),
    '**前置条件：**',
    listOrFallback(flow.preconditions, '暂无前置条件。'),
    '',
    '**流程步骤：**',
    steps || '1. 暂无流程步骤。',
    '',
    optionalLine('结束状态', flow.endState)
  ]
    .filter(Boolean)
    .join('\n');
}

function renderNode(node: RequirementTreeNode, depth = 2): string {
  const heading = '#'.repeat(Math.min(depth, 5));
  const lines = [
    `${heading} ${node.title}`,
    '',
    `- **类型：** ${getNodeTypeLabel(node.type)}`,
    node.route ? `- **路由：** ${node.route}` : '',
    node.target ? `- **绑定元素：** ${node.target.label || node.target.prdId || node.target.selector || node.id} (\`${node.target.elementType}\`)` : '',
    optionalLine('目标', node.content.goal),
    optionalLine('说明', node.content.description),
    node.content.actors.length > 0 ? `- **角色：** ${node.content.actors.join('、')}` : '',
    renderRules(node.content),
    node.type === 'flow' ? renderFlow(node) : ''
  ].filter(Boolean);

  const children = ordered(node.children).map((child) => renderNode(child, depth + 1)).join('\n\n');
  return [lines.join('\n'), children].filter(Boolean).join('\n\n');
}

export function generatePrdMarkdown(input: RequirementDocument) {
  const document = migrateToProjectDocument(input);
  const allNodes = ordered(document.rootNodes);
  const acceptanceCriteria = collect(allNodes, (content) => content.acceptanceCriteria);
  const openQuestions = collect(allNodes, (content) => content.openQuestions);

  return [
    `# PRD：${document.projectName}`,
    '',
    '## 1. 项目结构与需求说明',
    allNodes.length > 0 ? allNodes.map((node) => renderNode(node, 3)).join('\n\n') : '暂无项目结构。',
    '',
    '## 2. 验收标准',
    listOrFallback(acceptanceCriteria, '暂无验收标准。'),
    '',
    '## 3. 待确认问题',
    listOrFallback(openQuestions, '暂无待确认问题。'),
    ''
  ].join('\n');
}
