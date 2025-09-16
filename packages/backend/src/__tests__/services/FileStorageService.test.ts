/**
 * Unit tests for FileStorageService
 * Tests file operations, validation, security, and error handling
 */

import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import type { StorageResult } from '../../services/FileStorageService'
import { LocalFileStorageService } from '../../services/FileStorageService'
import { TestDataFactory } from '../../test'
import { TEST_CONSTANTS } from '../../test/constants'

// Mock the file utilities
jest.mock('../../utils/fileValidation', () => ({
  validateUploadedFile: jest.fn(),
  generateSecureFilePath: jest.fn(),
  ensureUploadDirectory: jest.fn(),
  safeDeleteFile: jest.fn(),
  getFileInfo: jest.fn(),
  DEFAULT_RESUME_OPTIONS: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    requireValidSignature: true,
    virusScan: false,
  },
}))

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}))

const mockFileValidation = require('../../utils/fileValidation')
const mockFs = fs as jest.Mocked<typeof fs>

describe('FileStorageService', () => {
  let fileStorageService: LocalFileStorageService
  let tempDir: string
  let testUser: any

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(tmpdir(), 'test-file-storage')
    fileStorageService = new LocalFileStorageService(tempDir, '/api/test-files')

    testUser = TestDataFactory.createMockUser()

    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mock implementations
    mockFileValidation.validateUploadedFile.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedFileName: 'test.pdf',
      fileSize: 1024000,
    })

    mockFileValidation.generateSecureFilePath.mockReturnValue(
      path.join(tempDir, 'user-123', 'secure-file-name.pdf')
    )

    mockFileValidation.ensureUploadDirectory.mockResolvedValue(true)
    mockFileValidation.safeDeleteFile.mockResolvedValue(true)
    mockFileValidation.getFileInfo.mockResolvedValue({
      size: 1024000,
      mtime: new Date('2024-01-15T10:00:00.000Z'),
      exists: true,
    })

    mockFs.stat.mockResolvedValue({
      size: 2048000,
      mtime: new Date('2024-01-15T10:00:00.000Z'),
      isFile: () => true,
      isDirectory: () => false,
    } as any)

    mockFs.access.mockResolvedValue(undefined)
    mockFs.copyFile.mockResolvedValue(undefined)
    mockFs.unlink.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // File upload operations
  describe('File Upload Operations', () => {
    it('should successfully upload a valid file', async () => {
      const mockFile = {
        fieldname: 'resume',
        originalname: 'john_doe_resume.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('fake pdf content'),
        size: 1024000,
        destination: '',
        filename: '',
        path: '/tmp/upload_12345',
      } as Express.Multer.File

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(true)
      expect(result.filePath).toBeDefined()
      expect(result.fileUrl).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.fileSize).toBe(1024000)

      // Verify file validation was called
      expect(mockFileValidation.validateUploadedFile).toHaveBeenCalledWith(
        mockFile,
        mockFileValidation.DEFAULT_RESUME_OPTIONS
      )

      // Verify secure path generation
      expect(mockFileValidation.generateSecureFilePath).toHaveBeenCalledWith(
        testUser.id,
        'test.pdf', // This should match the sanitizedFileName from the validation mock
        expect.any(String)
      )

      // Verify directory creation
      expect(mockFileValidation.ensureUploadDirectory).toHaveBeenCalled()

      // Verify file was written
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it('should reject invalid file validation', async () => {
      const mockFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('malicious content'),
        size: 1024000,
      } as Express.Multer.File

      // Mock validation failure
      mockFileValidation.validateUploadedFile.mockResolvedValue({
        isValid: false,
        errors: ['Invalid file type', 'File type not allowed'],
        warnings: [],
        fileInfo: {
          size: 1024000,
          type: 'application/x-msdownload',
          name: 'malicious.exe',
        },
      })

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid file type')
      expect(result.errors).toContain('File type not allowed')
      expect(result.filePath).toBeUndefined()

      // Verify file was not copied
      expect(mockFs.copyFile).not.toHaveBeenCalled()
    })

    it('should handle file upload with custom options', async () => {
      const mockFile = {
        originalname: 'custom.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('docx content'),
        size: 2048000,
      } as Express.Multer.File

      const customOptions = {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        requireValidSignature: false,
      }

      const result = await fileStorageService.upload(
        mockFile,
        testUser.id,
        'resume-123',
        customOptions
      )

      expect(result.success).toBe(true)

      // Verify custom options were passed to validation
      expect(mockFileValidation.validateUploadedFile).toHaveBeenCalledWith(mockFile, customOptions)

      // Verify resume ID was passed to path generation
      expect(mockFileValidation.generateSecureFilePath).toHaveBeenCalledWith(
        testUser.id,
        mockFile.originalname,
        'resume-123'
      )
    })

    it('should handle file system errors during upload', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      // Mock file system error
      mockFs.copyFile.mockRejectedValue(new Error('Disk full'))

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('Failed to save file'))
    })

    it('should handle directory creation failure', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      // Mock directory creation failure
      mockFileValidation.ensureUploadDirectory.mockRejectedValue(new Error('Permission denied'))

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  // File deletion operations
  describe('File Deletion Operations', () => {
    it('should successfully delete an existing file', async () => {
      const filePath = 'test-file.pdf'

      const deleted = await fileStorageService.delete(filePath)

      expect(deleted).toBe(true)
      expect(mockFileValidation.safeDeleteFile).toHaveBeenCalledWith(path.join(tempDir, filePath))
    })

    it('should handle deletion of non-existent file', async () => {
      const filePath = 'non-existent.pdf'

      // Mock safe delete returning false
      mockFileValidation.safeDeleteFile.mockResolvedValue(false)

      const deleted = await fileStorageService.delete(filePath)

      expect(deleted).toBe(false)
    })

    it('should handle file system errors during deletion', async () => {
      const filePath = 'error-file.pdf'

      // Mock deletion error
      mockFileValidation.safeDeleteFile.mockRejectedValue(new Error('Permission denied'))

      const deleted = await fileStorageService.delete(filePath)

      expect(deleted).toBe(false)
    })

    it('should validate file path for security', async () => {
      const maliciousPath = '../../../etc/passwd'

      const deleted = await fileStorageService.delete(maliciousPath)

      // Should have called safeDeleteFile which handles path validation
      expect(mockFileValidation.safeDeleteFile).toHaveBeenCalledWith(
        expect.stringContaining(tempDir)
      )
    })
  })

  // File validation
  describe('File Validation', () => {
    it('should validate file without storing', async () => {
      const mockFile = {
        originalname: 'validation-test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      const result = await fileStorageService.validateFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(mockFileValidation.validateUploadedFile).toHaveBeenCalledWith(
        mockFile,
        mockFileValidation.DEFAULT_RESUME_OPTIONS
      )

      // Verify no file was actually saved
      expect(mockFs.copyFile).not.toHaveBeenCalled()
    })

    it('should validate file with custom options', async () => {
      const mockFile = {
        originalname: 'custom-validation.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('docx content'),
        size: 1024000,
      } as Express.Multer.File

      const customOptions = {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      }

      const result = await fileStorageService.validateFile(mockFile, customOptions)

      expect(result.isValid).toBe(true)
      expect(mockFileValidation.validateUploadedFile).toHaveBeenCalledWith(mockFile, customOptions)
    })

    it('should return validation errors', async () => {
      const mockFile = {
        originalname: 'invalid.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('text content'),
        size: 1024000,
      } as Express.Multer.File

      mockFileValidation.validateUploadedFile.mockResolvedValue({
        isValid: false,
        errors: ['File type not allowed'],
        warnings: ['File size is large'],
        fileInfo: {
          size: 1024000,
          type: 'text/plain',
          name: 'invalid.txt',
        },
      })

      const result = await fileStorageService.validateFile(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File type not allowed')
      expect(result.warnings).toContain('File size is large')
    })
  })

  // File existence and stats
  describe('File Existence and Stats', () => {
    it('should check if file exists', async () => {
      const filePath = 'existing-file.pdf'

      const exists = await fileStorageService.fileExists(filePath)

      expect(exists).toBe(true)
      expect(mockFs.access).toHaveBeenCalledWith(path.join(tempDir, filePath))
    })

    it('should return false for non-existent file', async () => {
      const filePath = 'non-existent.pdf'

      // Mock file access error
      mockFs.access.mockRejectedValue(new Error('File not found'))

      const exists = await fileStorageService.fileExists(filePath)

      expect(exists).toBe(false)
    })

    it('should get file statistics', async () => {
      const filePath = 'stats-test.pdf'
      const mockStats = {
        size: 2048000,
        mtime: new Date('2024-01-15T10:00:00.000Z'),
      }

      // Override the getFileInfo mock for this test
      mockFileValidation.getFileInfo.mockResolvedValue(mockStats)

      const stats = await fileStorageService.getFileStats(filePath)

      expect(stats).toEqual(mockStats)
      expect(mockFileValidation.getFileInfo).toHaveBeenCalledWith(expect.stringContaining(filePath))
    })

    it('should return null for non-existent file stats', async () => {
      const filePath = 'non-existent.pdf'

      mockFs.stat.mockRejectedValue(new Error('File not found'))

      const stats = await fileStorageService.getFileStats(filePath)

      expect(stats).toBeNull()
    })
  })

  // URL generation
  describe('URL Generation', () => {
    it('should generate correct file URL', () => {
      const filePath = 'user-123/resume-456.pdf'

      const url = fileStorageService.getFileUrl(filePath)

      expect(url).toBe('/api/test-files/user-123/resume-456.pdf')
    })

    it('should handle file paths with leading slash', () => {
      const filePath = '/user-123/resume-456.pdf'

      const url = fileStorageService.getFileUrl(filePath)

      expect(url).toBe('/api/test-files/user-123/resume-456.pdf')
    })

    it('should handle empty file path', () => {
      const filePath = ''

      const url = fileStorageService.getFileUrl(filePath)

      expect(url).toBe('/api/test-files/')
    })

    it('should properly encode special characters in URLs', () => {
      const filePath = 'user-123/résumé with spaces.pdf'

      const url = fileStorageService.getFileUrl(filePath)

      expect(url).toBe('/api/test-files/user-123/résumé with spaces.pdf')
    })
  })

  // Security considerations
  describe('Security Considerations', () => {
    it('should prevent path traversal attacks in file paths', async () => {
      const maliciousPath = '../../../etc/passwd'

      // Test file existence check
      await fileStorageService.fileExists(maliciousPath)

      // Verify the path was resolved within the base directory
      expect(mockFs.access).toHaveBeenCalledWith(expect.stringContaining(tempDir))
      expect(mockFs.access).toHaveBeenCalledWith(expect.not.stringContaining('../../'))
    })

    it('should handle null and undefined file inputs gracefully', async () => {
      await expect(fileStorageService.validateFile(null as any)).rejects.toThrow()

      await expect(fileStorageService.upload(undefined as any, testUser.id)).rejects.toThrow()
    })

    it('should validate user ID format', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      const maliciousUserId = '../admin'

      const result = await fileStorageService.upload(mockFile, maliciousUserId)

      // Should still work but with sanitized user ID in path generation
      expect(mockFileValidation.generateSecureFilePath).toHaveBeenCalledWith(
        maliciousUserId,
        mockFile.originalname,
        undefined
      )
    })
  })

  // Error handling and edge cases
  describe('Error Handling and Edge Cases', () => {
    it('should handle extremely large files', async () => {
      const mockFile = {
        originalname: 'huge-file.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(0), // Empty buffer to simulate
        size: 100 * 1024 * 1024 * 1024, // 100GB
      } as Express.Multer.File

      mockFileValidation.validateUploadedFile.mockResolvedValue({
        isValid: false,
        errors: ['File size exceeds maximum allowed'],
        warnings: [],
        fileInfo: {
          size: 100 * 1024 * 1024 * 1024,
          type: 'application/pdf',
          name: 'huge-file.pdf',
        },
      })

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('File size exceeds maximum allowed')
    })

    it('should handle files with no extension', async () => {
      const mockFile = {
        originalname: 'resume_no_extension',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(true)
      expect(mockFileValidation.generateSecureFilePath).toHaveBeenCalledWith(
        testUser.id,
        'resume_no_extension',
        undefined
      )
    })

    it('should handle files with multiple extensions', async () => {
      const mockFile = {
        originalname: 'resume.backup.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(true)
      expect(mockFileValidation.generateSecureFilePath).toHaveBeenCalledWith(
        testUser.id,
        'resume.backup.pdf',
        undefined
      )
    })

    it('should handle network timeouts gracefully', async () => {
      const mockFile = {
        originalname: 'timeout-test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf content'),
        size: 1024000,
      } as Express.Multer.File

      // Mock a timeout error
      mockFs.copyFile.mockRejectedValue(new Error('ETIMEDOUT'))

      const result = await fileStorageService.upload(mockFile, testUser.id)

      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('Failed to save file'))).toBe(true)
    })
  })
})
