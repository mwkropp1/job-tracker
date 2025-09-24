/**
 * TypeScript interfaces for Job Application Tracker API
 * Provides type safety for API responses and frontend-backend communication
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Job application status progression */
export enum JobApplicationStatus {
  APPLIED = 'Applied',
  PHONE_SCREEN = 'Phone Screen',
  TECHNICAL_INTERVIEW = 'Technical Interview',
  ONSITE_INTERVIEW = 'Onsite Interview',
  OFFER_RECEIVED = 'Offer Received',
  OFFER_ACCEPTED = 'Offer Accepted',
  DECLINED = 'Declined',
  REJECTED = 'Rejected',
}

/** Resume source types */
export enum ResumeSource {
  UPLOAD = 'Upload',
  GOOGLE_DRIVE = 'Google Drive',
  GENERATED = 'Generated',
}

/** Professional roles for contacts */
export enum ContactRole {
  RECRUITER = 'Recruiter',
  HIRING_MANAGER = 'Hiring Manager',
  REFERRAL = 'Referral',
  OTHER = 'Other',
}

/** Communication channels */
export enum CommunicationChannel {
  EMAIL = 'Email',
  LINKEDIN = 'LinkedIn',
  PHONE = 'Phone',
  IN_PERSON = 'In-Person',
  OTHER = 'Other',
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  error?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** API error details */
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  timestamp: string;
}

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

/** User entity */
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

/** Job Application entity */
export interface JobApplication extends BaseEntity {
  company: string;
  jobTitle: string;
  jobDescription?: string;
  applicationDate: string;
  status: JobApplicationStatus;
  jobListingUrl?: string;
  notes?: string;
  isArchived: boolean;
  user: User;
  resume?: Resume;
  contactInteractions?: JobApplicationContact[];
}

/** Resume entity */
export interface Resume extends BaseEntity {
  versionName: string;
  fileName: string;
  fileUrl: string;
  source: ResumeSource;
  uploadDate: string;
  lastUsedDate?: string;
  applicationCount: number;
  isDefault: boolean;
  notes?: string;
  externalId?: string;
  user: User;
  jobApplications?: JobApplication[];
}

/** Contact entity */
export interface Contact extends BaseEntity {
  name: string;
  company?: string;
  role: ContactRole;
  email?: string;
  phoneNumber?: string;
  linkedInProfile?: string;
  interactions?: ContactInteraction[];
  lastInteractionDate?: string;
  user: User;
  applicationInteractions?: JobApplicationContact[];
}

/** Job Application Contact junction entity */
export interface JobApplicationContact extends BaseEntity {
  interactionType: string;
  notes?: string;
  interactionDate: string;
  jobApplication: JobApplication;
  contact: Contact;
}

/** Contact interaction */
export interface ContactInteraction {
  date: string;
  channel: CommunicationChannel;
  notes?: string;
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

/** Create Job Application request */
export interface CreateJobApplicationRequest {
  company: string;
  jobTitle: string;
  jobDescription?: string;
  applicationDate: string;
  status?: JobApplicationStatus;
  jobListingUrl?: string;
  notes?: string;
  resumeId?: string;
}

/** Update Job Application request */
export interface UpdateJobApplicationRequest {
  company?: string;
  jobTitle?: string;
  jobDescription?: string;
  applicationDate?: string;
  status?: JobApplicationStatus;
  jobListingUrl?: string;
  notes?: string;
  resumeId?: string;
  isArchived?: boolean;
}

/** Create Resume request */
export interface CreateResumeRequest {
  versionName: string;
  fileName: string;
  source?: ResumeSource;
  notes?: string;
  isDefault?: boolean;
}

/** Update Resume request */
export interface UpdateResumeRequest {
  versionName?: string;
  notes?: string;
  isDefault?: boolean;
}

/** Create Contact request */
export interface CreateContactRequest {
  name: string;
  company?: string;
  role?: ContactRole;
  email?: string;
  phoneNumber?: string;
  linkedInProfile?: string;
}

/** Update Contact request */
export interface UpdateContactRequest {
  name?: string;
  company?: string;
  role?: ContactRole;
  email?: string;
  phoneNumber?: string;
  linkedInProfile?: string;
}

/** Add Contact Interaction request */
export interface AddContactInteractionRequest {
  channel: CommunicationChannel;
  notes?: string;
  date?: string;
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

/** Base query parameters */
export interface BaseQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Job Application query parameters */
export interface JobApplicationQuery extends BaseQuery {
  company?: string;
  status?: JobApplicationStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeArchived?: boolean;
  resumeId?: string;
}

/** Resume query parameters */
export interface ResumeQuery extends BaseQuery {
  source?: ResumeSource;
  search?: string;
}

/** Contact query parameters */
export interface ContactQuery extends BaseQuery {
  company?: string;
  role?: ContactRole;
  search?: string;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

/** Date range filter */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/** Status distribution */
export interface StatusDistribution {
  status: JobApplicationStatus;
  count: number;
  percentage: number;
}

/** Pipeline analytics summary */
export interface PipelineAnalytics {
  statusDistribution: StatusDistribution[];
  totalApplications: number;
  activeApplications: number;
  recentActivityCount: number;
}

/** Resume performance metrics */
export interface ResumePerformanceMetrics {
  resumeId: string;
  versionName: string;
  usageCount: number;
  successRate: number;
  lastUsedDate?: string;
}

// ============================================================================
// UPLOAD INTERFACES
// ============================================================================

/** File upload response */
export interface FileUploadResponse {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** Resume upload request */
export interface ResumeUploadRequest {
  file: File;
  versionName: string;
  notes?: string;
  isDefault?: boolean;
}