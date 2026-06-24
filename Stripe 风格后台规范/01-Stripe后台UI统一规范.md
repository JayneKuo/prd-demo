# Stripe 后台 UI 统一规范

## 1. 文档定位

本文档是最终 UI 主规范。

它统一收敛以下内容：
- Stripe 风格产品级视觉系统
- 页面 archetype 模板
- 组件与交互语法
- 对象字段展示与信息架构
- Developer / Workbench 的界面模式

以后任何项目只要希望使用这套后台 UI，都应优先以本文件为准。

本文件回答的问题是：
- 页面应该长什么样
- 页面应该如何组织
- 模块之间如何保持同一产品语言
- 字段应该如何展示
- 哪些交互是固定语法

它不负责解释工程实现细节；工程实现请看技术主规范。

---

## 2. 总目标

这套 UI 系统的目标不是“好看”，而是：
- 让复杂业务像一个成熟产品系统，而不是一组零散页面
- 让新页面天然属于同一个产品宇宙
- 让 AI 生成页面时默认沿用同一套结构、视觉和交互逻辑
- 让业务变化主要体现在字段、数据和动作，而不是反复重造界面

本规范以 Stripe Dashboard / Merchant / Workbench 的产品逻辑为主要参考，但会落到 ERP / OMS / Admin 场景。

---

## 3. 核心产品原则

### 3.1 数据优先，装饰其次
界面的核心职责是帮助用户：
- 扫描
- 比较
- 判断
- 执行动作

视觉设计必须服务于理解，不能与业务数据争抢注意力。

### 3.2 高密度，但不压迫
信息密度应是中高，而不是靠巨大留白和软卡片来“显得高级”。
真正的高级感来自：
- 严格对齐
- 紧凑但可读的间距
- 明确的边界
- 强信息层级
- 清晰的主次关系

### 3.3 冷静可信
整体气质应是：
- 可靠
- 金融化
- 运营化
- 低噪音
- 不炫技

避免：
- 夸张渐变
- 戏剧化动效
- 软萌圆角
- 过重阴影
- 营销式大视觉区

### 3.4 一个系统，多个模块
以下模块都必须共享同一套 UI 语言：
- balances
- transactions
- customers
- inventory
- procurement / PO
- approvals
- reports
- settings
- automation
- diagnostics
- developer workbench

模块不同，只改变信息与动作，不改变 shell grammar。

### 3.5 渐进式披露
默认只展示推进任务所需的最少信息。
二级和长尾操作进入：
- tabs
- filters
- more actions menus
- drawers
- section-level actions
- expandable metadata

### 3.6 先读再做
每个页面都应让用户快速回答：
1. 我现在在哪？
2. 我在看哪个对象 / 数据集？
3. 当前状态是什么？
4. 主要动作是什么？
5. 下一层需要看的细节是什么？

---

## 4. 视觉系统

### 4.1 色彩总原则
整体以中性色为主，强调色和状态色极度克制。

推荐占比：
- 80% 中性色：背景、边框、正文、次文本
- 15% 强调色：active 状态、focus、关键链接、主选择态
- 5% 状态色：success / warning / danger / info / preview / new

### 4.2 页面背景与 surface
- 页面背景应为非常浅的 neutral
- 面板 / surface 用白色或轻微抬起的浅色
- 面板层级优先通过 border、分隔线和间距表现，而不是厚重阴影

### 4.3 文本层级
- 页面标题：强，但不夸张
- section 标题：紧凑、清晰
- 表头与标签：小而清楚
- 主正文：14px-16px
- 元数据：12px-14px，视觉上明显次于主数据

### 4.4 边框、圆角、阴影
- 边框比阴影更重要
- 圆角中等且精确，不可爱
- 阴影仅轻度存在
- 卡片不是视觉主角，panel 才是组织信息的容器

### 4.5 设计气质禁忌
严禁把后台做成：
- 营销型 landing page
- 渐变 SaaS AI 页面
- glassmorphism
- 到处大 pill 和大 soft card
- 情绪化插画式空状态
- 居中展示型数据工作流

---

## 5. 间距与密度系统

### 5.1 间距体系
使用稳定的 4/8 基础体系：
- 4：微间距
- 8：紧凑控件间距
- 12：区块内部小节奏
- 16：常规 padding / 组件间距
- 24：section 间距
- 32：大区块分隔
- 48 / 64：极少数大结构分隔

### 5.2 密度目标
- Toolbar：紧凑
- Table：中等密度
- Detail sections：中等密度
- Settings hub：中低密度
- Create / Edit：中等密度，字段分组清楚
- Diagnostic / Workbench：高密度但仍有层级

### 5.3 宽度策略
桌面和笔记本：
- 内容不要无脑横铺满屏
- 保持可读工作列宽
- 仅在确实提升效率时引入右侧辅助列

平板收缩：
- 侧边栏收起
- 顶部上下文与主动作保留
- 双栏堆叠成单列

---

## 6. Shell 统一规则

### 6.1 持久化 shell
所有页面属于统一 shell：
- 顶部环境 / 状态条
- 左侧导航
- 顶部 utility bar
- 内容视口
- 可选 developer/workbench 区

### 6.2 环境条
仅用于环境级信息：
- sandbox / test mode
- 全局告警
- 账户级环境上下文

环境条必须纤细、信息化。

### 6.3 左侧导航
规则：
- 文本优先，图标辅助
- active 状态明确，但不刺眼
- 按产品域分组
- shortcuts 位于核心导航下方
- 产品家族可以展开

### 6.4 顶部 utility bar
通常包含：
- search
- help
- notifications
- settings shortcut
- global create action

它是全局工具区，不承载业务页局部动作。

---

## 7. 页面 Archetype 统一规则

### 7.1 列表页
标准结构：
1. page header
2. 页面级动作
3. 数据集 / 状态 tabs
4. toolbar：search、filter、views、table settings
5. 数据表格
6. pagination / result count

适用：
- 订单列表
- 库存列表
- 采购单列表
- 客户列表
- 审批队列
- 异常队列

### 7.2 详情页
标准结构：
1. breadcrumb
2. 对象头部
3. 对象级动作
4. 左侧主业务区
5. 右侧 metadata / config 区

适用：
- 订单详情
- PO 详情
- SKU 详情
- 客户详情
- 发票详情

### 7.3 创建 / 编辑页
标准结构：
1. 专用 header
2. close / back affordance
3. 头部可见的主提交动作
4. 分组后的表单主体
5. advanced 区域放后面

### 7.4 设置中心
标准结构：
1. 按类别分组
2. 每个类别下是模块卡片 / link
3. personal / account / product 设置清晰分开

### 7.5 报表中心
标准结构：
1. 标题
2. 类别化报表区块
3. 每类有解释
4. 每类包含若干报表入口

### 7.6 审批 / 处理流页
标准结构：
1. queue/list
2. 当前对象 detail
3. decision / processing action bar

### 7.7 概览 / 看板页
标准结构：
1. 标题 + scope controls
2. summary metrics
3. charts / trends
4. recent activity / hot list table

### 7.8 Developer / Workbench
标准结构：
1. workbench 触发器
2. workbench header
3. tab strip
4. diagnostics content
5. shell / command zone

---

## 8. 组件层统一规则

### 8.1 按钮层级
分为四类：
- Primary：页面 / section 中唯一最重要动作
- Secondary：重要但不压过 primary
- Tertiary / Utility：设置、筛选、行尾菜单等
- Danger：破坏性动作

#### 放置规则
- 页面头部动作：右对齐
- section action：section header 右上
- row actions：最右端
- utility actions：仅顶部 utility bar

### 8.2 Search
- 列表页 toolbar 与全局 utility bar 专属
- placeholder 明确搜索范围
- 输入后出现 clear-search
- 与 filter / save-as 一起形成视图状态

### 8.3 Filter
- 属于列表页 toolbar
- 是作用域内过滤器，不是设置页
- 支持叠加、撤销、紧凑显示
- 高级筛选应渐进式披露

### 8.4 Tabs 与 Views
两类：
- 数据集 / 对象 tabs
- 状态 tabs

规则：
- 紧凑、文字优先
- 选中态清晰但不过重
- 紧贴所控制内容

### 8.5 Table
规则：
- 可选 select-all
- 可排序列头
- 主身份字段可点击
- 次字段可深链到同一详情页
- row-end more actions
- 简洁分页

### 8.6 Section
规则：
- title
- optional action
- content area
- compact empty state

### 8.7 Cards / Panels
原则：
- 把它们当信息 panel，而不是装饰卡片
- 适用于 settings 模块、report links、detail sections、metrics

### 8.8 Forms
规则：
- label 常驻显示
- optional 明确标识
- advanced 配置永远在主要字段后
- create/edit 页的主动作放 header

### 8.9 Menus / Popovers
已纳入语法：
- global create menu
- row more actions menu
- reporting submenu
- saved view inline popover
- filter popover
- table settings popover

### 8.10 状态处理
- Empty：短、冷静、明确
- Disabled：保留动作概念但不可执行
- New / Preview：小型低噪音 badge
- Loading：尽量局部，不全屏阻塞 shell

---

## 9. 字段与信息架构统一规则

### 9.1 四层信息模型
所有业务对象必须按以下层级组织：
- Tier 1：身份与当前状态
- Tier 2：操作上下文
- Tier 3：支撑细节
- Tier 4：审计与长尾元数据

### 9.2 列表页字段原则
只展示：
- Tier 1
- 对当前决策最重要的 Tier 2
- 必要时的 row-end actions

不要把 Tier 3 / Tier 4 塞进普通业务列表页。

### 9.3 详情页字段原则
- Tier 1 放 header
- Tier 2 放首屏 section
- Tier 3 放 detail blocks / 右侧 metadata
- Tier 4 放 timeline / logs / metadata / config

### 9.4 核心对象字段模板

#### Orders
列表页默认：
- order number
- status
- customer
- source/channel
- order date
- total amount
- fulfillment/shipment state
- exception indicator

详情页：
- header：order number、status、customer、date、amount、primary actions
- main：line items、fulfillment、shipment、payments、timeline
- side：metadata、tags、addresses、source IDs、sync/config

#### Inventory / SKU
列表页默认：
- SKU
- product/variant name
- available qty
- reserved qty
- warehouse summary
- inventory status
- updated at

详情页：
- header：SKU、product、availability、total available、primary warehouse
- main：warehouse breakdown、movements、inbound、reservations
- side：identifiers、vendor/category、metadata、thresholds

#### Purchase Orders
列表页默认：
- PO number
- supplier
- status
- created/ordered date
- expected date
- total amount
- receiving progress

详情页：
- header：PO number、supplier、status、expected date、amount、primary actions
- main：line items、receiving、shipment/ASN、approvals/timeline
- side：terms、supplier refs、attachments、custom fields、metadata

#### Customers
列表页默认：
- customer name
- email / primary contact
- description / segment
- country / region
- created date

详情页：
- header：customer name、contact summary、state、top actions
- main：orders/payments/subscriptions/activity
- side：details、metadata、configuration

#### Reports
Hub 入口应包含：
- report name
- 业务问题说明
- 可选生命周期标签（new/preview）

报表详情页应包含：
- title
- time period
- scope filters
- metric summary
- chart area
- detailed table / breakdown

#### Approval / Exception Objects
列表页默认：
- object ID / title
- current state
- owner / assignee
- age / SLA
- reason / category
- updated at

详情页：
- main：decision context、core business data、reason、timeline
- side：metadata、routing hit、audit info

#### Settings / Config Modules
Hub 卡片应包含：
- module title
- 一句范围说明
- 可选状态提示

详情页应按：
1. default behavior
2. core options
3. integrations/dependencies
4. advanced settings
5. audit info

#### Developer / Diagnostic Surfaces
事件 / 日志列表默认 token：
- ID
- timestamp
- status/result
- resource type
- event type / action type
- destination/subsystem

诊断详情应包含：
- technical identifier
- current state/result
- related resource
- payload summary
- timeline 或 request/response details

---

## 10. Developer / Workbench 的界面规则

Workbench 不是孤立的 devtool，而是产品内部的技术工作台。

规则：
- 保持同一 shell 语言
- 用紧凑 tab strip 切换视图
- dense diagnostics，但层级清楚
- event/log 视图采用 search-first + field-based filters
- utility controls 包括 copy/options/fullscreen/close
- 底部 shell 区锚定清晰，但不能压过主内容

---

## 11. 响应式规则

### Desktop wide
- 左侧导航常驻
- 详情页可双栏 / 多栏
- 表格可更宽
- utility actions 内联

### Laptop
- 维持侧栏可见（如空间允许）
- 收紧 toolbar 和间距
- 控制文本行宽

### Tablet collapsed
- 侧栏收起
- 保留顶部上下文与主动作
- 详情页双栏堆叠
- 仍要保持主次动作一眼清楚

---

## 12. 统一禁止项

严禁：
- 超大 hero admin 页面
- 软绵绵大卡片风
- 营销型渐变
- 重阴影 / glassmorphism
- 过度 pills
- 同层级多个 primary actions
- 把复杂数据流做成居中展示页
- 通用 AI SaaS 紫蓝渐变白底风
- 玩具化控件
- 每页重新发明一套 layout grammar

---

## 13. 适用方式

以后任何项目如果希望采用这套 UI：
- 先以本文件作为唯一 UI 主规范
- 所有页面、组件、字段展示、developer surfaces 都必须优先服从本文件
- 业务自定义只能改字段、动作、数据、过滤条件和局部术语
- 不得破坏 shell、archetype、层级和整体语法

本文件负责“长什么样、怎么组织、显示什么、怎么交互”。
技术落地请看技术主规范。
