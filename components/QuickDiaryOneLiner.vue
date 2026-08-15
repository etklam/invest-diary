<template>
  <div class="quick-note-page space-y-4">
    <QuickNoteEditorCore
      :controller="controller"
      :saving="saving"
      :save-label="state.saveMode === 'append' ? t('quickDiary.appendDiary') : t('quickDiary.createDiary')"
      :saving-label="state.saveMode === 'append' ? t('quickDiary.appending') : t('quickDiary.creating')"
      :autofocus="autofocusEditor"
    />

    <div
      v-if="showPostSaveActions"
      class="flex flex-wrap items-center gap-2 rounded-dt-md border px-4 py-3"
      style="border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border)); background: var(--color-surface);"
    >
      <span class="text-xs font-semibold" style="color: var(--color-accent);">{{ t('quickDiary.capture.savedBrief') }}</span>
      <button
        type="button"
        class="min-h-10 rounded-dt-sm border px-3 text-xs font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
        style="border-color: var(--color-border); color: var(--color-text-muted);"
        @click="startTradingFollowUp"
      >
        {{ t('quickDiary.capture.followUpTrade') }}
      </button>
      <button
        type="button"
        class="min-h-10 rounded-dt-sm border px-3 text-xs font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
        style="border-color: var(--color-border); color: var(--color-text-muted);"
        @click="continueWithDetails"
      >
        {{ t('quickDiary.capture.followUpTags') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { createQuickNoteEditorController } from '~/lib/quicknote/editor-controller'
import { createQuickNoteModalTemplates, showQuickNoteSaveErrorToast } from '~/lib/quicknote/modal-shell'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const toast = useToast()
const { t } = useI18n()
const saving = ref(false)
const autofocusEditor = ref(false)
const templatePickerOpen = ref(false)
const showPostSaveActions = ref(false)
const postSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const composer = useQuickNoteComposer({
  defaultTemplateKind: 'blank',
  defaultSaveMode: 'create',
})
const { state } = composer

const templateOptions = computed(() => createQuickNoteModalTemplates(t))
const controller = createQuickNoteEditorController(composer, {
  t,
  toast,
  confirmOverwrite: message => confirm(message),
  templateOptions,
  templatePickerOpen,
  save: handleSave,
  cancel: handleCancel,
})

onMounted(() => {
  const restored = composer.initialize((message) => confirm(message))
  if (restored) {
    toast.info(t('quickDiary.draft.restoreSuccess'))
  }
  autofocusEditor.value = !restored && !state.content.trim()
})

onUnmounted(() => {
  clearPostSaveTimer()
  composer.dispose()
})

function clearPostSaveTimer() {
  if (!postSaveTimer.value) return
  clearTimeout(postSaveTimer.value)
  postSaveTimer.value = null
}

function startPostSaveTimer() {
  clearPostSaveTimer()
  showPostSaveActions.value = true
  postSaveTimer.value = setTimeout(() => {
    showPostSaveActions.value = false
    postSaveTimer.value = null
  }, 8000)
}

function handleCancel() {
  templatePickerOpen.value = false
  composer.resetState()
  showPostSaveActions.value = false
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    await composer.save()
    templatePickerOpen.value = false
    startPostSaveTimer()
    toast.success(t('quickDiary.toasts.saved'))
    await composer.syncExistingDiaryForDate()
    emit('saved')
  } catch (error: any) {
    showQuickNoteSaveErrorToast(toast, error, t, 'warning')
  } finally {
    saving.value = false
  }
}

function startTradingFollowUp() {
  clearPostSaveTimer()
  showPostSaveActions.value = false
  composer.applyTemplateKind('trading')
  composer.setSaveMode('append')
}

function continueWithDetails() {
  clearPostSaveTimer()
  showPostSaveActions.value = false
  composer.setSaveMode('append')
}
</script>
