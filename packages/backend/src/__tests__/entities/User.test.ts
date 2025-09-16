/**
 * Unit tests for User entity using Testcontainers PostgreSQL
 * Tests entity behavior, validation, relationships, and database operations
 */

import bcrypt from 'bcrypt'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from '@jest/globals'
import { DataSource } from 'typeorm'

import { Contact } from '../../entities/Contact'
import { JobApplication } from '../../entities/JobApplication'
import { Resume } from '../../entities/Resume'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
} from '../../test/testDatabase'

describe('User Entity - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000) // 30 second timeout for container startup

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a user with required properties', () => {
      const user = new User()
      user.email = 'test@example.com'
      user.password = 'hashedpassword123'
      user.firstName = 'John'
      user.lastName = 'Doe'
      user.isActive = true

      expect(user.email).toBe('test@example.com')
      expect(user.password).toBe('hashedpassword123')
      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.isActive).toBe(true)
    })

    it('should have database default isActive set to true when saved', async () => {
      const userRepo = dataSource.getRepository(User)

      const user = await userRepo.save({
        email: 'default@example.com',
        password: 'password',
      })

      expect(user.isActive).toBe(true)
    })

    it('should allow setting isActive to false', () => {
      const user = new User()
      user.isActive = false
      expect(user.isActive).toBe(false)
    })
  })

  // Database operations
  describe('Database Operations', () => {
    it('should save user to database with all properties', async () => {
      const userRepo = dataSource.getRepository(User)

      const userData = {
        email: 'john.doe@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      }

      const savedUser = await userRepo.save(userData)

      expect(savedUser.id).toBeDefined()
      expect(savedUser.email).toBe(userData.email)
      expect(savedUser.firstName).toBe(userData.firstName)
      expect(savedUser.lastName).toBe(userData.lastName)
      expect(savedUser.isActive).toBe(userData.isActive)
      expect(savedUser.createdAt).toBeDefined()
      expect(savedUser.updatedAt).toBeDefined()

      // Verify password was saved (hashed)
      const isValidPassword = await bcrypt.compare('password123', savedUser.password)
      expect(isValidPassword).toBe(true)
    })

    it('should enforce unique email constraint', async () => {
      const userRepo = dataSource.getRepository(User)
      const email = 'duplicate@example.com'

      // Create first user
      await userRepo.save({ email, password: 'password1' })

      // Attempt to create second user with same email
      await expect(userRepo.save({ email, password: 'password2' })).rejects.toThrow()
    })

    it('should handle nullable firstName and lastName', async () => {
      const userRepo = dataSource.getRepository(User)

      const userData = {
        email: 'minimal@example.com',
        password: 'hashedpassword',
      }

      const savedUser = await userRepo.save(userData)

      expect(savedUser.firstName).toBeNull()
      expect(savedUser.lastName).toBeNull()
      expect(savedUser.email).toBe(userData.email)
    })

    it('should update user properties correctly', async () => {
      const userRepo = dataSource.getRepository(User)

      const user = await userRepo.save({
        email: 'update@example.com',
        password: 'password',
        firstName: 'Original',
        lastName: 'Name',
      })

      // Update user
      user.firstName = 'Updated'
      user.lastName = 'NewName'
      const updatedUser = await userRepo.save(user)

      expect(updatedUser.firstName).toBe('Updated')
      expect(updatedUser.lastName).toBe('NewName')
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(updatedUser.createdAt.getTime())
    })

    it('should soft delete user by setting isActive to false', async () => {
      const userRepo = dataSource.getRepository(User)

      const user = await userRepo.save({
        email: 'softdelete@example.com',
        password: 'password',
        isActive: true,
      })

      // Soft delete by setting isActive to false
      await userRepo.update(user.id, { isActive: false })

      // Fetch updated user
      const updatedUser = await userRepo.findOne({ where: { id: user.id } })

      expect(updatedUser?.isActive).toBe(false)

      // User should still exist in database
      const foundUser = await userRepo.findOne({ where: { id: user.id } })
      expect(foundUser).toBeDefined()
      expect(foundUser?.isActive).toBe(false)
    })
  })

  // Relationship testing
  describe('User Relationships', () => {
    it('should handle user with job applications relationship', async () => {
      const userRepo = dataSource.getRepository(User)
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const user = await userRepo.save({
        email: 'relationships@example.com',
        password: 'password',
        firstName: 'Relations',
        lastName: 'User',
      })

      // Create job applications for the user
      await jobAppRepo.save([
        {
          company: 'Company A',
          jobTitle: 'Developer A',
          applicationDate: new Date(),
          user: user,
        },
        {
          company: 'Company B',
          jobTitle: 'Developer B',
          applicationDate: new Date(),
          user: user,
        },
      ])

      // Load user with job applications
      const userWithApps = await userRepo.findOne({
        where: { id: user.id },
        relations: ['jobApplications'],
      })

      expect(userWithApps?.jobApplications).toHaveLength(2)
      expect(userWithApps?.jobApplications[0].company).toBe('Company A')
      expect(userWithApps?.jobApplications[1].company).toBe('Company B')
    })

    it('should handle user with contacts relationship', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'contacts@example.com',
        password: 'password',
      })

      // Create contacts for the user
      await contactRepo.save([
        {
          name: 'Contact One',
          email: 'contact1@example.com',
          user: user,
        },
        {
          name: 'Contact Two',
          email: 'contact2@example.com',
          user: user,
        },
      ])

      // Load user with contacts
      const userWithContacts = await userRepo.findOne({
        where: { id: user.id },
        relations: ['contacts'],
      })

      expect(userWithContacts?.contacts).toHaveLength(2)
      expect(userWithContacts?.contacts[0].name).toBe('Contact One')
      expect(userWithContacts?.contacts[1].name).toBe('Contact Two')
    })

    it('should handle user with resumes relationship', async () => {
      const userRepo = dataSource.getRepository(User)
      const resumeRepo = dataSource.getRepository(Resume)

      const user = await userRepo.save({
        email: 'resumes@example.com',
        password: 'password',
      })

      // Create resumes for the user
      await resumeRepo.save([
        {
          versionName: 'Resume V1',
          fileName: 'resume_v1.pdf',
          fileUrl: '/resumes/v1.pdf',
          user: user,
        },
        {
          versionName: 'Resume V2',
          fileName: 'resume_v2.pdf',
          fileUrl: '/resumes/v2.pdf',
          user: user,
        },
      ])

      // Load user with resumes
      const userWithResumes = await userRepo.findOne({
        where: { id: user.id },
        relations: ['resumes'],
      })

      expect(userWithResumes?.resumes).toHaveLength(2)
      expect(userWithResumes?.resumes[0].versionName).toBe('Resume V1')
      expect(userWithResumes?.resumes[1].versionName).toBe('Resume V2')
    })

    it('should handle cascading operations correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const jobAppRepo = dataSource.getRepository(JobApplication)
      const contactRepo = dataSource.getRepository(Contact)
      const resumeRepo = dataSource.getRepository(Resume)

      const user = await userRepo.save({
        email: 'cascade@example.com',
        password: 'password',
      })

      // Create related entities
      await jobAppRepo.save({
        company: 'Test Company',
        jobTitle: 'Test Job',
        applicationDate: new Date(),
        user: user,
      })

      await contactRepo.save({
        name: 'Test Contact',
        email: 'testcontact@example.com',
        user: user,
      })

      await resumeRepo.save({
        versionName: 'Test Resume',
        fileName: 'test.pdf',
        fileUrl: '/test.pdf',
        user: user,
      })

      // Verify all entities exist
      const jobAppCount = await jobAppRepo.count({ where: { user: { id: user.id } } })
      const contactCount = await contactRepo.count({ where: { user: { id: user.id } } })
      const resumeCount = await resumeRepo.count({ where: { user: { id: user.id } } })

      expect(jobAppCount).toBe(1)
      expect(contactCount).toBe(1)
      expect(resumeCount).toBe(1)
    })
  })

  // PostgreSQL specific features
  describe('PostgreSQL Features', () => {
    it('should handle PostgreSQL timestamp with time zone correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const beforeSave = new Date()

      const user = await userRepo.save({
        email: 'timestamp@example.com',
        password: 'password',
      })

      const afterSave = new Date()

      // Allow for small timing differences (up to 1 second)
      const timeDiff = 1000
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime() - timeDiff)
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime() + timeDiff)
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime() - timeDiff)
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime() + timeDiff)
    })

    it('should support PostgreSQL ILIKE for case-insensitive search', async () => {
      const userRepo = dataSource.getRepository(User)

      await userRepo.save([
        { email: 'john.doe@EXAMPLE.com', password: 'password', firstName: 'John' },
        { email: 'jane.smith@example.COM', password: 'password', firstName: 'Jane' },
        { email: 'bob.wilson@test.org', password: 'password', firstName: 'Bob' },
      ])

      // PostgreSQL ILIKE case-insensitive search
      const exampleUsers = await userRepo
        .createQueryBuilder('user')
        .where('user.email ILIKE :pattern', { pattern: '%example%' })
        .getMany()

      expect(exampleUsers).toHaveLength(2)
      expect(exampleUsers.map(u => u.firstName).sort()).toEqual(['Jane', 'John'])
    })

    it('should support complex PostgreSQL queries with aggregation', async () => {
      const userRepo = dataSource.getRepository(User)
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Create users with different numbers of job applications
      const user1 = await userRepo.save({
        email: 'user1@test.com',
        password: 'password',
        firstName: 'User1',
      })
      const user2 = await userRepo.save({
        email: 'user2@test.com',
        password: 'password',
        firstName: 'User2',
      })
      const user3 = await userRepo.save({
        email: 'user3@test.com',
        password: 'password',
        firstName: 'User3',
      })

      // Create varying numbers of job applications
      await jobAppRepo.save([
        { company: 'A Corp', jobTitle: 'Dev A1', applicationDate: new Date(), user: user1 },
        { company: 'B Corp', jobTitle: 'Dev A2', applicationDate: new Date(), user: user1 },
        { company: 'C Corp', jobTitle: 'Dev A3', applicationDate: new Date(), user: user1 },
        { company: 'D Corp', jobTitle: 'Dev B1', applicationDate: new Date(), user: user2 },
        { company: 'E Corp', jobTitle: 'Dev B2', applicationDate: new Date(), user: user2 },
      ])

      // Complex aggregation query
      const userStats = await userRepo
        .createQueryBuilder('user')
        .leftJoin('user.jobApplications', 'jobApp')
        .select('user.firstName', 'firstName')
        .addSelect('user.email', 'email')
        .addSelect('COUNT(jobApp.id)', 'applicationCount')
        .groupBy('user.id, user.firstName, user.email')
        .orderBy('COUNT(jobApp.id)', 'DESC')
        .getRawMany()

      expect(userStats).toHaveLength(3)
      expect(userStats[0]).toEqual({
        firstName: 'User1',
        email: 'user1@test.com',
        applicationCount: '3',
      })
      expect(userStats[1]).toEqual({
        firstName: 'User2',
        email: 'user2@test.com',
        applicationCount: '2',
      })
      expect(userStats[2]).toEqual({
        firstName: 'User3',
        email: 'user3@test.com',
        applicationCount: '0',
      })
    })
  })
})
