import {
	dehydrate,
	type FetchInfiniteQueryOptions,
	type FetchQueryOptions,
	HydrationBoundary,
} from '@tanstack/react-query'

import { getQueryClient } from './server'

export function HydrateClient({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient()

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{children}
		</HydrationBoundary>
	)
}

export function prefetch<
	T extends
		| FetchQueryOptions<
				unknown,
				Error,
				unknown,
				[string, { type: 'other' | 'infinite' }],
				unknown
		  >
		| FetchInfiniteQueryOptions<
				unknown,
				Error,
				unknown,
				[string, { type: 'other' | 'infinite' }],
				unknown
		  >,
>(queryOptions: T) {
	const queryClient = getQueryClient()

	if (queryOptions.queryKey[1]?.type === 'infinite') {
		// If it's an infinite query, make sure to pass initialPageParam
		void queryClient.prefetchInfiniteQuery(
			queryOptions as FetchInfiniteQueryOptions
		)
	} else {
		void queryClient.prefetchQuery(queryOptions as FetchQueryOptions)
	}
}
