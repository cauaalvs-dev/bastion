import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'
import { verifyRefreshToken } from '@/app/lib/auth/jwt'
import { AUDIT_EVENTS } from '@/app/lib/constants'
import { audit } from '@/app/lib/audit'
import { logger } from '@/app/lib/logger'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const path = '/api/auth/logout'
  const refreshToken = req.cookies.get('refresh_token')?.value

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete('access_token')
    res.cookies.delete('refresh_token')
    return res
  }

  if (!refreshToken) {
    // Sem token — já tá deslogado, retorna sucesso silencioso
    return clearCookies(NextResponse.json({ ok: true }))
  }

  try {
    const payload = verifyRefreshToken(refreshToken)

    const session = await prisma.session.findUnique({
      where: { refreshToken },
    })

    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      })
    }

    await audit({
      event: AUDIT_EVENTS.LOGOUT,
      userId: payload.userId,
      ip,
      path,
    })

    logger.info('auth.logout.success', { userId: payload.userId, ip })
  } catch {
    // Token inválido ou expirado — revoga o que encontrar no banco pelo valor cru
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      }).catch(() => null)
    }
  }

  return clearCookies(NextResponse.json({ ok: true }))
}
