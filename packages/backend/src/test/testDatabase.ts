/**
 * Production-parity test database using Testcontainers
 *
 * Uses PostgreSQL in Docker containers instead of in-memory databases
 * to ensure tests run against the same database engine as production,
 * catching database-specific issues that SQLite might miss.
 */

import { DataSource, type EntityManager, type Repository } from 'typeorm'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { User } from '../entities/User'
import { Resume } from '../entities/Resume'
import { JobApplication } from '../entities/JobApplication'
import { Contact } from '../entities/Contact'
import { JobApplicationContact } from '../entities/JobApplicationContact'
import { TEST_CONSTANTS } from './constants'

let postgresContainer: StartedPostgreSqlContainer | null = null
let testDataSource: DataSource | null = null

// Entity cleanup order respects foreign key dependencies
const CLEANUP_ORDER = ['JobApplicationContact', 'Resume', 'JobApplication', 'Contact', 'User'] as const

/**
 * Initialize test database with PostgreSQL container
 * Uses same PostgreSQL version as production for consistency
 */
export const initializeTestDatabase = async (): Promise<DataSource> => {
  if (testDataSource?.isInitialized) {
    return testDataSource
  }

  // Use PostgreSQL 15 to match production environment
  postgresContainer = await new PostgreSqlContainer('postgres:15')
    .withDatabase('job_tracker_test')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start()

  // Configure DataSource with container's dynamic connection details
  testDataSource = new DataSource({
    type: 'postgres',
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    database: postgresContainer.getDatabase(),
    username: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    entities: [User, Resume, JobApplication, Contact, JobApplicationContact],
    synchronize: true, // Auto-create schema - safe in test environment
    logging: false,
    dropSchema: true, // Ensure test isolation by starting fresh
  })

  await testDataSource.initialize()
  return testDataSource
}

/**
 * Clean up test database respecting entity relationships
 * Avoids foreign key constraint violations during cleanup
 */
export const cleanupTestDatabase = async (): Promise<void> => {
  if (!testDataSource?.isInitialized) return

  try {
    // Delete in reverse dependency order to avoid FK violations
    for (const entityName of CLEANUP_ORDER) {
      const repository = testDataSource.getRepository(entityName)
      await repository.clear()
    }
  } catch (error) {
    console.warn('Database cleanup warning:', error)
    // Nuclear option: recreate schema if FK cleanup fails
    await testDataSource.dropDatabase()
    await testDataSource.synchronize()
  }
}

/**
 * Complete database reset - drops and recreates schema
 * Use for complete isolation between test suites
 */
export const resetTestDatabase = async (): Promise<void> => {
  if (!testDataSource?.isInitialized) return

  await testDataSource.dropDatabase()
  await testDataSource.synchronize()
}

/**
 * Close test database connection and stop container
 */
export const closeTestDatabase = async (): Promise<void> => {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy()
    testDataSource = null
  }

  if (postgresContainer) {
    await postgresContainer.stop()
    postgresContainer = null
  }
}

/**
 * Get the test database instance
 */
export const getTestDatabase = (): DataSource => {
  if (!testDataSource?.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.')
  }
  return testDataSource
}

/**
 * Get repository for specific entity
 */
export const getTestRepository = <T>(entityClass: new () => T): Repository<T> => {
  const dataSource = getTestDatabase()
  return dataSource.getRepository(entityClass)
}

/**
 * Execute operations within a database transaction
 */
export const runInTransaction = async <T>(
  operation: (manager: EntityManager) => Promise<T>
): Promise<T> => {
  const dataSource = getTestDatabase()
  return dataSource.manager.transaction(async (manager) => {
    return operation(manager)
  })
}

/**
 * Get count of records for an entity
 */
export const getRecordCount = async <T>(entityClass: new () => T): Promise<number> => {
  const repository = getTestRepository(entityClass)
  return await repository.count()
}

/**
 * Check if test database is ready for use
 */
export const isTestDatabaseReady = (): boolean => {
  return testDataSource?.isInitialized === true
}

/**
 * Singleton test database instance for consistent access patterns
 */
export class TestDatabase {
  private static instance: TestDatabase

  private constructor() {}

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase()
    }
    return TestDatabase.instance
  }

  async initialize(): Promise<DataSource> {
    return initializeTestDatabase()
  }

  async cleanup(): Promise<void> {
    return cleanupTestDatabase()
  }

  async close(): Promise<void> {
    return closeTestDatabase()
  }

  getDataSource(): DataSource {
    return getTestDatabase()
  }

  getRepository<T>(entityClass: new () => T): Repository<T> {
    return getTestRepository(entityClass)
  }
}

// Export singleton instance for backward compatibility
export const testDatabase = TestDatabase.getInstance()
