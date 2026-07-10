import { describe, expect, it } from 'vitest';
import { getMarkerPosition } from './marker-position';

describe('getMarkerPosition', () => {
  const viewport = { width: 1200, height: 800 };

  it('places the marker near the element top-right corner', () => {
    const position = getMarkerPosition({ left: 100, top: 200, right: 300, bottom: 240, width: 200 } as DOMRect, undefined, viewport);

    expect(position?.left).toBe(288);
    expect(position?.top).toBe(188);
  });

  it('keeps the marker inside the viewport edge', () => {
    const position = getMarkerPosition({ left: 4, top: 6, right: 20, width: 16, bottom: 30, height: 24 } as DOMRect, undefined, viewport);

    expect(position?.left).toBe(8);
    expect(position?.top).toBe(8);
  });

  it('hides the marker when the bound element is outside the viewport', () => {
    const position = getMarkerPosition({ left: 100, top: -80, right: 200, bottom: -40, width: 100, height: 40 } as DOMRect, undefined, viewport);

    expect(position).toBeNull();
  });
});
