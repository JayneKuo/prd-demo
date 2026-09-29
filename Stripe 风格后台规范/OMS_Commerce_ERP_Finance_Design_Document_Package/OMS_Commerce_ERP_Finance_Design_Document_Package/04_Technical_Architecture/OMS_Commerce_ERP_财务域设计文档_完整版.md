# OMS Commerce ERP 财务域设计文档（完整版）

## Document Overview（文档概述）

本文档完整描述 OMS Commerce ERP Finance Domain（财务领域）设计。

覆盖：

-   Product Design（产品设计）
-   Domain Design（领域设计）
-   Accounting Design（会计设计）
-   Database Design（数据库设计）
-   Integration Design（系统集成设计）

核心目标：

> 构建一个连接订单、库存、履约、支付和企业财务系统的运营财务平台。

------------------------------------------------------------------------

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

------------------------------------------------------------------------

# OMS Commerce ERP 财务域设计文档

# Part 19：OMS Finance PRD（详细产品需求文档）

## 19.1 产品目标 Product Objective（产品目标）

OMS Finance模块目标：

将订单、库存、履约、支付、费用和财务系统连接起来，为企业提供：

-   Revenue Visibility（收入透明）
-   Cost Visibility（成本透明）
-   Profitability Analysis（利润分析）
-   Financial Integration（财务集成）

核心定位：

> OMS Finance不是传统会计软件，而是连接Commerce
> Operation（商业运营）和Accounting System（财务系统）的运营财务平台。

------------------------------------------------------------------------

# 19.2 产品模块结构 Product Module Structure（产品模块结构）

    Finance

    ├── Dashboard（财务仪表盘）
    │
    ├── Revenue Management（收入管理）
    │
    ├── Cost Management（成本管理）
    │
    ├── Payment & Settlement（支付结算）
    │
    ├── Invoice Management（发票管理）
    │
    ├── AR Management（应收管理）
    │
    ├── AP Management（应付管理）
    │
    ├── Profitability Analysis（利润分析）
    │
    ├── Financial Event（财务事件）
    │
    ├── Accounting Integration（会计集成）
    │
    └── Reports（报表中心）

------------------------------------------------------------------------

# 19.3 Dashboard PRD（财务仪表盘需求）

## 页面目标

为管理人员提供企业整体经营状态。

------------------------------------------------------------------------

## KPI Cards（指标卡片）

  English Field         中文字段       Calculation Formula
  --------------------- -------------- ------------------------------------
  Total Revenue         总收入         Product Revenue + Shipping Revenue
  Gross Profit          毛利润         Revenue - COGS
  Gross Margin          毛利率         Gross Profit / Revenue
  Contribution Margin   贡献毛利       Revenue - Variable Cost
  Order Count           订单数量       Count(Order)
  Average Order Value   平均订单金额   Revenue / Order Count

------------------------------------------------------------------------

# 19.4 Revenue Management PRD（收入管理）

## 功能目标

管理所有收入确认事件。

------------------------------------------------------------------------

## Revenue List 页面

字段：

  English Field      中文字段       来源
  ------------------ -------------- -----------------
  Revenue Event ID   收入事件编号   Finance Event
  Order ID           订单编号       OMS
  Customer           客户           Customer Master
  Revenue Type       收入类型       Rule Engine
  Amount             金额           Calculation
  Recognition Date   确认日期       Event
  Status             状态           System

------------------------------------------------------------------------

## 操作

支持：

-   View Detail（查看详情）
-   Export（导出）
-   Adjustment（调整）

------------------------------------------------------------------------

# 19.5 Cost Management PRD（成本管理）

## 页面目标

查看订单产生的全部成本。

------------------------------------------------------------------------

## Cost Detail

字段：

  English Field   中文字段
  --------------- ----------
  Cost ID         成本编号
  Cost Type       成本类型
  Source System   来源系统
  Order ID        订单编号
  Amount          金额
  Currency        币种

------------------------------------------------------------------------

## Cost Type（成本类型）

  English          中文
  ---------------- ------------
  Product Cost     商品成本
  Warehouse Cost   仓储成本
  Freight Cost     运输成本
  Payment Fee      支付手续费
  Other Expense    其他费用

------------------------------------------------------------------------

# 19.6 Profitability Analysis PRD（利润分析）

## Order Profit Detail

页面：

    Order Revenue

    -

    Product Cost

    -

    Fulfillment Cost

    -

    Transportation Cost

    -

    Payment Fee

    =

    Profit

------------------------------------------------------------------------

字段：

  English Field    中文字段
  ---------------- ------------
  Order ID         订单编号
  Revenue          收入
  Product Cost     商品成本
  Warehouse Cost   仓储成本
  Freight Cost     运输成本
  Payment Fee      支付手续费
  Profit           利润
  Margin %         利润率

------------------------------------------------------------------------

# 19.7 Payment Settlement PRD（支付结算）

## Settlement List

字段：

  English Field      中文字段
  ------------------ ------------
  Settlement ID      结算编号
  Payment Provider   支付渠道
  Gross Amount       原始金额
  Fee Amount         手续费
  Net Amount         净结算金额
  Settlement Date    结算日期
  Status             状态

------------------------------------------------------------------------

# 19.8 Invoice Management PRD（发票管理）

## Invoice List

字段：

  English Field    中文字段
  ---------------- ------------
  Invoice Number   发票号码
  Customer         客户
  Invoice Date     发票日期
  Due Date         到期日期
  Total Amount     发票金额
  Balance Due      未付款金额
  Status           状态

------------------------------------------------------------------------

状态：

  English Status   中文状态
  ---------------- ----------
  Draft            草稿
  Open             待付款
  Paid             已付款
  Void             作废

------------------------------------------------------------------------

# 19.9 AR Management PRD（应收管理）

## AR Aging 页面

展示：

  English Field        中文字段
  -------------------- ----------
  Customer             客户
  Invoice              发票
  Due Date             到期日期
  Outstanding Amount   未收金额
  Aging Bucket         账龄

------------------------------------------------------------------------

# 19.10 AP Management PRD（应付管理）

## Vendor Bill 页面

字段：

  English Field   中文字段
  --------------- ----------
  Vendor          供应商
  Bill Number     账单编号
  Bill Date       账单日期
  Amount          金额
  Due Date        到期日期
  Status          状态

------------------------------------------------------------------------

# 19.11 Financial Event PRD（财务事件）

## Event Detail 页面

字段：

  English Field       中文字段
  ------------------- ----------
  Event ID            事件编号
  Event Type          事件类型
  Source Object       来源对象
  Source System       来源系统
  Amount              金额
  Accounting Status   会计状态

------------------------------------------------------------------------

# 19.12 权限设计 RBAC

## Finance Admin

权限：

-   配置规则
-   查看全部数据
-   管理集成

## Finance Analyst

权限：

-   查看报表
-   分析利润
-   查看成本

## Operations Manager

权限：

-   查看订单利润
-   查看履约成本

## Accountant

权限：

-   Invoice
-   AR/AP
-   Journal
-   Reconciliation

------------------------------------------------------------------------

# 19.13 MVP开发范围

## Phase 1

必须实现：

1.  Order Revenue Calculation（订单收入计算）
2.  Product Cost Snapshot（商品成本快照）
3.  Fulfillment Cost Import（履约成本导入）
4.  Order Profitability（订单利润）
5.  Payment Transaction（支付交易）
6.  NetSuite/QB Integration

------------------------------------------------------------------------

## Phase 2

增加：

-   Invoice
-   AR
-   AP
-   Settlement
-   Tax

------------------------------------------------------------------------

## Phase 3

增加：

-   GL
-   Journal Posting
-   Financial Close
-   Budget
-   Forecast

------------------------------------------------------------------------

# 下一章节

# Part 20：OMS Finance Database Design（数据库设计）

下一部分设计：

-   Table Schema（数据库表结构）
-   Primary Key（主键）
-   Foreign Key（外键）
-   Entity Relationship（实体关系）
-   Financial Event表
-   Accounting表
-   Profitability表

------------------------------------------------------------------------

# OMS Commerce ERP 财务域设计文档

# Part 20：OMS Finance Database Design（数据库设计）

## 20.1 设计目标 Database Design Objective（数据库设计目标）

本章节将 OMS Finance 从产品模型转换为技术数据模型。

目标：

建立支持：

-   Order Financial Analysis（订单财务分析）
-   Revenue Recognition（收入确认）
-   Cost Tracking（成本追踪）
-   Profitability Calculation（利润计算）
-   Accounting Integration（会计集成）

的数据结构。

核心原则：

> 业务数据、财务事件、会计数据必须分离，通过关联关系形成完整财务链路。

------------------------------------------------------------------------

# 20.2 Database Architecture（数据库架构）

整体分层：

    Business Data Layer（业务数据层）

    Customer
    Order
    Shipment
    Return


            ↓


    Financial Data Layer（财务数据层）

    Revenue Event
    Cost Ledger
    Payment Transaction
    Profitability


            ↓


    Accounting Data Layer（会计数据层）

    Account
    Journal Entry
    General Ledger


            ↓


    Reporting Layer（报表层）

    Financial Report
    Dashboard

------------------------------------------------------------------------

# 20.3 Customer Financial Tables（客户财务表）

## customer_master（客户主表）

  Field            中文字段   类型
  ---------------- ---------- ----------
  customer_id      客户编号   PK
  customer_name    客户名称   varchar
  customer_type    客户类型   varchar
  tax_profile_id   税务属性   FK
  currency_code    币种       varchar
  created_date     创建时间   datetime

------------------------------------------------------------------------

# 20.4 Order Financial Tables（订单财务表）

## sales_order_financial（销售订单财务表）

  Field             中文字段     类型
  ----------------- ------------ ----------
  order_id          订单编号     PK
  customer_id       客户编号     FK
  order_date        订单日期     datetime
  currency_code     币种         varchar
  gross_amount      原始金额     decimal
  discount_amount   优惠金额     decimal
  tax_amount        税费金额     decimal
  total_amount      订单总金额   decimal

------------------------------------------------------------------------

# 20.5 Revenue Tables（收入表）

## revenue_event（收入事件表）

核心表。

  Field              中文字段       类型
  ------------------ -------------- ----------
  revenue_event_id   收入事件编号   PK
  order_id           订单编号       FK
  shipment_id        发货编号       FK
  revenue_type       收入类型       enum
  amount             收入金额       decimal
  recognition_date   确认日期       datetime
  status             状态           enum

------------------------------------------------------------------------

Revenue Type：

  English            中文
  ------------------ ----------
  Product Revenue    商品收入
  Shipping Revenue   运费收入
  Service Revenue    服务收入

------------------------------------------------------------------------

# 20.6 Cost Ledger（成本台账）

## cost_ledger（成本台账表）

记录所有成本。

字段：

  Field              中文字段
  ------------------ ----------
  cost_id            成本编号
  order_id           订单编号
  sku_id             商品编码
  cost_type          成本类型
  source_system      来源系统
  amount             金额
  transaction_date   交易日期

------------------------------------------------------------------------

Cost Type：

  English          中文
  ---------------- ------------
  Product Cost     商品成本
  Warehouse Cost   仓储成本
  Freight Cost     运输成本
  Payment Fee      支付手续费

------------------------------------------------------------------------

# 20.7 Payment Tables（支付表）

## payment_transaction（支付交易表）

  Field               中文字段
  ------------------- ----------
  payment_id          支付编号
  order_id            订单编号
  payment_provider    支付渠道
  payment_method      支付方式
  amount              支付金额
  fee_amount          手续费
  settlement_amount   结算金额
  payment_status      支付状态

------------------------------------------------------------------------

# 20.8 Profitability Tables（利润分析表）

## order_profitability（订单利润表）

用于快速查询订单利润。

  Field               中文字段
  ------------------- ----------
  profitability_id    利润编号
  order_id            订单编号
  revenue_amount      收入金额
  product_cost        商品成本
  fulfillment_cost    履约成本
  freight_cost        运输成本
  payment_fee         支付费用
  profit_amount       利润金额
  margin_percentage   利润率

------------------------------------------------------------------------

计算：

    Profit

    =

    Revenue

    -

    Product Cost

    -

    Fulfillment Cost

    -

    Freight Cost

    -

    Payment Fee

------------------------------------------------------------------------

# 20.9 Accounting Tables（会计表）

## account（会计科目表）

  Field               中文字段
  ------------------- ----------
  account_id          科目编号
  account_name        科目名称
  account_type        科目类型
  parent_account_id   父级科目

------------------------------------------------------------------------

## journal_entry（会计分录头表）

  Field             中文字段
  ----------------- ----------
  journal_id        分录编号
  posting_date      入账日期
  source_event_id   来源事件
  status            状态

------------------------------------------------------------------------

## journal_entry_line（会计分录明细）

  Field           中文字段
  --------------- ----------
  line_id         行编号
  journal_id      分录编号
  account_id      科目编号
  debit_amount    借方金额
  credit_amount   贷方金额

------------------------------------------------------------------------

# 20.10 Entity Relationship（实体关系）

整体关系：

    Customer

        |

    Sales Order

        |

    Order Line

        |

    Revenue Event

        |

    Cost Ledger

        |

    Order Profitability

        |

    Financial Event

        |

    Journal Entry

        |

    General Ledger

------------------------------------------------------------------------

# 20.11 Data Traceability（数据追踪）

每个财务数字必须能够追溯：

例如利润：

    Order Profit

    ↓

    Revenue Event

    ↓

    Sales Order

    ↓

    Customer Order

成本：

    Product Cost

    ↓

    Inventory Transaction

    ↓

    SKU Cost

运输：

    Freight Cost

    ↓

    Shipment

    ↓

    Carrier Invoice

------------------------------------------------------------------------

# 20.12 Database Design Summary（数据库设计总结）

核心表：

  Domain       Table
  ------------ -----------------------
  Customer     customer_master
  Order        sales_order_financial
  Revenue      revenue_event
  Cost         cost_ledger
  Payment      payment_transaction
  Profit       order_profitability
  Accounting   journal_entry
  Accounting   journal_entry_line
  GL           general_ledger

------------------------------------------------------------------------

# 下一章节

# Part 21：OMS Finance API Design（接口设计）

下一部分设计：

-   REST API
-   Financial Event API
-   Revenue API
-   Cost API
-   Profitability API
-   Accounting Integration API
-   NetSuite / QuickBooks Sync API
