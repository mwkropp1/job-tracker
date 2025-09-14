/**
 * Unit tests for Contact entity
 * Tests entity behavior, validation, relationships, and database operations
 */

import { Contact } from '../../entities/Contact'
import { JobApplication } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import { testDatabase, dbHelpers } from '../../test/testDatabase'
import { TestDataFactory } from '../../test/testUtils'

describe('Contact Entity', () => {
  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a contact with required properties', () => {
      const user = TestDataFactory.createMockUser()
      const contact = new Contact()

      contact.firstName = 'Jane'
      contact.lastName = 'Smith'
      contact.email = 'jane.smith@company.com'
      contact.company = 'TechCorp Inc'
      contact.user = user
      contact.userId = user.id

      expect(contact.firstName).toBe('Jane')
      expect(contact.lastName).toBe('Smith')
      expect(contact.email).toBe('jane.smith@company.com')
      expect(contact.company).toBe('TechCorp Inc')
      expect(contact.user).toBe(user)
      expect(contact.userId).toBe(user.id)
    })

    it('should handle optional properties', () => {
      const contact = TestDataFactory.createMockContact()

      expect(contact.jobTitle).toBeDefined()
      expect(contact.phoneNumber).toBeDefined()
      expect(contact.linkedInProfile).toBeDefined()
      expect(contact.notes).toBeDefined()
    })

    it('should allow null values for optional fields', () => {
      const contact = new Contact()
      contact.firstName = 'John'
      contact.lastName = 'Doe'
      contact.email = 'john@example.com'
      contact.company = 'Test Co'

      // Optional fields should be allowed to be undefined/null
      expect(contact.jobTitle).toBeUndefined()
      expect(contact.phoneNumber).toBeUndefined()
      expect(contact.linkedInProfile).toBeUndefined()
      expect(contact.notes).toBeUndefined()
    })
  })

  // Database operations
  describe('Database Operations', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should save contact with all required fields', async () => {
      const contactData = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@techcorp.com',
        company: 'TechCorp'
      }

      const savedContact = await dbHelpers.createTestContact(testUser, contactData)

      expect(savedContact.id).toBeDefined()
      expect(savedContact.firstName).toBe(contactData.firstName)
      expect(savedContact.lastName).toBe(contactData.lastName)
      expect(savedContact.email).toBe(contactData.email)
      expect(savedContact.company).toBe(contactData.company)
      expect(savedContact.userId).toBe(testUser.id)
      expect(savedContact.createdAt).toBeDefined()
      expect(savedContact.updatedAt).toBeDefined()
    })

    it('should save contact with all optional fields', async () => {
      const contactData = {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob.wilson@startup.com',
        company: 'Cool Startup Inc',
        jobTitle: 'VP of Engineering',
        phoneNumber: '+1-555-987-6543',
        linkedInProfile: 'https://linkedin.com/in/bobwilson',
        notes: 'Met at tech conference 2024. Interested in our ML platform.'
      }

      const savedContact = await dbHelpers.createTestContact(testUser, contactData)

      expect(savedContact.jobTitle).toBe(contactData.jobTitle)
      expect(savedContact.phoneNumber).toBe(contactData.phoneNumber)
      expect(savedContact.linkedInProfile).toBe(contactData.linkedInProfile)
      expect(savedContact.notes).toBe(contactData.notes)
    })

    it('should update contact information', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        firstName: 'Original',
        company: 'Old Company'
      })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const originalUpdatedAt = contact.updatedAt

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Update contact
      contact.firstName = 'Updated'
      contact.company = 'New Company'
      contact.jobTitle = 'Senior Manager'
      const updatedContact = await contactRepo.save(contact)

      expect(updatedContact.firstName).toBe('Updated')
      expect(updatedContact.company).toBe('New Company')
      expect(updatedContact.jobTitle).toBe('Senior Manager')
      expect(updatedContact.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should delete contact', async () => {
      const contact = await dbHelpers.createTestContact(testUser)

      await dbHelpers.assertRecordCount(Contact, 1)

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      await contactRepo.remove(contact)

      await dbHelpers.assertRecordCount(Contact, 0)
    })

    it('should enforce user relationship constraint', async () => {
      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const contact = contactRepo.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Test Company',
        // No user relationship - should fail
      })

      await expect(contactRepo.save(contact)).rejects.toThrow()
    })
  })

  // Relationships testing
  describe('Entity Relationships', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should maintain relationship with user', async () => {
      const contact = await dbHelpers.createTestContact(testUser)

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const contactWithUser = await contactRepo.findOne({
        where: { id: contact.id },
        relations: ['user']
      })

      expect(contactWithUser?.user).toBeDefined()
      expect(contactWithUser?.user.id).toBe(testUser.id)
      expect(contactWithUser?.user.email).toBe(testUser.email)
    })

    it('should associate with job applications (many-to-many)', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        company: 'TechCorp'
      })

      const jobApp1 = await dbHelpers.createTestJobApplication(testUser, {
        company: 'TechCorp',
        jobTitle: 'Engineer I'
      })

      const jobApp2 = await dbHelpers.createTestJobApplication(testUser, {
        company: 'TechCorp',
        jobTitle: 'Engineer II'
      })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      // Associate contact with job applications
      contact.jobApplications = [jobApp1, jobApp2]
      await contactRepo.save(contact)

      const contactWithJobApps = await contactRepo.findOne({
        where: { id: contact.id },
        relations: ['jobApplications']
      })

      expect(contactWithJobApps?.jobApplications).toHaveLength(2)
      expect(contactWithJobApps?.jobApplications.map(ja => ja.jobTitle))
        .toEqual(expect.arrayContaining(['Engineer I', 'Engineer II']))
    })

    it('should handle contact with no job applications', async () => {
      const contact = await dbHelpers.createTestContact(testUser)

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const contactWithJobApps = await contactRepo.findOne({
        where: { id: contact.id },
        relations: ['jobApplications']
      })

      expect(contactWithJobApps?.jobApplications).toEqual([])
    })

    it('should allow multiple contacts from same company', async () => {
      const contact1 = await dbHelpers.createTestContact(testUser, {
        firstName: 'Alice',
        company: 'BigTech Corp'
      })

      const contact2 = await dbHelpers.createTestContact(testUser, {
        firstName: 'Bob',
        company: 'BigTech Corp'
      })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const contacts = await contactRepo.find({
        where: { company: 'BigTech Corp' }
      })

      expect(contacts).toHaveLength(2)
      expect(contacts.map(c => c.firstName)).toEqual(expect.arrayContaining(['Alice', 'Bob']))
    })
  })

  // Search and querying
  describe('Search and Querying', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should find contacts by company', async () => {
      await dbHelpers.createTestContact(testUser, { company: 'Google' })
      await dbHelpers.createTestContact(testUser, { company: 'Microsoft' })
      await dbHelpers.createTestContact(testUser, { company: 'Google' })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const googleContacts = await contactRepo.find({ where: { company: 'Google' } })
      expect(googleContacts).toHaveLength(2)

      const microsoftContacts = await contactRepo.find({ where: { company: 'Microsoft' } })
      expect(microsoftContacts).toHaveLength(1)
    })

    it('should find contacts by name', async () => {
      await dbHelpers.createTestContact(testUser, { firstName: 'John', lastName: 'Smith' })
      await dbHelpers.createTestContact(testUser, { firstName: 'Jane', lastName: 'Doe' })
      await dbHelpers.createTestContact(testUser, { firstName: 'John', lastName: 'Wilson' })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const johnContacts = await contactRepo.find({ where: { firstName: 'John' } })
      expect(johnContacts).toHaveLength(2)

      const smithContacts = await contactRepo.find({ where: { lastName: 'Smith' } })
      expect(smithContacts).toHaveLength(1)
    })

    it('should find contacts by email', async () => {
      const email = 'unique@company.com'
      await dbHelpers.createTestContact(testUser, { email })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const contact = await contactRepo.findOne({ where: { email } })
      expect(contact).toBeDefined()
      expect(contact?.email).toBe(email)
    })

    it('should filter contacts by user', async () => {
      const anotherUser = await dbHelpers.createTestUser({ email: 'another@test.com' })

      await dbHelpers.createTestContact(testUser, { firstName: 'User1Contact' })
      await dbHelpers.createTestContact(anotherUser, { firstName: 'User2Contact' })

      const dataSource = testDatabase.getDataSource()!
      const contactRepo = dataSource.getRepository(Contact)

      const user1Contacts = await contactRepo.find({ where: { userId: testUser.id } })
      expect(user1Contacts).toHaveLength(1)
      expect(user1Contacts[0].firstName).toBe('User1Contact')

      const user2Contacts = await contactRepo.find({ where: { userId: anotherUser.id } })
      expect(user2Contacts).toHaveLength(1)
      expect(user2Contacts[0].firstName).toBe('User2Contact')
    })
  })

  // Validation and edge cases
  describe('Validation and Edge Cases', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should handle special characters in names', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        firstName: "Jean-François",
        lastName: "O'Connor-Smith"
      })

      expect(contact.firstName).toBe("Jean-François")
      expect(contact.lastName).toBe("O'Connor-Smith")
    })

    it('should handle international phone numbers', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        phoneNumber: '+33 1 42 68 53 00' // French number
      })

      expect(contact.phoneNumber).toBe('+33 1 42 68 53 00')
    })

    it('should handle long LinkedIn URLs', async () => {
      const longLinkedInUrl = 'https://www.linkedin.com/in/very-long-profile-name-with-many-details-and-identifiers-12345'

      const contact = await dbHelpers.createTestContact(testUser, {
        linkedInProfile: longLinkedInUrl
      })

      expect(contact.linkedInProfile).toBe(longLinkedInUrl)
    })

    it('should handle very long notes', async () => {
      const longNotes = 'This is a very long note about the contact. '.repeat(100)

      const contact = await dbHelpers.createTestContact(testUser, {
        notes: longNotes
      })

      expect(contact.notes).toBe(longNotes)
      expect(contact.notes?.length).toBeGreaterThan(4000)
    })

    it('should handle empty strings for optional fields', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        jobTitle: '',
        phoneNumber: '',
        linkedInProfile: '',
        notes: ''
      })

      expect(contact.jobTitle).toBe('')
      expect(contact.phoneNumber).toBe('')
      expect(contact.linkedInProfile).toBe('')
      expect(contact.notes).toBe('')
    })

    it('should handle company names with special characters', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        company: 'Müller & Associates, LLC (São Paulo)'
      })

      expect(contact.company).toBe('Müller & Associates, LLC (São Paulo)')
    })

    it('should handle very long email addresses', async () => {
      const longEmail = 'very-long-email-address-with-many-characters@very-long-company-domain-name.com'

      const contact = await dbHelpers.createTestContact(testUser, {
        email: longEmail
      })

      expect(contact.email).toBe(longEmail)
    })

    it('should preserve email case', async () => {
      const mixedCaseEmail = 'John.Smith@Company.COM'

      const contact = await dbHelpers.createTestContact(testUser, {
        email: mixedCaseEmail
      })

      expect(contact.email).toBe(mixedCaseEmail)
    })

    it('should handle job titles with special formatting', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        jobTitle: 'VP, Engineering & Technology (Cloud/AI)'
      })

      expect(contact.jobTitle).toBe('VP, Engineering & Technology (Cloud/AI)')
    })

    it('should handle contacts with minimal required information', async () => {
      const contact = await dbHelpers.createTestContact(testUser, {
        firstName: 'Min',
        lastName: 'Viable',
        email: 'min@viable.com',
        company: 'MVP',
        jobTitle: undefined,
        phoneNumber: undefined,
        linkedInProfile: undefined,
        notes: undefined
      })

      expect(contact.firstName).toBe('Min')
      expect(contact.lastName).toBe('Viable')
      expect(contact.email).toBe('min@viable.com')
      expect(contact.company).toBe('MVP')
      expect(contact.jobTitle).toBeUndefined()
      expect(contact.phoneNumber).toBeUndefined()
      expect(contact.linkedInProfile).toBeUndefined()
      expect(contact.notes).toBeUndefined()
    })
  })
})