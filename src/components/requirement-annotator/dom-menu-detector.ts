import type { ProjectMenuItem } from './project-tree';
import { createNode } from './tree-document';
import type { RequirementTreeNode } from './types';

export type MenuElementRecord = {
  label: string;
  route?: string;
  depth?: number;
};

function cleanLabel(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function normalizeRoute(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return url.pathname || undefined;
  } catch {
    return value.startsWith('/') ? value : undefined;
  }
}

export function detectMenuItemsFromRecords(records: MenuElementRecord[]): ProjectMenuItem[] {
  const items: ProjectMenuItem[] = [];
  let currentGroup: string | undefined;
  const seen = new Set<string>();

  for (const record of records) {
    const label = cleanLabel(record.label);
    if (!label) continue;

    if (!record.route) {
      currentGroup = label;
      const key = `group:${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ label, kind: 'group' });
      }
      continue;
    }

    const route = normalizeRoute(record.route);
    if (!route) continue;
    const key = `module:${route}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label, kind: 'module', route, parentLabel: currentGroup });
  }

  return items;
}

export function getPageBindingFromRecord(record: MenuElementRecord, currentRoute: string) {
  const title = cleanLabel(record.label) || currentRoute.split('/').filter(Boolean).at(-1) || '当前页面';
  return { title, route: normalizeRoute(record.route) || currentRoute };
}

export function buildMenuTreeFromRecords(records: MenuElementRecord[]): RequirementTreeNode[] {
  const roots: RequirementTreeNode[] = [];
  let currentModule: RequirementTreeNode | undefined;
  let currentPage: RequirementTreeNode | undefined;

  for (const record of records) {
    const title = cleanLabel(record.label);
    if (!title) continue;
    const route = normalizeRoute(record.route);

    if (!route) {
      currentModule = createNode({ type: 'module', title });
      roots.push(currentModule);
      currentPage = undefined;
      continue;
    }

    if (!currentModule) {
      currentModule = createNode({ type: 'module', title: '未分组' });
      roots.push(currentModule);
    }

    const page = createNode({ type: 'page', title, route });
    if ((record.depth || 0) >= 2 && currentPage) {
      currentPage.children.push({ ...page, order: currentPage.children.length });
    } else {
      currentModule.children.push({ ...page, order: currentModule.children.length });
      currentPage = currentModule.children.at(-1);
    }
  }

  return roots;
}

export function getMenuRecordsFromElement(element: HTMLElement): MenuElementRecord[] {
  const candidates = Array.from(element.querySelectorAll<HTMLElement>('a, button, [role="menuitem"], [role="treeitem"]'));
  return candidates.map((item) => {
    const link = item.closest('a') as HTMLAnchorElement | null;
    return {
      label: cleanLabel(item.getAttribute('aria-label') || item.textContent),
      route: normalizeRoute(link?.href || item.getAttribute('href')),
      depth: Number(item.getAttribute('aria-level') || 0)
    };
  });
}

export function getBindingRecordFromElement(element: HTMLElement): MenuElementRecord {
  const link = element.closest('a') as HTMLAnchorElement | null;
  const labelSource = element.closest('a, button, [role="menuitem"], [role="treeitem"], h1, h2, h3') as HTMLElement | null;
  return {
    label: cleanLabel(labelSource?.getAttribute('aria-label') || labelSource?.textContent || element.textContent),
    route: normalizeRoute(link?.href || element.getAttribute('href'))
  };
}
