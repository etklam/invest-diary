# Quicknote Consolidation and Tech Debt Plan

## Summary
This plan combines the current project tech-debt review with the clarified quicknote product definition:

- Quicknote is a template-driven diary wizard.
- It should help the user generate a diary faster.
- It must still preserve a free editor with voice input, templates, draft restore, reminders, and tags.
- Quicknote output is still a normal diary entry, not a separate product with a separate persistence model.

The plan is intentionally phased so low-risk contract fixes land first, and larger structural changes happen only after behavior is locked down with tests.

## Product Definition
### Quicknote target behavior
- Quicknote is one feature, not two competing flows.
- Template selection is an accelerator, not a constraint.
- Users can start from a template and then freely edit the result.
- Quicknote should support:
  - free text input
  - voice input
  - reusable templates/snippets
  - draft restore/autosave
  - reminders
  - tags
- Quicknote should save through the same diary domain model as standard diary creation.

### UI model
- Modal flow remains a valid entry point from the diary list.
- A dedicated page can still exist, but it should use the same editor core and save contract.
- Template selection and free editing should be part of the same quicknote workflow.

## Current Debt Snapshot
### P0 issues
- Logout does not fully clear the legacy `auth-token` path even though middleware and websocket auth still accept it.
- Diary tags are modeled in schema and used in UI, but current diary create/update/list APIs do not persist or return them.

### P1 issues
- `QuickDiaryModal` and `QuickDiaryOneLiner` implement two different concepts of "quick diary".
- Quicknote classification currently depends on `title === 'Quick Diary'`, which does not match the intended product definition.
- Auth/session recovery is fragmented across middleware, plugin-level error handling, and multiple page-level `401` catch blocks.
- API validation and error contracts are inconsistent across endpoints.

### P2 issues
- Market data fetching logic is duplicated across stock and ETF paths.
- Large SFCs mix UI, state, formatting, submission, and side effects in one file.
- Logging is only partially standardized even though a unified logger already exists.
- Test coverage is concentrated in a narrow part of the codebase.

## Goals
- Remove silent data-loss and session contract issues first.
- Unify quicknote into one product model with one persistence path.
- Keep behavior stable for existing diary flows while reducing branching logic.
- Replace title-based heuristics with explicit domain intent where needed.
- Improve maintainability without forcing a risky big-bang rewrite.

## Non-Goals
- No full visual redesign of the diary or quicknote experience in this effort.
- No broad database redesign beyond what is required to support explicit quicknote metadata if that metadata is adopted.
- No immediate renaming sweep across every file unless it reduces confusion without breaking behavior.

## Guiding Principles
- Lock behavior with tests before refactoring.
- Prefer explicit metadata over title-based heuristics.
- Prefer one shared save pipeline over multiple ad hoc flows.
- Separate UI shell concerns from editor concerns from persistence concerns.
- Keep each phase deployable on its own.

## Recommended Sequence
1. Safety rails and low-risk contract fixes
2. Quicknote boundary consolidation
3. Auth/error/observability unification
4. Structural refactor and provider convergence

## Phase 0: Safety Rails and Low-Risk Fixes
### Scope
- Add tests for the current weak contracts before changing behavior.
- Fix the legacy logout gap.
- Repair the diary tags contract end-to-end.

### Tasks
- Add auth tests covering legacy `auth-token` cleanup on logout.
- Add diary API tests covering tags persistence and response shape.
- Add quicknote tests covering the intended contract for template-driven creation.
- Update auth cookie cleanup so logout clears `access-token`, `refresh-token`, and legacy `auth-token`.
- Persist `tags` in diary create and update APIs.
- Return tags in diary list/detail responses.

### Files likely involved
- `tests/api/auth.test.ts`
- `tests/api/diaries.test.ts`
- `tests/unit/server/auth.cookies.test.ts`
- `server/utils/auth.ts`
- `server/api/auth/logout.post.ts`
- `server/api/diaries.post.ts`
- `server/api/diaries/[id].put.ts`
- `server/api/diaries.get.ts`
- `server/api/diaries/[id].get.ts`
- `types/diary.ts`

### Exit criteria
- Legacy cookie logout path is covered by tests.
- Diary tag persistence expectations are covered by tests.
- Tags round-trip from UI to database to API response.
- No existing auth tests regress.

## Phase 1: Quicknote Product Consolidation
### Problem to solve
The current implementation splits quicknote into two separate mental models:

- `components/QuickDiaryModal.vue`
  - template-driven modal wizard
  - tends to append into today's diary
- `components/QuickDiaryOneLiner.vue`
  - free-form quick note creator
  - creates a new diary titled `Quick Diary`

This is the main mismatch with the intended product definition.

### Target architecture
- One quicknote domain flow
- One shared editor capability layer
- Optional multiple shells:
  - modal shell
  - dedicated page shell

### Recommended structure
- Keep a shell component responsible for:
  - opening/closing
  - template selection
  - date mode
  - submit mode
- Extract or evolve a shared editor component responsible for:
  - text editing
  - voice input
  - snippet/template insertion
  - draft restore
  - reminders
  - tags
- Convert template selection into editor prefill instead of hardcoded final markdown generation only.

### Detailed merge strategy
Do not directly embed `QuickDiaryOneLiner.vue` into the modal.

That component currently mixes:
- editor UI
- autosave/draft behavior
- reminder handling
- tags
- save API call
- page-specific assumptions such as fixed title and single-button save

The safer path is to extract its reusable editor capabilities, then let the modal own the wizard experience.

### Target component tree
- `QuickNoteModalShell`
  - retains the current glassmorphism UI and stepper feel
  - owns `step`, open/close, and template selection
- `QuickNoteTemplatePicker`
  - current step 1 cards: trading / reflection / observation / optional blank
- `QuickNoteTemplateAssistant`
  - current structured fields from the modal
  - edits template-specific structured input
- `QuickNoteEditorCore`
  - shared free editor
  - title
  - content
  - voice input
  - template snippets
  - tags
  - reminder controls
  - draft restore
- `QuickNoteSubmitBar`
  - create vs append behavior
  - save button
  - optional reset/regenerate controls

The dedicated quicknote page should reuse:
- `QuickNoteEditorCore`
- `QuickNoteTemplateAssistant` when template mode is selected

It should only differ in shell layout, not in save logic.

### Shared state contract
Introduce one quicknote composer state instead of letting modal and one-liner each own separate form models.

Recommended shape:

```ts
type QuickNoteTemplateKind = 'blank' | 'trading' | 'reflection' | 'observation'
type QuickNoteSaveMode = 'create' | 'append'

interface QuickNoteComposerState {
  saveMode: QuickNoteSaveMode
  date: string
  templateKind: QuickNoteTemplateKind

  title: string
  content: string
  tags: string[]

  reminders: {
    reminder1: string | null
    reminder2: string | null
    reminder3: string | null
  }

  templateData: {
    tradingType?: string
    symbols?: string
    marketMood?: string
    note?: string

    marketCondition?: string
    rating?: number
    noRashTrading?: boolean
    goodPoints?: string
    improvePoints?: string

    topic?: string
    observationType?: string
    observationContent?: string
    action?: string
  }

  titleTouched: boolean
  contentTouched: boolean
}
```

Recommended owner:
- new composable: `useQuickNoteComposer.ts`

This composable should become the single place that:
- initializes state
- integrates draft storage
- applies template presets
- appends voice transcript
- applies snippet templates
- tracks whether title/content were manually edited
- exposes one `save()` entrypoint

### Template behavior rule
Current modal behavior generates final markdown directly from structured inputs.
That is too rigid for the intended product.

Replace it with this rule:
- template selection creates a suggested title/content scaffold
- structured template fields update the suggestion
- title/content remain editable at all times
- if the user has already edited title/content manually, template changes should not overwrite automatically
- instead provide:
  - `Regenerate from template`
  - or `Apply template changes`

This avoids destructive updates while preserving the wizard feel.

### Concrete data flow
1. User opens quicknote modal.
2. Shell initializes `useQuickNoteComposer()`.
3. Step 1 selects `templateKind`.
4. Shell calls `composer.applyTemplateKind(kind)`.
5. Step 2 renders:
   - top: `QuickNoteTemplateAssistant`
   - bottom: `QuickNoteEditorCore`
6. Assistant updates `templateData`.
7. Composer computes `suggestedTitle` and `suggestedContent`.
8. If `titleTouched` / `contentTouched` are false, composer syncs suggestions into editable fields.
9. If user already edited manually, show non-destructive regenerate/apply controls instead.
10. Submit bar calls shared `composer.save()`.

### Save pipeline
Introduce one shared save function instead of two component-local API calls.

Recommended composable or helper:
- `useQuickNoteSubmit.ts`

It should:
- normalize outgoing diary payload
- support explicit `saveMode`
- map quicknote state to the existing diary API
- own success/error behavior for quicknote saves

Recommended payload behavior:
- `create`
  - create a normal diary
- `append`
  - call the same diary API with `appendToToday: true`

Important:
- do not encode quicknote identity in title text
- do not keep one-liner's current hardcoded `title: 'Quick Diary'` behavior as the long-term contract

### Draft strategy
Current draft storage only tracks:
- content
- tags
- date

That is too small for the merged quicknote model.

Extend draft shape to include:
- title
- templateKind
- templateData
- saveMode

This should happen in the shared composer, not in the shells.

### Reminder strategy
Keep the current reminder semantics in the first merge step:
- client-side quicknote reminder state
- local storage based
- not yet mapped to server-side diary alerts

This keeps the merge low-risk.

If product later wants reminders to become actual diary alerts, do that as a separate feature after the merge.

### Recommended migration order
#### Step 1: Extract save logic first
- Move OneLiner's API save logic into shared quicknote submit code.
- No UI change yet.

#### Step 2: Extract editor capability block
- Create `QuickNoteEditorCore` from `QuickDiaryOneLiner.vue`.
- Move these features into it:
  - content input
  - voice input
  - snippet template application
  - tag controls
  - reminder controls
  - draft restore/autosave
- Keep it presentation-neutral enough for both modal and page.

#### Step 3: Add missing editor fields required by merged model
- Add editable `title`.
- Add explicit save mode toggle or shell-provided mode.
- Keep `date`.

#### Step 4: Keep modal wizard, replace step 2 body
- Preserve current `QuickDiaryModal.vue` shell and visual treatment.
- Keep its step 1 template picker.
- Replace its current hardcoded preview-and-submit block with:
  - `QuickNoteTemplateAssistant`
  - `QuickNoteEditorCore`
  - shared submit bar

#### Step 5: Reuse the same core in `/diaries/quick`
- Update `pages/diaries/quick.vue` to use the same composer and editor core.
- Keep the page as a thin shell; do not preserve a separate recent-history feature there.

#### Step 6: Remove duplicate save assumptions
- Remove hardcoded `Quick Diary` title contract.
- Remove duplicated save code from modal and one-liner.
- Stop relying on title-based quicknote filtering.

### What should stay where
Keep in modal shell:
- glass UI
- animations
- step transitions
- template picker cards
- mobile vs desktop layout decisions

Keep in shared editor core:
- input area
- title/content binding
- voice input
- reusable snippets
- tags
- reminders
- draft behavior

Keep in composer:
- source of truth state
- template application logic
- touched-state tracking
- draft serialization
- submission orchestration

Keep in helper functions:
- template-to-title/content generation
- payload normalization

### Files to add or reshape
Recommended new files:
- `composables/useQuickNoteComposer.ts`
- `composables/useQuickNoteSubmit.ts`
- `lib/quicknote/generate-template-draft.ts`
- `components/quicknote/QuickNoteEditorCore.vue`
- `components/quicknote/QuickNoteTemplateAssistant.vue`
- `components/quicknote/QuickNoteSubmitBar.vue`

Recommended existing files to convert gradually:
- `components/QuickDiaryModal.vue`
- `components/QuickDiaryOneLiner.vue`
- `pages/diaries/quick.vue`
- `composables/useQuickNoteDraft.ts`

### Concrete implementation direction
- Treat `QuickDiaryModal.vue` as the quicknote shell.
- Treat `QuickDiaryOneLiner.vue` as the starting point for the editor core.
- Either:
  - embed the editor core inside the modal, or
  - extract a shared `QuickNoteEditor` and reuse it from both modal and page shells.

### Behavior rules
- Template choice should prefill title/content structure, not bypass free editing.
- The user should always be able to modify generated content before save.
- Save behavior should be explicit:
  - create new diary
  - append to today's diary

Do not infer that behavior only from the entry point.

### Naming direction
- Product language should use `quicknote`.
- File renames can happen later if desired, but domain behavior should be unified first.
- If renaming is done, prefer:
  - `QuickDiaryModal` -> `QuickNoteModal`
  - `QuickDiaryOneLiner` -> `QuickNoteEditor`

### Files likely involved
- `components/QuickDiaryModal.vue`
- `components/QuickDiaryOneLiner.vue`
- `pages/diaries/index.vue`
- `pages/diaries/quick.vue`
- `composables/useQuickNoteDraft.ts`
- `composables/useQuickNoteTemplates.ts`
- `composables/useQuickNoteReminders.ts`

### Exit criteria
- Modal and page quicknote flows use the same editor core and save contract.
- Template-driven and free-form usage are both supported in one coherent workflow.
- The system no longer relies on title text to decide whether something is a quicknote.

## Phase 2: Auth, Error Contract, and Observability Cleanup
### Problem to solve
Auth/session handling is spread across several layers, and error handling still depends on mixed conventions.

### Tasks
- Remove page-level ad hoc `401` handling where global auth recovery already exists.
- Standardize protected API responses to use the shared error factory.
- Narrow the global error handler to one predictable auth error contract.
- Migrate server logging to the shared logger in touched files.

### Recommended scope order
- Start with pages already affected by duplicated `401` logic:
  - alerts
  - calendar
  - diary create/edit/detail
- Then standardize simple endpoints that still use manual `createError` for validation/auth.

### Files likely involved
- `plugins/error-handler.ts`
- `pages/alerts/index.vue`
- `pages/calendar.vue`
- `pages/diaries/new.vue`
- `pages/diaries/[id]/edit.vue`
- `pages/diaries/[id]/index.vue`
- `server/api/etf/watchlist/index.post.ts`
- `server/api/stocks/holdings.get.ts`
- `lib/logger.ts`

### Exit criteria
- Session recovery behavior is owned by one clear path.
- Protected APIs expose a consistent machine-readable error shape.
- Touched server flows log through the shared logger.

## Phase 3: Structural Refactor and Provider Convergence
### Problem to solve
Some pages and components have become difficult to change safely due to mixed responsibilities and duplicated external-data code.

### Tasks
- Split large SFCs into smaller UI and logic units where churn is highest.
- Extract quicknote content-building logic into testable pure functions.
- Consolidate Yahoo/TWSE fetchers behind shared market-data utilities.
- Reuse one provider strategy across stock and ETF flows where feasible.

### Priority targets
- `components/QuickDiaryModal.vue`
- `pages/stocks/index.vue`
- `pages/admin/index.vue`
- `pages/admin/blog/index.vue`
- `server/api/stocks/prices.post.ts`
- `lib/yahoo-finance.ts`

### Exit criteria
- High-churn files are reduced in responsibility.
- Shared market-data logic has one canonical implementation per provider.
- New behavior can be tested without rendering or hitting network-heavy paths.

## Data Model Decision Point
### Recommended choice
Do not use diary title text to represent quicknote identity.

If the product needs to know whether a diary originated from quicknote, add explicit metadata.

### Options
- Option A: no special persistence marker
  - Quicknote is just a creation experience
  - simplest and lowest risk
- Option B: add explicit source metadata
  - example: `source = QUICKNOTE`
  - useful if analytics, filtering, or UX differences are needed later

### Recommendation
- Start with Option A unless product requirements already need filtering/analytics by source.
- If filtering is still desired, add metadata explicitly instead of relying on titles.

## Testing Strategy
### P0 required tests
- logout clears all auth cookies, including legacy
- diary tags persist on create/update
- diary tags return in list/detail responses

### P1 required tests
- quicknote modal and quicknote page use the same save contract
- template selection prefills editor content without removing free editing
- create vs append modes behave explicitly and predictably

### P2 recommended tests
- shared editor behavior
- quicknote draft restore
- reminder persistence behavior
- stock price fetch utility behavior

## Rollout Notes
- Ship Phase 0 independently.
- Ship Phase 1 only after the target quicknote workflow is confirmed.
- Keep Phases 2 and 3 incremental; do not combine them into one branch unless necessary.

## Recommended First Batch
If only one low-risk batch is approved first, do this:

1. Add missing tests for auth legacy cookie cleanup and diary tags.
2. Fix logout to clear the legacy cookie path.
3. Repair diary tag persistence and API response shape.
4. Freeze the quicknote target contract in tests before refactoring UI shells.

This batch removes active contract risk without forcing an immediate quicknote UI rewrite.
