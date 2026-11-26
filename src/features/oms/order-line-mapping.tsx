'use client';

import { useState } from 'react';
import { useOms } from './provider';
import { mockProducts } from '@/lib/mock-data/products';
import { buttonClass, inputClass, Modal, Field } from '@/components/amazon/amazon-ui';
import type { OrderLine, SalesOrder } from './types';
export function OrderLineMapping({ order, line }: { order: SalesOrder; line: OrderLine }) {
  const { execute } = useOms();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState(line.omsVariantId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (line.mappingSnapshot && line.omsVariantId) return null;
  return <><button type="button" className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline" onClick={() => setOpen(true)}>关联 OMS SKU</button>{open && <Modal title="关联订单商品" onClose={() => { if (!busy) setOpen(false); }}><form className="space-y-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await execute(order.merchantId, { type: 'map_order_line', orderId: order.id, lineId: line.id, variantId: variant }); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : '映射未保存'); } finally { setBusy(false); } }}><p className="text-sm">渠道 SKU：{line.channelSku || line.sku}</p><Field label="OMS 商品"><select required aria-label="选择 OMS SKU" className={inputClass} value={variant} onChange={event => setVariant(event.target.value)}><option value="">请选择</option>{mockProducts.flatMap(product => product.variants.map(item => <option key={item.id} value={item.id}>{item.sku} · {product.title}</option>))}</select></Field><p className="text-xs text-[var(--muted)]">保留渠道商品标识和订购数量，保存后继续本订单的库存分配。</p>{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => setOpen(false)}>取消</button><button className={buttonClass} disabled={busy || !variant}>{busy ? '正在保存…' : '保存并继续'}</button></div></form></Modal>}</>;
}
