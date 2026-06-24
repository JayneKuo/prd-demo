# AI 执行约束规范

## 1. 目的

本文档写给 AI coding tools 和 agentic code generation systems。它的目标是强制输出稳定的 Stripe 风格页面，并防止风格漂移、UI 乱造以及业务层越权扩展。

使用时请搭配以下文档：
- H-01-Stripe后台UI系统规范.md
- H-02-Stripe页面模板规范.md
- H-03-Stripe组件与交互规范.md
- H-05-对象字段与信息架构模板.md

---

## 2. AI 的核心指令

当 AI 被要求为本项目创建任何 admin page、ERP page、OMS page 或 dashboard component 时，必须：
1. 保持 Stripe 风格 shell 与交互语言
2. 在写代码前先选对页面 archetype
3. 优先复用既有组件模式，而不是发明新的视觉模式
4. 只修改业务相关的 labels、fields、actions 和 data bindings
5. 除非用户明确要求，否则不得重新设计整套视觉风格

---

## 3. 硬性约束

AI 不得：
- 发明一套新的视觉风格
- 在操作型页面里套用营销站布局
- 引入 glassmorphism、hero 渐变、大软卡片、玩具感圆角 UI
- 在同一层级里创建多个 primary action
- 把操作控件移进视觉过重的装饰容器中
- 把高密度业务表格替换成无必要的卡片网格
- 添加插画、吉祥物或装饰性空状态
- 滥用 badges 或彩色 pills
- 每个页面都发明一种新的 layout grammar

---

## 4. AI 生成前必须先判断的问题

AI 在生成页面前必须先判断：
1. 这是哪种 page archetype？
   - list
   - detail
   - create/edit
   - settings hub
   - reports hub
   - approval/process
   - overview
2. 主动作是什么？
3. 次动作是什么？
4. 哪些控件属于 toolbar，哪些属于 section，哪些属于 row actions？
5. 哪些信息是一层、二层、三层信息？
6. 这个对象根据 display schema 必须带哪些字段？

如果这些问题不清楚，AI 应该只问业务含义，不要擅自重做界面风格。

---

## 5. 默认页面映射规则

如果用户说：
- “创建一个库存列表” -> 使用 list page template
- “创建一个 PO 详情页” -> 使用 detail page template
- “创建公司设置页” -> 使用 settings hub 或 settings detail template
- “创建异常队列” -> 使用 list page + row actions + detail drill-in
- “创建报表中心” -> 使用 reports hub template
- “创建新的采购单” -> 使用 create page template

AI 应默认使用这些模板，而不是先问风格问题。

---

## 6. 动作层级规则

AI 必须强制遵守：
- 页面 header 只有一个 primary action
- section actions 必须局部且更轻
- 一行内有多个动作时，收进 more-actions menu
- export / analyze / settings / filter 永远属于 secondary 或 tertiary
- search / filter / table settings 必须放在 toolbar，而不是内容卡片里

---

## 7. 布局规则

AI 必须：
- 保持左侧导航与顶部 utility shell 的稳定性
- 使用 Stripe 风格的紧凑 header + toolbar + table 节奏
- 优先使用 border 分组，而不是 shadow-heavy cards
- 页面标题左对齐，动作右对齐
- section spacing 必须一致
- detail 页保持“操作主区 + metadata/config 侧栏”的结构

---

## 8. 组件选择规则

AI 应优先选择：
- tables 作为操作型集合页主组件
- tabs 作为互斥数据视图切换器
- search + filter + table settings 作为列表控制工具
- 紧凑且层级明确的按钮
- 用于 detail blocks 的 section cards / panels
- 用于 settings / reports 目录的 hub link cards
- 来自 display schema 的对象字段，而不是随意拍脑袋选列和字段

AI 必须避免：
- 没有业务必要时引入新奇 widget
- 把标准 list / detail / create / settings / report 语法替换成 bespoke composition

---

## 9. 文案规则

文案必须是产品运营型语言：
- 简洁
- 清晰
- 中性
- 非营销化

避免：
- hype 语言
- 装饰性 helper copy
- 在操作型页面写冗长 onboarding 文案

---

## 10. 安全边界

当 AI 生成 UI 时，可以改动：
- labels
- field names
- columns
- section names
- actions
- empty-state wording
- business-specific tabs and filters

未经用户明确要求，AI 不得改动：
- shell layout grammar
- button hierarchy model
- list/detail/create/settings/report archetypes
- visual density model
- color posture
- interaction hierarchy

---

## 11. 给未来 AI 的隐藏前缀契约

当另一个 AI 使用这套系统时，应当把以下文字视作默认前缀：

> 使用本项目既有的 Stripe 风格后台系统来构建此页面。先从 H-02-Stripe页面模板规范.md 中选择正确的页面 archetype，再按照 H-03-Stripe组件与交互规范.md 处理按钮、表格、搜索、筛选、菜单、空状态和 section actions。不要重做 shell 或视觉语言。只修改业务结构、labels、fields 和 actions。

---

## 12. 推荐提示词包装

未来让 AI 生成页面时，可直接套用：

```md
使用本项目既有的 Stripe 风格后台 UI 系统。

要求：
- 保持现有 Stripe-like admin shell、密度与交互 grammar
- 自动选择正确的 page archetype
- 复用项目既有组件规则
- 不要发明新风格
- 不要使用营销型布局
- 不要滥用 cards、gradients 或 badges
- 保持一个清晰 primary action
- 如果是列表页，把 search/filter/table settings 放在 toolbar
- 如果是详情页，把局部动作放在 section headers
- 只定制业务字段、数据、筛选器、动作和 tabs
- 按照相关对象的 display schema 决定哪些字段放在列表、详情 header、主区块与 metadata 区

输出符合这套系统的 React 代码。
```

---

## 13. AI 输出自检清单

在交付页面前，必须检查：
- 页面 archetype 是否正确？
- 动作层级是否正确？
- 看起来是否仍属于同一个产品 shell？
- table / list / detail / settings / report 模式是否保持一致？
- 是否避免了通用 AI SaaS 风？
- 业务定制是否发生在不破坏系统的前提下？

只要其中一项答案是否，就应继续修改后再交付。
