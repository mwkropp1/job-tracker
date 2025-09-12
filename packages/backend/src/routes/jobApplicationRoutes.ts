import express from 'express'
import * as jobApplicationController from '../controllers/jobApplicationController'
import { validateJobApplication } from '../middleware/validation'

const router = express.Router()

// Create a new job application
router.post(
  '/', 
  validateJobApplication, 
  jobApplicationController.createJobApplication
)

// Get job applications (with filtering and pagination)
router.get(
  '/', 
  jobApplicationController.getJobApplications
)

// Update a job application
router.patch(
  '/:id', 
  validateJobApplication, 
  jobApplicationController.updateJobApplication
)

// Archive a job application
router.patch(
  '/:id/archive', 
  jobApplicationController.archiveJobApplication
)

// Restore an archived job application
router.patch(
  '/:id/restore', 
  jobApplicationController.restoreJobApplication
)

// Permanently delete a job application (use with caution)
router.delete(
  '/:id', 
  jobApplicationController.deleteJobApplication
)

export default router