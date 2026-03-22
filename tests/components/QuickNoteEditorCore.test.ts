import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'

function mountEditorCore() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => key,
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
        reminder2: null,
        reminder3: null,
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

    await wrapper.get('input[aria-label="快速筆記標題"]').setValue('Manual title')
    await wrapper.get('textarea[aria-label="快速筆記內容"]').setValue('Updated note')
    await wrapper.get('[data-test="tags"]').trigger('click')
    await wrapper.get('#quick-note-date').setValue('2026-03-23')
    await wrapper.get('select[aria-label="儲存模式"]').setValue('append')

    expect(wrapper.emitted('update:title')).toEqual([['Manual title']])
    expect(wrapper.emitted('update:content')).toEqual([['Updated note']])
    expect(wrapper.emitted('update:tags')).toEqual([[['watch', 'profit']]])
    expect(wrapper.emitted('update:date')).toEqual([['2026-03-23']])
    expect(wrapper.emitted('update:saveMode')).toEqual([['append']])
  })

  it('emits editor actions for voice, template, reminders, and save', async () => {
    const wrapper = mountEditorCore()

    await wrapper.get('[data-test="voice"]').trigger('click')
    await wrapper.get('[data-test="template-apply"]').trigger('click')
    await wrapper.get('[data-test="reminder-set"]').trigger('click')
    await wrapper.get('[data-test="reminder-clear"]').trigger('click')
    await wrapper.get('button.rounded-md.bg-indigo-600').trigger('click')

    expect(wrapper.emitted('append-text')).toEqual([['voice text']])
    expect(wrapper.emitted('apply-template')).toEqual([['模板內容']])
    expect(wrapper.emitted('reminder-set')).toEqual([[{ key: 'reminder1', time: '2026-03-22T12:00:00.000Z' }]])
    expect(wrapper.emitted('reminder-clear')).toEqual([[{ key: 'reminder1' }]])
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
