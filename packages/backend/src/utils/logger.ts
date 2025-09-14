/**
 * Winston-based structured logging utility for the application
 * Provides consistent logging format and security-conscious error handling
 */

import winston from 'winston'

import { getLoggingConfig, createTransports } from '../config/logging'

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string
  requestId?: string
  action?: string
  entity?: string
  entityId?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

class Logger {
  private static instance: Logger
  private winstonLogger: winston.Logger
  private config = getLoggingConfig()

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  constructor() {
    this.winstonLogger = winston.createLogger({
      level: this.config.level,
      transports: createTransports(this.config),
      exitOnError: false
    })
  }

  private sanitizeMessage(message: string): string {
    if (typeof message !== 'string') {
      return String(message)
    }

    // Remove sensitive data patterns
    let sanitized = message
    this.config.sensitiveFields.forEach(field => {
      const patterns = [
        new RegExp(`${field}[=:]\\s*[^\\s,}]+`, 'gi'),
        new RegExp(`"${field}"\\s*:\\s*"[^"]+"`, 'gi'),
        new RegExp(`'${field}'\\s*:\\s*'[^']+'`, 'gi')
      ]
      patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, `${field}=***`)
      })
    })

    return sanitized.substring(0, 1000) // Limit message length
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {}

    for (const [key, value] of Object.entries(context)) {
      // Check if key contains sensitive field names
      const isSensitive = this.config.sensitiveFields.some(sensitive =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      )

      if (isSensitive) {
        sanitized[key] = '***'
        continue
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value).substring(0, 500)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value
      } else if (value === null || value === undefined) {
        sanitized[key] = value
      } else {
        sanitized[key] = String(value).substring(0, 500)
      }
    }

    return sanitized
  }

  private logWithWinston(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const sanitizedMessage = this.sanitizeMessage(message)
    const sanitizedMeta = context ? this.sanitizeContext(context) : {}

    // Add error information to meta if provided
    if (error) {
      sanitizedMeta.error = {
        name: error.name,
        message: this.sanitizeMessage(error.message),
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }
    }

    this.winstonLogger.log(level, sanitizedMessage, sanitizedMeta)
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.logWithWinston(LogLevel.ERROR, message, context, error)
  }

  warn(message: string, context?: LogContext): void {
    this.logWithWinston(LogLevel.WARN, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.logWithWinston(LogLevel.INFO, message, context)
  }

  debug(message: string, context?: LogContext): void {
    this.logWithWinston(LogLevel.DEBUG, message, context)
  }

  // Security-focused logging methods
  securityEvent(message: string, context?: LogContext): void {
    this.error(`SECURITY: ${message}`, { ...context, security: true })
  }

  authFailure(message: string, context?: LogContext): void {
    this.warn(`AUTH_FAILURE: ${message}`, { ...context, authFailure: true })
  }

  accessDenied(message: string, context?: LogContext): void {
    this.warn(`ACCESS_DENIED: ${message}`, { ...context, accessDenied: true })
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

/**
 * Creates a log context from an Express request with proper typing
 * Uses type assertion to work with Express request objects safely
 * @param req Express request object (with potential authentication data)
 * @param additional Additional context to merge
 * @returns Type-safe log context
 */
export function createLogContext(
  req: any, // Using any here to avoid TypeScript conflicts between different Request types
  additional?: Partial<LogContext>
): LogContext {
  // Safely access headers and properties with runtime checks
  const requestIdHeader = req.get ? req.get('x-request-id') : req.headers?.['x-request-id']
  const userAgentHeader = req.get ? req.get('user-agent') : req.headers?.['user-agent']

  const requestId = (typeof requestIdHeader === 'string' ? requestIdHeader : req.id) || 'unknown'
  const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader : undefined

  return {
    userId: req.user?.id,
    requestId,
    ip: req.ip,
    userAgent,
    method: req.method,
    url: req.originalUrl || req.url,
    ...additional
  }
}