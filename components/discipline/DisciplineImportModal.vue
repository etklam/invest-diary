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
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
    <div class="relative border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style="background: var(--color-surface); border-color: var(--color-border);">
      <div class="p-6">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.import.title') }}</h2>
          <button @click="emit('close')" class="transition-colors" style="color: var(--color-text-soft);">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- URL Detection -->
        <div v-if="detectedImportData && detectedImportData.isValid" class="mb-6 p-4 border rounded-sm" style="background: color-mix(in srgb, var(--color-info) 10%, transparent); border-color: color-mix(in srgb, var(--color-info) 30%, transparent);">
          <p style="color: var(--color-info);">{{ t('discipline.import.detectedURL') }}</p>
        </div>

        <!-- Import Options -->
        <div class="space-y-5 mb-8">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-text);">{{ t('discipline.import.pasteJSON') }}</label>
            <textarea
              v-model="importJSON"
              @input="previewImport"
              rows="6"
              class="w-full px-4 py-3 border rounded-sm focus:outline-none focus:ring-1 transition-colors resize-none"
              style="background: var(--color-surface-muted); border-color: var(--color-border); color: var(--color-text);"
              :placeholder="t('discipline.import.jsonPlaceholder')"
            ></textarea>
          </div>

          <div class="text-center" style="color: var(--color-text-muted);">— {{ t('common.or') }} —</div>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-text);">{{ t('discipline.import.uploadFile') }}</label>
            <input
              type="file"
              accept=".json"
              @change="handleFileUpload"
              class="w-full px-4 py-3 border rounded-sm transition-colors"
              style="background: var(--color-surface-muted); border-color: var(--color-border); color: var(--color-text);"
            />
          </div>
        </div>

        <!-- Preview -->
        <div v-if="importPreview && importPreview.isValid" class="mb-8">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.import.previewTitle') }}</h3>

          <div class="border rounded-sm p-4 mb-4" style="background: var(--color-surface-muted); border-color: var(--color-border);">
            <p class="font-medium mb-2" style="color: var(--color-text);">{{ importPreview.title }}</p>
            <p v-if="importPreview.description" class="text-sm mb-3" style="color: var(--color-text-muted);">{{ importPreview.description }}</p>
            <p class="text-sm" style="color: var(--color-text-muted);">{{ t('discipline.import.disciplineCount', { count: importPreview.count }) }}</p>

            <div v-if="importPreview.disciplines.length > 0" class="mt-4 space-y-2">
              <div v-for="(discipline, index) in importPreview.disciplines.slice(0, 3)" :key="index" class="border rounded-sm px-3 py-2 text-sm" style="background: var(--color-surface); border-color: var(--color-border); color: var(--color-text);">
                {{ index + 1 }}. {{ discipline.content }}
              </div>
              <p v-if="importPreview.disciplines.length > 3" class="text-xs" style="color: var(--color-text-soft);">
                ... {{ t('common.and') }} {{ importPreview.disciplines.length - 3 }} {{ t('common.more') }}
              </p>
            </div>
          </div>

          <label class="flex items-center space-x-3 mb-4 cursor-pointer">
            <input type="checkbox" v-model="replaceExisting" class="w-5 h-5 rounded" style="accent-color: var(--color-primary);">
            <div>
              <span class="text-sm" style="color: var(--color-text);">{{ t('discipline.import.replaceExisting') }}</span>
              <p class="text-xs" style="color: var(--color-text-soft);">{{ t('discipline.import.replaceExistingWarning') }}</p>
            </div>
          </label>

          <button
            @click="executeImport"
            :disabled="importLoading"
            class="w-full px-6 py-3 text-white font-medium rounded-sm transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: var(--color-primary);"
          >
            <span v-if="importLoading">{{ t('discipline.import.importing') }}</span>
            <span v-else>{{ t('discipline.import.importButton') }}</span>
          </button>
        </div>

        <!-- Error Message -->
        <div v-else-if="importPreview && !importPreview.isValid" class="mb-6 p-4 border rounded-sm" style="background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);">
          <p style="color: var(--color-danger);">{{ t('discipline.import.invalidJSON') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
