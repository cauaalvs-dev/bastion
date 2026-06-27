import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/app/lib/db/client'
import { AUDIT_EVENTS } from '@/app/lib/constants'
import { audit } from '@/app/lib/audit'

// VULNERABILITY: CSRF on account update
// This endpoint exists ONLY to demonstrate and document the vulnerability
// See SECURITY-REPORT.md entry #04 for exploit details and remediation

const updateEmailSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

const ALLOWED_ORIGINS = [
  'https://bastion.dev',
  'http://localhost:3000',
]

// VULN: POST /api/users/email — no CSRF protection
// Attacker hosts a page with a form that auto-submits to this endpoint
// If the victim is logged in, the browser sends cookies automatically
// Effect: attacker changes victim's email without their knowledge
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // VULNERABLE: no origin check — accepts requests from any domain
  const body = await req.json()
  const { email } = updateEmailSchema.parse(body)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { email },
    select: { id: true, email: true },
  })

  return NextResponse.json({ user, _debug: { warning: 'no origin check performed' } })
}

// FIXED: validates Origin header against allowlist
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SAFE: reject requests from origins not in the allowlist
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 })
  }

  const body = await req.json()
  const { email } = updateEmailSchema.parse(body)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { email },
    select: { id: true, email: true },
  })

  await audit({
    event: AUDIT_EVENTS.REGISTER_SUCCESS,
    userId,
    ip,
    path: '/api/users/email',
    meta: { action: 'email_updated' },
  })

  return NextResponse.json({ user })
}
