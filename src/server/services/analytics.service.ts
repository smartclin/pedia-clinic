// src/server/services/analytics.ts
import { cacheLife, cacheTag } from 'next/cache'

import { analyticsQueries } from '../db/queries/analytics'

export async function getRevenueAnalytics(from: Date, to: Date) {
	'use cache'
	cacheLife('minutes') // Cache for 5 minutes (adjust based on needs)
	cacheTag(`analytics-revenue-${from.toISOString()}-${to.toISOString()}`)

	const [dailyRevenue, totalRevenue] = await Promise.all([
		analyticsQueries.getDailyRevenueQuery(from, to),
		analyticsQueries.getTotalRevenueQuery(from, to),
	])

	return {
		daily: dailyRevenue,
		total: totalRevenue,
	}
}
