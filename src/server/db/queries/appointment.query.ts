// src/modules/appointment/appointment.query.ts

import { dedupeQuery } from '@/cache/dedupe'
import type { Prisma } from '@/prisma/browser'
import { db } from '@/server/db'
import type { AppointmentStatus } from '@/types'

/**
 * 🔵 PURE QUERY LAYER
 * - NO business logic
 * - NO cache directives
 * - NO validation
 * - RAW Prisma only
 * - Wrapped with dedupeQuery for request deduplication
 */
export const appointmentQueries = {
	// ==================== VALIDATION ====================
	checkOverlap: dedupeQuery(
		async (doctorId: string, appointmentDate: Date, excludeId?: string) => {
			const startBuffer = new Date(appointmentDate)
			startBuffer.setMinutes(startBuffer.getMinutes() - 30)

			const endBuffer = new Date(appointmentDate)
			endBuffer.setMinutes(endBuffer.getMinutes() + 30)

			return db.appointment.count({
				where: {
					appointmentDate: {
						gte: startBuffer,
						lte: endBuffer,
					},
					doctorId,
					isDeleted: false,
					NOT: excludeId ? { id: excludeId } : undefined,
					status: { notIn: ['CANCELLED', 'NO_SHOW'] },
				},
			})
		}
	),

	createAppointment: dedupeQuery(
		async (appointment: Prisma.AppointmentCreateInput) => {
			return db.appointment.create({
				data: appointment,
				select: { id: true },
			})
		}
	),

	// ==================== AVAILABLE TIMES (PURE QUERY) ====================
	findBookedTimes: dedupeQuery(async (doctorId: string, date: Date) => {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)

		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)

		return db.appointment.findMany({
			select: {
				appointmentDate: true,
				time: true,
			},
			where: {
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				doctorId,
				isDeleted: false,
				status: { notIn: ['CANCELLED', 'NO_SHOW'] },
			},
		})
	}),

	// ==================== LIST APPOINTMENTS ====================
	findByClinic: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				fromDate?: Date
				toDate?: Date
				status?: AppointmentStatus[]
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.AppointmentWhereInput = {
				clinicId,
				isDeleted: false,
			}

			if (options?.fromDate || options?.toDate) {
				where.appointmentDate = {}
				if (options.fromDate) {
					where.appointmentDate.gte = options.fromDate
				}
				if (options.toDate) {
					where.appointmentDate.lte = options.toDate
				}
			}

			if (options?.status?.length) {
				where.status = { in: options.status }
			}

			return db.appointment.findMany({
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
							dateOfBirth: true,
							firstName: true,
							gender: true,
							id: true,
							image: true,
							lastName: true,
							phone: true,
						},
					},
					service: {
						select: {
							id: true,
							price: true,
							serviceName: true,
						},
					},
				},
				orderBy: { appointmentDate: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where,
			})
		}
	),

	findByDoctor: dedupeQuery(
		async (
			doctorId: string,
			options?: {
				fromDate?: Date
				toDate?: Date
				status?: AppointmentStatus[]
			}
		) => {
			const where: Prisma.AppointmentWhereInput = {
				doctorId,
				isDeleted: false,
			}

			if (options?.fromDate || options?.toDate) {
				where.appointmentDate = {}
				if (options.fromDate) {
					where.appointmentDate.gte = options.fromDate
				}
				if (options.toDate) {
					where.appointmentDate.lte = options.toDate
				}
			}

			if (options?.status?.length) {
				where.status = { in: options.status }
			}

			return db.appointment.findMany({
				include: {
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
							phone: true,
						},
					},
				},
				orderBy: { appointmentDate: 'asc' },
				where,
			})
		}
	),
	// ==================== SINGLE APPOINTMENT ====================
	findById: dedupeQuery(async (id: string) => {
		return db.appointment.findUnique({
			include: {
				doctor: {
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
					},
				},
				patient: {
					select: {
						address: true,
						colorCode: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						id: true,
						image: true,
						lastName: true,
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						price: true,
						serviceName: true,
					},
				},
			},
			where: { id, isDeleted: false },
		})
	}),

	findByIdWithMedical: dedupeQuery(async (id: string) => {
		return db.appointment.findUnique({
			include: {
				bills: true,
				doctor: true,
				medical: {
					include: {
						encounter: true,
						labTest: true,
						prescriptions: true,
						vitalSigns: true,
					},
				},
				patient: true,
				reminders: true,
				service: true,
			},
			where: { id, isDeleted: false },
		})
	}),
	findByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: {
				limit?: number
				offset?: number
				includePast?: boolean
			}
		) => {
			const now = new Date()
			const where: Prisma.AppointmentWhereInput = {
				isDeleted: false,
				patientId,
			}

			if (!options?.includePast) {
				where.appointmentDate = { gte: now }
			}

			return db.appointment.findMany({
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
					service: {
						select: {
							id: true,
							price: true,
							serviceName: true,
						},
					},
				},
				orderBy: { appointmentDate: options?.includePast ? 'desc' : 'asc' },
				skip: options?.offset || 0,
				take: options?.limit || 20,
				where,
			})
		}
	),

	findDoctorSchedule: dedupeQuery(async (doctorId: string) => {
		return db.doctor.findUnique({
			select: {
				availableFromTime: true,
				availableFromWeekDay: true,
				availableToTime: true,
				availableToWeekDay: true,
				workingDays: {
					select: {
						closeTime: true,
						day: true,
						startTime: true,
					},
				},
			},
			where: { id: doctorId, isDeleted: false },
		})
	}),

	// ==================== CALENDAR MONTH VIEW ====================
	findForMonth: dedupeQuery(
		async (clinicId: string, startDate: Date, endDate: Date) => {
			return db.appointment.findMany({
				orderBy: [{ appointmentDate: 'asc' }, { time: 'asc' }],
				select: {
					appointmentDate: true,
					appointmentPrice: true,
					doctor: {
						select: {
							colorCode: true,
							id: true,
							name: true,
						},
					},
					doctorId: true,
					id: true,
					patient: {
						select: {
							colorCode: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
					patientId: true,
					serviceId: true,
					status: true,
					time: true,
					type: true,
				},
				where: {
					appointmentDate: {
						gte: startDate,
						lte: endDate,
					},
					clinicId,
					isDeleted: false,
				},
			})
		}
	),
	// ==================== TODAY'S APPOINTMENTS ====================
	findToday: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		return db.appointment.findMany({
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
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						price: true,
						serviceName: true,
					},
				},
			},
			orderBy: { appointmentDate: 'asc' },
			where: {
				appointmentDate: {
					gte: today,
					lt: tomorrow,
				},
				clinicId,
				isDeleted: false,
			},
		})
	}),
	getByDate: dedupeQuery(async (date: Date) => {
		return db.appointment.findMany({
			include: {
				doctor: {
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
					},
				},
				patient: {
					select: {
						address: true,
						colorCode: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						id: true,
						image: true,
						lastName: true,
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						price: true,
						serviceName: true,
					},
				},
			},
			where: { appointmentDate: date, isDeleted: false },
		})
	}),

	// ==================== STATISTICS ====================
	getStats: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				fromDate?: Date
				toDate?: Date
			}
		) => {
			const where: Prisma.AppointmentWhereInput = {
				clinicId,
				isDeleted: false,
			}

			if (options?.fromDate || options?.toDate) {
				where.appointmentDate = {}
				if (options.fromDate) {
					where.appointmentDate.gte = options.fromDate
				}
				if (options.toDate) {
					where.appointmentDate.lte = options.toDate
				}
			}

			return db.$transaction([
				// Total count for the range
				db.appointment.count({ where }),

				// Status distribution
				db.appointment.groupBy({
					_count: {
						status: true, // Specifically count the occurrences per status
					},
					by: ['status'],
					orderBy: {
						status: 'asc', // Order alphabetically by status (Scheduled, Completed, etc.)
					},
					where,
				}),
				db.appointment.count({
					where: {
						...where,
						appointmentDate: { gte: new Date() },
						status: { in: ['SCHEDULED', 'PENDING'] },
					},
				}),
			])
		}
	),
	softDelete: dedupeQuery(async (id: string) => {
		return db.appointment.delete({
			where: { id },
		})
	}),
	updateAppointment: dedupeQuery(
		async (appointment: Prisma.AppointmentUpdateInput) => {
			const { id, ...updateData } = appointment
			return db.appointment.update({
				data: updateData,
				where: { id: id as string },
			})
		}
	),
	updateStatus: dedupeQuery(
		async (
			appointmentId: string,
			status: AppointmentStatus,
			reason?: string
		) => {
			return db.appointment.update({
				data: {
					status,
					...(reason !== undefined && { reason }),
				},
				where: { id: appointmentId },
			})
		}
	),
}
