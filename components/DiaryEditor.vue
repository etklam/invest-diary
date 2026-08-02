<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.diaryTitle') }}</label>
      <div class="mt-1">
        <input
          type="text"
          name="title"
          id="title"
          v-model="localTitle"
          class="block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
          :placeholder="t('diary.form.titlePlaceholder')"
        />
      </div>
    </div>

    <div>
      <label for="content" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.diaryContent') }} (Markdown)</label>
      <div class="mt-1">
        <textarea
          id="content"
          name="content"
          rows="15"
          v-model="localContent"
          class="block w-full rounded-dt-sm border border-dt-border bg-dt-surface p-3 font-mono text-sm text-dt-text focus:border-dt-primary focus:outline-none"
          :placeholder="t('diary.form.contentPlaceholder')"
        ></textarea>
      </div>
      <p class="mt-2 text-sm text-dt-text-soft">
        {{ t('diary.form.markdownHint') }}
      </p>
    </div>

    <div class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
      <h3 class="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.preview') }}</h3>
      <div class="prose min-h-[200px] max-w-none rounded-dt-sm border border-dt-border bg-dt-surface p-4 dark:prose-invert">
        <MDC :value="localContent" v-if="localContent" />
        <p v-else class="italic text-dt-text-soft">{{ t('diary.form.previewEmpty') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  content: string
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
}>()

const { t } = useI18n()

const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value)
})

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})
</script>
