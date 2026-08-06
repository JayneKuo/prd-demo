import { getPrdMarkdownFileName } from './page-id';
import { generatePrdMarkdown } from './prd-generator';
import { createEmptyProjectDocument, ensureDocumentRoute, migrateToProjectDocument, normalizeProjectDocument } from './tree-document';
import type { RequirementDocument, RequirementProjectDocument } from './types';

const storageKey = 'requirement-annotator:project-document:v2';

export async function loadRequirementDocument(route: string): Promise<RequirementProjectDocument> {
  const fallback = () => createEmptyProjectDocument(route, new Date().toISOString());

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return fallback();

    return ensureDocumentRoute(migrateToProjectDocument(JSON.parse(stored) as RequirementDocument), route);
  } catch {
    return fallback();
  }
}

export async function saveRequirementDocument(document: RequirementProjectDocument): Promise<RequirementProjectDocument> {
  const saved = {
    ...normalizeProjectDocument(migrateToProjectDocument(document)),
    updatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(storageKey, JSON.stringify(saved));
  return saved;
}

export function downloadRequirementPrd(document: RequirementProjectDocument, markdown = generatePrdMarkdown(document)) {
  const fileName = getPrdMarkdownFileName(document.pageId);
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return fileName;
}
