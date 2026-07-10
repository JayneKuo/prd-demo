'use client';

import { getPageIdFromRoute } from './page-id';
import { getStatusLabel } from './review-mode';
import { getNodeTypeLabel } from './tree-document';
import type { RequirementRule, RequirementStatus, RequirementTreeNode } from './types';

const statuses: RequirementStatus[] = ['draft', 'confirmed', 'todo', 'implemented'];

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[]) {
  return value.join('\n');
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:bg-white focus:outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, min = 'min-h-20', placeholder }: { label: string; value: string; onChange: (value: string) => void; min?: string; placeholder?: string }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <textarea className={`mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 focus:border-amber-400 focus:bg-white focus:outline-none ${min}`} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function createEmptyRule(): RequirementRule {
  return { id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, subject: '', description: '', condition: '', behavior: '', notes: '' };
}

function RuleCell({ value, placeholder, onChange }: { value?: string; placeholder: string; onChange: (value: string) => void }) {
  return <textarea className="block min-h-24 w-full resize-y rounded-none border-0 bg-transparent px-3 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:bg-amber-50/40" placeholder={placeholder} value={value || ''} onChange={(event) => onChange(event.target.value)} />;
}

function TextListTable({ title, addLabel, placeholder, emptyText, values, onChange }: { title: string; addLabel: string; placeholder: string; emptyText: string; values: string[]; onChange: (values: string[]) => void }) {
  const updateValue = (index: number, value: string) => onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  const deleteValue = (index: number) => onChange(values.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <button className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800" type="button" onClick={() => onChange([...values, ''])}>
          {addLabel}
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-xs font-semibold text-slate-600">
              <th className="border-r border-slate-200 px-3 py-3">序号</th>
              <th className="border-r border-slate-200 px-3 py-3">内容</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {values.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={3}>{emptyText}</td>
              </tr>
            ) : null}
            {values.map((value, index) => (
              <tr key={index} className="border-t border-slate-200 align-top">
                <td className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-500">{index + 1}</td>
                <td className="border-r border-slate-200">
                  <textarea className="block min-h-20 w-full resize-y border-0 bg-transparent px-3 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:bg-amber-50/40" placeholder={placeholder} value={value} onChange={(event) => updateValue(index, event.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <button className="rounded-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50" type="button" onClick={() => deleteValue(index)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleTable({ rules = [], onChange }: { rules?: RequirementRule[]; onChange: (rules: RequirementRule[]) => void }) {
  const updateRule = (id: string, patch: Partial<RequirementRule>) => onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  const deleteRule = (id: string) => onChange(rules.filter((rule) => rule.id !== id));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">规则表</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">一行写一条规则；表格可横向滚动，生成 PRD 时输出为 Markdown 表格。</p>
        </div>
        <button className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600" type="button" onClick={() => onChange([...rules, createEmptyRule()])}>
          新增规则
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white [scrollbar-width:thin]">
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[17%]" />
            <col className="w-[22%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-xs font-semibold text-slate-600">
              <th className="whitespace-nowrap border-r border-slate-200 px-3 py-3">对象/字段</th>
              <th className="whitespace-nowrap border-r border-slate-200 px-3 py-3">规则说明</th>
              <th className="whitespace-nowrap border-r border-slate-200 px-3 py-3">触发条件</th>
              <th className="whitespace-nowrap border-r border-slate-200 px-3 py-3">系统表现</th>
              <th className="whitespace-nowrap border-r border-slate-200 px-3 py-3">备注</th>
              <th className="whitespace-nowrap px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-400" colSpan={6}>暂无规则，点击“新增规则”开始填写。</td>
              </tr>
            ) : null}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-200 align-top">
                <td className="border-r border-slate-200"><RuleCell placeholder="字段/按钮/模块名" value={rule.subject || rule.type} onChange={(subject) => updateRule(rule.id, { subject })} /></td>
                <td className="border-r border-slate-200"><RuleCell placeholder="这条规则是什么" value={rule.description} onChange={(description) => updateRule(rule.id, { description })} /></td>
                <td className="border-r border-slate-200"><RuleCell placeholder="什么时候生效" value={rule.condition} onChange={(condition) => updateRule(rule.id, { condition })} /></td>
                <td className="border-r border-slate-200"><RuleCell placeholder="页面如何响应、提示、禁用或校验" value={rule.behavior} onChange={(behavior) => updateRule(rule.id, { behavior })} /></td>
                <td className="border-r border-slate-200"><RuleCell placeholder="补充说明" value={rule.notes} onChange={(notes) => updateRule(rule.id, { notes })} /></td>
                <td className="p-2 text-center">
                  <button className="rounded-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50" type="button" onClick={() => deleteRule(rule.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NodeEditor({ node, onBindPage, onBindTarget, onChange }: { node?: RequirementTreeNode; onBindPage?: (nodeId: string) => void; onBindTarget?: (nodeId: string) => void; onChange: (node: RequirementTreeNode) => void }) {
  if (!node) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center bg-white p-8" data-prd-tool="true">
        <p className="text-sm text-slate-500">请选择一个结构节点开始编辑。</p>
      </section>
    );
  }

  const updateContent = (content: Partial<RequirementTreeNode['content']>) => onChange({ ...node, content: { ...node.content, ...content } });
  const updateRoute = (route: string, label?: string) => {
    const shouldUseOptionTitle = label && ['新的page', 'New', ''].includes(node.title.trim());
    onChange({ ...node, title: shouldUseOptionTitle ? label : node.title, route, pageId: route ? getPageIdFromRoute(route) : undefined });
  };
  const isPageLike = node.type === 'module' || node.type === 'page';
  const supportsRuleTable = ['module', 'page', 'section', 'field', 'action', 'other'].includes(node.type);

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-white p-6" data-prd-tool="true">
      <div className="mb-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50/50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">正在编辑 {getNodeTypeLabel(node.type)}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{node.title}</h2>
        <p className="mt-2 text-sm text-slate-600">这里写这条目录/标注要讲清楚的内容。要绑定页面元素，先选左侧目录，再点“标注页面”。</p>
        {node.target ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <span className="min-w-0 flex-1 truncate">已绑定：{node.target.label || node.target.prdId || node.target.selector}</span>
            <button className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 font-semibold text-white hover:bg-slate-800" type="button" onClick={() => onBindTarget?.(node.id)}>
              重新选择元素
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <TextField label="标题" value={node.title} onChange={(title) => onChange({ ...node, title })} />
        <TextArea label="说明（支持 Markdown / 图片链接）" min="min-h-28" value={node.content.description} onChange={(description) => updateContent({ description })} />

        {isPageLike ? (
          <>
            {node.type === 'page' ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">页面绑定</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{node.route || '尚未绑定页面路径'}</p>
                  </div>
                  <button className="shrink-0 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" type="button" onClick={() => onBindPage?.(node.id)}>
                    {node.route ? '重新绑定页面' : '绑定页面'}
                  </button>
                </div>
                <TextField label="自定义页面路径" value={node.route || ''} onChange={(route) => updateRoute(route)} />
              </div>
            ) : null}
            {node.type === 'page' && !node.route ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">该页面还没有绑定路径；添加标注会先放在该页面下，绑定后可用于当前页面自动定位。</p> : null}
            <TextArea label="页面/模块目标" value={node.content.goal || ''} onChange={(goal) => updateContent({ goal })} />
            <TextArea label="用户角色（每行一个）" value={listToLines(node.content.actors)} onChange={(value) => updateContent({ actors: linesToList(value) })} />
          </>
        ) : null}

        {supportsRuleTable ? <RuleTable rules={node.content.rules} onChange={(rules) => updateContent({ rules })} /> : null}

        {node.type === 'flow' ? (
          <>
            <TextField label="角色" value={node.content.flow?.actor || ''} onChange={(actor) => updateContent({ flow: { trigger: '', preconditions: [], steps: [], endState: '', ...node.content.flow, actor } })} />
            <TextArea label="触发条件（支持 Markdown）" min="min-h-24" value={node.content.flow?.trigger || ''} onChange={(trigger) => updateContent({ flow: { preconditions: [], steps: [], endState: '', ...node.content.flow, trigger } })} />
            <TextArea
              label="前置条件（每行一个）"
              value={listToLines(node.content.flow?.preconditions || [])}
              onChange={(value) => updateContent({ flow: { trigger: '', steps: [], endState: '', ...node.content.flow, preconditions: linesToList(value) } })}
            />
            <TextArea
              label="流程步骤（每行一个）"
              value={(node.content.flow?.steps || []).map((step) => step.action).join('\n')}
              onChange={(value) =>
                updateContent({
                  flow: {
                    trigger: '',
                    preconditions: [],
                    endState: '',
                    ...node.content.flow,
                    steps: linesToList(value).map((action, index) => ({ order: index, action, expectedResult: '完成该步骤。' }))
                  }
                })
              }
            />
            <TextField label="结束状态" value={node.content.flow?.endState || ''} onChange={(endState) => updateContent({ flow: { trigger: '', preconditions: [], steps: [], ...node.content.flow, endState } })} />
          </>
        ) : null}

        <label className="block text-xs font-medium text-slate-700">
          状态
          <select className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:bg-white focus:outline-none" value={node.content.status} onChange={(event) => updateContent({ status: event.target.value as RequirementStatus })}>
            {statuses.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
          </select>
        </label>

        <TextListTable title="验收标准" addLabel="新增验收" placeholder="例如：点击同步后，列表数据会刷新并显示最新更新时间。" emptyText="暂无验收标准，点击“新增验收”开始填写。" values={node.content.acceptanceCriteria} onChange={(acceptanceCriteria) => updateContent({ acceptanceCriteria })} />
        <TextListTable title="待确认问题" addLabel="新增问题" placeholder="例如：同步失败时是否需要保留上一次成功数据？" emptyText="暂无待确认问题，点击“新增问题”开始填写。" values={node.content.openQuestions} onChange={(openQuestions) => updateContent({ openQuestions })} />
      </div>
    </section>
  );
}
