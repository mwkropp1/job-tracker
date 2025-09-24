/**
 * Contacts Page Component
 * Manages professional networking contacts
 */

import React from 'react';

export const Contacts: React.FC = () => {
  return (
    <div className="contacts">
      <header className="page-header">
        <h1>Professional Contacts</h1>
        <button className="btn-primary">Add Contact</button>
      </header>

      <div className="page-content">
        <div className="contacts-overview">
          <div className="overview-stats">
            <div className="stat-item">
              <span className="stat-label">Total Contacts</span>
              <span className="stat-value">Loading...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Recruiters</span>
              <span className="stat-value">Loading...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Referrals</span>
              <span className="stat-value">Loading...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Recent Interactions</span>
              <span className="stat-value">Loading...</span>
            </div>
          </div>
        </div>

        <div className="contacts-list">
          <div className="list-header">
            <div className="list-controls">
              <input
                type="text"
                placeholder="Search contacts..."
                className="search-input"
              />
              <select className="filter-select">
                <option value="">All Roles</option>
                <option value="Recruiter">Recruiter</option>
                <option value="Hiring Manager">Hiring Manager</option>
                <option value="Referral">Referral</option>
                <option value="Other">Other</option>
              </select>
              <select className="filter-select">
                <option value="">All Companies</option>
              </select>
            </div>
          </div>

          <div className="contacts-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Last Interaction</th>
                  <th>Applications</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="loading-row">
                    Loading contacts...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;