/**
 * Shared base types used across the application.
 *
 * All BigInt PKs are converted to string by `serialize()` before leaving the
 * API boundary, so any type that describes a **post-serialization** API
 * response should use `SerializedId` for ID fields.
 *
 * For pre-serialization / internal server code that still handles raw Prisma
 * results, keep using `bigint` directly — this alias is NOT for those cases.
 */

/** @deprecated Import shared IDs from `~/lib/contracts/common`. */
export type { SerializedId } from '~/lib/contracts/common/ids'
