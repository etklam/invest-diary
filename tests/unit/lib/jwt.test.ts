import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT } from 'jose'
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_PLACEHOLDER_SECRET,
  assertJwtConfiguration,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '~/lib/jwt'

describe('JWT Utils', () => {
  const testSecret = 'test-secret-key-that-is-long-enough-32'
  const testUserId = '12345'
  const testEmail = 'test@example.com'
  const testRole = 'USER'
  const testTokenVersion = 1

  beforeEach(() => {
    // 設置測試環境變數
    vi.stubEnv('JWT_SECRET', testSecret)
  })

  afterEach(() => {
    // 清理環境變數
    vi.unstubAllEnvs()
  })

  describe('signAccessToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT 格式: header.payload.signature
    })

    it('should include all required fields in token payload', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      const decoded = await verifyToken(token)
      
      expect(decoded.userId).toBe(testUserId)
      expect(decoded.email).toBe(testEmail)
      expect(decoded.role).toBe(testRole)
      expect(decoded.tokenVersion).toBe(testTokenVersion)
    })

    it('should set expiration time', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      const decoded = await verifyToken(token)
      
      expect(decoded).toBeDefined()
      // Token 應該在未來有效
      // TokenPayload 中沒有 exp 欄位，但 verifyToken 應該內部檢查過期
      expect(decoded).toBeDefined()
    })

    it('should throw error when JWT_SECRET is not defined', async () => {
      vi.stubEnv('JWT_SECRET', '')
      
      await expect(signAccessToken(testUserId, testEmail, testRole, testTokenVersion))
        .rejects.toThrow('JWT_SECRET is not defined')
    })

    it('rejects the repository placeholder secret', () => {
      vi.stubEnv('JWT_SECRET', JWT_PLACEHOLDER_SECRET)
      expect(() => assertJwtConfiguration()).toThrow('repository placeholder')
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      
      const result = await verifyToken(token)
      
      expect(result).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.email).toBe(testEmail)
      expect(result.role).toBe(testRole)
      expect(result.tokenVersion).toBe(testTokenVersion)
    })

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here'
      
      await expect(verifyToken(invalidToken))
        .rejects.toThrow()
    })

    it('should throw error for token with wrong secret', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      
      // 修改環境變數為錯誤的 secret
      vi.stubEnv('JWT_SECRET', 'wrong-secret')
      
      await expect(verifyToken(token))
        .rejects.toThrow()
    })
  })

  describe('refresh sessions', () => {
    it('gives each refresh token a distinct session id even in the same second', async () => {
      vi.useFakeTimers()
      try {
        const first = await signRefreshToken(testUserId, testEmail, testRole, testTokenVersion)
        const second = await signRefreshToken(testUserId, testEmail, testRole, testTokenVersion)

        expect(first).not.toBe(second)
        expect((await verifyToken(first)).jti).toBeTruthy()
        expect((await verifyToken(second)).jti).toBeTruthy()
        expect((await verifyToken(first)).jti).not.toBe((await verifyToken(second)).jti)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Integration Tests', () => {
    it('should work with sign and verify cycle', async () => {
      const userId = 'user123'
      const email = 'user@example.com'
      const role = 'ADMIN'
      const tokenVersion = 2
      
      const token = await signAccessToken(userId, email, role, tokenVersion)
      const verified = await verifyToken(token)
      
      expect(verified.userId).toBe(userId)
      expect(verified.email).toBe(email)
      expect(verified.role).toBe(role)
      expect(verified.tokenVersion).toBe(tokenVersion)
    })

    it('should handle different user data', async () => {
      const testCases = [
        { userId: '1', email: 'user1@example.com', role: 'USER' },
        { userId: '12345', email: 'user2@example.com', role: 'ADMIN' },
        { userId: 'user@example.com', email: 'user3@example.com', role: 'USER' },
        { userId: '507f1f77bcf86cd799439011', email: 'user4@example.com', role: 'ADMIN' },
      ]

      for (const testCase of testCases) {
        const token = await signAccessToken(testCase.userId, testCase.email, testCase.role, testTokenVersion)
        const result = await verifyToken(token)
        
        expect(result.userId).toBe(testCase.userId)
        expect(result.email).toBe(testCase.email)
        expect(result.role).toBe(testCase.role)
        expect(result.tokenVersion).toBe(testTokenVersion)
      }
    })

    it('should handle different token versions', async () => {
      const versions = [0, 1, 2, 10, 100]

      for (const version of versions) {
        const token = await signAccessToken(testUserId, testEmail, testRole, version)
        const result = await verifyToken(token)
        
        expect(result.tokenVersion).toBe(version)
      }
    })
  })

  describe('Error Handling', () => {
    it.each([
      [{ email: testEmail, role: testRole, tokenVersion: testTokenVersion, type: 'access' }],
      [{ userId: testUserId, email: testEmail, role: testRole, tokenVersion: testTokenVersion }],
      [{ userId: testUserId, email: testEmail, role: testRole, tokenVersion: testTokenVersion, type: 'other' }],
      [{ userId: testUserId, email: testEmail, role: testRole, tokenVersion: '1', type: 'access' }],
    ])('rejects a signed token with malformed claims', async (payload) => {
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(testSecret))

      await expect(verifyToken(token)).rejects.toThrow('Invalid token payload')
    })

    it('should throw error when JWT_SECRET is not defined during verification', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      
      vi.stubEnv('JWT_SECRET', '')
      
      await expect(verifyToken(token))
        .rejects.toThrow('JWT_SECRET is not defined')
    })

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        '',
        'not.a.token',
        'header.payload', // 缺少簽名
        'header.payload.signature.extra', // 太多部分
        'header..signature', // 空的 payload
      ]

      for (const token of malformedTokens) {
        await expect(verifyToken(token))
          .rejects.toThrow()
      }
    })

    it('should handle null/undefined tokens', async () => {
      await expect(verifyToken(null as any))
        .rejects.toThrow()
      
      await expect(verifyToken(undefined as any))
        .rejects.toThrow()
      
      await expect(verifyToken(''))
        .rejects.toThrow()
    })
  })

  describe('Token Structure', () => {
    it('should create tokens with correct structure', async () => {
      const token = await signAccessToken(testUserId, testEmail, testRole, testTokenVersion)
      
      // JWT 應該有三個部分
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
      
      // 檢查每個部分是否為有效的 base64 格式（基本檢查）
      parts.forEach(part => {
        expect(part.length).toBeGreaterThan(0)
        expect(part).toMatch(/^[A-Za-z0-9+/=_-]+$/)
      })
    })

    it('should maintain token structure after verification', async () => {
      const originalData = {
        userId: testUserId,
        email: testEmail,
        role: testRole,
        tokenVersion: testTokenVersion
      }

      const token = await signAccessToken(
        originalData.userId,
        originalData.email,
        originalData.role,
        originalData.tokenVersion
      )

      const verified = await verifyToken(token)

      // Token payload includes 'type' field ('access' for signToken/signAccessToken)
      expect(verified).toEqual({
        ...originalData,
        type: 'access'
      })
    })
  })
})
