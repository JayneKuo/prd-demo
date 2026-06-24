export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusMap: Record<string, { label: string; variant: StatusVariant }> = {
  // Order status
  '待处理': { label: '待处理', variant: 'info' },
  '处理中': { label: '处理中', variant: 'info' },
  '挂起': { label: '挂起', variant: 'warning' },
  '已完成': { label: '已完成', variant: 'success' },
  '已取消': { label: '已取消', variant: 'neutral' },
  '已关闭': { label: '已关闭', variant: 'neutral' },

  // Fulfillment status
  '待生成': { label: '待生成', variant: 'neutral' },
  '待履约': { label: '待履约', variant: 'neutral' },
  '未开始': { label: '未开始', variant: 'neutral' },
  '已生成': { label: '已生成', variant: 'info' },
  '履约中': { label: '履约中', variant: 'info' },
  '部分履约': { label: '部分履约', variant: 'warning' },
  '已暂停': { label: '已暂停', variant: 'warning' },
  '库存不足': { label: '库存不足', variant: 'danger' },
  '找不到仓库': { label: '找不到仓库', variant: 'danger' },
  '合规审查': { label: '合规审查', variant: 'warning' },
  '投递失败': { label: '投递失败', variant: 'danger' },
  '拣货中': { label: '拣货中', variant: 'info' },
  '待发货': { label: '待发货', variant: 'neutral' },
  '已发货': { label: '已发货', variant: 'info' },
  '已签收': { label: '已签收', variant: 'success' },

  // Payment status
  '已支付': { label: '已支付', variant: 'success' },
  '待支付': { label: '待支付', variant: 'warning' },
  '待确认': { label: '待确认', variant: 'warning' },
  '已退款': { label: '已退款', variant: 'neutral' },
  '部分退款': { label: '部分退款', variant: 'warning' },

  // English fallbacks
  'paid': { label: 'Paid', variant: 'success' },
  'completed': { label: 'Completed', variant: 'success' },
  'processing': { label: 'Processing', variant: 'info' },
  'pending': { label: 'Pending', variant: 'info' },
  'scheduled': { label: 'Scheduled', variant: 'info' },
  'hold': { label: 'Hold', variant: 'warning' },
  'review': { label: 'Review', variant: 'warning' },
  'delayed': { label: 'Delayed', variant: 'warning' },
  'failed': { label: 'Failed', variant: 'danger' },
  'blocked': { label: 'Blocked', variant: 'danger' },
  'exception': { label: 'Exception', variant: 'danger' },
  'cancelled': { label: 'Cancelled', variant: 'neutral' },

  // Inventory
  'available': { label: 'Available', variant: 'success' },
  'active': { label: 'Active', variant: 'success' },
  'healthy': { label: 'Healthy', variant: 'success' },
  'reserved': { label: 'Reserved', variant: 'info' },
  'low stock': { label: 'Low Stock', variant: 'warning' },
  'out of stock': { label: 'Out of Stock', variant: 'danger' }
};

export function mapStatusToBadge(status: string): { label: string; variant: StatusVariant } {
  const direct = statusMap[status];
  if (direct) return direct;

  const normalized = status.toLowerCase();
  const lower = statusMap[normalized];
  if (lower) return lower;

  return { label: status, variant: 'neutral' };
}
