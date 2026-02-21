/**
 * 🔵 MEDICAL MODULE - QUERY LAYER
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

import { dedupeQuery } from '@/cache/dedupe'
import type { LabStatus, Prisma } from '@/prisma/browser'
import { db } from '@/server/db'

export const medicalQueries = {
	checkAppointmentExists: dedupeQuery(
		async (appointmentId: string, clinicId: string) => {
			return await db.appointment.findFirst({
				select: { id: true },
				where: {
					clinicId,
					id: appointmentId,
					isDeleted: false,
				},
			})
		}
	),

	// Helper to verify medical record exists
	checkMedicalRecordExists: dedupeQuery(
		async (medicalId: string, clinicId: string) => {
			return await db.medicalRecords.findFirst({
				select: {
					clinicId: true,
					id: true,
					patient: {
						select: {
							dateOfBirth: true,
							gender: true,
						},
					},
					patientId: true,
				},
				where: {
					id: medicalId,
					patient: {
						clinicId,
					},
				},
			})
		}
	),

	// ==================== VALIDATION QUERIES ====================

	checkPatientExists: dedupeQuery(
		async (patientId: string, clinicId: string) => {
			return await db.patient.findFirst({
				select: {
					clinicId: true,
					dateOfBirth: true,
					gender: true,
					id: true,
				},
				where: {
					clinicId,
					id: patientId,
					isDeleted: false,
				},
			})
		}
	),

	countDiagnosesByPatient: dedupeQuery(async (patientId: string) => {
		return await db.diagnosis.count({
			where: {
				isDeleted: false,
				patientId,
			},
		})
	}),

	countMedicalRecordsByClinic: dedupeQuery(
		async (clinicId: string, search?: string) => {
			const where: Prisma.MedicalRecordsWhereInput = {
				clinicId,
				isDeleted: false,
			}

			if (search) {
				where.OR = [
					{ patient: { firstName: { contains: search, mode: 'insensitive' } } },
					{ patient: { lastName: { contains: search, mode: 'insensitive' } } },
					{ patientId: { contains: search, mode: 'insensitive' } },
				]
			}

			return await db.medicalRecords.count({ where })
		}
	),

	// ==================== CREATE OPERATIONS ====================

	createDiagnosis: dedupeQuery(
		async (data: {
			patientId: string
			doctorId: string
			medicalId: string
			appointmentId?: string | null
			clinicId: string
			type?: string | null
			symptoms: string
			diagnosis: string
			treatment?: string | null
			notes?: string | null
			followUpPlan?: string | null
			date: Date
		}) => {
			return await db.diagnosis.create({
				data: {
					id: crypto.randomUUID(),
					...data,
					createdAt: new Date(),
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
			})
		}
	),
	createLabTest: dedupeQuery(
		async (data: {
			recordId: string
			serviceId: string
			testDate: Date
			result: string
			status: LabStatus
			notes?: string | null
			orderedBy?: string | null
			performedBy?: string | null
			sampleType?: string | null
			sampleCollectionDate?: Date | null
			reportDate?: Date | null
			referenceRange?: string | null
			units?: string | null
		}) => {
			return await db.labTest.create({
				data: {
					id: crypto.randomUUID(),
					...data,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				include: {
					medicalRecord: {
						select: {
							clinicId: true,
							patientId: true,
						},
					},
				},
			})
		}
	),

	createMedicalRecord: dedupeQuery(
		async (data: {
			clinicId: string
			patientId: string
			doctorId: string
			appointmentId: string
		}) => {
			return await db.medicalRecords.create({
				data: {
					id: crypto.randomUUID(),
					...data,
					createdAt: new Date(),
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
			})
		}
	),

	createVitalSigns: dedupeQuery(
		async (data: {
			medicalId: string
			patientId: string
			recordedAt: Date
			systolic?: number
			diastolic?: number
			bodyTemperature?: number
			heartRate?: number
			respiratoryRate?: number
			oxygenSaturation?: number
			gender?: 'MALE' | 'FEMALE'
			notes?: string
			ageDays?: number
			ageMonths?: number
		}) => {
			return await db.vitalSigns.create({
				data: {
					id: crypto.randomUUID(),
					...data,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				include: {
					medical: {
						select: {
							clinicId: true,
							patient: {
								select: {
									clinicId: true,
								},
							},
							patientId: true,
						},
					},
				},
			})
		}
	),

	deleteVitalSigns: dedupeQuery(async (id: string) => {
		return await db.vitalSigns.delete({
			where: { id },
		})
	}),

	findActivePrescriptionsByPatient: dedupeQuery(async (patientId: string) => {
		return await db.prescription.findMany({
			include: {
				doctor: {
					select: {
						id: true,
						name: true,
					},
				},
				prescribedItems: {
					include: {
						drug: true,
					},
				},
			},
			orderBy: { issuedDate: 'desc' },
			where: {
				endDate: { gte: new Date() },
				patientId,
				status: 'active',
				// isDeleted: false
			},
		})
	}),

	findDiagnosesByAppointment: dedupeQuery(async (appointmentId: string) => {
		return await db.diagnosis.findMany({
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
						firstName: true,
						id: true,
						lastName: true,
					},
				},
			},
			orderBy: { date: 'desc' },
			where: {
				appointmentId,
				isDeleted: false,
			},
		})
	}),

	findDiagnosesByDoctor: dedupeQuery(
		async (doctorId: string, options?: { limit?: number; offset?: number }) => {
			return await db.diagnosis.findMany({
				include: {
					medical: {
						select: {
							id: true,
						},
					},
					patient: {
						select: {
							firstName: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 20,
				where: {
					doctorId,
					isDeleted: false,
				},
			})
		}
	),

	findDiagnosesByMedicalRecord: dedupeQuery(async (medicalId: string) => {
		return await db.diagnosis.findMany({
			include: {
				appointment: {
					select: {
						appointmentDate: true,
						id: true,
					},
				},
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
					},
				},
			},
			orderBy: { date: 'desc' },
			where: {
				isDeleted: false,
				medicalId,
			},
		})
	}),

	findDiagnosesByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: {
				startDate?: Date
				endDate?: Date
				type?: string
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.DiagnosisWhereInput = {
				isDeleted: false,
				patientId,
			}

			if (options?.type) {
				where.type = options.type
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

			return await db.diagnosis.findMany({
				include: {
					appointment: {
						select: {
							appointmentDate: true,
							id: true,
						},
					},
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
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
	// ==================== DIAGNOSIS QUERIES ====================

	findDiagnosisById: dedupeQuery(async (id: string) => {
		return await db.diagnosis.findUnique({
			include: {
				appointment: {
					select: {
						appointmentDate: true,
						id: true,
						status: true,
						type: true,
					},
				},
				doctor: {
					select: {
						email: true,
						id: true,
						name: true,
						specialty: true,
					},
				},
				medical: {
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
			where: { id },
		})
	}),

	// ==================== LAB TESTS QUERIES ====================

	findLabTestById: dedupeQuery(async (id: string) => {
		return await db.labTest.findUnique({
			include: {
				medicalRecord: {
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
				},
				service: {
					select: {
						description: true,
						id: true,
						price: true,
						serviceName: true,
					},
				},
			},
			where: { id },
		})
	}),

	findLabTestsByMedicalRecord: dedupeQuery(async (medicalId: string) => {
		return await db.labTest.findMany({
			include: {
				service: {
					select: {
						description: true,
						id: true,
						serviceName: true,
					},
				},
			},
			orderBy: { testDate: 'desc' },
			where: {
				recordId: medicalId,
			},
		})
	}),

	findLabTestsByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: {
				startDate?: Date
				endDate?: Date
				status?: LabStatus
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.LabTestWhereInput = {
				medicalRecord: {
					isDeleted: false,
					patientId,
				},
			}

			if (options?.status) {
				where.status = options.status
			}

			if (options?.startDate || options?.endDate) {
				where.testDate = {}
				if (options.startDate) {
					where.testDate.gte = options.startDate
				}
				if (options.endDate) {
					where.testDate.lte = options.endDate
				}
			}

			return await db.labTest.findMany({
				include: {
					medicalRecord: {
						select: {
							id: true,
							patientId: true,
						},
					},
					service: {
						select: {
							description: true,
							id: true,
							serviceName: true,
						},
					},
				},
				orderBy: { testDate: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where,
			})
		}
	),

	findLabTestsByService: dedupeQuery(
		async (
			serviceId: string,
			clinicId: string,
			options?: {
				startDate?: Date
				endDate?: Date
				status?: LabStatus
				limit?: number
				offset?: number
			}
		) => {
			const where: Prisma.LabTestWhereInput = {
				medicalRecord: {
					clinicId,
				},
				serviceId,
			}

			if (options?.status) {
				where.status = options.status
			}

			if (options?.startDate || options?.endDate) {
				where.testDate = {}
				if (options.startDate) {
					where.testDate.gte = options.startDate
				}
				if (options.endDate) {
					where.testDate.lte = options.endDate
				}
			}

			return await db.labTest.findMany({
				include: {
					medicalRecord: {
						include: {
							patient: {
								select: {
									firstName: true,
									id: true,
									lastName: true,
								},
							},
						},
					},
					service: true,
				},
				orderBy: { testDate: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where,
			})
		}
	),

	findLatestVitalSignsByPatient: dedupeQuery(async (patientId: string) => {
		return await db.vitalSigns.findFirst({
			orderBy: { recordedAt: 'desc' },
			where: { patientId },
		})
	}),

	// ==================== MEDICAL RECORDS QUERIES ====================

	findMedicalRecordById: dedupeQuery(async (id: string) => {
		return await db.medicalRecords.findUnique({
			include: {
				appointment: {
					select: {
						appointmentDate: true,
						id: true,
						status: true,
						type: true,
					},
				},
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
					},
				},
				encounter: {
					orderBy: { date: 'desc' },
					select: {
						date: true,
						diagnosis: true,
						id: true,
						type: true,
					},
				},
				labTest: {
					orderBy: { testDate: 'desc' },
					select: {
						id: true,
						result: true,
						service: {
							select: {
								id: true,
								serviceName: true,
							},
						},
						status: true,
						testDate: true,
					},
				},
				patient: {
					select: {
						clinicId: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						id: true,
						lastName: true,
					},
				},
				prescriptions: {
					orderBy: { issuedDate: 'desc' },
					select: {
						doctor: {
							select: {
								id: true,
								name: true,
							},
						},
						id: true,
						issuedDate: true,
						medicationName: true,
						status: true,
					},
				},
				vitalSigns: {
					orderBy: { recordedAt: 'desc' },
					select: {
						bodyTemperature: true,
						diastolic: true,
						heartRate: true,
						id: true,
						oxygenSaturation: true,
						recordedAt: true,
						respiratoryRate: true,
						systolic: true,
					},
					take: 1,
				},
			},
			where: {
				id,
				isDeleted: false,
			},
		})
	}),

	findMedicalRecordsByClinic: dedupeQuery(
		async (
			clinicId: string,
			options?: {
				search?: string
				limit?: number
				offset?: number
				startDate?: Date
				endDate?: Date
			}
		) => {
			const where: Prisma.MedicalRecordsWhereInput = {
				clinicId,
				isDeleted: false,
			}

			if (options?.search) {
				where.OR = [
					{
						patient: {
							firstName: { contains: options.search, mode: 'insensitive' },
						},
					},
					{
						patient: {
							lastName: { contains: options.search, mode: 'insensitive' },
						},
					},
					{
						patientId: { contains: options.search, mode: 'insensitive' },
					},
				]
			}

			if (options?.startDate || options?.endDate) {
				where.createdAt = {}
				if (options.startDate) {
					where.createdAt.gte = options.startDate
				}
				if (options.endDate) {
					where.createdAt.lte = options.endDate
				}
			}

			return await db.medicalRecords.findMany({
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
				orderBy: { createdAt: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 20,
				where,
			})
		}
	),

	findMedicalRecordsByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: { limit?: number; offset?: number }
		) => {
			return await db.medicalRecords.findMany({
				include: {
					appointment: {
						select: {
							appointmentDate: true,
							id: true,
						},
					},
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
						},
					},
					encounter: {
						orderBy: { date: 'desc' },
						select: {
							date: true,
							diagnosis: true,
							id: true,
						},
						take: 1,
					},
				},
				orderBy: { createdAt: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where: {
					isDeleted: false,
					patientId,
				},
			})
		}
	),

	// ==================== PRESCRIPTION QUERIES ====================

	findPrescriptionsByMedicalRecord: dedupeQuery(
		async (
			medicalRecordId: string,
			options?: { limit?: number; offset?: number }
		) => {
			return await db.prescription.findMany({
				include: {
					doctor: {
						select: {
							id: true,
							name: true,
						},
					},
					encounter: {
						select: {
							diagnosis: true,
							id: true,
						},
					},
					prescribedItems: {
						include: {
							drug: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
				orderBy: { issuedDate: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 20,
				where: {
					medicalRecordId,
				},
			})
		}
	),
	findVitalSignsById: dedupeQuery(async (id: string) => {
		return await db.vitalSigns.findUnique({
			include: {
				medical: {
					include: {
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
				},
			},
			where: { id },
		})
	}),

	findVitalSignsByMedicalRecord: dedupeQuery(
		async (medicalId: string, options?: { limit?: number }) => {
			return await db.vitalSigns.findMany({
				include: {
					growthRecords: true,
				},
				orderBy: { recordedAt: 'desc' },
				take: options?.limit,
				where: { medicalId },
			})
		}
	),

	findVitalSignsByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: {
				startDate?: Date
				endDate?: Date
				limit?: number
			}
		) => {
			return await db.vitalSigns.findMany({
				include: {
					growthRecords: true,
					medical: {
						select: {
							appointmentId: true,
							doctorId: true,
							id: true,
						},
					},
				},
				orderBy: { recordedAt: 'desc' },
				take: options?.limit,
				where: {
					patientId,
					recordedAt: {
						...(options?.startDate && { gte: options.startDate }),
						...(options?.endDate && { lte: options.endDate }),
					},
				},
			})
		}
	),

	// ==================== DELETE OPERATIONS ====================

	softDeleteDiagnosis: dedupeQuery(async (id: string) => {
		return await db.diagnosis.update({
			data: {
				deletedAt: new Date(),
				isDeleted: true,
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	softDeleteLabTest: dedupeQuery(async (id: string) => {
		return await db.labTest.update({
			data: {
				// isDeleted: true,
				// deletedAt: new Date(),
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	softDeleteMedicalRecord: dedupeQuery(async (id: string) => {
		return await db.medicalRecords.update({
			data: {
				deletedAt: new Date(),
				isDeleted: true,
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	// ==================== UPDATE OPERATIONS ====================

	updateDiagnosis: dedupeQuery(
		async (
			id: string,
			data: {
				diagnosis?: string
				type?: string | null
				symptoms?: string
				treatment?: string | null
				notes?: string | null
				followUpPlan?: string | null
			}
		) => {
			return await db.diagnosis.update({
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

	updateLabTest: dedupeQuery(
		async (
			id: string,
			data: {
				result?: string
				status?: LabStatus
				notes?: string | null
				performedBy?: string | null
				reportDate?: Date | null
				referenceRange?: string | null
				units?: string | null
			}
		) => {
			return await db.labTest.update({
				data: {
					...data,
					updatedAt: new Date(),
				},
				include: {
					medicalRecord: {
						select: {
							clinicId: true,
							patientId: true,
						},
					},
				},
				where: { id },
			})
		}
	),

	updateVitalSigns: dedupeQuery(
		async (
			id: string,
			data: {
				systolic?: number
				diastolic?: number
				bodyTemperature?: number
				heartRate?: number
				respiratoryRate?: number
				oxygenSaturation?: number
				notes?: string
			}
		) => {
			return await db.vitalSigns.update({
				data: {
					...data,
					updatedAt: new Date(),
				},
				include: {
					medical: {
						select: {
							clinicId: true,
							patientId: true,
						},
					},
				},
				where: { id },
			})
		}
	),

	// checkMedicalRecordExists: dedupeQuery(
	// async (id: string, clinicId: string) => {
	//   return await db.medicalRecords.findFirst({
	//     where: {
	//       id,
	//       clinicId,
	//       isDeleted: false
	//     },
	//     select: { id: true }
	//   });
	// })
} as const

export const labTestQueries = {
	findById: medicalQueries.findLabTestById,
	findByMedicalRecord: medicalQueries.findLabTestsByMedicalRecord,
	findByService: medicalQueries.findLabTestsByService,
	findPatientLabTests: medicalQueries.findLabTestsByPatient,
} as const

export type MedicalQueries = typeof medicalQueries
