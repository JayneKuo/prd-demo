import { assertOmsScope, migrateOmsSnapshot } from './migrations';
import { assertFbaAddons } from './fba';
import { assertAfterSalesInvariants } from './aftersales';
import { assertFinanceInvariants } from './finance';
import { assertVendorInvariants } from './vendor';
import { scopeKey, type OmsSnapshot, type Scope } from './types';

export const omsChangedEvent = 'oms-business-changed';
const databaseName = 'oms-business-v1';
const storeName = 'snapshots';
type Mutate = (snapshot: OmsSnapshot) => OmsSnapshot;
type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (o: RecordValue, keys: string[]) => keys.every(k => typeof o[k] === 'string');
const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
const list = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);
const stringList = (value: unknown) => list(value, v => typeof v === 'string');
const oneOf = (value: unknown, values: string[]) => typeof value === 'string' && values.includes(value);
const optionalString = (o: RecordValue, keys: string[]) => keys.every(k => o[k] === undefined || typeof o[k] === 'string');
const quantities = (value: unknown) => list(value, v => object(v) && typeof v.lineId === 'string' && integer(v.quantity) && (v.quantity as number) > 0);
const address = (value: unknown) => value === null || object(value) && strings(value, ['name', 'phone', 'address1', 'city', 'province', 'zip', 'country']);

/** Fail closed: an unreadable record must not turn into a fresh workspace. */
export function assertOmsSnapshot(value: unknown, scope: Scope): asserts value is OmsSnapshot {
  const fail = () => { throw new Error('OMS snapshot is corrupt or belongs to another scope; existing data was not reset.'); };
  if (!object(value) || value.version !== 1 || !integer(value.revision) ||
      value.tenantId !== scope.tenantId || value.companyId !== scope.companyId || value.merchantId !== scope.merchantId) return fail();
  if (value.warehouseRecords !== undefined && (!list(value.warehouseRecords, w => object(w) && strings(w, ['id', 'code', 'name', 'country', 'city', 'address']) && oneOf(w.kind, ['local', 'virtual', 'platform']) && typeof w.active === 'boolean' && (w.binding === undefined || object(w.binding) && strings(w.binding, ['appId', 'connectionId', 'externalWarehouseId', 'site']) && oneOf(w.binding.capability, ['mcf', 'warehouse']))) || new Set((value.warehouseRecords as { id: string }[]).map(w => w.id)).size !== (value.warehouseRecords as unknown[]).length)) return fail();
  if (value.fulfillmentWarehouses !== undefined && (!list(value.fulfillmentWarehouses, w => object(w) && strings(w, ['id', 'code', 'name', 'connectionId', 'site']) && w.app === 'amazon' && w.capability === 'mcf' && typeof w.active === 'boolean') || new Set((value.fulfillmentWarehouses as { id: string }[]).map(w => w.id)).size !== (value.fulfillmentWarehouses as unknown[]).length)) return fail();
  const entity = (v: unknown): v is RecordValue => object(v) && typeof v.id === 'string' && !!v.id && integer(v.revision) &&
    v.tenantId === scope.tenantId && v.companyId === scope.companyId && v.merchantId === scope.merchantId;
  const entities = (key: string, check: (v: RecordValue) => boolean) => {
    const values = value[key];
    return list(values, v => entity(v) && check(v)) &&
      new Set((values as RecordValue[]).map(v => v.id)).size === (values as unknown[]).length;
  };
  if (!entities('orders', o => strings(o, ['number', 'sourceId', 'source', 'createdAt', 'currency', 'paymentStatus', 'customer', 'note']) &&
      (o.paidMinor === null || integer(o.paidMinor)) && address(o.address) && stringList(o.tags) &&
      optionalString(o, ['connectionId', 'site', 'migrationBlocked']) && (o.archived === undefined || typeof o.archived === 'boolean') &&
      (o.channelType === undefined || oneOf(o.channelType, ['AFN', 'MFN'])) &&
      list(o.lines, l => object(l) && strings(l, ['id', 'channelLineId', 'channelSku', 'omsVariantId', 'sku', 'title', 'unit']) &&
        integer(l.quantity) && integer(l.cancelled) && (l.cancelled as number) <= (l.quantity as number) &&
        (l.unitPriceMinor === null || integer(l.unitPriceMinor)) &&
        (l.mappingSnapshot === undefined || object(l.mappingSnapshot) && strings(l.mappingSnapshot, ['channelSku', 'omsVariantId']))) &&
      new Set((o.lines as RecordValue[]).map(l => l.id)).size === (o.lines as unknown[]).length) ||
    !entities('fulfillments', f => strings(f, ['orderId', 'number', 'warehouseId', 'submittedAt']) && quantities(f.lines) && stringList(f.reservations) &&
      oneOf(f.executor, ['warehouse', 'amazon']) && oneOf(f.status, ['allocated', 'submitted', 'unknown', 'picking', 'packed', 'withdraw_pending', 'cancelled', 'shipped', 'delivered']) &&
      optionalString(f, ['connectionId', 'site', 'replacedBy', 'outboundId', 'providerReference', 'error'])) ||
    !entities('outbounds', o => strings(o, ['number', 'orderId', 'fulfillmentId', 'warehouseId', 'createdAt']) && quantities(o.lines) &&
      oneOf(o.status, ['waiting', 'picking', 'packed', 'withdraw_pending', 'cancelled', 'shipped'])) ||
    !entities('stocks', s => strings(s, ['warehouseId', 'sku']) && oneOf(s.pool, ['warehouse', 'fba']) &&
      integer(s.onHand) && integer(s.reserved) && integer(s.unfulfillable) && (s.reserved as number) + (s.unfulfillable as number) <= (s.onHand as number) &&
      optionalString(s, ['connectionId', 'site'])) ||
    !entities('reservations', r => strings(r, ['fulfillmentId', 'stockId', 'lineId']) && integer(r.quantity) && (r.quantity as number) > 0 && oneOf(r.status, ['active', 'released', 'consumed'])) ||
    !entities('movements', m => strings(m, ['stockId', 'referenceId', 'createdAt']) && Number.isSafeInteger(m.quantity) &&
      oneOf(m.kind, ['reserve', 'release', 'ship', 'restock', 'damage', 'receive', 'adjust'])) ||
    !entities('packages', p => strings(p, ['fulfillmentId', 'orderId', 'number', 'carrier', 'tracking', 'shippedAt']) && quantities(p.lines) &&
      oneOf(p.confirmation, ['not_required', 'pending', 'failed', 'confirmed']) && optionalString(p, ['deliveredAt', 'confirmationError'])) ||
    !entities('shipments', s => strings(s, ['outboundId', 'fulfillmentId', 'orderId', 'carrier', 'trackingNumber']) &&
      oneOf(s.provider, ['amazon_mcf', 'warehouse', '3pl']) && oneOf(s.status, ['created', 'label_ready', 'in_transit', 'delivered', 'cancelled', 'failed', 'unknown']) &&
      quantities(s.lines) && oneOf(s.confirmation, ['not_required', 'pending', 'failed', 'confirmed']) &&
      optionalString(s, ['providerShipmentId', 'providerPackageId', 'trackingUrl', 'shippedAt', 'deliveredAt', 'sourceEventId', 'confirmationError']) &&
      (s.sourceEventVersion === undefined || integer(s.sourceEventVersion))) ||
    !list(value.jobs, j => object(j) && strings(j, ['id', 'targetId', 'causationId']) && Number.isFinite(j.dueAt) && integer(j.attempts) &&
      oneOf(j.kind, ['warehouse_pick', 'warehouse_pack', 'ship', 'withdraw', 'amazon_create', 'writeback', 'deliver']) &&
      oneOf(j.status, ['queued', 'completed', 'failed', 'unknown']) && optionalString(j, ['failure'])) ||
    !list(value.events, e => object(e) && strings(e, ['id', 'commandId', 'entityId', 'type', 'at', 'description'])) ||
    !list(value.migrationIssues, i => object(i) && strings(i, ['id', 'source', 'message']) && typeof i.resolved === 'boolean' && optionalString(i, ['entityId'])) ||
    !stringList(value.commandIds) || !stringList(value.migratedSources) || !object(value.archives) || !Object.values(value.archives).every(v => typeof v === 'string')) return fail();
  assertFbaAddons(value as unknown as OmsSnapshot);
  assertAfterSalesInvariants(value as unknown as OmsSnapshot);
  assertFinanceInvariants(value as unknown as OmsSnapshot);
  assertVendorInvariants(value as unknown as OmsSnapshot);
}

function updated(current: OmsSnapshot, mutate: Mutate, scope: Scope) {
  const before = JSON.stringify(current);
  const result = mutate(structuredClone(current));
  // Reject async callbacks while still inside the live IndexedDB transaction.
  if (!result || typeof (result as unknown as { then?: unknown }).then === 'function') throw new Error('OMS transaction mutation must be synchronous.');
  assertOmsSnapshot(result, scope);
  const candidate = { ...result, revision: current.revision };
  if (JSON.stringify(candidate) === before) return { next: current, changed: false };
  if (!Number.isSafeInteger(current.revision + 1)) throw new Error('OMS revision overflow.');
  return { next: { ...candidate, revision: current.revision + 1 }, changed: true };
}

function notify(scope: Scope, revision: number) {
  if (typeof window === 'undefined') return;
  const detail = { scopeKey: scopeKey(scope), ...scope, revision };
  // Notifications must never turn an already committed write into a rejected command.
  try { window.dispatchEvent(new CustomEvent(omsChangedEvent, { detail })); } catch { /* Advisory only. */ }
  // A new short-lived sender does not keep SSR/test processes or browser tabs alive.
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(omsChangedEvent);
      channel.postMessage(detail);
      channel.close();
    }
  } catch { /* Notifications are advisory; the durable commit already succeeded. */ }
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is unavailable; OMS writes are disabled.')); return; }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'scopeKey' });
    };
    request.onerror = () => reject(request.error ?? new Error('Cannot open OMS database.'));
    request.onblocked = () => reject(new Error('OMS database upgrade is blocked by another tab.'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}

async function transact(scope: Scope, mutate?: Mutate): Promise<OmsSnapshot> {
  assertOmsScope(scope);
  // Copy before yielding: callers cannot retarget an in-flight operation by mutating scope.
  const target = { tenantId: scope.tenantId, companyId: scope.companyId, merchantId: scope.merchantId };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    let result: OmsSnapshot;
    let changed = false;
    let failure: unknown;
    const request = store.get(scopeKey(target));
    request.onsuccess = () => {
      try {
        let current: OmsSnapshot;
        const missing = request.result === undefined;
        if (missing) current = migrateOmsSnapshot(target);
        else {
          const { scopeKey: key, ...snapshot } = request.result;
          if (key !== scopeKey(target)) throw new Error('OMS persisted scope key is corrupt.');
          current = snapshot;
          // Shipment was introduced after the original snapshot schema; absence means no shipments.
          if (!Array.isArray((current as Partial<OmsSnapshot>).shipments)) current = { ...current, shipments: [] };
          if (!Array.isArray((current as Partial<OmsSnapshot>).amazonPluginTasks)) current = { ...current, amazonPluginTasks: [] };
        }
        if (!Array.isArray((current as Partial<OmsSnapshot>).shipments)) current = { ...current, shipments: [] };
        if (!Array.isArray((current as Partial<OmsSnapshot>).amazonPluginTasks)) current = { ...current, amazonPluginTasks: [] };
        assertOmsSnapshot(current, target);
        const update = mutate ? updated(current, mutate, target) : { next: current, changed: false };
        result = update.next;
        changed = missing || update.changed;
        if (changed) store.put({ ...result, scopeKey: scopeKey(target) });
      } catch (error) { failure = error; transaction.abort(); }
    };
    transaction.oncomplete = () => {
      db.close();
      if (changed) notify(target, result.revision);
      resolve(structuredClone(result));
    };
    transaction.onabort = () => { db.close(); reject(failure ?? transaction.error ?? new Error('OMS transaction aborted; no changes committed.')); };
    transaction.onerror = () => { failure ??= transaction.error; };
  });
}

/** Initial migration and first write share the same serialized read/write transaction. */
export function readOmsSnapshot(scope: Scope): Promise<OmsSnapshot> { return transact(scope); }
export function transactOms(scope: Scope, mutate: Mutate): Promise<OmsSnapshot> { return transact(scope, mutate); }

export class MemoryOmsRepository {
  private snapshots = new Map<string, OmsSnapshot>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly initialize: (scope: Scope) => OmsSnapshot = migrateOmsSnapshot) {}
  read(scope: Scope): Promise<OmsSnapshot> { return this.run(scope); }
  transact(scope: Scope, mutate: Mutate): Promise<OmsSnapshot> { return this.run(scope, mutate); }
  private run(scope: Scope, mutate?: Mutate): Promise<OmsSnapshot> {
    try { assertOmsScope(scope); } catch (error) { return Promise.reject(error); }
    const target = { ...scope };
    const operation = this.queue.then(() => {
      const key = scopeKey(target);
      const saved = this.snapshots.get(key);
      let current = saved ?? this.initialize(target);
      if (!Array.isArray((current as Partial<OmsSnapshot>).shipments)) current = { ...current, shipments: [] };
      if (!Array.isArray((current as Partial<OmsSnapshot>).amazonPluginTasks)) current = { ...current, amazonPluginTasks: [] };
      assertOmsSnapshot(current, target);
      const update = mutate ? updated(current, mutate, target) : { next: current, changed: false };
      if (!saved || update.changed) this.snapshots.set(key, structuredClone(update.next));
      return structuredClone(update.next);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
