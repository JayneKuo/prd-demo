import { MetadataPanel } from '@/components/admin/metadata-panel';
import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import type { TableColumn } from '@/components/admin/data-table-shell';

type TenantRow = {
  id: string;
  tenant: string;
  plan: string;
  merchants: string;
  environment: string;
  owner: string;
  renewal: string;
  status: string;
};

const tenantColumns: TableColumn<TenantRow>[] = [
  { key: 'tenant', label: 'Tenant' },
  { key: 'plan', label: 'Plan' },
  { key: 'merchants', label: 'Merchants' },
  { key: 'environment', label: 'Environment' },
  { key: 'owner', label: 'Owner' },
  { key: 'renewal', label: 'Renewal' },
  { key: 'status', label: 'Status', isStatus: true }
];

const tenantRows: TenantRow[] = [
  { id: 'tenant_acme', tenant: 'Acme Group', plan: 'Enterprise', merchants: '12', environment: 'Production', owner: 'Mina Chen', renewal: '2026-09-30', status: 'Active' },
  { id: 'tenant_northridge', tenant: 'North Ridge Brands', plan: 'Growth', merchants: '4', environment: 'Staging', owner: 'Ari Patel', renewal: '2026-07-15', status: 'Review' },
  { id: 'tenant_blueharbor', tenant: 'Blue Harbor Retail', plan: 'Starter', merchants: '2', environment: 'Production', owner: 'Sam Rivera', renewal: '2026-08-08', status: 'Active' },
  { id: 'tenant_rivermarket', tenant: 'River Market Co.', plan: 'Growth', merchants: '6', environment: 'Production', owner: 'Dylan Wu', renewal: '2026-06-28', status: 'Warning' }
];

export default function AdminTenantsPage() {
  return (
    <div className="space-y-6">
      <ListPageTemplate
        title="Tenants"
        description="Provision, review, and govern tenant accounts across environments, plans, and lifecycle states."
        actions={[{ label: 'Export roster', variant: 'secondary' }, { label: 'New tenant', variant: 'primary' }]}
        tabs={['All tenants', 'Production', 'Review', 'Renewals']}
        activeTab="All tenants"
        searchPlaceholder="Search tenant, owner, environment..."
        columns={tenantColumns}
        rows={tenantRows}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Portfolio notes</div>
          <div className="mt-3 space-y-2 text-[13px] text-[var(--foreground)]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">2 tenants need renewal review in the next 30 days.</div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">1 staging tenant is blocked on channel authorization.</div>
          </div>
        </div>
        <MetadataPanel
          title="Control summary"
          items={[
            { label: 'Total tenants', value: '18' },
            { label: 'Production tenants', value: '11' },
            { label: 'Pending reviews', value: '3' },
            { label: 'Expiring contracts', value: '2 this month' }
          ]}
        />
      </div>
    </div>
  );
}
