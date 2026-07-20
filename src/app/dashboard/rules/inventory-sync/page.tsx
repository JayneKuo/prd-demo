'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Play, Pause, Copy, Trash2, Settings2, X, Columns3,
  ArrowRight, Info, RefreshCw, Clock, Building2, Package, AlertTriangle,
  ChevronDown, ChevronRight, Zap, Calendar, BarChart2, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
type RuleStatus = 'active' | 'inactive' | 'draft';
type RuleCategory = 'retailer' | 'owner' | 'sku' | 'schedule' | 'exception';

type SyncRule = {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  status: RuleStatus;
  priority: number;
  // Retailer / channel
  retailerIds: string[];
  retailerNames: string[];
  // Owner (货主) dimension
  ownerIds: string[];
  ownerNames: string[];
  // Sync schedule
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  syncTime?: string; // e.g. "02:00" for daily
  // Inventory adjustment
  inventoryBuffer?: number; // subtract fixed qty before sync
  inventoryRatio?: number;  // multiply available qty, e.g. 0.9 = 90%
  safetyStock?: number;     // threshold below which sync 0
  maxSyncQty?: number;
  // SKU rules
  syncUnavailableAsZero: boolean;
  includeZeroInventory: boolean;
  includePreorder: boolean;
  includeBackorder: boolean;
  // Stats
  lastSyncAt: string;
  lastSyncSkus: number;
  lastSyncSuccess: number;
  lastSyncFailed: number;
  avgDuration: string;
  // Conditions / actions for display
  conditions: string[];
  actions: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Recent sync logs
  syncLogs: { time: string; retailer: string; skus: number; success: number; failed: number; duration: string; status: 'success' | 'partial' | 'failed' }[];
};

// ─── Config maps ───
const categoryConfig: Record<RuleCategory, { label: string; color: string; icon: React.ReactNode }> = {
  retailer:  { label: 'Retailer 渠道', color: 'bg-blue-50 text-blue-700 ring-blue-200',     icon: <Building2 className="size-3" /> },
  owner:     { label: '货主维度',       color: 'bg-violet-50 text-violet-700 ring-violet-200', icon: <Package className="size-3" /> },
  sku:       { label: 'SKU 规则',       color: 'bg-cyan-50 text-cyan-700 ring-cyan-200',       icon: <Filter className="size-3" /> },
  schedule:  { label: '同步计划',       color: 'bg-amber-50 text-amber-700 ring-amber-200',    icon: <Calendar className="size-3" /> },
  exception: { label: '异常处理',       color: 'bg-red-50 text-red-700 ring-red-200',          icon: <AlertTriangle className="size-3" /> },
};

const statusConfig: Record<RuleStatus, { label: string; dot: string }> = {
  active:   { label: '启用', dot: 'bg-green-500' },
  inactive: { label: '停用', dot: 'bg-slate-400' },
  draft:    { label: '草稿', dot: 'bg-amber-400' },
};

const freqConfig: Record<SyncRule['syncFrequency'], { label: string; color: string }> = {
  realtime: { label: '实时',   color: 'text-green-700 bg-green-50' },
  hourly:   { label: '每小时', color: 'text-blue-700 bg-blue-50' },
  daily:    { label: '每日',   color: 'text-indigo-700 bg-indigo-50' },
  weekly:   { label: '每周',   color: 'text-slate-700 bg-slate-100' },
  manual:   { label: '手动',   color: 'text-amber-700 bg-amber-50' },
};

// ─── Mock sync logs ───
const mockSyncLogs = [
  { time: '2026-07-17 02:00:12', retailer: 'Walmart',  skus: 1248, success: 1248, failed: 0, duration: '4.2s',  status: 'success' as const },
  { time: '2026-07-17 02:00:08', retailer: 'Target',   skus: 836,  success: 836,  failed: 0, duration: '3.1s',  status: 'success' as const },
  { time: '2026-07-17 02:00:15', retailer: 'Costco',   skus: 412,  success: 410,  failed: 2, duration: '2.8s',  status: 'partial' as const },
  { time: '2026-07-16 02:00:09', retailer: 'Walmart',  skus: 1248, success: 1248, failed: 0, duration: '4.0s',  status: 'success' as const },
  { time: '2026-07-16 02:00:11', retailer: 'Target',   skus: 836,  success: 825,  failed: 11,duration: '3.3s',  status: 'partial' as const },
];

const mockSyncLogsShort = mockSyncLogs.slice(0, 3);

// ─── Mock rules ───
const mockRules: SyncRule[] = [
  // ── EDI 核心同步规则（按 retailer 分组）──
  {
    id: 'ISR-001', name: 'Walmart EDI 库存同步',
    category: 'retailer', status: 'active', priority: 1,
    description: '每日凌晨 02:00 按 retailer 分组同步 SKU 库存至 Walmart EDI；不可用 SKU 强制为 0，0 库存 SKU 必须同步',
    retailerIds: ['walmart'], retailerNames: ['Walmart'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    inventoryBuffer: 0, inventoryRatio: 1,
    conditions: [
      'sku-aka 中 tag=retailer, organization=Walmart 的全部 SKU',
      'SKU 状态为可用：同步实际可用库存',
      'SKU 状态为不可用/停售：强制同步库存 = 0',
      '库存为 0 的 SKU 仍必须同步（不可跳过）',
    ],
    actions: [
      '按 retailer 分组构造 EDI 报文',
      '同步字段：status / aka-retailer-value / UPC / 库存数量（含双单位）',
      '调用 Walmart EDI 856/846 接口推送',
      '推送失败自动重试 3 次，超限告警',
    ],
    lastSyncAt: '2026-07-17 02:00:12', lastSyncSkus: 1248, lastSyncSuccess: 1248, lastSyncFailed: 0,
    avgDuration: '4.2s', createdAt: '2026-02-10', updatedAt: '2026-07-01', createdBy: '系统默认',
    syncLogs: mockSyncLogs,
  },
  {
    id: 'ISR-002', name: 'Target EDI 库存同步',
    category: 'retailer', status: 'active', priority: 2,
    description: '每日凌晨 02:00 向 Target 同步库存，同步 aka-retailer-value、UPC 及双单位库存',
    retailerIds: ['target'], retailerNames: ['Target'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    inventoryBuffer: 0, inventoryRatio: 1,
    conditions: [
      'sku-aka 中 tag=retailer, organization=Target 的全部 SKU',
      'SKU 不可用 → 库存强制为 0',
      '0 库存 SKU 保持同步，不过滤',
    ],
    actions: [
      '构造 Target 846 EDI 报文',
      '同步 SKU status、aka-retailer-value、UPC、qty（EA + case）',
      '调用 Target EDI 网关推送',
    ],
    lastSyncAt: '2026-07-17 02:00:08', lastSyncSkus: 836, lastSyncSuccess: 836, lastSyncFailed: 0,
    avgDuration: '3.1s', createdAt: '2026-02-10', updatedAt: '2026-07-01', createdBy: '系统默认',
    syncLogs: mockSyncLogsShort,
  },
  {
    id: 'ISR-003', name: 'Costco EDI 库存同步',
    category: 'retailer', status: 'active', priority: 3,
    description: '每日凌晨 02:00 向 Costco 同步库存，Costco 使用 case pack 为主单位',
    retailerIds: ['costco'], retailerNames: ['Costco'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    inventoryBuffer: 0, inventoryRatio: 1,
    conditions: [
      'sku-aka 中 tag=retailer, organization=Costco 的全部 SKU',
      'Costco 主单位为 case pack，副单位为 EA',
      '不可用 SKU → 库存 0',
    ],
    actions: [
      '构造 Costco 846 EDI 报文（case 为主单位）',
      '同步 aka-retailer-value、UPC、case qty、EA qty',
      '推送至 Costco 1-EDI-Source 网关',
    ],
    lastSyncAt: '2026-07-17 02:00:15', lastSyncSkus: 412, lastSyncSuccess: 410, lastSyncFailed: 2,
    avgDuration: '2.8s', createdAt: '2026-03-15', updatedAt: '2026-07-01', createdBy: '系统默认',
    syncLogs: mockSyncLogsShort,
  },

  // ── 货主维度规则 ──
  {
    id: 'ISR-004', name: '货主 A → Walmart/Target 同步',
    category: 'owner', status: 'active', priority: 10,
    description: '货主 A 的 SKU 分别向 Walmart、Target 同步库存，库存缓冲 50 件保护安全库存',
    retailerIds: ['walmart', 'target'], retailerNames: ['Walmart', 'Target'],
    ownerIds: ['owner-a'], ownerNames: ['货主 A（品牌方）'],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    inventoryBuffer: 50,
    conditions: [
      '仅处理 ownerId = 货主 A 的 SKU',
      '可用库存 - 50（安全缓冲）后同步',
      '计算结果 < 0 则同步 0',
      '覆盖 Walmart / Target 两个 retailer',
    ],
    actions: [
      '过滤出货主 A 的 SKU 列表',
      '可用库存减去 50 件缓冲',
      '分别推送至 Walmart、Target EDI',
    ],
    lastSyncAt: '2026-07-17 02:00:14', lastSyncSkus: 380, lastSyncSuccess: 380, lastSyncFailed: 0,
    avgDuration: '2.1s', createdAt: '2026-04-01', updatedAt: '2026-06-20', createdBy: '李运营',
    syncLogs: mockSyncLogsShort,
  },
  {
    id: 'ISR-005', name: '货主 B → Costco 专供同步',
    category: 'owner', status: 'active', priority: 11,
    description: '货主 B 的 SKU 仅向 Costco 同步，同步 90% 可用库存防止超卖',
    retailerIds: ['costco'], retailerNames: ['Costco'],
    ownerIds: ['owner-b'], ownerNames: ['货主 B（代工厂）'],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    inventoryRatio: 0.9,
    conditions: [
      '仅处理 ownerId = 货主 B 的 SKU',
      '同步数量 = floor(可用库存 × 90%)',
      '仅向 Costco 推送',
    ],
    actions: [
      '过滤货主 B 的 SKU',
      '乘以 0.9 比例取整',
      '推送至 Costco EDI',
    ],
    lastSyncAt: '2026-07-17 02:00:16', lastSyncSkus: 120, lastSyncSuccess: 120, lastSyncFailed: 0,
    avgDuration: '1.4s', createdAt: '2026-05-10', updatedAt: '2026-06-28', createdBy: '王物流',
    syncLogs: mockSyncLogsShort,
  },

  // ── SKU 规则 ──
  {
    id: 'ISR-006', name: '预售 SKU 库存同步',
    category: 'sku', status: 'active', priority: 20,
    description: '预售状态的 SKU 同步实际预售可售数量（非 0），让 retailer 提前上架接单',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: false, includeZeroInventory: true,
    includePreorder: true, includeBackorder: false,
    conditions: [
      'SKU 状态 = preorder',
      '有预售可用数量时正常同步',
      '无预售数量则同步 0',
    ],
    actions: [
      '读取预售可售库存字段',
      '按 retailer 分组推送',
    ],
    lastSyncAt: '2026-07-17 02:00:18', lastSyncSkus: 64, lastSyncSuccess: 64, lastSyncFailed: 0,
    avgDuration: '0.8s', createdAt: '2026-05-20', updatedAt: '2026-07-01', createdBy: '张运营',
    syncLogs: mockSyncLogsShort,
  },
  {
    id: 'ISR-007', name: '不可用 SKU 强制同步 0',
    category: 'sku', status: 'active', priority: 90,
    description: '任何 retailer 的不可用/停售/停产 SKU，无论实际库存多少，一律同步为 0',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily', syncTime: '02:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    conditions: [
      'SKU status ∈ { unavailable, discontinued, blocked }',
      '不论实际库存数量',
    ],
    actions: [
      '覆盖库存为 0',
      '随当日批次推送',
    ],
    lastSyncAt: '2026-07-17 02:00:12', lastSyncSkus: 88, lastSyncSuccess: 88, lastSyncFailed: 0,
    avgDuration: '0.5s', createdAt: '2026-02-10', updatedAt: '2026-06-30', createdBy: '系统默认',
    syncLogs: mockSyncLogsShort,
  },

  // ── 同步计划规则 ──
  {
    id: 'ISR-008', name: '紧急缺货实时推送',
    category: 'schedule', status: 'active', priority: 5,
    description: '当库存从有货突变为 0 时，不等每日批次，立即触发实时推送通知 retailer',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'realtime',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    conditions: [
      '库存变更事件：available_qty 从 > 0 变为 0',
      '或 SKU 状态突变为 unavailable',
    ],
    actions: [
      '触发实时推送任务',
      '仅推送变更的 SKU，不全量同步',
      '写入实时推送日志',
    ],
    lastSyncAt: '2026-07-17 09:34:22', lastSyncSkus: 3, lastSyncSuccess: 3, lastSyncFailed: 0,
    avgDuration: '0.3s', createdAt: '2026-03-20', updatedAt: '2026-07-01', createdBy: '系统默认',
    syncLogs: mockSyncLogsShort,
  },
  {
    id: 'ISR-009', name: '周末补充同步',
    category: 'schedule', status: 'inactive', priority: 30,
    description: '每周六额外执行一次全量同步，弥补周内增量同步的潜在漂移',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'weekly', syncTime: '06:00',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: true, includeBackorder: true,
    conditions: [
      '每周六 06:00',
      '全量同步所有 retailer 的全部 SKU',
    ],
    actions: [
      '全量重建 EDI 库存报文',
      '推送所有 retailer',
    ],
    lastSyncAt: '—', lastSyncSkus: 0, lastSyncSuccess: 0, lastSyncFailed: 0,
    avgDuration: '—', createdAt: '2026-06-01', updatedAt: '2026-06-01', createdBy: '李运营',
    syncLogs: [],
  },

  // ── 异常处理规则 ──
  {
    id: 'ISR-010', name: 'EDI 推送失败重试',
    category: 'exception', status: 'active', priority: 80,
    description: 'EDI 接口返回失败时自动重试，超过 3 次后挂起并告警运营团队',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'manual',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    conditions: [
      'EDI 推送 HTTP 状态码 ≠ 200 / 202',
      '或超时 > 30s',
      '重试次数 < 3',
    ],
    actions: [
      '间隔 5 分钟自动重试',
      '3 次失败 → 标记失败 + 告警',
      '写入错误日志，保留原始报文',
    ],
    lastSyncAt: '2026-07-17 02:08:33', lastSyncSkus: 2, lastSyncSuccess: 2, lastSyncFailed: 0,
    avgDuration: '5.1s', createdAt: '2026-02-10', updatedAt: '2026-06-25', createdBy: '系统默认',
    syncLogs: mockSyncLogsShort,
  },
  {
    id: 'ISR-011', name: '库存差异预警',
    category: 'exception', status: 'active', priority: 75,
    description: '同步后校验 ERP 与 EDI 回执的库存差值，超过阈值时触发人工核查',
    retailerIds: [], retailerNames: ['全部 retailer'],
    ownerIds: [], ownerNames: [],
    syncFrequency: 'daily',
    syncUnavailableAsZero: true, includeZeroInventory: true,
    includePreorder: false, includeBackorder: false,
    conditions: [
      '同步完成后拉取 retailer 回执',
      '差值 > 5% 或 > 100 件时触发',
    ],
    actions: [
      '生成差异报告',
      '通知运营人工核查',
      '差值持续 2 天 → 升级告警',
    ],
    lastSyncAt: '2026-07-17 02:05:30', lastSyncSkus: 2496, lastSyncSuccess: 2496, lastSyncFailed: 0,
    avgDuration: '1.2s', createdAt: '2026-04-15', updatedAt: '2026-06-30', createdBy: '张运营',
    syncLogs: mockSyncLogsShort,
  },
];

// ─── Tabs ───
const tabs = [
  { key: 'all',       label: '全部' },
  { key: 'retailer',  label: 'Retailer 渠道',  filter: (r: SyncRule) => r.category === 'retailer' },
  { key: 'owner',     label: '货主维度',         filter: (r: SyncRule) => r.category === 'owner' },
  { key: 'sku',       label: 'SKU 规则',         filter: (r: SyncRule) => r.category === 'sku' },
  { key: 'schedule',  label: '同步计划',         filter: (r: SyncRule) => r.category === 'schedule' },
  { key: 'exception', label: '异常处理',         filter: (r: SyncRule) => r.category === 'exception' },
];

// ─── Page ───
export default function InventorySyncRulesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]       = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [freqFilter, setFreqFilter]     = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [pageSize, setPageSize]         = useState(20);
  const [currentPage, setCurrentPage]  = useState(1);
  const [jumpPage, setJumpPage]        = useState('1');

  const activeTabDef = tabs.find(t => t.key === activeTab);
  const tabFiltered  = activeTabDef?.filter ? mockRules.filter(activeTabDef.filter) : mockRules;

  const filteredRules = useMemo(() => tabFiltered.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (freqFilter   && r.syncFrequency !== freqFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    }
    return true;
  }), [tabFiltered, statusFilter, freqFilter, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    tabs.forEach(t => { c[t.key] = t.key === 'all' ? mockRules.length : mockRules.filter(t.filter!).length; });
    return c;
  }, []);

  const totalPages    = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const paginatedRules = filteredRules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleRow = (id: string) => setSelectedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => {
    setSelectedRows(selectedRows.size === paginatedRules.length
      ? new Set() : new Set(paginatedRules.map(r => r.id)));
  };
  const clearFilters = () => { setSearchQuery(''); setStatusFilter(''); setFreqFilter(''); };
  const hasFilters = !!(searchQuery || statusFilter || freqFilter);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">库存同步规则</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            按 Retailer 渠道分组同步 EDI 库存 · OMS 每日一次推送 · 支持货主维度 / 自定义规则
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-subtle)]">
            <RefreshCw className="size-3.5" />
            立即同步
          </button>
          <Link
            href="/dashboard/rules/inventory-sync/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            新建规则
          </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '已启用规则', value: mockRules.filter(r => r.status === 'active').length, icon: <Zap className="size-4 text-green-600" />, color: 'text-green-700' },
          { label: '今日已同步 SKU', value: '2,496', icon: <BarChart2 className="size-4 text-blue-600" />, color: 'text-blue-700' },
          { label: '同步成功率', value: '99.7%', icon: <RefreshCw className="size-4 text-indigo-600" />, color: 'text-indigo-700' },
          { label: '上次同步', value: '今日 02:00', icon: <Clock className="size-4 text-amber-600" />, color: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)]">{s.icon}</div>
            <div>
              <div className={cn('text-[18px] font-semibold', s.color)}>{s.value}</div>
              <div className="text-[11px] text-[var(--muted)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Batch bar ── */}
      {selectedRows.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedRows.size} 项</span>
          <div className="flex items-center gap-2">
            <button className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white"><Play className="size-3" />批量启用</button>
            <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]"><Pause className="size-3" />批量停用</button>
            <button className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]"><Trash2 className="size-3" />删除</button>
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]"><X className="size-4" /></button>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">

        {/* Sticky header: tabs + filters */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl pt-5 lg:pt-6 bg-[var(--surface)]">

          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-5 overflow-x-auto">
              {tabs.map(tab => {
                const count = counts[tab.key] ?? 0;
                const isActive = tab.key === activeTab;
                return (
                  <button key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                    className={cn('relative pb-3 pt-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                      isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    )}
                  >
                    {tab.label}
                    {count > 0 && <span className="ml-1.5 text-[11px] text-[var(--muted-foreground)]">{count}</span>}
                    {isActive && <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            <button className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
              <Columns3 className="size-3.5" />列设置
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
              <Search className="size-3.5 text-[var(--muted)]" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索规则名称/ID..."
                className="w-[160px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                  <X className="size-3 text-[var(--muted)]" />
                </button>
              )}
            </div>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                statusFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                             : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
              <option value="">状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
              <option value="draft">草稿</option>
            </select>

            <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)}
              className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors',
                freqFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                           : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}>
              <option value="">同步频率</option>
              <option value="realtime">实时</option>
              <option value="hourly">每小时</option>
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="manual">手动</option>
            </select>

            {hasFilters && (
              <button onClick={clearFilters} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" className="size-3.5 rounded border-[var(--border)]"
                    checked={selectedRows.size === paginatedRules.length && paginatedRules.length > 0}
                    onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="whitespace-nowrap px-3 py-2.5">规则名称</th>
                <th className="whitespace-nowrap px-3 py-2.5">类型</th>
                <th className="whitespace-nowrap px-3 py-2.5">Retailer</th>
                <th className="whitespace-nowrap px-3 py-2.5">货主</th>
                <th className="whitespace-nowrap px-3 py-2.5">频率</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">上次同步 SKU</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">成功 / 失败</th>
                <th className="whitespace-nowrap px-3 py-2.5">上次同步时间</th>
                <th className="whitespace-nowrap px-3 py-2.5">创建人</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedRules.length === 0 ? (
                <tr><td colSpan={12} className="py-12 text-center text-[13px] text-[var(--muted)]">暂无匹配的规则</td></tr>
              ) : paginatedRules.map(rule => (
                <Fragment key={rule.id}>
                  {/* ── Main row ── */}
                  <tr
                    className={cn('group cursor-pointer transition-colors',
                      expandedRule === rule.id ? 'bg-[var(--surface-subtle)]' : 'hover:bg-[var(--surface-subtle)]')}
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="size-3.5 rounded border-[var(--border)]"
                        checked={selectedRows.has(rule.id)} onChange={() => toggleRow(rule.id)}
                        aria-label={`Select ${rule.name}`} />
                    </td>

                    {/* Name + desc + ID */}
                    <td className="px-3 py-3 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{rule.name}</span>
                        <span className="text-[10px] font-mono text-[var(--muted)]">{rule.id}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate max-w-[320px]">{rule.description}</div>
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', categoryConfig[rule.category].color)}>
                        {categoryConfig[rule.category].icon}
                        {categoryConfig[rule.category].label}
                      </span>
                    </td>

                    {/* Retailer */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {rule.retailerNames.length === 0
                          ? <span className="text-[11px] text-[var(--muted)]">全部</span>
                          : rule.retailerNames.map(n => (
                            <span key={n} className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--foreground)] border border-[var(--border-subtle)]">{n}</span>
                          ))}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="whitespace-nowrap px-3 py-3">
                      {rule.ownerNames.length === 0
                        ? <span className="text-[11px] text-[var(--muted)]">—</span>
                        : <span className="text-[12px] text-[var(--foreground)]">{rule.ownerNames.join(', ')}</span>}
                    </td>

                    {/* Frequency */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', freqConfig[rule.syncFrequency].color)}>
                        <Clock className="size-3" />
                        {freqConfig[rule.syncFrequency].label}
                        {rule.syncTime && <span className="ml-0.5 opacity-70">{rule.syncTime}</span>}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('size-2 rounded-full', statusConfig[rule.status].dot)} />
                        <span className="text-[12px] text-[var(--foreground)]">{statusConfig[rule.status].label}</span>
                      </div>
                    </td>

                    {/* Last sync SKU count */}
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[13px] text-[var(--foreground)]">
                      {rule.lastSyncSkus > 0 ? rule.lastSyncSkus.toLocaleString() : '—'}
                    </td>

                    {/* Success / failed */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[12px]">
                      {rule.lastSyncSkus > 0 ? (
                        <span>
                          <span className="text-green-600 font-medium">{rule.lastSyncSuccess.toLocaleString()}</span>
                          <span className="text-[var(--muted)]"> / </span>
                          <span className={cn('font-medium', rule.lastSyncFailed > 0 ? 'text-red-600' : 'text-[var(--muted)]')}>
                            {rule.lastSyncFailed}
                          </span>
                        </span>
                      ) : <span className="text-[var(--muted)]">—</span>}
                    </td>

                    {/* Last sync at */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{rule.lastSyncAt}</td>

                    {/* Created by */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">{rule.createdBy}</td>

                    {/* Expand icon */}
                    <td className="px-3 py-3 text-right">
                      <button className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100">
                        {expandedRule === rule.id ? <ChevronDown className="size-4 text-[var(--muted)]" /> : <ChevronRight className="size-4 text-[var(--muted)]" />}
                      </button>
                    </td>
                  </tr>

                  {/* ── Expanded row ── */}
                  {expandedRule === rule.id && (
                    <tr>
                      <td colSpan={12} className="border-b border-[var(--border-subtle)] bg-[var(--background)] px-4 py-4">

                        {/* Conditions + Actions */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-[var(--foreground)]">
                              <Info className="size-3.5 text-blue-500" />同步条件
                            </h4>
                            <ul className="space-y-1.5">
                              {rule.conditions.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--foreground)]">
                                  <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-blue-400" />{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-[var(--foreground)]">
                              <ArrowRight className="size-3.5 text-green-500" />执行动作
                            </h4>
                            <ul className="space-y-1.5">
                              {rule.actions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--foreground)]">
                                  <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-green-400" />{a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* SKU 同步配置徽章 */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                          <span className="text-[11px] text-[var(--muted)] mr-1">同步配置：</span>
                          <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', rule.syncUnavailableAsZero ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                            {rule.syncUnavailableAsZero ? '不可用→强制 0' : '不可用保留原值'}
                          </span>
                          <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', rule.includeZeroInventory ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                            {rule.includeZeroInventory ? '含 0 库存 SKU' : '跳过 0 库存'}
                          </span>
                          <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', rule.includePreorder ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500')}>
                            {rule.includePreorder ? '含预售 SKU' : '不含预售'}
                          </span>
                          {rule.inventoryBuffer !== undefined && rule.inventoryBuffer > 0 && (
                            <span className="rounded bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                              库存缓冲 -{rule.inventoryBuffer}
                            </span>
                          )}
                          {rule.inventoryRatio !== undefined && rule.inventoryRatio < 1 && (
                            <span className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                              同步比例 {Math.round(rule.inventoryRatio * 100)}%
                            </span>
                          )}
                          {rule.maxSyncQty && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              最大同步 {rule.maxSyncQty}
                            </span>
                          )}
                        </div>

                        {/* Recent sync logs */}
                        {rule.syncLogs.length > 0 && (
                          <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                            <h4 className="mb-2 text-[12px] font-semibold text-[var(--foreground)]">最近同步记录</h4>
                            <div className="overflow-hidden rounded-md border border-[var(--border-subtle)]">
                              <table className="w-full text-[11px]">
                                <thead className="bg-[var(--surface-subtle)]">
                                  <tr>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">时间</th>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">Retailer</th>
                                    <th className="px-2.5 py-1.5 text-right font-medium text-[var(--muted-foreground)]">SKU 数</th>
                                    <th className="px-2.5 py-1.5 text-right font-medium text-[var(--muted-foreground)]">成功</th>
                                    <th className="px-2.5 py-1.5 text-right font-medium text-[var(--muted-foreground)]">失败</th>
                                    <th className="px-2.5 py-1.5 text-right font-medium text-[var(--muted-foreground)]">耗时</th>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">状态</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                  {rule.syncLogs.map((log, i) => (
                                    <tr key={i}>
                                      <td className="px-2.5 py-1.5 text-[var(--muted)]">{log.time}</td>
                                      <td className="px-2.5 py-1.5 text-[var(--foreground)]">{log.retailer}</td>
                                      <td className="px-2.5 py-1.5 text-right font-mono text-[var(--foreground)]">{log.skus.toLocaleString()}</td>
                                      <td className="px-2.5 py-1.5 text-right font-mono text-green-600">{log.success.toLocaleString()}</td>
                                      <td className={cn('px-2.5 py-1.5 text-right font-mono', log.failed > 0 ? 'text-red-600' : 'text-[var(--muted)]')}>{log.failed}</td>
                                      <td className="px-2.5 py-1.5 text-right font-mono text-[var(--muted)]">{log.duration}</td>
                                      <td className="px-2.5 py-1.5">
                                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium',
                                          log.status === 'success' ? 'bg-green-50 text-green-700' :
                                          log.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                                          {log.status === 'success' ? '成功' : log.status === 'partial' ? '部分失败' : '失败'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Meta + actions */}
                        <div className="mt-4 flex items-center gap-6 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--muted)]">
                          <span>创建时间: {rule.createdAt}</span>
                          <span>最后更新: {rule.updatedAt}</span>
                          <span>优先级: {rule.priority}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                            <RefreshCw className="size-3.5" /> 立即同步
                          </button>
                          {rule.status === 'active'
                            ? <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"><Pause className="size-3.5" /> 停用</button>
                            : <button className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-[12px] text-white hover:bg-green-700"><Play className="size-3.5" /> 启用</button>}
                          <button onClick={() => router.push(`/dashboard/rules/inventory-sync/new?edit=${rule.id}`)} className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"><Settings2 className="size-3.5" /> 编辑</button>
                          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"><Copy className="size-3.5" /> 复制</button>
                          <button className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /> 删除</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination ── */}
        <div className="sticky -bottom-5 lg:-bottom-6 z-20 flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pb-[calc(0.625rem+20px)] lg:pb-[calc(0.625rem+24px)] text-[13px] text-[var(--muted)]">
          <span>共 {filteredRules.length} 条规则</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">每页</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-[var(--foreground)]">
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[12px]">条</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40">
                ‹
              </button>
              <span className="px-1 text-[12px] text-[var(--foreground)]">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40">
                ›
              </button>
              <div className="ml-2 flex items-center gap-1">
                <span className="text-[12px]">跳至</span>
                <input type="number" min={1} max={totalPages} value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { const p = Math.max(1, Math.min(totalPages, Number(jumpPage))); setCurrentPage(p); setJumpPage(String(p)); } }}
                  className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-center text-[12px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]" />
                <span className="text-[12px]">页</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
