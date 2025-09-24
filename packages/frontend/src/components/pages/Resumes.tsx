/**
 * Resumes Page Component
 * Manages resume uploads and versions
 */

import React from 'react';

export const Resumes: React.FC = () => {
  return (
    <div className="resumes">
      <header className="page-header">
        <h1>Resume Management</h1>
        <button className="btn-primary">Upload Resume</button>
      </header>

      <div className="page-content">
        <div className="resumes-overview">
          <div className="overview-stats">
            <div className="stat-item">
              <span className="stat-label">Total Resumes</span>
              <span className="stat-value">Loading...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Default Resume</span>
              <span className="stat-value">Loading...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Most Used</span>
              <span className="stat-value">Loading...</span>
            </div>
          </div>
        </div>

        <div className="resumes-list">
          <div className="list-header">
            <h2>Your Resumes</h2>
            <div className="list-controls">
              <input
                type="text"
                placeholder="Search resume versions..."
                className="search-input"
              />
              <select className="filter-select">
                <option value="">All Sources</option>
                <option value="Upload">Upload</option>
                <option value="Google Drive">Google Drive</option>
                <option value="Generated">Generated</option>
              </select>
            </div>
          </div>

          <div className="resumes-grid">
            <div className="resume-card loading">
              <div className="card-content">
                <h3>Loading resumes...</h3>
                <p>Please wait while we fetch your resume library.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resumes;