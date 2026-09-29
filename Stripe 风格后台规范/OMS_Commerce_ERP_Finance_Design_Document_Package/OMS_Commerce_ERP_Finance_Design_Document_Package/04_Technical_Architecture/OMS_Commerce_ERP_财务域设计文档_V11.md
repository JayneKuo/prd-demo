# OMS Commerce ERP 财务域设计文档

# Part 9：Invoice / AR / AP Model（发票、应收、应付模型）

## 9.1 设计目标 Business Purpose（业务目的）

Invoice / AR / AP
Model（发票、应收、应付模型）用于管理企业交易后的资金结算关系。

主要解决：

-   客户应该支付多少钱
-   企业是否已经收到款项
-   哪些客户存在欠款
-   企业需要支付哪些供应商费用
-   仓储、运输等运营费用如何进入财务

核心原则：

> Invoice（发票）代表应收或应付义务，不等于 Payment（支付），也不等于
> Revenue（收入）。

------------------------------------------------------------------------

# 9.2 财务对象关系 Financial Object Relationship（财务对象关系）

## 销售链路 Order To Cash（订单到现金）

``` text
Sales Order（销售订单）

        ↓

Fulfillment（履约）

        ↓

Invoice（客户发票）

        ↓

Accounts Receivable（应收账款）

        ↓

Customer Payment（客户付款）

        ↓

Bank / GL（银行/总账）
```

------------------------------------------------------------------------

## 采购及费用链路 Procure To Pay（采购到付款）

``` text
Vendor Service

        ↓

Vendor Invoice（供应商发票）

        ↓

Accounts Payable（应付账款）

        ↓

Vendor Payment（供应商付款）

        ↓

Bank / GL（银行/总账）
```

------------------------------------------------------------------------

# 9.3 Customer Invoice（客户发票）

## 9.3.1 Invoice Definition（发票定义）

Customer Invoice（客户发票）表示：

企业向客户要求支付的正式财务凭证。

来源：

-   Sales Order
-   Shipment
-   Revenue Event

------------------------------------------------------------------------

# 9.3.2 Invoice Header 数据模型

  English Field    中文字段     Data Type   说明
  ---------------- ------------ ----------- ----------------------
  Invoice ID       发票编号     String      系统唯一编号
  Invoice Number   发票号码     String      对外编号
  Customer ID      客户编号     String      客户
  Invoice Date     发票日期     Date        开票日期
  Due Date         到期日期     Date        应付款日期
  Currency Code    币种代码     String      USD等
  Invoice Status   发票状态     Enum        Draft/Open/Paid/Void
  Total Amount     发票总金额   Decimal     应收金额
  Balance Due      未付款金额   Decimal     剩余应收

------------------------------------------------------------------------

# 9.4 Invoice Line（发票明细）

  English Field     中文字段       说明
  ----------------- -------------- ----------------
  Invoice Line ID   发票明细编号   唯一编号
  SKU ID            商品编码       商品
  Description       描述           服务或商品描述
  Quantity          数量           数量
  Unit Price        单价           销售价格
  Line Amount       行金额         明细金额
  Tax Amount        税费金额       税
  Total Amount      总金额         含税金额

------------------------------------------------------------------------

# 9.5 Invoice Generation Rule（发票生成规则）

系统支持：

## Order Based Invoice（订单开票）

订单确认后生成。

适合：

-   B2C
-   即时销售

------------------------------------------------------------------------

## Shipment Based Invoice（发货开票）

发货后生成。

适合：

-   实体商品

------------------------------------------------------------------------

## Delivery Based Invoice（签收开票）

客户收到后生成。

适合：

-   高价值商品
-   风险控制场景

------------------------------------------------------------------------

# 9.6 Accounts Receivable（AR，应收账款）

## 定义

Accounts Receivable：

客户已经购买商品，但是企业尚未收到的钱。

公式：

    Accounts Receivable

    =

    Invoice Amount

    -

    Customer Payment

------------------------------------------------------------------------

示例：

发票：

1000

客户付款：

600

应收：

    1000 - 600

    =
    400

------------------------------------------------------------------------

# 9.7 Payment Application（收款核销）

客户付款后，需要匹配发票。

数据模型：

  English Field            中文字段       说明
  ------------------------ -------------- ----------
  Payment Application ID   收款核销编号   唯一编号
  Payment ID               支付编号       付款记录
  Invoice ID               发票编号       关联发票
  Applied Amount           核销金额       使用金额
  Applied Date             核销日期       时间

------------------------------------------------------------------------

# 9.8 Credit Memo（贷项通知单）

## 定义

减少客户应付款。

场景：

-   退款
-   价格调整
-   少收费修正

示例：

原发票：

100

退款：

20

生成：

Credit Memo:

20

新的应收：

80

------------------------------------------------------------------------

# 9.9 Vendor Bill（供应商账单）

## 定义

企业收到供应商或服务商费用账单。

来源：

-   Supplier
-   Warehouse
-   Carrier
-   3PL

------------------------------------------------------------------------

## Vendor Bill 数据模型

  English Field    中文字段         说明
  ---------------- ---------------- -----------
  Vendor Bill ID   供应商账单编号   唯一编号
  Vendor ID        供应商编号       供应商
  Invoice Number   供应商发票号     外部编号
  Bill Date        账单日期         日期
  Due Date         到期日期         付款日期
  Amount           金额             应付金额
  Status           状态             Open/Paid

------------------------------------------------------------------------

# 9.10 AP（Accounts Payable，应付账款）

定义：

企业欠供应商的钱。

公式：

    Accounts Payable

    =

    Vendor Bill Amount

    -

    Vendor Payment

------------------------------------------------------------------------

示例：

仓储供应商账单：

5000

已支付：

3000

应付：

2000

------------------------------------------------------------------------

# 9.11 Fulfillment Expense Billing（履约费用账单）

## Warehouse Invoice（仓储账单）

来源：

WMS / 3PL

费用：

-   Storage Fee（仓储费）
-   Pick Fee（拣货费）
-   Pack Fee（包装费）

------------------------------------------------------------------------

## Carrier Invoice（承运商账单）

来源：

TMS / Carrier

费用：

-   Freight（运输费）
-   Fuel Surcharge（燃油附加费）
-   Accessorial Fee（附加费）

------------------------------------------------------------------------

# 9.12 Accounting Impact（会计影响）

## Customer Invoice（客户发票）

生成：

    Debit:

    Accounts Receivable（应收账款）


    Credit:

    Sales Revenue（销售收入）


    Credit:

    Tax Payable（税务负债）

------------------------------------------------------------------------

## Customer Payment（客户付款）

    Debit:

    Cash（现金）


    Credit:

    Accounts Receivable（应收账款）

------------------------------------------------------------------------

## Vendor Bill（供应商账单）

    Debit:

    Expense / Inventory Asset（费用/库存资产）


    Credit:

    Accounts Payable（应付账款）

------------------------------------------------------------------------

## Vendor Payment（供应商付款）

    Debit:

    Accounts Payable（应付账款）


    Credit:

    Cash（现金）

------------------------------------------------------------------------

# 9.13 NetSuite / QuickBooks Mapping（系统映射）

## NetSuite

  OMS对象            中文         NetSuite对象
  ------------------ ------------ ------------------
  Customer Invoice   客户发票     Invoice
  Customer Payment   客户付款     Customer Payment
  Credit Memo        贷项通知单   Credit Memo
  Vendor Bill        供应商账单   Vendor Bill
  Vendor Payment     供应商付款   Vendor Payment

------------------------------------------------------------------------

## QuickBooks

  OMS对象       中文         QuickBooks对象
  ------------- ------------ -----------------
  Invoice       发票         Invoice
  Payment       收款         Receive Payment
  Credit Memo   贷项通知单   Credit Memo
  Vendor Bill   账单         Bill
  Payment       付款         Bill Payment

------------------------------------------------------------------------

# Part 9 总结

核心结论：

1.  Invoice代表付款义务。
2.  Payment代表资金流。
3.  Revenue代表收入确认。
4.  AR管理客户欠款。
5.  AP管理企业对供应商欠款。
6.  WMS/TMS产生的费用最终通过Vendor Bill进入财务。
7.  OMS可以提供完整运营财务视图，并同步专业ERP。

------------------------------------------------------------------------

# 下一章节

# Part 10：Return / Reverse Logistics Model（退货与逆向物流模型）

将设计：

-   Return Order（退货订单）
-   Return Authorization（退货授权）
-   Reverse Shipment（逆向运输）
-   Return Receive（退货收货）
-   Inspection（质量检查）
-   Refund（退款）
-   Inventory Restoration（库存恢复）
-   Revenue Reversal（收入冲销）
-   COGS Reversal（成本冲销）
