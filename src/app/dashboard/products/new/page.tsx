'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockProducts } from '@/lib/mock-data/products';
import {
  ArrowLeft, Plus, Trash2, AlertCircle, ImagePlus, X, Check,
  ChevronRight, Package, ChevronsUpDown, ChevronsDownUp, Hash,
  ShieldAlert, Ruler, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMerchantsByCompany } from '@/lib/tenant-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductStatus  = '草稿' | '已发布' | '审核中';
type VariantStatus  = '启用' | '停用';
// 商品性质：影响物流/库存/履约
type ProductNature  =
  | 'physical'      // 实物商品
  | 'virtual'       // 虚拟商品/数字内容
  | 'service'       // 服务商品
  | 'gift'          // 赠品/样品
  | 'raw_material'  // 原材料/散料
  | 'consumable'    // 耗材/配件
  | 'pre_order'     // 预售商品
  | 'subscription'; // 订阅商品
// 规格模式：影响 SKU 结构
type VariantMode    = 'simple' | 'multi' | 'bundle';

type OptionDef   = { id: string; name: string; values: string[] };
type ProductAttr = { id: string; key: string; value: string };
type ImageSlot   = { id: string; url: string; alt: string };

// 尺码表一行
type SizeRow = { id: string; label: string; [key: string]: string };

type VariantRow = {
  id: string;
  options: Record<string, string>;
  sku: string; price: string; compareAtPrice: string; costPrice: string;
  stock: string; barcode: string; status: VariantStatus;
  salesUnit: string;
  imageUrl: string;
  weight: string; length: string; width: string; height: string; volumeWeight: string;
};

type SimpleLogistics = {
  weight: string; length: string; width: string; height: string;
  volumeWeight: string; compareAtPrice: string; barcode: string;
};

type ProdLogistics = {
  weight: string; length: string; width: string; height: string;
  volumeWeight: string; hscode: string; origin: string;
};

type HazmatInfo = {
  enabled: boolean;
  unNumber: string;      // UN 编号，如 UN3481
  hazClass: string;      // 危险类别，如 Class 9（锂电）
  packingGroup: string;  // 包装组 I/II/III
  note: string;          // 特殊说明
};

type FormErrors = Partial<Record<'title' | 'category' | 'parentSku' | 'sku' | 'price', string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── 四级商品分类树 ───────────────────────────────────────────────────────────

type CatNode = { label: string; children?: CatNode[] };

const CATEGORY_TREE: CatNode[] = [
  {
    label: '电子产品', children: [
      { label: '音频设备', children: [
        { label: '无线耳机', children: [{ label: '头戴式' }, { label: '入耳式' }, { label: 'TWS' }] },
        { label: '有线耳机' },
        { label: '便携音箱', children: [{ label: '蓝牙音箱' }, { label: '防水音箱' }] },
        { label: '麦克风' },
      ]},
      { label: '充电设备', children: [
        { label: '充电器', children: [{ label: '快充头' }, { label: '多口充电器' }] },
        { label: '充电线', children: [{ label: 'USB-C 线' }, { label: 'Lightning 线' }] },
        { label: '无线充电' },
        { label: '移动电源' },
      ]},
      { label: '智能穿戴', children: [
        { label: '智能手表' }, { label: '智能手环' }, { label: '智能眼镜' },
      ]},
      { label: '摄影摄像', children: [
        { label: '运动相机' }, { label: '稳定器' }, { label: '摄影配件' },
      ]},
    ],
  },
  {
    label: '手机配件', children: [
      { label: '保护壳', children: [
        { label: '手机壳', children: [{ label: '硅胶壳' }, { label: '皮革壳' }, { label: '磁吸壳' }] },
        { label: '钢化膜' }, { label: '镜头贴' },
      ]},
      { label: '功能配件', children: [
        { label: '支架 / 夹子' }, { label: '手机挂绳' }, { label: '磁吸配件' },
      ]},
    ],
  },
  {
    label: '服装', children: [
      { label: '上衣', children: [
        { label: 'T恤', children: [{ label: '短袖T恤' }, { label: '长袖T恤' }, { label: 'Polo衫' }] },
        { label: '衬衫', children: [{ label: '男士衬衫' }, { label: '女士衬衫' }] },
        { label: '卫衣', children: [{ label: '套头卫衣' }, { label: '开衫卫衣' }] },
        { label: '夹克 / 外套' },
      ]},
      { label: '裤装', children: [
        { label: '牛仔裤', children: [{ label: '直筒' }, { label: '修身' }, { label: '宽松' }] },
        { label: '休闲裤' }, { label: '运动裤' }, { label: '西裤' },
      ]},
      { label: '裙装', children: [
        { label: '连衣裙' }, { label: '半裙' }, { label: '礼服裙' },
      ]},
      { label: '内衣 / 打底' },
    ],
  },
  {
    label: '鞋类', children: [
      { label: '运动鞋', children: [
        { label: '跑步鞋' }, { label: '篮球鞋' }, { label: '训练鞋' },
      ]},
      { label: '休闲鞋', children: [
        { label: '帆布鞋' }, { label: '板鞋' }, { label: '乐福鞋' },
      ]},
      { label: '正装鞋', children: [{ label: '皮鞋' }, { label: '高跟鞋' }] },
      { label: '凉拖鞋' }, { label: '户外靴' },
    ],
  },
  {
    label: '背包 / 箱包', children: [
      { label: '双肩包', children: [
        { label: '通勤背包' }, { label: '户外背包' }, { label: '电脑包' },
      ]},
      { label: '单肩包 / 斜挎包' },
      { label: '旅行箱', children: [{ label: '20寸登机箱' }, { label: '24寸行李箱' }, { label: '28寸行李箱' }] },
      { label: '腰包 / 胸包' },
    ],
  },
  {
    label: '美妆护肤', children: [
      { label: '护肤', children: [
        { label: '洁面', children: [{ label: '洁面乳' }, { label: '洁面仪' }] },
        { label: '保湿', children: [{ label: '爽肤水' }, { label: '精华' }, { label: '乳液' }, { label: '面霜' }] },
        { label: '防晒' }, { label: '面膜' },
      ]},
      { label: '彩妆', children: [
        { label: '底妆', children: [{ label: '粉底' }, { label: 'BB/CC 霜' }, { label: '气垫' }] },
        { label: '眉眼', children: [{ label: '眼影' }, { label: '眼线' }, { label: '睫毛膏' }, { label: '眉笔' }] },
        { label: '唇妆', children: [{ label: '口红' }, { label: '唇釉' }, { label: '唇线笔' }] },
      ]},
      { label: '香水 / 香氛' },
      { label: '美容工具', children: [{ label: '化妆刷' }, { label: '美容仪' }] },
    ],
  },
  {
    label: '家居用品', children: [
      { label: '收纳整理', children: [
        { label: '桌面收纳' }, { label: '衣物收纳' }, { label: '厨房收纳' },
      ]},
      { label: '家纺', children: [{ label: '床品套件' }, { label: '毛巾' }, { label: '抱枕' }] },
      { label: '厨具', children: [{ label: '锅具' }, { label: '刀具' }, { label: '烹饪小工具' }] },
      { label: '灯具', children: [{ label: '台灯' }, { label: '氛围灯' }] },
    ],
  },
  {
    label: '电脑周边', children: [
      { label: '显示器配件', children: [
        { label: '显示器支架' }, { label: '显示器挂灯' }, { label: '屏幕清洁' },
      ]},
      { label: '输入设备', children: [
        { label: '机械键盘' }, { label: '鼠标', children: [{ label: '有线鼠标' }, { label: '无线鼠标' }] },
        { label: '鼠标垫' }, { label: '手写板' },
      ]},
      { label: '桌面整理', children: [
        { label: '走线管理' }, { label: '桌面支架' }, { label: '扩展坞 / Hub' },
      ]},
      { label: '存储设备', children: [{ label: '移动硬盘' }, { label: 'U盘' }, { label: 'SSD' }] },
    ],
  },
  {
    label: '数码配件', children: [
      { label: '线缆 / 转接', children: [
        { label: 'HDMI / DP 线' }, { label: '转接头' }, { label: '延长线' },
      ]},
      { label: '路由器 / 网络', children: [{ label: '家用路由器' }, { label: '随身WiFi' }] },
      { label: '打印机耗材', children: [{ label: '墨盒' }, { label: '碳粉' }] },
    ],
  },
  {
    label: '旅行配件', children: [
      { label: '旅行收纳', children: [{ label: '衣物压缩袋' }, { label: '旅行洗漱包' }, { label: '证件包' }] },
      { label: '旅行辅助', children: [{ label: '颈枕' }, { label: '眼罩 / 耳塞' }, { label: '旅行锁' }] },
      { label: '户外装备', children: [{ label: '登山包' }, { label: '帐篷' }, { label: '睡袋' }] },
    ],
  },
];

// 需要显示尺码表的 L1 分类
const SIZE_CHART_L1 = new Set(['服装', '鞋类', '背包 / 箱包', '旅行配件']);

/** 根据 L1 label 找节点 */
function findCatNode(tree: CatNode[], label: string): CatNode | undefined {
  return tree.find((n) => n.label === label);
}

/** 级联选择 hook */
function useCategorySelect() {
  const [l1, setL1] = useState('');
  const [l2, setL2] = useState('');
  const [l3, setL3] = useState('');
  const [l4, setL4] = useState('');

  const l1Node  = useMemo(() => findCatNode(CATEGORY_TREE, l1), [l1]);
  const l2Node  = useMemo(() => l1Node?.children ? findCatNode(l1Node.children, l2) : undefined, [l1Node, l2]);
  const l3Node  = useMemo(() => l2Node?.children ? findCatNode(l2Node.children, l3) : undefined, [l2Node, l3]);

  const setL1Cascade = (v: string) => { setL1(v); setL2(''); setL3(''); setL4(''); };
  const setL2Cascade = (v: string) => { setL2(v); setL3(''); setL4(''); };
  const setL3Cascade = (v: string) => { setL3(v); setL4(''); };

  /** 最细粒度的已选分类 label */
  const leafLabel = l4 || l3 || l2 || l1;

  /** 面包屑路径 */
  const breadcrumb = [l1, l2, l3, l4].filter(Boolean).join(' › ');

  return { l1, l2, l3, l4, setL1: setL1Cascade, setL2: setL2Cascade, setL3: setL3Cascade, setL4, l1Node, l2Node, l3Node, leafLabel, breadcrumb };
}

// 需要显示尺码表（按 L1）
const SIZE_CHART_CATEGORIES = SIZE_CHART_L1;

const NATURE_OPTIONS: { value: ProductNature; label: string; desc: string; needsLogi: boolean }[] = [
  { value: 'physical',     label: '实物商品',     desc: '有实体库存，需物流配送',           needsLogi: true  },
  { value: 'virtual',      label: '虚拟商品',     desc: '无实物，如卡密、授权码、数字内容', needsLogi: false },
  { value: 'service',      label: '服务商品',     desc: '无库存，如安装、维修、咨询服务',   needsLogi: false },
  { value: 'gift',         label: '赠品 / 样品',  desc: '实物但不计入销售收入，赠送使用',   needsLogi: true  },
  { value: 'raw_material', label: '原材料 / 散料', desc: '用于生产加工的原料或散装物料',     needsLogi: true  },
  { value: 'consumable',   label: '耗材 / 配件',  desc: '消耗性零配件，如墨盒、刀片',       needsLogi: true  },
  { value: 'pre_order',    label: '预售商品',     desc: '尚未到货，收款后按约定时间发货',   needsLogi: true  },
  { value: 'subscription', label: '订阅商品',     desc: '周期性扣费的会员或服务订阅',       needsLogi: false },
];

const VARIANT_MODE_OPTIONS: { value: VariantMode; label: string; icon: string; desc: string }[] = [
  { value: 'simple', icon: '○', label: '单规格',   desc: '一个 SKU，无变体' },
  { value: 'multi',  icon: '⊞', label: '多规格',   desc: '颜色/尺码等多变体' },
  { value: 'bundle', icon: '◫', label: '组合商品', desc: '由多个子 SKU 打包而成' },
];

const HAZMAT_CLASSES = [
  '1 – 爆炸物', '2.1 – 易燃气体', '2.2 – 非易燃气体', '2.3 – 毒性气体',
  '3 – 易燃液体', '4.1 – 易燃固体', '5.1 – 氧化剂', '5.2 – 有机过氧化物',
  '6.1 – 毒性物质', '6.2 – 感染性物质', '7 – 放射性', '8 – 腐蚀性',
  '9 – 杂类危险品（含锂电）',
];

const STATUS_OPTIONS: { value: ProductStatus; label: string; desc: string; color: string }[] = [
  { value: '草稿',  label: '草稿',  desc: '不对外可见，继续完善后再发布', color: 'text-[var(--muted)]' },
  { value: '审核中', label: '审核中', desc: '提交内部/平台审核', color: 'text-[var(--warning)]' },
  { value: '已发布', label: '已发布', desc: '立即上架，在所选渠道展示', color: 'text-green-600' },
];

// 默认尺码表列（可扩展）
const DEFAULT_SIZE_COLS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _c = 0;
const uid = () => `_${++_c}_${Math.random().toString(36).slice(2, 6)}`;

function cartesian(arrays: string[][]): string[][] {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  return first.flatMap((v) => cartesian(rest).map((r) => [v, ...r]));
}

function calcVW(l: string, w: string, h: string): string {
  const lv = Number(l), wv = Number(w), hv = Number(h);
  return lv && wv && hv ? ((lv * wv * hv) / 5000).toFixed(2) : '';
}

function makeVariant(options: Record<string, string>): VariantRow {
  return { id: uid(), options, sku: '', price: '', compareAtPrice: '', costPrice: '', stock: '0', barcode: '', status: '启用', salesUnit: '件', imageUrl: '', weight: '', length: '', width: '', height: '', volumeWeight: '' };
}

function syncVariants(defs: OptionDef[], existing: VariantRow[]): VariantRow[] {
  const active = defs.filter((d) => d.name.trim() && d.values.length > 0);
  if (!active.length) return [];
  return cartesian(active.map((d) => d.values)).map((combo) => {
    const options = Object.fromEntries(active.map((d, i) => [d.name, combo[i]]));
    const key = Object.values(options).join('|');
    const found = existing.find((v) => Object.values(v.options).join('|') === key);
    return found ? { ...found, options } : makeVariant(options);
  });
}

// ─── Completeness hook ────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter();

  // ── Basic
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [parentSku,   setParentSku]   = useState('');
  const [tags,        setTags]        = useState<string[]>([]);
  const [tagInput,    setTagInput]    = useState('');

  // ── Brand / supplier (moved to sidebar)
  const [brand,    setBrand]    = useState('');
  const [supplier, setSupplier] = useState('');

  // ── Bundle settings
  const [bundleOutboundMode,  setBundleOutboundMode]  = useState<'bundle' | 'component'>('bundle');
  const [bundleStockMode,     setBundleStockMode]     = useState<'bundle' | 'component'>('component');

  // ── Classification
  const [productNature, setProductNature] = useState<ProductNature>('physical');
  const [variantMode,   setVariantMode]   = useState<VariantMode>('simple');

  // ── Category (4-level cascade)
  const catSel = useCategorySelect();

  const merchants = useMemo(() => getMerchantsByCompany('company_northwind'), []);
  const [seoTitle,        setSeoTitle]        = useState('');
  const [seoDescription,  setSeoDescription]  = useState('');
  const [saleStartDate,   setSaleStartDate]   = useState('');
  const [saleEndDate,     setSaleEndDate]     = useState('');
  const [minOrderQty,     setMinOrderQty]     = useState('');
  const [stockStrategy,   setStockStrategy]   = useState<'deny' | 'continue'>('deny');

  // ── Product attributes (3-col grid)
  const [attrs, setAttrs] = useState<ProductAttr[]>([
    { id: uid(), key: '材质',     value: '' },
    { id: uid(), key: '适用场景', value: '' },
    { id: uid(), key: '颜色工艺', value: '' },
    { id: uid(), key: '表面处理', value: '' },
    { id: uid(), key: '认证',     value: '' },
    { id: uid(), key: '原产地',   value: '' },
  ]);

  // ── Images
  const [images,        setImages]        = useState<ImageSlot[]>(Array.from({ length: 6 }, () => ({ id: uid(), url: '', alt: '' })));
  const [addingImageIdx,setAddingImageIdx]= useState<number | null>(null);
  const [imageInputVal, setImageInputVal] = useState('');

  // ── Variants (multi mode)
  const [optionDefs,       setOptionDefs]       = useState<OptionDef[]>([{ id: uid(), name: '颜色', values: [] }]);
  const [valueInputs,      setValueInputs]      = useState<string[]>(['']);
  const [variants,         setVariants]         = useState<VariantRow[]>([]);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [defaultPrice,     setDefaultPrice]     = useState('');
  const [defaultCost,      setDefaultCost]      = useState('');
  const [skuPrefix,        setSkuPrefix]        = useState('');

  // ── SEO & sales settings (sidebar extended fields)
  const [bundleItems, setBundleItems] = useState<{
    id: string; sku: string; qty: string;
    // enriched fields from picker
    productId?: string; variantId?: string;
    productTitle?: string; optionLabel?: string;
    price?: string; stock?: number; imageUrl?: string;
  }[]>([]);
  const [showBundlePicker, setShowBundlePicker] = useState(false);

  // ── Bundle component SKUs
  const [simpleSku,       setSimpleSku]       = useState('');
  const [simplePrice,     setSimplePrice]     = useState('');
  const [simpleCost,      setSimpleCost]      = useState('');
  const [simpleStock,     setSimpleStock]     = useState('0');
  const [simpleLogi,      setSimpleLogi]      = useState<SimpleLogistics>({ weight: '', length: '', width: '', height: '', volumeWeight: '', compareAtPrice: '', barcode: '' });

  // ── Units (global for the product)
  const [weightUnit,   setWeightUnit]   = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [dimUnit,      setDimUnit]      = useState<'cm' | 'in'>('cm');
  const [salesUnit,    setSalesUnit]    = useState('件');
  const [currencyUnit, setCurrencyUnit] = useState<'USD' | 'EUR' | 'GBP' | 'CNY' | 'JPY' | 'SGD'>('USD');

  // ── Product logistics
  const [prodLogi, setProdLogi] = useState<ProdLogistics>({ weight: '', length: '', width: '', height: '', volumeWeight: '', hscode: '', origin: '' });

  // ── Hazmat
  const [hazmat, setHazmat] = useState<HazmatInfo>({ enabled: false, unNumber: '', hazClass: '', packingGroup: '', note: '' });

  // ── Size chart
  const [sizeChartCols, setSizeChartCols] = useState<string[]>(DEFAULT_SIZE_COLS);
  const [sizeChartRows, setSizeChartRows] = useState<SizeRow[]>([
    { id: uid(), label: '胸围 (cm)' },
    { id: uid(), label: '腰围 (cm)' },
    { id: uid(), label: '臀围 (cm)' },
    { id: uid(), label: '身高 (cm)' },
  ]);
  const [newColInput,  setNewColInput]  = useState('');
  const [newRowInput,  setNewRowInput]  = useState('');

  // ── Simple product
  const [publishShopify, setPublishShopify] = useState(false);
  const [publishShein,   setPublishShein]   = useState(false);

  // ── Publish
  const [productStatus, setProductStatus] = useState<ProductStatus>('草稿');
  const [merchantId,    setMerchantId]    = useState('');

  // ── Sidebar
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // ── Errors

  // Derived: show size chart only for relevant categories
  const showSizeChart  = SIZE_CHART_CATEGORIES.has(catSel.l1);
  // Virtual / service: no logistics needed — read from NATURE_OPTIONS
  const needsLogistics = NATURE_OPTIONS.find((o) => o.value === productNature)?.needsLogi ?? true;

  // ── Auto-sync variants
  useEffect(() => {
    if (variantMode !== 'multi') return;
    setVariants((prev) => syncVariants(optionDefs, prev).map((v) => ({
      ...v,
      price:     v.price     || defaultPrice,
      costPrice: v.costPrice || defaultCost,
    })));
  }, [optionDefs, variantMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Option helpers
  const updateOptionName  = useCallback((id: string, name: string) =>
    setOptionDefs((p) => p.map((d) => d.id === id ? { ...d, name } : d)), []);

  const removeOptionDef = useCallback((id: string) => {
    const idx = optionDefs.findIndex((d) => d.id === id);
    setOptionDefs((p) => p.filter((d) => d.id !== id));
    if (idx >= 0) setValueInputs((p) => p.filter((_, i) => i !== idx));
  }, [optionDefs]);

  const addOptionValue = useCallback((defId: string, inputIdx: number) => {
    const val = valueInputs[inputIdx]?.trim();
    if (!val) return;
    setOptionDefs((p) => p.map((d) => d.id !== defId || d.values.includes(val) ? d : { ...d, values: [...d.values, val] }));
    setValueInputs((p) => p.map((v, i) => i === inputIdx ? '' : v));
  }, [valueInputs]);

  const removeOptionValue = useCallback((defId: string, val: string) =>
    setOptionDefs((p) => p.map((d) => d.id === defId ? { ...d, values: d.values.filter((v) => v !== val) } : d)), []);

  const addOptionDef = () => {
    if (optionDefs.length >= 3) return;
    setOptionDefs((p) => [...p, { id: uid(), name: '', values: [] }]);
    setValueInputs((p) => [...p, '']);
  };

  // ── Variant helpers
  const updateVariant = useCallback(<K extends keyof Omit<VariantRow, 'id' | 'options'>>(
    id: string, field: K, value: VariantRow[K]
  ) => setVariants((p) => p.map((v) => {
    if (v.id !== id) return v;
    const next = { ...v, [field]: value };
    if (['length', 'width', 'height'].includes(field as string))
      next.volumeWeight = calcVW(next.length, next.width, next.height);
    return next;
  })), []);

  const toggleExpand   = (id: string) => setExpandedVariants((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll      = () => setExpandedVariants(new Set(variants.map((v) => v.id)));
  const collapseAll    = () => setExpandedVariants(new Set());
  const applyDefaultPrice = () => { if (defaultPrice) setVariants((p) => p.map((v) => ({ ...v, price: defaultPrice }))); };
  const applyDefaultCost  = () => { if (defaultCost)  setVariants((p) => p.map((v) => ({ ...v, costPrice: defaultCost }))); };
  const applySkuPrefix    = () => {
    if (!skuPrefix) return;
    setVariants((p) => p.map((v, i) => ({ ...v, sku: v.sku || `${skuPrefix}-${String(i + 1).padStart(3, '0')}` })));
  };
  const batchSetStatus    = (status: VariantStatus) => setVariants((p) => p.map((v) => ({ ...v, status })));
  const batchSetSalesUnit = (unit: string)          => { if (unit) setVariants((p) => p.map((v) => ({ ...v, salesUnit: unit }))); };

  // ── Logistics helpers
  const updateProdLogi = (field: keyof ProdLogistics, val: string) =>
    setProdLogi((p) => { const n = { ...p, [field]: val }; if (['length','width','height'].includes(field)) n.volumeWeight = calcVW(n.length, n.width, n.height); return n; });

  const updateSimpleLogi = (field: keyof SimpleLogistics, val: string) =>
    setSimpleLogi((p) => { const n = { ...p, [field]: val }; if (['length','width','height'].includes(field)) n.volumeWeight = calcVW(n.length, n.width, n.height); return n; });

  // ── Attr helpers
  const updateAttr = (id: string, f: 'key' | 'value', val: string) => setAttrs((p) => p.map((a) => a.id === id ? { ...a, [f]: val } : a));
  const removeAttr = (id: string) => setAttrs((p) => p.filter((a) => a.id !== id));
  const addAttr    = () => setAttrs((p) => [...p, { id: uid(), key: '', value: '' }]);

  // ── Tags
  const addTag = () => { const t = tagInput.trim(); if (!t || tags.includes(t)) return; setTags((p) => [...p, t]); setTagInput(''); };

  // ── Images
  const confirmImageUrl = (idx: number) => {
    if (imageInputVal.trim()) setImages((p) => p.map((img, i) => i === idx ? { ...img, url: imageInputVal.trim() } : img));
    setImageInputVal(''); setAddingImageIdx(null);
  };
  const removeImage = (idx: number) => setImages((p) => p.map((img, i) => i === idx ? { ...img, url: '', alt: '' } : img));

  // ── Size chart helpers
  const updateSizeCell = (rowId: string, col: string, val: string) =>
    setSizeChartRows((p) => p.map((r) => r.id === rowId ? { ...r, [col]: val } : r));
  const addSizeCol = () => { const c = newColInput.trim(); if (!c || sizeChartCols.includes(c)) return; setSizeChartCols((p) => [...p, c]); setNewColInput(''); };
  const removeSizeCol = (col: string) => { setSizeChartCols((p) => p.filter((c) => c !== col)); setSizeChartRows((p) => p.map((r) => { const n = { ...r }; delete n[col]; return n; })); };
  const addSizeRow = () => { const l = newRowInput.trim(); if (!l) return; setSizeChartRows((p) => [...p, { id: uid(), label: l }]); setNewRowInput(''); };
  const removeSizeRow = (id: string) => setSizeChartRows((p) => p.filter((r) => r.id !== id));

  // ── Validate
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!title.trim())          errs.title     = '请输入商品名称';
    if (!catSel.l1)             errs.category  = '请选择商品分类';
    if (!parentSku.trim())      errs.parentSku = '请填写 Parent SKU';
    if (variantMode === 'multi') {
      if (variants.some((v) => !v.sku.trim()))   errs.sku   = '所有变体必须填写 Seller SKU';
      if (variants.some((v) => !v.price.trim())) errs.price = '所有变体必须填写售价';
    } else if (variantMode === 'simple') {
      if (!simpleSku.trim())   errs.sku   = '请填写 SKU';
      if (!simplePrice.trim()) errs.price = '请填写售价';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (asDraft: boolean) => {
    setSubmitted(true);
    if (!asDraft && !validate()) return;
    router.push('/dashboard/products');
  };

  const hasAnyError      = submitted && Object.keys(errors).length > 0;
  const activeOptionDefs = optionDefs.filter((d) => d.name.trim());
  const pendingVariants  = variants.filter((v) => !v.sku || !v.price).length;

  return (
    <>
    <div className="mx-auto max-w-[1320px] pt-5 lg:pt-6">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px]">
          <button onClick={() => router.push('/dashboard/products')}
            className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-3.5" />商品中心
          </button>
          <span className="text-[var(--muted-foreground)]">/</span>
          <span className="text-[var(--foreground)]">新建商品</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(true)}
            className="h-8 rounded-lg border border-[var(--border)] px-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
            保存草稿
          </button>
          <button onClick={() => handleSave(false)}
            className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
            创建商品
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {hasAnyError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
          <div>
            <p className="text-[13px] font-medium text-[var(--danger)]">请修正以下问题后再提交</p>
            <ul className="mt-1 list-disc pl-4 text-[12px] text-[var(--danger)]">
              {Object.values(errors).map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">

        {/* ════ LEFT ══════════════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── 1 · 基础信息 ───────────────────────────────────────────── */}
          <Section title="基础信息">
            <Field label="商品名称" required error={errors.title}>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Wireless Earbuds Pro" className={inputCls(!!errors.title)} />
            </Field>

            <Field label="商品描述">
              <RichEditor value={description} onChange={setDescription} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="商品性质">
                <select value={productNature} onChange={(e) => setProductNature(e.target.value as ProductNature)}
                  className={inputCls(false)}>
                  {NATURE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {NATURE_OPTIONS.find((o) => o.value === productNature)?.desc}
                </p>
              </Field>
              <Field label="Parent SKU" required error={errors.parentSku}>
                <input value={parentSku} onChange={(e) => setParentSku(e.target.value)}
                  placeholder="例如：WEP-001" className={inputCls(!!errors.parentSku)} />
              </Field>
            </div>

            <Field label="标签">
              <div className="flex min-h-[36px] flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[12px] text-[var(--foreground)]">
                    {tag}
                    <button onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="text-[var(--muted)] hover:text-[var(--danger)]">×</button>
                  </span>
                ))}
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder={tags.length === 0 ? '输入标签，按 Enter 确认' : ''}
                  className="h-6 min-w-[120px] flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
              </div>
            </Field>

            {/* 虚拟/订阅类商品提示 */}
            {!needsLogistics && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                <span>ℹ️</span>
                「{NATURE_OPTIONS.find((o) => o.value === productNature)?.label}」无需填写物流信息，物流 & 海关区块已自动隐藏。
              </div>
            )}
            {productNature === 'gift' && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                <span>🎁</span> 赠品不计入销售收入，建议售价设为 $0，但需正常管理库存与物流。
              </div>
            )}
            {productNature === 'pre_order' && (
              <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-[11px] text-purple-700">
                <span>📅</span> 预售商品请在商品描述中注明预计发货时间。
              </div>
            )}
          </Section>

          {/* ── 2 · 分类与属性（合并卡片）─────────────────────────────── */}
          <Section title="分类与属性">
            {/* 四级分类：点击触发面板，四列并排一次选完 */}
            <CategoryPicker
              catSel={catSel}
              error={errors.category}
            />

            {/* 产品属性：3 列 grid */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium text-[var(--foreground)]">产品属性</p>
                <p className="text-[11px] text-[var(--muted)]">结构化属性，用于渠道同步与搜索</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {attrs.map((attr) => (
                  <div key={attr.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
                    <input value={attr.key} onChange={(e) => updateAttr(attr.id, 'key', e.target.value)}
                      placeholder="属性名"
                      className="w-[80px] shrink-0 bg-transparent text-[11px] font-medium text-[var(--muted-foreground)] outline-none focus:text-[var(--foreground)]" />
                    <span className="shrink-0 text-[10px] text-[var(--muted)]">:</span>
                    <input value={attr.value} onChange={(e) => updateAttr(attr.id, 'value', e.target.value)}
                      placeholder="属性值"
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none" />
                    <button onClick={() => removeAttr(attr.id)}
                      className="shrink-0 rounded p-0.5 text-[var(--muted)] hover:text-[var(--danger)]">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {/* Add new attr as inline button */}
                <button onClick={addAttr}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  <Plus className="size-3.5" />添加属性
                </button>
              </div>
            </div>
          </Section>

          {/* ── 4 · SKU 信息 ────────────────────────────────────────── */}
          <Section title="SKU 信息">
            {/* 规格模式选择 */}
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-[var(--foreground)]">规格模式</p>
              <div className="flex flex-wrap gap-2">
                {VARIANT_MODE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => setVariantMode(o.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-all',
                      variantMode === o.value
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                    )}>
                    <span className="text-[16px]">{o.icon}</span>
                    <div className="text-left">
                      <p className="text-[12px] font-medium">{o.label}</p>
                      <p className="text-[10px] text-[var(--muted)]">{o.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {variantMode === 'simple' && (
              <div className="space-y-4">
                {/* Core fields */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="SKU" required error={errors.sku}>
                    <input value={simpleSku} onChange={(e) => setSimpleSku(e.target.value)}
                      placeholder="例如：WEP-001" className={inputCls(!!errors.sku)} />
                  </Field>
                  <Field label="售价 (USD)" required error={errors.price}>
                    <PriceInput value={simplePrice} onChange={setSimplePrice} hasError={!!errors.price} currency={currencyUnit} />
                  </Field>
                  <Field label="成本">
                    <PriceInput value={simpleCost} onChange={setSimpleCost} currency={currencyUnit} />
                  </Field>
                  <Field label="库存">
                    <input type="number" min={0} value={simpleStock} onChange={(e) => setSimpleStock(e.target.value)}
                      className={cn(inputCls(false), 'text-center')} />
                  </Field>
                </div>
                {simplePrice && simpleCost && Number(simplePrice) > 0 && Number(simpleCost) > 0 && (
                  <MarginBadge price={Number(simplePrice)} cost={Number(simpleCost)} />
                )}
                {/* Extra fields: 划线价 + 条码 + 销售单位 */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="划线原价">
                    <PriceInput value={simpleLogi.compareAtPrice} onChange={(v) => updateSimpleLogi('compareAtPrice', v)} currency={currencyUnit} />
                  </Field>
                  <Field label="条码 / UPC">
                    <input value={simpleLogi.barcode} onChange={(e) => updateSimpleLogi('barcode', e.target.value)}
                      placeholder="条码" className={inputCls(false)} />
                  </Field>
                  <Field label="销售单位">
                    <SalesUnitInput value={salesUnit} onChange={setSalesUnit} />
                  </Field>
                </div>
                {/* Image + logistics in two columns */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">物流尺寸</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {(['weight','length','width','height'] as const).map((f) => (
                      <NumWithUnit
                        key={f}
                        label={f === 'weight' ? '实重' : f === 'length' ? '长' : f === 'width' ? '宽' : '高'}
                        value={simpleLogi[f]}
                        unit={f === 'weight' ? weightUnit : dimUnit}
                        unitOptions={f === 'weight' ? ['g','kg','lb','oz'] : ['cm','in']}
                        onValueChange={(v) => updateSimpleLogi(f, v)}
                        onUnitChange={(u) => f === 'weight' ? setWeightUnit(u as typeof weightUnit) : setDimUnit(u as typeof dimUnit)}
                      />
                    ))}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">体积重 (kg)</label>
                      <input readOnly value={simpleLogi.volumeWeight} placeholder="自动"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center text-[13px] text-[var(--muted)] outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {variantMode === 'multi' && (
              <div className="space-y-5">
                {/* Option defs */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12px] font-medium text-[var(--foreground)]">属性维度（最多 3 个，变体自动更新）</p>
                  </div>
                  <div className="space-y-3">
                    {optionDefs.map((opt, idx) => (
                      <OptionDefRow key={opt.id} opt={opt}
                        inputValue={valueInputs[idx] ?? ''}
                        onNameChange={(v) => updateOptionName(opt.id, v)}
                        onInputChange={(v) => setValueInputs((p) => p.map((x, i) => i === idx ? v : x))}
                        onAddValue={() => addOptionValue(opt.id, idx)}
                        onRemoveValue={(v) => removeOptionValue(opt.id, v)}
                        onRemoveDef={optionDefs.length > 1 ? () => removeOptionDef(opt.id) : undefined}
                      />
                    ))}
                  </div>
                  {optionDefs.length < 3 && (
                    <button onClick={addOptionDef} className="mt-2 flex items-center gap-1 text-[12px] text-[var(--primary)] hover:underline">
                      <Plus className="size-3.5" />添加属性维度
                    </button>
                  )}
                </div>

                {variants.length > 0 ? (
                  <div>
                    {/* Bulk toolbar */}
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2">
                      <span className="text-[12px] font-medium text-[var(--foreground)]">
                        {variants.length} 个变体
                        {pendingVariants > 0 && <span className="ml-2 text-[11px] text-[var(--warning)]">({pendingVariants} 待完善)</span>}
                      </span>
                      <div className="mx-1 h-4 w-px bg-[var(--border)]" />
                      <div className="flex items-center gap-1">
                        <Hash className="size-3 text-[var(--muted)]" />
                        <input value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value)} placeholder="SKU 前缀"
                          className="h-7 w-24 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-mono outline-none focus:border-[var(--primary)]" />
                        <button onClick={applySkuPrefix} className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] hover:bg-[var(--surface-hover)]">填充空 SKU</button>
                      </div>
                      <div className="mx-1 h-4 w-px bg-[var(--border)]" />
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[var(--muted)]">售价</span>
                        <PriceInput value={defaultPrice} onChange={setDefaultPrice} compact currency={currencyUnit} />
                        <button onClick={applyDefaultPrice} className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] hover:bg-[var(--surface-hover)]">应用</button>
                        <span className="ml-1 text-[11px] text-[var(--muted)]">成本</span>
                        <PriceInput value={defaultCost} onChange={setDefaultCost} compact currency={currencyUnit} />
                        <button onClick={applyDefaultCost} className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] hover:bg-[var(--surface-hover)]">应用</button>
                      </div>
                      <div className="mx-1 h-4 w-px bg-[var(--border)]" />
                      <button onClick={() => batchSetStatus('启用')} className="h-7 rounded-md border border-green-200 bg-green-50 px-2 text-[11px] font-medium text-green-700 hover:bg-green-100">全部启用</button>
                      <button onClick={() => batchSetStatus('停用')} className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-hover)]">全部停用</button>
                      <div className="mx-1 h-4 w-px bg-[var(--border)]" />
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[var(--muted)]">批量单位</span>
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) batchSetSalesUnit(e.target.value); e.target.value = ''; }}
                          className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="">— 批量设置 —</option>
                          {['件','套','箱','包','卷','克','千克','升','毫升','双','副','条','张','片'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={expandAll} className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] hover:bg-[var(--surface-hover)]">
                          <ChevronsUpDown className="size-3" />展开
                        </button>
                        <button onClick={collapseAll} className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] hover:bg-[var(--surface-hover)]">
                          <ChevronsDownUp className="size-3" />折叠
                        </button>
                      </div>
                    </div>

                    {(errors.sku || errors.price) && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                        <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                        <p className="text-[11px] text-amber-700">{errors.sku ?? errors.price}</p>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                      <table className="min-w-full text-[12px]">
                        <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
                          <tr>
                            <th className="w-8 px-2 py-2" />
                            {activeOptionDefs.map((d) => <th key={d.id} className="whitespace-nowrap px-3 py-2 text-left">{d.name}</th>)}
                            <th className="whitespace-nowrap px-3 py-2 text-left">图片</th>
                            <th className="whitespace-nowrap px-3 py-2 text-left">Seller SKU <span className="text-[var(--danger)]">*</span></th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">售价 <span className="text-[var(--danger)]">*</span></th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">成本</th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">利润率</th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">库存</th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">销售单位</th>
                            <th className="whitespace-nowrap px-3 py-2 text-right">条码</th>
                            <th className="whitespace-nowrap px-3 py-2 text-center">状态</th>
                            <th className="w-8 px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v) => (
                            <VariantEditRow key={v.id} variant={v} activeOptionDefs={activeOptionDefs}
                              expanded={expandedVariants.has(v.id)} onToggleExpand={() => toggleExpand(v.id)}
                              weightUnit={weightUnit} dimUnit={dimUnit} salesUnit={salesUnit} currencyUnit={currencyUnit}
                              onChange={(field, val) => updateVariant(v.id, field, val)}
                              onDelete={() => setVariants((p) => p.filter((x) => x.id !== v.id))} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-[var(--border)] py-10 text-center text-[13px] text-[var(--muted)]">
                    在上方属性维度中添加属性值，变体组合将自动生成
                  </div>
                )}
              </div>
            )}

            {variantMode === 'bundle' && (
              <BundleSection
                simpleSku={simpleSku} setSimpleSku={setSimpleSku}
                simplePrice={simplePrice} setSimplePrice={setSimplePrice}
                simpleCost={simpleCost} setSimpleCost={setSimpleCost}
                simpleStock={simpleStock} setSimpleStock={setSimpleStock}
                simpleLogi={simpleLogi} updateSimpleLogi={updateSimpleLogi}
                salesUnit={salesUnit} setSalesUnit={setSalesUnit}
                weightUnit={weightUnit} setWeightUnit={setWeightUnit}
                dimUnit={dimUnit} setDimUnit={setDimUnit}
                bundleOutboundMode={bundleOutboundMode} setBundleOutboundMode={setBundleOutboundMode}
                bundleStockMode={bundleStockMode} setBundleStockMode={setBundleStockMode}
                bundleItems={bundleItems} setBundleItems={setBundleItems}
                setShowBundlePicker={setShowBundlePicker}
                images={images}
                errors={errors}
              />
            )}

            {/* ── 图片管理（商品主图 + SKU 图片）── */}
            {(() => {
              const imgVariants: { id: string; sku: string; imageUrl: string; optionLabel?: string }[] =
                variantMode === 'multi'   ? variants.map((v) => ({ id: v.id, sku: v.sku, imageUrl: v.imageUrl, optionLabel: v.options ? Object.values(v.options).join(' / ') : undefined })) :
                variantMode === 'simple'  ? [{ id: 'simple', sku: simpleSku, imageUrl: '' }] :
                [];
              return (
                <ImageManager
                  images={images}
                  variants={imgVariants}
                  addingImageIdx={addingImageIdx}
                  imageInputVal={imageInputVal}
                  onOpenAdd={(idx) => { setAddingImageIdx(idx); setImageInputVal(''); }}
                  onConfirmUrl={confirmImageUrl}
                  onCancelAdd={() => { setAddingImageIdx(null); setImageInputVal(''); }}
                  onUrlChange={setImageInputVal}
                  onRemove={removeImage}
                  onAddMore={() => { setImages((p) => [...p, { id: `img_${Date.now()}`, url: '', alt: '' }]); setAddingImageIdx(images.length); }}
                />
              );
            })()}
          </Section>

          {/* ── 5 · 尺码表（按分类条件显示）────────────────────────────── */}
          {showSizeChart && (
            <Section
              title="尺码表"
              headerRight={
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <Ruler className="size-3.5" />
                  因选择「{catSel.leafLabel}」分类自动显示
                </div>
              }
            >
              <p className="text-[12px] text-[var(--muted)]">填写各尺码对应的身体尺寸（cm / in），将显示在渠道商品页的尺码参考表中。</p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left">测量项目</th>
                      {sizeChartCols.map((col) => (
                        <th key={col} className="whitespace-nowrap px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>{col}</span>
                            <button onClick={() => removeSizeCol(col)} className="text-[var(--muted)] hover:text-[var(--danger)]"><X className="size-2.5" /></button>
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input value={newColInput} onChange={(e) => setNewColInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizeCol(); } }}
                            placeholder="+ 尺码"
                            className="h-6 w-14 rounded-md border border-[var(--border)] px-1.5 text-center text-[10px] outline-none focus:border-[var(--primary)]" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {sizeChartRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--surface-subtle)]">
                        <td className="whitespace-nowrap px-3 py-1.5">
                          <input value={row.label}
                            onChange={(e) => setSizeChartRows((p) => p.map((r) => r.id === row.id ? { ...r, label: e.target.value } : r))}
                            className="h-7 w-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] outline-none focus:border-[var(--primary)]" />
                        </td>
                        {sizeChartCols.map((col) => (
                          <td key={col} className="px-2 py-1.5 text-center">
                            <input type="number" min={0} value={row[col] ?? ''}
                              onChange={(e) => updateSizeCell(row.id, col, e.target.value)}
                              placeholder="—"
                              className="h-7 w-16 rounded-md border border-[var(--border)] px-1 text-center text-[11px] outline-none focus:border-[var(--primary)]" />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeSizeRow(row.id)} className="rounded p-1 text-[var(--muted)] hover:text-[var(--danger)]">
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2">
                <input value={newRowInput} onChange={(e) => setNewRowInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizeRow(); } }}
                  placeholder="新增测量项目（如：袖长 cm）"
                  className="h-8 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
                <button onClick={addSizeRow}
                  className="flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-[12px] hover:bg-[var(--surface-subtle)]">
                  <Plus className="size-3.5" />添加行
                </button>
              </div>
            </Section>
          )}

          {/* ── 6 · 物流 & 海关（仅实物/赠品显示）──────────────────────── */}
          {needsLogistics && (
            <Section title="物流 & 海关">
              <p className="text-[12px] text-[var(--muted)]">产品级默认值；多规格商品可在变体行展开后单独填写（变体值优先）。</p>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(['weight','length','width','height'] as const).map((f) => (
                  <NumWithUnit
                    key={f}
                    label={f === 'weight' ? '实重' : f === 'length' ? '长' : f === 'width' ? '宽' : '高'}
                    value={prodLogi[f]}
                    unit={f === 'weight' ? weightUnit : dimUnit}
                    unitOptions={f === 'weight' ? ['g','kg','lb','oz'] : ['cm','in']}
                    onValueChange={(v) => updateProdLogi(f, v)}
                    onUnitChange={(u) => f === 'weight' ? setWeightUnit(u as typeof weightUnit) : setDimUnit(u as typeof dimUnit)}
                  />
                ))}
                <Field label="体积重 (kg)">
                  <input readOnly value={prodLogi.volumeWeight} placeholder="自动计算"
                    className={cn(inputCls(false), 'bg-[var(--surface-subtle)] text-[var(--muted)]')} />
                </Field>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="HS 编码">
                  <input value={prodLogi.hscode} onChange={(e) => updateProdLogi('hscode', e.target.value)}
                    placeholder="例如：8518300090" className={inputCls(false)} />
                </Field>
                <Field label="原产地">
                  <input value={prodLogi.origin} onChange={(e) => updateProdLogi('origin', e.target.value)}
                    placeholder="例如：中国" className={inputCls(false)} />
                </Field>
              </div>

              {/* Live preview */}
              {(prodLogi.weight || prodLogi.volumeWeight) && (
                <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[11px] text-[var(--muted)]">
                  {prodLogi.weight && <span>实重 <strong className="text-[var(--foreground)]">{prodLogi.weight} g</strong></span>}
                  {prodLogi.length && prodLogi.width && prodLogi.height && (
                    <span>尺寸 <strong className="text-[var(--foreground)]">{prodLogi.length}×{prodLogi.width}×{prodLogi.height} cm</strong></span>
                  )}
                  {prodLogi.volumeWeight && <span>体积重 <strong className="text-[var(--foreground)]">{prodLogi.volumeWeight} kg</strong></span>}
                </div>
              )}

              {/* ── 危险品标识 */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={cn('size-4', hazmat.enabled ? 'text-[var(--danger)]' : 'text-[var(--muted)]')} />
                    <div>
                      <p className={cn('text-[13px] font-medium', hazmat.enabled ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>危险品 / HAZMAT</p>
                      <p className="text-[11px] text-[var(--muted)]">含锂电 / 易燃液体 / 腐蚀性 / 压缩气体等</p>
                    </div>
                  </div>
                  <Toggle checked={hazmat.enabled} onChange={(v) => setHazmat((p) => ({ ...p, enabled: v }))} />
                </div>

                {hazmat.enabled && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-[var(--danger)]">
                      <ShieldAlert className="size-4" />
                      危险品标识信息（将随商品同步至物流服务商）
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">UN 编号</label>
                        <input value={hazmat.unNumber} onChange={(e) => setHazmat((p) => ({ ...p, unNumber: e.target.value }))}
                          placeholder="例如：UN3481（含锂电的设备）"
                          className="h-8 w-full rounded-lg border border-red-200 bg-white px-2.5 text-[12px] outline-none focus:border-[var(--danger)]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">危险类别</label>
                        <select value={hazmat.hazClass} onChange={(e) => setHazmat((p) => ({ ...p, hazClass: e.target.value }))}
                          className="h-8 w-full rounded-lg border border-red-200 bg-white px-2.5 text-[12px] outline-none focus:border-[var(--danger)]">
                          <option value="">选择类别</option>
                          {HAZMAT_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">包装组</label>
                        <select value={hazmat.packingGroup} onChange={(e) => setHazmat((p) => ({ ...p, packingGroup: e.target.value }))}
                          className="h-8 w-full rounded-lg border border-red-200 bg-white px-2.5 text-[12px] outline-none focus:border-[var(--danger)]">
                          <option value="">选择包装组</option>
                          <option value="I">I — 高度危险</option>
                          <option value="II">II — 中度危险</option>
                          <option value="III">III — 低度危险</option>
                          <option value="N/A">N/A — 不适用</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">特殊包装 / 说明</label>
                        <input value={hazmat.note} onChange={(e) => setHazmat((p) => ({ ...p, note: e.target.value }))}
                          placeholder="例如：PI967 Section II，电量 ≤ 30%"
                          className="h-8 w-full rounded-lg border border-red-200 bg-white px-2.5 text-[12px] outline-none focus:border-[var(--danger)]" />
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-red-600">
                      ⚠ 危险品信息须由专业人员填写。错误申报可能导致货物被退运、罚款或禁运。请参考 IATA / IMDG 规范。
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* ════ RIGHT SIDEBAR ══════════════════════════════════════════════ */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">

          {/* Status */}
          <SideCard title="商品状态">
            <select value={productStatus} onChange={(e) => setProductStatus(e.target.value as ProductStatus)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className={cn('mt-1.5 text-[11px]', STATUS_OPTIONS.find((o) => o.value === productStatus)?.color)}>
              {STATUS_OPTIONS.find((o) => o.value === productStatus)?.desc}
            </p>
          </SideCard>

          {/* 货币设置 */}
          <SideCard title="价格货币">
            <select
              value={currencyUnit}
              onChange={(e) => setCurrencyUnit(e.target.value as typeof currencyUnit)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="USD">USD — 美元 ($)</option>
              <option value="EUR">EUR — 欧元 (€)</option>
              <option value="GBP">GBP — 英镑 (£)</option>
              <option value="CNY">CNY — 人民币 (¥)</option>
              <option value="JPY">JPY — 日元 (¥)</option>
              <option value="SGD">SGD — 新加坡元 (S$)</option>
            </select>
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              所有价格字段均使用此货币单位
            </p>
          </SideCard>

          {/* Merchant */}
          <SideCard title="关联店铺">
            <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]">
              <option value="">不关联具体店铺</option>
              {merchants.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.channel})</option>)}
            </select>
            {merchantId && (() => { const m = merchants.find((x) => x.id === merchantId); return m ? (<p className="mt-1.5 text-[11px] text-[var(--muted)]">{m.channel} · {m.region} · {m.currency}</p>) : null; })()}
          </SideCard>

          {/* Brand & Supplier */}
          <SideCard title="品牌与供应商">
            <div className="space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">品牌</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)}
                  placeholder="例如：TechAudio、Apple"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">供应商</label>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)}
                  placeholder="例如：深圳某某科技有限公司"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
              </div>
            </div>
          </SideCard>

          {/* Publish channels */}
          <SideCard title="发布渠道">
            <p className="mb-3 text-[11px] text-[var(--muted)]">创建后立即发布到选中渠道；未选则按状态保存。</p>
            <div className="space-y-2">
              <ChannelToggle icon="🛍" label="Shopify" sublabel="US Store" checked={publishShopify} onChange={setPublishShopify} />
              <ChannelToggle icon="👗" label="SHEIN" sublabel="US SHEIN Store" checked={publishShein} onChange={setPublishShein} />
            </div>
            {(publishShopify || publishShein) && (
              <p className="mt-2 rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-[11px] text-[var(--primary)]">
                创建后自动提交到{[publishShopify && 'Shopify', publishShein && 'SHEIN'].filter(Boolean).join(' 和 ')}
              </p>
            )}
          </SideCard>

          {/* SEO */}
          <SideCard title="SEO 搜索优化">
            <div className="space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">Meta 标题</label>
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || '商品名称（留空则使用商品名）'}
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                <p className="mt-0.5 text-right text-[10px] text-[var(--muted)]">{(seoTitle || title).length} / 60</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">Meta 描述</label>
                <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2} placeholder="简短描述商品，显示在搜索结果摘要中..."
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                <p className="text-right text-[10px] text-[var(--muted)]">{seoDescription.length} / 160</p>
              </div>
            </div>
          </SideCard>

          {/* Sales settings */}
          <SideCard title="销售设置">
            <div className="space-y-3">
              {/* Min order qty */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">起购数量</label>
                <input type="number" min={1} value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)}
                  placeholder="1"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
              </div>
              {/* Stock strategy */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">售罄策略</label>
                <div className="flex gap-2">
                  {([
                    { value: 'deny',     label: '停止销售' },
                    { value: 'continue', label: '允许超卖' },
                  ] as const).map((o) => (
                    <button key={o.value} type="button" onClick={() => setStockStrategy(o.value)}
                      className={cn('flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors',
                        stockStrategy === o.value
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]')}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sale period */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">销售有效期（选填）</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="date" value={saleStartDate} onChange={(e) => setSaleStartDate(e.target.value)}
                    className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                  <input type="date" value={saleEndDate} onChange={(e) => setSaleEndDate(e.target.value)}
                    className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">开始 → 结束，超出范围自动下架</p>
              </div>
            </div>
          </SideCard>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => handleSave(false)}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-[var(--primary)] text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90">
              创建商品
            </button>
            <button onClick={() => handleSave(true)}
              className="flex h-9 w-full items-center justify-center rounded-lg border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
              保存草稿
            </button>
            <button onClick={() => router.push('/dashboard/products')}
              className="flex h-9 w-full items-center justify-center rounded-lg text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Bundle picker modal */}
    {showBundlePicker && (
      <BundlePickerModal
        alreadySelected={bundleItems.filter((b) => b.variantId).map((b) => b.variantId!)}
        onConfirm={(selected) => {
          setBundleItems((prev) => {
            const existingIds = new Set(prev.filter((b) => b.variantId).map((b) => b.variantId));
            const newItems = selected
              .filter((s) => !existingIds.has(s.variantId))
              .map((s) => ({ id: uid(), sku: s.sku, qty: '1', productId: s.productId, variantId: s.variantId, productTitle: s.productTitle, optionLabel: s.optionLabel, price: s.price, stock: s.stock, imageUrl: s.imageUrl }));
            return [...prev.filter((b) => b.variantId), ...newItems];
          });
          setShowBundlePicker(false);
        }}
        onClose={() => setShowBundlePicker(false)}
      />
    )}
  </>
  );
}

// ─── Variant edit row ─────────────────────────────────────────────────────────

function VariantEditRow({
  variant, activeOptionDefs, expanded, onToggleExpand, onChange, onDelete,
  weightUnit = 'g', dimUnit = 'cm', salesUnit = '件', currencyUnit = 'USD',
}: {
  variant: VariantRow; activeOptionDefs: OptionDef[];
  expanded: boolean; onToggleExpand: () => void;
  weightUnit?: string; dimUnit?: string; salesUnit?: string; currencyUnit?: string;
  onChange: <K extends keyof Omit<VariantRow, 'id' | 'options'>>(field: K, value: VariantRow[K]) => void;
  onDelete: () => void;
}) {
  const margin = useMemo(() => {
    const p = Number(variant.price), c = Number(variant.costPrice);
    if (!p || !c || p <= 0) return null;
    return ((p - c) / p * 100).toFixed(0) + '%';
  }, [variant.price, variant.costPrice]);

  const currSym = currencyUnit === 'EUR' ? '€' : currencyUnit === 'GBP' ? '£' : currencyUnit === 'JPY' ? '¥' : currencyUnit === 'CNY' ? '¥' : currencyUnit === 'SGD' ? 'S$' : '$';
  const missing = !variant.sku.trim() || !variant.price.trim();
  const [addingImg, setAddingImg] = useState(false);
  const [imgInput,  setImgInput]  = useState('');
  const confirmImg = () => { if (imgInput.trim()) onChange('imageUrl', imgInput.trim()); setImgInput(''); setAddingImg(false); };

  return (
    <>
      <tr className={cn('group border-t border-[var(--border-subtle)] transition-colors',
        missing ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-[var(--surface-subtle)]',
        expanded && 'bg-[var(--surface-subtle)]')}>
        <td className="px-2 py-2">
          <button onClick={onToggleExpand} className="flex size-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            <ChevronRight className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-90')} />
          </button>
        </td>
        {activeOptionDefs.map((d) => (
          <td key={d.id} className="whitespace-nowrap px-3 py-2 text-[12px] text-[var(--foreground)]">{variant.options[d.name] ?? '—'}</td>
        ))}
        <td className="px-2 py-2">
          {variant.imageUrl ? (
            <div className="group/img relative size-8 overflow-hidden rounded-md border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={variant.imageUrl} alt="" className="size-full object-cover" />
              <button onClick={() => onChange('imageUrl', '')} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100">
                <X className="size-3 text-white" />
              </button>
            </div>
          ) : (
            <button onClick={onToggleExpand} className="flex size-8 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
              <Package className="size-4" />
            </button>
          )}
        </td>
        <td className="px-2 py-1.5">
          <input value={variant.sku} onChange={(e) => onChange('sku', e.target.value)} placeholder="Seller SKU"
            className={cn('h-7 w-32 rounded-md border px-2 font-mono text-[11px] outline-none focus:border-[var(--primary)]',
              !variant.sku && missing ? 'border-amber-400 bg-amber-50' : 'border-[var(--border)]')} />
        </td>
        <td className="px-2 py-1.5">
          <div className={cn('flex h-7 w-24 items-center rounded-md border px-1.5 focus-within:border-[var(--primary)]',
            !variant.price && missing ? 'border-amber-400 bg-amber-50' : 'border-[var(--border)]')}>
            <span className="shrink-0 text-[10px] text-[var(--muted)]">{currSym}</span>
            <input type="number" value={variant.price} onChange={(e) => onChange('price', e.target.value)} placeholder="0.00" className="w-full bg-transparent pl-0.5 text-[11px] outline-none" />
          </div>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex h-7 w-24 items-center rounded-md border border-[var(--border)] px-1.5 focus-within:border-[var(--primary)]">
            <span className="shrink-0 text-[10px] text-[var(--muted)]">{currSym}</span>
            <input type="number" value={variant.costPrice} onChange={(e) => onChange('costPrice', e.target.value)} placeholder="0.00" className="w-full bg-transparent pl-0.5 text-[11px] outline-none" />
          </div>
        </td>
        <td className="px-2 py-1.5 text-right">
          {margin ? <span className="text-[11px] font-medium text-green-600">{margin}</span> : <span className="text-[10px] text-[var(--muted-foreground)]">—</span>}
        </td>
        <td className="px-2 py-1.5 text-right">
          <input type="number" min={0} value={variant.stock} onChange={(e) => onChange('stock', e.target.value)}
            className="h-7 w-14 rounded-md border border-[var(--border)] px-1 text-center text-[11px] outline-none focus:border-[var(--primary)]" />
        </td>
        {/* 销售单位 */}
        <td className="px-2 py-1.5">
          <select
            value={variant.salesUnit || salesUnit}
            onChange={(e) => onChange('salesUnit', e.target.value)}
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          >
            {['件','套','箱','包','卷','克','千克','升','毫升','双','副','条','张','片'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <input value={variant.barcode} onChange={(e) => onChange('barcode', e.target.value)} placeholder="条码"
            className="h-7 w-24 rounded-md border border-[var(--border)] px-2 font-mono text-[11px] outline-none focus:border-[var(--primary)]" />
        </td>
        <td className="px-2 py-1.5 text-center">
          <select value={variant.status} onChange={(e) => onChange('status', e.target.value as VariantStatus)}
            className={cn('h-7 rounded-md border px-1.5 text-[11px] font-medium outline-none',
              variant.status === '启用' ? 'border-green-200 bg-green-50 text-green-700' : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)]')}>
            <option value="启用">启用</option>
            <option value="停用">停用</option>
          </select>
        </td>
        <td className="px-2 py-1.5 text-right">
          <button onClick={onDelete} className="rounded p-1 text-[var(--muted)] opacity-0 hover:bg-[var(--surface-hover)] hover:text-[var(--danger)] group-hover:opacity-100">
            <Trash2 className="size-3.5" />
          </button>
        </td>
      </tr>

      {/* Expanded panel */}
      {expanded && (
        <tr className="border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-subtle)_85%,var(--surface)_15%)]">
          <td className="w-8" />
          <td colSpan={activeOptionDefs.length + 9} className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[140px_1fr]">
              {/* Image */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">变体图片</p>
                {variant.imageUrl ? (
                  <div className="group/vimg relative size-[120px] overflow-hidden rounded-xl border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={variant.imageUrl} alt="" className="size-full object-cover" />
                    <button onClick={() => onChange('imageUrl', '')} className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/vimg:opacity-100">
                      <X className="size-3" />
                    </button>
                  </div>
                ) : addingImg ? (
                  <div className="flex w-[160px] flex-col gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] p-2.5">
                    <input autoFocus value={imgInput} onChange={(e) => setImgInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmImg(); if (e.key === 'Escape') { setAddingImg(false); setImgInput(''); } }}
                      placeholder="粘贴图片 URL"
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] outline-none focus:border-[var(--primary)]" />
                    <div className="flex gap-1">
                      <button onClick={confirmImg} className="flex h-6 flex-1 items-center justify-center rounded-md bg-[var(--primary)] text-[10px] font-medium text-white">确认</button>
                      <button onClick={() => { setAddingImg(false); setImgInput(''); }} className="flex h-6 flex-1 items-center justify-center rounded-md border border-[var(--border)] text-[10px] text-[var(--muted)]">取消</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingImg(true)} className="flex size-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    <ImagePlus className="size-6" />
                    <span className="text-[10px]">上传图片</span>
                  </button>
                )}
              </div>

              {/* Logistics */}
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">物流尺寸</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(['weight','length','width','height'] as const).map((f) => (
                      <NumWithUnit
                        key={f}
                        label={f === 'weight' ? '实重' : f === 'length' ? '长' : f === 'width' ? '宽' : '高'}
                        value={variant[f]}
                        unit={f === 'weight' ? weightUnit : dimUnit}
                        unitOptions={f === 'weight' ? ['g','kg','lb','oz'] : ['cm','in']}
                        onValueChange={(v) => onChange(f, v)}
                        onUnitChange={() => {}}
                      />
                    ))}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">体积重 (kg)</label>
                      <input readOnly value={variant.volumeWeight} placeholder="自动"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center text-[12px] text-[var(--muted)] outline-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">划线原价</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-28 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 focus-within:border-[var(--primary)]">
                      <span className="text-[10px] text-[var(--muted)]">{currSym}</span>
                      <input type="number" value={variant.compareAtPrice} onChange={(e) => onChange('compareAtPrice', e.target.value)} placeholder="0.00" className="w-full bg-transparent text-[12px] outline-none" />
                    </div>
                    {variant.compareAtPrice && variant.price && Number(variant.compareAtPrice) > Number(variant.price) && (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)]">
                        -{(100 - Number(variant.price) / Number(variant.compareAtPrice) * 100).toFixed(0)}% off
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Section({ title, headerRight, children }: { title: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">{title}</h2>
        {headerRight}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('font-medium text-[var(--foreground)]', valueClass)}>{value}</span>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'h-9 w-full rounded-lg border bg-[var(--surface)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
    hasError ? 'border-[var(--danger)]' : 'border-[var(--border)]',
  );
}

function PriceInput({ value, onChange, hasError, compact, currency }: { value: string; onChange: (v: string) => void; hasError?: boolean; compact?: boolean; currency?: string }) {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'CNY' ? '¥' : currency === 'SGD' ? 'S$' : '$';
  return (
    <div className={cn('flex items-center rounded-lg border bg-[var(--surface)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]',
      compact ? 'h-7 w-20' : 'h-9 w-full',
      hasError ? 'border-[var(--danger)]' : 'border-[var(--border)]')}>
      <span className="shrink-0 pl-2 text-[12px] text-[var(--muted)]">{sym}</span>
      <input type="number" min={0} step={0.01} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.00"
        className={cn('flex-1 bg-transparent px-1.5 outline-none', compact ? 'text-[11px]' : 'text-[13px] text-[var(--foreground)]')} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}>
      <div className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

function ChannelToggle({ icon, label, sublabel, checked, onChange }: { icon: string; label: string; sublabel: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn('flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all',
        checked ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-subtle)]')}>
      <div className="flex items-center gap-2.5">
        <span className="text-[18px]">{icon}</span>
        <div>
          <p className="text-[13px] font-medium text-[var(--foreground)]">{label}</p>
          <p className="text-[10px] text-[var(--muted)]">{sublabel}</p>
        </div>
      </div>
      <div className={cn('flex size-5 items-center justify-center rounded-full border-2 transition-all', checked ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]')}>
        {checked && <Check className="size-3 text-white" />}
      </div>
    </button>
  );
}

function MarginBadge({ price, cost }: { price: number; cost: number }) {
  return (
    <div className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] text-green-700">
      毛利率 <strong>{((price - cost) / price * 100).toFixed(1)}%</strong> · 每件毛利 <strong>${(price - cost).toFixed(2)}</strong>
    </div>
  );
}

function OptionDefRow({ opt, inputValue, onNameChange, onInputChange, onAddValue, onRemoveValue, onRemoveDef }: {
  opt: OptionDef; inputValue: string;
  onNameChange: (v: string) => void; onInputChange: (v: string) => void;
  onAddValue: () => void; onRemoveValue: (v: string) => void; onRemoveDef?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <input value={opt.name} onChange={(e) => onNameChange(e.target.value)} placeholder="属性名称（如：颜色）"
          className="h-8 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
        {onRemoveDef && (
          <button onClick={onRemoveDef} className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      {opt.values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {opt.values.map((v) => (
            <span key={v} className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[12px] text-[var(--foreground)]">
              {v}
              <button onClick={() => onRemoveValue(v)} className="text-[var(--muted)] hover:text-[var(--danger)]"><X className="size-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={inputValue} onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddValue(); } }}
          placeholder={`添加${opt.name || '属性'}值，按 Enter 确认`}
          className="h-7 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] outline-none focus:border-[var(--primary)]" />
        <button onClick={onAddValue} className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
          <Plus className="size-3" />添加
        </button>
      </div>
    </div>
  );
}

// ─── Bundle Picker Modal ──────────────────────────────────────────────────────

type PickerVariant = {
  productId: string; variantId: string;
  productTitle: string; optionLabel: string;
  sku: string; price: string; stock: number; imageUrl: string;
};

function BundlePickerModal({
  alreadySelected,
  onConfirm,
  onClose,
}: {
  alreadySelected: string[];
  onConfirm: (selected: PickerVariant[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set(alreadySelected));

  // Flatten all variants from mockProducts into a searchable list
  const allVariants: PickerVariant[] = useMemo(() =>
    mockProducts.flatMap((p) =>
      p.variants.map((v) => ({
        productId:    p.id,
        variantId:    v.id,
        productTitle: p.title,
        optionLabel:  v.options.map((o) => o.value).join(' / '),
        sku:          v.sku,
        price:        String(v.price),
        stock:        v.stock,
        imageUrl:     p.images[0]?.url ?? '',
      }))
    ), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allVariants;
    const q = search.toLowerCase();
    return allVariants.filter((v) =>
      v.productTitle.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      v.optionLabel.toLowerCase().includes(q)
    );
  }, [allVariants, search]);

  const toggle = (variantId: string) =>
    setSelected((p) => { const n = new Set(p); n.has(variantId) ? n.delete(variantId) : n.add(variantId); return n; });

  const toggleAll = () => {
    const filteredIds = filtered.map((v) => v.variantId);
    const allSelected = filteredIds.every((id) => selected.has(id));
    setSelected((p) => {
      const n = new Set(p);
      if (allSelected) filteredIds.forEach((id) => n.delete(id));
      else             filteredIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const handleConfirm = () => {
    const result = allVariants.filter((v) => selected.has(v.variantId));
    onConfirm(result);
  };

  const selectedCount = selected.size - alreadySelected.filter((id) => selected.has(id)).length;
  const newCount = [...selected].filter((id) => !alreadySelected.includes(id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 flex w-full max-w-[720px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]" style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">选择子商品 SKU</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">可多选，已选 {selected.size} 个变体</p>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]">
            <X className="size-4 text-[var(--muted)]" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5">
            <Search className="size-3.5 shrink-0 text-[var(--muted)]" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索商品名、SKU、属性..."
              className="flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
            {search && <button onClick={() => setSearch('')}><X className="size-3 text-[var(--muted)]" /></button>}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto">
          <table className="min-w-full text-[12px]">
            <thead className="sticky top-0 bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox"
                    className="size-3.5 rounded border-[var(--border)] accent-[var(--primary)]"
                    checked={filtered.length > 0 && filtered.every((v) => selected.has(v.variantId))}
                    onChange={toggleAll}
                    aria-label="全选" />
                </th>
                <th className="px-3 py-2.5 text-left">商品 / 变体</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left">Seller SKU</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">单价</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">库存</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[13px] text-[var(--muted)]">没有找到匹配的商品</td>
                </tr>
              ) : filtered.map((v) => {
                const isSelected = selected.has(v.variantId);
                const isExisting = alreadySelected.includes(v.variantId);
                return (
                  <tr key={v.variantId}
                    onClick={() => toggle(v.variantId)}
                    className={cn('cursor-pointer transition-colors', isSelected ? 'bg-[var(--primary-soft)]' : 'hover:bg-[var(--surface-subtle)]')}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(v.variantId)}
                        className="size-3.5 rounded border-[var(--border)] accent-[var(--primary)]"
                        aria-label={v.sku} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {v.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.imageUrl} alt="" className="size-8 shrink-0 rounded-md border border-[var(--border)] object-cover" />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] text-[14px]">📦</div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-medium text-[var(--foreground)]">{v.productTitle}</span>
                            {isExisting && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">已添加</span>}
                          </div>
                          {v.optionLabel && <p className="text-[10px] text-[var(--muted)]">{v.optionLabel}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">{v.sku}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[12px] font-medium text-[var(--foreground)]">
                      ${Number(v.price).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <span className={cn('text-[12px] font-medium', v.stock === 0 ? 'text-[var(--danger)]' : v.stock < 20 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]')}>
                        {v.stock.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3.5">
          <span className="text-[12px] text-[var(--muted)]">
            已选 <strong className="text-[var(--foreground)]">{selected.size}</strong> 个
            {newCount > 0 && <span className="ml-1 text-[var(--primary)]">（新增 {newCount} 个）</span>}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="h-8 rounded-lg border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)]">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={newCount === 0}
              className="h-8 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              确认添加 {newCount > 0 ? `(${newCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
// 零依赖，基于 document.execCommand（仅用于 Demo 原型，生产建议接入 Tiptap/Quill）

import { useRef, useEffect as _useEffect } from 'react';

type ToolbarBtn = {
  cmd: string; arg?: string;
  label: React.ReactNode;
  title: string;
};

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Sync initial value once
  _useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg ?? undefined);
    syncValue();
  };

  const syncValue = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const toolbarGroups: ToolbarBtn[][] = [
    [
      { cmd: 'bold',          label: <strong>B</strong>,    title: '加粗 (Ctrl+B)' },
      { cmd: 'italic',        label: <em>I</em>,            title: '斜体 (Ctrl+I)' },
      { cmd: 'underline',     label: <u>U</u>,              title: '下划线 (Ctrl+U)' },
      { cmd: 'strikeThrough', label: <s>S</s>,              title: '删除线' },
    ],
    [
      { cmd: 'formatBlock', arg: 'h2',  label: 'H2', title: '标题 2' },
      { cmd: 'formatBlock', arg: 'h3',  label: 'H3', title: '标题 3' },
      { cmd: 'formatBlock', arg: 'p',   label: '¶',  title: '正文段落' },
    ],
    [
      { cmd: 'insertUnorderedList', label: '≡', title: '无序列表' },
      { cmd: 'insertOrderedList',   label: '⒈', title: '有序列表' },
      { cmd: 'indent',              label: '→', title: '增加缩进' },
      { cmd: 'outdent',             label: '←', title: '减少缩进' },
    ],
    [
      { cmd: 'justifyLeft',   label: '⫷', title: '左对齐' },
      { cmd: 'justifyCenter', label: '≡', title: '居中' },
      { cmd: 'justifyRight',  label: '⫸', title: '右对齐' },
    ],
  ];

  const insertLink = () => {
    const url = window.prompt('输入链接地址：', 'https://');
    if (url) exec('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt('输入图片 URL：', 'https://');
    if (url) exec('insertImage', url);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1.5">
        {toolbarGroups.map((group, gi) => (
          <div key={gi} className={cn('flex items-center gap-0.5', gi > 0 && 'ml-1 border-l border-[var(--border-subtle)] pl-1')}>
            {group.map((btn) => (
              <button
                key={btn.cmd + (btn.arg ?? '')}
                type="button"
                title={btn.title}
                onMouseDown={(e) => { e.preventDefault(); exec(btn.cmd, btn.arg); }}
                className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[12px] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
        {/* Link & Image */}
        <div className="ml-1 flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-1">
          <button type="button" title="插入链接" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
            className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[12px] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            🔗
          </button>
          <button type="button" title="插入图片" onMouseDown={(e) => { e.preventDefault(); insertImage(); }}
            className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[12px] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            🖼
          </button>
          <button type="button" title="清除格式" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}
            className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[12px] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            ✕<span className="text-[9px]">fmt</span>
          </button>
        </div>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncValue}
        onBlur={syncValue}
        data-placeholder="描述商品核心特点、材质工艺、使用场景..."
        className={cn(
          'min-h-[120px] px-3 py-2.5 text-[13px] text-[var(--foreground)] outline-none',
          '[&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:mb-1',
          '[&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mb-1',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_a]:text-[var(--primary)] [&_a]:underline',
          '[&_img]:max-w-full [&_img]:rounded',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--muted)]'
        )}
      />
    </div>
  );
}

// ─── Category Picker ──────────────────────────────────────────────────────────
// 四列并排面板：点击 L1 列表项 → L2 列出现；点击叶子节点自动关闭面板

type CatSelReturn = ReturnType<typeof useCategorySelect>;

function CategoryPicker({ catSel, error }: { catSel: CatSelReturn; error?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  _useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Columns to display: always show L1; show L2 if L1 chosen; etc.
  const columns: { title: string; items: CatNode[]; selected: string; onSelect: (v: string) => void }[] = [
    {
      title: '一级', items: CATEGORY_TREE,
      selected: catSel.l1, onSelect: catSel.setL1,
    },
  ];
  if (catSel.l1Node?.children) {
    columns.push({ title: '二级', items: catSel.l1Node.children, selected: catSel.l2, onSelect: catSel.setL2 });
  }
  if (catSel.l2Node?.children) {
    columns.push({ title: '三级', items: catSel.l2Node.children, selected: catSel.l3, onSelect: catSel.setL3 });
  }
  if (catSel.l3Node?.children) {
    columns.push({ title: '四级', items: catSel.l3Node.children, selected: catSel.l4, onSelect: catSel.setL4 });
  }

  const handleSelect = (col: typeof columns[0], label: string) => {
    col.onSelect(label);
    // Find the chosen node in this column
    const node = col.items.find((n) => n.label === label);
    // If leaf (no children) → close immediately
    if (!node?.children) setOpen(false);
    // Otherwise keep panel open so user can drill deeper
  };

  const display = catSel.breadcrumb || '请选择商品分类';

  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">
        商品分类 <span className="text-[var(--danger)]">*</span>
      </label>
      {error && <p className="mb-1 text-[11px] text-[var(--danger)]">{error}</p>}

      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border bg-[var(--surface)] px-3 text-left text-[13px] transition-colors',
            open ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : error ? 'border-[var(--danger)]' : 'border-[var(--border)]',
            catSel.breadcrumb ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
          )}
        >
          <span className="flex-1 truncate">{display}</span>
          <ChevronRight className={cn('ml-2 size-4 shrink-0 text-[var(--muted)] transition-transform', open && 'rotate-90')} />
        </button>

        {/* Panel */}
        {open && (
          <div className="absolute left-0 top-[calc(100%+4px)] z-50 flex rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
               style={{ minWidth: `${columns.length * 160}px`, maxWidth: '640px' }}>
            {columns.map((col, ci) => (
              <div key={ci}
                className={cn('flex w-40 shrink-0 flex-col', ci > 0 && 'border-l border-[var(--border-subtle)]')}>
                {/* Column header */}
                <div className="border-b border-[var(--border-subtle)] px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    {col.title}
                  </span>
                </div>
                {/* Items */}
                <div className="max-h-[240px] overflow-y-auto py-1">
                  {col.items.map((node) => {
                    const isActive = col.selected === node.label;
                    const hasChild = !!node.children;
                    return (
                      <button
                        key={node.label}
                        type="button"
                        onClick={() => handleSelect(col, node.label)}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors',
                          isActive
                            ? 'bg-[var(--primary-soft)] font-medium text-[var(--primary)]'
                            : 'text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
                        )}
                      >
                        <span className="flex-1 leading-tight">{node.label}</span>
                        {hasChild && (
                          <ChevronRight className={cn('ml-1 size-3 shrink-0', isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]')} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected path chips */}
      {catSel.breadcrumb && (
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          {[catSel.l1, catSel.l2, catSel.l3, catSel.l4].filter(Boolean).map((seg, i, arr) => (
            <span key={seg} className="flex items-center gap-1">
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px]',
                i === arr.length - 1
                  ? 'bg-[var(--primary-soft)] font-medium text-[var(--primary)]'
                  : 'bg-[var(--surface-subtle)] text-[var(--muted)]'
              )}>
                {seg}
              </span>
              {i < arr.length - 1 && <span className="text-[10px] text-[var(--muted-foreground)]">›</span>}
            </span>
          ))}
          <button
            type="button"
            onClick={() => { catSel.setL1(''); }}
            className="ml-1 text-[10px] text-[var(--muted)] hover:text-[var(--danger)]"
            title="清除分类">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ─── UnitToggle ───────────────────────────────────────────────────────────────

function UnitToggle({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-[var(--muted-foreground)]">{label}</span>
      <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'h-5 px-1.5 text-[9px] font-medium transition-colors',
              value === opt
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-subtle)]'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SalesUnitInput ───────────────────────────────────────────────────────────

const SALES_UNIT_PRESETS = ['件', '套', '箱', '包', '卷', '克', '千克', '升', '毫升', '双', '副', '条', '张', '片'];

function SalesUnitInput({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  _useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className={cn('flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--primary)]', compact ? 'h-7' : 'h-9')}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="件"
          className={cn('flex-1 bg-transparent px-2 outline-none', compact ? 'text-[11px]' : 'text-[13px] text-[var(--foreground)]')}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-l border-[var(--border)] px-1.5 text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
        >
          <ChevronRight className={cn('transition-transform', compact ? 'size-3' : 'size-3.5', open && 'rotate-90')} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-[calc(100%+2px)] z-50 flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-panel)]"
             style={{ width: '200px' }}>
          {SALES_UNIT_PRESETS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => { onChange(u); setOpen(false); }}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                value === u
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]'
              )}
            >
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ImageManager ─────────────────────────────────────────────────────────────
// 商品主图区 + SKU 图片区，合并在 SKU 信息 Section 底部

function ImageManager({
  images, variants, addingImageIdx, imageInputVal,
  onOpenAdd, onConfirmUrl, onCancelAdd, onUrlChange, onRemove, onAddMore,
}: {
  images: ImageSlot[];
  variants: { id: string; sku: string; imageUrl: string; optionLabel?: string }[];
  addingImageIdx: number | null;
  imageInputVal: string;
  onOpenAdd: (idx: number) => void;
  onConfirmUrl: (idx: number) => void;
  onCancelAdd: () => void;
  onUrlChange: (v: string) => void;
  onRemove: (idx: number) => void;
  onAddMore: () => void;
}) {
  return (
    <div className="mt-2 space-y-4 border-t border-[var(--border-subtle)] pt-4">
      {/* ── 商品主图 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">商品主图</p>
          <p className="text-[11px] text-[var(--muted)]">用于商品列表、渠道详情页展示</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => {
            const isMain = idx === 0;
            const size = isMain ? 'size-[88px] shrink-0' : 'size-[64px] shrink-0';
            return (
              <div key={img.id} className="relative shrink-0">
                {img.url ? (
                  <div className={cn('group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]', size)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="size-full object-cover" />
                    {isMain && <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white">主图</div>}
                    <button onClick={() => onRemove(idx)}
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100">
                      <X className="size-2.5" />
                    </button>
                  </div>
                ) : addingImageIdx === idx ? (
                  <div className={cn('flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-1.5', size)}>
                    {/* 文件上传 */}
                    <label className="flex h-6 cursor-pointer items-center gap-1 rounded bg-[var(--primary)] px-2 text-[9px] font-medium text-white">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUrlChange(URL.createObjectURL(file));
                            onConfirmUrl(idx);
                          }
                        }} />
                      <ImagePlus className="size-3" />上传文件
                    </label>
                    <span className="text-[8px] text-[var(--muted-foreground)]">或粘贴 URL</span>
                    <input autoFocus value={imageInputVal}
                      onChange={(e) => onUrlChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onConfirmUrl(idx); if (e.key === 'Escape') onCancelAdd(); }}
                      placeholder="https://..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-[9px] outline-none" />
                    <button onClick={onCancelAdd} className="text-[8px] text-[var(--muted)] underline">取消</button>
                  </div>
                ) : (
                  <button onClick={() => onOpenAdd(idx)}
                    className={cn('flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]', size)}>
                    {isMain ? (<><ImagePlus className="size-5" /><span className="text-[9px]">主图</span></>) : <Plus className="size-4" />}
                  </button>
                )}
              </div>
            );
          })}
          {images.every((i) => i.url) && (
            <button onClick={onAddMore}
              className="flex size-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
              <Plus className="size-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          点击格子粘贴图片 URL · 首张为主图
          {images.filter((i) => i.url).length > 0 && ` · ${images.filter((i) => i.url).length} 张`}
        </p>
      </div>

      {/* ── SKU 图片 ── */}
      {variants.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">SKU 图片</p>
            <p className="text-[11px] text-[var(--muted)]">各变体独立图片，用于渠道颜色切换展示</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {variants.map((v) => (
              <SkuImageSlot key={v.id} sku={v.sku} imageUrl={v.imageUrl} optionLabel={v.optionLabel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── BundleRadioCard ──────────────────────────────────────────────────────────

function BundleRadioCard({
  name, value, label, desc, checked, onChange,
}: {
  name: string; value: string; label: string; desc: string;
  checked: boolean; onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors',
        checked
          ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
          : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-[var(--primary)]"
      />
      <div>
        <p className={cn('text-[12px] font-medium', checked ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
          {label}
        </p>
        <p className="text-[11px] text-[var(--muted)]">{desc}</p>
      </div>
    </label>
  );
}

// ─── BundleSection ────────────────────────────────────────────────────────────

function BundleSection({
  simpleSku, setSimpleSku,
  simplePrice, setSimplePrice,
  simpleCost, setSimpleCost,
  simpleStock, setSimpleStock,
  simpleLogi, updateSimpleLogi,
  salesUnit, setSalesUnit,
  weightUnit, setWeightUnit,
  dimUnit, setDimUnit,
  bundleOutboundMode, setBundleOutboundMode,
  bundleStockMode, setBundleStockMode,
  bundleItems, setBundleItems,
  setShowBundlePicker,
  images,
  errors,
}: {
  simpleSku: string; setSimpleSku: (v: string) => void;
  simplePrice: string; setSimplePrice: (v: string) => void;
  simpleCost: string; setSimpleCost: (v: string) => void;
  simpleStock: string; setSimpleStock: (v: string) => void;
  simpleLogi: SimpleLogistics; updateSimpleLogi: (f: keyof SimpleLogistics, v: string) => void;
  salesUnit: string; setSalesUnit: (v: string) => void;
  weightUnit: string; setWeightUnit: (v: 'g'|'kg'|'lb'|'oz') => void;
  dimUnit: string; setDimUnit: (v: 'cm'|'in') => void;
  bundleOutboundMode: 'bundle' | 'component'; setBundleOutboundMode: (v: 'bundle' | 'component') => void;
  bundleStockMode: 'bundle' | 'component'; setBundleStockMode: (v: 'bundle' | 'component') => void;
  bundleItems: { id: string; sku: string; qty: string; productId?: string; variantId?: string; productTitle?: string; optionLabel?: string; price?: string; stock?: number; imageUrl?: string }[];
  setBundleItems: React.Dispatch<React.SetStateAction<{ id: string; sku: string; qty: string; productId?: string; variantId?: string; productTitle?: string; optionLabel?: string; price?: string; stock?: number; imageUrl?: string }[]>>;
  setShowBundlePicker: (v: boolean) => void;
  images: ImageSlot[];
  errors: Partial<Record<string, string>>;
}) {
  const filledItems = bundleItems.filter((b) => b.productId);

  return (
    <div className="space-y-5">

      {/* ── Step 1: 组合品基本信息 ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
        <p className="mb-3 text-[12px] font-semibold text-[var(--foreground)]">第一步：设置组合商品基本信息</p>

        {/* SKU + 定价 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="组合 SKU" required error={errors.sku}>
            <input value={simpleSku} onChange={(e) => setSimpleSku(e.target.value)}
              placeholder="例如：BUNDLE-001" className={inputCls(!!errors.sku)} />
          </Field>
          <Field label="组合售价 (USD)" required error={errors.price}>
            <PriceInput value={simplePrice} onChange={setSimplePrice} hasError={!!errors.price} />
          </Field>
          <Field label="成本 (USD)">
            <PriceInput value={simpleCost} onChange={setSimpleCost} />
          </Field>
          <Field label="划线原价 (USD)">
            <PriceInput value={simpleLogi.compareAtPrice} onChange={(v) => updateSimpleLogi('compareAtPrice', v)} />
          </Field>
        </div>

        {simplePrice && simpleCost && Number(simplePrice) > 0 && Number(simpleCost) > 0 && (
          <div className="mt-2">
            <MarginBadge price={Number(simplePrice)} cost={Number(simpleCost)} />
          </div>
        )}

        {/* 图片 + 物流（同在第一步内）*/}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[130px_1fr]">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">组合图片</p>
            {images[0]?.url ? (
              <div className="size-[110px] overflow-hidden rounded-xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[0].url} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-[110px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] text-[11px] text-[var(--muted)]">
                <ImagePlus className="size-5" />
                <span>见图片区↓</span>
              </div>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">物流尺寸（整包）</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(['weight','length','width','height'] as const).map((f) => (
                <div key={f}>
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label className="text-[10px] text-[var(--muted)]">
                      {f === 'weight' ? '实重' : f === 'length' ? '长' : f === 'width' ? '宽' : '高'}
                    </label>
                    <select
                      value={f === 'weight' ? weightUnit : dimUnit}
                      onChange={(e) => f === 'weight' ? setWeightUnit(e.target.value as 'g'|'kg'|'lb'|'oz') : setDimUnit(e.target.value as 'cm'|'in')}
                      className="h-4 rounded border border-[var(--border)] bg-[var(--surface)] px-0.5 text-[9px] text-[var(--muted)] outline-none"
                    >
                      {f === 'weight'
                        ? ['g','kg','lb','oz'].map((u) => <option key={u} value={u}>{u}</option>)
                        : ['cm','in'].map((u) => <option key={u} value={u}>{u}</option>)
                      }
                    </select>
                  </div>
                  <input type="number" min={0} value={simpleLogi[f]}
                    onChange={(e) => updateSimpleLogi(f, e.target.value)} placeholder="0"
                    className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-center text-[12px] outline-none focus:border-[var(--primary)]" />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-[10px] text-[var(--muted)]">体积重 (kg)</label>
                <input readOnly value={simpleLogi.volumeWeight} placeholder="自动"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center text-[12px] text-[var(--muted)] outline-none" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-[var(--muted)]">条码 / UPC</label>
                <input value={simpleLogi.barcode} onChange={(e) => updateSimpleLogi('barcode', e.target.value)}
                  placeholder="组合包条码"
                  className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[12px] outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-[var(--muted)]">销售单位</label>
                <SalesUnitInput value={salesUnit} onChange={setSalesUnit} />
              </div>
            </div>
          </div>
        </div>

        {/* 出库方式 + 库存计算方式（在物流尺寸下方）*/}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--foreground)]">出库方式</p>
            <p className="mb-2 text-[11px] text-[var(--muted)]">发货时仓库按哪个维度生成出库指令</p>
            <div className="space-y-1.5">
              <BundleRadioCard name="bundleOutbound" value="bundle"
                label="按组合品出库" desc="仓库以一个组合 SKU 为单位拣货，适合预包装好的套装"
                checked={bundleOutboundMode === 'bundle'} onChange={() => setBundleOutboundMode('bundle')} />
              <BundleRadioCard name="bundleOutbound" value="component"
                label="按子 SKU 出库" desc="仓库分别拣取各子商品，适合现场组装的组合"
                checked={bundleOutboundMode === 'component'} onChange={() => setBundleOutboundMode('component')} />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--foreground)]">库存计算方式</p>
            <p className="mb-2 text-[11px] text-[var(--muted)]">前台展示「可售数量」时的取数逻辑</p>
            <div className="space-y-1.5">
              <BundleRadioCard name="bundleStock" value="bundle"
                label="按组合品库存" desc="组合品有独立库存字段，直接展示该值（预包装模式）"
                checked={bundleStockMode === 'bundle'} onChange={() => setBundleStockMode('bundle')} />
              <BundleRadioCard name="bundleStock" value="component"
                label="按子 SKU 最小值" desc="取所有子 SKU「可售数÷所需数量」的最小值（动态计算）"
                checked={bundleStockMode === 'component'} onChange={() => setBundleStockMode('component')} />
            </div>
            {bundleStockMode === 'bundle' && (
              <div className="mt-2">
                <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">组合品库存数量</label>
                <input type="number" min={0} value={simpleStock}
                  onChange={(e) => setSimpleStock(e.target.value)} placeholder="0"
                  className="h-8 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-center text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
              </div>
            )}
          </div>
        </div>

        {/* 策略说明 */}
        <div className="mt-3 rounded-lg bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--muted)]">
          当前配置：
          <strong className="text-[var(--foreground)]">{bundleOutboundMode === 'bundle' ? '按组合品出库' : '按子 SKU 出库'}</strong>
          ，库存展示来自
          <strong className="text-[var(--foreground)]">{bundleStockMode === 'bundle' ? '组合品独立库存' : '子 SKU 最小可售数'}</strong>
        </div>
      </div>

      {/* ── Step 2: 子 SKU 列表 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">第二步：添加子商品 SKU</p>
          <p className="text-[11px] text-[var(--muted)]">
            {filledItems.length > 0 ? `已添加 ${filledItems.length} 个子 SKU` : '至少添加 1 个子 SKU'}
          </p>
        </div>

        {filledItems.length > 0 && (
          <div className="mb-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-[12px]">
              <thead className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2 text-left">子商品</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left">Seller SKU</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">单价</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">库存</th>
                  <th className="whitespace-nowrap w-20 px-3 py-2 text-right">每套数量</th>
                  {bundleStockMode === 'component' && (
                    <th className="whitespace-nowrap px-3 py-2 text-right">可组套数</th>
                  )}
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filledItems.map((item) => {
                  const availableSets =
                    bundleStockMode === 'component' && item.stock !== undefined && Number(item.qty) > 0
                      ? Math.floor(Number(item.stock) / Number(item.qty))
                      : null;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={item.imageUrl} alt="" className="size-8 shrink-0 rounded-md border border-[var(--border)] object-cover" />
                            : <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] text-[14px]">📦</div>
                          }
                          <div>
                            <p className="text-[12px] font-medium text-[var(--foreground)]">{item.productTitle}</p>
                            {item.optionLabel && <p className="text-[10px] text-[var(--muted)]">{item.optionLabel}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">{item.sku}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[12px] font-medium text-[var(--foreground)]">
                        {item.price ? `$${Number(item.price).toFixed(2)}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <span className={cn('text-[12px] font-medium', Number(item.stock) === 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
                          {item.stock ?? '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min={1} value={item.qty}
                          onChange={(e) => setBundleItems((p) => p.map((b) => b.id === item.id ? { ...b, qty: e.target.value } : b))}
                          className="h-7 w-16 rounded-md border border-[var(--border)] px-2 text-center text-[11px] outline-none focus:border-[var(--primary)]" />
                      </td>
                      {bundleStockMode === 'component' && (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          <span className={cn('text-[12px] font-medium', availableSets === 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]')}>
                            {availableSets !== null ? availableSets : '—'}
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => setBundleItems((p) => p.filter((b) => b.id !== item.id))}
                          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {bundleStockMode === 'component' && filledItems.filter((b) => b.stock !== undefined && Number(b.qty) > 0).length > 0 && (
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-subtle)]">
                    <td colSpan={5} className="px-3 py-2 text-right text-[11px] font-medium text-[var(--muted)]">
                      组合品最终可售套数（取最小值）
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[13px] font-bold text-[var(--primary)]">
                        {Math.min(...filledItems
                          .filter((b) => b.stock !== undefined && Number(b.qty) > 0)
                          .map((b) => Math.floor(Number(b.stock) / Number(b.qty))))}
                      </span>
                    </td>
                    <td className="w-8" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <button
          onClick={() => setShowBundlePicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-[13px] text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <Plus className="size-4" />
          {filledItems.length > 0 ? '继续添加子商品' : '从现有商品中选择子 SKU'}
        </button>
      </div>
    </div>
  );
}

// ─── SkuImageSlot ─────────────────────────────────────────────────────────────

function SkuImageSlot({ sku, imageUrl, optionLabel, onImageChange }: {
  sku: string; imageUrl: string; optionLabel?: string; onImageChange?: (url: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const displayLabel = optionLabel ? `${optionLabel}` : (sku || '未填 SKU');
  const subLabel = optionLabel && sku ? sku : undefined;

  const confirm = (url: string) => {
    if (url && onImageChange) onImageChange(url);
    setInputVal('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {imageUrl ? (
        <div className="group relative size-[64px] overflow-hidden rounded-xl border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={sku} className="size-full object-cover" />
          <button
            onClick={() => onImageChange?.('')}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100"
          >
            <X className="size-3 text-white" />
          </button>
        </div>
      ) : adding ? (
        <div className="flex size-[64px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-1.5">
          <label className="flex h-5 cursor-pointer items-center rounded bg-[var(--primary)] px-1.5 text-[8px] font-medium text-white">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) confirm(URL.createObjectURL(file));
              }} />
            上传
          </label>
          <input
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { confirm(inputVal); } if (e.key === 'Escape') setAdding(false); }}
            placeholder="或粘贴 URL"
            className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-[8px] outline-none"
          />
          <button onClick={() => setAdding(false)} className="text-[8px] text-[var(--muted)] underline">取消</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex size-[64px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <ImagePlus className="size-4" />
        </button>
      )}
      <div className="flex flex-col items-center gap-0">
        <span className="max-w-[72px] truncate text-center text-[10px] font-medium text-[var(--foreground)]">
          {displayLabel}
        </span>
        {subLabel && (
          <span className="max-w-[72px] truncate text-center font-mono text-[9px] text-[var(--muted)]">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── NumWithUnit ──────────────────────────────────────────────────────────────
// 数字输入 + 右侧单位 select 一体化，label 单独一行，完全不遮挡

function NumWithUnit({
  label, value, unit, unitOptions, onValueChange, onUnitChange,
}: {
  label: string;
  value: string;
  unit: string;
  unitOptions: string[];
  onValueChange: (v: string) => void;
  onUnitChange: (u: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--foreground)]">{label}</label>
      <div className="flex h-9 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="0"
          className="min-w-0 flex-1 bg-transparent px-2.5 text-[13px] text-[var(--foreground)] outline-none"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="h-full border-l border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 text-[11px] font-medium text-[var(--foreground)] outline-none hover:bg-[var(--surface-hover)]"
        >
          {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  );
}
