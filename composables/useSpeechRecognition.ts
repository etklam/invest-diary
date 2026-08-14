import { getCurrentInstance, onUnmounted, ref } from 'vue'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike extends Event {
  results: Iterable<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike
}

interface SpeechRecognitionWindowLike extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike
}

interface UseSpeechRecognitionOptions {
  /**
   * Called once per finalized utterance with ONLY the newly finalized segment.
   * Use this to append text into content — watching `transcript` instead would
   * re-deliver the full session text on every utterance.
   */
  onFinal?: (text: string) => void
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const speechWindow = typeof window !== 'undefined' ? window as SpeechRecognitionWindowLike : null
  const isSupported = Boolean(speechWindow && (speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition))
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref<string | null>(null)

  let recognition: SpeechRecognitionLike | null = null
  // results[0..nextResultIndex-1] have already finalized and been delivered via onFinal
  let nextResultIndex = 0

  const Ctor = speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition
  if (Ctor) {
    recognition = new Ctor()
    recognition.lang = 'zh-TW'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const results = Array.from(event.results)
      let interimText = ''
      let newFinalText = ''
      for (let i = 0; i < results.length; i++) {
        const res = results[i]!
        if (!res.isFinal) {
          interimText += res[0].transcript
        } else if (i >= nextResultIndex) {
          newFinalText += res[0].transcript
          nextResultIndex = i + 1
        }
      }
      if (newFinalText.trim()) {
        transcript.value = [transcript.value, newFinalText.trim()].filter(Boolean).join(' ')
        options?.onFinal?.(newFinalText.trim())
      }
      interimTranscript.value = interimText.trim()
    }

    recognition.onerror = (e) => {
      error.value = e.error || 'speech_error'
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  }

  function start() {
    if (!recognition || isListening.value) return
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
    nextResultIndex = 0
    recognition.start()
    isListening.value = true
  }

  function stop() {
    if (!recognition || !isListening.value) return
    recognition.stop()
    isListening.value = false
  }

  // Stop the mic and drop callbacks so nothing writes into dead refs after unmount
  function teardown() {
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      if (isListening.value) {
        try {
          recognition.stop()
        } catch {
          // already stopped — nothing to do
        }
      }
      recognition = null
    }
    isListening.value = false
  }

  if (getCurrentInstance()) {
    onUnmounted(teardown)
  }

  return { isSupported, isListening, transcript, interimTranscript, error, start, stop }
}
