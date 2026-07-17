import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, computed } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockToast } from '../vi-setup'
import QuickDiaryModal from '~/components/QuickDiaryModal.vue'

const messages: Record<string, string> = {
  'common.cancel': '取消',
  'common.close': '關閉',
  'quickDiary.title': '隨手筆記',
  'quickDiary.selectTemplate': '今天想記錄些什麼？選個模板快速開始吧',
  'quickDiary.changeTemplate': '更換模板',
  'quickDiary.modal.eyebrow': '隨手筆記',
  'quickDiary.modal.editorHint': '先寫內容再儲存。需要結構時可隨時更換模板。',
  'quickDiary.modal.templateSubcopy': '選個骨架，再慢慢填入您的觀察與細節。',
  'quickDiary.createDiary': '開啟新紀錄',
  'quickDiary.appendDiary': '補充到今日',
  'quickDiary.appending': '正在更新今日內容...',
  'quickDiary.success': '快速日記建立成功！',
  'quickDiary.successCreate': '已建立新日誌！',
  'quickDiary.successAppend': '已追加至既有日誌！',
  'quickDiary.templates.blank': '自由編輯',
  'quickDiary.templates.blankDesc': '不套模板，直接記下當下的判斷與提醒',
  'quickDiary.templates.trading': '交易日記',
  'quickDiary.templates.tradingDesc': '記錄買入/賣出操作',
  'quickDiary.templates.reflection': '盤後反思',
  'quickDiary.templates.reflectionDesc': '收盤後的總結反思',
  'quickDiary.templates.observation': '市場觀察',
  'quickDiary.templates.observationDesc': '記錄市場熱點觀察',
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
  'quickDiary.date': '日期',
  'quickDiary.oneLiner.placeholder': '把當下的直覺、市場觀察或一點小提醒記下來吧...',
  'quickDiary.saveModes.create.label': '開啟新紀錄',
  'quickDiary.saveModes.create.description': '這是一筆獨立的觀察，將會存為新的日記。',
  'quickDiary.saveModes.create.summary': '系統將為您建立一則獨立的日記，適合記錄全新的交易思路。',
  'quickDiary.saveModes.append.label': '補充到今日',
  'quickDiary.saveModes.append.description': '這是在今日日記上的小補充，內容將會連接在後面。',
  'quickDiary.saveModes.append.summary': '內容將會自動銜接在今日現有的日記之後，適合補充瑣碎的判斷。',
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
  'quickDiary.trading.operation': '今日操作',
  'quickDiary.trading.buy': '買入',
  'quickDiary.trading.sell': '賣出',
  'quickDiary.trading.both': '買賣都做',
  'quickDiary.trading.symbols': '股票代碼（可選，多個用逗號分隔）',
  'quickDiary.trading.symbolsPlaceholder': '例如: 2330, 2317',
  'quickDiary.trading.marketFeeling': '今日市場感覺',
  'quickDiary.trading.bullish': '多頭',
  'quickDiary.trading.bearish': '空頭',
  'quickDiary.trading.neutral': '盤整',
  'quickDiary.trading.note': '快速備註（可選）',
  'quickDiary.trading.notePlaceholder': '簡單記錄今日操作心得...',
  'quickDiary.observation.topic': '觀察主題',
  'quickDiary.observation.topicPlaceholder': '例如: 半導體板塊、台積電、美國股市...',
  'quickDiary.observation.type': '觀察類型',
  'quickDiary.observation.content': '觀察內容',
  'quickDiary.observation.contentPlaceholder': '記錄你的觀察和看法...',
  'quickDiary.observation.action': '後續行動（可選）',
  'quickDiary.observation.actionPlaceholder': '例如: 持續觀察、準備進場...',
  'quickDiary.templateAssistant.title': '模板助手',
  'quickDiary.templateAssistant.description': '模板欄位會更新建議標題與內容，送出前仍可自由編輯。',
  'quickDiary.templateAssistant.applyChanges': '套用模板變更',
  'quickDiary.templateAssistant.regenerate': '重新產生模板內容',
  'diary.diaryTitle': '日記標題',
}

const submitQuickNoteMock = vi.fn()
const clearDraftMock = vi.fn()
const setReminderMock = vi.fn()
const clearReminderMock = vi.fn()
const applyTemplateKindMock = vi.fn()
const setDateMock = vi.fn()
const resetStateMock = vi.fn()
const notifyDiaryCreatedMock = vi.fn()
const localStorageMap = new Map<string, any>()

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
    existingDiaryForDate: ref(false),
    checkingExistingDiaryForDate: ref(false),
    suggestedDraft: ref({ title: '2026/03/22 日記', content: '' }),
    hasTemplateChangesPending: ref(false),
    applyTemplateKind: applyTemplateKindMock.mockImplementation((kind: string) => {
      state.templateKind = kind as typeof state.templateKind
    }),
    updateTemplateData: vi.fn((patch: Record<string, unknown>) => {
      if (patch.symbols) {
        const sym = typeof patch.symbols === 'string'
          ? patch.symbols.split(',').map((s: string) => s.trim().toUpperCase()).join(', ')
          : ''
        state.title = `2026/03/22 ${patch.tradingType === 'sell' ? 'Sell' : 'Buy'} Diary - ${sym}`
      }
      if (patch.note) {
        state.content = patch.note as string
      }
    }),
    setTitle: vi.fn((title: string) => { state.title = title }),
    setContent: vi.fn((content: string) => { state.content = content }),
    setTags: vi.fn((tags: string[]) => { state.tags = tags }),
    setDate: setDateMock.mockImplementation((date: string) => { state.date = date }),
    setSaveMode: vi.fn((mode: string) => { state.saveMode = mode }),
    appendVoiceTranscript: vi.fn(),
    applySnippet: vi.fn(),
    applyTemplateChanges: vi.fn(),
    regenerateFromTemplate: vi.fn(),
    setQuickReminder: setReminderMock,
    handleReminderSet: setReminderMock,
    handleReminderClear: clearReminderMock,
    syncExistingDiaryForDate: vi.fn(async () => false),
    save: vi.fn(async () => {
      await submitQuickNoteMock({
        title: state.title,
        content: state.content,
        date: state.date,
        saveMode: state.saveMode,
        tags: state.tags,
      })
      clearDraftMock()
      clearReminderMock('reminder1')
      return { id: '42' }
    }),
    initialize: vi.fn(() => false),
    dispose: vi.fn(),
    resetState: resetStateMock,
  }
  return composer
}

vi.mock('~/composables/useQuickNoteComposer', () => ({
  useQuickNoteComposer: () => createMockComposer(),
}))

vi.mock('~/composables/useDiaryMutation', () => ({
  useDiaryMutation: () => ({
    notifyDiaryCreated: notifyDiaryCreatedMock,
    onDiaryMutation: vi.fn(),
    lastMutation: ref(null),
    version: ref(0),
  }),
}))

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useLocalStorage: (key: string, defaultValue: any) => {
      if (!localStorageMap.has(key)) {
        localStorageMap.set(key, ref(defaultValue))
      }
      return localStorageMap.get(key)!
    },
  }
})

function mountModal(props: Record<string, unknown> = {}) {
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

  return mount(QuickDiaryModal, {
    props: {
      show: true,
      ...props,
    },
    global: {
      stubs: {
        Teleport: {
          template: '<div><slot /></div>',
        },
        Transition: {
          template: '<div><slot /></div>',
        },
        Icon: {
          template: '<span />',
          props: ['name', 'class'],
        },
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
          template: '<div />',
          props: ['modelValue'],
        },
      },
    },
  })
}

async function clickByText(wrapper: ReturnType<typeof mount>, text: string) {
  const target = wrapper.findAll('button').find(button => button.text().includes(text))
  if (!target) {
    throw new Error(`Button not found: ${text}`)
  }
  await target.trigger('click')
}

async function clickSubmitButton(wrapper: ReturnType<typeof mount>) {
  const target = wrapper.findAll('button').find(button => button.classes().includes('overflow-hidden'))
  if (!target) {
    throw new Error('Submit button not found')
  }
  await target.trigger('click')
}

describe('QuickDiaryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMap.clear()
    submitQuickNoteMock.mockResolvedValue({ id: '42' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('opens directly into the editor without a forced template step', async () => {
    const wrapper = mountModal()

    expect(wrapper.find('input[aria-label="筆記標題"]').exists()).toBe(true)
    expect(wrapper.find('textarea[aria-label="筆記內容"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('更換模板')
    expect(wrapper.text()).not.toContain('1/2')
    expect(wrapper.text()).not.toContain('2/2')
    // Template grid is secondary and hidden until toggled
    expect(wrapper.text()).not.toContain('交易日記')
  })

  it('applies last-used template on open and persists the selection', async () => {
    localStorageMap.set('quick-note-last-template-kind', ref('observation'))
    const wrapper = mountModal()
    await flushPromises()

    expect(applyTemplateKindMock).toHaveBeenCalledWith('observation')

    await clickByText(wrapper, '更換模板')
    await clickByText(wrapper, '交易日記')

    expect(applyTemplateKindMock).toHaveBeenCalledWith('trading')
    expect(localStorageMap.get('quick-note-last-template-kind')?.value).toBe('trading')
  })

  it('applies calendar capture date from context', async () => {
    mountModal({
      context: { source: 'calendar', date: '2026-07-04' },
    })
    await flushPromises()

    expect(setDateMock).toHaveBeenCalledWith('2026-07-04')
  })

  it('resets composer state when the modal closes', async () => {
    const wrapper = mountModal({
      context: { source: 'timeline' },
    })

    await clickByText(wrapper, '取消')
    expect(resetStateMock).toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('saves free writing and notifies create mutation', async () => {
    const wrapper = mountModal()

    await wrapper.get('input[aria-label="筆記標題"]').setValue('午盤臨場觀察')
    await wrapper.get('textarea[aria-label="筆記內容"]').setValue('量縮但承接還在，尾盤再看是否補充到今日。')
    await clickSubmitButton(wrapper)
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '午盤臨場觀察',
      content: '量縮但承接還在，尾盤再看是否補充到今日。',
      date: '2026-03-22',
      saveMode: 'create',
      tags: [],
    }))
    expect(notifyDiaryCreatedMock).toHaveBeenCalledWith({
      id: '42',
      date: '2026-03-22',
      mode: 'create',
    })
    expect(mockToast.success).toHaveBeenCalledWith('已建立新日誌！')
    expect(wrapper.emitted('created')).toEqual([['42']])
  })

  it('uses append success toast and mutation mode when appending', async () => {
    const wrapper = mountModal()

    await wrapper.get('input[aria-label="筆記標題"]').setValue('追加一筆')
    await wrapper.get('textarea[aria-label="筆記內容"]').setValue('補一句觀察')
    await clickByText(wrapper, '補充到今日')
    await clickSubmitButton(wrapper)
    await flushPromises()

    expect(submitQuickNoteMock).toHaveBeenCalledWith(expect.objectContaining({
      saveMode: 'append',
    }))
    expect(notifyDiaryCreatedMock).toHaveBeenCalledWith({
      id: '42',
      date: '2026-03-22',
      mode: 'append',
    })
    expect(mockToast.success).toHaveBeenCalledWith('已追加至既有日誌！')
  })
})
