# Cedar & Stone Chalet Booking System

A complete source workspace for a chalet discovery and booking app, including the React web app, Express API, PostgreSQL/Drizzle database package, generated API client, seed data, and MySQL reference schema.

## Features

- Public chalet listings and detail pages, photo galleries, pricing, and OpenStreetMap location maps.
- Date-range calendar that disables unavailable nights and sends booking requests to the server.
- Server-side protection against overlapping accepted/completed stays.
- Admin login, chalet management, booking status management, dashboard revenue totals, and admin management.

## Run locally

### Requirements

- Node.js 20 or newer (the project was built and checked with Node.js 24).
- pnpm 10 or newer. With Node.js installed, enable Corepack using `corepack enable`, then check `pnpm --version`.
- PostgreSQL 15 or newer.

### 1. Install packages

Open a terminal in the project folder:

```sh
pnpm install
```

### 2. Create a PostgreSQL database

Create an empty database named `chalet_booking`. For example, using `psql`:

```sql
CREATE DATABASE chalet_booking;
```

The runtime app uses PostgreSQL. The requested MySQL 8+ equivalent is included separately at `database/chalet-booking-schema.sql` for reference; do not run that MySQL file against PostgreSQL.

### 3. Create the app tables

Set the database connection string in the terminal where you run the command, then push the Drizzle schema:

**macOS / Linux**

```sh
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/chalet_booking'
pnpm --filter @workspace/db run push
```

**Windows PowerShell**

```powershell
$env:DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/chalet_booking'
pnpm --filter @workspace/db run push
```

Replace `YOUR_PASSWORD` with the password for your local PostgreSQL user. If the password contains URL-reserved characters, URL-encode them in the connection string.

### 4. Start the API

Open a second terminal in the project folder. Set the same database URL and a private session-signing value:

**macOS / Linux**

```sh
export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/chalet_booking'
export SESSION_SECRET='replace-with-a-long-random-value'
export PORT=5000
pnpm --filter @workspace/api-server run dev
```

**Windows PowerShell**

```powershell
$env:DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/chalet_booking'
$env:SESSION_SECRET = 'replace-with-a-long-random-value'
$env:PORT = '5000'
pnpm --filter @workspace/api-server run dev
```

On first start, the API creates a demo administrator and three demo chalets. Demo login:

- Email: `admin@cedarstone.test`
- Password: `welcome123`

Change the demo password and use a unique session value before using this app beyond local testing.

### 5. Start the web app

Open a third terminal in the project folder:

**macOS / Linux**

```sh
export PORT=5173
export BASE_PATH=/
export API_PROXY_TARGET='http://127.0.0.1:5000'
pnpm --filter @workspace/chalet-booking run dev
```

**Windows PowerShell**

```powershell
$env:PORT = '5173'
$env:BASE_PATH = '/'
$env:API_PROXY_TARGET = 'http://127.0.0.1:5000'
pnpm --filter @workspace/chalet-booking run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Keep both API and web terminals running. The Vite development server forwards `/api` requests to the API on port 5000.

## Project map

- `artifacts/chalet-booking/` — React, Vite, and Tailwind frontend.
- `artifacts/api-server/` — Express API and demo seed data.
- `lib/api-spec/openapi.yaml` — OpenAPI contract used to generate API types.
- `lib/api-client-react/` — generated React Query API hooks.
- `lib/api-zod/` — generated request and response validators.
- `lib/db/src/schema/` — PostgreSQL/Drizzle database schema.
- `database/chalet-booking-schema.sql` — MySQL 8+ reference schema.
- `database/README.md` — database setup and schema notes.

After changing the OpenAPI file, regenerate the typed client and validators:

```sh
pnpm --filter @workspace/api-spec run codegen
```

## Notes

- Chalet images in the demo are remote Unsplash URLs; the map uses OpenStreetMap. A network connection is needed to display them.
- Do not commit local database passwords or production signing secrets.
- For deployment, set `DATABASE_URL` and `SESSION_SECRET` in the hosting provider's secret manager.
