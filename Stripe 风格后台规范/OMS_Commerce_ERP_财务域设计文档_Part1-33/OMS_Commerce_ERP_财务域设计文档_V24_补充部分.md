# OMS Commerce ERP 财务域设计文档

# Part 26：OMS Finance ER Diagram（实体关系设计）

## 26.1 设计目标

本章节通过 Entity Relationship Model（实体关系模型）描述 OMS Finance
中：

-   业务实体
-   财务实体
-   会计实体

之间的数据关系。

核心原则：

> 每一笔财务结果必须能够追溯到原始业务交易。

------------------------------------------------------------------------

# 26.2 Core ER Relationship（核心实体关系）

整体关系：

``` text
Customer（客户）

    1

    |

    N

Sales Order（销售订单）

    1

    |

    N

Order Line（订单明细）

    |

    |

    N

Fulfillment Order（履约单）

    |

    |

Shipment（发货）


        ↓


Financial Event（财务事件）


        ↓


Accounting Rule（会计规则）


        ↓


Journal Entry（会计分录）


        ↓


General Ledger（总账）
```

------------------------------------------------------------------------

# 26.3 Customer Domain ER（客户领域）

## Customer

一个客户可以有多个订单。

关系：

    Customer

    1 : N

    Sales Order

字段：

  English Field   中文字段
  --------------- ----------
  Customer ID     客户编号
  Customer Name   客户名称
  Tax Profile     税务属性
  Payment Term    付款条件

------------------------------------------------------------------------

# 26.4 Order Domain ER（订单领域）

关系：

    Sales Order

    1 : N

    Order Line

    1 : N

    Fulfillment Order

    1 : N

    Shipment

------------------------------------------------------------------------

# 26.5 Revenue ER（收入关系）

关系：

    Shipment

            |

            v

    Revenue Event

            |

            v

    Journal Entry

说明：

发货或签收事件触发收入确认。

------------------------------------------------------------------------

# 26.6 Cost ER（成本关系）

## Product Cost

    SKU

    ↓

    Inventory Transaction

    ↓

    Inventory Cost Ledger

    ↓

    COGS Event

------------------------------------------------------------------------

## Warehouse Cost

    Fulfillment Order

    ↓

    Warehouse Service

    ↓

    Warehouse Cost Ledger

    ↓

    Profitability

------------------------------------------------------------------------

## Freight Cost

    Shipment

    ↓

    Carrier Invoice

    ↓

    Freight Cost Ledger

    ↓

    Profitability

------------------------------------------------------------------------

# 26.7 Profitability ER（利润分析关系）

核心：

    Order

    |

    + Revenue

    |

    + Product Cost

    |

    + Fulfillment Cost

    |

    + Freight Cost

    |

    + Payment Fee


            ↓


    Order Profitability

------------------------------------------------------------------------

# Part 27：OMS Finance Microservice Architecture（微服务架构）

## 27.1 架构目标

将 OMS Finance 按领域拆分：

支持：

-   SaaS多租户
-   高并发订单
-   异步财务处理
-   多ERP集成

------------------------------------------------------------------------

# 27.2 Service Architecture（服务架构）

``` text
                 API Gateway

                      |

 ------------------------------------------------

 |              |              |               |

Finance      Accounting    Settlement     Reporting

Service      Service       Service        Service


 |

Event Bus


 |

Integration Service


 |

NetSuite / QuickBooks
```

------------------------------------------------------------------------

# 27.3 Finance Service（财务服务）

职责：

管理：

-   Revenue Event
-   Cost Ledger
-   Profitability

接口：

    POST /finance/events

    GET /finance/revenue

    GET /finance/profitability

------------------------------------------------------------------------

# 27.4 Accounting Service（会计服务）

职责：

管理：

-   Chart of Accounts
-   Accounting Rule
-   Journal Entry
-   GL

接口：

    POST /accounting/journal

    GET /accounting/gl

------------------------------------------------------------------------

# 27.5 Settlement Service（结算服务）

职责：

管理：

-   Payment Settlement
-   Refund
-   Chargeback

接口：

    GET /settlement/list

    POST /settlement/reconcile

------------------------------------------------------------------------

# 27.6 Reporting Service（报表服务）

职责：

提供：

-   Revenue Report
-   Profit Report
-   Margin Analysis
-   Financial Dashboard

特点：

使用：

-   Data Warehouse
-   OLAP
-   BI Engine

------------------------------------------------------------------------

# 27.7 Integration Service（集成服务）

负责：

外部系统：

-   NetSuite
-   QuickBooks
-   Payment Gateway
-   Tax Provider

能力：

-   API Adapter
-   Retry Queue
-   Error Handling
-   Mapping

------------------------------------------------------------------------

# 27.8 Multi Tenant Design（多租户设计）

所有财务表增加：

  Field           中文字段
  --------------- ----------
  Tenant ID       租户编号
  Company ID      公司编号
  Currency Code   币种

例如：

    tenant_id

    company_id

    order_id

    financial_event_id

------------------------------------------------------------------------

# 27.9 Final Enterprise Architecture（最终企业架构）

``` text
Sales Channel

Amazon
Shopify
EDI


        |

        v


OMS Commerce Platform


        |

        +----------------+

        | Finance Domain |

        +----------------+


        |

Financial Event Platform


        |

Accounting Engine


        |

ERP Integration Layer


        |

NetSuite

QuickBooks

SAP

Oracle

```

------------------------------------------------------------------------

# Part 27 总结

最终 OMS Finance 具备：

## Domain Capability（领域能力）

-   Revenue
-   Cost
-   Settlement
-   Accounting
-   Reporting

## Enterprise Capability（企业能力）

-   Multi Tenant
-   ERP Integration
-   Audit Trail
-   Event Driven Processing
-   Financial Traceability

------------------------------------------------------------------------

# 下一章节

# Part 28：OMS Finance Security & Audit Design（安全与审计设计）

将设计：

-   Financial Data Permission（财务数据权限）
-   Role Based Access Control
-   Audit Log
-   Data Encryption
-   Compliance Design
-   SOX Audit Requirement
