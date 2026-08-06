import type { RequirementPageDocument } from './types';

export function sanitizePageId(value: string) {
  const sanitized = value
    .replace(/[\\/]+/g, '-')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return sanitized || 'home';
}

export function getPageIdFromRoute(route: string) {
  const path = route.split('?')[0] || '/';
  if (path === '/') {
    return 'home';
  }

  return sanitizePageId(path.replace(/^\/+/, ''));
}

export function titleFromPageId(pageId: string) {
  return pageId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function createEmptyRequirementDocument(route: string, updatedAt: string): RequirementPageDocument {
  const pageId = getPageIdFromRoute(route);

  return {
    pageId,
    route,
    title: titleFromPageId(pageId),
    actors: [],
    annotations: [],
    flows: [],
    updatedAt
  };
}

export function getPrdMarkdownFileName(pageId: string) {
  return `${sanitizePageId(pageId)}.prd.md`;
}
