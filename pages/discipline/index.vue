<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useI18n } from 'vue-i18n'
import type {
  DisciplineShareData,
  DisciplineImportPreview
} from '~/lib/disciplineShare'

const { t } = useI18n()
const toast = useToast()

const content = ref('')
const loading = ref(false)
const list = ref<{ id: number; content: string; order: number; createdAt: string }[]>([])

// Edit mode state
const editingId = ref<number | null>(null)
const editContent = ref('')
const saving = ref(false)

// Share modal state
const showShareModal = ref(false)
const shareData = ref<DisciplineShareData | null>(null)
const shareLoading = ref(false)
const includeAuthor = ref(false)
const customTitle = ref('')
const customDescription = ref('')
const copiedToClipboard = ref(false)

// Import modal state
const showImportModal = ref(false)
const importJSON = ref('')
const importPreview = ref<DisciplineImportPreview | null>(null)
const importFile = ref<File | null>(null)
const importLoading = ref(false)
const replaceExisting = ref(false)
const detectedImportData = ref<DisciplineImportPreview | null>(null)

const fetchList = async () => {
  list.value = await $fetch<{ id: number; content: string; order: number; createdAt: string }[]>(
    '/api/discipline'
  )
}

const submit = async () => {
  if (!content.value.trim()) {
    toast.error(t('discipline.toast.enterDiscipline'))
    return
  }

  loading.value = true
  try {
    await $fetch('/api/discipline', {
      method: 'POST',
      body: { content: content.value },
    })
    content.value = ''
    await fetchList()
    toast.success(t('discipline.toast.createSuccess'))
  } catch (e) {
    toast.error(t('discipline.toast.createFailed'))
  } finally {
    loading.value = false
  }
}

// Edit functions
const startEdit = (item: { id: number; content: string }) => {
  editingId.value = item.id
  editContent.value = item.content
}

const cancelEdit = () => {
  editingId.value = null
  editContent.value = ''
}

const saveEdit = async (id: number) => {
  if (!editContent.value.trim()) {
    toast.error(t('discipline.toast.contentRequired'))
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/discipline/${id}`, {
      method: 'PUT',
      body: { content: editContent.value },
    })
    editingId.value = null
    editContent.value = ''
    await fetchList()
    toast.success(t('discipline.toast.editSuccess'))
  } catch (e) {
    toast.error(t('discipline.toast.editFailed'))
  } finally {
    saving.value = false
  }
}

// Delete function
const deleteDiscipline = async (id: number) => {
  if (!confirm(t('discipline.toast.confirmDelete'))) return

  try {
    await $fetch(`/api/discipline/${id}`, {
      method: 'DELETE',
    })
    await fetchList()
    toast.success(t('discipline.toast.deleteSuccess'))
  } catch (e) {
    toast.error(t('discipline.toast.deleteFailed'))
  }
}

// Reorder functions
let reorderTimer: ReturnType<typeof setTimeout> | null = null

const commitReorder = async () => {
  try {
    const orders = list.value.map((item) => ({
      id: item.id,
      order: item.order,
    }))

    const updatedList = await $fetch<{ id: number; content: string; order: number; createdAt: string }[]>('/api/discipline/reorder', {
      method: 'PATCH',
      body: { orders },
    })
    
    // Update UI with the returned list from server
    if (updatedList && Array.isArray(updatedList)) {
      list.value = updatedList
    }
  } catch (e) {
    toast.error(t('discipline.toast.editFailed'))
    await fetchList()
  }
}

const scheduleReorderSave = () => {
  if (reorderTimer) clearTimeout(reorderTimer)
  reorderTimer = setTimeout(commitReorder, 300)
}

const moveUp = (index: number) => {
  if (index === 0) return

  const current = list.value[index]
  const prev = list.value[index - 1]
  if (!current || !prev) return

  const temp = current.order
  current.order = prev.order
  prev.order = temp

  scheduleReorderSave()
}

const moveDown = (index: number) => {
  if (index === list.value.length - 1) return

  const current = list.value[index]
  const next = list.value[index + 1]
  if (!current || !next) return

  const temp = current.order
  current.order = next.order
  next.order = temp

  scheduleReorderSave()
}

// Share functions
const openShareModal = async () => {
  if (list.value.length === 0) {
    toast.error(t('discipline.toast.enterDiscipline'))
    return
  }

  showShareModal.value = true
  shareLoading.value = true

  try {
    const params = new URLSearchParams()
    if (includeAuthor.value) params.append('includeAuthor', 'true')
    if (customTitle.value) params.append('title', customTitle.value)
    if (customDescription.value) params.append('description', customDescription.value)

    const response = await $fetch<{ success: boolean; data: DisciplineShareData; json: string }>(
      `/api/discipline/export?${params.toString()}`
    )

    if (response.success) {
      shareData.value = response.data
    }
  } catch (e) {
    toast.error(t('discipline.share.exportFailed'))
  } finally {
    shareLoading.value = false
  }
}

const copyJSONToClipboard = async () => {
  if (!shareData.value) return

  const { shareDataToJSON } = await import('~/lib/disciplineShare')
  const json = shareDataToJSON(shareData.value)

  try {
    await navigator.clipboard.writeText(json)
    copiedToClipboard.value = true
    toast.success(t('discipline.share.copiedSuccess'))
    setTimeout(() => {
      copiedToClipboard.value = false
    }, 2000)
  } catch (e) {
    toast.error(t('discipline.share.copiedFailed'))
  }
}

const downloadJSONFile = async () => {
  if (!shareData.value) return

  const { downloadShareFile } = await import('~/lib/disciplineShare')
  downloadShareFile(shareData.value)
  toast.success(t('discipline.share.downloadSuccess'))
}

const shareToSocial = async (platform: 'twitter' | 'facebook' | 'line' | 'whatsapp') => {
  if (!shareData.value) return

  const { generateSocialShareURL } = await import('~/lib/disciplineShare')
  const url = generateSocialShareURL(shareData.value, platform)
  window.open(url, '_blank', 'width=600,height=400')
}

// Import functions
const openImportModal = () => {
  showImportModal.value = true
  checkImportFromURL()
}

const checkImportFromURL = async () => {
  const { parseImportFromURL } = await import('~/lib/disciplineShare')
  const detected = parseImportFromURL()

  if (detected && detected.isValid) {
    detectedImportData.value = detected
    importPreview.value = detected
    importJSON.value = '' // Clear the text area since we have URL data
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
    importJSON.value = '' // Clear text area since we have file data
  } catch (e) {
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

    // Reconstruct share data from preview
    const shareData: DisciplineShareData = {
      version: '1.0',
      type: 'trading-disciplines',
      title: importPreview.value.title,
      description: importPreview.value.description,
      disciplines: importPreview.value.disciplines,
      exportedAt: new Date().toISOString(),
      count: importPreview.value.count
    }

    const json = shareDataToJSON(shareData)

    await $fetch('/api/discipline/import', {
      method: 'POST',
      body: {
        json,
        replaceExisting: replaceExisting.value
      }
    })

    toast.success(t('discipline.import.importSuccess', { count: importPreview.value.count }))
    closeImportModal()
    await fetchList()
  } catch (e) {
    toast.error(t('discipline.import.importFailed'))
  } finally {
    importLoading.value = false
  }
}

const closeImportModal = () => {
  showImportModal.value = false
  importJSON.value = ''
  importPreview.value = null
  importFile.value = null
  replaceExisting.value = false
  detectedImportData.value = null
}

const closeShareModal = () => {
  showShareModal.value = false
  shareData.value = null
  customTitle.value = ''
  customDescription.value = ''
  copiedToClipboard.value = false
}

// Check for import data on mount
onMounted(async () => {
  await fetchList()

  // Check if there's import data in URL
  const { parseImportFromURL } = await import('~/lib/disciplineShare')
  const detected = parseImportFromURL()

  if (detected && detected.isValid) {
    detectedImportData.value = detected
    // Show import modal with detected data
    openImportModal()
  }
})

definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0A1628] dark:to-[#0D111D]">
    <!-- Subtle background pattern - dark mode only -->
    <div class="fixed inset-0 opacity-0 dark:opacity-5 pointer-events-none transition-opacity duration-300">
      <div class="absolute inset-0" style="background-image: repeating-linear-gradient(0deg, #C9A962 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #C9A962 0px, transparent 1px, transparent 40px);"></div>
    </div>

    <!-- Golden accent line at top -->
    <div class="h-1 bg-gradient-to-r from-transparent via-[#C9A962] to-transparent shadow-[0_2px_8px_rgba(201,169,98,0.3)]"></div>

    <div class="relative max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <!-- 頁面標題區域 - Solemn gravitas -->
      <div class="text-center mb-16">
        <!-- Premium emblem -->
        <div class="inline-flex items-center justify-center w-20 h-20 mb-8 relative">
          <div class="absolute inset-0 bg-[#C9A962]/10 dark:bg-[#C9A962]/20 rounded-full blur-xl"></div>
          <div class="absolute inset-0 border border-[#C9A962]/20 dark:border-[#C9A962]/30 rounded-full"></div>
          <div class="relative w-16 h-16 bg-gradient-to-br from-[#C9A962] to-[#A68B4B] rounded-lg flex items-center justify-center shadow-lg">
            <svg class="w-8 h-8 text-white dark:text-[#0A1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
        </div>

        <h1 class="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F5F1E8] mb-4 tracking-tight" style="font-family: 'Playfair Display', serif;">
          {{ t('discipline.title') }}
        </h1>
        <div class="flex items-center justify-center gap-4 mb-6">
          <div class="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A962]/50"></div>
          <div class="w-2 h-2 bg-[#C9A962] rotate-45 shadow-sm"></div>
          <div class="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A962]/50"></div>
        </div>
        <p class="text-base sm:text-lg text-slate-600 dark:text-[#B8B4AE] max-w-2xl mx-auto leading-relaxed font-light">
          {{ t('discipline.subtitle') }}
        </p>
      </div>

      <!-- 紀律列表區域 - Empty State -->
      <div v-if="list.length === 0" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-24 h-24 bg-slate-100 dark:bg-[#1A1F2C] rounded-full mb-8 border border-[#C9A962]/10 dark:border-[#C9A962]/20">
          <svg class="w-12 h-12 text-[#C9A962]/30 dark:text-[#C9A962]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8] mb-3" style="font-family: 'Playfair Display', serif;">{{ t('discipline.emptyState.title') }}</h3>
        <p class="text-slate-600 dark:text-[#B8B4AE] max-w-md mx-auto leading-relaxed">
          {{ t('discipline.emptyState.description') }}
        </p>
      </div>

      <div v-else class="space-y-8">
        <!-- Section header with count -->
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.listSection.title') }}</h2>
          <div class="flex items-center px-4 py-2 bg-white dark:bg-[#1A1F2C] rounded-lg border border-slate-200 dark:border-[#C9A962]/20 shadow-sm dark:shadow-none">
            <svg class="w-4 h-4 mr-2 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="text-sm text-[#C9A962] font-medium">{{ t('discipline.listSection.count', { count: list.length }) }}</span>
          </div>
        </div>

        <!-- Premium discipline cards - Solemn presentation -->
        <div class="space-y-4">
          <div
            v-for="(item, index) in list"
            :key="item.id"
            class="group relative bg-white dark:bg-gradient-to-br dark:from-[#1A1F2C] dark:to-[#121722] rounded-lg dark:rounded-sm border border-slate-200 dark:border-[#C9A962]/20 p-6 transition-all duration-300 hover:border-[#C9A962]/30 dark:hover:border-[#C9A962]/40 shadow-sm hover:shadow-md dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_8px_30px_-4px_rgba(201,169,98,0.15)]"
          >
            <!-- Premium序號標記 -->
            <div class="absolute top-4 left-4 flex items-center gap-2">
              <div class="w-6 h-px bg-gradient-to-r from-[#C9A962]/40 dark:from-[#C9A962]/60 to-transparent"></div>
              <span class="text-[10px] tracking-[0.25em] text-[#C9A962]/50 dark:text-[#C9A962]/60 uppercase font-medium">Rule {{ String(index + 1).padStart(2, '0') }}</span>
            </div>

            <!-- Premium操作按鈕 -->
            <div class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 sm:opacity-0">
              <!-- 上移按鈕 -->
              <button
                v-if="index > 0"
                @click="moveUp(index)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#C9A962] hover:bg-slate-100 dark:hover:bg-[#C9A962]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveUp')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7"></path>
                </svg>
              </button>

              <!-- 下移按鈕 -->
              <button
                v-if="index < list.length - 1"
                @click="moveDown(index)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#C9A962] hover:bg-slate-100 dark:hover:bg-[#C9A962]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveDown')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- 編輯按鈕 -->
              <button
                v-if="editingId !== item.id"
                @click="startEdit(item)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-[#60A5FA]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.edit')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>

              <!-- 刪除按鈕 -->
              <button
                @click="deleteDiscipline(item.id)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#F87171] hover:bg-red-50 dark:hover:bg-[#F87171]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                v-if="editingId !== item.id"
                @click="startEdit(item)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-[#60A5FA]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>

              <button
                @click="deleteDiscipline(item.id)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#F87171] hover:bg-red-50 dark:hover:bg-[#F87171]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                @click="moveUp(index)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#C9A962] hover:bg-slate-100 dark:hover:bg-[#C9A962]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7"></path>
                </svg>
              </button>

              <button
                v-if="index < list.length - 1"
                @click="moveDown(index)"
                class="p-2 text-slate-400 dark:text-[#B8B4AE] hover:text-[#C9A962] hover:bg-slate-100 dark:hover:bg-[#C9A962]/10 rounded-sm transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>

            <!-- Premium內容區域 -->
            <div class="pt-4 pr-20 sm:pr-0">
              <!-- 檢視模式 -->
              <div v-if="editingId !== item.id" class="flex flex-col items-center justify-center min-h-[120px]">
                <div class="text-lg font-medium text-slate-800 dark:text-[#F5F1E8] text-center leading-relaxed tracking-wide mb-6">
                  {{ item.content }}
                </div>

                <!-- 底部資訊 -->
                <div class="flex items-center justify-center gap-6 text-xs">
                  <div class="flex items-center text-slate-500 dark:text-[#6B7280]">
                    <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ new Date(item.createdAt).toLocaleDateString() }}
                  </div>
                  <div class="w-px h-3 bg-[#C9A962]/10 dark:bg-[#C9A962]/20"></div>
                  <div class="flex items-center text-slate-500 dark:text-[#6B7280]">
                    <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ new Date(item.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </div>
              </div>

              <!-- 編輯模式 -->
              <div v-else class="space-y-4">
                <textarea
                  v-model="editContent"
                  rows="4"
                  class="w-full px-4 py-3 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/30 rounded-sm text-slate-900 dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-[#6B7280] focus:border-[#C9A962] focus:outline-none focus:ring-1 focus:ring-[#C9A962]/50 transition-all duration-200 resize-none"
                />
                <div class="flex items-center gap-3">
                  <button
                    @click="saveEdit(item.id)"
                    :disabled="saving || !editContent.trim()"
                    class="px-6 py-2.5 bg-gradient-to-r from-[#C9A962] to-[#A68B4B] hover:from-[#B89B56] hover:to-[#937842] disabled:from-slate-300 dark:disabled:from-[#6B7280] disabled:to-slate-400 dark:disabled:to-[#4B5563] text-white dark:text-[#0A1628] rounded-sm font-medium transition-all duration-200 disabled:cursor-not-allowed min-h-[40px]"
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
                    @click="cancelEdit"
                    class="px-6 py-2.5 bg-slate-100 dark:bg-[#1A1F2C] hover:bg-slate-200 dark:hover:bg-[#252B38] border border-slate-200 dark:border-[#C9A962]/20 text-slate-700 dark:text-[#B8B4AE] hover:text-slate-900 dark:hover:text-[#F5F1E8] rounded-sm font-medium transition-all duration-200 min-h-[40px]"
                  >
                    {{ t('discipline.actions.cancel') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Premium新增紀律區域 -->
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
            @click="submit"
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

      <!-- Premium分享/導入按鈕 -->
      <div v-if="list.length > 0" class="flex justify-center gap-4 mb-12">
        <button
          @click="openShareModal"
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white font-medium rounded-sm shadow-sm hover:shadow-md dark:shadow-[0_4px_16px_-4px_rgba(5,150,105,0.4)] dark:hover:shadow-[0_6px_20px_-4px_rgba(5,150,105,0.5)] transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
          {{ t('discipline.listSection.shareButton') }}
        </button>
        <button
          @click="openImportModal"
          class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-medium rounded-sm shadow-sm hover:shadow-md dark:shadow-[0_4px_16px_-4px_rgba(124,58,237,0.4)] dark:hover:shadow-[0_6px_20px_-4px_rgba(124,58,237,0.5)] transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          {{ t('discipline.listSection.importButton') }}
        </button>
      </div>
    </div>

    <!-- Premium Share Modal -->
    <div v-if="showShareModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" @click="closeShareModal"></div>
      <div class="relative bg-white dark:bg-gradient-to-br dark:from-[#1A1F2C] dark:to-[#121722] border border-slate-200 dark:border-[#C9A962]/20 shadow-xl dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.share.title') }}</h2>
            <button @click="closeShareModal" class="text-slate-400 dark:text-[#B8B4AE] hover:text-slate-600 dark:hover:text-[#F5F1E8] transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Premium Export Options -->
          <div class="space-y-5 mb-8">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.share.exportTitle') }}</h3>

            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" v-model="includeAuthor" class="w-5 h-5 rounded border-slate-300 dark:border-[#C9A962]/30 text-[#C9A962] focus:ring-[#C9A962]/50 bg-white dark:bg-[#0A1628]">
              <span class="text-sm text-slate-700 dark:text-[#B8B4AE]">{{ t('discipline.share.includeAuthor') }}</span>
            </label>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-[#B8B4AE] mb-2">{{ t('discipline.share.customTitle') }}</label>
              <input v-model="customTitle" type="text" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/20 rounded-sm text-slate-900 dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-[#6B7280] focus:border-[#C9A962] focus:outline-none focus:ring-1 focus:ring-[#C9A962]/50 transition-all" :placeholder="t('discipline.share.customTitle')">
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-[#B8B4AE] mb-2">{{ t('discipline.share.customDescription') }}</label>
              <textarea v-model="customDescription" rows="2" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/20 rounded-sm text-slate-900 dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-[#6B7280] focus:border-[#C9A962] focus:outline-none focus:ring-1 focus:ring-[#C9A962]/50 transition-all resize-none" :placeholder="t('discipline.share.customDescription')"></textarea>
            </div>

            <button @click="openShareModal" class="w-full px-4 py-3 bg-gradient-to-r from-[#C9A962] to-[#A68B4B] hover:from-[#B89B56] hover:to-[#937842] text-white dark:text-[#0A1628] rounded-sm font-medium transition-all duration-200">
              {{ t('discipline.share.generateJSON') }}
            </button>
          </div>

          <!-- JSON Output -->
          <div v-if="shareData && !shareLoading" class="mb-8">
            <div class="bg-slate-100 dark:bg-[#0A1628] border border-slate-200 dark:border-[#C9A962]/10 rounded-sm p-4 mb-4">
              <pre class="text-xs text-slate-700 dark:text-[#B8B4AE] overflow-x-auto font-mono">{{ shareData ? JSON.stringify(shareData, null, 2) : '' }}</pre>
            </div>

            <div class="flex gap-3">
              <button @click="copyJSONToClipboard" class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-[#252B38] hover:bg-slate-200 dark:hover:bg-[#2F3646] border border-slate-200 dark:border-[#C9A962]/20 text-slate-700 dark:text-[#B8B4AE] hover:text-slate-900 dark:hover:text-[#F5F1E8] rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                {{ copiedToClipboard ? t('discipline.share.copiedSuccess') : t('discipline.share.copyJSON') }}
              </button>
              <button @click="downloadJSONFile" class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-[#252B38] hover:bg-slate-200 dark:hover:bg-[#2F3646] border border-slate-200 dark:border-[#C9A962]/20 text-slate-700 dark:text-[#B8B4AE] hover:text-slate-900 dark:hover:text-[#F5F1E8] rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                {{ t('discipline.share.downloadFile') }}
              </button>
            </div>
          </div>

          <!-- Social Share -->
          <div v-if="shareData">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-[#F5F1E8] mb-4" style="font-family: 'Playfair Display', serif;">{{ t('discipline.share.socialShare') }}</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button @click="shareToSocial('twitter')" class="px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096 2.747-.096-.26-.174-.525-.232-.807-.09-.293-.155-.594-.188-.904.87.07 1.778.152 2.634.456-2.638-.045-5.078-1.38-6.693-3.29a4.92 4.92 0 00-.094.686c0 1.55.79 2.91 1.993 3.732 2.723-.09.21-.172.427-.232.657a4.92 4.92 0 003.947 4.826 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                Twitter
              </button>
              <button @click="shareToSocial('facebook')" class="px-4 py-3 bg-[#4267B2] hover:bg-[#375695] text-white rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
              <button @click="shareToSocial('line')" class="px-4 py-3 bg-[#06C755] hover:bg-[#05b04e] text-white rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.486 5.236 3.484 8.414-.002 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.119l-.396-.129c-1.633-.529-2.691-.877-3.183-.877-.536 0-1.052.215-1.052.627 0 .401.215.768.758 1.464l.197.306c.962 1.493 2.093 2.413 3.674 2.413.498 0 .907-.149 1.016-.444.109-.296.109-.692.109-1.016 0-.627-.417-1.387-1.28-2.347-.617-.692-1.247-.537-1.628-.377l-.24.095c-.636.26-1.673.476-2.784 2.258-.725 1.143-.725 2.258-.476 2.504.249.247.657.468 1.26.698l.498.203c1.07.442 2.098.732 3.016.957.918.224 1.686.17 2.284-.251.598-.421.758-.758.758-.478 0-.732-.215-.758-.251-.027-.036-.067-.048-.127-.064-.061-.016-.09-.048-.09-.048-.107-.261-.475-.692-.966-.659-.853-.948-1.07-.948-1.683 0-1.368 1.059-2.685 2.848-2.685.598 0 1.183.047 1.753.141l.617.107c1.276.228 2.325.604 3.125 1.129.8.525 1.203 1.429 1.203 2.671 0 2.258-1.424 4.387-3.881 4.387-1.776 0-3.121-.732-3.912-1.742l-.27-.342-.659.256c-1.458.566-2.712 1.287-3.678 2.131-.966.845-1.945 1.307-3.044 1.307-.469 0-.864-.052-1.185-.156l-.398-.129-.129.396c-.437 1.347-.1 2.822.879 3.915.979 1.093 2.421 1.729 3.98 1.729.893 0 1.744-.172 2.528-.49l.241-.096c.726-.29 1.549-.62 1.875-.768z"/></svg>
                LINE
              </button>
              <button @click="shareToSocial('whatsapp')" class="px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-sm font-medium flex items-center justify-center transition-all">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.075-.613-.734-1.165-1.475-.052-.075-.105-.148-.16-.223-.054-.074-.074-.111-.134-.149-.059-.038-.149-.088-.272-.146-.122-.059-.262-.173-.353-.243-.09-.07-.234-.088-.384-.088-.15 0-.27.06-.32.073-.05.013-.099.026-.149.038-.05.013-.099.026-.149.038-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.297.149-1.424.852-2.543 1.25-2.543.698 0 1.26.562 1.26 1.26s1.26-.562 1.26-1.26c0-.698-.562-1.26-1.26-1.26-.15 0-.27.06-.32.073-.05.013-.099.026-.149.038-.05.013-.099.026-.149.038-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.297.149-1.424.852-2.543 1.25-2.543.698 0 1.26.562 1.26 1.26zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/></svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Premium Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" @click="closeImportModal"></div>
      <div class="relative bg-white dark:bg-gradient-to-br dark:from-[#1A1F2C] dark:to-[#121722] border border-slate-200 dark:border-[#C9A962]/20 shadow-xl dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8]" style="font-family: 'Playfair Display', serif;">{{ t('discipline.import.title') }}</h2>
            <button @click="closeImportModal" class="text-slate-400 dark:text-[#B8B4AE] hover:text-slate-600 dark:hover:text-[#F5F1E8] transition-colors">
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
  </div>
</template>
