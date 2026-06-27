import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/app/lib/db/client'
import { AUDIT_EVENTS } from '@/app/lib/constants'
import { audit } from '@/app/lib/audit'
import { logger } from '@/app/lib/logger'

const disableSchema = z.object({
  password: z.string().min(1),
})

// DELETE /api/auth/2fa — disable 2FA (requires password confirmation)
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const path = '/api/auth/2fa'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { password } = disableSchema.parse(body)

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true, totpEnabled: true },
    })

    if (!user.totpEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    })

    await audit({ event: AUDIT_EVENTS.TOTP_DISABLED, userId, ip, path })
    logger.security('auth.2fa.disabled', { userId, ip })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
