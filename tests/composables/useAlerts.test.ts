import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mockRunWithAuthRecovery = vi.hoisted(() => vi.fn())

vi.mock('~/composables/useAuthRecovery', () => ({
  useAuthRecovery: () => ({ runWithAuthRecovery: mockRunWithAuthRecovery }),
}))

import { useAlerts } from '~/composables/useAlerts'

const makeAlert = (id: string) => ({
  id,
  message: `Alert ${id}`,
  triggerAt: new Date(Date.now() - 1000).toISOString(),
  isDismissed: false,
})

describe('useAlerts dismiss flow', () => {
  let websocket: {
    isConnected: ReturnType<typeof ref<boolean>>
    subscribeAlert: ReturnType<typeof vi.fn>
    dismissAlert: ReturnType<typeof vi.fn>
  }
  let mockFetch: ReturnType<typeof vi.fn>
  let toast: { error: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    websocket = {
      isConnected: ref(true),
      subscribeAlert: vi.fn(() => () => {}),
      dismissAlert: vi.fn(),
    }
    mockFetch = vi.fn()
    toast = { error: vi.fn() }

    mockRunWithAuthRecovery.mockImplementation((operation: () => Promise<unknown>) => operation())
    vi.stubGlobal('useNuxtApp', () => ({ $websocket: websocket }))
    vi.stubGlobal('useAuth', () => ({ isAuthenticated: ref(true) }))
    vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
    vi.stubGlobal('useToast', () => toast)
    vi.stubGlobal('$fetch', mockFetch)
  })

  it('advances only after WebSocket persistence succeeds', async () => {
    websocket.dismissAlert.mockResolvedValue(true)
    const alerts = useAlerts()
    alerts.enqueueAlerts([makeAlert('1'), makeAlert('2')])

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)

    expect(websocket.dismissAlert).toHaveBeenCalledWith('1')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(alerts.currentAlert.value?.id).toBe('2')
    expect(alerts.showAlert.value).toBe(true)
  })

  it('falls back to HTTP when WebSocket fails, then advances after HTTP succeeds', async () => {
    websocket.dismissAlert.mockResolvedValue(false)
    mockFetch.mockResolvedValue({ id: '1', isDismissed: true })
    const alerts = useAlerts()
    alerts.enqueueAlerts([makeAlert('1'), makeAlert('2')])

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/alerts/1/dismiss', { method: 'PUT' })
    expect(alerts.currentAlert.value?.id).toBe('2')
  })

  it('keeps the alert visible after both transports fail and permits retry without duplicates', async () => {
    websocket.dismissAlert.mockResolvedValue(false)
    mockFetch.mockRejectedValue(new Error('HTTP unavailable'))
    const alerts = useAlerts()
    const alert = makeAlert('1')
    alerts.enqueueAlerts([alert])
    alerts.enqueueAlerts([alert])

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(false)

    expect(alerts.currentAlert.value?.id).toBe('1')
    expect(alerts.showAlert.value).toBe(true)
    expect(alerts.hasNextAlert.value).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('alert.dismissFailed')

    // Removing the processed marker must not allow the same visible alert to
    // be enqueued a second time while it is waiting for retry.
    alerts.enqueueAlerts([alert])
    expect(alerts.hasNextAlert.value).toBe(false)

    websocket.dismissAlert.mockResolvedValue(true)
    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)
    expect(alerts.currentAlert.value).toBeNull()
  })
})
