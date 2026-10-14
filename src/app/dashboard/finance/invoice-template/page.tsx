'use client';

import { useState, useRef, useEffect } from 'react';
import React from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronUp, ChevronDown, EyeOff,
  Plus, Trash2, X, Settings2, Tag,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── 数据维度定义（核心概念）─────────────────────────────────────────────────
// 每张明细表的"数据维度" = 每一行代表什么实体
// 系统在生成发票时，根据维度自动查对应的数据

type Dimension =
  | 'product_line'      // 商品行：每行=一个SKU（用于销售发票）
  | 'order'             // 订单行：每行=一张订单（用于汇总型发票）
  | 'shipment'          // 运单：每行=一个运单号（用于运输账单）
  | 'storage_sku'       // 存储SKU：每行=一个SKU的月度存储记录（3PL）
  | 'warehouse_op'      // 仓库操作：每行=一条操作记录（出入库操作费）
  | 'fee_category'      // 费用类别：每行=一种费用类型（月结汇总）
  | 'surcharge'         // 附加费：每行=一种附加费（明细）
  | 'freight_charge'    // 运费明细行（票结）：每行=单票中的一种费用
  | 'custom';           // 自定义：手工填写，不绑定系统数据

// 每个维度下的系统字段定义
const DIMENSION_FIELDS: Record<Dimension, {
  label: string;      // 维度的中文名
  description: string;
  icon: string;
  fields: { key: string; label: string; type: 'text' | 'number' | 'currency' | 'date' | 'percent'; description: string }[];
}> = {
  product_line: {
    label: '商品行', icon: '📦',
    description: '每行代表订单中的一个商品/SKU',
    fields: [
      { key: 'sku',         label: 'SKU / 货号',   type: 'text',     description: '商品编号' },
      { key: 'product_name',label: '商品名称',      type: 'text',     description: '商品全名' },
      { key: 'spec',        label: '规格/型号',     type: 'text',     description: '商品规格描述' },
      { key: 'hs_code',     label: 'HS 编码',       type: 'text',     description: '海关编码，出口报关必填' },
      { key: 'origin',      label: '原产地',        type: 'text',     description: '商品生产国' },
      { key: 'qty',         label: '数量',          type: 'number',   description: '商品数量' },
      { key: 'unit',        label: '单位',          type: 'text',     description: 'pcs / set / box 等' },
      { key: 'unit_price',  label: '单价',          type: 'currency', description: '商品单价' },
      { key: 'discount_pct',label: '折扣率',        type: 'percent',  description: '如有折扣' },
      { key: 'tax_rate',    label: '税率',          type: 'percent',  description: '适用税率' },
      { key: 'tax_amount',  label: '税额',          type: 'currency', description: '该行税额' },
      { key: 'line_total',  label: '金额小计',      type: 'currency', description: '数量 × 单价（折后）' },
      { key: 'weight',      label: '重量(kg)',      type: 'number',   description: '单件重量' },
      { key: 'total_weight',label: '总重量(kg)',    type: 'number',   description: '该行总重' },
    ],
  },
  order: {
    label: '订单', icon: '🛒',
    description: '每行代表一张销售订单',
    fields: [
      { key: 'order_no',    label: '订单号',        type: 'text',     description: '系统订单编号' },
      { key: 'po_no',       label: 'PO 号',         type: 'text',     description: '客户采购单号' },
      { key: 'order_date',  label: '订单日期',      type: 'date',     description: '' },
      { key: 'ship_date',   label: '发货日期',      type: 'date',     description: '' },
      { key: 'customer',    label: '客户名称',      type: 'text',     description: '' },
      { key: 'sku_count',   label: 'SKU 种类数',    type: 'number',   description: '该订单SKU种类' },
      { key: 'total_qty',   label: '总件数',        type: 'number',   description: '' },
      { key: 'order_total', label: '订单总金额',    type: 'currency', description: '' },
      { key: 'channel',     label: '渠道',          type: 'text',     description: '销售渠道' },
      { key: 'status',      label: '状态',          type: 'text',     description: '' },
    ],
  },
  shipment: {
    label: '运单', icon: '🚚',
    description: '每行代表一个发运单/Tracking号',
    fields: [
      { key: 'tracking_no',  label: '运单号',        type: 'text',     description: 'Tracking Number' },
      { key: 'ship_date',    label: '发货日期',      type: 'date',     description: '' },
      { key: 'carrier',      label: '承运商',        type: 'text',     description: 'FedEx / UPS / DHL 等' },
      { key: 'service_type', label: '服务类型',      type: 'text',     description: 'Ground / Express / Intl' },
      { key: 'origin_city',  label: '起始城市',      type: 'text',     description: '' },
      { key: 'dest_city',    label: '目的城市',      type: 'text',     description: '' },
      { key: 'actual_wt',    label: '实重(kg)',      type: 'number',   description: '' },
      { key: 'bill_wt',      label: '计费重(kg)',    type: 'number',   description: '实重与抛重取较大值' },
      { key: 'base_freight', label: '基础运费',      type: 'currency', description: '' },
      { key: 'fuel_surcharge',label: '燃油附加费',   type: 'currency', description: '' },
      { key: 'res_surcharge', label: '住宅附加费',   type: 'currency', description: '' },
      { key: 'other_surcharge',label: '其他附加费',  type: 'currency', description: '' },
      { key: 'total_charge', label: '合计费用',      type: 'currency', description: '' },
      { key: 'order_ref',    label: '关联订单号',    type: 'text',     description: '' },
    ],
  },
  storage_sku: {
    label: '存储记录（SKU）', icon: '🏭',
    description: '每行代表一个SKU在该账单期间的存储情况',
    fields: [
      { key: 'sku',           label: 'SKU',           type: 'text',     description: '' },
      { key: 'product_name',  label: '商品名称',      type: 'text',     description: '' },
      { key: 'warehouse',     label: '仓库',          type: 'text',     description: '仓库代码' },
      { key: 'avg_units',     label: '月均库存（件）', type: 'number',  description: '周期内日均在库件数' },
      { key: 'max_units',     label: '峰值库存',      type: 'number',   description: '周期内最高库存' },
      { key: 'pallets',       label: '托盘数',        type: 'number',   description: '' },
      { key: 'cubic_meter',   label: '体积(m³)',      type: 'number',   description: '' },
      { key: 'billed_days',   label: '计费天数',      type: 'number',   description: '通常=当月天数' },
      { key: 'storage_rate',  label: '单价（元/件/天）', type: 'currency', description: '合同约定费率' },
      { key: 'base_fee',      label: '标准存储费',    type: 'currency', description: 'avg_units × days × rate' },
      { key: 'oversize_fee',  label: '超尺寸附加',    type: 'currency', description: '' },
      { key: 'longterm_fee',  label: '超期存储费',    type: 'currency', description: '超出合同期限的部分' },
      { key: 'subtotal',      label: '小计',          type: 'currency', description: '' },
    ],
  },
  warehouse_op: {
    label: '仓库操作记录', icon: '⚙️',
    description: '每行代表一条仓库操作（出库/入库/特殊服务）',
    fields: [
      { key: 'op_date',      label: '操作日期',      type: 'date',     description: '' },
      { key: 'order_no',     label: '关联订单/批次', type: 'text',     description: '' },
      { key: 'op_type',      label: '操作类型',      type: 'text',     description: '出库拣货/入库操作/贴标等' },
      { key: 'sku',          label: 'SKU',           type: 'text',     description: '' },
      { key: 'units',        label: '操作件数',      type: 'number',   description: '' },
      { key: 'rate',         label: '单价',          type: 'currency', description: '每件操作费率' },
      { key: 'amount',       label: '金额',          type: 'currency', description: 'units × rate' },
      { key: 'note',         label: '备注',          type: 'text',     description: '' },
    ],
  },
  fee_category: {
    label: '费用类别', icon: '💰',
    description: '每行代表一种费用类型（用于月结汇总表）',
    fields: [
      { key: 'fee_type',    label: '费用类别',      type: 'text',     description: '仓储费/操作费/附加费等' },
      { key: 'description', label: '费用说明',      type: 'text',     description: '详细描述' },
      { key: 'amount',      label: '本期金额',      type: 'currency', description: '该费用类型的本期合计' },
      { key: 'qty_basis',   label: '计费基础',      type: 'text',     description: '如"1,204件×30天"' },
      { key: 'rate_basis',  label: '费率',          type: 'text',     description: '如"$0.05/件/天"' },
      { key: 'appendix_ref',label: '附表引用',      type: 'text',     description: '如"见附表1"' },
    ],
  },
  surcharge: {
    label: '附加费', icon: '➕',
    description: '每行代表一种附加费或调整项',
    fields: [
      { key: 'surcharge_name', label: '附加费名称', type: 'text',     description: '燃油附加/住宅附加/旺季附加等' },
      { key: 'basis',          label: '计费基础',   type: 'text',     description: '基于哪个金额或数量计算' },
      { key: 'rate',           label: '费率',       type: 'text',     description: '百分比或固定单价' },
      { key: 'qty',            label: '数量',       type: 'number',   description: '' },
      { key: 'amount',         label: '金额',       type: 'currency', description: '' },
    ],
  },
  custom: {
    label: '自定义（手工填写）', icon: '✏️',
    description: '不绑定系统数据，内容手工填写',
    fields: [],
  },
  freight_charge: {
    label: '运费明细行（票结）', icon: '🧾',
    description: '每行代表单票中的一项费用（基础运费/附加费等）',
    fields: [
      { key: 'charge_name',   label: '费用项目',    type: 'text',     description: '基础运费/燃油附加/住宅附加等' },
      { key: 'charge_basis',  label: '计费基础',    type: 'text',     description: '如 14kg × $3.00' },
      { key: 'charge_rate',   label: '单价/费率',   type: 'text',     description: '单价或百分比' },
      { key: 'charge_qty',    label: '数量/基数',   type: 'text',     description: '计费重量或基础金额' },
      { key: 'charge_amount', label: '金额',         type: 'currency', description: '该费用项合计' },
    ],
  },
};

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

type TemplateType = 'sales' | 'monthly' | '3pl' | 'freight_monthly' | 'freight_per';

// 列定义：既有"系统字段绑定"，也有"自定义字段"
type ColDef = {
  id: string;
  label: string;           // 发票上显示的列名（可改）
  boundField?: string;     // 绑定的系统字段 key（来自 DIMENSION_FIELDS）
  fieldType: 'system' | 'custom' | 'formula';
  formula?: string;        // 公式列，如 "{qty} × {unit_price}"
  dataType: 'text' | 'number' | 'currency' | 'date' | 'percent';
  align: 'left' | 'center' | 'right';
  w: number;
  visible: boolean;
  required: boolean;
};

type KVRow  = { id: string; key: string; val: string };
type SumRow = { id: string; cat: string; amount: string; note: string; appendix: string };

type BlockType = 'info_block' | 'data_table' | 'totals' | 'payment' | 'text';

type DocBlock = {
  id: string; type: BlockType; title: string;
  visible: boolean; required: boolean;
  // info_block
  kvRows?: KVRow[];
  // data_table
  dimension?: Dimension;
  columns?: ColDef[];
  isAppendix?: boolean;
  appendixNo?: number;
  // summary (fee_category dimension)
  sumRows?: SumRow[];
  // layout — 宽度，支持并排排列
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  // totals
  totalLabel?: string; subtotalLabel?: string; showPrevBal?: boolean;
  // payment / text
  content?: string; lateFee?: string;
};

// ─── 颜色 ─────────────────────────────────────────────────────────────────────

type CS = { header: string; accent: string; light: string; border: string };
const COLORS: Record<string, CS> = {
  blue:    { header: '#1e3a8a', accent: '#2563eb', light: '#eff6ff', border: '#bfdbfe' },
  slate:   { header: '#1e293b', accent: '#475569', light: '#f8fafc', border: '#e2e8f0' },
  emerald: { header: '#064e3b', accent: '#059669', light: '#ecfdf5', border: '#a7f3d0' },
  violet:  { header: '#3b0764', accent: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe' },
  amber:   { header: '#78350f', accent: '#d97706', light: '#fffbeb', border: '#fde68a' },
  rose:    { header: '#881337', accent: '#e11d48', light: '#fff1f2', border: '#fecdd3' },
};

// 确定性 ID 生成器，每次工厂调用前重置，避免 SSR/客户端 hydration 不一致
let _uidCount = 0;
function resetUid() { _uidCount = 0; }
function uid() { return `b${_uidCount++}`; }

// ─── 列的示例值（预览用）─────────────────────────────────────────────────────

const SAMPLE_VALUES: Record<string, string[]> = {
  sku:          ['SWP-A001',     'CKS-B002',      'EWY-C003',    'SHP-0001'],
  product_name: ['Smart Widget Pro', 'Connector Kit', 'Warranty 1Y', 'Shipping'],
  spec:         ['Model A',      'Standard',      'Annual',      '—'],
  hs_code:      ['8471.30',      '8544.42',       'N/A',         'N/A'],
  origin:       ['CN',           'CN',            'US',          'US'],
  qty:          ['50',           '100',           '1',           '1'],
  unit:         ['pcs',          'set',           'svc',         'lot'],
  unit_price:   ['$280.00',      '$45.00',        '$680.00',     '$180.00'],
  discount_pct: ['5%',           '—',             '—',           '—'],
  tax_rate:     ['0%',           '0%',            '0%',          '0%'],
  tax_amount:   ['$0.00',        '$0.00',         '$0.00',       '$0.00'],
  line_total:   ['$13,300.00',   '$4,500.00',     '$680.00',     '$180.00'],
  weight:       ['0.8 kg',       '0.3 kg',        '0.05 kg',     '—'],
  total_weight: ['40 kg',        '30 kg',         '0.05 kg',     '—'],
  // order dim
  order_no:     ['SO-2026-0842', 'SO-2026-0901',  'SO-2026-0812','SO-2026-0761'],
  po_no:        ['PO-TC-8821',   'PO-TC-8901',    '—',           'PO-MWD-4421'],
  order_date:   ['2026-10-01',   '2026-10-05',    '2026-10-08',  '2026-10-12'],
  ship_date:    ['2026-10-03',   '2026-10-07',    '2026-10-10',  '2026-10-15'],
  customer:     ['TechCorp Inc.','TechCorp Inc.',  'Pacific Traders','MidWest Dist.'],
  sku_count:    ['3',            '2',             '4',           '1'],
  total_qty:    ['152',          '84',            '220',         '60'],
  order_total:  ['$18,660.00',   '$8,340.00',     '$24,800.00',  '$5,400.00'],
  channel:      ['Direct',       'Direct',        'EDI',         'EDI'],
  status:       ['已发货',       '已发货',        '已发货',      '已发货'],
  // shipment dim
  tracking_no:  ['SHP-1TX9821',  'SHP-2UX0033',   'SHP-3AX4412', '（共24票）'],
  carrier:      ['FedEx',        'FedEx',         'UPS',         '—'],
  service_type: ['Ground',       'Express',       'Ground',      '—'],
  origin_city:  ['LAX',          'LAX',           'LAX',         '—'],
  dest_city:    ['NYC',          'MIA',           'CHI',         '—'],
  actual_wt:    ['12 kg',        '8 kg',          '22 kg',       '—'],
  bill_wt:      ['12 kg',        '8 kg',          '24 kg',       '—'],
  base_freight: ['$42.00',       '$68.00',        '$88.00',       '$1,842.00'],
  fuel_surcharge:['$4.20',       '$6.80',         '$8.80',       '$184.20'],
  res_surcharge: ['$4.20',       '$4.20',         '—',           '$126.00'],
  other_surcharge:['—',          '$2.60',         '$12.00',      '$156.80'],
  total_charge: ['$50.40',       '$81.60',        '$108.80',     '$2,309.00'],
  order_ref:    ['SO-0821',      'SO-0901',       'SO-0812',     '—'],
  // storage_sku dim
  avg_units:    ['500',          '704',           '200',         '（合计）'],
  max_units:    ['620',          '850',           '240',         '—'],
  pallets:      ['4',            '6',             '2',           '—'],
  cubic_meter:  ['3.2',          '4.8',           '1.6',         '—'],
  billed_days:  ['30',           '30',            '30',          '—'],
  storage_rate: ['$0.05',        '$0.05',         '$0.05',       '—'],
  base_fee:     ['$750.00',      '$1,056.00',     '$300.00',     '$2,106.00'],
  oversize_fee: ['—',            '$50.20',        '—',           '$50.20'],
  longterm_fee: ['—',            '—',             '$454.00',     '$454.00'],
  subtotal:     ['$750.00',      '$1,106.20',     '$754.00',     '$2,610.20'],
  // warehouse_op dim
  op_date:      ['2026-09-05',   '2026-09-05',    '2026-09-14',  '—'],
  op_type:      ['出库拣货',     '出库打包',      '入库操作',    '（合计）'],
  units:        ['86',           '86',            '420',         '592'],
  op_rate:      ['$1.20/件',     '$0.30/件',      '$0.80/件',    '—'],
  op_amount:    ['$103.20',      '$25.80',        '$336.00',     '$465.00'],
  note:         ['SO-0821',      'SO-0821',       'INB-20260901','—'],
  // fee_category dim
  fee_type:     ['仓储费',       '出库操作费',    '入库操作费',  '附加费'],
  description:  ['月均库存存储', '拣货打包', '入库操作处理', '旺季+超期'],
  fee_amount:   ['$2,560.20',    '$532.80',       '$336.00',     '$920.00'],
  qty_basis:    ['1,204件×30天', '2批次/296件',   '1批次/420件', '—'],
  rate_basis:   ['$0.05/件/天',  '$1.50+$0.30',   '$0.80',       '—'],
  appendix_ref: ['见附表1',      '见附表2',       '见附表3',     '见附表4'],
  // surcharge dim
  surcharge_name:['燃油附加费','住宅派送附加费', '旺季附加费',  '超期存储附加费'],
  basis:        ['基础运费10%', '7票×$18',       '存储费10%',   '42件×$7.5'],
  rate:         ['10%',         '$18/票',        '10%',         '$7.5/件'],
  s_amount:     ['$184.20',     '$126.00',        '$210.60',     '$315.00'],
  // freight_per 票结：每行=一种费用项
  charge_name:  ['基础运费',           '燃油附加费',         '住宅派送附加',  '超尺寸附加费'],
  charge_basis: ['14kg × $3.00/kg',    '10% × $42.00',      '固定每票',      '超出规格附加'],
  charge_rate:  ['$3.00/kg',           '10%',               '$4.20',         '$12.00'],
  charge_qty:   ['14 kg',              '$42.00',            '1票',           '1票'],
  charge_amount:['$42.00',             '$4.20',             '$4.20',         '$12.00'],
};

function getSampleVal(key: string, rowIdx: number): string {
  const arr = SAMPLE_VALUES[key];
  if (!arr) return `{${key}}`;
  return arr[rowIdx % arr.length] ?? `{${key}}`;
}

// ─── 宽度工具 ─────────────────────────────────────────────────────────────────

type BlockWidth = 'full' | 'half' | 'third' | 'two-thirds';
const WIDTH_FLEX: Record<BlockWidth, string> = {
  full:       '0 0 100%',
  half:       '0 0 50%',
  third:      '0 0 33.33%',
  'two-thirds':'0 0 66.67%',
};
const WIDTH_PX: Record<BlockWidth, number> = {
  full: 100, half: 50, third: 33, 'two-thirds': 67,
};

// 把可见区块分组成"行"（同行的并排显示）
function groupIntoRows(blocks: DocBlock[]): DocBlock[][] {
  const rows: DocBlock[][] = [];
  let row: DocBlock[] = [];
  let rowTotal = 0;
  for (const b of blocks) {
    const w = WIDTH_PX[b.width ?? 'full'];
    if (w >= 100) {
      if (row.length) { rows.push(row); row = []; rowTotal = 0; }
      rows.push([b]);
    } else {
      row.push(b);
      rowTotal += w;
      if (rowTotal >= 99) { rows.push(row); row = []; rowTotal = 0; }
    }
  }
  if (row.length) rows.push(row);
  return rows;
}

// ─── 预定义费用类别（用于行配置）────────────────────────────────────────────

const PRESET_FEE_ROWS: Record<string, string[]> = {
  fee_category: ['仓储费', '出库操作费', '入库操作费', '打包材料费', '贴标服务费', '组套服务费', '退货处理费', '旺季附加费', '超期存储费', '峰值库存附加', '损耗费', '其他服务费'],
  surcharge:    ['燃油附加费', '住宅派送附加费', '超尺寸附加费', '超重附加费', '偏远地区附加费', '地址纠正费', '签名确认费', '派送时间窗口费', '旺季附加费', '临时附加费'],
  freight_charge:['基础运费', '燃油附加费', '住宅派送附加', '超尺寸附加', '超重附加', '偏远地区附加', '地址纠正', '签名确认', '提货费', '仓储处理费'],
};

function makeCol(label: string, key: string, type: ColDef['dataType'], align: ColDef['align'], w: number, required = false): ColDef {
  const df = DIMENSION_FIELDS;
  // Find which dimension this field belongs to
  const fType = Object.values(df).flatMap(d => d.fields).find(f => f.key === key)?.type ?? type;
  return { id: uid(), label, boundField: key, fieldType: 'system', dataType: fType, align, w, visible: true, required };
}

function makeCustomCol(label: string, align: ColDef['align'], w: number): ColDef {
  return { id: uid(), label, fieldType: 'custom', dataType: 'text', align, w, visible: true, required: false };
}

const PRESETS: { id: TemplateType; name: string; tag: string; color: string; desc: string; factory: () => DocBlock[] }[] = [
  {
    id: 'sales', name: 'B2B 销售发票', tag: '销售', color: 'blue',
    desc: '标准销售发票，每行=一个商品SKU',
    factory: () => [
      { id: uid(), type: 'info_block', title: '发票信息', visible: true, required: true, kvRows: [
        { id: uid(), key: 'From',      val: 'Your Company Inc. · finance@company.com' },
        { id: uid(), key: 'Bill To',   val: '[客户名称 · 地址]' },
        { id: uid(), key: 'Invoice #', val: '{invoice_no}' },
        { id: uid(), key: 'Date',      val: '{invoice_date}' },
        { id: uid(), key: 'Due Date',  val: '{due_date}' },
        { id: uid(), key: 'Terms',     val: 'Net 30' },
      ]},
      { id: uid(), type: 'data_table', title: '商品明细', dimension: 'product_line', visible: true, required: true,
        columns: [
          makeCol('商品描述',    'product_name', 'text',     'left',   34, true),
          makeCol('SKU',         'sku',          'text',     'left',   12),
          makeCol('HS 编码',     'hs_code',      'text',     'center', 9),
          makeCol('原产地',      'origin',       'text',     'center', 8),
          makeCol('数量',        'qty',          'number',   'center', 7, true),
          makeCol('单位',        'unit',         'text',     'center', 6),
          makeCol('单价',        'unit_price',   'currency', 'right',  12, true),
          makeCol('折扣',        'discount_pct', 'percent',  'right',  7),
          makeCol('税率',        'tax_rate',     'percent',  'right',  7),
          makeCol('金额',        'line_total',   'currency', 'right',  12, true),
        ],
      },
      { id: uid(), type: 'totals', title: '金额汇总', visible: true, required: true, totalLabel: 'TOTAL DUE', subtotalLabel: 'Subtotal', showPrevBal: false },
      { id: uid(), type: 'payment', title: '付款说明', visible: true, required: false, content: '请在到期日前通过银行转账付款，汇款时注明发票编号。', lateFee: '逾期30天未付款，将按1.5%/月收取滞纳金。' },
      { id: uid(), type: 'text', title: '页脚', visible: true, required: false, content: '感谢您的合作。' },
    ],
  },
  {
    id: 'monthly', name: '月结账单', tag: '月结', color: 'emerald',
    desc: '月度对账单，汇总行+多张附表',
    factory: () => [
      { id: uid(), type: 'info_block', title: '账单信息', visible: true, required: true, kvRows: [
        { id: uid(), key: '服务提供方',  val: 'Your Company Inc.' },
        { id: uid(), key: '账单方',      val: '[客户名称]' },
        { id: uid(), key: '账单编号',    val: '{statement_no}' },
        { id: uid(), key: '账单期间',    val: '{period_start} ~ {period_end}' },
        { id: uid(), key: '结算方式',    val: '月结（Monthly Settlement）' },
        { id: uid(), key: '到期日',      val: '{due_date}（Net 30）' },
      ]},
      { id: uid(), type: 'data_table', title: '费用汇总', dimension: 'fee_category', visible: true, required: true,
        columns: [
          makeCol('费用类别',    'fee_type',    'text',     'left',   22, true),
          makeCol('计费基础',    'qty_basis',   'text',     'left',   22),
          makeCol('费率',        'rate_basis',  'text',     'left',   14),
          makeCol('本期金额',    'amount',      'currency', 'right',  16, true),
          makeCol('附表引用',    'appendix_ref','text',     'center', 12),
        ],
        sumRows: [
          { id: uid(), cat: '仓储费',    amount: '$2,560.20', note: '月均库存1,204件×30天', appendix: '见附表1' },
          { id: uid(), cat: '出库操作费',amount: '$532.80',   note: '2批次，592件',          appendix: '见附表2' },
          { id: uid(), cat: '入库操作费',amount: '$336.00',   note: '1批次，420件',          appendix: '见附表3' },
          { id: uid(), cat: '附加费',    amount: '+$920.00',  note: '旺季+超期附加',         appendix: '见附表4' },
        ],
      },
      { id: uid(), type: 'totals', title: '本期应付', visible: true, required: true, totalLabel: '本次应付', subtotalLabel: '本期费用合计', showPrevBal: true },
      { id: uid(), type: 'payment', title: '付款说明', visible: true, required: false, content: '请在到期日前通过银行转账付款，转账时注明账单编号。', lateFee: '如有争议，请在收到账单后10个工作日内书面提出。' },
      { id: uid(), type: 'data_table', title: '附表1：仓储费明细', dimension: 'storage_sku', visible: true, required: false, isAppendix: true, appendixNo: 1,
        columns: [
          makeCol('SKU',          'sku',          'text',     'left',   10, true),
          makeCol('商品名称',     'product_name', 'text',     'left',   20),
          makeCol('月均库存(件)', 'avg_units',    'number',   'right',  12),
          makeCol('计费天数',     'billed_days',  'number',   'center', 10),
          makeCol('费率/件/天',   'storage_rate', 'currency', 'right',  12),
          makeCol('标准存储费',   'base_fee',     'currency', 'right',  13, true),
          makeCol('超期附加费',   'longterm_fee', 'currency', 'right',  12),
          makeCol('小计',         'subtotal',     'currency', 'right',  12, true),
        ],
      },
      { id: uid(), type: 'data_table', title: '附表2：出库操作费明细', dimension: 'warehouse_op', visible: true, required: false, isAppendix: true, appendixNo: 2,
        columns: [
          makeCol('日期',         'op_date',      'date',     'center', 12, true),
          makeCol('关联订单',     'order_no',     'text',     'left',   16),
          makeCol('操作类型',     'op_type',      'text',     'left',   16),
          makeCol('件数',         'units',        'number',   'center', 8),
          makeCol('单价',         'rate',         'text',     'right',  10),
          makeCol('金额',         'amount',       'currency', 'right',  12, true),
        ],
      },
      { id: uid(), type: 'data_table', title: '附表3：附加费明细', dimension: 'surcharge', visible: true, required: false, isAppendix: true, appendixNo: 3,
        columns: [
          makeCol('附加费名称',   'surcharge_name','text',    'left',   24, true),
          makeCol('计费基础',     'basis',         'text',    'left',   22),
          makeCol('费率',         'rate',          'text',    'right',  12),
          makeCol('金额',         'amount',        'currency','right',  14, true),
        ],
      },
    ],
  },
  {
    id: '3pl', name: '3PL 仓储账单', tag: '仓储', color: 'slate',
    desc: '3PL月度账单，存储+操作+附加费',
    factory: () => {
      const base = PRESETS[1].factory();
      const info = base[0];
      if (info.kvRows) {
        info.kvRows = [
          { id: uid(), key: '仓储服务商',  val: 'Your Company Inc. (3PL)' },
          { id: uid(), key: '商户名称',    val: '[商户名称]' },
          { id: uid(), key: '仓库',        val: 'US-LAX-01' },
          { id: uid(), key: '服务期间',    val: '2026-09-01 ~ 2026-09-30' },
          { id: uid(), key: '账单编号',    val: '{bill_no}' },
          { id: uid(), key: '合同编号',    val: '{contract_no}' },
          { id: uid(), key: '结算周期',    val: '月结30天' },
        ];
      }
      return base;
    },
  },
  {
    id: 'freight_monthly', name: '运输账单（月结）', tag: '运输月结', color: 'amber',
    desc: '整月所有运单汇总，每行=一个运单号',
    factory: () => [
      { id: uid(), type: 'info_block', title: '运输账单信息', visible: true, required: true, kvRows: [
        { id: uid(), key: '承运商',     val: 'Your Logistics Co.' },
        { id: uid(), key: '账单方',     val: '[商户/账户编号]' },
        { id: uid(), key: '账单编号',   val: '{bill_no}' },
        { id: uid(), key: '账单期间',   val: '{period_start} ~ {period_end}' },
        { id: uid(), key: '结算方式',   val: '月结（Monthly）' },
        { id: uid(), key: '计费规则',   val: '实重与抛重(L×W×H/5000)取较大值' },
        { id: uid(), key: '到期日',     val: '{due_date}（Net 14）' },
      ]},
      { id: uid(), type: 'data_table', title: '运单明细（每行=一票）', dimension: 'shipment', visible: true, required: true,
        columns: [
          makeCol('日期',      'ship_date',     'date',     'center', 9,  true),
          makeCol('运单号',    'tracking_no',   'text',     'left',   15, true),
          makeCol('服务',      'service_type',  'text',     'left',   8),
          makeCol('起始',      'origin_city',   'text',     'center', 6),
          makeCol('目的',      'dest_city',     'text',     'center', 6),
          makeCol('实重(kg)',  'actual_wt',     'number',   'right',  8),
          makeCol('计费重',    'bill_wt',       'number',   'right',  8),
          makeCol('基础运费',  'base_freight',  'currency', 'right',  10, true),
          makeCol('附加费',    'fuel_surcharge','currency', 'right',  8),
          makeCol('合计',      'total_charge',  'currency', 'right',  10, true),
        ],
      },
      { id: uid(), type: 'data_table', title: '附加费明细（可选附表）', dimension: 'surcharge', visible: false, required: false, isAppendix: true, appendixNo: 1,
        columns: [
          makeCol('运单号',        'tracking_no',    'text',     'left',   16),
          makeCol('附加费类型',    'surcharge_name', 'text',     'left',   20, true),
          makeCol('计费基础',      'basis',          'text',     'left',   18),
          makeCol('费率',          'rate',           'text',     'right',  10),
          makeCol('金额',          'amount',         'currency', 'right',  12, true),
        ],
      },
      { id: uid(), type: 'totals', title: '月度合计', visible: true, required: true, totalLabel: '本月运费合计', subtotalLabel: '各项费用小计', showPrevBal: true },
      { id: uid(), type: 'payment', title: '付款说明', visible: true, required: false, content: '请在到期日前通过银行转账付款，运单原始记录可按需提供。', lateFee: '如有争议，请在5个工作日内书面通知，逾期视为确认。' },
    ],
  },
  {
    id: 'freight_per', name: '运输账单（票结）', tag: '运输票结', color: 'rose',
    desc: '单票结算，一张发票对应一个运单，逐项列出费用构成',
    factory: () => [
      { id: uid(), type: 'info_block', title: '货物 & 运单信息', visible: true, required: true, kvRows: [
        { id: uid(), key: '承运商',           val: 'Your Logistics Co.' },
        { id: uid(), key: '账单方',           val: '[商户名称]' },
        { id: uid(), key: '发票编号',         val: '{invoice_no}' },
        { id: uid(), key: '发票日期',         val: '{invoice_date}' },
        { id: uid(), key: '付款到期',         val: '{due_date}（Net 14）' },
        { id: uid(), key: '运单号',           val: '{tracking_no}' },
        { id: uid(), key: '服务类型',         val: '{service_type}' },
        { id: uid(), key: '提货日期',         val: '{pickup_date}' },
        { id: uid(), key: '预计送达',         val: '{est_delivery}' },
        { id: uid(), key: '起始',             val: '{origin_city} {origin_zip}' },
        { id: uid(), key: '目的',             val: '{dest_city} {dest_zip}' },
        { id: uid(), key: '实际重量',         val: '{actual_weight} kg' },
        { id: uid(), key: '计费重量',         val: '{bill_weight} kg（DIM: L×W×H÷5000）' },
        { id: uid(), key: '关联订单',         val: '{order_ref}' },
      ]},
      // ── 费用明细表：每行=一种费用（票结与月结的核心区别在这里）
      { id: uid(), type: 'data_table', title: '费用明细（每行=一种费用，维度：运费明细行）', dimension: 'freight_charge', visible: true, required: true,
        columns: [
          makeCol('费用项目',   'charge_name',   'text',     'left',   30, true),
          makeCol('计费基础',   'charge_basis',  'text',     'left',   28),
          makeCol('单价/费率',  'charge_rate',   'text',     'right',  14),
          makeCol('金额',       'charge_amount', 'currency', 'right',  14, true),
        ],
        sumRows: [
          { id: uid(), cat: '基础运费',      amount: '$42.00', note: '14kg × $3.00/kg',  appendix: '' },
          { id: uid(), cat: '燃油附加费',    amount: '$4.20',  note: '10% × $42.00',     appendix: '' },
          { id: uid(), cat: '住宅派送附加',  amount: '$4.20',  note: '固定费率/票',       appendix: '' },
          { id: uid(), cat: '超尺寸附加费',  amount: '$0.00',  note: '不适用本票',        appendix: '' },
        ],
      },
      { id: uid(), type: 'totals', title: '本票合计', visible: true, required: true, totalLabel: '本票运费合计', subtotalLabel: '小计', showPrevBal: false },
      { id: uid(), type: 'payment', title: '付款说明', visible: true, required: false,
        content: '请在发票到期日前通过银行转账付款，转账时请注明发票编号及运单号。',
        lateFee: '如有异议请在3个工作日内联系客服，逾期视为确认。',
      },
    ],
  },
];

// 初始状态：只在模块加载时运行一次，服务端和客户端结果一致
const INITIAL_BLOCKS = (() => { resetUid(); return PRESETS[1].factory(); })();
const INITIAL_COLOR = PRESETS[1].color;
const INITIAL_TYPE: TemplateType = 'monthly';

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function InvoiceTemplatePage() {
  const [type,    setType]    = useState<TemplateType>(INITIAL_TYPE);
  const [blocks,  setBlocks]  = useState<DocBlock[]>(INITIAL_BLOCKS);
  const [color,   setColor]   = useState(INITIAL_COLOR);
  const [saved,   setSaved]   = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // 选中的区块
  // 列管理器：哪个 block 正在开管理器
  const [colMgrBlock, setColMgrBlock] = useState<string | null>(null);
  // 列管理器 tab
  const [colMgrTab, setColMgrTab] = useState<'fields' | 'custom'>('fields');

  function loadTemplate(t: TemplateType) {
    const p = PRESETS.find(x => x.id === t)!;
    resetUid();   // 重置计数器，保证服务端和客户端 ID 一致
    setType(t);
    setColor(p.color);
    setBlocks(p.factory());
    setColMgrBlock(null);
  }

  function updateBlock(id: string, patch: Partial<DocBlock>) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }
  function toggleBlock(id: string) {
    setBlocks(prev => prev.map(b => b.id === id && !b.required ? { ...b, visible: !b.visible } : b));
  }
  function moveBlock(id: string, dir: 'up' | 'down') {
    setBlocks(prev => {
      const arr = [...prev]; const i = arr.findIndex(b => b.id === id);
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]]; return arr;
    });
  }
  function addAppendixBlock() {
    const nos = blocks.filter(b => b.appendixNo).map(b => b.appendixNo!);
    const no = nos.length > 0 ? Math.max(...nos) + 1 : 1;
    setBlocks(prev => [...prev, {
      id: uid(), type: 'data_table', title: `附表${no}：新增明细`, visible: true, required: false,
      isAppendix: true, appendixNo: no, dimension: 'custom',
      columns: [
        makeCol('描述', 'product_name', 'text', 'left', 30, true),
        { id: uid(), label: '数量', boundField: 'qty', fieldType: 'system', dataType: 'number', align: 'right', w: 10, visible: true, required: false },
        { id: uid(), label: '金额', boundField: 'amount', fieldType: 'system', dataType: 'currency', align: 'right', w: 14, visible: true, required: true },
      ],
    }]);
  }

  function removeBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selected === id) setSelected(null);
  }

  function setBlockWidth(id: string, width: BlockWidth) {
    updateBlock(id, { width });
  }

  // Column operations
  function toggleColVisible(blockId: string, colId: string) {
    const block = blocks.find(b => b.id === blockId);
    if (!block?.columns) return;
    updateBlock(blockId, { columns: block.columns.map(c => c.id === colId && !c.required ? { ...c, visible: !c.visible } : c) });
  }
  function addSystemCol(blockId: string, fieldKey: string, dim: Dimension) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const dimDef = DIMENSION_FIELDS[dim];
    const field = dimDef?.fields.find(f => f.key === fieldKey);
    if (!field) return;
    const newCol: ColDef = {
      id: uid(), label: field.label, boundField: fieldKey,
      fieldType: 'system', dataType: field.type,
      align: ['number','currency','percent'].includes(field.type) ? 'right' : 'left',
      w: 12, visible: true, required: false,
    };
    updateBlock(blockId, { columns: [...(block.columns ?? []), newCol] });
  }
  function addCustomCol(blockId: string) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const newCol: ColDef = { id: uid(), label: '自定义字段', fieldType: 'custom', dataType: 'text', align: 'left', w: 12, visible: true, required: false };
    updateBlock(blockId, { columns: [...(block.columns ?? []), newCol] });
  }
  function removeCol(blockId: string, colId: string) {
    const block = blocks.find(b => b.id === blockId);
    if (!block?.columns) return;
    updateBlock(blockId, { columns: block.columns.filter(c => c.id !== colId || c.required) });
  }
  function renameCol(blockId: string, colId: string, label: string) {
    const block = blocks.find(b => b.id === blockId);
    if (!block?.columns) return;
    updateBlock(blockId, { columns: block.columns.map(c => c.id === colId ? { ...c, label } : c) });
  }
  function changeDimension(blockId: string, dim: Dimension) {
    // 切换维度时，给费用类维度自动补默认列，不清空
    const defaultCols: Record<string, ColDef[]> = {
      fee_category: [
        makeCol('费用类别', 'fee_type', 'text', 'left', 24, true),
        makeCol('说明/计费基础', 'qty_basis', 'text', 'left', 26),
        makeCol('本期金额', 'amount', 'currency', 'right', 16, true),
        makeCol('附表引用', 'appendix_ref', 'text', 'center', 12),
      ],
      surcharge: [
        makeCol('附加费名称', 'surcharge_name', 'text', 'left', 28, true),
        makeCol('计费基础', 'basis', 'text', 'left', 24),
        makeCol('费率', 'rate', 'text', 'right', 12),
        makeCol('金额', 's_amount', 'currency', 'right', 14, true),
      ],
      freight_charge: [
        makeCol('费用项目', 'charge_name', 'text', 'left', 30, true),
        makeCol('计费基础', 'charge_basis', 'text', 'left', 26),
        makeCol('金额', 'charge_amount', 'currency', 'right', 14, true),
      ],
    };
    const cols = defaultCols[dim] ?? [];
    updateBlock(blockId, { dimension: dim, columns: cols });
  }

  // KV row ops
  function addKV(id: string) { const b = blocks.find(x => x.id === id); updateBlock(id, { kvRows: [...(b?.kvRows ?? []), { id: uid(), key: '新字段', val: '' }] }); }
  function updateKV(blockId: string, rowId: string, p: Partial<KVRow>) { const b = blocks.find(x => x.id === blockId); updateBlock(blockId, { kvRows: b?.kvRows?.map(r => r.id === rowId ? { ...r, ...p } : r) }); }
  function removeKV(blockId: string, rowId: string) { const b = blocks.find(x => x.id === blockId); updateBlock(blockId, { kvRows: b?.kvRows?.filter(r => r.id !== rowId) }); }
  // Sum row ops
  function addSumRow(id: string) { const b = blocks.find(x => x.id === id); updateBlock(id, { sumRows: [...(b?.sumRows ?? []), { id: uid(), cat: '新费用项', amount: '$0.00', note: '', appendix: '' }] }); }
  function updateSumRow(blockId: string, rowId: string, p: Partial<SumRow>) { const b = blocks.find(x => x.id === blockId); updateBlock(blockId, { sumRows: b?.sumRows?.map(r => r.id === rowId ? { ...r, ...p } : r) }); }
  function removeSumRow(blockId: string, rowId: string) { const b = blocks.find(x => x.id === blockId); updateBlock(blockId, { sumRows: b?.sumRows?.filter(r => r.id !== rowId) }); }

  const visibleBlocks = blocks.filter(b => b.visible);
  const c = COLORS[color] ?? COLORS.blue;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* 顶栏 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
        <Link href="/dashboard/finance" className="flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--primary)]">
          <ArrowLeft className="size-3.5" />财务
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-[13px] font-semibold text-[var(--foreground)]">发票模版编辑器</span>
        <div className="mx-2 h-4 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-1">
          {PRESETS.map(p => {
            const pc = COLORS[p.color];
            return (
              <button key={p.id} onClick={() => loadTemplate(p.id)}
                title={p.desc}
                className={cn('flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all',
                  type === p.id ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--surface-subtle)]')}>
                <span className="size-2 rounded-sm" style={{ background: pc.header }} />
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
            className={cn('flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold',
              saved ? 'bg-emerald-600 text-white' : 'bg-[var(--primary)] text-white hover:opacity-90')}>
            <CheckCircle2 className="size-3.5" />{saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 左侧面板 ── */}
        <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <PropertiesPanel
              block={blocks.find(b => b.id === selected)!}
              cs={c}
              allBlocks={blocks}
              onClose={() => setSelected(null)}
              onUpdate={(patch) => updateBlock(selected, patch)}
              onRemove={() => removeBlock(selected)}
              onToggle={() => toggleBlock(selected)}
              onMoveUp={() => moveBlock(selected, 'up')}
              onMoveDown={() => moveBlock(selected, 'down')}
              onChangeDimension={(d) => changeDimension(selected, d)}
              onAddSystemCol={(fk) => addSystemCol(selected, fk, blocks.find(b => b.id === selected)?.dimension ?? 'custom')}
              onAddCustomCol={() => addCustomCol(selected)}
              onToggleCol={(cid) => toggleColVisible(selected, cid)}
              onRemoveCol={(cid) => removeCol(selected, cid)}
              onRenameCol={(cid, l) => renameCol(selected, cid, l)}
              onAddSumRow={() => addSumRow(selected)}
              onAddSumRowWithCat={(cat) => { const b = blocks.find(x => x.id === selected); updateBlock(selected, { sumRows: [...(b?.sumRows ?? []), { id: uid(), cat, amount: '$0.00', note: '', appendix: '' }] }); }}
              onUpdateSumRow={(rid, p) => updateSumRow(selected, rid, p)}
              onRemoveSumRow={(rid) => removeSumRow(selected, rid)}
              onSetWidth={(w) => setBlockWidth(selected, w)}
              colMgrTab={colMgrTab}
              setColMgrTab={setColMgrTab}
            />
          ) : (
            <>
              <div className="px-3 py-3 flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">文档结构</p>
                <p className="mb-2 text-[9px] text-[var(--muted)]">点击预览区块 → 属性面板</p>
                {blocks.map(b => (
                  <div key={b.id} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] cursor-pointer mb-0.5',
                    b.visible ? 'text-[var(--foreground)] hover:bg-[var(--surface-subtle)]' : 'text-[var(--muted)] opacity-50',
                    hovered === b.id && 'bg-blue-50')}
                    onClick={() => { setSelected(b.id); document.getElementById(`blk_${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                    <span className="text-[11px]">
                      {b.type === 'info_block' ? '📋' : b.type === 'data_table' ? (b.isAppendix ? '📎' : '🗂') : b.type === 'totals' ? '💰' : b.type === 'payment' ? '🏦' : '✏️'}
                    </span>
                    <span className="flex-1 truncate font-medium">{b.title}</span>
                    {b.width && b.width !== 'full' && (
                      <span className="shrink-0 rounded px-1 text-[8px] bg-[var(--surface-subtle)] text-[var(--muted)]">
                        {b.width === 'half' ? '½' : b.width === 'third' ? '⅓' : '⅔'}
                      </span>
                    )}
                    {!b.required && <button onClick={e => { e.stopPropagation(); toggleBlock(b.id); }} className="shrink-0 text-[var(--muted)] hover:text-[var(--primary)]"><EyeOff className="size-3" /></button>}
                  </div>
                ))}
                <button onClick={addAppendixBlock} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] py-2 text-[11px] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <Plus className="size-3.5" />添加附表
                </button>
              </div>
              <div className="mx-3 border-t border-[var(--border)] py-3 px-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">配色</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.entries(COLORS).map(([k, cs]) => (
                    <button key={k} onClick={() => setColor(k)} className={cn('h-6 rounded-md', color === k && 'ring-2 ring-offset-1 ring-[var(--primary)]')} style={{ background: cs.header }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 文档 */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#d1d5db', padding: '28px 24px 80px' }}
          onClick={() => { setHovered(null); setColMgrBlock(null); setSelected(null); }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ width: '100%', background: '#fff', boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 6, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            {/* 文档标题栏 */}
            <div style={{ background: c.header, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                  {PRESETS.find(p => p.id === type)?.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{PRESETS.find(p => p.id === type)?.desc}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
                Your Company Inc.<br />finance@yourcompany.com
              </div>
            </div>

            {/* 按行分组渲染，支持并排布局 */}
            {groupIntoRows(visibleBlocks).map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', width: '100%' }}>
                {row.map((block, idx) => {
                  const allIdx = visibleBlocks.indexOf(block);
                  const isFirst = allIdx === 0;
                  const isLast  = allIdx === visibleBlocks.length - 1;
                  const flex = WIDTH_FLEX[block.width ?? 'full'];
                  return (
                    <div key={block.id} style={{ flex, maxWidth: flex.split(' ')[2] }}>
                      <BlockWrap block={block} hovered={hovered} setHovered={setHovered}
                        selected={selected === block.id}
                        onSelect={() => setSelected(block.id)}
                        isFirst={isFirst} isLast={isLast}
                        onMoveUp={() => moveBlock(block.id, 'up')}
                        onMoveDown={() => moveBlock(block.id, 'down')}
                        onHide={() => toggleBlock(block.id)}
                        onDelete={() => removeBlock(block.id)}>
                        {block.type === 'info_block' && (
                          <InfoBlock block={block} cs={c} onAddKV={() => addKV(block.id)} onUpdateKV={(rid,p) => updateKV(block.id, rid, p)} onRemoveKV={rid => removeKV(block.id, rid)} />
                        )}
                        {block.type === 'data_table' && (
                          <DataBlock block={block} cs={c}
                            onUpdateSumRow={(rid, p) => updateSumRow(block.id, rid, p)}
                            onRemoveSumRow={rid => removeSumRow(block.id, rid)}
                          />
                        )}
                        {block.type === 'totals' && <TotalsBlock block={block} cs={c} />}
                        {block.type === 'payment' && <PaymentBlock block={block} cs={c} onUpdateContent={v => updateBlock(block.id, { content: v })} onUpdateLateFee={v => updateBlock(block.id, { lateFee: v })} />}
                        {block.type === 'text' && <TextBlock block={block} onUpdate={v => updateBlock(block.id, { content: v })} />}
                      </BlockWrap>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BlockWrap ────────────────────────────────────────────────────────────────

function BlockWrap({ block, hovered, setHovered, selected, onSelect, isFirst, isLast, onMoveUp, onMoveDown, onHide, onDelete, children }: {
  block: DocBlock; hovered: string | null; setHovered: (id: string | null) => void;
  selected: boolean; onSelect: () => void;
  isFirst: boolean; isLast: boolean;
  onMoveUp: () => void; onMoveDown: () => void; onHide: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const isH = hovered === block.id;

  return (
    <div id={`blk_${block.id}`} style={{ position: 'relative', width: '100%' }}
      onMouseEnter={e => { e.stopPropagation(); setHovered(block.id); }}
      onMouseLeave={() => setHovered(null)}
      onClick={e => { e.stopPropagation(); onSelect(); }}>
      {/* 操作栏：hover 时显示 */}
      {isH && (
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 30,
          display: 'flex', gap: 2, background: '#1e293b', borderRadius: 6,
          padding: '3px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 9, color: '#94a3b8', paddingRight: 5, borderRight: '1px solid rgba(255,255,255,0.15)', marginRight: 2 }}>{block.title}</span>
          {[
            { icon: <ChevronUp className="size-3" />,   title: '↑', fn: onMoveUp,  dis: isFirst, color: '#bfdbfe' },
            { icon: <ChevronDown className="size-3" />, title: '↓', fn: onMoveDown,dis: isLast,  color: '#bfdbfe' },
          ].map(b => (
            <button key={b.title} onClick={b.fn} disabled={b.dis}
              style={{ background: 'none', border: 'none', cursor: b.dis ? 'not-allowed' : 'pointer', padding: 2, color: b.dis ? '#475569' : b.color, opacity: b.dis ? 0.4 : 1 }}>
              {b.icon}
            </button>
          ))}
          {!block.required && <button onClick={onHide} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fcd34d' }}><EyeOff className="size-3" /></button>}
          {!block.required && onDelete && (
            <button onClick={onDelete} title="删除" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fca5a5' }}>
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      )}
      {/* 选中边框（蓝色实线）/ hover 边框（蓝色虚线）*/}
      <div style={{
        outline: selected ? '2px solid #3b82f6' : isH ? '2px dashed #93c5fd' : 'none',
        outlineOffset: -1, transition: 'outline 0.1s',
      }}>
        {/* 选中时左侧竖条 */}
        {selected && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#3b82f6', zIndex: 5 }} />
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Editable ─────────────────────────────────────────────────────────────────

function Editable({ val, onChange, style, multi }: { val: string; onChange: (v: string) => void; style?: React.CSSProperties; multi?: boolean }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(r); } }, [editing]);
  return (
    <div ref={ref} contentEditable={editing} suppressContentEditableWarning
      style={{ ...style, whiteSpace: multi ? 'pre-wrap' : 'nowrap', cursor: editing ? 'text' : 'pointer', outline: editing ? '2px solid #3b82f6' : 'none', outlineOffset: 2, borderRadius: 2, minWidth: 20 }}
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      onBlur={e => { onChange(e.currentTarget.textContent ?? ''); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Escape') (e.target as HTMLElement).blur(); if (!multi && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}>
      {val}
    </div>
  );
}

// ─── InfoBlock ────────────────────────────────────────────────────────────────

function InfoBlock({ block, cs, onAddKV, onUpdateKV, onRemoveKV }: {
  block: DocBlock; cs: CS;
  onAddKV: () => void; onUpdateKV: (id: string, p: Partial<KVRow>) => void; onRemoveKV: (id: string) => void;
}) {
  return (
    <div style={{ padding: '14px 32px', borderBottom: `1.5px solid ${cs.border}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 32px' }}>
        {(block.kvRows ?? []).map(row => (
          <div key={row.id} style={{ display: 'flex', gap: 5, alignItems: 'baseline', fontSize: 10 }}>
            <Editable val={row.key} onChange={v => onUpdateKV(row.id, { key: v })} style={{ color: '#9ca3af', minWidth: 55, whiteSpace: 'nowrap' }} />
            <span style={{ color: '#d1d5db', flexShrink: 0 }}>:</span>
            <Editable val={row.val} onChange={v => onUpdateKV(row.id, { val: v })} style={{ color: '#111', fontWeight: 600, flex: 1 }} />
            <button onClick={e => { e.stopPropagation(); onRemoveKV(row.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e5e7eb', padding: 0, fontSize: 12 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = '#e5e7eb')}>×</button>
          </div>
        ))}
      </div>
      <button onClick={e => { e.stopPropagation(); onAddKV(); }}
        style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')} onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
        <Plus style={{ width: 10, height: 10 }} /> 添加字段行
      </button>
    </div>
  );
}

// ─── DataBlock（核心：明细表 + 列管理器）─────────────────────────────────────

function DataBlock({ block, cs, onUpdateSumRow, onRemoveSumRow }: {
  block: DocBlock; cs: CS;
  onUpdateSumRow: (id: string, p: Partial<SumRow>) => void;
  onRemoveSumRow: (id: string) => void;
}) {
  const dim = block.dimension ?? 'product_line';
  const visCols = (block.columns ?? []).filter(c => c.visible);
  const totalW = Math.max(1, visCols.reduce((s, c) => s + c.w, 0));
  const isSummary = dim === 'fee_category' || dim === 'surcharge' || dim === 'freight_charge';
  const sampleRowCount = 4;

  // 当 isSummary 但列为空，提示用户
  if (isSummary && visCols.length === 0) {
    return (
      <div style={{ padding: `0 ${block.isAppendix ? 28 : 32}px 12px`, paddingTop: block.isAppendix ? 0 : 10 }}>
        {block.isAppendix && (
          <div style={{ padding: '12px 4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: cs.accent, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>附表{block.appendixNo}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{block.title.replace(/^附表\d+：/, '')}</span>
          </div>
        )}
        {/* 无列时的兜底渲染 */}
        <div style={{ border: `1px solid ${cs.border}`, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ background: cs.header, padding: '7px 12px', fontSize: 9, fontWeight: 600, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
            <span>费用类别</span><span>金额</span>
          </div>
          {(block.sumRows ?? []).map(row => (
            <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${cs.border}`, fontSize: 10 }}>
              <Editable val={row.cat} onChange={v => onUpdateSumRow(row.id, { cat: v })} style={{ color: '#111', fontWeight: 500 }} />
              <Editable val={row.amount} onChange={v => onUpdateSumRow(row.id, { amount: v })} style={{ color: row.amount.startsWith('+') ? '#d97706' : '#111', fontWeight: 700 }} />
            </div>
          ))}
          {(block.sumRows ?? []).length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>在左侧属性面板添加费用类别</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: cs.light, fontSize: 11, fontWeight: 700 }}>
            <span>合计</span>
            <span style={{ color: cs.accent }}>
              ${(block.sumRows ?? []).reduce((s, r) => s + (parseFloat(r.amount.replace(/[^0-9.-]/g, '')) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: `0 ${block.isAppendix ? 28 : 32}px`, paddingTop: block.isAppendix ? 0 : 10 }}>
      {/* 附表标题 */}
      {block.isAppendix && (
        <div style={{ padding: '12px 4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: cs.accent, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            附表{block.appendixNo}
          </span>
          <Editable val={block.title.replace(/^附表\d+：/, '')} onChange={() => {}}
            style={{ fontSize: 12, fontWeight: 700, color: '#374151' }} />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: cs.header }}>
              {visCols.map(col => (
                <th key={col.id} style={{ padding: '7px 8px', textAlign: col.align, fontSize: 9, fontWeight: 600, color: '#fff', width: `${(col.w / totalW * 100).toFixed(1)}%` }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isSummary && (block.sumRows ?? []).map(row => (
              <tr key={row.id} style={{ borderBottom: `1px solid ${cs.border}` }}>
                {visCols.map(col => {
                  const cellVal =
                    col.boundField === 'fee_type'     ? row.cat :
                    col.boundField === 'amount'        ? row.amount :
                    col.boundField === 'description'   ? row.note :
                    col.boundField === 'qty_basis'     ? row.note :
                    col.boundField === 'appendix_ref'  ? row.appendix :
                    col.boundField === 'rate_basis'    ? '—' : '—';
                  return (
                    <td key={col.id} style={{ padding: '6px 8px', textAlign: col.align, fontSize: 10, color: row.amount.startsWith('+') ? '#d97706' : '#111', fontWeight: col.required ? 600 : 400 }}>
                      {col.boundField === 'fee_type'
                        ? <Editable val={row.cat} onChange={v => onUpdateSumRow(row.id, { cat: v })} style={{ fontSize: 10, color: '#111', fontWeight: 600 }} />
                        : col.boundField === 'amount'
                        ? <Editable val={row.amount} onChange={v => onUpdateSumRow(row.id, { amount: v })} style={{ fontSize: 10, fontWeight: 700, color: row.amount.startsWith('+') ? '#d97706' : '#111', textAlign: 'right', display: 'block' }} />
                        : col.boundField === 'appendix_ref'
                        ? <Editable val={row.appendix} onChange={v => onUpdateSumRow(row.id, { appendix: v })} style={{ fontSize: 9, color: cs.accent, fontWeight: 600 }} />
                        : col.boundField === 'qty_basis' || col.boundField === 'description'
                        ? <Editable val={row.note} onChange={v => onUpdateSumRow(row.id, { note: v })} style={{ fontSize: 9, color: '#6b7280' }} />
                        : cellVal
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
            {isSummary && (
              <tr style={{ background: cs.light, borderTop: `2px solid ${cs.border}` }}>
                {visCols.length > 1 && (
                  <td style={{ padding: '7px 8px', fontSize: 11, fontWeight: 700, color: '#111' }} colSpan={Math.max(1, visCols.length - 1)}>合计</td>
                )}
                <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: 12, fontWeight: 800, color: cs.accent }}>
                  ${(block.sumRows ?? []).reduce((s, r) => s + (parseFloat(r.amount.replace(/[^0-9.-]/g, '')) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            {!isSummary && Array.from({ length: sampleRowCount }, (_, i) => {
              const isLast = i === sampleRowCount - 1 && dim === 'storage_sku';
              return (
                <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff', borderBottom: `1px solid ${cs.border}`, fontWeight: isLast ? 700 : 400 }}>
                  {visCols.map(col => (
                    <td key={col.id} style={{ padding: '7px 8px', textAlign: col.align, fontSize: 10, color: '#374151' }}>
                      {col.fieldType === 'custom' ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>（自定义）</span>
                        : col.boundField ? getSampleVal(col.boundField, i)
                        : `{${col.label}}`}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColNameEdit({ label, onRename, visible, accent }: { label: string; onRename: (l: string) => void; visible: boolean; accent: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(label);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setVal(label), [label]);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);
  if (editing) return <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onBlur={() => { onRename(val); setEditing(false); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }} style={{ fontSize: 11, fontWeight: 600, width: '100%', border: `1px solid ${accent}`, borderRadius: 3, padding: '1px 4px', outline: 'none' }} />;
  return <span onDoubleClick={() => setEditing(true)} title="双击重命名" style={{ fontSize: 11, fontWeight: 600, color: visible ? accent : '#9ca3af', cursor: 'text', display: 'block' }}>{label}</span>;
}

function TotalsBlock({ block, cs }: { block: DocBlock; cs: CS }) {
  return (
    <div style={{ padding: '10px 32px 12px', display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ minWidth: 240 }}>
        {[{ l: block.subtotalLabel ?? 'Subtotal', v: '$4,349.00' }, ...(block.showPrevBal ? [{ l: '上期余额（已结清）', v: '$0.00' }] : [])].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10, borderBottom: `1px solid ${cs.border}`, color: '#6b7280' }}>
            <span>{r.l}</span><span>{r.v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', marginTop: 5, borderRadius: 6, fontSize: 13, fontWeight: 800, background: cs.header, color: '#fff' }}>
          <span>{block.totalLabel ?? 'TOTAL DUE'}</span>
          <span>$4,349.00</span>
        </div>
      </div>
    </div>
  );
}

function PaymentBlock({ block, cs, onUpdateContent, onUpdateLateFee }: { block: DocBlock; cs: CS; onUpdateContent: (v: string) => void; onUpdateLateFee: (v: string) => void }) {
  return (
    <div style={{ margin: '0 32px 12px', padding: '11px 14px', background: cs.light, borderLeft: `3px solid ${cs.accent}` }}>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', marginBottom: 7 }}>Payment Instructions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 14px', marginBottom: 7, fontSize: 10 }}>
        {[['Bank', 'Chase Bank'], ['Account Name', 'Your Company Inc.'], ['Routing No.', '021000021'], ['Account No.', '****7890'], ['SWIFT', 'CHASUS33']].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', gap: 4 }}>
            <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{l}:</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>{v}</span>
          </div>
        ))}
      </div>
      <Editable val={block.content ?? ''} onChange={onUpdateContent} multi style={{ fontSize: 10, color: '#555', lineHeight: 1.6, display: 'block' }} />
      {block.lateFee && <Editable val={block.lateFee} onChange={onUpdateLateFee} style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, display: 'block' }} />}
    </div>
  );
}

function TextBlock({ block, onUpdate }: { block: DocBlock; onUpdate: (v: string) => void }) {
  return (
    <div style={{ padding: '10px 32px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
      <Editable val={block.content ?? ''} onChange={onUpdate} style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }} />
    </div>
  );
}

// ─── PropertiesPanel（属性面板，点击区块后显示）─────────────────────────────

function PropertiesPanel({ block, cs, allBlocks, onClose, onUpdate, onRemove, onToggle,
  onMoveUp, onMoveDown,
  onChangeDimension, onAddSystemCol, onAddCustomCol, onToggleCol, onRemoveCol, onRenameCol,
  onAddSumRow, onAddSumRowWithCat, onUpdateSumRow, onRemoveSumRow,
  onSetWidth, colMgrTab, setColMgrTab,
}: {
  block: DocBlock; cs: CS; allBlocks: DocBlock[];
  onClose: () => void; onUpdate: (p: Partial<DocBlock>) => void;
  onRemove: () => void; onToggle: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onChangeDimension: (d: Dimension) => void;
  onAddSystemCol: (fk: string) => void; onAddCustomCol: () => void;
  onToggleCol: (id: string) => void; onRemoveCol: (id: string) => void;
  onRenameCol: (id: string, l: string) => void;
  onAddSumRow: () => void; onAddSumRowWithCat: (cat: string) => void;
  onUpdateSumRow: (id: string, p: Partial<SumRow>) => void; onRemoveSumRow: (id: string) => void;
  onSetWidth: (w: BlockWidth) => void;
  colMgrTab: 'fields' | 'custom'; setColMgrTab: (t: 'fields' | 'custom') => void;
}) {
  const dim = block.dimension ?? 'product_line';
  const dimDef = DIMENSION_FIELDS[dim];
  const isSummary = dim === 'fee_category' || dim === 'surcharge' || dim === 'freight_charge';
  const [customCat, setCustomCat] = useState('');
  const inp = 'w-full rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1 text-[12px] outline-none focus:border-[var(--primary)]';

  return (
    <div className="flex flex-col h-full">
      {/* 属性面板标题 */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
        <div>
          <div className="text-[12px] font-bold text-[var(--foreground)]">
            {block.type === 'info_block' ? '📋' : block.type === 'data_table' ? (block.isAppendix ? '📎' : '🗂') : block.type === 'totals' ? '💰' : block.type === 'payment' ? '🏦' : '✏️'}
            {' '}{block.title}
          </div>
          <div className="text-[10px] text-[var(--muted)]">区块属性</div>
        </div>
        <button onClick={onClose} className="flex size-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* 标题 */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">标题</label>
          <input value={block.title} onChange={e => onUpdate({ title: e.target.value })} className={inp} />
        </div>

        {/* ── 宽度设置（布局控制）── */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">宽度 — 支持并排布局</label>
          <p className="mb-2 text-[9px] text-[var(--muted)]">非全宽的相邻区块会自动并排显示</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { k: 'full',        l: '全宽',     desc: '独占一整行' },
              { k: 'half',        l: '½ 半宽',   desc: '两个并排' },
              { k: 'two-thirds',  l: '⅔ 宽',     desc: '左⅔+右⅓' },
              { k: 'third',       l: '⅓ 宽',     desc: '三列其一' },
            ] as { k: BlockWidth; l: string; desc: string }[]).map(w => (
              <button key={w.k}
                onClick={() => onSetWidth(w.k)}
                className={cn('rounded-lg border px-2 py-2 text-left transition-all',
                  (block.width ?? 'full') === w.k
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border)] hover:border-[var(--primary)]')}>
                <div className="text-[11px] font-semibold text-[var(--foreground)]">{w.l}</div>
                <div className="text-[9px] text-[var(--muted)]">{w.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 数据维度（仅 data_table）── */}
        {block.type === 'data_table' && (
          <>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">数据维度 — 每行代表什么</label>
              <div className="space-y-1">
                {(Object.entries(DIMENSION_FIELDS) as [Dimension, typeof DIMENSION_FIELDS.product_line][]).map(([k, d]) => (
                  <button key={k} onClick={() => onChangeDimension(k)}
                    className={cn('flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                      dim === k ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--primary)]')}>
                    <span className="text-[14px] shrink-0">{d.icon}</span>
                    <div className="min-w-0">
                      <div className={cn('text-[11px] font-semibold', dim === k ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>{d.label}</div>
                      <div className="text-[9px] text-[var(--muted)] truncate">{d.description}</div>
                    </div>
                    {dim === k && <CheckCircle2 className="size-3.5 shrink-0 text-[var(--primary)] ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 行配置（费用类维度）── */}
            {isSummary && (
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">行配置 — 费用类别</label>
                <p className="mb-2 text-[9px] text-[var(--muted)]">每行代表一种费用类型，可从系统预设选择或自定义</p>

                {/* 现有行 */}
                <div className="space-y-1 mb-2">
                  {(block.sumRows ?? []).map(row => (
                    <div key={row.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1.5">
                      <span className="flex-1 text-[11px] font-medium text-[var(--foreground)] truncate">{row.cat}</span>
                      <span className="text-[10px] text-[var(--muted)]">{row.amount}</span>
                      <button onClick={() => onRemoveSumRow(row.id)}
                        className="text-[var(--muted)] hover:text-red-500 transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 13 }}>×</button>
                    </div>
                  ))}
                </div>

                {/* 从系统预设添加 */}
                <div>
                  <div className="mb-1 text-[9px] font-semibold text-[var(--muted)]">从系统预设添加</div>
                  <div className="flex flex-wrap gap-1">
                    {(PRESET_FEE_ROWS[dim] ?? [])
                      .filter(cat => !(block.sumRows ?? []).some(r => r.cat === cat))
                      .map(cat => (
                        <button key={cat}
                          onClick={() => onAddSumRowWithCat(cat)}
                          className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-all">
                          + {cat}
                        </button>
                      ))
                    }
                  </div>
                </div>

                {/* 自定义行 */}
                <div className="mt-2">
                  <div className="mb-1 text-[9px] font-semibold text-[var(--muted)]">自定义费用类别</div>
                  <div className="flex gap-1.5">
                    <input value={customCat} onChange={e => setCustomCat(e.target.value)}
                      placeholder="输入自定义费用名称"
                      className={cn(inp, 'flex-1')}
                      onKeyDown={e => { if (e.key === 'Enter' && customCat.trim()) { onAddSumRowWithCat(customCat.trim()); setCustomCat(''); } }} />
                    <button
                      disabled={!customCat.trim()}
                      onClick={() => { if (customCat.trim()) { onAddSumRowWithCat(customCat.trim()); setCustomCat(''); } }}
                      className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2 text-[11px] font-semibold text-white disabled:opacity-40">
                      <Plus className="size-3" />添加
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 列配置（所有 data_table）── */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">列配置</label>
                <div className="flex items-center gap-1.5">
                  <button key="fields" onClick={() => setColMgrTab('fields')}
                    className={cn('rounded px-2 py-0.5 text-[10px] font-semibold transition-colors',
                      colMgrTab === 'fields' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                    系统字段
                  </button>
                  <button key="custom" onClick={() => setColMgrTab('custom')}
                    className={cn('rounded px-2 py-0.5 text-[10px] font-semibold transition-colors',
                      colMgrTab === 'custom' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}>
                    已选列
                  </button>
                </div>
              </div>

              {/* 系统字段列表 */}
              {colMgrTab === 'fields' && (
                <div>
                  {dim === 'custom'
                    ? <p className="text-[11px] text-[var(--muted)]">自定义维度无系统字段，请在"已选列"中添加自定义列。</p>
                    : (
                      <div className="space-y-1">
                        {(dimDef?.fields ?? []).map(field => {
                          const added = (block.columns ?? []).some(c => c.boundField === field.key);
                          return (
                            <button key={field.key}
                              onClick={() => { if (!added) onAddSystemCol(field.key); }}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all',
                                added ? 'border-[var(--primary)] bg-[var(--primary-soft)] cursor-default' : 'border-[var(--border)] hover:border-[var(--primary)] cursor-pointer',
                              )}>
                              <Tag className={cn('size-3 shrink-0', added ? 'text-[var(--primary)]' : 'text-[var(--muted)]')} />
                              <div className="flex-1 min-w-0">
                                <div className={cn('text-[11px] font-semibold', added ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                                  {field.label}
                                  <span className="ml-1 text-[9px] font-normal text-[var(--muted)]">{field.type}</span>
                                </div>
                                <div className="text-[9px] text-[var(--muted)] truncate">{field.description || field.key}</div>
                              </div>
                              {added && <CheckCircle2 className="size-3 shrink-0 text-[var(--primary)]" />}
                            </button>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              )}

              {/* 已选列管理 */}
              {colMgrTab === 'custom' && (
                <div className="space-y-1">
                  {(block.columns ?? []).map(col => (
                    <div key={col.id} className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-2',
                      col.visible ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] bg-[var(--surface-subtle)] opacity-60',
                    )}>
                      <div className="flex-1 min-w-0">
                        <ColNameEdit label={col.label} onRename={l => onRenameCol(col.id, l)} visible={col.visible} accent={cs.accent} />
                        <div className="text-[9px] text-[var(--muted)]">
                          {col.fieldType === 'custom' ? '✏️ 自定义' : `📎 ${col.boundField}`}
                        </div>
                      </div>
                      {col.required
                        ? <span className="text-[9px] text-[var(--muted)]">锁定</span>
                        : <>
                            <button onClick={() => onToggleCol(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: col.visible ? cs.accent : '#9ca3af' }}>
                              {col.visible ? '👁' : '🔲'}
                            </button>
                            <button onClick={() => onRemoveCol(col.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e5e7eb', fontSize: 13, lineHeight: 1 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#e5e7eb')}>×</button>
                          </>
                      }
                    </div>
                  ))}
                  <button onClick={onAddCustomCol}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--border)] py-1.5 text-[10px] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                    <Plus className="size-3" />添加自定义字段列
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── payment / text 内容 ── */}
        {(block.type === 'payment' || block.type === 'text') && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">内容</label>
            <textarea value={block.content ?? ''} onChange={e => onUpdate({ content: e.target.value })}
              rows={4} className={cn(inp, 'resize-none')} />
            {block.type === 'payment' && (
              <>
                <label className="mb-1 mt-2 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">逾期政策</label>
                <textarea value={block.lateFee ?? ''} onChange={e => onUpdate({ lateFee: e.target.value })}
                  rows={2} className={cn(inp, 'resize-none')} />
              </>
            )}
          </div>
        )}

        {/* totals 配置 */}
        {block.type === 'totals' && (
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">合计标签</label>
              <input value={block.totalLabel ?? 'TOTAL DUE'} onChange={e => onUpdate({ totalLabel: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">小计标签</label>
              <input value={block.subtotalLabel ?? 'Subtotal'} onChange={e => onUpdate({ subtotalLabel: e.target.value })} className={inp} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={block.showPrevBal ?? false} onChange={e => onUpdate({ showPrevBal: e.target.checked })} className="accent-[var(--primary)]" />
              <span className="text-[12px] text-[var(--foreground)]">显示"上期余额"行</span>
            </label>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="border-t border-[var(--border)] px-3 py-2.5 flex items-center gap-1.5">
        <button onClick={onMoveUp} title="上移" className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><ChevronUp className="size-3.5" /></button>
        <button onClick={onMoveDown} title="下移" className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><ChevronDown className="size-3.5" /></button>
        <div className="flex-1" />
        {!block.required && (
          <>
            <button onClick={onToggle} title="显示/隐藏" className="flex h-6 items-center gap-1 rounded border border-[var(--border)] px-2 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
              {block.visible ? '隐藏' : '显示'}
            </button>
            <button onClick={onRemove} title="删除此区块" className="flex h-6 items-center gap-1 rounded border border-red-200 bg-red-50 px-2 text-[10px] font-semibold text-red-600 hover:bg-red-100">
              <Trash2 className="size-3" />删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}
