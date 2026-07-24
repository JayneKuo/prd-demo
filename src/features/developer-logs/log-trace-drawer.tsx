'use client';

import { createElement } from 'react';
import { buildStageCopyText } from '@/features/developer-logs/format';
import type { EventLogAttempt, EventLogRow, ExecutionResult } from '@/features/developer-logs/types';
import { cn } from '@/lib/utils';

type ClipboardLike = {
  writeText: (value: string) => Promise<void> | void;
};

function renderResult(result: ExecutionResult) {
  const resultClass =
    result === 'Success'
      ? 'bg-green-50 text-[var(--success)] ring-green-200'
      : result === 'Failed'
        ? 'bg-red-50 text-[var(--danger)] ring-red-200'
        : result === 'Partial Success'
          ? 'bg-amber-50 text-[var(--warning)] ring-amber-200'
          : 'bg-blue-50 text-[var(--info)] ring-blue-200';

  return createElement('span', { className: cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', resultClass) }, result);
}

function renderKeyValue(label: string, value: string, extraClass?: string) {
  return createElement(
    'div',
    undefined,
    createElement('dt', { className: 'font-medium text-[var(--foreground)]' }, label),
    createElement('dd', { className: extraClass }, value)
  );
}

function renderPayloadSection(title: string, value: string) {
  return createElement(
    'section',
    { className: 'space-y-2' },
    createElement('h4', { className: 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]' }, title),
    createElement('pre', { className: 'max-h-56 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 font-mono text-[12px] leading-6 text-[var(--foreground)] whitespace-pre-wrap break-all' }, value || 'No payload')
  );
}

function renderAttempt(attempt: EventLogAttempt) {
  return createElement(
    'article',
    { key: `${attempt.attempt}-${attempt.time}`, className: 'rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4' },
    createElement('div', { className: 'flex items-start justify-between gap-3' },
      createElement('div', undefined,
        createElement('p', { className: 'text-sm font-semibold text-[var(--foreground)]' }, `Attempt ${attempt.attempt}`),
        createElement('p', { className: 'text-xs text-[var(--muted)]' }, `${attempt.triggerType} · ${attempt.triggeredBy}`)
      ),
      renderResult(attempt.result)
    ),
    createElement('div', { className: 'mt-3 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-4' },
      renderKeyValue('HTTP Status', attempt.httpStatus ?? '-'),
      renderKeyValue('Time', attempt.time),
      renderKeyValue('Duration', attempt.duration),
      renderKeyValue('Error', attempt.errorMessage || '-')
    )
  );
}

export async function copyInboundRawData(row: EventLogRow, clipboard: ClipboardLike = navigator.clipboard) {
  await clipboard.writeText(row.inboundRawData.raw);
}

export async function copyOutboundRawData(row: EventLogRow, clipboard: ClipboardLike = navigator.clipboard) {
  await clipboard.writeText(row.outboundRawData.raw);
}

export async function copyEventDetails(row: EventLogRow, clipboard: ClipboardLike = navigator.clipboard) {
  await clipboard.writeText(buildStageCopyText(row));
}

export function LogTraceDrawer({ row, onClose }: { row: EventLogRow; onClose?: () => void }) {
  return createElement(
    'section',
    { className: 'fixed inset-y-0 right-0 z-30 w-full max-w-5xl border-l border-[var(--border)] bg-[var(--surface)] shadow-[-24px_0_64px_rgba(15,23,42,0.18)]' },
    createElement(
      'div',
      { className: 'flex h-full flex-col' },
      createElement(
        'header',
        { className: 'border-b border-[var(--border)] px-6 py-5' },
        createElement('div', { className: 'flex items-start justify-between gap-4' },
          createElement('div', undefined,
            createElement('p', { className: 'text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]' }, 'Overview'),
            createElement('h2', { className: 'mt-2 text-xl font-semibold text-[var(--foreground)]' }, row.eventType),
            createElement('p', { className: 'mt-2 text-sm text-[var(--muted)]' }, row.suggestedAction)
          ),
          createElement('div', { className: 'flex flex-wrap items-center gap-2' },
            ...row.availableActions.filter((action) => action !== 'View Details').map((action) =>
              createElement('button', { key: action, type: 'button', className: 'rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]' }, action)
            ),
            createElement('button', { type: 'button', onClick: onClose, className: 'rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]' }, 'Close Trace Detail')
          )
        )
      ),
      createElement('div', { className: 'flex-1 space-y-5 overflow-auto px-6 py-5' },
        createElement('section', { className: 'rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]' },
          createElement('h3', { className: 'text-lg font-semibold text-[var(--foreground)]' }, 'Overview'),
          createElement('dl', { className: 'mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-3' },
            renderKeyValue('Event ID', row.id),
            renderKeyValue('Trace ID', row.traceId),
            renderKeyValue('Event Type', row.eventType),
            renderKeyValue('Operation', row.operation),
            renderKeyValue('Direction', row.direction),
            renderKeyValue('Source System', row.sourceSystem),
            renderKeyValue('Target System', row.targetSystem),
            renderKeyValue('Trigger Type', row.triggerType),
            renderKeyValue('Execution Status', row.executionStatus),
            renderKeyValue('Execution Result', row.executionResult),
            renderKeyValue('Attempt Count', String(row.currentAttempt)),
            renderKeyValue('Started Time', row.startedTime),
            renderKeyValue('Completed Time', row.completedTime ?? '-'),
            renderKeyValue('Duration', row.duration ?? '-'),
            renderKeyValue('Error Code', row.errorCode ?? '-'),
            renderKeyValue('Error Message', row.errorMessage ?? '-'),
            renderKeyValue('Suggested Action', row.suggestedAction)
          )
        ),
        createElement('section', { className: 'rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]' },
          createElement('h3', { className: 'text-lg font-semibold text-[var(--foreground)]' }, 'Related Business Numbers'),
          createElement('dl', { className: 'mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2' },
            ...Object.entries(row.relatedBusinessNumbers).map(([label, value]) => renderKeyValue(label, value))
          )
        ),
        createElement('section', { className: 'rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]' },
          createElement('h3', { className: 'text-lg font-semibold text-[var(--foreground)]' }, 'Data'),
          createElement('div', { className: 'mt-4 grid gap-4' },
            renderPayloadSection('Inbound Raw Data', row.inboundRawData.formatted),
            renderPayloadSection('Normalized OMS Data', row.normalizedOmsData.formatted),
            renderPayloadSection('Outbound Raw Data', row.outboundRawData.formatted),
            renderPayloadSection('Response Data', row.responseData.formatted)
          )
        ),
        createElement('section', { className: 'rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]' },
          createElement('h3', { className: 'text-lg font-semibold text-[var(--foreground)]' }, 'Error Details'),
          createElement('dl', { className: 'mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2' },
            renderKeyValue('Failed Step', row.failedStep ?? '-'),
            renderKeyValue('Error Code', row.errorCode ?? '-'),
            renderKeyValue('Error Type', row.errorType ?? '-'),
            renderKeyValue('Error Message', row.errorMessage ?? '-', row.errorMessage ? 'font-medium text-[var(--danger)]' : undefined),
            renderKeyValue('Suggested Action', row.suggestedAction)
          )
        ),
        createElement('section', { className: 'rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]' },
          createElement('h3', { className: 'text-lg font-semibold text-[var(--foreground)]' }, 'Attempts'),
          createElement('div', { className: 'mt-4 space-y-3' }, ...row.attempts.map(renderAttempt))
        )
      )
    )
  );
}
