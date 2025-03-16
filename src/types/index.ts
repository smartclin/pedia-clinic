import { UserRole } from '@prisma/client'
import { type DefaultSession } from 'next-auth'

// Extend the User object to include the `role` field
export type ExtendedUser = DefaultSession['user'] & {
  role: UserRole
  isTwoFactorEnabled: boolean
  isOAuth: boolean
}
declare module 'next-auth' {
  interface Session {
    user: ExtendedUser
  }
}

export interface JWT {
  role?: string
}
