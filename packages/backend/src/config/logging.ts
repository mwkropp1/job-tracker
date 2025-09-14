/**
 * Winston logging configuration
 * Environment-specific logging setup with security features
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

import { SYSTEM_LIMITS } from '../constants/validation'

/**
 * Log format types for better type safety
 */
export type LogFormat = 'json' | 'simple'

/**
 * Log level types based on Winston's standard levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'

/**
 * Environment types for configuration discrimination
 */
export type Environment = 'development' | 'test' | 'production'

/**
 * Transport configuration with discriminated unions
 */
export interface TransportConfig {
  console: boolean
  file: boolean
  filename?: string
  maxSize?: string
  maxFiles?: string
}

/**
 * Base logger configuration interface
 */
interface BaseLoggerConfig {
  level: LogLevel
  format: LogFormat
  transports: TransportConfig
  sensitiveFields: readonly string[]
}

/**
 * Environment-specific configurations using discriminated unions
 */
export type LoggerConfig =
  | (BaseLoggerConfig & { environment: 'development' })
  | (BaseLoggerConfig & { environment: 'test' })
  | (BaseLoggerConfig & { environment: 'production'; transports: TransportConfig & { file: true; filename: string } })

/**
 * Sensitive field names that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password', 'token', 'authorization', 'apiKey', 'api_key',
  'secret', 'privateKey', 'accessToken', 'refreshToken'
] as const

/**
 * Environment-specific configurations using discriminated unions
 * This provides better type safety and IntelliSense support
 */
export const loggingConfigs: Record<Environment, LoggerConfig> = {
  development: {
    environment: 'development',
    level: 'debug',
    format: 'simple',
    transports: {
      console: true,
      file: false
    },
    sensitiveFields: SENSITIVE_FIELDS
  },

  test: {
    environment: 'test',
    level: 'error',
    format: 'simple',
    transports: {
      console: false,
      file: false
    },
    sensitiveFields: SENSITIVE_FIELDS
  },

  production: {
    environment: 'production',
    level: 'info',
    format: 'json',
    transports: {
      console: true,
      file: true,
      filename: 'logs/app-%DATE%.log',
      maxSize: `${SYSTEM_LIMITS.LOG_FILE_SIZE_MB}m`,
      maxFiles: `${SYSTEM_LIMITS.LOG_RETENTION_DAYS}d`
    },
    sensitiveFields: SENSITIVE_FIELDS
  }
}

/**
 * Gets the appropriate logging configuration based on the current environment
 * Uses type-safe environment detection with fallback to development
 */
export function getLoggingConfig(): LoggerConfig {
  const env = process.env.NODE_ENV as Environment

  // Type-safe environment detection
  if (env && env in loggingConfigs) {
    return loggingConfigs[env]
  }

  // Safe fallback to development configuration
  return loggingConfigs.development
}

/**
 * Creates Winston transports based on configuration
 * Uses proper typing for Winston transport array
 */
export function createTransports(config: LoggerConfig): winston.transport[] {
  const transports: winston.transport[] = []

  // Console transport
  if (config.transports.console) {
    transports.push(
      new winston.transports.Console({
        format: config.format === 'json'
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.json()
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.errors({ stack: true }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                let metaStr = ''
                if (Object.keys(meta).length > 0) {
                  metaStr = ` [${Object.entries(meta)
                    .filter(([key]) => !['timestamp', 'level', 'message'].includes(key))
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}]`
                }
                return `[${timestamp}] ${level}: ${message}${metaStr}`
              })
            )
      })
    )
  }

  // File transport with rotation
  if (config.transports.file && config.transports.filename) {
    transports.push(
      new DailyRotateFile({
        filename: config.transports.filename,
        maxSize: config.transports.maxSize || `${SYSTEM_LIMITS.LOG_FILE_SIZE_MB}m`,
        maxFiles: config.transports.maxFiles || `${SYSTEM_LIMITS.LOG_RETENTION_DAYS}d`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    )

    // Separate error file transport
    transports.push(
      new DailyRotateFile({
        filename: config.transports.filename.replace('%DATE%', 'error-%DATE%'),
        level: 'error',
        maxSize: config.transports.maxSize || `${SYSTEM_LIMITS.LOG_FILE_SIZE_MB}m`,
        maxFiles: config.transports.maxFiles || `${SYSTEM_LIMITS.LOG_RETENTION_DAYS}d`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    )
  }

  return transports
}