import {
	addDays,
	endOfDay,
	endOfMonth,
	startOfDay,
	startOfMonth,
	subDays,
	subMonths,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

import { dedupeQuery } from '@/cache/dedupe'
import { db } from '@/server/db'

const TIMEZONE = 'Africa/Cairo'
/**
 * 🔵 PURE QUERY LAYER
 * - NO business logic
 * - NO cache directives
 * - NO auth/session
 * - RAW Prisma only
 */
export const clinicQueries = {
	countUserClinics: dedupeQuery(async (userId: string) => {
		return db.clinicMember.count({
			where: { userId },
		})
	}),

	// ==================== WRITE OPERATIONS ====================

	createClinic: dedupeQuery(async (data: { name: string }) => {
		return db.clinic.create({
			data: {
				...data,
			},
		})
	}),

	createClinicMember: dedupeQuery(
		async (data: { userId: string; roleId: string; clinicId: string }) => {
			return db.clinicMember.create({
				data,
			})
		}
	),

	createRating: dedupeQuery(
		async (data: {
			patientId: string
			staffId: string
			rating: number
			comment: string
		}) => {
			return db.rating.create({
				data,
			})
		}
	),
	// ==================== READ OPERATIONS ====================

	findById: dedupeQuery(async (id: string) => {
		return db.clinic.findUnique({
			where: { id },
		})
	}),

	findClinicHoursById: dedupeQuery(async (clinicId: string) => {
		return db.workingDays.findMany({
			orderBy: { day: 'asc' },
			where: { clinicId },
		})
	}),

	findClinicWithUserAccess: dedupeQuery(
		async (clinicId: string, userId: string) => {
			return db.clinicMember.findUnique({
				include: {
					clinic: true,
				},
				where: {
					clinicId_userId: {
						clinicId,
						userId,
					},
				},
			})
		}
	),

	getClinicStats: dedupeQuery(async () => {
		return db.$transaction([
			db.doctor.count({ where: { isActive: true, isDeleted: false } }),
			db.patient.count({ where: { isActive: true, isDeleted: false } }),
			db.appointment.count({
				where: {
					appointmentDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
					isDeleted: false,
				},
			}),
			db.rating.aggregate({
				_avg: { rating: true },
			}),
		])
	}),
	getDashboardStats: dedupeQuery(
		async (clinicId: string, from: Date, to: Date) => {
			const now = new Date()
			const chartStartDate = startOfDay(subDays(now, 10))
			const chartEndDate = endOfDay(addDays(now, 10))

			const todayStart = toZonedTime(startOfDay(now), TIMEZONE)
			const todayEnd = toZonedTime(endOfDay(now), TIMEZONE)

			return await db.$transaction([
				db.appointment.aggregate({
					_sum: { appointmentPrice: true },
					where: {
						appointmentDate: { gte: from, lte: to },
						clinicId,
						isDeleted: false,
					},
				}),
				db.appointment.count({
					where: {
						appointmentDate: { gte: from, lte: to },
						clinicId,
						isDeleted: false,
					},
				}),
				db.patient.count({
					where: { clinicId, isDeleted: false },
				}),
				db.doctor.count({
					where: { clinicId, isDeleted: false },
				}),
				db.doctor.findMany({
					orderBy: { appointments: { _count: 'desc' } },
					select: {
						_count: {
							select: {
								appointments: {
									where: {
										appointmentDate: { gte: from, lte: to },
										isDeleted: false,
									},
								},
							},
						},
						id: true,
						img: true,
						name: true,
						ratings: {
							select: {
								rating: true,
							},
						},
						specialty: true,
					},
					take: 10,
					where: {
						clinicId,
						isDeleted: false,
					},
				}),
				db.appointment.findMany({
					include: {
						doctor: {
							select: {
								colorCode: true,
								id: true,
								img: true,
								name: true,
								specialty: true,
							},
						},
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
					where: {
						appointmentDate: { gte: todayStart, lte: todayEnd },
						clinicId,
						isDeleted: false,
					},
				}),
				db.appointment.groupBy({
					_count: { _all: true },
					_sum: { appointmentPrice: true },
					by: ['appointmentDate'],
					orderBy: { appointmentDate: 'asc' },
					where: {
						appointmentDate: { gte: chartStartDate, lte: chartEndDate },
						clinicId,
						isDeleted: false,
					},
				}),
				db.service.count({
					where: {
						clinicId,
						isAvailable: true,
						isDeleted: false,
					},
				}),
			])
		}
	),

	getFeatures: dedupeQuery(async () => {
		return db.feature.findMany({
			orderBy: { order: 'asc' },
			select: {
				color: true,
				description: true,
				icon: true,
				id: true,
				title: true,
			},
			where: { isActive: true },
		})
	}),

	getGeneralStats: dedupeQuery(async () => {
		return db.$transaction([
			db.patient.count({ where: { isDeleted: false } }),
			db.doctor.count({ where: { isDeleted: false } }),
			db.appointment.count({ where: { isDeleted: false } }),
			db.appointment.count({
				where: {
					isDeleted: false,
					status: 'COMPLETED',
				},
			}),
		])
	}),

	// ==================== MEDICAL RECORDS ====================

	getMedicalRecordsSummary: dedupeQuery(async (clinicId: string) => {
		const now = new Date()
		const startOfCurrentMonth = startOfMonth(now)
		const endOfCurrentMonth = endOfMonth(now)
		const startOfPreviousMonth = startOfMonth(subMonths(now, 1))
		const endOfPreviousMonth = endOfMonth(subMonths(now, 1))

		return await db.$transaction([
			db.medicalRecords.count({
				where: { clinicId, isDeleted: false },
			}),
			db.medicalRecords.count({
				where: {
					clinicId,
					createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
					isDeleted: false,
				},
			}),
			db.medicalRecords.count({
				where: {
					clinicId,
					createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
					isDeleted: false,
				},
			}),
			db.medicalRecords.findMany({
				orderBy: { createdAt: 'desc' },
				select: {
					appointmentId: true,
					clinicId: true,
					createdAt: true,
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
						},
					},
					id: true,
					patient: {
						select: {
							email: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
					patientId: true,
					treatmentPlan: true,
				},
				take: 10,
				where: { clinicId, isDeleted: false },
			}),
		])
	}),

	// ==================== PERFORMANCE ====================

	getMonthlyPerformance: dedupeQuery(async (clinicId: string) => {
		const currentYear = new Date().getFullYear()

		const data = await db.$queryRaw<
			{ month: number; visits: number; revenue: number }[]
		>`
      SELECT
        EXTRACT(MONTH FROM "appointmentDate") AS month,
        COUNT(*) AS visits,
        COALESCE(SUM("appointmentPrice"), 0) AS revenue
      FROM "Appointment"
      WHERE
        EXTRACT(YEAR FROM "appointmentDate") = ${currentYear}
        AND "clinicId" = ${clinicId}
        AND "isDeleted" = false
      GROUP BY month
      ORDER BY month
    `

		return data
	}),

	// ==================== APPOINTMENTS ====================

	getRecentAppointments: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		return await db.appointment.findMany({
			include: {
				doctor: {
					select: {
						colorCode: true,
						id: true,
						img: true,
						name: true,
						specialty: true,
					},
				},
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
				appointmentDate: { gte: startOfDay(today), lte: endOfDay(today) },
				clinicId,
				isDeleted: false,
			},
		})
	}),

	getSpecialtyStats: dedupeQuery(
		async (clinicId: string, from: Date, to: Date) => {
			const groupedByDoctor = await db.appointment.groupBy({
				_count: { _all: true },
				by: ['doctorId'],
				orderBy: { doctorId: 'asc' },
				take: 50,
				where: {
					appointmentDate: { gte: from, lte: to },
					clinicId,
					isDeleted: false,
				},
			})

			const doctorIds = groupedByDoctor
				.map((g: { doctorId: string }) => g.doctorId)
				.filter(Boolean)
			const doctors = doctorIds.length
				? await db.doctor.findMany({
						select: { id: true, specialty: true },
						where: { id: { in: doctorIds }, isDeleted: false },
					})
				: []

			return { doctors, groupedByDoctor }
		}
	),

	getTodaySchedule: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		const currentDay = today.toLocaleString('en-US', { weekday: 'long' })

		return await db.doctor.findMany({
			include: {
				appointments: {
					include: {
						patient: {
							select: {
								colorCode: true,
								firstName: true,
								image: true,
								lastName: true,
							},
						},
					},
					where: {
						appointmentDate: {
							gte: startOfDay(today),
							lte: endOfDay(
								currentDay === 'Sunday' ? subDays(today, 1) : today
							),
						},
						isDeleted: false,
					},
				},
				workingDays: {
					where: { clinicId },
				},
			},
			where: {
				clinicId,
				isDeleted: false,
			},
		})
	}),

	// ==================== IMMUNIZATIONS ====================

	getUpcomingImmunizations: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		const next30 = new Date(today)
		next30.setDate(today.getDate() + 30)

		return await db.immunization.findMany({
			include: {
				patient: {
					select: {
						firstName: true,
						id: true,
						lastName: true,
					},
				},
			},
			orderBy: { date: 'asc' },
			where: {
				date: { gte: today, lte: next30 },
				isDeleted: false,
				patient: { clinicId, isDeleted: false },
			},
		})
	}),

	// NO business logic, NO cache directives, NO auth checks
}
