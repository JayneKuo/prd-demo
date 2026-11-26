'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useShellState } from '@/components/providers/shell-state-provider';
import { currentTenant, getMerchantsByCompany } from '@/lib/tenant-context';
import { currentSession } from '@/lib/session-context';
import { hasCapability } from '@/lib/permissions';
import { readOmsSnapshot, transactOms, omsChangedEvent } from './repository';
import { executeOmsCommand, advanceOmsJobs, type OmsCommand } from './commands';
import { ensureCanonicalFixtures, ensureShippingDeadlineExamples } from './fixtures';
import { ensureReplenishmentDemo } from './replenishment-fixtures';
import { ensureReplenishmentStatusScenarios } from './replenishment-scenarios';
import { executeReplenishment, type ReplenishmentCommand } from './replenishment-commands';
import { ensureAmazonSalesScenarios } from './amazon-sales-scenarios';
import { ensureAmazonDomainScenarios } from './amazon-domain-scenarios';
import { advanceFinanceAndReturns } from './finance';
import { advanceFbaJobs } from './fba';
import { checkConnectionCommand } from './connection-gates';
import { advanceVendorJobs, ensureVendorFixtures, executeVendorCommand, type VendorCommand } from './vendor';
import { scopeKey, type OmsSnapshot } from './types';
import { connectionStorageKey, parseConnections } from '@/lib/amazon-connections';
import { loadAmazonConnections } from '@/lib/amazon-sample-data';

type OmsContextValue = { snapshots: OmsSnapshot[]; ready: boolean; error: string; execute: (merchantId: string, command: OmsCommand, commandId?: string) => Promise<void>; executeMany: (merchantId: string, commands: OmsCommand[]) => Promise<void>; executeVendor: (merchantId: string, command: VendorCommand) => Promise<void>; executeReplenishment: (merchantId: string, command: ReplenishmentCommand) => Promise<void>; reload: () => Promise<void> };
const Context = createContext<OmsContextValue | null>(null);
export function OmsProvider({ children }: { children: React.ReactNode }) {
  const { companyId, merchantScope } = useShellState();
  const [view, setView] = useState<{ company: string; snapshots: OmsSnapshot[]; ready: boolean }>({ company: '', snapshots: [], ready: false });
  const [error, setError] = useState('');
  const scopes = useMemo(() => getMerchantsByCompany(companyId).map(merchant => ({ tenantId: currentTenant.id, companyId, merchantId: merchant.id })), [companyId]);
  const reload = useCallback(async () => {
    try { const snapshots = await Promise.all(scopes.map(scope => readOmsSnapshot(scope))); setView({ company: companyId, snapshots, ready: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '无法读取业务数据，原数据未清除。'); }
  }, [companyId, scopes]);
  useEffect(() => {
    let stopped = false;
    let running = false;
    const load = async () => { if (!stopped) await reload(); };
    const advance = async () => {
      if (running || stopped) return;
      running = true;
      try { for (const scope of scopes) { loadAmazonConnections(scope.companyId, scope.merchantId); await transactOms(scope, snapshot => advanceFinanceAndReturns(advanceVendorJobs(advanceFbaJobs(advanceOmsJobs(ensureShippingDeadlineExamples(ensureAmazonDomainScenarios(ensureVendorFixtures(ensureAmazonSalesScenarios(ensureReplenishmentStatusScenarios(ensureReplenishmentDemo(ensureCanonicalFixtures(snapshot)))))), Date.now()), Date.now()), Date.now()), Date.now()), Date.now())); } if (!stopped) await reload(); }
      catch (cause) { if (!stopped) { setError(cause instanceof Error ? cause.message : '业务事件处理失败，未清除原数据。'); try { await reload(); } catch { /* 读取失败则保持现有 ready 状态 */ } } }
      finally { running = false; }
    };
    void advance();
    const timer = window.setInterval(advance, 1000);
    window.addEventListener(omsChangedEvent, load);
    window.addEventListener('focus', advance);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener(omsChangedEvent, load); window.removeEventListener('focus', advance); };
  }, [reload, scopes]);
  const execute = useCallback(async (merchantId: string, command: OmsCommand, commandId = crypto.randomUUID()) => {
    const scope = scopes.find(item => item.merchantId === merchantId);
    if (!scope) throw new Error('商家不属于当前公司');
    const snapshot = view.snapshots.find(item => scopeKey(item) === scopeKey(scope));
    if (!snapshot || view.company !== companyId) throw new Error('数据尚未就绪，请稍后重试');
    const capability = ['allocate', 'withdraw', 'dispatch', 'writeback', 'create_order', 'cancel_order', 'note', 'submit_mcf_outbound'].includes(command.type) ? 'orders:write' : 'inventory:write';
    try { await transactOms(scope, state => {
      checkConnectionCommand(state, command);
      return executeOmsCommand(state, command, { id: commandId, now: Date.now(), expectedRevision: snapshot.revision, actor: currentSession.role, canWrite: hasCapability(currentSession.role, capability) });
    }); setError(''); await reload(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : '操作失败'; setError(message); throw cause; }
  }, [scopes, view, companyId, reload]);
  const executeMany = useCallback(async (merchantId: string, commands: OmsCommand[]) => {
    const scope = scopes.find(item => item.merchantId === merchantId);
    const previous = view.snapshots.find(item => item.merchantId === merchantId);
    if (!scope || !previous || view.company !== companyId) throw new Error('业务数据尚未就绪');
    const ids = commands.map(() => crypto.randomUUID());
    await transactOms(scope, state => {
      if (state.revision !== previous.revision) throw new Error('业务记录已变化，请刷新后重试');
      return commands.reduce((current, command, index) => { checkConnectionCommand(current, command); return executeOmsCommand(current, command, { id: ids[index], now: Date.now(), actor: currentSession.role, canWrite: hasCapability(currentSession.role, ['bind_mcf_warehouse', 'save_warehouse'].includes(command.type) ? 'inventory:write' : 'orders:write') }); }, state);
    });
    await reload();
  }, [scopes, view, companyId, reload]);
  const executeVendor = useCallback(async (merchantId: string, command: VendorCommand) => {
    const scope = scopes.find(item => item.merchantId === merchantId);
    const previous = view.snapshots.find(item => item.merchantId === merchantId);
    if (!scope || !previous || view.company !== companyId) throw new Error('业务数据尚未就绪');
    await transactOms(scope, state => {
      const vendorOrder = state.vendorOrders?.find(order => ('purchaseOrderId' in command && order.id === command.purchaseOrderId) || ('batchId' in command && state.vendorBatches?.some(batch => batch.id === command.batchId && batch.purchaseOrderId === order.id)));
      if (command.type !== 'vendor_import_samples') {
        const connection = parseConnections(localStorage.getItem(connectionStorageKey(state.companyId, state.merchantId))).find(item => item.id === vendorOrder?.connectionId);
        const business = vendorOrder?.type === 'df' ? connection?.businesses.df : connection?.businesses.wholesale;
        if (!connection?.authorized || business?.status !== 'enabled') throw new Error('Vendor 授权失效或业务未启用');
        if (business.syncSettings?.shipmentWriteback === false && !['vendor_receive', 'vendor_publish_inventory'].includes(command.type)) throw new Error('业务回传已关闭，请先恢复配置');
        if (command.type === 'vendor_publish_inventory' && business.syncSettings?.publishInventory !== true) throw new Error('库存发布尚未开启，请先在业务配置启用');
      }
      return executeVendorCommand(state, command, { id: crypto.randomUUID(), now: Date.now(), expectedRevision: previous.revision, actor: currentSession.role, canWrite: hasCapability(currentSession.role, 'orders:write'), domain: 'vendor' });
    });
    await reload();
  }, [scopes, view, companyId, reload]);
  const executeReplenishmentCommand = useCallback(async (merchantId: string, command: ReplenishmentCommand) => {
    const scope = scopes.find(item => item.merchantId === merchantId);
    const previous = view.snapshots.find(item => item.merchantId === merchantId);
    if (!scope || !previous || view.company !== companyId) throw new Error('业务数据尚未就绪');
    await transactOms(scope, state => executeReplenishment(state, command, { id: crypto.randomUUID(), now: Date.now(), expectedRevision: previous.revision, actor: currentSession.role, canWrite: hasCapability(currentSession.role, 'inventory:write') }));
    await reload();
  }, [scopes, view, companyId, reload]);
  const snapshots = view.company !== companyId ? [] : view.snapshots.filter(snapshot => merchantScope === 'all' || snapshot.merchantId === merchantScope);
  return <Context.Provider value={{ snapshots, ready: view.company === companyId && view.ready, error, execute, executeMany, executeVendor, executeReplenishment: executeReplenishmentCommand, reload }}>{children}</Context.Provider>;
}
export function useOms() { const context = useContext(Context); if (!context) throw new Error('OMS provider unavailable'); return context; }
