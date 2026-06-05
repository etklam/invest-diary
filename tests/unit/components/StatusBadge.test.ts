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
    expect(span.classes()).toContain('bg-dt-bg')
    expect(span.classes()).toContain('text-dt-text-muted')
  })

  it('applies success tone classes when tone="success"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'success' },
      slots: { default: 'OK' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-green-500/30')
    expect(span.classes()).toContain('bg-green-500/10')
    expect(span.classes()).toContain('text-green-600')
  })

  it('applies danger tone classes when tone="danger"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'danger' },
      slots: { default: 'Error' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-red-500/30')
    expect(span.classes()).toContain('bg-red-500/10')
    expect(span.classes()).toContain('text-red-600')
  })

  it('applies warning tone classes when tone="warning"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'warning' },
      slots: { default: 'Caution' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-yellow-500/30')
    expect(span.classes()).toContain('bg-yellow-500/10')
    expect(span.classes()).toContain('text-yellow-700')
  })

  it('applies accent tone classes when tone="accent"', () => {
    const wrapper = mount(StatusBadge, {
      props: { tone: 'accent' },
      slots: { default: 'Featured' },
    })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('border-amber-500/30')
    expect(span.classes()).toContain('bg-amber-500/10')
    expect(span.classes()).toContain('text-amber-700')
  })
})
