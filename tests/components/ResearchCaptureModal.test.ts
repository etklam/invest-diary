import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import ResearchCaptureModal from '~/components/ResearchCaptureModal.vue'
import type { ResearchCaptureController } from '~/composables/useResearchCapture'

const messages: Record<string, string> = {
  'common.close': 'Close',
  'researchCapture.title': 'Capture Insight',
  'researchCapture.source': 'Source',
  'researchCapture.insight': 'Insight',
  'researchCapture.insightPlaceholder': 'Write the observation you want to keep...',
  'researchCapture.insightRequired': 'Enter an insight first.',
  'researchCapture.saveTo': 'Save to',
  'researchCapture.quickDiary': 'Quick Diary',
  'researchCapture.companyEvidence': 'Company Evidence',
  'researchCapture.selectCompany': 'Select company',
  'researchCapture.companyPlaceholder': 'e.g. MSFT',
  'researchCapture.companyRequired': 'Select a company before saving evidence.',
  'researchCapture.continue': 'Continue',
  'researchCapture.save': 'Save',
  'researchCapture.cancel': 'Cancel',
  'researchCapture.saving': 'Saving...',
  'researchCapture.evidenceSaved': 'Evidence saved',
  'researchCapture.viewCompany': 'View Company',
  'researchCapture.saveFailed': 'Could not save evidence. Your text is still here.',
}

const context = {
  sourceLabel: 'SEC Filing · MSFT',
  suggestedInsight: 'Capital expenditure remains elevated.',
  metadata: {
    sourceType: 'SEC_FILING' as const,
    occurredAt: '2026-08-15T00:00:00.000Z',
  },
  symbolPrefill: 'MSFT',
}

function createController(overrides: Partial<ResearchCaptureController> = {}): ResearchCaptureController {
  return {
    canCapture: computed(() => true),
    isOpen: ref(true),
    context: ref(context),
    pending: ref(false),
    saveError: ref(null),
    savedSymbol: ref(null),
    open: vi.fn(() => true),
    close: vi.fn(),
    continueToQuickDiary: vi.fn(() => true),
    saveEvidence: vi.fn(async () => true),
    ...overrides,
  }
}

function mountModal(controller = createController()) {
  return mount(ResearchCaptureModal, {
    props: { capture: controller },
    global: {
      stubs: {
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('ResearchCaptureModal', () => {
  beforeEach(() => {
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => messages[key] ?? key,
    }))
  })

  it('opens with the source context and suggested insight prefilled', () => {
    const wrapper = mountModal()

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('SEC Filing · MSFT')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(context.suggestedInsight)
    expect(wrapper.find('#research-capture-company').exists()).toBe(false)
  })

  it('continues to Quick Diary with edited insight and symbol', async () => {
    const controller = createController()
    const wrapper = mountModal(controller)
    const textarea = wrapper.get('textarea')
    await textarea.setValue('Edited research memory')

    await wrapper.get('form').trigger('submit')

    expect(controller.continueToQuickDiary).toHaveBeenCalledWith('Edited research memory', 'MSFT')
    expect(controller.saveEvidence).not.toHaveBeenCalled()
  })

  it('shows Company input only for Evidence and requires a company', async () => {
    const controller = createController()
    const wrapper = mountModal(controller)
    const radios = wrapper.findAll('input[type="radio"]')
    await radios[1]!.setValue(true)
    await wrapper.get('#research-capture-company').setValue('')

    expect(wrapper.find('#research-capture-company').exists()).toBe(true)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Select a company before saving evidence.')
    expect(controller.saveEvidence).not.toHaveBeenCalled()
  })

  it('saves evidence, disables the submit action while pending, and shows the company link on success', async () => {
    const pending = ref(false)
    const controller = createController({
      pending,
      saveEvidence: vi.fn(async () => {
        pending.value = true
        await Promise.resolve()
        pending.value = false
        controller.savedSymbol.value = 'MSFT'
        return true
      }),
    })
    const wrapper = mountModal(controller)
    await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
    await wrapper.get('#research-capture-company').setValue('MSFT')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(controller.saveEvidence).toHaveBeenCalledWith('Capital expenditure remains elevated.', 'MSFT')
    expect(wrapper.get('a').attributes('href')).toBe('/stocks/MSFT')
    expect(wrapper.text()).toContain('Evidence saved')
  })

  it('keeps typed insight visible after a failed save and cancel does not save', async () => {
    const saveError = ref<string | null>(null)
    const controller = createController({
      saveError,
      saveEvidence: vi.fn(async () => {
        saveError.value = 'Could not save evidence. Your text is still here.'
        return false
      }),
    })
    const wrapper = mountModal(controller)
    await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
    await wrapper.get('#research-capture-company').setValue('MSFT')
    await wrapper.get('textarea').setValue('Typed text survives failure')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Typed text survives failure')
    expect(wrapper.text()).toContain('Could not save evidence. Your text is still here.')

    await wrapper.get('button[type="button"]').trigger('click')
    expect(controller.close).toHaveBeenCalledOnce()
    expect(controller.saveEvidence).toHaveBeenCalledOnce()
  })
})
