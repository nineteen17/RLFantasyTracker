# NRL Fantasy Tracker — API

Express.js API for the NRL Fantasy player intelligence site. Serves player search, team rosters, player detail pages, and value rankings.

---

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (access & refresh tokens)
- **Testing**: Vitest, Supertest
- **DI**: tsyringe
- **Docs**: Swagger
- **Logging**: Winston

---

## Project Structure

```
src/
├── config/          # DI container, OpenAPI, Zod config
├── database/
│   ├── schema.ts    # Drizzle table definitions (all tables)
│   └── data-source.ts # Drizzle + pg Pool connection
├── logic/
│   ├── model/       # Feature modules (auth, session, etc.)
│   └── shared/      # Middleware, utils, error handling
├── app.ts           # Express app factory
├── index.ts         # Entry point
drizzle/             # Generated SQL migration files
drizzle.config.ts    # Drizzle Kit configuration
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.development` and fill in your values:

```env
NODE_ENV=development
PORT=5000

FRONTEND_URL=http://localhost:5173
NRL_FANTASY_DATA_BASE_URL=https://fantasy.nrl.com/data/nrl

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

DB_HOST=localhost
DB_USER=postgres
DB_PASS=postgres
DB_NAME=nrl_fantasy
DB_PORT=5432
```

### SSL (development)

```bash
mkdir ssl
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout ssl/key.pem -out ssl/cert.pem -days 365 \
  -subj "/C=US/ST=Local/L=Localhost/O=Dev/CN=localhost"
```

---

## Database & Migrations (Drizzle)

The schema is defined in `src/database/schema.ts` using Drizzle ORM. Migrations are generated SQL files in the `drizzle/` directory.

### Workflow

```bash
# 1. Edit src/database/schema.ts (add/modify tables)

# 2. Generate a migration from schema changes
npm run db:generate

# 3. Apply pending migrations to your database
npm run db:migrate

# 4. (Optional) Browse your database with Drizzle Studio
npm run db:studio
```

### Key points

- **Schema-first**: All tables are defined in `src/database/schema.ts`. Never edit migration files by hand unless adding custom SQL (e.g. GIN indexes).
- **Generated migrations**: `db:generate` diffs your schema against the previous snapshot and produces a new `.sql` file in `drizzle/`.
- **Idempotent apply**: `db:migrate` runs any unapplied migrations in order. Safe to run multiple times.
- **No build step required**: Unlike TypeORM, Drizzle Kit reads your TypeScript schema directly — no need to `npm run build` before generating or running migrations.

---

## NPM Scripts

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start dev server with hot reload (tsx)            |
| `npm run start`      | Start production server (compiled JS)             |
| `npm run build`      | Compile TypeScript with tsup                      |
| `npm run test`       | Run tests with Vitest                             |
| `npm run lint`       | Run Biome linter                                  |
| `npm run format`     | Format code with Biome                            |
| `npm run db:generate`| Generate Drizzle migration from schema changes    |
| `npm run db:migrate` | Apply pending migrations to database              |
| `npm run db:studio`  | Open Drizzle Studio (database browser)            |

---

## Authentication

- **Access Token**: Short-lived JWT for API requests
- **Refresh Token**: Long-lived JWT for issuing new access tokens
- **Multi-Session**: Each device maintains its own refresh session
- **Logout**: Soft-deletes the session record

Token secrets and expiration are configured via environment variables.

---

## API Documentation

Swagger UI available at:

```
GET /api-docs
```

---

## Testing

```bash
npm run test
```

Tests use Vitest + Supertest. Test utilities in `test/` include global setup/teardown.

---

## License

[MIT](https://choosealicense.com/licenses/mit/)
