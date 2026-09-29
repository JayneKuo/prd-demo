# OMS Commerce ERP 财务域设计文档

# Part 17：Complete OMS Commerce ERP Finance Data Model（完整财务数据模型）

## 17.1 设计目标 Business Purpose（业务目的）

本章节将前面所有财务域设计进行统一收敛。

目标：

建立 OMS Commerce ERP Finance Domain（财务领域）完整模型：

-   Business Entity（业务实体）
-   Financial Entity（财务实体）
-   Accounting Entity（会计实体）
-   Reporting Entity（报表实体）

形成：

    Business Operation（业务运营）

            ↓

    Financial Event（财务事件）

            ↓

    Accounting Engine（会计引擎）

            ↓

    General Ledger（总账）

            ↓

    Financial Reporting（财务报表）

------------------------------------------------------------------------

# 17.2 Core Entity Model（核心实体模型）

## 17.2.1 Customer Domain（客户领域）

### Customer（客户）

  English Field      中文字段
  ------------------ ----------
  Customer ID        客户编号
  Customer Name      客户名称
  Customer Type      客户类型
  Billing Address    账单地址
  Shipping Address   收货地址
  Tax Profile        税务属性

关联：

    Customer

    ↓

    Sales Order

    ↓

    Invoice

    ↓

    Payment

    ↓

    AR

------------------------------------------------------------------------

# 17.2.2 Product Domain（商品领域）

### Product / SKU

  English Field   中文字段
  --------------- ----------
  Product ID      商品编号
  SKU ID          商品编码
  Product Name    商品名称
  Unit Cost       单位成本
  Selling Price   销售价格

关联：

    Product

    ↓

    Order Line

    ↓

    Inventory Cost

    ↓

    COGS

------------------------------------------------------------------------

# 17.2.3 Order Domain（订单领域）

核心实体：

## Sales Order（销售订单）

关联：

    Customer

    ↓

    Sales Order

    ↓

    Order Line

    ↓

    Fulfillment Order

    ↓

    Shipment

------------------------------------------------------------------------

# 17.2.4 Inventory Domain（库存领域）

核心实体：

## Inventory Transaction（库存交易）

包括：

-   Receipt（入库）
-   Shipment（出库）
-   Adjustment（调整）
-   Return（退货入库）

关系：

    Inventory Transaction

    ↓

    Inventory Cost Ledger

    ↓

    COGS

------------------------------------------------------------------------

# 17.2.5 Fulfillment Domain（履约领域）

实体：

-   Fulfillment Order（履约单）
-   Warehouse Cost（仓储费用）
-   Shipment Cost（运输费用）

关系：

    Fulfillment

    ↓

    Warehouse Cost

    ↓

    Order Profitability

------------------------------------------------------------------------

# 17.3 Financial Entity Model（财务实体模型）

## Financial Event（财务事件）

核心实体：

  English Field        中文字段
  -------------------- --------------
  Financial Event ID   财务事件编号
  Event Type           事件类型
  Source Object        来源对象
  Amount               金额
  Event Date           日期

------------------------------------------------------------------------

事件来源：

  Business Event       Financial Event
  -------------------- -----------------------
  Payment Captured     Payment Event
  Shipment Confirmed   Revenue Event
  Inventory Shipment   COGS Event
  Return Received      Refund/Reversal Event

------------------------------------------------------------------------

# 17.4 Accounting Entity Model（会计实体模型）

## Chart of Accounts（会计科目）

    Account

    ↓

    Journal Entry

    ↓

    General Ledger

------------------------------------------------------------------------

## Journal Entry（会计分录）

组成：

### Header

  English Field   中文字段
  --------------- ----------
  Journal ID      分录编号
  Posting Date    入账日期
  Source Event    来源事件

------------------------------------------------------------------------

### Line

  English Field   中文字段
  --------------- ----------
  Account         科目
  Debit           借方
  Credit          贷方

------------------------------------------------------------------------

# 17.5 Complete Order To Cash Flow（订单到现金完整流程）

## Step 1 Order Created（订单创建）

产生：

Sales Order

------------------------------------------------------------------------

## Step 2 Payment Captured（支付完成）

财务事件：

Payment Event

分录：

    Debit Cash

    Credit Customer Deposit

------------------------------------------------------------------------

## Step 3 Shipment Confirmed（发货确认）

产生：

Revenue Event

收入：

    Product Revenue

    +

    Shipping Revenue

------------------------------------------------------------------------

## Step 4 Inventory Shipment（库存出库）

产生：

COGS Event

分录：

    Debit COGS

    Credit Inventory Asset

------------------------------------------------------------------------

## Step 5 Invoice Generated（生成发票）

产生：

AR

分录：

    Debit Accounts Receivable

    Credit Revenue

------------------------------------------------------------------------

## Step 6 Payment Settlement（结算）

关闭：

AR

------------------------------------------------------------------------

# 17.6 Complete Return Flow（完整退货流程）

    Customer Return Request

    ↓

    Return Authorization

    ↓

    Reverse Shipment

    ↓

    Warehouse Receive

    ↓

    Inspection

    ↓

    Inventory Restoration

    ↓

    Refund

    ↓

    Financial Reversal

财务影响：

-   Revenue Reversal
-   Tax Reversal
-   COGS Reversal
-   Inventory Adjustment

------------------------------------------------------------------------

# 17.7 Financial Closing Process（月结流程）

## Month End Closing（月末结账）

流程：

    Stop Period Transaction

    ↓

    Complete Sync

    ↓

    Post Financial Events

    ↓

    Generate Journal Entries

    ↓

    Reconcile AR/AP

    ↓

    Inventory Valuation

    ↓

    Generate Financial Reports

    ↓

    Close Period

------------------------------------------------------------------------

# 17.8 Reconciliation Model（对账模型）

支持：

## Payment Reconciliation（支付对账）

比较：

    Payment Gateway

    vs

    OMS Payment

    vs

    Bank Settlement

------------------------------------------------------------------------

## Inventory Reconciliation（库存对账）

比较：

    WMS Quantity

    vs

    OMS Inventory

    vs

    ERP Inventory

------------------------------------------------------------------------

## Financial Reconciliation（财务对账）

比较：

    OMS Journal

    vs

    NetSuite/QB GL

------------------------------------------------------------------------

# 17.9 Final OMS Finance Architecture（最终架构）

    Sales Channels

    Amazon
    Shopify
    EDI

            |

            v

    OMS Commerce ERP

    --------------------------------

    Order Management

    Inventory

    Fulfillment

    Pricing

    Payment

    Returns

    Profitability


            |

            v

    Financial Event Layer


            |

            v

    Accounting Engine


            |

            v

    ERP Integration


            |

            v

    NetSuite / QuickBooks


            |

            v

    Financial Statement

------------------------------------------------------------------------

# Part 17 总结

OMS Commerce ERP Finance完整能力：

## Business Layer（业务层）

管理：

-   Order
-   Product
-   Customer
-   Fulfillment

## Financial Layer（财务层）

管理：

-   Revenue
-   Cost
-   Payment
-   Refund
-   AR/AP

## Accounting Layer（会计层）

管理：

-   Account
-   Journal Entry
-   GL

## Reporting Layer（分析层）

提供：

-   Revenue Analysis
-   Profit Analysis
-   Inventory Valuation
-   AR/AP Analysis

------------------------------------------------------------------------

# 下一章节

# Part 18：OMS Finance Product Design Summary（产品设计总结）

将整理：

-   产品模块划分
-   菜单设计
-   页面设计
-   用户角色
-   权限模型
-   MVP范围
-   后续演进路线
