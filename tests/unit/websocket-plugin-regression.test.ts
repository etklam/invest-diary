import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const websocketPluginPath = path.resolve('server/plugins/websocket.ts')

describe('websocket Nitro plugin bootstrap', () => {
  it('binds Socket.IO after Nitro rendered setup instead of on the first request', () => {
    const content = fs.readFileSync(websocketPluginPath, 'utf8')

    expect(content).toContain("nitroApp.hooks.hook('rendered'")
    expect(content).not.toContain("nitroApp.hooks.hook('request'")
  })
})
