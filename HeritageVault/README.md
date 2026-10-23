# HeritageVault — Museum & Cultural Heritage Management

A full-stack museum and cultural heritage management application using React + TypeScript, Node.js + Express, MongoDB with Mongoose, Redis, REST API, Docker, and Git.

## Features
- Demo login page (frontend-only; not production authentication)
- Dashboard with artifact, exhibition, restoration and visitor totals
- Artifact catalog: add, view, search and delete artifacts
- Restoration log: record restoration activity
- Exhibition planner: create exhibitions
- Visitor analytics: record visitor counts and view totals
- MongoDB persistence through Mongoose; Redis health/status endpoint
- Docker Compose for MongoDB and Redis

## Requirements
Install Node.js 20+, Docker Desktop, and Visual Studio Code.

## Run from scratch in VS Code (Windows)
1. Extract this ZIP, then open the extracted `HeritageVault` folder in VS Code (File → Open Folder).
2. Start Docker Desktop and wait until it is running.
3. Open Terminal → New Terminal in VS Code and run:
   ```powershell
   docker compose up -d
   ```
   This starts MongoDB on port 27017 and Redis on port 6379.
4. Install dependencies:
   ```powershell
   npm install
   npm --prefix server install
   npm --prefix client install
   ```
5. Create `server/.env` from the example file:
   ```powershell
   Copy-Item server/.env.example server/.env
   ```
6. Start the app:
   ```powershell
   npm run dev
   ```
7. Open http://localhost:5173. The API runs at http://localhost:4000.

The server connects to MongoDB and automatically creates collections when records are first inserted.

## Demo login
- Email: `admin@heritagevault.com`
- Password: `Heritage@123`

The login is frontend-only demo behavior and is not secure authentication.

## Useful commands
- `npm run dev` — run frontend and backend together
- `npm run build` — build both apps
- `docker compose ps` — check database containers
- `docker compose stop` — stop database containers
- `docker compose down` — stop containers while preserving database data
- `docker compose down -v` — stop containers and delete MongoDB data

## API endpoints
- `GET /api/health`
- `GET /api/dashboard`
- `GET/POST/DELETE /api/artifacts`
- `GET/POST /api/restorations`
- `GET/POST /api/exhibitions`
- `GET/POST /api/visitors`

## Notes
This is a functional starter/demo, not a production deployment. Add server-side authentication, authorization, audit logs, file storage, validation, backups, and security hardening before real museum use. Artifact images are represented by optional image URLs.
