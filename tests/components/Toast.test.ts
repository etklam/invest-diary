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

  describe('getIconStyle', () => {
    it('should return correct semantic color styles for each type', () => {
      const wrapper = mountToast()

      expect((wrapper.vm as any).getIconStyle('success')).toBe('color: var(--color-success);')
      expect((wrapper.vm as any).getIconStyle('error')).toBe('color: var(--color-danger);')
      expect((wrapper.vm as any).getIconStyle('warning')).toBe('color: var(--color-warning);')
      expect((wrapper.vm as any).getIconStyle('info')).toBe('color: var(--color-info);')
    })
  })
})
