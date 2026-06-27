import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'

// VULNERABILITY: Broken Access Control on admin route
// This endpoint exists ONLY to demonstrate and document the vulnerability
// See SECURITY-REPORT.md entry #07 for exploit details and remediation

// VULN: GET /api/admin/users — no role check, any authenticated user can access
// Effect: regular users can list all users including admins, leaking PII
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // VULNERABLE: checks authentication but NOT authorization
  // Any logged-in user (role: user, viewer) can reach this
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json({ users, _debug: { warning: 'no role check performed' } })
}

// FIXED: explicit admin role check before returning sensitive data
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SAFE: only admin role can list all users
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json({ users })
}
