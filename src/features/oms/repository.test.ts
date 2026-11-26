import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type OmsSnapshot, type Scope } from './types';
import { assertOmsSnapshot, MemoryOmsRepository, omsChangedEvent, readOmsSnapshot, transactOms } from './repository';

const scope: Scope = { tenantId: 'tenant_acme', companyId: 'company_northwind', merchantId: 'merchant_us_shopify' };
afterEach(() => vi.unstubAllGlobals());

describe('MemoryOmsRepository', () => {
  it('serializes concurrent updates and changes revisions only for actual changes', async () => {
    const repository = new MemoryOmsRepository(emptySnapshot);
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => repository.transact(scope, s => ({ ...s, commandIds: [...s.commandIds, String(i)] }))));
    expect(results.map(s => s.revision)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const unchanged = await repository.transact(scope, s => ({ ...s, revision: 999 }));
    expect(unchanged.revision).toBe(30);
    expect(unchanged.commandIds).toHaveLength(30);
  });
  it('returns detached snapshots, rolls back failed mutations, and remains usable', async () => {
    const repository = new MemoryOmsRepository(emptySnapshot);
    const first = await repository.read(scope);
    first.commandIds.push('not persisted');
    await expect(repository.transact(scope, s => { s.commandIds.push('aborted'); throw new Error('stop'); })).rejects.toThrow('stop');
    expect((await repository.read(scope)).commandIds).toEqual([]);
    await expect(repository.transact(scope, s => ({ ...s, tenantId: 'other' }))).rejects.toThrow('corrupt');
    expect((await repository.read(scope)).revision).toBe(0);
  });
  it('isolates merchants and rejects aggregate, unknown and cross-company scope', async () => {
    const repository = new MemoryOmsRepository(emptySnapshot);
    await repository.transact(scope, s => ({ ...s, commandIds: ['one'] }));
    expect((await repository.read({ ...scope, merchantId: 'merchant_us_amazon' })).commandIds).toEqual([]);
    for (const invalid of [{ ...scope, merchantId: 'all' }, { ...scope, tenantId: 'bad' }, { ...scope, companyId: 'company_contoso' }]) {
      await expect(repository.read(invalid)).rejects.toThrow('concrete');
    }
  });
  it('does not replace corrupt initial state or allow asynchronous mutations', async () => {
    const initialize = vi.fn(() => ({ ...emptySnapshot(scope), orders: null }) as never);
    const repository = new MemoryOmsRepository(initialize);
    await expect(repository.read(scope)).rejects.toThrow('corrupt');
    await expect(repository.read(scope)).rejects.toThrow('corrupt');
    const healthy = new MemoryOmsRepository(emptySnapshot);
    await expect(healthy.transact(scope, (async (s: OmsSnapshot) => s) as never)).rejects.toThrow('synchronous');
    expect((await healthy.read(scope)).revision).toBe(0);
  });
  it('rejects malformed entity quantities and scoped rows', () => {
    const value = emptySnapshot(scope);
    value.stocks.push({ ...scope, id: 's', revision: 0, warehouseId: 'w', sku: 'sku', pool: 'warehouse', onHand: 3, reserved: 4, unfulfillable: 0 });
    expect(() => assertOmsSnapshot(value, scope)).toThrow('corrupt');
    value.stocks[0].reserved = 0;
    value.stocks[0].merchantId = 'merchant_us_amazon';
    expect(() => assertOmsSnapshot(value, scope)).toThrow('corrupt');
  });
});

// A narrow transactional IDB harness exercises the actual browser repository path:
// staged puts are durable only at complete, and abort discards every pending write.
function installIdb(initial?: unknown) {
  let persisted = initial;
  let puts = 0;
  let completed = 0;
  let aborts = 0;
  const transactions: string[] = [];
  const db = {
    close: vi.fn(),
    transaction: (_name: string, mode: string) => {
      transactions.push(mode);
      let aborted = false;
      let pending: unknown;
      const tx = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null,
        abort: () => { aborted = true; aborts++; queueMicrotask(() => tx.onabort?.()); },
        objectStore: () => ({
          get: () => {
            const request = { result: structuredClone(persisted), onsuccess: null as (() => void) | null };
            queueMicrotask(() => {
              request.onsuccess?.();
              if (!aborted) queueMicrotask(() => { if (pending !== undefined) persisted = pending; completed++; tx.oncomplete?.(); });
            });
            return request;
          },
          put: (value: unknown) => { puts++; pending = structuredClone(value); },
        }),
      };
      return tx;
    },
  };
  vi.stubGlobal('indexedDB', { open: () => {
    const request = { result: db, onsuccess: null as (() => void) | null };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  } });
  return { get persisted() { return persisted; }, get puts() { return puts; }, get completed() { return completed; }, get aborts() { return aborts; }, transactions };
}

describe('native IndexedDB repository', () => {
  it('initializes inside a readwrite transaction and notifies only after commit', async () => {
    const idb = installIdb();
    const dispatched = vi.fn((_event: unknown) => expect(idb.completed).toBeGreaterThan(0));
    vi.stubGlobal('window', { dispatchEvent: dispatched });
    vi.stubGlobal('CustomEvent', class { constructor(public type: string, public options: unknown) {} });
    vi.stubGlobal('BroadcastChannel', undefined);
    const created = await readOmsSnapshot(scope);
    expect(idb.transactions).toEqual(['readwrite']);
    expect(idb.puts).toBe(1);
    expect(created.revision).toBe(0);
    expect(dispatched.mock.calls[0][0]).toMatchObject({ type: omsChangedEvent });
    await readOmsSnapshot(scope);
    expect(idb.puts).toBe(1);
    expect(dispatched).toHaveBeenCalledTimes(1);
    const changed = await transactOms(scope, s => ({ ...s, commandIds: ['committed'] }));
    expect(changed.revision).toBe(1);
    expect(idb.puts).toBe(2);
  });
  it('aborts without overwriting corrupt persisted data', async () => {
    const corrupt = { scopeKey: 'tenant_acme:company_northwind:merchant_us_shopify', ...emptySnapshot(scope), orders: 'broken' };
    const idb = installIdb(corrupt);
    await expect(readOmsSnapshot(scope)).rejects.toThrow('corrupt');
    expect(idb.persisted).toEqual(corrupt);
    expect(idb.puts).toBe(0);
    expect(idb.aborts).toBe(1);
  });
  it('aborts a rejected mutation without changing durable data', async () => {
    const initial = { ...emptySnapshot(scope), scopeKey: 'tenant_acme:company_northwind:merchant_us_shopify' };
    const idb = installIdb(initial);
    await expect(transactOms(scope, s => { s.commandIds.push('bad'); throw new Error('no'); })).rejects.toThrow('no');
    expect(idb.persisted).toEqual(initial);
    expect(idb.puts).toBe(0);
  });
  it('fails explicitly when durable storage is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(readOmsSnapshot(scope)).rejects.toThrow('unavailable');
  });
});
