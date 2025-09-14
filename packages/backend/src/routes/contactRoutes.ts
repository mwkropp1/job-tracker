/**
 * Contact management routes with comprehensive CRUD operations.
 * Implements user-scoped access control and job application linking.
 */

import express, { Request, Response } from 'express'
import { param } from 'express-validator'

import { ContactController } from '../controllers/contactController'
import { authenticateToken } from '../middleware/auth'
import { validateContact, validatePaginationQuery } from '../middleware/validation'

const router = express.Router()
const contactController = new ContactController()

// Enforce authentication for all contact operations
router.use(authenticateToken)

// UUID parameter validation helper for route security
const validateUuidParam = (paramName: string) =>
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName} format`)

// POST / - Create new contact with validation
router.post(
  '/',
  validateContact,
  (req: Request, res: Response) => contactController.create(req, res)
)

// GET / - Retrieve contacts with filtering and pagination
router.get(
  '/',
  validatePaginationQuery,
  (req: Request, res: Response) => contactController.findAll(req, res)
)

// GET /:id - Retrieve single contact by UUID
router.get(
  '/:id',
  validateUuidParam('id'),
  (req: Request, res: Response) => contactController.findById(req, res)
)

// PATCH /:id - Update contact with validation
router.patch(
  '/:id',
  validateUuidParam('id'),
  validateContact,
  (req: Request, res: Response) => contactController.update(req, res)
)

// DELETE /:id - Remove contact permanently
router.delete(
  '/:id',
  validateUuidParam('id'),
  (req: Request, res: Response) => contactController.delete(req, res)
)

// POST /:id/applications/:appId - Create contact-application relationship
router.post(
  '/:id/applications/:appId',
  validateUuidParam('id'),
  validateUuidParam('appId'),
  (req: Request, res: Response) => contactController.linkToApplication(req, res)
)

// DELETE /:id/applications/:appId - Remove contact-application relationship
router.delete(
  '/:id/applications/:appId',
  validateUuidParam('id'),
  validateUuidParam('appId'),
  (req: Request, res: Response) => contactController.unlinkFromApplication(req, res)
)

export default router