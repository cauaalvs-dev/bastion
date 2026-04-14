import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/auth/jwt'
import { ADMIN_ROUTES, PUBLIC_ROUTES, ROLES } from '@/app/lib/constants'
import { logger } from '@/app/lib/logger'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown'

  // Allow public routes through
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const payload = verifyAccessToken(token)

    // Admin route — requires admin role
    if (ADMIN_ROUTES.some(route => path.startsWith(route))) {
      if (payload.role !== ROLES.ADMIN) {
        logger.accessDenied(payload.userId, path, ip)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Attach user info to request headers for API handlers
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-session-id', payload.sessionId)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Invalid or expired token — redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('access_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
