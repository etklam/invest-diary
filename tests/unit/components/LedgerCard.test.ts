import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LedgerCard from '~/components/LedgerCard.vue'

/**
 * LedgerCard is the design-system primary panel primitive.
 *
 * Per DESIGN.md (see lines ~121, ~128, ~152 in this repo) LedgerCard is the
 * canonical surface for content panels: it MUST use solid `dt-*` border +
 * `bg-dt-surface` background, and MUST NOT use glassmorphism, gradients, or
 * glow effects. The dt-* class assertions in this file therefore exist to
 * guard the design-system contract — they are NOT brittle source-string
 * checks, they assert the public visual API that downstream pages depend on.
 */
describe('LedgerCard', () => {
  describe('slot rendering contract', () => {
    it('renders default slot content', () => {
      const wrapper = mount(LedgerCard, {
        slots: {
          default: '<p class="slot-content">Hello Ledger</p>',
        },
      })

      expect(wrapper.find('.slot-content').exists()).toBe(true)
      expect(wrapper.text()).toContain('Hello Ledger')
    })
  })

  describe('header rendering contract', () => {
    it('renders title when provided', () => {
      const wrapper = mount(LedgerCard, {
        props: { title: 'Test Title' },
      })

      const h2 = wrapper.find('h2')
      expect(h2.exists()).toBe(true)
      expect(h2.text()).toBe('Test Title')
    })

    it('renders description when provided', () => {
      const wrapper = mount(LedgerCard, {
        props: { description: 'Test description text' },
      })

      const desc = wrapper.find('p')
      expect(desc.exists()).toBe(true)
      expect(desc.text()).toBe('Test description text')
    })

    it('renders both title and description in header when both provided', () => {
      const wrapper = mount(LedgerCard, {
        props: {
          title: 'Combined Title',
          description: 'Combined description',
        },
      })

      expect(wrapper.find('header').exists()).toBe(true)
      expect(wrapper.find('h2').text()).toBe('Combined Title')
      expect(wrapper.find('p').text()).toBe('Combined description')
    })

    it('renders header when only title is provided', () => {
      const wrapper = mount(LedgerCard, {
        props: { title: 'Only Title' },
      })

      expect(wrapper.find('header').exists()).toBe(true)
      expect(wrapper.find('h2').text()).toBe('Only Title')
      // description p should NOT exist
      const paragraphs = wrapper.findAll('p')
      expect(paragraphs.length).toBe(0)
    })

    it('renders header when only description is provided', () => {
      const wrapper = mount(LedgerCard, {
        props: { description: 'Only description' },
      })

      expect(wrapper.find('header').exists()).toBe(true)
      expect(wrapper.find('h2').exists()).toBe(false)
      expect(wrapper.find('p').text()).toBe('Only description')
    })

    it('does NOT render header section when neither title nor description provided', () => {
      const wrapper = mount(LedgerCard, {
        slots: {
          default: '<p>Just content</p>',
        },
      })

      expect(wrapper.find('header').exists()).toBe(false)
      expect(wrapper.find('h2').exists()).toBe(false)
    })
  })

  describe('design-system token contract (dt-*)', () => {
    it('applies bg-dt-surface and border-dt-border on the root section', () => {
      const wrapper = mount(LedgerCard, {
        props: { title: 'Token Check' },
      })

      const section = wrapper.find('section')
      // DESIGN.md: LedgerCard is the solid surface panel primitive.
      // These classes are part of its public design-system API.
      expect(section.classes()).toContain('bg-dt-surface')
      expect(section.classes()).toContain('border-dt-border')
    })

    it('uses text-dt-text on the title and text-dt-text-muted on the description', () => {
      const wrapper = mount(LedgerCard, {
        props: { title: 'T', description: 'D' },
      })

      expect(wrapper.find('h2').classes()).toContain('text-dt-text')

      const desc = wrapper.find('p')
      expect(desc.classes()).toContain('text-dt-text-muted')
    })
  })
})
