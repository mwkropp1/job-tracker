/**
 * Test utilities for mock data creation, Express mocking, and database simulation
 * Provides factories, assertion helpers, and environment setup for comprehensive testing
 */

import bcrypt from 'bcrypt';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Repository, DataSource, EntityManager } from 'typeorm';

import { Contact } from '../entities/Contact';
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication';
import { Resume } from '../entities/Resume';
import { User } from '../entities/User';
interface MockRequest extends Partial<Request> {
  readonly body?: Record<string, unknown>;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, unknown>;
  readonly headers?: Record<string, string | string[]>;
  user?: { readonly id: string } | null;
  readonly file?: Express.Multer.File;
  readonly files?: Express.Multer.File[];
}

interface MockResponse extends Partial<Response> {
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(obj: unknown) => MockResponse>;
  send: jest.MockedFunction<(body: unknown) => MockResponse>;
  cookie: jest.MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>;
  clearCookie: jest.MockedFunction<(name: string, options?: unknown) => MockResponse>;
  redirect: jest.MockedFunction<(url: string) => MockResponse>;
  setHeader: jest.MockedFunction<(name: string, value: string) => MockResponse>;
  end: jest.MockedFunction<() => MockResponse>;
  locals: Record<string, unknown>;
}

interface MockQueryBuilder<T> {
  select: jest.MockedFunction<() => MockQueryBuilder<T>>;
  where: jest.MockedFunction<() => MockQueryBuilder<T>>;
  andWhere: jest.MockedFunction<() => MockQueryBuilder<T>>;
  orWhere: jest.MockedFunction<() => MockQueryBuilder<T>>;
  orderBy: jest.MockedFunction<() => MockQueryBuilder<T>>;
  limit: jest.MockedFunction<() => MockQueryBuilder<T>>;
  offset: jest.MockedFunction<() => MockQueryBuilder<T>>;
  skip: jest.MockedFunction<() => MockQueryBuilder<T>>;
  take: jest.MockedFunction<() => MockQueryBuilder<T>>;
  leftJoin: jest.MockedFunction<() => MockQueryBuilder<T>>;
  leftJoinAndSelect: jest.MockedFunction<() => MockQueryBuilder<T>>;
  innerJoin: jest.MockedFunction<() => MockQueryBuilder<T>>;
  innerJoinAndSelect: jest.MockedFunction<() => MockQueryBuilder<T>>;
  groupBy: jest.MockedFunction<() => MockQueryBuilder<T>>;
  having: jest.MockedFunction<() => MockQueryBuilder<T>>;
  getMany: jest.MockedFunction<() => Promise<T[]>>;
  getOne: jest.MockedFunction<() => Promise<T | null>>;
  getManyAndCount: jest.MockedFunction<() => Promise<[T[], number]>>;
  getRawMany: jest.MockedFunction<() => Promise<unknown[]>>;
  getRawOne: jest.MockedFunction<() => Promise<unknown | undefined>>;
  execute: jest.MockedFunction<() => Promise<unknown>>;
  setParameter: jest.MockedFunction<() => MockQueryBuilder<T>>;
  setParameters: jest.MockedFunction<() => MockQueryBuilder<T>>;
}

interface UserCreationData {
  readonly email: string;
  readonly password: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isActive?: boolean;
}

interface JobApplicationCreationData {
  readonly company: string;
  readonly jobTitle: string;
  readonly status?: JobApplicationStatus;
  readonly applicationDate?: Date;
  readonly jobPostingUrl?: string;
  readonly description?: string;
  readonly salary?: number;
  readonly location?: string;
  readonly notes?: string;
  readonly user?: User;
}

interface ContactCreationData {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly company: string;
  readonly jobTitle?: string;
  readonly phoneNumber?: string;
  readonly linkedInProfile?: string;
  readonly notes?: string;
  readonly user?: User;
}

interface ResumeCreationData {
  readonly fileName: string;
  readonly originalName: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly description?: string;
  readonly isDefault?: boolean;
  readonly user?: User;
}

/**
 * Factory functions for creating test data with realistic defaults
 */
export class TestDataFactory {
  /**
   * Creates a mock user with configurable properties for testing scenarios
   */
  public static createMockUser(overrides: Partial<User> = {}): User {
    const user = new User()
    user.id = overrides.id || 'test-user-id'
    user.email = overrides.email || TEST_CONSTANTS.MOCK_DATA.USER.email
    user.password = overrides.password || TEST_CONSTANTS.AUTH.HASHED_PASSWORD
    user.firstName = overrides.firstName || TEST_CONSTANTS.MOCK_DATA.USER.firstName
    user.lastName = overrides.lastName || TEST_CONSTANTS.MOCK_DATA.USER.lastName
    user.isActive = overrides.isActive ?? TEST_CONSTANTS.MOCK_DATA.USER.isActive
    user.createdAt = overrides.createdAt || new Date()
    user.updatedAt = overrides.updatedAt || new Date()
    user.jobApplications = overrides.jobApplications || []
    user.contacts = overrides.contacts || []
    user.resumes = overrides.resumes || []
    return user
  }

  /**
   * Creates a mock job application with realistic job data
   */
  public static createMockJobApplication(overrides: Partial<JobApplication> = {}): JobApplication {
    const jobApp = new JobApplication()
    jobApp.id = overrides.id || 'test-job-app-id'
    jobApp.company = overrides.company || 'Test Company Inc'
    jobApp.jobTitle = overrides.jobTitle || 'Software Engineer'
    jobApp.status = overrides.status || JobApplicationStatus.APPLIED
    jobApp.applicationDate = overrides.applicationDate || new Date()
    jobApp.jobPostingUrl = overrides.jobPostingUrl || 'https://example.com/job'
    jobApp.description = overrides.description || 'Test job description'
    jobApp.salary = overrides.salary || 100000
    jobApp.location = overrides.location || 'Remote'
    jobApp.notes = overrides.notes || 'Test application notes'
    jobApp.isArchived = overrides.isArchived !== undefined ? overrides.isArchived : false
    jobApp.createdAt = overrides.createdAt || new Date()
    jobApp.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      jobApp.user = overrides.user
      jobApp.userId = overrides.user.id
    }

    return jobApp
  }

  /**
   * Creates a mock professional contact with networking data
   */
  public static createMockContact(overrides: Partial<Contact> = {}): Contact {
    const contact = new Contact()
    contact.id = overrides.id || 'test-contact-id'
    contact.firstName = overrides.firstName || 'Jane'
    contact.lastName = overrides.lastName || 'Smith'
    contact.email = overrides.email || 'jane.smith@company.com'
    contact.company = overrides.company || 'Test Company Inc'
    contact.jobTitle = overrides.jobTitle || 'Engineering Manager'
    contact.phoneNumber = overrides.phoneNumber || '+1-555-123-4567'
    contact.linkedInProfile = overrides.linkedInProfile || 'https://linkedin.com/in/janesmith'
    contact.notes = overrides.notes || 'Met at tech conference'
    contact.createdAt = overrides.createdAt || new Date()
    contact.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      contact.user = overrides.user
      contact.userId = overrides.user.id
    }

    return contact
  }

  /**
   * Creates a mock resume with file metadata and usage tracking
   */
  public static createMockResume(overrides: Partial<Resume> = {}): Resume {
    const resume = new Resume()
    resume.id = overrides.id || 'test-resume-id'
    resume.fileName = overrides.fileName || 'test_resume.pdf'
    resume.originalName = overrides.originalName || 'John_Doe_Resume.pdf'
    resume.filePath = overrides.filePath || '/uploads/resumes/test_resume.pdf'
    resume.fileSize = overrides.fileSize || 1024000
    resume.mimeType = overrides.mimeType || 'application/pdf'
    resume.description = overrides.description || 'Test resume version'
    resume.isDefault = overrides.isDefault !== undefined ? overrides.isDefault : false
    resume.usageCount = overrides.usageCount || 0
    resume.createdAt = overrides.createdAt || new Date()
    resume.updatedAt = overrides.updatedAt || new Date()

    if (overrides.user) {
      resume.user = overrides.user
      resume.userId = overrides.user.id
    }

    return resume
  }

  /**
   * Generates JWT token for authentication testing with configurable expiration
   */
  public static createTestJWT(userId: string, expiresIn = '1h'): string {
    const payload = { userId, type: 'auth' }
    const secret = process.env.JWT_SECRET || 'test-jwt-secret'
    return jwt.sign(payload, secret, { expiresIn })
  }

  /**
   * Generates bcrypt hash for password testing with configurable rounds
   */
  public static async createHashedPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10')
    return await bcrypt.hash(password, rounds)
  }
}

/**
 * Express request/response mocking utilities
 */
export class MockExpressUtils {
  /**
   * Creates a comprehensive mock Express request
   */
  public static createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      file: undefined,
      files: undefined,
      get: jest.fn((header: string): string | undefined => {
        const headers = overrides.headers as Record<string, string> | undefined;
        return headers?.[header.toLowerCase()];
      }),
      ...overrides,
    };
  }

  /**
   * Creates a mock Express response with chainable methods
   */
  public static createMockResponse(): MockResponse {
    const res = {} as MockResponse;

    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.locals = {};

    return res;
  }

  /**
   * Creates a mock Express next function
   */
  public static createMockNext(): jest.MockedFunction<NextFunction> {
    return jest.fn();
  }
}

/**
 * Database mocking utilities for TypeORM
 */
export class MockDatabaseUtils {
  /**
   * Creates a mock TypeORM repository with common methods
   */
  public static createMockRepository<T>(): jest.Mocked<Repository<T>> {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {} as any,
      metadata: {} as any,
      target: {} as any,
      query: jest.fn(),
      clear: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      sum: jest.fn(),
      average: jest.fn(),
      minimum: jest.fn(),
      maximum: jest.fn(),
      findBy: jest.fn(),
      findOneByOrFail: jest.fn(),
      findOneOrFail: jest.fn(),
      countBy: jest.fn(),
      existsBy: jest.fn(),
      extend: jest.fn(),
      insert: jest.fn(),
      upsert: jest.fn(),
      recover: jest.fn(),
      restore: jest.fn(),
      softDelete: jest.fn(),
      softRemove: jest.fn(),
      preload: jest.fn(),
    } as any
  }

  /**
   * Creates a mock DataSource for testing
   */
  public static createMockDataSource(): jest.Mocked<DataSource> {
    return {
      getRepository: jest.fn(),
      manager: {
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        transaction: jest.fn(),
      },
      isInitialized: true,
      initialize: jest.fn(),
      destroy: jest.fn(),
    } as any
  }

  /**
   * Creates a mock QueryBuilder for complex queries
   */
  public static createMockQueryBuilder<T>(): MockQueryBuilder<T> {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      execute: jest.fn(),
      setParameter: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
    }
    return mockQueryBuilder
  }
}

/**
 * Test assertion helpers for common validation patterns
 */
export class TestAssertions {
  /**
   * Asserts that an object contains user data without sensitive fields
   */
  public static assertUserResponse(userResponse: unknown, expectedUser: User): void {
    const response = userResponse as Record<string, unknown>;
    expect(response).toMatchObject({
      id: expectedUser.id,
      email: expectedUser.email,
      firstName: expectedUser.firstName,
      lastName: expectedUser.lastName,
      isActive: expectedUser.isActive,
    });
    expect(response.password).toBeUndefined();
  }

  /**
   * Asserts that a response follows standard API error format
   */
  public static assertErrorResponse(
    response: unknown,
    expectedStatus: number,
    expectedMessage?: string,
  ): void {
    const errorResponse = response as Record<string, unknown>;
    expect(errorResponse.error).toBeDefined();
    expect(errorResponse.status).toBe(expectedStatus);
    if (expectedMessage) {
      expect(errorResponse.message).toContain(expectedMessage);
    }
  }

  /**
   * Asserts that pagination response has correct structure
   */
  public static assertPaginationResponse(response: unknown): void {
    const paginationResponse = response as Record<string, unknown>;
    expect(paginationResponse).toHaveProperty('data');
    expect(paginationResponse).toHaveProperty('totalCount');
    expect(paginationResponse).toHaveProperty('page');
    expect(paginationResponse).toHaveProperty('limit');
    expect(paginationResponse).toHaveProperty('totalPages');
    expect(Array.isArray(paginationResponse.data)).toBe(true);
    expect(typeof paginationResponse.totalCount).toBe('number');
    expect(typeof paginationResponse.page).toBe('number');
    expect(typeof paginationResponse.limit).toBe('number');
    expect(typeof paginationResponse.totalPages).toBe('number');
  }

  /**
   * Asserts that a date string is in ISO format and valid
   */
  public static assertValidISODate(dateString: string): void {
    expect(typeof dateString).toBe('string');
    const date = new Date(dateString);
    expect(date.toISOString()).toBe(dateString);
    expect(Number.isNaN(date.getTime())).toBe(false);
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironmentUtils {
  /**
   * Sets up test environment variables
   */
  public static setupTestEnv(): void {
    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_CONSTANTS.AUTH.JWT_SECRET
    process.env.JWT_EXPIRES_IN = TEST_CONSTANTS.AUTH.JWT_EXPIRES_IN
    process.env.BCRYPT_ROUNDS = TEST_CONSTANTS.AUTH.BCRYPT_ROUNDS.toString()
    process.env.DATABASE_URL = 'sqlite::memory:'
  }

  /**
   * Cleans up test environment
   */
  public static cleanupTestEnv(): void {
    // Reset any global state if needed
    jest.clearAllMocks();
  }

  /**
   * Creates a test database configuration
   */
  public static getTestDatabaseConfig(): Record<string, unknown> {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [User, JobApplication, Contact, Resume],
      synchronize: true,
      logging: false,
      dropSchema: true,
    };
  }
}

// Export individual utilities for better tree-shaking and explicit imports
export {
  TestDataFactory,
  MockExpressUtils,
  MockDatabaseUtils,
  TestAssertions,
  TestEnvironmentUtils,
};

// Export types for external use
export type {
  MockRequest,
  MockResponse,
  MockQueryBuilder,
  UserCreationData,
  JobApplicationCreationData,
  ContactCreationData,
  ResumeCreationData,
};