# HeritageVault — Museum & Cultural Heritage Management

A full-stack starter application using React + TypeScript, Node.js + Express, MongoDB, Redis, REST API, Docker, and Git.

## Features 
- Demo login page (email: `admin@heritagevault.com`, password: `Heritage@123`)
- Dashboard with artifact, exhibition, restoration and visitor totals
- Artifact catalog: add, view, search and delete artifacts
- Restoration log: record restoration activity
- Exhibition planner: create exhibitions
- Visitor analytics: record visitor counts and view totals
- MongoDB persistence; Redis health/status endpoint
- Docker Compose for MongoDB and Redis

## Requirements
Install **Node.js 20+**, **Docker Desktop**, and **Visual Studio Code**.

## Run from scratch in VS Code (Windows)
1. Extract this ZIP, then open the extracted `HeritageVault` folder in VS Code (**File → Open Folder**).
2. Open Terminal → New Terminal.
3. Start MongoDB and Redis:
   ```powershell
   docker compose up -d
   ```
4. Install dependencies:
   ```powershell
   npm install
   npm --prefix server install
   npm --prefix client install
   ```
5. Create `server/.env` by copying `server/.env.example` to `server/.env`. Default MongoDB settings work with Docker Compose:
   ```powershell
   Copy-Item server/.env.example server/.env
   ```
6. Start the app:
   ```powershell
   npm run dev
   ```
7. Open **http://localhost:5173**. API runs at **http://localhost:4000**.

## Useful commands
- `npm run dev` — run frontend and backend together
- `npm run build` — build both apps
- `docker compose ps` — check database containers
- `docker compose down` — stop database containers
- `docker compose down -v` — stop containers and **delete MongoDB data**

## API endpoints
- `GET /api/health`
- `GET /api/dashboard`
- `GET/POST/DELETE /api/artifacts`
- `GET/POST /api/restorations`
- `GET/POST /api/exhibitions`
- `GET/POST /api/visitors`

## Notes
This is a functional starter/demo, not a production deployment. Login is front-end demo validation only; it does not authenticate against the server. Add server-side authentication, authorization, password hashing, audit logs, file storage, validation, backups, and security hardening before real museum use. Artifact images are represented by optional image URLs.
