import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const shell = vi.hoisted(() => ({
  openQuickDiary: vi.fn(),
  openMobileNavigation: vi.fn(),
}))

vi.mock('~/composables/useAppShell', () => ({
  useAppShell: () => ({
    ...shell,
    showMobileNavigation: ref(false),
  }),
}))

describe('BottomNavigation', () => {
  beforeEach(() => {
    shell.openQuickDiary.mockReset()
    shell.openMobileNavigation.mockReset()
    vi.stubGlobal('useNavigation', () => ({
      bottomNavItems: ref([
        { id: 'timeline', label: 'Timeline', to: '/timeline', icon: 'clock' },
        { id: 'portfolio', label: 'Portfolio', to: '/stocks', icon: 'chart-bar' },
        { id: 'quick-diary', label: 'Quick Diary', icon: 'pencil-square', action: 'quick-diary' },
        { id: 'review', label: 'Review', to: '/reviews', icon: 'clipboard-document-check' },
        { id: 'more', label: 'More', icon: 'ellipsis-horizontal', action: 'more' },
      ]),
      isBottomNavActive: () => false,
    }))
  })

  it('opens shared Quick Diary and More actions without fake routes', async () => {
    const { default: BottomNavigation } = await import('~/components/BottomNavigation.vue')
    const wrapper = mount(BottomNavigation, {
      global: {
        stubs: {
          NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          Icon: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(shell.openQuickDiary).toHaveBeenCalledOnce()
    expect(shell.openMobileNavigation).toHaveBeenCalledOnce()
    expect(wrapper.find('a[href="/quick-diary"]').exists()).toBe(false)
  })
})
