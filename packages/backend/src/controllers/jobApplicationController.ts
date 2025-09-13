import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationRepository } from '../repositories/JobApplicationRepository'
import { Like } from 'typeorm'

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

      // TODO: Replace with actual authenticated user
      const userId = req.user?.id || 'temporary-user-id'

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

      res.status(201).json(jobApplication)
    } catch (error) {
      console.error('Error creating job application:', error)
      res.status(500).json({ 
        message: 'Error creating job application', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      // TODO: Replace with actual authenticated user
      const userId = req.user?.id || 'temporary-user-id'
      const { 
        page = 1, 
        limit = 10, 
        status, 
        company,
        archived = false 
      } = req.query

      const result = await this.repository.findWithFilters({
        userId,
        status: status as string,
        company: company as string,
        archived: archived === 'true',
        page: Number(page),
        limit: Number(limit)
      })

      res.json({
        applications: result.applications,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalApplications: result.total
      })
    } catch (error) {
      console.error('Error fetching job applications:', error)
      res.status(500).json({ 
        message: 'Error fetching job applications', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updateData = req.body

      const updatedApplication = await this.repository.update(id, updateData)

      if (!updatedApplication) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      res.json(updatedApplication)
    } catch (error) {
      console.error('Error updating job application:', error)
      res.status(500).json({ 
        message: 'Error updating job application', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  async archive(req: Request, res: Response) {
    try {
      const { id } = req.params

      const application = await this.repository.findById(id)

      if (!application) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      application.isArchived = true
      await this.repository.save(application)

      res.json({ 
        message: 'Job application archived successfully', 
        application 
      })
    } catch (error) {
      console.error('Error archiving job application:', error)
      res.status(500).json({ 
        message: 'Error archiving job application', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  async restore(req: Request, res: Response) {
    try {
      const { id } = req.params

      const application = await this.repository.findById(id)

      if (!application) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      application.isArchived = false
      await this.repository.save(application)

      res.json({ 
        message: 'Job application restored successfully', 
        application 
      })
    } catch (error) {
      console.error('Error restoring job application:', error)
      res.status(500).json({ 
        message: 'Error restoring job application', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      const result = await this.repository.delete(id)

      if (!result) {
        return res.status(404).json({ message: 'Job application not found' })
      }

      res.json({ message: 'Job application deleted successfully' })
    } catch (error) {
      console.error('Error deleting job application:', error)
      res.status(500).json({ 
        message: 'Error deleting job application', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
}