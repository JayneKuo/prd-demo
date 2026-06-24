# Stripe 技术实现规范

## 1. 目的

本文档补齐 Stripe 风格后台系统的技术落地层。前面的文档解决的是“长什么样”“用什么语法”“显示什么字段”，本文件解决的是“在 React 项目里应该怎么组织代码，才能稳定落成这套系统”。

目标：
- 让 AI 和开发者不只是看懂风格，还知道如何拆组件、落结构、做复用
- 避免每个页面都各写一套 toolbar、table、detail layout
- 保证 shell、页面 archetype、字段展示和组件交互在工程层面真正统一

---

## 2. 推荐前端分层

建议按以下层级组织：

### 2.1 Shell 层
负责全局后台框架：
- 左侧导航
- 顶部 utility bar
- 环境条
- 页面容器
- 可选的 developer/workbench 容器

Shell 层不关心业务字段。

### 2.2 Page Archetype 层
负责页面骨架模板：
- ListPageTemplate
- DetailPageTemplate
- CreatePageTemplate
- EditPageTemplate
- SettingsHubTemplate
- ReportsHubTemplate
- ApprovalWorkspaceTemplate

这一层决定页面的主结构，但不写死具体业务字段。

### 2.3 Business Section 层
负责具体业务 section：
- OrderLineItemsSection
- InventoryWarehouseBreakdownSection
- PurchaseReceivingSection
- CustomerActivitySection
- SettingsModuleGridSection

这一层才真正承接业务数据。

### 2.4 Shared Component 层
负责跨页面复用的组件：
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

### 2.5 Domain Component 层
负责业务域内复用：
- OrdersTable
- InventoryTable
- PoSummaryPanel
- ApprovalDecisionBar
- ExceptionTimeline

---

## 3. React 组件拆分规则

### 3.1 页面组件不应过重
Page 文件只负责：
- 选择 archetype
- 组织 sections
- 连接数据
- 配置动作

不要把复杂 toolbar、表格列定义、详情布局、表单逻辑全部塞进 page 文件。

### 3.2 模板组件负责结构，不负责业务
例如：
- ListPageTemplate 负责 header + toolbar + content + footer 骨架
- DetailPageTemplate 负责 breadcrumb + title + main/side columns

模板组件不得绑定具体订单或库存字段。

### 3.3 Section 组件负责信息区块
一个 section 只做一件事。
例如：
- 一个 section 只负责库存仓维度拆分
- 一个 section 只负责客户活动
- 一个 section 只负责支付摘要

---

## 4. 推荐目录思路

可按现有项目结构适配，但建议保证以下角色清晰：

- layout / shell 相关组件
- archetype 模板组件
- shared ui wrappers
- domain sections
- domain tables
- domain forms
- schema / mappers

重点不是目录名，而是角色边界明确。

---

## 5. 样式与 Token 落点

> 具体的设计 token、字体、颜色、表格基础密度和排版实现细则，统一以 [H-08-Stripe设计Token与排版实现规范.md](H-08-Stripe设计Token与排版实现规范.md) 为准。本文件只定义工程层结构和落地职责，不重复承载完整 token 细节。


### 5.1 不允许页面自己发明 spacing 和 radius
必须使用统一 token 或统一 class 约定。

必须统一的内容：
- spacing tier
- border radius
- panel border behavior
- muted text color
- table density
- badge variants
- toolbar gap

### 5.2 不允许每个页面自己拼一套按钮等级
必须统一按钮语义：
- primary
- secondary
- tertiary / utility
- danger

### 5.3 Tailwind 使用原则
Tailwind 可以直接写，但必须满足：
- 同类组件风格来自同一套抽象
- 不允许每个页面重新拼一套 button / panel / toolbar 样式
- 优先抽成变体或包裹组件，而不是重复 class 串

---

## 6. shadcn / Radix / Table 的使用规范

### 6.1 shadcn 组件
可以使用现成基础组件，但建议对这些建立项目内包裹：
- Button
- Input
- Tabs
- DropdownMenu
- Dialog / Sheet
- Select
- Tooltip
- Table primitives

原因：
- 统一 Stripe 风格密度
- 统一边框和动作层级
- 统一状态语义

### 6.2 TanStack Table
对于所有运营型列表页：
- 统一列头行为
- 统一排序 affordance
- 统一 row action 区域
- 统一 empty / loading / pagination 处理

不要每个表格页重新发明结构。

---

## 7. 数据到 UI 的映射规范

### 7.1 字段映射顺序
生成页面时，应先走：
1. 确认页面 archetype
2. 从对象字段模板中挑选 Tier 1 / Tier 2 / Tier 3 / Tier 4
3. 决定哪些进列表列
4. 决定哪些进详情 header
5. 决定哪些进 main sections
6. 决定哪些进 metadata side panel

### 7.2 状态映射
状态永远不要裸输出字符串。
必须映射为：
- 文本标签
- 语义颜色
- 必要时的次级说明

### 7.3 动作映射
动作也要先分类：
- page-level primary
- page-level secondary
- section-level actions
- row-level actions
- overflow actions

---

## 8. 列表页技术基线

每个列表页至少应拆成：
- page header config
- toolbar config
- column definition module
- table wrapper
- pagination footer

推荐把“搜索 / 筛选 / 保存视图 / 表格设置”做成稳定工具栏组合，而不是页面内联散写。

---

## 9. 详情页技术基线

每个详情页至少应拆成：
- header block
- main column sections
- side column sections
- timeline / metadata blocks
- action config

详情页不要直接用一堆 div 临时拼双栏。
应该有稳定的 detail layout 抽象。

---

## 10. 创建 / 编辑页技术基线

至少拆成：
- create/edit header
- form sections
- field group definitions
- submission action bar
- optional advanced sections

不要把所有表单字段都堆进一个组件里。

---

## 11. 设置 / 报表页技术基线

### 11.1 设置中心
设置中心应有稳定的 module-card 数据结构：
- title
- description
- optional status
- destination

### 11.2 报表中心
报表中心应有稳定的 report-category 数据结构：
- category title
- category description
- report entries

---

## 12. Developer / Workbench 技术基线

Developer surface 应单独抽象，不要散落在业务页里硬拼。
建议包含：
- workbench container
- tab strip
- diagnostics filter bar
- diagnostic content panels
- shell zone
- utility action cluster

日志、事件、API activity、health 等都只是同一容器里的不同视图。

---

## 13. 禁止项

工程层面禁止：
- 每个页面自己造一套 layout
- 每个模块自己造 toolbar
- 每个表格页自己造 table 风格
- 每个详情页自己定义双栏比例和 section 结构
- 用业务 page 文件承担所有组件职责
- 不经抽象直接把状态、动作、字段展示写死在 JSX 长文件里

---

## 14. AI 落地规则

如果 AI 从“系统架构、导航、基础组件层”开始搭建，它必须按以下顺序执行：
1. 先建立 shell 层
2. 再建立 page archetype 模板层
3. 再建立 shared components
4. 再落 domain sections
5. 最后接业务数据与字段映射

禁止反过来先堆业务页面，再回头补系统。

---

## 15. 与其它文档的关系

- 01：定义整体视觉系统
- 02：定义页面 archetype
- 03：定义组件与交互
- 04：定义 AI 行为边界
- 05：定义字段与信息架构
- 07：定义技术落地方式

如果要从新窗口让 AI 开始搭系统，推荐至少让它先读：
- H-01-Stripe后台UI系统规范.md
- H-03-Stripe组件与交互规范.md
- H-04-AI执行约束规范.md
- H-07-Stripe技术实现规范.md

如果要直接做某个具体页面，再额外加：
- H-02-Stripe页面模板规范.md
- H-05-对象字段与信息架构模板.md
