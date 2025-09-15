import { Request, Response } from 'express'

import { AppDataSource } from '../config/database'
import { JobApplicationStatus } from '../entities/JobApplication'
import { InteractionType } from '../entities/JobApplicationContact'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { JobApplicationContactRepository, CreateJobApplicationContactData } from '../repositories/JobApplicationContactRepository'
import { ContactRepository } from '../repositories/ContactRepository'
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
  private contactRepository: ContactRepository
  private jobApplicationContactRepository: JobApplicationContactRepository

  constructor() {
    this.repository = new JobApplicationRepository(AppDataSource)
    this.resumeRepository = new ResumeRepository(AppDataSource)
    this.contactRepository = new ContactRepository(AppDataSource)
    this.jobApplicationContactRepository = new JobApplicationContactRepository(AppDataSource)
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

  /**
   * Links a contact to a job application with interaction details.
   * Convenience method for creating contact-application relationships.
   */
  async linkContact(req: Request, res: Response) {
    try {
      const { id: jobApplicationId } = req.params
      const { contactId, interactionType = InteractionType.OTHER, interactionDate, notes } = req.body

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Validate required fields
      if (!contactId) {
        return ErrorResponses.validationError(
          res,
          'Missing required field: contactId',
          'contactId',
          req.headers['x-request-id'] as string
        )
      }

      // Verify job application exists and belongs to user
      const jobApplication = await this.repository.findOneByIdAndUser(jobApplicationId, userId)
      if (!jobApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application not found',
          req.headers['x-request-id'] as string
        )
      }

      // Verify contact exists and belongs to user
      const contact = await this.contactRepository.findByIdWithUser(contactId, userId)
      if (!contact) {
        return ErrorResponses.notFound(
          res,
          'Contact not found or does not belong to user',
          req.headers['x-request-id'] as string
        )
      }

      // Check if interaction already exists
      const existingInteraction = await this.jobApplicationContactRepository.findByApplicationAndContact(
        jobApplicationId,
        contactId,
        userId
      )
      if (existingInteraction) {
        return ErrorResponses.conflict(
          res,
          'Contact is already linked to this job application',
          req.headers['x-request-id'] as string
        )
      }

      const interactionData: CreateJobApplicationContactData = {
        jobApplicationId,
        contactId,
        interactionType,
        interactionDate: interactionDate ? new Date(interactionDate) : new Date(),
        notes
      }

      const result = await this.jobApplicationContactRepository.createInteraction(interactionData, userId)

      if (!result.success) {
        switch (result.error) {
          case 'ALREADY_EXISTS':
            return ErrorResponses.conflict(
              res,
              'Contact is already linked to this job application',
              req.headers['x-request-id'] as string
            )
          case 'UNAUTHORIZED':
            return ErrorResponses.notFound(
              res,
              'Job application or contact not found or does not belong to user',
              req.headers['x-request-id'] as string
            )
          default:
            return ErrorResponses.validationError(
              res,
              'Failed to link contact to job application',
              undefined,
              req.headers['x-request-id'] as string
            )
        }
      }

      // Fetch the updated job application with contact relationships
      const updatedApplicationWithRelations = await this.repository.findOneByIdAndUser(
        jobApplicationId,
        userId
      )

      SuccessResponses.ok(
        res,
        {
          message: 'Contact linked to job application successfully',
          jobApplication: updatedApplicationWithRelations,
          interaction: result.interaction
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'linkContact',
          entity: 'job_application',
          entityId: req.params.id
        }),
        'Error linking contact to job application'
      )
    }
  }

  /**
   * Unlinks a contact from a job application.
   * Removes the interaction relationship between contact and application.
   */
  async unlinkContact(req: Request, res: Response) {
    try {
      const { id: jobApplicationId } = req.params
      const { contactId } = req.body

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Validate required fields
      if (!contactId) {
        return ErrorResponses.validationError(
          res,
          'Missing required field: contactId',
          'contactId',
          req.headers['x-request-id'] as string
        )
      }

      // Find the existing interaction
      const interaction = await this.jobApplicationContactRepository.findByApplicationAndContact(
        jobApplicationId,
        contactId,
        userId
      )

      if (!interaction) {
        return ErrorResponses.notFound(
          res,
          'Contact is not linked to this job application',
          req.headers['x-request-id'] as string
        )
      }

      const result = await this.jobApplicationContactRepository.removeInteraction(interaction.id, userId)

      if (!result) {
        return ErrorResponses.validationError(
          res,
          'Failed to unlink contact from job application',
          undefined,
          req.headers['x-request-id'] as string
        )
      }

      // Fetch the updated job application with contact relationships
      const updatedApplicationWithRelations = await this.repository.findOneByIdAndUser(
        jobApplicationId,
        userId
      )

      SuccessResponses.ok(
        res,
        {
          message: 'Contact unlinked from job application successfully',
          jobApplication: updatedApplicationWithRelations
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'unlinkContact',
          entity: 'job_application',
          entityId: req.params.id
        }),
        'Error unlinking contact from job application'
      )
    }
  }

  /**
   * Retrieves all contacts linked to a specific job application.
   * Returns contact details along with interaction information.
   */
  async getContacts(req: Request, res: Response) {
    try {
      const { id: jobApplicationId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Verify job application exists and belongs to user
      const jobApplication = await this.repository.findOneByIdAndUser(jobApplicationId, userId)
      if (!jobApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application not found',
          req.headers['x-request-id'] as string
        )
      }

      // Get all interactions for this job application
      const result = await this.jobApplicationContactRepository.findWithFilters({
        jobApplicationId,
        userId,
        page: 1,
        limit: 100 // Get all interactions for this application
      })

      SuccessResponses.ok(
        res,
        {
          jobApplicationId,
          contacts: result.interactions.map(interaction => ({
            contact: interaction.contact,
            interaction: {
              id: interaction.id,
              interactionType: interaction.interactionType,
              interactionDate: interaction.interactionDate,
              notes: interaction.notes,
              createdAt: interaction.createdAt,
              updatedAt: interaction.updatedAt
            }
          })),
          totalContacts: result.total
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'getContacts',
          entity: 'job_application',
          entityId: req.params.id
        }),
        'Error fetching job application contacts'
      )
    }
  }
}
