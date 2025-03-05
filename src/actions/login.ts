'use server'

import { signIn } from '@/auth'
import { PROTECTED_ROUTES } from '@/constants'
import { db } from '@/prisma'
import { loginSchema } from '@/validations/auth'

import { AuthError } from 'next-auth'
import { z } from 'zod'

export async function login(data: z.infer<typeof loginSchema>) {
  const validatedData = loginSchema.parse(data)

  if (!validatedData) {
    return { error: 'Invalid input data' }
  }

  const { email, password } = validatedData

  const userExists = await db.user.findFirst({
    where: {
      email,
    },
  })

  if (!userExists || !userExists.password || !userExists.email) {
    return { error: 'User not found' }
  }

  try {
    await signIn('credentials', {
      email: userExists.email,
      password,
      redirectTo: PROTECTED_ROUTES.DASHBOARD,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'AccessDenied':
          return {
            error:
              'We sent you an email, please confirm your email address to login',
          }
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' }
        default:
          return {
            error: 'Something went wrong, you can call our customer support',
          }
      }
    }
    throw error
  }

  return { success: 'Logged in successfully' }
}
