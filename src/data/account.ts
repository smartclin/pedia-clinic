import { db } from '@/prisma'

export async function getAccountByUserId(userId: number) {
  try {
    const account = await db.account.findFirst({
      where: { userId },
    })

    return account
  } catch (error) {
    console.log(error)
    return null
  }
}
