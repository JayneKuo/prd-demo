'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { BusinessOptions } from './business-options';
import { buttonClass, primaryClass, inputClass, Field, Panel } from './amazon-ui';
import { businessDefinitions, defaultBusinessConfig, validateBusinessConfig, type Connection, type BusinessConfig, type BusinessId } from '@/lib/amazon-connections';
import { defaultSyncSettings } from '@/lib/amazon-sync';
import { getMappingSummary } from '@/lib/channel-sku-mappings';
import { warehouses } from '@/lib/mock-data/warehouses';

const sites: Record<string, string[]> = { NA: ['US', 'CA', 'MX'], EU: ['UK', 'DE', 'FR'], FE: ['JP', 'AU', 'SG'] };
type SyncSettings = NonNullable<BusinessConfig['syncSettings']>;
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-start gap-3 py-3"><input className="mt-1 size-4 accent-[var(--primary)]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span></span></label>;
}
export function ConfigureBusiness({ connection, businessId, onClose, onSave, onPersist }: { connection: Connection; businessId: BusinessId; onClose: () => void; onSave: (config: BusinessConfig) => boolean; onPersist: (config: BusinessConfig) => boolean }) {
  const router = useRouter();
  const { companyId, merchantScope } = useShellState();
  const [config, setConfig] = useState<BusinessConfig>(() => {
    const saved = connection.businesses[businessId] ?? defaultBusinessConfig();
    const { productMappings: _legacyMappings, ...rest } = saved;
    return { ...rest, warehouse: businessId === 'df' ? saved.warehouse : '', rule: 'manual', syncSettings: { ...defaultSyncSettings(businessId), ...saved.syncSettings } };
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState({ mapped: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const definition = businessDefinitions.find((business) => business.id === businessId)!;
  const settings = config.syncSettings!;
  const set = <K extends keyof BusinessConfig>(key: K, value: BusinessConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const sync = <K extends keyof SyncSettings>(key: K, value: SyncSettings[K]) => setConfig((current) => ({ ...current, syncSettings: { ...current.syncSettings!, [key]: value } }));
  useEffect(() => {
    const load = () => {
      if (!config.site) { setSummary({ mapped: 0, total: 0 }); return; }
      try { setSummary(getMappingSummary(companyId, merchantScope, connection, config.site)); }
      catch { setErrors(['商品映射读取失败，请检查映射模块后重试。']); }
    };
    load();
    window.addEventListener('channel-sku-mappings-changed', load);
    return () => window.removeEventListener('channel-sku-mappings-changed', load);
  }, [companyId, merchantScope, connection, config.site]);
  const hasOrders = ['sales', 'wholesale', 'df'].includes(businessId);
  function save(enable: boolean) {
    if (saving) return;
    const checked = { ...config, mappingConfirmed: businessId === 'df' ? Boolean(config.reference.trim() && warehouses.some((warehouse) => warehouse.id === config.warehouse && warehouse.active)) : summary.mapped > 0 };
    const problems = enable ? validateBusinessConfig(checked, connection, businessId) : [];
    if (enable && businessId === 'df' && !checked.mappingConfirmed) problems.push('请关联可用的 DF 外部履约节点');
    if (enable && settings.publishInventory && summary.mapped === 0) problems.push('发布库存前至少完成一项商品映射');
    if (enable && businessId === 'mcf' && settings.orderSources.length === 0) problems.push('请选择允许使用 MCF 的订单来源');
    setErrors(problems);
    if (problems.length) return;
    setSaving(true);
    const now = new Date().toISOString();
    const next: BusinessConfig = enable ? { ...checked, status: 'enabled', syncTask: { status: 'queued', startedAt: now } } : { ...checked, status: config.status === 'enabled' ? 'enabled' : 'draft' };
    const ok = enable ? onSave(next) : onPersist(next);
    if (!ok) { setErrors(['配置保存失败，输入已保留，请重试。']); setSaving(false); }
    else if (!enable) onClose();
  }
  const mappingHref = `/dashboard/product-mapping?${new URLSearchParams({ amazonConnection: connection.id, amazonBusiness: businessId, site: config.site, returnTo: 'amazon' })}`;
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); save(true); }}>
    <header className="border-b border-[var(--border)] pb-5"><button type="button" className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--muted)]" onClick={onClose}><ArrowLeft size={14} /> {connection.name} / 业务能力</button><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">配置{definition.name}</h1><p className="mt-1 text-sm text-[var(--muted)]">{connection.name} · {connection.identity === 'seller' ? 'Seller' : 'Vendor'} · {connection.region}</p></div><button type="submit" disabled={saving || !connection.authorized} className={primaryClass}>{saving ? '正在保存…' : '保存并启用'}</button></div></header>
    {errors.length > 0 && <ul role="alert" className="list-inside list-disc text-sm leading-6 text-[var(--danger)]">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-5">
      <Panel title="业务范围"><div className="grid gap-4 sm:grid-cols-2"><Field label="适用站点"><select className={inputClass} value={config.site} onChange={(event) => set('site', event.target.value)}><option value="">请选择</option>{sites[connection.region].map((site) => <option key={site}>{site}</option>)}</select></Field>{connection.identity === 'vendor' && <Field label={businessId === 'df' ? 'Vendor 账号' : 'Vendor Code'}><input className={inputClass} value={businessId === 'df' ? connection.accountId : config.reference} readOnly={businessId === 'df'} onChange={(event) => set('reference', event.target.value)} /></Field>}</div><div className="mt-5 border-t border-[var(--border)] pt-5"><BusinessOptions businessId={businessId} value={config.options} onChange={(value) => set('options', value)} /></div></Panel>
      <Panel title="订单及数据同步"><div className="grid gap-4 sm:grid-cols-2"><Field label="首次同步起始日期"><input type="date" className={inputClass} value={config.syncFrom} onChange={(event) => set('syncFrom', event.target.value)} /></Field></div><div className="mt-3 divide-y divide-[var(--border-subtle)]">{hasOrders && <><Toggle label="接收新订单" description={businessId === 'sales' ? '接收所选站点及履约范围的销售订单。' : businessId === 'wholesale' ? '按 Vendor 主体接收采购供货订单及行明细。' : '按已映射的 DF 节点接收直发订单。'} checked={settings.receiveOrders} onChange={(value) => sync('receiveOrders', value)} /><Toggle label="补入未完成订单" description="首次连接时补入仍需处理的订单；按平台可用历史范围分批读取。" checked={settings.includeOpenOrders} onChange={(value) => sync('includeOpenOrders', value)} /></>}<Toggle label="跟踪已有业务的状态变更" description="持续接收订单、货件或配送任务的变更，取消和异常不会因停止接收新单而丢失。" checked={settings.receiveChanges} onChange={(value) => sync('receiveChanges', value)} />{['sales', 'mcf', 'fba'].includes(businessId) && <Toggle label="读取 FBA 库存" description="读取平台可售、预留等库存数据；仅查询，不改变平台可售量。" checked={settings.readInventory} onChange={(value) => sync('readInventory', value)} />}{businessId === 'fba' && <Toggle label="同步已有入仓计划" description="跟踪已有计划、货件及收货状态；创建和运输方案仍在具体计划内处理。" checked={settings.receiveExistingPlans} onChange={(value) => sync('receiveExistingPlans', value)} />}</div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">基础订单、商品数量、金额币种、履约要求及接口允许的收件信息由系统完整获取；敏感信息按授权范围读取。分页、限流、增量游标、通知与补拉由系统处理。</p></Panel>
      <Panel title="库存发布与业务回传"><div className="divide-y divide-[var(--border-subtle)]">{['sales', 'df'].includes(businessId) && <><Toggle label="允许发布可售库存" description="库存读取与发布独立。未匹配商品不发布；当前仅允许人工确认发布，不自动批量覆盖。" checked={settings.publishInventory} onChange={(value) => sync('publishInventory', value)} />{settings.publishInventory && <p className="py-3 text-xs leading-5 text-[var(--warning)]">启用后仅开放库存发布能力，不立即更新平台库存。每次发布仍需核对数量与节点。</p>}</>}{hasOrders && <Toggle label={businessId === 'wholesale' ? '允许回传 PO 确认、Routing 与 ASN' : '允许回传发货确认'} description="只开放操作能力，不自动接单或发运；在业务单据中人工提交并跟踪回执。" checked={settings.shipmentWriteback} onChange={(value) => sync('shipmentWriteback', value)} />}{businessId === 'mcf' && <div className="py-3"><h3 className="text-sm font-medium">允许使用 MCF 的订单来源</h3><div className="mt-3 flex flex-wrap gap-5">{[{ id: 'amazon', label: 'Amazon MFN 订单' }, { id: 'other', label: '其他渠道订单' }].map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.orderSources.includes(item.id as 'amazon' | 'other')} onChange={(event) => sync('orderSources', event.target.checked ? [...settings.orderSources, item.id as 'amazon' | 'other'] : settings.orderSources.filter((source) => source !== item.id))} />{item.label}</label>)}</div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">库存、地址和送达时效在每单预览时校验。结果未知或取消待回执时不允许重复建单。</p></div>}{businessId === 'fba' && <p className="py-3 text-sm text-[var(--muted)]">入仓计划、装箱、分仓及运输确认在补货单据中提交，不在账号配置中自动执行。</p>}</div></Panel>
      <Panel title="关联资料与异常通知"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-medium">渠道 SKU ↔ OMS SKU</h3><p className="mt-1 text-xs text-[var(--muted)]">统一由商品映射模块维护，当前站点 {summary.mapped} / {summary.total} 项已匹配。</p></div><button type="button" disabled={!config.site || saving} className={buttonClass} onClick={() => { if (onPersist(config)) router.push(mappingHref); }}>管理商品映射</button></div><p className="mt-3 text-xs text-[var(--muted)]">未匹配不阻断订单接收，相关订单进入待匹配，不自动履约或发布库存。</p>{businessId === 'df' && <div className="mt-5 border-t border-[var(--border)] pt-5"><h3 className="mb-3 text-sm font-medium">DF 外部履约节点</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="DF Warehouse ID"><input className={inputClass} value={config.reference} onChange={(event) => set('reference', event.target.value)} /></Field><Field label="对应 OMS 履约节点"><select className={inputClass} value={config.warehouse} onChange={(event) => set('warehouse', event.target.value)}><option value="">请选择</option>{warehouses.filter((warehouse) => warehouse.active).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></Field></div><p className="mt-3 text-xs text-[var(--muted)]">DF 以该外部节点识别订单与库存，不用于普通自配送订单固定选仓。</p></div>}<div className="mt-4 border-t border-[var(--border)]"><Toggle label="接收同步及回传异常通知" description="通知发送至当前商家消息中心；失败项可从同步与运行查看。" checked={settings.notifyOnError} onChange={(value) => sync('notifyOnError', value)} /></div></Panel>
    </div><aside className="space-y-4 lg:sticky lg:top-5"><Panel title="启用后如何工作"><ol className="space-y-4 text-sm"><li>1. 后台执行首次同步，不需要再次确认。</li><li>2. 在业务能力和同步记录中查看结果。</li><li>3. 订单与履约仍按单据人工处理。</li></ol><p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">{businessId === 'df' ? 'DF 必须完成外部节点映射。' : businessId === 'mcf' ? '使用 Amazon 库存，不选择自有仓。' : '账号不固定发货仓，来源仓在订单或补货计划中确定。'}</p></Panel></aside></div>
    <footer className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button type="button" className={buttonClass} disabled={saving} onClick={onClose}>取消</button><button type="button" className={buttonClass} disabled={saving} onClick={() => save(false)}>保存草稿</button><button type="submit" className={primaryClass} disabled={saving || !connection.authorized}>{saving ? '正在保存…' : '保存并启用'}</button></footer>
  </form>;
}
