const normalizeOrigin = (origin: string | undefined): string | undefined => {
  if (!origin) return undefined

  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.origin
  } catch {
    return undefined
  }
}

const getAllowedOrigins = (siteUrl: string | undefined): Set<string> => {
  const normalizedSiteUrl = normalizeOrigin(siteUrl)
  if (!normalizedSiteUrl) return new Set()

  const site = new URL(normalizedSiteUrl)
  const origins = new Set([normalizedSiteUrl])

  if (site.hostname.startsWith('www.')) {
    site.hostname = site.hostname.slice(4)
  } else {
    site.hostname = `www.${site.hostname}`
  }

  origins.add(site.origin)
  return origins
}

export const isAllowedWebSocketOrigin = (
  origin: string | undefined,
  siteUrl: string | undefined,
  isProduction: boolean
): boolean => {
  // Socket.IO can issue same-origin requests without an Origin header. The
  // authenticated Socket.IO middleware remains the authorization boundary.
  if (!origin) return true

  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) return false

  if (!isProduction) {
    const hostname = new URL(normalizedOrigin).hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  }

  return getAllowedOrigins(siteUrl).has(normalizedOrigin)
}
