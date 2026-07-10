# Requirement Annotator Usability Redesign

## Goal

Redesign the requirement annotator from a page-marker tool into a structure-first PRD workspace. The tool should work for different projects by combining automatic structure detection with manual editing, while keeping preview and export out of the way until the user asks for them.

## Problems To Solve

- Users cannot freely maintain the project structure. They need to add, delete, rename, and organize modules, pages, fields, actions, and flows.
- The PRD preview is always visible and consumes space even when the user is still organizing or editing requirements.
- Saved data feels scattered because annotations are stored as a flat page list instead of a readable project document.
- The current modes are confusing: hidden, review, edit, marker selection, drawer editing, and preview compete for attention.

## Recommended Approach

Use a structure-first workspace.

The left side becomes the primary project tree. The tool can automatically detect an initial tree from routes, navigation labels, and visible page sections, but every detected item remains editable. The user can manually add, delete, rename, and reorder nodes. Requirements are always attached to a selected structure node, so saved data and exported PRDs stay organized.

## User Experience

### Workspace Modes

The floating entry opens a workspace with three clear modes:

1. Organize: edit the project structure tree.
2. Annotate: select page elements and attach requirements to the active tree node.
3. Preview: open the generated PRD only when needed.

The default mode is Organize. Preview is hidden by default and opens from a `Preview PRD` action.

### Structure Tree

The tree supports these node types:

- Module
- Page
- Section
- Field
- Action
- Flow
- Other

Users can:

- Add a sibling or child node under the selected node.
- Delete a node after confirmation.
- Rename a node inline.
- Reorder nodes within the same parent.
- Move requirements between nodes.
- Run automatic structure detection again and review suggested additions before merging them.

### Automatic Detection

Detection should create useful suggestions, not overwrite the user's structure.

Initial detection sources:

- Existing app route and current pathname.
- Navigation/menu labels already available to the annotator.
- Visible headings, sections, forms, buttons, tables, and filters on the current page.
- Existing annotations from older flat documents.

The user reviews suggested nodes before merging them into the tree.

### Node Editing

The middle panel edits only the currently selected node.

For Module and Page nodes, the editor shows:

- Title
- Description or goal
- Actors
- Scope notes
- Open questions

For Section, Field, Action, and Other nodes, the editor shows:

- Title
- Description
- Business rule
- Interaction rule
- Data source
- Validation rule
- Permission rule
- Acceptance criteria
- Open questions
- Status

For Flow nodes, the editor shows:

- Actor
- Trigger
- Preconditions
- Ordered steps
- Expected result
- Exceptions
- End state
- Open questions

### Element Annotation

Page picking becomes an attachment helper.

When Annotate mode is active, selecting a page element creates or updates a requirement under the currently selected tree node. If no editable node is selected, the tool asks the user to choose or create a node first. This prevents new annotations from becoming detached or scattered.

### PRD Preview

Preview is not rendered by default. The user opens it from `Preview PRD`.

The preview should support:

- Rendered view
- Markdown source view
- Copy Markdown
- Export Markdown
- Close preview and return to editing

## Data Model

The saved document should be tree-shaped and readable.

```ts
type RequirementTreeNode = {
  id: string;
  type: 'module' | 'page' | 'section' | 'field' | 'action' | 'flow' | 'other';
  title: string;
  route?: string;
  target?: RequirementTarget;
  content: RequirementNodeContent;
  children: RequirementTreeNode[];
};

type RequirementProjectDocument = {
  schemaVersion: 2;
  projectName: string;
  rootNodes: RequirementTreeNode[];
  updatedAt: string;
};
```

Existing flat documents can be migrated by grouping annotations under route/page nodes, then under their current group.

## Architecture Changes

### `RequirementAnnotator`

Owns workspace mode, selected node id, project document state, loading, saving, and migration from older documents.

### `ProjectStructureTree`

Replaces the current read-only tree navigation with an editable tree. It handles node selection, add, delete, rename, reorder, and suggestion merge entry points.

### `StructureDetector`

Pure detection layer that reads known menu items and safe DOM metadata to produce suggested tree nodes. It does not mutate saved data directly.

### `NodeEditor`

Replaces the current annotation-only drawer form. It renders the correct editor for the selected node type.

### `ElementPicker`

Keeps the existing element selection behavior, but writes target metadata onto the active tree node or creates a child requirement under it.

### `PrdPreviewPanel`

Becomes conditional UI opened only in Preview mode.

### `PrdGenerator`

Generates Markdown from the tree document. Output order follows the tree order.

### `StorageAdapter`

Saves schema version 2 tree documents. It can read schema version 1 flat documents and migrate them in memory before saving.

## Saving Rules

- Every requirement must belong to a tree node.
- The saved file uses stable ordering from the tree.
- Auto-detected suggestions are not saved until the user merges them.
- Deleting a node deletes its children after confirmation.
- Exported PRD follows the same order as the saved tree.

## Testing

- Unit test tree operations: add, delete, rename, reorder, and move.
- Unit test migration from existing flat annotation documents to tree documents.
- Unit test PRD generation order from tree data.
- Manual browser test the main flow: detect structure, edit tree, attach an element, save, reopen, preview, copy, and export.

## Out Of Scope

- Multi-user collaboration.
- Remote database storage.
- PDF export.
- Drag-and-drop canvas flow editing.
- Full npm package extraction.
