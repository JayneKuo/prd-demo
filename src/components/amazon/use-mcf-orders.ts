'use client';

import { useEffect, useRef, useState } from 'react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { loadAmazonConnections } from '@/lib/amazon-sample-data';
import { commitMcfOrder, loadMcfSnapshot, mcfOrdersChangedEvent, mcfOrdersStorageKey, projectMcfOrder, type McfOrderRecord, type Snapshot } from '@/lib/mcf-orders';
import { resolveMcfPending, type McfOrder } from '@/lib/mcf-workflow';
import { getMerchantsByCompany, ALL_MERCHANTS_SCOPE } from '@/lib/tenant-context';
import { hasCapability } from '@/lib/permissions';
import { currentSession } from '@/lib/session-context';

type Bucket = { state: Snapshot; raw: string | null; error: string };
type View = { scope: string; records: McfOrderRecord[]; ready: boolean; error: string };

/** Shared list/detail adapter. Receipts resume from persisted deadlines on either route. */
export function useMcfOrders(allCompany = false) {
  const { companyId, merchantScope } = useShellState();
  const scope = `${companyId}:${allCompany ? ALL_MERCHANTS_SCOPE : merchantScope}`;
  const buckets = useRef(new Map<string, Bucket>());
  const [view, setView] = useState<View>({ scope: '', records: [], ready: false, error: '' });
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    buckets.current = new Map();
    setSaveError('');
    function reload() {
      const records: McfOrderRecord[] = [];
      const errors: string[] = [];
      if (!hasCapability(currentSession.role, 'orders:read')) {
        setView({ scope, records, ready: true, error: '当前角色无订单读取权限。' });
        return;
      }
      for (const merchant of getMerchantsByCompany(companyId).filter(m => allCompany || merchantScope === ALL_MERCHANTS_SCOPE || m.id === merchantScope)) {
        try {
          const connections = loadAmazonConnections(companyId, merchant.id).filter(c => c.identity === 'seller' && (c.businesses.sales || c.businesses.mcf));
          const key = mcfOrdersStorageKey(companyId, merchant.id);
          const bucket = loadMcfSnapshot(key, connections);
          if (bucket.error) errors.push(`${merchant.name}：${bucket.error}`);
          // Persist new/migrated fixtures once; list and detail must see the same records.
          const serialized = JSON.stringify(bucket.state);
          if (!bucket.error && serialized !== bucket.raw && hasCapability(currentSession.role, 'orders:write')) {
            if (localStorage.getItem(key) !== bucket.raw) throw new Error('履约记录已变化');
            localStorage.setItem(key, serialized);
            bucket.raw = serialized;
          } else if (!bucket.error && bucket.raw === null) {
            // Read-only sessions keep their initial fixture snapshot stable without writing.
            const previous = buckets.current.get(key);
            if (previous?.raw === null && !previous.error) bucket.state = previous.state;
          }
          // Same-turn actions and receipts use this exact snapshot, with compare-and-swap storage guards.
          for (const order of bucket.state.orders) {
            const connection = connections.find(c => c.id === order.connectionId);
            if (!connection) continue;
            const next = resolveMcfPending(order);
            if (next !== order && !bucket.error && connection.authorized && hasCapability(currentSession.role, 'orders:write')) {
              const result = commitMcfOrder(key, bucket.raw, bucket.state, next, order, connection);
              bucket.state = result.state;
              bucket.raw = result.raw;
            }
          }
          buckets.current.set(key, bucket);
          for (const order of bucket.state.orders) {
            const connection = connections.find(c => c.id === order.connectionId);
            if (connection) records.push({ order, connection, merchant, storageKey: key });
          }
        } catch {
          errors.push(`${merchant.name}：无法读取或更新履约记录，已有数据未清除。请检查存储后刷新。`);
        }
      }
      const error = errors.join(' ');
      setView(current => current.scope === scope && JSON.stringify([current.records, current.error]) === JSON.stringify([records, error]) ? current : { scope, records, ready: true, error });
    }
    reload();
    const timer = window.setInterval(reload, 500);
    window.addEventListener('storage', reload);
    window.addEventListener(mcfOrdersChangedEvent, reload);
    window.addEventListener('amazon-connections-changed', reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', reload);
      window.removeEventListener(mcfOrdersChangedEvent, reload);
      window.removeEventListener('amazon-connections-changed', reload);
    };
  }, [companyId, merchantScope, allCompany, scope]);

  function save(record: McfOrderRecord, next: McfOrder) {
    if (view.scope !== scope || !hasCapability(currentSession.role, 'orders:write') || !record.connection.authorized) return;
    const bucket = buckets.current.get(record.storageKey);
    if (!bucket || bucket.error) return;
    // Polling can refresh object identities without changing the order. Require identical data,
    // then use the current object for the repository's synchronous identity guard.
    const expected = bucket.state.orders.find(o => o.id === record.order.id);
    if (!expected || JSON.stringify(expected) !== JSON.stringify(record.order)) { setSaveError('订单已变化，请重新检查当前状态。'); return; }
    try {
      const result = commitMcfOrder(record.storageKey, bucket.raw, bucket.state, next, expected, record.connection);
      bucket.state = result.state;
      bucket.raw = result.raw;
      setSaveError('');
      window.dispatchEvent(new Event(mcfOrdersChangedEvent));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，此次操作未生效。请检查浏览器存储后刷新。');
    }
  }
  const records = view.scope === scope ? view.records : [];
  return { records, rows: records.map(projectMcfOrder), ready: view.scope === scope && view.ready, error: saveError || (view.scope === scope ? view.error : ''), save };
}
