import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { mockToast } from '../vi-setup'
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'

const messages: Record<string, string> = {
  'quickDiary.entry.eyebrow': '記錄模式',
  'quickDiary.entry.title': '快速捕捉想法',
  'quickDiary.entry.intro': '您可以直接開始書寫，或使用下方的模板來幫助您整理思緒。',
  'quickDiary.title': '隨手筆記',
  'quickDiary.editor.eyebrow': '編輯工作檯',
  'quickDiary.editor.intro': '先決定保存方式，再整理內容，讓您的記錄流程更順暢。',
  'quickDiary.editor.saveModeLabel': '保存方式',
  'quickDiary.editor.titleAria': '筆記標題',
  'quickDiary.editor.contentAria': '筆記內容',
  'quickDiary.editor.snippets': '快捷工具',
  'quickDiary.editor.manageTemplates': '自訂模板',
  'quickDiary.editor.reminders': '快速提醒',
  'quickDiary.editor.checklistTitle': '在儲存之前...',
  'quickDiary.editor.checklist.title': '標題是否能讓未來的您一眼看懂當時的想法？',
  'quickDiary.editor.checklist.append': '如果您只是想補充今日日記，請選擇「補充到今日」。',
  'quickDiary.editor.checklist.create': '若是獨立的分析或新發現，建議「開啟新紀錄」以便日後整理。',
  'quickDiary.templates.blank': '自由編輯',
  'quickDiary.templates.trading': '交易日記',
  'quickDiary.templates.reflection': '盤後反思',
  'quickDiary.templates.observation': '市場觀察',
  'quickDiary.saveModes.create.label': '開啟新紀錄',
  'quickDiary.saveModes.create.description': '這是一筆獨立的觀察，將會存為新的日記。',
  'quickDiary.saveModes.create.summary': '系統將為您建立一則獨立的日記，適合記錄全新的交易思路。',
  'quickDiary.saveModes.append.label': '補充到今日',
  'quickDiary.saveModes.append.description': '這是在今日日記上的小補充，內容將會連接在後面。',
  'quickDiary.oneLiner.placeholder': '把當下的直覺、市場觀察或一點小提醒記下來吧...',
  'quickDiary.capture.title': '一句話先記下來',
  'quickDiary.capture.placeholder': '先不用整理格式',
  'quickDiary.capture.save': '立即記下',
  'quickDiary.capture.appendDetected': '今天已有日記，這段會預設補到今日。',
  'quickDiary.capture.createDetected': '今天還沒有日記，這段會預設建立新紀錄。',
  'quickDiary.capture.afterSavePrompt': '已記下來。接著要補一點嗎？',
  'quickDiary.capture.followUpTrade': '補交易理由',
  'quickDiary.capture.followUpReminder': '設明天提醒',
  'quickDiary.capture.followUpTags': '補標籤/細節',
  'quickDiary.date': '日期',
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
  'quickDiary.reminders.presetSet': '已設定 {label} 提醒',
  'quickDiary.reminders.set': '提醒已設定',
  'quickDiary.reminders.cleared': '提醒已清除',
  'quickDiary.toasts.saved': '已儲存快速筆記',
  'quickDiary.validation.contentRequired': '請先輸入內容',
  'quickDiary.errors.diaryExists': '該日期已有日記',
  'diary.saveFailed': '儲存失敗',
}

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
    }),
    setReminder: setReminderMock,
    clearReminder: clearReminderMock,
    checkReminders: checkRemindersMock,
  }),
}))

function mountOneLiner() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, params?: Record<string, string>) => {
      const template = messages[key] || key
      return template.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? `{${name}}`)
    },
    locale: ref('zh-TW'),
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
        Icon: true,
      },
    },
  })
}

async function clickSubmitButton(wrapper: ReturnType<typeof mount>) {
  const target = wrapper.findAll('button').find(button => button.classes().includes('overflow-hidden'))
  if (!target) {
    throw new Error('Submit button not found')
  }
  await target.trigger('click')
}

describe('QuickDiaryOneLiner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T08:30:00.000Z'))
    submitQuickNoteMock.mockResolvedValue({ id: '10' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('submits the quick note through useQuickNoteSubmit with smart-save behavior', async () => {
    const wrapper = mountOneLiner()

    await wrapper.get('textarea[aria-label="筆記內容"]').setValue('Need to journal this trade')
    await wrapper.get('[data-test="set-tags"]').trigger('click')
    await clickSubmitButton(wrapper)
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith({
      title: '2026/03/22 日記',
      content: 'Need to journal this trade',
      date: '2026-03-22',
      saveMode: 'create',
      tags: ['watch', 'profit'],
    })
    expect(clearDraftMock).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('已儲存快速筆記')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('saves one-line capture as append when today already has a diary', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ id: 'today-diary' }))
    const wrapper = mountOneLiner()
    await flushPromises()

    expect(wrapper.text()).toContain('今天已有日記')

    await wrapper.get('[data-test="quick-capture-input"]').setValue('SPX broke above yesterday high')
    await wrapper.get('[data-test="quick-capture-save"]').trigger('click')
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'SPX broke above yesterday high',
      saveMode: 'append',
    }))
    expect(wrapper.text()).toContain('已記下來')
  })

  it('sets semantic quick reminders and announces the selected preset', async () => {
    const wrapper = mountOneLiner()

    const tomorrowButton = wrapper.findAll('button').find(button => button.text().trim() === '明天')

    expect(tomorrowButton).toBeTruthy()

    await tomorrowButton!.trigger('click')

    expect(setReminderMock).toHaveBeenCalledWith('reminder1', '2026-03-23T08:30:00.000Z')
    expect(mockToast.info).toHaveBeenCalledWith('已設定 明天 提醒')
  })
})
