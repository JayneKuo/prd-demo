import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { currentSession } from '@/lib/session-context';
import { currentTenant } from '@/lib/tenant-context';

const users = [
  { name: 'Mina Chen', email: 'mina@example.com', role: 'Owner', status: 'Active' },
  { name: 'Ari Patel', email: 'ari@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sam Rivera', email: 'sam@example.com', role: 'Operations', status: 'Review' }
];

const policies = [
  '公司级库存调整需要 Operations 或 Admin 角色。',
  '财务调整需要 Finance 或 Owner 角色。',
  '跨公司访问需要 Admin 审批。'
];

export default function AccessSettingsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="用户与角色"
        description="查看用户访问范围、角色分配和公司级权限策略。"
        actions={[{ label: '邀请用户', variant: 'primary' }]}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <SectionCard title="用户" description="拥有当前租户访问权限的成员。">
            <div className="divide-y divide-[var(--border-subtle)]">
              {users.map((user) => (
                <div key={user.email} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{user.name}</div>
                    <div className="text-sm text-[var(--muted)]">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <span>{user.role}</span>
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="访问策略" description="公司范围和高风险操作的权限规则。">
            <ul className="space-y-2">
              {policies.map((policy) => (
                <li key={policy} className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)]">{policy}</li>
              ))}
            </ul>
          </SectionCard>
        </div>
        <MetadataPanel
          title="访问上下文"
          items={[
            { label: '租户', value: currentTenant.name },
            { label: 'Merchant 范围', value: '全部 merchant' },
            { label: '你的角色', value: currentSession.role },
            { label: '语言', value: currentSession.locale },
            { label: '时区', value: currentSession.timezone }
          ]}
        />
      </div>
    </div>
  );
}
