import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm'

import { STRING_LIMITS } from '../constants/validation'

/**
 * Database migration for creating the job_applications table.
 *
 * Creates a comprehensive table for tracking job applications with:
 * - UUID primary key with auto-generation
 * - Company and job title with proper length constraints
 * - Application status enum with all hiring process stages
 * - Date tracking for application timeline
 * - Optional job description, listing URL, and user notes
 * - Archive functionality for organization
 * - Foreign key relationships to users and resumes
 * - Proper cascade and null handling for data integrity
 *
 * Indexes are created on company and jobTitle fields for efficient querying.
 * Foreign keys ensure referential integrity with cascade deletion for users
 * and SET NULL for resumes to preserve application history.
 */
export class CreateJobApplicationsTable1700000000002 implements MigrationInterface {
  /**
   * Executes the forward migration to create the job_applications table.
   *
   * Creates the table with all necessary columns, constraints, and indexes.
   * Establishes foreign key relationships with proper cascade behaviors.
   *
   * @param queryRunner - TypeORM query runner for database operations
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'job_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'company',
            type: 'varchar',
            length: STRING_LIMITS.COMPANY_NAME.toString(),
            isNullable: false,
          },
          {
            name: 'jobTitle',
            type: 'varchar',
            length: STRING_LIMITS.JOB_TITLE.toString(),
            isNullable: false,
          },
          {
            name: 'jobDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'applicationDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'jobListingUrl',
            type: 'varchar',
            length: STRING_LIMITS.URL.toString(),
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isArchived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'Applied',
              'Phone Screen',
              'Technical Interview',
              'Onsite Interview',
              'Offer Received',
              'Offer Accepted',
              'Declined',
              'Rejected',
            ],
            default: `'Applied'`,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'resumeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    )

    await queryRunner.createForeignKey(
      'job_applications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    )

    await queryRunner.createForeignKey(
      'job_applications',
      new TableForeignKey({
        columnNames: ['resumeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'resumes',
        onDelete: 'SET NULL',
      })
    )
  }

  /**
   * Executes the rollback migration to remove the job_applications table.
   *
   * Drops the entire table including all data, indexes, and foreign keys.
   * Use with caution as this operation is irreversible.
   *
   * @param queryRunner - TypeORM query runner for database operations
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('job_applications')
  }
}
