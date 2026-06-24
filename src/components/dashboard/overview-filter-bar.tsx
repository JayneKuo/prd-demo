'use client';

import type { OverviewChannel, OverviewOption, OverviewRoleView, OverviewTimeRange } from '@/lib/mock-data/overview';

type OverviewFilterBarProps = {
  timeRanges: OverviewOption<OverviewTimeRange>[];
  channels: OverviewOption<OverviewChannel>[];
  roleViews: OverviewOption<OverviewRoleView>[];
  selectedTimeRange: OverviewTimeRange;
  selectedChannel: OverviewChannel;
  selectedRoleView: OverviewRoleView;
  onTimeRangeChange: (value: OverviewTimeRange) => void;
  onChannelChange: (value: OverviewChannel) => void;
  onRoleViewChange: (value: OverviewRoleView) => void;
};

export function OverviewFilterBar({
  timeRanges,
  channels,
  roleViews,
  selectedTimeRange,
  selectedChannel,
  selectedRoleView,
  onTimeRangeChange,
  onChannelChange,
  onRoleViewChange
}: OverviewFilterBarProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Daily overview</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">先看趋势、对比和风险，再决定今天处理什么。</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[12px] font-medium text-[var(--muted)]">Time range</span>
            <select
              value={selectedTimeRange}
              onChange={(event) => onTimeRangeChange(event.target.value as OverviewTimeRange)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-hover)]"
            >
              {timeRanges.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[12px] font-medium text-[var(--muted)]">Channel</span>
            <select
              value={selectedChannel}
              onChange={(event) => onChannelChange(event.target.value as OverviewChannel)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-hover)]"
            >
              {channels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[12px] font-medium text-[var(--muted)]">Role view</span>
            <select
              value={selectedRoleView}
              onChange={(event) => onRoleViewChange(event.target.value as OverviewRoleView)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-hover)]"
            >
              {roleViews.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
