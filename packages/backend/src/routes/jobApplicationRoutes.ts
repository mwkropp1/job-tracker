import express, { Request, Response } from 'express'
import { JobApplicationController } from '../controllers/jobApplicationController'
import { validateJobApplication } from '../middleware/validation'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()
const jobApplicationController = new JobApplicationController()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Create a new job application
router.post(
  '/', 
  validateJobApplication, 
  (req: Request, res: Response) => jobApplicationController.create(req, res)
)

// Get job applications (with filtering and pagination)
router.get(
  '/', 
  (req: Request, res: Response) => jobApplicationController.findAll(req, res)
)

// Update a job application
router.patch(
  '/:id', 
  validateJobApplication, 
  (req: Request, res: Response) => jobApplicationController.update(req, res)
)

// Archive a job application
router.patch(
  '/:id/archive', 
  (req: Request, res: Response) => jobApplicationController.archive(req, res)
)

// Restore an archived job application
router.patch(
  '/:id/restore', 
  (req: Request, res: Response) => jobApplicationController.restore(req, res)
)

// Permanently delete a job application (use with caution)
router.delete(
  '/:id', 
  (req: Request, res: Response) => jobApplicationController.delete(req, res)
)

export default router