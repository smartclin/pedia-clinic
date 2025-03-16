import NextAuth from 'next-auth'

import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
} from '@/lib/routes'

import authConfig from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth(req => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isApiRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isPublicUrl = publicRoutes.includes(nextUrl.pathname)
  const isAuthUrl = authRoutes.includes(nextUrl.pathname)

  /*/ routes checking  /*/

  if (isApiRoute) {
    return
  }
  if (isAuthUrl) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    }

    return
  }
  if (!isLoggedIn && !isPublicUrl) {
    return Response.redirect(new URL('/auth/login', nextUrl))
  }

  return
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
