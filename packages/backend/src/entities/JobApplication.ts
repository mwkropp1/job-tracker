import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm'

import { BaseEntity } from '../core/BaseEntity'

import { Contact } from './Contact'
import { JobApplicationContact } from './JobApplicationContact'
import { Resume } from './Resume'
import { User } from './User'

/**
 * Enum defining the various stages of a job application process.
 * Used for tracking application progress and filtering.
 */
export enum JobApplicationStatus {
  /** Initial application submitted */
  APPLIED = 'Applied',
  /** First round phone or video screening */
  PHONE_SCREEN = 'Phone Screen',
  /** Technical assessment or coding interview */
  TECHNICAL_INTERVIEW = 'Technical Interview',
  /** Final round in-person or video interview */
  ONSITE_INTERVIEW = 'Onsite Interview',
  /** Job offer has been extended by company */
  OFFER_RECEIVED = 'Offer Received',
  /** Job offer has been accepted by applicant */
  OFFER_ACCEPTED = 'Offer Accepted',
  /** Application declined by applicant */
  DECLINED = 'Declined',
  /** Application rejected by company */
  REJECTED = 'Rejected',
}

/**
 * Job Application entity representing a user's application to a specific position.
 *
 * Features:
 * - Comprehensive application tracking with status progression
 * - Company and job title indexing for efficient searches
 * - Optional resume linkage with usage statistics tracking
 * - Contact relationship management for networking
 * - Archiving system for organization without deletion
 * - Date tracking for application timeline management
 *
 * Indexes:
 * - company: Optimizes company-based searches and filters
 * - jobTitle: Enables fast job title searches and analytics
 *
 * Relationships:
 * - User (required): Enforces user-scoped access control
 * - Resume (optional): Links to specific resume version used
 * - Contacts (many-to-many): Associates networking contacts
 *
 * Security: All applications are user-scoped via required foreign key.
 */
@Entity('job_applications')
export class JobApplication extends BaseEntity {
  /**
   * Company name where the application was submitted.
   * Indexed for efficient filtering and search operations.
   */
  @Column()
  @Index()
  company: string

  /**
   * Job title or position name applied for.
   * Indexed for job title analytics and search functionality.
   */
  @Column()
  @Index()
  jobTitle: string

  /**
   * Optional detailed job description or requirements.
   * Stored as text to accommodate long descriptions.
   */
  @Column({ type: 'text', nullable: true })
  jobDescription?: string

  /**
   * Date when the application was submitted.
   * Used for timeline tracking and analytics.
   */
  @Column({ type: 'date' })
  applicationDate: Date

  /**
   * Current status of the application in the hiring process.
   * Tracks progression from initial application to final outcome.
   */
  @Column({
    type: 'enum',
    enum: JobApplicationStatus,
    default: JobApplicationStatus.APPLIED,
  })
  status: JobApplicationStatus

  /**
   * Optional URL to the original job listing or posting.
   * Useful for reference and tracking source of applications.
   */
  @Column({ nullable: true })
  jobListingUrl?: string

  /**
   * Optional user notes about the application or interview process.
   * Supports rich text for detailed tracking and memories.
   */
  @Column({ type: 'text', nullable: true })
  notes?: string

  /**
   * Indicates if the application has been archived by the user.
   * Archived applications are hidden from default views but not deleted.
   */
  @Column({ default: false })
  isArchived: boolean

  /**
   * Owner of this job application. Enforces user-scoped access control.
   * Cannot be null - every application must belong to a user.
   */
  @ManyToOne(() => User, user => user.jobApplications, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User

  /**
   * Optional resume version used for this application.
   * Enables tracking of which resume versions are most effective.
   * Updates resume usage statistics when linked.
   */
  @ManyToOne(() => Resume, resume => resume.jobApplications, { nullable: true })
  @JoinColumn({ name: 'resumeId' })
  resume?: Resume

  /**
   * Contact interactions through junction table for rich tracking.
   * Enables detailed tracking of how contacts helped with this application.
   * Loaded on demand for performance optimization.
   */
  @OneToMany(() => JobApplicationContact, contactInteraction => contactInteraction.jobApplication)
  contactInteractions?: JobApplicationContact[]

  /**
   * Computed property: Associated contacts for backward compatibility.
   * Returns unique contacts involved in this application.
   */
  get contacts(): Contact[] | undefined {
    return this.contactInteractions?.map(interaction => interaction.contact)
  }
}
