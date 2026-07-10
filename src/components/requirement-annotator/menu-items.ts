import type { ProjectMenuItem } from './project-tree';

export const DEFAULT_MENU_ITEMS: ProjectMenuItem[] = [
  { label: '首页', kind: 'group' },
  { label: '销售', kind: 'group' },
  { label: '履约', kind: 'group' },
  { label: '仓储', kind: 'group' },
  { label: '采购', kind: 'group' },
  { label: '概览', kind: 'module', route: '/dashboard/overview', parentLabel: '首页' },
  { label: '工作台', kind: 'module', route: '/dashboard/today', parentLabel: '首页' },
  { label: '消息中心', kind: 'module', route: '/dashboard/messages', parentLabel: '首页' },
  { label: '出库单', kind: 'module', route: '/dashboard/outbound', parentLabel: '仓储' },
  { label: '库存', kind: 'module', route: '/dashboard/inventory', parentLabel: '仓储' },
  { label: '订单', kind: 'module', route: '/dashboard/orders', parentLabel: '销售' }
];
