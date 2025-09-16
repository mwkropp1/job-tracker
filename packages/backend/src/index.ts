import { json, urlencoded } from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'

import { initializeDatabase } from './config/database'
import config from './config/default'

// Import routes
import analyticsRoutes from './routes/analyticsRoutes'
import authRoutes from './routes/authRoutes'
import contactRoutes from './routes/contactRoutes'
import jobApplicationRoutes from './routes/jobApplicationRoutes'
import resumeRoutes from './routes/resumeRoutes'

// Load environment variables
dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(helmet())
app.use(json())
app.use(urlencoded({ extended: true }))

// Routes
app.use('/api/analytics', analyticsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/job-applications', jobApplicationRoutes)
app.use('/api/resumes', resumeRoutes)

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