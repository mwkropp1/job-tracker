/**
 * Unit tests for JobApplication entity
 * Tests entity behavior, status transitions, relationships, and database operations
 */

import { Contact } from '../../entities/Contact'
import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { Resume } from '../../entities/Resume'
import { User } from '../../entities/User'
import { testDatabase, dbHelpers } from '../../test/testDatabase'
import { TestDataFactory } from '../../test/testUtils'

describe('JobApplication Entity', () => {
  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a job application with required properties', () => {
      const user = TestDataFactory.createMockUser()
      const jobApp = new JobApplication()

      jobApp.company = 'TechCorp Inc'
      jobApp.jobTitle = 'Senior Software Engineer'
      jobApp.applicationDate = new Date('2024-01-15')
      jobApp.user = user
      jobApp.userId = user.id

      expect(jobApp.company).toBe('TechCorp Inc')
      expect(jobApp.jobTitle).toBe('Senior Software Engineer')
      expect(jobApp.applicationDate).toEqual(new Date('2024-01-15'))
      expect(jobApp.status).toBe(JobApplicationStatus.APPLIED) // Default value
      expect(jobApp.isArchived).toBe(false) // Default value
      expect(jobApp.user).toBe(user)
    })

    it('should have default status as APPLIED', () => {
      const jobApp = new JobApplication()
      expect(jobApp.status).toBe(JobApplicationStatus.APPLIED)
    })

    it('should have default isArchived as false', () => {
      const jobApp = new JobApplication()
      expect(jobApp.isArchived).toBe(false)
    })

    it('should allow all valid status values', () => {
      const jobApp = new JobApplication()

      // Test all enum values
      Object.values(JobApplicationStatus).forEach(status => {
        jobApp.status = status
        expect(jobApp.status).toBe(status)
      })
    })

    it('should handle optional fields properly', () => {
      const jobApp = TestDataFactory.createMockJobApplication()

      expect(jobApp.jobDescription).toBeDefined()
      expect(jobApp.jobPostingUrl).toBeDefined()
      expect(jobApp.salary).toBeDefined()
      expect(jobApp.location).toBeDefined()
      expect(jobApp.notes).toBeDefined()
    })
  })

  // Database operations
  describe('Database Operations', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should save job application with all required fields', async () => {
      const jobAppData = {
        company: 'Google',
        jobTitle: 'Staff Software Engineer',
        applicationDate: new Date('2024-01-20'),
        status: JobApplicationStatus.APPLIED
      }

      const savedJobApp = await dbHelpers.createTestJobApplication(testUser, jobAppData)

      expect(savedJobApp.id).toBeDefined()
      expect(savedJobApp.company).toBe(jobAppData.company)
      expect(savedJobApp.jobTitle).toBe(jobAppData.jobTitle)
      expect(savedJobApp.applicationDate).toEqual(jobAppData.applicationDate)
      expect(savedJobApp.status).toBe(jobAppData.status)
      expect(savedJobApp.userId).toBe(testUser.id)
      expect(savedJobApp.createdAt).toBeDefined()
      expect(savedJobApp.updatedAt).toBeDefined()
    })

    it('should save job application with all optional fields', async () => {
      const jobAppData = {
        company: 'Microsoft',
        jobTitle: 'Principal Engineer',
        jobDescription: 'Lead architecture decisions for cloud platform',
        applicationDate: new Date('2024-01-25'),
        jobPostingUrl: 'https://careers.microsoft.com/job/123',
        salary: 180000,
        location: 'Seattle, WA',
        notes: 'Applied through internal referral from John Smith',
        status: JobApplicationStatus.PHONE_SCREEN,
        isArchived: false
      }

      const savedJobApp = await dbHelpers.createTestJobApplication(testUser, jobAppData)

      expect(savedJobApp.jobDescription).toBe(jobAppData.jobDescription)
      expect(savedJobApp.jobPostingUrl).toBe(jobAppData.jobPostingUrl)
      expect(savedJobApp.salary).toBe(jobAppData.salary)
      expect(savedJobApp.location).toBe(jobAppData.location)
      expect(savedJobApp.notes).toBe(jobAppData.notes)
      expect(savedJobApp.status).toBe(jobAppData.status)
      expect(savedJobApp.isArchived).toBe(jobAppData.isArchived)
    })

    it('should update job application status and track timestamps', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.APPLIED
      })

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const originalUpdatedAt = jobApp.updatedAt

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Update status
      jobApp.status = JobApplicationStatus.TECHNICAL_INTERVIEW
      const updatedJobApp = await jobAppRepo.save(jobApp)

      expect(updatedJobApp.status).toBe(JobApplicationStatus.TECHNICAL_INTERVIEW)
      expect(updatedJobApp.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should archive job application without deletion', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser)

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Archive the application
      jobApp.isArchived = true
      await jobAppRepo.save(jobApp)

      const foundJobApp = await jobAppRepo.findOne({ where: { id: jobApp.id } })
      expect(foundJobApp?.isArchived).toBe(true)

      // Should still be findable when including archived
      const allJobApps = await jobAppRepo.find()
      expect(allJobApps).toHaveLength(1)
    })

    it('should enforce user relationship constraint', async () => {
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const jobApp = jobAppRepo.create({
        company: 'Test Company',
        jobTitle: 'Test Position',
        applicationDate: new Date(),
        // No user relationship - should fail
      })

      await expect(jobAppRepo.save(jobApp)).rejects.toThrow()
    })

    it('should handle long job descriptions', async () => {
      const longDescription = 'A'.repeat(5000) // Very long description

      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        jobDescription: longDescription
      })

      expect(jobApp.jobDescription).toBe(longDescription)
      expect(jobApp.jobDescription?.length).toBe(5000)
    })
  })

  // Status progression testing
  describe('Status Transitions', () => {
    let testUser: User
    let jobApp: JobApplication

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
      jobApp = await dbHelpers.createTestJobApplication(testUser, {
        status: JobApplicationStatus.APPLIED
      })
    })

    it('should progress through typical positive status flow', async () => {
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Applied -> Phone Screen
      jobApp.status = JobApplicationStatus.PHONE_SCREEN
      await jobAppRepo.save(jobApp)
      expect(jobApp.status).toBe(JobApplicationStatus.PHONE_SCREEN)

      // Phone Screen -> Technical Interview
      jobApp.status = JobApplicationStatus.TECHNICAL_INTERVIEW
      await jobAppRepo.save(jobApp)
      expect(jobApp.status).toBe(JobApplicationStatus.TECHNICAL_INTERVIEW)

      // Technical -> Onsite
      jobApp.status = JobApplicationStatus.ONSITE_INTERVIEW
      await jobAppRepo.save(jobApp)
      expect(jobApp.status).toBe(JobApplicationStatus.ONSITE_INTERVIEW)

      // Onsite -> Offer
      jobApp.status = JobApplicationStatus.OFFER_RECEIVED
      await jobAppRepo.save(jobApp)
      expect(jobApp.status).toBe(JobApplicationStatus.OFFER_RECEIVED)

      // Offer -> Accepted
      jobApp.status = JobApplicationStatus.OFFER_ACCEPTED
      await jobAppRepo.save(jobApp)
      expect(jobApp.status).toBe(JobApplicationStatus.OFFER_ACCEPTED)
    })

    it('should handle rejection at any stage', async () => {
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Can be rejected from any status
      const statuses = [
        JobApplicationStatus.APPLIED,
        JobApplicationStatus.PHONE_SCREEN,
        JobApplicationStatus.TECHNICAL_INTERVIEW,
        JobApplicationStatus.ONSITE_INTERVIEW,
        JobApplicationStatus.OFFER_RECEIVED
      ]

      for (const fromStatus of statuses) {
        jobApp.status = fromStatus
        await jobAppRepo.save(jobApp)

        jobApp.status = JobApplicationStatus.REJECTED
        await jobAppRepo.save(jobApp)

        expect(jobApp.status).toBe(JobApplicationStatus.REJECTED)
      }
    })

    it('should handle user declining offer', async () => {
      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Progress to offer received
      jobApp.status = JobApplicationStatus.OFFER_RECEIVED
      await jobAppRepo.save(jobApp)

      // User declines
      jobApp.status = JobApplicationStatus.DECLINED
      await jobAppRepo.save(jobApp)

      expect(jobApp.status).toBe(JobApplicationStatus.DECLINED)
    })
  })

  // Relationships testing
  describe('Entity Relationships', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should maintain relationship with user', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser)

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const jobAppWithUser = await jobAppRepo.findOne({
        where: { id: jobApp.id },
        relations: ['user']
      })

      expect(jobAppWithUser?.user).toBeDefined()
      expect(jobAppWithUser?.user.id).toBe(testUser.id)
      expect(jobAppWithUser?.user.email).toBe(testUser.email)
    })

    it('should link to resume when specified', async () => {
      const resume = await dbHelpers.createTestResume(testUser)
      const jobApp = await dbHelpers.createTestJobApplication(testUser)

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Link resume
      jobApp.resume = resume
      jobApp.resumeId = resume.id
      await jobAppRepo.save(jobApp)

      const jobAppWithResume = await jobAppRepo.findOne({
        where: { id: jobApp.id },
        relations: ['resume']
      })

      expect(jobAppWithResume?.resume).toBeDefined()
      expect(jobAppWithResume?.resume?.id).toBe(resume.id)
      expect(jobAppWithResume?.resumeId).toBe(resume.id)
    })

    it('should associate with multiple contacts', async () => {
      const contact1 = await dbHelpers.createTestContact(testUser, { firstName: 'Alice' })
      const contact2 = await dbHelpers.createTestContact(testUser, { firstName: 'Bob' })
      const jobApp = await dbHelpers.createTestJobApplication(testUser)

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Associate contacts (many-to-many relationship)
      jobApp.contacts = [contact1, contact2]
      await jobAppRepo.save(jobApp)

      const jobAppWithContacts = await jobAppRepo.findOne({
        where: { id: jobApp.id },
        relations: ['contacts']
      })

      expect(jobAppWithContacts?.contacts).toHaveLength(2)
      expect(jobAppWithContacts?.contacts.map(c => c.firstName))
        .toEqual(expect.arrayContaining(['Alice', 'Bob']))
    })

    it('should handle null resume relationship', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser)

      expect(jobApp.resume).toBeUndefined()
      expect(jobApp.resumeId).toBeUndefined()

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const jobAppWithResume = await jobAppRepo.findOne({
        where: { id: jobApp.id },
        relations: ['resume']
      })

      expect(jobAppWithResume?.resume).toBeNull()
    })
  })

  // Search and indexing
  describe('Search and Indexing', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should find job applications by company', async () => {
      await dbHelpers.createTestJobApplication(testUser, { company: 'Google' })
      await dbHelpers.createTestJobApplication(testUser, { company: 'Microsoft' })
      await dbHelpers.createTestJobApplication(testUser, { company: 'Google' })

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const googleApps = await jobAppRepo.find({ where: { company: 'Google' } })
      expect(googleApps).toHaveLength(2)

      const microsoftApps = await jobAppRepo.find({ where: { company: 'Microsoft' } })
      expect(microsoftApps).toHaveLength(1)
    })

    it('should find job applications by job title', async () => {
      await dbHelpers.createTestJobApplication(testUser, { jobTitle: 'Software Engineer' })
      await dbHelpers.createTestJobApplication(testUser, { jobTitle: 'Senior Software Engineer' })
      await dbHelpers.createTestJobApplication(testUser, { jobTitle: 'Software Engineer' })

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const softwareEngineerApps = await jobAppRepo.find({
        where: { jobTitle: 'Software Engineer' }
      })
      expect(softwareEngineerApps).toHaveLength(2)
    })

    it('should find job applications by status', async () => {
      await dbHelpers.createTestJobApplication(testUser, { status: JobApplicationStatus.APPLIED })
      await dbHelpers.createTestJobApplication(testUser, { status: JobApplicationStatus.PHONE_SCREEN })
      await dbHelpers.createTestJobApplication(testUser, { status: JobApplicationStatus.APPLIED })

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const appliedApps = await jobAppRepo.find({
        where: { status: JobApplicationStatus.APPLIED }
      })
      expect(appliedApps).toHaveLength(2)

      const phoneScreenApps = await jobAppRepo.find({
        where: { status: JobApplicationStatus.PHONE_SCREEN }
      })
      expect(phoneScreenApps).toHaveLength(1)
    })

    it('should filter by user and archived status', async () => {
      const anotherUser = await dbHelpers.createTestUser({ email: 'another@test.com' })

      await dbHelpers.createTestJobApplication(testUser, { isArchived: false })
      await dbHelpers.createTestJobApplication(testUser, { isArchived: true })
      await dbHelpers.createTestJobApplication(anotherUser, { isArchived: false })

      const dataSource = testDatabase.getDataSource()!
      const jobAppRepo = dataSource.getRepository(JobApplication)

      const activeAppsForUser = await jobAppRepo.find({
        where: { userId: testUser.id, isArchived: false }
      })
      expect(activeAppsForUser).toHaveLength(1)

      const allAppsForUser = await jobAppRepo.find({
        where: { userId: testUser.id }
      })
      expect(allAppsForUser).toHaveLength(2)
    })
  })

  // Edge cases and validation
  describe('Edge Cases and Validation', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should handle empty and null optional fields', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        jobDescription: null,
        jobPostingUrl: null,
        salary: null,
        location: null,
        notes: null
      })

      expect(jobApp.jobDescription).toBeNull()
      expect(jobApp.jobPostingUrl).toBeNull()
      expect(jobApp.salary).toBeNull()
      expect(jobApp.location).toBeNull()
      expect(jobApp.notes).toBeNull()
    })

    it('should handle special characters in company and job title', async () => {
      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        company: 'Château & Associates, Inc.',
        jobTitle: 'Sr. Software Engineer (Full-Stack)'
      })

      expect(jobApp.company).toBe('Château & Associates, Inc.')
      expect(jobApp.jobTitle).toBe('Sr. Software Engineer (Full-Stack)')
    })

    it('should handle very long URLs', async () => {
      const longUrl = 'https://company.com/careers/' + 'a'.repeat(500)

      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        jobPostingUrl: longUrl
      })

      expect(jobApp.jobPostingUrl).toBe(longUrl)
    })

    it('should handle negative salary values', async () => {
      // Note: In a real application, you might want to add validation for this
      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        salary: -1000
      })

      expect(jobApp.salary).toBe(-1000)
    })

    it('should handle future application dates', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const jobApp = await dbHelpers.createTestJobApplication(testUser, {
        applicationDate: futureDate
      })

      expect(jobApp.applicationDate).toEqual(futureDate)
    })
  })
})