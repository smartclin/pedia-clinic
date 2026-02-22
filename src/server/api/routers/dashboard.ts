import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	calculateGrowthChecksPending,
	calculateImmunizationsCompleted,
	calculateImmunizationsDue,
	calculateMonthlyRevenue,
} from '@/utils/vaccine'

import { calculateAgeInMonths, calculateFullAge } from '../../../utils'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

const getStatsSchema = z.object({
	clinicId: z.string(),
})

const recentPatientsSchema = z.object({
	clinicId: z.string(),
	limit: z.number().min(1).max(50).default(5),
})

export const dashboardRouter = createTRPCRouter({
	/**
	 * Get dashboard statistics
	 */
	getClinicOverview: publicProcedure.query(async ({ ctx }) => {
		try {
			const [totalPatients, totalAppointments, activeDoctors, recentRecords] =
				await Promise.all([
					ctx.prisma.patient.count({
						where: { isDeleted: false },
					}),
					ctx.prisma.appointment.count({
						where: {
							isDeleted: false,
							appointmentDate: {
								gte: new Date(new Date().setHours(0, 0, 0, 0)),
							},
						},
					}),
					ctx.prisma.doctor.count({
						where: {
							isActive: true,
							isDeleted: false,
						},
					}),
					ctx.prisma.medicalRecords.count({
						where: {
							isDeleted: false,
							createdAt: {
								gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
							},
						},
					}),
				])

			return {
				totalPatients,
				totalAppointments,
				activeDoctors,
				recentRecords,
				growthRate: 12, // This could be calculated from real data
			}
		} catch (error) {
			console.error(error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch clinic overview',
			})
		}
	}),

	// Get recent activities
	getRecentActivities: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(20).default(5) }))
		.query(async ({ ctx, input }) => {
			const activities = await ctx.prisma.auditLog.findMany({
				take: input.limit,
				orderBy: { createdAt: 'desc' },
				include: {
					user: {
						select: {
							name: true,
							image: true,
						},
					},
					clinic: {
						select: {
							name: true,
						},
					},
				},
				where: {
					createdAt: {
						gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
					},
				},
			})

			return activities.map(activity => ({
				id: activity.id,
				action: activity.action,
				user: activity.user?.name || 'System',
				userImage: activity.user?.image,
				timestamp: activity.createdAt,
				details: activity.details,
				clinic: activity.clinic?.name,
			}))
		}),

	// Get upcoming appointments
	getUpcomingAppointments: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(10).default(5) }))
		.query(async ({ ctx, input }) => {
			const appointments = await ctx.prisma.appointment.findMany({
				take: input.limit,
				where: {
					isDeleted: false,
					status: 'SCHEDULED',
					appointmentDate: {
						gte: new Date(),
					},
				},
				orderBy: { appointmentDate: 'asc' },
				include: {
					patient: {
						select: {
							firstName: true,
							lastName: true,
							image: true,
						},
					},
					doctor: {
						select: {
							name: true,
							specialty: true,
						},
					},
				},
			})

			return appointments.map(apt => ({
				id: apt.id,
				patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
				patientImage: apt.patient.image,
				doctorName: apt.doctor.name,
				doctorSpecialty: apt.doctor.specialty,
				date: apt.appointmentDate,
				time: apt.time,
				type: apt.type,
			}))
		}),

	// Get recent patients
	getRecentPatients: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(10).default(5) }))
		.query(async ({ ctx, input }) => {
			const patients = await ctx.prisma.patient.findMany({
				take: input.limit,
				where: { isDeleted: false },
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					firstName: true,
					lastName: true,
					image: true,
					dateOfBirth: true,
					gender: true,
					createdAt: true,
					appointments: {
						take: 1,
						orderBy: { createdAt: 'desc' },
						select: { appointmentDate: true },
					},
				},
			})

			return patients.map(patient => ({
				id: patient.id,
				name: `${patient.firstName} ${patient.lastName}`,
				image: patient.image,
				age: calculateFullAge(patient.dateOfBirth),
				gender: patient.gender,
				lastVisit: patient.appointments[0]?.appointmentDate,
				registeredAt: patient.createdAt,
			}))
		}),
	getStats: protectedProcedure
		.input(getStatsSchema)
		.query(async ({ ctx, input }) => {
			const { clinicId } = input
			const today = new Date()
			today.setHours(0, 0, 0, 0)

			const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
			const startOfLastMonth = new Date(
				today.getFullYear(),
				today.getMonth() - 1,
				1
			)

			try {
				// Parallel queries with deduplication
				const [
					totalPatients,
					activePatients,
					newPatientsThisMonth,
					newPatientsLastMonth,
					todayAppointments,
					yesterdayAppointments,
					completedAppointments,
					immunizationsDue,
					lastMonthImmunizations,
					growthChecksPending,
					activeDoctors,
					monthlyRevenue,
					lastMonthRevenue,
				] = await Promise.all([
					// Patient counts
					ctx.prisma.patient.count({ where: { clinicId, isDeleted: false } }),
					ctx.prisma.patient.count({
						where: { clinicId, isDeleted: false, status: 'ACTIVE' },
					}),
					ctx.prisma.patient.count({
						where: {
							clinicId,
							createdAt: { gte: startOfMonth },
							isDeleted: false,
						},
					}),
					ctx.prisma.patient.count({
						where: {
							clinicId,
							createdAt: { gte: startOfLastMonth, lt: startOfMonth },
							isDeleted: false,
						},
					}),

					// Appointment counts
					ctx.prisma.appointment.count({
						where: {
							appointmentDate: { gte: today },
							clinicId,
							isDeleted: false,
						},
					}),
					ctx.prisma.appointment.count({
						where: {
							appointmentDate: {
								gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
								lt: today,
							},
							clinicId,
							isDeleted: false,
						},
					}),
					ctx.prisma.appointment.count({
						where: {
							clinicId,
							isDeleted: false,
							status: 'COMPLETED',
						},
					}),

					// Immunization stats
					calculateImmunizationsDue(clinicId),
					calculateImmunizationsCompleted(
						clinicId,
						startOfLastMonth,
						startOfMonth
					),
					calculateGrowthChecksPending(clinicId),

					// Doctor stats
					ctx.prisma.doctor.count({
						where: {
							clinicId,
							isActive: true,
							isDeleted: false,
						},
					}),

					// Revenue stats
					calculateMonthlyRevenue(clinicId, startOfMonth),
					calculateMonthlyRevenue(clinicId, startOfLastMonth, startOfMonth),
				])

				// Calculate trends
				const patientTrend =
					newPatientsLastMonth > 0
						? (
								((newPatientsThisMonth - newPatientsLastMonth) /
									newPatientsLastMonth) *
								100
							).toFixed(1)
						: '0'

				const appointmentTrend =
					yesterdayAppointments > 0
						? (
								((todayAppointments - yesterdayAppointments) /
									yesterdayAppointments) *
								100
							).toFixed(1)
						: '0'

				const immunizationTrend =
					lastMonthImmunizations > 0
						? (
								((immunizationsDue - lastMonthImmunizations) /
									lastMonthImmunizations) *
								100
							).toFixed(1)
						: '0'

				const revenueGrowth =
					lastMonthRevenue > 0
						? (
								((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) *
								100
							).toFixed(1)
						: '0'

				return {
					activeDoctors,
					activePatients,
					appointmentTrend: Number(appointmentTrend),
					completedAppointments,

					growthChecksPending,
					growthTrend: growthChecksPending.toString(),

					immunizationsDue,
					immunizationTrend: Number(immunizationTrend),

					monthlyRevenue,
					newPatientsThisMonth,
					patientTrend: Number(patientTrend),
					revenueGrowth: Number(revenueGrowth),

					todayAppointments,
					totalPatients,
				}
			} catch (error) {
				console.error('Error fetching dashboard stats:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch dashboard statistics',
				})
			}
		}),

	/**
	 * Get recent patients
	 */
	recent: protectedProcedure
		.input(recentPatientsSchema)
		.query(async ({ ctx, input }) => {
			const { clinicId, limit } = input

			const patients = await ctx.prisma.patient.findMany({
				orderBy: { createdAt: 'desc' },
				select: {
					appointments: {
						orderBy: { appointmentDate: 'desc' },
						select: { appointmentDate: true },
						take: 1,
					},
					createdAt: true,
					dateOfBirth: true,
					email: true,
					firstName: true,
					gender: true,
					id: true,
					image: true,
					lastName: true,
					phone: true,
					status: true,
				},
				take: limit,
				where: { clinicId, isDeleted: false },
			})

			return patients.map(
				(patient: {
					dateOfBirth: Date
					appointments: { appointmentDate: Date }[]
				}) => ({
					...patient,
					ageMonths: calculateAgeInMonths(patient.dateOfBirth),
					lastVisit: patient.appointments[0]?.appointmentDate || null,
				})
			)
		}),
})
