'use cache' // File-level caching for all exported functions

import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import type {
	AppointmentDateRangeInput,
	CreateAppointmentInput,
	ListAppointmentsInput,
	UpcomingAppointmentsInput,
	UpdateAppointmentInput,
} from '@/schemas/appointment.schema'
import { prisma } from '@/server/db'
import type { AppointmentStatus, Decimal } from '@/types'

import type { Prisma } from '../../../generated/prisma/browser'
import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import { validateClinicAccess } from '../utils'

/**
 * 🟡 SERVICE LAYER
 * - Business logic only
 * - Uses 'use cache' for automatic caching
 * - Delegates to query layer
 * - Cache invalidation via cacheHelpers in mutations
 * - NO direct db calls (except when needed for complex transactions)
 */

class AppointmentService {
	// ==================== QUERIES (CACHED) ====================

	async getAppointmentById(id: string, clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.appointment.details(id), `appointment:${id}`)
		cacheLife(CACHE_PROFILES.medicalShort)

		const appointment = await prisma.appointment.findUnique({
			where: {
				id,
				clinicId,
				isDeleted: false,
			},
			include: {
				patient: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						dateOfBirth: true,
						gender: true,
						phone: true,
						image: true,
					},
				},
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
						email: true,
						phone: true,
						img: true,
						colorCode: true,
					},
				},
				clinic: {
					select: {
						id: true,
						name: true,
						phone: true,
						email: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
						price: true,
						duration: true,
						category: true,
					},
				},
				bills: {
					where: { isDeleted: false },
					select: {
						id: true,
						status: true,
						amount: true,
						paymentDate: true,
					},
				},
				reminders: true,
				medical: {
					select: {
						id: true,
						diagnosis: true,
						createdAt: true,
					},
				},
			},
		})

		if (!appointment) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Appointment not found',
			})
		}

		return appointment
	}

	async getAppointmentsByClinic(
		clinicId: string,
		input: ListAppointmentsInput
	) {
		'use cache'
		const {
			patientId,
			doctorId,
			status,
			type,
			fromDate,
			toDate,
			limit = 50,
			offset = 0,
			includeCancelled = false,
		} = input

		// Create deterministic cache key
		const filterKey = `${clinicId}:${patientId || 'all'}:${doctorId || 'all'}:${status || 'all'}:${type || 'all'}:${fromDate?.toISOString() || 'none'}:${toDate?.toISOString() || 'none'}:${includeCancelled}:${limit}:${offset}`

		cacheTag(
			CACHE_TAGS.appointment.list(clinicId),
			`appointments:list:${filterKey}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		// Build where clause
		const where: Prisma.AppointmentWhereInput = {
			clinicId,
			isDeleted: false,
		}

		if (patientId) where.patientId = patientId
		if (doctorId) where.doctorId = doctorId
		if (status) where.status = status
		if (type) where.type = type
		if (!includeCancelled) {
			where.status = { not: 'CANCELLED' }
		}
		if (fromDate || toDate) {
			where.appointmentDate = {}
			if (fromDate) where.appointmentDate.gte = fromDate
			if (toDate) where.appointmentDate.lte = toDate
		}

		const [total, appointments] = await prisma.$transaction([
			prisma.appointment.count({ where }),
			prisma.appointment.findMany({
				where,
				include: {
					patient: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							dateOfBirth: true,
							gender: true,
						},
					},
					doctor: {
						select: {
							id: true,
							name: true,
							specialty: true,
						},
					},
					service: {
						select: {
							id: true,
							serviceName: true,
						},
					},
				},
				orderBy: {
					appointmentDate: 'desc',
				},
				skip: offset,
				take: limit,
			}),
		])

		return {
			total,
			appointments,
			hasMore: offset + appointments.length < total,
		}
	}

	async getTodayAppointments(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.appointment.today(clinicId))
		cacheLife(CACHE_PROFILES.realtime)

		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		return prisma.appointment.findMany({
			where: {
				clinicId,
				appointmentDate: {
					gte: today,
					lt: tomorrow,
				},
				isDeleted: false,
				status: { not: 'CANCELLED' },
			},
			include: {
				patient: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						phone: true,
						image: true,
					},
				},
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
						colorCode: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
						duration: true,
					},
				},
			},
			orderBy: {
				appointmentDate: 'asc',
			},
		})
	}

	async getUpcomingAppointments(input: UpcomingAppointmentsInput) {
		'use cache'
		const { clinicId, doctorId, patientId, daysAhead = 7, limit = 10 } = input

		const now = new Date()
		const endDate = new Date()
		endDate.setDate(endDate.getDate() + daysAhead)
		endDate.setHours(23, 59, 59, 999)

		const filterKey = `${clinicId}:${doctorId || 'all'}:${patientId || 'all'}:${daysAhead}:${limit}`

		cacheTag(
			CACHE_TAGS.appointment.list(clinicId),
			`appointments:upcoming:${filterKey}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const appointments = await prisma.appointment.findMany({
			where: {
				clinicId,
				...(doctorId && { doctorId }),
				...(patientId && { patientId }),
				appointmentDate: {
					gte: now,
					lte: endDate,
				},
				status: {
					notIn: ['CANCELLED', 'COMPLETED'],
				},
				isDeleted: false,
			},
			include: {
				patient: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						dateOfBirth: true,
						gender: true,
						phone: true,
						image: true,
					},
				},
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
						colorCode: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
						duration: true,
					},
				},
			},
			orderBy: {
				appointmentDate: 'asc',
			},
			take: limit,
		})

		// Transform to include computed fields
		return appointments.map(apt => ({
			...apt,
			patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
			patientAge: this.calculateAge(apt.patient.dateOfBirth),
			doctorName: apt.doctor.name,
			serviceName: apt.service?.serviceName || null,
		}))
	}

	async getAppointmentsByDateRange(input: AppointmentDateRangeInput) {
		'use cache'
		const { clinicId, fromDate, toDate, groupBy = 'day' } = input

		cacheTag(
			CACHE_TAGS.appointment.analytics(clinicId),
			`appointments:range:${fromDate.toISOString()}:${toDate.toISOString()}`
		)
		cacheLife(CACHE_PROFILES.medicalMedium)

		const appointments = await prisma.appointment.findMany({
			where: {
				clinicId,
				appointmentDate: {
					gte: fromDate,
					lte: toDate,
				},
				isDeleted: false,
			},
			include: {
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
					},
				},
				bills: {
					where: { status: 'PAID' },
					select: {
						amount: true,
					},
				},
			},
			orderBy: {
				appointmentDate: 'asc',
			},
		})

		// Group by the specified interval
		const grouped = this.groupAppointmentsByInterval(appointments, groupBy)

		return {
			fromDate,
			toDate,
			total: appointments.length,
			completed: appointments.filter(a => a.status === 'COMPLETED').length,
			cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
			noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
			revenue: appointments.reduce((sum, apt) => {
				const paid =
					apt.bills?.reduce((s, b) => s + Number(b.amount || 0), 0) || 0
				return sum + paid
			}, 0),
			byDoctor: this.groupByDoctor(appointments),
			grouped,
		}
	}

	async getPatientAppointments(
		patientId: string,
		clinicId: string,
		options?: { limit?: number; includePast?: boolean }
	) {
		'use cache'
		cacheTag(CACHE_TAGS.patient.appointments(patientId))
		cacheLife(CACHE_PROFILES.medicalShort)

		const now = new Date()
		const where: Prisma.AppointmentWhereInput = {
			patientId,
			clinicId,
			isDeleted: false,
		}

		if (!options?.includePast) {
			where.appointmentDate = { gte: now }
			where.status = { notIn: ['CANCELLED', 'COMPLETED'] }
		}

		return prisma.appointment.findMany({
			where,
			include: {
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
						colorCode: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
						duration: true,
					},
				},
			},
			orderBy: {
				appointmentDate: options?.includePast ? 'desc' : 'asc',
			},
			take: options?.limit || 50,
		})
	}

	async getDoctorAppointments(doctorId: string, clinicId: string, date?: Date) {
		'use cache'
		cacheTag(CACHE_TAGS.doctor.appointments(doctorId))
		cacheLife(CACHE_PROFILES.medicalShort)

		const where: Prisma.AppointmentWhereInput = {
			doctorId,
			clinicId,
			isDeleted: false,
			status: { notIn: ['CANCELLED'] },
		}

		if (date) {
			const startOfDay = new Date(date)
			startOfDay.setHours(0, 0, 0, 0)
			const endOfDay = new Date(date)
			endOfDay.setHours(23, 59, 59, 999)

			where.appointmentDate = {
				gte: startOfDay,
				lte: endOfDay,
			}
		}

		return prisma.appointment.findMany({
			where,
			include: {
				patient: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						serviceName: true,
						duration: true,
					},
				},
			},
			orderBy: {
				appointmentDate: 'asc',
			},
		})
	}

	async getAvailableTimes(doctorId: string, clinicId: string, date: Date) {
		'use cache'
		cacheTag(`availability:${doctorId}:${date.toISOString().split('T')[0]}`)
		cacheLife(CACHE_PROFILES.realtime)

		// Get doctor's working hours
		const workingDays = await prisma.workingDays.findMany({
			where: {
				doctorId,
				clinicId,
				day: {
					equals: date.toLocaleDateString('en-US', { weekday: 'long' }),
					mode: 'insensitive',
				},
			},
		})

		if (workingDays.length === 0) {
			return { available: false, slots: [] }
		}

		// Get booked appointments
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)

		const bookedAppointments = await prisma.appointment.findMany({
			where: {
				doctorId,
				clinicId,
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				status: { notIn: ['CANCELLED'] },
				isDeleted: false,
			},
			select: {
				appointmentDate: true,
			},
		})

		// Generate available time slots (simplified - you'd have more complex logic)
		const bookedTimes = bookedAppointments.map(
			apt =>
				apt.appointmentDate.getHours() * 60 + apt.appointmentDate.getMinutes()
		)

		const slots = []
		// Assuming 30-minute slots from 9 AM to 5 PM
		for (let hour = 9; hour < 17; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				const timeInMinutes = hour * 60 + minute
				if (!bookedTimes.includes(timeInMinutes)) {
					slots.push({
						time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
						available: true,
					})
				}
			}
		}

		return { available: slots.length > 0, slots }
	}

	// ==================== MUTATIONS (NO CACHE) ====================

	async createAppointment(
		input: CreateAppointmentInput & { clinicId: string; createdById: string }
	) {
		const { clinicId, createdById, ...appointmentData } = input

		// Business rules
		if (!appointmentData.doctorId) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Doctor ID is required',
			})
		}

		if (!appointmentData.patientId) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Patient ID is required',
			})
		}

		// Check for conflicts (double-booking prevention)
		const conflictingAppointment = await prisma.appointment.findFirst({
			where: {
				doctorId: appointmentData.doctorId,
				appointmentDate: appointmentData.appointmentDate,
				status: {
					notIn: ['CANCELLED', 'COMPLETED'],
				},
				isDeleted: false,
			},
		})

		if (conflictingAppointment) {
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'Doctor already has an appointment at this time',
			})
		}

		// Create appointment in transaction
		const result = await prisma.$transaction(async tx => {
			// Create the appointment
			const appointment = await tx.appointment.create({
				data: {
					...appointmentData,
					clinicId,
					status: 'SCHEDULED',
				},
				include: {
					patient: true,
					doctor: true,
				},
			})

			// Create notification for patient
			await tx.notification.create({
				data: {
					userId: appointment.patient.userId,
					title: 'Appointment Scheduled',
					message: `Your appointment with Dr. ${appointment.doctor.name} on ${appointment.appointmentDate.toLocaleDateString()} at ${appointment.time || 'scheduled time'} has been scheduled.`,
					type: 'APPOINTMENT_REMINDER',
				},
			})

			// Create notification for doctor if they have a user ID
			if (appointment.doctor.userId) {
				await tx.notification.create({
					data: {
						userId: appointment.doctor.userId,
						title: 'New Appointment',
						message: `New appointment with ${appointment.patient.firstName} ${appointment.patient.lastName} on ${appointment.appointmentDate.toLocaleDateString()}`,
						type: 'APPOINTMENT_REMINDER',
					},
				})
			}

			// Log to audit
			await tx.auditLog.create({
				data: {
					userId: createdById,
					clinicId,
					action: 'CREATE',
					level: 'INFO',
					model: 'Appointment',
					resource: appointment.id,
					details: `Created appointment for patient ${appointment.patientId}`,
				},
			})

			return appointment
		})

		// Cache invalidation
		cacheHelpers.appointment.invalidateList(clinicId)
		cacheHelpers.appointment.invalidateByPatient(
			appointmentData.patientId,
			clinicId
		)
		cacheHelpers.appointment.invalidateByDoctor(
			appointmentData.doctorId,
			clinicId
		)
		cacheHelpers.appointment.invalidateToday(clinicId)
		cacheHelpers.admin.invalidateDashboard(clinicId)

		return result
	}

	async updateAppointment(
		id: string,
		input: UpdateAppointmentInput,
		userId: string
	) {
		// Get existing appointment
		const existing = await prisma.appointment.findUnique({
			where: { id, isDeleted: false },
		})

		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Appointment not found',
			})
		}

		await validateClinicAccess(existing.clinicId, userId)

		// Check for conflicts if date/time changed
		if (
			input.appointmentDate &&
			input.appointmentDate !== existing.appointmentDate
		) {
			const conflictingAppointment = await prisma.appointment.findFirst({
				where: {
					doctorId: input.doctorId || existing.doctorId,
					appointmentDate: input.appointmentDate,
					id: { not: id },
					status: {
						notIn: ['CANCELLED', 'COMPLETED'],
					},
					isDeleted: false,
				},
			})

			if (conflictingAppointment) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Doctor already has an appointment at this time',
				})
			}
		}

		const updated = await prisma.appointment.update({
			where: { id },
			data: input,
		})

		// Cache invalidation
		cacheHelpers.appointment.invalidate(id, {
			clinicId: existing.clinicId,
			date: existing.appointmentDate,
			doctorId: existing.doctorId,
			patientId: existing.patientId,
		})
		cacheHelpers.appointment.invalidateList(existing.clinicId)
		cacheHelpers.appointment.invalidateByPatient(
			updated.patientId,
			existing.clinicId
		)
		cacheHelpers.appointment.invalidateByDoctor(
			updated.doctorId || existing.doctorId,
			existing.clinicId
		)
		cacheHelpers.admin.invalidateDashboard(existing.clinicId)

		return updated
	}

	async updateAppointmentStatus(
		id: string,
		status: AppointmentStatus,
		userId: string,
		reason?: string
	) {
		// Get existing appointment
		const existing = await prisma.appointment.findUnique({
			where: { id, isDeleted: false },
			include: {
				patient: true,
				doctor: true,
			},
		})

		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Appointment not found',
			})
		}

		await validateClinicAccess(existing.clinicId, userId)

		// Check permissions (patient, doctor, or staff)
		const hasPermission =
			existing.patient.userId === userId ||
			existing.doctor.userId === userId ||
			userId.includes('admin') // Simplified - implement proper role check

		if (!hasPermission) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'You do not have permission to update this appointment',
			})
		}

		// Update in transaction
		const updated = await prisma.$transaction(async tx => {
			const appointment = await tx.appointment.update({
				where: { id },
				data: {
					status,
					note: reason
						? `${existing.note || ''}\nStatus updated: ${reason}`.trim()
						: existing.note,
				},
				include: {
					patient: true,
					doctor: true,
				},
			})

			// Create notification based on status
			let title = ''
			let message = ''

			switch (status) {
				case 'COMPLETED':
					title = 'Appointment Completed'
					message = `Your appointment with Dr. ${appointment.doctor.name} has been marked as completed.`
					break
				case 'CANCELLED':
					title = 'Appointment Cancelled'
					message = `Your appointment with Dr. ${appointment.doctor.name} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`
					break
				case 'NO_SHOW':
					title = 'Appointment No-Show'
					message = `You missed your appointment with Dr. ${appointment.doctor.name}. Please reschedule.`
					break
				default:
					break
			}

			if (title) {
				await tx.notification.create({
					data: {
						userId: appointment.patient.userId,
						title,
						message,
						type: 'APPOINTMENT_REMINDER',
					},
				})
			}

			// Log to audit
			await tx.auditLog.create({
				data: {
					userId,
					clinicId: appointment.clinicId,
					action: 'UPDATE',
					level: status === 'CANCELLED' ? 'WARNING' : 'INFO',
					model: 'Appointment',
					resource: appointment.id,
					details: `Updated appointment status to ${status}${reason ? `: ${reason}` : ''}`,
				},
			})

			return appointment
		})

		// Cache invalidation
		cacheHelpers.appointment.invalidate(id, {
			clinicId: existing.clinicId,
			date: existing.appointmentDate,
			doctorId: existing.doctorId,
			patientId: existing.patientId,
		})
		cacheHelpers.appointment.invalidateList(existing.clinicId)
		cacheHelpers.appointment.invalidateByPatient(
			existing.patientId,
			existing.clinicId
		)
		cacheHelpers.appointment.invalidateByDoctor(
			existing.doctorId,
			existing.clinicId
		)
		cacheHelpers.appointment.invalidateToday(existing.clinicId)
		cacheHelpers.admin.invalidateDashboard(existing.clinicId)

		return updated
	}

	async deleteAppointment(id: string, userId: string) {
		// Get existing appointment
		const existing = await prisma.appointment.findUnique({
			where: { id, isDeleted: false },
		})

		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Appointment not found',
			})
		}

		await validateClinicAccess(existing.clinicId, userId)

		// Soft delete
		const deleted = await prisma.appointment.update({
			where: { id },
			data: {
				isDeleted: true,
				deletedAt: new Date(),
				status: 'CANCELLED',
			},
		})

		// Cache invalidation
		cacheHelpers.appointment.invalidate(id, {
			clinicId: existing.clinicId,
			date: existing.appointmentDate,
			doctorId: existing.doctorId,
			patientId: existing.patientId,
		})
		cacheHelpers.appointment.invalidateList(existing.clinicId)
		cacheHelpers.appointment.invalidateByPatient(
			existing.patientId,
			existing.clinicId
		)
		cacheHelpers.appointment.invalidateByDoctor(
			existing.doctorId,
			existing.clinicId
		)
		cacheHelpers.appointment.invalidateToday(existing.clinicId)
		cacheHelpers.admin.invalidateDashboard(existing.clinicId)

		return deleted
	}

	// ==================== HELPER METHODS ====================

	private calculateAge(dob: Date): number {
		const today = new Date()
		let age = today.getFullYear() - dob.getFullYear()
		const monthDiff = today.getMonth() - dob.getMonth()
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--
		}
		return age
	}

	private groupAppointmentsByInterval(
		appointments: {
			appointmentDate: Date | string
			status?: AppointmentStatus | null
			doctor?: { id?: string; name?: string }
			bills?: { amount: Decimal | null }[]
		}[],
		groupBy: 'day' | 'week' | 'month'
	) {
		const grouped: Record<
			string,
			{
				period: string
				count: number
				completed: number
				cancelled: number
				revenue: number
			}
		> = {}

		appointments.forEach(apt => {
			let key: string
			const date = new Date(apt.appointmentDate)

			switch (groupBy) {
				case 'day':
					key = date.toISOString().split('T')[0]
					break
				case 'week': {
					const week = this.getWeekNumber(date)
					key = `${date.getFullYear()}-W${week}`
					break
				}
				case 'month':
					key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
					break
			}

			if (!grouped[key]) {
				grouped[key] = {
					period: key,
					count: 0,
					completed: 0,
					cancelled: 0,
					revenue: 0,
				}
			}

			grouped[key].count++
			if (apt.status === 'COMPLETED') grouped[key].completed++
			if (apt.status === 'CANCELLED') grouped[key].cancelled++

			const paid =
				apt.bills?.reduce(
					(sum: number, b: { amount: Decimal | null }) =>
						sum + Number(b.amount || 0),
					0
				) || 0
			grouped[key].revenue += paid
		})

		return Object.values(grouped)
	}

	private getWeekNumber(date: Date): number {
		const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
		const pastDaysOfYear =
			(date.getTime() - firstDayOfYear.getTime()) / 86400000
		return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
	}

	private groupByDoctor(
		appointments: { doctor?: { id?: string; name?: string } }[]
	) {
		const byDoctor: Record<
			string,
			{ doctorId: string; doctorName: string; count: number }
		> = {}

		appointments.forEach(apt => {
			if (!apt.doctor?.id) return

			const doctorId = apt.doctor.id
			if (!byDoctor[doctorId]) {
				byDoctor[doctorId] = {
					doctorId,
					doctorName: apt.doctor.name || 'Unknown Doctor',
					count: 0,
				}
			}
			byDoctor[doctorId].count++
		})

		return Object.values(byDoctor)
	}
}

export const appointmentService = new AppointmentService()
