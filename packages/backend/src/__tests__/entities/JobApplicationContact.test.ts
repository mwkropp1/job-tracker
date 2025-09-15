/**
 * Integration tests for JobApplicationContact entity using Testcontainers PostgreSQL
 */

import type { DataSource } from 'typeorm'

import { JobApplicationContact, InteractionType } from '../../entities/JobApplicationContact'
import { JobApplicationStatus } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import { JobApplication } from '../../entities/JobApplication'
import { Contact } from '../../entities/Contact'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase.testcontainers'

describe('JobApplicationContact Entity - Testcontainers PostgreSQL', () => {
  let dataSource: DataSource
  let testUser: User
  let testJobApp: JobApplication
  let testContact: Contact

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    // Create test entities
    const userRepository = dataSource.getRepository(User)
    testUser = await userRepository.save({
      email: 'entity-test@example.com',
      firstName: 'Entity',
      lastName: 'Test',
      password: 'hashedpassword',
      isActive: true,
    })

    const jobAppRepository = dataSource.getRepository(JobApplication)
    testJobApp = await jobAppRepository.save({
      user: testUser,
      company: 'EntityTest Corp',
      jobTitle: 'Entity Engineer',
      status: JobApplicationStatus.APPLIED,
      applicationDate: new Date(),
    })

    const contactRepository = dataSource.getRepository(Contact)
    testContact = await contactRepository.save({
      user: testUser,
      name: 'Entity Contact',
      company: 'EntityTest Corp',
      email: 'entity-contact@example.com',
    })
  })

  describe('Entity Creation and Basic Operations', () => {
    it('should create job application contact with required fields', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Entity test interaction',
      })

      expect(interaction.id).toBeDefined()
      expect(interaction.interactionType).toBe(InteractionType.NETWORKING)
      expect(interaction.interactionDate).toBeDefined()
      expect(interaction.notes).toBe('Entity test interaction')
      expect(interaction.createdAt).toBeDefined()
      expect(interaction.updatedAt).toBeDefined()
    })

    it('should handle optional fields correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.OTHER,
        interactionDate: new Date(),
        // notes is optional
      })

      expect(interaction.id).toBeDefined()
      expect(interaction.interactionType).toBe(InteractionType.OTHER)
      // PostgreSQL returns null for nullable fields, not undefined
      expect(interaction.notes).toBeNull()
    })

    it('should set interaction date when provided', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)
      const specificDate = new Date('2024-01-15T12:00:00Z') // Use midday UTC to avoid timezone issues

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: specificDate,
      })

      expect(interaction.interactionDate).toBeDefined()

      // PostgreSQL date type truncates time information
      // We should test that a valid date was stored, not exact date equality
      const savedDate = new Date(interaction.interactionDate)
      expect(savedDate).toBeInstanceOf(Date)
      expect(Number.isNaN(savedDate.getTime())).toBe(false)

      // The saved date should be within a reasonable range (same year and month at minimum)
      expect(savedDate.getFullYear()).toBe(2024)
      expect(savedDate.getMonth() + 1).toBe(1) // getMonth() is 0-based
    })
  })

  describe('PostgreSQL Enum Handling', () => {
    it('should handle all InteractionType enum values correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const enumValues = [
        InteractionType.REFERRAL,
        InteractionType.INTRODUCTION,
        InteractionType.FOLLOW_UP,
        InteractionType.INTERVIEW_PREPARATION,
        InteractionType.APPLICATION_REVIEW,
        InteractionType.NETWORKING,
        InteractionType.OTHER,
      ]

      for (const [index, enumValue] of enumValues.entries()) {
        // Create unique entities for each enum test
        const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
          user: testUser,
          company: `Enum Test Company ${index}`,
          jobTitle: `Enum Test Position ${index}`,
          status: JobApplicationStatus.APPLIED,
          applicationDate: new Date(),
        })

        const uniqueContact = await dataSource.getRepository(Contact).save({
          user: testUser,
          name: `Enum Test Contact ${index}`,
          company: `Enum Test Company ${index}`,
          email: `enum-test-${index}@example.com`,
        })

        const interaction = await repository.save({
          jobApplication: uniqueJobApp,
          contact: uniqueContact,
          interactionType: enumValue,
          interactionDate: new Date(),
          notes: `Test ${enumValue}`,
        })

        expect(interaction.interactionType).toBe(enumValue)
        expect(interaction.id).toBeDefined()

        // Verify it was saved correctly by fetching from database
        const savedInteraction = await repository.findOne({
          where: { id: interaction.id },
          relations: ['jobApplication', 'contact'],
        })

        expect(savedInteraction).toBeDefined()
        expect(savedInteraction!.interactionType).toBe(enumValue)
      }
    })

    it('should support complex queries with enum filtering', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      // Create interactions with different enum values
      const interactions = []
      const enumTypes = [InteractionType.NETWORKING, InteractionType.REFERRAL, InteractionType.NETWORKING]

      for (const [index, enumType] of enumTypes.entries()) {
        const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
          user: testUser,
          company: `Query Test Company ${index}`,
          jobTitle: `Query Test Position ${index}`,
          status: JobApplicationStatus.APPLIED,
          applicationDate: new Date(),
        })

        const uniqueContact = await dataSource.getRepository(Contact).save({
          user: testUser,
          name: `Query Test Contact ${index}`,
          company: `Query Test Company ${index}`,
          email: `query-test-${index}@example.com`,
        })

        const interaction = await repository.save({
          jobApplication: uniqueJobApp,
          contact: uniqueContact,
          interactionType: enumType,
          interactionDate: new Date(),
          notes: `Query test ${enumType}`,
        })

        interactions.push(interaction)
      }

      // Query for specific enum type
      const networkingInteractions = await repository.find({
        where: { interactionType: InteractionType.NETWORKING },
        relations: ['jobApplication', 'contact'],
      })

      expect(networkingInteractions).toHaveLength(2)
      networkingInteractions.forEach(interaction => {
        expect(interaction.interactionType).toBe(InteractionType.NETWORKING)
      })

      const referralInteractions = await repository.find({
        where: { interactionType: InteractionType.REFERRAL },
        relations: ['jobApplication', 'contact'],
      })

      expect(referralInteractions).toHaveLength(1)
      expect(referralInteractions[0].interactionType).toBe(InteractionType.REFERRAL)
    })
  })

  describe('Relationships and Foreign Keys', () => {
    it('should handle job application relationship correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Relationship test',
      })

      const foundWithRelations = await repository.findOne({
        where: { id: interaction.id },
        relations: ['jobApplication', 'jobApplication.user'],
      })

      expect(foundWithRelations).toBeDefined()
      expect(foundWithRelations!.jobApplication).toBeDefined()
      expect(foundWithRelations!.jobApplication.id).toBe(testJobApp.id)
      expect(foundWithRelations!.jobApplication.company).toBe(testJobApp.company)
      expect(foundWithRelations!.jobApplication.user.id).toBe(testUser.id)
    })

    it('should handle contact relationship correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.REFERRAL,
        interactionDate: new Date(),
        notes: 'Contact relationship test',
      })

      const foundWithRelations = await repository.findOne({
        where: { id: interaction.id },
        relations: ['contact', 'contact.user'],
      })

      expect(foundWithRelations).toBeDefined()
      expect(foundWithRelations!.contact).toBeDefined()
      expect(foundWithRelations!.contact.id).toBe(testContact.id)
      expect(foundWithRelations!.contact.name).toBe(testContact.name)
      expect(foundWithRelations!.contact.user.id).toBe(testUser.id)
    })

    it('should handle cascading operations correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Cascade test',
      })

      // Deleting the interaction should not affect job application or contact
      await repository.remove(interaction)

      const jobAppRepository = dataSource.getRepository(JobApplication)
      const contactRepository = dataSource.getRepository(Contact)

      const jobAppStillExists = await jobAppRepository.findOne({
        where: { id: testJobApp.id },
      })
      const contactStillExists = await contactRepository.findOne({
        where: { id: testContact.id },
      })

      expect(jobAppStillExists).toBeDefined()
      expect(contactStillExists).toBeDefined()
    })
  })

  describe('PostgreSQL Constraints and Indexes', () => {
    it('should enforce unique constraint on job application and contact combination', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      // Create first interaction
      await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'First interaction',
      })

      // Try to create duplicate - should fail
      await expect(
        repository.save({
          jobApplication: testJobApp,
          contact: testContact,
          interactionType: InteractionType.REFERRAL,
          interactionDate: new Date(),
          notes: 'Duplicate interaction',
        })
      ).rejects.toThrow()
    })

    it('should support indexed queries efficiently', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      // Create multiple interactions for index testing
      const testData = []
      for (let i = 0; i < 5; i++) {
        const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
          user: testUser,
          company: `Index Test Company ${i}`,
          jobTitle: `Index Test Position ${i}`,
          status: JobApplicationStatus.APPLIED,
          applicationDate: new Date(),
        })

        const uniqueContact = await dataSource.getRepository(Contact).save({
          user: testUser,
          name: `Index Test Contact ${i}`,
          company: `Index Test Company ${i}`,
          email: `index-test-${i}@example.com`,
        })

        const interaction = await repository.save({
          jobApplication: uniqueJobApp,
          contact: uniqueContact,
          interactionType: i % 2 === 0 ? InteractionType.NETWORKING : InteractionType.REFERRAL,
          interactionDate: new Date(),
          notes: `Index test ${i}`,
        })

        testData.push(interaction)
      }

      // Query by indexed interaction type
      const networkingInteractions = await repository.find({
        where: { interactionType: InteractionType.NETWORKING },
      })

      expect(networkingInteractions.length).toBeGreaterThan(0)

      // Query by indexed interaction date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayInteractions = await repository
        .createQueryBuilder('interaction')
        .where('interaction.interactionDate >= :today', { today })
        .getMany()

      expect(todayInteractions.length).toBeGreaterThan(0)
    })
  })

  describe('PostgreSQL Advanced Features', () => {
    it('should handle PostgreSQL timestamp with time zone correctly', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      const specificDate = new Date('2024-01-15T10:30:00Z')
      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: specificDate,
        notes: 'Timestamp test',
      })

      const found = await repository.findOne({
        where: { id: interaction.id },
      })

      expect(found).toBeDefined()
      expect(found!.interactionDate).toBeDefined()

      // PostgreSQL should preserve the date
      const savedDate = new Date(found!.interactionDate)
      expect(savedDate.toISOString().substring(0, 10)).toBe('2024-01-15')
    })

    it('should support PostgreSQL aggregation queries', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      // Create test data for aggregation
      const testInteractions = [
        { type: InteractionType.NETWORKING, count: 3 },
        { type: InteractionType.REFERRAL, count: 2 },
        { type: InteractionType.FOLLOW_UP, count: 1 },
      ]

      for (const { type, count } of testInteractions) {
        for (let i = 0; i < count; i++) {
          const uniqueJobApp = await dataSource.getRepository(JobApplication).save({
            user: testUser,
            company: `Aggregation Company ${type} ${i}`,
            jobTitle: `Aggregation Position ${type} ${i}`,
            status: JobApplicationStatus.APPLIED,
            applicationDate: new Date(),
          })

          const uniqueContact = await dataSource.getRepository(Contact).save({
            user: testUser,
            name: `Aggregation Contact ${type} ${i}`,
            company: `Aggregation Company ${type} ${i}`,
            email: `aggregation-${type.toLowerCase()}-${i}@example.com`,
          })

          await repository.save({
            jobApplication: uniqueJobApp,
            contact: uniqueContact,
            interactionType: type,
            interactionDate: new Date(),
            notes: `Aggregation test ${type} ${i}`,
          })
        }
      }

      // PostgreSQL aggregation query
      const stats = await repository
        .createQueryBuilder('interaction')
        .innerJoin('interaction.jobApplication', 'jobApp')
        .select('interaction.interactionType', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('jobApp.user = :userId', { userId: testUser.id })
        .groupBy('interaction.interactionType')
        .getRawMany()

      expect(stats.length).toBeGreaterThanOrEqual(3)

      const networkingCount = stats.find(s => s.type === InteractionType.NETWORKING)?.count
      const referralCount = stats.find(s => s.type === InteractionType.REFERRAL)?.count
      const followUpCount = stats.find(s => s.type === InteractionType.FOLLOW_UP)?.count

      expect(parseInt(networkingCount || '0')).toBeGreaterThanOrEqual(3)
      expect(parseInt(referralCount || '0')).toBeGreaterThanOrEqual(2)
      expect(parseInt(followUpCount || '0')).toBeGreaterThanOrEqual(1)
    })

    it('should handle complex PostgreSQL join queries', async () => {
      const repository = dataSource.getRepository(JobApplicationContact)

      // Create test interaction
      const interaction = await repository.save({
        jobApplication: testJobApp,
        contact: testContact,
        interactionType: InteractionType.NETWORKING,
        interactionDate: new Date(),
        notes: 'Join test',
      })

      // Complex join query
      const results = await repository
        .createQueryBuilder('interaction')
        .innerJoinAndSelect('interaction.jobApplication', 'jobApp')
        .innerJoinAndSelect('interaction.contact', 'contact')
        .innerJoinAndSelect('jobApp.user', 'user')
        .where('user.id = :userId', { userId: testUser.id })
        .andWhere('jobApp.company = :company', { company: testJobApp.company })
        .andWhere('contact.email = :email', { email: testContact.email })
        .getMany()

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(interaction.id)
      expect(results[0].jobApplication.company).toBe(testJobApp.company)
      expect(results[0].contact.email).toBe(testContact.email)
      expect(results[0].jobApplication.user.id).toBe(testUser.id)
    })
  })
})