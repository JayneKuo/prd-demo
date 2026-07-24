# OMS Event Log & Message Trace Design

## Goal

Replace the single generic developer logs page with a business-oriented OMS event log system that lets business users answer five questions quickly:

1. Which business document failed?
2. Which step failed?
3. Did the step finish, and what was the result?
4. What data was received, transformed, sent, and returned?
5. After fixing the issue, should the user re-consume or re-push?

The first implementation version covers information architecture, event modeling, list/detail presentation, attempt history, and controlled recovery actions using realistic mock data.

## Information Architecture

Under the existing `开发者 / Developers` group, split the current single log entry into four dedicated menus:

- 销售订单 / 出库日志
- PO / 入库日志
- 调拨日志
- 库存日志

Each menu leads to an independent page because the business numbers, event types, and suggested actions differ by domain. However, all four pages should share one unified event-log UI framework and one common event-log data model.

## Business Domains and Event Scope

### 1. Sales Order / Outbound Log

Covers sales-order fulfillment flow, including:

- Order Reception
- Order Creation
- Order Update
- Order Cancellation
- Order Hold
- Order Release
- Warehouse Routing
- Delivery Order Creation
- Delivery Order Submission
- Shipping Confirmation Reception
- Shipping Confirmation Processing
- Shipment Creation
- Shipment Synchronization

### 2. PO / Inbound Log

Covers PO and inbound flow, including:

- Purchase Order Reception
- Purchase Order Creation
- Purchase Order Update
- Purchase Order Cancellation
- Inbound Order Creation
- Inbound Order Submission
- Receipt Confirmation Reception
- Receipt Confirmation Processing
- Receipt Confirmation Synchronization

### 3. Transfer Log

Covers transfer flow, including:

- Transfer Order Creation
- Transfer Order Update
- Transfer Order Cancellation
- Transfer Out Creation
- Transfer In Creation
- Transfer Out Submission
- Transfer In Submission
- Transfer Shipping Confirmation Reception
- Transfer Shipping Confirmation Processing
- Transfer Receipt Confirmation Reception
- Transfer Receipt Confirmation Processing
- Transfer Completion

### 4. Inventory Log

Covers inventory flow, including:

- Inventory Reception
- Inventory Validation
- Inventory Update
- Inventory Synchronization

## Core Modeling Principles

### Event Type

Event Type describes what the system is doing, never the outcome.

Good example:

- Event Type: `Shipment Creation`

Bad example:

- Event Type: `Shipment Creation Failed`

### Execution Status vs Execution Result

Execution status and execution result must remain separate.

#### Execution Status

- `Pending`
- `Processing`
- `Completed`
- `Cancelled`

#### Execution Result

- `Success`
- `Failed`
- `Partial Success`
- `Skipped`
- `—`

Examples:

- `Pending` + `—`
- `Processing` + `—`
- `Completed` + `Success`
- `Completed` + `Failed`
- `Completed` + `Partial Success`
- `Cancelled` + `—`

### Recovery Action Meaning

- `Re-consume` applies to failed inbound or internal processing.
- `Re-push` applies to failed outbound delivery.
- `View Attempts` applies when more than one attempt exists.
- `View Details` always exists.

The generic word `Retry` should not be shown because it does not tell the user whether the system will repeat business processing or resend an outbound message.

## Shared Event Log Row Structure

Each event row should include:

- Event Time
- Business Domain
- Event Type
- Direction
- Source System
- Target System
- Primary Business No.
- Related Business No.
- Execution Status
- Execution Result
- Current Attempt
- Error Message
- Suggested Action
- Action

The list should not hide all business numbers behind the drawer. The first version should show these business-number columns directly in the table when available:

- Channel Sales Order No.
- OMS SO No.
- Purchase Order No.
- PO No.
- Transfer Order No.
- Reference No.

Other identifiers such as Inbound Order No., DN No., DC No., Shipment No., and SKU can remain grouped in `Related Business No.` or the detail drawer.

## Filters

All four pages should support the same filter framework:

- Keyword
- Business Domain
- Event Type
- Direction
- Source System
- Target System
- Execution Result
- Trigger Type
- Event Time
- Trace ID

Keyword should match:

- Business numbers
- Event Type
- Error Message
- Source System
- Target System
- API name
- Trace ID

## Detail Drawer Structure

Clicking `View Details` or a row opens a drawer.

### 1. Overview

Show:

- Event ID
- Trace ID
- Event Type
- Operation
- Direction
- Source System
- Target System
- Trigger Type
- Execution Status
- Execution Result
- Attempt Count
- Started Time
- Completed Time
- Duration
- Error Code
- Error Message
- Suggested Action

### 2. Related Business Numbers

Show only non-empty fields, such as:

- Channel Order No.
- OMS Order No.
- Purchase Order No.
- Reference No.
- PO No.
- Inbound Order No.
- DN No.
- DC No.
- Shipment No.
- Transfer Order No.
- Transfer Out No.
- Transfer In No.
- SKU

### 3. Data Tabs

Use one unified tab set:

- Inbound Raw Data
- Normalized OMS Data
- Outbound Raw Data
- Response Data
- Error Details

#### Inbound Raw Data

The raw message received by OMS.

#### Normalized OMS Data

The standardized OMS data after mapping and normalization.

#### Outbound Raw Data

The payload sent from OMS to an external system.

#### Response Data

The target system response should include:

- HTTP Status
- Business Response Code
- Response Message
- Response Payload
- Response Time

#### Error Details

Show:

- Failed Step
- Error Code
- Error Type
- Error Message
- Suggested Action

### 4. Attempts

If there are multiple attempts, the drawer should show a dedicated attempts section or attempts tab with rows containing:

- Attempt
- Trigger Type
- Triggered By
- Result
- HTTP Status
- Time
- Duration

Each attempt should preserve its own request data, response data, result, error message, operator, and timestamps.

## Suggested Action Rules

Suggested action text should be generated from the failure context.

### Inbound / Internal failure

`Correct the issue, then re-consume the affected message.`

### Outbound failure

`Correct the issue, then re-push the affected message.`

### Configuration missing

`Complete or correct the required configuration, then re-consume the affected message.`

### External API issue

`Verify the target system or connection, then re-push the affected message.`

### Data validation issue

`Correct the invalid data, then re-consume the affected message.`

## Action Column Rules

The action area should be derived from direction, status, result, and attempt count.

### Always available

- `View Details`

### Conditional actions

- `Re-consume` when `Execution Result = Failed` and `Direction = Inbound` or `Internal`
- `Re-push` when `Execution Result = Failed` and `Direction = Outbound`
- `View Attempts` when `Attempt Count > 1`

### Hidden or disabled

- Do not show recovery action for success rows.
- Disable recovery action while execution is in progress.
- Outbound rows already confirmed successful should not allow re-push.

## Recovery Confirmation UX

The first version should include UI-level confirmation flows for both recovery actions.

### Re-consume confirmation

Prompt:

`Are you sure you want to re-consume this message?`

Supporting text:

`The original inbound message will be processed again. This action may update business data or create related business records.`

### Re-push confirmation

Prompt:

`Are you sure you want to re-push this message?`

Supporting text:

`The outbound message will be sent to the target system again. Please confirm that the target system has not already processed the previous request.`

Confirmation dialogs should show:

- Event Type
- Target System
- Related Business No.
- Last Result
- Last Attempt Time

The first version does not need to connect these actions to a real backend API, but the UI contract must be present.

## Idempotency and Safety Messaging

The detail drawer and recovery confirmation should make the intended distinction explicit:

- `Re-consume` means replaying OMS-side business processing from the stored inbound message.
- `Re-push` means resending an already prepared outbound message.

When the previous outbound result is unknown, the UI should show:

`The previous request result is unknown. Re-pushing may cause duplicate processing in the target system.`

## Permissions and Audit

The first version should reserve structure for the following permission concepts:

- View Event Log
- View Raw Message
- Re-consume Event
- Re-push Event
- View Technical Error
- Download Message

The first version should also reserve space in mock data and detail UI for audit-related fields:

- Operator
- Operation
- Reason
- Event ID
- Attempt ID
- Operation Time
- Before Result
- After Result

## First-Version Scope

This implementation should do the following now:

- Add four log menus under `开发者`
- Add four dedicated pages
- Replace the previous generic log schema with OMS event-log schema
- Provide per-domain mock data
- Provide list filtering by keyword and trace ID-like fields
- Provide detail drawer sections for overview, related numbers, data, error details, and attempts
- Show directional action rules for `Re-consume`, `Re-push`, and `View Attempts`
- Show UI confirmation states for recovery actions

This implementation should not yet do the following:

- Real backend queries
- Real replay or resend APIs
- Real permission enforcement
- Real audit submission
- Real deduplication checks

## Success Criteria

The design is successful when a business user can open any of the four domain log pages and immediately determine:

- which document failed
- which event step failed
- whether the event completed and how it ended
- what data OMS received, normalized, sent, and received back
- whether to re-consume or re-push after the issue is fixed
