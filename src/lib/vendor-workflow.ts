import { vendorNodeMappingErrors, type VendorNodeMapping, type VendorParty } from './vendor-node-mappings';
export const vendorRejectionReasons = ['TemporarilyUnavailable', 'InvalidProductIdentifier', 'ObsoleteProduct'] as const;
export type VendorContainer = { type: 'carton' | 'pallet'; identifierType: 'SSCC' | 'AMZNCC'; identifier: string; sku: string; qty: number; tracking?: string };
export type VendorLine = { sku: string; itemSequenceNumber?: string; vendorProductIdentifier?: string; amazonProductIdentifier?: string; unitOfMeasure?: 'Eaches' | 'Cases'; unitSize?: number; netCost?: { amount: string; currencyCode: string }; rejectionReason?: typeof vendorRejectionReasons[number]; ordered: number; accepted: number; backorder: number; rejected: number; scheduledShipDate?: string; backorderAllowed?: boolean };
export type VendorBatch = { id: string; status: 'transport_ready' | 'routing_pending' | 'routing_failed' | 'routed' | 'asn_pending' | 'asn_failed' | 'asn' | 'shipped'; lines: { sku: string; qty: number }[]; warehouseId: string; route: 'Collect' | 'You-Ship' | 'Prepaid'; readyDate: string; cartons: number; pallets: number; weightKg: number; routingRef: string; destination: string; carrier: string; tracking: string; asn: string; submittedAt: string; transactionId: string; shipFromParty?: VendorParty; sellingParty?: VendorParty; shipToParty?: VendorParty; region?: string; volumeM3?: number; packingType?: 'carton' | 'pallet'; shipType?: 'LTL' | 'FTL' | 'SmallParcel'; carrierScac?: string; shippedDate?: string; estimatedDeliveryDate?: string; containers?: VendorContainer[]; shipFromAddress?: string; bol?: string; sscc?: string; failure?: string };
export type VendorPO = { sellingParty?: VendorParty; shipToParty?: VendorParty; warehouseId?: string; id: string; reference: string; connectionId: string; status: 'pending' | 'acknowledged' | 'routed' | 'asn' | 'shipped' | 'rejected'; lines: VendorLine[]; reason: string; route: '' | 'Collect' | 'You-Ship' | 'Prepaid'; routingRef: string; carrier: string; tracking: string; asn: string; cartons: number; shipDate: string; history: string[]; batches?: VendorBatch[]; acknowledgement?: { status: 'processing' | 'completed'; submittedAt: string; transactionId: string; lines?: VendorLine[]; reason?: string } };
export function acknowledgementErrors(lines: VendorLine[], _notes = ''): string[] {
  const errors: string[] = [];
  for (const line of lines) {
    if (![line.ordered, line.accepted, line.backorder, line.rejected].every((qty) => Number.isSafeInteger(qty) && qty >= 0) || line.accepted + line.backorder + line.rejected !== line.ordered) errors.push(`${line.sku}：接受、延期、拒绝之和必须等于订购数量`);
    if (line.rejected > 0 && !vendorRejectionReasons.includes(line.rejectionReason!)) errors.push(`${line.sku}：请选择该行枚举拒绝原因`);
    if (line.backorder > 0 && line.backorderAllowed === false) errors.push(`${line.sku}：该行不允许延期`);
    if (line.backorder > 0 && !validDate(line.scheduledShipDate)) errors.push(`${line.sku}：延期须填写预计发货日`);
  }
  return [...new Set(errors)];
}
export function remainingAccepted(po: VendorPO, sku: string) {
  return (po.lines.find((line) => line.sku === sku)?.accepted ?? 0) - (po.batches ?? []).reduce((sum, batch) => sum + batch.lines.filter((line) => line.sku === sku).reduce((n, line) => n + line.qty, 0), 0);
}
export function batchErrors(po: VendorPO, batch: VendorBatch): string[] {
  const errors: string[] = [];
  if (!batch.warehouseId) errors.push('请选择本批次发货仓库');
  if (!validDate(batch.readyDate)) errors.push('请填写货物就绪日期');
  if (!Number.isSafeInteger(batch.cartons) || batch.cartons < 0 || !Number.isSafeInteger(batch.pallets) || batch.pallets < 0 || batch.cartons + batch.pallets < 1 || !Number.isFinite(batch.weightKg) || batch.weightKg <= 0) errors.push('请填写有效箱数、托盘数及毛重');
  if (!batch.lines.some((line) => line.qty > 0)) errors.push('本批次至少安排一件商品');
  if (new Set(batch.lines.map((line) => line.sku)).size !== batch.lines.length) errors.push('批次商品不能重复');
  for (const line of batch.lines) if (!po.lines.some((item) => item.sku === line.sku) || !Number.isSafeInteger(line.qty) || line.qty < 0 || line.qty > remainingAccepted(po, line.sku)) errors.push(`${line.sku}：批次数量超过未安排的已确认数量`);
  return errors;
}
export const isVendorPrepaid = (batch: Pick<VendorBatch, 'route'>) => batch.route !== 'Collect';
export function routingErrors(batch: VendorBatch): string[] {
  if (isVendorPrepaid(batch)) return ['Prepaid 仅保存商家运输安排，不调用 SubmitShipments'];
  const errors = shipmentPartyErrors(batch);
  if (!['NA', 'EU'].includes(batch.region ?? '')) errors.push('本原型仅支持 NA / EU Collect SubmitShipments');
  if (!Number.isFinite(batch.volumeM3) || batch.volumeM3! <= 0) errors.push('请填写有效体积 m³');
  return errors;
}
export function asnErrors(batch: VendorBatch): string[] {
  const errors: string[] = [];
  if (!['LTL', 'FTL', 'SmallParcel'].includes(batch.shipType ?? '')) errors.push('请选择 ASN 运输类型 LTL / FTL / SmallParcel');
  if (batch.shipType !== 'SmallParcel' && !batch.bol?.trim()) errors.push('LTL / FTL 须填写 BOL 运输提单号');
  if (!batch.tracking.trim()) errors.push('运输参考号不能为空');
  if ((batch.region ?? 'NA') === 'NA' && !batch.carrierScac?.trim()) errors.push('NA ASN 须填写承运商 SCAC');
  if (!validDate(batch.shippedDate) || !validDate(batch.estimatedDeliveryDate) || Date.parse(batch.estimatedDeliveryDate ?? '') < Date.parse(batch.shippedDate ?? '')) errors.push('请填写有效实际发货及预计送达日期（送达不得早于发货）');
  if (isVendorPrepaid(batch) && !batch.carrier.trim()) errors.push('请选择承运商');
  errors.push(...containerErrors(batch));
  return errors;
}
export function acknowledgementRevisionErrors(po: VendorPO, lines: VendorLine[], reason: string): string[] {
  const errors = acknowledgementErrors(lines, reason);
  if (po.acknowledgement?.status === 'processing') errors.push('数量确认正在处理中');
  if (lines.length !== po.lines.length || new Set(lines.map(line => line.sku)).size !== lines.length) errors.push('不可增删确认商品');
  const normalized = normalizeVendorLines(lines);
  for (const old of po.lines) {
    const line = normalized.find(item => item.sku === old.sku);
    if (!line || line.ordered !== old.ordered || line.backorderAllowed !== old.backorderAllowed || JSON.stringify(poValue(normalizeVendorLines([line])[0])) !== JSON.stringify(poValue(normalizeVendorLines(po.lines).find(item => item.sku === old.sku)!))) { errors.push('不可修改订购资料'); continue; }
    if (po.status !== 'pending' && (line.accepted < old.accepted || line.rejected < old.rejected || line.backorder > old.backorder)) errors.push(`${old.sku}：只能将剩余延期转为接受或拒绝，既有承诺及批次数量不可撤回`);
  }
  if (po.status !== 'pending' && !po.lines.some(line => line.backorder > 0)) errors.push('没有待处理的延期数量');
  return [...new Set(errors)];
}
export function submitVendorAcknowledgement(po: VendorPO, lines: VendorLine[], reason: string, now = Date.now()): VendorPO {
  if (acknowledgementRevisionErrors(po, lines, reason).length) return po;
  return { ...po, acknowledgement: { status: 'processing', submittedAt: new Date(now).toISOString(), transactionId: `ACK-${po.id}-${now}`, lines, reason } };
}
export function vendorShipmentStatus(po: VendorPO): VendorPO['status'] {
  if (po.lines.every(line => line.rejected === line.ordered)) return 'rejected';
  const shipped = po.lines.every(line => (po.batches ?? []).filter(batch => batch.status === 'shipped').reduce((sum, batch) => sum + batch.lines.filter(item => item.sku === line.sku).reduce((qty, item) => qty + item.qty, 0), 0) === line.accepted);
  return shipped && po.lines.some(line => line.accepted > 0) ? 'shipped' : 'acknowledged';
}
// Validate against the latest record before committing a UI snapshot. Receipts are advanced separately.
export function vendorMutationErrors(po: VendorPO, next: VendorPO): string[] {
  if (po.id !== next.id || po.connectionId !== next.connectionId || po.reference !== next.reference || JSON.stringify(po.sellingParty) !== JSON.stringify(next.sellingParty) || JSON.stringify(po.shipToParty) !== JSON.stringify(next.shipToParty)) return ['PO 身份及原始参与方不可修改'];
  if (po.acknowledgement?.status === 'processing') return ['数量确认处理中，请等待回执'];
  if (JSON.stringify(po.lines) !== JSON.stringify(next.lines)) return ['数量只能通过异步确认变更'];
  if (next.acknowledgement?.status === 'processing' && next.acknowledgement.transactionId !== po.acknowledgement?.transactionId) {
    if (JSON.stringify(po.batches) !== JSON.stringify(next.batches)) return ['确认与发运不可同时提交'];
    return acknowledgementRevisionErrors(po, next.acknowledgement.lines ?? [], next.acknowledgement.reason ?? '');
  }
  const errors: string[] = [];
  for (const old of po.batches ?? []) {
    const batch = next.batches?.find(item => item.id === old.id);
    if (!batch) { errors.push('不可删除已分配批次'); continue; }
    if (JSON.stringify(old.lines) !== JSON.stringify(batch.lines)) errors.push('已分配数量不可修改');
    if (old.route !== batch.route || old.warehouseId !== batch.warehouseId || old.readyDate !== batch.readyDate || old.cartons !== batch.cartons || old.pallets !== batch.pallets || old.weightKg !== batch.weightKg) errors.push('批次运输条款及包装不可修改');
    if (!['routing_pending', 'routing_failed'].includes(old.status) && (old.routingRef !== batch.routingRef || old.destination !== batch.destination || old.shipFromAddress !== batch.shipFromAddress)) errors.push('路由回执及地址不可修改');
    if (old.status !== 'routing_failed' && ['sellingParty', 'shipFromParty', 'shipToParty', 'region', 'volumeM3'].some(key => old[key as keyof VendorBatch] !== undefined && JSON.stringify(old[key as keyof VendorBatch]) !== JSON.stringify(batch[key as keyof VendorBatch]))) errors.push('已保存节点、目的 DC 及体积不可修改');
    if (JSON.stringify(old) === JSON.stringify(batch)) continue;
    const transitions: Record<VendorBatch['status'], VendorBatch['status'][]> = { transport_ready: ['transport_ready', 'asn_pending'], routing_pending: [], routing_failed: ['routing_failed', 'routing_pending'], routed: ['routed', 'asn_pending'], asn_pending: [], asn_failed: ['asn_failed', 'asn_pending'], asn: ['shipped'], shipped: [] };
    if (!transitions[old.status].includes(batch.status)) errors.push('批次状态已变化，请刷新后重试');
    if (batch.status === 'routing_pending') errors.push(...routingErrors(batch));
    if (batch.status === 'asn_pending') { errors.push(...asnErrors(batch)); if (batch.shipFromParty) errors.push(...shipmentPartyErrors(batch), ...shipmentShapeErrors(po, batch)); }
  }
  const added = (next.batches ?? []).filter(batch => !po.batches?.some(old => old.id === batch.id));
  if (new Set((next.batches ?? []).map(batch => batch.id)).size !== (next.batches ?? []).length) errors.push('批次不能重复');
  let reserved = po;
  for (const batch of added) {
    if (po.status === 'pending' || po.status === 'rejected' || (!po.batches?.length && ['routed', 'asn', 'shipped'].includes(po.status))) errors.push('当前 PO 不可新增批次');
    if (batch.status !== (isVendorPrepaid(batch) ? 'transport_ready' : 'routing_pending')) errors.push('Collect 必须提交 Routing；Prepaid 必须保存运输安排');
    errors.push(...shipmentShapeErrors(reserved, batch), ...(isVendorPrepaid(batch) ? shipmentPartyErrors(batch) : routingErrors(batch)));
    reserved = { ...reserved, batches: [...(reserved.batches ?? []), batch] };
  }
  return [...new Set(errors)];
}
export function advanceVendorPO(po: VendorPO, now = Date.now()): VendorPO {
  let next = po;
  if (po.acknowledgement?.status === 'processing' && now - Date.parse(po.acknowledgement.submittedAt) >= 1200) {
    next = { ...po, lines: po.acknowledgement.lines ?? po.lines, reason: po.acknowledgement.reason ?? po.reason, acknowledgement: { ...po.acknowledgement, status: 'completed' }, history: [...po.history, '本地样例确认完成，可安排发运（未调用 Amazon）。'] };
    next.status = vendorShipmentStatus(next);
  }
  let changed = false;
  const batches = next.batches?.map((batch): VendorBatch => {
    if (!['routing_pending', 'asn_pending'].includes(batch.status) || now - Date.parse(batch.submittedAt) < 1200) return batch;
    changed = true;
    const errors = batch.status === 'routing_pending' ? routingErrors(batch) : asnErrors(batch);
    if (errors.length) return { ...batch, status: batch.status === 'routing_pending' ? 'routing_failed' : 'asn_failed', failure: errors.join('；') };
    return { ...batch, status: batch.status === 'routing_pending' ? 'routed' : 'asn', routingRef: isVendorPrepaid(batch) ? batch.routingRef : batch.routingRef || `LOCAL-RT-${batch.id}`, destination: batch.shipToParty?.partyId || batch.destination, asn: batch.status === 'asn_pending' ? `ASN-${batch.id}` : batch.asn, failure: undefined };
  });
  return changed ? { ...next, batches, history: [...next.history, '本地样例发运结果已更新（未调用 Amazon）。'] } : next;
}

const validDate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value.slice(0, 10);
const dateTime = (value: string) => new Date(value).toISOString();
const poValue = (line: VendorLine) => ({ itemSequenceNumber: line.itemSequenceNumber, vendorProductIdentifier: line.vendorProductIdentifier, amazonProductIdentifier: line.amazonProductIdentifier, unitOfMeasure: line.unitOfMeasure, unitSize: line.unitSize, netCost: line.netCost ? { amount: line.netCost.amount, currencyCode: line.netCost.currencyCode } : undefined });
// Additive defaults for local legacy samples only. Never mutate saved records.
export function normalizeVendorLines(lines: VendorLine[]): VendorLine[] {
  return lines.map((line, index) => ({ ...line, itemSequenceNumber: line.itemSequenceNumber ?? String(index + 1), vendorProductIdentifier: line.vendorProductIdentifier ?? (line.amazonProductIdentifier ? undefined : line.sku), unitOfMeasure: line.unitOfMeasure ?? 'Eaches', netCost: line.netCost ?? { amount: '0', currencyCode: 'USD' } }));
}
function quantity(line: VendorLine, amount: number) {
  return { amount, unitOfMeasure: line.unitOfMeasure ?? 'Eaches', ...(line.unitSize ? { unitSize: line.unitSize } : {}) };
}
function product(line: VendorLine, buyer = false): { vendorProductIdentifier?: string; buyerProductIdentifier?: string; amazonProductIdentifier?: string } {
  return { ...(line.vendorProductIdentifier ? { vendorProductIdentifier: line.vendorProductIdentifier } : {}), ...(line.amazonProductIdentifier ? { [buyer ? 'buyerProductIdentifier' : 'amazonProductIdentifier']: line.amazonProductIdentifier } : {}) };
}
function requireValid(errors: string[]) { if (errors.length) throw new Error([...new Set(errors)].join('；')); }
function poSchemaErrors(po: VendorPO) {
  const errors: string[] = [];
  if (!po.reference.trim()) errors.push('缺少 PO 编号');
  const lines = normalizeVendorLines(po.lines);
  if (!lines.length || new Set(lines.map(line => line.itemSequenceNumber)).size !== lines.length) errors.push('PO 行序号缺失或重复');
  for (const line of lines) {
    if (!line.itemSequenceNumber?.trim() || (!line.vendorProductIdentifier?.trim() && !line.amazonProductIdentifier?.trim())) errors.push(`${line.sku}：须有 PO 行序号及 Vendor Product ID 或 ASIN`);
    if (!['Eaches', 'Cases'].includes(line.unitOfMeasure!) || (line.unitSize !== undefined && (!Number.isSafeInteger(line.unitSize) || line.unitSize < 1))) errors.push(`${line.sku}：数量单位无效`);
    if (!line.netCost || !/^\d+(\.\d+)?$/.test(line.netCost.amount) || !/^[A-Z]{3}$/.test(line.netCost.currencyCode)) errors.push(`${line.sku}：netCost 须含有效 amount / currencyCode（接口描述要求）`);
  }
  return errors;
}
export function buildVendorAcknowledgementPayload(po: VendorPO, sellingParty: VendorParty = po.sellingParty ?? { partyId: '' }, acknowledgementDate = new Date().toISOString()) {
  const lines = normalizeVendorLines(po.lines);
  requireValid([...poSchemaErrors(po), ...acknowledgementErrors(lines), ...(!sellingParty.partyId.trim() ? ['缺少 sellingParty Vendor Code'] : []), ...(!validDate(acknowledgementDate) ? ['确认日期无效'] : [])]);
  return { acknowledgements: [{ purchaseOrderNumber: po.reference, sellingParty, acknowledgementDate: dateTime(acknowledgementDate), items: lines.map(line => ({ itemSequenceNumber: line.itemSequenceNumber!, ...product(line), orderedQuantity: quantity(line, line.ordered), netCost: line.netCost!, itemAcknowledgements: ([['Accepted', line.accepted], ['Backordered', line.backorder], ['Rejected', line.rejected]] as const).filter(([, amount]) => amount > 0).map(([code, amount]) => ({ acknowledgementCode: code, acknowledgedQuantity: quantity(line, amount), ...(code === 'Backordered' ? { scheduledShipDate: dateTime(line.scheduledShipDate!) } : {}), ...(code === 'Rejected' ? { rejectionReason: line.rejectionReason! } : {}) })) })) }] };
}
export function shipmentPartyErrors(batch: VendorBatch): string[] {
  const errors = vendorNodeMappingErrors({ companyId: 'snapshot', merchantScope: 'snapshot', connectionId: 'snapshot', warehouseId: batch.warehouseId, shipFromParty: batch.shipFromParty! });
  if (!batch.sellingParty?.partyId?.trim()) errors.push('缺少 sellingParty Vendor Code');
  if (!batch.shipToParty?.partyId?.trim()) errors.push('缺少 PO 已知 shipToParty DC；不可由 Routing 猜测目的地');
  return errors;
}
export function withVendorShipmentParties(po: VendorPO, batch: VendorBatch, mapping: VendorNodeMapping | undefined, vendorCode: string, region: string): VendorBatch {
  if (!mapping || mapping.connectionId !== po.connectionId || mapping.warehouseId !== batch.warehouseId) throw new Error('当前连接 / 发货仓缺少节点映射');
  requireValid(vendorNodeMappingErrors(mapping));
  return { ...batch, sellingParty: { partyId: vendorCode }, shipFromParty: mapping.shipFromParty, shipToParty: po.shipToParty, region, destination: po.shipToParty?.partyId ?? '', shipFromAddress: Object.values(mapping.shipFromParty.address!).join(', ') };
}
function shipmentLines(po: VendorPO, batch: VendorBatch) {
  return batch.lines.filter(line => line.qty > 0).map(item => {
    const line = normalizeVendorLines(po.lines).find(line => line.sku === item.sku);
    if (!line) throw new Error('批次商品不属于 PO');
    return { itemSequenceNumber: line.itemSequenceNumber!, ...product(line, true), shippedQuantity: quantity(line, item.qty) };
  });
}
function shipmentShapeErrors(po: VendorPO, batch: VendorBatch): string[] {
  const errors = batchErrors({ ...po, batches: po.batches?.filter(row => row.id !== batch.id) }, batch);
  if (!po.shipToParty?.partyId || po.shipToParty.partyId !== batch.shipToParty?.partyId) errors.push('批次 shipToParty 必须匹配 PO 已知 DC');
  if (po.sellingParty?.partyId && po.sellingParty.partyId !== batch.sellingParty?.partyId) errors.push('批次 sellingParty 必须匹配 PO Vendor Code');
  return errors;
}
export function buildVendorRoutingPayload(po: VendorPO, batch: VendorBatch, transactionDate = new Date().toISOString()) {
  requireValid([...poSchemaErrors(po), ...routingErrors(batch), ...shipmentShapeErrors(po, batch), ...(batch.containers?.length ? containerErrors(batch) : []), ...(!validDate(transactionDate) ? ['事务日期无效'] : [])]);
  return { shipments: [{ vendorShipmentIdentifier: batch.id, transactionType: 'New' as const, transactionDate: dateTime(transactionDate), shipmentCreateDate: dateTime(transactionDate), shipmentFreightTerm: 'Collect' as const, sellingParty: batch.sellingParty!, shipFromParty: batch.shipFromParty!, shipToParty: batch.shipToParty!, shipmentMeasurements: { totalCartonCount: batch.cartons, totalPalletStackable: batch.pallets, shipmentWeight: { unitOfMeasure: 'Kg', value: String(batch.weightKg) }, shipmentVolume: { unitOfMeasure: 'CuM', value: String(batch.volumeM3) } }, collectFreightPickupDetails: { requestedPickUp: dateTime(batch.readyDate) }, purchaseOrders: [{ purchaseOrderNumber: po.reference, items: shipmentLines(po, batch) }], ...(batch.containers?.length ? { containers: batch.containers.map((container, index) => { const { shippedQuantity, ...item } = shipmentLines(po, { ...batch, lines: [{ sku: container.sku, qty: container.qty }] })[0]; return { containerType: container.type, containerSequenceNumber: String(index + 1).padStart(3, '0'), containerIdentifiers: [{ containerIdentificationType: container.identifierType, containerIdentificationNumber: container.identifier }], packedItems: [{ ...item, packedQuantity: shippedQuantity }] }; }) } : {}) }] };
}
function containerErrors(batch: VendorBatch): string[] {
  const rows = batch.containers ?? [];
  const errors: string[] = [];
  if (!rows.length) return ['本原型 ASN 仅支持显式单 SKU 箱 / 直接装货托盘，请逐个填写容器及数量；不支持混装、嵌套或仅填写总 SSCC'];
  if (new Set(rows.map(row => row.identifier)).size !== rows.length) errors.push('容器标识不得重复');
  for (const row of rows) {
    if (!['carton', 'pallet'].includes(row.type) || !['SSCC', 'AMZNCC'].includes(row.identifierType) || !row.identifier.trim() || (row.identifierType === 'SSCC' && !/^\d{18}$/.test(row.identifier))) errors.push('容器须填写 SSCC（18 位）或 AMZNCC 标识');
    if (!Number.isSafeInteger(row.qty) || row.qty < 1 || !batch.lines.some(line => line.sku === row.sku && line.qty > 0)) errors.push('每个容器只支持一个本批次 SKU，且数量须为正整数');
    if (batch.shipType === 'SmallParcel' && (row.type !== 'carton' || !row.tracking?.trim())) errors.push('SmallParcel 须逐箱填写追踪号，不支持托盘');
  }
  if (rows.some(row => row.type === 'carton') && rows.some(row => row.type === 'pallet')) errors.push('原型不支持箱托嵌套；请选择单层箱或直接装货托盘');
  if (rows[0]?.type === 'carton' && (rows.length !== batch.cartons || batch.pallets !== 0)) errors.push('单层箱明细须与箱数一致，托盘数须为 0');
  if (rows[0]?.type === 'pallet' && (rows.length !== batch.pallets || batch.cartons !== 0)) errors.push('直接装货托盘须与托盘数一致，箱数须为 0');
  for (const line of batch.lines.filter(line => line.qty > 0)) if (rows.filter(row => row.sku === line.sku).reduce((sum, row) => sum + row.qty, 0) !== line.qty) errors.push(`${line.sku}：容器数量合计须等于本批次发运数量`);
  return errors;
}
export function buildVendorAsnPayload(po: VendorPO, batch: VendorBatch, confirmationDate = new Date().toISOString()) {
  requireValid([...poSchemaErrors(po), ...shipmentPartyErrors(batch), ...shipmentShapeErrors(po, batch), ...asnErrors(batch), ...(!validDate(confirmationDate) ? ['ASN 确认日期无效'] : [])]);
  const lines = normalizeVendorLines(po.lines);
  const containers = (batch.containers ?? []).map((row, index) => {
    const line = lines.find(line => line.sku === row.sku)!;
    const identifiers = [{ containerIdentificationType: row.identifierType, containerIdentificationNumber: row.identifier }];
    const items = [{ itemReference: line.itemSequenceNumber!, shippedQuantity: quantity(line, row.qty), itemDetails: { purchaseOrderNumber: po.reference } }];
    return row.type === 'carton' ? { cartonSequenceNumber: String(index + 1).padStart(3, '0'), cartonIdentifiers: identifiers, ...(row.tracking ? { trackingNumber: row.tracking } : {}), items } : { palletIdentifiers: identifiers, items };
  });
  return { shipmentConfirmations: [{ shipmentIdentifier: batch.id, shipmentConfirmationType: 'Original' as const, shipmentType: batch.shipType === 'LTL' ? 'LessThanTruckLoad' : batch.shipType === 'FTL' ? 'TruckLoad' : 'SmallParcel', shipmentStructure: batch.containers?.[0]?.type === 'pallet' ? 'PalletOfItems' : 'LooseStandardCase', shipmentConfirmationDate: dateTime(confirmationDate), shippedDate: dateTime(batch.shippedDate!), estimatedDeliveryDate: dateTime(batch.estimatedDeliveryDate!), sellingParty: batch.sellingParty!, shipFromParty: batch.shipFromParty!, shipToParty: batch.shipToParty!, transportationDetails: { ...(batch.carrierScac ? { carrierScac: batch.carrierScac } : {}), carrierShipmentReferenceNumber: batch.tracking, ...(batch.shipType !== 'SmallParcel' ? { billOfLadingNumber: batch.bol } : {}) }, shippedItems: shipmentLines(po, batch).map(item => { const { buyerProductIdentifier, ...rest } = item; return { ...rest, ...(buyerProductIdentifier ? { amazonProductIdentifier: buyerProductIdentifier } : {}), itemDetails: { purchaseOrderNumber: po.reference } }; }), ...(batch.containers?.[0]?.type === 'pallet' ? { pallets: containers } : { cartons: containers }) }] };
}
