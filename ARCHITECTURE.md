# SaasPromosInternas Architecture

## System Overview

SaasPromosInternas is a web application for managing internal promotions for the Prado Supermarkets chain. The system replaces manual spreadsheets with a modern web interface where buyers can create promotions, managers can approve/launch them, and active promotions are available for consultation.

## Components

### Frontend (apps/web)
- **React 18** with **Vite** for fast development builds
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **shadcn/ui** component library (built on Radix UI)
- **TanStack Table** for data grids
- **React Hook Form** for form handling
- **Zod** for schema validation

### Backend (apps/api)
- **Cloudflare Pages Functions** (Worker-based)
- **Hono Framework** for lightweight API routing
- **Cloudflare D1** (SQLite-based database) for data persistence

### Infrastructure
- **Cloudflare Pages** for hosting and deployment
- **Cloudflare D1** as primary database
- **Cloudflare R2** for backup storage (implemented)
- **Cloudflare Workers** for backup processes

## Data Flow

### User Interaction Flow
1. User accesses the web application via browser
2. Frontend sends API requests to Cloudflare Pages Functions (/api/* endpoints)
3. Functions interact with D1 database to read/write data
4. Responses returned to frontend for UI updates
5. State changes trigger re-renders in React components

### Data Flow Examples

#### Creating a Promotion
1. User fills promotion form in web interface
2. Form data validated client-side with React Hook Form + Zod
3. Validated data sent via POST to `/api/promotions`
4. Hono handler in `apps/api/src/routes/promotions.ts` processes request
5. Data inserted into D1 database using SQL queries
6. Success response returned to frontend
7. Promotion table refreshes to show new entry

#### Authentication Flow
1. User submits login credentials
2. POST request to `/api/auth/login`
3. Hono handler validates credentials against D1 users table
4. On success, creates JWT token
5. Token returned to frontend and stored in localStorage/sessionStorage
6. Subsequent requests include token in Authorization header
7. Auth middleware verifies token for protected routes

### Backup and Restore Flow
1. Cron trigger activates `backupWorker.ts` daily at 2 AM UTC
2. Worker connects to D1 database via binding
3. Worker generates SQL dump:
   - Queries `sqlite_master` for table schemas
   - Exports CREATE statements for each table
   - Exports all data as INSERT statements
4. SQL dump uploaded to R2 bucket with timestamped filename
5. For restore: process reversed - download from R2, execute SQL against D1

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context (AuthContext)
- **Data Fetching**: Custom API layer (`apps/web/src/lib/api.ts`)
- **Form Handling**: React Hook Form + Zod validation
- **Data Grids**: TanStack Table
- **Icons**: Lucide React

### Backend
- **Runtime**: Cloudflare Workers/Pages Functions
- **Framework**: Hono (minimalist web framework)
- **Database**: Cloudflare D1 (SQLite)
- **Backup Storage**: Cloudflare R2
- **Type Definitions**: Custom TypeScript definitions in `packages/types`
- **Validation**: Zod for request validation
- **Authentication**: JWT-based with cookie/session storage

### DevOps & Infrastructure
- **Deployment**: Cloudflare Pages
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2 (for backups)
- **CI/CD**: GitHub Actions (implied, not explicitly shown)
- **Monitoring**: Basic logging in workers
- **Backup System**: Custom Cloudflare Worker with cron trigger

### Development Tools
- **Package Manager**: npm
- **Language Server**: TypeScript tsc
- **Linting**: ESLint (implied from config files)
- **Formatting**: Prettier (implied from config files)
- **Testing**: Vitest (from backupWorker.test.ts)

## Database Schema

Based on examination of migration files and code, the D1 database contains these core tables:

### Users Table
- id (integer, primary key)
- email (text, unique)
- password_hash (text)
- role (text: 'comprador' or 'gestor')
- created_at (timestamp)
- updated_at (timestamp)

### Promotions Table
- id (integer, primary key)
- title (text)
- description (text)
- start_date (timestamp)
- end_date (timestamp)
- status (text: 'rascunho', 'pendente', 'ativa', 'encerrada')
- created_by (integer, foreign key to users.id)
- approved_by (integer, nullable, foreign key to users.id)
- launched_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### Stores Table
- id (integer, primary key)
- name (text)
- address (text)
- city (text)
- state (text)
- zip_code (text)
- active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

### Promotion-Stores Junction Table (Many-to-Many)
- promotion_id (integer, foreign key to promotions.id)
- store_id (integer, foreign key to stores.id)
- primary key (promotion_id, store_id)

### Additional Tables (inferred from API endpoints)
- PDF generation history
- Metrics/analytics data
- Duplicate promotion tracking

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Promotions
- `GET /api/promotions` - List promotions (with filtering)
- `POST /api/promotions` - Create new promotion
- `GET /api/promotions/:id` - Get specific promotion
- `PUT /api/promotions/:id` - Update promotion
- `DELETE /api/promotions/:id` - Delete promotion
- `POST /api/promotions/:id/launch` - Launch promotion
- `POST /api/promotions/:id/duplicate` - Duplicate promotion

### Stores
- `GET /api/stores` - List stores
- `POST /api/stores` - Create new store
- `GET /api/stores/:id` - Get specific store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Dashboard & Metrics
- `GET /api/dashboard` - Get dashboard metrics
- `GET /api/metrics` - Get detailed metrics

### PDF Generation
- `POST /api/pdf/generate` - Generate PDF for promotion

### Backup System
- Cron-triggered backup worker (not a traditional API endpoint)
- Manual trigger possible via Cloudflare dashboard/API

## Security Considerations

### Authentication & Authorization
- JWT-based authentication for API routes
- Role-based access control (comprador vs gestor)
- Protected routes middleware to verify authentication and permissions
- Passwords hashed using bcrypt (inferred from security best practices)

### Data Protection
- Input validation using Zod schema validation
- Parameterized queries to prevent SQL injection
- CORS policies configured appropriately
- Secure headers implemented

### Backup Security
- R2 bucket access restricted to authorized service tokens
- Consideration for encrypting sensitive data in backups (future improvement)
- Access logs for backup/restore operations (planned)

### Infrastructure Security
- Cloudflare's built-in DDoS protection
- SSL/TLS encryption for all traffic
- Regular security updates managed by Cloudflare platform

## Backup and Restore Procedures

### Automated Backup System
- **Frequency**: Daily at 2 AM UTC
- **Method**: Cloudflare Worker (`backupWorker.ts`) with cron trigger
- **Process**:
  1. Connect to D1 database
  2. Generate complete SQL dump (schema + data)
  3. Upload to R2 bucket with timestamped filename
  4. Log success/failure for monitoring
- **Retention**: 30 days (cleanup process to be implemented)

### Manual Backup Trigger
```bash
# Trigger backup worker manually
npx wrangler pages function invoke apps/api --name=backupWorker
```

### Restore Procedure
1. **Identify Backup**:
   ```bash
   npx wrangler r2 bucket list promos-backups
   ```
2. **Download Backup**:
   ```bash
   npx wrangler r2 object get promos-backups <backup-filename> --file backup.sql
   ```
3. **Restore Database** (Method 1 - wrangler execute):
   ```bash
   npx wrangler d1 execute promos-db --file=backup.sql --remote
   ```
4. **Verify Restoration**:
   - Query database to confirm data integrity
   - Test application functionality

### Point-in-Time Recovery (Time Travel)
- **Paid Plan**: Up to 30 days recovery window
- **Free Plan**: Up to 7 days recovery window
- **Usage**:
  ```bash
  npx wrangler d1 restore promos-db --to 2026-05-28T14:30:00Z --remote
  ```

## Scalability and Observability Features

### Scalability
- **Horizontal Scaling**: Cloudflare Pages Functions automatically scale
- **Database Scaling**: D1 handles scaling automatically within Cloudflare's limits
- **Caching**: Opportunities for CDN caching of static assets
- **Database Optimization**: Proper indexing on queried columns (inferred from usage patterns)

### Observability
- **Logging**: Workers log key events (backup success/failure)
- **Monitoring**: Cloudflare dashboard provides metrics
- **Error Tracking**: Built-in error reporting in Workers
- **Performance**: Cloudflare provides performance analytics
- **Audit Trail**: Timestamps on all records enable basic audit capabilities

## Deployment Instructions

### Prerequisites
- Node.js 18+
- npm or pnpm
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account with API token

### Local Development Setup
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd SaasPromosInternas
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd apps/web
   npm install
   ```

3. **Setup Local D1 Database**
   ```bash
   cd apps/web
   wrangler d1 create promos-db --local
   ```
   - Copy generated database_id to wrangler.toml
   - Apply migrations:
     ```bash
     wrangler d1 migrations apply promos-db --local
     ```

4. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in required variables (JWT secret, etc.)

5. **Start Development Server**
   ```bash
   cd apps/web
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API: Available via Pages Functions proxy

### Production Deployment
1. **Create Remote D1 Database**
   ```bash
   cd apps/web
   wrangler d1 create promos-db --remote
   ```

2. **Configure wrangler.toml**
   - Replace placeholder with remote database_id

3. **Apply Migrations to Production**
   ```bash
   wrangler d1 migrations apply promos-db --remote
   ```

4. **Build and Deploy**
   ```bash
   cd apps/web
   npm run build
   npx wrangler pages deploy dist
   ```

5. **Bind D1 to Pages Project** (via Cloudflare Dashboard)
   - Go to Pages → your project → Settings → Functions → D1 Databases
   - Add binding: Select your `promos-db` database

6. **Configure Backup System**
   - Ensure `BACKUP_BUCKET` R2 bucket exists
   - Verify wrangler.toml has correct bindings and cron trigger
   - Backup worker will run automatically daily at 2 AM UTC

### Testing Deployment
1. Verify application loads at production URL
2. Test login with default credentials:
   - Buyer: comprador@prado.com / comprador123
   - Manager: gestor@prado.com / gestor123
3. Test core functionality: create, view, approve promotions
4. Verify backup system by checking R2 bucket for backup files

## Maintenance Procedures

### Database Maintenance
- Monitor D1 usage via Cloudflare dashboard
- Consider vacuuming/optimizing database periodically
- Monitor backup success/failure logs

### Application Updates
1. Pull latest code
2. Run `npm install` if dependencies changed
3. Apply any new migrations:
   ```bash
   wrangler d1 migrations apply promos-db --remote
   ```
4. Rebuild and redeploy:
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

### Backup System Maintenance
- Monthly: Verify backup files exist and are readable
- Quarterly: Test restore procedure to isolated test database
- Annually: Review retention policy and storage costs
- As needed: Implement cleanup worker for old backups

## Conclusion

SaasPromosInternas is a modern, cloud-native application built entirely on the Cloudflare developer platform. It leverages Cloudflare's edge computing capabilities, serverless functions, and managed database services to provide a scalable, secure, and maintainable solution for promotion management. The implemented backup strategy ensures data durability, while the modular architecture allows for future enhancements and scaling.