import type { Capability } from '@/lib/permissions';
import type { Locale } from '@/lib/locale-config';

export type NavItem = {
  title: Record<Locale, string>;
  href: string;
  capabilities: Capability[];
  icon: string;
};

export type NavGroup = {
  title: Record<Locale, string>;
  icon: string;
  defaultOpen?: boolean;
  /** Visual separator before this group */
  separator?: boolean;
  items: NavItem[];
};

export const merchantNavigationGroups: NavGroup[] = [
  // ─── 高频操作区 ───
  {
    title: { 'zh-CN': '首页', 'en-US': 'Home' },
    icon: 'home',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '概览', 'en-US': 'Overview' }, href: '/dashboard/overview', capabilities: ['overview:read'], icon: 'layout-dashboard' },
      { title: { 'zh-CN': '工作台', 'en-US': 'Workspace' }, href: '/dashboard/today', capabilities: ['tasks:read'], icon: 'clipboard-list' },
      { title: { 'zh-CN': '消息中心', 'en-US': 'Messages' }, href: '/dashboard/messages', capabilities: ['messages:read'], icon: 'bell' }
    ]
  },
  {
    title: { 'zh-CN': '销售', 'en-US': 'Sales' },
    icon: 'shopping-cart',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '销售订单', 'en-US': 'Sales Orders' }, href: '/dashboard/orders', capabilities: ['orders:read'], icon: 'file-text' },
      { title: { 'zh-CN': '履约单', 'en-US': 'Fulfillment' }, href: '/dashboard/fulfillment', capabilities: ['orders:read'], icon: 'package-check' },
      { title: { 'zh-CN': '退货/售后', 'en-US': 'Returns' }, href: '/dashboard/returns', capabilities: ['orders:read'], icon: 'package-x' },
      { title: { 'zh-CN': '客户', 'en-US': 'Customers' }, href: '/dashboard/customers', capabilities: ['customers:read'], icon: 'users' },
      { title: { 'zh-CN': '工单', 'en-US': 'Tickets' }, href: '/dashboard/tickets', capabilities: ['tickets:read'], icon: 'clipboard-check' }
    ]
  },
  {
    title: { 'zh-CN': '仓储', 'en-US': 'Warehouse' },
    icon: 'warehouse',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '入库单', 'en-US': 'Inbound' }, href: '/dashboard/inbound', capabilities: ['inventory:read'], icon: 'package-plus' },
      { title: { 'zh-CN': '出库单', 'en-US': 'Outbound' }, href: '/dashboard/outbound', capabilities: ['inventory:read'], icon: 'package-minus' },
      { title: { 'zh-CN': '库存', 'en-US': 'Inventory' }, href: '/dashboard/inventory', capabilities: ['inventory:read'], icon: 'boxes' },
      { title: { 'zh-CN': '仓库/库位', 'en-US': 'Locations' }, href: '/dashboard/warehouses', capabilities: ['inventory:read'], icon: 'map-pin' },
      { title: { 'zh-CN': '调拨', 'en-US': 'Transfers' }, href: '/dashboard/transfers', capabilities: ['inventory:write'], icon: 'arrow-left-right' },
      { title: { 'zh-CN': '盘点', 'en-US': 'Stocktake' }, href: '/dashboard/stocktake', capabilities: ['inventory:write'], icon: 'clipboard-check' }
    ]
  },
  {
    title: { 'zh-CN': '运输', 'en-US': 'Shipping' },
    icon: 'truck',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '运输单', 'en-US': 'Shipments' }, href: '/dashboard/shipments', capabilities: ['orders:read'], icon: 'file-text' },
      { title: { 'zh-CN': '物流跟踪', 'en-US': 'Tracking' }, href: '/dashboard/tracking', capabilities: ['orders:read'], icon: 'map' },
      { title: { 'zh-CN': '承运商', 'en-US': 'Carriers' }, href: '/dashboard/carriers', capabilities: ['orders:read'], icon: 'building' },
      { title: { 'zh-CN': '承运商映射', 'en-US': 'Carrier Mapping' }, href: '/dashboard/carriers/mapping', capabilities: ['orders:read'], icon: 'link' },
      { title: { 'zh-CN': '运费管理', 'en-US': 'Freight' }, href: '/dashboard/freight', capabilities: ['orders:read'], icon: 'circle-dollar-sign' }
    ]
  },
  {
    title: { 'zh-CN': '采购', 'en-US': 'Procurement' },
    icon: 'shopping-bag',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '采购计划', 'en-US': 'Purchase Plans' }, href: '/dashboard/purchase-plans', capabilities: ['procurement:read'], icon: 'clipboard-list' },
      { title: { 'zh-CN': '采购订单', 'en-US': 'Purchase Orders' }, href: '/dashboard/purchase-orders', capabilities: ['procurement:read'], icon: 'file-plus' },
      { title: { 'zh-CN': '采购退货', 'en-US': 'Purchase Returns' }, href: '/dashboard/purchase-returns', capabilities: ['procurement:read'], icon: 'file-minus' },
      { title: { 'zh-CN': '供应商', 'en-US': 'Suppliers' }, href: '/dashboard/suppliers', capabilities: ['procurement:read'], icon: 'building' },
      { title: { 'zh-CN': '采购建议', 'en-US': 'Replenishment' }, href: '/dashboard/replenishment', capabilities: ['procurement:read'], icon: 'lightbulb' }
    ]
  },

  // ─── 数据管理与分析 ───
  {
    title: { 'zh-CN': '商品', 'en-US': 'Products' },
    icon: 'tag',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '商品中心', 'en-US': 'Product Center' }, href: '/dashboard/products', capabilities: ['inventory:read'], icon: 'box' },
      { title: { 'zh-CN': '分类与属性', 'en-US': 'Categories' }, href: '/dashboard/categories', capabilities: ['inventory:read'], icon: 'layers' },
      { title: { 'zh-CN': '商品映射', 'en-US': 'Product Mapping' }, href: '/dashboard/product-mapping', capabilities: ['inventory:read'], icon: 'link' },
      { title: { 'zh-CN': '组合商品', 'en-US': 'Bundles' }, href: '/dashboard/bundles', capabilities: ['inventory:read'], icon: 'combine' },
      { title: { 'zh-CN': '发布记录', 'en-US': 'Publish Log' }, href: '/dashboard/publish-log', capabilities: ['inventory:read'], icon: 'upload' }
    ]
  },
  {
    title: { 'zh-CN': '财务', 'en-US': 'Finance' },
    icon: 'circle-dollar-sign',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '财务概览', 'en-US': 'Finance Overview' }, href: '/dashboard/finance', capabilities: ['finance:read'], icon: 'layout-dashboard' },
      { title: { 'zh-CN': '应收账款', 'en-US': 'Accounts Receivable' }, href: '/dashboard/receivables', capabilities: ['finance:read'], icon: 'trending-up' },
      { title: { 'zh-CN': '应付账款', 'en-US': 'Accounts Payable' }, href: '/dashboard/payables', capabilities: ['finance:read'], icon: 'trending-down' },
      { title: { 'zh-CN': '财务报表', 'en-US': 'Financial Reports' }, href: '/dashboard/reports/finance', capabilities: ['finance:read'], icon: 'bar-chart-2' },
    ]
  },
  {
    title: { 'zh-CN': '报表', 'en-US': 'Reports' },
    icon: 'bar-chart-3',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '销售报表', 'en-US': 'Sales Reports' }, href: '/dashboard/reports/sales', capabilities: ['reports:read'], icon: 'pie-chart' },
      { title: { 'zh-CN': '库存报表', 'en-US': 'Inventory Reports' }, href: '/dashboard/reports/inventory', capabilities: ['reports:read'], icon: 'bar-chart-2' },
      { title: { 'zh-CN': '采购报表', 'en-US': 'Purchasing Reports' }, href: '/dashboard/reports/purchasing', capabilities: ['reports:read'], icon: 'file-bar-chart' },
      { title: { 'zh-CN': '履约报表', 'en-US': 'Fulfillment Reports' }, href: '/dashboard/reports/fulfillment', capabilities: ['reports:read'], icon: 'timer' },
    ]
  },

  // ─── 数据管理 ───
  {
    title: { 'zh-CN': '数据管理', 'en-US': 'Data Management' },
    icon: 'upload',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': '数据导入', 'en-US': 'Import' }, href: '/dashboard/data/import', capabilities: ['data:import'], icon: 'upload' },
      { title: { 'zh-CN': '数据导出', 'en-US': 'Export' }, href: '/dashboard/data/export', capabilities: ['data:export'], icon: 'file-bar-chart' },
      { title: { 'zh-CN': '操作日志', 'en-US': 'Activity Log' }, href: '/dashboard/data/audit-log', capabilities: ['audit:read'], icon: 'scroll-text' }
    ]
  },

  // ─── 规则与策略 ───
  {
    title: { 'zh-CN': '策略中心', 'en-US': 'Rules & Policies' },
    icon: 'settings-2',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '履约规则', 'en-US': 'Fulfillment Rules' }, href: '/dashboard/rules/fulfillment', capabilities: ['orders:write'], icon: 'git-branch' },
      { title: { 'zh-CN': '库存同步规则', 'en-US': 'Inventory Sync' }, href: '/dashboard/rules/inventory-sync', capabilities: ['inventory:write'], icon: 'refresh-cw' },
      { title: { 'zh-CN': '补货规则', 'en-US': 'Replenishment Rules' }, href: '/dashboard/rules/replenishment', capabilities: ['inventory:write'], icon: 'archive-restore' },
      { title: { 'zh-CN': '价格规则', 'en-US': 'Pricing Rules' }, href: '/dashboard/rules/pricing', capabilities: ['orders:write'], icon: 'percent' }
    ]
  },

  // ─── 扩展 ───
  {
    title: { 'zh-CN': '插件', 'en-US': 'Apps' },
    icon: 'plug',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': 'App Store', 'en-US': 'App Store' }, href: '/dashboard/apps', capabilities: ['apps:read'], icon: 'grid-2x2' }
    ]
  },

  // ─── 平台 ───
  {
    title: { 'zh-CN': '开发者', 'en-US': 'Developers' },
    icon: 'code-2',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': '销售订单 / 出库日志', 'en-US': 'Sales / Outbound Logs' }, href: '/dashboard/developers/logs', capabilities: ['developer:read'], icon: 'activity' },
      { title: { 'zh-CN': 'PO / 入库日志', 'en-US': 'PO / Inbound Logs' }, href: '/dashboard/developers/logs/purchase-inbound', capabilities: ['developer:read'], icon: 'clipboard-list' },
      { title: { 'zh-CN': '调拨日志', 'en-US': 'Transfer Logs' }, href: '/dashboard/developers/logs/transfers', capabilities: ['developer:read'], icon: 'arrow-left-right' },
      { title: { 'zh-CN': '库存日志', 'en-US': 'Inventory Logs' }, href: '/dashboard/developers/logs/inventory', capabilities: ['developer:read'], icon: 'boxes' },
      { title: { 'zh-CN': 'Webhooks', 'en-US': 'Webhooks' }, href: '/dashboard/developers/webhooks', capabilities: ['developer:read'], icon: 'webhook' },
      { title: { 'zh-CN': 'API 密钥', 'en-US': 'API Keys' }, href: '/dashboard/developers/api-keys', capabilities: ['developer:read'], icon: 'key' },
      { title: { 'zh-CN': 'MCP / Agent', 'en-US': 'MCP / Agent' }, href: '/dashboard/developers/mcp', capabilities: ['developer:read'], icon: 'bot' }
    ]
  },
  {
    title: { 'zh-CN': '组织', 'en-US': 'Organization' },
    icon: 'building-2',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '公司管理', 'en-US': 'Companies' }, href: '/dashboard/org/companies', capabilities: ['settings:read'], icon: 'briefcase' },
      { title: { 'zh-CN': 'Merchant 管理', 'en-US': 'Merchants' }, href: '/dashboard/org/merchants', capabilities: ['settings:read'], icon: 'store' },
      { title: { 'zh-CN': '用户管理', 'en-US': 'Users' }, href: '/dashboard/org/users', capabilities: ['access:manage'], icon: 'users' },
      { title: { 'zh-CN': '角色管理', 'en-US': 'Roles' }, href: '/dashboard/org/roles', capabilities: ['access:manage'], icon: 'shield' },
      { title: { 'zh-CN': '菜单权限', 'en-US': 'Menu Permissions' }, href: '/dashboard/org/menu-permissions', capabilities: ['access:manage'], icon: 'sliders' },
      { title: { 'zh-CN': '团队', 'en-US': 'Teams' }, href: '/dashboard/org/teams', capabilities: ['access:manage'], icon: 'users' },
      { title: { 'zh-CN': '审计日志', 'en-US': 'Audit Log' }, href: '/dashboard/org/audit', capabilities: ['access:manage'], icon: 'scroll-text' }
    ]
  },
  {
    title: { 'zh-CN': '设置', 'en-US': 'Settings' },
    icon: 'settings',
    defaultOpen: false,
    items: [
      { title: { 'zh-CN': '渠道配置', 'en-US': 'Channels' }, href: '/dashboard/settings/channels', capabilities: ['settings:read'], icon: 'share-2' },
      { title: { 'zh-CN': '通知与预警', 'en-US': 'Notifications' }, href: '/dashboard/settings/notifications', capabilities: ['settings:read'], icon: 'bell' },
      { title: { 'zh-CN': '审批流程', 'en-US': 'Approvals' }, href: '/dashboard/settings/approvals', capabilities: ['settings:write'], icon: 'check-circle' },
      { title: { 'zh-CN': '系统偏好', 'en-US': 'Preferences' }, href: '/dashboard/settings/preferences', capabilities: ['settings:read'], icon: 'sliders' }
    ]
  },
  {
    title: { 'zh-CN': '帮助', 'en-US': 'Help' },
    icon: 'lightbulb',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': '帮助中心', 'en-US': 'Help Center' }, href: '/dashboard/help', capabilities: ['help:read'], icon: 'lightbulb' },
      { title: { 'zh-CN': '提交工单', 'en-US': 'Submit Ticket' }, href: '/dashboard/help/submit-ticket', capabilities: ['tickets:write'], icon: 'file-plus' }
    ]
  }
];
