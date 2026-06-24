# Stripe 设计 Token 与排版实现规范

## 1. 目的

本文档用于把项目现有的基础设计规范（Typography、Colors、DataTable、AI-Friendly UI Design）与 Stripe 风格后台规范进行融合，形成真正可落地的设计 token 与排版实现标准。

它解决的问题是：
- Stripe 风格在这个项目里到底应该使用什么字体、字号、颜色、边框、间距与表格密度
- 技术实现时该如何选择 token，而不是每个页面各写一套
- 新窗口 AI 该遵守什么基础视觉 token

---

## 2. 总原则

### 2.1 UI 风格主导权
UI 风格以 Stripe 风格后台规范为主。

### 2.2 基础 token 来源
技术落地时，优先吸收项目现有设计基础：
- Typography Design
- Shadn Colors Design
- DataTable Design
- AI-Friendly UI Design Guide

### 2.3 最终融合策略
- 布局、组件层级、页面 archetype 以 Stripe 为准
- 字体、颜色 token、表格基础密度、通用 spacing token 在不破坏 Stripe 气质的前提下使用项目现有基础定义

---

## 3. 字体系统

### 3.1 主字体
优先使用项目既有主字体：
- **Satoshi**

如果某个技术环境无法加载，则回退到稳定系统无衬线字体栈，但不得改成花哨展示字体。

### 3.2 字体角色
在 Stripe 风格后台中，不使用营销型超大排版层级作为常规页面默认值。

推荐后台应用层级：
- 页面标题：24px 左右，font-semibold / font-bold
- 区块标题：16px-20px，font-medium / font-semibold
- 正文：14px-16px
- 辅助文案：12px-14px
- 标签 / 表头 / button text：12px-14px

### 3.3 排版限制
虽然 Typography Design 中存在更大的展示级层级（如 96px、128px），但在后台系统中默认禁止滥用。

这些大字号仅可用于：
- 特殊 marketing 页面
- 大型 landing
- 品牌展示区

不得用于：
- 列表页
- 详情页
- 设置页
- 审批页
- 报表页主结构

### 3.4 中文环境建议
由于本项目常见中英文混排，建议：
- 中文正文保持 14px-16px
- 行高 1.5-1.65
- 避免在小字号上使用过轻字重
- 不使用过度紧缩字距

---

## 4. 色彩 token

### 4.1 总体原则
项目现有 shadcn color token 可继续使用，但在视觉语义上必须服从 Stripe 风格后台规范。

也就是说：
- 可以用现有 token 名称与 CSS 变量体系
- 但页面气质必须保持 Stripe 的冷静、克制、数据优先

### 4.2 推荐 token 角色
优先使用：
- background
- foreground
- primary
- primary-foreground
- secondary
- secondary-foreground
- accent
- accent-foreground
- muted
- muted-foreground
- border
- input
- ring
- destructive
- destructive-foreground

### 4.3 Sidebar token
现有 sidebar token 体系可直接保留：
- sidebar background
- sidebar foreground
- sidebar primary
- sidebar accent
- sidebar border
- sidebar ring

但视觉上必须满足：
- active item 明确但不刺眼
- hover 有反馈但不喧宾夺主
- 不做过重色块堆积

### 4.4 图表色
现有 chart 色板可以继续使用，但规则如下：
- 图表颜色服务于区分数据，不服务于装饰
- 不可使用过强渐变和厚重阴影
- 先保证可读，再考虑品牌感

---

## 5. 间距 token

### 5.1 基础体系
沿用项目现有 4/8 体系，并与 Stripe 研究结果统一：
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px

### 5.2 后台推荐使用方式
- xs = 4px：图标与文字微间距
- sm = 8px：紧凑控件间距
- md = 16px：默认控件 padding / 常规块间距
- lg = 24px：页面 section 间距
- xl = 32px：大模块分隔

### 5.3 禁止项
- 不允许出现 15px、22px 这类无体系值作为常规间距
- 不允许页面自己定义随机间距层级

---

## 6. 圆角与边框

### 6.1 圆角
可沿用项目现有 radius 体系，例如：
- sm
- md
- lg
- xl

但后台页面默认推荐：
- 使用 md / lg 为主
- 避免过圆、过软的视觉效果

### 6.2 边框
Stripe 风格后台里，边框是一级重要视觉结构。

规则：
- 所有卡片、panel、table、toolbar 边界应优先依赖 border，而不是重阴影
- 边框颜色统一使用 border token
- 输入框、表格、side panel 边界不可缺失

---

## 7. 表格实现细则

### 7.1 基础表格结构
吸收 DataTable Design 的这些规则：
- checkbox 列在最左
- 第一数据列可固定
- actions 列在最右
- 中间列可横向滚动
- 支持 row selection
- 支持批量操作
- 支持分页

### 7.2 与 Stripe 风格融合后的要求
- 视觉密度中等，不要做成过于宽松的 BI 卡片表格
- 表头必须清晰，但不能过重
- 行 hover 轻量
- 行主标识可点击
- 次字段可深链到同一详情页
- row-end more actions 保持最右

### 7.3 状态标签
可以沿用项目既有 success / warning / danger / info 语义色，但必须控制为：
- 小尺寸
- 低噪音
- 语义优先

### 7.4 toolbar 规则
列表 toolbar 推荐组合：
- status tabs
- search
- filter
- table settings
- saved views / more views

不得把 toolbar 拆成各页面自己拼的非一致结构。

---

## 8. 表单与输入

### 8.1 输入框
沿用项目 input token，但必须满足：
- 高度统一
- focus ring 明确
- placeholder 使用 muted text
- 文本层级稳定

### 8.2 标签与说明
- label 永远显示
- optional 允许明确标出
- 解释文案只在确有必要时出现
- 高风险字段要有先解释、后控件的顺序

### 8.3 创建页动作
Create / Edit 页面中：
- 主提交动作放 header
- body 中只保留与输入相关的结构
- 不要再给 body 加营销型视觉块

---

## 9. 典型后台字号建议

建议统一到以下后台层级：

| 角色 | 建议字号 | 建议字重 |
|---|---:|---|
| 页面标题 | 24px | 600-700 |
| 页面描述 | 14px | 400 |
| section 标题 | 16px-20px | 500-600 |
| 表头 | 12px-14px | 500 |
| 正文 | 14px-16px | 400 |
| 元数据 | 12px-14px | 400 |
| 按钮文案 | 12px-14px | 500 |
| badge / label | 12px | 500 |

---

## 10. AI 技术使用规则

未来 AI 生成页面时，应默认认为：
- 字体使用 Satoshi 或兼容系统栈
- 颜色使用现有 shadcn token
- 布局语法、动作层级、页面 archetype 服从 Stripe 规范
- 表格细则参考 DataTable Design，但视觉上必须回到 Stripe 风格后台

也就是说：
- **风格主导是 Stripe**
- **基础 token 落地来自项目既有设计系统**

---

## 11. 与其它文档的关系

- 01：定义整体 Stripe UI 系统
- 02：定义页面模板
- 03：定义组件与交互
- 04：定义 AI 约束
- 05：定义字段与信息架构
- 07：定义工程实现分层
- 08：定义设计 token、排版和表格等基础视觉实现细则

如果要让 AI 从技术侧开始搭建系统，建议至少读：
- H-01-Stripe后台UI系统规范.md
- H-03-Stripe组件与交互规范.md
- H-04-AI执行约束规范.md
- H-07-Stripe技术实现规范.md
- H-08-Stripe设计Token与排版实现规范.md
