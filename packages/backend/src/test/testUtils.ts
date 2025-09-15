/**
 * Test utilities for Express mocking, database simulation, and environment setup
 * For test data creation, use TestDataFactory from './testDataFactory'
 * For assertions, use EnhancedTestAssertions from './assertions'
 */

import type { Request, Response, NextFunction } from 'express'
import type { Repository, DataSource, EntityManager } from 'typeorm'

import { Contact } from '../entities/Contact'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { JobApplicationContact, InteractionType } from '../entities/JobApplicationContact'
import { Resume } from '../entities/Resume'
import { User } from '../entities/User'
import { TEST_CONSTANTS } from './constants'
interface MockRequest extends Partial<Request> {
  readonly body?: Record<string, unknown>
  readonly params?: Record<string, string>
  readonly query?: Record<string, unknown>
  readonly headers?: Record<string, string | string[]>
  user?: { readonly id: string } | null
  readonly file?: Express.Multer.File
  readonly files?: Express.Multer.File[]
}

interface MockResponse extends Partial<Response> {
  status: jest.MockedFunction<(code: number) => MockResponse>
  json: jest.MockedFunction<(obj: unknown) => MockResponse>
  send: jest.MockedFunction<(body: unknown) => MockResponse>
  cookie: jest.MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>
  clearCookie: jest.MockedFunction<(name: string, options?: unknown) => MockResponse>
  redirect: jest.MockedFunction<(url: string) => MockResponse>
  setHeader: jest.MockedFunction<(name: string, value: string) => MockResponse>
  end: jest.MockedFunction<() => MockResponse>
  locals: Record<string, unknown>
}

interface MockQueryBuilder<T> {
  select: jest.MockedFunction<() => MockQueryBuilder<T>>
  where: jest.MockedFunction<() => MockQueryBuilder<T>>
  andWhere: jest.MockedFunction<() => MockQueryBuilder<T>>
  orWhere: jest.MockedFunction<() => MockQueryBuilder<T>>
  orderBy: jest.MockedFunction<() => MockQueryBuilder<T>>
  limit: jest.MockedFunction<() => MockQueryBuilder<T>>
  offset: jest.MockedFunction<() => MockQueryBuilder<T>>
  skip: jest.MockedFunction<() => MockQueryBuilder<T>>
  take: jest.MockedFunction<() => MockQueryBuilder<T>>
  leftJoin: jest.MockedFunction<() => MockQueryBuilder<T>>
  leftJoinAndSelect: jest.MockedFunction<() => MockQueryBuilder<T>>
  innerJoin: jest.MockedFunction<() => MockQueryBuilder<T>>
  innerJoinAndSelect: jest.MockedFunction<() => MockQueryBuilder<T>>
  groupBy: jest.MockedFunction<() => MockQueryBuilder<T>>
  having: jest.MockedFunction<() => MockQueryBuilder<T>>
  getMany: jest.MockedFunction<() => Promise<T[]>>
  getOne: jest.MockedFunction<() => Promise<T | null>>
  getManyAndCount: jest.MockedFunction<() => Promise<[T[], number]>>
  getRawMany: jest.MockedFunction<() => Promise<unknown[]>>
  getRawOne: jest.MockedFunction<() => Promise<unknown | undefined>>
  execute: jest.MockedFunction<() => Promise<unknown>>
  setParameter: jest.MockedFunction<() => MockQueryBuilder<T>>
  setParameters: jest.MockedFunction<() => MockQueryBuilder<T>>
}


/**
 * Express request/response mocking utilities
 */
export class MockExpressUtils {
  /**
   * Creates mock Express request for controller testing
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
        const headers = overrides.headers as Record<string, string> | undefined
        return headers?.[header.toLowerCase()]
      }),
      ...overrides,
    }
  }

  /**
   * Creates mock Express response with chainable interface
   */
  public static createMockResponse(): MockResponse {
    const res = {} as MockResponse

    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    res.cookie = jest.fn().mockReturnValue(res)
    res.clearCookie = jest.fn().mockReturnValue(res)
    res.redirect = jest.fn().mockReturnValue(res)
    res.setHeader = jest.fn().mockReturnValue(res)
    res.end = jest.fn().mockReturnValue(res)
    res.locals = {}

    return res
  }

  /**
   * Creates mock Next function for middleware testing
   */
  public static createMockNext(): jest.MockedFunction<NextFunction> {
    return jest.fn()
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
 * Test environment setup utilities
 */
export class TestEnvironmentUtils {
  /**
   * Configures environment for isolated test execution
   */
  public static setupTestEnv(): void {
    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_CONSTANTS.AUTH.JWT_SECRET
    process.env.JWT_EXPIRES_IN = TEST_CONSTANTS.AUTH.JWT_EXPIRES_IN
    process.env.BCRYPT_ROUNDS = TEST_CONSTANTS.AUTH.BCRYPT_ROUNDS.toString()
    process.env.DATABASE_URL = 'sqlite::memory:'
  }

  /**
   * Resets global state between test runs
   */
  public static cleanupTestEnv(): void {
    // Clear any lingering global state from previous tests
    jest.clearAllMocks()
  }

  /**
   * Provides in-memory database config for unit tests
   */
  public static getTestDatabaseConfig(): Record<string, unknown> {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [User, JobApplication, Contact, Resume, JobApplicationContact],
      synchronize: true,
      logging: false,
      dropSchema: true,
    }
  }
}

// Export individual utilities for better tree-shaking and explicit imports
export { MockExpressUtils, MockDatabaseUtils, TestEnvironmentUtils }

// Export types for external use
export type { MockRequest, MockResponse, MockQueryBuilder }
