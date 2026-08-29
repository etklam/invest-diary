<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[110]">
        <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="close"></div>

        <div
          ref="dialogPanel"
          class="relative mx-auto mt-10 w-[92%] max-w-2xl rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-manager-title"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <div class="flex items-center justify-between border-b border-dt-border px-5 py-4">
            <h3 id="template-manager-title" class="text-base font-semibold text-dt-text">{{ t('quickDiary.templateManager.title') }}</h3>
            <button
              type="button"
              class="flex min-h-11 min-w-11 items-center justify-center rounded-dt-sm text-dt-text-muted hover:bg-dt-surface-strong hover:text-dt-text"
              :aria-label="t('quickDiary.templateManager.close')"
              @click="close"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-6">
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-dt-text-muted">{{ t('quickDiary.templateManager.listTitle') }}</h4>
              <div class="space-y-3">
                <div
                  v-for="template in templates"
                  :key="template.id"
                  class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3 text-sm text-dt-text"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-medium truncate">
                        {{ template.name }}
                        <span v-if="template.isDefault" class="ml-2 text-xs text-dt-primary">{{ t('quickDiary.templateManager.default') }}</span>
                      </p>
                      <p class="mt-1 max-h-10 overflow-hidden text-xs text-dt-text-soft">
                        {{ template.content }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="min-h-9 rounded-dt-sm border border-dt-primary/30 bg-dt-primary/10 px-2 py-1 text-xs font-semibold text-dt-primary hover:bg-dt-primary/20"
                        @click="applyTemplate(template.content)"
                      >
                        {{ t('quickDiary.templateManager.apply') }}
                      </button>
                      <button
                        v-if="template.isDefault"
                        type="button"
                        class="min-h-9 rounded-dt-sm border border-dt-border bg-dt-surface px-2 py-1 text-xs font-semibold text-dt-text-muted hover:border-dt-border-strong hover:text-dt-text"
                        @click="startCopy(template)"
                      >
                        {{ t('common.copy') }}
                      </button>
                      <button
                        v-else
                        type="button"
                        class="min-h-9 rounded-dt-sm border border-dt-border bg-dt-surface px-2 py-1 text-xs font-semibold text-dt-text-muted hover:border-dt-border-strong hover:text-dt-text"
                        @click="startEdit(template)"
                      >
                        {{ t('common.edit') }}
                      </button>
                      <button
                        v-if="!template.isDefault"
                        type="button"
                        class="min-h-9 rounded-dt-sm border border-dt-danger/30 bg-dt-danger/10 px-2 py-1 text-xs font-semibold text-dt-danger-strong hover:bg-dt-danger/20"
                        @click="removeTemplate(template.id)"
                      >
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-medium text-dt-text-muted">
                {{ editingId ? t('quickDiary.templateManager.editTitle') : t('quickDiary.templateManager.newTitle') }}
              </h4>
              <div class="space-y-2">
                <input
                  v-model="formName"
                  type="text"
                  class="w-full rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-2 text-sm text-dt-text focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                  :placeholder="t('quickDiary.templateManager.nameLabel')"
                  :aria-label="t('quickDiary.templateManager.nameLabel')"
                />
                <textarea
                  v-model="formContent"
                  rows="5"
                  class="w-full rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-2 text-sm text-dt-text focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                  :placeholder="t('quickDiary.templateManager.contentLabel')"
                  :aria-label="t('quickDiary.templateManager.contentLabel')"
                ></textarea>
                <div class="flex items-center gap-2">
                  <BaseButton type="button" @click="saveTemplate">
                    {{ editingId ? t('quickDiary.templateManager.update') : t('common.create') }}
                  </BaseButton>
                  <BaseButton v-if="editingId" variant="secondary" type="button" @click="resetForm">
                    {{ t('common.cancel') }}
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDialogA11y } from '~/composables/useDialogA11y'
import { useQuickNoteTemplates, type QuickNoteTemplate } from '~/composables/useQuickNoteTemplates'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', content: string): void
}>()

const { templates, addTemplate, updateTemplate, removeTemplate } = useQuickNoteTemplates()

const editingId = ref<string | null>(null)
const formName = ref('')
const formContent = ref('')
const dialogPanel = ref<HTMLElement | null>(null)

const close = () => emit('update:modelValue', false)

const { handleKeydown } = useDialogA11y(dialogPanel, {
  open: () => props.modelValue,
  onEscape: close,
})

const resetForm = () => {
  editingId.value = null
  formName.value = ''
  formContent.value = ''
}

const startEdit = (template: QuickNoteTemplate) => {
  editingId.value = template.id
  formName.value = template.name
  formContent.value = template.content
}

const startCopy = (template: QuickNoteTemplate) => {
  editingId.value = null
  formName.value = `${template.name}${t('quickDiary.templateManager.copySuffix')}`
  formContent.value = template.content
}

const saveTemplate = () => {
  const trimmedName = formName.value.trim()
  const trimmedContent = formContent.value.trim()

  if (!trimmedName || !trimmedContent) {
    // Could add toast notification here for better UX
    return
  }

  if (editingId.value) {
    updateTemplate(editingId.value, { name: trimmedName, content: trimmedContent })
  } else {
    addTemplate(trimmedName, trimmedContent)
  }
  resetForm()
}

const applyTemplate = (content: string) => {
  emit('apply', content)
  close()
}
</script>
