'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, ListPlus, MousePointerClick, PanelTop, RefreshCw, TextCursorInput, Trash2, Workflow } from 'lucide-react';
import { getNodeTypeLabel, isAnnotationGroupNode } from './tree-document';
import type { RequirementTreeNode } from './types';

function getIcon(node: RequirementTreeNode) {
  if (isAnnotationGroupNode(node)) return Folder;
  if (node.type === 'action') return MousePointerClick;
  if (node.type === 'section') return PanelTop;
  if (node.type === 'field') return TextCursorInput;
  if (node.type === 'flow') return Workflow;
  return TextCursorInput;
}

function collectNodeIds(nodes: RequirementTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectNodeIds(node.children)]);
}

function AnnotationRow({
  node,
  index,
  selectedId,
  depth,
  expanded,
  draggingId,
  onSelect,
  onToggle,
  onDragStart,
  onDrop
}: {
  node: RequirementTreeNode;
  index: number;
  selectedId?: string;
  depth: number;
  expanded: Set<string>;
  draggingId?: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, placement: 'inside' | 'before') => void;
}) {
  const Icon = getIcon(node);
  const selected = node.id === selectedId;
  const isOpen = expanded.has(node.id);
  const children = node.children.filter((child) => child.type !== 'module' && child.type !== 'page');

  return (
    <div>
      <div
        className={`group flex h-8 items-center gap-2 rounded-md pr-2 text-left text-sm ${selected ? 'bg-[#2f6fed] text-white' : 'text-slate-700 hover:bg-slate-100'} ${draggingId === node.id ? 'opacity-40' : ''}`}
        draggable
        style={{ paddingLeft: 8 + depth * 16 }}
        onDragOver={(event) => event.preventDefault()}
        onDragStart={() => onDragStart(node.id)}
        onDrop={(event) => onDrop(node.id, event.shiftKey ? 'before' : 'inside')}
      >
        <button
          className="flex h-5 w-4 items-center justify-center"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (children.length > 0) onToggle(node.id);
          }}
        >
          {children.length > 0 ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="h-4 w-4" />}
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" type="button" onClick={() => onSelect(node.id)}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${selected ? 'bg-amber-300 text-slate-950' : 'bg-slate-800 text-white'}`}>
            {index + 1}
          </span>
          <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-white' : 'text-slate-500'}`} />
          <span className="min-w-0 flex-1 truncate">{node.title}</span>
          {!node.target && !isAnnotationGroupNode(node) ? <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-700'}`}>未绑定</span> : null}
        </button>
        <span className={`hidden rounded px-1.5 py-0.5 text-[10px] group-hover:inline ${selected ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-500'}`}>{getNodeTypeLabel(node.type)}</span>
      </div>
      {isOpen
        ? children.map((child, childIndex) => (
            <AnnotationRow
              key={child.id}
              node={child}
              index={childIndex}
              selectedId={selectedId}
              depth={depth + 1}
              expanded={expanded}
              draggingId={draggingId}
              onSelect={onSelect}
              onToggle={onToggle}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))
        : null}
    </div>
  );
}

export function PageAnnotationList({
  nodes,
  selectedId,
  onSelect,
  onAddAnnotation,
  onAddGroup,
  onDeleteSelected,
  onDeleteAll,
  onDetectPage,
  onMoveBefore,
  onMoveInto
}: {
  nodes: RequirementTreeNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAddAnnotation: () => void;
  onAddGroup: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onDetectPage: () => void;
  onMoveBefore: (sourceId: string, targetId: string) => void;
  onMoveInto: (sourceId: string, targetParentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(() => new Set(collectNodeIds(nodes)));
  const [draggingId, setDraggingId] = useState<string | undefined>();

  useEffect(() => {
    setExpanded((current) => new Set([...current, ...collectNodeIds(nodes)]));
  }, [nodes]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="flex min-h-0 w-[250px] flex-col border-r border-slate-300 bg-[#fafafa]" data-prd-tool="true">
      <div className="flex h-10 items-center justify-between border-b border-slate-300 px-3">
        <div className="flex items-center gap-1.5">
          <ChevronDown className="h-4 w-4 text-slate-600" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">当前页面标注</h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="添加标注分组" type="button" onClick={onAddGroup}>
            <PanelTop className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="添加标注" type="button" onClick={onAddAnnotation}>
            <ListPlus className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="识别页面并生成标注" type="button" onClick={onDetectPage}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-slate-600 hover:bg-red-100 hover:text-red-700" title="删除当前标注" type="button" onClick={onDeleteSelected}>
            <Trash2 className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-red-700 hover:bg-red-100" title="标记栏全部删除" type="button" onClick={onDeleteAll}>
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{nodes.length}</span>
        </div>
      </div>

      <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">拖到标注上会变成子级；按住 Shift 拖放为同级排序。</div>

      <div className="min-h-0 flex-1 overflow-auto py-1">
        {nodes.length > 0 ? (
          nodes.map((node, index) => (
            <AnnotationRow
              key={node.id}
              node={node}
              index={index}
              selectedId={selectedId}
              depth={0}
              expanded={expanded}
              draggingId={draggingId}
              onSelect={onSelect}
              onToggle={toggle}
              onDragStart={setDraggingId}
              onDrop={(targetId, placement) => {
                if (draggingId && draggingId !== targetId) {
                  if (placement === 'before') onMoveBefore(draggingId, targetId);
                  else {
                    onMoveInto(draggingId, targetId);
                    setExpanded((current) => new Set(current).add(targetId));
                  }
                }
                setDraggingId(undefined);
              }}
            />
          ))
        ) : (
          <div className="m-3 rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">还没有页面标注</p>
            <p className="mt-1 text-xs leading-5">点上方添加标注，或点击识别页面标注。</p>
          </div>
        )}
      </div>
    </aside>
  );
}
