import { NextResponse } from 'next/server'

import { createUser } from '@/prisma/users'

// Adjust the import if needed

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password || !role) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const user = await createUser(name, email, password, role)

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('[PATIENTS_POST]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
