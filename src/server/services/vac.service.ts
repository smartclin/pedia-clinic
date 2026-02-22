/**
 * 🟡 VACCINATION MODULE - SERVICE LAYER
 *
 * RESPONSIBILITIES:
 * - Business logic and validation
 * - Vaccine schedule calculation
 * - Due date management
 * - NO 'use cache' directives
 * - NO direct Prisma calls
 * - Calls query layer for data access
 * - Uses cache helpers for invalidation
 */

import { TRPCError } from '@trpc/server'
import { addDays, differenceInDays, differenceInMonths } from 'date-fns'

import type {
	ImmunizationCreateInput,
	ImmunizationUpdateInput,
	ScheduleVaccinationInput,
	VaccineScheduleFilterInput,
} from '@/schemas/vac.schema'
import { vaccinationQueries } from '@/server/db/queries/vac.query'
import type { ImmunizationStatus } from '@/types'

import { cacheHelpers } from '../../lib/cache/helpers'
import { validateClinicAccess } from '../utils'

// ==================== QUERY METHODS ====================

export async function getImmunizationById(id: string, clinicId: string) {
	const immunization = await vaccinationQueries.findById(id)

	if (!immunization) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Immunization record not found',
		})
	}

	if (immunization.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Access denied to this immunization record',
		})
	}

	return immunization
}

export async function getImmunizationsByPatient(
	patientId: string,
	clinicId: string,
	options?: { includeCompleted?: boolean; limit?: number; offset?: number }
) {
	await verifyPatientAccess(patientId, clinicId)

	return vaccinationQueries.findByPatient(patientId, options)
}

export async function getImmunizationsByClinic(
	clinicId: string,
	options?: {
		status?: ImmunizationStatus
		startDate?: Date
		endDate?: Date
		limit?: number
		offset?: number
	}
) {
	return vaccinationQueries.findByClinic(clinicId, options)
}

export async function getUpcomingVaccinations(
	clinicId: string,
	options?: { daysAhead?: number; limit?: number }
) {
	return vaccinationQueries.findUpcoming(clinicId, options)
}

export async function getOverdueVaccinations(
	clinicId: string,
	options?: { daysOverdue?: number; limit?: number }
) {
	return vaccinationQueries.findOverdue(clinicId, options)
}

export async function getUpcomingVaccinationCount(
	clinicId: string,
	daysAhead = 30
) {
	return vaccinationQueries.countUpcoming(clinicId, daysAhead)
}

export async function getOverdueVaccinationCount(
	clinicId: string,
	daysOverdue = 0
) {
	return vaccinationQueries.countOverdue(clinicId, daysOverdue)
}

export async function getVaccinationCountByStatus(
	clinicId: string,
	status: ImmunizationStatus
) {
	return vaccinationQueries.countByStatus(clinicId, status)
}

// ==================== VACCINE SCHEDULE METHODS ====================

export async function getVaccineSchedule(options?: VaccineScheduleFilterInput) {
	return vaccinationQueries.findVaccineSchedule(options)
}

export async function getVaccineScheduleByAge(ageMonths: number) {
	return vaccinationQueries.findVaccineScheduleByAge(ageMonths)
}

export async function calculateDueVaccinations(
	patientId: string,
	clinicId: string
) {
	// 1. Verify patient
	const patient = await verifyPatientAccess(patientId, clinicId)

	// 2. Calculate patient age in months
	const ageMonths = differenceInMonths(new Date(), patient.dateOfBirth)

	// 3. Get vaccine schedule for this age
	const schedule = await vaccinationQueries.findVaccineScheduleByAge(ageMonths)

	// 4. Get already administered vaccines
	const administered = await vaccinationQueries.findByPatient(patientId, {
		includeCompleted: true,
	})

	const administeredSet = new Set(
		administered.map(v => `${v.vaccine}-${v.dose ?? ''}-${v.status}`)
	)

	// 5. Calculate due vaccines
	const dueVaccinations = schedule
		.filter((v: { vaccineName: string }) => {
			// Check if this vaccine/dose hasn't been administered
			const key = `${v.vaccineName}-1-COMPLETED` // TODO: Handle multiple doses
			return !administeredSet.has(key)
		})
		.map(
			(v: {
				ageInDaysMin: number | null
				vaccineName: string
				id: { toString: () => string }
			}) => {
				const dueDate = addDays(patient.dateOfBirth, v.ageInDaysMin || 0)
				const daysOverdue = differenceInDays(new Date(), dueDate)

				return {
					daysOverdue: Math.max(0, daysOverdue),
					doseNumber: 1,
					dueDate,
					isOverdue: daysOverdue > 0,
					patientAgeMonths: ageMonths,
					patientId: patient.id,
					patientName: `${patient.firstName} ${patient.lastName}`,
					scheduleId: v.id.toString(),
					vaccineName: v.vaccineName,
				}
			}
		)
		.filter((v: { daysOverdue: number }) => v.daysOverdue <= 90) // Only show vaccines due within 90 days

	return dueVaccinations
}
export async function getPatientRecord(patientId: string, clinicId: string) {
	// 1. Permission check
	await verifyPatientAccess(patientId, clinicId)

	// 2. Fetch data via query layer
	const [immunizations, patient] = await Promise.all([
		vaccinationQueries.findByPatient(patientId),
		vaccinationQueries.getPatientDob(patientId),
	])

	return {
		immunizations,
		patient,
	}
}

export async function getDueVaccinations(patientId: string, clinicId: string) {
	const patient = await verifyPatientAccess(patientId, clinicId)

	// Fetch rules and history
	const [schedule, completed] = await Promise.all([
		vaccinationQueries.getSchedule(),
		vaccinationQueries.findByPatient(patientId),
	])

	const patientAgeDays = Math.floor(
		(Date.now() - new Date(patient.dateOfBirth).getTime()) /
			(1000 * 60 * 60 * 24)
	)

	// Business Logic: Calculate what is due
	return schedule
		.filter((s: { vaccineName: string; dosesRequired: number }) => {
			const isDone = completed.some(
				(c: { vaccine: string; dose: string | null }) =>
					c.vaccine === s.vaccineName && c.dose === `Dose ${s.dosesRequired}`
			)
			return !isDone
		})
		.map((s: { ageInDaysMin: number | null; ageInDaysMax: number | null }) => {
			const dueDate = new Date(patient.dateOfBirth)
			dueDate.setDate(dueDate.getDate() + (s.ageInDaysMin || 0))

			return {
				...s,
				daysUntilDue: Math.ceil(
					(dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
				),
				dueDate,
				isOverdue: s.ageInDaysMax ? patientAgeDays > s.ageInDaysMax : false,
			}
		})
}

export async function getClinicStats(
	clinicId: string,
	startDate?: Date,
	endDate?: Date
) {
	const immunizations = await vaccinationQueries.findByClinic(clinicId, {
		endDate,
		startDate,
	})
	const totalPatients = await vaccinationQueries.countActivePatients(clinicId)

	return {
		patientReach: totalPatients,
		totalAdministered: immunizations.length,
		// Logic for coverage rate could be added here
	}
}

// ==================== MUTATION METHODS ====================

export async function deleteImmunization(
	id: string,
	clinicId: string,
	userId: string
) {
	// 1. Check access
	await validateClinicAccess(clinicId, userId)

	const existing = await vaccinationQueries.findById(id)
	if (!existing)
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Record not found' })

	// 2. Soft delete
	const deleted = await vaccinationQueries.softDelete(id)

	// 3. Invalidate
	cacheHelpers.vaccination.invalidate(id, existing.patientId, clinicId)

	return deleted
}

// ==================== MUTATION METHODS ====================

export async function recordImmunization(
	input: ImmunizationCreateInput,
	userId: string
) {
	// 1. Validate patient
	const patient = await vaccinationQueries.checkPatientExists(
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

	// 3. Validate staff if provided
	if (input.administeredByStaffId) {
		const staff = await vaccinationQueries.checkStaffExists(
			input.administeredByStaffId,
			patient.clinicId
		)

		if (!staff) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Staff member not found or does not belong to this clinic',
			})
		}
	}

	// 4. Check for duplicate vaccination
	const duplicate = await vaccinationQueries.checkDuplicateVaccination(
		input.patientId,
		input.vaccine,
		input.date
	)

	if (duplicate) {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'This vaccine has already been administered on this date',
		})
	}

	// 5. Create immunization record
	const immunization = await vaccinationQueries.create({
		administeredBy: {
			connect: {
				id: input.administeredByStaffId,
			},
		},
		date: input.date,
		dose: input.dose,
		lotNumber: input.lotNumber,
		notes: input.notes,
		patient: {
			connect: {
				id: input.patientId,
			},
		},
		status: input.status || 'COMPLETED',
		vaccine: input.vaccine,
	})

	// 6. If this is a scheduled vaccination, mark it as completed
	if (input.nextDueDate) {
		// Could create a follow-up scheduled vaccination
	}

	// 7. Cache invalidation
	cacheHelpers.vaccination.invalidate(
		immunization.id,
		input.patientId,
		patient.clinicId
	)

	return immunization
}

export async function scheduleVaccination(
	input: ScheduleVaccinationInput,
	userId: string
) {
	// 1. Validate patient
	const patient = await vaccinationQueries.checkPatientExists(
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

	// 3. Business rule: Due date cannot be in the past
	const daysUntilDue = differenceInDays(input.dueDate, new Date())

	if (daysUntilDue < 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Due date cannot be in the past',
		})
	}

	// 4. Check if vaccine is already scheduled
	const existing = await vaccinationQueries.findByPatient(input.patientId, {
		includeCompleted: false,
	})

	const alreadyScheduled = existing.find(
		v => v.vaccine === input.vaccineName && v.status === 'PENDING'
	)

	if (alreadyScheduled) {
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'This vaccination is already scheduled',
		})
	}

	// 5. Create scheduled vaccination
	const vaccination = await vaccinationQueries.create({
		date: input.dueDate,
		dose: input.doseNumber?.toString(),
		notes: input.notes,
		patient: {
			connect: { id: input.patientId },
		},
		status: 'PENDING',
		vaccine: input.vaccineName,
	})

	// 6. Cache invalidation
	cacheHelpers.vaccination.invalidateUpcoming(patient.clinicId)
	cacheHelpers.vaccination.invalidatePatientSchedule(
		input.patientId,
		patient.clinicId
	)

	return vaccination
}

export async function updateImmunization(
	id: string,
	input: ImmunizationUpdateInput,
	userId: string
) {
	// 1. Get existing record
	const existing = await vaccinationQueries.findById(id)

	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Immunization record not found',
		})
	}

	// 2. Verify clinic access
	await validateClinicAccess(existing.patient?.clinicId, userId)

	// 3. Update record
	const immunization = await vaccinationQueries.update(id, {
		administeredBy: input.administeredByStaffId
			? {
					connect: { id: input.administeredByStaffId },
				}
			: undefined,
		date: input.date,
		dose: input.dose,
		lotNumber: input.lotNumber,
		notes: input.notes,
		status: input.status,
	})

	// 4. Cache invalidation
	cacheHelpers.vaccination.invalidate(
		id,
		existing.patientId,
		existing.patient?.clinicId
	)

	return immunization
}

export async function updateImmunizationStatus(
	id: string,
	status: ImmunizationStatus,
	userId: string
) {
	// 1. Get existing record
	const existing = await vaccinationQueries.findById(id)

	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Immunization record not found',
		})
	}

	// 2. Verify clinic access
	await validateClinicAccess(existing.patient?.clinicId, userId)

	// 3. Update status
	const immunization = await vaccinationQueries.updateStatus(id, status)

	// 4. Cache invalidation
	cacheHelpers.vaccination.invalidate(
		id,
		existing.patientId,
		existing.patient?.clinicId
	)

	return immunization
}

// ==================== HELPER METHODS ====================

export async function verifyPatientAccess(patientId: string, clinicId: string) {
	const patient = await vaccinationQueries.checkPatientExists(
		patientId,
		clinicId
	)
	if (!patient) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Patient not found or does not belong to this clinic',
		})
	}
	return patient
}

export async function getPatientVaccinationSummary(
	patientId: string,
	clinicId: string
) {
	await verifyPatientAccess(patientId, clinicId)

	const [completed, pending, overdue, all] = await Promise.all([
		vaccinationQueries.countByPatient(patientId, 'COMPLETED'),
		vaccinationQueries.countByPatient(patientId, 'PENDING'),
		vaccinationQueries.findOverdue(clinicId, { limit: 100 }),
		vaccinationQueries.findByPatient(patientId, { includeCompleted: true }),
	])

	const overdueCount = overdue.filter(
		(v: { patientId: string }) => v.patientId === patientId
	).length

	return {
		completed,
		completionRate:
			all.length > 0 ? Math.round((completed / all.length) * 100) : 0,
		nextDue: all
			.filter(v => v.status === 'PENDING')
			.sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
			)[0],
		overdue: overdueCount,
		pending,
		total: all.length,
	}
}
