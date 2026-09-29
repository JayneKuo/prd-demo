# OMS Commerce ERP 财务域设计文档

# Part 18：OMS Finance Product Design Summary（财务产品设计总结）

## 18.1 设计目标 Business Purpose（业务目的）

本章节从产品设计角度总结 OMS Commerce ERP Finance。

目标：

将前面的：

-   Business Model（业务模型）
-   Financial Model（财务模型）
-   Accounting Model（会计模型）
-   Reporting Model（报表模型）

转换为实际产品模块。

核心定位：

> OMS Finance
> 是面向电商、供应链企业的运营财务平台，连接订单、库存、履约和企业财务系统。

------------------------------------------------------------------------

# 18.2 Finance Module Navigation（财务模块菜单设计）

推荐菜单：

    Finance（财务）

    ├── Dashboard（财务仪表盘）
    │
    ├── Revenue（收入管理）
    │
    ├── Cost Management（成本管理）
    │
    ├── Payment & Settlement（支付与结算）
    │
    ├── Invoice（发票管理）
    │
    ├── AR（应收账款）
    │
    ├── AP（应付账款）
    │
    ├── Inventory Accounting（库存核算）
    │
    ├── Profitability Analysis（利润分析）
    │
    ├── Financial Event（财务事件）
    │
    ├── Accounting Integration（财务集成）
    │
    └── Reports（财务报表）

------------------------------------------------------------------------

# 18.3 Dashboard Design（财务仪表盘设计）

## Executive Dashboard（管理层看板）

展示：

  English KPI           中文指标
  --------------------- ----------
  Total Revenue         总收入
  Gross Profit          毛利润
  Gross Margin          毛利率
  Contribution Margin   贡献毛利
  Net Profit            净利润
  Order Count           订单数量
  Average Order Value   客单价

------------------------------------------------------------------------

# 18.4 Revenue Module（收入管理模块）

功能：

-   Revenue Event 查询
-   Revenue Recognition
-   Revenue Adjustment
-   Revenue Report

页面：

## Revenue List（收入列表）

字段：

  English Field      中文字段
  ------------------ --------------
  Revenue Event ID   收入事件编号
  Order ID           订单编号
  Revenue Type       收入类型
  Amount             金额
  Recognition Date   确认日期

------------------------------------------------------------------------

# 18.5 Cost Management（成本管理）

功能：

-   Product Cost
-   Warehouse Cost
-   Freight Cost
-   Payment Fee

页面：

## Cost Detail（成本明细）

字段：

  English Field   中文字段
  --------------- ----------
  Cost ID         成本编号
  Cost Type       成本类型
  Source System   来源系统
  Amount          金额
  Order ID        订单编号

------------------------------------------------------------------------

# 18.6 Payment & Settlement（支付与结算）

功能：

-   Payment Transaction
-   Settlement
-   Refund
-   Chargeback

页面：

## Settlement Report（结算报表）

字段：

  English Field       中文字段
  ------------------- ----------
  Payment Provider    支付渠道
  Gross Amount        原始金额
  Fee Amount          手续费
  Settlement Amount   结算金额

------------------------------------------------------------------------

# 18.7 AR Module（应收账款）

功能：

-   Invoice
-   Payment Application
-   Aging Analysis

页面：

## AR Aging（应收账龄）

展示：

-   Customer（客户）
-   Invoice（发票）
-   Due Date（到期日期）
-   Outstanding Amount（未收金额）
-   Aging Bucket（账龄）

------------------------------------------------------------------------

# 18.8 AP Module（应付账款）

功能：

-   Vendor Bill
-   Payment
-   Expense

页面：

## Vendor Bill List（供应商账单）

展示：

-   Vendor（供应商）
-   Bill Amount（账单金额）
-   Due Date（付款日期）
-   Status（状态）

------------------------------------------------------------------------

# 18.9 Profitability Analysis（利润分析）

核心页面：

## Order Profit Detail（订单利润详情）

展示：

    Revenue（收入）

    -

    Product Cost（商品成本）

    -

    Warehouse Cost（仓储成本）

    -

    Freight Cost（运输成本）

    -

    Payment Fee（支付手续费）


    =

    Profit（利润）

------------------------------------------------------------------------

# 18.10 Inventory Accounting（库存核算）

功能：

-   Inventory Valuation
-   Cost Adjustment
-   COGS

页面：

## Inventory Valuation Report（库存估值）

字段：

  English Field     中文字段
  ----------------- ----------
  SKU               商品编码
  Warehouse         仓库
  Quantity          数量
  Unit Cost         单位成本
  Inventory Value   库存价值

------------------------------------------------------------------------

# 18.11 Role Permission（角色权限）

## Finance Admin（财务管理员）

权限：

-   全部财务功能
-   会计规则配置
-   集成配置

------------------------------------------------------------------------

## Finance Analyst（财务分析员）

权限：

-   查看报表
-   查看利润分析
-   查看成本

------------------------------------------------------------------------

## Operations Manager（运营经理）

权限：

-   查看订单利润
-   查看履约成本

------------------------------------------------------------------------

## Accounting User（会计用户）

权限：

-   Invoice
-   AR/AP
-   Journal Entry
-   Reconciliation

------------------------------------------------------------------------

# 18.12 MVP Scope（第一阶段范围）

建议一期：

## Phase 1 Core Finance

包含：

✅ Order Revenue Calculation（订单收入计算）

✅ Product Cost Snapshot（商品成本快照）

✅ Fulfillment Cost Tracking（履约成本跟踪）

✅ Order Profitability（订单利润）

✅ Payment Transaction（支付交易）

✅ NetSuite/QB Integration

------------------------------------------------------------------------

# 18.13 Phase 2 Advanced Finance（二期）

增加：

-   AR Management（应收管理）
-   AP Management（应付管理）
-   Invoice Engine（发票引擎）
-   Settlement Automation（自动结算）
-   Tax Integration（税务集成）

------------------------------------------------------------------------

# 18.14 Phase 3 ERP Finance（三期）

完整ERP能力：

-   General Ledger（总账）
-   Journal Posting（自动过账）
-   Financial Period Close（月结）
-   Budget Management（预算管理）
-   Forecast Analysis（预测分析）

------------------------------------------------------------------------

# 18.15 Final Product Positioning（最终产品定位）

OMS Commerce ERP Finance:

不是替代：

NetSuite / SAP / Oracle Financial

而是：

    Commerce Operation Layer

            +

    Operational Finance Layer

            +

    ERP Integration Layer

核心价值：

1.  连接订单和财务
2.  提供订单级利润透明
3.  连接WMS/TMS成本
4.  支持多渠道电商经营分析
5.  支持企业财务系统集成

------------------------------------------------------------------------

# 文档总结

完整架构：

    Channel

    ↓

    OMS

    (Order + Inventory + Fulfillment)

    ↓

    Financial Event

    ↓

    Accounting Engine

    ↓

    NetSuite / QuickBooks

    ↓

    Financial Reporting
