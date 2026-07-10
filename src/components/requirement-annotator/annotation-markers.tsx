'use client';

import { useEffect, useState } from 'react';
import { getMarkerPosition } from './marker-position';
import type { RequirementAnnotation } from './types';

type Marker = {
  annotation: RequirementAnnotation;
  rect: DOMRect;
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  moved: boolean;
};

function findAnnotationElement(annotation: RequirementAnnotation) {
  const scope = document.querySelector('main') || document;
  if (annotation.target.prdId) {
    return scope.querySelector(`[data-prd-id="${annotation.target.prdId}"]`);
  }

  if (annotation.target.selector) {
    return scope.querySelector(annotation.target.selector);
  }

  return null;
}

export function AnnotationMarkers({
  annotations,
  visible,
  selectedId,
  onSelect,
  onMove
}: {
  annotations: RequirementAnnotation[];
  visible: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, offset: { x: number; y: number }) => void;
}) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!visible) {
      setMarkers([]);
      return;
    }

    function updateMarkers() {
      setMarkers(
        annotations.flatMap((annotation) => {
          const element = findAnnotationElement(annotation);
          if (!(element instanceof HTMLElement)) {
            return [];
          }

          return [{ annotation, rect: element.getBoundingClientRect() }];
        })
      );
    }

    updateMarkers();
    window.addEventListener('resize', updateMarkers);
    window.addEventListener('scroll', updateMarkers, true);

    return () => {
      window.removeEventListener('resize', updateMarkers);
      window.removeEventListener('scroll', updateMarkers, true);
    };
  }, [annotations, visible]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDrag = dragState;

    function handlePointerMove(event: PointerEvent) {
      const deltaX = event.clientX - activeDrag.startX;
      const deltaY = event.clientY - activeDrag.startY;
      onMove(activeDrag.id, {
        x: activeDrag.baseX + deltaX,
        y: activeDrag.baseY + deltaY
      });
      if (!activeDrag.moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        setDragState({ ...activeDrag, moved: true });
      }
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onMove]);

  if (!visible) {
    return null;
  }

  return (
    <div data-prd-tool="true">
      {markers.map((marker, index) => {
        const position = getMarkerPosition(marker.rect, marker.annotation.markerOffset);
        if (!position) return null;

        return (
          <button
            aria-label={`查看标注 ${marker.annotation.content.title}`}
            className={`fixed z-[9997] flex h-6 w-6 cursor-grab items-center justify-center rounded-full text-xs font-bold shadow-lg active:cursor-grabbing ${
              marker.annotation.id === selectedId ? 'bg-amber-500 text-white ring-4 ring-amber-200' : 'bg-slate-950 text-white'
            }`}
            key={marker.annotation.id}
            style={position}
            type="button"
            onClick={() => {
              if (dragState?.id === marker.annotation.id && dragState.moved) {
                return;
              }
              onSelect(marker.annotation.id);
            }}
            onPointerDown={(event) => {
              setDragState({
                id: marker.annotation.id,
                startX: event.clientX,
                startY: event.clientY,
                baseX: marker.annotation.markerOffset?.x || 0,
                baseY: marker.annotation.markerOffset?.y || 0,
                moved: false
              });
            }}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
