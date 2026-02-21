import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up', '/privacy', '/terms']

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (PUBLIC_ROUTES.includes(pathname)) {
		return NextResponse.next()
	}

	const sessionCookie = getSessionCookie(request)

	// THIS IS NOT SECURE!
	// This is the recommended approach to optimistically redirect users
	// We recommend handling auth checks in each page/route
	if (!sessionCookie) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|twitter-image.png|opengraph-image.png|manifest.webmanifest|icons|privacy-policy|terms-of-service).*)',
	],
}
