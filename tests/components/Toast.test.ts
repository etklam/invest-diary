import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from '~/components/Toast.vue'

const mountToast = () => {
  return mount(Toast, {
    props: { toasts: [] },
    global: {
      stubs: {
        TransitionGroup: { template: '<div><slot /></div>' },
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

describe('Toast Component', () => {
  describe('getIcon', () => {
    it('should return correct icons for each type', () => {
      const wrapper = mountToast()

      expect((wrapper.vm as any).getIcon('success')).toBe('heroicons:check-circle-solid')
      expect((wrapper.vm as any).getIcon('error')).toBe('heroicons:x-circle-solid')
      expect((wrapper.vm as any).getIcon('warning')).toBe('heroicons:exclamation-triangle-solid')
      expect((wrapper.vm as any).getIcon('info')).toBe('heroicons:information-circle-solid')
    })
  })

  describe('getIconClass', () => {
    it('should return correct classes for each type', () => {
      const wrapper = mountToast()

      expect((wrapper.vm as any).getIconClass('success')).toBe('text-emerald-600 dark:text-emerald-400')
      expect((wrapper.vm as any).getIconClass('error')).toBe('text-red-600 dark:text-red-400')
      expect((wrapper.vm as any).getIconClass('warning')).toBe('text-amber-600 dark:text-amber-400')
      expect((wrapper.vm as any).getIconClass('info')).toBe('text-blue-600 dark:text-blue-400')
    })
  })
})
