/**
 * Integration tests for authentication endpoints using Testcontainers PostgreSQL
 * Tests complete request/response cycles with real database integration
 */

import express from 'express'
import { json } from 'body-parser'
import request from 'supertest'
import type { DataSource } from 'typeorm'

import { AuthController } from '../../controllers/authController'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase.testcontainers'
import { TestDataFactory } from '../../test/testUtils'

const createTestApp = (): express.Application => {
  const app = express()
  app.use(json())

  const authController = new AuthController()

  // Setup route handlers with proper error handling
  app.post('/auth/register', async (req, res) => {
    try {
      await authController.register(req, res)
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  app.post('/auth/login', async (req, res) => {
    try {
      await authController.login(req, res)
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return app
}

describe('Authentication Integration Tests - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource
  let app: express.Application

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
    app = createTestApp()
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      }

      const response = await request(app).post('/auth/register').send(userData).expect(201)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: 'newuser@example.com',
              firstName: 'New',
              lastName: 'User',
              isActive: true,
            }),
            token: expect.any(String),
          }),
        })
      )

      // Verify user was created in PostgreSQL database
      const userRepository = dataSource.getRepository(User)
      const savedUser = await userRepository.findOne({
        where: { email: 'newuser@example.com' },
      })
      expect(savedUser).toBeDefined()
      expect(savedUser?.firstName).toBe('New')
      expect(savedUser?.lastName).toBe('User')
      expect(savedUser?.isActive).toBe(true)
    })

    it('should return 409 when registering with existing email', async () => {
      // Create existing user in database
      const userRepository = dataSource.getRepository(User)
      await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'existing@example.com',
          firstName: 'Existing',
          lastName: 'User',
        })
      )

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Another',
        lastName: 'User',
      }

      const response = await request(app).post('/auth/register').send(userData).expect(409)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists'),
        })
      )
    })

    it('should return 400 with missing required fields', async () => {
      const userData = {
        email: 'incomplete@example.com',
        // missing password, firstName, lastName
      }

      const response = await request(app).post('/auth/register').send(userData).expect(400)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required'),
        })
      )
    })

    it('should return 400 with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }

      const response = await request(app).post('/auth/register').send(userData).expect(400)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('email'),
        })
      )
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userRepository = dataSource.getRepository(User)
      const hashedPassword = '$2b$10$example.hash.for.testing.purposes'

      await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'testuser@example.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
        })
      )
    })

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'password123', // This would be validated against the hashed password
      }

      const response = await request(app).post('/auth/login').send(loginData).expect(200)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: 'testuser@example.com',
              firstName: 'Test',
              lastName: 'User',
            }),
            token: expect.any(String),
          }),
        })
      )
    })

    it('should return 401 with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      const response = await request(app).post('/auth/login').send(loginData).expect(401)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid credentials'),
        })
      )
    })

    it('should return 401 with invalid password', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'wrongpassword',
      }

      const response = await request(app).post('/auth/login').send(loginData).expect(401)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid credentials'),
        })
      )
    })

    it('should return 400 with missing credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        // missing password
      }

      const response = await request(app).post('/auth/login').send(loginData).expect(400)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required'),
        })
      )
    })
  })

  describe('PostgreSQL-specific integration features', () => {
    it('should handle PostgreSQL case-insensitive email lookup', async () => {
      // Create user with lowercase email
      const userRepository = dataSource.getRepository(User)
      const hashedPassword = '$2b$10$example.hash.for.testing.purposes'

      await userRepository.save(
        TestDataFactory.createMockUser({
          email: 'casetest@example.com',
          password: hashedPassword,
          firstName: 'Case',
          lastName: 'Test',
          isActive: true,
        })
      )

      // Try to login with uppercase email (should work with PostgreSQL ILIKE)
      const loginData = {
        email: 'CASETEST@EXAMPLE.COM',
        password: 'password123',
      }

      const response = await request(app).post('/auth/login').send(loginData).expect(200)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: 'casetest@example.com', // Original lowercase email returned
            }),
          }),
        })
      )
    })

    it('should handle PostgreSQL unique constraint violations gracefully', async () => {
      // First registration should succeed
      const userData1 = {
        email: 'unique@example.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User',
      }

      await request(app).post('/auth/register').send(userData1).expect(201)

      // Second registration with same email should fail with proper PostgreSQL constraint handling
      const userData2 = {
        email: 'unique@example.com',
        password: 'different123',
        firstName: 'Second',
        lastName: 'User',
      }

      const response = await request(app).post('/auth/register').send(userData2).expect(409)

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists'),
        })
      )

      // Verify only the first user exists in PostgreSQL
      const userRepository = dataSource.getRepository(User)
      const users = await userRepository.find({
        where: { email: 'unique@example.com' },
      })
      expect(users).toHaveLength(1)
      expect(users[0].firstName).toBe('First')
    })

    it('should properly handle PostgreSQL timestamp with time zone fields', async () => {
      const beforeRegistration = new Date()

      const userData = {
        email: 'timestamp@example.com',
        password: 'password123',
        firstName: 'Time',
        lastName: 'Stamp',
      }

      await request(app).post('/auth/register').send(userData).expect(201)

      const afterRegistration = new Date()

      // Verify PostgreSQL timestamp fields are set correctly
      const userRepository = dataSource.getRepository(User)
      const savedUser = await userRepository.findOne({
        where: { email: 'timestamp@example.com' },
      })

      expect(savedUser).toBeDefined()
      expect(savedUser?.createdAt).toBeDefined()
      expect(savedUser?.updatedAt).toBeDefined()

      const createdAt = new Date(savedUser?.createdAt || '')
      const updatedAt = new Date(savedUser?.updatedAt || '')

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterRegistration.getTime())
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime())
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterRegistration.getTime())
    })

    it('should handle concurrent registration attempts with PostgreSQL locks', async () => {
      const userData = {
        email: 'concurrent@example.com',
        password: 'password123',
        firstName: 'Concurrent',
        lastName: 'Test',
      }

      // Simulate concurrent registration attempts
      const promises = [
        request(app).post('/auth/register').send(userData),
        request(app).post('/auth/register').send(userData),
        request(app).post('/auth/register').send(userData),
      ]

      const responses = await Promise.all(promises)

      // One should succeed (201), others should fail (409)
      const successCount = responses.filter(r => r.status === 201).length
      const conflictCount = responses.filter(r => r.status === 409).length

      expect(successCount).toBe(1)
      expect(conflictCount).toBe(2)

      // Verify only one user was created in PostgreSQL
      const userRepository = dataSource.getRepository(User)
      const users = await userRepository.find({
        where: { email: 'concurrent@example.com' },
      })
      expect(users).toHaveLength(1)
    })
  })
})
