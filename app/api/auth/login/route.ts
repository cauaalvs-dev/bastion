import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { prisma } from '@/app/lib/db/client'
import { signAccessToken, signRefreshToken } from '@/app/lib/auth/jwt'
import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_MINUTES } from '@/app/lib/constants'
import { logger } from '@/app/lib/logger'
import { randomUUID } from 'crypto'

const rateLimiter = new RateLimiterMemory({
  points: MAX_LOGIN_ATTEMPTS,
  duration: LOGIN_LOCKOUT_MINUTES * 60,
})

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  // Rate limit by IP
  try {
    await rateLimiter.consume(ip)
  } catch {
    logger.security('auth.login.rate_limited', { ip })
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${LOGIN_LOCKOUT_MINUTES} minutes.` },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const data = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    // Always run bcrypt comparison — prevents timing attacks on user enumeration
    const dummyHash = '$2a$12$dummyhashtopreventtimingattacks000000000000000'
    const passwordHash = user?.passwordHash ?? dummyHash

    const passwordValid = await bcrypt.compare(data.password, passwordHash)

    if (!user || !passwordValid) {
      logger.loginFailure(ip, 'invalid_credentials')
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // 2FA check
    if (user.totpEnabled) {
      if (!data.totpCode) {
        return NextResponse.json({ error: '2FA code required' }, { status: 401 })
      }

      const speakeasy = await import('speakeasy')
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret!,
        encoding: 'base32',
        token: data.totpCode,
        window: 1,
      })

      if (!valid) {
        logger.loginFailure(ip, 'invalid_totp', '/api/auth/login')
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
      }
    }

    // Issue new session — rotates session ID on every login (prevents session fixation)
    const sessionId = randomUUID()

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    const refreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId,
    })

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        event: 'auth.login.success',
        ip,
        path: '/api/auth/login',
      },
    })

    logger.loginSuccess(user.id, ip)

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/api/auth/refresh',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
    }

    logger.error('auth.login.error', { ip, meta: { error: String(error) } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
