/**
 * Coordinate rotating native refresh tokens at the transport boundary.
 *
 * A native client must share one in-flight refresh request across all callers
 * that observe the same expired access token. The coordinator is deliberately
 * framework-neutral; React Native callers can place their token persistence and
 * request retry policy around it without introducing a Vue/Nuxt dependency.
 */
export function createSingleFlightRefresh<T>(refresh: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | undefined

  return () => {
    if (inFlight) return inFlight

    const request = Promise.resolve().then(refresh)
    inFlight = request.finally(() => {
      inFlight = undefined
    })
    return inFlight
  }
}
