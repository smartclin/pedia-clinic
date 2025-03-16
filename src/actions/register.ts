'use server'

import bcrypt from 'bcryptjs'
import * as z from 'zod'

import { db } from '@/lib/db'
import { RegisterSchema } from '@/schemas'

import { getUserByEmail } from './data/user'

export async function register(values: z.infer<typeof RegisterSchema>) {
  const validatedValues = RegisterSchema.safeParse(values)

  if (!validatedValues) {
    return { error: 'invalid fields' }
  }

  // remember to fix this type issue
  const { email, password, userName }: any = validatedValues.data

  const hashedPassword = await bcrypt.hash(password, 10)
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    return { error: 'This email is already existing' }
  }

  await db.user.create({
    data: {
      name: userName,
      email,
      password: hashedPassword,
    },
  })

  return { sucess: 'User created' }
}
