import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Contact, ContactRole } from '../entities/Contact'
import { ContactRepository } from '../repositories/ContactRepository'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { logger, createLogContext } from '../utils/logger'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'

export class ContactController {
  private repository: ContactRepository
  private jobApplicationRepository: JobApplicationRepository

  constructor() {
    this.repository = new ContactRepository(AppDataSource)
    this.jobApplicationRepository = new JobApplicationRepository(AppDataSource)
  }

  async create(req: Request, res: Response) {
    try {
      const {
        name,
        company,
        role,
        email,
        phoneNumber,
        linkedInProfile,
        interactions,
        lastInteractionDate
      } = req.body

      const userId = req.user?.id
      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if contact with same email already exists for this user
      if (email) {
        const existingContact = await this.repository.findByEmail(email, userId)
        if (existingContact) {
          return ErrorResponses.conflict(res, 'A contact with this email already exists', req.headers['x-request-id'] as string)
        }
      }

      const contact = await this.repository.create({
        name,
        company,
        role: role || ContactRole.OTHER,
        email: email?.toLowerCase(),
        phoneNumber,
        linkedInProfile,
        interactions,
        lastInteractionDate: lastInteractionDate ? new Date(lastInteractionDate) : undefined,
        user: { id: userId }
      })

      SuccessResponses.created(res, contact, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'create', entity: 'contact' }),
        'Error creating contact'
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
        company,
        role,
        hasRecentInteractions
      } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        company: company as string,
        role: role as ContactRole,
        hasRecentInteractions: hasRecentInteractions === 'true' ? true :
                              hasRecentInteractions === 'false' ? false : undefined,
        page: Number(page),
        limit: Number(limit)
      })

      res.json({
        contacts: result.contacts,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalContacts: result.total
      })
    } catch (error) {
      console.error('Error fetching contacts:', error)
      res.status(500).json({
        message: 'Error fetching contacts',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
      }

      const contact = await this.repository.findByIdWithUser(id, userId)

      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      res.json(contact)
    } catch (error) {
      console.error('Error fetching contact:', error)
      res.status(500).json({
        message: 'Error fetching contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', req.headers['x-request-id'] as string)
      }

      // Check if contact exists and belongs to user
      const existingContact = await this.repository.findByIdWithUser(id, userId)
      if (!existingContact) {
        return ErrorResponses.notFound(res, 'Contact', req.headers['x-request-id'] as string)
      }

      const updateData = { ...req.body }

      // Normalize email if provided
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase()

        // Check if email is already taken by another contact
        const contactWithEmail = await this.repository.findByEmail(updateData.email, userId)
        if (contactWithEmail && contactWithEmail.id !== id) {
          return ErrorResponses.conflict(res, 'A contact with this email already exists', req.headers['x-request-id'] as string)
        }
      }

      // Convert lastInteractionDate if provided
      if (updateData.lastInteractionDate) {
        updateData.lastInteractionDate = new Date(updateData.lastInteractionDate)
      }

      const updatedContact = await this.repository.update(id, updateData)

      if (!updatedContact) {
        return ErrorResponses.notFound(res, 'Contact', req.headers['x-request-id'] as string)
      }

      SuccessResponses.ok(res, updatedContact, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'update', entity: 'contact', entityId: req.params.id }),
        'Error updating contact'
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

      // Check if contact exists and belongs to user
      const existingContact = await this.repository.findByIdWithUser(id, userId)
      if (!existingContact) {
        return ErrorResponses.notFound(res, 'Contact', req.headers['x-request-id'] as string)
      }

      const result = await this.repository.delete(id)

      if (!result) {
        return ErrorResponses.notFound(res, 'Contact', req.headers['x-request-id'] as string)
      }

      SuccessResponses.ok(res, { message: 'Contact deleted successfully' }, req.headers['x-request-id'] as string)
    } catch (error) {
      handleControllerError(
        res,
        error as Error,
        createLogContext(req, { action: 'delete', entity: 'contact', entityId: req.params.id }),
        'Error deleting contact'
      )
    }
  }

  async linkToApplication(req: Request, res: Response) {
    try {
      const { id, appId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
      }

      // Verify contact belongs to user
      const contact = await this.repository.findByIdWithUser(id, userId)
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      // Verify job application belongs to user
      const jobApplication = await this.jobApplicationRepository.findById(appId)
      if (!jobApplication || jobApplication.user.id !== userId) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      const success = await this.repository.linkToJobApplication(id, appId)

      if (!success) {
        return res.status(500).json({ message: 'Failed to link contact to job application' })
      }

      res.json({ message: 'Contact successfully linked to job application' })
    } catch (error) {
      console.error('Error linking contact to job application:', error)
      res.status(500).json({
        message: 'Error linking contact to job application',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async unlinkFromApplication(req: Request, res: Response) {
    try {
      const { id, appId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
      }

      // Verify contact belongs to user
      const contact = await this.repository.findByIdWithUser(id, userId)
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      // Verify job application belongs to user
      const jobApplication = await this.jobApplicationRepository.findById(appId)
      if (!jobApplication || jobApplication.user.id !== userId) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      const success = await this.repository.unlinkFromJobApplication(id, appId)

      if (!success) {
        return res.status(500).json({ message: 'Failed to unlink contact from job application' })
      }

      res.json({ message: 'Contact successfully unlinked from job application' })
    } catch (error) {
      console.error('Error unlinking contact from job application:', error)
      res.status(500).json({
        message: 'Error unlinking contact from job application',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}