import { describe, expect, it } from 'vitest';
import { clearMarkerOffset } from './marker-offset';
import type { RequirementAnnotation } from './types';

const annotation: RequirementAnnotation = {
  id: 'a1',
  pageId: 'dashboard-outbound',
  route: '/dashboard/outbound',
  markerOffset: { x: 12, y: -8 },
  target: { elementType: 'button', label: '导出' },
  content: {
    title: '导出',
    description: '',
    acceptanceCriteria: [],
    openQuestions: []
  },
  source: 'manual',
  status: 'draft'
};

describe('clearMarkerOffset', () => {
  it('removes manual marker offset and keeps other annotation fields intact', () => {
    const result = clearMarkerOffset(annotation);

    expect(result.markerOffset).toBeUndefined();
    expect(result.id).toBe('a1');
    expect(result.content.title).toBe('导出');
  });
});
