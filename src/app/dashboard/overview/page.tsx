'use client';

import { useMemo, useState } from 'react';
import { DashboardTemplate } from '@/components/archetypes/dashboard-template';
import { SectionCard } from '@/components/admin/section-card';
import { OverviewAnomalyRadar } from '@/components/dashboard/overview-anomaly-radar';
import { OverviewChannelPerformance } from '@/components/dashboard/overview-channel-performance';
import { OverviewFilterBar } from '@/components/dashboard/overview-filter-bar';
import { OverviewPostureHero } from '@/components/dashboard/overview-posture-hero';
import { OverviewPriorityList } from '@/components/dashboard/overview-priority-list';
import { useShellState } from '@/components/providers/shell-state-provider';
import {
  overviewChannelPerformance,
  overviewFilterOptions,
  overviewFinanceSettlement,
  overviewFulfillmentEfficiency,
  overviewInventoryHealth,
  overviewKpis,
  overviewRecommendedActions,
  overviewRefundAfterSales,
  overviewRoleConfig,
  overviewSalesTrend,
  overviewTodayFocus,
  type OverviewChannel,
  type OverviewRoleView,
  type OverviewTimeRange
} from '@/lib/mock-data/overview';
import { getCompanyById, getMerchantByScope } from '@/lib/tenant-context';

export default function OverviewPage() {
  const { companyId, merchantScope, locale } = useShellState();
  const company = getCompanyById(companyId);
  const merchant = getMerchantByScope(merchantScope);
  const scopeName = merchant?.name ?? (locale === 'zh-CN' ? `${company.name} 全部 merchant` : `${company.name} all merchants`);

  const [selectedTimeRange, setSelectedTimeRange] = useState<OverviewTimeRange>('7d');
  const [selectedChannel, setSelectedChannel] = useState<OverviewChannel>('all');
  const [selectedRoleView, setSelectedRoleView] = useState<OverviewRoleView>('management');

  const roleConfig = overviewRoleConfig[selectedRoleView];

  const filteredKpis = useMemo(() => {
    const visible = overviewKpis.filter(
      (item) => item.channels.includes(selectedChannel) && item.roles.includes(selectedRoleView)
    );

    return [...visible]
      .sort((left, right) => roleConfig.highlightedKpis.indexOf(left.id) - roleConfig.highlightedKpis.indexOf(right.id))
      .slice(0, 4);
  }, [roleConfig.highlightedKpis, selectedChannel, selectedRoleView]);

  const filteredChannelPerformance = useMemo(
    () => overviewChannelPerformance.filter((item) => selectedChannel === 'all' || item.channel === selectedChannel),
    [selectedChannel]
  );

  const filteredFulfillment = useMemo(
    () => overviewFulfillmentEfficiency.filter((item) => item.channel === 'all' || item.channel === selectedChannel),
    [selectedChannel]
  );

  const filteredRefunds = useMemo(
    () => overviewRefundAfterSales.filter((item) => item.channel === 'all' || item.channel === selectedChannel),
    [selectedChannel]
  );

  const filteredFinance = useMemo(
    () => overviewFinanceSettlement.filter((item) => item.channel === 'all' || item.channel === selectedChannel),
    [selectedChannel]
  );

  const focusItems = useMemo(
    () => overviewTodayFocus.filter((item) => item.channels.includes(selectedChannel) && item.roles.includes(selectedRoleView)),
    [selectedChannel, selectedRoleView]
  );

  const recommendedItems = useMemo(
    () => overviewRecommendedActions.filter((item) => item.channels.includes(selectedChannel) && item.roles.includes(selectedRoleView)),
    [selectedChannel, selectedRoleView]
  );

  return (
    <DashboardTemplate
      title={locale === 'zh-CN' ? '概览' : 'Overview'}
      description={
        locale === 'zh-CN'
          ? `先判断 ${scopeName} 的经营态势，再看结构、异常和今天该收口的动作。`
          : `Read business posture first, then structure, anomalies, and closeout actions for ${scopeName}.`
      }
      actions={[]}
    >
      <OverviewFilterBar
        timeRanges={overviewFilterOptions.timeRanges}
        channels={overviewFilterOptions.channels}
        roleViews={overviewFilterOptions.roleViews}
        selectedTimeRange={selectedTimeRange}
        selectedChannel={selectedChannel}
        selectedRoleView={selectedRoleView}
        onTimeRangeChange={setSelectedTimeRange}
        onChannelChange={setSelectedChannel}
        onRoleViewChange={setSelectedRoleView}
      />

      <OverviewPostureHero
        kpis={filteredKpis}
        highlightedIds={roleConfig.highlightedKpis}
        trendPoints={overviewSalesTrend[selectedTimeRange]}
        focusItems={focusItems}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)]">
        <SectionCard
          title={locale === 'zh-CN' ? '结构分析' : 'Structural analysis'}
          description={locale === 'zh-CN' ? '先看渠道表现，理解业务变化从哪里来。' : 'Use channel structure to explain where the business change comes from.'}
          variant="default"
        >
          <OverviewChannelPerformance items={filteredChannelPerformance} />
        </SectionCard>

        <SectionCard
          title={locale === 'zh-CN' ? '经营结构摘要' : 'Business structure summary'}
          description={locale === 'zh-CN' ? '把库存、退款和回款压力压缩成一个快速判断侧栏。' : 'Compress stock, refund, and settlement pressure into a quick judgment rail.'}
          variant="quiet"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[12px] font-medium text-[var(--muted)]">库存压力</div>
              <div className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{overviewInventoryHealth.replenishmentLabel}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">{overviewInventoryHealth.coverageTargetLabel}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[12px] font-medium text-[var(--muted)]">退款压力</div>
              <div className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{filteredRefunds[0] ? `${filteredRefunds[0].refundRate}%` : '--'}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">当前筛选范围内平均退款率</div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[12px] font-medium text-[var(--muted)]">回款压力</div>
              <div className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">{filteredFinance[0]?.pendingSettlement ?? '--'}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">待确认回款仍需持续跟进</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={locale === 'zh-CN' ? '异常侦测' : 'Anomaly detection'}
        description={locale === 'zh-CN' ? '把库存、履约、退款、回款放到一个诊断层中看异常。' : 'Read stock, fulfillment, refund, and settlement as one diagnostic layer.'}
        variant="quiet"
      >
        <OverviewAnomalyRadar
          inventory={overviewInventoryHealth}
          fulfillment={filteredFulfillment}
          refunds={filteredRefunds}
          finance={filteredFinance}
        />
      </SectionCard>

      <SectionCard
        title={locale === 'zh-CN' ? '今日收口' : 'Today closeout'}
        description={locale === 'zh-CN' ? '最后只看今天必须收口的重点和建议动作。' : 'Close with the issues and actions that matter today.'}
        variant="quiet"
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <div className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">今日重点</div>
            <OverviewPriorityList items={focusItems} maxItems={3} />
          </div>
          <div>
            <div className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">建议动作</div>
            <OverviewPriorityList items={recommendedItems} maxItems={3} />
          </div>
        </div>
      </SectionCard>
    </DashboardTemplate>
  );
}
