'use client'

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { useState } from 'react'
import superjson from 'superjson'

import type { AppRouter } from '@/server/api/routers/_app'

import { makeQueryClient } from './query-client'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
export const trpc = createTRPCReact<AppRouter>()
let browserQueryClient: QueryClient | undefined

function getQueryClient() {
	if (typeof window === 'undefined') {
		return makeQueryClient()
	}

	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient()
	}

	return browserQueryClient
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient()

	const [trpcClient] = useState(() =>
		createTRPCClient<AppRouter>({
			links: [
				httpBatchLink({
					url: '/api/trpc', // no need for absoluteUrl in client component
					transformer: superjson,
				}),
			],
		})
	)

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider
				queryClient={queryClient}
				trpcClient={trpcClient}
			>
				{children}
			</TRPCProvider>
		</QueryClientProvider>
	)
}
