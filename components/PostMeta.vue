<template>
  <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
    <!-- Author -->
    <div class="flex items-center gap-1">
      <i-heroicons-user class="w-4 h-4" />
      <span>{{ author }}</span>
    </div>

    <!-- Date -->
    <div class="flex items-center gap-1">
      <i-heroicons-calendar class="w-4 h-4" />
      <span>{{ formattedDate }}</span>
    </div>

    <!-- Reading Time -->
    <div class="flex items-center gap-1">
      <i-heroicons-clock class="w-4 h-4" />
      <span>{{ $t('blog.readingTime', { min: readingTime }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  author: string
  date: Date | string
  readingTime: number
}>()

const formattedDate = computed(() => {
  const date = typeof props.date === 'string' ? new Date(props.date) : props.date
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
})
</script>
