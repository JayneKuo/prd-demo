# OMS Commerce ERP 财务域设计文档

# Part 11：Financial Event Model（财务事件模型）

## 11.1 设计目标 Business Purpose（业务目的）

Financial Event Model（财务事件模型）是 OMS Commerce ERP
财务域的核心架构。

它负责连接：

-   Business Transaction（业务交易）
-   Operational Event（运营事件）
-   Accounting Rule（会计规则）
-   Journal Entry（会计分录）
-   General Ledger（总账）

核心原则：

> 业务系统记录"发生了什么"，财务系统记录"产生什么财务影响"。

因此：

Order（订单）

不直接生成：

Journal Entry（会计分录）

而是：

    Business Event（业务事件）

    ↓

    Financial Event（财务事件）

    ↓

    Accounting Rule（会计规则）

    ↓

    Journal Entry（会计分录）

    ↓

    General Ledger（总账）

------------------------------------------------------------------------

# 11.2 Business Event（业务事件）

## 定义

Business Event表示：

系统中发生的业务动作。

例如：

  English Event        中文事件   来源
  -------------------- ---------- ---------
  Order Created        订单创建   OMS
  Payment Captured     支付完成   Payment
  Shipment Confirmed   发货确认   WMS
  Delivery Completed   签收完成   Carrier
  Return Received      退货收货   WMS
  Refund Completed     退款完成   Payment

------------------------------------------------------------------------

# 11.3 Financial Event（财务事件）

## 定义

Financial Event表示：

业务事件对财务产生的影响。

例如：

Shipment Confirmed：

业务：

商品发货。

财务：

-   确认收入
-   确认成本

产生：

    Revenue Recognition Event（收入确认事件）

    COGS Recognition Event（销售成本确认事件）

------------------------------------------------------------------------

# 11.4 Financial Event 数据模型

  English Field        中文字段       Data Type   说明
  -------------------- -------------- ----------- ----------------------
  Financial Event ID   财务事件编号   String      唯一编号
  Business Event ID    业务事件编号   String      来源事件
  Event Type           事件类型       Enum        Revenue/Cost/Payment
  Source System        来源系统       Enum        OMS/WMS/TMS
  Reference ID         关联业务编号   String      Order/Shipment等
  Event Date           事件日期       DateTime    发生时间
  Amount               金额           Decimal     财务金额
  Currency Code        币种代码       String      USD等
  Status               状态           Enum        Created/Posted

------------------------------------------------------------------------

# 11.5 Financial Event Type（财务事件类型）

## Revenue Event（收入事件）

来源：

-   Shipment
-   Delivery

产生：

Sales Revenue（销售收入）

------------------------------------------------------------------------

## Cost Event（成本事件）

来源：

-   Inventory Shipment
-   Warehouse Billing
-   Carrier Invoice

产生：

-   COGS
-   Warehouse Expense
-   Freight Expense

------------------------------------------------------------------------

## Payment Event（支付事件）

来源：

Payment System

产生：

-   Cash
-   Customer Deposit

------------------------------------------------------------------------

## Refund Event（退款事件）

来源：

Return / Refund

产生：

-   Revenue Reversal
-   Payment Reversal

------------------------------------------------------------------------

# 11.6 Accounting Rule（会计规则）

## 定义

Accounting Rule用于定义：

某个财务事件如何转换为会计分录。

例如：

事件：

Shipment Completed

规则：

生成：

Revenue Entry

和

COGS Entry

------------------------------------------------------------------------

# 11.7 Accounting Rule 数据模型

  English Field        中文字段       说明
  -------------------- -------------- ----------
  Accounting Rule ID   会计规则编号   唯一编号
  Event Type           事件类型       触发事件
  Debit Account        借方科目       借方
  Credit Account       贷方科目       贷方
  Rule Expression      规则表达式     计算逻辑
  Effective Date       生效日期       开始时间

------------------------------------------------------------------------

# 11.8 Journal Entry（会计分录）

## 定义

Journal Entry记录：

借贷关系。

------------------------------------------------------------------------

## Journal Entry Header

  English Field      中文字段
  ------------------ --------------
  Journal Entry ID   会计分录编号
  Posting Date       入账日期
  Source Event ID    来源事件编号
  Journal Status     状态

------------------------------------------------------------------------

## Journal Entry Line

  English Field   中文字段
  --------------- ----------
  Account ID      科目编号
  Account Name    科目名称
  Debit Amount    借方金额
  Credit Amount   贷方金额

------------------------------------------------------------------------

# 11.9 实际订单财务事件案例

订单：

商品销售：

100

优惠：

-10

运费收入：

8

税：

7.84

商品成本：

50

支付手续费：

3

------------------------------------------------------------------------

## Event 1：Payment Captured（支付完成）

Financial Event：

Payment Event

会计：

    Debit:

    Cash 105.84


    Credit:

    Customer Deposit 105.84

------------------------------------------------------------------------

## Event 2：Shipment Confirmed（发货确认）

Financial Event：

Revenue Event

金额：

98

会计：

    Debit:

    Customer Deposit 98


    Credit:

    Sales Revenue 90


    Credit:

    Shipping Revenue 8

------------------------------------------------------------------------

## Event 3：Inventory Shipment（库存出库）

Financial Event：

COGS Event

会计：

    Debit:

    COGS 50


    Credit:

    Inventory Asset 50

------------------------------------------------------------------------

## Event 4：Payment Fee（支付手续费）

Financial Event：

Expense Event

会计：

    Debit:

    Payment Expense 3


    Credit:

    Cash 3

------------------------------------------------------------------------

# 11.10 Event Driven Accounting（事件驱动会计）

传统模式：

    业务系统

    ↓

    人工整理

    ↓

    财务入账

问题：

-   延迟
-   容易错误
-   无法追踪来源

事件驱动：

    Business Event

    ↓

    Financial Event

    ↓

    Accounting Rule

    ↓

    Automatic Journal Entry

优势：

-   自动化
-   可审计
-   可追踪

------------------------------------------------------------------------

# 11.11 OMS Finance Architecture（OMS财务架构）

最终模型：

    Sales Channel

    Amazon / Shopify / EDI

            |

    OMS Business Domain

            |

    Financial Event Layer

            |

    Accounting Engine

            |

    GL / ERP Integration

            |

    NetSuite / QuickBooks

------------------------------------------------------------------------

# Part 11 总结

核心结论：

1.  Financial Event是业务和财务之间的桥梁。
2.  OMS不能直接把订单变成会计分录。
3.  所有财务影响必须来源于事件。
4.  Accounting Rule负责自动生成分录。
5.  该模型支持OMS作为轻量ERP运行，也支持同步专业ERP。

------------------------------------------------------------------------

# 下一章节

# Part 12：Accounting Model（会计模型）

将设计：

-   Chart of Accounts（会计科目表）
-   General Ledger（总账）
-   Journal Entry规则
-   Revenue Account（收入科目）
-   Expense Account（费用科目）
-   Inventory Asset（库存资产）
-   COGS（销售成本）
-   Financial Statement（财务报表）
