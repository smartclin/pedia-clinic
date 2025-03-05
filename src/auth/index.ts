import { db } from '@/prisma'
import { PrismaAdapter } from '@auth/prisma-adapter'

import { getAccountByUserId } from '../data/account'
import { getUserById } from '../data/user'
import authConfig from './auth.config'
import NextAuth from 'next-auth'

export const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  ...authConfig,
  callbacks: {
    async jwt({ token }) {
      if (!token.sub) return token
      const numericId = Number(token.sub) // Convert to number
      if (isNaN(numericId)) {
        console.error('Invalid user ID format')
        return token
      }
      const existingUser = await getUserById(numericId)
      if (!existingUser) return token

      const existingAccount = await getAccountByUserId(existingUser.id)

      token.isOauth = !!existingAccount
      token.name = existingUser.name
      token.email = existingUser.email
      token.image = existingUser.image

      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          email: token.email,
          image: token.image as string,
          isOauth: token.isOauth,
          name: token.name,
        },
      }
    },
    async signIn({ account, user }) {
      if (account?.provider !== 'credentials') return true
      if (!user.id) return false // Handle undefined
      const numericId = Number(user.id) // Convert to number
      if (isNaN(numericId)) {
        console.error('Invalid user ID format')
        return false
      }
      const existingUser = await getUserById(numericId)
      // Remove ?number
      if (!existingUser || !existingUser.emailVerified) return false
      return true
    },
  },
})
