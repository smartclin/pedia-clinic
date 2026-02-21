'use client'

import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { httpBatchStreamLink, loggerLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import SuperJSON from 'superjson'

import { getBaseUrl } from '@/lib/utils'
import { makeQueryClient } from '@/trpc/query-client'

import type { AppRouter } from '../../server/api/routers/_app'

let clientQueryClientSingleton: QueryClient | undefined

const getQueryClient = () => {
	if (typeof globalThis === 'undefined') {
		// server: always create a new query client
		return makeQueryClient()
	}
	// browser: keep the same query client
	if (!clientQueryClientSingleton) {
		clientQueryClientSingleton = makeQueryClient()
	}
	return clientQueryClientSingleton
}

export const api = createTRPCReact<AppRouter>()

type TTRPCProviderProps = PropsWithChildren

export function TRPCProvider({ children }: Readonly<TTRPCProviderProps>) {
	const queryClient = getQueryClient()

	const [trpcClient] = useState(() =>
		api.createClient({
			links: [
				loggerLink({
					enabled: op =>
						process.env.NODE_ENV === 'development' ||
						(op.direction === 'down' && op.result instanceof Error),
				}),
				httpBatchStreamLink({
					transformer: SuperJSON,
					url: `${getBaseUrl()}/api/trpc`,
					headers: () => {
						const headers = new Headers()
						headers.set('x-trpc-source', 'nextjs-react')
						return headers
					},
				}),
			],
		})
	)

	return (
		<QueryClientProvider client={queryClient}>
			<api.Provider
				client={trpcClient}
				queryClient={queryClient}
			>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</api.Provider>
		</QueryClientProvider>
	)
}
