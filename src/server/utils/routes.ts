// src/lib/routes.ts
import { z } from 'zod'

// ==================== BASE ROUTE CONFIGURATION ====================

export const APP_ROUTES = {
	ABOUT: '/about',

	// API Routes
	API: {
		AI: '/api/ai',
		AUTH: '/api/auth',
		FILES: '/api/files',
		TRPC: '/api/trpc',
		UPLOAD: '/api/upload',
		UPLOAD_FILE: '/api/upload-file',
	},
	CONTACT: '/contact',

	// Dashboard Routes (Main after login)
	DASHBOARD: {
		ACCOUNT: '/dashboard/account',
		APPOINTMENT_DETAIL: (id: string) =>
			`/dashboard/appointments/${id}` as const,

		// Appointment routes
		APPOINTMENTS: '/dashboard/appointments',
		DOCTOR_DETAIL: (id: string) => `/dashboard/doctors/${id}` as const,

		// Doctor routes
		DOCTORS: '/dashboard/doctors',
		NOTIFICATIONS: '/dashboard/notifications',
		PAGE: '/dashboard/page', // Explicit page reference
		PATIENT_DETAIL: (id: string) => `/dashboard/patients/${id}` as const,
		PATIENT_REGISTRATION: '/dashboard/patients/registration',

		// Patient routes
		PATIENTS: '/dashboard/patients',
		PROFILE: '/dashboard/profile',
		ROOT: '/dashboard',

		// Other dashboard routes
		STAFF: '/dashboard/staff',
	},
	FORGOT_PASSWORD: '/forgot-password',
	HIPAA: '/hipaa',
	// Public routes
	HOME: '/',
	LOGIN: '/login',
	PRIVACY: '/privacy',

	// Protected Routes (Role-based)
	PROTECTED: {
		// Admin routes
		ADMIN: {
			MANAGE_PATIENTS: '/(protected)/admin/manage-patients',
			ROOT: '/(protected)/admin',
			SYSTEM_SETTINGS: '/(protected)/admin/system-settings',
		},

		// Doctor routes
		DOCTOR: {
			ROOT: '/(protected)/doctor',
		},

		// Patient routes
		PATIENT: {
			DETAIL: (id: string) => `/(protected)/patient/${id}` as const,
			REGISTRATION: '/(protected)/patient/registration',
			ROOT: '/(protected)/patient',
		},

		// Record routes (Management)
		RECORD: {
			APPOINTMENT_DETAIL: (id: string) =>
				`/(protected)/record/appointments/${id}` as const,
			APPOINTMENTS: '/(protected)/record/appointments',
			BILLING: '/(protected)/record/billing',
			DOCTOR_DETAIL: (id: string) =>
				`/(protected)/record/doctors/${id}` as const,
			DOCTORS: '/(protected)/record/doctors',
			MEDICAL_RECORDS: '/(protected)/record/medical-records',
			PATIENT_DETAIL: (id: string) =>
				`/(protected)/record/patients/${id}` as const,
			PATIENTS: '/(protected)/record/patients',
			ROOT: '/(protected)/record',
			STAFF: '/(protected)/record/staffs',
			USERS: '/(protected)/record/users',
		},
		ROOT: '/(protected)',
	},

	// Public routes group
	PUBLIC: {
		ABOUT: '/(public)/about',
		CONTACT: '/(public)/contact',
		PRIVACY: '/(public)/privacy',
		ROOT: '/(public)',
		SERVICES: '/(public)/services',
		TERMS: '/(public)/terms',
	},
	REGISTER: '/sign-up',
	SERVICES: '/services',
	TERMS: '/terms',
	TESTIMONIALS: '/testimonials',
} as const

// ==================== AUTH ROUTES ====================

export const AUTH_ROUTES = {
	/** Where to redirect after successful authentication */
	AFTER_LOGIN: APP_ROUTES.DASHBOARD.ROOT, // Redirect to /dashboard after login
	AFTER_LOGOUT: APP_ROUTES.HOME, // Redirect to home after logout
	AFTER_REGISTER: APP_ROUTES.DASHBOARD.ROOT, // Redirect to dashboard after registration
	FORGOT_PASSWORD: APP_ROUTES.FORGOT_PASSWORD,
	LOGIN: APP_ROUTES.LOGIN,
	SIGNUP: APP_ROUTES.REGISTER,
} as const

// ==================== ROUTE TYPES ====================

export type UserRole = 'admin' | 'doctor' | 'staff' | 'patient'

// ==================== PUBLIC ROUTES ====================

export const PUBLIC_ROUTES = [
	APP_ROUTES.HOME,
	APP_ROUTES.LOGIN,
	APP_ROUTES.REGISTER,
	APP_ROUTES.FORGOT_PASSWORD,
	APP_ROUTES.ABOUT,
	APP_ROUTES.CONTACT,
	APP_ROUTES.SERVICES,
	APP_ROUTES.TESTIMONIALS,
	APP_ROUTES.HIPAA,
	APP_ROUTES.PRIVACY,
	APP_ROUTES.TERMS,
	'/(public)/.*', // All public group routes
	'/api/.*', // All API routes
] as const

// ==================== AUTH ROUTES (No auth required) ====================

export const NO_AUTH_ROUTES = [
	APP_ROUTES.HOME,
	APP_ROUTES.LOGIN,
	APP_ROUTES.REGISTER,
	APP_ROUTES.FORGOT_PASSWORD,
	'/(public)/.*',
] as const

// ==================== ROUTE ACCESS CONTROL ====================

export const routeAccess = {
	// Admin routes
	'/(protected)/admin/.*': ['admin'] as const,

	// Doctor routes
	'/(protected)/doctor/.*': ['doctor', 'admin'] as const,

	// Patient routes
	'/(protected)/patient/.*': ['patient', 'admin', 'doctor', 'staff'] as const,
	'/(protected)/record/appointments': ['admin', 'doctor', 'staff'] as const,
	'/(protected)/record/billing': ['admin', 'staff'] as const,
	'/(protected)/record/doctors': ['admin'] as const,
	'/(protected)/record/doctors/.*': ['admin', 'doctor'] as const,
	'/(protected)/record/medical-records': ['admin', 'doctor', 'staff'] as const,
	'/(protected)/record/patients': ['admin', 'doctor', 'staff'] as const,
	'/(protected)/record/staffs': ['admin', 'doctor'] as const,

	// Record routes (Management)
	'/(protected)/record/users': ['admin'] as const,

	// Dashboard routes (general)
	'/dashboard/.*': ['admin', 'doctor', 'staff', 'patient'] as const,
	'/dashboard/account': ['admin', 'doctor', 'staff', 'patient'] as const,
	'/dashboard/admin/.*': ['admin'] as const,
	'/dashboard/doctors/.*': ['doctor', 'admin', 'staff'] as const,
	'/dashboard/patients/.*': ['patient', 'admin', 'doctor', 'staff'] as const,
	'/dashboard/profile': ['admin', 'doctor', 'staff', 'patient'] as const,
	'/dashboard/staff': ['admin', 'doctor'] as const,
} as const satisfies Record<string, readonly UserRole[]>

// ==================== PATH SCHEMA ====================

const PathsSchema = z.object({
	admin: z.object({
		managePatients: z.string(),
		root: z.string(),
		systemSettings: z.string(),
	}),
	auth: z.object({
		forgotPassword: z.string(),
		resetPassword: z.string(),
		signIn: z.string(),
		signUp: z.string(),
		twoFactor: z.string(),
	}),
	dashboard: z.object({
		account: z.string(),
		appointmentDetail: z.string(),
		appointments: z.string(),
		doctorDetail: z.string(),
		doctors: z.string(),
		notifications: z.string(),
		page: z.string(),
		patientDetail: z.string(),
		patientRegistration: z.string(),
		patients: z.string(),
		profile: z.string(),
		root: z.string(),
		staff: z.string(),
	}),
	doctor: z.object({
		root: z.string(),
	}),
	patient: z.object({
		detail: z.string(),
		registration: z.string(),
		root: z.string(),
	}),
	public: z.object({
		about: z.string(),
		contact: z.string(),
		privacy: z.string(),
		services: z.string(),
		terms: z.string(),
	}),
	record: z.object({
		appointmentDetail: z.string(),
		appointments: z.string(),
		billing: z.string(),
		doctorDetail: z.string(),
		doctors: z.string(),
		medicalRecords: z.string(),
		patientDetail: z.string(),
		patients: z.string(),
		staffs: z.string(),
		users: z.string(),
	}),
})

// ==================== TYPED PATH CONFIG ====================

export const pathsConfig = PathsSchema.parse({
	admin: {
		managePatients: APP_ROUTES.PROTECTED.ADMIN.MANAGE_PATIENTS,
		root: APP_ROUTES.PROTECTED.ADMIN.ROOT,
		systemSettings: APP_ROUTES.PROTECTED.ADMIN.SYSTEM_SETTINGS,
	},
	auth: {
		forgotPassword: APP_ROUTES.FORGOT_PASSWORD,
		resetPassword: '/reset-password',
		signIn: APP_ROUTES.LOGIN,
		signUp: APP_ROUTES.REGISTER,
		twoFactor: '/two-factor',
	},
	dashboard: {
		account: APP_ROUTES.DASHBOARD.ACCOUNT,
		appointmentDetail: '/dashboard/appointments/[id]',
		appointments: APP_ROUTES.DASHBOARD.APPOINTMENTS,
		doctorDetail: '/dashboard/doctors/[id]',
		doctors: APP_ROUTES.DASHBOARD.DOCTORS,
		notifications: APP_ROUTES.DASHBOARD.NOTIFICATIONS,
		page: '/dashboard/page',
		patientDetail: '/dashboard/patients/[patientId]',
		patientRegistration: APP_ROUTES.DASHBOARD.PATIENT_REGISTRATION,
		patients: APP_ROUTES.DASHBOARD.PATIENTS,
		profile: APP_ROUTES.DASHBOARD.PROFILE,
		root: APP_ROUTES.DASHBOARD.ROOT,
		staff: APP_ROUTES.DASHBOARD.STAFF,
	},
	doctor: {
		root: APP_ROUTES.PROTECTED.DOCTOR.ROOT,
	},
	patient: {
		detail: '/(protected)/patient/[patientId]',
		registration: APP_ROUTES.PROTECTED.PATIENT.REGISTRATION,
		root: APP_ROUTES.PROTECTED.PATIENT.ROOT,
	},
	public: {
		about: APP_ROUTES.PUBLIC.ABOUT,
		contact: APP_ROUTES.PUBLIC.CONTACT,
		privacy: APP_ROUTES.PUBLIC.PRIVACY,
		services: APP_ROUTES.PUBLIC.SERVICES,
		terms: APP_ROUTES.PUBLIC.TERMS,
	},
	record: {
		appointmentDetail: '/(protected)/record/appointments/[id]',
		appointments: APP_ROUTES.PROTECTED.RECORD.APPOINTMENTS,
		billing: APP_ROUTES.PROTECTED.RECORD.BILLING,
		doctorDetail: '/(protected)/record/doctors/[id]',
		doctors: APP_ROUTES.PROTECTED.RECORD.DOCTORS,
		medicalRecords: APP_ROUTES.PROTECTED.RECORD.MEDICAL_RECORDS,
		patientDetail: '/(protected)/record/patients/[id]',
		patients: APP_ROUTES.PROTECTED.RECORD.PATIENTS,
		staffs: APP_ROUTES.PROTECTED.RECORD.STAFF,
		users: APP_ROUTES.PROTECTED.RECORD.USERS,
	},
})

// ==================== UTILITY FUNCTIONS ====================

export const searchParamsKey = {
	redirectUrl: 'redirect_url',
} as const

// Type guard for user roles
export function isValidUserRole(role: unknown): role is UserRole {
	return ['admin', 'doctor', 'staff', 'patient'].includes(role as string)
}

// Helper to check if a route is public
export function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some(route => {
		if (route.includes('.*')) {
			const pattern = route.replace('.*', '')
			return pathname.startsWith(pattern)
		}
		return pathname === route
	})
}

// Helper to check if a route requires no auth
export function isNoAuthRoute(pathname: string): boolean {
	return NO_AUTH_ROUTES.some(route => {
		if (route.includes('.*')) {
			const pattern = route.replace('.*', '')
			return pathname.startsWith(pattern)
		}
		return pathname === route
	})
}

// Helper to check if user has access to route
export function hasRouteAccess(
	pathname: string,
	userRole: UserRole | null
): boolean {
	if (!userRole) return isPublicRoute(pathname)

	for (const [pattern, allowedRoles] of Object.entries(routeAccess)) {
		const regex = new RegExp(`^${pattern.replace('.*', '.*')}$`)
		if (regex.test(pathname)) {
			return (allowedRoles as readonly UserRole[]).includes(userRole)
		}
	}

	// Default: allow if no specific pattern matches
	return true
}

// ==================== EXPORT DEFAULT ====================

export default pathsConfig
