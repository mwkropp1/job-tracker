/**
 * Unit tests for UserRepository using Testcontainers PostgreSQL
 * Tests repository methods, data access patterns, and business logic
 */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from '@jest/globals'
import { DataSource } from 'typeorm'

import { User } from '../../entities/User'
import { UserRepository } from '../../repositories/UserRepository'
import {
  initializeTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
} from '../../test/testDatabase.testcontainers'

describe('UserRepository - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource
  let userRepository: UserRepository

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000) // 30 second timeout for container startup

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    userRepository = new UserRepository(dataSource)
  })

  // Basic repository operations
  describe('Basic Repository Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'john.doe@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
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
        password: 'hashedPassword',
      }

      const createdUser = await userRepository.createUser(userData)

      expect(createdUser.email).toBe(userData.email)
      expect(createdUser.password).toBe(userData.password)
      expect(createdUser.firstName).toBeNull()
      expect(createdUser.lastName).toBeNull()
      expect(createdUser.isActive).toBe(true)
    })

    it('should find user by id', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'hashedPassword',
      }

      const createdUser = await userRepository.createUser(userData)
      const foundUser = await userRepository.findById(createdUser.id)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(createdUser.id)
      expect(foundUser?.email).toBe(userData.email)
    })

    it('should find user by email', async () => {
      const userData = {
        email: 'findbyemail@example.com',
        password: 'hashedPassword',
      }

      const createdUser = await userRepository.createUser(userData)
      const foundUser = await userRepository.findByEmail(userData.email)

      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(createdUser.id)
      expect(foundUser?.email).toBe(userData.email)
    })

    it('should return null when user not found by id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const foundUser = await userRepository.findById(nonExistentId)

      expect(foundUser).toBeNull()
    })

    it('should return null when user not found by email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com')

      expect(foundUser).toBeNull()
    })
  })

  // Repository-specific operations
  describe('UserRepository Specific Operations', () => {
    it('should find active users only', async () => {
      const userRepo = dataSource.getRepository(User)

      // Create active users
      const activeUser1 = await userRepository.createUser({
        email: 'active1@example.com',
        password: 'password',
      })
      const activeUser2 = await userRepository.createUser({
        email: 'active2@example.com',
        password: 'password',
      })

      // Create inactive user by updating after creation
      const inactiveUser = await userRepository.createUser({
        email: 'inactive@example.com',
        password: 'password',
      })
      await userRepo.update(inactiveUser.id, { isActive: false })

      const activeUsers = await userRepository.findActiveUsers()

      expect(activeUsers).toHaveLength(2)
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true)
      })

      const foundEmails = activeUsers.map(u => u.email).sort()
      expect(foundEmails).toEqual(['active1@example.com', 'active2@example.com'])
    })

    it('should find all users using base repository method', async () => {
      await userRepository.createUser({ email: 'user1@example.com', password: 'password' })
      await userRepository.createUser({ email: 'user2@example.com', password: 'password' })
      await userRepository.createUser({ email: 'user3@example.com', password: 'password' })

      const allUsers = await userRepository.findAll()

      expect(allUsers).toHaveLength(3)
    })

    it('should update user using base repository method', async () => {
      const createdUser = await userRepository.createUser({
        email: 'update@example.com',
        password: 'hashedPassword',
      })

      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
      }

      const updatedUser = await userRepository.update(createdUser.id, updates)

      expect(updatedUser?.firstName).toBe(updates.firstName)
      expect(updatedUser?.lastName).toBe(updates.lastName)
      if (updatedUser) {
        expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(updatedUser.createdAt.getTime())
      }
    })

    it('should delete user using base repository method', async () => {
      const createdUser = await userRepository.createUser({
        email: 'delete@example.com',
        password: 'hashedPassword',
      })

      const deleteResult = await userRepository.delete(createdUser.id)

      expect(deleteResult).toBe(true)

      // Verify user is deleted
      const foundUser = await userRepository.findById(createdUser.id)
      expect(foundUser).toBeNull()
    })
  })

  // PostgreSQL specific features
  describe('PostgreSQL Features', () => {
    it('should handle PostgreSQL case-insensitive email searches', async () => {
      await userRepository.createUser({
        email: 'CaseSensitive@EXAMPLE.com',
        password: 'password',
      })

      // PostgreSQL should handle case sensitivity based on collation
      const foundUser = await userRepository.findByEmail('CaseSensitive@EXAMPLE.com')

      expect(foundUser).not.toBeNull()
      expect(foundUser?.email).toBe('CaseSensitive@EXAMPLE.com')
    })

    it('should support PostgreSQL ILIKE queries for name search', async () => {
      await userRepository.createUser({
        email: 'engineer@tech.com',
        password: 'password',
        firstName: 'Software',
        lastName: 'Engineer',
      })
      await userRepository.createUser({
        email: 'designer@creative.com',
        password: 'password',
        firstName: 'UI',
        lastName: 'Designer',
      })

      // Search using PostgreSQL ILIKE
      const results = await dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .where("CONCAT(user.firstName, ' ', user.lastName) ILIKE :searchTerm", {
          searchTerm: '%soft%',
        })
        .getMany()

      expect(results).toHaveLength(1)
      expect(results[0].firstName).toBe('Software')
    })

    it('should handle PostgreSQL timestamp operations', async () => {
      const user1 = await userRepository.createUser({
        email: 'timestamp1@example.com',
        password: 'password',
      })

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))

      const user2 = await userRepository.createUser({
        email: 'timestamp2@example.com',
        password: 'password',
      })

      // Query users created within the last hour using PostgreSQL date functions
      const recentUsers = await dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .where("user.createdAt >= NOW() - INTERVAL '1 hour'")
        .orderBy('user.createdAt', 'ASC')
        .getMany()

      expect(recentUsers).toHaveLength(2)
      expect(recentUsers[0].createdAt.getTime()).toBeLessThan(recentUsers[1].createdAt.getTime())
    })

    it('should support PostgreSQL aggregation queries', async () => {
      const userRepo = dataSource.getRepository(User)

      // Create users
      for (let i = 0; i < 5; i++) {
        await userRepository.createUser({
          email: `user${i}@example.com`,
          password: 'password',
        })
      }

      // Make some inactive
      const allUsers = await userRepository.findAll()
      await userRepo.update(allUsers[0].id, { isActive: false })
      await userRepo.update(allUsers[1].id, { isActive: false })

      // Aggregate by active status using PostgreSQL
      const statusStats = await userRepo
        .createQueryBuilder('user')
        .select('user.isActive', 'isActive')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.isActive')
        .orderBy('user.isActive', 'DESC')
        .getRawMany()

      expect(statusStats).toHaveLength(2)
      expect(statusStats.find(s => s.isActive === true)?.count).toBe('3')
      expect(statusStats.find(s => s.isActive === false)?.count).toBe('2')
    })

    it('should handle unique constraint on email', async () => {
      const email = 'duplicate@example.com'

      await userRepository.createUser({ email, password: 'password1' })

      await expect(userRepository.createUser({ email, password: 'password2' })).rejects.toThrow()
    })

    it('should handle PostgreSQL date range queries', async () => {
      await userRepository.createUser({ email: 'date1@example.com', password: 'password' })
      await userRepository.createUser({ email: 'date2@example.com', password: 'password' })
      await userRepository.createUser({ email: 'date3@example.com', password: 'password' })

      // Find users created today using PostgreSQL date functions
      const todayUsers = await dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .where('DATE(user.createdAt) = CURRENT_DATE')
        .getMany()

      expect(todayUsers).toHaveLength(3)
    })
  })

  // Error handling
  describe('Error Handling', () => {
    it('should handle invalid user ID in base repository methods', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const result = await userRepository.update(nonExistentId, {
        firstName: 'NonExistent',
      })

      expect(result).toBeNull()
    })

    it('should handle invalid user ID in delete', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const result = await userRepository.delete(nonExistentId)

      expect(result).toBe(false)
    })
  })
})
