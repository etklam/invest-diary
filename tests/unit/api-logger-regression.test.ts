import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routeExpectations = [
  {
    file: 'server/api/diaries.post.ts',
    loggerRef: 'logger.diary.withRequestId(event.context.requestId)',
  },
  {
    file: 'server/api/blog/index.get.ts',
    loggerRef: 'logger.blog.withRequestId(event.context.requestId)',
  },
  {
    file: 'server/api/blog/[slug].get.ts',
    loggerRef: 'logger.blog.withRequestId(event.context.requestId)',
  },
  {
    file: 'server/api/auth/logout.post.ts',
    loggerRef: 'logger.auth.withRequestId(event.context.requestId)',
  },
  {
    file: 'server/api/user/settings.put.ts',
    loggerRef: 'logger.api.withRequestId(event.context.requestId)',
  },
]

describe('priority APIs use the structured logger', () => {
  for (const route of routeExpectations) {
    it(`uses logger instead of console in ${route.file}`, () => {
      const content = fs.readFileSync(path.resolve(route.file), 'utf8')

      expect(content).not.toMatch(/console\.(log|info|warn|error|debug)\s*\(/)
      expect(content).toContain("from '~/lib/logger'")
      expect(content).toContain(route.loggerRef)
    })
  }
})
