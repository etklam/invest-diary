import { Errors } from '~/lib/errors/factory'
import { bulkSetPostStatus, parsePostIds } from '~/server/utils/post-write'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids = parsePostIds(body?.ids)

  if (ids.length === 0) {
    throw Errors.validationError([{ field: 'ids', message: 'No post ids provided' }]).toH3Error()
  }

  const count = await bulkSetPostStatus(ids, 'PUBLISHED')

  return {
    count
  }
})
