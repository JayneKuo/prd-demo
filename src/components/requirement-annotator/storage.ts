import type { RequirementProjectDocument } from './types';

export async function loadRequirementDocument(route: string): Promise<RequirementProjectDocument> {
  const response = await fetch(`/api/prd-annotations?route=${encodeURIComponent(route)}`);

  if (!response.ok) {
    throw new Error('Failed to load requirement annotations.');
  }

  return response.json();
}

export async function saveRequirementDocument(document: RequirementProjectDocument): Promise<RequirementProjectDocument> {
  const response = await fetch('/api/prd-annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error('Failed to save requirement annotations.');
  }

  return response.json();
}

export async function exportRequirementPrd(document: RequirementProjectDocument): Promise<{ markdown: string; fileName: string }> {
  const response = await fetch('/api/prd-annotations/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    throw new Error('Failed to export requirement PRD.');
  }

  return response.json();
}
