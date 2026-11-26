import type { Entity, ItemQuantity } from './types';

export type ReplenishmentSourceType = 'transfer' | 'purchase' | 'third_party_fulfillment' | 'own_warehouse' | 'third_party_warehouse' | 'supplier' | 'retailer';
export type ReplenishmentDestinationType = 'oms_warehouse' | 'third_party_warehouse' | 'amazon_fba' | 'tiktok_fulfillment' | 'walmart_fc';
export type ReplenishmentReason = 'safety_stock' | 'forecast' | 'promotion' | 'stockout' | 'manual' | 'seasonal';
export type ReplenishmentStatus = 'draft' | 'pending_approval' | 'approved' | 'inbound_planning' | 'executing' | 'partially_completed' | 'completed' | 'cancelled' | 'exception';
export type InboundPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'preparing' | 'awaiting_platform' | 'packing_options' | 'packing' | 'placement_options' | 'platform_confirmed' | 'transport_preparing' | 'ready_for_execution' | 'executing' | 'receiving' | 'partially_received' | 'completed' | 'cancelled' | 'exception';
export type InboundPlatformStage = 'not_started' | 'request_submitted' | 'request_confirmed' | 'packing_options_ready' | 'packing_confirmed' | 'packing_submitted' | 'placement_options_ready' | 'placement_confirmed' | 'transport_options_ready' | 'transport_confirmed' | 'labels_ready' | 'failed';
export type InboundReason = 'purchase_receipt' | 'transfer' | 'platform_stocking' | 'return' | 'warehouse_relocation' | 'manual';
export const inboundReasonLabels: Record<InboundReason, string> = { purchase_receipt: '采购到货', transfer: '库存调拨', platform_stocking: '平台备货', return: '退货入库', warehouse_relocation: '仓库换仓', manual: '其他入库' };
export type ExecutionStatus = 'draft' | 'planned' | 'released' | 'in_progress' | 'shipped' | 'receiving' | 'completed' | 'cancelled' | 'exception';
export type PluginTaskOperation = 'create_platform_inbound' | 'sync_platform_plan' | 'get_allocation' | 'get_labels' | 'request_appointment' | 'sync_receiving';

/** 插件提交状态 */
export type PluginStatus = 'not_submitted' | 'queued' | 'submitting' | 'success' | 'failed' | 'pending_check' | 'unknown';
export const pluginStatusLabels: Record<PluginStatus, string> = {
  not_submitted: '未提交', queued: '排队中', submitting: '提交中', success: '已提交', failed: '提交失败', pending_check: '待核对', unknown: '结果未知',
};

/** 来源单据引用 */
export type SourceDoc = {
  type: 'purchase_order' | 'transfer_order' | 'replenishment' | 'return' | 'manual';
  number: string;
  id?: string;
};

/** 装箱明细（货件内一个箱子）*/
export type PackingBox = {
  id: string;
  boxNumber: string;
  lines: { lineId: string; quantity: number; lotNo?: string; expiryDate?: string }[];
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'in' };
};

/** 货件级标签 */
export type ShipmentLabel = {
  id: string;
  kind: 'item_label' | 'box_label' | 'pallet_label' | 'shipping_doc' | 'platform_box' | 'platform_item' | 'packing_list';
  fileName: string;
  status: 'not_requested' | 'queued' | 'ready' | 'failed';
  downloadUrl?: string;
  readyAt?: string;
};

/** 货件运输信息 */
export type ShipmentTransport = {
  mode?: 'SPD' | 'LTL' | 'FTL';
  carrier?: string;
  trackingNumber?: string;
  bolNumber?: string;
  scheduledPickup?: string;
  actualShipDate?: string;
  estimatedArrival?: string;
  appointmentRequired?: boolean;
  appointmentNumber?: string;
  appointmentStatus?: 'not_scheduled' | 'scheduled' | 'confirmed' | 'completed';
  deliveryWindow?: { start: string; end: string; timezone: string };
  actualArrival?: string;
};

/** 货件收货统计 */
export type ShipmentReceiving = {
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  shortQuantity: number;
  rejectedQuantity?: number;
  firstReceivedAt?: string;
  completedAt?: string;
  discrepancyReason?: string;
};

/** FBA 包装组 */
export type FbaPackingGroup = {
  id: string;
  externalGroupId: string;
  lines: QuantityAllocation[];
  supportedTransportModes: ('SPD' | 'LTL' | 'FTL')[];
  restrictions?: string[];
};

/** FBA 包装方案（平台返回多个选项，用户选一个）*/
export type FbaPackingOption = {
  id: string;
  externalOptionId: string;
  label?: string;
  packingGroups: FbaPackingGroup[];
  fees?: { currency: string; amount: number; type: string }[];
  expiresAt?: string;
};

/** FBA 分仓方案中的单票货件 */
export type FbaShipmentSlot = {
  externalShipmentId: string;
  destinationCode: string;
  destinationName?: string;
  lines: QuantityAllocation[];
};

/** FBA 分仓方案（平台返回多个选项，用户选一个）*/
export type FbaPlacementOption = {
  id: string;
  externalOptionId: string;
  shipments: FbaShipmentSlot[];
  fees?: { currency: string; amount: number; type: string }[];
  discount?: { currency: string; amount: number }[];
  expiresAt?: string;
};

/** FBA 运输方案（每票货件独立，可选）*/
export type FbaTransportOption = {
  id: string;
  externalOptionId: string;
  mode: 'SPD' | 'LTL' | 'FTL';
  carrier?: string;
  serviceType?: string;
  isPartnered: boolean;
  quote?: { currency: string; amount: number; expiresAt: string };
  estimatedArrival?: string;
};

/** 预处理/贴标配置（FBA 商品行级别）*/
export type PrepInstruction = {
  lineId: string;
  prepType?: string;             // 'polybagging' | 'bubble_wrap' | 'labeling' | ...
  prepOwnership?: 'seller' | 'amazon';  /** FBA 预处理责任方（US站 2026年后仅 seller）*/
  labelOwnership?: 'seller' | 'amazon'; /** FBA 贴标责任方（US站 2026年后仅 seller）*/
  confirmed?: boolean;
};

export type ReplenishmentLine = {
  id: string;
  sku: string;
  omsVariantId: string;
  /** 旧字段兼容；新入库计划使用收发货仓 SKU 和平台商品编码。 */
  channelSku?: string;
  destinationSku?: string;
  /** 收货仓 / 目标服务的 SKU。 */
  receivingWarehouseSku?: string;
  /** 发货仓 / 来源节点的 SKU。 */
  shippingWarehouseSku?: string;
  /** Amazon/WFS/FBT 等目标平台的商品编码。 */
  platformProductCode?: string;
  fnsku?: string;
  asin?: string;
  sourceSku?: string;
  sourceBarcode?: string;
  quantity: number;
  /** 原始单位与 OMS 统一核算单位；入库计划保留换算依据。 */
  unit?: string;
  conversionRate?: number;
  cartonQuantity?: number;
  palletQuantity?: number;
  gtin?: string;             /** GTIN（WFS/部分平台必填）*/
  estimatedArrivalDate?: string;  /** 商品行预计到仓日期（WFS 必填）*/
  msku?: string;             /** FBA MSKU（Amazon Marketplace SKU）*/
  fbtGoodsId?: string;       /** TikTok FBT Goods ID */
  prepOwnership?: 'seller' | 'amazon';  /** FBA 预处理责任方（US站 2026年后仅 seller）*/
  labelOwnership?: 'seller' | 'amazon'; /** FBA 贴标责任方（US站 2026年后仅 seller）*/
  prepRequirements?: string[]; /** FBA 平台返回预处理指导，如 ['polybagging','labeling'] */
  lotNo?: string;
  expiryDate?: string;
  sourceLineNo?: string;
  note?: string;
};
export type QuantityAllocation = { lineId: string; quantity: number };

export type ReplenishmentPlan = Entity & {
  number: string;
  sourceType: ReplenishmentSourceType;
  destinationType: ReplenishmentDestinationType;
  reason: ReplenishmentReason;
  /** 发货端：自有仓/3PL 发货时填写。 */
  shippingWarehouseId?: string;
  /** 入库端：目标为 OMS/第三方仓时填写；平台仓由插件回传具体地址。 */
  receivingWarehouseId?: string;
  supplierId?: string;
  retailerId?: string;
  thirdPartyWarehouseId?: string;
  /** 兼容内部执行关系的来源仓字段，新增页面不再使用。 */
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  connectionId?: string;
  site?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  planNote?: string;
  createdBy?: string;
  approvedBy?: string;
  lines: ReplenishmentLine[];
  status: ReplenishmentStatus;
  plannedShipDate?: string;
  plannedArrivalDate?: string;
  transferOrderId?: string;
  purchaseOrderId?: string;
  /** 先装箱再分仓：各包装组装箱明细，key = packingGroupId */
  packingGroupBoxes?: Record<string, PackingBox[]>;
  inboundPlanId?: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  note?: string;
};

export type TransferOrder = Entity & { number: string; replenishmentPlanId: string; sourceWarehouseId: string; destinationWarehouseId: string; lines: ReplenishmentLine[]; status: ExecutionStatus; reservedAt?: string };
export type PurchaseOrder = Entity & { number: string; replenishmentPlanId: string; supplierId: string; destinationWarehouseId?: string; lines: ReplenishmentLine[]; status: ExecutionStatus; confirmedAt?: string };

export type PlatformReference = { provider: ReplenishmentDestinationType; externalPlanId?: string; externalStatus?: string; syncedAt?: string; payload?: unknown };
export type PlatformAllocation = Entity & {
  inboundPlanId: string;
  externalShipmentId?: string;
  destinationCode: string;
  destinationName?: string;
  /** 实际目的仓地址（平台确认分仓后回写）*/
  actualDestAddress?: { name: string; address1: string; city: string; state?: string; country: string; zip?: string };
  lines: QuantityAllocation[];
  status: 'received' | 'confirmed' | 'superseded';
  sourceExecutionIds: string[];
  /** 装箱数据 */
  boxes?: PackingBox[];
  /** 货件标签 */
  labels?: ShipmentLabel[];
  /** 运输信息 */
  transport?: ShipmentTransport;
  /** 收货统计 */
  receiving?: ShipmentReceiving;
};

export type InboundPlan = Entity & {
  number: string;
  /** 可独立创建；旧 Demo 数据仍保留补货计划关联以兼容历史记录。 */
  replenishmentPlanId?: string;
  /** 来源单据（采购单、调拨单等）*/
  sourceDoc?: SourceDoc;
  sourcePartyId?: string;
  sourceAddressId?: string;
  sourceAddress?: { name: string; phone?: string; address1: string; city: string; province?: string; zip?: string; country: string };
  destinationAddress?: { name: string; address1: string; city: string; province?: string; zip?: string; country: string; pendingExternalConfirmation?: boolean };
  sourceWarehouseId?: string;
  sourceLabel?: string;
  sourceDispatchStatus?: 'not_ready' | 'ready' | 'released' | 'shipped' | 'exception';
  sourceDispatchReference?: string;
  sourceDispatchCarrier?: string;
  sourceDispatchTracking?: string;
  sourceDispatchedAt?: string;
  /** 本次入库执行原因，不等同于备货建议原因。 */
  inboundReason?: InboundReason;
  sourceType: ReplenishmentSourceType;
  destinationType: ReplenishmentDestinationType;
  destinationWarehouseId?: string;
  connectionId?: string;
  site?: string;
  lines: ReplenishmentLine[];
  status: InboundPlanStatus;
  /** 插件提交状态 */
  pluginStatus?: PluginStatus;
  pluginError?: { code: string; message: string; retryable?: boolean };
  pluginOperationId?: string;
  pluginSubmittedAt?: string;
  pluginSyncedAt?: string;
  platform?: PlatformReference;
  platformStage?: InboundPlatformStage;
  platformOperationId?: string;
  packingGroups?: { id: string; lines: QuantityAllocation[]; status: 'candidate' | 'confirmed' }[];
  /** 商品行预处理/贴标配置（FBA）*/
  prepInstructions?: PrepInstruction[];
  /** WFS 退货地址 */
  returnAddress?: { name: string; address1: string; city: string; state?: string; country: string; zip?: string };
  transportStatus?: 'not_ready' | 'options_ready' | 'confirmed';
  labelsReady?: boolean;
  /** FBA 分仓方式：先装箱再分仓 / 先分仓再装箱 */
  shipmentMode?: 'box_first' | 'placement_first';
  /** FBA 包装方案选项（platform 返回后存储）*/
  packingOptions?: FbaPackingOption[];
  selectedPackingOptionId?: string;
  /** FBA 分仓方案选项 */
  placementOptions?: FbaPlacementOption[];
  selectedPlacementOptionId?: string;
  /** FBA 运输方案，key 为 allocationId */
  transportOptions?: Record<string, FbaTransportOption[]>;
  selectedTransportOptions?: Record<string, string>;
  allocationIds: string[];
  inboundOrderIds: string[];
  outboundPlanIds: string[];
  purchaseOrderId?: string;
  /** 先装箱再分仓：各包装组装箱明细，key = packingGroupId */
  packingGroupBoxes?: Record<string, PackingBox[]>;
  /** 计划日期 */
  plannedShipDate?: string;
  plannedArrivalDate?: string;
  createdAt: string;
  confirmedAt?: string;
};

export type OutboundPlan = Entity & { number: string; inboundPlanId: string; sourceType: ReplenishmentSourceType; sourceWarehouseId?: string; lines: QuantityAllocation[]; status: ExecutionStatus; outboundOrderIds: string[] };
export type InboundOrder = Entity & { number: string; inboundPlanId: string; allocationId?: string; destinationCode?: string; lines: QuantityAllocation[]; status: ExecutionStatus; expectedQuantity: number; receivedQuantity: number; damagedQuantity: number; shortQuantity: number };
export type OutboundLabel = { id: string; kind: 'platform_box' | 'platform_item' | 'oms_carton' | 'packing_list'; provider?: ReplenishmentDestinationType; fileName: string; downloadUrl?: string; status: 'not_requested' | 'queued' | 'ready' | 'failed'; requestedAt?: string; readyAt?: string; };
export type OutboundOrder = Entity & { number: string; outboundPlanId: string; inboundOrderId?: string; sourceWarehouseId: string; destinationCode?: string; lines: QuantityAllocation[]; status: ExecutionStatus; packageIds: string[]; labels?: OutboundLabel[]; carrier?: string; trackingNumber?: string; dispatchedAt?: string };

export type ReplenishmentPluginTask = Entity & { operation: PluginTaskOperation; inboundPlanId: string; provider: ReplenishmentDestinationType; status: 'queued' | 'running' | 'succeeded' | 'failed'; idempotencyKey: string; requestedAt: string; completedAt?: string; request?: unknown; response?: unknown; error?: string };

export type ReplenishmentSnapshot = {
  replenishmentPlans?: ReplenishmentPlan[];
  transferOrders?: TransferOrder[];
  purchaseOrders?: PurchaseOrder[];
  inboundPlans?: InboundPlan[];
  platformAllocations?: PlatformAllocation[];
  outboundPlans?: OutboundPlan[];
  inboundOrders?: InboundOrder[];
  outboundOrders?: OutboundOrder[];
  replenishmentPluginTasks?: ReplenishmentPluginTask[];
};

export const allocationTotal = (lines: QuantityAllocation[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
export const itemTotal = (lines: ReplenishmentLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
export const destinationNeedsPlatform = (type: ReplenishmentDestinationType) => ['amazon_fba', 'tiktok_fulfillment', 'walmart_fc'].includes(type);
