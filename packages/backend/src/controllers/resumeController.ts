import path from 'path'

import { Request, Response } from 'express'

import { AppDataSource } from '../config/database'
import { Resume, ResumeSource } from '../entities/Resume'
import { getFileValidation, hasValidFile } from '../middleware/fileUpload'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { ResumeRepository } from '../repositories/ResumeRepository'
import { createFileStorageService } from '../services/FileStorageService'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'
import { logger, createLogContext } from '../utils/logger'

/**
 * Manages resume operations including file uploads, CRUD operations, and analytics.
 * Implements user-scoped data access, comprehensive validation, and secure file management.
 *
 * Features:
 * - Multi-format file upload (PDF, DOC, DOCX) with security validation
 * - User-scoped data access with ownership verification
 * - Atomic file operations with proper cleanup on failure
 * - Comprehensive analytics and usage tracking
 * - Secure file download with proper headers
 * - Job application linking with transaction management
 */
export class ResumeController {
  private repository: ResumeRepository
  private jobApplicationRepository: JobApplicationRepository
  private fileStorageService = createFileStorageService()

  constructor() {
    this.repository = new ResumeRepository(AppDataSource)
    this.jobApplicationRepository = new JobApplicationRepository(AppDataSource)

    // File storage service is ready to use immediately
  }

  /**
   * Uploads a new resume file with metadata and comprehensive security validation.
   *
   * Process:
   * 1. Validates user authentication and file presence
   * 2. Checks for version name conflicts within user scope
   * 3. Creates database record first for atomic operations
   * 4. Uploads file to secure storage with validation
   * 5. Updates record with file information or cleans up on failure
   *
   * @param req Express request with authenticated user and file
   * @param res Express response for upload confirmation
   * @returns {201} Resume created with file information and warnings
   * @returns {400} Validation error (invalid file, missing data)
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {409} Conflict (version name already exists)
   * @returns {500} Server error (upload failure, storage error)
   */
  async upload(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      if (!hasValidFile(req)) {
        const validation = getFileValidation(req)
        return ErrorResponses.validationError(
          res,
          validation.errors[0] || 'Invalid or missing file',
          'resume',
          req.headers['x-request-id'] as string
        )
      }

      const { versionName, notes, source = ResumeSource.UPLOAD } = req.body
      const file = req.file as Express.Multer.File
      const validation = getFileValidation(req)

      if (versionName) {
        const existingResume = await this.repository.findByVersionName(versionName, userId)
        if (existingResume) {
          return ErrorResponses.conflict(
            res,
            'A resume with this version name already exists',
            req.headers['x-request-id'] as string
          )
        }
      }

      // Create resume record first to enable atomic file storage operations with proper cleanup on failure
      const resume = await this.repository.create({
        versionName: versionName || `Resume_${Date.now()}`,
        fileName: validation.sanitizedFileName,
        fileUrl: '', // Will be updated after file storage
        source,
        notes,
        user: { id: userId },
      })

      const storageResult = await this.fileStorageService.upload(file, userId, resume.id)

      // Implement atomic file operations: if storage fails after DB creation,
      // we must clean up the orphaned database record to maintain consistency
      if (!storageResult.success) {
        await this.repository.delete(resume.id)

        return ErrorResponses.internalError(
          res,
          `File upload failed: ${storageResult.errors[0]}`,
          req.headers['x-request-id'] as string
        )
      }

      const updatedResume = await this.repository.update(resume.id, {
        fileUrl: storageResult.filePath as string,
      })

      if (!updatedResume) {
        await this.fileStorageService.delete(storageResult.filePath as string)

        return ErrorResponses.internalError(
          res,
          'Failed to update resume record after file upload',
          req.headers['x-request-id'] as string
        )
      }

      // Log successful upload
      logger.info('Resume uploaded successfully', {
        userId,
        resumeId: resume.id,
        fileName: validation.sanitizedFileName,
        fileSize: storageResult.fileSize,
        versionName: updatedResume.versionName,
      })

      // Return response with warnings if any
      const response = {
        ...updatedResume,
        fileUrl: storageResult.fileUrl, // Public URL for access
        warnings: validation.warnings,
      }

      SuccessResponses.created(res, response, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'upload', entity: 'resume' }),
        'Error uploading resume'
      )
    }
  }

  /**
   * Retrieves paginated list of user's resumes with filtering options.
   *
   * Supports filtering by:
   * - Version name (partial match)
   * - Resume source (Upload, Google Drive, Generated)
   * - Recent activity (last 90 days)
   *
   * @param req Express request with authenticated user and query params
   * @param res Express response with paginated results
   * @returns {200} Paginated list of resumes with public file URLs
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {500} Server error
   */
  async findAll(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      const { page = 1, limit = 10, versionName, source, hasRecentActivity } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        versionName: versionName as string,
        source: source as ResumeSource,
        // Convert string boolean query param to boolean/undefined for repository filter
        hasRecentActivity:
          hasRecentActivity === 'true' ? true : hasRecentActivity === 'false' ? false : undefined,
        page: Number(page),
        limit: Number(limit),
      })

      const resumesWithUrls = result.resumes.map(resume => ({
        ...resume,
        fileUrl: this.fileStorageService.getFileUrl(resume.fileUrl),
      }))

      const response = {
        resumes: resumesWithUrls,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalResumes: result.total,
      }

      SuccessResponses.ok(res, response, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'findAll', entity: 'resume' }),
        'Error fetching resumes'
      )
    }
  }

  /**
   * Retrieves specific resume by ID with comprehensive ownership verification.
   *
   * Security: Ensures user can only access their own resumes through
   * user-scoped repository queries that prevent unauthorized access.
   *
   * @param req Express request with authenticated user and resume ID
   * @param res Express response with resume details
   * @returns {200} Resume details with job application relationships
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume not found or access denied
   * @returns {500} Server error
   */
  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      const resume = await this.repository.findByIdWithUser(id, userId)

      if (!resume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      const response = {
        ...resume,
        fileUrl: this.fileStorageService.getFileUrl(resume.fileUrl),
      }

      SuccessResponses.ok(res, response, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'findById', entity: 'resume', entityId: req.params.id }),
        'Error fetching resume'
      )
    }
  }

  /**
   * Updates resume metadata (non-file information) with conflict prevention.
   *
   * Note: This endpoint only updates metadata. For file replacement,
   * upload a new resume and delete the old one to maintain audit trails.
   *
   * Conflict Prevention: Prevents duplicate version names within user scope
   * using database constraints and pre-flight checks to handle race conditions.
   *
   * @param req Express request with authenticated user, resume ID, and update data
   * @param res Express response with updated resume information
   * @returns {200} Updated resume information
   * @returns {400} Validation error
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume not found or access denied
   * @returns {409} Conflict (version name already exists)
   * @returns {500} Server error
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Check if resume exists and belongs to user
      const existingResume = await this.repository.findByIdWithUser(id, userId)
      if (!existingResume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      const updateData = { ...req.body }

      // Prevent duplicate version names within user scope - race condition handled by unique constraint
      if (updateData.versionName && updateData.versionName !== existingResume.versionName) {
        const resumeWithVersionName = await this.repository.findByVersionName(
          updateData.versionName,
          userId
        )
        if (resumeWithVersionName && resumeWithVersionName.id !== id) {
          return ErrorResponses.conflict(
            res,
            'A resume with this version name already exists',
            req.headers['x-request-id'] as string
          )
        }
      }

      const updatedResume = await this.repository.update(id, updateData)

      if (!updatedResume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      const response = {
        ...updatedResume,
        fileUrl: this.fileStorageService.getFileUrl(updatedResume.fileUrl),
      }

      SuccessResponses.ok(res, response, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'update', entity: 'resume', entityId: req.params.id }),
        'Error updating resume'
      )
    }
  }

  /**
   * Deletes resume and associated file with graceful error handling.
   *
   * Strategy: File deletion is non-blocking - we proceed with database cleanup
   * even if file deletion fails, preventing orphaned records. Files may have
   * been manually removed or stored remotely.
   *
   * @param req Express request with authenticated user and resume ID
   * @param res Express response with deletion confirmation
   * @returns {200} Deletion confirmation
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume not found or access denied
   * @returns {500} Server error (database error)
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Check if resume exists and belongs to user
      const existingResume = await this.repository.findByIdWithUser(id, userId)
      if (!existingResume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      // File deletion is non-blocking: we log warnings but proceed with database cleanup
      // to prevent orphaned records, as the file may have already been manually removed
      const fileDeleted = await this.fileStorageService.delete(existingResume.fileUrl)
      if (!fileDeleted) {
        logger.warn('Failed to delete resume file, proceeding with database deletion', {
          resumeId: id,
          filePath: existingResume.fileUrl,
        })
      }

      const result = await this.repository.delete(id)

      if (!result) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      logger.info('Resume deleted successfully', {
        userId,
        resumeId: id,
        fileName: existingResume.fileName,
        versionName: existingResume.versionName,
      })

      SuccessResponses.ok(
        res,
        { message: 'Resume deleted successfully' },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'delete', entity: 'resume', entityId: req.params.id }),
        'Error deleting resume'
      )
    }
  }

  /**
   * Downloads resume file with proper headers and comprehensive security checks.
   *
   * Security Features:
   * - User ownership verification
   * - File existence validation
   * - Proper content headers for secure download
   * - Path traversal prevention
   *
   * @param req Express request with authenticated user and resume ID
   * @param res Express response with file stream
   * @returns {200} File download with proper headers
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume or file not found, access denied
   * @returns {500} Server error (file system error)
   */
  async download(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      const resume = await this.repository.findByIdWithUser(id, userId)

      if (!resume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      // Check if file exists
      const fileExists = await this.fileStorageService.fileExists(resume.fileUrl)
      if (!fileExists) {
        logger.error('Resume file not found on disk', {
          resumeId: id,
          filePath: resume.fileUrl,
        })
        return ErrorResponses.notFound(res, 'Resume file', req.headers['x-request-id'] as string)
      }

      // Get file stats for proper headers
      const fileStats = await this.fileStorageService.getFileStats(resume.fileUrl)

      // Set proper headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${resume.fileName}"`)
      res.setHeader('Content-Type', 'application/octet-stream')

      if (fileStats) {
        res.setHeader('Content-Length', fileStats.size.toString())
        res.setHeader('Last-Modified', fileStats.mtime.toUTCString())
      }

      // Log download activity
      logger.info('Resume downloaded', {
        userId,
        resumeId: id,
        fileName: resume.fileName,
      })

      // Send file
      const resolvedPath = path.resolve(resume.fileUrl)
      res.sendFile(resolvedPath, error => {
        if (error) {
          logger.error('File download error', {
            userId,
            resumeId: id,
            filePath: resume.fileUrl,
            error: error.message,
          })

          if (!res.headersSent) {
            return ErrorResponses.internalError(
              res,
              'Failed to download file',
              req.headers['x-request-id'] as string
            )
          }
        }
      })
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'download', entity: 'resume', entityId: req.params.id }),
        'Error downloading resume'
      )
    }
  }

  /**
   * Links resume to job application with atomic transaction management.
   *
   * Security: Verifies ownership of both resume and job application
   * before creating the relationship to prevent unauthorized linking.
   *
   * @param req Express request with authenticated user, resume ID, and application ID
   * @param res Express response with link confirmation
   * @returns {200} Link confirmation with success message
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume or job application not found, access denied
   * @returns {500} Server error (database transaction error)
   */
  async linkToApplication(req: Request, res: Response) {
    try {
      const { id, appId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Verify resume belongs to user
      const resume = await this.repository.findByIdWithUser(id, userId)
      if (!resume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      // Verify job application belongs to user
      const jobApplication = await this.jobApplicationRepository.findById(appId)
      if (!jobApplication || jobApplication.user.id !== userId) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      const success = await this.repository.linkToJobApplication(id, appId)

      if (!success) {
        return ErrorResponses.internalError(
          res,
          'Failed to link resume to job application',
          req.headers['x-request-id'] as string
        )
      }

      logger.info('Resume linked to job application', {
        userId,
        resumeId: id,
        jobApplicationId: appId,
      })

      SuccessResponses.ok(
        res,
        { message: 'Resume successfully linked to job application' },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'linkToApplication',
          entity: 'resume',
          entityId: req.params.id,
          jobApplicationId: req.params.appId,
        }),
        'Error linking resume to job application'
      )
    }
  }

  /**
   * Unlinks resume from job application with atomic transaction management.
   *
   * Maintains data integrity by decrementing usage statistics and updating
   * last usage dates in a single atomic transaction.
   *
   * @param req Express request with authenticated user, resume ID, and application ID
   * @param res Express response with unlink confirmation
   * @returns {200} Unlink confirmation with success message
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {404} Resume or job application not found, access denied
   * @returns {500} Server error (database transaction error)
   */
  async unlinkFromApplication(req: Request, res: Response) {
    try {
      const { id, appId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Verify resume belongs to user
      const resume = await this.repository.findByIdWithUser(id, userId)
      if (!resume) {
        return ErrorResponses.notFound(res, 'Resume', req.headers['x-request-id'] as string)
      }

      // Verify job application belongs to user
      const jobApplication = await this.jobApplicationRepository.findById(appId)
      if (!jobApplication || jobApplication.user.id !== userId) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      const success = await this.repository.unlinkFromJobApplication(id, appId)

      if (!success) {
        return ErrorResponses.internalError(
          res,
          'Failed to unlink resume from job application',
          req.headers['x-request-id'] as string
        )
      }

      logger.info('Resume unlinked from job application', {
        userId,
        resumeId: id,
        jobApplicationId: appId,
      })

      SuccessResponses.ok(
        res,
        { message: 'Resume successfully unlinked from job application' },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'unlinkFromApplication',
          entity: 'resume',
          entityId: req.params.id,
          jobApplicationId: req.params.appId,
        }),
        'Error unlinking resume from job application'
      )
    }
  }

  /**
   * Retrieves comprehensive analytics for user's resume collection.
   *
   * Analytics Include:
   * - Total resume count and breakdown by source
   * - Most used resume based on job application count
   * - Recently used resumes (last 30 days)
   * - Average application count across all resumes
   *
   * @param req Express request with authenticated user
   * @param res Express response with analytics data
   * @returns {200} Resume analytics with usage statistics and insights
   * @returns {401} Unauthorized (invalid/missing token)
   * @returns {500} Server error
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      const analytics = await this.repository.getAnalytics(userId)

      // Add public file URLs to resumes in analytics
      if (analytics.mostUsedResume) {
        analytics.mostUsedResume.fileUrl = this.fileStorageService.getFileUrl(
          analytics.mostUsedResume.fileUrl
        )
      }

      analytics.recentlyUsedResumes = analytics.recentlyUsedResumes.map(resume => ({
        ...resume,
        fileUrl: this.fileStorageService.getFileUrl(resume.fileUrl),
      })) as Resume[]

      SuccessResponses.ok(res, analytics, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'getAnalytics', entity: 'resume' }),
        'Error fetching resume analytics'
      )
    }
  }
}
