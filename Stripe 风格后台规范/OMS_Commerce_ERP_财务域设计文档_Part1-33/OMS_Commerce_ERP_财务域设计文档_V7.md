# OMS Commerce ERP 财务域设计文档

# Part 5：Payment & Settlement Model（支付与结算模型）

## 5.1 设计目标 Business Purpose（业务目的）

Payment & Settlement Model（支付与结算模型）用于管理：

-   客户支付行为
-   支付渠道交易
-   资金结算过程
-   支付手续费
-   退款
-   拒付

核心原则：

> Payment（支付）是资金流，不等于 Revenue（收入）。

------------------------------------------------------------------------

# 5.2 Payment Domain（支付领域）

支付领域主要解决：

客户的钱是否支付成功？

企业是否收到资金？

支付机构扣除了多少费用？

------------------------------------------------------------------------

# 5.3 Payment Transaction（支付交易）

Payment Transaction（支付交易）表示一次客户付款行为。

## Payment Transaction 数据模型

  English Field        中文字段   Data Type   说明
  -------------------- ---------- ----------- -------------------------
  Payment ID           支付编号   String      支付流水唯一编号
  Order ID             订单编号   String      关联销售订单
  Customer ID          客户编号   String      支付客户
  Payment Method       支付方式   Enum        Credit Card/ACH/Wallet
  Payment Provider     支付渠道   String      Stripe/Adyen等
  Transaction Amount   交易金额   Decimal     支付金额
  Currency Code        币种代码   String      USD等
  Payment Status       支付状态   Enum        Pending/Captured/Failed
  Transaction Time     交易时间   DateTime    支付时间

------------------------------------------------------------------------

# 5.4 Payment Lifecycle（支付生命周期）

完整流程：

``` text
Authorization（支付授权）

        ↓

Capture（扣款确认）

        ↓

Settlement（支付机构结算）

        ↓

Payout（资金到账）

        ↓

Bank Reconciliation（银行对账）
```

------------------------------------------------------------------------

# 5.5 Authorization（支付授权）

## 定义

Payment Authorization（支付授权）：

支付机构确认：

客户银行卡是否可用。

特点：

-   资金未真正扣除
-   不产生收入
-   可以取消

状态：

  English Status         中文状态
  ---------------------- ----------
  Authorized             已授权
  Authorization Failed   授权失败
  Expired                已过期

------------------------------------------------------------------------

# 5.6 Capture（扣款确认）

Capture表示：

支付正式完成。

例如：

客户购买：

订单金额：

\$105.84

Payment Capture：

``` text
Captured Amount:

105.84
```

此时：

OMS记录：

Payment Received（收到支付）

但：

不代表 Revenue Recognition（收入确认）。

------------------------------------------------------------------------

# 5.7 Settlement（结算）

Settlement（结算）：

支付平台计算：

-   商户收入
-   手续费
-   实际结算金额

例如：

客户支付：

``` text
Gross Payment:

105.84
```

支付手续费：

``` text
Payment Fee:

3.00
```

实际到账：

``` text
Settlement Amount:

102.84
```

公式：

    Settlement Amount

    =

    Payment Amount

    -

    Payment Fee

------------------------------------------------------------------------

# 5.8 Payment Fee（支付手续费）

Payment Fee（支付手续费）属于：

Operating Expense（运营费用）

不是：

Product Cost（商品成本）

字段：

  English Field      中文字段       说明
  ------------------ -------------- ----------
  Payment Fee ID     支付费用编号   唯一编号
  Payment Provider   支付渠道       Stripe等
  Fee Amount         手续费金额     支付成本
  Fee Rate           手续费率       百分比

------------------------------------------------------------------------

# 5.9 Refund Model（退款模型）

退款不是删除订单。

必须产生：

Reverse Transaction（反向交易）

流程：

``` text
Customer Request Refund（客户申请退款）

        ↓

Refund Approval（退款审批）

        ↓

Refund Transaction（退款交易）

        ↓

Payment Reversal（支付冲销）

        ↓

Accounting Adjustment（财务调整）
```

------------------------------------------------------------------------

## Refund 数据模型

  English Field         中文字段     说明
  --------------------- ------------ ----------
  Refund ID             退款编号     唯一编号
  Original Payment ID   原支付编号   关联支付
  Refund Amount         退款金额     金额
  Refund Reason         退款原因     原因
  Refund Status         退款状态     状态

------------------------------------------------------------------------

# 5.10 Chargeback（拒付）

Chargeback：

客户通过银行申请撤销支付。

例如：

信用卡争议。

流程：

``` text
Customer Dispute

↓

Payment Provider Review

↓

Chargeback Decision

↓

Financial Adjustment
```

------------------------------------------------------------------------

## Chargeback 数据模型

  English Field       中文字段   说明
  ------------------- ---------- ----------
  Chargeback ID       拒付编号   唯一编号
  Payment ID          支付编号   原交易
  Chargeback Amount   拒付金额   金额
  Reason Code         原因代码   银行原因

------------------------------------------------------------------------

# 5.11 Payment 与财务关系

## Payment Capture

代表：

资金流。

会计影响：

收到客户付款：

    Debit:
    Cash（现金）

    Credit:
    Customer Deposit（客户预收）

------------------------------------------------------------------------

## Revenue Recognition

收入确认发生时：

    Debit:
    Customer Deposit

    Credit:
    Sales Revenue

    Credit:
    Tax Payable

------------------------------------------------------------------------

因此：

``` text
Payment Capture

≠

Revenue Recognition
```

------------------------------------------------------------------------

# 5.12 Payment 与 NetSuite / QuickBooks 映射

## NetSuite Mapping

  OMS对象               中文         NetSuite对象
  --------------------- ------------ -------------------------
  Payment Transaction   支付交易     Customer Payment
  Refund                退款         Credit Memo / Refund
  Payment Fee           支付手续费   Expense / Journal Entry

------------------------------------------------------------------------

## QuickBooks Mapping

  OMS对象               中文         QuickBooks对象
  --------------------- ------------ ----------------
  Payment Transaction   支付交易     Payment
  Refund                退款         Refund Receipt
  Payment Fee           支付手续费   Expense

------------------------------------------------------------------------

# Part 5 总结

核心结论：

1.  Payment记录资金流。
2.  Revenue记录收入确认。
3.  Settlement记录支付机构结算。
4.  Payment Fee属于费用，不属于商品成本。
5.  Refund和Chargeback必须作为反向财务事件处理。

------------------------------------------------------------------------

# 下一章节

# Part 6：Inventory Cost Model（商品成本与库存成本模型）

将设计：

-   Inventory Valuation（库存估值）
-   COGS（销售成本）
-   FIFO（先进先出）
-   Average Cost（平均成本）
-   Standard Cost（标准成本）
-   Inventory Adjustment（库存调整）
-   Write-off（报废）
-   Inventory Accounting（库存会计）
