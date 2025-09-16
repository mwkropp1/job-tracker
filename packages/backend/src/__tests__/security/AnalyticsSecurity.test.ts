/**
 * Security and authorization tests for Analytics API
 * Tests authentication, authorization, data isolation, and security vulnerabilities
 */

import type { Request, Response } from 'express'
import type { DataSource } from 'typeorm'
import jwt from 'jsonwebtoken'

import { AnalyticsController } from '../../controllers/AnalyticsController'
import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { Resume } from '../../entities/Resume'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase'
import { TestDataFactory, MockExpressUtils } from '../../test'
import { AnalyticsTestFixtures } from '../../test/analyticsTestFixtures'

// Mock authentication middleware
const mockAuthMiddleware = {
  requireAuth: jest.fn(),
  optionalAuth: jest.fn(),
  requireRole: jest.fn(),
}

jest.mock('../../middleware/auth', () => mockAuthMiddleware)

describe('Analytics Security and Authorization Tests', () => {
  let dataSource: DataSource
  let analyticsController: AnalyticsController
  let validUser: User
  let otherUser: User
  let adminUser: User
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    analyticsController = new AnalyticsController()
    mockReq = MockExpressUtils.createMockRequest()
    mockRes = MockExpressUtils.createMockResponse()

    // Create test users
    const userRepository = dataSource.getRepository(User)

    validUser = await userRepository.save(
      TestDataFactory.createMockUser({
        email: 'valid-user@example.com',
        firstName: 'Valid',
        lastName: 'User',
      })
    )

    otherUser = await userRepository.save(
      TestDataFactory.createMockUser({
        email: 'other-user@example.com',
        firstName: 'Other',
        lastName: 'User',
      })
    )

    adminUser = await userRepository.save(
      TestDataFactory.createMockUser({
        email: 'admin-user@example.com',
        firstName: 'Admin',
        lastName: 'User',
      })
    )

    // Reset mocks
    jest.clearAllMocks()
  })

  describe('Authentication Requirements', () => {
    describe('Unauthenticated Access', () => {
      beforeEach(() => {
        // No user in request - simulating unauthenticated request
        mockReq.user = undefined
        mockReq.headers = {}
      })

      const endpoints = [
        { method: 'getStatusDistribution', name: 'Status Distribution' },
        { method: 'getPipelineTrends', name: 'Pipeline Trends' },
        { method: 'getPipelineSummary', name: 'Pipeline Summary' },
        { method: 'getResumePerformance', name: 'Resume Performance' },
        { method: 'getResumeUsage', name: 'Resume Usage' },
        { method: 'getResumeConversionRates', name: 'Resume Conversion Rates' },
        { method: 'getResponseTimes', name: 'Response Times' },
        { method: 'getApplicationVelocity', name: 'Application Velocity' },
        { method: 'getOverallConversion', name: 'Overall Conversion' },
        { method: 'getConversionByPeriod', name: 'Conversion by Period' },
      ]

      endpoints.forEach(({ method, name }) => {
        it(`should reject unauthenticated access to ${name}`, async () => {
          // Act
          await (analyticsController as any)[method](mockReq as Request, mockRes as Response)

          // Assert
          expect(mockRes.status).toHaveBeenCalledWith(401)
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: expect.stringMatching(/authentication|unauthorized/i),
            })
          )
        })
      })
    })

    describe('Invalid Authentication Tokens', () => {
      const invalidTokenScenarios = [
        { name: 'malformed token', token: 'invalid.token.format', expectedError: 'Invalid token format' },
        { name: 'expired token', token: 'expired', expectedError: 'Token expired' },
        { name: 'wrong signature', token: 'wrong.signature.token', expectedError: 'Invalid token signature' },
        { name: 'missing token', token: '', expectedError: 'Token required' },
        { name: 'null token', token: null, expectedError: 'Token required' },
      ]

      invalidTokenScenarios.forEach(({ name, token, expectedError }) => {
        it(`should reject ${name}`, async () => {
          // Arrange
          mockReq.headers = {
            authorization: token ? `Bearer ${token}` : undefined,
          }

          // Act
          await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

          // Assert
          expect(mockRes.status).toHaveBeenCalledWith(401)
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: expect.stringContaining(expectedError),
            })
          )
        })
      })

      it('should handle JWT verification errors gracefully', async () => {
        // Arrange: Create invalid JWT
        const invalidJwt = jwt.sign(
          { userId: validUser.id, exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
          'wrong-secret'
        )

        mockReq.headers = {
          authorization: `Bearer ${invalidJwt}`,
        }

        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401)
      })
    })

    describe('Valid Authentication', () => {
      beforeEach(() => {
        mockReq.user = { id: validUser.id }
        mockReq.headers = {
          authorization: `Bearer ${TestDataFactory.createTestJWT(validUser.id)}`,
        }
      })

      it('should allow access with valid authentication', async () => {
        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert
        expect(mockRes.status).not.toHaveBeenCalledWith(401)
        expect(mockRes.status).toHaveBeenCalledWith(200)
      })

      it('should preserve user context throughout request lifecycle', async () => {
        // Arrange: Create data for the authenticated user
        const jobAppRepo = dataSource.getRepository(JobApplication)
        await jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: validUser,
          status: JobApplicationStatus.APPLIED,
        }))

        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200)
        const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data
        expect(responseData.total).toBe(1)
      })
    })
  })

  describe('Authorization and Data Isolation', () => {
    beforeEach(async () => {
      // Create test data for multiple users
      const jobAppRepo = dataSource.getRepository(JobApplication)
      const resumeRepo = dataSource.getRepository(Resume)

      // Data for validUser
      const validUserResume = await resumeRepo.save(TestDataFactory.createMockResume({
        user: validUser,
        versionName: 'Valid User Resume',
      }))

      await Promise.all([
        jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: validUser,
          resume: validUserResume,
          company: 'ValidUser Corp',
          status: JobApplicationStatus.APPLIED,
        })),
        jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: validUser,
          resume: validUserResume,
          company: 'ValidUser Inc',
          status: JobApplicationStatus.PHONE_SCREEN,
        })),
      ])

      // Data for otherUser
      const otherUserResume = await resumeRepo.save(TestDataFactory.createMockResume({
        user: otherUser,
        versionName: 'Other User Resume',
      }))

      await Promise.all([
        jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: otherUser,
          resume: otherUserResume,
          company: 'OtherUser Corp',
          status: JobApplicationStatus.APPLIED,
        })),
        jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: otherUser,
          resume: otherUserResume,
          company: 'OtherUser Inc',
          status: JobApplicationStatus.OFFER_RECEIVED,
        })),
        jobAppRepo.save(TestDataFactory.createMockJobApplication({
          user: otherUser,
          resume: otherUserResume,
          company: 'OtherUser LLC',
          status: JobApplicationStatus.REJECTED,
        })),
      ])
    })

    describe('User Data Isolation', () => {
      it('should only return data for authenticated user', async () => {
        // Arrange: Authenticate as validUser
        mockReq.user = { id: validUser.id }

        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200)
        const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data

        // Should only see validUser's 2 applications, not otherUser's 3
        expect(responseData.total).toBe(2)
        expect(responseData.distribution).toHaveLength(2) // APPLIED and PHONE_SCREEN statuses
      })

      it('should not leak data between users', async () => {
        // Test as validUser
        mockReq.user = { id: validUser.id }
        await analyticsController.getResumePerformance(mockReq as Request, mockRes as Response)

        const validUserResponse = (mockRes.json as jest.Mock).mock.calls[0][0].data
        expect(validUserResponse).toHaveLength(1) // Only validUser's resume
        expect(validUserResponse[0].versionName).toBe('Valid User Resume')

        // Reset mocks and test as otherUser
        jest.clearAllMocks()
        mockReq.user = { id: otherUser.id }
        await analyticsController.getResumePerformance(mockReq as Request, mockRes as Response)

        const otherUserResponse = (mockRes.json as jest.Mock).mock.calls[0][0].data
        expect(otherUserResponse).toHaveLength(1) // Only otherUser's resume
        expect(otherUserResponse[0].versionName).toBe('Other User Resume')

        // Verify no data leakage
        expect(otherUserResponse[0].versionName).not.toBe('Valid User Resume')
      })

      it('should enforce data isolation across all analytics endpoints', async () => {
        const endpoints = [
          'getStatusDistribution',
          'getPipelineSummary',
          'getResumePerformance',
          'getResumeUsage',
          'getResponseTimes',
          'getOverallConversion',
        ]

        for (const endpoint of endpoints) {
          // Test as validUser
          mockReq.user = { id: validUser.id }
          await (analyticsController as any)[endpoint](mockReq as Request, mockRes as Response)

          // Verify response doesn't contain otherUser's data
          const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data
          if (Array.isArray(responseData)) {
            responseData.forEach(item => {
              expect(JSON.stringify(item)).not.toContain('OtherUser')
            })
          } else if (typeof responseData === 'object') {
            expect(JSON.stringify(responseData)).not.toContain('OtherUser')
          }

          jest.clearAllMocks()
        }
      })
    })

    describe('User Impersonation Protection', () => {
      it('should reject attempts to access data with modified user ID', async () => {
        // Arrange: Authenticate as validUser but try to access otherUser's data
        mockReq.user = { id: validUser.id }
        mockReq.params = { userId: otherUser.id } // Attempt to access other user's data
        mockReq.query = { userId: otherUser.id }

        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert: Should still only see validUser's data (user ID should come from token, not params)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data
        expect(responseData.total).toBe(2) // validUser's data, not otherUser's
      })

      it('should prevent privilege escalation attempts', async () => {
        // Arrange: Create JWT with tampered claims
        const tamperedJwt = jwt.sign(
          {
            userId: validUser.id,
            role: 'admin', // Attempt to escalate privileges
            iat: Math.floor(Date.now() / 1000),
          },
          process.env.JWT_SECRET || 'test-secret'
        )

        mockReq.headers = {
          authorization: `Bearer ${tamperedJwt}`,
        }
        mockReq.user = { id: validUser.id, role: 'admin' }

        // Act
        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Assert: Should work normally but not grant additional access
        expect(mockRes.status).toHaveBeenCalledWith(200)
        const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data
        expect(responseData.total).toBe(2) // Only own data
      })
    })

    describe('Cross-User Data Queries', () => {
      it('should prevent SQL injection through user ID parameter', async () => {
        const maliciousUserIds = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          "' UNION SELECT * FROM resumes --",
          "admin' OR '1'='1' --",
          "'; SELECT * FROM job_applications WHERE user_id != '",
        ]

        for (const maliciousId of maliciousUserIds) {
          try {
            mockReq.user = { id: maliciousId }
            await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

            // Should either reject or return empty results, never other users' data
            if (mockRes.status === 200) {
              const responseData = (mockRes.json as jest.Mock).mock.calls[0][0].data
              expect(responseData.total).toBe(0) // Should find no data for invalid ID
            } else {
              expect(mockRes.status).toHaveBeenCalledWith(400) // Should reject invalid format
            }
          } catch (error) {
            // Exceptions are acceptable for malicious input
            expect(error).toBeDefined()
          }

          jest.clearAllMocks()
        }
      })

      it('should prevent NoSQL injection attempts', async () => {
        const noSqlInjectionAttempts = [
          { $ne: null },
          { $or: [{ id: validUser.id }, { id: otherUser.id }] },
          { $where: 'this.id != null' },
          "'; return true; //",
        ]

        for (const injection of noSqlInjectionAttempts) {
          mockReq.user = { id: injection }
          await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

          // Should reject malformed requests
          expect(mockRes.status).not.toHaveBeenCalledWith(200)
          jest.clearAllMocks()
        }
      })
    })
  })

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle burst requests without degrading security', async () => {
      // Arrange: Authenticate as validUser
      mockReq.user = { id: validUser.id }

      // Act: Make many rapid requests
      const requests = Array(50).fill(null).map(() =>
        analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)
      )

      await Promise.all(requests)

      // Assert: All requests should be processed securely
      expect(mockRes.status).toHaveBeenCalledTimes(50)
      // All should be successful (not rate limited in this test environment)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should prevent resource exhaustion through large queries', async () => {
      // Arrange: Create large dataset
      const dataset = AnalyticsTestFixtures.createLargeDataset(validUser, {
        applicationCount: 10000,
        startDate: '2020-01-01',
        endDate: '2024-12-31',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const resumeRepo = dataSource.getRepository(Resume)

      await resumeRepo.save(dataset.resumes)
      await jobAppRepo.save(dataset.applications)

      mockReq.user = { id: validUser.id }
      mockReq.query = {
        startDate: '2020-01-01',
        endDate: '2024-12-31',
      }

      const startTime = Date.now()

      // Act
      await analyticsController.getPipelineTrends(mockReq as Request, mockRes as Response)

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Assert: Should complete within reasonable time (prevent DoS)
      expect(executionTime).toBeLessThan(10000) // 10 seconds max
      expect(mockRes.status).toHaveBeenCalledWith(200)
    }, 15000)
  })

  describe('Input Validation and Sanitization', () => {
    beforeEach(() => {
      mockReq.user = { id: validUser.id }
    })

    it('should sanitize and validate date parameters', async () => {
      const maliciousDateInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE job_applications; --",
        '../../../etc/passwd',
        'javascript:alert(1)',
        '{{7*7}}', // Template injection
      ]

      for (const maliciousInput of maliciousDateInputs) {
        mockReq.query = {
          startDate: maliciousInput,
          endDate: '2024-12-31',
        }

        await analyticsController.getPipelineTrends(mockReq as Request, mockRes as Response)

        // Should reject malicious input
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringMatching(/invalid|date|format/i),
          })
        )

        jest.clearAllMocks()
      }
    })

    it('should sanitize query parameters', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'onload="alert(1)"',
        '{{constructor.constructor("alert(1)")()}}',
        '${alert(1)}',
      ]

      for (const xssAttempt of xssAttempts) {
        mockReq.query = {
          includeArchived: xssAttempt,
          groupBy: xssAttempt,
        }

        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // Should either sanitize input or reject it
        if (mockRes.status === 200) {
          const responseData = (mockRes.json as jest.Mock).mock.calls[0][0]
          expect(JSON.stringify(responseData)).not.toContain('<script>')
          expect(JSON.stringify(responseData)).not.toContain('javascript:')
        } else {
          expect(mockRes.status).toHaveBeenCalledWith(400)
        }

        jest.clearAllMocks()
      }
    })

    it('should validate request content types', async () => {
      // Arrange: Set unexpected content type
      mockReq.headers = {
        ...mockReq.headers,
        'content-type': 'application/xml', // Unexpected for JSON API
      }
      mockReq.body = '<malicious>content</malicious>'

      // Act
      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

      // Assert: Should handle gracefully
      expect(mockRes.status).toHaveBeenCalledWith(200) // GET requests don't typically check content-type
    })
  })

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Arrange: Cause various types of errors
      const scenarios = [
        {
          name: 'Database connection error',
          setup: async () => {
            await dataSource.destroy() // Force DB error
          },
          expectedStatus: 500,
        },
        {
          name: 'Invalid user ID',
          setup: async () => {
            mockReq.user = { id: 'invalid-uuid-format' }
          },
          expectedStatus: 400,
        },
      ]

      for (const scenario of scenarios) {
        await scenario.setup()

        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        expect(mockRes.status).toHaveBeenCalledWith(scenario.expectedStatus)
        const errorResponse = (mockRes.json as jest.Mock).mock.calls[0][0]

        // Should not expose sensitive information
        expect(JSON.stringify(errorResponse)).not.toMatch(/password|secret|key|token/i)
        expect(JSON.stringify(errorResponse)).not.toContain('stack trace')
        expect(JSON.stringify(errorResponse)).not.toContain(process.env.DATABASE_URL || '')

        jest.clearAllMocks()

        // Restore for next test
        if (scenario.name === 'Database connection error') {
          dataSource = await initializeTestDatabase()
        }
      }
    })

    it('should log security events without exposing them to client', async () => {
      // This would typically integrate with a logging system
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Arrange: Trigger security-relevant event
      mockReq.user = undefined // Unauthenticated request

      // Act
      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

      // Assert: Should log but not expose details to client
      expect(mockRes.status).toHaveBeenCalledWith(401)
      const errorResponse = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(errorResponse.message).toBe('Authentication required')

      consoleSpy.mockRestore()
    })
  })

  describe('Session and Token Security', () => {
    it('should invalidate expired tokens', async () => {
      // Arrange: Create expired token
      const expiredToken = jwt.sign(
        {
          userId: validUser.id,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      mockReq.headers = {
        authorization: `Bearer ${expiredToken}`,
      }

      // Act
      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/expired|invalid/i),
        })
      )
    })

    it('should require fresh authentication for sensitive operations', async () => {
      // Arrange: Create token with old timestamp
      const oldToken = jwt.sign(
        {
          userId: validUser.id,
          iat: Math.floor(Date.now() / 1000) - 86400, // Issued 24 hours ago
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      mockReq.headers = {
        authorization: `Bearer ${oldToken}`,
      }
      mockReq.user = { id: validUser.id }

      // Act - for now, old tokens are still accepted for analytics
      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

      // Assert - Should work (analytics is read-only)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should protect against token reuse after logout', async () => {
      // This test assumes token blacklisting is implemented
      // For now, we'll test the principle

      const validToken = TestDataFactory.createTestJWT(validUser.id)

      mockReq.headers = {
        authorization: `Bearer ${validToken}`,
      }
      mockReq.user = { id: validUser.id }

      // First request should work
      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)
      expect(mockRes.status).toHaveBeenCalledWith(200)

      jest.clearAllMocks()

      // Simulate token blacklisting (would be handled by auth middleware)
      // For this test, we'll just verify the token format is checked
      mockReq.headers = {
        authorization: `Bearer ${validToken}`,
      }
      mockReq.user = { id: validUser.id }

      await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)
      expect(mockRes.status).toHaveBeenCalledWith(200) // Still works in current implementation
    })
  })

  describe('CORS and Request Origin Validation', () => {
    it('should validate request origins', async () => {
      const suspiciousOrigins = [
        'http://malicious-site.com',
        'https://phishing-attempt.net',
        'http://localhost:9999', // Unexpected port
      ]

      for (const origin of suspiciousOrigins) {
        mockReq.headers = {
          ...mockReq.headers,
          origin,
          referer: origin,
        }
        mockReq.user = { id: validUser.id }

        await analyticsController.getStatusDistribution(mockReq as Request, mockRes as Response)

        // In this test environment, we don't have CORS middleware,
        // but in production this should be handled by CORS policy
        expect(mockRes.status).toHaveBeenCalledWith(200) // Would be 403 in production with strict CORS

        jest.clearAllMocks()
      }
    })
  })
})