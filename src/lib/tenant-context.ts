export type Role = 'owner' | 'admin' | 'operations' | 'finance' | 'analyst' | 'developer';

export type Tenant = {
  id: string;
  name: string;
  environment: 'test' | 'live';
};

export type Merchant = {
  id: string;
  companyId: string;
  name: string;
  channel: string;
  region: string;
  currency: string;
};

export type Company = {
  id: string;
  tenantId: string;
  name: string;
  region: string;
  currency: string;
};

export type MerchantScope = 'all' | Merchant['id'];

export const ALL_MERCHANTS_SCOPE: MerchantScope = 'all';

export const currentTenant: Tenant = {
  id: 'tenant_acme',
  name: 'Acme Group',
  environment: 'test'
};

export const companies: Company[] = [
  { id: 'company_northwind', tenantId: 'tenant_acme', name: 'Northwind Trading Ltd.', region: 'US', currency: 'USD' },
  { id: 'company_contoso', tenantId: 'tenant_acme', name: 'Contoso Supply Co.', region: 'EU', currency: 'EUR' },
  { id: 'company_adatum', tenantId: 'tenant_acme', name: 'A. Datum Logistics', region: 'APAC', currency: 'SGD' }
];

export const merchants: Merchant[] = [
  { id: 'merchant_us_shopify', companyId: 'company_northwind', name: 'US Store', channel: 'Shopify', region: 'US', currency: 'USD' },
  { id: 'merchant_us_amazon', companyId: 'company_northwind', name: 'US Amazon', channel: 'Amazon', region: 'US', currency: 'USD' },
  { id: 'merchant_uk_shopify', companyId: 'company_northwind', name: 'UK Store', channel: 'Shopify', region: 'UK', currency: 'GBP' },
  { id: 'merchant_uk_tiktok', companyId: 'company_northwind', name: 'UK TikTok Shop', channel: 'TikTok Shop', region: 'UK', currency: 'GBP' },
  { id: 'merchant_sg_shopify', companyId: 'company_northwind', name: 'SG Store', channel: 'Shopify', region: 'SG', currency: 'SGD' }
];

export const currentCompany = companies[0];
export const currentUserRole: Role = 'admin';

export function isCompanyId(value: string) {
  return companies.some((company) => company.id === value);
}

export function isMerchantScope(value: string): value is MerchantScope {
  return value === ALL_MERCHANTS_SCOPE || merchants.some((merchant) => merchant.id === value);
}

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId) ?? companies[0];
}

export function getMerchantsByCompany(companyId: string) {
  return merchants.filter((merchant) => merchant.companyId === companyId);
}

export function getMerchantByScope(scope: MerchantScope) {
  if (scope === ALL_MERCHANTS_SCOPE) return null;
  return merchants.find((merchant) => merchant.id === scope) ?? null;
}

export function getMerchantNamesForScope(companyId: string, scope: MerchantScope) {
  const companyMerchants = getMerchantsByCompany(companyId);
  if (scope === ALL_MERCHANTS_SCOPE) return companyMerchants.map((merchant) => merchant.name);
  const selectedMerchant = companyMerchants.find((merchant) => merchant.id === scope);
  return selectedMerchant ? [selectedMerchant.name] : companyMerchants.map((merchant) => merchant.name);
}
