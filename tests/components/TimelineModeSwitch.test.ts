import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineModeSwitch from '~/components/TimelineModeSwitch.vue'

const mountSwitch = (path: string) => {
  vi.stubGlobal('useRoute', () => ({ path }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))

  return mount(TimelineModeSwitch, {
    global: {
      stubs: {
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        Icon: true,
      },
    },
  })
}

describe('TimelineModeSwitch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('marks only My Timeline active on the base route', () => {
    const wrapper = mountSwitch('/timeline')
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
    expect(wrapper.get('[aria-current="page"]').attributes('href')).toBe('/timeline')
  })

  it('marks only Pair View active on the compare route', () => {
    const wrapper = mountSwitch('/timeline/compare')
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
    expect(wrapper.get('[aria-current="page"]').attributes('href')).toBe('/timeline/compare')
  })
})
