/**
 * Comprehensive input validation middleware using express-validator.
 * Implements secure sanitization and business rule validation for all entities.
 */

import { Request, Response, NextFunction } from 'express'
import { body, query, validationResult } from 'express-validator'

import { STRING_LIMITS, COLLECTION_LIMITS } from '../constants/validation'
import { ContactRole, CommunicationChannel } from '../entities/Contact'
import { JobApplicationStatus } from '../entities/JobApplication'
import { ResumeSource } from '../entities/Resume'
import { ErrorResponses } from '../utils/errorResponse'
import { createLogContext } from '../utils/logger'
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeUrl,
} from '../utils/sanitization'

/**
 * Validation chain for job application creation and updates.
 * Enforces business rules, character limits, and data sanitization.
 */
export const validateJobApplication = [
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 1, max: STRING_LIMITS.COMPANY_NAME })
    .withMessage(`Company name must be between 1 and ${STRING_LIMITS.COMPANY_NAME} characters`)
    .customSanitizer((value: string) => sanitizeString(value, STRING_LIMITS.COMPANY_NAME)),

  body('jobTitle')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 1, max: STRING_LIMITS.JOB_TITLE })
    .withMessage(`Job title must be between 1 and ${STRING_LIMITS.JOB_TITLE} characters`)
    .customSanitizer((value: string) => sanitizeString(value, STRING_LIMITS.JOB_TITLE)),

  body('applicationDate').optional().isISO8601().toDate().withMessage('Invalid application date'),

  body('status')
    .optional()
    .isIn(Object.values(JobApplicationStatus))
    .withMessage('Invalid job application status'),

  body('jobListingUrl')
    .optional()
    .isURL()
    .withMessage('Invalid URL format')
    .customSanitizer((value: string) => sanitizeUrl(value)),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.NOTES })
    .withMessage(`Notes must be less than ${STRING_LIMITS.NOTES} characters`)
    .customSanitizer((value: string) => sanitizeString(value, STRING_LIMITS.NOTES)),

  body('resumeId').optional().isUUID().withMessage('Resume ID must be a valid UUID'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const context = createLogContext(req, { action: 'job_application_validation_failed' })
      const firstError = errors.array()[0]
      return ErrorResponses.validationError(
        res,
        `Job application validation failed: ${firstError.msg}`,
        'path' in firstError ? firstError.path : undefined,
        context.requestId
      )
    }
    next()
  },
]

/**
 * Validation chain for contact entity operations.
 * Implements comprehensive field validation with security sanitization.
 */
export const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 1, max: STRING_LIMITS.CONTACT_NAME })
    .withMessage(`Contact name must be between 1 and ${STRING_LIMITS.CONTACT_NAME} characters`)
    .customSanitizer((value: string) => sanitizeString(value, STRING_LIMITS.CONTACT_NAME)),

  body('company')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.COMPANY_NAME })
    .withMessage(`Company name must be less than ${STRING_LIMITS.COMPANY_NAME} characters`)
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.COMPANY_NAME) : value
    ),

  body('role').optional().isIn(Object.values(ContactRole)).withMessage('Invalid contact role'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: STRING_LIMITS.EMAIL })
    .withMessage(`Email must be less than ${STRING_LIMITS.EMAIL} characters`)
    .customSanitizer((value: string) => (value ? sanitizeEmail(value) : value)),

  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.PHONE_NUMBER })
    .withMessage(`Phone number must be less than ${STRING_LIMITS.PHONE_NUMBER} characters`)
    .matches(/^[0-9+\-\s().-]*$/)
    .withMessage('Phone number contains invalid characters')
    .customSanitizer((value: string) => (value ? sanitizePhoneNumber(value) : value)),

  body('linkedInProfile')
    .optional()
    .isURL()
    .withMessage('Invalid LinkedIn URL format')
    .customSanitizer((value: string) => (value ? sanitizeUrl(value) : value)),

  body('lastInteractionDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid last interaction date'),

  body('interactions').optional().isArray().withMessage('Interactions must be an array'),

  body('interactions.*.date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid interaction date'),

  body('interactions.*.channel')
    .optional()
    .isIn(Object.values(CommunicationChannel))
    .withMessage('Invalid communication channel'),

  body('interactions.*.notes')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.INTERACTION_NOTES })
    .withMessage(
      `Interaction notes must be less than ${STRING_LIMITS.INTERACTION_NOTES} characters`
    )
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.INTERACTION_NOTES) : value
    ),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const context = createLogContext(req, { action: 'contact_validation_failed' })
      const firstError = errors.array()[0]
      return ErrorResponses.validationError(
        res,
        `Contact validation failed: ${firstError.msg}`,
        'path' in firstError ? firstError.path : undefined,
        context.requestId
      )
    }
    next()
  },
]

/**
 * Generic validation error handler middleware.
 * Processes validation results and returns standardized error responses.
 *
 * @param req Express request with validation results
 * @param res Express response for error output
 * @param next Express next function
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const context = createLogContext(req, { action: 'validation_failed' })
    const firstError = errors.array()[0]
    return ErrorResponses.validationError(
      res,
      `Validation failed: ${firstError.msg}`,
      'path' in firstError ? firstError.path : undefined,
      context.requestId
    )
  }
  next()
}

/**
 * Validation chain for query parameters including pagination and filtering.
 * Enforces safe pagination limits and sanitizes search inputs.
 */
export const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_PAGE, max: COLLECTION_LIMITS.MAX_PAGE })
    .withMessage(
      `Page must be a number between ${COLLECTION_LIMITS.MIN_PAGE} and ${COLLECTION_LIMITS.MAX_PAGE}`
    )
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_LIMIT, max: COLLECTION_LIMITS.MAX_LIMIT })
    .withMessage(
      `Limit must be a number between ${COLLECTION_LIMITS.MIN_LIMIT} and ${COLLECTION_LIMITS.MAX_LIMIT}`
    )
    .toInt(),

  query('company')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.COMPANY_NAME })
    .withMessage(`Company filter must be less than ${STRING_LIMITS.COMPANY_NAME} characters`)
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.COMPANY_NAME) : value
    ),

  query('status')
    .optional()
    .isIn(Object.values(JobApplicationStatus))
    .withMessage('Invalid job application status'),

  query('role').optional().isIn(Object.values(ContactRole)).withMessage('Invalid contact role'),

  query('archived').optional().isBoolean().withMessage('Archived must be a boolean').toBoolean(),

  query('hasRecentInteractions')
    .optional()
    .isBoolean()
    .withMessage('HasRecentInteractions must be a boolean')
    .toBoolean(),

  handleValidationErrors,
]

/**
 * Validation chain for resume metadata operations (non-file operations).
 * Validates resume information like version name, notes, and source.
 */
export const validateResumeMetadata = [
  body('versionName')
    .trim()
    .notEmpty()
    .withMessage('Resume version name is required')
    .isLength({ min: 1, max: STRING_LIMITS.RESUME_VERSION_NAME })
    .withMessage(
      `Version name must be between 1 and ${STRING_LIMITS.RESUME_VERSION_NAME} characters`
    )
    .customSanitizer((value: string) => sanitizeString(value, STRING_LIMITS.RESUME_VERSION_NAME)),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.RESUME_NOTES })
    .withMessage(`Notes must be less than ${STRING_LIMITS.RESUME_NOTES} characters`)
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.RESUME_NOTES) : value
    ),

  body('source').optional().isIn(Object.values(ResumeSource)).withMessage('Invalid resume source'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const context = createLogContext(req, { action: 'resume_metadata_validation_failed' })
      const firstError = errors.array()[0]
      return ErrorResponses.validationError(
        res,
        `Resume validation failed: ${firstError.msg}`,
        'path' in firstError ? firstError.path : undefined,
        context.requestId
      )
    }
    next()
  },
]

/**
 * Validation chain for resume update operations.
 * Allows partial updates to resume metadata.
 */
export const validateResumeUpdate = [
  body('versionName')
    .optional()
    .trim()
    .isLength({ min: 1, max: STRING_LIMITS.RESUME_VERSION_NAME })
    .withMessage(
      `Version name must be between 1 and ${STRING_LIMITS.RESUME_VERSION_NAME} characters`
    )
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.RESUME_VERSION_NAME) : value
    ),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.RESUME_NOTES })
    .withMessage(`Notes must be less than ${STRING_LIMITS.RESUME_NOTES} characters`)
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.RESUME_NOTES) : value
    ),

  body('source').optional().isIn(Object.values(ResumeSource)).withMessage('Invalid resume source'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const context = createLogContext(req, { action: 'resume_update_validation_failed' })
      const firstError = errors.array()[0]
      return ErrorResponses.validationError(
        res,
        `Resume update validation failed: ${firstError.msg}`,
        'path' in firstError ? firstError.path : undefined,
        context.requestId
      )
    }
    next()
  },
]

/**
 * Validation chain for resume query parameters including filtering and pagination.
 * Extends base pagination validation with resume-specific filters.
 */
export const validateResumeQuery = [
  query('page')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_PAGE, max: COLLECTION_LIMITS.MAX_PAGE })
    .withMessage(
      `Page must be a number between ${COLLECTION_LIMITS.MIN_PAGE} and ${COLLECTION_LIMITS.MAX_PAGE}`
    )
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_LIMIT, max: COLLECTION_LIMITS.MAX_LIMIT })
    .withMessage(
      `Limit must be a number between ${COLLECTION_LIMITS.MIN_LIMIT} and ${COLLECTION_LIMITS.MAX_LIMIT}`
    )
    .toInt(),

  query('versionName')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.RESUME_VERSION_NAME })
    .withMessage(
      `Version name filter must be less than ${STRING_LIMITS.RESUME_VERSION_NAME} characters`
    )
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.RESUME_VERSION_NAME) : value
    ),

  query('source')
    .optional()
    .isIn(Object.values(ResumeSource))
    .withMessage('Invalid resume source filter'),

  query('hasRecentActivity')
    .optional()
    .isBoolean()
    .withMessage('HasRecentActivity must be a boolean')
    .toBoolean(),

  handleValidationErrors,
]

/**
 * Validation chain for analytics query parameters.
 * Validates time periods, date ranges, and filtering options for analytics endpoints.
 */
export const validateAnalyticsQuery = [
  query('timePeriod')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Time period must be daily, weekly, or monthly'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value)
      const minDate = new Date('2000-01-01')
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 1)

      if (date < minDate || date > maxDate) {
        throw new Error('Start date must be between 2000-01-01 and one year from now')
      }
      return true
    }),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value)
      const minDate = new Date('2000-01-01')
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 1)

      if (date < minDate || date > maxDate) {
        throw new Error('End date must be between 2000-01-01 and one year from now')
      }
      return true
    }),

  query('company')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.COMPANY_NAME })
    .withMessage(`Company filter must be less than ${STRING_LIMITS.COMPANY_NAME} characters`)
    .customSanitizer((value: string) =>
      value ? sanitizeString(value, STRING_LIMITS.COMPANY_NAME) : value
    ),

  query('resumeId')
    .optional()
    .isUUID()
    .withMessage('Resume ID must be a valid UUID'),

  query('status')
    .optional()
    .isIn(Object.values(JobApplicationStatus))
    .withMessage('Invalid job application status'),

  query('includeArchived')
    .optional()
    .isBoolean()
    .withMessage('Include archived must be a boolean')
    .toBoolean(),

  // Custom validation to ensure date range is logical
  query('endDate')
    .optional()
    .custom((endDate, { req }) => {
      const startDate = req.query?.startDate
      if (startDate && endDate) {
        const start = new Date(startDate as string)
        const end = new Date(endDate)
        if (start > end) {
          throw new Error('End date must be after start date')
        }
      }
      return true
    }),

  handleValidationErrors,
]
