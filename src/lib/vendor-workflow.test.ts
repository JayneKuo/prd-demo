import { describe, expect, it } from 'vitest';
import { seedVendorNodeMappings } from './vendor-node-mappings';
import { buildVendorAcknowledgementPayload, buildVendorRoutingPayload, buildVendorAsnPayload, normalizeVendorLines, withVendorShipmentParties, acknowledgementErrors, acknowledgementRevisionErrors, advanceVendorPO, asnErrors, batchErrors, remainingAccepted, submitVendorAcknowledgement, vendorMutationErrors, vendorShipmentStatus, type VendorPO, type VendorBatch } from './vendor-workflow';
const po: VendorPO = { id: 'p1', reference: 'PO1', connectionId: 'c1', status: 'acknowledged', lines: [{ sku: 'A', ordered: 100, accepted: 80, backorder: 10, rejected: 10, scheduledShipDate: '2026-12-01', rejectionReason: 'TemporarilyUnavailable' }], sellingParty: { partyId: 'VENDOR' }, shipToParty: { partyId: 'LGB8' }, reason: 'short', route: '', routingRef: '', carrier: '', tracking: '', asn: '', cartons: 0, shipDate: '', history: [] };
const node = seedVendorNodeMappings({ companyId: 'co', merchantScope: 'm', connectionId: 'c1' })[0];
const batch: VendorBatch = { shipFromParty: node.shipFromParty, sellingParty: po.sellingParty, shipToParty: po.shipToParty, region: 'NA', volumeM3: 1.5, shipType: 'LTL', carrierScac: 'ABCD', shippedDate: '2026-12-01', estimatedDeliveryDate: '2026-12-03', containers: Array.from({ length: 4 }, (_, index) => ({ type: 'carton', identifierType: 'AMZNCC', identifier: `AMZN-${index}`, sku: 'A', qty: 10 })), id: 'b1', status: 'routing_pending', lines: [{ sku: 'A', qty: 40 }], warehouseId: 'wh_lax', route: 'Collect', readyDate: '2026-12-01', cartons: 4, pallets: 0, weightKg: 10, routingRef: '', destination: '', carrier: '', tracking: '', asn: '', submittedAt: '2026-11-02T00:00:00Z', transactionId: 'T1', shipFromAddress: '123 Warehouse Ave, Los Angeles, CA 90001', bol: 'BOL1', sscc: 'SSCC1' };
const when = '2026-11-03T10:00:00.000Z';
describe('Official Vendor payload shapes (local builders only)', () => {
  it('builds acknowledgement parties, PO values, quantity units, costs and per-line enums exactly', () => {
    const payload = buildVendorAcknowledgementPayload(po, po.sellingParty, when);
    expect(payload).toEqual({ acknowledgements: [{ purchaseOrderNumber: 'PO1', sellingParty: { partyId: 'VENDOR' }, acknowledgementDate: when, items: [{ itemSequenceNumber: '1', vendorProductIdentifier: 'A', orderedQuantity: { amount: 100, unitOfMeasure: 'Eaches' }, netCost: { amount: '0', currencyCode: 'USD' }, itemAcknowledgements: [
      { acknowledgementCode: 'Accepted', acknowledgedQuantity: { amount: 80, unitOfMeasure: 'Eaches' } },
      { acknowledgementCode: 'Backordered', acknowledgedQuantity: { amount: 10, unitOfMeasure: 'Eaches' }, scheduledShipDate: '2026-12-01T00:00:00.000Z' },
      { acknowledgementCode: 'Rejected', acknowledgedQuantity: { amount: 10, unitOfMeasure: 'Eaches' }, rejectionReason: 'TemporarilyUnavailable' },
    ] }] }] });
    expect(JSON.stringify(payload)).not.toContain('short');
    expect(() => buildVendorAcknowledgementPayload({ ...po, lines: [{ ...po.lines[0], rejectionReason: undefined }] }, po.sellingParty, when)).toThrow('枚举');
    expect(() => buildVendorAcknowledgementPayload({ ...po, lines: [{ ...po.lines[0], netCost: { amount: 'NaN', currencyCode: 'USD' } }] }, po.sellingParty, when)).toThrow('netCost');
  });
  it('builds Collect SubmitShipments with known parties, requested pickup, measurements and PO packing', () => {
    const simple = { ...batch, cartons: 1, containers: [{ type: 'carton' as const, identifierType: 'AMZNCC' as const, identifier: 'AMZN-1', sku: 'A', qty: 40 }] };
    expect(buildVendorRoutingPayload(po, simple, when)).toEqual({ shipments: [{ vendorShipmentIdentifier: 'b1', transactionType: 'New', transactionDate: when, shipmentCreateDate: when, shipmentFreightTerm: 'Collect', sellingParty: { partyId: 'VENDOR' }, shipFromParty: node.shipFromParty, shipToParty: { partyId: 'LGB8' }, shipmentMeasurements: { totalCartonCount: 1, totalPalletStackable: 0, shipmentWeight: { unitOfMeasure: 'Kg', value: '10' }, shipmentVolume: { unitOfMeasure: 'CuM', value: '1.5' } }, collectFreightPickupDetails: { requestedPickUp: '2026-12-01T00:00:00.000Z' }, purchaseOrders: [{ purchaseOrderNumber: 'PO1', items: [{ itemSequenceNumber: '1', vendorProductIdentifier: 'A', shippedQuantity: { amount: 40, unitOfMeasure: 'Eaches' } }] }], containers: [{ containerType: 'carton', containerSequenceNumber: '001', containerIdentifiers: [{ containerIdentificationType: 'AMZNCC', containerIdentificationNumber: 'AMZN-1' }], packedItems: [{ itemSequenceNumber: '1', vendorProductIdentifier: 'A', packedQuantity: { amount: 40, unitOfMeasure: 'Eaches' } }] }] }] });
    expect(() => buildVendorRoutingPayload(po, { ...batch, route: 'Prepaid' }, when)).toThrow('Prepaid');
    expect(() => buildVendorRoutingPayload(po, { ...batch, region: 'FE' }, when)).toThrow('NA / EU');
    expect(() => buildVendorRoutingPayload(po, { ...batch, shipToParty: undefined }, when)).toThrow('目的地');
    expect(() => withVendorShipmentParties(po, batch, { ...node, connectionId: 'wrong' }, 'VENDOR', 'NA')).toThrow('映射');
  });
  it('builds SmallParcel ASN with per-carton AMZNCC, quantity and tracking, omitting BOL', () => {
    const parcel: VendorBatch = { ...batch, cartons: 1, shipType: 'SmallParcel', tracking: 'MASTER', bol: 'must-not-leak', containers: [{ type: 'carton', identifierType: 'AMZNCC', identifier: 'AMZN-1', sku: 'A', qty: 40, tracking: 'BOX-1' }] };
    expect(buildVendorAsnPayload(po, parcel, when)).toEqual({ shipmentConfirmations: [{ shipmentIdentifier: 'b1', shipmentConfirmationType: 'Original', shipmentType: 'SmallParcel', shipmentStructure: 'LooseStandardCase', shipmentConfirmationDate: when, shippedDate: '2026-12-01T00:00:00.000Z', estimatedDeliveryDate: '2026-12-03T00:00:00.000Z', sellingParty: { partyId: 'VENDOR' }, shipFromParty: node.shipFromParty, shipToParty: { partyId: 'LGB8' }, transportationDetails: { carrierScac: 'ABCD', carrierShipmentReferenceNumber: 'MASTER' }, shippedItems: [{ itemSequenceNumber: '1', vendorProductIdentifier: 'A', shippedQuantity: { amount: 40, unitOfMeasure: 'Eaches' }, itemDetails: { purchaseOrderNumber: 'PO1' } }], cartons: [{ cartonSequenceNumber: '001', cartonIdentifiers: [{ containerIdentificationType: 'AMZNCC', containerIdentificationNumber: 'AMZN-1' }], trackingNumber: 'BOX-1', items: [{ itemReference: '1', shippedQuantity: { amount: 40, unitOfMeasure: 'Eaches' }, itemDetails: { purchaseOrderNumber: 'PO1' } }] }] }] });
    expect(asnErrors({ ...parcel, bol: '', sscc: '' })).toEqual([]);
    expect(asnErrors({ ...parcel, carrierScac: '' }).join()).toContain('SCAC');
    expect(asnErrors({ ...parcel, containers: [{ ...parcel.containers![0], tracking: '' }] }).join()).toContain('逐箱');
  });
  it('supports direct-item pallets for LTL/FTL but rejects unsupported mixed/nested packing and total-only SSCC', () => {
    const pallet: VendorBatch = { ...batch, tracking: 'PRO-1', cartons: 0, pallets: 1, containers: [{ type: 'pallet', identifierType: 'SSCC', identifier: '123456789012345678', sku: 'A', qty: 40 }] };
    for (const shipType of ['LTL', 'FTL'] as const) {
      const payload = buildVendorAsnPayload(po, { ...pallet, shipType }, when).shipmentConfirmations[0];
      expect(payload.shipmentType).toBe(shipType === 'LTL' ? 'LessThanTruckLoad' : 'TruckLoad');
      expect(payload.transportationDetails.billOfLadingNumber).toBe('BOL1');
      expect(payload.shipmentStructure).toBe('PalletOfItems');
      expect('pallets' in payload ? payload.pallets[0] : undefined).toEqual({ palletIdentifiers: [{ containerIdentificationType: 'SSCC', containerIdentificationNumber: '123456789012345678' }], items: [{ itemReference: '1', shippedQuantity: { amount: 40, unitOfMeasure: 'Eaches' }, itemDetails: { purchaseOrderNumber: 'PO1' } }] });
    }
    expect(asnErrors({ ...pallet, bol: '' }).join()).toContain('BOL');
    expect(asnErrors({ ...batch, containers: undefined }).join()).toContain('仅支持');
    expect(asnErrors({ ...pallet, containers: [{ ...pallet.containers![0], qty: 39 }] }).join()).toContain('合计');
    expect(asnErrors({ ...pallet, containers: [...pallet.containers!, { type: 'carton', identifierType: 'AMZNCC', identifier: 'x', sku: 'A', qty: 1 }] }).join()).toContain('嵌套');
  });
  it('preserves old fields and safely adds local defaults without changing PO data', () => {
    const before = JSON.stringify(po);
    const normalized = normalizeVendorLines(po.lines);
    expect(normalized[0]).toMatchObject({ itemSequenceNumber: '1', vendorProductIdentifier: 'A', unitOfMeasure: 'Eaches', netCost: { amount: '0', currencyCode: 'USD' } });
    expect(JSON.stringify(po)).toBe(before);
    expect(acknowledgementRevisionErrors(po, normalized, '')).toEqual([]);
    expect(acknowledgementRevisionErrors(po, [{ ...normalized[0], netCost: { amount: '10', currencyCode: 'USD' } }], '')).toContain('不可修改订购资料');
    const asin = normalizeVendorLines([{ ...po.lines[0], amazonProductIdentifier: 'B0ASIN', unitOfMeasure: 'Cases', unitSize: 12, netCost: { amount: '29.50', currencyCode: 'EUR' } }]);
    const ack = buildVendorAcknowledgementPayload({ ...po, lines: asin }, po.sellingParty, when).acknowledgements[0].items[0];
    expect(ack.amazonProductIdentifier).toBe('B0ASIN');
    expect(ack.vendorProductIdentifier).toBeUndefined();
    expect(ack.orderedQuantity).toEqual({ amount: 100, unitOfMeasure: 'Cases', unitSize: 12 });
    expect(ack.netCost).toEqual({ amount: '29.50', currencyCode: 'EUR' });
  });
  it('rejects invalid dates, mismatched parties and readonly PO changes', () => {
    expect(acknowledgementErrors([{ ...po.lines[0], scheduledShipDate: '2026-02-30' }], '').join()).toContain('预计发货日');
    expect(() => buildVendorRoutingPayload(po, { ...batch, shipToParty: { partyId: 'GUESS' } }, when)).toThrow('匹配');
    expect(() => buildVendorAsnPayload(po, { ...batch, tracking: 'PRO', sellingParty: { partyId: 'OTHER' } }, when)).toThrow('Vendor Code');
    expect(vendorMutationErrors(po, { ...po, reference: 'OTHER' }).join()).toContain('身份');
    const multi = { ...po, lines: [...po.lines, { ...po.lines[0], sku: 'B' }] };
    expect(acknowledgementRevisionErrors(multi, normalizeVendorLines(multi.lines), '')).toEqual([]);
  });
  it('saves Prepaid arrangements without SubmitShipments or Routing processing', () => {
    const prepaid: VendorBatch = { ...batch, status: 'transport_ready', route: 'You-Ship', routingRef: '', transactionId: '' };
    const saved = { ...po, batches: [prepaid] };
    expect(vendorMutationErrors(po, saved)).toEqual([]);
    expect(advanceVendorPO(saved, Date.parse(batch.submittedAt) + 5000)).toBe(saved);
    expect(vendorMutationErrors(po, { ...saved, batches: [{ ...prepaid, status: 'routing_pending' }] })).not.toEqual([]);
  });
});
describe('Vendor quantity and routing', () => {
  it('enforces conservation and backorder dates', () => {
    expect(acknowledgementErrors(po.lines, 'short')).toEqual([]);
    expect(acknowledgementErrors([{ ...po.lines[0], accepted: 90 }], 'short')).not.toEqual([]);
    expect(acknowledgementErrors([{ ...po.lines[0], scheduledShipDate: '' }], 'short')).not.toEqual([]);
  });
  it('reserves submitted batches and excludes rejected/deferred stock', () => {
    const reserved = { ...po, batches: [batch] };
    expect(remainingAccepted(reserved, 'A')).toBe(40);
    expect(batchErrors(reserved, { ...batch, id: 'b2', lines: [{ sku: 'A', qty: 41 }] })).not.toEqual([]);
    expect(batchErrors(reserved, { ...batch, id: 'b2', lines: [{ sku: 'A', qty: 40 }] })).toEqual([]);
  });
  it('separates submission from completed acknowledgements and routing receipts', () => {
    const started = Date.parse(batch.submittedAt);
    const pending = { ...po, status: 'pending' as const, acknowledgement: { status: 'processing' as const, submittedAt: batch.submittedAt, transactionId: 'ACK1' } };
    expect(advanceVendorPO(pending, started + 500).status).toBe('pending');
    expect(advanceVendorPO(pending, started + 2000).status).toBe('acknowledged');
    expect(advanceVendorPO({ ...po, batches: [batch] }, started + 2000).batches?.[0].status).toBe('routed');
  });
});
describe('Vendor lifecycle closure', () => {
  it('resolves only deferred quantity asynchronously and reopens shipped accepted quantity', () => {
    const shipped: VendorPO = { ...po, status: 'shipped', batches: [{ ...batch, status: 'shipped', lines: [{ sku: 'A', qty: 80 }] }] };
    const lines = [{ ...po.lines[0], accepted: 86, backorder: 0, rejected: 14 }];
    const submitted = submitVendorAcknowledgement(shipped, lines, '6 now available, 4 unavailable', 10000);
    expect(submitted.lines).toEqual(shipped.lines);
    expect(submitted.status).toBe('shipped');
    expect(vendorMutationErrors(shipped, submitted)).toEqual([]);
    expect(submitVendorAcknowledgement(submitted, lines, 'duplicate')).toBe(submitted);
    expect(vendorMutationErrors(submitted, submitted)).not.toEqual([]);
    const completed = advanceVendorPO(submitted, 12000);
    expect(completed.status).toBe('acknowledged');
    expect(completed.lines[0]).toMatchObject({ accepted: 86, backorder: 0, rejected: 14 });
    expect(remainingAccepted(completed, 'A')).toBe(6);
    expect(completed.batches).toEqual(shipped.batches);
    expect(acknowledgementRevisionErrors(shipped, [{ ...lines[0], accepted: 79, rejected: 21 }], 'bad')).not.toEqual([]);
  });
  it('resolves all remaining deferred quantity as rejected without reopening fulfilled quantities', () => {
    const fulfilled: VendorPO = { ...po, status: 'shipped', batches: [{ ...batch, status: 'shipped', lines: [{ sku: 'A', qty: 80 }] }] };
    const next = advanceVendorPO(submitVendorAcknowledgement(fulfilled, [{ ...po.lines[0], backorder: 0, rejected: 20 }], 'unavailable', 0), 2000);
    expect(next.status).toBe('shipped');
    expect(remainingAccepted(next, 'A')).toBe(0);
  });
  it('keeps routing and ASN failure receipts until same-batch data correction and retry', () => {
    const time = Date.parse(batch.submittedAt) + 2000;
    const failed = advanceVendorPO({ ...po, batches: [{ ...batch, shipFromParty: undefined }] }, time);
    expect(failed.batches?.[0].status).toBe('routing_failed');
    expect(advanceVendorPO(failed, time + 10000)).toBe(failed);
    const retry = { ...failed, batches: [{ ...failed.batches![0], shipFromParty: batch.shipFromParty, status: 'routing_pending' as const, submittedAt: new Date(time).toISOString() }] };
    expect(vendorMutationErrors(failed, retry)).toEqual([]);
    const routed = advanceVendorPO(retry, time + 2000);
    expect(routed.batches![0].status).toBe('routed');
    const failedAsn = advanceVendorPO({ ...routed, batches: [{ ...routed.batches![0], status: 'asn_pending', bol: '', tracking: 'PRO1', submittedAt: new Date(time).toISOString() }] }, time + 2000);
    expect(failedAsn.batches![0].status).toBe('asn_failed');
    expect(advanceVendorPO(failedAsn, time + 10000)).toBe(failedAsn);
    const retryAsn = { ...failedAsn, batches: [{ ...failedAsn.batches![0], status: 'asn_pending' as const, bol: 'BOL-corrected', submittedAt: new Date(time + 2000).toISOString() }] };
    expect(vendorMutationErrors(failedAsn, retryAsn)).toEqual([]);
    const done = advanceVendorPO(retryAsn, time + 4000);
    expect(done.batches![0].status).toBe('asn');
    expect(remainingAccepted(done, 'A')).toBe(40);
    expect(done.batches![0].id).toBe(batch.id);
    expect(vendorMutationErrors(done, { ...done, batches: [{ ...done.batches![0], route: 'You-Ship' }] })).not.toEqual([]);
    expect(vendorMutationErrors(done, { ...done, batches: [{ ...done.batches![0], lines: [{ sku: 'A', qty: 41 }] }] })).not.toEqual([]);
  });
  it('requires ASN references on every batch and prevents duplicate allocations', () => {
    expect(asnErrors({ ...batch, bol: '', sscc: '', tracking: '' })).toHaveLength(2); // BOL + reference; AMZNCC containers do not require SSCC
    const reserved = { ...po, batches: [batch] };
    expect(vendorMutationErrors(reserved, { ...reserved, batches: [batch, batch] })).not.toEqual([]);
    expect(vendorMutationErrors(po, { ...po, batches: [{ ...batch, lines: [{ sku: 'A', qty: 60 }] }, { ...batch, id: 'b2', lines: [{ sku: 'A', qty: 60 }] }] })).not.toEqual([]);
    expect(vendorShipmentStatus(reserved)).toBe('acknowledged');
  });
});
