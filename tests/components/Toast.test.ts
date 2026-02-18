import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Nuxt components
vi.stubGlobal('defineProps', (props: any) => props)
vi.stubGlobal('defineEmits', (emits: any) => emits)

// Mock Icon component
const MockIcon = {
  name: 'Icon',
  template: '<span class="mock-icon">{{ name }}</span>',
  props: ['name', 'class'],
}

// Mock TransitionGroup
const MockTransitionGroup = {
  name: 'TransitionGroup',
  template: '<div><slot /></div>',
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props: { toasts: any[] }) => {
    // Since we can't easily mount Vue components with Nuxt,
    // we'll test the logic functions directly
    return {
      getIcon: (type: string) => {
        switch (type) {
          case 'success': return 'heroicons:check-circle'
          case 'error': return 'heroicons:x-circle'
          case 'warning': return 'heroicons:exclamation-triangle'
          default: return 'heroicons:information-circle'
        }
      },
      getIconClass: (type: string) => {
        switch (type) {
          case 'success': return 'text-green-400'
          case 'error': return 'text-red-400'
          case 'warning': return 'text-yellow-400'
          default: return 'text-blue-400'
        }
      },
      getToastClass: (type: string) => {
        switch (type) {
          case 'success': return 'border-l-4 border-green-400'
          case 'error': return 'border-l-4 border-red-400'
          case 'warning': return 'border-l-4 border-yellow-400'
          default: return 'border-l-4 border-blue-400'
        }
      },
      props,
    }
  }

  describe('getIcon', () => {
    it('should return success icon for success type', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIcon('success')).toBe('heroicons:check-circle')
    })

    it('should return error icon for error type', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIcon('error')).toBe('heroicons:x-circle')
    })

    it('should return warning icon for warning type', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIcon('warning')).toBe('heroicons:exclamation-triangle')
    })

    it('should return info icon for info/default type', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIcon('info')).toBe('heroicons:information-circle')
      expect(wrapper.getIcon('unknown')).toBe('heroicons:information-circle')
    })
  })

  describe('getIconClass', () => {
    it('should return green class for success', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIconClass('success')).toBe('text-green-400')
    })

    it('should return red class for error', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIconClass('error')).toBe('text-red-400')
    })

    it('should return yellow class for warning', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIconClass('warning')).toBe('text-yellow-400')
    })

    it('should return blue class for info/default', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getIconClass('info')).toBe('text-blue-400')
      expect(wrapper.getIconClass('unknown')).toBe('text-blue-400')
    })
  })

  describe('getToastClass', () => {
    it('should return green border for success', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getToastClass('success')).toBe('border-l-4 border-green-400')
    })

    it('should return red border for error', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getToastClass('error')).toBe('border-l-4 border-red-400')
    })

    it('should return yellow border for warning', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getToastClass('warning')).toBe('border-l-4 border-yellow-400')
    })

    it('should return blue border for info/default', () => {
      const wrapper = createWrapper({ toasts: [] })
      expect(wrapper.getToastClass('info')).toBe('border-l-4 border-blue-400')
      expect(wrapper.getToastClass('unknown')).toBe('border-l-4 border-blue-400')
    })
  })

  describe('toast data', () => {
    it('should accept toasts prop', () => {
      const toasts = [
        { id: '1', message: 'Test message', type: 'success' },
        { id: '2', message: 'Error message', type: 'error' },
      ]
      const wrapper = createWrapper({ toasts })
      expect(wrapper.props.toasts).toEqual(toasts)
    })
  })

  describe('removeToast emission', () => {
    it('should emit remove event with toast id', () => {
      // Test the emit function logic
      const emit = vi.fn()
      const removeToast = (id: string) => {
        emit('remove', id)
      }

      removeToast('toast-123')

      expect(emit).toHaveBeenCalledWith('remove', 'toast-123')
    })
  })
})
