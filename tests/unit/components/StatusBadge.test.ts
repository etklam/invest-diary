import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import StatusBadge from '~/components/StatusBadge.vue'

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('renders slot content (text)', () => {
    const wrapper = mount(StatusBadge, {
      slots: { default: 'Active' },
    })
    expect(wrapper.text()).toBe('Active')
  })

  it('applies neutral tone classes by default', () => {
    const wrapper = mount(StatusBadge, {
      slots: { default: 'Idle' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-dt-border')
    expect(span.classes()).toContain('bg-dt-surface-strong')
    expect(span.classes()).toContain('text-dt-text-muted')
  })

  it('applies success tone classes when tone="success"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'success' },
      slots: { default: 'OK' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-dt-success/30')
    expect(span.classes()).toContain('bg-dt-success/10')
    expect(span.classes()).toContain('text-dt-success-strong')
  })

  it('applies danger tone classes when tone="danger"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'danger' },
      slots: { default: 'Error' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-dt-danger/30')
    expect(span.classes()).toContain('bg-dt-danger/10')
    expect(span.classes()).toContain('text-dt-danger-strong')
  })

  it('applies warning tone classes when tone="warning"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'warning' },
      slots: { default: 'Caution' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-dt-warning/30')
    expect(span.classes()).toContain('bg-dt-warning/10')
    expect(span.classes()).toContain('text-dt-warning-strong')
  })

  it('applies accent tone classes when tone="accent"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'accent' },
      slots: { default: 'Featured' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-dt-success/30')
    expect(span.classes()).toContain('bg-dt-success/10')
    expect(span.classes()).toContain('text-dt-success-strong')
  })
})
