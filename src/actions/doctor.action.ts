'use server'

import { revalidatePath } from 'next/cache'

import { CreateDoctorSchema, DeleteDoctorSchema } from '@/schemas/doctor.schema'
import * as doctorService from '@/server/services/doctor.service'
import { getSession } from '@/server/utils'

/**
 * 🟠 ACTION LAYER
 * - Auth only
 * - Validation only
 * - Delegates to service
 * - NO business logic
 * - NO cache directives
 * - UI revalidation only
 */

export async function upsertDoctorAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user?.clinic?.id) {
		throw new Error('Unauthorized: No clinic access')
	}

	// 2. Validation
	const validated = CreateDoctorSchema.parse(input)

	// 3. Delegate to service (service handles cache invalidation)
	const doctor = await doctorService.upsertDoctor(
		validated,
		session.user.clinic.id,
		session.user.id
	)

	// 4. UI revalidation only (data cache already invalidated in service)
	revalidatePath('/dashboard/doctors')
	if (validated.id) {
		revalidatePath(`/dashboard/doctors/${validated.id}`)
	}

	return { data: doctor, success: true }
}

export async function deleteDoctorAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user?.clinic?.id) {
		throw new Error('Unauthorized: No clinic access')
	}

	// 2. Validation
	const validated = DeleteDoctorSchema.parse(input)

	// 3. Delegate to service (service handles cache invalidation)
	const result = await doctorService.deleteDoctor(
		validated.id,
		session.user.clinic.id
	)

	// 4. UI revalidation only
	revalidatePath('/dashboard/doctors')
	revalidatePath('/dashboard/admin')

	return result
}
