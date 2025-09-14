/**
 * Unit tests for JobApplicationRepository
 * Tests repository methods, filtering, pagination, and security features
 */

import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import { JobApplicationRepository } from '../../repositories/JobApplicationRepository'
import { testDatabase, dbHelpers } from '../../test/testDatabase'
import { TestDataFactory } from '../../test/testUtils'

describe('JobApplicationRepository', () => {
  let jobAppRepository: JobApplicationRepository
  let testUser: User
  let anotherUser: User

  beforeEach(async () => {
    await testDatabase.cleanup()
    const dataSource = testDatabase.getDataSource()!
    jobAppRepository = new JobApplicationRepository(dataSource)

    // Create test users
    testUser = await dbHelpers.createTestUser({ email: 'test@example.com' })
    anotherUser = await dbHelpers.createTestUser({ email: 'another@example.com' })
  })

  // Basic repository operations
  describe('Basic Repository Operations', () => {
    it('should create and save job application', async () => {
      const jobAppData = {
        company: 'TechCorp Inc',
        jobTitle: 'Senior Software Engineer',
        applicationDate: new Date('2024-01-15'),
        status: JobApplicationStatus.APPLIED
      }

      const savedJobApp = await dbHelpers.createTestJobApplication(testUser, jobAppData)

      expect(savedJobApp.id).toBeDefined()
      expect(savedJobApp.company).toBe(jobAppData.company)
      expect(savedJobApp.jobTitle).toBe(jobAppData.jobTitle)
      expect(savedJobApp.status).toBe(jobAppData.status)
      expect(savedJobApp.userId).toBe(testUser.id)
    })

    it('should update job application using save method', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.APPLIED
      })

      jobApp.status = JobApplicationStatus.PHONE_SCREEN
      jobApp.notes = 'Phone screen scheduled for next week'

      const updatedJobApp = await jobAppRepository.save(jobApp)

      expect(updatedJobApp.status).toBe(JobApplicationStatus.PHONE_SCREEN)
      expect(updatedJobApp.notes).toBe('Phone screen scheduled for next week')
    })
  })

  // Company-based filtering
  describe('Company-based Filtering', () => {
    beforeEach(async () => {
      // Create test job applications
      await dbHelpers.createTestJobApplication(testUser, { company: 'Google' })
      await dbHelpers.createTestJobApplication(testUser, { company: 'Microsoft' })
      await dbHelpers.createTestJobApplication(testUser, { company: 'Google' })
      await dbHelpers.createTestJobApplication(anotherUser, { company: 'Google' })
    })

    it('should find job applications by company name', async () => {
      const googleApps = await jobAppRepository.findByCompany('Google', testUser.id)

      expect(googleApps).toHaveLength(2)
      googleApps.forEach(app => {
        expect(app.company).toBe('Google')
        expect(app.userId).toBe(testUser.id)
      })
    })

    it('should return empty array for non-existent company', async () => {
      const nonExistentApps = await jobAppRepository.findByCompany('NonExistent Corp', testUser.id)

      expect(nonExistentApps).toHaveLength(0)
    })

    it('should scope results by user ID', async () => {
      const userApps = await jobAppRepository.findByCompany('Google', testUser.id)
      const anotherUserApps = await jobAppRepository.findByCompany('Google', anotherUser.id)

      expect(userApps).toHaveLength(2)
      expect(anotherUserApps).toHaveLength(1)

      userApps.forEach(app => expect(app.userId).toBe(testUser.id))
      anotherUserApps.forEach(app => expect(app.userId).toBe(anotherUser.id))
    })

    it('should include resume and contact relationships', async () => {
      const resume = await dbHelpers.createTestResume(testUser)
      const contact = await dbHelpers.createTestContact(testUser)

      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        company: 'RelationshipTest',
        resume: resume
      })

      // Associate contact (many-to-many)
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)
      jobApp.contacts = [contact]
      await jobAppRepo.save(jobApp)

      const foundApps = await jobAppRepository.findByCompany('RelationshipTest', testUser.id)

      expect(foundApps).toHaveLength(1)
      expect(foundApps[0].resume).toBeDefined()
      expect(foundApps[0].resume?.id).toBe(resume.id)
      expect(foundApps[0].contacts).toHaveLength(1)
      expect(foundApps[0].contacts[0].id).toBe(contact.id)
    })
  })

  // Status-based filtering
  describe('Status-based Filtering', () => {
    beforeEach(async () => {
      await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date('2024-01-10')
      })

      await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.PHONE_SCREEN,
        applicationDate: new Date('2024-01-15')
      })

      await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date('2024-01-20')
      })

      await dbHelpers.createTestJobApplication(anotherUser, {
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date('2024-01-05')
      })
    })

    it('should find job applications by status', async () => {
      const appliedApps = await jobAppRepository.findByStatus(JobApplicationStatus.APPLIED, testUser.id)

      expect(appliedApps).toHaveLength(2)
      appliedApps.forEach(app => {
        expect(app.status).toBe(JobApplicationStatus.APPLIED)
        expect(app.userId).toBe(testUser.id)
      })
    })

    it('should order results by application date (newest first)', async () => {
      const appliedApps = await jobAppRepository.findByStatus(JobApplicationStatus.APPLIED, testUser.id)

      expect(appliedApps).toHaveLength(2)
      expect(appliedApps[0].applicationDate.getTime()).toBeGreaterThan(
        appliedApps[1].applicationDate.getTime()
      )
    })

    it('should scope results by user ID for status filtering', async () => {
      const userAppliedApps = await jobAppRepository.findByStatus(JobApplicationStatus.APPLIED, testUser.id)
      const anotherUserAppliedApps = await jobAppRepository.findByStatus(JobApplicationStatus.APPLIED, anotherUser.id)

      expect(userAppliedApps).toHaveLength(2)
      expect(anotherUserAppliedApps).toHaveLength(1)
    })

    it('should return empty array for status with no matches', async () => {
      const offerApps = await jobAppRepository.findByStatus(JobApplicationStatus.OFFER_RECEIVED, testUser.id)

      expect(offerApps).toHaveLength(0)
    })
  })

  // Advanced filtering with pagination
  describe('Advanced Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create diverse test data
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Google',
        status: JobApplicationStatus.APPLIED,
        isArchived: false
      })

      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Microsoft',
        status: JobApplicationStatus.PHONE_SCREEN,
        isArchived: false
      })

      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Amazon',
        status: JobApplicationStatus.APPLIED,
        isArchived: true
      })

      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Google Inc',
        status: JobApplicationStatus.TECHNICAL_INTERVIEW,
        isArchived: false
      })

      await dbHelpers.createTestJobApplication(anotherUser, {
        company: 'Google',
        status: JobApplicationStatus.APPLIED,
        isArchived: false
      })
    })

    it('should return paginated results with metadata', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        page: 1,
        limit: 2
      })

      expect(result.applications).toHaveLength(2)
      expect(result.total).toBe(4) // Only testUser's applications (3 non-archived + 1 archived)
      expect(result.currentPage).toBe(1)
      expect(result.totalPages).toBe(2) // 4 total / 2 per page = 2 pages

      // Test second page
      const secondPageResult = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        page: 2,
        limit: 2
      })

      expect(secondPageResult.applications).toHaveLength(2)
      expect(secondPageResult.currentPage).toBe(2)
    })

    it('should filter by status', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        status: JobApplicationStatus.APPLIED
      })

      expect(result.applications).toHaveLength(1) // Only non-archived APPLIED apps
      expect(result.applications[0].status).toBe(JobApplicationStatus.APPLIED)
    })

    it('should filter by company with partial matching', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: 'Google'
      })

      expect(result.applications).toHaveLength(2) // 'Google' and 'Google Inc'
      expect(result.applications.every(app =>
        app.company.includes('Google')
      )).toBe(true)
    })

    it('should filter by archived status', async () => {
      const activeResult = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        archived: false
      })

      const archivedResult = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        archived: true
      })

      expect(activeResult.applications).toHaveLength(3)
      expect(activeResult.applications.every(app => !app.isArchived)).toBe(true)

      expect(archivedResult.applications).toHaveLength(1)
      expect(archivedResult.applications.every(app => app.isArchived)).toBe(true)
    })

    it('should combine multiple filters', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        status: JobApplicationStatus.APPLIED,
        company: 'Google',
        archived: false
      })

      expect(result.applications).toHaveLength(1)
      expect(result.applications[0].status).toBe(JobApplicationStatus.APPLIED)
      expect(result.applications[0].company).toBe('Google')
      expect(result.applications[0].isArchived).toBe(false)
    })

    it('should sanitize pagination parameters', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        page: -5, // Invalid negative page
        limit: 999999 // Invalid large limit
      })

      // Should use safe defaults
      expect(result.currentPage).toBeGreaterThanOrEqual(1)
      expect(result.applications.length).toBeLessThanOrEqual(100) // Assuming max limit is 100
    })

    it('should include resume relationship in filtered results', async () => {
      const resume = await dbHelpers.createTestResume(testUser)
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'ResumeTest',
        resume: resume
      })

      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: 'ResumeTest'
      })

      expect(result.applications).toHaveLength(1)
      expect(result.applications[0].resume).toBeDefined()
      expect(result.applications[0].resume?.id).toBe(resume.id)
    })

    it('should order results by application date (newest first)', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id
      })

      expect(result.applications.length).toBeGreaterThan(1)

      for (let i = 1; i < result.applications.length; i++) {
        expect(result.applications[i - 1].applicationDate.getTime()).toBeGreaterThanOrEqual(
          result.applications[i].applicationDate.getTime()
        )
      }
    })
  })

  // User scoped access
  describe('User Scoped Access', () => {
    beforeEach(async () => {
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'TestUser Company'
      })

      await dbHelpers.createTestJobApplication(anotherUser, {
        company: 'AnotherUser Company'
      })
    })

    it('should find job application by ID and user', async () => {
      const testUserApp = await dbHelpers.createTestJobApplication(testUser, {
        company: 'UserSpecific'
      })

      const foundApp = await jobAppRepository.findOneByIdAndUser(testUserApp.id, testUser.id)

      expect(foundApp).toBeDefined()
      expect(foundApp?.id).toBe(testUserApp.id)
      expect(foundApp?.company).toBe('UserSpecific')
    })

    it('should return null when accessing another user\'s job application', async () => {
      const anotherUserApp = await dbHelpers.createTestJobApplication(anotherUser, {
        company: 'NotAccessible'
      })

      const foundApp = await jobAppRepository.findOneByIdAndUser(anotherUserApp.id, testUser.id)

      expect(foundApp).toBeNull()
    })

    it('should return null for non-existent job application ID', async () => {
      const nonExistentId = 'non-existent-id'

      const foundApp = await jobAppRepository.findOneByIdAndUser(nonExistentId, testUser.id)

      expect(foundApp).toBeNull()
    })

    it('should include relationships in user-scoped find', async () => {
      const resume = await dbHelpers.createTestResume(testUser)
      const contact = await dbHelpers.createTestContact(testUser)

      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        company: 'RelationshipTest',
        resume: resume
      })

      // Associate contact
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)
      jobApp.contacts = [contact]
      await jobAppRepo.save(jobApp)

      const foundApp = await jobAppRepository.findOneByIdAndUser(jobApp.id, testUser.id)

      expect(foundApp?.resume).toBeDefined()
      expect(foundApp?.resume?.id).toBe(resume.id)
      expect(foundApp?.contacts).toHaveLength(1)
      expect(foundApp?.contacts[0].id).toBe(contact.id)
    })
  })

  // Security and sanitization
  describe('Security and Sanitization', () => {
    it('should sanitize search queries to prevent SQL injection', async () => {
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'SafeCompany'
      })

      // Attempt SQL injection in company search
      const maliciousQuery = "'; DROP TABLE job_applications; --"

      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: maliciousQuery
      })

      // Should not find any results (and not crash)
      expect(result.applications).toHaveLength(0)

      // Verify data is still intact
      const allResults = await jobAppRepository.findWithFilters({
        userId: testUser.id
      })
      expect(allResults.total).toBeGreaterThan(0)
    })

    it('should handle special characters in company search', async () => {
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Company & Associates (100%)'
      })

      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: 'Company & Associates'
      })

      expect(result.applications).toHaveLength(1)
      expect(result.applications[0].company).toBe('Company & Associates (100%)')
    })

    it('should handle wildcard characters in search', async () => {
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Test Company'
      })

      // Test with SQL LIKE wildcards
      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: 'Test%Company'
      })

      // Should escape wildcards and not match
      expect(result.applications).toHaveLength(0)
    })
  })

  // Error handling
  describe('Error Handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      const result = await jobAppRepository.findWithFilters({
        userId: 'invalid-user-id'
      })

      expect(result.applications).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      await testDatabase.close()

      await expect(
        jobAppRepository.findByCompany('Test', testUser.id)
      ).rejects.toThrow()

      // Reinitialize for cleanup
      await testDatabase.initialize()
    })
  })

  // Performance considerations
  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', async () => {
      // Create many job applications
      for (let i = 0; i < 100; i++) {
        await dbHelpers.createTestJobApplication(testUser, {
          company: `Company ${i}`,
          status: i % 2 === 0 ? JobApplicationStatus.APPLIED : JobApplicationStatus.PHONE_SCREEN
        })
      }

      const startTime = Date.now()

      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        page: 1,
        limit: 20
      })

      const endTime = Date.now()

      expect(result.applications).toHaveLength(20)
      expect(result.total).toBe(100)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should perform efficient company searches', async () => {
      // Create applications with various company names
      const companies = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Facebook']
      for (const company of companies) {
        for (let i = 0; i < 10; i++) {
          await dbHelpers.createTestJobApplication(testUser, {
            company: `${company} ${i}`
          })
        }
      }

      const startTime = Date.now()

      const result = await jobAppRepository.findWithFilters({
        userId: testUser.id,
        company: 'Google'
      })

      const endTime = Date.now()

      expect(result.applications).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(500) // Should be fast with proper indexing
    })
  })
})