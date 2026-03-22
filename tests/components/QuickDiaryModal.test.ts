import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockToast } from '../vi-setup'
import QuickDiaryModal from '~/components/QuickDiaryModal.vue'

const fetchMock = vi.fn()

function mountModal() {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => key,
    locale: ref('en'),
  }))
  vi.stubGlobal('useTimezone', () => ({
    getTodayDateString: () => '2026-03-22',
  }))
  vi.stubGlobal('$fetch', fetchMock)

  return mount(QuickDiaryModal, {
    props: {
      show: true,
    },
    global: {
      stubs: {
        Teleport: {
          template: '<div><slot /></div>',
        },
        Transition: {
          template: '<div><slot /></div>',
        },
        Icon: {
          template: '<span />',
          props: ['name', 'class'],
        },
      },
    },
  })
}

async function clickByText(wrapper: ReturnType<typeof mount>, text: string) {
  const target = wrapper.findAll('button').find(button => button.text().includes(text))
  if (!target) {
    throw new Error(`Button not found: ${text}`)
  }
  await target.trigger('click')
}

describe('QuickDiaryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockResolvedValue({ id: '42' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('submits trading template content through the shared diary API with append mode', async () => {
    const wrapper = mountModal()

    await clickByText(wrapper, 'quickDiary.templates.trading')

    await wrapper.findAll('input[placeholder="quickDiary.trading.symbolsPlaceholder"]')[0].setValue('tsla, nvda')
    await wrapper.findAll('textarea[placeholder="quickDiary.trading.notePlaceholder"]')[0].setValue('Watch setup')
    await clickByText(wrapper, 'quickDiary.createDiary')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        appendToToday: true,
        title: expect.stringContaining('TSLA, NVDA'),
        content: expect.stringContaining('Watch setup'),
      }),
    }))
    expect(wrapper.emitted('created')).toEqual([['42']])
    expect(mockToast.success).toHaveBeenCalledWith('quickDiary.success')
  })

  it('uses the observation topic as the generated diary title', async () => {
    const wrapper = mountModal()

    await clickByText(wrapper, 'quickDiary.templates.observation')

    await wrapper.findAll('input[placeholder="quickDiary.observation.topicPlaceholder"]')[0].setValue('Semiconductor breadth')
    await wrapper.findAll('textarea[placeholder="quickDiary.observation.contentPlaceholder"]')[0].setValue('Breadth improved into the close.')
    await clickByText(wrapper, 'quickDiary.createDiary')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      body: expect.objectContaining({
        appendToToday: true,
        title: 'Semiconductor breadth',
        content: expect.stringContaining('Breadth improved into the close.'),
      }),
    }))
  })
})
