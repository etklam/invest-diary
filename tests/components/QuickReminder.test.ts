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

    expect(wrapper.text()).toContain('可設定 1 組')
    expect(wrapper.text()).not.toContain('提醒 2')
    expect(wrapper.text()).not.toContain('提醒 3')
    expect(wrapper.findAll('input[type="date"]')).toHaveLength(1)
    expect(wrapper.findAll('input[type="time"]')).toHaveLength(1)

    await wrapper.get('input[type="date"]').setValue('2026-03-23')
    await wrapper.get('input[type="time"]').setValue('09:45')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('set')).toEqual([
      [{ key: 'reminder1', time: '2026-03-23T01:45:00.000Z' }],
    ])

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('clear')).toEqual([
      [{ key: 'reminder1' }],
    ])
  })
})
