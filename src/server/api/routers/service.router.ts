/**
 * 🟣 SERVICE MODULE - tRPC ROUTER
 *
 * RESPONSIBILITIES:
 * - tRPC procedure definitions
 * - Permission checks
 * - Input validation via schema
 * - Delegates to cache layer
 * - NO business logic
 * - NO database calls
 */

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	createServiceAction,
	deleteServiceAction,
	updateServiceAction,
} from '@/actions/admin.action'
import {
	bulkUpdateServiceStatusAction,
	permanentlyDeleteServiceAction,
	restoreServiceAction,
} from '@/actions/service.action'
import {
	ServiceCreateSchema,
	ServiceFilterSchema,
	serviceDeleteSchema,
	serviceIdSchema,
	updateServiceSchema,
} from '@/schemas/service.schema'
import * as serviceService from '@/server/services/service.service'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const serviceRouter = createTRPCRouter({
	bulkUpdateStatus: protectedProcedure
		.input(
			z.object({
				ids: z.array(z.uuid()),
				status: z.enum(['ACTIVE', 'INACTIVE']),
			})
		)
		.mutation(async ({ input }) => {
			return bulkUpdateServiceStatusAction(input.ids, input.status)
		}),

	// ==================== MUTATION PROCEDURES ====================

	create: protectedProcedure
		.input(ServiceCreateSchema)
		.mutation(async ({ input }) => {
			return createServiceAction(input)
		}),

	delete: protectedProcedure
		.input(serviceDeleteSchema)
		.mutation(async ({ input }) => {
			return deleteServiceAction(input.id, input.reason)
		}),

	getByCategory: protectedProcedure
		.input(
			z.object({
				category: z.string(),
				clinicId: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = (input.clinicId || ctx.clinic?.id) ?? ''
			if (!clinicId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Clinic ID is required',
				})
			}

			// Pass userId from context
			return serviceService.getServicesByCategory(input.category, clinicId, {
				limit: 50,
			})
		}),

	getByClinic: protectedProcedure
		.input(
			z.object({
				clinicId: z.string().optional(),
				filters: ServiceFilterSchema.partial().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = (input.clinicId || ctx.clinic?.id) ?? ''
			if (!clinicId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Clinic ID is required',
				})
			}

			// Pass userId from context
			return serviceService.getServicesByClinic(clinicId)
		}),
	// ==================== GET PROCEDURES ====================

	getById: protectedProcedure
		.input(serviceIdSchema)
		.query(async ({ ctx, input }) => {
			if (!ctx.clinic?.id) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Clinic ID is required',
				})
			}
			return serviceService.getServiceById(input.id, ctx.clinic?.id ?? '')
		}),

	getStats: protectedProcedure
		.input(
			z.object({
				clinicId: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = (input.clinicId || ctx.clinic?.id) ?? ''
			if (!clinicId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Clinic ID is required',
				})
			}

			// Pass userId from context
			return serviceService.getServiceStats(clinicId, ctx.user?.id ?? '')
		}),

	getWithFilters: protectedProcedure
		.input(ServiceFilterSchema)
		.query(async ({ ctx, input }) => {
			// Add clinicId from context if not provided
			const filters = {
				...input,
				clinicId: input.clinicId ?? '',
			}

			if (!filters.clinicId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Clinic ID is required',
				})
			}

			// Pass userId from context
			return serviceService.getServicesWithFilters(filters, ctx.user?.id ?? '')
		}),

	permanentlyDelete: protectedProcedure
		.input(serviceIdSchema)
		.mutation(async ({ input }) => {
			return permanentlyDeleteServiceAction(input.id)
		}),

	restore: protectedProcedure
		.input(serviceIdSchema)
		.mutation(async ({ input }) => {
			return restoreServiceAction(input.id)
		}),

	update: protectedProcedure
		.input(updateServiceSchema)
		.mutation(async ({ input }) => {
			return updateServiceAction(input)
		}),
})
