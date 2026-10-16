export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusMap: Record<string, { label: string; variant: StatusVariant }> = {
  // Order status
  '待处理': { label: '待处理', variant: 'info' },
  '处理中': { label: '处理中', variant: 'info' },
  '挂起': { label: '挂起', variant: 'warning' },
  '已完成': { label: '已完成', variant: 'success' },
  '已取消': { label: '已取消', variant: 'neutral' },
  '已关闭': { label: '已关闭', variant: 'neutral' },

  // Inbound status
  '待入库': { label: '待入库', variant: 'neutral' },
  '入库中': { label: '入库中', variant: 'info' },
  '已入库': { label: '已入库', variant: 'success' },
  '待收货': { label: '待收货', variant: 'neutral' },
  '收货中': { label: '收货中', variant: 'info' },
  '质检中': { label: '质检中', variant: 'info' },
  '质检通过': { label: '质检通过', variant: 'success' },
  '质检不通过': { label: '质检不通过', variant: 'danger' },
  '上架中': { label: '上架中', variant: 'info' },
  '已上架': { label: '已上架', variant: 'success' },
  '待质检': { label: '待质检', variant: 'neutral' },

  // Outbound status
  '待出库': { label: '待出库', variant: 'neutral' },
  '出库中': { label: '出库中', variant: 'info' },
  '已出库': { label: '已出库', variant: 'success' },
  '库位缺货': { label: '库位缺货', variant: 'danger' },
  '商品破损': { label: '商品破损', variant: 'danger' },
  '订单取消': { label: '订单取消', variant: 'neutral' },

  // WMS status
  '待作业': { label: '待作业', variant: 'neutral' },
  '验货复核': { label: '验货复核', variant: 'info' },
  '打包称重': { label: '打包称重', variant: 'info' },
  '异常挂起': { label: '异常挂起', variant: 'danger' },

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

  // AR / AP status (Finance module)
  '待审批':     { label: '待审批',     variant: 'warning' },
  '已审批':     { label: '已审批',     variant: 'info' },
  '待付款':     { label: '待付款',     variant: 'info' },
  '已付款':     { label: '已付款',     variant: 'success' },
  '逾期':       { label: '逾期',       variant: 'danger' },
  '有争议':     { label: '有争议',     variant: 'danger' },
  // Channel AR status
  '待到账':     { label: '待到账',     variant: 'info' },
  '已到账':     { label: '已到账',     variant: 'success' },
  '差异':       { label: '差异',       variant: 'warning' },
  '已核销':     { label: '已核销',     variant: 'neutral' },
  // AR Aging status
  '未到期':     { label: '未到期',     variant: 'success' },
  '逾期1-30天':  { label: '逾期1-30天',  variant: 'warning' },
  '逾期31-60天': { label: '逾期31-60天', variant: 'warning' },
  '逾期61-90天': { label: '逾期61-90天', variant: 'danger' },
  '逾期90天+':   { label: '逾期90天+',   variant: 'danger' },
  '已收款':     { label: '已收款',     variant: 'neutral' },
  // ERP sync status
  '已同步':     { label: '已同步',     variant: 'success' },
  '待同步':     { label: '待同步',     variant: 'warning' },
  '同步失败':   { label: '同步失败',   variant: 'danger' },

  // Product status
  '草稿': { label: '草稿', variant: 'neutral' },
  '已发布': { label: '已发布', variant: 'success' },
  '下架': { label: '下架', variant: 'neutral' },
  '审核中': { label: '审核中', variant: 'warning' },

  // Channel publish status
  '未发布': { label: '未发布', variant: 'neutral' },
  '发布中': { label: '发布中', variant: 'info' },
  '发布失败': { label: '发布失败', variant: 'danger' },
  '已下架': { label: '已下架', variant: 'neutral' },

  // Publish log status
  '成功': { label: '成功', variant: 'success' },
  '失败': { label: '失败', variant: 'danger' },

  // Carrier / Mapping status
  '启用': { label: '启用', variant: 'success' },
  '停用': { label: '停用', variant: 'neutral' },
  '已映射': { label: '已映射', variant: 'success' },
  '未映射': { label: '未映射', variant: 'warning' },
  '已失效': { label: '已失效', variant: 'danger' },

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
