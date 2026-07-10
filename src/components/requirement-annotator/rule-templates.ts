export const COMPREHENSIVE_RULE_TABLE_TEMPLATE = `| 字段/对象 | 说明 | 交互规则 | 数据来源 | 校验规则 | 权限规则 | 备注 |
| - | - | - | - | - | - | - |
| 示例字段 | 描述字段含义 | 描述用户操作和系统反馈 | 用户输入/API/系统生成 | 必填、格式、范围等 | 哪些角色可见/可编辑 | 其他补充 |`;

export function appendTemplate(value: string, template: string) {
  return value.trim() ? `${value.trim()}\n\n${template}` : template;
}
