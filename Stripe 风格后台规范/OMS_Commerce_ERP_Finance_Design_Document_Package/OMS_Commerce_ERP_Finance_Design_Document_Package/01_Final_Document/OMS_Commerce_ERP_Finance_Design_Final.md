# OMS Commerce ERP Finance Design Final（正式版）

## Document Overview（文档概述）

本文档定义 OMS Commerce ERP
Finance（OMS商业ERP财务域）的产品、领域、数据、架构和实施设计。

目标：

建立连接：

-   Commerce（商业交易）
-   OMS（订单管理）
-   WMS（仓储履约）
-   TMS（运输管理）
-   Payment（支付）
-   ERP（NetSuite / QuickBooks）

的运营财务平台。

------------------------------------------------------------------------

# 1. Product Positioning（产品定位）

OMS Finance不是传统会计系统。

定位：

    Commerce Operation Layer
    +
    Operational Finance Layer
    +
    ERP Integration Layer

OMS负责：

-   Order Management（订单管理）
-   Fulfillment（履约）
-   Cost Visibility（成本透明）
-   Profitability Analysis（利润分析）

ERP负责：

-   General Ledger（总账）
-   Financial Statement（财务报表）
-   Official Accounting（正式会计）

------------------------------------------------------------------------

# 2. Core Business Flow（核心业务流程）

完整链路：

    Customer Order（客户订单）

    ↓

    Payment（支付）

    ↓

    OMS Fulfillment（OMS履约）

    ↓

    WMS Picking & Shipping（仓库拣货发货）

    ↓

    TMS Transportation（运输）

    ↓

    Delivery（签收）

    ↓

    Revenue Recognition（收入确认）

    ↓

    Cost Calculation（成本计算）

    ↓

    Profitability Analysis（利润分析）

    ↓

    Accounting Integration（会计集成）

------------------------------------------------------------------------

# 3. Financial Model（财务模型）

## Revenue（收入）

收入组成：

-   Product Revenue（商品收入）
-   Shipping Revenue（运输收入）
-   Service Revenue（服务收入）

公式：

    Revenue

    =

    Product Revenue

    +

    Shipping Revenue

    +

    Service Revenue

------------------------------------------------------------------------

## Cost（成本）

成本：

-   Product Cost（商品成本）
-   Warehouse Cost（仓储成本）
-   Freight Cost（运输成本）
-   Payment Fee（支付手续费）

------------------------------------------------------------------------

## Profit（利润）

公式：

    Profit

    =

    Revenue

    -

    Product Cost

    -

    Warehouse Cost

    -

    Freight Cost

    -

    Payment Fee

------------------------------------------------------------------------

# 4. Financial Event Model（财务事件模型）

核心设计：

    Business Event

    ↓

    Financial Event

    ↓

    Accounting Rule

    ↓

    Journal Entry

    ↓

    General Ledger

业务事件：

-   ORDER_CREATED（订单创建）
-   PAYMENT_CAPTURED（支付完成）
-   SHIPMENT_CONFIRMED（发货确认）
-   DELIVERY_COMPLETED（签收完成）
-   RETURN_RECEIVED（退货完成）
-   REFUND_COMPLETED（退款完成）

------------------------------------------------------------------------

# 5. Core Data Model（核心数据模型）

核心实体：

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

    Financial Event

    ↓

    Journal Entry

    ↓

    General Ledger

核心表：

  Domain       Table
  ------------ ---------------------
  Customer     customer_master
  Order        sales_order
  Revenue      revenue_event
  Cost         cost_ledger
  Payment      payment_transaction
  Profit       order_profitability
  Accounting   journal_entry

------------------------------------------------------------------------

# 6. Profitability Analysis（利润分析）

订单利润：

示例：

    Revenue

    85 USD


    -

    Product Cost

    40 USD


    -

    Warehouse Cost

    3 USD


    -

    Freight Cost

    10 USD


    -

    Payment Fee

    3 USD


    =

    Profit

    29 USD

支持：

-   Order Profit（订单利润）
-   SKU Profit（商品利润）
-   Customer Profit（客户利润）
-   Channel Profit（渠道利润）

------------------------------------------------------------------------

# 7. Accounting Integration（会计集成）

## NetSuite

OMS：

-   Order
-   Fulfillment
-   Cost
-   Profitability

NetSuite：

-   GL
-   Invoice
-   Financial Statement

## QuickBooks

OMS：

-   Commerce Operation
-   Profit Analysis

QuickBooks：

-   Invoice
-   Payment
-   Accounting

------------------------------------------------------------------------

# 8. Architecture Design（架构设计）

    API Gateway

    ↓

    Finance Service

    Accounting Service

    Settlement Service

    Reporting Service

    Integration Service

    ↓

    Event Bus

    ↓

    Database

    ↓

    ERP Integration

------------------------------------------------------------------------

# 9. Security & Audit（安全审计）

支持：

-   RBAC（角色权限）
-   Tenant Isolation（租户隔离）
-   Data Permission（数据权限）
-   Audit Log（审计日志）
-   Approval Workflow（审批流程）

财务数据禁止直接修改：

    Change Request

    ↓

    Approval

    ↓

    Adjustment Event

    ↓

    Journal Entry

------------------------------------------------------------------------

# 10. SaaS Deployment（SaaS部署）

支持：

-   Multi Tenant（多租户）
-   Multi Company（多公司）
-   Multi Currency（多币种）
-   High Availability（高可用）

------------------------------------------------------------------------

# 11. Implementation Roadmap（实施路线）

## Phase 1：Operational Finance

实现：

-   Revenue
-   Cost
-   Profitability
-   Payment

## Phase 2：Financial Collaboration

实现：

-   Invoice
-   AR/AP
-   Settlement
-   ERP Sync

## Phase 3：Light ERP

实现：

-   GL
-   Journal
-   Closing
-   Budget

------------------------------------------------------------------------

# 12. Final Product Definition（最终产品定义）

OMS Commerce ERP Finance:

> 一个连接Commerce、Supply Chain和Accounting的运营财务平台。

最终价值：

1.  看清收入
2.  看清成本
3.  看清利润
4.  自动连接财务系统
5.  支撑企业规模化运营

------------------------------------------------------------------------

# Appendix：Related Design Documents（相关章节）

完整详细章节：

-   Domain Design
-   PRD
-   Database Design
-   API Design
-   Security Design
-   Deployment Design
-   Testing Strategy
-   Real Business Scenario
