'use client';

import React, { use, useReducer, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2,
  ChevronRight, Package, Plus, RotateCcw, Scan, Trash2, X, Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentSession } from '@/lib/session-context';
import {
  qcOrders, returnOrders, refundDocuments,
  qcStaffList, checklistTemplates,
  qcStatusConfig, qcTypeLabels, qcTypeColors, qcPriorityConfig, refundStatusConfig,
  checklistCategoryLabels,
  getRefundByReturnId,
  type QCOrder, type QCLineItem, type QCType, type QCPriority,
  type QCBarcodeEntry, type ChecklistItem, type QCPhoto, type QCPhotoScope,
  type ChecklistCategory,
} from '@/lib/mock-data/return-orders';
// ─── sessionStorage key ───────────────────────────────────────────────────────
const qcStorageKey = (id: string) => `qc_draft_${id}`;

// ─── State Machine ────────────────────────────────────────────────────────────

type QCAction =
  | { type: 'START'; inspector: string; reviewer?: string }
  | { type: 'UPDATE_LINE'; lineItemId: string; patch: Partial<QCLineItem> }
  | { type: 'UPDATE_BARCODE'; lineItemId: string; scanned: string[]; scannedBy: string }
  | { type: 'UPDATE_CHECKLIST'; itemId: string; result: ChecklistItem['result']; note?: string }
  | { type: 'ADD_CHECKLIST_ITEM'; item: Omit<ChecklistItem, 'id'> }
  | { type: 'REMOVE_CHECKLIST_ITEM'; itemId: string }
  | { type: 'ADD_PHOTO'; photo: Omit<QCPhoto, 'id'> }
  | { type: 'REMOVE_PHOTO'; photoId: string }
  | { type: 'ADD_LINE'; line: Omit<QCLineItem, 'restockQty' | 'scrapQty'> }
  | { type: 'REMOVE_LINE'; lineItemId: string }
  | { type: 'SUBMIT_FOR_REVIEW' }
  | { type: 'APPROVE_REVIEW'; reviewer: string; note?: string }
  | { type: 'REJECT_REVIEW'; reviewer: string; reason: string }
  | { type: 'COMPLETE'; conclusion: NonNullable<QCOrder['conclusion']>; overallNote: string; inspector: string }
  | { type: 'MARK_DISPUTED'; reason: string }
  | { type: 'REOPEN'; note: string }
  | { type: 'CANCEL'; reason: string };

function buildInitQC(returnId: string, returnOrder: typeof returnOrders[0]): QCOrder {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // 默认用退货标准模板
  const template = checklistTemplates.find((t) => t.id === 'rma_standard')!;
  return {
    id: `qc_${returnId}`,
    qcNo: `QC-${date}-${returnId.slice(-3).toUpperCase()}`,
    qcType: 'rma',
    sourceDoc: { type: 'rma', docId: returnId, docNo: returnOrder.returnNo, linkPath: `/dashboard/returns/${returnId}` },
    warehouseInfo: returnOrder.returnWarehouseCode ? {
      warehouseCode: returnOrder.returnWarehouseCode,
      warehouseName: returnOrder.returnWarehouse ?? returnOrder.returnWarehouseCode,
      qcZone: '退货质检区',
      tempStorageLocation: 'TMP-待分配',
    } : undefined,
    task: {
      taskNo: `TASK-${date}-${returnId.slice(-3).toUpperCase()}`,
      priority: 'normal',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
    checklist: template.items.map((item, i) => ({ ...item, id: `cl_init_${i}` })),
    photos: [],
    returnOrderId: returnId,
    receiptOrderId: '',
    status: 'draft',
    lineItems: returnOrder.lineItems.map((li, i) => ({
      id: `qcl_${i}`,
      lineItemId: li.lineItemId,
      sku: li.sku,
      title: li.title,
      variantTitle: li.variantTitle,
      expectedQty: li.quantity,
      receivedQty: li.quantity,
      goodQty: 0, defectiveQty: 0, wrongItemQty: 0, missingQty: 0,
      disposition: 'restock' as const,
      restockQty: 0, scrapQty: 0,
      photos: [],
    })),
    barcodes: returnOrder.lineItems.map((li) => ({
      lineItemId: li.lineItemId, sku: li.sku, title: li.title, expectedQty: li.quantity,
      barcodeType: 'UPC' as const, expectedBarcodes: [], scanStatus: 'pending' as const,
    })),
  };
}

function reducer(state: QCOrder, action: QCAction): QCOrder {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  switch (action.type) {

    case 'START':
      return { ...state, status: 'in_progress', inspector: action.inspector,
        reviewer: action.reviewer ?? state.reviewer,
        startedAt: now,
        task: state.task ? { ...state.task, assignedTo: action.inspector } : undefined };

    case 'UPDATE_LINE':
      return { ...state, lineItems: state.lineItems.map((l) =>
        l.lineItemId === action.lineItemId ? { ...l, ...action.patch } : l) };

    case 'UPDATE_BARCODE':
      return { ...state, barcodes: (state.barcodes ?? []).map((b) =>
        b.lineItemId === action.lineItemId
          ? { ...b, scannedBarcodes: action.scanned, scannedBy: action.scannedBy, scannedAt: now,
              scanStatus: action.scanned.length === 0 ? 'pending'
                : action.scanned.every((s) => b.expectedBarcodes.length === 0 || b.expectedBarcodes.includes(s)) ? 'matched' : 'mismatch' }
          : b) };

    case 'UPDATE_CHECKLIST':
      return { ...state, checklist: (state.checklist ?? []).map((c) =>
        c.id === action.itemId ? { ...c, result: action.result, note: action.note ?? c.note } : c) };

    case 'ADD_CHECKLIST_ITEM':
      return { ...state, checklist: [...(state.checklist ?? []), { ...action.item, id: `cl_${Date.now()}` }] };

    case 'REMOVE_CHECKLIST_ITEM':
      return { ...state, checklist: (state.checklist ?? []).filter((c) => c.id !== action.itemId) };

    case 'ADD_PHOTO':
      return { ...state, photos: [...(state.photos ?? []), { ...action.photo, id: `ph_${Date.now()}` }] };

    case 'REMOVE_PHOTO':
      return { ...state, photos: (state.photos ?? []).filter((p) => p.id !== action.photoId) };

    case 'ADD_LINE':
      return { ...state, lineItems: [...state.lineItems, { ...action.line, restockQty: 0, scrapQty: 0 }] };

    case 'REMOVE_LINE':
      return { ...state, lineItems: state.lineItems.filter((l) => l.lineItemId !== action.lineItemId) };

    case 'UPDATE_LINE':
      return { ...state, lineItems: state.lineItems.map((l) =>
        l.lineItemId === action.lineItemId ? { ...l, ...action.patch } : l) };

    case 'UPDATE_BARCODE':
      return { ...state, barcodes: (state.barcodes ?? []).map((b) =>
        b.lineItemId === action.lineItemId
          ? { ...b, scannedBarcodes: action.scanned, scannedBy: action.scannedBy, scannedAt: now,
              scanStatus: action.scanned.length === 0 ? 'pending'
                : action.scanned.every((s) => b.expectedBarcodes.length === 0 || b.expectedBarcodes.includes(s)) ? 'matched' : 'mismatch' }
          : b) };

    case 'SUBMIT_FOR_REVIEW':
      return { ...state, status: 'pending_review', submittedAt: now };

    case 'APPROVE_REVIEW': {
      const lines = computeLines(state.lineItems);
      const { rate } = computeStats(lines);
      const conclusionVal: NonNullable<QCOrder['conclusion']> = rate === 100 ? 'pass' : rate === 0 ? 'fail' : 'partial_pass';
      const updated: QCOrder = { ...state, status: 'completed', conclusion: conclusionVal,
        reviewedAt: now, reviewedBy: action.reviewer, reviewNote: action.note,
        completedAt: now, lineItems: lines,
        refundRecommendation: buildRecommendation(conclusionVal, state.overallNote ?? '', lines) };
      try { sessionStorage.setItem(qcStorageKey(state.returnOrderId), JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    }

    case 'REJECT_REVIEW':
      return { ...state, status: 'in_progress', reviewedAt: now, reviewedBy: action.reviewer, reviewNote: action.reason };

    case 'COMPLETE': {
      const lines = computeLines(state.lineItems);
      const updated = { ...state, status: 'completed' as const, conclusion: action.conclusion,
        overallNote: action.overallNote, inspector: action.inspector || state.inspector,
        completedAt: now, lineItems: lines,
        refundRecommendation: buildRecommendation(action.conclusion, action.overallNote, lines) };
      try { sessionStorage.setItem(qcStorageKey(state.returnOrderId), JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    }

    case 'MARK_DISPUTED':
      return { ...state, status: 'disputed', overallNote: action.reason };

    case 'REOPEN':
      return { ...state, status: 'in_progress', overallNote: action.note, completedAt: undefined, reviewedAt: undefined };

    case 'CANCEL':
      return { ...state, status: 'cancelled', cancelledAt: now, cancelReason: action.reason };

    default: return state;
  }
}

function computeLines(lines: QCLineItem[]): QCLineItem[] {
  return lines.map((l) => ({
    ...l,
    restockQty: l.disposition === 'restock' ? l.goodQty : 0,
    scrapQty: ['scrap', 'quarantine'].includes(l.disposition) ? l.defectiveQty + l.wrongItemQty : 0,
  }));
}
function computeStats(lines: QCLineItem[]) {
  const totalReceived = lines.reduce((s, l) => s + l.receivedQty, 0);
  const totalGood     = lines.reduce((s, l) => s + l.goodQty, 0);
  const rate = totalReceived > 0 ? Math.round((totalGood / totalReceived) * 100) : 0;
  return { rate, totalGood, totalReceived };
}
function buildRecommendation(conclusion: NonNullable<QCOrder['conclusion']>, reason: string, lines: QCLineItem[]) {
  const { rate } = computeStats(lines);
  return {
    fullRefund: conclusion === 'fail',
    recommendedRate: conclusion === 'pass' ? 0 : conclusion === 'fail' ? 100 : 100 - rate,
    recommendedAmount: 0,
    reason,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const conclusionConfig = {
  pass:         { label: '全部通过',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', icon: '✓', bg: 'bg-emerald-50' },
  partial_pass: { label: '部分通过',   cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400',   icon: '~', bg: 'bg-amber-50'   },
  fail:         { label: '全部不通过', cls: 'bg-red-50 text-[var(--danger)] ring-red-200',      dot: 'bg-red-500',     icon: '✗', bg: 'bg-red-50'    },
};

const dispositionLabels: Record<QCLineItem['disposition'], { label: string; cls: string; short: string }> = {
  restock:          { label: '入库上架', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', short: '上架' },
  scrap:            { label: '报废',     cls: 'bg-red-50 text-[var(--danger)] ring-red-200',      short: '报废' },
  return_to_vendor: { label: '退供应商', cls: 'bg-purple-50 text-purple-700 ring-purple-200',     short: '退厂' },
  repair:           { label: '维修',     cls: 'bg-blue-50 text-blue-700 ring-blue-200',            short: '维修' },
  quarantine:       { label: '隔离',     cls: 'bg-amber-50 text-amber-700 ring-amber-200',         short: '隔离' },
};

const scanStatusConfig: Record<QCBarcodeEntry['scanStatus'], { label: string; cls: string }> = {
  pending:  { label: '待扫描', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  matched:  { label: '匹配',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  mismatch: { label: '异常',   cls: 'bg-red-50 text-[var(--danger)] ring-red-200' },
  extra:    { label: '多余',   cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] resize-none';
const btnPrimary   = 'h-9 rounded-xl bg-[var(--primary)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40';
const btnSecondary = 'h-9 rounded-xl border border-[var(--border)] px-4 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-hover)]';
const btnDanger    = 'h-9 rounded-xl bg-[var(--danger)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40';

function NumCell({ value, onChange, max, colorCls }: { value: number; onChange: (v: number) => void; max: number; colorCls?: string }) {
  return (
    <input type="number" min={0} max={max} value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
      className={cn('w-14 rounded-lg border px-2 py-1 text-center text-[13px] focus:outline-none focus:ring-1',
        colorCls ?? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-[var(--focus-ring)]')} />
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 text-[12px]">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function QCPageInner({ returnId }: { returnId: string }) {
  const searchParams = useSearchParams();
  const fromQCList = searchParams.get('from') === 'qc-list';
  const backHref  = fromQCList ? '/dashboard/qc' : `/dashboard/returns/${returnId}`;
  const backLabel = fromQCList ? '质检单列表' : '售后申请';

  const returnOrder = returnOrders.find((r) => r.id === returnId);
  const existing    = qcOrders.find((q) => q.returnOrderId === returnId);
  const refundDoc   = getRefundByReturnId(returnId);

  const initQC: QCOrder = existing ?? (returnOrder ? buildInitQC(returnId, returnOrder) : ({} as QCOrder));
  const [state, dispatch] = useReducer(reducer, initQC);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toast$ = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); };

  // ── 新增商品弹窗 state ──
  const [showAddLine, setShowAddLine]       = useState(false);
  const [newLineSku, setNewLineSku]         = useState('');  // used as search query in picker
  const [addLineSelected, setAddLineSelected] = useState<Set<string>>(new Set());
  // ── 展开行（照片/检验） ──
  const [expandedRows, setExpandedRows]     = useState<Set<string>>(new Set());
  // ── 新增检查项 ──
  const [showAddCheck, setShowAddCheck]       = useState(false);
  const [newCheckCat, setNewCheckCat]         = useState<ChecklistCategory>('visual');
  const [newCheckItem, setNewCheckItem]       = useState('');
  const [newCheckReq, setNewCheckReq]         = useState('');

  // Modal states
  const [inspectorVal, setInspectorVal] = useState(state.inspector ?? currentSession.name);
  const [reviewerVal2, setReviewerVal2] = useState(state.reviewer ?? currentSession.name);
  const [showStart, setShowStart]       = useState(false);
  const [conclusion, setConclusion]     = useState<NonNullable<QCOrder['conclusion']>>('partial_pass');
  const [overallNote, setOverallNote]   = useState(''); const [showSubmit, setShowSubmit] = useState(false);
  const [reviewerVal, setReviewerVal]   = useState(currentSession.name);
  const [reviewNote, setReviewNote]     = useState(''); const [showApprove, setShowApprove] = useState(false);
  const [rejectReason, setRejectReason] = useState(''); const [showReject, setShowReject] = useState(false);
  const [cancelReason, setCancelReason] = useState(''); const [showCancel, setShowCancel] = useState(false);
  const [reopenNote, setReopenNote]     = useState(''); const [showReopen, setShowReopen] = useState(false);

  // Barcode
  const [barcodeTargetId, setBarcodeTargetId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput]       = useState('');
  const [scannedList, setScannedList]         = useState<string[]>([]);
  const [showBarcode, setShowBarcode]         = useState(false);

  const barcodeTarget = barcodeTargetId ? (state.barcodes ?? []).find((b) => b.lineItemId === barcodeTargetId) ?? null : null;
  const openBarcode = (lineItemId: string) => {
    const entry = (state.barcodes ?? []).find((b) => b.lineItemId === lineItemId);
    if (!entry) return;
    setBarcodeTargetId(lineItemId); setScannedList(entry.scannedBarcodes ?? []); setBarcodeInput(''); setShowBarcode(true);
  };
  const mockScanCodes: Record<string, string> = { UPC: '012345678901', EAN: '4006381333931', FNSKU: 'X00123456AB', ASIN: 'B0CX123456', '自定义': 'CUSTOM-001' };

  if (!returnOrder) return (
    <div className="mx-auto max-w-[1440px] pt-5">
      <Link href="/dashboard/returns" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />售后申请
      </Link>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <Package className="mx-auto size-10 text-[var(--border)]" />
        <p className="mt-3 text-[14px] font-medium">未找到售后申请</p>
      </div>
    </div>
  );

  const s          = state.status;
  const sc         = qcStatusConfig[s] ?? qcStatusConfig.draft;
  const isFinal    = ['completed', 'cancelled'].includes(s);
  const canStart   = s === 'draft';
  const canEdit    = s === 'in_progress';
  const canSubmitReview = s === 'in_progress';
  const canApprove = s === 'pending_review';
  const canDispute = s === 'completed';
  const canReopen  = s === 'disputed';
  const canCancel  = !isFinal && s !== 'disputed';

  // Totals
  const totalExpected  = state.lineItems?.reduce((n, l) => n + l.expectedQty, 0) ?? 0;
  const totalReceived  = state.lineItems?.reduce((n, l) => n + l.receivedQty, 0) ?? 0;
  const totalGood      = state.lineItems?.reduce((n, l) => n + l.goodQty, 0) ?? 0;
  const totalDefective = state.lineItems?.reduce((n, l) => n + l.defectiveQty, 0) ?? 0;
  const totalWrong     = state.lineItems?.reduce((n, l) => n + l.wrongItemQty, 0) ?? 0;
  const totalMissing   = state.lineItems?.reduce((n, l) => n + l.missingQty, 0) ?? 0;

  const lineValidation = (state.lineItems ?? []).map((l) => {
    const sum = l.goodQty + l.defectiveQty + l.wrongItemQty + l.missingQty;
    return { ok: sum === l.receivedQty, sum, expected: l.receivedQty };
  });
  const allLinesValid = lineValidation.every((v) => v.ok);
  const hasAnyQty     = totalGood + totalDefective + totalWrong + totalMissing > 0;

  const qcTypeCls  = state.qcType ? qcTypeColors[state.qcType] : '';
  const priorityCfg = state.task?.priority ? qcPriorityConfig[state.task.priority] : null;

  const steps = [
    { label: '已创建',   done: true,                                                          active: s === 'draft' },
    { label: '质检中',   done: ['in_progress', 'pending_review', 'completed', 'disputed'].includes(s), active: s === 'in_progress' },
    { label: '待复核',   done: ['pending_review', 'completed', 'disputed'].includes(s),        active: s === 'pending_review' },
    { label: '已完成',   done: ['completed', 'disputed'].includes(s),                          active: s === 'completed' },
  ].filter((_, i) => s !== 'cancelled' || i < 2);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {toast && (
        <div className={cn('fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-5 py-3 text-[13px] font-medium text-white shadow-2xl', toast.ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')}>
          {toast.msg}
        </div>
      )}

      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-3.5" />{backLabel}{!fromQCList && ` ${returnOrder.returnNo}`}
      </Link>

      {/* ══ Header ══ */}
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-semibold">质检单 {state.qcNo}</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.cls)}>
                <span className={cn('size-1.5 rounded-full', sc.dot)} />{sc.label}
              </span>
              {state.qcType && (
                <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', qcTypeCls)}>
                  {qcTypeLabels[state.qcType]}
                </span>
              )}
              {priorityCfg && state.task?.priority !== 'normal' && (
                <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', priorityCfg.cls)}>
                  {priorityCfg.label}
                </span>
              )}
              {state.conclusion && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', conclusionConfig[state.conclusion].cls)}>
                  <span className={cn('size-1.5 rounded-full', conclusionConfig[state.conclusion].dot)} />
                  {conclusionConfig[state.conclusion].label}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
              <span>来源：<Link href={`/dashboard/returns/${returnId}`} className="text-[var(--primary)] hover:underline">{returnOrder.returnNo}</Link></span>
              {state.warehouseInfo && <><span>·</span><span>仓库：{state.warehouseInfo.warehouseCode}</span></>}
              {state.inspector && <><span>·</span><span>质检员：{state.inspector}</span></>}
              {state.completedAt && <><span>·</span><span>完成：{state.completedAt.slice(0, 16)}</span></>}
            </div>
          </div>

          {/* ── 操作按钮 ── */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* 草稿 → 开始质检 */}
            {canStart && (
              <button onClick={() => { setInspectorVal(currentSession.name); setShowStart(true); }}
                className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                开始质检
              </button>
            )}
            {/* 质检中 → 提交复核 or 直接完成 */}
            {canSubmitReview && allLinesValid && hasAnyQty && (
              <>
                <button onClick={() => { dispatch({ type: 'SUBMIT_FOR_REVIEW' }); toast$('已提交复核，等待主管确认'); }}
                  className="h-8 rounded-lg border border-blue-300 bg-blue-50 px-3 text-[13px] font-medium text-blue-700 hover:bg-blue-100">
                  提交待复核
                </button>
                <button onClick={() => { setConclusion('partial_pass'); setOverallNote(''); setShowSubmit(true); }}
                  className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                  直接完成
                </button>
              </>
            )}
            {canSubmitReview && (!allLinesValid || !hasAnyQty) && (
              <button disabled title={!hasAnyQty ? '请录入质检数量' : '部分行不守恒，请修正'}
                className="h-8 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white opacity-40 cursor-not-allowed">
                提交待复核
              </button>
            )}
            {/* 待复核 → 通过 / 打回 */}
            {canApprove && (
              <>
                <button onClick={() => { setReviewerVal(currentSession.name); setReviewNote(''); setShowApprove(true); }}
                  className="h-8 rounded-lg bg-[var(--success)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                  复核通过
                </button>
                <button onClick={() => { setReviewerVal(currentSession.name); setRejectReason(''); setShowReject(true); }}
                  className="h-8 rounded-lg border border-amber-300 px-3 text-[13px] font-medium text-amber-700 hover:bg-amber-50">
                  打回重检
                </button>
              </>
            )}
            {/* 有争议 → 重新检验 */}
            {canReopen && (
              <button onClick={() => { setReopenNote(''); setShowReopen(true); }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)]">
                <RotateCcw className="size-3.5" />重新检验
              </button>
            )}
            {/* 完成 → 标记争议 */}
            {canDispute && (
              <button onClick={() => { const r = prompt('争议说明'); if (r) { dispatch({ type: 'MARK_DISPUTED', reason: r }); toast$('已标记争议', false); } }}
                className="h-8 rounded-lg border border-amber-200 px-3 text-[13px] font-medium text-amber-700 hover:bg-amber-50">
                标记争议
              </button>
            )}
            {/* 完成后 → 创建入库单 */}
            {s === 'completed' && (
              <Link href={`/dashboard/returns/${returnId}/receipt`}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
                创建入库单 <ChevronRight className="size-3.5" />
              </Link>
            )}
            {/* 取消（仅草稿/进行中/待复核可取消） */}
            {canCancel && (
              <button onClick={() => { setCancelReason(''); setShowCancel(true); }}
                className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--danger)] hover:bg-red-50">
                取消质检单
              </button>
            )}
          </div>
        </div>

        {/* 步骤条 */}
        {s !== 'cancelled' && (
          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {steps.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px]',
                      step.done ? (step.active ? 'bg-[var(--primary)] text-white ring-2 ring-[var(--primary)] ring-offset-1' : 'bg-[var(--primary)] text-white')
                                : 'border border-[var(--border)] text-[var(--muted-foreground)]')}>
                      {step.done ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className={cn('text-[12px] font-medium', step.done ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step.label}</span>
                  </div>
                  {i < steps.length - 1 && <span className="text-[10px] text-[var(--muted)]">›</span>}
                </React.Fragment>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              {s === 'draft'          && '点击「开始质检」，分配质检员后开始逐 SKU 检验。'}
              {s === 'in_progress'    && !hasAnyQty && '录入实收数量及各项分类（良品/次品/错发/短缺），各项之和须等于实收。'}
              {s === 'in_progress'    && hasAnyQty && !allLinesValid && '⚠ 部分行数量不守恒，请修正后再提交。'}
              {s === 'in_progress'    && hasAnyQty && allLinesValid  && '✓ 校验通过 — 可提交复核（等主管确认）或直接完成（无需复核）。'}
              {s === 'pending_review' && `质检员 ${state.inspector ?? '—'} 已提交结果，等待主管复核。`}
              {s === 'completed'      && '质检已完成，点击「创建入库单」继续入库操作。'}
              {s === 'disputed'       && '结论存疑，点击「重新检验」重新开启质检流程。'}
            </p>
          </div>
        )}

        {/* 已取消提示 */}
        {s === 'cancelled' && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-[var(--danger)]">
            质检单已取消 · {state.cancelledAt?.slice(0, 16)} · 原因：{state.cancelReason}
          </div>
        )}

        {/* 待复核提示 */}
        {s === 'pending_review' && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-800">
            <span className="font-semibold">待主管复核</span> · 提交于 {state.submittedAt?.slice(0, 16)} ·
            质检员：{state.inspector ?? '—'} · 请主管确认质检结论后点击「复核通过」或「打回重检」
          </div>
        )}

        {/* 复核反馈 */}
        {state.reviewNote && s === 'in_progress' && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            <span className="font-semibold">主管打回意见</span>（{state.reviewedBy}）：{state.reviewNote}
          </div>
        )}
      </div>

      {/* ══ 信息两栏 ══ */}
      {s !== 'cancelled' && (
        <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* 左：来源 & 任务 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-[14px] font-semibold">来源单据 & 质检任务</h3>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              <InfoRow label="质检类型" value={state.qcType ? <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcTypeCls)}>{qcTypeLabels[state.qcType]}</span> : '—'} />
              <InfoRow label="来源单据" value={state.sourceDoc ? <Link href={state.sourceDoc.linkPath ?? '#'} className="font-mono text-[11px] text-[var(--primary)] hover:underline">{state.sourceDoc.docNo}</Link> : '—'} />
              {state.task?.taskNo && <InfoRow label="任务编号" value={<span className="font-mono text-[11px]">{state.task.taskNo}</span>} />}
              {state.task?.priority && <InfoRow label="优先级" value={<span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', qcPriorityConfig[state.task.priority].cls)}>{qcPriorityConfig[state.task.priority].label}</span>} />}
              {state.task?.deadline  && <InfoRow label="截止" value={state.task.deadline.slice(0, 16)} />}
              {state.warehouseInfo   && <InfoRow label="仓库" value={state.warehouseInfo.warehouseCode} />}
              {state.warehouseInfo?.qcZone && <InfoRow label="质检区" value={state.warehouseInfo.qcZone} />}
              {state.warehouseInfo?.tempStorageLocation && <InfoRow label="临时库位" value={<span className="font-mono text-[11px] font-semibold">{state.warehouseInfo.tempStorageLocation}</span>} />}
            </div>
            {state.task?.instructions && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                📋 {state.task.instructions}
              </div>
            )}
          </section>

          {/* 右：条码扫描 */}
          {state.barcodes && state.barcodes.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scan className="size-4 text-[var(--muted)]" />
                  <h3 className="text-[14px] font-semibold">条码扫描</h3>
                </div>
                <span className="text-[11px] text-[var(--muted)]">
                  {state.barcodes.filter((b) => b.scanStatus === 'matched').length}/{state.barcodes.length} 已匹配
                </span>
              </div>
              <div className="space-y-2">
                {state.barcodes.map((b) => {
                  const bc = scanStatusConfig[b.scanStatus];
                  return (
                    <div key={b.lineItemId} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-[var(--foreground)] truncate">{b.title}</div>
                        <div className="font-mono text-[10px] text-[var(--muted)]">{b.sku}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', bc.cls)}>{bc.label}</span>
                        {canEdit && (
                          <button type="button" onClick={() => openBarcode(b.lineItemId)}
                            className="text-[10px] font-medium text-[var(--primary)] hover:underline">
                            {b.scannedBarcodes?.length ? '重扫' : '扫描'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ══ 检验标准（检查清单） ══ */}
      {s !== 'cancelled' && (state.checklist ?? []).length > 0 && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">检验标准 & 检查清单</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">逐项核查，确认通过/不通过/不适用</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[var(--success)]">通过 {(state.checklist ?? []).filter((c) => c.result === 'pass').length}</span>
              <span className="text-[var(--danger)]">不通过 {(state.checklist ?? []).filter((c) => c.result === 'fail').length}</span>
              <span className="text-[var(--muted)]">待检 {(state.checklist ?? []).filter((c) => !c.result).length}</span>
              {canEdit && (
                <button onClick={() => setShowAddCheck(true)} className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                  <Plus className="size-3" />自定义检查项
                </button>
              )}
            </div>
          </div>

          {/* 按分类分组 */}
          {(['visual', 'functional', 'label', 'accessory', 'dimension', 'custom'] as ChecklistCategory[]).map((cat) => {
            const catItems = (state.checklist ?? []).filter((c) => c.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat}>
                <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 px-5 py-2 text-[11px] font-semibold text-[var(--muted-foreground)]">
                  {checklistCategoryLabels[cat]}
                </div>
                {catItems.map((item) => (
                  <div key={item.id} className={cn('flex items-start gap-4 border-b border-[var(--border-subtle)] px-5 py-3 hover:bg-[var(--surface-subtle)]',
                    item.result === 'fail' && 'bg-red-50/30',
                    item.result === 'pass' && 'bg-emerald-50/20')}>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[var(--foreground)]">{item.item}</div>
                      {item.requirement && <div className="mt-0.5 text-[11px] text-[var(--muted)]">标准：{item.requirement}</div>}
                      {item.note && <div className="mt-0.5 text-[11px] text-amber-700">备注：{item.note}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* 结果按钮 */}
                      <div className="flex gap-1.5">
                        {(['pass', 'fail', 'na'] as const).map((r) => (
                          <button key={r} type="button"
                            disabled={!canEdit}
                            onClick={() => canEdit && dispatch({ type: 'UPDATE_CHECKLIST', itemId: item.id, result: r })}
                            className={cn('h-6 rounded px-2 text-[10px] font-semibold transition-colors',
                              item.result === r
                                ? r === 'pass' ? 'bg-emerald-500 text-white' : r === 'fail' ? 'bg-[var(--danger)] text-white' : 'bg-[var(--muted)] text-white'
                                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] disabled:cursor-default')}>
                            {r === 'pass' ? '通过' : r === 'fail' ? '不通过' : 'N/A'}
                          </button>
                        ))}
                      </div>
                      {/* 备注输入 */}
                      {canEdit && (
                        <input value={item.note ?? ''} onChange={(e) => dispatch({ type: 'UPDATE_CHECKLIST', itemId: item.id, result: item.result, note: e.target.value })}
                          placeholder="备注…" className="w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] focus:border-[var(--primary)] focus:outline-none" />
                      )}
                      {/* 删除自定义项 */}
                      {canEdit && item.category === 'custom' && (
                        <button onClick={() => dispatch({ type: 'REMOVE_CHECKLIST_ITEM', itemId: item.id })} className="text-[10px] text-[var(--muted)] hover:text-[var(--danger)]">删除</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {/* ══ 整体照片 ══ */}
      {s !== 'cancelled' && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">整体收货照片</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">记录整体到货情况、包装状态</p>
            </div>
            {canEdit && (
              <label className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                <Camera className="size-3.5" />上传照片
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      dispatch({ type: 'ADD_PHOTO', photo: { scope: 'overall_arrival', url: ev.target?.result as string, uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19), uploadedBy: currentSession.name } });
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }} />
              </label>
            )}
          </div>

          <div className="p-5">
            {((state.photos ?? []).filter((p) => !p.lineItemId).length === 0)
              ? <div className="flex flex-col items-center py-8 text-center text-[var(--muted)]">
                  <Camera className="size-8 mb-2" />
                  <p className="text-[13px]">暂无整体照片</p>
                  <p className="text-[11px]">{canEdit ? '点击「上传照片」添加' : '未上传'}</p>
                </div>
              : <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {(state.photos ?? []).filter((p) => !p.lineItemId).map((photo) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                      <img src={photo.url} alt={photo.caption ?? '整体照片'} className="size-full object-cover" />
                      {canEdit && (
                        <button onClick={() => dispatch({ type: 'REMOVE_PHOTO', photoId: photo.id })}
                          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>}
          </div>
        </section>
      )}

      {/* ══ 质检明细表 ══（原有，保持不变，仅在上方添加商品按钮和行展开） */}
      {s !== 'cancelled' && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">Per-SKU 质检明细</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">良品 + 次品 + 错发 + 短缺 须等于实收数量</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button onClick={() => setShowAddLine(true)}
                  className="flex h-7 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90">
                  <Plus className="size-3.5" />添加商品
                </button>
              )}
              {canEdit && (
                <span className={cn('flex items-center gap-1 text-[11px]', allLinesValid && hasAnyQty ? 'text-[var(--success)]' : 'text-amber-600')}>
                  {allLinesValid && hasAnyQty ? <><CheckCircle2 className="size-3.5" />全部通过</> : <><AlertTriangle className="size-3.5" />待校验</>}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-2.5 text-left">商品 / SKU</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">应收</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">实收</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--success)]">良品</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center text-[var(--danger)]">次品</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center text-amber-600">错发</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center text-amber-600">短缺</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">校验</th>
                  <th className="whitespace-nowrap px-3 py-2.5">缺陷描述</th>
                  <th className="whitespace-nowrap px-3 py-2.5">处置</th>
                  <th className="whitespace-nowrap px-3 py-2.5">库位</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-center">照片</th>
                  {canEdit && <th className="w-10 px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {(state.lineItems ?? []).map((line, idx) => {
                  const v = lineValidation[idx];
                  return (
                    <tr key={line.id} className={cn('transition-colors hover:bg-[var(--surface-subtle)]', canEdit && !v?.ok && 'bg-red-50/30')}>
                      <td className="px-5 py-3">
                        <div className="font-medium">{line.title}</div>
                        <div className="text-[11px] text-[var(--muted)]">{line.variantTitle && `${line.variantTitle} · `}<span className="font-mono">{line.sku}</span></div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-[13px] text-[var(--muted)]">{line.expectedQty}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {canEdit ? <NumCell value={line.receivedQty} max={line.expectedQty} onChange={(v) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { receivedQty: v } })} />
                          : <span className={cn(line.receivedQty < line.expectedQty ? 'text-amber-600 font-semibold' : '')}>{line.receivedQty}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {canEdit ? <NumCell value={line.goodQty} max={line.receivedQty} colorCls="border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-100" onChange={(v) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { goodQty: v } })} />
                          : <span className={cn('font-bold', line.goodQty > 0 ? 'text-[var(--success)]' : 'text-[var(--muted)]')}>{line.goodQty}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {canEdit ? <NumCell value={line.defectiveQty} max={line.receivedQty} colorCls="border-red-200 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-100" onChange={(v) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { defectiveQty: v } })} />
                          : <span className={cn('font-bold', line.defectiveQty > 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]')}>{line.defectiveQty}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {canEdit ? <NumCell value={line.wrongItemQty} max={line.receivedQty} colorCls="border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-100" onChange={(v) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { wrongItemQty: v } })} />
                          : <span className={cn('font-bold', line.wrongItemQty > 0 ? 'text-amber-600' : 'text-[var(--muted)]')}>{line.wrongItemQty}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {canEdit ? <NumCell value={line.missingQty} max={line.receivedQty} colorCls="border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-100" onChange={(v) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { missingQty: v } })} />
                          : <span className={cn('font-bold', line.missingQty > 0 ? 'text-amber-600' : 'text-[var(--muted)]')}>{line.missingQty}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {!canEdit ? <Check className="mx-auto size-4 text-[var(--success)]" />
                          : v?.ok ? <Check className="mx-auto size-4 text-[var(--success)]" />
                          : <div className="flex flex-col items-center"><AlertTriangle className="size-4 text-[var(--danger)]" /><span className="text-[9px] text-[var(--danger)]">{v?.sum}≠{v?.expected}</span></div>}
                      </td>
                      <td className="px-3 py-3">
                        {canEdit ? <input value={line.defectDescription ?? ''} onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { defectDescription: e.target.value } })} placeholder="缺陷描述…" className="w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                          : <span className="max-w-[160px] block truncate text-[12px] text-[var(--muted)]">{line.defectDescription || '—'}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {canEdit ? <select value={line.disposition} onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { disposition: e.target.value as QCLineItem['disposition'] } })} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] focus:border-[var(--primary)] focus:outline-none">
                            {(Object.entries(dispositionLabels) as [QCLineItem['disposition'], { label: string; cls: string; short: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          : <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', dispositionLabels[line.disposition].cls)}>{dispositionLabels[line.disposition].short}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {canEdit && line.disposition === 'restock' ? <input value={line.restockLocation ?? ''} onChange={(e) => dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { restockLocation: e.target.value } })} placeholder="A-05" className="w-[80px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[12px] focus:border-[var(--primary)] focus:outline-none" />
                          : <span className="font-mono text-[11px]">{line.restockLocation || '—'}</span>}
                      </td>
                      {/* per-SKU 照片 */}
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-1">
                          {(line.photos ?? []).slice(0, 2).map((url, i) => (
                            <img key={i} src={url} alt="SKU 照片" className="size-8 rounded border border-[var(--border)] object-cover" />
                          ))}
                          {(line.photos ?? []).length > 2 && (
                            <span className="text-[10px] text-[var(--muted)]">+{(line.photos ?? []).length - 2}</span>
                          )}
                          {canEdit && (
                            <label className="flex size-8 cursor-pointer items-center justify-center rounded border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
                              <Camera className="size-3.5" />
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                files.forEach((file) => {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const url = ev.target?.result as string;
                                    dispatch({ type: 'UPDATE_LINE', lineItemId: line.lineItemId, patch: { photos: [...(line.photos ?? []), url] } });
                                  };
                                  reader.readAsDataURL(file);
                                });
                                e.target.value = '';
                              }} />
                            </label>
                          )}
                        </div>
                      </td>
                      {/* 删除行 */}
                      {canEdit && (
                        <td className="whitespace-nowrap px-2 py-3">
                          <button onClick={() => dispatch({ type: 'REMOVE_LINE', lineItemId: line.lineItemId })}
                            className="rounded-lg p-1 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]">
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-subtle)]">
                  <td className="px-5 py-3 text-[12px] font-semibold text-[var(--muted-foreground)]">合计</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--muted)]">{totalExpected}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold">{totalReceived}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--success)]">{totalGood}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold text-[var(--danger)]">{totalDefective}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold text-amber-600">{totalWrong}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-bold text-amber-600">{totalMissing}</td>
                  <td colSpan={canEdit ? 5 : 4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ══ 完成后：结论 + 下一步 ══ */}
      {s === 'completed' && state.conclusion && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-[14px] font-semibold">质检结论</h3>
            <div className={cn('mb-3 flex items-center gap-3 rounded-xl p-4', conclusionConfig[state.conclusion].bg)}>
              <div>
                <div className="text-[15px] font-bold">{conclusionConfig[state.conclusion].label}</div>
              </div>
            </div>
            {state.overallNote && <p className="text-[13px] text-[var(--foreground)]">{state.overallNote}</p>}
            {state.reviewedBy && (
              <div className="mt-2 text-[11px] text-[var(--muted)]">
                复核人：<strong>{state.reviewedBy}</strong> · {state.reviewedAt?.slice(0, 16)}
                {state.reviewNote && ` · ${state.reviewNote}`}
              </div>
            )}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[12px]">
              {[{ label: '良品', v: totalGood, cls: 'bg-emerald-50 text-emerald-700' }, { label: '次品', v: totalDefective, cls: 'bg-red-50 text-[var(--danger)]' }, { label: '错发', v: totalWrong, cls: 'bg-amber-50 text-amber-700' }, { label: '短缺', v: totalMissing, cls: 'bg-amber-50 text-amber-700' }].map((item) => (
                <div key={item.label} className={cn('rounded-xl p-2.5', item.cls)}>
                  <div className="text-[10px] font-semibold uppercase">{item.label}</div>
                  <div className="mt-1 text-[20px] font-bold">{item.v}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-[14px] font-semibold">退款建议 & 下一步</h3>
            {state.refundRecommendation && (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-[36px] font-bold leading-none">{state.refundRecommendation.recommendedRate}%</span>
                  <span className="mb-1 text-[12px] text-[var(--muted)]">建议退款比例</span>
                </div>
                <p className="text-[12px] text-[var(--muted)] mb-4">{state.refundRecommendation.reason}</p>
              </>
            )}
            <div className="space-y-2">
              <Link href={`/dashboard/returns/${returnId}/receipt`}
                className="flex h-10 items-center justify-between rounded-xl bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
                <span>创建入库单</span><ChevronRight className="size-4" />
              </Link>
              {refundDoc
                ? <Link href={`/dashboard/returns/${returnId}/refund`}
                    className="flex h-9 items-center justify-between rounded-xl border border-[var(--border)] px-4 text-[12px] font-medium hover:bg-[var(--surface-subtle)]">
                    <span>查看退款单 {refundDoc.refundNo}</span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', refundStatusConfig[refundDoc.status].cls)}>{refundStatusConfig[refundDoc.status].label}</span>
                  </Link>
                : <p className="text-[11px] text-[var(--muted)]">入库完成后创建退款单。</p>}
            </div>
          </section>
        </div>
      )}

      {/* ══ Modals ══ */}

      {showStart && (
        <Modal title="开始质检" onClose={() => setShowStart(false)}>
          <p className="mb-4 text-[12px] text-[var(--muted)]">指定质检员和复核人后正式开始检验。可从下拉选择，也可手动输入。</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">质检员 <span className="text-[var(--danger)]">*</span></label>
              {/* datalist: 下拉可选 + 自由填 */}
              <input list="qc-inspectors-start" value={inspectorVal} onChange={(e) => setInspectorVal(e.target.value)}
                placeholder="选择或输入质检员" className={inputCls} autoFocus />
              <datalist id="qc-inspectors-start">
                {qcStaffList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role === 'inspector' ? '质检员' : s.role === 'supervisor' ? '主管' : '经理'}){s.warehouseCodes ? ` · ${s.warehouseCodes.join('/')}` : ''}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">复核人（选填）</label>
              <input list="qc-reviewers-start" value={reviewerVal2} onChange={(e) => setReviewerVal2(e.target.value)}
                placeholder="选择或输入复核人（主管/经理）" className={inputCls} />
              <datalist id="qc-reviewers-start">
                <option value="">无需复核</option>
                {qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role === 'supervisor' ? '主管' : '经理'})</option>
                ))}
              </datalist>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowStart(false)} className={btnSecondary}>取消</button>
            <button disabled={!inspectorVal.trim()} onClick={() => { dispatch({ type: 'START', inspector: inspectorVal, reviewer: reviewerVal2 || undefined }); setShowStart(false); toast$('质检已开始'); }} className={btnPrimary}>开始</button>
          </div>
        </Modal>
      )}

      {showSubmit && (
        <Modal title="直接完成质检" onClose={() => setShowSubmit(false)}>
          <div className="mb-4 grid grid-cols-4 gap-2 text-center text-[11px]">
            {[{ label: '良品', v: totalGood, cls: 'bg-emerald-50 text-emerald-700' }, { label: '次品', v: totalDefective, cls: 'bg-red-50 text-[var(--danger)]' }, { label: '错发', v: totalWrong, cls: 'bg-amber-50 text-amber-700' }, { label: '短缺', v: totalMissing, cls: 'bg-amber-50 text-amber-700' }].map((item) => (
              <div key={item.label} className={cn('rounded-xl p-2', item.cls)}><div className="font-semibold">{item.label}</div><div className="text-[18px] font-bold">{item.v}</div></div>
            ))}
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-[12px] font-medium">结论 <span className="text-[var(--danger)]">*</span></label>
            <div className="flex gap-2">
              {(['pass', 'partial_pass', 'fail'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setConclusion(c)}
                  className={cn('flex-1 rounded-xl border py-2 text-[12px] font-medium transition-colors', conclusion === c ? cn('border-transparent ring-1 ring-inset', conclusionConfig[c].cls) : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
                  {conclusionConfig[c].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">质检说明 <span className="text-[var(--danger)]">*</span></label>
            <textarea value={overallNote} onChange={(e) => setOverallNote(e.target.value)} rows={4} placeholder="描述整体情况…" className={cn(inputCls, 'resize-none')} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowSubmit(false)} className={btnSecondary}>取消</button>
            <button disabled={!overallNote.trim() || !conclusion} onClick={() => { dispatch({ type: 'COMPLETE', conclusion, overallNote, inspector: state.inspector ?? currentSession.name }); setShowSubmit(false); toast$('质检完成'); }} className={btnPrimary}>确认完成</button>
          </div>
        </Modal>
      )}

      {showApprove && (
        <Modal title="复核通过" onClose={() => setShowApprove(false)}>
          <p className="mb-3 text-[12px] text-[var(--muted)]">复核通过后质检结论将正式确认，不可撤销。</p>
          <label className="mb-1 block text-[12px] font-medium">复核人 <span className="text-[var(--danger)]">*</span></label>
          <input list="qc-reviewer-approve" value={reviewerVal} onChange={(e) => setReviewerVal(e.target.value)} className={inputCls} />
          <datalist id="qc-reviewer-approve">
            {qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
          <label className="mb-1 mt-3 block text-[12px] font-medium">复核备注（选填）</label>
          <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="复核意见…" className={inputCls} />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowApprove(false)} className={btnSecondary}>取消</button>
            <button disabled={!reviewerVal.trim()} onClick={() => { dispatch({ type: 'APPROVE_REVIEW', reviewer: reviewerVal, note: reviewNote }); setShowApprove(false); toast$('复核通过，质检已完成'); }} className={btnPrimary}>确认通过</button>
          </div>
        </Modal>
      )}

      {showReject && (
        <Modal title="打回重检" onClose={() => setShowReject(false)}>
          <p className="mb-3 text-[12px] text-[var(--muted)]">将质检结果退回给质检员，说明需要重新检验的原因。</p>
          <label className="mb-1 block text-[12px] font-medium">复核人 <span className="text-[var(--danger)]">*</span></label>
          <input list="qc-reviewer-reject" value={reviewerVal} onChange={(e) => setReviewerVal(e.target.value)} className={inputCls} />
          <datalist id="qc-reviewer-reject">
            {qcStaffList.filter((s) => ['supervisor', 'manager'].includes(s.role)).map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
          <label className="mb-1 mt-3 block text-[12px] font-medium">打回原因 <span className="text-[var(--danger)]">*</span></label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="说明需要重检的原因，质检员重新作业时会看到此反馈…" className={cn(inputCls, 'resize-none')} />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowReject(false)} className={btnSecondary}>取消</button>
            <button disabled={!reviewerVal.trim() || !rejectReason.trim()} onClick={() => { dispatch({ type: 'REJECT_REVIEW', reviewer: reviewerVal, reason: rejectReason }); setShowReject(false); toast$('已打回，质检员需重新检验', false); }} className="h-9 rounded-xl bg-amber-500 px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">打回重检</button>
          </div>
        </Modal>
      )}

      {showReopen && (
        <Modal title="重新检验" onClose={() => setShowReopen(false)}>
          <p className="mb-3 text-[12px] text-[var(--muted)]">将质检单重新开启为「质检中」状态，原有结论将被清除。</p>
          <label className="mb-1 block text-[12px] font-medium">重检原因 / 说明</label>
          <textarea value={reopenNote} onChange={(e) => setReopenNote(e.target.value)} rows={3} placeholder="说明争议内容或需要重检的原因…" className={cn(inputCls, 'resize-none')} />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowReopen(false)} className={btnSecondary}>取消</button>
            <button onClick={() => { dispatch({ type: 'REOPEN', note: reopenNote }); setShowReopen(false); toast$('质检已重新开启'); }} className={btnPrimary}>确认重检</button>
          </div>
        </Modal>
      )}

      {showCancel && (
        <Modal title="取消质检单" onClose={() => setShowCancel(false)}>
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
            取消后质检单不可恢复。如需重新质检，请创建新的质检单。
          </div>
          <label className="mb-1 block text-[12px] font-medium">取消原因 <span className="text-[var(--danger)]">*</span></label>
          <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--danger)]">
            <option value="">选择原因</option>
            {['来源单据已取消', '商品未到仓', '重复创建', '流程调整', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowCancel(false)} className={btnSecondary}>保留</button>
            <button disabled={!cancelReason} onClick={() => { dispatch({ type: 'CANCEL', reason: cancelReason }); setShowCancel(false); toast$('质检单已取消', false); }} className={btnDanger}>确认取消</button>
          </div>
        </Modal>
      )}

      {/* 条码扫描 Modal（z-[300] 防止被遮盖） */}
      {showBarcode && barcodeTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBarcode(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold">条码扫描</h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">{barcodeTarget.sku} · {barcodeTarget.barcodeType} · ×{barcodeTarget.expectedQty}</p>
              </div>
              <button onClick={() => setShowBarcode(false)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
            </div>
            <div className="mb-3 max-h-32 overflow-y-auto space-y-1.5">
              {scannedList.length === 0
                ? <p className="py-2 text-center text-[12px] text-[var(--muted)]">暂无扫描记录</p>
                : scannedList.map((code, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
                    <span className="font-mono text-[12px]">{code}</span>
                    <button type="button" onClick={() => setScannedList((prev) => prev.filter((_, idx) => idx !== i))} className="text-[var(--muted)] hover:text-[var(--danger)]"><X className="size-3.5" /></button>
                  </div>
                ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input autoFocus value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && barcodeInput.trim()) { setScannedList((prev) => [...prev, barcodeInput.trim()]); setBarcodeInput(''); } }}
                placeholder="输入或扫描条码，Enter 添加…"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]" />
              <button type="button" onClick={() => { if (barcodeInput.trim()) { setScannedList((prev) => [...prev, barcodeInput.trim()]); setBarcodeInput(''); } }}
                className="h-9 rounded-xl bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">添加</button>
            </div>
            <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted-foreground)]">模拟扫描（演示）</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(mockScanCodes).map(([type, code]) => (
                  <button key={type} type="button" onClick={() => setScannedList((prev) => [...prev, code])}
                    className="flex h-6 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                    <Scan className="size-2.5" />{type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowBarcode(false)} className={btnSecondary}>取消</button>
              <button type="button" onClick={() => {
                dispatch({ type: 'UPDATE_BARCODE', lineItemId: barcodeTarget.lineItemId, scanned: scannedList, scannedBy: currentSession.name });
                setShowBarcode(false); toast$(`已保存 ${scannedList.length} 条条码`);
              }} className={btnPrimary}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加商品 Modal — 从来源退货单选 */}
      {showAddLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setShowAddLine(false)}>
          <div className="mx-4 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            style={{ maxHeight: 'min(80vh, 600px)' }} onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold">选择待检商品</h3>
                <p className="text-[12px] text-[var(--muted)]">来源：{returnOrder.returnNo}</p>
              </div>
              <button onClick={() => setShowAddLine(false)} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
            </div>

            {/* 搜索 */}
            <div className="border-b border-[var(--border-subtle)] px-5 py-3">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input value={newLineSku} onChange={(e) => setNewLineSku(e.target.value)}
                  placeholder="搜索 SKU 或商品名称…"
                  className={cn(inputCls, 'pl-9')} autoFocus />
                {newLineSku && <button onClick={() => setNewLineSku('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><X className="size-3.5" /></button>}
              </div>
            </div>

            {/* 表头 */}
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2">
              <input type="checkbox"
                checked={addLineSelected.size > 0 && returnOrder.lineItems.filter((l) => !state.lineItems.find((e) => e.sku === l.sku)).every((l) => addLineSelected.has(l.lineItemId))}
                onChange={() => {
                  const available = returnOrder.lineItems.filter((l) => !state.lineItems.find((e) => e.sku === l.sku));
                  const allChecked = available.every((l) => addLineSelected.has(l.lineItemId));
                  if (allChecked) setAddLineSelected(new Set());
                  else setAddLineSelected(new Set(available.map((l) => l.lineItemId)));
                }}
                className="size-3.5 accent-[var(--primary)]" />
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">商品</span>
              <span className="w-16 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">数量</span>
            </div>

            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto">
              {returnOrder.lineItems
                .filter((l) => !newLineSku || l.sku.toLowerCase().includes(newLineSku.toLowerCase()) || l.title.toLowerCase().includes(newLineSku.toLowerCase()))
                .map((line) => {
                  const alreadyAdded = !!state.lineItems.find((e) => e.sku === line.sku);
                  const checked = addLineSelected.has(line.lineItemId);
                  return (
                    <label key={line.lineItemId}
                      className={cn('flex cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-3 select-none transition-colors',
                        alreadyAdded ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--surface-subtle)]',
                        checked && !alreadyAdded && 'bg-[var(--primary-soft)]')}>
                      <input type="checkbox" checked={checked}
                        disabled={alreadyAdded}
                        onChange={() => {
                          if (alreadyAdded) return;
                          setAddLineSelected((prev) => { const n = new Set(prev); n.has(line.lineItemId) ? n.delete(line.lineItemId) : n.add(line.lineItemId); return n; });
                        }}
                        className="size-3.5 accent-[var(--primary)]" />
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] ring-1 ring-[var(--border-subtle)]">
                        <Package className="size-4 text-[var(--muted-foreground)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--foreground)]">{line.title}</span>
                          {line.variantTitle && <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] ring-1 ring-[var(--border-subtle)]">{line.variantTitle}</span>}
                          {alreadyAdded && <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">已添加</span>}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{line.sku}</p>
                      </div>
                      <span className="w-16 text-right text-[13px] font-medium text-[var(--foreground)]">× {line.quantity}</span>
                    </label>
                  );
                })}
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-3">
              <span className="text-[12px] text-[var(--muted)]">{addLineSelected.size > 0 ? `已选 ${addLineSelected.size} 件` : `共 ${returnOrder.lineItems.length} 件`}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddLine(false)}
                  className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)]">取消</button>
                <button type="button" disabled={addLineSelected.size === 0}
                  onClick={() => {
                    returnOrder.lineItems
                      .filter((l) => addLineSelected.has(l.lineItemId))
                      .forEach((l) => {
                        const id = `qcl_new_${l.lineItemId}_${Date.now()}`;
                        dispatch({ type: 'ADD_LINE', line: { id, lineItemId: l.lineItemId, sku: l.sku, title: l.title, variantTitle: l.variantTitle, expectedQty: l.quantity, receivedQty: l.quantity, goodQty: 0, defectiveQty: 0, wrongItemQty: 0, missingQty: 0, disposition: 'restock' } });
                      });
                    setAddLineSelected(new Set()); setNewLineSku(''); setShowAddLine(false); toast$('商品已添加');
                  }}
                  className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  添加{addLineSelected.size > 0 ? ` (${addLineSelected.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 自定义检查项 Modal */}
      {showAddCheck && (
        <Modal title="添加自定义检查项" onClose={() => setShowAddCheck(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium">检查分类</label>
              <select value={newCheckCat} onChange={(e) => setNewCheckCat(e.target.value as ChecklistCategory)}
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--primary)]">
                {(Object.entries(checklistCategoryLabels) as [ChecklistCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">检查项名称 <span className="text-[var(--danger)]">*</span></label>
              <input value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)} placeholder="如：防水测试" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">检验标准（选填）</label>
              <input value={newCheckReq} onChange={(e) => setNewCheckReq(e.target.value)} placeholder="如：IPX7 防水，30 分钟 1m 水下无进水" className={inputCls} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowAddCheck(false)} className={btnSecondary}>取消</button>
            <button disabled={!newCheckItem.trim()}
              onClick={() => {
                dispatch({ type: 'ADD_CHECKLIST_ITEM', item: { category: newCheckCat, item: newCheckItem.trim(), requirement: newCheckReq || undefined } });
                setShowAddCheck(false); setNewCheckItem(''); setNewCheckReq(''); toast$('检查项已添加');
              }} className={btnPrimary}>添加</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── 外层导出（Suspense 包裹以支持 useSearchParams） ──────────────────────────

export default function QCPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  let returnId = rawId; try { returnId = decodeURIComponent(rawId); } catch { /* ignore */ }
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1440px] pt-8 text-center text-[var(--muted)]">加载中…</div>}>
      <QCPageInner returnId={returnId} />
    </Suspense>
  );
}
