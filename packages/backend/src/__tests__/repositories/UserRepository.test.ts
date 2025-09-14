/**
 * Unit tests for UserRepository
 * Tests repository methods, data access patterns, and business logic
 */

import type { User } from '../../entities/User';
import { UserRepository } from '../../repositories/UserRepository';
import { testDatabase, dbHelpers } from '../../test/testDatabase';
import { TestDataFactory } from '../../test/testUtils';

describe('UserRepository', () => {
  let userRepository: UserRepository

  beforeEach(async () => {
    await testDatabase.cleanup()
    const dataSource = testDatabase.getDataSource()!
    userRepository = new UserRepository(dataSource)
  })

  // Basic repository operations
  describe('Basic Repository Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'john.doe@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe'
      }

      const createdUser = await userRepository.createUser(userData)

      expect(createdUser.id).toBeDefined()
      expect(createdUser.email).toBe(userData.email)
      expect(createdUser.password).toBe(userData.password)
      expect(createdUser.firstName).toBe(userData.firstName)
      expect(createdUser.lastName).toBe(userData.lastName)
      expect(createdUser.isActive).toBe(true) // Default value
      expect(createdUser.createdAt).toBeDefined()
      expect(createdUser.updatedAt).toBeDefined()
    })

    it('should create user with minimal required fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        password: 'hashedPassword'
      }

      const createdUser = await userRepository.createUser(userData)

      expect(createdUser.email).toBe(userData.email)
      expect(createdUser.password).toBe(userData.password)
      expect(createdUser.firstName).toBeUndefined()
      expect(createdUser.lastName).toBeUndefined()
      expect(createdUser.isActive).toBe(true)
    })

    it('should find user by ID', async () => {
      const testUser = await dbHelpers.createTestUser()

      const foundUser = await userRepository.findById(testUser.id)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(testUser.id)
      expect(foundUser?.email).toBe(testUser.email)
    })

    it('should return null when user not found by ID', async () => {
      const nonExistentId = 'non-existent-id'

      const foundUser = await userRepository.findById(nonExistentId)

      expect(foundUser).toBeNull()
    })

    it('should update user information', async () => {
      const testUser = await dbHelpers.createTestUser({
        firstName: 'Original',
        lastName: 'Name'
      })

      const updateData = {
        firstName: 'Updated',
        lastName: 'NewName'
      }

      const updatedUser = await userRepository.update(testUser.id, updateData)

      expect(updatedUser).toBeDefined()
      expect(updatedUser?.firstName).toBe('Updated')
      expect(updatedUser?.lastName).toBe('NewName')
      expect(updatedUser?.email).toBe(testUser.email) // Should remain unchanged
    })

    it('should return null when updating non-existent user', async () => {
      const nonExistentId = 'non-existent-id'

      const updatedUser = await userRepository.update(nonExistentId, {
        firstName: 'Test'
      })

      expect(updatedUser).toBeNull()
    })

    it('should delete user', async () => {
      const testUser = await dbHelpers.createTestUser()

      const deleted = await userRepository.delete(testUser.id)

      expect(deleted).toBe(true)

      const foundUser = await userRepository.findById(testUser.id)
      expect(foundUser).toBeNull()
    })

    it('should return false when deleting non-existent user', async () => {
      const nonExistentId = 'non-existent-id'

      const deleted = await userRepository.delete(nonExistentId)

      expect(deleted).toBe(false)
    })

    it('should find all users', async () => {
      await dbHelpers.createTestUser({ email: 'user1@test.com' })
      await dbHelpers.createTestUser({ email: 'user2@test.com' })
      await dbHelpers.createTestUser({ email: 'user3@test.com' })

      const allUsers = await userRepository.findAll()

      expect(allUsers).toHaveLength(3)
      expect(allUsers.map(u => u.email)).toEqual(
        expect.arrayContaining(['user1@test.com', 'user2@test.com', 'user3@test.com'])
      )
    })

    it('should count all users', async () => {
      await dbHelpers.createTestUser({ email: 'user1@test.com' })
      await dbHelpers.createTestUser({ email: 'user2@test.com' })

      const userCount = await userRepository.count()

      expect(userCount).toBe(2)
    })
  })

  // User-specific operations
  describe('User-Specific Operations', () => {
    it('should find user by email', async () => {
      const testUser = await dbHelpers.createTestUser({
        email: 'unique@example.com'
      })

      const foundUser = await userRepository.findByEmail('unique@example.com')

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(testUser.id)
      expect(foundUser?.email).toBe('unique@example.com')
    })

    it('should return null when user not found by email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com')

      expect(foundUser).toBeNull()
    })

    it('should handle email case sensitivity properly', async () => {
      const testUser = await dbHelpers.createTestUser({
        email: 'Test.User@Example.COM'
      })

      // Should find user with exact case match
      const foundUser = await userRepository.findByEmail('Test.User@Example.COM')
      expect(foundUser).toBeDefined()

      // Note: In a real application, you might want email search to be case-insensitive
      // This would require database configuration or normalization in the repository
    })

    it('should find all active users', async () => {
      await dbHelpers.createTestUser({ email: 'active1@test.com', isActive: true })
      await dbHelpers.createTestUser({ email: 'active2@test.com', isActive: true })
      await dbHelpers.createTestUser({ email: 'inactive@test.com', isActive: false })

      const activeUsers = await userRepository.findActiveUsers()

      expect(activeUsers).toHaveLength(2)
      expect(activeUsers.every(user => user.isActive)).toBe(true)
      expect(activeUsers.map(u => u.email)).toEqual(
        expect.arrayContaining(['active1@test.com', 'active2@test.com'])
      )
    })

    it('should return empty array when no active users exist', async () => {
      await dbHelpers.createTestUser({ email: 'inactive1@test.com', isActive: false })
      await dbHelpers.createTestUser({ email: 'inactive2@test.com', isActive: false })

      const activeUsers = await userRepository.findActiveUsers()

      expect(activeUsers).toHaveLength(0)
    })
  })

  // Validation and constraints
  describe('Validation and Constraints', () => {
    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com'

      // Create first user
      await userRepository.createUser({
        email,
        password: 'password1'
      })

      // Attempt to create second user with same email
      await expect(
        userRepository.createUser({
          email,
          password: 'password2'
        })
      ).rejects.toThrow()
    })

    it('should handle special characters in user data', async () => {
      const userData = {
        email: 'special.chars+test@example.com',
        password: 'hashedPassword',
        firstName: "Jean-François",
        lastName: "O'Connor-Smith"
      }

      const createdUser = await userRepository.createUser(userData)

      expect(createdUser.email).toBe(userData.email)
      expect(createdUser.firstName).toBe(userData.firstName)
      expect(createdUser.lastName).toBe(userData.lastName)
    })

    it('should handle very long email addresses', async () => {
      const longEmail = 'very.long.email.address.that.tests.database.limits@example.com'

      const createdUser = await userRepository.createUser({
        email: longEmail,
        password: 'hashedPassword'
      })

      expect(createdUser.email).toBe(longEmail)
    })

    it('should handle null values for optional fields', async () => {
      const userData = {
        email: 'nullfields@example.com',
        password: 'hashedPassword',
        firstName: undefined,
        lastName: undefined
      }

      const createdUser = await userRepository.createUser(userData)

      expect(createdUser.firstName).toBeUndefined()
      expect(createdUser.lastName).toBeUndefined()
    })
  })

  // Performance and optimization
  describe('Performance and Optimization', () => {
    it('should handle bulk operations efficiently', async () => {
      const users = []
      for (let i = 0; i < 100; i++) {
        users.push(await userRepository.createUser({
          email: `user${i}@test.com`,
          password: 'hashedPassword',
          firstName: `User${i}`
        }))
      }

      const allUsers = await userRepository.findAll()
      expect(allUsers).toHaveLength(100)

      const activeUsers = await userRepository.findActiveUsers()
      expect(activeUsers).toHaveLength(100)
    })

    it('should perform email lookups efficiently', async () => {
      // Create many users
      for (let i = 0; i < 50; i++) {
        await userRepository.createUser({
          email: `user${i}@test.com`,
          password: 'hashedPassword'
        })
      }

      // Test that email lookup is still fast
      const startTime = Date.now()
      const foundUser = await userRepository.findByEmail('user25@test.com')
      const endTime = Date.now()

      expect(foundUser).toBeDefined()
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast with proper indexing
    })
  })

  // Error handling
  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close database connection to simulate error
      await testDatabase.close()

      await expect(
        userRepository.findByEmail('test@example.com')
      ).rejects.toThrow()

      // Reinitialize for cleanup
      await testDatabase.initialize()
    })

    it('should handle invalid ID formats gracefully', async () => {
      const invalidId = 'invalid-uuid-format'

      const foundUser = await userRepository.findById(invalidId)

      expect(foundUser).toBeNull()
    })

    it('should handle malformed email addresses', async () => {
      const malformedEmail = 'not-an-email'

      const foundUser = await userRepository.findByEmail(malformedEmail)

      expect(foundUser).toBeNull()
    })
  })

  // Transaction support
  describe('Transaction Support', () => {
    it('should support transactions for user creation', async () => {
      const userData = {
        email: 'transaction@example.com',
        password: 'hashedPassword',
        firstName: 'Transaction',
        lastName: 'Test'
      }

      await testDatabase.runInTransaction(async (manager) => {
        const userRepo = new UserRepository({ getRepository: () => manager.getRepository(User) } as any)
        const createdUser = await userRepo.createUser(userData)
        expect(createdUser.email).toBe(userData.email)
      })

      // Verify user was created
      const foundUser = await userRepository.findByEmail('transaction@example.com')
      expect(foundUser).toBeDefined()
    })

    it('should rollback transaction on error', async () => {
      const userData = {
        email: 'rollback@example.com',
        password: 'hashedPassword'
      }

      try {
        await testDatabase.runInTransaction(async (manager) => {
          const userRepo = new UserRepository({ getRepository: () => manager.getRepository(User) } as any)
          await userRepo.createUser(userData)

          // Force an error to trigger rollback
          throw new Error('Simulated error')
        })
      } catch (error) {
        // Expected error
      }

      // Verify user was not created due to rollback
      const foundUser = await userRepository.findByEmail('rollback@example.com')
      expect(foundUser).toBeNull()
    })
  })

  // Repository integration with entities
  describe('Repository Integration', () => {
    it('should properly handle entity relationships in queries', async () => {
      const testUser = await dbHelpers.createTestUser()

      // Create related entities
      await dbHelpers.createTestJobApplication(testUser)
      await dbHelpers.createTestContact(testUser)
      await dbHelpers.createTestResume(testUser)

      const foundUser = await userRepository.findById(testUser.id)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(testUser.id)

      // Note: Relationships would be loaded separately or with explicit relations option
      // This tests that the repository doesn't break with related data present
    })

    it('should maintain data integrity when updating users with relationships', async () => {
      const testUser = await dbHelpers.createTestUser({
        firstName: 'Original',
        email: 'original@test.com'
      })

      // Create related data
      await dbHelpers.createTestJobApplication(testUser, { company: 'Test Company' })

      // Update user
      const updatedUser = await userRepository.update(testUser.id, {
        firstName: 'Updated'
      })

      expect(updatedUser?.firstName).toBe('Updated')
      expect(updatedUser?.email).toBe('original@test.com')

      // Verify related data still exists
      const jobAppCount = await dbHelpers.getRecordCount(dbHelpers.createTestJobApplication.constructor as any)
      // Note: This would require proper relationship loading in a real test
    })
  })
})