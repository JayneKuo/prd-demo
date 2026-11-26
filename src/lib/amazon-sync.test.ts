import { describe, expect, it } from 'vitest';
import { defaultSyncSettings, advanceSyncTask } from './amazon-sync';
import { defaultBusinessConfig, type BusinessConfig } from './amazon-connections';
describe('Amazon sync configuration and tasks', () => {
  it('keeps inventory publishing opt-in and distinct from inventory reads', () => {
    expect(defaultSyncSettings('sales').readInventory).toBe(true);
    expect(defaultSyncSettings('sales').publishInventory).toBe(false);
    expect(defaultSyncSettings('df').readInventory).toBe(false);
    expect(defaultSyncSettings('df').publishInventory).toBe(false);
  });
  it('advances persisted initialization without a confirmation step', () => {
    const startedAt = '2026-11-02T10:00:00.000Z';
    const config: BusinessConfig = { ...defaultBusinessConfig(), status: 'enabled', syncTask: { status: 'queued', startedAt } };
    expect(advanceSyncTask(config, Date.parse(startedAt) + 200)).toBe(config);
    expect(advanceSyncTask(config, Date.parse(startedAt) + 800).syncTask?.status).toBe('running');
    const done = advanceSyncTask(config, Date.parse(startedAt) + 3000);
    expect(done.syncTask?.status).toBe('completed');
    expect(done.initializedAt).toBeTruthy();
    expect(advanceSyncTask(done, Date.parse(startedAt) + 5000)).toBe(done);
  });
});
