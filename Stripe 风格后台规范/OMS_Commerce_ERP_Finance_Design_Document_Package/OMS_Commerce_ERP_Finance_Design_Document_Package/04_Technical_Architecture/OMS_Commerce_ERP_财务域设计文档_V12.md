# OMS Commerce ERP 财务域设计文档

# Part 10：Return / Reverse Logistics Model（退货与逆向物流模型）

## 10.1 设计目标 Business Purpose（业务目的）

Return / Reverse Logistics Model（退货与逆向物流模型）用于管理：

-   客户退货申请
-   退货审批
-   逆向运输
-   仓库收货
-   商品检测
-   库存恢复
-   退款处理
-   收入冲销
-   成本恢复

核心原则：

> 退货不是删除原订单，而是产生一组反向业务交易和财务事件。

------------------------------------------------------------------------

# 10.2 Return Lifecycle（退货生命周期）

完整流程：

``` text
Customer Return Request（客户退货申请）

↓

Return Authorization（退货授权）

↓

Reverse Shipment（逆向运输）

↓

Warehouse Receive（仓库收货）

↓

Inspection（质量检查）

↓

Inventory Decision（库存处理）

↓

Refund Processing（退款处理）

↓

Financial Adjustment（财务调整）
```

------------------------------------------------------------------------

# 10.3 Return Order（退货订单）

## 定义

Return Order（退货订单）表示：

客户要求将已经购买的商品退回。

来源：

-   Original Sales Order（原销售订单）
-   Customer Service（客服）
-   Return Portal（退货门户）

------------------------------------------------------------------------

## Return Order 数据模型

  English Field       中文字段       Data Type   说明
  ------------------- -------------- ----------- -----------------------------
  Return Order ID     退货订单编号   String      唯一编号
  Original Order ID   原订单编号     String      原销售订单
  Customer ID         客户编号       String      客户
  Return Reason       退货原因       Enum        质量/不喜欢/错误商品
  Return Status       退货状态       Enum        Requested/Approved/Received
  Return Date         退货日期       Date        时间
  Refund Amount       退款金额       Decimal     退款金额

------------------------------------------------------------------------

# 10.4 Return Authorization（退货授权）

## 定义

Return Authorization（退货授权）：

企业允许客户退货的确认过程。

状态：

  English Status   中文状态
  ---------------- ----------
  Requested        已申请
  Approved         已批准
  Rejected         已拒绝
  Cancelled        已取消

------------------------------------------------------------------------

# 10.5 Reverse Shipment（逆向运输）

## 定义

Reverse Shipment（逆向运输）：

商品从客户返回仓库。

数据模型：

  English Field         中文字段       说明
  --------------------- -------------- --------------
  Reverse Shipment ID   逆向运输编号   唯一编号
  Return Order ID       退货订单编号   关联退货
  Carrier ID            承运商编号     运输商
  Tracking Number       跟踪号码       物流编号
  Freight Cost          逆向运输成本   退货运输费用

------------------------------------------------------------------------

# 10.6 Return Receive（退货收货）

仓库收到退货后产生：

Warehouse Event（仓库事件）

字段：

  English Field       中文字段
  ------------------- --------------
  Return Receive ID   退货收货编号
  Warehouse ID        仓库编号
  Received Quantity   收货数量
  Receive Date        收货日期
  Inspection Status   检查状态

------------------------------------------------------------------------

# 10.7 Inspection（质量检查）

退货商品不是全部直接入库。

检查结果：

  English Status   中文状态     处理
  ---------------- ------------ --------------
  Restock          可重新入库   恢复库存
  Repair           维修         进入维修库存
  Damaged          损坏         报废
  Scrap            报废         成本损失

------------------------------------------------------------------------

# 10.8 Inventory Restoration（库存恢复）

## Restock（重新入库）

如果商品可销售：

库存增加。

例如：

退回：

1件

成本：

30

库存：

+1

库存价值：

+30

------------------------------------------------------------------------

## Accounting Impact（会计影响）

恢复库存：

``` text
Debit:

Inventory Asset（库存资产）


Credit:

COGS（销售成本）
```

原因：

之前销售时已经确认成本。

------------------------------------------------------------------------

# 10.9 Revenue Reversal（收入冲销）

退货导致收入减少。

原订单：

Revenue：

90

退货：

90

产生：

``` text
Revenue Reversal:

-90
```

会计：

``` text
Debit:

Sales Revenue（销售收入）


Credit:

Customer Refund Liability（退款负债）
```

------------------------------------------------------------------------

# 10.10 Tax Reversal（税费冲销）

如果原订单包含销售税：

需要同步减少税务负债。

例如：

原税：

7.84

退款：

全部退货

冲销：

7.84

会计：

``` text
Debit:

Tax Payable（应交税费）


Credit:

Refund Liability（退款负债）
```

------------------------------------------------------------------------

# 10.11 Refund Model（退款模型）

## Refund 数据模型

  English Field     中文字段
  ----------------- --------------
  Refund ID         退款编号
  Return Order ID   退货订单编号
  Payment ID        原支付编号
  Refund Amount     退款金额
  Refund Method     退款方式
  Refund Status     退款状态

------------------------------------------------------------------------

# 10.12 COGS Reversal（销售成本冲销）

原销售：

COGS：

30

退货重新入库：

恢复：

30

公式：

    COGS Reversal

    =

    Returned Quantity

    ×

    Original Unit Cost

------------------------------------------------------------------------

# 10.13 Return Cost（退货成本）

退货可能产生：

  English Field          中文字段
  ---------------------- --------------
  Return Shipping Cost   退货运输成本
  Inspection Cost        检测成本
  Restocking Fee         重新入库费用
  Disposal Cost          报废成本

------------------------------------------------------------------------

# 10.14 Complete Return Financial Flow（完整退货财务流程）

``` text
Original Sales Order（原销售订单）

↓

Revenue Recognition（收入确认）

↓

COGS Recognition（成本确认）

↓

Customer Return（客户退货）

↓

Revenue Reversal（收入冲销）

↓

Inventory Restoration（库存恢复）

↓

COGS Reversal（成本恢复）

↓

Refund Payment（退款）

↓

Accounting Adjustment（会计调整）
```

------------------------------------------------------------------------

# 10.15 NetSuite / QuickBooks Mapping（系统映射）

## NetSuite

  OMS对象                中文         NetSuite对象
  ---------------------- ------------ ----------------------
  Return Order           退货订单     Return Authorization
  Refund                 退款         Customer Refund
  Credit Memo            贷项通知单   Credit Memo
  Inventory Adjustment   库存调整     Inventory Adjustment

------------------------------------------------------------------------

## QuickBooks

  OMS对象                中文         QuickBooks对象
  ---------------------- ------------ ----------------------
  Refund                 退款         Refund Receipt
  Credit Memo            贷项通知单   Credit Memo
  Inventory Adjustment   库存调整     Inventory Adjustment

------------------------------------------------------------------------

# Part 10 总结

核心结论：

1.  退货不是取消订单，而是反向业务流程。
2.  退货必须产生Reverse Transaction（反向交易）。
3.  Revenue、Tax、COGS、Inventory必须同步调整。
4.  退货成本需要单独分析。
5.  OMS需要同时管理运营状态和财务影响。

------------------------------------------------------------------------

# 下一章节

# Part 11：Financial Event Model（财务事件模型）

将设计：

-   Business Event（业务事件）
-   Financial Event（财务事件）
-   Accounting Rule（会计规则）
-   Journal Entry（会计分录）
-   Event Driven Accounting（事件驱动会计）
