<template>
  <div class="relative inline-flex items-center">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors duration-200"
      :class="isListening
        ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800'
        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'"
      :disabled="!isSupported"
      :aria-pressed="isListening"
      :aria-label="isListening ? '停止語音輸入' : '開始語音輸入'"
      @click="toggle"
    >
      <span class="relative inline-flex h-4 w-4 items-center justify-center">
        <span
          v-if="isListening"
          class="absolute inline-flex h-4 w-4 rounded-full bg-rose-400/60 animate-ping motion-reduce:animate-none"
        ></span>
        <Icon :name="isListening ? 'heroicons:stop-circle' : 'heroicons:microphone'" class="h-4 w-4" />
      </span>
      <span class="font-medium">{{ isSupported ? (isListening ? '停止' : '語音') : '不支援' }}</span>
    </button>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="isListening && (interimTranscript || transcript)"
        class="absolute left-0 top-full z-10 mt-2 w-64 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        role="status"
        aria-live="polite"
      >
        <p class="text-[11px] text-gray-500 dark:text-gray-400">語音轉錄中</p>
        <p class="mt-1 leading-relaxed">
          <span v-if="transcript">{{ transcript }}</span>
          <span v-if="interimTranscript" class="opacity-70"> {{ interimTranscript }}</span>
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

const emit = defineEmits<{
  (e: 'result', text: string): void
}>()

const { isSupported, isListening, transcript, interimTranscript, start, stop } = useSpeechRecognition()

function toggle() {
  if (!isSupported) return
  isListening.value ? stop() : start()
}

watch(transcript, (val) => {
  if (val) emit('result', val)
})
</script>
