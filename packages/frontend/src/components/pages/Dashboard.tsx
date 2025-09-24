/**
 * Dashboard Page Component
 * Main landing page showing overview of job applications
 */

import React from 'react';

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Job Application Dashboard</h1>
        <p>Welcome to your job tracking system</p>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Applications</h3>
            <p className="stat-number">Loading...</p>
          </div>
          <div className="stat-card">
            <h3>Active Applications</h3>
            <p className="stat-number">Loading...</p>
          </div>
          <div className="stat-card">
            <h3>Interviews Scheduled</h3>
            <p className="stat-number">Loading...</p>
          </div>
          <div className="stat-card">
            <h3>Offers Received</h3>
            <p className="stat-number">Loading...</p>
          </div>
        </div>

        <div className="dashboard-sections">
          <section className="recent-activity">
            <h2>Recent Activity</h2>
            <p>Recent job applications and updates will appear here.</p>
          </section>

          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button className="action-btn primary">
                Add New Application
              </button>
              <button className="action-btn secondary">
                Upload Resume
              </button>
              <button className="action-btn secondary">
                View Analytics
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;