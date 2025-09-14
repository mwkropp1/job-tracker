import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm'

export class CreateResumesTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'resumes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'fileUrl',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'versionName',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['Upload', 'Google Drive', 'Generated'],
            default: `'Upload'`,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
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
      'resumes',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('resumes')
  }
}
