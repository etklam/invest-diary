// server/middleware/request-id.ts

import { randomUUID } from 'crypto'

// Global request id middleware (Nitro-compatible default export)
export default defineEventHandler(async (event) => {
  const incoming = getHeader(event, 'x-request-id')
  const requestId = incoming || randomUUID()

  setHeader(event, 'x-request-id', requestId)
  event.context.requestId = requestId
})
