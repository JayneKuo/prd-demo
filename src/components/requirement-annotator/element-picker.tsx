'use client';

import { useEffect, useState } from 'react';
import { getSemanticAnnotationTitle } from './title-extractor';
import type { RequirementElementType, RequirementTargetDraft } from './types';

function getElementType(element: HTMLElement): RequirementElementType {
  const role = element.getAttribute('role');
  const tagName = element.tagName.toLowerCase();

  if (element.dataset.prdType) {
    return element.dataset.prdType as RequirementElementType;
  }

  if (tagName === 'button' || role === 'button') {
    return 'button';
  }

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return 'field';
  }

  if (tagName === 'th' || tagName === 'td') {
    return 'table-column';
  }

  if (tagName === 'nav') {
    return 'navigation';
  }

  if (tagName === 'section') {
    return 'section';
  }

  return 'other';
}

function getSelector(element: HTMLElement) {
  if (element.dataset.prdId) return `[data-prd-id="${element.dataset.prdId}"]`;
  if (element.id) return `#${element.id}`;

  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== 'body' && parts.length < 5) {
    const tagName = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === current?.tagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(siblings.length > 1 ? `${tagName}:nth-of-type(${index})` : tagName);
    current = parent.closest('[data-prd-tool="true"]') ? null : parent;
  }

  return parts.join(' > ') || element.tagName.toLowerCase();
}

function getLabel(element: HTMLElement) {
  const tagName = element.tagName.toLowerCase();
  return getSemanticAnnotationTitle({
    elementType: getElementType(element),
    tagName,
    text: element.textContent || '',
    ariaLabel: element.dataset.prdLabel || element.getAttribute('aria-label'),
    placeholder: element.getAttribute('placeholder'),
    title: element.getAttribute('title'),
    role: element.getAttribute('role'),
    insideTable: Boolean(element.closest('table'))
  });
}

export function ElementPicker({
  active,
  route,
  pageId,
  onPick
}: {
  active: boolean;
  route: string;
  pageId: string;
  onPick: (target: RequirementTargetDraft, sourceElement: HTMLElement) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (!element || element.closest('[data-prd-tool="true"]')) {
        setRect(null);
        return;
      }

      setRect(element.getBoundingClientRect());
    }

    function handleClick(event: MouseEvent) {
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (!element || element.closest('[data-prd-tool="true"]')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      onPick(
        {
          route,
          pageId,
          selector: getSelector(element),
          prdId: element.dataset.prdId,
          label: getLabel(element),
          elementType: getElementType(element)
        },
        element
      );
    }

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [active, onPick, pageId, route]);

  if (!active || !rect) {
    return null;
  }

  return (
    <div
      data-prd-tool="true"
      className="pointer-events-none fixed z-[9998] rounded-md border-2 border-amber-400 bg-amber-300/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }}
    />
  );
}
