import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { json, urlencoded } from 'body-parser'

import config from './config/default'
import { initializeDatabase } from './config/database'

// Import routes
import jobApplicationRoutes from './routes/jobApplicationRoutes'
import contactRoutes from './routes/contactRoutes'
import authRoutes from './routes/authRoutes'

// Load environment variables
dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(helmet())
app.use(json())
app.use(urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/job-applications', jobApplicationRoutes)
app.use('/api/contacts', contactRoutes)

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  })
})

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase()

    // Start server
    const PORT = config.port
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()