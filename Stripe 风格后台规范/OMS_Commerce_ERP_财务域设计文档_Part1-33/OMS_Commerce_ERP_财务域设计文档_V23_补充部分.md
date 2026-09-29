# OMS Commerce ERP 财务域设计文档

# Part 21：OMS Finance API Design（接口设计）

## 21.1 API设计目标

Finance API用于支持：

-   OMS内部模块调用
-   WMS/TMS/Payment系统集成
-   NetSuite/QuickBooks同步
-   财务事件驱动

核心原则：

> API传递业务事实，不直接传递会计结果；会计结果由Financial
> Event和Accounting Rule生成。

------------------------------------------------------------------------

# 21.2 API Architecture（接口架构）

``` text
Channel / WMS / TMS / Payment

            |

            v

OMS Finance API

            |

            v

Financial Event Engine

            |

            v

Accounting Engine

            |

            v

ERP Integration API

(NetSuite / QuickBooks)
```

------------------------------------------------------------------------

# 21.3 Revenue API（收入接口）

## 创建收入事件

POST /api/finance/revenue-events

Request：

  Field             中文字段
  ----------------- ----------
  orderId           订单编号
  shipmentId        发货编号
  revenueType       收入类型
  amount            金额
  recognitionDate   确认日期

Response：

  Field            中文字段
  ---------------- --------------
  revenueEventId   收入事件编号
  status           状态

------------------------------------------------------------------------

# 21.4 Cost API（成本接口）

## 创建成本记录

POST /api/finance/costs

支持：

-   Product Cost（商品成本）
-   Warehouse Cost（仓储成本）
-   Freight Cost（运输成本）
-   Payment Fee（支付费用）

字段：

  Field          中文字段
  -------------- ----------
  costType       成本类型
  sourceSystem   来源系统
  orderId        订单编号
  amount         金额

------------------------------------------------------------------------

# 21.5 Profitability API（利润接口）

GET /api/finance/orders/{orderId}/profit

返回：

``` json
{
 "revenue":98,
 "productCost":50,
 "fulfillmentCost":2,
 "freightCost":10,
 "paymentFee":3,
 "profit":33
}
```

------------------------------------------------------------------------

# Part 22：OMS Finance State Machine（状态机设计）

## 22.1 Invoice State Machine（发票状态机）

``` text
Draft（草稿）

↓

Open（待付款）

↓

Partial Paid（部分付款）

↓

Paid（已付款）

↓

Closed（关闭）
```

异常：

    Open

    ↓

    Void（作废）

------------------------------------------------------------------------

# 22.2 Payment State Machine（支付状态机）

``` text
Pending（处理中）

↓

Authorized（授权）

↓

Captured（扣款成功）

↓

Settled（已结算）
```

异常：

    Captured

    ↓

    Refunded（退款）

------------------------------------------------------------------------

# 22.3 Revenue Event State Machine（收入事件）

``` text
Created

↓

Validated

↓

Recognized

↓

Posted

↓

Reversed
```

------------------------------------------------------------------------

# Part 23：Event Driven Architecture（事件驱动架构）

## 23.1 Event Flow

``` text
Business Event

        |

        v

Event Bus

        |

        v

Financial Event Engine

        |

        v

Accounting Rule Engine

        |

        v

Journal Entry
```

------------------------------------------------------------------------

# 23.2 Business Event Examples（业务事件）

  Event                中文
  -------------------- ----------
  ORDER_CREATED        订单创建
  PAYMENT_CAPTURED     支付完成
  SHIPMENT_CONFIRMED   发货确认
  DELIVERY_COMPLETED   签收完成
  RETURN_RECEIVED      退货收货
  REFUND_COMPLETED     退款完成

------------------------------------------------------------------------

# 23.3 Event Benefits（事件优势）

支持：

-   异步处理
-   重试机制
-   审计追踪
-   多系统扩展

------------------------------------------------------------------------

# Part 24：Order To Accounting Sequence Diagram（订单到会计时序）

## 24.1 正向销售流程

``` text
Customer

 |

Channel

 |

OMS Order

 |

Payment System

 |

OMS Financial Event

 |

Revenue Recognition

 |

Accounting Engine

 |

NetSuite/QB

 |

GL
```

------------------------------------------------------------------------

## 24.2 履约成本流程

``` text
WMS

 |

Fulfillment Completed

 |

Warehouse Cost Event

 |

Cost Ledger

 |

Profitability Calculation

 |

Accounting Entry
```

------------------------------------------------------------------------

## 24.3 运输成本流程

``` text
TMS

 |

Shipment Completed

 |

Carrier Invoice

 |

Freight Cost Event

 |

AP

 |

Accounting
```

------------------------------------------------------------------------

# Part 25：OMS Finance Final Blueprint（最终蓝图）

## 25.1 完整领域模型

``` text
Customer

   |

Order

   |

Fulfillment

   |

Shipment

   |

Payment


        ↓


Financial Event Layer


        ↓


Revenue / Cost / Refund


        ↓


Accounting Engine


        ↓


Journal Entry


        ↓


General Ledger


        ↓


Financial Report
```

------------------------------------------------------------------------

# 25.2 OMS Finance最终能力

## Commerce Finance（商业财务）

支持：

-   Order Revenue
-   Discount
-   Tax
-   Payment

## Operational Finance（运营财务）

支持：

-   Warehouse Cost
-   Freight Cost
-   Fulfillment Cost

## Accounting Integration（会计集成）

支持：

-   NetSuite
-   QuickBooks

## Business Analytics（经营分析）

支持：

-   Order Profit
-   SKU Profit
-   Customer Profit
-   Channel Profit

------------------------------------------------------------------------

# 最终总结

OMS Commerce ERP Finance形成：

    Commerce Operation

            +

    Operational Cost

            +

    Financial Event

            +

    Accounting Integration

            +

    Business Intelligence

定位：

> 一个连接Commerce、Supply Chain和Accounting的运营财务平台。
