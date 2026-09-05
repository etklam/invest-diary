// @vitest-environment node
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
// Resolve through the real consumers so a vulnerable nested copy cannot hide
// behind an updated top-level package.
const socketRequire = createRequire(require.resolve('socket.io'))
const engineRequire = createRequire(socketRequire.resolve('engine.io'))
const { Decoder } = socketRequire('socket.io-parser')
const { Receiver, WebSocketServer } = engineRequire('ws')

describe('WebSocket runtime resource limits', () => {
  it('rejects zero and excessive attachment counts before buffering binary payloads', () => {
    for (const packet of ['50-["event"]', '51000000-["event"]']) {
      const decoder = new Decoder()
      expect(() => decoder.add(packet)).toThrow(/attachments/i)
      decoder.destroy()
    }

    const decoder = new Decoder()
    const decoded: unknown[] = []
    decoder.on('decoded', (packet: unknown) => decoded.push(packet))
    decoder.add('51-["event",{"_placeholder":true,"num":0}]')
    decoder.add(Buffer.from('valid'))
    expect(decoded).toHaveLength(1)
    decoder.destroy()
  })

  it('bounds tiny fragmented messages using the server default limit', async () => {
    const server = new WebSocketServer({ noServer: true })
    const { maxFragments } = server.options
    expect(maxFragments).toBeGreaterThan(0)
    expect(maxFragments).toBeLessThanOrEqual(65_536)
    const receiver = new Receiver({ ...server.options, isServer: false })
    const rejected = new Promise<Error & { code?: string }>(resolve => receiver.once('error', resolve))
    // Less than 200 KB of input, with a fixed upper bound; never an OOM probe.
    receiver.write(Buffer.concat(Array.from({ length: maxFragments + 1 }, (_, index) =>
      Buffer.from([index === 0 ? 0x02 : 0x00, 0x01, 0x61]),
    )))
    expect((await rejected).code).toBe('WS_ERR_TOO_MANY_BUFFERED_PARTS')
    receiver.destroy()
    server.close()
  })
})
