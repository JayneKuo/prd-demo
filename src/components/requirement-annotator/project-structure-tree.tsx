'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus2, FileText, Folder, FolderPlus, GitBranch, GripVertical, Layers3, MousePointerClick, PanelTop, RefreshCw, Trash2 } from 'lucide-react';
import { getNodeTypeLabel } from './tree-document';
import type { RequirementTreeNode, RequirementTreeNodeType } from './types';

const nodeIcons: Record<RequirementTreeNodeType, React.ComponentType<{ className?: string }>> = {
  module: Folder,
  page: FileText,
  section: PanelTop,
  field: Layers3,
  action: MousePointerClick,
  flow: GitBranch,
  other: GripVertical
};

function containsSelectedNode(node: RequirementTreeNode, selectedId?: string): boolean {
  return Boolean(selectedId && node.children.some((child) => child.id === selectedId || containsSelectedNode(child, selectedId)));
}

function collectExpandedNodeIds(nodes: RequirementTreeNode[], selectedId?: string) {
  const ids = new Set<string>();

  function visit(node: RequirementTreeNode): boolean {
    const matched = node.id === selectedId || node.children.some(visit);
    if (matched || node.type === 'module') ids.add(node.id);
    return matched;
  }

  nodes.forEach(visit);
  return ids;
}

function TreeNodeRow({
  node,
  selectedId,
  depth,
  expanded,
  draggingId,
  onToggle,
  onSelect,
  onDragStart,
  onDrop
}: {
  node: RequirementTreeNode;
  selectedId?: string;
  depth: number;
  expanded: Set<string>;
  draggingId?: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, placement: 'inside' | 'before') => void;
}) {
  const selected = node.id === selectedId;
  const activeAncestor = !selected && containsSelectedNode(node, selectedId);
  const isOpen = expanded.has(node.id);
  const Icon = nodeIcons[node.type];

  return (
    <div>
      <div
        className={`group flex h-8 items-center gap-1 rounded-md pr-2 text-sm ${selected ? 'bg-[#2f6fed] text-white' : activeAncestor ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-200' : 'text-slate-700 hover:bg-slate-200/70'} ${draggingId === node.id ? 'opacity-40' : ''}`}
        draggable
        style={{ paddingLeft: 8 + depth * 16 }}
        onDragOver={(event) => event.preventDefault()}
        onDragStart={() => onDragStart(node.id)}
        onDrop={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const placement = event.clientY < rect.top + rect.height * 0.35 ? 'before' : 'inside';
          onDrop(node.id, placement);
        }}
      >
        <button
          className="flex h-6 w-5 items-center justify-center"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (node.children.length > 0) onToggle(node.id);
          }}
        >
          {node.children.length > 0 ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="h-4 w-4" />}
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" type="button" onClick={() => onSelect(node.id)}>
          <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-white' : node.type === 'module' ? 'text-amber-600' : 'text-slate-500'}`} />
          <span className="truncate">{node.title}</span>
        </button>
        <span className={`hidden rounded px-1.5 py-0.5 text-[10px] group-hover:inline ${selected ? 'bg-white/15 text-white' : 'bg-slate-300 text-slate-600'}`}>{getNodeTypeLabel(node.type)}</span>
      </div>

      {isOpen ? (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              selectedId={selectedId}
              depth={depth + 1}
              expanded={expanded}
              draggingId={draggingId}
              onToggle={onToggle}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectStructureTree({
  projectName,
  nodes,
  selectedId,
  selectedNode,
  suggestions = [],
  onSelect,
  onAddChild,
  onRenameProject,
  onDelete,
  onMoveBefore,
  onMoveInto,
  onDetectMenu,
  onAcceptSuggestion,
  onAcceptAllSuggestions,
  onRejectSuggestion,
  onRejectAllSuggestions,
  onClearStructure
}: {
  projectName: string;
  nodes: RequirementTreeNode[];
  selectedId?: string;
  selectedNode?: RequirementTreeNode;
  suggestions?: RequirementTreeNode[];
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, type: RequirementTreeNodeType) => void;
  onRenameProject: (title: string) => void;
  onDelete: (id: string) => void;
  onMoveBefore: (sourceId: string, targetId: string) => void;
  onMoveInto: (sourceId: string, targetParentId: string) => void;
  onDetectMenu?: () => void;
  onAcceptSuggestion?: (id: string) => void;
  onAcceptAllSuggestions?: () => void;
  onRejectSuggestion?: (id: string) => void;
  onRejectAllSuggestions?: () => void;
  onClearStructure: () => void;
}) {
  const [expanded, setExpanded] = useState(() => collectExpandedNodeIds(nodes, selectedId));
  const [draggingId, setDraggingId] = useState<string | undefined>();

  useEffect(() => {
    setExpanded((current) => new Set([...current, ...collectExpandedNodeIds(nodes, selectedId)]));
  }, [nodes, selectedId]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function add(type: RequirementTreeNodeType) {
    if (selectedNode) onAddChild(selectedNode.id, type);
  }

  return (
    <aside className="flex min-h-0 w-[280px] flex-col border-r border-slate-300 bg-[#f3f3f3]" data-prd-tool="true">
      <div className="flex h-10 items-center justify-between border-b border-slate-300 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <ChevronDown className="h-4 w-4 text-slate-600" />
          <span className="truncate text-sm font-bold uppercase tracking-wide text-slate-800">项目 PRD</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="添加模块" type="button" onClick={() => onAddChild('root', 'module')}>
            <FolderPlus className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="在当前目录添加页面" type="button" onClick={() => add('page')}>
            <FilePlus2 className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-slate-600 hover:bg-slate-200" title="识别菜单目录" type="button" onClick={onDetectMenu}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1 text-slate-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-40"
            disabled={!selectedNode}
            title="删除当前目录"
            type="button"
            onClick={() => {
              if (selectedNode && window.confirm(`删除「${selectedNode.title}」及其子项？`)) onDelete(selectedNode.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-red-700 hover:bg-red-100" title="目录栏全部删除" type="button" onClick={onClearStructure}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-300 bg-white px-3 py-2">
        <p className="mb-2 text-[11px] text-slate-500">拖到目录上会变成子级；按住 Shift 拖放为同级排序。</p>
        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5">
          <Folder className="h-4 w-4 text-amber-600" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none"
            value={projectName}
            onChange={(event) => onRenameProject(event.target.value)}
          />
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-900">识别结果，确认后加入目录</span>
            <div className="flex items-center gap-2">
              <button className="text-xs font-semibold text-amber-700" type="button" onClick={onAcceptAllSuggestions}>全部加入</button>
              <button className="text-xs font-semibold text-slate-500" type="button" onClick={onRejectAllSuggestions}>全部忽略</button>
            </div>
          </div>
          <div className="max-h-36 space-y-1 overflow-auto">
            {suggestions.map((item) => {
              const Icon = nodeIcons[item.type];
              return (
                <div className="flex w-full items-center gap-2 rounded bg-white px-2 py-1.5 text-left text-xs" key={item.id}>
                  <Icon className="h-3.5 w-3.5 text-amber-700" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <button className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100" type="button" onClick={() => onAcceptSuggestion?.(item.id)}>
                    加入
                  </button>
                  <button className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100" type="button" onClick={() => onRejectSuggestion?.(item.id)}>
                    忽略
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto py-1">
        <div className="flex h-8 items-center gap-2 px-2 text-sm font-semibold text-slate-800">
          <ChevronDown className="h-4 w-4" />
          <Layers3 className="h-4 w-4 text-slate-500" />
          <span className="truncate">{projectName}</span>
        </div>
        {nodes.filter((node) => node.type === 'module' || node.type === 'page').map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            selectedId={selectedId}
            depth={1}
            expanded={expanded}
            draggingId={draggingId}
            onToggle={toggle}
            onSelect={onSelect}
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
        ))}
      </div>
    </aside>
  );
}
