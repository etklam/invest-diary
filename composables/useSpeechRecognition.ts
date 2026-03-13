import { ref } from 'vue'

export function useSpeechRecognition() {
  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref<string | null>(null)

  let recognition: any = null

  if (isSupported) {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognition = new Ctor()
    recognition.lang = 'zh-TW'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (e: any) => {
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
