/**
 * Test data factory for creating realistic mock data
 * Provides factory functions for all entities with sensible defaults
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { DeepPartial } from 'typeorm'

import { Contact } from '../entities/Contact'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationContact, InteractionType } from '../entities/JobApplicationContact'
import { Resume } from '../entities/Resume'
import { User } from '../entities/User'
import { TEST_CONSTANTS } from './constants'

/**
 * Factory functions for creating test data with realistic defaults
 */
export class TestDataFactory {
  /**
   * Creates a mock user with realistic defaults for authentication testing
   */
  public static createMockUser(overrides: DeepPartial<User> = {}): User {
    const user = new User()
    user.id = overrides.id || 'test-user-id'
    user.email = overrides.email || TEST_CONSTANTS.MOCK_DATA.USER.email
    user.password = overrides.password || TEST_CONSTANTS.AUTH.HASHED_PASSWORD
    user.firstName = overrides.firstName || TEST_CONSTANTS.MOCK_DATA.USER.firstName
    user.lastName = overrides.lastName || TEST_CONSTANTS.MOCK_DATA.USER.lastName
    user.isActive = overrides.isActive ?? TEST_CONSTANTS.MOCK_DATA.USER.isActive
    user.createdAt = overrides.createdAt || new Date()
    user.updatedAt = overrides.updatedAt || new Date()
    user.jobApplications = overrides.jobApplications || []
    user.contacts = overrides.contacts || []
    user.resumes = overrides.resumes || []
    return user
  }

  /**
   * Creates a mock job application for testing application workflow states
   */
  public static createMockJobApplication(overrides: DeepPartial<JobApplication> = {}): JobApplication {
    const jobApp = new JobApplication()
    jobApp.id = overrides.id || 'test-job-app-id'
    jobApp.company = overrides.company || TEST_CONSTANTS.MOCK_DATA.JOB_APPLICATION.company
    jobApp.jobTitle = overrides.jobTitle || TEST_CONSTANTS.MOCK_DATA.JOB_APPLICATION.jobTitle
    jobApp.status = overrides.status || JobApplicationStatus.APPLIED
    jobApp.applicationDate = overrides.applicationDate || new Date()
    jobApp.jobPostingUrl = overrides.jobPostingUrl || 'https://example.com/job'
    jobApp.description = overrides.description || 'Test job description'
    jobApp.salary = overrides.salary || TEST_CONSTANTS.MOCK_DATA.JOB_APPLICATION.salary
    jobApp.location = overrides.location || TEST_CONSTANTS.MOCK_DATA.JOB_APPLICATION.location
    jobApp.notes = overrides.notes || 'Test application notes'
    jobApp.isArchived = overrides.isArchived ?? false
    jobApp.createdAt = overrides.createdAt || new Date()
    jobApp.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      jobApp.user = overrides.user as User
      jobApp.userId = overrides.user.id
    }

    return jobApp
  }

  /**
   * Creates a mock professional contact for testing networking features
   */
  public static createMockContact(overrides: DeepPartial<Contact> = {}): Contact {
    const contact = new Contact()
    contact.id = overrides.id || 'test-contact-id'
    contact.firstName = overrides.firstName || TEST_CONSTANTS.MOCK_DATA.CONTACT.firstName
    contact.lastName = overrides.lastName || TEST_CONSTANTS.MOCK_DATA.CONTACT.lastName
    contact.email = overrides.email || TEST_CONSTANTS.MOCK_DATA.CONTACT.email
    contact.company = overrides.company || TEST_CONSTANTS.MOCK_DATA.CONTACT.company
    contact.jobTitle = overrides.jobTitle || TEST_CONSTANTS.MOCK_DATA.CONTACT.jobTitle
    contact.phoneNumber = overrides.phoneNumber || '+1-555-123-4567'
    contact.linkedInProfile = overrides.linkedInProfile || 'https://linkedin.com/in/janesmith'
    contact.notes = overrides.notes || 'Met at tech conference'
    contact.createdAt = overrides.createdAt || new Date()
    contact.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      contact.user = overrides.user as User
      contact.userId = overrides.user.id
    }

    return contact
  }

  /**
   * Creates a mock resume for testing file upload and tracking features
   */
  public static createMockResume(overrides: DeepPartial<Resume> = {}): Resume {
    const resume = new Resume()
    resume.id = overrides.id || 'test-resume-id'
    resume.fileName = overrides.fileName || TEST_CONSTANTS.MOCK_DATA.RESUME.fileName
    resume.originalName = overrides.originalName || TEST_CONSTANTS.MOCK_DATA.RESUME.originalName
    resume.filePath = overrides.filePath || TEST_CONSTANTS.MOCK_DATA.RESUME.filePath
    resume.fileSize = overrides.fileSize || TEST_CONSTANTS.MOCK_DATA.RESUME.fileSize
    resume.mimeType = overrides.mimeType || TEST_CONSTANTS.MOCK_DATA.RESUME.mimeType
    resume.description = overrides.description || 'Test resume version'
    resume.isDefault = overrides.isDefault ?? false
    resume.usageCount = overrides.usageCount || 0
    resume.createdAt = overrides.createdAt || new Date()
    resume.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      resume.user = overrides.user as User
      resume.userId = overrides.user.id
    }

    return resume
  }

  /**
   * Creates a mock interaction between job applications and contacts
   */
  public static createMockJobApplicationContact(overrides: DeepPartial<JobApplicationContact> = {}): JobApplicationContact {
    const interaction = new JobApplicationContact()
    interaction.id = overrides.id || 'test-interaction-id'
    interaction.interactionType = overrides.interactionType || InteractionType.NETWORKING
    interaction.interactionDate = overrides.interactionDate || new Date()
    interaction.notes = overrides.notes || 'Test networking interaction'
    interaction.createdAt = overrides.createdAt || new Date()
    interaction.updatedAt = overrides.updatedAt || new Date()

    if (overrides.jobApplication) {
      interaction.jobApplication = overrides.jobApplication as JobApplication
    }

    if (overrides.contact) {
      interaction.contact = overrides.contact as Contact
    }

    return interaction
  }

  /**
   * Generates JWT token for testing authentication flows
   */
  public static createTestJWT(userId: string, expiresIn = '1h'): string {
    const payload = { userId, type: 'auth' }
    const secret = process.env.JWT_SECRET || TEST_CONSTANTS.AUTH.JWT_SECRET
    return jwt.sign(payload, secret, { expiresIn })
  }

  /**
   * Generates bcrypt hash for testing password security
   */
  public static async createHashedPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || TEST_CONSTANTS.AUTH.BCRYPT_ROUNDS.toString())
    return await bcrypt.hash(password, rounds)
  }

  /**
   * Create test user with properly hashed password for login testing
   */
  public static async createUserWithHashedPassword(overrides: DeepPartial<User> = {}): Promise<User> {
    const plainPassword = 'testPassword123'
    const hashedPassword = await this.createHashedPassword(plainPassword)

    return this.createMockUser({
      password: hashedPassword,
      ...overrides
    })
  }
}

/**
 * Database test helpers for creating and managing test data
 */
export class DatabaseTestHelpers {
  /**
   * Create a test user in database
   */
  public static async createTestUser(
    repository: any,
    userData: DeepPartial<User> = {}
  ): Promise<User> {
    const user = TestDataFactory.createMockUser({
      email: 'test@example.com',
      password: TEST_CONSTANTS.AUTH.HASHED_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      ...userData,
    })

    return await repository.save(user)
  }

  /**
   * Create a test job application in database
   */
  public static async createTestJobApplication(
    repository: any,
    user: User,
    jobAppData: DeepPartial<JobApplication> = {}
  ): Promise<JobApplication> {
    const jobApp = TestDataFactory.createMockJobApplication({
      company: 'Test Company',
      jobTitle: 'Software Engineer',
      status: JobApplicationStatus.APPLIED,
      applicationDate: new Date(),
      user,
      ...jobAppData,
    })

    return await repository.save(jobApp)
  }

  /**
   * Create a test contact in database
   */
  public static async createTestContact(
    repository: any,
    user: User,
    contactData: DeepPartial<Contact> = {}
  ): Promise<Contact> {
    const contact = TestDataFactory.createMockContact({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@company.com',
      company: 'Test Company',
      user,
      ...contactData,
    })

    return await repository.save(contact)
  }

  /**
   * Create a test resume in database
   */
  public static async createTestResume(
    repository: any,
    user: User,
    resumeData: DeepPartial<Resume> = {}
  ): Promise<Resume> {
    const resume = TestDataFactory.createMockResume({
      fileName: 'test_resume.pdf',
      originalName: 'Test_Resume.pdf',
      filePath: '/uploads/test_resume.pdf',
      fileSize: TEST_CONSTANTS.FILE_UPLOAD.TEST_FILE_SIZE,
      mimeType: 'application/pdf',
      user,
      ...resumeData,
    })

    return await repository.save(resume)
  }

  /**
   * Create test job application contact interaction
   */
  public static async createTestJobApplicationContact(
    repository: any,
    jobApplication: JobApplication,
    contact: Contact,
    interactionData: DeepPartial<JobApplicationContact> = {}
  ): Promise<JobApplicationContact> {
    const interaction = TestDataFactory.createMockJobApplicationContact({
      interactionType: InteractionType.NETWORKING,
      interactionDate: new Date(),
      notes: 'Test interaction',
      jobApplication,
      contact,
      ...interactionData,
    })

    return await repository.save(interaction)
  }

  /**
   * Seed test database with complete sample data set
   */
  public static async seedCompleteTestData(getRepository: (entity: any) => any) {
    // Create test user
    const user = await this.createTestUser(getRepository(User))

    // Create test job application
    const jobApp = await this.createTestJobApplication(
      getRepository(JobApplication),
      user
    )

    // Create test contact
    const contact = await this.createTestContact(
      getRepository(Contact),
      user
    )

    // Create test resume
    const resume = await this.createTestResume(
      getRepository(Resume),
      user
    )

    // Create interaction between job application and contact
    const interaction = await this.createTestJobApplicationContact(
      getRepository(JobApplicationContact),
      jobApp,
      contact
    )

    return { user, jobApp, contact, resume, interaction }
  }
}

export default TestDataFactory