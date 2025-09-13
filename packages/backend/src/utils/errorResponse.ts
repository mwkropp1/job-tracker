/**
 * Standardized error response utilities
 * Provides consistent error response format across all controllers
 */

import { Response } from 'express'
import { logger, LogContext } from './logger'

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',

  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: string
    field?: string
    timestamp: string
    requestId?: string
  }
}

interface SuccessResponse<T = any> {
  success: true
  data: T
  timestamp: string
  requestId?: string
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Sends a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: string,
  field?: string,
  requestId?: string
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      field,
      timestamp: new Date().toISOString(),
      requestId
    }
  }

  res.status(statusCode).json(response)
}

/**
 * Sends a standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  requestId?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId
  }

  res.status(statusCode).json(response)
}

/**
 * Handles and logs errors consistently
 */
export function handleControllerError(
  res: Response,
  error: Error,
  context: LogContext,
  defaultMessage: string = 'An unexpected error occurred'
): void {
  const requestId = context.requestId

  if (error instanceof ApiError) {
    logger.warn(error.message, { ...context, errorCode: error.code })
    sendErrorResponse(res, error.statusCode, error.code, error.message, error.details, error.field, requestId)
    return
  }

  // Log the full error for debugging
  logger.error(defaultMessage, context, error)

  // Don't expose internal error details to client
  sendErrorResponse(
    res,
    500,
    ErrorCode.INTERNAL_ERROR,
    defaultMessage,
    process.env.NODE_ENV === 'production' ? undefined : error.message,
    undefined,
    requestId
  )
}

/**
 * Common error response generators
 */
export const ErrorResponses = {
  unauthorized: (res: Response, message: string = 'User not authenticated', requestId?: string) => {
    sendErrorResponse(res, 401, ErrorCode.UNAUTHORIZED, message, undefined, undefined, requestId)
  },

  forbidden: (res: Response, message: string = 'Access forbidden', requestId?: string) => {
    sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, message, undefined, undefined, requestId)
  },

  notFound: (res: Response, resource: string = 'Resource', requestId?: string) => {
    sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, undefined, undefined, requestId)
  },

  conflict: (res: Response, message: string, requestId?: string) => {
    sendErrorResponse(res, 409, ErrorCode.RESOURCE_CONFLICT, message, undefined, undefined, requestId)
  },

  validationError: (res: Response, message: string, field?: string, requestId?: string) => {
    sendErrorResponse(res, 400, ErrorCode.VALIDATION_ERROR, message, undefined, field, requestId)
  },

  internalError: (res: Response, message: string = 'Internal server error', requestId?: string) => {
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_ERROR, message, undefined, undefined, requestId)
  }
}

/**
 * Success response generators
 */
export const SuccessResponses = {
  ok: <T>(res: Response, data: T, requestId?: string) => {
    sendSuccessResponse(res, data, 200, requestId)
  },

  created: <T>(res: Response, data: T, requestId?: string) => {
    sendSuccessResponse(res, data, 201, requestId)
  },

  noContent: (res: Response, requestId?: string) => {
    res.status(204).json({
      success: true,
      timestamp: new Date().toISOString(),
      requestId
    })
  }
}