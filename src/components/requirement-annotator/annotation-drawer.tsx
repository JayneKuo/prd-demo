'use client';

import { useState } from 'react';
import { GROUP_ORDER, normalizeAnnotationHierarchy } from './annotation-groups';
import { getPageIdFromRoute } from './page-id';
import { DEFAULT_MENU_ITEMS } from './menu-items';
import { ProjectTreeNav } from './project-tree-nav';
import type { RequirementAnnotation, RequirementGroup } from './types';

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[]) {
  return value.join('\n');
}

const contentFields = [
  { key: 'businessRule', label: '业务规则' },
  { key: 'interactionRule', label: '交互规则' },
  { key: 'dataSource', label: '数据来源' },
  { key: 'validationRule', label: '校验规则' },
  { key: 'permissionRule', label: '权限规则' }
] as const;

const groupToElementType: Record<RequirementGroup, RequirementAnnotation['target']['elementType']> = {
  模块说明: 'navigation',
  页面说明: 'section',
  筛选区: 'field',
  表格字段: 'table-column',
  页面操作: 'button',
  业务流程: 'other',
  其他: 'other'
};

function createManualAnnotation(group: RequirementGroup, pageId: string, route: string): RequirementAnnotation {
  return normalizeAnnotationHierarchy({
    id: `manual-${pageId}-${Date.now()}`,
    pageId,
    route,
    group,
    target: {
      elementType: groupToElementType[group],
      label: `新的${group}`
    },
    content: {
      title: `新的${group}`,
      description: '',
      acceptanceCriteria: [],
      openQuestions: []
    },
    source: 'manual',
    status: 'draft'
  });
}

export function AnnotationDrawer({
  route,
  annotations,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onCreate,
  readOnly = false,
  onEdit
}: {
  route: string;
  annotations: RequirementAnnotation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onChange: (annotation: RequirementAnnotation) => void;
  onDelete: (id: string) => void;
  onCreate: (annotation: RequirementAnnotation) => void;
  readOnly?: boolean;
  onEdit?: () => void;
}) {
  const [selectedPageRoute, setSelectedPageRoute] = useState(route);
  const selected = annotations.find((annotation) => annotation.id === selectedId) || annotations.find((annotation) => annotation.route === selectedPageRoute) || annotations[0];
  const pageAnnotations = annotations.filter((annotation) => annotation.route === selectedPageRoute);

  function addAnnotation(group: RequirementGroup) {
    const annotation = createManualAnnotation(group, getPageIdFromRoute(selectedPageRoute), selectedPageRoute);
    onCreate(annotation);
    onSelect(annotation.id);
    onEdit?.();
  }

  function deleteWithConfirm(annotation: RequirementAnnotation) {
    if (window.confirm(`删除标注「${annotation.content.title}」？`)) {
      onDelete(annotation.id);
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-white" data-prd-tool="true">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-950">需求标注</h2>
        <p className="mt-1 text-xs text-slate-500">按模块、页面、字段、操作和流程管理需求说明。</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_220px_1fr]">
        <ProjectTreeNav
          menuItems={DEFAULT_MENU_ITEMS}
          annotations={annotations}
          currentRoute={route}
          selectedId={selectedId}
          selectedPageRoute={selectedPageRoute}
          onSelect={onSelect}
          onSelectPage={(pageRoute) => {
            setSelectedPageRoute(pageRoute);
            const first = annotations.find((annotation) => annotation.route === pageRoute);
            if (first) onSelect(first.id);
          }}
        />

        <div className="overflow-auto border-r border-slate-200 p-2">
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">页面标注</div>
          {pageAnnotations.length > 0 ? (
            <div className="space-y-2">
              {GROUP_ORDER.map((group) => {
                const items = pageAnnotations.filter((annotation) => (annotation.group || '其他') === group);
                if (items.length === 0) return null;

                return (
                  <div key={group}>
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">{group}</div>
                    <div className="space-y-1">
                      {items.map((annotation) => (
                        <button
                          key={annotation.id}
                          className={`w-full rounded-md px-2 py-2 text-left text-xs ${annotation.id === selected?.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
                          type="button"
                          onClick={() => onSelect(annotation.id)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            deleteWithConfirm(annotation);
                          }}
                        >
                          <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-bold text-slate-700">
                            {pageAnnotations.findIndex((item) => item.id === annotation.id) + 1}
                          </span>
                          {annotation.content.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">当前页面暂无标注，可使用右侧新增按钮或补全缺失项。</p>
          )}
        </div>

        <div className="overflow-auto p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {GROUP_ORDER.map((group) => (
              <button key={group} className="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200" type="button" onClick={() => addAnnotation(group)}>
                + {group}
              </button>
            ))}
          </div>
          {selected && readOnly ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{selected.group || '其他'} · {selected.target.elementType}</p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{selected.content.title}</h3>
              </div>
              <p className="text-sm leading-6 text-slate-700">{selected.content.description || '暂无需求说明。'}</p>
              {selected.content.businessRule ? <p className="text-sm text-slate-700"><strong>业务规则：</strong>{selected.content.businessRule}</p> : null}
              {selected.content.interactionRule ? <p className="text-sm text-slate-700"><strong>交互规则：</strong>{selected.content.interactionRule}</p> : null}
              {selected.content.acceptanceCriteria.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600">验收标准</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {selected.content.acceptanceCriteria.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              ) : null}
              <button className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={onEdit}>
                编辑这条标注
              </button>
            </div>
          ) : selected ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                标题
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={selected.content.title}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, title: event.target.value }, target: { ...selected.target, label: event.target.value } })}
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                分组
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={selected.group || '其他'}
                  onChange={(event) => onChange(normalizeAnnotationHierarchy({ ...selected, group: event.target.value as RequirementGroup }))}
                >
                  {GROUP_ORDER.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-700">
                需求说明
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={selected.content.description}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, description: event.target.value } })}
                />
              </label>

              {contentFields.map((field) => (
                <label className="block text-xs font-medium text-slate-700" key={field.key}>
                  {field.label}
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={selected.content[field.key] || ''}
                    onChange={(event) => onChange({ ...selected, content: { ...selected.content, [field.key]: event.target.value } })}
                  />
                </label>
              ))}

              <label className="block text-xs font-medium text-slate-700">
                验收标准
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={listToLines(selected.content.acceptanceCriteria)}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, acceptanceCriteria: linesToList(event.target.value) } })}
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                待确认问题
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={listToLines(selected.content.openQuestions)}
                  onChange={(event) => onChange({ ...selected, content: { ...selected.content, openQuestions: linesToList(event.target.value) } })}
                />
              </label>

              <button className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" type="button" onClick={() => onDelete(selected.id)}>
                删除标注
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无标注。</p>
          )}
        </div>
      </div>
    </aside>
  );
}
