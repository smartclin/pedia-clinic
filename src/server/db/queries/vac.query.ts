/**
 * 🔵 VACCINATION MODULE - QUERY LAYER
 *
 * RESPONSIBILITIES:
 * - ONLY raw Prisma database queries
 * - NO business logic, validation, or error handling
 * - NO cache directives ('use cache')
 * - NO imports from service/cache layers
 * - ALL queries wrapped with dedupeQuery()
 *
 * PATTERN: Pure Data Access Object (DAO)
 */

import type { Prisma } from '@/prisma/browser'
import { db } from '@/server/db'
import type { ImmunizationStatus } from '@/types'

import { dedupeQuery } from '../../../lib/cache/dedupe'

export const vaccinationQueries = {
	// ==================== VALIDATION QUERIES ====================

	checkDuplicateVaccination: dedupeQuery(
		async (
			patientId: string,
			vaccine: string,
			date: Date,
			excludeId?: string
		) => {
			const startOfDay = new Date(date)
			startOfDay.setHours(0, 0, 0, 0)

			const endOfDay = new Date(date)
			endOfDay.setHours(23, 59, 59, 999)

			return await db.immunization.findFirst({
				where: {
					date: {
						gte: startOfDay,
						lte: endOfDay,
					},
					isDeleted: false,
					patientId,
					vaccine,
					...(excludeId && { id: { not: excludeId } }),
				},
			})
		}
	),

	/**
	 * CHECK: Patient existence and clinic ownership
	 * Helper used by the Service Layer for security validation
	 */
	checkPatientExists: dedupeQuery(
		async (patientId: string, clinicId: string) => {
			return await db.patient.findFirst({
				select: {
					clinicId: true,
					dateOfBirth: true,
					firstName: true,
					id: true,
					lastName: true,
				},
				where: {
					clinicId,
					id: patientId,
					isDeleted: false,
				},
			})
		}
	),

	checkStaffExists: dedupeQuery(async (staffId: string, clinicId: string) => {
		return await db.staff.findFirst({
			select: {
				id: true,
				name: true,
			},
			where: {
				clinicId,
				id: staffId,
				// isDeleted: false
			},
		})
	}),

	countActivePatients: dedupeQuery(async (clinicId: string) => {
		return await db.patient.count({
			where: {
				clinicId,
				isDeleted: false,
				status: 'ACTIVE',
			},
		})
	}),

	// ==================== COUNT OPERATIONS ====================

	countByPatient: dedupeQuery(
		async (patientId: string, status?: ImmunizationStatus) => {
			const where: Prisma.ImmunizationWhereInput = {
				isDeleted: false,
				patientId,
			}

			if (status) {
				where.status = status
			}

			return await db.immunization.count({ where })
		}
	),

	countByStatus: dedupeQuery(
		async (clinicId: string, status: ImmunizationStatus) => {
			return await db.immunization.count({
				where: {
					isDeleted: false,
					patient: { clinicId },
					status,
				},
			})
		}
	),

	countOverdue: dedupeQuery(async (clinicId: string, daysOverdue = 0) => {
		const today = new Date()
		const cutoffDate = new Date()
		cutoffDate.setDate(today.getDate() - (Number(daysOverdue) || 0))

		return await db.immunization.count({
			where: {
				date: {
					lt: cutoffDate,
				},
				isDeleted: false,
				patient: { clinicId },
				status: 'PENDING',
			},
		})
	}),

	countUpcoming: dedupeQuery(async (clinicId: string, daysAhead = 30) => {
		const today = new Date()
		const futureDate = new Date()
		futureDate.setDate(today.getDate() + (Number(daysAhead) || 30))

		return await db.immunization.count({
			where: {
				date: {
					gte: today,
					lte: futureDate,
				},
				isDeleted: false,
				patient: { clinicId },
				status: 'PENDING',
			},
		})
	}),

	// ==================== WRITE OPERATIONS ====================

	create: dedupeQuery(async (data: Prisma.ImmunizationCreateInput) => {
		return await db.immunization.create({
			data: {
				...data,
				createdAt: new Date(),
				id: crypto.randomUUID(),
				updatedAt: new Date(),
			},
			include: {
				patient: {
					select: {
						clinicId: true,
						firstName: true,
						id: true,
						lastName: true,
					},
				},
			},
		})
	}),

	findByClinic: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				status?: ImmunizationStatus
				startDate?: Date
				endDate?: Date
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.ImmunizationWhereInput = {
				isDeleted: false,
				patient: { clinicId },
			}

			if (options?.status) {
				where.status = options.status
			}

			if (options?.startDate || options?.endDate) {
				where.date = {}
				if (options.startDate) {
					where.date.gte = options.startDate
				}
				if (options.endDate) {
					where.date.lte = options.endDate
				}
			}

			return await db.immunization.findMany({
				include: {
					administeredBy: {
						select: {
							id: true,
							name: true,
						},
					},
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where,
			})
		}
	),
	// ==================== IMMUNIZATION QUERIES ====================

	findById: dedupeQuery(async (id: string) => {
		return await db.immunization.findUnique({
			include: {
				administeredBy: {
					select: {
						email: true,
						id: true,
						name: true,
					},
				},
				medicalRecords: {
					select: {
						createdAt: true,
						id: true,
					},
				},
				patient: {
					select: {
						clinicId: true,
						dateOfBirth: true,
						firstName: true,
						id: true,
						lastName: true,
					},
				},
			},
			where: {
				id,
				isDeleted: false,
			},
		})
	}),

	findByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: {
				includeCompleted?: boolean
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.ImmunizationWhereInput = {
				isDeleted: false,
				patientId,
			}

			if (!options?.includeCompleted) {
				where.status = 'PENDING'
			}

			return await db.immunization.findMany({
				include: {
					administeredBy: {
						select: {
							id: true,
							name: true,
						},
					},
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where,
			})
		}
	),

	findOverdue: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				daysOverdue?: number
				limit?: number
			}
		) => {
			const today = new Date()
			const cutoffDate = new Date()
			cutoffDate.setDate(today.getDate() - (options?.daysOverdue || 0))

			return await db.immunization.findMany({
				include: {
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'asc' },
				take: options?.limit || 20,
				where: {
					date: {
						lt: cutoffDate,
					},
					isDeleted: false,
					patient: { clinicId },
					status: 'PENDING',
				},
			})
		}
	),
	findUpcoming: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				daysAhead?: number
				limit?: number
			}
		) => {
			const today = new Date()
			const futureDate = new Date()
			futureDate.setDate(today.getDate() + (Number(options?.daysAhead) || 30))

			return await db.immunization.findMany({
				orderBy: { date: 'asc' },
				select: {
					date: true,
					daysOverDue: true,
					dose: true,
					id: true,
					isOverDue: true,
					patient: {
						select: {
							ageMonths: true,
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
					status: true,
					vaccine: true,
				},
				take: options?.limit || 20,
				where: {
					date: {
						gte: today,
						lte: futureDate,
					},
					isDeleted: false,
					patient: { clinicId },
					status: 'PENDING',
				},
			})
		}
	),

	// ==================== VACCINE SCHEDULE QUERIES ====================

	findVaccineSchedule: dedupeQuery(
		async (options?: {
			ageMonths?: number
			isMandatory?: boolean
			vaccineName?: string
			limit?: number
		}) => {
			const where: Prisma.VaccineScheduleWhereInput = {}

			if (options?.ageMonths !== undefined) {
				where.ageInDaysMin = { lte: options.ageMonths * 30 }
				where.ageInDaysMax = { gte: options.ageMonths * 30 }
			}

			if (options?.isMandatory !== undefined) {
				where.isMandatory = options.isMandatory
			}

			if (options?.vaccineName) {
				where.vaccineName = {
					contains: options.vaccineName,
					mode: 'insensitive',
				}
			}

			return await db.vaccineSchedule.findMany({
				orderBy: [{ ageInDaysMin: 'asc' }, { vaccineName: 'asc' }],
				take: options?.limit || 100,
				where,
			})
		}
	),

	findVaccineScheduleByAge: dedupeQuery(async (ageMonths: number) => {
		const ageDays = ageMonths * 30

		return await db.vaccineSchedule.findMany({
			orderBy: { vaccineName: 'asc' },
			where: {
				ageInDaysMax: { gte: ageDays },
				ageInDaysMin: { lte: ageDays },
			},
		})
	}),

	findVaccineScheduleById: dedupeQuery(async (id: number) => {
		return await db.vaccineSchedule.findUnique({
			where: { id },
		})
	}),
	getPatientDob: dedupeQuery(async (patientId: string) => {
		return await db.patient.findUnique({
			select: {
				dateOfBirth: true,
				firstName: true,
				id: true,
				lastName: true,
			},
			where: {
				id: patientId,
				isDeleted: false,
			},
		})
	}),

	getSchedule: dedupeQuery(async () => {
		return await db.vaccineSchedule.findMany({
			orderBy: {
				ageInDaysMin: 'asc',
			},
			where: {
				// You can add an isActive flag here if your schema supports it
			},
		})
	}),

	softDelete: dedupeQuery(async (id: string) => {
		return await db.immunization.update({
			data: {
				deletedAt: new Date(),
				isDeleted: true,
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	update: dedupeQuery(
		async (id: string, data: Prisma.ImmunizationUpdateInput) => {
			return await db.immunization.update({
				data: {
					...data,
					updatedAt: new Date(),
				},
				include: {
					patient: {
						select: {
							clinicId: true,
							id: true,
						},
					},
				},
				where: { id },
			})
		}
	),

	updateStatus: dedupeQuery(async (id: string, status: ImmunizationStatus) => {
		return await db.immunization.update({
			data: {
				status,
				updatedAt: new Date(),
			},
			include: {
				patient: {
					select: {
						clinicId: true,
						id: true,
					},
				},
			},
			where: { id },
		})
	}),
} as const

export type VaccinationQueries = typeof vaccinationQueries
