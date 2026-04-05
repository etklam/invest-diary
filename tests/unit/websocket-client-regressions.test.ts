import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('websocket client regressions', () => {
  it('keeps reconnect state instead of tearing down the socket on transient connect errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain("currentSocket.io.on('reconnect_attempt'")
    expect(source).toContain("if (currentSocket.active) {")
    expect(source).not.toContain("connectionStatus.value = 'error'\n    disconnect()")
  })

  it('reuses alert subscriptions when a new socket instance is created', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain('const alertSubscribers = new Set')
    expect(source).toContain('attachAlertSubscribers(currentSocket)')
    expect(source).toContain('alertSubscribers.add(cb)')
  })

  it('reuses an active socket during reconnect instead of opening duplicates', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain('if (socket.active) {')
    expect(source).toContain("connectionStatus.value = 'reconnecting'")
    expect(source).toContain('socket.connect()')
    expect(source).toContain('autoConnect: false')
  })
})
