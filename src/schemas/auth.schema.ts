import { z } from 'zod'

export const userSchema = z.object({
	clinicId: z.string().optional(),
	clinicName: z.string().optional(),
	createdAt: z.coerce.date(),

	email: z.string().regex(/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, {
		message: 'Please enter a valid email address.',
	}),
	emailVerified: z.boolean(),
	id: z.string().min(1, 'User ID is required'),
	image: z
		.string()
		.or(z.literal('').transform(() => undefined))
		.optional(),

	isAdminUser: z.boolean().default(false),
	isDeleted: z.boolean().default(false),
	name: z
		.string()
		.min(2, { message: 'Name must be at least 2 characters.' })
		.regex(/^\p{L}+$/u, { message: 'Name must contain only letters.' }),
	role: z.string().default('user'),
	updatedAt: z.coerce.date(),
})

export const editableUserProfileSchema = userSchema
	.pick({
		email: true,
		name: true,
	})
	.partial()

export type UserType = z.infer<typeof userSchema>

export const signupFormSchema = userSchema
	.pick({
		email: true,
		name: true,
	})
	.extend({
		password: z
			.string()
			.min(8, { message: 'Password must be at least 8 characters' })
			.regex(/[A-Z]/, {
				message: 'Password must contain at least one uppercase letter',
			})
			.regex(/[a-z]/, {
				message: 'Password must contain at least one lowercase letter',
			})
			.regex(/[0-9]/, {
				message: 'Password must contain at least one number',
			}),
	})

export const signInFormSchema = signupFormSchema.omit({ name: true })

export const newPasswordSchema = z
	.object({
		confirmPassword: signupFormSchema.shape.password,
		password: signupFormSchema.shape.password,
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match.',
		path: ['confirmPassword'],
	})

export const resetPasswordFormSchema = newPasswordSchema.safeExtend({
	token: z.string(),
})

export const changePasswordFormSchema = newPasswordSchema.safeExtend({
	currentPassword: signupFormSchema.shape.password,
})
