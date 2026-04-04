import { ref } from 'vue'

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

export function useSpeechRecognition() {
  const speechWindow = typeof window !== 'undefined' ? window as SpeechRecognitionWindowLike : null
  const isSupported = Boolean(speechWindow && (speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition))
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref<string | null>(null)

  let recognition: SpeechRecognitionLike | null = null

  const Ctor = speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition
  if (Ctor) {
    recognition = new Ctor()
    recognition.lang = 'zh-TW'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (const res of event.results) {
        if (res.isFinal) {
          finalText += res[0].transcript
        } else {
          interimText += res[0].transcript
        }
      }
      if (finalText.trim()) {
        transcript.value = finalText.trim()
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
    recognition.start()
    isListening.value = true
  }

  function stop() {
    if (!recognition || !isListening.value) return
    recognition.stop()
    isListening.value = false
  }

  return { isSupported, isListening, transcript, interimTranscript, error, start, stop }
}
