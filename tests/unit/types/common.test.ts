import { describe, it, expect } from 'vitest'
import type { SerializedId } from '~/types/common'

describe('SerializedId type', () => {
  it('should accept string values', () => {
    const id: SerializedId = '123'
    expect(typeof id).toBe('string')
    expect(id).toBe('123')
  })

  it('should work as a string at runtime', () => {
    const id: SerializedId = '9007199254740991'
    expect(Number(id)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('should support string operations', () => {
    const id: SerializedId = '42'
    expect(id.padStart(5, '0')).toBe('00042')
    expect(id.length).toBe(2)
  })
})
