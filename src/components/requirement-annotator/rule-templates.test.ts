import { describe, expect, it } from 'vitest';
import { COMPREHENSIVE_RULE_TABLE_TEMPLATE, appendTemplate } from './rule-templates';

describe('rule templates', () => {
  it('provides a comprehensive field rule table template', () => {
    expect(COMPREHENSIVE_RULE_TABLE_TEMPLATE).toContain('| 字段/对象 | 说明 | 交互规则 | 数据来源 | 校验规则 | 权限规则 | 备注 |');
  });

  it('appends a template after existing content', () => {
    expect(appendTemplate('已有规则', '模板')).toBe('已有规则\n\n模板');
    expect(appendTemplate('', '模板')).toBe('模板');
  });
});
