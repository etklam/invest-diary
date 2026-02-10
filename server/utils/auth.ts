import { H3Event } from 'h3'

export function setAuthCookie(event: H3Event, token: string) {
  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, 'auth-token')
}

export function requireUser(event: H3Event) {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED'
    })
  }
  return user
}
