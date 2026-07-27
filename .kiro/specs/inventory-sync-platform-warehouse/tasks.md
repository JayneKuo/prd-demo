# Implementation Plan: inventory-sync-platform-warehouse

## Overview

在 TypeScript / Next.js 工程中，分四个阶段增量实现"渠道目标仓映射"功能：

1. **类型层**：新增 `PlatformWarehouseMapping`、`ChannelConfig`、`PlatformLocation` 接口；扩展 `SyncRule.actions.channelConfigs` 字段；扩展 `FormState.platformWarehouseMappings` 字段。
2. **引擎层**：在 `InventorySyncRuleEngine` 中实现 `resolveTargetWarehouse()` 纯函数及 Fallback 日志逻辑。
3. **UI 层**：新建 `WarehouseMappingRow` 和 `PlatformWarehouseMappingSection` 组件；在 `rule-form.tsx` 中集成条件渲染、状态管理、序列化/反序列化。
4. **测试层**：单元测试、属性测试（需安装 `fast-check`）覆盖引擎逻辑与 UI 渲染条件。

所有代码均使用 **TypeScript**，测试框架为 **Vitest + fast-check**。

---

## Tasks

- [ ] 1. 安装 PBT 依赖并配置测试环境
  - [ ] 1.1 安装 `fast-check` 开发依赖，确认版本兼容 Vitest ≥ 4.x
    - 执行 `npm install --save-dev fast-check`
    - 确认 `vitest.config.ts` 的 `environment: 'node'` 和 `@` 路径别名配置正确
    - _Requirements: 无代码依赖（基础设施准备）_

- [ ] 2. 新增核心 TypeScript 类型
  - [ ] 2.1 在 `src/features/inventory/sync/types/index.ts` 中新增 `PlatformWarehouseMapping`、`ChannelConfig`、`PlatformLocation` 接口
    - 在文件末尾追加三个接口定义，完全匹配设计文档的 Data Models 章节
    - `PlatformWarehouseMapping`: `warehouseId: string`、`platformLocationCode: string`、`platformLocationName?: string`
    - `ChannelConfig`: `channelId: string`、`platformWarehouseMappings: PlatformWarehouseMapping[]`
    - `PlatformLocation`: `code: string`、`name: string`、`country?: string`、`active: boolean`
    - _Requirements: 5.2, 6.1_

  - [ ] 2.2 扩展 `SyncRule.actions` 中的 `channelConfigs` 字段
    - 在 `SyncRule.actions` 联合类型中追加 `channelConfigs?: Record<string, ChannelConfig>`
    - 仅平台授权渠道写入此字段（EDI / 文件传输渠道不写入，由上层保障）
    - _Requirements: 5.1, 5.5_

- [ ] 3. 实现 `resolveTargetWarehouse` 纯函数（引擎层）
  - [ ] 3.1 在 `InventorySyncRuleEngine` 中新增 `resolveTargetWarehouse()` 静态/实例方法
    - 签名：`resolveTargetWarehouse(warehouseId: string, channelId: string, mappings: PlatformWarehouseMapping[]): string | null`
    - 遍历 `mappings`，找到 `m.warehouseId === warehouseId` 的第一条（精确匹配）
    - 若存在多条 `warehouseId` 相同的条目，返回第一条并以 `console.warn` 记录重复告警
    - 未找到时返回 `null`；空数组输入同样返回 `null`
    - 函数为纯函数：不修改 `mappings`，不触发外部副作用（仅 warn 日志例外）
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ]* 3.2 为 `resolveTargetWarehouse` 编写属性测试（PBT）
    - **Property 8: resolveTargetWarehouse 精确匹配性** — 对任意映射数组，若存在且仅存在一条 `warehouseId` 匹配条目，函数返回值严格等于该条目的 `platformLocationCode`
    - **Validates: Requirements 6.1, 6.2**
    - **Property 9: resolveTargetWarehouse 幂等性（纯函数）** — 相同输入多次调用返回值始终一致
    - **Validates: Requirements 6.3**
    - **Property 10: 空映射列表时全部返回 null** — `mappings` 为 `[]` 时，任意 `warehouseId`/`channelId` 均返回 `null`
    - **Validates: Requirements 7.2**
    - **Property 11: 无匹配条目时返回 null** — `mappings` 中不存在 `warehouseId` 匹配项时，函数返回 `null`
    - **Validates: Requirements 7.1**
    - 测试文件路径：`src/features/inventory/sync/rules/__tests__/resolve-target-warehouse.test.ts`

  - [ ]* 3.3 为 `resolveTargetWarehouse` 编写单元测试
    - 正向场景：精确匹配返回 `platformLocationCode`
    - 边界场景：多条重复 `warehouseId`（返回第一条，触发 warn）
    - 无匹配场景：`warehouseId` 不存在于 `mappings` 中，返回 `null`
    - 空数组场景：`mappings = []` 返回 `null`
    - `channelId` 参数不影响匹配逻辑（当前实现按 `warehouseId` 匹配）
    - 测试文件路径：`src/features/inventory/sync/rules/__tests__/resolve-target-warehouse.unit.test.ts`
    - _Requirements: 6.1, 6.5, 6.6, 7.1, 7.2_

- [ ] 4. Checkpoint — 引擎层验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. 扩展 `FormState` 并更新 `rule-form.tsx` 状态管理
  - [ ] 5.1 在 `rule-form.tsx` 中的 `FormState` 类型中追加 `platformWarehouseMappings: Record<string, PlatformWarehouseMapping[]>` 字段
    - 在 `DEFAULT_FORM` 中对应初始化为 `{}`
    - 导入 `PlatformWarehouseMapping` 类型（从 `@/features/inventory/sync/types`）
    - _Requirements: 5.1, 5.3_

  - [ ] 5.2 在 `rule-form.tsx` 中添加平台授权渠道的派生状态与映射清理逻辑
    - 新增 `useMemo`：`const platformChannels = selectedChannels.filter(ch => ch.type === '平台授权')`
    - 新增 `const showPlatformWarehouseConfig = platformChannels.length > 0`
    - 在"目标渠道"的 `onChange` 回调中，当平台授权渠道被移除时，将该渠道的 `platformWarehouseMappings` 重置为 `{}`（仅清除被移除渠道的条目）
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 5.3 在 `handleSave` 函数中添加 `platformWarehouseMappings` → `channelConfigs` 的序列化逻辑
    - 将 `FormState.platformWarehouseMappings` 转换为 `Record<string, ChannelConfig>` 格式
    - 仅写入平台授权渠道的条目（通过 `platformChannels` 过滤），EDI 和文件传输渠道不写入
    - 若某渠道的映射数组为空，则在 `channelConfigs` 中该渠道的 `platformWarehouseMappings` 存储为 `[]`
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ] 5.4 在 `rule-form.tsx` 中添加编辑模式下的反序列化逻辑（`channelConfigs` → `platformWarehouseMappings`）
    - 当 `editId` 非空时，从 `SyncRule.actions.channelConfigs` 读取各渠道的映射配置并还原至 `FormState.platformWarehouseMappings`
    - _Requirements: 5.3_

- [ ] 6. 新建 `WarehouseMappingRow` 组件
  - [ ] 6.1 创建 `src/app/dashboard/rules/inventory-sync/_components/warehouse-mapping-row.tsx`
    - 实现接口：`WarehouseMappingRowProps`（`mapping`、`channelId`、`platformName`、`onUpdate`、`onRemove`、`supportsLocationFetch`、`platformLocations?`）
    - 左侧：系统仓下拉选择器（复用 `Select` 组件，选项来自 `WAREHOUSES` 常量，展示仓库名称和 `tag` 标签）
    - 右侧：平台目标仓输入框（`Input` 组件，`maxLength={100}`，占位符 "如：ONT8 / Location ID"）
    - 行末：删除按钮（`×` 图标）
    - 失焦时调用 `onUpdate`；若 `platformLocationCode` 为空字符串则恢复至原值（不调用 `onUpdate`）
    - 显示内联错误状态：接受可选 `error?: string` prop，在系统仓字段下方显示红色错误文字
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ]* 6.2 为 `WarehouseMappingRow` 编写单元测试
    - 测试选择系统仓后 `onUpdate` 被调用
    - 测试平台目标仓失焦且为空时 `onUpdate` 不被调用（保留原值）
    - 测试点击删除按钮调用 `onRemove`
    - 测试文件路径：`src/app/dashboard/rules/inventory-sync/_components/__tests__/warehouse-mapping-row.test.tsx`
    - _Requirements: 2.2, 2.4_

- [ ] 7. 新建 `PlatformWarehouseMappingSection` 组件
  - [ ] 7.1 创建 `src/app/dashboard/rules/inventory-sync/_components/platform-warehouse-mapping-section.tsx`
    - 实现接口：`PlatformWarehouseMappingSectionProps`（`platformChannels`、`mappings: Record<string, PlatformWarehouseMapping[]>`、`onChange`）
    - 区域标题："目标仓映射"及说明文字
    - 当 `platformChannels.length === 1` 时：直接展示该渠道的映射列表，不渲染 Tab 切换器
    - 当 `platformChannels.length >= 2` 时：渲染渠道 Tab 切换器，默认激活第一个 Tab；Tab 数量等于 `platformChannels.length`
    - Tab 切换时：更新内部 `activeChannelId` 状态，只展示当前激活渠道的 `WarehouseMappingRow` 列表
    - 当新增平台授权渠道时：追加新 Tab，新渠道初始映射列表为空（`[]`）
    - 当移除平台授权渠道时：移除对应 Tab；若被移除 Tab 为激活态，自动激活其前一个（无前一个则激活第一个剩余 Tab）
    - "添加映射"按钮：在当前激活渠道的映射列表末尾追加空白行（`warehouseId: ''`, `platformLocationCode: ''`）
    - 行删除：将对应索引的条目从当前渠道的映射数组中移除，其余条目顺序不变
    - 各渠道映射数据独立存储，互不影响
    - 在 `onChange` 调用前执行同渠道内 `warehouseId` 重复检查，向重复行传递 `error` prop
    - _Requirements: 1.1, 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 7.2 为 `PlatformWarehouseMappingSection` 编写单元测试
    - 测试 `platformChannels.length === 1` 时不渲染 Tab
    - 测试 `platformChannels.length >= 2` 时渲染正确数量的 Tab
    - 测试同渠道内系统仓重复时显示内联错误提示
    - 测试删除映射行后其余条目顺序和内容不变
    - 测试切换 Tab 后只展示当前渠道的映射列表
    - 测试文件路径：`src/app/dashboard/rules/inventory-sync/_components/__tests__/platform-warehouse-mapping-section.test.tsx`
    - _Requirements: 1.1, 2.3, 3.1, 3.2, 3.4_

  - [ ]* 7.3 为 `PlatformWarehouseMappingSection` 编写属性测试（PBT）
    - **Property 1: 平台授权渠道显示控制的单调性** — 对任意包含至少一个 `type === '平台授权'` 渠道的渠道集合，组件应渲染目标仓映射区域；对空集合或仅包含非平台授权渠道的集合，不渲染该区域
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: 映射添加后列表包含性** — 对任意合法映射条目执行添加后，映射列表中应包含新条目，且原有条目均完整保留
    - **Validates: Requirements 2.2**
    - **Property 3: 映射删除的精确性与不变式** — 含 N 条映射，删除任意一条后，列表长度为 N-1，被删除条目不再存在，其余条目内容和顺序完全不变
    - **Validates: Requirements 2.3**
    - **Property 4: 多渠道 Tab 显示阈值** — N ≤ 1 时不渲染 Tab；N ≥ 2 时渲染 Tab 且数量等于 N
    - **Validates: Requirements 3.1, 3.2**
    - **Property 5: 跨渠道映射数据隔离性** — 对渠道 A 的映射执行任意增删改，渠道 B 的映射列表内容和数量不变
    - **Validates: Requirements 3.3, 3.4**
    - **Property 6: 同渠道内系统仓唯一性** — 合法的渠道映射列表中，任意两条不同映射的 `warehouseId` 值不能相同
    - **Validates: Requirements 4.3**
    - 测试文件路径：`src/app/dashboard/rules/inventory-sync/_components/__tests__/platform-warehouse-mapping-section.pbt.test.tsx`

- [ ] 8. 在 `rule-form.tsx` 中集成 `PlatformWarehouseMappingSection` 并实现表单校验
  - [ ] 8.1 在 `rule-form.tsx` 的"同步渠道" Section 内条件渲染 `PlatformWarehouseMappingSection`
    - 在 EDI Retailer 字段块之后追加条件渲染：`{showPlatformWarehouseConfig ? <PlatformWarehouseMappingSection ... /> : null}`
    - 传递 `platformChannels`、`mappings={form.platformWarehouseMappings}`、`onChange` 回调（更新 `form.platformWarehouseMappings`）
    - 平台授权渠道配置区域的修改不影响 EDI 相关字段（`retailerInput`、`ownerMode`）
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ] 8.2 在 `handleSave` 前添加 `platformWarehouseMappings` 表单校验逻辑
    - 校验规则（仅当 `showPlatformWarehouseConfig` 时触发）：
      1. 系统仓未选择 → 显示「请选择系统仓」，阻止保存（Requirements 4.1）
      2. 平台目标仓代码为空或仅空白字符 → 显示「请填写平台目标仓代码」，阻止保存（Requirements 4.2）
      3. 同一渠道内 `warehouseId` 重复 → 显示「该仓库已存在映射，请勿重复配置」，阻止保存（Requirements 4.3）
      4. `platformLocationCode` 长度超过 64 字符 → 显示「代码不超过 64 个字符」，优先于非法字符错误（Requirements 4.5）
    - 允许不配置任何映射时保存规则（Requirements 4.6）
    - 校验通过后立即清除对应字段的错误提示（Requirements 4.7）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 8.3 为序列化/反序列化逻辑编写属性测试（PBT）
    - **Property 7: 规则保存的 Round-Trip（存储往返一致性）** — 对任意合法的 `FormState.platformWarehouseMappings`，序列化为 `SyncRule.actions.channelConfigs` 后再反序列化，应得到与原始配置等价的数据
    - **Validates: Requirements 5.1, 5.3**
    - 测试文件路径：`src/features/inventory/sync/rules/__tests__/channel-configs-round-trip.pbt.test.ts`

- [ ] 9. Final Checkpoint — 全量验证
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- 标注 `*` 的子任务为可选（测试相关），可跳过以加速 MVP，但属性测试对捕捉隐蔽的状态隔离 Bug 有较高价值
- 每个任务都引用了具体需求条款，便于追溯
- `WarehouseMappingRow` 和 `PlatformWarehouseMappingSection` 作为独立组件文件创建，避免 `rule-form.tsx` 过度膨胀
- `resolveTargetWarehouse` 的 `channelId` 参数当前版本仅作为日志上下文，未来可扩展为按渠道分组的精确路由逻辑
- PBT 测试需要先完成任务 1.1（安装 `fast-check`）
- 属性测试采用 `fast-check` 的 `fc.property` + `vitest` 的 `expect`；UI 渲染类属性测试可结合 `@testing-library/react`（如需，在任务执行前另行安装）
- 序列化/反序列化函数（任务 5.3 / 5.4）建议提取为独立的 `serializeChannelConfigs` / `deserializeChannelConfigs` 工具函数，以便 PBT 直接测试

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2"] },
    { "id": 2, "tasks": ["3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
