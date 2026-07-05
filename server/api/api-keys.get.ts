import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { listApiKeysForUser } from '~/server/utils/api-key-queries'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const keys = await listApiKeysForUser(BigInt(user.id))

  return serialize({ keys })
})
