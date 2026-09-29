# OMS Commerce ERP 财务域设计文档

## 文档说明 Document Information（文档信息）

  ------------------------------------------------------------------------------------------------------------------
  English Field 英文字段  中文字段                说明
  ----------------------- ----------------------- ------------------------------------------------------------------
  Document Name           文档名称                OMS Commerce ERP Finance Design
                                                  Document（OMS商业ERP财务域设计文档）

  Version                 版本                    V1.0

  Purpose                 目标                    设计具备轻量ERP能力，并支持NetSuite、QuickBooks集成的OMS财务体系
  ------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 目录 Table of Contents（目录）

1.  Overall Architecture（整体架构与领域边界）
2.  Master Data Design（基础数据模型设计）
3.  Order Financial Model（订单财务模型）
4.  Pricing Promotion Tax Model（定价优惠税费模型）
5.  Payment Settlement Model（支付结算模型）
6.  Inventory Cost Model（库存成本模型）
7.  Fulfillment Cost Model（履约成本模型）
8.  Revenue Recognition Model（收入确认模型）
9.  Invoice AR AP Model（发票应收应付模型）
10. Return Reverse Logistics Model（退货逆向物流模型）
11. Financial Event Model（财务事件模型）
12. Accounting Model（会计模型）
13. Profitability Analysis（利润分析）
14. NetSuite Integration（NetSuite集成）
15. QuickBooks Integration（QuickBooks集成）

------------------------------------------------------------------------

# Part 1：Overall Architecture & Domain Boundary Design（整体架构与领域边界设计）

## 1.1 Product Positioning（产品定位）

系统定位：

**OMS + Commerce ERP（订单管理系统 + 商业轻量ERP）**

OMS不仅管理：

  English Term               中文名称   说明
  -------------------------- ---------- ----------------------------
  Order Management           订单管理   管理客户订单生命周期
  Inventory Management       库存管理   管理库存数量和库存状态
  Fulfillment Management     履约管理   管理分仓、拣货、发货
  Billing                    计费管理   管理订单费用和账单
  Accounts Receivable (AR)   应收账款   管理客户欠款和收款
  Accounts Payable (AP)      应付账款   管理供应商、仓库、运输费用
  Cost Accounting            成本核算   分析商品、履约、运输成本
  Financial Event            财务事件   将业务动作转换为财务影响

------------------------------------------------------------------------

# 1.2 Financial Architecture（财务架构）

系统采用三层模型：

## Layer 1: Business Transaction Layer（业务交易层）

定义：

记录业务发生。

例如：

  English               中文
  --------------------- ----------
  Sales Order           销售订单
  Shipment              发货单
  Return Order          退货单
  Payment Transaction   支付交易

------------------------------------------------------------------------

## Layer 2: Financial Event Layer（财务事件层）

定义：

业务动作产生财务影响。

例如：

  English                     中文           说明
  --------------------------- -------------- --------------
  Revenue Recognition Event   收入确认事件   确认销售收入
  Cost Recognition Event      成本确认事件   确认销售成本
  Freight Cost Event          运输费用事件   记录运输成本
  Warehouse Cost Event        仓储费用事件   记录仓储费用

------------------------------------------------------------------------

## Layer 3: Accounting Layer（会计层）

定义：

生成会计分录。

字段：

  English                   中文
  ------------------------- ------------
  Accounting Entry          会计分录
  Journal Entry             日记账
  General Ledger (GL)       总账
  Chart of Accounts (COA)   会计科目表

------------------------------------------------------------------------

# 1.3 System Responsibility Boundary（系统职责边界）

## OMS（Order Management System，订单管理系统）

负责：

  English               中文
  --------------------- --------------
  Sales Order           销售订单
  Order Line            订单明细
  Pricing               定价
  Promotion Discount    促销折扣
  Tax Result            税费结果
  Fulfillment Order     履约单
  Order Profitability   订单利润分析

------------------------------------------------------------------------

## WMS（Warehouse Management System，仓库管理系统）

负责：

  English            中文
  ------------------ ----------
  Receiving          收货
  Putaway            上架
  Picking            拣货
  Packing            包装
  Shipping           出库
  Return Receiving   退货收货

产生：

  English                 中文
  ----------------------- --------------
  Inventory Transaction   库存交易
  Warehouse Service Fee   仓储服务费用

------------------------------------------------------------------------

## TMS（Transportation Management System，运输管理系统）

负责：

  English               中文
  --------------------- ------------
  Carrier               承运商
  Transportation Rate   运输费率
  Shipment Tracking     运输跟踪
  Freight Cost          运输成本
  Fuel Surcharge        燃油附加费
  Accessorial Fee       附加费用

------------------------------------------------------------------------

## Payment System（支付系统）

负责：

  English         中文
  --------------- ------------
  Authorization   支付授权
  Capture         扣款确认
  Settlement      资金结算
  Payout          资金提现
  Payment Fee     支付手续费
  Chargeback      拒付

------------------------------------------------------------------------

## External ERP（外部财务系统）

例如：

-   NetSuite（网飞财务ERP）
-   QuickBooks（小企业财务系统）

负责：

  English                 中文
  ----------------------- ----------
  General Ledger          总账
  Financial Statement     财务报表
  Accounting Compliance   会计合规

------------------------------------------------------------------------

# 1.4 Core Domain Model（核心领域模型）

``` text
Customer（客户）

        |

Sales Order（销售订单）

        |

Order Line（订单明细）

        |

Fulfillment Order（履约单）

        |

Shipment（发货单）

        |

Delivery（签收）


Financial Event（财务事件）

        |

Accounting Entry（会计分录）

        |

GL Account（总账科目）
```

------------------------------------------------------------------------

# 1.5 Order To Cash Process（订单到现金流程）

``` text
Customer（客户）

↓

Place Order（创建订单）

↓

Sales Order（销售订单）

↓

Pricing Calculation（价格计算）

↓

Discount Calculation（优惠计算）

↓

Tax Calculation（税费计算）

↓

Payment Capture（支付扣款）

↓

Inventory Allocation（库存分配）

↓

Warehouse Fulfillment（仓库履约）

↓

Shipment Delivery（运输签收）

↓

Revenue Recognition（收入确认）

↓

Accounting Posting（会计入账）

↓

NetSuite / QuickBooks
```

------------------------------------------------------------------------

# 字段命名规范 Field Naming Convention（字段命名规范）

所有系统字段必须包含：

  English Field   中文字段   示例
  --------------- ---------- ----------
  Order ID        订单编号   SO10001
  Customer ID     客户编号   C10001
  SKU ID          商品编码   SKU-A001
  Warehouse ID    仓库编号   WH001
  Currency Code   币种代码   USD
  Amount          金额       100.00
  Quantity        数量       10
  Unit Cost       单位成本   30.00
  Total Cost      总成本     300.00

------------------------------------------------------------------------

后续章节继续扩展。
