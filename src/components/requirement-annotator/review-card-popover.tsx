'use client';

import { getStatusLabel } from './review-mode';
import type { RequirementAnnotation, RequirementRule } from './types';

function tableCell(value?: string) {
  return value?.trim() || '-';
}

function contentSections(annotation: RequirementAnnotation) {
  return [
    { label: '说明', value: annotation.content.description },
    { label: '业务规则', value: annotation.content.businessRule || '' },
    { label: '交互规则', value: annotation.content.interactionRule || '' },
    { label: '数据来源', value: annotation.content.dataSource || '' },
    { label: '校验规则', value: annotation.content.validationRule || '' },
    { label: '权限规则', value: annotation.content.permissionRule || '' },
    { label: '验收标准', value: annotation.content.acceptanceCriteria.filter(Boolean).join('\n') },
    { label: '待确认问题', value: annotation.content.openQuestions.filter(Boolean).join('\n') }
  ].filter((section) => section.value.trim());
}

function ReviewRulesTable({ rules = [] }: { rules?: RequirementRule[] }) {
  const visibleRules = rules.filter((rule) => [rule.subject, rule.type, rule.description, rule.condition, rule.behavior, rule.notes].some((value) => value?.trim()));
  if (visibleRules.length === 0) return null;

  return (
    <section>
      <p className="mb-1 text-xs font-semibold text-slate-500">规则表</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
        <table className="w-full min-w-[520px] table-fixed border-collapse text-left text-xs text-slate-700">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[30%]" />
            <col className="w-[22%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-[11px] font-semibold text-slate-500">
              <th className="border-r border-slate-200 px-2.5 py-2">对象/字段</th>
              <th className="border-r border-slate-200 px-2.5 py-2">规则说明</th>
              <th className="border-r border-slate-200 px-2.5 py-2">触发条件</th>
              <th className="px-2.5 py-2">系统表现 / 备注</th>
            </tr>
          </thead>
          <tbody>
            {visibleRules.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-200 align-top">
                <td className="border-r border-slate-200 px-2.5 py-2 font-medium text-slate-800">{tableCell(rule.subject || rule.type)}</td>
                <td className="border-r border-slate-200 px-2.5 py-2 whitespace-pre-wrap">{tableCell(rule.description)}</td>
                <td className="border-r border-slate-200 px-2.5 py-2 whitespace-pre-wrap">{tableCell(rule.condition)}</td>
                <td className="px-2.5 py-2 whitespace-pre-wrap">{[rule.behavior, rule.notes].filter((value) => value?.trim()).join('\n') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReviewCardPopover({ annotation, onClose }: { annotation?: RequirementAnnotation; onClose: () => void }) {
  if (!annotation) return null;
  const sections = contentSections(annotation);

  return (
    <aside className="fixed right-6 bottom-24 z-[9999] flex max-h-[70vh] w-[420px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20" data-prd-tool="true">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">需求评审</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{annotation.content.title}</h3>
        </div>
        <button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200" type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-1 text-sm text-slate-700">
        <p className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{getStatusLabel(annotation.status)}</p>
        {sections.length > 0 || annotation.content.rules?.length ? (
          <>
            {sections.map((section) => (
              <section key={section.label}>
                <p className="mb-1 text-xs font-semibold text-slate-500">{section.label}</p>
                <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{section.value}</pre>
              </section>
            ))}
            <ReviewRulesTable rules={annotation.content.rules} />
          </>
        ) : (
          <p className="text-slate-400">暂无说明。</p>
        )}
      </div>
    </aside>
  );
}
