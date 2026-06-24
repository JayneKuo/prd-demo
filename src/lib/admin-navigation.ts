import type { Capability } from '@/lib/permissions';
import type { Locale } from '@/lib/locale-config';

export type AdminNavItem = {
  title: Record<Locale, string>;
  href: string;
  description: Record<Locale, string>;
  capabilities: Capability[];
  icon: string;
};

export type AdminNavGroup = {
  title: Record<Locale, string>;
  icon: string;
  defaultOpen?: boolean;
  separator?: boolean;
  items: AdminNavItem[];
};

export const adminNavigationGroups: AdminNavGroup[] = [
  {
    title: { 'zh-CN': '公司', 'en-US': 'Company' },
    icon: 'building-2',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '总览', 'en-US': 'Overview' }, href: '/admin', description: { 'zh-CN': '公司级健康状况、风险与优先工作', 'en-US': 'Company-level health, risks, and priority work' }, capabilities: ['overview:read'], icon: 'layout-dashboard' },
      { title: { 'zh-CN': '租户管理', 'en-US': 'Tenants' }, href: '/admin/tenants', description: { 'zh-CN': '管理租户生命周期、环境与套餐', 'en-US': 'Manage tenant lifecycle, environments, and plans' }, capabilities: ['settings:read'], icon: 'building' },
      { title: { 'zh-CN': '商户管理', 'en-US': 'Merchants' }, href: '/admin/merchants', description: { 'zh-CN': '管理商户归属、渠道与上线状态', 'en-US': 'Manage merchant ownership, channels, and launch state' }, capabilities: ['settings:read'], icon: 'store' }
    ]
  },
  {
    title: { 'zh-CN': '订单与交易', 'en-US': 'Orders & Transactions' },
    icon: 'file-text',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '销售订单', 'en-US': 'Sales Orders' }, href: '/admin/orders', description: { 'zh-CN': '查看与管理销售订单、支付和履约', 'en-US': 'View and manage sales orders, payments, and fulfillment' }, capabilities: ['settings:read'], icon: 'file-text' }
    ]
  },
  {
    title: { 'zh-CN': '人员与权限', 'en-US': 'People & Access' },
    icon: 'shield',
    defaultOpen: true,
    items: [
      { title: { 'zh-CN': '用户与权限', 'en-US': 'Users & Access' }, href: '/admin/access', description: { 'zh-CN': '管理内部角色、商户用户与提权访问', 'en-US': 'Manage internal roles, merchant users, and elevated access' }, capabilities: ['access:manage'], icon: 'users' },
      { title: { 'zh-CN': '审计日志', 'en-US': 'Audit Logs' }, href: '/admin/audit', description: { 'zh-CN': '审查特权操作与客服介入记录', 'en-US': 'Review privileged actions and support interventions' }, capabilities: ['access:manage'], icon: 'scroll-text' }
    ]
  },
  {
    title: { 'zh-CN': '运维', 'en-US': 'Operations' },
    icon: 'activity',
    defaultOpen: true,
    separator: true,
    items: [
      { title: { 'zh-CN': '商户上线', 'en-US': 'Onboarding' }, href: '/admin/onboarding', description: { 'zh-CN': '跟踪实施进度与上线准备状态', 'en-US': 'Track implementation progress and launch readiness' }, capabilities: ['settings:read'], icon: 'check-circle' },
      { title: { 'zh-CN': '运维监控', 'en-US': 'Operations Monitor' }, href: '/admin/operations', description: { 'zh-CN': '查看同步失败、队列、令牌与事件', 'en-US': 'Review sync failures, queues, tokens, and incidents' }, capabilities: ['settings:read'], icon: 'activity' },
      { title: { 'zh-CN': '系统健康', 'en-US': 'System Health' }, href: '/admin/monitoring', description: { 'zh-CN': '服务状态、API 延迟、错误率大盘', 'en-US': 'Service status, API latency, and error rate dashboard' }, capabilities: ['settings:read'], icon: 'bar-chart-2' }
    ]
  },
  {
    title: { 'zh-CN': '商务', 'en-US': 'Commercial' },
    icon: 'circle-dollar-sign',
    defaultOpen: true,
    separator: true,
    items: [
      { title: { 'zh-CN': '套餐与计费', 'en-US': 'Plans & Billing' }, href: '/admin/billing', description: { 'zh-CN': '管理套餐、用量控制、续费与计费风险', 'en-US': 'Manage plans, usage controls, renewals, and billing risk' }, capabilities: ['finance:read'], icon: 'banknote' },
      { title: { 'zh-CN': '合同管理', 'en-US': 'Contracts' }, href: '/admin/contracts', description: { 'zh-CN': 'SaaS 服务协议、条款与续签跟踪', 'en-US': 'SaaS agreements, service terms, and renewal tracking' }, capabilities: ['finance:read'], icon: 'file-text' }
    ]
  },
  {
    title: { 'zh-CN': '内容与沟通', 'en-US': 'Content & Comms' },
    icon: 'bell',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': '系统公告', 'en-US': 'Announcements' }, href: '/admin/announcements', description: { 'zh-CN': '全平台公告与维护通知', 'en-US': 'System-wide announcements and maintenance notices' }, capabilities: ['settings:write'], icon: 'bell' },
      { title: { 'zh-CN': '工单管理', 'en-US': 'Tickets' }, href: '/admin/tickets', description: { 'zh-CN': '商户支持工单、升级与 SLA 跟踪', 'en-US': 'Merchant support tickets, escalations, and SLA tracking' }, capabilities: ['tickets:read'], icon: 'clipboard-check' }
    ]
  },
  {
    title: { 'zh-CN': '平台配置', 'en-US': 'Platform Config' },
    icon: 'settings',
    defaultOpen: false,
    separator: true,
    items: [
      { title: { 'zh-CN': '功能开关', 'en-US': 'Feature Flags' }, href: '/admin/feature-flags', description: { 'zh-CN': '按租户、商户或全局切换功能', 'en-US': 'Toggle features per tenant, merchant, or globally' }, capabilities: ['settings:write'], icon: 'sliders' },
      { title: { 'zh-CN': '数据迁移', 'en-US': 'Data Migration' }, href: '/admin/data-migration', description: { 'zh-CN': '为商户导入历史数据与批量操作', 'en-US': 'Import historical data and bulk operations for merchants' }, capabilities: ['data:import'], icon: 'upload' },
      { title: { 'zh-CN': '系统参数', 'en-US': 'System Config' }, href: '/admin/system-config', description: { 'zh-CN': '全局参数、速率限制与默认值', 'en-US': 'Global parameters, rate limits, and defaults' }, capabilities: ['settings:write'], icon: 'settings' }
    ]
  }
];
