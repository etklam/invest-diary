import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import ReviewCandidateCard from '~/components/ReviewCandidateCard.vue'

const defaultProps = {
  date: '2025-01-15',
  title: 'TSMC breakout play',
  reviewStatus: 'none' as const,
}

describe('ReviewCandidateCard', () => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders diary title', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: defaultProps,
    })
    expect(wrapper.text()).toContain('TSMC breakout play')
  })

  it('renders date', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: defaultProps,
    })
    expect(wrapper.text()).toContain('2025-01-15')
  })

  it('renders thesis when provided', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: {
        ...defaultProps,
        thesis: 'Strong semiconductor demand in AI era',
      },
    })
    expect(wrapper.text()).toContain('Thesis')
    expect(wrapper.text()).toContain('Strong semiconductor demand in AI era')
  })

  it('renders risk when provided', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: {
        ...defaultProps,
        risk: 'China geopolitical tension escalation',
      },
    })
    expect(wrapper.text()).toContain('Risk')
    expect(wrapper.text()).toContain('China geopolitical tension escalation')
  })

  it('shows "pending" status badge when reviewStatus is pending', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: { ...defaultProps, reviewStatus: 'pending' },
    })
    expect(wrapper.text()).toContain('Pending')
  })

  it('shows "reviewed" status badge when reviewStatus is reviewed', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: { ...defaultProps, reviewStatus: 'reviewed' },
    })
    expect(wrapper.text()).toContain('Reviewed')
  })

  it('shows "none" status badge when reviewStatus is none', () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: { ...defaultProps, reviewStatus: 'none' },
    })
    expect(wrapper.text()).toContain('No review')
  })

  it('emits review event when review button is clicked', async () => {
    const wrapper = mount(ReviewCandidateCard, {
      props: defaultProps,
    })
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(wrapper.emitted('review')).toBeTruthy()
    expect(wrapper.emitted('review')!.length).toBe(1)
  })
})
