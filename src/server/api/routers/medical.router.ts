/**
 * 🟣 MEDICAL MODULE - tRPC ROUTER
 *
 * RESPONSIBILITIES:
 * - tRPC procedure definitions
 * - Permission checks
 * - Input validation via schema
 * - Delegates to service layer (which handles caching)
 * - NO business logic
 */

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	createDiagnosisAction,
	createLabTestAction,
	createMedicalRecordAction,
	createVitalSignsAction,
	updateDiagnosisAction,
	updateLabTestAction,
	updateVitalSignsAction,
} from '@/actions/medical.action'
import {
	DiagnosisCreateSchema,
	DiagnosisFilterSchema,
	DiagnosisUpdateSchema,
	LabTestByIdSchema,
	LabTestByMedicalRecordSchema,
	LabTestCreateSchema,
	LabTestFilterSchema,
	LabTestUpdateSchema,
	MedicalRecordByIdSchema,
	MedicalRecordCreateSchema,
	MedicalRecordFilterSchema,
	PrescriptionFilterSchema,
	VitalSignsCreateSchema,
	VitalSignsUpdateSchema,
} from '@/schemas'
import {
	DiagnosisByAppointmentSchema,
	DiagnosisByIdSchema,
	DiagnosisByMedicalRecordSchema,
	VitalSignsByIdSchema,
	VitalSignsByMedicalRecordSchema,
	VitalSignsByPatientSchema,
} from '@/schemas/encounter.schema'
import { medicalService } from '@/server/services/medical.service'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const medicalRouter = createTRPCRouter({
	// ==================== DIAGNOSIS QUERIES ====================

	getDiagnosisById: protectedProcedure
		.input(DiagnosisByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getDiagnosisById(input.id, clinicId)
		}),

	getDiagnosesByPatient: protectedProcedure
		.input(
			DiagnosisFilterSchema.pick({
				patientId: true,
				startDate: true,
				endDate: true,
				type: true,
				limit: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.patientId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getDiagnosesByPatient(input.patientId, clinicId, {
				startDate: input.startDate,
				endDate: input.endDate,
				type: input.type,
				limit: input.limit,
			})
		}),

	getDiagnosesByMedicalRecord: protectedProcedure
		.input(DiagnosisByMedicalRecordSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.medicalId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getDiagnosesByMedicalRecord(
				input.medicalId,
				clinicId
			)
		}),

	getDiagnosesByAppointment: protectedProcedure
		.input(DiagnosisByAppointmentSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.appointmentId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getDiagnosesByAppointment(
				input.appointmentId,
				clinicId
			)
		}),

	getDiagnosesByDoctor: protectedProcedure
		.input(
			z.object({
				doctorId: z.string().uuid(),
				limit: z.number().min(1).max(100).optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getDiagnosesByDoctor(
				input.doctorId,
				clinicId,
				input.limit
			)
		}),

	// ==================== MEDICAL RECORDS QUERIES ====================

	getMedicalRecordById: protectedProcedure
		.input(MedicalRecordByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getMedicalRecordById(input.id, clinicId)
		}),

	getMedicalRecordsByPatient: protectedProcedure
		.input(
			MedicalRecordFilterSchema.pick({
				patientId: true,
				limit: true,
				offset: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.patientId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getMedicalRecordsByPatient(
				input.patientId,
				clinicId,
				{ limit: input.limit, offset: input.offset }
			)
		}),

	getMedicalRecordsByClinic: protectedProcedure
		.input(
			MedicalRecordFilterSchema.pick({
				search: true,
				startDate: true,
				endDate: true,
				page: true,
				limit: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const limit = input.limit || 20
			const offset = ((input.page || 1) - 1) * limit

			const [records, total] = await Promise.all([
				medicalService.getMedicalRecordsByClinic(clinicId, {
					search: input.search,
					startDate: input.startDate,
					endDate: input.endDate,
					limit,
					offset,
				}),
				medicalService.getMedicalRecordsCount(clinicId, input.search),
			])

			return {
				data: records,
				page: input.page || 1,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			}
		}),

	// ==================== LAB TESTS QUERIES ====================

	getLabTestById: protectedProcedure
		.input(LabTestByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getLabTestById(input.id, clinicId)
		}),

	getLabTestsByMedicalRecord: protectedProcedure
		.input(LabTestByMedicalRecordSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getLabTestsByMedicalRecord(
				input.medicalId,
				clinicId
			)
		}),

	getLabTestsByPatient: protectedProcedure
		.input(
			LabTestFilterSchema.pick({
				patientId: true,
				startDate: true,
				endDate: true,
				status: true,
				limit: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.patientId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getLabTestsByPatient(input.patientId, clinicId, {
				startDate: input.startDate,
				endDate: input.endDate,
				status: input.status,
				limit: input.limit,
			})
		}),

	getLabTestsByService: protectedProcedure
		.input(
			LabTestFilterSchema.pick({
				serviceId: true,
				startDate: true,
				endDate: true,
				status: true,
				limit: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.serviceId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getLabTestsByService(clinicId, input.serviceId, {
				startDate: input.startDate,
				endDate: input.endDate,
				status: input.status,
				limit: input.limit,
			})
		}),

	// ==================== PRESCRIPTIONS QUERIES ====================

	getPrescriptionsByMedicalRecord: protectedProcedure
		.input(
			PrescriptionFilterSchema.pick({
				medicalRecordId: true,
				limit: true,
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.medicalRecordId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getPrescriptionsByMedicalRecord(
				input.medicalRecordId,
				clinicId,
				{ limit: input.limit }
			)
		}),

	getActivePrescriptionsByPatient: protectedProcedure
		.input(z.object({ patientId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getActivePrescriptionsByPatient(
				input.patientId,
				clinicId
			)
		}),

	// ==================== VITAL SIGNS QUERIES ====================

	getVitalSignsById: protectedProcedure
		.input(VitalSignsByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.id) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getVitalSignsById(input.id, clinicId)
		}),

	getVitalSignsByMedicalRecord: protectedProcedure
		.input(VitalSignsByMedicalRecordSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId || !input.medicalId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getVitalSignsByMedicalRecord(
				input.medicalId,
				clinicId,
				{ limit: 'limit' in input ? (input.limit as number) : undefined }
			)
		}),

	getVitalSignsByPatient: protectedProcedure
		.input(VitalSignsByPatientSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getVitalSignsByPatient(input.patientId, clinicId, {
				startDate: input.startDate,
				endDate: input.endDate,
				limit: input.limit,
			})
		}),

	getLatestVitalSignsByPatient: protectedProcedure
		.input(z.object({ patientId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return medicalService.getLatestVitalSignsByPatient(
				input.patientId,
				clinicId
			)
		}),

	// ==================== MUTATIONS (Delegates to actions) ====================

	createDiagnosis: protectedProcedure
		.input(DiagnosisCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return createDiagnosisAction({
				...input,
				clinicId,
			})
		}),

	updateDiagnosis: protectedProcedure
		.input(DiagnosisUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return updateDiagnosisAction(input)
		}),

	createMedicalRecord: protectedProcedure
		.input(MedicalRecordCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return createMedicalRecordAction({
				...input,
				clinicId,
			})
		}),

	createLabTest: protectedProcedure
		.input(LabTestCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return createLabTestAction({
				...input,
				clinicId,
			})
		}),

	updateLabTest: protectedProcedure
		.input(LabTestUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return updateLabTestAction(input)
		}),

	createVitalSigns: protectedProcedure
		.input(VitalSignsCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return createVitalSignsAction({
				...input,
				clinicId,
			})
		}),

	updateVitalSigns: protectedProcedure
		.input(VitalSignsUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return updateVitalSignsAction(input)
		}),
})
