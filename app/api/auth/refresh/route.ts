import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/app/lib/auth/jwt'
import { logger } from '@/app/lib/logger'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const oldRefreshToken = req.cookies.get('refresh_token')?.value

  if (!oldRefreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  try {
    const payload = verifyRefreshToken(oldRefreshToken)

    // Check token exists in DB and is not revoked
    const session = await prisma.session.findUnique({
      where: { refreshToken: oldRefreshToken },
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      // Possible token reuse attack — revoke all sessions for this user
      logger.security('auth.refresh.reuse_detected', {
        userId: payload.userId,
        ip,
      })

      await prisma.session.updateMany({
        where: { userId: payload.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })

      const response = NextResponse.json({ error: 'Session revoked' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    // Rotate: revoke old session, create new one
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    })

    const sessionId = randomUUID()
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: { id: true, role: true },
    })

    const newAccessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    const newRefreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: newRefreshToken,
        ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = NextResponse.json({ ok: true })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/api/auth/refresh',
    })

    return response
  } catch {
    const response = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  }
}
