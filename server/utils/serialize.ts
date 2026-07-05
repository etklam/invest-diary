/**
 * Generic deep serializer for API responses.
 *
 * Recursively converts all BigInt values to string so that JSON.stringify
 * produces a clean, predictable output. Handlers should wrap every Prisma
 * return value with `serialize()` instead of calling `.toString()` manually.
 *
 * The global BigInt.prototype.toJSON plugin (server/plugins/bigint.ts) acts
 * as a safety net, but this function is the explicit contract.
 *
 * Cycle guard: a WeakMap tracks original→result pairs so self-referential
 * structures collapse to the already-serializing result (BigInt-converted),
 * not the raw original. Prisma results don't legitimately cycle — this is
 * purely defensive against accidental circular refs.
 */
export function serialize<T>(obj: T, seen?: WeakMap<object, unknown>): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return String(obj) as T
  if (Array.isArray(obj)) return obj.map((v) => serialize(v, seen)) as T
  if (obj instanceof Date) return obj as T
  if (typeof obj === 'object') {
    // ponytail: guard `seen` — when serialize is used as a .map/.forEach
    // callback, the runtime passes (value, index, array), so `seen` can arrive
    // as a number/array. Only treat it as the cycle map when it's a WeakMap.
    const map = seen instanceof WeakMap ? seen : new WeakMap()
    if (map.has(obj as object)) return map.get(obj as object) as T
    const result: Record<string, unknown> = {}
    map.set(obj as object, result)
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serialize(v, map)
    }
    return result as T
  }
  return obj
}
