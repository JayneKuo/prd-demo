import { describe, expect, it } from 'vitest';
import { businessDate, businessDateTime } from './business-date';
describe('business calendar dates', () => {
  it.each([
    ['06-03 22:15', '2026-06-03'],
    ['2026-11-04T08:00:00Z', '2026-11-04'],
    ['2027-01-02 09:30:00', '2027-01-02'],
    ['2026/11/4 8:05:00', '2026-11-04'],
    ['2024-02-29', '2024-02-29']
  ])('normalizes %s without discarding its year', (input, expected) => expect(businessDate(input)).toBe(expected));
  it.each(['', '—', 'undefined', '2026-02-29', '2026-04-31', '2026-13-01', '11', undefined, null])('rejects unavailable/invalid %s without throwing', input => expect(businessDate(input)).toBeNull());
  it('formats legacy and complete dates without blindly slicing the year', () => {
    expect(businessDateTime('06-03 22:15')).toBe('2026-06-03 22:15');
    expect(businessDateTime('2027-01-02T09:30:00Z')).toBe('2027-01-02 09:30');
    expect(businessDateTime('')).toBe('—');
  });
});
