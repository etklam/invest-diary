import { createServer, get } from 'node:http'
import { io as createClient } from 'socket.io-client'
import { describe, expect, it } from 'vitest'
import { createSocketServer } from '~/server/websocket/socket-server'

const describeProbe = process.env.SOCKET_COOKIE_PROCESS_PROBE === '1' ? describe : describe.skip

function getHealth(port: number): Promise<{ status: number | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    get(`http://127.0.0.1:${port}/health`, response => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode, body }))
    }).once('error', reject)
  })
}

describeProbe('malformed WebSocket cookie process probe', () => {
  it('rejects only the bad connection and keeps HTTP alive', async () => {
    process.env.NODE_ENV = 'test'
    const httpServer = createServer((request, response) => {
      response.statusCode = request.url === '/health' ? 200 : 404
      response.end(request.url === '/health' ? 'ok' : 'not found')
    })
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject)
      httpServer.listen(0, '127.0.0.1', resolve)
    })

    const address = httpServer.address()
    if (!address || typeof address === 'string') throw new Error('Probe server did not bind')
    const socketServer = createSocketServer(httpServer)
    const client = createClient(`http://127.0.0.1:${address.port}`, {
      path: '/socket.io/',
      extraHeaders: { cookie: 'access-token=%' },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    })

    try {
      const rejection = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Malformed cookie was not rejected')), 2_000)
        client.once('connect_error', error => {
          clearTimeout(timeout)
          resolve(error.message)
        })
      })
      const health = await getHealth(address.port)

      expect(rejection).toBe('Invalid token')
      expect(health).toEqual({ status: 200, body: 'ok' })
      process.stdout.write('WS_MALFORMED_COOKIE_PROBE_OK\n')
    } finally {
      client.close()
      await socketServer.close()
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close(error => error ? reject(error) : resolve())
        })
      }
    }
  })
})
