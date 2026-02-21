import z from 'zod'

export const UserRoleSchema = z.enum(['DOCTOR', 'PATIENT', 'ADMIN', 'STAFF'])

// Password strength validation
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number')
	.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const signUpSchema = z
	.object({
		acceptTerms: z.boolean().refine(val => val === true, {
			message: 'You must accept the terms and conditions',
		}),

		clinicCode: z.string().optional(),

		confirmPassword: z.string(),

		email: z
			.email('Please enter a valid email address')
			.min(5, 'Email must be at least 5 characters')
			.max(100, 'Email must be less than 100 characters'),
		name: z
			.string()
			.min(2, 'Name must be at least 2 characters')
			.max(50, 'Name must be less than 50 characters')
			.regex(
				/^[a-zA-Z\s'-]+$/,
				'Name can only contain letters, spaces, hyphens, and apostrophes'
			),

		password: passwordSchema,

		role: z.enum(['DOCTOR', 'STAFF', 'ADMIN']),
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	})

export type SignUpFormValues = z.infer<typeof signUpSchema>

export interface SignUpFormProps {
	onSwitchToSignIn: () => void
	defaultRole?: 'DOCTOR' | 'STAFF' | 'ADMIN'
	requireClinicCode?: boolean
}

export const PASSWORD_STRENGTH_CHECKS = [
	{ label: 'At least 8 characters', regex: /.{8,}/ },
	{ label: 'Uppercase letter', regex: /[A-Z]/ },
	{ label: 'Lowercase letter', regex: /[a-z]/ },
	{ label: 'Number', regex: /[0-9]/ },
	{ label: 'Special character', regex: /[^A-Za-z0-9]/ },
]
