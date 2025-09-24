/**
 * Main Application Component
 *
 * Configures React Router with nested routes for the job tracker application.
 * Implements a layout-based routing structure with protected routes and 404 handling.
 *
 * @returns The main app component with routing configured
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout and Pages
import Layout from '@/components/Layout';
import Dashboard from '@/components/pages/Dashboard';
import JobApplications from '@/components/pages/JobApplications';
import Resumes from '@/components/pages/Resumes';
import Contacts from '@/components/pages/Contacts';
import Analytics from '@/components/pages/Analytics';

// Global styles
import './App.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="applications" element={<JobApplications />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="not-found">
              <h1>404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
              <a href="/dashboard">Go to Dashboard</a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
