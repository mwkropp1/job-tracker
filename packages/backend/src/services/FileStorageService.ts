/**
 * File storage service abstraction for resume file management.
 * Provides a unified interface for local and cloud storage operations
 * with security, validation, and error handling built-in.
 */

import { promises as fs } from 'fs'
import path from 'path'
import {
  validateUploadedFile,
  generateSecureFilePath,
  ensureUploadDirectory,
  safeDeleteFile,
  getFileInfo,
  DEFAULT_RESUME_OPTIONS,
  type FileValidationResult,
  type FileProcessingOptions
} from '../utils/fileValidation'
import { logger } from '../utils/logger'

export interface StorageResult {
  success: boolean
  filePath?: string
  fileUrl?: string
  errors: string[]
  warnings: string[]
  fileSize?: number
}

export interface IFileStorageService {
  /**
   * Uploads and stores a file with validation
   */
  upload(
    file: Express.Multer.File,
    userId: string,
    resumeId?: string,
    options?: FileProcessingOptions
  ): Promise<StorageResult>

  /**
   * Deletes a stored file
   */
  delete(filePath: string): Promise<boolean>

  /**
   * Generates a URL for file access
   */
  getFileUrl(filePath: string): string

  /**
   * Validates a file without storing it
   */
  validateFile(
    file: Express.Multer.File,
    options?: FileProcessingOptions
  ): Promise<FileValidationResult>

  /**
   * Checks if a file exists
   */
  fileExists(filePath: string): Promise<boolean>

  /**
   * Gets file information
   */
  getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null>
}

/**
 * Local filesystem implementation of file storage service.
 * Handles file operations on the local disk with proper security measures.
 */
export class LocalFileStorageService implements IFileStorageService {
  private readonly baseUploadPath: string
  private readonly baseUrl: string

  constructor(
    baseUploadPath: string = process.env.UPLOAD_PATH || './uploads/resumes',
    baseUrl: string = process.env.FILE_BASE_URL || '/api/files'
  ) {
    this.baseUploadPath = path.resolve(baseUploadPath)
    this.baseUrl = baseUrl
  }

  /**
   * Uploads and validates a file to local storage.
   * Implements comprehensive validation and secure file handling.
   */
  async upload(
    file: Express.Multer.File,
    userId: string,
    resumeId?: string,
    options: FileProcessingOptions = DEFAULT_RESUME_OPTIONS
  ): Promise<StorageResult> {
    const result: StorageResult = {
      success: false,
      errors: [],
      warnings: []
    }

    try {
      // Validate the file first
      const validation = await this.validateFile(file, options)

      if (!validation.isValid) {
        result.errors = validation.errors
        result.warnings = validation.warnings
        return result
      }

      // Generate secure file path
      const fileName = validation.sanitizedFileName
      const filePath = generateSecureFilePath(userId, fileName, this.baseUploadPath)

      // Ensure directory exists
      const directoryReady = await ensureUploadDirectory(filePath)
      if (!directoryReady) {
        result.errors.push('Failed to prepare upload directory')
        return result
      }

      // Write file to disk
      await fs.writeFile(filePath, file.buffer)

      // Verify file was written correctly
      const fileInfo = await getFileInfo(filePath)
      if (!fileInfo) {
        result.errors.push('Failed to verify file after upload')
        // Clean up the potentially corrupted file
        await safeDeleteFile(filePath)
        return result
      }

      if (fileInfo.size !== file.size) {
        result.errors.push('File size mismatch after upload')
        await safeDeleteFile(filePath)
        return result
      }

      // Log successful upload
      logger.info('File uploaded successfully', {
        userId,
        resumeId,
        fileName: validation.sanitizedFileName,
        filePath,
        fileSize: fileInfo.size,
        mimeType: file.mimetype
      })

      result.success = true
      result.filePath = filePath
      result.fileUrl = this.getFileUrl(filePath)
      result.warnings = validation.warnings
      result.fileSize = fileInfo.size

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
      result.errors.push(`Upload failed: ${errorMessage}`)

      logger.error('File upload error', {
        userId,
        resumeId,
        fileName: file?.originalname,
        error: errorMessage
      })

      return result
    }
  }

  /**
   * Deletes a file from local storage with safety checks.
   */
  async delete(filePath: string): Promise<boolean> {
    try {
      // Verify the file path is within our upload directory for security
      const resolvedPath = path.resolve(filePath)
      const resolvedBasePath = path.resolve(this.baseUploadPath)

      if (!resolvedPath.startsWith(resolvedBasePath)) {
        logger.warn('Attempted to delete file outside upload directory', {
          filePath,
          resolvedPath,
          basePath: resolvedBasePath
        })
        return false
      }

      const deleted = await safeDeleteFile(resolvedPath)

      if (deleted) {
        logger.info('File deleted successfully', { filePath: resolvedPath })
      }

      return deleted
    } catch (error) {
      logger.error('File deletion error', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Generates a URL for accessing the stored file.
   * In production, this would typically be served through a CDN or static file server.
   */
  getFileUrl(filePath: string): string {
    // Convert absolute path to relative path from base upload directory
    const relativePath = path.relative(this.baseUploadPath, filePath)

    // Replace backslashes with forward slashes for URL compatibility
    const urlPath = relativePath.replace(/\\/g, '/')

    return `${this.baseUrl}/${urlPath}`
  }

  /**
   * Validates a file without storing it.
   * Useful for pre-upload validation.
   */
  async validateFile(
    file: Express.Multer.File,
    options: FileProcessingOptions = DEFAULT_RESUME_OPTIONS
  ): Promise<FileValidationResult> {
    return validateUploadedFile(file, options)
  }

  /**
   * Checks if a file exists in storage.
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = path.resolve(filePath)
      const stats = await fs.stat(resolvedPath)
      return stats.isFile()
    } catch {
      return false
    }
  }

  /**
   * Gets file statistics including size and modification time.
   */
  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const resolvedPath = path.resolve(filePath)
      return await getFileInfo(resolvedPath)
    } catch {
      return null
    }
  }

  /**
   * Gets the base upload directory path.
   * Useful for administrative operations.
   */
  getBaseUploadPath(): string {
    return this.baseUploadPath
  }

  /**
   * Initializes the storage service by ensuring base directory exists.
   */
  async initialize(): Promise<boolean> {
    try {
      await fs.mkdir(this.baseUploadPath, { recursive: true, mode: 0o755 })
      logger.info('File storage service initialized', {
        baseUploadPath: this.baseUploadPath,
        baseUrl: this.baseUrl
      })
      return true
    } catch (error) {
      logger.error('Failed to initialize file storage service', {
        baseUploadPath: this.baseUploadPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }
}

/**
 * Cloud file storage service implementation (placeholder for future cloud integration).
 * This would implement the same interface but use cloud storage providers like AWS S3.
 */
export class CloudFileStorageService implements IFileStorageService {
  constructor(
    private readonly cloudConfig: {
      bucket: string
      region: string
      accessKeyId: string
      secretAccessKey: string
    }
  ) {}

  async upload(
    _file: Express.Multer.File,
    _userId: string,
    _resumeId?: string,
    _options?: FileProcessingOptions
  ): Promise<StorageResult> {
    // TODO: Implement cloud upload (AWS S3, Google Cloud Storage, etc.)
    throw new Error('Cloud storage not implemented yet')
  }

  async delete(_filePath: string): Promise<boolean> {
    // TODO: Implement cloud deletion
    throw new Error('Cloud storage not implemented yet')
  }

  getFileUrl(_filePath: string): string {
    // TODO: Generate cloud URL (signed URL for private access)
    throw new Error('Cloud storage not implemented yet')
  }

  async validateFile(
    file: Express.Multer.File,
    options?: FileProcessingOptions
  ): Promise<FileValidationResult> {
    return validateUploadedFile(file, options)
  }

  async fileExists(_filePath: string): Promise<boolean> {
    // TODO: Check if file exists in cloud storage
    throw new Error('Cloud storage not implemented yet')
  }

  async getFileStats(_filePath: string): Promise<{ size: number; mtime: Date } | null> {
    // TODO: Get file stats from cloud storage
    throw new Error('Cloud storage not implemented yet')
  }
}

/**
 * Factory function to create the appropriate storage service based on configuration.
 */
export function createFileStorageService(): IFileStorageService {
  const storageType = process.env.FILE_STORAGE_TYPE || 'local'

  switch (storageType.toLowerCase()) {
    case 'cloud':
    case 's3':
      return new CloudFileStorageService({
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      })

    case 'local':
    default:
      return new LocalFileStorageService()
  }
}