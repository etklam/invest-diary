import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'

const localeRef = ref('en')

const messages: Record<string, string> = {
  'quickDiary.templateAssistant.title': 'Template Assistant',
  'quickDiary.templateAssistant.description': 'Template fields update the suggested title and content.',
  'quickDiary.templateAssistant.applyChanges': 'Apply template changes',
  'quickDiary.templateAssistant.regenerate': 'Regenerate template content',
  'quickDiary.reflection.marketCondition': 'Market condition',
  'quickDiary.reflection.selectCondition': 'Select...',
  'quickDiary.observation.type': 'Observation type',
}

function mountAssistant(props: Record<string, unknown>) {
  vi.stubGlobal('useI18n', () => ({
    locale: localeRef,
    t: (key: string) => messages[key] || key,
  }))

  return mount(QuickNoteTemplateAssistant, {
    props: {
      templateKind: 'reflection',
      templateData: {},
      hasTemplateChangesPending: false,
      ...props,
    },
  })
}

describe('QuickNoteTemplateAssistant', () => {
  beforeEach(() => {
    localeRef.value = 'en'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders locale-aware reflection copy and emits semantic market condition values', async () => {
    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: { marketCondition: '大漲' },
      hasTemplateChangesPending: true,
    })

    expect(wrapper.text()).toContain('Template Assistant')
    expect(wrapper.text()).toContain('Apply template changes')
    expect(wrapper.get('select').element.value).toBe('strongUp')
    expect(wrapper.html()).toContain('Price Change')
    expect(wrapper.html()).toContain('Strong rally')

    await wrapper.get('select').setValue('gapUpAndGo')

    expect(wrapper.emitted('update:templateData')).toEqual([
      [{ marketCondition: 'gapUpAndGo' }],
    ])
  })

  it('renders locale-aware observation labels and emits semantic observation type values', async () => {
    const wrapper = mountAssistant({
      templateKind: 'observation',
      templateData: { observationType: '板塊熱點' },
    })

    expect(wrapper.text()).toContain('Observation type')
    expect(wrapper.text()).toContain('Sector momentum')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:templateData')).toEqual([
      [{ observationType: 'sectorMomentum' }],
    ])
  })
})
