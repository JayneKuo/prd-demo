'use client';

import { useEffect, useState } from 'react';
import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import { useShellState } from '@/components/providers/shell-state-provider';
import { inventoryColumns, inventoryRows } from '@/lib/mock-data/inventory';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';
import { ALL_MERCHANTS_SCOPE, getCompanyById, getMerchantByScope, getMerchantsByCompany, getMerchantNamesForScope } from '@/lib/tenant-context';

export default function InventoryPage() {
  const { companyId, merchantScope } = useShellState();
  const [merchantFilter, setMerchantFilter] = useState(ALL_MERCHANTS_SCOPE);
  const canWriteInventory = hasCapability(currentSession.role, 'inventory:write');
  const company = getCompanyById(companyId);
  const selectedMerchant = getMerchantByScope(merchantScope);
  const companyMerchants = getMerchantsByCompany(companyId);
  const scopeName = selectedMerchant?.name ?? `${company.name} 全部 merchant`;
  const scopedMerchantNames = getMerchantNamesForScope(companyId, merchantScope);
  const availableMerchantNames = companyMerchants
    .filter((merchant) => merchantScope === ALL_MERCHANTS_SCOPE || merchant.id === merchantScope)
    .map((merchant) => merchant.name);
  const scopedRows = inventoryRows.filter((row) => scopedMerchantNames.includes(row.merchant));
  const rows = merchantFilter === ALL_MERCHANTS_SCOPE ? scopedRows : scopedRows.filter((row) => row.merchant === merchantFilter);

  useEffect(() => {
    if (merchantFilter !== ALL_MERCHANTS_SCOPE && !availableMerchantNames.includes(merchantFilter)) {
      setMerchantFilter(ALL_MERCHANTS_SCOPE);
    }
  }, [availableMerchantNames, merchantFilter]);

  return (
    <ListPageTemplate
      title="库存"
      description={`查看 ${scopeName} 的可售库存、预留数量和仓库异常。`}
      actions={[
        { label: '调拨', variant: 'secondary', disabled: !canWriteInventory },
        { label: '调整库存', variant: 'primary', disabled: !canWriteInventory }
      ]}
      tabs={['全部', '可售', '低库存', '已预留', '异常']}
      activeTab="全部"
      searchPlaceholder="搜索 SKU、商品或仓库..."
      filters={[
        {
          label: 'Merchant',
          value: merchantFilter,
          options: [
            { label: '全部', value: ALL_MERCHANTS_SCOPE },
            ...availableMerchantNames.map((merchant) => ({ label: merchant, value: merchant }))
          ],
          onChange: setMerchantFilter
        }
      ]}
      columns={inventoryColumns}
      rows={rows}
    />
  );
}
