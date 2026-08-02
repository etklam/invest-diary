import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, computed } from 'vue'
import { mockToast } from '../vi-setup'
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'

const messages: Record<string, string> = {
  'quickDiary.title': '隨手筆記',
  'quickDiary.editor.eyebrow': '編輯工作檯',
  'quickDiary.editor.intro': '先決定保存方式，再整理內容，讓您的記錄流程更順暢。',
  'quickDiary.editor.saveModeLabel': '保存方式',
  'quickDiary.editor.titleAria': '筆記標題',
  'quickDiary.editor.snippets': '快捷工具',
  'quickDiary.editor.reminders': '快速提醒',
  'quickDiary.editor.checklistTitle': '在儲存之前...',
  'quickDiary.editor.checklist.title': '標題是否能讓未來的您一眼看懂當時的想法？',
  'quickDiary.editor.checklist.append': '如果您只是想補充今日日記，請選擇「補充到今日」。',
  'quickDiary.editor.checklist.create': '若是獨立的分析或新發現，建議「開啟新紀錄」以便日後整理。',
  'quickDiary.editor.expand': '完整編輯',
  'quickDiary.editor.collapse': '收起編輯器',
  'quickDiary.editor.dateHint': '{date} · 點此更改',
  'quickDiary.editor.saveModeHintCreate': '將建立新日記 · 點此變更',
  'quickDiary.editor.saveModeHintAppend': '將追加到今日 · 點此變更',
  'quickDiary.editor.appendContext': '內容會加入今天的日記',
  'quickDiary.editor.createContext': '將建立一篇獨立筆記',
  'quickDiary.editor.titlePlaceholder': '加入標題（選填）',
  'quickDiary.editor.contentPlaceholder': '記低你現在的想法……',
  'quickDiary.editor.contentAria': '筆記內容',
  'quickDiary.editor.openTemplatePicker': '使用模板',
  'quickDiary.editor.openTagPicker': '管理標籤',
  'quickDiary.editor.openReminderPicker': '設定提醒',
  'quickDiary.editor.metadata': '筆記資訊',
  'quickDiary.editor.quickTemplates': '快速模板',
  'quickDiary.editor.unset': '未設定',
  'quickDiary.editor.today': '今天',
  'quickDiary.editor.tagPickerTitle': '標籤',
  'quickDiary.editor.reminderPickerTitle': '提醒我',
  'quickDiary.editor.datePickerTitle': '日期',
  'quickDiary.editor.closePicker': '關閉',
  'quickDiary.editor.customReminder': '自訂日期及時間',
  'quickDiary.editor.manageTemplates': '自訂模板',
  'quickDiary.tools.tags': '標籤',
  'quickDiary.templates.blank': '自由編輯',
  'quickDiary.templates.trading': '交易日記',
  'quickDiary.templates.reflection': '盤後反思',
  'quickDiary.templates.observation': '市場觀察',
  'quickDiary.saveModes.create.label': '開啟新紀錄',
  'quickDiary.saveModes.create.description': '這是一筆獨立的觀察，將會存為新的日記。',
  'quickDiary.saveModes.create.summary': '系統將為您建立一則獨立的日記，適合記錄全新的交易思路。',
  'quickDiary.saveModes.append.label': '補充到今日',
  'quickDiary.saveModes.append.description': '這是在今日日記上的小補充，內容將會連接在後面。',
  'quickDiary.saveModes.append.summary': '內容將會自動銜接在今日現有的日記之後。',
  'quickDiary.oneLiner.placeholder': '把當下的直覺、市場觀察或一點小提醒記下來吧...',
  'quickDiary.capture.title': '一句話先記下來',
  'quickDiary.capture.placeholder': '先不用整理格式',
  'quickDiary.capture.save': '記下',
  'quickDiary.capture.appendDetected': '今天已有日記，這段會預設補到今日。',
  'quickDiary.capture.createDetected': '今天還沒有日記，這段會預設建立新紀錄。',
  'quickDiary.capture.afterSavePrompt': '已記下來。接著要補一點嗎？',
  'quickDiary.capture.followUpTrade': '補交易',
  'quickDiary.capture.followUpReminder': '設明天提醒',
  'quickDiary.capture.followUpTags': '補細節',
  'quickDiary.capture.savedBrief': '已記下',
  'quickDiary.capture.willCreate': '今天尚無日記，將建立新紀錄',
  'quickDiary.capture.willAppend': '今天已有日記，將追加到今日內容後',
  'quickDiary.capture.checking': '偵測中...',
  'quickDiary.date': '日期',
  'quickDiary.createDiary': '開啟新紀錄',
  'quickDiary.appendDiary': '補充到今日',
  'quickDiary.creating': '正在為您準備紀錄...',
  'quickDiary.appending': '正在更新今日內容...',
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
  'quickDiary.reminders.presetSet': '已設定 {label} 提醒',
  'quickDiary.reminders.set': '提醒已設定',
  'quickDiary.reminders.cleared': '提醒已清除',
  'quickDiary.toasts.saved': '已儲存快速筆記',
  'quickDiary.validation.contentRequired': '請先輸入內容',
  'quickDiary.errors.diaryExists': '該日期已有日記',
  'quickDiary.tools.date': '更改日期',
  'quickDiary.tools.reminders': '設定提醒',
  'quickDiary.tools.voice': '語音輸入',
  'quickDiary.tools.templates': '管理模板',
  'quickDiary.templateAssistant.expand': '使用模板',
  'quickDiary.templateAssistant.collapse': '收起模板',
  'diary.diaryTitle': '標題',
  'diary.saveFailed': '儲存失敗',
  'common.loading': '載入中...',
  'common.save': '儲存',
}

const submitQuickNoteMock = vi.fn()
const clearDraftMock = vi.fn()
const setReminderMock = vi.fn()
const clearReminderMock = vi.fn()

// Mutable refs that tests can adjust before mounting
const mockExistingDiary = ref(false)

function createMockState() {
  return reactive({
    date: '2026-03-22',
    saveMode: 'create' as string,
    templateKind: 'blank' as const,
    title: '',
    content: '',
    tags: [] as string[],
    reminders: { reminder1: null as string | null },
    templateData: {} as Record<string, unknown>,
    titleTouched: false,
    contentTouched: false,
  })
}

function createMockComposer() {
  const state = createMockState()
  const composer: Record<string, any> = {
    state,
    saveMode: computed(() => state.saveMode),
    title: computed(() => state.title),
    content: computed(() => state.content),
    tags: computed(() => state.tags),
    date: ref('2026-03-22'),
    templateKind: computed(() => state.templateKind),
    templates: ref([]),
    reminders: computed(() => state.reminders),
    draftHint: ref(''),
    activeReminders: ref([]),
    existingDiaryForDate: mockExistingDiary,
    checkingExistingDiaryForDate: ref(false),
    suggestedDraft: ref({ title: '2026/03/22 Diary', content: '' }),
    hasTemplateChangesPending: ref(false),
    applyTemplateKind: vi.fn((kind: string) => { state.templateKind = kind as typeof state.templateKind }),
    updateTemplateData: vi.fn((patch: Record<string, unknown>) => {
      if (patch.note) state.content = patch.note as string
    }),
    setTitle: vi.fn((title: string) => { state.title = title }),
    setContent: vi.fn((content: string) => { state.content = content }),
    setTags: vi.fn((tags: string[]) => { state.tags = tags }),
    setDate: vi.fn((date: string) => { state.date = date }),
    setSaveMode: vi.fn((mode: string) => { state.saveMode = mode }),
    appendVoiceTranscript: vi.fn(),
    applySnippet: vi.fn(),
    applyTemplateChanges: vi.fn(),
    regenerateFromTemplate: vi.fn(),
    setQuickReminder: setReminderMock,
    handleReminderSet: setReminderMock,
    handleReminderClear: clearReminderMock,
    syncExistingDiaryForDate: vi.fn(async () => {
      // Simulate real behavior: check $fetch result to set existingDiary
      try {
        const result = await $fetch('/api/diaries/by-date', { query: { date: '2026-03-22' } })
        const has = Boolean(result)
        mockExistingDiary.value = has
        if (has) state.saveMode = 'append'
        return has
      } catch {
        return mockExistingDiary.value
      }
    }),
    save: vi.fn(async () => {
      await submitQuickNoteMock({
        content: state.content,
        saveMode: state.saveMode,
        tags: state.tags,
      })
      clearDraftMock()
      clearReminderMock('reminder1')
      return { id: '10' }
    }),
    initialize: vi.fn(() => {
      // Simulate real initialize: trigger syncExistingDiaryForDate
      composer.syncExistingDiaryForDate()
      return false
    }),
    dispose: vi.fn(),
    resetState: vi.fn(),
  }
  return composer
}

vi.mock('~/composables/useQuickNoteComposer', () => ({
  useQuickNoteComposer: () => createMockComposer(),
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
        QuickNoteTemplateAssistant: {
          template: '<div />',
          props: ['templateKind', 'templateData', 'hasTemplateChangesPending'],
        },
        Icon: true,
      },
    },
  })
}

describe('QuickDiaryOneLiner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T08:30:00.000Z'))
    submitQuickNoteMock.mockResolvedValue({ id: '10' })
    // Reset mock composer state
    mockExistingDiary.value = false
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('saves one-liner via capture textarea with smart-save behavior', async () => {
    const wrapper = mountOneLiner()
    await flushPromises()

    await wrapper.get('[data-test="quick-capture-input"]').setValue('Need to journal this trade')
    await wrapper.get('[data-test="quick-capture-save"]').trigger('click')
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Need to journal this trade',
      saveMode: 'create',
    }))
    expect(clearDraftMock).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('已儲存快速筆記')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('saves one-line capture as append when today already has a diary', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ id: 'today-diary' }))
    const wrapper = mountOneLiner()
    await flushPromises()

    expect(wrapper.text()).toContain('內容會加入今天的日記')

    await wrapper.get('[data-test="quick-capture-input"]').setValue('SPX broke above yesterday high')
    await wrapper.get('[data-test="quick-capture-save"]').trigger('click')
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'SPX broke above yesterday high',
      saveMode: 'append',
    }))
    expect(wrapper.text()).toContain('已記下')
  })

  it('sets semantic quick reminders via more tools and announces the selected preset', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))
    const wrapper = mountOneLiner()
    await flushPromises()

    // The focused editor exposes reminder as a secondary tool immediately.
    const reminderChip = wrapper.findAll('button').find(button => button.text().trim() === '設定提醒')
    expect(reminderChip).toBeTruthy()
    await reminderChip!.trigger('click')
    const tomorrowButton = wrapper.findAll('button').find(button => button.text().trim() === '明天')
    expect(tomorrowButton).toBeTruthy()
    await tomorrowButton!.trigger('click')
    await flushPromises()

    expect(setReminderMock).toHaveBeenCalledWith('tomorrow')
    expect(mockToast.info).toHaveBeenCalledWith('已設定 明天 提醒')
  })
})
