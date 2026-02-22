'use server'

import { revalidatePath } from 'next/cache'

import { cacheHelpers } from '@/cache/helpers'

import {
	AppointmentCreateSchema,
	AppointmentUpdateSchema,
	AppointmentUpdateStatusSchema,
	DeleteAppointmentSchema,
} from '../schemas'
import {
	createAppointment,
	deleteAppointment,
	updateAppointment,
	updateAppointmentStatus,
} from '../server/services/appointment.service'
import { getSession } from '../server/utils'

/**
 * 🟠 ACTION LAYER
 * - Auth only
 * - Validation only
 * - Delegates to service
 * - UI revalidation only
 * - NO business logic
 * - NO database calls
 */

// ==================== CREATE ACTIONS ====================

export async function createAppointmentAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user?.clinic?.id) {
		throw new Error('Unauthorized: No clinic access')
	}

	// 2. Validation
	const validated = AppointmentCreateSchema.parse(input)

	// 3. Add clinic ID and user ID from session
	const inputWithContext = {
		...validated,
		clinicId: session.user.clinic.id,
		createdById: session.user.id,
	}

	// 4. Delegate to service (service handles cache invalidation)
	const appointment = await createAppointment(inputWithContext)

	// 5. UI revalidation only
	revalidatePath('/dashboard/appointments')
	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	if (validated.doctorId) {
		revalidatePath(`/dashboard/doctors/${validated.doctorId}/schedule`)
	}

	return {
		data: appointment,
		success: true,
		message: 'Appointment created successfully',
	}
}

// ==================== UPDATE ACTIONS ====================

export async function updateAppointmentAction(id: string, input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = AppointmentUpdateSchema.parse({ id, ...(input as object) })

	// 3. Delegate to service
	const appointment = await updateAppointment(
		validated.id,
		validated,
		session.user.id
	)

	// 4. UI revalidation
	revalidatePath('/dashboard/appointments')
	revalidatePath(`/dashboard/appointments/${appointment.id}`)
	revalidatePath(`/dashboard/patients/${appointment.patientId}`)
	if (appointment.doctorId) {
		revalidatePath(`/dashboard/doctors/${appointment.doctorId}/schedule`)
	}

	return {
		data: appointment,
		success: true,
		message: 'Appointment updated successfully',
	}
}

// ==================== STATUS UPDATE ACTIONS ====================

export async function updateAppointmentStatusAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = AppointmentUpdateStatusSchema.parse(input)

	// 3. Delegate to service
	const appointment = await updateAppointmentStatus(
		validated.id,
		validated.status,
		session.user.id,
		validated.reason
	)

	// 4. UI revalidation
	revalidatePath('/dashboard/appointments')
	revalidatePath(`/dashboard/appointments/${appointment.id}`)
	revalidatePath(`/dashboard/patients/${appointment.patientId}`)
	revalidatePath('/dashboard')

	return {
		data: appointment,
		success: true,
		message: `Appointment ${validated.status.toLowerCase()} successfully`,
	}
}

// ==================== DELETE ACTIONS ====================
export async function deleteAppointmentAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = DeleteAppointmentSchema.parse(input)

	// 3. Delegate to service
	// Service should return deleted item details so we know which tags to bust
	const appointment = await deleteAppointment(validated.id, session.user.id)

	// 4. Type-safe Cache Invalidation ✅
	// We use the helper to bust the "use cache" layers in the Service
	cacheHelpers.appointment.invalidate(validated.id, {
		clinicId: appointment.clinicId,
		patientId: appointment.patientId,
		doctorId: appointment.doctorId,
		date: appointment.appointmentDate,
	})
	cacheHelpers.appointment.invalidateClinic(appointment.clinicId)

	// Also bust the doctor's specific slots and the admin dashboard
	cacheHelpers.doctor.invalidateSlots(
		appointment.doctorId,
		appointment.clinicId
	)
	cacheHelpers.admin.invalidateDashboard(appointment.clinicId)

	// 5. UI revalidation (Refreshing the Next.js App Router shell)
	revalidatePath('/dashboard/appointments')
	revalidatePath(`/dashboard/appointments/${validated.id}`)
	revalidatePath('/dashboard')

	return {
		success: true,
		message: 'Appointment deleted successfully',
		data: appointment,
	}
}
