# OMS Commerce ERP 财务域设计文档

# Part 15：QuickBooks Integration（QuickBooks 集成设计）

## 15.1 设计目标 Business Purpose（业务目的）

QuickBooks Integration（QuickBooks 集成设计）用于定义：

OMS Commerce ERP 如何与中小企业常用财务系统 QuickBooks Online 集成。

适用场景：

-   小型企业
-   跨境电商企业
-   3PL服务商
-   多渠道销售企业

核心原则：

> OMS负责订单、履约、库存、利润分析；QuickBooks负责基础财务记账和财务报表。

------------------------------------------------------------------------

# 15.2 OMS 与 QuickBooks 职责边界

## OMS Responsibility（OMS职责）

OMS负责：

  English Field         中文字段
  --------------------- ----------
  Sales Order           销售订单
  Order Line            订单明细
  Product SKU           商品SKU
  Fulfillment           履约
  Shipment              发货
  Inventory Cost        库存成本
  Order Profitability   订单利润

------------------------------------------------------------------------

## QuickBooks Responsibility（QuickBooks职责）

QuickBooks负责：

  English Field       中文字段
  ------------------- ------------
  Chart of Accounts   会计科目
  Invoice             发票
  Payment             收款
  Bill                供应商账单
  Expense             费用
  Financial Report    财务报表

------------------------------------------------------------------------

# 15.3 Integration Architecture（集成架构）

``` text
Sales Channel

Amazon / Shopify / EDI

        |

        v

OMS Commerce ERP

        |

        v

Financial Integration Layer

        |

        v

QuickBooks Online

(Accounting)
```

------------------------------------------------------------------------

# 15.4 Customer Mapping（客户映射）

## OMS Customer

  English Field      中文字段
  ------------------ ----------
  Customer ID        客户编号
  Customer Name      客户名称
  Email              邮箱
  Billing Address    账单地址
  Shipping Address   收货地址

------------------------------------------------------------------------

## QuickBooks Customer

映射：

  OMS               QuickBooks
  ----------------- -----------------
  Customer ID       Customer ID
  Customer Name     Display Name
  Billing Address   Billing Address
  Email             Email

------------------------------------------------------------------------

# 15.5 Invoice Mapping（发票映射）

OMS Invoice：

同步：

QuickBooks Invoice

字段：

  English Field   中文字段
  --------------- ----------
  Invoice ID      发票编号
  Customer ID     客户编号
  Invoice Date    发票日期
  Due Date        到期日期
  Total Amount    总金额

------------------------------------------------------------------------

映射：

  OMS            QuickBooks
  -------------- --------------
  Customer       Customer
  Product Line   Sales Item
  Tax            Tax Code
  Total Amount   Total Amount

------------------------------------------------------------------------

# 15.6 Payment Mapping（收款映射）

OMS Payment：

同步：

QuickBooks Receive Payment

字段：

  English Field    中文字段
  ---------------- ----------
  Payment ID       支付编号
  Payment Method   支付方式
  Payment Amount   支付金额
  Payment Date     支付日期

------------------------------------------------------------------------

流程：

``` text
Customer Payment

↓

OMS Payment Event

↓

QuickBooks Receive Payment

↓

AR Closed
```

------------------------------------------------------------------------

# 15.7 Vendor Bill Mapping（供应商账单）

来源：

-   Warehouse
-   Carrier
-   Supplier

OMS Vendor Bill：

同步：

QuickBooks Bill

字段：

  English Field     中文字段
  ----------------- ------------
  Vendor ID         供应商编号
  Bill Number       账单号码
  Bill Date         账单日期
  Amount            金额
  Expense Account   费用科目

------------------------------------------------------------------------

# 15.8 Expense Mapping（费用映射）

例如：

支付手续费：

OMS：

Payment Fee

QuickBooks：

Expense

会计：

    Debit:

    Payment Expense


    Credit:

    Cash / Payable

------------------------------------------------------------------------

# 15.9 Journal Entry Mapping（会计分录映射）

OMS：

Financial Event

↓

Accounting Rule

↓

Journal Entry

同步：

QuickBooks Journal Entry

字段：

  English Field   中文字段
  --------------- ----------
  Journal ID      分录编号
  Posting Date    入账日期
  Account         科目
  Debit           借方
  Credit          贷方

------------------------------------------------------------------------

# 15.10 QuickBooks Sync Strategy（同步策略）

## Real Time Sync（实时同步）

适用于：

-   Customer
-   Invoice
-   Payment

------------------------------------------------------------------------

## Daily Batch Sync（每日批量同步）

适用于：

-   Journal Entry
-   Settlement
-   Expense

------------------------------------------------------------------------

# 15.11 Sync Error Management（同步异常管理）

## Integration Queue（集成队列）

字段：

  English Field   中文字段
  --------------- ----------
  Queue ID        队列编号
  Object Type     对象类型
  Object ID       对象编号
  Retry Count     重试次数
  Error Message   错误信息

------------------------------------------------------------------------

# 15.12 OMS + QuickBooks模式

推荐架构：

``` text
Marketplace

Amazon / Shopify

        |

        v

OMS

Order + Inventory + Fulfillment

        |

        v

Financial Event

        |

        v

QuickBooks

Accounting + Reporting
```

------------------------------------------------------------------------

# 15.13 NetSuite 与 QuickBooks模式区别

  项目       NetSuite     QuickBooks
  ---------- ------------ ------------
  企业规模   中大型企业   中小企业
  GL能力     强           基础
  ERP能力    完整ERP      财务系统
  库存管理   强           较弱
  多实体     支持         有限

------------------------------------------------------------------------

# Part 15 总结

核心结论：

1.  OMS可以同时支持NetSuite和QuickBooks。
2.  OMS保存业务事实和利润分析。
3.  QuickBooks负责基础财务记账。
4.  Financial Event是集成核心。
5.  不同规模客户可以选择不同财务后端。

------------------------------------------------------------------------

# 下一章节

# Part 16：Financial Reporting Model（财务报表模型）

将设计：

-   Revenue Report（收入报表）
-   COGS Report（销售成本报表）
-   Gross Margin Report（毛利报表）
-   Order Profit Report（订单利润报表）
-   Inventory Valuation Report（库存估值报表）
-   AR Aging Report（应收账龄报表）
-   AP Aging Report（应付账龄报表）
