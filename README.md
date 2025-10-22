# FOPSmart Backend

A comprehensive Express.js backend application with PostgreSQL integration, JWT authentication, Monobank API integration, and Swagger documentation. Built for financial operations management with secure user authentication and banking data integration.

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

   # Database Configuration
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=fopsmart
   PGUSER=postgres
   PGPASSWORD=postgres
   PGSSL=false
   PGPOOL_MAX=10
   PG_IDLE_TIMEOUT_MS=30000
   PG_CONN_TIMEOUT_MS=5000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fopsmart

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d

   # Encryption Configuration
   ENCRYPTION_SECRET=your-super-secret-encryption-key-change-in-production
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

## API Documentation
- **Swagger UI**: `GET /api-docs`
- Interactive API documentation with authentication support
- Available at: `http://localhost:3000/api-docs`

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
├─ app.js                      # Express app, routes, middlewares, JSON error handler
├─ bin/www                     # Server bootstrap and graceful shutdown
├─ config/                     # Configuration files
│  ├─ index.js                 # Centralized configuration (loads .env via dotenv)
│  └─ swagger.js               # Swagger API documentation configuration
├─ controllers/                # Request handlers
│  ├─ authController.js        # Authentication logic (register, login)
│  └─ monobankController.js    # Monobank integration logic
├─ db/pool.js                  # PostgreSQL Pool, helpers, healthcheck
├─ middleware/                 # Custom middleware
│  ├─ auth.js                  # JWT authentication middleware
│  └─ validation.js            # Request validation middleware
├─ models/                     # Data models
│  ├─ User.js                  # User model with authentication methods
│  └─ MonobankConnection.js    # Monobank connection model
├─ routes/                     # Route definitions
│  ├─ index.js                 # Root routes
│  ├─ auth.js                  # Authentication routes
│  ├─ users.js                 # User management routes
│  └─ monobank.js              # Monobank integration routes
├─ services/                   # Business logic services
│  └─ monobankService.js       # Monobank API service
├─ utils/                      # Utility functions
│  └─ encryption.js            # Data encryption utilities
└─ public/                     # Static assets
```

## Configuration
Configuration is loaded from environment variables via `dotenv` in `config/index.js`.

Key variables:
- `PORT`: HTTP server port (default 3000)
- `NODE_ENV`: `development` | `production` | `test`
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`: PostgreSQL connection
- `DATABASE_URL`: Full PostgreSQL connection string (alternative to individual PG vars)
- `PGSSL`: `true` to enable SSL (sets `{ rejectUnauthorized: false }`)
- `PGPOOL_MAX`: Pool max clients (default 10)
- `PG_IDLE_TIMEOUT_MS`: Pool idle timeout (default 30000)
- `PG_CONN_TIMEOUT_MS`: Connection timeout (default 5000)
- `JWT_SECRET`: Secret key for JWT token signing (required for authentication)
- `JWT_EXPIRES_IN`: JWT token expiration time (default: 7d)
- `ENCRYPTION_SECRET`: Secret key for data encryption (required for secure data storage)

## Features

### Authentication System
- **JWT-based authentication** with secure token generation
- **User registration** with email validation and password hashing
- **User login** with credential verification
- **Password hashing** using bcryptjs with salt rounds
- **Protected routes** with JWT middleware

#### Authentication Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Monobank Integration
- **Secure Monobank API integration** for banking data
- **Token-based connection** to user's Monobank account
- **Client information retrieval** and account management
- **Encrypted token storage** for security
- **Connection status tracking** and management

#### Monobank Endpoints:
- `POST /api/monobank/connect` - Connect Monobank account
- `GET /api/monobank/status` - Check connection status
- `DELETE /api/monobank/disconnect` - Disconnect Monobank account

## Scripts
- `npm run dev`: Start with Nodemon (auto-reload)
- `npm start`: Start with Node (production-like)

## Graceful Shutdown
On `SIGINT`/`SIGTERM`, the server stops accepting new connections and the PostgreSQL pool is closed before process exit.

## Deployment

### Production Server
- **Live URL**: https://fopsmart-4030403a47a5.herokuapp.com
- **API Documentation**: https://fopsmart-4030403a47a5.herokuapp.com/api-docs
- **Health Check**: https://fopsmart-4030403a47a5.herokuapp.com/healthz

### Environment Setup for Production
Ensure the following environment variables are set in your production environment:
- `NODE_ENV=production`
- `JWT_SECRET` - Use a strong, unique secret key
- `ENCRYPTION_SECRET` - Use a strong, unique encryption key
- `DATABASE_URL` - Full PostgreSQL connection string
- All other required configuration variables

## Security Features
- **JWT token authentication** with configurable expiration
- **Password hashing** with bcryptjs (12 salt rounds)
- **Data encryption** for sensitive information storage
- **Input validation** using express-validator
- **CORS protection** and security headers
- **Environment-based configuration** for secrets

## Troubleshooting
- **Connection refused**: Ensure PostgreSQL is running and environment variables are correct
- **SSL errors**: Set `PGSSL=false` locally or configure proper CA certificates in production
- **Health check shows `db: down`**: Verify network connectivity and database credentials
- **JWT errors**: Ensure `JWT_SECRET` is set and consistent across deployments
- **Monobank API errors**: Verify Monobank token validity and API endpoint availability

## License
MIT
