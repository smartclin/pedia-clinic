import { PrismaClient } from '@prisma/client'

// Function to create a new Prisma client with Neon adapter
let globalForPrisma = global as unknown as { prisma: PrismaClient }

// Use existing client if it exists in development to prevent too many connections
export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

// Attach client to global object in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
