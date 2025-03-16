'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { db } from '@/lib/db'
import { RegisterSchema } from '@/schemas'


export async function register(data: z.infer<typeof RegisterSchema>) {
  try {
    const validatedData = RegisterSchema.parse(data)

    if (!validatedData) {
      return { error: 'Invalid input data' }
    }

    const {  confirmPassword, email, name, password } = validatedData

    if (password !== confirmPassword) {
      return { error: 'Passwords do not match' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const existingUser = await db.user.findFirst({
      where: {
        email,
      },
    })

    if (existingUser) {
      return { error: 'User already exists' }
    }

    const lowercaseEmail = email.toLowerCase()

    const newUser = await db.user.create({
      data: {
        email: lowercaseEmail,
        name,
        password: hashedPassword,
      },
    })

    return { success: `User ${newUser.name} registered successfully` }
  } catch (error) {
    console.error('Registration error:', error)

    return { error: 'An error occurred during registration' }
  }
}
