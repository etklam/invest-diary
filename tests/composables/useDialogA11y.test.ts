import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialogA11y } from '~/composables/useDialogA11y'

function createHost(options: {
  open?: ReturnType<typeof ref<boolean>>
  disabled?: ReturnType<typeof ref<boolean>>
  onEscape?: () => void
  lockScroll?: boolean
  trapFocus?: boolean
} = {}) {
  const open = options.open ?? ref(true)
  const disabled = options.disabled ?? ref(false)

  return defineComponent({
    setup() {
      const dialogPanel = ref<HTMLElement | null>(null)
      const { handleKeydown } = useDialogA11y(dialogPanel, {
        open,
        disabled,
        onEscape: options.onEscape,
        lockScroll: options.lockScroll,
        trapFocus: options.trapFocus,
      })

      return { dialogPanel, open, handleKeydown }
    },
    template: `
      <button id="opener" type="button">Open</button>
      <div v-if="open" ref="dialogPanel" tabindex="-1" @keydown="handleKeydown">
        <button id="first" type="button">First</button>
        <input id="middle" type="text">
        <a id="last" href="/last">Last</a>
      </div>
    `,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

describe('useDialogA11y', () => {
  it('cycles focus through the complete focusable selector', async () => {
    const wrapper = mount(createHost(), { attachTo: document.body })
    await nextTick()

    const first = wrapper.get('#first').element as HTMLElement
    const last = wrapper.get('#last').element as HTMLElement
    first.focus()
    await wrapper.get('[tabindex="-1"]').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    last.focus()
    await wrapper.get('[tabindex="-1"]').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    await wrapper.get('[tabindex="-1"]').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
    wrapper.unmount()
  })

  it('restores the original overflow when a dialog unmounts while open', async () => {
    document.documentElement.style.overflow = 'auto'
    const wrapper = mount(createHost(), { attachTo: document.body })
    await nextTick()

    expect(document.documentElement.style.overflow).toBe('hidden')
    wrapper.unmount()

    expect(document.documentElement.style.overflow).toBe('auto')
  })

  it('restores focus after close and guards Escape while disabled', async () => {
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.id = 'external-opener'
    document.body.append(opener)
    opener.focus()

    const open = ref(true)
    const disabled = ref(true)
    const onEscape = vi.fn()
    const wrapper = mount(createHost({ open, disabled, onEscape }), { attachTo: document.body })
    await nextTick()

    await wrapper.get('[tabindex="-1"]').trigger('keydown', { key: 'Escape' })
    expect(onEscape).not.toHaveBeenCalled()

    disabled.value = false
    await wrapper.get('[tabindex="-1"]').trigger('keydown', { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledOnce()

    open.value = false
    await nextTick()
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })
})
