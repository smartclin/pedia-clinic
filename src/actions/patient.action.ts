// src/modules/patient/patient.actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import z from 'zod'

import {
	CreatePatientSchema,
	DeletePatientSchema,
	UpdatePatientSchema,
	UpsertPatientSchema,
} from '@/schemas/patient.schema'
import { getSession } from '@/server/utils'

import { CACHE_TAGS } from '../lib/cache/tags'
import {
	createPatient,
	deletePatient,
	getPatientById,
	updatePatient,
} from '../server/services/patient.service'

/**
 * 🟠 ACTION LAYER
 * - ONLY auth and validation
 * - NO business logic
 * - NO database calls
 * - Delegates to service layer
 */

export async function createPatientAction(input: unknown) {
	try {
		// 1. Auth
		const session = await getSession()
		if (!session?.user) {
			return { success: false, message: 'Unauthorized', status: 401 }
		}

		// 2. Validation
		const validated = CreatePatientSchema.parse(input)

		// 3. Delegate to service
		const patient = await createPatient(
			{ ...validated, clinicId: session.user.clinic?.id ?? '' },
			session.user.id
		)

		// 4. Revalidate UI paths
		revalidatePath('/dashboard/patients')
		revalidatePath('/dashboard')

		// 5. Revalidate cache
		revalidateTag(CACHE_TAGS.patient.list(validated.clinicId ?? ''), 'max')
		revalidateTag(CACHE_TAGS.patient.stats(validated.clinicId ?? ''), 'max')

		return {
			success: true,
			data: patient,
			message: 'Patient created successfully',
			status: 201,
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				message: 'Validation failed',
				errors: error.issues,
				status: 400,
			}
		}

		console.error('Create patient error:', error)
		return {
			success: false,
			message: 'Failed to create patient',
			status: 500,
		}
	}
}

export async function updatePatientAction(id: string, input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = UpdatePatientSchema.parse(input)

	// 3. Delegate to service
	const patient = await updatePatient(id, validated, session.user.id)

	// 4. Revalidate UI paths
	revalidatePath(`/dashboard/patients/${id}`)
	revalidatePath('/dashboard/patients')

	return { data: patient, success: true }
}
export async function deletePatientAction(id: string) {
	try {
		// 1. Auth
		const session = await getSession()
		if (!session?.user) {
			throw new Error('Unauthorized')
		}

		// 2. Validation
		const validated = DeletePatientSchema.parse({ id })

		// 2b. Get clinicId for cache invalidation
		const patient = await getPatientById(
			validated.id,
			session.user.clinic?.id ?? ''
		)
		if (!patient) {
			return { success: false, message: 'Patient not found', status: 404 }
		}
		const clinicId = patient.clinicId

		// 3. Delegate to service
		await deletePatient(validated.id, session.user.id)

		// 4. Revalidate UI paths
		revalidatePath('/dashboard/patients')
		revalidatePath('/dashboard')

		// 5. Revalidate caches
		revalidateTag(CACHE_TAGS.patient.byId(validated.id), 'max')
		revalidateTag(CACHE_TAGS.patient.list(clinicId), 'max')
		revalidateTag(CACHE_TAGS.patient.stats(clinicId), 'max')

		return {
			success: true,
			message: 'Patient deleted successfully',
			status: 200,
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				message: 'Validation failed',
				errors: error.issues,
				status: 400,
			}
		}

		console.error('Delete patient error:', error)
		return {
			success: false,
			message: 'Failed to delete patient',
			status: 500,
		}
	}
}

export async function upsertPatientAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = UpsertPatientSchema.parse(input)

	// 3. Delegate to service
	const patient = await createPatient(
		{ ...validated, clinicId: session.user.clinic?.id ?? '' },
		session.user.id
	)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/patients')

	return { data: patient, success: true }
}
