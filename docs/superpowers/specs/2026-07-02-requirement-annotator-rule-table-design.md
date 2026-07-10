# Requirement Annotator Rule Table Design

## Goal

Improve requirement writing inside each annotation by replacing separate long-form rule fields with a compact editable rule table. The table should make rules easier to scan, add, and export as PRD-ready Markdown.

## User Experience

For Field, Action, Section, and Other annotation nodes, the editor keeps the existing basic fields:

- Title
- Description
- Node status
- Open questions

The detailed rule-writing area becomes an editable table. Users can add, edit, and delete rows. Each row represents one requirement rule.

The table uses five fixed columns:

| Column | Purpose |
| --- | --- |
| Rule type | Classifies the rule as business, interaction, data, validation, permission, acceptance, or other. |
| Rule description | The main requirement statement. |
| Trigger / condition | When the rule applies. This can be empty when the rule is always active. |
| System behavior / hint | What the UI or system should show, block, calculate, validate, or return. |
| Notes | Extra context, edge cases, or unresolved details. |

A new row defaults to rule type `business` with empty text fields. Row-level status is intentionally excluded because the annotation node already has one status. This keeps the table focused on requirement content instead of project tracking.

## Data Model

Add a structured `rules` array to annotation node content:

```ts
type RequirementRuleType = 'business' | 'interaction' | 'data' | 'validation' | 'permission' | 'acceptance' | 'other';

type RequirementRule = {
  id: string;
  type: RequirementRuleType;
  description: string;
  condition?: string;
  behavior?: string;
  notes?: string;
};
```

`RequirementNodeContent` should include:

```ts
rules: RequirementRule[];
```

Existing fields such as `businessRule`, `interactionRule`, `dataSource`, `validationRule`, `permissionRule`, and `acceptanceCriteria` can be migrated into rule rows when documents are normalized. After migration, the rule table becomes the primary editing and export source.

## Editor Behavior

The node editor should render a rule table for annotation-like nodes:

- Add row creates a new empty rule.
- Delete row removes that rule after a lightweight confirmation only when the row has content.
- Rule type uses a compact select control.
- Text columns use inline textarea-style cells so longer rules remain readable.
- Empty optional cells are allowed.
- The table should remain usable inside the current right-side workspace without requiring a full-page editor.

Flow nodes continue to use their flow-specific step editor. Module and Page nodes keep their existing page-level fields and do not need the rule table.

## PRD Output

Generated PRD output should use Markdown tables for annotation rules. For each annotated node with rules, output a table like:

```md
| Type | Rule | Condition | System Behavior / Hint | Notes |
| --- | --- | --- | --- | --- |
| Validation | Amount is required. | When submitting the form. | Show an inline required-field message. | Confirm exact copy later. |
```

If a node has no rule rows, the generator can fall back to its description and open questions. If old documents still contain legacy rule fields, migration should make them appear as rule rows before generation.

## Compatibility

The implementation should avoid breaking existing annotation data:

- Normalize missing `rules` to an empty array.
- Convert legacy rule fields into rule rows when present.
- Preserve node-level `status` as the only status field.
- Keep exported Markdown deterministic by preserving row order.

## Testing

- Unit test content normalization for documents with missing `rules`.
- Unit test migration from legacy rule fields to rule rows.
- Unit test PRD generation for rule tables.
- Manually verify adding, editing, deleting, saving, reopening, previewing, copying, and exporting rules in the browser.
