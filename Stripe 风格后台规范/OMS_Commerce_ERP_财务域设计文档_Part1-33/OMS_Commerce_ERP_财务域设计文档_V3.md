# OMS Commerce ERP 财务域设计文档

## 文档信息 Document Information（文档信息）

  ------------------------------------------------------------------------------------------------------------------
  English Field 英文字段  中文字段                说明
  ----------------------- ----------------------- ------------------------------------------------------------------
  Document Name           文档名称                OMS Commerce ERP Finance Design
                                                  Document（OMS商业ERP财务域设计文档）

  Version                 版本                    V1.1

  Purpose                 目标                    设计具备轻量ERP能力，并支持NetSuite、QuickBooks集成的OMS财务体系
  ------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 目录 Table of Contents（目录）

1.  整体架构与领域边界设计
2.  基础数据模型设计
3.  订单财务模型设计
4.  定价、优惠、折扣、税费模型
5.  支付与结算模型
6.  商品成本与库存成本模型
7.  仓储与履约费用模型
8.  收入确认模型
9.  发票、应收、应付模型
10. 退货与逆向物流模型
11. 财务事件模型
12. 会计模型
13. 订单利润分析模型
14. NetSuite 集成设计
15. QuickBooks 集成设计

------------------------------------------------------------------------

# Part 1：整体架构与领域边界设计

## 1.1 产品定位 Product Positioning

系统定位：

OMS + Commerce ERP（订单管理系统 + 商业轻量ERP）

核心能力：

  English Term               中文字段   说明
  -------------------------- ---------- --------------------------
  Order Management           订单管理   管理销售订单生命周期
  Inventory Management       库存管理   管理库存数量和状态
  Fulfillment Management     履约管理   管理分仓、拣货、发货
  Billing                    计费管理   管理业务费用
  Accounts Receivable (AR)   应收账款   管理客户应收
  Accounts Payable (AP)      应付账款   管理供应商费用
  Cost Accounting            成本核算   分析商品和履约成本
  Financial Event            财务事件   将业务动作转换为财务影响

------------------------------------------------------------------------

# Part 2：基础数据模型设计 Master Data Design

# 2.1 Product Master 商品主数据

## 2.1.1 Product 商品

Product 表示商业商品概念。

例如：

Product： iPhone 15

字段：

  English Field   中文字段   类型     来源
  --------------- ---------- -------- ------
  Product ID      商品编号   String   OMS
  Product Name    商品名称   String   OMS
  Brand ID        品牌编号   String   OMS
  Category ID     分类编号   String   OMS
  Product Type    商品类型   Enum     OMS
  Status          状态       Enum     OMS

------------------------------------------------------------------------

## 2.1.2 SKU（Stock Keeping Unit，库存单位）

SKU 是实际销售和库存管理单位。

字段：

  English Field   中文字段   类型     来源
  --------------- ---------- -------- ------
  SKU ID          商品编码   String   OMS
  Product ID      商品编号   String   OMS
  SKU Name        SKU名称    String   OMS
  Barcode         条形码     String   OMS
  UOM             计量单位   Enum     OMS

------------------------------------------------------------------------

# 2.2 商品成本模型 Product Cost Model

## 设计原则

Product 不直接保存最终成本。

原因：

-   采购价格变化
-   不同仓库成本不同
-   不同批次成本不同

成本应通过库存成本台账管理。

------------------------------------------------------------------------

# 2.3 Cost Method 成本计算方法

支持：

## Standard Cost 标准成本

固定成本。

## Average Cost 平均成本

公式：

Average Cost = (Current Inventory Value + New Receipt Value) / (Current
Quantity + New Receipt Quantity)

## FIFO 先进先出

按照库存进入顺序计算成本。

------------------------------------------------------------------------

# 2.4 Inventory Cost Ledger 库存成本台账

记录库存价值变化。

字段：

  English Field      中文字段       类型      说明
  ------------------ -------------- --------- ----------------
  Cost Ledger ID     成本台账编号   String    唯一编号
  SKU ID             商品编码       String    SKU
  Warehouse ID       仓库编号       String    库存地点
  Transaction Type   交易类型       Enum      收货/出库/调整
  Quantity           数量           Decimal   数量变化
  Unit Cost          单位成本       Decimal   单位成本
  Total Cost         总成本         Decimal   库存价值
  Transaction Date   交易日期       Date      发生时间

------------------------------------------------------------------------

## 库存成本生命周期

Purchase Receipt 收货：

采购入库

↓

Inventory Cost Update

库存成本更新

↓

Shipment 出库

↓

COGS Recognition

销售成本确认

------------------------------------------------------------------------

# 成本职责边界

  数据                          主要维护系统
  ----------------------------- -----------------------------
  销售价格 Selling Price        OMS
  商品成本 Product Cost         Inventory Cost Ledger / ERP
  库存数量 Inventory Quantity   WMS/OMS
  仓储费用 Warehouse Cost       WMS/3PL
  运输费用 Freight Cost         TMS/Carrier
  正式总账 General Ledger       NetSuite/QB/OMS GL

------------------------------------------------------------------------

# 后续章节继续更新本文件。
