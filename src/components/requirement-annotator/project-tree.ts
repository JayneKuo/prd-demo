import { groupAnnotations, normalizeAnnotationHierarchy } from './annotation-groups';
import { getPageIdFromRoute } from './page-id';
import type { RequirementAnnotation } from './types';

export type ProjectMenuItem = {
  label: string;
  kind: 'group' | 'module';
  route?: string;
  parentLabel?: string;
};

export type ProjectTreeSection = {
  label: string;
  annotations: RequirementAnnotation[];
};

export type ProjectTreePage = {
  label: string;
  route: string;
  pageId: string;
  sections: ProjectTreeSection[];
};

export type ProjectTreeModule = {
  label: string;
  route?: string;
  sections: ProjectTreeSection[];
  pages: ProjectTreePage[];
};

export type ProjectTreeGroup = {
  label: string;
  modules: ProjectTreeModule[];
};

export type ProjectTree = {
  groups: ProjectTreeGroup[];
  currentModule?: ProjectTreeModule;
};

function titleFromRoute(route: string) {
  return getPageIdFromRoute(route)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildProjectTree({
  menuItems,
  annotations,
  currentRoute
}: {
  menuItems: ProjectMenuItem[];
  annotations: RequirementAnnotation[];
  currentRoute: string;
}): ProjectTree {
  const normalized = annotations.map(normalizeAnnotationHierarchy);
  const moduleItems = menuItems.filter((item) => item.kind === 'module');
  const groups = new Map<string, ProjectTreeGroup>();

  for (const item of moduleItems) {
    const groupLabel = item.parentLabel || '未分组';
    const group = groups.get(groupLabel) || { label: groupLabel, modules: [] };
    if (!groups.has(groupLabel)) {
      groups.set(groupLabel, group);
    }

    const route = item.route || currentRoute;
    const belongsToModule = currentRoute === route || currentRoute.startsWith(`${route}/`);
    const moduleRoutes = Array.from(new Set([route, belongsToModule ? currentRoute : route]));
    const moduleAnnotations = normalized.filter((annotation) => moduleRoutes.includes(annotation.route) && annotation.group === '模块说明');

    group.modules.push({
      label: item.label,
      route,
      sections: groupAnnotations(moduleAnnotations).map((group) => ({ label: group.label, annotations: group.items })),
      pages: moduleRoutes.map((pageRoute) => {
        const pageAnnotations = normalized.filter((annotation) => annotation.route === pageRoute && annotation.group !== '模块说明');

        return {
          label: pageRoute === route ? item.label : titleFromRoute(pageRoute),
          route: pageRoute,
          pageId: getPageIdFromRoute(pageRoute),
          sections: groupAnnotations(pageAnnotations).map((group) => ({ label: group.label, annotations: group.items }))
        };
      })
    });
  }

  if (groups.size === 0) {
    const route = currentRoute;
    const pageAnnotations = normalized.filter((annotation) => annotation.route === route);
    const fallbackGroup: ProjectTreeGroup = {
      label: '未分组',
      modules: [
        {
          label: titleFromRoute(route),
          route,
          sections: [],
          pages: [
            {
              label: titleFromRoute(route),
              route,
              pageId: getPageIdFromRoute(route),
              sections: groupAnnotations(pageAnnotations).map((group) => ({ label: group.label, annotations: group.items }))
            }
          ]
        }
      ]
    };

    return {
      groups: [fallbackGroup],
      currentModule: fallbackGroup.modules[0]
    };
  }

  const result = Array.from(groups.values());
  const currentModule = result.flatMap((group) => group.modules).find((module) => module.route === currentRoute || (module.route ? currentRoute.startsWith(`${module.route}/`) : false));

  return {
    groups: result,
    currentModule
  };
}
