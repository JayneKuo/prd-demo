'use client';

/**
 * 入库计划模块 — 统一弹窗 & Toast 系统
 *
 * 组件清单：
 *  · Dialog          基础弹窗壳（动画 + 遮罩）
 *  · ConfirmDialog   通用确认弹窗（支持 primary / danger 两种主题）
 *  · CancelDialog    取消入库计划（必填原因）
 *  · ReceiveDialog   录入收货（收货量 / 损坏量 / 凭证号）
 *  · DispatchDialog  标记发运（承运商 + 运单号）
 *  · RecordDirectDispatchDialog  登记直发（凭证 / 承运商 / 运单号）
 *  · Toast / useToast  轻量通知
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 样式常量 ─────────────────────────────────────────────────────────────────

export const inputCls =
  'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';

export const textareaCls =
  'w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]';

// ─── Dialog 基础壳 ────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({ open, onClose, children, maxWidth = 'max-w-md' }: DialogProps) {
  // 按 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 面板 */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl',
          maxWidth,
        )}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ml-3 mt-0.5 rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
        aria-label="关闭"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function DialogFooter({
  onClose,
  onConfirm,
  confirmLabel = '确认',
  loading,
  variant = 'primary',
  disabled,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="h-8 rounded-lg border border-[var(--border)] px-3.5 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)] disabled:opacity-40"
      >
        取消
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading || disabled}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white transition disabled:opacity-50',
          variant === 'danger'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-[var(--primary)] hover:opacity-90',
        )}
      >
        {loading && <Loader2 className="size-3.5 animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
      {children}
      {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
    </label>
  );
}

// ─── 通用确认弹窗 ─────────────────────────────────────────────────────────────

export interface ConfirmAction {
  title: string;
  /** 富文本摘要，支持换行 */
  description: string;
  confirmLabel?: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => Promise<void> | void;
}

interface ConfirmDialogProps {
  action: ConfirmAction | null;
  onClose: () => void;
}

export function ConfirmDialog({ action, onClose }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  // 重置 loading 当 action 变化
  useEffect(() => { setLoading(false); }, [action]);

  if (!action) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await action.onConfirm();
      onClose();
    } catch {
      /* error handled by caller */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!action} onClose={loading ? () => {} : onClose}>
      <DialogHeader title={action.title} onClose={loading ? () => {} : onClose} />
      <div className="px-5 py-4">
        {action.variant === 'danger' && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <p className="text-[12px] text-red-700">此操作无法撤销，请确认无误后再继续。</p>
          </div>
        )}
        <p className="whitespace-pre-line text-[13px] text-[var(--foreground)] leading-relaxed">
          {action.description}
        </p>
      </div>
      <DialogFooter
        onClose={onClose}
        onConfirm={() => void handleConfirm()}
        confirmLabel={action.confirmLabel ?? '确认'}
        variant={action.variant}
        loading={loading}
      />
    </Dialog>
  );
}

// ─── 取消入库计划弹窗 ─────────────────────────────────────────────────────────

interface CancelDialogProps {
  open: boolean;
  onClose: () => void;
  planNumber: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelDialog({ open, onClose, planNumber, onConfirm }: CancelDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setReason(''); setLoading(false); setTimeout(() => textRef.current?.focus(), 50); }
  }, [open]);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try { await onConfirm(reason.trim()); onClose(); }
    catch { /* caller handles */ }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogHeader title="取消入库计划" subtitle={planNumber} onClose={loading ? () => {} : onClose} />
      <div className="space-y-4 px-5 py-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-700">
            <AlertTriangle className="size-4 shrink-0" />取消操作不可撤销
          </p>
          <p className="mt-1 text-[12px] text-red-600">
            相关出库单和平台货件记录将保留但标记为已取消。
          </p>
        </div>
        <div>
          <FieldLabel required>取消原因</FieldLabel>
          <textarea
            ref={textRef}
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="例如：供应链调整、计划变更、平台拒绝…"
            className={cn(textareaCls, 'min-h-[80px]')}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">{reason.trim().length} / 200 字</p>
        </div>
      </div>
      <DialogFooter
        onClose={onClose}
        onConfirm={() => void handleConfirm()}
        confirmLabel="确认取消计划"
        variant="danger"
        loading={loading}
        disabled={!reason.trim()}
      />
    </Dialog>
  );
}

// ─── 录入收货弹窗 ─────────────────────────────────────────────────────────────

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  expectedQuantity: number;
  receivedSoFar: number;
  onConfirm: (received: number, damaged: number, reference: string) => Promise<void>;
}

export function ReceiveDialog({
  open, onClose, orderNumber, expectedQuantity, receivedSoFar, onConfirm,
}: ReceiveDialogProps) {
  const [received, setReceived] = useState('');
  const [damaged, setDamaged] = useState('0');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  const remaining = expectedQuantity - receivedSoFar;

  useEffect(() => {
    if (open) {
      setReceived('');
      setDamaged('0');
      setReference('');
      setError('');
      setLoading(false);
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open]);

  const recNum = Number(received) || 0;
  const dmgNum = Number(damaged) || 0;
  const isValid = recNum >= 0 && dmgNum >= 0 && recNum + dmgNum > 0 && recNum + dmgNum <= remaining && reference.trim();

  const handleConfirm = async () => {
    setError('');
    if (!isValid) { setError('请检查数量和凭证号是否正确。'); return; }
    setLoading(true);
    try { await onConfirm(recNum, dmgNum, reference.trim()); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogHeader title="录入收货" subtitle={orderNumber} onClose={loading ? () => {} : onClose} />
      <div className="space-y-4 px-5 py-4">
        {/* 收货进度摘要 */}
        <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">计划总量</span>
            <span className="font-semibold tabular-nums">{expectedQuantity} 件</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[var(--muted)]">已收</span>
            <span className="font-semibold tabular-nums text-emerald-600">{receivedSoFar} 件</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[var(--muted)]">待收</span>
            <span className="font-semibold tabular-nums text-amber-600">{remaining} 件</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>本次实收数量</FieldLabel>
            <input
              ref={firstRef}
              type="number"
              min={0}
              max={remaining}
              value={received}
              onChange={e => setReceived(e.target.value)}
              className={inputCls}
              placeholder={`≤ ${remaining}`}
            />
          </div>
          <div>
            <FieldLabel>损坏数量</FieldLabel>
            <input
              type="number"
              min={0}
              value={damaged}
              onChange={e => setDamaged(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <FieldLabel required>收货凭证号</FieldLabel>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className={inputCls}
            placeholder="如：RCV-20261118-001"
          />
        </div>

        {recNum + dmgNum > 0 && recNum + dmgNum <= remaining && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-700">
            实收 {recNum} 件{dmgNum > 0 ? ` · 损坏 ${dmgNum} 件` : ''} · 短收 {remaining - recNum - dmgNum} 件
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}
      </div>
      <DialogFooter
        onClose={onClose}
        onConfirm={() => void handleConfirm()}
        confirmLabel="确认收货"
        loading={loading}
        disabled={!isValid}
      />
    </Dialog>
  );
}

// ─── 标记发运弹窗 ─────────────────────────────────────────────────────────────

const carriers = ['UPS', 'FedEx', 'DHL', 'USPS', 'Amazon Freight', 'XPO Logistics', 'Estes', '其他'];

interface DispatchDialogProps {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  onConfirm: (carrier: string, trackingNumber: string) => Promise<void>;
}

export function DispatchDialog({ open, onClose, orderNumber, onConfirm }: DispatchDialogProps) {
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setCarrier(''); setCustomCarrier(''); setTrackingNumber(''); setError(''); setLoading(false); }
  }, [open]);

  const effectiveCarrier = carrier === '其他' ? customCarrier.trim() : carrier;
  const isValid = effectiveCarrier && trackingNumber.trim();

  const handleConfirm = async () => {
    if (!isValid) { setError('请选择承运商并填写运单号。'); return; }
    setLoading(true);
    try { await onConfirm(effectiveCarrier, trackingNumber.trim()); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogHeader title="标记发运" subtitle={orderNumber} onClose={loading ? () => {} : onClose} />
      <div className="space-y-4 px-5 py-4">
        <div>
          <FieldLabel required>承运商</FieldLabel>
          <select
            value={carrier}
            onChange={e => setCarrier(e.target.value)}
            className={inputCls}
          >
            <option value="">请选择</option>
            {carriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {carrier === '其他' && (
          <div>
            <FieldLabel required>自定义承运商名称</FieldLabel>
            <input
              type="text"
              value={customCarrier}
              onChange={e => setCustomCarrier(e.target.value)}
              className={inputCls}
              placeholder="例如：SF Express"
              autoFocus
            />
          </div>
        )}
        <div>
          <FieldLabel required>运单号 / Tracking Number</FieldLabel>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            className={inputCls}
            placeholder="例如：1Z999AA10123456784"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
        )}
      </div>
      <DialogFooter
        onClose={onClose}
        onConfirm={() => void handleConfirm()}
        confirmLabel="确认发运"
        loading={loading}
        disabled={!isValid}
      />
    </Dialog>
  );
}

// ─── 登记直发弹窗 ─────────────────────────────────────────────────────────────

interface RecordDirectDispatchDialogProps {
  open: boolean;
  onClose: () => void;
  planNumber: string;
  onConfirm: (reference: string, carrier: string, trackingNumber: string) => Promise<void>;
}

export function RecordDirectDispatchDialog({
  open, onClose, planNumber, onConfirm,
}: RecordDirectDispatchDialogProps) {
  const [reference, setReference] = useState('');
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setReference(''); setCarrier(''); setCustomCarrier(''); setTrackingNumber('');
      setError(''); setLoading(false);
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open]);

  const effectiveCarrier = carrier === '其他' ? customCarrier.trim() : carrier;
  const isValid = reference.trim() && effectiveCarrier && trackingNumber.trim();

  const handleConfirm = async () => {
    if (!isValid) { setError('请填写所有必填字段。'); return; }
    setLoading(true);
    try { await onConfirm(reference.trim(), effectiveCarrier, trackingNumber.trim()); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogHeader title="登记实际发货" subtitle={planNumber} onClose={loading ? () => {} : onClose} />
      <div className="space-y-4 px-5 py-4">
        <p className="text-[12px] text-[var(--muted)]">
          供应商 / Retailer 直发无需走 OMS 出库；在此填写实际发货凭证，系统将据此更新状态并触发收货提醒。
        </p>
        <div>
          <FieldLabel required>外部发货凭证号</FieldLabel>
          <input
            ref={firstRef}
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className={inputCls}
            placeholder="如供应商发货通知单号、ERP 出库单号"
          />
        </div>
        <div>
          <FieldLabel required>承运商</FieldLabel>
          <select value={carrier} onChange={e => setCarrier(e.target.value)} className={inputCls}>
            <option value="">请选择</option>
            {carriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {carrier === '其他' && (
          <div>
            <FieldLabel required>承运商名称</FieldLabel>
            <input type="text" value={customCarrier} onChange={e => setCustomCarrier(e.target.value)} className={inputCls} placeholder="自定义承运商" />
          </div>
        )}
        <div>
          <FieldLabel required>运单号</FieldLabel>
          <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className={inputCls} placeholder="实际运单号" />
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
        )}
      </div>
      <DialogFooter
        onClose={onClose}
        onConfirm={() => void handleConfirm()}
        confirmLabel="确认登记发货"
        loading={loading}
        disabled={!isValid}
      />
    </Dialog>
  );
}

// ─── 审批弹窗（含审批意见）────────────────────────────────────────────────────

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  planNumber: string;
  planInfo: string;
  onApprove: (comment: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function ApprovalDialog({ open, onClose, planNumber, planInfo, onApprove, onReject }: ApprovalDialogProps) {
  const [verdict, setVerdict] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setVerdict('approve'); setComment(''); setError(''); setLoading(false); }
  }, [open]);

  const handleConfirm = async () => {
    if (verdict === 'reject' && !comment.trim()) { setError('驳回时审批意见为必填'); return; }
    setLoading(true);
    try {
      if (verdict === 'approve') await onApprove(comment.trim());
      else await onReject(comment.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose} maxWidth="max-w-lg">
      <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">审批入库计划</h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">{planNumber}</p>
        </div>
        <button type="button" onClick={onClose} disabled={loading} className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"><X className="size-4" /></button>
      </div>
      <div className="space-y-4 px-5 py-4">
        {/* 计划摘要 */}
        <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-[12px] whitespace-pre-line text-[var(--muted)]">{planInfo}</div>
        {/* 审批结论 */}
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[var(--muted)]">审批结论</label>
          <div className="flex gap-3">
            {(['approve', 'reject'] as const).map(v => (
              <label key={v} className={cn('flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all',
                verdict === v
                  ? v === 'approve' ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              )}>
                <input type="radio" name="verdict" value={v} checked={verdict === v} onChange={() => setVerdict(v)} />
                <span className={cn('text-[13px] font-semibold', verdict === v ? (v === 'approve' ? 'text-emerald-700' : 'text-red-700') : '')}>
                  {v === 'approve' ? '✓ 审批通过' : '✗ 驳回'}
                </span>
              </label>
            ))}
          </div>
        </div>
        {/* 审批意见 */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
            审批意见{verdict === 'reject' && <span className="ml-0.5 text-[var(--danger)]">*</span>}
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={verdict === 'reject' ? '请填写驳回原因…' : '可填写审批备注（选填）'}
            className={cn(textareaCls, 'min-h-[72px]')}
          />
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
        <button type="button" onClick={onClose} disabled={loading} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] disabled:opacity-40">取消</button>
        <button type="button" onClick={() => void handleConfirm()} disabled={loading}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50',
            verdict === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          )}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {verdict === 'approve' ? '确认通过' : '确认驳回'}
        </button>
      </div>
    </Dialog>
  );
}


type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ item, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-[13px] font-medium',
        'min-w-[260px] max-w-[380px]',
        item.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        item.type === 'error' && 'border-red-200 bg-red-50 text-red-800',
        item.type === 'info' && 'border-blue-200 bg-blue-50 text-blue-800',
      )}
    >
      {item.type === 'success' && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      {item.type === 'error' && <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="ml-1 mt-0.5 rounded p-0.5 opacity-60 hover:opacity-100 transition"
        aria-label="关闭通知"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = (message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // useCallback so the reference stays stable — prevents ToastCard's useEffect
  // from resetting the auto-dismiss timer every time a new toast is added
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}

export function LabelPreviewDialog({ open, onClose, label, orderNumber }: {
  open: boolean;
  onClose: () => void;
  label: { kind: string; fileName: string; downloadUrl?: string };
  orderNumber: string;
}) {
  const kindNames: Record<string, string> = {
    platform_box: 'Amazon 平台箱唛',
    platform_item: 'Amazon 商品标签',
    packing_list: '装箱单',
    oms_carton: 'OMS 箱标',
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-lg">
      <DialogHeader title={`标签预览 · ${kindNames[label.kind] ?? label.kind}`} subtitle={orderNumber} onClose={onClose} />
      <div className="p-5">
        {/* 模拟标签样式 */}
        {(label.kind === 'platform_box' || label.kind === 'oms_carton') && (
          <div className="rounded-xl border-2 border-gray-800 bg-white p-5 font-mono">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Ship To / 收件地址</p>
                <p className="text-[13px] font-bold mt-0.5">Amazon Fulfillment Center</p>
                <p className="text-[11px]">3388 S Cactus Ave</p>
                <p className="text-[11px]">BLOOMINGTON, CA 92316</p>
                <p className="text-[11px] font-semibold">United States</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Reference ID</p>
                <p className="text-[12px] font-bold mt-0.5">{orderNumber.replace(/^OUT-/,'').slice(0,12)}</p>
              </div>
            </div>
            <div className="border border-gray-300 rounded p-3 my-3 flex items-center justify-center bg-gray-50">
              <div className="space-y-0.5 text-center">
                {'█ ▌▐ █ ▌ ▐█ ▌▐ ██ ▌█▐ █▌▐ ▌█'.split('').map((c, i) => (
                  <span key={i} className="text-[14px] font-black">{c}</span>
                ))}
                <p className="text-[9px] mt-1 tracking-widest">{orderNumber}</p>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-2">
              <span>PREP: SELLER · LABEL: SELLER</span>
              <span>BOX 1 OF 1</span>
            </div>
          </div>
        )}
        {label.kind === 'packing_list' && (
          <div className="rounded-xl border-2 border-gray-300 bg-white p-5">
            <p className="text-[16px] font-bold mb-3 text-center border-b pb-2">PACKING LIST / 装箱单</p>
            <div className="text-[11px] text-gray-600 mb-3">出库单号：{orderNumber}</div>
            <div className="rounded border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase">
                <span>SKU</span><span>描述</span><span className="text-right">件数</span><span className="text-right">箱数</span>
              </div>
              <div className="px-3 py-1.5 text-[11px] text-gray-600 grid grid-cols-4 gap-2 border-t">
                <span>WEP-BLK-001</span><span>Wireless Earbuds Pro</span><span className="text-right">100</span><span className="text-right">1</span>
              </div>
            </div>
          </div>
        )}
        {label.kind === 'platform_item' && (
          <div className="rounded-xl border-2 border-gray-800 bg-white p-4 font-mono text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Amazon FNSKU Label</p>
            <div className="border border-gray-300 rounded p-3 bg-gray-50 mb-2">
              <p className="text-[14px] font-black tracking-widest">▌█ ▌▐ ▌█ ▐ ▌█</p>
              <p className="text-[9px] mt-0.5 tracking-widest">X004NWEP01</p>
            </div>
            <p className="text-[11px] font-bold">Wireless Earbuds Pro</p>
            <p className="text-[9px] text-gray-500">Condition: New</p>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          {label.downloadUrl && (
            <a href={label.downloadUrl} download className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white hover:opacity-90">
              下载
            </a>
          )}
          <button onClick={onClose} className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">关闭</button>
        </div>
      </div>
    </Dialog>
  );
}


interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'default' | 'danger';
  size?: 'sm' | 'md';
}

export function ActionButton({
  loading,
  variant = 'default',
  size = 'sm',
  className,
  children,
  disabled,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[13px]',
        variant === 'primary' && 'bg-[var(--primary)] text-white hover:opacity-90',
        variant === 'default' && 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]',
        variant === 'danger' && 'border border-red-200 text-red-600 hover:bg-red-50',
        className,
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}
