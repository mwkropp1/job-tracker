/**
 * Unit tests for authentication utilities
 * Tests password hashing, JWT generation/verification, and security functions
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import { hashPassword, comparePassword, generateToken, verifyToken } from '../../utils/auth'

// Mock jwt and bcrypt to control their behavior in tests
jest.mock('jsonwebtoken')
jest.mock('bcrypt')

const mockJWT = jwt as jest.Mocked<typeof jwt>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('Authentication Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default environment variables
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.JWT_EXPIRES_IN = '1h'
    process.env.BCRYPT_ROUNDS = '10'
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET
    delete process.env.JWT_EXPIRES_IN
    delete process.env.BCRYPT_ROUNDS
  })

  // Password hashing tests
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'plainTextPassword'
      const hashedPassword = 'hashedPasswordResult'

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10)
      expect(result).toBe(hashedPassword)
    })

    it('should use custom bcrypt rounds from environment', async () => {
      process.env.BCRYPT_ROUNDS = '12'
      const password = 'testPassword'

      mockBcrypt.hash.mockResolvedValue('hashed' as never)

      await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
    })

    it('should handle invalid BCRYPT_ROUNDS environment variable', async () => {
      process.env.BCRYPT_ROUNDS = 'invalid'
      const password = 'testPassword'

      mockBcrypt.hash.mockResolvedValue('hashed' as never)

      await hashPassword(password)

      // Should use default value when invalid
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10)
    })

    it('should handle missing BCRYPT_ROUNDS environment variable', async () => {
      delete process.env.BCRYPT_ROUNDS
      const password = 'testPassword'

      mockBcrypt.hash.mockResolvedValue('hashed' as never)

      await hashPassword(password)

      // Should use default value when missing
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10)
    })

    it('should handle bcrypt errors', async () => {
      const password = 'testPassword'
      const bcryptError = new Error('Bcrypt error')

      mockBcrypt.hash.mockRejectedValue(bcryptError as never)

      await expect(hashPassword(password)).rejects.toThrow('Bcrypt error')
    })

    it('should handle empty password', async () => {
      const password = ''

      mockBcrypt.hash.mockResolvedValue('hashedEmpty' as never)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith('', 10)
      expect(result).toBe('hashedEmpty')
    })

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000)

      mockBcrypt.hash.mockResolvedValue('hashedLong' as never)

      const result = await hashPassword(longPassword)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(longPassword, 10)
      expect(result).toBe('hashedLong')
    })

    it('should handle passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'

      mockBcrypt.hash.mockResolvedValue('hashedSpecial' as never)

      const result = await hashPassword(specialPassword)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(specialPassword, 10)
      expect(result).toBe('hashedSpecial')
    })
  })

  // Password comparison tests
  describe('comparePassword', () => {
    it('should compare password with hashed password correctly', async () => {
      const plainPassword = 'plainTextPassword'
      const hashedPassword = 'hashedPassword'

      mockBcrypt.compare.mockResolvedValue(true as never)

      const result = await comparePassword(plainPassword, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const plainPassword = 'wrongPassword'
      const hashedPassword = 'hashedPassword'

      mockBcrypt.compare.mockResolvedValue(false as never)

      const result = await comparePassword(plainPassword, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword)
      expect(result).toBe(false)
    })

    it('should handle bcrypt compare errors', async () => {
      const plainPassword = 'testPassword'
      const hashedPassword = 'hashedPassword'
      const compareError = new Error('Compare error')

      mockBcrypt.compare.mockRejectedValue(compareError as never)

      await expect(comparePassword(plainPassword, hashedPassword)).rejects.toThrow('Compare error')
    })

    it('should handle empty passwords', async () => {
      mockBcrypt.compare.mockResolvedValue(false as never)

      const result = await comparePassword('', 'hashedPassword')

      expect(mockBcrypt.compare).toHaveBeenCalledWith('', 'hashedPassword')
      expect(result).toBe(false)
    })

    it('should handle empty hashed password', async () => {
      mockBcrypt.compare.mockResolvedValue(false as never)

      const result = await comparePassword('password', '')

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', '')
      expect(result).toBe(false)
    })

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()'
      const hashedPassword = 'hashedSpecialPassword'

      mockBcrypt.compare.mockResolvedValue(true as never)

      const result = await comparePassword(specialPassword, hashedPassword)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(specialPassword, hashedPassword)
      expect(result).toBe(true)
    })
  })

  // Token generation tests
  describe('generateToken', () => {
    it('should generate JWT token with user ID', () => {
      const userId = 'user-123'
      const token = 'generated-jwt-token'

      mockJWT.sign.mockReturnValue(token as never)

      const result = generateToken(userId)

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId, type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      )
      expect(result).toBe(token)
    })

    it('should use custom expiration from environment', () => {
      process.env.JWT_EXPIRES_IN = '24h'
      const userId = 'user-456'

      mockJWT.sign.mockReturnValue('token' as never)

      generateToken(userId)

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId, type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '24h' }
      )
    })

    it('should handle missing JWT_SECRET environment variable', () => {
      delete process.env.JWT_SECRET
      const userId = 'user-789'

      expect(() => generateToken(userId)).toThrow()
    })

    it('should handle missing JWT_EXPIRES_IN environment variable', () => {
      delete process.env.JWT_EXPIRES_IN
      const userId = 'user-789'

      mockJWT.sign.mockReturnValue('token' as never)

      generateToken(userId)

      // Should use default expiration
      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId, type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '24h' }
      )
    })

    it('should handle empty user ID', () => {
      const userId = ''

      mockJWT.sign.mockReturnValue('token' as never)

      const result = generateToken(userId)

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId: '', type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      )
      expect(result).toBe('token')
    })

    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(1000)

      mockJWT.sign.mockReturnValue('token' as never)

      const result = generateToken(longUserId)

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId: longUserId, type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      )
      expect(result).toBe('token')
    })

    it('should handle user ID with special characters', () => {
      const specialUserId = 'user-123@special.com'

      mockJWT.sign.mockReturnValue('token' as never)

      const result = generateToken(specialUserId)

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { userId: specialUserId, type: 'auth' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      )
      expect(result).toBe('token')
    })

    it('should handle JWT signing errors', () => {
      const userId = 'user-123'
      const signingError = new Error('Signing failed')

      mockJWT.sign.mockImplementation(() => {
        throw signingError
      })

      expect(() => generateToken(userId)).toThrow('Signing failed')
    })
  })

  // Token verification tests
  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const token = 'valid-jwt-token'
      const decodedPayload = { userId: 'user-123', type: 'auth' }

      mockJWT.verify.mockReturnValue(decodedPayload as never)

      const result = verifyToken(token)

      expect(mockJWT.verify).toHaveBeenCalledWith(token, 'test-jwt-secret')
      expect(result).toEqual(decodedPayload)
    })

    it('should handle invalid token format', () => {
      const invalidToken = 'invalid.token'
      const verificationError = new Error('Invalid token')

      mockJWT.verify.mockImplementation(() => {
        throw verificationError
      })

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token')
    })

    it('should handle expired tokens', () => {
      const expiredToken = 'expired.jwt.token'
      const expiredError = new Error('Token expired')

      mockJWT.verify.mockImplementation(() => {
        throw expiredError
      })

      expect(() => verifyToken(expiredToken)).toThrow('Token expired')
    })

    it('should handle malformed tokens', () => {
      const malformedToken = 'not-a-jwt-token-at-all'
      const malformedError = new Error('Malformed token')

      mockJWT.verify.mockImplementation(() => {
        throw malformedError
      })

      expect(() => verifyToken(malformedToken)).toThrow('Malformed token')
    })

    it('should handle empty token', () => {
      const emptyToken = ''
      const emptyError = new Error('No token provided')

      mockJWT.verify.mockImplementation(() => {
        throw emptyError
      })

      expect(() => verifyToken(emptyToken)).toThrow('No token provided')
    })

    it('should handle missing JWT_SECRET during verification', () => {
      delete process.env.JWT_SECRET
      const token = 'some.jwt.token'

      expect(() => verifyToken(token)).toThrow()
    })

    it('should handle tokens with wrong secret', () => {
      const token = 'token-signed-with-wrong-secret'
      const wrongSecretError = new Error('Invalid signature')

      mockJWT.verify.mockImplementation(() => {
        throw wrongSecretError
      })

      expect(() => verifyToken(token)).toThrow('Invalid signature')
    })

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000)
      const longTokenError = new Error('Token too long')

      mockJWT.verify.mockImplementation(() => {
        throw longTokenError
      })

      expect(() => verifyToken(longToken)).toThrow('Token too long')
    })
  })

  // Security considerations
  describe('Security Considerations', () => {
    it('should use sufficient bcrypt rounds by default', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed' as never)

      await hashPassword('password')

      const rounds = (mockBcrypt.hash as jest.Mock).mock.calls[0][1]
      expect(rounds).toBeGreaterThanOrEqual(10) // Minimum recommended rounds
    })

    it('should include token type in JWT payload for security', () => {
      const userId = 'user-123'

      mockJWT.sign.mockReturnValue('token' as never)

      generateToken(userId)

      const payload = (mockJWT.sign as jest.Mock).mock.calls[0][0]
      expect(payload).toHaveProperty('type', 'auth')
    })

    it('should not include sensitive data in JWT payload', () => {
      const userId = 'user-123'

      mockJWT.sign.mockReturnValue('token' as never)

      generateToken(userId)

      const payload = (mockJWT.sign as jest.Mock).mock.calls[0][0]
      expect(payload).not.toHaveProperty('password')
      expect(payload).not.toHaveProperty('email')
      expect(payload).not.toHaveProperty('secret')
    })

    it('should handle concurrent password hashing safely', async () => {
      const passwords = ['password1', 'password2', 'password3']
      const promises = passwords.map((password, index) => {
        mockBcrypt.hash.mockResolvedValueOnce(`hashed${index}` as never)
        return hashPassword(password)
      })

      const results = await Promise.all(promises)

      expect(results).toEqual(['hashed0', 'hashed1', 'hashed2'])
      expect(mockBcrypt.hash).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent token generation safely', () => {
      const userIds = ['user1', 'user2', 'user3']

      userIds.forEach((userId, index) => {
        mockJWT.sign.mockReturnValueOnce(`token${index}` as never)
      })

      const tokens = userIds.map(generateToken)

      expect(tokens).toEqual(['token0', 'token1', 'token2'])
      expect(mockJWT.sign).toHaveBeenCalledTimes(3)
    })
  })

  // Edge cases and error handling
  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined passwords gracefully', async () => {
      await expect(hashPassword(null as any)).rejects.toThrow()
      await expect(hashPassword(undefined as any)).rejects.toThrow()

      await expect(comparePassword(null as any, 'hash')).rejects.toThrow()
      await expect(comparePassword('password', null as any)).rejects.toThrow()
    })

    it('should handle null/undefined user IDs and tokens gracefully', () => {
      expect(() => generateToken(null as any)).toThrow()
      expect(() => generateToken(undefined as any)).toThrow()

      expect(() => verifyToken(null as any)).toThrow()
      expect(() => verifyToken(undefined as any)).toThrow()
    })

    it('should handle numeric inputs gracefully', async () => {
      await expect(hashPassword(12345 as any)).rejects.toThrow()
      await expect(comparePassword(12345 as any, 'hash')).rejects.toThrow()

      expect(() => generateToken(12345 as any)).not.toThrow()
      expect(() => verifyToken(12345 as any)).toThrow()
    })

    it('should handle object inputs gracefully', async () => {
      const objectInput = { password: 'test' }

      await expect(hashPassword(objectInput as any)).rejects.toThrow()
      await expect(comparePassword(objectInput as any, 'hash')).rejects.toThrow()

      expect(() => generateToken(objectInput as any)).not.toThrow()
      expect(() => verifyToken(objectInput as any)).toThrow()
    })
  })
})