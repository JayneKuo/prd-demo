# OMS Commerce ERP 财务域设计文档

## 文档信息

  项目       内容
  ---------- ------------------------------------------------------------------
  文档名称   OMS Commerce ERP Finance Design Document
  中文名称   OMS 商业ERP财务域设计文档
  版本       V1.0
  目标       设计具备轻量ERP能力，并支持NetSuite、QuickBooks集成的OMS财务体系

------------------------------------------------------------------------

# 目录

1.  整体架构与领域边界设计
2.  基础数据模型设计
3.  订单财务模型设计
4.  定价、优惠、折扣、税费模型
5.  支付与结算模型
6.  商品成本与库存成本模型
7.  仓储与履约费用模型
8.  收入确认模型
9.  发票、应收、应付模型
10. 退货与逆向物流模型
11. 财务事件模型
12. 会计模型
13. 订单利润分析模型
14. NetSuite 集成设计
15. QuickBooks 集成设计

------------------------------------------------------------------------

# Part 1：整体架构与领域边界设计

## 1.1 产品定位

本系统定位：

**OMS + Commerce ERP（面向电商履约企业的轻量ERP）**

OMS不仅管理订单和履约，同时管理：

-   Order Management 订单管理
-   Inventory Management 库存管理
-   Fulfillment Management 履约管理
-   Billing 计费
-   AR 应收
-   AP 应付
-   Cost Accounting 成本分析
-   Financial Event 财务事件

支持集成：

-   NetSuite
-   QuickBooks
-   SAP
-   Oracle Financials

------------------------------------------------------------------------

# 1.2 财务设计核心原则

## 原则1：业务交易不等于财务结果

例如：

客户创建订单：

Order Created

代表客户产生购买行为。

但不代表：

Revenue Revenue Recognition（收入确认）

原因：

-   订单可能取消
-   商品可能缺货
-   客户可能退款

正确流程：

Business Transaction

↓

Financial Event

↓

Accounting Rule

↓

Journal Entry

↓

General Ledger

------------------------------------------------------------------------

## 原则2：Payment 不等于 Revenue

Payment 表示资金流。

Revenue 表示收入确认。

例如：

客户付款：

\$105.84

不一定立即确认收入。

------------------------------------------------------------------------

## 原则3：成本必须有来源

  成本类型                  来源
  ------------------------- -----------------------
  商品成本 Product Cost     Inventory Cost Ledger
  采购成本 Purchase Cost    Procurement / ERP
  仓储成本 Warehouse Cost   WMS / 3PL Billing
  运输成本 Freight Cost     TMS / Carrier
  支付手续费 Payment Fee    Payment Gateway

------------------------------------------------------------------------

# 1.3 系统职责边界

## OMS

负责：

-   Sales Order
-   Pricing
-   Promotion Discount
-   Fulfillment
-   Order Profitability

## WMS

负责：

-   Receive
-   Putaway
-   Pick
-   Pack
-   Ship
-   Return Receive

并产生：

-   Inventory Event
-   Warehouse Service Cost

## TMS

负责：

-   Carrier
-   Rate
-   Shipment Tracking
-   Freight Cost

## Payment

负责：

-   Authorization
-   Capture
-   Settlement
-   Payout

## NetSuite / QuickBooks

负责：

-   Chart of Account
-   Journal Entry
-   General Ledger
-   Financial Statement

------------------------------------------------------------------------

# 1.4 核心领域模型

Customer

↓

Sales Order

↓

Order Line

↓

Fulfillment Order

↓

Shipment

↓

Delivery

同时：

Sales Order

↓

Financial Event

↓

Accounting Entry

↓

GL Account

------------------------------------------------------------------------

# 1.5 Order-to-Cash流程

Customer

↓

Place Order

↓

OMS Create Sales Order

↓

Pricing / Discount / Tax Calculation

↓

Payment Capture

↓

Inventory Allocation

↓

WMS Pick Pack Ship

↓

Carrier Delivery

↓

Revenue Recognition

↓

Accounting Posting

↓

NetSuite / QuickBooks

------------------------------------------------------------------------

# 后续章节将在此文档持续扩展。
