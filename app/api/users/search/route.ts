import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'

// VULNERABILITY: SQL Injection via user search
// This endpoint exists ONLY to demonstrate and document the vulnerability
// See SECURITY-REPORT.md entry #01 for exploit details and remediation

// VULN: GET /api/users/search?q=<input> — unsanitized input in raw SQL
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''

  // VULNERABLE: string interpolation in raw SQL
  // Payload: ' OR '1'='1
  // Effect: returns ALL users regardless of name filter
  const users = await prisma.$queryRawUnsafe(
    `SELECT id, name, email, role FROM users WHERE name LIKE '%${q}%'`
  )

  return NextResponse.json({ users, _debug: { input: q } })
}

// FIXED: Prisma ORM with parameterized query
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { q = '' } = await req.json()

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q, mode: 'insensitive' },
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ users })
}
