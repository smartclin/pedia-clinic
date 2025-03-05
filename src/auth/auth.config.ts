import { db } from '@/prisma'

import { loginSchema } from '../validations/auth'
import bcrypt from 'bcryptjs'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const validatedData = loginSchema.safeParse(credentials)
        if (!validatedData.success) {
          return null
        }
        const { email, password } = validatedData.data
        const user = await db.user.findUnique({
          where: {
            email,
          },
        })
        if (!user || !user.password || !user.email) {
          return null
        }
        const passwordsMatch = await bcrypt.compare(password, user.password)
        if (!passwordsMatch) {
          return null
        }
        return {
          id: user.id.toString(), // Convert id to string
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
          password: null, // Exclude sensitive data like password
        }
      },
    }),
  ],
} satisfies NextAuthConfig
