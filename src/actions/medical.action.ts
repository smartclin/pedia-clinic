'use server'

import { revalidatePath } from 'next/cache'

import {
	type DiagnosisCreateInput,
	DiagnosisCreateSchema,
	type DiagnosisUpdateInput,
	DiagnosisUpdateSchema,
	type LabTestCreateInput,
	LabTestCreateSchema,
	type LabTestUpdateInput,
	LabTestUpdateSchema,
	MedicalRecordCreateSchema,
	type VitalSignsCreateInput,
	VitalSignsCreateSchema,
	type VitalSignsUpdateInput,
	VitalSignsUpdateSchema,
} from '@/schemas'
import * as medicalService from '@/server/services/medical.service'
import { getSession } from '@/server/utils'

/**
 * 🟠 ACTION LAYER
 * - Auth only
 * - Validation only
 * - Delegates to service
 * - UI revalidation only
 */

// ==================== DIAGNOSIS ACTIONS ====================

export async function createDiagnosisAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = DiagnosisCreateSchema.parse(input)

	// Add clinicId from session
	const inputWithClinic = {
		...validated,
		clinicId: session.user.clinic?.id,
	}

	const result = await medicalService.createDiagnosis(
		inputWithClinic as DiagnosisCreateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath('/dashboard/medical-records')

	return {
		data: result,
		success: true,
		message: 'Diagnosis created successfully',
	}
}

export async function updateDiagnosisAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = DiagnosisUpdateSchema.parse(input)

	const result = await medicalService.updateDiagnosis(
		validated as DiagnosisUpdateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath('/dashboard/medical-records')

	return {
		data: result,
		success: true,
		message: 'Diagnosis updated successfully',
	}
}

// ==================== MEDICAL RECORDS ACTIONS ====================

export async function createMedicalRecordAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = MedicalRecordCreateSchema.parse(input)

	const result = await medicalService.createMedicalRecord(
		validated,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath('/dashboard/medical-records')

	return {
		data: result,
		success: true,
		message: 'Medical record created successfully',
	}
}

// ==================== LAB TESTS ACTIONS ====================

export async function createLabTestAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = LabTestCreateSchema.parse(input)

	const result = await medicalService.createLabTest(
		validated as LabTestCreateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.medicalRecord?.patientId}`)
	revalidatePath('/dashboard/lab-tests')

	return {
		data: result,
		success: true,
		message: 'Lab test created successfully',
	}
}

export async function updateLabTestAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = LabTestUpdateSchema.parse(input)

	const result = await medicalService.updateLabTest(
		validated as LabTestUpdateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.medicalRecord?.patientId}`)
	revalidatePath('/dashboard/lab-tests')

	return {
		data: result,
		success: true,
		message: 'Lab test updated successfully',
	}
}

// ==================== VITAL SIGNS ACTIONS ====================

export async function createVitalSignsAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VitalSignsCreateSchema.parse(input)

	// Add clinicId from session
	const inputWithClinic = {
		...validated,
		clinicId: session.user.clinic?.id,
	}

	const result = await medicalService.createVitalSigns(
		inputWithClinic as VitalSignsCreateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${validated.patientId}`)
	revalidatePath(`/dashboard/medical-records/${validated.medicalId}`)
	revalidatePath('/dashboard/vitals')

	return {
		data: result,
		success: true,
		message: 'Vital signs created successfully',
	}
}

export async function updateVitalSignsAction(input: unknown) {
	const session = await getSession()
	if (!session?.user) {
		throw new Error('Unauthorized')
	}

	const validated = VitalSignsUpdateSchema.parse(input)

	const result = await medicalService.updateVitalSigns(
		validated as VitalSignsUpdateInput,
		session.user.id
	)

	revalidatePath(`/dashboard/patients/${result.patientId}`)
	revalidatePath(`/dashboard/medical-records/${result.medicalId}`)
	revalidatePath('/dashboard/vitals')

	return {
		data: result,
		success: true,
		message: 'Vital signs updated successfully',
	}
}
