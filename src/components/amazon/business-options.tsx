'use client';

import { Field, inputClass } from './amazon-ui';
import type { BusinessConfig, BusinessId } from '@/lib/amazon-connections';

export function BusinessOptions({ businessId, value = {}, onChange }: { businessId: BusinessId; value: NonNullable<BusinessConfig['options']> | undefined; onChange: (value: NonNullable<BusinessConfig['options']>) => void }) {
  const set = <K extends keyof NonNullable<BusinessConfig['options']>>(key: K, next: NonNullable<BusinessConfig['options']>[K]) => onChange({ ...value, [key]: next });
  return <div className="space-y-4"><h3 className="text-sm font-semibold">业务参数</h3><div className="grid gap-4 sm:grid-cols-2">
    {businessId === 'sales' && <Field label="订单同步范围"><select className={inputClass} value={value.orderChannels ?? 'all'} onChange={(e) => set('orderChannels', e.target.value as 'all' | 'mfn' | 'afn')}><option value="all">全部 · AFN 与 MFN</option><option value="mfn">仅自配送 MFN</option><option value="afn">仅亚马逊配送 AFN</option></select></Field>}
    {businessId === 'mcf' && <><Field label="默认配送服务等级"><select className={inputClass} value={value.mcfService ?? 'Standard'} onChange={(e) => set('mcfService', e.target.value as 'Standard' | 'Expedited' | 'Priority')}><option>Standard</option><option>Expedited</option><option>Priority</option></select></Field><p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">实际可用服务、费用和送达日期以每次履约预览为准。结果未知时不允许重复建单。</p></>}
    {businessId === 'fba' && <p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">来源仓、发货地址、预处理、贴标、装箱和运输方案在每张补货计划中确定，不在账号层固定。</p>}
    {businessId === 'wholesale' && <><Field label="PO 确认方式"><select className={inputClass} value="manual" onChange={(e) => set('acknowledgement', e.target.value as 'manual' | 'auto')}><option value="manual">人工逐行确认</option></select></Field><Field label="结算方式"><select className={inputClass} value={value.vendorPayment ?? 'invoice'} onChange={(e) => set('vendorPayment', e.target.value as 'invoice' | 'ers')}><option value="invoice">供应商开票</option><option value="ers">ERS（需合同支持）</option></select></Field><p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">Vendor Code 标识供货主体，不是仓库代码。Collect / Prepaid 与目的 DC 以订单及路由指令为准。</p></>}
    {businessId === 'df' && <><Field label="库存更新方式"><select className={inputClass} value={value.inventoryMode ?? 'incremental'} onChange={(e) => set('inventoryMode', e.target.value as 'incremental' | 'full')}><option value="incremental">增量 · 仅更新本次商品</option><option value="full">全量 · 未包含商品将不可用</option></select></Field><Field label="面单格式"><select className={inputClass} value={value.dfLabelFormat ?? 'PDF'} onChange={(e) => set('dfLabelFormat', e.target.value as 'PDF' | 'ZPL')}><option>PDF</option><option>ZPL</option></select></Field>{value.inventoryMode === 'full' && <p className="text-xs leading-5 text-[var(--danger)] sm:col-span-2">全量更新须覆盖该 DF 仓库全部商品，遗漏商品将被标记为不可用。</p>}</>}
  </div></div>;
}
