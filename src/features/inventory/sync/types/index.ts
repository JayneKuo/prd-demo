// 库存同步核心类型定义

export enum SkuStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DISCONTINUED = 'discontinued',
  PREORDER = 'preorder',
  BACKORDER = 'backorder'
}

export enum SyncFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MANUAL = 'manual',
  PULL = 'pull'
}

export enum RuleType {
  CHANNEL_SPECIFIC = 'channel_specific',
  OWNER_DIMENSION = 'owner_dimension',
  GLOBAL = 'global'
}

export enum OwnerScopeMode {
  ALL = 'all',
  INCLUDE = 'include',
  EXCLUDE = 'exclude'
}

export enum DeliveryMode {
  EDI = 'edi',
  API = 'api',
  FILE = 'file'
}

export enum OutputMode {
  INVENTORY_ONLY = 'inventory_only',
  INVENTORY_WITH_STATUS = 'inventory_with_status',
  INVENTORY_SNAPSHOT = 'inventory_snapshot'
}

export interface InventoryUnit {
  primary: string;
  secondary?: string;
  conversionRate?: number;
}

export interface SkuInfo {
  id: string;
  skuCode: string;
  status: SkuStatus;
  akaRetailerValue: string;
  upc: string;
  inventory: {
    quantity: number;
    reserved: number;
    available: number;
    units: InventoryUnit;
  };
  ownerId?: string;
  warehouseId?: string;
}

export interface RetailerInfo {
  id: string;
  name: string;
  code: string;
  syncEnabled: boolean;
  syncFrequency: SyncFrequency;
  lastSyncAt?: Date;
  syncConfig?: RetailerSyncConfig;
}

export interface RetailerSyncConfig {
  includeZeroInventory: boolean;
  syncUnavailableAsZero: boolean;
  inventoryAdjustmentRate?: number;
  maxSyncQuantity?: number;
  minSyncQuantity?: number;
  businessHoursOnly?: boolean;
  excludeHolidays?: boolean;
}

export interface SyncRule {
  id: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  conditions: {
    retailerIds?: string[];
    ownerScopeMode?: OwnerScopeMode;
    ownerIds?: string[];
    skuStatuses?: SkuStatus[];
    warehouseIds?: string[];
    inventoryRange?: {
      min?: number;
      max?: number;
    };
  };
  actions: {
    syncFrequency?: SyncFrequency;
    inventoryAdjustment?: number;
    forceZeroForUnavailable?: boolean;
    excludeFromSync?: boolean;
    overrideInventory?: number;
    deliveryMode?: DeliveryMode;
    outputMode?: OutputMode;
    ownerScopedOutput?: boolean;
  };
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncTask {
  id: string;
  retailerId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalSkus: number;
  syncedSkus: number;
  failedSkus: number;
  error?: string;
  logs: SyncLog[];
}

export interface SyncLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  skuId?: string;
  details?: Record<string, unknown>;
}

export interface EdiSyncData {
  retailerId: string;
  ownerId?: string;
  syncDate: string;
  syncType: 'full' | 'incremental';
  deliveryMode?: DeliveryMode;
  outputMode?: OutputMode;
  skus: Array<{
    skuId: string;
    status: SkuStatus;
    akaRetailerValue: string;
    upc: string;
    inventory: {
      quantity: number;
      unit: string;
      secondaryUnit?: string;
      secondaryQuantity?: number;
    };
    metadata?: Record<string, unknown>;
  }>;
}

export interface RuleMatchResult {
  matchedRules: SyncRule[];
  finalActions: {
    shouldSync: boolean;
    adjustedQuantity: number;
    syncPriority: number;
    forceZero: boolean;
    ownerQualified: boolean;
    ownerScopedOutput: boolean;
    deliveryMode: DeliveryMode;
    outputMode: OutputMode;
  };
}
