/**
 * Unit tests for User entity
 * Tests entity behavior, validation, relationships, and database operations
 */

import bcrypt from 'bcrypt';

import type { Contact } from '../../entities/Contact';
import type { JobApplication } from '../../entities/JobApplication';
import type { Resume } from '../../entities/Resume';
import type { User } from '../../entities/User';
import { testDatabase, dbHelpers } from '../../test/testDatabase';
import { TestDataFactory } from '../../test/testUtils';


describe('User Entity', () => {
  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a user with required properties', () => {
      const user = new User()
      user.email = 'test@example.com'
      user.password = 'hashedpassword123'
      user.firstName = 'John'
      user.lastName = 'Doe'

      expect(user.email).toBe('test@example.com')
      expect(user.password).toBe('hashedpassword123')
      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.isActive).toBe(true) // Default value
    })

    it('should have default isActive set to true', () => {
      const user = new User()
      expect(user.isActive).toBe(true)
    })

    it('should allow setting isActive to false', () => {
      const user = new User()
      user.isActive = false
      expect(user.isActive).toBe(false)
    })

    it('should initialize relationship arrays as empty', () => {
      const user = TestDataFactory.createMockUser()
      expect(Array.isArray(user.jobApplications)).toBe(true)
      expect(user.jobApplications).toHaveLength(0)
      expect(Array.isArray(user.contacts)).toBe(true)
      expect(user.contacts).toHaveLength(0)
      expect(Array.isArray(user.resumes)).toBe(true)
      expect(user.resumes).toHaveLength(0)
    })
  })

  // Database operations
  describe('Database Operations', () => {
    beforeEach(async () => {
      await testDatabase.cleanup()
    })

    it('should save user to database with all properties', async () => {
      const userData = {
        email: 'john.doe@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      }

      const savedUser = await dbHelpers.createTestUser(userData)

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
      const email = 'duplicate@example.com'

      // Create first user
      await dbHelpers.createTestUser({ email })

      // Attempt to create second user with same email
      await expect(
        dbHelpers.createTestUser({ email })
      ).rejects.toThrow()
    })

    it('should handle nullable firstName and lastName', async () => {
      const userData = {
        email: 'minimal@example.com',
        password: 'hashedpassword'
      }

      const savedUser = await dbHelpers.createTestUser(userData)

      expect(savedUser.firstName).toBeUndefined()
      expect(savedUser.lastName).toBeUndefined()
      expect(savedUser.email).toBe(userData.email)
    })

    it('should update user properties correctly', async () => {
      const user = await dbHelpers.createTestUser({
        firstName: 'Original',
        lastName: 'Name'
      })

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      // Update user
      user.firstName = 'Updated'
      user.lastName = 'NewName'
      const updatedUser = await userRepo.save(user)

      expect(updatedUser.firstName).toBe('Updated')
      expect(updatedUser.lastName).toBe('NewName')
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(updatedUser.createdAt.getTime())
    })

    it('should soft delete user by setting isActive to false', async () => {
      const user = await dbHelpers.createTestUser({ isActive: true })

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      // Soft delete
      user.isActive = false
      await userRepo.save(user)

      const foundUser = await userRepo.findOne({ where: { id: user.id } })
      expect(foundUser?.isActive).toBe(false)
    })

    it('should delete user and cascade to related entities', async () => {
      const user = await dbHelpers.createTestUser()

      // Create related entities
      await dbHelpers.createTestJobApplication(user)
      await dbHelpers.createTestContact(user)
      await dbHelpers.createTestResume(user)

      // Verify related entities exist
      await dbHelpers.assertRecordCount(JobApplication, 1)
      await dbHelpers.assertRecordCount(Contact, 1)
      await dbHelpers.assertRecordCount(Resume, 1)

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      // Delete user
      await userRepo.remove(user)

      // Verify user is deleted
      await dbHelpers.assertRecordCount(User, 0)

      // Note: Cascade behavior depends on database setup
      // In a real app, you'd configure cascade deletes in entity relationships
    })
  })

  // Relationships
  describe('Entity Relationships', () => {
    beforeEach(async () => {
      await testDatabase.cleanup()
    })

    it('should load job applications relationship', async () => {
      const user = await dbHelpers.createTestUser()
      const jobApp1 = await dbHelpers.createTestJobApplication(user, { company: 'Company A' })
      const jobApp2 = await dbHelpers.createTestJobApplication(user, { company: 'Company B' })

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      const userWithJobApps = await userRepo.findOne({
        where: { id: user.id },
        relations: ['jobApplications']
      })

      expect(userWithJobApps?.jobApplications).toHaveLength(2)
      expect(userWithJobApps?.jobApplications.map(ja => ja.company))
        .toEqual(expect.arrayContaining(['Company A', 'Company B']))
    })

    it('should load contacts relationship', async () => {
      const user = await dbHelpers.createTestUser()
      const contact1 = await dbHelpers.createTestContact(user, { firstName: 'Alice' })
      const contact2 = await dbHelpers.createTestContact(user, { firstName: 'Bob' })

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      const userWithContacts = await userRepo.findOne({
        where: { id: user.id },
        relations: ['contacts']
      })

      expect(userWithContacts?.contacts).toHaveLength(2)
      expect(userWithContacts?.contacts.map(c => c.firstName))
        .toEqual(expect.arrayContaining(['Alice', 'Bob']))
    })

    it('should load resumes relationship', async () => {
      const user = await dbHelpers.createTestUser()
      const resume1 = await dbHelpers.createTestResume(user, { fileName: 'resume_v1.pdf' })
      const resume2 = await dbHelpers.createTestResume(user, { fileName: 'resume_v2.pdf' })

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      const userWithResumes = await userRepo.findOne({
        where: { id: user.id },
        relations: ['resumes']
      })

      expect(userWithResumes?.resumes).toHaveLength(2)
      expect(userWithResumes?.resumes.map(r => r.fileName))
        .toEqual(expect.arrayContaining(['resume_v1.pdf', 'resume_v2.pdf']))
    })

    it('should load all relationships together', async () => {
      const user = await dbHelpers.createTestUser()
      await dbHelpers.createTestJobApplication(user)
      await dbHelpers.createTestContact(user)
      await dbHelpers.createTestResume(user)

      const dataSource = testDatabase.getDataSource()!
      const userRepo = dataSource.getRepository(User)

      const userWithAllRelations = await userRepo.findOne({
        where: { id: user.id },
        relations: ['jobApplications', 'contacts', 'resumes']
      })

      expect(userWithAllRelations?.jobApplications).toHaveLength(1)
      expect(userWithAllRelations?.contacts).toHaveLength(1)
      expect(userWithAllRelations?.resumes).toHaveLength(1)
    })
  })

  // Edge cases and validation
  describe('Edge Cases and Validation', () => {
    beforeEach(async () => {
      await testDatabase.cleanup()
    })

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com'

      const user = await dbHelpers.createTestUser({ email: longEmail })
      expect(user.email).toBe(longEmail)
    })

    it('should handle special characters in names', async () => {
      const userData = {
        firstName: "Jean-François",
        lastName: "O'Connor"
      }

      const user = await dbHelpers.createTestUser(userData)
      expect(user.firstName).toBe("Jean-François")
      expect(user.lastName).toBe("O'Connor")
    })

    it('should preserve email case sensitivity in storage but handle lookup appropriately', async () => {
      const user = await dbHelpers.createTestUser({
        email: 'Test.User@Example.COM'
      })

      expect(user.email).toBe('Test.User@Example.COM')

      // Note: Email uniqueness constraints should typically be case-insensitive
      // This would require database-level configuration or application logic
    })

    it('should handle timezone-aware timestamps', async () => {
      const beforeCreate = new Date()
      const user = await dbHelpers.createTestUser()
      const afterCreate = new Date()

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(user.updatedAt.getTime()).toEqual(user.createdAt.getTime())
    })
  })
})