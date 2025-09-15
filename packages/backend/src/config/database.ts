/**
 * TypeORM database configuration with environment-based settings.
 * Manages PostgreSQL connection and entity registration.
 */

import 'reflect-metadata'
import dotenv from 'dotenv'
import { DataSource } from 'typeorm'

// Load environment variables for database configuration
dotenv.config()

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'job_tracker',
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync schema in dev only
  logging: process.env.NODE_ENV === 'development', // Enable query logging in dev
  entities: [
    require('../entities/User').User,
    require('../entities/JobApplication').JobApplication,
    require('../entities/Contact').Contact,
    require('../entities/Resume').Resume,
    require('../entities/JobApplicationContact').JobApplicationContact
  ],
  migrations: [
    // Migration files for production schema management
  ]
})

/**
 * Initializes database connection with error handling.
 * Terminates process on connection failure for fail-fast behavior.
 */
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize()
    console.log('Database connection established successfully')
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1)
  }
}