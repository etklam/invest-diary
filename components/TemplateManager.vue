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
      <div v-if="modelValue" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" @click="close"></div>

        <div class="relative mx-auto mt-10 w-[92%] max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">模板管理</h3>
            <button
              type="button"
              class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="關閉模板管理"
              @click="close"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-6">
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">模板清單</h4>
              <div class="space-y-3">
                <div
                  v-for="template in templates"
                  :key="template.id"
                  class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-medium truncate">
                        {{ template.name }}
                        <span v-if="template.isDefault" class="ml-2 text-xs text-indigo-500">預設</span>
                      </p>
                      <p class="mt-1 max-h-10 overflow-hidden text-xs text-gray-500 dark:text-gray-400">
                        {{ template.content }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
                        @click="applyTemplate(template.content)"
                      >
                        套用
                      </button>
                      <button
                        v-if="template.isDefault"
                        type="button"
                        class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        @click="startCopy(template)"
                      >
                        複製
                      </button>
                      <button
                        v-else
                        type="button"
                        class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        @click="startEdit(template)"
                      >
                        編輯
                      </button>
                      <button
                        v-if="!template.isDefault"
                        type="button"
                        class="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                        @click="removeTemplate(template.id)"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">
                {{ editingId ? '編輯模板' : '新增模板' }}
              </h4>
              <div class="space-y-2">
                <input
                  v-model="formName"
                  type="text"
                  class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="模板名稱"
                  aria-label="模板名稱"
                />
                <textarea
                  v-model="formContent"
                  rows="5"
                  class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="模板內容"
                  aria-label="模板內容"
                ></textarea>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    @click="saveTemplate"
                  >
                    {{ editingId ? '更新' : '新增' }}
                  </button>
                  <button
                    v-if="editingId"
                    type="button"
                    class="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    @click="resetForm"
                  >
                    取消
                  </button>
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
import { useQuickNoteTemplates, type QuickNoteTemplate } from '~/composables/useQuickNoteTemplates'

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

const close = () => emit('update:modelValue', false)

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
  formName.value = `${template.name}（副本）`
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
