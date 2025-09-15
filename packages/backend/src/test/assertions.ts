/**
 * Enhanced test assertion utilities with strong typing
 * Provides type-safe assertion helpers for common validation patterns
 */

import type { User } from '../entities/User';
import type { JobApplication } from '../entities/JobApplication';
import type { Contact } from '../entities/Contact';
import type { Resume } from '../entities/Resume';

interface ApiErrorResponse {
  readonly error: string;
  readonly status: number;
  readonly message?: string;
}

interface PaginationResponse<T = unknown> {
  readonly data: T[];
  readonly totalCount: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

interface UserPublicResponse {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Type-safe assertion helpers for API responses and data validation
 */
export class EnhancedTestAssertions {
  /**
   * Verifies user response excludes sensitive data like passwords
   */
  public static assertUserResponse(
    userResponse: unknown,
    expectedUser: User
  ): asserts userResponse is UserPublicResponse {
    const response = userResponse as Record<string, unknown>;

    expect(response).toMatchObject({
      id: expectedUser.id,
      email: expectedUser.email,
      firstName: expectedUser.firstName,
      lastName: expectedUser.lastName,
      isActive: expectedUser.isActive,
    });

    // Critical: verify password is never exposed in API responses
    expect(response.password).toBeUndefined();
    expect(response).not.toHaveProperty('password');

    // Verify API includes required timestamp fields
    expect(typeof response.createdAt).toBe('string');
    expect(typeof response.updatedAt).toBe('string');
    this.assertValidISODate(response.createdAt as string);
    this.assertValidISODate(response.updatedAt as string);
  }

  /**
   * Validates API error responses follow consistent structure
   */
  public static assertErrorResponse(
    response: unknown,
    expectedStatus: number,
    expectedMessage?: string
  ): asserts response is ApiErrorResponse {
    const errorResponse = response as Record<string, unknown>;

    expect(errorResponse.error).toBeDefined();
    expect(typeof errorResponse.error).toBe('string');
    expect(errorResponse.status).toBe(expectedStatus);
    expect(typeof errorResponse.status).toBe('number');

    if (expectedMessage) {
      expect(errorResponse.message).toBeDefined();
      expect(typeof errorResponse.message).toBe('string');
      expect(errorResponse.message).toContain(expectedMessage);
    }
  }

  /**
   * Validates pagination responses for consistent API behavior
   */
  public static assertPaginationResponse<T>(
    response: unknown
  ): asserts response is PaginationResponse<T> {
    const paginationResponse = response as Record<string, unknown>;

    // Verify all pagination properties are present
    expect(paginationResponse).toHaveProperty('data');
    expect(paginationResponse).toHaveProperty('totalCount');
    expect(paginationResponse).toHaveProperty('page');
    expect(paginationResponse).toHaveProperty('limit');
    expect(paginationResponse).toHaveProperty('totalPages');

    // Verify pagination field types are correct
    expect(Array.isArray(paginationResponse.data)).toBe(true);
    expect(typeof paginationResponse.totalCount).toBe('number');
    expect(typeof paginationResponse.page).toBe('number');
    expect(typeof paginationResponse.limit).toBe('number');
    expect(typeof paginationResponse.totalPages).toBe('number');

    // Verify pagination values make logical sense
    expect(paginationResponse.totalCount).toBeGreaterThanOrEqual(0);
    expect(paginationResponse.page).toBeGreaterThan(0);
    expect(paginationResponse.limit).toBeGreaterThan(0);
    expect(paginationResponse.totalPages).toBeGreaterThanOrEqual(0);
  }

  /**
   * Validates date strings are properly formatted for API consistency
   */
  public static assertValidISODate(dateString: string): void {
    expect(typeof dateString).toBe('string');
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);

    const date = new Date(dateString);
    expect(date.toISOString()).toBe(dateString);
    expect(Number.isNaN(date.getTime())).toBe(false);
  }

  /**
   * Asserts that a job application response contains expected fields
   */
  public static assertJobApplicationResponse(
    jobAppResponse: unknown,
    expectedJobApp: JobApplication
  ): void {
    const response = jobAppResponse as Record<string, unknown>;

    expect(response).toMatchObject({
      id: expectedJobApp.id,
      company: expectedJobApp.company,
      jobTitle: expectedJobApp.jobTitle,
      status: expectedJobApp.status,
      location: expectedJobApp.location,
      salary: expectedJobApp.salary,
    });

    if (response.applicationDate) {
      this.assertValidISODate(response.applicationDate as string);
    }

    if (response.createdAt) {
      this.assertValidISODate(response.createdAt as string);
    }

    if (response.updatedAt) {
      this.assertValidISODate(response.updatedAt as string);
    }
  }

  /**
   * Asserts that a contact response contains expected fields
   */
  public static assertContactResponse(
    contactResponse: unknown,
    expectedContact: Contact
  ): void {
    const response = contactResponse as Record<string, unknown>;

    expect(response).toMatchObject({
      id: expectedContact.id,
      firstName: expectedContact.firstName,
      lastName: expectedContact.lastName,
      email: expectedContact.email,
      company: expectedContact.company,
    });

    if (response.createdAt) {
      this.assertValidISODate(response.createdAt as string);
    }

    if (response.updatedAt) {
      this.assertValidISODate(response.updatedAt as string);
    }
  }

  /**
   * Asserts that a resume response contains expected fields
   */
  public static assertResumeResponse(
    resumeResponse: unknown,
    expectedResume: Resume
  ): void {
    const response = resumeResponse as Record<string, unknown>;

    expect(response).toMatchObject({
      id: expectedResume.id,
      fileName: expectedResume.fileName,
      originalName: expectedResume.originalName,
      fileSize: expectedResume.fileSize,
      mimeType: expectedResume.mimeType,
    });

    // Security: file paths must never be exposed to clients
    expect(response.filePath).toBeUndefined();

    if (response.createdAt) {
      this.assertValidISODate(response.createdAt as string);
    }

    if (response.updatedAt) {
      this.assertValidISODate(response.updatedAt as string);
    }
  }

  /**
   * Asserts that JWT token has valid structure
   */
  public static assertValidJWTStructure(token: string): void {
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    // Each part should be base64 encoded (roughly)
    parts.forEach((part, index) => {
      expect(part.length).toBeGreaterThan(0);
      expect(part).not.toContain(' ');

      // Header and payload should be valid base64
      if (index < 2) {
        expect(() => atob(part)).not.toThrow();
      }
    });
  }

  /**
   * Asserts that an array contains unique values
   */
  public static assertUniqueValues<T>(
    array: T[],
    keyExtractor?: (item: T) => string | number
  ): void {
    const values = keyExtractor ? array.map(keyExtractor) : array;
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  }

  /**
   * Asserts that response time is within acceptable limits
   */
  public static assertResponseTime(startTime: number, maxMs: number): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThanOrEqual(maxMs);
    expect(responseTime).toBeGreaterThanOrEqual(0);
  }

  /**
   * Asserts that email format is valid
   */
  public static assertValidEmailFormat(email: string): void {
    expect(typeof email).toBe('string');
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(email.length).toBeGreaterThan(5);
    expect(email.length).toBeLessThan(255);
  }
}

// Export types for external use
export type {
  ApiErrorResponse,
  PaginationResponse,
  UserPublicResponse,
};