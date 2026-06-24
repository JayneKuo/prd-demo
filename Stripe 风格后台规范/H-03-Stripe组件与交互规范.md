# Stripe 组件与交互规范

## 1. 按钮

### 1.1 按钮层级
按钮分为四个层级。

#### Primary
用于页面或区块中唯一最重要的动作。
示例：
- Create
- Submit payment
- Save changes
- Add settlement currency

规则：
- 同一层级内只允许一个主按钮
- 放在 headers / toolbars 右侧
- 中等高度、紧凑宽度，避免夸张 padding

#### Secondary
用于重要但不应压过主动作的按钮。
示例：
- Export
- Analyze
- Create invoice
- Add payment method

规则：
- 视觉上必须弱于 primary
- 多为 outline 或中性按钮
- 可以与 primary 并列出现

#### Tertiary / utility
用于 settings、icon controls、section 内联动作、行尾 more menus。
示例：
- Table settings
- More actions
- Keyboard shortcuts

#### Danger
仅用于 destructive outcomes。
必须与常规操作空间分离。

### 1.2 按钮放置规则
- 页面头部动作：右对齐
- Section actions：放在 section header 右上角
- Row actions：放在行最右端
- Utility actions：只应出现在顶部 utility bar

### 1.3 按钮密度
按钮必须紧凑、操作化、可预期。
不要在 admin 页面里做超大 CTA。

---

## 2. 搜索

### 2.1 使用场景
Search 主要出现在：
- 列表页 toolbar
- 顶部全局 utility shell

### 2.2 规则
- 搜索从左到右，偏工具型
- placeholder 应明确告诉用户按什么身份字段搜索
- 当有输入值时，inline clear-search 控件出现
- 当 search/filter/view state 形成可复用视图时，可出现 save-as

---

## 3. 筛选器

### 3.1 使用场景
Filter 控件属于列表页 toolbar。

### 3.2 规则
- 按钮文案应保持朴素：Filter
- Filter popover 只承载当前列表的筛选条件，不应变成迷你设置页
- Filter 状态必须支持叠加、紧凑展示、快速撤销
- 高级筛选逻辑应使用渐进式披露，不应默认全部铺开

---

## 4. Tabs 与视图

### 4.1 两种 tab
#### 对象 / 数据 tabs
示例：
- Payments / Payouts / Top-ups / All activity

#### 状态 tabs
示例：
- All / Succeeded / Failed / Refunded

### 4.2 规则
- tabs 必须紧凑、文本主导
- 选中态要清晰，但不能做成肥大的 pills
- tabs 应尽量靠近它所切换的内容区

### 4.3 Saved views
当 search / filter / view state 变得可复用时，使用：
- More views
- Save as

---

## 5. 表格

### 5.1 表格定位
Stripe 风格表格是后台运营 UI 的核心。

### 5.2 结构
- 可选 select-all checkbox
- 可排序表头
- primary identity column
- secondary metadata columns
- row-end overflow actions

### 5.3 行点击模型
常见模式是：
- 行主字段可深链到详情页
- 其他多个字段也可深链到同一详情页

不要让用户必须做像素级精确点击。

### 5.4 表头行为
列头可以带排序或列控制，但要保持低噪音。

### 5.5 分页
分页应极简：
- previous
- next
- result count / range summary

---

## 6. 详情页 Sections

### 6.1 Section 结构
- 标题
- 可选动作
- 内容区
- 必要时的空状态

### 6.2 空状态语法
空状态必须短、明确、冷静。
示例：
- No payments
- No invoices
- No metadata

如果这个 section 可以成为用户下一步动作入口，则允许保留局部 action。

---

## 7. Cards 与 Panels

### 7.1 总原则
应把它们当 panel，而不是装饰型卡片。

### 7.2 适用场景
- settings modules
- report links
- metric summaries
- grouped detail sections

### 7.3 风格规则
- shadow 轻
- border 清楚
- 内边距紧凑
- 标题层级清晰

---

## 8. 表单

### 8.1 分组原则
字段分组应按用户工作流，而不是按数据库 schema 顺序。

### 8.2 必要姿态
- labels 必须常驻显示
- 必要时明确标注 optional
- 只有在容易误解时才补充 description / help
- advanced configuration 永远放在 primary fields 之后

### 8.3 创建流布局
主提交动作固定在 header 中可见。
表单主体聚焦输入本身，不做额外装饰。

---

## 9. 菜单与 Popovers

### 9.1 已观察到的类型
- 全局 create menu
- row more actions menu
- reporting submenu
- saved view inline popover
- filter 和 table settings popovers

### 9.2 规则
- 菜单必须紧凑
- 文案必须直接、操作化
- 可以出现 keyboard shortcuts 提示
- 菜单不能膨胀成完整设置界面

---

## 10. 设置模块

### 10.1 Settings hub 入口模式
每个设置入口卡片包含：
- icon
- title
- concise explanation

### 10.2 规则
Settings hub 应是模块导航目录，而不是一页塞满所有设置表单。

---

## 11. 报表模块

### 11.1 报表分组模式
每个 report family 包含：
- 类别标题
- 一段解释
- 指向具体报表的链接

### 11.2 规则
按业务问题分组，而不是按底层系统来源分组。

---

## 12. 状态处理

### 12.1 Empty
空状态必须短、冷静、明确。

### 12.2 Disabled
当一个动作在概念上存在，但在当前上下文不能执行时，使用 disabled。
已观察到的例子：
- 客户详情里的 Create payment disabled
- 某些余额页面里的 Add funds disabled

### 12.3 New / Preview
Badges 必须紧凑、低噪音。
仅用于产品生命周期提示。

### 12.4 Loading
尽量局部 loading。
除非是 route-level 跳转，否则不要整个 shell 全屏阻塞。

---

## 13. 按钮级放置矩阵

| 场景 | 允许控件 | 说明 |
|---|---|---|
| Page header right | primary + 1-2 个 secondary | 主次关系必须一眼清楚 |
| List toolbar | search、filter、table settings、views | 只放操作型控件 |
| Section header right | add / manage / export 等局部动作 | 作用域必须局部 |
| Row end | more actions | 当一行有多个动作时，使用 overflow |
| Top utility bar | apps、help、notifications、settings、create | 只放全局动作 |
| Create header | submit、submit-and-create-another、close | 提交动作必须保持可见 |

---

## 14. Developer-Surface 规则

### 14.1 Workbench 结构
Developer surface 应像产品内置的控制台，而不是一个毫不相关的 DevTools 弹层。

已观察到的模式：
- 紧凑 tab strip
- 高密度技术卡片
- event/log filtering row
- shell / command zone 锚定在底部
- utility actions：copy link、options、fullscreen、close

### 14.2 Event 与 Log 视图
规则：
- 以 search-first 的方式进入诊断
- filters 应是可叠加、按字段组织的
- 空状态仍然保持冷静、可操作
- timestamps、IDs、status、resource 都应视作一级诊断 token

### 14.3 Health 与 Key Material 面板
规则：
- 使用清晰的分组卡片
- 敏感值必须通过 reveal / copy 等显式动作控制
- key management 相关动作要保持次级但明确

### 14.4 Developer shell 区
如果页面存在 shell / command zone：
- 视觉上锚定到底部
- 保持紧凑、工具化
- 不能压过上方主要业务内容

---

## 15. 防漂移规则

绝对不要把这套系统变成：
- 软绵绵的大卡片 dashboard 风
- 超大现代 SaaS 按钮风
- 浮动玻璃控件
- 营销型表单
- 渐变 analytics tiles
- 图标过度、偏玩具感的 ERP UI
