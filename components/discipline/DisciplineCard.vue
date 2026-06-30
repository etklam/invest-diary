<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimezone } from '~/composables/useTimezone'

const props = defineProps<{
  item: {
    id: number
    content: string
    createdAt: string
  }
  index: number
  total: number
  isEditing: boolean
}>()

const emit = defineEmits<{
  (e: 'start-edit', id: number): void
  (e: 'cancel-edit'): void
  (e: 'save-edit', id: number, content: string): void
  (e: 'delete', id: number): void
  (e: 'move-up', index: number): void
  (e: 'move-down', index: number): void
}>()

const { t } = useI18n()
const { formatLocaleDate, formatLocaleTime } = useTimezone()

const editContent = ref(props.item.content)
const saving = ref(false)

const handleSave = async () => {
  if (!editContent.value.trim()) return
  saving.value = true
  emit('save-edit', props.item.id, editContent.value)
  // saving state should be handled by parent or by listening to result, 
  // but for simplicity we assume parent handles it and we can reset if needed
}

// Reset editContent when props change or editing starts
watch(() => props.isEditing, (newVal) => {
  if (newVal) {
    editContent.value = props.item.content
  }
})
</script>

<template>
  <div
    class="discipline-card group relative p-6 transition-all duration-300"
  >
    <!-- Premium序號標記 -->
    <div class="absolute top-4 left-4 flex items-center gap-2">
      <div class="w-6 h-px" style="background: color-mix(in srgb, var(--color-primary) 40%, transparent);"></div>
      <span class="text-[10px] tracking-[0.25em] uppercase font-medium" style="color: color-mix(in srgb, var(--color-primary) 70%, transparent);">Rule {{ String(index + 1).padStart(2, '0') }}</span>
    </div>

    <!-- Premium操作按鈕 -->
    <div class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 sm:opacity-0">
      <!-- 上移按鈕 -->
      <button
        v-if="index > 0"
        @click="emit('move-up', index)"
        class="dc-btn dc-btn-move p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
        :title="t('discipline.actions.moveUp')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7"></path>
        </svg>
      </button>

      <!-- 下移按鈕 -->
      <button
        v-if="index < total - 1"
        @click="emit('move-down', index)"
        class="dc-btn dc-btn-move p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
        :title="t('discipline.actions.moveDown')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <!-- 編輯按鈕 -->
      <button
        v-if="!isEditing"
        @click="emit('start-edit', item.id)"
        class="dc-btn dc-btn-edit p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
        :title="t('discipline.actions.edit')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      </button>

      <!-- 刪除按鈕 -->
      <button
        @click="emit('delete', item.id)"
        class="dc-btn dc-btn-delete p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
        :title="t('discipline.actions.delete')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>

    <!-- 手機版操作按鈕 -->
    <div class="absolute top-3 right-3 flex items-center gap-1 sm:hidden">
      <button
        v-if="!isEditing"
        @click="emit('start-edit', item.id)"
        class="dc-btn dc-btn-edit p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      </button>

      <button
        @click="emit('delete', item.id)"
        class="dc-btn dc-btn-delete p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>

    <!-- 手機版排序按鈕 -->
    <div class="absolute bottom-3 right-3 flex items-center gap-1 sm:hidden">
      <button
        v-if="index > 0"
        @click="emit('move-up', index)"
        class="dc-btn dc-btn-move p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7"></path>
        </svg>
      </button>

      <button
        v-if="index < total - 1"
        @click="emit('move-down', index)"
        class="dc-btn dc-btn-move p-2 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    </div>

    <!-- Premium內容區域 -->
    <div class="pt-4 pr-20 sm:pr-0">
      <!-- 檢視模式 -->
      <div v-if="!isEditing" class="flex flex-col items-center justify-center min-h-[120px]">
        <div class="text-lg font-medium text-center leading-relaxed tracking-wide mb-6" style="color: var(--color-text);">
          {{ item.content }}
        </div>

        <!-- 底部資訊 -->
        <div class="flex items-center justify-center gap-6 text-xs">
          <div class="flex items-center" style="color: var(--color-text-soft);">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {{ formatLocaleDate(item.createdAt) }}
          </div>
          <div class="w-px h-3" style="background: var(--color-border);"></div>
          <div class="flex items-center" style="color: var(--color-text-soft);">
            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {{ formatLocaleTime(item.createdAt) }}
          </div>
        </div>
      </div>

      <!-- 編輯模式 -->
      <div v-else class="space-y-4">
        <textarea
          v-model="editContent"
          rows="4"
          class="dc-textarea w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-1 transition-all duration-200 resize-none"
        />
        <div class="flex items-center gap-3">
          <button
            @click="handleSave"
            :disabled="saving || !editContent.trim()"
            class="dc-btn-save px-6 py-2.5 text-white rounded-md font-medium transition-all duration-200 disabled:cursor-not-allowed min-h-[44px]"
          >
            <span v-if="saving" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('discipline.actions.save') }}
            </span>
            <span v-else>{{ t('discipline.actions.save') }}</span>
          </button>
          <button
            @click="emit('cancel-edit')"
            class="dc-btn-cancel px-6 py-2.5 border rounded-md font-medium transition-all duration-200 min-h-[44px]"
          >
            {{ t('discipline.actions.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discipline-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.discipline-card:hover {
  box-shadow: var(--shadow-md);
}
.dc-btn {
  color: var(--color-text-soft);
}
.dc-btn-move:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.dc-btn-edit:hover {
  color: var(--color-info);
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
}
.dc-btn-delete:hover {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
.dc-textarea {
  background: color-mix(in srgb, var(--color-surface-strong) 66%, transparent);
  border-color: var(--color-border);
  color: var(--color-text);
}
.dc-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent);
}
.dc-btn-save {
  background: var(--color-primary);
}
.dc-btn-save:hover {
  filter: brightness(1.15);
}
.dc-btn-save:disabled {
  background: var(--color-border);
  filter: none;
}
.dc-btn-cancel {
  background: var(--color-surface-strong);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}
.dc-btn-cancel:hover {
  color: var(--color-text);
  filter: brightness(0.95);
}
</style>
