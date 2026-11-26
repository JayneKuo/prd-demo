import { describe, expect, it } from 'vitest';
import { emptySnapshot, type CommandContext } from './types';
import { advanceFinanceAndReturns, assertFinanceInvariants, executeFinance, financeSources, moneyInputMinor, moneyDisplay, type FinanceSnapshot } from './finance';
const scope = { tenantId: 't', companyId: 'c', merchantId: 'm' };
const ctx = (id: string, actor = 'finance'): CommandContext => ({ id, actor, now: 0, canWrite: true });
function initial(): FinanceSnapshot {
  const state = emptySnapshot(scope);
  state.orders.push({ ...scope, id: 'order', revision: 1, number: 'SO', sourceId: 'source', source: 'Amazon', createdAt: new Date(0).toISOString(), currency: 'USD', paidMinor: 1000, paymentStatus: 'paid', customer: 'A', address: null, lines: [{ id: 'line', channelLineId: 'channelLine', channelSku: 'sku', omsVariantId: 'v', sku: 'sku', title: 'Product', quantity: 1, cancelled: 0, unit: 'Each', unitPriceMinor: 1000 }], note: '', tags: [] });
  return state;
}
function settled(reported = 900) {
  let state = executeFinance(initial(), { type: 'record_fee', orderId: 'order', amountMinor: 100, externalId: 'fee1', reason: 'Fulfillment fee' }, ctx('fee'));
  state = executeFinance(state, { type: 'create_settlement', currency: 'USD', sourceIds: financeSources(state).map(item => item.id), reportedMinor: reported }, ctx('settlement'));
  return state;
}
describe('shared OMS finance', () => {
  it('converts user currency amounts exactly without changing integer command contracts', () => {
    expect(moneyInputMinor('90.33', 'USD')).toBe(9033);
    expect(moneyInputMinor('0.29', 'USD')).toBe(29);
    expect(moneyInputMinor('-0.01', 'USD')).toBe(-1);
    expect(moneyInputMinor('123', 'JPY')).toBe(123);
    expect(moneyInputMinor('1.234', 'KWD')).toBe(1234);
    expect(moneyDisplay(9033, 'USD')).toBe('90.33 USD');
    for (const amount of ['NaN', '1e3', '', '0.001', '900719925474099.99']) expect(() => moneyInputMinor(amount, 'USD')).toThrow();
    expect(() => moneyInputMinor('1.1', 'JPY')).toThrow();
  });
  it('settles selected sources without absorbing unrelated historical orders', () => {
    const state = initial(); state.orders.push({ ...structuredClone(state.orders[0]), id: 'historical', number: 'OLD', paidMinor: 99999 });
    const next = executeFinance(state, { type: 'create_settlement', sourceIds: ['payment:order'], currency: 'USD', reportedMinor: 1000 }, ctx('selected'));
    expect(next.settlements![0].sourceIds).toEqual(['payment:order']);
    expect(next.settlements![0].expectedMinor).toBe(1000);
  });
  it('projects stable order/refund/fee ids, uses exact source net and prevents duplicate settlement', () => {
    const state = settled(); expect(financeSources(state).map(item => [item.id, item.amountMinor])).toEqual([['payment:order', 1000], ['fee:fee1', -100]]);
    expect(state.settlements![0]).toMatchObject({ expectedMinor: 900, reportedMinor: 900, currency: 'USD', status: 'matched' });
    expect(executeFinance(state, { type: 'create_settlement', currency: 'USD', sourceIds: ['payment:order'], reportedMinor: 1000 }, ctx('settlement'))).toBe(state);
    expect(() => executeFinance(state, { type: 'create_settlement', currency: 'USD', sourceIds: ['payment:order'], reportedMinor: 1000 }, ctx('duplicate'))).toThrow();
    expect(() => executeFinance(initial(), { type: 'create_settlement', currency: 'EUR', sourceIds: ['payment:order'], reportedMinor: 1000 }, ctx('currency'))).toThrow(/币种/);
    expect(() => executeFinance(state, { type: 'record_fee', orderId: 'order', amountMinor: 100, externalId: 'fee1', reason: 'duplicate' }, ctx('fee2'))).toThrow(/唯一/);
  });
  it('requires bank evidence, permits partial allocations, prevents evidence reuse and overpayments', () => {
    let state = settled();
    expect(() => executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'missing', amountMinor: 10 }, ctx('missing'))).toThrow(/凭证/);
    state = executeFinance(state, { type: 'record_bank_evidence', evidenceId: 'bank1', currency: 'USD', amountMinor: 600, reference: 'statement/line1' }, ctx('evidence1'));
    state = executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'bank1', amountMinor: 500 }, ctx('partial'));
    expect(state.settlements![0].status).toBe('partially_received');
    expect(() => executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'bank1', amountMinor: 101 }, ctx('reuse'))).toThrow(/超额/);
    state = executeFinance(state, { type: 'record_bank_evidence', evidenceId: 'bank2', currency: 'USD', amountMinor: 400, reference: 'statement/line2' }, ctx('evidence2'));
    state = executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'bank2', amountMinor: 400 }, ctx('final'));
    expect(state.settlements![0].status).toBe('received');
    expect(() => executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'bank1', amountMinor: 1 }, ctx('over'))).toThrow();
  });
  it('keeps differences open until reasoned manual adjustment is independently approved', () => {
    let state = settled(875); expect(state.settlements![0].status).toBe('difference');
    expect(() => executeFinance(state, { type: 'allocate_bank', settlementId: 'settlement:settlement', evidenceId: 'bank1', amountMinor: 875 }, ctx('early'))).toThrow(/差异/);
    expect(() => executeFinance(state, { type: 'request_adjustment', settlementId: 'settlement:settlement', amountMinor: -25, reason: '' }, ctx('empty'))).toThrow();
    state = executeFinance(state, { type: 'request_adjustment', settlementId: 'settlement:settlement', amountMinor: -25, reason: 'Verified external withholding' }, ctx('claim'));
    expect(() => executeFinance(state, { type: 'approve_adjustment', claimId: 'claim:claim' }, ctx('self'))).toThrow(/不同/);
    state = executeFinance(state, { type: 'approve_adjustment', claimId: 'claim:claim' }, ctx('approve', 'controller'));
    expect(state.settlements![0].status).toBe('matched'); expect(state.claims![0].approvedBy).toBe('controller');
    expect(state.events.some(event => event.type === 'approve_adjustment')).toBe(true);
  });
  it('gates Vendor invoice/ERS on accepted shared receipt with currency/value equality and mutual exclusion', () => {
    let state = initial(); const command = { type: 'create_vendor_document' as const, receiptId: 'receipt', documentKind: 'invoice' as const, documentNumber: 'INV1', currency: 'USD', amountMinor: 1200 };
    expect(() => executeFinance(state, command, ctx('missing'))).toThrow(/已验收/);
    state.vendorFinanceReceipts = [{ ...scope, id: 'receipt', revision: 1, purchaseOrderId: 'po1', status: 'accepted', currency: 'USD', eligibleMinor: 1200, batchId: 'batch', lines: [{ lineId: 'line', received: 1, short: 0, damaged: 0 }], acceptedAt: new Date(0).toISOString() }];
    expect(() => executeFinance(state, { ...command, amountMinor: 1199 }, ctx('value'))).toThrow(/匹配/);
    state = executeFinance(state, command, ctx('invoice'));
    expect(state.invoices![0].purchaseOrderId).toBe('po1');
    expect(() => executeFinance(state, { ...command, documentKind: 'ers', documentNumber: 'ERS1' }, ctx('ers'))).toThrow(/互斥/);
  });
  it('guards scopes, permission, stale revision, minor-unit precision and unchanged runtime identity', () => {
    const state = initial(); const command = { type: 'record_fee' as const, orderId: 'order', amountMinor: 1, externalId: 'fee', reason: 'reason' };
    expect(advanceFinanceAndReturns(state, 100000)).toBe(state);
    expect(() => executeFinance(state, command, { ...ctx('no'), canWrite: false })).toThrow(/权限/);
    expect(() => executeFinance(state, command, { ...ctx('stale'), expectedRevision: 10 })).toThrow(/刷新/);
    expect(() => executeFinance(state, { ...command, amountMinor: 0.1 }, ctx('decimal'))).toThrow(/整数/);
    const foreign = settled(); foreign.settlements![0].companyId = 'foreign'; expect(() => assertFinanceInvariants(foreign)).toThrow(/作用域/);
  });
});
