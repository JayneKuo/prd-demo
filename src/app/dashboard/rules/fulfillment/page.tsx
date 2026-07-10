'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Play, Pause, Copy, Trash2, Settings2, X, Columns3, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellState } from '@/components/providers/shell-state-provider';
import { getCompanyById, getMerchantByScope } from '@/lib/tenant-context';

// ─── Types ───
type RuleStatus = 'active' | 'inactive' | 'draft';
type RulePriority = 'high' | 'medium' | 'low';
type RuleStage = 'review' | 'generate' | 'warehouse' | 'carrier' | 'push' | 'ship' | 'exception';

type FulfillmentRule = {
  id: string;
  name: string;
  description: string;
  stage: RuleStage;
  status: RuleStatus;
  priority: RulePriority;
  order: number;
  conditions: string[];
  actions: string[];
  hitCount7d: number;
  hitRate: string;
  lastTriggered: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // 关联单据
  relatedOrders: { id: string; orderNo: string; time: string; result: string }[];
  // 最近命中记录
  hitRecords: { time: string; orderNo: string; action: string; duration: string }[];
};

// ─── Stage config ───
const stageConfig: Record<RuleStage, { label: string; color: string }> = {
  review: { label: '审单', color: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  generate: { label: '生成履约单', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  warehouse: { label: '寻仓', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  carrier: { label: '承运商', color: 'bg-green-50 text-green-700 ring-green-200' },
  push: { label: '推单到仓', color: 'bg-purple-50 text-purple-700 ring-purple-200' },
  ship: { label: '标发', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  exception: { label: '异常处理', color: 'bg-red-50 text-red-700 ring-red-200' },
};

const statusConfig: Record<RuleStatus, { label: string; dot: string }> = {
  active: { label: '启用', dot: 'bg-green-500' },
  inactive: { label: '停用', dot: 'bg-slate-400' },
  draft: { label: '草稿', dot: 'bg-amber-400' },
};

const priorityConfig: Record<RulePriority, { label: string; color: string }> = {
  high: { label: '高', color: 'text-red-600 bg-red-50' },
  medium: { label: '中', color: 'text-amber-600 bg-amber-50' },
  low: { label: '低', color: 'text-slate-600 bg-slate-50' },
};

// ─── Mock Rules Data ───
const mockHitRecords = [
  { time: '2026-07-03 09:12:34', orderNo: 'SO-2026070301284', action: '放行', duration: '12ms' },
  { time: '2026-07-03 09:10:18', orderNo: 'SO-2026070301283', action: '放行', duration: '8ms' },
  { time: '2026-07-03 09:08:02', orderNo: 'SO-2026070301282', action: '挂起', duration: '15ms' },
  { time: '2026-07-03 08:55:41', orderNo: 'SO-2026070301280', action: '放行', duration: '10ms' },
  { time: '2026-07-03 08:42:15', orderNo: 'SO-2026070301278', action: '放行', duration: '9ms' },
];

const mockRelatedOrders = [
  { id: 'ord-001', orderNo: 'SO-2026070301284', time: '2026-07-03 09:12', result: '命中-放行' },
  { id: 'ord-002', orderNo: 'SO-2026070301283', time: '2026-07-03 09:10', result: '命中-放行' },
  { id: 'ord-003', orderNo: 'SO-2026070301282', time: '2026-07-03 09:08', result: '命中-挂起' },
  { id: 'ord-004', orderNo: 'FF-2026070300156', time: '2026-07-03 08:55', result: '命中-拆单' },
  { id: 'ord-005', orderNo: 'FF-2026070300155', time: '2026-07-03 08:42', result: '命中-放行' },
];

const mockRules: FulfillmentRule[] = [
  {
    id: 'FR-001', name: '地址有效性校验', stage: 'review', status: 'active', priority: 'high', order: 1,
    description: '验证收货地址格式完整性、可达性，拦截无效/PO Box/军事地址等不可配送地址',
    conditions: ['新订单进入系统', '收货地址字段非空'],
    actions: ['调用地址验证API (USPS/Google)', '无效 → 挂起+客服工单', '有效 → 放行'],
    hitCount7d: 2356, hitRate: '100%', lastTriggered: '1分钟前',
    createdAt: '2026-02-10', updatedAt: '2026-06-30', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-002', name: '黑名单/风控拦截', stage: 'review', status: 'active', priority: 'high', order: 2,
    description: '比对收货人、地址、IP等信息与欺诈黑名单库，拦截高风险订单',
    conditions: ['订单通过地址校验', '收货人/地址/电话等信息'],
    actions: ['匹配黑名单库', '命中 → 标记欺诈+拦截', '未命中 → 放行'],
    hitCount7d: 2356, hitRate: '100%', lastTriggered: '3分钟前',
    createdAt: '2026-02-10', updatedAt: '2026-06-28', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-003', name: 'SKU合规校验', stage: 'review', status: 'active', priority: 'high', order: 3,
    description: '验证订单SKU是否存在、是否可售、是否有出口/运输限制（电池、液体、粉末等）',
    conditions: ['订单通过风控', 'SKU在系统中存在'],
    actions: ['检查SKU上架状态', '检查禁运/敏感品标记', '不合规 → 挂起+通知运营'],
    hitCount7d: 2356, hitRate: '100%', lastTriggered: '2分钟前',
    createdAt: '2026-02-15', updatedAt: '2026-07-01', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-004', name: '库存预占校验', stage: 'review', status: 'active', priority: 'high', order: 4,
    description: '审单阶段进行库存软预占，确保有足够可用库存支撑发货',
    conditions: ['订单通过SKU校验', '全渠道库存可查询'],
    actions: ['查询各仓可用库存', '有库存 → 软预占+放行', '无库存 → 挂起+触发补货预警'],
    hitCount7d: 2356, hitRate: '100%', lastTriggered: '1分钟前',
    createdAt: '2026-03-01', updatedAt: '2026-06-30', createdBy: '李主管',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-005', name: '金额异常拦截', stage: 'review', status: 'active', priority: 'medium', order: 5,
    description: '客单价异常高或异常低的订单自动拦截，防止刷单或定价错误',
    conditions: ['订单金额 < $0.5 或 > $2000', '非白名单大额客户'],
    actions: ['标记金额异常', '挂起订单', '通知运营人工确认'],
    hitCount7d: 18, hitRate: '0.8%', lastTriggered: '6小时前',
    createdAt: '2026-04-05', updatedAt: '2026-06-15', createdBy: '张运营',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-006', name: '库存驱动拆单', stage: 'generate', status: 'active', priority: 'high', order: 6,
    description: '当单仓无法满足全部SKU时，按库存分布自动拆为多个子履约单',
    conditions: ['订单含2+个SKU', '单仓无法满足全部SKU', '各SKU在不同仓有库存'],
    actions: ['计算最优拆单方案(最少包裹数)', '生成多个子履约单', '各子单独立进入寻仓'],
    hitCount7d: 326, hitRate: '13.8%', lastTriggered: '18分钟前',
    createdAt: '2026-03-20', updatedAt: '2026-06-25', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 3), hitRecords: mockHitRecords.slice(0, 3),
  },
  {
    id: 'FR-007', name: '超大件独立拆出', stage: 'generate', status: 'active', priority: 'medium', order: 7,
    description: '超大件/超重件商品独立拆出生成单独履约单，不与普通件合包',
    conditions: ['订单含超大件SKU(重量>20kg或体积>0.5m³)', '订单同时含普通件SKU'],
    actions: ['超大件独立生成履约单', '普通件合并生成另一履约单', '分别进入寻仓'],
    hitCount7d: 42, hitRate: '1.8%', lastTriggered: '4小时前',
    createdAt: '2026-04-10', updatedAt: '2026-06-20', createdBy: '王物流',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-008', name: '同人合单策略', stage: 'generate', status: 'active', priority: 'medium', order: 8,
    description: '同一收货人24h内多笔订单自动合并为一个履约单，降低物流成本',
    conditions: ['同一收货人+同一地址', '24小时窗口期内', '合并后总重<30kg', '同一目标仓库'],
    actions: ['合并为一个履约单', '重新计算运费', '合并后只出一个包裹'],
    hitCount7d: 156, hitRate: '6.6%', lastTriggered: '45分钟前',
    createdAt: '2026-04-18', updatedAt: '2026-06-22', createdBy: '张运营',
    relatedOrders: mockRelatedOrders.slice(0, 3), hitRecords: mockHitRecords.slice(0, 3),
  },
  {
    id: 'FR-009', name: '预售/缺货件分离', stage: 'generate', status: 'active', priority: 'medium', order: 9,
    description: '订单中现货与预售/缺货SKU分离，现货部分先行履约不等待',
    conditions: ['订单含预售SKU或缺货SKU', '订单同时含有现货SKU', '客户未要求一次性发货'],
    actions: ['现货SKU生成履约单立即执行', '预售/缺货SKU挂起等待到货', '到货后自动生成新履约单'],
    hitCount7d: 68, hitRate: '2.9%', lastTriggered: '2小时前',
    createdAt: '2026-05-01', updatedAt: '2026-06-28', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-010', name: 'FBA优先策略', stage: 'warehouse', status: 'active', priority: 'high', order: 10,
    description: 'Amazon FBM订单优先检查FBA仓库存(MCF模式)，时效最优成本最高',
    conditions: ['订单来源Amazon', 'SKU在FBA仓有库存', 'SKU已开启MCF'],
    actions: ['分配至FBA仓(MCF)', 'FBA缺货 → 降级到三方仓', '记录仓库选择原因'],
    hitCount7d: 524, hitRate: '22.2%', lastTriggered: '8分钟前',
    createdAt: '2026-03-01', updatedAt: '2026-06-29', createdBy: '张运营',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-011', name: '就近三方仓分配', stage: 'warehouse', status: 'active', priority: 'high', order: 11,
    description: '根据收货地址计算最近的三方海外仓，在库存满足前提下优先就近发货',
    conditions: ['FBA不可用或无库存', '三方仓有对应SKU库存', '收货地址在三方仓覆盖范围'],
    actions: ['计算各三方仓到收货地距离', '选择最近+库存充足的仓', '生成出库指令'],
    hitCount7d: 1842, hitRate: '78.3%', lastTriggered: '2分钟前',
    createdAt: '2026-03-15', updatedAt: '2026-06-28', createdBy: '张运营',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-012', name: '自营仓兜底', stage: 'warehouse', status: 'active', priority: 'low', order: 12,
    description: '当FBA和三方仓均无法满足时，分配至国内自营仓走直发/头程+尾程',
    conditions: ['FBA无库存', '三方仓无库存', '自营仓有库存'],
    actions: ['分配至自营仓', '标记为"国内直发"', '计算头程+尾程时效是否满足SLA'],
    hitCount7d: 86, hitRate: '3.7%', lastTriggered: '1小时前',
    createdAt: '2026-03-20', updatedAt: '2026-06-25', createdBy: '王物流',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-013', name: '库存均衡分仓', stage: 'warehouse', status: 'active', priority: 'medium', order: 13,
    description: '多仓库存接近时避免单仓过度消耗，按库存深度比例分配订单',
    conditions: ['多仓均有库存', '各仓距离相近(差距<20%)', '单仓日消耗接近安全库存'],
    actions: ['按库存深度比例分配', '库存低于安全线的仓降低权重', '记录均衡原因'],
    hitCount7d: 248, hitRate: '10.5%', lastTriggered: '15分钟前',
    createdAt: '2026-04-20', updatedAt: '2026-06-30', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 4), hitRecords: mockHitRecords.slice(0, 4),
  },
  {
    id: 'FR-014', name: '轻小件USPS优先', stage: 'carrier', status: 'active', priority: 'medium', order: 14,
    description: '重量<1lb的轻小件包裹优先使用USPS First Class，成本最低',
    conditions: ['包裹重量 < 1lb (454g)', '目的地为美国本土', '非加急订单'],
    actions: ['匹配USPS First Class Mail', '获取运费报价', '生成面单请求'],
    hitCount7d: 680, hitRate: '28.9%', lastTriggered: '5分钟前',
    createdAt: '2026-03-10', updatedAt: '2026-07-01', createdBy: '王物流',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-015', name: '中件UPS/FedEx Ground', stage: 'carrier', status: 'active', priority: 'medium', order: 15,
    description: '1-20kg标准包裹匹配UPS Ground或FedEx Ground，时效与成本平衡',
    conditions: ['包裹重量 1lb-44lb (0.45-20kg)', '非敏感品', '标准时效订单'],
    actions: ['查询UPS/FedEx实时报价', '选择最优价格', '超时效要求 → 升级Express'],
    hitCount7d: 920, hitRate: '39.1%', lastTriggered: '3分钟前',
    createdAt: '2026-03-10', updatedAt: '2026-07-01', createdBy: '王物流',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-016', name: '大件专线物流', stage: 'carrier', status: 'active', priority: 'medium', order: 16,
    description: '超过20kg或0.5m³的大件/超大件使用FedEx Freight或专线',
    conditions: ['包裹重量>20kg 或 体积>0.5m³', '非航空禁运品'],
    actions: ['匹配FedEx Freight / 专线承运商', '大件需预约派送时间', '生成大件标签'],
    hitCount7d: 89, hitRate: '3.8%', lastTriggered: '2小时前',
    createdAt: '2026-04-02', updatedAt: '2026-06-20', createdBy: '王物流',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-017', name: '敏感品承运商筛选', stage: 'carrier', status: 'active', priority: 'high', order: 17,
    description: '含电池/液体/粉末等敏感品的包裹，自动过滤掉不接受此类商品的承运商',
    conditions: ['SKU标记含敏感品属性', '包裹含电池/液体/磁性物品'],
    actions: ['过滤航空禁运渠道', '仅匹配接受敏感品的承运商', '无可用 → 挂起+通知'],
    hitCount7d: 142, hitRate: '6.0%', lastTriggered: '30分钟前',
    createdAt: '2026-04-15', updatedAt: '2026-06-28', createdBy: '王物流',
    relatedOrders: mockRelatedOrders.slice(0, 3), hitRecords: mockHitRecords.slice(0, 3),
  },
  {
    id: 'FR-018', name: '加急订单升级', stage: 'carrier', status: 'active', priority: 'high', order: 18,
    description: 'SLA剩余不足12h或客户选择加急配送的订单，自动升级至Express服务',
    conditions: ['SLA剩余 < 12h', '或客户选择Priority/Express配送'],
    actions: ['升级至UPS Next Day / FedEx Express', '标记为加急', '优先排产出库'],
    hitCount7d: 96, hitRate: '4.1%', lastTriggered: '20分钟前',
    createdAt: '2026-03-25', updatedAt: '2026-07-01', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-019', name: '运费最优选择', stage: 'carrier', status: 'draft', priority: 'low', order: 19,
    description: '在满足时效的前提下对比多个承运商报价，自动选最低运费方案',
    conditions: ['非加急订单', '目的地有多承运商覆盖', 'SLA剩余 > 24h'],
    actions: ['批量查询承运商实时报价', '选择满足时效的最低价', '记录节省金额'],
    hitCount7d: 0, hitRate: '0%', lastTriggered: '—',
    createdAt: '2026-06-28', updatedAt: '2026-06-28', createdBy: '王物流',
    relatedOrders: [], hitRecords: [],
  },
  {
    id: 'FR-020', name: '三方仓API推单', stage: 'push', status: 'active', priority: 'high', order: 20,
    description: '履约单确认后通过API自动推送至三方仓WMS(谷仓/万邑通/递四方等)',
    conditions: ['履约单仓库为三方仓', '承运商已匹配', '面单已获取'],
    actions: ['调用三方仓创建出库单API', '传递SKU/数量/面单/承运商信息', '获取三方仓单号'],
    hitCount7d: 1680, hitRate: '71.3%', lastTriggered: '3分钟前',
    createdAt: '2026-02-20', updatedAt: '2026-07-01', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-021', name: '自营仓WMS推单', stage: 'push', status: 'active', priority: 'high', order: 21,
    description: '分配至自营仓的履约单推送至自有WMS，触发拣货打包流程',
    conditions: ['履约单仓库为自营仓', '承运商已匹配'],
    actions: ['推送至自有WMS', '生成拣货任务', '分配波次'],
    hitCount7d: 86, hitRate: '3.7%', lastTriggered: '1小时前',
    createdAt: '2026-02-20', updatedAt: '2026-06-30', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-022', name: 'MCF推单(Amazon履约)', stage: 'push', status: 'active', priority: 'high', order: 22,
    description: '使用FBA库存的MCF订单，调用Amazon MCF API创建履约请求',
    conditions: ['履约单仓库为FBA(MCF模式)', 'SKU有FBA库存'],
    actions: ['调用Amazon CreateFulfillmentOrder API', '传递配送地址/SKU/速度', '获取Amazon履约单号'],
    hitCount7d: 524, hitRate: '22.2%', lastTriggered: '8分钟前',
    createdAt: '2026-03-05', updatedAt: '2026-06-29', createdBy: '张运营',
    relatedOrders: mockRelatedOrders.slice(0, 4), hitRecords: mockHitRecords.slice(0, 4),
  },
  {
    id: 'FR-023', name: '出库回传运单号', stage: 'ship', status: 'active', priority: 'high', order: 23,
    description: '仓库确认出库后，自动将运单号回传至Amazon平台完成标发(Mark as Shipped)',
    conditions: ['仓库回传出库确认', '运单号(Tracking Number)已获取', '承运商代码已映射'],
    actions: ['调用Amazon ConfirmShipment API', '回传: 运单号+承运商+发货时间', '更新订单状态为已发货'],
    hitCount7d: 2180, hitRate: '92.6%', lastTriggered: '2分钟前',
    createdAt: '2026-02-10', updatedAt: '2026-07-01', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders, hitRecords: mockHitRecords,
  },
  {
    id: 'FR-024', name: 'SLA超时自动标发', stage: 'ship', status: 'active', priority: 'high', order: 24,
    description: '接近SLA截止时间仍未出库的订单，在获取面单后提前标发避免Late Shipment',
    conditions: ['SLA剩余 < 4h', '面单已获取但仓库未确认出库', '包裹实际在处理中'],
    actions: ['提前回传运单号至平台(预标发)', '设置出库跟踪提醒', '标记为"预标发待实际出库"'],
    hitCount7d: 38, hitRate: '1.6%', lastTriggered: '3小时前',
    createdAt: '2026-04-10', updatedAt: '2026-06-30', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 1), hitRecords: mockHitRecords.slice(0, 1),
  },
  {
    id: 'FR-025', name: '多包裹分次标发', stage: 'ship', status: 'active', priority: 'medium', order: 25,
    description: '拆单后的多个子包裹，每个子包裹出库后独立回传运单号',
    conditions: ['原订单被拆为多个履约单', '子包裹独立出库'],
    actions: ['每个子包裹独立调用标发API', '传递对应子包裹的运单号', '全部标发后订单状态更新为已发货'],
    hitCount7d: 326, hitRate: '13.8%', lastTriggered: '25分钟前',
    createdAt: '2026-04-20', updatedAt: '2026-06-28', createdBy: '王物流',
    relatedOrders: mockRelatedOrders.slice(0, 3), hitRecords: mockHitRecords.slice(0, 3),
  },
  {
    id: 'FR-026', name: '全渠道缺货挂起', stage: 'exception', status: 'active', priority: 'high', order: 26,
    description: '所有仓库均无法满足订单SKU时，自动挂起并触发补货+客服流程',
    conditions: ['所有仓库该SKU库存为0', '无在途补货 或 补货ETA > 7天'],
    actions: ['订单挂起', '触发采购补货预警', '超48h未恢复 → 通知客服联系买家'],
    hitCount7d: 42, hitRate: '1.8%', lastTriggered: '3小时前',
    createdAt: '2026-03-25', updatedAt: '2026-06-18', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 2), hitRecords: mockHitRecords.slice(0, 2),
  },
  {
    id: 'FR-027', name: '推单失败重试', stage: 'exception', status: 'active', priority: 'high', order: 27,
    description: '推单到仓API失败时自动重试，超过重试次数后挂起并告警',
    conditions: ['推单API返回失败', '重试次数 < 3次'],
    actions: ['间隔5分钟自动重试', '3次失败 → 挂起+通知技术', '记录失败原因'],
    hitCount7d: 12, hitRate: '0.5%', lastTriggered: '6小时前',
    createdAt: '2026-03-10', updatedAt: '2026-06-25', createdBy: '系统默认',
    relatedOrders: mockRelatedOrders.slice(0, 1), hitRecords: mockHitRecords.slice(0, 1),
  },
  {
    id: 'FR-028', name: '标发超时预警', stage: 'exception', status: 'active', priority: 'high', order: 28,
    description: '推单到仓后超过预期时效仍未收到出库确认，触发催促和预警',
    conditions: ['推单成功后 > 预期出库时效(如8h)', '仓库未回传出库确认'],
    actions: ['发送催仓通知', '超12h → 升级通知主管', '超24h → 考虑换仓重新履约'],
    hitCount7d: 28, hitRate: '1.2%', lastTriggered: '5小时前',
    createdAt: '2026-04-01', updatedAt: '2026-06-30', createdBy: '李主管',
    relatedOrders: mockRelatedOrders.slice(0, 1), hitRecords: mockHitRecords.slice(0, 1),
  },
];

// ─── Tabs (matching orders/inbound/outbound pattern) ───
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'review', label: '审单', filter: (r: FulfillmentRule) => r.stage === 'review' },
  { key: 'generate', label: '生成履约单', filter: (r: FulfillmentRule) => r.stage === 'generate' },
  { key: 'warehouse', label: '寻仓', filter: (r: FulfillmentRule) => r.stage === 'warehouse' },
  { key: 'carrier', label: '承运商', filter: (r: FulfillmentRule) => r.stage === 'carrier' },
  { key: 'push', label: '推单到仓', filter: (r: FulfillmentRule) => r.stage === 'push' },
  { key: 'ship', label: '标发', filter: (r: FulfillmentRule) => r.stage === 'ship' },
  { key: 'exception', label: '异常', filter: (r: FulfillmentRule) => r.stage === 'exception' },
];

export default function FulfillmentRulesPage() {
  const { companyId, merchantScope } = useShellState();
  const company = getCompanyById(companyId);
  const merchant = getMerchantByScope(merchantScope);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  // Filtering logic
  const activeFilter = tabs.find((t) => t.key === activeTab);
  const tabFilteredRules = activeFilter?.filter
    ? mockRules.filter(activeFilter.filter)
    : mockRules;

  const filteredRules = useMemo(() => {
    return tabFilteredRules.filter((rule) => {
      if (statusFilter && rule.status !== statusFilter) return false;
      if (priorityFilter && rule.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return rule.name.toLowerCase().includes(q) || rule.description.toLowerCase().includes(q) || rule.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tabFilteredRules, statusFilter, priorityFilter, searchQuery]);

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    tabs.forEach((tab) => {
      if (tab.key === 'all') c[tab.key] = mockRules.length;
      else c[tab.key] = mockRules.filter(tab.filter!).length;
    });
    return c;
  }, []);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const paginatedRules = filteredRules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginatedRules.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedRules.map((r) => r.id)));
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setSelectedRows(new Set());
  };

  const hasActiveFilters = !!(searchQuery || statusFilter || priorityFilter);

  return (
    <div className="mx-auto max-w-[1440px] pt-5 lg:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">履约规则</h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            按订单履约链路阶段配置自动化规则 · 规则按优先级顺序执行
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/rules/fulfillment/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            新建规则
          </Link>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedRows.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[var(--primary)]">已选 {selectedRows.size} 项</span>
          <div className="flex items-center gap-2">
            <button className="flex h-7 items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 text-[12px] font-medium text-white">
              <Play className="size-3" />
              批量启用
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)]">
              <Pause className="size-3 mr-1" />
              批量停用
            </button>
            <button className="flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--danger)]">
              <Trash2 className="size-3 mr-1" />
              删除
            </button>
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {/* Tabs + filters — sticky */}
        <div className="sticky -top-5 lg:-top-6 z-20 rounded-t-xl pt-5 lg:pt-6 bg-[var(--surface)]">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pt-1">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => {
                const count = counts[tab.key] ?? 0;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                    className={cn(
                      'relative pb-3 pt-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
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
              <Columns3 className="size-3.5" />
              列设置
            </button>
          </div>

          {/* Filter pills row */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] pl-2.5 pr-1">
                <Search className="size-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索规则名称/ID..."
                  className="w-[160px] bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="flex size-5 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]">
                    <X className="size-3 text-[var(--muted)]" />
                  </button>
                )}
              </div>

              {/* Status pill filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', statusFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">状态</option>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
                <option value="draft">草稿</option>
              </select>

              {/* Priority pill filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={cn('h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors', priorityFilter ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]')}
              >
                <option value="">优先级</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>

              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                  清除筛选
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-[var(--border)]"
                    checked={selectedRows.size === paginatedRules.length && paginatedRules.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="whitespace-nowrap px-3 py-2.5">序号</th>
                <th className="whitespace-nowrap px-3 py-2.5">规则名称</th>
                <th className="whitespace-nowrap px-3 py-2.5">阶段</th>
                <th className="whitespace-nowrap px-3 py-2.5">优先级</th>
                <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">7天命中</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">命中率</th>
                <th className="whitespace-nowrap px-3 py-2.5">最近触发</th>
                <th className="whitespace-nowrap px-3 py-2.5">创建人</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[13px] text-[var(--muted)]">暂无匹配的规则</td>
                </tr>
              ) : (
                paginatedRules.map((rule) => (
                  <Fragment key={rule.id}>
                    <tr
                    className={cn(
                      'group cursor-pointer transition-colors',
                      expandedRule === rule.id ? 'bg-[var(--surface-subtle)]' : 'hover:bg-[var(--surface-subtle)]'
                    )}
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-[var(--border)]"
                        checked={selectedRows.has(rule.id)}
                        onChange={() => toggleRow(rule.id)}
                        aria-label={`Select ${rule.name}`}
                      />
                    </td>

                    {/* Order number */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="text-[12px] font-mono text-[var(--muted)]">{rule.order}</span>
                    </td>

                    {/* Rule name + description + ID */}
                    <td className="px-3 py-3 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">{rule.name}</span>
                        <span className="text-[10px] text-[var(--muted)] font-mono">{rule.id}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate max-w-[320px]">{rule.description}</div>
                    </td>

                    {/* Stage */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', stageConfig[rule.stage].color)}>
                        {stageConfig[rule.stage].label}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px] font-medium', priorityConfig[rule.priority].color)}>
                        {priorityConfig[rule.priority].label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('inline-block size-2 rounded-full', statusConfig[rule.status].dot)}></span>
                        <span className="text-[12px] text-[var(--foreground)]">{statusConfig[rule.status].label}</span>
                      </div>
                    </td>

                    {/* Hit count */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-mono text-[var(--foreground)]">
                      {rule.hitCount7d.toLocaleString()}
                    </td>

                    {/* Hit rate */}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-mono text-[var(--foreground)]">
                      {rule.hitRate}
                    </td>

                    {/* Last triggered */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                      {rule.lastTriggered}
                    </td>

                    {/* Created by */}
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                      {rule.createdBy}
                    </td>

                    {/* Expand icon */}
                    <td className="px-3 py-3 text-right">
                      <button className="inline-flex size-7 items-center justify-center rounded-md opacity-0 transition hover:bg-[var(--surface-hover)] group-hover:opacity-100">
                        <Settings2 className="size-4 text-[var(--muted)]" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedRule === rule.id && (
                    <tr>
                      <td colSpan={11} className="border-b border-[var(--border-subtle)] bg-[var(--background)] px-4 py-4">
                        {/* Conditions + Actions */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-[12px] font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1">
                              <Info className="size-3.5 text-blue-500" />触发条件 (AND)
                            </h4>
                            <ul className="space-y-1.5">
                              {rule.conditions.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--foreground)]">
                                  <span className="mt-0.5 inline-block size-1.5 rounded-full bg-blue-400 shrink-0"></span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-[12px] font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1">
                              <ArrowRight className="size-3.5 text-green-500" />执行动作
                            </h4>
                            <ul className="space-y-1.5">
                              {rule.actions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--foreground)]">
                                  <span className="mt-0.5 inline-block size-1.5 rounded-full bg-green-400 shrink-0"></span>{a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* 最近命中记录 */}
                        {rule.hitRecords.length > 0 && (
                          <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                            <h4 className="text-[12px] font-semibold text-[var(--foreground)] mb-2">最近命中记录</h4>
                            <div className="overflow-hidden rounded-md border border-[var(--border-subtle)]">
                              <table className="w-full text-[11px]">
                                <thead className="bg-[var(--surface-subtle)]">
                                  <tr>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">时间</th>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">单号</th>
                                    <th className="px-2.5 py-1.5 text-left font-medium text-[var(--muted-foreground)]">执行结果</th>
                                    <th className="px-2.5 py-1.5 text-right font-medium text-[var(--muted-foreground)]">耗时</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                  {rule.hitRecords.map((record, i) => (
                                    <tr key={i}>
                                      <td className="px-2.5 py-1.5 text-[var(--muted)]">{record.time}</td>
                                      <td className="px-2.5 py-1.5 font-mono text-[var(--foreground)]">{record.orderNo}</td>
                                      <td className="px-2.5 py-1.5 text-[var(--foreground)]">{record.action}</td>
                                      <td className="px-2.5 py-1.5 text-right font-mono text-[var(--muted)]">{record.duration}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 关联单据 */}
                        {rule.relatedOrders.length > 0 && (
                          <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                            <h4 className="text-[12px] font-semibold text-[var(--foreground)] mb-2">关联单据</h4>
                            <div className="flex flex-wrap gap-2">
                              {rule.relatedOrders.map((order) => (
                                <span key={order.id} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px]">
                                  <span className="font-mono text-[var(--foreground)]">{order.orderNo}</span>
                                  <span className="text-[var(--muted)]">{order.time}</span>
                                  <span className={cn(
                                    'rounded px-1 py-0.5 text-[10px] font-medium',
                                    order.result.includes('挂起') ? 'bg-amber-50 text-amber-700' :
                                    order.result.includes('拆单') ? 'bg-indigo-50 text-indigo-700' :
                                    'bg-green-50 text-green-700'
                                  )}>{order.result}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-6 text-[11px] text-[var(--muted)] border-t border-[var(--border-subtle)] pt-3">
                          <span>创建时间: {rule.createdAt}</span>
                          <span>最后更新: {rule.updatedAt}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {rule.status === 'active' ? (
                            <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                              <Pause className="size-3.5" /> 停用
                            </button>
                          ) : (
                            <button className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-[12px] text-white hover:bg-green-700">
                              <Play className="size-3.5" /> 启用
                            </button>
                          )}
                          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                            <Settings2 className="size-3.5" /> 编辑
                          </button>
                          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
                            <Copy className="size-3.5" /> 复制
                          </button>
                          <button className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50">
                            <Trash2 className="size-3.5" /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer — sticky bottom (matching orders page) */}
        <div className="sticky -bottom-5 lg:-bottom-6 z-20 flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pb-[calc(0.625rem+20px)] lg:pb-[calc(0.625rem+24px)] text-[13px] text-[var(--muted)]">
          <span>共 {filteredRules.length} 条规则</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">每页</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] text-[var(--foreground)]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[12px]">条</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="px-1 text-[12px] text-[var(--foreground)]">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-[12px] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <div className="ml-2 flex items-center gap-1">
                <span className="text-[12px]">跳至</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = Math.max(1, Math.min(totalPages, Number(jumpPage)));
                      setCurrentPage(p);
                      setJumpPage(String(p));
                    }
                  }}
                  className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-center text-[12px] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
                <span className="text-[12px]">页</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
