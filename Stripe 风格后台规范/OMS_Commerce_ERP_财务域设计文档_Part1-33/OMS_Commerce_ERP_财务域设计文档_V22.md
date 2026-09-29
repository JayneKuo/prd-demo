# OMS Commerce ERP 财务域设计文档

# Part 20：OMS Finance Database Design（数据库设计）

## 20.1 设计目标 Database Design Objective（数据库设计目标）

本章节将 OMS Finance 从产品模型转换为技术数据模型。

目标：

建立支持：

-   Order Financial Analysis（订单财务分析）
-   Revenue Recognition（收入确认）
-   Cost Tracking（成本追踪）
-   Profitability Calculation（利润计算）
-   Accounting Integration（会计集成）

的数据结构。

核心原则：

> 业务数据、财务事件、会计数据必须分离，通过关联关系形成完整财务链路。

------------------------------------------------------------------------

# 20.2 Database Architecture（数据库架构）

整体分层：

    Business Data Layer（业务数据层）

    Customer
    Order
    Shipment
    Return


            ↓


    Financial Data Layer（财务数据层）

    Revenue Event
    Cost Ledger
    Payment Transaction
    Profitability


            ↓


    Accounting Data Layer（会计数据层）

    Account
    Journal Entry
    General Ledger


            ↓


    Reporting Layer（报表层）

    Financial Report
    Dashboard

------------------------------------------------------------------------

# 20.3 Customer Financial Tables（客户财务表）

## customer_master（客户主表）

  Field            中文字段   类型
  ---------------- ---------- ----------
  customer_id      客户编号   PK
  customer_name    客户名称   varchar
  customer_type    客户类型   varchar
  tax_profile_id   税务属性   FK
  currency_code    币种       varchar
  created_date     创建时间   datetime

------------------------------------------------------------------------

# 20.4 Order Financial Tables（订单财务表）

## sales_order_financial（销售订单财务表）

  Field             中文字段     类型
  ----------------- ------------ ----------
  order_id          订单编号     PK
  customer_id       客户编号     FK
  order_date        订单日期     datetime
  currency_code     币种         varchar
  gross_amount      原始金额     decimal
  discount_amount   优惠金额     decimal
  tax_amount        税费金额     decimal
  total_amount      订单总金额   decimal

------------------------------------------------------------------------

# 20.5 Revenue Tables（收入表）

## revenue_event（收入事件表）

核心表。

  Field              中文字段       类型
  ------------------ -------------- ----------
  revenue_event_id   收入事件编号   PK
  order_id           订单编号       FK
  shipment_id        发货编号       FK
  revenue_type       收入类型       enum
  amount             收入金额       decimal
  recognition_date   确认日期       datetime
  status             状态           enum

------------------------------------------------------------------------

Revenue Type：

  English            中文
  ------------------ ----------
  Product Revenue    商品收入
  Shipping Revenue   运费收入
  Service Revenue    服务收入

------------------------------------------------------------------------

# 20.6 Cost Ledger（成本台账）

## cost_ledger（成本台账表）

记录所有成本。

字段：

  Field              中文字段
  ------------------ ----------
  cost_id            成本编号
  order_id           订单编号
  sku_id             商品编码
  cost_type          成本类型
  source_system      来源系统
  amount             金额
  transaction_date   交易日期

------------------------------------------------------------------------

Cost Type：

  English          中文
  ---------------- ------------
  Product Cost     商品成本
  Warehouse Cost   仓储成本
  Freight Cost     运输成本
  Payment Fee      支付手续费

------------------------------------------------------------------------

# 20.7 Payment Tables（支付表）

## payment_transaction（支付交易表）

  Field               中文字段
  ------------------- ----------
  payment_id          支付编号
  order_id            订单编号
  payment_provider    支付渠道
  payment_method      支付方式
  amount              支付金额
  fee_amount          手续费
  settlement_amount   结算金额
  payment_status      支付状态

------------------------------------------------------------------------

# 20.8 Profitability Tables（利润分析表）

## order_profitability（订单利润表）

用于快速查询订单利润。

  Field               中文字段
  ------------------- ----------
  profitability_id    利润编号
  order_id            订单编号
  revenue_amount      收入金额
  product_cost        商品成本
  fulfillment_cost    履约成本
  freight_cost        运输成本
  payment_fee         支付费用
  profit_amount       利润金额
  margin_percentage   利润率

------------------------------------------------------------------------

计算：

    Profit

    =

    Revenue

    -

    Product Cost

    -

    Fulfillment Cost

    -

    Freight Cost

    -

    Payment Fee

------------------------------------------------------------------------

# 20.9 Accounting Tables（会计表）

## account（会计科目表）

  Field               中文字段
  ------------------- ----------
  account_id          科目编号
  account_name        科目名称
  account_type        科目类型
  parent_account_id   父级科目

------------------------------------------------------------------------

## journal_entry（会计分录头表）

  Field             中文字段
  ----------------- ----------
  journal_id        分录编号
  posting_date      入账日期
  source_event_id   来源事件
  status            状态

------------------------------------------------------------------------

## journal_entry_line（会计分录明细）

  Field           中文字段
  --------------- ----------
  line_id         行编号
  journal_id      分录编号
  account_id      科目编号
  debit_amount    借方金额
  credit_amount   贷方金额

------------------------------------------------------------------------

# 20.10 Entity Relationship（实体关系）

整体关系：

    Customer

        |

    Sales Order

        |

    Order Line

        |

    Revenue Event

        |

    Cost Ledger

        |

    Order Profitability

        |

    Financial Event

        |

    Journal Entry

        |

    General Ledger

------------------------------------------------------------------------

# 20.11 Data Traceability（数据追踪）

每个财务数字必须能够追溯：

例如利润：

    Order Profit

    ↓

    Revenue Event

    ↓

    Sales Order

    ↓

    Customer Order

成本：

    Product Cost

    ↓

    Inventory Transaction

    ↓

    SKU Cost

运输：

    Freight Cost

    ↓

    Shipment

    ↓

    Carrier Invoice

------------------------------------------------------------------------

# 20.12 Database Design Summary（数据库设计总结）

核心表：

  Domain       Table
  ------------ -----------------------
  Customer     customer_master
  Order        sales_order_financial
  Revenue      revenue_event
  Cost         cost_ledger
  Payment      payment_transaction
  Profit       order_profitability
  Accounting   journal_entry
  Accounting   journal_entry_line
  GL           general_ledger

------------------------------------------------------------------------

# 下一章节

# Part 21：OMS Finance API Design（接口设计）

下一部分设计：

-   REST API
-   Financial Event API
-   Revenue API
-   Cost API
-   Profitability API
-   Accounting Integration API
-   NetSuite / QuickBooks Sync API
