# OMS Commerce ERP 财务域设计文档

# Part 16：Financial Reporting Model（财务报表模型）

## 16.1 设计目标 Business Purpose（业务目的）

Financial Reporting Model（财务报表模型）用于将 OMS 中：

-   Order（订单）
-   Payment（支付）
-   Revenue Event（收入事件）
-   Inventory Cost（库存成本）
-   Fulfillment Cost（履约成本）
-   Expense（费用）
-   AR/AP（应收应付）

转换为企业经营分析报表。

核心原则：

> OMS Finance
> 不只是记录交易，而需要提供订单级、商品级、客户级、渠道级经营分析能力。

------------------------------------------------------------------------

# 16.2 Reporting Architecture（报表架构）

整体模型：

``` text
Business Transaction（业务交易）

        |

        v

Financial Event（财务事件）

        |

        v

Accounting Data（会计数据）

        |

        v

Reporting Layer（报表层）

        |

        v

Business Dashboard（经营看板）
```

------------------------------------------------------------------------

# 16.3 Revenue Report（收入报表）

## 定义

Revenue Report 用于分析企业收入来源。

------------------------------------------------------------------------

## Revenue Metrics（收入指标）

  English Field      中文字段   说明
  ------------------ ---------- ------------------
  Product Revenue    商品收入   商品销售收入
  Shipping Revenue   运费收入   客户支付运输费用
  Service Revenue    服务收入   增值服务收入
  Total Revenue      总收入     收入合计

------------------------------------------------------------------------

## Revenue Formula（收入公式）

    Total Revenue

    =

    Product Revenue

    +

    Shipping Revenue

    +

    Service Revenue

注意：

不包含：

Sales Tax（销售税）

------------------------------------------------------------------------

# 16.4 COGS Report（销售成本报表）

## 定义

分析销售商品产生的成本。

来源：

Inventory Cost Ledger（库存成本台账）

字段：

  English Field   中文字段
  --------------- ----------
  SKU ID          商品编码
  Quantity Sold   销售数量
  Unit Cost       单位成本
  COGS Amount     销售成本

------------------------------------------------------------------------

公式：

    COGS

    =

    Quantity Sold

    ×

    Unit Cost

------------------------------------------------------------------------

# 16.5 Gross Margin Report（毛利报表）

## Gross Margin（毛利）

公式：

    Gross Profit

    =

    Revenue

    -

    COGS

------------------------------------------------------------------------

## Gross Margin Percentage（毛利率）

公式：

    Gross Margin %

    =

    Gross Profit

    /

    Revenue

    ×

    100%

------------------------------------------------------------------------

示例：

Revenue:

10000

COGS:

6000

Gross Profit:

4000

Gross Margin:

40%

------------------------------------------------------------------------

# 16.6 Contribution Margin Report（贡献毛利报表）

比毛利更接近真实经营利润。

公式：

    Contribution Margin

    =

    Revenue

    -

    Product Cost

    -

    Fulfillment Cost

    -

    Transportation Cost

    -

    Payment Fee

------------------------------------------------------------------------

包含：

  English Field    中文字段
  ---------------- ----------
  Warehouse Cost   仓储成本
  Freight Cost     运输成本
  Payment Fee      支付费用
  Handling Cost    操作成本

------------------------------------------------------------------------

# 16.7 Order Profit Report（订单利润报表）

## 定义

查看每一个订单最终利润。

字段：

  English Field      中文字段
  ------------------ ----------
  Order ID           订单编号
  Revenue            收入
  Product Cost       商品成本
  Fulfillment Cost   履约成本
  Freight Cost       运输成本
  Payment Fee        支付费用
  Profit             利润
  Margin %           利润率

------------------------------------------------------------------------

# 16.8 SKU Profitability Report（商品利润报表）

分析：

哪些SKU赚钱。

指标：

  English Field       中文字段
  ------------------- ----------
  SKU Revenue         SKU收入
  SKU Cost            SKU成本
  SKU Profit          SKU利润
  Margin Percentage   利润率

------------------------------------------------------------------------

# 16.9 Customer Profitability Report（客户利润报表）

分析：

客户贡献价值。

指标：

-   Customer Revenue（客户收入）
-   Customer Cost（客户成本）
-   Customer Profit（客户利润）
-   Order Frequency（订单频率）

------------------------------------------------------------------------

# 16.10 Channel Profitability Report（渠道利润报表）

分析：

销售渠道盈利情况。

支持：

-   Amazon
-   Shopify
-   EDI
-   Direct Sales

字段：

  English Field     中文字段
  ----------------- ----------
  Channel Revenue   渠道收入
  Channel Cost      渠道成本
  Channel Profit    渠道利润

------------------------------------------------------------------------

# 16.11 Inventory Valuation Report（库存估值报表）

## 定义

查看企业当前库存价值。

字段：

  English Field      中文字段
  ------------------ ----------
  SKU ID             商品编码
  Warehouse ID       仓库编号
  Quantity On Hand   当前库存
  Unit Cost          单位成本
  Inventory Value    库存价值

------------------------------------------------------------------------

公式：

    Inventory Value

    =

    Quantity On Hand

    ×

    Unit Cost

------------------------------------------------------------------------

# 16.12 AR Aging Report（应收账龄报表）

## 定义

分析客户欠款时间。

账龄：

  English        中文
  -------------- ---------
  Current        当前
  1-30 Days      1-30天
  31-60 Days     31-60天
  61-90 Days     61-90天
  Over 90 Days   超90天

------------------------------------------------------------------------

# 16.13 AP Aging Report（应付账龄报表）

分析：

企业欠供应商多少钱。

来源：

-   Vendor Bill
-   Warehouse Invoice
-   Carrier Invoice

------------------------------------------------------------------------

# 16.14 Financial KPI Dashboard（财务指标看板）

核心指标：

  English KPI           中文指标
  --------------------- ----------
  Revenue               收入
  Gross Profit          毛利润
  Gross Margin          毛利率
  Contribution Margin   贡献毛利
  Net Profit            净利润
  Inventory Value       库存价值
  AR Balance            应收余额
  AP Balance            应付余额

------------------------------------------------------------------------

# 16.15 OMS Finance最终能力总结

OMS Commerce ERP 财务能力：

## Transaction Layer（交易层）

管理：

-   Order
-   Payment
-   Shipment
-   Return

## Financial Event Layer（财务事件层）

管理：

-   Revenue Event
-   Cost Event
-   Payment Event
-   Refund Event

## Accounting Layer（会计层）

管理：

-   Journal Entry
-   Account
-   GL

## Reporting Layer（报表层）

提供：

-   Revenue Analysis
-   Profit Analysis
-   Inventory Valuation
-   AR/AP Analysis

------------------------------------------------------------------------

# 下一章节

# Part 17：Complete OMS Commerce ERP Finance Data Model（完整财务数据模型）

将整理：

-   ER Diagram（实体关系图）
-   Entity Definition（实体定义）
-   Data Relationship（数据关系）
-   Complete Order To Cash Flow（完整订单到现金流程）
-   Complete Financial Closing Flow（财务结账流程）
