// src/modules/patient/patient.query.ts

import type { Prisma } from '@/prisma/browser'
import { db } from '@/server/db'
import type { Gender, Status } from '@/types'

import { dedupeQuery } from '../../../lib/cache/dedupe'

/**
 * 🔵 PURE QUERY LAYER
 * - ONLY raw Prisma queries
 * - NO business logic (if/else, throw)
 * - NO cache directives
 * - NO session/auth
 * - Wrapped with dedupeQuery for request deduplication
 */
export const patientQueries = {
	// ==================== MUTATIONS (Internal - Called by Service) ====================
	// These are NOT exported directly, only used via service layer

	_create: dedupeQuery(async (data: Prisma.PatientUncheckedCreateInput) => {
		return await db.patient.create({ data })
	}),

	_delete: dedupeQuery(async (id: string) => {
		return await db.patient.update({
			data: { deletedAt: new Date(), isDeleted: true },
			where: { id },
		})
	}),

	_hardDelete: dedupeQuery(async (id: string) => {
		return await db.patient.delete({ where: { id } })
	}),

	_update: dedupeQuery(
		async (id: string, data: Prisma.PatientUncheckedUpdateInput) => {
			return await db.patient.update({
				data,
				where: { id },
			})
		}
	),

	// ==================== COUNTS ====================
	countByClinic: dedupeQuery((clinicId: string) => {
		return db.patient.count({
			where: { clinicId, isDeleted: false },
		})
	}),

	// ==================== VALIDATION ====================
	existsByEmail: dedupeQuery((email: string, clinicId: string) => {
		return db.patient.findFirst({
			select: { id: true },
			where: {
				clinicId,
				email,
				isDeleted: false,
			},
		})
	}),

	findAllByClinic: dedupeQuery((clinicId: string) => {
		return db.patient.findMany({
			orderBy: { firstName: 'asc' },
			select: {
				colorCode: true,
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
			where: { clinicId, isDeleted: false },
		})
	}),

	findAvailableDoctorsByDay: dedupeQuery((day: string, clinicId: string) => {
		return db.doctor.findMany({
			select: {
				colorCode: true,
				id: true,
				img: true,
				name: true,
				specialty: true,
				workingDays: true,
			},
			take: 4,
			where: {
				clinicId,
				isDeleted: false,
				workingDays: {
					some: {
						day: { equals: day ?? '', mode: 'insensitive' },
					},
				},
			},
		})
	}),

	// ==================== LIST PATIENTS ====================
	findByClinic: dedupeQuery(
		(clinicId: string, options?: { limit?: number; offset?: number }) => {
			return db.patient.findMany({
				orderBy: { createdAt: 'desc' },
				select: {
					_count: {
						select: {
							appointments: { where: { isDeleted: false } },
						},
					},
					colorCode: true,
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
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where: { clinicId, isDeleted: false },
			})
		}
	),
	// ==================== SINGLE PATIENT ====================
	findById: dedupeQuery((id: string) => {
		return db.patient.findUnique({
			include: {
				appointments: {
					orderBy: { appointmentDate: 'desc' },
					select: { appointmentDate: true, status: true },
					take: 5,
				},
				user: { select: { email: true, image: true, name: true } },
			},
			where: { id, isDeleted: false },
		})
	}),

	findByIdWithFullData: dedupeQuery((id: string) => {
		return db.patient.findFirst({
			include: {
				_count: {
					select: {
						appointments: { where: { isDeleted: false } },
						medicalRecords: true,
						prescriptions: true,
					},
				},
				appointments: {
					orderBy: { appointmentDate: 'desc' },
					select: {
						appointmentDate: true,
						doctor: { select: { name: true, specialty: true } },
						status: true,
					},
					take: 1,
				},
				clinic: { select: { id: true, name: true } },
				user: { select: { email: true, image: true, name: true } },
			},
			where: {
				isDeleted: false,
				OR: [{ id }, { email: id }],
			},
		})
	}),

	// ==================== DASHBOARD STATS ====================
	findDashboardStats: dedupeQuery((patientId: string) => {
		return Promise.all([
			db.patient.findUnique({
				select: {
					clinicId: true,
					allergies: true,
					bloodGroup: true,
					colorCode: true,
					createdAt: true,
					dateOfBirth: true,
					firstName: true,
					gender: true,
					id: true,
					image: true,
					lastName: true,
					medicalConditions: true,
				},
				where: { id: patientId, isDeleted: false },
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
					service: {
						select: {
							id: true,
							price: true,
							serviceName: true,
						},
					},
				},
				orderBy: { appointmentDate: 'desc' },
				where: { isDeleted: false, patientId },
			}),
			db.prescription.count({
				where: { patientId, status: 'active' },
			}),
			db.medicalRecords.count({
				where: { isDeleted: false, patientId },
			}),
		])
	}),

	// ==================== PAGINATED WITH SEARCH ====================
	findPaginated: dedupeQuery(
		(params: {
			skip: number
			take: number
			search?: string
			clinicId?: string
			status?: Status
			gender?: Gender
			sortBy?: string
			sortOrder?: 'asc' | 'desc'
		}) => {
			const where: Prisma.PatientWhereInput = {
				isDeleted: false,
			}

			if (params.clinicId) {
				where.clinicId = params.clinicId
			}

			if (params.status) {
				where.status = params.status
			}

			if (params.gender) {
				where.gender = params.gender
			}

			if (params.search) {
				where.OR = [
					{ firstName: { contains: params.search, mode: 'insensitive' } },
					{ lastName: { contains: params.search, mode: 'insensitive' } },
					{ phone: { contains: params.search, mode: 'insensitive' } },
					{ email: { contains: params.search, mode: 'insensitive' } },
					{ id: { contains: params.search, mode: 'insensitive' } },
				]
			}

			const orderBy: Prisma.PatientOrderByWithRelationInput = {}
			if (params.sortBy) {
				orderBy[params.sortBy as keyof Prisma.PatientOrderByWithRelationInput] =
					params.sortOrder || 'desc'
			} else {
				orderBy.createdAt = 'desc'
			}

			return Promise.all([
				db.patient.findMany({
					include: {
						_count: {
							select: {
								appointments: { where: { isDeleted: false } },
								medicalRecords: true,
								prescriptions: true,
							},
						},
						appointments: {
							orderBy: { appointmentDate: 'desc' },
							select: { appointmentDate: true },
							take: 1,
						},
					},
					orderBy,
					skip: params.skip,
					take: params.take,
					where,
				}),
				db.patient.count({ where }),
			])
		}
	),
	findRecent: dedupeQuery((clinicId: string, limit = 5) => {
		return db.patient.findMany({
			orderBy: { createdAt: 'desc' },
			select: {
				appointments: true,
				colorCode: true,
				dateOfBirth: true,
				encounters: true,
				firstName: true,
				id: true,
				image: true,
				lastName: true,
			},
			take: limit as number,
			where: {
				clinicId,
				isDeleted: false,
			},
		})
	}),
}
