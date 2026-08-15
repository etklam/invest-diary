import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import DiaryAuthoringForm from '~/components/diaries/DiaryAuthoringForm.vue'
import { createEmptyDiaryAuthoringForm } from '~/lib/diary-authoring/hydration'
import type { DiaryAuthoringForm as DiaryAuthoringFormData } from '~/lib/diary-authoring/types'
import { mockToast } from '../vi-setup'

const messages: Record<string, string> = {
  'common.cancel': '取消',
  'common.delete': '刪除',
  'common.save': '儲存',
  'diary.newDiary': '新增日記',
  'diary.writeDiary': '寫日記',
  'diary.diaryDate': '日期',
  'diary.titleRequired': '請輸入標題',
  'diary.form.alerts': '提醒設定',
  'diary.form.addAlert': '新增提醒',
  'diary.form.alertMessage': '訊息',
  'diary.form.alertDate': '提醒日期',
  'diary.form.alertRecurring': '重複',
  'diary.form.noAlerts': '尚無提醒',
  'diary.form.recurringNone': '不重複',
  'diary.form.recurringWeek': '本週',
  'diary.form.recurringMonth': '本月',
  'diary.form.recurringOnceDesc': '一次',
  'diary.form.recurringWeekDesc': '每週',
  'diary.form.recurringMonthDesc': '每月',
  'diary.form.transactions': '交易記錄',
  'diary.form.validationFailed': '驗證失敗',
  'review.fields.thesis': '交易假設',
  'review.fields.risk': '風險',
  'review.fields.execution': '執行',
  'review.fields.reviewDue': '複盤期限',
  'review.fields.thesisPlaceholder': '交易假設',
  'review.fields.riskPlaceholder': '風險',
  'review.fields.executionPlaceholder': '執行',
}

const translate = (key: string) => messages[key] ?? key
const resolveDateConflict = vi.fn()
const retryDateLookup = vi.fn()

function mountForm(form = reactive<DiaryAuthoringFormData>(createEmptyDiaryAuthoringForm('2026-08-15'))) {
  vi.stubGlobal('useI18n', () => ({ t: translate }))
  vi.stubGlobal('useToast', () => mockToast)
  vi.stubGlobal('useTimezone', () => ({ getTodayDateString: () => '2026-08-15' }))

  return mount(DiaryAuthoringForm, {
    props: {
      form,
      checkingDate: false,
      pendingConflict: null,
      dateLookupError: false,
      cancelTo: '/diaries',
      resolveDateConflict,
      retryDateLookup,
    },
    global: {
      stubs: {
        Icon: { template: '<span />' },
        LedgerCard: { template: '<div><slot /></div>' },
        TransactionInput: { template: '<div />', props: ['modelValue'] },
        DiaryEditor: { template: '<div />', props: ['title', 'content', 'stockSymbols'] },
        NuxtLink: {
          props: ['to'],
          template: '<a href="#" @click="$emit(\'click\', $event)"><slot /></a>',
        },
        BaseButton: {
          props: ['type', 'variant', 'disabled'],
          emits: ['click'],
          template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
        },
      },
    },
  })
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('DiaryAuthoringForm', () => {
  it('automatically expands transactions and alerts when data arrives', async () => {
    const form = reactive<DiaryAuthoringFormData>(createEmptyDiaryAuthoringForm('2026-08-15'))
    const wrapper = mountForm(form)
    const sections = wrapper.findAll('section')

    expect(sections[0]?.find('button').attributes('aria-expanded')).toBe('false')
    expect(sections[1]?.find('button').attributes('aria-expanded')).toBe('false')

    form.transactions.push({ symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10, trade_date: '2026-08-15T12:00' })
    form.alerts.push({ message: 'Review', trigger_at: '2026-08-15', recurring_mode: '' })
    await nextTick()

    expect(sections[0]?.find('button').attributes('aria-expanded')).toBe('true')
    expect(sections[1]?.find('button').attributes('aria-expanded')).toBe('true')
  })

  it('adds, describes, and removes recurring alerts', async () => {
    const wrapper = mountForm()
    const testForm = (wrapper.props('form') as DiaryAuthoringFormData)
    const alerts = wrapper.findAll('section')[1]!

    await alerts.find('button').trigger('click')
    await alerts.findAll('button').find((button) => button.text() === '新增提醒')!.trigger('click')
    expect(wrapper.get('#alert-msg-0').exists()).toBe(true)

    await wrapper.get('#alert-recurring-0').setValue('WEEK')
    expect(alerts.text()).toContain('每週')

    await wrapper.get('button[aria-label="刪除"]').trigger('click')
    await nextTick()
    expect(testForm.alerts).toHaveLength(0)
    expect(wrapper.find('#alert-msg-0').exists()).toBe(false)
  })

  it('validates before emitting save', async () => {
    const wrapper = mountForm()
    await wrapper.get('form').trigger('submit')
    expect(mockToast.error).toHaveBeenCalledWith('請輸入標題')
    expect(wrapper.emitted('save')).toBeUndefined()

    wrapper.vm.form.title = 'A diary'
    wrapper.vm.form.transactions.push({
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 0,
      price: 10,
      trade_date: '2026-08-15T12:00',
    })
    await wrapper.get('form').trigger('submit')
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('驗證失敗'))
    expect(wrapper.emitted('save')).toBeUndefined()

    wrapper.vm.form.transactions[0]!.quantity = 1
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
