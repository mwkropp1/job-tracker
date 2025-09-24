/**
 * Job Applications Page Component
 * Lists and manages all job applications
 */

import React from 'react';

export const JobApplications: React.FC = () => {
  return (
    <div className="job-applications">
      <header className="page-header">
        <h1>Job Applications</h1>
        <button className="btn-primary">Add Application</button>
      </header>

      <div className="page-content">
        <div className="filters-section">
          <div className="filter-controls">
            <input
              type="text"
              placeholder="Search companies, job titles..."
              className="search-input"
            />
            <select className="filter-select">
              <option value="">All Statuses</option>
              <option value="Applied">Applied</option>
              <option value="Phone Screen">Phone Screen</option>
              <option value="Technical Interview">Technical Interview</option>
              <option value="Onsite Interview">Onsite Interview</option>
              <option value="Offer Received">Offer Received</option>
              <option value="Offer Accepted">Offer Accepted</option>
              <option value="Declined">Declined</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select className="filter-select">
              <option value="">All Companies</option>
            </select>
          </div>
        </div>

        <div className="applications-list">
          <div className="list-header">
            <div className="list-controls">
              <span className="results-count">Loading applications...</span>
              <div className="view-controls">
                <button className="view-btn active">Table</button>
                <button className="view-btn">Cards</button>
              </div>
            </div>
          </div>

          <div className="applications-table">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Application Date</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="loading-row">
                    Loading job applications...
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

export default JobApplications;