import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, ConnectionStatus, AlertPayload } from '../types/websocket'

declare module '#app' {
  interface NuxtApp {
    $websocket: {
      connect: () => Promise<void> | void
      disconnect: () => void
      subscribeAlert: (cb: (alert: AlertPayload) => void) => () => void
      dismissAlert: (alertId: string) => Promise<boolean>
      isConnected: Ref<boolean>
      connectionStatus: Ref<ConnectionStatus>
      lastError: Ref<string | null>
    }
  }
}

// ===== Singleton State =====
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
const isConnected = ref(false)
const connectionStatus = ref<ConnectionStatus>('disconnected')
const lastError = ref<string | null>(null)
let isConnecting = false
let refreshTried = false
let isManualDisconnect = false
const publicRoutes = new Set(['/auth/login', '/auth/register'])
const alertSubscribers = new Set<(alert: AlertPayload) => void>()

const isAuthConnectError = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('authentication') || normalized.includes('invalid token')
}

const isPublicRoute = (path: string, requiresAuth: unknown) => {
  if (requiresAuth === false) return true
  return publicRoutes.has(path) || path.startsWith('/articles')
}

const destroySocket = (
  options: {
    clearError?: boolean
    nextStatus?: ConnectionStatus
  } = {}
) => {
  const {
    clearError = true,
    nextStatus = 'disconnected'
  } = options

  isManualDisconnect = true

  if (socket) {
    socket.removeAllListeners()
    socket.io.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  isConnected.value = false
  isConnecting = false
  connectionStatus.value = nextStatus

  if (clearError) {
    lastError.value = null
  }
}

const attachAlertSubscribers = (currentSocket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
  for (const subscriber of alertSubscribers) {
    currentSocket.on('alert:triggered', subscriber)
  }
}

const attachSocketListeners = (currentSocket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
  attachAlertSubscribers(currentSocket)

  currentSocket.on('connect', () => {
    isManualDisconnect = false
    isConnecting = false
    isConnected.value = true
    connectionStatus.value = 'connected'
    lastError.value = null
    refreshTried = false
  })

  currentSocket.on('disconnect', (reason) => {
    isConnected.value = false
    isConnecting = false

    if (!isManualDisconnect && currentSocket.active && reason !== 'io client disconnect') {
      connectionStatus.value = 'reconnecting'
      return
    }

    connectionStatus.value = 'disconnected'
  })

  currentSocket.io.on('reconnect_attempt', () => {
    isConnected.value = false
    isConnecting = false
    connectionStatus.value = 'reconnecting'
  })

  currentSocket.io.on('reconnect_error', (err) => {
    lastError.value = err.message
    connectionStatus.value = 'reconnecting'
  })

  currentSocket.io.on('reconnect_failed', () => {
    isConnecting = false
    connectionStatus.value = 'error'
  })

  currentSocket.on('connect_error', async (err) => {
    lastError.value = err.message
    isConnected.value = false
    isConnecting = false

    if (!refreshTried && isAuthConnectError(err.message)) {
      refreshTried = true
      try {
        const { refreshAccessToken } = useAuth()
        const ok = await refreshAccessToken()

        // access-token is httpOnly; reconnect after refresh to resend cookies.
        if (ok && currentSocket === socket) {
          connectionStatus.value = 'reconnecting'
          currentSocket.connect()
          return
        }
      } catch (e) {
        console.error('[WS] Token refresh threw exception', e)
      }

      destroySocket({ clearError: false, nextStatus: 'error' })
      return
    }

    if (currentSocket.active) {
      connectionStatus.value = 'reconnecting'
      return
    }

    connectionStatus.value = 'error'
  })
}

// ===== Core Connect / Disconnect =====
const connect = async () => {
  if (socket?.connected || isConnecting) return

  if (socket) {
    isManualDisconnect = false

    if (socket.active) {
      connectionStatus.value = 'reconnecting'
      socket.connect()
      return
    }
  }

  isConnecting = true
  isManualDisconnect = false
  connectionStatus.value = 'connecting'
  refreshTried = false

  const currentSocket = io(window.location.origin, {
    path: '/socket.io/',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    autoConnect: false,
    timeout: 20000
  })

  socket = currentSocket
  attachSocketListeners(currentSocket)
  currentSocket.connect()
}

const disconnect = () => {
  destroySocket()
}

// ===== Public Alert API =====
const subscribeAlert = (cb: (alert: AlertPayload) => void) => {
  alertSubscribers.add(cb)
  socket?.on('alert:triggered', cb)
  return () => {
    alertSubscribers.delete(cb)
    socket?.off('alert:triggered', cb)
  }
}

const dismissAlert = (alertId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve(false)

    const handleOk = (data: { alertId: string }) => {
      if (data.alertId === alertId) {
        cleanup()
        resolve(true)
      }
    }

    const handleErr = () => {
      cleanup()
      resolve(false)
    }

    const cleanup = () => {
      socket?.off('alert:dismissed', handleOk)
      socket?.off('alert:error', handleErr)
    }

    socket.on('alert:dismissed', handleOk)
    socket.on('alert:error', handleErr)
    socket.emit('alert:dismiss', alertId)
  })
}

// ===== Plugin =====
export default defineNuxtPlugin(() => {
  const user = useState<any>('auth:user')
  const route = useRoute()
  const syncConnection = () => {
    const shouldConnect = Boolean(user.value)
      && !isPublicRoute(route.path, route.meta?.requiresAuth)

    if (shouldConnect) {
      void connect()
      return
    }

    disconnect()
  }

  watch(
    [user, () => route.path, () => route.meta?.requiresAuth],
    syncConnection,
    { immediate: true }
  )

  const nuxtApp = useNuxtApp()
  nuxtApp.hook('page:finish', syncConnection)

  window.addEventListener('beforeunload', disconnect)

  return {
    provide: {
      websocket: {
        connect,
        disconnect,
        subscribeAlert,
        dismissAlert,
        isConnected: readonly(isConnected),
        connectionStatus: readonly(connectionStatus),
        lastError: readonly(lastError)
      }
    }
  }
})
