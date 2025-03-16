import bcrypt from 'bcryptjs'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

import { getUserByEmail } from '@/actions/data/user'
import { LoginSchema } from '@/schemas'

import type { NextAuthConfig } from 'next-auth'


export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials)
        if (validatedFields) {
          // remember to fix this type issue
          const { email, password }: any = validatedFields.data
          const user = await getUserByEmail(email)
          if (!user || !user.password) {
            return null
          }
          const passwordsMathced = await bcrypt.compare(password, user.password)
          if (passwordsMathced) {
            return user
          }
        }

        return null
      },
    }),
  ],
} satisfies NextAuthConfig
