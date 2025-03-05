import { db } from '@/prisma'

export async function getUserById(id: number) {
  try {
    const user = await db.user.findUnique({
      where: { id },
    })

    return user
  } catch (error) {
    console.log(error)
    return null
  }
}
