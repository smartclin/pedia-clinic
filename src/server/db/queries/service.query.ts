/**
 * 🔵 SERVICE MODULE - QUERY LAYER
 *
 * RESPONSIBILITIES:
 * - Direct database queries
 * - No business logic
 * - Returns raw Prisma types
 */

import { dedupeQuery } from '@/cache/dedupe'
import type { Prisma } from '@/prisma/browser'
import type { ServiceFilters } from '@/schemas/service.schema'
import { db } from '@/server/db'
import type { ServiceCategory, Status } from '@/types'

export const serviceQueries = {
	// ==================== BULK METHODS ====================

	bulkCreateServices: dedupeQuery(
		async (
			services: Array<{
				serviceName: string
				description: string
				price: number
				clinicId: string
				category?: ServiceCategory
			}>
		) => {
			return db.service.createMany({
				data: services.map(s => ({
					id: crypto.randomUUID(),
					...s,
					createdAt: new Date(),
					updatedAt: new Date(),
				})),
			})
		}
	),

	bulkUpdateStatus: dedupeQuery(async (ids: string[], status: string) => {
		return db.service.updateMany({
			data: {
				status: status as Status,
				updatedAt: new Date(),
			},
			where: { id: { in: ids } },
		})
	}),

	// ==================== VERIFICATION METHODS ====================

	checkServiceExists: dedupeQuery(async (id: string, clinicId?: string) => {
		return db.service.findFirst({
			select: {
				category: true,
				clinicId: true,
				id: true,
				price: true,
				serviceName: true,
				status: true,
			},
			where: {
				id,
				...(clinicId && { clinicId }),
				isDeleted: false,
			},
		})
	}),

	checkServiceNameExists: dedupeQuery(
		async (serviceName: string, clinicId?: string, excludeId?: string) => {
			return db.service.findFirst({
				where: {
					serviceName: {
						equals: serviceName,
						mode: 'insensitive',
					},
					...(clinicId && { clinicId }),
					...(excludeId && { NOT: { id: excludeId } }),
					isDeleted: false,
				},
			})
		}
	),

	countServices: dedupeQuery(async (filters: ServiceFilters) => {
		const {
			clinicId,
			category,
			status,
			isAvailable,
			search,
			minPrice,
			maxPrice,
			includeDeleted,
		} = filters

		const where: Prisma.ServiceWhereInput = {
			...(clinicId && { clinicId }),
			...(category && { category: category as ServiceCategory }),
			...(status && { status }),
			...(isAvailable !== undefined && { isAvailable }),
			...(!includeDeleted && { isDeleted: false }),
		}

		if (search) {
			where.OR = [
				{ serviceName: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		if (minPrice !== undefined || maxPrice !== undefined) {
			where.price = {}
			if (minPrice !== undefined) {
				where.price.gte = minPrice
			}
			if (maxPrice !== undefined) {
				where.price.lte = maxPrice
			}
		}

		return db.service.count({ where })
	}),

	// ==================== CREATE METHODS ====================

	createService: dedupeQuery(
		async (data: {
			serviceName: string
			description: string
			price: number
			category?: string
			duration?: number
			clinicId?: string
			icon?: string
			color?: string
			status?: Status
			isAvailable?: boolean
		}) => {
			return db.service.create({
				data: {
					category: data.category as ServiceCategory,
					clinicId: data.clinicId,
					color: data.color,
					createdAt: new Date(),
					description: data.description,
					duration: data.duration,
					icon: data.icon,
					id: crypto.randomUUID(),
					isAvailable: data.isAvailable ?? true,
					price: data.price,
					serviceName: data.serviceName,
					status: data.status || 'ACTIVE',
					updatedAt: new Date(),
				},
				include: {
					clinic: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			})
		}
	),

	findServiceByClinic: dedupeQuery(
		async (clinicId: string, filters?: Partial<ServiceFilters>) => {
			const where: Prisma.ServiceWhereInput = {
				clinicId,
				isDeleted: filters?.includeDeleted ? undefined : false,
			}

			if (filters?.category) {
				where.category = filters.category as ServiceCategory
			}

			if (filters?.status) {
				where.status = filters.status
			}

			if (filters?.isAvailable !== undefined) {
				where.isAvailable = filters.isAvailable
			}

			if (filters?.serviceName) {
				where.serviceName = {
					contains: filters.serviceName,
					mode: 'insensitive',
				}
			}

			if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
				where.price = {}
				if (filters.minPrice !== undefined) {
					where.price.gte = filters.minPrice
				}
				if (filters.maxPrice !== undefined) {
					where.price.lte = filters.maxPrice
				}
			}

			if (filters?.search) {
				where.OR = [
					{ serviceName: { contains: filters.search, mode: 'insensitive' } },
					{ description: { contains: filters.search, mode: 'insensitive' } },
				]
			}

			return db.service.findMany({
				include: {
					_count: {
						select: {
							appointments: true,
							bills: true,
							labtest: true,
						},
					},
				},
				orderBy: { serviceName: 'asc' },
				where,
			})
		}
	),
	// ==================== FIND METHODS ====================

	findServiceById: dedupeQuery(async (id: string) => {
		return await db.service.findUnique({
			include: {
				appointments: {
					orderBy: { appointmentDate: 'desc' },
					take: 5,
				},
				bills: {
					include: {
						payment: {
							select: {
								amount: true,
								status: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
					take: 5,
				},
				clinic: {
					select: {
						id: true,
						name: true,
					},
				},
				labtest: true,
			},
			where: { id },
		})
	}),

	findServicesByCategory: dedupeQuery(
		async (
			clinicId: string,
			category: string,
			options?: { limit?: number }
		) => {
			return db.service.findMany({
				orderBy: { serviceName: 'asc' },
				where: {
					category: category as ServiceCategory,
					clinicId,
					isDeleted: false,
				},
				take: options?.limit || 20,
			})
		}
	),

	findServicesWithFilters: dedupeQuery(async (filters: ServiceFilters) => {
		const {
			clinicId,
			category,
			status,
			isAvailable,
			search,
			minPrice,
			maxPrice,
			includeDeleted,
			pagination,
		} = filters

		const where: Prisma.ServiceWhereInput = {
			...(clinicId && { clinicId }),
			...(category && { category: category as ServiceCategory }),
			...(status && { status }),
			...(isAvailable !== undefined && { isAvailable }),
			...(!includeDeleted && { isDeleted: false }),
		}

		if (search) {
			where.OR = [
				{ serviceName: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		if (minPrice !== undefined || maxPrice !== undefined) {
			where.price = {}
			if (minPrice !== undefined) {
				where.price.gte = minPrice
			}
			if (maxPrice !== undefined) {
				where.price.lte = maxPrice
			}
		}

		const page = pagination?.offset || 1
		const limit = pagination?.limit || 20
		const skip = (page - 1) * limit

		return db.service.findMany({
			include: {
				_count: {
					select: {
						appointments: true,
						bills: true,
						labtest: true,
					},
				},
				clinic: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: pagination?.sortBy
				? { [pagination.sortBy]: pagination.sortOrder || 'asc' }
				: { serviceName: 'asc' },
			skip,
			take: limit,
			where,
		})
	}),

	// ==================== STATISTICS METHODS ====================

	getServiceStats: dedupeQuery(async (clinicId: string) => {
		return db.service.aggregate({
			_avg: { price: true },
			_count: true,
			_max: { price: true },
			_min: { price: true },
			where: { clinicId, isDeleted: false },
		})
	}),

	getServicesByCategoryStats: dedupeQuery(async (clinicId: string) => {
		return db.service.groupBy({
			_avg: { price: true },
			_count: true,
			by: ['category'],
			where: { clinicId, isDeleted: false },
		})
	}),

	permanentlyDeleteService: dedupeQuery(async (id: string) => {
		return db.service.delete({
			where: { id },
		})
	}),

	restoreService: dedupeQuery(async (id: string) => {
		return db.service.update({
			data: {
				deletedAt: null,
				isDeleted: false,
				status: 'ACTIVE',
				updatedAt: new Date(),
			},
			where: { id },
		})
	}),

	// ==================== DELETE METHODS ====================

	softDeleteService: dedupeQuery(
		async (id: string, deletedAt: Date, _reason?: string) => {
			return db.service.update({
				data: {
					deletedAt,
					isDeleted: true,
					status: 'INACTIVE',
					updatedAt: new Date(),
				},
				where: { id },
			})
		}
	),

	// ==================== UPDATE METHODS ====================

	updateService: dedupeQuery(
		async (
			id: string,
			data: {
				serviceName?: string
				description?: string
				price?: number
				category?: ServiceCategory
				duration?: number
				isAvailable?: boolean
				icon?: string
				color?: string
				status?: Status
			}
		) => {
			return db.service.update({
				data: {
					...data,
					updatedAt: new Date(),
				},
				include: {
					clinic: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				where: { id },
			})
		}
	),
}
