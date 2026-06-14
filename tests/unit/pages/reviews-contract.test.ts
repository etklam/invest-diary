import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('review queue page contract', () => {
  it('shows unscheduled pending reviews on the queue page', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/reviews/index.vue'), 'utf8')

    expect(content).toContain('unscheduled: DiaryReviewItem[]')
    expect(content).toContain('reviewGroups.unscheduled')
    expect(content).toContain("review.queue.sections.unscheduled")
  })
})
