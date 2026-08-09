import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TradePlanForm from '~/components/TradePlanForm.vue'

describe('TradePlanForm', () => {
  beforeEach(() => {
    vi.stubGlobal('useTimezone', () => ({ formatLocaleDate: (value: string) => value }))
  })

  it('preserves user input when Diary options arrive asynchronously', async () => {
    const wrapper = mount(TradePlanForm, {
      props: {
        initial: { diaryId: '', symbol: '' },
        diaries: [],
        submitLabel: 'Create',
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs: {
          LedgerCard: { template: '<section><slot /></section>' },
          NumberField: { template: '<input />' },
          BaseButton: { template: '<button><slot /></button>' },
          Icon: { template: '<span />' },
        },
      },
    })

    const symbol = wrapper.get('input[required]')
    await symbol.setValue('MSFT')
    await wrapper.setProps({
      diaries: [{ id: '42', title: 'Owned Diary', date: '2026-08-01' }],
    })

    expect((symbol.element as HTMLInputElement).value).toBe('MSFT')
  })
})
