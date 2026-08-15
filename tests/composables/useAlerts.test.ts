import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { AlertPayload } from '~/types/alert'

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
  let emitAlert: ((alert: AlertPayload) => void) | undefined

  beforeEach(() => {
    websocket = {
      isConnected: ref(true),
      subscribeAlert: vi.fn((callback: (alert: AlertPayload) => void) => {
        emitAlert = callback
        return () => {}
      }),
      dismissAlert: vi.fn(),
    }
    mockFetch = vi.fn()
    mockFetch.mockResolvedValue([])
    toast = { error: vi.fn() }

    mockRunWithAuthRecovery.mockImplementation((operation: () => Promise<unknown>) => operation())
    vi.stubGlobal('useNuxtApp', () => ({ $websocket: websocket }))
    vi.stubGlobal('useAuth', () => ({ isAuthenticated: ref(true) }))
    vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
    vi.stubGlobal('useToast', () => toast)
    vi.stubGlobal('$fetch', mockFetch)
  })

  const mountAlerts = async () => {
    let instance: ReturnType<typeof useAlerts> | undefined
    const Host = defineComponent({
      setup: () => {
        instance = useAlerts()
        return () => null
      },
    })
    const wrapper = mount(Host)
    await Promise.resolve()
    return { alerts: instance!, wrapper }
  }

  it('advances only after WebSocket persistence succeeds', async () => {
    websocket.dismissAlert.mockResolvedValue(true)
    const { alerts } = await mountAlerts()
    mockFetch.mockClear()
    emitAlert!(makeAlert('1'))
    emitAlert!(makeAlert('2'))

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)

    expect(websocket.dismissAlert).toHaveBeenCalledWith('1')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(alerts.currentAlert.value?.id).toBe('2')
    expect(alerts.showAlert.value).toBe(true)
  })

  it('falls back to HTTP when WebSocket fails, then advances after HTTP succeeds', async () => {
    websocket.dismissAlert.mockResolvedValue(false)
    mockFetch.mockResolvedValue({ id: '1', isDismissed: true })
    const { alerts } = await mountAlerts()
    emitAlert!(makeAlert('1'))
    emitAlert!(makeAlert('2'))

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/alerts/1/dismiss', { method: 'PUT' })
    expect(alerts.currentAlert.value?.id).toBe('2')
  })

  it('keeps the alert visible after both transports fail and permits retry without duplicates', async () => {
    websocket.dismissAlert.mockResolvedValue(false)
    mockFetch.mockRejectedValue(new Error('HTTP unavailable'))
    const { alerts } = await mountAlerts()
    const alert = makeAlert('1')
    emitAlert!(alert)
    emitAlert!(alert)

    await expect(alerts.dismissCurrentAlert()).resolves.toBe(false)

    expect(alerts.currentAlert.value?.id).toBe('1')
    expect(alerts.showAlert.value).toBe(true)
    expect(toast.error).toHaveBeenCalledWith('alert.dismissFailed')

    // Removing the processed marker must not allow the same visible alert to
    // be enqueued a second time while it is waiting for retry.
    emitAlert!(alert)
    expect(alerts.currentAlert.value?.id).toBe('1')

    websocket.dismissAlert.mockResolvedValue(true)
    await expect(alerts.dismissCurrentAlert()).resolves.toBe(true)
    expect(alerts.currentAlert.value).toBeNull()
  })

  it('disposes transport watchers on unmount so a dead layout cannot resurrect polling', async () => {
    vi.useFakeTimers()
    try {
      mockFetch.mockResolvedValue([])
      mockRunWithAuthRecovery.mockImplementation((operation: () => Promise<unknown>) => operation())

      const { wrapper } = await mountAlerts()
      // 讓 onMounted 內 await syncAlertTransport() 的 continuation 執行完畢
      await vi.advanceTimersByTimeAsync(0)

      // Layout 切換卸載元件後，殘留的 watcher 不得再拉起 /api/alerts 輪詢
      wrapper.unmount()
      mockFetch.mockClear()

      websocket.isConnected.value = false
      await vi.advanceTimersByTimeAsync(600_000)

      expect(mockFetch).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
