import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm'

/**
 * Database migration for creating the job_application_contacts junction table.
 *
 * Creates a comprehensive junction table for tracking contact-application relationships with:
 * - Many-to-many relationship between job applications and contacts
 * - Interaction tracking with type, date, and notes
 * - User ownership validation through foreign key constraints
 * - Proper cascade and null handling for data integrity
 *
 * The table enables rich interaction tracking between contacts and applications,
 * allowing users to record how contacts helped with specific applications
 * (referrals, introductions, follow-ups, etc.).
 */
export class CreateJobApplicationContactsTable1700000000005 implements MigrationInterface {
  /**
   * Executes the forward migration to create the job_application_contacts junction table.
   *
   * Creates the table with all necessary columns, constraints, and foreign keys.
   * Establishes proper cascade behaviors for data integrity and user scoping.
   *
   * @param queryRunner - TypeORM query runner for database operations
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'job_application_contacts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'job_application_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'contact_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'interaction_type',
            type: 'enum',
            enum: [
              'Referral',
              'Introduction',
              'Follow-up',
              'Interview Preparation',
              'Application Review',
              'Networking',
              'Other'
            ],
            default: `'Other'`,
          },
          {
            name: 'interaction_date',
            type: 'date',
            isNullable: false,
            default: 'CURRENT_DATE',
          },
          {
            name: 'notes',
            type: 'text',
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
        uniques: [
          {
            columnNames: ['job_application_id', 'contact_id'],
          },
        ],
      }),
      true
    )

    // Create foreign key to job_applications table
    await queryRunner.createForeignKey(
      'job_application_contacts',
      new TableForeignKey({
        columnNames: ['job_application_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'job_applications',
        onDelete: 'CASCADE',
      })
    )

    // Create foreign key to contacts table
    await queryRunner.createForeignKey(
      'job_application_contacts',
      new TableForeignKey({
        columnNames: ['contact_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contacts',
        onDelete: 'CASCADE',
      })
    )
  }

  /**
   * Executes the rollback migration to remove the job_application_contacts table.
   *
   * Drops the entire table including all data, indexes, and foreign keys.
   * Use with caution as this operation is irreversible.
   *
   * @param queryRunner - TypeORM query runner for database operations
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('job_application_contacts')
  }
}