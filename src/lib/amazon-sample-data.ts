import { connectionStorageKey, parseConnections, type Connection, type BusinessConfig, type BusinessId } from '@/lib/amazon-connections';

// Local fixture provider. Replace this adapter with API-backed repositories without changing UI contracts.
export const sampleAmazonProduct = { sku: 'WEP-BLK-001', sellerSku: 'NW-WEP-BLK-US', asin: 'B0C8NW4P21', fnsku: 'X004NWEP01', vendorSku: 'NW-WEP-BLK', quantityUnit: 'Each' };
export function loadAmazonConnections(companyId: string, merchantId: string): Connection[] {
  const key = connectionStorageKey(companyId, merchantId);
  const existing = parseConnections(localStorage.getItem(key));
  if (companyId !== 'company_northwind' || merchantId !== 'merchant_us_amazon') return existing;
  const marker = `${key}:fixtures-v3`;
  if (localStorage.getItem(marker)) return existing;
  const missing = createAmazonSampleConnections().filter((sample) => !existing.some((connection) => connection.id === sample.id));
  for (const connection of missing) for (const [businessId, config] of Object.entries(connection.businesses)) {
    const mappingKey = `amazon-oms-readiness-v1:${companyId}:${merchantId}:${connection.id}:${businessId}`;
    if (!localStorage.getItem(mappingKey)) localStorage.setItem(mappingKey, JSON.stringify({ product: true, warehouse: businessId === 'df', carrier: false, productId: 'var_001_1', warehouseId: config?.warehouse, externalIdentifier: connection.identity === 'vendor' ? sampleAmazonProduct.vendorSku : sampleAmazonProduct.sellerSku, asin: sampleAmazonProduct.asin, fnsku: sampleAmazonProduct.fnsku, externalWarehouse: businessId === 'df' ? 'NW-DF-LAX' : '' }));
  }
  const connections = [...existing, ...missing];
  if (missing.length) localStorage.setItem(key, JSON.stringify({ connections }));
  localStorage.setItem(marker, '1');
  return connections;
}

export function createAmazonSampleConnections(): Connection[] {
  const config = (id: BusinessId, reference = ''): BusinessConfig => ({ status: 'enabled', site: 'US', warehouse: id === 'df' ? 'wh_lax' : '', rule: 'manual', syncFrom: '2026-10-01', mappingConfirmed: true, productMappings: [{ externalSku: id === 'df' || id === 'wholesale' ? sampleAmazonProduct.vendorSku : sampleAmazonProduct.sellerSku, omsVariantId: 'var_001_1', asin: sampleAmazonProduct.asin, fnsku: sampleAmazonProduct.fnsku }], reference, initializedAt: '2026-11-01T08:00:00Z', options: { orderChannels: 'all', inventoryBuffer: 5, inventoryMode: 'incremental', mcfService: 'Standard', allowMcfFallback: true, prepOwner: 'SELLER', labelOwner: 'SELLER', vendorPayment: 'invoice', acknowledgement: 'manual', dfLabelFormat: 'PDF' } });
  return [
    { id: 'amz-northwind-seller-na', name: 'Northwind Amazon US', identity: 'seller', region: 'NA', accountId: 'A2NW7K4Q9M6US', authorized: true, businesses: { sales: config('sales'), mcf: config('mcf'), fba: config('fba') } },
    { id: 'amz-northwind-vendor-na', name: 'Northwind Vendor US', identity: 'vendor', region: 'NA', accountId: 'NW-US-VENDOR', authorized: true, businesses: { wholesale: config('wholesale', 'NW001'), df: config('df', 'NW-DF-LAX') } }
  ];
}
