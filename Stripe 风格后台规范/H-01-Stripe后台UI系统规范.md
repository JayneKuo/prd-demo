# Stripe 风格 React 后台 UI 系统规范

## 1. 目的

本文档定义本项目使用的 Stripe 风格产品级 UI 系统。它不是一份模糊的灵感参考，而是一套严格的系统，用来让 React 后台页面、ERP 页面、OMS 页面以及 AI 生成页面收敛到同一种视觉与交互语言。

目标结果：
- 任何新增页面都应当像是同一个产品 shell 中自然长出来的
- 业务差异主要体现在数据与动作上，而不是 UI 语言上
- AI 默认应进入这套系统，而不是自由发明一套新风格

这套系统基于对 Stripe test-mode 页面的一手研究，包括：
- Home shell
- Balance overview
- Transactions list
- Customers list
- Customer detail
- Create payment
- Settings hub
- Reports hub

---

## 2. 核心产品原则

### 2.1 数据优先，装饰其次
界面的存在是为了帮助用户扫描、比较、判断和执行操作。视觉设计应服务于理解，不能与数据争抢注意力。

### 2.2 高密度，但不压迫
信息密度应为中高。Stripe 不是通过巨大留白和大卡片解决复杂度，而是通过以下方式：
- 严格对齐
- 紧凑但可读的间距
- 清晰的区块边界
- 强信息层级

### 2.3 冷静可信
UI 应让人感觉可靠、金融化、运营化、低噪音。
避免视觉戏剧化，更偏向安静、克制、可信。

### 2.4 一个系统，多种模块
Balances、customers、reports、settings、transactions、approvals、procurement、inventory 等模块都应共享同一套 shell grammar、间距节奏与动作层级。

### 2.5 渐进式披露
默认只展示推进任务所需的最少信息。二级选项应该进入：
- tabs
- filter popovers
- more actions menus
- drawers
- section-level actions

### 2.6 先读再做的层级顺序
每个页面都应让用户按顺序回答以下问题：
1. 我现在在哪？
2. 我在看哪个对象或数据集？
3. 当前状态是什么？
4. 主要操作是什么？
5. 下一层真正重要的细节是什么？

---

## 3. 视觉语言

### 3.1 色彩行为
Stripe 风格后台 UI 以中性色为主。

分布规则：
- 80% 中性背景 / 文本 / 边框
- 15% 品牌或交互强调色
- 5% 语义状态色

#### 中性色角色
- 页面背景：非常浅的中性色，接近白色
- Surface 背景：白色或略微抬起的浅色面板
- 边框：偏冷、偏浅、始终可见
- 主文本：深中性色，不要用纯黑
- 次文本：中灰
- 辅助文本：更 muted 的中灰

#### 强调色行为
只使用一种克制的产品强调色，用于：
- 左侧导航 active 状态
- tabs 选中态
- focus ring
- 关键链接
- 必要时的主状态强调

不要把强调色撒满整个页面。

#### 语义颜色
语义色只能服务于状态含义：
- success
- warning
- danger
- info
- preview / new / beta

不要把语义色当装饰色使用。

### 3.2 边框、圆角、层次
Stripe 更依赖边框和分组，而不是重阴影。

规则：
- 边框永远比阴影更重要
- 圆角中等、精确，不可爱、不软萌
- 阴影很轻，点到为止
- 分组通常依赖背景、线条和间距，而不是卡片堆叠感

### 3.3 排版
Stripe 的排版是运营型的，而不是表达型的。

规则：
- 页面标题要有力量，但不能过大
- 区块标题要紧凑清晰
- 表格文本必须优先服务扫描效率
- 元数据必须明显弱于主数据
- 数字和时间戳应稳定对齐

使用稳定的系统字体栈，避免个性化字体表演。

---

## 4. 间距与密度语法

### 4.1 全局节奏
使用一致的 4/8 基础间距系统。

推荐层级：
- 4：图标与文字等微型间距
- 8：控件内部紧凑间距
- 12：区块内部紧凑节奏
- 16：常规控件和面板 padding
- 20：toolbar 与局部页面节奏
- 24：section 之间分隔
- 32：大区块之间分隔

### 4.2 密度目标
- Toolbars：紧凑
- Tables：中等密度
- Detail 页卡片：中等密度
- Settings hub：中低密度，保证阅读性
- Create / edit forms：中等密度，并保持字段分组清楚

### 4.3 宽度策略
对于桌面宽屏和笔记本：
- 主内容区不要无脑横向铺满
- 核心内容使用可读工作列宽
- 只有在确实能提升扫描效率时，才增加右侧辅助列

对于平板收缩布局：
- 收起侧边栏
- 保留顶部上下文和关键操作
- 将原来的左右分栏按垂直顺序堆叠

---

## 5. Shell 布局语法

### 5.1 持久化 shell
每个产品页面都属于一个持久化 shell：
- 顶部环境 / 状态条
- 左侧导航轨道
- 顶部 utility bar
- 主内容视口
- 可选的 developer / workbench 工具区

### 5.2 顶部环境条
只用于环境级上下文，例如：
- sandbox / test mode
- 影响整个账户的警告
- 全局环境 banner

它必须保持纤细、信息化，而不是变成视觉主角。

### 5.3 左侧导航
左侧导航是产品结构，不是装饰。

规则：
- 文本优先，图标辅助
- 图标帮助识别，但不能比文字更抢眼
- active 项使用轻度高亮和清晰强调
- 按产品域分组
- shortcuts 放在核心导航下方
- 产品家族允许展开成嵌套项

### 5.4 顶部 utility row
顶部 utility row 包含：
- search
- help
- notifications
- settings shortcut
- global create action

这一区域应保持紧凑，并对齐到内容 shell 右侧。

---

## 6. 页面原型（Page Archetypes）

### 6.1 列表页
结构：
1. page title
2. 页面级动作
3. view tabs 或 status tabs
4. toolbar：search、filter、table settings、saved views
5. 数据表格
6. pagination / result count

### 6.2 详情页
结构：
1. breadcrumb
2. 对象标题 + 副标题 / 上下文
3. 对象级动作
4. 主内容 sections
5. 右侧 metadata / config 栏（如有必要）

### 6.3 创建 / 编辑页
结构：
1. 专用创建头部
2. close / back affordance
3. 固定在头部的主提交动作
4. 分组后的表单 sections
5. 必要时的 section-level 说明

### 6.4 设置中心
结构：
1. 分组后的能力类别
2. 每个入口作为 settings module card / link
3. 明确区分 personal、account、product settings

### 6.5 报表中心
结构：
1. 页面标题
2. 能力导向的报表类别
3. 每个类别一段简短解释
4. 指向目标报表的链接分组

---

## 7. 响应式策略

### 7.1 Desktop wide
- 左侧导航保持可见
- 允许详情页多列布局
- 允许更宽的表格
- 顶部 utility controls 保持内联

### 7.2 Laptop
- 空间允许时依然保留左侧导航
- 收紧 toolbar 和 action 间距
- 防止正文阅读宽度过宽

### 7.3 Tablet collapsed
- 左侧导航收成 overlay 或 compact rail
- 保持顶部 search 和 utility controls 可用
- 将 detail 页双栏堆叠成单列
- 仍要让主次动作关系一眼清楚

---

## 8. 绝对禁止的反模式

不要做这些：
- 在 admin 页面做超大的 hero 区
- 到处堆大而软的卡片
- 在操作页面里使用强营销感渐变
- 在核心工作页面放装饰性插画
- 使用很重的阴影和 glassmorphism
- 所有状态和控件都做成大 pill
- 一个页面有多个互相竞争的主按钮
- 数据工作流页面做居中排版
- 紫蓝渐变白底的通用 AI SaaS 风
- 过度圆润、偏玩具感的控件

---

## 9. React 实现说明

这套系统面向 React admin 实现。

实现时的要求：
- 组件化 shell
- token 驱动的颜色与间距
- 语义化 state variants
- 保持语法一致的 table 和 form 抽象
- 为 list / detail / create / settings / report 这些 archetype 提供共享包裹层

本文档定义的是视觉操作系统。模板、组件、AI 规则请配合其它文档一起使用。
