// src/data/stats.ts
import { prisma } from '@/server/db'

export type RealTimeStats = {
	activePatientsToday: number
	avgWaitTime: number
	satisfactionRate: number
	emergencyCases: number
	isLive: boolean
}

export async function getRealTimeStats(): Promise<RealTimeStats> {
	const todayStart = new Date()
	todayStart.setHours(0, 0, 0, 0)

	const todayEnd = new Date()
	todayEnd.setHours(23, 59, 59, 999)

	const [activePatientsToday, emergencyCases, avgWait, satisfactionAvg] =
		await prisma.$transaction([
			prisma.appointment.count({
				where: {
					createdAt: {
						gte: todayStart,
						lte: todayEnd,
					},
					status: 'COMPLETED',
				},
			}),

			prisma.appointment.count({
				where: {
					createdAt: {
						gte: todayStart,
						lte: todayEnd,
					},
					type: 'EMERGENCY',
				},
			}),

			prisma.appointment.aggregate({
				_avg: {
					duration: true,
				},
				where: {
					createdAt: {
						gte: todayStart,
						lte: todayEnd,
					},
					duration: {
						not: null,
					},
				},
			}),

			prisma.rating.aggregate({
				_avg: {
					rating: true,
				},
				where: {
					createdAt: {
						gte: todayStart,
						lte: todayEnd,
					},
				},
			}),
		])

	return {
		activePatientsToday,
		emergencyCases,
		avgWaitTime: Math.round(avgWait._avg.duration ?? 0),
		satisfactionRate: Math.round((satisfactionAvg._avg.rating ?? 0) * 20), // convert 1-5 → %
		isLive: true,
	}
}
