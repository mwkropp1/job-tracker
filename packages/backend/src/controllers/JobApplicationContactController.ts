import { Request, Response } from 'express'

import { AppDataSource } from '../config/database'
import { InteractionType } from '../entities/JobApplicationContact'
import { JobApplicationContactRepository, CreateJobApplicationContactData, UpdateJobApplicationContactData } from '../repositories/JobApplicationContactRepository'
import { ContactRepository } from '../repositories/ContactRepository'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'
import { createLogContext } from '../utils/logger'

/**
 * Interface for creating a new contact-application interaction.
 * Defines the structure for interaction creation with proper typing.
 */
interface CreateInteractionRequest {
  jobApplicationId: string
  contactId: string
  interactionType: InteractionType
  interactionDate?: string // ISO date string
  notes?: string
}

/**
 * Interface for updating an existing interaction.
 * All fields are optional to support partial updates.
 */
interface UpdateInteractionRequest {
  interactionType?: InteractionType
  interactionDate?: string // ISO date string
  notes?: string
}

/**
 * Manages contact-application interaction operations with comprehensive CRUD functionality.
 * Implements rich interaction tracking with validation and user-scoped data access.
 */
export class JobApplicationContactController {
  private repository: JobApplicationContactRepository
  private contactRepository: ContactRepository
  private jobApplicationRepository: JobApplicationRepository

  constructor() {
    this.repository = new JobApplicationContactRepository(AppDataSource)
    this.contactRepository = new ContactRepository(AppDataSource)
    this.jobApplicationRepository = new JobApplicationRepository(AppDataSource)
  }

  /**
   * Creates a new interaction between a contact and job application.
   * Validates that both entities exist and belong to the authenticated user.
   */
  async create(req: Request, res: Response) {
    try {
      const { jobApplicationId, contactId, interactionType, interactionDate, notes } = req.body as CreateInteractionRequest

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      // Validate required fields
      if (!jobApplicationId || !contactId || !interactionType) {
        return ErrorResponses.validationError(
          res,
          'Missing required fields: jobApplicationId, contactId, interactionType',
          undefined,
          req.headers['x-request-id'] as string
        )
      }

      // Validate interaction type
      if (!Object.values(InteractionType).includes(interactionType)) {
        return ErrorResponses.validationError(
          res,
          'Invalid interaction type',
          'interactionType',
          req.headers['x-request-id'] as string
        )
      }

      // Verify job application exists and belongs to user
      const jobApplication = await this.jobApplicationRepository.findOneByIdAndUser(jobApplicationId, userId)
      if (!jobApplication) {
        return ErrorResponses.notFound(
          res,
          'Job application not found or does not belong to user',
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
      const existingInteraction = await this.repository.findByApplicationAndContact(
        jobApplicationId,
        contactId,
        userId
      )
      if (existingInteraction) {
        return ErrorResponses.conflict(
          res,
          'Interaction between this contact and job application already exists',
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

      const result = await this.repository.createInteraction(interactionData, userId)

      if (!result.success) {
        switch (result.error) {
          case 'ALREADY_EXISTS':
            return ErrorResponses.conflict(
              res,
              'Interaction between this contact and job application already exists',
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
              'Failed to create interaction',
              undefined,
              req.headers['x-request-id'] as string
            )
        }
      }

      // Fetch the created interaction with full relationships
      const createdInteractionWithRelations = await this.repository.findByIdWithUser(
        result.interaction!.id,
        userId
      )

      SuccessResponses.created(
        res,
        createdInteractionWithRelations,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'create', entity: 'job_application_contact' }),
        'Error creating contact-application interaction'
      )
    }
  }

  /**
   * Retrieves interactions with optional filtering and pagination.
   * Supports filtering by job application, contact, or interaction type.
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

      const {
        page = '1',
        limit = '10',
        jobApplicationId,
        contactId,
        interactionType
      } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        jobApplicationId: typeof jobApplicationId === 'string' ? jobApplicationId : undefined,
        contactId: typeof contactId === 'string' ? contactId : undefined,
        interactionType: typeof interactionType === 'string' && Object.values(InteractionType).includes(interactionType as InteractionType)
          ? interactionType as InteractionType
          : undefined,
        page: Number(page),
        limit: Number(limit)
      })

      SuccessResponses.ok(
        res,
        {
          interactions: result.interactions,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          totalInteractions: result.total
        },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'findAll', entity: 'job_application_contact' }),
        'Error fetching contact-application interactions'
      )
    }
  }

  /**
   * Retrieves a specific interaction by ID.
   * Validates user ownership before returning data.
   */
  async findOne(req: Request, res: Response) {
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

      const interaction = await this.repository.findByIdWithUser(id, userId)
      if (!interaction) {
        return ErrorResponses.notFound(
          res,
          'Contact-application interaction not found',
          req.headers['x-request-id'] as string
        )
      }

      SuccessResponses.ok(
        res,
        interaction,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'findOne',
          entity: 'job_application_contact',
          entityId: req.params.id
        }),
        'Error fetching contact-application interaction'
      )
    }
  }

  /**
   * Updates an existing interaction.
   * Validates user ownership and allows partial updates.
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

      const updateData = req.body as UpdateInteractionRequest

      // Validate interaction type if provided
      if (updateData.interactionType && !Object.values(InteractionType).includes(updateData.interactionType)) {
        return ErrorResponses.validationError(
          res,
          'Invalid interaction type',
          'interactionType',
          req.headers['x-request-id'] as string
        )
      }

      const updatePayload: UpdateJobApplicationContactData = {
        ...updateData,
        interactionDate: updateData.interactionDate ? new Date(updateData.interactionDate) : undefined
      }

      const updatedInteraction = await this.repository.updateInteraction(id, updatePayload, userId)

      if (!updatedInteraction) {
        return ErrorResponses.notFound(
          res,
          'Contact-application interaction not found',
          req.headers['x-request-id'] as string
        )
      }

      SuccessResponses.ok(
        res,
        updatedInteraction,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'update',
          entity: 'job_application_contact',
          entityId: req.params.id
        }),
        'Error updating contact-application interaction'
      )
    }
  }

  /**
   * Deletes an interaction between a contact and job application.
   * Validates user ownership before allowing deletion.
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

      const result = await this.repository.removeInteraction(id, userId)

      if (!result) {
        return ErrorResponses.notFound(
          res,
          'Contact-application interaction not found',
          req.headers['x-request-id'] as string
        )
      }

      SuccessResponses.ok(
        res,
        { message: 'Contact-application interaction deleted successfully' },
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, {
          action: 'delete',
          entity: 'job_application_contact',
          entityId: req.params.id
        }),
        'Error deleting contact-application interaction'
      )
    }
  }

  /**
   * Retrieves interaction statistics for the authenticated user.
   * Provides counts by interaction type for analytics.
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(
          res,
          'User not authenticated',
          req.headers['x-request-id'] as string
        )
      }

      const stats = await this.repository.getInteractionStats(userId)

      SuccessResponses.ok(
        res,
        stats,
        req.headers['x-request-id'] as string
      )
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'getStats', entity: 'job_application_contact' }),
        'Error fetching interaction statistics'
      )
    }
  }
}