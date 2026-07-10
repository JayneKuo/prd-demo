import { describe, expect, it } from 'vitest';
import { getSemanticAnnotationTitle } from './title-extractor';

describe('semantic annotation titles', () => {
  it('abstracts status tab text into a status filter title', () => {
    expect(
      getSemanticAnnotationTitle({
        elementType: 'other',
        tagName: 'div',
        text: '全部12 待入库3 入库中5 已入库3 异常2 已取消1',
        role: 'tablist'
      })
    ).toBe('状态筛选');
  });

  it('keeps table column headers as field titles', () => {
    expect(
      getSemanticAnnotationTitle({
        elementType: 'table-column',
        tagName: 'th',
        text: '入库单号'
      })
    ).toBe('入库单号');
  });

  it('abstracts table row text into a detail title', () => {
    expect(
      getSemanticAnnotationTitle({
        elementType: 'other',
        tagName: 'tr',
        text: 'IB-20260604-0002 入库中 采购入库 PO-20260530-0008 Guangzhou Electronics',
        insideTable: true
      })
    ).toBe('明细行');
  });

  it('uses form control labels before long visible text', () => {
    expect(
      getSemanticAnnotationTitle({
        elementType: 'field',
        tagName: 'input',
        ariaLabel: '搜索',
        placeholder: '入库单号',
        text: ''
      })
    ).toBe('入库单号');
  });

  it('falls back to conservative titles for long noisy text', () => {
    expect(
      getSemanticAnnotationTitle({
        elementType: 'other',
        tagName: 'div',
        text: '入库单仓库入库收货管理 Northwind Trading Ltd 全部仓库 采购入库 退货入库 质检中 质检通过'
      })
    ).toBe('页面区域');
  });
});
