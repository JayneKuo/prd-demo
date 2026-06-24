import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import type { TableColumn } from '@/components/admin/data-table-shell';
import { MetadataPanel } from '@/components/admin/metadata-panel';

type MerchantRow = {
  id: string;
  merchant: string;
  tenant: string;
  company: string;
  channel: string;
  owner: string;
  health: string;
  status: string;
};

const merchantColumns: TableColumn<MerchantRow>[] = [
  { key: 'merchant', label: 'Merchant' },
  { key: 'tenant', label: 'Tenant' },
  { key: 'company', label: 'Company' },
  { key: 'channel', label: 'Channel' },
  { key: 'owner', label: 'Owner' },
  { key: 'health', label: 'Health' },
  { key: 'status', label: 'Status', isStatus: true }
];

const merchantRows: MerchantRow[] = [
  { id: 'merchant_us_store', merchant: 'US Store', tenant: 'Acme Group', company: 'Northwind Trading Ltd.', channel: 'Shopify', owner: 'Mina Chen', health: 'Healthy sync', status: 'Active' },
  { id: 'merchant_us_amazon', merchant: 'US Amazon', tenant: 'Acme Group', company: 'Northwind Trading Ltd.', channel: 'Amazon', owner: 'Ari Patel', health: 'Needs token refresh', status: 'Warning' },
  { id: 'merchant_uk_store', merchant: 'UK Store', tenant: 'Contoso Supply Co.', company: 'Contoso Supply Co.', channel: 'Shopify', owner: 'Sam Rivera', health: 'Catalog mapped', status: 'Active' },
  { id: 'merchant_uk_tiktok', merchant: 'UK TikTok Shop', tenant: 'Contoso Supply Co.', company: 'Contoso Supply Co.', channel: 'TikTok Shop', owner: 'Sam Rivera', health: 'Awaiting catalog remap', status: 'Review' },
  { id: 'merchant_sg_store', merchant: 'SG Store', tenant: 'A. Datum Logistics', company: 'A. Datum Logistics', channel: 'Shopify', owner: 'Dylan Wu', health: 'Healthy sync', status: 'Active' }
];

export default function AdminMerchantsPage() {
  return (
    <div className="space-y-6">
      <ListPageTemplate
        title="Merchants"
        description="Inspect merchant records, channel bindings, operational ownership, and launch readiness."
        actions={[{ label: 'Sync channels', variant: 'secondary' }, { label: 'Create merchant', variant: 'primary' }]}
        tabs={['All merchants', 'Healthy', 'Warnings', 'In review']}
        activeTab="All merchants"
        searchPlaceholder="Search merchant, tenant, company, owner..."
        columns={merchantColumns}
        rows={merchantRows}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Operational notes</div>
          <div className="mt-3 space-y-2 text-[13px] text-[var(--foreground)]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">2 merchants need channel token rotation this week.</div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">1 merchant is waiting on TikTok catalog remediation before launch.</div>
          </div>
        </div>
        <MetadataPanel
          title="Merchant summary"
          items={[
            { label: 'Total merchants', value: '37' },
            { label: 'Healthy', value: '29' },
            { label: 'Warnings', value: '5' },
            { label: 'Pending review', value: '3' }
          ]}
        />
      </div>
    </div>
  );
}
