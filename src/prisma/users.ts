import { db } from '@/prisma'

import bcrypt from 'bcryptjs'

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'PATIENT' | 'ADMIN' | 'DOCTOR',
) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    })

    return user
  } catch (error) {
    console.error('Error creating user:', error)
    throw new Error('Could not create user')
  }
}
