import { defaultLocale, type Locale } from '@/lib/locale-config';
import type { Role } from '@/lib/tenant-context';
import type { ThemeMode } from '@/lib/theme-config';

export type UserSession = {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale: Locale;
  timezone: string;
  themeMode: ThemeMode;
};

export const currentSession: UserSession = {
  id: 'user_mina',
  name: 'Mina Chen',
  email: 'mina@example.com',
  role: 'admin',
  locale: defaultLocale,
  timezone: 'Asia/Shanghai',
  themeMode: 'light'
};
