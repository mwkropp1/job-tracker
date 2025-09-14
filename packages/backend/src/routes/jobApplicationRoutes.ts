/**
 * Job application routes providing complete application lifecycle management.
 * Implements archiving system and user-scoped data access with validation.
 */

import express, { Request, Response } from 'express'

import { JobApplicationController } from '../controllers/jobApplicationController'
import { authenticateToken } from '../middleware/auth'
import { validateJobApplication, validatePaginationQuery } from '../middleware/validation'

const router = express.Router()
const jobApplicationController = new JobApplicationController()

// Enforce authentication for all job application operations
router.use(authenticateToken)

// POST / - Create new job application with validation
router.post(
  '/', 
  validateJobApplication, 
  (req: Request, res: Response) => jobApplicationController.create(req, res)
)

// GET / - Retrieve applications with filtering and pagination
router.get(
  '/',
  validatePaginationQuery,
  (req: Request, res: Response) => jobApplicationController.findAll(req, res)
)

// PATCH /:id - Update application with validation
router.patch(
  '/:id', 
  validateJobApplication, 
  (req: Request, res: Response) => jobApplicationController.update(req, res)
)

// PATCH /:id/archive - Archive application for organization
router.patch(
  '/:id/archive', 
  (req: Request, res: Response) => jobApplicationController.archive(req, res)
)

// PATCH /:id/restore - Restore archived application to active status
router.patch(
  '/:id/restore', 
  (req: Request, res: Response) => jobApplicationController.restore(req, res)
)

// DELETE /:id - Permanently remove application and related data
router.delete(
  '/:id', 
  (req: Request, res: Response) => jobApplicationController.delete(req, res)
)

export default router