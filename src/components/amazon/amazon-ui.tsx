'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export const buttonClass = 'inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50';
export const primaryClass = `${buttonClass} !border-transparent !bg-[var(--primary)] !text-[var(--primary-foreground)] hover:opacity-90`;
export const inputClass = 'h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:outline-2 focus:outline-[var(--primary)]';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-[13px] font-medium">{label}{children}</label>;
}
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"><h2 className="border-b border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold">{title}</h2><div className="p-5">{children}</div></section>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto max-h-[85vh] w-[min(640px,calc(100%-32px))] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/30"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold">{title}</h2><button aria-label="关闭" onClick={onClose} className={buttonClass}><X size={16} /></button></div><div className="p-5">{children}</div></dialog>;
}
