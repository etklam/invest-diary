import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from '~/components/Toast.vue'
import type { ToastType } from '~/composables/useToast'

const mountToasts = (toasts: Array<{ id: string; message: string; type: ToastType }>) =>
  mount(Toast, {
    props: { toasts },
    global: {
      stubs: {
        // Render TransitionGroup children synchronously so we can query the DOM.
        TransitionGroup: { template: '<div><slot /></div>' },
        Icon: {
          // Surface name/style as real DOM attributes so tests can assert them.
          template:
            '<span data-testid="icon" :data-name="name" :data-style="style" />',
          props: ['name', 'class', 'style'],
        },
      },
      config: {
        globalProperties: {
          $t: (key: string) => key,
        },
      },
    },
  })

describe('Toast Component', () => {
  describe('rendered message text', () => {
    it('renders the toast message text in the DOM', () => {
      const wrapper = mountToasts([
        { id: 't1', message: 'Saved successfully', type: 'info' },
      ])

      expect(wrapper.text()).toContain('Saved successfully')
    })

    it('renders multiple toasts at once', () => {
      const wrapper = mountToasts([
        { id: 't1', message: 'First toast', type: 'info' },
        { id: 't2', message: 'Second toast', type: 'success' },
      ])

      expect(wrapper.text()).toContain('First toast')
      expect(wrapper.text()).toContain('Second toast')
    })

    it('renders no toast messages when list is empty', () => {
      const wrapper = mountToasts([])
      // Only the aria-live container remains; no toast message paragraphs.
      const messageParagraphs = wrapper.findAll('p')
      expect(messageParagraphs.length).toBe(0)
    })
  })

  describe('visual states for each toast type', () => {
    const cases: Array<{ type: ToastType; expectedColor: string; expectedIcon: string; expectedRole: string }> = [
      {
        type: 'success',
        expectedColor: 'var(--color-success)',
        expectedIcon: 'heroicons:check-circle-solid',
        expectedRole: 'status',
      },
      {
        type: 'error',
        expectedColor: 'var(--color-danger)',
        expectedIcon: 'heroicons:x-circle-solid',
        expectedRole: 'alert',
      },
      {
        type: 'warning',
        expectedColor: 'var(--color-warning)',
        expectedIcon: 'heroicons:exclamation-triangle-solid',
        expectedRole: 'alert',
      },
      {
        type: 'info',
        expectedColor: 'var(--color-info)',
        expectedIcon: 'heroicons:information-circle-solid',
        expectedRole: 'status',
      },
    ]

    for (const { type, expectedColor, expectedIcon, expectedRole } of cases) {
      it(`applies ${expectedColor} and ${expectedIcon} for type=${type}`, () => {
        const wrapper = mountToasts([
          { id: `t-${type}`, message: `msg-${type}`, type },
        ])

        const icon = wrapper.find('[data-testid="icon"]')
        expect(icon.attributes('data-name')).toBe(expectedIcon)
        expect(icon.attributes('data-style')).toContain(expectedColor)

        // a11y contract: per-toast wrapper carries role="alert" for
        // warning/error, else role="status". The outermost region also
        // has role="status"; we want the inner per-toast node, identified
        // by being a direct ancestor of the toast message paragraph and
        // NOT having the aria-live attribute (only the outer region has it).
        const allRoleNodes = wrapper.findAll('[role]')
        const perToastWrapper = allRoleNodes.find((node) => {
          const attrs = node.attributes()
          return attrs['aria-live'] === undefined && attrs['role']
        })
        expect(perToastWrapper, `expected a per-toast wrapper with role=${expectedRole}`).toBeTruthy()
        expect(perToastWrapper!.attributes('role')).toBe(expectedRole)
      })
    }
  })

  describe('dismiss behavior', () => {
    it('emits a "remove" event with the toast id when close button is clicked', async () => {
      const wrapper = mountToasts([
        { id: 't-dismiss', message: 'dismiss me', type: 'info' },
      ])

      // Find the close button via its aria-label (real user-facing affordance).
      const closeBtn = wrapper.find('button[aria-label="common.close"]')
      expect(closeBtn.exists()).toBe(true)

      await closeBtn.trigger('click')

      const removeEvents = wrapper.emitted('remove')
      expect(removeEvents).toBeTruthy()
      expect(removeEvents![0]).toEqual(['t-dismiss'])
    })

    it('removes only the targeted toast when multiple are present', async () => {
      const wrapper = mountToasts([
        { id: 't-keep', message: 'keep me', type: 'success' },
        { id: 't-remove', message: 'remove me', type: 'error' },
      ])

      const closeButtons = wrapper.findAll('button[aria-label="common.close"]')
      expect(closeButtons.length).toBe(2)

      await closeButtons[1].trigger('click')

      const removeEvents = wrapper.emitted('remove')
      expect(removeEvents).toBeTruthy()
      expect(removeEvents![0]).toEqual(['t-remove'])
    })
  })
})
