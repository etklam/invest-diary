<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <label class="block text-sm font-medium text-dt-text">
        {{ $t('blog.content') }} <span class="text-dt-danger">*</span>
      </label>
      <p class="mt-1 text-xs text-dt-text-soft">
        Markdown + GFM
      </p>
    </div>
    <p class="text-xs text-dt-text-soft">
      {{ $t('blog.richTextSupported') || '支援富文本格式' }}
    </p>
  </div>
</template>
