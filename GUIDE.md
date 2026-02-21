# Smart Clinic - Agent Development Guide

A pediatric clinic management system: Next.js 16, React 19, TypeScript, Bun, tRPC, Prisma, Better Auth.

<!-- BEGIN:nextjs-agent-rules -->

# ⚠️ CRITICAL: This is NOT the Next.js you know

This version has **breaking changes** — APIs, conventions, and file structure may differ from training data. Read guides in `node_modules/next/dist/docs/` before writing code.

**Key Breaking Changes in Next.js 16:**
- `params` and `searchParams` are now **Promises** - must `await` them
- `'use cache'` directive replaces `unstable_cache`
- `proxy.ts` replaces `middleware.ts` for Node.js runtime
- Turbopack is the **default bundler**
- View Transitions API supported natively

<!-- END:nextjs-agent-rules -->

## Commands

```bash
# Development
bun dev           # Start dev server (localhost:3000) with Turbopack
bun build         # Build for production
bun start         # Start production server

# Database
bun db:generate   # Generate Prisma client
bun db:migrate    # Run migrations
bun db:push       # Push schema (dev only)
bun db:studio     # Open Prisma Studio
bun db:seed       # Seed database

# Code Quality
bun lint          # Run Oxlint
bun lint:fix      # Auto-fix lint issues
bun format        # Format + sort imports (Biome)
bun typecheck     # TypeScript check
bun pre-commit    # Run format + lint (Husky)
```

**Testing**: No test framework configured. Do not write tests unless explicitly requested.

---

## 🏗️ Architecture: Four-Layer Pattern

Our app is strictly divided into four distinct layers. **Every feature must follow this flow:**

```
Client Component (useTRPC) → Transport Layer (tRPC Router) → Action Layer (Writes) / Service Layer (Reads) → Query Layer (Prisma)
```

### Layer 1: Query Layer (`src/server/db/queries/`)

Pure Prisma calls. **No business logic. No auth. No caching.**

```typescript
// src/server/db/queries/patient.queries.ts
import { prisma } from '@/server/db';

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: { appointments: true }
  });
}

export async function getPatientsByClinic(clinicId: string) {
  return prisma.patient.findMany({
    where: { clinicId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createPatient(data: any) {
  return prisma.patient.create({ data });
}
```

### Layer 2: Service Layer (`src/server/services/`)

Business logic, caching with `'use cache'`, `cacheTag`, and `cacheLife`. Delegates to Query Layer.

```typescript
// src/server/services/patient.service.ts
import { cacheLife, cacheTag } from 'next/cache';
import * as patientQueries from '@/server/db/queries/patient.queries';

export async function getPatientWithDetails(id: string) {
  'use cache';
  cacheLife('minutes'); // 15 min revalidate, 5 min stale
  cacheTag(`patient-${id}`);

  const patient = await patientQueries.getPatientById(id);

  if (!patient) {
    throw new Error('Patient not found');
  }

  return patient;
}

export async function getPatientsList(clinicId: string, filters?: any) {
  'use cache';
  cacheLife('hours');
  cacheTag(`patients-${clinicId}`);

  return patientQueries.getPatientsByClinic(clinicId);
}

export async function validatePatientDeletion(patientId: string) {
  const patient = await patientQueries.getPatientById(patientId);

  if (patient?.appointments?.some(a => a.status === 'SCHEDULED')) {
    throw new Error('Cannot delete patient with scheduled appointments');
  }

  return true;
}
```

### Layer 3: Action Layer (`src/server/actions/`)

**Entry point for writes.** Handles Auth, Zod validation, calls Services, and `revalidateTag`/`updateTag`.

```typescript
// src/server/actions/patient.actions.ts
'use server';

import { z } from 'zod';
import { revalidateTag, updateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import * as patientService from '@/server/services/patient.service';
import * as patientQueries from '@/server/db/queries/patient.queries';

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  clinicId: z.string().uuid(),
  parentName: z.string().optional(),
  phone: z.string().optional()
});

export async function createPatient(input: unknown) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', status: 401 };
    }

    // 2. Validation
    const validated = createPatientSchema.parse(input);

    // 3. Business logic (if needed)
    // 4. Call Query Layer directly (writes don't need service caching)
    const patient = await patientQueries.createPatient({
      ...validated,
      createdById: session.user.id
    });

    // 5. Revalidate cache tags
    revalidateTag(`patients-${validated.clinicId}`);
    updateTag('patients-list'); // immediate update

    return {
      success: true,
      data: patient,
      status: 201
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        status: 400
      };
    }

    return {
      success: false,
      message: 'Failed to create patient',
      status: 500
    };
  }
}

export async function deletePatient(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', status: 401 };
    }

    const { id } = z.object({ id: z.string().uuid() }).parse(input);

    // Business rule check in service
    await patientService.validatePatientDeletion(id);

    await patientQueries.deletePatient(id);

    revalidateTag(`patient-${id}`);
    revalidateTag('patients-list');

    return { success: true, status: 200 };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Deletion failed',
      status: 400
    };
  }
}
```

### Layer 4: Transport Layer (`src/server/api/routers/`)

tRPC routers that bridge Services/Actions to the Client.

```typescript
// src/server/api/routers/patient.router.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as patientService from '@/server/services/patient.service';
import * as patientActions from '@/server/actions/patient.actions';

export const patientRouter = router({
  // Read operations → Service Layer (cached)
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return patientService.getPatientWithDetails(input.id);
    }),

  getList: protectedProcedure
    .input(z.object({
      clinicId: z.string().uuid(),
      limit: z.number().optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      return patientService.getPatientsList(input.clinicId, input);
    }),

  // Write operations → Action Layer
  create: protectedProcedure
    .input(z.any()) // Action layer handles validation
    .mutation(async ({ input }) => {
      return patientActions.createPatient(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return patientActions.deletePatient(input);
    })
});
```

---

## 🎨 UI Component Patterns (tRPC Client)

### ⚠️ CRITICAL: Options Proxy Pattern (MANDATORY)

```tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { toast } from 'sonner';

export function PatientProfile({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ✅ CORRECT: Use queryOptions with useQuery
  const { data: patient, isLoading } = useQuery(
    trpc.patient.getById.queryOptions(
      { id },
      {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000 // 10 minutes
      }
    )
  );

  // ✅ CORRECT: Use mutationOptions with useMutation
  const updateMutation = useMutation(
    trpc.patient.update.mutationOptions({
      onSuccess: () => {
        toast.success('Patient updated');
        // ✅ CORRECT: Invalidate with queryFilter (type-safe)
        queryClient.invalidateQueries(
          trpc.patient.getById.queryFilter({ id })
        );
        queryClient.invalidateQueries(
          trpc.patient.list.queryFilter()
        );
      },
      onError: (error) => {
        toast.error(error.message);
      }
    })
  );

  if (isLoading) return <PatientSkeleton />;
  return <PatientForm patient={patient} onSubmit={updateMutation.mutate} />;
}

// ❌ NEVER DO THIS (Classic tRPC hooks are FORBIDDEN)
// const { data } = trpc.patient.getById.useQuery({ id });
```

### Server Component Prefetch Pattern

```tsx
// app/patients/[id]/page.tsx (Server Component)
import { createCaller, HydrateClient } from '@/trpc/server';
import { PatientClient } from './patient-client';

interface PageProps {
  params: Promise<{ id: string }>; // Next.js 16: params is a Promise!
}

export default async function PatientPage({ params }: PageProps) {
  const { id } = await params; // ⚠️ MUST AWAIT in Next.js 16
  const caller = await createCaller();

  // Prefetch data on server (parallel for performance)
  await Promise.all([
    caller.patient.getById({ id }),
    caller.patient.getAppointments({ patientId: id })
  ]);

  return (
    <HydrateClient>
      <PatientClient patientId={id} />
    </HydrateClient>
  );
}
```

### Form Handling with TanStack Form

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { patientSchema } from '@/lib/validations/patient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PatientForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    trpc.patient.create.mutationOptions({
      onSuccess: () => {
        toast.success('Patient created');
        queryClient.invalidateQueries(trpc.patient.list.queryFilter());
      }
    })
  );

  const form = useForm({
    defaultValues: { firstName: '', lastName: '', dateOfBirth: '' },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
    validatorAdapter: zodValidator()
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="firstName"
        validators={{ onChange: patientSchema.shape.firstName }}
      >
        {(field) => (
          <div>
            <Input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(', ')}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Patient'}
      </Button>
    </form>
  );
}
```

### Invalidation Strategies

```typescript
// ✅ SPECIFIC INVALIDATION (preferred)
queryClient.invalidateQueries(
  trpc.patient.getById.queryFilter({ id: patientId })
);

// ✅ ROUTER-LEVEL INVALIDATION (all patient queries)
queryClient.invalidateQueries(
  trpc.patient.pathFilter()
);

// ✅ CONDITIONAL INVALIDATION
queryClient.invalidateQueries({
  predicate: (query) => {
    return query.queryKey[0] === 'patient' &&
           query.queryKey[1]?.clinicId === clinicId;
  }
});

// ✅ WITH OPTIMISTIC UPDATES
const mutation = useMutation(
  trpc.patient.toggleStatus.mutationOptions({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries(
        trpc.patient.getById.queryFilter({ id })
      );

      const previous = queryClient.getQueryData(
        trpc.patient.getById.queryKey({ id })
      );

      queryClient.setQueryData(
        trpc.patient.getById.queryKey({ id }),
        (old: any) => ({ ...old, isActive: !old.isActive })
      );

      return { previous };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        trpc.patient.getById.queryKey({ id: variables.id }),
        context?.previous
      );
    }
  })
);
```

### Infinite Scroll Pattern

```tsx
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { PatientCard } from './patient-card';

export function PatientInfiniteList({ clinicId }: { clinicId: string }) {
  const trpc = useTRPC();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.patient.infiniteList.infiniteQueryOptions(
      { clinicId, limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: null,
      }
    )
  );

  const patients = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div className="space-y-4">
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

---

## 🚀 Next.js 16 Cache Components with `use cache`

### Service Layer with Caching

```typescript
// src/server/services/stats.service.ts
import { cacheLife, cacheTag } from 'next/cache';
import * as statsQueries from '@/server/db/queries/stats.queries';

export async function getDashboardStats(clinicId: string) {
  'use cache';

  // Configure cache lifetime
  cacheLife({
    stale: 300,      // 5 min stale-while-revalidate
    revalidate: 900, // 15 min background revalidation
    expire: 3600,    // 1 hour max age
  });

  // Tag for targeted revalidation
  cacheTag(`stats-${clinicId}`);

  return statsQueries.getClinicStats(clinicId);
}

// Or use built-in profiles
export async function getPatientStats(clinicId: string) {
  'use cache';
  cacheLife('hours'); // 'minutes', 'hours', 'days', 'weeks', 'max'
  cacheTag(`patient-stats-${clinicId}`);

  return statsQueries.getPatientStats(clinicId);
}
```

### Revalidation in Actions

```typescript
// src/server/actions/appointment.actions.ts
'use server';

import { revalidateTag, updateTag } from 'next/cache';
import { auth } from '@/lib/auth';

export async function createAppointment(input: unknown) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', status: 401 };
    }

    // ... validation and creation logic

    // ✅ updateTag for immediate cache update (within same request)
    updateTag(`patient-${input.patientId}`);
    updateTag(`appointments-${input.clinicId}`);

    // ✅ revalidateTag for stale-while-revalidate
    revalidateTag(`stats-${input.clinicId}`);

    return { success: true, data: appointment, status: 201 };

  } catch (error) {
    return { success: false, message: 'Failed to create appointment', status: 500 };
  }
}
```

### Dynamic Routes with Cache Components

```typescript
// app/patients/[id]/page.tsx (Next.js 16 with Cache Components)
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import { PatientDetails } from '@/components/patient-details';

interface PageProps {
  params: Promise<{ id: string }>; // ⚠️ Must await
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Optional: Generate static params for build-time prerendering
export async function generateStaticParams() {
  const patients = await getTopPatients(); // Your data fetching
  return patients.map((patient) => ({ id: patient.id }));
}

export default async function PatientPage({ params }: PageProps) {
  const { id } = await params; // ⚠️ MUST AWAIT in Next.js 16

  return (
    <div>
      <h1>Patient Profile</h1>
      {/* Static content is part of shell */}
      <nav>Patient Navigation</nav>

      {/* Dynamic content streams in */}
      <Suspense fallback={<PatientSkeleton />}>
        <PatientDetails id={id} />
      </Suspense>

      {/* Cached content - included in static shell */}
      <PatientHistory id={id} />
    </div>
  );
}

// This component is cached and included in static shell
async function PatientHistory({ id }: { id: string }) {
  'use cache';
  cacheLife('days');
  cacheTag(`patient-history-${id}`);

  const history = await getPatientHistory(id);
  return <PatientHistoryView history={history} />;
}
```

---

## 🔐 Authentication & Authorization

### Better Auth Setup

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/server/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    // Add plugins as needed
  ]
});
```

### Protected tRPC Procedures

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@/lib/auth';

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });

  return {
    ...opts,
    session,
    user: session?.user
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware for auth
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user
    }
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

### Permission-Based Authorization

```typescript
// src/server/api/rbac.ts
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@/lib/rbac';

export const requirePermission = (permission: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const userHasPermission = await hasPermission(ctx.user.id, permission);

    if (!userHasPermission) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next({ ctx });
  });

// Usage
export const patientRouter = router({
  delete: protectedProcedure
    .use(requirePermission('patient:delete'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return patientActions.deletePatient(input);
    })
});
```

---

## 🚨 Error Handling

### Action Layer Error Response

```typescript
// src/server/actions/types.ts
export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
  status: number;
};

// Usage in components
const mutation = useMutation(
  trpc.patient.create.mutationOptions({
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Patient created');
      } else {
        toast.error(response.message || 'Something went wrong');
      }
    }
  })
);
```

### tRPC Error Handling

```typescript
// Client component error handling
const { data, error, isLoading } = useQuery(
  trpc.patient.getById.queryOptions({ id })
);

if (error) {
  return (
    <div className="rounded-lg border border-destructive p-4">
      <h3 className="font-semibold text-destructive">Error</h3>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
```

### Global Error Boundary

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
```

---

## 📁 Complete Project Structure

```
smart-clinic/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Auth layout
│   ├── (dashboard)/               # Protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── patients/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Dashboard layout (with auth)
│   ├── api/
│   │   ├── auth/                  # Better Auth routes
│   │   │   └── [...all]/
│   │   │       └── route.ts
│   │   └── trpc/                  # tRPC HTTP handler
│   │       └── route.ts
│   └── layout.tsx                 # Root layout
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── patients/                  # Patient components
│   │   ├── patient-table.tsx
│   │   ├── patient-form.tsx
│   │   └── patient-card.tsx
│   ├── appointments/
│   └── skeletons/                  # Loading skeletons
├── server/
│   ├── db/
│   │   ├── client.ts              # Prisma client
│   │   └── queries/                # QUERY LAYER
│   │       ├── patient.queries.ts
│   │       ├── appointment.queries.ts
│   │       └── clinic.queries.ts
│   ├── services/                    # SERVICE LAYER
│   │   ├── patient.service.ts
│   │   ├── appointment.service.ts
│   │   └── stats.service.ts
│   ├── actions/                      # ACTION LAYER
│   │   ├── patient.actions.ts
│   │   ├── appointment.actions.ts
│   │   └── types.ts
│   └── api/
│       ├── routers/                  # TRANSPORT LAYER
│       │   ├── patient.router.ts
│       │   ├── appointment.router.ts
│       │   ├── clinic.router.ts
│       │   └── index.ts              # Root router
│       └── trpc.ts                    # tRPC setup
├── trpc/
│   ├── client.tsx                     # tRPC client (useTRPC hook)
│   └── server.tsx                      # tRPC server (caller, HydrateClient)
├── lib/
│   ├── auth.ts                         # Better Auth
│   ├── utils.ts
│   └── validations/                     # Zod schemas
│       ├── patient.ts
│       └── appointment.ts
├── hooks/                               # Custom hooks
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## ✅ Key Do's and Don'ts Summary

### ✅ DO:
- **Four-Layer Architecture**: Query → Service → Action → Transport
- **Service Layer**: Use `'use cache'`, `cacheLife`, `cacheTag` for reads
- **Action Layer**: Handle auth, validation, call services/queries, `revalidateTag`
- **Query Layer**: Pure Prisma calls only
- **Client Components**: Use `useTRPC()` with `queryOptions`/`mutationOptions`
- **Invalidation**: Use `queryFilter()` for type-safe invalidation
- **Server Components**: Prefetch with `createCaller()` + `HydrateClient`
- **Next.js 16**: Always `await params` and `searchParams`
- **Error Handling**: Return typed responses from actions, never expose raw DB errors

### ❌ DON'T:
- **Never** put Prisma calls directly in components or tRPC routers
- **Never** use classic tRPC hooks (`trpc.patient.useQuery()`)
- **Never** use `fetch` for internal API calls
- **Never** use `revalidatePath` as substitute for `revalidateTag`
- **Never** use `export const` for actions/services (use `export async function`)
- **Never** expose database errors to client
- **Never** use `middleware.ts` in Next.js 16 (use `proxy.ts` for Node.js)
- **Never** forget to `await params` in pages/layouts

---

## 📚 Version-Specific Notes

### Next.js 16 Breaking Changes
- `params` and `searchParams` are **Promises** - must `await`
- `'use cache'` replaces `unstable_cache`
- `proxy.ts` replaces `middleware.ts` for Node.js runtime
- Turbopack is default (5-10x faster refresh)
- View Transitions API supported natively
- Node.js 18+ required (Node.js 20+ recommended)

### React 19 Features
- `use` hook for consuming promises
- `useOptimistic` for optimistic updates
- `useFormStatus` for form pending states
- `useActionState` for form actions

### tRPC v11 + TanStack Query v5
- Options Proxy pattern is **mandatory**
- No more `useQuery` hooks directly from tRPC
- `queryFilter()` and `pathFilter()` for invalidation
