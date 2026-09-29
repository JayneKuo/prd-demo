# OMS Commerce ERP 财务域设计文档

# Part 34：OMS Finance Advanced Design（高级财务引擎设计）

## 34.1 设计目标 Advanced Finance Objective（高级财务能力目标）

前面的设计解决：

-   订单收入
-   成本追踪
-   利润分析
-   基础会计集成

本章节进一步设计企业级财务能力：

-   Revenue Recognition Engine（收入确认引擎）
-   Cost Allocation Engine（成本分摊引擎）
-   Tax Engine（税务引擎）
-   Settlement Engine（结算引擎）
-   Financial Rule Engine（财务规则引擎）

目标：

> 将OMS从运营财务平台升级为具备ERP财务能力的Commerce Finance Platform。

------------------------------------------------------------------------

# 34.2 Financial Rule Engine（财务规则引擎）

## 设计目标

不同客户、不同行业、不同国家存在不同财务规则。

因此不能硬编码。

需要：

    Business Event

    ↓

    Financial Rule Engine

    ↓

    Financial Result

    ↓

    Accounting Entry

------------------------------------------------------------------------

# 34.3 Rule Model（规则模型）

## Financial Rule（财务规则）

字段：

  English Field    中文字段
  ---------------- ----------
  Rule ID          规则编号
  Rule Name        规则名称
  Event Type       事件类型
  Condition        条件
  Action           执行动作
  Effective Date   生效日期
  Status           状态

------------------------------------------------------------------------

## 示例：收入确认规则

条件：

    IF

    Order Status = Delivered

    AND

    Payment Status = Captured

动作：

    Create Revenue Event

------------------------------------------------------------------------

# 34.4 Revenue Recognition Engine（收入确认引擎）

## 设计目标

解决：

什么时候确认收入？

------------------------------------------------------------------------

支持模式：

## Payment Based（付款确认）

规则：

支付成功即确认收入。

适合：

即时消费业务。

------------------------------------------------------------------------

## Shipment Based（发货确认）

规则：

商品发出确认收入。

适合：

部分电商模式。

------------------------------------------------------------------------

## Delivery Based（签收确认）

规则：

客户签收后确认收入。

适合：

严格收入确认企业。

------------------------------------------------------------------------

# 34.5 Revenue Rule Example（收入规则案例）

订单：

    Order Amount = 100 USD

状态：

    Payment Captured

    Shipment Completed

    Delivery Completed

规则：

Delivery Based

生成：

    Revenue Event

    Amount = 100 USD

    Recognition Date = Delivery Date

------------------------------------------------------------------------

# 34.6 Cost Allocation Engine（成本分摊引擎）

## 设计目标

一个订单可能产生：

-   仓储费用
-   运输费用
-   平台费用
-   操作费用

需要合理分摊。

------------------------------------------------------------------------

# 34.7 Cost Allocation Rule（成本分摊规则）

支持：

## Order Based（订单分摊）

全部费用归属于订单。

公式：

    Order Cost

    =

    Invoice Amount

------------------------------------------------------------------------

## Weight Based（重量分摊）

公式：

    Allocated Cost

    =

    Total Cost

    ×

    Item Weight

    /

    Total Weight

------------------------------------------------------------------------

## Volume Based（体积分摊）

公式：

    Allocated Cost

    =

    Total Cost

    ×

    Item Volume

    /

    Total Volume

------------------------------------------------------------------------

## Quantity Based（数量分摊）

公式：

    Allocated Cost

    =

    Total Cost

    ×

    Item Qty

    /

    Total Qty

------------------------------------------------------------------------

# 34.8 Warehouse Cost Allocation（仓储费用分摊）

例如：

3PL月账单：

    Warehouse Invoice

    =

    10000 USD

包含：

-   Storage
-   Pick
-   Pack
-   Handling

分摊：

    Warehouse Invoice

    ↓

    Fulfillment Orders

    ↓

    Order Profitability

------------------------------------------------------------------------

# 34.9 Tax Engine Design（税务引擎）

## 设计目标

支持：

-   不同国家
-   不同州
-   不同税率
-   税务豁免

------------------------------------------------------------------------

# Tax Calculation Model（税计算模型）

公式：

    Tax Amount

    =

    Taxable Amount

    ×

    Tax Rate

------------------------------------------------------------------------

# Tax Rule

字段：

  English Field      中文字段
  ------------------ ----------
  Tax Jurisdiction   税务区域
  Tax Rate           税率
  Tax Type           税类型
  Exemption Rule     豁免规则

------------------------------------------------------------------------

# 34.10 Settlement Engine（结算引擎）

## 设计目标

管理：

-   Payment Gateway Settlement
-   Marketplace Settlement
-   Carrier Settlement

------------------------------------------------------------------------

流程：

    Payment Transaction

    ↓

    Settlement File

    ↓

    Reconciliation

    ↓

    Accounting Entry

------------------------------------------------------------------------

# 34.11 Marketplace Settlement Example（平台结算案例）

Amazon结算：

收入：

    Sales Amount

    1000 USD

费用：

    Marketplace Fee

    150 USD

物流：

    FBA Fee

    100 USD

实际到账：

    Settlement

    =

    1000-150-100

    =

    750 USD

------------------------------------------------------------------------

# 34.12 Financial Event Processing（财务事件处理）

完整链路：

    Business Event

    ↓

    Financial Event

    ↓

    Rule Engine

    ↓

    Financial Transaction

    ↓

    Accounting Entry

    ↓

    ERP Sync

------------------------------------------------------------------------

# 34.13 Advanced Accounting Mapping（高级会计映射）

支持：

不同企业不同科目。

例如：

OMS：

    Product Revenue

映射：

Company A:

    4000 Sales Revenue

Company B:

    4100 Online Sales

------------------------------------------------------------------------

# 34.14 Final Advanced Finance Architecture（高级财务架构）

    Business Transaction

            |

            v

    Financial Event Platform

            |

            v

    Financial Rule Engine

            |

            +----------------+

            | Revenue Engine |

            | Cost Engine   |

            | Tax Engine    |

            | Settlement    |

            +----------------+

            |

            v

    Accounting Engine

            |

            v

    ERP System

------------------------------------------------------------------------

# 34.15 本章节总结

通过高级财务引擎设计，OMS Finance具备：

## Revenue Capability（收入能力）

-   多模式收入确认
-   收入调整
-   收入追踪

## Cost Capability（成本能力）

-   成本采集
-   成本分摊
-   毛利分析

## Tax Capability（税务能力）

-   税率管理
-   税务规则
-   税务计算

## Settlement Capability（结算能力）

-   平台结算
-   支付对账
-   财务入账

------------------------------------------------------------------------

# 下一章节

# Part 35：OMS Finance Detailed Accounting Rules（详细会计规则设计）

下一部分设计：

-   Order Created 会计影响
-   Payment Captured 会计影响
-   Shipment 会计影响
-   Delivery Revenue Recognition
-   Return / Refund 会计影响
-   Inventory Adjustment 会计影响
-   Full Journal Entry Mapping
