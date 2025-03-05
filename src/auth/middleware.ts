import { PROTECTED_ROUTES, PUBLIC_ROUTES } from '@/constants'
import { protectedRoutes } from '@/constants/routes'

import authConfig from './auth.config'
import NextAuth from 'next-auth'

const { auth } = NextAuth(authConfig)

export default auth(async req => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname)
  const isAuthRoute = nextUrl.pathname.startsWith('/auth')
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api')

  if (isApiAuthRoute) return

  if (isAuthRoute && !isLoggedIn) return

  if (isLoggedIn && isAuthRoute)
    return Response.redirect(
      new URL(PROTECTED_ROUTES.DASHBOARD, nextUrl.toString()),
    )

  if (isProtectedRoute && !isLoggedIn)
    return Response.redirect(new URL(PUBLIC_ROUTES.LOGIN, nextUrl.toString()))
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
