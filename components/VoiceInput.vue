<template>
  <button
    type="button"
    class="rounded-md border px-3 py-2 text-sm"
    :class="isListening ? 'bg-red-100 text-red-700' : 'bg-gray-100 dark:bg-gray-700'"
    :disabled="!isSupported"
    @click="toggle"
  >
    <span v-if="!isSupported">🎤 N/A</span>
    <span v-else>{{ isListening ? '⏹ 停止' : '🎤 語音' }}</span>
  </button>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

const emit = defineEmits<{
  (e: 'result', text: string): void
}>()

const { isSupported, isListening, transcript, start, stop } = useSpeechRecognition()

function toggle() {
  if (!isSupported) return
  isListening.value ? stop() : start()
}

watch(transcript, (val) => {
  if (val) emit('result', val)
})
</script>
