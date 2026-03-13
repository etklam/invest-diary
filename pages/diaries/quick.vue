<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="mx-auto max-w-3xl px-4 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-semibold">快速日記</h1>
          <button
            type="button"
            class="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            @click="showHistory = !showHistory"
          >
            {{ showHistory ? '隱藏歷史' : '查看歷史' }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-6">
      <QuickDiaryOneLiner @saved="handleSaved" />

      <section v-if="showHistory" class="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">最近 7 天快速筆記</h2>
          <button
            type="button"
            class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            @click="fetchRecentNotes"
          >
            重新整理
          </button>
        </div>

        <div v-if="loading" class="mt-4 text-xs text-gray-500 dark:text-gray-400">載入中...</div>

        <div v-else class="mt-4 space-y-3">
          <div v-if="!recentNotes.length" class="text-xs text-gray-500 dark:text-gray-400">
            暫無快速筆記
          </div>
          <div
            v-for="note in recentNotes"
            :key="String(note.id)"
            class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatRelativeTime(note.createdAt) }}
                </p>
                <p class="mt-1 max-h-12 overflow-hidden text-sm font-medium text-gray-700 dark:text-gray-100">
                  {{ note.content || note.title }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                @click="removeNote(note.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'
import type { Diary, DiariesApiResponse } from '~/types/diary'

const showHistory = ref(false)
const recentNotes = ref<Diary[]>([])
const loading = ref(false)

const { formatLocaleDate } = useTimezone()
const toast = useToast()

const fetchRecentNotes = async () => {
  loading.value = true
  try {
    const response = await $fetch<DiariesApiResponse>('/api/diaries', {
      query: { quickOnly: 'true', days: '7', page: '1', limit: '20' }
    })
    recentNotes.value = response.data || []
  } catch (error: any) {
    toast.error(error.data?.statusMessage || '讀取快速筆記失敗')
  } finally {
    loading.value = false
  }
}

const handleSaved = async () => {
  if (!showHistory.value) return
  await fetchRecentNotes()
}

const removeNote = async (id: string | bigint) => {
  if (!confirm('確定要刪除此筆記嗎？')) return
  try {
    await $fetch(`/api/diaries/${id}`, { method: 'DELETE' })
    toast.success('已刪除快速筆記')
    await fetchRecentNotes()
  } catch (error: any) {
    toast.error(error.data?.statusMessage || '刪除失敗')
  }
}

const formatRelativeTime = (value: Date | string) => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (!Number.isFinite(diffMs)) return ''
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '剛剛'
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  if (hours < 48) return '昨天'
  return formatLocaleDate(date)
}

watch(showHistory, (val) => {
  if (val && !recentNotes.value.length) fetchRecentNotes()
})
</script>
