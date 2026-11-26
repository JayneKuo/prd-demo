'use client';
import { useEffect, useState } from 'react';
import { findVendorNodeMapping, readVendorNodeMappings, writeVendorNodeMapping, type VendorNodeScope, type VendorNodeMapping, type VendorAddress } from '@/lib/vendor-node-mappings';
import { Field, inputClass, buttonClass } from './amazon-ui';
export function VendorNodeEditor({ scope, warehouseId, onMapping }: { scope: VendorNodeScope; warehouseId: string; onMapping: (mapping: VendorNodeMapping | undefined) => void }) {
  const [node, setNode] = useState<VendorNodeMapping>({ ...scope, warehouseId, shipFromParty: { partyId: '', address: { name: '', addressLine1: '', city: '', stateOrRegion: '', postalCode: '', countryCode: 'US' } } });
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const found = findVendorNodeMapping(readVendorNodeMappings(localStorage, scope), scope, warehouseId);
      setNode(found ?? { ...scope, warehouseId, shipFromParty: { partyId: '', address: { name: '', addressLine1: '', city: '', stateOrRegion: '', postalCode: '', countryCode: 'US' } } });
      onMapping(found); setError('');
    } catch (error) { setError(String(error)); onMapping(undefined); }
    // Scope primitives intentionally control reloading; parent callback changes do not reload edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.companyId, scope.merchantScope, scope.connectionId, warehouseId]);
  if (!warehouseId) return <p className="text-xs text-[var(--muted)]">先选择本批次 OMS 来源仓，再维护此 Vendor 连接下的 Amazon 发货节点。</p>;
  return <fieldset className="space-y-3 rounded border border-[var(--border)] p-3"><legend className="px-1 text-sm">本仓外部发货节点映射</legend><p className="text-xs text-[var(--muted)]">将本批次来源仓关联当前 Vendor 账号登记的发货节点；不是账号固定发货仓。节点 ID 须与 Amazon 登记信息一致，不能使用 Vendor Code 替代。修改后保存即可继续当前批次。</p><Field label="Amazon shipFromParty.partyId"><input className={inputClass} value={node.shipFromParty.partyId} onChange={event => { onMapping(undefined); setNode({ ...node, shipFromParty: { ...node.shipFromParty, partyId: event.target.value } }); }} /></Field><div className="grid gap-3 sm:grid-cols-2">{(['name', 'addressLine1', 'city', 'stateOrRegion', 'postalCode', 'countryCode'] as const).map(key => <Field key={key} label={({ name: '节点名称', addressLine1: '街道地址', city: '城市', stateOrRegion: '州 / 省', postalCode: '邮编', countryCode: '国家代码' })[key]}><input className={inputClass} value={node.shipFromParty.address?.[key] ?? ''} onChange={event => { onMapping(undefined); setNode({ ...node, shipFromParty: { ...node.shipFromParty, address: { ...node.shipFromParty.address, [key]: event.target.value } as VendorAddress } }); }} /></Field>)}</div>{error && <p role="alert" className="text-xs text-[var(--danger)]">{error}</p>}<button className={buttonClass} onClick={() => { try { writeVendorNodeMapping(localStorage, node); onMapping(node); setError(''); } catch (error) { setError(String(error)); } }}>保存本仓节点映射</button></fieldset>;
}
