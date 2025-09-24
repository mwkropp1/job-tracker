import { http, HttpResponse } from 'msw';
import {
  mockApiResponses,
  createMockJobApplication,
  createMockJobApplications,
  createMockContact,
  createMockResume,
} from '../utils/mockData';

// API base URL - adjust to match your backend configuration
const API_BASE_URL = process.env['VITE_API_URL'] || 'http://localhost:3001/api';

/**
 * MSW handlers for API mocking in tests
 * These handlers simulate the backend API responses
 */
export const handlers = [
  // Health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Job Applications endpoints
  http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let applications = createMockJobApplications(15); // Create more for pagination

    // Apply filters
    if (status) {
      applications = applications.filter(app => app.status === status);
    }

    if (search) {
      applications = applications.filter(
        app =>
          app.companyName.toLowerCase().includes(search.toLowerCase()) ||
          app.jobTitle.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = applications.slice(startIndex, endIndex);

    return HttpResponse.json({
      data: paginatedData,
      total: applications.length,
      page,
      limit,
      totalPages: Math.ceil(applications.length / limit),
    });
  }),

  http.get(`${API_BASE_URL}/job-applications/:id`, ({ params }) => {
    const { id } = params;

    if (id === 'non-existent') {
      return new HttpResponse(null, {
        status: 404,
        statusText: JSON.stringify(mockApiResponses.notFound)
      });
    }

    return HttpResponse.json(createMockJobApplication({ id: id as string }));
  }),

  http.post(`${API_BASE_URL}/job-applications`, async ({ request }) => {
    const body = await request.json();

    // Simulate validation errors
    if (!body || typeof body !== 'object') {
      return new HttpResponse(JSON.stringify(mockApiResponses.validationError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newApplication = createMockJobApplication({
      id: `job-app-${Date.now()}`,
      ...(body as Record<string, any>),
    });

    return new HttpResponse(JSON.stringify(newApplication), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  http.put(`${API_BASE_URL}/job-applications/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();

    if (id === 'non-existent') {
      return new HttpResponse(JSON.stringify(mockApiResponses.notFound), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedApplication = createMockJobApplication({
      id: id as string,
      ...(body as Record<string, any>),
    });

    return HttpResponse.json(updatedApplication);
  }),

  http.delete(`${API_BASE_URL}/job-applications/:id`, ({ params }) => {
    const { id } = params;

    if (id === 'non-existent') {
      return new HttpResponse(JSON.stringify(mockApiResponses.notFound), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Contacts endpoints
  http.get(`${API_BASE_URL}/contacts`, ({ request }) => {
    const url = new URL(request.url);
    const jobApplicationId = url.searchParams.get('jobApplicationId');

    const contacts = Array.from({ length: 3 }, (_, index) =>
      createMockContact({
        id: `contact-${index + 1}`,
        company: jobApplicationId ? 'Tech Corp' : `Company ${index + 1}`,
      })
    );

    return HttpResponse.json({
      data: contacts,
      total: contacts.length,
    });
  }),

  http.post(`${API_BASE_URL}/contacts`, async ({ request }) => {
    const body = await request.json();

    const newContact = createMockContact({
      id: `contact-${Date.now()}`,
      ...(body as Record<string, any>),
    });

    return new HttpResponse(JSON.stringify(newContact), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  // Resumes endpoints
  http.get(`${API_BASE_URL}/resumes`, () => {
    const resumes = Array.from({ length: 3 }, (_, index) =>
      createMockResume({
        id: `resume-${index + 1}`,
        name: `Resume v${index + 1}`,
        version: index + 1,
        isDefault: index === 0,
      })
    );

    return HttpResponse.json({
      data: resumes,
      total: resumes.length,
    });
  }),

  http.post(`${API_BASE_URL}/resumes`, async ({ request }) => {
    // Simulate file upload
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return new HttpResponse(JSON.stringify({
        error: 'Validation Error',
        message: 'Resume file is required',
        statusCode: 400,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newResume = createMockResume({
      id: `resume-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      filePath: `/uploads/resumes/${file.name}`,
    });

    return new HttpResponse(JSON.stringify(newResume), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  // Authentication endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };

    // Simulate authentication
    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'fake-jwt-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      });
    }

    return new HttpResponse(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid credentials',
      statusCode: 401,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      token: 'fake-jwt-token',
      user: {
        id: `user-${Date.now()}`,
        ...(body as Record<string, any>),
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Error simulation handlers (for testing error scenarios)
  http.get(`${API_BASE_URL}/error/500`, () => {
    return new HttpResponse(JSON.stringify(mockApiResponses.serverError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }),

  http.get(`${API_BASE_URL}/error/network`, () => {
    // Simulate network error
    return HttpResponse.error();
  }),

  // Delayed response handler (for testing loading states)
  http.get(`${API_BASE_URL}/slow-endpoint`, async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return HttpResponse.json({ message: 'Slow response' });
  }),
];