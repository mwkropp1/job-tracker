import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Contact, ContactRole } from '../entities/Contact'
import { ContactRepository } from '../repositories/ContactRepository'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'

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
        return res.status(401).json({ message: 'User not authenticated' })
      }

      // Check if contact with same email already exists for this user
      if (email) {
        const existingContact = await this.repository.findByEmail(email, userId)
        if (existingContact) {
          return res.status(409).json({
            message: 'A contact with this email already exists'
          })
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

      res.status(201).json(contact)
    } catch (error) {
      console.error('Error creating contact:', error)
      res.status(500).json({
        message: 'Error creating contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
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
        return res.status(401).json({ message: 'User not authenticated' })
      }

      // Check if contact exists and belongs to user
      const existingContact = await this.repository.findByIdWithUser(id, userId)
      if (!existingContact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      const updateData = { ...req.body }

      // Normalize email if provided
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase()

        // Check if email is already taken by another contact
        const contactWithEmail = await this.repository.findByEmail(updateData.email, userId)
        if (contactWithEmail && contactWithEmail.id !== id) {
          return res.status(409).json({
            message: 'A contact with this email already exists'
          })
        }
      }

      // Convert lastInteractionDate if provided
      if (updateData.lastInteractionDate) {
        updateData.lastInteractionDate = new Date(updateData.lastInteractionDate)
      }

      const updatedContact = await this.repository.update(id, updateData)

      if (!updatedContact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      res.json(updatedContact)
    } catch (error) {
      console.error('Error updating contact:', error)
      res.status(500).json({
        message: 'Error updating contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' })
      }

      // Check if contact exists and belongs to user
      const existingContact = await this.repository.findByIdWithUser(id, userId)
      if (!existingContact) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      const result = await this.repository.delete(id)

      if (!result) {
        return res.status(404).json({ message: 'Contact not found' })
      }

      res.json({ message: 'Contact deleted successfully' })
    } catch (error) {
      console.error('Error deleting contact:', error)
      res.status(500).json({
        message: 'Error deleting contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
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