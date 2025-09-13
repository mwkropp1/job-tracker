import { Request, Response, NextFunction } from 'express'
import { body, query, validationResult, ValidationError } from 'express-validator'
import { ContactRole, CommunicationChannel } from '../entities/Contact'
import { JobApplicationStatus } from '../entities/JobApplication'
import { sanitizeString, sanitizeEmail, sanitizePhoneNumber, sanitizeUrl } from '../utils/sanitization'
import { ErrorResponses } from '../utils/errorResponse'
import { STRING_LIMITS, COLLECTION_LIMITS } from '../constants/validation'
import { createLogContext } from '../utils/logger'

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
  
  body('applicationDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid application date'),
  
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
  }
]

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
    .customSanitizer((value: string) => value ? sanitizeString(value, STRING_LIMITS.COMPANY_NAME) : value),

  body('role')
    .optional()
    .isIn(Object.values(ContactRole))
    .withMessage('Invalid contact role'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: STRING_LIMITS.EMAIL })
    .withMessage(`Email must be less than ${STRING_LIMITS.EMAIL} characters`)
    .customSanitizer((value: string) => value ? sanitizeEmail(value) : value),

  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.PHONE_NUMBER })
    .withMessage(`Phone number must be less than ${STRING_LIMITS.PHONE_NUMBER} characters`)
    .matches(/^[0-9+\-\s\(\)\.]*$/)
    .withMessage('Phone number contains invalid characters')
    .customSanitizer((value: string) => value ? sanitizePhoneNumber(value) : value),

  body('linkedInProfile')
    .optional()
    .isURL()
    .withMessage('Invalid LinkedIn URL format')
    .customSanitizer((value: string) => value ? sanitizeUrl(value) : value),

  body('lastInteractionDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid last interaction date'),

  body('interactions')
    .optional()
    .isArray()
    .withMessage('Interactions must be an array'),

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
    .withMessage(`Interaction notes must be less than ${STRING_LIMITS.INTERACTION_NOTES} characters`)
    .customSanitizer((value: string) => value ? sanitizeString(value, STRING_LIMITS.INTERACTION_NOTES) : value),

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
  }
]

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

// Query parameter validation for pagination and filtering
export const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_PAGE, max: COLLECTION_LIMITS.MAX_PAGE })
    .withMessage(`Page must be a number between ${COLLECTION_LIMITS.MIN_PAGE} and ${COLLECTION_LIMITS.MAX_PAGE}`)
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: COLLECTION_LIMITS.MIN_LIMIT, max: COLLECTION_LIMITS.MAX_LIMIT })
    .withMessage(`Limit must be a number between ${COLLECTION_LIMITS.MIN_LIMIT} and ${COLLECTION_LIMITS.MAX_LIMIT}`)
    .toInt(),

  query('company')
    .optional()
    .trim()
    .isLength({ max: STRING_LIMITS.COMPANY_NAME })
    .withMessage(`Company filter must be less than ${STRING_LIMITS.COMPANY_NAME} characters`)
    .customSanitizer((value: string) => value ? sanitizeString(value, STRING_LIMITS.COMPANY_NAME) : value),

  query('status')
    .optional()
    .isIn(Object.values(JobApplicationStatus))
    .withMessage('Invalid job application status'),

  query('role')
    .optional()
    .isIn(Object.values(ContactRole))
    .withMessage('Invalid contact role'),

  query('archived')
    .optional()
    .isBoolean()
    .withMessage('Archived must be a boolean')
    .toBoolean(),

  query('hasRecentInteractions')
    .optional()
    .isBoolean()
    .withMessage('HasRecentInteractions must be a boolean')
    .toBoolean(),

  handleValidationErrors
]