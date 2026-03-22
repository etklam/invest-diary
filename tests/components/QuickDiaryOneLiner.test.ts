import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { mockToast } from '../vi-setup'
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'

const submitQuickNoteMock = vi.fn()
const clearDraftMock = vi.fn()
const setReminderMock = vi.fn()
const clearReminderMock = vi.fn()
const checkRemindersMock = vi.fn()

vi.mock('~/composables/useQuickNoteSubmit', () => ({
  useQuickNoteSubmit: () => ({
    submitQuickNote: submitQuickNoteMock,
  }),
}))

vi.mock('~/composables/useQuickNoteDraft', () => ({
  useQuickNoteDraft: () => ({
    draft: ref({ content: '', tags: [], date: '', savedAt: '' }),
    hasDraft: ref(false),
    lastSavedAt: ref(''),
    saveDraft: vi.fn(),
    clearDraft: clearDraftMock,
  }),
}))

vi.mock('~/composables/useQuickNoteTemplates', () => ({
  useQuickNoteTemplates: () => ({
    templates: ref([]),
  }),
}))

vi.mock('~/composables/useQuickNoteReminders', () => ({
  useQuickNoteReminders: () => ({
    reminders: ref({
      reminder1: null,
      reminder2: null,
      reminder3: null,
    }),
    setReminder: setReminderMock,
    clearReminder: clearReminderMock,
    checkReminders: checkRemindersMock,
  }),
}))

function mountOneLiner() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => key,
  }))
  vi.stubGlobal('useTimezone', () => ({
    getTodayDateString: () => '2026-03-22',
  }))
  vi.stubGlobal('useToast', () => mockToast)
  vi.stubGlobal('confirm', () => true)
  vi.stubGlobal('setInterval', vi.fn(() => 1))
  vi.stubGlobal('clearInterval', vi.fn())

  return mount(QuickDiaryOneLiner, {
    global: {
      stubs: {
        VoiceInput: {
          template: '<button type="button">voice</button>',
        },
        TemplateManager: {
          template: '<div />',
          props: ['modelValue'],
        },
        QuickReminder: {
          template: '<div />',
          props: ['reminders'],
        },
        QuickTags: {
          template: '<button type="button" data-test="set-tags" @click="$emit(\'update:modelValue\', [\'watch\', \'profit\'])">set tags</button>',
          props: ['modelValue'],
        },
      },
    },
  })
}

describe('QuickDiaryOneLiner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitQuickNoteMock.mockResolvedValue({ id: '10' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('submits the quick note through useQuickNoteSubmit with create mode', async () => {
    const wrapper = mountOneLiner()

    await wrapper.get('textarea[aria-label="快速筆記內容"]').setValue('Need to journal this trade')
    await wrapper.get('[data-test="set-tags"]').trigger('click')
    await wrapper.get('button.rounded-md.bg-indigo-600').trigger('click')
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith({
      saveMode: 'create',
      title: '2026/03/22 Diary',
      content: 'Need to journal this trade',
      date: '2026-03-22',
      tags: ['watch', 'profit'],
    })
    expect(clearDraftMock).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('已儲存快速筆記')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
