<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()
const content = ref('')
const loading = ref(false)
const list = ref<{ id: number; content: string; order: number; createdAt: string }[]>([])

// Edit mode state
const editingId = ref<number | null>(null)
const editContent = ref('')
const saving = ref(false)

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

// Reorder functions (Optimistic UI + debounce save)
let reorderTimer: ReturnType<typeof setTimeout> | null = null

const commitReorder = async () => {
  try {
    const orders = list.value.map((item) => ({
      id: item.id,
      order: item.order,
    }))

    await $fetch('/api/discipline/reorder', {
      method: 'PATCH',
      body: { orders },
    })
  } catch (e) {
    toast.error(t('discipline.toast.editFailed'))
    await fetchList() // rollback
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

onMounted(fetchList)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
    <div class="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <!-- 頁面標題區域 -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full mb-6 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">{{ t('discipline.title') }}</h1>
        <p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {{ t('discipline.subtitle') }}
        </p>
      </div>

      <!-- 新增紀律區域 -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 mb-8">
        <div class="flex items-center mb-6">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ t('discipline.createSection.title') }}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">{{ t('discipline.createSection.description') }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="relative">
            <textarea
              v-model="content"
              rows="4"
              class="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200 resize-none"
              :placeholder="t('discipline.createSection.placeholder')"
            />
          </div>
          <button
            class="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            :disabled="loading || !content.trim()"
            @click="submit"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      <!-- 紀律列表區域 -->
      <div v-if="list.length === 0" class="text-center py-16">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full mb-6">
          <svg class="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{{ t('discipline.emptyState.title') }}</h3>
        <p class="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {{ t('discipline.emptyState.description') }}
        </p>
      </div>

      <div v-else class="space-y-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('discipline.listSection.title') }}</h2>
          <div class="flex items-center text-sm text-slate-600 dark:text-slate-400">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {{ t('discipline.listSection.count', { count: list.length }) }}
          </div>
        </div>

        <!-- Single-column layout on desktop for solemn presentation -->
        <div class="grid gap-6 grid-cols-1">
          <div
            v-for="(item, index) in list"
            :key="item.id"
            class="group relative bg-[#1e1710] dark:bg-[#1e1710] rounded-md border border-amber-700/40 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.9)] p-6 transition-colors duration-200"
          >
            <!-- 序號標記 -->
            <div class="absolute top-3 left-3 text-[10px] tracking-[0.3em] text-amber-500/70">
              DISCIPLINE {{ index + 1 }}
            </div>

            <!-- 操作按鈕 -->
            <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 sm:opacity-0">
              <!-- 上移按鈕 -->
              <button
                v-if="index > 0"
                @click="moveUp(index)"
                class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveUp')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </button>

              <!-- 下移按鈕 -->
              <button
                v-if="index < list.length - 1"
                @click="moveDown(index)"
                class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveDown')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- 編輯按鈕 -->
              <button
                v-if="editingId !== item.id"
                @click="startEdit(item)"
                class="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.edit')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>

              <!-- 刪除按鈕 -->
              <button
                @click="deleteDiscipline(item.id)"
                class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.delete')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>

            <!-- 手機版始終顯示的操作按鈕 -->
            <div class="absolute top-2 right-2 flex items-center gap-1 sm:hidden">
              <!-- 編輯按鈕 -->
              <button
                v-if="editingId !== item.id"
                @click="startEdit(item)"
                class="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.edit')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>

              <!-- 刪除按鈕 -->
              <button
                @click="deleteDiscipline(item.id)"
                class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.delete')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>

            <!-- 手機版排序按鈕（始終顯示） -->
            <div class="absolute bottom-2 right-2 flex items-center gap-1 sm:hidden">
              <!-- 上移按鈕 -->
              <button
                v-if="index > 0"
                @click="moveUp(index)"
                class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveUp')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </button>

              <!-- 下移按鈕 -->
              <button
                v-if="index < list.length - 1"
                @click="moveDown(index)"
                class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                :title="t('discipline.actions.moveDown')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>

            <!-- 內容區域 -->
            <div class="pt-2 pr-20 sm:pr-0">
              <!-- 檢視模式 -->
              <div v-if="editingId !== item.id" class="flex items-center justify-center min-h-[140px]">
                <div class="text-lg font-semibold text-amber-100 text-center leading-relaxed tracking-wide">
                  {{ item.content }}
                </div>

                <!-- 底部資訊 -->
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center text-slate-500 dark:text-slate-400">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ new Date(item.createdAt).toLocaleDateString() }}
                  </div>
                  <div class="flex items-center text-slate-400 dark:text-slate-500">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ new Date(item.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </div>
              </div>

              <!-- 編輯模式 -->
              <div v-else class="space-y-3">
                <textarea
                  v-model="editContent"
                  rows="4"
                  class="w-full px-3 py-2 border-2 border-blue-500 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200 resize-none"
                />
                <div class="flex items-center gap-2">
                  <button
                    @click="saveEdit(item.id)"
                    :disabled="saving || !editContent.trim()"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed min-h-[36px]"
                  >
                    <span v-if="saving" class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {{ t('discipline.actions.save') }}
                    </span>
                    <span v-else>{{ t('discipline.actions.save') }}</span>
                  </button>
                  <button
                    @click="cancelEdit"
                    class="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors min-h-[36px]"
                  >
                    {{ t('discipline.actions.cancel') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 裝飾元素 -->
            <!-- removed decorative gradient for a more solemn look -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
