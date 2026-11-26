'use client';

import { useEffect, useState } from 'react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { connectionStorageKey, type Connection } from '@/lib/amazon-connections';
import { loadAmazonConnections } from '@/lib/amazon-sample-data';
import { advanceSyncTask } from '@/lib/amazon-sync';

export function useAmazonConnections() {
  const { companyId, merchantScope } = useShellState();
  const key = connectionStorageKey(companyId, merchantScope);
  const [snapshot, setSnapshot] = useState<{ key: string; connections: Connection[] }>({ key: '', connections: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    function load() {
      try {
        const loaded = loadAmazonConnections(companyId, merchantScope);
        let changed = false;
        const connections = loaded.map((connection) => {
          let updated = false;
          const businesses = { ...connection.businesses };
          for (const id of Object.keys(businesses) as (keyof typeof businesses)[]) {
            const config = businesses[id]!;
            if (!connection.authorized || config.status !== 'enabled') continue;
            const next = advanceSyncTask(config);
            if (next !== config) { businesses[id] = next; changed = true; updated = true; }
          }
          return updated ? { ...connection, businesses } : connection;
        });
        if (changed) localStorage.setItem(key, JSON.stringify({ connections }));
        setSnapshot((current) => current.key === key && JSON.stringify(current.connections) === JSON.stringify(connections) ? current : { key, connections });
        setError('');
      } catch {
        setSnapshot({ key: '', connections: [] });
        setError('无法读取连接数据。请检查浏览器存储；为保护原数据，当前不允许保存。');
      }
    }
    load();
    const timer = window.setInterval(load, 800);
    window.addEventListener('storage', load);
    window.addEventListener('amazon-connections-changed', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', load);
      window.removeEventListener('amazon-connections-changed', load);
    };
  }, [key]);
  function saveConnections(connections: Connection[]) {
    if (snapshot.key !== key) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify({ connections }));
      setSnapshot({ key, connections });
      setError('');
      window.dispatchEvent(new Event('amazon-connections-changed'));
      return true;
    } catch {
      setError('保存失败，请检查浏览器存储空间或权限。');
      return false;
    }
  }
  return { connections: snapshot.key === key ? snapshot.connections : [], ready: snapshot.key === key, saveConnections, error };
}
