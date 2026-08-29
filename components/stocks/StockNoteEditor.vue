<template>
  <form class="rounded-xl border border-dt-border bg-dt-surface p-5 space-y-4" @submit.prevent="handleSubmit">
    <!-- Title -->
    <div>
      <label class="block text-sm font-medium text-dt-text mb-1">
        {{ t('diary.title') }}
      </label>
      <input
        v-model="form.title"
        type="text"
        required
        maxlength="255"
        class="w-full px-3 py-2 bg-dt-surface-strong border border-dt-border rounded-lg text-dt-text placeholder:text-dt-text-soft  focus:ring-2 focus:ring-dt-primary/30 focus:border-transparent text-sm"
        :placeholder="t('diary.titlePlaceholder')"
      >
    </div>

    <!-- Date -->
    <div>
      <label class="block text-sm font-medium text-dt-text mb-1">
        {{ t('diary.date') }}
      </label>
      <input
        v-model="form.date"
        type="date"
        required
        class="w-full px-3 py-2 bg-dt-surface-strong border border-dt-border rounded-lg text-dt-text focus:ring-2 focus:ring-dt-primary/30 focus:border-transparent text-sm"
      >
    </div>

    <!-- Content -->
    <div>
      <label class="block text-sm font-medium text-dt-text mb-1">
        {{ t('diary.content') }}
      </label>
      <textarea
        v-model="form.content"
        required
        maxlength="50000"
        rows="8"
        class="w-full px-3 py-2 bg-dt-surface-strong border border-dt-border rounded-lg text-dt-text placeholder:text-dt-text-soft  focus:ring-2 focus:ring-dt-primary/30 focus:border-transparent text-sm resize-y"
        :placeholder="t('diary.contentPlaceholder')"
      />
      <p class="mt-1 text-xs text-dt-text-soft">
        {{ form.content.length }} / 50000
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3 pt-1">
      <button
        type="submit"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dt-primary-solid hover:bg-dt-primary-solid-active rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="props.saving || !form.title.trim() || !form.content.trim()"
      >
        <Icon v-if="props.saving" name="svg-spinners:180-ring-with-bg" class="w-4 h-4" />
        <Icon v-else name="heroicons:check" class="w-4 h-4" />
        {{ props.saving ? t('common.saving') : t('common.save') }}
      </button>
      <button
        v-if="showCancel"
        type="button"
        class="px-4 py-2 text-sm font-medium text-dt-text hover:bg-dt-surface-strong rounded-lg transition-colors"
        @click="$emit('cancel')"
      >
        {{ t('common.cancel') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { StockNoteDraft } from '~/types/stock-note'

const props = defineProps<{
  showCancel?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [data: StockNoteDraft]
  cancel: []
}>()

const { t } = useI18n()

const form = reactive({
  title: '',
  content: '',
  date: new Date().toISOString().slice(0, 10),
})

const resetForm = () => {
  form.title = ''
  form.content = ''
  form.date = new Date().toISOString().slice(0, 10)
}

const handleSubmit = () => {
  if (props.saving) return
  emit('save', {
    title: form.title.trim(),
    content: form.content.trim(),
    date: new Date(form.date).toISOString(),
  })
}

defineExpose({ resetForm })
</script>
