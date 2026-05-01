<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.content') }} <span class="text-red-500">*</span>
      </label>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Markdown + GFM
      </p>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      {{ $t('blog.richTextSupported') || '支援富文本格式' }}
    </p>
  </div>
</template>
