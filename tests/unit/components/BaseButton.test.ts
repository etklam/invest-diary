import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '~/components/BaseButton.vue'

describe('BaseButton', () => {
  // 1. Renders slot content
  it('renders slot content as button text', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toBe('Click me')
  })

  // 2. Applies primary variant classes by default
  it('applies primary variant classes by default', () => {
    const wrapper = mount(BaseButton)
    const classes = wrapper.classes()
    expect(classes).toContain('border-dt-primary-solid')
    expect(classes).toContain('bg-dt-primary-solid')
    expect(classes).toContain('text-white')
  })

  // 3. Applies secondary variant classes
  it('applies secondary variant classes when variant="secondary"', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'secondary' },
    })
    const classes = wrapper.classes()
    expect(classes).toContain('border-dt-border')
    expect(classes).toContain('bg-dt-surface')
    expect(classes).toContain('text-dt-text')
  })

  // 4. Applies ghost variant classes
  it('applies ghost variant classes when variant="ghost"', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'ghost' },
    })
    const classes = wrapper.classes()
    expect(classes).toContain('border-transparent')
    expect(classes).toContain('bg-transparent')
    expect(classes).toContain('text-dt-text-muted')
  })

  // 5. Applies danger variant classes
  it('applies danger variant classes when variant="danger"', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'danger' },
    })
    const classes = wrapper.classes()
    expect(classes).toContain('border-dt-danger')
    expect(classes).toContain('bg-dt-danger')
    expect(classes).toContain('text-white')
  })

  // 6. Sets type attribute to "button" by default
  it('sets type="button" by default', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.attributes('type')).toBe('button')
  })

  // 7. Sets type="submit" when prop provided
  it('sets type="submit" when prop provided', () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'submit' },
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  // 8. Emits click event when clicked
  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Click' },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  // 9. Has min-h-11 for touch target (44px)
  it('has min-h-11 class for 44px touch target', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.classes()).toContain('min-h-11')
  })

  it('renders navigation as one link instead of a nested link and button', () => {
    const wrapper = mount(BaseButton, {
      props: { to: '/timeline' },
      slots: { default: 'Timeline' },
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/timeline')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('removes disabled navigation from the tab order', () => {
    const wrapper = mount(BaseButton, {
      props: { to: '/timeline', disabled: true },
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })
})
