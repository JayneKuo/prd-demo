import type { BusinessConfig, BusinessId } from './amazon-connections';

export function defaultSyncSettings(id: BusinessId): NonNullable<BusinessConfig['syncSettings']> {
  return {
    receiveOrders: ['sales', 'wholesale', 'df'].includes(id),
    includeOpenOrders: true,
    readInventory: ['sales', 'mcf', 'fba'].includes(id),
    publishInventory: false,
    shipmentWriteback: ['sales', 'wholesale', 'df'].includes(id),
    receiveChanges: true,
    receiveExistingPlans: id === 'fba',
    orderSources: ['amazon'],
    notifyOnError: true
  };
}
// Local adapter advances durable tasks by elapsed time; navigation does not cancel them.
export function advanceSyncTask(config: BusinessConfig, now = Date.now()): BusinessConfig {
  const task = config.syncTask;
  if (!task || !['queued', 'running'].includes(task.status)) return config;
  const elapsed = now - Date.parse(task.startedAt);
  if (!Number.isFinite(elapsed)) return config;
  if (elapsed >= 2400) return { ...config, initializedAt: new Date(now).toISOString(), syncTask: { ...task, status: 'completed', completedAt: new Date(now).toISOString() } };
  if (elapsed >= 600 && task.status === 'queued') return { ...config, syncTask: { ...task, status: 'running' } };
  return config;
}
export const syncTaskLabels = { queued: '首次同步排队中', running: '首次同步中', completed: '首次同步完成', failed: '首次同步失败' };
