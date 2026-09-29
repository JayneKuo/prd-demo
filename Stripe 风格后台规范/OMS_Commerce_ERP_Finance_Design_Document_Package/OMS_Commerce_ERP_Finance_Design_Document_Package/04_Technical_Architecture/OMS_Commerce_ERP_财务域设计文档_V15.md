# OMS Commerce ERP 财务域设计文档

# Part 13：Order Profitability Analysis（订单利润分析模型）

## 13.1 设计目标 Business Purpose（业务目的）

Order Profitability Analysis（订单利润分析模型）用于回答：

> 一个销售订单最终为企业创造了多少利润？

传统 OMS 通常只能看到：

-   Order Amount（订单金额）
-   Payment Status（支付状态）
-   Shipment Status（发货状态）

但是企业真正关心：

-   收入是多少？
-   商品成本是多少？
-   履约花费多少？
-   运输花费多少？
-   支付手续费多少？
-   最终利润多少？

因此 OMS Commerce ERP 需要建立订单级利润模型。

------------------------------------------------------------------------

# 13.2 Profitability Calculation（利润计算模型）

核心公式：

    Revenue（收入）

    -

    Product Cost（商品成本）

    -

    Fulfillment Cost（履约成本）

    -

    Transportation Cost（运输成本）

    -

    Payment Fee（支付手续费）

    -

    Other Expense（其他费用）

    =

    Order Profit（订单利润）

------------------------------------------------------------------------

# 13.3 Revenue Analysis（收入分析）

## Revenue Components（收入组成）

  English Field      中文字段   来源
  ------------------ ---------- -------------------
  Product Revenue    商品收入   OMS Revenue Event
  Shipping Revenue   运费收入   OMS Order
  Service Revenue    服务收入   OMS Billing
  Other Revenue      其他收入   Finance

------------------------------------------------------------------------

## Revenue Calculation（收入计算）

公式：

    Revenue

    =

    Product Revenue

    +

    Shipping Revenue

    +

    Service Revenue

注意：

不包含：

-   Sales Tax（销售税）

------------------------------------------------------------------------

# 13.4 Product Cost Analysis（商品成本分析）

来源：

Inventory Cost Ledger（库存成本台账）

字段：

  English Field        中文字段
  -------------------- --------------
  SKU ID               商品编码
  Quantity Sold        销售数量
  Unit Cost Snapshot   单位成本快照
  Total Product Cost   商品总成本

------------------------------------------------------------------------

公式：

    Product Cost

    =

    Quantity Sold

    ×

    Unit Cost Snapshot

------------------------------------------------------------------------

# 13.5 Fulfillment Cost Analysis（履约成本分析）

履约成本包括：

  English Field    中文字段
  ---------------- ----------
  Warehouse Cost   仓储成本
  Pick Fee         拣货费用
  Pack Fee         包装费用
  Storage Fee      存储费用
  Handling Fee     操作费用

------------------------------------------------------------------------

公式：

    Fulfillment Cost

    =

    Warehouse Service Fee

    +

    Handling Fee

    +

    Packaging Fee

------------------------------------------------------------------------

# 13.6 Transportation Cost Analysis（运输成本分析）

运输成本：

  English Field     中文字段
  ----------------- ------------
  Freight Cost      运输成本
  Fuel Surcharge    燃油附加费
  Accessorial Fee   附加费用
  Customs Fee       清关费用

------------------------------------------------------------------------

公式：

    Transportation Cost

    =

    Base Freight

    +

    Surcharge

    +

    Accessorial Fee

------------------------------------------------------------------------

# 13.7 Payment Fee Analysis（支付费用分析）

支付费用：

  English Field     中文字段
  ----------------- --------------
  Gateway Fee       支付网关费用
  Transaction Fee   交易手续费
  Processing Fee    处理费用

------------------------------------------------------------------------

公式：

    Payment Fee

    =

    Payment Amount

    ×

    Fee Rate

------------------------------------------------------------------------

# 13.8 Margin Calculation（利润率计算）

## Gross Profit（毛利润）

公式：

    Gross Profit

    =

    Revenue

    -

    Product Cost

------------------------------------------------------------------------

## Contribution Margin（贡献毛利）

公式：

    Contribution Margin

    =

    Revenue

    -

    Product Cost

    -

    Fulfillment Cost

    -

    Transportation Cost

    -

    Payment Fee

------------------------------------------------------------------------

## Margin Percentage（利润率）

公式：

    Margin %

    =

    Profit

    /

    Revenue

    ×

    100%

------------------------------------------------------------------------

# 13.9 Order Profitability 数据模型

## Order Profitability Header（订单利润头）

  English Field         中文字段       说明
  --------------------- -------------- ----------
  Profitability ID      利润分析编号   唯一编号
  Order ID              订单编号       销售订单
  Revenue Amount        收入金额       总收入
  Product Cost          商品成本       COGS
  Fulfillment Cost      履约成本       仓库费用
  Transportation Cost   运输成本       配送费用
  Payment Fee           支付手续费     支付成本
  Profit Amount         利润金额       最终利润
  Margin Percentage     利润率         百分比

------------------------------------------------------------------------

# 13.10 完整订单案例 Order Example（订单案例）

订单：

  项目                          金额
  --------------------------- ------
  Product Revenue 商品收入        90
  Shipping Revenue 运费收入        8
  Revenue 总收入                  98

------------------------------------------------------------------------

成本：

  项目                        金额
  ------------------------- ------
  Product Cost 商品成本         50
  Warehouse Cost 仓储成本        2
  Freight Cost 运输成本         10
  Payment Fee 支付手续费         3

------------------------------------------------------------------------

计算：

    Profit

    =

    98

    -

    50

    -

    2

    -

    10

    -

    3


    =

    33

------------------------------------------------------------------------

利润率：

    Margin %

    =

    33 / 98

    =

    33.67%

------------------------------------------------------------------------

# 13.11 Profitability Data Source（利润数据来源）

  数据             中文         来源
  ---------------- ------------ -----------------------
  Revenue          收入         Revenue Event
  Product Cost     商品成本     Inventory Cost Ledger
  Warehouse Cost   仓储成本     WMS/3PL
  Freight Cost     运输成本     TMS/Carrier
  Payment Fee      支付手续费   Payment Provider

------------------------------------------------------------------------

# 13.12 Profitability Dashboard（利润看板）

支持：

## Order Level（订单级）

查看：

-   单个订单利润

------------------------------------------------------------------------

## SKU Level（商品级）

查看：

-   哪些商品赚钱
-   哪些商品亏损

------------------------------------------------------------------------

## Customer Level（客户级）

查看：

-   客户贡献利润

------------------------------------------------------------------------

## Channel Level（渠道级）

查看：

-   Amazon
-   Shopify
-   EDI

不同渠道利润。

------------------------------------------------------------------------

# Part 13 总结

核心结论：

1.  OMS Finance必须支持订单级利润分析。
2.  收入、成本必须来自不同业务域。
3.  Product Cost来自库存成本。
4.  Fulfillment Cost来自WMS/3PL。
5.  Freight Cost来自TMS/Carrier。
6.  Payment Fee来自支付系统。
7.  最终形成完整Contribution Margin。

------------------------------------------------------------------------

# 下一章节

# Part 14：NetSuite Integration（NetSuite 集成设计）

将设计：

-   Integration Architecture（集成架构）
-   Customer Mapping（客户映射）
-   Sales Order Mapping（订单映射）
-   Invoice Mapping（发票映射）
-   Payment Mapping（支付映射）
-   Vendor Bill Mapping（供应商账单映射）
-   Journal Entry Mapping（会计分录映射）
