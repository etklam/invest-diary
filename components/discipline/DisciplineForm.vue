<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (e: 'submit', content: string): void
}>()

const { t } = useI18n()
const content = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  if (!content.value.trim()) return
  loading.value = true
  emit('submit', content.value)
}

// Reset form after successful submit
const reset = () => {
  content.value = ''
  loading.value = false
}

defineExpose({ reset })
</script>

<template>
  <div class="rounded-lg border p-8 mt-12 mb-16 shadow-sm" style="background: var(--color-surface); border-color: var(--color-border);">
    <div class="flex items-center mb-6">
      <div class="w-12 h-12 rounded-sm flex items-center justify-center mr-4" style="background: var(--color-primary); color: white;">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.createSection.title') }}</h2>
        <p class="text-sm" style="color: var(--color-text-muted);">{{ t('discipline.createSection.description') }}</p>
      </div>
    </div>

    <div class="space-y-4">
      <div class="relative">
        <textarea
          v-model="content"
          rows="4"
          class="w-full px-4 py-3 border rounded-sm focus:outline-none focus:ring-1 transition-colors duration-200 resize-none"
          style="background: var(--color-surface-muted); border-color: var(--color-border); color: var(--color-text);"
          :placeholder="t('discipline.createSection.placeholder')"
        />
      </div>
      <button
        class="w-full sm:w-auto px-8 py-3 text-white font-medium rounded-sm transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style="background: var(--color-primary);"
        :disabled="loading || !content.trim()"
        @click="handleSubmit"
      >
        <span v-if="loading" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ t('discipline.createSection.creating') }}
        </span>
        <span v-else class="flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          {{ t('discipline.createSection.button') }}
        </span>
      </button>
    </div>
  </div>
</template>
