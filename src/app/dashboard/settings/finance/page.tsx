'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

type RevenueRecognitionRule = 'payment' | 'shipment' | 'delivery';
type CostMethod = 'average' | 'standard' | 'fifo';
type ErpIntegration = 'netsuite' | 'quickbooks' | 'none';

// ─── 配置选项 ────────────────────────────────────────────────────────────────

const revenueRuleOptions: {
  value: RevenueRecognitionRule;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    value: 'shipment',
    label: '发货确认',
    desc: 'WMS 确认发货后自动确认收入。适合大多数电商场景，推荐默认。',
    badge: '推荐',
  },
  {
    value: 'delivery',
    label: '签收确认',
    desc: '物流运输商回传签收后确认收入。适合高价值商品或跨境业务。',
  },
  {
    value: 'payment',
    label: '付款确认',
    desc: '支付渠道回传 Captured 后立即确认收入。适合数字商品或即时服务。',
  },
];

const costMethodOptions: {
  value: CostMethod;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    value: 'average',
    label: '移动加权平均',
    desc: '每次入库后重新计算库存加权平均成本。数据稳定，适合库存价格波动小的场景。',
    badge: '推荐',
  },
  {
    value: 'standard',
    label: '标准成本',
    desc: '预先设定固定单位成本，不随采购价变化。适合制造型企业或成本稳定的品类。',
  },
  {
    value: 'fifo',
    label: '先进先出 (FIFO)',
    desc: '按入库批次顺序计算销售成本。适合有效期管理需求的品类（食品、化妆品等）。',
  },
];

const erpOptions: {
  value: ErpIntegration;
  label: string;
  desc: string;
  logoText: string;
}[] = [
  {
    value: 'none',
    label: '暂不集成',
    desc: '仅使用 OMS Finance 运营财务功能，后续可随时配置 ERP 集成。',
    logoText: '—',
  },
  {
    value: 'netsuite',
    label: 'NetSuite',
    desc: '适合中大型企业。OMS 同步订单、收入事件和会计分录至 NetSuite GL。',
    logoText: 'NS',
  },
  {
    value: 'quickbooks',
    label: 'QuickBooks',
    desc: '适合中小企业。OMS 同步发票、收款和费用至 QuickBooks Online。',
    logoText: 'QB',
  },
];

// ─── 页面组件 ────────────────────────────────────────────────────────────────

export default function FinanceSettingsPage() {
  const router = useRouter();

  // 租户级财务配置（实际场景从 API 加载，此处用 state 模拟）
  const [revenueRule, setRevenueRule] = useState<RevenueRecognitionRule>('shipment');
  const [costMethod, setCostMethod] = useState<CostMethod>('average');
  const [erpIntegration, setErpIntegration] = useState<ErpIntegration>('none');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    // 模拟保存
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-[860px] pt-5 lg:pt-6">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          设置
        </button>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[12px] text-[var(--muted)]">有未保存的更改</span>
          )}
          <button
            onClick={handleSave}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition',
              saved
                ? 'bg-[var(--success)] text-white'
                : 'bg-[var(--primary)] text-white shadow-[var(--shadow-soft)] hover:opacity-90'
            )}
          >
            {saved ? (
              <><Check className="size-3.5" />已保存</>
            ) : (
              '保存配置'
            )}
          </button>
        </div>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">财务配置</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          以下配置按租户生效，影响所有 Merchant 的收入确认、成本计算和 ERP 对接行为。
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Section 1: 收入确认规则 ── */}
        <ConfigSection
          title="收入确认规则"
          description="定义订单在哪个业务节点触发收入确认事件（Revenue Recognition Event）。收入不等于支付，必须完成履约后按规则确认。"
          docLink="#"
        >
          <div className="space-y-2">
            {revenueRuleOptions.map((opt) => (
              <RadioCard
                key={opt.value}
                selected={revenueRule === opt.value}
                label={opt.label}
                desc={opt.desc}
                badge={opt.badge}
                onClick={() => { setRevenueRule(opt.value); markDirty(); }}
              />
            ))}
          </div>
          <InfoBox>
            修改收入确认规则仅影响<strong>新产生的业务事件</strong>，不会追溯修改历史已确认收入。
          </InfoBox>
        </ConfigSection>

        {/* ── Section 2: 成本计算方法 ── */}
        <ConfigSection
          title="库存成本计算方法"
          description="决定商品出库时如何取用库存成本（COGS），直接影响订单利润准确性。"
          docLink="#"
        >
          <div className="space-y-2">
            {costMethodOptions.map((opt) => (
              <RadioCard
                key={opt.value}
                selected={costMethod === opt.value}
                label={opt.label}
                desc={opt.desc}
                badge={opt.badge}
                onClick={() => { setCostMethod(opt.value); markDirty(); }}
              />
            ))}
          </div>
          <InfoBox>
            成本方法变更后，新入库商品按新规则计算，历史成本台账保持不变。建议在会计期初变更。
          </InfoBox>
        </ConfigSection>

        {/* ── Section 3: ERP 集成 ── */}
        <ConfigSection
          title="ERP 集成"
          description="选择企业财务系统。OMS Finance 负责运营财务层（订单收入、成本、利润），ERP 负责总账和财务报表。"
          docLink="#"
        >
          <div className="space-y-2">
            {erpOptions.map((opt) => (
              <ErpCard
                key={opt.value}
                selected={erpIntegration === opt.value}
                value={opt.value}
                label={opt.label}
                desc={opt.desc}
                logoText={opt.logoText}
                onClick={() => { setErpIntegration(opt.value); markDirty(); }}
              />
            ))}
          </div>
          {erpIntegration !== 'none' && (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <ErpDetailConfig integration={erpIntegration} />
            </div>
          )}
        </ConfigSection>

        {/* ── Section 4: 财务期间控制（只读展示，Phase 2 功能） ── */}
        <ConfigSection
          title="财务期间控制"
          description="控制会计期间的开放与关闭。关闭期间后，历史财务数据将被锁定，只能新增调整分录。"
          docLink="#"
          comingSoon
        >
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[13px]">
            <span className="text-[var(--muted)]">当前开放期间</span>
            <span className="font-semibold text-[var(--foreground)]">2026 年 9 月</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[13px]">
            <span className="text-[var(--muted)]">上期关闭时间</span>
            <span className="font-semibold text-[var(--foreground)]">2026-08-31 23:59</span>
          </div>
        </ConfigSection>

        {/* ── Section 5: 审批流程（只读展示） ── */}
        <ConfigSection
          title="财务审批流程"
          description="高风险财务操作（大额退款、收入调整、手动分录）需要审批后才能执行。"
          docLink="#"
          comingSoon
        >
          <ApprovalRow label="大额退款审批" threshold="$500 以上退款需 Finance Manager 审批" enabled />
          <ApprovalRow label="收入手动调整" threshold="任意金额需 Finance Admin 审批" enabled />
          <ApprovalRow label="手动会计分录" threshold="任意分录需 Accountant 审批" enabled />
        </ConfigSection>

      </div>
    </div>
  );
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────

function ConfigSection({
  title,
  description,
  children,
  docLink,
  comingSoon,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  docLink?: string;
  comingSoon?: boolean;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
              {comingSoon && (
                <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                  即将开放
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
          </div>
          {docLink && !comingSoon && (
            <a href={docLink} className="shrink-0 text-[12px] text-[var(--primary)] hover:underline">
              文档
            </a>
          )}
        </div>
      </div>
      <div className={cn('space-y-3 px-5 py-4', comingSoon && 'pointer-events-none opacity-50')}>
        {children}
      </div>
    </section>
  );
}

function RadioCard({
  selected,
  label,
  desc,
  badge,
  onClick,
}: {
  selected: boolean;
  label: string;
  desc: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border px-4 py-3 text-left transition-all',
        selected
          ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--surface-subtle)]'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Radio indicator */}
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected
              ? 'border-[var(--primary)] bg-[var(--primary)]'
              : 'border-[var(--border)]'
          )}
        >
          {selected && <span className="size-1.5 rounded-full bg-white" />}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[13px] font-semibold', selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
              {label}
            </span>
            {badge && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">{desc}</p>
        </div>
        {selected && <Check className="size-4 shrink-0 text-[var(--primary)]" />}
      </div>
    </button>
  );
}

function ErpCard({
  selected,
  value,
  label,
  desc,
  logoText,
  onClick,
}: {
  selected: boolean;
  value: ErpIntegration;
  label: string;
  desc: string;
  logoText: string;
  onClick: () => void;
}) {
  const logoColors: Record<ErpIntegration, string> = {
    netsuite: 'bg-orange-100 text-orange-700',
    quickbooks: 'bg-green-100 text-green-700',
    none: 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border px-4 py-3 text-left transition-all',
        selected
          ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--surface-subtle)]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold', logoColors[value])}>
          {logoText}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[13px] font-semibold', selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
              {label}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">{desc}</p>
        </div>
        {selected && <Check className="size-4 shrink-0 text-[var(--primary)]" />}
      </div>
    </button>
  );
}

function ErpDetailConfig({ integration }: { integration: 'netsuite' | 'quickbooks' }) {
  const isNetSuite = integration === 'netsuite';
  return (
    <div className="space-y-3">
      <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
        {isNetSuite ? 'NetSuite 连接配置' : 'QuickBooks 连接配置'}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {isNetSuite ? (
          <>
            <LabelInput label="Account ID" placeholder="e.g. 1234567" />
            <LabelInput label="Consumer Key" placeholder="OAuth Consumer Key" type="password" />
            <LabelInput label="Consumer Secret" placeholder="OAuth Consumer Secret" type="password" />
            <LabelInput label="Token ID" placeholder="Token ID" type="password" />
          </>
        ) : (
          <>
            <LabelInput label="Client ID" placeholder="QuickBooks App Client ID" />
            <LabelInput label="Client Secret" placeholder="QuickBooks App Client Secret" type="password" />
            <LabelInput label="Realm ID (Company ID)" placeholder="e.g. 1234567890" />
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
          测试连接
        </button>
        <span className="text-[11px] text-[var(--muted)]">
          连接成功后，OMS 将自动同步客户、发票、收款和会计分录
        </span>
      </div>
    </div>
  );
}

function LabelInput({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  type?: 'text' | 'password';
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--muted-foreground)]">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--muted)]"
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            {show ? '隐藏' : '显示'}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2.5 ring-1 ring-inset ring-[var(--border-subtle)]">
      <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--muted)]" />
      <p className="text-[12px] leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );
}

function ApprovalRow({ label, threshold, enabled }: { label: string; threshold: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
      <div>
        <div className="text-[13px] font-medium text-[var(--foreground)]">{label}</div>
        <div className="mt-0.5 text-[12px] text-[var(--muted)]">{threshold}</div>
      </div>
      <span className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        enabled
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]'
      )}>
        {enabled ? '已启用' : '已关闭'}
      </span>
    </div>
  );
}
