/**
 * 🟠 SERVICE MODULE - ACTION LAYER
 *
 * RESPONSIBILITIES:
 * - Server Actions for mutations
 * - Authentication only
 * - Zod validation only
 * - NO business logic
 * - Delegates to service layer
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

import {
	bulkUpdateStatusSchema,
	type CreateServiceInput,
	ServiceCreateSchema,
	serviceDeleteSchema,
	serviceIdSchema,
	updateServiceSchema,
} from '@/schemas/service.schema'
import * as serviceService from '@/server/services/service.service'
import { getSession } from '@/server/utils'

import { CACHE_TAGS } from '../lib/cache/tags'

/**
 * 🟠 ACTION LAYER
 * - ONLY auth and validation
 * - NO business logic
 * - NO database calls
 * - Delegates to service layer
 */

// ==================== CREATE ACTIONS ====================

export async function createServiceAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = ServiceCreateSchema.parse(input)

	// 3. Delegate to service (add clinicId from session if not provided)
	const result = await serviceService.createService(
		{
			...validated,
			clinicId: validated.clinicId || session.user.clinic?.id,
		} as CreateServiceInput,
		session.user.id
	)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/services')

	if (result.clinicId) {
		revalidatePath(`/dashboard/clinics/${result.clinicId}/services`)
		revalidateTag(CACHE_TAGS.service.byClinic(result.clinicId), 'max')
		revalidateTag(CACHE_TAGS.clinic.dashboard(result.clinicId), 'max')
	}

	return {
		data: result,
		success: true,
	}
}

// ==================== UPDATE ACTIONS ====================

export async function updateServiceAction(id: string, input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = updateServiceSchema.parse({ id, input })

	// 3. Delegate to service
	const result = await serviceService.updateService(validated, session.user.id)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/services')
	revalidatePath(`/dashboard/services/${id}`)
	revalidateTag(CACHE_TAGS.service.byId(id), 'max')

	if (result.clinicId) {
		revalidateTag(CACHE_TAGS.service.byClinic(result.clinicId), 'max')
		revalidateTag(CACHE_TAGS.clinic.dashboard(result.clinicId), 'max')
	}

	return {
		data: result,
		success: true,
	}
}

// ==================== DELETE ACTIONS ====================

export async function deleteServiceAction(id: string, reason?: string) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = serviceDeleteSchema.parse({
		id,
		reason: reason || `Deleted by ${session.user.name || session.user.id}`,
	})

	// 3. Delegate to service
	const result = await serviceService.softDeleteService(
		validated.id,
		validated.reason,
		session.user.id
	)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/services')
	revalidateTag(CACHE_TAGS.service.byId(id), 'max')

	if (result.clinicId) {
		revalidateTag(CACHE_TAGS.service.byClinic(result.clinicId), 'max')
		revalidateTag(CACHE_TAGS.clinic.dashboard(result.clinicId), 'max')
	}

	return {
		data: result,
		success: true,
	}
}

export async function restoreServiceAction(id: string) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = serviceIdSchema.parse({ id })

	// 3. Delegate to service
	const result = await serviceService.restoreService(
		validated.id,
		session.user.id
	)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/services')
	revalidatePath('/dashboard/services/deleted')
	revalidateTag(CACHE_TAGS.service.byId(id), 'max')

	if (result.clinicId) {
		revalidateTag(CACHE_TAGS.service.byClinic(result.clinicId), 'max')
		revalidateTag(CACHE_TAGS.clinic.dashboard(result.clinicId), 'max')
	}

	return {
		data: result,
		success: true,
	}
}

export async function permanentlyDeleteServiceAction(id: string) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = serviceIdSchema.parse({ id })

	// 3. Delegate to service
	const result = await serviceService.permanentlyDeleteService(
		validated.id,
		session.user.id
	)

	// 4. Revalidate UI paths
	revalidatePath('/dashboard/services/deleted')
	revalidateTag(CACHE_TAGS.service.byId(id), 'max')

	return {
		data: result,
		success: true,
	}
}

// ==================== BULK ACTIONS ====================

export async function bulkUpdateServiceStatusAction(
	ids: string[],
	status: 'ACTIVE' | 'INACTIVE'
) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = bulkUpdateStatusSchema.parse({ ids, status })

	// 3. Delegate to service
	const result = await serviceService.bulkUpdateServiceStatus(
		validated.ids,
		validated.status,
		session.user.id
	)

	// 4. Revalidate UI paths
	for (const id of ids) {
		revalidateTag(CACHE_TAGS.service.byId(id), 'max')
	}
	revalidatePath('/dashboard/services')

	return {
		data: result,
		success: true,
	}
}
