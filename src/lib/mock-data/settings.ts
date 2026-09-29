import type { SettingsGroup } from '@/components/archetypes/settings-hub-template';

export const settingsGroups: SettingsGroup[] = [
  {
    title: '个人设置',
    modules: [
      { title: '偏好设置', description: '管理语言、时区、主题模式和界面密度。', href: '/dashboard/settings/access' },
      { title: '通知', description: '配置任务、审批、异常和集成事件通知。', href: '/dashboard/settings' }
    ]
  },
  {
    title: '组织',
    modules: [
      { title: '组织资料', description: '维护法人主体、租户标识和区域默认配置。', href: '/dashboard/settings' },
      { title: '公司', description: '管理当前租户下的经营主体与作用域。', href: '/dashboard/settings' }
    ]
  },
  {
    title: '访问控制',
    modules: [
      { title: '用户与角色', description: '邀请成员、分配角色并查看访问范围。', href: '/dashboard/settings/access', status: '管理员' },
      { title: '访问策略', description: '定义跨公司权限和高风险操作的控制规则。', href: '/dashboard/settings/access' },
      { title: '审计日志', description: '查看安全事件和配置变更的审计记录。', href: '/dashboard/settings/access' }
    ]
  },
  {
    title: '财务',
    modules: [
      { title: '财务配置', description: '设置收入确认规则、成本计算方法和 ERP 集成偏好。', href: '/dashboard/settings/finance' },
      { title: 'ERP 集成', description: '配置与 NetSuite、QuickBooks 或其他财务系统的数据同步。', href: '/dashboard/settings/finance' },
      { title: '税务规则', description: '管理销售税率、税务区域和豁免规则。', href: '/dashboard/settings/finance' }
    ]
  },
  {
    title: '运营',
    modules: [
      { title: '订单路由', description: '设置默认分单、履约和异常处理策略。', href: '/dashboard/settings' },
      { title: '仓库规则', description: '管理收货、预留、调拨与盘点默认规则。', href: '/dashboard/settings' }
    ]
  },
  {
    title: '应用与开发者',
    modules: [
      { title: '应用与集成', description: '管理应用市场、连接器、Webhooks 和 API 密钥。', href: '/dashboard/apps' },
      { title: '事件与日志', description: '查看 API 调用、事件投递和同步诊断信息。', href: '/dashboard/developers/logs' }
    ]
  }
];
