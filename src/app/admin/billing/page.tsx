import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';

const plans = [
  { plan: 'Starter', tenants: 6, mrr: '$4.8k', note: 'Self-serve onboarding', limit: '2 merchants / tenant' },
  { plan: 'Growth', tenants: 8, mrr: '$18.6k', note: 'Shared success manager', limit: '8 merchants / tenant' },
  { plan: 'Enterprise', tenants: 4, mrr: '$42.0k', note: 'Dedicated support + custom SLAs', limit: 'Custom merchant limits' }
];

const accounts = [
  { tenant: 'Acme Group', plan: 'Enterprise', mrr: '$12.4k', renewal: '2026-09-30', owner: 'Mina Chen', status: 'Active' },
  { tenant: 'North Ridge Brands', plan: 'Growth', mrr: '$2.8k', renewal: '2026-07-15', owner: 'Ari Patel', status: 'Review' },
  { tenant: 'Blue Harbor Retail', plan: 'Starter', mrr: '$680', renewal: '2026-08-08', owner: 'Sam Rivera', status: 'Active' },
  { tenant: 'River Market Co.', plan: 'Growth', mrr: '$3.2k', renewal: '2026-06-28', owner: 'Dylan Wu', status: 'Warning' }
];

const commercialActions = [
  'River Market renewal needs owner approval before 2026-06-28.',
  'North Ridge is over 80% of merchant limit and should be reviewed for Enterprise.',
  'Blue Harbor has exceeded Starter order volume for two consecutive months.'
];

export default function AdminBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans & Billing"
        description="Monitor commercial segmentation, plan fit, and billing posture across the tenant base."
        actions={[{ label: 'Download billing report', variant: 'secondary' }, { label: 'Update plan catalog', variant: 'primary' }]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Plan mix" description="Commercial footprint by subscription tier.">
            <div className="grid gap-3 md:grid-cols-3">
              {plans.map((item) => (
                <div key={item.plan} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">{item.plan}</div>
                  <div className="mt-1 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{item.tenants}</div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">{item.mrr} MRR</div>
                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--foreground)]">{item.limit}</div>
                  <div className="mt-2 text-[12px] text-[var(--muted)]">{item.note}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Tenant billing posture" description="Renewals, plan fit, and commercial ownership by tenant.">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">MRR</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {accounts.map((account) => (
                    <tr key={account.tenant}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--foreground)]">{account.tenant}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{account.plan}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{account.mrr}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{account.renewal}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{account.owner}</td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={account.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Commercial actions" description="Revenue-impacting follow-ups for account owners.">
            <div className="space-y-2">
              {commercialActions.map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)]">{item}</div>
              ))}
            </div>
          </SectionCard>
        </div>

        <MetadataPanel
          title="Billing health"
          items={[
            { label: 'MRR at risk', value: '$12.4k' },
            { label: 'Past due tenants', value: '2' },
            { label: 'Renewals this quarter', value: '5' },
            { label: 'Expansion candidates', value: '7' }
          ]}
        />
      </div>
    </div>
  );
}
