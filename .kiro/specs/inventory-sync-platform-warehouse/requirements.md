# Requirements Document

## Introduction

在库存同步规则体系中，不同类型渠道的库存推送路径存在本质差异：EDI 渠道（Walmart、Target、Costco 等）和文件传输渠道（Wayfair）均通过渠道自身的配送体系分发，无需指定平台侧的具体仓库；而平台授权类渠道（Amazon、TikTok Shop、Shopify US 等）在平台侧拥有多个独立 Fulfillment Center / Location，推送库存时必须明确目标仓标识，否则库存数据将无法被平台正确接收或分配。

本功能在现有库存同步规则表单的"同步渠道"配置区域内，当用户选择了平台授权类型渠道后，新增"目标仓映射"配置模块。用户可以定义多条「系统内部仓 → 平台目标仓/Location ID」映射关系。规则引擎在执行库存推送时，依据这组映射将每条 SKU 的库存数据准确路由到对应的平台仓库节点。

本功能不影响 EDI 渠道和文件传输渠道的现有配置与执行逻辑。

---

## Glossary

- **平台授权渠道（Platform Authorized Channel）**：通过 OAuth 或平台 API 授权对接的电商平台渠道，如 Amazon、TikTok Shop、Shopify US。在 `CHANNELS` 常量中 `type === '平台授权'` 的渠道均属此类，区别于 EDI 渠道和文件传输渠道。
- **EDI_Channel**：通过电子数据交换（Electronic Data Interchange）协议对接的零售商渠道，如 Walmart、Target、Costco。在 `CHANNELS` 常量中 `type === 'EDI'` 的渠道。
- **System_Warehouse（系统仓）**：系统内部定义的仓库节点，对应 `WAREHOUSES` 常量中的仓库条目，每条记录有唯一的 `id`（如 `wh-lax`）和展示名称（如"US 西部仓（洛杉矶）"）。
- **Platform_Location（平台目标仓）**：平台侧用于标识库存存放位置的代码或 ID，如 Amazon FC 代码 `ONT8`、Shopify Location ID `12345678`。由用户手动输入或从平台 API 拉取。
- **Platform_Warehouse_Mapping（目标仓映射）**：一条「系统仓 → 平台目标仓」的对应关系，由 `warehouseId`（系统仓 ID）和 `platformLocationCode`（平台目标仓代码）构成，可附带可选的 `platformLocationName`（展示名称）。数据结构对应 `PlatformWarehouseMapping` 接口。
- **Channel_Config（渠道配置）**：按渠道 ID 索引的额外配置对象，存储该渠道的目标仓映射列表，对应 `ChannelConfig` 接口。
- **Rule_Engine（规则引擎）**：`InventorySyncRuleEngine` 类，负责在批量 SKU 同步执行时匹配规则、计算库存输出值，并通过 `resolveTargetWarehouse()` 方法解析目标仓。
- **resolveTargetWarehouse**：规则引擎中的目标仓解析函数，接受 `warehouseId`、`channelId` 和 `mappings` 数组，返回对应的 `platformLocationCode` 或 `null`。
- **PlatformWarehouseMappingSection**：渲染目标仓映射配置区域的 UI 组件，嵌入规则表单的"同步渠道"Section 内。
- **WarehouseMappingRow**：单条映射行组件，包含系统仓选择器和平台目标仓输入/选择器。
- **FormState**：规则表单的本地状态类型，新增 `platformWarehouseMappings` 字段（以渠道 ID 为 key 的映射配置字典）。
- **SyncRule**：库存同步规则的核心数据结构，存储于后端，`actions.channelConfigs` 字段用于持久化各渠道的目标仓映射。
- **Fallback_Strategy（Fallback 策略）**：当 Rule_Engine 在执行时未能找到与当前仓库和渠道匹配的 Platform_Warehouse_Mapping 时，所采取的兜底处理方式（推送至平台默认仓，或记录告警后跳过）。

---

## Requirements

### Requirement 1: 平台授权渠道的目标仓配置区域显示控制

**User Story:** 作为规则配置人员，我希望在选择平台授权类型渠道时，表单自动出现目标仓配置区域，以便为该平台的仓库推送路径进行精确配置，而不干扰 EDI 或文件传输渠道的配置流程。

#### Acceptance Criteria

1. WHEN 用户在"目标渠道"选择器中选择至少一个 `type === '平台授权'` 的渠道（如 Amazon、TikTok Shop、Shopify US），THE 规则表单 SHALL 在"同步渠道"Section 内渲染目标仓映射配置区域（`PlatformWarehouseMappingSection`）。
2. IF 用户已选渠道中不包含任何平台授权类型渠道（仅包含 EDI 或文件传输类渠道，或未选任何渠道），THEN THE 规则表单 SHALL 不渲染目标仓映射配置区域。
3. WHEN 用户将已选渠道从包含平台授权渠道变更为不包含平台授权渠道，THE 规则表单 SHALL 隐藏目标仓映射配置区域。
4. WHEN 用户将已选渠道从包含平台授权渠道变更为不包含平台授权渠道，THE 规则表单 SHALL 清空被移除的平台授权渠道对应的所有映射条目（即将其 `platformWarehouseMappings` 重置为空数组），使重新添加该渠道时映射区域以空列表展示。
5. THE 规则表单 SHALL 同时支持平台授权类渠道与 EDI 类渠道的配置并存；对平台授权渠道目标仓映射配置区域内任意字段的修改不得改变 EDI 渠道配置区域内任意字段的当前值，反之亦然。

---

### Requirement 2: 单条目标仓映射的添加、编辑与删除

**User Story:** 作为规则配置人员，我希望能够逐条添加、修改和删除系统仓到平台目标仓的映射关系，以便灵活管理每个系统仓对应的平台侧库存目的地。

#### Acceptance Criteria

1. WHEN 用户点击目标仓映射配置区域内的"添加映射"按钮，THE `PlatformWarehouseMappingSection` SHALL 在映射列表末尾新增一条空白映射行，包含系统仓选择器（下拉）和平台目标仓代码输入框（文本输入）；新行的系统仓和平台目标仓字段均为空。
2. WHEN 用户在系统仓选择器中选择一个系统仓，并在平台目标仓输入框中输入至少 1 个字符的代码，且该行失去焦点（行外点击或 Tab 到下一行），THE `PlatformWarehouseMappingSection` SHALL 将该条映射（`warehouseId` + `platformLocationCode`）存入当前渠道的映射列表；若平台目标仓输入框为空时失去焦点，THE `PlatformWarehouseMappingSection` SHALL 不存储该行，并保留该行处于空白待填写状态。
3. WHEN 用户点击映射行末尾的删除按钮，THE `PlatformWarehouseMappingSection` SHALL 从当前渠道的映射列表中移除该条目，列表中其他条目的内容和顺序保持不变。
4. WHEN 用户修改已存在映射行的系统仓选择或平台目标仓代码，且修改后失去焦点，THE `PlatformWarehouseMappingSection` SHALL 更新该条目的对应字段；若修改后平台目标仓代码变为空字符串并失去焦点，THE `PlatformWarehouseMappingSection` SHALL 拒绝该修改，并将该字段值恢复至修改前的值；其他条目不受影响。
5. THE 系统仓选择器 SHALL 从 `WAREHOUSES` 常量中读取可选项，展示仓库名称及其类型标签（自营/三方/FBA/直发）；`platformLocationCode` 的最大长度为 100 个字符。
6. IF 用户在同一渠道内的映射行中选择的系统仓与该渠道已存在映射条目的 `warehouseId` 相同，THEN THE `PlatformWarehouseMappingSection` SHALL 在该行系统仓字段旁显示内联错误提示「该仓库已存在映射，请勿重复配置」，并阻止该行被存入映射列表。

---

### Requirement 3: 多渠道场景下的 Tab 分组管理

**User Story:** 作为规则配置人员，我希望在同时选择多个平台授权渠道时，能够通过 Tab 标签切换不同渠道的目标仓映射配置，以便各渠道的映射数据清晰隔离、易于管理。

#### Acceptance Criteria

1. WHILE 用户已选的平台授权渠道数量为 1 个，THE `PlatformWarehouseMappingSection` SHALL 直接展示该渠道的映射列表，不显示渠道 Tab 切换器。
2. WHILE 用户已选的平台授权渠道数量为 2 个及以上，THE `PlatformWarehouseMappingSection` SHALL 在映射列表上方展示渠道 Tab 切换器，Tab 数量等于已选平台授权渠道数量，每个 Tab 显示对应渠道的名称；默认激活第一个 Tab（按渠道在已选列表中的顺序排列）。
3. WHEN 用户点击某个渠道 Tab，THE `PlatformWarehouseMappingSection` SHALL 仅显示该渠道对应的映射列表，其他渠道的映射数据不在当前视图中展示。
4. THE 各渠道的映射数据 SHALL 相互独立存储；在渠道 A 的映射列表中执行任意增、删、改操作后，渠道 B 的映射列表中的条目内容和数量不得发生任何变化。
5. WHEN 用户新增一个平台授权渠道，THE `PlatformWarehouseMappingSection` SHALL 为其新增一个 Tab，该渠道的初始映射列表为空；其他渠道已配置的映射数据不变，原有 Tab 的顺序不变，新 Tab 追加在末尾。
6. WHEN 用户从已选渠道中移除一个平台授权渠道，THE `PlatformWarehouseMappingSection` SHALL 移除对应的 Tab；若被移除的 Tab 正处于激活状态，THE `PlatformWarehouseMappingSection` SHALL 自动激活其前一个 Tab（若不存在前一个，则激活第一个剩余 Tab）；其他渠道已配置的映射数据不变。

---

### Requirement 4: 目标仓映射的表单校验

**User Story:** 作为规则配置人员，我希望表单在填写不合规的映射时给出明确的错误提示，以便在保存规则前确保映射配置的完整性和唯一性。

#### Acceptance Criteria

1. WHEN 用户尝试保存规则，且某条映射行的系统仓选择器为空（未选择），THE 表单 SHALL 在该行系统仓字段处显示必填错误提示「请选择系统仓」，并阻止规则保存。
2. WHEN 用户尝试保存规则，且某条映射行的平台目标仓代码输入框为空字符串或仅包含空白字符，THE 表单 SHALL 在该行平台目标仓字段处显示必填错误提示「请填写平台目标仓代码」，并阻止规则保存。
3. WHEN 用户尝试保存规则，且同一渠道内的映射列表中存在 `warehouseId` 重复的条目，THE 表单 SHALL 在重复的映射行系统仓字段处显示内联错误提示「该仓库已存在映射，请勿重复配置」，并阻止规则保存。
4. THE 表单 SHALL 允许同一系统仓在不同渠道中分别配置目标仓（跨渠道的相同 `warehouseId` 不视为重复，不触发校验错误）。
5. WHEN 用户尝试保存规则，且某条映射行的平台目标仓代码长度超过 64 个字符，THE 表单 SHALL 在该字段处显示格式错误提示「代码不超过 64 个字符」，并阻止规则保存；若同时存在格式违规（含非法字符）和长度超限，THE 表单 SHALL 优先显示长度超限错误。
6. THE 表单 SHALL 允许在未配置任何 Platform_Warehouse_Mapping 的情况下保存规则；此时规则执行时将采用 Fallback_Strategy。
7. WHEN 用户更正了之前显示错误提示的字段（使其满足校验条件），THE 表单 SHALL 在该字段通过校验后立即清除对应的错误提示，无需用户再次点击保存。

---

### Requirement 5: 规则保存时映射配置的持久化

**User Story:** 作为规则配置人员，我希望保存规则后，目标仓映射配置能够正确写入规则对象，以便 Rule_Engine 在执行时能准确读取和使用。

#### Acceptance Criteria

1. WHEN 用户保存含有 Platform_Warehouse_Mapping 的规则，THE 规则表单 SHALL 将 `FormState.platformWarehouseMappings` 中各渠道的映射数组序列化为 `SyncRule.actions.channelConfigs`（类型为 `Record<channelId, ChannelConfig>`）并写入规则对象。
2. THE 每个 `ChannelConfig` SHALL 包含对应渠道的完整 `platformWarehouseMappings` 数组，每条映射包含 `warehouseId`、`platformLocationCode`，以及可选的 `platformLocationName`。
3. WHEN 用户重新加载已保存的规则进入编辑表单，THE 规则表单 SHALL 从 `SyncRule.actions.channelConfigs` 中读取各渠道的映射配置，并还原至 `FormState.platformWarehouseMappings`，使目标仓映射区域展示与保存时一致的内容。
4. WHEN 用户删除某渠道的全部映射并保存规则，THE 规则对象 SHALL 在 `channelConfigs` 中将该渠道的 `platformWarehouseMappings` 存储为空数组。
5. THE 规则对象的 `channelConfigs` SHALL 仅包含平台授权类型渠道的配置；EDI_Channel 和文件传输渠道不应出现在 `channelConfigs` 中。

---

### Requirement 6: 规则引擎执行时按映射路由到正确平台目标仓

**User Story:** 作为系统运维人员，我希望 Rule_Engine 在执行库存推送时，能够根据目标仓映射配置将每条 SKU 的库存数据准确路由到对应的平台仓库节点，以避免库存数据推送至错误的 FC 或 Location。

#### Acceptance Criteria

1. WHEN Rule_Engine 执行 SKU 库存推送，且当前 SKU 的 `warehouseId` 与执行渠道的 `channelId` 在 `mappings` 中存在匹配条目，THE `resolveTargetWarehouse` 函数 SHALL 返回该条目的 `platformLocationCode`（不得返回空字符串）。
2. WHEN Rule_Engine 调用 `resolveTargetWarehouse(warehouseId, channelId, mappings)`，且 `mappings` 中存在多条记录，THE `resolveTargetWarehouse` 函数 SHALL 仅返回与 `warehouseId` 精确匹配的条目的 `platformLocationCode`，不返回任何不匹配条目的数据。
3. THE `resolveTargetWarehouse` 函数 SHALL 是纯函数：对相同的 `warehouseId`、`channelId` 和 `mappings` 输入，任意次调用的返回值相同，且调用过程不产生可观察的副作用（不修改 `mappings`，不写日志，不触发外部调用）。
4. WHEN Rule_Engine 调用 `resolveTargetWarehouse` 并获得非 null 且非空字符串的 `platformLocationCode`，THE Rule_Engine SHALL 将该代码作为目标仓参数传递给平台推送客户端；THE Rule_Engine SHALL 不在未获得有效 `platformLocationCode` 的情况下发起推送调用。
5. IF Rule_Engine 调用 `resolveTargetWarehouse(warehouseId, channelId, mappings)` 且 `mappings` 中不存在与 `warehouseId` 精确匹配的条目，THEN THE `resolveTargetWarehouse` 函数 SHALL 返回 `null`，不返回任何其他条目的 `platformLocationCode`。
6. IF `mappings` 中存在多条 `warehouseId` 相同的条目（数据完整性违规），THEN THE `resolveTargetWarehouse` 函数 SHALL 返回第一条匹配到的条目的 `platformLocationCode`，并记录一条 `warn` 日志标明检测到重复条目。

---

### Requirement 7: 无映射时的 Fallback 策略

**User Story:** 作为系统运维人员，我希望在规则执行时找不到对应仓库映射的情况下，系统能够执行明确的兜底处理，而不是静默失败或产生不可预期的行为，以便保障同步任务的可观测性和稳定性。

#### Acceptance Criteria

1. IF Rule_Engine 调用 `resolveTargetWarehouse(warehouseId, channelId, mappings)`，且 `mappings` 中不存在与 `warehouseId` 精确匹配的条目，THEN THE `resolveTargetWarehouse` 函数 SHALL 返回 `null`，不返回任何其他条目的 `platformLocationCode`。
2. IF `mappings` 参数为空数组，THEN THE `resolveTargetWarehouse` 函数 SHALL 对所有 `warehouseId` 和 `channelId` 输入均返回 `null`。
3. IF `resolveTargetWarehouse` 返回 `null`，THEN THE Rule_Engine SHALL 记录一条 `warn` 级别的同步日志，日志内容须包含：未匹配的 `warehouseId`、`channelId`，以及当前同步任务 ID。
4. IF `resolveTargetWarehouse` 返回 `null` 且平台渠道配置了默认仓，THEN THE Rule_Engine SHALL 将库存推送至该平台默认仓，并在日志中记录一条包含 `warehouseId`、`channelId` 和使用的默认仓代码的 `warn` 级别条目，标注使用了 Fallback_Strategy。
5. IF `resolveTargetWarehouse` 返回 `null` 且平台渠道未配置默认仓，THEN THE Rule_Engine SHALL 跳过该仓的推送操作，记录一条 `warn` 级别告警（含 `warehouseId`、`channelId`），不抛出异常中断整体同步任务，不在当前同步周期内对该条目进行重试。
6. IF `resolveTargetWarehouse` 返回 `null` 且平台渠道配置了默认仓，但推送至默认仓的操作本身失败，THEN THE Rule_Engine SHALL 记录一条 `error` 级别日志（含 `warehouseId`、`channelId`、默认仓代码及失败原因），跳过该条目，不抛出异常中断整体同步任务。
