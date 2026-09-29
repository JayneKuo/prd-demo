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
