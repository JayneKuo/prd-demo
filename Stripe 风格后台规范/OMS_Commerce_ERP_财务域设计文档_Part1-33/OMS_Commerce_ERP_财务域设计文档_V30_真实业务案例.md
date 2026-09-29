# OMS Commerce ERP 财务域设计文档

# Part 33：OMS Finance Real Business Scenario（真实业务案例）

## 33.1 案例目标 Business Scenario Objective（业务案例目标）

通过一个完整订单案例，展示 OMS Commerce ERP Finance 如何贯穿：

-   Sales Channel（销售渠道）
-   OMS（订单管理）
-   WMS（仓储管理）
-   TMS（运输管理）
-   Payment（支付）
-   Finance（财务）
-   Accounting（会计）
-   ERP（NetSuite / QuickBooks）

目标：

> 从客户下单开始，到最终财务入账，完整展示收入、成本、利润和会计影响。

------------------------------------------------------------------------

# 33.2 Business Scenario（业务场景）

客户：

Shopify Customer（Shopify客户）

订单：

Order ID：

    SO202609210001

商品：

  项目                         金额
  ------------------------ --------
  Product Price 商品价格     80 USD
  Shipping Fee 运费          10 USD
  Coupon Discount 优惠券     -5 USD
  Tax 税费                    8 USD

------------------------------------------------------------------------

# 33.3 Order Calculation（订单计算）

## Gross Sales（商品原价）

公式：

    Gross Sales

    =

    Product Price

    =

    80 USD

------------------------------------------------------------------------

## Discount（折扣）

    Discount

    =

    5 USD

------------------------------------------------------------------------

## Net Sales（净销售额）

公式：

    Net Sales

    =

    Gross Sales

    -

    Discount


    =

    80 - 5


    =

    75 USD

------------------------------------------------------------------------

## Total Customer Payment（客户支付金额）

公式：

    Customer Payment

    =

    Net Sales

    +

    Shipping Fee

    +

    Tax


    =

    75 + 10 + 8


    =

    93 USD

------------------------------------------------------------------------

# 33.4 Payment Flow（支付流程）

流程：

    Customer

    ↓

    Payment Gateway

    ↓

    OMS Payment Transaction

    ↓

    Payment Captured

    ↓

    Settlement

------------------------------------------------------------------------

支付记录：

  Field               中文字段     Value
  ------------------- ------------ --------
  Payment Amount      支付金额     93 USD
  Payment Fee         支付手续费   3 USD
  Settlement Amount   结算金额     90 USD

------------------------------------------------------------------------

# 33.5 Fulfillment Flow（履约流程）

## OMS分仓

订单：

    Sales Order

    ↓

    Fulfillment Order

    ↓

    Warehouse Allocation

------------------------------------------------------------------------

仓库：

    Warehouse US01

------------------------------------------------------------------------

WMS执行：

    Pick

    ↓

    Pack

    ↓

    Ship

------------------------------------------------------------------------

# 33.6 Inventory Cost（库存成本）

商品成本：

    SKU Cost

    =

    40 USD

销售数量：

    Qty = 1

COGS：

公式：

    COGS

    =

    Quantity

    ×

    Unit Cost


    =

    1 × 40


    =

    40 USD

------------------------------------------------------------------------

# 33.7 Transportation Cost（运输成本）

TMS返回：

  Cost Type                     Amount
  --------------------------- --------
  Base Freight 基础运费          8 USD
  Fuel Surcharge 燃油附加费      1 USD
  Accessorial 附加费             1 USD

Total：

    Freight Cost

    =

    8 + 1 + 1

    =

    10 USD

------------------------------------------------------------------------

# 33.8 Warehouse Cost（仓储成本）

WMS/3PL账单：

  Cost Type           Amount
  ----------------- --------
  Pick Fee 拣货费      1 USD
  Pack Fee 包装费      1 USD
  Handling 操作费      1 USD

Total：

    Warehouse Cost

    =

    3 USD

------------------------------------------------------------------------

# 33.9 Revenue Recognition（收入确认）

收入：

    Product Revenue

    =

    75 USD


    Shipping Revenue

    =

    10 USD

Total Revenue：

    Revenue

    =

    85 USD

注意：

Tax 8 USD 不属于Revenue。

------------------------------------------------------------------------

# 33.10 Profit Calculation（利润计算）

收入：

    Revenue

    =

    85 USD

成本：

  Cost                        Amount
  ------------------------- --------
  Product Cost 商品成本           40
  Warehouse Cost 仓储成本          3
  Freight Cost 运输成本           10
  Payment Fee 支付手续费           3

Total Cost：

    Total Cost

    =

    56 USD

------------------------------------------------------------------------

利润：

公式：

    Profit

    =

    Revenue

    -

    Total Cost


    =

    85 - 56


    =

    29 USD

------------------------------------------------------------------------

利润率：

    Margin %

    =

    29 / 85


    =

    34.12%

------------------------------------------------------------------------

# 33.11 Accounting Impact（会计影响）

## Payment Received（收到客户付款）

分录：

    Debit

    Cash

    93 USD


    Credit

    Customer Deposit

    93 USD

------------------------------------------------------------------------

## Revenue Recognition（收入确认）

    Debit

    Customer Deposit

    85 USD


    Credit

    Product Revenue

    75 USD


    Credit

    Shipping Revenue

    10 USD

------------------------------------------------------------------------

## Tax Liability（税费）

    Debit

    Customer Deposit

    8 USD


    Credit

    Tax Payable

    8 USD

------------------------------------------------------------------------

## Inventory Cost Recognition（库存成本确认）

    Debit

    COGS

    40 USD


    Credit

    Inventory Asset

    40 USD

------------------------------------------------------------------------

## Freight Expense（运输费用）

    Debit

    Freight Expense

    10 USD


    Credit

    Accounts Payable

    10 USD

------------------------------------------------------------------------

## Warehouse Expense（仓储费用）

    Debit

    Warehouse Expense

    3 USD


    Credit

    Accounts Payable

    3 USD

------------------------------------------------------------------------

# 33.12 Final Financial View（最终财务视图）

订单：

    Revenue

    85 USD


    -

    COGS

    40 USD


    -

    Fulfillment Cost

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

------------------------------------------------------------------------

# 33.13 End To End Data Traceability（全链路追踪）

利润29美元可以追溯：

    Profit

    ↓

    Order Profitability

    ↓

    Revenue Event

    ↓

    Sales Order

    ↓

    Payment

    ↓

    Shipment

    ↓

    Inventory Transaction

    ↓

    Cost Ledger

    ↓

    Journal Entry

    ↓

    GL

------------------------------------------------------------------------

# 33.14 Scenario Conclusion（案例总结）

通过该案例：

OMS Finance实现：

## Business Visibility（业务透明）

知道：

订单收入是多少。

## Cost Visibility（成本透明）

知道：

仓储、运输、商品成本是多少。

## Profit Visibility（利润透明）

知道：

订单最终赚多少钱。

## Accounting Integration（财务集成）

能够：

自动生成会计结果并同步：

-   NetSuite
-   QuickBooks

------------------------------------------------------------------------

# 下一章节

# Part 34：OMS Finance Advanced Design（高级设计）

下一部分补充：

-   Revenue Recognition Rules（收入确认规则）
-   Cost Allocation Engine（成本分摊引擎）
-   Tax Engine Design（税务引擎）
-   Settlement Engine Design（结算引擎）
-   Financial Rule Engine（财务规则引擎）
