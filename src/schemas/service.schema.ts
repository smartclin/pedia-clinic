import z from 'zod'

import { paginationSchema } from './helpers/enums'

export const serviceCategoryEnum = z.enum([
	'CONSULTATION',
	'LAB_TEST',
	'VACCINATION',
	'PROCEDURE',
	'PHARMACY',
	'EMERGENCY',
	'OTHER',
])

export const serviceStatusEnum = z.enum(['ACTIVE', 'INACTIVE'])

export const ServiceCreateSchema = z.object({
	category: serviceCategoryEnum.optional(),
	clinicId: z.string().optional(), // Optional for global services
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
		.optional(),
	description: z.string().min(1, 'Description is required').max(1000),
	duration: z.number().int().positive('Duration must be positive').optional(),
	icon: z.string().optional(),
	price: z.number().positive('Price must be positive'),
	serviceName: z.string().min(1, 'Service name is required').max(200),
	status: serviceStatusEnum.default('ACTIVE').optional(),
})

export const updateServiceSchema = z.object({
	category: serviceCategoryEnum.optional(),
	clinicId: z.string().optional(),
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i)
		.optional(),
	deletedAt: z.date().optional().nullable(),
	description: z.string().min(1).max(1000).optional(),
	duration: z.number().int().positive().optional(),
	icon: z.string().optional(),
	id: z.uuid('Invalid service ID'),
	isAvailable: z.boolean().optional(),
	price: z.number().positive().optional(),
	serviceName: z.string().min(1).max(200).optional(),
	status: serviceStatusEnum.optional(),
})

export const ServiceFilterSchema = z.object({
	category: serviceCategoryEnum.optional(),
	clinicId: z.string().optional(),
	filters: z
		.array(
			z.object({
				field: z.string(),
				operator: z.string(),
				value: z.string(),
			})
		)
		.optional(),
	includeDeleted: z.boolean().default(false),
	isAvailable: z.boolean().optional(),
	maxPrice: z.number().positive().optional(),
	minPrice: z.number().positive().optional(),
	pagination: paginationSchema.optional(),
	search: z.string().optional(),
	serviceName: z.string().optional(),
	status: serviceStatusEnum.optional(),
})
// Add to existing schemas
export const bulkUpdateStatusSchema = z.object({
	ids: z.array(z.uuid()),
	status: z.enum(['ACTIVE', 'INACTIVE']),
})

export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>
export const serviceIdSchema = z.object({
	id: z.uuid('Invalid service ID'),
})
export const serviceDeleteSchema = z.object({
	deletedAt: z.date().default(new Date()),
	id: z.uuid('Invalid service ID'),
	reason: z.string().min(1).max(200),
})

export const clinicServicesSchema = z.object({
	clinicId: z.string(),
	includeAppointments: z.boolean().default(false),
	includeBills: z.boolean().default(false),
})

// Export types
export type CreateServiceInput = z.infer<typeof ServiceCreateSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type ServiceFilters = z.infer<typeof ServiceFilterSchema>
export type ServiceIdInput = z.infer<typeof serviceIdSchema>
export type ClinicServicesInput = z.infer<typeof clinicServicesSchema>
