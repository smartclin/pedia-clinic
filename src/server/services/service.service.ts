/**
 * 🟡 SERVICE MODULE - SERVICE LAYER
 *
 * RESPONSIBILITIES:
 * - Business logic and validation
 * - Orchestrates queries and cache invalidation
 * - NO 'use cache' directives
 * - NO direct Prisma calls
 * - Calls query layer for data access
 * - Uses cache helpers for invalidation
 * - Permission checks via userId
 */

import { TRPCError } from '@trpc/server'

import type {
	CreateServiceInput,
	ServiceFilters,
	UpdateServiceInput,
} from '@/schemas/service.schema'
import { serviceQueries } from '@/server/db/queries/service.query'
import type { ServiceCategory } from '@/types'
import { toNumber } from '@/utils/decimal'

import { cacheHelpers } from '../../lib/cache/helpers'
import { validateClinicAccess } from '../utils'

class ServiceService {
	// ==================== GET METHODS ====================

	async getServiceById(id: string, clinicId: string) {
		const service = await serviceQueries.findServiceById(id)

		if (!service) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		// Verify clinic access (global services have no clinicId)
		if (service.clinicId && service.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this service',
			})
		}

		return service
	}

	async getServicesByClinic(
		clinicId: string,
		filters?: Partial<ServiceFilters>
	) {
		// Verify clinic access
		await validateClinicAccess(clinicId, '') // Pass empty userId if not needed

		return serviceQueries.findServiceByClinic(clinicId, filters)
	}

	async getServicesByCategory(
		clinicId: string,
		category: string,
		options?: { limit?: number }
	) {
		// Verify clinic access
		await validateClinicAccess(clinicId, '')

		return serviceQueries.findServicesByCategory(clinicId, category, options)
	}

	async getServicesWithFilters(filters: ServiceFilters, userId: string) {
		// Verify clinic access if clinicId is provided
		if (filters.clinicId) {
			await validateClinicAccess(filters.clinicId, userId)
		}

		const [services, total] = await Promise.all([
			serviceQueries.findServicesWithFilters(filters),
			serviceQueries.countServices(filters),
		])

		// Type assertion: Prisma count() returns number, but dedupeQuery wrapper loses type info
		const totalCount = total as number

		const page = filters.pagination?.offset || 1
		const limit = filters.pagination?.limit || 20

		return {
			data: services,
			meta: {
				limit,
				page,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limit),
			},
		}
	}

	async getServiceStats(
		clinicId: string,
		userId: string
	): Promise<{
		total: number
		averagePrice: number | null
		minPrice: number | null
		maxPrice: number | null
		byCategory: unknown // Adjust type if possible
	}> {
		// Verify clinic access
		await validateClinicAccess(clinicId, userId)

		const [stats, categoryStats] = await Promise.all([
			serviceQueries.getServiceStats(clinicId),
			serviceQueries.getServicesByCategoryStats(clinicId),
		])

		// Type assertion: Prisma aggregate() returns specific type, but dedupeQuery wrapper loses type info
		const aggregateStats = stats as {
			_count: number
			_avg: { price: number | null }
			_min: { price: number | null }
			_max: { price: number | null }
		}

		return {
			averagePrice: toNumber(aggregateStats._avg.price),
			byCategory: categoryStats,
			maxPrice: toNumber(aggregateStats._max.price),
			minPrice: toNumber(aggregateStats._min.price),
			total: aggregateStats._count,
		}
	}

	// ==================== CREATE METHODS ====================

	async createService(input: CreateServiceInput, userId: string) {
		// Verify clinic access if clinicId is provided
		if (input.clinicId) {
			await validateClinicAccess(input.clinicId, userId)
		}

		// Check if service with same name exists in clinic
		const existing = await serviceQueries.checkServiceNameExists(
			input.serviceName,
			input.clinicId
		)

		if (existing) {
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'A service with this name already exists in this clinic',
			})
		}

		const service = await serviceQueries.createService({
			...input,
			isAvailable: true,
			status: input.status || 'ACTIVE',
		})

		// Cache invalidation
		if (input.clinicId) {
			cacheHelpers.service.invalidateClinic(input.clinicId)
			cacheHelpers.admin.invalidateDashboard(input.clinicId)
		}

		return service
	}

	// ==================== UPDATE METHODS ====================

	async updateService(input: UpdateServiceInput, userId: string) {
		// Get existing service
		const existing = await serviceQueries.findServiceById(input.id)
		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		// Verify clinic access
		const clinicId = existing.clinicId || input.clinicId
		if (clinicId) {
			await validateClinicAccess(clinicId, userId)
		}

		// Check name uniqueness if name is being updated
		if (input.serviceName && input.serviceName !== existing.serviceName) {
			const nameExists = await serviceQueries.checkServiceNameExists(
				input.serviceName,
				clinicId,
				input.id
			)

			if (nameExists) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'A service with this name already exists',
				})
			}
		}

		const service = await serviceQueries.updateService(input.id, {
			category: input.category as ServiceCategory,
			color: input.color,
			description: input.description,
			duration: input.duration,
			icon: input.icon,
			isAvailable: input.isAvailable,
			price: input.price,
			serviceName: input.serviceName,
			status: input.status,
		})

		// Cache invalidation
		cacheHelpers.service.invalidate(input.id, clinicId ?? '')
		if (clinicId) {
			cacheHelpers.admin.invalidateDashboard(clinicId)
		}

		return service
	}

	// ==================== DELETE METHODS ====================

	async softDeleteService(id: string, reason: string, userId: string) {
		// Get existing service
		const existing = await serviceQueries.findServiceById(id)
		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		// Verify clinic access
		const clinicId = existing.clinicId
		if (clinicId) {
			await validateClinicAccess(clinicId, userId)
		}

		// Check if service is in use
		const hasAppointments =
			existing.appointments && existing.appointments.length > 0
		const hasBills = existing.bills && existing.bills.length > 0
		const hasLabTests = existing.labtest && existing.labtest.length > 0

		if (hasAppointments || hasBills || hasLabTests) {
			throw new TRPCError({
				code: 'PRECONDITION_FAILED',
				message:
					'Cannot delete service with existing appointments, bills, or lab tests',
			})
		}

		const service = await serviceQueries.softDeleteService(
			id,
			new Date(),
			reason
		)

		// Cache invalidation
		cacheHelpers.service.invalidate(id, clinicId ?? '')
		if (clinicId) {
			cacheHelpers.service.invalidateClinic(clinicId)
			cacheHelpers.admin.invalidateDashboard(clinicId)
		}

		return service
	}

	async restoreService(id: string, userId: string) {
		// Get existing service
		const existing = await serviceQueries.findServiceById(id)
		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		// Verify clinic access
		const clinicId = existing.clinicId
		if (clinicId) {
			await validateClinicAccess(clinicId, userId)
		}

		const service = await serviceQueries.restoreService(id)

		// Cache invalidation
		cacheHelpers.service.invalidate(id, clinicId ?? '')
		if (clinicId) {
			cacheHelpers.service.invalidateClinic(clinicId)
			cacheHelpers.admin.invalidateDashboard(clinicId)
		}

		return service
	}

	async permanentlyDeleteService(id: string, userId: string) {
		// Get existing service
		const existing = await serviceQueries.findServiceById(id)
		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		// Verify clinic access
		const clinicId = existing.clinicId
		if (clinicId) {
			await validateClinicAccess(clinicId, userId)
		}

		// Check if service is in use
		const hasAppointments =
			existing.appointments && existing.appointments.length > 0
		const hasBills = existing.bills && existing.bills.length > 0
		const hasLabTests = existing.labtest && existing.labtest.length > 0

		if (hasAppointments || hasBills || hasLabTests) {
			throw new TRPCError({
				code: 'PRECONDITION_FAILED',
				message:
					'Cannot permanently delete service with existing appointments, bills, or lab tests',
			})
		}

		await serviceQueries.permanentlyDeleteService(id)

		// Cache invalidation
		cacheHelpers.service.invalidate(id, clinicId ?? '')
		if (clinicId) {
			cacheHelpers.service.invalidateClinic(clinicId)
			cacheHelpers.admin.invalidateDashboard(clinicId)
		}

		return { success: true }
	}

	// ==================== BULK METHODS ====================

	async bulkUpdateServiceStatus(
		ids: string[],
		status: string,
		userId: string
	): Promise<unknown> {
		if (ids.length === 0) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'No service IDs provided',
			})
		}

		// Get first service to verify clinic access
		const firstService = await serviceQueries.findServiceById(ids[0] ?? '')
		if (!firstService) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Service not found',
			})
		}

		const clinicId = firstService.clinicId
		if (clinicId) {
			await validateClinicAccess(clinicId, userId)
		}

		const result = await serviceQueries.bulkUpdateStatus(ids, status)

		// Cache invalidation
		for (const id of ids) {
			cacheHelpers.service.invalidate(id, clinicId ?? '')
		}
		if (clinicId) {
			cacheHelpers.service.invalidateClinic(clinicId)
			cacheHelpers.admin.invalidateDashboard(clinicId)
		}

		return result
	}
}

export const serviceService = new ServiceService()
