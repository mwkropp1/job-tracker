/**
 * Unit tests for Contact entity using Testcontainers PostgreSQL
 * Tests entity behavior, validation, relationships, and database operations
 */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from '@jest/globals'
import { DataSource } from 'typeorm'

import { Contact, ContactRole, CommunicationChannel } from '../../entities/Contact'
import { JobApplication } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
} from '../../test/testDatabase.testcontainers'

describe('Contact Entity - Testcontainers PostgreSQL', () => {
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

  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a contact with required properties', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'test@example.com',
        password: 'password',
      })

      const contact = new Contact()
      contact.name = 'Jane Smith'
      contact.email = 'jane.smith@company.com'
      contact.company = 'TechCorp Inc'
      contact.user = user

      expect(contact.name).toBe('Jane Smith')
      expect(contact.email).toBe('jane.smith@company.com')
      expect(contact.company).toBe('TechCorp Inc')
      expect(contact.user).toBe(user)
    })

    it('should handle optional properties', () => {
      const contact = new Contact()
      contact.name = 'John Doe'
      contact.email = 'john@example.com'
      contact.role = ContactRole.RECRUITER
      contact.phoneNumber = '555-0123'
      contact.linkedInProfile = 'https://linkedin.com/in/johndoe'

      expect(contact.role).toBe(ContactRole.RECRUITER)
      expect(contact.phoneNumber).toBe('555-0123')
      expect(contact.linkedInProfile).toBe('https://linkedin.com/in/johndoe')
    })

    it('should have default role as OTHER', async () => {
      const userRepo = dataSource.getRepository(User)
      const user = await userRepo.save({
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      })

      const contactRepo = dataSource.getRepository(Contact)
      const contact = await contactRepo.save({
        name: 'John Doe',
        user: user,
      })

      expect(contact.role).toBe(ContactRole.OTHER)
    })

    it('should allow null values for optional fields', () => {
      const contact = new Contact()
      contact.name = 'John Doe'

      // Optional fields should be undefined by default
      expect(contact.company).toBeUndefined()
      expect(contact.email).toBeUndefined()
      expect(contact.phoneNumber).toBeUndefined()
      expect(contact.linkedInProfile).toBeUndefined()
    })
  })

  // Database operations
  describe('Database Operations', () => {
    it('should save contact with all properties', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'contact-owner@example.com',
        password: 'password',
      })

      const contactData = {
        name: 'Alice Johnson',
        email: 'alice.johnson@techcorp.com',
        phoneNumber: '+1-555-0199',
        company: 'TechCorp Inc',
        linkedInProfile: 'https://linkedin.com/in/alicejohnson',
        user: user,
      }

      const savedContact = await contactRepo.save(contactData)

      expect(savedContact.id).toBeDefined()
      expect(savedContact.name).toBe(contactData.name)
      expect(savedContact.email).toBe(contactData.email)
      expect(savedContact.phoneNumber).toBe(contactData.phoneNumber)
      expect(savedContact.company).toBe(contactData.company)
      expect(savedContact.linkedInProfile).toBe(contactData.linkedInProfile)
      expect(savedContact.createdAt).toBeDefined()
      expect(savedContact.updatedAt).toBeDefined()
    })

    it('should allow duplicate emails per user (no unique constraint)', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'unique-test@example.com',
        password: 'password',
      })

      const email = 'duplicate@company.com'

      // Create first contact
      const contact1 = await contactRepo.save({
        name: 'Contact One',
        email: email,
        user: user,
      })

      // Create second contact with same email for same user (should succeed)
      const contact2 = await contactRepo.save({
        name: 'Contact Two',
        email: email,
        user: user,
      })

      expect(contact1.email).toBe(email)
      expect(contact2.email).toBe(email)
      expect(contact1.id).not.toBe(contact2.id)
    })

    it('should allow same email for different users', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user1 = await userRepo.save({
        email: 'user1@example.com',
        password: 'password',
      })

      const user2 = await userRepo.save({
        email: 'user2@example.com',
        password: 'password',
      })

      const email = 'shared-contact@company.com'

      // Create contacts with same email for different users
      const contact1 = await contactRepo.save({
        name: 'Contact User1',
        email: email,
        user: user1,
      })

      const contact2 = await contactRepo.save({
        name: 'Contact User2',
        email: email,
        user: user2,
      })

      expect(contact1.email).toBe(contact2.email)
      expect(contact1.user.id).not.toBe(contact2.user.id)
    })

    it('should update contact properties correctly', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'update-test@example.com',
        password: 'password',
      })

      const contact = await contactRepo.save({
        name: 'Original Name',
        email: 'original@company.com',
        user: user,
      })

      // Update contact
      contact.name = 'Updated Name'
      const updatedContact = await contactRepo.save(contact)

      expect(updatedContact.name).toBe('Updated Name')
      expect(updatedContact.updatedAt.getTime()).toBeGreaterThan(updatedContact.createdAt.getTime())
    })

    it('should handle nullable optional fields in database', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'nullable-test@example.com',
        password: 'password',
      })

      // Save contact with minimal required fields
      const contact = await contactRepo.save({
        name: 'Minimal Contact',
        email: 'minimal@company.com',
        user: user,
      })

      expect(contact.phoneNumber).toBeNull()
      expect(contact.company).toBeNull()
      expect(contact.linkedInProfile).toBeNull()
    })
  })

  // Relationship testing
  describe('Contact Relationships', () => {
    it('should maintain proper user relationship', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'relationship@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      })

      const contact = await contactRepo.save({
        name: 'Business Contact',
        email: 'business@company.com',
        company: 'Business Corp',
        user: user,
      })

      // Load contact with user relationship
      const contactWithUser = await contactRepo.findOne({
        where: { id: contact.id },
        relations: ['user'],
      })

      expect(contactWithUser?.user.id).toBe(user.id)
      expect(contactWithUser?.user.firstName).toBe('Test')
      expect(contactWithUser?.user.lastName).toBe('User')
    })

    it('should handle user with multiple contacts', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'multi-contacts@example.com',
        password: 'password',
      })

      // Create multiple contacts for the user
      await contactRepo.save([
        { name: 'Contact A', email: 'contacta@company.com', user: user },
        { name: 'Contact B', email: 'contactb@company.com', user: user },
        { name: 'Contact C', email: 'contactc@company.com', user: user },
      ])

      // Load user with contacts
      const userWithContacts = await userRepo.findOne({
        where: { id: user.id },
        relations: ['contacts'],
      })

      expect(userWithContacts?.contacts).toHaveLength(3)
      expect(userWithContacts?.contacts.map(c => c.name).sort()).toEqual([
        'Contact A',
        'Contact B',
        'Contact C',
      ])
    })
  })

  // PostgreSQL specific features
  describe('PostgreSQL Features', () => {
    it('should support PostgreSQL text search capabilities', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'search-test@example.com',
        password: 'password',
      })

      // Create contacts with searchable content
      await contactRepo.save([
        {
          name: 'John Smith',
          email: 'john@techcorp.com',
          company: 'TechCorp Inc',
          user: user,
        },
        {
          name: 'Sarah Johnson',
          email: 'sarah@designco.com',
          company: 'DesignCo',
          user: user,
        },
        {
          name: 'Mike Chen',
          email: 'mike@datatech.com',
          company: 'DataTech Solutions',
          user: user,
        },
      ])

      // Search by company name (case insensitive)
      const techContacts = await contactRepo
        .createQueryBuilder('contact')
        .where('contact.company ILIKE :company', { company: '%tech%' })
        .getMany()

      expect(techContacts).toHaveLength(2) // TechCorp Inc and DataTech Solutions

      // Search by name (existing field)
      const johnContacts = await contactRepo
        .createQueryBuilder('contact')
        .where('contact.name ILIKE :name', { name: '%john smith%' })
        .getMany()

      expect(johnContacts).toHaveLength(1)
      expect(johnContacts[0].name).toBe('John Smith')
    })

    it('should handle complex aggregation queries', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'aggregation@example.com',
        password: 'password',
      })

      // Create contacts from different companies
      await contactRepo.save([
        { name: 'Alice Tech', email: 'alice@tech.com', company: 'Tech Corp', user: user },
        { name: 'Bob Tech', email: 'bob@tech.com', company: 'Tech Corp', user: user },
        { name: 'Carol Design', email: 'carol@design.com', company: 'Design Inc', user: user },
        {
          name: 'David Startup',
          email: 'david@startup.com',
          company: 'Startup LLC',
          user: user,
        },
        { name: 'Eve Startup', email: 'eve@startup.com', company: 'Startup LLC', user: user },
        {
          name: 'Frank Startup',
          email: 'frank@startup.com',
          company: 'Startup LLC',
          user: user,
        },
      ])

      // Aggregate contacts by company
      const companyStats = await contactRepo
        .createQueryBuilder('contact')
        .select('contact.company', 'company')
        .addSelect('COUNT(*)', 'contactCount')
        .where('contact.user_id = :userId', { userId: user.id })
        .groupBy('contact.company')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany()

      expect(companyStats).toHaveLength(3)
      expect(companyStats[0]).toEqual({ company: 'Startup LLC', contactCount: '3' })
      expect(companyStats[1]).toEqual({ company: 'Tech Corp', contactCount: '2' })
      expect(companyStats[2]).toEqual({ company: 'Design Inc', contactCount: '1' })
    })

    it('should handle PostgreSQL timestamp operations', async () => {
      const userRepo = dataSource.getRepository(User)
      const contactRepo = dataSource.getRepository(Contact)

      const user = await userRepo.save({
        email: 'timestamp@example.com',
        password: 'password',
      })

      const beforeSave = new Date()

      const contact = await contactRepo.save({
        name: 'Timestamp Test',
        email: 'timestamp@company.com',
        user: user,
      })

      const afterSave = new Date()

      // Allow for small timing differences (up to 1 second)
      const timeDiff = 1000
      expect(contact.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime() - timeDiff)
      expect(contact.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime() + timeDiff)
      expect(contact.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime() - timeDiff)
      expect(contact.updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime() + timeDiff)
    })
  })
})
