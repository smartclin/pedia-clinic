/**
 * ⏱️ Cache Life Profiles
 * Following BEST_PRACTICES.md - Different data has different freshness requirements
 *
 * Next.js 16+ Built-in Cache Profiles:
 * - 'seconds'  - Very short-lived, revalidates in seconds
 * - 'minutes'  - Short-lived, revalidates in minutes
 * - 'hours'    - Medium-lived, revalidates in hours
 * - 'days'     - Long-lived, revalidates in days
 * - 'weeks'    - Very long-lived, revalidates in weeks
 * - 'max'      - Maximum lifetime
 */
export const CACHE_PROFILES = {
	// ==================== STATIC REFERENCE ====================
	max: {
		expire: 7_776_000, // 90 days
		revalidate: 5_184_000, // 60 days
		stale: 2_592_000, // 30 days
	},

	// ==================== MEDICAL LONG-TERM ====================
	medicalLong: {
		expire: 604_800, // 7 days
		revalidate: 86_400, // 24 hours
		stale: 43_200, // 12 hours
	},

	// ==================== MEDICAL MEDIUM-TERM ====================
	medicalMedium: {
		expire: 86_400, // 24 hours
		revalidate: 7200, // 2 hours
		stale: 3600, // 1 hour
	},

	// ==================== MEDICAL SHORT-TERM ====================
	medicalShort: {
		expire: 1800, // 30 minutes
		revalidate: 600, // 10 minutes
		stale: 300, // 5 minutes
	},
	// ==================== REAL-TIME DATA ====================
	realtime: {
		expire: 300, // 5 minutes - hard expiration
		revalidate: 30, // 30 seconds - revalidate in background
		stale: 10, // 10 seconds - serve stale while revalidating
	},

	// ==================== REFERENCE DATA ====================
	reference: {
		expire: 2_592_000, // 30 days
		revalidate: 1_209_600, // 14 days
		stale: 604_800, // 7 days
	},
} as const
export const cacheProfiles = CACHE_PROFILES
export type CacheProfile = keyof typeof CACHE_PROFILES

/**
 * Next.js 16+ Built-in Cache Life Profiles
 * These can be used directly with cacheLife() and revalidateTag()
 */
export type BuiltInCacheProfile =
	| 'seconds'
	| 'minutes'
	| 'hours'
	| 'days'
	| 'weeks'
	| 'max'

/**
 * 📋 Cache Strategy Mapping
 * Maps entity types to appropriate cache profiles
 */
export const CACHE_STRATEGY = {
	'admin.activity': 'medicalShort',
	// Admin & Dashboard
	'admin.dashboard': 'medicalShort',
	'admin.reports': 'medicalMedium',
	'appointment.detail': 'medicalShort',
	'appointment.history': 'medicalShort',

	// Appointments
	'appointment.today': 'realtime',
	'appointment.upcoming': 'realtime',
	'clinic.counts': 'medicalShort',
	'clinic.features': 'medicalMedium',

	// Clinic
	'clinic.settings': 'medicalMedium',
	'doctor.appointments': 'realtime',
	'doctor.list': 'medicalMedium',
	'doctor.performance': 'medicalShort',

	// Doctors
	'doctor.profile': 'medicalMedium',
	'doctor.workingDays': 'medicalMedium',
	'expense.list': 'medicalMedium',

	// Medical
	'medical.diagnosis': 'medicalLong',
	'medical.immunizations': 'medicalLong',
	'medical.lab': 'medicalShort',
	'medical.prescriptions': 'medicalShort',
	'patient.appointments': 'realtime',
	'patient.billing': 'medicalShort',
	'patient.growth': 'medicalLong',
	'patient.list': 'medicalShort',

	// Patients
	'patient.profile': 'medicalShort',
	'patient.records': 'medicalLong',
	'patient.vitals': 'realtime',
	'payment.detail': 'medicalShort',

	// Financial
	'payment.list': 'medicalShort',
	'reference.drugs': 'reference',
	'reference.vaccines': 'max',

	// Reference
	'reference.who': 'max',
	'service.available': 'medicalShort',
	'service.detail': 'medicalMedium',

	// Services
	'service.list': 'medicalMedium',
	'staff.list': 'medicalMedium',

	// Staff
	'staff.profile': 'medicalMedium',

	// System
	'system.settings': 'medicalMedium',
} as const

export type CacheStrategyKey = keyof typeof CACHE_STRATEGY
