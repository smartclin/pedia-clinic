import { Gender, PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())

async function main() {
  const startTime = performance.now()

  // Learn more about caching strategies:
  // https://www.prisma.io/docs/accelerate/caching
  const cachedPatients = await prisma.patient.findMany({
    where: {
      gender: Gender.MALE, // Example: Filter patients by name containing "John"
    },
    include: { appointments: true }, // Include related appointments
    cacheStrategy: {
      swr: 30, // Serve stale data for up to 30 seconds while revalidating
      ttl: 60, // Cache data for 60 seconds
    },
  })
  const endTime = performance.now()

  // Calculate the elapsed time
  const elapsedTime = endTime - startTime

  console.log(`The query took ${elapsedTime}ms.`)
  console.log(`It returned the following data: \n`, cachedPatients)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
