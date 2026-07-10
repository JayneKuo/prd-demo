import { describe, expect, it } from 'vitest';
import { buildMenuTreeFromRecords, detectMenuItemsFromRecords, getPageBindingFromRecord } from './dom-menu-detector';

describe('dom menu detector', () => {
  it('extracts menu hierarchy from selected menu records', () => {
    expect(
      detectMenuItemsFromRecords([
        { label: '仓储', depth: 0 },
        { label: '入库单', route: '/dashboard/inbound', depth: 1 },
        { label: '出库单', route: '/dashboard/outbound', depth: 1 },
        { label: '销售', depth: 0 },
        { label: '销售订单', route: '/dashboard/orders', depth: 1 }
      ])
    ).toEqual([
      { label: '仓储', kind: 'group' },
      { label: '入库单', kind: 'module', route: '/dashboard/inbound', parentLabel: '仓储' },
      { label: '出库单', kind: 'module', route: '/dashboard/outbound', parentLabel: '仓储' },
      { label: '销售', kind: 'group' },
      { label: '销售订单', kind: 'module', route: '/dashboard/orders', parentLabel: '销售' }
    ]);
  });

  it('builds a nested module-page tree from selected menu records', () => {
    const tree = buildMenuTreeFromRecords([
      { label: '仓储', depth: 0 },
      { label: '入库单', route: '/dashboard/inbound', depth: 1 },
      { label: '新建入库单', route: '/dashboard/inbound/new', depth: 2 },
      { label: '出库单', route: '/dashboard/outbound', depth: 1 }
    ]);

    expect(tree[0]?.title).toBe('仓储');
    expect(tree[0]?.children.map((node) => node.title)).toEqual(['入库单', '出库单']);
    expect(tree[0]?.children[0]?.children.map((node) => node.title)).toEqual(['新建入库单']);
  });

  it('extracts binding data from a clicked menu link record', () => {
    expect(getPageBindingFromRecord({ label: '入库单', route: '/dashboard/inbound' }, '/dashboard/current')).toEqual({ title: '入库单', route: '/dashboard/inbound' });
  });

  it('falls back to current route when binding a page content record', () => {
    expect(getPageBindingFromRecord({ label: '入库单' }, '/dashboard/inbound')).toEqual({ title: '入库单', route: '/dashboard/inbound' });
  });
});
