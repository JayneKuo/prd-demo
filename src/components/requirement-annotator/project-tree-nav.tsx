'use client';

import { useMemo, useState } from 'react';
import { buildProjectTree, type ProjectMenuItem } from './project-tree';
import type { RequirementAnnotation } from './types';

export function ProjectTreeNav({
  menuItems,
  annotations,
  currentRoute,
  selectedId,
  selectedPageRoute,
  onSelect,
  onSelectPage
}: {
  menuItems: ProjectMenuItem[];
  annotations: RequirementAnnotation[];
  currentRoute: string;
  selectedId?: string;
  selectedPageRoute: string;
  onSelect: (id: string) => void;
  onSelectPage: (route: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildProjectTree({ menuItems, annotations, currentRoute }), [annotations, currentRoute, menuItems]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, current: Set<string>, key: string) {
    const next = new Set(current);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setter(next);
  }

  return (
    <div className="overflow-auto border-r border-slate-200 p-2">
      <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">项目结构</div>
      {tree.groups.map((group) => {
        const groupExpanded = expandedGroups.has(group.label) || group.modules.some((module) => module.route === currentRoute);

        return (
          <div className="mb-2" key={group.label}>
            <button className="flex w-full items-center justify-between rounded-md bg-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-700" type="button" onClick={() => toggle(setExpandedGroups, expandedGroups, group.label)}>
              <span>{groupExpanded ? '▾' : '▸'} {group.label}</span>
              <span>{group.modules.length}</span>
            </button>
            {groupExpanded ? (
              <div className="mt-1 space-y-2 pl-3">
                {group.modules.map((module) => {
                  const moduleKey = `${group.label}:${module.label}`;
                  const moduleExpanded = expandedModules.has(moduleKey) || module.route === currentRoute;
                  const moduleSection = module.sections[0];
                  const pages = module.pages;

                  return (
                    <div key={moduleKey}>
                      <button className="flex w-full items-center justify-between rounded-md bg-white px-2 py-2 text-left text-xs font-semibold text-slate-700 ring-1 ring-slate-200" type="button" onClick={() => toggle(setExpandedModules, expandedModules, moduleKey)}>
                        <span>{moduleExpanded ? '▾' : '▸'} {module.label}</span>
                        <span>{pages.length}</span>
                      </button>
                      {moduleExpanded ? (
                        <div className="mt-1 space-y-1 pl-3">
                          {moduleSection ? (
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-500">模块说明</div>
                              {moduleSection.annotations.map((annotation) => (
                                <button
                                  key={annotation.id}
                                  className={`mb-1 w-full rounded-md px-2 py-2 text-left text-xs ${annotation.id === selectedId ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
                                  type="button"
                                  onClick={() => onSelect(annotation.id)}
                                >
                                  {annotation.content.title}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {pages.map((page) => {
                            const annotationCount = page.sections.reduce((count, section) => count + section.annotations.length, 0);

                            return (
                              <button
                                key={page.route}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold ${page.route === selectedPageRoute ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
                                type="button"
                                onClick={() => onSelectPage(page.route)}
                              >
                                <span>{page.label}</span>
                                <span>{annotationCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
