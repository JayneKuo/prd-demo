# OMS Commerce ERP 财务域设计文档

# Part 28：OMS Finance Security & Audit Design（安全与审计设计）

## 28.1 设计目标 Security Objective（安全目标）

财务数据属于企业核心敏感数据。

OMS Finance必须保证：

-   数据安全 Data Security
-   权限隔离 Access Control
-   操作可追溯 Auditability
-   财务合规 Compliance

核心原则：

> 财务数据任何创建、修改、删除、审批动作都必须可追踪、可审计。

------------------------------------------------------------------------

# 28.2 Financial Data Permission（财务数据权限）

## 数据权限维度

支持：

  English Field   中文字段
  --------------- ----------
  Tenant          租户
  Company         公司
  Business Unit   业务单元
  Customer        客户
  Warehouse       仓库
  Channel         渠道
  Currency        币种

------------------------------------------------------------------------

## Permission Scope（权限范围）

例如：

Finance User A：

只能查看：

    Company A

    +

    Warehouse US01

    +

    Customer Group Retail

不能查看：

    Company B

    Warehouse EU01

------------------------------------------------------------------------

# 28.3 RBAC Design（角色权限设计）

## Finance Admin（财务管理员）

权限：

-   Finance Configuration（财务配置）
-   Accounting Rule（会计规则）
-   Integration Setting（集成配置）
-   User Permission（用户权限）

------------------------------------------------------------------------

## Finance Analyst（财务分析员）

权限：

-   Revenue Report（收入报表）
-   Cost Report（成本报表）
-   Profitability Analysis（利润分析）

只读：

-   Journal Entry

------------------------------------------------------------------------

## Accountant（会计）

权限：

-   Invoice（发票）
-   AR/AP（应收应付）
-   Journal Entry（会计分录）
-   Reconciliation（对账）

------------------------------------------------------------------------

## Operation Manager（运营经理）

权限：

-   Order Profitability（订单利润）
-   Fulfillment Cost（履约成本）

限制：

不可查看：

-   GL Detail（总账明细）
-   Payroll Expense（工资费用）

------------------------------------------------------------------------

# 28.4 Audit Log Design（审计日志设计）

## Audit Log Definition（审计日志定义）

记录所有关键财务操作。

表：

audit_log

字段：

  English Field   中文字段
  --------------- ----------
  Audit ID        审计编号
  User ID         操作用户
  Action Type     操作类型
  Object Type     对象类型
  Object ID       对象编号
  Before Value    修改前值
  After Value     修改后值
  Timestamp       操作时间
  IP Address      IP地址

------------------------------------------------------------------------

# 28.5 Audited Object（审计对象）

必须记录：

## Revenue Event

例如：

收入金额：

100

修改：

120

记录：

    Before:

    100


    After:

    120

------------------------------------------------------------------------

## Journal Entry

禁止直接删除。

只能：

    Original Journal

    ↓

    Reversal Journal

    ↓

    New Journal

------------------------------------------------------------------------

## Invoice

记录：

-   创建
-   修改
-   作废
-   付款

------------------------------------------------------------------------

# 28.6 Data Change Control（数据变更控制）

财务数据修改原则：

## Operational Data（运营数据）

例如：

Order Address

允许：

Update

------------------------------------------------------------------------

## Financial Data（财务数据）

例如：

Revenue Amount

禁止：

直接修改

必须：

Adjustment Event（调整事件）

流程：

    Change Request

    ↓

    Approval

    ↓

    Adjustment Event

    ↓

    Journal Entry

------------------------------------------------------------------------

# 28.7 Approval Workflow（审批流程）

支持：

## Revenue Adjustment（收入调整）

流程：

    User Submit

    ↓

    Finance Review

    ↓

    Manager Approval

    ↓

    Post Adjustment

------------------------------------------------------------------------

## Refund Approval（退款审批）

流程：

    Refund Request

    ↓

    Validation

    ↓

    Approval

    ↓

    Payment Refund

------------------------------------------------------------------------

# 28.8 Data Encryption（数据加密）

## Sensitive Data（敏感数据）

包括：

-   Payment Information（支付信息）
-   Bank Account（银行账户）
-   Customer Financial Data（客户财务数据）

------------------------------------------------------------------------

## Encryption Strategy（加密策略）

### Data At Rest（静态数据）

使用：

-   Database Encryption
-   Field Encryption

### Data In Transit（传输数据）

使用：

-   TLS
-   HTTPS

------------------------------------------------------------------------

# 28.9 Financial Compliance（财务合规）

支持：

## Audit Trail（审计追踪）

要求：

-   谁操作
-   什么时间
-   修改什么
-   为什么修改

------------------------------------------------------------------------

## Period Close Control（月结控制）

关闭期间后：

禁止：

-   修改已过账数据
-   删除Journal

只能：

Create Adjustment Entry（创建调整分录）

------------------------------------------------------------------------

# 28.10 SOX Control Design（SOX控制设计）

适用于上市企业。

核心控制：

## Separation of Duty（职责分离）

例如：

创建：

Finance User

审批：

Finance Manager

过账：

Accounting User

------------------------------------------------------------------------

## Approval Control（审批控制）

高风险操作：

-   Large Refund
-   Revenue Adjustment
-   Manual Journal Entry

必须审批。

------------------------------------------------------------------------

# 28.11 Security Architecture（安全架构）

``` text
User

 |

Authentication

 |

Authorization Service

 |

RBAC + Data Permission

 |

Finance Service

 |

Audit Service

 |

Database
```

------------------------------------------------------------------------

# 28.12 Final Security Capability（最终安全能力）

OMS Finance支持：

## Access Control（访问控制）

-   RBAC
-   Data Permission
-   Tenant Isolation

## Audit Control（审计控制）

-   Audit Log
-   Change History
-   Approval Workflow

## Compliance Control（合规控制）

-   Period Close
-   Separation of Duty
-   Financial Traceability

------------------------------------------------------------------------

# 下一章节

# Part 29：OMS Finance Deployment Architecture（部署架构设计）

下一部分设计：

-   Cloud Architecture（云架构）
-   SaaS Multi Tenant Architecture（多租户架构）
-   Database Deployment
-   Message Queue
-   Cache
-   Monitoring
-   Disaster Recovery
