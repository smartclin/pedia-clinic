// src/trpc/server.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: <ok> */
import 'server-only'

import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import {
	createTRPCOptionsProxy,
	type TRPCQueryOptions,
} from '@trpc/tanstack-react-query'
import { cache } from 'react'

import { createTRPCContext } from '@/server/api/context'
import { type AppRouter, appRouter } from '@/server/api/routers/_app'

import { makeQueryClient } from './query-client'

//
// Query Client (cached per request)
//
export const getQueryClient = cache(makeQueryClient)

//
// tRPC Proxy for RSC usage - Lazy initialization
//
const createServerContext = cache(async () => createTRPCContext())

export const trpc = createTRPCOptionsProxy<AppRouter>({
	router: appRouter,
	// @ts-expect-error - The proxy expects the context object, but we pass a promise which is handled by the proxy internally
	ctx: createServerContext(),
	queryClient: getQueryClient,
})

//
// Direct server caller (for actions / server logic)
//
export const caller = appRouter.createCaller
export async function createCaller() {
	const context = await createServerContext()
	return appRouter.createCaller(context)
}

//
// Types
//

//
// Hydration wrapper (use in layout or page)
//
export function HydrateClient(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient()
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{props.children}
		</HydrationBoundary>
	)
}
//
// Prefetch helper (supports infinite queries)
//

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
	queryOptions: T
) {
	const queryClient = getQueryClient()
	if (queryOptions.queryKey[1]?.type === 'infinite') {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		void queryClient.prefetchInfiniteQuery(queryOptions as any)
	} else {
		void queryClient.prefetchQuery(queryOptions)
	}
}
