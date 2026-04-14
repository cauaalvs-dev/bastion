import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/app/lib/db/client'
import { logger } from '@/app/lib/logger'

// GET /api/invoices/:id — ownership enforced at query level
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id')
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // IDOR fix: userId is always part of the WHERE clause
  // If the invoice belongs to someone else, findUnique returns null — same as not found
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: params.id,
      userId, // ownership check — this is what prevents IDOR
    },
  })

  if (!invoice) {
    // Return 404, not 403 — don't reveal whether the resource exists
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ invoice })
}

// GET /api/invoices — list only own invoices
export async function GET_LIST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId }, // only own invoices — no way to see others
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invoices })
}
