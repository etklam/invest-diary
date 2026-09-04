import type { Prisma } from '@prisma/client'

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
/**
 * The JSON-boundary representation produced by `serialize`.
 *
 * Dates remain Date instances until the framework JSON-encodes the response;
 * `Date.toJSON()` then produces the string represented here. Prisma Decimal
 * values use their JSON representation immediately so response DTOs can stay
 * primitive at the application boundary.
 */
export type Serialized<T> =
  T extends bigint ? string
    : T extends Date ? string
      : T extends Prisma.Decimal ? string
      : T extends (...args: never[]) => unknown ? T
        : T extends readonly (infer U)[] ? Serialized<U>[]
          : T extends object ? { [K in keyof T]: Serialized<T[K]> }
            : T

export function serialize<T>(obj: T, seen?: WeakMap<object, unknown>): Serialized<T> {
  if (obj === null || obj === undefined) return obj as Serialized<T>
  if (typeof obj === 'bigint') return String(obj) as Serialized<T>
  if (obj instanceof Date) return obj as Serialized<T>
  if (typeof obj === 'object') {
    if (obj instanceof Map) {
      throw new TypeError('serialize does not support Map values at the JSON boundary')
    }
    if (obj instanceof Set) {
      throw new TypeError('serialize does not support Set values at the JSON boundary')
    }

    // Arrays participate in the same cycle graph as plain objects. Register
    // the result before descending so an accidental array↔object cycle does
    // not recurse forever.
    const map = seen instanceof WeakMap ? seen : new WeakMap()
    if (map.has(obj as object)) return map.get(obj as object) as Serialized<T>
    if (Array.isArray(obj)) {
      const result: unknown[] = []
      map.set(obj as object, result)
      for (const value of obj) result.push(serialize(value, map))
      return result as Serialized<T>
    }

    // Prisma Decimal is intentionally detected structurally; importing its
    // runtime constructor would pull Prisma into client-side bundles.
    const decimal = obj as {
      s?: unknown
      e?: unknown
      d?: unknown
      toJSON?: () => unknown
    }
    if (
      typeof decimal.s === 'number'
      && typeof decimal.e === 'number'
      && Array.isArray(decimal.d)
      && typeof decimal.toJSON === 'function'
    ) {
      return decimal.toJSON() as Serialized<T>
    }

    const result: Record<string, unknown> = {}
    map.set(obj as object, result)
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = serialize(v, map)
    }
    return result as Serialized<T>
  }
  return obj as Serialized<T>
}
