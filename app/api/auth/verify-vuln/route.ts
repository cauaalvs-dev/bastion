import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/app/lib/db/client'

// VULNERABILITY: JWT none algorithm bypass
// This endpoint exists ONLY to demonstrate and document the vulnerability
// See SECURITY-REPORT.md entry #05 for exploit details and remediation

// VULN: POST /api/auth/verify-vuln — accepts JWT with algorithm: none
// Attacker can forge a token by setting alg: none and removing the signature
// Payload: base64({"alg":"none","typ":"JWT"}).base64({"userId":"admin-id","role":"admin"}).
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  try {
    // VULNERABLE: algorithms not restricted — accepts "none"
    const payload = jwt.decode(token) as { userId: string; role: string } | null

    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Blindly trusts the decoded payload without verifying signature
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ user, _debug: { warning: 'signature not verified' } })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

// FIXED: explicit algorithm allowlist + signature verification
export async function PUT(req: NextRequest) {
  const { token } = await req.json()

  try {
    // SAFE: jwt.verify validates signature AND rejects alg: none
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as { userId: string; role: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
