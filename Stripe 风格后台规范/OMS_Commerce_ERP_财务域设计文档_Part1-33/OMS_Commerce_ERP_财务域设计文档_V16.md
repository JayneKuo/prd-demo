# OMS Commerce ERP 财务域设计文档

# Part 14：NetSuite Integration（NetSuite 集成设计）

## 14.1 设计目标 Business Purpose（业务目的）

NetSuite Integration（NetSuite集成设计）用于定义：

OMS Commerce ERP 与专业财务ERP之间的数据职责边界。

核心问题：

-   OMS是否作为财务主系统？
-   NetSuite是否作为财务系统？
-   哪些数据需要同步？
-   什么时间同步？
-   如何保证订单、收入、成本、总账一致？

核心原则：

> OMS负责商业运营和订单履约财务分析，NetSuite负责正式财务核算和总账管理。

------------------------------------------------------------------------

# 14.2 System Responsibility（系统职责边界）

## OMS Responsibility（OMS职责）

OMS负责：

  English Field          中文字段
  ---------------------- --------------
  Sales Order            销售订单
  Order Line             订单明细
  Fulfillment Status     履约状态
  Shipment Status        发货状态
  Customer Order Price   客户销售价格
  Promotion              促销
  Discount               优惠
  Order Profitability    订单利润分析

------------------------------------------------------------------------

## NetSuite Responsibility（NetSuite职责）

NetSuite负责：

  English Field         中文字段
  --------------------- --------------
  General Ledger        总账
  Chart of Accounts     会计科目
  Financial Period      财务期间
  Tax Accounting        税务核算
  Financial Statement   财务报表
  Audit Accounting      审计财务记录

------------------------------------------------------------------------

# 14.3 Integration Architecture（集成架构）

整体架构：

``` text
Sales Channel
Amazon / Shopify / EDI

        |

        v

OMS Commerce ERP

(Order + Fulfillment + Profitability)

        |

        v

Financial Integration Layer

(API / Event / Batch)

        |

        v

NetSuite

(GL + Accounting + Financial Reporting)
```

------------------------------------------------------------------------

# 14.4 Integration Pattern（集成模式）

## Real Time Sync（实时同步）

适用于：

-   Customer
-   Order
-   Payment Event

流程：

    OMS Event

    ↓

    API

    ↓

    NetSuite Record

------------------------------------------------------------------------

## Batch Sync（批量同步）

适用于：

-   Journal Entry
-   Settlement
-   Vendor Bill

例如：

每日：

    Daily Financial Closing

    ↓

    Generate Journal

    ↓

    Sync NetSuite

------------------------------------------------------------------------

# 14.5 Customer Mapping（客户映射）

## OMS Customer

字段：

  English Field      中文字段
  ------------------ ----------
  Customer ID        客户编号
  Customer Name      客户名称
  Billing Address    账单地址
  Shipping Address   收货地址
  Tax Profile        税务属性

------------------------------------------------------------------------

## NetSuite Customer

映射：

  OMS               NetSuite
  ----------------- ----------------------
  Customer ID       Customer Internal ID
  Customer Name     Customer Name
  Billing Address   Billing Address
  Tax Profile       Tax Code

------------------------------------------------------------------------

# 14.6 Sales Order Mapping（销售订单映射）

## OMS Sales Order

字段：

  English Field   中文字段
  --------------- ----------
  Order ID        订单编号
  Customer ID     客户编号
  Order Date      订单日期
  Currency        币种
  Total Amount    总金额

------------------------------------------------------------------------

## NetSuite Sales Order

映射：

  OMS          NetSuite
  ------------ -------------
  Order ID     External ID
  Customer     Customer
  Order Line   Item Line
  Currency     Currency

------------------------------------------------------------------------

# 14.7 Invoice Mapping（发票映射）

OMS：

Invoice（客户发票）

同步：

NetSuite Invoice

映射：

  OMS              NetSuite
  ---------------- -------------
  Invoice Number   External ID
  Customer         Customer
  Invoice Line     Item Line
  Tax Amount       Tax

------------------------------------------------------------------------

# 14.8 Payment Mapping（支付映射）

OMS Payment：

同步：

Customer Payment

字段：

  English Field    中文字段
  ---------------- ----------
  Payment ID       支付编号
  Payment Amount   支付金额
  Payment Date     支付日期
  Payment Method   支付方式

------------------------------------------------------------------------

映射：

  OMS          NetSuite
  ------------ ----------------
  Payment ID   External ID
  Customer     Customer
  Amount       Payment Amount

------------------------------------------------------------------------

# 14.9 Vendor Bill Mapping（供应商账单映射）

来源：

-   Warehouse
-   Carrier
-   Supplier

OMS：

Vendor Bill

NetSuite：

Vendor Bill

映射：

  OMS              NetSuite
  ---------------- ------------------
  Vendor ID        Vendor
  Invoice Number   Vendor Reference
  Amount           Amount
  Expense Type     Expense Account

------------------------------------------------------------------------

# 14.10 Journal Entry Mapping（会计分录映射）

OMS Financial Event：

↓

Accounting Rule：

↓

Journal Entry

同步：

NetSuite Journal Entry

字段：

  English Field   中文字段
  --------------- ----------
  Journal ID      分录编号
  Posting Date    入账日期
  Account         会计科目
  Debit Amount    借方金额
  Credit Amount   贷方金额

------------------------------------------------------------------------

# 14.11 Data Ownership（数据所有权）

推荐设计：

  数据                  OMS         NetSuite
  --------------------- ----------- -----------
  Order                 Master      Sync
  Customer              Master      Sync
  Product               Master      Sync
  Inventory Operation   Master      Reference
  Revenue Event         Master      Sync
  Journal Entry         Generate    Master
  GL                    Reference   Master

------------------------------------------------------------------------

# 14.12 Sync Error Handling（同步异常处理）

必须支持：

## Sync Status（同步状态）

  English Status   中文状态
  ---------------- ----------
  Pending          待同步
  Processing       同步中
  Success          成功
  Failed           失败
  Retry            重试

------------------------------------------------------------------------

## Integration Log（集成日志）

字段：

  English Field      中文字段
  ------------------ ----------
  Integration ID     集成编号
  Source Object      来源对象
  Target Object      目标对象
  Request Payload    请求数据
  Response Message   返回信息
  Status             状态

------------------------------------------------------------------------

# 14.13 OMS + NetSuite 最终模式

推荐：

``` text
Customer / Channel

        |

        v

OMS

(Order Management)

        |

        v

Financial Event

        |

        v

Accounting Engine

        |

        v

NetSuite

(GL & Financial Reporting)
```

------------------------------------------------------------------------

# Part 14 总结

核心结论：

1.  OMS不应该替代完整财务ERP。
2.  OMS负责订单、履约、利润分析。
3.  NetSuite负责正式会计账。
4.  Financial Event是两个系统之间的桥梁。
5.  Journal Entry是最终财务同步对象。
6.  必须设计同步状态和异常重试机制。

------------------------------------------------------------------------

# 下一章节

# Part 15：QuickBooks Integration（QuickBooks集成设计）

将设计：

-   QuickBooks Online架构
-   Customer Mapping
-   Invoice Mapping
-   Payment Mapping
-   Expense Mapping
-   Bill Mapping
-   Journal Entry Mapping
-   OMS轻ERP模式下QuickBooks职责
