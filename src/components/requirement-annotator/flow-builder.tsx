'use client';

import type { RequirementAnnotation, RequirementFlow } from './types';

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value: string[]) {
  return value.join('\n');
}

function createFlow(pageId: string): RequirementFlow {
  return {
    id: `flow-${Date.now()}`,
    pageId,
    title: '新业务流程',
    actor: '',
    trigger: '',
    preconditions: [],
    steps: [
      {
        order: 1,
        action: '',
        expectedResult: ''
      }
    ],
    endState: '',
    openQuestions: []
  };
}

export function FlowBuilder({
  pageId,
  flows,
  annotations,
  onChange
}: {
  pageId: string;
  flows: RequirementFlow[];
  annotations: RequirementAnnotation[];
  onChange: (flows: RequirementFlow[]) => void;
}) {
  return (
    <section className="max-h-[360px] overflow-auto border-t border-slate-200 p-4" data-prd-tool="true">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">业务流程</h2>
          <p className="text-xs text-slate-500">用结构化步骤描述跨字段、跨操作的流程需求。</p>
        </div>
        <button className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={() => onChange([...flows, createFlow(pageId)])}>
          添加流程
        </button>
      </div>

      <div className="space-y-4">
        {flows.map((flow) => (
          <div className="rounded-lg border border-slate-200 p-3" key={flow.id}>
            <input
              className="mb-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium"
              value={flow.title}
              onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, title: event.target.value } : item)))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="角色"
                value={flow.actor || ''}
                onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, actor: event.target.value } : item)))}
              />
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="触发条件"
                value={flow.trigger}
                onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, trigger: event.target.value } : item)))}
              />
            </div>
            <textarea
              className="mt-2 min-h-16 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="前置条件，每行一条"
              value={listToLines(flow.preconditions)}
              onChange={(event) => onChange(flows.map((item) => (item.id === flow.id ? { ...item, preconditions: linesToList(event.target.value) } : item)))}
            />
            <div className="mt-2 space-y-2">
              {flow.steps.map((step, index) => (
                <div className="rounded-md bg-slate-50 p-2" key={`${flow.id}-${step.order}`}>
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="操作步骤"
                      value={step.action}
                      onChange={(event) =>
                        onChange(
                          flows.map((item) =>
                            item.id === flow.id
                              ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, action: event.target.value } : flowStep)) }
                              : item
                          )
                        )
                      }
                    />
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="预期结果"
                      value={step.expectedResult}
                      onChange={(event) =>
                        onChange(
                          flows.map((item) =>
                            item.id === flow.id
                              ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, expectedResult: event.target.value } : flowStep)) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <select
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={step.targetAnnotationId || ''}
                    onChange={(event) =>
                      onChange(
                        flows.map((item) =>
                          item.id === flow.id
                            ? { ...item, steps: item.steps.map((flowStep, stepIndex) => (stepIndex === index ? { ...flowStep, targetAnnotationId: event.target.value || undefined } : flowStep)) }
                            : item
                        )
                      )
                    }
                  >
                    <option value="">不关联界面标注</option>
                    {annotations.map((annotation) => (
                      <option key={annotation.id} value={annotation.id}>
                        {annotation.content.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                type="button"
                onClick={() =>
                  onChange(
                    flows.map((item) =>
                      item.id === flow.id ? { ...item, steps: [...item.steps, { order: item.steps.length + 1, action: '', expectedResult: '' }] } : item
                    )
                  )
                }
              >
                添加步骤
              </button>
              <button className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" type="button" onClick={() => onChange(flows.filter((item) => item.id !== flow.id))}>
                删除流程
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
