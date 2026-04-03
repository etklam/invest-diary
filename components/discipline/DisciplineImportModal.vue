<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DisciplineImportPreview } from '~/lib/disciplineShare'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported'): void
}>()

const { t } = useI18n()
const toast = useToast()

const importJSON = ref('')
const importPreview = ref<DisciplineImportPreview | null>(null)
const importFile = ref<File | null>(null)
const importLoading = ref(false)
const replaceExisting = ref(false)
const detectedImportData = ref<DisciplineImportPreview | null>(null)

const checkImportFromURL = async () => {
  const { parseImportFromURL } = await import('~/lib/disciplineShare')
  const detected = parseImportFromURL()

  if (detected && detected.isValid) {
    detectedImportData.value = detected
    importPreview.value = detected
    importJSON.value = '' 
  }
}

const previewImport = async () => {
  if (!importJSON.value.trim()) {
    importPreview.value = null
    return
  }

  const { parseShareData } = await import('~/lib/disciplineShare')
  importPreview.value = parseShareData(importJSON.value)
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  importFile.value = file

  try {
    const { readShareFile } = await import('~/lib/disciplineShare')
    importPreview.value = await readShareFile(file)
    importJSON.value = '' 
  } catch {
    toast.error(t('discipline.import.invalidJSON'))
    importPreview.value = null
  }
}

const executeImport = async () => {
  if (!importPreview.value || !importPreview.value.isValid) {
    toast.error(t('discipline.import.invalidJSON'))
    return
  }

  if (!confirm(t('discipline.import.confirmImport'))) return

  importLoading.value = true

  try {
    const { shareDataToJSON } = await import('~/lib/disciplineShare')

    const shareData = {
      version: '1.0',
      type: 'trading-disciplines',
      title: importPreview.value.title,
      description: importPreview.value.description,
      disciplines: importPreview.value.disciplines,
      exportedAt: new Date().toISOString(),
      count: importPreview.value.count
    }

    const json = shareDataToJSON(shareData as any)

    await $fetch('/api/discipline/import', {
      method: 'POST',
      body: {
        json,
        replaceExisting: replaceExisting.value
      }
    })

    toast.success(t('discipline.import.importSuccess', { count: importPreview.value.count }))
    emit('imported')
    emit('close')
  } catch {
    toast.error(t('discipline.import.importFailed'))
  } finally {
    importLoading.value = false
  }
}

onMounted(() => {
  checkImportFromURL()
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    checkImportFromURL()
  } else {
    importJSON.value = ''
    importPreview.value = null
    importFile.value = null
    replaceExisting.value = false
    detectedImportData.value = null
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="relative bg-white dark:bg-gradient-to-br dark:from-[#1A1F2C] dark:to-[#121722] border border-slate-200 dark:border-[#C9A962]/20 shadow-xl dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.import.title') }}</h2>
          <button @click="emit('close')" class="text-slate-400 dark:text-[#B8B4AE] hover:text-slate-600 dark:hover:text-[#F5F1E8] transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- URL Detection -->
        <div v-if="detectedImportData && detectedImportData.isValid" class="mb-6 p-4 bg-blue-50 dark:bg-[#60A5FA]/10 border border-blue-200 dark:border-[#60A5FA]/30 rounded-sm">
          <p class="text-blue-600 dark:text-[#60A5FA]">{{ t('discipline.import.detectedURL') }}</p>
        </div>

        <!-- Premium Import Options -->
        <div class="space-y-5 mb-8">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-[#B8B4AE] mb-2">{{ t('discipline.import.pasteJSON') }}</label>
            <textarea
              v-model="importJSON"
              @input="previewImport"
              rows="6"
              class="w-full px-4 py-3 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/20 rounded-sm text-slate-900 dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-[#6B7280] focus:border-[#C9A962] focus:outline-none focus:ring-1 focus:ring-[#C9A962]/50 transition-all resize-none"
              :placeholder="t('discipline.import.jsonPlaceholder')"
            ></textarea>
          </div>

          <div class="text-center text-slate-500 dark:text-[#6B7280]">— {{ t('common.or') }} —</div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-[#B8B4AE] mb-2">{{ t('discipline.import.uploadFile') }}</label>
            <input
              type="file"
              accept=".json"
              @change="handleFileUpload"
              class="w-full px-4 py-3 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/20 rounded-sm text-slate-700 dark:text-[#B8B4AE] file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-[#C9A962] file:text-white dark:file:text-[#0A1628] hover:file:bg-[#B89B56] transition-all"
            />
          </div>
        </div>

        <!-- Preview -->
        <div v-if="importPreview && importPreview.isValid" class="mb-8">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-[#F5F1E8] mb-4" style="font-family: 'Playfair Display', serif;">{{ t('discipline.import.previewTitle') }}</h3>

          <div class="bg-slate-100 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/10 rounded-sm p-4 mb-4">
            <p class="font-medium text-slate-900 dark:text-[#F5F1E8] mb-2">{{ importPreview.title }}</p>
            <p v-if="importPreview.description" class="text-sm text-slate-700 dark:text-[#B8B4AE] mb-3">{{ importPreview.description }}</p>
            <p class="text-sm text-slate-600 dark:text-[#9CA3AF]">{{ t('discipline.import.disciplineCount', { count: importPreview.count }) }}</p>

            <div v-if="importPreview.disciplines.length > 0" class="mt-4 space-y-2">
              <div v-for="(discipline, index) in importPreview.disciplines.slice(0, 3)" :key="index" class="bg-white dark:bg-[#1A1F2C] rounded-sm px-3 py-2 text-sm text-slate-700 dark:text-[#B8B4AE]">
                {{ index + 1 }}. {{ discipline.content }}
              </div>
              <p v-if="importPreview.disciplines.length > 3" class="text-xs text-slate-500 dark:text-[#6B7280]">
                ... {{ t('common.and') }} {{ importPreview.disciplines.length - 3 }} {{ t('common.more') }}
              </p>
            </div>
          </div>

          <label class="flex items-center space-x-3 mb-4 cursor-pointer">
            <input type="checkbox" v-model="replaceExisting" class="w-5 h-5 rounded border-slate-300 dark:border-[#C9A962]/30 text-[#C9A962] focus:ring-[#C9A962]/50 bg-white dark:bg-[#0A1628]">
            <div>
              <span class="text-sm text-slate-700 dark:text-[#B8B4AE]">{{ t('discipline.import.replaceExisting') }}</span>
              <p class="text-xs text-slate-500 dark:text-[#6B7280]">{{ t('discipline.import.replaceExistingWarning') }}</p>
            </div>
          </label>

          <button
            @click="executeImport"
            :disabled="importLoading"
            class="w-full px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-medium rounded-sm shadow-sm hover:shadow-md dark:shadow-[0_4px_16px_-4px_rgba(124,58,237,0.4)] dark:hover:shadow-[0_6px_20px_-4px_rgba(124,58,237,0.5)] transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="importLoading">{{ t('discipline.import.importing') }}</span>
            <span v-else>{{ t('discipline.import.importButton') }}</span>
          </button>
        </div>

        <!-- Error Message -->
        <div v-else-if="importPreview && !importPreview.isValid" class="mb-6 p-4 bg-red-50 dark:bg-[#F87171]/10 border border-red-200 dark:border-[#F87171]/30 rounded-sm">
          <p class="text-red-600 dark:text-[#F87171]">{{ t('discipline.import.invalidJSON') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
