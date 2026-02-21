// modules/doctor/doctor.service.ts
'use cache' // File-level caching for all exported functions

import { TRPCError } from '@trpc/server'
import { isBefore, isSameDay, parseISO, set, startOfDay } from 'date-fns'
import { format as formatTz, toZonedTime } from 'date-fns-tz'
import { cacheLife, cacheTag } from 'next/cache'

import type { CreateDoctorInput } from '@/schemas/doctor.schema'
import { processAppointments } from '@/schemas/helpers/appontment'
import { doctorQueries } from '@/server/db/queries'
import { generateTimeSlots, toNumber } from '@/utils'

import type { Prisma } from '../../../generated/prisma/browser'
import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import { ApiError, type Appointment } from '../../types'
import { db } from '../db'

const TIMEZONE = 'Africa/Cairo'

/**
 * 🟡 SERVICE LAYER
 * - Business logic only
 * - Uses 'use cache' for automatic caching
 * - Delegates to query layer
 * - NO direct db calls
 * - Cache invalidation via cacheHelpers in mutations
 */
class DoctorService {
	// ==================== QUERIES (CACHED) ====================

	async getDoctorsByClinic(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.doctor.byClinic(clinicId))
		cacheLife(CACHE_PROFILES.medicalMedium)

		return doctorQueries.findByClinic(clinicId)
	}

	async getDoctorById(id: string, clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.doctor.byId(id), CACHE_TAGS.doctor.byClinic(clinicId))
		cacheLife(CACHE_PROFILES.medicalShort)

		const doctor = await doctorQueries.findByIdWithClinicCheck(id, clinicId)
		if (!doctor) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Doctor not found',
			})
		}
		return doctor
	}

	async getDoctorWithAppointments(id: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.doctor.byId(id),
			CACHE_TAGS.doctor.byClinic(clinicId),
			`appointments:doctor:${id}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const [doctor, totalAppointments] = await Promise.all([
			doctorQueries.findWithAppointments(id, clinicId),
			doctorQueries.countAppointments(id, clinicId),
		])

		if (!doctor) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Doctor not found',
			})
		}

		return { data: doctor, totalAppointments }
	}

	async getTodaySchedule(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.appointment.today(clinicId))
		cacheLife(CACHE_PROFILES.realtime)

		return doctorQueries.findTodaySchedule(clinicId)
	}

	async getAvailableDoctors(clinicId: string, date?: Date) {
		'use cache'
		const dateKey = date?.toISOString() || 'today'
		cacheTag(`doctors:available:${clinicId}:${dateKey}`)
		cacheLife(CACHE_PROFILES.realtime)

		return doctorQueries.findAvailableToday(clinicId, date)
	}

	async getDoctorWorkingDays(doctorId: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.workingDays.byDoctor(doctorId),
			CACHE_TAGS.doctor.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalMedium)

		await this.validateDoctorBelongsToClinic(doctorId, clinicId)
		return doctorQueries.getWorkingDays(doctorId)
	}

	async getPaginatedDoctors(params: {
		clinicId: string
		search?: string
		page: number
		limit: number
	}) {
		'use cache'
		const { clinicId, search, page, limit } = params
		const searchKey = search ? `:search:${search}` : ''
		cacheTag(`doctors:paginated:${clinicId}${searchKey}:page:${page}`)
		cacheLife(CACHE_PROFILES.medicalShort)

		const skip = (page - 1) * limit

		const [doctors, totalRecords] = await doctorQueries.findPaginated({
			clinicId,
			search,
			skip,
			take: limit,
		})

		return {
			currentPage: page,
			data: doctors,
			totalPages: Math.ceil(totalRecords / limit),
			totalRecords,
		}
	}

	async getDoctorDashboardStats(doctorId: string, clinicId: string) {
		'use cache'
		cacheTag(
			`doctor:dashboard:${doctorId}`,
			CACHE_TAGS.doctor.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		// Validate doctor belongs to clinic
		const doctor = await doctorQueries.findByIdWithClinicCheck(
			doctorId,
			clinicId
		)
		if (!doctor) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Doctor not found',
			})
		}

		const todayStart = startOfDay(new Date())

		const { appointments, totalPatients, availableDoctors } =
			await doctorQueries.getDashboardCounts(doctorId, clinicId, todayStart)

		const { appointmentCounts, monthlyData } = processAppointments(appointments)
		const recentAppointments = (appointments as Appointment[]).slice(0, 5)

		return {
			appointmentCounts,
			availableDoctors,
			monthlyData,
			recentAppointments,
			totalAppointments: appointments.length,
			totalPatients,
		}
	}

	// ==================== MUTATIONS (NO CACHE) ====================

	async upsertDoctor(
		input: CreateDoctorInput,
		clinicId: string,
		userId: string
	) {
		// 1. Business rules
		if (!input.specialty) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Specialty is required',
			})
		}

		if (
			input.availableFromTime &&
			input.availableToTime &&
			input.availableFromTime >= input.availableToTime
		) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Available from time must be before available to time',
			})
		}

		// 2. Execute via query layer
		const doctor = await doctorQueries.upsert({
			...input,
			appointmentPrice: toNumber(input.appointmentPrice) || 0,
			clinicId,
			userId,
		})

		// 3. Cache invalidation
		cacheHelpers.doctor.invalidateClinic(clinicId)
		if (userId) {
			cacheHelpers.doctor.invalidate(userId, clinicId)
		}
		cacheHelpers.admin.invalidateDashboard(clinicId)

		return doctor
	}

	async deleteDoctor(id: string, clinicId: string) {
		// 1. Check if doctor has upcoming appointments
		const upcomingCount = await doctorQueries.countUpcomingAppointments(
			id,
			clinicId
		)

		let doctor: Prisma.DoctorWhereInput
		if (upcomingCount > 0) {
			// Business rule: Soft delete if has upcoming appointments
			doctor = await doctorQueries.delete(id, clinicId)
		} else {
			// Hard delete if no dependencies
			doctor = await doctorQueries.hardDelete(id, clinicId)
		}

		// 2. Cache invalidation
		cacheHelpers.doctor.invalidate(id, clinicId)
		cacheHelpers.doctor.invalidateClinic(clinicId)
		cacheHelpers.admin.invalidateDashboard(clinicId)

		return {
			action: upcomingCount > 0 ? 'archived' : 'deleted',
			data: doctor,
			message:
				upcomingCount > 0
					? `Doctor archived. ${upcomingCount} upcoming appointments will be reassigned.`
					: 'Doctor permanently deleted.',
			success: true,
		}
	}
	async getAvailableTimeSlots(
		doctorId: string,
		clinicId: string,
		date: string
	) {
		'use cache'
		cacheTag(
			`doctor:slots:${doctorId}:${date}`,
			CACHE_TAGS.doctor.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.realtime)

		const doctor = await db.doctor.findFirst({ where: { id: doctorId } })

		if (!doctor) {
			throw new ApiError(404, 'Doctor not found', 'DOCTOR_NOT_FOUND')
		}

		const selectedDate = parseISO(date)
		const selectedDayOfWeek = selectedDate.getDay() // 0 = Sunday ... 6 = Saturday

		// Ensure availableFromWeekDay and availableToWeekDay are not null before comparison
		if (
			doctor.availableFromWeekDay === null ||
			doctor.availableToWeekDay === null
		) {
			return []
		}
		const doctorIsAvailable = selectedDayOfWeek === doctor.availableToWeekDay // This line is now safe
		if (!doctorIsAvailable) {
			return []
		}

		const appointments = await db.appointment.findMany({ where: { doctorId } })

		// Filter appointments on the selected date
		const appointmentsOnDate = appointments
			.filter((a: { appointmentDate: Date }) =>
				isSameDay(a.appointmentDate, selectedDate)
			)
			.map((a: { appointmentDate: Date }) =>
				formatTz(toZonedTime(a.appointmentDate, TIMEZONE), 'HH:mm:ss', {
					timeZone: TIMEZONE,
				})
			)

		const slots = generateTimeSlots()

		const doctorFrom = set(new Date(), {
			hours: Number(doctor.availableFromTime?.split(':')[0]),
			milliseconds: 0,
			minutes: Number(doctor.availableFromTime?.split(':')[1]),
			seconds: 0,
		})

		const doctorTo = set(new Date(), {
			hours: Number(doctor.availableToTime?.split(':')[0]),
			milliseconds: 0,
			minutes: Number(doctor.availableToTime?.split(':')[1]),
			seconds: 0,
		})

		const validSlots = slots.filter(time => {
			const slot = set(new Date(), {
				hours: Number(time.split(':')[0]),
				milliseconds: 0,
				minutes: Number(time.split(':')[1]),
				seconds: 0,
			})
			return slot >= doctorFrom && slot <= doctorTo
		})

		const today = formatTz(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd', {
			timeZone: TIMEZONE,
		})
		const now = toZonedTime(new Date(), TIMEZONE)

		return validSlots.map(time => {
			let available = !appointmentsOnDate.includes(time)

			if (date === today) {
				const slotTime = set(now, {
					hours: Number(time.split(':')[0]),
					milliseconds: 0,
					minutes: Number(time.split(':')[1]),
					seconds: 0,
				})
				if (isBefore(slotTime, now)) {
					available = false
				}
			}

			return { available, label: time.slice(0, 5), value: time }
		})
	}
	// ==================== VALIDATION HELPERS ====================

	private async validateDoctorBelongsToClinic(
		doctorId: string,
		clinicId: string
	) {
		const doctor = await doctorQueries.findByIdWithClinicCheck(
			doctorId,
			clinicId
		)
		if (!doctor) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Doctor not found or does not belong to this clinic',
			})
		}
		return doctor
	}
}

export const doctorService = new DoctorService()
