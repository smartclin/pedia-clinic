/**
 * 🟠 VISIT MODULE - ACTION LAYER
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

import { revalidatePath } from 'next/cache'

import {
	VisitByIdSchema,
	type VisitCreateInput,
	VisitCreateSchema,
	type VisitUpdateInput,
	VisitUpdateSchema,
} from '@/schemas/visit.schema'
import { visitService } from '@/server/services/visit.service'
import { getSession } from '@/server/utils'
import type { AppointmentStatus } from '@/types'

// ==================== CREATE ACTIONS ====================

export async function createVisitAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VisitCreateSchema.parse(input)

	const result = await visitService.createVisit(
		validated as VisitCreateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath('/dashboard/appointments')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}

// ==================== UPDATE ACTIONS ====================

export async function updateVisitAction(id: string, input: VisitUpdateInput) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VisitUpdateSchema.parse({ ...input })

	const result = await visitService.updateVisit(
		id,
		validated as VisitUpdateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath('/dashboard/appointments')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}

// ==================== STATUS UPDATE ACTIONS ====================

export async function updateVisitStatusAction(
	id: string,
	status: AppointmentStatus
) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VisitByIdSchema.parse({ id })

	const result = await visitService.updateVisitStatus(
		validated.id,
		status,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath('/dashboard/appointments')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}

export async function cancelVisitAction(id: string) {
	return updateVisitStatusAction(id, 'CANCELLED')
}

export async function completeVisitAction(id: string) {
	return updateVisitStatusAction(id, 'COMPLETED')
}

export async function rescheduleVisitAction(
	id: string,
	appointmentDate: Date,
	time?: string
) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const result = await visitService.updateVisit(
		id,
		{
			appointmentDate,
			id: '',
			serviceId: { id: '' },
			time: time || '',
		},
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath('/dashboard/appointments')
	revalidatePath('/dashboard')

	return {
		data: result,
		success: true,
	}
}
