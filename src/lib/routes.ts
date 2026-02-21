type RouteAccessProps = {
	[key: string]: string[]
}

export const routeAccess: RouteAccessProps = {
	'/admin(.*)': ['admin'],
	'/patient(.*)': ['patient', 'admin', 'doctor', 'nurse'],
	'/doctor(.*)': ['doctor'],
	'/staff(.*)': ['nurse', 'lab_technician', 'cashier'],
	'/record/users': ['admin'],
	'/record/doctors': ['admin'],
	'/record/doctors(.*)': ['admin', 'doctor'],
	'/record/staffs': ['admin', 'doctor'],
	'/record/patients': ['admin', 'doctor', 'nurse'],
	'/patient/registrations': ['patient'],
}
export const searchParamsKey = {
	redirectUrl: 'redirect_url',
} as const

export const route = {
	// Public routes
	home: '/',
	signUp: process.env.NEXT_PUBLIC_SIGN_UP_URL,
	signIn: process.env.NEXT_PUBLIC_SIGN_IN_URL,
	auth: {
		LOGIN: '/login',
		CALLBACK: '/api/auth/callback',
	},
	// Protected Routes
	admin: '/admin',
	adminSystemSettings: '/admin/system-settings',

	doctor: '/doctor',
	patient: '/patient',
	patientDashboard: (patientId: string) => `/patient/${patientId}/dashboard`,
	patientProfile: (patientId: string) => `/patient/${patientId}`,
	patientList: '/patient',
	patientRegistration: '/patient/registration',

	// Record Routes
	recordAppointments: '/record/appointments',
	recordAppointmentDetails: (id: string) => `/record/appointments/${id}`,
	recordBilling: '/record/billing',
	recordDoctors: '/record/doctors',
	recordDoctorDetails: (id: string) => `/record/doctors/${id}`,
	recordMedicalRecords: '/record/medical-records',
	recordPatients: '/record/patients',
	recordStaffs: '/record/staffs',
	recordUsers: '/record/users',
} as const

/**
 * Centralized application route paths.
 *
 * This is the single source of truth for all URL paths used across the application.
 * Always import from here instead of hardcoding paths to ensure consistency
 * and enable easy refactoring.
 */

import type { UserRoles as UserRole } from './auth/roles'

// Base route configuration
export const APP_ROUTES = {
	// Public routes
	HOME: '/',
	LOGIN: '/sign-in',
	REGISTER: '/sign-up',
	FORGOT_PASSWORD: '/forgot-password',
	ABOUT: '/about',
	CONTACT: '/contact',
	SERVICES: '/services',
	TESTIMONIALS: '/testimonials',
	HIPAA: '/hipaa',
	PRIVACY: '/privacy',
	TERMS: '/terms',

	// Protected Dashboard Routes
	DASHBOARD: {
		ROOT: '/dashboard',
		PATIENTS: '/dashboard/patients',
		PATIENT_DETAIL: (id: string) => `/dashboard/patients/${id}`,
		PATIENT_OVERVIEW: (id: string) => `/dashboard/patients/${id}`,
		PATIENT_APPOINTMENTS: (id: string) =>
			`/dashboard/patients/${id}/appointments`,
		PATIENT_MEDICAL_RECORDS: (id: string) =>
			`/dashboard/patients/${id}/medical-records`,
		PATIENT_GROWTH: (id: string) => `/dashboard/patients/${id}/growth`,
		PATIENT_IMMUNIZATIONS: (id: string) =>
			`/dashboard/patients/${id}/immunizations`,
		PATIENT_BILLING: (id: string) => `/dashboard/patients/${id}/billing`,
		PATIENT_VITALS: (id: string) => `/dashboard/patients/${id}/vitals`,

		DOCTORS: '/dashboard/doctors',
		DOCTOR_DETAIL: (id: string) => `/dashboard/doctors/${id}`,

		APPOINTMENTS: '/dashboard/appointments',
		APPOINTMENT_DETAIL: (id: string) => `/dashboard/appointments/${id}/view`,
		APPOINTMENT_SCHEDULE: '/dashboard/appointments/schedule',

		MEDICAL_RECORDS: '/dashboard/medical-records',
		BILLING: '/dashboard/billing',

		CLINIC: '/dashboard/clinic',
		CLINIC_SETTINGS: '/dashboard/clinic/settings',

		STAFF: '/dashboard/staff',

		ANALYTICS: {
			ROOT: '/dashboard/analytics',
			OVERVIEW: '/dashboard/analytics/overview',
			FINANCIAL: '/dashboard/analytics/financial',
			GROWTH_CHARTS: '/dashboard/analytics/growth-charts',
			IMMUNIZATION: '/dashboard/analytics/immunization',
		},

		NOTIFICATIONS: '/dashboard/notifications',
		PROFILE: '/dashboard/profile',
		ACCOUNT: '/dashboard/account',
	},

	// Record Routes (Admin/Management)
	RECORD: {
		ROOT: '/record',
		APPOINTMENTS: '/record/appointments',
		APPOINTMENT_DETAIL: (id: string) => `/record/appointments/${id}`,
		BILLING: '/record/billing',
		DOCTORS: '/record/doctors',
		DOCTOR_DETAIL: (id: string) => `/record/doctors/${id}`,
		MEDICAL_RECORDS: '/record/medical-records',
		PATIENTS: '/record/patients',
		PATIENT_DETAIL: (id: string) => `/record/patients/${id}`,
		STAFF: '/record/staff',
		USERS: '/record/users',
	},

	// Admin Routes
	ADMIN: {
		ROOT: '/admin',
		SYSTEM_SETTINGS: '/admin/system-settings',
		USERS: '/admin/users',
	},

	// API Routes
	API: {
		AUTH: '/api/auth',
		TRPC: '/api/trpc',
		UPLOAD: '/api/upload',
		UPLOAD_FILE: '/api/upload-file',
		FILES: '/api/files',
	},
} as const

/**
 * Union type of all valid application route paths.
 */
export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES: string[] = [
	APP_ROUTES.HOME,
	APP_ROUTES.LOGIN,
	APP_ROUTES.REGISTER,
	APP_ROUTES.ABOUT,
	APP_ROUTES.CONTACT,
	APP_ROUTES.SERVICES,
	APP_ROUTES.TESTIMONIALS,
	APP_ROUTES.HIPAA,
	APP_ROUTES.PRIVACY,
	APP_ROUTES.TERMS,
	'/api/auth',
	'/_next',
	'/favicon.ico',
	'/manifest.json',
	'/icon.png',
]

/**
 * Authentication routes (sign-in, sign-up, etc.)
 */
export const AUTH_ROUTES: string[] = [
	APP_ROUTES.LOGIN,
	APP_ROUTES.REGISTER,
	APP_ROUTES.FORGOT_PASSWORD,
]

/**
 * Protected routes that require authentication
 */
export const PROTECTED_ROUTES: string[] = [
	'/dashboard',
	'/record',
	'/admin',
	'/doctor',
	'/staff',
	'/patient',
	'/appointments',
	'/billing',
	'/clinic',
	'/medical-records',
]

/**
 * Role-based redirects (Better-Auth returns lowercase roles)
 */
export const ROLE_REDIRECTS: Record<UserRole, string> = {
	admin: APP_ROUTES.ADMIN.ROOT,
	doctor: APP_ROUTES.DASHBOARD.DOCTORS,
	staff: APP_ROUTES.DASHBOARD.STAFF,
	patient: APP_ROUTES.DASHBOARD.ROOT,
}

export const DEFAULT_REDIRECT = APP_ROUTES.HOME

/**
 * Route access configuration by role
 * Note: Database roles are uppercase (ADMIN, DOCTOR, STAFF, PATIENT)
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
	// Admin routes
	'/admin(.*)': ['admin'],

	// Doctor routes
	'/dashboard/doctors(.*)': ['admin', 'doctor'],
	'/record/doctors(.*)': ['admin', 'doctor'],

	// Staff routes
	'/dashboard/staff(.*)': ['admin', 'doctor', 'staff'],
	'/record/staff(.*)': ['admin'],

	// Patient routes (with role-based access)
	'/dashboard/patients': ['admin', 'doctor', 'staff'],
	'/dashboard/patients/(.*)/medical-records': ['admin', 'doctor'],
	'/dashboard/patients/(.*)/growth': ['admin', 'doctor'],
	'/dashboard/patients/(.*)/immunizations': ['admin', 'doctor', 'staff'],
	'/dashboard/patients/(.*)/billing': ['admin', 'doctor', 'staff'],
	'/dashboard/patients/(.*)': ['admin', 'doctor', 'staff'], // General patient access

	// Appointment routes
	'/dashboard/appointments': ['admin', 'doctor', 'staff', 'patient'],
	'/record/appointments': ['admin', 'doctor', 'staff'],

	// Medical records
	'/dashboard/medical-records': ['admin', 'doctor'],
	'/record/medical-records': ['admin', 'doctor'],

	// Billing
	'/dashboard/billing': ['admin', 'doctor', 'staff'],
	'/record/billing': ['admin', 'doctor'],

	// Clinic management
	'/dashboard/clinic': ['admin'],
	'/dashboard/clinic/settings': ['admin'],

	// Analytics
	'/dashboard/analytics(.*)': ['admin', 'doctor'],

	// User management
	'/record/users': ['admin'],
	'/admin/users': ['admin'],

	// System settings
	'/admin/system-settings': ['admin'],
}

/**
 * Type-safe route matcher function
 */
export const createRouteMatcher = (routes: string[]) => {
	const regex = new RegExp(
		`^(${routes.map(route => route.replace(/\(\.\*\)/, '.*')).join('|')})$`
	)
	return (pathname: string) => regex.test(pathname)
}

/**
 * Check if a user role has access to a specific route
 */
export function checkRouteAccess(pathname: string, role: UserRole): boolean {
	// Find matching route pattern
	for (const [pattern, allowedRoles] of Object.entries(ROUTE_ACCESS)) {
		const regex = new RegExp(pattern.replace(/(.*)/, '(.*)'))
		if (regex.test(pathname)) {
			return allowedRoles.includes(role)
		}
	}

	// Default to allowing access to dashboard root for authenticated users
	if (pathname === APP_ROUTES.DASHBOARD.ROOT) {
		return true
	}

	// Deny access by default
	return false
}

/**
 * Get redirect path for a role
 */
export function getRoleRedirect(role?: UserRole): string {
	if (!role) return APP_ROUTES.LOGIN
	return ROLE_REDIRECTS[role] || DEFAULT_REDIRECT
}

/**
 * Check if a path is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
	return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if a path is a protected route
 */
export function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Search parameter keys
 */
export const SEARCH_PARAMS = {
	REDIRECT_URL: 'redirect_url',
	REFERRAL: 'referral',
	PATIENT_ID: 'patientId',
	APPOINTMENT_ID: 'appointmentId',
	DOCTOR_ID: 'doctorId',
	STATUS: 'status',
	DATE: 'date',
	PAGE: 'page',
	LIMIT: 'limit',
	SORT: 'sort',
	FILTER: 'filter',
} as const
/**
 * Page URL configuration for the clinic management system
 * Centralizes all route definitions to ensure consistency
 */

export const ROUTES = {
	// Auth routes
	LOGIN: '/login',
	LOGOUT: '/logout',
	REGISTER: '/register',
	FORGOT_PASSWORD: '/forgot-password',
	RESET_PASSWORD: '/reset-password',
	VERIFY_EMAIL: '/verify-email',
	TWO_FACTOR: '/2fa',

	// Dashboard
	DASHBOARD: '/dashboard',
	HOME: '/',

	// Patient management
	PATIENTS: '/dashboard/patients',
	PATIENT_DETAILS: '/dashboard/patients/[id]',
	NEW_PATIENT: '/dashboard/patients/new',
	EDIT_PATIENT: '/dashboard/patients/[id]/edit',
	PATIENT_HISTORY: '/dashboard/patients/[id]/history',
	PATIENT_GROWTH: '/dashboard/patients/[id]/growth',
	PATIENT_IMMUNIZATIONS: '/dashboard/patients/[id]/immunizations',
	PATIENT_PRESCRIPTIONS: '/dashboard/patients/[id]/prescriptions',
	PATIENT_LAB_RESULTS: '/dashboard/patients/[id]/lab-results',

	// Visits/Appointments
	VISITS: '/dashboard/visits',
	NEW_VISIT: '/dashboard/visits/new',
	VISIT_DETAILS: '/dashboard/visits/[id]',
	EDIT_VISIT: '/dashboard/visits/[id]/edit',
	APPOINTMENTS: '/dashboard/appointments',
	SCHEDULE: '/dashboard/schedule',

	// Clinical
	VACCINATIONS: '/dashboard/vaccinations',
	VACCINATION_RECORD: '/dashboard/vaccinations/[id]',
	PRESCRIPTIONS: '/dashboard/prescriptions',
	PRESCRIPTION_DETAILS: '/dashboard/prescriptions/[id]',
	LAB_TESTS: '/dashboard/lab-tests',
	LAB_TEST_DETAILS: '/dashboard/lab-tests/[id]',
	GROWTH_CHARTS: '/dashboard/growth',
	MEASUREMENTS: '/dashboard/measurements',

	// Doctors & Staff
	DOCTORS: '/dashboard/doctors',
	DOCTOR_DETAILS: '/dashboard/doctors/[id]',
	STAFF: '/dashboard/staff',
	STAFF_DETAILS: '/dashboard/staff/[id]',

	// Billing
	BILLING: '/dashboard/billing',
	INVOICES: '/dashboard/invoices',
	INVOICE_DETAILS: '/dashboard/invoices/[id]',
	PAYMENTS: '/dashboard/payments',
	INSURANCE: '/dashboard/insurance',
	CLAIMS: '/dashboard/claims',

	// Reports & Analytics
	REPORTS: '/dashboard/reports',
	ANALYTICS: '/dashboard/analytics',

	// Clinic Management
	CLINIC_SETTINGS: '/dashboard/settings/clinic',
	USER_SETTINGS: '/dashboard/settings/user',
	TEAM: '/dashboard/settings/team',
	INTEGRATIONS: '/dashboard/settings/integrations',

	// Portal
	PATIENT_PORTAL: '/portal',
	PORTAL_LOGIN: '/portal/login',
	PORTAL_DASHBOARD: '/portal/dashboard',
	PORTAL_CHILD: '/portal/child/[id]',
	PORTAL_APPOINTMENTS: '/portal/appointments',
	PORTAL_MESSAGES: '/portal/messages',

	// Utilities
	NOTIFICATIONS: '/notifications',
	SEARCH: '/search',
	HELP: '/help',
} as const

export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]

interface RouteParams {
	id?: string
	patientId?: string
	visitId?: string
	doctorId?: string
	staffId?: string
	invoiceId?: string
	prescriptionId?: string
	labTestId?: string
	vaccinationId?: string
	appointmentId?: string
	childId?: string
	clinicId?: string
	userId?: string
	[key: string]: string | undefined
}

/**
 * Creates a page URL with proper parameter substitution
 * @param route - Route key or custom path
 * @param params - URL parameters to substitute
 * @param query - Query string parameters
 * @returns Complete URL string
 */
export function createPageUrl(
	route: RouteKey | string,
	params: RouteParams = {},
	query?: Record<string, string | number | boolean | undefined | null>
): string {
	// Get the base path
	let path = route in ROUTES ? ROUTES[route as RouteKey] : route

	// Replace path parameters (e.g., [id] → actual id)
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			path = path.replace(`[${key}]`, String(value))
		}
	})

	// Remove any remaining optional parameters
	path = path.replace(/\[.*?\]/g, '')

	// Add query string
	if (query && Object.keys(query).length > 0) {
		const searchParams = new URLSearchParams()
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				searchParams.append(key, String(value))
			}
		})
		path += `?${searchParams.toString()}`
	}

	return path
}

/**
 * Creates a patient-specific page URL
 */
export function createPatientUrl(
	route:
		| 'PATIENT_DETAILS'
		| 'EDIT_PATIENT'
		| 'PATIENT_HISTORY'
		| 'PATIENT_GROWTH'
		| 'PATIENT_IMMUNIZATIONS'
		| 'PATIENT_PRESCRIPTIONS'
		| 'PATIENT_LAB_RESULTS',
	patientId: string,
	query?: Record<string, string | number | boolean | undefined | null>
): string {
	return createPageUrl(route, { id: patientId }, query)
}

/**
 * Creates a URL with return path (for redirects after auth)
 */
export function createReturnUrl(path: string, returnTo?: string): string {
	if (!returnTo) return path
	const separator = path.includes('?') ? '&' : '?'
	return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * Checks if a URL is active based on current path
 */
export function isActivePath(
	currentPath: string,
	targetPath: string,
	exact = false
): boolean {
	if (exact) {
		return currentPath === targetPath
	}
	return currentPath.startsWith(targetPath)
}

// Export individual utility functions for backward compatibility
export const getPatientDetailsUrl = (patientId: string) =>
	createPageUrl('PATIENT_DETAILS', { id: patientId })

export const getEditPatientUrl = (patientId: string) =>
	createPageUrl('EDIT_PATIENT', { id: patientId })

export const getVisitDetailsUrl = (visitId: string) =>
	createPageUrl('VISIT_DETAILS', { id: visitId })

export const getPrescriptionUrl = (prescriptionId: string) =>
	createPageUrl('PRESCRIPTION_DETAILS', { id: prescriptionId })

export const getVaccinationUrl = (vaccinationId: string) =>
	createPageUrl('VACCINATION_RECORD', { id: vaccinationId })

export const getLabTestUrl = (labTestId: string) =>
	createPageUrl('LAB_TEST_DETAILS', { id: labTestId })

export const getDoctorUrl = (doctorId: string) =>
	createPageUrl('DOCTOR_DETAILS', { id: doctorId })

export const getInvoiceUrl = (invoiceId: string) =>
	createPageUrl('INVOICE_DETAILS', { id: invoiceId })
/**
 * Route generation helpers
//  */
// export const route = {
//   // Auth
//   login: APP_ROUTES.LOGIN,
//   register: APP_ROUTES.REGISTER,

//   // Public
//   home: APP_ROUTES.HOME,
//   about: APP_ROUTES.ABOUT,
//   contact: APP_ROUTES.CONTACT,
//   services: APP_ROUTES.SERVICES,

//   // Dashboard
//   dashboard: APP_ROUTES.DASHBOARD.ROOT,
//   dashboardPatients: APP_ROUTES.DASHBOARD.PATIENTS,
//   dashboardPatientDetail: APP_ROUTES.DASHBOARD.PATIENT_DETAIL,
//   dashboardDoctors: APP_ROUTES.DASHBOARD.DOCTORS,
//   dashboardAppointments: APP_ROUTES.DASHBOARD.APPOINTMENTS,
//   dashboardMedicalRecords: APP_ROUTES.DASHBOARD.MEDICAL_RECORDS,
//   dashboardBilling: APP_ROUTES.DASHBOARD.BILLING,
//   dashboardClinic: APP_ROUTES.DASHBOARD.CLINIC,
//   dashboardStaff: APP_ROUTES.DASHBOARD.STAFF,
//   dashboardNotifications: APP_ROUTES.DASHBOARD.NOTIFICATIONS,
//   dashboardProfile: APP_ROUTES.DASHBOARD.PROFILE,
//   dashboardAccount: APP_ROUTES.DASHBOARD.ACCOUNT,

//   // Analytics
//   analyticsOverview: APP_ROUTES.DASHBOARD.ANALYTICS.OVERVIEW,
//   analyticsFinancial: APP_ROUTES.DASHBOARD.ANALYTICS.FINANCIAL,
//   analyticsGrowthCharts: APP_ROUTES.DASHBOARD.ANALYTICS.GROWTH_CHARTS,
//   analyticsImmunization: APP_ROUTES.DASHBOARD.ANALYTICS.IMMUNIZATION,

//   // Record
//   recordPatients: APP_ROUTES.RECORD.PATIENTS,
//   recordPatientDetail: APP_ROUTES.RECORD.PATIENT_DETAIL,
//   recordDoctors: APP_ROUTES.RECORD.DOCTORS,
//   recordAppointments: APP_ROUTES.RECORD.APPOINTMENTS,
//   recordMedicalRecords: APP_ROUTES.RECORD.MEDICAL_RECORDS,
//   recordBilling: APP_ROUTES.RECORD.BILLING,
//   recordStaff: APP_ROUTES.RECORD.STAFF,
//   recordUsers: APP_ROUTES.RECORD.USERS,

//   // Admin
//   admin: APP_ROUTES.ADMIN.ROOT,
//   adminSystemSettings: APP_ROUTES.ADMIN.SYSTEM_SETTINGS,
//   adminUsers: APP_ROUTES.ADMIN.USERS,

//   // API
//   apiAuth: APP_ROUTES.API.AUTH,
//   apiTrpc: APP_ROUTES.API.TRPC,
//   apiUpload: APP_ROUTES.API.UPLOAD
// } as const;

/**
 * Breadcrumb configuration for different route patterns
 */
export const BREADCRUMB_CONFIG: Record<
	string,
	{ label: string; href?: string }[]
> = {
	[APP_ROUTES.DASHBOARD.ROOT]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
	],

	[APP_ROUTES.DASHBOARD.PATIENTS]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Patients', href: APP_ROUTES.DASHBOARD.PATIENTS },
	],

	'/dashboard/patients/[id]': [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Patients', href: APP_ROUTES.DASHBOARD.PATIENTS },
		{ label: 'Patient Details' },
	],

	'/dashboard/patients/[id]/appointments': [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Patients', href: APP_ROUTES.DASHBOARD.PATIENTS },
		{
			label: 'Patient Details',
			href: APP_ROUTES.DASHBOARD.PATIENT_DETAIL('[id]'),
		},
		{ label: 'Appointments' },
	],

	[APP_ROUTES.DASHBOARD.DOCTORS]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Doctors', href: APP_ROUTES.DASHBOARD.DOCTORS },
	],

	[APP_ROUTES.DASHBOARD.APPOINTMENTS]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Appointments', href: APP_ROUTES.DASHBOARD.APPOINTMENTS },
	],

	[APP_ROUTES.DASHBOARD.MEDICAL_RECORDS]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Medical Records', href: APP_ROUTES.DASHBOARD.MEDICAL_RECORDS },
	],

	[APP_ROUTES.DASHBOARD.BILLING]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Billing', href: APP_ROUTES.DASHBOARD.BILLING },
	],

	[APP_ROUTES.DASHBOARD.CLINIC]: [
		{ label: 'Dashboard', href: APP_ROUTES.DASHBOARD.ROOT },
		{ label: 'Clinic Management', href: APP_ROUTES.DASHBOARD.CLINIC },
	],

	[APP_ROUTES.ADMIN.ROOT]: [{ label: 'Admin', href: APP_ROUTES.ADMIN.ROOT }],

	[APP_ROUTES.ADMIN.SYSTEM_SETTINGS]: [
		{ label: 'Admin', href: APP_ROUTES.ADMIN.ROOT },
		{ label: 'System Settings', href: APP_ROUTES.ADMIN.SYSTEM_SETTINGS },
	],
}
