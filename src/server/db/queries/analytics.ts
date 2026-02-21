// src/server/db/queries/analytics.ts

import { dedupeQuery } from '@/cache/dedupe'

import { prisma } from '..'

export type DailyRevenue = {
	date: string
	revenue: number
}

export const analyticsQueries = {
	/**
	 * Get daily revenue for a date range
	 * - Returns array of { date: string, revenue: number }
	 */

	getDailyRevenueQuery: dedupeQuery(async (from: Date, to: Date) => {
		const result = await prisma.$queryRaw<
			Array<{ date: Date; revenue: number }>
		>`
      SELECT
        DATE(created_at) as date,
      SUM(amount) as revenue
    FROM payments
    WHERE
      created_at >= ${from}
      AND created_at <= ${to}
      AND status = 'PAID'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

		return result.map(
			(row: { date: { toISOString: () => string }; revenue: number }) => ({
				date: row.date.toISOString().split('T')[0],
				revenue: Number(row.revenue),
			})
		)
	}),
	getTotalRevenueQuery: dedupeQuery(
		async (from: Date, to: Date): Promise<number> => {
			const result = await prisma.payment.aggregate({
				where: {
					createdAt: { gte: from, lte: to },
					status: 'PAID',
				},
				_sum: { amount: true },
			})

			return Number(result._sum.amount ?? 0)
		}
	),
}
