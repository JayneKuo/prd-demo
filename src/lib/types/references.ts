/**
 * 统一单号关联模型
 * 所有单据（入库单、出库单、销售单、履约单等）共用此结构
 */

/**
 * 内部链路 — 本平台单据之间的流转关系
 * 方向固定、可跳转、代表系统内部的业务流
 */
export type InternalLink = {
  /** 关联单据类型 */
  type: 'sales_order' | 'fulfillment' | 'purchase_order' | 'return_order' | 'transfer' | 'inbound' | 'outbound';
  /** 平台内部单号 */
  no: string;
  /** 可跳转的记录ID（用于路由） */
  id?: string;
};

/**
 * 外部引用 — 与外部系统的关联
 * 灵活、不限数量，来自上游（客户/渠道ERP）或下游（WMS/物流/海关）
 * type 为自由字符串，因为外部系统的单号类型无法预定义
 */
export type ExternalRef = {
  /** 单号类型标识（自由字符串，方便程序分类和搜索，如 customer_po / channel_so / wms_inbound） */
  type: string;
  /** 外部单号值 */
  no: string;
  /** 来源方向: upstream(客户/渠道ERP) | downstream(WMS/物流/海关) */
  source: 'upstream' | 'downstream';
  /** 显示名称（必填，UI展示用，如 "客户PO"、"Shopify SO"、"WMS入库单"） */
  label: string;
};

/**
 * 内部链路类型 → 中文标签映射
 */
export const INTERNAL_LINK_LABELS: Record<InternalLink['type'], string> = {
  sales_order: '销售单',
  fulfillment: '履约单',
  purchase_order: '采购单',
  return_order: '退货单',
  transfer: '调拨单',
  inbound: '入库单',
  outbound: '出库单',
};

/**
 * 内部链路类型 → 路由前缀映射
 */
export const INTERNAL_LINK_ROUTES: Record<InternalLink['type'], string> = {
  sales_order: '/dashboard/orders',
  fulfillment: '/dashboard/orders',
  purchase_order: '/dashboard/purchase',
  return_order: '/dashboard/returns',
  transfer: '/dashboard/transfers',
  inbound: '/dashboard/inbound',
  outbound: '/dashboard/outbound',
};

/**
 * 来源方向 → 中文标签
 */
export const SOURCE_LABELS: Record<ExternalRef['source'], string> = {
  upstream: '上游',
  downstream: '下游',
};
