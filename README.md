# Job Tracker CRM

## Overview

Job Tracker is a comprehensive personal CRM application designed to help job seekers manage their job application process efficiently.

## Features (Planned)

- Job application tracking
- Resume version management
- Application status tracking
- Job search insights and analytics

## Prerequisites

- Node.js (v18+)
- npm or yarn

## Project Structure

```
job-tracker/
    packages/
        frontend/   # React TypeScript
        backend/    # Node.js TypeScript
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone [repository-url]
cd job-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

1. Copy `.env.example` to `.env`
2. Update environment variables as needed

### 4. Run Development Servers

```bash
# Start frontend
npm --prefix packages/frontend run dev

# Start backend
npm --prefix packages/backend run dev
```

## Development Scripts

- `npm run dev`: Run both frontend and backend in development mode
- `npm run build`: Build all packages
- `npm test`: Run tests across all packages
- `npm run lint`: Lint code across all packages

## Technologies

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: SQL-based (e.g., PostgreSQL)
- State Management: React Context/Zustand
- Testing: Vitest, React Testing Library

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[To be determined]
