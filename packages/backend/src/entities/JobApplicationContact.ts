/**
 * JobApplicationContact entity for tracking interaction relationships.
 * Represents the many-to-many relationship between job applications and contacts
 * with additional metadata about the interaction type, date, and notes.
 */

import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm'

import { BaseEntity } from '../core/BaseEntity'
import { JobApplication } from './JobApplication'
import { Contact } from './Contact'

/** Types of interactions between contacts and job applications */
export enum InteractionType {
  REFERRAL = 'Referral',
  INTRODUCTION = 'Introduction',
  FOLLOW_UP = 'Follow-up',
  INTERVIEW_PREPARATION = 'Interview Preparation',
  APPLICATION_REVIEW = 'Application Review',
  NETWORKING = 'Networking',
  OTHER = 'Other',
}

/**
 * Junction entity for contact-application relationships with interaction tracking.
 * Enables rich metadata about how contacts helped with specific applications.
 *
 * Features:
 * - Many-to-one relationships to both JobApplication and Contact
 * - Interaction type categorization for analytics and filtering
 * - Date tracking for timeline management
 * - Optional notes for detailed interaction records
 * - Unique constraint prevents duplicate contact-application pairs
 * - Indexed for efficient querying by interaction type and date
 *
 * Security: Inherits user scoping through JobApplication and Contact entities.
 */
@Entity('job_application_contacts')
@Unique(['jobApplication', 'contact'])
export class JobApplicationContact extends BaseEntity {
  /**
   * Type of interaction between contact and application.
   * Used for categorization and analytics on networking effectiveness.
   */
  @Column({
    type: 'varchar',
    default: InteractionType.OTHER,
  })
  @Index()
  interactionType: InteractionType

  /**
   * Date when the interaction occurred.
   * Used for timeline tracking and recent activity analytics.
   */
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  @Index()
  interactionDate: Date

  /**
   * Optional detailed notes about the interaction.
   * Supports rich information about the nature of help or connection.
   */
  @Column({ type: 'text', nullable: true })
  notes?: string

  /**
   * Reference to the job application involved in this interaction.
   * Cannot be null - every interaction must be tied to an application.
   */
  @ManyToOne(() => JobApplication, jobApplication => jobApplication.contactInteractions, {
    nullable: false,
  })
  @JoinColumn({ name: 'job_application_id' })
  jobApplication: JobApplication

  /**
   * Reference to the contact who helped with this application.
   * Cannot be null - every interaction must involve a contact.
   */
  @ManyToOne(() => Contact, contact => contact.applicationInteractions, {
    nullable: false,
  })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact
}
