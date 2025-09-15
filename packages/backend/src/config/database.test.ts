import { describe, it, expect } from '@jest/globals'
import { DataSourceOptions } from 'typeorm'
import { User } from '../entities/User'
import { Resume } from '../entities/Resume'
import { JobApplication } from '../entities/JobApplication'
import { Contact } from '../entities/Contact'

/**
 * Test database configuration using SQLite in-memory
 * This allows us to keep production PostgreSQL types while testing
 */
export const testDatabaseConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  logging: false,
  entities: [User, Resume, JobApplication, Contact],

  // SQLite type mappings for compatibility
  // This doesn't change the entity definitions, just how SQLite interprets them
  extra: {
    // Map PostgreSQL types to SQLite equivalents at runtime
    typeMap: {
      'timestamp with time zone': 'datetime',
      jsonb: 'text',
      enum: 'text',
    },
  },
}

// Simple validation test for the config
describe('Database configuration', () => {
  it('should export valid database config', () => {
    expect(testDatabaseConfig).toBeDefined()
    expect(testDatabaseConfig.type).toBe('sqlite')
    expect(testDatabaseConfig.entities).toHaveLength(4)
  })
})
