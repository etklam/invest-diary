import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertNotification from '~/components/AlertNotification.vue'

const mountAlert = (props: { message: string; show: boolean }) => {
  return mount(AlertNotification, {
    props,
    global: {
      stubs: {
        Transition: { template: '<div><slot /></div>' },
        Icon: {
          template: '<span />',
          props: ['name', 'class'],
        },
      },
      config: {
        globalProperties: {
          $t: (key: string) => key,
        },
      },
    },
  })
}

describe('AlertNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(0), 0)
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not render when show is false', () => {
    const wrapper = mountAlert({ message: 'Test alert', show: false })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders message when show is true', () => {
    const wrapper = mountAlert({ message: 'Test alert message', show: true })
    expect(wrapper.text()).toContain('Test alert message')
    expect(wrapper.text()).toContain('alert.title')
  })

  it('emits close event when button clicked', async () => {
    const wrapper = mountAlert({ message: 'Test alert', show: true })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('auto-closes after 5 seconds when show becomes true', async () => {
    const wrapper = mountAlert({ message: 'Test alert', show: false })

    await wrapper.setProps({ show: true })
    vi.advanceTimersByTime(5000)

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
