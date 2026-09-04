// server/middleware/request-id.ts

import { randomUUID } from 'crypto'

// Global request id middleware (Nitro-compatible default export)
export default defineEventHandler(async (event) => {
  const incoming = getHeader(event, 'x-request-id')
  // Accept only a short log-safe token from clients; otherwise an attacker can
  // inject newlines/control data into text logs. Correlation still works via a
  // server-generated UUID when the header is absent or malformed.
  const requestId = incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming)
    ? incoming
    : randomUUID()

  setHeader(event, 'x-request-id', requestId)
  event.context.requestId = requestId
})
