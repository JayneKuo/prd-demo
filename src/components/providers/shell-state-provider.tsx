'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ALL_MERCHANTS_SCOPE, companies, getMerchantByScope, isCompanyId, isMerchantScope, type MerchantScope } from '@/lib/tenant-context';
import { defaultLocale, supportedLocales, type Locale } from '@/lib/locale-config';
import { createThemeTokens, isThemeMode, isThemePreset, isValidHexColor, normalizeThemeColor, resolveAccentColor, themeConfig, type ThemeMode, type ThemePreset } from '@/lib/theme-config';

const STORAGE_KEY = 'erp-console-shell-state';
const TIMEZONES = ['Asia/Shanghai', 'America/Los_Angeles', 'Europe/Berlin'] as const;

type ShellState = {
  sidebarCollapsed: boolean;
  companyId: string;
  merchantScope: MerchantScope;
  locale: Locale;
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  customAccentColor: string;
  timezone: string;
  setSidebarCollapsed: (value: boolean) => void;
  setCompanyId: (value: string) => void;
  setMerchantScope: (value: MerchantScope) => void;
  setLocale: (value: Locale) => void;
  setThemeMode: (value: ThemeMode) => void;
  setThemePreset: (value: ThemePreset) => void;
  setCustomAccentColor: (value: string) => void;
  resetThemeAppearance: () => void;
  setTimezone: (value: string) => void;
};

const ShellStateContext = createContext<ShellState | null>(null);

export function ShellStateProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companyId, setCompanyIdState] = useState(companies[0].id);
  const [merchantScope, setMerchantScopeState] = useState<MerchantScope>(ALL_MERCHANTS_SCOPE);
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeConfig.mode);
  const [themePreset, setThemePresetState] = useState<ThemePreset>(themeConfig.preset);
  const [customAccentColor, setCustomAccentColorState] = useState<string>(themeConfig.brandAccent);
  const [timezone, setTimezone] = useState<string>(TIMEZONES[0]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<Pick<ShellState, 'sidebarCollapsed' | 'companyId' | 'merchantScope' | 'locale' | 'themeMode' | 'themePreset' | 'customAccentColor' | 'timezone'>>;
      if (typeof parsed.sidebarCollapsed === 'boolean') setSidebarCollapsed(parsed.sidebarCollapsed);
      if (parsed.companyId && isCompanyId(parsed.companyId)) setCompanyIdState(parsed.companyId);
      if (parsed.merchantScope && isMerchantScope(parsed.merchantScope)) {
        const merchant = getMerchantByScope(parsed.merchantScope);
        if (!merchant || !parsed.companyId || merchant.companyId === parsed.companyId) setMerchantScopeState(parsed.merchantScope);
      }
      if (parsed.locale && supportedLocales.some((item) => item.code === parsed.locale)) setLocale(parsed.locale);
      if (parsed.themeMode && isThemeMode(parsed.themeMode)) setThemeMode(parsed.themeMode);
      if (parsed.themePreset && isThemePreset(parsed.themePreset)) setThemePresetState(parsed.themePreset);
      if (parsed.customAccentColor && isValidHexColor(parsed.customAccentColor)) {
        setCustomAccentColorState(normalizeThemeColor(parsed.customAccentColor) ?? themeConfig.brandAccent);
      }
      if (parsed.timezone && TIMEZONES.includes(parsed.timezone as (typeof TIMEZONES)[number])) setTimezone(parsed.timezone);
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sidebarCollapsed, companyId, merchantScope, locale, themeMode, themePreset, customAccentColor, timezone })
    );
  }, [sidebarCollapsed, companyId, merchantScope, locale, themeMode, themePreset, customAccentColor, timezone]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme = themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode;
      const accentColor = resolveAccentColor(themePreset, customAccentColor);
      const tokens = createThemeTokens(accentColor, resolvedTheme === 'dark');
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.setProperty('--primary', tokens.primary);
      document.documentElement.style.setProperty('--primary-foreground', tokens.primaryForeground);
      document.documentElement.style.setProperty('--primary-soft', tokens.primarySoft);
      document.documentElement.style.setProperty('--info', tokens.primary);
      document.documentElement.style.setProperty('--focus-ring', tokens.focusRing);
      document.documentElement.style.setProperty('--theme-accent', accentColor);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themeMode, themePreset, customAccentColor]);

  const setCompanyId = useCallback((value: string) => {
    if (!isCompanyId(value)) return;
    setCompanyIdState(value);
    setMerchantScopeState(ALL_MERCHANTS_SCOPE);
  }, []);

  const setMerchantScope = useCallback((value: MerchantScope) => {
    const merchant = getMerchantByScope(value);
    if (merchant && merchant.companyId !== companyId) return;
    setMerchantScopeState(value);
  }, [companyId]);

  const setThemePreset = useCallback((value: ThemePreset) => {
    setThemePresetState(value);
  }, []);

  const setCustomAccentColor = useCallback((value: string) => {
    const normalized = normalizeThemeColor(value);
    if (!normalized) return;
    setCustomAccentColorState(normalized);
    setThemePresetState('custom');
  }, []);

  const resetThemeAppearance = useCallback(() => {
    setThemeMode(themeConfig.mode);
    setThemePresetState(themeConfig.preset);
    setCustomAccentColorState(themeConfig.brandAccent);
  }, []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      companyId,
      merchantScope,
      locale,
      themeMode,
      themePreset,
      customAccentColor,
      timezone,
      setSidebarCollapsed,
      setCompanyId,
      setMerchantScope,
      setLocale,
      setThemeMode,
      setThemePreset,
      setCustomAccentColor,
      resetThemeAppearance,
      setTimezone
    }),
    [
      sidebarCollapsed,
      companyId,
      merchantScope,
      locale,
      themeMode,
      themePreset,
      customAccentColor,
      timezone,
      setCompanyId,
      setMerchantScope,
      setThemePreset,
      setCustomAccentColor,
      resetThemeAppearance
    ]
  );

  return <ShellStateContext.Provider value={value}>{children}</ShellStateContext.Provider>;
}

export function useShellState() {
  const context = useContext(ShellStateContext);
  if (!context) {
    throw new Error('useShellState must be used within ShellStateProvider');
  }

  return context;
}

export const shellTimezones = TIMEZONES;
