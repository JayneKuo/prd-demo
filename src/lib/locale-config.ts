export type Locale = 'zh-CN' | 'en-US';

export const supportedLocales: Array<{ code: Locale; label: string; nativeLabel: string }> = [
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'en-US', label: 'English', nativeLabel: 'English' }
];

export const defaultLocale: Locale = 'zh-CN';

export const shellCopy = {
  'zh-CN': {
    searchPlaceholder: '搜索订单、库存、报表...',
    create: '新建',
    help: '帮助',
    notifications: '通知',
    testData: '测试数据',
    manageCompanies: '管理公司',
    collapse: '收起导航',
    expand: '展开导航',
    profile: '个人资料',
    appearance: '外观',
    themeColor: '主题颜色',
    language: '语言',
    timezone: '时区',
    signOut: '退出登录'
  },
  'en-US': {
    searchPlaceholder: 'Search orders, inventory, reports...',
    create: 'Create',
    help: 'Help',
    notifications: 'Notifications',
    testData: 'Test data',
    manageCompanies: 'Manage companies',
    collapse: 'Collapse navigation',
    expand: 'Expand navigation',
    profile: 'Profile',
    appearance: 'Appearance',
    themeColor: 'Theme color',
    language: 'Language',
    timezone: 'Timezone',
    signOut: 'Sign out'
  }
} satisfies Record<Locale, Record<string, string>>;
