import { z } from 'zod'

export const authUserSchema = z.object({
  id: z.string().regex(/^\d+$/),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
  expectedMonthlyTrades: z.number().int().nonnegative(),
  expectedProfit: z.string(),
  expectedAvgHolding: z.string(),
  timezone: z.string().min(1),
})

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).strict()

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
}).strict()

export const registeredUserSchema = z.object({
  id: z.string().regex(/^\d+$/),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
  expectedMonthlyTrades: z.number().int().nonnegative(),
  expectedProfit: z.string(),
  expectedAvgHolding: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
}).strict()

export const authUserResponseSchema = z.object({
  ok: z.literal(true),
  data: authUserSchema,
}).strict()

export const registerResponseSchema = z.object({
  success: z.literal(true),
  user: registeredUserSchema,
}).strict()

export const nativeLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().trim().min(1).max(100).optional(),
}).strict()

export const nativeRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
}).strict()

export const nativeLogoutRequestSchema = nativeRefreshRequestSchema

export const nativeTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime({ offset: true }),
  refreshTokenExpiresAt: z.iso.datetime({ offset: true }),
  user: authUserSchema,
})

export const nativeAuthResponseSchema = z.object({
  ok: z.literal(true),
  data: nativeTokenPairSchema,
})

export const authMutationResponseSchema = z.object({ ok: z.literal(true) })

export type AuthUser = z.infer<typeof authUserSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type NativeLoginRequest = z.infer<typeof nativeLoginRequestSchema>
export type NativeTokenPair = z.infer<typeof nativeTokenPairSchema>
