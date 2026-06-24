import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';

const accessDomains = [
  { title: 'Internal Admins', description: 'Tenant provisioning, access escalation, support intervention, and billing controls.' },
  { title: 'Operations', description: 'Onboarding, catalog migration, channel remediation, and queue triage.' },
  { title: 'Merchant Users', description: 'Merchant-console users with company and merchant-scoped daily operations access.' }
];

const roles = [
  {
    role: 'Platform Admin',
    personas: 'Internal Admins',
    tenantScope: 'All tenants',
    merchantScope: 'Cross-tenant',
    privileges: ['Create tenants', 'Suspend merchants', 'Manage billing', 'Review audit trails']
  },
  {
    role: 'Implementation Lead',
    personas: 'Operations',
    tenantScope: 'Assigned tenants',
    merchantScope: 'Assigned merchants',
    privileges: ['Launch onboarding', 'Replay imports', 'Validate channel auth', 'Escalate incidents']
  },
  {
    role: 'Merchant Admin',
    personas: 'Merchant Users',
    tenantScope: 'Single tenant',
    merchantScope: 'Company-wide',
    privileges: ['Invite merchant users', 'Configure channels', 'Review approvals', 'View reports']
  }
];

const controls = [
  'Impersonation requires ticket reference and is written to audit logs.',
  'Temporary elevated roles expire automatically after 8 hours.',
  'Cross-tenant exports require dual approval from Platform Admin and Finance.'
];

export default function AdminAccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        description="Shape role models for internal operators and merchant-facing users without mixing their responsibilities."
        actions={[{ label: 'Review impersonation logs', variant: 'secondary' }, { label: 'Invite admin', variant: 'primary' }]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Access domains" description="Separate control-plane actors from merchant-console actors.">
            <div className="grid gap-3 md:grid-cols-3">
              {accessDomains.map((persona) => (
                <div key={persona.title} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{persona.title}</div>
                  <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">{persona.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Role matrix" description="A lightweight reference for who can do what and where their access stops.">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3">Tenant scope</th>
                    <th className="px-4 py-3">Merchant scope</th>
                    <th className="px-4 py-3">Key privileges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {roles.map((item) => (
                    <tr key={item.role} className="align-top">
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{item.role}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.personas}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.tenantScope}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.merchantScope}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.privileges.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Risk controls" description="Non-negotiable policies for privileged access.">
            <div className="space-y-2">
              {controls.map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)]">{item}</div>
              ))}
            </div>
          </SectionCard>
        </div>

        <MetadataPanel
          title="Access health"
          items={[
            { label: 'Platform admins', value: '8' },
            { label: 'Temporary elevations', value: '2 active' },
            { label: 'Merchant admins', value: '43' },
            { label: 'Pending access reviews', value: '5' }
          ]}
        />
      </div>
    </div>
  );
}
