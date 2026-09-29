'use client';

import Link from 'next/link';
import React, { useMemo, useState, useCallback, useReducer } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock3, CreditCard, ExternalLink, FileText, MapPin, Package, Tag, User, AlertTriangle, Copy, Check, X, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { orders } from '@/lib/mock-data/orders';
import { getOrderDetail, type OrderDetail, type FulfillmentPackage, type PackageUnit, type OrderEvent, type RefundRecord, type UpstreamChange } from '@/lib/mock-data/order-details';
import { cn } from '@/lib/utils';
import { OrderTimeline } from '@/components/dashboard/order-timeline';
import { CreateFulfillmentModal, type CreateFulfillmentResult } from '@/components/orders/create-fulfillment-modal';
import { RefundModal } from '@/components/orders/refund-modal';
import { ConfirmPaymentModal } from '@/components/orders/confirm-payment-modal';
import { CancelOrderModal } from '@/components/orders/cancel-order-modal';

// ─── 本地订单状态管理 ──────────────────────────────────────────────────────────

type OrderLocalState = {
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  exception: string;
  note: string;
  events: OrderEvent[];
  refunds: RefundRecord[];
  tags: string[];
  cancelledAt?: string;
  closedAt?: string;
  shippingAddress?: OrderDetail['shippingAddress'];
  fulfillments: FulfillmentPackage[];
  /** 手动添加/移除的折扣码 */
  discountCodes: OrderDetail['discountCodes'];
  /** 手动调整后的运费（覆盖 detail.totalShipping） */
  adjustedShipping?: string;
  /** 上游渠道变更事件（系统自动感知） */
  upstreamChanges: UpstreamChange[];
};

type OrderAction =
  | { type: 'CONFIRM_PAYMENT' }
  | { type: 'CREATE_FULFILLMENT'; fulfillments: Omit<FulfillmentPackage, 'id'>[]; groupCount: number }
  | { type: 'RELEASE_HOLD' }
  | { type: 'CONFIRM_SHIPMENT' }
  | { type: 'CONFIRM_DELIVERY' }
  | { type: 'CANCEL_ORDER'; reason: string }
  | { type: 'CANCEL_FULFILLMENT'; fulfillmentId: string; reason: string }
  | { type: 'REROUTE_FULFILLMENT'; fulfillmentId: string; newWarehouseCode: string; newWarehouseId: string }
  | { type: 'UPDATE_TRACKING'; fulfillmentId: string; trackingNumber: string; carrier: string; trackingUrl?: string }
  | { type: 'REFUND'; refund: RefundRecord; newFinancialStatus: string }
  | { type: 'REOPEN' }
  | { type: 'ADD_NOTE'; note: string }
  | { type: 'ADD_TIMELINE_NOTE'; content: string }
  | { type: 'CLEAR_EXCEPTION' }
  | { type: 'MANUAL_ROUTING' }
  | { type: 'FIX_SKU' }
  | { type: 'MANUAL_REVIEW_PASS' }
  | { type: 'CONTACT_CARRIER' }
  | { type: 'UPDATE_ADDRESS'; address: OrderDetail['shippingAddress'] }
  | { type: 'ADD_DISCOUNT_CODE'; code: string; amount: string }
  | { type: 'REMOVE_DISCOUNT_CODE'; code: string }
  | { type: 'ADJUST_SHIPPING'; amount: string }
  | { type: 'ADD_TAG'; tag: string }
  | { type: 'REMOVE_TAG'; tag: string }
  | { type: 'CAPTURE_PAYMENT'; transactionId: string }
  | { type: 'HANDLE_UPSTREAM_CHANGE'; changeId: string; action: string; lineItems?: import('@/lib/mock-data/order-details').OrderLineItem[] }
  | { type: 'IGNORE_UPSTREAM_CHANGE'; changeId: string; lineItems?: import('@/lib/mock-data/order-details').OrderLineItem[] };

function makeEvent(title: string, description: string, type: OrderEvent['type']): OrderEvent {
  return {
    id: `evt_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    actor: '当前用户',
    actorRole: 'ops_manager',
    title,
    description,
    type,
  };
}

/** 根据上游变更数据生成自然语言摘要（用于时间线事件描述） */
function buildUpstreamSummaryText(
  change: UpstreamChange | undefined,
  lineItems: import('@/lib/mock-data/order-details').OrderLineItem[]
): string {
  if (!change) return '';
  const bef = change.before as Record<string, unknown> | undefined;
  const aft = change.after  as Record<string, unknown> | undefined;
  const lid = (bef?.lineItemId ?? aft?.lineItemId) as string | undefined;
  const sku = (bef?.sku ?? aft?.sku) as string | undefined;
  const item = lid ? lineItems.find(li => li.id === lid) : sku ? lineItems.find(li => li.sku === sku) : null;
  const itemLabel = item ? `${item.title}（${item.sku}）` : sku ?? null;

  switch (change.type) {
    case 'order_cancelled':    return '买家在渠道侧取消了整个订单';
    case 'buyer_cancel_request': return '买家通过渠道提交了取消申请';
    case 'item_cancelled': {
      const qty = bef?.quantity;
      return itemLabel ? `${itemLabel} × ${qty ?? '?'} 件 被渠道取消` : '商品行被渠道取消';
    }
    case 'quantity_changed': {
      const qB = bef?.quantity; const qA = aft?.quantity;
      return itemLabel ? `${itemLabel} 数量 ${qB} → ${qA} 件` : `数量 ${qB} → ${qA}`;
    }
    case 'address_changed': {
      if (bef && aft) return `收货地址：${bef.address1 ?? ''}，${bef.city ?? ''} → ${aft.address1 ?? ''}，${aft.city ?? ''}`;
      return '买家修改了收货地址';
    }
    case 'item_added':    return itemLabel ? `渠道新增商品：${itemLabel}` : '渠道侧新增了商品行';
    case 'price_changed': {
      const pB = bef?.price; const pA = aft?.price;
      return itemLabel ? `${itemLabel} 单价 ${pB} → ${pA}` : `价格 ${pB} → ${pA}`;
    }
    default: return '渠道侧发生了变更';
  }
}

function orderReducer(state: OrderLocalState, action: OrderAction): OrderLocalState {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  switch (action.type) {

    // ── 正向流 ──────────────────────────────────────────────────────────────

    case 'CONFIRM_PAYMENT':
      return {
        ...state,
        financialStatus: '已支付',
        exception: state.exception === '支付待确认' ? '' : state.exception,
        events: [makeEvent('支付已确认', `手动确认支付成功，订单进入待处理队列`, 'payment'), ...state.events],
      };

    case 'CREATE_FULFILLMENT':
      return {
        ...state,
        status: '处理中',
        fulfillmentStatus: action.groupCount > 1 ? '部分履约' : '已生成',
        fulfillments: [
          ...state.fulfillments,
          ...action.fulfillments.map((f, i) => ({
            ...f,
            id: `ful_local_${Date.now()}_${i}`,
          })),
        ],
        events: [
          makeEvent(
            `生成 ${action.groupCount} 个履约单`,
            `共 ${action.fulfillments.length} 个履约包裹，已下发至仓库执行拣货`,
            'fulfillment'
          ),
          makeEvent('履约资格判定通过', '商品库存检查通过，已支付，进入分仓决策', 'fulfillment'),
          ...state.events,
        ],
      };

    case 'RELEASE_HOLD':
      return {
        ...state,
        status: '待处理',
        exception: '',
        events: [makeEvent('保留已释放', `订单从"${state.status}"状态释放，重新进入处理队列，exception 已清除`, 'edit'), ...state.events],
      };

    case 'CONFIRM_SHIPMENT':
      return {
        ...state,
        status: '已发货',
        fulfillmentStatus: '已发货',
        events: [makeEvent('发货已确认', '手动确认发货，订单状态更新为已发货，等待客户签收', 'fulfillment'), ...state.events],
      };

    case 'CONFIRM_DELIVERY':
      return {
        ...state,
        status: '已完成',
        fulfillmentStatus: '已签收',
        closedAt: now,
        events: [
          makeEvent('订单完成', '签收确认，订单自动关闭', 'system'),
          makeEvent('确认签收', '客户已签收，履约完成', 'fulfillment'),
          ...state.events,
        ],
      };

    // ── 异常处理 ─────────────────────────────────────────────────────────────

    case 'CLEAR_EXCEPTION':
      return {
        ...state,
        exception: '',
        events: [makeEvent('地址验证通过', `重新验证地址成功，异常已清除，订单可继续履约`, 'system'), ...state.events],
      };

    case 'MANUAL_ROUTING':
      return {
        ...state,
        status: '处理中',
        exception: '',
        fulfillmentStatus: '已生成',
        events: [
          makeEvent('手动分仓完成', '已手动指定仓库，履约单已生成，等待仓库执行', 'fulfillment'),
          makeEvent('异常已处理', `手动干预处理"${state.exception}"异常，继续履约流程`, 'edit'),
          ...state.events,
        ],
      };

    case 'FIX_SKU': {
      const newState = {
        ...state,
        exception: '',
        events: [makeEvent('SKU映射已修复', 'SKU 映射问题已在商品中心完成配置，订单重新进入履约判定', 'system'), ...state.events],
      };
      return newState;
    }

    case 'MANUAL_REVIEW_PASS':
      return {
        ...state,
        exception: '',
        status: '待处理',
        events: [makeEvent('人工审核通过', '风控/合规审核已通过，订单恢复正常处理', 'risk'), ...state.events],
      };

    case 'CONTACT_CARRIER':
      return {
        ...state,
        events: [makeEvent('已联系承运商', `已向承运商发起投递失败处理请求，等待承运商反馈`, 'logistics'), ...state.events],
      };

    // ── 逆向流 ──────────────────────────────────────────────────────────────

    case 'CANCEL_ORDER':
      return {
        ...state,
        status: '已取消',
        cancelledAt: now,
        events: [makeEvent('订单已取消', `取消原因：${action.reason}`, 'edit'), ...state.events],
      };

    case 'REFUND': {
      return {
        ...state,
        financialStatus: action.newFinancialStatus,
        refunds: [...state.refunds, action.refund],
        events: [makeEvent(
          `退款已发起 ${action.refund.amount}`,
          `退款单 ${action.refund.refundNo ?? action.refund.id} · 原因：${action.refund.reason} · 方式：${action.refund.method ?? '原路返回'}`,
          'refund'
        ), ...state.events],
      };
    }

    case 'REOPEN':
      return {
        ...state,
        status: '待处理',
        closedAt: undefined,
        cancelledAt: undefined,
        events: [makeEvent('订单已重新打开', '订单重新进入待处理状态，可继续操作', 'edit'), ...state.events],
      };

    case 'ADD_NOTE':
      return {
        ...state,
        note: action.note,
        events: [makeEvent('备注已更新', action.note.slice(0, 80) + (action.note.length > 80 ? '…' : ''), 'note'), ...state.events],
      };

    case 'UPDATE_ADDRESS':
      return {
        ...state,
        shippingAddress: action.address,
        events: [makeEvent('收货地址已更新', `新地址：${action.address.formatted}`, 'edit'), ...state.events],
      };

    case 'CANCEL_FULFILLMENT':
      return {
        ...state,
        fulfillments: state.fulfillments.map((f) =>
          f.id === action.fulfillmentId ? { ...f, status: 'cancelled' } : f
        ),
        events: [makeEvent(
          '履约单已取消',
          `履约单 ${state.fulfillments.find((f) => f.id === action.fulfillmentId)?.fulfillmentOrderNo ?? action.fulfillmentId} 已取消 · 原因：${action.reason}`,
          'fulfillment'
        ), ...state.events],
      };

    case 'REROUTE_FULFILLMENT':
      return {
        ...state,
        fulfillments: state.fulfillments.map((f) =>
          f.id === action.fulfillmentId
            ? { ...f, warehouse: action.newWarehouseCode, outboundStatus: '待拣货', status: 'in_progress' }
            : f
        ),
        events: [makeEvent(
          '履约单已重新分仓',
          `切换至仓库 ${action.newWarehouseCode}，重新生成出库单`,
          'fulfillment'
        ), ...state.events],
      };

    case 'UPDATE_TRACKING': {
      const trackUrl = action.trackingUrl || `https://t.17track.net/zh-cn#nums=${action.trackingNumber}`;
      return {
        ...state,
        fulfillments: state.fulfillments.map((f) =>
          f.id === action.fulfillmentId
            ? { ...f, carrier: action.carrier, trackingNumber: action.trackingNumber, trackingUrl: trackUrl }
            : f
        ),
        events: [makeEvent('运单号已录入', `${action.carrier} · ${action.trackingNumber}`, 'logistics'), ...state.events],
      };
    }

    case 'ADD_TIMELINE_NOTE':
      return {
        ...state,
        events: [makeEvent('内部备注', action.content, 'note'), ...state.events],
      };

    case 'ADD_DISCOUNT_CODE':
      return {
        ...state,
        discountCodes: [...(state.discountCodes ?? []), { code: action.code, type: 'custom', amount: action.amount }],
        events: [makeEvent('添加优惠码', `优惠码 ${action.code} 已添加，折扣 ${action.amount}`, 'edit'), ...state.events],
      };

    case 'REMOVE_DISCOUNT_CODE':
      return {
        ...state,
        discountCodes: (state.discountCodes ?? []).filter((d) => d.code !== action.code),
        events: [makeEvent('移除优惠码', `优惠码 ${action.code} 已移除`, 'edit'), ...state.events],
      };

    case 'ADJUST_SHIPPING':
      return {
        ...state,
        adjustedShipping: action.amount,
        events: [makeEvent('运费已调整', `运费更新为 ${action.amount}`, 'edit'), ...state.events],
      };

    case 'ADD_TAG':
      if (state.tags.includes(action.tag)) return state;
      return {
        ...state,
        tags: [...state.tags, action.tag],
        events: [makeEvent('添加标签', `标签 "${action.tag}" 已添加`, 'edit'), ...state.events],
      };

    case 'REMOVE_TAG':
      return {
        ...state,
        tags: state.tags.filter((t) => t !== action.tag),
        events: [makeEvent('移除标签', `标签 "${action.tag}" 已移除`, 'edit'), ...state.events],
      };

    case 'CAPTURE_PAYMENT':
      return {
        ...state,
        financialStatus: '已支付',
        events: [makeEvent('扣款确认', `交易 ${action.transactionId} 已完成 Capture，款项到账`, 'payment'), ...state.events],
      };

    case 'HANDLE_UPSTREAM_CHANGE': {
      const change = state.upstreamChanges.find((c) => c.id === action.changeId);
      const suggestion = change?.suggestions.find((s) => s.action === action.action);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      let stateUpdates: Partial<OrderLocalState> = {};

      // 根据处置动作更新订单状态
      if (action.action === 'agree_cancel_partial' || action.action === 'agree_cancel') {
        stateUpdates = { status: '已取消', cancelledAt: now, financialStatus: '部分退款' };
      } else if (action.action === 'accept_address' && change?.after) {
        const newAddr = change.after as Record<string, string>;
        stateUpdates = {
          shippingAddress: state.shippingAddress
            ? { ...state.shippingAddress, ...newAddr, formatted: `${newAddr.address1 ?? state.shippingAddress.address1}, ${state.shippingAddress.city}` }
            : state.shippingAddress,
        };
      }

      // 生成自然语言摘要（供时间线显示）
      const summary = buildUpstreamSummaryText(change, action.lineItems ?? []);

      return {
        ...state,
        ...stateUpdates,
        upstreamChanges: state.upstreamChanges.map((c) =>
          c.id === action.changeId ? { ...c, status: 'handled' as const, handledAt: now, handledBy: '当前用户', handledAction: suggestion?.label ?? action.action } : c
        ),
        events: [{
          id: `evt_upstream_handled_${Date.now()}`,
          time: now,
          actor: '当前用户',
          actorRole: 'ops',
          title: `已处置：${suggestion?.label ?? action.action}`,
          description: suggestion?.description,
          type: 'upstreamChange' as const,
          upstreamChangeType: change?.type,
          upstreamChangeSummary: summary,
        }, ...state.events],
      };
    }

    case 'IGNORE_UPSTREAM_CHANGE': {
      const now2 = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const ch = state.upstreamChanges.find((c) => c.id === action.changeId);
      const summary2 = buildUpstreamSummaryText(ch, action.lineItems ?? []);
      return {
        ...state,
        upstreamChanges: state.upstreamChanges.map((c) =>
          c.id === action.changeId ? { ...c, status: 'ignored' as const, handledAt: now2, handledBy: '当前用户' } : c
        ),
        events: [{
          id: `evt_upstream_ignored_${Date.now()}`,
          time: now2,
          actor: '当前用户',
          actorRole: 'ops',
          title: '已忽略此变更，保持原履约计划',
          type: 'upstreamChange' as const,
          upstreamChangeType: ch?.type,
          upstreamChangeSummary: summary2,
        }, ...state.events],
      };
    }

    default:
      return state;
  }
}

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
      title="复制"
    >
      {copied ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
    </button>
  );
}

/* ─── Fulfillment status mapping (英文 → 中文友好描述) ─── */
function mapFulfillmentStatus(ful: FulfillmentPackage): string {
  if (ful.status === 'delivered') return '已签收';
  if (ful.status === 'in_transit') return '运输中';
  if (ful.status === 'fulfilled') return '已完成';
  if (ful.status === 'cancelled') return '已取消';
  // in_progress — 根据出库单状态细化
  if (ful.outboundStatus) return ful.outboundStatus;
  return '处理中';
}

/* ─── 履约类型元数据 ─── */
const FULFILLMENT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  physical:  { label: '实物商品', icon: '📦', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  presale:   { label: '预售商品', icon: '⏳', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  service:   { label: '服务商品', icon: '🔧', color: 'bg-purple-50 text-purple-700 ring-purple-200' },
  rental:    { label: '租赁商品', icon: '🔑', color: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  gift_card: { label: '礼品卡',   icon: '🎁', color: 'bg-pink-50 text-pink-700 ring-pink-200' },
  digital:   { label: '数字商品', icon: '💾', color: 'bg-green-50 text-green-700 ring-green-200' },
};

type LifecycleStep = {
  label: string;
  status: 'complete' | 'current' | 'upcoming';
  detail: string;
};

/** 根据 fulfillmentType 返回对应的进度条步骤标签列表 */
function getLifecycleLabels(fulfillmentType?: string): string[] {
  switch (fulfillmentType) {
    case 'presale':   return ['下单', '支付', '预售期', '出库', '签收'];
    case 'service':   return ['下单', '支付', '确认', '服务交付', '完成'];
    case 'rental':    return ['下单', '支付', '确认', '出借', '归还'];
    case 'gift_card': return ['下单', '支付', '确认', '卡号生成', '已发卡'];
    case 'digital':   return ['下单', '支付', '确认', '授权码生成', '已交付'];
    default:          return ['下单', '支付', '确认', '履约', '签收'];
  }
}

function getLifecycleStepIndex(detail: OrderDetail) {
  const ft = detail.fulfillmentType;

  // 礼品卡：按卡状态判断
  if (ft === 'gift_card') {
    const cardStatus = detail.giftCardConfig?.cardStatus;
    if (cardStatus === 'issued' || cardStatus === 'activated' || cardStatus === 'redeemed') return 4;
    if (detail.fulfillmentStatus === '卡号生成中' || detail.fulfillmentStatus.includes('生成')) return 3;
    if (['待处理', '处理中'].includes(detail.status)) return 2;
    if (['已支付', '待确认'].includes(detail.financialStatus)) return 1;
    return 0;
  }

  // 租赁：按归还状态
  if (ft === 'rental') {
    const rentalStatus = detail.rentalConfig?.rentalStatus;
    if (rentalStatus === 'returned') return 4;
    if (detail.fulfillments.some(f => f.status === 'delivered') || rentalStatus === 'active' || rentalStatus === 'overdue') return 3;
    if (detail.fulfillments.length > 0 || ['已发货'].includes(detail.fulfillmentStatus)) return 3;
    if (['待处理', '处理中'].includes(detail.status)) return 2;
    if (['已支付'].includes(detail.financialStatus)) return 1;
    return 0;
  }

  // 服务：按服务状态
  if (ft === 'service') {
    const serviceStatus = detail.serviceConfig?.serviceStatus;
    if (serviceStatus === 'completed') return 4;
    if (serviceStatus === 'in_progress' || serviceStatus === 'scheduled') return 3;
    if (['待处理', '处理中'].includes(detail.status)) return 2;
    if (['已支付'].includes(detail.financialStatus)) return 1;
    return 0;
  }

  // 预售：加"预售期"节点
  if (ft === 'presale') {
    const presaleStatus = detail.presaleConfig?.presaleStatus;
    if (detail.fulfillmentStatus === '已签收' || detail.fulfillments.some(f => f.status === 'delivered')) return 4;
    if (detail.fulfillments.length > 0 || ['已发货', '已生成'].includes(detail.fulfillmentStatus)) return 3;
    if (presaleStatus === 'ended' || ['处理中'].includes(detail.status)) return 2;
    if (['已支付'].includes(detail.financialStatus)) return 1;
    return 0;
  }

  // 实物（默认）
  if (detail.fulfillmentStatus === '已签收' || detail.fulfillments.some(f => f.status === 'delivered')) return 4;
  if (detail.fulfillments.length > 0 || ['已发货', '部分履约', '已生成'].includes(detail.fulfillmentStatus)) return 3;
  if (['待处理', '处理中', '挂起', '保留', '已完成'].includes(detail.status) || detail.updatedAt !== detail.createdAt) return 2;
  if (['已支付', '部分退款', '已退款', '待确认'].includes(detail.financialStatus) || detail.transactions.length > 0) return 1;
  return 0;
}

function getLifecycleSteps(detail: OrderDetail): LifecycleStep[] {
  const currentIndex = getLifecycleStepIndex(detail);
  const ft = detail.fulfillmentType;
  const labels = getLifecycleLabels(ft);

  // 每步的 detail 文字（各类型独立）
  const payTxn = detail.transactions.find(t => t.kind === 'sale' && t.status === 'success');
  const step1Detail =
    detail.financialStatus === '已支付' ? (payTxn?.createdAt?.slice(5, 16) ?? '已确认') :
    detail.financialStatus === '待确认' ? '等待确认' :
    detail.financialStatus === '已退款' ? '已退款' : '';

  let stepDetails: string[];

  if (ft === 'presale') {
    const pc = detail.presaleConfig;
    stepDetails = [
      detail.createdAt.slice(5, 16),
      step1Detail,
      pc ? `到 ${pc.presaleEndDate?.slice(5)} · ${pc.currentPresaleQty ?? 0}/${pc.minQtyThreshold ?? '?'} 件` : '',
      currentIndex >= 3 ? (detail.fulfillmentStatus === '已发货' ? '全部发货' : `${detail.fulfillments.length} 个包裹`) : '',
      currentIndex >= 4 ? '已完成' : '',
    ];
  } else if (ft === 'service') {
    const sc = detail.serviceConfig;
    stepDetails = [
      detail.createdAt.slice(5, 16),
      step1Detail,
      currentIndex >= 2 ? '已确认' : '',
      sc ? (sc.serviceStatus === 'completed' ? `${sc.completedAt?.slice(5, 16) ?? '已完成'}` : sc.scheduledDate ? `${sc.scheduledDate.slice(5)} ${sc.scheduledTimeWindow ?? ''}` : sc.serviceStatus) : '',
      currentIndex >= 4 ? (sc?.completedAt?.slice(5, 16) ?? '已完成') : '',
    ];
  } else if (ft === 'rental') {
    const rc = detail.rentalConfig;
    stepDetails = [
      detail.createdAt.slice(5, 16),
      step1Detail,
      currentIndex >= 2 ? '已确认' : '',
      rc ? (rc.rentalStatus === 'active' ? `到 ${rc.rentalEndDate?.slice(5)}` : rc.rentalStatus === 'overdue' ? '已逾期' : '已出借') : '',
      rc ? (rc.rentalStatus === 'returned' ? (rc.returnedAt?.slice(5, 16) ?? '已归还') : rc.rentalEndDate ? `到期 ${rc.rentalEndDate.slice(5)}` : '') : '',
    ];
  } else if (ft === 'gift_card') {
    const gc = detail.giftCardConfig;
    stepDetails = [
      detail.createdAt.slice(5, 16),
      step1Detail,
      currentIndex >= 2 ? '已确认' : '',
      gc ? (gc.cardStatus === 'pending_issue' ? '生成中' : gc.cardNumber ? `卡号已生成` : gc.cardStatus) : '',
      gc ? (gc.cardStatus === 'issued' || gc.cardStatus === 'activated' ? '已发送至收件人' : '') : '',
    ];
  } else {
    stepDetails = [
      detail.createdAt.slice(5, 16),
      step1Detail,
      currentIndex >= 2 ? (detail.status === '保留' ? '已保留' : detail.status === '挂起' ? '已挂起' : detail.status === '已取消' ? '已取消' : '风控通过') : '',
      currentIndex >= 3 ? (detail.fulfillmentStatus === '已签收' ? '全部签收' : detail.fulfillmentStatus === '已发货' ? '全部发货' : detail.fulfillmentStatus === '部分履约' ? '部分完成' : detail.fulfillmentStatus === '已暂停' ? '已暂停' : `${detail.fulfillments.length} 个包裹`) : '',
      currentIndex >= 4 ? (detail.closedAt ? detail.closedAt.slice(5, 16) : '已完成') : '',
    ];
  }

  return labels.map((label, index) => ({
    label,
    status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
    detail: stepDetails[index] || '',
  }));
}

function isSameAddress(detail: OrderDetail) {
  return detail.shippingAddress.formatted === detail.billingAddress.formatted;
}

const detailTabs = ['商品明细', '履约信息', '物流信息'] as const;

type DetailTab = (typeof detailTabs)[number];

/* ─── Page ─── */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const detail = getOrderDetail(id);
  const basicOrder = orders.find((o) => o.id === id);
  const [activeTab, setActiveTab] = useState<DetailTab>('商品明细');
  const [decisionModal, setDecisionModal] = useState<string | null>(null);
  const [packageModal, setPackageModal] = useState<string | null>(null);

  // 本地订单状态（从 detail 初始化，操作后在本地流转）
  const [orderState, dispatch] = useReducer(orderReducer, detail ? {
    status: detail.status,
    financialStatus: detail.financialStatus,
    fulfillmentStatus: detail.fulfillmentStatus,
    exception: detail.exception ?? '',
    note: detail.note ?? '',
    events: [...detail.events],
    refunds: [...detail.refunds],
    tags: [...detail.tags],
    cancelledAt: detail.cancelledAt,
    closedAt: detail.closedAt,
    shippingAddress: detail.shippingAddress,
    fulfillments: [...detail.fulfillments],
    discountCodes: [...detail.discountCodes],
    adjustedShipping: undefined,
    upstreamChanges: [...(detail.upstreamChanges ?? [])],
  } : {
    status: '', financialStatus: '', fulfillmentStatus: '',
    exception: '', note: '', events: [], refunds: [], tags: [],
    shippingAddress: undefined, fulfillments: [], discountCodes: [], adjustedShipping: undefined, upstreamChanges: [],
  });

  // 逆向操作相关 Modal
  const [showReturnTypeModal, setShowReturnTypeModal] = useState(false); // 退款类型选择
  const [showRecallModal, setShowRecallModal] = useState<string | null>(null); // fulfillmentId
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);

  // 物流 Tab: 录入运单号
  const [trackingModal, setTrackingModal] = useState<string | null>(null); // fulfillmentId
  const [trackingForm, setTrackingForm] = useState({ carrier: '', trackingNumber: '', trackingUrl: '' });

  // 物流 Tab: 打印
  const [printModal, setPrintModal] = useState<{ fulfillmentId: string; type: 'waybill' | 'packingList' | 'boxLabel' } | null>(null);

  // 履约 Tab: 取消单个履约单
  const [cancelFulModal, setCancelFulModal] = useState<string | null>(null);
  const [cancelFulReason, setCancelFulReason] = useState('');

  // 履约 Tab: 重新分仓
  const [rerouteModal, setRerouteModal] = useState<string | null>(null);
  const [rerouteWarehouseId, setRerouteWarehouseId] = useState('');

  // 商品明细 Tab: 优惠码
  const [discountModal, setDiscountModal] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('');

  // 商品明细 Tab: 调整运费
  const [adjustShippingModal, setAdjustShippingModal] = useState(false);
  const [shippingInput, setShippingInput] = useState('');

  // 时间线: 添加内部备注
  const [timelineNoteModal, setTimelineNoteModal] = useState(false);
  const [timelineNoteInput, setTimelineNoteInput] = useState('');

  // 标签管理
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // 支付: 展开的 transaction
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);

  const [noteText, setNoteText] = useState(orderState.note);
  // 编辑地址
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [addrForm, setAddrForm] = useState(() => ({
    name: detail?.shippingAddress.name ?? '',
    phone: detail?.shippingAddress.phone ?? '',
    address1: detail?.shippingAddress.address1 ?? '',
    address2: detail?.shippingAddress.address2 ?? '',
    city: detail?.shippingAddress.city ?? '',
    province: detail?.shippingAddress.province ?? '',
    country: detail?.shippingAddress.country ?? '',
    zip: detail?.shippingAddress.zip ?? '',
  }));
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const fulfillmentItems = useMemo(() => detail?.lineItems.filter((item) => item.requiresShipping) ?? [], [detail]);

  if (!detail && !basicOrder) {
    return (
      <div className="mx-auto max-w-[1280px] py-20 text-center">
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">订单未找到</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">ID: {id} 不存在</p>
        <Link href="/dashboard/orders" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--primary)] hover:underline">
          <ArrowLeft className="size-3.5" />返回订单列表
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-[1280px] pt-5 lg:pt-6">
        <Link href="/dashboard/orders" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
          <ArrowLeft className="size-3.5" />返回订单列表
        </Link>
        <h1 className="text-[20px] font-semibold text-[var(--foreground)]">{basicOrder!.orderNo}</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">该订单暂无详细数据。</p>
      </div>
    );
  }

  const lifecycleSteps = getLifecycleSteps({ ...detail, ...orderState } as OrderDetail);
  const sameAddress = isSameAddress(detail);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      <Link href="/dashboard/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回订单列表
      </Link>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="inline-flex items-center text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{detail.orderNo}<CopyButton text={detail.orderNo} /></h1>
                <StatusBadge status={orderState.status} />
                {detail.fulfillmentType && detail.fulfillmentType !== 'physical' && (() => {
                  const meta = FULFILLMENT_TYPE_META[detail.fulfillmentType];
                  return meta ? (
                    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', meta.color)}>
                      <span>{meta.icon}</span>{meta.label}
                    </span>
                  ) : null;
                })()}
                {orderState.exception && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                    <AlertTriangle className="size-3" />{orderState.exception}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
                <span>{detail.channel} / {detail.merchant}</span>
                <span>·</span>
                <span className="inline-flex items-center">{detail.platformOrderNo}<CopyButton text={detail.platformOrderNo} /></span>
                {detail.referenceNo && <><span>·</span><span className="inline-flex items-center">Ref: {detail.referenceNo}<CopyButton text={detail.referenceNo} /></span></>}
                <span>·</span>
                <span>{detail.createdAt}</span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {/* 根据订单状态动态展示操作按钮 */}
              {(() => {
                type OrderAction = {
                  label: string;
                  variant: 'primary' | 'danger' | 'default';
                  show: () => boolean;
                  onClick?: () => void;
                };

                const orderActions: OrderAction[] = [
                  {
                    label: '确认支付',
                    variant: 'primary',
                    show: () => orderState.financialStatus === '待确认',
                    onClick: () => setShowPaymentModal(true),
                  },
                  {
                    label: '生成履约单',
                    variant: 'primary',
                    show: () => orderState.status === '待处理' && ['未开始', '待履约'].includes(orderState.fulfillmentStatus) && orderState.financialStatus === '已支付',
                    onClick: () => setShowFulfillmentModal(true),
                  },
                  {
                    label: '释放保留',
                    variant: 'primary',
                    show: () => orderState.status === '保留' || orderState.status === '挂起',
                    onClick: () => { dispatch({ type: 'RELEASE_HOLD' }); showToast('订单已释放，重新进入处理队列'); },
                  },
                  {
                    label: '重新验证地址',
                    variant: 'default',
                    show: () => orderState.exception === '地址无效',
                    onClick: () => { dispatch({ type: 'CLEAR_EXCEPTION' }); showToast('地址验证通过', 'info'); },
                  },
                  {
                    label: '手动分仓',
                    variant: 'default',
                    show: () => ['库存不足', '找不到仓库', 'SKU未识别', '仓库SKU未映射', 'WMS货品不存在', '渠道SKU未映射'].some(e => orderState.exception.includes(e)),
                    onClick: () => { dispatch({ type: 'MANUAL_ROUTING' }); showToast('已手动分仓，履约单生成中', 'info'); },
                  },
                  {
                    label: '催促补货',
                    variant: 'default',
                    show: () => orderState.exception === '库存不足',
                    onClick: () => showToast('已通知采购团队补货', 'info'),
                  },
                  {
                    label: '确认发货',
                    variant: 'primary',
                    show: () => orderState.status === '处理中' && orderState.fulfillments.length > 0 && !['已发货','已签收'].includes(orderState.fulfillmentStatus),
                    onClick: () => { dispatch({ type: 'CONFIRM_SHIPMENT' }); showToast('发货已确认'); },
                  },
                  {
                    label: '打印面单',
                    variant: 'default',
                    show: () => ['处理中', '已发货'].includes(orderState.status) && orderState.fulfillments.length > 0,
                    onClick: () => { showToast('面单打印任务已发送', 'info'); },
                  },
                  {
                    label: '确认签收',
                    variant: 'primary',
                    show: () => orderState.status === '已发货' && orderState.fulfillmentStatus !== '已签收',
                    onClick: () => { dispatch({ type: 'CONFIRM_DELIVERY' }); showToast('签收确认，订单已完成'); },
                  },
                  {
                    label: '联系承运商',
                    variant: 'default',
                    show: () => orderState.exception === '投递失败' || orderState.exception.includes('投递失败'),
                    onClick: () => { dispatch({ type: 'CONTACT_CARRIER' }); showToast('已发起承运商异常处理请求', 'info'); },
                  },
                  {
                    label: '修复SKU映射',
                    variant: 'default',
                    show: () => ['SKU未识别', '仓库SKU未映射', 'WMS货品不存在', '渠道SKU未映射'].some(e => orderState.exception.includes(e)),
                    onClick: () => { dispatch({ type: 'FIX_SKU' }); showToast('SKU映射已修复，订单重新进入处理队列', 'info'); },
                  },
                  {
                    label: '人工审核',
                    variant: 'default',
                    show: () => orderState.exception.includes('风控') || orderState.exception.includes('合规'),
                    onClick: () => { dispatch({ type: 'MANUAL_REVIEW_PASS' }); showToast('人工审核已通过，订单恢复处理', 'success'); },
                  },
                  {
                    label: '发起退款',
                    variant: 'danger',
                    show: () => orderState.financialStatus === '已支付' && !['已取消', '已完成'].includes(orderState.status),
                    onClick: () => setShowReturnTypeModal(true),
                  },
                  {
                    label: '编辑',
                    variant: 'default',
                    show: () => !['已取消', '已完成', '已关闭'].includes(orderState.status),
                    onClick: () => {
                      const addr = orderState.shippingAddress ?? detail.shippingAddress;
                      setAddrForm({
                        name: addr.name,
                        phone: addr.phone,
                        address1: addr.address1,
                        address2: addr.address2 ?? '',
                        city: addr.city,
                        province: addr.province ?? '',
                        country: addr.country,
                        zip: addr.zip,
                      });
                      setEditAddressModal(true);
                    },
                  },
                  {
                    label: '取消订单',
                    variant: 'danger',
                    show: () => !['已取消', '已完成', '已关闭', '已发货', '已签收'].includes(orderState.status),
                    onClick: () => setShowCancelModal(true),
                  },
                  {
                    label: '添加备注',
                    variant: 'default',
                    show: () => !['已取消', '已关闭'].includes(orderState.status),
                    onClick: () => { setNoteText(orderState.note); setNoteModal(true); },
                  },
                  {
                    label: '重新打开',
                    variant: 'default',
                    show: () => orderState.status === '已完成' || orderState.status === '已关闭',
                    onClick: () => { dispatch({ type: 'REOPEN' }); showToast('订单已重新打开'); },
                  },
                ];

                return orderActions
                  .filter((action) => action.show())
                  .map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className={cn(
                        'h-8 rounded-lg px-3 text-[13px] font-medium transition',
                        action.variant === 'primary' && 'bg-[var(--primary)] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90',
                        action.variant === 'danger' && 'border border-[var(--border)] text-[var(--danger)] hover:bg-red-50',
                        action.variant === 'default' && 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                      )}
                    >
                      {action.label}
                    </button>
                  ));
              })()}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Order lifecycle</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{orderState.financialStatus} · {orderState.fulfillmentStatus}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {orderState.status === '挂起' || orderState.status === '保留' ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-[var(--warning)] ring-1 ring-inset ring-amber-200">On hold</span>
                ) : null}
                {orderState.cancelledAt ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">Cancelled</span>
                ) : null}
                {orderState.financialStatus === '已退款' ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]">Refunded</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
                {lifecycleSteps.map((step, index) => {
                  const isComplete = step.status === 'complete';
                  const isCurrent = step.status === 'current';
                  return (
                    <div key={index} className="relative">
                      {index < lifecycleSteps.length - 1 ? (
                        <div className="absolute left-[calc(50%+18px)] top-4 hidden h-px w-[calc(100%-36px)] bg-[var(--border)] md:block" aria-hidden="true">
                          <div className={cn('h-full bg-[var(--primary)]', isComplete ? 'w-full' : 'w-0')} />
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
                        <span className={cn(
                          'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-[var(--surface)]',
                          isComplete && 'border-[var(--primary)] bg-[var(--primary)] text-white',
                          isCurrent && 'border-[var(--primary)] text-[var(--primary)]',
                          step.status === 'upcoming' && 'border-[var(--border)] text-[var(--muted-foreground)]'
                        )}>
                          {isComplete ? <CheckCircle2 className="size-4" aria-hidden="true" /> : isCurrent ? <Clock3 className="size-4" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                        </span>
                        <div>
                          <div className={cn('text-[12px] font-semibold', isCurrent || isComplete ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step.label}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--muted)]">{step.detail || (isComplete ? '✓' : isCurrent ? '进行中' : '—')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
      </div>

      {/* ═══ 上游变更提示条 — 进度条卡片下方 ═══ */}
      <UpstreamChangeBanner
        changes={orderState.upstreamChanges}
        lineItems={detail.lineItems}
        onHandle={(changeId, action) => {
          dispatch({ type: 'HANDLE_UPSTREAM_CHANGE', changeId, action, lineItems: detail.lineItems });
          showToast('变更已处置');
        }}
        onIgnore={(changeId) => {
          dispatch({ type: 'IGNORE_UPSTREAM_CHANGE', changeId, lineItems: detail.lineItems });
          showToast('已忽略此变更', 'info');
        }}
      />

      {/* ═══ 履约类型特有信息带 ═══ */}
      {detail.fulfillmentType && detail.fulfillmentType !== 'physical' && (() => {
        const ft = detail.fulfillmentType;
        const meta = FULFILLMENT_TYPE_META[ft];

        // 预售：显示预售进度 + 倒计时
        if (ft === 'presale' && detail.presaleConfig) {
          const pc = detail.presaleConfig;
          const endDate = new Date(pc.presaleEndDate);
          const now = new Date('2026-06-05');
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
          const progress = pc.minQtyThreshold ? Math.min(100, Math.round(((pc.currentPresaleQty ?? 0) / pc.minQtyThreshold) * 100)) : null;
          return (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[16px]">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-amber-800">
                    <span>预售期</span>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      {pc.presaleStatus === 'active' ? `还剩 ${daysLeft} 天` : pc.presaleStatus === 'ended' ? '预售已结束' : '已取消'}
                    </span>
                    <span className="text-amber-600">截止 {pc.presaleEndDate} · 预计发货 {pc.estimatedShipDate}</span>
                  </div>
                  {progress !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-amber-200">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] text-amber-700 shrink-0">{pc.currentPresaleQty}/{pc.minQtyThreshold} 件 ({progress}%)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 服务：显示服务日期、技术人员、工单号
        if (ft === 'service' && detail.serviceConfig) {
          const sc = detail.serviceConfig;
          const statusLabel: Record<string, string> = {
            pending_schedule: '待预约',
            scheduled: '已预约',
            in_progress: '服务中',
            completed: '已完成',
            cancelled: '已取消',
          };
          return (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[16px]">{meta.icon}</span>
                <div className="flex items-center gap-1.5 text-[12px] text-purple-800">
                  <span className="font-semibold">服务类型</span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-medium capitalize">{sc.serviceType}</span>
                </div>
                {sc.scheduledDate && (
                  <div className="text-[12px] text-purple-700">
                    📅 <span className="font-medium">{sc.scheduledDate}</span>
                    {sc.scheduledTimeWindow && <span className="ml-1 text-purple-500">{sc.scheduledTimeWindow}</span>}
                  </div>
                )}
                {sc.technician && (
                  <div className="text-[12px] text-purple-700">👤 技术员：<span className="font-medium">{sc.technician}</span></div>
                )}
                {sc.workOrderNo && (
                  <div className="text-[12px] text-purple-700 font-mono">工单：{sc.workOrderNo}</div>
                )}
                <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                  {statusLabel[sc.serviceStatus] ?? sc.serviceStatus}
                </span>
              </div>
            </div>
          );
        }

        // 租赁：显示租期、押金、归还截止
        if (ft === 'rental' && detail.rentalConfig) {
          const rc = detail.rentalConfig;
          const statusLabel: Record<string, string> = {
            active: '租赁中', overdue: '已逾期', returned: '已归还', cancelled: '已取消',
          };
          const statusColor: Record<string, string> = {
            active: 'bg-cyan-100 text-cyan-700',
            overdue: 'bg-red-100 text-red-700',
            returned: 'bg-green-100 text-green-700',
            cancelled: 'bg-gray-100 text-gray-600',
          };
          return (
            <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[16px]">{meta.icon}</span>
                <div className="text-[12px] text-cyan-800">
                  📅 租期：<span className="font-semibold">{rc.rentalStartDate}</span>
                  <span className="mx-1 text-cyan-500">→</span>
                  <span className="font-semibold">{rc.rentalEndDate}</span>
                </div>
                {rc.depositAmount && (
                  <div className="text-[12px] text-cyan-700">
                    押金：<span className="font-semibold">{rc.depositAmount}</span>
                    <span className={cn('ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold',
                      rc.depositStatus === 'held' ? 'bg-amber-100 text-amber-700' :
                      rc.depositStatus === 'released' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {rc.depositStatus === 'held' ? '冻结中' : rc.depositStatus === 'released' ? '已释放' : '已没收'}
                    </span>
                  </div>
                )}
                {rc.returnedAt && <div className="text-[12px] text-cyan-700">实际归还：<span className="font-medium">{rc.returnedAt.slice(0, 10)}</span></div>}
                <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold', statusColor[rc.rentalStatus] ?? 'bg-gray-100 text-gray-600')}>
                  {statusLabel[rc.rentalStatus] ?? rc.rentalStatus}
                </span>
              </div>
            </div>
          );
        }

        // 礼品卡：显示卡号、PIN、有效期
        if (ft === 'gift_card' && detail.giftCardConfig) {
          const gc = detail.giftCardConfig;
          const statusLabel: Record<string, string> = {
            pending_issue: '待生成', issued: '已生成', activated: '已激活',
            redeemed: '已核销', expired: '已过期', cancelled: '已取消',
          };
          return (
            <div className="mb-4 rounded-lg border border-pink-200 bg-pink-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[16px]">{meta.icon}</span>
                <div className="text-[12px] text-pink-800 font-semibold">面值：{gc.faceValue}</div>
                {gc.cardNumber ? (
                  <div className="flex items-center gap-1.5 text-[12px] text-pink-700 font-mono">
                    卡号：<span className="font-bold tracking-widest">{gc.cardNumber}</span>
                    <CopyButton text={gc.cardNumber} />
                  </div>
                ) : (
                  <div className="text-[12px] text-pink-500 italic">卡号生成中…</div>
                )}
                {gc.pin && (
                  <div className="text-[12px] text-pink-700 font-mono">PIN：<span className="font-bold">{gc.pin}</span></div>
                )}
                {gc.expiryDate && <div className="text-[12px] text-pink-600">有效期至 {gc.expiryDate}</div>}
                {gc.recipientEmail && <div className="text-[12px] text-pink-600">发送至：{gc.recipientEmail}</div>}
                {gc.redeemedAmount && <div className="text-[12px] text-pink-700">已核销：<span className="font-semibold">{gc.redeemedAmount}</span></div>}
                <span className="ml-auto rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">
                  {statusLabel[gc.cardStatus] ?? gc.cardStatus}
                </span>
              </div>
            </div>
          );
        }

        return null;
      })()}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
              <div className="inline-flex rounded-full bg-[var(--surface-subtle)] p-1 text-[13px] font-medium ring-1 ring-inset ring-[var(--border-subtle)]">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'rounded-full px-4 py-1.5 transition-colors',
                      activeTab === tab
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === '商品明细' && (
              <LineItemsTab
                detail={detail}
                discountCodes={orderState.discountCodes ?? []}
                adjustedShipping={orderState.adjustedShipping}
                orderStatus={orderState.status}
                onRemoveDiscount={(code) => dispatch({ type: 'REMOVE_DISCOUNT_CODE', code })}
                onOpenDiscountModal={() => { setDiscountCodeInput(''); setDiscountAmountInput(''); setDiscountModal(true); }}
                onOpenShippingModal={() => { setShippingInput((orderState.adjustedShipping ?? detail.totalShipping).replace(/[^0-9.]/g, '')); setAdjustShippingModal(true); }}
              />
            )}

            {activeTab === '履约信息' && (
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4">
                {/* Stats row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">履约单数</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{orderState.fulfillments.length || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">已履约商品</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{fulfillmentItems.filter((item) => item.fulfillmentStatus !== '未开始').reduce((sum, item) => sum + item.quantity, 0)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">待处理商品</div>
                    <div className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">{fulfillmentItems.filter((item) => item.fulfillmentStatus === '未开始').reduce((sum, item) => sum + item.quantity, 0)}</div>
                  </div>
                </div>

                {/* Per-fulfillment-order cards */}
                <div className="mt-4 space-y-4">
                  {orderState.fulfillments.map((ful, fulIndex) => {
                    const packageItems = ful.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                    return (
                      <div key={ful.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        {/* Fulfillment order header */}
                        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#{fulIndex + 1}</span>
                          <span className="inline-flex items-center font-mono text-[13px] font-semibold text-[var(--foreground)]">{ful.fulfillmentOrderNo ?? ful.id}<CopyButton text={ful.fulfillmentOrderNo ?? ful.id} /></span>
                          <StatusBadge status={mapFulfillmentStatus(ful)} />
                          <span className="text-[12px] text-[var(--muted)]">{ful.warehouse}</span>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDecisionModal(ful.fulfillmentOrderNo ?? ful.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--surface-subtle)]"
                            >
                              查看决策
                            </button>
                            {/* 重新分仓（已生成但未发货） */}
                            {(ful.status === 'in_progress' || ful.outboundStatus === '待拣货') && (
                              <button
                                onClick={() => { setRerouteWarehouseId(''); setRerouteModal(ful.id); }}
                                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                              >
                                重新分仓
                              </button>
                            )}
                            {/* 取消履约单（未发货） */}
                            {ful.status !== 'delivered' && ful.status !== 'cancelled' && ful.status !== 'in_transit' && (
                              <button
                                onClick={() => { setCancelFulReason(''); setCancelFulModal(ful.id); }}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-[var(--danger)] hover:bg-red-50"
                              >
                                取消履约单
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items in this fulfillment order */}
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {packageItems.map((item) => item && (
                            <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                  <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.weight}g</div>
                                  <div className="mt-0.5 space-x-2 font-mono text-[10px] text-[var(--muted)]">
                                    <span>{item.sku}</span>
                                    {item.channelSku && <span>· 渠道: {item.channelSku}</span>}
                                    {item.warehouseSku && <span>· 仓库: {item.warehouseSku}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-center sm:px-3">× {item.quantity}{item.unit ? <span className="ml-0.5 text-[11px] text-[var(--muted)]">{item.unit}</span> : null}</div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-right sm:px-3">{item.unitPrice}</div>
                              <div className="sm:text-right sm:min-w-[90px]">
                                <StatusBadge status={item.fulfillmentStatus} />
                                {item.fulfillmentNote && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 关联信息 */}
                        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <div className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">出库单</span>
                              <div className="mt-0.5 inline-flex items-center font-mono font-medium text-[var(--foreground)]">{ful.outboundOrderNo ?? '—'}{ful.outboundOrderNo && <CopyButton text={ful.outboundOrderNo} />}</div>
                              {ful.outboundStatus && <div className="mt-0.5"><StatusBadge status={ful.outboundStatus} /></div>}
                            </div>
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">承运商 / 运单</span>
                              <div className="mt-0.5 font-medium text-[var(--foreground)]">{ful.carrier}</div>
                              {ful.trackingNumber ? (
                                <div className="mt-0.5 inline-flex items-center font-mono text-[11px] text-[var(--muted)]">{ful.trackingNumber}<CopyButton text={ful.trackingNumber} /></div>
                              ) : (
                                <div className="mt-0.5 text-[11px] text-[var(--muted)]">待生成</div>
                              )}
                            </div>
                            <div>
                              <span className="text-[11px] text-[var(--muted-foreground)]">发货仓</span>
                              <div className="mt-0.5 font-medium text-[var(--foreground)]">{ful.warehouse ?? '—'}</div>
                              <div className="mt-0.5 text-[11px] text-[var(--muted)]">{ful.shippedAt ? `发货 ${ful.shippedAt}` : '待发货'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unfulfilled items — 待生成履约单 */}
                  {(() => {
                    const fulfilledIds = new Set(detail.fulfillments.flatMap((ful) => ful.lineItemIds));
                    const unfulfilledItems = fulfillmentItems.filter((item) => !fulfilledIds.has(item.id));
                    if (unfulfilledItems.length === 0) return null;
                    return (
                      <div className="overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
                        <div className="flex items-center gap-3 border-b border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                          <span className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-[11px] font-bold text-[var(--warning)]">?</span>
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">待生成履约单</span>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-[var(--warning)] ring-1 ring-inset ring-amber-200">{unfulfilledItems.reduce((sum, item) => sum + item.quantity, 0)} 件待处理</span>
                        </div>
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {unfulfilledItems.map((item) => (
                            <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_80px_100px] sm:items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                  <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.sku}</div>
                                </div>
                              </div>
                              <div className="text-[12px] text-[var(--foreground)] sm:text-center">× {item.quantity}</div>
                              <div className="sm:text-right"><StatusBadge status={item.fulfillmentStatus} /></div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-dashed border-[var(--border-subtle)] bg-amber-50/30 px-4 py-2.5 text-[11px] text-[var(--muted)]">
                          等待库存补货或人工确认后生成履约单
                        </div>
                      </div>
                    );
                  })()}

                  {/* Empty state */}
                  {detail.fulfillments.length === 0 && fulfillmentItems.filter((item) => item.fulfillmentStatus === '未开始').length === 0 && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-8 text-center">
                      <Package className="mx-auto size-8 text-[var(--border)]" />
                      <p className="mt-2 text-[13px] text-[var(--muted)]">暂无履约单 · 商品确认后将自动生成</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === '物流信息' && (
              <div>
                <div className="flex flex-col gap-2 bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] text-[var(--muted)]">收货: {detail.shippingAddress.name} · {detail.shippingAddress.formatted}</div>
                  <span className="text-[12px] text-[var(--muted)]">{orderState.fulfillments.length > 0 ? `${orderState.fulfillments.length} 个发运单` : '待发货'}</span>
                </div>
                {orderState.fulfillments.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Package className="mx-auto size-8 text-[var(--border)]" />
                    <p className="mt-2 text-[13px] text-[var(--muted)]">暂无物流记录 · 等待发货后生成包裹与追踪信息</p>
                  </div>
                ) : (
                  <div className="space-y-4 px-4 py-4">
                    {orderState.fulfillments.map((ful, fulIndex) => {
                      const packageItems = ful.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                      const hasPallet = !!ful.palletNo;
                      const shippingModeLabel: Record<string, { label: string; icon: string }> = {
                        parcel: { label: '小包裹', icon: '📦' },
                        express: { label: '快递', icon: '⚡' },
                        ltl: { label: '零担(陆运)', icon: '🚛' },
                        ftl: { label: '整车(陆运)', icon: '🚚' },
                        freight: { label: '货运', icon: '🚛' },
                        air: { label: '空运', icon: '✈️' },
                        sea_fcl: { label: '海运整柜', icon: '🚢' },
                        sea_lcl: { label: '海运拼柜', icon: '🚢' },
                        rail: { label: '铁运', icon: '🚄' },
                      };
                      const modeInfo = ful.shippingMode ? shippingModeLabel[ful.shippingMode] ?? { label: ful.shippingMode, icon: '📦' } : null;
                      return (
                        <div key={ful.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          {/* Header bar */}
                          <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                            <span className="flex size-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">#{fulIndex + 1}</span>
                            <StatusBadge status={mapFulfillmentStatus(ful)} />
                            {modeInfo && (
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                                (ful.shippingMode === 'ltl' || ful.shippingMode === 'ftl' || ful.shippingMode === 'freight') && 'bg-purple-50 text-purple-600 ring-purple-200',
                                ful.shippingMode === 'parcel' && 'bg-blue-50 text-[var(--primary)] ring-blue-200',
                                ful.shippingMode === 'express' && 'bg-green-50 text-[var(--success)] ring-green-200',
                                (ful.shippingMode === 'air') && 'bg-sky-50 text-sky-600 ring-sky-200',
                                (ful.shippingMode === 'sea_fcl' || ful.shippingMode === 'sea_lcl') && 'bg-cyan-50 text-cyan-600 ring-cyan-200',
                                ful.shippingMode === 'rail' && 'bg-amber-50 text-amber-600 ring-amber-200',
                              )}>
                                <span>{modeInfo.icon}</span>
                                <span>{modeInfo.label}</span>
                              </span>
                            )}
                            <span className="text-[13px] font-medium text-[var(--foreground)]">{ful.carrier}</span>
                            {ful.serviceLevel && <span className="text-[11px] text-[var(--muted)]">· {ful.serviceLevel}</span>}
                            <div className="ml-auto flex items-center gap-2">
                              {/* 运单号录入 / 编辑 */}
                              {ful.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    setTrackingForm({ carrier: ful.carrier ?? '', trackingNumber: ful.trackingNumber ?? '', trackingUrl: ful.trackingUrl ?? '' });
                                    setTrackingModal(ful.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                                >
                                  {ful.trackingNumber ? '✏ 编辑运单' : '+ 录入运单'}
                                </button>
                              )}
                              {/* 召回包裹（在途时可操作） */}
                              {ful.status === 'in_transit' && ful.trackingNumber && (
                                <button
                                  onClick={() => setShowRecallModal(ful.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-[var(--danger)] hover:bg-red-100"
                                >
                                  召回包裹
                                </button>
                              )}
                              {/* 打印 */}
                              {ful.trackingNumber && (
                                <div className="relative group/print">
                                  <button className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                                    <Printer className="size-3" /> 打印
                                  </button>
                                  <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-[140px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-panel)] group-hover/print:pointer-events-auto group-hover/print:block">
                                    {[
                                      { type: 'waybill' as const, label: '打印面单' },
                                      { type: 'packingList' as const, label: '打印箱单' },
                                      { type: 'boxLabel' as const, label: '打印装箱单' },
                                    ].map((item) => (
                                      <button
                                        key={item.type}
                                        onClick={() => setPrintModal({ fulfillmentId: ful.id, type: item.type })}
                                        className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {ful.trackingUrl && (
                                <a href={ful.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--surface-subtle)]">
                                  追踪 <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Items — horizontal layout matching fulfillment tab */}
                          <div className="divide-y divide-[var(--border-subtle)]">
                            {packageItems.map((item) => item && (
                              <div key={item.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className="size-8 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                                  <div>
                                    <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                                    <div className="text-[11px] text-[var(--muted)]">{item.variantTitle} · {item.weight}g</div>
                                    <div className="mt-0.5 space-x-2 font-mono text-[10px] text-[var(--muted)]">
                                      <span>{item.sku}</span>
                                      {item.channelSku && <span>· 渠道: {item.channelSku}</span>}
                                      {item.warehouseSku && <span>· 仓库: {item.warehouseSku}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[12px] text-[var(--foreground)] sm:text-center sm:px-3">× {item.quantity}{item.unit && <span className="ml-0.5 text-[10px] text-[var(--muted)]">{item.unit}</span>}</div>
                                <div className="text-[12px] text-[var(--foreground)] sm:text-right sm:px-3">{item.unitPrice}</div>
                                <div className="sm:text-right sm:min-w-[90px]">
                                  <StatusBadge status={item.fulfillmentStatus} />
                                  {item.fulfillmentNote && <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Shipping details — two column label-value layout */}
                          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                            <div className="grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
                              {/* 通用字段 */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">运单号</span>
                                <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.trackingNumber || '待生成'}{ful.trackingNumber && <CopyButton text={ful.trackingNumber} />}</span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货仓</span>
                                <span className="font-medium text-[var(--foreground)]">{ful.warehouse ?? '—'}</span>
                              </div>
                              {ful.masterTrackingNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">主单号</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.masterTrackingNo}<CopyButton text={ful.masterTrackingNo} /></span>
                                </div>
                              )}

                              {/* 陆运 LTL/FTL 特有 */}
                              {ful.bolNumber && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">BOL</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.bolNumber}<CopyButton text={ful.bolNumber} /></span>
                                </div>
                              )}
                              {ful.proNumber && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">PRO</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.proNumber}</span>
                                </div>
                              )}

                              {/* 海运特有 */}
                              {ful.vesselVoyage && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">船名航次</span>
                                  <span className="text-[var(--foreground)]">{ful.vesselVoyage}</span>
                                </div>
                              )}
                              {ful.containerNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">集装箱号</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.containerNo}<CopyButton text={ful.containerNo} />{ful.containerType && <span className="ml-1.5 rounded bg-cyan-50 px-1 text-[10px] font-medium text-cyan-700">{ful.containerType}</span>}</span>
                                </div>
                              )}
                              {ful.sealNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">封条号</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.sealNo}</span>
                                </div>
                              )}
                              {ful.portOfLoading && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">装货港</span>
                                  <span className="text-[var(--foreground)]">{ful.portOfLoading}</span>
                                </div>
                              )}
                              {ful.portOfDischarge && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">卸货港</span>
                                  <span className="text-[var(--foreground)]">{ful.portOfDischarge}</span>
                                </div>
                              )}

                              {/* 空运特有 */}
                              {ful.flightNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">航班号</span>
                                  <span className="font-medium text-[var(--foreground)]">{ful.flightNo}</span>
                                </div>
                              )}
                              {ful.mawb && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">MAWB</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.mawb}<CopyButton text={ful.mawb} /></span>
                                </div>
                              )}
                              {ful.hawb && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">HAWB</span>
                                  <span className="inline-flex items-center font-mono text-[var(--foreground)]">{ful.hawb}<CopyButton text={ful.hawb} /></span>
                                </div>
                              )}
                              {ful.departureAirport && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">起飞</span>
                                  <span className="text-[var(--foreground)]">{ful.departureAirport}</span>
                                </div>
                              )}
                              {ful.arrivalAirport && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">降落</span>
                                  <span className="text-[var(--foreground)]">{ful.arrivalAirport}</span>
                                </div>
                              )}

                              {/* 铁运特有 */}
                              {ful.trainNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">班列号</span>
                                  <span className="font-medium text-[var(--foreground)]">{ful.trainNo}</span>
                                </div>
                              )}
                              {ful.wagonNo && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">车皮号</span>
                                  <span className="font-mono text-[var(--foreground)]">{ful.wagonNo}</span>
                                </div>
                              )}
                              {ful.departureStation && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">始发站</span>
                                  <span className="text-[var(--foreground)]">{ful.departureStation}</span>
                                </div>
                              )}
                              {ful.arrivalStation && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">到达站</span>
                                  <span className="text-[var(--foreground)]">{ful.arrivalStation}</span>
                                </div>
                              )}

                              {/* 包装信息（通用） */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">包装</span>
                                <span className="text-[var(--foreground)]">
                                  {ful.packages && ful.packages.length > 0 ? (
                                    <>{ful.packages.length} 个包装单元</>
                                  ) : hasPallet ? (
                                    <>{ful.palletNo}{ful.palletCount && ful.palletCount > 1 ? ` (${ful.palletCount}板)` : ''}{ful.packageCount ? ` · 含${ful.packageCount}包裹` : ''}</>
                                  ) : ful.packageNo ? (
                                    <>{ful.packageNo}{ful.packageCount && ful.packageCount > 1 ? ` (${ful.packageCount}件)` : ''}</>
                                  ) : '—'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">重量</span>
                                <span className="text-[var(--foreground)]">{ful.totalWeight ?? '—'}{ful.dimensions ? ` · ${ful.dimensions}` : ''}</span>
                              </div>

                              {/* 时间信息（通用） */}
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">发货</span>
                                <span className="text-[var(--foreground)]">{ful.shippedAt ?? '—'}</span>
                              </div>
                              <div className="flex items-baseline gap-3">
                                <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">预计到达</span>
                                <span className="text-[var(--foreground)]">{ful.estimatedDelivery ?? '—'}</span>
                              </div>
                              {ful.deliveredAt && (
                                <div className="flex items-baseline gap-3">
                                  <span className="w-[72px] shrink-0 text-[11px] text-[var(--muted-foreground)]">签收</span>
                                  <span className="text-[var(--success)]">{ful.deliveredAt}</span>
                                </div>
                              )}
                            </div>

                            {/* 包装明细 — 多托盘/多包裹展开 */}
                            {ful.packages && ful.packages.length > 0 && (
                              <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-medium text-[var(--foreground)]">{ful.packages.length} 个包装单元</span>
                                  <span className="text-[var(--muted)]">
                                    ({ful.packages.filter(p => p.type === 'pallet').length > 0 && `${ful.packages.filter(p => p.type === 'pallet').length}托盘`}
                                    {ful.packages.filter(p => p.type === 'pallet').length > 0 && ful.packages.filter(p => p.type !== 'pallet').length > 0 && ' + '}
                                    {ful.packages.filter(p => p.type !== 'pallet').length > 0 && `${ful.packages.filter(p => p.type !== 'pallet').length}包裹`})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPackageModal(ful.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--primary)] transition hover:bg-[var(--surface-subtle)]"
                                >
                                  查看明细
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ⑥ 操作时间线 — 根据当前 Tab 过滤，支持折叠分组与分页 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)]">
                <Clock3 className="size-4 text-[var(--muted)]" />操作时间线
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--muted)]">
                  {activeTab === '商品明细' && '全部事件'}
                  {activeTab === '履约信息' && '履约决策'}
                  {activeTab === '物流信息' && '物流跟踪'}
                  {' · '}
                  {orderState.events.filter((event) => {
                    if (activeTab === '履约信息') return event.type === 'fulfillment';
                    if (activeTab === '物流信息') return event.type === 'logistics';
                    return true;
                  }).length} 条记录
                </span>
                <button
                  onClick={() => { setTimelineNoteInput(''); setTimelineNoteModal(true); }}
                  className="flex h-6 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                >
                  + 备注
                </button>
              </div>
            </div>
            <div className="px-4 py-4">
              <OrderTimeline events={orderState.events} activeTab={activeTab} />
            </div>
          </section>

        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><User className="size-4 text-[var(--muted)]" />客户</h2>
            </div>
            <div className="px-4 py-3">
              <div className="text-[14px] font-medium text-[var(--foreground)]">{detail.customer.name}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">{detail.customer.email}</div>
              {detail.customer.phone && <div className="text-[12px] text-[var(--muted)]">{detail.customer.phone}</div>}
              <div className="mt-2.5 flex items-center gap-4 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px]">
                <div className="text-center"><div className="font-semibold text-[var(--foreground)]">{detail.customer.ordersCount}</div><div className="text-[var(--muted)]">订单</div></div>
                <div className="h-6 w-px bg-[var(--border-subtle)]" />
                <div className="text-center"><div className="font-semibold text-[var(--foreground)]">{detail.customer.totalSpent}</div><div className="text-[var(--muted)]">累计消费</div></div>
              </div>
              {detail.customer.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {detail.customer.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)]">{tag}</span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-[11px] text-[var(--muted-foreground)]">{detail.customer.acceptsMarketing ? '✓ 接受营销' : '✗ 不接受营销'}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><MapPin className="size-3.5 text-[var(--muted)]" />收货地址</h2>
              {!['已取消', '已完成', '已关闭'].includes(orderState.status) && (
                <button
                  onClick={() => {
                    const addr = orderState.shippingAddress ?? detail.shippingAddress;
                    setAddrForm({ name: addr.name, phone: addr.phone, address1: addr.address1, address2: addr.address2 ?? '', city: addr.city, province: addr.province ?? '', country: addr.country, zip: addr.zip });
                    setEditAddressModal(true);
                  }}
                  className="text-[11px] font-medium text-[var(--primary)] hover:underline"
                >
                  修改
                </button>
              )}
            </div>
            <div className="space-y-1.5 px-4 py-3 text-[12px]">
              {(() => {
                const addr = orderState.shippingAddress ?? detail.shippingAddress;
                return (
                  <>
                    <div className="font-medium text-[var(--foreground)]">{addr.name}</div>
                    <div className="text-[var(--muted)]">{addr.phone}</div>
                    <div className="leading-5 text-[var(--foreground)]">{addr.formatted ?? `${addr.address1}${addr.address2 ? ', ' + addr.address2 : ''}, ${addr.city}${addr.province ? ', ' + addr.province : ''} ${addr.zip}, ${addr.country}`}</div>
                  </>
                );
              })()}
              <div className="rounded-lg bg-[var(--surface-subtle)] px-2.5 py-2 text-[11px] text-[var(--muted)]">{detail.shippingMethod}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><CreditCard className="size-3.5 text-[var(--muted)]" />账单地址</h2>
            </div>
            <div className="space-y-1.5 px-4 py-3 text-[12px]">
              {sameAddress ? (
                <div className="inline-flex w-fit rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)]">Same as shipping</div>
              ) : null}
              <div className="font-medium text-[var(--foreground)]">{detail.billingAddress.name}</div>
              <div className="text-[var(--muted)]">{detail.billingAddress.phone}</div>
              <div className="leading-5 text-[var(--foreground)]">{detail.billingAddress.formatted}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><CreditCard className="size-3.5 text-[var(--muted)]" />支付</h2>
            </div>
            <div className="px-4 py-3 space-y-3">
              {detail.transactions.map((txn) => (
                <div key={txn.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                  <div
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5"
                    onClick={() => setExpandedTxn(expandedTxn === txn.id ? null : txn.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', txn.kind === 'refund' ? 'bg-amber-50 text-[var(--warning)] ring-amber-200' : txn.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-green-50 text-[var(--success)] ring-green-200')}>
                        {txn.kind === 'refund' ? '退款' : txn.kind === 'authorization' ? '授权' : txn.status === 'pending' ? '处理中' : '收款'}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--foreground)]">{txn.method}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">{txn.amount}</span>
                  </div>
                  {expandedTxn === txn.id && (
                    <div className="border-t border-[var(--border-subtle)] px-3 pb-3 pt-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-[var(--muted)]">
                        <span>网关</span><span className="font-medium text-[var(--foreground)]">{txn.gateway}</span>
                      </div>
                      <div className="flex justify-between text-[var(--muted)]">
                        <span>时间</span><span className="text-[var(--foreground)]">{txn.createdAt}</span>
                      </div>
                      {txn.gatewayReference && (
                        <div className="flex justify-between text-[var(--muted)]">
                          <span>网关参考号</span>
                          <span className="inline-flex items-center font-mono text-[10px] text-[var(--foreground)]">{txn.gatewayReference}<CopyButton text={txn.gatewayReference} /></span>
                        </div>
                      )}
                      {txn.avsResult && <div className="flex justify-between text-[var(--muted)]"><span>AVS</span><span>{txn.avsResult}</span></div>}
                      {txn.cvvResult && <div className="flex justify-between text-[var(--muted)]"><span>CVV</span><span>{txn.cvvResult}</span></div>}
                      <div className="flex justify-between text-[var(--muted)]">
                        <span>状态</span>
                        <span className={txn.status === 'success' ? 'text-[var(--success)]' : txn.status === 'pending' ? 'text-amber-600' : 'text-[var(--danger)]'}>
                          {txn.status === 'success' ? '成功' : txn.status === 'pending' ? '处理中' : txn.status}
                        </span>
                      </div>
                      {txn.kind === 'authorization' && txn.status === 'pending' && (
                        <button
                          onClick={() => { dispatch({ type: 'CAPTURE_PAYMENT', transactionId: txn.id }); showToast('扣款已确认'); }}
                          className="mt-1 w-full rounded-lg bg-[var(--primary)] py-1.5 text-[11px] font-semibold text-white hover:opacity-90"
                        >
                          手动确认扣款 (Capture)
                        </button>
                      )}
                      <div className="mt-1 rounded-md bg-[var(--surface)] px-2 py-1 ring-1 ring-inset ring-[var(--border-subtle)]">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Transaction ID</div>
                        <div className="mt-0.5 inline-flex items-center font-mono text-[10px] text-[var(--foreground)]">{txn.id}<CopyButton text={txn.id} /></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {detail.refunds.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5">
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--warning)]">退款</div>
                  {detail.refunds.map((ref) => (
                    <div key={ref.id} className="text-[11px]">
                      <div className="flex justify-between"><span className="font-medium text-[var(--foreground)]">{ref.amount}</span><span className="text-[var(--muted)]">{ref.createdAt}</span></div>
                      <div className="text-[var(--muted)]">{ref.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><Tag className="size-3.5 text-[var(--muted)]" />标签与备注</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {orderState.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {orderState.tags.map((tag) => (
                    <span key={tag} className="group/tag inline-flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border)]">
                      {tag}
                      <button onClick={() => dispatch({ type: 'REMOVE_TAG', tag })} className="text-[var(--muted)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover/tag:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              ) : <div className="text-[12px] text-[var(--muted)]">无标签</div>}
              {/* 添加标签 */}
              {showTagInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        dispatch({ type: 'ADD_TAG', tag: tagInput.trim() });
                        setTagInput('');
                        setShowTagInput(false);
                      }
                      if (e.key === 'Escape') setShowTagInput(false);
                    }}
                    placeholder="输入标签后回车"
                    className="h-7 flex-1 rounded-lg border border-[var(--primary)] bg-[var(--surface)] px-2 text-[12px] outline-none"
                  />
                  <button onClick={() => setShowTagInput(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
                </div>
              ) : (
                <button onClick={() => { setTagInput(''); setShowTagInput(true); }} className="text-[11px] text-[var(--primary)] hover:underline">+ 添加标签</button>
              )}
              {orderState.note ? (
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] text-[var(--foreground)]">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">客户备注</div>
                  {orderState.note}
                </div>
              ) : <div className="text-[12px] text-[var(--muted)]">无备注</div>}
            </div>
          </section>

          {detail.platformMeta && Object.keys(detail.platformMeta).length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]"><FileText className="size-3.5 text-[var(--muted)]" />平台元数据</h2>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {Object.entries(detail.platformMeta).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{key}</span>
                    <span className="max-w-[160px] truncate text-[11px] text-[var(--foreground)]">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ─── 包装明细弹窗 ─── */}
      {packageModal && (() => {
        const modalFul = orderState.fulfillments.find((f) => f.id === packageModal);
        if (!modalFul || !modalFul.packages) return null;
        const typeLabel: Record<string, string> = { pallet: '托盘', carton: '纸箱', crate: '木箱', bag: '袋', drum: '桶' };
        // Collect all copyable values
        const allNos = modalFul.packages.map((p) => p.no);
        const allSNs = detail.lineItems.filter((li) => modalFul.lineItemIds.includes(li.id)).flatMap((li) => li.serialNumbers ?? []);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPackageModal(null)}>
            <div className="mx-4 w-full max-w-[600px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">包装明细</h3>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">{modalFul.packages.length} 个包装单元 · {modalFul.carrier}</p>
                </div>
                <div className="flex items-center gap-2">
                  {allNos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(allNos.join('\n'))}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"
                    >
                      <Copy className="size-3" />
                      复制全部编号
                    </button>
                  )}
                  {allSNs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(allSNs.join('\n'))}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)]"
                    >
                      <Copy className="size-3" />
                      复制全部SN
                    </button>
                  )}
                  <button type="button" onClick={() => setPackageModal(null)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                    <svg className="size-4" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(80vh - 100px)' }}>
                {modalFul.packages.map((pkg, pkgIdx) => {
                  const pkgItems = pkg.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);
                  const pkgSNs = pkgItems.flatMap((item) => item?.serialNumbers ?? []);
                  return (
                    <div key={pkg.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                            pkg.type === 'pallet' ? 'bg-purple-50 text-purple-600 ring-purple-200' : 'bg-blue-50 text-[var(--primary)] ring-blue-200'
                          )}>{typeLabel[pkg.type] ?? pkg.type} #{pkgIdx + 1}</span>
                          <span className="inline-flex items-center font-mono text-[12px] font-medium text-[var(--foreground)]">{pkg.no}<CopyButton text={pkg.no} /></span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                          {pkg.weight && <span>{pkg.weight}</span>}
                          {pkg.dimensions && <span>{pkg.dimensions}</span>}
                        </div>
                      </div>
                      <div className="px-4 py-2.5 space-y-2">
                        {pkgItems.map((item) => item && (
                          <div key={item.id}>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-medium text-[var(--foreground)]">{item.title}</span>
                              <span className="text-[var(--muted)]">× {item.quantity}{item.unit ?? ''}</span>
                            </div>
                            {item.batchNo && <div className="mt-0.5 text-[10px] text-[var(--muted)]">批次: {item.batchNo}</div>}
                            {item.serialNumbers && item.serialNumbers.length > 0 && (
                              <div className="mt-1 rounded-md bg-amber-50/50 px-2.5 py-1.5 ring-1 ring-inset ring-amber-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-amber-700">SN ({item.serialNumbers.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(item.serialNumbers!.join('\n'))}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 hover:text-amber-900"
                                  >
                                    <Copy className="size-2.5" />复制
                                  </button>
                                </div>
                                <div className="mt-1 space-y-0.5 font-mono text-[10px] text-amber-800">
                                  {item.serialNumbers.map((sn) => (
                                    <div key={sn}>{sn}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {pkg.note && <div className="text-[10px] text-[var(--muted)] italic">{pkg.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Toast --- */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl px-4 py-3 text-[13px] font-medium text-white shadow-xl",
          toast.type === "success" && "bg-[var(--success)]",
          toast.type === "info" && "bg-[var(--primary)]",
          toast.type === "warn" && "bg-[var(--warning)]",
        )}>
          {toast.msg}
        </div>
      )}

      {/* --- 确认支付 Modal --- */}
      {showPaymentModal && detail && (
        <ConfirmPaymentModal
          detail={detail}
          orderState={orderState}
          onConfirm={() => { dispatch({ type: "CONFIRM_PAYMENT" }); showToast("支付已确认，订单进入待处理队列"); }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* --- 生成履约单 Modal --- */}
      {showFulfillmentModal && detail && (
        <CreateFulfillmentModal
          detail={{ ...detail, fulfillments: orderState.fulfillments }}
          onConfirm={(result) => {
            dispatch({ type: "CREATE_FULFILLMENT", fulfillments: result.fulfillments, groupCount: result.groups.length });
            showToast(`已生成 ${result.groups.length} 个履约单，等待仓库执行`);
          }}
          onClose={() => setShowFulfillmentModal(false)}
        />
      )}

      {/* --- 发起退款 Modal --- */}
      {showRefundModal && detail && (
        <RefundModal
          detail={{ ...detail, refunds: orderState.refunds }}
          onConfirm={(refund, newFinancialStatus) => {
            dispatch({ type: "REFUND", refund, newFinancialStatus });
            showToast(`退款 ${refund.amount} 已提交`);
          }}
          onClose={() => setShowRefundModal(false)}
        />
      )}

      {/* --- 取消订单 Modal --- */}
      {showCancelModal && detail && (
        <CancelOrderModal
          detail={detail}
          orderState={orderState}
          onConfirm={(reason) => { dispatch({ type: "CANCEL_ORDER", reason }); showToast("订单已取消"); }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* ─── 编辑收货地址 Modal ─── */}
      {editAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditAddressModal(false)}>
          <div className="mx-4 w-full max-w-[520px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">修改收货地址</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">修改后将写入时间线记录</p>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              {[
                { key: 'name', label: '收件人', placeholder: '姓名', full: true },
                { key: 'phone', label: '电话', placeholder: '+1 (555) 000-0000' },
                { key: 'address1', label: '地址', placeholder: '街道地址', full: true },
                { key: 'address2', label: '地址2 (选填)', placeholder: '门牌号/单元/楼层', full: true },
                { key: 'city', label: '城市', placeholder: '城市' },
                { key: 'province', label: '州/省', placeholder: '州/省' },
                { key: 'zip', label: '邮编', placeholder: '邮编' },
                { key: 'country', label: '国家', placeholder: 'US / GB / SG' },
              ].map(({ key, label, placeholder, full }) => (
                <div key={key} className={full ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">{label}</label>
                  <input
                    type="text"
                    value={addrForm[key as keyof typeof addrForm]}
                    onChange={(e) => setAddrForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setEditAddressModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                取消
              </button>
              <button
                disabled={!addrForm.name || !addrForm.address1 || !addrForm.city || !addrForm.country}
                onClick={() => {
                  const newAddr = {
                    ...addrForm,
                    formatted: `${addrForm.address1}${addrForm.address2 ? ', ' + addrForm.address2 : ''}, ${addrForm.city}${addrForm.province ? ', ' + addrForm.province : ''} ${addrForm.zip}, ${addrForm.country}`,
                  };
                  dispatch({ type: 'UPDATE_ADDRESS', address: newAddr as OrderDetail['shippingAddress'] });
                  setEditAddressModal(false);
                  showToast('收货地址已更新');
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 退款/退货类型选择 Modal ─── */}
      {showReturnTypeModal && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReturnTypeModal(false)}>
          <div className="w-full max-w-[500px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">退款 / 退货申请</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">选择处理方式，我们将引导完成后续流程</p>
            </div>
            <div className="space-y-3 px-5 py-4">
              {/* 仅退款 */}
              <button
                onClick={() => { setShowReturnTypeModal(false); setShowRefundModal(true); }}
                className="flex w-full items-start gap-4 rounded-xl border border-[var(--border)] px-4 py-4 text-left hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[20px]">💳</div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">仅退款</div>
                  <div className="mt-0.5 text-[12px] text-[var(--muted)]">无需退回商品，直接退款。适用于价格补偿、质量赔付等场景。</div>
                </div>
              </button>

              {/* 退货退款 */}
              <button
                onClick={() => {
                  setShowReturnTypeModal(false);
                  // 跳转到退货单创建（此处用 toast 提示并跳转退货列表）
                  showToast('正在跳转至退货单创建...', 'info');
                  setTimeout(() => window.open('/dashboard/returns', '_blank'), 800);
                }}
                className="flex w-full items-start gap-4 rounded-xl border border-[var(--border)] px-4 py-4 text-left hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[20px]">📦</div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--foreground)]">退货并退款</div>
                  <div className="mt-0.5 text-[12px] text-[var(--muted)]">客户需寄回商品，收货质检后退款。生成 RMA 退货单并追踪完整逆向流程。</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
                    创建退货单 → 生成面单 → 仓库收货 → 质检 → 退款
                  </div>
                </div>
              </button>

              {/* 在途拦截（仅在途时显示） */}
              {orderState.fulfillments.some((f) => f.status === 'in_transit' && f.trackingNumber) && (
                <button
                  onClick={() => {
                    setShowReturnTypeModal(false);
                    const inTransitFul = orderState.fulfillments.find((f) => f.status === 'in_transit' && f.trackingNumber);
                    if (inTransitFul) setShowRecallModal(inTransitFul.id);
                  }}
                  className="flex w-full items-start gap-4 rounded-xl border border-red-200 px-4 py-4 text-left hover:border-[var(--danger)] hover:bg-red-50 transition-colors"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[20px]">🚚</div>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--foreground)]">在途拦截 / 召回包裹</div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">包裹仍在运输中，通知承运商截停并退回仓库，适用于客户取消等紧急场景。</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-[var(--danger)] ring-1 ring-inset ring-red-200">
                      ⚠ 拦截成功率取决于包裹当前位置
                    </div>
                  </div>
                </button>
              )}
            </div>
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-right">
              <button onClick={() => setShowReturnTypeModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 召回包裹 Modal ─── */}
      {showRecallModal && (() => {
        const ful = orderState.fulfillments.find((f) => f.id === showRecallModal);
        if (!ful) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowRecallModal(null)}>
            <div className="w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-[var(--border-subtle)] bg-red-50/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[var(--danger)]" />
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">召回 / 拦截在途包裹</h3>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-xl bg-[var(--surface-subtle)] p-3 text-[12px] space-y-1.5">
                  <div className="flex justify-between"><span className="text-[var(--muted)]">承运商</span><span className="font-medium">{ful.carrier}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted)]">运单号</span><span className="font-mono font-medium">{ful.trackingNumber}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted)]">发货仓</span><span>{ful.warehouse}</span></div>
                  {ful.estimatedDelivery && <div className="flex justify-between"><span className="text-[var(--muted)]">预计到达</span><span>{ful.estimatedDelivery}</span></div>}
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-[12px] text-amber-700 ring-1 ring-inset ring-amber-200">
                  <p className="font-semibold mb-1">召回须知：</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>召回成功率受包裹当前物流位置影响</li>
                    <li>已到达配送站或正在派送中的包裹较难拦截</li>
                    <li>召回成功后，商品退回发货仓入库，并触发退款流程</li>
                    <li>召回失败（已投递）需改走退货退款流程</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
                <button onClick={() => setShowRecallModal(null)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
                <button
                  onClick={() => {
                    dispatch({
                      type: 'UPDATE_TRACKING',
                      fulfillmentId: ful.id,
                      carrier: ful.carrier ?? '',
                      trackingNumber: ful.trackingNumber ?? '',
                      trackingUrl: ful.trackingUrl,
                    });
                    // 在时间线写入召回事件
                    dispatch({ type: 'ADD_TIMELINE_NOTE', content: `⚠ 已向 ${ful.carrier} 发起包裹召回请求，运单号 ${ful.trackingNumber}，等待承运商处理结果` });
                    setShowRecallModal(null);
                    showToast('召回请求已发送至承运商', 'warn');
                  }}
                  className="h-8 rounded-lg bg-[var(--danger)] px-4 text-[12px] font-semibold text-white hover:opacity-90"
                >
                  确认发起召回
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 添加备注 Modal ─── */}      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setNoteModal(false)}>
          <div className="mx-4 w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">添加备注</h3>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="填写备注内容..."
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setNoteModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                取消
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'ADD_NOTE', note: noteText });
                  setNoteModal(false);
                  showToast('备注已保存');
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 决策详情弹窗 ─── */}
      {decisionModal && (() => {
        // 获取当前履约单关联的所有决策事件
        const relatedEvents = detail.events
          .filter((e) => e.type === 'fulfillment' && (e.fulfillmentOrderNo === decisionModal || !e.fulfillmentOrderNo))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // 找到对应的 fulfillment 包裹信息
        const relatedFuls = orderState.fulfillments.filter((f) => f.fulfillmentOrderNo === decisionModal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDecisionModal(null)}>
            <div className="mx-4 w-full max-w-[640px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">履约决策详情</h3>
                  <p className="mt-0.5 inline-flex items-center font-mono text-[12px] text-[var(--muted)]">{decisionModal}<CopyButton text={decisionModal} /></p>
                </div>
                <button type="button" onClick={() => setDecisionModal(null)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                  <svg className="size-4" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(80vh - 130px)' }}>
                {/* 履约单概况 */}
                {relatedFuls.length > 0 && (
                  <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">履约单概况</div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3 text-[12px]">
                      <div>
                        <div className="text-[var(--muted)]">命中规则</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].matchedRule ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">选仓结果</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].warehouse ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">选仓原因</div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">{relatedFuls[0].warehouseReason ?? '—'}</div>
                      </div>
                    </div>
                    {relatedFuls.length > 1 && (
                      <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                        <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">出库单拆分 ({relatedFuls.length} 个包裹)</div>
                        {relatedFuls.map((f, i) => (
                          <div key={f.id} className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 ring-1 ring-inset ring-[var(--border-subtle)]">
                            <span className="flex size-5 items-center justify-center rounded bg-[var(--primary-soft)] text-[10px] font-bold text-[var(--primary)]">{i + 1}</span>
                            <span className="font-mono text-[11px] text-[var(--foreground)]">{f.outboundOrderNo}</span>
                            <span className="text-[11px] text-[var(--muted)]">{f.carrier} · {f.lineItemIds.length} 件</span>
                            {f.warehouseReason && <span className="ml-auto text-[10px] text-[var(--muted)]">{f.warehouseReason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 决策时间线 (正序展示) */}
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-3">决策流程 ({relatedEvents.length} 步)</div>
                {relatedEvents.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-[var(--muted)]">暂无决策记录</div>
                ) : (
                  <ol className="relative border-l-2 border-[var(--border-subtle)] pl-5 space-y-4">
                    {relatedEvents.map((event, idx) => (
                      <li key={event.id} className="relative">
                        <span className={cn(
                          'absolute -left-[21px] flex size-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[var(--surface)]',
                          idx === relatedEvents.length - 1 ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border-subtle)]'
                        )}>{idx + 1}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-[var(--foreground)]">{event.title}</span>
                          <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">{event.time}</span>
                        </div>
                        {event.description && (
                          <p className="mt-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[12px] leading-5 text-[var(--muted)]">{event.description}</p>
                        )}
                        {event.ruleName && (
                          <div className="mt-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] ring-1 ring-inset ring-blue-200">
                              ⚡ {event.ruleName}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-right">
                <button type="button" onClick={() => setDecisionModal(null)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
                  关闭
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 运单号录入 Modal ─── */}
      {trackingModal && (
        <TrackingModal
          fulfillmentId={trackingModal}
          form={trackingForm}
          carriers={['UPS', 'FedEx', 'USPS', 'DHL', 'Royal Mail', 'Ninja Van', 'XPO Logistics', 'Amazon Logistics']}
          onChangeForm={(k, v) => setTrackingForm((p) => ({ ...p, [k]: v }))}
          onConfirm={() => {
            dispatch({ type: 'UPDATE_TRACKING', fulfillmentId: trackingModal, carrier: trackingForm.carrier, trackingNumber: trackingForm.trackingNumber, trackingUrl: trackingForm.trackingUrl });
            setTrackingModal(null);
            showToast('运单号已保存');
          }}
          onClose={() => setTrackingModal(null)}
        />
      )}

      {/* ─── 打印 Modal ─── */}
      {printModal && (() => {
        const ful = orderState.fulfillments.find((f) => f.id === printModal.fulfillmentId);
        if (!ful) return null;
        return (
          <PrintModal
            fulfillmentId={printModal.fulfillmentId}
            type={printModal.type}
            fulfillment={ful}
            detail={detail}
            onClose={() => setPrintModal(null)}
          />
        );
      })()}

      {/* ─── 取消履约单 Modal ─── */}
      {cancelFulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setCancelFulModal(null)}>
          <div className="w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">取消履约单</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">取消后需重新手动生成履约单，仓库操作将中止</p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">取消原因 <span className="text-[var(--danger)]">*</span></label>
              <select
                value={cancelFulReason}
                onChange={(e) => setCancelFulReason(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)]"
              >
                <option value="">选择原因</option>
                {['客户取消订单', '库存不足需重新分仓', '地址变更需重发', '承运商变更', '包裹拆分调整', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setCancelFulModal(null)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
              <button
                disabled={!cancelFulReason}
                onClick={() => {
                  dispatch({ type: 'CANCEL_FULFILLMENT', fulfillmentId: cancelFulModal, reason: cancelFulReason });
                  setCancelFulModal(null);
                  showToast('履约单已取消');
                }}
                className="h-8 rounded-lg bg-[var(--danger)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 重新分仓 Modal ─── */}
      {rerouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setRerouteModal(null)}>
          <div className="w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">重新分仓</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">更换发货仓库，将生成新的出库单</p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">选择目标仓库 <span className="text-[var(--danger)]">*</span></label>
              {(() => {
                const { warehouses: whs } = require('@/lib/mock-data/warehouses');
                return (whs as { id: string; code: string; name: string; active: boolean }[]).filter((w) => w.active).map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => setRerouteWarehouseId(wh.id)}
                    className={cn(
                      'mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                      rerouteWarehouseId === wh.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'
                    )}
                  >
                    <div>
                      <div className="text-[13px] font-medium text-[var(--foreground)]">{wh.code}</div>
                      <div className="text-[11px] text-[var(--muted)]">{wh.name}</div>
                    </div>
                    {rerouteWarehouseId === wh.id && <Check className="ml-auto size-4 text-[var(--primary)]" />}
                  </button>
                ));
              })()}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setRerouteModal(null)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
              <button
                disabled={!rerouteWarehouseId}
                onClick={() => {
                  const { warehouses: whs } = require('@/lib/mock-data/warehouses');
                  const wh = (whs as { id: string; code: string }[]).find((w) => w.id === rerouteWarehouseId);
                  if (!wh) return;
                  dispatch({ type: 'REROUTE_FULFILLMENT', fulfillmentId: rerouteModal, newWarehouseCode: wh.code, newWarehouseId: wh.id });
                  setRerouteModal(null);
                  showToast(`已切换至仓库 ${wh.code}，重新生成出库单`);
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 优惠码 Modal ─── */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDiscountModal(false)}>
          <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">添加优惠码</h3>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">优惠码</label>
                <input type="text" value={discountCodeInput} onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())} placeholder="例: SAVE20" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-mono outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">折扣金额</label>
                <input type="text" value={discountAmountInput} onChange={(e) => setDiscountAmountInput(e.target.value)} placeholder="例: $10.00" className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setDiscountModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
              <button
                disabled={!discountCodeInput || !discountAmountInput}
                onClick={() => {
                  dispatch({ type: 'ADD_DISCOUNT_CODE', code: discountCodeInput, amount: discountAmountInput });
                  setDiscountModal(false);
                  showToast(`优惠码 ${discountCodeInput} 已添加`);
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 调整运费 Modal ─── */}
      {adjustShippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setAdjustShippingModal(false)}>
          <div className="w-full max-w-[380px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">调整运费</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">当前运费：{detail.totalShipping}</p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">新运费金额</label>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3">
                <span className="text-[var(--muted)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingInput}
                  onChange={(e) => setShippingInput(e.target.value)}
                  className="flex-1 bg-transparent py-2 text-[13px] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setAdjustShippingModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
              <button
                disabled={!shippingInput}
                onClick={() => {
                  dispatch({ type: 'ADJUST_SHIPPING', amount: `$${parseFloat(shippingInput).toFixed(2)}` });
                  setAdjustShippingModal(false);
                  showToast('运费已调整');
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 时间线备注 Modal ─── */}
      {timelineNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setTimelineNoteModal(false)}>
          <div className="w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--foreground)]">添加内部备注</h3>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">此备注仅对内部团队可见，会写入时间线</p>
            </div>
            <div className="px-5 py-4">
              <textarea
                autoFocus
                value={timelineNoteInput}
                onChange={(e) => setTimelineNoteInput(e.target.value)}
                rows={4}
                placeholder="填写内部备注内容..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <button onClick={() => setTimelineNoteModal(false)} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
              <button
                disabled={!timelineNoteInput.trim()}
                onClick={() => {
                  dispatch({ type: 'ADD_TIMELINE_NOTE', content: timelineNoteInput });
                  setTimelineNoteModal(false);
                  showToast('备注已添加到时间线');
                }}
                className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                保存备注
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// 渠道佣金费率表
const CHANNEL_FEE_RATE: Record<string, number> = {
  Amazon: 0.15,
  'TikTok Shop': 0.05,
  Walmart: 0.08,
  Shopify: 0,
  EDI: 0,
};

// 支付网关手续费率
const GATEWAY_FEE_RATE: Record<string, number> = {
  Stripe: 0.029,
  PayPal: 0.034,
  Adyen: 0.025,
};

function parseMoney(s: string): number {
  return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
}

function fmtMoney(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

type FeeType = 'handling' | 'insurance' | 'customs' | 'return' | 'platform' | 'marketing' | 'other';

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  handling: '操作/包材费',
  insurance: '保险费',
  customs: '关税/清关费',
  return: '退货处理费',
  platform: '平台专项费',
  marketing: '营销推广费',
  other: '其他',
};

function LineItemsTab({
  detail,
  discountCodes,
  adjustedShipping,
  orderStatus,
  onRemoveDiscount,
  onOpenDiscountModal,
  onOpenShippingModal,
}: {
  detail: OrderDetail;
  discountCodes: OrderDetail['discountCodes'];
  adjustedShipping?: string;
  orderStatus: string;
  onRemoveDiscount: (code: string) => void;
  onOpenDiscountModal: () => void;
  onOpenShippingModal: () => void;
}) {
  // 附加费用本地 state（实际应持久化到服务端）
  const [fees, setFees] = useState<Array<{
    id: string; type: FeeType; label: string; amount: number; note?: string;
  }>>(
    (detail.additionalFees ?? []).map((f) => ({
      id: f.id, type: f.type as FeeType, label: f.label, amount: f.amount, note: f.note,
    }))
  );
  const [addingFee, setAddingFee] = useState(false);
  const [feeForm, setFeeForm] = useState<{ type: FeeType; label: string; amount: string; note: string }>({
    type: 'other', label: '', amount: '', note: '',
  });

  const handleAddFee = () => {
    const amt = parseFloat(feeForm.amount);
    if (!feeForm.label || isNaN(amt)) return;
    setFees((prev) => [...prev, {
      id: `fee_${Date.now()}`,
      type: feeForm.type,
      label: feeForm.label,
      amount: amt,
      note: feeForm.note || undefined,
    }]);
    setFeeForm({ type: 'other', label: '', amount: '', note: '' });
    setAddingFee(false);
  };

  // ── 金额计算 ──
  const currency = detail.currency;

  // 商品行原价合计（用于订单折扣比例分摊的基数）
  const lineGross = detail.lineItems.reduce((s, i) => {
    const g = i.grossSubtotal ? parseMoney(i.grossSubtotal) : parseMoney(i.unitPrice) * i.quantity;
    return s + g;
  }, 0);
  // 行级折扣合计
  const lineDiscount = detail.lineItems.reduce((s, i) => s + parseMoney(i.discount), 0);
  // 订单级折扣（优惠券/满减，按行GMV占比动态分摊）
  const orderDiscountTotal = parseMoney(detail.totalDiscount);

  // 退款：按 lineItemId 建立退款金额 map 和退款记录 map
  const refundByLineItem: Record<string, number> = {};
  const refundRecordsByLineItem: Record<string, typeof detail.refunds> = {};
  for (const refund of detail.refunds) {
    for (const ri of refund.lineItems) {
      refundByLineItem[ri.lineItemId] = (refundByLineItem[ri.lineItemId] ?? 0) + parseMoney(refund.amount) / refund.lineItems.reduce((s, x) => s + x.quantity, 0) * ri.quantity;
      if (!refundRecordsByLineItem[ri.lineItemId]) refundRecordsByLineItem[ri.lineItemId] = [];
      if (!refundRecordsByLineItem[ri.lineItemId].includes(refund)) {
        refundRecordsByLineItem[ri.lineItemId].push(refund);
      }
    }
  }
  const totalRefund = Object.values(refundByLineItem).reduce((s, v) => s + v, 0);

  // ── COGS 计算（考虑退款类型）──
  // 基础 COGS：所有商品全量成本
  const rawLineCogs = detail.lineItems.reduce((s, i) => s + (i.costSnapshot ?? 0) * i.quantity, 0);

  // 退货退款（商品完好）：按退回数量冲销 COGS
  // 仅退款 / 退货损坏：成本不变
  let cogsRecovered = 0; // 成本冲销金额（正数，表示减少的成本）
  const cogsAdjustments: Array<{ label: string; amount: number; type: string }> = [];

  for (const refund of detail.refunds) {
    if (refund.refundType !== 'return_refund') continue; // 只有完好退货才冲销
    for (const ri of refund.lineItems) {
      const item = detail.lineItems.find(li => li.id === ri.lineItemId);
      if (!item || item.costSnapshot === undefined) continue;
      const recovered = item.costSnapshot * ri.quantity;
      cogsRecovered += recovered;
      cogsAdjustments.push({
        label: `${item.title} × ${ri.quantity} 件退回（${refund.refundNo ?? refund.id}）`,
        amount: recovered,
        type: 'return_refund',
      });
    }
  }

  const lineCogs = rawLineCogs - cogsRecovered;

  // 净收入（不含税，扣退款）
  const shippingRevenue = parseMoney(detail.totalShipping);
  const netRevenue = lineGross - lineDiscount - orderDiscountTotal + shippingRevenue - totalRefund;

  // 系统可推算的成本
  const totalPrice = parseMoney(detail.totalPrice);
  const channelFeeRate = CHANNEL_FEE_RATE[detail.channel] ?? 0;
  // 平台佣金按已收净销售额计算（扣完折扣但不含运费）
  const platformFee = (lineGross - lineDiscount - orderDiscountTotal - totalRefund) * channelFeeRate;
  const gatewayFeeRate = GATEWAY_FEE_RATE[detail.paymentGateway] ?? 0.029;
  // 支付手续费按实际到账金额（订单总额 - 退款）计算
  const paymentFee = (totalPrice - totalRefund) * gatewayFeeRate;

  // 外部回传成本
  const warehouseCost = detail.profitability?.warehouseCost ?? 0;
  const freightCost = detail.profitability?.freightCost ?? 0;
  const costComplete = detail.profitability?.costComplete ?? false;

  // 附加费用
  const additionalTotal = fees.reduce((s, f) => s + f.amount, 0);

  // 毛利润
  const totalCost = lineCogs + warehouseCost + freightCost + platformFee + paymentFee + additionalTotal;
  const grossProfit = netRevenue - totalCost;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const marginCls = grossMargin >= 30 ? 'text-[var(--success)]' : grossMargin >= 10 ? 'text-[var(--warning)]' : 'text-[var(--danger)]';

  return (
    <div>
      {/* ── 商品明细表格 ── */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between bg-[var(--surface)] px-4 py-2.5">
          <span className="text-[12px] text-[var(--muted)]">{detail.lineItems.length} 行 · {detail.lineItems.reduce((s, i) => s + i.quantity, 0)} 件</span>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            {discountCodes.length > 0 && discountCodes.map((dc) => (
              <span key={dc.code} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-[var(--success)] ring-1 ring-inset ring-green-200">
                优惠码 {dc.code}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2.5">商品</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">单价</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">数量</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">商品小计</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">折扣</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">实付小计</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">退款</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">税费</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">成本</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">毛利</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">毛利率</th>
                <th className="whitespace-nowrap px-3 py-2.5">履约</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {detail.lineItems.map((item) => {
                const gross = item.grossSubtotal ? parseMoney(item.grossSubtotal) : parseMoney(item.unitPrice) * item.quantity;
                const itemDiscount = parseMoney(item.discount);
                const orderAlloc = lineGross > 0 ? orderDiscountTotal * (gross / lineGross) : 0;
                const paidSubtotal = Math.max(0, gross - itemDiscount - orderAlloc);
                // 退款不超过该行实付小计（数据层保障，UI 兜底）
                const itemRefundRaw = refundByLineItem[item.id] ?? 0;
                const itemRefund = Math.min(itemRefundRaw, paidSubtotal);
                // 该行对应的退款记录（用于 tooltip）
                const itemRefundRecords = refundRecordsByLineItem[item.id] ?? [];
                const cogs = (item.costSnapshot ?? 0) * item.quantity;
                const itemTax = parseMoney(item.tax);
                // 行收入 = 实付小计 - 退款 - 税（税不是收入）
                const itemRevenue = Math.max(0, paidSubtotal - itemRefund - itemTax);
                const itemProfit = item.costSnapshot !== undefined ? itemRevenue - cogs : null;
                const itemMargin = itemProfit !== null && itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : null;
                const totalDisc = itemDiscount + orderAlloc;
                const hasAnyDiscount = totalDisc > 0.005;
                const hasOrderAlloc = orderAlloc > 0.005;

                // 已履约数量（用于履约列展示）
                const isFulfilled = detail.fulfillments.some(
                  (f) => f.lineItemIds.includes(item.id) && (f.status === 'delivered' || f.status === 'fulfilled' || f.status === 'in_transit')
                );
                const fulfilledQty = isFulfilled ? item.quantity : 0;

                return (
                  <tr key={item.id} className="transition-colors hover:bg-[var(--surface-subtle)]">
                    {/* 商品（含SKU） */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 shrink-0 rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                        <div>
                          <div className="text-[13px] font-medium text-[var(--foreground)]">{item.title}</div>
                          <div className="text-[11px] text-[var(--muted)]">{item.variantTitle}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{item.sku}</div>
                          {item.costSnapshot !== undefined && (
                            <span className={cn(
                              'mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] ring-1 ring-inset',
                              item.costSource === 'wms_receipt'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]'
                            )}>
                              {item.costSource === 'wms_receipt' ? 'WMS成本' : '手动成本'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 单价 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">{item.unitPrice}</td>

                    {/* 数量 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--foreground)]">
                      {item.quantity}{item.unit && <span className="ml-0.5 text-[10px] text-[var(--muted)]">{item.unit}</span>}
                    </td>

                    {/* 商品小计（原价） */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{fmtMoney(gross, currency)}</td>

                    {/* 折扣合计（hover 展示明细） */}
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {hasAnyDiscount ? (
                        <div className="group/disc relative inline-block">
                          <span className="cursor-default font-medium text-[var(--success)] underline decoration-dotted underline-offset-2">
                            -{fmtMoney(totalDisc, currency)}
                          </span>
                          <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-panel)] text-[12px] group-hover/disc:block">
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">折扣明细</div>
                            <div className="space-y-1.5">
                              {itemDiscount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--muted)]">商品促销</span>
                                  <span className="text-[var(--success)]">-{fmtMoney(itemDiscount, currency)}</span>
                                </div>
                              )}
                              {hasOrderAlloc && (
                                <div className="flex justify-between">
                                  <span className="text-[var(--muted)]">
                                    订单折扣{detail.discountCodes.length > 0 && <span className="ml-1 font-mono text-[10px] text-[var(--muted-foreground)]">({detail.discountCodes[0].code})</span>}
                                  </span>
                                  <span className="text-[var(--success)]">-{fmtMoney(orderAlloc, currency)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-semibold">
                                <span>合计</span>
                                <span className="text-[var(--success)]">-{fmtMoney(totalDisc, currency)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>

                    {/* 实付小计 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[var(--foreground)]">
                      {fmtMoney(paidSubtotal, currency)}
                    </td>

                    {/* 退款（hover 展示退款单据信息） */}
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {itemRefund > 0 ? (
                        <div className="group/refund relative inline-block">
                          <span className="cursor-default font-medium text-[var(--danger)] underline decoration-dotted underline-offset-2">
                            -{fmtMoney(itemRefund, currency)}
                          </span>
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-panel)] text-[12px] group-hover/refund:block">
                            {itemRefundRecords.map((refund) => {
                              const ri = refund.lineItems.find((r) => r.lineItemId === item.id);
                              return (
                                <div key={refund.id}>
                                  <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--danger)]">退款单据</span>
                                    <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{refund.refundNo ?? refund.id}</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {ri && (
                                      <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">退款数量</span>
                                        <span className="font-medium text-[var(--foreground)]">{ri.quantity} {item.unit ?? '件'}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)]">退款金额</span>
                                      <span className="font-semibold text-[var(--danger)]">{refund.amount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)]">退款时间</span>
                                      <span className="text-[var(--foreground)]">{refund.createdAt.slice(0, 16)}</span>
                                    </div>
                                    {refund.method && (
                                      <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">退款方式</span>
                                        <span className="text-[var(--foreground)]">{refund.method}</span>
                                      </div>
                                    )}
                                    {refund.processedBy && (
                                      <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">处理人</span>
                                        <span className="text-[var(--foreground)]">{refund.processedBy}</span>
                                      </div>
                                    )}
                                    <div className="border-t border-[var(--border-subtle)] pt-1.5 text-[11px] text-[var(--muted)]">
                                      {refund.reason}
                                    </div>
                                    {refund.note && (
                                      <div className="text-[11px] text-[var(--muted-foreground)]">{refund.note}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>

                    {/* 税费 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--muted)]">{item.tax}</td>

                    {/* 成本 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {item.costSnapshot !== undefined
                        ? <span className="font-medium text-[var(--foreground)]">{fmtMoney(cogs, currency)}</span>
                        : <span className="text-[11px] text-[var(--danger)]">未设置</span>}
                    </td>

                    {/* 行毛利 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {itemProfit !== null
                        ? <span className={cn('font-semibold', itemProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                            {itemProfit >= 0 ? '' : '-'}{fmtMoney(Math.abs(itemProfit), currency)}
                          </span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>

                    {/* 毛利率 */}
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {itemMargin !== null
                        ? <span className={cn('text-[12px] font-semibold', itemMargin >= 40 ? 'text-[var(--success)]' : itemMargin >= 20 ? 'text-[var(--warning)]' : 'text-[var(--danger)]')}>
                            {itemMargin.toFixed(1)}%
                          </span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>

                    {/* 履约（含已发/待发数量） */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge status={item.fulfillmentStatus} />
                      {fulfilledQty > 0 ? (
                        <div className="mt-0.5 text-[10px] text-[var(--success)]">已发 {fulfilledQty} {item.unit ?? '件'}</div>
                      ) : item.fulfillmentNote ? (
                        <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.fulfillmentNote}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 附加费用 ── */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] font-semibold text-[var(--foreground)]">附加费用</span>
          <button
            onClick={() => setAddingFee(true)}
            className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
          >
            + 添加费用
          </button>
        </div>

        {/* 添加费用表单 */}
        {addingFee && (
          <div className="mx-4 mb-3 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">费用类型</label>
                <select
                  value={feeForm.type}
                  onChange={(e) => {
                    const t = e.target.value as FeeType;
                    setFeeForm((p) => ({ ...p, type: t, label: FEE_TYPE_LABELS[t] }));
                  }}
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  {(Object.entries(FEE_TYPE_LABELS) as [FeeType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">费用名称</label>
                <input
                  type="text"
                  value={feeForm.label}
                  onChange={(e) => setFeeForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="自定义名称"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">金额 (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">备注（选填）</label>
                <input
                  type="text"
                  value={feeForm.note}
                  onChange={(e) => setFeeForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="说明"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleAddFee} className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-medium text-white hover:opacity-90">
                确认添加
              </button>
              <button onClick={() => setAddingFee(false)} className="flex h-7 items-center rounded-lg border border-[var(--border)] px-3 text-[12px] text-[var(--muted)] hover:bg-[var(--surface)]">
                取消
              </button>
            </div>
          </div>
        )}

        {fees.length > 0 ? (
          <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-[12px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-3 py-2 text-left">名称</th>
                  <th className="px-3 py-2 text-right">金额</th>
                  <th className="px-3 py-2 text-left">备注</th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-[var(--surface-subtle)]">
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                        {FEE_TYPE_LABELS[fee.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{fee.label}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[var(--danger)]">
                      -{fmtMoney(fee.amount, currency)}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{fee.note ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setFees((prev) => prev.filter((f) => f.id !== fee.id))}
                        className="text-[var(--muted)] hover:text-[var(--danger)]"
                        title="删除"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 pb-3 text-[12px] text-[var(--muted)]">暂无附加费用</p>
        )}
      </div>

      {/* ── 汇总 + 利润分析 ── */}
      <div className="bg-[var(--surface-subtle)] px-4 py-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

          {/* 左：订单金额汇总 */}
          <div className="flex-1 space-y-1 text-[13px]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">订单金额</div>
            <SummaryRow label="商品原价" value={fmtMoney(lineGross, currency)} />
            {lineDiscount > 0 && <SummaryRow label="商品折扣" value={`-${fmtMoney(lineDiscount, currency)}`} cls="text-[var(--success)]" />}
            {orderDiscountTotal > 0 && (
              <SummaryRow
                label={`订单折扣${discountCodes.length > 0 ? ` (${discountCodes.map((d) => d.code).join(', ')})` : ''}`}
                value={`-${fmtMoney(orderDiscountTotal, currency)}`}
                cls="text-[var(--success)]"
              />
            )}
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">运费</span>
              <div className="flex items-center gap-1.5">
                <span>{adjustedShipping ?? detail.totalShipping}</span>
                {!['已取消','已完成','已发货'].includes(orderStatus) && (
                  <button onClick={onOpenShippingModal} className="text-[10px] text-[var(--primary)] hover:underline">调整</button>
                )}
              </div>
            </div>
            {/* 优惠码管理 */}
            {discountCodes.map((dc) => (
              <div key={dc.code} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--muted)]">优惠码</span>
                  <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--success)] ring-1 ring-inset ring-green-200">{dc.code}</span>
                  {!['已取消','已完成','已发货'].includes(orderStatus) && (
                    <button onClick={() => onRemoveDiscount(dc.code)} className="text-[10px] text-[var(--muted)] hover:text-[var(--danger)]">×</button>
                  )}
                </div>
                <span className="text-[var(--success)]">-{dc.amount}</span>
              </div>
            ))}
            {!['已取消','已完成','已发货'].includes(orderStatus) && (
              <button onClick={onOpenDiscountModal} className="text-[11px] text-[var(--primary)] hover:underline">+ 添加优惠码</button>
            )}
            {totalRefund > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[var(--muted)]">退款 ({detail.refunds.length} 笔)</span>
                  <span className="text-[var(--danger)]">-{fmtMoney(totalRefund, currency)}</span>
                </div>
                {/* 每笔退款的类型标签 */}
                {detail.refunds.map((r) => {
                  const typeLabel =
                    r.refundType === 'return_refund' ? { text: '退货退款·成本冲销', cls: 'text-[var(--success)] bg-green-50 ring-green-200' } :
                    r.refundType === 'return_refund_damaged' ? { text: '退货退款·商品损坏', cls: 'text-orange-600 bg-orange-50 ring-orange-200' } :
                    { text: '仅退款·成本不变', cls: 'text-amber-700 bg-amber-50 ring-amber-200' };
                  return (
                    <div key={r.id} className="flex items-center justify-between pl-3 text-[11px] mt-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[var(--muted)] shrink-0">{r.refundNo ?? r.id}</span>
                        <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ring-1 ring-inset', typeLabel.cls)}>
                          {typeLabel.text}
                        </span>
                      </div>
                      <span className="shrink-0 text-[var(--danger)]">-{r.amount}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <SummaryRow label={`税费${detail.taxesIncluded ? ' (含税价)' : ''}`} value={detail.totalTax} muted />
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
              <span>订单实收</span>
              <span className="text-[15px]">{detail.totalPrice}</span>
            </div>
          </div>

          {/* 中：成本拆分 */}
          <div className="flex-1 space-y-1 text-[13px]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">成本拆分</div>
            {/* COGS 行：有冲销时展示原始值和冲销明细 */}
            {cogsRecovered > 0 ? (
              <div className="space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[var(--muted)]">商品成本 (COGS)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--muted)] line-through">-{fmtMoney(rawLineCogs, currency)}</span>
                    <span className="text-orange-600 font-medium">-{fmtMoney(lineCogs, currency)}</span>
                  </div>
                </div>
                {/* 冲销明细 */}
                {cogsAdjustments.map((adj, i) => (
                  <div key={i} className="flex items-center justify-between pl-3 text-[11px]">
                    <span className="flex items-center gap-1 text-[var(--muted)]">
                      <span className="text-[var(--success)]">↩</span>
                      {adj.label}
                    </span>
                    <span className="text-[var(--success)]">+{fmtMoney(adj.amount, currency)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pl-3 text-[11px] font-medium text-[var(--success)] border-t border-[var(--border-subtle)] pt-0.5">
                  <span>COGS 冲销合计（退货完好）</span>
                  <span>+{fmtMoney(cogsRecovered, currency)}</span>
                </div>
              </div>
            ) : (
              <div>
                <SummaryRow label="商品成本 (COGS)" value={`-${fmtMoney(lineCogs, currency)}`} cls="text-orange-600" />
                {/* 提示仅退款订单的成本说明 */}
                {detail.refunds.some(r => r.refundType === 'refund_only') && (
                  <div className="mt-0.5 pl-3 text-[10px] text-[var(--muted)] flex items-center gap-1">
                    <span>⚠</span> 含仅退款商品，成本不可回收
                  </div>
                )}
                {detail.refunds.some(r => r.refundType === 'return_refund_damaged') && (
                  <div className="mt-0.5 pl-3 text-[10px] text-[var(--muted)] flex items-center gap-1">
                    <span>⚠</span> 含损坏退货，成本不可回收
                  </div>
                )}
              </div>
            )}
            <SummaryRow
              label="仓储操作费"
              value={warehouseCost > 0 ? `-${fmtMoney(warehouseCost, currency)}` : '待回传'}
              cls={warehouseCost > 0 ? 'text-[var(--foreground)]' : 'text-amber-600'}
            />
            <SummaryRow
              label="运输成本"
              value={freightCost > 0 ? `-${fmtMoney(freightCost, currency)}` : '待回传'}
              cls={freightCost > 0 ? 'text-[var(--foreground)]' : 'text-amber-600'}
            />
            {channelFeeRate > 0 && (
              <SummaryRow label={`平台佣金 (${(channelFeeRate * 100).toFixed(0)}%)`} value={`-${fmtMoney(platformFee, currency)}`} />
            )}
            <SummaryRow label={`支付手续费 (${(gatewayFeeRate * 100).toFixed(1)}%)`} value={`-${fmtMoney(paymentFee, currency)}`} />
            {additionalTotal > 0 && (
              <SummaryRow label={`附加费用 (${fees.length} 项)`} value={`-${fmtMoney(additionalTotal, currency)}`} />
            )}
            <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold text-[var(--foreground)]">
              <span>总成本</span>
              <span>{fmtMoney(totalCost, currency)}</span>
            </div>
          </div>

          {/* 右：毛利润汇总 */}
          <div className="min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {costComplete ? '订单毛利润' : '预估毛利润'}
            </div>
            {!costComplete && (
              <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">
                <AlertTriangle className="size-3.5 shrink-0" />
                部分成本待回传，利润为预估值
              </div>
            )}
            <div className={cn('text-[28px] font-bold', grossProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
              {grossProfit >= 0 ? '' : '-'}{fmtMoney(Math.abs(grossProfit), currency)}
            </div>
            <div className={cn('mt-1 text-[14px] font-semibold', marginCls)}>
              毛利率 {grossMargin.toFixed(1)}%
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <div
                className={cn('h-full rounded-full', grossMargin >= 30 ? 'bg-[var(--success)]' : grossMargin >= 10 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]')}
                style={{ width: `${Math.min(Math.max(grossMargin, 0), 100)}%` }}
              />
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">净收入</span>
                <span className="font-medium">{fmtMoney(netRevenue, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">总成本</span>
                <span className="font-medium">{fmtMoney(totalCost, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, cls, muted }: { label: string; value: string; cls?: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn('text-[var(--muted)]', muted && 'text-[var(--muted)]')}>{label}</span>
      <span className={cn('font-medium', cls ?? (muted ? 'text-[var(--muted)]' : 'text-[var(--foreground)]'))}>
        {value}
      </span>
    </div>
  );
}

// ─── 所有新增 Modal（在 return 外挂载）────────────────────────────────────────
// 这些 Modal 通过 Page 组件内的 state 控制，在 Page return 的最底部渲染

/**
 * 运单号录入 Modal（在物流Tab的 header bar 中触发）
 * 外部调用：trackingModal / trackingForm / setTrackingModal / setTrackingForm / dispatch / showToast
 * 注意：此处不是独立组件而是内联在 Page return 中的，但把渲染代码提取为函数方便维护。
 */
function TrackingModal({
  fulfillmentId,
  form,
  carriers,
  onChangeForm,
  onConfirm,
  onClose,
}: {
  fulfillmentId: string;
  form: { carrier: string; trackingNumber: string; trackingUrl: string };
  carriers: string[];
  onChangeForm: (k: string, v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">录入运单号</h3>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">填写承运商和跟踪号，系统将自动生成追踪链接</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">承运商 <span className="text-[var(--danger)]">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {carriers.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeForm('carrier', c)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition',
                    form.carrier === c ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                  )}
                >{c}</button>
              ))}
            </div>
            <input
              type="text"
              value={form.carrier}
              onChange={(e) => onChangeForm('carrier', e.target.value)}
              placeholder="或手动输入承运商名称"
              className="mt-2 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">运单号 <span className="text-[var(--danger)]">*</span></label>
            <input
              type="text"
              value={form.trackingNumber}
              onChange={(e) => onChangeForm('trackingNumber', e.target.value)}
              placeholder="例: 1Z999AA10456789012"
              className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-mono outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">追踪链接（选填）</label>
            <input
              type="text"
              value={form.trackingUrl}
              onChange={(e) => onChangeForm('trackingUrl', e.target.value)}
              placeholder="留空将自动生成通用追踪链接"
              className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">取消</button>
          <button
            disabled={!form.carrier || !form.trackingNumber}
            onClick={onConfirm}
            className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
}

function PrintModal({
  fulfillmentId,
  type,
  fulfillment,
  detail,
  onClose,
}: {
  fulfillmentId: string;
  type: 'waybill' | 'packingList' | 'boxLabel';
  fulfillment: import('@/lib/mock-data/order-details').FulfillmentPackage;
  detail: import('@/lib/mock-data/order-details').OrderDetail;
  onClose: () => void;
}) {
  const typeLabel = { waybill: '面单', packingList: '箱单', boxLabel: '装箱单' }[type];
  const packageItems = fulfillment.lineItemIds.map((lid) => detail.lineItems.find((li) => li.id === lid)).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[560px] max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-4 shrink-0">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">打印预览 · {typeLabel}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90"
            >
              <Printer className="size-3.5" />打印
            </button>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)]">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* 打印预览内容 */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-[13px] print:border-0">
            {type === 'waybill' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[20px] font-bold">{fulfillment.carrier}</div>
                    <div className="mt-1 text-[var(--muted)]">{fulfillment.serviceLevel}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[16px] font-bold">{fulfillment.trackingNumber}</div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">{fulfillment.fulfillmentOrderNo}</div>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <div className="font-semibold">发货方</div>
                    <div className="mt-1 text-[var(--muted)]">{fulfillment.warehouse}</div>
                  </div>
                  <div>
                    <div className="font-semibold">收件方</div>
                    <div className="mt-1 text-[var(--muted)]">
                      <div>{detail.shippingAddress.name}</div>
                      <div>{detail.shippingAddress.phone}</div>
                      <div>{detail.shippingAddress.formatted}</div>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div>
                  <div className="font-semibold">商品明细</div>
                  {packageItems.map((item) => item && (
                    <div key={item.id} className="mt-1.5 flex justify-between text-[12px]">
                      <span>{item.title} · {item.variantTitle}</span>
                      <span>×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {fulfillment.totalWeight && (
                  <div className="text-[12px] text-[var(--muted)]">总重量：{fulfillment.totalWeight}</div>
                )}
              </div>
            )}
            {type === 'packingList' && (
              <div className="space-y-4">
                <div className="text-[18px] font-bold">箱单 (Packing List)</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div><span className="text-[var(--muted)]">订单号：</span>{detail.orderNo}</div>
                  <div><span className="text-[var(--muted)]">履约单号：</span>{fulfillment.fulfillmentOrderNo}</div>
                  <div><span className="text-[var(--muted)]">发货仓：</span>{fulfillment.warehouse}</div>
                  <div><span className="text-[var(--muted)]">运单号：</span><span className="font-mono">{fulfillment.trackingNumber}</span></div>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left">商品</th>
                      <th className="px-2 py-1.5 text-left">SKU</th>
                      <th className="px-2 py-1.5 text-right">数量</th>
                      <th className="px-2 py-1.5 text-right">重量(g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageItems.map((item) => item && (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">{item.title}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px]">{item.sku}</td>
                        <td className="px-2 py-1.5 text-right">{item.quantity}</td>
                        <td className="px-2 py-1.5 text-right">{item.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-[12px]">总重量：{fulfillment.totalWeight ?? '—'}</div>
              </div>
            )}
            {type === 'boxLabel' && (
              <div className="space-y-3">
                <div className="text-[16px] font-bold">装箱单 (Box Label)</div>
                <div className="flex gap-6 text-[12px]">
                  <div className="space-y-1">
                    <div><span className="text-[var(--muted)]">订单：</span>{detail.orderNo}</div>
                    <div><span className="text-[var(--muted)]">仓库：</span>{fulfillment.warehouse}</div>
                    <div><span className="text-[var(--muted)]">承运商：</span>{fulfillment.carrier}</div>
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-[var(--muted)]">运单号：</span><span className="font-mono font-bold">{fulfillment.trackingNumber}</span></div>
                    <div><span className="text-[var(--muted)]">包裹：</span>{fulfillment.packageCount ?? 1} 件</div>
                    <div><span className="text-[var(--muted)]">重量：</span>{fulfillment.totalWeight ?? '—'}</div>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div>
                  <div className="font-semibold">收件人</div>
                  <div className="mt-1 text-[12px]">
                    <div className="font-medium">{detail.shippingAddress.name}</div>
                    <div className="text-[var(--muted)]">{detail.shippingAddress.formatted}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 上游变更感知横幅组件 ────────────────────────────────────────────────────

const upstreamChangeConfig: Record<string, {
  label: string;
  icon: string;
  severity: 'critical' | 'warning' | 'info';
  stageAdvice: Record<string, string>;
}> = {
  order_cancelled: {
    label: '订单被取消',
    icon: '🚫',
    severity: 'critical',
    stageAdvice: {
      pending_review: '系统已自动锁定，禁止继续审核发货，请确认后处置',
      pending_outbound: '仓库已收到出库指令，请立即截单，避免错误出库',
      outbounded: '包裹已出库！请核实仓库实际发货情况，如已发出需联系承运商召回',
    },
  },
  buyer_cancel_request: {
    label: '买家申请取消',
    icon: '⚠️',
    severity: 'critical',
    stageAdvice: {
      pending_review: '买家申请取消，系统已锁定订单，请处理后才能继续发货',
      pending_outbound: '买家申请取消，请截单后决定是否同意，避免发出后纠纷',
      outbounded: '包裹已出库后买家申请取消！请决定：同意取消并尝试召回，或拒绝申请',
    },
  },
  item_cancelled: {
    label: '商品被取消',
    icon: '📦',
    severity: 'warning',
    stageAdvice: {
      pending_review: '部分商品已被取消，系统已自动从发货单移除，请确认数量',
      pending_outbound: '商品被取消，请截单后修改发货清单再重新下单',
      outbounded: '商品在发货后被取消，请核实是否已实际出库，如已发出建议与买家协商',
    },
  },
  quantity_changed: {
    label: '商品数量变更',
    icon: '🔢',
    severity: 'warning',
    stageAdvice: {
      pending_review: '商品数量已变更，请确认后系统将自动更新发货数量',
      pending_outbound: '数量变更后仓库操作中，请截单后修改数量再重新下单，避免多发/少发',
      outbounded: '包裹已出库后数量变更！请核实实际出库数量，如有差异联系仓库处理',
    },
  },
  address_changed: {
    label: '收货地址变更',
    icon: '📍',
    severity: 'warning',
    stageAdvice: {
      pending_review: '地址已变更，系统已自动更新，请确认新地址后继续发货',
      pending_outbound: '地址变更后仓库即将出库，请截单后更新地址再重新推送仓库',
      outbounded: '包裹已出库后地址变更！请联系承运商修改配送地址，或拦截重发',
    },
  },
  item_added: {
    label: '商品新增',
    icon: '➕',
    severity: 'info',
    stageAdvice: {
      pending_review: '订单新增商品，系统已自动更新，请确认后发货',
      pending_outbound: '商品新增，请截单后更新发货清单再重新下单，避免漏发',
      outbounded: '商品新增发现时包裹已出库，请核实是否漏发，需要补发请创建手工单',
    },
  },
  price_changed: {
    label: '价格变更',
    icon: '💰',
    severity: 'info',
    stageAdvice: {
      pending_review: '订单价格已变更，请确认财务影响后继续',
      pending_outbound: '价格变更，建议确认不影响财务核算后继续',
      outbounded: '包裹已出库后价格变更，请确认退款/补款需求',
    },
  },
};

const severityStyle = {
  critical: {
    banner: 'border-red-300 bg-red-50',
    badge: 'bg-red-100 text-red-700 ring-red-200',
    title: 'text-red-800',
    advice: 'text-red-700 bg-red-100/60',
    icon: 'text-red-500',
  },
  warning: {
    banner: 'border-amber-300 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 ring-amber-200',
    title: 'text-amber-800',
    advice: 'text-amber-700 bg-amber-100/60',
    icon: 'text-amber-500',
  },
  info: {
    banner: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 ring-blue-200',
    title: 'text-blue-800',
    advice: 'text-blue-700 bg-blue-100/60',
    icon: 'text-blue-500',
  },
};

function UpstreamChangeBanner({
  changes,
  lineItems = [],
  onHandle,
  onIgnore,
}: {
  changes: import('@/lib/mock-data/order-details').UpstreamChange[];
  lineItems?: import('@/lib/mock-data/order-details').OrderLineItem[];
  onHandle: (changeId: string, action: string) => void;
  onIgnore: (changeId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pending = changes.filter((c) => c.status === 'pending');
  if (pending.length === 0) return null;

  /** 根据 lineItemId 或 sku 查出商品名称+SKU 摘要 */
  function resolveItem(data?: Record<string, unknown>): string | null {
    if (!data) return null;
    const lid = data.lineItemId as string | undefined;
    const sku = data.sku as string | undefined;
    const item = lid ? lineItems.find(li => li.id === lid) : sku ? lineItems.find(li => li.sku === sku) : null;
    if (!item) return sku ?? null;
    return `${item.title}（${item.sku}）`;
  }

  /** 将 before/after 转成一句自然语言摘要 */
  function buildChangeSummary(change: import('@/lib/mock-data/order-details').UpstreamChange): string {
    const { type } = change;
    const bef = change.before as Record<string, unknown> | undefined;
    const aft = change.after  as Record<string, unknown> | undefined;
    const itemName = resolveItem(bef ?? aft);

    switch (type) {
      case 'order_cancelled':
        return '买家在渠道侧取消了整个订单';
      case 'buyer_cancel_request':
        return '买家通过渠道提交了取消申请';
      case 'item_cancelled': {
        const qty = bef?.quantity;
        return itemName
          ? `${itemName} × ${qty ?? '?'} 件 被渠道取消`
          : '商品行被渠道取消';
      }
      case 'quantity_changed': {
        const qBefore = bef?.quantity;
        const qAfter  = aft?.quantity;
        return itemName
          ? `${itemName} 数量由 ${qBefore} 件 → ${qAfter} 件`
          : `数量由 ${qBefore} → ${qAfter}`;
      }
      case 'address_changed': {
        if (bef && aft) {
          return `收货地址变更：${bef.address1 ?? ''}，${bef.city ?? ''} → ${aft.address1 ?? ''}，${aft.city ?? ''}`;
        }
        return '买家修改了收货地址';
      }
      case 'item_added':
        return itemName ? `渠道新增商品：${itemName}` : '渠道侧新增了商品行';
      case 'price_changed': {
        const pBefore = bef?.price;
        const pAfter  = aft?.price;
        return itemName
          ? `${itemName} 单价 ${pBefore} → ${pAfter}`
          : `价格由 ${pBefore} → ${pAfter}`;
      }
      default:
        return '渠道侧发生了变更';
    }
  }

  return (
    <div className="mb-4 space-y-2">
      {pending.map((change) => {
        const cfg = upstreamChangeConfig[change.type];
        if (!cfg) return null;
        const style = severityStyle[cfg.severity];
        const summary = buildChangeSummary(change);
        const isExpanded = expanded[change.id] ?? false;

        return (
          <div key={change.id} className={cn('overflow-hidden rounded-lg border', style.banner)}>
            {/* ── 主行：一眼读懂 ── */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <span className={cn('shrink-0 text-[15px]')}>{cfg.icon}</span>

              {/* 类型标签 */}
              <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', style.badge)}>
                {cfg.label}
              </span>

              {/* 阶段 */}
              <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]">
                {change.stage === 'pending_review' ? '待审核' :
                 change.stage === 'pending_outbound' ? '待出库' : '已出库'}
              </span>

              {/* 自然语言摘要 */}
              <span className={cn('flex-1 truncate text-[12px] font-medium', style.title)}>
                {summary}
              </span>

              {/* 感知时间 */}
              <span className="shrink-0 text-[11px] text-[var(--muted)]">
                {change.detectedAt.slice(5, 16)}
              </span>

              {/* 行内快捷操作：只显示 primary */}
              {change.suggestions.filter(s => s.variant === 'primary').map((s) => (
                <button
                  key={s.action}
                  onClick={() => onHandle(change.id, s.action)}
                  title={s.description}
                  className="shrink-0 h-7 rounded-md bg-[var(--primary)] px-2.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                >
                  {s.label}
                </button>
              ))}

              {/* 展开/收起 */}
              <button
                onClick={() => setExpanded((p) => ({ ...p, [change.id]: !isExpanded }))}
                className="shrink-0 rounded-md p-1 text-[var(--muted)] transition hover:bg-black/5"
                title={isExpanded ? '收起详情' : '查看详情与更多操作'}
              >
                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {/* ── 展开区：变更详情 + 建议操作 ── */}
            {isExpanded && (
              <div className={cn('border-t px-3 pb-3 pt-2.5 space-y-2.5', style.banner)}>

                {/* 变更详情：商品信息 + 具体变化 */}
                <div className="rounded-md bg-white/70 px-3 py-2.5 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">变更内容</div>

                  {/* 如果涉及商品行，显示商品卡片 */}
                  {(() => {
                    const bef = change.before as Record<string, unknown> | undefined;
                    const aft = change.after  as Record<string, unknown> | undefined;
                    if (!bef?.lineItemId && !bef?.sku && !aft?.lineItemId && !aft?.sku) return null;
                    const lid = (bef?.lineItemId ?? aft?.lineItemId) as string | undefined;
                    const sku = (bef?.sku ?? aft?.sku) as string | undefined;
                    const item = lid ? lineItems.find(li => li.id === lid) : sku ? lineItems.find(li => li.sku === sku) : null;
                    const qBefore = bef?.quantity as number | undefined;
                    const qAfter  = aft?.quantity  as number | undefined;
                    return (
                      <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-2">
                        <div className="size-8 shrink-0 rounded-md bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">
                            {item?.title ?? sku ?? '商品'}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {item?.variantTitle && <span>{item.variantTitle} · </span>}
                            <span className="font-mono">{item?.sku ?? sku}</span>
                          </div>
                        </div>
                        {/* 数量变化 */}
                        {(qBefore !== undefined || qAfter !== undefined) && (
                          <div className="flex items-center gap-1.5 text-[12px] font-medium shrink-0">
                            {qBefore !== undefined && (
                              <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through">× {qBefore}</span>
                            )}
                            {qBefore !== undefined && qAfter !== undefined && (
                              <span className="text-[var(--muted)]">→</span>
                            )}
                            {qAfter !== undefined && (
                              <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">× {qAfter}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 地址变更：直接展示新旧地址 */}
                  {change.type === 'address_changed' && change.before && change.after && (() => {
                    const b = change.before as Record<string, unknown>;
                    const a = change.after  as Record<string, unknown>;
                    return (
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-md border border-red-100 bg-red-50/50 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-red-400 mb-1">原地址</div>
                        <div className="text-red-700 line-through opacity-70 leading-5">
                          {[b.address1, b.city, b.zip].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <div className="rounded-md border border-green-100 bg-green-50/50 px-2.5 py-2">
                        <div className="text-[10px] font-semibold text-green-500 mb-1">新地址</div>
                        <div className="text-green-700 font-medium leading-5">
                          {[a.address1, a.city, a.zip].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  {/* 渠道原始备注（折叠成小字） */}
                  {change.channelNote && (
                    <div className="text-[10px] text-[var(--muted)] font-mono pt-0.5 border-t border-[var(--border-subtle)]">
                      来源：{change.channelNote}
                    </div>
                  )}
                </div>

                {/* 建议操作：每个按钮后面带一句后果说明 */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">建议操作</div>
                  <div className="space-y-1">
                    {change.suggestions.map((s) => (
                      <div key={s.action} className="flex items-start gap-2.5 rounded-md bg-white/60 px-2.5 py-2">
                        <button
                          onClick={() => onHandle(change.id, s.action)}
                          className={cn(
                            'shrink-0 h-7 rounded-md px-3 text-[11px] font-semibold transition whitespace-nowrap',
                            s.variant === 'primary' && 'bg-[var(--primary)] text-white hover:opacity-90',
                            s.variant === 'danger'  && 'bg-[var(--danger)] text-white hover:opacity-90',
                            s.variant === 'default' && 'border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-subtle)]',
                          )}
                        >
                          {s.label}
                        </button>
                        {s.description && (
                          <span className="text-[11px] text-[var(--muted)] leading-5 pt-0.5">{s.description}</span>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                      <button
                        onClick={() => onIgnore(change.id)}
                        className="shrink-0 h-7 rounded-md border border-dashed border-[var(--border)] px-3 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                      >
                        忽略此变更
                      </button>
                      <span className="text-[11px] text-[var(--muted)]">不做任何处置，保持当前履约计划</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
