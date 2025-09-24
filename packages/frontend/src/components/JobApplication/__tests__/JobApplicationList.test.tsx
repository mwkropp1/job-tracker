/**
 * JobApplicationList Component tests following TDD principles
 * These tests define the expected behavior of the component
 * WRITE THESE TESTS BEFORE IMPLEMENTING THE COMPONENT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../__tests__/utils/renderWithProviders';
import { server, overrideHandlers } from '../../../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';
import { createMockJobApplications } from '../../../../__tests__/utils/mockData';

// Import the component that we will implement
// NOTE: This import will fail initially - that's expected in TDD!
// import { JobApplicationList } from '../JobApplicationList';

describe.skip('JobApplicationList Component', () => {
  const API_BASE_URL = 'http://localhost:3001/api';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Rendering and Layout', () => {
    it('should render loading state initially', () => {
      // Delay the response to test loading state
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // Should show loading indicator
      // expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      // expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render job applications list when data is loaded', async () => {
      const mockApplications = createMockJobApplications(3);

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: mockApplications,
            total: 3,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // Wait for data to load
      // await waitFor(() => {
      //   expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      // });

      // Should render all job applications
      // mockApplications.forEach(app => {
      //   expect(screen.getByText(app.companyName)).toBeInTheDocument();
      //   expect(screen.getByText(app.jobTitle)).toBeInTheDocument();
      // });
    });

    it('should render empty state when no job applications exist', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      //   expect(screen.getByText(/no job applications found/i)).toBeInTheDocument();
      // });
    });

    it('should render error state when API call fails', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Database connection failed',
            statusCode: 500
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByTestId('error-state')).toBeInTheDocument();
      //   expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      //   expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      // });
    });
  });

  describe('Job Application Items', () => {
    it('should display essential information for each job application', async () => {
      const mockApplication = createMockJobApplications(1)[0];

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: [mockApplication],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   // Company name and job title
      //   expect(screen.getByText(mockApplication.companyName)).toBeInTheDocument();
      //   expect(screen.getByText(mockApplication.jobTitle)).toBeInTheDocument();

      //   // Status badge
      //   expect(screen.getByTestId(`status-${mockApplication.status}`)).toBeInTheDocument();

      //   // Application date
      //   expect(screen.getByText(
      //     new Date(mockApplication.applicationDate).toLocaleDateString()
      //   )).toBeInTheDocument();

      //   // Salary if provided
      //   if (mockApplication.salary) {
      //     expect(screen.getByText(/\$120,000 - \$150,000/)).toBeInTheDocument();
      //   }
      // });
    });

    it('should show status badges with appropriate styling', async () => {
      const statuses = ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn'] as const;
      const mockApplications = statuses.map((status, index) =>
        createMockJobApplications(1)[0] = { ...createMockJobApplications(1)[0], id: `app-${index}`, status }
      );

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: mockApplications,
            total: mockApplications.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   statuses.forEach(status => {
      //     const statusBadge = screen.getByTestId(`status-${status}`);
      //     expect(statusBadge).toBeInTheDocument();

      //     // Check for appropriate CSS classes based on status
      //     switch (status) {
      //       case 'applied':
      //         expect(statusBadge).toHaveClass('status-applied');
      //         break;
      //       case 'interviewing':
      //         expect(statusBadge).toHaveClass('status-interviewing');
      //         break;
      //       case 'offered':
      //         expect(statusBadge).toHaveClass('status-offered');
      //         break;
      //       case 'rejected':
      //         expect(statusBadge).toHaveClass('status-rejected');
      //         break;
      //       case 'withdrawn':
      //         expect(statusBadge).toHaveClass('status-withdrawn');
      //         break;
      //     }
      //   });
      // });
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockApplication = {
        id: 'app-1',
        companyName: 'Test Company',
        jobTitle: 'Test Position',
        status: 'applied' as const,
        applicationDate: '2024-01-15T00:00:00.000Z',
        // No salary, notes, or contacts
      };

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: [mockApplication],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByText(mockApplication.companyName)).toBeInTheDocument();
      //   expect(screen.getByText(mockApplication.jobTitle)).toBeInTheDocument();
      //   // Should not crash when optional fields are missing
      //   expect(screen.queryByText('$')).not.toBeInTheDocument(); // No salary
      // });
    });
  });

  describe('Filtering and Search', () => {
    it('should render filter controls', async () => {
      // renderWithProviders(<JobApplicationList />);

      // Should have status filter dropdown
      // expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();

      // Should have search input
      // expect(screen.getByPlaceholderText(/search job applications/i)).toBeInTheDocument();
    });

    it('should filter by status when status filter is changed', async () => {
      const user = userEvent.setup();
      let capturedParams: URLSearchParams | undefined;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedParams = new URL(request.url).searchParams;
          return HttpResponse.json({
            data: createMockJobApplications(2).map(app => ({ ...app, status: 'interviewing' })),
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // Wait for initial load
      // await waitFor(() => {
      //   expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      // });

      // Change status filter
      // const statusFilter = screen.getByLabelText(/filter by status/i);
      // await user.selectOptions(statusFilter, 'interviewing');

      // await waitFor(() => {
      //   expect(capturedParams?.get('status')).toBe('interviewing');
      // });
    });

    it('should search when search input changes', async () => {
      const user = userEvent.setup();
      let capturedParams: URLSearchParams | undefined;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedParams = new URL(request.url).searchParams;
          return HttpResponse.json({
            data: createMockJobApplications(1),
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // const searchInput = screen.getByPlaceholderText(/search job applications/i);
      // await user.type(searchInput, 'Tech Corp');

      // Should debounce the search
      // await waitFor(() => {
      //   expect(capturedParams?.get('search')).toBe('Tech Corp');
      // }, { timeout: 1000 });
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();

      // renderWithProviders(<JobApplicationList />);

      // Set some filters first
      // const statusFilter = screen.getByLabelText(/filter by status/i);
      // await user.selectOptions(statusFilter, 'interviewing');

      // const searchInput = screen.getByPlaceholderText(/search job applications/i);
      // await user.type(searchInput, 'test search');

      // Click clear filters button
      // const clearButton = screen.getByRole('button', { name: /clear filters/i });
      // await user.click(clearButton);

      // Filters should be reset
      // expect(statusFilter).toHaveValue('');
      // expect(searchInput).toHaveValue('');
    });
  });

  describe('Pagination', () => {
    it('should render pagination controls when there are multiple pages', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: createMockJobApplications(10),
            total: 25,
            page: 1,
            limit: 10,
            totalPages: 3,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByTestId('pagination')).toBeInTheDocument();
      //   expect(screen.getByText('1')).toBeInTheDocument(); // Current page
      //   expect(screen.getByText('3')).toBeInTheDocument(); // Total pages
      //   expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      // });
    });

    it('should not render pagination when all items fit on one page', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
      // });
    });

    it('should navigate to different pages when pagination is clicked', async () => {
      const user = userEvent.setup();
      let capturedParams: URLSearchParams | undefined;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedParams = new URL(request.url).searchParams;
          const page = parseInt(capturedParams.get('page') || '1');

          return HttpResponse.json({
            data: createMockJobApplications(10),
            total: 25,
            page,
            limit: 10,
            totalPages: 3,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByTestId('pagination')).toBeInTheDocument();
      // });

      // Click next page
      // const nextButton = screen.getByRole('button', { name: /next page/i });
      // await user.click(nextButton);

      // await waitFor(() => {
      //   expect(capturedParams?.get('page')).toBe('2');
      // });
    });
  });

  describe('Actions and Interactions', () => {
    it('should navigate to job application detail when item is clicked', async () => {
      const user = userEvent.setup();
      const mockApplication = createMockJobApplications(1)[0];

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: [mockApplication],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByText(mockApplication.companyName)).toBeInTheDocument();
      // });

      // Click on the job application item
      // const applicationItem = screen.getByTestId(`job-application-${mockApplication.id}`);
      // await user.click(applicationItem);

      // Should navigate to detail page (check with router mock)
      // expect(mockNavigate).toHaveBeenCalledWith(`/job-applications/${mockApplication.id}`);
    });

    it('should show action menu for each job application', async () => {
      const user = userEvent.setup();
      const mockApplication = createMockJobApplications(1)[0];

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.json({
            data: [mockApplication],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByText(mockApplication.companyName)).toBeInTheDocument();
      // });

      // Click action menu button
      // const actionMenuButton = screen.getByTestId(`action-menu-${mockApplication.id}`);
      // await user.click(actionMenuButton);

      // Should show action menu items
      // expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      // expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('should handle refresh action', async () => {
      const user = userEvent.setup();
      let requestCount = 0;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          requestCount++;
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderWithProviders(<JobApplicationList />);

      // Wait for initial load
      // await waitFor(() => {
      //   expect(requestCount).toBe(1);
      // });

      // Click refresh button
      // const refreshButton = screen.getByRole('button', { name: /refresh/i });
      // await user.click(refreshButton);

      // Should trigger another API call
      // await waitFor(() => {
      //   expect(requestCount).toBe(2);
      // });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   // Main list should have appropriate role
      //   expect(screen.getByRole('list')).toBeInTheDocument();

      //   // Filter controls should be labeled
      //   expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
      //   expect(screen.getByLabelText(/search job applications/i)).toBeInTheDocument();
      // });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      // renderWithProviders(<JobApplicationList />);

      // await waitFor(() => {
      //   expect(screen.getByRole('list')).toBeInTheDocument();
      // });

      // Tab navigation should work
      // await user.tab();
      // expect(document.activeElement).toHaveAttribute('role', 'listitem');

      // Enter key should activate items
      // await user.keyboard('{Enter}');
      // Should trigger appropriate action
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when data does not change', async () => {
      const renderSpy = vi.fn();

      // Mock component that tracks renders
      // const TestWrapper = () => {
      //   renderSpy();
      //   return <JobApplicationList />;
      // };

      // renderWithProviders(<TestWrapper />);

      // await waitFor(() => {
      //   expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      // });

      // const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger some action that shouldn't cause re-render
      // fireEvent.focus(screen.getByPlaceholderText(/search/i));

      // Should not have additional renders
      // expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
    });
  });
});

/**
 * TODO: Implement the JobApplicationList component in src/components/JobApplication/JobApplicationList.tsx
 *
 * Requirements based on these tests:
 * 1. Display loading state while fetching data
 * 2. Render list of job applications with essential information
 * 3. Show empty state when no applications exist
 * 4. Handle and display error states with retry functionality
 * 5. Implement status filtering and search functionality
 * 6. Add pagination controls for large datasets
 * 7. Support navigation to detail pages
 * 8. Include action menus for each item (edit, delete)
 * 9. Implement refresh functionality
 * 10. Ensure accessibility with proper ARIA labels and keyboard navigation
 * 11. Use the useJobApplications hook for data fetching
 * 12. Implement proper TypeScript interfaces
 *
 * Component should accept optional props for customization:
 * ```typescript
 * interface JobApplicationListProps {
 *   onSelect?: (application: JobApplication) => void;
 *   showFilters?: boolean;
 *   compact?: boolean;
 * }
 * ```
 *
 * Once implemented, remove the .skip from the describe block above
 */