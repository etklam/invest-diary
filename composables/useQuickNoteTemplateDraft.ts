import { computed, ref, type ComputedRef } from 'vue'
import { generateTemplateDraft } from '~/lib/quicknote/generate-template-draft'
import {
  createEmptyQuickNoteTemplateData,
  type QuickNoteComposerState,
  type QuickNoteTemplateData,
  type QuickNoteTemplateKind,
} from '~/types/quicknote'

export function cloneQuickNoteTemplateData(data: QuickNoteTemplateData | undefined): QuickNoteTemplateData {
  return {
    ...createEmptyQuickNoteTemplateData(),
    ...(data || {}),
  }
}

function normalizeSymbols(symbols: string | undefined): string {
  if (!symbols) return ''
  return symbols
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean)
    .join(', ')
}

export function useQuickNoteTemplateDraft(state: QuickNoteComposerState, locale: ComputedRef<string>) {
  const appliedTemplateContent = ref('')

  const suggestedDraft = computed(() => generateTemplateDraft({
    templateKind: state.templateKind,
    date: state.date,
    locale: locale.value,
    templateData: state.templateData,
  }))

  const hasTemplateChangesPending = computed(() => {
    if (state.templateKind === 'blank') return false
    if (state.contentTouched && appliedTemplateContent.value !== suggestedDraft.value.content) return true
    return false
  })

  function syncSuggestedDraft(force = false) {
    if (force || !state.titleTouched) {
      state.title = suggestedDraft.value.title
    }
    if (force || !state.contentTouched) {
      state.content = suggestedDraft.value.content
      appliedTemplateContent.value = suggestedDraft.value.content
    }
  }

  function applyTemplateKind(kind: QuickNoteTemplateKind) {
    state.templateKind = kind
    if (kind === 'blank') {
      Object.assign(state.templateData, createEmptyQuickNoteTemplateData())
    }
    syncSuggestedDraft()
  }

  function updateTemplateData(patch: Partial<QuickNoteTemplateData>) {
    const nextPatch = { ...patch }
    if (typeof nextPatch.symbols === 'string') {
      nextPatch.symbols = normalizeSymbols(nextPatch.symbols)
    }
    Object.assign(state.templateData, nextPatch)
    syncSuggestedDraft()
  }

  function mergeTemplateContent(currentContent: string, nextTemplateContent: string): string {
    const current = currentContent.trim()
    const nextTemplate = nextTemplateContent.trim()
    const previousTemplate = appliedTemplateContent.value.trim()

    if (!current) return nextTemplate

    if (previousTemplate && current.includes(previousTemplate)) {
      const updated = current.replace(previousTemplate, nextTemplate).trim()
      return updated || current
    }

    if (!nextTemplate || current === nextTemplate) {
      return current
    }

    return [current, nextTemplate].join('\n\n').trim()
  }

  function applyTemplateChanges() {
    state.content = mergeTemplateContent(state.content, suggestedDraft.value.content)
    state.contentTouched = true
    appliedTemplateContent.value = suggestedDraft.value.content
  }

  function setAppliedTemplateContent(content: string) {
    appliedTemplateContent.value = content
  }

  return {
    suggestedDraft,
    hasTemplateChangesPending,
    syncSuggestedDraft,
    applyTemplateKind,
    updateTemplateData,
    applyTemplateChanges,
    regenerateFromTemplate: applyTemplateChanges,
    setAppliedTemplateContent,
  }
}
