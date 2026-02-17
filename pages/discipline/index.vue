<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()
const content = ref('')
const loading = ref(false)
const list = ref<{ id: number; content: string; createdAt: string }[]>([])

const fetchList = async () => {
  list.value = await $fetch('/api/discipline')
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

        <div class="grid gap-6 md:grid-cols-2">
          <div
            v-for="(item, index) in list"
            :key="item.id"
            class="group relative bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <!-- 序號標記 -->
            <div class="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              {{ index + 1 }}
            </div>
            
            <!-- 內容區域 -->
            <div class="pt-2">
              <div class="text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed mb-4">
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
            
            <!-- 裝飾元素 -->
            <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-bl-xl opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>