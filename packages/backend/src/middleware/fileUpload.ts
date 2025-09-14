/**
 * File upload middleware using Multer with comprehensive security validation.
 * Handles resume file uploads with proper validation, size limits, and security measures.
 */

import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

import { FILE_TYPES, SYSTEM_LIMITS } from '../constants/validation'
import { ErrorResponses } from '../utils/errorResponse'
import { validateUploadedFile, DEFAULT_RESUME_OPTIONS } from '../utils/fileValidation'
import { createLogContext, logger } from '../utils/logger'

// Extend Express Request to include file validation results
interface FileValidationResults {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedFileName: string
}

declare module 'express-serve-static-core' {
  interface Request {
    fileValidation?: FileValidationResults
  }
}

/**
 * Multer configuration for resume uploads.
 *
 * Security Strategy: Uses memory storage to prevent malicious files from
 * touching disk during validation. Files are only persisted after passing
 * comprehensive security checks including magic number validation.
 *
 * Performance: Memory storage allows for faster validation but limits
 * concurrent uploads. Consider disk temp storage for high-volume scenarios.
 */
const resumeUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SYSTEM_LIMITS.RESUME_FILE_SIZE_BYTES,
    files: 1, // Only allow single file upload
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    const isAllowedMimeType = FILE_TYPES.RESUME_ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof FILE_TYPES.RESUME_ALLOWED_MIME_TYPES)[number]
    )

    if (!isAllowedMimeType) {
      const error = new Error(
        `Invalid file type. Allowed types: ${FILE_TYPES.RESUME_ALLOWED_MIME_TYPES.join(', ')}`
      ) as Error & { code: string }
      error.code = 'INVALID_FILE_TYPE'
      return cb(error as unknown as null, false)
    }

    cb(null, true)
  },
})

/**
 * Middleware for handling single resume file upload.
 * Uses 'resume' as the field name for the file input.
 */
export const uploadResumeFile = resumeUploadConfig.single('resume')

/**
 * Middleware for validating uploaded resume files.
 * Performs comprehensive security validation after multer processes the file.
 */
export const validateResumeFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = createLogContext(req, { action: 'file_validation' })

    // Check if file was provided
    if (!req.file) {
      return ErrorResponses.validationError(
        res,
        'No file provided. Please upload a resume file.',
        'resume',
        context.requestId
      )
    }

    // Perform comprehensive file validation
    const validation = await validateUploadedFile(req.file, DEFAULT_RESUME_OPTIONS)

    // Store validation results on request for use in controllers
    req.fileValidation = {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      sanitizedFileName: validation.sanitizedFileName,
    }

    // If validation failed, return error response
    if (!validation.isValid) {
      logger.warn('File validation failed', {
        ...context,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        errors: validation.errors,
      })

      return ErrorResponses.validationError(
        res,
        `File validation failed: ${validation.errors[0]}`,
        'resume',
        context.requestId
      )
    }

    // Log successful validation with warnings if any
    if (validation.warnings.length > 0) {
      logger.warn('File validation successful with warnings', {
        ...context,
        fileName: validation.sanitizedFileName,
        warnings: validation.warnings,
      })
    }

    next()
  } catch (error) {
    const context = createLogContext(req, { action: 'file_validation_error' })
    logger.error('File validation error', context, error as Error)

    return ErrorResponses.internalError(res, 'Failed to validate uploaded file', context.requestId)
  }
}

/**
 * Error handling middleware for multer upload errors.
 * Provides user-friendly error messages for common upload issues.
 */
export const handleUploadErrors = (
  error: Error & { code?: string; field?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const context = createLogContext(req, { action: 'file_upload_error' })

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        logger.warn('File size limit exceeded', {
          ...context,
          limit: SYSTEM_LIMITS.RESUME_FILE_SIZE_MB,
          error: error.message,
        })
        return ErrorResponses.validationError(
          res,
          `File size exceeds ${SYSTEM_LIMITS.RESUME_FILE_SIZE_MB}MB limit`,
          'resume',
          context.requestId
        )

      case 'LIMIT_FILE_COUNT':
        logger.warn('Too many files uploaded', context)
        return ErrorResponses.validationError(
          res,
          'Only one file can be uploaded at a time',
          'resume',
          context.requestId
        )

      case 'LIMIT_UNEXPECTED_FILE':
        logger.warn('Unexpected file field', {
          ...context,
          fieldName: error.field,
        })
        return ErrorResponses.validationError(
          res,
          'Unexpected file field. Use "resume" as the field name.',
          'resume',
          context.requestId
        )

      default:
        logger.error('Multer upload error', context, error)
        return ErrorResponses.validationError(
          res,
          'File upload error occurred',
          'resume',
          context.requestId
        )
    }
  }

  // Handle custom file type errors
  if (error.code === 'INVALID_FILE_TYPE') {
    logger.warn('Invalid file type uploaded', {
      ...context,
      error: error.message,
    })
    return ErrorResponses.validationError(res, error.message, 'resume', context.requestId)
  }

  // Handle other errors
  logger.error('Unexpected upload error', context, error)
  return ErrorResponses.internalError(
    res,
    'An unexpected error occurred during file upload',
    context.requestId
  )
}

/**
 * Middleware to ensure file is present for upload endpoints.
 * Used for endpoints that require a file to be uploaded.
 */
export const requireFile = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    const context = createLogContext(req, { action: 'file_required' })
    return ErrorResponses.validationError(
      res,
      'File is required for this operation',
      'resume',
      context.requestId
    )
  }
  next()
}

/**
 * Middleware to clean up uploaded files and assist garbage collection.
 *
 * Memory Management: Explicitly clears file buffers to help Node.js
 * garbage collection, especially important for large files.
 *
 * Future Compatibility: Provides cleanup hook for when we migrate
 * to temporary disk storage for better memory efficiency.
 */
export const cleanupUploadedFile = (req: Request, res: Response, next: NextFunction): void => {
  if (req.file && req.file.buffer) {
    // Explicit buffer cleanup helps GC reclaim memory faster for large files
    req.file.buffer = Buffer.alloc(0)
  }

  next()
}

/**
 * Combined middleware stack for resume file uploads.
 * Handles upload, validation, and error handling in the correct order.
 */
export const resumeFileUploadStack = [uploadResumeFile, handleUploadErrors, validateResumeFile]

/**
 * Utility function to check if request has a valid file after full validation.
 *
 * Combines both multer file presence check and security validation results.
 * Used in controllers to ensure file passed all validation layers before processing.
 *
 * @param req Express request with potential file and validation results
 * @returns true if file exists and passed all security validations
 */
export function hasValidFile(req: Request): boolean {
  return !!(req.file && req.fileValidation?.isValid)
}

/**
 * Utility function to safely retrieve file validation results with fallback.
 *
 * Defensive Programming: Provides safe defaults when validation hasn't run
 * or failed to attach results, preventing undefined access errors.
 *
 * @param req Express request that may contain file validation results
 * @returns File validation results object with safe defaults
 */
export function getFileValidation(req: Request) {
  return (
    req.fileValidation || {
      isValid: false,
      errors: ['No file validation results found'],
      warnings: [],
      sanitizedFileName: '',
    }
  )
}
