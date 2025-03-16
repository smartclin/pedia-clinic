import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

import { currentRole } from '@/lib/auth'
import { db } from '@/lib/db'


// Your Prisma instance

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 },
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new admin user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    return NextResponse.json({ message: 'Admin created successfully', user })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function GET() {
  const role = await currentRole()

  if (role === UserRole.ADMIN) {
    return new NextResponse(null, { status: 200 })
  }

  return new NextResponse(null, { status: 403 })
}
