import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetHeader, mockReadBody } from '../vi-setup'

const mockBot = vi.hoisted(() => ({
  init: vi.fn(),
  handleUpdate: vi.fn(),
}))
const mockCreateBot = vi.hoisted(() => vi.fn(() => mockBot))
const mockFindTelegramAccount = vi.hoisted(() => vi.fn())
const mockCheckAndMarkUpdate = vi.hoisted(() => vi.fn())
const mockReleaseUpdate = vi.hoisted(() => vi.fn())

vi.mock('~/lib/telegram/bot', () => ({
  createBot: mockCreateBot,
}))

vi.mock('~/server/utils/telegram-db', () => ({
  findTelegramAccount: mockFindTelegramAccount,
  checkAndMarkUpdate: mockCheckAndMarkUpdate,
  releaseUpdate: mockReleaseUpdate,
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: () => ({
        debug: vi.fn(),
        error: vi.fn(),
      }),
    },
  },
}))

import handler from '~/server/api/telegram/webhook.post'

function makeUpdate(text: string) {
  return {
    update_id: 101,
    message: {
      from: { id: 123456 },
      chat: { id: 123456, type: 'private' },
      text,
    },
  }
}

describe('POST /api/telegram/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.useRuntimeConfig = vi.fn(() => ({
      telegramWebhookSecret: 'secret',
      telegramBotToken: 'token',
    }))
    mockGetHeader.mockReturnValue('secret')
    mockBot.init.mockResolvedValue(undefined)
    mockBot.handleUpdate.mockResolvedValue(undefined)
    mockFindTelegramAccount.mockResolvedValue({ userId: BigInt(1) })
    mockCheckAndMarkUpdate.mockResolvedValue(true)
    mockReleaseUpdate.mockResolvedValue(undefined)
  })

  it('marks a linked utility command as command instead of diary_write', async () => {
    const update = makeUpdate('/help')
    mockReadBody.mockResolvedValue(update)

    await expect(handler({ context: { requestId: 'req-1' } } as any)).resolves.toEqual({ ok: true })

    expect(mockCheckAndMarkUpdate).toHaveBeenCalledWith(101, 'command')
    expect(mockBot.handleUpdate).toHaveBeenCalledWith(update)
  })

  it('releases an acquired update when bot processing fails so Telegram can retry', async () => {
    mockReadBody.mockResolvedValue(makeUpdate('/note memo'))
    mockBot.handleUpdate.mockRejectedValue(new Error('diary DB failed'))

    await expect(handler({ context: { requestId: 'req-1' } } as any)).rejects.toMatchObject({
      statusCode: 500,
    })

    expect(mockCheckAndMarkUpdate).toHaveBeenCalledWith(101, 'diary_write')
    expect(mockReleaseUpdate).toHaveBeenCalledWith(101)
  })

  it('does not acquire an unlinked diary write so it can retry after linking', async () => {
    const update = makeUpdate('/note memo')
    mockReadBody.mockResolvedValue(update)
    mockFindTelegramAccount.mockResolvedValue(null)

    await expect(handler({ context: { requestId: 'req-1' } } as any)).resolves.toEqual({ ok: true })

    expect(mockCheckAndMarkUpdate).not.toHaveBeenCalled()
    expect(mockBot.handleUpdate).toHaveBeenCalledWith(update)
  })

  it('skips bot processing for an already-processed linked update', async () => {
    mockReadBody.mockResolvedValue(makeUpdate('/note memo'))
    mockCheckAndMarkUpdate.mockResolvedValue(false)

    await expect(handler({ context: { requestId: 'req-1' } } as any)).resolves.toEqual({ ok: true })

    expect(mockBot.handleUpdate).not.toHaveBeenCalled()
  })
})
