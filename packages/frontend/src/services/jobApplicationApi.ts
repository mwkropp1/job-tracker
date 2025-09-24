/**
 * Job Application API Service Layer
 * Provides high-level methods for job application CRUD operations
 */

import { apiClient } from './apiClient';
import type {
  JobApplication,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
  JobApplicationQuery,
  PaginatedResponse,
  PipelineAnalytics,
} from '@/types';

// ============================================================================
// JOB APPLICATION SERVICE
// ============================================================================

export class JobApplicationService {
  private readonly baseEndpoint = '/job-applications';

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  /**
   * Get all job applications with optional filtering and pagination
   */
  async getJobApplications(
    query: JobApplicationQuery = {}
  ): Promise<PaginatedResponse<JobApplication>> {
    const queryString = apiClient.buildQueryString(query as Record<string, unknown>);
    const response = await apiClient.get<PaginatedResponse<JobApplication>>(
      `${this.baseEndpoint}${queryString}`
    );
    return response.data;
  }

  /**
   * Get a single job application by ID
   */
  async getJobApplication(id: string): Promise<JobApplication> {
    const response = await apiClient.get<JobApplication>(`${this.baseEndpoint}/${id}`);
    return response.data;
  }

  /**
   * Create a new job application
   */
  async createJobApplication(data: CreateJobApplicationRequest): Promise<JobApplication> {
    const response = await apiClient.post<JobApplication>(this.baseEndpoint, data);
    return response.data;
  }

  /**
   * Update an existing job application
   */
  async updateJobApplication(
    id: string,
    data: UpdateJobApplicationRequest
  ): Promise<JobApplication> {
    const response = await apiClient.put<JobApplication>(`${this.baseEndpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Delete a job application
   */
  async deleteJobApplication(id: string): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/${id}`);
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  /**
   * Archive multiple job applications
   */
  async archiveJobApplications(ids: string[]): Promise<void> {
    await apiClient.post(`${this.baseEndpoint}/bulk/archive`, { ids });
  }

  /**
   * Unarchive multiple job applications
   */
  async unarchiveJobApplications(ids: string[]): Promise<void> {
    await apiClient.post(`${this.baseEndpoint}/bulk/unarchive`, { ids });
  }

  /**
   * Delete multiple job applications
   */
  async deleteJobApplications(ids: string[]): Promise<void> {
    await apiClient.post(`${this.baseEndpoint}/bulk/delete`, { ids });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get pipeline analytics for job applications
   */
  async getPipelineAnalytics(filters: {
    dateFrom?: string;
    dateTo?: string;
    company?: string;
    includeArchived?: boolean;
  } = {}): Promise<PipelineAnalytics> {
    const queryString = apiClient.buildQueryString(filters as Record<string, unknown>);
    const response = await apiClient.get<PipelineAnalytics>(
      `${this.baseEndpoint}/analytics/pipeline${queryString}`
    );
    return response.data;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get unique companies from user's applications
   */
  async getCompanies(): Promise<string[]> {
    const response = await apiClient.get<string[]>(`${this.baseEndpoint}/companies`);
    return response.data;
  }

  /**
   * Get unique job titles from user's applications
   */
  async getJobTitles(): Promise<string[]> {
    const response = await apiClient.get<string[]>(`${this.baseEndpoint}/job-titles`);
    return response.data;
  }

  /**
   * Search job applications with full-text search
   */
  async searchJobApplications(
    searchTerm: string,
    filters: Omit<JobApplicationQuery, 'search'> = {}
  ): Promise<PaginatedResponse<JobApplication>> {
    const query = { ...filters, search: searchTerm };
    return this.getJobApplications(query);
  }

  /**
   * Get recent job applications (last 30 days)
   */
  async getRecentJobApplications(limit = 10): Promise<JobApplication[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dateFrom: string = thirtyDaysAgo.toISOString().split('T')[0]!;
    const query: JobApplicationQuery = {
      dateFrom,
      limit,
      sortBy: 'applicationDate',
      sortOrder: 'desc',
    };

    const result = await this.getJobApplications(query);
    return result.data;
  }

  /**
   * Get applications by status
   */
  async getJobApplicationsByStatus(
    status: string,
    query: Omit<JobApplicationQuery, 'status'> = {}
  ): Promise<PaginatedResponse<JobApplication>> {
    return this.getJobApplications({ ...query, status: status as JobApplication['status'] });
  }

  /**
   * Export job applications to CSV format
   */
  async exportJobApplications(filters: JobApplicationQuery = {}): Promise<Blob> {
    const queryString = apiClient.buildQueryString({ ...filters, format: 'csv' } as Record<string, unknown>);
    const response = await fetch(
      `${this.baseEndpoint}/export${queryString}`
    );

    if (!response.ok) {
      throw new Error('Failed to export job applications');
    }

    return response.blob();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const jobApplicationService = new JobApplicationService();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const {
  getJobApplications,
  getJobApplication,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  archiveJobApplications,
  unarchiveJobApplications,
  deleteJobApplications,
  getPipelineAnalytics,
  getCompanies,
  getJobTitles,
  searchJobApplications,
  getRecentJobApplications,
  getJobApplicationsByStatus,
  exportJobApplications,
} = jobApplicationService;