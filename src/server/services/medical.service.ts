// modules/medical/medical.service.ts
'use cache' // File-level caching for all exported functions

import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import type {
	DiagnosisCreateInput,
	DiagnosisUpdateInput,
	LabTestCreateInput,
	LabTestUpdateInput,
	VitalSignsCreateInput,
	VitalSignsUpdateInput,
} from '@/schemas'
import { medicalQueries } from '@/server/db/queries/medical.query'
import type { LabStatus } from '@/types'

import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import { validateClinicAccess } from '../utils'

// ==================== DIAGNOSIS METHODS (CACHED) ====================

export async function getDiagnosisById(id: string, clinicId: string) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.diagnosis.byId(id), `diagnosis:${id}`)
	cacheLife(CACHE_PROFILES.medicalShort)

	const diagnosis = await medicalQueries.findDiagnosisById(id)

	if (!diagnosis) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Diagnosis not found',
		})
	}

	// Verify clinic access
	if (diagnosis.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Access denied to diagnosis',
		})
	}

	return diagnosis
}

export async function getDiagnosesByPatient(
	patientId: string,
	clinicId: string,
	options?: {
		startDate?: Date
		endDate?: Date
		type?: string
		limit?: number
	}
) {
	'use cache'
	const limit = options?.limit || 50
	cacheTag(
		CACHE_TAGS.patient.diagnoses(patientId),
		`diagnoses:patient:${patientId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findDiagnosesByPatient(patientId, options)
}

export async function getDiagnosesByMedicalRecord(
	medicalId: string,
	clinicId: string
) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.diagnosis.byMedicalRecord(medicalId))
	cacheLife(CACHE_PROFILES.medicalShort)

	// Verify medical record exists and belongs to clinic
	const medicalRecord = await medicalQueries.findMedicalRecordById(medicalId)
	if (!medicalRecord || medicalRecord.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Medical record not found or access denied',
		})
	}

	return medicalQueries.findDiagnosesByMedicalRecord(medicalId)
}

export async function getDiagnosesByAppointment(
	appointmentId: string,
	clinicId: string
) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.diagnosis.byAppointment(appointmentId))
	cacheLife(CACHE_PROFILES.medicalShort)

	// Verify appointment exists and belongs to clinic
	const appointment = await medicalQueries.checkAppointmentExists(
		appointmentId,
		clinicId
	)
	if (!appointment) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Appointment not found or access denied',
		})
	}

	return medicalQueries.findDiagnosesByAppointment(appointmentId)
}

export async function getDiagnosesByDoctor(
	doctorId: string,
	clinicId: string,
	limit = 20
) {
	'use cache'
	cacheTag(
		CACHE_TAGS.medical.diagnosis.byDoctor(doctorId),
		`diagnoses:doctor:${doctorId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	// Verify doctor belongs to clinic
	const doctor = await verifyDoctorAccess(doctorId, clinicId)
	if (!doctor) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Doctor not found or access denied',
		})
	}
	return medicalQueries.findDiagnosesByDoctor(doctorId, { limit })
}

// ==================== MEDICAL RECORDS METHODS (CACHED) ====================

export async function getMedicalRecordById(id: string, clinicId: string) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.record.byId(id))
	cacheLife(CACHE_PROFILES.medicalShort)

	const record = await medicalQueries.findMedicalRecordById(id)

	if (!record) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Medical record not found',
		})
	}

	if (record.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Access denied to medical record',
		})
	}

	return record
}

export async function getMedicalRecordsByPatient(
	patientId: string,
	clinicId: string,
	options?: { limit?: number; offset?: number }
) {
	'use cache'
	const limit = options?.limit || 50
	cacheTag(
		CACHE_TAGS.patient.records(patientId),
		`medical:patient:${patientId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findMedicalRecordsByPatient(patientId, options)
}

export async function getMedicalRecordsByClinic(
	clinicId: string,
	options?: {
		search?: string
		limit?: number
		offset?: number
		startDate?: Date
		endDate?: Date
	}
) {
	'use cache'
	const searchKey = options?.search ? `:search:${options.search}` : ''
	cacheTag(
		CACHE_TAGS.medical.record.byClinic(clinicId),
		`medical:clinic:${clinicId}${searchKey}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	return medicalQueries.findMedicalRecordsByClinic(clinicId, options)
}

export async function getMedicalRecordsCount(
	clinicId: string,
	search?: string
) {
	'use cache'
	const searchKey = search ? `:search:${search}` : ''
	cacheTag(`medical:count:${clinicId}${searchKey}`)
	cacheLife(CACHE_PROFILES.medicalShort)

	return medicalQueries.countMedicalRecordsByClinic(clinicId, search)
}

// ==================== LAB TESTS METHODS (CACHED) ====================

export async function getLabTestById(id: string, clinicId: string) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.lab.byId(id))
	cacheLife(CACHE_PROFILES.medicalShort)

	const labTest = await medicalQueries.findLabTestById(id)

	if (!labTest) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Lab test not found',
		})
	}

	if (labTest.medicalRecord?.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Access denied to lab test',
		})
	}

	return labTest
}

export async function getLabTestsByMedicalRecord(
	medicalId: string,
	clinicId: string
) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.lab.byMedicalRecord(medicalId))
	cacheLife(CACHE_PROFILES.medicalShort)

	// Verify medical record exists
	const medicalRecord = await medicalQueries.findMedicalRecordById(medicalId)
	if (!medicalRecord || medicalRecord.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Medical record not found or access denied',
		})
	}

	return medicalQueries.findLabTestsByMedicalRecord(medicalId)
}

export async function getLabTestsByPatient(
	patientId: string,
	clinicId: string,
	options?: {
		startDate?: Date
		endDate?: Date
		status?: LabStatus
		limit?: number
	}
) {
	'use cache'
	const limit = options?.limit || 50
	cacheTag(
		CACHE_TAGS.patient.labTests(patientId),
		`lab:patient:${patientId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findLabTestsByPatient(patientId, options)
}

export async function getLabTestsByService(
	clinicId: string,
	serviceId: string,
	options?: {
		startDate?: Date
		endDate?: Date
		status?: LabStatus
		limit?: number
	}
) {
	'use cache'
	const limit = options?.limit || 50
	cacheTag(
		`lab:service:${serviceId}:clinic:${clinicId}`,
		`lab:service:${serviceId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	return medicalQueries.findLabTestsByService(serviceId, clinicId, options)
}

// ==================== PRESCRIPTIONS METHODS (CACHED) ====================

export async function getPrescriptionsByMedicalRecord(
	medicalRecordId: string,
	clinicId: string,
	options?: { limit?: number }
) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.prescription.byMedicalRecord(medicalRecordId))
	cacheLife(CACHE_PROFILES.medicalMedium)

	// Verify medical record exists
	const medicalRecord =
		await medicalQueries.findMedicalRecordById(medicalRecordId)
	if (!medicalRecord || medicalRecord.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Medical record not found or access denied',
		})
	}

	return medicalQueries.findPrescriptionsByMedicalRecord(
		medicalRecordId,
		options
	)
}

export async function getActivePrescriptionsByPatient(
	patientId: string,
	clinicId: string
) {
	'use cache'
	cacheTag(
		CACHE_TAGS.patient.prescriptions(patientId),
		`prescriptions:active:${patientId}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findActivePrescriptionsByPatient(patientId)
}

// ==================== VITAL SIGNS METHODS (CACHED) ====================

export async function getVitalSignsById(id: string, clinicId: string) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.vitalSigns.byId(id))
	cacheLife(CACHE_PROFILES.medicalShort)

	const vitalSigns = await medicalQueries.findVitalSignsById(id)

	if (!vitalSigns) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Vital signs record not found',
		})
	}

	// Verify clinic access
	if (vitalSigns.medical?.patient?.clinicId !== clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Access denied to vital signs record',
		})
	}

	return vitalSigns
}

export async function getVitalSignsByMedicalRecord(
	medicalId: string,
	clinicId: string,
	options?: { limit?: number }
) {
	'use cache'
	cacheTag(CACHE_TAGS.medical.vitalSigns.byMedicalRecord(medicalId))
	cacheLife(CACHE_PROFILES.medicalShort)

	// Verify medical record exists and belongs to clinic
	const medicalRecord = await medicalQueries.checkMedicalRecordExists(
		medicalId,
		clinicId
	)
	if (!medicalRecord) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Medical record not found or access denied',
		})
	}

	return medicalQueries.findVitalSignsByMedicalRecord(medicalId, options)
}

export async function getVitalSignsByPatient(
	patientId: string,
	clinicId: string,
	options?: {
		startDate?: Date
		endDate?: Date
		limit?: number
	}
) {
	'use cache'
	const limit = options?.limit || 50
	cacheTag(
		CACHE_TAGS.patient.vitalSigns(patientId),
		`vitals:patient:${patientId}:limit:${limit}`
	)
	cacheLife(CACHE_PROFILES.medicalMedium)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findVitalSignsByPatient(patientId, options)
}

export async function getLatestVitalSignsByPatient(
	patientId: string,
	clinicId: string
) {
	'use cache'
	cacheTag(CACHE_TAGS.patient.vitalSigns(patientId))
	cacheLife(CACHE_PROFILES.medicalShort)

	await verifyPatientAccess(patientId, clinicId)

	return medicalQueries.findLatestVitalSignsByPatient(patientId)
}

// ==================== MUTATION METHODS (NO CACHE) ====================

export async function createDiagnosis(
	input: DiagnosisCreateInput,
	userId: string
) {
	// Verify clinic access
	await validateClinicAccess(input.clinicId ?? '', userId)

	// Verify patient exists and belongs to clinic
	const patient = await medicalQueries.checkPatientExists(
		input.patientId,
		input.clinicId ?? ''
	)
	if (!patient) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Patient not found or does not belong to clinic',
		})
	}

	// Create or verify medical record
	let medicalId = input.medicalId

	if (!medicalId && input.appointmentId) {
		// Create medical record from appointment
		const medicalRecord = await medicalQueries.createMedicalRecord({
			appointmentId: input.appointmentId,
			clinicId: input.clinicId ?? '',
			doctorId: input.doctorId,
			patientId: input.patientId,
		})
		medicalId = medicalRecord.id
	}

	if (!medicalId) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Medical record ID is required',
		})
	}

	// Create diagnosis
	const diagnosis = await medicalQueries.createDiagnosis({
		appointmentId: input.appointmentId,
		clinicId: input.clinicId ?? '',
		date: input.date || new Date(),
		diagnosis: input.diagnosis,
		doctorId: input.doctorId,
		followUpPlan: input.followUpPlan,
		medicalId,
		notes: input.notes,
		patientId: input.patientId,
		symptoms: input.symptoms,
		treatment: input.treatment,
		type: input.type,
	})

	// Cache invalidation
	cacheHelpers.medical.diagnosis.invalidatePatientDiagnosis(input.patientId)
	if (input.medicalId) {
		cacheHelpers.medical.diagnosis.invalidateByMedicalRecord(input.medicalId)
	}
	if (input.appointmentId) {
		cacheHelpers.medical.diagnosis.invalidateByAppointment(input.appointmentId)
	}
	cacheHelpers.medical.diagnosis.invalidateByDoctor(input.doctorId)
	cacheHelpers.admin.invalidateDashboard(input.clinicId ?? '')

	return diagnosis
}

export async function updateDiagnosis(
	input: DiagnosisUpdateInput,
	userId: string
) {
	// Get existing diagnosis
	const existing = await medicalQueries.findDiagnosisById(input.id)
	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Diagnosis not found',
		})
	}

	// Verify clinic access
	await validateClinicAccess(existing.patient?.clinicId, userId)

	// Update diagnosis
	const diagnosis = await medicalQueries.updateDiagnosis(input.id, {
		diagnosis: input.diagnosis,
		followUpPlan: input.followUpPlan,
		notes: input.notes,
		symptoms: input.symptoms,
		treatment: input.treatment,
		type: input.type,
	})

	// Cache invalidation
	cacheHelpers.medical.diagnosis.invalidate(
		input.id,
		diagnosis.patientId,
		existing.patient?.clinicId
	)

	return diagnosis
}

export async function createMedicalRecord(
	data: {
		clinicId: string
		patientId: string
		doctorId: string
		appointmentId: string
	},
	userId: string
) {
	// Verify clinic access
	await validateClinicAccess(data.clinicId, userId)

	// Verify patient belongs to clinic
	await verifyPatientAccess(data.patientId, data.clinicId)

	// Verify appointment exists
	const appointment = await medicalQueries.checkAppointmentExists(
		data.appointmentId,
		data.clinicId
	)
	if (!appointment) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Appointment not found',
		})
	}

	const medicalRecord = await medicalQueries.createMedicalRecord(data)

	// Cache invalidation
	cacheHelpers.medical.record.invalidatePatientRecords(
		data.patientId,
		data.clinicId
	)
	cacheHelpers.admin.invalidateDashboard(data.clinicId)

	return medicalRecord
}

export async function createLabTest(input: LabTestCreateInput, userId: string) {
	// Get medical record to verify clinic
	const medicalRecord = await medicalQueries.findMedicalRecordById(
		input.recordId
	)
	if (!medicalRecord) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Medical record not found',
		})
	}

	// Verify clinic access
	await validateClinicAccess(medicalRecord.patient?.clinicId ?? '', userId)

	const labTest = await medicalQueries.createLabTest({
		notes: input.notes,
		orderedBy: input.orderedBy || userId,
		performedBy: input.performedBy,
		recordId: input.recordId,
		referenceRange: input.referenceRange,
		reportDate: input.reportDate,
		result: input.result,
		sampleCollectionDate: input.sampleCollectionDate,
		sampleType: input.sampleType,
		serviceId: input.serviceId,
		status: input.status || 'PENDING',
		testDate: input.testDate || new Date(),
		units: input.units,
	})

	// Cache invalidation
	cacheHelpers.patient.invalidateLabTests(
		labTest.medicalRecord?.patientId,
		medicalRecord.patient?.clinicId ?? ''
	)
	cacheHelpers.patient.invalidateMedical(
		input.recordId,
		medicalRecord.patient?.clinicId ?? ''
	)

	return labTest
}

export async function updateLabTest(input: LabTestUpdateInput, userId: string) {
	// Get existing lab test
	const existing = await medicalQueries.findLabTestById(input.id)
	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Lab test not found',
		})
	}

	// Verify clinic access
	await validateClinicAccess(
		existing.medicalRecord?.patient?.clinicId ?? '',
		userId
	)

	const labTest = await medicalQueries.updateLabTest(input.id, {
		notes: input.notes,
		performedBy: input.performedBy || userId,
		referenceRange: input.referenceRange,
		reportDate: input.reportDate || new Date(),
		result: input.result,
		status: input.status,
		units: input.units,
	})

	// Cache invalidation
	cacheHelpers.medical.lab.invalidate(
		input.id,
		labTest.medicalRecord?.patientId,
		existing.medicalRecord?.patient?.clinicId ?? ''
	)

	return labTest
}

export async function createVitalSigns(
	input: VitalSignsCreateInput,
	userId: string
) {
	// Verify medical record exists and belongs to clinic
	const medicalRecord = await medicalQueries.checkMedicalRecordExists(
		input.medicalId ?? '',
		input.clinicId ?? ''
	)
	if (!medicalRecord) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Medical record not found or does not belong to clinic',
		})
	}

	// Verify clinic access
	await validateClinicAccess(medicalRecord.clinicId, userId)

	// Calculate age in days/months if not provided
	let ageDays = input.ageDays
	let ageMonths = input.ageMonths

	if (medicalRecord.patient?.dateOfBirth && !ageDays && !ageMonths) {
		const birthDate = new Date(medicalRecord.patient.dateOfBirth)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - birthDate.getTime())
		ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
		ageMonths = Math.floor(ageDays / 30.44) // Approximate months
	}

	// Create vital signs
	const vitalSigns = await medicalQueries.createVitalSigns({
		ageDays,
		ageMonths,
		bodyTemperature: input.bodyTemperature,
		diastolic: input.diastolic,
		gender: input.gender || medicalRecord.patient?.gender,
		heartRate: input.heartRate,
		medicalId: input.medicalId ?? '',
		notes: input.notes,
		oxygenSaturation: input.oxygenSaturation,
		patientId: input.patientId,
		recordedAt: input.recordedAt || new Date(),
		respiratoryRate: input.respiratoryRate,
		systolic: input.systolic,
	})

	// Cache invalidation
	cacheHelpers.patient.invalidateVitals(input.patientId, medicalRecord.clinicId)
	cacheHelpers.patient.invalidateMedical(
		input.medicalId ?? '',
		medicalRecord.clinicId
	)
	cacheHelpers.admin.invalidateDashboard(medicalRecord.clinicId)

	return vitalSigns
}

export async function updateVitalSigns(
	input: VitalSignsUpdateInput,
	userId: string
) {
	// Get existing vital signs
	const existing = await medicalQueries.findVitalSignsById(input.id)
	if (!existing) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Vital signs record not found',
		})
	}

	// Get clinic ID from medical record
	const clinicId = existing.medical?.patient?.clinicId
	if (!clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Unable to determine clinic access',
		})
	}

	// Verify clinic access
	await validateClinicAccess(clinicId, userId)

	const vitalSigns = await medicalQueries.updateVitalSigns(input.id, {
		bodyTemperature: input.bodyTemperature,
		diastolic: input.diastolic,
		heartRate: input.heartRate,
		notes: input.notes,
		oxygenSaturation: input.oxygenSaturation,
		respiratoryRate: input.respiratoryRate,
		systolic: input.systolic,
	})

	// Cache invalidation
	cacheHelpers.patient.invalidateVitals(existing.patientId, clinicId)
	cacheHelpers.medical.vitalSigns.invalidate(input.id, existing.patientId)

	return vitalSigns
}

// ==================== HELPER METHODS ====================

export async function verifyPatientAccess(patientId: string, clinicId: string) {
	const patient = await medicalQueries.checkPatientExists(patientId, clinicId)
	if (!patient) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Patient not found or does not belong to clinic',
		})
	}
	return patient
}

export async function verifyDoctorAccess(doctorId: string, clinicId: string) {
	// Add doctor verification logic
	return { clinicId, id: doctorId }
}
