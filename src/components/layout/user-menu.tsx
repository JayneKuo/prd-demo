'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Languages, LogOut, Palette, RotateCcw, UserRound } from 'lucide-react';
import { shellCopy, supportedLocales } from '@/lib/locale-config';
import { useShellState, shellTimezones } from '@/components/providers/shell-state-provider';
import { currentSession } from '@/lib/session-context';
import { themePresetOptions } from '@/lib/theme-config';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { locale, themeMode, themePreset, customAccentColor, timezone, setLocale, setThemeMode, setThemePreset, setCustomAccentColor, resetThemeAppearance, setTimezone } = useShellState();
  const [open, setOpen] = useState(false);
  const copy = shellCopy[locale];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-bold text-[var(--primary)]">
          {currentSession.name[0]}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-medium leading-tight text-[var(--foreground)]">{currentSession.name}</span>
        </span>
        <ChevronDown className={cn('hidden size-3.5 text-[var(--muted-foreground)] transition-transform duration-200 sm:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-panel)]">
          {/* User info header */}
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <div className="text-[13px] font-medium text-[var(--foreground)]">{currentSession.name}</div>
            <div className="text-[12px] text-[var(--muted)]">{currentSession.email}</div>
          </div>

          <div className="mt-1.5 space-y-0.5 border-t border-[var(--border-subtle)] pt-1.5">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
              <UserRound className="size-3.5 shrink-0" />
              {copy.profile}
            </button>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[13px] text-[var(--foreground)]">
                  <Palette className="size-3.5 shrink-0" />
                  {copy.appearance}
                </span>
                <button
                  type="button"
                  onClick={resetThemeAppearance}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <RotateCcw className="size-3" />
                  {locale === 'zh-CN' ? '重置' : 'Reset'}
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    {locale === 'zh-CN' ? '模式' : 'Mode'}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'light', label: locale === 'zh-CN' ? '浅色' : 'Light' },
                      { value: 'dark', label: locale === 'zh-CN' ? '深色' : 'Dark' },
                      { value: 'system', label: locale === 'zh-CN' ? '系统' : 'System' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setThemeMode(item.value as 'light' | 'dark' | 'system')}
                        className={cn(
                          'rounded-md border px-2 py-1.5 text-[12px] transition-colors',
                          themeMode === item.value
                            ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    {locale === 'zh-CN' ? '预设主题' : 'Theme presets'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {themePresetOptions.map((item) => {
                      const active = themePreset === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setThemePreset(item.value)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                            active
                              ? 'border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)]'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
                          )}
                        >
                          <span className="size-4 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: item.accent }} />
                          <span className="flex-1 text-[12px] font-medium">{item.label[locale]}</span>
                          {active ? <Check className="size-3.5 text-[var(--primary)]" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    <span>{locale === 'zh-CN' ? '自定义颜色' : 'Custom color'}</span>
                    <span className="text-[11px] normal-case tracking-normal text-[var(--muted)]">{customAccentColor}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                    <input
                      type="color"
                      aria-label={locale === 'zh-CN' ? '选择主题颜色' : 'Choose theme color'}
                      value={customAccentColor}
                      onChange={(event) => setCustomAccentColor(event.target.value)}
                      className="size-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
                    />
                    <button
                      type="button"
                      onClick={() => setThemePreset('custom')}
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-1 text-[12px] transition-colors',
                        themePreset === 'custom'
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
                      )}
                    >
                      {locale === 'zh-CN' ? '使用自定义' : 'Use custom'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <label className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
              <span className="flex items-center gap-2.5">
                <Languages className="size-3.5 shrink-0" />
                {copy.language}
              </span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'zh-CN' | 'en-US')}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--foreground)]"
              >
                {supportedLocales.map((item) => (
                  <option key={item.code} value={item.code}>{item.nativeLabel}</option>
                ))}
              </select>
            </label>

            <label className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
              <span>{copy.timezone}</span>
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--foreground)]"
              >
                {shellTimezones.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--danger)] transition-colors hover:bg-[var(--surface-subtle)]">
              <LogOut className="size-3.5 shrink-0" />
              {copy.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
