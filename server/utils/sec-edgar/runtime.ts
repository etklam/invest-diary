import { createSecEdgarService, type SecEdgarService } from './service'

let service: SecEdgarService | undefined
let configuredAgent = ''

export function getSecEdgarService(): SecEdgarService {
  const config = useRuntimeConfig()
  const userAgent = String(config.secUserAgent ?? '')
  if (!service || configuredAgent !== userAgent) {
    service = createSecEdgarService(userAgent)
    configuredAgent = userAgent
  }
  return service
}
