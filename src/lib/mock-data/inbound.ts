import type { TableColumn } from '@/components/admin/data-table-shell';
import type { InternalLink, ExternalRef } from '@/lib/types/references';

/** 入库单商品行（结构化，含成本信息） */
export type InboundLineItem = {
  /** 商品名称 */
  name: string;
  /** SKU 编码 */
  sku: string;
  /** 计划入库数量 */
  plannedQty: number;
  /** 实收数量（入库完成后填入） */
  receivedQty?: number;
  /** 单位 */
  unit: string;
  /** 采购单价（含税） */
  unitCost?: number;
  /** 小计（= unitCost × plannedQty） */
  totalCost?: number;
  /**
   * 成本录入状态：
   * - entered: 已录入单价
   * - pending: 待录入（入库完成后需补充）
   * - wms_synced: 由 WMS 采购回传自动同步
   */
  costStatus: 'entered' | 'pending' | 'wms_synced';
  /** 批次号 */
  lotNo?: string;
  /** 质检结果 */
  qcResult?: '通过' | '不通过' | '待质检';
  /** 重量 (kg) */
  weight?: number;
};

export type InboundRow = {
  id: string;
  /** 入库单号 (本平台生成) */
  inboundNo: string;
  /** 内部链路 — 本平台单据间的关联 */
  internalLinks: InternalLink[];
  /** 外部引用 — 上游(客户ERP) / 下游(WMS) 的单号 */
  externalRefs: ExternalRef[];
  /** 入库类型: 采购入库 / 退货入库 / 调拨入库 */
  inboundType: string;
  /** 入库状态: 待入库 / 入库中 / 已入库 / 已取消 */
  status: string;
  /** 下游 WMS 作业状态 */
  wmsStatus: string;
  /** 来源: 采购单 / 退货单 / 调拨单 / 手动 */
  source: string;
  /** 供应商 */
  supplier: string;
  /** 仓库 */
  warehouse: string;
  /** 商品摘要 */
  itemsSummary: string;
  /** 商品明细（原始字符串，向后兼容列表页 hover） */
  itemsDetail: string[];
  /** 商品明细（结构化，含成本，用于详情页） */
  lineItems?: InboundLineItem[];
  /** 入库总成本（= Σ lineItems.totalCost） */
  totalCost?: number;
  /** 成本币种 */
  costCurrency?: string;
  /** 总件数 */
  totalQty: number;
  /** 总重量 */
  totalWeight: string;
  /** 预期到货时间 */
  expectedAt: string;
  /** 实际到货时间 */
  arrivedAt: string;
  /** 异常标记 */
  exception: string;
  /** 异常类型: warehouse(仓库作业) / system(系统交互) / quality(质检) */
  exceptionType: string;
  /** 异常详情 */
  exceptionDetail: string;
  /** 推送状态: pending / success / timeout / failed / retry */
  pushStatus: string;
  /** 推送重试次数 */
  pushRetryCount: number;
  /** 最后推送时间 */
  lastPushAt: string;
  /** 创建时间 */
  createdAt: string;
  /** 完成入库时间 */
  completedAt: string;
  /** 店铺 */
  merchant: string;
  /** 质检状态: 待质检 / 质检中 / 质检通过 / 质检不通过 */
  qcStatus: string;
  /** 质检员 */
  qcOperator: string;
  /** 收货员 */
  receiver: string;
  /** 上架员 */
  putawayOperator: string;
};

export const inboundColumns: TableColumn<InboundRow>[] = [
  { key: 'inboundNo', label: '入库单号' },
  { key: 'status', label: '状态', isStatus: true },
  { key: 'inboundType', label: '入库类型' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '仓库' },
  { key: 'wmsStatus', label: '作业状态', isStatus: true },
  { key: 'itemsSummary', label: '商品' },
  { key: 'totalQty', label: '件数' },
  { key: 'exception', label: '异常', isStatus: true },
  { key: 'createdAt', label: '创建时间' }
];

export const inboundOrders: InboundRow[] = [
  {
    id: 'ib_001',
    inboundNo: 'IB-20260604-0001',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260601-0012', id: 'po_012' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8821', source: 'upstream', label: '客户PO' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0081', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '待入库',
    wmsStatus: '待收货',
    source: '采购单',
    supplier: 'Shenzhen Tech Co.',
    warehouse: 'US-West-LAX',
    itemsSummary: '6 件商品',
    itemsDetail: ['Smart Watch Band × 3', 'Screen Protector × 2', 'Charging Dock × 1'],
    lineItems: [
      { name: 'Smart Watch Band', sku: 'SWB-BLK-001', plannedQty: 3, unit: '件', unitCost: 8.50, totalCost: 25.50, costStatus: 'entered', weight: 0.08 },
      { name: 'Screen Protector', sku: 'SP-IP16-001', plannedQty: 2, unit: '件', unitCost: 3.20, totalCost: 6.40, costStatus: 'entered', weight: 0.02 },
      { name: 'Charging Dock', sku: 'CD-USB-001', plannedQty: 1, unit: '件', costStatus: 'pending', weight: 0.15 },
    ],
    totalCost: 31.90,
    costCurrency: 'USD',
    totalQty: 6,
    totalWeight: '2.4 kg',
    expectedAt: '06-06 10:00',
    arrivedAt: '',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-04 09:30',
    createdAt: '06-04 09:00',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '待质检',
    qcOperator: '',
    receiver: '',
    putawayOperator: ''
  },
  {
    id: 'ib_002',
    inboundNo: 'IB-20260604-0002',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260530-0008', id: 'po_008' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8835', source: 'upstream', label: '客户PO' },
      { type: 'erp_order', no: 'ERP-GZ-20260530-112', source: 'upstream', label: '客户ERP单号' },
      { type: 'wms_inbound', no: 'WMS-EWR-IB-20260604-0032', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '入库中',
    wmsStatus: '收货中',
    source: '采购单',
    supplier: 'Guangzhou Electronics',
    warehouse: 'US-East-EWR',
    itemsSummary: '10 件商品',
    itemsDetail: ['Mechanical Keyboard × 3', 'Webcam 4K × 4', 'Ring Light Mini × 3'],
    lineItems: [
      { name: 'Mechanical Keyboard', sku: 'MK-TKL-001', plannedQty: 3, receivedQty: 3, unit: '件', unitCost: 42.00, totalCost: 126.00, costStatus: 'wms_synced', lotNo: 'LOT-MK-0604', qcResult: '待质检', weight: 0.92 },
      { name: 'Webcam 4K', sku: 'WC-4K-001', plannedQty: 4, receivedQty: 4, unit: '件', unitCost: 38.50, totalCost: 154.00, costStatus: 'wms_synced', lotNo: 'LOT-WC-0604', qcResult: '待质检', weight: 0.48 },
      { name: 'Ring Light Mini', sku: 'RL-MINI-001', plannedQty: 3, receivedQty: 3, unit: '件', unitCost: 18.00, totalCost: 54.00, costStatus: 'wms_synced', lotNo: 'LOT-RL-0604', qcResult: '待质检', weight: 0.62 },
    ],
    totalCost: 334.00,
    costCurrency: 'USD',
    totalQty: 10,
    totalWeight: '8.5 kg',
    expectedAt: '06-04 14:00',
    arrivedAt: '06-04 13:45',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-03 16:00',
    createdAt: '06-03 15:30',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '质检中',
    qcOperator: 'Zhang Wei',
    receiver: 'Li Ming',
    putawayOperator: ''
  },
  {
    id: 'ib_003',
    inboundNo: 'IB-20260604-0003',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260528-0003', id: 'po_003' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8790', source: 'upstream', label: '客户PO' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0082', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '已入库',
    wmsStatus: '已上架',
    source: '采购单',
    supplier: 'Dongguan Plastics Ltd',
    warehouse: 'US-West-LAX',
    itemsSummary: '20 件商品',
    itemsDetail: ['Phone Case × 10', 'Tempered Glass × 5', 'USB-C Cable × 5'],
    lineItems: [
      { name: 'Phone Case', sku: 'PC-IP16-BLK', plannedQty: 10, receivedQty: 10, unit: '件', unitCost: 4.80, totalCost: 48.00, costStatus: 'wms_synced', lotNo: 'LOT-PC-0603', qcResult: '通过', weight: 0.05 },
      { name: 'Tempered Glass', sku: 'TG-IP16-001', plannedQty: 5, receivedQty: 5, unit: '件', unitCost: 2.50, totalCost: 12.50, costStatus: 'wms_synced', lotNo: 'LOT-TG-0603', qcResult: '通过', weight: 0.02 },
      { name: 'USB-C Cable 2m', sku: 'UCC-WHT-2M', plannedQty: 5, receivedQty: 5, unit: '件', unitCost: 5.50, totalCost: 27.50, costStatus: 'wms_synced', lotNo: 'LOT-UC-0603', qcResult: '通过', weight: 0.09 },
    ],
    totalCost: 88.00,
    costCurrency: 'USD',
    totalQty: 20,
    totalWeight: '3.2 kg',
    expectedAt: '06-03 09:00',
    arrivedAt: '06-03 08:30',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-02 10:00',
    createdAt: '06-02 09:00',
    completedAt: '06-03 14:00',
    merchant: 'US Store',
    qcStatus: '质检通过',
    qcOperator: 'Wang Lei',
    receiver: 'Li Ming',
    putawayOperator: 'Chen Gang'
  },
  {
    id: 'ib_004',
    inboundNo: 'IB-20260604-0004',
    internalLinks: [
      { type: 'return_order', no: 'RT-20260603-0005', id: 'rt_005' },
      { type: 'sales_order', no: 'SO-20260520-0088', id: 'so_088' }
    ],
    externalRefs: [
      { type: 'channel_order', no: '#SH-7291078', source: 'upstream', label: '客户Shopify单号' },
      { type: 'customer_po', no: 'RMA-20240603-112', source: 'upstream', label: '客户RMA' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0083', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '退货入库',
    status: '入库中',
    wmsStatus: '质检中',
    source: '退货单',
    supplier: '',
    warehouse: 'US-West-LAX',
    itemsSummary: '2 件商品',
    itemsDetail: ['Bluetooth Speaker × 1', 'Wireless Earbuds × 1'],
    totalQty: 2,
    totalWeight: '0.6 kg',
    expectedAt: '06-04 16:00',
    arrivedAt: '06-04 15:30',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-03 18:00',
    createdAt: '06-03 17:30',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '质检中',
    qcOperator: 'Zhang Wei',
    receiver: 'Wang Lei',
    putawayOperator: ''
  },
  {
    id: 'ib_005',
    inboundNo: 'IB-20260604-0005',
    internalLinks: [
      { type: 'transfer', no: 'TF-20260602-0002', id: 'tf_002' }
    ],
    externalRefs: [
      { type: 'erp_order', no: 'XFER-SG-2024-045', source: 'upstream', label: '客户调拨号' },
      { type: 'wms_inbound', no: 'WMS-SG-IB-20260604-0011', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '调拨入库',
    status: '待入库',
    wmsStatus: '待收货',
    source: '调拨单',
    supplier: '',
    warehouse: 'SG-Central',
    itemsSummary: '15 件商品',
    itemsDetail: ['Smart Watch Band × 5', 'Phone Case × 5', 'USB-C Cable × 5'],
    totalQty: 15,
    totalWeight: '2.8 kg',
    expectedAt: '06-07 09:00',
    arrivedAt: '',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-03 10:00',
    createdAt: '06-03 09:30',
    completedAt: '',
    merchant: 'SG Store',
    qcStatus: '待质检',
    qcOperator: '',
    receiver: '',
    putawayOperator: ''
  },
  {
    id: 'ib_006',
    inboundNo: 'IB-20260604-0006',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260529-0015', id: 'po_015' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8802', source: 'upstream', label: '客户PO' },
      { type: 'wms_inbound', no: 'WMS-EWR-IB-20260604-0033', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '入库中',
    wmsStatus: '异常挂起',
    source: '采购单',
    supplier: 'Hangzhou Import Co.',
    warehouse: 'US-East-EWR',
    itemsSummary: '8 件商品',
    itemsDetail: ['LED Ring Light × 2', 'Phone Tripod × 3', 'Selfie Stick × 3'],
    totalQty: 8,
    totalWeight: '4.5 kg',
    expectedAt: '06-04 10:00',
    arrivedAt: '06-04 09:45',
    exception: '数量不符',
    exceptionType: 'quality',
    exceptionDetail: '实收数量与送货单数量不一致: Phone Tripod 实收2件, 送货单3件。已暂停质检流程等待供应商确认。',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-03 14:00',
    createdAt: '06-03 13:30',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '质检不通过',
    qcOperator: 'Zhang Wei',
    receiver: 'Li Ming',
    putawayOperator: ''
  },
  {
    id: 'ib_007',
    inboundNo: 'IB-20260604-0007',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260525-0020', id: 'po_020' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8756', source: 'upstream', label: '客户PO' },
      { type: 'erp_order', no: 'SAP-4500012345', source: 'upstream', label: '客户SAP单号' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0084', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '已入库',
    wmsStatus: '已上架',
    source: '采购单',
    supplier: 'Shenzhen Tech Co.',
    warehouse: 'US-West-LAX',
    itemsSummary: '50 件商品',
    itemsDetail: ['Wireless Charger × 20', 'USB-C Hub × 15', 'Laptop Stand × 15'],
    totalQty: 50,
    totalWeight: '35.0 kg',
    expectedAt: '06-01 09:00',
    arrivedAt: '06-01 08:00',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '05-30 10:00',
    createdAt: '05-30 09:00',
    completedAt: '06-01 16:00',
    merchant: 'US Store',
    qcStatus: '质检通过',
    qcOperator: 'Wang Lei',
    receiver: 'Chen Gang',
    putawayOperator: 'Li Ming'
  },
  {
    id: 'ib_008',
    inboundNo: 'IB-20260604-0008',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260604-0025', id: 'po_025' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8899', source: 'upstream', label: '客户PO' }
    ],
    inboundType: '采购入库',
    status: '待入库',
    wmsStatus: '',
    source: '采购单',
    supplier: 'Guangzhou Electronics',
    warehouse: 'US-West-LAX',
    itemsSummary: '12 件商品',
    itemsDetail: ['Mechanical Keyboard × 4', 'Mouse Pad × 4', 'Wrist Rest × 4'],
    totalQty: 12,
    totalWeight: '6.0 kg',
    expectedAt: '06-08 09:00',
    arrivedAt: '',
    exception: 'WMS未消费',
    exceptionType: 'system',
    exceptionDetail: '入库单已推送至WMS但未收到ACK回执，可能由于WMS服务繁忙或网络超时。',
    pushStatus: 'timeout',
    pushRetryCount: 3,
    lastPushAt: '06-04 10:15',
    createdAt: '06-04 10:00',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '待质检',
    qcOperator: '',
    receiver: '',
    putawayOperator: ''
  },
  {
    id: 'ib_009',
    inboundNo: 'IB-20260604-0009',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260601-0018', id: 'po_018' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'UK-PO-2024-0331', source: 'upstream', label: '客户采购单号' },
      { type: 'wms_inbound', no: 'WMS-UK-IB-20260604-0005', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '入库中',
    wmsStatus: '收货中',
    source: '采购单',
    supplier: 'UK Distributor Ltd',
    warehouse: 'UK-London',
    itemsSummary: '30 件商品',
    itemsDetail: ['Phone Case Premium × 10', 'Screen Protector Pro × 10', 'Charging Cable × 10'],
    totalQty: 30,
    totalWeight: '5.5 kg',
    expectedAt: '06-04 12:00',
    arrivedAt: '06-04 11:30',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-02 09:00',
    createdAt: '06-02 08:30',
    completedAt: '',
    merchant: 'UK Store',
    qcStatus: '质检中',
    qcOperator: 'James Smith',
    receiver: 'David Brown',
    putawayOperator: ''
  },
  {
    id: 'ib_010',
    inboundNo: 'IB-20260604-0010',
    internalLinks: [
      { type: 'return_order', no: 'RT-20260604-0008', id: 'rt_008' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'RMA-20240604-078', source: 'upstream', label: '客户RMA号' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0085', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '退货入库',
    status: '已取消',
    wmsStatus: '',
    source: '退货单',
    supplier: '',
    warehouse: 'US-West-LAX',
    itemsSummary: '1 件商品',
    itemsDetail: ['Damaged Webcam × 1'],
    totalQty: 1,
    totalWeight: '0.3 kg',
    expectedAt: '06-05 10:00',
    arrivedAt: '',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-04 08:00',
    createdAt: '06-04 07:30',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '待质检',
    qcOperator: '',
    receiver: '',
    putawayOperator: ''
  },
  {
    id: 'ib_011',
    inboundNo: 'IB-20260604-0011',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260531-0010', id: 'po_010' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8810', source: 'upstream', label: '客户采购单号' },
      { type: 'wms_inbound', no: 'WMS-DFW-IB-20260604-0002', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '入库中',
    wmsStatus: '上架中',
    source: '采购单',
    supplier: 'Shenzhen Tech Co.',
    warehouse: 'US-Central-DFW',
    itemsSummary: '25 件商品',
    itemsDetail: ['Smart Watch × 10', 'Watch Strap × 10', 'Watch Charger × 5'],
    totalQty: 25,
    totalWeight: '4.0 kg',
    expectedAt: '06-04 08:00',
    arrivedAt: '06-04 07:45',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '06-01 10:00',
    createdAt: '06-01 09:30',
    completedAt: '',
    merchant: 'US Store',
    qcStatus: '质检通过',
    qcOperator: 'Wang Lei',
    receiver: 'Chen Gang',
    putawayOperator: 'Li Ming'
  },
  {
    id: 'ib_012',
    inboundNo: 'IB-20260604-0012',
    internalLinks: [
      { type: 'purchase_order', no: 'PO-20260527-0006', id: 'po_006' }
    ],
    externalRefs: [
      { type: 'customer_po', no: 'CUST-PO-2024-8745', source: 'upstream', label: '客户采购单号' },
      { type: 'erp_order', no: 'DG-ERP-20260527-003', source: 'upstream', label: '供应商送货单' },
      { type: 'wms_inbound', no: 'WMS-LAX-IB-20260604-0086', source: 'downstream', label: 'WMS入库单' }
    ],
    inboundType: '采购入库',
    status: '已入库',
    wmsStatus: '已上架',
    source: '采购单',
    supplier: 'Dongguan Plastics Ltd',
    warehouse: 'US-West-LAX',
    itemsSummary: '100 件商品',
    itemsDetail: ['Phone Case Basic × 50', 'Screen Protector Basic × 30', 'Charging Cable 1m × 20'],
    totalQty: 100,
    totalWeight: '12.0 kg',
    expectedAt: '05-30 09:00',
    arrivedAt: '05-30 08:30',
    exception: '',
    exceptionType: '',
    exceptionDetail: '',
    pushStatus: 'success',
    pushRetryCount: 0,
    lastPushAt: '05-28 10:00',
    createdAt: '05-28 09:00',
    completedAt: '05-30 17:00',
    merchant: 'US Store',
    qcStatus: '质检通过',
    qcOperator: 'Zhang Wei',
    receiver: 'Li Ming',
    putawayOperator: 'Chen Gang'
  }
];
