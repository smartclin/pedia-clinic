// src/modules/patient/patient.service.ts
'use cache' // File-level caching for all exported functions

import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import { processAppointments } from '@/schemas/helpers/appontment'
import type {
	GetAllPatientsInput,
	PatientFormData,
	UpsertPatientInput,
} from '@/schemas/patient.schema'
import { patientQueries } from '@/server/db/queries/patient.query'

import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import { validateClinicAccess } from '../utils'

/**
 * 🟡 SERVICE LAYER
 * - Business logic only
 * - Uses 'use cache' for automatic caching
 * - Delegates to query layer
 * - Handles cache invalidation in mutations
 * - NO direct database access
 */
class PatientService {
	// ==================== QUERIES (CACHED) ====================

	async getPatientById(id: string, clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.patient.byId(id), CACHE_TAGS.patient.byClinic(clinicId))
		cacheLife(CACHE_PROFILES.medicalShort)

		const patient = await patientQueries.findById(id)
		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found',
			})
		}

		// Verify clinic access
		if (patient.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this patient',
			})
		}

		return patient
	}

	async getPatientFullDataById(id: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.patient.fullData(id),
			CACHE_TAGS.patient.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const patient = await patientQueries.findByIdWithFullData(id)
		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found',
			})
		}

		// Verify clinic access
		if (patient.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this patient',
			})
		}

		return {
			...patient,
			lastVisit: patient.appointments[0]?.appointmentDate || null,
			totalAppointments: patient._count?.appointments || 0,
		}
	}

	async getRecentPatients(clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.patient.recent(clinicId),
			CACHE_TAGS.patient.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		return patientQueries.findRecent(clinicId)
	}

	async getPatientDashboardStats(id: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.patient.dashboard(id),
			CACHE_TAGS.patient.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const [patient, appointments, activePrescriptions, totalRecords] =
			await patientQueries.findDashboardStats(id)

		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found',
			})
		}

		// Verify clinic access
		if (patient.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this patient',
			})
		}

		// Business logic: Process appointments for charts
		const { appointmentCounts, monthlyData } = processAppointments(appointments)
		const last5Records = appointments.slice(0, 5)

		return {
			activePrescriptions,
			appointmentCounts,
			data: patient,
			last5Records,
			monthlyData,
			totalAppointments: appointments.length,
			totalRecords,
		}
	}

	async getPatientsByClinic(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.patient.byClinic(clinicId))
		cacheLife(CACHE_PROFILES.medicalMedium)

		return patientQueries.findByClinic(clinicId)
	}

	async getAllPatientsByClinic(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.patient.byClinic(clinicId))
		cacheLife(CACHE_PROFILES.medicalMedium)

		return patientQueries.findAllByClinic(clinicId)
	}

	async getPatientCount(clinicId: string) {
		'use cache'
		cacheTag(CACHE_TAGS.patient.counts(clinicId))
		cacheLife(CACHE_PROFILES.medicalShort)

		return patientQueries.countByClinic(clinicId)
	}

	async getAllPatientsPaginated(
		input: GetAllPatientsInput & { clinicId: string }
	) {
		'use cache'
		const { clinicId, page, limit, search, gender, status, sortBy, sortOrder } =
			input
		const searchKey = search ? `:search:${search}` : ''
		const genderKey = gender ? `:gender:${gender}` : ''
		const statusKey = status ? `:status:${status}` : ''

		cacheTag(
			CACHE_TAGS.patient.byClinic(clinicId),
			`patients:paginated:${clinicId}:page:${page}${searchKey}${genderKey}${statusKey}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const PAGE_NUMBER = Number(page) <= 0 ? 1 : Number(page)
		const LIMIT = Number(limit) || 10
		const SKIP = (PAGE_NUMBER - 1) * LIMIT

		const [patients, totalRecords] = await patientQueries.findPaginated({
			clinicId,
			gender,
			search,
			skip: SKIP,
			sortBy,
			sortOrder: sortOrder as 'asc' | 'desc',
			status,
			take: LIMIT,
		})

		const totalPages = Math.ceil(totalRecords / LIMIT)

		return {
			currentPage: PAGE_NUMBER,
			data: patients,
			limit: LIMIT,
			totalPages,
			totalRecords,
		}
	}

	async getAvailableDoctorsByDay(day: string, clinicId: string) {
		'use cache'
		cacheTag(`doctors:available:${clinicId}:${day}`)
		cacheLife(CACHE_PROFILES.medicalShort)

		return patientQueries.findAvailableDoctorsByDay(day, clinicId)
	}

	// ==================== MUTATIONS (NO CACHE) ====================

	async createPatient(
		data: PatientFormData & { clinicId: string },
		userId: string
	) {
		// 1. Validate clinic access
		await validateClinicAccess(data.clinicId, userId)

		// 2. Business rules
		if (!(data.firstName && data.lastName)) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'First and last name are required',
			})
		}

		if (data.email) {
			const existing = await patientQueries.existsByEmail(
				data.email,
				data.clinicId
			)
			if (existing) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Patient with this email already exists',
				})
			}
		}

		// 3. Create patient
		const patient = await patientQueries._create({
			...data,
			createdAt: new Date(),
			isDeleted: false,
			status: 'ACTIVE',
			updatedAt: new Date(),
			userId,
		})

		// 4. Cache invalidation
		cacheHelpers.patient.invalidateClinic(data.clinicId)
		cacheHelpers.admin.invalidateDashboard(data.clinicId)

		return patient
	}

	async updatePatient(
		id: string,
		data: Partial<PatientFormData>,
		userId: string
	) {
		// 1. Verify patient exists and get clinicId
		const existing = await patientQueries.findById(id)
		if (!existing) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found',
			})
		}

		// 2. Validate clinic access
		await validateClinicAccess(existing.clinicId, userId)

		// 3. Update patient
		const patient = await patientQueries._update(id, {
			...data,
			updatedAt: new Date(),
		})

		// 4. Cache invalidation
		cacheHelpers.patient.invalidate(id, existing.clinicId)
		cacheHelpers.patient.invalidateAppointments(id, existing.clinicId)
		cacheHelpers.admin.invalidateDashboard(existing.clinicId)

		return patient
	}

	async deletePatient(id: string, userId: string) {
		// 1. Verify patient exists
		const patient = await patientQueries.findById(id)
		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found',
			})
		}

		// 2. Validate clinic access
		await validateClinicAccess(patient.clinicId, userId)

		// 3. Business rule: Check for outstanding appointments
		const appointments = patient.appointments || []
		const hasUpcomingAppointments = appointments.some(
			(apt: {
				appointmentDate: string | number | Date
				status: string | null
			}) =>
				new Date(apt.appointmentDate) > new Date() &&
				['SCHEDULED', 'PENDING'].includes(apt.status ?? '')
		)

		if (hasUpcomingAppointments) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Cannot delete patient with upcoming appointments',
			})
		}

		// 4. Soft delete
		await patientQueries._delete(id)

		// 5. Cache invalidation
		cacheHelpers.patient.invalidate(id, patient.clinicId)
		cacheHelpers.patient.invalidateClinic(patient.clinicId)
		cacheHelpers.admin.invalidateDashboard(patient.clinicId)

		return { success: true }
	}

	async upsertPatient(
		input: UpsertPatientInput & { clinicId: string },
		userId: string
	) {
		if (input.id) {
			return this.updatePatient(input.id, input, userId)
		}
		return this.createPatient(input, userId)
	}

	// Legacy method - kept for backward compatibility
	async createNewPatient(
		data: PatientFormData & { clinicId: string; userId: string }
	) {
		return this.createPatient(data, data.userId)
	}
}

export const patientService = new PatientService()
