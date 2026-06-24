import { ListPageTemplate } from '@/components/archetypes/list-page-template';
import { FilterBar, type FilterConfig, type ActiveFilter } from '@/components/admin/filter-bar';
import { BatchActionBar } from '@/components/admin/batch-action-bar';
import { MetadataPanel } from '@/components/admin/metadata-panel';
import type { TableColumn } from '@/components/admin/data-table-shell';

/* ─── Types ─── */
type OrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  amount: string;
  items: string;
  channel: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  orderStatus: string;
  createdAt: string;
};

/* ─── Column definitions ─── */
const orderColumns: TableColumn<OrderRow>[] = [
  { key: 'orderNo', label: '订单号' },
  { key: 'customer', label: '客户' },
  { key: 'amount', label: '金额' },
  { key: 'items', label: '商品数' },
  { key: 'channel', label: '渠道' },
  { key: 'paymentStatus', label: '支付状态', isStatus: true },
  { key: 'fulfillmentStatus', label: '履约状态', isStatus: true },
  { key: 'orderStatus', label: '订单状态', isStatus: true },
  { key: 'createdAt', label: '创建时间' }
];

/* ─── Filter definitions ─── */
const orderFilters: FilterConfig[] = [
  {
    key: 'orderStatus',
    label: '订单状态',
    options: [
      { label: '待处理', value: '待处理' },
      { label: '处理中', value: '处理中' },
      { label: '已完成', value: '已完成' },
      { label: '已取消', value: '已取消' },
      { label: '挂起', value: '挂起' }
    ]
  },
  {
    key: 'paymentStatus',
    label: '支付状态',
    options: [
      { label: '已支付', value: '已支付' },
      { label: '待支付', value: '待支付' },
      { label: '已退款', value: '已退款' },
      { label: '部分退款', value: '部分退款' }
    ]
  },
  {
    key: 'fulfillmentStatus',
    label: '履约状态',
    options: [
      { label: '待履约', value: '待履约' },
      { label: '履约中', value: '履约中' },
      { label: '已发货', value: '已发货' },
      { label: '已签收', value: '已签收' },
      { label: '部分履约', value: '部分履约' }
    ]
  },
  {
    key: 'channel',
    label: '渠道',
    options: [
      { label: 'Shopify', value: 'shopify' },
      { label: 'Amazon', value: 'amazon' },
      { label: 'TikTok Shop', value: 'tiktok' },
      { label: '线下', value: 'offline' }
    ]
  }
];

/* ─── Mock data ─── */
const orderRows: OrderRow[] = [
  { id: 'SO-20240615-001', orderNo: 'SO-20240615-001', customer: '张明远', amount: '¥ 2,380.00', items: '3', channel: 'Shopify', paymentStatus: '已支付', fulfillmentStatus: '待履约', orderStatus: '处理中', createdAt: '2024-06-15 09:32' },
  { id: 'SO-20240615-002', orderNo: 'SO-20240615-002', customer: 'Sarah Chen', amount: '¥ 15,600.00', items: '8', channel: 'Amazon', paymentStatus: '已支付', fulfillmentStatus: '履约中', orderStatus: '处理中', createdAt: '2024-06-15 10:15' },
  { id: 'SO-20240614-003', orderNo: 'SO-20240614-003', customer: '李婷', amount: '¥ 890.00', items: '1', channel: 'TikTok Shop', paymentStatus: '待支付', fulfillmentStatus: '待履约', orderStatus: '待处理', createdAt: '2024-06-14 16:42' },
  { id: 'SO-20240614-004', orderNo: 'SO-20240614-004', customer: 'Mike Johnson', amount: '¥ 4,250.00', items: '5', channel: 'Shopify', paymentStatus: '已支付', fulfillmentStatus: '已发货', orderStatus: '处理中', createdAt: '2024-06-14 11:08' },
  { id: 'SO-20240613-005', orderNo: 'SO-20240613-005', customer: '王芳', amount: '¥ 1,120.00', items: '2', channel: '线下', paymentStatus: '已支付', fulfillmentStatus: '已签收', orderStatus: '已完成', createdAt: '2024-06-13 14:20' },
  { id: 'SO-20240613-006', orderNo: 'SO-20240613-006', customer: '赵阳', amount: '¥ 6,780.00', items: '4', channel: 'Amazon', paymentStatus: '已退款', fulfillmentStatus: '待履约', orderStatus: '已取消', createdAt: '2024-06-13 09:55' },
  { id: 'SO-20240612-007', orderNo: 'SO-20240612-007', customer: 'Emily Liu', amount: '¥ 3,990.00', items: '6', channel: 'Shopify', paymentStatus: '部分退款', fulfillmentStatus: '部分履约', orderStatus: '挂起', createdAt: '2024-06-12 17:30' }
];

/* ─── Active filter demo ─── */
const activeFilters: ActiveFilter[] = [
  { key: 'orderStatus', value: '处理中' }
];

/* ─── Page ─── */
export default function AdminOrdersPage() {
  return (
    <div className="space-y-4">
      <ListPageTemplate
        title="销售订单"
        description="查看全部销售订单，跟踪支付与履约进度，处理异常与退换货。"
        actions={[
          { label: '导出', variant: 'secondary' },
          { label: '创建订单', variant: 'primary' }
        ]}
        tabs={['全部', '待处理', '处理中', '已完成', '异常']}
        activeTab="全部"
        searchPlaceholder="搜索订单号、客户名、渠道..."
        columns={orderColumns}
        rows={orderRows}
        rowHref={(row) => `/admin/orders/${row.id}`}
      />

      {/* Filter Bar 演示 */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <FilterBar
          filters={orderFilters}
          activeFilters={activeFilters}
        />
      </div>

      {/* Batch Action Bar 演示 */}
      <BatchActionBar
        selectedCount={3}
        actions={[
          { label: '批量发货', variant: 'primary' },
          { label: '标记已完成', variant: 'secondary' },
          { label: '批量取消', variant: 'danger' }
        ]}
      />

      {/* Summary metadata */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">运营提示</div>
          <div className="mt-3 space-y-2 text-[13px] text-[var(--foreground)]">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">3 个订单等待支付确认超过 24 小时。</div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">1 个订单因库存不足挂起，需手动处理。</div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">今日已完成发货 12 单，待发货 5 单。</div>
          </div>
        </div>
        <MetadataPanel
          title="订单统计"
          items={[
            { label: '今日新增', value: '24' },
            { label: '待处理', value: '7' },
            { label: '处理中', value: '12' },
            { label: '本周完成', value: '89' },
            { label: '异常订单', value: '3' }
          ]}
        />
      </div>
    </div>
  );
}
