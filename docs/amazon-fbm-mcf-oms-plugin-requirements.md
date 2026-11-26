# Amazon FBM 自履约与转 MCF：OMS 与 APP 插件对接需求

- **文档状态**：需求基线 / 待真实接口设计评审
- **适用范围**：Amazon FBM（MFN）商家自履约、FBM 转 Amazon MCF 履约
- **参与系统**：OMS、Amazon APP 插件、Amazon Seller Central / MCF、可选 WMS/3PL
- **核心对象**：SO（Sales Order）、Fulfillment、Outbound、Shipment、Warehouse、Product Mapping
- **重要边界**：本文不把本地模拟适配器当作真实 Amazon 接口。真实接入必须由 APP 插件持有授权凭证并调用 Amazon；OMS 不保存 Amazon 密钥。

---

## 1. 背景与目标

### 1.1 业务背景

Amazon 订单进入 OMS 后，订单可能有两种履约路径：

1. **FBM 自履约**：商家从自有仓或已连接的 3PL 仓库发货，由 OMS/WMS 执行拣货、打包和出库，再把发货结果回传 Amazon。
2. **FBM 转 MCF**：订单原本是 FBM/MFN 订单，但商家决定使用 Amazon FBA 库存和 Multi-Channel Fulfillment（MCF）配送。OMS 仍保留原 SO，创建一个平台仓出库单，由 Amazon APP 插件提交 MCF 请求并同步结果。

两条路径共享同一套 OMS 业务对象，不能各自创建一套孤立的“Amazon 订单”或“MCF 订单”。

### 1.2 目标

- SO 是客户订单事实来源。
- 每次实际履约必须产生一个 OMS Fulfillment。
- 每个执行仓库的履约计划必须产生一个 OMS Outbound。
- 每次 Amazon 或承运商产生的独立发运结果必须产生或幂等更新一个 OMS Shipment。
- Warehouse 决定执行路由，但不能仅靠仓库名称判断；平台仓必须绑定 APP、能力、连接和外部仓库资源。
- Product Mapping 决定 OMS 商品如何转换为 Amazon Seller SKU，不允许用 OMS SKU 猜测或替代。
- APP 插件负责 Amazon 授权、Amazon API 转换、外部状态同步和 webhook/polling；OMS 负责业务主数据、状态机、数量与金额不变量及用户操作界面。
- FBM 自履约与 FBM 转 MCF 均可按订单行、按数量拆分，并保证数量不重复履约、不丢失、不超卖。

### 1.3 非目标

本期不包含：

- 原生 AFN/FBA 客户订单的完整平台售后；
- FBA 入库补货计划、分仓货件、移除和索赔；
- 真实承运商面单购买；
- 用 OMS 出库单直接代替 Amazon MCF API 请求；
- 用户在 OMS 输入 Amazon 密钥、刷新令牌或店铺密码。

---

## 2. 核心业务原则

1. **SO 不被改造成 MCF 单据**：SO 的渠道来源仍是 Amazon，原订单类型仍为 FBM/MFN；MCF 是本次履约的执行方式。
2. **Out­bound 是 OMS 的执行主单**：自有仓和 MCF 都必须先有 OMS Outbound。
3. **Shipment 是发运事实**：APP 回传承运商、跟踪号、发运数量或包裹后，OMS 创建/更新 Shipment；不能只更新 Outbound 的文本字段。
4. **一个 Outbound 可以有多个 Shipment**：支持 Amazon 部分发货、拆包、多个跟踪号和多个承运商。
5. **一个 Shipment 只能被幂等识别一次**：优先使用 Amazon package/shipment ID；没有外部 ID 时使用插件生成的稳定幂等键，不能用每次 webhook 到达时间生成新记录。
6. **状态由事实驱动**：提交受理不等于已发货；有跟踪号也不一定等于 Amazon 已确认发运。
7. **取消先确认再释放**：撤回/取消在外部确认前不能释放预占，也不能创建替代履约。
8. **外部结果未知时禁止盲目重试**：先用原始请求 ID 查询/核实；只有明确失败或明确取消后才允许新建请求。
9. **绑定决定路由**：平台仓绑定 `appId + connectionId + capability + site + externalWarehouseId`；不根据“FBA”或“Amazon”名称猜测。
10. **作用域隔离**：租户、公司、商家、连接、仓库、商品映射和出库单必须属于同一业务作用域。

---

## 3. 领域对象与关系

```text
Amazon 渠道订单
      │
      ▼
SO（Sales Order）
      │ 1:N，按行/数量拆分
      ▼
Fulfillment（履约任务）
      │ 1:1 对应本次执行仓的 OMS 出库主单
      ▼
Outbound（OMS 出库单）
      │ 1:N，支持部分发货/拆包/多跟踪号
      ▼
Shipment（OMS 发运记录）
      │
      ├─ Package（可选的包裹明细）
      └─ Amazon 回传 / 销售渠道回传
```

### 3.1 SO（Sales Order）

SO 保存客户订单，不保存某一次执行请求的临时状态。

必须包含：

- `id`、`number`、`source=Amazon`、`sourceId`；
- `channelType=MFN`（FBM）；
- 原始 `connectionId`、`site`；
- 收件人和地址快照；
- 币种、支付状态、订单金额；
- 订单行：OMS SKU、原始 Seller SKU、数量、取消数量、商品映射快照；
- 订单级履约汇总状态；
- 迁移锁或异常标记；
- **`shipByDate`**：亚马逊要求的发货截止时间（由 APP 插件从 Amazon 订单元数据同步，格式 ISO 8601）；
- **`fulfillmentUrgency`**：`normal | warning | critical | overdue`，由 OMS 根据当前时间与 `shipByDate` 的差值实时计算，不持久化存储。

SO 不应直接保存唯一的承运商或跟踪号，因为同一 SO 可能有多个 Outbound 和 Shipment。

### 3.2 Fulfillment（履约单）

表示 SO 的一部分数量由某种执行方完成。

关键字段：

- `id`、`number`、`orderId`；
- `executor`: `warehouse | amazon`；
- `warehouseId`；
- `connectionId`、`site`；
- 行数量；
- `status`；
- 库存预占记录；
- MCF 请求快照（仅 MCF）；
- 关联 `outboundId`；
- 稳定 `idempotencyKey` / `providerReference`。

### 3.3 Outbound（OMS 出库单）

Outbound 是 OMS 内部必须存在的执行主单。自有仓和 MCF 的差异在于执行路由，不在于是否创建 Outbound。

关键字段：

- `id`、`number`、`orderId`、`fulfillmentId`；
- `warehouseId`；
- 仓库绑定快照：类型、APP、能力、连接、市场、外部仓库资源；
- 商品和数量快照；
- 收件地址快照；
- `status`；
- `pushStatus`：未推送、推送中、已受理、失败、未知；
- `providerTaskId`、`providerReference`；
- `outboundRevision`；
- 创建、提交、取消和最后同步时间；
- **`expectedShipBy`**：继承自 SO 的 `shipByDate`，在 Outbound 创建时快照写入，作为本次执行任务的时效基准；
- **`urgencyLevel`**：`normal | warning | critical | overdue`，实时计算，不存库，仅用于 UI 展示和列表排序。

### 3.4 Shipment（运单/发运记录）

**APP 回传承运商和跟踪号时，OMS 必须创建或幂等更新 Shipment。**

Shipment 不是简单的字符串字段，至少包含：

- `id`：OMS 内部 ID；
- `outboundId`、`fulfillmentId`、`orderId`；
- `provider`: `amazon_mcf | warehouse | 3pl`；
- `providerShipmentId`：Amazon/APP 的稳定外部发运 ID；
- `providerPackageId`：外部包裹 ID（如有）；
- `carrier`、`trackingNumber`、`trackingUrl`；
- `status`: `created | label_ready | in_transit | delivered | cancelled | failed | unknown`；
- 发运数量（按 Outbound 行）；
- `shippedAt`、`deliveredAt`；
- 来源事件 ID、事件版本、原始回执引用；
- `confirmationStatus`：未回传、回传中、已确认、失败、未知；
- 原始回执摘要（脱敏，不保存不必要的凭证）。

#### Shipment 创建/更新规则

| 情况 | OMS 行为 |
|---|---|
| APP 首次回传新的 `providerShipmentId` | 创建 Shipment，并关联 Outbound/履约/SO |
| 同一回执重复到达 | 按 `providerShipmentId + providerPackageId` 幂等更新，不新增 |
| 只有跟踪号没有外部 ID | 使用插件提供的稳定幂等键；禁止使用当前时间临时生成多个 Shipment |
| 跟踪号变更 | 保留历史值，写入变更事件；只有明确的更正事件才覆盖当前值 |
| 部分发货 | 创建一个或多个 Shipment，按行数量累计，不把整张 Outbound 标记为已发货 |
| 发运数量超出 Outbound 数量 | 拒绝回写，记录异常，不能污染库存和 SO |
| 只有“已提交/已受理”没有发运事实 | 不创建已发货 Shipment，可创建执行事件或保持 Outbound 处理中 |
| 明确取消且无发运 | 更新 Outbound/履约取消状态，释放未发运预占 |

### 3.5 Warehouse（仓库）

仓库中心统一管理：

- `local`：本地仓，走仓库拣货/打包/人工或 WMS 执行；
- `virtual`：虚拟库存或业务逻辑仓，不直接执行实物拣货；
- `platform`：第三方平台仓，必须关联 APP 供应商提供的外部仓库资源。

平台仓绑定：

```text
Warehouse
  ├─ appId: amazon
  ├─ capability: mcf
  ├─ connectionId: Seller 连接
  ├─ site: US
  └─ externalWarehouseId: FBA 逻辑库存池 / APP 返回的外部资源 ID
```

Amazon MCF 的“仓库”是账号/市场下的逻辑库存来源，不是用户手填的 Amazon FC 地址。具体 Amazon FC 由 Amazon 决定并在回执可用时展示。

### 3.6 Product Mapping（商品映射）

映射必须按履约连接/市场生效，不能只有全局一个 Seller SKU：

```text
OMS Variant / SKU
    └─ Fulfillment Binding（APP + connection + site）
         └─ Amazon Seller SKU
         └─ ASIN（可选）
         └─ FNSKU（可选，视接口/业务需要）
```

提交前必须校验：

- OMS 商品存在且已启用；
- 当前 Outbound 的绑定存在；
- 映射属于当前连接和市场；
- Seller SKU 非空且未被禁用；
- 订单原始 Seller SKU 与履约绑定 SKU 的差异有明确映射快照；
- 映射变化不影响已创建的 Outbound，已创建单使用快照。

---

## 4. APP 插件职责与 OMS 职责

### 4.1 OMS 负责

- SO、Fulfillment、Outbound、Shipment 主数据；
- 仓库和 APP 履约绑定；
- 商品映射维护及快照；
- 数量、库存预占、发运数量不变量；
- 用户选择履约方式、仓库、数量和服务；
- Outbound 状态和任务展示；
- 接收插件回执并原子写入 Shipment/状态/事件；
- 处理权限、作用域、幂等和审计；
- 将自有仓 Shipment 或 MCF Shipment 按规则回传原销售渠道。

### 4.2 Amazon APP 插件负责

- OAuth/授权、令牌刷新、区域端点和权限管理；
- 连接能力和外部仓库资源发现；
- 按绑定读取 Seller 连接、市场和商品映射；
- 将 OMS Preview/Submit 请求转换为 Amazon API 请求；
- 生成或保存稳定的 Amazon 请求 ID；
- 调用 MCF 创建、取消、查询和状态接口；
- 接收 webhook 或轮询 Amazon 状态；
- 将 Amazon 包裹、承运商、跟踪号、数量和时间转换为 OMS Shipment 事件；
- 外部超时核实、重试退避和限流；
- 不把未确认的请求标记为成功；
- 不向 OMS 暴露或回传授权密钥。

### 4.3 插件不能做

- 不能绕过 OMS 直接创建没有 SO/Outbound 关联的 MCF 单；
- 不能把一次重试生成的不同请求当成新的正常订单；
- 不能以跟踪号存在为由擅自把整单标记为已发货；
- 不能用 OMS SKU 代替 Amazon Seller SKU；
- 不能自行修改 OMS 数量或库存；
- 不能在没有明确绑定的情况下选择任意 Amazon 账号或站点。

---

## 5. 业务流程 A：FBM 商家自履约

### 5.1 前置配置

1. 在 APP/连接中心完成 Amazon Seller 账号授权。
2. 在 OMS 仓库中心创建或确认本地仓/3PL 仓。
3. 如仓库由 WMS/3PL 执行，配置对应的仓库连接和仓库事件能力。
4. 建立 OMS Variant/SKU 与 Amazon Seller SKU 的映射。
5. 验证订单来源连接、站点、地址和商品映射。

### 5.2 主流程

```text
Amazon 产生 FBM 订单
        │
        ▼
APP 拉取/接收订单 → OMS 创建 SO（MFN）
        │
        ▼
用户确认商品映射、库存和履约仓
        │
        ▼
创建 Fulfillment（本次数量）
        │
        ▼
创建 OMS Outbound（本地/3PL 仓）
        │
        ├─ 本地执行：OMS/WMS 拣货 → 打包
        └─ 3PL 执行：推送仓库任务 → 接收仓库事件
        │
        ▼
仓库确认实际发运
        │
        ▼
OMS 创建/更新 Shipment（承运商、跟踪号、数量）
        │
        ▼
OMS 按业务规则回传 Amazon 原订单发货信息
        │
        ▼
Amazon 确认 / 订单包裹状态更新
```

### 5.3 用户操作

- 从 SO 选择“自有仓履约”；
- 选择本地仓/3PL 仓；
- 按订单行填写本次数量；
- 确认生成 Fulfillment 和 Outbound；
- 在 Outbound 查看拣货、打包、出库状态；
- 仓库发运后查看 OMS Shipment；
- 回传失败时只重试该 Shipment 的渠道回传，不重复创建 Outbound。

### 5.4 自履约状态

```text
Fulfillment: allocated → picking → packed → shipped → delivered
Outbound:    waiting   → picking → packed → shipped
Shipment:    created/label_ready → in_transit → delivered
```

如果仓库撤回：

```text
allocated/picking/packed
    → withdraw_pending
    → cancelled（确认后释放预占）
```

已发货后不能走撤回替代售后；Shipment 已发运的数量必须进入售后/退货流程。

---

## 6. 业务流程 B：FBM 转 MCF

### 6.1 前置配置

1. Amazon Seller 账号已在 APP 授权，并启用 MCF 能力和目标市场。
2. OMS 仓库中心创建“第三方平台仓”。
3. 平台仓绑定：APP=Amazon、能力=MCF、Seller 连接、站点、APP 提供的外部 FBA 逻辑库存池。
4. 同一绑定下的 OMS SKU → Seller SKU 映射已完成。
5. FBA 可配送库存同步可用。
6. 用户有订单执行和库存/仓库配置权限。

### 6.2 直接将未履约数量转 MCF

```text
FBM SO
  │
  ▼
选择“转 Amazon 配送（MCF）”
  │
  ▼
选择已绑定的 FBA/MCF 平台仓
  │
  ▼
选择订单行和本次数量
  │
  ▼
OMS 校验库存、地址、Seller SKU、连接和绑定
  │
  ▼
APP 查询 Amazon 可用配送方案
  │
  ▼
用户选择服务等级并确认费用/预计送达
  │
  ▼
OMS 原子创建 Fulfillment + Outbound，预占 FBA 库存
  │
  │  Outbound = 待提交 APP；此时不标记已发货
  ▼
用户从 Outbound 点击“提交 Amazon APP”
  │
  ▼
APP 以稳定幂等键创建 MCF 请求
  │
  ▼
Amazon 返回受理/失败/未知
  │
  ▼
APP 同步执行状态和 Shipment/Package
  │
  ▼
OMS 更新 Outbound → Fulfillment → SO，并按规则回传原订单
```

### 6.3 已存在自有仓履约时转 MCF

```text
已有自有仓 Fulfillment/Outbound
        │
        ▼
用户点击“撤回并转 MCF”
        │
        ▼
OMS 只提交撤回，不创建 MCF、不释放预占
        │
        ├─ 撤回确认成功 → 原 Outbound/履约 cancelled，释放原仓预占
        ├─ 撤回失败       → 保持原任务，允许重试撤回
        └─ 结果未知       → 锁定转换，要求核实原任务
        │
        ▼
按最新剩余数量预填 MCF 数量
        │
        ▼
重新查询方案、确认 FBA 逻辑仓和服务
        │
        ▼
创建新的 MCF Fulfillment + Outbound
```

禁止直接把原自有仓 Outbound 的 `warehouseId` 改成 FBA 仓。原单和新单必须分别留痕，才能审计撤回和重复发货风险。

### 6.4 MCF 状态

```text
Outbound:
waiting → submitted_to_app → provider_accepted → executing
        → partially_shipped → shipped → delivered
        → failed / unknown / cancel_pending / cancelled

Fulfillment:
allocated → submitted → picking/executing
          → shipped/partially_shipped → delivered
          → failed/unknown/cancelled
```

`submitted_to_app`、`provider_accepted` 和 `shipped` 必须区分。Amazon 接受创建请求不代表已发运。

---

## 7. OMS 与 APP 接口契约

### 7.1 能力发现

APP 向 OMS 提供或同步：

```json
{
  "appId": "amazon",
  "connectionId": "seller-connection-001",
  "identity": "seller",
  "markets": ["US"],
  "capabilities": ["mcf_create", "mcf_cancel", "mcf_status", "mcf_shipments"],
  "externalWarehouses": [
    {
      "id": "fba:seller-connection-001:US",
      "name": "US FBA inventory pool",
      "kind": "logical_inventory_pool"
    }
  ],
  "mappingScope": "connection_market"
}
```

如果 APP 只有连接能力但没有可关联仓资源，OMS 只能显示供应商，不允许保存平台仓绑定。

### 7.2 查询配送方案

OMS → APP：

```json
{
  "operation": "quote_mcf",
  "idempotencyKey": "OB-001:quote:3",
  "outboundDraft": {
    "orderId": "SO-001",
    "warehouseId": "warehouse-fba-us",
    "bindingId": "binding-amazon-us-001",
    "site": "US",
    "addressSnapshot": {},
    "lines": [
      {
        "outboundLineId": "OB-001-L1",
        "omsSku": "WEP-BLK-001",
        "sellerSku": "NW-WEP-BLK-US",
        "quantity": 2
      }
    ]
  }
}
```

APP → OMS：

```json
{
  "operation": "quote_mcf_result",
  "requestId": "quote-001",
  "expiresAt": "2026-11-06T10:00:00Z",
  "options": [
    {
      "service": "Standard",
      "currency": "USD",
      "feeMinor": 1300,
      "arrivalFrom": "2026-11-09T00:00:00Z",
      "arrivalTo": "2026-11-11T00:00:00Z"
    }
  ],
  "warnings": []
}
```

方案必须绑定出库草稿内容、地址、数量、映射版本和有效期。任何一项变化都必须重新查询。

### 7.3 提交 MCF 出库

OMS → APP：

```json
{
  "operation": "create_mcf",
  "idempotencyKey": "OB-001:create:1",
  "outboundId": "OB-001",
  "outboundRevision": 3,
  "fulfillmentId": "FUL-001",
  "binding": {
    "appId": "amazon",
    "connectionId": "seller-connection-001",
    "site": "US",
    "externalWarehouseId": "fba:seller-connection-001:US"
  },
  "sourceOrder": {
    "source": "Amazon",
    "sourceId": "114-...",
    "channelType": "MFN"
  },
  "addressSnapshot": {},
  "lines": [
    {
      "outboundLineId": "OB-001-L1",
      "omsSku": "WEP-BLK-001",
      "sellerSku": "NW-WEP-BLK-US",
      "quantity": 2
    }
  ],
  "selectedQuoteId": "quote-001"
}
```

APP 返回：

```json
{
  "operation": "create_mcf_result",
  "outboundId": "OB-001",
  "idempotencyKey": "OB-001:create:1",
  "status": "accepted",
  "providerRequestId": "amazon-request-001",
  "providerFulfillmentOrderId": "stable-mcf-id-001",
  "message": "accepted"
}
```

可能结果：

- `accepted`：已受理，Outbound 进入处理中；不标记已发货；
- `rejected`：明确失败，可修正后重新创建新版本；
- `unknown`：结果未知，必须进入核实，不得换 ID 重建；
- `cancel_pending`：取消请求处理中，不得释放库存；
- `cancelled`：外部确认取消，OMS 才释放未发运库存。

### 7.4 Shipment 回传

APP → OMS：

```json
{
  "operation": "shipment_upsert",
  "eventId": "amazon-event-001",
  "eventVersion": 2,
  "outboundId": "OB-001",
  "fulfillmentId": "FUL-001",
  "providerRequestId": "amazon-request-001",
  "providerShipmentId": "amazon-shipment-001",
  "providerPackageId": "amazon-package-001",
  "status": "in_transit",
  "carrier": "Amazon Logistics",
  "trackingNumber": "TBA123456789",
  "trackingUrl": "https://…",
  "shippedAt": "2026-11-06T12:00:00Z",
  "lines": [
    { "outboundLineId": "OB-001-L1", "quantity": 2 }
  ],
  "rawReference": "s3/object-or-event-reference"
}
```

OMS 处理顺序必须是：

1. 校验事件作用域、签名/来源、绑定、Out­bound revision 和数量；
2. 按外部 Shipment/Package ID 幂等 upsert；
3. 更新 Shipment 状态和数量；
4. 依据所有 Shipment 汇总 Outbound 发运数量；
5. 依据 Outbound 汇总 Fulfillment 和 SO 状态；
6. 追加审计事件；
7. 若满足渠道回传条件，生成独立的销售渠道回传任务。

### 7.5 OMS → APP 查询与重试

OMS 必须支持：

- `get_mcf_status(outboundId, providerRequestId)`；
- `list_shipments(outboundId, providerRequestId)`；
- `cancel_mcf(outboundId, providerRequestId)`；
- `retry_channel_writeback(shipmentId)`，注意这不是重新创建 MCF；
- `reconcile_unknown(outboundId)`，用原 provider ID 核实。

---

## 8. 数量、状态和幂等规则

### 8.1 数量守恒

对每个 SO 行：

```text
订购数量 = 已取消数量 + 有效履约计划数量 + 未分配数量
已发运数量 = 所有关联 Shipment 行数量之和
已发运数量 ≤ Outbound 计划数量 ≤ Fulfillment 数量 ≤ SO 未取消数量
```

部分发货时，不能因为一个 Shipment 已发运就把其他未发运数量标记为已完成。

### 8.2 幂等键

- 创建 Outbound：`outboundId` 由 OMS 生成；
- 创建 MCF：`outboundId:create:version`；
- 查询报价：`outboundId:quote:version`；
- Shipment 事件：`providerShipmentId + providerPackageId + eventVersion`；
- 渠道回传：`shipmentId:writeback:version`。

重复命令返回已提交结果，不新增 Fulfillment、Outbound、Shipment 或库存流水。

### 8.3 失败与未知

| 状态 | 是否能重试创建 | 处理方式 |
|---|---:|---|
| 明确参数校验失败 | 修正后可新版本提交 | 原 Outbound 保留失败原因 |
| APP 明确拒绝且 Amazon 未创建 | 可重试原 Outbound 或新版本 | 不改变已发运数量 |
| 网络超时/结果未知 | 不可直接重建 | 先查询原 provider ID |
| Amazon 已受理 | 不可重复创建 | 继续同步原请求 |
| 取消待确认 | 不可重新分配同数量 | 等待取消结果 |
| 明确取消成功 | 可新建替代履约 | 释放未发运预占后再分配 |
| 已有 Shipment | 不可用新建 MCF 覆盖 | 走部分发货/售后规则 |

---

## 9. 用户界面要求

### 9.0 履约时效预警规则

亚马逊 FBM 要求卖家在 `Ship by date` 前完成发货确认，否则计入**晚发货率（Late Shipment Rate, LSR）**；LSR 超过 4% 将触发亚马逊警告，超过 10% 可能暂停账号。

**`urgencyLevel` 计算规则**（以 `shipByDate` 为基准，实时计算，不存库）：

| urgencyLevel | 触发条件 | UI 样式建议 |
|---|---|---|
| `normal` | 距截止时间 > 24h 且未发货 | 默认无色 |
| `warning` | 距截止时间 ≤ 24h 且未发货 | 黄色标签 |
| `critical` | 距截止时间 ≤ 4h 且未发货 | 橙色 + 图标提示 |
| `overdue` | 已超过截止时间且未确认发货 | 红色 + 晚发货风险文案 |

**补充规则：**

- 已有 Shipment 且状态为 `in_transit` 及以上时，不再显示时效预警（任务已完成）；
- MCF 场景下，`submitted_to_app` / `provider_accepted` 状态仍视为未发货，继续计算时效；
- Quote 有效期（`expiresAt`）到期时，单独用 inline 提示要求重新查询方案，不影响 `urgencyLevel`；
- `shipByDate` 由 APP 插件从 Amazon 订单元数据同步，若 APP 未回传则隐藏时效标签，不显示错误的倒计时。
### 9.1 SO 详情

展示：

- 原订单来源、MFN 类型、原始 Amazon 订单号；
- **发货截止时间（`shipByDate`）和当前 `urgencyLevel` 标签**；
- 每一行已履约、已发运、剩余数量；
- “自有仓履约”；
- “转 Amazon 配送（MCF）”；
- 当前有效 Fulfillment 和 Outbound 链接；
- 已发运 Shipment 列表和跟踪号。

### 9.2 Outbound 详情

展示：

- 来源 SO、Fulfillment、执行仓库和绑定快照；
- **`expectedShipBy` 和实时 `urgencyLevel` 标签**（已发运后隐藏）；
- 自有仓或 Amazon APP 执行路由；
- 商品、计划数量、预占数量、已发运数量、释放数量；
- APP 推送状态、provider request ID；
- MCF 操作：提交、查询、取消、核实未知；
- Shipment/Package 列表；
- 每个 Shipment 的承运商、跟踪号、状态、发运数量和回传状态。

### 9.3 Warehouse 中心

统一创建：

- 本地仓；
- 虚拟仓；
- 第三方平台仓。

平台仓的创建步骤：

1. 选择 APP 仓库供应商；
2. 选择 APP 实际提供的外部仓库资源；
3. 自动带出连接、市场和能力；
4. 保存绑定快照。

不能手填 Amazon 店铺 ID 作为唯一绑定，也不能把平台仓名称当作接口路由。

### 9.4 商品 Mapping

提供按以下维度查询/维护：

- OMS 商品/Variant；
- APP/连接；
- 市场；
- Seller SKU；
- ASIN/FNSKU；
- 映射状态、最后校验时间和错误原因。

提交 Outbound 时如果映射缺失，必须阻止提交并指出具体行，不能静默使用 OMS SKU。

---

## 10. 权限与审计

### 10.1 权限

- 查看 SO/Outbound/Shipment：订单查看权限；
- 创建 Fulfillment/Outbound：订单履约写权限；
- 提交 MCF：订单履约写权限 + 绑定仓可执行；
- 创建/编辑 Warehouse：库存/仓库配置写权限；
- 编辑 Product Mapping：商品配置写权限；
- APP 授权和连接管理：APP 管理权限；
- 取消 MCF：履约写权限和业务规则允许。

### 10.2 审计事件

至少记录：

- 谁、何时、从哪个页面选择了哪个仓库和数量；
- mapping 版本和地址快照；
- Outbound 创建、提交、重试、取消和核实；
- APP 请求 ID、Amazon provider ID；
- Shipment 创建/更新/合并/拒绝；
- 数量校验失败和外部异常；
- 所有用户或插件状态变更。

---

## 11. 验收标准

### 11.1 FBM 自履约

- [ ] MFN SO 可按行/数量选择本地仓；
- [ ] 创建一个 Fulfillment 和一个 OMS Outbound；
- [ ] 自有仓拣货、打包、发运后创建 OMS Shipment；
- [ ] Shipment 承运商和跟踪号可回传原 Amazon 订单；
- [ ] 重复回传不创建重复 Shipment；
- [ ] 部分发货只更新对应数量；
- [ ] 撤回确认前不释放预占；
- [ ] 已发货数量不能再次分配；
- [ ] SO 和 Outbound 列表正确展示 `shipByDate` 和 `urgencyLevel` 标签；
- [ ] 已发运后 `urgencyLevel` 标签自动隐藏。

### 11.2 FBM 转 MCF

- [ ] 必须存在已绑定的 Amazon MCF 平台仓；
- [ ] 只能选择连接/市场下有效的 FBA 逻辑库存池；
- [ ] Seller SKU mapping 缺失时不能查询或提交；
- [ ] 先创建 OMS Outbound，状态为待提交 APP；
- [ ] 不提交 Outbound 时不会创建 Amazon 请求；
- [ ] 提交使用稳定幂等键；
- [ ] Amazon 受理不显示为已发货；
- [ ] APP 回传运单时创建/更新 OMS Shipment；
- [ ] 多 Shipment、部分数量和重复事件正确处理；
- [ ] 未知结果必须先核实原请求；
- [ ] 自有仓转 MCF 必须先撤回并确认，再创建新 Outbound；
- [ ] 原 Outbound、Fulfillment、SO 和 Shipment 关系可追溯。

### 11.3 数据不变量

- [ ] SO、Fulfillment、Outbound、Shipment 数量守恒；
- [ ] Shipment 数量不得超过 Outbound 数量；
- [ ] 不同商家/连接/市场的数据不能互相引用；
- [ ] 重复命令和重复事件幂等；
- [ ] 事务失败不留下半条履约、出库或运单记录；
- [ ] 刷新、重新登录和 APP 重启后状态可恢复。

---

## 12. 分阶段交付建议

### Phase 1：OMS 统一模型

- 增加 Shipment/Package 一等对象；
- 为所有 Outbound 增加执行绑定快照和推送状态；
- 建立 Product Mapping 连接/市场维度；
- 完成数量和幂等不变量。

### Phase 2：APP 能力与绑定

- APP 能力发现和外部仓资源发现；
- Warehouse 中心统一绑定；
- OAuth/凭证只在 APP 管理；
- mapping 校验接口。

### Phase 3：FBM 自履约

- WMS/3PL 出库任务下发；
- Shipment upsert；
- 原 Amazon 订单发货回传；
- 失败、重试和部分发货。

### Phase 4：MCF

- 报价/配送方案查询；
- Outbound 提交 APP；
- MCF 创建、状态核实、取消；
- 多包裹 Shipment 回传；
- 未知结果恢复和审计。

### Phase 5：生产验收

- 沙箱/测试账号 happy path；
- 部分发货和多包裹；
- 重复 webhook、乱序事件、超时；
- 取消成功/拒绝/未知；
- 授权失效、mapping 变更、库存变化；
- 跨页面刷新和多标签页并发。

---

## 13. 结论

对于真实 Amazon FBM 业务，正确的主链路是：

```text
SO
 → Fulfillment
 → OMS Outbound
 → APP 插件
 → Amazon MCF / 自有仓执行
 → APP 回传状态和 Shipment
 → OMS Shipment
 → Outbound / Fulfillment / SO 状态联动
 → Amazon 原订单发货回传
```

因此，**APP 回传运单时必须在 OMS 创建或幂等更新 Shipment**。Shipment 是发运事实和售后/回传的基础对象；Out­bound 是执行主单；SO 是客户订单主单。三者不能互相替代。
