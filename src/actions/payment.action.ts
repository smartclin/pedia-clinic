'use server'

import { revalidatePath } from 'next/cache'

import { AddNewBillInputSchema, PaymentSchema } from '@/schemas/index'
import { getSession } from '@/server/utils'

import * as paymentService from '../server/services/payment.service'

/**
 * 🟠 ACTION LAYER
 * - Auth only
 * - Validation only
 * - Delegates to service
 * - UI revalidation only
 */

export async function generateBillAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = PaymentSchema.parse(input)

	// 3. Delegate to service
	const result = await paymentService.generateBill(validated, session.user.id)

	// 4. UI revalidation
	revalidatePath('/dashboard/payments')
	revalidatePath(`/dashboard/patients/${result.data.patientId}`)

	return result
}

export async function addNewBillAction(input: unknown) {
	// 1. Auth
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	// 2. Validation
	const validated = AddNewBillInputSchema.parse(input)

	// 3. Delegate to service
	const result = await paymentService.addNewBill(validated, session.user.id)

	// 4. UI revalidation
	revalidatePath('/dashboard/payments')
	revalidatePath(`/dashboard/appointments/${validated.appointmentId}`)

	return result
}
