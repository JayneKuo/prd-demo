# OMS Commerce ERP 财务域设计文档

# Part 6：Inventory Cost Model（商品成本与库存成本模型）

## 6.1 设计目标 Business Purpose（业务目的）

Inventory Cost Model（库存成本模型）用于管理：

-   商品采购成本
-   库存资产价值
-   销售出库成本（COGS）
-   库存调整损益
-   库存报废损失

它连接：

Product Master（商品主数据）

↓

Inventory（库存）

↓

Cost Ledger（成本台账）

↓

COGS（销售成本）

↓

Profitability（利润分析）

------------------------------------------------------------------------

# 6.2 核心概念 Core Concepts（核心概念）

## Inventory Quantity（库存数量）

表示：

企业拥有多少商品。

例如：

SKU-A

数量：

100件

------------------------------------------------------------------------

## Inventory Value（库存价值）

表示：

库存对应的金额价值。

公式：

    Inventory Value

    =

    Quantity

    ×

    Unit Cost

例如：

库存：

100件

单位成本：

30美元

库存价值：

    100 × 30

    =3000 USD

------------------------------------------------------------------------

## Product Cost（商品成本）

Product Cost表示：

获取商品所支付的成本。

通常包括：

  English Field     中文字段
  ----------------- ------------
  Purchase Price    采购价格
  Supplier Cost     供应商成本
  Landed Cost       到岸成本
  Additional Cost   附加成本

------------------------------------------------------------------------

# 6.3 Cost Component（成本组成）

商品成本不一定只有采购价格。

## Purchase Cost（采购成本）

供应商报价：

例如：

SKU-A:

\$30

------------------------------------------------------------------------

## Landed Cost（入库成本）

包含：

-   Purchase Price（采购价格）
-   Freight（运输费用）
-   Customs Duty（关税）
-   Insurance（保险）
-   Handling Fee（处理费用）

公式：

    Landed Cost

    =

    Purchase Cost

    +

    Additional Cost

------------------------------------------------------------------------

示例：

采购：

30

运输：

2

关税：

1

最终：

    Landed Cost

    =
    33

------------------------------------------------------------------------

# 6.4 Cost Method（成本计算方法）

系统支持：

-   Standard Cost（标准成本）
-   Average Cost（平均成本）
-   FIFO（先进先出）

------------------------------------------------------------------------

# 6.5 Standard Cost（标准成本）

## 定义

企业预先设定一个标准成本。

例如：

SKU-A:

    Standard Cost = 30

所有销售成本按照30计算。

------------------------------------------------------------------------

## 优点

-   简单
-   计算快速
-   适合制造企业

------------------------------------------------------------------------

## 缺点

无法反映实际采购变化。

------------------------------------------------------------------------

# 6.6 Average Cost（平均成本）

## 定义

根据库存价值计算平均成本。

公式：

    Average Cost

    =

    (Current Inventory Value + New Receipt Value)

    /

    (Current Quantity + Receipt Quantity)

------------------------------------------------------------------------

## 示例

当前库存：

100件

单位成本：

30

库存价值：

3000

新增采购：

200件

采购价格：

40

新增价值：

8000

计算：

    (3000 + 8000)

    / 
    (100 + 200)


    =

    36.67

新的平均成本：

36.67

------------------------------------------------------------------------

# 6.7 FIFO（First In First Out，先进先出）

## 定义

先进入库存的商品先被销售。

库存层：

  批次      数量   成本
  --------- ------ ------
  Batch A   100    30
  Batch B   100    40

销售：

150件

COGS：

    100 × 30

    +

    50 × 40


    =

    5000

------------------------------------------------------------------------

# 6.8 Inventory Transaction（库存交易）

所有库存变化必须产生交易记录。

## Inventory Transaction 数据模型

  English Field        中文字段       类型       说明
  -------------------- -------------- ---------- ----------------
  Transaction ID       库存交易编号   String     唯一编号
  SKU ID               商品编码       String     商品
  Warehouse ID         仓库编号       String     仓库
  Transaction Type     交易类型       Enum       收货/出库/调整
  Quantity Change      数量变化       Decimal    增减数量
  Unit Cost            单位成本       Decimal    成本
  Total Value Change   价值变化       Decimal    金额变化
  Transaction Date     交易日期       DateTime   时间

------------------------------------------------------------------------

# 6.9 COGS Model（销售成本模型）

## COGS定义

COGS：

Cost of Goods Sold

中文：

销售成本。

表示：

已经销售商品对应的成本。

------------------------------------------------------------------------

公式：

    COGS

    =

    Quantity Sold

    ×

    Unit Cost

------------------------------------------------------------------------

示例：

销售：

SKU-A

10件

成本：

30

COGS：

    10 × 30

    =
    300

------------------------------------------------------------------------

# 6.10 Inventory Accounting（库存会计）

## Purchase Receipt（采购入库）

业务：

采购100件。

成本：

3000。

会计：

    Debit:

    Inventory Asset（库存资产）

    3000


    Credit:

    Accounts Payable（应付账款）

    3000

------------------------------------------------------------------------

## Sales Shipment（销售出库）

销售成本：

300。

会计：

    Debit:

    COGS（销售成本）

    300


    Credit:

    Inventory Asset（库存资产）

    300

------------------------------------------------------------------------

# 6.11 Inventory Adjustment（库存调整）

原因：

-   盘点差异
-   损坏
-   丢失
-   系统错误

------------------------------------------------------------------------

示例：

库存减少：

100美元。

会计：

    Debit:

    Inventory Adjustment Expense

    100


    Credit:

    Inventory Asset

    100

------------------------------------------------------------------------

# 6.12 Write-off（库存报废）

定义：

库存无法销售。

例如：

过期商品。

会计：

    Debit:

    Inventory Write-off Expense


    Credit:

    Inventory Asset

------------------------------------------------------------------------

# 6.13 OMS / WMS / ERP职责

  数据                          维护系统
  ----------------------------- -----------------------
  Inventory Quantity 库存数量   WMS
  Inventory Movement 库存动作   WMS
  Inventory Cost 库存成本       OMS Cost Ledger / ERP
  Purchase Cost 采购成本        Procurement / ERP
  COGS 销售成本                 OMS Finance / ERP
  GL Posting 总账入账           NetSuite/QB/OMS GL

------------------------------------------------------------------------

# Part 6 总结

核心设计：

1.  商品成本不能简单存在Product表。
2.  Inventory Cost Ledger是成本事实来源。
3.  COGS必须来源于库存成本。
4.  历史订单需要Cost Snapshot。
5.  支持Standard Cost、Average Cost、FIFO。
6.  库存数量和库存价值必须分离管理。

------------------------------------------------------------------------

# 下一章节

# Part 7：Fulfillment Financial Model（履约成本模型）

将设计：

-   Warehouse Cost（仓储成本）
-   Pick Fee（拣货费）
-   Pack Fee（包装费）
-   Storage Fee（仓储费）
-   Handling Fee（操作费）
-   Freight Cost（运输成本）
-   Carrier Invoice（承运商账单）
-   3PL Billing（第三方仓储计费）
