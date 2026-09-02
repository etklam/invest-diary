import { assertJwtConfiguration } from '~/lib/jwt'

export default defineNitroPlugin(() => {
  assertJwtConfiguration()
})
