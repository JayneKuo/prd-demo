import { describe, expect, it } from 'vitest';
import { getMarkerPosition } from './marker-position';

describe('getMarkerPosition', () => {
  const viewport = { width: 1200, height: 800 };

  it('places marker near top-right by default', () => {
    const position = getMarkerPosition({ left: 100, right: 300, top: 200, bottom: 240 } as DOMRect, undefined, viewport);

    expect(position?.left).toBe(288);
    expect(position?.top).toBe(188);
  });

  it('applies manual marker offset when present', () => {
    const position = getMarkerPosition({ left: 100, right: 300, top: 200, bottom: 240 } as DOMRect, { x: 20, y: -10 }, viewport);

    expect(position?.left).toBe(308);
    expect(position?.top).toBe(178);
  });
});
