/**
 * Test database infrastructure for isolated testing
 * Provides in-memory SQLite database with automatic schema management and data isolation
 */

import type { DataSource, EntityManager, Repository } from 'typeorm';

import { Contact } from '../entities/Contact';
import { JobApplication } from '../entities/JobApplication';
import { Resume } from '../entities/Resume';
import { User } from '../entities/User';
interface DatabaseTestConfig {
  readonly type: 'sqlite';
  readonly database: ':memory:';
  readonly entities: readonly [typeof User, typeof JobApplication, typeof Contact, typeof Resume];
  readonly synchronize: true;
  readonly logging: false;
  readonly dropSchema: true;
  readonly cache: false;
}

interface DatabaseCleanupOrder {
  readonly entities: readonly ['Resume', 'JobApplication', 'Contact', 'User'];
}

interface TransactionOperation<T> {
  (manager: EntityManager): Promise<T>;
}

interface EntityConstructor<T = unknown> {
  new (): T;
}

/**
 * Test database instance for managing test data isolation
 */
export class TestDatabase {
  private static instance: TestDatabase | undefined;
  private dataSource: DataSource | null = null;

  private constructor() {}

  /**
   * Get singleton instance of TestDatabase
   */
  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }

    return TestDatabase.instance;
  }

  /**
   * Initialize test database connection with clean schema
   */
  async initialize(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource
    }

    this.dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, JobApplication, Contact, Resume],
      synchronize: true,
      logging: false,
      dropSchema: true,
      cache: false, // Disable caching for predictable tests
    })

    await this.dataSource.initialize()
    return this.dataSource
  }

  /**
   * Get the current data source
   */
  getDataSource(): DataSource | null {
    return this.dataSource
  }

  /**
   * Remove all data while preserving schema structure
   */
  async cleanup(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      return
    }

    await this.dataSource.getRepository(Resume).delete({})
    await this.dataSource.getRepository(JobApplication).delete({})
    await this.dataSource.getRepository(Contact).delete({})
    await this.dataSource.getRepository(User).delete({})
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy()
      this.dataSource = null
    }
  }

  /**
   * Get repository for entity type
   */
  getRepository<T>(entityClass: new () => T) {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.dataSource.getRepository(entityClass)
  }

  /**
   * Execute operations within a database transaction for atomicity
   */
  async runInTransaction<T>(operation: TransactionOperation<T>): Promise<T> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    return this.dataSource.manager.transaction(async (manager) => {
      return operation(manager)
    })
  }
}

/**
 * Database test helpers for common operations
 */
export class DatabaseTestHelpers {
  private testDb = TestDatabase.getInstance()

  /**
   * Seed test database with sample data
   */
  async seedTestData() {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    // Create test user
    const userRepo = dataSource.getRepository(User)
    const testUser = userRepo.create({
      email: 'test@example.com',
      password: '$2b$10$hashed.password.here',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    })
    await userRepo.save(testUser)

    // Create test job application
    const jobAppRepo = dataSource.getRepository(JobApplication)
    const testJobApp = jobAppRepo.create({
      company: 'Test Company',
      jobTitle: 'Software Engineer',
      status: 'Applied',
      applicationDate: new Date(),
      user: testUser,
    })
    await jobAppRepo.save(testJobApp)

    // Create test contact
    const contactRepo = dataSource.getRepository(Contact)
    const testContact = contactRepo.create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@testcompany.com',
      company: 'Test Company',
      user: testUser,
    })
    await contactRepo.save(testContact)

    return { testUser, testJobApp, testContact }
  }

  /**
   * Create a test user in database
   */
  async createTestUser(userData: Partial<User> = {}): Promise<User> {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    const userRepo = dataSource.getRepository(User)
    const user = userRepo.create({
      email: 'test@example.com',
      password: '$2b$10$hashed.password.here',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      ...userData,
    })

    return await userRepo.save(user)
  }

  /**
   * Create a test job application in database
   */
  async createTestJobApplication(
    user: User,
    jobAppData: Partial<JobApplication> = {}
  ): Promise<JobApplication> {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    const jobAppRepo = dataSource.getRepository(JobApplication)
    const jobApp = jobAppRepo.create({
      company: 'Test Company',
      jobTitle: 'Software Engineer',
      status: 'Applied',
      applicationDate: new Date(),
      user,
      ...jobAppData,
    })

    return await jobAppRepo.save(jobApp)
  }

  /**
   * Create a test contact in database
   */
  async createTestContact(user: User, contactData: Partial<Contact> = {}): Promise<Contact> {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    const contactRepo = dataSource.getRepository(Contact)
    const contact = contactRepo.create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@company.com',
      company: 'Test Company',
      user,
      ...contactData,
    })

    return await contactRepo.save(contact)
  }

  /**
   * Create a test resume in database
   */
  async createTestResume(user: User, resumeData: Partial<Resume> = {}): Promise<Resume> {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    const resumeRepo = dataSource.getRepository(Resume)
    const resume = resumeRepo.create({
      fileName: 'test_resume.pdf',
      originalName: 'Test_Resume.pdf',
      filePath: '/uploads/test_resume.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      user,
      ...resumeData,
    })

    return await resumeRepo.save(resume)
  }

  /**
   * Get count of records for an entity
   */
  async getRecordCount<T>(entityClass: new () => T): Promise<number> {
    const dataSource = this.testDb.getDataSource()
    if (!dataSource) {throw new Error('Database not initialized')}

    return await dataSource.getRepository(entityClass).count()
  }

  /**
   * Assert that database contains expected number of records
   */
  async assertRecordCount<T>(entityClass: new () => T, expectedCount: number): Promise<void> {
    const actualCount = await this.getRecordCount(entityClass)
    expect(actualCount).toBe(expectedCount)
  }
}

// Export singleton instance
export const testDatabase = TestDatabase.getInstance()
export const dbHelpers = new DatabaseTestHelpers()

export default TestDatabase