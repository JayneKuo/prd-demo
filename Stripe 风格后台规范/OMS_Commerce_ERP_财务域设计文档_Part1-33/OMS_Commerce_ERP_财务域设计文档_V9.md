# OMS Commerce ERP 财务域设计文档

# Part 7：Fulfillment Financial Model（履约成本模型）

## 7.1 设计目标 Business Purpose（业务目的）

Fulfillment Financial
Model（履约成本模型）用于管理订单从仓库处理到最终交付过程中产生的各种成本。

主要解决：

-   一个订单花费多少仓储成本
-   一个订单花费多少运输成本
-   WMS/3PL产生的费用如何进入OMS利润分析
-   TMS/Carrier运输费用如何分摊到订单
-   外部系统费用如何同步到OMS Finance

核心原则：

> OMS不一定执行仓库和运输，但是必须能够记录履约产生的财务影响。

------------------------------------------------------------------------

# 7.2 Fulfillment Cost（履约成本）定义

Fulfillment Cost（履约成本）：

指完成客户订单交付过程中产生的运营成本。

包括：

  English Field         中文字段   来源
  --------------------- ---------- -------------
  Warehouse Cost        仓储成本   WMS/3PL
  Transportation Cost   运输成本   TMS/Carrier
  Handling Cost         操作成本   WMS/3PL
  Packaging Cost        包装成本   WMS
  Labor Cost            人工成本   WMS/ERP

------------------------------------------------------------------------

# 7.3 Warehouse Cost Model（仓储成本模型）

## 7.3.1 Warehouse Cost Definition（仓储成本定义）

仓储成本来源：

-   自营仓库
-   第三方仓库（3PL）

------------------------------------------------------------------------

## 7.3.2 Warehouse Service Fee（仓储服务费用）

常见费用：

  English Field   中文字段   说明
  --------------- ---------- ------------------------
  Receiving Fee   收货费     入库操作费用
  Putaway Fee     上架费     商品放入库位费用
  Storage Fee     存储费     按面积/库存量收费
  Pick Fee        拣货费     根据订单或商品数量收费
  Pack Fee        包装费     包装操作费用
  Handling Fee    操作费     额外人工操作费用

------------------------------------------------------------------------

# 7.4 Warehouse Cost Transaction（仓储费用交易）

## 数据模型

  English Field          中文字段       类型      说明
  ---------------------- -------------- --------- -------------------
  Warehouse Cost ID      仓储费用编号   String    唯一编号
  Warehouse ID           仓库编号       String    仓库
  Order ID               订单编号       String    关联订单
  Fulfillment Order ID   履约单编号     String    关联履约
  Cost Type              费用类型       Enum      Pick/Pack/Storage
  Quantity               数量           Decimal   计费数量
  Unit Rate              单价           Decimal   计费单价
  Total Amount           总金额         Decimal   总费用
  Invoice ID             发票编号       String    来源账单

------------------------------------------------------------------------

# 7.5 Warehouse Cost Calculation（仓储费用计算）

## Pick Fee（拣货费）

公式：

    Pick Fee

    =

    Picked Quantity

    ×

    Pick Rate

示例：

拣货：

10件

单价：

0.1美元/件

费用：

    10 × 0.1

    =
    1 USD

------------------------------------------------------------------------

## Storage Fee（存储费）

常见：

按：

-   库位
-   托盘
-   平方英尺
-   天数

计算。

公式：

    Storage Fee

    =

    Storage Unit

    ×

    Days

    ×

    Daily Rate

------------------------------------------------------------------------

# 7.6 Transportation Cost Model（运输成本模型）

## 定义

Transportation Cost（运输成本）：

企业支付给承运商完成配送产生的费用。

来源：

-   TMS
-   Carrier API
-   Carrier Invoice

------------------------------------------------------------------------

# 7.7 Transportation Cost Component（运输成本组成）

  English Field     中文字段
  ----------------- ------------
  Base Freight      基础运费
  Fuel Surcharge    燃油附加费
  Accessorial Fee   附加费用
  Residential Fee   住宅配送费
  Oversize Fee      超尺寸费用
  Customs Fee       清关费用

------------------------------------------------------------------------

# 7.8 Carrier Invoice（承运商账单）

## 数据模型

  English Field        中文字段         说明
  -------------------- ---------------- -------------
  Carrier Invoice ID   承运商账单编号   唯一编号
  Carrier ID           承运商编号       UPS/FedEx等
  Shipment ID          发货编号         关联运输
  Freight Amount       运费金额         基础费用
  Surcharge Amount     附加费用         额外费用
  Total Amount         总金额           最终费用

------------------------------------------------------------------------

# 7.9 Cost Allocation（成本分摊）

如果一个运输账单包含多个订单：

需要分摊。

例如：

Carrier Invoice:

100 USD

包含：

Order A

Order B

Order C

------------------------------------------------------------------------

## Allocation Rule（分摊规则）

支持：

  English Field                中文字段
  ---------------------------- ------------
  Weight Based Allocation      按重量分摊
  Volume Based Allocation      按体积分摊
  Shipment Amount Allocation   按货值分摊
  Equal Allocation             平均分摊

------------------------------------------------------------------------

公式示例：

按重量：

    Order Freight Cost

    =

    Total Freight

    ×

    Order Weight

    /

    Total Weight

------------------------------------------------------------------------

# 7.10 Fulfillment Cost 与订单利润关系

订单利润计算：

    Revenue

    -

    Product Cost

    -

    Warehouse Cost

    -

    Transportation Cost

    -

    Payment Fee

    =

    Profit

------------------------------------------------------------------------

示例：

订单：

Revenue:

98

成本：

商品成本：

50

仓储：

2

运输：

10

支付手续费：

3

利润：

    98 - 50 - 2 - 10 - 3

    =

    33

------------------------------------------------------------------------

# 7.11 外部系统集成关系

## WMS / 3PL

提供：

-   Fulfillment Event
-   Warehouse Charge
-   Invoice

同步到OMS：

    WMS

    ↓

    Warehouse Cost Transaction

    ↓

    OMS Profitability

------------------------------------------------------------------------

## TMS / Carrier

提供：

-   Shipment Cost
-   Carrier Invoice

同步：

    TMS

    ↓

    Freight Cost Transaction

    ↓

    OMS Profitability

------------------------------------------------------------------------

# 7.12 Accounting Impact（会计影响）

仓储费用：

    Debit:

    Warehouse Expense（仓储费用）


    Credit:

    Accounts Payable（应付账款）

------------------------------------------------------------------------

运输费用：

    Debit:

    Freight Expense（运输费用）


    Credit:

    Accounts Payable（应付账款）

------------------------------------------------------------------------

# Part 7 总结

核心设计：

1.  履约成本必须独立于商品成本。
2.  WMS负责执行，OMS负责财务分析。
3.  TMS负责运输执行，OMS记录运输成本。
4.  外部费用通过Cost Transaction进入OMS。
5.  所有费用最终关联Order，实现真实利润分析。

------------------------------------------------------------------------

# 下一章节

# Part 8：Revenue Recognition Model（收入确认模型）

将设计：

-   Revenue Recognition（收入确认）
-   Payment Based Revenue（付款确认收入）
-   Shipment Based Revenue（发货确认收入）
-   Delivery Based Revenue（签收确认收入）
-   Revenue Event（收入事件）
-   Revenue Reversal（收入冲销）
