export function getMarkerPosition(rect: Pick<DOMRect, 'right' | 'top' | 'bottom' | 'left'>, offset?: { x: number; y: number }, viewport = { width: window.innerWidth, height: window.innerHeight }) {
  const markerLeft = rect.right - 12 + (offset?.x || 0);
  const markerTop = rect.top - 12 + (offset?.y || 0);

  if (rect.bottom < 0 || rect.top > viewport.height || rect.right < 0 || rect.left > viewport.width) {
    return null;
  }

  return {
    left: Math.max(markerLeft, 8),
    top: Math.max(markerTop, 8)
  };
}
