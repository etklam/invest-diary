<template>
  <div class="relative inline-flex items-center">
    <button
      type="button"
      class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-dt-sm border px-3 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-dt-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      :class="isListening
        ? 'border-dt-danger bg-dt-danger/10 text-dt-danger'
        : 'border-dt-border bg-dt-surface-muted text-dt-text-muted hover:border-dt-primary hover:text-dt-primary'"
      :disabled="!isSupported"
      :aria-pressed="isListening"
      :aria-label="isListening ? '停止語音輸入' : '開始語音輸入'"
      @click="toggle"
    >
      <span class="relative inline-flex h-4 w-4 items-center justify-center">
        <span
          v-if="isListening"
          class="absolute inline-flex h-4 w-4 rounded-full bg-dt-danger/50 animate-ping motion-reduce:animate-none"
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
        class="absolute left-0 top-full z-10 mt-2 w-64 rounded-dt-sm border p-3 text-xs shadow-dt-md"
        style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
        role="status"
        aria-live="polite"
      >
        <p class="text-[11px]" style="color: var(--color-text-soft);">語音轉錄中</p>
        <p class="mt-1 leading-relaxed">
          <span v-if="transcript">{{ transcript }}</span>
          <span v-if="interimTranscript" class="opacity-70"> {{ interimTranscript }}</span>
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

const emit = defineEmits<{
  (e: 'result', text: string): void
}>()

const { isSupported, isListening, transcript, interimTranscript, start, stop } = useSpeechRecognition({
  // Emit only the newly finalized utterance — downstream appends it to content,
  // so the full session transcript must never be re-delivered here.
  onFinal: text => emit('result', text),
})

function toggle() {
  if (!isSupported) return
  isListening.value ? stop() : start()
}
</script>
