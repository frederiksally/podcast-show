# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Next.js 15 SaaS starter kit** with **Supabase backend**, built using **Turborepo** for monorepo management. It features a multi-tenant architecture supporting both personal and team accounts with role-based permissions.

## Core Technologies

- **Next.js 15** with App Router
- **Supabase** for database, auth, and storage  
- **React 19**
- **TypeScript**
- **Tailwind CSS 4** and Shadcn UI
- **Turborepo** for monorepo management
- **pnpm** as package manager

## Essential Commands

### Development Workflow
```bash
pnpm dev                    # Start all apps in development mode
pnpm --filter web dev       # Start main web app only (port 3000)
pnpm build                  # Build all packages and apps
pnpm clean                  # Clean all node_modules and build artifacts
```

### Database Operations (Critical Sequence ⚠️)
```bash
pnpm supabase:web:start     # Start Supabase locally
pnpm --filter web supabase:db:diff -f <migration_name>  # Create migration after schema changes
pnpm --filter web supabase migration up                 # Apply new migrations
pnpm supabase:web:reset     # Reset with latest schema (clean rebuild)
pnpm supabase:web:typegen   # Generate TypeScript types from database
pnpm supabase:web:test      # Run Supabase tests
```

**Critical Database Workflow**: When adding new database features, ALWAYS follow this exact order:
1. Create/modify schema file in `apps/web/supabase/schemas/XX-feature.sql`
2. Generate migration: `pnpm --filter web supabase:db:diff -f <migration_name>`
3. Apply changes: `pnpm --filter web supabase migration up`
4. Generate types: `pnpm supabase:web:typegen`
5. Verify types exist before using in code

⚠️ **NEVER skip step 2** - schema files alone don't create tables!

### Code Quality
```bash
pnpm typecheck              # Type check all packages
pnpm lint                   # Lint all packages  
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Check code formatting
pnpm format:fix             # Auto-format code
pnpm test                   # Run tests across all packages
```

### Testing
```bash
pnpm test                   # Run all tests
pnpm --filter e2e test      # Run E2E tests (Playwright)
pnpm supabase:web:test      # Run Supabase database tests
```

### Billing Integration
```bash
pnpm stripe:listen          # Start Stripe webhook listener for development
```

## Monorepo Architecture

### Apps Structure
- `apps/web` - Main Next.js SaaS application
- `apps/e2e` - Playwright end-to-end tests
- `apps/dev-tool` - Development utilities

### Packages Structure
- `packages/features/*` - Feature-specific packages (accounts, auth, billing, etc.)
- `packages/ui` - Shared UI components and design system
- `packages/supabase` - Supabase client utilities and types
- `packages/shared` - Common utilities and configurations
- `packages/billing/*` - Payment processing (Stripe, Lemon Squeezy)
- `packages/mailers/*` - Email service providers
- `tooling/*` - Development tools and configurations

## Multi-Tenant Architecture

The application supports two account types:

**Personal Accounts**: Individual user accounts (`auth.users.id = accounts.id`)
**Team Accounts**: Shared workspaces with members, roles, and permissions

Data associates with accounts via foreign keys for proper access control using Row Level Security (RLS).

## Next.js App Router Structure

```
apps/web/app/
├── (marketing)/          # Public pages (landing, blog, docs)
├── (auth)/              # Authentication pages  
├── home/
│   ├── (user)/          # Personal account context
│   └── [account]/       # Team account context ([account] = team slug)
├── admin/               # Super admin section
└── api/                 # API routes
```

## Key Development Patterns

### Server Components (Preferred)
Always use async server components for initial data loading:

```typescript
// ✅ CORRECT - Next.js 15 pattern
async function Page({ params }: Props) {
  const { account } = await params; // Direct await in async components
  const client = getSupabaseServerClient();
  const { data } = await client.from('notes').select('*');
  return <NotesList notes={data} />;
}
```

### Form Architecture
Organize schemas for reusability between server actions and client forms:

```
_lib/
├── schemas/
│   └── feature.schema.ts    # Shared Zod schemas
├── server/
│   └── server-actions.ts    # Server actions import schemas
└── client/
    └── forms.tsx            # Forms import same schemas
```

### Workspace Contexts

**Personal Account Context** (`app/home/(user)`):
```tsx
import { useUserWorkspace } from '@kit/accounts/hooks/use-user-workspace';

function PersonalComponent() {
  const { user, account } = useUserWorkspace();
  // Personal account data
}
```

**Team Account Context** (`app/home/[account]`):
```tsx
import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';

function TeamComponent() {
  const { account, user, accounts } = useTeamAccountWorkspace();
  // Team account data with permissions
}
```

## Important File Patterns

### Component Organization
- Route-specific components: `_components/` directories
- Route utilities: `_lib/` for client, `_lib/server/` for server-side
- Global components: Root-level directories

### Navigation Configuration
- Personal navigation: `config/personal-account-navigation.config.tsx`
- Team navigation: `config/team-account-navigation.config.tsx`
- Paths: `config/paths.config.ts`

### Configuration Files
- Feature flags: `config/feature-flags.config.ts`
- i18n settings: `lib/i18n/i18n.settings.ts`
- Supabase config: `supabase/config.toml`

## Development Guidelines

### TypeScript Best Practices
- Always use implicit type inference unless impossible
- Avoid using `any` type
- Use service pattern for server-side APIs
- Add `server-only` to exclusively server-side code
- Handle errors gracefully with try/catch

### React Patterns
- Use `react-hook-form` and `@kit/ui/form` for all forms
- Always use 'use client' directive for client components
- Avoid `useEffect` when possible - prefer server-side data fetching
- Use single state objects instead of multiple `useState` calls

### Next.js Patterns
- Use `enhanceAction` for Server Actions
- Use `enhanceRouteHandler` for API Routes
- Export page components with `withI18n` utility
- Use `redirect` after server actions instead of client-side routing

### UI Component Usage
Always check `@kit/ui` first before external packages:
- Toast notifications: `import { toast } from '@kit/ui/sonner'`
- Forms: `import { Form, FormField, ... } from '@kit/ui/form'`

## Security & Authorization

### Authentication
- Authentication enforced by middleware
- Authorization handled by RLS at database level
- Use standard Supabase client for RLS-protected operations
- Use admin client only when necessary (requires manual authorization)

### Permission Patterns
```typescript
// Check team permissions
const canManageBilling = await api.hasPermission({
  accountId,
  userId,
  permission: 'billing.manage'
});

// Check account ownership
const isOwner = await client.rpc('is_account_owner', { 
  account_id: accountId 
});
```

## Testing Strategy

- **Unit Tests**: Individual package testing
- **E2E Tests**: Playwright tests in `apps/e2e`
- **Database Tests**: Supabase-specific tests
- Use `data-test` attributes for E2E test targeting

## Environment Requirements

- **Node.js**: >= v18.18.0
- **Package Manager**: pnpm@10.14.0
- **Runtime**: Next.js 15 with App Router

## Troubleshooting Commands

```bash
# Reset everything and start fresh
pnpm clean && pnpm install

# Reset database with latest schema
pnpm supabase:web:reset && pnpm supabase:web:typegen

# Fix dependency issues
pnpm syncpack:fix

# Check for type errors across all packages
pnpm typecheck

# Generate environment file templates
pnpm env:generate
```