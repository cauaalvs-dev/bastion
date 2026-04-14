import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { prisma } from '@/app/lib/db/client'
import { logger } from '@/app/lib/logger'

// POST /api/auth/2fa/setup — generate secret + QR code
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, totpEnabled: true },
  })

  if (user.totpEnabled) {
    return NextResponse.json({ error: '2FA already enabled' }, { status: 400 })
  }

  const secret = speakeasy.generateSecret({
    name: `bastion (${user.email})`,
    length: 32,
  })

  // Store secret temporarily (not enabled yet — user must verify first)
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret.base32 },
  })

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!)

  return NextResponse.json({ qrCode: qrCodeDataUrl })
}

const verifySchema = z.object({
  code: z.string().length(6),
})

// PUT /api/auth/2fa/setup — verify code and enable 2FA
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { code } = verifySchema.parse(body)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  })

  if (!user.totpSecret) {
    return NextResponse.json({ error: 'Run setup first' }, { status: 400 })
  }

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  })

  await prisma.auditLog.create({
    data: { userId, event: 'auth.2fa.enabled', ip },
  })

  logger.security('auth.2fa.enabled', { userId, ip })

  return NextResponse.json({ ok: true })
}
