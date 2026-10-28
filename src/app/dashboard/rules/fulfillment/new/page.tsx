'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, Play, CheckCircle2, AlertTriangle, Loader2, Plus, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
type RuleStage = 'review' | 'generate' | 'warehouse' | 'carrier' | 'push' | 'ship' | 'exception';
type Sel = { id: string; op: string; val: string };

const stageOptions: { value: RuleStage; label: string; color: string; then: string }[] = [
  { value: 'review',    label: '审单',     color: 'bg-cyan-50 text-cyan-700 ring-cyan-200',       then: '对命中订单执行以下审核动作' },
  { value: 'generate',  label: '生成履约单', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200', then: '创建履约单，按以下参数执行' },
  { value: 'warehouse', label: '寻仓',     color: 'bg-blue-50 text-blue-700 ring-blue-200',        then: '按以下规则分配最优仓库' },
  { value: 'carrier',   label: '承运商',   color: 'bg-green-50 text-green-700 ring-green-200',     then: '按以下规则匹配承运商' },
  { value: 'push',      label: '推单到仓', color: 'bg-purple-50 text-purple-700 ring-purple-200',  then: '按以下配置推送至仓库系统' },
  { value: 'ship',      label: '标发',     color: 'bg-amber-50 text-amber-700 ring-amber-200',     then: '按以下配置标记订单已发货' },
  { value: 'exception', label: '异常处理', color: 'bg-red-50 text-red-700 ring-red-200',           then: '对命中异常执行以下处理动作' },
];

// ─── 条件字段定义 ─────────────────────────────────────────────────────────────
const categories = [
  { key: 'review_specific', label: '审核检查项', stages: ['review'] as RuleStage[] },
  { key: 'base',      label: '基础信息',  stages: [] as RuleStage[] },
  { key: 'logistics', label: '物流信息',  stages: [] as RuleStage[] },
  { key: 'order',     label: '订单信息',  stages: [] as RuleStage[] },
  { key: 'product',   label: '货品信息',  stages: [] as RuleStage[] },
  { key: 'amazon',    label: 'Amazon',   stages: [] as RuleStage[] },
  { key: 'tiktok',    label: 'TikTok',   stages: [] as RuleStage[] },
  { key: 'shopify',   label: 'Shopify',  stages: [] as RuleStage[] },
  { key: 'ebay',      label: 'eBay',     stages: [] as RuleStage[] },
  { key: 'wish',      label: 'Wish',     stages: [] as RuleStage[] },
  { key: 'lazada',    label: 'Lazada',   stages: [] as RuleStage[] },
];

type CDef = { id: string; label: string; cat: string; type: 'tags' | 'text' | 'number'; opts?: string[] };
const cDefs: CDef[] = [
  // 审核检查项
  { id: 'risk_level',     label: '风险等级',    cat: 'review_specific', type: 'tags',   opts: ['低风险', '中风险', '高风险', '极高风险'] },
  { id: 'addr_complete',  label: '地址完整性',  cat: 'review_specific', type: 'tags',   opts: ['完整', '不完整', '无法验证'] },
  { id: 'is_duplicate',   label: '重复订单',    cat: 'review_specific', type: 'tags',   opts: ['是', '否'] },
  { id: 'blacklist_hit',  label: '黑名单命中',  cat: 'review_specific', type: 'tags',   opts: ['是', '否'] },
  { id: 'amount_anomaly', label: '金额异常',    cat: 'review_specific', type: 'tags',   opts: ['正常', '偏高', '偏低', '极度异常'] },
  { id: 'sku_compliance', label: 'SKU合规状态', cat: 'review_specific', type: 'tags',   opts: ['合规', '不合规', '待审核', '含禁运品'] },
  { id: 'inv_preoccupy',  label: '库存预占',    cat: 'review_specific', type: 'tags',   opts: ['预占成功', '部分预占', '预占失败'] },
  { id: 'payment_status', label: '支付状态',    cat: 'review_specific', type: 'tags',   opts: ['已支付', '待支付', '支付异常', 'COD'] },
  { id: 'buyer_type',     label: '买家类型',    cat: 'review_specific', type: 'tags',   opts: ['新买家', '老客户', 'VIP', '高危买家'] },
  // 基础信息
  { id: 'shop',     label: '订单店铺', cat: 'base', type: 'tags', opts: ['US Store', 'SG Store', 'UK Store', 'DE Store'] },
  { id: 'platform', label: '订单平台', cat: 'base', type: 'tags', opts: ['Amazon', 'Shopify', 'TikTok Shop', 'Walmart', 'eBay', 'Wish', 'Lazada'] },
  { id: 'site',     label: '订单站点', cat: 'base', type: 'tags', opts: ['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'SG'] },
  // 物流信息
  { id: 'country',     label: '收货国家',  cat: 'logistics', type: 'tags', opts: ['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'CA', 'SG'] },
  { id: 'state',       label: '收货省/州', cat: 'logistics', type: 'text' },
  { id: 'city',        label: '收货城市',  cat: 'logistics', type: 'text' },
  { id: 'zipcode',     label: '收货邮编',  cat: 'logistics', type: 'text' },
  { id: 'addr_length', label: '收货地址',  cat: 'logistics', type: 'text' },
  // 订单信息
  { id: 'amount_range',  label: '订单金额(USD)', cat: 'order', type: 'number' },
  { id: 'weight_kg',     label: '订单重量(kg)',  cat: 'order', type: 'number' },
  { id: 'ship_timeout',  label: '发货超时时间',  cat: 'order', type: 'number' },
  { id: 'order_time',    label: '下单时间',      cat: 'order', type: 'text' },
  { id: 'pay_time',      label: '付款时间',      cat: 'order', type: 'text' },
  // 货品信息
  { id: 'platform_sku',  label: '平台SKU',     cat: 'product', type: 'text' },
  { id: 'warehouse_sku', label: '仓库SKU',     cat: 'product', type: 'text' },
  { id: 'platform_qty',  label: '平台货品数量', cat: 'product', type: 'number' },
  { id: 'total_qty',     label: '货品总数量',   cat: 'product', type: 'number' },
  { id: 'product_size',  label: '产品尺寸',     cat: 'product', type: 'text' },
  // Amazon
  { id: 'prime',         label: 'Prime Order', cat: 'amazon', type: 'tags', opts: ['是', '否'] },
  { id: 'amazon_custom', label: '定制订单',    cat: 'amazon', type: 'tags', opts: ['是', '否'] },
  // TikTok
  { id: 'tt_delivery',  label: '交付类型',          cat: 'tiktok', type: 'tags', opts: ['平台配送', '卖家自发'] },
  { id: 'tt_ship',      label: '交货方式',          cat: 'tiktok', type: 'tags', opts: ['标准', '加急'] },
  { id: 'tt_warehouse', label: 'TikTok Warehouse', cat: 'tiktok', type: 'tags', opts: ['是', '否'] },
  // Shopify
  { id: 'shopify_cod', label: 'COD', cat: 'shopify', type: 'tags', opts: ['是', '否'] },
  // eBay
  { id: 'ebay_format',    label: 'eBay订单格式', cat: 'ebay', type: 'tags', opts: ['拍卖', '一口价', '议价'] },
  { id: 'ebay_edelivery', label: 'eDelivery订单', cat: 'ebay', type: 'tags', opts: ['是', '否'] },
  { id: 'ebay_listing',   label: 'Listing类型',   cat: 'ebay', type: 'tags', opts: ['单品', '多属性'] },
  // Wish
  { id: 'wish_express', label: 'Wish Express订单', cat: 'wish', type: 'tags', opts: ['是', '否'] },
  { id: 'wish_a_plus',  label: 'A+物流订单',       cat: 'wish', type: 'tags', opts: ['是', '否'] },
  { id: 'wish_fbw',     label: 'FBW订单',          cat: 'wish', type: 'tags', opts: ['是', '否'] },
  // Lazada
  { id: 'lazada_cod',   label: 'COD确认已付款', cat: 'lazada', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_ninka', label: 'Ninka标',       cat: 'lazada', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_fee',   label: 'COD运费',       cat: 'lazada', type: 'number' },
];

// 根据字段类型返回可用运算符
function getOperators(type: CDef['type']) {
  if (type === 'tags')   return [{ value: 'eq', label: '等于' }, { value: 'neq', label: '不等于' }, { value: 'in', label: '包含于' }];
  if (type === 'number') return [{ value: 'eq', label: '等于' }, { value: 'neq', label: '不等于' }, { value: 'gt', label: '大于' }, { value: 'lt', label: '小于' }, { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' }];
  return [{ value: 'eq', label: '等于' }, { value: 'neq', label: '不等于' }, { value: 'contains', label: '包含' }, { value: 'not_contains', label: '不包含' }, { value: 'starts_with', label: '开头为' }];
}

// ─── 通用动作选择卡 ─────────────────────────────────────────────────────────
type ActionCardDef = {
  value: string;
  label: string;
  desc: string;
  activeClass: string;
};

function ActionCards<T extends string>({ actions, value, onChange, children }: {
  actions: ActionCardDef[];
  value: T;
  onChange: (v: T) => void;
  children?: (v: T) => React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 space-y-2.5">
      {actions.map(a => (
        <label key={a.value} className={cn(
          'flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all',
          value === a.value ? a.activeClass : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'
        )}>
          <input type="radio" name={`action_${actions[0].value}`} value={a.value}
            checked={value === a.value} onChange={() => onChange(a.value as T)}
            className="size-3.5 mt-0.5 shrink-0 accent-[var(--primary)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{a.label}</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">{a.desc}</div>
            {children && value === a.value && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                {children(a.value as T)}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function NewFulfillmentRulePage() {
  const router = useRouter();

  // ── 基本信息 ──
  const [name, setName]             = useState('');
  const [nameError, setNameError]   = useState('');
  const [stage, setStage]           = useState<RuleStage>('warehouse');
  const [priority, setPriority]     = useState('1');
  const [ruleStatus, setRuleStatus] = useState<'启用' | '停用'>('启用');

  // ── 条件构建器 ──
  const [sels, setSels]             = useState<Sel[]>([]);
  const [condLogic, setCondLogic]   = useState<'and' | 'or'>('and');
  const [q, setQ]                   = useState('');
  const [showCondPicker, setShowCondPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCondPicker) return;
    const onMouse = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCondPicker(false); setQ('');
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowCondPicker(false); setQ(''); } };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, [showCondPicker]);

  const addCondition = (id: string) => {
    const def = cDefs.find(d => d.id === id);
    if (!def) return;
    const defaultVal = def.type === 'tags' && def.opts?.length ? def.opts[0] : '';
    const defaultOp  = def.type === 'tags' ? 'eq' : def.type === 'number' ? 'gt' : 'contains';
    setSels(prev => [...prev, { id, op: defaultOp, val: defaultVal }]);
    setShowCondPicker(false); setQ('');
  };
  const removeCondition = (id: string) => setSels(prev => prev.filter(s => s.id !== id));
  const setCondOp  = (id: string, op: string)  => setSels(prev => prev.map(s => s.id === id ? { ...s, op  } : s));
  const setCondVal = (id: string, val: string) => setSels(prev => prev.map(s => s.id === id ? { ...s, val } : s));
  const filtered = q ? cDefs.filter(d => d.label.toLowerCase().includes(q.toLowerCase())) : cDefs;
  const sortedCategories = [...categories].sort((a, b) => (b.stages.includes(stage) ? 1 : 0) - (a.stages.includes(stage) ? 1 : 0));

  // ── 审单策略 ──
  type ReviewAction = 'manual_review' | 'auto' | 'hold' | 'reject';
  const [reviewAction, setReviewAction]       = useState<ReviewAction>('manual_review');
  const [reviewFailAction, setReviewFailAction] = useState<'manual_review' | 'hold' | 'reject'>('manual_review');
  const [reviewNotifyRole, setReviewNotifyRole] = useState('运营');
  const [reviewTimeoutHours, setReviewTimeoutHours] = useState(24);
  const [reviewTimeoutAction, setReviewTimeoutAction] = useState<'auto_pass' | 'auto_reject' | 'escalate'>('auto_pass');
  const [reviewHoldTimeout, setReviewHoldTimeout]     = useState(48);
  const [rejectNotifyBuyer, setRejectNotifyBuyer]     = useState(true);
  const [fastBlockHighRisk, setFastBlockHighRisk]     = useState(false);
  const [fastBlockBlacklist, setFastBlockBlacklist]   = useState(false);
  const [reviewContinueMatch, setReviewContinueMatch] = useState(false);

  // ── 生成履约单策略 ──
  const [mergeMode, setMergeMode]         = useState<'none' | 'same_addr' | 'same_buyer'>('none');
  const [genTiming, setGenTiming]         = useState<'immediate' | 'batch'>('immediate');
  const [batchInterval, setBatchInterval] = useState(30);
  const [autoNumber, setAutoNumber]       = useState(true);
  const [numberPrefix, setNumberPrefix]   = useState('FF');

  // ── 寻仓策略 ──
  const [sortMode, setSortMode]               = useState<'distance' | 'priority' | 'stock'>('distance');
  const [distCalcMode, setDistCalcMode]       = useState<'delivery_time' | 'straight'>('delivery_time');
  const [stockSortDim, setStockSortDim]       = useState<'abs' | 'ratio'>('abs');
  const [checkProduct, setCheckProduct]       = useState(true);
  const [checkInv, setCheckInv]               = useState(true);
  const [checkInvHard, setCheckInvHard]       = useState(true);
  const [hazmatOnly, setHazmatOnly]           = useState(true);
  const [bulkOnly, setBulkOnly]               = useState(true);
  const [expiryOnly, setExpiryOnly]           = useState(false);
  const [noExpiredOut, setNoExpiredOut]       = useState(false);
  const [expiryThreshold, setExpiryThreshold] = useState(7);
  const [noMixBatch, setNoMixBatch]           = useState(false);
  const [noMixBatchHard, setNoMixBatchHard]   = useState(true);
  const [preferSingleWh, setPreferSingleWh]   = useState(true);
  const [allowMultiWh, setAllowMultiWh]       = useState(false);
  const [allowSkuMultiWh, setAllowSkuMultiWh] = useState(false);
  const [allowPartialShip, setAllowPartialShip] = useState(false);
  const [oneSkuPerOrder, setOneSkuPerOrder]   = useState(false);
  const [sampleNoSolo, setSampleNoSolo]       = useState(true);
  const [hazmatSolo, setHazmatSolo]           = useState(true);
  const [bulkSolo, setBulkSolo]               = useState(true);
  const [maxOutboundOrders, setMaxOutboundOrders] = useState(5);
  type FallbackAction = 'hold' | 'notify' | 'force_priority' | 'cancel';
  const [fallbackAction, setFallbackAction]   = useState<FallbackAction>('hold');
  const [fallbackTimeout, setFallbackTimeout] = useState(48);
  const [fallbackNotifyRole, setFallbackNotifyRole] = useState('运营');

  // ── 承运商策略 ──
  const [carrierSelectMode, setCarrierSelectMode] = useState<'smart' | 'cheapest' | 'fastest' | 'priority'>('smart');
  const [weightCalc, setWeightCalc]               = useState<'actual' | 'volume' | 'max'>('max');
  const [carrierFallback, setCarrierFallback]     = useState(true);
  const [maxCarrierRetry, setMaxCarrierRetry]     = useState(3);
  const [insure, setInsure]                       = useState(false);
  const [insureThreshold, setInsureThreshold]     = useState(100);

  // ── 推单策略 ──
  const [pushMode, setPushMode]             = useState<'realtime' | 'batch' | 'schedule'>('realtime');
  const [pushBatchSize, setPushBatchSize]   = useState(50);
  const [pushRetry, setPushRetry]           = useState(true);
  const [pushRetryMax, setPushRetryMax]     = useState(3);
  const [pushRetryInterval, setPushRetryInterval] = useState(5);
  const [pushFormat, setPushFormat]         = useState<'standard' | 'custom'>('standard');

  // ── 标发策略 ──
  const [shipAutoConfirm, setShipAutoConfirm]   = useState(true);
  const [shipNotify, setShipNotify]             = useState(true);
  const [trackSync, setTrackSync]               = useState(true);
  const [trackSyncInterval, setTrackSyncInterval] = useState(60);
  const [shipSplitConfirm, setShipSplitConfirm] = useState<'all_shipped' | 'any_shipped'>('all_shipped');

  // ── 异常处理策略 ──
  type ExceptionAction = 'hold' | 'retry' | 'escalate' | 'cancel';
  const [exceptionAction, setExceptionAction] = useState<ExceptionAction>('hold');
  const [exceptionHoldTimeout, setExceptionHoldTimeout] = useState(48);
  const [exceptionRetryMax, setExceptionRetryMax]       = useState(3);
  const [escalateTimeout, setEscalateTimeout]           = useState(60);
  const [cancelTimeout, setCancelTimeout]               = useState(72);
  const [notifyOnException, setNotifyOnException]       = useState(true);

  // ── 测试 & 提交 ──
  const [showTest, setShowTest] = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testNo, setTestNo]     = useState('');
  const [testResult, setTestResult] = useState<{ steps: { l: string; d: string; ok: boolean }[] } | null>(null);
  const [saving, setSaving]     = useState(false);

  const onAllowMultiWh = (v: boolean) => { setAllowMultiWh(v); if (!v) setAllowSkuMultiWh(false); };

  const runTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult({ steps: [
        { l: '条件匹配', d: `${sels.length} 个条件全部满足`, ok: true },
        { l: '仓库排序', d: sortMode === 'distance' ? '距离优先（配送时效）' : sortMode === 'priority' ? '仓库优先级' : '库存深度', ok: true },
        { l: '约束筛选', d: `商品信息 ✓  库存 ✓  危品专仓 ✓`, ok: true },
        { l: '分仓策略', d: `整单同仓 ✓  多仓 ${allowMultiWh ? '✓' : '✗'}`, ok: true },
        { l: '兜底',     d: fallbackAction === 'hold' ? `挂起 ${fallbackTimeout}h 后转人工` : fallbackAction === 'cancel' ? '取消订单' : '通知处理', ok: true },
        { l: '结果',     d: '命中 US-East-EWR → 已生成出库单', ok: true },
      ]});
    }, 1200);
  };

  const handleSave = async (status: '启用' | '停用') => {
    if (!name.trim()) { setNameError('规则名称不能为空'); return; }
    setNameError('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    router.push('/dashboard/rules/fulfillment');
  };

  // ─── 共用样式常量 ──────────────────────────────────────────────────────────
  const ROW  = 'flex items-center gap-3 px-5 py-3 text-[13px]';
  const LBL  = 'w-[88px] shrink-0 text-[12px] font-medium text-[var(--foreground)]';
  const HINT = 'text-[11px] text-[var(--muted)]';
  const SEL  = 'rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors';
  const NUM  = 'w-[52px] rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-center text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors';
  const SECTION_TITLE = (title: string, hint?: string) => (
    <div className="px-5 py-2.5 bg-[var(--surface-subtle)] border-y border-[var(--border-subtle)]">
      <span className="text-[12px] font-semibold text-[var(--foreground)]">{title}</span>
      {hint && <span className="ml-2 text-[11px] text-[var(--muted)]">{hint}</span>}
    </div>
  );

  // ─── 策略渲染 ─────────────────────────────────────────────────────────────

  const renderReviewStrategy = () => {
    const reviewActions: ActionCardDef[] = [
      { value: 'manual_review', label: '转入人工审核', desc: '订单进入审核队列，等待审核人员判断是否放行', activeClass: 'border-blue-300 bg-blue-50' },
      { value: 'auto',          label: '系统自动处理', desc: '系统自动评估触发条件，全部通过则放行，否则按下方失败策略处理', activeClass: 'border-green-300 bg-green-50' },
      { value: 'hold',          label: '挂起等待',     desc: '暂停订单处理，等待人工干预或问题自动解决', activeClass: 'border-amber-300 bg-amber-50' },
      { value: 'reject',        label: '直接拒绝',     desc: '立即取消订单，不可逆操作，适合黑名单命中等明确场景', activeClass: 'border-red-300 bg-red-50' },
    ];
    return (
      <>
        <ActionCards actions={reviewActions} value={reviewAction} onChange={setReviewAction}>
          {(v) => {
            if (v === 'manual_review') return (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={cn(HINT, 'w-14 shrink-0')}>指派给</span>
                  <select value={reviewNotifyRole} onChange={e => setReviewNotifyRole(e.target.value)} className={cn(SEL, 'py-1')}>
                    {['运营', '审核专员', '风控团队', '客服'].map(r => <option key={r}>{r}</option>)}
                  </select>
                  <span className={HINT}>人工审核时分配到此队列</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(HINT, 'w-14 shrink-0')}>超时处理</span>
                  <span className={HINT}>超过</span>
                  <input type="number" min={1} max={168} value={reviewTimeoutHours} onChange={e => setReviewTimeoutHours(Number(e.target.value))} className={cn(NUM, 'w-12 mx-0.5')} />
                  <span className={HINT}>小时，自动</span>
                  <select value={reviewTimeoutAction} onChange={e => setReviewTimeoutAction(e.target.value as typeof reviewTimeoutAction)} className={cn(SEL, 'py-1')}>
                    <option value="auto_pass">放行</option>
                    <option value="auto_reject">拒绝</option>
                    <option value="escalate">升级处理</option>
                  </select>
                </div>
              </div>
            );
            if (v === 'auto') return (
              <div>
                <div className={cn(HINT, 'mb-2')}>条件未通过时</div>
                <div className="flex items-center gap-4">
                  {(['manual_review', 'hold', 'reject'] as const).map((a, i) => (
                    <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="reviewFailAction" checked={reviewFailAction === a} onChange={() => setReviewFailAction(a)} className="size-3 accent-[var(--primary)]" />
                      <span className="text-[11px]">{['转人工审核', '挂起等待', '直接拒绝'][i]}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
            if (v === 'hold') return (
              <div className="flex items-center gap-2">
                <span className={HINT}>超过</span>
                <input type="number" min={1} max={720} value={reviewHoldTimeout} onChange={e => setReviewHoldTimeout(Number(e.target.value))} className={cn(NUM, 'w-12 mx-0.5')} />
                <span className={HINT}>小时后升级处理</span>
              </div>
            );
            if (v === 'reject') return (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rejectNotifyBuyer} onChange={e => setRejectNotifyBuyer(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
                <span className="text-[11px]">通知买家订单被取消</span>
              </label>
            );
            return null;
          }}
        </ActionCards>

        {SECTION_TITLE('快速拦截', '覆盖上方所选动作，满足条件时立即拦截')}
        <div className="px-5 py-3 space-y-2.5">
          {[
            { c: fastBlockHighRisk,  s: setFastBlockHighRisk,  label: '极高风险直接拒绝' },
            { c: fastBlockBlacklist, s: setFastBlockBlacklist, label: '命中黑名单直接拒绝' },
          ].map(({ c, s, label }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={c} onChange={e => s(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
              <span className="text-[12px]">{label}</span>
            </label>
          ))}
        </div>

        {SECTION_TITLE('规则匹配')}
        <div className="px-5 py-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={reviewContinueMatch} onChange={e => setReviewContinueMatch(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
            <span className="text-[12px]">命中后继续匹配其他审单规则</span>
            <span className={cn(HINT, 'ml-1')}>（默认命中后停止）</span>
          </label>
        </div>
      </>
    );
  };

  const renderGenerateStrategy = () => (
    <>
      {SECTION_TITLE('合单策略')}
      <div className={cn(ROW, 'gap-4 flex-wrap')}>
        {(['none', 'same_addr', 'same_buyer'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="merge" checked={mergeMode === m} onChange={() => setMergeMode(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['不合单', '同地址合单', '同买家合单'][i]}</span>
          </label>
        ))}
      </div>

      {SECTION_TITLE('生成时机')}
      <div className={cn(ROW, 'flex-wrap gap-y-2')}>
        <span className={LBL}>触发时机</span>
        {(['immediate', 'batch'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer mr-3">
            <input type="radio" name="timing" checked={genTiming === m} onChange={() => setGenTiming(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['即时生成', '批量生成'][i]}</span>
          </label>
        ))}
        {genTiming === 'batch' && (
          <span className={cn('flex items-center gap-1.5', HINT)}>
            间隔 <input type="number" min={5} max={120} value={batchInterval} onChange={e => setBatchInterval(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 分钟
          </span>
        )}
      </div>

      {SECTION_TITLE('履约单编号')}
      <div className={ROW}>
        <label className="flex items-center gap-2 cursor-pointer text-[12px]">
          <input type="checkbox" checked={autoNumber} onChange={e => setAutoNumber(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          自动编号
        </label>
        {autoNumber && (
          <span className={cn('flex items-center gap-1.5 ml-3', HINT)}>
            前缀
            <input value={numberPrefix} onChange={e => setNumberPrefix(e.target.value)} maxLength={5}
              className="w-[60px] rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-center text-[12px] outline-none focus:border-[var(--primary)] transition-colors mx-1" />
          </span>
        )}
      </div>
    </>
  );

  const renderWarehouseStrategy = () => (
    <>
      {SECTION_TITLE('仓库排序')}
      <div className={cn(ROW, 'flex-wrap gap-y-2')}>
        <span className={LBL}>排序方式</span>
        <select value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)} className={SEL}>
          <option value="distance">距离优先</option>
          <option value="priority">仓库优先级</option>
          <option value="stock">库存深度</option>
        </select>
        {sortMode === 'distance' && <>
          <span className={cn(HINT, 'ml-3')}>距离计算：</span>
          {(['delivery_time', 'straight'] as const).map((m, i) => (
            <label key={m} className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="distCalc" checked={distCalcMode === m} onChange={() => setDistCalcMode(m)} className="size-3.5 accent-[var(--primary)]" />
              <span className="text-[12px]">{['配送时效', '直线距离'][i]}</span>
            </label>
          ))}
        </>}
        {sortMode === 'stock' && <>
          <span className={cn(HINT, 'ml-3')}>维度：</span>
          {(['abs', 'ratio'] as const).map((m, i) => (
            <label key={m} className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="stockDim" checked={stockSortDim === m} onChange={() => setStockSortDim(m)} className="size-3.5 accent-[var(--primary)]" />
              <span className="text-[12px]">{['绝对库存量', '库存满足率'][i]}</span>
            </label>
          ))}
        </>}
      </div>

      {SECTION_TITLE('仓库约束', '不满足约束的仓库被排除候选')}
      <div className="px-5 py-3 space-y-2.5">
        {[
          { c: checkProduct, s: setCheckProduct, label: '校验商品信息', hint: '仓库必须有该 SKU 商品档案', hard: true },
          { c: hazmatOnly,   s: setHazmatOnly,   label: '危险品必须专仓', hint: '含危品只能进有资质仓', hard: true },
          { c: bulkOnly,     s: setBulkOnly,     label: '大件必须大件仓', hint: '大件 SKU 只能进大件仓', hard: true },
          { c: expiryOnly,   s: setExpiryOnly,   label: '效期品必须效期仓', hint: '效期品只能进冷链/效期仓', hard: true },
          { c: noExpiredOut, s: setNoExpiredOut, label: '临期禁止出库', hint: '', hard: true },
        ].map(({ c, s, label, hint, hard }) => (
          <div key={label} className="flex items-center gap-2.5 text-[12px]">
            <input type="checkbox" checked={c} onChange={e => s(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
            <span className="w-[140px]">{label}</span>
            {hard && <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-600">硬约束</span>}
            {hint && <span className={HINT}>{hint}</span>}
            {label === '临期禁止出库' && noExpiredOut && (
              <span className={cn('flex items-center gap-1', HINT)}>
                阈值 <input type="number" min={1} max={90} value={expiryThreshold} onChange={e => setExpiryThreshold(Number(e.target.value))} className={cn(NUM, 'mx-1 w-[40px]')} /> 天
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2.5 text-[12px]">
          <input type="checkbox" checked={checkInv} onChange={e => setCheckInv(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          <span className="w-[140px]">校验库存</span>
          <select value={checkInvHard ? 'hard' : 'soft'} onChange={e => setCheckInvHard(e.target.value === 'hard')} className={cn(SEL, 'py-0.5 text-[11px]')}>
            <option value="hard">硬约束</option><option value="soft">软约束</option>
          </select>
          <span className={HINT}>{checkInvHard ? '无库存直接排除' : '第二轮放宽'}</span>
        </div>
        <div className="flex items-center gap-2.5 text-[12px]">
          <input type="checkbox" checked={noMixBatch} onChange={e => setNoMixBatch(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          <span className="w-[140px]">不允许混批</span>
          <select value={noMixBatchHard ? 'hard' : 'soft'} onChange={e => setNoMixBatchHard(e.target.value === 'hard')} className={cn(SEL, 'py-0.5 text-[11px]')}>
            <option value="hard">硬约束</option><option value="soft">软约束</option>
          </select>
          <span className={HINT}>同商品必须同批次</span>
        </div>
      </div>

      {SECTION_TITLE('分仓策略')}
      <div className="px-5 py-3 space-y-2.5">
        {[
          { c: preferSingleWh,   s: setPreferSingleWh,   label: '优先整单同仓',      hint: '有单仓能满足全部 SKU 时优先', dis: false },
          { c: allowMultiWh,     s: (v: boolean) => onAllowMultiWh(v), label: '允许多仓履约', hint: '不同商品可分到不同仓', dis: false },
          { c: allowSkuMultiWh,  s: setAllowSkuMultiWh,  label: '允许同一商品多仓',  hint: '同 SKU 大数量可拆给多仓', dis: !allowMultiWh },
          { c: allowPartialShip, s: setAllowPartialShip, label: '允许部分下发',      hint: '能发的先发，其余挂起', dis: false },
        ].map(({ c, s, label, hint, dis }) => (
          <label key={label} className={cn('flex items-center gap-2.5 cursor-pointer text-[12px]', dis && 'opacity-40 pointer-events-none')}>
            <input type="checkbox" checked={c} onChange={e => s(e.target.checked)} disabled={dis} className="size-3.5 rounded-sm accent-[var(--primary)]" />
            <span className="w-[160px]">{label}</span>
            <span className={HINT}>{hint}</span>
          </label>
        ))}
      </div>

      {SECTION_TITLE('出库拆分', '分仓成功后如何生成出库单')}
      <div className="px-5 py-3 space-y-2.5">
        {[
          { c: oneSkuPerOrder, s: setOneSkuPerOrder, label: '一单一商品',    hint: '每 SKU 独立出库单' },
          { c: sampleNoSolo,   s: setSampleNoSolo,   label: '样品不能单独出库', hint: '样品必须跟随主品' },
          { c: hazmatSolo,     s: setHazmatSolo,     label: '危险品独立出库', hint: '危品不和普通品同单' },
          { c: bulkSolo,       s: setBulkSolo,       label: '大件独立出库',  hint: '大件单独一张出库单' },
        ].map(({ c, s, label, hint }) => (
          <label key={label} className="flex items-center gap-2.5 cursor-pointer text-[12px]">
            <input type="checkbox" checked={c} onChange={e => s(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
            <span className="w-[160px]">{label}</span>
            <span className={HINT}>{hint}</span>
          </label>
        ))}
        <div className="flex items-center gap-2 text-[12px] pt-1">
          <span className="text-[var(--foreground)]">最大出库单数</span>
          <input type="number" min={1} max={20} value={maxOutboundOrders} onChange={e => setMaxOutboundOrders(Number(e.target.value))} className={cn(NUM, 'mx-1')} />
          <span className={HINT}>超出时合并出库</span>
        </div>
      </div>

      {SECTION_TITLE('兜底策略', '两轮约束均无合法方案时')}
      {(() => {
        const fallbackActions: ActionCardDef[] = [
          { value: 'hold',           label: '挂起等待',   desc: '暂停处理，等待库存补充或人工干预',         activeClass: 'border-amber-300 bg-amber-50' },
          { value: 'notify',         label: '通知人工',   desc: '立即通知指定角色，由人工决定后续操作',     activeClass: 'border-blue-300 bg-blue-50' },
          { value: 'force_priority', label: '按优先级强推', desc: '忽略库存约束，按仓库优先级强制分配',      activeClass: 'border-purple-300 bg-purple-50' },
          { value: 'cancel',         label: '取消订单',   desc: '关闭订单并通知买家，此操作不可逆',         activeClass: 'border-red-300 bg-red-50' },
        ];
        return (
          <ActionCards actions={fallbackActions} value={fallbackAction} onChange={setFallbackAction}>
            {(v) => {
              if (v === 'hold') return (
                <span className={cn('flex items-center gap-1.5', HINT)}>
                  超过 <input type="number" min={1} max={720} value={fallbackTimeout} onChange={e => setFallbackTimeout(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 小时后转人工
                </span>
              );
              if (v === 'notify') return (
                <div className="flex items-center gap-2">
                  <span className={HINT}>通知</span>
                  <select value={fallbackNotifyRole} onChange={e => setFallbackNotifyRole(e.target.value)} className={cn(SEL, 'py-1')}>
                    {['运营', '仓库主管', '采购'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              );
              return null;
            }}
          </ActionCards>
        );
      })()}
    </>
  );

  const renderCarrierStrategy = () => (
    <>
      {SECTION_TITLE('承运商选择')}
      <div className={ROW}>
        <span className={LBL}>选择模式</span>
        <select value={carrierSelectMode} onChange={e => setCarrierSelectMode(e.target.value as typeof carrierSelectMode)} className={SEL}>
          <option value="smart">智能推荐</option>
          <option value="cheapest">最低运费</option>
          <option value="fastest">最快时效</option>
          <option value="priority">优先级顺序</option>
        </select>
      </div>
      <div className={cn(ROW, 'gap-4 flex-wrap')}>
        <span className={LBL}>计重方式</span>
        {(['actual', 'volume', 'max'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="weight" checked={weightCalc === m} onChange={() => setWeightCalc(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['实际重量', '体积重量', '取大值'][i]}</span>
          </label>
        ))}
      </div>

      {SECTION_TITLE('降级与保险')}
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={carrierFallback} onChange={e => setCarrierFallback(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          允许承运商降级
        </label>
        {carrierFallback && (
          <span className={cn('flex items-center gap-1.5 ml-3', HINT)}>
            最大重试 <input type="number" min={1} max={10} value={maxCarrierRetry} onChange={e => setMaxCarrierRetry(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 次
          </span>
        )}
      </div>
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={insure} onChange={e => setInsure(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          自动投保
        </label>
        {insure && (
          <span className={cn('flex items-center gap-1.5 ml-3', HINT)}>
            金额超过 <input type="number" min={0} value={insureThreshold} onChange={e => setInsureThreshold(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> USD 时投保
          </span>
        )}
      </div>
    </>
  );

  const renderPushStrategy = () => (
    <>
      {SECTION_TITLE('推送模式')}
      <div className={cn(ROW, 'flex-wrap gap-y-2')}>
        <span className={LBL}>推送方式</span>
        {(['realtime', 'batch', 'schedule'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer mr-3">
            <input type="radio" name="pushMode" checked={pushMode === m} onChange={() => setPushMode(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['实时推送', '批量推送', '定时推送'][i]}</span>
          </label>
        ))}
        {pushMode === 'batch' && (
          <span className={cn('flex items-center gap-1.5', HINT)}>
            每批 <input type="number" min={10} max={500} value={pushBatchSize} onChange={e => setPushBatchSize(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 单
          </span>
        )}
      </div>

      {SECTION_TITLE('数据格式')}
      <div className={cn(ROW, 'gap-4')}>
        {(['standard', 'custom'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="format" checked={pushFormat === m} onChange={() => setPushFormat(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['标准格式', '自定义映射'][i]}</span>
          </label>
        ))}
      </div>

      {SECTION_TITLE('失败重试')}
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={pushRetry} onChange={e => setPushRetry(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          自动重试
        </label>
        {pushRetry && (
          <span className={cn('flex items-center gap-1.5 ml-3', HINT)}>
            最大 <input type="number" min={1} max={10} value={pushRetryMax} onChange={e => setPushRetryMax(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 次，
            间隔 <input type="number" min={1} max={60} value={pushRetryInterval} onChange={e => setPushRetryInterval(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 分钟
          </span>
        )}
      </div>
    </>
  );

  const renderShipStrategy = () => (
    <>
      {SECTION_TITLE('发货确认')}
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={shipAutoConfirm} onChange={e => setShipAutoConfirm(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          自动确认发货
        </label>
      </div>
      <div className={cn(ROW, 'flex-wrap gap-y-2')}>
        <span className={LBL}>拆单标发</span>
        {(['all_shipped', 'any_shipped'] as const).map((m, i) => (
          <label key={m} className="flex items-center gap-1.5 cursor-pointer mr-3">
            <input type="radio" name="splitConfirm" checked={shipSplitConfirm === m} onChange={() => setShipSplitConfirm(m)} className="size-3.5 accent-[var(--primary)]" />
            <span className="text-[12px]">{['全部包裹发出后标发', '任一包裹发出即标发'][i]}</span>
          </label>
        ))}
      </div>

      {SECTION_TITLE('通知与物流跟踪')}
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={shipNotify} onChange={e => setShipNotify(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          发货后通知买家
        </label>
      </div>
      <div className={ROW}>
        <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
          <input type="checkbox" checked={trackSync} onChange={e => setTrackSync(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
          自动同步物流单号
        </label>
        {trackSync && (
          <span className={cn('flex items-center gap-1.5 ml-3', HINT)}>
            间隔 <input type="number" min={10} max={360} value={trackSyncInterval} onChange={e => setTrackSyncInterval(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 分钟
          </span>
        )}
      </div>
    </>
  );

  const renderExceptionStrategy = () => {
    const exceptionActions: ActionCardDef[] = [
      { value: 'hold',     label: '挂起等待', desc: '暂停订单处理，等待人工介入或问题自动恢复', activeClass: 'border-amber-300 bg-amber-50' },
      { value: 'retry',    label: '自动重试', desc: '按配置次数和间隔自动重试，超出后升级',     activeClass: 'border-blue-300 bg-blue-50' },
      { value: 'escalate', label: '升级处理', desc: '超时后自动升级通知上级或更高优先级处理',   activeClass: 'border-purple-300 bg-purple-50' },
      { value: 'cancel',   label: '自动取消', desc: '超时未处理后自动取消订单，不可逆操作',     activeClass: 'border-red-300 bg-red-50' },
    ];
    return (
      <>
        <ActionCards actions={exceptionActions} value={exceptionAction} onChange={setExceptionAction}>
          {(v) => {
            if (v === 'hold') return (
              <span className={cn('flex items-center gap-1.5', HINT)}>
                超过 <input type="number" min={1} max={720} value={exceptionHoldTimeout} onChange={e => setExceptionHoldTimeout(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 小时后升级处理
              </span>
            );
            if (v === 'retry') return (
              <span className={cn('flex items-center gap-1.5', HINT)}>
                最多重试 <input type="number" min={1} max={10} value={exceptionRetryMax} onChange={e => setExceptionRetryMax(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 次，超出后挂起
              </span>
            );
            if (v === 'escalate') return (
              <span className={cn('flex items-center gap-1.5', HINT)}>
                超过 <input type="number" min={5} max={1440} value={escalateTimeout} onChange={e => setEscalateTimeout(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 分钟后自动升级
              </span>
            );
            if (v === 'cancel') return (
              <span className={cn('flex items-center gap-1.5', HINT)}>
                超过 <input type="number" min={1} max={720} value={cancelTimeout} onChange={e => setCancelTimeout(Number(e.target.value))} className={cn(NUM, 'mx-1')} /> 小时后取消订单
              </span>
            );
            return null;
          }}
        </ActionCards>

        {SECTION_TITLE('异常通知')}
        <div className="px-5 py-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-[12px]">
            <input type="checkbox" checked={notifyOnException} onChange={e => setNotifyOnException(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
            异常时通知相关人员
          </label>
        </div>
      </>
    );
  };

  const renderStrategy = () => {
    switch (stage) {
      case 'review':    return renderReviewStrategy();
      case 'generate':  return renderGenerateStrategy();
      case 'warehouse': return renderWarehouseStrategy();
      case 'carrier':   return renderCarrierStrategy();
      case 'push':      return renderPushStrategy();
      case 'ship':      return renderShipStrategy();
      case 'exception': return renderExceptionStrategy();
    }
  };

  const stageInfo = stageOptions.find(o => o.value === stage)!;

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[860px] py-6 pb-10">

      {/* ─── Page header ─── */}
      <div className="mb-6">
        <Link href="/dashboard/rules/fulfillment"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
          <ArrowLeft className="size-3.5" />返回履约规则
        </Link>
        <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">新建履约规则</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">配置触发条件与执行动作，规则在对应阶段按优先级顺序执行</p>
      </div>

      {/* ─── Section 1: 基本信息 ─── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">基本信息</span>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">
              规则名称 <span className="text-red-500">*</span>
            </label>
            <input value={name}
              onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
              placeholder="例：Amazon 高风险订单人工审核"
              maxLength={60}
              className={cn(
                'w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] transition-colors',
                nameError ? 'border-red-400 focus:border-red-500' : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]'
              )} />
            {nameError && <p className="mt-1 text-[11px] text-red-500">{nameError}</p>}
            <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{name.length}/60</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">
                规则阶段 <span className="text-red-500">*</span>
              </label>
              <select value={stage} onChange={e => setStage(e.target.value as RuleStage)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]">
                {stageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">规则在履约链路的哪个阶段生效</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">优先级</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={String(n)}>{n}{n === 1 ? ' (最高)' : n === 10 ? ' (最低)' : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">同阶段规则按此顺序依次执行</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--foreground)]">启用状态</label>
              <div className="space-y-2">
                {[{ value: '启用' as const, label: '保存后立即启用' }, { value: '停用' as const, label: '保存为草稿' }].map(opt => (
                  <label key={opt.value} className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-colors',
                    ruleStatus === opt.value ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'
                  )}>
                    <input type="radio" name="ruleStatus" value={opt.value} checked={ruleStatus === opt.value} onChange={() => setRuleStatus(opt.value)} className="size-3.5 accent-[var(--primary)]" />
                    <span className="text-[12px] font-medium text-[var(--foreground)]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 2: 触发条件（去掉 overflow-hidden，防止条件弹窗被截断）─── */}
      <div className="mb-4 rounded-xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between rounded-t-xl border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
          <div>
            <span className="text-[13px] font-semibold text-[var(--foreground)]">IF 触发条件</span>
            <span className="ml-2 text-[11px] text-[var(--muted)]">订单满足以下所有条件时，此规则生效</span>
          </div>
          {sels.length > 1 && (
            <button type="button" onClick={() => setCondLogic(condLogic === 'and' ? 'or' : 'and')}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors">
              {condLogic === 'and' ? '全部满足 (AND)' : '任一满足 (OR)'}
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-2">
          {sels.length === 0 && (
            <div className="rounded-lg border border-dashed border-[var(--border)] py-6 text-center text-[12px] text-[var(--muted)]">
              暂未添加条件 — 不添加则对所有订单生效
            </div>
          )}

          {sels.map((sel, i) => {
            const def = cDefs.find(d => d.id === sel.id);
            if (!def) return null;
            const operators = getOperators(def.type);
            return (
              <div key={sel.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
                <span className={cn(
                  'w-10 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-mono font-bold',
                  i === 0 ? 'bg-slate-200 text-slate-500' :
                  condLogic === 'and' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                )}>
                  {i === 0 ? 'IF' : condLogic === 'and' ? 'AND' : 'OR'}
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--foreground)]">
                  {def.label}
                </span>
                <select value={sel.op} onChange={e => setCondOp(sel.id, e.target.value)}
                  className="w-[90px] shrink-0 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[12px] outline-none focus:border-[var(--primary)] transition-colors">
                  {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {def.type === 'tags' && def.opts ? (
                  <select value={sel.val} onChange={e => setCondVal(sel.id, e.target.value)}
                    className="flex-1 min-w-[130px] rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[12px] outline-none focus:border-[var(--primary)] transition-colors">
                    {def.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={sel.val} onChange={e => setCondVal(sel.id, e.target.value)}
                    placeholder={def.type === 'number' ? '输入数值…' : '输入值…'}
                    type={def.type === 'number' ? 'number' : 'text'}
                    className="flex-1 min-w-[130px] rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[12px] outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--muted)]" />
                )}
                <button type="button" onClick={() => removeCondition(sel.id)} aria-label="删除此条件"
                  className="ml-auto shrink-0 rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-500">
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}

          {/* 添加条件 — pickerRef 包裹整个区域，点击外部关闭 */}
          <div className="relative mt-1" ref={pickerRef}>
            <button type="button" onClick={() => setShowCondPicker(!showCondPicker)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)]">
              <Plus className="size-3.5" />添加条件
            </button>

            {showCondPicker && (
              <div className="absolute left-0 top-full z-50 mt-1 w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-2xl">
                <div className="border-b border-[var(--border-subtle)] p-2.5">
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
                    <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                      placeholder="搜索条件字段…"
                      className="flex-1 bg-transparent text-[12px] outline-none" />
                    {q && <button type="button" onClick={() => setQ('')}><X className="size-3 text-[var(--muted)]" /></button>}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                  {sortedCategories.map(cat => {
                    const items = filtered.filter(d => d.cat === cat.key).filter(d => !sels.some(s => s.id === d.id));
                    if (!items.length) return null;
                    const isRelevant = cat.stages.includes(stage);
                    return (
                      <div key={cat.key}>
                        <div className={cn(
                          'sticky top-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider',
                          isRelevant ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--surface-subtle)] text-[var(--muted)]'
                        )}>
                          {cat.label}
                          {isRelevant && <span className="rounded bg-[var(--primary)] px-1 py-0.5 text-[9px] normal-case tracking-normal text-white">推荐</span>}
                        </div>
                        {items.map(d => (
                          <button key={d.id} type="button" onClick={() => addCondition(d.id)}
                            className="w-full px-3 py-2 text-left text-[12px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]">
                            {d.label}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  {filtered.filter(d => !sels.some(s => s.id === d.id)).length === 0 && (
                    <div className="px-3 py-6 text-center text-[12px] text-[var(--muted)]">所有条件已添加</div>
                  )}
                </div>
                <div className="border-t border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--muted)]">
                  Esc 关闭
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Arrow divider ─── */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
          ↓ 条件满足时
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* ─── Section 3: 执行动作 ─── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">THEN</span>
          <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', stageInfo.color)}>
            {stageInfo.label}
          </span>
          <span className="text-[12px] text-[var(--foreground)]">{stageInfo.then}</span>
        </div>
        {renderStrategy()}
      </div>

      {/* ─── Section 4: 规则测试（可折叠）─── */}
      <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <button type="button" onClick={() => setShowTest(!showTest)}
          className="flex w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]">
          <div className="flex items-center gap-2">
            <Play className="size-3.5 text-[var(--primary)]" />
            <span className="text-[12px] font-semibold text-[var(--foreground)]">规则测试</span>
            <span className="text-[11px] text-[var(--muted)]">验证规则是否按预期执行</span>
          </div>
          <ChevronDown className={cn('size-4 text-[var(--muted)] transition-transform duration-200', showTest && 'rotate-180')} />
        </button>
        {showTest && (
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center gap-3">
              <input value={testNo} onChange={e => setTestNo(e.target.value)} placeholder="输入订单号，留空使用模拟数据"
                className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[12px] outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--focus-ring)]" />
              <button type="button" onClick={runTest} disabled={testing}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[12px] font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {testing ? '执行中…' : '运行测试'}
              </button>
            </div>
            {testResult && (
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                {testResult.steps.map((s, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-[12px]',
                    i > 0 && 'border-t border-[var(--border-subtle)]',
                    !s.ok && 'bg-red-50'
                  )}>
                    {s.ok ? <CheckCircle2 className="size-3.5 shrink-0 text-green-500" /> : <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
                    <span className="w-16 shrink-0 text-[var(--muted)]">{s.l}</span>
                    <span className="text-[var(--foreground)]">{s.d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-5 py-4">
        <Link href="/dashboard/rules/fulfillment"
          className="flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
          <ArrowLeft className="size-3.5" />取消，返回列表
        </Link>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleSave('停用')} disabled={saving}
            className="rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-50">
            保存为草稿
          </button>
          <button type="button" onClick={() => handleSave('启用')} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? '保存中…' : '启用并保存'}
          </button>
        </div>
      </div>

    </div>
  );
}
