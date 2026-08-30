import { describe, expect, it } from 'vitest'
import {
  AGENT_ALLOWED_SOURCE_TYPES,
  STOCK_TIMELINE_SOURCE_TYPES,
  agentAllowedSourceTypeSchema,
  stockTimelineSourceTypeSchema,
} from '~/lib/stocks/timeline-source'

describe('stock timeline source types', () => {
  it('keeps agent source types as an explicit six-value subset policy', () => {
    expect(AGENT_ALLOWED_SOURCE_TYPES).toHaveLength(6)
    expect(AGENT_ALLOWED_SOURCE_TYPES.every(type => STOCK_TIMELINE_SOURCE_TYPES.includes(type))).toBe(true)
    expect(agentAllowedSourceTypeSchema.options).toEqual(AGENT_ALLOWED_SOURCE_TYPES)
  })

  it('accepts all web source types from the SSOT', () => {
    for (const sourceType of STOCK_TIMELINE_SOURCE_TYPES) {
      expect(stockTimelineSourceTypeSchema.parse(sourceType)).toBe(sourceType)
    }
  })
})
