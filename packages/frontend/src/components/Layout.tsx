/**
 * Layout Component
 * Provides navigation and common layout structure
 */

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand">
          <h1>Job Tracker</h1>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/applications"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Applications
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/resumes"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Resumes
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contacts"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Contacts
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/analytics"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Analytics
            </NavLink>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;