import { describe, expect, it } from 'vitest';
import { createEmptyRequirementDocument, getPageIdFromRoute, sanitizePageId } from './page-id';

describe('getPageIdFromRoute', () => {
  it('turns a route into a stable page id', () => {
    expect(getPageIdFromRoute('/dashboard/outbound')).toBe('dashboard-outbound');
    expect(getPageIdFromRoute('/')).toBe('home');
    expect(getPageIdFromRoute('/dashboard/orders?page=2')).toBe('dashboard-orders');
  });
});

describe('sanitizePageId', () => {
  it('removes path traversal and unsafe characters', () => {
    expect(sanitizePageId('../admin/orders')).toBe('admin-orders');
    expect(sanitizePageId('dashboard outbound!')).toBe('dashboard-outbound');
  });
});

describe('createEmptyRequirementDocument', () => {
  it('creates an empty page document for a route', () => {
    const doc = createEmptyRequirementDocument('/dashboard/outbound', '2026-06-25T00:00:00.000Z');

    expect(doc.pageId).toBe('dashboard-outbound');
    expect(doc.title).toBe('Dashboard Outbound');
    expect(doc.annotations).toEqual([]);
    expect(doc.flows).toEqual([]);
  });
});
