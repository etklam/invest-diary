import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const websocketPluginPath = path.resolve('server/plugins/websocket.ts')

describe('websocket Nitro plugin bootstrap', () => {
  it('patches the Node server listen lifecycle instead of waiting for Nitro rendered hooks', () => {
    const content = fs.readFileSync(websocketPluginPath, 'utf8')

    expect(content).toContain('patchServerPrototype(nitroApp, HttpServer.prototype)')
    expect(content).toContain('prototype.listen = function patchedListen')
    expect(content).not.toContain("nitroApp.hooks.hook('request'")
    expect(content).not.toContain("nitroApp.hooks.hook('rendered'")
  })
})
