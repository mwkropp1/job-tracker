/**
 * Integration tests for JobApplicationContactRepository using Testcontainers PostgreSQL
 */

import type { DataSource } from 'typeorm'

import { JobApplicationContactRepository } from '../../repositories/JobApplicationContactRepository'
import { InteractionType } from '../../entities/JobApplicationContact'
import { JobApplicationStatus } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import { JobApplication } from '../../entities/JobApplication'
import { Contact } from '../../entities/Contact'
import { JobApplicationContact } from '../../entities/JobApplicationContact'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase.testcontainers'

describe('JobApplicationContactRepository - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource
  let repository: JobApplicationContactRepository
  let testUser: User
  let testJobApp: JobApplication
  let testContact: Contact

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
    repository = new JobApplicationContactRepository(dataSource)
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    // Create test entities
    const userRepository = dataSource.getRepository(User)
    testUser = await userRepository.save({
      email: 'repo-test@example.com',
      firstName: 'Repo',
      lastName: 'Test',
      password: 'hashedpassword',
      isActive: true,
    })

    const jobAppRepository = dataSource.getRepository(JobApplication)
    testJobApp = await jobAppRepository.save({
      user: testUser,
      company: 'RepoTest Corp',
      jobTitle: 'Repository Engineer',
      status: JobApplicationStatus.APPLIED,
      applicationDate: new Date(),
    })

    const contactRepository = dataSource.getRepository(Contact)
    testContact = await contactRepository.save({
      user: testUser,
      name: 'Repo Contact',
      company: 'RepoTest Corp',
      email: 'repo-contact@example.com',
    })
  })

  describe('createInteraction', () => {
    it('should create a new interaction successfully', async () => {
      const interactionData = {
        jobApplicationId: testJobApp.id,
        contactId: testContact.id,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Repository test interaction',
      }

      const result = await repository.createInteraction(interactionData, testUser.id)

      expect(result.success).toBe(true)
      expect(result.interaction).toBeDefined()
      expect(result.interaction!.interactionType).toBe(InteractionType.NETWORKING)
      expect(result.interaction!.notes).toBe('Repository test interaction')
    })

    it('should prevent duplicate interactions', async () => {
      const interactionData = {
        jobApplicationId: testJobApp.id,
        contactId: testContact.id,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'First interaction',
      }

      // Create first interaction
      const firstResult = await repository.createInteraction(interactionData, testUser.id)
      expect(firstResult.success).toBe(true)

      // Try to create duplicate
      const duplicateResult = await repository.createInteraction(interactionData, testUser.id)
      expect(duplicateResult.success).toBe(false)
      expect(duplicateResult.error).toBe('ALREADY_EXISTS')
    })

    it('should reject unauthorized access', async () => {
      const otherUser = await dataSource.getRepository(User).save({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        password: 'hashedpassword',
        isActive: true,
      })

      const interactionData = {
        jobApplicationId: testJobApp.id,
        contactId: testContact.id,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Unauthorized test',
      }

      const result = await repository.createInteraction(interactionData, otherUser.id)

      expect(result.success).toBe(false)
      expect(result.error).toBe('UNAUTHORIZED')
    })
  })

  describe('findByIdWithUser', () => {
    it('should find interaction by ID with user validation', async () => {
      // Create interaction directly
      const interactionRepository = dataSource.getRepository(JobApplicationContact)
      const interaction = await interactionRepository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.REFERRAL,
        interactionDate: new Date(),
        notes: 'Find test interaction',
      })

      const found = await repository.findByIdWithUser(interaction.id, testUser.id)

      expect(found).toBeDefined()
      expect(found!.id).toBe(interaction.id)
      expect(found!.interactionType).toBe(InteractionType.REFERRAL)
      expect(found!.jobApplication).toBeDefined()
      expect(found!.contact).toBeDefined()
    })

    it('should return null for non-existent interaction', async () => {
      // Use properly formatted UUID for non-existent ID test
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000'
      const found = await repository.findByIdWithUser(nonExistentUuid, testUser.id)
      expect(found).toBeNull()
    })

    it('should return null for unauthorized access', async () => {
      const otherUser = await dataSource.getRepository(User).save({
        email: 'other2@example.com',
        firstName: 'Other2',
        lastName: 'User2',
        password: 'hashedpassword',
        isActive: true,
      })

      // Create interaction
      const interactionRepository = dataSource.getRepository(JobApplicationContact)
      const interaction = await interactionRepository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.REFERRAL,
        interactionDate: new Date(),
        notes: 'Unauthorized find test',
      })

      const found = await repository.findByIdWithUser(interaction.id, otherUser.id)
      expect(found).toBeNull()
    })
  })

  describe('findWithFilters', () => {
    let filterTestJobApp1: JobApplication
    let filterTestJobApp2: JobApplication
    let filterTestContact1: Contact
    let filterTestContact2: Contact

    beforeEach(async () => {
      // Create unique test entities to avoid constraint violations
      const jobAppRepository = dataSource.getRepository(JobApplication)
      const contactRepository = dataSource.getRepository(Contact)
      const interactionRepository = dataSource.getRepository(JobApplicationContact)

      filterTestJobApp1 = await jobAppRepository.save({
        user: testUser,
        company: 'FilterTest Corp 1',
        jobTitle: 'Filter Engineer 1',
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date(),
      })

      filterTestJobApp2 = await jobAppRepository.save({
        user: testUser,
        company: 'FilterTest Corp 2',
        jobTitle: 'Filter Engineer 2',
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date(),
      })

      filterTestContact1 = await contactRepository.save({
        user: testUser,
        name: 'Filter Contact 1',
        company: 'FilterTest Corp 1',
        email: 'filter1@example.com',
      })

      filterTestContact2 = await contactRepository.save({
        user: testUser,
        name: 'Filter Contact 2',
        company: 'FilterTest Corp 2',
        email: 'filter2@example.com',
      })

      // Create test interactions with unique combinations
      await interactionRepository.save([
        {
          jobApplication: filterTestJobApp1,
          contact: filterTestContact1,
          interactionType: InteractionType.NETWORKING,
          interactionDate: new Date('2024-01-01'),
          notes: 'Networking interaction',
        },
        {
          jobApplication: filterTestJobApp2,
          contact: filterTestContact2,
          interactionType: InteractionType.REFERRAL,
          interactionDate: new Date('2024-01-02'),
          notes: 'Referral interaction',
        },
      ])
    })

    it('should filter by interaction type', async () => {
      const result = await repository.findWithFilters({
        userId: testUser.id,
        interactionType: InteractionType.NETWORKING,
        page: 1,
        limit: 10,
      })

      expect(result.interactions).toHaveLength(1)
      expect(result.interactions[0].interactionType).toBe(InteractionType.NETWORKING)
      expect(result.total).toBe(1)
    })

    it('should filter by job application ID', async () => {
      const result = await repository.findWithFilters({
        userId: testUser.id,
        jobApplicationId: filterTestJobApp1.id,
        page: 1,
        limit: 10,
      })

      expect(result.interactions).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by contact ID', async () => {
      const result = await repository.findWithFilters({
        userId: testUser.id,
        contactId: filterTestContact1.id,
        page: 1,
        limit: 10,
      })

      expect(result.interactions).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should handle pagination correctly', async () => {
      const result = await repository.findWithFilters({
        userId: testUser.id,
        page: 1,
        limit: 1,
      })

      expect(result.interactions).toHaveLength(1)
      expect(result.total).toBe(2)
      expect(result.totalPages).toBe(2)
      expect(result.currentPage).toBe(1)
    })
  })

  describe('updateInteraction', () => {
    it('should update interaction successfully', async () => {
      // Create interaction
      const interactionRepository = dataSource.getRepository(JobApplicationContact)
      const interaction = await interactionRepository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Original notes',
      })

      const updateData = {
        interactionType: InteractionType.FOLLOW_UP,
        notes: 'Updated notes',
      }

      const updated = await repository.updateInteraction(interaction.id, updateData, testUser.id)

      expect(updated).toBeDefined()
      expect(updated!.interactionType).toBe(InteractionType.FOLLOW_UP)
      expect(updated!.notes).toBe('Updated notes')
    })

    it('should return null for non-existent interaction', async () => {
      const updateData = {
        notes: 'Should not update',
      }

      // Use properly formatted UUID for non-existent ID test
      const nonExistentUuid = '00000000-0000-4000-8000-000000000001'
      const updated = await repository.updateInteraction(nonExistentUuid, updateData, testUser.id)
      expect(updated).toBeNull()
    })
  })

  describe('removeInteraction', () => {
    it('should remove interaction successfully', async () => {
      // Create interaction
      const interactionRepository = dataSource.getRepository(JobApplicationContact)
      const interaction = await interactionRepository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'To be deleted',
      })

      const removed = await repository.removeInteraction(interaction.id, testUser.id)
      expect(removed).toBe(true)

      // Verify it's gone
      const found = await interactionRepository.findOne({
        where: { id: interaction.id },
      })
      expect(found).toBeNull()
    })

    it('should return false for non-existent interaction', async () => {
      // Use properly formatted UUID for non-existent ID test
      const nonExistentUuid = '00000000-0000-4000-8000-000000000002'
      const removed = await repository.removeInteraction(nonExistentUuid, testUser.id)
      expect(removed).toBe(false)
    })
  })

  describe('getInteractionStats', () => {
    let statsTestJobApp1: JobApplication
    let statsTestJobApp2: JobApplication
    let statsTestJobApp3: JobApplication
    let statsTestContact1: Contact
    let statsTestContact2: Contact
    let statsTestContact3: Contact

    beforeEach(async () => {
      // Create unique test entities for stats testing
      const jobAppRepository = dataSource.getRepository(JobApplication)
      const contactRepository = dataSource.getRepository(Contact)
      const interactionRepository = dataSource.getRepository(JobApplicationContact)

      // Create unique job applications
      statsTestJobApp1 = await jobAppRepository.save({
        user: testUser,
        company: 'StatsTest Corp 1',
        jobTitle: 'Stats Engineer 1',
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date(),
      })

      statsTestJobApp2 = await jobAppRepository.save({
        user: testUser,
        company: 'StatsTest Corp 2',
        jobTitle: 'Stats Engineer 2',
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date(),
      })

      statsTestJobApp3 = await jobAppRepository.save({
        user: testUser,
        company: 'StatsTest Corp 3',
        jobTitle: 'Stats Engineer 3',
        status: JobApplicationStatus.APPLIED,
        applicationDate: new Date(),
      })

      // Create unique contacts
      statsTestContact1 = await contactRepository.save({
        user: testUser,
        name: 'Stats Contact 1',
        company: 'StatsTest Corp 1',
        email: 'stats1@example.com',
      })

      statsTestContact2 = await contactRepository.save({
        user: testUser,
        name: 'Stats Contact 2',
        company: 'StatsTest Corp 2',
        email: 'stats2@example.com',
      })

      statsTestContact3 = await contactRepository.save({
        user: testUser,
        name: 'Stats Contact 3',
        company: 'StatsTest Corp 3',
        email: 'stats3@example.com',
      })

      // Create test interactions with unique combinations
      await interactionRepository.save([
        {
          jobApplication: statsTestJobApp1,
          contact: statsTestContact1,
          interactionType: InteractionType.NETWORKING,
          interactionDate: new Date(),
          notes: 'Stats test 1',
        },
        {
          jobApplication: statsTestJobApp2,
          contact: statsTestContact2,
          interactionType: InteractionType.NETWORKING,
          interactionDate: new Date(),
          notes: 'Stats test 2',
        },
        {
          jobApplication: statsTestJobApp3,
          contact: statsTestContact3,
          interactionType: InteractionType.REFERRAL,
          interactionDate: new Date(),
          notes: 'Stats test 3',
        },
      ])
    })

    it('should return interaction statistics', async () => {
      const stats = await repository.getInteractionStats(testUser.id)

      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')

      // Stats returns a Record<InteractionType, number>
      expect(stats[InteractionType.NETWORKING]).toBe(2)
      expect(stats[InteractionType.REFERRAL]).toBe(1)

      // All interaction types should be present, even with 0 counts
      Object.values(InteractionType).forEach(type => {
        expect(stats[type]).toBeDefined()
        expect(typeof stats[type]).toBe('number')
      })
    })
  })

  describe('PostgreSQL-specific Features', () => {
    it('should handle PostgreSQL enum operations correctly', async () => {
      const interactionRepository = dataSource.getRepository(JobApplicationContact)

      // Test all enum values
      const enumValues = Object.values(InteractionType)

      for (const [index, enumValue] of enumValues.entries()) {
        // Create unique entities for each enum test
        const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
          user: testUser,
          company: `Enum Company ${index}`,
          jobTitle: `Enum Position ${index}`,
          status: JobApplicationStatus.APPLIED,
          applicationDate: new Date(),
        })

        const uniqueContact = await dataSource.getRepository(Contact).save({
          user: testUser,
          name: `Enum Contact ${index}`,
          company: `Enum Company ${index}`,
          email: `enum${index}@example.com`,
        })

        const interaction = await interactionRepository.save({
          jobApplication: uniqueJobApp,
          contact: uniqueContact,
          interactionType: enumValue,
          interactionDate: new Date(),
          notes: `Test ${enumValue}`,
        })

        expect(interaction.interactionType).toBe(enumValue)
      }
    })

    it('should support PostgreSQL aggregation queries', async () => {
      const interactionRepository = dataSource.getRepository(JobApplicationContact)

      // Create test data for aggregation
      const testData = [
        { type: InteractionType.NETWORKING, count: 3 },
        { type: InteractionType.REFERRAL, count: 2 },
        { type: InteractionType.FOLLOW_UP, count: 1 },
      ]

      for (const { type, count } of testData) {
        for (let i = 0; i < count; i++) {
          const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
            user: testUser,
            company: `Agg Company ${type}-${i}`,
            jobTitle: `Agg Position ${type}-${i}`,
            status: JobApplicationStatus.APPLIED,
            applicationDate: new Date(),
          })

          const uniqueContact = await dataSource.getRepository(Contact).save({
            user: testUser,
            name: `Agg Contact ${type}-${i}`,
            company: `Agg Company ${type}-${i}`,
            email: `agg-${type.toLowerCase()}-${i}@example.com`,
          })

          await interactionRepository.save({
            jobApplication: uniqueJobApp,
            contact: uniqueContact,
            interactionType: type,
            interactionDate: new Date(),
            notes: `Aggregation test ${type} ${i}`,
          })
        }
      }

      // Test aggregation through repository stats
      const stats = await repository.getInteractionStats(testUser.id)

      // Stats returns a Record<InteractionType, number>
      expect(stats[InteractionType.NETWORKING]).toBeGreaterThanOrEqual(3)
      expect(stats[InteractionType.REFERRAL]).toBeGreaterThanOrEqual(2)
      expect(stats[InteractionType.FOLLOW_UP]).toBeGreaterThanOrEqual(1)
    })
  })
})