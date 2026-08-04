import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'

const messages: Record<string, string> = {
  'common.save': '儲存',
  'quickDiary.title': '快速筆記',
  'quickDiary.date': '日期',
  'quickDiary.editor.eyebrow': 'Quicknote Desk',
  'quickDiary.editor.intro': '先選好儲存方式，再整理內容。',
  'quickDiary.editor.saveModeLabel': '儲存方式',
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
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
}

function mountEditorCore() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => messages[key] || key,
  }))
  vi.stubGlobal('useTimezone', () => ({
    getTodayDateString: () => '2026-03-22',
  }))

  return mount(QuickNoteEditorCore, {
    props: {
      title: '2026/03/22 Diary',
      content: 'Initial note',
      tags: ['watch'],
      date: '2026-03-22',
      saveMode: 'create',
      saving: false,
      draftHint: '草稿已儲存',
      templates: [
        { id: 'template-1', name: '學習紀錄', content: '今天學到：', createdAt: '', updatedAt: '' },
      ],
      reminders: {
        reminder1: null,
      },
      activeReminders: [
        { key: 'reminder1', label: '提醒 1', remaining: '59 分鐘' },
      ],
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

    expect(wrapper.emitted('update:title')).toEqual([['Manual title']])
    expect(wrapper.emitted('update:content')).toEqual([['Updated note']])
    expect(wrapper.emitted('update:tags')).toEqual([[['watch', 'profit']]])
    expect(wrapper.emitted('update:date')).toEqual([['2026-03-23']])
  })

  it('emits editor actions for voice, template, reminders, save mode, and save', async () => {
    const wrapper = mountEditorCore()

    await wrapper.get('[data-test="voice"]').trigger('click')
    await wrapper.get('[data-test="template-apply"]').trigger('click')
    await wrapper.get('[data-test="reminder-set"]').trigger('click')
    await wrapper.get('[data-test="reminder-clear"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('追加到當日'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('儲存'))!.trigger('click')

    expect(wrapper.emitted('append-text')).toEqual([['voice text']])
    expect(wrapper.emitted('apply-template')).toEqual([['模板內容']])
    expect(wrapper.emitted('reminder-set')).toEqual([[{ key: 'reminder1', time: '2026-03-22T12:00:00.000Z' }]])
    expect(wrapper.emitted('reminder-clear')).toEqual([[{ key: 'reminder1' }]])
    expect(wrapper.emitted('update:save-mode')).toEqual([['append']])
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('renders semantic quick reminder buttons and emits reminder presets', async () => {
    const wrapper = mountEditorCore()

    const tomorrowButton = wrapper.findAll('button').find(button => button.text() === '明天')
    const nextWeekButton = wrapper.findAll('button').find(button => button.text() === '下周')
    const nextMonthButton = wrapper.findAll('button').find(button => button.text() === '下個月')

    expect(tomorrowButton).toBeTruthy()
    expect(nextWeekButton).toBeTruthy()
    expect(nextMonthButton).toBeTruthy()

    await tomorrowButton!.trigger('click')
    await nextWeekButton!.trigger('click')
    await nextMonthButton!.trigger('click')

    expect(wrapper.emitted('set-quick-reminder')).toEqual([
      ['tomorrow'],
      ['nextWeek'],
      ['nextMonth'],
    ])
  })
})
