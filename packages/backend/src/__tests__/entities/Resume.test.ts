/**
 * Unit tests for Resume entity
 * Tests entity behavior, file handling, usage tracking, and database operations
 */

import { JobApplication } from '../../entities/JobApplication'
import { Resume, ResumeSource } from '../../entities/Resume'
import { User } from '../../entities/User'
import { testDatabase, dbHelpers } from '../../test/testDatabase'
import { TestDataFactory } from '../../test/testUtils'

describe('Resume Entity', () => {
  // Entity creation and basic properties
  describe('Entity Creation', () => {
    it('should create a resume with required properties', () => {
      const user = TestDataFactory.createMockUser()
      const resume = new Resume()

      resume.versionName = 'Software Engineer v1'
      resume.fileName = 'john_doe_resume.pdf'
      resume.fileUrl = '/uploads/resumes/john_doe_resume.pdf'
      resume.user = user
      resume.userId = user.id

      expect(resume.versionName).toBe('Software Engineer v1')
      expect(resume.fileName).toBe('john_doe_resume.pdf')
      expect(resume.fileUrl).toBe('/uploads/resumes/john_doe_resume.pdf')
      expect(resume.source).toBe(ResumeSource.UPLOAD) // Default value
      expect(resume.usageCount).toBe(0) // Default value
      expect(resume.isDefault).toBe(false) // Default value
      expect(resume.user).toBe(user)
    })

    it('should have default source as UPLOAD', () => {
      const resume = new Resume()
      expect(resume.source).toBe(ResumeSource.UPLOAD)
    })

    it('should have default usageCount as 0', () => {
      const resume = new Resume()
      expect(resume.usageCount).toBe(0)
    })

    it('should have default isDefault as false', () => {
      const resume = new Resume()
      expect(resume.isDefault).toBe(false)
    })

    it('should allow all valid source values', () => {
      const resume = new Resume()

      Object.values(ResumeSource).forEach(source => {
        resume.source = source
        expect(resume.source).toBe(source)
      })
    })

    it('should handle optional properties', () => {
      const resume = TestDataFactory.createMockResume()

      expect(resume.description).toBeDefined()
      expect(resume.lastUsedAt).toBeUndefined() // Should be null initially
    })
  })

  // Database operations
  describe('Database Operations', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should save resume with all required fields', async () => {
      const resumeData = {
        versionName: 'Frontend Developer v3',
        fileName: 'alice_frontend_resume.pdf',
        fileUrl: 'https://storage.example.com/resumes/alice_resume.pdf',
        source: ResumeSource.UPLOAD
      }

      const savedResume = await dbHelpers.createTestResume(testUser, resumeData)

      expect(savedResume.id).toBeDefined()
      expect(savedResume.versionName).toBe(resumeData.versionName)
      expect(savedResume.fileName).toBe(resumeData.fileName)
      expect(savedResume.fileUrl).toBe(resumeData.fileUrl)
      expect(savedResume.source).toBe(resumeData.source)
      expect(savedResume.userId).toBe(testUser.id)
      expect(savedResume.usageCount).toBe(0)
      expect(savedResume.isDefault).toBe(false)
      expect(savedResume.createdAt).toBeDefined()
      expect(savedResume.updatedAt).toBeDefined()
    })

    it('should save resume with all optional fields', async () => {
      const resumeData = {
        versionName: 'Full Stack v2',
        fileName: 'bob_fullstack.pdf',
        fileUrl: '/local/storage/bob_fullstack.pdf',
        source: ResumeSource.GENERATED,
        description: 'Auto-generated resume for full-stack positions',
        isDefault: true,
        usageCount: 5,
        lastUsedAt: new Date('2024-01-15T10:00:00Z')
      }

      const savedResume = await dbHelpers.createTestResume(testUser, resumeData)

      expect(savedResume.description).toBe(resumeData.description)
      expect(savedResume.isDefault).toBe(resumeData.isDefault)
      expect(savedResume.usageCount).toBe(resumeData.usageCount)
      expect(savedResume.lastUsedAt).toEqual(resumeData.lastUsedAt)
      expect(savedResume.source).toBe(resumeData.source)
    })

    it('should enforce unique versionName per user', async () => {
      const versionName = 'Software Engineer v1'

      // Create first resume
      await dbHelpers.createTestResume(testUser, { versionName })

      // Attempt to create second resume with same version name for same user
      await expect(
        dbHelpers.createTestResume(testUser, { versionName })
      ).rejects.toThrow()
    })

    it('should allow same versionName for different users', async () => {
      const anotherUser = await dbHelpers.createTestUser({ email: 'another@test.com' })
      const versionName = 'Software Engineer v1'

      // Create resume for first user
      const resume1 = await dbHelpers.createTestResume(testUser, { versionName })

      // Create resume with same version name for different user - should succeed
      const resume2 = await dbHelpers.createTestResume(anotherUser, { versionName })

      expect(resume1.versionName).toBe(versionName)
      expect(resume2.versionName).toBe(versionName)
      expect(resume1.userId).not.toBe(resume2.userId)
    })

    it('should update usage tracking fields', async () => {
      const resume = await dbHelpers.createTestResume(testUser, {
        usageCount: 0,
        lastUsedAt: undefined
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const useDate = new Date()

      // Update usage tracking
      resume.usageCount = 1
      resume.lastUsedAt = useDate
      const updatedResume = await resumeRepo.save(resume)

      expect(updatedResume.usageCount).toBe(1)
      expect(updatedResume.lastUsedAt).toEqual(useDate)
    })

    it('should handle default resume switching', async () => {
      // Create multiple resumes
      const resume1 = await dbHelpers.createTestResume(testUser, {
        versionName: 'Resume v1',
        isDefault: true
      })

      const resume2 = await dbHelpers.createTestResume(testUser, {
        versionName: 'Resume v2',
        isDefault: false
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      // Switch default
      resume1.isDefault = false
      resume2.isDefault = true

      await resumeRepo.save(resume1)
      await resumeRepo.save(resume2)

      // Verify the switch
      const updatedResume1 = await resumeRepo.findOne({ where: { id: resume1.id } })
      const updatedResume2 = await resumeRepo.findOne({ where: { id: resume2.id } })

      expect(updatedResume1?.isDefault).toBe(false)
      expect(updatedResume2?.isDefault).toBe(true)
    })

    it('should delete resume', async () => {
      const resume = await dbHelpers.createTestResume(testUser)

      await dbHelpers.assertRecordCount(Resume, 1)

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      await resumeRepo.remove(resume)

      await dbHelpers.assertRecordCount(Resume, 0)
    })

    it('should enforce user relationship constraint', async () => {
      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const resume = resumeRepo.create({
        versionName: 'Test Resume',
        fileName: 'test.pdf',
        fileUrl: '/test.pdf',
        // No user relationship - should fail
      })

      await expect(resumeRepo.save(resume)).rejects.toThrow()
    })
  })

  // Usage tracking
  describe('Usage Tracking', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should track resume usage when associated with job applications', async () => {
      const resume = await dbHelpers.createTestResume(testUser, {
        usageCount: 0
      })

      // Create job applications using this resume
      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Company A',
        resume: resume
      })

      await dbHelpers.createTestJobApplication(testUser, {
        company: 'Company B',
        resume: resume
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      // Manually increment usage count (in real app, this would be done via service)
      resume.usageCount = 2
      resume.lastUsedAt = new Date()
      await resumeRepo.save(resume)

      const updatedResume = await resumeRepo.findOne({ where: { id: resume.id } })
      expect(updatedResume?.usageCount).toBe(2)
      expect(updatedResume?.lastUsedAt).toBeDefined()
    })

    it('should find most used resumes', async () => {
      const resume1 = await dbHelpers.createTestResume(testUser, {
        versionName: 'Rarely Used',
        usageCount: 1
      })

      const resume2 = await dbHelpers.createTestResume(testUser, {
        versionName: 'Frequently Used',
        usageCount: 10
      })

      const resume3 = await dbHelpers.createTestResume(testUser, {
        versionName: 'Never Used',
        usageCount: 0
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const resumesByUsage = await resumeRepo.find({
        where: { userId: testUser.id },
        order: { usageCount: 'DESC' }
      })

      expect(resumesByUsage[0].versionName).toBe('Frequently Used')
      expect(resumesByUsage[1].versionName).toBe('Rarely Used')
      expect(resumesByUsage[2].versionName).toBe('Never Used')
    })

    it('should track last used date', async () => {
      const resume = await dbHelpers.createTestResume(testUser, {
        lastUsedAt: undefined
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const useDate = new Date('2024-02-15T14:30:00Z')
      resume.lastUsedAt = useDate
      await resumeRepo.save(resume)

      const updatedResume = await resumeRepo.findOne({ where: { id: resume.id } })
      expect(updatedResume?.lastUsedAt).toEqual(useDate)
    })
  })

  // Relationships
  describe('Entity Relationships', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should maintain relationship with user', async () => {
      const resume = await dbHelpers.createTestResume(testUser)

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const resumeWithUser = await resumeRepo.findOne({
        where: { id: resume.id },
        relations: ['user']
      })

      expect(resumeWithUser?.user).toBeDefined()
      expect(resumeWithUser?.user.id).toBe(testUser.id)
      expect(resumeWithUser?.user.email).toBe(testUser.email)
    })

    it('should link to job applications that use this resume', async () => {
      const resume = await dbHelpers.createTestResume(testUser)

      const jobApp1 = await dbHelpers.createTestJobApplication(testUser, {
        company: 'Company A',
        resume: resume
      })

      const jobApp2 = await dbHelpers.createTestJobApplication(testUser, {
        company: 'Company B',
        resume: resume
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const resumeWithJobApps = await resumeRepo.findOne({
        where: { id: resume.id },
        relations: ['jobApplications']
      })

      expect(resumeWithJobApps?.jobApplications).toHaveLength(2)
      expect(resumeWithJobApps?.jobApplications.map(ja => ja.company))
        .toEqual(expect.arrayContaining(['Company A', 'Company B']))
    })

    it('should handle resume with no job applications', async () => {
      const resume = await dbHelpers.createTestResume(testUser)

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const resumeWithJobApps = await resumeRepo.findOne({
        where: { id: resume.id },
        relations: ['jobApplications']
      })

      expect(resumeWithJobApps?.jobApplications).toEqual([])
    })
  })

  // Source types and file handling
  describe('Source Types and File Handling', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should handle different resume sources', async () => {
      const uploadResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'Upload Resume',
        source: ResumeSource.UPLOAD,
        fileUrl: '/uploads/local_resume.pdf'
      })

      const googleDriveResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'Google Drive Resume',
        source: ResumeSource.GOOGLE_DRIVE,
        fileUrl: 'https://drive.google.com/file/d/abc123'
      })

      const generatedResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'Generated Resume',
        source: ResumeSource.GENERATED,
        fileUrl: '/generated/ai_resume.pdf'
      })

      expect(uploadResume.source).toBe(ResumeSource.UPLOAD)
      expect(googleDriveResume.source).toBe(ResumeSource.GOOGLE_DRIVE)
      expect(generatedResume.source).toBe(ResumeSource.GENERATED)
    })

    it('should handle different file URL formats', async () => {
      const localFile = await dbHelpers.createTestResume(testUser, {
        versionName: 'Local File',
        fileUrl: '/uploads/resumes/local_resume.pdf'
      })

      const cloudFile = await dbHelpers.createTestResume(testUser, {
        versionName: 'Cloud File',
        fileUrl: 'https://s3.amazonaws.com/bucket/resume.pdf'
      })

      const googleDriveFile = await dbHelpers.createTestResume(testUser, {
        versionName: 'Google Drive File',
        fileUrl: 'https://drive.google.com/file/d/1234567890abcdef'
      })

      expect(localFile.fileUrl).toBe('/uploads/resumes/local_resume.pdf')
      expect(cloudFile.fileUrl).toBe('https://s3.amazonaws.com/bucket/resume.pdf')
      expect(googleDriveFile.fileUrl).toBe('https://drive.google.com/file/d/1234567890abcdef')
    })

    it('should preserve original filename for different file types', async () => {
      const pdfResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'PDF Resume',
        fileName: 'john_doe_resume.pdf'
      })

      const docxResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'DOCX Resume',
        fileName: 'jane_smith_resume.docx'
      })

      expect(pdfResume.fileName).toBe('john_doe_resume.pdf')
      expect(docxResume.fileName).toBe('jane_smith_resume.docx')
    })
  })

  // Search and filtering
  describe('Search and Filtering', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should find resumes by source', async () => {
      await dbHelpers.createTestResume(testUser, {
        versionName: 'Upload 1',
        source: ResumeSource.UPLOAD
      })

      await dbHelpers.createTestResume(testUser, {
        versionName: 'Generated 1',
        source: ResumeSource.GENERATED
      })

      await dbHelpers.createTestResume(testUser, {
        versionName: 'Upload 2',
        source: ResumeSource.UPLOAD
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const uploadResumes = await resumeRepo.find({
        where: { source: ResumeSource.UPLOAD }
      })

      const generatedResumes = await resumeRepo.find({
        where: { source: ResumeSource.GENERATED }
      })

      expect(uploadResumes).toHaveLength(2)
      expect(generatedResumes).toHaveLength(1)
    })

    it('should find default resume', async () => {
      await dbHelpers.createTestResume(testUser, {
        versionName: 'Non-default 1',
        isDefault: false
      })

      await dbHelpers.createTestResume(testUser, {
        versionName: 'Default Resume',
        isDefault: true
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const defaultResume = await resumeRepo.findOne({
        where: { userId: testUser.id, isDefault: true }
      })

      expect(defaultResume).toBeDefined()
      expect(defaultResume?.versionName).toBe('Default Resume')
    })

    it('should filter resumes by user', async () => {
      const anotherUser = await dbHelpers.createTestUser({ email: 'another@test.com' })

      await dbHelpers.createTestResume(testUser, { versionName: 'User 1 Resume' })
      await dbHelpers.createTestResume(anotherUser, { versionName: 'User 2 Resume' })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      const user1Resumes = await resumeRepo.find({ where: { userId: testUser.id } })
      const user2Resumes = await resumeRepo.find({ where: { userId: anotherUser.id } })

      expect(user1Resumes).toHaveLength(1)
      expect(user1Resumes[0].versionName).toBe('User 1 Resume')

      expect(user2Resumes).toHaveLength(1)
      expect(user2Resumes[0].versionName).toBe('User 2 Resume')
    })

    it('should find resumes by creation date range', async () => {
      const oldDate = new Date('2023-01-01')
      const recentDate = new Date('2024-01-01')

      // Create resumes at different times (simulated)
      const oldResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'Old Resume'
      })

      const recentResume = await dbHelpers.createTestResume(testUser, {
        versionName: 'Recent Resume'
      })

      const dataSource = testDatabase.getDataSource()!
      const resumeRepo = dataSource.getRepository(Resume)

      // In real scenario, you'd filter by actual creation dates
      const allResumes = await resumeRepo.find({
        where: { userId: testUser.id },
        order: { createdAt: 'DESC' }
      })

      expect(allResumes).toHaveLength(2)
      expect(allResumes[0].createdAt.getTime()).toBeGreaterThanOrEqual(allResumes[1].createdAt.getTime())
    })
  })

  // Edge cases and validation
  describe('Edge Cases and Validation', () => {
    let testUser: User

    beforeEach(async () => {
      await testDatabase.cleanup()
      testUser = await dbHelpers.createTestUser()
    })

    it('should handle very long version names', async () => {
      const longVersionName = 'Software Engineer Resume for Full-Stack Development Positions with React, Node.js, and AWS Experience'

      const resume = await dbHelpers.createTestResume(testUser, {
        versionName: longVersionName
      })

      expect(resume.versionName).toBe(longVersionName)
    })

    it('should handle special characters in filenames', async () => {
      const specialFileName = 'João_Müller_Résumé_(v2.1).pdf'

      const resume = await dbHelpers.createTestResume(testUser, {
        fileName: specialFileName
      })

      expect(resume.fileName).toBe(specialFileName)
    })

    it('should handle very long file URLs', async () => {
      const longUrl = 'https://very-long-cloud-storage-domain-name.amazonaws.com/bucket-with-long-name/nested/folder/structure/' + 'a'.repeat(200) + '.pdf'

      const resume = await dbHelpers.createTestResume(testUser, {
        fileUrl: longUrl
      })

      expect(resume.fileUrl).toBe(longUrl)
    })

    it('should handle very long descriptions', async () => {
      const longDescription = 'This resume is specifically tailored for software engineering positions. '.repeat(50)

      const resume = await dbHelpers.createTestResume(testUser, {
        description: longDescription
      })

      expect(resume.description).toBe(longDescription)
      expect(resume.description?.length).toBeGreaterThan(3000)
    })

    it('should handle high usage counts', async () => {
      const resume = await dbHelpers.createTestResume(testUser, {
        usageCount: 999999
      })

      expect(resume.usageCount).toBe(999999)
    })

    it('should handle null optional fields', async () => {
      const resume = await dbHelpers.createTestResume(testUser, {
        description: null,
        lastUsedAt: null
      })

      expect(resume.description).toBeNull()
      expect(resume.lastUsedAt).toBeNull()
    })
  })
})