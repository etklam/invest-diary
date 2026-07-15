import { describe, expect, it } from 'vitest'
import { responseNodeStream } from '~/server/utils/sec-edgar/download'

async function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

describe('SEC document streaming', () => {
  it('streams a response without changing its bytes', async () => {
    await expect(collect(responseNodeStream(new Response('filing body'), 100))).resolves.toEqual(Buffer.from('filing body'))
  })

  it('rejects content-length and streamed bodies over the limit', async () => {
    expect(() => responseNodeStream(new Response('x', { headers: { 'content-length': '101' } }), 100)).toThrow('size limit')
    await expect(collect(responseNodeStream(new Response('12345'), 4))).rejects.toThrow('size limit')
  })
})
