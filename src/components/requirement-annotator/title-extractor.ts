import type { RequirementElementType } from './types';

type SemanticTitleInput = {
  elementType: RequirementElementType;
  tagName: string;
  text?: string;
  ariaLabel?: string | null;
  placeholder?: string | null;
  title?: string | null;
  role?: string | null;
  insideTable?: boolean;
};

const maxDirectTitleLength = 18;

function cleanText(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function isNoisyStatusText(text: string) {
  const statusWords = ['全部', '待入库', '入库中', '已入库', '异常', '已取消', '待处理', '已发货', '已完成', '已支付'];
  return statusWords.filter((word) => text.includes(word)).length >= 3;
}

function stripTrailingCount(text: string) {
  return text.replace(/\d+$/, '').trim();
}

function conservativeTitle(elementType: RequirementElementType) {
  if (elementType === 'button') return '页面操作';
  if (elementType === 'field' || elementType === 'filter' || elementType === 'table-column') return '页面字段';
  if (elementType === 'section' || elementType === 'card') return '页面区域';
  return '页面区域';
}

export function getSemanticAnnotationTitle(input: SemanticTitleInput) {
  const tagName = input.tagName.toLowerCase();
  const text = cleanText(input.text);
  const placeholder = cleanText(input.placeholder);
  const ariaLabel = cleanText(input.ariaLabel);
  const explicitTitle = cleanText(input.title);

  if (input.role === 'tablist' || isNoisyStatusText(text)) return '状态筛选';
  if (input.insideTable && tagName !== 'th') return tagName === 'button' ? '行操作' : '明细行';
  if (tagName === 'th' && text) return stripTrailingCount(text).slice(0, maxDirectTitleLength);
  if (['input', 'textarea', 'select'].includes(tagName)) return placeholder || ariaLabel || explicitTitle || '搜索条件';

  const direct = stripTrailingCount(ariaLabel || explicitTitle || text);
  if (direct && direct.length <= maxDirectTitleLength) return direct;

  return conservativeTitle(input.elementType);
}
