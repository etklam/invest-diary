import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, onMounted, reactive, ref, Suspense, watch } from 'vue'
import { mockToast } from '../vi-setup'
import DiaryNewPage from '~/pages/diaries/new.vue'
import DiaryEditPage from '~/pages/diaries/[id]/edit.vue'

vi.mock('~/composables/useDiscipline', () => ({
  showDisciplineToast: vi.fn(async () => undefined),
}))

const messages: Record<string, string> = {
  'common.loading': '載入中',
  'common.edit': '編輯既有日記',
  'common.cancel': '取消',
  'common.retry': '重試',
  'common.save': '儲存',
  'diary.newDiary': '新增日記',
  'diary.editDiary': '編輯日記',
  'diary.writeDiary': '寫日記',
  'diary.diaryDate': '日期',
  'diary.form.existingLoaded': '已載入既有日記',
  'diary.form.checkExistingFailed': '無法檢查既有日記',
  'diary.form.titlePlaceholder': '輸入標題',
  'diary.form.contentPlaceholder': '輸入內容',
  'diary.form.markdownHint': '支援 Markdown',
  'diary.form.preview': '預覽',
  'diary.form.previewEmpty': '預覽為空',
  'diary.form.transactions': '交易記錄',
  'diary.form.alerts': '提醒設定',
  'diary.form.noAlerts': '尚無提醒',
  'diary.form.addAlert': '新增提醒',
  'diary.form.alertMessage': '訊息',
  'diary.form.alertDate': '提醒日期',
  'diary.form.alertRecurring': '重複',
  'diary.form.recurringNone': '不重複',
  'diary.form.recurringWeek': '本週',
  'diary.form.recurringMonth': '本月',
  'diary.form.recurringOnceDesc': '一次',
  'diary.form.recurringWeekDesc': '每週',
  'diary.form.recurringMonthDesc': '每月',
  'diary.saveSuccess': '已儲存',
  'diary.updateSuccess': '已更新',
  'diary.saveFailed': '儲存失敗',
  'diary.titleRequired': '請輸入標題',
  'diary.form.validationFailed': '驗證失敗',
  'quickDiary.errors.diaryExists': '該日期已有日記',
  'quickDiary.appendDiary': '追加到既有日記',
  'review.fields.thesis': '交易假設',
  'review.fields.risk': '風險',
  'review.fields.thesisPlaceholder': '交易假設',
  'review.fields.riskPlaceholder': '風險',
}

const activeWrappers: VueWrapper<any>[] = []

function translate(key: string, params?: Record<string, unknown>) {
  const message = messages[key] ?? key
  return message.replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function installCommonGlobals({
  route,
  router,
  confirm,
}: {
  route: Record<string, any>
  router: { push: ReturnType<typeof vi.fn> }
  confirm?: ReturnType<typeof vi.fn>
}) {
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => router)
  vi.stubGlobal('useAuth', () => ({
    user: ref({ id: '1' }),
    refreshAccessToken: vi.fn(async () => true),
  }))
  vi.stubGlobal('useTimezone', () => ({
    getTodayDateString: () => '2026-08-07',
    getTimezone: () => 'Asia/Taipei',
    formatLocaleDate: (value: string) => value,
  }))
  vi.stubGlobal('useI18n', () => ({
    t: translate,
    locale: ref('zh-TW'),
  }))
  vi.stubGlobal('useToast', () => mockToast)
  vi.stubGlobal('confirm', confirm ?? vi.fn(() => true))
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onMounted', onMounted)
}

function mountPage(
  component: any,
  route: Record<string, any>,
  options: {
    fetchImpl: (url: string, options?: any) => Promise<any>
    diary?: any
    confirm?: ReturnType<typeof vi.fn>
  },
) {
  const router = { push: vi.fn() }
  const fetchMock = vi.fn(options.fetchImpl)
  const diary = ref(options.diary ?? null)
  const pending = ref(false)
  const error = ref(null)

  installCommonGlobals({ route, router, confirm: options.confirm })
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useLazyFetch', vi.fn(() => ({ data: diary, pending, error })))

  const Host = defineComponent({
    setup() {
      return () => h(
        Suspense,
        {},
        {
          default: () => h(component),
          fallback: () => h('div', { 'data-testid': 'page-suspense-fallback' }, 'loading'),
        },
      )
    },
  })

  const wrapper = mount(Host, {
    global: {
      stubs: {
        Icon: { template: '<span />' },
        LedgerCard: { template: '<div><slot /></div>' },
        TransactionInput: { template: '<div />', props: ['modelValue'] },
        DiaryEditor: {
          props: ['title', 'content'],
          emits: ['update:title', 'update:content'],
          template: `
            <div>
              <label for="title">標題</label>
              <input id="title" :value="title" @input="$emit('update:title', $event.target.value)" />
              <label for="content">內容</label>
              <textarea id="content" :value="content" @input="$emit('update:content', $event.target.value)" />
            </div>
          `,
        },
        NuxtLink: {
          props: ['to'],
          template: '<a href="#" @click="$emit(\'click\', $event)"><slot /></a>',
        },
        BaseButton: {
          props: ['type', 'variant', 'disabled'],
          template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
        },
      },
      config: {
        globalProperties: {
          $t: translate,
        },
      },
    },
  })

  activeWrappers.push(wrapper)

  return { wrapper, fetchMock, router, diary }
}

function byDateCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/diaries/by-date'))
}

async function settleInitial(wrapper: VueWrapper<any>, initial: ReturnType<typeof deferred<any>>) {
  initial.resolve(null)
  await flushPromises()
  expect(wrapper.find('[data-testid="diary-initial-preflight"]').exists()).toBe(false)
}

afterEach(() => {
  for (const wrapper of activeWrappers.splice(0)) wrapper.unmount()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('new diary authoring page', () => {
  it('preflights the initial date and offers Edit, Append, and Cancel for an occupied date', async () => {
    const initial = deferred<any>()
    const { wrapper } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      {
        fetchImpl: async (url) => {
          if (url.includes('/by-date')) return initial.promise
          return null
        },
      },
    )

    expect(wrapper.find('[data-testid="diary-initial-preflight"]').exists()).toBe(true)
    initial.resolve({ id: '42', date: '2026-08-07T04:00:00.000Z', title: 'Existing', content: 'Existing body' })
    await flushPromises()

    const dialog = wrapper.get('[data-testid="diary-date-conflict"]')
    expect(dialog.text()).toContain('編輯既有日記')
    expect(dialog.text()).toContain('追加到既有日記')
    expect(dialog.text()).toContain('取消')
    expect(wrapper.find('#title').exists()).toBe(false)

    await dialog.findAll('button')[0]!.trigger('click')
    expect(wrapper.get('#title').element).toHaveProperty('value', 'Existing')
    expect(wrapper.find('[data-testid="diary-date-conflict"]').exists()).toBe(false)
  })

  it('keeps the draft for Append and sends explicit append intent', async () => {
    const initial = deferred<any>()
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/by-date')) return initial.promise
      if (url === '/api/diaries') return { id: '43' }
      return null
    })
    const { wrapper, fetchMock, router } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      { fetchImpl },
    )

    initial.resolve({ id: '42', date: '2026-08-07T04:00:00.000Z', title: 'Existing', content: 'Existing body' })
    await flushPromises()
    await wrapper.get('[data-testid="diary-date-conflict"]').findAll('button')[1]!.trigger('click')

    await wrapper.get('#title').setValue('A new addition')
    await wrapper.get('#content').setValue('Draft to append')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const saveCall = fetchMock.mock.calls.find(([url, options]) => url === '/api/diaries' && options?.method === 'POST')
    expect(saveCall?.[1]?.body).toMatchObject({
      appendToToday: true,
      title: 'A new addition',
      content: 'Draft to append',
    })
    expect(router.push).toHaveBeenCalledWith('/diaries')
  })

  it('cancels a conflict without replacing the current date or draft', async () => {
    const initial = deferred<any>()
    const { wrapper } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      { fetchImpl: async (url) => url.includes('/by-date') ? initial.promise : null },
    )

    initial.resolve({ id: '42', date: '2026-08-07T04:00:00.000Z', title: 'Existing', content: 'Existing body' })
    await flushPromises()
    await wrapper.get('[data-testid="diary-date-conflict"]').findAll('button')[2]!.trigger('click')

    expect(wrapper.find('[data-testid="diary-date-conflict"]').exists()).toBe(false)
    expect(wrapper.get('#diary-date').element).toHaveProperty('value', '2026-08-07')
    expect(wrapper.get('#title').element).toHaveProperty('value', '')
  })

  it('does not replace dirty content after a date lookup, and preserves it on failure with retry', async () => {
    const initial = deferred<any>()
    const nextDate = deferred<any>()
    const confirm = vi.fn(() => false)
    const { wrapper, fetchMock } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      {
        confirm,
        fetchImpl: async (url) => {
          if (url.includes('date=2026-08-07')) return initial.promise
          if (url.includes('date=2026-08-08')) return nextDate.promise
          return null
        },
      },
    )

    await settleInitial(wrapper, initial)
    await wrapper.get('#title').setValue('Keep me')
    await wrapper.get('#diary-date').setValue('2026-08-08')
    nextDate.reject(new Error('network down'))
    await flushPromises()

    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.get('#title').element).toHaveProperty('value', 'Keep me')
    expect(wrapper.get('#diary-date').element).toHaveProperty('value', '2026-08-07')
    expect(wrapper.find('[data-testid="diary-date-lookup-error"]').exists()).toBe(true)

    const retry = deferred<any>()
    fetchMock.mockImplementationOnce(async () => retry.promise)
    await wrapper.get('[data-testid="diary-date-lookup-error"]').find('button').trigger('click')
    retry.resolve(null)
    await flushPromises()

    expect(wrapper.get('#title').element).toHaveProperty('value', 'Keep me')
    expect(wrapper.find('[data-testid="diary-date-lookup-error"]').exists()).toBe(false)
  })

  it('ignores stale date lookup responses', async () => {
    const initial = deferred<any>()
    const first = deferred<any>()
    const second = deferred<any>()
    const { wrapper } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      {
        fetchImpl: async (url) => {
          if (url.includes('date=2026-08-07')) return initial.promise
          if (url.includes('date=2026-08-08')) return first.promise
          if (url.includes('date=2026-08-09')) return second.promise
          return null
        },
      },
    )

    await settleInitial(wrapper, initial)
    await wrapper.get('#diary-date').setValue('2026-08-08')
    await wrapper.get('#diary-date').setValue('2026-08-09')

    second.resolve(null)
    await flushPromises()
    first.resolve({ id: 'stale', date: '2026-08-08T04:00:00.000Z', title: 'Stale', content: 'Wrong' })
    await flushPromises()

    expect(wrapper.get('#diary-date').element).toHaveProperty('value', '2026-08-09')
    expect(wrapper.find('[data-testid="diary-date-conflict"]').exists()).toBe(false)
    expect(wrapper.get('#title').element).toHaveProperty('value', '')
  })

  it('uses the shared dirty policy for Cancel and clears it after save', async () => {
    const initial = deferred<any>()
    const confirm = vi.fn(() => false)
    const { wrapper, router } = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      {
        confirm,
        fetchImpl: async (url, options) => {
          if (url.includes('/by-date')) return initial.promise
          if (url === '/api/diaries' && options?.method === 'POST') return { id: '44' }
          return null
        },
      },
    )

    await settleInitial(wrapper, initial)
    await wrapper.get('#title').setValue('Dirty')
    const beforeUnload = new Event('beforeunload')
    const preventDefault = vi.spyOn(beforeUnload, 'preventDefault')
    window.dispatchEvent(beforeUnload)
    expect(preventDefault).toHaveBeenCalledOnce()

    await wrapper.get('a').trigger('click')
    expect(router.push).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await wrapper.get('a').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/diaries')

    // Re-mount a clean flow to verify a successful save clears beforeunload.
    wrapper.unmount()
    const saveInitial = deferred<any>()
    const saved = mountPage(
      DiaryNewPage,
      { query: { date: '2026-08-07' }, params: {}, meta: {} },
      {
        fetchImpl: async (url, options) => {
          if (url.includes('/by-date')) return saveInitial.promise
          if (url === '/api/diaries' && options?.method === 'POST') return { id: '45' }
          return null
        },
      },
    )
    await settleInitial(saved.wrapper, saveInitial)
    await saved.wrapper.get('#title').setValue('Saved')
    await saved.wrapper.get('#content').setValue('Content')
    await saved.wrapper.get('form').trigger('submit')
    await flushPromises()

    const cleanUnload = new Event('beforeunload')
    const cleanPreventDefault = vi.spyOn(cleanUnload, 'preventDefault')
    window.dispatchEvent(cleanUnload)
    expect(cleanPreventDefault).not.toHaveBeenCalled()
    saved.wrapper.unmount()
  })
})

describe('edit diary authoring page', () => {
  it('uses the same date conflict choices and targets the selected existing Diary', async () => {
    const target = deferred<any>()
    const fetchImpl = async (url: string, options?: any) => {
      if (url.includes('/by-date')) return target.promise
      if (url.includes('/api/diaries/1') && options?.method === 'PUT') return { id: '1' }
      return null
    }
    const { wrapper } = mountPage(
      DiaryEditPage,
      { query: {}, params: { id: '1' }, meta: {} },
      {
        diary: { id: '1', date: '2026-08-07T04:00:00.000Z', title: 'Original', content: 'Original content' },
        fetchImpl,
      },
    )

    await flushPromises()
    expect(wrapper.get('#title').element).toHaveProperty('value', 'Original')
    await wrapper.get('#diary-date').setValue('2026-08-08')
    target.resolve({ id: '2', date: '2026-08-08T04:00:00.000Z', title: 'Target', content: 'Target content' })
    await flushPromises()

    const dialog = wrapper.get('[data-testid="diary-date-conflict"]')
    expect(dialog.text()).toContain('編輯既有日記')
    expect(dialog.text()).toContain('追加到既有日記')
    await dialog.findAll('button')[0]!.trigger('click')

    expect(wrapper.get('#title').element).toHaveProperty('value', 'Target')
    expect(wrapper.get('#diary-date').element).toHaveProperty('value', '2026-08-08')
  })
})
