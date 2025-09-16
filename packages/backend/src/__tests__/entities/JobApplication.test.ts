/**
 * JobApplication Entity tests using Testcontainers PostgreSQL
 * Demonstrates complex relationships and enum handling in PostgreSQL
 */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from '@jest/globals'
import { DataSource } from 'typeorm'
import { User } from '../../entities/User'
import { Resume } from '../../entities/Resume'
import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { Contact } from '../../entities/Contact'
import {
  initializeTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
} from '../../test/testDatabase'

describe('JobApplication Entity - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000) // 30 second timeout for container startup

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Entity Creation and Basic Operations', () => {
    it('should create job application with required fields', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      })

      const resumeRepo = dataSource.getRepository(Resume)
      const resume = await resumeRepo.save({
        versionName: 'Software Engineer',
        fileName: 'resume.pdf',
        fileUrl: '/resume.pdf',
        user: user,
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const today = new Date()

      const jobApp = await jobAppRepo.save({
        company: 'Tech Corp',
        jobTitle: 'Senior Software Engineer',
        jobDescription: 'Build amazing things with React and Node.js',
        applicationDate: today,
        status: JobApplicationStatus.APPLIED,
        user: user,
        resume: resume,
      })

      expect(jobApp.company).toBe('Tech Corp')
      expect(jobApp.jobTitle).toBe('Senior Software Engineer')
      expect(jobApp.status).toBe(JobApplicationStatus.APPLIED)
      expect(jobApp.applicationDate).toEqual(today)
      expect(jobApp.isArchived).toBe(false) // default value
    })

    it('should handle optional fields correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'optional-fields@example.com',
        password: 'password',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)

      const jobApp = await jobAppRepo.save({
        company: 'Minimal Corp',
        jobTitle: 'Developer',
        applicationDate: new Date(),
        jobListingUrl: 'https://example.com/job/123',
        notes: 'This is a great opportunity with flexible hours',
        user: user,
        // resume is optional
      })

      expect(jobApp.jobListingUrl).toBe('https://example.com/job/123')
      expect(jobApp.notes).toBe('This is a great opportunity with flexible hours')
      // Optional fields can be null or undefined depending on how they were saved
      expect(jobApp.resume).toBeFalsy()
      expect(jobApp.jobDescription).toBeFalsy()
    })
  })

  describe('PostgreSQL Enum Handling', () => {
    it('should handle all JobApplicationStatus enum values correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'enum-test@example.com',
        password: 'password',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const allStatuses = Object.values(JobApplicationStatus)

      // Create job application for each status
      const apps: JobApplication[] = []
      for (let i = 0; i < allStatuses.length; i++) {
        const status = allStatuses[i]
        const app = await jobAppRepo.save({
          company: `Company ${i + 1}`,
          jobTitle: `Position ${i + 1}`,
          applicationDate: new Date(),
          status: status,
          user: user,
        })
        apps.push(app)
      }

      // Verify each status was saved and retrieved correctly
      for (let i = 0; i < apps.length; i++) {
        const retrievedApp = await jobAppRepo.findOne({
          where: { id: apps[i].id },
        })
        expect(retrievedApp?.status).toBe(allStatuses[i])
      }

      // Test PostgreSQL enum aggregation
      const statusCounts = await jobAppRepo
        .createQueryBuilder('job')
        .select('job.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('job.status')
        .getRawMany()

      expect(statusCounts).toHaveLength(allStatuses.length)
      statusCounts.forEach(row => {
        expect(allStatuses.includes(row.status)).toBe(true)
        expect(row.count).toBe('1')
      })
    })

    it('should support complex queries with enum filtering', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'filter-test@example.com',
        password: 'password',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const today = new Date()

      // Create applications in different status categories
      await jobAppRepo.save([
        {
          company: 'A Corp',
          jobTitle: 'Dev 1',
          applicationDate: today,
          status: JobApplicationStatus.APPLIED,
          user,
        },
        {
          company: 'B Corp',
          jobTitle: 'Dev 2',
          applicationDate: today,
          status: JobApplicationStatus.PHONE_SCREEN,
          user,
        },
        {
          company: 'C Corp',
          jobTitle: 'Dev 3',
          applicationDate: today,
          status: JobApplicationStatus.OFFER_RECEIVED,
          user,
        },
        {
          company: 'D Corp',
          jobTitle: 'Dev 4',
          applicationDate: today,
          status: JobApplicationStatus.REJECTED,
          user,
        },
        {
          company: 'E Corp',
          jobTitle: 'Dev 5',
          applicationDate: today,
          status: JobApplicationStatus.OFFER_ACCEPTED,
          user,
        },
      ])

      // Query for active applications (not rejected/accepted/declined)
      const activeStatuses = [
        JobApplicationStatus.APPLIED,
        JobApplicationStatus.PHONE_SCREEN,
        JobApplicationStatus.TECHNICAL_INTERVIEW,
        JobApplicationStatus.ONSITE_INTERVIEW,
        JobApplicationStatus.OFFER_RECEIVED,
      ]

      const activeApps = await jobAppRepo
        .createQueryBuilder('job')
        .where('job.status IN (:...statuses)', { statuses: activeStatuses })
        .orderBy('job.company', 'ASC')
        .getMany()

      expect(activeApps).toHaveLength(3)
      expect(activeApps.map(app => app.status)).toEqual([
        JobApplicationStatus.APPLIED,
        JobApplicationStatus.PHONE_SCREEN,
        JobApplicationStatus.OFFER_RECEIVED,
      ])
    })
  })

  describe('Complex Relationships and Queries', () => {
    it('should handle job application with resume relationship', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'relationships@example.com',
        password: 'password',
      })

      const resumeRepo = dataSource.getRepository(Resume)
      const resume = await resumeRepo.save({
        versionName: 'Relationship Test',
        fileName: 'test.pdf',
        fileUrl: '/test.pdf',
        user: user,
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const jobApp = await jobAppRepo.save({
        company: 'Tech Solutions Inc',
        jobTitle: 'Senior Developer',
        applicationDate: new Date(),
        status: JobApplicationStatus.TECHNICAL_INTERVIEW,
        user: user,
        resume: resume,
      })

      // Verify relationships are loaded correctly
      const jobAppWithRelations = await jobAppRepo.findOne({
        where: { id: jobApp.id },
        relations: ['user', 'resume'],
      })

      expect(jobAppWithRelations?.user.id).toBe(user.id)
      expect(jobAppWithRelations?.resume?.id).toBe(resume.id)
      expect(jobAppWithRelations?.user.email).toBe('relationships@example.com')
      expect(jobAppWithRelations?.resume?.versionName).toBe('Relationship Test')
    })

    it('should support complex join queries across entities', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'complex-joins@example.com',
        password: 'password',
        firstName: 'Complex',
        lastName: 'User',
      })

      const resumeRepo = dataSource.getRepository(Resume)
      const resume1 = await resumeRepo.save({
        versionName: 'Frontend Resume',
        fileName: 'frontend.pdf',
        fileUrl: '/frontend.pdf',
        user: user,
      })
      const resume2 = await resumeRepo.save({
        versionName: 'Backend Resume',
        fileName: 'backend.pdf',
        fileUrl: '/backend.pdf',
        user: user,
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const today = new Date()

      await jobAppRepo.save([
        {
          company: 'Frontend Co',
          jobTitle: 'React Dev',
          applicationDate: today,
          status: JobApplicationStatus.APPLIED,
          user,
          resume: resume1,
        },
        {
          company: 'Backend Co',
          jobTitle: 'Node Dev',
          applicationDate: today,
          status: JobApplicationStatus.PHONE_SCREEN,
          user,
          resume: resume2,
        },
        {
          company: 'Full Stack Co',
          jobTitle: 'Full Stack',
          applicationDate: today,
          status: JobApplicationStatus.OFFER_RECEIVED,
          user,
          resume: resume1,
        },
      ])

      // Complex query joining job applications with user and resume data
      const jobsWithDetails = await jobAppRepo
        .createQueryBuilder('job')
        .innerJoin('job.user', 'user')
        .innerJoin('job.resume', 'resume')
        .select([
          'job.company',
          'job.jobTitle',
          'job.status',
          'user.firstName',
          'user.lastName',
          'resume.versionName',
        ])
        .where('user.email = :email', { email: 'complex-joins@example.com' })
        .orderBy('job.company', 'ASC')
        .getMany()

      expect(jobsWithDetails).toHaveLength(3)
      expect(jobsWithDetails[0].user.firstName).toBe('Complex')
      expect(jobsWithDetails[0].resume?.versionName).toBe('Backend Resume')
      expect(jobsWithDetails[1].resume?.versionName).toBe('Frontend Resume')
    })

    it('should handle PostgreSQL timestamp operations correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'timestamp-test@example.com',
        password: 'password',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)

      // Create applications on different dates
      const pastDate = new Date('2024-01-15')
      const recentDate = new Date('2024-02-20')
      const futureDate = new Date('2024-03-25')

      await jobAppRepo.save([
        { company: 'Past Corp', jobTitle: 'Old Job', applicationDate: pastDate, user },
        { company: 'Recent Corp', jobTitle: 'Recent Job', applicationDate: recentDate, user },
        { company: 'Future Corp', jobTitle: 'Future Job', applicationDate: futureDate, user },
      ])

      // Query applications within date range
      const recentApps = await jobAppRepo
        .createQueryBuilder('job')
        .where('job.applicationDate >= :startDate AND job.applicationDate <= :endDate', {
          startDate: '2024-02-01',
          endDate: '2024-02-28',
        })
        .getMany()

      expect(recentApps).toHaveLength(1)
      expect(recentApps[0].company).toBe('Recent Corp')

      // Query for applications ordered by date
      const chronologicalApps = await jobAppRepo
        .createQueryBuilder('job')
        .orderBy('job.applicationDate', 'DESC')
        .getMany()

      expect(chronologicalApps).toHaveLength(3)
      expect(chronologicalApps[0].company).toBe('Future Corp')
      expect(chronologicalApps[2].company).toBe('Past Corp')
    })
  })

  describe('PostgreSQL Indexing and Performance', () => {
    it('should efficiently search by indexed company field', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'index-test@example.com',
        password: 'password',
      })

      const jobAppRepo = dataSource.getRepository(JobApplication)
      const today = new Date()

      // Create multiple applications for different companies
      const companies = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Google', 'Microsoft']
      for (const company of companies) {
        await jobAppRepo.save({
          company: company,
          jobTitle: `Engineer at ${company}`,
          applicationDate: today,
          user: user,
        })
      }

      // Search by company (which should use the index)
      const googleApps = await jobAppRepo.find({
        where: { company: 'Google' },
      })

      expect(googleApps).toHaveLength(2)
      expect(googleApps.every(app => app.company === 'Google')).toBe(true)

      // Test ILIKE for case-insensitive search (PostgreSQL specific)
      const microsoftApps = await jobAppRepo
        .createQueryBuilder('job')
        .where('job.company ILIKE :company', { company: '%microsoft%' })
        .getMany()

      expect(microsoftApps).toHaveLength(2)
      expect(microsoftApps.every(app => app.company === 'Microsoft')).toBe(true)
    })
  })
})
