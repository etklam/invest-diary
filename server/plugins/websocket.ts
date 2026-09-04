import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import type { NitroApp } from 'nitropack'
import type { Server } from 'socket.io'
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../../types/websocket'
import { createSocketServer } from '../websocket/socket-server'

declare module 'nitropack' {
  interface NitroApp {
    socketIo?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  }
}

type NodeHttpServer = InstanceType<typeof HttpServer> | InstanceType<typeof HttpsServer>

type ServerPrototype = {
  listen: (...args: any[]) => unknown
}

type WebSocketPatchState = {
  patchedPrototypes: WeakSet<object>
  initializedServers: WeakSet<NodeHttpServer>
}

declare global {
  var __diaryWebSocketPatchState__: WebSocketPatchState | undefined
}

function getPatchState(): WebSocketPatchState {
  if (!globalThis.__diaryWebSocketPatchState__) {
    globalThis.__diaryWebSocketPatchState__ = {
      patchedPrototypes: new WeakSet<object>(),
      initializedServers: new WeakSet<NodeHttpServer>(),
    }
  }

  return globalThis.__diaryWebSocketPatchState__
}

function initializeSocketServer(nitroApp: NitroApp, httpServer: NodeHttpServer) {
  const patchState = getPatchState()

  if (nitroApp.socketIo || patchState.initializedServers.has(httpServer)) {
    return
  }

  nitroApp.socketIo = createSocketServer(httpServer)
  patchState.initializedServers.add(httpServer)
}

function patchServerPrototype(nitroApp: NitroApp, prototype: ServerPrototype) {
  const patchState = getPatchState()

  if (patchState.patchedPrototypes.has(prototype)) {
    return
  }

  const originalListen = prototype.listen

  prototype.listen = function patchedListen(this: NodeHttpServer, ...args: any[]) {
    initializeSocketServer(nitroApp, this)
    return originalListen.apply(this, args)
  }

  patchState.patchedPrototypes.add(prototype)
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  patchServerPrototype(nitroApp, HttpServer.prototype)
  patchServerPrototype(nitroApp, HttpsServer.prototype)

  nitroApp.hooks.hook('close', async () => {
    await nitroApp.socketIo?.close()
    nitroApp.socketIo = undefined
  })
})
