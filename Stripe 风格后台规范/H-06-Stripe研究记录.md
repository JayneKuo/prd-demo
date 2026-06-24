# Stripe 研究记录

本文档记录本次规范交付所依据的 Stripe 页面研究范围。

## 已研究的 Stripe Test 模式页面
- Home / 全局 shell
- Balance overview / 余额概览
- Transactions list / 交易列表
- Customers list / 客户列表
- Customer detail / 客户详情
- Create payment / 创建支付
- Settings hub / 设置中心
- Reports hub / 报表中心
- Developer Workbench overview / 开发者工作台概览
- Developer Workbench events view / 开发者工作台事件视图
- Workbench 内部的 health / key / tooling 面板

## 已研究的交互样本
- 顶部工具栏动作
- 全局 create 菜单
- reports 子菜单
- 列表页搜索与 clear-search
- save-as 视图保存控件
- 行尾 more actions
- section-level actions
- 空状态区块
- disabled actions
- workbench tab strip
- workbench copy / options / fullscreen / close controls
- event / log 诊断筛选行
- workbench shell 输入区

## 研究边界
本次 Stripe 学习严格限制在 test mode 且保持只读：
- 不提交任何表单
- 不创建任何新记录
- 不编辑或保存任何设置
- 只在安全观察点范围内体验交互

## 关键结论
- Stripe 更依赖 shell 一致性，而不是视觉花哨度
- 列表页语法对 ERP 工作流的复用性极高
- 详情页依赖“操作主区 + 元数据/配置侧栏”的组织方式
- 设置页与报表页更像导航型 hub，而不是单个巨型页面
- 按钮层级非常严格，且整体偏紧凑
- 真正重要的是帮助用户快速理解任务上下文，而不是堆叠视觉装饰
