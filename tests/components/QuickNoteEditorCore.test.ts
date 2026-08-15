import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import type { QuickNoteEditorController } from '~/lib/quicknote/editor-controller'

const messages: Record<string, string> = {
  'common.save': '儲存',
  'quickDiary.title': '快速筆記',
  'quickDiary.date': '日期',
  'quickDiary.editor.eyebrow': 'Quicknote Desk',
  'quickDiary.editor.intro': '先選好儲存方式，再整理內容。',
  'quickDiary.editor.saveModeLabel': '儲存方式',
  'quickDiary.editor.saveTo': '儲存至',
  'quickDiary.editor.moreOptions': '更多選項',
  'quickDiary.editor.optional': '選填',
  'quickDiary.editor.saveQuickDiary': '儲存隨手筆記',
  'quickDiary.editor.titlePlaceholder': '加入標題（選填）',
  'quickDiary.editor.contentPlaceholder': '記下想法',
  'quickDiary.editor.openDatePicker': '選擇日期',
  'quickDiary.editor.openReminderPicker': '設定提醒',
  'quickDiary.editor.openTagPicker': '管理標籤',
  'quickDiary.editor.openTemplatePicker': '使用模板',
  'quickDiary.editor.metadata': '筆記資訊',
  'quickDiary.editor.quickTemplates': '快速模板',
  'quickDiary.editor.unset': '未設定',
  'quickDiary.editor.today': '今天',
  'quickDiary.editor.reminderPickerTitle': '提醒我',
  'quickDiary.editor.tagPickerTitle': '標籤',
  'quickDiary.editor.datePickerTitle': '日期',
  'quickDiary.editor.closePicker': '關閉',
  'quickDiary.editor.customReminder': '自訂日期及時間',
  'quickDiary.editor.titleAria': '快速筆記標題',
  'quickDiary.editor.contentAria': '快速筆記內容',
  'quickDiary.editor.snippets': 'Snippets',
  'quickDiary.editor.manageTemplates': '管理模板',
  'quickDiary.editor.reminders': '快速提醒',
  'quickDiary.editor.checklistTitle': '落地前確認',
  'quickDiary.editor.checklist.title': '標題要能一眼看懂',
  'quickDiary.editor.checklist.append': '補一句就追加',
  'quickDiary.editor.checklist.create': '獨立想法就新建',
  'quickDiary.saveModes.create.label': '建立新日記',
  'quickDiary.saveModes.create.description': '建立獨立條目',
  'quickDiary.saveModes.create.summary': '建立獨立日記',
  'quickDiary.saveModes.append.label': '追加到當日',
  'quickDiary.saveModes.append.description': '附加到今日日記',
  'quickDiary.saveModes.append.summary': '追加到當日日記',
  'quickDiary.oneLiner.placeholder': '請輸入內容',
  'quickDiary.reminders.label': '提醒',
  'quickDiary.tools.tags': '標籤',
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
}

const controller = {
  state: reactive({
    title: '2026/03/22 Diary',
    content: 'Initial note',
    tags: ['watch'],
    stockSymbols: [],
    date: '2026-03-22',
    saveMode: 'create' as const,
    templateKind: 'blank' as const,
    templateData: {},
  }),
  templates: ref([{ id: 'template-1', name: '學習紀錄', content: '今天學到：', createdAt: '', updatedAt: '' }]),
  reminders: ref({ reminder1: null }),
  draftHint: ref('草稿已儲存'),
  draftStatus: ref<'idle' | 'saving' | 'saved' | 'failed'>('idle'),
  activeReminders: ref([{ key: 'reminder1', label: '提醒 1', remaining: '59 分鐘' }]),
  existingDiaryForDate: ref(true),
  checkingExistingDiaryForDate: ref(false),
  hasTemplateChangesPending: ref(false),
  templateOptions: ref([
    { kind: 'blank', label: '自由編輯', description: '直接記錄', icon: 'heroicons:pencil-square-solid', iconClass: '' },
  ]),
  templatePickerOpen: ref(false),
  setTitle: vi.fn(),
  setContent: vi.fn(),
  setTags: vi.fn(),
  setStockSymbols: vi.fn(),
  setDate: vi.fn(),
  setSaveMode: vi.fn(),
  appendVoiceTranscript: vi.fn(),
  applyTemplate: vi.fn(),
  updateTemplateData: vi.fn(),
  applyTemplateChanges: vi.fn(),
  regenerateFromTemplate: vi.fn(),
  setQuickReminder: vi.fn(),
  setReminder: vi.fn(),
  clearReminder: vi.fn(),
  setTemplatePickerOpen: vi.fn((value: boolean) => { controller.templatePickerOpen.value = value }),
  selectTemplateKind: vi.fn(),
  retryDraftSave: vi.fn(),
  save: vi.fn(),
  cancel: vi.fn(),
} as unknown as QuickNoteEditorController

function mountEditorCore() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => messages[key] || key,
  }))
  vi.stubGlobal('useTimezone', () => ({
    getTodayDateString: () => '2026-03-22',
  }))

  return mount(QuickNoteEditorCore, {
    props: {
      controller,
      saving: false,
    },
    global: {
      stubs: {
        VoiceInput: {
          template: '<button type="button" data-test="voice" @click="$emit(\'result\', \'voice text\')">voice</button>',
        },
        TemplateManager: {
          template: '<button type="button" data-test="template-apply" @click="$emit(\'apply\', \'模板內容\')">apply</button>',
          props: ['modelValue'],
        },
        QuickReminder: {
          template: '<div><button type="button" data-test="reminder-set" @click="$emit(\'set\', { key: \'reminder1\', time: \'2026-03-22T12:00:00.000Z\' })">set</button><button type="button" data-test="reminder-clear" @click="$emit(\'clear\', { key: \'reminder1\' })">clear</button></div>',
          props: ['reminders'],
        },
        QuickTags: {
          template: '<button type="button" data-test="tags" @click="$emit(\'update:modelValue\', [\'watch\', \'profit\'])">tags</button>',
          props: ['modelValue'],
        },
        Icon: true,
      },
    },
  })
}

describe('QuickNoteEditorCore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('emits content, tags, and date updates', async () => {
    const wrapper = mountEditorCore()

    expect(wrapper.find('.quick-note-editor-scroll').classes()).toContain('pb-40')

    await wrapper.get('input[aria-label="快速筆記標題"]').setValue('Manual title')
    await wrapper.get('textarea[aria-label="快速筆記內容"]').setValue('Updated note')
    await wrapper.get('[data-test="tags"]').trigger('click')
    await wrapper.get('#quick-note-date').setValue('2026-03-23')

    expect(controller.setTitle).toHaveBeenCalledWith('Manual title')
    expect(controller.setContent).toHaveBeenCalledWith('Updated note')
    expect(controller.setTags).toHaveBeenCalledWith(['watch', 'profit'])
    expect(controller.setDate).toHaveBeenCalledWith('2026-03-23')
  })

  it('emits editor actions for voice, template, reminders, save mode, and save', async () => {
    const wrapper = mountEditorCore()

    await wrapper.get('[data-test="voice"]').trigger('click')
    await wrapper.get('[data-test="template-apply"]').trigger('click')
    await wrapper.get('[data-test="quick-note-row-reminder"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('自訂日期及時間'))!.trigger('click')
    await wrapper.get('[data-test="reminder-set"]').trigger('click')
    await wrapper.get('[data-test="reminder-clear"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('追加到當日'))!.trigger('click')
    await wrapper.get('[data-test="quick-capture-save"]').trigger('click')

    expect(controller.appendVoiceTranscript).toHaveBeenCalledWith('voice text')
    expect(controller.applyTemplate).toHaveBeenCalledWith('模板內容')
    expect(controller.setReminder).toHaveBeenCalledWith({ key: 'reminder1', time: '2026-03-22T12:00:00.000Z' })
    expect(controller.clearReminder).toHaveBeenCalledWith({ key: 'reminder1' })
    expect(controller.setSaveMode).toHaveBeenCalledWith('append')
    expect(controller.save).toHaveBeenCalled()
  })

  it('renders semantic quick reminder buttons and forwards reminder presets', async () => {
    const wrapper = mountEditorCore()

    await wrapper.get('[data-test="quick-note-row-reminder"]').trigger('click')

    const tomorrowButton = wrapper.findAll('button').find(button => button.text() === '明天')
    const nextWeekButton = wrapper.findAll('button').find(button => button.text() === '下周')
    const nextMonthButton = wrapper.findAll('button').find(button => button.text() === '下個月')

    expect(tomorrowButton).toBeTruthy()
    expect(nextWeekButton).toBeTruthy()
    expect(nextMonthButton).toBeTruthy()

    await tomorrowButton!.trigger('click')
    await nextWeekButton!.trigger('click')
    await nextMonthButton!.trigger('click')

    expect(controller.setQuickReminder).toHaveBeenCalledWith('tomorrow')
    expect(controller.setQuickReminder).toHaveBeenCalledWith('nextWeek')
    expect(controller.setQuickReminder).toHaveBeenCalledWith('nextMonth')
  })

  it('keeps the title behind More options on mobile', async () => {
    const wrapper = mountEditorCore()

    expect(wrapper.get('#quick-note-title').classes()).toContain('w-full')
    expect(wrapper.get('#quick-note-title').element.closest('.hidden')).toBeTruthy()

    await wrapper.get('[data-test="quick-note-row-more"]').trigger('click')

    expect(wrapper.get('#quick-note-title-mobile').attributes('aria-label')).toBe('快速筆記標題')
  })
})
