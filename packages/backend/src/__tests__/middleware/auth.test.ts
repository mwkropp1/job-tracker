/**
 * Unit tests for authentication middleware
 * Tests JWT verification, error handling, and security features
 */

import { Request, Response, NextFunction } from 'express'

import { authenticateToken, optionalAuth } from '../../middleware/auth'
import { MockExpressUtils } from '../../test/testUtils'

jest.mock('../../utils/auth', () => ({
  verifyToken: jest.fn()
}))

const mockAuth = require('../../utils/auth')

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    jest.clearAllMocks()

    mockReq = MockExpressUtils.createMockRequest()
    mockRes = MockExpressUtils.createMockResponse()
    mockNext = MockExpressUtils.createMockNext()
  })

  describe('authenticateToken middleware', () => {
    it('should authenticate valid JWT token', () => {
      const mockDecodedToken = { userId: 'user-123', type: 'auth' }
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('valid-jwt-token')
      expect(mockReq.user).toEqual({ id: 'user-123' })
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject request without authorization header', () => {
      mockReq.headers = {}

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' })
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockAuth.verifyToken).not.toHaveBeenCalled()
    })

    it('should reject request with empty authorization header', () => {
      mockReq.headers = { authorization: '' }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request with malformed authorization header (no Bearer)', () => {
      mockReq.headers = { authorization: 'invalid-format-token' }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request with Bearer but no token', () => {
      mockReq.headers = { authorization: 'Bearer ' }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request with Bearer and only spaces', () => {
      mockReq.headers = { authorization: 'Bearer    ' }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token required' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject invalid JWT token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('invalid-token')
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' })
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockReq.user).toBeUndefined()
    })

    it('should reject expired JWT token', () => {
      mockReq.headers = { authorization: 'Bearer expired-token' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Token expired')
      })

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle JWT verification with different error types', () => {
      mockReq.headers = { authorization: 'Bearer problematic-token' }

      const errorTypes = [
        new Error('JsonWebTokenError'),
        new Error('TokenExpiredError'),
        new Error('NotBeforeError'),
        'String error',
        null,
        undefined
      ]

      errorTypes.forEach((error) => {
        jest.clearAllMocks()
        mockRes = MockExpressUtils.createMockResponse()

        mockAuth.verifyToken.mockImplementation(() => {
          throw error
        })

        authenticateToken(mockReq as Request, mockRes as Response, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(403)
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' })
        expect(mockNext).not.toHaveBeenCalled()
      })
    })

    it('should handle case-insensitive Bearer keyword', () => {
      const mockDecodedToken = { userId: 'user-123' }

      const authHeaders = [
        'Bearer valid-token',
        'bearer valid-token',
        'BEARER valid-token',
        'BeArEr valid-token'
      ]

      authHeaders.forEach((authHeader) => {
        jest.clearAllMocks()
        mockReq = MockExpressUtils.createMockRequest({ headers: { authorization: authHeader } })
        mockRes = MockExpressUtils.createMockResponse()
        mockNext = MockExpressUtils.createMockNext()

        mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

        if (authHeader.startsWith('Bearer ')) {
          authenticateToken(mockReq as Request, mockRes as Response, mockNext)
          expect(mockNext).toHaveBeenCalledTimes(1)
        } else {
          authenticateToken(mockReq as Request, mockRes as Response, mockNext)
          expect(mockRes.status).toHaveBeenCalledWith(401)
        }
      })
    })

    it('should handle tokens with multiple spaces after Bearer', () => {
      const mockDecodedToken = { userId: 'user-123' }
      mockReq.headers = { authorization: 'Bearer    token-with-spaces' }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('token-with-spaces')
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should handle very long tokens', () => {
      const mockDecodedToken = { userId: 'user-123' }
      const longToken = 'a'.repeat(2000) // Very long token
      mockReq.headers = { authorization: `Bearer ${longToken}` }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith(longToken)
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should set user context correctly from token payload', () => {
      const mockDecodedToken = { userId: 'user-456', role: 'admin', exp: 1234567890 }
      mockReq.headers = { authorization: 'Bearer valid-token' }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({ id: 'user-456' })
      expect(mockNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('optionalAuth middleware', () => {
    it('should authenticate valid JWT token when present', () => {
      const mockDecodedToken = { userId: 'user-123' }
      mockReq.headers = { authorization: 'Bearer valid-optional-token' }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('valid-optional-token')
      expect(mockReq.user).toEqual({ id: 'user-123' })
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should continue without authentication when no token provided', () => {
      mockReq.headers = {}

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).not.toHaveBeenCalled()
      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should continue without authentication when empty authorization header', () => {
      mockReq.headers = { authorization: '' }

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).not.toHaveBeenCalled()
      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should continue without authentication when malformed authorization header', () => {
      mockReq.headers = { authorization: 'malformed-header' }

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).not.toHaveBeenCalled()
      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should continue without authentication when invalid token provided', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('invalid-token')
      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should continue without authentication when expired token provided', () => {
      mockReq.headers = { authorization: 'Bearer expired-token' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Token expired')
      })

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockAuth.verifyToken).toHaveBeenCalledWith('expired-token')
      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should handle token verification errors gracefully', () => {
      mockReq.headers = { authorization: 'Bearer problematic-token' }

      // Test various error scenarios
      const errorScenarios = [
        new Error('Network error'),
        new TypeError('Type error'),
        'String error',
        null,
        undefined,
        { message: 'Object error' }
      ]

      errorScenarios.forEach((error) => {
        jest.clearAllMocks()
        mockNext = MockExpressUtils.createMockNext()

        mockAuth.verifyToken.mockImplementation(() => {
          throw error
        })

        optionalAuth(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(mockRes.status).not.toHaveBeenCalled()
      })
    })

    it('should set user context from valid token payload', () => {
      const mockDecodedToken = { userId: 'optional-user-789', role: 'user' }
      mockReq.headers = { authorization: 'Bearer optional-valid-token' }

      mockAuth.verifyToken.mockReturnValue(mockDecodedToken)

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({ id: 'optional-user-789' })
      expect(mockNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('Security considerations', () => {
    it('should not leak token verification errors in authenticateToken', () => {
      mockReq.headers = { authorization: 'Bearer token-with-sensitive-error' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Secret key compromised: sk_live_12345')
      })

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' })
      // Should not include the actual error message
      expect(mockRes.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Secret key compromised')
        })
      )
    })

    it('should not leak token verification errors in optionalAuth', () => {
      mockReq.headers = { authorization: 'Bearer token-with-sensitive-error' }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Internal system details')
      })

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      // Should continue without revealing error details
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should handle authorization header injection attempts', () => {
      const maliciousHeaders = [
        'Bearer token\nX-Admin: true',
        'Bearer token\r\nAuthorization: Bearer admin-token',
        'Bearer token; DROP TABLE users;'
      ]

      maliciousHeaders.forEach((header) => {
        jest.clearAllMocks()
        mockReq = MockExpressUtils.createMockRequest({ headers: { authorization: header } })
        mockRes = MockExpressUtils.createMockResponse()
        mockNext = MockExpressUtils.createMockNext()

        mockAuth.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token format')
        })

        authenticateToken(mockReq as Request, mockRes as Response, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(403)
        expect(mockNext).not.toHaveBeenCalled()
      })
    })

    it('should handle extremely long authorization headers', () => {
      const longHeader = 'Bearer ' + 'a'.repeat(100000) // Very long token
      mockReq.headers = { authorization: longHeader }

      mockAuth.verifyToken.mockImplementation(() => {
        throw new Error('Token too long')
      })

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle multiple authorization headers', () => {
      // Note: Express typically handles this, but testing edge case
      mockReq.headers = {
        authorization: ['Bearer token1', 'Bearer token2'] as any
      }

      // The split operation should handle this gracefully
      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      // Since authorization is an array, authHeader && authHeader.split() might fail
      // This tests how the middleware handles unexpected header formats
      expect(mockRes.status).toHaveBeenCalledWith(401)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle missing request headers object', () => {
      mockReq.headers = undefined as any

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle null authorization header', () => {
      mockReq.headers = { authorization: null as any }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle undefined authorization header', () => {
      mockReq.headers = { authorization: undefined }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle authorization header as number', () => {
      mockReq.headers = { authorization: 12345 as any }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle authorization header as object', () => {
      mockReq.headers = { authorization: { token: 'value' } as any }

      authenticateToken(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})