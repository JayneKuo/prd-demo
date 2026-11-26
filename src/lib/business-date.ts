/** Date-only comparison preserves the source calendar date, without browser timezone conversion. */
export function businessDate(value: unknown, legacyYear = 2026): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const full = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?=$|[T\s])/.exec(text);
  const short = full ? null : /^(\d{1,2})-(\d{1,2})(?=$|\s)/.exec(text);
  if (!full && !short) return null;
  const year = full ? Number(full[1]) : legacyYear;
  const month = Number(full ? full[2] : short![1]);
  const day = Number(full ? full[3] : short![2]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function businessDateTime(value: unknown): string {
  const day = businessDate(value);
  if (!day || typeof value !== 'string') return '—';
  const time = /[T\s](\d{1,2}):(\d{2})/.exec(value.trim());
  return time && Number(time[1]) < 24 && Number(time[2]) < 60 ? `${day} ${time[1].padStart(2, '0')}:${time[2]}` : day;
}
