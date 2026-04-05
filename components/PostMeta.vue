<template>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
    <!-- Author -->
    <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
      <div class="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
        <Icon name="heroicons:user" class="h-3.5 w-3.5 text-slate-500" />
      </div>
      <span class="font-bold tracking-tight">{{ author }}</span>
    </div>

    <!-- Date -->
    <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <Icon name="heroicons:calendar" class="h-4 w-4" />
      <span class="font-medium tracking-tight">{{ formattedDate }}</span>
    </div>

    <div v-if="showReadingTime" class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <Icon name="heroicons:clock" class="h-4 w-4" />
      <span class="font-medium tracking-tight">{{ readingTime }} {{ $t('blog.minute') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimezone } from '~/composables/useTimezone'

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

<style scoped>
.post-meta {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
</style>
