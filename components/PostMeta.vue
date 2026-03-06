<template>
  <div class="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500 dark:text-gray-500">
    <!-- Author -->
    <div class="flex items-center gap-1.5 dark:text-gray-400">
      <Icon name="heroicons:user-20-solid" class="h-4 w-4" />
      <span class="truncate">{{ author }}</span>
    </div>

    <!-- Separator -->
    <span class="text-gray-300 dark:text-gray-700">·</span>

    <!-- Date -->
    <div class="flex items-center gap-1.5 dark:text-gray-400">
      <Icon name="heroicons:calendar-days-20-solid" class="h-4 w-4" />
      <span>{{ formattedDate }}</span>
    </div>

    <template v-if="showReadingTime">
      <!-- Separator -->
      <span class="text-gray-300 dark:text-gray-700">·</span>

      <!-- Reading Time -->
      <div class="flex items-center gap-1.5 dark:text-gray-400">
        <Icon name="heroicons:clock-20-solid" class="h-4 w-4" />
        <span>{{ $t('blog.readingTime', { min: readingTime }) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { formatLocaleDate } = useTimezone()

const props = defineProps<{
  author: string
  date: Date | string
  readingTime?: number
}>()

const formattedDate = computed(() => {
  return formatLocaleDate(props.date)
})

const showReadingTime = computed(() => (props.readingTime || 0) > 0)
</script>
