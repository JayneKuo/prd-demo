# Stripe 页面模板规范（适用于 ERP / OMS / Admin）

## 1. 目的

本文档定义从 Stripe 产品模式中提炼出的可复用页面模板。这不是截图翻译，而是一组结构化配方，可直接用于库存、采购、订单、审批、财务、主数据、报表和配置工作流。

---

## 2. 列表页模板

### 2.1 适用场景
- 订单列表
- 库存列表
- 采购单列表
- 客户列表
- 支付列表
- 审批队列
- 异常队列

### 2.2 结构
1. 页面头部
   - 标题
   - 可选副标题
   - 0-3 个头部动作
2. 数据集 tabs 或状态 tabs
3. 控制 toolbar
   - search
   - filter
   - saved views / more views
   - table settings
4. 数据表格
5. 分页与结果数量 footer

### 2.3 头部动作规则
- 主动作放在右侧
- export / analyze 属于次级动作
- 不要出现多个视觉上同等强势的主动作

### 2.4 Toolbar 规则
推荐顺序：
- view tabs
- search
- filter
- table settings
- saved views / more views

### 2.5 表格规则
- 第一列可以有批量选择 checkbox
- 行主身份字段必须可点击
- 次级字段可以深链到同一个详情页
- 只有当一行存在两个以上次级动作时，才使用 row-end more actions
- pagination 放在表格下方，而不是上方

### 2.6 ERP 适配示例
- Inventory list：All / Low stock / Negative / Reserved
- Orders list：All / Pending / Packed / Shipped / Exception
- Approval queue：All / Waiting / Escalated / Rejected / Completed

---

## 3. 详情页模板

### 3.1 适用场景
- 订单详情
- 采购单详情
- 客户详情
- SKU 详情
- 发票详情
- 运单详情

### 3.2 结构
1. Breadcrumb
2. 对象头部
   - 对象名称 / 标题
   - 元数据副标题
   - 右侧对象动作
3. 主详情栅格
   - 左侧：操作相关 sections
   - 右侧：details / config / metadata sections

### 3.3 Section 设计
每个 section 应包含：
- section title
- 可选 section action
- 内容区或空状态区

### 3.4 空 section 规则
当某个 section 没有数据时：
- 使用紧凑型空状态
- 只有当用户确实能在此处补充数据时，才显示作用域内动作
- 不要用大插画或夸张的空状态包装它

### 3.5 ERP 适配示例
- Order detail 左侧：line items、fulfillment、shipment、timeline
- Order detail 右侧：metadata、payment、customer、automation config
- PO detail 左侧：items、receipt progress、supplier events
- PO detail 右侧：terms、attachments、custom fields

---

## 4. 创建页模板

### 4.1 适用场景
- 创建支付
- 创建采购单
- 创建库存调整
- 创建工作流规则
- 创建审批请求

### 4.2 结构
1. 专用创建头部
   - 标题
   - close / back affordance
   - 头部内的主提交动作
2. 表单主体
   - 分组后的 sections
   - 主要字段优先
   - 高级配置放后面

### 4.3 提交动作模式
优先使用：
- 主提交动作
- 仅当流程高频重复时，才提供 submit-and-create-another
- 不允许把 destructive actions 和主提交动作放成同级主按钮

### 4.4 字段分组顺序
1. 身份 / 对象类型
2. 核心业务数据
3. 关联实体
4. 金额 / 数量类字段
5. 描述 / 备注
6. 高级 / 可选控制

### 4.5 ERP 适配示例
- 创建库存调整：warehouse、SKU、quantity delta、reason、notes
- 创建 PO：supplier、warehouse、line items、dates、terms、attachments
- 创建规则：trigger、condition、action、exceptions

---

## 5. 编辑页模板

### 5.1 与创建页的区别
编辑页应：
- 保留对象身份信息在 header
- 区分不可变信息与可变信息
- 在合适时展示最近变更或日志

### 5.2 保存模式
- 主保存动作在 header 或 sticky footer
- cancel 必须清楚可见
- 危险动作应与常规保存行为空间分离

---

## 6. 设置中心模板

### 6.1 适用场景
- 平台设置
- 账户设置
- 自动化设置
- 财务设置
- 通知设置

### 6.2 结构
1. 按类别分组的设置模块
2. 每类有标题
3. 每个入口是带描述的导航卡片 / link

### 6.3 规则
- 按用户心智模型分组，而不是按后端归属分组
- 描述文案必须解释作用域，而不是实现细节
- settings hub 应是模块导航页，而不是巨型单页表单

### 6.4 ERP 适配类别
- Personal settings
- Organization settings
- Security and roles
- Inventory settings
- Procurement settings
- Finance settings
- Integrations
- Automation

---

## 7. 报表中心模板

### 7.1 适用场景
- analytics index
- reporting landing page
- BI / report directory

### 7.2 结构
1. 页面标题
2. 报表类别
3. 每个类别包含简短解释与报表链接

### 7.3 规则
- 按业务问题分组，而不是按技术表来源分组
- 避免巨大的扁平列表
- preview / new 状态标签要节制使用

### 7.4 ERP 适配类别
- operational performance
- inventory health
- procurement performance
- finance reconciliation
- approval SLA
- exception analytics

---

## 8. 审批 / 处理流模板

### 8.1 适用场景
- 审批中心
- 路由审核
- 异常处理
- 任务处理

### 8.2 结构
1. 左侧或上方 queue / list
2. 中间或主区展示当前选中项 detail
3. action bar：approve / reject / assign / escalate

### 8.3 规则
- 必须先给用户足够上下文，再出现决策按钮
- 审批理由和备注应成为一等公民
- danger color 只用于真正的 destructive outcomes

---

## 9. 看板 / 概览页模板

### 9.1 适用场景
- KPI 总览
- 运营 dashboard
- 管理层 overview

### 9.2 结构
1. 标题 + scope controls
2. summary metric cards
3. charts / trend modules
4. recent activity 或 hot list 表格

### 9.3 规则
- 指标卡必须紧凑严肃，不能像营销型大屏卡片
- 趋势图是指标的辅助，不应压过指标本身
- 页面里至少要有一个 table 或 queue，让页面落回真实工作上下文

---

## 10. Developer / Workbench 模板

### 10.1 适用场景
- API activity
- event deliveries
- webhook inspection
- integration health
- logs and traces
- developer diagnostics

### 10.2 结构
1. 持久化的底部或侧边 developer surface trigger
2. Workbench header
   - section title
   - 环境级 utility actions
   - close / fullscreen / options controls
3. Workbench tabs
   - overview
   - webhooks / events / logs / health / inspector / shell 等目标区
4. 聚焦型诊断内容区
5. 可选 shell / command 输入区

### 10.3 规则
- developer surfaces 仍然是同一个产品 shell 的一部分
- 使用紧凑 utility bar 和高密度诊断内容
- 优先使用 tabbed tool areas，而不是单独重新造一个 DevTools 风格系统
- event / log 视图中的筛选器应像数据探索过滤器，而不是后台设置表单
- 诊断页可以更技术化，出现 technical IDs、timestamps、key material，但视觉层级仍然必须是 Stripe-like 且受控的

### 10.4 ERP 适配示例
- exception debugger
- automation run inspector
- integration event monitor
- API call log explorer
- sync health console

---

## 11. 你项目中的默认映射

推荐默认映射：
- Inventory list -> 列表页模板
- Inventory detail -> 详情页模板
- PO list -> 列表页模板
- PO detail -> 详情页模板
- PO create / edit -> 创建 / 编辑模板
- Routing rules -> 视流程而定，使用 approval/process 或 settings 模板
- Reporting -> report hub + report detail
- Company config -> settings hub
- Exception handling -> queue + detail split layout
