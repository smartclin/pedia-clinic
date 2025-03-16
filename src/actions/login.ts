'use server'

import { AuthError } from 'next-auth'
import * as z from 'zod'

import { signIn } from '@/auth'
import { DEFAULT_LOGIN_REDIRECT } from '@/lib/routes'
import { LoginSchema } from '@/schemas'


export async function login(values: z.infer<typeof LoginSchema>) {
  const validatedValues = LoginSchema.safeParse(values)

  if (!validatedValues) {
    return { error: 'invalid fields' }
  }
  const { email, password }: any = validatedValues.data
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    })

    return { success: 'logged in successfuly' }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'invalid credentials!' }
        default:
          return { error: 'something went wrong!' }
      }
    }
    throw error
  }
}
