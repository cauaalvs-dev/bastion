import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'
import { verifyAccessToken } from '@/app/lib/auth/jwt'
import { AUDIT_EVENTS } from '@/app/lib/constants'
import { rateLimit } from '@/app/lib/rate-limit'
import { audit } from '@/app/lib/audit'
import { logger } from '@/app/lib/logger'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const path = '/api/auth/logout-all'

  const accessToken = req.cookies.get('access_token')?.value

  const rl = await rateLimit('auth-soft', ip)
  if (rl.limited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfter}s.` },
      { status: 429 }
    )
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = verifyAccessToken(accessToken)

    const { count } = await prisma.session.updateMany({
      where: { userId: payload.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    await audit({
      event: AUDIT_EVENTS.LOGOUT,
      userId: payload.userId,
      ip,
      path,
      meta: { sessionsRevoked: count },
    })

    logger.info('auth.logout_all.success', { userId: payload.userId, ip, meta: { sessionsRevoked: count } })

    const response = NextResponse.json({ ok: true, sessionsRevoked: count })
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
