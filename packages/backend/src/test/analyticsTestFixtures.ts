/**
 * Analytics-specific test fixtures and mock data factory
 * Provides realistic test data for comprehensive analytics testing
 */

import type { DeepPartial } from 'typeorm'

import { Contact } from '../entities/Contact'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationContact, InteractionType } from '../entities/JobApplicationContact'
import { Resume, ResumeSource } from '../entities/Resume'
import { User } from '../entities/User'
import { TestDataFactory } from './testDataFactory'

/**
 * Pre-defined analytics scenarios for testing various edge cases and data patterns
 */
export class AnalyticsTestFixtures {
  /**
   * Creates a complete analytics test dataset with realistic job search patterns
   */
  public static createAnalyticsDataset(user: User): AnalyticsDataset {
    const resumes = this.createResumeSet(user)
    const applications = this.createApplicationSet(user, resumes)
    const contacts = this.createContactSet(user)
    const interactions = this.createContactInteractions(applications, contacts)

    return {
      user,
      resumes,
      applications,
      contacts,
      interactions,
    }
  }

  /**
   * Creates realistic resume set with different sources and usage patterns
   */
  public static createResumeSet(user: User): Resume[] {
    const baseDate = new Date('2024-01-01')

    return [
      // Primary resume - most used
      TestDataFactory.createMockResume({
        user,
        versionName: 'Software Engineer - Primary',
        fileName: 'john_doe_software_engineer.pdf',
        source: ResumeSource.UPLOAD,
        uploadDate: new Date(baseDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        lastUsedDate: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        applicationCount: 25,
        isDefault: true,
        notes: 'Main resume with 5 years experience',
      }),

      // Specialized resume - moderate use
      TestDataFactory.createMockResume({
        user,
        versionName: 'Senior Developer - Specialized',
        fileName: 'john_doe_senior_dev.pdf',
        source: ResumeSource.UPLOAD,
        uploadDate: new Date(baseDate.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        lastUsedDate: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        applicationCount: 12,
        isDefault: false,
        notes: 'Tailored for senior positions',
      }),

      // AI-generated resume - experimental
      TestDataFactory.createMockResume({
        user,
        versionName: 'AI Generated - Modern Format',
        fileName: 'ai_generated_resume_v1.pdf',
        source: ResumeSource.GENERATED,
        uploadDate: new Date(baseDate.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        lastUsedDate: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        applicationCount: 8,
        isDefault: false,
        notes: 'Experimental AI-generated format',
      }),

      // Unused resume - zero applications
      TestDataFactory.createMockResume({
        user,
        versionName: 'Old Format - Unused',
        fileName: 'old_resume_format.pdf',
        source: ResumeSource.UPLOAD,
        uploadDate: new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        lastUsedDate: undefined,
        applicationCount: 0,
        isDefault: false,
        notes: 'Outdated format, not used recently',
      }),
    ]
  }

  /**
   * Creates comprehensive application set representing realistic job search funnel
   */
  public static createApplicationSet(user: User, resumes: Resume[]): JobApplication[] {
    const applications: JobApplication[] = []
    const companies = this.getTestCompanies()
    const baseDate = new Date('2024-01-01')

    // Simulate 90-day job search with varying success rates
    companies.forEach((company, companyIndex) => {
      company.positions.forEach((position, positionIndex) => {
        const applicationDate = new Date(
          baseDate.getTime() - (companyIndex * 7 + positionIndex * 2) * 24 * 60 * 60 * 1000
        )

        // Assign resume based on company tier and position type
        let selectedResume: Resume
        if (company.tier === 'big-tech' && position.level === 'senior') {
          selectedResume = resumes[1] // Specialized resume
        } else if (company.tier === 'startup' && Math.random() > 0.7) {
          selectedResume = resumes[2] // AI-generated for experiments
        } else {
          selectedResume = resumes[0] // Primary resume
        }

        // Determine status based on company tier and time elapsed
        const status = this.determineApplicationStatus(company.tier, position.level, applicationDate)

        applications.push(
          TestDataFactory.createMockJobApplication({
            user,
            resume: selectedResume,
            company: company.name,
            jobTitle: position.title,
            status,
            applicationDate,
            jobDescription: position.description,
            jobListingUrl: `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com/careers/${positionIndex}`,
            notes: this.generateApplicationNotes(status, company.name),
            isArchived: status === JobApplicationStatus.REJECTED && Math.random() > 0.7, // Archive 30% of rejections
          })
        )
      })
    })

    return applications
  }

  /**
   * Creates professional contact network for testing relationship analytics
   */
  public static createContactSet(user: User): Contact[] {
    const contacts: Contact[] = []
    const companies = this.getTestCompanies()

    companies.forEach((company) => {
      // Add 1-3 contacts per company
      const contactCount = Math.floor(Math.random() * 3) + 1

      for (let i = 0; i < contactCount; i++) {
        const roles = ['Engineering Manager', 'Senior Developer', 'Tech Lead', 'HR Business Partner', 'Recruiter']
        const firstName = this.getRandomFirstName()
        const lastName = this.getRandomLastName()

        contacts.push(
          TestDataFactory.createMockContact({
            user,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
            company: company.name,
            jobTitle: roles[Math.floor(Math.random() * roles.length)],
            phoneNumber: this.generatePhoneNumber(),
            linkedInProfile: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
            notes: `Met through ${this.getRandomConnectionSource()}`,
          })
        )
      }
    })

    return contacts
  }

  /**
   * Creates contact interactions linked to job applications
   */
  public static createContactInteractions(
    applications: JobApplication[],
    contacts: Contact[]
  ): JobApplicationContact[] {
    const interactions: JobApplicationContact[] = []

    applications.forEach((app) => {
      // Find contacts from same company
      const companyContacts = contacts.filter(c => c.company === app.company)

      if (companyContacts.length > 0 && Math.random() > 0.4) {
        // 60% chance of having contact interaction
        const contact = companyContacts[Math.floor(Math.random() * companyContacts.length)]
        const interactionDate = new Date(
          app.applicationDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000
        ) // Within 2 weeks of application

        interactions.push(
          TestDataFactory.createMockJobApplicationContact({
            jobApplication: app,
            contact,
            interactionType: this.getRandomInteractionType(),
            interactionDate,
            notes: this.generateInteractionNotes(contact.jobTitle),
          })
        )
      }
    })

    return interactions
  }

  /**
   * Creates edge case scenarios for testing analytics robustness
   */
  public static createEdgeCaseScenarios(): EdgeCaseScenario[] {
    return [
      {
        name: 'Single Day Mass Applications',
        description: 'User applies to 20 jobs in one day',
        applicationCount: 20,
        timeSpan: 1, // 1 day
        pattern: 'mass_application',
      },
      {
        name: 'Long Interview Process',
        description: 'Application with 6-month interview timeline',
        applicationCount: 1,
        timeSpan: 180, // 6 months
        pattern: 'extended_process',
      },
      {
        name: 'Zero Response Period',
        description: '30 days with no application responses',
        applicationCount: 15,
        timeSpan: 30,
        pattern: 'no_response',
      },
      {
        name: 'High Success Rate Streak',
        description: '10 consecutive applications leading to interviews',
        applicationCount: 10,
        timeSpan: 20,
        pattern: 'success_streak',
      },
      {
        name: 'Rapid Rejection Cycle',
        description: '20 rejections within 1 week',
        applicationCount: 20,
        timeSpan: 7,
        pattern: 'rapid_rejection',
      },
    ]
  }

  /**
   * Creates performance test dataset with large volumes
   */
  public static createLargeDataset(user: User, options: LargeDatasetOptions): AnalyticsDataset {
    const resumes = this.createResumeSet(user)
    const applications: JobApplication[] = []
    const contacts: Contact[] = []
    const interactions: JobApplicationContact[] = []

    const startDate = new Date(options.startDate)
    const endDate = new Date(options.endDate)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Generate applications spread across date range
    for (let i = 0; i < options.applicationCount; i++) {
      const randomDaysOffset = Math.floor(Math.random() * daysDiff)
      const applicationDate = new Date(startDate.getTime() + randomDaysOffset * 24 * 60 * 60 * 1000)

      const companies = this.getTestCompanies()
      const company = companies[Math.floor(Math.random() * companies.length)]
      const position = company.positions[Math.floor(Math.random() * company.positions.length)]
      const resume = resumes[Math.floor(Math.random() * resumes.length)]

      applications.push(
        TestDataFactory.createMockJobApplication({
          user,
          resume,
          company: `${company.name} ${Math.floor(i / 10)}`, // Vary company names
          jobTitle: position.title,
          status: this.getRandomStatus(),
          applicationDate,
          jobDescription: position.description,
        })
      )
    }

    // Generate contacts (1 contact per 5 applications)
    for (let i = 0; i < Math.floor(options.applicationCount / 5); i++) {
      const companies = [...new Set(applications.map(app => app.company))]
      const company = companies[Math.floor(Math.random() * companies.length)]

      contacts.push(
        TestDataFactory.createMockContact({
          user,
          firstName: this.getRandomFirstName(),
          lastName: this.getRandomLastName(),
          company,
          jobTitle: 'Software Engineer',
          email: `contact${i}@example.com`,
        })
      )
    }

    return { user, resumes, applications, contacts, interactions }
  }

  // Helper methods

  private static getTestCompanies(): TestCompany[] {
    return [
      {
        name: 'Google',
        tier: 'big-tech',
        positions: [
          { title: 'Software Engineer III', level: 'mid', description: 'Build scalable systems at Google scale' },
          { title: 'Senior Software Engineer', level: 'senior', description: 'Lead technical initiatives' },
          { title: 'Staff Software Engineer', level: 'staff', description: 'Drive architectural decisions' },
        ],
      },
      {
        name: 'Meta',
        tier: 'big-tech',
        positions: [
          { title: 'Software Engineer', level: 'mid', description: 'Connect the world through technology' },
          { title: 'Senior Software Engineer', level: 'senior', description: 'Build the metaverse' },
        ],
      },
      {
        name: 'Stripe',
        tier: 'unicorn',
        positions: [
          { title: 'Software Engineer', level: 'mid', description: 'Build payment infrastructure' },
          { title: 'Senior Software Engineer', level: 'senior', description: 'Scale financial technology' },
        ],
      },
      {
        name: 'Airbnb',
        tier: 'unicorn',
        positions: [
          { title: 'Software Engineer II', level: 'mid', description: 'Create magical travel experiences' },
          { title: 'Senior Software Engineer', level: 'senior', description: 'Lead product development' },
        ],
      },
      {
        name: 'TechStartup Inc',
        tier: 'startup',
        positions: [
          { title: 'Full Stack Developer', level: 'mid', description: 'Build the future of SaaS' },
          { title: 'Senior Full Stack Developer', level: 'senior', description: 'Architect scalable solutions' },
        ],
      },
      {
        name: 'InnovateLab',
        tier: 'startup',
        positions: [
          { title: 'Software Engineer', level: 'mid', description: 'Disrupt traditional industries' },
          { title: 'Lead Developer', level: 'senior', description: 'Drive technical strategy' },
        ],
      },
      {
        name: 'Enterprise Corp',
        tier: 'enterprise',
        positions: [
          { title: 'Application Developer', level: 'mid', description: 'Maintain enterprise applications' },
          { title: 'Senior Application Developer', level: 'senior', description: 'Modernize legacy systems' },
        ],
      },
      {
        name: 'BigBank Financial',
        tier: 'enterprise',
        positions: [
          { title: 'Software Developer', level: 'mid', description: 'Build secure banking systems' },
          { title: 'Senior Software Developer', level: 'senior', description: 'Lead fintech innovation' },
        ],
      },
    ]
  }

  private static determineApplicationStatus(
    tier: CompanyTier,
    level: PositionLevel,
    applicationDate: Date
  ): JobApplicationStatus {
    const daysSinceApplication = Math.floor(
      (Date.now() - applicationDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Big tech and unicorns have higher response rates
    const baseResponseRate = tier === 'big-tech' ? 0.4 : tier === 'unicorn' ? 0.35 : tier === 'startup' ? 0.25 : 0.2

    // Senior positions have slightly lower response rates
    const levelMultiplier = level === 'senior' ? 0.9 : level === 'staff' ? 0.8 : 1.0

    const responseRate = baseResponseRate * levelMultiplier

    // Simulate progression through stages based on time elapsed
    if (daysSinceApplication < 7) {
      // Recent applications mostly still pending
      return Math.random() < 0.8 ? JobApplicationStatus.APPLIED : JobApplicationStatus.PHONE_SCREEN
    } else if (daysSinceApplication < 21) {
      // 1-3 weeks: some progression
      if (Math.random() < responseRate) {
        const stages = [
          JobApplicationStatus.PHONE_SCREEN,
          JobApplicationStatus.TECHNICAL_INTERVIEW,
          JobApplicationStatus.ONSITE_INTERVIEW,
        ]
        return stages[Math.floor(Math.random() * stages.length)]
      } else {
        return Math.random() < 0.7 ? JobApplicationStatus.REJECTED : JobApplicationStatus.APPLIED
      }
    } else {
      // 3+ weeks: most applications resolved
      if (Math.random() < responseRate * 0.3) {
        // Small chance of offers
        return Math.random() < 0.7 ? JobApplicationStatus.OFFER_RECEIVED : JobApplicationStatus.OFFER_ACCEPTED
      } else {
        return JobApplicationStatus.REJECTED
      }
    }
  }

  private static generateApplicationNotes(status: JobApplicationStatus, company: string): string {
    const templates = {
      [JobApplicationStatus.APPLIED]: [
        `Applied through company website for ${company}`,
        `Submitted application via LinkedIn for ${company} position`,
        `Applied after networking referral at ${company}`,
      ],
      [JobApplicationStatus.PHONE_SCREEN]: [
        `Completed initial phone screen with ${company} recruiter`,
        `Good conversation with hiring manager at ${company}`,
        `Phone screen went well, discussing next steps`,
      ],
      [JobApplicationStatus.TECHNICAL_INTERVIEW]: [
        `Technical interview scheduled for next week`,
        `Completed coding challenge for ${company}`,
        `System design interview went well`,
      ],
      [JobApplicationStatus.ONSITE_INTERVIEW]: [
        `Full day onsite interview at ${company}`,
        `Virtual final round with team`,
        `Panel interview with engineering team`,
      ],
      [JobApplicationStatus.OFFER_RECEIVED]: [
        `Received offer from ${company}! Reviewing details`,
        `Great offer package, negotiating salary`,
        `Offer received, considering next steps`,
      ],
      [JobApplicationStatus.OFFER_ACCEPTED]: [
        `Accepted offer at ${company}! Starting next month`,
        `Signed offer letter, excited to join ${company}`,
        `Negotiation successful, accepted final offer`,
      ],
      [JobApplicationStatus.REJECTED]: [
        `Rejected after phone screen`,
        `Not moving forward with ${company}`,
        `Position filled by internal candidate`,
      ],
      [JobApplicationStatus.DECLINED]: [
        `Declined offer due to compensation`,
        `Decided to pursue other opportunities`,
        `Not the right cultural fit`,
      ],
    }

    const options = templates[status] || [`Update for ${company} position`]
    return options[Math.floor(Math.random() * options.length)]
  }

  private static getRandomInteractionType(): InteractionType {
    const types = [
      InteractionType.NETWORKING,
      InteractionType.REFERRAL,
      InteractionType.INTRODUCTION,
      InteractionType.FOLLOW_UP,
    ]
    return types[Math.floor(Math.random() * types.length)]
  }

  private static generateInteractionNotes(contactJobTitle: string): string {
    const templates = [
      `Great conversation with ${contactJobTitle} about team culture`,
      `${contactJobTitle} provided insights about the interview process`,
      `Helpful referral from ${contactJobTitle}`,
      `Follow-up discussion about role expectations`,
      `${contactJobTitle} introduced me to hiring manager`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private static getRandomFirstName(): string {
    const names = [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
      'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'John', 'Jessica', 'Chris',
      'Amanda', 'Matt', 'Lisa', 'Kevin', 'Nicole', 'Ryan', 'Michelle', 'Jason',
    ]
    return names[Math.floor(Math.random() * names.length)]
  }

  private static getRandomLastName(): string {
    const names = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    ]
    return names[Math.floor(Math.random() * names.length)]
  }

  private static generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 800) + 200
    const exchange = Math.floor(Math.random() * 800) + 200
    const number = Math.floor(Math.random() * 9000) + 1000
    return `+1-${areaCode}-${exchange}-${number}`
  }

  private static getRandomConnectionSource(): string {
    const sources = [
      'LinkedIn networking',
      'tech conference',
      'university alumni network',
      'mutual friend introduction',
      'previous coworker',
      'online tech community',
      'hackathon event',
      'meetup group',
    ]
    return sources[Math.floor(Math.random() * sources.length)]
  }

  private static getRandomStatus(): JobApplicationStatus {
    const statuses = Object.values(JobApplicationStatus)
    const weights = [0.3, 0.15, 0.1, 0.08, 0.05, 0.02, 0.05, 0.25] // Realistic distribution

    let random = Math.random()
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return statuses[i]
      }
    }
    return JobApplicationStatus.APPLIED
  }
}

// Type definitions for test data structures

export interface AnalyticsDataset {
  user: User
  resumes: Resume[]
  applications: JobApplication[]
  contacts: Contact[]
  interactions: JobApplicationContact[]
}

export interface TestCompany {
  name: string
  tier: CompanyTier
  positions: TestPosition[]
}

export interface TestPosition {
  title: string
  level: PositionLevel
  description: string
}

export interface EdgeCaseScenario {
  name: string
  description: string
  applicationCount: number
  timeSpan: number // days
  pattern: 'mass_application' | 'extended_process' | 'no_response' | 'success_streak' | 'rapid_rejection'
}

export interface LargeDatasetOptions {
  applicationCount: number
  startDate: string
  endDate: string
}

export type CompanyTier = 'big-tech' | 'unicorn' | 'startup' | 'enterprise'
export type PositionLevel = 'junior' | 'mid' | 'senior' | 'staff' | 'principal'

/**
 * Database seeding helper for analytics tests
 */
export class AnalyticsTestSeeder {
  /**
   * Seeds database with comprehensive analytics test data
   */
  public static async seedAnalyticsData(
    getRepository: (entity: any) => any,
    scenario: 'standard' | 'large' | 'edge_case' = 'standard'
  ): Promise<AnalyticsDataset> {
    // Create test user
    const userRepo = getRepository(User)
    const user = await userRepo.save(
      TestDataFactory.createMockUser({
        email: 'analytics-test-user@example.com',
        firstName: 'Analytics',
        lastName: 'TestUser',
      })
    )

    let dataset: AnalyticsDataset

    switch (scenario) {
      case 'large':
        dataset = AnalyticsTestFixtures.createLargeDataset(user, {
          applicationCount: 1000,
          startDate: '2023-01-01',
          endDate: '2024-12-31',
        })
        break
      case 'edge_case':
        dataset = AnalyticsTestFixtures.createAnalyticsDataset(user)
        // Add edge case scenarios
        break
      default:
        dataset = AnalyticsTestFixtures.createAnalyticsDataset(user)
    }

    // Save all entities to database
    const resumeRepo = getRepository(Resume)
    const jobAppRepo = getRepository(JobApplication)
    const contactRepo = getRepository(Contact)
    const interactionRepo = getRepository(JobApplicationContact)

    await resumeRepo.save(dataset.resumes)
    await jobAppRepo.save(dataset.applications)
    await contactRepo.save(dataset.contacts)
    await interactionRepo.save(dataset.interactions)

    return dataset
  }

  /**
   * Cleans up analytics test data
   */
  public static async cleanupAnalyticsData(getRepository: (entity: any) => any, userId: string): Promise<void> {
    const interactionRepo = getRepository(JobApplicationContact)
    const jobAppRepo = getRepository(JobApplication)
    const contactRepo = getRepository(Contact)
    const resumeRepo = getRepository(Resume)
    const userRepo = getRepository(User)

    // Delete in reverse dependency order
    await interactionRepo.delete({ jobApplication: { user: { id: userId } } })
    await jobAppRepo.delete({ user: { id: userId } })
    await contactRepo.delete({ user: { id: userId } })
    await resumeRepo.delete({ user: { id: userId } })
    await userRepo.delete({ id: userId })
  }
}