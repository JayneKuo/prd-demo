export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemePreset = 'blue' | 'violet' | 'emerald' | 'orange' | 'custom';
export type Density = 'compact' | 'comfortable';

export type ThemeTokens = {
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  focusRing: string;
};

export type ThemePresetOption = {
  value: Exclude<ThemePreset, 'custom'>;
  label: {
    'zh-CN': string;
    'en-US': string;
  };
  accent: string;
};

export const themePresetOptions: ThemePresetOption[] = [
  {
    value: 'blue',
    label: { 'zh-CN': '商务蓝', 'en-US': 'Blue' },
    accent: '#465fff'
  },
  {
    value: 'violet',
    label: { 'zh-CN': '深邃紫', 'en-US': 'Violet' },
    accent: '#7c3aed'
  },
  {
    value: 'emerald',
    label: { 'zh-CN': '祖母绿', 'en-US': 'Emerald' },
    accent: '#059669'
  },
  {
    value: 'orange',
    label: { 'zh-CN': '活力橙', 'en-US': 'Orange' },
    accent: '#ea580c'
  }
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function normalizeHex(hex: string) {
  const value = hex.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return value
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;

  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((item) => clamp(Math.round(item), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(hex: string, target: string, amount: number) {
  const base = hexToRgb(hex);
  const to = hexToRgb(target);
  if (!base || !to) return hex;

  return rgbToHex(
    base.r + (to.r - base.r) * amount,
    base.g + (to.g - base.g) * amount,
    base.b + (to.b - base.b) * amount
  );
}

export function isThemeMode(value: string): value is ThemeMode {
  return ['light', 'dark', 'system'].includes(value);
}

export function isThemePreset(value: string): value is ThemePreset {
  return ['blue', 'violet', 'emerald', 'orange', 'custom'].includes(value);
}

export function isValidHexColor(value: string) {
  return normalizeHex(value) !== null;
}

export function normalizeThemeColor(value: string) {
  const normalized = normalizeHex(value);
  return normalized ? `#${normalized}` : null;
}

export function getPresetAccent(preset: ThemePreset) {
  if (preset === 'custom') return null;
  return themePresetOptions.find((item) => item.value === preset)?.accent ?? themePresetOptions[0].accent;
}

export function resolveAccentColor(themePreset: ThemePreset, customAccentColor: string) {
  return themePreset === 'custom' ? normalizeThemeColor(customAccentColor) ?? themeConfig.brandAccent : getPresetAccent(themePreset) ?? themeConfig.brandAccent;
}

export function createThemeTokens(accentColor: string, isDark: boolean): ThemeTokens {
  const normalized = normalizeThemeColor(accentColor) ?? themeConfig.brandAccent;

  return {
    primary: isDark ? mix(normalized, '#ffffff', 0.14) : normalized,
    primaryForeground: '#ffffff',
    primarySoft: isDark ? mix(normalized, '#0f172a', 0.78) : mix(normalized, '#ffffff', 0.88),
    focusRing: isDark ? `rgba(${hexToRgb(normalized)?.r ?? 70}, ${hexToRgb(normalized)?.g ?? 95}, ${hexToRgb(normalized)?.b ?? 255}, 0.34)` : `rgba(${hexToRgb(normalized)?.r ?? 70}, ${hexToRgb(normalized)?.g ?? 95}, ${hexToRgb(normalized)?.b ?? 255}, 0.22)`
  };
}

export const themeConfig = {
  productName: 'ERP Console',
  brandAccent: '#635bff',
  mode: 'light' as ThemeMode,
  preset: 'blue' as ThemePreset,
  density: 'compact' as Density,
  radius: 'medium'
};
