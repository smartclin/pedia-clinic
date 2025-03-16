import { auth } from '@/auth'
import { db } from '@/lib/db'

// Ensure Prisma is correctly set up

export async function getRole(): Promise<string | null> {
  const session = await auth()

  if (!session?.user || typeof session.user !== 'string') return null // Ensure userId is a string

  // Fetch user role from DB (Modify based on your schema)
  const user = await db.user.findUnique({
    where: { id: session.user }, // Ensure ID is a valid string
    select: { role: true }, // Make sure 'role' exists in your Prisma schema
  })

  return user?.role ?? null
}
