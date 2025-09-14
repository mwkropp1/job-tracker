/**
 * File validation utilities for secure file upload handling.
 * Implements comprehensive validation including type checking, content validation,
 * and security scanning to prevent malicious file uploads.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { FILE_TYPES, SYSTEM_LIMITS, VALIDATION_PATTERNS } from '../constants/validation'
import { sanitizeString } from './sanitization'
import { logger } from './logger'

export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedFileName: string
  detectedMimeType?: string
  fileSize: number
}

export interface FileProcessingOptions {
  maxSizeBytes?: number
  allowedMimeTypes?: readonly string[]
  allowedExtensions?: readonly string[]
  requireContentValidation?: boolean
  sanitizeFileName?: boolean
}

/**
 * Magic number signatures for file type detection.
 * Used to validate actual file content against declared MIME type.
 */
const FILE_SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0], // DOC (OLE compound document)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04] // DOCX (ZIP archive)
} as const

/**
 * Default file processing options for resume uploads.
 */
export const DEFAULT_RESUME_OPTIONS: FileProcessingOptions = {
  maxSizeBytes: SYSTEM_LIMITS.RESUME_FILE_SIZE_BYTES,
  allowedMimeTypes: FILE_TYPES.RESUME_ALLOWED_MIME_TYPES,
  allowedExtensions: FILE_TYPES.RESUME_ALLOWED_EXTENSIONS,
  requireContentValidation: true,
  sanitizeFileName: true
}

/**
 * Sanitizes file names to prevent path traversal and filesystem attacks.
 * Removes dangerous characters and ensures safe file naming conventions.
 *
 * @param fileName Original file name from upload
 * @returns Sanitized file name safe for filesystem storage
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'unknown_file'
  }

  const name = path.parse(fileName).name
  const ext = path.parse(fileName).ext

  // Sanitize the name part
  const sanitizedName = sanitizeString(name, 100)
    .replace(/[^a-zA-Z0-9\-_\s]/g, '_') // Replace special chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores

  // Validate extension
  const sanitizedExt = ext.toLowerCase()

  // Ensure we have a valid name
  const finalName = sanitizedName || 'file'

  return `${finalName}${sanitizedExt}`
}

/**
 * Validates file content by checking magic number signatures.
 * Prevents file type spoofing by examining actual file content.
 *
 * @param buffer File buffer to validate
 * @param declaredMimeType MIME type declared by the client
 * @returns True if content matches declared type
 */
export async function validateFileContent(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
  if (!buffer || buffer.length === 0) {
    return false
  }

  const signature = FILE_SIGNATURES[declaredMimeType as keyof typeof FILE_SIGNATURES]
  if (!signature) {
    logger.warn(`Unknown MIME type for content validation: ${declaredMimeType}`)
    return false
  }

  // Check if buffer has enough bytes for signature
  if (buffer.length < signature.length) {
    return false
  }

  // Compare magic number signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false
    }
  }

  return true
}

/**
 * Performs comprehensive validation on uploaded files.
 * Checks file size, type, content, and security considerations.
 *
 * @param file Multer file object from upload
 * @param options Validation options and constraints
 * @returns Detailed validation result with errors and warnings
 */
export async function validateUploadedFile(
  file: Express.Multer.File,
  options: FileProcessingOptions = DEFAULT_RESUME_OPTIONS
): Promise<FileValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  const {
    maxSizeBytes = SYSTEM_LIMITS.RESUME_FILE_SIZE_BYTES,
    allowedMimeTypes = FILE_TYPES.RESUME_ALLOWED_MIME_TYPES,
    allowedExtensions = FILE_TYPES.RESUME_ALLOWED_EXTENSIONS,
    requireContentValidation = true,
    sanitizeFileName: shouldSanitizeFileName = true
  } = options

  // Basic file existence check
  if (!file) {
    errors.push('No file provided')
    return {
      isValid: false,
      errors,
      warnings,
      sanitizedFileName: '',
      fileSize: 0
    }
  }

  const sanitizedFileName = shouldSanitizeFileName
    ? sanitizeFileName(file.originalname)
    : file.originalname

  // File size validation
  if (file.size > maxSizeBytes) {
    const sizeMB = Math.round(maxSizeBytes / (1024 * 1024))
    errors.push(`File size ${Math.round(file.size / (1024 * 1024))}MB exceeds maximum allowed size of ${sizeMB}MB`)
  }

  if (file.size === 0) {
    errors.push('File is empty')
  }

  // MIME type validation
  if (!allowedMimeTypes.includes(file.mimetype as (typeof allowedMimeTypes)[number])) {
    errors.push(`File type '${file.mimetype}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`)
  }

  // File extension validation
  const fileExtension = path.extname(file.originalname).toLowerCase()
  if (!allowedExtensions.includes(fileExtension as (typeof allowedExtensions)[number])) {
    errors.push(`File extension '${fileExtension}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`)
  }

  // Content validation (magic number check)
  if (requireContentValidation && file.buffer) {
    try {
      const isValidContent = await validateFileContent(file.buffer, file.mimetype)
      if (!isValidContent) {
        errors.push('File content does not match the declared file type. This may indicate file corruption or type spoofing.')
      }
    } catch (error) {
      errors.push('Unable to validate file content')
      logger.error('File content validation error', {
        fileName: sanitizedFileName,
        mimeType: file.mimetype,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // File name validation
  if (!VALIDATION_PATTERNS.FILE_NAME.test(sanitizedFileName)) {
    warnings.push('File name contains special characters that have been sanitized')
  }

  // Check for potentially suspicious file names
  const suspiciousPatterns = [
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i, // Windows reserved names
    /^\./,  // Hidden files
    /\.(exe|bat|cmd|scr|pif|com)$/i // Executable extensions
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.originalname)) {
      errors.push(`File name '${file.originalname}' contains suspicious patterns`)
      break
    }
  }

  // Additional security checks
  if (file.buffer) {
    // Check for embedded executable content (basic heuristic)
    const bufferString = file.buffer.toString('ascii', 0, Math.min(1024, file.buffer.length))
    const executablePatterns = [
      /MZ/, // PE executable header
      /\x7fELF/, // ELF executable header
      /<script/i, // Embedded scripts
      /javascript:/i // JavaScript URLs
    ]

    for (const pattern of executablePatterns) {
      if (pattern.test(bufferString)) {
        errors.push('File contains potentially malicious content')
        logger.warn('Potentially malicious file upload attempt', {
          fileName: sanitizedFileName,
          mimeType: file.mimetype,
          fileSize: file.size
        })
        break
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedFileName,
    detectedMimeType: file.mimetype,
    fileSize: file.size
  }
}

/**
 * Generates a secure file path for storing uploaded files.
 * Creates user-scoped directories and prevents path traversal.
 *
 * @param userId User identifier for directory scoping
 * @param fileName Sanitized file name
 * @param baseUploadPath Base upload directory path
 * @returns Secure file path for storage
 */
export function generateSecureFilePath(
  userId: string,
  fileName: string,
  baseUploadPath: string = './uploads/resumes'
): string {
  // Sanitize user ID to prevent path traversal
  const sanitizedUserId = sanitizeString(userId, 50).replace(/[^a-zA-Z0-9\-_]/g, '_')

  // Generate timestamp for uniqueness
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(7)

  // Create unique filename with timestamp and random suffix
  const nameWithoutExt = path.parse(fileName).name
  const extension = path.parse(fileName).ext
  const uniqueFileName = `${timestamp}_${randomSuffix}_${nameWithoutExt}${extension}`

  return path.join(baseUploadPath, sanitizedUserId, uniqueFileName)
}

/**
 * Ensures upload directory exists and has proper permissions.
 * Creates directory structure if it doesn't exist.
 *
 * @param directoryPath Directory path to ensure
 * @returns True if directory is ready for use
 */
export async function ensureUploadDirectory(directoryPath: string): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(directoryPath), { recursive: true, mode: 0o755 })
    return true
  } catch (error) {
    logger.error('Failed to create upload directory', {
      directoryPath,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Safely deletes a file with error handling and logging.
 * Used for cleanup operations and file management.
 *
 * @param filePath Path to file to delete
 * @returns True if file was successfully deleted or doesn't exist
 */
export async function safeDeleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath)
    logger.info('File deleted successfully', { filePath })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, consider this success
      return true
    }

    logger.error('Failed to delete file', {
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

/**
 * Gets file information safely with error handling.
 * Used for file management operations.
 *
 * @param filePath Path to file to inspect
 * @returns File stats or null if file doesn't exist/error occurred
 */
export async function getFileInfo(filePath: string): Promise<{ size: number; mtime: Date } | null> {
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      mtime: stats.mtime
    }
  } catch (error) {
    logger.warn('Failed to get file info', {
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}