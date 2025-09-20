import { http, HttpResponse } from 'msw';

// Define handlers for API mocking
export const handlers = [
  // Example API handler - replace with your actual API endpoints
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Add more API handlers as needed
  // http.get('/api/users', () => {
  //   return HttpResponse.json([
  //     { id: 1, name: 'John Doe' },
  //     { id: 2, name: 'Jane Smith' },
  //   ]);
  // }),

  // http.post('/api/login', async ({ request }) => {
  //   const { username, password } = await request.json();
  //
  //   if (username === 'user' && password === 'password') {
  //     return HttpResponse.json({ token: 'fake-jwt-token' });
  //   }
  //
  //   return new HttpResponse(null, { status: 401 });
  // }),
];