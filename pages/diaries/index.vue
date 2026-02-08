<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">日記列表</h1>
      <NuxtLink
        to="/diaries/new"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
        新增日記
      </NuxtLink>
    </div>

    <div v-if="pending" class="text-center py-12">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-600" />
      <p class="mt-2 text-gray-500">載入中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">載入失敗</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="diaries.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
      <Icon name="heroicons:document-text" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">尚無日記</h3>
      <p class="mt-1 text-sm text-gray-500">開始記錄您的第一篇投資日記吧！</p>
      <div class="mt-6">
        <NuxtLink
          to="/diaries/new"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          新增日記
        </NuxtLink>
      </div>
    </div>

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="diary in diaries"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden"
      >
        <div class="p-6">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {{ diary.title }}
            </h2>
            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
              {{ new Date(diary.date || diary.createdAt).toLocaleDateString() }}
            </span>
          </div>
          <p class="mt-2 text-gray-600 dark:text-gray-300 line-clamp-3 text-sm">
            {{ diary.content.replace(/[#*`]/g, '') }}
          </p>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs text-gray-500">
              <span v-if="diary.transactions?.length" class="flex items-center">
                <Icon name="heroicons:currency-dollar" class="mr-1 h-4 w-4" />
                {{ diary.transactions.length }} 筆交易
              </span>
              <span v-if="diary.alerts?.length" class="flex items-center">
                <Icon name="heroicons:bell" class="mr-1 h-4 w-4" />
                {{ diary.alerts.length }} 個提醒
              </span>
            </div>
            <span class="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-500">
              閱讀更多 &rarr;
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: diaries, pending, error } = await useFetch('/api/diaries')

watch(error, (error) => {
  if (error) {
    console.error('Error fetching diaries:', error)
  }
})
</script>
