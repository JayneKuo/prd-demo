# OMS Commerce ERP 财务域设计文档

## 版本信息 Version Information

  English Field   中文字段   Value
  --------------- ---------- ---------------------------------------------------
  Document Name   文档名称   OMS Commerce ERP 财务域设计文档
  Version         版本       V1.2
  Purpose         目标       设计OMS轻量ERP财务域及NetSuite/QuickBooks集成模型

------------------------------------------------------------------------

# Part 2：基础数据模型设计 Master Data Design（续）

# 2.5 Inventory Cost Ledger（库存成本台账）

## 2.5.1 设计目的 Business Purpose

Inventory Cost Ledger（库存成本台账）用于记录：

-   商品库存数量变化
-   库存价值变化
-   商品成本变化
-   销售出库成本
-   退货成本恢复

它是：

-   Inventory Valuation（库存估值）
-   COGS（销售成本）
-   Profitability Analysis（利润分析）

的基础。

------------------------------------------------------------------------

# 2.5.2 为什么需要独立成本台账

错误设计：

Product（商品）

↓

Cost（成本）

原因：

1.  商品采购价格会变化

例如：

第一次采购：

100件 × \$30

第二次采购：

200件 × \$40

SKU成本已经变化。

------------------------------------------------------------------------

2.  不同仓库可能不同成本

例如：

  Warehouse   中文     Unit Cost
  ----------- -------- -----------
  WH-US       美国仓   \$30
  WH-EU       欧洲仓   \$32

------------------------------------------------------------------------

3.  历史订单必须保持原始成本

订单创建时：

SKU-A成本：

\$30

未来采购：

\$40

历史订单利润不能变化。

因此：

Order Line 必须保存：

Cost Snapshot（成本快照）

------------------------------------------------------------------------

# 2.5.3 Inventory Cost Ledger 数据模型

  English Field      中文字段       Data Type   说明
  ------------------ -------------- ----------- ---------------------
  Cost Ledger ID     成本台账编号   String      唯一编号
  SKU ID             商品编码       String      对应SKU
  Warehouse ID       仓库编号       String      库存地点
  Transaction ID     业务交易编号   String      关联业务单据
  Transaction Type   交易类型       Enum        收货/出库/调整/退货
  Quantity Before    交易前数量     Decimal     交易前库存
  Quantity Change    数量变化       Decimal     增加或减少
  Quantity After     交易后数量     Decimal     交易后库存
  Unit Cost          单位成本       Decimal     当前成本
  Total Cost         总库存价值     Decimal     库存价值
  Transaction Date   交易日期       DateTime    发生时间

------------------------------------------------------------------------

# 2.5.4 库存成本变化流程

## Purchase Receipt（采购收货）

业务：

供应商送货。

例如：

采购：

100个SKU-A

采购价：

\$30

计算：

Inventory Value Increase

库存价值增加：

    Quantity × Unit Cost

    100 × 30

    =3000

------------------------------------------------------------------------

## Sales Shipment（销售出库）

客户购买：

10个SKU-A

平均成本：

\$30

产生：

    COGS

    =
    Quantity × Unit Cost

    =
    10 × 30

    =
    300

库存：

    Inventory Quantity -10

    Inventory Value -300

------------------------------------------------------------------------

# 2.6 Cost Snapshot（成本快照）

## 设计目的

保存订单发生时的真实成本。

------------------------------------------------------------------------

## Order Line Cost Snapshot

  English Field         中文字段       说明
  --------------------- -------------- --------------
  Order Line ID         订单明细编号   关联订单行
  SKU ID                商品编码       商品
  Selling Price         销售价格       客户购买价格
  Unit Cost Snapshot    单位成本快照   下单时成本
  Total Cost Snapshot   总成本快照     数量×成本
  Cost Source           成本来源       OMS/WMS/ERP

------------------------------------------------------------------------

计算：

    Total Cost Snapshot

    =
    Quantity × Unit Cost Snapshot

------------------------------------------------------------------------

# 2.7 Inventory Cost 与外部ERP关系

## 模式1：OMS作为成本中心

适合：

-   小型企业
-   无专业ERP客户

结构：

    Purchase

    ↓

    OMS Inventory Cost Ledger

    ↓

    COGS

    ↓

    Financial Report

------------------------------------------------------------------------

## 模式2：NetSuite作为成本中心

适合：

-   中大型企业

结构：

    NetSuite Inventory Cost

    ↓

    Sync To OMS

    ↓

    Order Profitability

------------------------------------------------------------------------

## 推荐模式：混合模式

    Procurement / ERP

            |

    Inventory Cost Ledger

            |

    OMS Finance

            |

    NetSuite / QuickBooks

原则：

  数据                          维护系统
  ----------------------------- -----------------
  销售价格 Selling Price        OMS
  促销价格 Promotion Price      OMS
  库存数量 Inventory Quantity   WMS/OMS
  库存成本 Inventory Cost       Cost Ledger/ERP
  正式会计 General Ledger       ERP

------------------------------------------------------------------------

# Part 2 小结

核心结论：

1.  Product Master 不保存唯一成本。
2.  SKU 是库存和成本计算单位。
3.  Inventory Cost Ledger 是成本事实来源。
4.  Order 必须保存 Cost Snapshot。
5.  成本模型支持 Standard Cost、Average Cost、FIFO。
6.  OMS可以提供运营利润分析，同时支持连接专业ERP。

------------------------------------------------------------------------

# 下一章节

# Part 3：Order Financial Model（订单财务模型）

将设计：

-   Sales Order（销售订单）
-   Order Line（订单明细）
-   GMV（商品总额）
-   Discount Amount（优惠金额）
-   Net Sales Amount（净销售额）
-   Shipping Revenue（运费收入）
-   Tax Amount（税费金额）
-   Grand Total（订单总金额）

并建立完整金额计算链：

    Gross Merchandise Value
            ↓
    Discount
            ↓
    Net Sales
            ↓
    Shipping
            ↓
    Tax
            ↓
    Customer Payment
