import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

class FakeSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()

  constructor() {
    latestInstance = this as unknown as FakeSpeechRecognition
  }
}

interface FakeResult {
  isFinal: boolean
  0: { transcript: string }
}

function resultEvent(entries: Array<{ transcript: string; isFinal: boolean }>) {
  const results: FakeResult[] = entries.map(entry => ({
    isFinal: entry.isFinal,
    0: { transcript: entry.transcript },
  }))
  return { results }
}

let latestInstance: FakeSpeechRecognition

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', FakeSpeechRecognition)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('delivers each finalized utterance exactly once as it finalizes', () => {
    const onFinal = vi.fn()
    const speech = useSpeechRecognition({ onFinal })
    speech.start()

    // "A" finalizes while "b..." is still interim
    latestInstance.onresult!(resultEvent([
      { transcript: 'A', isFinal: true },
      { transcript: 'b', isFinal: false },
    ]))

    expect(onFinal).toHaveBeenCalledTimes(1)
    expect(onFinal).toHaveBeenLastCalledWith('A')
    expect(speech.transcript.value).toBe('A')
    expect(speech.interimTranscript.value).toBe('b')

    // Next event carries the FULL session results (0 final "A", 1 final "B")
    latestInstance.onresult!(resultEvent([
      { transcript: 'A', isFinal: true },
      { transcript: 'B', isFinal: true },
    ]))

    expect(onFinal).toHaveBeenCalledTimes(2)
    expect(onFinal).toHaveBeenLastCalledWith('B')
    expect(speech.transcript.value).toBe('A B')

    // Simulate downstream appendVoiceTranscript semantics: append each emission once
    const appended = onFinal.mock.calls.map(call => call[0]).join(' ')
    expect(appended).toBe('A B')
  })

  it('emits repeated identical utterances separately', () => {
    const onFinal = vi.fn()
    const speech = useSpeechRecognition({ onFinal })
    speech.start()

    latestInstance.onresult!(resultEvent([{ transcript: 'A', isFinal: true }]))
    latestInstance.onresult!(resultEvent([
      { transcript: 'A', isFinal: true },
      { transcript: 'A', isFinal: true },
    ]))

    expect(onFinal.mock.calls.map(call => call[0])).toEqual(['A', 'A'])
    expect(speech.transcript.value).toBe('A A')
  })

  it('never emits interim text', () => {
    const onFinal = vi.fn()
    const speech = useSpeechRecognition({ onFinal })
    speech.start()

    latestInstance.onresult!(resultEvent([{ transcript: 'partial', isFinal: false }]))

    expect(onFinal).not.toHaveBeenCalled()
    expect(speech.transcript.value).toBe('')
    expect(speech.interimTranscript.value).toBe('partial')
  })

  it('stops recognition and drops callbacks on component unmount', () => {
    let speech: ReturnType<typeof useSpeechRecognition> | undefined
    const app = createApp(defineComponent({
      setup() {
        speech = useSpeechRecognition()
        return () => h('div')
      },
    }))
    app.mount(document.createElement('div'))

    speech!.start()
    const instance = latestInstance
    expect(instance.start).toHaveBeenCalled()

    app.unmount()

    expect(instance.stop).toHaveBeenCalled()
    expect(instance.onresult).toBeNull()
    expect(instance.onerror).toBeNull()
    expect(instance.onend).toBeNull()
    expect(speech!.isListening.value).toBe(false)
  })
})
