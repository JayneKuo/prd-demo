import type { CommandContext, Entity, OmsSnapshot } from './types';
import { advanceAfterSales, assertAfterSalesInvariants, assertDomainScope, domainEntity, domainGuard, domainJournal, minorAmount, type AfterSalesSnapshot } from './aftersales';

export type FinanceSource = { id: string; orderId: string; kind: 'payment' | 'refund' | 'fee' | 'vendor_invoice'; currency: string; amountMinor: number };
export type BankAllocation = { evidenceId: string; amountMinor: number };
export type Settlement = Entity & { sourceIds: string[]; currency: string; expectedMinor: number; reportedMinor: number; bankAllocations: BankAllocation[]; status: 'difference' | 'matched' | 'partially_received' | 'received'; createdAt: string };
export type VendorInvoice = Entity & { purchaseOrderId: string; receiptId: string; documentKind: 'invoice' | 'ers'; documentNumber: string; currency: string; amountMinor: number; createdAt: string };
export type Claim = Entity & { settlementId: string; amountMinor: number; currency: string; reason: string; status: 'pending' | 'approved'; requestedBy: string; approvedBy?: string; createdAt: string };
/** Adapter contract: only canonical accepted PO receipts may supply this projection. */
export type VendorFinanceReceipt = Entity & { purchaseOrderId: string; currency: string; eligibleMinor: number; status: 'accepted'; batchId: string; lines: { lineId: string; received: number; short: number; damaged: number }[]; acceptedAt: string };
export type FinanceSnapshot = AfterSalesSnapshot & { settlements?: Settlement[]; invoices?: VendorInvoice[]; claims?: Claim[]; vendorFinanceReceipts?: VendorFinanceReceipt[] };
export type FinanceCommand =
  | { type: 'record_fee'; orderId: string; amountMinor: number; reason: string; externalId: string }
  | { type: 'create_settlement'; sourceIds: string[]; currency: string; reportedMinor: number }
  | { type: 'record_bank_evidence'; evidenceId: string; currency: string; amountMinor: number; reference: string }
  | { type: 'allocate_bank'; settlementId: string; evidenceId: string; amountMinor: number }
  | { type: 'request_adjustment'; settlementId: string; amountMinor: number; reason: string }
  | { type: 'approve_adjustment'; claimId: string }
  | { type: 'create_vendor_document'; receiptId: string; documentKind: 'invoice' | 'ers'; documentNumber: string; amountMinor: number; currency: string };
/** UI boundary: decimal major units in, safe integer minor units in commands. */
export function currencyDigits(currency: string) { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; }
export function moneyInputMinor(value: string, currency: string): number {
  const digits = currencyDigits(currency);
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) throw new Error('请输入有效金额');
  const negative = value.trim().startsWith('-'); const [whole, fraction = ''] = value.trim().replace(/^-/, '').split('.');
  if (fraction.length > digits) throw new Error(`该币种最多支持 ${digits} 位小数`);
  const minor = Number(BigInt(whole) * (BigInt(10) ** BigInt(digits)) + BigInt(fraction.padEnd(digits, '0') || '0')) * (negative ? -1 : 1);
  if (!Number.isSafeInteger(minor)) throw new Error('金额超出可处理范围');
  return minor;
}
export function moneyDisplay(minor: number, currency: string) { return `${(minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency))} ${currency}`; }
export function moneyStep(currency: string) { return 1 / 10 ** currencyDigits(currency); }
type FeePayload = { externalId: string; orderId: string; amountMinor: number; currency: string; reason: string };
type BankPayload = { evidenceId: string; amountMinor: number; currency: string; reference: string };
function orderFor(state: OmsSnapshot, id: string) { const order = state.orders.find(item => item.id === id); if (!order) throw new Error('原订单不存在'); assertDomainScope(state, order); if (['internal_transfer', 'vendor_retail', 'vendor_df'].includes(order.source)) throw new Error('内部与 Vendor 需求不属于 Seller 结算来源'); return order; }
function settlementFor(state: FinanceSnapshot, id: string) { const item = state.settlements?.find(item => item.id === id); if (!item) throw new Error('结算单不存在'); assertDomainScope(state, item); return item; }
function signedMinor(value: number) { if (!Number.isSafeInteger(value)) throw new Error('金额必须为安全整数最小货币单位'); }
/** Shared OMS source projection, not a second Amazon ledger. */
export function financeSources(state: FinanceSnapshot): FinanceSource[] {
  const sources: FinanceSource[] = state.orders.filter(order => order.paidMinor !== null && !['internal_transfer', 'vendor_retail', 'vendor_df'].includes(order.source)).map(order => { assertDomainScope(state, order); minorAmount(order.paidMinor!, true); return { id: `payment:${order.id}`, orderId: order.id, kind: 'payment', currency: order.currency, amountMinor: order.paidMinor! }; });
  for (const refund of state.refunds ?? []) if (refund.status === 'success') { assertDomainScope(state, refund); sources.push({ id: `refund:${refund.id}`, orderId: refund.orderId, kind: 'refund', currency: refund.currency, amountMinor: -refund.amountMinor }); }
  for (const event of state.events.filter(event => event.type === 'finance_fee')) { const fee = event.payload as FeePayload; const order = orderFor(state, fee.orderId); if (fee.currency !== order.currency) throw new Error('费用币种与订单不匹配'); minorAmount(fee.amountMinor); sources.push({ id: `fee:${fee.externalId}`, orderId: order.id, kind: 'fee', currency: fee.currency, amountMinor: -fee.amountMinor }); }
  for (const invoice of state.invoices ?? []) sources.push({ id: `vendor:${invoice.id}`, orderId: invoice.purchaseOrderId, kind: 'vendor_invoice', currency: invoice.currency, amountMinor: invoice.amountMinor });
  if (new Set(sources.map(item => item.id)).size !== sources.length) throw new Error('财务来源重复');
  return sources;
}
function approvedAdjustment(state: FinanceSnapshot, id: string) { return (state.claims ?? []).filter(claim => claim.settlementId === id && claim.status === 'approved').reduce((sum, claim) => sum + claim.amountMinor, 0); }
function refreshStatus(state: FinanceSnapshot, item: Settlement) {
  const net = item.expectedMinor + approvedAdjustment(state, item.id);
  const received = item.bankAllocations.reduce((sum, entry) => sum + entry.amountMinor, 0);
  item.status = net !== item.reportedMinor ? 'difference' : received === net ? 'received' : received ? 'partially_received' : 'matched';
}
export function assertFinanceInvariants(state: FinanceSnapshot) {
  assertAfterSalesInvariants(state); const sources = financeSources(state); const used = new Set<string>();
  for (const collection of [state.settlements ?? [], state.invoices ?? [], state.claims ?? [], state.vendorFinanceReceipts ?? []]) {
    if (new Set(collection.map(item => item.id)).size !== collection.length) throw new Error('财务实体 ID 重复');
    for (const item of collection) assertDomainScope(state, item);
  }
  const bankEvidence = state.events.filter(event => event.type === 'bank_evidence').map(event => event.payload as BankPayload);
  if (new Set(bankEvidence.map(entry => entry.evidenceId)).size !== bankEvidence.length) throw new Error('银行凭证重复');
  for (const item of state.settlements ?? []) {
    signedMinor(item.reportedMinor); signedMinor(item.expectedMinor);
    if (!item.sourceIds.length) throw new Error('结算单缺少共享来源');
    let expected = 0;
    for (const id of item.sourceIds) { const source = sources.find(source => source.id === id); if (!source || used.has(id) || source.currency !== item.currency) throw new Error('结算来源重复、缺失或币种不符'); used.add(id); expected += source.amountMinor; }
    if (expected !== item.expectedMinor) throw new Error('结算来源净额不匹配');
    const net = expected + approvedAdjustment(state, item.id); signedMinor(net);
    const received = item.bankAllocations.reduce((sum, entry) => { minorAmount(entry.amountMinor); const evidence = bankEvidence.find(evidence => evidence.evidenceId === entry.evidenceId); if (!evidence || evidence.currency !== item.currency) throw new Error('银行凭证缺失或币种不符'); return sum + entry.amountMinor; }, 0);
    if (received && (net !== item.reportedMinor || received > net)) throw new Error('差异未解决或银行分配超额');
  }
  for (const evidence of bankEvidence) { minorAmount(evidence.amountMinor); const allocated = (state.settlements ?? []).flatMap(item => item.bankAllocations).filter(item => item.evidenceId === evidence.evidenceId).reduce((sum, item) => sum + item.amountMinor, 0); if (allocated > evidence.amountMinor) throw new Error('银行凭证重复超额核销'); }
  for (const claim of state.claims ?? []) { const item = settlementFor(state, claim.settlementId); signedMinor(claim.amountMinor); if (!claim.amountMinor || !claim.reason.trim() || claim.currency !== item.currency || (claim.status === 'approved' && (!claim.approvedBy || claim.approvedBy === claim.requestedBy))) throw new Error('差异调整须有原因并由另一审批人批准'); }
  const receiptIds = new Set<string>();
  for (const invoice of state.invoices ?? []) { const receipt = state.vendorFinanceReceipts?.find(receipt => receipt.id === invoice.receiptId); minorAmount(invoice.amountMinor); if (!receipt || receipt.status !== 'accepted' || invoice.purchaseOrderId !== receipt.purchaseOrderId || invoice.currency !== receipt.currency || invoice.amountMinor !== receipt.eligibleMinor || receiptIds.has(receipt.id)) throw new Error('发票/ERS 必须互斥且匹配同一 PO 已验收收货'); receiptIds.add(receipt.id); }
}
export function executeFinance(current: FinanceSnapshot, command: FinanceCommand, context: CommandContext): FinanceSnapshot {
  if (!domainGuard(current, context)) return current;
  assertFinanceInvariants(current); const state: FinanceSnapshot = structuredClone(current); state.settlements ??= []; state.claims ??= []; state.invoices ??= [];
  let entityId = state.merchantId;
  if (command.type === 'record_fee') {
    const order = orderFor(state, command.orderId); minorAmount(command.amountMinor);
    if (!command.reason.trim() || !command.externalId.trim() || financeSources(state).some(source => source.id === `fee:${command.externalId}`)) throw new Error('费用须有唯一来源编号和原因');
    domainJournal(state, context, order.id, 'finance_fee', { ...command, currency: order.currency }); entityId = order.id;
  } else if (command.type === 'create_settlement') {
    if (!command.sourceIds.length || new Set(command.sourceIds).size !== command.sourceIds.length) throw new Error('请选择不重复共享财务来源');
    signedMinor(command.reportedMinor); const sources = financeSources(state);
    const selected = command.sourceIds.map(id => { const source = sources.find(source => source.id === id); if (!source || source.currency !== command.currency) throw new Error('结算来源或币种不匹配'); return source; });
    entityId = `settlement:${context.id}`;
    const item: Settlement = { ...domainEntity(state, entityId), sourceIds: [...command.sourceIds], currency: command.currency, expectedMinor: selected.reduce((sum, source) => sum + source.amountMinor, 0), reportedMinor: command.reportedMinor, bankAllocations: [], status: 'matched', createdAt: new Date(context.now).toISOString() }; refreshStatus(state, item); state.settlements.push(item);
  } else if (command.type === 'record_bank_evidence') {
    minorAmount(command.amountMinor); if (!command.evidenceId.trim() || !command.reference.trim() || !command.currency.trim()) throw new Error('银行凭证编号、币种、证据参考不可为空');
    domainJournal(state, context, command.evidenceId, 'bank_evidence', command); entityId = command.evidenceId;
  } else if (command.type === 'allocate_bank') {
    const item = settlementFor(state, command.settlementId); minorAmount(command.amountMinor);
    if (item.status === 'difference') throw new Error('请先审批解决结算差异');
    item.bankAllocations.push({ evidenceId: command.evidenceId, amountMinor: command.amountMinor }); item.revision++; refreshStatus(state, item); entityId = item.id;
  } else if (command.type === 'request_adjustment') {
    const item = settlementFor(state, command.settlementId); signedMinor(command.amountMinor);
    if (!command.amountMinor || !command.reason.trim() || item.status !== 'difference') throw new Error('仅差异结算可提出非零且带原因调整');
    entityId = `claim:${context.id}`; state.claims.push({ ...domainEntity(state, entityId), settlementId: item.id, amountMinor: command.amountMinor, currency: item.currency, reason: command.reason.trim(), status: 'pending', requestedBy: context.actor, createdAt: new Date(context.now).toISOString() });
  } else if (command.type === 'approve_adjustment') {
    const claim = state.claims.find(claim => claim.id === command.claimId); if (!claim || claim.status !== 'pending' || claim.requestedBy === context.actor) throw new Error('调整须由不同人员审批且不可重复');
    claim.status = 'approved'; claim.approvedBy = context.actor; claim.revision++;
    const item = settlementFor(state, claim.settlementId);
    if (item.expectedMinor + approvedAdjustment(state, item.id) !== item.reportedMinor) throw new Error('调整金额与待解决差异不匹配');
    refreshStatus(state, item); item.revision++; entityId = claim.id;
  } else {
    const receipt = state.vendorFinanceReceipts?.find(receipt => receipt.id === command.receiptId);
    if (!receipt || receipt.status !== 'accepted') throw new Error('缺少共享 Vendor PO 已验收收货记录；不可凭空创建发票');
    assertDomainScope(state, receipt); minorAmount(command.amountMinor);
    if (!command.documentNumber.trim() || state.invoices.some(invoice => invoice.documentNumber === command.documentNumber)) throw new Error('财务单据编号为空或重复');
    entityId = `invoice:${context.id}`; state.invoices.push({ ...domainEntity(state, entityId), purchaseOrderId: receipt.purchaseOrderId, receiptId: receipt.id, documentKind: command.documentKind, documentNumber: command.documentNumber.trim(), amountMinor: command.amountMinor, currency: command.currency, createdAt: new Date(context.now).toISOString() });
  }
  domainJournal(state, context, entityId, command.type, command); state.commandIds.push(context.id); assertFinanceInvariants(state); return state;
}
export function advanceFinanceAndReturns<T extends OmsSnapshot>(state: T, now: number): T { return advanceAfterSales(state as T & AfterSalesSnapshot, now) as T; }
