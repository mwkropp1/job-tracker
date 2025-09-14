/**
 * Unit tests for AuthController
 * Tests authentication endpoints, validation, security, and error handling
 */

import type { Request, Response } from 'express';

import { AuthController } from '../../controllers/authController';
import { UserRepository } from '../../repositories/UserRepository';
import { MockExpressUtils, TestDataFactory } from '../../test/testUtils';
import { EnhancedTestAssertions } from '../../test/assertions';
import { TEST_CONSTANTS } from '../../test/constants';

// Mock dependencies
jest.mock('../../repositories/UserRepository')
jest.mock('../../utils/auth')
jest.mock('express-validator')
jest.mock('../../config/database', () => ({
  AppDataSource: {}
}))

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>
const mockValidator = require('express-validator')

const mockAuth = require('../../utils/auth')

describe('AuthController', () => {
  let authController: AuthController
  let mockUserRepo: jest.Mocked<UserRepository>
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock user repository
    mockUserRepo = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findActiveUsers: jest.fn(),
      create: jest.fn()
    } as any

    mockUserRepository.mockImplementation(() => mockUserRepo)

    // Setup auth utilities
    mockAuth.hashPassword = jest.fn()
    mockAuth.comparePassword = jest.fn()
    mockAuth.generateToken = jest.fn()

    // Setup validator
    mockValidator.validationResult = jest.fn(() => ({
      isEmpty: () => true,
      array: () => []
    }))

    // Create controller instance
    authController = new AuthController()

    // Setup mock request and response
    mockReq = MockExpressUtils.createMockRequest()
    mockRes = MockExpressUtils.createMockResponse()
  })

  // User registration tests
  describe('User Registration', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      }
    })

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashedPassword123'
      const mockUser = TestDataFactory.createMockUser({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe'
      })
      const token = 'jwt-token-123'

      // Setup mocks
      mockUserRepo.findByEmail.mockResolvedValue(null) // No existing user
      mockAuth.hashPassword.mockResolvedValue(hashedPassword)
      mockUserRepo.createUser.mockResolvedValue(mockUser)
      mockAuth.generateToken.mockReturnValue(token)

      await authController.register(mockReq as Request, mockRes as Response)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        }),
        token
      })

      // Verify password is excluded from response
      const responseCall = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(responseCall.user.password).toBeUndefined()

      // Verify service calls
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockAuth.hashPassword).toHaveBeenCalledWith('password123')
      expect(mockUserRepo.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe'
      })
      expect(mockAuth.generateToken).toHaveBeenCalledWith(mockUser.id)
    })

    it('should register user with minimal required fields', async () => {
      mockReq.body = {
        email: 'minimal@example.com',
        password: 'password123'
      }

      const hashedPassword = 'hashedPassword123'
      const mockUser = TestDataFactory.createMockUser({
        email: 'minimal@example.com',
        password: hashedPassword
      })

      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue(hashedPassword)
      mockUserRepo.createUser.mockResolvedValue(mockUser)
      mockAuth.generateToken.mockReturnValue('token')

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockUserRepo.createUser).toHaveBeenCalledWith({
        email: 'minimal@example.com',
        password: hashedPassword,
        firstName: undefined,
        lastName: undefined
      })
    })

    it('should return validation errors for invalid input', async () => {
      // Mock validation failure
      mockValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { field: 'email', msg: 'Invalid email format' },
          { field: 'password', msg: 'Password too short' }
        ]
      })

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        errors: [
          { field: 'email', msg: 'Invalid email format' },
          { field: 'password', msg: 'Password too short' }
        ]
      })

      // Verify no user creation attempted
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled()
      expect(mockUserRepo.createUser).not.toHaveBeenCalled()
    })

    it('should reject duplicate email registration', async () => {
      const existingUser = TestDataFactory.createMockUser({
        email: 'test@example.com'
      })

      mockUserRepo.findByEmail.mockResolvedValue(existingUser)

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User with this email already exists'
      })

      // Verify no user creation attempted
      expect(mockUserRepo.createUser).not.toHaveBeenCalled()
    })

    it('should handle password hashing errors', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockRejectedValue(new Error('Hashing failed'))

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error registering user',
        error: 'Hashing failed'
      })
    })

    it('should handle database errors during registration', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue('hashedPassword')
      mockUserRepo.createUser.mockRejectedValue(new Error('Database connection failed'))

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error registering user',
        error: 'Database connection failed'
      })
    })

    it('should handle token generation errors', async () => {
      const mockUser = TestDataFactory.createMockUser()

      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue('hashedPassword')
      mockUserRepo.createUser.mockResolvedValue(mockUser)
      mockAuth.generateToken.mockImplementation(() => {
        throw new Error('Token generation failed')
      })

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error registering user',
        error: 'Token generation failed'
      })
    })
  })

  // User login tests
  describe('User Login', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      }
    })

    it('should successfully log in with valid credentials', async () => {
      const mockUser = TestDataFactory.createMockUser({
        email: 'test@example.com',
        password: 'hashedPassword123',
        isActive: true
      })
      const token = 'jwt-token-123'

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockAuth.comparePassword.mockResolvedValue(true)
      mockAuth.generateToken.mockReturnValue(token)

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        }),
        token
      })

      // Verify password is excluded from response
      const responseCall = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(responseCall.user.password).toBeUndefined()

      // Verify service calls
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockAuth.comparePassword).toHaveBeenCalledWith('password123', mockUser.password)
      expect(mockAuth.generateToken).toHaveBeenCalledWith(mockUser.id)
    })

    it('should return validation errors for invalid login input', async () => {
      mockValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { field: 'email', msg: 'Email is required' }
        ]
      })

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        errors: [
          { field: 'email', msg: 'Email is required' }
        ]
      })

      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled()
    })

    it('should reject login for non-existent user', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null)

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid email or password'
      })

      expect(mockAuth.comparePassword).not.toHaveBeenCalled()
    })

    it('should reject login with incorrect password', async () => {
      const mockUser = TestDataFactory.createMockUser({
        email: 'test@example.com',
        isActive: true
      })

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockAuth.comparePassword.mockResolvedValue(false)

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid email or password'
      })

      expect(mockAuth.generateToken).not.toHaveBeenCalled()
    })

    it('should reject login for inactive user', async () => {
      const mockUser = TestDataFactory.createMockUser({
        email: 'test@example.com',
        isActive: false
      })

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockAuth.comparePassword.mockResolvedValue(true)

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account is deactivated'
      })

      expect(mockAuth.generateToken).not.toHaveBeenCalled()
    })

    it('should handle password comparison errors', async () => {
      const mockUser = TestDataFactory.createMockUser()

      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockAuth.comparePassword.mockRejectedValue(new Error('Comparison failed'))

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error logging in',
        error: 'Comparison failed'
      })
    })

    it('should handle database errors during login', async () => {
      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database error'))

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error logging in',
        error: 'Database error'
      })
    })
  })

  // Get profile tests
  describe('Get Profile', () => {
    beforeEach(() => {
      mockReq.user = { userId: 'test-user-id' }
    })

    it('should successfully retrieve user profile', async () => {
      const mockUser = TestDataFactory.createMockUser({
        id: 'test-user-id'
      })

      mockUserRepo.findById.mockResolvedValue(mockUser)

      await authController.getProfile(mockReq as any, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        })
      })

      // Verify password is excluded from response
      const responseCall = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(responseCall.user.password).toBeUndefined()

      expect(mockUserRepo.findById).toHaveBeenCalledWith('test-user-id')
    })

    it('should handle missing authentication', async () => {
      mockReq.user = undefined

      await authController.getProfile(mockReq as any, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Authentication required'
      })

      expect(mockUserRepo.findById).not.toHaveBeenCalled()
    })

    it('should handle non-existent user', async () => {
      mockUserRepo.findById.mockResolvedValue(null)

      await authController.getProfile(mockReq as any, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found'
      })
    })

    it('should handle database errors during profile retrieval', async () => {
      mockUserRepo.findById.mockRejectedValue(new Error('Database error'))

      await authController.getProfile(mockReq as any, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error retrieving profile',
        error: 'Database error'
      })
    })
  })

  // Security considerations
  describe('Security Considerations', () => {
    it('should not leak password information in any response', async () => {
      const mockUser = TestDataFactory.createMockUser({
        password: 'secretHashedPassword'
      })

      // Test registration response
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue('hashedPassword')
      mockUserRepo.createUser.mockResolvedValue(mockUser)
      mockAuth.generateToken.mockReturnValue('token')

      mockReq.body = { email: 'test@test.com', password: 'password' }

      await authController.register(mockReq as Request, mockRes as Response)

      const registerResponse = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(registerResponse.user.password).toBeUndefined()

      // Reset mocks for login test
      jest.clearAllMocks()
      mockRes = MockExpressUtils.createMockResponse()

      // Test login response
      mockUserRepo.findByEmail.mockResolvedValue(mockUser)
      mockAuth.comparePassword.mockResolvedValue(true)
      mockAuth.generateToken.mockReturnValue('token')

      await authController.login(mockReq as Request, mockRes as Response)

      const loginResponse = (mockRes.json as jest.Mock).mock.calls[0][0]
      expect(loginResponse.user.password).toBeUndefined()
    })

    it('should handle malformed JWT payloads gracefully', async () => {
      mockReq.user = { userId: null }

      await authController.getProfile(mockReq as any, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should prevent timing attacks on email lookup', async () => {
      // This test ensures consistent response times regardless of user existence
      const startTime = Date.now()

      // Test non-existent user
      mockUserRepo.findByEmail.mockResolvedValue(null)
      await authController.login(mockReq as Request, mockRes as Response)

      const nonExistentUserTime = Date.now() - startTime

      // Reset for existing user test
      jest.clearAllMocks()
      mockRes = MockExpressUtils.createMockResponse()

      const existingUser = TestDataFactory.createMockUser()
      mockUserRepo.findByEmail.mockResolvedValue(existingUser)
      mockAuth.comparePassword.mockResolvedValue(false)

      const startTime2 = Date.now()
      await authController.login(mockReq as Request, mockRes as Response)
      const existingUserTime = Date.now() - startTime2

      // The response times should be relatively similar
      // (This is a basic check - real timing attack prevention would require more sophisticated measures)
      expect(Math.abs(existingUserTime - nonExistentUserTime)).toBeLessThan(100)
    })
  })

  // Edge cases and error handling
  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com'
      mockReq.body = { email: longEmail, password: 'password' }

      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue('hashed')
      mockUserRepo.createUser.mockRejectedValue(new Error('Email too long'))

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      mockReq.body = { email: 'test@example.com', password: specialPassword }

      const mockUser = TestDataFactory.createMockUser()
      mockUserRepo.findByEmail.mockResolvedValue(null)
      mockAuth.hashPassword.mockResolvedValue('hashedSpecialPassword')
      mockUserRepo.createUser.mockResolvedValue(mockUser)
      mockAuth.generateToken.mockReturnValue('token')

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockAuth.hashPassword).toHaveBeenCalledWith(specialPassword)
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should handle empty request bodies gracefully', async () => {
      mockReq.body = {}

      mockValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { field: 'email', msg: 'Email is required' },
          { field: 'password', msg: 'Password is required' }
        ]
      })

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should handle null/undefined user data in requests', async () => {
      mockReq.body = {
        email: null,
        password: undefined,
        firstName: '',
        lastName: null
      }

      mockValidator.validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'email', msg: 'Invalid email' }]
      })

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockUserRepo.createUser).not.toHaveBeenCalled()
    })
  })
})