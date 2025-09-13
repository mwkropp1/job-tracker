import express, { Request, Response } from 'express'
import { ContactController } from '../controllers/contactController'
import { validateContact, validatePaginationQuery } from '../middleware/validation'
import { authenticateToken } from '../middleware/auth'
import { param } from 'express-validator'

const router = express.Router()
const contactController = new ContactController()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Validation for UUID parameters
const validateUuidParam = (paramName: string) =>
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName} format`)

// Create a new contact
router.post(
  '/',
  validateContact,
  (req: Request, res: Response) => contactController.create(req, res)
)

// Get contacts with filtering and pagination
router.get(
  '/',
  validatePaginationQuery,
  (req: Request, res: Response) => contactController.findAll(req, res)
)

// Get specific contact by ID
router.get(
  '/:id',
  validateUuidParam('id'),
  (req: Request, res: Response) => contactController.findById(req, res)
)

// Update a contact
router.patch(
  '/:id',
  validateUuidParam('id'),
  validateContact,
  (req: Request, res: Response) => contactController.update(req, res)
)

// Delete a contact
router.delete(
  '/:id',
  validateUuidParam('id'),
  (req: Request, res: Response) => contactController.delete(req, res)
)

// Link contact to job application
router.post(
  '/:id/applications/:appId',
  validateUuidParam('id'),
  validateUuidParam('appId'),
  (req: Request, res: Response) => contactController.linkToApplication(req, res)
)

// Unlink contact from job application
router.delete(
  '/:id/applications/:appId',
  validateUuidParam('id'),
  validateUuidParam('appId'),
  (req: Request, res: Response) => contactController.unlinkFromApplication(req, res)
)

export default router