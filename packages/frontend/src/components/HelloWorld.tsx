import { useQuery } from '@tanstack/react-query';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { apiService } from '@/services/api';
import { setMessage, toggleTheme, clearMessage } from '@/store/slices/uiSlice';

/**
 * HelloWorld Demo Component
 *
 * Demonstrates the integration of key frontend technologies including:
 * - Redux Toolkit for client state management
 * - React Query for server state and data fetching
 * - TypeScript strict typing
 * - Theme switching functionality
 *
 * This component serves as a proof-of-concept and setup verification tool
 * for the job tracker application's technical stack.
 *
 * @returns JSX element demonstrating RTK + React Query integration
 */
export const HelloWorld = () => {
  const dispatch = useAppDispatch();
  const { message, theme } = useAppSelector(state => state.ui);

  const {
    data: welcomeData,
    isLoading: isWelcomeLoading,
    error: welcomeError,
  } = useQuery({
    queryKey: ['welcome'],
    queryFn: apiService.getWelcomeMessage,
  });

  const {
    data: userData,
    isLoading: isUserLoading,
    error: userError,
  } = useQuery({
    queryKey: ['user'],
    queryFn: apiService.getUser,
  });

  const handleSetMessage = () => {
    dispatch(setMessage('Hello from Redux Toolkit! 👋'));
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleClearMessage = () => {
    dispatch(clearMessage());
  };

  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    minHeight: '100vh',
    padding: '2rem',
    fontFamily: 'system-ui, sans-serif',
  };

  const buttonStyles = {
    padding: '0.5rem 1rem',
    margin: '0.5rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: theme === 'dark' ? '#0066cc' : '#007acc',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  };

  return (
    <div style={themeStyles}>
      <header>
        <h1>🚀 Job Tracker - Hello World</h1>
        <p>RTK + React Query + TypeScript + Vite Demo</p>
      </header>

      <main>
        <section style={{ marginBottom: '2rem' }}>
          <h2>🔄 React Query Demo (Server State)</h2>

          <div style={{ marginBottom: '1rem' }}>
            <h3>Welcome Message:</h3>
            {isWelcomeLoading && <p>Loading welcome message...</p>}
            {welcomeError && <p style={{ color: 'red' }}>Error loading welcome message</p>}
            {welcomeData && (
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {welcomeData.data}
              </p>
            )}
          </div>

          <div>
            <h3>User Data:</h3>
            {isUserLoading && <p>Loading user data...</p>}
            {userError && <p style={{ color: 'red' }}>Error loading user data</p>}
            {userData && (
              <div>
                <p><strong>Name:</strong> {userData.data.name}</p>
                <p><strong>Email:</strong> {userData.data.email}</p>
                <p><strong>ID:</strong> {userData.data.id}</p>
              </div>
            )}
          </div>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>⚡ Redux Toolkit Demo (Client State)</h2>

          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Current Theme:</strong> {theme}</p>
            <button onClick={handleToggleTheme} style={buttonStyles}>
              Toggle Theme ({theme === 'light' ? 'Switch to Dark' : 'Switch to Light'})
            </button>
          </div>

          <div>
            <p><strong>Current Message:</strong> {message || 'No message set'}</p>
            <button onClick={handleSetMessage} style={buttonStyles}>
              Set Redux Message
            </button>
            <button onClick={handleClearMessage} style={buttonStyles}>
              Clear Message
            </button>
          </div>
        </section>

        <section>
          <h2>✅ Setup Verification</h2>
          <ul style={{ lineHeight: '1.6' }}>
            <li>✅ React 18.3.1 + TypeScript</li>
            <li>✅ Vite with path aliases (@/)</li>
            <li>✅ Redux Toolkit for client state</li>
            <li>✅ React Query for server state</li>
            <li>✅ ESLint + Prettier configuration</li>
            <li>✅ Vitest + React Testing Library</li>
            <li>✅ MSW for API mocking</li>
            <li>✅ Strict TypeScript settings</li>
          </ul>
        </section>
      </main>

      <footer style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ccc' }}>
        <p><em>Job Tracker MVP - Commit 1: Scaffolding Complete! 🎉</em></p>
      </footer>
    </div>
  );
};