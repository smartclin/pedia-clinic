// /src/server/services/admin.service.ts
'use cache' // File-level caching for all exported functions

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

/**
 * 🟡 ADMIN SERVICE LAYER
 * - Business logic ONLY
 * - NO direct database calls (delegates to query layer)
 * - Uses 'use cache' for automatic caching
 * - Handles cache invalidation via helpers
 */
export class AdminService {
	// ==================== CACHED QUERIES ====================

	/**
	 * Get dashboard stats with caching
	 * Profile: minutes - 5 min stale, 10 min revalidate
	 */
	async getDashboardStats(clinicId: string, userId?: string) {
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
	async getDashboardStatsByDateRange(
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
	async getClinicCounts(clinicId: string) {
		'use cache'

		cacheTag(`clinic:counts:${clinicId}`)
		cacheLife('minutes')

		return adminQueries.getClinicCounts(clinicId)
	}

	/**
	 * Get data list with pagination
	 */
	async getDataList(input: GetDataListInput & { userId: string }) {
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
	async getServices(clinicId: string, userId?: string) {
		'use cache'

		cacheTag(`service:list:${clinicId}`, `service:available:${clinicId}`)
		cacheLife('hours') // 1 hour stale, 2 hour revalidate

		if (userId) await validateClinicAccess(clinicId, userId)
		return adminQueries.getServices(clinicId)
	}

	/**
	 * Get service by ID
	 */
	async getServiceById(id: string, clinicId: string, userId?: string) {
		'use cache'

		cacheTag(`service:${id}`, `service:list:${clinicId}`)
		cacheLife('minutes')

		if (userId) await validateClinicAccess(clinicId, userId)
		return adminQueries.getServiceById(id, clinicId)
	}

	/**
	 * Get services with usage statistics
	 */
	async getServicesWithUsage(clinicId: string) {
		'use cache'

		cacheTag(`service:usage:${clinicId}`, `service:list:${clinicId}`)
		cacheLife('minutes')

		return adminQueries.getServicesWithUsage(clinicId)
	}

	/**
	 * Get staff list
	 */
	async getStaffList(clinicId: string, userId?: string) {
		'use cache'

		cacheTag(`staff:list:${clinicId}`)
		cacheLife('hours')

		if (userId) await validateClinicAccess(clinicId, userId)
		return adminQueries.getStaffList(clinicId)
	}

	/**
	 * Get staff by ID
	 */
	async getStaffById(id: string, clinicId: string) {
		'use cache'

		cacheTag(`staff:${id}`, `staff:list:${clinicId}`)
		cacheLife('minutes')

		return adminQueries.getStaffById(id, clinicId)
	}

	/**
	 * Get doctor list
	 */
	async getDoctorList(clinicId: string, userId?: string) {
		'use cache'

		cacheTag(`doctor:list:${clinicId}`, `workingDays:clinic:${clinicId}`)
		cacheLife('hours')

		if (userId) await validateClinicAccess(clinicId, userId)
		return adminQueries.getDoctorList(clinicId)
	}

	/**
	 * Get doctor by ID
	 */
	async getDoctorById(id: string, clinicId: string) {
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
	async getPatientById(id: string, clinicId: string) {
		'use cache'

		cacheTag(`patient:${id}`, `patient:list:${clinicId}`)
		cacheLife('minutes')

		return adminQueries.getPatientById(id, clinicId)
	}

	/**
	 * Get today's schedule
	 */
	async getTodaySchedule(clinicId: string) {
		'use cache'

		cacheTag(`appointment:today:${clinicId}`, `clinic:dashboard:${clinicId}`)
		cacheLife({ revalidate: 30, stale: 10 }) // 10 sec stale, 30 sec revalidate

		return adminQueries.getTodaySchedule(clinicId)
	}

	/**
	 * Get recent activity
	 */
	async getRecentActivity(userId: string, clinicId: string, limit = 20) {
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
	async createStaff(input: CreateStaffInput, userId: string) {
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
		await cacheHelpers.staff.invalidateClinic(input.clinicId)
		await cacheHelpers.admin.invalidateDashboard(input.clinicId)

		return staff
	}

	/**
	 * Create doctor
	 */
	async createDoctor(input: CreateDoctorInput, userId: string) {
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
		await cacheHelpers.doctor.invalidateClinic(input.clinicId)
		await cacheHelpers.admin.invalidateDashboard(input.clinicId)

		return doctor
	}

	/**
	 * Create service
	 */
	async createService(input: ServiceInput, userId: string) {
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

		await cacheHelpers.service.invalidateClinic(input.clinicId ?? '')
		await cacheHelpers.admin.invalidateDashboard(input.clinicId ?? '')

		return service
	}

	/**
	 * Update service
	 */
	async updateService(input: ServiceInput, userId: string) {
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

		await cacheHelpers.service.invalidate(input.id, input.clinicId ?? '')
		await cacheHelpers.admin.invalidateDashboard(input.clinicId ?? '')

		return service
	}

	/**
	 * Toggle service availability
	 */
	async toggleServiceAvailability(
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

		await cacheHelpers.service.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		return updated
	}

	/**
	 * Delete doctor
	 */
	async deleteDoctor(id: string, clinicId: string, userId: string) {
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

		await cacheHelpers.doctor.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		// Auth cleanup (fire and forget)
		this.cleanupUserAccount(id, 'doctor').catch(console.error)
	}

	/**
	 * Delete staff
	 */
	async deleteStaff(id: string, clinicId: string, userId: string) {
		await validateClinicAccess(clinicId, userId)

		const staff = await adminQueries.getStaffById(id, clinicId)
		if (!staff)
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Staff not found' })

		if (staff.status === 'ACTIVE') {
			await adminQueries.archiveStaff(id, clinicId)
		} else {
			await adminQueries.deleteStaff(id, clinicId)
			this.cleanupUserAccount(id, 'staff').catch(console.error)
		}

		await cacheHelpers.staff.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)
	}

	/**
	 * Delete patient
	 */
	async deletePatient(id: string, clinicId: string, userId: string) {
		await validateClinicAccess(clinicId, userId)

		const hasOutstandingBills =
			await adminQueries.getPatientOutstandingBills(id)
		if (hasOutstandingBills) {
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'Cannot delete patient with outstanding bills',
			})
		}

		await adminQueries.deletePatient(id, clinicId)

		await cacheHelpers.patient.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		this.cleanupUserAccount(id, 'patient').catch(console.error)
	}

	/**
	 * Delete payment
	 */
	async deletePayment(id: string, clinicId: string, userId: string) {
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
			await cacheHelpers.financial.payment.invalidate(
				id,
				payment.patientId,
				clinicId
			)
		}
	}

	/**
	 * Delete bill
	 */
	async deleteBill(id: string, clinicId: string, userId: string) {
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
			await cacheHelpers.financial.bill.invalidate(
				id,
				bill.payment.patientId,
				bill.service?.clinicId ?? ''
			)
		}
	}

	/**
	 * Delete service (soft or hard based on dependencies)
	 */
	async deleteService(id: string, clinicId: string, userId: string) {
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

			await cacheHelpers.service.invalidate(id, clinicId)
			await cacheHelpers.admin.invalidateDashboard(clinicId)

			return {
				action: 'archived',
				data: archivedService,
				message:
					'Service archived successfully. It is still linked to patient records.',
			}
		}

		// Hard delete
		const deletedService = await adminQueries.deleteService(id, clinicId)

		await cacheHelpers.service.invalidate(id, clinicId)
		await cacheHelpers.service.invalidateClinic(clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		return {
			action: 'deleted',
			data: deletedService,
			message: 'Service permanently deleted.',
		}
	}

	/**
	 * Soft delete service
	 */
	async softDeleteService(id: string, clinicId: string, userId: string) {
		await validateClinicAccess(clinicId, userId)

		const service = await adminQueries.softDeleteService(id, clinicId)

		await cacheHelpers.service.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		return service
	}

	/**
	 * Restore service
	 */
	async restoreService(id: string, clinicId: string, userId: string) {
		await validateClinicAccess(clinicId, userId)

		const service = await adminQueries.restoreService(id, clinicId)

		await cacheHelpers.service.invalidate(id, clinicId)
		await cacheHelpers.admin.invalidateDashboard(clinicId)

		return service
	}

	/**
	 * Generic delete dispatcher
	 */
	async deleteData(
		input: { id: string; deleteType: string; clinicId: string },
		userId: string
	) {
		switch (input.deleteType) {
			case 'doctor':
				await this.deleteDoctor(input.id, input.clinicId, userId)
				break
			case 'staff':
				await this.deleteStaff(input.id, input.clinicId, userId)
				break
			case 'service':
				await this.toggleServiceAvailability(
					input.id,
					input.clinicId,
					userId,
					false
				)
				break
			case 'patient':
				await this.deletePatient(input.id, input.clinicId, userId)
				break
			case 'payment':
				await this.deletePayment(input.id, input.clinicId, userId)
				break
			case 'bill':
				await this.deleteBill(input.id, input.clinicId, userId)
				break
			default:
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: `Invalid delete type: ${input.deleteType}`,
				})
		}

		// Log deletion
		await this.logDeletion(input.id, input.deleteType, userId, input.clinicId)
	}

	// ==================== PRIVATE UTILITIES ====================

	private async logDeletion(
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

	private async cleanupUserAccount(userId: string, role: string) {
		try {
			console.log(`Auth cleanup initiated for ${role} ${userId}`)
			// In production, queue this or delegate to auth service
		} catch (error) {
			console.error(`Auth cleanup failed for ${role} ${userId}:`, error)
		}
	}
}

// Export singleton instance
export const adminService = new AdminService()
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
