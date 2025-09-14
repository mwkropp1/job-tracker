/**
 * Resume API routes with file upload, CRUD operations, and analytics endpoints.
 * Implements comprehensive authentication, validation, and security measures.
 */

import { Router } from 'express'
import { ResumeController } from '../controllers/resumeController'
import { authenticateToken } from '../middleware/auth'
import {
  validateResumeMetadata,
  validateResumeUpdate,
  validateResumeQuery
} from '../middleware/validation'
import {
  resumeFileUploadStack,
  handleUploadErrors,
  cleanupUploadedFile
} from '../middleware/fileUpload'

const router = Router()
const resumeController = new ResumeController()

/**
 * @route POST /api/resumes/upload
 * @desc Upload a new resume file with metadata
 * @access Private (requires authentication)
 * @middleware Authentication, File upload validation, Resume metadata validation
 *
 * @body {string} versionName - Human-readable version name for the resume
 * @body {string} [notes] - Optional notes about this resume version
 * @body {string} [source] - Resume source (Upload, Google Drive, Generated)
 * @file resume - Resume file (PDF, DOC, DOCX, max 10MB)
 *
 * @returns {201} Resume created successfully with file information
 * @returns {400} Validation error (invalid file, missing data)
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {409} Conflict (version name already exists)
 * @returns {500} Server error (upload failure, storage error)
 */
router.post('/upload',
  authenticateToken,
  ...resumeFileUploadStack,
  validateResumeMetadata,
  resumeController.upload.bind(resumeController),
  cleanupUploadedFile
)

/**
 * @route GET /api/resumes
 * @desc Get paginated list of user's resumes with filtering options
 * @access Private (requires authentication)
 * @middleware Authentication, Query validation
 *
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=10] - Items per page (max 100)
 * @query {string} [versionName] - Filter by resume version name (partial match)
 * @query {string} [source] - Filter by resume source (Upload, Google Drive, Generated)
 * @query {boolean} [hasRecentActivity] - Filter by recent usage (last 90 days)
 *
 * @returns {200} Paginated list of resumes with metadata
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {500} Server error
 */
router.get('/',
  authenticateToken,
  validateResumeQuery,
  resumeController.findAll.bind(resumeController)
)

/**
 * @route GET /api/resumes/analytics
 * @desc Get comprehensive analytics for user's resume collection
 * @access Private (requires authentication)
 * @middleware Authentication only
 *
 * @returns {200} Resume analytics including usage statistics and insights
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {500} Server error
 */
router.get('/analytics',
  authenticateToken,
  resumeController.getAnalytics.bind(resumeController)
)

/**
 * @route GET /api/resumes/:id
 * @desc Get specific resume by ID with full details
 * @access Private (requires authentication and ownership)
 * @middleware Authentication, Ownership verification built into controller
 *
 * @param {string} id - Resume UUID
 *
 * @returns {200} Resume details with job application relationships
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume not found or access denied
 * @returns {500} Server error
 */
router.get('/:id',
  authenticateToken,
  resumeController.findById.bind(resumeController)
)

/**
 * @route PATCH /api/resumes/:id
 * @desc Update resume metadata (non-file information)
 * @access Private (requires authentication and ownership)
 * @middleware Authentication, Resume update validation
 *
 * @param {string} id - Resume UUID
 * @body {string} [versionName] - Updated version name
 * @body {string} [notes] - Updated notes
 * @body {string} [source] - Updated source type
 *
 * @returns {200} Updated resume information
 * @returns {400} Validation error
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume not found or access denied
 * @returns {409} Conflict (version name already exists)
 * @returns {500} Server error
 */
router.patch('/:id',
  authenticateToken,
  validateResumeUpdate,
  resumeController.update.bind(resumeController)
)

/**
 * @route DELETE /api/resumes/:id
 * @desc Delete resume and associated file
 * @access Private (requires authentication and ownership)
 * @middleware Authentication, Ownership verification built into controller
 *
 * @param {string} id - Resume UUID
 *
 * @returns {200} Deletion confirmation
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume not found or access denied
 * @returns {500} Server error (database or file system error)
 */
router.delete('/:id',
  authenticateToken,
  resumeController.delete.bind(resumeController)
)

/**
 * @route GET /api/resumes/:id/download
 * @desc Download resume file with proper headers
 * @access Private (requires authentication and ownership)
 * @middleware Authentication, Ownership verification built into controller
 *
 * @param {string} id - Resume UUID
 *
 * @returns {200} File download with proper headers
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume or file not found, access denied
 * @returns {500} Server error (file system error)
 */
router.get('/:id/download',
  authenticateToken,
  resumeController.download.bind(resumeController)
)

/**
 * @route POST /api/resumes/:id/applications/:appId
 * @desc Link resume to job application and update usage statistics
 * @access Private (requires authentication and ownership of both resources)
 * @middleware Authentication, Ownership verification built into controller
 *
 * @param {string} id - Resume UUID
 * @param {string} appId - Job Application UUID
 *
 * @returns {200} Link confirmation with success message
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume or job application not found, access denied
 * @returns {500} Server error (database transaction error)
 */
router.post('/:id/applications/:appId',
  authenticateToken,
  resumeController.linkToApplication.bind(resumeController)
)

/**
 * @route DELETE /api/resumes/:id/applications/:appId
 * @desc Unlink resume from job application and update usage statistics
 * @access Private (requires authentication and ownership of both resources)
 * @middleware Authentication, Ownership verification built into controller
 *
 * @param {string} id - Resume UUID
 * @param {string} appId - Job Application UUID
 *
 * @returns {200} Unlink confirmation with success message
 * @returns {401} Unauthorized (invalid/missing token)
 * @returns {404} Resume or job application not found, access denied
 * @returns {500} Server error (database transaction error)
 */
router.delete('/:id/applications/:appId',
  authenticateToken,
  resumeController.unlinkFromApplication.bind(resumeController)
)

/**
 * Error handling middleware for this router.
 * Catches any unhandled errors and provides consistent error responses.
 */
router.use(handleUploadErrors)

export { router as resumeRoutes }