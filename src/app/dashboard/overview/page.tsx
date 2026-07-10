'use client';

import { useState } from 'react';
import { ChevronRight, RefreshCw, Info, X, Check, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellState } from '@/components/providers/shell-state-provider';
import { getCompanyById, getMerchantByScope } from '@/lib/tenant-context';

// ─── Types ───
type ChannelTab = 'all' | 'amazon' | 'tiktok' | 'shopify';
type MetricItem = { label: string; value: string; subValue?: string; trend?: string; trendDir?: 'up' | 'down' | 'neutral' };
type TopProduct = { rank: number; name: string; sales: string; revenue: string; change: string; changeDir: 'up' | 'down' | 'neutral' };

// ─── Onboarding Steps (Two Flows) ───
const onboardingFlow1 = [
  { id: 1, label: '授权店铺', done: true },
  { id: 2, label: '创建商品库存', done: true },
  { id: 3, label: '平台商品匹配', done: false },
  { id: 4, label: '海外仓编码匹配', done: false },
];

const onboardingFlow2 = [
  { id: 1, label: '订单发货', done: false },
  { id: 2, label: '库存初始化', done: false },
  { id: 3, label: '物品运输维护', done: false },
  { id: 4, label: '仓库信息维护', done: false },
  { id: 5, label: '运输方式维护', done: false },
];

// ─── Mock Data ───
const channelTabs: { key: ChannelTab; label: string }[] = [
  { key: 'all', label: '全部渠道' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'shopify', label: 'Shopify' },
];

const targetOrderMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '今日新订单', value: '221' },
    { label: '待审核', value: '8' },
    { label: '待分仓', value: '79' },
    { label: '待发货', value: '29' },
    { label: '异常订单', value: '20' },
  ],
  amazon: [
    { label: '今日新订单', value: '86' },
    { label: '待审核', value: '3' },
    { label: '待分仓', value: '24' },
    { label: '待发货 (SLA剩余<12h)', value: '12' },
    { label: 'Pending订单', value: '9' },
  ],
  tiktok: [
    { label: '今日新订单', value: '74' },
    { label: '待审核', value: '2' },
    { label: '待分仓', value: '31' },
    { label: '待发货 (48h倒计时)', value: '11' },
    { label: '取消/退款中', value: '6' },
  ],
  shopify: [
    { label: '今日新订单', value: '61' },
    { label: '待审核', value: '3' },
    { label: '待分仓', value: '24' },
    { label: '待发货', value: '6' },
    { label: '退款待处理', value: '5' },
  ],
};

const realtimeMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '实时销售额', value: '$12,842.60', subValue: '客单价: $6.97' },
    { label: '订单量 (已付款)', value: '1,842', subValue: '转化率: 3.2%' },
    { label: '已发货件数', value: '3,246', subValue: '发货率: 94.6%' },
  ],
  amazon: [
    { label: '实时销售额', value: '$4,820.00', subValue: '客单价: $9.20' },
    { label: '订单量 (已付款)', value: '524', subValue: 'Buy Box占有率: 86%' },
    { label: '已发货件数', value: '1,048', subValue: 'Late Shipment Rate: 1.2%' },
  ],
  tiktok: [
    { label: '实时销售额', value: '$3,680.00', subValue: '客单价: $6.80' },
    { label: '订单量 (已付款)', value: '542', subValue: '48h发货率: 92%' },
    { label: '已发货件数', value: '892', subValue: '取消率: 2.1%' },
  ],
  shopify: [
    { label: '实时销售额', value: '$4,342.60', subValue: '客单价: $8.40' },
    { label: '订单量 (已付款)', value: '776', subValue: '复购率: 18%' },
    { label: '已发货件数', value: '1,306', subValue: '退款率: 1.4%' },
  ],
};

const salesTrendMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '周期销售额', value: '$8,420.00', subValue: '日均: $1,203' },
    { label: '周期订单量', value: '642', subValue: '日均: 92单' },
    { label: '周期发货量', value: '1,284', subValue: '日均: 184件' },
  ],
  amazon: [
    { label: '周期销售额', value: '$3,210.00', subValue: '日均: $458' },
    { label: '周期订单量', value: '248', subValue: 'ODR: 0.8% ✓' },
    { label: '周期发货量', value: '496', subValue: 'VTR: 0.3% ✓' },
  ],
  tiktok: [
    { label: '周期销售额', value: '$2,180.00', subValue: '日均: $311' },
    { label: '周期订单量', value: '186', subValue: '体验分: 4.8' },
    { label: '周期发货量', value: '372', subValue: '揽收及时率: 95%' },
  ],
  shopify: [
    { label: '周期销售额', value: '$3,030.00', subValue: '日均: $433' },
    { label: '周期订单量', value: '208', subValue: '弃单挽回: 12单' },
    { label: '周期发货量', value: '416', subValue: '物流满意度: 96%' },
  ],
};

const topProducts: Record<ChannelTab, TopProduct[]> = {
  all: [
    { rank: 1, name: 'GBT6088', sales: '$2,031', revenue: '8%', change: '$0.02', changeDir: 'up' },
    { rank: 2, name: 'ZT约大引', sales: '$2,031', revenue: '8%', change: '$0.01', changeDir: 'up' },
    { rank: 3, name: 'LSG2702', sales: '$2,031', revenue: '8%', change: '$0.00', changeDir: 'neutral' },
    { rank: 4, name: '中门创通', sales: '$2,031', revenue: '8%', change: '$0.00', changeDir: 'neutral' },
    { rank: 5, name: 'Smart Watch', sales: '$1,892', revenue: '7%', change: '$0.01', changeDir: 'up' },
  ],
  amazon: [
    { rank: 1, name: 'GBT6088 (FBA)', sales: '$1,420', revenue: '12%', change: '$0.05', changeDir: 'up' },
    { rank: 2, name: 'Smart Watch Pro', sales: '$1,180', revenue: '10%', change: '$0.03', changeDir: 'up' },
    { rank: 3, name: 'LED Strip Light', sales: '$980', revenue: '8%', change: '$0.01', changeDir: 'up' },
    { rank: 4, name: 'Phone Case X15', sales: '$860', revenue: '7%', change: '$0.00', changeDir: 'neutral' },
    { rank: 5, name: 'USB-C Hub 7in1', sales: '$720', revenue: '6%', change: '-$0.01', changeDir: 'down' },
  ],
  tiktok: [
    { rank: 1, name: 'Beauty Blender Set', sales: '$1,680', revenue: '14%', change: '$0.08', changeDir: 'up' },
    { rank: 2, name: 'ZT约大引', sales: '$1,240', revenue: '10%', change: '$0.04', changeDir: 'up' },
    { rank: 3, name: 'Mini Fan Portable', sales: '$960', revenue: '8%', change: '$0.02', changeDir: 'up' },
    { rank: 4, name: 'Phone Holder Car', sales: '$840', revenue: '7%', change: '$0.01', changeDir: 'up' },
    { rank: 5, name: 'Nail Art Kit', sales: '$680', revenue: '6%', change: '$0.00', changeDir: 'neutral' },
  ],
  shopify: [
    { rank: 1, name: 'LSG2702 Premium', sales: '$1,520', revenue: '11%', change: '$0.03', changeDir: 'up' },
    { rank: 2, name: 'Yoga Mat Pro', sales: '$1,280', revenue: '9%', change: '$0.02', changeDir: 'up' },
    { rank: 3, name: '中门创通 Deluxe', sales: '$1,060', revenue: '8%', change: '$0.01', changeDir: 'up' },
    { rank: 4, name: 'Desk Organizer', sales: '$920', revenue: '7%', change: '$0.00', changeDir: 'neutral' },
    { rank: 5, name: 'Water Bottle 1L', sales: '$780', revenue: '6%', change: '-$0.01', changeDir: 'down' },
  ],
};

const adMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '广告花费 ($)', value: '2,340.00', subValue: '环比: 2%' },
    { label: '广告销售额 ($)', value: '8,920.00', subValue: '环比: 5%' },
    { label: '广告订单量', value: '186', subValue: '环比: 3%' },
    { label: '曝光点击', value: '42,800', subValue: '环比: 8%' },
    { label: '点击量', value: '3,240', subValue: '环比: 4%' },
    { label: 'ACOS (%)', value: '26.23', subValue: '环比: -1%' },
  ],
  amazon: [
    { label: 'SP花费 ($)', value: '1,420.00', subValue: '环比: 3%' },
    { label: 'SP销售额 ($)', value: '5,480.00', subValue: '环比: 6%' },
    { label: 'SP订单量', value: '98', subValue: '环比: 4%' },
    { label: '曝光量', value: '28,600', subValue: '环比: 10%' },
    { label: '点击量', value: '2,180', subValue: 'CPC: $0.65' },
    { label: 'ACOS (%)', value: '25.91', subValue: '目标: <30%' },
  ],
  tiktok: [
    { label: '广告花费 ($)', value: '620.00', subValue: '环比: 8%' },
    { label: '广告GMV ($)', value: '2,480.00', subValue: '环比: 12%' },
    { label: '广告订单量', value: '52', subValue: '环比: 10%' },
    { label: '曝光量', value: '86,400', subValue: '环比: 15%' },
    { label: '点击量', value: '4,820', subValue: 'CTR: 5.6%' },
    { label: 'ROI', value: '4.0', subValue: '环比: +5%' },
  ],
  shopify: [
    { label: 'Google Ads ($)', value: '480.00', subValue: '环比: 2%' },
    { label: 'Meta Ads ($)', value: '320.00', subValue: '环比: 3%' },
    { label: '广告转化订单', value: '36', subValue: '环比: 5%' },
    { label: '曝光量', value: '32,400', subValue: '环比: 6%' },
    { label: '点击量', value: '1,860', subValue: 'CPC: $0.43' },
    { label: 'ROAS', value: '3.86', subValue: '环比: +2%' },
  ],
};

const todaySalesMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '今日订单量', value: '142', subValue: '环比: +12.0%' },
    { label: '今日销售额 ($)', value: '1,842.00', subValue: '环比: +8.5%' },
    { label: '今日出库单', value: '38', subValue: '环比: +5.0%' },
    { label: '今日发货金额 ($)', value: '486.00', subValue: '环比: +6.2%' },
  ],
  amazon: [
    { label: '今日订单量', value: '52', subValue: '环比: +15.0%' },
    { label: '今日销售额 ($)', value: '724.00', subValue: '环比: +11.2%' },
    { label: 'FBA订单占比', value: '78%', subValue: '环比: +2.0%' },
    { label: 'FBM待发货', value: '12', subValue: 'SLA剩余 <8h: 4单' },
  ],
  tiktok: [
    { label: '今日订单量', value: '48', subValue: '环比: +18.0%' },
    { label: '今日销售额 ($)', value: '612.00', subValue: '环比: +9.8%' },
    { label: '已揽收', value: '36', subValue: '揽收率: 92%' },
    { label: '48h即将超时', value: '5', subValue: '需立即处理' },
  ],
  shopify: [
    { label: '今日订单量', value: '42', subValue: '环比: +6.0%' },
    { label: '今日销售额 ($)', value: '506.00', subValue: '环比: +4.2%' },
    { label: '今日出库单', value: '38', subValue: '环比: +5.0%' },
    { label: '弃单待挽回', value: '8', subValue: '挽回率: 15%' },
  ],
};

const todayAdMetrics: Record<ChannelTab, MetricItem[]> = {
  all: [
    { label: '广告花费 ($)', value: '342.00', subValue: '环比: +2.5%' },
    { label: '广告销售额 ($)', value: '1,280.00', subValue: '环比: +4.0%' },
    { label: '广告订单量', value: '42', subValue: '环比: +5.0%' },
    { label: 'ACOS', value: '26.7%', subValue: '环比: -1.3%' },
    { label: 'ROAS', value: '3.74', subValue: '环比: +0.8%' },
    { label: 'TACoS', value: '8.2%', subValue: '环比: -0.4%' },
  ],
  amazon: [
    { label: 'SP花费 ($)', value: '186.00', subValue: '环比: +3.0%' },
    { label: 'SP销售额 ($)', value: '720.00', subValue: '环比: +5.2%' },
    { label: 'SP ACOS', value: '25.8%', subValue: '目标: <30%' },
    { label: 'SD花费 ($)', value: '64.00', subValue: '环比: +1.2%' },
    { label: 'SB花费 ($)', value: '48.00', subValue: '环比: -2.0%' },
    { label: 'TACoS', value: '7.6%', subValue: '环比: -0.5%' },
  ],
  tiktok: [
    { label: '广告花费 ($)', value: '92.00', subValue: '环比: +8.0%' },
    { label: '广告GMV ($)', value: '460.00', subValue: '环比: +12.0%' },
    { label: '广告订单', value: '18', subValue: '环比: +10.0%' },
    { label: 'CPA ($)', value: '5.11', subValue: '环比: -3.0%' },
    { label: 'ROI', value: '5.0', subValue: '环比: +4.0%' },
    { label: 'CPM ($)', value: '6.82', subValue: '环比: +1.2%' },
  ],
  shopify: [
    { label: 'Google Ads ($)', value: '78.00', subValue: '环比: +2.0%' },
    { label: 'Meta Ads ($)', value: '52.00', subValue: '环比: +3.5%' },
    { label: '广告转化订单', value: '12', subValue: '转化率: 2.8%' },
    { label: 'CPC ($)', value: '0.86', subValue: '环比: -1.0%' },
    { label: 'ROAS', value: '3.9', subValue: '环比: +2.0%' },
    { label: 'CAC ($)', value: '10.83', subValue: '环比: -4.0%' },
  ],
};

const inventoryRanges: Record<ChannelTab, { label: string; count: number }[]> = {
  all: [
    { label: 'FBA库存 (件)', count: 3580 },
    { label: '海外仓库存 (件)', count: 2410 },
    { label: '国内待发 (件)', count: 890 },
  ],
  amazon: [
    { label: 'FBA可售库存', count: 3580 },
    { label: 'FBA在途', count: 1240 },
    { label: 'FBA不可售', count: 86 },
  ],
  tiktok: [
    { label: '平台仓库存', count: 1860 },
    { label: '商家自发库存', count: 920 },
    { label: '在途补货', count: 480 },
  ],
  shopify: [
    { label: '海外仓可用', count: 2410 },
    { label: '国内待发', count: 890 },
    { label: '预留库存', count: 320 },
  ],
};

const agingRanges: Record<ChannelTab, { label: string; qty: number; label2: string; qty2: number }[]> = {
  all: [
    { label: '0-30天', qty: 842, label2: '31-60天', qty2: 326 },
    { label: '61-90天', qty: 148, label2: '91-180天', qty2: 89 },
    { label: '181-270天', qty: 42, label2: '271-365天', qty2: 18 },
    { label: '>365天', qty: 7, label2: '', qty2: 0 },
  ],
  amazon: [
    { label: '0-30天', qty: 520, label2: '31-60天', qty2: 210 },
    { label: '61-90天', qty: 98, label2: '91-180天', qty2: 62 },
    { label: '181-270天', qty: 28, label2: '271-365天', qty2: 12 },
    { label: '>365天', qty: 4, label2: '', qty2: 0 },
  ],
  tiktok: [
    { label: '0-30天', qty: 186, label2: '31-60天', qty2: 68 },
    { label: '61-90天', qty: 24, label2: '91-180天', qty2: 12 },
    { label: '181-270天', qty: 6, label2: '271-365天', qty2: 2 },
    { label: '>365天', qty: 1, label2: '', qty2: 0 },
  ],
  shopify: [
    { label: '0-30天', qty: 136, label2: '31-60天', qty2: 48 },
    { label: '61-90天', qty: 26, label2: '91-180天', qty2: 15 },
    { label: '181-270天', qty: 8, label2: '271-365天', qty2: 4 },
    { label: '>365天', qty: 2, label2: '', qty2: 0 },
  ],
};

const operationRows: Record<ChannelTab, { label: string; qty: number; amount: string }[]> = {
  all: [
    { label: 'FBA在途', qty: 1240, amount: '$9,920.00' },
    { label: 'FBA可售库存', qty: 3580, amount: '$28,640.00' },
    { label: '海外仓可用', qty: 2410, amount: '$19,280.00' },
    { label: '今日出库', qty: 172, amount: '$1,377.00' },
    { label: '今日入库', qty: 890, amount: '$7,120.00' },
    { label: '在途补货', qty: 1205, amount: '$9,640.00' },
    { label: '总库存价值', qty: 9497, amount: '$75,977.00' },
  ],
  amazon: [
    { label: 'FBA在途', qty: 1240, amount: '$9,920.00' },
    { label: 'FBA可售', qty: 3580, amount: '$28,640.00' },
    { label: 'FBA不可售', qty: 86, amount: '$688.00' },
    { label: '今日FBA出库', qty: 98, amount: '$784.00' },
    { label: 'FBM待发货', qty: 12, amount: '$96.00' },
    { label: '补货计划中', qty: 860, amount: '$6,880.00' },
    { label: 'Amazon库存总值', qty: 4906, amount: '$39,248.00' },
  ],
  tiktok: [
    { label: '平台仓在库', qty: 1860, amount: '$14,880.00' },
    { label: '商家自发库存', qty: 920, amount: '$7,360.00' },
    { label: '今日揽收', qty: 36, amount: '$288.00' },
    { label: '今日出库', qty: 42, amount: '$336.00' },
    { label: '在途补货', qty: 480, amount: '$3,840.00' },
    { label: '退货在途', qty: 18, amount: '$144.00' },
    { label: 'TikTok库存总值', qty: 3260, amount: '$26,080.00' },
  ],
  shopify: [
    { label: '海外仓可用', qty: 2410, amount: '$19,280.00' },
    { label: '国内待发', qty: 890, amount: '$7,120.00' },
    { label: '预留库存', qty: 320, amount: '$2,560.00' },
    { label: '今日出库', qty: 32, amount: '$257.00' },
    { label: '今日入库', qty: 156, amount: '$1,248.00' },
    { label: '在途补货', qty: 420, amount: '$3,360.00' },
    { label: 'Shopify库存总值', qty: 3620, amount: '$28,960.00' },
  ],
};

// ─── Chart data for SVG rendering ───
const realtimeChartData: Record<ChannelTab, { hour: string; today: number; yesterday: number }[]> = {
  all: [
    { hour: '00:00', today: 120, yesterday: 80 },
    { hour: '01:00', today: 85, yesterday: 65 },
    { hour: '02:00', today: 60, yesterday: 45 },
    { hour: '03:00', today: 45, yesterday: 38 },
    { hour: '04:00', today: 52, yesterday: 42 },
    { hour: '05:00', today: 78, yesterday: 55 },
    { hour: '06:00', today: 142, yesterday: 98 },
    { hour: '07:00', today: 220, yesterday: 165 },
    { hour: '08:00', today: 340, yesterday: 280 },
    { hour: '09:00', today: 480, yesterday: 390 },
    { hour: '10:00', today: 560, yesterday: 445 },
    { hour: '11:00', today: 620, yesterday: 510 },
    { hour: '12:00', today: 680, yesterday: 540 },
    { hour: '13:00', today: 710, yesterday: 580 },
    { hour: '14:00', today: 740, yesterday: 620 },
    { hour: '15:00', today: 820, yesterday: 680 },
    { hour: '16:00', today: 860, yesterday: 720 },
    { hour: '17:00', today: 920, yesterday: 760 },
    { hour: '18:00', today: 880, yesterday: 740 },
    { hour: '19:00', today: 780, yesterday: 680 },
    { hour: '20:00', today: 640, yesterday: 560 },
    { hour: '21:00', today: 480, yesterday: 420 },
    { hour: '22:00', today: 320, yesterday: 280 },
    { hour: '23:00', today: 180, yesterday: 160 },
  ],
  amazon: [
    { hour: '00:00', today: 42, yesterday: 30 },
    { hour: '01:00', today: 28, yesterday: 22 },
    { hour: '02:00', today: 18, yesterday: 15 },
    { hour: '03:00', today: 12, yesterday: 10 },
    { hour: '04:00', today: 15, yesterday: 12 },
    { hour: '05:00', today: 25, yesterday: 18 },
    { hour: '06:00', today: 48, yesterday: 35 },
    { hour: '07:00', today: 82, yesterday: 60 },
    { hour: '08:00', today: 135, yesterday: 105 },
    { hour: '09:00', today: 195, yesterday: 150 },
    { hour: '10:00', today: 228, yesterday: 175 },
    { hour: '11:00', today: 252, yesterday: 200 },
    { hour: '12:00', today: 275, yesterday: 210 },
    { hour: '13:00', today: 290, yesterday: 225 },
    { hour: '14:00', today: 302, yesterday: 240 },
    { hour: '15:00', today: 335, yesterday: 265 },
    { hour: '16:00', today: 350, yesterday: 280 },
    { hour: '17:00', today: 375, yesterday: 295 },
    { hour: '18:00', today: 358, yesterday: 285 },
    { hour: '19:00', today: 315, yesterday: 260 },
    { hour: '20:00', today: 258, yesterday: 215 },
    { hour: '21:00', today: 192, yesterday: 160 },
    { hour: '22:00', today: 128, yesterday: 105 },
    { hour: '23:00', today: 68, yesterday: 58 },
  ],
  tiktok: [
    { hour: '00:00', today: 45, yesterday: 28 },
    { hour: '01:00', today: 32, yesterday: 22 },
    { hour: '02:00', today: 22, yesterday: 15 },
    { hour: '03:00', today: 18, yesterday: 14 },
    { hour: '04:00', today: 20, yesterday: 16 },
    { hour: '05:00', today: 28, yesterday: 20 },
    { hour: '06:00', today: 52, yesterday: 32 },
    { hour: '07:00', today: 75, yesterday: 55 },
    { hour: '08:00', today: 110, yesterday: 88 },
    { hour: '09:00', today: 155, yesterday: 120 },
    { hour: '10:00', today: 185, yesterday: 140 },
    { hour: '11:00', today: 210, yesterday: 165 },
    { hour: '12:00', today: 235, yesterday: 175 },
    { hour: '13:00', today: 248, yesterday: 190 },
    { hour: '14:00', today: 260, yesterday: 205 },
    { hour: '15:00', today: 285, yesterday: 220 },
    { hour: '16:00', today: 298, yesterday: 238 },
    { hour: '17:00', today: 320, yesterday: 252 },
    { hour: '18:00', today: 310, yesterday: 248 },
    { hour: '19:00', today: 275, yesterday: 225 },
    { hour: '20:00', today: 225, yesterday: 185 },
    { hour: '21:00', today: 168, yesterday: 140 },
    { hour: '22:00', today: 112, yesterday: 95 },
    { hour: '23:00', today: 65, yesterday: 55 },
  ],
  shopify: [
    { hour: '00:00', today: 33, yesterday: 22 },
    { hour: '01:00', today: 25, yesterday: 21 },
    { hour: '02:00', today: 20, yesterday: 15 },
    { hour: '03:00', today: 15, yesterday: 14 },
    { hour: '04:00', today: 17, yesterday: 14 },
    { hour: '05:00', today: 25, yesterday: 17 },
    { hour: '06:00', today: 42, yesterday: 31 },
    { hour: '07:00', today: 63, yesterday: 50 },
    { hour: '08:00', today: 95, yesterday: 87 },
    { hour: '09:00', today: 130, yesterday: 120 },
    { hour: '10:00', today: 147, yesterday: 130 },
    { hour: '11:00', today: 158, yesterday: 145 },
    { hour: '12:00', today: 170, yesterday: 155 },
    { hour: '13:00', today: 172, yesterday: 165 },
    { hour: '14:00', today: 178, yesterday: 175 },
    { hour: '15:00', today: 200, yesterday: 195 },
    { hour: '16:00', today: 212, yesterday: 202 },
    { hour: '17:00', today: 225, yesterday: 213 },
    { hour: '18:00', today: 212, yesterday: 207 },
    { hour: '19:00', today: 190, yesterday: 195 },
    { hour: '20:00', today: 157, yesterday: 160 },
    { hour: '21:00', today: 120, yesterday: 120 },
    { hour: '22:00', today: 80, yesterday: 80 },
    { hour: '23:00', today: 47, yesterday: 47 },
  ],
};

const trendChartData: Record<ChannelTab, { date: string; value: number }[]> = {
  all: [
    { date: '06-19', value: 4200 },
    { date: '06-20', value: 3800 },
    { date: '06-21', value: 5100 },
    { date: '06-22', value: 4600 },
    { date: '06-23', value: 6200 },
    { date: '06-24', value: 5800 },
    { date: '06-25', value: 7100 },
    { date: '06-26', value: 6400 },
    { date: '06-27', value: 7800 },
    { date: '06-28', value: 8200 },
    { date: '06-29', value: 7400 },
    { date: '06-30', value: 8600 },
    { date: '07-01', value: 9100 },
  ],
  amazon: [
    { date: '06-19', value: 1680 },
    { date: '06-20', value: 1520 },
    { date: '06-21', value: 2040 },
    { date: '06-22', value: 1840 },
    { date: '06-23', value: 2480 },
    { date: '06-24', value: 2320 },
    { date: '06-25', value: 2840 },
    { date: '06-26', value: 2560 },
    { date: '06-27', value: 3120 },
    { date: '06-28', value: 3280 },
    { date: '06-29', value: 2960 },
    { date: '06-30', value: 3440 },
    { date: '07-01', value: 3640 },
  ],
  tiktok: [
    { date: '06-19', value: 1260 },
    { date: '06-20', value: 1140 },
    { date: '06-21', value: 1530 },
    { date: '06-22', value: 1380 },
    { date: '06-23', value: 1860 },
    { date: '06-24', value: 1740 },
    { date: '06-25', value: 2130 },
    { date: '06-26', value: 1920 },
    { date: '06-27', value: 2340 },
    { date: '06-28', value: 2460 },
    { date: '06-29', value: 2220 },
    { date: '06-30', value: 2580 },
    { date: '07-01', value: 2730 },
  ],
  shopify: [
    { date: '06-19', value: 1260 },
    { date: '06-20', value: 1140 },
    { date: '06-21', value: 1530 },
    { date: '06-22', value: 1380 },
    { date: '06-23', value: 1860 },
    { date: '06-24', value: 1740 },
    { date: '06-25', value: 2130 },
    { date: '06-26', value: 1920 },
    { date: '06-27', value: 2340 },
    { date: '06-28', value: 2460 },
    { date: '06-29', value: 2220 },
    { date: '06-30', value: 2580 },
    { date: '07-01', value: 2730 },
  ],
};

const adChartData: Record<ChannelTab, { date: string; spend: number; sales: number }[]> = {
  all: [
    { date: '06-19', spend: 280, sales: 1120 },
    { date: '06-20', spend: 310, sales: 980 },
    { date: '06-21', spend: 260, sales: 1340 },
    { date: '06-22', spend: 340, sales: 1480 },
    { date: '06-23', spend: 290, sales: 1260 },
    { date: '06-24', spend: 380, sales: 1620 },
    { date: '06-25', spend: 320, sales: 1380 },
    { date: '06-26', spend: 350, sales: 1520 },
    { date: '06-27', spend: 410, sales: 1740 },
    { date: '06-28', spend: 380, sales: 1680 },
    { date: '06-29', spend: 360, sales: 1580 },
    { date: '06-30', spend: 420, sales: 1820 },
    { date: '07-01', spend: 440, sales: 1920 },
  ],
  amazon: [
    { date: '06-19', spend: 165, sales: 680 },
    { date: '06-20', spend: 182, sales: 590 },
    { date: '06-21', spend: 148, sales: 820 },
    { date: '06-22', spend: 198, sales: 890 },
    { date: '06-23', spend: 170, sales: 760 },
    { date: '06-24', spend: 225, sales: 980 },
    { date: '06-25', spend: 188, sales: 840 },
    { date: '06-26', spend: 205, sales: 920 },
    { date: '06-27', spend: 242, sales: 1050 },
    { date: '06-28', spend: 225, sales: 1020 },
    { date: '06-29', spend: 212, sales: 960 },
    { date: '06-30', spend: 248, sales: 1100 },
    { date: '07-01', spend: 260, sales: 1160 },
  ],
  tiktok: [
    { date: '06-19', spend: 68, sales: 320 },
    { date: '06-20', spend: 75, sales: 280 },
    { date: '06-21', spend: 62, sales: 380 },
    { date: '06-22', spend: 82, sales: 420 },
    { date: '06-23', spend: 70, sales: 360 },
    { date: '06-24', spend: 92, sales: 460 },
    { date: '06-25', spend: 78, sales: 390 },
    { date: '06-26', spend: 85, sales: 430 },
    { date: '06-27', spend: 98, sales: 490 },
    { date: '06-28', spend: 92, sales: 470 },
    { date: '06-29', spend: 88, sales: 445 },
    { date: '06-30', spend: 102, sales: 520 },
    { date: '07-01', spend: 108, sales: 548 },
  ],
  shopify: [
    { date: '06-19', spend: 47, sales: 120 },
    { date: '06-20', spend: 53, sales: 110 },
    { date: '06-21', spend: 50, sales: 140 },
    { date: '06-22', spend: 60, sales: 170 },
    { date: '06-23', spend: 50, sales: 140 },
    { date: '06-24', spend: 63, sales: 180 },
    { date: '06-25', spend: 54, sales: 150 },
    { date: '06-26', spend: 60, sales: 170 },
    { date: '06-27', spend: 70, sales: 200 },
    { date: '06-28', spend: 63, sales: 190 },
    { date: '06-29', spend: 60, sales: 175 },
    { date: '06-30', spend: 70, sales: 200 },
    { date: '07-01', spend: 72, sales: 212 },
  ],
};

// ─── SVG Line Chart Component ───
function LineChart({ data, height = 160, colors = ['#3b82f6', '#94a3b8'] }: {
  data: { labels: string[]; series: number[][] };
  height?: number;
  colors?: string[];
}) {
  const width = 600;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = data.series.flat();
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const getX = (i: number) => padding.left + (i / (data.labels.length - 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const buildPath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');

  const buildArea = (series: number[]) =>
    buildPath(series) + ` L ${getX(series.length - 1).toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

  // Y axis labels
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range / yTicks) * i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yLabels.map((v, i) => (
        <line key={i} x1={padding.left} x2={width - padding.right} y1={getY(v)} y2={getY(v)} stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="3,3" />
      ))}
      {/* Y axis labels */}
      {yLabels.map((v, i) => (
        <text key={i} x={padding.left - 5} y={getY(v) + 3} textAnchor="end" fill="var(--muted)" fontSize={9}>{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}</text>
      ))}
      {/* Series */}
      {data.series.map((series, si) => (
        <g key={si}>
          <path d={buildArea(series)} fill={colors[si]} opacity={0.08} />
          <path d={buildPath(series)} fill="none" stroke={colors[si]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {/* X axis labels */}
      {data.labels.filter((_, i) => i % Math.ceil(data.labels.length / 8) === 0).map((label, i, arr) => (
        <text key={i} x={getX(i * Math.ceil(data.labels.length / 8))} y={height - 4} textAnchor="middle" fill="var(--muted)" fontSize={9}>{label}</text>
      ))}
    </svg>
  );
}

// ─── SVG Bar Chart Component ───
function BarChart({ data, height = 160 }: { data: { labels: string[]; values: number[]; values2?: number[] }; height?: number }) {
  const width = 600;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.values, ...(data.values2 || []), 1);
  const barWidth = chartW / data.labels.length * 0.6;
  const gap = chartW / data.labels.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line key={i} x1={padding.left} x2={width - padding.right} y1={padding.top + chartH * (1 - pct)} y2={padding.top + chartH * (1 - pct)} stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="3,3" />
      ))}
      {/* Bars */}
      {data.values.map((v, i) => {
        const barH = (v / maxVal) * chartH;
        const x = padding.left + i * gap + (gap - barWidth) / 2;
        return (
          <g key={i}>
            <rect x={x} y={padding.top + chartH - barH} width={data.values2 ? barWidth / 2 : barWidth} height={barH} fill="#3b82f6" rx={2} opacity={0.8} />
            {data.values2 && (
              <rect x={x + barWidth / 2} y={padding.top + chartH - (data.values2[i] / maxVal) * chartH} width={barWidth / 2} height={(data.values2[i] / maxVal) * chartH} fill="#f97316" rx={2} opacity={0.8} />
            )}
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fill="var(--muted)" fontSize={8}>{data.labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Metric Card ───
function MetricCard({ item }: { item: MetricItem }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--muted)] truncate">{item.label}</div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">{item.value}</div>
      {item.subValue && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{item.subValue}</div>}
    </div>
  );
}

// ─── Section Header ───
function SectionHeader({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{title}</h3>
        <Info className="size-3.5 text-[var(--muted)]" />
        <ChevronRight className="size-3.5 text-[var(--muted)]" />
      </div>
      {extra}
    </div>
  );
}

// ─── Onboarding Wizard Component ───
function OnboardingWizard({ onDismiss }: { onDismiss: () => void }) {
  const [activeFlow, setActiveFlow] = useState<'products' | 'orders'>('products');
  const currentSteps = activeFlow === 'products' ? onboardingFlow1 : onboardingFlow2;
  const finalLabel = activeFlow === 'products' ? '商品补货' : '完成发货';

  return (
    <section className="mx-5 mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">核心C段指南</h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            为了快速启用跨境ERP全部功能，请按以下步骤完成基础配置。完成后系统将自动同步多平台数据，助您高效管理订单与库存。
          </p>
        </div>
        <button onClick={onDismiss} className="flex size-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
          <X className="size-4" />
        </button>
      </div>

      {/* Flow Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setActiveFlow('products')}
          className={cn('text-[13px] font-medium transition-colors', activeFlow === 'products' ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}
        >
          商品经营配置
        </button>
        <button
          onClick={() => setActiveFlow('orders')}
          className={cn('text-[13px] font-medium transition-colors', activeFlow === 'orders' ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]')}
        >
          订单发货流程
        </button>
        <a href="#" className="ml-auto text-[12px] text-[var(--primary)] hover:underline">查看帮助文档</a>
      </div>

      {/* Checklist */}
      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <div className="text-[12px] font-medium text-blue-800 mb-2">
          {activeFlow === 'products' ? '商品管理 · 多平台商品同步配置' : '订单履约 · 自动化发货流程'}
        </div>
        <ol className="space-y-1 text-[11px] text-blue-700 list-decimal list-inside">
          {activeFlow === 'products' ? (
            <>
              <li>授权店铺后，系统自动拉取各平台商品列表并关联至本地商品库。</li>
              <li>支持批量导入SKU、条码等信息，快速建立统一商品档案。</li>
              <li>将本地商品与各平台Listing进行匹配，确保库存同步准确。</li>
              <li>配置海外仓SKU编码映射，实现仓库与平台库存自动联动。</li>
            </>
          ) : (
            <>
              <li>订单从多平台自动同步至ERP，统一管理待处理订单。</li>
              <li>根据库存分布和物流规则，自动分配发货仓库。</li>
              <li>系统自动推送出库单至WMS，触发仓库拣货打包流程。</li>
              <li>发货后自动回传物流单号至各平台，完成履约闭环。</li>
            </>
          )}
        </ol>
      </div>

      {/* Steps Progress - Single Row */}
      <div className="flex items-center justify-between">
        {currentSteps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-xl text-[12px] font-semibold transition-all',
                step.done
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                  : 'bg-[var(--surface-subtle)] text-[var(--muted)] ring-1 ring-[var(--border)]'
              )}>
                {step.done ? <Check className="size-4" /> : <Store className="size-4" />}
              </div>
              <div className="mt-2 text-[11px] font-medium text-[var(--foreground)]">第{['一', '二', '三', '四', '五'][i]}步</div>
              <div className="text-[10px] text-[var(--muted)]">{step.label}</div>
            </div>
            {i < currentSteps.length - 1 && (
              <div className="mx-2 flex items-center">
                <span className={cn('text-[16px] tracking-[-2px]', step.done ? 'text-cyan-400' : 'text-[var(--border)]')}>{'》》》'}</span>
              </div>
            )}
          </div>
        ))}
        {/* Final flag */}
        <div className="flex items-center">
          <div className="mx-2"><span className="text-[16px] tracking-[-2px] text-[var(--border)]">{'》》》'}</span></div>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-[var(--muted)]">
              <span className="text-[16px]">🚩</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--foreground)]">{finalLabel}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Store Binding Page (Onboarding Step 1) ───
function StoreBindingPage({ onComplete }: { onComplete: () => void }) {
  const platforms = [
    { name: 'Amazon', desc: '授权绑定您的Amazon店铺', icon: '🛒', connected: true, accent: 'border-red-500' },
    { name: 'Shopify', desc: '连接您的Shopify独立站', icon: '🛍️', connected: false, accent: '' },
    { name: 'TEMU半托管', desc: '接入TEMU半托管模式', icon: '📦', connected: false, accent: '' },
    { name: 'TikTok', desc: '绑定TikTok Shop店铺', icon: '🎵', connected: false, accent: '' },
    { name: '更多平台', desc: '稍后开通更多渠道', icon: '➕', connected: false, accent: '' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center pt-16 px-5">
      <h1 className="text-[28px] font-bold text-white mb-8">一键绑定店铺，立即开启您的跨境业务！</h1>

      <div className="w-full max-w-[900px] bg-slate-800 rounded-2xl p-8 border border-slate-700">
        <h2 className="text-[16px] font-semibold text-white mb-2">第一步，绑定你的店铺</h2>
        <p className="text-[13px] text-slate-400 mb-2">
          只需选择平台并完成OAuth授权，系统将自动同步您的商品、订单和库存数据，无需手动导入。
        </p>
        <p className="text-[12px] text-slate-500 mb-6">
          支持多店铺同时管理，后续可随时在「设置 → 店铺管理」中添加或解绑店铺。
        </p>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {platforms.map((p) => (
            <div key={p.name} className={cn(
              'flex flex-col items-center rounded-xl border-2 p-4 transition-all cursor-pointer hover:border-slate-500',
              p.connected ? 'border-red-500 bg-slate-700' : 'border-slate-600 bg-slate-750'
            )}>
              <div className="text-[32px] mb-2">{p.icon}</div>
              <div className="text-[13px] font-medium text-white">{p.name}</div>
              {p.connected && (
                <button className="mt-2 w-full rounded-md bg-red-600 px-2 py-1 text-[11px] font-medium text-white">无需开发，一键授权</button>
              )}
              <div className="mt-1 text-[10px] text-slate-500 text-center">{p.desc}</div>
            </div>
          ))}
        </div>

        <div className="text-[12px] text-slate-400 space-y-1">
          <p>点击 <span className="text-white font-medium">【授权】</span> 按钮，将跳转至对应平台完成店铺授权。</p>
          <p>授权完成后系统将自动同步近30天数据，首次同步约需5-10分钟。</p>
        </div>
      </div>

      <button onClick={onComplete} className="mt-6 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:opacity-90 transition">
        完成绑定，进入系统 →
      </button>
    </div>
  );
}

export default function OverviewPage() {
  const { companyId, merchantScope } = useShellState();
  const company = getCompanyById(companyId);
  const merchant = getMerchantByScope(merchantScope);

  const [activeChannel, setActiveChannel] = useState<ChannelTab>('all');
  const [dateRange] = useState('2026-06-25 ~ 2026-07-02');
  const [topTab, setTopTab] = useState<'sales' | 'views'>('sales');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showStoreBinding, setShowStoreBinding] = useState(false);

  const currentRealtime = realtimeMetrics[activeChannel];
  const currentSalesTrend = salesTrendMetrics[activeChannel];

  // Prepare chart data
  const currentChartData = realtimeChartData[activeChannel];
  const currentTrendData = trendChartData[activeChannel];
  const currentAdChartData = adChartData[activeChannel];

  const realtimeLineData = {
    labels: currentChartData.map(d => d.hour),
    series: [currentChartData.map(d => d.today), currentChartData.map(d => d.yesterday)],
  };
  const trendLineData = {
    labels: currentTrendData.map(d => d.date),
    series: [currentTrendData.map(d => d.value)],
  };
  const adLineData = {
    labels: currentAdChartData.map(d => d.date),
    series: [currentAdChartData.map(d => d.sales), currentAdChartData.map(d => d.spend)],
  };

  // Store binding full-screen view
  if (showStoreBinding) {
    return <StoreBindingPage onComplete={() => setShowStoreBinding(false)} />;
  }

  return (
    <div className="min-h-screen">
      {/* ═══ Top Bar: Channel Tabs + Filters ═══ */}
      <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-1">
            {channelTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveChannel(tab.key)}
                className={cn(
                  'px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors',
                  activeChannel === tab.key
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
            <span>全部店铺 ▾</span>
            <span>全部 ▾</span>
            <span>近30天 ▾</span>
            <span>美元 ▾</span>
            <span className="font-mono">{dateRange}</span>
            <span>UTC ▾</span>
            <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
              <RefreshCw className="size-3" />更新
            </button>
            <span className="text-[11px]">数据时间: 2026/07/01 21:52:29</span>
          </div>
        </div>
      </div>

      {/* ═══ Onboarding Banner (dismissable) ═══ */}
      <div className="mx-5 mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
        <span>您还有未完成的入驻配置步骤，完成后可解锁全部功能。<a href="#" className="ml-1 font-medium text-[var(--primary)] underline" onClick={(e) => { e.preventDefault(); setShowStoreBinding(true); }}>立即完善</a></span>
        <X className="size-3.5 cursor-pointer text-amber-600 hover:text-amber-800" />
      </div>

      {/* ═══ Onboarding Wizard ═══ */}
      {showOnboarding && <OnboardingWizard onDismiss={() => setShowOnboarding(false)} />}

      {/* ═══ Notification Banner ═══ */}
      <div className="mx-5 mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[12px] text-blue-800">
        <span className="font-medium">【系统更新】</span> 已支持TikTok Shop订单自动同步与Amazon广告数据接入。数据每30分钟自动刷新，实时掌握多平台经营状态。<span className="ml-2 cursor-pointer underline">查看更新记录→</span>
      </div>

      {/* ═══ Main Content: Two Column Layout ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 p-5">
        {/* Left Column */}
        <div className="space-y-5 min-w-0">

          {/* 目标订单 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="目标订单" />
            <div className="grid grid-cols-5 gap-4">
              {targetOrderMetrics[activeChannel].map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
          </section>

          {/* 平台健康度 & 发货时效预警 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="平台健康度 & 发货时效" extra={<span className="text-[11px] text-[var(--muted)]">实时监控</span>} />
            {(activeChannel === 'all' || activeChannel === 'amazon') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Amazon Late Shipment</div>
                  <div className="text-[18px] font-semibold text-green-600">1.2%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 &lt;4% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Amazon ODR</div>
                  <div className="text-[18px] font-semibold text-green-600">0.8%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 &lt;1% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Amazon VTR (有效追踪率)</div>
                  <div className="text-[18px] font-semibold text-green-600">99.7%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 ≥95% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Amazon 预发货取消率</div>
                  <div className="text-[18px] font-semibold text-green-600">0.3%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 &lt;2.5% ✓</div>
                </div>
              </div>
            )}
            {(activeChannel === 'all' || activeChannel === 'tiktok') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="text-[11px] text-amber-700 mb-1">TikTok 48h发货率</div>
                  <div className="text-[18px] font-semibold text-amber-600">92%</div>
                  <div className="text-[10px] text-amber-600">阈值 ≥95% ⚠️</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">TikTok 体验分</div>
                  <div className="text-[18px] font-semibold text-green-600">4.8</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 ≥4.5 ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">TikTok 取消率</div>
                  <div className="text-[18px] font-semibold text-green-600">2.1%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 &lt;5% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">TikTok 揽收及时率</div>
                  <div className="text-[18px] font-semibold text-green-600">95%</div>
                  <div className="text-[10px] text-[var(--muted)]">阈值 ≥90% ✓</div>
                </div>
              </div>
            )}
            {(activeChannel === 'all' || activeChannel === 'shopify') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Shopify 发货时效</div>
                  <div className="text-[18px] font-semibold text-green-600">1.8天</div>
                  <div className="text-[10px] text-[var(--muted)]">目标 ≤3天 ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Shopify 退款率</div>
                  <div className="text-[18px] font-semibold text-green-600">1.4%</div>
                  <div className="text-[10px] text-[var(--muted)]">行业均值 3% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">Shopify 物流满意度</div>
                  <div className="text-[18px] font-semibold text-green-600">96%</div>
                  <div className="text-[10px] text-[var(--muted)]">目标 ≥90% ✓</div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="text-[11px] text-[var(--muted)] mb-1">弃单挽回率</div>
                  <div className="text-[18px] font-semibold text-green-600">15%</div>
                  <div className="text-[10px] text-[var(--muted)]">行业均值 10% ✓</div>
                </div>
              </div>
            )}
            {/* 超时订单预警 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-[11px] text-red-700 mb-1">即将超时订单</div>
                <div className="text-[18px] font-semibold text-red-600">{activeChannel === 'all' ? '7单' : activeChannel === 'amazon' ? '4单' : activeChannel === 'tiktok' ? '5单' : '2单'}</div>
                <div className="text-[10px] text-red-600">2h内需发货 🚨</div>
              </div>
            </div>
          </section>

          {/* 实时概览 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="实时概览" extra={<span className="text-[11px] text-[var(--muted)]">已对比按照数据维度</span>} />
            <div className="grid grid-cols-3 gap-4 mb-4">
              {currentRealtime.map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
            <div className="flex items-center gap-3 mb-2 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-blue-500"></span>今天</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-slate-400"></span>昨日</span>
            </div>
            <LineChart data={realtimeLineData} height={160} colors={['#3b82f6', '#94a3b8']} />
          </section>

          {/* 销售趋势概览 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="销售趋势概览" extra={<span className="text-[11px] text-[var(--muted)]">截至今日统计数据</span>} />
            <div className="grid grid-cols-3 gap-4 mb-4">
              {currentSalesTrend.map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
            <LineChart data={trendLineData} height={160} colors={['#10b981']} />
          </section>

          {/* 今日销售 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="今日销售" />
            <div className="grid grid-cols-4 gap-4">
              {todaySalesMetrics[activeChannel].map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
          </section>

          {/* 今日广告 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SectionHeader title="今日广告" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {todayAdMetrics[activeChannel].map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
          </section>

          {/* 广告分析 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="广告分析" />
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <span className="font-mono">2026-06-19 ~ 2026-07-01</span>
                <button className="rounded border border-[var(--border)] px-1.5 py-0.5 hover:bg-[var(--surface-subtle)]">📅</button>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
              {adMetrics[activeChannel].map((m, i) => (
                <MetricCard key={i} item={m} />
              ))}
            </div>
            <div className="flex items-center gap-3 mb-2 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-blue-500"></span>广告销售额</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-orange-500"></span>广告花费</span>
            </div>
            <LineChart data={adLineData} height={200} colors={['#3b82f6', '#f97316']} />
          </section>

          {/* 销售榜 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="销售榜" />
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-[var(--muted)]">2026-06-19 ~ 2026-07-01</span>
                <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
                  {['销售额', '总销售', '店铺销', '退款销', '首推销'].map((tab, i) => (
                    <button key={i} className={cn('px-2 py-1 text-[11px]', i === 0 ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)]')}>{tab}</button>
                  ))}
                </div>
                <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
                  <button className="px-2 py-1 text-[11px] bg-[var(--primary)] text-white">产品折</button>
                  <button className="px-2 py-1 text-[11px] text-[var(--muted)]">父ASIN</button>
                </div>
              </div>
            </div>
            <BarChart data={{
              labels: activeChannel === 'all'
                ? ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-004', 'SKU-005', 'SKU-006', 'SKU-007', 'SKU-008', 'SKU-009', 'SKU-010']
                : activeChannel === 'amazon'
                ? ['GBT6088', 'Watch Pro', 'LED Strip', 'PhoneCase', 'USB-C Hub', 'Charger', 'Earbuds', 'Cable', 'Stand', 'Adapter']
                : activeChannel === 'tiktok'
                ? ['Beauty Set', 'ZT约大引', 'Mini Fan', 'Phone Hold', 'Nail Kit', 'Brush', 'Mirror', 'Clip', 'Band', 'Case']
                : ['LSG2702', 'Yoga Mat', '中门创通', 'Desk Org', 'Bottle', 'Candle', 'Frame', 'Lamp', 'Towel', 'Bag'],
              values: activeChannel === 'all'
                ? [2031, 1892, 1640, 1480, 1320, 1180, 980, 860, 740, 620]
                : activeChannel === 'amazon'
                ? [1420, 1180, 980, 860, 720, 640, 520, 460, 380, 310]
                : activeChannel === 'tiktok'
                ? [1680, 1240, 960, 840, 680, 580, 460, 380, 290, 220]
                : [1520, 1280, 1060, 920, 780, 650, 540, 420, 340, 260],
            }} height={180} />
          </section>
        </div>

        {/* ═══ Right Sidebar ═══ */}
        <div className="space-y-5">
          {/* TOP50商品 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">TOP50商品</h3>
            {/* AI suggestion banner */}
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2 text-[12px] font-medium text-green-800">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-200 text-green-700 text-[10px]">💡</span>
                AI 智能选品，发现潜力爆款！
              </div>
              <p className="mt-1 text-[11px] text-green-700">基于各平台销售数据与市场趋势，AI帮您分析竞品动态、挖掘高转化商品，让选品决策更有据可依。</p>
              <button className="mt-2 rounded-md bg-green-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-green-700">让 AI 帮我分析</button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-3 border-b border-[var(--border-subtle)]">
              <button onClick={() => setTopTab('sales')} className={cn('px-2 py-1.5 text-[12px] font-medium border-b-2 -mb-px', topTab === 'sales' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]')}>畅销榜</button>
              <button onClick={() => setTopTab('views')} className={cn('px-2 py-1.5 text-[12px] font-medium border-b-2 -mb-px', topTab === 'views' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)]')}>滞销榜</button>
            </div>

            {/* Product table */}
            <table className="w-full text-[12px]">
              <thead className="text-[11px] text-[var(--muted)]">
                <tr>
                  <th className="py-1.5 text-left font-medium">排名</th>
                  <th className="py-1.5 text-left font-medium">商品名称</th>
                  <th className="py-1.5 text-right font-medium">销售额/占比</th>
                  <th className="py-1.5 text-right font-medium">环比上期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {topProducts[activeChannel].map(p => (
                  <tr key={p.rank} className="hover:bg-[var(--surface-subtle)]">
                    <td className="py-2">
                      <span className={cn('inline-flex size-5 items-center justify-center rounded text-[10px] font-bold', p.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'text-[var(--muted)]')}>
                        {p.rank}
                      </span>
                    </td>
                    <td className="py-2 text-[var(--foreground)]">{p.name}</td>
                    <td className="py-2 text-right text-[var(--foreground)]">{p.sales} {p.revenue}</td>
                    <td className="py-2 text-right text-green-600">{p.change} ↑ {p.rank}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 库存情况 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">库存分布</h3>
            <div className="space-y-2 text-[12px]">
              {inventoryRanges[activeChannel].map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[var(--foreground)]">
                  <span className="flex items-center gap-2">
                    <span className={cn('inline-block size-2 rounded-full', i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-amber-500')}></span>
                    {r.label}
                  </span>
                  <span className="font-medium">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {/* Mini bar visualization */}
            {(() => {
              const items = inventoryRanges[activeChannel];
              const total = items.reduce((s, r) => s + r.count, 0);
              return (
                <div className="mt-3 flex h-3 rounded-full overflow-hidden">
                  {items.map((r, i) => (
                    <div key={i} className={cn(i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-amber-500')} style={{ width: `${((r.count / total) * 100).toFixed(0)}%` }}></div>
                  ))}
                </div>
              );
            })()}
          </section>

          {/* 库龄分布 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">库龄分布</h3>
              <span className="text-[11px] text-[var(--muted)]">FBA仓储费预估：{activeChannel === 'all' ? '$2,840/月' : activeChannel === 'amazon' ? '$2,120/月' : activeChannel === 'tiktok' ? '$480/月' : '$240/月'}</span>
            </div>
            <div className="space-y-1.5 text-[12px]">
              {agingRanges[activeChannel].map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">● {r.label}</span>
                    <span className="text-[var(--foreground)] font-medium">{r.qty}</span>
                  </div>
                  {r.label2 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">● {r.label2}</span>
                      <span className="text-[var(--foreground)] font-medium">{r.qty2}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 履约概况 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">履约概况</h3>
              <span className="text-[11px] text-[var(--muted)]">日均出库：{activeChannel === 'all' ? '172件' : activeChannel === 'amazon' ? '98件' : activeChannel === 'tiktok' ? '42件' : '32件'}</span>
            </div>
            <table className="w-full text-[12px]">
              <thead className="text-[11px] text-[var(--muted)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-1.5 text-left font-medium"></th>
                  <th className="py-1.5 text-right font-medium">数量</th>
                  <th className="py-1.5 text-right font-medium">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {operationRows[activeChannel].map((r, i) => (
                  <tr key={i} className={cn(i === operationRows[activeChannel].length - 1 && 'font-semibold')}>
                    <td className="py-1.5 text-[var(--foreground)]">{r.label}</td>
                    <td className="py-1.5 text-right text-[var(--foreground)]">{typeof r.qty === 'number' ? r.qty.toLocaleString() : r.qty}</td>
                    <td className="py-1.5 text-right text-[var(--foreground)]">{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 近7天Listing消耗 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">近7天Listing动态</h3>
              <Info className="size-3.5 text-[var(--muted)]" />
            </div>
            <div className="grid grid-cols-4 gap-3 text-center text-[11px]">
              {(activeChannel === 'all' ? [
                { label: '新建Listing', v1: '12', v2: '已上架' },
                { label: 'Featured状态', v1: '6', v2: '活跃' },
                { label: '丢失Buy Box', v1: '3', v2: '需关注' },
                { label: '库存超卖警告', v1: '2', v2: '处理中' },
              ] : activeChannel === 'amazon' ? [
                { label: '新建Listing', v1: '5', v2: '已上架' },
                { label: 'Buy Box丢失', v1: '3', v2: '需关注' },
                { label: 'Listing被抑制', v1: '1', v2: '待修复' },
                { label: 'FBA库存警告', v1: '2', v2: '补货中' },
              ] : activeChannel === 'tiktok' ? [
                { label: '新建商品', v1: '4', v2: '已上架' },
                { label: '违规下架', v1: '1', v2: '申诉中' },
                { label: '素材审核中', v1: '6', v2: '等待' },
                { label: '橱窗推荐', v1: '8', v2: '展示中' },
              ] : [
                { label: '新建商品', v1: '3', v2: '已上架' },
                { label: 'SEO优化', v1: '5', v2: '已完成' },
                { label: '缺货商品', v1: '2', v2: '补货中' },
                { label: '折扣活动', v1: '4', v2: '进行中' },
              ]).map((item, i) => (
                <div key={i}>
                  <div className="text-[var(--muted)]">{item.label}</div>
                  <div className="mt-1 text-[14px] font-semibold text-[var(--foreground)]">{item.v1}</div>
                  <div className="text-[var(--muted)]">{item.v2}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-[11px]">
              {(activeChannel === 'all' ? [
                { label: '新增评价', v1: '8', v2: '好评' },
                { label: '差评预警', v1: '4', v2: '待处理' },
                { label: '审核中', v1: '15', v2: '等待' },
              ] : activeChannel === 'amazon' ? [
                { label: '新增Review', v1: '5', v2: '好评' },
                { label: '差评/1-2星', v1: '2', v2: '需跟进' },
                { label: 'A+审核中', v1: '3', v2: '等待' },
              ] : activeChannel === 'tiktok' ? [
                { label: '新增评价', v1: '12', v2: '好评' },
                { label: '差评率', v1: '1.2%', v2: '正常' },
                { label: '视频关联', v1: '18', v2: '活跃' },
              ] : [
                { label: '新增评论', v1: '6', v2: '好评' },
                { label: '退货原因', v1: '3', v2: '分析中' },
                { label: 'Blog关联', v1: '4', v2: '已发布' },
              ]).map((item, i) => (
                <div key={i}>
                  <div className="text-[var(--muted)]">{item.label}</div>
                  <div className="mt-1 text-[14px] font-semibold text-[var(--foreground)]">{item.v1}</div>
                  <div className="text-[var(--muted)]">{item.v2}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-[11px]">
              <div className="text-[var(--muted)]">Listing总数</div>
              <div className="mt-1 text-[14px] font-semibold text-[var(--foreground)]">{activeChannel === 'all' ? '342' : activeChannel === 'amazon' ? '156' : activeChannel === 'tiktok' ? '98' : '88'}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
