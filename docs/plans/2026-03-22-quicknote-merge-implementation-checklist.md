# Quicknote Merge Implementation Checklist

**Source:** `docs/plans/2026-03-22-quicknote-tech-debt-consolidation-plan.md` (Phase 1)  
**Goal:** Merge the modal quicknote flow and `/diaries/quick` into one quicknote workflow with one shared editor core, one shared composer state, and one shared save contract.  
**Architecture:** Extract pure template generation and shared quicknote state first, then let the modal and page become thin shells over the same editor, assistant, and submit pipeline.  
**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, Vitest, vue-tsc.

## Scope Guardrails
- Keep the current modal shell, glassmorphism styling, and step transitions in the first merge.
- Keep reminder behavior local-storage based in the first merge.
- Do not mix this work with Phase 0 auth/tags fixes or Phase 2 auth/error cleanup.
- Do not keep `title: 'Quick Diary'` as a long-term contract.
- Do not reintroduce quicknote-only history/filtering as part of the merge.

## Resolved Product Decision
The `/diaries/quick` page no longer keeps a "recent 7 days quicknotes" history panel.

That means this merge does not need:

- quicknote-only filtering in `server/api/diaries.get.ts`
- title-based quicknote identification for page history
- quicknote source metadata purely to support the removed history view

## Batch 1: Freeze the Quicknote Contract in Tests

**Files**
- Modify: `tests/api/diaries.test.ts`
- Create: `tests/composables/useQuickNoteSubmit.test.ts`
- Create: `tests/composables/useQuickNoteComposer.test.ts`
- Create: `tests/components/QuickDiaryModal.test.ts`
- Create: `tests/components/QuickDiaryOneLiner.test.ts`

**Checklist**
- [ ] Add API coverage for explicit `appendToToday` behavior so create vs append is locked down before UI refactor.
- [ ] Add focused tests for template-prefill behavior, touched-field protection, and regenerate/apply flows.
- [ ] Add component-level tests for the modal step flow and one-liner save contract without asserting visual details.
- [ ] Capture current draft-restore and reminder behavior so extraction work does not silently drop it.

**Verification**
- `npm test -- tests/api/diaries.test.ts tests/composables/useQuickNoteSubmit.test.ts tests/composables/useQuickNoteComposer.test.ts tests/components/QuickDiaryModal.test.ts tests/components/QuickDiaryOneLiner.test.ts`

## Batch 2: Extract One Shared Submit Pipeline

**Files**
- Create: `composables/useQuickNoteSubmit.ts`
- Modify: `components/QuickDiaryOneLiner.vue`
- Modify: `components/QuickDiaryModal.vue`
- Create: `tests/composables/useQuickNoteSubmit.test.ts`

**Checklist**
- [ ] Define one normalized quicknote submit input shape with `saveMode`, `title`, `content`, `date`, `tags`, `reminders`, `templateKind`, and `templateData`.
- [ ] Map `saveMode: 'create'` to normal diary creation and `saveMode: 'append'` to `appendToToday: true`.
- [ ] Move component-local `$fetch('/api/diaries')` logic into the shared submit composable.
- [ ] Remove the hardcoded `title: 'Quick Diary'` save path from `QuickDiaryOneLiner.vue`.
- [ ] Keep success/error handling consistent so modal and page do not drift again after the extraction.

**Verification**
- `npm test -- tests/api/diaries.test.ts tests/composables/useQuickNoteSubmit.test.ts`

## Batch 3: Introduce Shared Composer State and Pure Template Generation

**Files**
- Create: `composables/useQuickNoteComposer.ts`
- Create: `lib/quicknote/generate-template-draft.ts`
- Modify: `composables/useQuickNoteDraft.ts`
- Modify: `composables/useQuickNoteTemplates.ts`
- Modify: `composables/useQuickNoteReminders.ts`
- Create: `tests/composables/useQuickNoteComposer.test.ts`
- Create: `tests/lib/quicknote/generate-template-draft.test.ts`

**Checklist**
- [ ] Define `QuickNoteComposerState` with `saveMode`, `date`, `templateKind`, `title`, `content`, `tags`, `reminders`, `templateData`, `titleTouched`, and `contentTouched`.
- [ ] Extend draft persistence to include `title`, `templateKind`, `templateData`, and `saveMode`.
- [ ] Add composer actions for `applyTemplateKind`, `updateTemplateData`, `regenerateFromTemplate`, `applyTemplateChanges`, `appendVoiceTranscript`, and `applySnippet`.
- [ ] Keep template updates non-destructive: only auto-sync title/content before manual edits.
- [ ] Keep reminder semantics local-only in this batch; do not expand into server-side alerts yet.

**Verification**
- `npm test -- tests/composables/useQuickNoteComposer.test.ts tests/lib/quicknote/generate-template-draft.test.ts`

## Batch 4: Extract the Shared Editor Surface from `QuickDiaryOneLiner`

**Files**
- Create: `components/quicknote/QuickNoteEditorCore.vue`
- Create: `components/quicknote/QuickNoteSubmitBar.vue`
- Modify: `components/QuickDiaryOneLiner.vue`
- Create: `tests/components/QuickNoteEditorCore.test.ts`

**Checklist**
- [ ] Move title/content input, voice input, snippet/template actions, tags, reminders, and draft hint UI into a presentation-neutral editor core.
- [ ] Add an editable title field to the shared editor flow.
- [ ] Put date and explicit save-mode controls in the shared editor or submit bar, not in shell-specific code.
- [ ] Keep page-only history UI and modal-only visual shell code outside the editor core.
- [ ] Make the editor consume composer state and handlers instead of owning API logic directly.

**Verification**
- `npm test -- tests/components/QuickDiaryOneLiner.test.ts tests/components/QuickNoteEditorCore.test.ts`

## Batch 5: Keep the Modal Wizard, Replace Step 2 Internals

**Files**
- Create: `components/quicknote/QuickNoteTemplateAssistant.vue`
- Modify: `components/QuickDiaryModal.vue`
- Create: `tests/components/QuickDiaryModal.test.ts`

**Checklist**
- [ ] Preserve the current step 1 template picker cards and modal transitions.
- [ ] Replace the preview-only step 2 body with `QuickNoteTemplateAssistant`, `QuickNoteEditorCore`, and `QuickNoteSubmitBar`.
- [ ] Switch from direct preview markdown generation to suggested title/content generation owned by the composer.
- [ ] Show `Regenerate from template` or `Apply template changes` when the user already edited title/content manually.
- [ ] Keep modal save behavior explicit: if append is the default, make that a visible default mode instead of a hidden rule.

**Verification**
- `npm test -- tests/components/QuickDiaryModal.test.ts tests/composables/useQuickNoteComposer.test.ts`

## Batch 6: Rebuild `/diaries/quick` as a Thin Page Shell

**Files**
- Modify: `pages/diaries/quick.vue`
- Modify: `components/QuickDiaryOneLiner.vue`
- Create: `tests/unit/pages/diaries-quick.test.ts`
- Modify: `tests/integration/diary-workflow.test.ts`

**Checklist**
- [ ] Replace direct one-liner ownership with page-shell wiring around the shared composer, editor core, and submit bar.
- [ ] Keep `pages/diaries/quick.vue` as a thin shell with no quicknote-history responsibilities.
- [ ] Make the page default save mode explicit instead of relying on a separate component contract.
- [ ] Ensure the modal shell and page shell both call the same submit composable and use the same draft/template/reminder state model.
- [ ] After the page shell is stable, either slim `QuickDiaryOneLiner.vue` into a wrapper or remove it in a follow-up cleanup pass.

**Verification**
- `npm test -- tests/unit/pages/diaries-quick.test.ts tests/integration/diary-workflow.test.ts`

## Batch 7: Remove Duplicate Assumptions and Title-Based Heuristics

**Files**
- Modify: `server/api/diaries.get.ts`
- Modify: `pages/diaries/quick.vue`
- Modify: `components/QuickDiaryModal.vue`
- Modify: `components/QuickDiaryOneLiner.vue`
- Conditionally modify if metadata is adopted:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `types/diary.ts`
  - `server/api/diaries.post.ts`
  - `server/api/diaries/[id].get.ts`
  - `server/api/diaries/[id].put.ts`

**Checklist**
- [ ] Remove any remaining hardcoded `Quick Diary` title assumptions from the UI save path.
- [ ] Confirm no route, page, or API parameter still depends on title-based quicknote filtering.
- [ ] Delete preview-generation-only code from the modal after the assistant/editor pipeline is live.
- [ ] Keep renames (`QuickDiary*` -> `QuickNote*`) as a final cleanup step after behavior parity is already covered by tests.
- [ ] Re-run the full quicknote path and confirm no feature still depends on diary title text to identify quicknotes.

**Verification**
- `npm test -- tests/api/diaries.test.ts tests/integration/diary-workflow.test.ts tests/components/QuickDiaryModal.test.ts tests/components/QuickNoteEditorCore.test.ts`
- `npm run typecheck`

## Definition of Done
- Modal quicknote and `/diaries/quick` use the same composer state and the same submit contract.
- Template-driven and free-form editing live in one workflow without destructive overwrites.
- Draft restore, tags, voice input, reminders, and template/snippet insertion still work after the merge.
- Create vs append behavior is explicit and test-covered.
- The codebase no longer relies on diary title text to identify quicknotes.
- The removed quicknote history panel is not silently recreated through another title-based shortcut.
