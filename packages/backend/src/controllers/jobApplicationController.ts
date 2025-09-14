import { Request, Response } from 'express'

import { AppDataSource } from '../config/database'
import { JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { ResumeRepository } from '../repositories/ResumeRepository'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'
import { createLogContext } from '../utils/logger'

/**
 * Interface for creating a new job application.
 * Defines the structure for entity creation with proper typing.
 */
interface CreateJobApplicationData {
  company: string
  jobTitle: string
  applicationDate: Date
  status: JobApplicationStatus
  jobListingUrl?: string
  notes?: string
  user: { id: string }
  resume?: { id: string }
  isArchived: boolean
}

/**
 * Manages job application operations with comprehensive CRUD functionality.
 * Implements archiving system for organization and user-scoped data access.
 */
export class JobApplicationController {
  private repository: JobApplicationRepository
  private resumeRepository: ResumeRepository

  constructor() {
    this.repository = new JobApplicationRepository(AppDataSource)
    this.resumeRepository = new ResumeRepository(AppDataSource)
  }

  async create(req: Request, res: Response) {
    try {
      const { company, jobTitle, applicationDate, status, jobListingUrl, notes, resumeId } =
        req.body

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Validate resume exists and belongs to user if provided
      if (resumeId) {
        const resume = await this.resumeRepository.findByIdWithUser(resumeId, userId)
        if (!resume) {
          return ErrorResponses.notFound(
            res,
            'Resume not found or does not belong to user',
            req.headers['x-request-id'] as string
          )
        }
      }

      const jobApplication = await this.repository.create({
        company,
        jobTitle,
        applicationDate: new Date(applicationDate),
        status: status || JobApplicationStatus.APPLIED,
        jobListingUrl,
        notes,
        user: { id: userId },
        resume: resumeId ? { id: resumeId } : undefined,
        isArchived: false,
      } satisfies CreateJobApplicationData)

      // Update resume usage statistics if resume is linked
      if (resumeId && jobApplication) {
        await this.resumeRepository.updateUsageStats(resumeId)
      }

      // Fetch the created application with resume relations for complete response
      const createdApplicationWithRelations = await this.repository.findOneByIdAndUser(
        jobApplication.id,
        userId
      )

      SuccessResponses.created(
        res,
        createdApplicationWithRelations,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'create', entity: 'job_application' }),
        'Error creating job application'
      )
    }
  }

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

      const { page = 1, limit = 10, status, company, archived = false } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        status: status as JobApplicationStatus,
        company: company as string,
        archived: archived === 'true',
        page: Number(page),
        limit: Number(limit),
      })

      SuccessResponses.ok(
        res,
        {
          applications: result.applications,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          totalApplications: result.total,
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'findAll', entity: 'job_application' }),
        'Error fetching job applications'
      )
    }
  }

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

      // Check if job application exists and belongs to user
      const existingApplication = await this.repository.findOneByIdAndUser(id, userId)
      if (!existingApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      const updateData = req.body

      // Validate resume exists and belongs to user if provided in update
      if (updateData.resumeId) {
        const resume = await this.resumeRepository.findByIdWithUser(updateData.resumeId, userId)
        if (!resume) {
          return ErrorResponses.notFound(
            res,
            'Resume not found or does not belong to user',
            req.headers['x-request-id'] as string
          )
        }
      }

      // Handle resume statistics updates
      const wasResumeLinked = !!existingApplication.resume
      const willResumeBeLinked = !!updateData.resumeId
      const resumeChanged = existingApplication.resume?.id !== updateData.resumeId

      // Update usage statistics based on changes
      if (wasResumeLinked && (!willResumeBeLinked || resumeChanged) && existingApplication.resume) {
        // Resume was removed or changed - decrement old resume
        await this.resumeRepository.decrementUsageStats(existingApplication.resume.id)
      }

      if (willResumeBeLinked && (!wasResumeLinked || resumeChanged)) {
        // Resume was added or changed - increment new resume
        await this.resumeRepository.updateUsageStats(updateData.resumeId)
      }

      const updatedApplication = await this.repository.update(id, updateData)

      if (!updatedApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      // Fetch the updated application with resume relations for complete response
      const updatedApplicationWithRelations = await this.repository.findOneByIdAndUser(id, userId)

      SuccessResponses.ok(
        res,
        updatedApplicationWithRelations,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'update',
          entity: 'job_application',
          entityId: req.params.id,
        }),
        'Error updating job application'
      )
    }
  }

  async archive(req: Request, res: Response) {
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

      // Check if job application exists and belongs to user
      const application = await this.repository.findOneByIdAndUser(id, userId)

      if (!application) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      application.isArchived = true
      await this.repository.save(application)

      SuccessResponses.ok(
        res,
        {
          message: 'Job application archived successfully',
          application,
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'archive',
          entity: 'job_application',
          entityId: req.params.id,
        }),
        'Error archiving job application'
      )
    }
  }

  async restore(req: Request, res: Response) {
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

      // Check if job application exists and belongs to user
      const application = await this.repository.findOneByIdAndUser(id, userId)

      if (!application) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      application.isArchived = false
      await this.repository.save(application)

      SuccessResponses.ok(
        res,
        {
          message: 'Job application restored successfully',
          application,
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'restore',
          entity: 'job_application',
          entityId: req.params.id,
        }),
        'Error restoring job application'
      )
    }
  }

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

      // Check if job application exists and belongs to user
      const existingApplication = await this.repository.findOneByIdAndUser(id, userId)
      if (!existingApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      // Decrement resume usage stats if application had a linked resume
      if (existingApplication.resume) {
        await this.resumeRepository.decrementUsageStats(existingApplication.resume.id)
      }

      const result = await this.repository.delete(id)

      if (!result) {
        return ErrorResponses.notFound(
          res,
          'Job application',
          req.headers['x-request-id'] as string
        )
      }

      SuccessResponses.ok(
        res,
        { message: 'Job application deleted successfully' },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'delete',
          entity: 'job_application',
          entityId: req.params.id,
        }),
        'Error deleting job application'
      )
    }
  }
}
