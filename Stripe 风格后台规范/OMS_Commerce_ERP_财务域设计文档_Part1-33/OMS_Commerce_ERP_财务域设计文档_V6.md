# OMS Commerce ERP 财务域设计文档

# Part 4：Pricing / Promotion / Tax Model（定价、优惠、税费模型）

## 4.1 设计目标 Business Purpose（业务目的）

Pricing / Promotion / Tax Model 用于管理订单金额形成过程。

解决：

-   商品原始价格如何确定
-   不同客户如何使用不同价格
-   促销如何影响订单金额
-   优惠如何分摊到订单明细
-   税费如何计算和保存
-   最终客户支付金额如何形成

核心原则：

> 价格计算、优惠计算、税费计算必须可追溯。

每一个金额变化都必须知道：

-   原始金额是多少
-   为什么变化
-   哪条规则产生
-   谁批准
-   最终影响多少

------------------------------------------------------------------------

# 4.2 Pricing Model（价格模型）

## 4.2.1 Price Definition（价格定义）

系统支持多种价格类型。

  English Field    中文字段   说明
  ---------------- ---------- --------------------------
  List Price       标准价格   商品基础销售价格
  Sale Price       销售价格   当前促销销售价格
  Customer Price   客户价格   针对客户设置的价格
  Contract Price   合同价格   客户合同约定价格
  Cost Price       成本价格   商品成本，不属于销售价格

------------------------------------------------------------------------

# 4.2.2 Price Priority（价格优先级）

订单价格计算顺序：

``` text
List Price（标准价格）

↓

Customer Contract Price（客户合同价）

↓

Customer Specific Price（客户专属价）

↓

Promotion Price（促销价格）

↓

Coupon Discount（优惠券）

↓

Final Selling Price（最终销售价格）
```

------------------------------------------------------------------------

# 4.3 Price Rule（价格规则）

## Price Rule 数据模型

  English Field      中文字段       类型     说明
  ------------------ -------------- -------- -------------------------
  Price Rule ID      价格规则编号   String   唯一编号
  Rule Name          规则名称       String   规则名称
  Customer Segment   客户分组       String   客户范围
  SKU ID             商品编码       String   适用商品
  Effective Date     生效日期       Date     生效时间
  Expiration Date    失效日期       Date     结束时间
  Price Type         价格类型       Enum     List/Contract/Promotion

------------------------------------------------------------------------

# 4.4 Promotion Model（促销模型）

Promotion（促销）用于定义营销活动。

支持：

  English Field           中文字段
  ----------------------- --------------
  Percentage Discount     百分比折扣
  Fixed Amount Discount   固定金额折扣
  Buy X Get Y             买X送Y
  Bundle Discount         组合优惠
  Free Shipping           免费配送

------------------------------------------------------------------------

# 4.5 Promotion Rule（促销规则）

字段：

  English Field      中文字段       说明
  ------------------ -------------- ----------------
  Promotion ID       促销编号       活动编号
  Promotion Name     促销名称       活动名称
  Promotion Type     促销类型       折扣/满减/赠品
  Start Date         开始日期       活动开始
  End Date           结束日期       活动结束
  Minimum Quantity   最小购买数量   满足条件
  Minimum Amount     最低金额       满足条件

------------------------------------------------------------------------

# 4.6 Discount Calculation（优惠计算）

## Percentage Discount（比例折扣）

公式：

    Discount Amount

    =

    Original Amount

    ×

    Discount Rate

示例：

商品金额：

100

折扣：

10%

优惠：

10

------------------------------------------------------------------------

## Fixed Discount（固定金额优惠）

例如：

订单满100减20。

公式：

    Discount Amount

    =

    Fixed Discount Value

------------------------------------------------------------------------

# 4.7 Discount Allocation（优惠分摊）

订单级优惠需要分摊到商品行。

公式：

    Line Discount

    =

    Order Discount

    ×

    Line Amount

    /

    Order Subtotal

示例：

订单：

SKU-A = 60

SKU-B = 40

优惠：

10

分摊：

SKU-A:

10 × 60%

= 6

SKU-B:

10 × 40%

= 4

------------------------------------------------------------------------

# 4.8 Tax Model（税费模型）

## Tax Calculation（税费计算）

美国电商通常通过：

-   Avalara
-   TaxJar
-   Vertex

等税务服务计算。

------------------------------------------------------------------------

## Tax Data Model（税务数据模型）

  English Field      中文字段   说明
  ------------------ ---------- --------------
  Tax Jurisdiction   税务区域   州/城市/地区
  Tax Code           税务编码   税分类
  Tax Rate           税率       百分比
  Taxable Amount     应税金额   计算基础
  Tax Amount         税费金额   最终税额

------------------------------------------------------------------------

# 4.9 Tax Calculation Logic（税费计算逻辑）

公式：

    Tax Amount

    =

    Taxable Amount

    ×

    Tax Rate

示例：

应税金额：

98

税率：

8%

税费：

7.84

------------------------------------------------------------------------

# 4.10 Tax Accounting Treatment（税务会计处理）

重要原则：

Sales Tax（销售税）不是企业收入。

客户支付：

105.84

其中：

销售收入：

98

销售税：

7.84

会计：

    Debit:
    Cash

    Credit:
    Sales Revenue

    Credit:
    Tax Payable

------------------------------------------------------------------------

# 4.11 Order Amount Calculation Summary（订单金额计算总结）

完整流程：

``` text
Product Price（商品价格）

↓

Gross Merchandise Value（商品总额）

↓

Discount（优惠）

↓

Net Sales Amount（净销售额）

↓

Shipping Revenue（运费收入）

↓

Handling Fee（处理费用）

↓

Tax Amount（税费）

↓

Grand Total（订单总金额）

↓

Payment（客户支付）
```

------------------------------------------------------------------------

# 下一章节

# Part 5：Payment & Settlement Model（支付与结算模型）

将设计：

-   Payment Transaction（支付交易）
-   Authorization（授权）
-   Capture（扣款）
-   Settlement（结算）
-   Payout（到账）
-   Payment Fee（支付手续费）
-   Refund（退款）
-   Chargeback（拒付）

并说明：

为什么：

Payment ≠ Revenue

以及：

支付流水如何进入 OMS Finance、NetSuite、QuickBooks。
