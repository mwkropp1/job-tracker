/**
 * Mock data factories for consistent test data generation
 * Following TDD principles, these define the expected data shapes
 */

export interface MockJobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  applicationDate: string;
  notes?: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  contacts?: MockContact[];
}

export interface MockContact {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  linkedInUrl?: string;
  notes?: string;
}

export interface MockResume {
  id: string;
  name: string;
  filePath: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

/**
 * Factory function to create mock job applications
 */
export function createMockJobApplication(
  overrides: Partial<MockJobApplication> = {}
): MockJobApplication {
  return {
    id: 'job-app-1',
    companyName: 'Tech Corp',
    jobTitle: 'Senior Software Engineer',
    status: 'applied',
    applicationDate: '2024-01-15T00:00:00.000Z',
    notes: 'Interesting role with React and TypeScript',
    salary: {
      min: 120000,
      max: 150000,
      currency: 'USD',
    },
    contacts: [],
    ...overrides,
  };
}

/**
 * Factory function to create mock contacts
 */
export function createMockContact(
  overrides: Partial<MockContact> = {}
): MockContact {
  return {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john.doe@techcorp.com',
    role: 'Engineering Manager',
    company: 'Tech Corp',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    notes: 'Very responsive and helpful',
    ...overrides,
  };
}

/**
 * Factory function to create mock resumes
 */
export function createMockResume(
  overrides: Partial<MockResume> = {}
): MockResume {
  return {
    id: 'resume-1',
    name: 'Software Engineer Resume',
    filePath: '/uploads/resumes/resume-v1.pdf',
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDefault: true,
    ...overrides,
  };
}

/**
 * Create multiple mock job applications
 */
export function createMockJobApplications(count: number = 3): MockJobApplication[] {
  return Array.from({ length: count }, (_, index) =>
    createMockJobApplication({
      id: `job-app-${index + 1}`,
      companyName: `Company ${index + 1}`,
      jobTitle: `Position ${index + 1}`,
      status: (['applied', 'interviewing', 'offered', 'rejected'] as const)[
        index % 4
      ] as 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn',
    })
  );
}

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  // Success responses
  getJobApplications: {
    data: createMockJobApplications(5),
    total: 5,
    page: 1,
    limit: 10,
  },

  createJobApplication: createMockJobApplication(),

  updateJobApplication: createMockJobApplication({
    status: 'interviewing',
    notes: 'Updated after phone screening',
  }),

  // Error responses
  notFound: {
    error: 'Not Found',
    message: 'Job application not found',
    statusCode: 404,
  },

  validationError: {
    error: 'Validation Error',
    message: 'Invalid input data',
    statusCode: 400,
    details: [
      { field: 'companyName', message: 'Company name is required' },
      { field: 'jobTitle', message: 'Job title is required' },
    ],
  },

  serverError: {
    error: 'Internal Server Error',
    message: 'Something went wrong',
    statusCode: 500,
  },
};

/**
 * Mock form data for testing form submissions
 */
export const mockFormData = {
  createJobApplication: {
    companyName: 'New Tech Company',
    jobTitle: 'Full Stack Developer',
    status: 'applied' as const,
    applicationDate: '2024-01-20',
    notes: 'Exciting opportunity with modern tech stack',
    salary: {
      min: 100000,
      max: 130000,
      currency: 'USD',
    },
  },

  updateJobApplication: {
    status: 'interviewing' as const,
    notes: 'Phone screening completed, moving to technical round',
  },

  createContact: {
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'Senior Developer',
    company: 'New Tech Company',
    linkedInUrl: 'https://linkedin.com/in/janesmith',
  },
};

/**
 * Utility to deep clone mock data to avoid mutation in tests
 */
export function cloneMockData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}