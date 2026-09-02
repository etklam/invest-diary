import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import QuickReminder from '~/components/QuickReminder.vue'

describe('QuickReminder', () => {
  it('renders a single custom reminder slot and emits set/clear for reminder1', async () => {
    const wrapper = mount(QuickReminder, {
      props: {
        reminders: {
          reminder1: '2026-03-22T08:30:00.000Z',
        },
      },
    })

    // 元件走 useI18n（測試環境無 vue-i18n plugin → 渲染 key 本身），斷言 key
    expect(wrapper.text()).toContain('quickDiary.reminders.customTitle')
    expect(wrapper.text()).toContain('quickDiary.reminders.singleHint')
    expect(wrapper.findAll('input[type="date"]')).toHaveLength(1)
    expect(wrapper.findAll('input[type="time"]')).toHaveLength(1)

    await wrapper.get('input[type="date"]').setValue('2026-03-23')
    await wrapper.get('input[type="time"]').setValue('09:45')
    await wrapper.get('button').trigger('click')

    // The component interprets wall-clock input in the host timezone; derive
    // the expected UTC instant from that same timezone so the assertion holds
    // on any machine (CI containers run UTC, dev machines run Asia/Taipei).
    const wallClock = new Date('2026-03-23T09:45:00')
    expect(wrapper.emitted('set')).toEqual([
      [{ key: 'reminder1', time: wallClock.toISOString() }],
    ])

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('clear')).toEqual([
      [{ key: 'reminder1' }],
    ])
  })
})
