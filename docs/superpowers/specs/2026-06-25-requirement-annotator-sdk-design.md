# Requirement Annotator SDK Design

## Goal

Build a portable React/Next Requirement Annotator SDK that can be inserted globally into any React or Next.js project. The tool lets users annotate finished UI pages, describe field and workflow requirements, preview the generated PRD online, copy the PRD, and export it as Markdown.

The first version will be implemented inside this project, but the module boundaries should make it easy to extract into a reusable package later.

## Scope

### In Scope

- Global annotator entry mounted once in the application layout.
- Page annotation mode for selecting fields, buttons, table columns, filters, sections, cards, navigation items, and other UI elements.
- Requirement editing drawer for manual edits and AI-generated drafts.
- Business flow management for user journeys and state transitions.
- Real-time PRD preview with Markdown source and rendered preview modes.
- One-click copy of the generated PRD Markdown.
- Markdown export to a project file.
- Project-file storage for structured annotation data.
- Stable target binding through `data-prd-id` when available, with selector/text metadata fallback.

### Out of Scope For V1

- Multi-user collaboration.
- Remote database storage.
- PDF export.
- Flowchart canvas editing.
- Browser extension or bookmarklet injection.
- Full npm package publishing.

## Recommended Approach

Use an embedded React SDK with a small amount of optional component markup support.

The SDK should work immediately after being mounted in the root layout. Developers can optionally add `data-prd-id` attributes to important UI elements to make annotations more stable across DOM changes.

This gives the best balance between fast adoption and long-term portability:

- Default behavior: click any visible element and annotate it.
- Stable behavior: add `data-prd-id` to important fields or regions.
- Future behavior: extract the SDK and schema into a package usable by other React projects.

## User Experience

### Global Entry

A floating `Annotate / PRD` control appears in the app. It can open the annotation workspace without affecting the page's normal behavior when annotation mode is disabled.

### Annotation Mode

When annotation mode is enabled:

1. Hovering page elements highlights the current target.
2. Clicking an element creates or opens an annotation.
3. The selected element is linked to metadata collected from the DOM:
   - `data-prd-id` if present.
   - Element role/type.
   - Visible label or text.
   - CSS selector fallback.
   - Current route and page id.

### Annotation Editing

The right-side drawer lets users edit:

- Title.
- Description.
- Business rule.
- Interaction rule.
- Data source.
- Validation rule.
- Permission rule.
- Acceptance criteria.
- Open questions.
- Source: AI, manual, or edited AI.
- Status: draft, confirmed, todo, or implemented.

### Flow Editing

The Flow Builder lets users describe process-level requirements that cannot be captured by a single field annotation.

Each flow includes:

- Actor.
- Trigger.
- Preconditions.
- Ordered steps.
- Optional step-to-annotation links.
- Expected result per step.
- Exception handling per step.
- End state.
- Open questions.

V1 should use form-based flow editing. It should also reserve an entry point where users can paste a natural-language flow description and have AI convert it into structured steps later.

### PRD Preview

The PRD panel generates the page PRD from the current annotations and flows. It supports:

- Rendered preview mode.
- Markdown source mode.
- Copy full Markdown.
- Export `.md` file.

The preview should update whenever annotations or flows change.

## Architecture

### `RequirementAnnotator`

The global runtime component. It owns the open/closed state, current route, selected annotation, active mode, and wiring between picker, drawer, flow builder, PRD preview, and storage.

### `ElementPicker`

Handles page interaction when annotation mode is active:

- Tracks hovered elements.
- Draws the target highlight overlay.
- Prevents accidental page interactions while picking.
- Extracts target metadata.
- Calls back with a normalized target object.

### `AnnotationDrawer`

Displays and edits the current page's annotations. It should support adding, editing, deleting, and changing status.

### `FlowBuilder`

Displays and edits structured business flows for the current page. It should allow steps to reference annotation ids when a flow step maps to a specific UI element.

### `PrdPreviewPanel`

Displays generated PRD output. It controls preview/source mode, copy, and export actions.

### `PrdGenerator`

Pure generation layer that converts structured page data into Markdown. It should be framework-independent so it can later be reused in scripts, API routes, or other apps.

### `StorageAdapter`

Abstract persistence interface. V1 should use a file-backed adapter through Next.js API routes.

Future adapters can support localStorage or a remote API without changing the UI layer.

## Data Model

```ts
type RequirementAnnotation = {
  id: string;
  pageId: string;
  route: string;
  target: {
    selector?: string;
    prdId?: string;
    label?: string;
    elementType:
      | 'field'
      | 'button'
      | 'table-column'
      | 'filter'
      | 'section'
      | 'card'
      | 'navigation'
      | 'other';
  };
  content: {
    title: string;
    description: string;
    businessRule?: string;
    interactionRule?: string;
    dataSource?: string;
    validationRule?: string;
    permissionRule?: string;
    acceptanceCriteria: string[];
    openQuestions: string[];
  };
  source: 'ai' | 'manual' | 'edited-ai';
  status: 'draft' | 'confirmed' | 'todo' | 'implemented';
};

type RequirementFlow = {
  id: string;
  pageId: string;
  title: string;
  actor?: string;
  trigger: string;
  preconditions: string[];
  steps: Array<{
    order: number;
    action: string;
    targetAnnotationId?: string;
    expectedResult: string;
    exception?: string;
  }>;
  endState: string;
  openQuestions: string[];
};

type RequirementPageDocument = {
  pageId: string;
  route: string;
  title: string;
  goal?: string;
  actors: string[];
  annotations: RequirementAnnotation[];
  flows: RequirementFlow[];
  updatedAt: string;
};
```

## File Storage

V1 stores structured data and exported PRDs in the project:

```txt
prd-annotations/
  dashboard-outbound.json
  dashboard-outbound.prd.md
```

The JSON file is the source of truth. The Markdown file is generated output.

Suggested API routes:

- `GET /api/prd-annotations?route=/dashboard/outbound`
- `POST /api/prd-annotations`
- `POST /api/prd-annotations/export`

The API must restrict writes to the intended annotation directory and sanitize page ids to prevent path traversal.

## PRD Output Standard

Generated Markdown should follow this structure:

```md
# Page PRD: {Page Name}

## 1. Page Goal
## 2. User Roles
## 3. Page Structure
## 4. Fields And Rules
## 5. Business Flows
## 6. Interactions
## 7. Permissions And States
## 8. Acceptance Criteria
## 9. Open Questions
```

The generated PRD should group annotations by element type or page region where possible. Flows should appear as ordered procedures, with linked UI annotations referenced by title.

## AI Integration

AI support should be designed as an enhancement, not a dependency for V1.

Planned AI-assisted actions:

- Generate initial annotation drafts from page structure.
- Rewrite manual notes into clearer product-language requirements.
- Convert pasted flow descriptions into structured flow steps.
- Summarize annotations and flows into a PRD.
- Identify missing sections, weak acceptance criteria, or unresolved questions.

The system should always let users review and edit AI-generated content before saving it as confirmed.

## Validation And Error Handling

- Validate annotation and flow payloads before saving.
- Prevent path traversal when writing files.
- Show a clear error if file saving fails.
- Preserve unsaved edits in component state while the panel is open.
- Treat Markdown export as derived output; users can regenerate it from JSON.

## Testing Strategy

- Unit test the PRD generator with representative annotation and flow documents.
- Unit test page id sanitization and file path resolution.
- Component test the annotation drawer and PRD preview state changes if practical.
- Manual browser verification for annotation mode, editing, saving, preview, copy, and export.

## Migration Path

After V1 works in this project:

1. Move schema, generator, and core components into a dedicated SDK folder.
2. Replace project-specific imports with package-relative imports.
3. Add adapter interfaces for framework-specific storage.
4. Extract to an npm package or reusable internal template.
5. Add optional browser-plugin support later using the same schema.
