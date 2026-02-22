<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Smart Clinic - Agent Development Guide

This document provides guidelines for agentic coding agents working on the Smart Clinic project.

## Project Overview

A production-ready pediatric clinic management system built with Next.js 16, React 19, TypeScript, Bun, tRPC, Prisma, and Better Auth.

### Tech Stack

- **Framework**: Next.js 16 with App Router
- **Runtime**: Bun
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **API**: tRPC with React Query
- **Auth**: Better Auth with roles (Owner, Admin, Member, Viewer)
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **State**: Zustand
- **Forms**: React Hook Form + Zod

---

## Commands

### Development

```bash
bun dev         # Start development server
bun build       # Build for production
bun start       # Start production server
```

### Database

```bash
bun db:generate         # Generate Prisma client
bun db:migrate          # Run migrations
bun db:push             # Push schema (dev only)
bun db:studio           # Open Prisma Studio
bun db:seed             # Seed database
```

### Code Quality

```bash
bun lint          # Run Oxlint to check for linting issues
bun lint:fix      # Run Oxlint with auto-fix
bun format        # Format code, sort imports, remove unused imports (Biome)
bun pre-commit    # Run formatting and linting (used by Husky)
```

### Testing

**Note**: This project currently has no test framework configured. Do not write tests unless explicitly requested.

---

## Code Style Guidelines

### General Principles

- Use TypeScript for all files (`.ts` or `.tsx`)
- Enable strict mode in TypeScript
- Prefer functional components and hooks
- Keep components small and focused

### Naming Conventions

- **Components**: PascalCase (e.g., `UserAvatar`, `ClinicSettings`)
- **Files**: kebab-case for pages/routes, PascalCase for components
- **Variables/camelCase**: `const userName`, `const isActive`
- **Constants**: SCREAMING_SNAKE_CASE for config constants
- **Booleans**: Prefix with `is`, `has`, `can`, `should` (e.g., `isLoading`, `hasPermission`)
- **Interfaces/Types**: PascalCase, prefix with `I` for interfaces if desired (project uses type aliases mostly)

### Imports & Organization

Import order (enforced by Biome):

1. URL imports
2. Node.js built-ins
3. Bun imports
4. Package protocols
5. Package imports
6. Alias imports (`@repo/**`)
7. Relative path imports

```typescript
// Correct import order
import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import "./styles.css";
```

Use path aliases (`@/`) for internal imports:

- `@/components/*` - React components
- `@/lib/*` - Utilities and helpers
- `@/server/*` - Server-side code
- `@/hooks/*` - Custom React hooks

### Formatting (Biome)

- **Indent**: 2 spaces (tab style)
- **Line width**: 80 characters
- **Quotes**: Single quotes for JS/JSX
- **Semicolons**: As needed
- **Trailing commas**: ES5 style
- **Arrow functions**: As needed (parentheses for single arg)
- **Void elements**: Self-close (e.g., `<br />`)

### TypeScript Guidelines

- Use `interface` for object shapes that may be extended
- Use `type` for unions, primitives, and computed types
- Avoid `any` - use `unknown` when type is truly unknown
- Use `as const` for literal values that shouldn't change
- Enable strict null checks
- Prefer explicit return types for utility functions

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

type UserRole = "admin" | "patient" | "doctor" | "staff" ;

// Avoid
const user: any = getUser();
```

### React Patterns

- Use functional components with arrow functions or `function` keyword
- Prefer composition over inheritance
- Use `useMemo` for expensive calculations
- Use `useCallback` for callback props passed to memoized components
- Extract complex logic into custom hooks

```typescript
// Component pattern
export function UserAvatar({ src, alt }: UserAvatarProps) {
  return <Image src={src} alt={alt} className="rounded-full" />
}

// Custom hook pattern
function useUserData(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  })
}
```

### Error Handling

- Use try/catch with async/await for potentially failing operations
- Return typed errors from tRPC routers
- Use error boundaries for component-level errors
- Display user-friendly error messages in UI

```typescript
// tRPC router error handling
async function getUser(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
}
```

### Database (Prisma)

- Use Prisma Client for all database operations
- Prefer transactions for multi-step operations
- Use Prisma's type inference (e.g., `Prisma.UserGetPayload<{ include: {...} }>`)
- Avoid raw SQL unless necessary

### UI Components (shadcn/ui)

- Use shadcn/ui components from `@/components/ui/*`
- Customize theme in `app/globals.css`
- Use `cn()` utility for conditional class merging

```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function MyButton({ className, ...props }) {
  return (
    <Button className={cn('bg-primary', className)} {...props} />
  )
}
```

### Server Components vs Client Components

- Use Server Components by default (`.tsx` files in `app/`)
- Add `'use client'` directive only when using:
  - React hooks (useState, useEffect, useContext)
  - Event handlers (onClick, onChange)
  - Browser-only APIs
  - tRPC/React Query hooks
  - Third-party client components

### tRPC Patterns

- Define routers in `server/api/routers/`
- Use input validation with Zod
- Return typed responses
- Use protected procedures for authenticated routes

```typescript
// Router example
export const userRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findUnique({ where: { id: input.id } });
    }),
});
```

### Security

- Never expose secrets in client-side code
- Use environment variables via `env.ts`
- Validate all user inputs with Zod
- Implement proper authorization checks
- Sanitize user-generated content

### Performance

- Use React Suspense for async data
- Implement proper loading states
- Use optimistic updates where appropriate
- Lazy load routes with `dynamic()`
- Optimize images with `next/image`

---

## Project Structure

```
app/                    # Next.js App Router
  (auth)/              # Authentication routes
  (dashboard)/         # Protected dashboard routes
  (admin)/             # Admin routes
  api/                 # API routes (tRPC, auth)
components/            # React components
  ui/                  # shadcn/ui components
  clinic/              # Clinic-related components
  rbac/                # Permission components
server/api/            # tRPC routers
lib/                   # Utilities
  auth/                # Auth configuration
  rbac/                # Permission utilities
hooks/                 # Custom React hooks
prisma/                # Database schema
emails/                # React Email templates
```

---

## Code Quality Tools

### Biome

- Formats code
- Organizes imports
- Removes unused imports
- Configuration: `biome.json`

### Oxlint

- Fast Rust-based linter
- Catches code issues
- Configuration: `.oxlintrc.json`

### Pre-commit Hooks

Husky runs before each commit:

1. Biome formats code
2. Oxlint checks for issues

Run `bun pre-commit` manually to check before committing.

---

## Common Patterns

### Conditional Classes

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'primary' : 'secondary'
)} />
```

### Loading States

```typescript
import { Suspense } from 'react'
import { UserListSkeleton } from '@/components/skeletons'

<Suspense fallback={<UserListSkeleton />}>
  <UserList />
</Suspense>
```

### Error States

```typescript
// Use error.tsx in the same route segment
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

---

## Environment Variables

Required variables (see `.env.local.example`):

- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth secret key
- `BETTER_AUTH_URL` - App URL
- `ADMIN_EMAILS` - Admin access control

---

## Important Notes

1. **Next.js 16**: This project uses Next.js 16 (canary). APIs may differ from Next.js 14/15. Check `node_modules/next/dist/docs/` for current documentation.
