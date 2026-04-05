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
const publicRoutes = new Set(['/auth/login', '/auth/register'])

const isAuthConnectError = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('authentication') || normalized.includes('invalid token')
}

const isPublicRoute = (path: string, requiresAuth: unknown) => {
  if (requiresAuth === false) return true
  return publicRoutes.has(path) || path.startsWith('/articles')
}

// ===== Core Connect / Disconnect =====
const connect = async () => {
  if (socket?.connected || isConnecting) return

  isConnecting = true
  connectionStatus.value = 'connecting'
  refreshTried = false

  socket = io(window.location.origin, {
    path: '/socket.io/',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 20000
  })

  socket.on('connect', () => {
    isConnecting = false
    isConnected.value = true
    connectionStatus.value = 'connected'
    lastError.value = null
  })

  socket.on('disconnect', () => {
    isConnected.value = false
    connectionStatus.value = 'disconnected'
  })

  socket.on('connect_error', async (err) => {
    lastError.value = err.message

    if (!refreshTried && isAuthConnectError(err.message)) {
      refreshTried = true
      try {
        const { refreshAccessToken } = useAuth()
        const ok = await refreshAccessToken()

        // access-token is httpOnly; reconnect after refresh to resend cookies.
        if (ok && socket) {
          socket.connect()
          return
        }
      } catch (e) {
        console.error('[WS] Token refresh threw exception', e)
      }
    }

    connectionStatus.value = 'error'
    disconnect()
  })
}

const disconnect = () => {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
  isConnected.value = false
  isConnecting = false
  connectionStatus.value = 'disconnected'
  lastError.value = null
}

// ===== Public Alert API =====
const subscribeAlert = (cb: (alert: AlertPayload) => void) => {
  socket?.on('alert:triggered', cb)
  return () => socket?.off('alert:triggered', cb)
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
