# LMS Backend (Strapi)

This repository contains the backend for the Learning Management System, built with Strapi and utilizing a SQLite database by default for local development.

## Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 6.x or higher

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the Backend**:
   - The Strapi admin panel is available at: [http://localhost:1337/admin](http://localhost:1337/admin)
   - The API is available at: [http://localhost:1337/api](http://localhost:1337/api)
   
   *Note: On your first run, Strapi will prompt you to create an admin user account to access the dashboard.*

## Troubleshooting

- **Port Conflicts**: If port `1337` is already in use, the development server will fail to start. You can close the conflicting applications or specify different ports in your configuration.
- **Node Version**: If you encounter dependency issues or build failures, ensure your Node.js version meets the engine requirements (`>= 20.0.0`).
