# tRPC v11 + TanStack Query v5 Usage Guide

This document outlines the standard and best practices for using tRPC in the **Pedia Clinic** project, specifically focusing on Client Components. These patterns are based on the robust implementation found in `src/components/action-dialog.tsx`.

## Core Philosophy

We use **tRPC v11** with **TanStack Query v5**. The key to this integration is the **tRPC Options Proxy**, which allows us to use standard TanStack Query hooks (`useQuery`, `useMutation`) while maintaining full type safety and tRPC's automatic query key management.

---

## 1. Mutations (Recommended Pattern)

For operations that change data (POST, PATCH, DELETE), use the following pattern:

### Standard Implementation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc"; // Path to your tRPC proxy
import { toast } from "sonner";

export const MyComponent = ({ clinicId, id }) => {
  const queryClient = useQueryClient();

  // 1. Define the mutation using trpc proxy options
  const deleteMutation = useMutation(
    trpc.admin.deleteDataById.mutationOptions({
      onSuccess: () => {
        toast.success("Record deleted successfully");
        
        // 2. Refresh the server state (Next.js action)
        router.refresh();

        // 3. Invalidate relevant queries (Client state)
        // Use .queryFilter() to target specific queries type-safely
        queryClient.invalidateQueries(
          trpc.admin.getDataList.queryFilter({
            clinicId,
          })
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete record");
      },
    })
  );

  const handleDelete = () => {
    // 4. Trigger the mutation with the expected input type
    deleteMutation.mutate({ id, deleteType: "doctor", clinicId });
  };

  return (
    <Button 
      onClick={handleDelete} 
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? "Processing..." : "Delete"}
    </Button>
  );
};
```

### Why this is "Best Usage":
- **`mutationOptions`**: Automatically provides the correct `mutationFn` and `mutationKey`.
- **`queryFilter`**: Ensures that when you invalidate, you are using the exact same key structure that tRPC uses internally.
- **Type Safety**: The `mutate` function will error if you pass incorrect input types.

---

## 2. Queries (Recommended Pattern)

For fetching data, use the `queryOptions` helper.

### Standard Implementation

```tsx
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export const PatientProfile = ({ patientId }) => {
  // Use useQuery with queryOptions helper
  const { data: patient, isLoading, error } = useQuery(
    trpc.patient.getFullDataById.queryOptions(patientId)
  );

  if (isLoading) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{patient.firstName} {patient.lastName}</div>;
};
```

### Why this is "Best Usage":
- **Simplified Syntax**: No need to manually define `queryKey` or `queryFn`.
- **Composition**: You can spread other TanStack Query options into `queryOptions` if needed (e.g., `enabled`, `staleTime`).

---

## 3. Query Invalidation Strategies

When data changes, you must ensure the UI updates. We combine two methods:

1.  **`router.refresh()`**: Triggers a server-side re-render (useful for Server Components on the page).
2.  **`queryClient.invalidateQueries()`**: Forces TanStack Query to refetch data on the client.

### Target Invalidation

Always use the most specific filter possible to avoid over-fetching:

```tsx
// Specific invalidation
queryClient.invalidateQueries(
  trpc.patient.getById.queryFilter(patientId)
);

// Broad invalidation (invalidates all queries under the 'patient' router)
queryClient.invalidateQueries(
  trpc.patient.pathFilter()
);
```

---

## 4. Server-Side Usage (`HydrateClient`)

When pre-fetching data in Server Components (for SEO and instant load):

```tsx
// src/components/my-container.tsx
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const MyContainer = async ({ id }) => {
  // 1. Prefetch data on the server
  void prefetch(trpc.patient.getFullDataById.queryOptions(id));

  return (
    <HydrateClient>
      {/* 2. Client components inside will instantly have data available */}
      <MyClientComponent id={id} />
    </HydrateClient>
  );
};
```

---

## Key Takeaways

| Feature | Standard Hook | tRPC Helper |
| :--- | :--- | :--- |
| **Fetch Data** | `useQuery` | `.queryOptions(input)` |
| **Action** | `useMutation` | `.mutationOptions(callbacks)` |
| **Invalidation**| `queryClient.invalidateQueries` | `.queryFilter(input)` or `.pathFilter()` |
| **Infinite** | `useInfiniteQuery`| `.infiniteQueryOptions(input)` |

By following these patterns, you ensure that the **Pedia Clinic** codebase remains maintainable, type-safe, and performs optimally with React 18/19 and Next.js 14/15.
