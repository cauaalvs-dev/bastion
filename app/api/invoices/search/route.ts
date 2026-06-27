import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'

// VULNERABILITY: SQL Injection via $queryRawUnsafe
// This endpoint exists ONLY to demonstrate and document the vulnerability
// It is intentionally insecure — DO NOT use this pattern in production
// See SECURITY-REPORT.md for exploit details and remediation

// VULN: GET /api/invoices/search?q=<input> — unsanitized input concatenated into raw SQL
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''

  // VULNERABLE: string interpolation in raw SQL — attacker controls `q`
  // Payload example: ' OR '1'='1
  // Effect: bypasses userId filter, returns ALL invoices from all users
  const vulnerable = await prisma.$queryRawUnsafe(
    `SELECT id, amount, status, "userId" FROM invoices WHERE "userId" = '${userId}' AND status LIKE '%${q}%'`
  )

  return NextResponse.json({ invoices: vulnerable, _debug: { query: 'raw', input: q } })
}

// FIXED: parameterized query — input is never interpolated into SQL
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { q = '' } = await req.json()

  // SAFE: Prisma ORM uses parameterized queries by default
  const safe = await prisma.invoice.findMany({
    where: {
      userId,
      status: { contains: q, mode: 'insensitive' },
    },
  })

  return NextResponse.json({ invoices: safe })
}
