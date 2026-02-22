import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import { cacheHelpers } from '@/cache/helpers'
import type {
	CreateStaffInput,
	GetDataListInput,
	ServiceInput,
} from '@/schemas/admin.schema'
import { db } from '@/server/db'
import { daysOfWeek, toNumber } from '@/utils'

import type { CreateDoctorInput } from '../../schemas'
import { adminQueries, type WorkingDay } from '../db/queries'
import { validateClinicAccess } from '../utils'

export async function getDashboardStats(clinicId: string, userId?: string) {
	'use cache'

	// Apply cache tags
	cacheTag(
		`admin:dashboard:${clinicId}`,
		`clinic:dashboard:${clinicId}`,
		`clinic:counts:${clinicId}`
	)
	cacheLife('hours') // 5 min stale, 10 min revalidate

	if (userId) await validateClinicAccess(clinicId, userId)
	return adminQueries.getDashboardStats(clinicId)
}

/**
 * Get dashboard stats by date range
 */
export async function getDashboardStatsByDateRange(
	clinicId: string,
	from: Date,
	to: Date,
	userId?: string
) {
	'use cache'

	cacheTag(
		`admin:dashboard:range:${clinicId}:${from.toISOString()}:${to.toISOString()}`,
		`clinic:dashboard:${clinicId}`
	)
	cacheLife('minutes')

	if (userId) await validateClinicAccess(clinicId, userId)

	const endDate = new Date(to)
	endDate.setHours(23, 59, 59, 999)

	return adminQueries.getAdminDashboardStatWithRange(clinicId, from, endDate)
}

/**
 * Get clinic counts
 */
export async function getClinicCounts(clinicId: string) {
	'use cache'

	cacheTag(`clinic:counts:${clinicId}`)
	cacheLife('minutes')

	return adminQueries.getClinicCounts(clinicId)
}

/**
 * Get data list with pagination
 */
export async function getDataList(
	input: GetDataListInput & { userId: string }
) {
	'use cache'

	const { type, clinicId, limit = 50, cursor, search, filter } = input

	cacheTag(`admin:list:${type}:${clinicId}`, `clinic:${type}:${clinicId}`)
	cacheLife('minutes')

	// Business logic: validate limits
	const safeLimit = Math.min(limit, 100)

	const items = await adminQueries.getDataList({
		clinicId,
		cursor,
		filter,
		limit: safeLimit,
		search,
		type,
	})

	// Handle pagination
	let nextCursor: typeof cursor = null
	if (items.length > safeLimit) {
		const nextItem = items.pop()
		nextCursor = nextItem?.id ?? null
	}

	return {
		hasMore: !!nextCursor,
		items,
		nextCursor,
	}
}

/**
 * Get services list
 */
export async function getServices(clinicId: string, userId?: string) {
	'use cache'

	cacheTag(`service:list:${clinicId}`, `service:available:${clinicId}`)
	cacheLife('hours') // 1 hour stale, 2 hour revalidate

	if (userId) await validateClinicAccess(clinicId, userId)
	return adminQueries.getServices(clinicId)
}

/**
 * Get service by ID
 */
export async function getServiceById(
	id: string,
	clinicId: string,
	userId?: string
) {
	'use cache'

	cacheTag(`service:${id}`, `service:list:${clinicId}`)
	cacheLife('minutes')

	if (userId) await validateClinicAccess(clinicId, userId)
	return adminQueries.getServiceById(id, clinicId)
}

/**
 * Get services with usage statistics
 */
export async function getServicesWithUsage(clinicId: string) {
	'use cache'

	cacheTag(`service:usage:${clinicId}`, `service:list:${clinicId}`)
	cacheLife('minutes')

	return adminQueries.getServicesWithUsage(clinicId)
}

/**
 * Get staff list
 */
export async function getStaffList(clinicId: string, userId?: string) {
	'use cache'

	cacheTag(`staff:list:${clinicId}`)
	cacheLife('hours')

	if (userId) await validateClinicAccess(clinicId, userId)
	return adminQueries.getStaffList(clinicId)
}

/**
 * Get staff by ID
 */
export async function getStaffById(id: string, clinicId: string) {
	'use cache'

	cacheTag(`staff:${id}`, `staff:list:${clinicId}`)
	cacheLife('minutes')

	return adminQueries.getStaffById(id, clinicId)
}

/**
 * Get doctor list
 */
export async function getDoctorList(clinicId: string, userId?: string) {
	'use cache'

	cacheTag(`doctor:list:${clinicId}`, `workingDays:clinic:${clinicId}`)
	cacheLife('hours')

	if (userId) await validateClinicAccess(clinicId, userId)
	return adminQueries.getDoctorList(clinicId)
}

/**
 * Get doctor by ID
 */
export async function getDoctorById(id: string, clinicId: string) {
	'use cache'

	cacheTag(
		`doctor:${id}`,
		`doctor:list:${clinicId}`,
		`workingDays:doctor:${id}`
	)
	cacheLife('minutes')

	return adminQueries.getDoctorById(id, clinicId)
}

/**
 * Get patient by ID
 */
export async function getPatientById(id: string, clinicId: string) {
	'use cache'

	cacheTag(`patient:${id}`, `patient:list:${clinicId}`)
	cacheLife('minutes')

	return adminQueries.getPatientById(id, clinicId)
}

/**
 * Get today's schedule
 */
export async function getTodaySchedule(clinicId: string) {
	'use cache'

	cacheTag(`appointment:today:${clinicId}`, `clinic:dashboard:${clinicId}`)
	cacheLife({ revalidate: 30, stale: 10 }) // 10 sec stale, 30 sec revalidate

	return adminQueries.getTodaySchedule(clinicId)
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
	userId: string,
	clinicId: string,
	limit = 20
) {
	'use cache'

	cacheTag(
		`admin:activity:${userId}`,
		`admin:activity:clinic:${clinicId}`,
		`clinic:activity:${clinicId}`
	)
	cacheLife('hours')

	return adminQueries.getRecentActivity(userId, clinicId, limit)
}

// ==================== MUTATIONS ====================

/**
 * Create staff member
 */
export async function createStaff(input: CreateStaffInput, userId: string) {
	// Validate clinic access
	await validateClinicAccess(input.clinicId, userId)

	// Business rule validation
	if (!input.department)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Department is required',
		})
	if (!input.email)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Email is required',
		})
	if (!input.phone)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Phone is required',
		})

	const staff = await adminQueries.createStaff(input)

	// Invalidate caches
	cacheHelpers.staff.invalidateClinic(input.clinicId)
	cacheHelpers.admin.invalidateDashboard(input.clinicId)

	return staff
}

/**
 * Create doctor
 */
export async function createDoctor(input: CreateDoctorInput, userId: string) {
	// Validate clinic access
	await validateClinicAccess(input.clinicId, userId)

	// Business rule validation
	if (!input.specialty)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Specialty is required',
		})
	if (!input.availableFromTime || !input.availableToTime) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Available times are required',
		})
	}
	if (input.availableFromTime >= input.availableToTime) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Available from must be before available to',
		})
	}

	// Validate working days
	if (input.workSchedule?.length) {
		const invalidDays = input.workSchedule.filter(
			(ws: WorkingDay) => !daysOfWeek.includes(ws.day)
		)
		if (invalidDays.length > 0) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Invalid days: ${invalidDays.map((ws: WorkingDay) => ws.day).join(', ')}`,
			})
		}
	}

	const { workSchedule, ...rest } = input
	const doctorData = {
		...rest,
		appointmentPrice: toNumber(input.appointmentPrice) ?? 0,
	}

	const doctor = await adminQueries.createDoctor(doctorData, workSchedule)

	// Invalidate caches
	cacheHelpers.doctor.invalidateClinic(input.clinicId)
	cacheHelpers.admin.invalidateDashboard(input.clinicId)

	return doctor
}

/**
 * Create service
 */
export async function createService(input: ServiceInput, userId: string) {
	await validateClinicAccess(input.clinicId ?? '', userId)

	// Business rule validation
	if (input.price <= 0)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Price must be greater than 0',
		})
	if (!input.serviceName || input.serviceName.trim().length < 2) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Service name must be at least 2 characters',
		})
	}
	if (!input.description)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Description is required',
		})

	const serviceData = {
		...input,
		id: crypto.randomUUID(),
		isAvailable: input.isAvailable ?? true,
		isDeleted: false,
		price: Number(input.price),
		status: 'ACTIVE' as const,
	}

	const service = await adminQueries.createService(serviceData)

	cacheHelpers.service.invalidateClinic(input.clinicId ?? '')
	cacheHelpers.admin.invalidateDashboard(input.clinicId ?? '')

	return service
}

/**
 * Update service
 */
export async function updateService(input: ServiceInput, userId: string) {
	if (!input.id)
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Service ID is required',
		})

	await validateClinicAccess(input.clinicId ?? '', userId)

	if (input.price !== undefined && input.price <= 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Price must be greater than 0',
		})
	}

	const updateData = {
		...input,
		price: input.price ? Number(input.price) : 0,
	}

	const service = await adminQueries.updateService(updateData)

	cacheHelpers.service.invalidate(input.id, input.clinicId ?? '')
	cacheHelpers.admin.invalidateDashboard(input.clinicId ?? '')

	return service
}

/**
 * Toggle service availability
 */
export async function toggleServiceAvailability(
	id: string,
	clinicId: string,
	userId: string,
	isAvailable = true
) {
	await validateClinicAccess(clinicId, userId)

	const service = await adminQueries.getServiceById(id, clinicId)
	if (!service)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found' })

	const updated = await adminQueries.updateService({
		clinicId,
		description: service.description,
		id,
		isAvailable,
		price: toNumber(service.price),
		serviceName: service.serviceName,
	})

	cacheHelpers.service.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	return updated
}

/**
 * Delete doctor
 */
export async function deleteDoctor(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const upcomingAppointments =
		await adminQueries.getDoctorUpcomingAppointments(id)
	if (upcomingAppointments > 0) {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'Cannot delete doctor with upcoming appointments',
		})
	}

	await adminQueries.deleteDoctor(id, clinicId)

	cacheHelpers.doctor.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	// Auth cleanup (fire and forget)
	cleanupUserAccount(id, 'doctor').catch(console.error)
}

/**
 * Delete staff
 */
export async function deleteStaff(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const staff = await adminQueries.getStaffById(id, clinicId)
	if (!staff)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Staff not found' })

	if (staff.status === 'ACTIVE') {
		await adminQueries.archiveStaff(id, clinicId)
	} else {
		await adminQueries.deleteStaff(id, clinicId)
		cleanupUserAccount(id, 'staff').catch(console.error)
	}

	cacheHelpers.staff.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)
}

/**
 * Delete patient
 */
export async function deletePatient(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const hasOutstandingBills = await adminQueries.getPatientOutstandingBills(id)
	if (hasOutstandingBills) {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'Cannot delete patient with outstanding bills',
		})
	}

	await adminQueries.deletePatient(id, clinicId)

	cacheHelpers.patient.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	cleanupUserAccount(id, 'patient').catch(console.error)
}

/**
 * Delete payment
 */
export async function deletePayment(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const payment = await adminQueries.getPaymentById(id)
	if (!payment)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
	if (payment.status === 'REFUNDED') {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'Payment already refunded',
		})
	}

	await adminQueries.refundPayment(id)

	if (payment.patientId) {
		cacheHelpers.financial.payment.invalidate(id, payment.patientId, clinicId)
	}
}

/**
 * Delete bill
 */
export async function deleteBill(id: string, clinicId: string, userId: string) {
	await validateClinicAccess(clinicId, userId)

	const bill = await adminQueries.getBillById(id)
	if (!bill)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Bill not found' })
	if (bill.payment?.status === 'PAID') {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'Cannot delete paid bill',
		})
	}

	await adminQueries.deleteBill(id)

	if (bill.payment?.patientId) {
		cacheHelpers.financial.bill.invalidate(
			id,
			bill.payment.patientId,
			bill.service?.clinicId ?? ''
		)
	}
}

/**
 * Delete service (soft or hard based on dependencies)
 */
export async function deleteService(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const service = await adminQueries.getServiceById(id, clinicId)
	if (!service)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found' })

	const appointmentsCount = await adminQueries.countAppointmentsByService(
		id,
		clinicId
	)
	const billsCount = await adminQueries.countBillsByService(id, clinicId)

	// Rule: Cannot delete unavailable service
	if (!service.isAvailable) {
		throw new TRPCError({
			code: 'CONFLICT',
			message:
				'Cannot delete a service that is currently locked or unavailable',
		})
	}

	// Rule: If service has dependencies, soft delete
	if (appointmentsCount > 0 || billsCount > 0) {
		const archivedService = await adminQueries.softDeleteService(id, clinicId)

		cacheHelpers.service.invalidate(id, clinicId)
		cacheHelpers.admin.invalidateDashboard(clinicId)

		return {
			action: 'archived',
			data: archivedService,
			message:
				'Service archived successfully. It is still linked to patient records.',
		}
	}

	// Hard delete
	const deletedService = await adminQueries.deleteService(id, clinicId)

	cacheHelpers.service.invalidate(id, clinicId)
	cacheHelpers.service.invalidateClinic(clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	return {
		action: 'deleted',
		data: deletedService,
		message: 'Service permanently deleted.',
	}
}

/**
 * Soft delete service
 */
export async function softDeleteService(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const service = await adminQueries.softDeleteService(id, clinicId)

	cacheHelpers.service.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	return service
}

/**
 * Restore service
 */
export async function restoreService(
	id: string,
	clinicId: string,
	userId: string
) {
	await validateClinicAccess(clinicId, userId)

	const service = await adminQueries.restoreService(id, clinicId)

	cacheHelpers.service.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	return service
}

/**
 * Generic delete dispatcher
 */
export async function deleteData(
	input: { id: string; deleteType: string; clinicId: string },
	userId: string
) {
	switch (input.deleteType) {
		case 'doctor':
			await deleteDoctor(input.id, input.clinicId, userId)
			break
		case 'staff':
			await deleteStaff(input.id, input.clinicId, userId)
			break
		case 'service':
			await toggleServiceAvailability(input.id, input.clinicId, userId, false)
			break
		case 'patient':
			await deletePatient(input.id, input.clinicId, userId)
			break
		case 'payment':
			await deletePayment(input.id, input.clinicId, userId)
			break
		case 'bill':
			await deleteBill(input.id, input.clinicId, userId)
			break
		default:
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Invalid delete type: ${input.deleteType}`,
			})
	}

	// Log deletion
	await logDeletion(input.id, input.deleteType, userId, input.clinicId)
}

// ==================== PRIVATE UTILITIES ====================

export async function logDeletion(
	id: string,
	type: string,
	userId: string,
	clinicId: string
) {
	await db.auditLog.create({
		data: {
			action: 'DELETE',
			clinicId,
			details: `Record deleted by user ${userId}`,
			level: 'INFO',
			model: type,
			resource: id,
			userId,
		},
	})
}

export async function cleanupUserAccount(userId: string, role: string) {
	try {
		console.log(`Auth cleanup initiated for ${role} ${userId}`)
		// In production, queue or delegate to auth service
	} catch (error) {
		console.error(`Auth cleanup failed for ${role} ${userId}:`, error)
	}
}

// Export singleton instance
// export const adminService = new AdminService()
export async function getCachedClinicCounts(clinicId: string, userId: string) {
	// 1. Authorization check (security first)
	await validateClinicAccess(clinicId, userId)

	// 2. Identify the cache block
	cacheTag(`clinic:counts:${clinicId}`, `clinic:dashboard:${clinicId}`)

	// 3. Define volatility
	// Counts change often in a busy clinic, so we allow 1-minute staleness
	cacheLife('minutes')

	// 4. Delegate to the Query Layer
	return await adminQueries.getClinicCounts(clinicId)
}
