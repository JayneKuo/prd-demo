# OMS Commerce ERP 财务域设计文档

# Part 8：Revenue Recognition Model（收入确认模型）

## 8.1 设计目标 Business Purpose（业务目的）

Revenue Recognition Model（收入确认模型）用于定义：

-   企业什么时候确认收入
-   确认多少收入
-   订单取消如何处理
-   退款如何冲销收入
-   收入如何进入财务系统

核心原则：

> Revenue（收入）不是订单金额，也不是支付金额，而是企业完成履约后根据会计规则确认的经济收益。

------------------------------------------------------------------------

# 8.2 核心概念 Core Concepts（核心概念）

## Order Amount（订单金额）

表示：

客户订单商业金额。

例如：

    商品金额:

    100


    优惠:

    -10


    运费:

    8


    税:

    7.84


    订单总额:

    105.84

------------------------------------------------------------------------

## Payment Amount（支付金额）

表示：

客户实际支付资金。

例如：

    Payment Captured:

    105.84

------------------------------------------------------------------------

## Revenue Amount（收入金额）

表示：

企业可以确认的收入。

通常：

    Revenue

    =

    Net Sales Amount

    +

    Shipping Revenue

不包含：

-   Sales Tax（销售税）

------------------------------------------------------------------------

# 8.3 Revenue Recognition Trigger（收入确认触发条件）

不同企业有不同规则。

系统支持：

  English Field                中文字段         说明
  ---------------------------- ---------------- --------------
  Payment Based Recognition    按付款确认收入   收款即确认
  Shipment Based Recognition   按发货确认收入   商品离仓确认
  Delivery Based Recognition   按签收确认收入   客户收到确认

------------------------------------------------------------------------

# 8.4 Payment Based Revenue（付款确认收入）

## 适用场景

例如：

-   数字商品
-   即时服务

流程：

    Payment Captured

    ↓

    Revenue Recognition Event

    ↓

    Accounting Entry

------------------------------------------------------------------------

缺点：

对于实体商品电商通常不适用。

------------------------------------------------------------------------

# 8.5 Shipment Based Revenue（发货确认收入）

## 定义

商品离开仓库时确认收入。

流程：

    WMS Ship Confirm

    ↓

    Shipment Event

    ↓

    Revenue Event

    ↓

    Journal Entry

------------------------------------------------------------------------

示例：

订单：

商品收入：

90

发货：

确认：

    Revenue = 90

------------------------------------------------------------------------

# 8.6 Delivery Based Revenue（签收确认收入）

## 定义

客户实际收到商品后确认收入。

流程：

    Carrier Delivered

    ↓

    Delivery Event

    ↓

    Revenue Recognition

------------------------------------------------------------------------

适用：

-   高价值商品
-   跨境运输
-   风险转移较晚业务

------------------------------------------------------------------------

# 8.7 Revenue Event（收入事件）

Financial Event 中最重要的一类。

## Revenue Event 数据模型

  English Field      中文字段       类型       说明
  ------------------ -------------- ---------- ---------------------------
  Revenue Event ID   收入事件编号   String     唯一编号
  Order ID           订单编号       String     来源订单
  Shipment ID        发货编号       String     履约关联
  Recognition Date   确认日期       DateTime   收入确认时间
  Revenue Type       收入类型       Enum       商品/运费
  Revenue Amount     收入金额       Decimal    确认金额
  Recognition Rule   确认规则       Enum       Payment/Shipment/Delivery

------------------------------------------------------------------------

# 8.8 Revenue Calculation（收入计算）

公式：

    Revenue Amount

    =

    Net Sales Amount

    +

    Shipping Revenue

    +

    Service Fee

------------------------------------------------------------------------

示例：

订单：

    Net Sales:

    90


    Shipping Revenue:

    8


    Tax:

    7.84

收入：

    Revenue

    =

    90 + 8

    =

    98

税：

    Tax Liability

    =

    7.84

------------------------------------------------------------------------

# 8.9 Revenue Reversal（收入冲销）

收入不是永久固定。

发生：

-   订单取消
-   退款
-   退货

需要冲销。

流程：

    Original Revenue Event

    ↓

    Return Event

    ↓

    Revenue Reversal Event

    ↓

    Accounting Adjustment

------------------------------------------------------------------------

# 8.10 Refund 对收入影响

例如：

原订单：

Revenue：

98

客户退款：

全部退款。

产生：

    Revenue Reversal:

    -98

------------------------------------------------------------------------

# 8.11 Revenue Accounting（收入会计）

## 收入确认

示例：

订单已完成。

会计：

    Debit:

    Customer Deposit（客户预收）


    Credit:

    Sales Revenue（销售收入）


    Credit:

    Shipping Revenue（运费收入）

------------------------------------------------------------------------

## 税务处理

销售税：

不是收入。

会计：

    Credit:

    Tax Payable（应交税费）

------------------------------------------------------------------------

# 8.12 Revenue 与 NetSuite / QuickBooks 集成

## NetSuite Mapping

  OMS对象         中文       NetSuite对象
  --------------- ---------- -------------------------------------
  Revenue Event   收入事件   Revenue Recognition / Journal Entry
  Invoice         发票       Invoice
  Refund          退款       Credit Memo

------------------------------------------------------------------------

## QuickBooks Mapping

  OMS对象         中文       QuickBooks对象
  --------------- ---------- -----------------------
  Revenue Event   收入事件   Invoice/Sales Receipt
  Refund          退款       Refund Receipt

------------------------------------------------------------------------

# 8.13 Revenue Recognition 生命周期

完整流程：

    Sales Order（销售订单）

    ↓

    Payment（支付）

    ↓

    Fulfillment（履约）

    ↓

    Shipment / Delivery Event（发货/签收）

    ↓

    Revenue Recognition Event（收入确认事件）

    ↓

    Accounting Entry（会计分录）

    ↓

    General Ledger（总账）

------------------------------------------------------------------------

# Part 8 总结

核心结论：

1.  Payment（支付）不等于 Revenue（收入）。
2.  Revenue必须基于确认规则产生。
3.  实体商品电商通常采用Shipment或Delivery确认。
4.  Sales Tax不属于收入。
5.  退款必须通过Revenue Reversal处理。
6.  Revenue Event是OMS连接财务系统的核心对象。

------------------------------------------------------------------------

# 下一章节

# Part 9：Invoice / AR / AP Model（发票、应收、应付模型）

将设计：

-   Customer Invoice（客户发票）
-   Accounts Receivable（应收账款）
-   Vendor Bill（供应商账单）
-   Accounts Payable（应付账款）
-   Credit Memo（贷项通知单）
-   Debit Memo（借项通知单）
-   NetSuite / QuickBooks映射
