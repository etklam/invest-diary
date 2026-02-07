<template>
  <nav class="bg-white shadow dark:bg-gray-800">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-white">
              投資日記
            </NuxtLink>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <NuxtLink
              to="/"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-300"
              active-class="!border-indigo-500 text-gray-900 dark:text-white"
            >
              月曆
            </NuxtLink>
            <NuxtLink
              to="/diaries"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-300"
              active-class="!border-indigo-500 text-gray-900 dark:text-white"
            >
              日記列表
            </NuxtLink>
            <NuxtLink
              to="/alerts"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-300"
              active-class="!border-indigo-500 text-gray-900 dark:text-white"
            >
              提醒管理
            </NuxtLink>
          </div>
        </div>
        <div class="flex items-center">
          <NuxtLink
            to="/diaries/new"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:pencil-square" class="mr-2 h-5 w-5" />
            寫日記
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
