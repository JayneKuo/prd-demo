# OMS Commerce ERP 财务域设计文档

# Part 3：Order Financial Model（订单财务模型）

## 3.1 设计目标 Business Purpose（业务目的）

Order Financial Model（订单财务模型）用于定义：

- 一个订单产生多少销售金额
- 客户实际支付多少钱
- 企业确认多少收入
- 后续如何计算成本和利润

核心原则：

> Order Amount（订单金额）≠ Payment Amount（支付金额）≠ Revenue（收入）≠ Profit（利润）

---

# 3.2 Sales Order（销售订单）模型

## 3.2.1 Sales Order Header（销售订单头）

| English Field | 中文字段 | Data Type | 来源 | 说明 |
|---|---|---|---|---|
| Order ID | 订单编号 | String | OMS | 销售订单唯一编号 |
| Customer ID | 客户编号 | String | OMS | 下单客户 |
| Order Date | 订单日期 | DateTime | OMS | 创建时间 |
| Currency Code | 币种代码 | String | OMS | USD等 |
| Order Status | 订单状态 | Enum | OMS | Created/Paid/Shipped/Completed |
| Payment Status | 支付状态 | Enum | Payment | Pending/Captured/Refunded |
| Fulfillment Status | 履约状态 | Enum | OMS/WMS | Pending/Shipped/Delivered |

---

# 3.3 Order Line（订单明细）

订单金额必须基于订单明细计算。

## Order Line 数据模型

| English Field | 中文字段 | Data Type | 说明 |
|---|---|---|---|
| Order Line ID | 订单明细编号 | String | 唯一编号 |
| SKU ID | 商品编码 | String | 销售商品 |
| Quantity | 数量 | Decimal | 销售数量 |
| Unit Price | 销售单价 | Decimal | 商品售价 |
| Extended Price | 行金额 | Decimal | 数量×单价 |
| Discount Allocation | 折扣分摊金额 | Decimal | 分摊优惠 |
| Net Line Amount | 行净销售金额 | Decimal | 扣除折扣后金额 |

---

# 3.4 金额计算模型 Amount Calculation Model

## 3.4.1 Gross Merchandise Value（GMV，商品交易总额）

定义：

订单商品未扣优惠前的销售金额。

公式：

```
GMV
=
Σ(Quantity × Unit Price)
```

示例：

SKU-A:

1 × 60 = 60

SKU-B:

1 × 40 = 40


所以：

```
GMV = 100
```

---

# 3.4.2 Discount Amount（优惠金额）

包括：

| English | 中文 |
|---|---|
| Promotion Discount | 促销折扣 |
| Coupon Discount | 优惠券折扣 |
| Campaign Discount | 活动折扣 |
| Manual Discount | 人工调整折扣 |

公式：

```
Net Sales Amount
=
GMV - Discount Amount
```

示例：

```
100 - 10 = 90
```

---

# 3.4.3 Discount Allocation（优惠分摊）

订单级优惠需要分摊到商品行。

公式：

```
Line Discount

=
Order Discount
×
Line Gross Amount
/
Order GMV
```

示例：

订单优惠：

10


SKU-A：

60/100


分摊：

```
10 × 60%

=6
```


SKU-B：

```
10 × 40%

=4
```

---

# 3.4.4 Net Sales Amount（净销售额）

定义：

扣除优惠后的商品收入基础。


公式：

```
Net Sales Amount

=
GMV
-
Discount Amount
```


示例：

```
100 - 10

=90
```

注意：

Net Sales Amount 才是后续 Revenue Recognition（收入确认）的基础。

---

# 3.5 Shipping Revenue（运费收入）

定义：

客户支付给商家的运输费用。


字段：

| English Field | 中文字段 | 说明 |
|---|---|---|
| Shipping Charge | 客户支付运费 | Customer Paid Shipping |
| Shipping Revenue | 运费收入 | 企业收入 |

注意：

Shipping Revenue 不等于 Freight Cost（运输成本）。

例如：

客户支付：

$8


承运商收费：

$6


两个不同概念。

---

# 3.6 Handling Fee（处理费用）

例如：

- Gift Wrap Fee
- Service Fee
- Handling Fee


字段：

| English Field | 中文字段 |
|---|---|
| Handling Fee | 处理费用 |
| Service Charge | 服务费用 |

---

# 3.7 Tax Amount（税费金额）

## Sales Tax（销售税）

美国销售税通常由：

- Avalara
- TaxJar
- Vertex

计算。


字段：

| English Field | 中文字段 |
|---|---|
| Tax Jurisdiction | 税务管辖区域 |
| Tax Rate | 税率 |
| Taxable Amount | 应税金额 |
| Tax Amount | 税费金额 |


公式：

```
Tax Amount

=
Taxable Amount
×
Tax Rate
```

---

注意：

Sales Tax 不是 Revenue。

它属于：

```
Tax Liability（税务负债）
```

---

# 3.8 Grand Total（订单总金额）

客户最终支付金额。


公式：

```
Grand Total

=
Net Sales Amount

+
Shipping Revenue

+
Handling Fee

+
Tax Amount
```


案例：

```
Net Sales:
90

Shipping:
8

Handling:
0

Tax:
7.84


Grand Total:

105.84
```

---

# 3.9 完整订单金额示例

订单：

|项目|金额|
|---|---:|
|Gross Merchandise Value 商品原价|100|
|Discount 优惠|-10|
|Net Sales Amount 净销售额|90|
|Shipping Revenue 运费收入|8|
|Tax Amount 税费|7.84|
|Grand Total 客户支付|105.84|

---

# 3.10 财务概念区分 Financial Concept Separation

|概念|英文|含义|
|---|---|---|
|订单金额|Order Amount|商业交易金额|
|支付金额|Payment Amount|客户实际付款|
|收入|Revenue|企业确认收入|
|成本|Cost|资源消耗价值|
|利润|Profit|收入减成本|

---

# 3.11 后续设计

下一章节：

# Part 4：Pricing / Promotion / Tax Model（定价、优惠、税费模型）

将继续设计：

- Pricing Rule（价格规则）
- Promotion Rule（促销规则）
- Coupon（优惠券）
- Bundle Discount（组合优惠）
- Tax Engine Integration（税务引擎集成）
- Tax Posting（税务入账逻辑）
