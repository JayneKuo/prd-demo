'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Trash2, Search, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleStage = 'review' | 'generate' | 'warehouse' | 'carrier' | 'push' | 'ship' | 'exception';
const stageOptions: { value: RuleStage; label: string }[] = [
  { value: 'review', label: '审单' }, { value: 'generate', label: '生成履约单' },
  { value: 'warehouse', label: '寻仓' }, { value: 'carrier', label: '承运商' },
  { value: 'push', label: '推单到仓' }, { value: 'ship', label: '标发' },
  { value: 'exception', label: '异常处理' },
];

// ─── 条件定义 ───
const categories = [
  { key: 'base', label: '基础信息' },
  { key: 'logistics', label: '物流信息' },
  { key: 'order', label: '订单信息' },
  { key: 'product', label: '货品信息' },
  { key: 'amazon', label: 'amazon' },
  { key: 'tiktok', label: 'tiktok' },
  { key: 'shopify', label: 'shopify' },
  { key: 'ebay', label: 'ebay' },
  { key: 'wish', label: 'Wish' },
  { key: 'lazada', label: 'Lazada' },
];

type CDef = { id: string; label: string; cat: string; type: 'tags' | 'text'; opts?: string[] };
const cDefs: CDef[] = [
// 基础信息
  { id: 'shop', label: '订单店铺', cat: 'base', type: 'tags', opts: ['US Store', 'SG Store', 'UK Store', 'DE Store'] },
  { id: 'platform', label: '订单平台', cat: 'base', type: 'tags', opts: ['Amazon', 'Shopify', 'TikTok Shop', 'Walmart', 'eBay', 'Wish', 'Lazada'] },
  { id: 'site', label: '订单站点', cat: 'base', type: 'tags', opts: ['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'SG'] },
  // 物流信息
  { id: 'country', label: '收货国家', cat: 'logistics', type: 'tags', opts: ['US', 'UK', 'DE', 'FR', 'JP', 'AU', 'CA', 'SG'] },
  { id: 'state', label: '收货省/州', cat: 'logistics', type: 'text' },
  { id: 'city', label: '收货城市', cat: 'logistics', type: 'text' },
  { id: 'zipcode', label: '收货邮编', cat: 'logistics', type: 'text' },
  { id: 'addr_length', label: '收货地址', cat: 'logistics', type: 'text' },
  // 订单信息
  { id: 'order_time', label: '下单时间', cat: 'order', type: 'text' },
  { id: 'pay_time', label: '付款时间', cat: 'order', type: 'text' },
  { id: 'ship_timeout', label: '发货超时时间', cat: 'order', type: 'text' },
  { id: 'amount_range', label: '订单金额范围', cat: 'order', type: 'text' },
  { id: 'weight_kg', label: '订单重量(kg)', cat: 'order', type: 'text' },
  // 货品信息
  { id: 'platform_sku', label: '平台SKU', cat: 'product', type: 'text' },
  { id: 'warehouse_sku', label: '仓库SKU', cat: 'product', type: 'text' },
  { id: 'platform_qty', label: '订单平台货品数量', cat: 'product', type: 'text' },
  { id: 'total_qty', label: '订单货品总数量', cat: 'product', type: 'text' },
  { id: 'product_size', label: '产品尺寸', cat: 'product', type: 'text' },
  // amazon
  { id: 'prime', label: 'Prime Order', cat: 'amazon', type: 'tags', opts: ['是', '否'] },
  { id: 'amazon_custom', label: '定制订单', cat: 'amazon', type: 'tags', opts: ['是', '否'] },
  // tiktok
  { id: 'tt_delivery', label: '交付类型', cat: 'tiktok', type: 'tags', opts: ['平台配送', '卖家自发'] },
  { id: 'tt_ship', label: '交货方式', cat: 'tiktok', type: 'tags', opts: ['标准', '加急'] },
  { id: 'tt_warehouse', label: 'Tiktok Warehouse', cat: 'tiktok', type: 'tags', opts: ['是', '否'] },
  // shopify
  { id: 'shopify_cod', label: 'COD', cat: 'shopify', type: 'tags', opts: ['是', '否'] },
  // ebay
  { id: 'ebay_format', label: 'eBay订单格式', cat: 'ebay', type: 'tags', opts: ['拍卖', '一口价', '议价'] },
  { id: 'ebay_edelivery', label: 'eDelivery订单', cat: 'ebay', type: 'tags', opts: ['是', '否'] },
  { id: 'ebay_listing', label: 'Listing类型', cat: 'ebay', type: 'tags', opts: ['单品', '多属性'] },
  // wish
  { id: 'wish_express', label: 'Wish Express订单', cat: 'wish', type: 'tags', opts: ['是', '否'] },
  { id: 'wish_a_plus', label: 'A+物流订单', cat: 'wish', type: 'tags', opts: ['是', '否'] },
  { id: 'wish_fbw', label: 'FBW订单', cat: 'wish', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_cod', label: 'COD确认已付款', cat: 'lazada', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_cod', label: 'COD确认已付款', cat: 'lazada', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_ninka', label: 'Ninka标', cat: 'lazada', type: 'tags', opts: ['是', '否'] },
  { id: 'lazada_fee', label: 'COD运费', cat: 'lazada', type: 'text' },
];

const warehouses = ['US-West-LAX', 'US-East-EWR', 'US-Central-DFW', 'US-West-SEA', 'SG-Central', 'UK-London'];

type Sel = { id: string; val: string; open: boolean };

export default function NewFulfillmentRulePage() {
  const [name, setName] = useState('');
  const [stage, setStage] = useState<RuleStage>('warehouse');
  const [priority, setPriority] = useState('1');
  const [q, setQ] = useState('');
  const [sels, setSels] = useState<Sel[]>([]);

  // ─── warehouse strategy (寻仓) ───
  // 1. 仓库排序
  const [sortMode, setSortMode] = useState<'distance' | 'priority' | 'stock'>('distance');
  const [distCalcMode, setDistCalcMode] = useState<'delivery_time' | 'straight'>('delivery_time');
  const [stockSortDimension, setStockSortDimension] = useState<'abs' | 'ratio'>('abs');
  // 2. 仓库约束
  const [checkProduct, setCheckProduct] = useState(true);
  const [checkProductHard, setCheckProductHard] = useState(true);
  const [checkInv, setCheckInv] = useState(true);
  const [checkInvHard, setCheckInvHard] = useState(true);
  const [hazmatOnly, setHazmatOnly] = useState(true);
  const [bulkOnly, setBulkOnly] = useState(true);
  const [expiryOnly, setExpiryOnly] = useState(false);
  const [expiryThreshold, setExpiryThreshold] = useState(7);
  const [noExpiredOut, setNoExpiredOut] = useState(false);
  const [noMixBatch, setNoMixBatch] = useState(false);
  const [noMixBatchHard, setNoMixBatchHard] = useState(false);
  // 3. 分仓策略
  const [preferSingleWh, setPreferSingleWh] = useState(true);
  const [allowMultiWh, setAllowMultiWh] = useState(false);
  const [allowSkuMultiWh, setAllowSkuMultiWh] = useState(false);
  const [allowPartialShip, setAllowPartialShip] = useState(false);
  // 4. 出库拆分
  const [oneSkuPerOrder, setOneSkuPerOrder] = useState(true);
  const [sampleNoSolo, setSampleNoSolo] = useState(true);
  const [hazmatSolo, setHazmatSolo] = useState(true);
  const [bulkSolo, setBulkSolo] = useState(true);
  const [maxOutboundOrders, setMaxOutboundOrders] = useState(5);
  // 5. 兜底策略
  const [fallbackAction, setFallbackAction] = useState<'hold' | 'notify' | 'force_priority' | 'cancel'>('hold');
  const [fallbackTimeout, setFallbackTimeout] = useState(48);
  const [fallbackNotifyRole, setFallbackNotifyRole] = useState('运营');

  // ─── review strategy (审单) ───
  const [reviewMode, setReviewMode] = useState<'auto' | 'manual' | 'conditional'>('auto');
  const [autoHoldRisk, setAutoHoldRisk] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState('high');
  const [addressVerify, setAddressVerify] = useState(true);
  const [dupCheck, setDupCheck] = useState(true);
  const [holdTimeout, setHoldTimeout] = useState(24);

  // ─── generate strategy (生成履约单) ───
  const [mergeMode, setMergeMode] = useState<'none' | 'same_addr' | 'same_buyer'>('none');
  const [genTiming, setGenTiming] = useState<'immediate' | 'batch'>('immediate');
  const [batchInterval, setBatchInterval] = useState(30);
  const [autoNumber, setAutoNumber] = useState(true);
  const [numberPrefix, setNumberPrefix] = useState('FF');

  // ─── carrier strategy (承运商) ───
  const [carrierSelectMode, setCarrierSelectMode] = useState<'cheapest' | 'fastest' | 'priority' | 'smart'>('smart');
  const [carrierFallback, setCarrierFallback] = useState(true);
  const [maxCarrierRetry, setMaxCarrierRetry] = useState(3);
  const [weightCalc, setWeightCalc] = useState<'actual' | 'volume' | 'max'>('max');
  const [insure, setInsure] = useState(false);
  const [insureThreshold, setInsureThreshold] = useState(100);

  // ─── push strategy (推单到仓) ───
  const [pushMode, setPushMode] = useState<'realtime' | 'batch' | 'schedule'>('realtime');
  const [pushBatchSize, setPushBatchSize] = useState(50);
  const [pushRetry, setPushRetry] = useState(true);
  const [pushRetryMax, setPushRetryMax] = useState(3);
  const [pushRetryInterval, setPushRetryInterval] = useState(5);
  const [pushFormat, setPushFormat] = useState<'standard' | 'custom'>('standard');

  // ─── ship strategy (标发) ───
  const [shipAutoConfirm, setShipAutoConfirm] = useState(true);
  const [shipNotify, setShipNotify] = useState(true);
  const [trackSync, setTrackSync] = useState(true);
  const [trackSyncInterval, setTrackSyncInterval] = useState(60);
  const [shipSplitConfirm, setShipSplitConfirm] = useState<'all_shipped' | 'any_shipped'>('all_shipped');

  // ─── exception strategy (异常处理) ───
  const [exceptionAction, setExceptionAction] = useState<'hold' | 'retry' | 'escalate' | 'cancel'>('hold');
  const [exceptionRetryMax, setExceptionRetryMax] = useState(3);
  const [escalateTimeout, setEscalateTimeout] = useState(60);
  const [autoCancel, setAutoCancel] = useState(false);
  const [autoCancelTimeout, setAutoCancelTimeout] = useState(72);
  const [notifyOnException, setNotifyOnException] = useState(true);

  // condition logic
  const [condLogic, setCondLogic] = useState<'and' | 'or'>('and');

  // test
  const [testing, setTesting] = useState(false);
  const [testNo, setTestNo] = useState('');
  const [result, setResult] = useState<{ steps: { l: string; d: string; ok: boolean }[] } | null>(null);

  const toggle = (id: string) => {
    if (sels.find(s => s.id === id)) setSels(sels.filter(s => s.id !== id));
    else setSels([...sels, { id, val: '', open: true }]);
  };
  const setVal = (id: string, v: string) => setSels(sels.map(s => s.id === id ? { ...s, val: v } : s));

  const filtered = q ? cDefs.filter(d => d.label.includes(q)) : cDefs;

  // 浜掓枼
  const onAllowMultiWh = (v: boolean) => { setAllowMultiWh(v); if (!v) setAllowSkuMultiWh(false); };

  const runTest = () => {
    setTesting(true); setResult(null);
    setTimeout(() => {
      setTesting(false);
      setResult({ steps: [
        { l: '条件匹配', d: `${sels.length}个条件全部满足`, ok: true },
        { l: '仓库排序', d: `${sortMode === 'distance' ? `距离(${distCalcMode === 'straight' ? '直线' : '时效'})` : sortMode === 'priority' ? '优先级' : `库存(${stockSortDimension === 'abs' ? '绝对量' : '满足率'})` }`, ok: true },
        { l: '第一轮', d: `全约束: 商品信息${checkProduct ? '✓' : '✗'} 库存${checkInv ? '✓' : '✗'} 危品专仓${hazmatOnly ? '✓' : '✗'} 大件仓${bulkOnly ? '✓' : '✗'}`, ok: true },
        { l: '分仓策略', d: `整单同仓${preferSingleWh ? '✓' : '✗'} 多仓${allowMultiWh ? '✓' : '✗'} 同商品多仓${allowSkuMultiWh ? '✓' : '✗'} 部分下发${allowPartialShip ? '✓' : '✗'}`, ok: true },
        { l: '出库拆分', d: `一单一品${oneSkuPerOrder ? '✓' : '✗'} 样品跟随${sampleNoSolo ? '✓' : '✗'} 危品独立${hazmatSolo ? '✓' : '✗'} 大件独立${bulkSolo ? '✓' : '✗'}`, ok: true },
        { l: '兜底', d: fallbackAction === 'hold' ? `挂起${fallbackTimeout}h后转人工` : fallbackAction === 'notify' ? `通知${fallbackNotifyRole}` : fallbackAction === 'force_priority' ? '按优先级强推' : '取消订单', ok: true },
        { l: '结果', d: '第一轮命中 US-East-EWR → 生成出库单', ok: true },
      ]});
    }, 1200);
  };

  // rule status
  const [ruleStatus, setRuleStatus] = useState('鍚敤');

  // ─── Render strategy based on rule type ───
  const renderStrategy = () => {
    switch (stage) {
      case 'review': return renderReviewStrategy();
      case 'generate': return renderGenerateStrategy();
      case 'warehouse': return renderWarehouseStrategy();
      case 'carrier': return renderCarrierStrategy();
      case 'push': return renderPushStrategy();
      case 'ship': return renderShipStrategy();
      case 'exception': return renderExceptionStrategy();
    }
  };

  const renderReviewStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">审单模式</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="reviewMode" checked={reviewMode === 'auto'} onChange={() => setReviewMode('auto')} className="size-3.5" />自动审核</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="reviewMode" checked={reviewMode === 'manual'} onChange={() => setReviewMode('manual')} className="size-3.5" />人工审核</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="reviewMode" checked={reviewMode === 'conditional'} onChange={() => setReviewMode('conditional')} className="size-3.5" />条件审核</label>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">风险拦截</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={autoHoldRisk} onChange={e => setAutoHoldRisk(e.target.checked)} className="size-3.5 rounded-sm" />自动拦截高风险订单</label>
        </div>
        {autoHoldRisk && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">风险等级:</span>
            <select value={riskThreshold} onChange={e => setRiskThreshold(e.target.value)} className="border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-transparent outline-none focus:border-[var(--primary)]">
              <option value="high">高风险</option>
              <option value="medium">中风险及以上</option>
              <option value="low">低风险及以上</option>
            </select>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">校验项</span>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={addressVerify} onChange={e => setAddressVerify(e.target.checked)} className="size-3.5 rounded-sm" />地址校验</label>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={dupCheck} onChange={e => setDupCheck(e.target.checked)} className="size-3.5 rounded-sm" />重复订单检查</label>
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">挂起超时</span>
        <input type="number" min={1} max={168} value={holdTimeout} onChange={e => setHoldTimeout(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
        <span className="text-[12px] text-[#999]">小时后自动释放</span>
      </div>
    </>
  );

  const renderGenerateStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">合单策略</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="merge" checked={mergeMode === 'none'} onChange={() => setMergeMode('none')} className="size-3.5" />不合单</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="merge" checked={mergeMode === 'same_addr'} onChange={() => setMergeMode('same_addr')} className="size-3.5" />同地址合单</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="merge" checked={mergeMode === 'same_buyer'} onChange={() => setMergeMode('same_buyer')} className="size-3.5" />同买家合单</label>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">生成时机</span>
          <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="timing" checked={genTiming === 'immediate'} onChange={() => setGenTiming('immediate')} className="size-3.5" />即时生成</label>
          <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="timing" checked={genTiming === 'batch'} onChange={() => setGenTiming('batch')} className="size-3.5" />批量生成</label>
        </div>
        {genTiming === 'batch' && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">间隔:</span>
            <input type="number" min={5} max={120} value={batchInterval} onChange={e => setBatchInterval(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">分钟</span>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">编号规则</span>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={autoNumber} onChange={e => setAutoNumber(e.target.checked)} className="size-3.5 rounded-sm" />自动编号</label>
        {autoNumber && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#999]">前缀:</span>
            <input value={numberPrefix} onChange={e => setNumberPrefix(e.target.value)} maxLength={5} className="w-[60px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
          </div>
        )}
      </div>
    </>
  );

  const renderWarehouseStrategy = () => (
    <>
      {/* ─── 1. 仓库排序 ─── */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-[13px] font-medium text-[var(--foreground)]">仓库排序</div>
        <div className="flex items-center gap-3 flex-wrap text-[12px]">
          <select value={sortMode} onChange={e => setSortMode(e.target.value as 'distance' | 'priority' | 'stock')} className="border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-transparent outline-none focus:border-[var(--primary)]">
            <option value="distance">距离优先</option>
            <option value="priority">仓库优先级</option>
            <option value="stock">库存深度</option>
          </select>
          {sortMode === 'distance' && (
            <div className="flex items-center gap-2">
              <span className="text-[#999]">计算:</span>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="distCalc" checked={distCalcMode === 'delivery_time'} onChange={() => setDistCalcMode('delivery_time')} className="size-3.5" />配送时效</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="distCalc" checked={distCalcMode === 'straight'} onChange={() => setDistCalcMode('straight')} className="size-3.5" />直线距离</label>
            </div>
          )}
          {sortMode === 'stock' && (
            <div className="flex items-center gap-2">
              <span className="text-[#999]">维度:</span>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stockDim" checked={stockSortDimension === 'abs'} onChange={() => setStockSortDimension('abs')} className="size-3.5" />绝对库存量</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stockDim" checked={stockSortDimension === 'ratio'} onChange={() => setStockSortDimension('ratio')} className="size-3.5" />库存满足率</label>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. 仓库约束 ─── */}
      <div className="px-4 py-3 space-y-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--foreground)]">仓库约束</span>
          <span className="text-[11px] text-[#999]">不满足的仓库被排除候选</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={checkProduct} onChange={e => setCheckProduct(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">校验商品信息</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">硬约束</span><span className="text-[11px] text-[#999]">仓库必须有该SKU商品档案</span></div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={checkInv} onChange={e => setCheckInv(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">校验库存</span><select value={checkInvHard ? 'hard' : 'soft'} onChange={e => setCheckInvHard(e.target.value === 'hard')} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-transparent outline-none"><option value="hard">硬约束</option><option value="soft">软约束</option></select><span className="text-[11px] text-[#999]">{checkInvHard ? '无库存直接排除' : '第二轮放宽'}</span></div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={hazmatOnly} onChange={e => setHazmatOnly(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">危险品必须专仓</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">硬约束</span><span className="text-[11px] text-[#999]">含危品只能进有资质仓</span></div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={bulkOnly} onChange={e => setBulkOnly(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">大件必须大件仓</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">硬约束</span><span className="text-[11px] text-[#999]">大件SKU只能进大件仓</span></div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={expiryOnly} onChange={e => setExpiryOnly(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">效期品必须效期仓</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">硬约束</span><span className="text-[11px] text-[#999]">效期品只能进冷链/效期仓</span></div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={noExpiredOut} onChange={e => setNoExpiredOut(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">临期禁止出库</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">硬约束</span>{noExpiredOut && (<><span className="text-[11px] text-[#999]">阈值:</span><input type="number" min={1} max={90} value={expiryThreshold} onChange={e => setExpiryThreshold(Number(e.target.value))} className="w-[36px] border-b border-[var(--border)] bg-transparent text-center text-[11px] outline-none" /><span className="text-[11px] text-[#999]">天</span></>)}</div>
          <div className="flex items-center gap-3 text-[12px]"><input type="checkbox" checked={noMixBatch} onChange={e => setNoMixBatch(e.target.checked)} className="size-3.5 rounded-sm" /><span className="w-[140px]">不允许混批</span><select value={noMixBatchHard ? 'hard' : 'soft'} onChange={e => setNoMixBatchHard(e.target.value === 'hard')} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-transparent outline-none"><option value="hard">硬约束</option><option value="soft">软约束</option></select><span className="text-[11px] text-[#999]">同商品必须同批次</span></div>
        </div>
      </div>

      {/* ─── 3. 分仓策略 ─── */}
      <div className="px-4 py-3 space-y-2 border-t border-[var(--border)]">
        <div className="text-[13px] font-medium text-[var(--foreground)]">分仓策略</div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={preferSingleWh} onChange={e => setPreferSingleWh(e.target.checked)} className="size-3.5 rounded-sm" /><span>优先整单同仓</span><span className="text-[11px] text-[#999]">有单仓能满足全部SKU时优先</span></label>
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={allowMultiWh} onChange={e => onAllowMultiWh(e.target.checked)} className="size-3.5 rounded-sm" /><span>允许多仓履约</span><span className="text-[11px] text-[#999]">不同商品可分到不同仓</span></label>
          <label className={`flex items-center gap-3 text-[12px] cursor-pointer ${!allowMultiWh ? 'opacity-40' : ''}`}><input type="checkbox" checked={allowSkuMultiWh} onChange={e => setAllowSkuMultiWh(e.target.checked)} disabled={!allowMultiWh} className="size-3.5 rounded-sm" /><span>允许同一商品多仓履约</span><span className="text-[11px] text-[#999]">同SKU大数量可拆给多仓</span></label>
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={allowPartialShip} onChange={e => setAllowPartialShip(e.target.checked)} className="size-3.5 rounded-sm" /><span>允许部分下发</span><span className="text-[11px] text-[#999]">能发的先发，其余挂起</span></label>
        </div>
      </div>

      {/* ─── 4. 出库拆分 ─── */}
      <div className="px-4 py-3 space-y-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2"><span className="text-[13px] font-medium text-[var(--foreground)]">出库拆分</span><span className="text-[11px] text-[#999]">分仓成功后如何生成出库单</span></div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={oneSkuPerOrder} onChange={e => setOneSkuPerOrder(e.target.checked)} className="size-3.5 rounded-sm" /><span>一单一商品</span><span className="text-[11px] text-[#999]">每SKU独立出库单，同仓也拆</span></label>
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={sampleNoSolo} onChange={e => setSampleNoSolo(e.target.checked)} className="size-3.5 rounded-sm" /><span>样品不能单独出库</span><span className="text-[11px] text-[#999]">样品必须跟随主品</span></label>
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={hazmatSolo} onChange={e => setHazmatSolo(e.target.checked)} className="size-3.5 rounded-sm" /><span>危险品独立出库</span><span className="text-[11px] text-[#999]">危品不和普通品同单</span></label>
          <label className="flex items-center gap-3 text-[12px] cursor-pointer"><input type="checkbox" checked={bulkSolo} onChange={e => setBulkSolo(e.target.checked)} className="size-3.5 rounded-sm" /><span>大件独立出库</span><span className="text-[11px] text-[#999]">大件单独一张出库单</span></label>
          <div className="flex items-center gap-2 text-[12px] pt-1"><span className="text-[#666]">最大出库单数:</span><input type="number" min={1} max={20} value={maxOutboundOrders} onChange={e => setMaxOutboundOrders(Number(e.target.value))} className="w-[36px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" /><span className="text-[11px] text-[#999]">超出时合并</span></div>
        </div>
      </div>

      {/* ─── 5. 兜底策略 ─── */}
      <div className="px-4 py-3 space-y-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2"><span className="text-[13px] font-medium text-[var(--foreground)]">兜底策略</span><span className="text-[11px] text-[#999]">两轮都无合法方案时</span></div>
        <div className="flex items-center gap-3 text-[12px] flex-wrap">
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fallback" checked={fallbackAction === 'hold'} onChange={() => setFallbackAction('hold')} className="size-3.5" />挂起等待</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fallback" checked={fallbackAction === 'notify'} onChange={() => setFallbackAction('notify')} className="size-3.5" />通知人工</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fallback" checked={fallbackAction === 'force_priority'} onChange={() => setFallbackAction('force_priority')} className="size-3.5" />按优先级强推</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fallback" checked={fallbackAction === 'cancel'} onChange={() => setFallbackAction('cancel')} className="size-3.5" />取消订单</label>
        </div>
        {fallbackAction === 'hold' && (<div className="flex items-center gap-2 text-[12px]"><span className="text-[#999]">超时:</span><input type="number" min={1} max={720} value={fallbackTimeout} onChange={e => setFallbackTimeout(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" /><span className="text-[#999]">小时后转人工</span></div>)}
        {fallbackAction === 'notify' && (<div className="flex items-center gap-2 text-[12px]"><span className="text-[#999]">通知:</span><select value={fallbackNotifyRole} onChange={e => setFallbackNotifyRole(e.target.value)} className="border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-transparent outline-none"><option value="运营">运营</option><option value="仓库主管">仓库主管</option><option value="采购">采购</option></select></div>)}
        {fallbackAction === 'force_priority' && (<div className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1.5">忽略库存，按仓库优先级直接分配</div>)}
        {fallbackAction === 'cancel' && (<div className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1.5">⚠️ 将关闭订单并通知买家</div>)}
      </div>
    </>
  );

  const renderCarrierStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">选择模式</span>
        <select value={carrierSelectMode} onChange={e => setCarrierSelectMode(e.target.value as 'cheapest' | 'fastest' | 'priority' | 'smart')} className="border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-transparent outline-none focus:border-[var(--primary)]">
          <option value="smart">智能推荐</option>
          <option value="cheapest">最低运费</option>
          <option value="fastest">最快时效</option>
          <option value="priority">优先级</option>
        </select>
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">计重方式</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="weight" checked={weightCalc === 'actual'} onChange={() => setWeightCalc('actual')} className="size-3.5" />实际重量</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="weight" checked={weightCalc === 'volume'} onChange={() => setWeightCalc('volume')} className="size-3.5" />体积重量</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="weight" checked={weightCalc === 'max'} onChange={() => setWeightCalc('max')} className="size-3.5" />取大值</label>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">降级策略</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={carrierFallback} onChange={e => setCarrierFallback(e.target.checked)} className="size-3.5 rounded-sm" />允许承运商降级</label>
        </div>
        {carrierFallback && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">最大重试:</span>
            <input type="number" min={1} max={10} value={maxCarrierRetry} onChange={e => setMaxCarrierRetry(Number(e.target.value))} className="w-[40px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">次</span>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">保险策略</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={insure} onChange={e => setInsure(e.target.checked)} className="size-3.5 rounded-sm" />自动投保</label>
        </div>
        {insure && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">订单金额超过</span>
            <input type="number" min={0} value={insureThreshold} onChange={e => setInsureThreshold(Number(e.target.value))} className="w-[60px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">USD 时投保</span>
          </div>
        )}
      </div>
    </>
  );

  const renderPushStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">推送模式</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="pushMode" checked={pushMode === 'realtime'} onChange={() => setPushMode('realtime')} className="size-3.5" />实时推送</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="pushMode" checked={pushMode === 'batch'} onChange={() => setPushMode('batch')} className="size-3.5" />批量推送</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="pushMode" checked={pushMode === 'schedule'} onChange={() => setPushMode('schedule')} className="size-3.5" />定时推送</label>
      </div>
      {pushMode === 'batch' && (
        <div className="px-4 py-2.5 flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">批量大小</span>
          <input type="number" min={10} max={500} value={pushBatchSize} onChange={e => setPushBatchSize(Number(e.target.value))} className="w-[60px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
          <span className="text-[12px] text-[#999]">单/批</span>
        </div>
      )}
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">数据格式</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="format" checked={pushFormat === 'standard'} onChange={() => setPushFormat('standard')} className="size-3.5" />标准格式</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="format" checked={pushFormat === 'custom'} onChange={() => setPushFormat('custom')} className="size-3.5" />自定义映射</label>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">失败重试</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={pushRetry} onChange={e => setPushRetry(e.target.checked)} className="size-3.5 rounded-sm" />自动重试</label>
        </div>
        {pushRetry && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">最大</span>
            <input type="number" min={1} max={10} value={pushRetryMax} onChange={e => setPushRetryMax(Number(e.target.value))} className="w-[36px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">次，间隔</span>
            <input type="number" min={1} max={60} value={pushRetryInterval} onChange={e => setPushRetryInterval(Number(e.target.value))} className="w-[36px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">分钟</span>
          </div>
        )}
      </div>
    </>
  );

  const renderShipStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">确认方式</span>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={shipAutoConfirm} onChange={e => setShipAutoConfirm(e.target.checked)} className="size-3.5 rounded-sm" />自动确认发货</label>
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">拆单确认</span>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="splitConfirm" checked={shipSplitConfirm === 'all_shipped'} onChange={() => setShipSplitConfirm('all_shipped')} className="size-3.5" />全部包裹发出后标发</label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer"><input type="radio" name="splitConfirm" checked={shipSplitConfirm === 'any_shipped'} onChange={() => setShipSplitConfirm('any_shipped')} className="size-3.5" />任一包裹发出即标发</label>
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">通知推送</span>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={shipNotify} onChange={e => setShipNotify(e.target.checked)} className="size-3.5 rounded-sm" />发货通知买家</label>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">物流跟踪</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={trackSync} onChange={e => setTrackSync(e.target.checked)} className="size-3.5 rounded-sm" />自动同步物流单号</label>
        </div>
        {trackSync && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">同步间隔:</span>
            <input type="number" min={10} max={360} value={trackSyncInterval} onChange={e => setTrackSyncInterval(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">分钟</span>
          </div>
        )}
      </div>
    </>
  );

  const renderExceptionStrategy = () => (
    <>
      <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">处理方式</span>
        <select value={exceptionAction} onChange={e => setExceptionAction(e.target.value as 'hold' | 'retry' | 'escalate' | 'cancel')} className="border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-transparent outline-none focus:border-[var(--primary)]">
          <option value="hold">挂起等待</option>
          <option value="retry">自动重试</option>
          <option value="escalate">升级处理</option>
          <option value="cancel">自动取消</option>
        </select>
      </div>
      {exceptionAction === 'retry' && (
        <div className="px-4 py-2.5 flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">重试次数</span>
          <input type="number" min={1} max={10} value={exceptionRetryMax} onChange={e => setExceptionRetryMax(Number(e.target.value))} className="w-[40px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
          <span className="text-[12px] text-[#999]">次</span>
        </div>
      )}
      {exceptionAction === 'escalate' && (
        <div className="px-4 py-2.5 flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">升级超时</span>
          <input type="number" min={5} max={1440} value={escalateTimeout} onChange={e => setEscalateTimeout(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
          <span className="text-[12px] text-[#999]">分钟后自动升级</span>
        </div>
      )}
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)] w-[72px] shrink-0">自动取消</span>
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={autoCancel} onChange={e => setAutoCancel(e.target.checked)} className="size-3.5 rounded-sm" />超时未处理自动取消</label>
        </div>
        {autoCancel && (
          <div className="flex items-center gap-3 ml-[84px] text-[12px]">
            <span className="text-[#999]">超过</span>
            <input type="number" min={1} max={720} value={autoCancelTimeout} onChange={e => setAutoCancelTimeout(Number(e.target.value))} className="w-[50px] border-b border-[var(--border)] bg-transparent text-center text-[12px] outline-none" />
            <span className="text-[#999]">小时后取消</span>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-3">
        <span className="text-[var(--foreground)] w-[72px] shrink-0">异常通知</span>
        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={notifyOnException} onChange={e => setNotifyOnException(e.target.checked)} className="size-3.5 rounded-sm" />异常时通知相关人员</label>
      </div>
    </>
  );


  return (
    <div className="mx-auto max-w-[1100px] py-6">
      {/* Top: horizontal card */}
      <div className="mb-5 border border-[var(--border)] bg-white px-5 py-4 flex items-center gap-6">
        <div className="flex-1">
          <label className="block text-[11px] text-[#999] mb-1">规则名称 *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入规则名称" maxLength={50} className="w-full border-b border-[var(--border)] bg-transparent py-1 text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]" />
        </div>
        <div className="w-[140px] shrink-0">
          <label className="block text-[11px] text-[#999] mb-1">规则类型 *</label>
          <select value={stage} onChange={e => setStage(e.target.value as RuleStage)} className="w-full border-b border-[var(--border)] bg-transparent py-1 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]">
            {stageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="w-[100px] shrink-0">
          <label className="block text-[11px] text-[#999] mb-1">优先级 *</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border-b border-[var(--border)] bg-transparent py-1 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]">
            <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
          </select>
        </div>
        <div className="w-[100px] shrink-0">
          <label className="block text-[11px] text-[#999] mb-1">规则状态 *</label>
          <select value={ruleStatus} onChange={e => setRuleStatus(e.target.value)} className="w-full border-b border-[var(--border)] bg-transparent py-1 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]">
            <option value="启用">启用</option><option value="停用">停用</option>
          </select>
        </div>
      </div>

      {/* Condition panel */}
      <div className="mb-5 border border-[var(--border)] bg-white flex" style={{ minHeight: 380 }}>
        {/* Left: conditions */}
        <div className="w-[320px] shrink-0 border-r border-[var(--border)] overflow-y-auto p-4 space-y-5">
          <div className="text-[13px] font-medium text-[var(--foreground)] mb-1">可选条件</div>
          {categories.map(cat => {
            const items = filtered.filter(d => d.cat === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-1.5 mb-2">
                  <ChevronDown className="size-3.5 text-[var(--foreground)]" />
                  <span className="text-[13px] font-semibold text-[var(--foreground)]">{cat.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pl-5">
                  {items.map(c => {
                    const on = sels.some(s => s.id === c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="size-[14px] rounded-sm border-gray-300 text-[var(--primary)] focus:ring-0" />
                        <span className={cn('text-[13px]', on ? 'text-[var(--primary)] font-medium' : 'text-[var(--foreground)]')}>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: selected conditions */}
        <div className="flex-1 overflow-y-auto text-[13px]">
          <div className="px-4 py-2.5 border-b border-[var(--border)] text-[12px] text-[#999] flex items-center justify-between">
            <span>已选条件</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px]">条件关系:</span>
              <button type="button" onClick={() => setCondLogic(condLogic === 'and' ? 'or' : 'and')} className="rounded border border-[var(--primary)] bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                {condLogic === 'and' ? '且(AND)' : '或(OR)'}
              </button>
            </div>
          </div>
          {sels.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[13px] text-[#ccc]">从左侧勾选条件项</div>
          ) : (
            <div className="p-4 space-y-4">
              {sels.map(sel => {
                const def = cDefs.find(d => d.id === sel.id);
                if (!def) return null;
                const parts = sel.val.split('|');
                const op = parts[0] || '';
                const val = parts[1] || '';
                const setOp = (o: string) => setVal(sel.id, `${o}|${val}`);
                const setV = (v: string) => setVal(sel.id, `${op}|${v}`);
                return (
                  <div key={sel.id} className="flex items-center gap-3">
                    <span className="text-[13px] text-[var(--foreground)] w-[120px] shrink-0">{def.label}</span>
                    <select value={op} onChange={e => setOp(e.target.value)} className="border border-[var(--border)] rounded px-2 py-1.5 text-[13px] bg-transparent outline-none focus:border-[var(--primary)] w-[100px] shrink-0">
                      <option value="">运算符</option>
                      <option value="eq">等于</option>
                      <option value="contains">包含</option>
                      <option value="not_contains">不包含</option>
                      <option value="in">全部包含在</option>
                      <option value="neq">不等于</option>
                      <option value="gt">大于</option>
                      <option value="lt">小于</option>
                    </select>
                    {def.type === 'tags' && def.opts ? (
                      <select value={val} onChange={e => setV(e.target.value)} className="border border-[var(--border)] rounded px-2 py-1.5 text-[13px] bg-transparent outline-none focus:border-[var(--primary)] flex-1">
                        <option value="">请选择{def.label}</option>
                        {def.opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={val} onChange={e => setV(e.target.value)} placeholder="请输入值" className="border border-[var(--border)] rounded px-2 py-1.5 text-[13px] bg-transparent outline-none focus:border-[var(--primary)] flex-1" />
                    )}
                    <button type="button" onClick={() => toggle(sel.id)} className="text-[#ccc] hover:text-[var(--danger)] shrink-0">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Strategy settings */}
      <div className="mb-5 border border-[var(--border)] bg-white text-[13px]">
        <div className="px-4 py-2 border-b border-[var(--border)] text-[12px] text-[#999] font-medium flex items-center gap-2">
          策略设置
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-[var(--primary)]">{stageOptions.find(o => o.value === stage)?.label}</span>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {renderStrategy()}
        </div>
      </div>

      {/* Test */}
      <div className="mb-6 border border-[var(--border)] bg-white text-[13px]">
        <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-[12px] text-[#999] font-medium">规则测试</span>
          <button type="button" onClick={runTest} disabled={testing} className="text-[12px] text-[var(--primary)] hover:underline disabled:opacity-50 flex items-center gap-1">
            {testing ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}{testing ? '执行中' : '运行测试'}
          </button>
        </div>
        <div className="px-4 py-3">
          <input value={testNo} onChange={e => setTestNo(e.target.value)} placeholder="输入订单号，留空使用模拟数据" className="border-b border-[var(--border)] bg-transparent px-0.5 py-1 text-[12px] outline-none focus:border-[var(--primary)] w-[280px] mb-3" />
          {result && (
            <div className="space-y-1">
              {result.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] py-0.5">
                  {s.ok ? <CheckCircle2 className="size-3 text-green-500 shrink-0" /> : <AlertTriangle className="size-3 text-amber-500 shrink-0" />}
                  <span className="text-[#999] w-14 shrink-0">{s.l}</span>
                  <span className="text-[var(--foreground)]">{s.d}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard/rules/fulfillment" className="px-5 py-1.5 border border-[var(--border)] rounded text-[13px] text-[var(--foreground)] hover:bg-[#f5f5f5]">取消</Link>
        <button className="px-5 py-1.5 rounded bg-[var(--primary)] text-[13px] text-white font-medium hover:opacity-90">确定</button>
      </div>
    </div>
  );
}
