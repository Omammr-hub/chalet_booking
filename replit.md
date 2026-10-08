# Cedar & Stone Chalet Booking System

Responsive chalet discovery and reservation management for guests and a small hospitality operations team.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the API contract.
- `lib/db/src/schema/` — PostgreSQL/Drizzle tables for admins, chalets, chalet images, and bookings.
- `artifacts/api-server/src/routes/` — public booking and admin API routes.
- `artifacts/api-server/src/lib/` — signed admin sessions, pricing/availability logic, and demo seed data.
- `artifacts/chalet-booking/src/App.tsx` — guest and admin application routes.
- `artifacts/chalet-booking/src/index.css` — Cedar & Stone theme tokens and motion styles.
- `database/chalet-booking-schema.sql` — MySQL 8+ reference schema.

## Architecture decisions

- The generated OpenAPI client is used by the React frontend; all server routes validate request and response shapes with generated Zod schemas.
- Bookings keep both timestamp values and date-only values so overlap checks preserve user times while calendar rendering remains timezone-safe.
- Accepted and Completed bookings are the only statuses that block availability; Pending requests remain reviewable until an admin accepts them.
- The browser uses a signed, HTTP-only session cookie for the explicitly requested local admin login flow.

## Product

- Public chalet discovery with responsive editorial presentation, image galleries, pricing, map location, and date-aware booking requests.
- Interactive availability calendar disables dates covered by accepted or completed stays.
- Booking requests are stored as Pending and protected by a server-side overlap check before they are saved.
- Admin login, dashboard revenue summary, chalet CRUD, booking status management, additional admin creation, and password changes.
- The MySQL reference schema requested in the original brief lives at `database/chalet-booking-schema.sql`; the runnable project uses the equivalent PostgreSQL/Drizzle schema.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.
- The web and API workflows supply `PORT` and routing metadata; run them through the managed workflows rather than starting root dev commands.
- The seeded demo admin is `admin@cedarstone.test` with password `welcome123`; change it before using the app for real operations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
