import { createAccessControl } from 'better-auth/plugins/access'

const statement = {
	appointments: ['create', 'read', 'update', 'delete', 'list'],
	patients: ['create', 'read', 'update', 'delete', 'list'],
	payments: ['create', 'read', 'update', 'delete', 'list'],
	records: ['create', 'read', 'update', 'delete', 'list'],
	reports: ['generate', 'export', 'view'],
	staff: ['create', 'read', 'update', 'delete', 'list'],
	// Add system-level permissions
	system: ['backup', 'restore', 'configure'],
} as const

const ac = createAccessControl(statement)

export const roles = {
	admin: ac.newRole({
		appointments: ['create', 'read', 'update', 'delete', 'list'],
		patients: ['create', 'read', 'update', 'delete', 'list'],
		payments: ['create', 'read', 'update', 'delete', 'list'],
		records: ['create', 'read', 'update', 'delete', 'list'],
		reports: ['generate', 'export', 'view'],
		staff: ['create', 'read', 'update', 'delete', 'list'],
		system: ['backup', 'restore', 'configure'],
	}),
	doctor: ac.newRole({
		appointments: ['create', 'read', 'update', 'delete', 'list'],
		patients: ['create', 'read', 'update', 'list'],
		payments: ['read', 'list'],
		records: ['create', 'read', 'update', 'list'],
		reports: ['generate', 'view'],
		staff: [],
	}),
	patient: ac.newRole({
		appointments: ['create', 'read'], // Book and view own appointments
		patients: [], // No patient management
		payments: ['read'], // View own payments
		records: ['read'], // View own records only
		reports: [],
		staff: [],
	}),
	staff: ac.newRole({
		appointments: ['create', 'read', 'update', 'delete', 'list'],
		patients: ['create', 'read', 'update', 'list'],
		payments: ['create', 'read', 'update', 'list'],
		records: ['read', 'list'],
		reports: ['view'],
		staff: ['read'],
	}),
}

export type UserRoles = keyof typeof roles
export type UserRole = 'ADMIN' | 'DOCTOR' | 'STAFF' | 'PATIENT'
export type Role = Uppercase<UserRoles>
// Export for use in auth configuration
export { ac, statement }
