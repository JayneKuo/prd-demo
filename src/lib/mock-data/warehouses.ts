// 仓库主数据 + SKU 库存

export type WarehouseRegion = 'US-West' | 'US-East' | 'US-Central' | 'UK' | 'SG' | 'AU';

export type Warehouse = {
  id: string;
  code: string;         // 展示编码，如 LAX-01
  name: string;
  region: WarehouseRegion;
  country: string;
  city: string;
  address: string;
  timezone: string;
  /** 支持的运输方式 */
  supportedCarriers: string[];
  /** 是否启用 */
  active: boolean;
  /** 3PL 服务商 */
  operator?: string;
};

export type SkuInventory = {
  warehouseId: string;
  sku: string;
  /** 可售库存 */
  available: number;
  /** 预留（已生成履约单但未出库） */
  reserved: number;
  /** 在途（入库中） */
  inbound: number;
  /** 单位成本（USD） */
  unitCost: number;
};

export type CarrierOption = {
  id: string;
  name: string;
  serviceLevel: string;
  /** 预计天数区间 */
  estimatedDays: string;
  /** 估算运费（USD） */
  estimatedCost: number;
  /** 适用重量上限（kg），null = 无限制 */
  maxWeight: number | null;
  /** 运输方式 */
  mode: 'parcel' | 'express' | 'ltl' | 'ftl';
};

// ─── 仓库列表 ────────────────────────────────────────────────────────────────

export const warehouses: Warehouse[] = [
  {
    id: 'wh_lax', code: 'US-West-LAX', name: 'Los Angeles Fulfillment Center',
    region: 'US-West', country: 'US', city: 'Los Angeles, CA',
    address: '3250 E 26th St, Vernon, CA 90058',
    timezone: 'America/Los_Angeles',
    supportedCarriers: ['UPS', 'FedEx', 'USPS', 'XPO Logistics'],
    active: true, operator: 'ShipBob',
  },
  {
    id: 'wh_sea', code: 'US-West-SEA', name: 'Seattle Distribution Center',
    region: 'US-West', country: 'US', city: 'Seattle, WA',
    address: '1900 1st Ave S, Seattle, WA 98134',
    timezone: 'America/Los_Angeles',
    supportedCarriers: ['UPS', 'FedEx', 'USPS'],
    active: true, operator: 'ShipBob',
  },
  {
    id: 'wh_ewr', code: 'US-East-EWR', name: 'New Jersey East Coast Hub',
    region: 'US-East', country: 'US', city: 'Newark, NJ',
    address: '100 Haynes Ave, Newark, NJ 07114',
    timezone: 'America/New_York',
    supportedCarriers: ['UPS', 'FedEx', 'USPS', 'XPO Logistics'],
    active: true, operator: 'XPO Logistics',
  },
  {
    id: 'wh_dfw', code: 'US-Central-DFW', name: 'Dallas Central Warehouse',
    region: 'US-Central', country: 'US', city: 'Dallas, TX',
    address: '2300 W Interstate 20, Grand Prairie, TX 75052',
    timezone: 'America/Chicago',
    supportedCarriers: ['UPS', 'FedEx', 'USPS'],
    active: true, operator: 'ShipBob',
  },
  {
    id: 'wh_lhr', code: 'UK-London', name: 'London Fulfilment Centre',
    region: 'UK', country: 'GB', city: 'London',
    address: 'Unit 5, Heathrow Gateway, Slough SL3 0AT',
    timezone: 'Europe/London',
    supportedCarriers: ['Royal Mail', 'DPD', 'DHL'],
    active: true, operator: 'ShipBob UK',
  },
  {
    id: 'wh_sg', code: 'SG-Central', name: 'Singapore Central Warehouse',
    region: 'SG', country: 'SG', city: 'Singapore',
    address: '1 Changi Business Park Ave 1, Singapore 486058',
    timezone: 'Asia/Singapore',
    supportedCarriers: ['Ninja Van', 'DHL', 'FedEx'],
    active: true, operator: 'Ninja Van Fulfillment',
  },
];

// ─── SKU 库存（核心商品在各仓库的库存）────────────────────────────────────────

export const skuInventory: SkuInventory[] = [
  // Wireless Earbuds Pro - Black
  { warehouseId: 'wh_lax', sku: 'WE-PRO-BLK',  available: 450, reserved: 12, inbound: 100, unitCost: 32.00 },
  { warehouseId: 'wh_ewr', sku: 'WE-PRO-BLK',  available: 280, reserved: 8,  inbound: 0,   unitCost: 32.00 },
  { warehouseId: 'wh_sea', sku: 'WE-PRO-BLK',  available: 120, reserved: 3,  inbound: 50,  unitCost: 32.00 },

  // Phone Case Clear
  { warehouseId: 'wh_lax', sku: 'PC-CLR-IP15', available: 980, reserved: 20, inbound: 0,   unitCost: 12.00 },
  { warehouseId: 'wh_ewr', sku: 'PC-CLR-IP15', available: 420, reserved: 5,  inbound: 0,   unitCost: 12.00 },

  // USB-C Cable 2m
  { warehouseId: 'wh_lax', sku: 'UC-2M-WHT',   available: 3200,reserved: 40, inbound: 500, unitCost: 5.50 },
  { warehouseId: 'wh_ewr', sku: 'UC-2M-WHT',   available: 2100,reserved: 15, inbound: 0,   unitCost: 5.50 },
  { warehouseId: 'wh_dfw', sku: 'UC-2M-WHT',   available: 890, reserved: 8,  inbound: 0,   unitCost: 5.50 },

  // Smart Watch Band
  { warehouseId: 'wh_lax', sku: 'SWB-SIL-M',  available: 320, reserved: 10, inbound: 0,   unitCost: 8.50 },
  { warehouseId: 'wh_ewr', sku: 'SWB-SIL-M',  available: 180, reserved: 4,  inbound: 60,  unitCost: 8.50 },

  // Screen Protector
  { warehouseId: 'wh_lax', sku: 'SP-TG-IP15', available: 1500,reserved: 25, inbound: 0,   unitCost: 3.20 },
  { warehouseId: 'wh_ewr', sku: 'SP-TG-IP15', available: 860, reserved: 12, inbound: 200, unitCost: 3.20 },

  // Charging Dock
  { warehouseId: 'wh_lax', sku: 'CD-MG-WHT',  available: 240, reserved: 6,  inbound: 0,   unitCost: 28.00 },
  { warehouseId: 'wh_sea', sku: 'CD-MG-WHT',  available: 85,  reserved: 2,  inbound: 0,   unitCost: 28.00 },

  // Yoga Mat
  { warehouseId: 'wh_lhr', sku: 'YM-PRE-PUR', available: 420, reserved: 8,  inbound: 100, unitCost: 15.00 },
  { warehouseId: 'wh_ewr', sku: 'YM-PRE-PUR', available: 180, reserved: 3,  inbound: 0,   unitCost: 15.00 },

  // Camping Tent
  { warehouseId: 'wh_sea', sku: 'TENT-4P-GRN',available: 65,  reserved: 2,  inbound: 20,  unitCost: 85.00 },
  { warehouseId: 'wh_lax', sku: 'TENT-4P-GRN',available: 32,  reserved: 1,  inbound: 0,   unitCost: 85.00 },

  // Sleeping Bag
  { warehouseId: 'wh_sea', sku: 'SB-WARM-BLU',available: 140, reserved: 4,  inbound: 0,   unitCost: 30.00 },
  { warehouseId: 'wh_lax', sku: 'SB-WARM-BLU',available: 88,  reserved: 2,  inbound: 30,  unitCost: 30.00 },

  // Headlamp - 库存不足场景
  { warehouseId: 'wh_sea', sku: 'HL-LED-400', available: 0,   reserved: 0,  inbound: 40,  unitCost: 8.00 },
  { warehouseId: 'wh_lax', sku: 'HL-LED-400', available: 0,   reserved: 0,  inbound: 20,  unitCost: 8.00 },
  { warehouseId: 'wh_ewr', sku: 'HL-LED-400', available: 0,   reserved: 0,  inbound: 0,   unitCost: 8.00 },

  // First Aid Kit
  { warehouseId: 'wh_sea', sku: 'FAK-DLX-01', available: 28,  reserved: 1,  inbound: 0,   unitCost: 27.00 },
  { warehouseId: 'wh_lax', sku: 'FAK-DLX-01', available: 15,  reserved: 0,  inbound: 10,  unitCost: 27.00 },

  // Office Chair
  { warehouseId: 'wh_ewr', sku: 'OC-ERG-BLK', available: 12,  reserved: 1,  inbound: 5,   unitCost: 145.00 },
  { warehouseId: 'wh_lax', sku: 'OC-ERG-BLK', available: 8,   reserved: 0,  inbound: 0,   unitCost: 145.00 },

  // LED Ring Light
  { warehouseId: 'wh_lax', sku: 'LRL-10IN',   available: 285, reserved: 6,  inbound: 0,   unitCost: 18.00 },
  { warehouseId: 'wh_dfw', sku: 'LRL-10IN',   available: 120, reserved: 2,  inbound: 50,  unitCost: 18.00 },

  // UK products
  { warehouseId: 'wh_lhr', sku: 'HD-CMP-PNK', available: 380, reserved: 8,  inbound: 0,   unitCost: 28.00 },
  { warehouseId: 'wh_lhr', sku: 'HC-SET-12P', available: 640, reserved: 12, inbound: 100, unitCost: 4.80 },
  { warehouseId: 'wh_lhr', sku: 'RB-SET-3PK', available: 220, reserved: 4,  inbound: 0,   unitCost: 8.50 },

  // SG products
  { warehouseId: 'wh_sg',  sku: 'KK-SET-PRO', available: 85,  reserved: 2,  inbound: 20,  unitCost: 98.00 },
  { warehouseId: 'wh_sg',  sku: 'CB-BM-LG',   available: 240, reserved: 6,  inbound: 0,   unitCost: 14.00 },
  { warehouseId: 'wh_sg',  sku: 'DO-BM-NAT',  available: 95,  reserved: 3,  inbound: 0,   unitCost: 32.00 },
  { warehouseId: 'wh_sg',  sku: 'MS-ALM-SLV', available: 42,  reserved: 1,  inbound: 0,   unitCost: 48.00 },

  // Gaming products
  { warehouseId: 'wh_dfw', sku: 'GM-PRO-BLK', available: 180, reserved: 5,  inbound: 0,   unitCost: 58.00 },
  { warehouseId: 'wh_dfw', sku: 'MP-RGB-XL',  available: 320, reserved: 8,  inbound: 0,   unitCost: 22.00 },

  // Bluetooth Speaker
  { warehouseId: 'wh_dfw', sku: 'BT-SPK-MINI',available: 450, reserved: 10, inbound: 100, unitCost: 32.00 },
  { warehouseId: 'wh_lax', sku: 'BT-SPK-MINI',available: 280, reserved: 6,  inbound: 0,   unitCost: 32.00 },
];

// ─── 按 SKU + 仓库查库存 ──────────────────────────────────────────────────────

export function getSkuInventory(sku: string): SkuInventory[] {
  return skuInventory.filter((s) => s.sku === sku);
}

export function getWarehouseById(id: string): Warehouse | undefined {
  return warehouses.find((w) => w.id === id);
}

export function getWarehouseByCode(code: string): Warehouse | undefined {
  return warehouses.find((w) => w.code === code);
}

/** 找到有库存的仓库列表（按可用量降序） */
export function getBestWarehousesForSku(sku: string): (SkuInventory & { warehouse: Warehouse })[] {
  return skuInventory
    .filter((s) => s.sku === sku && s.available > 0)
    .map((s) => ({ ...s, warehouse: warehouses.find((w) => w.id === s.warehouseId)! }))
    .filter((s) => s.warehouse)
    .sort((a, b) => b.available - a.available);
}

// ─── 承运商选项（按仓库） ─────────────────────────────────────────────────────

export const carrierOptions: Record<string, CarrierOption[]> = {
  wh_lax: [
    { id: 'ups_ground',   name: 'UPS',    serviceLevel: 'UPS Ground',           estimatedDays: '3-5 天', estimatedCost: 12.00, maxWeight: 30,   mode: 'parcel' },
    { id: 'ups_2day',     name: 'UPS',    serviceLevel: 'UPS 2nd Day Air',       estimatedDays: '2 天',  estimatedCost: 28.00, maxWeight: 30,   mode: 'express' },
    { id: 'fedex_ground', name: 'FedEx',  serviceLevel: 'FedEx Ground',          estimatedDays: '3-5 天', estimatedCost: 11.50, maxWeight: 30,   mode: 'parcel' },
    { id: 'usps_first',   name: 'USPS',   serviceLevel: 'USPS Priority Mail',    estimatedDays: '2-3 天', estimatedCost: 9.80,  maxWeight: 30,   mode: 'parcel' },
    { id: 'xpo_ltl',      name: 'XPO',    serviceLevel: 'XPO LTL White Glove',   estimatedDays: '3-7 天', estimatedCost: 180.00,maxWeight: null, mode: 'ltl' },
  ],
  wh_sea: [
    { id: 'ups_ground',   name: 'UPS',    serviceLevel: 'UPS Ground',           estimatedDays: '3-5 天', estimatedCost: 12.00, maxWeight: 30,   mode: 'parcel' },
    { id: 'fedex_ground', name: 'FedEx',  serviceLevel: 'FedEx Ground',          estimatedDays: '3-5 天', estimatedCost: 11.50, maxWeight: 30,   mode: 'parcel' },
    { id: 'xpo_ltl',      name: 'XPO',    serviceLevel: 'XPO LTL White Glove',   estimatedDays: '3-7 天', estimatedCost: 185.00,maxWeight: null, mode: 'ltl' },
  ],
  wh_ewr: [
    { id: 'ups_ground',   name: 'UPS',    serviceLevel: 'UPS Ground',           estimatedDays: '2-4 天', estimatedCost: 10.50, maxWeight: 30,   mode: 'parcel' },
    { id: 'fedex_express',name: 'FedEx',  serviceLevel: 'FedEx 2Day',            estimatedDays: '2 天',  estimatedCost: 26.00, maxWeight: 30,   mode: 'express' },
    { id: 'xpo_ltl',      name: 'XPO',    serviceLevel: 'XPO LTL Freight',       estimatedDays: '2-5 天', estimatedCost: 160.00,maxWeight: null, mode: 'ltl' },
  ],
  wh_dfw: [
    { id: 'ups_ground',   name: 'UPS',    serviceLevel: 'UPS Ground',           estimatedDays: '3-5 天', estimatedCost: 11.00, maxWeight: 30,   mode: 'parcel' },
    { id: 'fedex_ground', name: 'FedEx',  serviceLevel: 'FedEx Ground',          estimatedDays: '3-5 天', estimatedCost: 10.80, maxWeight: 30,   mode: 'parcel' },
    { id: 'usps_first',   name: 'USPS',   serviceLevel: 'USPS Priority Mail',    estimatedDays: '2-3 天', estimatedCost: 9.20,  maxWeight: 30,   mode: 'parcel' },
  ],
  wh_lhr: [
    { id: 'rm_tracked24', name: 'Royal Mail', serviceLevel: 'Royal Mail Tracked 24', estimatedDays: '1 天',  estimatedCost: 6.50,  maxWeight: 20,   mode: 'parcel' },
    { id: 'rm_tracked48', name: 'Royal Mail', serviceLevel: 'Royal Mail Tracked 48', estimatedDays: '2-3 天', estimatedCost: 4.80,  maxWeight: 20,   mode: 'parcel' },
    { id: 'dpd_next',     name: 'DPD',    serviceLevel: 'DPD Next Day',          estimatedDays: '1 天',  estimatedCost: 9.20,  maxWeight: 30,   mode: 'express' },
  ],
  wh_sg: [
    { id: 'nv_standard',  name: 'Ninja Van', serviceLevel: 'Ninja Van Standard',  estimatedDays: '2-3 天', estimatedCost: 6.50,  maxWeight: 30,   mode: 'parcel' },
    { id: 'nv_express',   name: 'Ninja Van', serviceLevel: 'Ninja Van Express',   estimatedDays: '次日',  estimatedCost: 12.00, maxWeight: 30,   mode: 'express' },
    { id: 'dhl_express',  name: 'DHL',    serviceLevel: 'DHL Express',           estimatedDays: '1-2 天', estimatedCost: 18.00, maxWeight: 30,   mode: 'express' },
  ],
};
