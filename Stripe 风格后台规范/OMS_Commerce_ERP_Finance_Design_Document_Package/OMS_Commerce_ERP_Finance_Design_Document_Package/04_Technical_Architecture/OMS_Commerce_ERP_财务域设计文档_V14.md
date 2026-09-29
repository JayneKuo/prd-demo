# OMS Commerce ERP 财务域设计文档

# Part 12：Accounting Model（会计模型）

## 12.1 设计目标 Business Purpose（业务目的）

Accounting Model（会计模型）用于定义 OMS Commerce ERP 如何完成：

-   会计科目管理
-   会计分录生成
-   总账管理
-   财务期间管理
-   财务报表生成
-   外部ERP同步

核心原则：

> OMS可以提供运营财务能力，但正式会计核算必须遵循复式记账原则（Double
> Entry Accounting）。

------------------------------------------------------------------------

# 12.2 Double Entry Accounting（复式记账）

每一笔财务交易必须满足：

    Total Debit Amount

    =

    Total Credit Amount

即：

借方金额总计 = 贷方金额总计。

------------------------------------------------------------------------

# 12.3 Chart of Accounts（COA，会计科目表）

## 定义

Chart of Accounts（会计科目表）：

企业用于分类记录财务交易的账户集合。

## Account 数据模型

  English Field       中文字段       类型      说明
  ------------------- -------------- --------- -------------------------
  Account ID          科目编号       String    唯一编号
  Account Name        科目名称       String    科目名称
  Account Type        科目类型       Enum      Asset/Liability/Revenue
  Parent Account ID   父级科目编号   String    科目层级
  Active Status       是否启用       Boolean   状态

------------------------------------------------------------------------

# 12.4 Account Type（科目类型）

## Asset（资产）

企业拥有的资源。

  English Account       中文科目
  --------------------- ----------
  Cash                  现金
  Accounts Receivable   应收账款
  Inventory Asset       库存资产

------------------------------------------------------------------------

## Liability（负债）

企业需要承担的义务。

  English Account    中文科目
  ------------------ ------------
  Accounts Payable   应付账款
  Tax Payable        应交税费
  Customer Deposit   客户预收款

------------------------------------------------------------------------

## Equity（权益）

企业所有者权益。

  English Account     中文科目
  ------------------- ------------
  Owner Equity        所有者权益
  Retained Earnings   留存收益

------------------------------------------------------------------------

## Revenue（收入）

企业经营产生的收入。

  English Account    中文科目
  ------------------ --------------
  Product Revenue    商品销售收入
  Shipping Revenue   运费收入
  Service Revenue    服务收入

------------------------------------------------------------------------

## Expense（费用）

企业经营成本。

  English Account     中文科目
  ------------------- ------------
  COGS                销售成本
  Freight Expense     运输费用
  Warehouse Expense   仓储费用
  Payment Expense     支付手续费

------------------------------------------------------------------------

# 12.5 General Ledger（GL，总账）

## 定义

General Ledger记录所有已过账的财务交易。

结构：

    Journal Entry

    ↓

    Journal Entry Line

    ↓

    Account

    ↓

    General Ledger

------------------------------------------------------------------------

# 12.6 Journal Posting（分录过账）

流程：

    Financial Event

    ↓

    Accounting Rule

    ↓

    Journal Entry Created

    ↓

    Validation

    ↓

    Post To GL

------------------------------------------------------------------------

# 12.7 常见业务会计规则 Accounting Rules

## 12.7.1 Customer Payment（客户付款）

业务：

客户支付订单金额。

分录：

    Debit:

    Cash（现金）


    Credit:

    Customer Deposit（客户预收）

------------------------------------------------------------------------

## 12.7.2 Revenue Recognition（收入确认）

业务：

完成履约。

分录：

    Debit:

    Customer Deposit


    Credit:

    Product Revenue


    Credit:

    Shipping Revenue

------------------------------------------------------------------------

## 12.7.3 Inventory Shipment（库存出库）

业务：

商品发货。

分录：

    Debit:

    COGS（销售成本）


    Credit:

    Inventory Asset（库存资产）

------------------------------------------------------------------------

## 12.7.4 Warehouse Bill（仓储账单）

业务：

收到仓储服务费用。

分录：

    Debit:

    Warehouse Expense


    Credit:

    Accounts Payable

------------------------------------------------------------------------

## 12.7.5 Carrier Invoice（运输账单）

业务：

收到承运商账单。

分录：

    Debit:

    Freight Expense


    Credit:

    Accounts Payable

------------------------------------------------------------------------

# 12.8 Accounting Period（财务期间）

## 定义

财务期间用于控制：

-   什么时候可以记账
-   什么时候关闭账期

字段：

  English Field      中文字段
  ------------------ --------------
  Fiscal Period ID   财务期间编号
  Start Date         开始日期
  End Date           结束日期
  Period Status      期间状态

------------------------------------------------------------------------

状态：

  English Status   中文状态
  ---------------- ----------
  Open             开放
  Closed           已关闭

------------------------------------------------------------------------

# 12.9 Financial Statement（财务报表）

## Income Statement（利润表）

展示：

    Revenue（收入）

    -

    COGS（销售成本）

    =

    Gross Profit（毛利润）


    -

    Operating Expense（运营费用）

    =

    Net Profit（净利润）

------------------------------------------------------------------------

## Balance Sheet（资产负债表）

展示：

    Assets（资产）

    =

    Liabilities（负债）

    +

    Equity（权益）

------------------------------------------------------------------------

## Cash Flow Statement（现金流量表）

展示：

-   Cash Inflow（现金流入）
-   Cash Outflow（现金流出）

------------------------------------------------------------------------

# 12.10 OMS Accounting Architecture（OMS会计架构）

    Business Domain

    (Order/Fulfillment/Payment)

            |

    Financial Event Layer

            |

    Accounting Engine

            |

    Journal Entry

            |

    General Ledger

            |

    Financial Report

------------------------------------------------------------------------

# 12.11 NetSuite / QuickBooks Mapping（系统映射）

## NetSuite

  OMS对象             中文       NetSuite对象
  ------------------- ---------- -------------------
  Chart of Accounts   会计科目   Chart of Accounts
  Journal Entry       会计分录   Journal Entry
  General Ledger      总账       General Ledger
  Invoice             发票       Invoice

------------------------------------------------------------------------

## QuickBooks

  OMS对象         中文         QuickBooks对象
  --------------- ------------ ----------------
  Account         科目         Account
  Journal Entry   分录         Journal Entry
  Invoice         发票         Invoice
  Bill            供应商账单   Bill

------------------------------------------------------------------------

# Part 12 总结

核心结论：

1.  OMS Finance必须基于复式记账。
2.  Financial Event负责连接业务和会计。
3.  Chart of Accounts是财务模型基础。
4.  Journal Entry是财务系统核心。
5.  OMS可以提供轻量GL能力，同时同步NetSuite/QB。

------------------------------------------------------------------------

# 下一章节

# Part 13：Order Profitability Analysis（订单利润分析模型）

将设计：

-   Revenue Analysis（收入分析）
-   Product Cost Analysis（商品成本分析）
-   Fulfillment Cost Analysis（履约成本分析）
-   Contribution Margin（贡献毛利）
-   Profit Calculation（利润计算）
-   Profit Dashboard（利润报表）
