import { headers } from 'next/headers'
import z from 'zod'

import {
	resetPasswordFormSchema,
	signupFormSchema,
	userSchema,
} from '@/schemas/auth.schema'
import { createServerRoleChecker } from '@/server/utils'

import { auth } from '../../../lib/auth'
import { getRole } from '../../../lib/auth/server'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

export const authRouter = createTRPCRouter({
	getRole: publicProcedure.query(async ({ ctx }) => {
		// Get session from headers
		const session = ctx.session

		return {
			permissions: await createServerRoleChecker(auth)(session),
			role: session ? getRole(session).toLowerCase() : 'patient',
			user: session?.user,
		}
	}),
	getSession: publicProcedure.query(async ({ ctx }) => {
		try {
			const session = ctx.session
			return {
				session: session || null,
				user: session?.user || null,
			}
		} catch (error) {
			console.error('Failed to get session:', error)
			return {
				session: null,
				user: null,
			}
		}
	}),

	// Other auth procedures...
	login: publicProcedure
		.input(z.object({ email: z.email(), password: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const { email, password } = input

			const session = await auth.api.signInEmail({
				body: {
					email,
					password,
				},
				headers: ctx.headers,
			})

			return session
			// implementation
		}),
	me: protectedProcedure.query(async ({ ctx }) => {
		const session = ctx.session
		const user = ctx.user
		return {
			...session?.user,
			full_name: session?.user.name, // Map name to full_name if needed
			permissions: await createServerRoleChecker(auth)(session),
			role: user?.role,

			user,
		}
	}),

	requestPasswordReset: publicProcedure
		.input(userSchema.shape.email)
		.mutation(async ({ input: email }) => {
			await auth.api.requestPasswordReset({
				body: {
					email,
					redirectTo: '/reset-password',
				},
			})
		}),
	resetPassword: publicProcedure
		.input(resetPasswordFormSchema)
		.mutation(async ({ input: values }) => {
			await auth.api.resetPassword({
				body: {
					newPassword: values.confirmPassword,
					token: values.token,
				},
			})

			return { success: true }
		}),
	// signUp: publicProcedure.input(signupFormSchema).mutation(async ({ input: values }) => {
	//     console.log('SignUp values:', values);
	//     return await auth.api.signUpEmail({
	//         body: { isDeleted: false, ...values }
	//     });
	// }),

	signIn: publicProcedure
		.input(signupFormSchema.omit({ name: true }))
		.mutation(async ({ input: values }) => {
			return await auth.api.signInEmail({
				body: values,
			})
		}),
	updateUser: protectedProcedure
		.input(
			z.object({
				data: z.object({
					email: z.email().optional(),
					name: z.string().optional(),
					password: z.string().optional(),
				}),
				id: z.uuid(), // user ID to update
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { id, data } = input

			// Optional: ensure user can only update themselves unless admin
			if (ctx.user?.id !== id && ctx.user?.role !== 'ADMIN') {
				throw new Error('Unauthorized to update this user')
			}

			// Update the user via Better Auth Admin API
			const updatedUser = await auth.api.adminUpdateUser({
				body: {
					data: data,
					userId: id,
				},
				// Include session headers for authentication
				headers: await headers(), // or pass appropriate headers from context
			})

			return { success: true, user: updatedUser }
		}),
})
