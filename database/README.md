# Database setup

## Local app database (PostgreSQL)

The runnable app uses PostgreSQL through Drizzle ORM.

1. Install PostgreSQL 15 or newer and start the database service.
2. Create an empty database named `chalet_booking`.
3. From the project root, set `DATABASE_URL` to a PostgreSQL connection string.
4. Run `pnpm --filter @workspace/db run push` to create or update tables from `lib/db/src/schema/`.
5. Start the API. Its startup routine inserts the demo admin and chalet rows when the database is empty.

Example database URL:

```text
postgresql://postgres:YOUR_PASSWORD@localhost:5432/chalet_booking
```

See the root `README.md` for shell commands for Windows, macOS, and Linux.

## MySQL reference schema

`chalet-booking-schema.sql` is the MySQL 8+ schema requested in the original brief. It documents the equivalent tables and booking-overlap index for a MySQL/PHP deployment. It is not the schema used by this runnable React/Express app and must not be run against PostgreSQL.

## Seeded local admin

On the first API start with an empty database:

- Email: `admin@cedarstone.test`
- Password: `welcome123`

Change this password before using the app for anything beyond local evaluation. Set a unique `SESSION_SECRET` for each environment.
