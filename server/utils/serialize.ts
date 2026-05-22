/**
 * Generic deep serializer for API responses.
 *
 * Recursively converts all BigInt values to string so that JSON.stringify
 * produces a clean, predictable output. Handlers should wrap every Prisma
 * return value with `serialize()` instead of calling `.toString()` manually.
 *
 * The global BigInt.prototype.toJSON plugin (server/plugins/bigint.ts) acts
 * as a safety net, but this function is the explicit contract.
 */
export function serialize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return String(obj) as T
  if (Array.isArray(obj)) return obj.map(serialize) as T
  if (obj instanceof Date) return obj as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serialize(v)
    }
    return result as T
  }
  return obj
}
