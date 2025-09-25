# FOPSmart Backend (Express + PostgreSQL)

A minimal Express backend with PostgreSQL integration, environment-based configuration, JSON error handling, health checks, and graceful shutdown.

## Prerequisites
- Node.js 18+
- PostgreSQL 13+

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file at the project root:
   ```bash
   # If you have an example file
   cp .env.example .env
   ```
   Or create it manually with:
   ```bash
   cat > .env << 'ENV'
   NODE_ENV=development
   PORT=3000

   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=fopsmart
   PGUSER=postgres
   PGPASSWORD=postgres
   PGSSL=false
   PGPOOL_MAX=10
   PG_IDLE_TIMEOUT_MS=30000
   PG_CONN_TIMEOUT_MS=5000
   ENV
   ```
3. Run the app:
   - Development (auto-reload):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

## Health Check
- Endpoint: `GET /healthz`
- Returns JSON with application and DB status, e.g.:
  ```json
  { "status": "ok", "db": "up" }
  ```
- Quick test:
  ```bash
  curl http://localhost:3000/healthz
  ```

## Project Structure
```
.
├─ app.js                 # Express app, routes, middlewares, JSON error handler
├─ bin/www                # Server bootstrap and graceful shutdown
├─ config/index.js        # Centralized configuration (loads .env via dotenv)
├─ db/pool.js             # PostgreSQL Pool, helpers, healthcheck
├─ routes/                # Route handlers
│  ├─ index.js
│  └─ users.js
└─ public/                # Static assets
```

## Configuration
Configuration is loaded from environment variables via `dotenv` in `config/index.js`.

Key variables:
- `PORT`: HTTP server port (default 3000)
- `NODE_ENV`: `development` | `production` | `test`
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`: PostgreSQL connection
- `PGSSL`: `true` to enable SSL (sets `{ rejectUnauthorized: false }`)
- `PGPOOL_MAX`: Pool max clients (default 10)
- `PG_IDLE_TIMEOUT_MS`: Pool idle timeout (default 30000)
- `PG_CONN_TIMEOUT_MS`: Connection timeout (default 5000)

## Scripts
- `npm run dev`: Start with Nodemon (auto-reload)
- `npm start`: Start with Node (production-like)

## Graceful Shutdown
On `SIGINT`/`SIGTERM`, the server stops accepting new connections and the PostgreSQL pool is closed before process exit.

## Troubleshooting
- Connection refused: ensure PostgreSQL is running and env vars are correct.
- SSL errors: set `PGSSL=false` locally or configure proper CA certs in production.
- Health check shows `db: down`: verify network connectivity and credentials.

## License
MIT
