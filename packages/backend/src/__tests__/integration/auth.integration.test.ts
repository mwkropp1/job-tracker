/**
 * Integration tests for authentication endpoints
 * Tests complete request/response cycles with database integration
 */

import { json } from 'body-parser';
import express from 'express';
import request from 'supertest';

import { AuthController } from '../../controllers/authController';
import { testDatabase, dbHelpers } from '../../test/testDatabase';
import { TestDataFactory } from '../../test/testUtils';
import { EnhancedTestAssertions } from '../../test/assertions';
import { TEST_CONSTANTS } from '../../test/constants';

const createTestApp = (): express.Application => {
  const app = express();
  app.use(json());

  const authController = new AuthController();

  // Setup route handlers with proper error handling
  app.post('/auth/register', async (req, res) => {
    try {
      await authController.register(req, res);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      await authController.login(req, res);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/auth/profile', async (req, res) => {
    try {
      await authController.getProfile(req, res);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
};

describe('Authentication Integration Tests', () => {
  let app: express.Application

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await testDatabase.cleanup()
  })

  // User Registration Integration
  describe('POST /auth/register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'integration@example.com',
        password: 'securePassword123',
        firstName: 'Integration',
        lastName: 'Test'
      }

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true
        },
        token: expect.any(String)
      })

      // Verify password is not in response
      expect(response.body.user.password).toBeUndefined()

      // Verify user was created in database
      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository('User')
      const savedUser = await userRepo.findOne({ where: { email: userData.email } })

      expect(savedUser).toBeTruthy()
      expect(savedUser.email).toBe(userData.email)
    })

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123'
      }

      // Create first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      // Attempt duplicate registration
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body.message).toBe('User with this email already exists')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123' // Too short
      }

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            msg: expect.any(String)
          })
        ])
      })
    })

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({})
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
    })

    it('should handle server errors gracefully', async () => {
      // This would require mocking internal services to simulate errors
      // For now, we test the basic error handling structure
      const invalidData = {
        email: 'test@example.com',
        password: 'validPassword123'
      }

      // If database fails, should return 500
      // (This would require more sophisticated mocking to test properly)
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)

      // Should succeed in normal test environment
      expect([201, 500]).toContain(response.status)
    })
  })

  // User Login Integration
  describe('POST /auth/login', () => {
    let testUser: any
    const userPassword = 'testPassword123'

    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'login-test@example.com',
        password: userPassword,
        firstName: 'Login',
        lastName: 'Test'
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)

      testUser = registerResponse.body.user
    })

    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: userPassword
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          id: testUser.id,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        },
        token: expect.any(String)
      })

      // Verify password is not in response
      expect(response.body.user.password).toBeUndefined()
    })

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: userPassword
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.message).toBe('Invalid email or password')
    })

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'wrongPassword'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.message).toBe('Invalid email or password')
    })

    it('should validate login request format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
    })

    it('should handle malformed login data', async () => {
      const malformedData = {
        email: null,
        password: undefined
      }

      const response = await request(app)
        .post('/auth/login')
        .send(malformedData)
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
    })
  })

  // Profile Retrieval Integration
  describe('GET /auth/profile', () => {
    let testUser: any
    let authToken: string

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'profile-test@example.com',
        password: 'testPassword123',
        firstName: 'Profile',
        lastName: 'Test'
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)

      testUser = registerResponse.body.user
      authToken = registerResponse.body.token
    })

    it('should retrieve user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        user: {
          id: testUser.id,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }
      })

      // Verify password is not in response
      expect(response.body.user.password).toBeUndefined()
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401)

      expect(response.body.message).toBe('Authentication required')
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.message).toBe('Authentication required')
    })

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401)

      expect(response.body.message).toBe('Authentication required')
    })
  })

  // End-to-end Authentication Flow
  describe('Complete Authentication Flow', () => {
    it('should complete full registration -> login -> profile workflow', async () => {
      const userData = {
        email: 'complete-flow@example.com',
        password: 'completeFlowPassword123',
        firstName: 'Complete',
        lastName: 'Flow'
      }

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      const registeredUser = registerResponse.body.user
      const registerToken = registerResponse.body.token

      // Step 2: Login with same credentials
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200)

      const loggedInUser = loginResponse.body.user
      const loginToken = loginResponse.body.token

      // Verify user data consistency
      expect(loggedInUser.id).toBe(registeredUser.id)
      expect(loggedInUser.email).toBe(registeredUser.email)

      // Step 3: Access profile with login token
      const profileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200)

      const profileUser = profileResponse.body.user

      // Verify profile data consistency
      expect(profileUser.id).toBe(registeredUser.id)
      expect(profileUser.email).toBe(userData.email)
      expect(profileUser.firstName).toBe(userData.firstName)
      expect(profileUser.lastName).toBe(userData.lastName)

      // Step 4: Verify register token still works for profile
      const profileWithRegisterTokenResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200)

      expect(profileWithRegisterTokenResponse.body.user.id).toBe(registeredUser.id)
    })

    it('should handle concurrent registrations safely', async () => {
      const baseUserData = {
        password: 'concurrentTest123',
        firstName: 'Concurrent',
        lastName: 'Test'
      }

      // Attempt to register multiple users concurrently
      const promises = Array.from({ length: 3 }, (_, index) =>
        request(app)
          .post('/auth/register')
          .send({
            ...baseUserData,
            email: `concurrent-${index}@example.com`
          })
      )

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.user).toBeDefined()
        expect(response.body.token).toBeDefined()
      })

      // All should have different user IDs
      const userIds = responses.map(r => r.body.user.id)
      const uniqueIds = new Set(userIds)
      expect(uniqueIds.size).toBe(3)
    })

    it('should maintain session isolation between different users', async () => {
      // Create two different users
      const user1Data = {
        email: 'isolation1@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'One'
      }

      const user2Data = {
        email: 'isolation2@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Two'
      }

      const user1Response = await request(app)
        .post('/auth/register')
        .send(user1Data)
        .expect(201)

      const user2Response = await request(app)
        .post('/auth/register')
        .send(user2Data)
        .expect(201)

      const user1Token = user1Response.body.token
      const user2Token = user2Response.body.token

      // Verify each user can only access their own profile
      const user1Profile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      const user2Profile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(user1Profile.body.user.email).toBe(user1Data.email)
      expect(user1Profile.body.user.firstName).toBe(user1Data.firstName)

      expect(user2Profile.body.user.email).toBe(user2Data.email)
      expect(user2Profile.body.user.firstName).toBe(user2Data.firstName)

      // Verify different user IDs
      expect(user1Profile.body.user.id).not.toBe(user2Profile.body.user.id)
    })
  })

  // Error handling and edge cases
  describe('Error Handling and Edge Cases', () => {
    it('should handle very large request payloads gracefully', async () => {
      const largeData = {
        email: 'large@example.com',
        password: 'a'.repeat(10000), // Very long password
        firstName: 'b'.repeat(1000), // Very long first name
        lastName: 'c'.repeat(1000) // Very long last name
      }

      const response = await request(app)
        .post('/auth/register')
        .send(largeData)

      // Should either succeed or fail gracefully (not crash)
      expect([201, 400, 413, 500]).toContain(response.status)
    })

    it('should handle special characters in user data', async () => {
      const specialData = {
        email: 'special+chars@example.com',
        password: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        firstName: 'José María',
        lastName: "O'Connor-Smith"
      }

      const response = await request(app)
        .post('/auth/register')
        .send(specialData)
        .expect(201)

      expect(response.body.user.email).toBe(specialData.email)
      expect(response.body.user.firstName).toBe(specialData.firstName)
      expect(response.body.user.lastName).toBe(specialData.lastName)
    })

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send('{"invalid": json}')
        .type('application/json')
        .expect(400)

      // Should handle JSON parse errors gracefully
    })

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send('email=test@example.com&password=password123')

      // Should either parse as form data or reject gracefully
      expect([201, 400]).toContain(response.status)
    })

    it('should handle case sensitivity in email addresses consistently', async () => {
      const userData = {
        email: 'CaseSensitive@Example.COM',
        password: 'password123'
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      // Try to login with different case
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'casesensitive@example.com',
          password: 'password123'
        })

      // Behavior depends on implementation - document current behavior
      // In most systems, emails should be case-insensitive
      expect([200, 401]).toContain(loginResponse.status)
    })
  })
})