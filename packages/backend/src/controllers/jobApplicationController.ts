import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { logger, createLogContext } from '../utils/logger'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'

export class JobApplicationController {
  private repository: JobApplicationRepository

  constructor() {
    this.repository = new JobApplicationRepository(AppDataSource)
  }

  async create(req: Request, res: Response) {
    try {
      const {
        company,
        jobTitle,
        applicationDate,
        status,
        jobListingUrl,
        notes,
        resumeId
      } = req.body

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      const jobApplication = await this.repository.create({
        company,
        jobTitle,
        applicationDate: new Date(applicationDate),
        status: status || JobApplicationStatus.APPLIED,
        jobListingUrl,
        notes,
        user: { id: userId } as any,
        resume: resumeId ? { id: resumeId } : undefined,
        isArchived: false
      })

      SuccessResponses.created(res, jobApplication, req.headers['x-request-id'] as string)
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
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      const {
        page = 1,
        limit = 10,
        status,
        company,
        archived = false
      } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        status: status as JobApplicationStatus,
        company: company as string,
        archived: archived === 'true',
        page: Number(page),
        limit: Number(limit)
      })

      SuccessResponses.ok(res, {
        applications: result.applications,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalApplications: result.total
      }, req.headers['x-request-id'] as string)
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
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if job application exists and belongs to user
      const existingApplication = await this.repository.findOneByIdAndUser(id, userId)
      if (!existingApplication) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      const updateData = req.body
      const updatedApplication = await this.repository.update(id, updateData)

      if (!updatedApplication) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      SuccessResponses.ok(res, updatedApplication, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'update', entity: 'job_application', entityId: req.params.id }),
        'Error updating job application'
      )
    }
  }

  async archive(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if job application exists and belongs to user
      const application = await this.repository.findOneByIdAndUser(id, userId)

      if (!application) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      application.isArchived = true
      await this.repository.save(application)

      SuccessResponses.ok(res, {
        message: 'Job application archived successfully',
        application
      }, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'archive', entity: 'job_application', entityId: req.params.id }),
        'Error archiving job application'
      )
    }
  }

  async restore(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if job application exists and belongs to user
      const application = await this.repository.findOneByIdAndUser(id, userId)

      if (!application) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      application.isArchived = false
      await this.repository.save(application)

      SuccessResponses.ok(res, {
        message: 'Job application restored successfully',
        application
      }, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'restore', entity: 'job_application', entityId: req.params.id }),
        'Error restoring job application'
      )
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if job application exists and belongs to user
      const existingApplication = await this.repository.findOneByIdAndUser(id, userId)
      if (!existingApplication) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      const result = await this.repository.delete(id)

      if (!result) {
        return ErrorResponses.notFound(res, 'Job application', req.headers['x-request-id'] as string)
      }

      SuccessResponses.ok(res, { message: 'Job application deleted successfully' }, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'delete', entity: 'job_application', entityId: req.params.id }),
        'Error deleting job application'
      )
    }
  }
}