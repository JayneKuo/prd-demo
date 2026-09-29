import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  DetailPageTemplate,
  DetailSectionCard,
  StatusTimeline,
  ChangeLog,
  type DetailSection,
  type TimelineEvent,
  type ChangeEntry
} from '@/components/admin/detail-panel';
import { MetadataPanel } from '@/components/admin/metadata-panel';

/* ─── Mock order data ─── */
const orderBasicInfo: DetailSection = {
  title: '基本信息',
  fields: [
    { label: '订单号', value: 'SO-20240615-001' },
    { label: '创建时间', value: '2024-06-15 09:32:18' },
    { label: '客户', value: '张明远' },
    { label: '联系方式', value: '138****7692' },
    { label: '渠道', value: 'Shopify' },
    { label: '订单状态', value: '处理中', isStatus: true },
    { label: '支付状态', value: '已支付', isStatus: true },
    { label: '履约状态', value: '待履约', isStatus: true }
  ]
};

const shippingInfo: DetailSection = {
  title: '物流信息',
  fields: [
    { label: '收件人', value: '张明远' },
    { label: '联系电话', value: '138-0000-7692' },
    { label: '收货地址', value: '上海市浦东新区陆家嘴环路 1000 号 25F', span: 2 },
    { label: '物流方式', value: '顺丰标快' },
    { label: '运单号', value: 'SF1234567890123' },
    { label: '预计到达', value: '2024-06-17' },
    { label: '运费', value: '¥ 15.00' }
  ]
};

/* ─── Product items ─── */
type OrderItem = {
  sku: string;
  name: string;
  spec: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

const orderItems: OrderItem[] = [
  { sku: 'SKU-A001', name: '无线蓝牙耳机 Pro', spec: '黑色 / 降噪版', quantity: 1, unitPrice: '¥ 899.00', subtotal: '¥ 899.00' },
  { sku: 'SKU-B023', name: '手机保护壳', spec: 'iPhone 15 / 透明', quantity: 2, unitPrice: '¥ 89.00', subtotal: '¥ 178.00' },
  { sku: 'SKU-C107', name: '数据线 Type-C 1.5m', spec: '白色', quantity: 3, unitPrice: '¥ 39.00', subtotal: '¥ 117.00' }
];

/* ─── Timeline events ─── */
const timelineEvents: TimelineEvent[] = [
  { time: '2024-06-15 09:32', title: '订单创建', description: '客户通过 Shopify 下单', status: 'completed' },
  { time: '2024-06-15 09:33', title: '支付成功', description: '微信支付 ¥ 2,380.00', status: 'completed' },
  { time: '2024-06-15 10:00', title: '订单确认', description: '系统自动确认，进入待履约', status: 'completed' },
  { time: '—', title: '仓库拣货', description: '等待仓库分配拣货任务', status: 'current' },
  { time: '—', title: '打包发货', status: 'pending' },
  { time: '—', title: '客户签收', status: 'pending' }
];

/* ─── Change log entries ─── */
const changeEntries: ChangeEntry[] = [
  {
    actor: '王小明',
    actorType: 'user',
    time: '2024-06-15 14:22',
    action: '修改收货地址',
    field: '收货地址',
    from: '陆家嘴环路 1000 号 25F',
    to: '张江路 100 号 3F'
  },
  {
    actor: '王小明',
    actorType: 'user',
    time: '2024-06-15 14:20',
    action: '修改商品数量',
    field: 'SKU-B023 数量',
    from: '1',
    to: '2'
  },
  {
    actor: '系统',
    actorType: 'system',
    time: '2024-06-15 10:00',
    action: '订单状态变更',
    field: '订单状态',
    from: '待处理',
    to: '处理中'
  },
  {
    actor: '支付网关',
    actorType: 'gateway',
    time: '2024-06-15 09:33',
    action: '支付回调确认',
    field: '支付状态',
    from: '待支付',
    to: '已支付'
  },
  {
    actor: '系统',
    actorType: 'system',
    time: '2024-06-15 09:32',
    action: '订单创建'
  }
];

/* ─── Page ─── */
export default function OrderDetailPage() {
  return (
    <DetailPageTemplate
      title="订单详情 SO-20240615-001"
      description="张明远 · Shopify · ¥ 2,380.00"
      actions={[
        { label: '编辑订单', variant: 'secondary' },
        { label: '取消订单', variant: 'secondary' },
        { label: '确认发货', variant: 'primary' }
      ]}
    >
      {/* Back link */}
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回订单列表
      </Link>

      {/* Main content + right sidebar */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Left: main content */}
        <div className="space-y-5">
          <DetailSectionCard section={orderBasicInfo} />

          {/* Product items table */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">商品明细</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5">SKU</th>
                    <th className="whitespace-nowrap px-4 py-2.5">商品名称</th>
                    <th className="whitespace-nowrap px-4 py-2.5">规格</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">数量</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">单价</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right">小计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {orderItems.map((item) => (
                    <tr key={item.sku} className="transition-colors hover:bg-[var(--surface-subtle)]">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--foreground)]">{item.sku}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground)]">{item.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{item.spec}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--foreground)]">{item.quantity}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--muted)]">{item.unitPrice}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--foreground)]">{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[var(--border)]">
                  <tr>
                    <td colSpan={4} />
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12px] font-medium uppercase text-[var(--muted-foreground)]">商品合计</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-medium text-[var(--foreground)]">¥ 1,194.00</td>
                  </tr>
                  <tr>
                    <td colSpan={4} />
                    <td className="whitespace-nowrap px-4 py-2 text-right text-[12px] font-medium uppercase text-[var(--muted-foreground)]">运费</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-[13px] text-[var(--muted)]">¥ 15.00</td>
                  </tr>
                  <tr>
                    <td colSpan={4} />
                    <td className="whitespace-nowrap px-4 py-2 text-right text-[12px] font-medium uppercase text-[var(--muted-foreground)]">优惠</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-[13px] text-[var(--success)]">- ¥ 100.00</td>
                  </tr>
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={4} />
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">订单总额</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-bold text-[var(--foreground)]">¥ 2,380.00</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <DetailSectionCard section={shippingInfo} />
          <StatusTimeline events={timelineEvents} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <MetadataPanel
            title="订单摘要"
            items={[
              { label: '订单状态', value: '处理中' },
              { label: '支付方式', value: '微信支付' },
              { label: '支付时间', value: '2024-06-15 09:33' },
              { label: '商品数量', value: '6 件' },
              { label: '订单来源', value: 'Shopify' },
              { label: '客服备注', value: '无' }
            ]}
          />
          <ChangeLog entries={changeEntries} />
        </div>
      </div>
    </DetailPageTemplate>
  );
}
