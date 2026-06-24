'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale-config';

type AdminScopeLevel = 'company-wide' | 'tenant' | 'department' | 'merchant';

type AdminScope = {
  level: AdminScopeLevel;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
};

type AdminScopeState = {
  scope: AdminScope;
  setScope: (scope: AdminScope) => void;
};

export const adminScopes: AdminScope[] = [
  { level: 'company-wide', label: { 'zh-CN': '全公司', 'en-US': 'Company-wide' }, description: { 'zh-CN': '涵盖所有租户、部门与商户', 'en-US': 'All tenants, departments, and merchants under this company' } },
  { level: 'tenant', label: { 'zh-CN': 'Acme 集团', 'en-US': 'Acme Group' }, description: { 'zh-CN': '租户级治理', 'en-US': 'Tenant-level governance' } },
  { level: 'department', label: { 'zh-CN': '运营部', 'en-US': 'Operations Department' }, description: { 'zh-CN': '内部团队与流程管理', 'en-US': 'Internal team and workflow management' } },
  { level: 'merchant', label: { 'zh-CN': '美国 Amazon', 'en-US': 'US Amazon' }, description: { 'zh-CN': '单商户调查', 'en-US': 'Single merchant investigation' } }
];

const AdminScopeContext = createContext<AdminScopeState | null>(null);

export function AdminScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<AdminScope>(adminScopes[0]);
  const value = useMemo(() => ({ scope, setScope }), [scope]);

  return <AdminScopeContext.Provider value={value}>{children}</AdminScopeContext.Provider>;
}

export function useAdminScope() {
  const context = useContext(AdminScopeContext);
  if (!context) {
    throw new Error('useAdminScope must be used within AdminScopeProvider');
  }

  return context;
}
