import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import SecFilingList from '~/components/sec-filings/SecFilingList.vue'
import ResearchCaptureModal from '~/components/ResearchCaptureModal.vue'
import type { ResearchCaptureController } from '~/composables/useResearchCapture'

const messages: Record<string, string> = {
  'researchCapture.captureInsight': 'Capture insight',
  'researchCapture.sources.secFiling': 'SEC Filing',
  'researchCapture.context.secFilingObservation': 'Record your observation from {title}.',
  'researchCapture.title': 'Capture Insight',
  'researchCapture.source': 'Source',
  'researchCapture.insight': 'Insight',
  'researchCapture.insightPlaceholder': 'Write an observation',
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
  'researchCapture.saveFailed': 'Could not save evidence.',
  'common.close': 'Close',
}

function translate(key: string, params?: Record<string, unknown>): string {
  return (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}

function createController(context: ResearchCaptureController['context']['value']): ResearchCaptureController {
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
  }
}

const company = {
  cik: '0000789019',
  name: 'Microsoft Corporation',
  tickers: ['MSFT'],
  exchanges: ['Nasdaq'],
}

const filing = {
  cik: company.cik,
  accession: '0000789019-26-000010',
  filingDate: '2026-08-05',
  reportDate: '2026-06-30',
  acceptanceDateTime: null,
  form: '10-Q',
  isAmendment: false,
  primaryDocument: 'msft-20260630.htm',
  primaryDocumentDescription: null,
  fileNumber: null,
  filmNumber: null,
  items: null,
  size: 100,
}

beforeEach(() => {
  vi.stubGlobal('useI18n', () => ({ t: translate }))
})

describe('research capture tool integrations', () => {
  it('opens SEC filing capture with provenance and an editable ticker prefill', async () => {
    const capture = createController(null)
    const wrapper = mount(SecFilingList, {
      props: { filings: [filing], company, selected: [], capture },
      global: {
        stubs: {
          LedgerCard: { template: '<div><slot /></div>' },
          StatusBadge: { template: '<span><slot /></span>' },
        },
      },
    })

    await wrapper.find('button').trigger('click')
    const context = (capture.open as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]

    expect(context).toMatchObject({
      sourceLabel: 'SEC Filing · MSFT 10-Q',
      suggestedInsight: 'Record your observation from MSFT 10-Q.',
      symbolPrefill: 'MSFT',
      metadata: {
        sourceType: 'SEC_FILING',
        sourceTitle: 'MSFT 10-Q',
        sourceUrl: 'https://www.sec.gov/Archives/edgar/data/789019/000078901926000010/0000789019-26-000010-index.html',
        occurredAt: '2026-08-05',
      },
    })
    expect(context.suggestedInsight).not.toContain('msft-20260630.htm')
  })

  it('does not invent a company prefill when SEC company tickers are empty', async () => {
    const capture = createController(null)
    const wrapper = mount(SecFilingList, {
      props: { filings: [filing], company: { ...company, tickers: [] }, selected: [], capture },
      global: {
        stubs: {
          LedgerCard: { template: '<div><slot /></div>' },
          StatusBadge: { template: '<span><slot /></span>' },
        },
      },
    })

    await wrapper.find('button').trigger('click')
    const context = (capture.open as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(context).not.toHaveProperty('symbolPrefill')
  })

  it('offers only Quick Diary for seasonality evidence', async () => {
    const controller = createController({
      sourceLabel: 'Seasonality',
      suggestedInsight: 'September averaged -0.8% in the selected window.',
      metadata: {
        sourceType: 'SEASONALITY',
        sourceTitle: 'Seasonality',
        occurredAt: '2026-08-15T00:00:00.000Z',
        metadataJson: JSON.stringify({ window: '1950+', metric: 'Avg Return' }),
      },
      allowCompanyEvidence: false,
    })
    const wrapper = mount(ResearchCaptureModal, {
      props: { capture: controller },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
          BaseButton: { props: ['type', 'disabled'], template: '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
          LedgerCard: { template: '<div><slot /></div>' },
          StatusBadge: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Company Evidence')
    expect(wrapper.find('#research-capture-company').exists()).toBe(false)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(controller.continueToQuickDiary).toHaveBeenCalledWith(
      'September averaged -0.8% in the selected window.',
      '',
    )
  })

  it('keeps the four Market Rotation entry points and context contract wired', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/tools/market-rotation.vue'), 'utf8')

    expect(source.match(/t\('researchCapture\.captureInsight'\)/g)).toHaveLength(4)
    expect(source).toContain('@click="openMarketRotationCapture()"')
    expect(source).toContain('@click="openMarketRotationCapture(topImproving[0] ?? null)"')
    expect(source).toContain('@click="openMarketRotationCapture(bottomWeakening[0] ?? null)"')
    expect(source).toContain('@click="openMarketRotationCapture(selectedRow)"')
    expect(source).toContain('rankDelta2W: row.rankDelta2W')
    expect(source).toContain('twoWeekPerformancePct: row.twoWeekPerformancePct')
    expect(source).toContain('maStatus: row.maStatus')
    expect(source).toContain("...(row.groupType === 'sector' ? {} : { symbolPrefill: row.symbol })")
  })

  it('wires RV pair context and Seasonality no-company context without new fetch paths', () => {
    const relativeValue = readFileSync(resolve(process.cwd(), 'pages/tools/relative-value.vue'), 'utf8')
    const seasonality = readFileSync(resolve(process.cwd(), 'pages/tools/seasonality.vue'), 'utf8')

    expect(relativeValue).toContain("sourceType: 'RELATIVE_VALUE'")
    expect(relativeValue).toContain('primarySymbol: result.primarySymbol')
    expect(relativeValue).toContain('relativeSymbol: result.relativeSymbol')
    expect(relativeValue).toContain('historicalRange: range')
    expect(relativeValue).toContain('sourceTitle,')
    expect(seasonality).toContain("sourceType: 'SEASONALITY'")
    expect(seasonality).toContain('window: windowLabel')
    expect(seasonality).toContain('metric: metricLabel')
    expect(seasonality).toContain('allowCompanyEvidence: false')
    expect(seasonality).toContain('seasonalityObservation')
  })
})
