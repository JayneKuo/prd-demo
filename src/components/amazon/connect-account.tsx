'use client';

import { useState } from 'react';
import { buttonClass, primaryClass, inputClass, Field, Modal } from '@/components/amazon/amazon-ui';
import { useShellState } from '@/components/providers/shell-state-provider';
import { getMerchantsByCompany } from '@/lib/tenant-context';
import type { Connection } from '@/lib/amazon-connections';

export function ConnectAmazonAccount({ onClose, onSave }: { onClose: () => void; onSave: (connection: Connection, merchantId: string) => boolean }) {
  const { companyId, merchantScope } = useShellState();
  const merchants = getMerchantsByCompany(companyId);
  const [merchantId, setMerchantId] = useState(merchants.some((merchant) => merchant.id === merchantScope) ? merchantScope : '');
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState<Connection['identity']>('seller');
  const [region, setRegion] = useState('NA');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [id] = useState(() => crypto.randomUUID());
  return <Modal title="连接 Amazon 账号" onClose={() => { if (!busy) onClose(); }}><form className="space-y-5" onSubmit={(event) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !merchants.some((merchant) => merchant.id === merchantId)) { setError('请填写连接名称并选择所属商家'); return; }
    setBusy(true);
    try {
      const saved = onSave({ id, name: name.trim(), identity, region, accountId: `A${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`, authorized: true, businesses: {} }, merchantId);
      if (!saved) { setError('连接未保存，请检查存储权限后重试。输入已保留。'); setBusy(false); }
    } catch { setError('保存连接失败，输入已保留，请重试。'); setBusy(false); }
  }}>
    <p className="text-xs leading-5 text-[var(--muted)]">一个连接对应一个平台账号。同一商家可分别连接 Seller 和 Vendor。</p>
    <Field label="所属商家"><select required className={inputClass} value={merchantId} onChange={(event) => setMerchantId(event.target.value)}><option value="">选择当前公司下的商家</option>{merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}</select></Field>
    <Field label="连接名称"><input required maxLength={80} autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：北美 Seller 主账号" /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="账号身份"><select className={inputClass} value={identity} onChange={(e) => setIdentity(e.target.value as Connection['identity'])}><option value="seller">Seller · 卖家</option><option value="vendor">Vendor · 供应商</option></select></Field><Field label="区域"><select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}><option value="NA">北美 NA</option><option value="EU">欧洲 EU</option><option value="FE">远东 FE</option></select></Field></div>
    <p className="text-xs leading-5 text-[var(--muted)]">连接后可按需启用业务；此操作不会自动接单或发运。</p>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button type="button" className={buttonClass} disabled={busy} onClick={onClose}>取消</button><button type="submit" className={primaryClass} disabled={busy}>{busy ? '正在连接…' : '授权并连接'}</button></div>
  </form></Modal>;
}
