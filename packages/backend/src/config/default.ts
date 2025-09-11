import dotenv from 'dotenv'

dotenv.config()

export default {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/job_tracker',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret'
}