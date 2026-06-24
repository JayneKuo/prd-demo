# Stripe 后台技术实现规范

## 1. 文档定位

本文档是最终技术主规范。

它统一收敛以下内容：
- React / Next.js 工程实现方式
- 文件夹结构与职责分层
- 组件拆分与页面落地方法
- token、排版、颜色、表格基础实现规则
- AI 执行边界与工程侧防漂移约束
- 新窗口 AI 从系统架构开始搭建时的执行顺序

本文件回答的问题是：
- 用什么技术栈
- 用什么语言
- 文件夹和组件怎么组织
- 页面模板在代码里怎么落地
- token 放哪
- 表格 / 表单 / 详情页如何实现
- AI 在工程层面不允许做什么

它不负责重新定义 UI 风格；UI 风格请看 UI 主规范。

---

## 2. 技术栈总原则

默认技术栈：
- **语言**：TypeScript
- **框架**：React + Next.js（App Router 优先）
- **样式**：Tailwind CSS
- **基础组件**：shadcn/ui + Radix primitives
- **表格**：TanStack Table
- **表单**：React Hook Form + Zod
- **图标**：统一图标系统（如 lucide-react）

规则：
- 不要在实现层引入与这套系统冲突的第二套 UI 体系
- 不要混用多个表格体系
- 不要在业务页里直接临时拼装另一套表单和布局语言

---

## 3. 工程分层

### 3.1 Shell 层
负责：
- 左侧导航
- 顶部 utility bar
- 环境条
- 页面容器
- 可选 developer/workbench 容器

Shell 层不关心具体业务字段。

### 3.2 Page Archetype 层
负责稳定页面骨架：
- ListPageTemplate
- DetailPageTemplate
- CreatePageTemplate
- EditPageTemplate
- SettingsHubTemplate
- ReportsHubTemplate
- ApprovalWorkspaceTemplate
- WorkbenchTemplate

这一层只定义结构，不绑定业务 schema。

### 3.3 Shared UI 层
负责通用组件：
- PageHeader
- ActionToolbar
- SearchInput
- FilterButton
- TableSettingsButton
- StatusBadge
- EmptyPanel
- SectionCard
- SectionHeader
- PaginationFooter
- MoreActionsMenu
- MetadataPanel

### 3.4 Domain Section 层
负责业务域内的信息区块：
- OrderLineItemsSection
- InventoryWarehouseBreakdownSection
- PurchaseReceivingSection
- CustomerActivitySection
- ApprovalDecisionSection
- SettingsModuleGridSection

一个 section 只做一件事。

### 3.5 Domain Table / Form 层
负责领域级表格与表单抽象：
- OrdersTable
- InventoryTable
- PoTable
- OrderFormSections
- InventoryAdjustmentFormSections

### 3.6 Schema / Mapper 层
负责：
- display schema
- status 映射
- 列定义工厂
- section 数据映射
- badge variant 映射
- page action config 映射

---

## 4. 文件夹与目录风格

目录名可以适配当前项目，但必须满足以下职责边界：

### 4.1 推荐角色划分
- `app/`：页面入口、路由级页面文件
- `components/layout/`：shell、导航、全局布局
- `components/ui/`：基础 UI 包装层
- `components/admin/` 或 `components/archetypes/`：列表页 / 详情页 / 设置页等 archetype 组件
- `components/<domain>/`：业务域组件与 section
- `lib/ui/`：token helpers、variants、table helpers、page config helpers
- `lib/schemas/`：Zod schemas、display schema、field config
- `lib/mappers/`：状态到 badge、字段到 section、动作到 UI 的映射

### 4.2 目录规则
- 页面入口不写太重的 JSX
- archetype 层不承载具体业务逻辑
- domain 组件不重新定义 shell 和页面骨架
- token / variant / helper 不直接散落在页面文件中

### 4.3 命名规则
- 页面模板组件：`ListPageTemplate`、`DetailPageTemplate`
- 业务 section：`<Domain><Meaning>Section`
- 业务表格：`<Domain>Table`
- 业务表单：`<Domain>FormSections`
- 映射器：`map<Order>StatusToBadge`
- 字段配置：`orderDisplaySchema`、`inventoryListColumns`

---

## 5. 页面文件职责

Page 文件只负责：
- 选择 archetype
- 组织 sections
- 连接数据
- 注入 actions / columns / schema

Page 文件不应该直接负责：
- 长篇复杂表格列定义
- 整个 toolbar 的全部交互实现
- 所有 section 内容 JSX
- 所有状态映射
- 所有表单字段配置

如果 page 文件开始同时负责结构、样式、逻辑、字段、动作和状态映射，就说明分层失败。

---

## 6. 组件拆分规则

### 6.1 模板组件负责结构
例如：
- ListPageTemplate：header + toolbar + content + footer
- DetailPageTemplate：breadcrumb + object header + main/side columns
- CreatePageTemplate：header action bar + grouped body sections

模板组件不得写死业务字段。

### 6.2 Section 组件负责信息区块
例如：
- 一个 section 只负责仓库库存
- 一个 section 只负责审批时间线
- 一个 section 只负责客户活动

### 6.3 Shared 组件负责统一语法
例如：
- 所有 list toolbar 必须复用同一组 Search / Filter / TableSettings / SavedViews 组件
- 所有 metadata panels 必须共享边框、标题、间距和文本层级

---

## 7. 设计 Token 落点

### 7.1 总原则
技术实现上必须服从：
- UI 风格由 Stripe UI 主规范定义
- 基础 token 则吸收项目现有设计系统（Typography、Colors、DataTable）

### 7.2 字体
默认主字体：
- **Satoshi**

后台页面推荐落地：
- 页面标题：24px 左右
- section 标题：16px-20px
- 正文：14px-16px
- 元数据 / 表头 / 按钮：12px-14px

大展示级字号（96/128）不进入后台业务页默认实现。

### 7.3 颜色
默认使用项目现有 shadcn token 体系：
- background
- foreground
- primary
- secondary
- accent
- muted
- border
- input
- ring
- destructive
- sidebar 系列 token

技术上允许沿用这些 token 名称，但页面气质必须服从 Stripe 风格后台的克制语义。

### 7.4 间距
默认使用稳定的 4/8 体系：
- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

禁止使用无体系随机值作为常规页面间距。

### 7.5 圆角与边框
- radius 优先使用 md / lg 级别
- border 是一级结构，不依赖 heavy shadow
- 表格、panel、input、sidebar 边界必须清晰

---

## 8. Tailwind / shadcn / Radix 使用规范

### 8.1 Tailwind
允许直接使用 Tailwind，但要求：
- 同类组件样式来自统一抽象
- 不允许每个页面自己重写一套按钮 / panel / toolbar 风格
- 重复样式应抽象为组件或 variant，而不是复制 class 串

### 8.2 shadcn/ui
允许使用现成组件，但建议建立项目内包裹层：
- Button
- Input
- Tabs
- DropdownMenu
- Dialog / Sheet
- Select
- Tooltip
- Table primitives

目的：
- 统一密度
- 统一边框
- 统一交互语义

### 8.3 Radix
Radix primitives 应作为交互基础，而不是让业务页直接感知复杂底层。

### 8.4 TanStack Table
所有运营型列表页应统一：
- 列头行为
- 排序 affordance
- row actions
- 空状态 / loading / pagination 处理

不要每个列表页重写一套 DataTable 逻辑。

---

## 9. DataTable 技术基线

### 9.1 结构要求
吸收现有 DataTable Design 并与 Stripe 风格融合：
- checkbox 列可固定在最左
- 第一主数据列可固定
- actions 列在最右
- 中间列可横向滚动
- 支持 row selection
- 支持批量操作
- 支持分页

### 9.2 视觉要求
- 中等密度
- 表头清晰但不厚重
- 行 hover 轻量
- 主身份字段可点击
- 次字段可深链到同一详情页
- row-end more actions 固定在最右

### 9.3 Toolbar 统一组合
列表 toolbar 优先包含：
- status tabs
- search
- filter
- table settings
- saved views / more views

技术上应抽象成稳定工具栏组合，不能每页散写。

---

## 10. 表单技术基线

### 10.1 表单结构
创建 / 编辑页至少拆成：
- header action bar
- field groups
- section containers
- validation schema
- submit handler
- optional advanced block

### 10.2 表单规则
- labels 常驻
- optional 明确
- 高风险字段先解释后控件
- create/edit 主提交动作在 header
- body 只保留输入结构，不做装饰性视觉块

### 10.3 React Hook Form + Zod
推荐：
- Zod 负责字段 schema
- RHF 负责交互控制
- display schema 与 validation schema 分离，但可关联

---

## 11. 详情页技术基线

每个详情页至少拆成：
- header block
- main column sections
- side column sections
- metadata / timeline / log blocks
- action config

技术上必须有稳定的 detail layout 抽象，不允许每个详情页临时拼双栏 div。

---

## 12. 设置 / 报表页技术基线

### 12.1 Settings hub
设置中心应使用稳定的数据结构：
- title
- description
- optional status
- destination

### 12.2 Reports hub
报表中心应使用稳定的数据结构：
- category title
- category description
- report entries

---

## 13. Developer / Workbench 技术基线

Developer surface 应单独抽象，不应散落在业务页中硬拼。

建议包含：
- WorkbenchContainer
- WorkbenchTabStrip
- DiagnosticsFilterBar
- DiagnosticPanels
- ShellZone
- UtilityActionCluster

日志、事件、API activity、health、inspector 等都是同一 workbench 容器里的不同视图。

---

## 14. 数据到 UI 的映射规则

生成页面时必须按以下顺序：
1. 确认页面 archetype
2. 从对象 display schema 中选择 Tier 1 / Tier 2 / Tier 3 / Tier 4
3. 决定哪些进列表列
4. 决定哪些进详情 header
5. 决定哪些进 main sections
6. 决定哪些进 metadata side panel

### 14.1 状态映射
状态禁止裸字符串直接输出，必须映射为：
- label
- semantic variant
- 必要时的次级说明

### 14.2 动作映射
动作必须先分层：
- page-level primary
- page-level secondary
- section-level action
- row-level action
- overflow action

---

## 15. AI 工程执行规则

### 15.1 AI 必须按顺序搭建
如果 AI 从系统架构、导航、基础组件开始搭建，顺序必须是：
1. shell 层
2. page archetype 层
3. shared components
4. domain sections
5. display schema / mapper
6. 业务数据绑定

禁止先堆业务页，再回头补系统。

### 15.2 AI 不得做的事
- 每页自己发明 layout
- 每模块自己造 toolbar
- 每个表格页自己造 DataTable 风格
- 详情页自己定义左右栏比例与结构
- 页面文件承担所有职责
- 状态、动作、字段映射全部硬写在长 JSX 文件里
- 重新设计 UI 风格

### 15.3 AI 新窗口最少阅读集
如果让新窗口 AI 从系统搭建开始，最少先读：
- 01-Stripe后台UI统一规范.md
- 02-Stripe后台技术实现规范.md

这两个文件应视为未来所有项目的起始规范。

---

## 16. 文件夹风格总原则

文件夹结构不要求死板统一命名，但必须满足：
- shell 与 layout 独立
- archetype 独立
- shared ui 独立
- domain sections 独立
- schema / mappers 独立
- token / ui helpers 独立

重点不在目录名，而在职责边界不能混。

---

## 17. 文档结论

本文件是最终技术主规范。

以后新项目如果采用这套体系：
- UI 看 UI 主规范
- 工程实现、文件夹组织、组件拆分、token 落点、AI 工程边界，都以本文件为准

它负责“怎么在代码里把这套系统稳定搭出来”。
