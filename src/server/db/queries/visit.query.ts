/**
 * 🔵 VISIT MODULE - QUERY LAYER
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

import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns'

import { dedupeQuery } from '@/cache/dedupe'
import type { AppointmentStatus, Prisma } from '@/prisma/browser'
import { db } from '@/server/db'

export const visitQueries = {
	// GET: Calculated due vaccines for a specific patient
	calculatePatientDue: dedupeQuery(async (patientId: string) => {
		const patient = await db.patient.findUnique({
			select: { dateOfBirth: true, id: true },
			where: { id: patientId },
		})

		if (!patient) {
			throw new Error('Patient not found')
		}

		const [schedule, completed] = await Promise.all([
			db.vaccineSchedule.findMany(),
			db.immunization.findMany({ where: { isDeleted: false, patientId } }),
		])

		const ageInDays = Math.floor(
			(Date.now() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24)
		)

		return schedule
			.map(
				(v: {
					vaccineName: string
					dosesRequired: number
					ageInDaysMin: number | null
					ageInDaysMax: number | null
				}) => {
					const isDone = completed.some(
						(c: { vaccine: string; dose: string | null }) =>
							c.vaccine === v.vaccineName &&
							c.dose === `Dose ${v.dosesRequired}`
					)

					const dueDate = new Date(patient.dateOfBirth)
					dueDate.setDate(dueDate.getDate() + (v.ageInDaysMin || 0))

					return {
						...v,
						dueDate,
						isCompleted: isDone,
						isEligible: ageInDays >= (v.ageInDaysMin || 0),
						isOverdue:
							!isDone && (v.ageInDaysMax ? ageInDays > v.ageInDaysMax : false),
					}
				}
			)
			.filter((v: { isCompleted: boolean }) => !v.isCompleted) // Only return await what is actually still due
	}),

	checkDoctorExists: dedupeQuery(async (doctorId: string, clinicId: string) => {
		return await db.doctor.findFirst({
			select: {
				id: true,
				name: true,
				workingDays: true,
			},
			where: {
				clinicId,
				id: doctorId,
				isDeleted: false,
			},
		})
	}),

	// ==================== VALIDATION QUERIES ====================

	checkOverlap: dedupeQuery(
		async (doctorId: string, appointmentDate: Date, excludeId?: string) => {
			const startWindow = new Date(appointmentDate)
			startWindow.setMinutes(startWindow.getMinutes() - 30)

			const endWindow = new Date(appointmentDate)
			endWindow.setMinutes(endWindow.getMinutes() + 30)

			return await db.appointment.findFirst({
				where: {
					appointmentDate: {
						gte: startWindow,
						lte: endWindow,
					},
					doctorId,
					isDeleted: false,
					status: { not: 'CANCELLED' },
					...(excludeId && { id: { not: excludeId } }),
				},
			})
		}
	),

	checkPatientExists: dedupeQuery(
		async (patientId: string, clinicId: string) => {
			return await db.patient.findFirst({
				select: {
					clinicId: true,
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

	countByStatus: dedupeQuery(
		async (clinicId: string, status: AppointmentStatus) => {
			return await db.appointment.count({
				where: {
					clinicId,
					isDeleted: false,
					status,
				},
			})
		}
	),

	countThisMonth: dedupeQuery(async (clinicId: string) => {
		const now = new Date()

		return await db.appointment.count({
			where: {
				appointmentDate: {
					gte: startOfMonth(now),
					lte: endOfMonth(now),
				},
				clinicId,
				isDeleted: false,
			},
		})
	}),
	// ==================== COUNT OPERATIONS ====================

	countToday: dedupeQuery(async (clinicId: string) => {
		const today = new Date()

		return await db.appointment.count({
			where: {
				appointmentDate: {
					gte: startOfDay(today),
					lte: endOfDay(today),
				},
				clinicId,
				isDeleted: false,
			},
		})
	}),

	// ==================== WRITE OPERATIONS ====================

	create: dedupeQuery(async (data: Prisma.AppointmentCreateInput) => {
		return await db.appointment.create({
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

	// DELETE: Soft delete
	deleteImmunization: async (id: string) => {
		return await db.immunization.update({
			data: {
				deletedAt: new Date(),
				isDeleted: true,
			},
			where: { id },
		})
	},

	findByClinic: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				limit?: number
				offset?: number
				startDate?: Date
				endDate?: Date
				status?: AppointmentStatus
				doctorId?: string
			}
		) => {
			const where: Prisma.AppointmentWhereInput = {
				clinicId,
				isDeleted: false,
			}

			if (options?.startDate || options?.endDate) {
				where.appointmentDate = {}
				if (options.startDate) {
					where.appointmentDate.gte = options.startDate
				}
				if (options.endDate) {
					where.appointmentDate.lte = options.endDate
				}
			}

			if (options?.status) {
				where.status = options.status
			}

			if (options?.doctorId) {
				where.doctorId = options.doctorId
			}

			return await db.appointment.findMany({
				include: {
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
						},
					},
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
							phone: true,
						},
					},
					service: {
						select: {
							id: true,
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
	// ==================== READ OPERATIONS ====================

	findById: dedupeQuery(async (id: string) => {
		return await db.appointment.findUnique({
			include: {
				doctor: {
					select: {
						email: true,
						id: true,
						img: true,
						name: true,
						specialty: true,
					},
				},
				patient: {
					select: {
						dateOfBirth: true,
						email: true,
						firstName: true,
						id: true,
						lastName: true,
						phone: true,
					},
				},
				service: {
					select: {
						duration: true,
						id: true,
						price: true,
						serviceName: true,
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
			options?: { limit?: number; offset?: number }
		) => {
			return await db.appointment.findMany({
				include: {
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
						},
					},
					service: {
						select: {
							id: true,
							serviceName: true,
						},
					},
				},
				orderBy: { appointmentDate: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where: {
					isDeleted: false,
					patientId,
				},
			})
		}
	),

	// GET: Clinic-wide immunization records
	findClinicImmunizations: dedupeQuery(
		async (clinicId: string, startDate?: Date, endDate?: Date) => {
			return await db.immunization.findMany({
				include: {
					patient: {
						select: { firstName: true, lastName: true },
					},
				},
				where: {
					isDeleted: false,
					patient: {
						clinicId,
						isDeleted: false,
					},
					...(startDate || endDate
						? {
								date: {
									...(startDate && { gte: startDate }),
									...(endDate && { lte: endDate }),
								},
							}
						: {}),
				},
			})
		}
	),
	// GET: Patient immunization history
	findPatientImmunizations: dedupeQuery(async (patientId: string) => {
		return await db.immunization.findMany({
			include: {
				administeredBy: {
					select: { name: true },
				},
			},
			orderBy: { date: 'desc' },
			where: {
				isDeleted: false,
				patientId,
			},
		})
	}),

	findRecent: dedupeQuery(async (clinicId: string, limit = 5) => {
		return await db.appointment.findMany({
			include: {
				doctor: {
					select: {
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
						id: true,
						image: true,
						lastName: true,
					},
				},
			},
			orderBy: { appointmentDate: 'desc' },
			take: limit as number,
			where: {
				clinicId,
				isDeleted: false,
			},
		})
	}),

	findToday: dedupeQuery(async (clinicId: string) => {
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
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
					},
				},
			},
			orderBy: { appointmentDate: 'asc' },
			where: {
				appointmentDate: {
					gte: startOfDay(today),
					lte: endOfDay(today),
				},
				clinicId,
				isDeleted: false,
			},
		})
	}),

	findUpcoming: dedupeQuery(
		async (
			clinicId: string,
			options?: { limit?: number; doctorId?: string }
		) => {
			const where: Prisma.AppointmentWhereInput = {
				appointmentDate: { gte: new Date() },
				clinicId,
				isDeleted: false,
				status: { in: ['SCHEDULED', 'PENDING'] },
			}

			if (options?.doctorId) {
				where.doctorId = options.doctorId
			}

			return await db.appointment.findMany({
				orderBy: { appointmentDate: 'asc' },
				select: {
					appointmentDate: true,
					appointmentPrice: true,
					doctor: {
						select: {
							id: true,
							img: true,
							name: true,
							specialty: true,
						},
					},
					duration: true,
					id: true,
					patient: {
						select: {
							firstName: true,
							id: true,
							lastName: true,
							phone: true,
						},
					},
					reason: true,
					status: true,
					time: true,
					type: true,
				},
				take: options?.limit || 20,
				where,
			})
		}
	),
	// GET: The master schedule rules
	getVaccineSchedule: dedupeQuery(async () => {
		return await db.vaccineSchedule.findMany({
			orderBy: { ageInDaysMin: 'asc' },
		})
	}),
	// POST: Record a shot
	recordImmunization: async (data: {
		patientId: string
		vaccineName: string
		doseNumber: number
		date: Date
		staffId: string
		lotNumber?: string
		appointmentId?: string
	}) => {
		return await db.$transaction(async (tx: Prisma.TransactionClient) => {
			const record = await tx.immunization.create({
				data: {
					administeredByStaffId: data.staffId,
					date: data.date,
					dose: `Dose ${data.doseNumber}`,
					isDeleted: false,
					lotNumber: data.lotNumber,
					patientId: data.patientId,
					vaccine: data.vaccineName,
				},
			})

			if (data.appointmentId) {
				// Find and update medical record to link this shot
				const medRec = await tx.medicalRecords.findFirst({
					where: { appointmentId: data.appointmentId },
				})
				if (medRec) {
					await tx.medicalRecords.update({
						data: { immunizations: { connect: { id: record.id } } },
						where: { id: medRec.id },
					})
				}
			}
			return await record
		})
	},

	softDelete: dedupeQuery(async (id: string) => {
		return await db.appointment.update({
			data: {
				deletedAt: new Date(),
				isDeleted: true,
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	update: dedupeQuery(
		async (id: string, data: Prisma.AppointmentUpdateInput) => {
			return await db.appointment.update({
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

	updateStatus: dedupeQuery(async (id: string, status: AppointmentStatus) => {
		return await db.appointment.update({
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

export type VisitQueries = typeof visitQueries
