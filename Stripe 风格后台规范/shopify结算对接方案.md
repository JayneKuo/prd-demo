一、产品定位与页面范围

产品名称：应收账款。

本期页面结构：

```
应收账款列表页
│
├─ 现有顶部业务页签
│  保留图片中的结构，本方案只展开“结算对账”范围
│
├─ 列表视图切换
│  ├─ 结算批次
│  ├─ 订单
│  └─ SKU
│
├─ 新增入口
│  ├─ 导入实际结算单
│  ├─ 新建预计结算计划【建议新增】
│  └─ 录入人工收款凭证【建议新增】
│
├─ 详情
│  ├─ 批次详情
│  └─ 订单详情
│
└─ 列表操作打开的弹窗
   ├─ 银行核销
   ├─ 差异处理
   ├─ 补充费用或账单证据
   └─ 查看预测依据
```

这里的“页面模块”指列表、弹窗、详情各自的 UI 说明，不代表新增多个一级菜单。

费用、银行凭证、规则配置是底层业务能力。本期可以通过详情页签和操作弹窗承载，不要求新增独立入口。

二、业务目标与系统边界

产品需要分别回答：

```
订单记录了多少收款和退款？
实际收款方和结算方是谁？
应结算金额是多少，依据是什么？
机构实际结算了多少？
这些资金关联哪些订单？
预计什么时候具备打款条件？
预计什么时候发起打款？
预计什么时候银行到账？
银行实际收到多少？
相关费用是否已经扣除，是否还有未付金额？
```

只对接 Shopify API，不要求新增 Amazon、TikTok、支付机构或银行 API。

Shopify API 没有提供的数据，通过真实文件或人工凭证补齐；没有证据则保持未知。

必须固定以下口径：

```
订单已付款，不等于机构已经结算。

订单记录净支付，不等于扣费后结算净额。

来源报告已入账，不等于本系统完成银行凭证核销。

订单数据来自Shopify，不等于结算主体是Shopify。

费用已确认，不等于费用尚未支付。

账户余额，不等于单笔订单剩余应收。
```

三、核心业务对象

```
订单
保存业务金额、商品、交易、退款和事件。

资金段【建议新增】
每笔收款、退款、抵扣或调整的跟踪单位。

实际资金流水
保存真实资金变化、费用、净额和来源关联。

结算批次
保存机构的一次打款或扣款及其组成。

费用记录
保存实际或预计服务费用。

账单与支付证据
保存费用依据、扣款、付款、抵免和未付余额。

银行凭证
保存实际收付款和核销分配。

证据及审计【建议新增】
保存原始响应、文件、人工确认和修改历史。
```

关联关系：

```
一个订单可以有多笔收款和退款。

一个订单可以进入多个结算批次。

一个批次可以包含多个订单及账户级活动。

一个调整可以由来源拆分关联多个订单。

一个批次可以匹配多笔银行凭证。

一张银行凭证可以核销多个批次，但不得超额使用。

一笔费用可以直接属于订单，也可以只属于账期或账户。
```

所有来源 ID 使用字符串保存。内部编号和来源编号分开。

四、完整业务流程

```
店铺授权
   ↓
同步订单、交易、商品、退款和事件
   ↓
测试数据隔离
   ↓
逐笔交易识别资金路径
   ├─ Shopify Payments
   │      ↓
   │   同步实际资金流水
   │      ↓
   │   关联交易及订单
   │      ↓
   │   发现并同步打款批次
   │
   ├─ 外部平台或独立网关
   │      ↓
   │   保存来源收退款记录
   │      ↓
   │   外部实际结算数据待补
   │      ↓
   │   导入真实结算证据
   │
   ├─ 人工付款
   │      ↓
   │   实际收款方式及凭证待补
   │
   └─ 非现金或未知路径
          ↓
       独立抵扣处理或待确认
   ↓
核对批次组成和金额
   ↓
跟踪机构打款
   ↓
银行凭证核销
   ↓
差异处理
   ↓
当前活动完成
   ↓
后续退款、争议和冲回继续追加
```

费用链独立：

```
取得实际费用记录或账单
   ↓
确认费用性质和金额
   ↓
确认订单或账期归属
   ↓
核对是否已扣款、已付款或已抵免
   ↓
确认剩余未付金额
```

订单、资金流水和批次分别同步。不能依赖订单更新时间发现所有打款变化。

五、证据规则

每条资金或费用记录保存六项独立确认状态。

```
{
  // 内部字段，全部为建议新增
  "sourceRecordReceived": true, // 是否实际取得来源记录
  "fundMovementConfirmed": true, // 是否确认资金影响、金额和币种
  "feeNatureConfirmed": false, // 是否确认具体费用性质
  "orderAttributionConfirmed": false, // 是否明确归属订单
  "billMatched": false, // 是否匹配实际账单
  "unpaidAmountConfirmed": false // 是否确认仍有未付余额
}
```

处理规则：

```
实际取得流水：
可以记录来源资金事实。

取得net：
可以确认该条净影响，不再重复减fee。

有费用类型：
不自动证明订单归属、具体账单和未付金额。

有明确订单或交易关联：
才能计入对应订单。

只有账户级活动：
保留账户层，不强摊订单。

有账单但付款情况未知：
确认费用，未付金额保持未知。
```

不存在“因为接口支持某种费用枚举，所以订单一定发生该费用”的自动规则。

六、Shopify 原生接口、输入输出与字段

6.1 通用调用

```
POST https://{shop}.myshopify.com/admin/api/2026-10/graphql.json
Content-Type: application/json
X-Shopify-Access-Token: {店铺授权令牌}
```

```
{
  "query": "<GraphQL查询>", // 查询文本
  "variables": {} // 查询变量
}
```

```
{
  "data": {}, // 返回数据，可能包含部分成功结果
  "errors": [] // GraphQL错误，不能只检查HTTP状态
}
```

订单使用 `read_orders`。读取默认最近 60 天以外的订单，需要获批 `read_all_orders`。

资金读取使用对应 Shopify Payments 权限，主要涉及 `read_shopify_payments_payouts`；账户及计划入口按实际字段核对可接受权限。用户需要 `view_payouts`。

权限不足、接口错误、账户不可用、真实空结果分别处理。

6.2 订单发现

```
query DiscoverOrders($after: String, $filter: String!) {
  orders(
    first: 100
    after: $after
    query: $filter
    sortKey: UPDATED_AT
  ) {
    nodes {
      id
      updatedAt
      test
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

```
{
  "after": null, // 首次为空，后续传上一页endCursor
  "filter": "updated_at:>=2026-10-01T00:00:00Z updated_at:<2026-10-02T00:00:00Z test:false" // 固定时间窗口及测试过滤
}
```

输出路径：`data.orders`。

```
{
  "nodes": [
    {
      "id": "<订单GID>", // 拉取详情使用
      "updatedAt": "<时间>", // 来源更新时间
      "test": false // 原生测试标记
    }
  ],
  "pageInfo": {
    "hasNextPage": true, // 为true时继续分页
    "endCursor": "<游标>" // 下一页after
  }
}
```

6.3 订单资金详情

```
query OrderFinance($id: ID!) {
  order(id: $id) {
    id
    name
    createdAt
    processedAt
    updatedAt
    test
    sourceName
    sourceIdentifier
    displayFinancialStatus
    paymentGatewayNames
    currencyCode
    presentmentCurrencyCode
    currentTotalPriceSet {
      ...MoneyBagFields
    }
    totalReceivedSet {
      ...MoneyBagFields
    }
    totalRefundedSet {
      ...MoneyBagFields
    }
    netPaymentSet {
      ...MoneyBagFields
    }
    totalOutstandingSet {
      ...MoneyBagFields
    }
    transactions {
      id
      kind
      status
      gateway
      formattedGateway
      manualPaymentGateway
      paymentId
      processedAt
      test
      parentTransaction {
        id
      }
      amountSet {
        ...MoneyBagFields
      }
      settlementCurrency
      settlementCurrencyRate
      fees {
        id
        type
        createdAt
        amount {
          amount
          currencyCode
        }
        taxAmount {
          amount
          currencyCode
        }
        flatFee {
          amount
          currencyCode
        }
        flatFeeName
        rate
        rateName
      }
    }
    refunds {
      id
    }
  }
}

fragment MoneyBagFields on MoneyBag {
  shopMoney {
    amount
    currencyCode
  }
  presentmentMoney {
    amount
    currencyCode
  }
}
```

```
{
  "id": "<真实订单GID>" // 来自订单发现或可靠来源关联
}
```

输出路径：`data.order`。

```
{
  "id": "<订单GID>", // 来源主键
  "name": "#1006", // 展示订单号
  "createdAt": "<时间>", // 下单时间
  "processedAt": "<时间>", // 订单处理时间，不代替交易扣款时间
  "updatedAt": "<时间>", // 订单更新时间
  "test": false, // 测试隔离依据
  "sourceName": "<来源>", // 下单来源，不直接等于结算主体
  "sourceIdentifier": null, // 来源系统标识，可为空
  "displayFinancialStatus": "PAID", // 订单财务展示状态
  "paymentGatewayNames": ["manual"], // 订单网关概览
  "currencyCode": "USD", // 店铺币种
  "presentmentCurrencyCode": "USD", // 客户支付币种
  "currentTotalPriceSet": "<MoneyBag>", // 当前业务总额，不是结算净额
  "totalReceivedSet": "<MoneyBag>", // 订单累计收款记录
  "totalRefundedSet": "<MoneyBag>", // 订单累计退款记录
  "netPaymentSet": "<MoneyBag>", // 来源收款减退款
  "totalOutstandingSet": "<MoneyBag>", // 订单未付余额，不是机构待结算余额
  "transactions": [], // 原生数组，不是游标连接
  "refunds": [] // 退款业务对象，不代表资金一定退款成功
}
```

金额结构：

```
{
  "shopMoney": {
    "amount": "100.00", // 店铺币种金额
    "currencyCode": "USD" // 店铺币种
  },
  "presentmentMoney": {
    "amount": "100.00", // 客户支付币种金额
    "currencyCode": "USD" // 客户支付币种
  }
}
```

交易字段：

```
{
  "id": "<交易GID>", // 交易去重和关联主键
  "kind": "SALE", // 交易动作
  "status": "SUCCESS", // 处理状态
  "gateway": "manual", // 原始网关值
  "formattedGateway": "<展示名>", // 展示用途
  "manualPaymentGateway": true, // 是否人工支付网关
  "paymentId": null, // 支付标识，不默认等于外部订单或批次号
  "processedAt": "<时间>", // 本笔交易处理时间
  "test": false, // 本笔测试标记
  "parentTransaction": {
    "id": "<父交易GID>" // 父交易；对象可为空
  },
  "amountSet": "<MoneyBag>", // 交易金额
  "settlementCurrency": null, // 结算币种，可为空
  "settlementCurrencyRate": null, // 结算转换汇率，可为空
  "fees": [] // Shopify Payments交易费用记录
}
```

费用字段：

```
{
  "id": "<费用GID>", // 来源费用ID
  "type": "<来源字符串>", // 原始费用名称，不是本系统固定枚举
  "createdAt": "<时间>", // 费用创建时间
  "amount": {
    "amount": "3.00", // 来源费用金额
    "currencyCode": "USD" // 费用币种
  },
  "taxAmount": {
    "amount": "0.00", // 费用税额，不未经核实重复加计
    "currencyCode": "USD" // 税额币种
  },
  "flatFee": {
    "amount": "0.30", // 固定收费部分
    "currencyCode": "USD" // 固定费币种
  },
  "flatFeeName": null, // 固定费名称
  "rate": "<来源费率>", // 百分比收费参数，单位转换需核实
  "rateName": null // 费率名称
}
```

`fees` 为空不证明所有费用为零。

`totalUnsettledSet` 是授权未扣款金额，不作为商家待打款金额。

6.4 商品、退款行和事件

商品查询：

```
query OrderLines($id: ID!, $after: String) {
  order(id: $id) {
    id
    lineItems(first: 100, after: $after) {
      nodes {
        id
        sku
        quantity
        currentQuantity
        originalTotalSet {
          shopMoney { amount currencyCode }
          presentmentMoney { amount currencyCode }
        }
        discountAllocations {
          allocatedAmountSet {
            shopMoney { amount currencyCode }
            presentmentMoney { amount currencyCode }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```
{
  "id": "<订单GID>", // 所属订单
  "after": null // 商品行分页游标
}
```

```
{
  "id": "<订单行GID>", // 商品行主键
  "sku": "<SKU或null>", // 可为空或重复
  "quantity": 1, // 来源商品行数量
  "currentQuantity": 1, // 当前数量，不单独证明退款资金成功
  "originalTotalSet": "<MoneyBag>", // 原始行金额
  "discountAllocations": [
    {
      "allocatedAmountSet": "<MoneyBag>" // 分配到该行的折扣
    }
  ]
}
```

退款行查询：

```
query RefundLines($id: ID!, $after: String) {
  refund(id: $id) {
    id
    refundLineItems(first: 100, after: $after) {
      nodes {
        lineItem {
          id
          sku
        }
        quantity
        subtotalSet {
          shopMoney { amount currencyCode }
          presentmentMoney { amount currencyCode }
        }
        totalTaxSet {
          shopMoney { amount currencyCode }
          presentmentMoney { amount currencyCode }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```
{
  "id": "<退款GID>", // 来自订单refunds
  "after": null // 退款行分页游标
}
```

退款行 `lineItem.id` 用于商品归属，`quantity` 是退款商品数量，`subtotalSet` 是商品退款小计，`totalTaxSet` 是对应税额。

整笔退款可能还包含运费等，不能只用商品小计代替。

事件查询：

```
query OrderEvents($id: ID!, $after: String) {
  order(id: $id) {
    events(first: 100, after: $after) {
      nodes {
        id
        createdAt
        message
        ... on BasicEvent {
          action
          secondaryMessage
          additionalData
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```
{
  "id": "<订单GID>", // 查询事件的订单
  "after": null // 事件分页游标
}
```

```
{
  "id": "<事件GID>", // 提示来源ID
  "createdAt": "<时间>", // 事件时间
  "message": "<原文>", // 完整保留原文
  "action": "<来源动作>", // 辅助识别
  "secondaryMessage": null, // 补充文案
  "additionalData": null // 不假设存在通用预计到账子字段
}
```

事件里的金额和日期属于来源提示，不直接确认实际费用、批次或银行到账。`receiptJson` 不作为稳定财务字段解析。

6.5 账户余额和打款计划

```
query PaymentsAccount {
  shopifyPaymentsAccount {
    id
    balance {
      amount
      currencyCode
    }
    payoutSchedule {
      interval
      weeklyAnchor
      monthlyAnchor
    }
  }
}
```

无查询变量。

```
{
  "id": "<账户GID>", // Shopify Payments账户ID
  "balance": [
    {
      "amount": "<金额>", // 当前账户余额，不是某订单应收
      "currencyCode": "USD" // 按币种分别保存
    }
  ],
  "payoutSchedule": {
    "interval": "WEEKLY", // 打款频率
    "weeklyAnchor": "FRIDAY", // 每周计划指定星期
    "monthlyAnchor": null // 每月计划指定日号
  }
}
```

该余额不是 Shopify Balance 产品余额，也不直接证明全部立即可提。

6.6 实际资金流水

```
query BalanceTransactions($after: String, $filter: String!) {
  shopifyPaymentsAccount {
    balanceTransactions(
      first: 100
      after: $after
      query: $filter
      hideTransfers: false
    ) {
      nodes {
        id
        type
        sourceType
        sourceId
        test
        transactionDate
        sourceOrderTransactionId
        associatedOrder {
          id
          name
        }
        amount { amount currencyCode }
        fee { amount currencyCode }
        net { amount currencyCode }
        associatedPayout {
          id
          status
        }
        adjustmentReason
        adjustmentsOrders {
          orderTransactionId
          name
          link
          amount { amount currencyCode }
          fees { amount currencyCode }
          net { amount currencyCode }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

发现流水：

```
{
  "after": null, // 分页游标
  "filter": "processed_at:>=2026-10-01T00:00:00Z processed_at:<2026-10-08T00:00:00Z" // 资金处理时间窗口
}
```

按真实批次补明细：

```
{
  "after": null, // 分页游标
  "filter": "payments_transfer_id:<真实legacyResourceId>" // 返回后继续校验associatedPayout.id
}
```

```
{
  "id": "<流水GID>", // 去重主键
  "type": "<原生类型>", // 活动类型
  "sourceType": "<来源类别或null>", // 辅助分类
  "sourceId": null, // 来源资源ID
  "test": false, // 测试标记
  "transactionDate": "<时间>", // 资金处理时间
  "sourceOrderTransactionId": null, // 来源订单交易数字ID
  "associatedOrder": null, // 明确关联订单，可为空
  "amount": "<MoneyV2>", // 来源金额
  "fee": "<MoneyV2>", // 来源费用
  "net": "<MoneyV2>", // 对账户的净影响
  "associatedPayout": {
    "id": null, // 尚未分配时可为空
    "status": "PENDING" // 尚未分配批次
  },
  "adjustmentReason": null, // 来源调整原因
  "adjustmentsOrders": [
    {
      "orderTransactionId": "<数字ID>", // 调整涉及的订单交易
      "name": "<名称>", // 来源名称
      "link": "<链接>", // 来源链接
      "amount": "<MoneyV2>", // 拆分金额
      "fees": "<MoneyV2>", // 拆分费用
      "net": "<MoneyV2>" // 拆分净额
    }
  ]
}
```

```
{
  "amount": "-10.00", // MoneyV2金额，保留来源正负号
  "currencyCode": "USD" // 币种
}
```

不编造按订单 ID 搜流水的过滤项。订单维度通过来源关联和本地索引查询。

`available_on` 是搜索过滤项，不等于已取得可直接读取的逐笔可用日期字段。

6.7 打款批次

```
query Payouts($after: String, $filter: String!) {
  shopifyPaymentsAccount {
    payouts(first: 100, after: $after, query: $filter) {
      nodes {
        id
        legacyResourceId
        issuedAt
        status
        transactionType
        externalTraceId
        net { amount currencyCode }
        summary {
          chargesGross { amount currencyCode }
          chargesFee { amount currencyCode }
          refundsFeeGross { amount currencyCode }
          refundsFee { amount currencyCode }
          adjustmentsGross { amount currencyCode }
          adjustmentsFee { amount currencyCode }
          advanceGross { amount currencyCode }
          advanceFees { amount currencyCode }
          reservedFundsGross { amount currencyCode }
          reservedFundsFee { amount currencyCode }
          retriedPayoutsGross { amount currencyCode }
          retriedPayoutsFee { amount currencyCode }
          usdcRebateCreditAmount { amount currencyCode }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

```
{
  "after": null, // 分页游标
  "filter": "issued_at:>=2026-10-01T00:00:00Z issued_at:<2026-11-01T00:00:00Z" // 签发时间窗口
}
```

```
{
  "id": "<Payout GID>", // 来源批次主键
  "legacyResourceId": "<数字ID>", // 获取该批次资金明细使用
  "issuedAt": "<时间>", // 签发时间，不是银行凭证时间
  "status": "SCHEDULED", // 原生批次状态
  "transactionType": "DEPOSIT", // 存入银行；WITHDRAWAL为从银行提取
  "externalTraceId": null, // 金融机构追踪号
  "net": "<MoneyV2>", // 整批金额和币种
  "summary": {
    "chargesGross": "<MoneyV2>", // 收款总额
    "chargesFee": "<MoneyV2>", // 收款费用
    "refundsFeeGross": "<MoneyV2>", // 退款总额，原生拼写如此
    "refundsFee": "<MoneyV2>", // 退款费用
    "adjustmentsGross": "<MoneyV2>", // 调整总额
    "adjustmentsFee": "<MoneyV2>", // 调整费用
    "advanceGross": "<MoneyV2>", // 来源advance总额，不并入商品销售额
    "advanceFees": "<MoneyV2>", // 来源advance费用
    "reservedFundsGross": "<MoneyV2>", // 准备金相关总额
    "reservedFundsFee": "<MoneyV2>", // 准备金相关费用
    "retriedPayoutsGross": "<MoneyV2>", // 重试打款相关总额
    "retriedPayoutsFee": "<MoneyV2>", // 重试打款相关费用
    "usdcRebateCreditAmount": "<MoneyV2>" // 来源USDC返利贷记金额
  }
}
```

汇总只用于核对，不作为另一套资金记录重复累计。不能未经符号和组成核实就将所有汇总字段机械相加减。

七、枚举、分流和测试规则

7.1 交易动作

```
SALE：直接收款，成功后按路径处理。
CAPTURE：授权扣款，成功后计收款。
AUTHORIZATION：授权，不计实际收款。
EMV_AUTHORIZATION：读卡授权，不计实际收款。
REFUND：退款，成功后计退款。
VOID：撤销授权，不直接计退款本金。
CHANGE：现金找零，独立处理。
SUGGESTED_REFUND：建议退款，不计实际退款。
```

7.2 交易状态

```
SUCCESS：处理成功，仍结合动作和路径。
PENDING：处理中。
AWAITING_RESPONSE：等待响应。
FAILURE：失败。
ERROR：异常。
UNKNOWN：未知。
```

只有适用动作且成功的交易进入对应收退款计算。

7.3 订单财务状态

```
PENDING：等待付款。
AUTHORIZED：已授权。
PARTIALLY_PAID：部分付款。
PAID：已付款，可能包含人工标记。
PARTIALLY_REFUNDED：部分退款。
REFUNDED：已退款。
VOIDED：支付撤销，不直接等于订单业务取消。
EXPIRED：授权等已过期。
```

7.4 资金来源类别

```
CHARGE：收款来源。
REFUND：退款来源。
DISPUTE：争议来源。
ADJUSTMENT：调整来源。
ADJUSTMENT_REVERSAL：调整冲回来源。
SYSTEM_ADJUSTMENT：系统调整来源。
TRANSFER：转账来源。
```

7.5 重点资金活动类型

```
CHARGE、CHARGE_ADJUSTMENT：
收款及收款调整。

REFUND、REFUND_ADJUSTMENT、REFUND_FAILURE：
退款、退款调整及失败相关活动。

DISPUTE_WITHDRAWAL、DISPUTE_REVERSAL：
争议扣出及冲回。

CHARGEBACK_FEE、CHARGEBACK_FEE_REFUND：
拒付费用及退回。

CHARGEBACK_HOLD、CHARGEBACK_HOLD_RELEASE：
拒付相关冻结及释放。

RESERVED_FUNDS、RESERVED_FUNDS_WITHDRAWAL、
RESERVED_FUNDS_REVERSAL：
准备金相关活动。

RISK_WITHDRAWAL、RISK_REVERSAL：
风险扣出及冲回。

CURRENCY_CONVERSION：
币种转换。

SHIPPING_LABEL、SHIPPING_LABEL_ADJUSTMENT：
物流面单及调整。

BILLING_DEBIT、BILLING_DEBIT_REVERSAL：
账单扣款及冲回。

REFERRAL_FEE、REFERRAL_FEE_TAX、STRIPE_FEE：
来源定义的相应费用类型。

ADJUSTMENT：
其他调整。

TRANSFER、TRANSFER_CANCEL、
TRANSFER_FAILURE、TRANSFER_REFUND：
转账及取消、失败、退回。
```

这些名称不直接构成完整会计规则。所有其他原生值也必须保存，未知类型进入待分类，不丢弃、不自动当费用。

7.6 资金路径

```
Shopify Payments：
进入实际流水和Payout跟踪。

外部平台内成交并代收：
不生成Shopify Payments应收。

外部引流到Shopify网站付款：
按实际网关处理。

独立第三方网关：
按已确认集成确定结算方。

人工付款：
等待实际收款方式与凭证。

非现金抵扣：
进入抵扣账，不生成新的银行打款应收。

未知：
待确认，不默认归Shopify Payments。
```

Amazon MCF 是履约，不证明 Amazon 收款。PayPal Wallet 和独立 PayPal Express 不能统一按品牌分流。

7.7 测试剔除

```
Order.test为true：整单隔离。
OrderTransaction.test为true：本交易隔离。
资金流水test为true：本流水隔离。
标记冲突：提示核实。
```

内部演练另设经审计的排除标记，不修改原生测试值。

八、计算公式与字段取值

本节公式统一使用中文字段名及正常运算符。

8.1 通用金额规则

```
内部收款本金、退款本金、费用支出、费用返还：
按正数分类展示。

其他调整及净额：
保留资金方向。

原始数据：
保留来源正负号，不覆盖。

未知金额：
保存null，不填0。

不同币种：
分别计算。
```

所有金额使用 Decimal，并按货币最小单位舍入。

8.2 订单记录净支付

```
订单记录净支付 = 订单累计收款金额 - 订单累计退款金额
```

取值：

```
订单累计收款金额：
Order.totalReceivedSet.shopMoney.amount

订单累计退款金额：
Order.totalRefundedSet.shopMoney.amount

来源直接返回的记录净支付：
Order.netPaymentSet.shopMoney.amount

币种：
对应shopMoney.currencyCode
```

客户支付币种分析时统一改取 `presentmentMoney`，不能交叉使用。

该公式用于订单记录校验，不代表实际结算净额。

8.3 本渠道成功收款金额

```
本渠道成功收款金额 = 符合条件的交易金额合计
```

条件及取值：

```
数据源：
Order.transactions

交易状态：
status为SUCCESS

交易动作：
kind为SALE或CAPTURE

测试：
test为false，且订单未被排除

渠道：
交易命中本行已确认资金路径

金额：
amountSet.shopMoney.amount
或同一口径的presentmentMoney.amount
```

同一交易 ID 只计一次。授权不能和扣款重复计算。

8.4 本渠道成功退款金额

```
本渠道成功退款金额 = 符合条件的退款交易金额合计
```

取值：

```
数据源：
Order.transactions

状态：
SUCCESS

动作：
REFUND

金额：
amountSet中选定币种金额

路径：
优先结合parentTransaction及实际映射确认
```

退款业务对象用于商品和业务归属，不能再与成功退款交易重复累计金额。

8.5 预计手续费

```
预计手续费 =
计费基数 × 已核实费率
+ 适用交易笔数 × 已核实每笔固定费
+ 已确认适用附加费用
```

取值：

```
计费基数：
内部费用规则指定的成功交易金额范围。

已核实费率、固定费、附加费用：
有依据的账户费率或合同配置【建议新增】。

来源交易费参数：
OrderTransaction.fees.rate、flatFee等。
只能在已核实适用性后作为相应规则依据，
不能直接推广到其他支付方式或历史期间。
```

必须保存适用支付方式、币种、计费基数、税额口径、生效期及版本。

税额已经含在费用中时不得再次加入。参数不足则预计费用为空。

8.6 预计结算净额

```
预计结算净额 =
本渠道成功收款金额
- 本渠道成功退款金额
- 预计应扣费用
+ 预计费用返还
+ 其他预计有符号调整
```

取值：

```
成功收款和退款：
按8.3、8.4计算。

预计应扣费用：
按8.5或已取得的适用费用明细计算。

预计费用返还：
必须有已核实规则或明确记录。

其他预计调整：
有明确依据的内部预测调整【建议新增】。
```

没有证据不能默认“退款退手续费”。必要费用缺失时预计净额为空。

8.7 订单已识别实际资金净影响

```
订单已识别实际资金净影响 =
明确归属该订单的非转账资金净贡献合计
```

取值优先：

```
直接归属：
BalanceTransaction.net.amount

多订单调整拆分：
adjustmentsOrders.net.amount
```

订单归属依据：

```
associatedOrder.id
sourceOrderTransactionId
adjustmentsOrders.orderTransactionId
```

父流水和拆分不能重复加总。

`net` 已包含本条费用影响，不能再减 `fee`。

此金额可能包含准备金和争议，不能命名为利润。存在覆盖缺口时不称“最终结算净额”。

8.8 批次核对应结净额

```
批次核对应结净额 =
批次收款本金
- 批次退款本金
- 批次费用支出
+ 批次费用返还
+ 批次其他有符号资金调整
```

实际计算基础：

```
同一associatedPayout.id下，
经过类型和符号规则验证的非转账资金净贡献。
```

取值：

```
批次关系：
BalanceTransaction.associatedPayout.id

资金金额：
amount、fee、net

分类：
type、sourceType、adjustmentReason

币种：
对应MoneyV2.currencyCode
```

必须包含账户级活动。类型未解释、漏页或未完整取得时标“暂算”。

8.9 结算差异

```
结算差异 = 机构批次金额 - 批次核对应结净额
```

取值：

```
机构批次金额：
Payout.net.amount
或真实外部结算单金额。

批次核对应结净额：
8.8计算值。
```

方向需统一后比较，保留来源原始金额。数据不完整不直接判定少付。

8.10 银行核销净额与到账差异

```
银行核销净额 =
已确认关联银行收款 - 已确认关联银行扣款
```

```
到账差异 = 银行核销净额 - 机构已打款净额
```

取值：

```
银行收付款：
已导入并确认的银行凭证。

核销分配：
本系统确认的凭证分配金额【建议新增】。

机构已打款净额：
适用已完成打款记录，统一方向后的金额。
```

银行金额不能取 `Payout.net` 代填。

没有银行证据时两个结果为空。跨币种另行处理换汇和费用，不直接相减。

8.11 凭证可用余额

```
银行凭证剩余可用金额 =
银行凭证金额 - 已确认分配核销金额
```

取值均来自内部凭证及核销记录【建议新增】。

分配不得超过可用余额。同一张凭证不能重复全额核销多个批次。

8.12 费用未付金额

```
已确认未付金额 =
已确认账单金额
- 已确认付款金额
- 已确认余额扣款金额
- 已确认抵免金额
```

取值：

```
账单金额：
真实账单及明细。

付款金额：
真实付款凭证。

余额扣款：
明确匹配本账单的资金扣款证据。

抵免：
真实抵免或冲回记录。
```

没有账单匹配的 `BILLING_DEBIT` 不能随意扣减某张账单。

付款覆盖未知，未付金额为空。超付单独处理。

8.13 商品折后金额和分摊

```
商品原始折后金额 =
originalTotalSet金额 - discountAllocations金额合计
```

来源：

```
LineItem.originalTotalSet
LineItem.discountAllocations.allocatedAmountSet
```

实际分摊需采用与付款范围一致的商品快照。订单编辑或退款后，不能把原始历史金额直接当当前有效金额。

```
商品现金分摊池 =
本渠道成功现金收款
- 已明确分离的运费、税费及其他部分
```

```
商品分摊权重 =
商品可分摊折后金额 ÷ 全部可分摊商品折后金额合计
```

```
商品分摊收款 = 商品现金分摊池 × 商品分摊权重
```

```
商品分摊净额 =
商品分摊收款
- 商品实际退款
- 商品分摊费用
+ 商品费用返还
+ 明确归属商品的调整
```

来源：

```
商品退款归属：
RefundLineItem.lineItem.id

商品退款数量：
RefundLineItem.quantity

商品退款金额：
subtotalSet及适用税额口径

支付费用分摊：
内部批准规则【建议新增】
```

实际资金退款是否成功仍按交易确认。

分母为零、混合支付无法拆分或运费税费未明确时，停止完整净额分摊并提示原因。

九、打款计划及日期公式

9.1 原生计划枚举

```
DAILY：每日工作日。

WEEKLY：按weeklyAnchor指定星期。

MONTHLY：按monthlyAnchor指定日号。

MANUAL：不自动打款。
```

29 至 31 日遇到短月按月末处理，再按适用工作日规则处理。

原生字段：

```
shopifyPaymentsAccount.payoutSchedule.interval
shopifyPaymentsAccount.payoutSchedule.weeklyAnchor
shopifyPaymentsAccount.payoutSchedule.monthlyAnchor
```

地区最低周期不等于当前账户每笔保证周期，打款计划也不等于资金可用周期。

9.2 预测字段【建议新增】

```
{
  "settlementLagBusinessDays": null, // 已核实适用资金可用工作日数
  "settlementRuleSource": "UNKNOWN", // 账户确认、地区基线或未知
  "processorCalendarId": null, // 处理机构工作日历
  "processorTimeZone": null, // 已核实处理时区
  "cutoffRuleId": null, // 截点规则
  "bankCalendarId": null, // 银行工作日历
  "bankLagMin": null, // 预计最短银行处理工作日数
  "bankLagMax": null, // 预计最长银行处理工作日数
  "ruleVersion": "<版本>" // 预测追溯版本
}
```

普通外部银行一般处理时长可作为估算依据，不自动套用所有账户类型。

9.3 预计可打款日

```
成功扣款处理日 =
成功SALE或CAPTURE的processedAt
按处理时区、截点和工作日历归一后的日期
```

```
预计可打款日 =
工作日顺延（成功扣款处理日，适用资金可用工作日数）
```

取值：

```
成功扣款时间：
OrderTransaction.processedAt。

适用周期：
已核实账户规则；
只有地区基线时标低置信度。

日历及时区：
内部已验证规则【建议新增】。
```

起始日定义为第零天。不用 `Order.createdAt` 作为起点。

9.4 预计发起打款日

```
预计发起打款日 =
取下一适用计划日（预计可打款日，账户打款计划）
```

规则：

```
每日：取符合条件的工作日。

每周：取不早于可用日的指定星期计划日。

每月：取不早于可用日的指定日号计划日。

人工：无实际发起依据时不自动预测。
```

同日能否赶上打款受截点影响。未核实则输出范围或低置信度，不输出保证时间。

这是内部预测，不是完整复制 Shopify 调度。实际可能提前或同一天产生多笔。

9.5 预计到账区间

```
预计到账开始日 =
工作日顺延（预计发起打款日，银行最短处理工作日数）
```

```
预计到账结束日 =
工作日顺延（预计发起打款日，银行最长处理工作日数）
```

已有真实签发信息时，可据此更新银行区间，但 `issuedAt` 不等于银行凭证到账时间。

9.6 实际时间和来源提示

```
实际银行到账时间：
真实银行证据。

实际签发时间：
Payout.issuedAt。

预计时间：
内部预测或已明确验证的机构日期来源。

来源事件提示：
事件原文及其解析结果。
```

不把事件日期或预计日期覆盖为实际日期。

9.7 预测暂停与聚合

已知冻结、限制、负余额阻断、最低金额条件未满足、失败未处理等情况暂停正常预测。

```
订单最早预计到账 =
未完成资金段预计到账开始日的最小值
```

```
订单最晚预计到账 =
未完成资金段预计到账结束日的最大值
```

部分未知则标“部分时间未知”。退款与正向收款分开预测。

十、关联和防重规则

关联优先级：

```
associatedOrder.id → 订单。

sourceOrderTransactionId → 交易 → 订单。

adjustmentsOrders.orderTransactionId → 拆分关联订单。

associatedPayout.id → 批次。
```

数字 ID 与 GID 规范化匹配，原值保留。

禁止：

```
按金额日期相近直接确认归属。

把账户级费用分摊当成原生直接归属。

父调整和拆分同时累计。

交易fees和流水fee重复扣除。

资金账已记录转账后，再减一次Payout。

重试批次产生第二份销售收入。
```

批次先到、明细或订单后到时保留批次并标数据不完整，继续补拉，不能断言无关联订单。

十一、费用与应付闭环

费用来源：

```
交易费用明细。

实际资金流水收费活动。

真实商家账单。

内部预测规则。
```

处理：

```
取得记录
→ 确认资金影响
→ 确认费用性质
→ 确认归属
→ 匹配账单
→ 核对已扣已付
→ 确认未付余额
```

例如 `BILLING_DEBIT`：

```
可以确认来源余额发生相应扣款。

未取得账单：
显示“账单扣款，明细待核对”。

不能直接认定为Amazon连接器佣金。

不能再自动生成同额待付费用。
```

账期费用分摊到订单只是成本分析，不新增总费用或应付。

连接器费用是否适用、免费额度、封顶和实际金额按已核实规则及账单确认，不因外部订单标签自动计费。

本方案不把应用自身收费 API 当成可读取商家全部 Shopify 与应用账单的通用接口。未覆盖部分通过真实账单补充。

十二、状态体系与流转

12.1 原生批次状态

```
SCHEDULED：已创建并分配交易，尚未提交银行。
PAID：来源报告已成功存入银行。
FAILED：银行拒绝。
CANCELED：已取消。
IN_TRANSIT：废弃值，兼容处理中。
```

流水关联状态另含：

```
PENDING：尚未分配Payout。
ACTION_REQUIRED：需要处理后才能打款。
```

`PENDING` 不解释为“已有批次待发起”。

12.2 资金进度【建议新增】

```
ROUTE_UNKNOWN：路径待确认。
WAITING_LEDGER：资金明细待同步。
UNASSIGNED：待分配打款批次。
PAYOUT_SCHEDULED：已安排打款。
PAYOUT_IN_TRANSIT：打款处理中。
PROVIDER_PAID：机构报告已入账。
ACTION_REQUIRED：需处理。
PAYOUT_FAILED：打款失败。
PAYOUT_CANCELED：打款取消。
EXTERNAL_DATA_REQUIRED：外部结算数据待补。
MANUAL_EVIDENCE_REQUIRED：人工收款凭证待补。
NOT_APPLICABLE：不适用机构打款。
```

来源异常优先保留，不因缺批次关联而覆盖 `ACTION_REQUIRED`。

12.3 结算核对状态【建议新增】

```
DATA_INCOMPLETE：明细或分类不完整。
TO_CHECK：待核对。
MATCHED：按批准精度一致。
DIFFERENCE：有未解释差额。
RESOLVED：差异已有证据及批准处理。
NOT_APPLICABLE：不适用。
```

差异处理不修改来源金额。

12.4 银行核销状态【建议新增】

```
NO_EVIDENCE：未取得凭证。
TO_MATCH：有候选凭证待确认。
PARTIAL：部分核销。
MATCHED：已核销。
DIFFERENCE：已确认到账差异。
NOT_APPLICABLE：不适用。
```

12.5 预测状态【建议新增】

```
INSUFFICIENT_DATA：数据不足。
VALID：有效预测。
LOW_CONFIDENCE：低置信度。
PAUSED：暂停。
OVERDUE：预计已超期。
SUPERSEDED：被实际替代。
NOT_APPLICABLE：不适用。
```

12.6 流转逻辑

```
成功Shopify Payments扣款
    ↓ 无匹配流水
资金明细待同步
    ↓ 取得流水，无批次
待分配打款批次
    ↓ 来源安排批次
已安排打款
    ↓ 来源PAID
机构报告已入账
    ↓ 银行凭证确认
部分核销或已核销
```

首次同步可直接取得完成状态，不强制补演中间过程。

预计日期到期只改变预测状态，不改变实际资金状态。

失败、取消、重试保留各次来源记录。

12.7 订单聚合

```
未分配：相关活动均未分配。
部分分配：部分有批次。
全部分配：当前相关活动均有批次。
部分完成打款：部分完成，部分未完成。
当前已知活动完成：当前覆盖范围内均完成。
```

按资金段覆盖判断，不按净额为零判断。异常数量独立显示。

十三、页面模块：应收账款列表页整体

页面顶部保留图片结构。

结算对账区域包含：

```
工具栏：同步、导出、录入结算、列设置。

视图：结算批次、订单、SKU。

筛选：随视图变化。

列表：随视图变化。

页脚：同币种汇总、数据完整性、分页。
```

顶部指标建议新增：

```
待分配资金。
已安排打款。
机构报告已入账但未核销。
外部待补订单数及记录净支付。
人工收款待凭证。
待处理差异。
```

外部记录净支付不并入 Shopify Payments 应收。

图片里的 DSO 若没有赊销和应收定义，本期不直接计算，不能用支付机构打款等待天数代替。

十四、页面模块：结算批次视图

页面定位：实际批次的组成核对和银行核销。

内部预测默认不混入真实批次。需要同屏展示时增加“实际／预计”类型列。

筛选：

```
店铺、实际结算主体、销售来源、币种、资金方向。
资金进度、核对状态、核销状态。
来源类型、日期类型及范围、ERP状态。
```

字段：

```
结算单号
内部编号，点击详情。

来源批次号【建议新增】
Payout.id或真实外部编号。

店铺
内部店铺档案。

实际结算主体【建议新增】
资金路径映射。

明细归属期间
已取得非转账transactionDate最早至最晚日期。
不完整时标“当前已取得期间”。

订单数
明确关联订单ID去重数。

待匹配明细数【建议新增】
需要匹配但尚未完成的明细。
合法账户级活动不算匹配失败。

收款本金
批次实际收款本金。

退款本金【建议新增】
批次实际退款本金。

费用及费用返还
分列或展开显示。

其他资金调整【建议新增】
准备金、争议及其他活动。

核对应结净额
按第八节公式，必要时标暂算。

机构批次金额【建议新增】
Payout.net或真实外部金额。

结算差异
机构批次金额减核对应结。

银行核销金额
实际确认凭证分配。

到账差异【建议新增】
按银行公式。

预计发起日、预计到账区间【建议新增】
带预测依据。

签发时间
issuedAt。

资金进度、结算核对、银行核销
三列独立。

ERP同步
未推送、推送中、成功、失败。
```

图片中的“结算周期”改名“明细归属期间”。金额列不混放预计日期。

按钮条件：

```
查看：始终可用。

补充明细：存在数据缺口。

处理差异：有未处理差异。

匹配银行：具备适用资金记录及可用凭证。

重试ERP：推送失败。

关闭当前核对：达到关闭标准。
```

页脚同币种汇总。未知不作零，预测和暂算单独标识。

十五、页面模块：批次新增弹窗

入口“录入结算”打开类型选择。

15.1 实际结算单

字段：

```
店铺：必填。
实际结算主体：必填。
币种：必填。
资金方向：必填。
来源结算编号：来源有编号时必填。
机构实际金额：必填。
来源签发时间：来源有则填。
来源文件或凭证：必填。
归属期间：优先按明细生成。
备注：选填。
```

明细字段：

```
来源明细ID、外部订单号、内部订单ID。
来源交易ID、活动类型、处理时间、币种。
收款本金、退款本金、费用、费用返还。
其他调整、来源净额。
```

流程：

```
上传 → 字段映射 → 校验 → 去重
→ 匹配预览 → 差异预览 → 确认导入
```

```
导入明细净额 =
收款本金 - 退款本金 - 费用 + 费用返还 + 其他调整
```

```
导入差异 = 来源批次金额 - 导入明细净额
```

只有汇总允许保存，但数据不完整。未找到订单保留待匹配。

15.2 预计结算计划【建议新增】

字段：

```
店铺、主体、币种。
关联未分配资金段。
预计金额、预计发起日、预计到账区间。
规则版本和依据。
```

不填写虚假 Payout ID，不进入真实批次金额。实际到达后建立替代关系。

15.3 人工收款凭证【建议新增】

字段：

```
实际方式、收款账户。
金额、币种、实际时间。
参考号、附件。
关联订单、本次核销金额、备注。
```

不生成 Shopify Payments 批次。超过凭证可用金额禁止提交核销。

十六、页面模块：批次详情

由列表“查看”打开，不新增一级菜单。

页签或分区：

```
概览
来源ID、主体、金额、方向、原生及内部状态、
签发时间、追踪号、同步时间。

金额核对
本金、退款、费用、返还、调整、
核对应结、机构金额及结算差异。

订单及流水
订单、交易、流水ID、类型、时间、金额、
费用、net、关联依据及分类状态。

预测依据
计划快照、周期来源、日历、截点、版本、
置信度、来源提示和实际时间。

银行核销
凭证、分配金额、剩余金额、确认人和差异。

费用及账单证据
实际费用、账单关联、已扣款及未付情况。

审计及ERP
同步、人工处理、来源版本和推送记录。
```

账户活动单独分组。调整父记录展开拆分，但不重复合计。

十七、页面模块：订单视图

一行建议对应“订单、结算主体、币种”。混合支付展开。

字段：

```
订单号：Order.name。
销售来源：sourceName及已核实映射。
收款路径【建议新增】：逐笔交易识别。
履约方：单独展示，不推断结算主体。
商品摘要：多商品摘要。
数量及退款数量：分别显示。
订单记录收款：totalReceivedSet。
本渠道收款和退款【建议新增】：成功交易汇总。
预计费用：规则计算。
实际已识别费用：实际证据，标覆盖情况。
预计结算净额：内部预测。
实际资金净影响【建议新增】：明确归属流水net。
所属批次：支持多个。
本批次贡献：展开批次关系时显示。
资金进度、核对状态、核销状态：分别显示。
预计到账区间：未完成资金段聚合。
下单时间：createdAt。
成功扣款时间【建议新增】：交易processedAt。
数据完整性【建议新增】：完整、部分、待核实。
```

同一订单多渠道行时，订单总金额不在页脚重复累计。

筛选支持人工付款、外部待补、多批次、实际费用缺失和预计超期。

十八、页面模块：订单详情

分区：

```
订单与商品
订单金额、商品、折扣、运费、税费和退款商品。

支付资金段
动作、状态、网关、金额、时间及父交易。

实际资金活动
收退款、费用、争议、准备金、调整。

批次关系
每批次及本单净贡献、来源状态、核销进度。

凭证、费用和异常
人工证据、外部缺口、账单关联、预测、审计。
```

来源状态与内部状态同时保留。

没有费用记录显示“尚未取得”，不显示“实际费用零”。

完成显示“当前已知活动完成”，不承诺以后不会再发生退款或争议。

十九、页面模块：SKU 视图

定位：内部商品资金与成本分摊，不是 Shopify 原生 SKU 结算账。

主键：店铺、订单 ID、订单行 ID。

字段：

```
订单号、订单行ID、SKU、商品名称。
销售数量、当前数量、退款数量。
适用商品折后金额、商品退款金额。
内部收款分摊、费用分摊、净额。
关联批次。
分摊规则版本【建议新增】。
尾差处理【建议新增】。
```

取值和公式使用第八节。

退款优先按 `RefundLineItem.lineItem.id`。无法归属的运费退款、费用返还或调整单列，不强摊。

图片中退款本金与净额不同，必须能展开对应返还或调整；无法解释显示差额待核实。

二十、页面模块：费用证据与应付弹窗

通过批次或订单详情“费用及账单”打开，本期不新增费用一级菜单。

字段：

```
收费主体、账单主体。
账单号、账单行、账期。
费用类型、原始描述、币种。
预计金额、已确认金额。
已付款、已扣余额、已抵免。
已确认未付。
关联性质及证据状态。
```

费用确认状态：

```
待确认。
预计费用。
已确认。
已撤销或冲回。
```

付款状态：

```
未知。
未付。
部分支付。
已支付。
超付或待处理抵免。
不适用。
```

关联性质：

```
来源直接关联。
账期级费用。
内部成本分摊。
关联待确认。
```

实际账单和预计费用分别录入。订单成本分摊不新增第二笔应付。

二十一、页面模块：银行核销及差异弹窗

银行字段：

```
账户、币种、方向、金额。
实际入账时间、参考号、附件。
已分配、剩余可用。
匹配对象、确认人和时间。
```

匹配建议可以参考金额、日期和追踪号，但正式核销必须有明确确认，不能自动当证据完成。

差异原因：

```
来源明细未齐。
重复或错误匹配。
费用未识别。
账户调整遗漏。
准备金或争议影响。
已确认银行费用。
换汇待核实。
已确认舍入。
实际短付或超付。
其他待调查。
```

处理动作：

```
等待数据。
解除错误匹配。
补充证据。
记录批准处理。
重新核对。
```

不能为关闭流程修改机构或银行来源金额。

二十二、规则配置与系统字段

本期可作为设置弹窗或后台配置能力，不额外扩展应收页面导航。

配置范围：

```
渠道映射：
店铺、gateway、集成、结算主体、生效期、依据。

预测：
周期、时区、截点、工作日历、银行区间、版本。

费用：
基数、费率、固定费、适用条件、
免费额度、封顶、税额口径、退款规则、版本。
```

原生打款计划只读同步。内部参数明确标内部配置。

核心内部字段示例：

```
{
  // 以下全部为建议新增
  "paymentSegmentId": "<ID>", // 资金段主键
  "settlementOwner": "<主体>", // 实际结算主体
  "currency": "USD", // 计算币种

  "recordedPaymentNet": null, // 来源订单记录净支付
  "estimatedSettlementNet": null, // 预计净额
  "identifiedActualNet": null, // 已识别实际资金影响

  "expectedBatchNet": null, // 批次重算金额
  "providerBatchNet": null, // 机构批次金额
  "settlementDifference": null, // 结算差异
  "bankMatchedNet": null, // 银行核销净额
  "bankDifference": null, // 到账差异

  "estimatedAvailableDate": null, // 预计可打款日
  "estimatedPayoutDate": null, // 预计发起日
  "estimatedArrivalFrom": null, // 预计到账开始
  "estimatedArrivalTo": null, // 预计到账结束
  "actualBankReceivedAt": null, // 银行实际时间

  "fundProgress": "WAITING_LEDGER", // 资金进度
  "settlementCheckStatus": "DATA_INCOMPLETE", // 核对状态
  "bankMatchStatus": "NO_EVIDENCE", // 核销状态
  "predictionStatus": "INSUFFICIENT_DATA", // 预测状态

  "completenessStatus": "PARTIAL", // 完整性
  "predictionRuleVersion": null, // 预测版本
  "payoutScheduleSnapshot": null, // 使用的计划快照
  "evidenceIds": [], // 来源及凭证
  "lastReconciledAt": null // 最近核对时间
}
```

二十三、同步、幂等和历史修正

同步任务独立执行：

```
订单及详情。
商品、退款行和事件。
账户及计划。
余额流水。
Payout及批次明细。
未完成记录回查。
历史复核。
文件和凭证导入。
```

要求：

```
所有连接完整分页。

固定窗口，成功落库后推进水位。

使用重叠窗口防漏。

来源ID幂等，导入文件防重。

保存原始响应、版本、时间和错误。

字段失败不清零已有金额。

关联、费用和状态变化后重算受影响视图。

已完成记录出现新活动时追加处理。

历史预测、规则和人工修改保留版本。
```

建议内部默认调度：

```
订单及资金发现：每十五分钟。
未完成及异常回查：每小时。
账户计划：每日及已知变更后。
历史复核：每日。
```

这些是内部建议，不是 Shopify 数据更新保证。

已锁定账期收到迟到活动时，保存原业务日期和本次处理日期，形成修正记录，不静默改写历史导出。

二十四、异常出口和完成标准

异常：

```
测试冲突：隔离核实。
路径未知：待映射。
外部无结算：待补证据。
费用缺失：回查，不补零。
费用不明：保留资金，待分类。
订单缺失：按明确ID补拉。
批次不平：查漏页、币种、调整、转账和迟到数据。
付款未知：未付金额未知。
来源已入账无银行凭证：待核销。
预计超期：检查真实状态，不自动认定损失。
失败重试：保留过程、防重记收入。
```

完成标准：

```
结算核对完成：
明细及分类覆盖完整，
金额一致或差异已批准处理。

银行核销完成：
凭证分配已确认，
金额一致或差异已批准处理。

应付完成：
账单和支付覆盖明确，
无未解释余额及重复扣费。

订单当前活动完成：
当前相关资金段均完成适用流程。
```

允许同时显示：

```
机构报告已入账｜银行已核销｜结算有差异
```

银行收到机构实际打款，不代表机构应结金额没有问题。

二十五、真实案例和图片应用

25.1 人工付款 `#1006`

已知：

```
订单ID：7258937851952。
来源：shopify_draft_order。
状态：PAID。
交易：manual、SALE、SUCCESS。
订单及交易test：false。
记录收款：31,000 USD。
记录退款：0 USD。
事件：人工标记付款。
```

展示：

```
记录收款：31,000 USD。
资金进度：人工收款凭证待补。
Shopify Payments应收：不适用。
预计Shopify打款及到账：不适用。
银行核销：未取得凭证。
费用应付：无证据，不生成。
```

如果属于内部演练，通过人工排除及审计处理，不改原生测试值。

25.2 Amazon `#ZEN-25771`

已知：

```
订单ID：18940946514133。
Amazon参考号：113-7072249-8235424。
来源及网关：amazon。
交易：SALE、SUCCESS。
记录收款及净支付：24.99 USD。
快照没有退款。
```

展示：

```
Amazon记录收款：24.99 USD。
Shopify Payments应收：不适用。
资金进度：外部结算数据待补。
实际Amazon费用、净额和批次：未知。
预计净额：缺少费用依据时为空。
相关Shopify或应用费用：未确认，不自动应付。
```

25.3 Shopify Payments `#5308`

已知：

```
成功CAPTURE：84.90 USD。
AUTHORIZATION：不重复计收款。
事件提示：81.80 USD加入某日打款。
```

展示：

```
记录收款：84.90 USD。
无实际流水：资金明细待同步。
81.80及日期：来源提示。
差额3.10：不直接认定实际费用。
取得流水及批次后：按真实关联推进。
银行核销：独立等待凭证。
```

25.4 图片中的 Shopify 批次

```
核对应结净额 = 41,200.00 - 2,380.00 = 38,820.00
```

如果 `38,777.50` 来自机构批次：

```
结算差异 = 38,777.50 - 38,820.00 = -42.50
```

如果它来自银行，先记录银行金额，必须取得机构金额后才能计算到账差异。

不能因截图列名为“银行到账”，就把 `Payout.net` 直接填进去。

二十六、验收范围

```
正常收款至银行核销。
测试隔离及标记冲突。
授权、失败、待响应、建议退款。
人工标记付款但无凭证。
混合支付、非现金、部分付款、现金找零。
平台代收与引流网站付款。
同品牌不同集成。
仅外部履约、不外部收款。
外部仅订单记录。
外部仅结算汇总、无明细。
订单晚于流水到达。
多次扣款、多批次、跨批退款。
商品退款与资金退款不同步。
多订单调整、账户级活动。
准备金、争议、冲回。
未知类型不丢失。
未完成分页不误判完整。
转账与Payout不重复。
失败重试不重复收入。
事件日期过期但无真实批次。
交易费用、流水费用和账单防重。
余额已扣费不再次待付。
付款未知不默认全额未付。
账期分摊不重复增加费用。
凭证不得超额或重复核销。
跨币种不直接算差异。
规则变更保留预测版本。
完成后新增退款和争议。
ERP失败不改变资金状态。
```
