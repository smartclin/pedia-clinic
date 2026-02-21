/**
 * 🟠 VACCINATION MODULE - ACTION LAYER
 *
 * RESPONSIBILITIES:
 * - Server Actions for mutations
 * - Authentication only
 * - Zod validation only
 * - NO business logic
 * - NO database calls
 * - Delegates to service layer
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

import {
	type DeleteImmunizationInput,
	DeleteImmunizationSchema,
	type ImmunizationCreateInput,
	ImmunizationCreateSchema,
	type ImmunizationUpdateInput,
	ImmunizationUpdateSchema,
	type ScheduleVaccinationInput,
	ScheduleVaccinationSchema,
	VaccinationByIdSchema,
} from '@/schemas/vac.schema'
import { vaccinationService } from '@/server/services/vac.service'
import { getSession } from '@/server/utils'

import type { ImmunizationStatus } from '../types/prisma-types'

// ==================== CREATE ACTIONS ====================

export async function recordImmunizationAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = ImmunizationCreateSchema.parse(input)

	const result = await vaccinationService.recordImmunization(
		validated as ImmunizationCreateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}

export async function scheduleVaccinationAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = ScheduleVaccinationSchema.parse(input)

	const result = await vaccinationService.scheduleVaccination(
		validated as ScheduleVaccinationInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations/upcoming')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}

// ==================== UPDATE ACTIONS ====================

export async function updateImmunizationAction(input: ImmunizationUpdateInput) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = ImmunizationUpdateSchema.parse({ ...input })

	const result = await vaccinationService.updateImmunization(
		validated.id,
		validated as ImmunizationUpdateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations')

	return {
		data: result,
		success: true,
	}
}

export async function updateImmunizationStatusAction(
	id: string,
	status: ImmunizationStatus
) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VaccinationByIdSchema.parse({ id })

	const result = await vaccinationService.updateImmunizationStatus(
		validated.id,
		status,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations')

	return {
		data: result,
		success: true,
	}
}

export async function completeImmunizationAction(id: string) {
	return updateImmunizationStatusAction(id, 'COMPLETED')
}

export async function delayImmunizationAction(id: string, notes?: string) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const result = await vaccinationService.updateImmunization(
		id,
		{
			id: '',
			notes,
			status: 'DELAYED',
		},
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations/overdue')

	return {
		data: result,
		success: true,
	}
}

// ==================== BULK ACTIONS ====================

export async function scheduleDueVaccinationsAction(
	patientId: string,
	clinicId: string
) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const dueVaccinations = await vaccinationService.calculateDueVaccinations(
		patientId,
		clinicId
	)

	const results = await Promise.all(
		dueVaccinations.map(
			(v: {
				doseNumber: number
				dueDate: Date
				patientId: string
				vaccineName: string
			}) =>
				vaccinationService
					.scheduleVaccination(
						{
							clinicId,
							doseNumber: v.doseNumber,
							dueDate: v.dueDate,
							notes: 'Auto-scheduled based on vaccine schedule',
							patientId: v.patientId,
							vaccineName: v.vaccineName,
						},
						session.user.id
					)
					.catch(e => ({ error: e.message, vaccine: v.vaccineName }))
		)
	)

	revalidatePath(`/dashboard/patients/${patientId}/immunizations`)
	revalidatePath('/dashboard/immunizations/upcoming')

	return {
		failed: results.filter(
			(r): r is { error: string; vaccine: string } =>
				typeof r === 'object' && r !== null && 'error' in r
		),
		scheduled: results.filter(
			r => typeof r === 'object' && r !== null && !('error' in r)
		).length,
		success: true,
		total: dueVaccinations.length,
	}
}

// ==================== DELETE ACTIONS ====================

export async function deleteImmunizationAction(input: DeleteImmunizationInput) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}
	const userId = session.user.id

	// 1. Validate Input
	const { id, clinicId, patientId } = DeleteImmunizationSchema.parse(input)

	// 2. Delegate to Service
	const result = await vaccinationService.deleteImmunization(
		userId,
		id,
		clinicId
	)

	// 3. Revalidate
	revalidatePath(`/dashboard/patients/${patientId}`)
	revalidatePath(`/dashboard/clinics/${clinicId}/immunizations`)
	revalidateTag(`vaccination-patient-${patientId}`, 'max')

	return {
		data: result,
		success: true,
	}
}

// ==================== UTILITY ACTIONS ====================

/**
 * Triggered when a nurse/doctor wants to manually refresh the
 * "Due Vaccines" calculation for a specific patient.
 */
export async function refreshPatientVaccineStatusAction(
	patientId: string,
	_clinicId: string
) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// No mutation here, just breaking the cache
	revalidateTag(`vaccination-patient-${patientId}`, 'max')
	revalidatePath(`/dashboard/patients/${patientId}`)

	return { success: true }
}
