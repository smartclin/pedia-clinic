'use server'

import { revalidatePath } from 'next/cache'

import {
	type CreateGrowthRecordInput,
	DeleteGrowthRecordSchema,
	GrowthRecordCreateSchema,
	GrowthRecordUpdateSchema,
	type UpdateGrowthRecordInput,
} from '@/schemas/growth.schema'
import { growthService } from '@/server/services/growth.service'
import { getSession } from '@/server/utils'

/**
 * 🟠 ACTION LAYER
 * - Auth only
 * - Validation only
 * - Delegates to service
 * - UI revalidation only
 */

// ==================== CREATE ACTIONS ====================

export async function createGrowthRecordAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = GrowthRecordCreateSchema.parse(input)

	// Add clinicId from session if not provided
	const inputWithClinic = {
		...validated,
		clinicId: session.user.clinic?.id,
	}

	const result = await growthService.createGrowthRecord(
		inputWithClinic as CreateGrowthRecordInput,
		session.user.id
	)

	// UI revalidation only
	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath('/dashboard/growth')

	return { data: result, success: true }
}

// ==================== UPDATE ACTIONS ====================

export async function updateGrowthRecordAction(id: string, input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = GrowthRecordUpdateSchema.parse(input)

	const result = await growthService.updateGrowthRecord(
		id,
		validated as UpdateGrowthRecordInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath('/dashboard/growth')

	return { data: result, success: true }
}

// ==================== DELETE ACTIONS ====================

export async function deleteGrowthRecordAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = DeleteGrowthRecordSchema.parse(input)

	await growthService.deleteGrowthRecord(validated.id, session.user.id)

	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath('/dashboard/growth')

	return { success: true, message: 'Growth record deleted successfully' }
}
