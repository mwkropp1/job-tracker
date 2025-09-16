/**
 * Integration tests for AuthController using Testcontainers PostgreSQL
 * Tests authentication endpoints with real database operations
 */

import type { Request, Response } from 'express'
import type { DataSource } from 'typeorm'
import bcrypt from 'bcrypt'

import { AuthController } from '../../controllers/authController'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase'
import { TestDataFactory, MockExpressUtils } from '../../test'

// Mock validation middleware
jest.mock('express-validator', () => ({
  validationResult: () => ({
    isEmpty: () => true,
    array: () => [],
  }),
}))

describe('AuthController - Testcontainers PostgreSQL Integration', () => {
  let dataSource: DataSource
  let authController: AuthController
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

    // Create controller instance
    authController = new AuthController()

    // Setup mock request and response
    mockReq = MockExpressUtils.createMockRequest()
    mockRes = MockExpressUtils.createMockResponse()
  })

  describe('User Registration', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      }
    })

    it('should successfully register a new user', async () => {
      await authController.register(mockReq as Request, mockRes as Response)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
            }),
            token: expect.any(String),
          }),
        })
      )

      // Verify user was created in database
      const userRepository = dataSource.getRepository(User)
      const savedUser = await userRepository.findOne({
        where: { email: 'test@example.com' },
      })
      expect(savedUser).toBeDefined()
      expect(savedUser?.firstName).toBe('John')
      expect(savedUser?.lastName).toBe('Doe')
      expect(savedUser?.isActive).toBe(true)

      // Verify password was hashed
      expect(savedUser?.password).not.toBe('password123')
      const isValidPassword = await bcrypt.compare('password123', savedUser?.password || '')
      expect(isValidPassword).toBe(true)
    })

    it('should return 409 when user already exists', async () => {
      // Create existing user
      const userRepository = dataSource.getRepository(User)
      await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'test@example.com',
          firstName: 'Existing',
          lastName: 'User',
        })
      )

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists'),
        })
      )
    })

    it('should return 400 with missing required fields', async () => {
      mockReq.body = {
        email: 'test@example.com',
        // missing password, firstName, lastName
      }

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required'),
        })
      )
    })

    it('should return 400 with invalid email format', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      }

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('email'),
        })
      )
    })

    it('should return 400 with weak password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      }

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('password'),
        })
      )
    })
  })

  describe('User Login', () => {
    let existingUser: User

    beforeEach(async () => {
      // Create a test user
      const userRepository = dataSource.getRepository(User)
      const hashedPassword = await bcrypt.hash('password123', 10)

      existingUser = await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'existing@example.com',
          password: hashedPassword,
          firstName: 'Existing',
          lastName: 'User',
          isActive: true,
        })
      )

      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
      }
    })

    it('should successfully login with valid credentials', async () => {
      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: existingUser.id,
              email: 'existing@example.com',
              firstName: 'Existing',
              lastName: 'User',
            }),
            token: expect.any(String),
          }),
        })
      )
    })

    it('should return 401 with invalid email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid credentials'),
        })
      )
    })

    it('should return 401 with invalid password', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'wrongpassword',
      }

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid credentials'),
        })
      )
    })

    it('should return 401 for inactive user', async () => {
      // Update user to be inactive
      const userRepository = dataSource.getRepository(User)
      await userRepository.update(existingUser.id, { isActive: false })

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('account is disabled'),
        })
      )
    })

    it('should return 400 with missing credentials', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        // missing password
      }

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required'),
        })
      )
    })
  })

  describe('PostgreSQL-specific features', () => {
    it('should handle PostgreSQL case-insensitive email queries', async () => {
      // Create user with lowercase email
      const userRepository = dataSource.getRepository(User)
      const hashedPassword = await bcrypt.hash('password123', 10)

      await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'testcase@example.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
        })
      )

      // Test login with uppercase email (PostgreSQL ILIKE feature)
      mockReq.body = {
        email: 'TESTCASE@EXAMPLE.COM',
        password: 'password123',
      }

      await authController.login(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: 'testcase@example.com',
            }),
          }),
        })
      )
    })

    it('should handle PostgreSQL timestamp with time zone for user creation', async () => {
      const beforeRegistration = new Date()

      mockReq.body = {
        email: 'timestamp@example.com',
        password: 'password123',
        firstName: 'Time',
        lastName: 'Stamp',
      }

      await authController.register(mockReq as Request, mockRes as Response)

      const afterRegistration = new Date()

      // Verify user was created in database with correct timestamp
      const userRepository = dataSource.getRepository(User)
      const savedUser = await userRepository.findOne({
        where: { email: 'timestamp@example.com' },
      })

      expect(savedUser).toBeDefined()
      expect(savedUser?.createdAt).toBeDefined()
      expect(savedUser?.updatedAt).toBeDefined()

      const createdAt = new Date(savedUser?.createdAt || '')
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterRegistration.getTime())
    })

    it('should support PostgreSQL unique constraint violations', async () => {
      // Create first user
      mockReq.body = {
        email: 'unique@example.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User',
      }

      await authController.register(mockReq as Request, mockRes as Response)
      expect(mockRes.status).toHaveBeenCalledWith(201)

      // Reset mock calls
      jest.clearAllMocks()

      // Try to create second user with same email (should trigger PostgreSQL unique constraint)
      mockReq.body = {
        email: 'unique@example.com',
        password: 'different123',
        firstName: 'Second',
        lastName: 'User',
      }

      await authController.register(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists'),
        })
      )

      // Verify only one user exists in database
      const userRepository = dataSource.getRepository(User)
      const users = await userRepository.find({
        where: { email: 'unique@example.com' },
      })
      expect(users).toHaveLength(1)
      expect(users[0].firstName).toBe('First') // Original user preserved
    })
  })
})
