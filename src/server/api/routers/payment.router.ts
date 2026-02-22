import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { addNewBillAction, generateBillAction } from '@/actions/payment.action'
import {
	AddNewBillInputSchema,
	DiagnosisSchema,
	PaymentSchema,
} from '@/schemas/index'
import * as paymentService from '@/server/services/payment.service'

import { adminProcedure, createTRPCRouter, protectedProcedure } from '../trpc'

// Extend the DiagnosisSchema for the input
const AddDiagnosisInputSchema = DiagnosisSchema.extend({
	appointmentId: z.string(),
})

export const paymentsRouter = createTRPCRouter({
	// ==================== MUTATIONS (Direct to service or action) ====================

	generateBill: protectedProcedure
		.input(PaymentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			if (!userId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return generateBillAction(input)
		}),

	addNewBill: protectedProcedure
		.input(AddNewBillInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			if (!userId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return addNewBillAction(input)
		}),

	addDiagnosis: protectedProcedure
		.input(AddDiagnosisInputSchema)
		.mutation(async ({ input, ctx }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			try {
				const { appointmentId, ...validatedData } = input
				let medicalRecord = null

				// Create medical record if not provided
				if (!validatedData.medicalId) {
					medicalRecord = await ctx.prisma.medicalRecords.create({
						data: {
							appointmentId,
							clinicId,
							doctorId: validatedData.doctorId,
							patientId: validatedData.patientId,
						},
					})
				}

				const medicalId = validatedData.medicalId || medicalRecord?.id

				if (typeof medicalId !== 'string') {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Medical Record ID is invalid or missing.',
					})
				}

				// Create diagnosis
				await ctx.prisma.diagnosis.create({
					data: {
						diagnosis: validatedData.diagnosis,
						doctorId: validatedData.doctorId,
						followUpPlan: input.followUpPlan ?? null,
						medicalId,
						notes: validatedData.notes ?? null,
						patientId: validatedData.patientId,
						prescribedMedications: validatedData.prescribedMedications ?? null,
						symptoms: validatedData.symptoms,
					},
				})

				return {
					message: 'Diagnosis added successfully',
					success: true,
				}
			} catch (error) {
				console.error('Error adding diagnosis:', error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to add diagnosis',
				})
			}
		}),

	// ==================== QUERIES (Direct to service with caching) ====================

	getPatientPayments: protectedProcedure
		.input(z.object({ patientId: z.string() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return paymentService.getPatientPayments(input.patientId, clinicId)
		}),

	getPaymentRecords: adminProcedure
		.input(
			z.object({
				limit: z.union([z.number(), z.string()]).optional(),
				page: z.union([z.number(), z.string()]),
				search: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return paymentService.getPaymentRecords({
				clinicId,
				page: Number(input.page),
				limit: input.limit ? Number(input.limit) : undefined,
				search: input.search,
			})
		}),

	getRecentPayments: adminProcedure
		.input(
			z.object({
				limit: z.union([z.number(), z.string()]).optional(),
				page: z.union([z.number(), z.string()]),
				search: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return paymentService.getRecentPayments({
				clinicId,
				page: Number(input.page),
				limit: input.limit ? Number(input.limit) : undefined,
				search: input.search,
			})
		}),

	getPaymentById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return paymentService.getPaymentById(input.id, clinicId)
		}),

	getPaymentStats: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		return paymentService.getPaymentStats(clinicId)
	}),
})

// ==================== TYPE EXPORTS ====================

export type PaymentsRouter = typeof paymentsRouter
