/**
 * 🟡 VISIT MODULE - SERVICE LAYER
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

import type { VisitCreateInput, VisitUpdateInput } from '@/schemas'
import { visitQueries, type WorkingDay } from '@/server/db/queries'
import type { AppointmentStatus } from '@/types'

import { cacheHelpers } from '../../lib/cache/helpers'
import { validateClinicAccess } from '../utils'

class VisitService {
	// ==================== QUERY METHODS ====================

	async getVisitById(id: string, clinicId: string) {
		const visit = await visitQueries.findById(id)

		if (!visit) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Visit not found',
			})
		}

		// Verify clinic access
		if (visit.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this visit',
			})
		}

		return visit
	}

	async getVisitsByPatient(
		patientId: string,
		clinicId: string,
		options?: { limit?: number; offset?: number }
	) {
		await this.verifyPatientAccess(patientId, clinicId)

		return visitQueries.findByPatient(patientId, options)
	}

	async getVisitsByClinic(
		clinicId: string,
		options?: {
			limit?: number
			offset?: number
			startDate?: Date
			endDate?: Date
			status?: AppointmentStatus
			doctorId?: string
		}
	) {
		return visitQueries.findByClinic(clinicId, options)
	}

	async getRecentVisits(clinicId: string, limit = 5) {
		return visitQueries.findRecent(clinicId, limit)
	}

	async getTodayVisits(clinicId: string) {
		return visitQueries.findToday(clinicId)
	}

	async getUpcomingVisits(
		clinicId: string,
		options?: { limit?: number; doctorId?: string }
	) {
		return visitQueries.findUpcoming(clinicId, options)
	}

	async getTodayVisitCount(clinicId: string) {
		return visitQueries.countToday(clinicId)
	}

	async getMonthVisitCount(clinicId: string) {
		return visitQueries.countThisMonth(clinicId)
	}

	async getVisitCountByStatus(clinicId: string, status: AppointmentStatus) {
		return visitQueries.countByStatus(clinicId, status)
	}

	// ==================== MUTATION METHODS ====================

	async createVisit(input: VisitCreateInput, userId: string) {
		// 1. Validate patient exists and belongs to clinic
		const patient = await visitQueries.checkPatientExists(
			input.patientId,
			input.clinicId ?? ''
		)

		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found or does not belong to this clinic',
			})
		}

		// 2. Validate clinic access
		await validateClinicAccess(patient.clinicId, userId)

		// 3. Validate doctor exists and belongs to clinic
		const doctor = await visitQueries.checkDoctorExists(
			input.doctorId,
			patient.clinicId
		)

		if (!doctor) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Doctor not found or does not belong to this clinic',
			})
		}

		// 4. Business rule: Check for overlapping appointments
		const overlapping = await visitQueries.checkOverlap(
			input.doctorId,
			input.appointmentDate
		)

		if (overlapping) {
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'Doctor already has an appointment scheduled at this time',
			})
		}

		// 5. Business rule: Validate working hours
		if (input.time) {
			await this.validateWorkingHours(doctor, input.time)
		}

		// 6. Create visit
		const visit = await visitQueries.create({
			appointmentDate: input.appointmentDate,
			clinic: {
				connect: {
					id: patient.clinicId,
				},
			},
			doctor: {
				connect: { id: input.doctorId },
			},
			note: input.note,
			patient: {
				connect: { id: input.patientId },
			},
			reason: input.reason,
			service: {
				connect: { id: input.serviceId },
			},
			status: input.status || 'SCHEDULED',
			time: input.time,
			type: input.type,
		})

		// 7. Cache invalidation
		cacheHelpers.visit.invalidate(visit.id, input.patientId, patient.clinicId)
		cacheHelpers.visit.invalidateDashboard(patient.clinicId)
		cacheHelpers.visit.invalidateDoctorSchedule(
			input.doctorId,
			patient.clinicId
		)

		return visit
	}

	async updateVisit(id: string, input: VisitUpdateInput, userId: string) {
		// 1. Get existing visit
		const existing = await visitQueries.findById(id)

		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Visit not found',
			})
		}

		// 2. Verify clinic access
		await validateClinicAccess(existing.clinicId, userId)

		// 3. If changing doctor or date, check for overlaps
		if (input.doctorId || input.appointmentDate) {
			const overlapping = await visitQueries.checkOverlap(
				input.doctorId || existing.doctorId,
				input.appointmentDate || existing.appointmentDate,
				id
			)

			if (overlapping) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Doctor already has an appointment scheduled at this time',
				})
			}
		}

		// 4. Update visit
		const visit = await visitQueries.update(id, {
			appointmentDate: input.appointmentDate,
			doctor: {
				connect: { id: input.doctorId },
			},
			note: input.note,
			reason: input.reason,
			service: {
				connect: {
					id: input.serviceId.id,
				},
			},
			status: input.status,
			time: input.time,
			type: input.type,
		})

		// 5. Cache invalidation
		cacheHelpers.visit.invalidate(id, existing.patientId, existing.clinicId)

		if (input.status === 'COMPLETED') {
			cacheHelpers.visit.invalidateCompleted(
				existing.patientId,
				existing.clinicId
			)
		}

		return visit
	}

	async updateVisitStatus(
		id: string,
		status: AppointmentStatus,
		userId: string
	) {
		// 1. Get existing visit
		const existing = await visitQueries.findById(id)

		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Visit not found',
			})
		}

		// 2. Verify clinic access
		await validateClinicAccess(existing.clinicId, userId)

		// 3. Update status
		const visit = await visitQueries.updateStatus(id, status)

		// 4. Cache invalidation
		cacheHelpers.visit.invalidate(id, existing.patientId, existing.clinicId)
		cacheHelpers.visit.invalidateDashboard(existing.clinicId)

		return visit
	}

	async cancelVisit(id: string, userId: string) {
		return this.updateVisitStatus(id, 'CANCELLED', userId)
	}

	async completeVisit(id: string, userId: string) {
		return this.updateVisitStatus(id, 'COMPLETED', userId)
	}

	// ==================== HELPER METHODS ====================

	private async verifyPatientAccess(patientId: string, clinicId: string) {
		const patient = await visitQueries.checkPatientExists(patientId, clinicId)
		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found or does not belong to this clinic',
			})
		}
		return patient
	}

	private async validateWorkingHours(
		doctor: { workingDays: WorkingDay[] },
		time: string
	) {
		// Parse time string (HH:MM)
		const [hours, minutes] = time.split(':').map(Number)
		const appointmentTime = (hours ?? 0) * 60 + (minutes ?? 0)

		// Check if doctor has defined working hours for the current day
		const dayOfWeek = new Date()
			.toLocaleDateString('en-US', { weekday: 'long' })
			.toLowerCase()
		const workingDay = doctor.workingDays?.find(
			(wd: WorkingDay) => wd.day.toLowerCase() === dayOfWeek
		)

		if (workingDay) {
			const [startH, startM] = workingDay.startTime.split(':').map(Number)
			const [endH, endM] = workingDay.closeTime.split(':').map(Number)
			const startTime = (startH ?? 0) * 60 + (startM ?? 0)
			const endTime = (endH ?? 0) * 60 + (endM ?? 0)

			if (appointmentTime < startTime || appointmentTime > endTime) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: `Appointment time must be between ${workingDay.startTime} and ${workingDay.closeTime}`,
				})
			}
		}

		if (!workingDay) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Doctor is not available on this day',
			})
		}
	}
}

export const visitService = new VisitService()
