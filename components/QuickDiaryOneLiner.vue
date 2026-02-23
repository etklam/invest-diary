<template>
  <div class="p-4 space-y-4">
    <textarea
      v-model="content"
      class="w-full rounded-md border p-3 text-sm dark:bg-gray-800"
      :placeholder="t('quickDiary.oneLiner.placeholder')"
      rows="3"
      autofocus
    />

    <QuickTags v-model="tags" />

    <div class="flex items-center justify-between gap-2">
      <input type="date" v-model="date" class="rounded-md border p-2 text-sm dark:bg-gray-800" />

      <div class="flex items-center gap-2">
        <VoiceInput @result="appendText" />
        <button
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? t('common.loading') : t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'

const { t } = useI18n()

const content = ref('')
const tags = ref<string[]>([])
const date = ref(new Date().toISOString().slice(0, 10))
const saving = ref(false)

function appendText(text: string) {
  content.value = `${content.value} ${text}`.trim()
}

async function save() {
  if (!content.value.trim()) return
  saving.value = true
  try {
    await $fetch('/api/diaries', {
      method: 'POST',
      body: {
        title: 'Quick Diary',
        content: content.value,
        date: date.value,
        tags: tags.value,
      },
    })
    content.value = ''
    tags.value = []
  } finally {
    saving.value = false
  }
}
</script>
