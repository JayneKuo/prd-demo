'use client';

import { useMemo, useState } from 'react';
import { generatePrdMarkdown } from './prd-generator';
import { exportRequirementPrd } from './storage';
import type { RequirementProjectDocument } from './types';

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableRow(line: string) {
  return line.trim().startsWith('|') && line.includes('|');
}

function renderMarkdownLine(line: string, index: number) {
  if (line.startsWith('# ')) {
    return (
      <h1 className="mb-4 text-2xl font-semibold text-slate-950" key={index}>
        {line.replace('# ', '')}
      </h1>
    );
  }

  if (line.startsWith('## ')) {
    return (
      <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-900" key={index}>
        {line.replace('## ', '')}
      </h2>
    );
  }

  if (line.startsWith('### ')) {
    return (
      <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900" key={index}>
        {line.replace('### ', '')}
      </h3>
    );
  }

  if (line.startsWith('#### ')) {
    return (
      <h4 className="mb-2 mt-3 text-sm font-semibold text-slate-900" key={index}>
        {line.replace('#### ', '')}
      </h4>
    );
  }

  if (line.startsWith('##### ')) {
    return (
      <h5 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600" key={index}>
        {line.replace('##### ', '')}
      </h5>
    );
  }

  if (line.startsWith('- ')) {
    return (
      <p className="my-1 pl-3 text-sm leading-6 text-slate-700" key={index}>
        • {line.replace('- ', '')}
      </p>
    );
  }

  return line ? (
    <p className="my-2 text-sm leading-6 text-slate-700" key={index}>
      {line}
    </p>
  ) : (
    <br key={index} />
  );
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const elements = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] || '';
    const nextLine = lines[index + 1] || '';

    if (isTableRow(line) && isTableDivider(nextLine)) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;

      while (index < lines.length && isTableRow(lines[index] || '')) {
        rows.push(splitTableRow(lines[index] || ''));
        index += 1;
      }

      elements.push(
        <div className="my-4 overflow-x-auto rounded-xl border border-slate-200" key={`table-${index}`}>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold text-slate-600">
              <tr>{headers.map((header, headerIndex) => <th className="border-r border-slate-200 px-3 py-2 last:border-r-0" key={`${header}-${headerIndex}`}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr className="border-t border-slate-200 align-top" key={rowIndex}>
                  {headers.map((_, cellIndex) => <td className="border-r border-slate-200 px-3 py-2 text-slate-700 last:border-r-0" key={cellIndex}>{row[cellIndex] || '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    elements.push(renderMarkdownLine(line, index));
    index += 1;
  }

  return elements;
}

export function PrdPreviewPanel({ document, onClose }: { document: RequirementProjectDocument; onClose?: () => void }) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [message, setMessage] = useState('');
  const markdown = useMemo(() => generatePrdMarkdown(document), [document]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setMessage('PRD 已复制。');
  }

  async function exportMarkdown() {
    const result = await exportRequirementPrd(document);
    setMessage(`已导出 ${result.fileName}。`);
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-l border-slate-200 bg-slate-50" data-prd-tool="true">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">PRD 预览</h2>
          <p className="text-xs text-slate-500">在线预览、复制或导出生成的 Markdown。</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={() => setMode(mode === 'preview' ? 'source' : 'preview')}>
            {mode === 'preview' ? '源码' : '预览'}
          </button>
          <button className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={copyMarkdown}>
            复制
          </button>
          <button className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white" type="button" onClick={exportMarkdown}>
            导出
          </button>
          {onClose ? (
            <button className="rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700" type="button" onClick={onClose}>
              关闭预览
            </button>
          ) : null}
        </div>
      </div>

      {message ? <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">{message}</div> : null}

      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {mode === 'source' ? (
          <pre className="min-h-full whitespace-pre-wrap rounded-lg bg-white p-4 text-xs leading-6 text-slate-800">{markdown}</pre>
        ) : (
          <article className="min-h-full max-w-none rounded-lg bg-white p-4 text-slate-800">{renderMarkdown(markdown)}</article>
        )}
      </div>
    </section>
  );
}
