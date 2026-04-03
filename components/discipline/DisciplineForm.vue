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
  <div class="bg-white dark:bg-gradient-to-br dark:from-[#1A1F2C] dark:to-[#121722] rounded-lg dark:rounded-sm border border-slate-200 dark:border-[#C9A962]/20 p-8 mt-12 mb-16 shadow-sm dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
    <div class="flex items-center mb-6">
      <div class="w-12 h-12 bg-gradient-to-br from-[#C9A962] to-[#A68B4B] rounded-sm flex items-center justify-center mr-4">
        <svg class="w-6 h-6 text-white dark:text-[#0A1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.createSection.title') }}</h2>
        <p class="text-sm text-slate-600 dark:text-[#B8B4AE]">{{ t('discipline.createSection.description') }}</p>
      </div>
    </div>

    <div class="space-y-4">
      <div class="relative">
        <textarea
          v-model="content"
          rows="4"
          class="w-full px-4 py-3 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/20 rounded-sm text-slate-900 dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-[#6B7280] focus:border-[#C9A962] focus:outline-none focus:ring-1 focus:ring-[#C9A962]/50 transition-all duration-200 resize-none"
          :placeholder="t('discipline.createSection.placeholder')"
        />
      </div>
      <button
        class="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#C9A962] to-[#A68B4B] hover:from-[#B89B56] hover:to-[#937842] text-white dark:text-[#0A1628] font-medium rounded-sm shadow-sm hover:shadow-md dark:shadow-[0_4px_16px_-4px_rgba(201,169,98,0.4)] dark:hover:shadow-[0_6px_20px_-4px_rgba(201,169,98,0.5)] transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
