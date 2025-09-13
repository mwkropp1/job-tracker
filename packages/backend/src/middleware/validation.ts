import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'

export const validateJobApplication = [
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),
  
  body('jobTitle')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ max: 100 })
    .withMessage('Job title must be less than 100 characters'),
  
  body('applicationDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid application date'),
  
  body('status')
    .optional()
    .isIn([
      'Applied', 
      'Phone Screen', 
      'Technical Interview', 
      'Onsite Interview', 
      'Offer Received', 
      'Offer Accepted', 
      'Declined', 
      'Rejected'
    ])
    .withMessage('Invalid job application status'),
  
  body('jobListingUrl')
    .optional()
    .isURL()
    .withMessage('Invalid URL format'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]

export const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ max: 100 })
    .withMessage('Contact name must be less than 100 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),

  body('role')
    .optional()
    .isIn(['Recruiter', 'Hiring Manager', 'Referral', 'Other'])
    .withMessage('Invalid contact role'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters'),

  body('linkedInProfile')
    .optional()
    .isURL()
    .withMessage('Invalid LinkedIn URL format'),

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
    .isIn(['Email', 'LinkedIn', 'Phone', 'In-Person', 'Other'])
    .withMessage('Invalid communication channel'),

  body('interactions.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Interaction notes must be less than 500 characters'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}