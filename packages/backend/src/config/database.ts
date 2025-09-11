import 'reflect-metadata'
import { DataSource } from 'typeorm'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'job_tracker',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    require('../entities/User').User,
    require('../entities/JobApplication').JobApplication,
    require('../entities/Contact').Contact,
    require('../entities/Resume').Resume
  ],
  migrations: [
    // We'll add migration paths here
  ]
})

// Initialize the connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize()
    console.log('Database connection established successfully')
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1)
  }
}