import Link from 'next/link';
import { MetadataPanel } from '@/components/admin/metadata-panel';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';

const companyMetrics = [
  { label: 'SaaS tenants', value: '18', detail: 'Customers using our product' },
  { label: 'Managed merchants', value: '37', detail: 'Across customer accounts' },
  { label: 'Internal incidents', value: '7', detail: 'Owned by our teams' },
  { label: 'Revenue at risk', value: '$12.4k', detail: 'Customer renewals < 30d' }
];

const commandCards = [
  { title: 'Customer Tenants', href: '/admin/tenants', description: 'Manage SaaS customer tenant lifecycle, plans, environments, and service state.' },
  { title: 'Customer Merchants', href: '/admin/merchants', description: 'Manage merchants that belong to customer tenants and their channel bindings.' },
  { title: 'Internal Access', href: '/admin/access', description: 'Govern our employees, support access, elevated permissions, and impersonation controls.' },
  { title: 'Product Operations', href: '/admin/operations', description: 'Monitor our product queues, tokens, incidents, integrations, and recovery actions.' },
  { title: 'Audit Logs', href: '/admin/audit', description: 'Review our internal privileged activity, support interventions, and exports.' },
  { title: 'Commercial Management', href: '/admin/billing', description: 'Track customer plans, renewals, revenue risk, and billing posture.' }
];

const urgentWork = [
  { item: 'River Market renewal needs approval', owner: 'Dylan Wu', status: 'Warning' },
  { item: 'Amazon token refresh required', owner: 'Ari Patel', status: 'Review' },
  { item: 'Cross-tenant billing export pending confirmation', owner: 'Mina Chen', status: 'Review' }
];

const quickLookups = [
  { label: 'Order lookup', value: 'SO-20260604-0003', detail: 'Customer order support' },
  { label: 'Inventory lookup', value: 'SKU-8820', detail: 'Merchant stock diagnosis' },
  { label: 'Merchant lookup', value: 'UK TikTok Shop', detail: 'Tenant and channel context' }
];

const recentActivity = [
  'Mina Chen granted temporary tenant-admin access to Acme Group',
  'Ari Patel rotated Amazon credentials for US Amazon',
  'Sam Rivera replayed failed inventory sync for UK TikTok Shop',
  'Dylan Wu exported cross-tenant billing report for finance close'
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Admin Overview"
        description="Our internal company system for managing the SaaS product, customer tenants, merchants, support access, operations, billing, and audit risk."
        actions={[{ label: 'Open incident room', variant: 'secondary' }, { label: 'Create tenant', variant: 'primary' }]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {companyMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[12px] font-medium text-[var(--muted)]">{metric.label}</div>
            <div className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--foreground)]">{metric.value}</div>
            <div className="mt-1 text-[13px] text-[var(--muted)]">{metric.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Company admin modules" description="Admin manages our SaaS product and customer accounts. Merchant Console remains the customer-facing business workspace.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {commandCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                >
                  <div className="text-[14px] font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">{card.title}</div>
                  <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">{card.description}</p>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Urgent internal work" description="Items our company teams need to resolve before they affect SaaS customers.">
            <div className="space-y-2">
              {urgentWork.map((work) => (
                <div key={work.item} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--foreground)]">{work.item}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">Owner: {work.owner}</div>
                  </div>
                  <StatusBadge status={work.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <MetadataPanel
            title="Admin scope"
            items={[
              { label: 'Console type', value: 'Our company internal system' },
              { label: 'Default scope', value: 'Company-wide customer operations' },
              { label: 'Primary users', value: 'Ops, support, finance, implementation' },
              { label: 'Risk posture', value: 'Privileged and audited' }
            ]}
          />

          <SectionCard title="Quick business lookup" description="Read-only support shortcuts into customer business data.">
            <div className="space-y-2">
              {quickLookups.map((item) => (
                <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{item.label}</div>
                  <div className="mt-1 text-[13px] font-semibold text-[var(--foreground)]">{item.value}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--muted)]">{item.detail}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent privileged activity" description="Latest internal support or high-risk company admin events.">
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[12px] leading-5 text-[var(--foreground)]">{item}</div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
