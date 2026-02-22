'use server'

import { revalidatePath } from 'next/cache' // ✅ For UI revalidation

import {
	DeleteInputSchema,
	ServicesSchema,
	StaffAuthSchema,
} from '@/schemas/admin.schema'
import { CreateDoctorSchema } from '@/schemas/doctor.schema'
import { toNumber } from '@/utils/decimal'

import { cacheHelpers } from '../lib/cache/helpers'
import {
	createDoctor,
	createService,
	createStaff,
	deleteData,
	deleteService,
	updateService,
} from '../server/services/admin.service'
import { getSession } from '../server/utils'

/**
 * 🟠 ADMIN SERVER ACTIONS
 * - Auth only
 * - Validation only
 * - NO business logic
 * - NO database calls
 * - NO direct revalidateTag - use cacheHelpers
 */

export async function createStaffAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	// 2. Validation
	const validated = StaffAuthSchema.parse(input)

	// 3. Delegate to service (pass userId, not full session)
	const staff = await createStaff(validated, session.user.id)

	// 4. Type-safe cache invalidation ✅
	cacheHelpers.staff.invalidateClinic(validated.clinicId)
	cacheHelpers.admin.invalidateDashboard(validated.clinicId)

	// 5. Optional: Revalidate UI paths
	revalidatePath('/dashboard/admin/staff')
	revalidatePath('/dashboard/admin')

	return { data: staff, success: true }
}

export async function createDoctorAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	const validated = CreateDoctorSchema.parse(input)

	if (!validated.clinicId) {
		throw new Error('clinicId is required')
	}

	// Ensure clinicId is present and of type string
	if (typeof validated.clinicId !== 'string') {
		throw new Error('clinicId must be a string')
	}

	const doctor = await createDoctor(
		{
			...validated,
			appointmentPrice: toNumber(validated.appointmentPrice),
			clinicId: validated.clinicId,
			workSchedule: [],
		},
		session.user.id
	)

	// ✅ Type-safe cache invalidation
	cacheHelpers.doctor.invalidateClinic(validated.clinicId)
	cacheHelpers.admin.invalidateDashboard(validated.clinicId)

	revalidatePath('/dashboard/admin/doctors')
	revalidatePath('/dashboard/admin')

	return { data: doctor, success: true }
}

export async function createServiceAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	const validated = ServicesSchema.parse(input)

	const service = await createService(validated, session.user.id)

	// ✅ Type-safe cache invalidation
	cacheHelpers.service.invalidateClinic(validated.clinicId ?? '')
	cacheHelpers.admin.invalidateDashboard(validated.clinicId ?? '')

	revalidatePath('/dashboard/admin/services')
	revalidatePath('/dashboard/admin')

	return { data: service, success: true }
}

export async function updateServiceAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	const validated = ServicesSchema.parse(input)
	if (!validated.id) throw new Error('Service ID required for update')

	const service = await updateService(validated, session.user.id)

	// ✅ Type-safe cache invalidation
	cacheHelpers.service.invalidate(validated.id, validated.clinicId ?? '')
	cacheHelpers.admin.invalidateDashboard(validated.clinicId ?? '')

	revalidatePath('/dashboard/admin/services')
	revalidatePath(`/dashboard/admin/services/${validated.id}`)

	return { data: service, success: true }
}

export async function deleteServiceAction(id: string, clinicId: string) {
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	await deleteService(id, clinicId, session.user.id)

	// ✅ Type-safe cache invalidation
	cacheHelpers.service.invalidate(id, clinicId)
	cacheHelpers.admin.invalidateDashboard(clinicId)

	revalidatePath('/dashboard/admin/services')
	revalidatePath('/dashboard/admin')
}

export async function deleteDataAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) throw new Error('Unauthorized')

	const validated = DeleteInputSchema.parse(input)

	await deleteData(validated, session.user.id)

	// ✅ Type-safe cache invalidation based on type
	switch (validated.deleteType) {
		case 'doctor':
			cacheHelpers.doctor.invalidate(validated.id, validated.clinicId)
			break
		case 'staff':
			cacheHelpers.staff.invalidate(validated.id, validated.clinicId)
			break
		case 'service':
			cacheHelpers.service.invalidate(validated.id, validated.clinicId)
			break
		case 'patient':
			cacheHelpers.patient.invalidate(validated.id, validated.clinicId)
			break
		case 'payment':
			cacheHelpers.financial.payment.invalidate(
				validated.id,
				'',
				validated.clinicId
			)
			break
		default:
			throw new Error('Invalid delete type')
	}

	cacheHelpers.admin.invalidateDashboard(validated.clinicId)

	revalidatePath('/dashboard/admin')

	return { success: true }
}
