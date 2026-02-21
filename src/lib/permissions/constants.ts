/**
 * Permission constants for Pediatric Clinic Application
 * Granular medical-grade RBAC system
 */

export const PERMISSIONS = {
	ALL: '*', // Super Admin

	CLINIC: {
		VIEW: 'clinic:view',
		UPDATE: 'clinic:update',
		ARCHIVE: 'clinic:archive',
	},

	STAFF: {
		VIEW: 'staff:view',
		CREATE: 'staff:create',
		UPDATE: 'staff:update',
		DELETE: 'staff:delete',
	},

	PATIENT: {
		VIEW: 'patient:view',
		CREATE: 'patient:create',
		UPDATE: 'patient:update',
		DELETE: 'patient:delete',
		EXPORT: 'patient:export',
	},

	APPOINTMENT: {
		VIEW: 'appointment:view',
		CREATE: 'appointment:create',
		UPDATE: 'appointment:update',
		CANCEL: 'appointment:cancel',
		CHECK_IN: 'appointment:checkin',
	},

	MEDICAL_RECORD: {
		VIEW: 'medical_record:view',
		CREATE: 'medical_record:create',
		UPDATE: 'medical_record:update',
		DELETE: 'medical_record:delete',
		CONFIDENTIAL_VIEW: 'medical_record:confidential_view',
	},

	DIAGNOSIS: {
		CREATE: 'diagnosis:create',
		UPDATE: 'diagnosis:update',
		DELETE: 'diagnosis:delete',
	},

	PRESCRIPTION: {
		VIEW: 'prescription:view',
		CREATE: 'prescription:create',
		UPDATE: 'prescription:update',
		CANCEL: 'prescription:cancel',
	},

	IMMUNIZATION: {
		VIEW: 'immunization:view',
		ADMINISTER: 'immunization:administer',
		UPDATE: 'immunization:update',
	},

	LAB: {
		REQUEST: 'lab:request',
		VIEW_RESULT: 'lab:view_result',
		UPDATE_RESULT: 'lab:update_result',
	},

	GROWTH: {
		VIEW: 'growth:view',
		RECORD: 'growth:record',
		UPDATE: 'growth:update',
	},

	BILLING: {
		VIEW: 'billing:view',
		CREATE: 'billing:create',
		UPDATE: 'billing:update',
		REFUND: 'billing:refund',
	},

	EXPENSE: {
		VIEW: 'expense:view',
		CREATE: 'expense:create',
		UPDATE: 'expense:update',
		DELETE: 'expense:delete',
	},

	REPORT: {
		VIEW: 'report:view',
		EXPORT: 'report:export',
	},

	SETTINGS: {
		VIEW: 'settings:view',
		UPDATE: 'settings:update',
	},

	AUDIT: {
		VIEW: 'audit:view',
	},
} as const

export type PermissionKey = string

export interface PermissionDefinition {
	key: string
	name: string
	description: string
	category: string
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
	{
		key: PERMISSIONS.ALL,
		name: 'Full System Access',
		description: 'Unrestricted access to all clinic features',
		category: 'System',
	},

	// Clinic
	{
		key: PERMISSIONS.CLINIC.VIEW,
		name: 'View Clinic',
		description: 'View clinic details and configuration',
		category: 'Clinic',
	},
	{
		key: PERMISSIONS.CLINIC.UPDATE,
		name: 'Update Clinic',
		description: 'Modify clinic settings and profile',
		category: 'Clinic',
	},
	{
		key: PERMISSIONS.CLINIC.ARCHIVE,
		name: 'Archive Clinic',
		description: 'Archive or deactivate clinic',
		category: 'Clinic',
	},

	// Staff
	{
		key: PERMISSIONS.STAFF.VIEW,
		name: 'View Staff',
		description: 'View doctors and staff members',
		category: 'Staff',
	},
	{
		key: PERMISSIONS.STAFF.CREATE,
		name: 'Create Staff',
		description: 'Add new staff members',
		category: 'Staff',
	},
	{
		key: PERMISSIONS.STAFF.UPDATE,
		name: 'Update Staff',
		description: 'Modify staff details',
		category: 'Staff',
	},
	{
		key: PERMISSIONS.STAFF.DELETE,
		name: 'Delete Staff',
		description: 'Remove staff members',
		category: 'Staff',
	},

	// Patient
	{
		key: PERMISSIONS.PATIENT.VIEW,
		name: 'View Patients',
		description: 'Access patient records',
		category: 'Patients',
	},
	{
		key: PERMISSIONS.PATIENT.CREATE,
		name: 'Create Patients',
		description: 'Register new patients',
		category: 'Patients',
	},
	{
		key: PERMISSIONS.PATIENT.UPDATE,
		name: 'Update Patients',
		description: 'Edit patient information',
		category: 'Patients',
	},
	{
		key: PERMISSIONS.PATIENT.DELETE,
		name: 'Delete Patients',
		description: 'Archive patient records',
		category: 'Patients',
	},
	{
		key: PERMISSIONS.PATIENT.EXPORT,
		name: 'Export Patient Data',
		description: 'Export patient medical history',
		category: 'Patients',
	},

	// Appointment
	{
		key: PERMISSIONS.APPOINTMENT.VIEW,
		name: 'View Appointments',
		description: 'View scheduled appointments',
		category: 'Appointments',
	},
	{
		key: PERMISSIONS.APPOINTMENT.CREATE,
		name: 'Create Appointments',
		description: 'Schedule new appointments',
		category: 'Appointments',
	},
	{
		key: PERMISSIONS.APPOINTMENT.UPDATE,
		name: 'Update Appointments',
		description: 'Modify appointment details',
		category: 'Appointments',
	},
	{
		key: PERMISSIONS.APPOINTMENT.CANCEL,
		name: 'Cancel Appointments',
		description: 'Cancel scheduled appointments',
		category: 'Appointments',
	},
	{
		key: PERMISSIONS.APPOINTMENT.CHECK_IN,
		name: 'Check-In Patients',
		description: 'Mark patient as arrived',
		category: 'Appointments',
	},

	// Medical Records
	{
		key: PERMISSIONS.MEDICAL_RECORD.VIEW,
		name: 'View Medical Records',
		description: 'Access medical history and clinical notes',
		category: 'Medical Records',
	},
	{
		key: PERMISSIONS.MEDICAL_RECORD.CREATE,
		name: 'Create Medical Records',
		description: 'Create new clinical encounter records',
		category: 'Medical Records',
	},
	{
		key: PERMISSIONS.MEDICAL_RECORD.UPDATE,
		name: 'Update Medical Records',
		description: 'Edit clinical documentation',
		category: 'Medical Records',
	},
	{
		key: PERMISSIONS.MEDICAL_RECORD.DELETE,
		name: 'Delete Medical Records',
		description: 'Archive clinical records',
		category: 'Medical Records',
	},
	{
		key: PERMISSIONS.MEDICAL_RECORD.CONFIDENTIAL_VIEW,
		name: 'View Confidential Records',
		description: 'Access restricted clinical data',
		category: 'Medical Records',
	},

	// Billing
	{
		key: PERMISSIONS.BILLING.VIEW,
		name: 'View Billing',
		description: 'Access billing and payment records',
		category: 'Billing',
	},
	{
		key: PERMISSIONS.BILLING.CREATE,
		name: 'Create Billing',
		description: 'Generate invoices and payments',
		category: 'Billing',
	},
	{
		key: PERMISSIONS.BILLING.UPDATE,
		name: 'Update Billing',
		description: 'Modify payment records',
		category: 'Billing',
	},
	{
		key: PERMISSIONS.BILLING.REFUND,
		name: 'Issue Refund',
		description: 'Process refunds',
		category: 'Billing',
	},

	// Reports
	{
		key: PERMISSIONS.REPORT.VIEW,
		name: 'View Reports',
		description: 'Access clinic analytics and reports',
		category: 'Reports',
	},
	{
		key: PERMISSIONS.REPORT.EXPORT,
		name: 'Export Reports',
		description: 'Export analytics and statistics',
		category: 'Reports',
	},

	// Audit
	{
		key: PERMISSIONS.AUDIT.VIEW,
		name: 'View Audit Logs',
		description: 'Access system activity logs',
		category: 'System',
	},
]

export function getPermissionDefinition(
	key: string
): PermissionDefinition | undefined {
	return PERMISSION_DEFINITIONS.find(p => p.key === key)
}

export function getPermissionsByCategory(): Record<
	string,
	PermissionDefinition[]
> {
	return PERMISSION_DEFINITIONS.reduce(
		(acc, permission) => {
			if (!acc[permission.category]) {
				acc[permission.category] = []
			}
			acc[permission.category].push(permission)
			return acc
		},
		{} as Record<string, PermissionDefinition[]>
	)
}
