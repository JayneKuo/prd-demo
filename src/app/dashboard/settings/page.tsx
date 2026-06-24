'use client';

import { SettingsHubTemplate } from '@/components/archetypes/settings-hub-template';
import { useShellState } from '@/components/providers/shell-state-provider';
import { settingsGroups } from '@/lib/mock-data/settings';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, currentTenant, getCompanyById, getMerchantByScope } from '@/lib/tenant-context';

export default function SettingsPage() {
  const { companyId, merchantScope, locale, timezone } = useShellState();
  const company = getCompanyById(companyId);
  const merchant = getMerchantByScope(merchantScope);

  return (
    <SettingsHubTemplate
      groups={settingsGroups}
      metadata={[
        { label: locale === 'zh-CN' ? '租户' : 'Tenant', value: currentTenant.name },
        { label: locale === 'zh-CN' ? '当前公司' : 'Current company', value: company.name },
        { label: locale === 'zh-CN' ? 'Merchant 范围' : 'Merchant scope', value: merchantScope === ALL_MERCHANTS_SCOPE ? 'All merchants' : merchant?.name ?? 'All merchants' },
        { label: locale === 'zh-CN' ? '当前角色' : 'Current role', value: currentSession.role },
        { label: locale === 'zh-CN' ? '语言' : 'Language', value: locale },
        { label: locale === 'zh-CN' ? '时区' : 'Timezone', value: timezone }
      ]}
    />
  );
}
