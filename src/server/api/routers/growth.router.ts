/**
 * 🟣 GROWTH MODULE - tRPC ROUTER
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
	createGrowthRecordAction,
	deleteGrowthRecordAction,
	updateGrowthRecordAction,
} from '@/actions/growth.action'
import {
	DeleteGrowthRecordSchema,
	GrowthComparisonSchema,
	GrowthProjectionSchema,
	GrowthRecordByIdSchema,
	GrowthRecordCreateSchema,
	GrowthRecordsByPatientSchema,
	GrowthRecordUpdateSchema,
	GrowthStandardsSchema,
	GrowthTrendsSchema,
	MultipleZScoreSchema,
	PatientZScoreChartSchema,
	VelocityCalculationSchema,
	ZScoreCalculationSchema,
	ZScoreChartSchema,
} from '@/schemas/growth.schema'
import * as growthService from '@/server/services/growth.service'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const growthRouter = createTRPCRouter({
	// ==================== QUERIES (Direct to service with caching) ====================

	getGrowthRecordById: protectedProcedure
		.input(GrowthRecordByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const record = await growthService.getGrowthRecordById(input.id)

			// Verify clinic access
			if (record.clinicId !== clinicId) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			return record
		}),

	getGrowthRecordsByPatient: protectedProcedure
		.input(GrowthRecordsByPatientSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getGrowthRecordsByPatient(
				input.patientId,
				clinicId,
				{ limit: input.limit, offset: input.offset }
			)
		}),

	getLatestGrowthRecord: protectedProcedure
		.input(z.object({ patientId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getLatestGrowthRecord(input.patientId, clinicId)
		}),

	getRecentGrowthRecords: protectedProcedure
		.input(z.object({ limit: z.number().min(1).max(50).default(20) }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getRecentGrowthRecords(clinicId, input.limit)
		}),

	getPatientMeasurements: protectedProcedure
		.input(
			z.object({
				patientId: z.string().uuid(),
				limit: z.number().min(1).max(100).default(50),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getPatientMeasurements(
				input.patientId,
				clinicId,
				input.limit
			)
		}),

	getGrowthSummary: protectedProcedure
		.input(z.object({ patientId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getGrowthSummary(input.patientId, clinicId)
		}),

	getClinicGrowthOverview: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		return growthService.getClinicGrowthOverview(clinicId)
	}),

	// ==================== WHO STANDARDS METHODS ====================

	getWHOStandards: protectedProcedure
		.input(GrowthStandardsSchema)
		.query(async ({ input }) => {
			return growthService.getWHOStandards(input)
		}),

	// ==================== CALCULATION METHODS ====================

	calculatePercentile: protectedProcedure
		.input(
			z.object({
				patientId: z.string().uuid(),
				measurement: z.object({
					ageMonths: z.number(),
					date: z.date(),
					type: z.enum(['WFA', 'HFA', 'HcFA']),
					value: z.number(),
				}),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.calculatePercentile({
				date: input.measurement.date,
				measurement: {
					ageMonths: input.measurement.ageMonths,
					type: input.measurement.type,
					value: input.measurement.value,
				},
				patientId: input.patientId,
			})
		}),

	getGrowthTrends: protectedProcedure
		.input(GrowthTrendsSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getGrowthTrends({
				...input,
				clinicId,
			})
		}),

	calculateVelocity: protectedProcedure
		.input(VelocityCalculationSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.calculateVelocity({
				...input,
				clinicId,
			})
		}),

	compareGrowth: protectedProcedure
		.input(GrowthComparisonSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.compareGrowth({
				...input,
				clinicId,
			})
		}),

	calculateZScore: protectedProcedure
		.input(ZScoreCalculationSchema)
		.query(async ({ input }) => {
			return growthService.calculateZScores(
				input.ageDays,
				input.weight,
				input.gender
			)
		}),

	calculateMultipleZScores: protectedProcedure
		.input(MultipleZScoreSchema)
		.query(async ({ input }) => {
			return growthService.calculateMultipleZScores(input.measurements)
		}),

	getGrowthProjection: protectedProcedure
		.input(GrowthProjectionSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getGrowthProjection(
				input.patientId,
				clinicId,
				input.chartType,
				input.projectionMonths
			)
		}),

	// ==================== CHART METHODS ====================

	getZScoreChartData: protectedProcedure
		.input(ZScoreChartSchema)
		.query(async ({ input }) => {
			return growthService.getZScoreChartData(input.gender, input.chartType)
		}),

	getPatientZScoreChart: protectedProcedure
		.input(PatientZScoreChartSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return growthService.getPatientZScoreChart(
				input.patientId,
				clinicId,
				input.chartType
			)
		}),

	getZScoreAreas: protectedProcedure
		.input(ZScoreChartSchema)
		.query(async ({ input }) => {
			return growthService.getZScoreAreas(input.gender, input.chartType)
		}),

	// ==================== MUTATIONS (Delegates to actions) ====================

	createGrowthRecord: protectedProcedure
		.input(GrowthRecordCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return createGrowthRecordAction({
				...input,
				clinicId,
			})
		}),

	updateGrowthRecord: protectedProcedure
		.input(GrowthRecordUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			if (!input.id) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'ID required' })
			}

			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return updateGrowthRecordAction(input.id, input)
		}),

	deleteGrowthRecord: protectedProcedure
		.input(DeleteGrowthRecordSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return deleteGrowthRecordAction(input)
		}),
})
