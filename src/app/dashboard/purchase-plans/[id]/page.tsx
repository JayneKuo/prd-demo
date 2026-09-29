'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useReducer, useRef, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, Ban, Edit3,
  Package, Building2, MapPin, CalendarDays, FileText, TrendingUp,
  Settings2, Clock, User, AlertTriangle, Copy, Check, ExternalLink,
  ChevronRight, Loader2, Send, ShoppingCart, MoreHorizontal, X,
  Printer, Download, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 共享类型 & 数据（与列表页对齐）────────────────────────────────────────────

type PlanStatus   = '草稿' | '待审核' | '已审核' | '已转订单' | '已取消';
type PlanPriority = '紧急' | '高' | '普通' | '低';

type PlanItem = {
  _key: string;
  sku: string;
  productName: string;
  spec: string;
  unit: string;
  planQty: number;
  currentStock: number;
  safetyStock: number;
  unitCost: number;
  currency: string;
  expectedDate: string;
  remark: string;
};

type PlanEvent = {
  id: string;
  time: string;
  actor: string;
  actorRole: string;
  title: string;
  description: string;
  type: 'create' | 'submit' | 'approve' | 'reject' | 'convert' | 'cancel' | 'edit' | 'comment';
};

type PurchasePlan = {
  id: string;
  planNo: string;
  title: string;
  planType: string;
  priority: PlanPriority;
  status: PlanStatus;
  planDate: string;
  expectedArrival: string;
  validUntil: string;
  // 供应商
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentTerms: string;
  // 交货
  warehouseId: string;
  warehouseName: string;
  shippingMethod: string;
  incoterms: string;
  deliveryAddress: string;
  // 财务
  currency: string;
  budgetAmount: number;
  taxRate: number;
  // 审批
  approvalFlow: string;
  approver: string;
  approveRemark: string;
  // 关联
  sourceDoc: string;
  relatedPoNo: string;
  department: string;
  costCenter: string;
  tags: string[];
  remark: string;
  // 创建
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // 明细
  items: PlanItem[];
  // 日志
  events: PlanEvent[];
};

// ─── Mock 详情数据 ────────────────────────────────────────────────────────────

const MOCK_EVENTS_BASE: PlanEvent[] = [
  { id: 'evt_001', time: '2026-09-01 09:12', actor: '张伟', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0001', type: 'create' },
  { id: 'evt_002', time: '2026-09-01 09:30', actor: '张伟', actorRole: '采购专员', title: '提交审核', description: '提交至标准审批流，等待李经理审批', type: 'submit' },
  { id: 'evt_003', time: '2026-09-01 11:45', actor: '李经理', actorRole: '采购经理', title: '审核通过', description: '预算合理，供应商资质符合要求，批准执行', type: 'approve' },
  { id: 'evt_004', time: '2026-09-02 08:20', actor: '张伟', actorRole: '采购专员', title: '修改备注', description: '更新交货地址备注信息', type: 'edit' },
];

const mockPlanDetails: Record<string, PurchasePlan> = {
  pp_001: {
    id: 'pp_001', planNo: 'PP-2026-0001', title: 'Q3 电子配件补货计划',
    planType: '常规补货', priority: '紧急', status: '待审核',
    planDate: '2026-09-01', expectedArrival: '2026-09-20', validUntil: '2026-09-30',
    supplierId: 'sup_001', supplierName: '深圳华强电子有限公司', supplierCode: 'SUP-001',
    contactName: '李经理', contactPhone: '+86 755-8888-0001', contactEmail: 'li@hqe.cn',
    paymentTerms: 'Net 30',
    warehouseId: 'wh_001', warehouseName: 'US-West-LAX', shippingMethod: '海运', incoterms: 'FOB',
    deliveryAddress: '',
    currency: 'USD', budgetAmount: 20000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '李经理', approveRemark: '',
    sourceDoc: 'REP-2026-0012', relatedPoNo: '',
    department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['Q3', '季末备货', '重点SKU'],
    remark: '季末备货，需优先审批，确保国庆前到仓',
    createdBy: '张伟', createdAt: '2026-09-01 09:12', updatedAt: '2026-09-01 09:30',
    items: [
      { _key: 'i1', sku: 'SKU-0001', productName: 'Smart Watch Band', spec: 'Black / S',     unit: 'PCS', planQty: 200, currentStock: 320,  safetyStock: 200, unitCost: 12.99, currency: 'USD', expectedDate: '2026-09-20', remark: '' },
      { _key: 'i2', sku: 'SKU-0002', productName: 'Screen Protector',  spec: 'Tempered Glass', unit: 'PCS', planQty: 300, currentStock: 85,   safetyStock: 150, unitCost: 8.99,  currency: 'USD', expectedDate: '2026-09-20', remark: '库存低于安全库存，加急' },
      { _key: 'i3', sku: 'SKU-0003', productName: 'Charging Dock',     spec: 'White',          unit: 'PCS', planQty: 200, currentStock: 42,   safetyStock: 100, unitCost: 29.99, currency: 'USD', expectedDate: '2026-09-20', remark: '' },
      { _key: 'i4', sku: 'SKU-0009', productName: 'Bluetooth Speaker', spec: 'Midnight Black', unit: 'PCS', planQty: 100, currentStock: 33,   safetyStock: 80,  unitCost: 45.99, currency: 'USD', expectedDate: '2026-09-25', remark: '' },
      { _key: 'i5', sku: 'SKU-0010', productName: 'Wireless Earbuds Pro', spec: 'ANC/USB-C',  unit: 'PCS', planQty: 100, currentStock: 25,   safetyStock: 60,  unitCost: 79.99, currency: 'USD', expectedDate: '2026-09-25', remark: '黑五主推SKU，确保足量' },
      { _key: 'i6', sku: 'SKU-0004', productName: 'Mechanical Keyboard', spec: 'Cherry MX',  unit: 'PCS', planQty: 100, currentStock: 18,   safetyStock: 50,  unitCost: 89.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
      { _key: 'i7', sku: 'SKU-0005', productName: 'Webcam 4K',          spec: '60fps/USB-C',  unit: 'PCS', planQty: 100, currentStock: 67,   safetyStock: 80,  unitCost: 59.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
      { _key: 'i8', sku: 'SKU-0012', productName: 'Wireless Charger',   spec: '15W / Black',  unit: 'PCS', planQty: 100, currentStock: 140,  safetyStock: 100, unitCost: 19.99, currency: 'USD', expectedDate: '2026-09-20', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-09-01 09:12', actor: '张伟', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0001', type: 'create' },
      { id: 'evt_002', time: '2026-09-01 09:30', actor: '张伟', actorRole: '采购专员', title: '提交审核', description: '提交至标准审批流，等待李经理审批', type: 'submit' },
    ],
  },
  pp_002: {
    id: 'pp_002', planNo: 'PP-2026-0002', title: '智能手表配件常规采购',
    planType: '常规补货', priority: '普通', status: '已审核',
    planDate: '2026-09-05', expectedArrival: '2026-09-28', validUntil: '2026-10-15',
    supplierId: 'sup_002', supplierName: 'Shenzhen TechParts Co., Ltd.', supplierCode: 'SUP-002',
    contactName: 'John Smith', contactPhone: '+86 755-9999-0002', contactEmail: 'john@techparts.com',
    paymentTerms: 'Net 45',
    warehouseId: 'wh_005', warehouseName: 'SG-Central', shippingMethod: '空运', incoterms: 'CIF',
    deliveryAddress: '',
    currency: 'USD', budgetAmount: 8000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '李经理', approveRemark: '供应商报价合理，审批通过',
    sourceDoc: '', relatedPoNo: '',
    department: '采购部', costCenter: 'CC-SG',
    tags: ['新加坡仓', '常规补货'],
    remark: '',
    createdBy: 'Admin', createdAt: '2026-09-05 14:33', updatedAt: '2026-09-05 16:00',
    items: [
      { _key: 'i1', sku: 'SKU-0001', productName: 'Smart Watch Band', spec: 'Black / S',   unit: 'PCS', planQty: 150, currentStock: 320, safetyStock: 200, unitCost: 12.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
      { _key: 'i2', sku: 'SKU-0003', productName: 'Charging Dock',    spec: 'White',        unit: 'PCS', planQty: 100, currentStock: 42,  safetyStock: 100, unitCost: 29.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
      { _key: 'i3', sku: 'SKU-0012', productName: 'Wireless Charger', spec: '15W / Black',  unit: 'PCS', planQty: 150, currentStock: 140, safetyStock: 100, unitCost: 19.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
      { _key: 'i4', sku: 'SKU-0007', productName: 'Phone Case',       spec: 'iPhone15/Clear',unit: 'PCS', planQty: 100, currentStock: 450, safetyStock: 300, unitCost: 15.99, currency: 'USD', expectedDate: '2026-09-28', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-09-05 14:33', actor: 'Admin', actorRole: '系统管理员', title: '创建计划', description: '创建采购计划单 PP-2026-0002', type: 'create' },
      { id: 'evt_002', time: '2026-09-05 14:50', actor: 'Admin', actorRole: '系统管理员', title: '提交审核', description: '提交标准审批', type: 'submit' },
      { id: 'evt_003', time: '2026-09-05 16:00', actor: '李经理', actorRole: '采购经理', title: '审核通过', description: '供应商报价合理，审批通过', type: 'approve' },
    ],
  },
  pp_003: {
    id: 'pp_003', planNo: 'PP-2026-0003', title: '音频设备补货（英国仓）',
    planType: '常规补货', priority: '高', status: '已转订单',
    planDate: '2026-08-20', expectedArrival: '2026-09-15', validUntil: '',
    supplierId: 'sup_004', supplierName: 'Audio Supplies Ltd.', supplierCode: 'SUP-004',
    contactName: 'Emma Clarke', contactPhone: '+44 20 7946 0010', contactEmail: 'emma@audiosupplies.co.uk',
    paymentTerms: 'Net 60',
    warehouseId: 'wh_006', warehouseName: 'UK-London', shippingMethod: '海运', incoterms: 'DDP',
    deliveryAddress: '',
    currency: 'GBP', budgetAmount: 12000, taxRate: 20,
    approvalFlow: '标准审批流', approver: '张总', approveRemark: '英国市场重点品类，加急审批通过',
    sourceDoc: 'REP-2026-0008', relatedPoNo: 'PO-2026-0088',
    department: '运营部', costCenter: 'CC-UK',
    tags: ['英国仓', '音频', '已转PO'],
    remark: '已转 PO-2026-0088，请跟进物流状态',
    createdBy: 'Emily Johnson', createdAt: '2026-08-20 10:05', updatedAt: '2026-08-22 14:30',
    items: [
      { _key: 'i1', sku: 'SKU-0009', productName: 'Bluetooth Speaker',    spec: 'Midnight Black', unit: 'PCS', planQty: 80,  currentStock: 33,  safetyStock: 80,  unitCost: 38.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
      { _key: 'i2', sku: 'SKU-0010', productName: 'Wireless Earbuds Pro', spec: 'ANC / USB-C',    unit: 'PCS', planQty: 60,  currentStock: 25,  safetyStock: 60,  unitCost: 64.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
      { _key: 'i3', sku: 'SKU-0006', productName: 'Ring Light Mini',      spec: '6-inch',          unit: 'PCS', planQty: 100, currentStock: 210, safetyStock: 100, unitCost: 19.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
      { _key: 'i4', sku: 'SKU-0005', productName: 'Webcam 4K',            spec: '60fps / USB-C',   unit: 'PCS', planQty: 40,  currentStock: 67,  safetyStock: 80,  unitCost: 48.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
      { _key: 'i5', sku: 'SKU-0004', productName: 'Mechanical Keyboard',  spec: 'Cherry MX Blue',  unit: 'PCS', planQty: 20,  currentStock: 18,  safetyStock: 50,  unitCost: 72.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
      { _key: 'i6', sku: 'SKU-0011', productName: 'Laptop Stand',         spec: 'Aluminum / Silver',unit: 'PCS', planQty: 20,  currentStock: 95,  safetyStock: 50,  unitCost: 39.99, currency: 'GBP', expectedDate: '2026-09-15', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-08-20 10:05', actor: 'Emily Johnson', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0003', type: 'create' },
      { id: 'evt_002', time: '2026-08-20 10:20', actor: 'Emily Johnson', actorRole: '采购专员', title: '提交审核', description: '提交审批', type: 'submit' },
      { id: 'evt_003', time: '2026-08-20 14:00', actor: '张总', actorRole: '采购总监', title: '审核通过', description: '英国市场重点品类，加急审批通过', type: 'approve' },
      { id: 'evt_004', time: '2026-08-22 14:30', actor: 'Emily Johnson', actorRole: '采购专员', title: '转采购订单', description: '已生成采购订单 PO-2026-0088', type: 'convert' },
    ],
  },
  pp_004: {
    id: 'pp_004', planNo: 'PP-2026-0004', title: '无线充电器年度补货',
    planType: '常规补货', priority: '低', status: '草稿',
    planDate: '2026-09-10', expectedArrival: '2026-10-10', validUntil: '2026-10-31',
    supplierId: 'sup_003', supplierName: '广州科技配件有限公司', supplierCode: 'SUP-003',
    contactName: '王总', contactPhone: '+86 20-7777-0003', contactEmail: 'wang@gztech.com',
    paymentTerms: 'Net 30',
    warehouseId: 'wh_003', warehouseName: 'US-East-EWR', shippingMethod: '海运', incoterms: 'FOB', deliveryAddress: '',
    currency: 'USD', budgetAmount: 18000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '', approveRemark: '',
    sourceDoc: '', relatedPoNo: '', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['年度补货', '东部仓'],
    remark: '',
    createdBy: 'James Wilson', createdAt: '2026-09-10 16:44', updatedAt: '2026-09-10 16:44',
    items: [
      { _key: 'i1', sku: 'SKU-0012', productName: 'Wireless Charger', spec: '15W / Black', unit: 'PCS', planQty: 300, currentStock: 140, safetyStock: 100, unitCost: 19.99, currency: 'USD', expectedDate: '2026-10-10', remark: '' },
      { _key: 'i2', sku: 'SKU-0003', productName: 'Charging Dock',    spec: 'White',       unit: 'PCS', planQty: 300, currentStock: 42,  safetyStock: 100, unitCost: 29.99, currency: 'USD', expectedDate: '2026-10-10', remark: '库存不足，优先补' },
      { _key: 'i3', sku: 'SKU-0008', productName: 'USB-C Cable 2m',   spec: 'White',       unit: 'PCS', planQty: 200, currentStock: 1200,safetyStock: 500, unitCost: 9.99,  currency: 'USD', expectedDate: '2026-10-10', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-09-10 16:44', actor: 'James Wilson', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0004', type: 'create' },
    ],
  },
  pp_005: {
    id: 'pp_005', planNo: 'PP-2026-0005', title: '数据线专项采购',
    planType: '常规补货', priority: '普通', status: '已取消',
    planDate: '2026-08-15', expectedArrival: '2026-09-05', validUntil: '2026-09-10',
    supplierId: 'sup_005', supplierName: 'Global Cable Inc.', supplierCode: 'SUP-005',
    contactName: 'Mike Chen', contactPhone: '+1 626-888-0005', contactEmail: 'mike@globalcable.com',
    paymentTerms: 'Net 30',
    warehouseId: 'wh_001', warehouseName: 'US-West-LAX', shippingMethod: '空运', incoterms: 'CIF', deliveryAddress: '',
    currency: 'USD', budgetAmount: 22000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '李经理', approveRemark: '',
    sourceDoc: '', relatedPoNo: '', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['数据线', '已取消'],
    remark: '供应商无法按时交付，已取消并寻找替代供应商',
    createdBy: '张伟', createdAt: '2026-08-15 11:20', updatedAt: '2026-08-18 09:00',
    items: [
      { _key: 'i1', sku: 'SKU-0008', productName: 'USB-C Cable 2m', spec: 'White', unit: 'PCS', planQty: 1000, currentStock: 1200, safetyStock: 500, unitCost: 9.99,  currency: 'USD', expectedDate: '2026-09-05', remark: '' },
      { _key: 'i2', sku: 'SKU-0007', productName: 'Phone Case',     spec: 'iPhone 15 / Clear', unit: 'PCS', planQty: 1000, currentStock: 450, safetyStock: 300, unitCost: 15.99, currency: 'USD', expectedDate: '2026-09-05', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-08-15 11:20', actor: '张伟', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0005', type: 'create' },
      { id: 'evt_002', time: '2026-08-15 11:35', actor: '张伟', actorRole: '采购专员', title: '提交审核', description: '提交至标准审批流', type: 'submit' },
      { id: 'evt_003', time: '2026-08-16 10:00', actor: '李经理', actorRole: '采购经理', title: '审核通过', description: '常规采购，审批通过', type: 'approve' },
      { id: 'evt_004', time: '2026-08-18 09:00', actor: '张伟', actorRole: '采购专员', title: '作废计划', description: '供应商无法按时交付，已取消并寻找替代供应商', type: 'cancel' },
    ],
  },
  pp_006: {
    id: 'pp_006', planNo: 'PP-2026-0006', title: '蓝牙耳机节前备货',
    planType: '季节性备货', priority: '高', status: '待审核',
    planDate: '2026-09-18', expectedArrival: '2026-10-05', validUntil: '2026-10-15',
    supplierId: 'sup_002', supplierName: 'Shenzhen TechParts Co., Ltd.', supplierCode: 'SUP-002',
    contactName: 'John Smith', contactPhone: '+86 755-9999-0002', contactEmail: 'john@techparts.com',
    paymentTerms: 'Net 45',
    warehouseId: 'wh_002', warehouseName: 'US-West-SEA', shippingMethod: '空运', incoterms: 'CIF', deliveryAddress: '',
    currency: 'USD', budgetAmount: 50000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '张总', approveRemark: '',
    sourceDoc: 'REP-2026-0021', relatedPoNo: '', department: '运营部', costCenter: 'CC-WAREHOUSE',
    tags: ['黑五备货', 'Q4', '音频'],
    remark: '黑五主推SKU，提前备货，确保10月底前到仓',
    createdBy: 'Sarah Kim', createdAt: '2026-09-18 08:55', updatedAt: '2026-09-18 09:10',
    items: [
      { _key: 'i1', sku: 'SKU-0010', productName: 'Wireless Earbuds Pro', spec: 'ANC / USB-C',    unit: 'PCS', planQty: 200, currentStock: 25,  safetyStock: 60,  unitCost: 79.99, currency: 'USD', expectedDate: '2026-10-05', remark: '黑五主推，务必足量' },
      { _key: 'i2', sku: 'SKU-0009', productName: 'Bluetooth Speaker',    spec: 'Midnight Black', unit: 'PCS', planQty: 150, currentStock: 33,  safetyStock: 80,  unitCost: 45.99, currency: 'USD', expectedDate: '2026-10-05', remark: '' },
      { _key: 'i3', sku: 'SKU-0006', productName: 'Ring Light Mini',      spec: '6-inch',          unit: 'PCS', planQty: 150, currentStock: 210, safetyStock: 100, unitCost: 24.99, currency: 'USD', expectedDate: '2026-10-05', remark: '' },
      { _key: 'i4', sku: 'SKU-0011', productName: 'Laptop Stand',         spec: 'Aluminum / Silver',unit: 'PCS', planQty: 50,  currentStock: 95,  safetyStock: 50,  unitCost: 49.99, currency: 'USD', expectedDate: '2026-10-05', remark: '' },
      { _key: 'i5', sku: 'SKU-0005', productName: 'Webcam 4K',            spec: '60fps / USB-C',   unit: 'PCS', planQty: 50,  currentStock: 67,  safetyStock: 80,  unitCost: 59.99, currency: 'USD', expectedDate: '2026-10-05', remark: '' },
    ],
    events: [
      { id: 'evt_001', time: '2026-09-18 08:55', actor: 'Sarah Kim', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0006', type: 'create' },
      { id: 'evt_002', time: '2026-09-18 09:10', actor: 'Sarah Kim', actorRole: '采购专员', title: '提交审核', description: '黑五备货计划提交至张总审批', type: 'submit' },
    ],
  },
  pp_007: {
    id: 'pp_007', planNo: 'PP-2026-0007', title: '键盘/鼠标外设补货',
    planType: '常规补货', priority: '普通', status: '草稿',
    planDate: '2026-09-20', expectedArrival: '2026-10-15', validUntil: '2026-10-31',
    supplierId: 'sup_001', supplierName: '深圳华强电子有限公司', supplierCode: 'SUP-001',
    contactName: '李经理', contactPhone: '+86 755-8888-0001', contactEmail: 'li@hqe.cn',
    paymentTerms: 'Net 30',
    warehouseId: 'wh_004', warehouseName: 'US-Central-DFW', shippingMethod: '海运', incoterms: 'FOB', deliveryAddress: '',
    currency: 'USD', budgetAmount: 45000, taxRate: 0,
    approvalFlow: '标准审批流', approver: '', approveRemark: '',
    sourceDoc: '', relatedPoNo: '', department: '采购部', costCenter: 'CC-WAREHOUSE',
    tags: ['外设', '中部仓'],
    remark: '',
    createdBy: 'David Lee', createdAt: '2026-09-20 15:30', updatedAt: '2026-09-20 15:30',
    items: [
      { _key: 'i1', sku: 'SKU-0004', productName: 'Mechanical Keyboard', spec: 'Cherry MX Blue',   unit: 'PCS', planQty: 150, currentStock: 18,  safetyStock: 50,  unitCost: 89.99, currency: 'USD', expectedDate: '2026-10-15', remark: '库存严重不足' },
      { _key: 'i2', sku: 'SKU-0005', productName: 'Webcam 4K',           spec: '60fps / USB-C',    unit: 'PCS', planQty: 150, currentStock: 67,  safetyStock: 80,  unitCost: 59.99, currency: 'USD', expectedDate: '2026-10-15', remark: '' },
      { _key: 'i3', sku: 'SKU-0011', productName: 'Laptop Stand',        spec: 'Aluminum / Silver', unit: 'PCS', planQty: 150, currentStock: 95,  safetyStock: 50,  unitCost: 49.99, currency: 'USD', expectedDate: '2026-10-15', remark: '' },
      { _key: 'i4', sku: 'SKU-0002', productName: 'Screen Protector',    spec: 'Tempered Glass',   unit: 'PCS', planQty: 0,   currentStock: 85,  safetyStock: 150, unitCost: 8.99,  currency: 'USD', expectedDate: '',           remark: '待确认是否需要' },
    ],
    events: [
      { id: 'evt_001', time: '2026-09-20 15:30', actor: 'David Lee', actorRole: '采购专员', title: '创建计划', description: '创建采购计划单 PP-2026-0007', type: 'create' },
    ],
  },
};

// 未找到时生成占位数据
function getFallbackPlan(id: string): PurchasePlan {
  return {
    id, planNo: `PP-2026-${id.replace('pp_', '').padStart(4, '0')}`,
    title: '采购计划（加载中）',
    planType: '常规补货', priority: '普通', status: '草稿',
    planDate: '2026-09-24', expectedArrival: '', validUntil: '',
    supplierId: '', supplierName: '—', supplierCode: '', contactName: '', contactPhone: '', contactEmail: '',
    paymentTerms: 'Net 30',
    warehouseId: '', warehouseName: '—', shippingMethod: '海运', incoterms: 'FOB', deliveryAddress: '',
    currency: 'USD', budgetAmount: 0, taxRate: 0,
    approvalFlow: '标准审批流', approver: '', approveRemark: '',
    sourceDoc: '', relatedPoNo: '', department: '', costCenter: '', tags: [], remark: '',
    createdBy: '—', createdAt: '—', updatedAt: '—',
    items: [], events: [],
  };
}

// ─── 状态配置 ─────────────────────────────────────────────────────────────────

const statusConfig: Record<PlanStatus, { label: string; cls: string; dotCls: string }> = {
  '草稿':     { label: '草稿',   cls: 'bg-gray-100 text-gray-600 border-gray-200',          dotCls: 'bg-gray-400' },
  '待审核':   { label: '待审核', cls: 'bg-amber-50 text-amber-700 border-amber-200',          dotCls: 'bg-amber-500' },
  '已审核':   { label: '已审核', cls: 'bg-blue-50 text-blue-700 border-blue-200',             dotCls: 'bg-blue-500' },
  '已转订单': { label: '已转订单', cls: 'bg-green-50 text-green-700 border-green-200',        dotCls: 'bg-green-500' },
  '已取消':   { label: '已取消', cls: 'bg-red-50 text-[var(--danger)] border-red-200',        dotCls: 'bg-red-400' },
};

const priorityConfig: Record<PlanPriority, { cls: string }> = {
  '紧急': { cls: 'bg-red-50 text-[var(--danger)] border-red-200' },
  '高':   { cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  '普通': { cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  '低':   { cls: 'bg-slate-50 text-slate-400 border-slate-200' },
};

const eventTypeConfig: Record<PlanEvent['type'], { icon: React.ElementType; iconCls: string; bgCls: string }> = {
  create:  { icon: ClipboardList, iconCls: 'text-[var(--primary)]',     bgCls: 'bg-[var(--primary-soft)]' },
  submit:  { icon: Send,          iconCls: 'text-amber-600',             bgCls: 'bg-amber-50' },
  approve: { icon: CheckCircle2,  iconCls: 'text-[var(--success)]',      bgCls: 'bg-green-50' },
  reject:  { icon: XCircle,       iconCls: 'text-[var(--danger)]',       bgCls: 'bg-red-50' },
  convert: { icon: ShoppingCart,  iconCls: 'text-[var(--primary)]',      bgCls: 'bg-[var(--primary-soft)]' },
  cancel:  { icon: Ban,           iconCls: 'text-[var(--danger)]',       bgCls: 'bg-red-50' },
  edit:    { icon: Edit3,         iconCls: 'text-[var(--muted)]',        bgCls: 'bg-[var(--surface-subtle)]' },
  comment: { icon: FileText,      iconCls: 'text-[var(--muted)]',        bgCls: 'bg-[var(--surface-subtle)]' },
};

// ─── 本地状态管理 ─────────────────────────────────────────────────────────────

type LocalAction =
  | { type: 'SUBMIT' }
  | { type: 'APPROVE'; remark: string }
  | { type: 'REJECT';  remark: string }
  | { type: 'CONVERT' }
  | { type: 'CANCEL';  reason: string }
  | { type: 'REVERT_DRAFT' };

function makeEvent(title: string, desc: string, evtType: PlanEvent['type']): PlanEvent {
  return {
    id: `evt_local_${Date.now()}`,
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    actor: '当前用户',
    actorRole: '采购专员',
    title,
    description: desc,
    type: evtType,
  };
}

function planReducer(state: PurchasePlan, action: LocalAction): PurchasePlan {
  switch (action.type) {
    case 'SUBMIT':
      return {
        ...state, status: '待审核',
        events: [makeEvent('提交审核', '提交至标准审批流，等待审批', 'submit'), ...state.events],
      };
    case 'APPROVE':
      return {
        ...state, status: '已审核', approveRemark: action.remark,
        events: [makeEvent('审核通过', action.remark || '审核通过，可转采购订单', 'approve'), ...state.events],
      };
    case 'REJECT':
      return {
        ...state, status: '草稿', approveRemark: action.remark,
        events: [makeEvent('审核拒绝', action.remark || '审核未通过，请修改后重新提交', 'reject'), ...state.events],
      };
    case 'CONVERT':
      const poNo = `PO-2026-${String(Date.now()).slice(-4)}`;
      return {
        ...state, status: '已转订单', relatedPoNo: poNo,
        events: [makeEvent('转采购订单', `已生成采购订单 ${poNo}`, 'convert'), ...state.events],
      };
    case 'CANCEL':
      return {
        ...state, status: '已取消',
        events: [makeEvent('作废计划', action.reason || '手动作废', 'cancel'), ...state.events],
      };
    case 'REVERT_DRAFT':
      return {
        ...state, status: '草稿',
        events: [makeEvent('撤回至草稿', '已撤回，返回草稿状态', 'edit'), ...state.events],
      };
    default:
      return state;
  }
}

// ─── 样式常量 ─────────────────────────────────────────────────────────────────

const cardCls = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]';
const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

// ─── 操作确认弹窗 ─────────────────────────────────────────────────────────────

type DialogType = 'approve' | 'reject' | 'cancel' | 'convert' | null;

function ActionDialog({
  type, onClose, onConfirm,
}: {
  type: DialogType;
  onClose: () => void;
  onConfirm: (remark: string) => void;
}) {
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (type) { setRemark(''); setTimeout(() => textareaRef.current?.focus(), 80); }
  }, [type]);

  if (!type) return null;

  const configs: Record<NonNullable<DialogType>, { title: string; desc: string; placeholder: string; confirmLabel: string; confirmCls: string; icon: React.ElementType; required?: boolean }> = {
    approve: {
      title: '审核通过', icon: CheckCircle2,
      desc: '确认通过此采购计划？通过后可转为正式采购订单。',
      placeholder: '审核意见（可选）',
      confirmLabel: '确认通过', confirmCls: 'bg-[var(--success)] hover:opacity-90', required: false,
    },
    reject: {
      title: '审核拒绝', icon: XCircle,
      desc: '拒绝后该计划将退回草稿状态，请填写拒绝原因。',
      placeholder: '请填写拒绝原因（必填）',
      confirmLabel: '确认拒绝', confirmCls: 'bg-[var(--danger)] hover:opacity-90', required: true,
    },
    cancel: {
      title: '作废计划', icon: Ban,
      desc: '作废后该计划将不可恢复，请谨慎操作。',
      placeholder: '请填写作废原因（必填）',
      confirmLabel: '确认作废', confirmCls: 'bg-[var(--danger)] hover:opacity-90', required: true,
    },
    convert: {
      title: '转采购订单', icon: ShoppingCart,
      desc: '将此计划转为正式采购订单（PO），系统将自动生成订单编号。',
      placeholder: '备注说明（可选）',
      confirmLabel: '确认转订单', confirmCls: 'bg-[var(--primary)] hover:opacity-90', required: false,
    },
  };

  const cfg = configs[type];
  const Icon = cfg.icon;
  const canConfirm = !cfg.required || remark.trim().length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onConfirm(remark);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="mx-4 w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className={cn('flex size-7 items-center justify-center rounded-lg', type === 'approve' ? 'bg-green-50' : type === 'convert' ? 'bg-[var(--primary-soft)]' : 'bg-red-50')}>
              <Icon className={cn('size-4', type === 'approve' ? 'text-[var(--success)]' : type === 'convert' ? 'text-[var(--primary)]' : 'text-[var(--danger)]')} />
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{cfg.title}</h3>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)] transition">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[var(--muted)] leading-relaxed">{cfg.desc}</p>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
              {cfg.required && <span className="mr-0.5 text-[var(--danger)]">*</span>}
              {type === 'reject' || type === 'cancel' ? '原因说明' : '审核意见'}
            </label>
            <textarea
              ref={textareaRef}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder={cfg.placeholder}
              rows={3}
              className={cn(inputCls, 'resize-none')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={cn('flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white transition disabled:opacity-50', cfg.confirmCls)}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ visible, message, variant = 'success' }: { visible: boolean; message: string; variant?: 'success' | 'info' }) {
  return (
    <div className={cn(
      'fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-[var(--shadow-panel)] transition-all duration-300 bg-[var(--surface)]',
      variant === 'success' ? 'border-green-200' : 'border-[var(--border)]',
      visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
    )}>
      <CheckCircle2 className={cn('size-4 shrink-0', variant === 'success' ? 'text-[var(--success)]' : 'text-[var(--primary)]')} />
      <span className="text-[13px] font-medium text-[var(--foreground)]">{message}</span>
    </div>
  );
}

// ─── 信息行 ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0">
      <span className="shrink-0 text-[12px] text-[var(--muted)]">{label}</span>
      <span className={cn('text-right text-[13px] text-[var(--foreground)]', mono && 'font-mono')}>{value || '—'}</span>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function PurchasePlanDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const initial  = mockPlanDetails[id] ?? getFallbackPlan(id);

  const [plan, dispatch]  = useReducer(planReducer, initial);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg]         = useState('');
  const [activeTab, setActiveTab]       = useState<'detail' | 'items' | 'log'>('detail');
  const [copiedField, setCopiedField]   = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2600);
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1600);
  };

  const handleDialogConfirm = (remark: string) => {
    if (!dialog) return;
    const msgs: Record<NonNullable<DialogType>, string> = {
      approve: '审核已通过',
      reject:  '计划已退回草稿',
      cancel:  '计划已作废',
      convert: '已成功转为采购订单',
    };
    dispatch({
      type: dialog === 'approve' ? 'APPROVE' :
            dialog === 'reject'  ? 'REJECT'  :
            dialog === 'convert' ? 'CONVERT' : 'CANCEL',
      remark,
    } as LocalAction);
    showToast(msgs[dialog]);
  };

  // 当前状态允许的操作
  const canSubmit  = plan.status === '草稿';
  const canApprove = plan.status === '待审核';
  const canReject  = plan.status === '待审核';
  const canConvert = plan.status === '已审核';
  const canCancel  = plan.status === '草稿' || plan.status === '待审核' || plan.status === '已审核';
  const canEdit    = plan.status === '草稿';

  // 汇总
  const subtotal = plan.items.reduce((s, i) => s + i.planQty * i.unitCost, 0);
  const tax      = subtotal * (plan.taxRate / 100);
  const total    = subtotal + tax;
  const totalQty = plan.items.reduce((s, i) => s + i.planQty, 0);
  const lowStockCount = plan.items.filter(i => i.currentStock < i.safetyStock && i.safetyStock > 0).length;

  const scfg = statusConfig[plan.status];
  const pcfg = priorityConfig[plan.priority];

  // ─── 渲染 ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mx-auto max-w-[1200px] pt-5 lg:pt-6 pb-20">

        {/* ── 页头 ── */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/purchase-plans"
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{plan.title}</h1>
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium', scfg.cls)}>
                  <span className={cn('size-1.5 rounded-full', scfg.dotCls)} />
                  {scfg.label}
                </span>
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', pcfg.cls)}>
                  {plan.priority}优先级
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <span className="font-mono">{plan.planNo}</span>
                  <button onClick={() => copyText(plan.planNo, 'planNo')} className="rounded p-0.5 hover:bg-[var(--surface-hover)]">
                    {copiedField === 'planNo' ? <Check className="size-3 text-[var(--success)]" /> : <Copy className="size-3" />}
                  </button>
                </span>
                <span>·</span>
                <span>创建：{plan.createdBy} · {plan.createdAt}</span>
                {plan.sourceDoc && <><span>·</span><span>来源：{plan.sourceDoc}</span></>}
              </div>
            </div>
          </div>

          {/* 操作按钮组 */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
              <Printer className="size-3.5" />打印
            </button>
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
              <Download className="size-3.5" />导出
            </button>

            {canEdit && (
              <Link href={`/dashboard/purchase-plans/${id}/edit`} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
                <Edit3 className="size-3.5" />编辑
              </Link>
            )}
            {canSubmit && (
              <button
                onClick={() => { dispatch({ type: 'SUBMIT' }); showToast('已提交审核'); }}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-[12px] font-semibold text-white transition hover:opacity-90"
              >
                <Send className="size-3.5" />提交审核
              </button>
            )}
            {canApprove && (
              <button onClick={() => setDialog('approve')} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 text-[12px] font-semibold text-white transition hover:opacity-90">
                <CheckCircle2 className="size-3.5" />审核通过
              </button>
            )}
            {canReject && (
              <button onClick={() => setDialog('reject')} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--danger)] bg-white px-3 text-[12px] font-semibold text-[var(--danger)] transition hover:bg-red-50">
                <XCircle className="size-3.5" />拒绝
              </button>
            )}
            {canConvert && (
              <button onClick={() => setDialog('convert')} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">
                <ShoppingCart className="size-3.5" />转采购订单
              </button>
            )}
            {canCancel && (
              <button onClick={() => setDialog('cancel')} className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)] transition hover:bg-red-50">
                <Ban className="size-3.5" />作废
              </button>
            )}
          </div>
        </div>

        {/* 状态流转进度条 */}
        <div className={cn(cardCls, 'mb-5 px-6 py-4')}>
          <div className="flex items-center gap-0">
            {(['草稿', '待审核', '已审核', '已转订单'] as const).map((s, idx) => {
              const steps: PlanStatus[] = ['草稿', '待审核', '已审核', '已转订单'];
              const currentIdx = plan.status === '已取消' ? -1 : steps.indexOf(plan.status);
              const stepIdx = steps.indexOf(s);
              const isDone    = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;
              const isCancelled = plan.status === '已取消';
              return (
                <div key={s} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      'flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all',
                      isCancelled ? 'border-gray-200 bg-gray-50 text-gray-300'
                      : isDone    ? 'border-[var(--success)] bg-[var(--success)] text-white'
                      : isCurrent ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]'
                    )}>
                      {isDone ? <Check className="size-3.5" /> : idx + 1}
                    </div>
                    <span className={cn(
                      'whitespace-nowrap text-[11px] font-medium',
                      isCancelled ? 'text-gray-300'
                      : isCurrent ? 'text-[var(--primary)]'
                      : isDone    ? 'text-[var(--success)]'
                      : 'text-[var(--muted-foreground)]'
                    )}>{s}</span>
                  </div>
                  {idx < 3 && (
                    <div className={cn(
                      'mb-5 h-[2px] flex-1 mx-1 rounded-full transition-all',
                      isCancelled ? 'bg-gray-100'
                      : isDone ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                    )} />
                  )}
                </div>
              );
            })}
            {plan.status === '已取消' && (
              <div className="ml-4 flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1">
                <Ban className="size-3.5 text-[var(--danger)]" />
                <span className="text-[11px] font-medium text-[var(--danger)]">已取消</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 内容区：左主 + 右侧边 ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">

          {/* ── 左主体 ── */}
          <div className="flex flex-col gap-5">

            {/* Tab 切换 */}
            <div className={cn(cardCls, 'overflow-hidden')}>
              <div className="flex border-b border-[var(--border)]">
                {([
                  { key: 'detail', label: '单据详情' },
                  { key: 'items',  label: `采购明细（${plan.items.length}）` },
                  { key: 'log',    label: `操作日志（${plan.events.length}）` },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'relative px-5 py-3 text-[13px] font-medium transition-colors',
                      activeTab === tab.key ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.key && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                ))}
              </div>

              {/* Tab: 单据详情 */}
              {activeTab === 'detail' && (
                <div className="grid grid-cols-1 gap-0 divide-y divide-[var(--border-subtle)] sm:grid-cols-2 sm:divide-y-0">
                  {/* 基本信息 */}
                  <div className="p-5 sm:border-r sm:border-[var(--border-subtle)]">
                    <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <ClipboardList className="size-3.5" />基本信息
                    </p>
                    <InfoRow label="计划类型" value={plan.planType} />
                    <InfoRow label="计划日期" value={plan.planDate} />
                    <InfoRow label="预计到货" value={plan.expectedArrival} />
                    <InfoRow label="计划有效期" value={plan.validUntil || '未设置'} />
                    <InfoRow label="申请部门" value={plan.department} />
                    <InfoRow label="成本中心" value={<span className="font-mono">{plan.costCenter}</span>} />
                    <InfoRow label="来源单据" value={plan.sourceDoc} />
                    {plan.relatedPoNo && (
                      <InfoRow label="关联 PO" value={
                        <span className="flex items-center gap-1 font-mono text-[var(--primary)]">
                          {plan.relatedPoNo}
                          <ExternalLink className="size-3" />
                        </span>
                      } />
                    )}
                    {plan.tags.length > 0 && (
                      <div className="flex items-start justify-between gap-4 py-2">
                        <span className="shrink-0 text-[12px] text-[var(--muted)]">标签</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {plan.tags.map(t => (
                            <span key={t} className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 供应商 + 交货 */}
                  <div className="p-5">
                    <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <Building2 className="size-3.5" />供应商
                    </p>
                    <InfoRow label="供应商" value={<span className="font-medium">{plan.supplierName}</span>} />
                    <InfoRow label="供应商代码" value={<span className="font-mono">{plan.supplierCode}</span>} />
                    <InfoRow label="联系人" value={plan.contactName} />
                    <InfoRow label="联系电话" value={plan.contactPhone} />
                    <InfoRow label="联系邮箱" value={plan.contactEmail} />
                    <InfoRow label="付款条款" value={plan.paymentTerms} />

                    <p className="mb-3 mt-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <MapPin className="size-3.5" />交货信息
                    </p>
                    <InfoRow label="目标仓库" value={plan.warehouseName} />
                    <InfoRow label="运输方式" value={plan.shippingMethod} />
                    <InfoRow label="贸易条款" value={plan.incoterms} />
                    {plan.deliveryAddress && <InfoRow label="交货地址" value={plan.deliveryAddress} />}
                  </div>

                  {/* 财务 + 审批 — 跨列 */}
                  <div className="p-5 sm:col-span-2 sm:border-t sm:border-[var(--border-subtle)]">
                    <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:divide-x sm:divide-[var(--border-subtle)]">
                      <div className="sm:pr-5">
                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                          <TrendingUp className="size-3.5" />财务与结算
                        </p>
                        <InfoRow label="结算货币" value={plan.currency} />
                        <InfoRow label="预算金额" value={plan.budgetAmount ? `${plan.currency} ${plan.budgetAmount.toLocaleString()}` : '未设置'} />
                        <InfoRow label="税率" value={`${plan.taxRate}%`} />
                        <InfoRow label="货款小计" value={<span className="font-medium">{plan.currency} {subtotal.toFixed(2)}</span>} />
                        <InfoRow label="税额" value={`${plan.currency} ${tax.toFixed(2)}`} />
                        <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border-subtle)]">
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">预估总金额</span>
                          <span className="text-[16px] font-bold text-[var(--primary)]">{plan.currency} {total.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 sm:pl-5">
                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                          <Settings2 className="size-3.5" />审批信息
                        </p>
                        <InfoRow label="审批流程" value={plan.approvalFlow} />
                        <InfoRow label="审批人" value={plan.approver || '自动分配'} />
                        {plan.approveRemark && (
                          <div className="mt-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2.5 text-[12px] text-[var(--muted)] leading-relaxed border border-[var(--border-subtle)]">
                            "{plan.approveRemark}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 备注 */}
                  {plan.remark && (
                    <div className="p-5 sm:col-span-2 sm:border-t sm:border-[var(--border-subtle)]">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">备注</p>
                      <p className="text-[13px] text-[var(--muted)] leading-relaxed">{plan.remark}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: 采购明细 */}
              {activeTab === 'items' && (
                <div>
                  {lowStockCount > 0 && (
                    <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {lowStockCount} 个商品当前库存低于安全库存
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-[13px]">
                      <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                        <tr>
                          <th className="whitespace-nowrap px-5 py-2.5 text-left w-6">#</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-left">商品 / SKU</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-left">规格</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-left">单位</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">现库存</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">安全库存</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">计划数量</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">参考单价</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">小计</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-left">期望到货</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-left">备注</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {plan.items.map((item, idx) => {
                          const isLow = item.currentStock < item.safetyStock && item.safetyStock > 0;
                          return (
                            <tr key={item._key} className={cn('transition-colors hover:bg-[var(--surface-subtle)]', isLow && 'bg-amber-50/40')}>
                              <td className="px-5 py-3 text-[11px] text-[var(--muted-foreground)]">{idx + 1}</td>
                              <td className="px-3 py-3">
                                <p className="font-medium text-[var(--foreground)]">{item.productName}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{item.sku}</p>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{item.spec || '—'}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{item.unit}</td>
                              <td className={cn('whitespace-nowrap px-3 py-3 text-right text-[13px] font-medium', isLow ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
                                {item.currentStock.toLocaleString()}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-right text-[12px] text-[var(--muted)]">{item.safetyStock.toLocaleString()}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">{item.planQty.toLocaleString()}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] text-[var(--foreground)]">{item.currency} {item.unitCost.toFixed(2)}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold text-[var(--foreground)]">
                                {item.currency} {(item.planQty * item.unitCost).toFixed(2)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{item.expectedDate || '—'}</td>
                              <td className="px-3 py-3 text-[12px] text-[var(--muted)] max-w-[140px]">{item.remark || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
                        <tr>
                          <td colSpan={6} className="px-5 py-3 text-[12px] text-[var(--muted)]">
                            合计：{plan.items.filter(i => i.sku).length} 品
                          </td>
                          <td className="px-3 py-3 text-right text-[13px] font-bold text-[var(--foreground)]">
                            {totalQty.toLocaleString()} 件
                          </td>
                          <td className="px-3 py-3" />
                          <td className="px-3 py-3 text-right">
                            <p className="text-[12px] text-[var(--muted)]">小计</p>
                            <p className="text-[13px] font-bold text-[var(--foreground)]">{plan.currency} {subtotal.toFixed(2)}</p>
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: 操作日志 */}
              {activeTab === 'log' && (
                <div className="p-5">
                  {plan.events.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-2 text-[var(--muted)]">
                      <Clock className="size-7 text-[var(--border)]" />
                      <p className="text-[13px]">暂无操作日志</p>
                    </div>
                  ) : (
                    <div className="relative ml-3">
                      {/* 竖线 */}
                      <div className="absolute left-3 top-4 bottom-4 w-[1px] bg-[var(--border)]" />
                      <div className="flex flex-col gap-0">
                        {[...plan.events].reverse().map((evt, idx) => {
                          const ecfg = eventTypeConfig[evt.type];
                          const EIcon = ecfg.icon;
                          return (
                            <div key={evt.id} className="relative flex gap-4 pb-6 last:pb-0">
                              {/* 时间线节点 */}
                              <div className={cn('relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)]', ecfg.bgCls)}>
                                <EIcon className={cn('size-3', ecfg.iconCls)} />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13px] font-semibold text-[var(--foreground)]">{evt.title}</span>
                                  <span className="shrink-0 text-[11px] text-[var(--muted)]">{evt.time}</span>
                                </div>
                                <p className="mt-0.5 text-[12px] text-[var(--muted)] leading-relaxed">{evt.description}</p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <div className="flex size-4 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[9px] font-bold text-[var(--primary)]">
                                    {evt.actor.charAt(0)}
                                  </div>
                                  <span className="text-[11px] text-[var(--muted-foreground)]">{evt.actor}</span>
                                  <span className="text-[11px] text-[var(--muted-foreground)]">·</span>
                                  <span className="text-[11px] text-[var(--muted-foreground)]">{evt.actorRole}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 右侧边栏 ── */}
          <div className="flex flex-col gap-4">

            {/* 单据摘要 */}
            <div className={cn(cardCls, 'p-4')}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">单据摘要</p>
              <div className="flex flex-col gap-0">
                <InfoRow label="品目数" value={<span className="font-medium">{plan.items.length} 品</span>} />
                <InfoRow label="总数量" value={<span className="font-medium">{totalQty.toLocaleString()} 件</span>} />
                <InfoRow label="货款小计" value={`${plan.currency} ${subtotal.toFixed(2)}`} />
                <InfoRow label="税额" value={`${plan.currency} ${tax.toFixed(2)}`} />
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-[13px] font-semibold text-[var(--foreground)]">预估总额</span>
                  <span className="text-[15px] font-bold text-[var(--primary)]">{plan.currency} {total.toFixed(2)}</span>
                </div>
              </div>

              {/* 预算对比 */}
              {plan.budgetAmount > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted)]">预算额度</span>
                    <span className="font-medium text-[var(--foreground)]">{plan.currency} {plan.budgetAmount.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--border)]">
                    <div
                      className={cn('h-full rounded-full transition-all', total > plan.budgetAmount ? 'bg-[var(--danger)]' : 'bg-[var(--success)]')}
                      style={{ width: `${Math.min(100, (total / plan.budgetAmount) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className={cn('mt-1.5 text-[11px]', total > plan.budgetAmount ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
                    {total > plan.budgetAmount
                      ? `超出预算 ${plan.currency} ${(total - plan.budgetAmount).toFixed(2)}`
                      : `剩余预算 ${plan.currency} ${(plan.budgetAmount - total).toFixed(2)}`
                    }
                  </p>
                </div>
              )}

              {/* 库存预警 */}
              {lowStockCount > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">{lowStockCount} 个商品库存低于安全库存</p>
                </div>
              )}
            </div>

            {/* 可用操作 */}
            <div className={cn(cardCls, 'p-4')}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">可用操作</p>
              <div className="flex flex-col gap-2">
                {canSubmit && (
                  <button onClick={() => { dispatch({ type: 'SUBMIT' }); showToast('已提交审核'); }}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-[13px] font-semibold text-white transition hover:opacity-90">
                    <Send className="size-3.5" />提交审核
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => setDialog('approve')}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--success)] text-[13px] font-semibold text-white transition hover:opacity-90">
                    <CheckCircle2 className="size-3.5" />审核通过
                  </button>
                )}
                {canReject && (
                  <button onClick={() => setDialog('reject')}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--danger)] text-[13px] font-semibold text-[var(--danger)] transition hover:bg-red-50">
                    <XCircle className="size-3.5" />审核拒绝
                  </button>
                )}
                {canConvert && (
                  <button onClick={() => setDialog('convert')}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90">
                    <ShoppingCart className="size-3.5" />转采购订单
                  </button>
                )}
                {canEdit && (
                  <Link href={`/dashboard/purchase-plans/${id}/edit`}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]">
                    <Edit3 className="size-3.5" />编辑计划
                  </Link>
                )}
                {canCancel && (
                  <button onClick={() => setDialog('cancel')}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] text-[13px] font-medium text-[var(--danger)] transition hover:bg-red-50">
                    <Ban className="size-3.5" />作废计划
                  </button>
                )}
                {!canSubmit && !canApprove && !canConvert && !canCancel && !canEdit && (
                  <p className="py-2 text-center text-[12px] text-[var(--muted)]">该状态下无可用操作</p>
                )}
              </div>
            </div>

            {/* 关联信息 */}
            {(plan.relatedPoNo || plan.sourceDoc) && (
              <div className={cn(cardCls, 'p-4')}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">关联单据</p>
                {plan.sourceDoc && (
                  <Link href={`/dashboard/replenishment`}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5 mb-2 transition hover:bg-[var(--surface-hover)]">
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">来源单据</p>
                      <p className="font-mono text-[13px] font-medium text-[var(--foreground)]">{plan.sourceDoc}</p>
                    </div>
                    <ChevronRight className="size-4 text-[var(--muted)]" />
                  </Link>
                )}
                {plan.relatedPoNo && (
                  <Link href={`/dashboard/purchase-orders`}
                    className="flex items-center justify-between rounded-lg border border-[var(--primary-soft)] bg-[var(--primary-soft)] px-3 py-2.5 transition hover:opacity-90">
                    <div>
                      <p className="text-[10px] text-[var(--primary)]">已转采购订单</p>
                      <p className="font-mono text-[13px] font-semibold text-[var(--primary)]">{plan.relatedPoNo}</p>
                    </div>
                    <ExternalLink className="size-4 text-[var(--primary)]" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作弹窗 */}
      <ActionDialog type={dialog} onClose={() => setDialog(null)} onConfirm={handleDialogConfirm} />

      {/* Toast */}
      <Toast visible={toastVisible} message={toastMsg} />
    </>
  );
}
