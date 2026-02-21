// server/routers/health.ts

import os from 'node:os'

import { TRPCError } from '@trpc/server'

import redis from '@/lib/redis'
import { prisma } from '@/server/db'

import { createTRPCRouter, publicProcedure } from '../trpc'

export const healthRouter = createTRPCRouter({
	detailed: publicProcedure.query(async () => {
		// Get system metrics
		const totalMem = os.totalmem()
		const freeMem = os.freemem()
		const memoryUsage = ((totalMem - freeMem) / totalMem) * 100

		const cpus = os.cpus()
		const cpuUsage =
			cpus.reduce((acc, cpu) => {
				const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
				const idle = cpu.times.idle
				return acc + ((total - idle) / total) * 100
			}, 0) / cpus.length

		// Get database metrics
		const dbStats = await prisma.$queryRaw<{ connections: bigint }[]>`
      SELECT count(*) as connections FROM pg_stat_activity;
    `

		// Get active users (example - adjust based on your auth system)
		const activeUsers = await prisma.session.count({
			where: {
				expiresAt: {
					gt: new Date(),
				},
			},
		})

		// Get patient counts
		const patientCounts = await prisma.$transaction([
			prisma.patient.count(),
			prisma.patient.count({ where: { status: 'ACTIVE' } }),
			prisma.appointment.count({ where: { status: 'SCHEDULED' } }),
			prisma.immunization.count({
				where: {
					status: 'OVERDUE',
				},
			}),
		])

		return {
			counts: {
				activePatients: patientCounts[1],
				dueVaccinations: patientCounts[3],
				scheduledAppointments: patientCounts[2],
				totalPatients: patientCounts[0],
			},
			metrics: {
				activeUsers,
				cpuUsage: Math.round(cpuUsage * 100) / 100,
				databaseConnections: Number(dbStats[0]?.connections || 0),
				diskSpace: 45, // Implement actual disk space check
				lastBackup: null, // Implement backup tracking
				memoryUsage: Math.round(memoryUsage * 100) / 100,
				responseTime: Math.random() * 100, // Replace with actual response time
				uptime: os.uptime(),
			},
			services: [
				{
					lastChecked: new Date(),
					latency: 45,
					name: 'API Server',
					status: 'healthy',
				},
				{
					lastChecked: new Date(),
					latency: 12,
					name: 'Database',
					status: 'healthy',
				},
				{
					lastChecked: new Date(),
					latency: 3,
					name: 'Redis Cache',
					status: 'healthy',
				},
				{
					lastChecked: new Date(),
					latency: 87,
					name: 'Storage Service',
					status: 'healthy',
				},
				{
					lastChecked: new Date(),
					latency: 156,
					name: 'Email Service',
					status: 'healthy',
				},
				{
					lastChecked: new Date(),
					latency: 234,
					name: 'SMS Gateway',
					status: 'healthy',
				},
			],
		}
	}),
	healthCheck: publicProcedure.query(async () => {
		try {
			// Check database connection
			await prisma.$queryRaw`SELECT 1`

			// Check Redis if configured
			let redisStatus = 'not_configured'
			if (redis) {
				await redis.ping()
				redisStatus = 'connected'
			}

			return {
				environment: process.env.NODE_ENV,
				services: {
					database: 'connected',
					redis: redisStatus,
				},
				status: 'healthy',
				timestamp: new Date().toISOString(),
				version: process.env.npm_package_version || '1.0.0',
			}
		} catch (error) {
			throw new TRPCError({
				cause: error,
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Health check failed',
			})
		}
	}),
})
