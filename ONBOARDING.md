# SaasPromosInternas Onboarding Guide

Welcome to the SaasPromosInternas development team! This guide will help you get started with developing on the SaasPromosInternas system.

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Running the Application Locally](#running-the-application-locally)
3. [Running Tests](#running-tests)
4. [Code Style Guidelines](#code-style-guidelines)
5. [How to Contribute](#how-to-contribute)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Development Environment Setup

### Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js 18+** (we recommend using nvm for version management)
- **npm** (comes with Node.js) or **pnpm**
- **Wrangler CLI** (Cloudflare's command-line tool)
- **Git** for version control

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd SaasPromosInternas
   ```

2. **Install Wrangler CLI** (if not already installed)
   ```bash
   npm i -g wrangler
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Setup Web Application Dependencies**
   ```bash
   cd apps/web
   npm install
   cd ..
   ```

5. **Configure Environment Variables**
   - Copy the example environment file:
     ```bash
     cd apps/web
     cp .env.example .env
     ```
   - Edit `.env` to add your local development values:
     - `VITE_API_URL`: Usually `http://localhost:8787/api` for local development
     - `VITE_APP_NAME`: "Promos Prado"
     - Any other required variables

### Verifying Your Setup
To verify your environment is correctly set up:
```bash
node --version  # Should be v18 or higher
npm --version   # Should be available
wrangler --version  # Should show wrangler version
```

## Running the Application Locally

### Starting the Development Server
1. **Create and Configure Local D1 Database**
   ```bash
   cd apps/web
   wrangler d1 create promos-db --local
   ```
   - This will output a database ID - copy it
   - Edit `wrangler.toml` in the same directory and replace the placeholder with your database ID

2. **Apply Database Migrations**
   ```bash
   wrangler d1 migrations apply promos-db --local
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   - The frontend will be available at: http://localhost:5173
   - The API will be proxied through the Vite dev server

### Accessing the Application
- Open your browser to http://localhost:5173
- Login with test credentials:
  - **Buyer**: comprador@prado.com / comprador123
  - **Manager**: gestor@prado.com / gestor123

### API Endpoints During Development
When running locally, API requests are proxied to:
- Base URL: `http://localhost:8787/api`
- Example: `GET http://localhost:8787/api/promotions`

## Running Tests

### Types of Tests
The project includes:
- **Unit tests** for individual functions and components
- **Integration tests** for API endpoints
- **End-to-end tests** (planned for future)

### Running Unit Tests
1. **API Tests** (located in `apps/api`)
   ```bash
   cd apps/api
   npm test
   ```

2. **Frontend Tests** (when implemented)
   ```bash
   cd apps/web
   npm test
   ```

### Specific Test Examples
From examining the codebase, we can see tests for the backup worker:
```bash
# Run backup worker tests
cd apps/api
npx vitest run backupWorker.test.ts
```

### Test Commands in package.json
Check the `scripts` section in `package.json` files for available test commands:
- `apps/api/package.json`: Likely contains test scripts
- `apps/web/package.json`: Likely contains test scripts

## Code Style Guidelines

### General Principles
- Write clear, readable code
- Follow existing patterns in the codebase
- Write tests for new functionality
- Keep functions focused and small
- Use meaningful variable and function names

### TypeScript Guidelines
- **Strict Mode**: Enable strict TypeScript checking
- **Interfaces vs Types**: Use interfaces for object shapes that may be implemented, types for complex unions/maps
- **Nullable Types**: Explicitly mark variables that can be null/undefined
- **Avoid any**: Prefer specific types or unknown with type guards

### React Component Guidelines
- **Functional Components**: Use function components with hooks
- **Props Destructuring**: Destructure props in function signature
- **Early Returns**: Use early returns for conditional rendering
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Component Size**: Keep components under 200 lines when possible

### Styling Guidelines (TailwindCSS)
- **Utility Classes**: Use Tailwind utility classes for styling
- **Responsive Design**: Apply responsive prefixes (sm:, md:, lg:, etc.)
- **Component Extraction**: Extract repeated utility patterns into components
- **Dark Mode**: Consider dark mode variants where appropriate

### Naming Conventions
- **Files**: Use PascalCase for React components (.tsx), camelCase for utilities and types (.ts)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase
- **Components**: PascalCase
- **Interfaces**: PascalCase with optional I prefix (consistent with existing code)
- **Types**: PascalCase

### Code Formatting
- **Prettier**: The project uses Prettier for code formatting
- **ESLint**: Used for code quality checks
- **Format on Save**: Recommended to enable in your editor
- **Pre-commit Hooks**: Consider setting up husky for automatic linting

### Git Commit Guidelines
- **Atomic Commits**: Each commit should represent a single logical change
- **Descriptive Messages**: Use clear, descriptive commit messages
- **Conventional Comments**: Consider using conventional commits format:
  - `feat: add new feature`
  - `fix: resolve issue with login`
  - `docs: update documentation`
  - `refactor: refactor authentication service`
  - `test: add tests for user service`
  - `chore: update dependencies`

## How to Contribute

### Making Changes
1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Or for bugs:
   ```bash
   git checkout -b bug/fix-description
   ```

2. **Make Your Changes**
   - Follow the code style guidelines
   - Write tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**
   - Run the application locally to verify functionality
   - Run relevant tests
   - Test edge cases

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new promotion filter functionality"
   ```

5. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request through the GitHub interface.

### Pull Request Process
1. **Update Documentation**: If your change affects usage, update relevant docs
2. **Request Review**: Tag appropriate team members for review
3. **Address Feedback**: Make requested changes and push updates
4. **Merge**: Once approved, merge the pull request

### Contribution Checklist
Before submitting a PR, ensure:
- [ ] Code follows style guidelines
- [ ] Tests pass for new and existing functionality
- [ ] Documentation is updated if needed
- [ ] No console.log statements left in production code
- [ ] Sensitive data is not committed (check .gitignore)
- [ ] Changes are backward compatible or migration strategy is documented

## Troubleshooting Common Issues

### Development Environment Issues

#### Wrangler Not Found
**Problem**: `wrangler: command not found`
**Solution**:
```bash
npm i -g wrangler
# Or if using npx
npx wrangler --version
```

#### Node Version Issues
**Problem**: Errors about Node version compatibility
**Solution**:
```bash
# Using nvm
nvm install 18
nvm use 18
# Verify
node --version
```

#### Dependency Installation Issues
**Problem**: npm install fails or hangs
**Solution**:
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

#### Local D1 Database Problems
**Problem**: Unable to create or connect to local D1 database
**Solutions**:
1. Ensure you're in the correct directory (`apps/web`)
2. Check that you have write permissions
3. Try removing the local database file and recreating:
   ```bash
   wrangler d1 delete promos-db --local
   wrangler d1 create promos-db --local
   ```
4. Verify wrangler.toml has correct database configuration

#### Migration Errors
**Problem**: Migrations fail to apply
**Solutions**:
1. Check the specific error message in the migration SQL
2. Ensure you're targeting the correct database (--local vs --remote)
3. For local development, you can reset and retry:
   ```bash
   wrangler d1 delete promos-db --local
   wrangler d1 create promos-db --local
   wrangler d1 migrations apply promos-db --local
   ```

### Application Runtime Issues

#### Frontend Not Loading
**Problem**: Blank page or loading errors in browser
**Solutions**:
1. Check browser console for JavaScript errors
2. Verify the development server is running (`npm run dev`)
3. Check network tab for failed API requests
4. Ensure API proxy is configured correctly in vite.config.ts

#### API Connection Errors
**Problem**: Frontend unable to connect to backend API
**Solutions**:
1. Verify VITE_API_URL in .env matches your local API URL
2. Check that the API server is running (should proxy through Vite dev server)
3. Check CORS settings if applicable
4. Look at API server logs for errors

#### Authentication Problems
**Problem**: Unable to login or authentication fails
**Solutions**:
1. Verify test credentials are correct:
   - Buyer: comprador@prado.com / comprador123
   - Manager: gestor@prado.com / gestor123
2. Check that users table has been populated (run migrations)
3. Inspect localStorage/sessionStorage for token storage
4. Check API response for authentication errors

### Build and Deployment Issues

#### Build Failures
**Problem**: `npm run build` fails
**Solutions**:
1. Check for TypeScript errors and fix them
2. Ensure all dependencies are installed
3. Look for missing imports or incorrect file paths
4. Verify environment variables are correctly referenced

#### Deployment Problems
**Problem**: Issues deploying to Cloudflare Pages
**Solutions**:
1. Verify wrangler.toml has correct production settings
2. Ensure you're logged into Wrangler with correct account:
   ```bash
   wrangler login
   ```
3. Check that D1 database binding is correctly configured in dashboard
4. Review deployment logs for specific error messages

### Backup System Issues

#### Backup Worker Not Running
**Problem**: Backup worker doesn't execute as expected
**Solutions**:
1. Check wrangler.toml for correct cron trigger configuration
2. Verify BACKUP_BUCKET R2 binding exists and is correct
3. Test manual execution:
   ```bash
   npx wrangler pages function invoke apps/api --name=backupWorker
   ```
4. Check worker logs in Cloudflare dashboard

#### Restore Failures
**Problem**: Unable to restore from backup
**Solutions**:
1. Verify backup file exists in R2 bucket:
   ```bash
   npx wrangler r2 bucket list promos-backups
   ```
2. Check that you have correct permissions for R2 and D1 operations
3. Ensure target D1 database exists and is accessible
4. For large databases, consider using the HTTP API method instead of wrangler execute

### Performance Issues

#### Slow API Responses
**Problem**: API endpoints respond slowly
**Solutions**:
1. Check database query performance (consider adding indexes)
2. Review Cloudflare Workers logs for errors or timeouts
3. Check for N+1 query problems in API handlers
4. Consider caching frequently accessed data

#### Frontend Performance
**Problem**: Frontend feels sluggish
**Solutions**:
1. Use React DevTools to identify re-rendering issues
2. Implement React.memo for components that receive same props
3. Use useMemo and useCallback for expensive computations
4. Consider virtual scrolling for large lists (TanStack Table already helps)

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Existing Documentation**:
   - README.md for general project information
   - ARCHITECTURE.md for technical details
   - CODE_OF_CONDUCT.md for community guidelines
   - Spec documents in docs/ directory

2. **Ask Team Members**:
   - Reach out to teammates via your team's communication channels
   - Tag relevant people in GitHub issues or pull requests

3. **Consult Cloudflare Documentation**:
   - [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
   - [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
   - [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
   - [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

4. **Check GitHub Issues**:
   - Look for similar issues in the repository's issue tracker
   - Create a new issue if your problem isn't already reported

## Conclusion

You're now ready to start contributing to SaasPromosInternas! Remember to:
- Follow the code style guidelines
- Write tests for your changes
- Keep commits focused and descriptive
- Communicate with your team
- Have fun building!

Welcome to the team!