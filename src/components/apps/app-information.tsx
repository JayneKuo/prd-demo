'use client';

import { useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { appCatalog, type AppId } from '@/lib/app-store';
import { buttonClass, primaryClass } from '@/components/amazon/amazon-ui';

export function AppInformation({ appId, onClose, onConnect, canConnect }: { appId: AppId; onClose: () => void; onConnect: () => void; canConnect: boolean }) {
  const app = appCatalog.find((item) => item.id === appId)!;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={`${app.name} 应用介绍`} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(480px,100vw)] max-w-none border-0 border-l border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/25"><div className="flex h-full flex-col"><header className="flex items-center justify-between border-b border-[var(--border)] p-5"><div><p className="text-xs text-[var(--muted)]">{app.category}</p><h2 className="mt-1 text-xl font-semibold">{app.name}</h2></div><button aria-label="关闭介绍" className={buttonClass} onClick={onClose}><X size={16} /></button></header><div className="flex-1 space-y-7 overflow-auto p-5"><p className="text-sm leading-6 text-[var(--muted)]">{app.description}</p><section><h3 className="text-sm font-semibold">支持能力</h3><ul className="mt-3 space-y-3 text-sm">{app.capabilities.map((item) => <li key={item} className="border-b border-[var(--border-subtle)] pb-3">{item}</li>)}</ul>{app.mode === 'connection' && <p className="mt-3 text-xs leading-5 text-[var(--muted)]">当前提供连接管理。业务同步能力不在本次开放范围。</p>}</section><section><h3 className="text-sm font-semibold">连接前准备</h3><ol className="mt-3 list-inside list-decimal space-y-3 text-sm text-[var(--muted)]">{app.requirements.map((item) => <li key={item}>{item}</li>)}</ol></section><section className="border-t border-[var(--border)] pt-5"><h3 className="text-sm font-semibold">连接之后</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{appId === 'amazon' ? '选择业务并绑定已有商品、仓库等资料，再进行初始化。日常作业仍在销售、仓储与运输模块完成。' : '在“我的连接”查看账号状态，按需暂停或恢复连接。'}</p></section></div><footer className="flex justify-end gap-2 border-t border-[var(--border)] p-5"><button className={buttonClass} onClick={onClose}>关闭</button><button className={primaryClass} disabled={!canConnect} onClick={onConnect}>连接账号 <ArrowRight size={14} /></button></footer></div></dialog>;
}
