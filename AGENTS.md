<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from training data. Read guides in `node_modules/next/dist/docs/` before writing code.

<!-- END:nextjs-agent-rules -->

# Smart Clinic - Agent Development Guide

A pediatric clinic management system: Next.js 16, React 19, TypeScript, Bun, tRPC, Prisma, Better Auth.

## Commands

```bash
# Development
bun dev           # Start dev server (localhost:3000)
bun build        # Build for production
bun start        # Start production server

# Database
bun db:generate  # Generate Prisma client
bun db:migrate   # Run migrations
bun db:push      # Push schema (dev only)
bun db:studio    # Open Prisma Studio
bun db:seed      # Seed database

# Code Quality
bun lint         # Run Oxlint
bun lint:fix     # Auto-fix lint issues
bun format       # Format + sort imports (Biome)
bun typecheck    # TypeScript check
bun pre-commit   # Run format + lint (Husky)
```

**Testing**: No test framework configured. Do not write tests unless explicitly requested.

---

## Code Style

### Naming

- Components: `PascalCase` (UserAvatar, ClinicSettings)
- Files: kebab-case for routes, PascalCase for components
- Variables: camelCase (`userName`, `isActive`)
- Booleans: `isLoading`, `hasPermission`, `canEdit`
- Constants: SCREAMING_SNAKE_CASE

### Imports (Biome order)

1. URL imports (react, next/\*)
2. Node.js built-ins
3. Package imports (@tanstack/_, @prisma/_)
4. Alias imports (@/components, @/lib)
5. Relative paths

```typescript
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./styles.css";
```

### Formatting (Biome)

- 2 spaces indent, 80 char line width
- Single quotes, ES5 trailing commas
- Void elements self-closed: `<br />`

### TypeScript

- Use `interface` for extendable objects, `type` for unions
- Avoid `any` — use `unknown`
- Use `as const` for literals

---

## Key Patterns

### Client vs Server Components

Use Server Components by default. Add `'use client'` only for:

- React hooks (useState, useEffect, useContext)
- Event handlers (onClick, onChange)
- tRPC/React Query hooks
- Browser APIs

### tRPC Routers

```typescript
export const userRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findUnique({ where: { id: input.id } });
    }),
});
```

### shadcn/ui + cn()

```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function MyButton({ className, ...props }) {
  return <Button className={cn('bg-primary', className)} {...props} />
}
```

### Error Handling

- Use try/catch for async operations
- Return typed errors from tRPC
- Use error.tsx for route error boundaries

---

## Project Structure

```
app/                    # Next.js App Router
  (auth)/              # Login, signup, forgot-password
  (dashboard)/         # Protected routes
  (admin)/            # Admin panel
  api/                 # tRPC + auth routes
components/
  ui/                  # shadcn/ui components
  clinic/              # Clinic components
  rbac/                # Permission components
server/api/routers/    # tRPC routers
lib/                   # Utilities
hooks/                 # Custom hooks
prisma/                # Database schema
```

---

## Important Notes

1. **Next.js 16**: Uses canary version. Check `node_modules/next/dist/docs/`
2. **Build**: Production builds may have Turbopack errors — use dev server
3. **Bun Runtime**: Always use `bun` commands, not npm/yarn/pnpm
4. **Cursor Rules**: Additional rules in `.cursor/rules/smart-clinic.mdc`

---

## Environment Variables

Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAILS`
See `.env.local.example` for full list.
