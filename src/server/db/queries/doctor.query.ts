// modules/doctor/doctor.query.ts

import { endOfDay, startOfDay } from 'date-fns'

import { dedupeQuery } from '@/cache/dedupe'
import type { Prisma } from '@/prisma/browser'
import { db } from '@/server/db'
import { daysOfWeek } from '@/utils'

/**
 * 🔵 PURE QUERY LAYER
 * - NO business logic
 * - NO cache directives
 * - NO auth/session
 * - RAW Prisma only
 * - Wrapped with dedupeQuery
 */
export const doctorQueries = {
	// ==================== COUNTS ====================

	countAppointments: dedupeQuery(async (doctorId: string, clinicId: string) => {
		return await db.appointment.count({
			where: {
				clinicId,
				doctorId,
				isDeleted: false,
				status: { not: 'CANCELLED' },
			},
		})
	}),

	countUpcomingAppointments: dedupeQuery(
		async (doctorId: string, clinicId: string) => {
			return await db.appointment.count({
				where: {
					appointmentDate: { gte: new Date() },
					clinicId,
					doctorId,
					isDeleted: false,
					status: { in: ['SCHEDULED', 'PENDING'] },
				},
			})
		}
	),

	delete: dedupeQuery(async (id: string, clinicId: string) => {
		return await db.doctor.update({
			data: {
				availabilityStatus: 'UNAVAILABLE',
				deletedAt: new Date(),
				isDeleted: true,
				status: 'INACTIVE',
			},
			where: { clinicId, id },
		})
	}),
	// ==================== BASIC CRUD ====================

	findAll: dedupeQuery(async () => {
		return db.doctor.findMany({
			orderBy: { name: 'asc' },
			where: { isDeleted: false },
		})
	}),

	findAvailableToday: dedupeQuery(async (clinicId: string, date?: Date) => {
		const today = daysOfWeek[new Date().getDay()] ?? ''
		const targetDate = date || new Date()

		return db.doctor.findMany({
			orderBy: { name: 'asc' },
			select: {
				appointments: {
					orderBy: { appointmentDate: 'desc' },
					select: {
						appointmentDate: true,
						id: true,
						patient: {
							select: {
								colorCode: true,
								dateOfBirth: true,
								firstName: true,
								gender: true,
								id: true,
								image: true,
								lastName: true,
							},
						},
					},
					take: 5,
					where: {
						appointmentDate: {
							gte: startOfDay(targetDate),
							lt: endOfDay(targetDate),
						},
						isDeleted: false,
					},
				},
				colorCode: true,
				id: true,
				img: true,
				name: true,
				specialty: true,
				workingDays: true,
			},
			where: {
				availabilityStatus: 'AVAILABLE',
				clinicId,
				isDeleted: false,
				workingDays: {
					some: {
						day: { equals: today, mode: 'insensitive' },
					},
				},
			},
		})
	}),

	findByClinic: dedupeQuery(async (clinicId: string) => {
		return db.doctor.findMany({
			orderBy: { name: 'asc' },
			where: {
				clinicId,
				isDeleted: false,
			},
		})
	}),

	findById: dedupeQuery(async (id: string) => {
		return db.doctor.findUnique({
			select: {
				availabilityStatus: true,
				availableFromTime: true,
				availableFromWeekDay: true,
				availableToTime: true,
				availableToWeekDay: true,
				colorCode: true,
				id: true,
				img: true,
				name: true,
				specialty: true,
				workingDays: true,
			},
			where: { id, isDeleted: false },
		})
	}),

	findByIdWithClinicCheck: dedupeQuery(async (id: string, clinicId: string) => {
		return db.doctor.findFirst({
			where: {
				clinicId,
				id,
				isDeleted: false,
			},
		})
	}),

	findByUserId: dedupeQuery(async (userId: string) => {
		return db.doctor.findUnique({
			where: { isDeleted: false, userId },
		})
	}),

	// ==================== PAGINATION & SEARCH ====================

	findPaginated: dedupeQuery(
		async (params: {
			clinicId?: string
			search?: string
			skip: number
			take: number
		}) => {
			const where: Prisma.DoctorWhereInput = {
				isDeleted: false,
			}

			if (params.clinicId) {
				where.clinicId = params.clinicId
			}

			if (params.search) {
				where.OR = [
					{ name: { contains: params.search, mode: 'insensitive' } },
					{ specialty: { contains: params.search, mode: 'insensitive' } },
					{ email: { contains: params.search, mode: 'insensitive' } },
				]
			}

			return Promise.all([
				db.doctor.findMany({
					include: {
						workingDays: true,
					},
					orderBy: { name: 'asc' },
					skip: params.skip,
					take: params.take,
					where,
				}),
				db.doctor.count({ where }),
			])
		}
	),

	// ==================== SCHEDULE & AVAILABILITY ====================

	findTodaySchedule: dedupeQuery(async (clinicId: string) => {
		const todayStart = startOfDay(new Date())
		const todayEnd = endOfDay(new Date())

		return db.doctor.findMany({
			include: {
				appointments: {
					include: {
						patient: {
							select: {
								colorCode: true,
								firstName: true,
								id: true,
								image: true,
								lastName: true,
							},
						},
					},
					orderBy: { appointmentDate: 'asc' },
					where: {
						appointmentDate: { gte: todayStart, lt: todayEnd },
						isDeleted: false,
					},
				},
			},
			where: {
				availabilityStatus: 'AVAILABLE',
				clinicId,
				isDeleted: false,
			},
		})
	}),

	findWithAppointments: dedupeQuery(
		async (id: string, clinicId: string, take = 10) => {
			return db.doctor.findUnique({
				include: {
					appointments: {
						include: {
							patient: {
								select: {
									colorCode: true,
									dateOfBirth: true,
									firstName: true,
									gender: true,
									id: true,
									image: true,
									lastName: true,
								},
							},
						},
						orderBy: { appointmentDate: 'desc' },
						take: typeof take === 'number' ? take : undefined,
						where: { isDeleted: false },
					},
					workingDays: true,
				},
				where: {
					clinicId,
					id,
					isDeleted: false,
				},
			})
		}
	),

	// ==================== DASHBOARD STATS ====================

	getDashboardCounts: dedupeQuery(
		async (doctorId: string, clinicId: string, todayStart: Date) => {
			const [appointments, totalPatients, availableDoctors] = await Promise.all(
				[
					db.appointment.findMany({
						include: {
							patient: {
								select: {
									colorCode: true,
									dateOfBirth: true,
									firstName: true,
									gender: true,
									id: true,
									image: true,
									lastName: true,
									user: { select: { image: true } },
								},
							},
						},
						orderBy: { appointmentDate: 'desc' },
						where: {
							appointmentDate: { gte: todayStart },
							clinicId,
							doctorId,
							isDeleted: false,
							status: { not: 'CANCELLED' },
						},
					}),
					db.patient.count({
						where: {
							clinicId,
							isDeleted: false,
						},
					}),
					db.doctor.count({
						where: {
							availabilityStatus: 'AVAILABLE',
							clinicId,
							isDeleted: false,
						},
					}),
				]
			)

			return { appointments, availableDoctors, totalPatients }
		}
	),

	// ==================== WORKING DAYS ====================

	getWorkingDays: dedupeQuery(async (doctorId: string) => {
		return await db.workingDays.findMany({
			where: {
				doctorId,
			},
		})
	}),

	hardDelete: dedupeQuery(async (id: string, clinicId: string) => {
		return await db.$transaction(async (tx: Prisma.TransactionClient) => {
			await tx.workingDays.deleteMany({
				where: { doctorId: id },
			})

			return tx.doctor.delete({
				where: { clinicId, id },
			})
		})
	}),

	// ==================== MUTATIONS ====================

	upsert: dedupeQuery(
		async (data: {
			id?: string
			clinicId: string
			userId: string
			name: string
			email?: string
			specialty: string
			phone?: string
			address?: string
			img?: string
			colorCode?: string
			availableFromTime?: string
			availableToTime?: string
			appointmentPrice: number
			workingDays?: Array<{
				day: string
				startTime: string
				closeTime: string
			}>
		}) => {
			const { workingDays, ...doctorData } = data

			return await db.$transaction(async (tx: Prisma.TransactionClient) => {
				// Upsert doctor
				const doctor = await tx.doctor.upsert({
					create: {
						...doctorData,
						id: data.id || undefined,
						role: 'DOCTOR',
						status: 'ACTIVE',
					},
					update: {
						...doctorData,
						workingDays: workingDays
							? {
									create: workingDays.map(day => ({
										...day,
										clinicId: data.clinicId,
										day: day.day.toLowerCase(),
									})),
									deleteMany: {},
								}
							: undefined,
					},
					where: { id: data.id || '' },
				})

				await tx.workingDays.deleteMany({
					where: { doctorId: doctor.id },
				})

				return doctor
			})
		}
	),
}
